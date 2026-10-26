import { randomUUID } from "node:crypto"

import {
  entregaDeAlumnoRespuestaSchema,
  listaEntregasRespuestaSchema,
  listaTrabajoRespuestaSchema,
  miEntregaRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import {
  borrarUsuariosDePrueba,
  desactivarUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  codigoDe,
  crearEscenarioDeCalificar,
  cuerpoConRubrica,
  cuerpoDirecto,
  fotoDeCalificar,
  mensajeDe,
  pedirEn,
  trabajosDeCalificacion,
  urlDeCalificar,
  type CriterioDePrueba,
  type EscenarioDeCalificar,
  type OpcionesEscenarioDeCalificar,
} from "./ayudas-calificaciones.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"
import { crearEntregaDePrueba, trabajosDeEntregaDeTarea } from "./ayudas-entregas.js"
import { crearTareaDePrueba, cuerpoDeTarea } from "./ayudas-tareas.js"

// Ataques del Tester, CALIFICACIONES-01a ronda 2: el remedio de T-01 (entregadas cuenta por
// fecha_entrega no nula) y sus estados vecinos, por HTTP y con el reloj fijo (vi.useFakeTimers solo
// para Date; cada caso fija su propio instante y firma los tokens con él). Estados: entregada, entregada
// con retraso, calificada con fecha, calificada sin entrega, anulada, anulada y vuelta a entregar,
// anulada y después calificada sin entrega, fila asignado por el hilo, desactivada, dada de baja, alumna
// de otra clase con fila y tarea de otra clase; la paginación; el 409 TAREA_CON_ENTREGAS y el borrado
// confirmado del admin con una calificada sin entrega; recalificarla; y lo que la alumna puede hacer
// con ella. Cada respuesta pasa por sinFuga en el caso que la pide.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen: crearAlmacenEnMemoria() })
  await app.ready()
})

afterEach(() => {
  vi.useRealTimers()
})

