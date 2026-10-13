import { randomUUID } from "node:crypto"

import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { MENSAJE_SERVICIO_OCUPADO } from "../src/adapters/db/errores.js"
import { calificarEntrega } from "../src/adapters/db/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { AppError } from "../src/core/errores.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba } from "./ayudas-auth.js"
import {
  codigoDe,
  crearEscenarioDeCalificar,
  cuerpoConRubrica,
  cuerpoDirecto,
  fotoDeCalificar,
  HORA_MS,
  idsDeCriterios,
  pedirEn,
  trabajosDeCalificacion,
  urlDeCalificar,
  type CriterioDePrueba,
  type EscenarioDeCalificar,
  type OpcionesEscenarioDeCalificar,
} from "./ayudas-calificaciones.js"
import { borrarMovimientosYClasesDePrueba } from "./ayudas-clases.js"
import {
  conFilaDeEntregasRetenida,
  crearEntregaDePrueba,
  leerEntregaDb,
  type Resultado,
} from "./ayudas-entregas.js"
import { cuerpoDeTarea } from "./ayudas-tareas.js"

// CALIFICACIONES-01a (CAL-1A12). Carreras de calificar (§D-3, §D-9). Cada una retiene una fila propia
// (conFilaDeEntregasRetenida, con timeout explícito), lanza las operaciones en un orden fijo y espera a
// que cada una quede formada detrás de esa fila (formadasDetrasDe) antes de la siguiente: al soltar,
// corren en ese orden. Nunca un deadlock, un P2003 ni un 500 (respuestaDe lo exige en todas).

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}
const pedir = pedirEn(obtenerApp)

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen: crearAlmacenEnMemoria() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const RUBRICA: CriterioDePrueba[] = [
  { criterio: "Claridad", puntosMax: 4 },
  { criterio: "Contenido", puntosMax: 5 },
]

const escenario = (opciones: OpcionesEscenarioDeCalificar = {}) =>
  crearEscenarioDeCalificar(idsUsuarios, idsClases, opciones)

const respuestaDe = (resultado: Resultado<LightMyRequestResponse> | undefined) => {
  if (resultado === undefined) throw new Error("Precondición: la operación se lanzó")
  if (!resultado.ok) throw new Error(`la petición rechazó: ${String(resultado.error)}`)
  expect(resultado.valor.statusCode, resultado.valor.body).toBeLessThan(500)
  expect(resultado.valor.body).not.toMatch(/deadlock|P2003|40P01/i)
  return resultado.valor
}

const conCodigo = (
  resultado: Resultado<LightMyRequestResponse> | undefined,
  estado: number,
  codigo?: string,
) => {
  const respuesta = respuestaDe(resultado)
  expect(respuesta.statusCode, respuesta.body).toBe(estado)
  if (codigo !== undefined) expect(codigoDe(respuesta)).toBe(codigo)
  return respuesta
}

const calificarApi =
  (e: EscenarioDeCalificar, cuerpo: Record<string, unknown>, token = e.tokens.maestro) =>
  () =>
    pedir(token, "PUT", urlDeCalificar(e), cuerpo)

const anularApi = (e: EscenarioDeCalificar) => () =>
  pedir(e.tokens.alumno, "POST", `/api/clases/${e.claseId}/tareas/${e.tareaId}/entrega/anular`)

const entregarApi = (e: EscenarioDeCalificar) => () =>
  pedir(e.tokens.alumno, "POST", `/api/clases/${e.claseId}/tareas/${e.tareaId}/entrega`, {
    enlaces: ["https://ejemplo.com/otra-vez"],
  })

const urlTarea = (e: EscenarioDeCalificar, consulta = "") =>
  `/api/clases/${e.claseId}/tareas/${e.tareaId}${consulta}`

// El cuerpo del PUT de la tarea con su fecha y su versión actuales y los cambios pedidos.
const cuerpoDeEdicion = async (e: EscenarioDeCalificar, cambios: Record<string, unknown>) => {
  const tarea = await obtenerDb().tarea.findUnique({
    where: { id: e.tareaId },
    select: { version: true, fechaLimite: true, puntos: true },
  })
  if (tarea === null) throw new Error("Precondición: existe la tarea")
  return cuerpoDeTarea({
    version: tarea.version,
    fechaLimite: tarea.fechaLimite.toISOString(),
    puntos: tarea.puntos,
    rubrica: RUBRICA,
    archivoIds: [],
    ...cambios,
  })
}

