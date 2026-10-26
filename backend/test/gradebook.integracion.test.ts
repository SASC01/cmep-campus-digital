import { randomUUID } from "node:crypto"

import {
  errorApiSchema,
  gradebookRespuestaSchema,
  misCalificacionesRespuestaSchema,
  type GradebookRespuesta,
} from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, desactivarUsuarioDePrueba } from "./ayudas-auth.js"
import { borrarMovimientosYClasesDePrueba } from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import {
  crearCalificadaSinEntregaDePrueba,
  crearClaseDeGradebook,
  HORA_MS,
  inscribirAlumnoDePrueba,
  pedirGet,
} from "./ayudas-gradebook.js"
import { crearCategoriaDePrueba, crearTareaDePrueba } from "./ayudas-tareas.js"

// CALIFICACIONES-01b (CAL-1B01, CAL-1B02, CAL-1B07). El gradebook por la API (§D-6): columnas,
// celdas, porcentajes, vencidas, motivos y el resumen de toda la clase; la paginación de las dos
// dimensiones; y que el porcentaje de un alumno es el mismo en su fila y en "Mis calificaciones".
// Las fechas límite son relativas al reloj real con al menos una hora de margen.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const pedir = pedirGet(obtenerApp)

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen: crearAlmacenEnMemoria() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const ficha = (): string => randomUUID().slice(0, 8)

const leerGradebookDe = async (
  token: string,
  claseId: string,
  consulta = "",
): Promise<GradebookRespuesta> => {
  const respuesta = await pedir(token, `/api/clases/${claseId}/gradebook${consulta}`)
  expect(respuesta.statusCode, respuesta.body).toBe(200)
  return gradebookRespuestaSchema.parse(respuesta.json())
}

const codigoDe = (body: string): string => errorApiSchema.parse(JSON.parse(body)).error.codigo

