import { randomUUID } from "node:crypto"

import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import {
  codigoDe,
  crearEscenarioDeCalificar,
  cuerpoConRubrica,
  idsDeCriterios,
  pedirEn,
  trabajosDeCalificacion,
  urlDeCalificar,
  type CriterioDePrueba,
  type EscenarioDeCalificar,
} from "./ayudas-calificaciones.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"
import { formadasDetrasDe } from "./ayudas-concurrencia.js"
import { crearEntregaDePrueba, leerEntregaDb, type TxDeRetencion } from "./ayudas-entregas.js"
import { crearTemaDePrueba, cuerpoDeTarea } from "./ayudas-tareas.js"

// Ataques del Tester, CALIFICACIONES-01a ronda 1: carreras de calificar con una calificación a medias
// (la tarea ya tomada FOR SHARE y la comprobación diferida de puntajes_rubrica.criterio_id pendiente
// para el COMMIT, N-16) frente al borrado confirmado del admin, a vaciar o cambiar la rúbrica, a mover
// de tema y a otra calificación de la misma tarea; y una ráfaga sin retención en busca de un deadlock
// o de puntajes sin calificación. La retención es propia (una fila de entregas o de publicaciones con
// FOR UPDATE, con timeout explícito) y cada operación se da por formada solo cuando espera una fila
// (formadasDetrasDe). Ninguna LOCK TABLE. Las fechas límite llevan 48 h de margen.

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

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

interface Retencion {
  pid: number
  soltar: () => Promise<void>
}

// Una transacción externa toma la fila y no la suelta hasta soltar(). El timeout es explícito y mayor
// que la espera más larga de cada caso.
const retener = async (bloquear: (tx: TxDeRetencion) => Promise<unknown>): Promise<Retencion> => {
  let liberar: () => void = () => undefined
  const liberada = new Promise<void>((resolver) => {
    liberar = resolver
  })
  let avisarPid: (pid: number) => void = () => undefined
  const pid = new Promise<number>((resolver) => {
    avisarPid = resolver
  })
  const transaccion = obtenerDb().$transaction(
    async (tx) => {
      await bloquear(tx)
      const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      if (!propio) throw new Error("Precondición: no se obtuvo el pid de la retenedora")
      avisarPid(propio.pid)
      await liberada
    },
    { timeout: 30_000, maxWait: 5_000 },
  )
  const resultado = await Promise.race([
    pid,
    transaccion.then(() => {
      throw new Error("Precondición: la retenedora terminó antes de retener")
    }),
  ])
  return {
    pid: resultado,
    soltar: async () => {
      liberar()
      await transaccion
    },
  }
}

const retenerEntrega = async (tareaId: string, alumnoId: string) => {
  const fila = await leerEntregaDb(tareaId, alumnoId)
  if (fila === null) throw new Error("Precondición: existe la fila de la entrega")
  return retener(
    (tx) => tx.$queryRaw`SELECT id FROM entregas WHERE id = ${fila.id}::uuid FOR UPDATE`,
  )
}

const retenerPublicacion = (publicacionId: string) =>
  retener(
    (tx) => tx.$queryRaw`SELECT id FROM publicaciones WHERE id = ${publicacionId}::uuid FOR UPDATE`,
  )

// Espera a que haya n operaciones formadas detrás de la retenedora (solo esperas de fila).
const esperarFormadas = async (pid: number, n: number, cual: string) => {
  const limite = Date.now() + 10_000
  while (Date.now() < limite) {
    if ((await formadasDetrasDe(pid)) >= n) return
    await esperar(25)
  }
  throw new Error(`Precondición: ${cual} no quedó formada detrás de la fila retenida en 10 s`)
}

const sana = (respuesta: LightMyRequestResponse, estado: number, codigo?: string) => {
  expect(respuesta.statusCode, respuesta.body).toBeLessThan(500)
  expect(respuesta.body).not.toMatch(/deadlock|40P01|23503|P2003|P2028/i)
  expect(respuesta.statusCode, respuesta.body).toBe(estado)
  if (codigo !== undefined) expect(codigoDe(respuesta)).toBe(codigo)
}

const urlTarea = (e: EscenarioDeCalificar, consulta = "") =>
  `/api/clases/${e.claseId}/tareas/${e.tareaId}${consulta}`

