import { randomUUID } from "node:crypto"

import {
  descargaRespuestaSchema,
  entregaDeAlumnoRespuestaSchema,
  errorApiSchema,
  filaDeEntregaSchema,
  listaEntregasRespuestaSchema,
  miEntregaRespuestaSchema,
  solicitarSubidaRespuestaSchema,
  tareaRespuestaSchema,
  type MiEntrega,
} from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { entregar } from "../src/adapters/db/index.js"
import { encolar } from "../src/adapters/queue/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { normalizarParaBusqueda } from "../src/core/auth/normalizacion.js"
import { AppError } from "../src/core/errores.js"
import { COLA_ENTREGA_REALIZADA } from "../src/core/eventos/avisos-de-clase.js"
import { crearAlmacenEnMemoria, type AlmacenEnMemoria } from "./almacen-en-memoria.js"
import {
  borrarUsuariosDePrueba,
  desactivarUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
  leerArchivoDb,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import {
  contarEntregasDeTarea,
  crearArchivoDeEntregaDePrueba,
  crearEntregaDePrueba,
  leerEntregaDb,
  trabajosDeEntregaDeTarea,
} from "./ayudas-entregas.js"
import { crearTareaDePrueba, cuerpoDeTarea } from "./ayudas-tareas.js"

// ENTREGAS-01b (§D-3; PR-1B05 a PR-1B16, PR-1B19 y PR-1B21). Las fechas límite llevan al menos una
// hora de margen respecto de la hora real (la frontera del milisegundo se prueba en core/).

let app: FastifyInstance | undefined
let appSinAlmacen: FastifyInstance | undefined
const almacen: AlmacenEnMemoria = crearAlmacenEnMemoria()
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen })
  await app.ready()
  appSinAlmacen = await construirApp({ env: cargarEnv(), almacen: null })
  await appSinAlmacen.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await appSinAlmacen?.close()
  await app?.close()
})

const HORA_MS = 60 * 60 * 1000
const horasDesdeAhora = (horas: number): Date => new Date(Date.now() + horas * HORA_MS)

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  alumno: UsuarioDePrueba
  otroAlumno: UsuarioDePrueba
  tokens: { maestro: string; alumno: string; otroAlumno: string; admin: string }
}

