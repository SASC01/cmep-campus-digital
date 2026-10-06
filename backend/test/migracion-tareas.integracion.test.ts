import { randomUUID } from "node:crypto"

import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import { borrarMovimientosYClasesDePrueba, crearClaseDePrueba } from "./ayudas-clases.js"
import {
  crearCategoriaDePrueba,
  crearTareaDePrueba,
  crearTemaDePrueba,
  leerTareaDb,
  leerTemaDb,
} from "./ayudas-tareas.js"

// TAREAS-01a (PR-1A08): lo que fijan las dos migraciones (tipo_publicacion_tarea y
// tareas_temas_y_categorias) directamente contra la base: CHECK, llaves foráneas y cascadas.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
}

const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  return { claseId: clase.id, maestro }
}

const insertarPublicacion = (
  e: Escenario,
  datos: { tipo: "anuncio" | "material" | "tarea"; titulo?: string | null; temaId?: string | null },
) =>
  obtenerDb().publicacion.create({
    data: {
      claseId: e.claseId,
      autorId: e.maestro.id,
      tipo: datos.tipo,
      titulo: datos.titulo ?? null,
      texto: "x",
      temaId: datos.temaId ?? null,
    },
    select: { id: true },
  })

describe("migración tareas_temas_y_categorias (PR-1A08)", () => {
  it("PR-1A08: el CHECK de título por tipo rechaza un anuncio con título y un material o una tarea sin título", async () => {
    const e = await escenario()

    await expect(insertarPublicacion(e, { tipo: "anuncio", titulo: "No lleva" })).rejects.toThrow(
      /publicaciones_titulo_segun_tipo/,
    )
    await expect(insertarPublicacion(e, { tipo: "material" })).rejects.toThrow(
      /publicaciones_titulo_segun_tipo/,
    )
    await expect(insertarPublicacion(e, { tipo: "tarea" })).rejects.toThrow(
      /publicaciones_titulo_segun_tipo/,
    )
    expect(await obtenerDb().publicacion.count({ where: { claseId: e.claseId } })).toBe(0)
  })

  it("PR-1A08: el CHECK de título por tipo sigue aceptando un anuncio sin título y un material o una tarea con título", async () => {
    const e = await escenario()

    await insertarPublicacion(e, { tipo: "anuncio" })
    await insertarPublicacion(e, { tipo: "material", titulo: "Guía" })
    await insertarPublicacion(e, { tipo: "tarea", titulo: "Tarea 1" })

    expect(await obtenerDb().publicacion.count({ where: { claseId: e.claseId } })).toBe(3)
  })

  it("PR-1A08: un anuncio con tema falla y un material con tema pasa", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })

    await expect(insertarPublicacion(e, { tipo: "anuncio", temaId: tema.id })).rejects.toThrow(
      /publicaciones_anuncio_sin_tema/,
    )
    await insertarPublicacion(e, { tipo: "material", titulo: "Guía", temaId: tema.id })

    expect(await obtenerDb().publicacion.count({ where: { claseId: e.claseId } })).toBe(1)
  })

  it("PR-1A08: mover un anuncio existente a un tema por SQL también falla", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const anuncio = await insertarPublicacion(e, { tipo: "anuncio" })

    await expect(
      obtenerDb().publicacion.update({
        where: { id: anuncio.id },
        data: { temaId: tema.id },
        select: { id: true },
      }),
    ).rejects.toThrow(/publicaciones_anuncio_sin_tema/)
  })

  it("PR-1A08: un peso de categoría de 0 o 101 falla y de 1 o 100 pasa", async () => {
    const e = await escenario()

    for (const peso of [0, 101, -5]) {
      await expect(
        obtenerDb().categoria.create({ data: { claseId: e.claseId, nombre: "X", peso } }),
        String(peso),
      ).rejects.toThrow(/categorias_peso_entre_1_y_100/)
    }
    for (const peso of [1, 100]) {
      await crearCategoriaDePrueba({ claseId: e.claseId, peso })
    }
    expect(await obtenerDb().categoria.count({ where: { claseId: e.claseId } })).toBe(2)
  })

  it("PR-1A08: los puntos de una tarea de 0 o 1001 fallan y de 1 o 1000 pasan", async () => {
    const e = await escenario()

    for (const puntos of [0, 1001, -1]) {
      await expect(
        crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id, puntos }),
        String(puntos),
      ).rejects.toThrow(/tareas_puntos_entre_1_y_1000/)
    }
    for (const puntos of [1, 1000]) {
      await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id, puntos })
    }
    expect(await obtenerDb().tarea.count({ where: { claseId: e.claseId } })).toBe(2)
    // La publicación de la tarea rechazada se revirtió con su transacción.
    expect(await obtenerDb().publicacion.count({ where: { claseId: e.claseId } })).toBe(2)
  })

  it("PR-1A08: los criterios de rúbrica rechazan puntos máximos fuera de 1 a 1000 y orden negativo, y no repiten orden en una tarea", async () => {
    const e = await escenario()
    const tareaId = await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const criterio = (puntosMax: number, orden: number) =>
      obtenerDb().criterioRubrica.create({
        data: { tareaId, criterio: "Claridad", puntosMax, orden },
        select: { id: true },
      })

    await expect(criterio(0, 0)).rejects.toThrow(/criterios_rubrica_puntos_max_entre_1_y_1000/)
    await expect(criterio(1001, 0)).rejects.toThrow(/criterios_rubrica_puntos_max_entre_1_y_1000/)
    await expect(criterio(5, -1)).rejects.toThrow(/criterios_rubrica_orden_no_negativo/)
    await criterio(5, 0)
    await expect(criterio(5, 0)).rejects.toThrow(/criterios_rubrica_tarea_id_orden_key/)
    expect(await obtenerDb().criterioRubrica.count({ where: { tareaId } })).toBe(1)
  })

  it("PR-1A08: el orden de un tema no puede ser negativo", async () => {
    const e = await escenario()

    await expect(crearTemaDePrueba({ claseId: e.claseId, orden: -1 })).rejects.toThrow(
      /temas_orden_no_negativo/,
    )
    await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
  })

  it("PR-1A08: borrar un tema pone tema_id en nulo en sus publicaciones y no las borra", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const material = await insertarPublicacion(e, {
      tipo: "material",
      titulo: "Guía",
      temaId: tema.id,
    })
    const tareaId = await crearTareaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      temaId: tema.id,
    })

    await obtenerDb().tema.delete({ where: { id: tema.id }, select: { id: true } })

    expect(await leerTemaDb(tema.id)).toBeNull()
    const publicaciones = await obtenerDb().publicacion.findMany({
      where: { id: { in: [material.id, tareaId] } },
      select: { temaId: true },
    })
    expect(publicaciones).toEqual([{ temaId: null }, { temaId: null }])
  })

  it("PR-1A08: borrar una clase con temas, categorías y tareas no falla (NO ACTION) y se lleva todo", async () => {
    const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const clase = await crearClaseDePrueba([], { maestroId: maestro.id })
    const tema = await crearTemaDePrueba({ claseId: clase.id, orden: 0 })
    const categoria = await crearCategoriaDePrueba({ claseId: clase.id, peso: 100 })
    const tareaId = await crearTareaDePrueba({
      claseId: clase.id,
      autorId: maestro.id,
      categoriaId: categoria.id,
      temaId: tema.id,
    })
    await obtenerDb().criterioRubrica.create({
      data: { tareaId, criterio: "Claridad", puntosMax: 10, orden: 0 },
      select: { id: true },
    })

    await obtenerDb().clase.delete({ where: { id: clase.id }, select: { id: true } })

    expect(await leerTareaDb(tareaId)).toBeNull()
    expect(await leerTemaDb(tema.id)).toBeNull()
    expect(await obtenerDb().categoria.count({ where: { id: categoria.id } })).toBe(0)
    expect(await obtenerDb().criterioRubrica.count({ where: { tareaId } })).toBe(0)
    expect(await obtenerDb().publicacion.count({ where: { id: tareaId } })).toBe(0)
  })

  it("PR-1A08: borrar una categoría que tiene tareas falla (NO ACTION) y la tarea conserva su categoría", async () => {
    const e = await escenario()
    const categoria = await crearCategoriaDePrueba({ claseId: e.claseId, peso: 100 })
    const tareaId = await crearTareaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      categoriaId: categoria.id,
    })

    await expect(
      obtenerDb().categoria.delete({ where: { id: categoria.id }, select: { id: true } }),
    ).rejects.toThrow(/tareas_categoria_id_fkey/)

    expect((await leerTareaDb(tareaId))?.categoriaId).toBe(categoria.id)
  })

  it("PR-1A08: borrar la publicación de una tarea borra la tarea y sus criterios", async () => {
    const e = await escenario()
    const tareaId = await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    await obtenerDb().criterioRubrica.create({
      data: { tareaId, criterio: "Claridad", puntosMax: 10, orden: 0 },
      select: { id: true },
    })

    await obtenerDb().publicacion.delete({ where: { id: tareaId }, select: { id: true } })

    expect(await leerTareaDb(tareaId)).toBeNull()
    expect(await obtenerDb().criterioRubrica.count({ where: { tareaId } })).toBe(0)
  })

  it("PR-1A08: una fila de tareas con un id que no es de ninguna publicación falla", async () => {
    const e = await escenario()

    await expect(
      obtenerDb().tarea.create({
        data: {
          id: randomUUID(),
          claseId: e.claseId,
          fechaLimite: new Date(Date.now() + 86_400_000),
          puntos: 10,
        },
        select: { id: true },
      }),
    ).rejects.toThrow(/tareas_id_fkey/)
  })

  it("PR-1A08: una tarea nace con entregas tardías aceptadas y sin trabajo ni categoría", async () => {
    const e = await escenario()
    const tareaId = await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })

    const tarea = await leerTareaDb(tareaId)

    expect(tarea).toMatchObject({ aceptaTardias: true, trabajoId: null, categoriaId: null })
  })
})
