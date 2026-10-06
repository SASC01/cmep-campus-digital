import { randomInt, randomUUID } from "node:crypto"

import { claseAdminSchema, listaClasesAdminRespuestaSchema } from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { enTransaccion, obtenerDb, type Ejecutor } from "../src/adapters/db/cliente.js"
import {
  leerClase,
  listarClasesImpartidas,
  listarClasesInscritas,
} from "../src/adapters/db/clases.js"
import {
  borrarComentario,
  borrarPublicacion,
  listarComentarios,
  listarPublicaciones,
} from "../src/adapters/db/publicaciones.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import type { ParticipanteDeAutoria } from "../src/core/autoria.js"
import { AppError } from "../src/core/errores.js"
import { borrarUsuariosDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearComentarioDePrueba,
  crearPublicacionDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"

// FIX-CLASES (PR-FX-01 a PR-FX-05). Una lectura con relaciones anidadas manda una sentencia por
// nivel (sin la vista previa relationJoins de Prisma); si la clase se borra entre dos, la respuesta
// queda incompleta. Cada caso reproduce esa carrera de forma determinista (plan, §D-4): una
// transacción retenedora toma la tabla del primer hijo con el modo más fuerte (única forma de hacer
// esperar a un SELECT), la lectura se lanza ya con la tabla tomada y se forma detrás de ella, se
// borra la clase y la retenedora confirma. La lectura solo reanuda después de ese borrado.

const MARCA = `lecturas-fx-${randomUUID().slice(0, 8)}`
const PRESUPUESTO_DE_REINTENTOS_MS = 60_000
const LIMITE_DE_FORMACION_MS = 4_000

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

beforeAll(async () => {
  // Antes de cualquier otra llamada a la base: la primera URL con que se inicializa el cliente gana.
  // Solo marca las conexiones de este archivo (cada archivo tiene su propio cliente).
  const env = cargarEnv()
  const url = new URL(env.DATABASE_URL)
  url.searchParams.set("application_name", MARCA)
  app = await construirApp({ env: { ...env, DATABASE_URL: url.toString() } })
  await app.ready()
  const [fila] = await obtenerDb().$queryRaw<
    { marca: string }[]
  >`SELECT current_setting('application_name') AS marca`
  if (fila?.marca !== MARCA) {
    throw new Error("Precondición: el pool de este archivo no lleva la marca application_name")
  }
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

type Resultado<T> = { ok: true; valor: T } | { ok: false; error: unknown }

const esBloqueoNoDisponible = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false
  // Solo se leen propiedades opcionales para clasificar el error; con @prisma/adapter-pg un error de
  // PostgreSQL en $executeRaw llega como P2010 con el código original en meta.
  const conCodigo = error as Error & {
    code?: unknown
    meta?: { driverAdapterError?: { cause?: { originalCode?: unknown } } }
  }
  if (conCodigo.code === "55P03") return true
  if (conCodigo.meta?.driverAdapterError?.cause?.originalCode === "55P03") return true
  return /could not obtain lock on relation/i.test(error.message)
}

// Procesos de ESTE archivo (por la marca) que esperan la tabla dada, detrás de la retenedora pid:
// la misma idea que formadasDetrasDe para filas, aplicada a una tabla. Se consulta fuera de la
// retenedora (otra conexión).
const formadasEnLaTabla = async (tabla: string, pid: number): Promise<number> => {
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

// Retiene la tabla, lanza la lectura, espera a que quede formada detrás de la tabla, borra la clase
// y confirma. Devuelve lo que la lectura terminó dando (o el error que lanzó).
const leerConLaClaseBorradaEnMedio = async <T>({
  tabla,
  claseId,
  lanzar,
}: {
  tabla: "clases" | "maestros_de_clase"
  claseId: string
  lanzar: () => Promise<T>
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
          if (tabla === "clases") {
            await tx.$executeRaw`LOCK TABLE clases IN ACCESS EXCLUSIVE MODE NOWAIT`
          } else {
            await tx.$executeRaw`LOCK TABLE maestros_de_clase IN ACCESS EXCLUSIVE MODE NOWAIT`
          }
          const [propia] = await tx.$queryRaw<
            { pid: number }[]
          >`SELECT pg_backend_pid()::int AS pid`
          if (!propia) throw new Error("Precondición: la retenedora no obtuvo su pid")

          // Nunca se devuelve esta promesa desde la función de la transacción: la lectura espera a
          // la tabla y Prisma esperaría a la lectura antes de confirmar.
          pendiente = lanzar().then(
            (valor): Resultado<T> => {
              terminada = true
              return { ok: true, valor }
            },
            (error: unknown): Resultado<T> => {
              terminada = true
              return { ok: false, error }
            },
          )

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

          const { count } = await tx.clase.deleteMany({ where: { id: claseId } })
          expect(count).toBe(1)
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
      await esperar(20 + Math.floor(Math.random() * 31))
      continue
    }
    if (!pendiente) throw new Error("Precondición: la lectura no se lanzó")
    return pendiente
  }
}

const maestroDePrueba = (nombre: string): Promise<UsuarioDePrueba> =>
  crearAlumnoDePrueba(idsUsuarios, { nombre, rol: "maestro" })

const existeLaClase = async (id: string): Promise<boolean> =>
  (await obtenerDb().clase.count({ where: { id } })) === 1

const ficha = (): string => randomUUID().slice(0, 8)

const valorDe = <T>(resultado: Resultado<T>): T => {
  if (!resultado.ok) {
    throw new Error(`la lectura rechazó: ${String(resultado.error)}`, { cause: resultado.error })
  }
  return resultado.valor
}

describe("PR-FX-01 · enTransaccion y el aislamiento", () => {
  const nivelDe = async (
    tx: Parameters<Parameters<typeof enTransaccion>[1]>[0],
  ): Promise<string> => {
    const [fila] = await tx.$queryRaw<
      { nivel: string }[]
    >`SELECT current_setting('transaction_isolation') AS nivel`
    return fila?.nivel ?? "sin nivel"
  }

  it("PR-FX-01 · con { instantaneaUnica: true } la transacción corre en repeatable read", async () => {
    const nivel = await enTransaccion(obtenerDb(), nivelDe, { instantaneaUnica: true })
    expect(nivel).toBe("repeatable read")
  })

  it("PR-FX-01 · sin opciones y con solo { maxWait } la transacción sigue en read committed", async () => {
    expect(await enTransaccion(obtenerDb(), nivelDe)).toBe("read committed")
    expect(await enTransaccion(obtenerDb(), nivelDe, { maxWait: 5_000 })).toBe("read committed")
  })

  it("PR-FX-01 · anidada, manda la transacción de afuera (read committed)", async () => {
    const nivel = await enTransaccion(obtenerDb(), (tx) =>
      enTransaccion(tx, nivelDe, { instantaneaUnica: true }),
    )
    expect(nivel).toBe("read committed")
  })

  it("PR-FX-01 · un AppError lanzado dentro de una transacción con la opción sale tal cual", async () => {
    const original = new AppError("VALIDACION", "cursor: no es válido", 400)
    const recibido = await enTransaccion(obtenerDb(), () => Promise.reject(original), {
      instantaneaUnica: true,
    }).then(
      () => undefined,
      (error: unknown) => error,
    )
    expect(recibido).toBe(original)
  })
})

describe("lecturas con la clase borrada en medio (FIX-CLASES)", () => {
  it("PR-FX-02 · GET /api/admin/clases con la clase borrada entre la página y sus maestros responde 200 con la clase y sus dos maestros", async () => {
    const a = await maestroDePrueba(`Maestro A ${ficha()}`)
    const b = await maestroDePrueba(`Maestro B ${ficha()}`)
    // Fecha lejana en el pasado con milisegundos aleatorios: ninguna clase de otro archivo queda
    // entre K (el cursor) y C.
    const base = new Date(Date.UTC(2001, 0, 1, 0, 0, 0, randomInt(1, 999)))
    const centinela = await crearClaseDePrueba(idsClases, {
      maestroId: a.id,
      nombre: `Centinela ${ficha()}`,
      creadoEn: base,
    })
    const clase = await crearClaseDePrueba(idsClases, {
      maestroId: a.id,
      maestroIds: [a.id, b.id],
      nombre: `Clase FX02 ${ficha()}`,
      creadoEn: new Date(base.getTime() - 1_000),
    })
    const token = await tokenDelAdminDePrueba()
    const pedir = () =>
      obtenerApp().inject({
        method: "GET",
        url: `/api/admin/clases?cursor=${centinela.id}&limite=1`,
        headers: { authorization: `Bearer ${token}` },
      })

    const previa = await pedir()
    expect(previa.statusCode, "Precondición: sin retención la petición responde 200").toBe(200)
    expect(listaClasesAdminRespuestaSchema.parse(previa.json()).clases[0]?.id).toBe(clase.id)

    const resultado = await leerConLaClaseBorradaEnMedio({
      tabla: "maestros_de_clase",
      claseId: clase.id,
      lanzar: pedir,
    })
    const respuesta = valorDe(resultado)
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    const cuerpo = listaClasesAdminRespuestaSchema.parse(respuesta.json())
    const primera = cuerpo.clases[0]
    expect(primera?.id).toBe(clase.id)
    expect(claseAdminSchema.parse(primera).maestros.map((m) => m.id)).toEqual([a.id, b.id].sort())
    expect(await existeLaClase(clase.id)).toBe(false)
  }, 75_000)

  it("PR-FX-03a · listarClasesInscritas con la clase borrada entre la inscripción y la clase devuelve la clase con su maestro", async () => {
    const nombreMaestro = `Maestro ${ficha()}`
    const nombreClase = `Clase FX03a ${ficha()}`
    const m = await maestroDePrueba(nombreMaestro)
    const estudiante = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Alumno ${ficha()}` })
    const clase = await crearClaseDePrueba(idsClases, {
      maestroId: m.id,
      nombre: nombreClase,
    })
    await inscribirDePrueba(clase.id, estudiante.id)

    const resultado = await leerConLaClaseBorradaEnMedio({
      tabla: "clases",
      claseId: clase.id,
      lanzar: () =>
        listarClasesInscritas({ usuarioId: estudiante.id, cursor: undefined, limite: 10 }),
    })
    const lista = valorDe(resultado)
    expect(lista.clases.map((c) => c.id)).toEqual([clase.id])
    expect(lista.clases[0]?.nombre).toBe(nombreClase)
    expect(lista.clases[0]?.maestros).toEqual([{ nombre: nombreMaestro }])
    expect(lista.total).toBe(1)
    expect(await existeLaClase(clase.id)).toBe(false)
  }, 75_000)

  it("PR-FX-03b · listarClasesInscritas con la clase borrada entre la clase y sus maestros devuelve la clase con su maestro", async () => {
    const nombreMaestro = `Maestro ${ficha()}`
    const m = await maestroDePrueba(nombreMaestro)
    const estudiante = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Alumno ${ficha()}` })
    const clase = await crearClaseDePrueba(idsClases, {
      maestroId: m.id,
      nombre: `Clase FX03b ${ficha()}`,
    })
    await inscribirDePrueba(clase.id, estudiante.id)

    const resultado = await leerConLaClaseBorradaEnMedio({
      tabla: "maestros_de_clase",
      claseId: clase.id,
      lanzar: () =>
        listarClasesInscritas({ usuarioId: estudiante.id, cursor: undefined, limite: 10 }),
    })
    const lista = valorDe(resultado)
    expect(lista.clases.map((c) => c.id)).toEqual([clase.id])
    expect(lista.clases[0]?.maestros).toEqual([{ nombre: nombreMaestro }])
    expect(lista.total).toBe(1)
    expect(await existeLaClase(clase.id)).toBe(false)
  }, 75_000)

  it("PR-FX-04 · listarClasesImpartidas con la clase borrada entre la asignación y la clase devuelve la clase con alumnos 0", async () => {
    const m = await maestroDePrueba(`Maestro ${ficha()}`)
    const nombre = `Clase FX04 ${ficha()}`
    const clase = await crearClaseDePrueba(idsClases, { maestroId: m.id, nombre })

    const resultado = await leerConLaClaseBorradaEnMedio({
      tabla: "clases",
      claseId: clase.id,
      lanzar: () => listarClasesImpartidas({ maestroId: m.id, cursor: undefined, limite: 10 }),
    })
    const lista = valorDe(resultado)
    expect(lista.clases).toEqual([{ id: clase.id, nombre, alumnos: 0 }])
    expect(lista.total).toBe(1)
    expect(await existeLaClase(clase.id)).toBe(false)
  }, 75_000)

  it("PR-FX-05 · leerClase con la clase borrada entre la clase y sus maestros devuelve la clase con su maestro", async () => {
    const m = await maestroDePrueba(`Maestro ${ficha()}`)
    const clase = await crearClaseDePrueba(idsClases, {
      maestroId: m.id,
      nombre: `Clase FX05 ${ficha()}`,
    })

    const resultado = await leerConLaClaseBorradaEnMedio({
      tabla: "maestros_de_clase",
      claseId: clase.id,
      lanzar: () => leerClase(clase.id),
    })
    const leida = valorDe(resultado)
    expect(leida).not.toBeNull()
    expect(leida?.maestros).toEqual([
      { id: m.id, nombre: expect.stringContaining("Maestro") as string },
    ])
    expect(await existeLaClase(clase.id)).toBe(false)
  }, 75_000)
})