const cuerpoDeEdicion = async (
  e: EscenarioDeCalificar,
  rubrica: readonly CriterioDePrueba[],
  cambios: Record<string, unknown> = {},
) => {
  const tarea = await obtenerDb().tarea.findUnique({
    where: { id: e.tareaId },
    select: { version: true, fechaLimite: true, puntos: true },
  })
  if (tarea === null) throw new Error("Precondición: existe la tarea")
  return cuerpoDeTarea({
    version: tarea.version,
    fechaLimite: tarea.fechaLimite.toISOString(),
    puntos: tarea.puntos,
    rubrica,
    archivoIds: [],
    ...cambios,
  })
}

// Una segunda alumna inscrita, con su entrega hecha y su token.
const otraAlumna = async (e: EscenarioDeCalificar, nombre: string) => {
  const alumna = await crearAlumnoDePrueba(idsUsuarios, { nombre })
  await inscribirDePrueba(e.claseId, alumna.id)
  await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: alumna.id })
  return { ...alumna, token: await firmarTokenDePrueba({ usuarioId: alumna.id }) }
}

// Lo que queda de una tarea en la base: la tarea, sus criterios, sus entregas y los puntajes de sus
// entregas o de sus criterios (por los ids que tenía al empezar).
const restos = async (
  tareaId: string,
  criterios: readonly string[],
  entregas: readonly string[],
) => ({
  tarea: await obtenerDb().tarea.count({ where: { id: tareaId } }),
  criterios: await obtenerDb().criterioRubrica.count({ where: { tareaId } }),
  entregas: await obtenerDb().entrega.count({ where: { tareaId } }),
  puntajes: await obtenerDb().puntajeRubrica.count({
    where: { OR: [{ entregaId: { in: [...entregas] } }, { criterioId: { in: [...criterios] } }] },
  }),
})

const idsDeEntregas = async (tareaId: string) =>
  (await obtenerDb().entrega.findMany({ where: { tareaId }, select: { id: true } })).map(
    (f) => f.id,
  )

