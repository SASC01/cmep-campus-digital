import {
  exportacionDeCalificacionesRespuestaSchema,
  gradebookRespuestaSchema,
  listaTemasRespuestaSchema,
  misCalificacionesRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba } from "./ayudas-auth.js"
import { borrarMovimientosYClasesDePrueba } from "./ayudas-clases.js"
import { archivarClaseDePrueba } from "./ayudas-clases-archivadas.js"
import {
  codigoDe,
  crearEscenarioDeForo,
  crearForoDePrueba,
  cuerpoDeForo,
  HORA_MS,
  mensajeDe,
  pedirForo,
  urlForo,
  type EscenarioDeForo,
} from "./ayudas-foros.js"
import {
  crearCategoriaDePrueba,
  crearMaterialConTemaDePrueba,
  crearTareaDePrueba,
  crearTemaDePrueba,
} from "./ayudas-tareas.js"

// Ataque FORO-01b, ronda 1 (tester). Punto 4 (el opt-in: conForos y conTipo con valores raros, en
// rutas que no los esperan, en una archivada, y sin ellos la respuesta de antes llave por llave con un
// foro en la clase), punto 5 (el texto del 409 de categorías) y punto 6 (temas: renombrar, borrar y
// mover contra editar).

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}
const pedir = pedirForo(obtenerApp)

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen: crearAlmacenEnMemoria() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const escenario = (): Promise<EscenarioDeForo> => crearEscenarioDeForo(idsUsuarios, idsClases)

const leer = (url: string, token: string) => pedir({ method: "GET", url, token })

const leerJson = async (url: string, token: string): Promise<unknown> => {
  const respuesta = await leer(url, token)
  expect(respuesta.statusCode, `${url}: ${respuesta.body}`).toBe(200)
  return respuesta.json()
}

// La clase de un frontend viejo: una tarea, un foro (los dos con calificación) y un material, sin tema.
const claseConLasTres = async () => {
  const e = await escenario()
  const tareaId = await crearTareaDePrueba({
    claseId: e.claseId,
    autorId: e.maestro.id,
    puntos: 10,
    fechaLimite: new Date(Date.now() + 2 * 24 * HORA_MS),
  })
  const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
  const materialId = await crearMaterialConTemaDePrueba({
    claseId: e.claseId,
    autorId: e.maestro.id,
    bloque: "aprendizaje",
  })
  return { e, tareaId, foroId, materialId }
}

const LLAVES_DE_COLUMNA = ["categoria", "fechaLimite", "id", "puntos", "titulo"]