// Enmienda 1 (T-01, T-02). Una tabla retenida no separa dos sentencias sobre la misma tabla (la
// comprobación del cursor y la página), así que estos casos usan un doble del ejecutor: un Proxy
// sobre el cliente que, en $transaction, entrega a la función la transacción envuelta con el mismo
// gancho (y conserva las opciones, así que la instantánea se abre de verdad) y que, después de que
// resuelve UNA llamada concreta <modelo>.<operación>, corre el gancho una sola vez antes de devolver
// el resultado. El gancho borra por OTRA conexión (el cliente sin envolver) con la función real del
// adaptador, que es lo que hace la ruta DELETE. Nadie retiene bloqueos.
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

describe("lecturas con cursor y la fila borrada en medio (FIX-CLASES, Enmienda 1)", () => {
  const preparar = async (): Promise<{
    claseId: string
    maestroId: string
    actor: ParticipanteDeAutoria
  }> => {
    const m = await maestroDePrueba(`Maestro ${ficha()}`)
    const clase = await crearClaseDePrueba(idsClases, {
      maestroId: m.id,
      nombre: `Clase FX06 ${ficha()}`,
    })
    return {
      claseId: clase.id,
      maestroId: m.id,
      actor: { id: await idDelAdminDePrueba(), rol: "admin" },
    }
  }

  // De la más reciente a la más antigua: P1, P2, P3, P4.
  const crearPublicaciones = async (claseId: string, autorId: string): Promise<string[]> => {
    const ahora = Date.now()
    const ids: string[] = []
    for (let k = 1; k <= 4; k += 1) {
      ids.push(
        await crearPublicacionDePrueba({
          claseId,
          autorId,
          texto: `P${String(k)}`,
          creadoEn: new Date(ahora - k * 60_000),
        }),
      )
    }
    return ids
  }

  it("PR-FX-06: listarPublicaciones con la publicación del cursor borrada entre su comprobación y la página devuelve las publicaciones que siguen", async () => {
    const { claseId, maestroId, actor } = await preparar()
    const [, p2, p3, p4] = await crearPublicaciones(claseId, maestroId)
    if (p2 === undefined || p3 === undefined || p4 === undefined) {
      throw new Error("Precondición: se crearon las cuatro publicaciones")
    }
    const previa = await listarPublicaciones({ claseId, cursor: p2, limite: 10, actor })
    expect(
      previa.publicaciones.map((p) => p.id),
      "Precondición (control): sin carrera",
    ).toEqual([p3, p4])

    const { gancho, disparado } = unaVezDespuesDe("publicacion.findFirst", async () => {
      const borrada = await borrarPublicacion({ claseId, publicacionId: p2, actor })
      expect(borrada, "Precondición: el gancho borró la publicación del cursor").toBe(true)
    })
    const lista = await listarPublicaciones(
      { claseId, cursor: p2, limite: 10, actor },
      ejecutorConGancho(gancho),
    )
    expect(disparado(), "Precondición: el gancho corrió tras la comprobación del cursor").toBe(true)
    expect(lista.publicaciones.map((p) => p.id)).toEqual([p3, p4])
    expect(lista.siguienteCursor).toBeNull()
    expect(await obtenerDb().publicacion.count({ where: { id: p2 } })).toBe(0)
  }, 30_000)

  it("PR-FX-06b: listarPublicaciones con una publicación de la página borrada antes del conteo y los adjuntos conserva su conteo de comentarios y sus adjuntos", async () => {
    const { claseId, maestroId, actor } = await preparar()
    const [, , p3] = await crearPublicaciones(claseId, maestroId)
    if (p3 === undefined) throw new Error("Precondición: se crearon las publicaciones")
    await crearComentarioDePrueba({ publicacionId: p3, autorId: maestroId })
    const archivo = await crearArchivoDePrueba({
      claseId,
      subidoPor: maestroId,
      estado: "confirmado",
      publicacionId: p3,
    })
    const antes = await listarPublicaciones({ claseId, cursor: undefined, limite: 10, actor })
    const previa = antes.publicaciones.find((p) => p.id === p3)
    expect(previa?.comentarios, "Precondición (control): sin carrera").toBe(1)
    expect(previa?.adjuntos.map((a) => a.id)).toEqual([archivo.id])

    const { gancho, disparado } = unaVezDespuesDe("publicacion.findMany", async () => {
      const borrada = await borrarPublicacion({ claseId, publicacionId: p3, actor })
      expect(borrada, "Precondición: el gancho borró la publicación").toBe(true)
    })
    const lista = await listarPublicaciones(
      { claseId, cursor: undefined, limite: 10, actor },
      ejecutorConGancho(gancho),
    )
    expect(disparado(), "Precondición: el gancho corrió tras la página").toBe(true)
    const leida = lista.publicaciones.find((p) => p.id === p3)
    expect(leida?.comentarios).toBe(1)
    expect(leida?.adjuntos.map((a) => a.id)).toEqual([archivo.id])
    expect(await obtenerDb().publicacion.count({ where: { id: p3 } })).toBe(0)
  }, 30_000)

  const crearComentarios = async (publicacionId: string, autorId: string): Promise<string[]> => {
    const ahora = Date.now()
    const ids: string[] = []
    for (let i = 1; i <= 4; i += 1) {
      ids.push(
        await crearComentarioDePrueba({
          publicacionId,
          autorId,
          texto: `K${String(i)}`,
          creadoEn: new Date(ahora - (5 - i) * 60_000),
        }),
      )
    }
    return ids
  }

  it("PR-FX-07: listarComentarios con el comentario del cursor borrado entre su comprobación y la página devuelve los comentarios que siguen", async () => {
    const { claseId, maestroId, actor } = await preparar()
    const publicacionId = await crearPublicacionDePrueba({ claseId, autorId: maestroId })
    const [, k2, k3, k4] = await crearComentarios(publicacionId, maestroId)
    if (k2 === undefined || k3 === undefined || k4 === undefined) {
      throw new Error("Precondición: se crearon los cuatro comentarios")
    }
    const parametros = { claseId, publicacionId, cursor: k2, limite: 10, actor }
    const previa = await listarComentarios(parametros)
    expect(
      previa?.comentarios.map((c) => c.id),
      "Precondición (control): sin carrera",
    ).toEqual([k3, k4])

    const { gancho, disparado } = unaVezDespuesDe("comentario.findFirst", async () => {
      const borrado = await borrarComentario({ claseId, publicacionId, comentarioId: k2, actor })
      expect(borrado, "Precondición: el gancho borró el comentario del cursor").toBe(true)
    })
    const lista = await listarComentarios(parametros, ejecutorConGancho(gancho))
    expect(disparado(), "Precondición: el gancho corrió tras la comprobación del cursor").toBe(true)
    expect(lista?.comentarios.map((c) => c.id)).toEqual([k3, k4])
    expect(lista?.siguienteCursor).toBeNull()
    expect(await obtenerDb().comentario.count({ where: { id: k2 } })).toBe(0)
  }, 30_000)

  it("PR-FX-07b: listarComentarios con la publicación borrada entre su comprobación y los comentarios devuelve los comentarios de la instantánea", async () => {
    const { claseId, maestroId, actor } = await preparar()
    const publicacionId = await crearPublicacionDePrueba({ claseId, autorId: maestroId })
    const [k1, k2] = await crearComentarios(publicacionId, maestroId)
    if (k1 === undefined || k2 === undefined) {
      throw new Error("Precondición: se crearon los comentarios")
    }
    const parametros = { claseId, publicacionId, cursor: undefined, limite: 2, actor }
    const previa = await listarComentarios(parametros)
    expect(
      previa?.comentarios.map((c) => c.id),
      "Precondición (control): sin carrera",
    ).toEqual([k1, k2])

    const { gancho, disparado } = unaVezDespuesDe("publicacion.findFirst", async () => {
      const borrada = await borrarPublicacion({ claseId, publicacionId, actor })
      expect(borrada, "Precondición: el gancho borró la publicación").toBe(true)
    })
    const lista = await listarComentarios(parametros, ejecutorConGancho(gancho))
    expect(
      disparado(),
      "Precondición: el gancho corrió tras la comprobación de la publicación",
    ).toBe(true)
    expect(lista?.comentarios.map((c) => c.id)).toEqual([k1, k2])
    expect(await obtenerDb().publicacion.count({ where: { id: publicacionId } })).toBe(0)
  }, 30_000)
})