describe("ataque CALIFICACIONES-01a r1: calificar a medias frente al borrado y a la rúbrica (N-16)", () => {
  it("CAL-T-15: con una calificación a medias (tarea FOR SHARE, comprobación de la FK pendiente), el borrado confirmado del admin y vaciar la rúbrica esperan: 200, 204 y 404, sin 23503, sin deadlock y sin puntajes huérfanos", async () => {
    const e = await crearEscenarioDeCalificar(idsUsuarios, idsClases, {
      rubrica: RUBRICA,
      puntos: 10,
      ficha: "T15",
    })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    const segunda = await otraAlumna(e, "Segunda T15")
    // La segunda ya tiene puntajes reales: la tarea tiene calificaciones antes de empezar.
    sana(
      await pedir(
        e.tokens.maestro,
        "PUT",
        urlDeCalificar(e, segunda.id),
        cuerpoConRubrica(e, [2, 2], { version: 1 }),
      ),
      200,
    )
    const entregas = await idsDeEntregas(e.tareaId)
    const vaciar = await cuerpoDeEdicion(e, [])

    const retencion = await retenerEntrega(e.tareaId, e.alumno.id)
    const calificacion = pedir(
      e.tokens.maestro,
      "PUT",
      urlDeCalificar(e),
      cuerpoConRubrica(e, [3, 4], { version: 1, comentario: "A medias" }),
    )
    await esperarFormadas(retencion.pid, 1, "la calificación")
    const borrado = pedir(e.tokens.admin, "DELETE", urlTarea(e, "?confirmar=entregas"))
    await esperarFormadas(retencion.pid, 2, "el borrado del admin")
    const edicion = pedir(e.tokens.maestro, "PUT", urlTarea(e), vaciar)
    await esperarFormadas(retencion.pid, 3, "vaciar la rúbrica")
    await retencion.soltar()

    const [calificada, borrada, editada] = await Promise.all([calificacion, borrado, edicion])
    sana(calificada, 200)
    sana(borrada, 204)
    sana(editada, 404, "TAREA_NO_ENCONTRADA")
    expect(await restos(e.tareaId, e.criterios, entregas)).toEqual({
      tarea: 0,
      criterios: 0,
      entregas: 0,
      puntajes: 0,
    })
  }, 60_000)

  it("CAL-T-16: con el borrado confirmado del admin a medias (tarea FOR UPDATE), recalificar y vaciar la rúbrica esperan y reciben 404 TAREA_NO_ENCONTRADA, sin 23503 ni puntajes huérfanos", async () => {
    const e = await crearEscenarioDeCalificar(idsUsuarios, idsClases, {
      rubrica: RUBRICA,
      puntos: 10,
      ficha: "T16",
    })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    sana(
      await pedir(
        e.tokens.maestro,
        "PUT",
        urlDeCalificar(e),
        cuerpoConRubrica(e, [3, 4], { version: 1 }),
      ),
      200,
    )
    const entregas = await idsDeEntregas(e.tareaId)
    const vaciar = await cuerpoDeEdicion(e, [])

    // El borrado toma la tarea FOR UPDATE y se detiene al borrar la publicación (retenida).
    const retencion = await retenerPublicacion(e.tareaId)
    const borrado = pedir(e.tokens.admin, "DELETE", urlTarea(e, "?confirmar=entregas"))
    await esperarFormadas(retencion.pid, 1, "el borrado del admin")
    const recalificacion = pedir(
      e.tokens.maestro,
      "PUT",
      urlDeCalificar(e),
      cuerpoConRubrica(e, [1, 1], { version: 2 }),
    )
    await esperarFormadas(retencion.pid, 2, "la recalificación")
    const edicion = pedir(e.tokens.maestro, "PUT", urlTarea(e), vaciar)
    await esperarFormadas(retencion.pid, 3, "vaciar la rúbrica")
    await retencion.soltar()

    const [borrada, recalificada, editada] = await Promise.all([borrado, recalificacion, edicion])
    sana(borrada, 204)
    sana(recalificada, 404, "TAREA_NO_ENCONTRADA")
    sana(editada, 404, "TAREA_NO_ENCONTRADA")
    expect(await restos(e.tareaId, e.criterios, entregas)).toEqual({
      tarea: 0,
      criterios: 0,
      entregas: 0,
      puntajes: 0,
    })
    expect(await trabajosDeCalificacion(e.tareaId)).toHaveLength(1)
  }, 60_000)

  it("CAL-T-17: con la primera calificación de la tarea a medias, cambiar la rúbrica espera y recibe 409 TAREA_CON_CALIFICACIONES; los criterios y los puntajes quedan intactos", async () => {
    const e = await crearEscenarioDeCalificar(idsUsuarios, idsClases, {
      rubrica: RUBRICA,
      puntos: 10,
      ficha: "T17",
    })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    const otra = await cuerpoDeEdicion(e, [{ criterio: "Todo junto", puntosMax: 9 }])

    const retencion = await retenerEntrega(e.tareaId, e.alumno.id)
    const calificacion = pedir(
      e.tokens.maestro,
      "PUT",
      urlDeCalificar(e),
      cuerpoConRubrica(e, [3, 4], { version: 1 }),
    )
    await esperarFormadas(retencion.pid, 1, "la calificación")
    const edicion = pedir(e.tokens.maestro, "PUT", urlTarea(e), otra)
    await esperarFormadas(retencion.pid, 2, "el cambio de rúbrica")
    await retencion.soltar()

    const [calificada, editada] = await Promise.all([calificacion, edicion])
    sana(calificada, 200)
    sana(editada, 409, "TAREA_CON_CALIFICACIONES")
    expect(await idsDeCriterios(e.tareaId)).toEqual(e.criterios)
    expect(
      await obtenerDb().puntajeRubrica.count({ where: { criterioId: { in: e.criterios } } }),
    ).toBe(2)
  }, 60_000)

  it("CAL-T-18: con una calificación a medias, mover la tarea de tema espera y después se guarda; calificar a otra alumna de la misma tarea no espera", async () => {
    const e = await crearEscenarioDeCalificar(idsUsuarios, idsClases, {
      rubrica: RUBRICA,
      puntos: 10,
      ficha: "T18",
    })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    const segunda = await otraAlumna(e, "Segunda T18")
    const { id: temaId } = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad T18" })

    const retencion = await retenerEntrega(e.tareaId, e.alumno.id)
    let primeraTerminada = false
    const calificacion = pedir(
      e.tokens.maestro,
      "PUT",
      urlDeCalificar(e),
      cuerpoConRubrica(e, [3, 4], { version: 1 }),
    ).finally(() => {
      primeraTerminada = true
    })
    await esperarFormadas(retencion.pid, 1, "la calificación")

    // La otra alumna: la tarea está FOR SHARE (compatible) y su fila no está retenida.
    const otra = await Promise.race([
      pedir(
        e.tokens.otroMaestro,
        "PUT",
        urlDeCalificar(e, segunda.id),
        cuerpoConRubrica(e, [1, 2], { version: 1 }),
      ),
      esperar(8_000).then(() => null),
    ])
    if (otra === null) throw new Error("calificar a otra alumna esperó a la calificación a medias")
    sana(otra, 200)
    expect(primeraTerminada, "Precondición: la primera sigue a medias").toBe(false)

    const mover = pedir(
      e.tokens.maestro,
      "PUT",
      `/api/clases/${e.claseId}/publicaciones/${e.tareaId}/tema`,
      { temaId },
    )
    await esperarFormadas(retencion.pid, 2, "mover de tema")
    await retencion.soltar()

    const [calificada, movida] = await Promise.all([calificacion, mover])
    sana(calificada, 200)
    sana(movida, 200)
    expect(await idsDeCriterios(e.tareaId)).toEqual(e.criterios)
    expect(await trabajosDeCalificacion(e.tareaId)).toHaveLength(2)
  }, 60_000)
})

