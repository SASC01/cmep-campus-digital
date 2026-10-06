import { randomInt, randomUUID } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { join, sep } from "node:path"

import { errorApiSchema, listaClasesAdminRespuestaSchema } from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  buscarDatosDePertenencia,
  editarClase,
  leerClase,
  listarClasesAdmin,
  listarClasesImpartidas,
  listarClasesInscritas,
} from "../src/adapters/db/clases.js"
import { enTransaccion, obtenerDb, type Ejecutor } from "../src/adapters/db/cliente.js"
import { MENSAJE_SERVICIO_OCUPADO } from "../src/adapters/db/errores.js"
import { listarPersonas } from "../src/adapters/db/inscripciones.js"
import { listarComentarios, listarPublicaciones } from "../src/adapters/db/publicaciones.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { AppError } from "../src/core/errores.js"
import { borrarUsuariosDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  crearComentarioDePrueba,
  crearPublicacionDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"

// Ataque del Tester (FIX-CLASES, ronda 1; plan, "Rondas de ataque", puntos 1 a 6).
// Dos métodos deterministas, sin esperas por tiempo:
// - Tabla retenida (§D-4): una transacción toma una tabla en modo exclusivo con NOWAIT y reintento
//   acotado, la lectura se lanza y se forma detrás de esa tabla (comprobado en pg_locks contra el pid
//   de la retenedora y la marca application_name de este archivo), se cambia el dato y se confirma.
// - Ejecutor con gancho: un doble del ejecutor de Prisma que, después de una llamada concreta del
//   adaptador (por ejemplo, la lectura del cursor), cambia el dato por otra conexión antes de dejar
//   seguir a la siguiente sentencia. Sirve para fronteras que una tabla retenida no puede separar
//   (dos sentencias sobre la misma tabla).
// La app registra en nivel "error": los P2028 provocados a propósito (warn) no entran en el conteo
// de PA-07, y un 500 sí saldría ("Error no controlado" es nivel error).

const MARCA = `lecturas-fx-r1-${randomUUID().slice(0, 8)}`
const PRESUPUESTO_DE_REINTENTOS_MS = 60_000
const LIMITE_DE_FORMACION_MS = 4_000
const CONEXIONES_DEL_POOL = 10

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
let tokenAdmin = ""
let idAdmin = ""

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

beforeAll(async () => {
  // Antes de cualquier otra llamada a la base: la primera URL con que se inicializa el cliente gana.
  const env = cargarEnv()
  const url = new URL(env.DATABASE_URL)
  url.searchParams.set("application_name", MARCA)
  app = await construirApp({ env: { ...env, DATABASE_URL: url.toString(), LOG_LEVEL: "error" } })
  await app.ready()
  const [fila] = await obtenerDb().$queryRaw<
    { marca: string }[]
  >`SELECT current_setting('application_name') AS marca`
  if (fila?.marca !== MARCA) {
    throw new Error("Precondición: el pool de este archivo no lleva la marca application_name")
  }
  idAdmin = await idDelAdminDePrueba()
  tokenAdmin = await tokenDelAdminDePrueba()
}, 30_000)

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const ficha = (): string => randomUUID().slice(0, 8)

const maestro = (etiqueta: string): Promise<UsuarioDePrueba> =>
  crearAlumnoDePrueba(idsUsuarios, { nombre: `Maestro ${etiqueta} ${ficha()}`, rol: "maestro" })

const alumno = (etiqueta: string): Promise<UsuarioDePrueba> =>
  crearAlumnoDePrueba(idsUsuarios, { nombre: `Alumno ${etiqueta} ${ficha()}` })

// Fecha lejana y propia de este archivo (años 1970 a 1989, con milisegundos al azar): ninguna clase
// de otro archivo queda entre las del caso en la lista global del admin.
const fechaPropia = (): Date =>
  new Date(
    Date.UTC(
      1970 + randomInt(0, 20),
      randomInt(0, 12),
      randomInt(1, 28),
      randomInt(0, 24),
      randomInt(0, 60),
      randomInt(0, 60),
      randomInt(1, 999),
    ),
  )

const existeLaClase = async (id: string): Promise<boolean> =>
  (await obtenerDb().clase.count({ where: { id } })) === 1

type Resultado<T> = { ok: true; valor: T } | { ok: false; error: unknown }

const valorDe = <T>(resultado: Resultado<T>): T => {
  if (!resultado.ok) {
    throw new Error(`la lectura rechazó: ${String(resultado.error)}`, { cause: resultado.error })
  }
  return resultado.valor
}

const capturar = <T>(promesa: Promise<T>): Promise<Resultado<T>> =>
  promesa.then(
    (valor): Resultado<T> => ({ ok: true, valor }),
    (error: unknown): Resultado<T> => ({ ok: false, error }),
  )

// ---------------------------------------------------------------------------------------------
// Método 1: tabla retenida.

type TablaRetenible = "clases" | "maestros_de_clase" | "inscripciones" | "comentarios"
type Retenedora = Parameters<Parameters<ReturnType<typeof obtenerDb>["$transaction"]>[0]>[0]

const esBloqueoNoDisponible = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false
  // Solo se leen propiedades opcionales para clasificar el error: con @prisma/adapter-pg, un error
  // de PostgreSQL en $executeRaw llega como P2010 con el código original en meta.
  const conCodigo = error as Error & {
    code?: unknown
    meta?: { driverAdapterError?: { cause?: { originalCode?: unknown } } }
  }
  if (conCodigo.code === "55P03") return true
  if (conCodigo.meta?.driverAdapterError?.cause?.originalCode === "55P03") return true
  return /could not obtain lock on relation/i.test(error.message)
}