// Una clase con dos categorías (60 y 40), cinco tareas (tres vencidas, una "Sin categoría") y tres
// alumnos inscritos con cuenta activa, más una dada de baja y una desactivada con calificaciones.
const claseConCategorias = async () => {
  const f = ficha()
  const c = await crearClaseDeGradebook(idsUsuarios, idsClases, f)
  const ahora = Date.now()
  const c1 = await crearCategoriaDePrueba({
    claseId: c.claseId,
    nombre: `Tareas ${f}`,
    peso: 60,
    creadoEn: new Date(ahora - 10_000),
  })
  const c2 = await crearCategoriaDePrueba({
    claseId: c.claseId,
    nombre: `Exámenes ${f}`,
    peso: 40,
    creadoEn: new Date(ahora - 5_000),
  })
  const tarea = (titulo: string, horas: number, puntos: number, categoriaId: string | null) =>
    crearTareaDePrueba({
      claseId: c.claseId,
      autorId: c.maestro.id,
      titulo,
      puntos,
      categoriaId,
      aceptaTardias: false,
      fechaLimite: new Date(ahora + horas * HORA_MS),
    })
  const t1 = await tarea("T1", -72, 10, c1.id)
  const t2 = await tarea("T2", -48, 20, c1.id)
  const t3 = await tarea("T3", -24, 50, c2.id)
  const t4 = await tarea("T4", 48, 10, null)
  const t5 = await tarea("T5", 72, 100, c2.id)

  const ana = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Ana Gradebook ${f}`)
  const beto = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Beto Gradebook ${f}`)
  const carla = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Carla Gradebook ${f}`)
  const dora = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Dora Gradebook ${f}`)
  const elena = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Elena Gradebook ${f}`)

  // Ana: T1 calificada sin entrega (8/10), T2 calificada con retraso (18/20), T3 entregada sin
  // calificar; T4 y T5 sin fila.
  await crearCalificadaSinEntregaDePrueba({ tareaId: t1, alumnoId: ana.id, calificacion: 8 })
  await crearEntregaDePrueba({
    tareaId: t2,
    alumnoId: ana.id,
    estado: "calificado",
    calificacion: 18,
    conRetraso: true,
  })
  await crearEntregaDePrueba({ tareaId: t3, alumnoId: ana.id })
  // Beto: nada calificado; T2 con fila asignado (solo hilo), T1 y T3 sin fila; T4 entregada.
  await crearEntregaDePrueba({ tareaId: t2, alumnoId: beto.id, estado: "asignado", version: 0 })
  await crearEntregaDePrueba({ tareaId: t4, alumnoId: beto.id })
  // Carla: T1 entregada con retraso, T2 10/20, T3 20/50, T4 (sin categoría) 10/10.
  await crearEntregaDePrueba({ tareaId: t1, alumnoId: carla.id, conRetraso: true })
  await crearEntregaDePrueba({
    tareaId: t2,
    alumnoId: carla.id,
    estado: "calificado",
    calificacion: 10,
  })
  await crearEntregaDePrueba({
    tareaId: t3,
    alumnoId: carla.id,
    estado: "calificado",
    calificacion: 20,
  })
  await crearEntregaDePrueba({
    tareaId: t4,
    alumnoId: carla.id,
    estado: "calificado",
    calificacion: 10,
  })
  // Dora (dada de baja) y Elena (desactivada), con calificaciones que se quedan en la base.
  await crearEntregaDePrueba({
    tareaId: t3,
    alumnoId: dora.id,
    estado: "calificado",
    calificacion: 50,
  })
  await crearEntregaDePrueba({
    tareaId: t3,
    alumnoId: elena.id,
    estado: "calificado",
    calificacion: 0,
  })
  await obtenerDb().inscripcion.delete({
    where: { claseId_usuarioId: { claseId: c.claseId, usuarioId: dora.id } },
  })
  await desactivarUsuarioDePrueba(elena.id)

  return { ...c, c1, c2, t1, t2, t3, t4, t5, ana, beto, carla, dora, elena }
}

describe("gradebook: datos (CAL-1B01)", () => {
  it("CAL-1B01: columnas en orden (fecha_limite DESC, id DESC), celdas en el orden de las columnas, porcentaje por categorías, vencidas, motivos y el resumen de toda la clase sin dados de baja ni desactivados", async () => {
    const e = await claseConCategorias()
    const g = await leerGradebookDe(e.tokens.maestro, e.claseId)

    expect(g.tareas.map((t) => t.id)).toEqual([e.t5, e.t4, e.t3, e.t2, e.t1])
    expect(g.tareas.map((t) => [t.titulo, t.puntos, t.categoria?.id ?? null])).toEqual([
      ["T5", 100, e.c2.id],
      ["T4", 10, null],
      ["T3", 50, e.c2.id],
      ["T2", 20, e.c1.id],
      ["T1", 10, e.c1.id],
    ])
    expect(g.tareas[0]?.categoria).toEqual({ id: e.c2.id, nombre: e.c2.nombre })
    expect(g.siguienteCursorTareas).toBeNull()

    // Ni Dora (dada de baja) ni Elena (desactivada) aparecen.
    expect(g.alumnos.map((a) => a.alumno.id)).toEqual([e.ana.id, e.beto.id, e.carla.id])
    expect(g.siguienteCursor).toBeNull()
    const [ana, beto, carla] = g.alumnos
    if (ana === undefined || beto === undefined || carla === undefined) {
      throw new Error("Precondición: tres filas")
    }

    const sinFila = { estado: "asignado", conRetraso: false, calificacion: null }
    expect(ana.celdas).toEqual([
      { tareaId: e.t5, ...sinFila },
      { tareaId: e.t4, ...sinFila },
      { tareaId: e.t3, estado: "entregado", conRetraso: false, calificacion: null },
      { tareaId: e.t2, estado: "calificado", conRetraso: true, calificacion: 18 },
      // Calificada sin entrega (P-03 c′): calificado, sin retraso y con su calificación.
      { tareaId: e.t1, estado: "calificado", conRetraso: false, calificacion: 8 },
    ])
    // Solo cuenta "Tareas": 26/30. La calificada sin entrega no es vencida sin entregar.
    expect(ana.porcentaje).toBe(86.67)
    expect(ana.vencidasSinEntregar).toBe(0)
    expect(ana.motivosDeRiesgo).toEqual([])

    expect(beto.celdas).toEqual([
      { tareaId: e.t5, ...sinFila },
      { tareaId: e.t4, estado: "entregado", conRetraso: false, calificacion: null },
      { tareaId: e.t3, ...sinFila },
      { tareaId: e.t2, ...sinFila },
      { tareaId: e.t1, ...sinFila },
    ])
    expect(beto.porcentaje).toBeNull()
    expect(beto.vencidasSinEntregar).toBe(3)
    expect(beto.motivosDeRiesgo).toEqual(["vencidas"])

    expect(carla.celdas.map((c) => [c.estado, c.conRetraso, c.calificacion])).toEqual([
      ["asignado", false, null],
      ["calificado", false, 10],
      ["calificado", false, 20],
      ["calificado", false, 10],
      ["entregado", true, null],
    ])
    // (10/20 × 60 + 20/50 × 40) / 100 = 46; T4 ("Sin categoría") no cuenta.
    expect(carla.porcentaje).toBe(46)
    expect(carla.vencidasSinEntregar).toBe(0)
    expect(carla.motivosDeRiesgo).toEqual(["promedio"])

    // Promedio de los alumnos con calificaciones: (86.67 + 46) / 2 = 66.335 → 66.34.
    expect(g.resumen).toEqual({
      modo: "categorias",
      totalAlumnos: 3,
      promedioDeLaClase: 66.34,
      alumnosEnRiesgo: 2,
    })

    // Las calificaciones de la dada de baja y de la desactivada siguen en la base.
    expect(
      await obtenerDb().entrega.count({
        where: { tareaId: e.t3, alumnoId: { in: [e.dora.id, e.elena.id] }, estado: "calificado" },
      }),
    ).toBe(2)
  })

  it("CAL-1B01: el resumen y los datos de cada fila no dependen de la página que se pide", async () => {
    const e = await claseConCategorias()
    const completa = await leerGradebookDe(e.tokens.maestro, e.claseId)
    const filas: GradebookRespuesta["alumnos"] = []
    let cursor: string | null = null
    do {
      const consulta: string =
        cursor === null ? "?limite=1&limiteTareas=2" : `?limite=1&limiteTareas=2&cursor=${cursor}`
      const pagina = await leerGradebookDe(e.tokens.maestro, e.claseId, consulta)
      expect(pagina.resumen).toEqual(completa.resumen)
      expect(pagina.alumnos).toHaveLength(1)
      expect(pagina.tareas.map((t) => t.id)).toEqual([e.t5, e.t4])
      filas.push(...pagina.alumnos)
      cursor = pagina.siguienteCursor
    } while (cursor !== null)
    expect(
      filas.map((f) => [f.alumno.id, f.porcentaje, f.vencidasSinEntregar, f.motivosDeRiesgo]),
    ).toEqual(
      completa.alumnos.map((f) => [
        f.alumno.id,
        f.porcentaje,
        f.vencidasSinEntregar,
        f.motivosDeRiesgo,
      ]),
    )
  })

  it("CAL-1B01: una clase sin categorías califica por puntos (modo puntos) y la tarea vencida hace una hora cuenta como vencida sin entregar", async () => {
    const f = ficha()
    const c = await crearClaseDeGradebook(idsUsuarios, idsClases, f)
    const ahora = Date.now()
    const tarea = (horas: number, puntos: number) =>
      crearTareaDePrueba({
        claseId: c.claseId,
        autorId: c.maestro.id,
        puntos,
        fechaLimite: new Date(ahora + horas * HORA_MS),
      })
    const a = await tarea(-3, 10)
    const b = await tarea(-2, 20)
    const vencida = await tarea(-1, 5)
    const alumno = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Uno Puntos ${f}`)
    await crearEntregaDePrueba({
      tareaId: a,
      alumnoId: alumno.id,
      estado: "calificado",
      calificacion: 7,
    })
    await crearEntregaDePrueba({
      tareaId: b,
      alumnoId: alumno.id,
      estado: "calificado",
      calificacion: 15,
    })

    const g = await leerGradebookDe(c.tokens.maestro, c.claseId)
    expect(g.tareas.map((t) => t.id)).toEqual([vencida, b, a])
    expect(g.tareas.every((t) => t.categoria === null)).toBe(true)
    const [fila] = g.alumnos
    // 22 / 30 = 73.33.
    expect(fila?.porcentaje).toBe(73.33)
    expect(fila?.vencidasSinEntregar).toBe(1)
    expect(fila?.motivosDeRiesgo).toEqual([])
    expect(g.resumen).toEqual({
      modo: "puntos",
      totalAlumnos: 1,
      promedioDeLaClase: 73.33,
      alumnosEnRiesgo: 0,
    })
  })
})