const editarApi = (e: EscenarioDeCalificar, cuerpo: Record<string, unknown>) => () =>
  pedir(e.tokens.maestro, "PUT", urlTarea(e), cuerpo)

const idDeEntrega = async (e: EscenarioDeCalificar): Promise<string> => {
  const fila = await leerEntregaDb(e.tareaId, e.alumno.id)
  if (fila === null) throw new Error("Precondición: existe la fila de la entrega")
  return fila.id
}

describe("dos calificaciones a la vez (CAL-1A12 a)", () => {
  it("CAL-1A12 (a): los dos maestros de la clase con la misma versión, con la fila de la entrega retenida: un 200 y un 409 ENTREGA_MODIFICADA, una sola calificación y un solo aviso", async () => {
    const e = await escenario({ rubrica: RUBRICA, puntos: 10 })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id, version: 1 })

    const [primera, segunda] = await conFilaDeEntregasRetenida(
      { tabla: "entregas", id: await idDeEntrega(e) },
      [
        calificarApi(e, cuerpoConRubrica(e, [3, 4], { version: 1 })),
        calificarApi(e, cuerpoConRubrica(e, [1, 1], { version: 1 }), e.tokens.otroMaestro),
      ],
    )

    conCodigo(primera, 200)
    conCodigo(segunda, 409, "ENTREGA_MODIFICADA")
    expect((await fotoDeCalificar(e)).entrega).toMatchObject({ calificacion: "7.78", version: 2 })
    expect(await trabajosDeCalificacion(e.tareaId)).toHaveLength(1)
  }, 60_000)
})

describe("calificar contra anular y volver a entregar (CAL-1A12 b y c)", () => {
  it("CAL-1A12 (b): anular antes que calificar deja 409 ENTREGA_MODIFICADA; calificar antes que anular deja la anulación en 409 ENTREGA_CALIFICADA", async () => {
    const primero = await escenario({ puntos: 10 })
    await crearEntregaDePrueba({ tareaId: primero.tareaId, alumnoId: primero.alumno.id })
    const [anulada, calificada] = await conFilaDeEntregasRetenida(
      { tabla: "entregas", id: await idDeEntrega(primero) },
      [anularApi(primero), calificarApi(primero, cuerpoDirecto(primero, 8, { version: 1 }))],
    )
    conCodigo(anulada, 200)
    conCodigo(calificada, 409, "ENTREGA_MODIFICADA")
    expect(await leerEntregaDb(primero.tareaId, primero.alumno.id)).toMatchObject({
      estado: "asignado",
      version: 2,
      calificacion: null,
    })
    expect(await trabajosDeCalificacion(primero.tareaId)).toEqual([])

    const segundo = await escenario({ puntos: 10 })
    await crearEntregaDePrueba({ tareaId: segundo.tareaId, alumnoId: segundo.alumno.id })
    const [calificadaAntes, anulacion] = await conFilaDeEntregasRetenida(
      { tabla: "entregas", id: await idDeEntrega(segundo) },
      [calificarApi(segundo, cuerpoDirecto(segundo, 8, { version: 1 })), anularApi(segundo)],
    )
    conCodigo(calificadaAntes, 200)
    conCodigo(anulacion, 409, "ENTREGA_CALIFICADA")
    expect((await fotoDeCalificar(segundo)).entrega).toMatchObject({
      estado: "calificado",
      calificacion: "8",
      version: 2,
    })
  }, 60_000)

  it("CAL-1A12 (c): anular y volver a entregar antes que calificar con la versión que vio el maestro deja 409 ENTREGA_MODIFICADA", async () => {
    const e = await escenario({ puntos: 10 })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id, version: 1 })

    const [anulada, entregada, calificada] = await conFilaDeEntregasRetenida(
      { tabla: "entregas", id: await idDeEntrega(e) },
      [anularApi(e), entregarApi(e), calificarApi(e, cuerpoDirecto(e, 8, { version: 1 }))],
    )

    conCodigo(anulada, 200)
    conCodigo(entregada, 200)
    conCodigo(calificada, 409, "ENTREGA_MODIFICADA")
    expect(await leerEntregaDb(e.tareaId, e.alumno.id)).toMatchObject({
      estado: "entregado",
      version: 3,
      calificacion: null,
    })
    expect(await trabajosDeCalificacion(e.tareaId)).toEqual([])
  }, 60_000)
})

