import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { COLA_RECORDATORIO_24H } from "../src/core/eventos/avisos-de-clase.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba } from "./ayudas-auth.js"
import {
  codigoDe,
  crearEscenarioDeCalificar,
  cuerpoConRubrica,
  idsDeCriterios,
  mensajeDe,
  pedirEn,
  urlDeCalificar,
  type CriterioDePrueba,
  type EscenarioDeCalificar,
} from "./ayudas-calificaciones.js"
import { borrarMovimientosYClasesDePrueba } from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import { crearTemaDePrueba, cuerpoDeTarea, diasDespues, trabajosDeTarea } from "./ayudas-tareas.js"

// CALIFICACIONES-01a (CAL-1A16). Editar una tarea calificada (P-04 a, §D-4): lo que no toca puntos ni
// rúbrica se edita como hoy y conserva los ids de los criterios (N-02); cambiar los puntos o la rúbrica
// responde 409 TAREA_CON_CALIFICACIONES sin escribir nada; el orden de errores de §D-4.4; una tarea
// sin calificaciones (también con entregas entregadas) se edita como hoy.

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

const CLARIDAD: CriterioDePrueba = { criterio: "Claridad", puntosMax: 4 }
const CONTENIDO: CriterioDePrueba = { criterio: "Contenido", puntosMax: 5 }
const RUBRICA: CriterioDePrueba[] = [CLARIDAD, CONTENIDO]

// Una tarea con rúbrica y una entrega calificada por la API.
const calificada = async (): Promise<EscenarioDeCalificar> => {
  const e = await crearEscenarioDeCalificar(idsUsuarios, idsClases, {
    rubrica: RUBRICA,
    puntos: 10,
  })
  await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
  const r = await pedir(
    e.tokens.maestro,
    "PUT",
    urlDeCalificar(e),
    cuerpoConRubrica(e, [3, 4], { version: 1 }),
  )
  expect(r.statusCode, r.body).toBe(200)
  return e
}

// El cuerpo del PUT de la tarea con lo que tiene ahora (versión, fecha, puntos y rúbrica) y los cambios.
const cuerpoActual = async (
  e: EscenarioDeCalificar,
  cambios: Record<string, unknown> = {},
): Promise<Record<string, unknown>> => {
  const tarea = await obtenerDb().tarea.findUnique({
    where: { id: e.tareaId },
    select: { version: true, fechaLimite: true, puntos: true, aceptaTardias: true },
  })
  if (tarea === null) throw new Error("Precondición: existe la tarea")
  const publicacion = await obtenerDb().publicacion.findUnique({
    where: { id: e.tareaId },
    select: { titulo: true, texto: true, temaId: true },
  })
  if (publicacion === null) throw new Error("Precondición: existe la publicación")
  const rubrica = await obtenerDb().criterioRubrica.findMany({
    where: { tareaId: e.tareaId },
    orderBy: { orden: "asc" },
    select: { criterio: true, puntosMax: true },
  })
  return cuerpoDeTarea({
    titulo: publicacion.titulo,
    instrucciones: publicacion.texto,
    temaId: publicacion.temaId,
    version: tarea.version,
    fechaLimite: tarea.fechaLimite.toISOString(),
    puntos: tarea.puntos,
    aceptaTardias: tarea.aceptaTardias,
    rubrica,
    archivoIds: [],
    ...cambios,
  })
}

const editar = (e: EscenarioDeCalificar, cuerpo: Record<string, unknown>) =>
  pedir(e.tokens.maestro, "PUT", `/api/clases/${e.claseId}/tareas/${e.tareaId}`, cuerpo)

// Foto de lo que editar puede escribir: tarea, publicación, criterios, puntajes, archivos y trabajos.
const foto = async (e: EscenarioDeCalificar) => {
  const db = obtenerDb()
  return {
    tarea: await db.tarea.findUnique({ where: { id: e.tareaId } }),
    publicacion: await db.publicacion.findUnique({ where: { id: e.tareaId } }),
    criterios: await db.criterioRubrica.findMany({
      where: { tareaId: e.tareaId },
      orderBy: { orden: "asc" },
    }),
    puntajes: (
      await db.puntajeRubrica.findMany({
        where: { entrega: { tareaId: e.tareaId } },
        orderBy: { criterioId: "asc" },
        select: { entregaId: true, criterioId: true, puntos: true },
      })
    ).map((p) => ({ ...p, puntos: p.puntos.toString() })),
    archivos: await db.archivo.findMany({ where: { claseId: e.claseId }, orderBy: { id: "asc" } }),
    trabajos: await trabajosDeTarea(COLA_RECORDATORIO_24H, e.tareaId),
  }
}

