import { randomUUID } from "node:crypto"

import {
  errorApiSchema,
  exportacionDeCalificacionesRespuestaSchema,
  gradebookRespuestaSchema,
  misCalificacionesRespuestaSchema,
  type ExportacionDeCalificacionesRespuesta,
  type GradebookRespuesta,
} from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { leerExportacionDeCalificaciones } from "../src/adapters/db/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import {
  borrarUsuariosDePrueba,
  correoDePrueba,
  desactivarUsuarioDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import {
  crearCalificadaSinEntregaDePrueba,
  crearClaseDeGradebook,
  ejecutorEspiado,
  HORA_MS,
  inscribirAlumnoDePrueba,
  pedirGet,
  unaVezDespuesDe,
} from "./ayudas-gradebook.js"
import { crearCategoriaDePrueba, crearTareaDePrueba } from "./ayudas-tareas.js"

// CALIFICACIONES-02a (CAL2-A03 a CAL2-A07 y CAL2-A10). La exportación por la API y por el adaptador
// (§D-1 a §D-3): quién aparece y con qué correo, que celdas, columnas y porcentajes son los del
// gradebook y los de "Mis calificaciones", las ventanas de alumnos y actividades con sus totales, la
// clase sin alumnos o sin actividades, la instantánea única y el número fijo de sentencias. Las fechas
// límite son relativas al reloj real con al menos una hora de margen.

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

const urlDe = (claseId: string, consulta = ""): string =>
  `/api/clases/${claseId}/calificaciones/exportacion${consulta}`

const leerExportacionDe = async (
  token: string,
  claseId: string,
  consulta = "",
): Promise<ExportacionDeCalificacionesRespuesta> => {
  const respuesta = await pedir(token, urlDe(claseId, consulta))
  expect(respuesta.statusCode, respuesta.body).toBe(200)
  return exportacionDeCalificacionesRespuestaSchema.parse(respuesta.json())
}

const leerGradebookDe = async (
  token: string,
  claseId: string,
  consulta = "",
): Promise<GradebookRespuesta> => {
  const respuesta = await pedir(token, `/api/clases/${claseId}/gradebook${consulta}`)
  expect(respuesta.statusCode, respuesta.body).toBe(200)
  return gradebookRespuestaSchema.parse(respuesta.json())
}

const errorDe = (body: string) => errorApiSchema.parse(JSON.parse(body)).error

const consultaDe = ({
  limite,
  limiteTareas,
  cursor,
  cursorTareas,
}: {
  limite: number
  limiteTareas: number
  cursor: string | null
  cursorTareas: string | null
}): string =>
  [
    `?limite=${String(limite)}&limiteTareas=${String(limiteTareas)}`,
    cursor === null ? "" : `&cursor=${cursor}`,
    cursorTareas === null ? "" : `&cursorTareas=${cursorTareas}`,
  ].join("")

