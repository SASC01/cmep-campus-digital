import { randomUUID } from "node:crypto"

import { pino } from "pino"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { inicializarAuth } from "../src/adapters/auth/index.js"
import { descartarCopias, leerCopiasPendientes, terminarCopias } from "../src/adapters/db/index.js"
import {
  cerrarConexion,
  ejecutorSqlDe,
  enTransaccion,
  inicializarDb,
  obtenerDb,
} from "../src/adapters/db/cliente.js"
import {
  asegurarCola,
  buscarTrabajo,
  detenerCola,
  encolar,
  iniciarCola,
} from "../src/adapters/queue/index.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { opcionesDeCola } from "../src/config/cola.js"
import { cargarEnv } from "../src/config/env.js"
import {
  procesarBorradoDeObjetos,
  procesarCopiaDeObjetos,
  procesarCopiasFallidas,
  registrarConsumidoresDeObjetos,
  type RepositorioDeCopias,
} from "../src/workers/objetos.js"
import { borrarUsuariosDePrueba } from "./ayudas-auth.js"
import { terminarCopiasDePrueba } from "./ayudas-borrado-duplicado.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
} from "./ayudas-clases.js"
import { crearObjetosEnMemoria, type ObjetosEnMemoria } from "./objetos-en-memoria.js"

// ADMIN-01b (§D-4, §D-5): el worker de objetos. ADM-1B11, ADM-1B12, ADM-1B21 y ADM-1B22. Las
// funciones que procesan un trabajo se llaman directo; el recorrido por pg-boss (reintento y cola de
// fallidos) usa colas propias de este archivo, nunca COPIAR_OBJETOS ni BORRAR_OBJETOS (N-29).

const idsUsuarios: string[] = []
const idsClases: string[] = []

interface RegistroDeLog {
  nivel: "info" | "warn" | "error"
  obj: unknown
}
const registros: RegistroDeLog[] = []
const log = {
  info: (obj: unknown) => registros.push({ nivel: "info", obj }),
  warn: (obj: unknown) => registros.push({ nivel: "warn", obj }),
  error: (obj: unknown) => registros.push({ nivel: "error", obj }),
}

const COLAS = {
  copiar: "PRUEBA_COPIAR_OBJETOS",
  borrar: "PRUEBA_BORRAR_OBJETOS",
  copiarFallidos: "PRUEBA_COPIAR_OBJETOS_FALLIDO",
}

// El almacén del recorrido por pg-boss: siempre falla al copiar, para llegar a la cola de fallidos.
const almacenQueFalla: ObjetosEnMemoria = crearObjetosEnMemoria()
almacenQueFalla.copiar = () => Promise.reject(new Error("fallo permanente simulado"))

type PoliticaConFallidos = NonNullable<Parameters<typeof asegurarCola>[1]> & { deadLetter: string }