describe("calificar contra editar la tarea (CAL-1A12 d)", () => {
  it("CAL-1A12 (d): editar la rúbrica (sin calificaciones) antes que calificar deja 409 RUBRICA_MODIFICADA; calificar antes deja la edición en 409 TAREA_CON_CALIFICACIONES", async () => {
    const primero = await escenario({ rubrica: RUBRICA, puntos: 10 })
    await crearEntregaDePrueba({ tareaId: primero.tareaId, alumnoId: primero.alumno.id })
    const otraRubrica = await cuerpoDeEdicion(primero, {
      rubrica: [{ criterio: "Todo junto", puntosMax: 9 }],
    })
    const [editada, calificada] = await conFilaDeEntregasRetenida(
      { tabla: "tareas", id: primero.tareaId },
      [
        editarApi(primero, otraRubrica),
        calificarApi(primero, cuerpoConRubrica(primero, [3, 4], { version: 1 })),
      ],
    )
    conCodigo(editada, 200)
    conCodigo(calificada, 409, "RUBRICA_MODIFICADA")
    expect((await fotoDeCalificar(primero)).entrega).toMatchObject({
      estado: "entregado",
      calificacion: null,
      version: 1,
    })
    expect(await trabajosDeCalificacion(primero.tareaId)).toEqual([])

    const segundo = await escenario({ rubrica: RUBRICA, puntos: 10 })
    await crearEntregaDePrueba({ tareaId: segundo.tareaId, alumnoId: segundo.alumno.id })
    const edicion = await cuerpoDeEdicion(segundo, {
      rubrica: [{ criterio: "Todo junto", puntosMax: 9 }],
    })
    const [calificadaAntes, edicionDespues] = await conFilaDeEntregasRetenida(
      { tabla: "tareas", id: segundo.tareaId },
      [
        calificarApi(segundo, cuerpoConRubrica(segundo, [3, 4], { version: 1 })),
        editarApi(segundo, edicion),
      ],
    )
    conCodigo(calificadaAntes, 200)
    conCodigo(edicionDespues, 409, "TAREA_CON_CALIFICACIONES")
    expect(await idsDeCriterios(segundo.tareaId)).toEqual(segundo.criterios)
  }, 60_000)

  it("CAL-1A12 (d, Enmienda 1, M-02): editar solo los puntos de una tarea sin rúbrica antes que calificar deja 409 RUBRICA_MODIFICADA y nada escrito", async () => {
    const e = await escenario({ puntos: 10 })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    const subirPuntos = await cuerpoDeEdicion(e, { puntos: 100, rubrica: [] })
    const antes = await fotoDeCalificar(e)

    const [editada, calificada] = await conFilaDeEntregasRetenida(
      { tabla: "tareas", id: e.tareaId },
      [editarApi(e, subirPuntos), calificarApi(e, cuerpoDirecto(e, 9, { version: 1 }))],
    )

    conCodigo(editada, 200)
    conCodigo(calificada, 409, "RUBRICA_MODIFICADA")
    expect(await fotoDeCalificar(e)).toEqual(antes)
  }, 60_000)

  it("CAL-1A12 (d, N-02): editar solo el título (rúbrica idéntica) antes que calificar deja la calificación en 200 y los criterios con sus ids", async () => {
    const e = await escenario({ rubrica: RUBRICA, puntos: 10 })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    const soloTitulo = await cuerpoDeEdicion(e, { titulo: "Solo cambia el título" })

    const [editada, calificada] = await conFilaDeEntregasRetenida(
      { tabla: "tareas", id: e.tareaId },
      [editarApi(e, soloTitulo), calificarApi(e, cuerpoConRubrica(e, [3, 4], { version: 1 }))],
    )

    conCodigo(editada, 200)
    conCodigo(calificada, 200)
    expect(await idsDeCriterios(e.tareaId)).toEqual(e.criterios)
    expect((await fotoDeCalificar(e)).puntajes).toHaveLength(2)
  }, 60_000)
})