// Una clase con dos categorías (60 y 40), cinco tareas (tres vencidas, una "Sin categoría") y tres
// alumnos inscritos con cuenta activa, más una dada de baja y una desactivada con calificaciones.
// Ana: calificada sin entrega, calificada con retraso y entregada sin calificar. Beto: vencidas sin
// entregar y una asignada con fila. Carla: entregada con retraso y calificadas, una "Sin categoría".
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

  const ana = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Ana Exporta ${f}`)
  const beto = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Beto Exporta ${f}`)
  const carla = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Carla Exporta ${f}`)
  const dora = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Dora Exporta ${f}`)
  const elena = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Elena Exporta ${f}`)

  await crearCalificadaSinEntregaDePrueba({ tareaId: t1, alumnoId: ana.id, calificacion: 8 })
  await crearEntregaDePrueba({
    tareaId: t2,
    alumnoId: ana.id,
    estado: "calificado",
    calificacion: 18,
    conRetraso: true,
  })
  await crearEntregaDePrueba({ tareaId: t3, alumnoId: ana.id })
  await crearEntregaDePrueba({ tareaId: t2, alumnoId: beto.id, estado: "asignado", version: 0 })
  await crearEntregaDePrueba({ tareaId: t4, alumnoId: beto.id })
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

// Una clase sin categorías (por puntos) con una calificada sin entrega, una tardía calificada, una
// vencida sin entregar y una asignada.
const claseDePuntos = async () => {
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
  const asignada = await tarea(24, 10)
  const uno = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Uno Puntos ${f}`)
  const dos = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Dos Puntos ${f}`)
  await crearCalificadaSinEntregaDePrueba({ tareaId: a, alumnoId: uno.id, calificacion: 7 })
  await crearEntregaDePrueba({
    tareaId: b,
    alumnoId: uno.id,
    estado: "calificado",
    calificacion: 15,
    conRetraso: true,
  })
  await crearEntregaDePrueba({ tareaId: asignada, alumnoId: dos.id })
  return { ...c, a, b, vencida, asignada, alumnos: [uno, dos] }
}

// Recorre todas las ventanas (actividades por fuera, alumnos por dentro) con los mismos cursores y
// límites en el gradebook y en la exportación, y compara cada par de respuestas.
const compararConElGradebook = async (
  token: string,
  claseId: string,
  limite: number,
  limiteTareas: number,
): Promise<number> => {
  let cursorTareas: string | null = null
  let ventanas = 0
  do {
    let cursor: string | null = null
    let siguienteTareas: string | null
    do {
      const consulta = consultaDe({ limite, limiteTareas, cursor, cursorTareas })
      const gradebook = await leerGradebookDe(token, claseId, consulta)
      const exportacion = await leerExportacionDe(token, claseId, consulta)
      expect(exportacion.tareas, consulta).toEqual(gradebook.tareas)
      expect(
        exportacion.alumnos.map((fila) => ({
          id: fila.alumno.id,
          nombre: fila.alumno.nombre,
          celdas: fila.celdas,
          porcentaje: fila.porcentaje,
        })),
        consulta,
      ).toEqual(
        gradebook.alumnos.map((fila) => ({
          id: fila.alumno.id,
          nombre: fila.alumno.nombre,
          celdas: fila.celdas,
          porcentaje: fila.porcentaje,
        })),
      )
      expect(exportacion.siguienteCursor, consulta).toBe(gradebook.siguienteCursor)
      expect(exportacion.siguienteCursorTareas, consulta).toBe(gradebook.siguienteCursorTareas)
      expect(exportacion.totalAlumnos, consulta).toBe(gradebook.resumen.totalAlumnos)
      cursor = exportacion.siguienteCursor
      siguienteTareas = exportacion.siguienteCursorTareas
      ventanas += 1
    } while (cursor !== null)
    cursorTareas = siguienteTareas
  } while (cursorTareas !== null)
  return ventanas
}

describe("quién aparece en la exportación (CAL2-A03)", () => {
  it("CAL2-A03: solo los inscritos con cuenta activa de esa clase, con su correo completo; no aparecen la dada de baja, la desactivada ni un alumno de otra clase del mismo maestro, y totalAlumnos los cuenta igual", async () => {
    const e = await claseConCategorias()
    const otra = await crearClaseDeGradebook(idsUsuarios, idsClases, `${ficha()}-otra`)
    const deOtraClase = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Otro Exporta ${ficha()}`,
    })
    await inscribirDePrueba(otra.claseId, deOtraClase.id)
    // El mismo maestro también da la otra clase.
    await obtenerDb().maestroDeClase.create({
      data: { claseId: otra.claseId, maestroId: e.maestro.id },
      select: { claseId: true },
    })

    const x = await leerExportacionDe(e.tokens.maestro, e.claseId)
    expect(x.alumnos.map((fila) => fila.alumno)).toEqual([
      {
        id: e.ana.id,
        nombre: expect.stringMatching(/^Ana Exporta /) as unknown,
        email: e.ana.email,
      },
      {
        id: e.beto.id,
        nombre: expect.stringMatching(/^Beto Exporta /) as unknown,
        email: e.beto.email,
      },
      {
        id: e.carla.id,
        nombre: expect.stringMatching(/^Carla Exporta /) as unknown,
        email: e.carla.email,
      },
    ])
    // El correo completo, sin enmascarar.
    for (const fila of x.alumnos) expect(fila.alumno.email).toMatch(/^[^*]+@pruebas\.local$/)
    const ids = x.alumnos.map((fila) => fila.alumno.id)
    for (const fuera of [e.dora.id, e.elena.id, deOtraClase.id, e.maestro.id]) {
      expect(ids).not.toContain(fuera)
    }
    expect(x.totalAlumnos).toBe(3)
    expect(x.siguienteCursor).toBeNull()
  }, 30_000)
})

