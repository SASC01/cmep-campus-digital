import { randomUUID } from "node:crypto"

import {
  errorApiSchema,
  misCalificacionesRespuestaSchema,
  type MisCalificacionesRespuesta,
} from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { calificacionGeneral } from "../src/core/calificaciones/general.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba } from "./ayudas-auth.js"
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

// CALIFICACIONES-01b (CAL-1B05). "Mis calificaciones" por la API (§D-7): la calificación general es la
// de core/ sobre lo calificado del alumno; los cinco filtros (por el estado de su entrega: una
// calificada sin entrega está en "calificadas" y no en "asignadas" ni en "sin-entregar"); el cursor y
// los límites; nunca la entrega ni la calificación de otro alumno, ni la versión. Las fechas límite son
// relativas al reloj real con al menos seis horas de margen.

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

const escenario = async () => {
  const f = randomUUID().slice(0, 8)
  const c = await crearClaseDeGradebook(idsUsuarios, idsClases, f)
  const ahora = Date.now()
  const c1 = await crearCategoriaDePrueba({
    claseId: c.claseId,
    nombre: `Tareas ${f}`,
    peso: 50,
    creadoEn: new Date(ahora - 10_000),
  })
  const c2 = await crearCategoriaDePrueba({
    claseId: c.claseId,
    nombre: `Proyectos ${f}`,
    peso: 50,
    creadoEn: new Date(ahora - 5_000),
  })
  const tarea = (titulo: string, horas: number, categoriaId: string | null) =>
    crearTareaDePrueba({
      claseId: c.claseId,
      autorId: c.maestro.id,
      titulo,
      puntos: 10,
      categoriaId,
      aceptaTardias: false,
      fechaLimite: new Date(ahora + horas * HORA_MS),
    })
  const t = {
    i: await tarea("I", 72, c1.id),
    h: await tarea("H", 48, c2.id),
    g: await tarea("G", 24, null),
    f: await tarea("F", -6, c1.id),
    e: await tarea("E", -12, c2.id),
    b: await tarea("B", -24, c1.id),
    c: await tarea("C", -36, c1.id),
    a: await tarea("A", -48, null),
    d: await tarea("D", -60, c2.id),
  }
  const alumna = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Alumna Mis ${f}`)
  const companero = await inscribirAlumnoDePrueba(idsUsuarios, c.claseId, `Compañero Mis ${f}`)

  // A entregada a tiempo; B con retraso; C calificada (8); D calificada sin entrega (0); E sin fila;
  // F con fila asignado (solo hilo); G sin fila; H entregada; I calificada (5).
  await crearEntregaDePrueba({ tareaId: t.a, alumnoId: alumna.id })
  await crearEntregaDePrueba({ tareaId: t.b, alumnoId: alumna.id, conRetraso: true })
  await crearEntregaDePrueba({
    tareaId: t.c,
    alumnoId: alumna.id,
    estado: "calificado",
    calificacion: 8,
  })
  await crearCalificadaSinEntregaDePrueba({ tareaId: t.d, alumnoId: alumna.id, calificacion: 0 })
  await crearEntregaDePrueba({ tareaId: t.f, alumnoId: alumna.id, estado: "asignado", version: 0 })
  await crearEntregaDePrueba({ tareaId: t.h, alumnoId: alumna.id })
  await crearEntregaDePrueba({
    tareaId: t.i,
    alumnoId: alumna.id,
    estado: "calificado",
    calificacion: 5,
  })
  // El compañero tiene E y G calificadas con 10 y A entregada: nada de eso es de la alumna.
  await crearEntregaDePrueba({
    tareaId: t.e,
    alumnoId: companero.id,
    estado: "calificado",
    calificacion: 10,
  })
  await crearEntregaDePrueba({
    tareaId: t.g,
    alumnoId: companero.id,
    estado: "calificado",
    calificacion: 10,
  })
  await crearEntregaDePrueba({ tareaId: t.a, alumnoId: companero.id })
  return { ...c, c1, c2, t, alumna, companero }
}

const leer = async (
  token: string,
  claseId: string,
  consulta = "",
): Promise<MisCalificacionesRespuesta> => {
  const respuesta = await pedir(token, `/api/clases/${claseId}/mis-calificaciones${consulta}`)
  expect(respuesta.statusCode, respuesta.body).toBe(200)
  expect(respuesta.body).not.toMatch(/version/i)
  return misCalificacionesRespuestaSchema.parse(respuesta.json())
}

// Todas las páginas de un filtro, de dos en dos.
const recorrer = async (token: string, claseId: string, estado: string): Promise<string[]> => {
  const ids: string[] = []
  let cursor: string | null = null
  do {
    const consulta: string =
      cursor === null ? `?estado=${estado}&limite=2` : `?estado=${estado}&limite=2&cursor=${cursor}`
    const pagina = await leer(token, claseId, consulta)
    ids.push(...pagina.tareas.map((tarea) => tarea.id))
    cursor = pagina.siguienteCursor
  } while (cursor !== null)
  return ids
}

describe("Mis calificaciones (CAL-1B05)", () => {
  it("CAL-1B05: general es el cálculo de core/ sobre lo calificado de la alumna (con la calificada sin entrega y sin lo del compañero)", async () => {
    const e = await escenario()
    const mis = await leer(e.alumna.token, e.claseId)
    const esperada = calificacionGeneral({
      categorias: [
        { id: e.c1.id, nombre: e.c1.nombre, peso: 50 },
        { id: e.c2.id, nombre: e.c2.nombre, peso: 50 },
      ],
      agregados: [
        { categoriaId: e.c1.id, obtenidoCentesimas: 1300, posible: 20, tareas: 2 },
        { categoriaId: e.c2.id, obtenidoCentesimas: 0, posible: 10, tareas: 1 },
      ],
    })
    expect(mis.general).toEqual(esperada)
    // (13/20 × 50 + 0/10 × 50) / 100.
    expect(mis.general.porcentaje).toBe(32.5)
    expect(mis.general.modo).toBe("categorias")
  })

  it("CAL-1B05: los cinco filtros, con tareas vencidas y por vencer, entregadas a tiempo y con retraso, y calificadas con y sin entrega", async () => {
    const e = await escenario()
    const { t } = e
    const todas = await leer(e.alumna.token, e.claseId)
    expect(todas.tareas.map((tarea) => tarea.id)).toEqual([
      t.i,
      t.h,
      t.g,
      t.f,
      t.e,
      t.b,
      t.c,
      t.a,
      t.d,
    ])
    expect(todas.siguienteCursor).toBeNull()
    const entregaDe = (id: string) => todas.tareas.find((tarea) => tarea.id === id)?.entrega
    expect(entregaDe(t.a)).toEqual({ estado: "entregado", conRetraso: false, calificacion: null })
    expect(entregaDe(t.b)).toEqual({ estado: "entregado", conRetraso: true, calificacion: null })
    expect(entregaDe(t.c)).toEqual({ estado: "calificado", conRetraso: false, calificacion: 8 })
    expect(entregaDe(t.d)).toEqual({ estado: "calificado", conRetraso: false, calificacion: 0 })
    // E y G: el compañero las tiene calificadas; para la alumna siguen asignadas.
    expect(entregaDe(t.e)).toEqual({ estado: "asignado", conRetraso: false, calificacion: null })
    expect(entregaDe(t.g)).toEqual({ estado: "asignado", conRetraso: false, calificacion: null })
    expect(entregaDe(t.f)).toEqual({ estado: "asignado", conRetraso: false, calificacion: null })
    const primera = todas.tareas[0]
    expect(primera === undefined ? [] : Object.keys(primera).sort()).toEqual([
      "categoria",
      "entrega",
      "fechaLimite",
      "id",
      "puntos",
      "titulo",
    ])
    expect(primera?.categoria).toEqual({ id: e.c1.id, nombre: e.c1.nombre })
    expect(Object.keys(todas).sort()).toEqual(["general", "siguienteCursor", "tareas"])

    const ids = async (estado: string) =>
      (await leer(e.alumna.token, e.claseId, `?estado=${estado}`)).tareas.map((tarea) => tarea.id)
    expect(await ids("todas")).toEqual(todas.tareas.map((tarea) => tarea.id))
    expect(await ids("asignadas")).toEqual([t.g])
    expect(await ids("entregadas")).toEqual([t.h, t.b, t.a])
    expect(await ids("calificadas")).toEqual([t.i, t.c, t.d])
    expect(await ids("sin-entregar")).toEqual([t.f, t.e])
  })

  it("CAL-1B05: el cursor recorre cada filtro sin repetir ni saltar, sirve aunque su tarea no pase el filtro, y uno de otra clase o inexistente responde 400", async () => {
    const e = await escenario()
    const { t } = e
    expect(await recorrer(e.alumna.token, e.claseId, "todas")).toEqual([
      t.i,
      t.h,
      t.g,
      t.f,
      t.e,
      t.b,
      t.c,
      t.a,
      t.d,
    ])
    expect(await recorrer(e.alumna.token, e.claseId, "calificadas")).toEqual([t.i, t.c, t.d])
    expect(await recorrer(e.alumna.token, e.claseId, "entregadas")).toEqual([t.h, t.b, t.a])
    // A (entregada) como cursor de "calificadas": sigue lo calificado más antiguo que ella.
    const desdeA = await leer(e.alumna.token, e.claseId, `?estado=calificadas&cursor=${t.a}`)
    expect(desdeA.tareas.map((tarea) => tarea.id)).toEqual([t.d])

    const otra = await crearClaseDeGradebook(
      idsUsuarios,
      idsClases,
      `otra-${randomUUID().slice(0, 4)}`,
    )
    const deOtraClase = await crearTareaDePrueba({
      claseId: otra.claseId,
      autorId: otra.maestro.id,
    })
    for (const cursor of [deOtraClase, randomUUID()]) {
      const respuesta = await pedir(
        e.alumna.token,
        `/api/clases/${e.claseId}/mis-calificaciones?cursor=${cursor}`,
      )
      expect(respuesta.statusCode, cursor).toBe(400)
      expect(errorApiSchema.parse(respuesta.json()).error).toEqual({
        codigo: "VALIDACION",
        mensaje: "cursor: no es válido",
      })
    }
  })

  it("CAL-1B05: límites (1 a 100) y filtros desconocidos responden 400", async () => {
    const e = await escenario()
    for (const consulta of ["limite=0", "limite=101", "limite=texto", "estado=otras", "cursor=x"]) {
      const respuesta = await pedir(
        e.alumna.token,
        `/api/clases/${e.claseId}/mis-calificaciones?${consulta}`,
      )
      expect(respuesta.statusCode, consulta).toBe(400)
      expect(errorApiSchema.parse(respuesta.json()).error.codigo, consulta).toBe("VALIDACION")
    }
    expect((await leer(e.alumna.token, e.claseId, "?limite=100")).tareas).toHaveLength(9)
    const una = await leer(e.alumna.token, e.claseId, "?limite=1")
    expect(una.tareas.map((tarea) => tarea.id)).toEqual([e.t.i])
    expect(una.siguienteCursor).toBe(e.t.i)
  })

  it("CAL-1B05: el compañero ve solo lo suyo: sus calificaciones y su general, nunca las de la alumna", async () => {
    const e = await escenario()
    const delCompanero = await leer(e.companero.token, e.claseId)
    const entregaDe = (id: string) => delCompanero.tareas.find((tarea) => tarea.id === id)?.entrega
    expect(entregaDe(e.t.e)).toEqual({ estado: "calificado", conRetraso: false, calificacion: 10 })
    expect(entregaDe(e.t.c)).toEqual({ estado: "asignado", conRetraso: false, calificacion: null })
    expect(entregaDe(e.t.d)).toEqual({ estado: "asignado", conRetraso: false, calificacion: null })
    expect(
      delCompanero.tareas.filter((tarea) => tarea.entrega.calificacion !== null).map((x) => x.id),
    ).toEqual([e.t.g, e.t.e])
    // E (Proyectos) 10/10 y G (sin categoría, no cuenta): 100.
    expect(delCompanero.general.porcentaje).toBe(100)
    expect(delCompanero.general.sinCategoria).toEqual({ tareas: 1 })
  })
})