beforeAll(async () => {
  const env = cargarEnv()
  inicializarDb({ connectionString: env.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(env))
  await iniciarCola({ ...opcionesDeCola(env, "worker"), log: pino({ level: "silent" }) })
  await asegurarCola(COLAS.copiarFallidos, { retentionSeconds: 3600, deleteAfterSeconds: 3600 })
  const politica: PoliticaConFallidos = {
    retryLimit: 1,
    retryDelay: 1,
    retryBackoff: false,
    expireInSeconds: 30,
    deadLetter: COLAS.copiarFallidos,
    retentionSeconds: 3600,
    deleteAfterSeconds: 3600,
  }
  await asegurarCola(COLAS.copiar, politica)
  await asegurarCola(COLAS.borrar, { retentionSeconds: 3600, deleteAfterSeconds: 3600 })
  await registrarConsumidoresDeObjetos({ almacenDeObjetos: almacenQueFalla, log }, COLAS)
}, 30_000)

afterAll(async () => {
  await terminarCopiasDePrueba(idsClases)
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await detenerCola()
  await cerrarConexion()
})

const esperarHasta = async (condicion: () => Promise<boolean>, limiteMs = 25_000) => {
  const limite = Date.now() + limiteMs
  while (Date.now() < limite) {
    if (await condicion()) return
    await new Promise((resolver) => setTimeout(resolver, 200))
  }
  throw new Error("esperarHasta agotó el tiempo límite")
}

// Una original con `n` archivos confirmados y una clase copia con una copia en curso de cada uno.
const escenarioDeCopias = async (n: number) => {
  const db = obtenerDb()
  const maestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Maestro ${randomUUID().slice(0, 8)}`,
    rol: "maestro",
  })
  const original = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const copia = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const recursoOriginal = await crearPublicacionDePrueba({
    claseId: original.id,
    autorId: maestro.id,
    tipo: "material",
  })
  const recursoCopia = await crearPublicacionDePrueba({
    claseId: copia.id,
    autorId: maestro.id,
    tipo: "material",
  })
  const pares: {
    original: { id: string; claveObjeto: string }
    copia: { id: string; claveObjeto: string }
  }[] = []
  for (let i = 0; i < n; i++) {
    const deLaOriginal = await crearArchivoDePrueba({
      claseId: original.id,
      subidoPor: maestro.id,
      estado: "confirmado",
      publicacionId: recursoOriginal,
    })
    const id = randomUUID()
    const claveObjeto = `materiales/${copia.id}/${id}`
    await db.archivo.create({
      data: {
        id,
        claveObjeto,
        nombre: "copia.pdf",
        tipo: "application/pdf",
        tamano: 10,
        subidoPor: maestro.id,
        claseId: copia.id,
        publicacionId: recursoCopia,
        estado: "confirmado",
        copiaDe: deLaOriginal.id,
      },
      select: { id: true },
    })
    pares.push({ original: deLaOriginal, copia: { id, claveObjeto } })
  }
  // En el orden en que el worker las lee (por id).
  pares.sort((x, y) => (x.copia.id < y.copia.id ? -1 : 1))
  return { pares, ids: pares.map((par) => par.copia.id) }
}

const leerArchivo = (id: string) =>
  obtenerDb().archivo.findUniqueOrThrow({
    where: { id },
    select: { estado: true, publicacionId: true, copiaDe: true },
  })

describe("COPIAR_OBJETOS (ADM-1B11, ADM-1B21)", () => {
  it("ADM-1B11: copia y limpia copia_de; repetir el trabajo no vuelve a copiar", async () => {
    const { pares, ids } = await escenarioDeCopias(2)
    const objetos = crearObjetosEnMemoria(pares.map((par) => par.original.claveObjeto))

    await procesarCopiaDeObjetos(
      { id: randomUUID(), datos: { archivoIds: ids } },
      {
        almacenDeObjetos: objetos,
        log,
      },
    )
    expect(objetos.copias).toEqual(
      pares.map((par) => ({ origen: par.original.claveObjeto, destino: par.copia.claveObjeto })),
    )
    for (const id of ids) {
      expect(await leerArchivo(id)).toMatchObject({ estado: "confirmado", copiaDe: null })
    }

    await procesarCopiaDeObjetos(
      { id: randomUUID(), datos: { archivoIds: ids } },
      {
        almacenDeObjetos: objetos,
        log,
      },
    )
    expect(objetos.copias).toHaveLength(2)
  })

  it("ADM-1B11: original sin objeto (borrado o descartado) o el almacén dice «origen inexistente» → la copia queda descartada sin publicación", async () => {
    const { pares, ids } = await escenarioDeCopias(2)
    const [conObjeto, sinObjeto] = pares
    if (conObjeto === undefined || sinObjeto === undefined) throw new Error("Precondición: 2 pares")
    // El original del segundo se descartó y su objeto ya no está (la FK RESTRICT impide borrar su fila).
    await obtenerDb().archivo.update({
      where: { id: sinObjeto.original.id },
      data: { estado: "descartado", publicacionId: null },
      select: { id: true },
    })
    const objetos = crearObjetosEnMemoria([conObjeto.original.claveObjeto])

    await procesarCopiaDeObjetos(
      { id: randomUUID(), datos: { archivoIds: ids } },
      {
        almacenDeObjetos: objetos,
        log,
      },
    )
    expect(await leerArchivo(conObjeto.copia.id)).toMatchObject({
      estado: "confirmado",
      copiaDe: null,
    })
    expect(await leerArchivo(sinObjeto.copia.id)).toEqual({
      estado: "descartado",
      publicacionId: null,
      copiaDe: null,
    })
  })

  it("ADM-1B11: un error transitorio del almacén lanza y deja copia_de; sin almacén, el trabajo falla con un error controlado", async () => {
    const { pares, ids } = await escenarioDeCopias(1)
    const objetos = crearObjetosEnMemoria(pares.map((par) => par.original.claveObjeto))
    objetos.fallarEnLaCopia(1)

    await expect(
      procesarCopiaDeObjetos(
        { id: randomUUID(), datos: { archivoIds: ids } },
        {
          almacenDeObjetos: objetos,
          log,
        },
      ),
    ).rejects.toThrow("fallo transitorio simulado")
    expect((await leerArchivo(ids[0] ?? "")).copiaDe).toBe(pares[0]?.original.id)

    await expect(
      procesarCopiaDeObjetos(
        { id: randomUUID(), datos: { archivoIds: ids } },
        {
          almacenDeObjetos: null,
          log,
        },
      ),
    ).rejects.toMatchObject({ codigo: "ALMACEN_NO_CONFIGURADO" })
    expect((await leerArchivo(ids[0] ?? "")).copiaDe).toBe(pares[0]?.original.id)
  })

  it("ADM-1B21: con 3 copias y el almacén fallando en la segunda, la primera queda terminada y el trabajo lanza; el reintento copia solo la segunda y la tercera; una lectura y, como máximo, dos UPDATE por intento, ninguno dentro del ciclo", async () => {
    const { pares, ids } = await escenarioDeCopias(3)
    const objetos = crearObjetosEnMemoria(pares.map((par) => par.original.claveObjeto))
    objetos.fallarEnLaCopia(2)

    // Cuenta cada sentencia de adapters/db y, para cada una, cuántas copias del almacén ya se habían
    // hecho: así se ve que la lectura va antes del ciclo y los UPDATE después.
    const sentencias: { cual: string; copiasHechas: number }[] = []
    const contador: RepositorioDeCopias = {
      leerCopiasPendientes: (lista) => {
        sentencias.push({ cual: "leer", copiasHechas: objetos.copias.length })
        return leerCopiasPendientes(lista)
      },
      terminarCopias: (lista) => {
        sentencias.push({ cual: "terminar", copiasHechas: objetos.copias.length })
        return terminarCopias(lista)
      },
      descartarCopias: (lista) => {
        sentencias.push({ cual: "descartar", copiasHechas: objetos.copias.length })
        return descartarCopias(lista)
      },
    }
    const deps = { almacenDeObjetos: objetos, log }

    await expect(
      procesarCopiaDeObjetos({ id: randomUUID(), datos: { archivoIds: ids } }, deps, contador),
    ).rejects.toThrow("fallo transitorio simulado")
    expect(sentencias).toEqual([
      { cual: "leer", copiasHechas: 0 },
      { cual: "terminar", copiasHechas: 1 },
    ])
    const [primera, segunda, tercera] = ids
    expect((await leerArchivo(primera ?? "")).copiaDe).toBeNull()
    expect((await leerArchivo(segunda ?? "")).copiaDe).not.toBeNull()
    expect((await leerArchivo(tercera ?? "")).copiaDe).not.toBeNull()

    sentencias.length = 0
    await procesarCopiaDeObjetos({ id: randomUUID(), datos: { archivoIds: ids } }, deps, contador)
    expect(sentencias).toEqual([
      { cual: "leer", copiasHechas: 1 },
      { cual: "terminar", copiasHechas: 3 },
    ])
    expect(objetos.copias.map((c) => c.destino)).toEqual(pares.map((par) => par.copia.claveObjeto))
    for (const id of ids) expect((await leerArchivo(id)).copiaDe).toBeNull()
  })
})

describe("BORRAR_OBJETOS (ADM-1B12)", () => {
  it("ADM-1B12: borra las claves; repetirlo no falla; un error del almacén lanza", async () => {
    const claves = ["materiales/c/1", "entregas/t/a/2"]
    const objetos = crearObjetosEnMemoria([...claves, "materiales/otra/3"])
    const deps = { almacenDeObjetos: objetos, log }

    await procesarBorradoDeObjetos({ id: randomUUID(), datos: { claves } }, deps)
    expect([...objetos.claves]).toEqual(["materiales/otra/3"])
    await procesarBorradoDeObjetos({ id: randomUUID(), datos: { claves } }, deps)
    expect(objetos.borrados).toEqual([claves, claves])

    objetos.fallarAlBorrar(true)
    await expect(
      procesarBorradoDeObjetos({ id: randomUUID(), datos: { claves } }, deps),
    ).rejects.toThrow("fallo simulado del almacén al borrar")
    await expect(
      procesarBorradoDeObjetos(
        { id: randomUUID(), datos: { claves } },
        {
          almacenDeObjetos: null,
          log,
        },
      ),
    ).rejects.toMatchObject({ codigo: "ALMACEN_NO_CONFIGURADO" })
  })
})

describe("COPIAR_OBJETOS_FALLIDO (ADM-1B22, ADM-1B11)", () => {
  it("ADM-1B22: recibe los archivoIds en datos y descarta solo esas copias pendientes; un datos fuera del esquema se registra en warn y completa sin tocar nada", async () => {
    const { pares, ids } = await escenarioDeCopias(3)
    const [a, b, c] = ids
    if (a === undefined || b === undefined || c === undefined) throw new Error("Precondición")
    // c ya terminó: no se toca.
    await terminarCopias([c])
    const desde = registros.length

    await procesarCopiasFallidas(
      { id: randomUUID(), idOriginal: "trabajo-original", datos: { archivoIds: [a, c] } },
      { almacenDeObjetos: null, log },
    )
    expect(await leerArchivo(a)).toEqual({
      estado: "descartado",
      publicacionId: null,
      copiaDe: null,
    })
    expect((await leerArchivo(b)).copiaDe).toBe(pares[1]?.original.id)
    expect(await leerArchivo(c)).toMatchObject({ estado: "confirmado", copiaDe: null })
    expect(registros.slice(desde)).toEqual([
      {
        nivel: "warn",
        obj: {
          evento: "copias_de_objetos_fallidas",
          trabajoId: "trabajo-original",
          descartadas: 1,
        },
      },
    ])

    const antes = await leerArchivo(b)
    await procesarCopiasFallidas(
      { id: "fallido", idOriginal: null, datos: { archivoIds: ["no-es-uuid"] } },
      { almacenDeObjetos: null, log },
    )
    expect(await leerArchivo(b)).toEqual(antes)
    expect(registros.at(-1)).toEqual({
      nivel: "warn",
      obj: { evento: "copias_fallidas_datos_invalidos", trabajoId: "fallido" },
    })
  })

  it("ADM-1B11 (por pg-boss, colas propias): un trabajo que agota sus reintentos pasa a la cola de fallidos con sus datos y su consumidor descarta las copias", async () => {
    const { ids } = await escenarioDeCopias(2)
    const id = randomUUID()
    await enTransaccion(obtenerDb(), async (tx) => {
      await encolar(COLAS.copiar, { archivoIds: ids }, { id, sql: ejecutorSqlDe(tx) })
    })

    await esperarHasta(async () => (await buscarTrabajo(COLAS.copiar, id))?.estado === "failed")
    await esperarHasta(async () => {
      const filas = await Promise.all(ids.map(leerArchivo))
      return filas.every((fila) => fila.estado === "descartado")
    })
    for (const archivoId of ids) {
      expect(await leerArchivo(archivoId)).toEqual({
        estado: "descartado",
        publicacionId: null,
        copiaDe: null,
      })
    }
    expect(registros).toContainEqual({
      nivel: "warn",
      obj: { evento: "copias_de_objetos_fallidas", trabajoId: id, descartadas: 2 },
    })
  }, 40_000)
})