describe("el mismo cálculo que el gradebook (CAL2-A04)", () => {
  it("CAL2-A04: en una clase por categorías, cada columna y cada fila (celdas y porcentaje) son las del gradebook con los mismos cursores y límites, y cada porcentaje es la calificación general de «Mis calificaciones»", async () => {
    const e = await claseConCategorias()
    expect(await compararConElGradebook(e.tokens.maestro, e.claseId, 50, 50)).toBe(1)
    expect(await compararConElGradebook(e.tokens.maestro, e.claseId, 2, 2)).toBe(6)
    expect(await compararConElGradebook(e.tokens.admin, e.claseId, 1, 3)).toBe(6)

    const x = await leerExportacionDe(e.tokens.maestro, e.claseId)
    // Los casos que pide el plan están en la respuesta.
    const ana = x.alumnos.find((fila) => fila.alumno.id === e.ana.id)
    const beto = x.alumnos.find((fila) => fila.alumno.id === e.beto.id)
    const celdaDe = (fila: typeof ana, tareaId: string) =>
      fila?.celdas.find((celda) => celda.tareaId === tareaId)
    expect(celdaDe(ana, e.t1)).toEqual({
      tareaId: e.t1,
      estado: "calificado",
      conRetraso: false,
      calificacion: 8,
    })
    expect(celdaDe(ana, e.t2)).toEqual({
      tareaId: e.t2,
      estado: "calificado",
      conRetraso: true,
      calificacion: 18,
    })
    expect(celdaDe(beto, e.t5)?.estado).toBe("asignado")
    expect(celdaDe(beto, e.t3)?.estado).toBe("asignado")
    expect(x.tareas.find((t) => t.id === e.t4)?.categoria).toBeNull()
    expect(ana?.porcentaje).toBe(86.67)

    for (const alumno of [e.ana, e.beto, e.carla]) {
      const fila = x.alumnos.find((f) => f.alumno.id === alumno.id)
      expect(fila, "Precondición: el alumno tiene fila").toBeDefined()
      const respuesta = await pedir(alumno.token, `/api/clases/${e.claseId}/mis-calificaciones`)
      expect(respuesta.statusCode, respuesta.body).toBe(200)
      const mis = misCalificacionesRespuestaSchema.parse(respuesta.json())
      expect(fila?.porcentaje, alumno.email).toBe(mis.general.porcentaje)
    }
  }, 60_000)

  it("CAL2-A04: en una clase por puntos, con una calificada sin entrega, una tardía calificada, una vencida sin entregar y una asignada, la exportación es la del gradebook y cada porcentaje el de «Mis calificaciones»", async () => {
    const e = await claseDePuntos()
    expect(await compararConElGradebook(e.tokens.maestro, e.claseId, 50, 50)).toBe(1)
    expect(await compararConElGradebook(e.tokens.maestro, e.claseId, 1, 3)).toBe(4)

    const x = await leerExportacionDe(e.tokens.maestro, e.claseId)
    expect(x.tareas.every((t) => t.categoria === null)).toBe(true)
    const [uno, dos] = e.alumnos
    if (uno === undefined || dos === undefined) throw new Error("Precondición: dos alumnos")
    // 22 / 30 = 73.33.
    expect(x.alumnos.find((f) => f.alumno.id === uno.id)?.porcentaje).toBe(73.33)
    expect(x.alumnos.find((f) => f.alumno.id === dos.id)?.porcentaje).toBeNull()
    for (const alumno of e.alumnos) {
      const respuesta = await pedir(alumno.token, `/api/clases/${e.claseId}/mis-calificaciones`)
      expect(respuesta.statusCode, respuesta.body).toBe(200)
      const mis = misCalificacionesRespuestaSchema.parse(respuesta.json())
      expect(x.alumnos.find((f) => f.alumno.id === alumno.id)?.porcentaje).toBe(
        mis.general.porcentaje,
      )
    }
  }, 60_000)
})