afterAll(async () => {
  vi.useRealTimers()
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const MINUTO_MS = 60_000

const FUGA = /estadoPago|fechaEstadoPago|accesoRestringido|motivoRestriccion|email|"rol"|deudor|@/i

const sinFuga = (respuesta: LightMyRequestResponse): LightMyRequestResponse => {
  expect(
    respuesta.body,
    "la respuesta filtra estado de pago, restricción, correo o rol",
  ).not.toMatch(FUGA)
  return respuesta
}

const pedirSinRevisar = pedirEn(obtenerApp)
const pedir: typeof pedirSinRevisar = async (...args) => sinFuga(await pedirSinRevisar(...args))

const conEstado = (respuesta: LightMyRequestResponse, estado: number, codigo?: string) => {
  expect(respuesta.statusCode, respuesta.body).toBe(estado)
  if (codigo !== undefined) expect(codigoDe(respuesta)).toBe(codigo)
  return respuesta
}

// Reloj fijo: solo Date, para que los temporizadores del pool y de Prisma sigan con el reloj real.
const fijarReloj = (instante: number): void => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(instante)
}

const escenario = (opciones: OpcionesEscenarioDeCalificar = {}) =>
  crearEscenarioDeCalificar(idsUsuarios, idsClases, {
    ficha: randomUUID().slice(0, 6),
    ...opciones,
  })

const urlTarea = (e: EscenarioDeCalificar, tareaId = e.tareaId) =>
  `/api/clases/${e.claseId}/tareas/${tareaId}`

interface Alumna {
  usuario: UsuarioDePrueba
  token: string
}

const alumnaEn = async (e: EscenarioDeCalificar, nombre: string): Promise<Alumna> => {
  const usuario = await crearAlumnoDePrueba(idsUsuarios, { nombre })
  await inscribirDePrueba(e.claseId, usuario.id)
  return { usuario, token: await firmarTokenDePrueba({ usuarioId: usuario.id }) }
}

const entregarComo = (e: EscenarioDeCalificar, token: string, enlace = "https://ejemplo.com/t") =>
  pedir(token, "POST", `${urlTarea(e)}/entrega`, { enlaces: [enlace] })

const anularComo = (e: EscenarioDeCalificar, token: string) =>
  pedir(token, "POST", `${urlTarea(e)}/entrega/anular`)

// La versión que el maestro ve en el panel de la entrega de esa alumna.
const versionVista = async (e: EscenarioDeCalificar, alumnoId: string): Promise<number> => {
  const r = conEstado(
    await pedir(e.tokens.maestro, "GET", `${urlTarea(e)}/entregas/${alumnoId}`),
    200,
  )
  return entregaDeAlumnoRespuestaSchema.parse(r.json()).entrega.version
}

const calificarComo = (
  e: EscenarioDeCalificar,
  alumnoId: string,
  cuerpo: Record<string, unknown>,
  token = e.tokens.maestro,
) => pedir(token, "PUT", urlDeCalificar(e, alumnoId), cuerpo)

// El PUT de la tarea con lo que tiene hoy y los cambios pedidos.
const cuerpoDeEdicion = async (
  e: EscenarioDeCalificar,
  rubrica: readonly CriterioDePrueba[],
  cambios: Record<string, unknown> = {},
) => {
  const tarea = await obtenerDb().tarea.findUnique({
    where: { id: e.tareaId },
    select: { version: true, fechaLimite: true, puntos: true, aceptaTardias: true },
  })
  if (tarea === null) throw new Error("Precondición: existe la tarea")
  return cuerpoDeTarea({
    version: tarea.version,
    fechaLimite: tarea.fechaLimite.toISOString(),
    puntos: tarea.puntos,
    aceptaTardias: tarea.aceptaTardias,
    rubrica,
    archivoIds: [],
    ...cambios,
  })
}

type PaginaDeEntregas = ReturnType<typeof listaEntregasRespuestaSchema.parse>

const listaCompleta = async (
  e: EscenarioDeCalificar,
  limite: number,
  token = e.tokens.maestro,
): Promise<PaginaDeEntregas[]> => {
  const paginas: PaginaDeEntregas[] = []
  let cursor: string | null = null
  for (let vuelta = 0; vuelta < 20; vuelta += 1) {
    const consulta: string =
      cursor === null ? `?limite=${limite}` : `?limite=${limite}&cursor=${cursor}`
    const r = conEstado(await pedir(token, "GET", `${urlTarea(e)}/entregas${consulta}`), 200)
    const pagina = listaEntregasRespuestaSchema.parse(r.json())
    paginas.push(pagina)
    cursor = pagina.siguienteCursor
    if (cursor === null) return paginas
  }
  throw new Error("La paginación no terminó en 20 páginas")
}

const primeraPagina = async (e: EscenarioDeCalificar): Promise<PaginaDeEntregas> => {
  const [pagina] = await listaCompleta(e, 50)
  if (pagina === undefined) throw new Error("La lista de entregas no trajo ninguna página")
  return pagina
}

const filaEnDb = async (tareaId: string, alumnoId: string) => {
  const fila = await obtenerDb().entrega.findUnique({
    where: { tareaId_alumnoId: { tareaId, alumnoId } },
    select: {
      id: true,
      estado: true,
      fechaEntrega: true,
      conRetraso: true,
      enlaces: true,
      version: true,
      calificacion: true,
    },
  })
  if (fila === null) throw new Error("Precondición: existe la fila de la entrega")
  return { ...fila, calificacion: fila.calificacion?.toString() ?? null }
}

describe("ataque CALIFICACIONES-01a r2: entregadas tras el remedio de T-01 (RF-35, P-03 c′)", () => {
  it("CAL-T-24: con el reloj fijo, entregadas cuenta la entregada, la entregada con retraso, la calificada con fecha y la vuelta a entregar; no cuenta la calificada sin entrega, la anulada (ni anulada y calificada), la fila del hilo, la desactivada, la dada de baja ni la alumna de otra clase; igual en cada página", async () => {
    const T0 = Date.now()
    fijarReloj(T0)
    const limite = new Date(T0 + 10 * MINUTO_MS)
    const tardeEn = new Date(limite.getTime() + 1000)
    const e = await escenario({ puntos: 10, fechaLimite: limite, aceptaTardias: true })
    const ana = await alumnaEn(e, "Ana Entrega R2")
    const bea = await alumnaEn(e, "Bea Calificada Con Fecha R2")
    const dora = await alumnaEn(e, "Dora Vuelve A Entregar R2")
    const elena = await alumnaEn(e, "Elena Anula Y Califican R2")
    const fer = await alumnaEn(e, "Fer Solo Hilo R2")
    const gina = await alumnaEn(e, "Gina Desactivada R2")
    const hilda = await alumnaEn(e, "Hilda Dada De Baja R2")
    const jose = await alumnaEn(e, "Jose Con Retraso R2")
    const olga = await alumnaEn(e, "Olga Solo Anula R2")

    // A tiempo (antes de la fecha límite).
    conEstado(await entregarComo(e, ana.token), 200)
    conEstado(await entregarComo(e, bea.token), 200)
    conEstado(await entregarComo(e, dora.token), 200)
    conEstado(await anularComo(e, dora.token), 200)
    conEstado(await entregarComo(e, dora.token, "https://ejemplo.com/segunda"), 200)
    conEstado(await entregarComo(e, elena.token), 200)
    conEstado(await anularComo(e, elena.token), 200)
    conEstado(await entregarComo(e, olga.token), 200)
    conEstado(await anularComo(e, olga.token), 200)
    conEstado(
      await pedir(fer.token, "POST", `${urlTarea(e)}/entrega/comentarios`, { texto: "Una duda" }),
      201,
    )
    conEstado(await entregarComo(e, gina.token), 200)
    conEstado(await entregarComo(e, hilda.token), 200)

    // Una alumna de otra clase con una fila en esta tarea (no debería existir; no cuenta).
    const otraClase = await crearClaseDePrueba(idsClases, { maestroId: e.maestro.id })
    const iris = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Iris De Otra Clase R2" })
    await inscribirDePrueba(otraClase.id, iris.id)
    await crearEntregaDePrueba({
      tareaId: e.tareaId,
      alumnoId: iris.id,
      fechaEntrega: new Date(T0),
    })
    // Y una tarea de la otra clase con su propia entrega.
    const tareaAjena = await crearTareaDePrueba({ claseId: otraClase.id, autorId: e.maestro.id })
    await crearEntregaDePrueba({
      tareaId: tareaAjena,
      alumnoId: iris.id,
      fechaEntrega: new Date(T0),
    })

    // Un segundo después de la fecha límite: la tardía, y después se cierra la tarea.
    vi.setSystemTime(tardeEn.getTime())
    const tarde = conEstado(await entregarComo(e, jose.token), 200)
    expect(miEntregaRespuestaSchema.parse(tarde.json()).entrega.conRetraso).toBe(true)
    conEstado(
      await pedir(
        e.tokens.maestro,
        "PUT",
        urlTarea(e),
        await cuerpoDeEdicion(e, [], { aceptaTardias: false }),
      ),
      200,
    )
    await desactivarUsuarioDePrueba(gina.usuario.id)
    conEstado(
      await pedir(
        e.tokens.maestro,
        "DELETE",
        `/api/clases/${e.claseId}/alumnos/${hilda.usuario.id}`,
      ),
      204,
    )

    // Calificar: con fecha (Bea, Jose) y sin entrega (la del escenario, sin fila; Elena, anulada).
    for (const alumnoId of [bea.usuario.id, jose.usuario.id, e.alumno.id, elena.usuario.id]) {
      const version = await versionVista(e, alumnoId)
      conEstado(await calificarComo(e, alumnoId, cuerpoDirecto(e, 5, { version })), 200)
    }
    // La desactivada y la dada de baja no se califican.
    for (const alumnoId of [gina.usuario.id, hilda.usuario.id]) {
      conEstado(
        await calificarComo(e, alumnoId, cuerpoDirecto(e, 5, { version: 1 })),
        404,
        "ALUMNO_NO_ENCONTRADO",
      )
    }

    // En base: Elena calificada sin fecha ni enlaces; Bea y Jose conservan su fecha y su retraso.
    expect(await filaEnDb(e.tareaId, elena.usuario.id)).toMatchObject({
      estado: "calificado",
      fechaEntrega: null,
      conRetraso: false,
      enlaces: [],
      calificacion: "5",
    })
    expect(await filaEnDb(e.tareaId, bea.usuario.id)).toMatchObject({
      estado: "calificado",
      fechaEntrega: new Date(T0),
      conRetraso: false,
    })
    expect(await filaEnDb(e.tareaId, jose.usuario.id)).toMatchObject({
      estado: "calificado",
      fechaEntrega: tardeEn,
      conRetraso: true,
    })

    // Activas e inscritas: Ana, Bea, la del escenario, Dora, Elena, Fer, Jose y Olga (8).
    // Entregaron: Ana, Bea, Dora y Jose (4).
    const aTiempo = new Date(T0).toISOString()
    const esperadas = new Map<
      string,
      { estado: string; fechaEntrega: string | null; conRetraso: boolean }
    >([
      [ana.usuario.id, { estado: "entregado", fechaEntrega: aTiempo, conRetraso: false }],
      [bea.usuario.id, { estado: "calificado", fechaEntrega: aTiempo, conRetraso: false }],
      [e.alumno.id, { estado: "calificado", fechaEntrega: null, conRetraso: false }],
      [dora.usuario.id, { estado: "entregado", fechaEntrega: aTiempo, conRetraso: false }],
      [elena.usuario.id, { estado: "calificado", fechaEntrega: null, conRetraso: false }],
      [fer.usuario.id, { estado: "asignado", fechaEntrega: null, conRetraso: false }],
      [
        jose.usuario.id,
        { estado: "calificado", fechaEntrega: tardeEn.toISOString(), conRetraso: true },
      ],
      [olga.usuario.id, { estado: "asignado", fechaEntrega: null, conRetraso: false }],
    ])
    for (const tamano of [100, 3, 1]) {
      const paginas = await listaCompleta(e, tamano)
      for (const pagina of paginas) {
        expect(
          { total: pagina.total, entregadas: pagina.entregadas },
          `página de ${tamano}`,
        ).toEqual({ total: 8, entregadas: 4 })
      }
      const filas = paginas.flatMap((pagina) => pagina.entregas)
      expect(filas).toHaveLength(8)
      expect(new Set(filas.map((fila) => fila.alumno.id)).size).toBe(8)
      for (const fila of filas) {
        expect(fila, `fila de ${fila.alumno.nombre} en páginas de ${tamano}`).toMatchObject(
          esperadas.get(fila.alumno.id) ?? { estado: "no-esperada" },
        )
      }
    }

    // La tarea de otra clase por la ruta de esta: 404.
    conEstado(
      await pedir(e.tokens.maestro, "GET", `${urlTarea(e, tareaAjena)}/entregas`),
      404,
      "TAREA_NO_ENCONTRADA",
    )
  })

  it("CAL-T-25: el borde exacto con el reloj fijo: en el milisegundo de la fecha límite se entrega a tiempo y calificar sin entrega es 409 ENTREGA_NO_CALIFICABLE; un milisegundo después se califica sin entrega, entregar es 409 ENTREGA_CERRADA y entregadas cuenta solo a la que entregó", async () => {
    const T0 = Date.now()
    fijarReloj(T0)
    const limite = new Date(T0 + 5 * MINUTO_MS)
    const e = await escenario({ puntos: 10, fechaLimite: limite, aceptaTardias: false })
    const justa = await alumnaEn(e, "Justa En El Borde R2")
    const tardia = await alumnaEn(e, "Tardia Un Milisegundo R2")

    vi.setSystemTime(limite.getTime())
    const enElBorde = conEstado(await entregarComo(e, justa.token), 200)
    expect(miEntregaRespuestaSchema.parse(enElBorde.json()).entrega).toMatchObject({
      estado: "entregado",
      conRetraso: false,
      fechaEntrega: limite.toISOString(),
    })
    const antes = await fotoDeCalificar(e)
    conEstado(
      await calificarComo(e, e.alumno.id, cuerpoDirecto(e, 0, { version: 0 })),
      409,
      "ENTREGA_NO_CALIFICABLE",
    )
    expect(await fotoDeCalificar(e)).toEqual(antes)

    vi.setSystemTime(limite.getTime() + 1)
    conEstado(await entregarComo(e, tardia.token), 409, "ENTREGA_CERRADA")
    conEstado(await calificarComo(e, e.alumno.id, cuerpoDirecto(e, 0, { version: 0 })), 200)
    conEstado(await calificarComo(e, tardia.usuario.id, cuerpoDirecto(e, 1, { version: 0 })), 200)
    expect(await primeraPagina(e)).toMatchObject({ total: 3, entregadas: 1 })
  })
})

describe("ataque CALIFICACIONES-01a r2: la calificada sin entrega como estado (P-03 c′)", () => {
  const RUBRICA: CriterioDePrueba[] = [
    { criterio: "Claridad", puntosMax: 4 },
    { criterio: "Contenido", puntosMax: 6 },
  ]

  it("CAL-T-26: recalificar una calificada sin entrega con rúbrica: sigue sin fecha, sin retraso ni enlaces, la versión sube, los puntajes se reemplazan, la versión vieja es 409 sin escribir, y en las lecturas del maestro, de la alumna y de Trabajo de clase sigue siendo calificado sin fecha", async () => {
    const T0 = Date.now()
    fijarReloj(T0)
    const e = await escenario({
      puntos: 10,
      rubrica: RUBRICA,
      fechaLimite: new Date(T0 - 2 * MINUTO_MS),
      aceptaTardias: false,
    })
    conEstado(await calificarComo(e, e.alumno.id, cuerpoConRubrica(e, [1, 2], { version: 0 })), 200)
    vi.setSystemTime(T0 + MINUTO_MS)
    const re = conEstado(
      await calificarComo(
        e,
        e.alumno.id,
        cuerpoConRubrica(e, [4, 5], { version: 1, comentario: "Revisado" }),
      ),
      200,
    )
    expect(entregaDeAlumnoRespuestaSchema.parse(re.json()).entrega).toMatchObject({
      estado: "calificado",
      fechaEntrega: null,
      conRetraso: false,
      enlaces: [],
      adjuntos: [],
      version: 2,
      calificacion: { puntos: 9, sobre: 10 },
    })
    const fila = await filaEnDb(e.tareaId, e.alumno.id)
    expect(fila).toMatchObject({
      estado: "calificado",
      fechaEntrega: null,
      version: 2,
      calificacion: "9",
    })
    const puntajes = await obtenerDb().puntajeRubrica.findMany({
      where: { entregaId: fila.id },
      select: { criterioId: true, puntos: true },
    })
    const porCriterio = new Map(puntajes.map((p) => [p.criterioId, p.puntos.toString()]))
    expect(puntajes).toHaveLength(2)
    expect(e.criterios.map((id) => porCriterio.get(id))).toEqual(["4", "5"])
    expect(await trabajosDeCalificacion(e.tareaId)).toHaveLength(2)

    const antes = await fotoDeCalificar(e)
    conEstado(
      await calificarComo(e, e.alumno.id, cuerpoConRubrica(e, [0, 0], { version: 1 })),
      409,
      "ENTREGA_MODIFICADA",
    )
    expect(await fotoDeCalificar(e)).toEqual(antes)

    const pagina = await primeraPagina(e)
    expect(pagina).toMatchObject({ total: 1, entregadas: 0 })
    expect(pagina.entregas[0]).toMatchObject({
      estado: "calificado",
      fechaEntrega: null,
      conRetraso: false,
    })

    const mia = conEstado(await pedir(e.tokens.alumno, "GET", `${urlTarea(e)}/entrega`), 200)
    expect(miEntregaRespuestaSchema.parse(mia.json()).entrega).toMatchObject({
      estado: "calificado",
      fechaEntrega: null,
      conRetraso: false,
      enlaces: [],
      puedeEntregar: false,
      puedeAnular: false,
      calificacion: { puntos: 9, sobre: 10 },
    })

    const trabajo = conEstado(
      await pedir(e.tokens.alumno, "GET", `/api/clases/${e.claseId}/trabajo?tema=sin-tema`),
      200,
    )
    const elemento = listaTrabajoRespuestaSchema
      .parse(trabajo.json())
      .elementos.find((el) => el.id === e.tareaId)
    expect(
      elemento?.entrega,
      "la tarea aparece en Trabajo de clase con la entrega de la alumna",
    ).toEqual({ estado: "calificado", conRetraso: false })
  })

  it("CAL-T-27: con una calificada sin entrega, la alumna recibe 409 ENTREGA_CALIFICADA al entregar, anular y pedir subir un archivo, con la tarea cerrada y reabierta, sin escribir, sin archivo pendiente y sin encolar ENTREGA_REALIZADA", async () => {
    const T0 = Date.now()
    fijarReloj(T0)
    const e = await escenario({
      puntos: 10,
      fechaLimite: new Date(T0 - 2 * MINUTO_MS),
      aceptaTardias: false,
    })
    conEstado(await calificarComo(e, e.alumno.id, cuerpoDirecto(e, 0, { version: 0 })), 200)

    const intentar = async (cuando: string) => {
      const antes = await fotoDeCalificar(e)
      conEstado(await entregarComo(e, e.tokens.alumno), 409, "ENTREGA_CALIFICADA")
      conEstado(await anularComo(e, e.tokens.alumno), 409, "ENTREGA_CALIFICADA")
      conEstado(
        await pedir(e.tokens.alumno, "POST", `${urlTarea(e)}/entrega/archivos`, {
          nombre: "tarde.pdf",
          tipo: "application/pdf",
          tamano: 1000,
        }),
        409,
        "ENTREGA_CALIFICADA",
      )
      expect(await fotoDeCalificar(e), cuando).toEqual(antes)
      expect(
        await obtenerDb().archivo.count({ where: { claseId: e.claseId, subidoPor: e.alumno.id } }),
        cuando,
      ).toBe(0)
      expect(await trabajosDeEntregaDeTarea(e.tareaId), cuando).toHaveLength(0)
    }

    await intentar("con la tarea cerrada")
    conEstado(
      await pedir(
        e.tokens.maestro,
        "PUT",
        urlTarea(e),
        await cuerpoDeEdicion(e, [], {
          fechaLimite: new Date(T0 + 72 * 60 * MINUTO_MS).toISOString(),
          aceptaTardias: true,
        }),
      ),
      200,
    )
    await intentar("con la tarea reabierta")
  })

  it("CAL-T-28: con solo una calificada sin entrega, cambiar los puntos o la rúbrica de la tarea es 409 TAREA_CON_CALIFICACIONES sin escribir", async () => {
    const T0 = Date.now()
    fijarReloj(T0)
    const e = await escenario({
      puntos: 10,
      rubrica: RUBRICA,
      fechaLimite: new Date(T0 - 2 * MINUTO_MS),
      aceptaTardias: false,
    })
    conEstado(await calificarComo(e, e.alumno.id, cuerpoConRubrica(e, [0, 0], { version: 0 })), 200)
    const leerTarea = () =>
      obtenerDb().tarea.findUnique({
        where: { id: e.tareaId },
        select: { version: true, puntos: true },
      })
    const tareaAntes = await leerTarea()
    conEstado(
      await pedir(
        e.tokens.maestro,
        "PUT",
        urlTarea(e),
        await cuerpoDeEdicion(e, RUBRICA, { puntos: 20 }),
      ),
      409,
      "TAREA_CON_CALIFICACIONES",
    )
    conEstado(
      await pedir(
        e.tokens.maestro,
        "PUT",
        urlTarea(e),
        await cuerpoDeEdicion(e, [{ criterio: "Claridad", puntosMax: 10 }]),
      ),
      409,
      "TAREA_CON_CALIFICACIONES",
    )
    expect(await leerTarea()).toEqual(tareaAntes)
    expect(await obtenerDb().criterioRubrica.count({ where: { tareaId: e.tareaId } })).toBe(2)
  })

  it("CAL-T-29: borrar una tarea con solo calificadas sin entrega: la maestra recibe 409 TAREA_CON_ENTREGAS (sin 500, también con una alumna dada de baja), el admin sin confirmar también, y con la confirmación se borran la tarea, los criterios, las entregas, sus puntajes y el hilo con la devolución", async () => {
    const T0 = Date.now()
    fijarReloj(T0)
    const e = await escenario({
      puntos: 10,
      rubrica: RUBRICA,
      fechaLimite: new Date(T0 - 2 * MINUTO_MS),
      aceptaTardias: false,
    })
    const otra = await alumnaEn(e, "Otra Sin Entrega R2")
    conEstado(
      await calificarComo(
        e,
        e.alumno.id,
        cuerpoConRubrica(e, [1, 1], { version: 0, comentario: "No entregaste" }),
      ),
      200,
    )
    conEstado(
      await calificarComo(e, otra.usuario.id, cuerpoConRubrica(e, [0, 0], { version: 0 })),
      200,
    )
    const ids = (
      await obtenerDb().entrega.findMany({ where: { tareaId: e.tareaId }, select: { id: true } })
    ).map((fila) => fila.id)
    expect(ids).toHaveLength(2)
    expect(await obtenerDb().puntajeRubrica.count({ where: { entregaId: { in: ids } } })).toBe(4)
    expect(await obtenerDb().comentario.count({ where: { entregaId: { in: ids } } })).toBe(1)

    const maestra = conEstado(
      await pedir(e.tokens.maestro, "DELETE", urlTarea(e)),
      409,
      "TAREA_CON_ENTREGAS",
    )
    // N-19 (carril trivial, 2026-10-26): el 409 cuenta alumnos con entrega o calificación
    expect(mensajeDe(maestra)).toContain("2 alumnos con entrega o calificación")
    // Con una de ellas dada de baja, la regla del plan la sigue contando (de cualquier alumno).
    conEstado(
      await pedir(
        e.tokens.maestro,
        "DELETE",
        `/api/clases/${e.claseId}/alumnos/${otra.usuario.id}`,
      ),
      204,
    )
    conEstado(await pedir(e.tokens.maestro, "DELETE", urlTarea(e)), 409, "TAREA_CON_ENTREGAS")
    conEstado(await pedir(e.tokens.admin, "DELETE", urlTarea(e)), 409, "TAREA_CON_ENTREGAS")
    expect(await obtenerDb().tarea.count({ where: { id: e.tareaId } })).toBe(1)

    conEstado(await pedir(e.tokens.admin, "DELETE", `${urlTarea(e)}?confirmar=entregas`), 204)
    expect(await obtenerDb().tarea.count({ where: { id: e.tareaId } })).toBe(0)
    expect(await obtenerDb().criterioRubrica.count({ where: { tareaId: e.tareaId } })).toBe(0)
    expect(await obtenerDb().entrega.count({ where: { id: { in: ids } } })).toBe(0)
    expect(await obtenerDb().puntajeRubrica.count({ where: { entregaId: { in: ids } } })).toBe(0)
    expect(
      await obtenerDb().puntajeRubrica.count({ where: { criterioId: { in: e.criterios } } }),
    ).toBe(0)
    expect(await obtenerDb().comentario.count({ where: { entregaId: { in: ids } } })).toBe(0)
    conEstado(
      await pedir(e.tokens.maestro, "GET", `${urlTarea(e)}/entregas`),
      404,
      "TAREA_NO_ENCONTRADA",
    )
  })

  it("CAL-T-30: calificar sin entrega, reabrir la tarea y entregar a la vez, en cinco rondas: nunca 500, entregadas es 1 si y solo si la fila tiene fecha (y solo si entregar respondió 200), y la fila es calificada si y solo si calificar respondió 200", async () => {
    for (let ronda = 0; ronda < 5; ronda += 1) {
      const T0 = Date.now()
      fijarReloj(T0)
      const e = await escenario({
        puntos: 10,
        fechaLimite: new Date(T0 - 2 * MINUTO_MS),
        aceptaTardias: false,
      })
      const reabrir = await cuerpoDeEdicion(e, [], {
        fechaLimite: new Date(T0 + 72 * 60 * MINUTO_MS).toISOString(),
        aceptaTardias: true,
      })
      const [calificar, edicion, entrega] = await Promise.all([
        calificarComo(e, e.alumno.id, cuerpoDirecto(e, 0, { version: 0 })),
        pedir(e.tokens.maestro, "PUT", urlTarea(e), reabrir),
        entregarComo(e, e.tokens.alumno),
      ])
      for (const r of [calificar, edicion, entrega]) {
        expect(r.statusCode, `ronda ${ronda}: ${r.body}`).toBeLessThan(500)
      }
      expect(edicion.statusCode, edicion.body).toBe(200)
      const fila = await obtenerDb().entrega.findUnique({
        where: { tareaId_alumnoId: { tareaId: e.tareaId, alumnoId: e.alumno.id } },
        select: { estado: true, fechaEntrega: true },
      })
      const conFecha = fila !== null && fila.fechaEntrega !== null
      expect(conFecha, `ronda ${ronda}: entregar ${entrega.statusCode}`).toBe(
        entrega.statusCode === 200,
      )
      expect(
        fila?.estado === "calificado",
        `ronda ${ronda}: calificar ${calificar.statusCode}`,
      ).toBe(calificar.statusCode === 200)
      expect((await primeraPagina(e)).entregadas, `ronda ${ronda}`).toBe(conFecha ? 1 : 0)
      vi.useRealTimers()
    }
  })
})