// La tabla va siempre literal, una rama por tabla; nunca interpolada.
const tomarTabla = async (tx: Retenedora, tabla: TablaRetenible): Promise<void> => {
  switch (tabla) {
    case "clases":
      await tx.$executeRaw`LOCK TABLE clases IN ACCESS EXCLUSIVE MODE NOWAIT`
      return
    case "maestros_de_clase":
      await tx.$executeRaw`LOCK TABLE maestros_de_clase IN ACCESS EXCLUSIVE MODE NOWAIT`
      return
    case "inscripciones":
      await tx.$executeRaw`LOCK TABLE inscripciones IN ACCESS EXCLUSIVE MODE NOWAIT`
      return
    case "comentarios":
      await tx.$executeRaw`LOCK TABLE comentarios IN ACCESS EXCLUSIVE MODE NOWAIT`
      return
  }
}

// Procesos de ESTE archivo (marca) que esperan esa tabla detrás de la retenedora pid.
const formadasEnLaTabla = async (tabla: TablaRetenible, pid: number): Promise<number> => {
  const [fila] = await obtenerDb().$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n
    FROM pg_locks l
    JOIN pg_class c ON c.oid = l.relation
    JOIN pg_stat_activity a ON a.pid = l.pid
    WHERE l.locktype = 'relation' AND NOT l.granted
      AND c.relnamespace = 'public'::regnamespace
      AND c.relname = ${tabla}
      AND a.application_name = ${MARCA}
      AND ${pid}::int = ANY(pg_blocking_pids(l.pid))`
  return fila?.n ?? 0
}

const conTablaRetenida = async <T>({
  tabla,
  lanzar,
  enLaRetenedora,
}: {
  tabla: TablaRetenible
  lanzar: () => Promise<T>
  enLaRetenedora: (tx: Retenedora) => Promise<void>
}): Promise<Resultado<T>> => {
  const inicio = Date.now()
  let intentos = 0
  for (;;) {
    intentos += 1
    let pendiente: Promise<Resultado<T>> | undefined
    let terminada = false
    try {
      await obtenerDb().$transaction(
        async (tx) => {
          await tomarTabla(tx, tabla)
          const [propia] = await tx.$queryRaw<
            { pid: number }[]
          >`SELECT pg_backend_pid()::int AS pid`
          if (!propia) throw new Error("Precondición: la retenedora no obtuvo su pid")
          // Nunca se devuelve esta promesa desde la transacción: la lectura espera a la tabla.
          pendiente = capturar(lanzar()).then((resultado) => {
            terminada = true
            return resultado
          })
          let formada = false
          const limite = Date.now() + LIMITE_DE_FORMACION_MS
          while (!formada && !terminada && Date.now() < limite) {
            formada = (await formadasEnLaTabla(tabla, propia.pid)) > 0
            if (!formada) await esperar(25)
          }
          expect(
            terminada && !formada,
            "Precondición: la lectura terminó sin esperar la tabla retenida",
          ).toBe(false)
          expect(
            formada,
            "Precondición: la lectura no quedó formada detrás de la tabla en 4 s",
          ).toBe(true)
          await enLaRetenedora(tx)
        },
        { timeout: 15_000, maxWait: 5_000 },
      )
    } catch (error) {
      if (!esBloqueoNoDisponible(error)) throw error
      if (Date.now() - inicio >= PRESUPUESTO_DE_REINTENTOS_MS) {
        throw new Error(
          `no se obtuvo el bloqueo de la tabla ${tabla} en 60 s (${String(intentos)} intentos)`,
          { cause: error },
        )
      }
      await esperar(20 + randomInt(0, 31))
      continue
    }
    if (!pendiente) throw new Error("Precondición: la lectura no se lanzó")
    return pendiente
  }
}

const borrarEnLaRetenedora =
  (claseId: string) =>
  async (tx: Retenedora): Promise<void> => {
    const { count } = await tx.clase.deleteMany({ where: { id: claseId } })
    expect(count, "Precondición: la retenedora borró la clase").toBe(1)
  }

// ---------------------------------------------------------------------------------------------
// Método 2: ejecutor con gancho (doble del ejecutor de Prisma).

// Se llama después de cada llamada de un modelo (por ejemplo, "clase.findUnique"), con la llamada
// ya resuelta y antes de devolver su resultado al adaptador.
type Gancho = (llamada: string) => Promise<void>
type Funcion = (...argumentos: unknown[]) => unknown

const conGancho = <T extends object>(objetivo: T, gancho: Gancho): T => {
  const envolverModelo = (modelo: string, delegado: object): object =>
    new Proxy(delegado, {
      get(destino, metodo) {
        const valor: unknown = Reflect.get(destino, metodo)
        if (typeof valor !== "function" || typeof metodo !== "string") return valor
        const original = valor as Funcion
        return async (...argumentos: unknown[]): Promise<unknown> => {
          const resultado: unknown = await original.apply(destino, argumentos)
          await gancho(`${modelo}.${metodo}`)
          return resultado
        }
      },
    })
  return new Proxy(objetivo, {
    get(destino, propiedad) {
      const valor: unknown = Reflect.get(destino, propiedad)
      if (propiedad === "$transaction" && typeof valor === "function") {
        const original = valor as Funcion
        return (fn: (tx: object) => Promise<unknown>, opciones?: unknown): unknown => {
          const envuelta = (tx: object): Promise<unknown> => fn(conGancho(tx, gancho))
          return opciones === undefined
            ? original.call(destino, envuelta)
            : original.call(destino, envuelta, opciones)
        }
      }
      if (
        typeof propiedad === "string" &&
        !propiedad.startsWith("$") &&
        typeof valor === "object" &&
        valor !== null
      ) {
        return envolverModelo(propiedad, valor)
      }
      return valor
    },
  })
}

// Un gancho que corre `accion` una sola vez, después de la primera `llamada` indicada.
const unaVezDespuesDe = (
  llamada: string,
  accion: () => Promise<void>,
): { gancho: Gancho; disparado: () => boolean } => {
  let disparado = false
  return {
    gancho: async (hecha) => {
      if (disparado || hecha !== llamada) return
      disparado = true
      await accion()
    },
    disparado: () => disparado,
  }
}

const ejecutorConGancho = (gancho: Gancho): Ejecutor => conGancho(obtenerDb(), gancho)

const borrarClaseFuera = (claseId: string) => async (): Promise<void> => {
  const { count } = await obtenerDb().clase.deleteMany({ where: { id: claseId } })
  expect(count, "Precondición: el gancho borró la clase").toBe(1)
}

// ---------------------------------------------------------------------------------------------

describe("ataque FIX-CLASES r1 (punto 1): la clase del cursor se borra entre su lectura y la página", () => {
  it("listarClasesAdmin: con la clase del cursor borrada después de leerla, la página trae las clases que siguen (nunca una página vacía con clases detrás)", async () => {
    const m = await maestro("cursor admin")
    const base = fechaPropia()
    const cursor = await crearClaseDePrueba(idsClases, {
      maestroId: m.id,
      nombre: `K ${ficha()}`,
      creadoEn: base,
    })
    const c = await crearClaseDePrueba(idsClases, {
      maestroId: m.id,
      nombre: `C ${ficha()}`,
      creadoEn: new Date(base.getTime() - 1_000),
    })
    const d = await crearClaseDePrueba(idsClases, {
      maestroId: m.id,
      nombre: `D ${ficha()}`,
      creadoEn: new Date(base.getTime() - 2_000),
    })
    const previa = await listarClasesAdmin({ cursor: cursor.id, limite: 2 })
    expect(
      previa.clases.map((x) => x.id),
      "Precondición: sin carrera, C y D siguen al cursor",
    ).toEqual([c.id, d.id])

    const { gancho, disparado } = unaVezDespuesDe("clase.findUnique", borrarClaseFuera(cursor.id))
    const resultado = await capturar(
      listarClasesAdmin({ cursor: cursor.id, limite: 2 }, ejecutorConGancho(gancho)),
    )
    expect(disparado(), "Precondición: el gancho corrió tras la lectura del cursor").toBe(true)
    expect(await existeLaClase(cursor.id)).toBe(false)
    if (!resultado.ok) {
      // También aceptable por el plan: 400 VALIDACION del cursor.
      expect(resultado.error).toBeInstanceOf(AppError)
      expect((resultado.error as AppError).estado).toBe(400)
      return
    }
    expect(resultado.valor.clases.map((x) => x.id)).toEqual([c.id, d.id])
    for (const clase of resultado.valor.clases) expect(clase.maestros).toHaveLength(1)
  }, 30_000)

  it("listarClasesInscritas: con la clase del cursor borrada después de leer la inscripción, la página trae las clases que siguen y el total es el de la misma instantánea", async () => {
    const m = await maestro("cursor inscritas")
    const estudiante = await alumno("cursor inscritas")
    const d = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `D ${ficha()}` })
    const c = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `C ${ficha()}` })
    const cursor = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `K ${ficha()}` })
    for (const clase of [d, c, cursor]) {
      await inscribirDePrueba(clase.id, estudiante.id)
      await esperar(5)
    }
    const previa = await listarClasesInscritas({
      usuarioId: estudiante.id,
      cursor: cursor.id,
      limite: 10,
    })
    expect(
      previa.clases.map((x) => x.id),
      "Precondición: orden de la inscripción",
    ).toEqual([c.id, d.id])

    const { gancho, disparado } = unaVezDespuesDe(
      "inscripcion.findUnique",
      borrarClaseFuera(cursor.id),
    )
    const resultado = await capturar(
      listarClasesInscritas(
        { usuarioId: estudiante.id, cursor: cursor.id, limite: 10 },
        ejecutorConGancho(gancho),
      ),
    )
    expect(disparado(), "Precondición: el gancho corrió tras la lectura del cursor").toBe(true)
    expect(await existeLaClase(cursor.id)).toBe(false)
    const lista = valorDe(resultado)
    expect(lista.clases.map((x) => x.id)).toEqual([c.id, d.id])
    expect(lista.total).toBe(3)
    for (const clase of lista.clases) expect(clase.maestros).toHaveLength(1)
  }, 30_000)

  it("listarClasesImpartidas: con la clase del cursor borrada después de leer la asignación, la página trae las clases que siguen y el total es el de la misma instantánea", async () => {
    const m = await maestro("cursor impartidas")
    const d = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `D ${ficha()}` })
    await esperar(5)
    const c = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `C ${ficha()}` })
    await esperar(5)
    const cursor = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `K ${ficha()}` })
    const previa = await listarClasesImpartidas({ maestroId: m.id, cursor: cursor.id, limite: 10 })
    expect(
      previa.clases.map((x) => x.id),
      "Precondición: orden de la asignación",
    ).toEqual([c.id, d.id])

    const { gancho, disparado } = unaVezDespuesDe(
      "maestroDeClase.findUnique",
      borrarClaseFuera(cursor.id),
    )
    const resultado = await capturar(
      listarClasesImpartidas(
        { maestroId: m.id, cursor: cursor.id, limite: 10 },
        ejecutorConGancho(gancho),
      ),
    )
    expect(disparado(), "Precondición: el gancho corrió tras la lectura del cursor").toBe(true)
    expect(await existeLaClase(cursor.id)).toBe(false)
    const lista = valorDe(resultado)
    expect(lista.clases.map((x) => x.id)).toEqual([c.id, d.id])
    expect(lista.total).toBe(3)
  }, 30_000)
})

// Control del método del gancho: la misma carrera, con la lectura anidada en una transacción READ
// COMMITTED (anidada, la opción se ignora), sí rompe. Así, los casos de arriba y de abajo en verde
// prueban la instantánea única y no un gancho que no hace nada.
describe("ataque FIX-CLASES r1 (control): sin la instantánea, el gancho reproduce el defecto", () => {
  it("control: listarClasesInscritas anidada en una transacción read committed, con la clase del cursor borrada tras leerla, devuelve la página vacía", async () => {
    const m = await maestro("control cursor")
    const estudiante = await alumno("control cursor")
    const d = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `D ${ficha()}` })
    const cursor = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `K ${ficha()}` })
    await inscribirDePrueba(d.id, estudiante.id)
    await esperar(5)
    await inscribirDePrueba(cursor.id, estudiante.id)
    const { gancho, disparado } = unaVezDespuesDe(
      "inscripcion.findUnique",
      borrarClaseFuera(cursor.id),
    )
    const lista = await enTransaccion(ejecutorConGancho(gancho), (tx) =>
      listarClasesInscritas({ usuarioId: estudiante.id, cursor: cursor.id, limite: 10 }, tx),
    )
    expect(disparado(), "Precondición: el gancho corrió tras la lectura del cursor").toBe(true)
    expect(lista.clases).toEqual([])
  }, 30_000)

  it("control: listarClasesImpartidas anidada en una transacción read committed, con una clase borrada tras la página, da un total distinto del de la página", async () => {
    const m = await maestro("control total")
    const primera = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `1 ${ficha()}` })
    await esperar(5)
    const segunda = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `2 ${ficha()}` })
    const { gancho, disparado } = unaVezDespuesDe(
      "maestroDeClase.findMany",
      borrarClaseFuera(segunda.id),
    )
    const lista = await enTransaccion(ejecutorConGancho(gancho), (tx) =>
      listarClasesImpartidas({ maestroId: m.id, cursor: undefined, limite: 10 }, tx),
    )
    expect(disparado(), "Precondición: el gancho corrió tras la página").toBe(true)
    expect(lista.clases.map((x) => x.id)).toEqual([segunda.id, primera.id])
    expect(lista.total).toBe(1)
  }, 30_000)
})

describe("ataque FIX-CLASES r1 (punto 1): la clase se borra entre la página y el total", () => {
  it("listarClasesInscritas: el total sale de la misma instantánea que la página (2 clases, 2 de total)", async () => {
    const m = await maestro("total inscritas")
    const estudiante = await alumno("total inscritas")
    const primera = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `1 ${ficha()}` })
    const segunda = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `2 ${ficha()}` })
    await inscribirDePrueba(primera.id, estudiante.id)
    await esperar(5)
    await inscribirDePrueba(segunda.id, estudiante.id)

    const { gancho, disparado } = unaVezDespuesDe(
      "inscripcion.findMany",
      borrarClaseFuera(segunda.id),
    )
    const lista = valorDe(
      await capturar(
        listarClasesInscritas(
          { usuarioId: estudiante.id, cursor: undefined, limite: 10 },
          ejecutorConGancho(gancho),
        ),
      ),
    )
    expect(disparado(), "Precondición: el gancho corrió tras la página").toBe(true)
    expect(await existeLaClase(segunda.id)).toBe(false)
    expect(lista.clases.map((x) => x.id)).toEqual([segunda.id, primera.id])
    expect(lista.total).toBe(lista.clases.length)
  }, 30_000)

  it("listarClasesImpartidas: el total sale de la misma instantánea que la página (2 clases, 2 de total)", async () => {
    const m = await maestro("total impartidas")
    const primera = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `1 ${ficha()}` })
    await esperar(5)
    const segunda = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `2 ${ficha()}` })

    const { gancho, disparado } = unaVezDespuesDe(
      "maestroDeClase.findMany",
      borrarClaseFuera(segunda.id),
    )
    const lista = valorDe(
      await capturar(
        listarClasesImpartidas(
          { maestroId: m.id, cursor: undefined, limite: 10 },
          ejecutorConGancho(gancho),
        ),
      ),
    )
    expect(disparado(), "Precondición: el gancho corrió tras la página").toBe(true)
    expect(await existeLaClase(segunda.id)).toBe(false)
    expect(lista.clases.map((x) => x.id)).toEqual([segunda.id, primera.id])
    expect(lista.total).toBe(lista.clases.length)
  }, 30_000)
})

describe("ataque FIX-CLASES r1 (punto 1): otras fronteras con tabla retenida, por HTTP", () => {
  const pedirLista = (cursor: string) =>
    obtenerApp().inject({
      method: "GET",
      url: `/api/admin/clases?cursor=${cursor}&limite=1`,
      headers: { authorization: `Bearer ${tokenAdmin}` },
    })

  const centinelaYClase = async (
    maestroIds: [string] | [string, string],
  ): Promise<{ cursor: string; clase: string }> => {
    const base = fechaPropia()
    const [principal] = maestroIds
    const centinela = await crearClaseDePrueba(idsClases, {
      maestroId: principal,
      nombre: `K ${ficha()}`,
      creadoEn: base,
    })
    const clase = await crearClaseDePrueba(idsClases, {
      maestroId: principal,
      maestroIds,
      nombre: `C ${ficha()}`,
      creadoEn: new Date(base.getTime() - 1_000),
    })
    const previa = await pedirLista(centinela.id)
    expect(previa.statusCode, "Precondición: sin retención, 200").toBe(200)
    expect(listaClasesAdminRespuestaSchema.parse(previa.json()).clases[0]?.id).toBe(clase.id)
    return { cursor: centinela.id, clase: clase.id }
  }

  it("GET /api/admin/clases con la clase borrada entre la página y el conteo de alumnos (inscripciones retenida): 200 con sus maestros y sus 2 alumnos", async () => {
    const a = await maestro("conteo")
    const { cursor, clase } = await centinelaYClase([a.id])
    for (const etiqueta of ["uno", "dos"])
      await inscribirDePrueba(clase, (await alumno(etiqueta)).id)

    const respuesta = valorDe(
      await conTablaRetenida({
        tabla: "inscripciones",
        lanzar: () => pedirLista(cursor),
        enLaRetenedora: borrarEnLaRetenedora(clase),
      }),
    )
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    const [primera] = listaClasesAdminRespuestaSchema.parse(respuesta.json()).clases
    expect(primera).toMatchObject({ id: clase, alumnos: 2 })
    expect(primera?.maestros.map((x) => x.id)).toEqual([a.id])
    expect(await existeLaClase(clase)).toBe(false)
  }, 75_000)

  it("GET /api/admin/clases con los maestros reasignados mientras la página espera a sus maestros (de [A] a [B]): 200 con exactamente un maestro, el de la instantánea", async () => {
    const a = await maestro("A")
    const b = await maestro("B")
    const { cursor, clase } = await centinelaYClase([a.id])
    const respuesta = valorDe(
      await conTablaRetenida({
        tabla: "maestros_de_clase",
        lanzar: () => pedirLista(cursor),
        enLaRetenedora: async (tx) => {
          await tx.maestroDeClase.create({ data: { claseId: clase, maestroId: b.id } })
          await tx.maestroDeClase.deleteMany({ where: { claseId: clase, maestroId: a.id } })
        },
      }),
    )
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    const [primera] = listaClasesAdminRespuestaSchema.parse(respuesta.json()).clases
    expect(primera?.id).toBe(clase)
    expect(primera?.maestros.map((x) => x.id)).toEqual([a.id])
  }, 75_000)

  it("GET /api/admin/clases con dos maestros, uno retirado y otro asignado mientras la página espera (de [A, B] a [B, C]): 200 con dos maestros, nunca tres", async () => {
    const a = await maestro("A")
    const b = await maestro("B")
    const c = await maestro("C")
    const { cursor, clase } = await centinelaYClase([a.id, b.id])
    const respuesta = valorDe(
      await conTablaRetenida({
        tabla: "maestros_de_clase",
        lanzar: () => pedirLista(cursor),
        enLaRetenedora: async (tx) => {
          await tx.maestroDeClase.deleteMany({ where: { claseId: clase, maestroId: a.id } })
          await tx.maestroDeClase.create({ data: { claseId: clase, maestroId: c.id } })
        },
      }),
    )
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    const [primera] = listaClasesAdminRespuestaSchema.parse(respuesta.json()).clases
    expect(primera?.id).toBe(clase)
    expect([...(primera?.maestros.map((x) => x.id) ?? [])].sort()).toEqual([a.id, b.id].sort())
  }, 75_000)

  it("listarClasesInscritas con dos maestros y la clase borrada entre la clase y sus maestros: los dos maestros, en el orden de la asignación", async () => {
    const a = await maestro("A")
    const b = await maestro("B")
    const estudiante = await alumno("dos maestros")
    const clase = await crearClaseDePrueba(idsClases, {
      maestroId: a.id,
      maestroIds: [a.id, b.id],
      nombre: `C ${ficha()}`,
    })
    await inscribirDePrueba(clase.id, estudiante.id)
    const nombres = await obtenerDb().usuario.findMany({
      where: { id: { in: [a.id, b.id] } },
      select: { id: true, nombre: true },
      orderBy: { id: "asc" },
    })
    const lista = valorDe(
      await conTablaRetenida({
        tabla: "maestros_de_clase",
        lanzar: () =>
          listarClasesInscritas({ usuarioId: estudiante.id, cursor: undefined, limite: 10 }),
        enLaRetenedora: borrarEnLaRetenedora(clase.id),
      }),
    )
    expect(lista.clases.map((x) => x.id)).toEqual([clase.id])
    expect(lista.clases[0]?.maestros).toEqual(nombres.map((n) => ({ nombre: n.nombre })))
    expect(await existeLaClase(clase.id)).toBe(false)
  }, 75_000)
})

describe("ataque FIX-CLASES r1 (punto 2): editar la clase mientras se borra", () => {
  it("editarClase con la clase borrada entre la actualización y la relectura devuelve null (403 en la ruta), sin lanzar", async () => {
    const m = await maestro("editar")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `E ${ficha()}` })
    const { gancho, disparado } = unaVezDespuesDe("clase.updateMany", borrarClaseFuera(clase.id))
    const resultado = await capturar(
      editarClase({ claseId: clase.id, nombre: "Nombre nuevo" }, ejecutorConGancho(gancho)),
    )
    expect(disparado(), "Precondición: el gancho corrió tras la actualización").toBe(true)
    expect(valorDe(resultado)).toBeNull()
  }, 30_000)

  it("PUT /api/admin/clases/:claseId y GET /api/clases/:claseId (admin) con la clase borrada mientras el sexto paso espera a sus maestros: 403 SIN_ACCESO_A_LA_CLASE o 200, nunca 500", async () => {
    const m = await maestro("editar http")
    for (const metodo of ["PUT", "GET"] as const) {
      const clase = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `E ${ficha()}` })
      const pedir = () =>
        metodo === "PUT"
          ? obtenerApp().inject({
              method: "PUT",
              url: `/api/admin/clases/${clase.id}`,
              headers: { authorization: `Bearer ${tokenAdmin}` },
              payload: { nombre: "Nombre nuevo" },
            })
          : obtenerApp().inject({
              method: "GET",
              url: `/api/clases/${clase.id}`,
              headers: { authorization: `Bearer ${tokenAdmin}` },
            })
      const respuesta = valorDe(
        await conTablaRetenida({
          tabla: "maestros_de_clase",
          lanzar: pedir,
          enLaRetenedora: borrarEnLaRetenedora(clase.id),
        }),
      )
      expect([200, 403], `${metodo}: ${respuesta.body}`).toContain(respuesta.statusCode)
      if (respuesta.statusCode === 403) {
        expect(errorApiSchema.parse(respuesta.json()).error.codigo).toBe("SIN_ACCESO_A_LA_CLASE")
      }
      expect(await existeLaClase(clase.id)).toBe(false)
    }
  }, 120_000)
})

describe("ataque FIX-CLASES r1 (punto 3): aislamiento", () => {
  const nivelesConBarrera = async (
    opciones: { instantaneaUnica?: true; maxWait: number },
    n: number,
  ): Promise<{ niveles: string[]; todasDentro: boolean }> => {
    let dentro = 0
    let abrir: () => void = () => undefined
    const barrera = new Promise<void>((resolver) => {
      abrir = resolver
    })
    const resultados = await Promise.all(
      Array.from({ length: n }, () =>
        enTransaccion(
          obtenerDb(),
          async (tx) => {
            const [fila] = await tx.$queryRaw<
              { nivel: string }[]
            >`SELECT current_setting('transaction_isolation') AS nivel`
            dentro += 1
            if (dentro === n) abrir()
            await Promise.race([barrera, esperar(4_000)])
            return { nivel: fila?.nivel ?? "sin nivel", completa: dentro === n }
          },
          opciones,
        ),
      ),
    )
    return {
      niveles: resultados.map((r) => r.nivel),
      todasDentro: resultados.every((r) => r.completa),
    }
  }

  it("después de usar las 10 conexiones del pool en repeatable read (también por las cuatro lecturas reales), una transacción sin opciones sigue en read committed en cada una de las 10", async () => {
    const m = await maestro("aislamiento")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `I ${ficha()}` })
    await Promise.all(
      Array.from({ length: CONEXIONES_DEL_POOL }, (_, i) => {
        switch (i % 4) {
          case 0:
            return listarClasesAdmin({ cursor: undefined, limite: 1 })
          case 1:
            return listarClasesImpartidas({ maestroId: m.id, cursor: undefined, limite: 1 })
          case 2:
            return listarClasesInscritas({ usuarioId: m.id, cursor: undefined, limite: 1 })
          default:
            return leerClase(clase.id)
        }
      }),
    )
    const rr = await nivelesConBarrera(
      { instantaneaUnica: true, maxWait: 4_000 },
      CONEXIONES_DEL_POOL,
    )
    expect(rr.todasDentro, "Precondición: las 10 transacciones estuvieron abiertas a la vez").toBe(
      true,
    )
    expect(new Set(rr.niveles)).toEqual(new Set(["repeatable read"]))

    const rc = await nivelesConBarrera({ maxWait: 4_000 }, CONEXIONES_DEL_POOL)
    expect(rc.todasDentro, "Precondición: las 10 transacciones estuvieron abiertas a la vez").toBe(
      true,
    )
    expect(rc.niveles).toEqual(Array.from({ length: CONEXIONES_DEL_POOL }, () => "read committed"))
  }, 60_000)

  it("la opción solo se puede activar dentro de adapters/db: ningún archivo fuera de adapters/db nombra enTransaccion, instantaneaUnica o isolationLevel, index.ts no reexporta enTransaccion, isolationLevel solo vive en cliente.ts y la opción solo se pide en las seis lecturas (cuatro de clases y dos del muro)", () => {
    const raiz = join(import.meta.dirname, "..", "src")
    const archivos = readdirSync(raiz, { recursive: true, encoding: "utf8" })
      .map((ruta) => ruta.split(sep).join("/"))
      .filter((ruta) => /\.(ts|mts|cts|js|mjs)$/.test(ruta))
      .filter((ruta) => !ruta.endsWith(".test.ts"))
      .filter((ruta) => !ruta.startsWith("adapters/db/generated/"))
    expect(archivos.length, "Precondición: se leyeron los archivos de src").toBeGreaterThan(50)
    const fuera: string[] = []
    const nivel: string[] = []
    for (const ruta of archivos) {
      const texto = readFileSync(join(raiz, ruta), "utf8")
      const enDb = ruta.startsWith("adapters/db/")
      // Un import de tipos de cliente.ts (EjecutorSql en adapters/queue) no da acceso a la opción.
      if (!enDb && /\benTransaccion\b|instantaneaUnica|isolationLevel|RepeatableRead/.test(texto))
        fuera.push(ruta)
      if (/isolationLevel|RepeatableRead|REPEATABLE READ|Serializable/.test(texto)) nivel.push(ruta)
    }
    expect(fuera).toEqual([])
    expect(nivel).toEqual(["adapters/db/cliente.ts"])
    const indice = readFileSync(join(raiz, "adapters/db/index.ts"), "utf8")
    expect(indice).not.toMatch(/enTransaccion/)
    const usos = archivos
      .filter((ruta) => ruta.startsWith("adapters/db/"))
      .flatMap((ruta) => {
        const n = (readFileSync(join(raiz, ruta), "utf8").match(/instantaneaUnica: true/g) ?? [])
          .length
        return n === 0 ? [] : [`${ruta}:${String(n)}`]
      })
    // C-2, Enmienda 1 de FIX-CLASES (§D-5, V-04): además de las cuatro lecturas de clases.ts,
    // listarPublicaciones y listarComentarios de publicaciones.ts corren en la instantánea única.
    expect([...usos].sort()).toEqual(["adapters/db/clases.ts:4", "adapters/db/publicaciones.ts:2"])
  })
})

describe("ataque FIX-CLASES r1 (punto 4): con el pool lleno, 503 SERVICIO_OCUPADO y nunca 500", () => {
  const ocuparPool = async (
    n: number,
  ): Promise<{ liberar: () => Promise<void>; terminadas: Promise<unknown> }> => {
    let abrir: () => void = () => undefined
    const compuerta = new Promise<void>((resolver) => {
      abrir = resolver
    })
    let dentro = 0
    const transacciones = Array.from({ length: n }, () =>
      obtenerDb().$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT 1`
          dentro += 1
          await compuerta
        },
        { maxWait: 10_000, timeout: 30_000 },
      ),
    )
    const limite = Date.now() + 10_000
    while (dentro < n && Date.now() < limite) await esperar(20)
    expect(dentro, `Precondición: las ${String(n)} transacciones no abrieron en 10 s`).toBe(n)
    const terminadas = Promise.all(transacciones)
    return {
      liberar: async () => {
        abrir()
        await terminadas
      },
      terminadas,
    }
  }

  const poolCompleto = async (n: number): Promise<boolean> => {
    let dentro = 0
    let abrir: () => void = () => undefined
    const barrera = new Promise<void>((resolver) => {
      abrir = resolver
    })
    const resultados = await Promise.allSettled(
      Array.from({ length: n }, () =>
        obtenerDb().$transaction(
          async (tx) => {
            await tx.$queryRaw`SELECT 1`
            dentro += 1
            if (dentro === n) abrir()
            await Promise.race([barrera, esperar(4_000)])
            return dentro === n
          },
          { maxWait: 4_000, timeout: 10_000 },
        ),
      ),
    )
    return resultados.every((r) => r.status === "fulfilled" && r.value === true)
  }

  it("las cuatro lecturas rechazan con AppError 503 SERVICIO_OCUPADO (causa P2028) en menos de 4.5 s, el pool conserva sus 10 conexiones y después responden", async () => {
    const m = await maestro("pool")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `P ${ficha()}` })
    const lecturas: [string, () => Promise<unknown>][] = [
      ["listarClasesAdmin", () => listarClasesAdmin({ cursor: undefined, limite: 1 })],
      [
        "listarClasesInscritas",
        () => listarClasesInscritas({ usuarioId: m.id, cursor: undefined, limite: 1 }),
      ],
      [
        "listarClasesImpartidas",
        () => listarClasesImpartidas({ maestroId: m.id, cursor: undefined, limite: 1 }),
      ],
      ["leerClase", () => leerClase(clase.id)],
    ]
    const vistos: Record<string, unknown> = {}
    for (const [nombre, leer] of lecturas) {
      const ocupado = await ocuparPool(CONEXIONES_DEL_POOL)
      const inicio = Date.now()
      const resultado = await capturar(leer())
      const tardo = Date.now() - inicio
      await ocupado.liberar()
      const error = resultado.ok ? undefined : resultado.error
      vistos[nombre] = {
        esAppError: error instanceof AppError,
        codigo: error instanceof AppError ? error.codigo : String(error),
        estado: error instanceof AppError ? error.estado : undefined,
        mensaje: error instanceof AppError ? error.message : undefined,
        causa: (error as { cause?: { code?: unknown } } | undefined)?.cause?.code,
        rapido: tardo < 4_500,
      }
      expect(await poolCompleto(CONEXIONES_DEL_POOL), `${nombre}: se perdió una conexión`).toBe(
        true,
      )
      expect((await capturar(leer())).ok, `${nombre}: después del pool lleno responde`).toBe(true)
    }
    const esperado = {
      esAppError: true,
      codigo: "SERVICIO_OCUPADO",
      estado: 503,
      mensaje: MENSAJE_SERVICIO_OCUPADO,
      causa: "P2028",
      rapido: true,
    }
    expect(vistos).toEqual(Object.fromEntries(lecturas.map(([nombre]) => [nombre, esperado])))
  }, 90_000)

  it("GET /api/admin/clases lanzada con el pool lleno y liberada a los 2.5 s: 200 o 503, nunca 500", async () => {
    const ocupado = await ocuparPool(CONEXIONES_DEL_POOL)
    const pendiente = obtenerApp().inject({
      method: "GET",
      url: "/api/admin/clases?limite=1",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    })
    await esperar(2_500)
    await ocupado.liberar()
    const respuesta = await pendiente
    expect([200, 503], respuesta.body).toContain(respuesta.statusCode)
    if (respuesta.statusCode === 200) listaClasesAdminRespuestaSchema.parse(respuesta.json())
  }, 30_000)
})