describe("las ventanas de la exportación (CAL2-A05)", () => {
  // 101 alumnos y 101 actividades sembrados en bloque (sin pasar por argon2 ni por la API): bastan
  // para ver el límite por omisión en las dos dimensiones.
  const claseGrande = async () => {
    const f = ficha()
    const c = await crearClaseDeGradebook(idsUsuarios, idsClases, f)
    const alumnos = Array.from({ length: 101 }, (_, i) => {
      const nombre = `Grande ${String(i).padStart(3, "0")} ${f}`
      return {
        id: randomUUID(),
        email: correoDePrueba("exporta"),
        hashContrasena: "sin-uso-en-esta-prueba",
        nombre,
        nombreBusqueda: nombre.toLowerCase(),
        rol: "estudiante" as const,
      }
    })
    await obtenerDb().usuario.createMany({ data: alumnos })
    idsUsuarios.push(...alumnos.map((a) => a.id))
    await obtenerDb().inscripcion.createMany({
      data: alumnos.map((a) => ({
        claseId: c.claseId,
        usuarioId: a.id,
        origen: "manual" as const,
      })),
    })
    const ahora = Date.now()
    const tareas = Array.from({ length: 101 }, (_, i) => ({
      id: randomUUID(),
      fechaLimite: new Date(ahora + (i + 1) * HORA_MS),
    }))
    await obtenerDb().$transaction(async (tx) => {
      await tx.publicacion.createMany({
        data: tareas.map((t) => ({
          id: t.id,
          claseId: c.claseId,
          autorId: c.maestro.id,
          tipo: "tarea" as const,
          titulo: "Tarea grande",
          texto: "",
        })),
      })
      await tx.tarea.createMany({
        data: tareas.map((t) => ({
          id: t.id,
          claseId: c.claseId,
          fechaLimite: t.fechaLimite,
          puntos: 10,
        })),
      })
    })
    return c
  }

  it("CAL2-A05: limite y limiteTareas valen 100 por omisión; 100 exacto se acepta; 0, 101 y abc responden 400 VALIDACION", async () => {
    const c = await claseGrande()
    const x = await leerExportacionDe(c.tokens.maestro, c.claseId)
    expect(x.alumnos).toHaveLength(100)
    expect(x.tareas).toHaveLength(100)
    expect(x.alumnos.every((fila) => fila.celdas.length === 100)).toBe(true)
    expect(x.siguienteCursor).not.toBeNull()
    expect(x.siguienteCursorTareas).not.toBeNull()
    expect(x.totalAlumnos).toBe(101)
    expect(x.totalTareas).toBe(101)

    const exacto = await leerExportacionDe(
      c.tokens.maestro,
      c.claseId,
      "?limite=100&limiteTareas=100",
    )
    expect(exacto.alumnos).toHaveLength(100)
    expect(exacto.tareas).toHaveLength(100)

    for (const consulta of [
      "limite=0",
      "limite=101",
      "limite=abc",
      "limiteTareas=0",
      "limiteTareas=101",
      "limiteTareas=abc",
    ]) {
      const respuesta = await pedir(c.tokens.maestro, urlDe(c.claseId, `?${consulta}`))
      expect(respuesta.statusCode, consulta).toBe(400)
      expect(errorDe(respuesta.body).codigo, consulta).toBe("VALIDACION")
    }
  }, 60_000)

  it("CAL2-A05: con 3 alumnos y 3 actividades en ventanas de 2 × 2, las cuatro combinaciones dan cada celda una vez, con totalAlumnos y totalTareas 3 en las cuatro y el orden del gradebook (los empates de fecha límite por id); cursores ajenos responden 400 y un cursorTareas en mayúsculas funciona igual", async () => {
    const f = ficha()
    const c = await crearClaseDeGradebook(idsUsuarios, idsClases, f)
    const misma = new Date(Date.now() + 24 * HORA_MS)
    const empatadaA = await crearTareaDePrueba({
      claseId: c.claseId,
      autorId: c.maestro.id,
      fechaLimite: misma,
    })
    const empatadaB = await crearTareaDePrueba({
      claseId: c.claseId,
      autorId: c.maestro.id,
      fechaLimite: misma,
    })
    const antes = await crearTareaDePrueba({
      claseId: c.claseId,
      autorId: c.maestro.id,
      fechaLimite: new Date(misma.getTime() - HORA_MS),
    })
    const alumnos = [
      await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Ana Ventanas ${f}`),
      await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Beto Ventanas ${f}`),
      await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Carla Ventanas ${f}`),
    ]
    for (const alumno of alumnos) {
      await crearEntregaDePrueba({ tareaId: antes, alumnoId: alumno.id })
    }

    const vistas = new Map<string, number>()
    const ordenDeTareas: string[] = []
    const ordenDeAlumnos: string[] = []
    let combinaciones = 0
    let cursorTareas: string | null = null
    do {
      let cursor: string | null = null
      let siguienteTareas: string | null
      do {
        const consulta = consultaDe({ limite: 2, limiteTareas: 2, cursor, cursorTareas })
        const x = await leerExportacionDe(c.tokens.maestro, c.claseId, consulta)
        const g = await leerGradebookDe(c.tokens.maestro, c.claseId, consulta)
        expect(x.totalAlumnos, consulta).toBe(3)
        expect(x.totalTareas, consulta).toBe(3)
        expect(x.tareas.map((t) => t.id)).toEqual(g.tareas.map((t) => t.id))
        expect(x.alumnos.map((a) => a.alumno.id)).toEqual(g.alumnos.map((a) => a.alumno.id))
        if (cursor === null) ordenDeTareas.push(...x.tareas.map((t) => t.id))
        if (cursorTareas === null) ordenDeAlumnos.push(...x.alumnos.map((a) => a.alumno.id))
        for (const fila of x.alumnos) {
          expect(fila.celdas.map((celda) => celda.tareaId)).toEqual(x.tareas.map((t) => t.id))
          for (const celda of fila.celdas) {
            const clave = `${fila.alumno.id}:${celda.tareaId}`
            vistas.set(clave, (vistas.get(clave) ?? 0) + 1)
          }
        }
        cursor = x.siguienteCursor
        siguienteTareas = x.siguienteCursorTareas
        combinaciones += 1
      } while (cursor !== null)
      cursorTareas = siguienteTareas
    } while (cursorTareas !== null)

    expect(combinaciones).toBe(4)
    expect(vistas.size).toBe(9)
    expect([...vistas.values()].every((veces) => veces === 1)).toBe(true)
    expect(ordenDeTareas).toEqual([...[empatadaA, empatadaB].sort().reverse(), antes])
    expect(ordenDeAlumnos).toEqual(alumnos.map((a) => a.id))

    const inexistente = await pedir(c.tokens.maestro, urlDe(c.claseId, `?cursor=${randomUUID()}`))
    expect(inexistente.statusCode).toBe(400)
    expect(errorDe(inexistente.body)).toEqual({
      codigo: "VALIDACION",
      mensaje: "cursor: no es válido",
    })

    const otra = await crearClaseDeGradebook(idsUsuarios, idsClases, `${f}-otra`)
    const deOtraClase = await crearTareaDePrueba({
      claseId: otra.claseId,
      autorId: otra.maestro.id,
    })
    const ajena = await pedir(c.tokens.maestro, urlDe(c.claseId, `?cursorTareas=${deOtraClase}`))
    expect(ajena.statusCode).toBe(400)
    expect(errorDe(ajena.body)).toEqual({
      codigo: "VALIDACION",
      mensaje: "cursorTareas: no es válido",
    })

    const primera = ordenDeTareas[0]
    if (primera === undefined) throw new Error("Precondición: hay tareas")
    const enMinusculas = await leerExportacionDe(
      c.tokens.maestro,
      c.claseId,
      `?limiteTareas=2&cursorTareas=${primera}`,
    )
    const enMayusculas = await leerExportacionDe(
      c.tokens.maestro,
      c.claseId,
      `?limiteTareas=2&cursorTareas=${primera.toUpperCase()}`,
    )
    expect(enMinusculas.tareas.length, "Precondición: la ventana tiene tareas").toBeGreaterThan(0)
    expect(enMayusculas).toEqual(enMinusculas)
  }, 60_000)
})

describe("el nombre de la clase y los vacíos (CAL2-A06)", () => {
  it("CAL2-A06: clase.nombre es el de la clase; sin alumnos, alumnos [] y totalAlumnos 0 con las columnas igual; sin actividades, tareas [] y totalTareas 0 con cada fila sin celdas", async () => {
    const f = ficha()
    const sinAlumnos = await crearClaseDeGradebook(idsUsuarios, idsClases, f)
    const tarea = await crearTareaDePrueba({
      claseId: sinAlumnos.claseId,
      autorId: sinAlumnos.maestro.id,
      titulo: "Única",
    })
    const nombre = `Matemáticas ${f}`
    await obtenerDb().clase.update({
      where: { id: sinAlumnos.claseId },
      data: { nombre },
      select: { id: true },
    })
    const x = await leerExportacionDe(sinAlumnos.tokens.maestro, sinAlumnos.claseId)
    expect(x.clase).toEqual({ nombre })
    expect(x.alumnos).toEqual([])
    expect(x.totalAlumnos).toBe(0)
    expect(x.siguienteCursor).toBeNull()
    expect(x.tareas.map((t) => [t.id, t.titulo])).toEqual([[tarea, "Única"]])
    expect(x.totalTareas).toBe(1)

    const sinTareas = await crearClaseDeGradebook(idsUsuarios, idsClases, `${f}-b`)
    const alumno = await inscribirAlumnoDePrueba(idsUsuarios, sinTareas.claseId, `Sola ${f}`)
    const y = await leerExportacionDe(sinTareas.tokens.admin, sinTareas.claseId)
    expect(y.clase.nombre).toBe("Clase de prueba")
    expect(y.tareas).toEqual([])
    expect(y.totalTareas).toBe(0)
    expect(y.siguienteCursorTareas).toBeNull()
    expect(y.alumnos).toEqual([
      {
        alumno: { id: alumno.id, nombre: `Sola ${f}`, email: alumno.email },
        celdas: [],
        porcentaje: null,
      },
    ])
    expect(y.totalAlumnos).toBe(1)
  }, 30_000)
})

// Las llamadas directas al adaptador: el doble del ejecutor registra cada sentencia y mete una
// escritura de otra conexión después de una concreta.
const paramsDeLaExportacion = (claseId: string) => ({
  claseId,
  cursor: undefined,
  limite: 100,
  cursorTareas: undefined,
  limiteTareas: 100,
  ahora: new Date(),
})

// Tres tareas (T1, la más reciente) y tres alumnos (A a C por nombre); A entregó T1 sin calificar.
const escenarioDeInstantanea = async () => {
  const f = ficha()
  const c = await crearClaseDeGradebook(idsUsuarios, idsClases, f)
  const ahora = Date.now()
  const tareas: string[] = []
  for (let k = 1; k <= 3; k += 1) {
    tareas.push(
      await crearTareaDePrueba({
        claseId: c.claseId,
        autorId: c.maestro.id,
        titulo: `T${String(k)}`,
        puntos: 10,
        fechaLimite: new Date(ahora + (48 - k) * HORA_MS),
      }),
    )
  }
  const alumnos: (UsuarioDePrueba & { token: string })[] = []
  for (const letra of ["A", "B", "C"]) {
    alumnos.push(await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `${letra} Exporta ${f}`))
  }
  const [t1] = tareas
  const [a] = alumnos
  if (!t1 || !a) throw new Error("Precondición: tareas y alumnos")
  const entregaId = await crearEntregaDePrueba({ tareaId: t1, alumnoId: a.id })
  return { ...c, f, t1, a, entregaId }
}

describe("una sola instantánea (CAL2-A07)", () => {
  it("CAL2-A07: una calificación confirmada por otra conexión después de leer las celdas no cambia la celda ni el porcentaje de esa respuesta; la siguiente lectura la ve", async () => {
    const e = await escenarioDeInstantanea()
    const antes = await leerExportacionDeCalificaciones(paramsDeLaExportacion(e.claseId))
    const { gancho, disparado } = unaVezDespuesDe("entrega.findMany", async () => {
      const cambiadas = await obtenerDb().$executeRaw`
        UPDATE entregas SET estado = 'calificado', calificacion = 4, fecha_calificacion = now()
        WHERE id = ${e.entregaId}::uuid`
      expect(cambiadas, "Precondición: el gancho calificó la entrega").toBe(1)
    })
    const x = await leerExportacionDeCalificaciones(
      paramsDeLaExportacion(e.claseId),
      ejecutorEspiado(gancho).ejecutor,
    )
    expect(disparado(), "Precondición: el gancho corrió tras leer las celdas").toBe(true)
    expect(x).toEqual(antes)
    const fila = x.alumnos.find((f) => f.alumno.id === e.a.id)
    expect(fila?.celdas[0]).toEqual({
      tareaId: e.t1,
      estado: "entregado",
      conRetraso: false,
      calificacion: null,
    })
    expect(fila?.porcentaje).toBeNull()

    const despues = await leerExportacionDeCalificaciones(paramsDeLaExportacion(e.claseId))
    const filaDespues = despues.alumnos.find((f) => f.alumno.id === e.a.id)
    expect(filaDespues?.celdas[0]?.calificacion).toBe(4)
    expect(filaDespues?.porcentaje).toBe(40)
  }, 30_000)

  it("CAL2-A07: una inscripción nueva después de leer la página no cambia los alumnos ni totalAlumnos de esa respuesta; la siguiente lectura la ve", async () => {
    const e = await escenarioDeInstantanea()
    const nuevo = await crearAlumnoDePrueba(idsUsuarios, { nombre: `D Exporta ${e.f}` })
    const antes = await leerExportacionDeCalificaciones(paramsDeLaExportacion(e.claseId))
    expect(antes.totalAlumnos, "Precondición (control)").toBe(3)
    const { gancho, disparado } = unaVezDespuesDe("inscripcion.findMany", async () => {
      await inscribirDePrueba(e.claseId, nuevo.id)
    })
    const x = await leerExportacionDeCalificaciones(
      paramsDeLaExportacion(e.claseId),
      ejecutorEspiado(gancho).ejecutor,
    )
    expect(disparado(), "Precondición: el gancho corrió tras leer la página").toBe(true)
    expect(x).toEqual(antes)
    expect(x.totalAlumnos).toBe(x.alumnos.length)

    const despues = await leerExportacionDeCalificaciones(paramsDeLaExportacion(e.claseId))
    expect(despues.totalAlumnos).toBe(4)
    expect(despues.alumnos.map((f) => f.alumno)).toContainEqual({
      id: nuevo.id,
      nombre: `D Exporta ${e.f}`,
      email: nuevo.email,
    })
  }, 30_000)

  it("CAL2-A07: una actividad nueva después de leer la ventana o después del conteo no cambia las columnas ni totalTareas de esa respuesta; la siguiente lectura la ve", async () => {
    const e = await escenarioDeInstantanea()
    let previa = await leerExportacionDeCalificaciones(paramsDeLaExportacion(e.claseId))
    expect(previa.totalTareas, "Precondición (control)").toBe(3)
    for (const llamada of ["tarea.findMany", "tarea.count"]) {
      const { gancho, disparado } = unaVezDespuesDe(llamada, async () => {
        await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
      })
      const x = await leerExportacionDeCalificaciones(
        paramsDeLaExportacion(e.claseId),
        ejecutorEspiado(gancho).ejecutor,
      )
      expect(disparado(), `Precondición: el gancho corrió tras ${llamada}`).toBe(true)
      expect(x, llamada).toEqual(previa)
      expect(x.totalTareas, llamada).toBe(x.tareas.length)
      const despues = await leerExportacionDeCalificaciones(paramsDeLaExportacion(e.claseId))
      expect(despues.totalTareas, llamada).toBe(previa.totalTareas + 1)
      expect(despues.tareas, llamada).toHaveLength(previa.totalTareas + 1)
      previa = despues
    }
  }, 30_000)
})

describe("sin N+1 (CAL2-A10)", () => {
  it("CAL2-A10: leerExportacionDeCalificaciones hace las mismas sentencias con 1, 2 y 30 alumnos y con 1, 2 y 30 actividades, con y sin cursores", async () => {
    const f = ficha()
    // El centinela va primero por nombre: con cursor = centinela, la página trae a los demás.
    const centinela = await crearAlumnoDePrueba(idsUsuarios, { nombre: `0 Centinela ${f}` })
    const lista: UsuarioDePrueba[] = []
    for (let i = 0; i < 30; i += 1) {
      lista.push(
        await crearAlumnoDePrueba(idsUsuarios, { nombre: `N2 ${String(i).padStart(2, "0")} ${f}` }),
      )
    }
    const tamanos = [
      { alumnos: 1, tareas: 1 },
      { alumnos: 2, tareas: 2 },
      { alumnos: 30, tareas: 30 },
      { alumnos: 1, tareas: 30 },
      { alumnos: 30, tareas: 1 },
    ]
    const sinCursores: string[][] = []
    const conCursores: string[][] = []
    for (const tamano of tamanos) {
      const c = await crearClaseDeGradebook(idsUsuarios, idsClases, ficha())
      const ahora = Date.now()
      const categoria = await crearCategoriaDePrueba({ claseId: c.claseId, peso: 100 })
      // La tarea centinela es la más reciente: con cursorTareas = centinela, la ventana trae las demás.
      const tareaCentinela = await crearTareaDePrueba({
        claseId: c.claseId,
        autorId: c.maestro.id,
        fechaLimite: new Date(ahora + 1000 * HORA_MS),
      })
      const ids: string[] = []
      for (let k = 0; k < tamano.tareas; k += 1) {
        ids.push(
          await crearTareaDePrueba({
            claseId: c.claseId,
            autorId: c.maestro.id,
            puntos: 10,
            categoriaId: k % 2 === 0 ? categoria.id : null,
            fechaLimite: new Date(ahora + (k % 3 === 0 ? -1 : 1) * (k + 2) * HORA_MS),
          }),
        )
      }
      const inscritos = lista.slice(0, tamano.alumnos)
      await inscribirDePrueba(c.claseId, centinela.id)
      for (const alumno of inscritos) await inscribirDePrueba(c.claseId, alumno.id)
      await obtenerDb().entrega.createMany({
        data: inscritos.flatMap((alumno) =>
          ids.map((tareaId) => ({
            tareaId,
            alumnoId: alumno.id,
            estado: "calificado" as const,
            fechaEntrega: new Date(),
            calificacion: 7,
            fechaCalificacion: new Date(),
            version: 2,
          })),
        ),
      })

      const sin = ejecutorEspiado()
      const x = await leerExportacionDeCalificaciones(
        paramsDeLaExportacion(c.claseId),
        sin.ejecutor,
      )
      expect(x.alumnos, "Precondición: todas las filas").toHaveLength(tamano.alumnos + 1)
      expect(x.tareas, "Precondición: todas las columnas").toHaveLength(tamano.tareas + 1)
      sinCursores.push(sin.llamadas)

      const con = ejecutorEspiado()
      const y = await leerExportacionDeCalificaciones(
        { ...paramsDeLaExportacion(c.claseId), cursor: centinela.id, cursorTareas: tareaCentinela },
        con.ejecutor,
      )
      expect(y.alumnos, "Precondición: la página sin el centinela").toHaveLength(tamano.alumnos)
      expect(y.tareas, "Precondición: la ventana sin el centinela").toHaveLength(tamano.tareas)
      conCursores.push(con.llamadas)
    }

    expect(sinCursores[0]).toEqual([
      "clase.findUnique",
      "tarea.findMany",
      "inscripcion.findMany",
      "entrega.findMany",
      "categoria.findMany",
      "$queryRaw",
      "$queryRaw",
      "inscripcion.count",
      "tarea.count",
      "usuario.findMany",
    ])
    expect(conCursores[0]).toEqual([
      "clase.findUnique",
      "tarea.findFirst",
      "tarea.findMany",
      "usuario.findUnique",
      "inscripcion.findMany",
      "entrega.findMany",
      "categoria.findMany",
      "$queryRaw",
      "$queryRaw",
      "inscripcion.count",
      "tarea.count",
      "usuario.findMany",
    ])
    for (const [i, tamano] of tamanos.entries()) {
      const etiqueta = `${String(tamano.alumnos)} alumnos y ${String(tamano.tareas)} actividades`
      expect(sinCursores[i], etiqueta).toEqual(sinCursores[0])
      expect(conCursores[i], etiqueta).toEqual(conCursores[0])
    }
  }, 120_000)
})