const escenario = async (): Promise<Escenario> => {
  const ficha = randomUUID().slice(0, 6)
  const maestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Maestra Entregas ${ficha}`,
    rol: "maestro",
  })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const alumno = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Ana Entregas ${ficha}` })
  const otroAlumno = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Beto Entregas ${ficha}` })
  await inscribirDePrueba(clase.id, alumno.id)
  await inscribirDePrueba(clase.id, otroAlumno.id)
  return {
    claseId: clase.id,
    maestro,
    alumno,
    otroAlumno,
    tokens: {
      maestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
      alumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
      otroAlumno: await firmarTokenDePrueba({ usuarioId: otroAlumno.id }),
      admin: await tokenDelAdminDePrueba(),
    },
  }
}

// Una tarea sembrada en la base (así puede tener una fecha límite pasada).
const nuevaTarea = async (
  e: Escenario,
  {
    fechaLimite = horasDesdeAhora(48),
    aceptaTardias = true,
    requiereAdjuntos = true,
  }: { fechaLimite?: Date; aceptaTardias?: boolean; requiereAdjuntos?: boolean } = {},
): Promise<string> => {
  const id = await crearTareaDePrueba({
    claseId: e.claseId,
    autorId: e.maestro.id,
    fechaLimite,
    aceptaTardias,
  })
  if (!requiereAdjuntos) {
    await obtenerDb().tarea.update({
      where: { id },
      data: { requiereAdjuntos: false },
      select: { id: true },
    })
  }
  return id
}

const pedir = (
  token: string,
  method: "GET" | "POST" | "PUT",
  url: string,
  payload?: InjectOptions["payload"],
  servidor: FastifyInstance = obtenerApp(),
): Promise<LightMyRequestResponse> =>
  servidor.inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload }),
    headers: { authorization: `Bearer ${token}` },
  })

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const urlEntrega = (e: Escenario, tareaId: string, resto = ""): string =>
  `/api/clases/${e.claseId}/tareas/${tareaId}/entrega${resto}`

const urlEntregas = (e: Escenario, tareaId: string, resto = ""): string =>
  `/api/clases/${e.claseId}/tareas/${tareaId}/entregas${resto}`

const miEntregaDe = (respuesta: LightMyRequestResponse): MiEntrega => {
  expect(respuesta.statusCode, respuesta.body).toBe(200)
  return miEntregaRespuestaSchema.parse(respuesta.json()).entrega
}

interface ArchivoSubido {
  id: string
  clave: string
}

// Pide la subida por la ruta del alumno y, si se pide, deja el objeto en el almacén en memoria.
const subir = async (
  e: Escenario,
  tareaId: string,
  token: string,
  {
    nombre = "trabajo.pdf",
    tipo = "application/pdf",
    tamano = 3000,
    real,
    alAlmacen = true,
  }: {
    nombre?: string
    tipo?: string
    tamano?: number
    real?: { tamano: number; tipo: string }
    alAlmacen?: boolean
  } = {},
): Promise<ArchivoSubido> => {
  const respuesta = await pedir(token, "POST", urlEntrega(e, tareaId, "/archivos"), {
    nombre,
    tipo,
    tamano,
  })
  expect(respuesta.statusCode, respuesta.body).toBe(201)
  const { archivo } = solicitarSubidaRespuestaSchema.parse(respuesta.json())
  const fila = await leerArchivoDb(archivo.id)
  if (fila === null) throw new Error("Precondición: la subida registró la fila del archivo")
  if (alAlmacen) almacen.subir(fila.claveObjeto, real ?? { tamano, tipo })
  return { id: archivo.id, clave: fila.claveObjeto }
}

const entregarApi = (
  e: Escenario,
  tareaId: string,
  token: string,
  cuerpo: InjectOptions["payload"],
): Promise<LightMyRequestResponse> => pedir(token, "POST", urlEntrega(e, tareaId), cuerpo)

describe("ver la entrega propia (PR-1B05)", () => {
  it("PR-1B05: sin fila responde asignado, sin fecha ni listas, puedeAnular falso, puedeEntregar según el cierre, y no crea la fila", async () => {
    const e = await escenario()
    const abierta = await nuevaTarea(e)
    const vencidaConTardias = await nuevaTarea(e, { fechaLimite: horasDesdeAhora(-2) })
    const cerrada = await nuevaTarea(e, { fechaLimite: horasDesdeAhora(-2), aceptaTardias: false })

    const casos = [
      { tareaId: abierta, puedeEntregar: true },
      { tareaId: vencidaConTardias, puedeEntregar: true },
      { tareaId: cerrada, puedeEntregar: false },
    ]
    for (const { tareaId, puedeEntregar } of casos) {
      const entrega = miEntregaDe(await pedir(e.tokens.alumno, "GET", urlEntrega(e, tareaId)))
      expect(entrega).toEqual({
        estado: "asignado",
        fechaEntrega: null,
        conRetraso: false,
        enlaces: [],
        adjuntos: [],
        puedeEntregar,
        puedeAnular: false,
      })
      expect(await contarEntregasDeTarea(tareaId)).toBe(0)
    }
  })

  it("PR-1B05: una tarea de otra clase responde 404 TAREA_NO_ENCONTRADA", async () => {
    const e = await escenario()
    const otra = await escenario()
    const ajena = await nuevaTarea(otra)
    const respuesta = await pedir(e.tokens.alumno, "GET", urlEntrega(e, ajena))
    expect(respuesta.statusCode, respuesta.body).toBe(404)
    expect(codigoDe(respuesta)).toBe("TAREA_NO_ENCONTRADA")
  })
})

describe("entregar (PR-1B06 a PR-1B09)", () => {
  it("PR-1B06: con 2 archivos y 2 enlaces a tiempo responde 200 entregado, confirma los archivos con entrega_id, sube la versión a 1 y encola un ENTREGA_REALIZADA con solo ids", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    const uno = await subir(e, tareaId, e.tokens.alumno)
    const dos = await subir(e, tareaId, e.tokens.alumno, { nombre: "foto.png", tipo: "image/png" })

    const antes = Date.now()
    const respuesta = await entregarApi(e, tareaId, e.tokens.alumno, {
      archivoIds: [uno.id, dos.id],
      enlaces: ["  HTTPS://Ejemplo.COM/ruta uno  ", "http://ejemplo.org"],
    })
    const entrega = miEntregaDe(respuesta)

    expect(entrega).toMatchObject({
      estado: "entregado",
      conRetraso: false,
      enlaces: ["https://ejemplo.com/ruta%20uno", "http://ejemplo.org/"],
      puedeEntregar: false,
      puedeAnular: true,
    })
    expect(entrega.fechaEntrega).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(new Date(entrega.fechaEntrega ?? "").getTime()).toBeGreaterThanOrEqual(antes - 1000)
    expect(entrega.adjuntos.map((a) => a.id)).toEqual([uno.id, dos.id])
    for (const adjunto of entrega.adjuntos) {
      expect(Object.keys(adjunto).sort()).toEqual(["id", "nombre", "tamano", "tipo", "vistaPrevia"])
    }
    expect(respuesta.body).not.toMatch(/claveObjeto|"version"/)

    const fila = await leerEntregaDb(tareaId, e.alumno.id)
    expect(fila).toMatchObject({ estado: "entregado", version: 1, conRetraso: false })
    for (const archivo of [uno, dos]) {
      expect(await leerArchivoDb(archivo.id)).toMatchObject({
        estado: "confirmado",
        entregaId: fila?.id,
        publicacionId: null,
      })
    }
    const trabajos = await trabajosDeEntregaDeTarea(tareaId)
    expect(trabajos).toHaveLength(1)
    expect(trabajos[0]?.datos).toEqual({
      entregaId: fila?.id,
      tareaId,
      claseId: e.claseId,
      version: 1,
    })
  })

  it("PR-1B06: si la transacción se revierte después de encolar ENTREGA_REALIZADA, no queda trabajo, ni fila de entrega, ni archivo confirmado", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    const archivo = await crearArchivoDeEntregaDePrueba({
      claseId: e.claseId,
      tareaId,
      alumnoId: e.alumno.id,
    })
    const fila = await leerArchivoDb(archivo.id)
    if (fila === null) throw new Error("Precondición: existe el archivo pendiente")

    const resultado = await entregar(
      {
        claseId: e.claseId,
        tareaId,
        alumnoId: e.alumno.id,
        ahora: new Date(),
        archivos: [fila],
        enlaces: ["https://ejemplo.com/"],
      },
      async (sql, { entregaId, version }) => {
        await encolar(
          COLA_ENTREGA_REALIZADA,
          { entregaId, tareaId, claseId: e.claseId, version },
          { id: randomUUID(), sql },
        )
        throw new AppError("FALLO_FORZADO", "Fallo forzado de la prueba", 500)
      },
    ).then(
      () => null,
      (error: unknown) => error,
    )

    expect(resultado).toBeInstanceOf(AppError)
    expect((resultado as AppError).codigo).toBe("FALLO_FORZADO")
    expect(await trabajosDeEntregaDeTarea(tareaId)).toEqual([])
    expect(await contarEntregasDeTarea(tareaId)).toBe(0)
    expect(await leerArchivoDb(archivo.id)).toMatchObject({ estado: "pendiente", entregaId: null })
  })

  it("PR-1B07: tarde con entregas tardías aceptadas responde 200 con conRetraso true", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e, { fechaLimite: horasDesdeAhora(-2) })
    const entrega = miEntregaDe(
      await entregarApi(e, tareaId, e.tokens.alumno, { enlaces: ["https://ejemplo.com/tarde"] }),
    )
    expect(entrega).toMatchObject({ estado: "entregado", conRetraso: true })
    expect(await leerEntregaDb(tareaId, e.alumno.id)).toMatchObject({
      conRetraso: true,
      version: 1,
    })
  })

  it("PR-1B07: tarde sin entregas tardías responde 409 ENTREGA_CERRADA sin fila, archivo confirmado ni trabajo", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e, { fechaLimite: horasDesdeAhora(-2), aceptaTardias: false })
    const archivo = await crearArchivoDeEntregaDePrueba({
      claseId: e.claseId,
      tareaId,
      alumnoId: e.alumno.id,
    })
    almacen.subir(archivo.claveObjeto, { tamano: archivo.tamano, tipo: archivo.tipo })

    const respuesta = await entregarApi(e, tareaId, e.tokens.alumno, {
      archivoIds: [archivo.id],
      enlaces: ["https://ejemplo.com/"],
    })

    expect(respuesta.statusCode, respuesta.body).toBe(409)
    expect(codigoDe(respuesta)).toBe("ENTREGA_CERRADA")
    expect(await contarEntregasDeTarea(tareaId)).toBe(0)
    expect(await leerArchivoDb(archivo.id)).toMatchObject({ estado: "pendiente", entregaId: null })
    expect(await trabajosDeEntregaDeTarea(tareaId)).toEqual([])
  })

  it("PR-1B08: sin archivos ni enlaces, una tarea que no requiere adjuntos se marca como completada (200 entregado con listas vacías)", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e, { requiereAdjuntos: false })
    const entrega = miEntregaDe(await entregarApi(e, tareaId, e.tokens.alumno, {}))
    expect(entrega).toMatchObject({
      estado: "entregado",
      conRetraso: false,
      enlaces: [],
      adjuntos: [],
      puedeAnular: true,
    })
    expect(await trabajosDeEntregaDeTarea(tareaId)).toHaveLength(1)
  })

  it("PR-1B08: sin archivos ni enlaces, una tarea que requiere adjuntos responde 400 ENTREGA_VACIA sin escribir nada", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    const respuesta = await entregarApi(e, tareaId, e.tokens.alumno, {
      archivoIds: [],
      enlaces: [],
    })
    expect(respuesta.statusCode, respuesta.body).toBe(400)
    expect(codigoDe(respuesta)).toBe("ENTREGA_VACIA")
    expect(await contarEntregasDeTarea(tareaId)).toBe(0)
    expect(await trabajosDeEntregaDeTarea(tareaId)).toEqual([])
  })

  it("PR-1B09: entregar dos veces responde 409 ENTREGA_YA_REALIZADA y no cambia la entrega ni encola otro trabajo", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    miEntregaDe(await entregarApi(e, tareaId, e.tokens.alumno, { enlaces: ["https://a.com/"] }))
    const subida = await pedir(e.tokens.alumno, "POST", urlEntrega(e, tareaId, "/archivos"), {
      nombre: "b.pdf",
      tipo: "application/pdf",
      tamano: 10,
    })
    expect(subida.statusCode, "con la entrega vigente no se pide otra subida (S-10)").toBe(409)

    const respuesta = await entregarApi(e, tareaId, e.tokens.alumno, {
      enlaces: ["https://b.com/"],
    })
    expect(respuesta.statusCode, respuesta.body).toBe(409)
    expect(codigoDe(respuesta)).toBe("ENTREGA_YA_REALIZADA")
    expect(await leerEntregaDb(tareaId, e.alumno.id)).toMatchObject({
      version: 1,
      enlaces: ["https://a.com/"],
    })
    expect(await trabajosDeEntregaDeTarea(tareaId)).toHaveLength(1)
  })

  it("PR-1B09: dos entregas simultáneas del mismo alumno sin fila previa dan un 200 y un 409, una sola fila, un solo trabajo y solo los archivos de la que ganó confirmados", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    const a = await subir(e, tareaId, e.tokens.alumno, { nombre: "a.pdf" })
    const b = await subir(e, tareaId, e.tokens.alumno, { nombre: "b.pdf" })

    const respuestas = await Promise.all([
      entregarApi(e, tareaId, e.tokens.alumno, { archivoIds: [a.id] }),
      entregarApi(e, tareaId, e.tokens.alumno, { archivoIds: [b.id] }),
    ])

    for (const respuesta of respuestas) expect(respuesta.statusCode).toBeLessThan(500)
    expect(respuestas.map((r) => r.statusCode).sort((x, y) => x - y)).toEqual([200, 409])
    const perdedora = respuestas.find((r) => r.statusCode === 409)
    if (perdedora === undefined) throw new Error("Precondición: hay una respuesta 409")
    expect(codigoDe(perdedora)).toBe("ENTREGA_YA_REALIZADA")
    expect(await contarEntregasDeTarea(tareaId)).toBe(1)
    expect(await trabajosDeEntregaDeTarea(tareaId)).toHaveLength(1)
    const ganadora = respuestas.findIndex((r) => r.statusCode === 200)
    const [archivoGanador, archivoPerdedor] = ganadora === 0 ? [a, b] : [b, a]
    expect((await leerArchivoDb(archivoGanador.id))?.estado).toBe("confirmado")
    expect((await leerArchivoDb(archivoPerdedor.id))?.estado).toBe("pendiente")
  })
})

describe("archivos que no se confirman en una entrega (PR-1B10)", () => {
  // Cada caso: 400 con su código, sin fila de entrega, sin trabajo y el archivo como estaba.
  const rechazaSinEscribir = async (
    e: Escenario,
    tareaId: string,
    archivoId: string,
    codigo: string,
  ): Promise<void> => {
    const antes = await leerArchivoDb(archivoId)
    const respuesta = await entregarApi(e, tareaId, e.tokens.alumno, { archivoIds: [archivoId] })
    expect(respuesta.statusCode, respuesta.body).toBe(400)
    expect(codigoDe(respuesta)).toBe(codigo)
    expect(await contarEntregasDeTarea(tareaId)).toBe(0)
    expect(await trabajosDeEntregaDeTarea(tareaId)).toEqual([])
    expect(await leerArchivoDb(archivoId)).toEqual(antes)
  }

  it("PR-1B10: el archivo de otro alumno de la misma tarea", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    const ajeno = await subir(e, tareaId, e.tokens.otroAlumno)
    await rechazaSinEscribir(e, tareaId, ajeno.id, "ARCHIVO_INVALIDO")
  })

  it("PR-1B10: un archivo subido por un maestro con clave materiales/…", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    const respuesta = await pedir(e.tokens.maestro, "POST", `/api/clases/${e.claseId}/archivos`, {
      nombre: "guia.pdf",
      tipo: "application/pdf",
      tamano: 1000,
    })
    expect(respuesta.statusCode, respuesta.body).toBe(201)
    const { archivo } = solicitarSubidaRespuestaSchema.parse(respuesta.json())
    const fila = await leerArchivoDb(archivo.id)
    if (fila === null) throw new Error("Precondición: existe el material pendiente")
    almacen.subir(fila.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
    await rechazaSinEscribir(e, tareaId, archivo.id, "ARCHIVO_INVALIDO")
  })

  it("PR-1B10: un archivo del mismo alumno con clave de materiales (forzado en la base)", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    const propio = await crearArchivoDePrueba({ claseId: e.claseId, subidoPor: e.alumno.id })
    almacen.subir(propio.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
    await rechazaSinEscribir(e, tareaId, propio.id, "ARCHIVO_INVALIDO")
  })

  it("PR-1B10: un archivo del mismo alumno subido para otra tarea", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    const otraTarea = await nuevaTarea(e)
    const deOtraTarea = await subir(e, otraTarea, e.tokens.alumno)
    await rechazaSinEscribir(e, tareaId, deOtraTarea.id, "ARCHIVO_INVALIDO")
  })

  it("PR-1B10: un archivo ya confirmado en otra entrega o en una publicación", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    const otraTarea = await nuevaTarea(e)
    const confirmado = await subir(e, otraTarea, e.tokens.alumno)
    miEntregaDe(await entregarApi(e, otraTarea, e.tokens.alumno, { archivoIds: [confirmado.id] }))
    await rechazaSinEscribir(e, tareaId, confirmado.id, "ARCHIVO_INVALIDO")

    const material = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      tipo: "material",
    })
    const dePublicacion = await crearArchivoDePrueba({
      claseId: e.claseId,
      subidoPor: e.alumno.id,
      estado: "confirmado",
      publicacionId: material,
    })
    await rechazaSinEscribir(e, tareaId, dePublicacion.id, "ARCHIVO_INVALIDO")
  })

  it("PR-1B10: un archivo pendiente de hace más de 24 h", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    const viejo = await crearArchivoDeEntregaDePrueba({
      claseId: e.claseId,
      tareaId,
      alumnoId: e.alumno.id,
      creadoEn: horasDesdeAhora(-25),
    })
    almacen.subir(viejo.claveObjeto, { tamano: viejo.tamano, tipo: viejo.tipo })
    await rechazaSinEscribir(e, tareaId, viejo.id, "ARCHIVO_INVALIDO")
  })

  it("PR-1B10: un archivo que no se subió al almacén (ARCHIVO_NO_SUBIDO) y uno distinto de lo declarado (ARCHIVO_INVALIDO)", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    const sinSubir = await subir(e, tareaId, e.tokens.alumno, { alAlmacen: false })
    await rechazaSinEscribir(e, tareaId, sinSubir.id, "ARCHIVO_NO_SUBIDO")
    const distinto = await subir(e, tareaId, e.tokens.alumno, {
      tamano: 3000,
      real: { tamano: 9999, tipo: "application/pdf" },
    })
    await rechazaSinEscribir(e, tareaId, distinto.id, "ARCHIVO_INVALIDO")
  })

  it("PR-1B10: un archivo de otra clase con el prefijo de esta entrega", async () => {
    const e = await escenario()
    const otra = await escenario()
    await inscribirDePrueba(otra.claseId, e.alumno.id)
    const tareaId = await nuevaTarea(e)
    const deOtraClase = await crearArchivoDeEntregaDePrueba({
      claseId: otra.claseId,
      tareaId,
      alumnoId: e.alumno.id,
    })
    almacen.subir(deOtraClase.claveObjeto, { tamano: deOtraClase.tamano, tipo: deOtraClase.tipo })
    await rechazaSinEscribir(e, tareaId, deOtraClase.id, "ARCHIVO_INVALIDO")
  })
})

describe("anular (PR-1B11 a PR-1B13)", () => {
  it("PR-1B11: anular una entrega la deja en asignado, sin fecha ni enlaces, descarta sus archivos y sube la versión", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    const archivo = await subir(e, tareaId, e.tokens.alumno)
    miEntregaDe(
      await entregarApi(e, tareaId, e.tokens.alumno, {
        archivoIds: [archivo.id],
        enlaces: ["https://ejemplo.com/"],
      }),
    )

    const entrega = miEntregaDe(
      await pedir(e.tokens.alumno, "POST", urlEntrega(e, tareaId, "/anular")),
    )

    expect(entrega).toEqual({
      estado: "asignado",
      fechaEntrega: null,
      conRetraso: false,
      enlaces: [],
      adjuntos: [],
      puedeEntregar: true,
      puedeAnular: false,
    })
    expect(await leerEntregaDb(tareaId, e.alumno.id)).toMatchObject({
      estado: "asignado",
      fechaEntrega: null,
      enlaces: [],
      version: 2,
    })
    expect(await leerArchivoDb(archivo.id)).toMatchObject({ estado: "descartado", entregaId: null })
    expect(await trabajosDeEntregaDeTarea(tareaId)).toHaveLength(1)
  })

  it("PR-1B11: sin fila o ya anulada responde 409 ENTREGA_NO_REALIZADA sin crear ni cambiar nada", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    const sinFila = await pedir(e.tokens.alumno, "POST", urlEntrega(e, tareaId, "/anular"))
    expect(sinFila.statusCode, sinFila.body).toBe(409)
    expect(codigoDe(sinFila)).toBe("ENTREGA_NO_REALIZADA")
    expect(await contarEntregasDeTarea(tareaId)).toBe(0)

    miEntregaDe(await entregarApi(e, tareaId, e.tokens.alumno, { enlaces: ["https://a.com/"] }))
    miEntregaDe(await pedir(e.tokens.alumno, "POST", urlEntrega(e, tareaId, "/anular")))
    const yaAnulada = await pedir(e.tokens.alumno, "POST", urlEntrega(e, tareaId, "/anular"))
    expect(yaAnulada.statusCode, yaAnulada.body).toBe(409)
    expect(codigoDe(yaAnulada)).toBe("ENTREGA_NO_REALIZADA")
    expect(await leerEntregaDb(tareaId, e.alumno.id)).toMatchObject({ version: 2 })
  })

  it("PR-1B11: una entrega calificada (puesta a mano) responde 409 ENTREGA_CALIFICADA sin tocar sus archivos", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    const entregaId = await crearEntregaDePrueba({
      tareaId,
      alumnoId: e.alumno.id,
      estado: "calificado",
      version: 3,
    })
    const archivo = await crearArchivoDeEntregaDePrueba({
      claseId: e.claseId,
      tareaId,
      alumnoId: e.alumno.id,
      estado: "confirmado",
      entregaId,
    })
    const respuesta = await pedir(e.tokens.alumno, "POST", urlEntrega(e, tareaId, "/anular"))
    expect(respuesta.statusCode, respuesta.body).toBe(409)
    expect(codigoDe(respuesta)).toBe("ENTREGA_CALIFICADA")
    expect(await leerArchivoDb(archivo.id)).toMatchObject({ estado: "confirmado", entregaId })
    expect(await leerEntregaDb(tareaId, e.alumno.id)).toMatchObject({
      estado: "calificado",
      version: 3,
    })
  })

  it("PR-1B11: una entrega cerrada (P-02 a) responde 409 ENTREGA_CERRADA", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e, { fechaLimite: horasDesdeAhora(-2), aceptaTardias: false })
    await crearEntregaDePrueba({
      tareaId,
      alumnoId: e.alumno.id,
      fechaEntrega: horasDesdeAhora(-3),
    })
    const respuesta = await pedir(e.tokens.alumno, "POST", urlEntrega(e, tareaId, "/anular"))
    expect(respuesta.statusCode, respuesta.body).toBe(409)
    expect(codigoDe(respuesta)).toBe("ENTREGA_CERRADA")
    expect(await leerEntregaDb(tareaId, e.alumno.id)).toMatchObject({
      estado: "entregado",
      version: 1,
    })
  })

  it("PR-1B11: un cuerpo con llaves responde 400 sin anular; un cuerpo vacío ({}) anula", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    miEntregaDe(await entregarApi(e, tareaId, e.tokens.alumno, { enlaces: ["https://a.com/"] }))
    const conLlaves = await pedir(e.tokens.alumno, "POST", urlEntrega(e, tareaId, "/anular"), {
      motivo: "x",
    })
    expect(conLlaves.statusCode, conLlaves.body).toBe(400)
    expect(codigoDe(conLlaves)).toBe("VALIDACION")
    expect(await leerEntregaDb(tareaId, e.alumno.id)).toMatchObject({
      estado: "entregado",
      version: 1,
    })
    const vacio = await pedir(e.tokens.alumno, "POST", urlEntrega(e, tareaId, "/anular"), {})
    expect(miEntregaDe(vacio).estado).toBe("asignado")
  })

  it("PR-1B12: volver a entregar después de anular, antes de la fecha límite, queda sin retraso y la versión sigue subiendo (1, 2, 3)", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    miEntregaDe(await entregarApi(e, tareaId, e.tokens.alumno, { enlaces: ["https://a.com/"] }))
    expect((await leerEntregaDb(tareaId, e.alumno.id))?.version).toBe(1)
    miEntregaDe(await pedir(e.tokens.alumno, "POST", urlEntrega(e, tareaId, "/anular")))
    expect((await leerEntregaDb(tareaId, e.alumno.id))?.version).toBe(2)
    const otra = miEntregaDe(
      await entregarApi(e, tareaId, e.tokens.alumno, { enlaces: ["https://b.com/"] }),
    )
    expect(otra).toMatchObject({
      estado: "entregado",
      conRetraso: false,
      enlaces: ["https://b.com/"],
    })
    expect(await leerEntregaDb(tareaId, e.alumno.id)).toMatchObject({
      version: 3,
      conRetraso: false,
    })
    expect((await trabajosDeEntregaDeTarea(tareaId)).map((t) => t.datos.version)).toEqual([1, 3])
  })

  it("PR-1B12: volver a entregar después de la fecha límite (con tardías) queda con retraso aunque la primera fuera a tiempo (S-03)", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e, { fechaLimite: horasDesdeAhora(2) })
    expect(
      miEntregaDe(await entregarApi(e, tareaId, e.tokens.alumno, { enlaces: ["https://a.com/"] }))
        .conRetraso,
    ).toBe(false)
    miEntregaDe(await pedir(e.tokens.alumno, "POST", urlEntrega(e, tareaId, "/anular")))
    // La fecha límite pasa (se mueve dos horas atrás en la base, con margen sobre la hora real).
    await obtenerDb().tarea.update({
      where: { id: tareaId },
      data: { fechaLimite: horasDesdeAhora(-2) },
      select: { id: true },
    })
    const tarde = miEntregaDe(
      await entregarApi(e, tareaId, e.tokens.alumno, { enlaces: ["https://b.com/"] }),
    )
    expect(tarde).toMatchObject({ estado: "entregado", conRetraso: true })
    expect(await leerEntregaDb(tareaId, e.alumno.id)).toMatchObject({
      version: 3,
      conRetraso: true,
    })
  })

  it("PR-1B13: con la entrega cerrada, mover la fecha límite a futuro permite entregar a tiempo", async () => {
    const e = await escenario()
    const pasada = horasDesdeAhora(-2)
    const tareaId = await nuevaTarea(e, { fechaLimite: pasada, aceptaTardias: false })
    const cerrada = await entregarApi(e, tareaId, e.tokens.alumno, { enlaces: ["https://a.com/"] })
    expect(codigoDe(cerrada)).toBe("ENTREGA_CERRADA")

    const movida = await pedir(
      e.tokens.maestro,
      "PUT",
      `/api/clases/${e.claseId}/tareas/${tareaId}`,
      cuerpoDeTarea({
        fechaLimite: horasDesdeAhora(48).toISOString(),
        aceptaTardias: false,
        version: 0,
      }),
    )
    expect(movida.statusCode, movida.body).toBe(200)
    const entrega = miEntregaDe(
      await entregarApi(e, tareaId, e.tokens.alumno, { enlaces: ["https://a.com/"] }),
    )
    expect(entrega).toMatchObject({ estado: "entregado", conRetraso: false })
  })

  it("PR-1B13: con la entrega cerrada, cambiar a aceptar con retraso permite entregar con retraso", async () => {
    const e = await escenario()
    const pasada = horasDesdeAhora(-2)
    const tareaId = await nuevaTarea(e, { fechaLimite: pasada, aceptaTardias: false })
    const leida = await pedir(e.tokens.maestro, "GET", `/api/clases/${e.claseId}/tareas/${tareaId}`)
    const { tarea } = tareaRespuestaSchema.parse(leida.json())

    const cambiada = await pedir(
      e.tokens.maestro,
      "PUT",
      `/api/clases/${e.claseId}/tareas/${tareaId}`,
      cuerpoDeTarea({
        fechaLimite: tarea.fechaLimite,
        aceptaTardias: true,
        version: tarea.version,
      }),
    )
    expect(cambiada.statusCode, cambiada.body).toBe(200)
    const entrega = miEntregaDe(
      await entregarApi(e, tareaId, e.tokens.alumno, { enlaces: ["https://a.com/"] }),
    )
    expect(entrega).toMatchObject({ estado: "entregado", conRetraso: true })
  })

  it("PR-1B13: anular una entrega cerrada después de mover la fecha límite a futuro funciona", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e, { fechaLimite: horasDesdeAhora(-2), aceptaTardias: false })
    await crearEntregaDePrueba({
      tareaId,
      alumnoId: e.alumno.id,
      fechaEntrega: horasDesdeAhora(-3),
    })
    expect(codigoDe(await pedir(e.tokens.alumno, "POST", urlEntrega(e, tareaId, "/anular")))).toBe(
      "ENTREGA_CERRADA",
    )
    const movida = await pedir(
      e.tokens.maestro,
      "PUT",
      `/api/clases/${e.claseId}/tareas/${tareaId}`,
      cuerpoDeTarea({
        fechaLimite: horasDesdeAhora(48).toISOString(),
        aceptaTardias: false,
        version: 0,
      }),
    )
    expect(movida.statusCode, movida.body).toBe(200)
    const entrega = miEntregaDe(
      await pedir(e.tokens.alumno, "POST", urlEntrega(e, tareaId, "/anular")),
    )
    expect(entrega).toMatchObject({ estado: "asignado", puedeEntregar: true })
  })
})

describe("subir un archivo de entrega (PR-1B14)", () => {
  it("PR-1B14: responde 201 y guarda la clave entregas/{tareaId}/{alumnoId}/{archivoId}, sin el nombre del archivo y sin devolverla", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    const respuesta = await pedir(e.tokens.alumno, "POST", urlEntrega(e, tareaId, "/archivos"), {
      nombre: "Mi ensayo final.pdf",
      tipo: "application/pdf",
      tamano: 1234,
    })
    expect(respuesta.statusCode, respuesta.body).toBe(201)
    expect(respuesta.headers["cache-control"]).toBe("no-store")
    const { archivo, subida } = solicitarSubidaRespuestaSchema.parse(respuesta.json())
    expect(Object.keys(respuesta.json<{ archivo: object }>().archivo).sort()).toEqual([
      "id",
      "nombre",
      "tamano",
      "tipo",
    ])
    expect(respuesta.body).not.toMatch(/claveObjeto/)
    expect(subida).toMatchObject({
      metodo: "PUT",
      cabeceras: { "Content-Type": "application/pdf" },
    })
    const fila = await leerArchivoDb(archivo.id)
    expect(fila).toMatchObject({
      claveObjeto: `entregas/${tareaId}/${e.alumno.id}/${archivo.id}`,
      estado: "pendiente",
      subidoPor: e.alumno.id,
      claseId: e.claseId,
      publicacionId: null,
      entregaId: null,
    })
    expect(fila?.claveObjeto).not.toMatch(/ensayo/i)
  })

  it("PR-1B14: con la entrega ya realizada, calificada o cerrada responde 409 sin fila nueva", async () => {
    const e = await escenario()
    const entregada = await nuevaTarea(e)
    await crearEntregaDePrueba({ tareaId: entregada, alumnoId: e.alumno.id })
    const calificada = await nuevaTarea(e)
    await crearEntregaDePrueba({ tareaId: calificada, alumnoId: e.alumno.id, estado: "calificado" })
    const cerrada = await nuevaTarea(e, { fechaLimite: horasDesdeAhora(-2), aceptaTardias: false })

    const casos = [
      { tareaId: entregada, codigo: "ENTREGA_YA_REALIZADA" },
      { tareaId: calificada, codigo: "ENTREGA_CALIFICADA" },
      { tareaId: cerrada, codigo: "ENTREGA_CERRADA" },
    ]
    const archivosAntes = await obtenerDb().archivo.count({ where: { claseId: e.claseId } })
    for (const { tareaId, codigo } of casos) {
      const respuesta = await pedir(e.tokens.alumno, "POST", urlEntrega(e, tareaId, "/archivos"), {
        nombre: "a.pdf",
        tipo: "application/pdf",
        tamano: 10,
      })
      expect(respuesta.statusCode, respuesta.body).toBe(409)
      expect(codigoDe(respuesta)).toBe(codigo)
    }
    expect(await obtenerDb().archivo.count({ where: { claseId: e.claseId } })).toBe(archivosAntes)
  })

  it("PR-1B14: una tarea de otra clase responde 404, y un tipo, una extensión o un tamaño inválidos responden 400, sin fila nueva", async () => {
    const e = await escenario()
    const otra = await escenario()
    const ajena = await nuevaTarea(otra)
    const tareaId = await nuevaTarea(e)
    const archivosAntes = await obtenerDb().archivo.count({ where: { claseId: e.claseId } })

    const deOtraClase = await pedir(e.tokens.alumno, "POST", urlEntrega(e, ajena, "/archivos"), {
      nombre: "a.pdf",
      tipo: "application/pdf",
      tamano: 10,
    })
    expect(deOtraClase.statusCode, deOtraClase.body).toBe(404)
    expect(codigoDe(deOtraClase)).toBe("TAREA_NO_ENCONTRADA")

    const invalidos = [
      { nombre: "a.svg", tipo: "image/svg+xml", tamano: 10 },
      { nombre: "a.exe", tipo: "application/pdf", tamano: 10 },
      { nombre: "a.pdf", tipo: "application/pdf", tamano: 25 * 1024 * 1024 + 1 },
      { nombre: "a.pdf", tipo: "application/pdf", tamano: 0 },
    ]
    for (const cuerpo of invalidos) {
      const respuesta = await pedir(
        e.tokens.alumno,
        "POST",
        urlEntrega(e, tareaId, "/archivos"),
        cuerpo,
      )
      expect(respuesta.statusCode, respuesta.body).toBe(400)
      expect(codigoDe(respuesta)).toBe("ARCHIVO_INVALIDO")
    }
    expect(await obtenerDb().archivo.count({ where: { claseId: e.claseId } })).toBe(archivosAntes)
  })

  it("PR-1B14: sin almacén responde 503 ALMACEN_NO_CONFIGURADO sin fila nueva", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    if (!appSinAlmacen) throw new Error("Precondición: la aplicación sin almacén existe")
    const respuesta = await pedir(
      e.tokens.alumno,
      "POST",
      urlEntrega(e, tareaId, "/archivos"),
      { nombre: "a.pdf", tipo: "application/pdf", tamano: 10 },
      appSinAlmacen,
    )
    expect(respuesta.statusCode, respuesta.body).toBe(503)
    expect(codigoDe(respuesta)).toBe("ALMACEN_NO_CONFIGURADO")
    expect(await obtenerDb().archivo.count({ where: { claseId: e.claseId } })).toBe(0)
  })
})

describe("descargas de archivos de entrega (PR-1B15 y PR-1B16)", () => {
  interface Preparado {
    e: Escenario
    tareaId: string
    propio: ArchivoSubido
    delOtro: ArchivoSubido
  }

  // El alumno y su compañero entregan cada uno un archivo en la misma tarea.
  const preparar = async (): Promise<Preparado> => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    const propio = await subir(e, tareaId, e.tokens.alumno, { nombre: "Mío.pdf" })
    miEntregaDe(await entregarApi(e, tareaId, e.tokens.alumno, { archivoIds: [propio.id] }))
    const delOtro = await subir(e, tareaId, e.tokens.otroAlumno)
    miEntregaDe(await entregarApi(e, tareaId, e.tokens.otroAlumno, { archivoIds: [delOtro.id] }))
    return { e, tareaId, propio, delOtro }
  }

  const descargaDelAlumno = (p: Preparado, archivoId: string, token = p.e.tokens.alumno) =>
    pedir(token, "POST", urlEntrega(p.e, p.tareaId, `/archivos/${archivoId}/descarga`))

  it("PR-1B15: el alumno descarga el suyo con una URL de adjunto y sin caché", async () => {
    const p = await preparar()
    const respuesta = await descargaDelAlumno(p, p.propio.id)
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    expect(respuesta.headers["cache-control"]).toBe("no-store")
    const { url } = descargaRespuestaSchema.parse(respuesta.json())
    expect(url).toContain(p.propio.clave)
    const firmada = almacen.descargasFirmadas.at(-1)
    expect(firmada?.clave).toBe(p.propio.clave)
    expect(firmada?.disposicion.startsWith("attachment;")).toBe(true)
  })

  it("PR-1B15: el de otro alumno, uno de material, uno pendiente, uno descartado y uno de otra tarea responden 404 ARCHIVO_NO_ENCONTRADO, igual", async () => {
    const p = await preparar()
    const { e } = p
    const material = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      tipo: "material",
    })
    const deMaterial = await crearArchivoDePrueba({
      claseId: e.claseId,
      subidoPor: e.maestro.id,
      estado: "confirmado",
      publicacionId: material,
    })
    const otraTarea = await nuevaTarea(e)
    const pendiente = await subir(e, otraTarea, e.tokens.alumno)
    const descartado = await crearArchivoDeEntregaDePrueba({
      claseId: e.claseId,
      tareaId: p.tareaId,
      alumnoId: e.alumno.id,
      estado: "descartado",
    })
    const deOtraTarea = await subir(e, otraTarea, e.tokens.alumno, { nombre: "otra.pdf" })
    miEntregaDe(await entregarApi(e, otraTarea, e.tokens.alumno, { archivoIds: [deOtraTarea.id] }))
    const pendienteDeEstaTarea = await crearArchivoDeEntregaDePrueba({
      claseId: e.claseId,
      tareaId: p.tareaId,
      alumnoId: e.alumno.id,
    })

    const cuerpos = new Set<string>()
    for (const archivoId of [
      p.delOtro.id,
      deMaterial.id,
      pendiente.id,
      pendienteDeEstaTarea.id,
      descartado.id,
      deOtraTarea.id,
      randomUUID(),
    ]) {
      const respuesta = await descargaDelAlumno(p, archivoId)
      expect(respuesta.statusCode, respuesta.body).toBe(404)
      expect(codigoDe(respuesta)).toBe("ARCHIVO_NO_ENCONTRADO")
      cuerpos.add(respuesta.body)
    }
    expect(cuerpos.size).toBe(1)
  })

  it("PR-1B16: el maestro de la clase y el admin descargan el archivo del alumno de la ruta", async () => {
    const p = await preparar()
    for (const token of [p.e.tokens.maestro, p.e.tokens.admin]) {
      const respuesta = await pedir(
        token,
        "POST",
        urlEntregas(p.e, p.tareaId, `/${p.e.alumno.id}/archivos/${p.propio.id}/descarga`),
      )
      expect(respuesta.statusCode, respuesta.body).toBe(200)
      expect(descargaRespuestaSchema.parse(respuesta.json()).url).toContain(p.propio.clave)
      expect(almacen.descargasFirmadas.at(-1)?.disposicion.startsWith("attachment;")).toBe(true)
    }
  })

  it("PR-1B16: con el :alumnoId de otro alumno responde 404 ARCHIVO_NO_ENCONTRADO", async () => {
    const p = await preparar()
    const respuesta = await pedir(
      p.e.tokens.maestro,
      "POST",
      urlEntregas(p.e, p.tareaId, `/${p.e.otroAlumno.id}/archivos/${p.propio.id}/descarga`),
    )
    expect(respuesta.statusCode, respuesta.body).toBe(404)
    expect(codigoDe(respuesta)).toBe("ARCHIVO_NO_ENCONTRADO")
  })

  it("PR-1B16: un alumno dado de baja o desactivado responde 404 ALUMNO_NO_ENCONTRADO", async () => {
    const p = await preparar()
    await obtenerDb().inscripcion.delete({
      where: { claseId_usuarioId: { claseId: p.e.claseId, usuarioId: p.e.alumno.id } },
    })
    const deBaja = await pedir(
      p.e.tokens.maestro,
      "POST",
      urlEntregas(p.e, p.tareaId, `/${p.e.alumno.id}/archivos/${p.propio.id}/descarga`),
    )
    expect(deBaja.statusCode, deBaja.body).toBe(404)
    expect(codigoDe(deBaja)).toBe("ALUMNO_NO_ENCONTRADO")

    await desactivarUsuarioDePrueba(p.e.otroAlumno.id)
    const desactivado = await pedir(
      p.e.tokens.admin,
      "POST",
      urlEntregas(p.e, p.tareaId, `/${p.e.otroAlumno.id}/archivos/${p.delOtro.id}/descarga`),
    )
    expect(desactivado.statusCode, desactivado.body).toBe(404)
    expect(codigoDe(desactivado)).toBe("ALUMNO_NO_ENCONTRADO")
  })
})

describe("lista de entregas de una tarea (PR-1B19)", () => {
  // Alumnos sembrados en lote (sin argon2: no inician sesión), inscritos en la clase.
  const inscribirEnLote = async (
    claseId: string,
    nombres: readonly string[],
  ): Promise<string[]> => {
    const filas = nombres.map((nombre) => ({
      id: randomUUID(),
      email: `lote-${randomUUID()}@pruebas.local`,
      hashContrasena: "sin-uso",
      nombre,
      nombreBusqueda: normalizarParaBusqueda(nombre),
      rol: "estudiante" as const,
    }))
    await obtenerDb().usuario.createMany({ data: filas })
    idsUsuarios.push(...filas.map((fila) => fila.id))
    await obtenerDb().inscripcion.createMany({
      data: filas.map((fila) => ({ claseId, usuarioId: fila.id, origen: "manual" as const })),
    })
    return filas.map((fila) => fila.id)
  }

  const listar = async (e: Escenario, tareaId: string, consulta = "") => {
    const respuesta = await pedir(e.tokens.maestro, "GET", urlEntregas(e, tareaId, consulta))
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    return listaEntregasRespuestaSchema.parse(respuesta.json())
  }

  it("PR-1B19: 50 por defecto, en orden alfabético con desempate por id, y el cursor avanza sin repetir ni saltar", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    const nombres = Array.from({ length: 53 }, (_, i) => `Lote ${String(i).padStart(2, "0")}`)
    const repetidos = await inscribirEnLote(e.claseId, ["Lote 07", "Lote 07"])
    await inscribirEnLote(e.claseId, nombres)

    const primera = await listar(e, tareaId)
    expect(primera.entregas).toHaveLength(50)
    expect(primera.total).toBe(57)
    expect(primera.siguienteCursor).not.toBeNull()
    const segunda = await listar(e, tareaId, `?cursor=${primera.siguienteCursor ?? ""}`)
    expect(segunda.siguienteCursor).toBeNull()

    const todas = [...primera.entregas, ...segunda.entregas]
    expect(todas).toHaveLength(57)
    expect(new Set(todas.map((f) => f.alumno.id)).size).toBe(57)
    const claves = todas.map((f) => [normalizarParaBusqueda(f.alumno.nombre), f.alumno.id] as const)
    const ordenadas = [...claves].sort((a, b) =>
      a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1,
    )
    expect(claves).toEqual(ordenadas)
    // Los dos homónimos quedan en el orden de su id (el desempate).
    const homonimos = todas.filter((f) => repetidos.includes(f.alumno.id)).map((f) => f.alumno.id)
    expect(homonimos).toEqual([...repetidos].sort())
  })

  it("PR-1B19: limite hasta 100 y 101 responde 400", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    await inscribirEnLote(
      e.claseId,
      Array.from({ length: 3 }, (_, i) => `Lim ${String(i)}`),
    )
    expect((await listar(e, tareaId, "?limite=100")).entregas).toHaveLength(5)
    expect((await listar(e, tareaId, "?limite=2")).entregas).toHaveLength(2)
    const demasiado = await pedir(e.tokens.maestro, "GET", urlEntregas(e, tareaId, "?limite=101"))
    expect(demasiado.statusCode, demasiado.body).toBe(400)
    expect(codigoDe(demasiado)).toBe("VALIDACION")
  })

  it("PR-1B19: cada fila con su estado (asignado sin fila, entregado, con retraso, calificado), total y entregadas sin contar a quien salió de la clase ni a un desactivado; las filas traen exactamente las llaves del esquema", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    const [conRetraso, calificado, deBaja, desactivado] = await inscribirEnLote(e.claseId, [
      "Carla Retraso",
      "Dante Calificado",
      "Eva Baja",
      "Fito Desactivado",
    ])
    if (!conRetraso || !calificado || !deBaja || !desactivado) {
      throw new Error("Precondición: se inscribieron los cuatro alumnos")
    }
    await crearEntregaDePrueba({ tareaId, alumnoId: e.alumno.id })
    await crearEntregaDePrueba({ tareaId, alumnoId: conRetraso, conRetraso: true })
    await crearEntregaDePrueba({ tareaId, alumnoId: calificado, estado: "calificado" })
    await crearEntregaDePrueba({ tareaId, alumnoId: deBaja })
    await crearEntregaDePrueba({ tareaId, alumnoId: desactivado })
    await obtenerDb().inscripcion.delete({
      where: { claseId_usuarioId: { claseId: e.claseId, usuarioId: deBaja } },
    })
    await desactivarUsuarioDePrueba(desactivado)

    const respuesta = await pedir(e.tokens.maestro, "GET", urlEntregas(e, tareaId))
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    const lista = listaEntregasRespuestaSchema.parse(respuesta.json())

    expect(lista.total).toBe(4)
    expect(lista.entregadas).toBe(3)
    const porAlumno = new Map(lista.entregas.map((fila) => [fila.alumno.id, fila]))
    expect([...porAlumno.keys()].sort()).toEqual(
      [e.alumno.id, e.otroAlumno.id, conRetraso, calificado].sort(),
    )
    expect(porAlumno.get(e.otroAlumno.id)).toEqual({
      alumno: { id: e.otroAlumno.id, nombre: expect.any(String) as string },
      estado: "asignado",
      fechaEntrega: null,
      conRetraso: false,
    })
    expect(porAlumno.get(e.alumno.id)).toMatchObject({ estado: "entregado", conRetraso: false })
    expect(porAlumno.get(conRetraso)).toMatchObject({ estado: "entregado", conRetraso: true })
    expect(porAlumno.get(calificado)).toMatchObject({ estado: "calificado" })
    const llaves = Object.keys(filaDeEntregaSchema.shape).sort()
    for (const fila of respuesta.json<{ entregas: Record<string, unknown>[] }>().entregas) {
      expect(Object.keys(fila).sort()).toEqual(llaves)
      expect(Object.keys(fila.alumno as object).sort()).toEqual(["id", "nombre"])
    }
    expect(respuesta.body).not.toMatch(/@|estadoPago|deudor|al_corriente|accesoRestringido/)
  })
})

describe("la entrega de un alumno (PR-1B21)", () => {
  it("PR-1B21: un inscrito sin fila responde asignado con version 0; con entrega, sus datos y su versión", async () => {
    const e = await escenario()
    const tareaId = await nuevaTarea(e)
    const sinFila = await pedir(e.tokens.maestro, "GET", urlEntregas(e, tareaId, `/${e.alumno.id}`))
    expect(sinFila.statusCode, sinFila.body).toBe(200)
    expect(entregaDeAlumnoRespuestaSchema.parse(sinFila.json()).entrega).toMatchObject({
      alumno: { id: e.alumno.id },
      estado: "asignado",
      fechaEntrega: null,
      conRetraso: false,
      enlaces: [],
      adjuntos: [],
      version: 0,
    })

    const archivo = await subir(e, tareaId, e.tokens.alumno)
    miEntregaDe(
      await entregarApi(e, tareaId, e.tokens.alumno, {
        archivoIds: [archivo.id],
        enlaces: ["https://ejemplo.com/x"],
      }),
    )
    for (const token of [e.tokens.maestro, e.tokens.admin]) {
      const conEntrega = await pedir(token, "GET", urlEntregas(e, tareaId, `/${e.alumno.id}`))
      expect(conEntrega.statusCode, conEntrega.body).toBe(200)
      const { entrega } = entregaDeAlumnoRespuestaSchema.parse(conEntrega.json())
      expect(entrega).toMatchObject({
        estado: "entregado",
        conRetraso: false,
        enlaces: ["https://ejemplo.com/x"],
        version: 1,
      })
      expect(entrega.adjuntos.map((a) => a.id)).toEqual([archivo.id])
      expect(conEntrega.body).not.toMatch(
        /@|estadoPago|deudor|al_corriente|accesoRestringido|claveObjeto/,
      )
    }
  })

  it("PR-1B21: de otra clase, dado de baja, desactivado, inexistente o un maestro como :alumnoId responden 404 ALUMNO_NO_ENCONTRADO", async () => {
    const e = await escenario()
    const otra = await escenario()
    const tareaId = await nuevaTarea(e)
    await crearEntregaDePrueba({ tareaId, alumnoId: e.otroAlumno.id })
    await obtenerDb().inscripcion.delete({
      where: { claseId_usuarioId: { claseId: e.claseId, usuarioId: e.otroAlumno.id } },
    })
    const desactivado = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Gil Desactivado" })
    await inscribirDePrueba(e.claseId, desactivado.id)
    await desactivarUsuarioDePrueba(desactivado.id)

    const cuerpos = new Set<string>()
    for (const alumnoId of [
      otra.alumno.id,
      e.otroAlumno.id,
      desactivado.id,
      randomUUID(),
      e.maestro.id,
    ]) {
      const respuesta = await pedir(
        e.tokens.maestro,
        "GET",
        urlEntregas(e, tareaId, `/${alumnoId}`),
      )
      expect(respuesta.statusCode, respuesta.body).toBe(404)
      expect(codigoDe(respuesta)).toBe("ALUMNO_NO_ENCONTRADO")
      cuerpos.add(respuesta.body)
    }
    expect(cuerpos.size).toBe(1)
  })

  it("PR-1B21: una tarea de otra clase responde 404 TAREA_NO_ENCONTRADA en la lista y en la entrega de un alumno", async () => {
    const e = await escenario()
    const otra = await escenario()
    const ajena = await nuevaTarea(otra)
    for (const url of [urlEntregas(e, ajena), urlEntregas(e, ajena, `/${e.alumno.id}`)]) {
      const respuesta = await pedir(e.tokens.maestro, "GET", url)
      expect(respuesta.statusCode, respuesta.body).toBe(404)
      expect(codigoDe(respuesta)).toBe("TAREA_NO_ENCONTRADA")
    }
  })
})