describe("editar una tarea calificada (CAL-1A16)", () => {
  it("CAL-1A16: cambiar el título, las instrucciones, la fecha o el tema responde 200 y conserva los ids de los criterios y los puntajes", async () => {
    const e = await calificada()
    const criterios = await idsDeCriterios(e.tareaId)
    const puntajes = (await foto(e)).puntajes
    const { id: temaId } = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad 1" })

    for (const cambio of [
      { titulo: "Ensayo corregido" },
      { instrucciones: "Ahora con bibliografía." },
      { fechaLimite: diasDespues(3).toISOString() },
      { temaId },
    ]) {
      const r = await editar(e, await cuerpoActual(e, cambio))
      expect(r.statusCode, `${JSON.stringify(cambio)} → ${r.body}`).toBe(200)
      expect(await idsDeCriterios(e.tareaId)).toEqual(criterios)
      expect((await foto(e)).puntajes).toEqual(puntajes)
    }
    expect(await obtenerDb().publicacion.findUnique({ where: { id: e.tareaId } })).toMatchObject({
      titulo: "Ensayo corregido",
      texto: "Ahora con bibliografía.",
      temaId,
    })
  })

  it("CAL-1A16: cambiar los puntos o la rúbrica responde 409 TAREA_CON_CALIFICACIONES sin escribir nada (tarea, publicación, criterios, puntajes, archivos, trabajo_id y trabajos)", async () => {
    const e = await calificada()
    const antes = await foto(e)

    for (const cambio of [
      { puntos: 20 },
      { rubrica: [{ criterio: "Claridad", puntosMax: 4 }] },
      { rubrica: [...RUBRICA, { criterio: "Forma", puntosMax: 1 }] },
      { rubrica: [{ criterio: "Claridad y orden", puntosMax: 4 }, CONTENIDO] },
      { rubrica: [{ criterio: "Claridad", puntosMax: 6 }, CONTENIDO] },
      { rubrica: [CONTENIDO, CLARIDAD] },
      { rubrica: [] },
      // Junto con un cambio permitido, tampoco escribe el permitido.
      { titulo: "Otro título", puntos: 15, fechaLimite: diasDespues(4).toISOString() },
    ]) {
      const r = await editar(e, await cuerpoActual(e, cambio))
      expect(r.statusCode, `${JSON.stringify(cambio)} → ${r.body}`).toBe(409)
      expect(codigoDe(r)).toBe("TAREA_CON_CALIFICACIONES")
      expect(mensajeDe(r)).toBe(
        "Esta tarea ya tiene calificaciones: no puedes cambiar sus puntos ni su rúbrica. Lo demás sí se puede editar.",
      )
    }
    expect(await foto(e)).toEqual(antes)
  })

  it("CAL-1A16: el orden de errores de §D-4.4: una versión vieja con la rúbrica distinta responde 409 TAREA_MODIFICADA", async () => {
    const e = await calificada()
    const antes = await foto(e)
    const cuerpo = await cuerpoActual(e, { puntos: 20 })

    const r = await editar(e, { ...cuerpo, version: Number(cuerpo.version) + 1 })

    expect(r.statusCode, r.body).toBe(409)
    expect(codigoDe(r)).toBe("TAREA_MODIFICADA")
    expect(await foto(e)).toEqual(antes)
  })

  it("CAL-1A16: una tarea sin calificaciones (también con una entrega entregada) se edita como hoy: la rúbrica distinta se reemplaza y la idéntica conserva sus ids (N-02)", async () => {
    const e = await crearEscenarioDeCalificar(idsUsuarios, idsClases, {
      rubrica: RUBRICA,
      puntos: 10,
    })
    await crearEntregaDePrueba({ tareaId: e.tareaId, alumnoId: e.alumno.id })
    const originales = await idsDeCriterios(e.tareaId)

    const identica = await editar(e, await cuerpoActual(e, { titulo: "Mismo criterio" }))
    expect(identica.statusCode, identica.body).toBe(200)
    expect(await idsDeCriterios(e.tareaId)).toEqual(originales)

    const puntos = await editar(e, await cuerpoActual(e, { puntos: 50 }))
    expect(puntos.statusCode, puntos.body).toBe(200)
    expect(await idsDeCriterios(e.tareaId)).toEqual(originales)

    const distinta = await editar(
      e,
      await cuerpoActual(e, { rubrica: [{ criterio: "Único", puntosMax: 10 }] }),
    )
    expect(distinta.statusCode, distinta.body).toBe(200)
    const nuevos = await idsDeCriterios(e.tareaId)
    expect(nuevos).toHaveLength(1)
    expect(originales).not.toContain(nuevos[0])
    expect(await obtenerDb().tarea.findUnique({ where: { id: e.tareaId } })).toMatchObject({
      puntos: 50,
    })
  })

  it("CAL-1A16: mover de tema una tarea calificada sigue funcionando (no mira calificaciones)", async () => {
    const e = await calificada()
    const { id: temaId } = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad 2" })
    const r = await pedir(
      e.tokens.maestro,
      "PUT",
      `/api/clases/${e.claseId}/publicaciones/${e.tareaId}/tema`,
      { temaId },
    )
    expect(r.statusCode, r.body).toBe(200)
    expect(await idsDeCriterios(e.tareaId)).toEqual(e.criterios)
  })
})