describe("calificar contra borrar la tarea (CAL-1A12 e)", () => {
  it("CAL-1A12 (e): borrar antes que calificar deja 404 TAREA_NO_ENCONTRADA; calificar antes que el borrado del maestro lo deja en 409 TAREA_CON_ENTREGAS", async () => {
    // Una tarea cerrada sin entregas: el maestro la puede borrar y la alumna se puede calificar sin
    // entrega (P-03 c′).
    const cerrada = {
      puntos: 10,
      fechaLimite: new Date(Date.now() - 2 * HORA_MS),
      aceptaTardias: false,
    }
    const primero = await escenario(cerrada)
    const [borrada, calificada] = await conFilaDeEntregasRetenida(
      { tabla: "tareas", id: primero.tareaId },
      [
        () => pedir(primero.tokens.maestro, "DELETE", urlTarea(primero)),
        calificarApi(primero, cuerpoDirecto(primero, 0, { version: 0 })),
      ],
    )
    conCodigo(borrada, 204)
    conCodigo(calificada, 404, "TAREA_NO_ENCONTRADA")
    expect(await obtenerDb().tarea.count({ where: { id: primero.tareaId } })).toBe(0)

    const segundo = await escenario(cerrada)
    const [calificadaAntes, borrado] = await conFilaDeEntregasRetenida(
      { tabla: "tareas", id: segundo.tareaId },
      [
        calificarApi(segundo, cuerpoDirecto(segundo, 0, { version: 0 })),
        () => pedir(segundo.tokens.maestro, "DELETE", urlTarea(segundo)),
      ],
    )
    conCodigo(calificadaAntes, 200)
    conCodigo(borrado, 409, "TAREA_CON_ENTREGAS")
    expect(await obtenerDb().tarea.count({ where: { id: segundo.tareaId } })).toBe(1)
  }, 60_000)
})

describe("P2028 dentro de calificar (CAL-1A12 g)", () => {
  it("CAL-1A12 (g): con la fila de la entrega retenida más que el timeout de la transacción, calificar rechaza con 503 SERVICIO_OCUPADO y no escribe ni encola nada", async () => {
    const e = await escenario({ rubrica: RUBRICA, puntos: 10 })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id, version: 1 })
    const antes = await fotoDeCalificar(e)
    let encolados = 0
    const [c1, c2] = e.criterios
    if (c1 === undefined || c2 === undefined) throw new Error("Precondición: dos criterios")

    // Se llama al adaptador (sin la ruta), así la prueba no deja una línea de registro de P2028 más.
    const [resultado] = await conFilaDeEntregasRetenida(
      { tabla: "entregas", id: await idDeEntrega(e) },
      [
        () =>
          calificarEntrega(
            {
              claseId: e.claseId,
              tareaId: e.tareaId,
              alumnoId: e.alumno.id,
              autorId: e.maestro.id,
              ahora: new Date(),
              version: 1,
              puntosDeLaTarea: 10,
              puntajes: [
                { criterioId: c1, puntos: 3 },
                { criterioId: c2, puntos: 4 },
              ],
              calificacion: null,
              comentario: { id: randomUUID(), texto: "No debe quedar" },
            },
            () => {
              encolados += 1
              return Promise.resolve()
            },
          ),
      ],
      { antesDeSoltar: () => new Promise((resolver) => setTimeout(resolver, 5_500)) },
    )

    if (resultado === undefined) throw new Error("Precondición: la operación se lanzó")
    expect(resultado.ok).toBe(false)
    const error = resultado.ok ? null : resultado.error
    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({
      codigo: "SERVICIO_OCUPADO",
      estado: 503,
      message: MENSAJE_SERVICIO_OCUPADO,
    })
    expect(encolados).toBe(0)
    expect(await fotoDeCalificar(e)).toEqual(antes)
  }, 60_000)
})