describe("ataque FIX-CLASES r1 (punto 5): las lecturas que el inventario declaró 'no aplica'", () => {
  it("listarPersonas con la clase borrada mientras espera a sus maestros: resuelve (null o la clase con 1 a 2 maestros), sin lanzar", async () => {
    const m = await maestro("personas")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `P ${ficha()}` })
    await inscribirDePrueba(clase.id, (await alumno("personas")).id)
    const personas = valorDe(
      await conTablaRetenida({
        tabla: "maestros_de_clase",
        lanzar: () => listarPersonas({ claseId: clase.id, cursor: undefined, limite: 10 }),
        enLaRetenedora: borrarEnLaRetenedora(clase.id),
      }),
    )
    if (personas !== null) expect(personas.maestros.length).toBeGreaterThanOrEqual(1)
    expect(await existeLaClase(clase.id)).toBe(false)
  }, 75_000)

  it("sexto paso (buscarDatosDePertenencia) con la clase borrada mientras espera a sus maestros: resuelve sin lanzar y no concede nada", async () => {
    const m = await maestro("sexto")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `S ${ficha()}` })
    const datos = valorDe(
      await conTablaRetenida({
        tabla: "maestros_de_clase",
        lanzar: () => buscarDatosDePertenencia(clase.id, m.id),
        enLaRetenedora: borrarEnLaRetenedora(clase.id),
      }),
    )
    expect(datos === null || (!datos.esMaestro && !datos.inscrito)).toBe(true)
  }, 75_000)

  it("listarPublicaciones con la clase borrada mientras espera los conteos de comentarios: resuelve sin lanzar", async () => {
    const m = await maestro("muro")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `M ${ficha()}` })
    const publicacion = await crearPublicacionDePrueba({ claseId: clase.id, autorId: m.id })
    await crearComentarioDePrueba({ publicacionId: publicacion, autorId: m.id })
    const lista = valorDe(
      await conTablaRetenida({
        tabla: "comentarios",
        lanzar: () =>
          listarPublicaciones({
            claseId: clase.id,
            cursor: undefined,
            limite: 10,
            actor: { id: idAdmin, rol: "admin" },
          }),
        enLaRetenedora: borrarEnLaRetenedora(clase.id),
      }),
    )
    for (const p of lista.publicaciones) expect(p.comentarios).toBeGreaterThanOrEqual(0)
    expect(await existeLaClase(clase.id)).toBe(false)
  }, 75_000)

  it("listarComentarios con la clase borrada entre la lectura de la publicación y la página: resuelve sin lanzar", async () => {
    const m = await maestro("hilo")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `H ${ficha()}` })
    const publicacion = await crearPublicacionDePrueba({ claseId: clase.id, autorId: m.id })
    await crearComentarioDePrueba({ publicacionId: publicacion, autorId: m.id })
    const { gancho, disparado } = unaVezDespuesDe(
      "publicacion.findFirst",
      borrarClaseFuera(clase.id),
    )
    const resultado = await capturar(
      listarComentarios(
        {
          claseId: clase.id,
          publicacionId: publicacion,
          cursor: undefined,
          limite: 10,
          actor: { id: idAdmin, rol: "admin" },
        },
        ejecutorConGancho(gancho),
      ),
    )
    expect(disparado(), "Precondición: el gancho corrió tras leer la publicación").toBe(true)
    expect(resultado.ok, String(resultado.ok ? "" : resultado.error)).toBe(true)
  }, 30_000)

  // Estado vecino "entre el cursor y la página" de las dos listas del muro: la misma frontera que
  // FIX-CLASES cerró en las listas de clases y que la regla T-18 de CLASES prohíbe resolver con una
  // página vacía. Aquí lo que se borra es la publicación o el comentario del cursor, una operación
  // normal de su autor (DELETE …/publicaciones/:id y …/comentarios/:id).
  it("listarPublicaciones: con la publicación del cursor borrada después de leerla, devuelve 400 o las publicaciones que siguen, nunca una página vacía con publicaciones detrás", async () => {
    const m = await maestro("cursor muro")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `CM ${ficha()}` })
    const ahora = Date.now()
    const ids: string[] = []
    for (let i = 4; i >= 1; i -= 1) {
      ids.push(
        await crearPublicacionDePrueba({
          claseId: clase.id,
          autorId: m.id,
          texto: `P${String(i)}`,
          creadoEn: new Date(ahora - i * 60_000),
        }),
      )
    }
    // ids en orden de creación: P4 (la más antigua) … P1 (la más reciente). La lista va de la más
    // reciente a la más antigua: P1, P2, P3, P4. Cursor: P2; siguen P3 y P4.
    const [p4, p3, p2] = ids
    if (p4 === undefined || p3 === undefined || p2 === undefined)
      throw new Error("Precondición: se crearon las cuatro publicaciones")
    const actor = { id: idAdmin, rol: "admin" as const }
    const previa = await listarPublicaciones({ claseId: clase.id, cursor: p2, limite: 10, actor })
    expect(
      previa.publicaciones.map((p) => p.id),
      "Precondición: sin carrera",
    ).toEqual([p3, p4])

    const { gancho, disparado } = unaVezDespuesDe("publicacion.findFirst", async () => {
      const { count } = await obtenerDb().publicacion.deleteMany({ where: { id: p2 } })
      expect(count, "Precondición: el gancho borró la publicación del cursor").toBe(1)
    })
    const resultado = await capturar(
      listarPublicaciones(
        { claseId: clase.id, cursor: p2, limite: 10, actor },
        ejecutorConGancho(gancho),
      ),
    )
    expect(disparado(), "Precondición: el gancho corrió tras la lectura del cursor").toBe(true)
    if (!resultado.ok) {
      expect(resultado.error).toBeInstanceOf(AppError)
      expect((resultado.error as AppError).estado).toBe(400)
      return
    }
    expect(resultado.valor.publicaciones.map((p) => p.id)).toEqual([p3, p4])
  }, 30_000)

  it("listarComentarios: con el comentario del cursor borrado después de leerlo, devuelve 400 o los comentarios que siguen, nunca una página vacía con comentarios detrás", async () => {
    const m = await maestro("cursor hilo")
    const clase = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre: `CH ${ficha()}` })
    const publicacion = await crearPublicacionDePrueba({ claseId: clase.id, autorId: m.id })
    const ahora = Date.now()
    const ids: string[] = []
    for (let i = 1; i <= 4; i += 1) {
      ids.push(
        await crearComentarioDePrueba({
          publicacionId: publicacion,
          autorId: m.id,
          texto: `K${String(i)}`,
          creadoEn: new Date(ahora - (5 - i) * 60_000),
        }),
      )
    }
    // Los comentarios van del más antiguo al más reciente: K1, K2, K3, K4. Cursor: K2.
    const [, k2, k3, k4] = ids
    if (k2 === undefined || k3 === undefined || k4 === undefined)
      throw new Error("Precondición: se crearon los cuatro comentarios")
    const actor = { id: idAdmin, rol: "admin" as const }
    const parametros = {
      claseId: clase.id,
      publicacionId: publicacion,
      cursor: k2,
      limite: 10,
      actor,
    }
    const previa = await listarComentarios(parametros)
    expect(
      previa?.comentarios.map((c) => c.id),
      "Precondición: sin carrera",
    ).toEqual([k3, k4])

    const { gancho, disparado } = unaVezDespuesDe("comentario.findFirst", async () => {
      const { count } = await obtenerDb().comentario.deleteMany({ where: { id: k2 } })
      expect(count, "Precondición: el gancho borró el comentario del cursor").toBe(1)
    })
    const resultado = await capturar(listarComentarios(parametros, ejecutorConGancho(gancho)))
    expect(disparado(), "Precondición: el gancho corrió tras la lectura del cursor").toBe(true)
    if (!resultado.ok) {
      expect(resultado.error).toBeInstanceOf(AppError)
      expect((resultado.error as AppError).estado).toBe(400)
      return
    }
    expect(resultado.valor?.comentarios.map((c) => c.id)).toEqual([k3, k4])
  }, 30_000)
})