describe("gradebook: paginación (CAL-1B02)", () => {
  it("CAL-1B02: las filas siguen el cursor del roster y un cursor inexistente responde 400", async () => {
    const e = await claseConCategorias()
    const ids: string[] = []
    let cursor: string | null = null
    do {
      const consulta: string = cursor === null ? "?limite=1" : `?limite=1&cursor=${cursor}`
      const pagina = await leerGradebookDe(e.tokens.maestro, e.claseId, consulta)
      ids.push(...pagina.alumnos.map((a) => a.alumno.id))
      cursor = pagina.siguienteCursor
    } while (cursor !== null)
    expect(ids).toEqual([e.ana.id, e.beto.id, e.carla.id])

    const inexistente = await pedir(
      e.tokens.maestro,
      `/api/clases/${e.claseId}/gradebook?cursor=${randomUUID()}`,
    )
    expect(inexistente.statusCode).toBe(400)
    expect(codigoDe(inexistente.body)).toBe("VALIDACION")
  })

  it("CAL-1B02: las ventanas de tareas resuelven los empates de fecha límite por id sin repetir ni saltar tareas; un cursorTareas de otra clase o inexistente responde 400", async () => {
    const f = ficha()
    const c = await crearClaseDeGradebook(idsUsuarios, idsClases, f)
    await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Alumna Ventanas ${f}`)
    // Cinco tareas con la misma fecha límite al milisegundo, una antes y una después.
    const misma = new Date(Date.now() + 24 * HORA_MS)
    const nueva = (fechaLimite: Date) =>
      crearTareaDePrueba({ claseId: c.claseId, autorId: c.maestro.id, fechaLimite })
    const empatadas = []
    for (let i = 0; i < 5; i += 1) empatadas.push(await nueva(misma))
    const despues = await nueva(new Date(misma.getTime() + HORA_MS))
    const antes = await nueva(new Date(misma.getTime() - HORA_MS))
    const esperadas = [despues, ...[...empatadas].sort().reverse(), antes]

    const vistas: string[] = []
    let cursorTareas: string | null = null
    let ventanas = 0
    do {
      const consulta: string =
        cursorTareas === null ? "?limiteTareas=2" : `?limiteTareas=2&cursorTareas=${cursorTareas}`
      const ventana = await leerGradebookDe(c.tokens.maestro, c.claseId, consulta)
      expect(ventana.tareas.length).toBeLessThanOrEqual(2)
      // Las celdas de cada fila van en el orden de las columnas de su ventana.
      expect(ventana.alumnos[0]?.celdas.map((celda) => celda.tareaId)).toEqual(
        ventana.tareas.map((t) => t.id),
      )
      vistas.push(...ventana.tareas.map((t) => t.id))
      cursorTareas = ventana.siguienteCursorTareas
      ventanas += 1
    } while (cursorTareas !== null)
    expect(ventanas).toBe(4)
    expect(vistas).toEqual(esperadas)

    const otra = await crearClaseDeGradebook(idsUsuarios, idsClases, `${f}-otra`)
    const deOtraClase = await crearTareaDePrueba({
      claseId: otra.claseId,
      autorId: otra.maestro.id,
    })
    for (const cursor of [deOtraClase, randomUUID()]) {
      const respuesta = await pedir(
        c.tokens.maestro,
        `/api/clases/${c.claseId}/gradebook?cursorTareas=${cursor}`,
      )
      expect(respuesta.statusCode, cursor).toBe(400)
      expect(errorApiSchema.parse(respuesta.json()).error).toEqual({
        codigo: "VALIDACION",
        mensaje: "cursorTareas: no es válido",
      })
    }
  })

  it("CAL-1B02: límites fuera de rango o que no son números responden 400 (filas de 1 a 50, tareas de 1 a 50)", async () => {
    const c = await crearClaseDeGradebook(idsUsuarios, idsClases, ficha())
    for (const consulta of [
      "limite=0",
      "limite=51",
      "limite=texto",
      "limiteTareas=0",
      "limiteTareas=51",
      "limiteTareas=texto",
      "cursorTareas=no-es-un-id",
      "cursor=no-es-un-id",
    ]) {
      const respuesta = await pedir(
        c.tokens.maestro,
        `/api/clases/${c.claseId}/gradebook?${consulta}`,
      )
      expect(respuesta.statusCode, consulta).toBe(400)
      expect(codigoDe(respuesta.body), consulta).toBe("VALIDACION")
    }
    for (const consulta of ["limite=1", "limite=50", "limiteTareas=1", "limiteTareas=50"]) {
      const respuesta = await pedir(
        c.tokens.maestro,
        `/api/clases/${c.claseId}/gradebook?${consulta}`,
      )
      expect(respuesta.statusCode, consulta).toBe(200)
    }
  })
})

describe("el mismo número en los dos lados (CAL-1B07)", () => {
  it("CAL-1B07: el porcentaje de cada alumno en «Mis calificaciones» es el de su fila del gradebook", async () => {
    const e = await claseConCategorias()
    const g = await leerGradebookDe(e.tokens.maestro, e.claseId)
    for (const alumno of [e.ana, e.beto, e.carla]) {
      const fila = g.alumnos.find((a) => a.alumno.id === alumno.id)
      const respuesta = await pedir(alumno.token, `/api/clases/${e.claseId}/mis-calificaciones`)
      expect(respuesta.statusCode, respuesta.body).toBe(200)
      const mis = misCalificacionesRespuestaSchema.parse(respuesta.json())
      expect(fila, "Precondición: el alumno tiene fila").toBeDefined()
      expect(mis.general.porcentaje).toBe(fila?.porcentaje)
      expect(mis.general.modo).toBe(g.resumen.modo)
    }
    const carla = misCalificacionesRespuestaSchema.parse(
      (await pedir(e.carla.token, `/api/clases/${e.claseId}/mis-calificaciones`)).json(),
    )
    expect(carla.general.porcentaje).toBe(46)
  })
})