describe("ataque FORO-01b r1 · punto 4: el opt-in", () => {
  it("ATQ-FORO-80: sin conForos ni conTipo, con un foro en la clase, las respuestas que lee un frontend viejo no lo traen o lo traen sin llaves nuevas: Trabajo (con y sin sección), el muro, Recursos, los temas de Actividades, el gradebook, Mis calificaciones y la exportación", async () => {
    const { e, tareaId, foroId, materialId } = await claseConLasTres()
    const C = `/api/clases/${e.claseId}`
    const trabajo = (await leerJson(`${C}/trabajo?tema=sin-tema`, e.tokenAlumno)) as {
      elementos: { id: string; tipo: string }[]
    }
    expect(trabajo.elementos.map((x) => x.id).sort()).toEqual([materialId, tareaId].sort())
    const actividades = (await leerJson(
      `${C}/trabajo?tema=sin-tema&seccion=actividades`,
      e.tokenAlumno,
    )) as { elementos: { id: string; tipo: string }[] }
    expect(actividades.elementos.map((x) => [x.id, x.tipo])).toEqual([[tareaId, "tarea"]])
    const muro = await leerJson(`${C}/publicaciones`, e.tokenAlumno)
    expect(JSON.stringify(muro)).not.toContain(foroId)
    const recursos = await leerJson(`${C}/recursos?bloque=aprendizaje&tema=sin-tema`, e.tokenAlumno)
    expect(JSON.stringify(recursos)).not.toContain(foroId)
    const temas = listaTemasRespuestaSchema.parse(
      await leerJson(`${C}/temas?seccion=actividades`, e.tokenAlumno),
    )
    expect(temas.sinTema).toBe(1)

    const gradebook = gradebookRespuestaSchema.parse(
      await leerJson(`${C}/gradebook`, e.tokenMaestro),
    )
    expect(gradebook.tareas.map((t) => t.id).sort()).toEqual([foroId, tareaId].sort())
    for (const columna of gradebook.tareas) {
      expect(Object.keys(columna).sort()).toEqual(LLAVES_DE_COLUMNA)
    }
    const mis = misCalificacionesRespuestaSchema.parse(
      await leerJson(`${C}/mis-calificaciones`, e.tokenAlumno),
    )
    expect(mis.tareas).toHaveLength(2)
    for (const fila of mis.tareas) {
      expect(Object.keys(fila).sort()).toEqual([...LLAVES_DE_COLUMNA, "entrega"].sort())
    }
    for (const consulta of ["", "?conTipo=si"]) {
      const exportacion = exportacionDeCalificacionesRespuestaSchema.parse(
        await leerJson(`${C}/calificaciones/exportacion${consulta}`, e.tokenMaestro),
      )
      for (const columna of exportacion.tareas) {
        expect(Object.keys(columna).sort(), consulta).toEqual(LLAVES_DE_COLUMNA)
      }
    }
  })

  it("ATQ-FORO-81: conForos con SI, vacío, repetido, sin seccion o con seccion=aprendizaje o docente responde 400 «conForos: …» en Trabajo y en los temas; en Recursos se ignora (200, sin el foro); con seccion=actividades&conForos=si, un material o un foro de otro tema como cursor responden 400", async () => {
    const { e, foroId, materialId } = await claseConLasTres()
    const C = `/api/clases/${e.claseId}`
    const malos = [
      `${C}/trabajo?tema=sin-tema&seccion=actividades&conForos=SI`,
      `${C}/trabajo?tema=sin-tema&seccion=actividades&conForos=`,
      `${C}/trabajo?tema=sin-tema&seccion=actividades&conForos=si&conForos=si`,
      `${C}/trabajo?tema=sin-tema&conForos=si`,
      `${C}/temas?conForos=si`,
      `${C}/temas?seccion=actividades&conForos=SI`,
      `${C}/temas?seccion=aprendizaje&conForos=si`,
      `${C}/temas?seccion=docente&conForos=si`,
      `${C}/temas?seccion=actividades&conForos=si&conForos=si`,
    ]
    for (const url of malos) {
      const respuesta = await leer(url, e.tokenMaestro)
      expect(respuesta.statusCode, `${url}: ${respuesta.body}`).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
      expect(mensajeDe(respuesta), url).toMatch(/^conForos: /)
    }
    const recursos = await leer(
      `${C}/recursos?bloque=aprendizaje&tema=sin-tema&conForos=si`,
      e.tokenMaestro,
    )
    expect(recursos.statusCode, recursos.body).toBe(200)
    expect(recursos.body).not.toContain(foroId)

    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Otro tema" })
    const foroEnTema = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      temaId: tema.id,
    })
    const conForos = `${C}/trabajo?tema=sin-tema&seccion=actividades&conForos=si`
    const bien = (await leerJson(conForos, e.tokenMaestro)) as { elementos: { id: string }[] }
    expect(bien.elementos.map((x) => x.id)).toContain(foroId)
    expect(bien.elementos.map((x) => x.id)).not.toContain(foroEnTema)
    for (const cursor of [materialId, foroEnTema]) {
      const respuesta = await leer(`${conForos}&cursor=${cursor}`, e.tokenMaestro)
      expect(respuesta.statusCode, respuesta.body).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
    }
  })

  it("ATQ-FORO-82: conTipo con SI, vacío o repetido responde 400 «conTipo: …» en el gradebook y en Mis calificaciones; en una clase archivada, el gradebook (maestro) y Mis calificaciones (alumno, lectura-del-alumno) con conTipo=si traen el tipo de cada columna", async () => {
    const { e, tareaId, foroId } = await claseConLasTres()
    const C = `/api/clases/${e.claseId}`
    for (const consulta of ["conTipo=SI", "conTipo=", "conTipo=si&conTipo=si", "conTipo=no"]) {
      for (const [url, token] of [
        [`${C}/gradebook?${consulta}`, e.tokenMaestro],
        [`${C}/mis-calificaciones?${consulta}`, e.tokenAlumno],
      ] as const) {
        const respuesta = await leer(url, token)
        expect(respuesta.statusCode, `${url}: ${respuesta.body}`).toBe(400)
        expect(mensajeDe(respuesta), url).toMatch(/^conTipo: /)
      }
    }
    await archivarClaseDePrueba(e.claseId)
    const esperado = { [tareaId]: "tarea", [foroId]: "foro" }
    const gradebook = gradebookRespuestaSchema.parse(
      await leerJson(`${C}/gradebook?conTipo=si`, e.tokenMaestro),
    )
    expect(Object.fromEntries(gradebook.tareas.map((t) => [t.id, t.tipo]))).toEqual(esperado)
    const mis = misCalificacionesRespuestaSchema.parse(
      await leerJson(`${C}/mis-calificaciones?conTipo=si`, e.tokenAlumno),
    )
    expect(Object.fromEntries(mis.tareas.map((t) => [t.id, t.tipo]))).toEqual(esperado)
  })
})

