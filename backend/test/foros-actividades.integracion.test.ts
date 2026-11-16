import {
  listaCategoriasRespuestaSchema,
  listaTemasRespuestaSchema,
  listaTrabajoRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba } from "./ayudas-auth.js"
import { borrarMovimientosYClasesDePrueba } from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import {
  codigoDe,
  crearEscenarioDeForo,
  crearForoDePrueba,
  HORA_MS,
  mensajeDe,
  pedirForo,
  type EscenarioDeForo,
} from "./ayudas-foros.js"
import {
  crearCategoriaDePrueba,
  crearMaterialConTemaDePrueba,
  crearTareaDePrueba,
  crearTemaDePrueba,
  leerTareaDb,
} from "./ayudas-tareas.js"

// FORO-01b (§D-3.2, §D-3.3, §D-6; E1-4 y E1-9). FORO-1A25 ("Actividades" con conForos=si, los conteos
// de los temas y mover un foro) y FORO-1A26b (el texto del 409 al quitar una categoría con foros).

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

const trabajo = async (e: EscenarioDeForo, consulta: string, token = e.tokenAlumno) => {
  const respuesta = await pedir({
    method: "GET",
    url: `/api/clases/${e.claseId}/trabajo?${consulta}`,
    token,
  })
  expect(respuesta.statusCode, respuesta.body).toBe(200)
  return listaTrabajoRespuestaSchema.parse(respuesta.json())
}

const temas = async (e: EscenarioDeForo, consulta: string) => {
  const respuesta = await pedir({
    method: "GET",
    url: `/api/clases/${e.claseId}/temas${consulta}`,
    token: e.tokenMaestro,
  })
  expect(respuesta.statusCode, respuesta.body).toBe(200)
  return listaTemasRespuestaSchema.parse(respuesta.json())
}

describe("FORO-1A25: Actividades con foros (opt-in)", () => {
  it("FORO-1A25: seccion=actividades no trae foros; con conForos=si los trae mezclados con las tareas, por fecha, con la entrega del alumno y puedeMover", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId })
    const base = Date.now() - 10 * HORA_MS
    const tarea = await crearTareaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      temaId: tema.id,
    })
    await obtenerDb().publicacion.update({
      where: { id: tarea },
      data: { creadoEn: new Date(base) },
      select: { id: true },
    })
    const foro = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      temaId: tema.id,
      creadoEn: new Date(base + HORA_MS),
    })
    const material = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      temaId: tema.id,
    })
    const otroTema = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    await crearEntregaDePrueba({ tareaId: foro, alumnoId: e.alumno.id, conRetraso: true })

    const sinForos = await trabajo(e, `tema=${tema.id}&seccion=actividades`)
    expect(sinForos.elementos.map((x) => x.id)).toEqual([tarea])

    const conForos = await trabajo(e, `tema=${tema.id}&seccion=actividades&conForos=si`)
    expect(conForos.elementos.map((x) => [x.id, x.tipo])).toEqual([
      [foro, "foro"],
      [tarea, "tarea"],
    ])
    expect(conForos.elementos[0]).toMatchObject({
      entrega: { estado: "entregado", conRetraso: true },
      material: null,
      tarea: { puntos: 10 },
      puedeMover: false,
    })
    expect(conForos.elementos.map((x) => x.id)).not.toContain(material)
    expect(conForos.elementos.map((x) => x.id)).not.toContain(otroTema)
    const delMaestro = await trabajo(
      e,
      `tema=${tema.id}&seccion=actividades&conForos=si`,
      e.tokenMaestro,
    )
    expect(delMaestro.elementos.map((x) => [x.puedeMover, x.entrega])).toEqual([
      [true, null],
      [true, null],
    ])
    const sinTema = await trabajo(e, "tema=sin-tema&seccion=actividades&conForos=si")
    expect(sinTema.elementos.map((x) => x.id)).toEqual([otroTema])

    // Paginado: el foro es cursor válido con conForos=si.
    const primera = await trabajo(e, `tema=${tema.id}&seccion=actividades&conForos=si&limite=1`)
    expect(primera.siguienteCursor).toBe(foro)
    const segunda = await trabajo(
      e,
      `tema=${tema.id}&seccion=actividades&conForos=si&limite=1&cursor=${foro}`,
    )
    expect(segunda.elementos.map((x) => x.id)).toEqual([tarea])
  })

  it("FORO-1A25: un foro como cursor sin conForos, conForos sin seccion=actividades o con otro valor responden 400 VALIDACION «conForos: no es válido» (o el del cursor)", async () => {
    const e = await escenario()
    const foro = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const cursor = await pedir({
      method: "GET",
      url: `/api/clases/${e.claseId}/trabajo?tema=sin-tema&seccion=actividades&cursor=${foro}`,
      token: e.tokenMaestro,
    })
    expect(cursor.statusCode).toBe(400)
    expect(codigoDe(cursor)).toBe("VALIDACION")
    for (const consulta of [
      "trabajo?tema=sin-tema&conForos=si",
      "trabajo?tema=sin-tema&seccion=actividades&conForos=no",
      "trabajo?tema=sin-tema&seccion=actividades&conForos=si&conForos=si",
      "temas?conForos=si",
      "temas?seccion=aprendizaje&conForos=si",
      "temas?seccion=actividades&conForos=SI",
    ]) {
      const respuesta = await pedir({
        method: "GET",
        url: `/api/clases/${e.claseId}/${consulta}`,
        token: e.tokenMaestro,
      })
      expect(respuesta.statusCode, consulta).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
      expect(mensajeDe(respuesta), consulta).toBe("conForos: conForos: no es válido")
    }
  })

  it("FORO-1A25: los conteos de los temas: con seccion=actividades sin foros, con conForos=si con foros, y sin sección el total con foros", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId })
    await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id, temaId: tema.id })
    await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id, temaId: tema.id })
    await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      temaId: tema.id,
    })
    const conteo = (lista: Awaited<ReturnType<typeof temas>>) => [
      lista.temas.find((t) => t.id === tema.id)?.elementos,
      lista.sinTema,
    ]
    expect(conteo(await temas(e, "?seccion=actividades"))).toEqual([1, 0])
    expect(conteo(await temas(e, "?seccion=actividades&conForos=si"))).toEqual([2, 1])
    expect(conteo(await temas(e, ""))).toEqual([3, 1])
  })

  it("FORO-1A25: mover un foro de tema sube tareas.version", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId })
    const foro = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const movido = await pedir({
      method: "PUT",
      url: `/api/clases/${e.claseId}/publicaciones/${foro}/tema`,
      token: e.tokenMaestro,
      payload: { temaId: tema.id },
    })
    expect(movido.statusCode, movido.body).toBe(200)
    expect((await leerTareaDb(foro))?.version).toBe(1)
    expect(
      (await obtenerDb().publicacion.findUnique({ where: { id: foro }, select: { temaId: true } }))
        ?.temaId,
    ).toBe(tema.id)
  })
})