describe("ataque CALIFICACIONES-01a r1: ráfaga sin retención", () => {
  it("CAL-T-19: calificar, recalificar, comentar, anular, cambiar el título y mover de tema a la vez, en tres rondas, nunca da 500 ni deadlock, y nunca deja puntajes de una entrega que no está calificada", async () => {
    const e = await crearEscenarioDeCalificar(idsUsuarios, idsClases, {
      rubrica: RUBRICA,
      puntos: 10,
      ficha: "T19",
    })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    const alumnas = [
      { id: e.alumno.id, token: e.tokens.alumno },
      await otraAlumna(e, "Segunda T19"),
      await otraAlumna(e, "Tercera T19"),
    ]
    const temas = [
      (await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad A T19" })).id,
      (await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad B T19" })).id,
    ]

    for (const ronda of [0, 1, 2]) {
      const versiones = await Promise.all(
        alumnas.map(async (a) => (await leerEntregaDb(e.tareaId, a.id))?.version ?? 0),
      )
      const titulo = await cuerpoDeEdicion(e, RUBRICA, { titulo: `Ronda ${String(ronda)}` })
      const respuestas = await Promise.all([
        ...alumnas.map((a, i) =>
          pedir(
            i % 2 === 0 ? e.tokens.maestro : e.tokens.otroMaestro,
            "PUT",
            urlDeCalificar(e, a.id),
            cuerpoConRubrica(e, [ronda + 1, ronda + 2], {
              version: versiones[i],
              comentario: `Ronda ${String(ronda)} ${randomUUID().slice(0, 4)}`,
            }),
          ),
        ),
        // La misma calificación otra vez con la misma versión: una de las dos pierde.
        pedir(
          e.tokens.otroMaestro,
          "PUT",
          urlDeCalificar(e),
          cuerpoConRubrica(e, [0, 0], { version: versiones[0] }),
        ),
        ...alumnas.map((a) =>
          pedir(a.token, "POST", `${urlTarea(e)}/entrega/comentarios`, { texto: "¿Ya está?" }),
        ),
        ...alumnas.map((a) => pedir(a.token, "POST", `${urlTarea(e)}/entrega/anular`)),
        pedir(e.tokens.maestro, "PUT", urlTarea(e), titulo),
        pedir(e.tokens.maestro, "PUT", `/api/clases/${e.claseId}/publicaciones/${e.tareaId}/tema`, {
          temaId: temas[ronda % 2],
        }),
      ])
      for (const r of respuestas) {
        expect(r.statusCode, r.body).toBeLessThan(500)
        expect(r.body).not.toMatch(/deadlock|40P01|23503|P2003|P2028/i)
      }
    }

    // Invariante: hay puntajes si y solo si la entrega está calificada, y nunca de otro criterio.
    const filas = await obtenerDb().entrega.findMany({
      where: { tareaId: e.tareaId },
      select: { estado: true, calificacion: true, _count: { select: { puntajes: true } } },
    })
    expect(filas).toHaveLength(3)
    for (const fila of filas) {
      const calificada = fila.estado === "calificado"
      expect(fila._count.puntajes, JSON.stringify(fila)).toBe(calificada ? 2 : 0)
      expect(fila.calificacion !== null, JSON.stringify(fila)).toBe(calificada)
    }
    expect(await idsDeCriterios(e.tareaId)).toEqual(e.criterios)
  }, 120_000)
})