describe("ataque FORO-01b r1 · punto 5: el 409 de categorías", () => {
  const quitarTodas = (e: EscenarioDeForo) =>
    pedir({
      method: "PUT",
      url: `/api/clases/${e.claseId}/categorias`,
      token: e.tokenMaestro,
      payload: { categorias: [] },
    })

  it("ATQ-FORO-83: con solo un foro, con dos foros y con un foro y una tarea, quitar la categoría responde 409 CATEGORIA_CON_TAREAS con «actividad» o «actividades» y la categoría sigue", async () => {
    const casos: { foros: number; tareas: number; texto: string }[] = [
      { foros: 1, tareas: 0, texto: "tiene 1 actividad. Muévelas" },
      { foros: 2, tareas: 0, texto: "tiene 2 actividades. Muévelas" },
      { foros: 1, tareas: 1, texto: "tiene 2 actividades. Muévelas" },
    ]
    for (const caso of casos) {
      const e = await escenario()
      const categoria = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Foros" })
      for (let i = 0; i < caso.foros; i += 1) {
        await crearForoDePrueba({
          claseId: e.claseId,
          autorId: e.maestro.id,
          categoriaId: categoria.id,
        })
      }
      for (let i = 0; i < caso.tareas; i += 1) {
        await crearTareaDePrueba({
          claseId: e.claseId,
          autorId: e.maestro.id,
          categoriaId: categoria.id,
        })
      }
      const respuesta = await quitarTodas(e)
      expect(respuesta.statusCode, respuesta.body).toBe(409)
      expect(codigoDe(respuesta)).toBe("CATEGORIA_CON_TAREAS")
      expect(mensajeDe(respuesta)).toBe(`«Foros» ${caso.texto} a otra categoría antes de quitarla.`)
      expect(await obtenerDb().categoria.count({ where: { claseId: e.claseId } })).toBe(1)
    }
  }, 60_000)

  it("ATQ-FORO-84: al quitar a la vez una categoría con dos tareas y otra con un foro, el texto es el de una de ellas con su propia cuenta de foros (nunca «A» con actividades); al quitar solo la de tareas y conservar la del foro, «A» tiene 2 tareas", async () => {
    for (let vuelta = 0; vuelta < 3; vuelta += 1) {
      const e = await escenario()
      const a = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "A", peso: 50 })
      const b = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "B", peso: 50 })
      await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id, categoriaId: a.id })
      await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id, categoriaId: a.id })
      await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id, categoriaId: b.id })
      const respuesta = await quitarTodas(e)
      expect(respuesta.statusCode, respuesta.body).toBe(409)
      expect([
        "«A» tiene 2 tareas. Muévelas a otra categoría antes de quitarla.",
        "«B» tiene 1 actividad. Muévelas a otra categoría antes de quitarla.",
      ]).toContain(mensajeDe(respuesta))
      expect(await obtenerDb().categoria.count({ where: { claseId: e.claseId } })).toBe(2)
    }

    // Determinista: se quita solo «A» (dos tareas) y «B», con su foro, se queda. La cuenta de foros es
    // la de «A» (0), no la de la clase (1).
    const e = await escenario()
    const a = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "A", peso: 50 })
    const b = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "B", peso: 50 })
    await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id, categoriaId: a.id })
    await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id, categoriaId: a.id })
    await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id, categoriaId: b.id })
    const soloA = await pedir({
      method: "PUT",
      url: `/api/clases/${e.claseId}/categorias`,
      token: e.tokenMaestro,
      payload: { categorias: [{ id: b.id, nombre: "B", peso: 100 }] },
    })
    expect(soloA.statusCode, soloA.body).toBe(409)
    expect(mensajeDe(soloA)).toBe(
      "«A» tiene 2 tareas. Muévelas a otra categoría antes de quitarla.",
    )
    expect(await obtenerDb().categoria.count({ where: { claseId: e.claseId } })).toBe(2)
  }, 60_000)
})