describe("ataque FIX-CLASES r1 (punto 6): ninguna escritura dentro de la instantánea", () => {
  it("las cuatro lecturas usan instantaneaUnica y su cuerpo no tiene create, update, upsert, delete ni SQL de escritura", () => {
    const texto = readFileSync(
      join(import.meta.dirname, "..", "src", "adapters", "db", "clases.ts"),
      "utf8",
    )
    const cuerpos = [
      "leerClase",
      "listarClasesImpartidas",
      "listarClasesInscritas",
      "listarClasesAdmin",
    ]
    const hallazgos: string[] = []
    for (const nombre of cuerpos) {
      const inicio = texto.indexOf(`export const ${nombre} =`)
      expect(inicio, `Precondición: ${nombre} existe`).toBeGreaterThanOrEqual(0)
      const siguiente = texto.indexOf("\nexport ", inicio + 1)
      const cuerpo = texto.slice(inicio, siguiente === -1 ? undefined : siguiente)
      if (!cuerpo.includes("instantaneaUnica: true"))
        hallazgos.push(`${nombre}: sin instantaneaUnica`)
      const escritura = cuerpo.match(
        /\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(|\$executeRaw|\$queryRawUnsafe|FOR (UPDATE|SHARE|NO KEY)/,
      )
      if (escritura) hallazgos.push(`${nombre}: ${escritura[0]}`)
    }
    expect(hallazgos).toEqual([])
  })
})