describe("FORO-1A26b: quitar una categoría con foros", () => {
  const quitarTodas = (e: EscenarioDeForo) =>
    pedir({
      method: "PUT",
      url: `/api/clases/${e.claseId}/categorias`,
      token: e.tokenMaestro,
      payload: { categorias: [] },
    })

  it("FORO-1A26b: con solo tareas, 409 CATEGORIA_CON_TAREAS con el texto de hoy, letra por letra", async () => {
    const e = await escenario()
    const categoria = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Tareas" })
    await crearTareaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      categoriaId: categoria.id,
    })
    const respuesta = await quitarTodas(e)
    expect(respuesta.statusCode).toBe(409)
    expect(codigoDe(respuesta)).toBe("CATEGORIA_CON_TAREAS")
    expect(mensajeDe(respuesta)).toBe(
      "«Tareas» tiene 1 tarea. Muévelas a otra categoría antes de quitarla.",
    )
  })

  it("FORO-1A26b: con un foro, y con un foro y una tarea, el texto habla de actividades (singular y plural) y nada cambia; GET …/categorias cuenta tareas y foros", async () => {
    const e = await escenario()
    const categoria = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Foros" })
    await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      categoriaId: categoria.id,
    })
    const uno = await quitarTodas(e)
    expect(uno.statusCode).toBe(409)
    expect(codigoDe(uno)).toBe("CATEGORIA_CON_TAREAS")
    expect(mensajeDe(uno)).toBe(
      "«Foros» tiene 1 actividad. Muévelas a otra categoría antes de quitarla.",
    )
    await crearTareaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      categoriaId: categoria.id,
    })
    const dos = await quitarTodas(e)
    expect(mensajeDe(dos)).toBe(
      "«Foros» tiene 2 actividades. Muévelas a otra categoría antes de quitarla.",
    )
    expect(await obtenerDb().categoria.count({ where: { claseId: e.claseId } })).toBe(1)
    const lista = listaCategoriasRespuestaSchema.parse(
      (
        await pedir({
          method: "GET",
          url: `/api/clases/${e.claseId}/categorias`,
          token: e.tokenMaestro,
        })
      ).json(),
    )
    expect(lista.categorias).toEqual([expect.objectContaining({ id: categoria.id, tareas: 2 })])
  })
})