describe("ataque FORO-01b r1 · punto 6: temas con foros", () => {
  it("ATQ-FORO-85: renombrar un tema con un foro y una tarea responde elementos 2; borrarlo deja el foro sin tema, y los temas cuentan el foro en sinTema sin sección y con conForos, no con seccion=actividades", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad" })
    const foroId = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      temaId: tema.id,
    })
    await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id, temaId: tema.id })
    const renombrado = await pedir({
      method: "PUT",
      url: `/api/clases/${e.claseId}/temas/${tema.id}`,
      token: e.tokenMaestro,
      payload: { nombre: "Unidad renombrada" },
    })
    expect(renombrado.statusCode, renombrado.body).toBe(200)
    expect(renombrado.json()).toMatchObject({ tema: { id: tema.id, elementos: 2 } })
    const borrado = await pedir({
      method: "DELETE",
      url: `/api/clases/${e.claseId}/temas/${tema.id}`,
      token: e.tokenMaestro,
    })
    expect(borrado.statusCode, borrado.body).toBe(204)
    expect(
      (
        await obtenerDb().publicacion.findUnique({
          where: { id: foroId },
          select: { temaId: true },
        })
      )?.temaId,
    ).toBeNull()
    const C = `/api/clases/${e.claseId}/temas`
    const sinTema = async (consulta: string) =>
      listaTemasRespuestaSchema.parse(await leerJson(`${C}${consulta}`, e.tokenAlumno)).sinTema
    expect(await sinTema("")).toBe(2)
    expect(await sinTema("?seccion=actividades")).toBe(1)
    expect(await sinTema("?seccion=actividades&conForos=si")).toBe(2)
  })

  it("ATQ-FORO-86: mover un foro de tema sube su versión, así que guardar el formulario abierto antes responde 409 TAREA_MODIFICADA con el texto del foro y nada cambia; con la versión nueva, se guarda", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad" })
    const creado = await pedir({
      method: "POST",
      url: `/api/clases/${e.claseId}/foros`,
      token: e.tokenMaestro,
      payload: cuerpoDeForo(),
    })
    expect(creado.statusCode, creado.body).toBe(201)
    const foroId = (creado.json() as { foro: { id: string } }).foro.id
    const movido = await pedir({
      method: "PUT",
      url: `/api/clases/${e.claseId}/publicaciones/${foroId}/tema`,
      token: e.tokenAdmin,
      payload: { temaId: tema.id },
    })
    expect(movido.statusCode, movido.body).toBe(200)
    const viejo = await pedir({
      method: "PUT",
      url: urlForo(e.claseId, foroId),
      token: e.tokenMaestro,
      payload: cuerpoDeForo({ titulo: "No debe quedar", version: 0 }),
    })
    expect(viejo.statusCode, viejo.body).toBe(409)
    expect(codigoDe(viejo)).toBe("TAREA_MODIFICADA")
    expect(mensajeDe(viejo)).toContain("este foro")
    const fila = await obtenerDb().publicacion.findUnique({
      where: { id: foroId },
      select: { titulo: true, temaId: true },
    })
    expect(fila).toEqual({ titulo: "Debate de la unidad 2", temaId: tema.id })
    const nuevo = await pedir({
      method: "PUT",
      url: urlForo(e.claseId, foroId),
      token: e.tokenMaestro,
      payload: cuerpoDeForo({ titulo: "Guardado", version: 1, temaId: tema.id }),
    })
    expect(nuevo.statusCode, nuevo.body).toBe(200)
  })
})
