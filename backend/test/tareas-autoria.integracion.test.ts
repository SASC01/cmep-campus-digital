import {
  errorApiSchema,
  listaPublicacionesRespuestaSchema,
  tareaRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { COLA_RECORDATORIO_24H, COLA_TAREA_CREADA } from "../src/core/eventos/avisos-de-clase.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearClaseDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { cuerpoDeTarea, leerTareaDb, trabajosDeTarea } from "./ayudas-tareas.js"

// TAREAS-01b (PR-1B09): autoría al editar y borrar tareas (P-04 b, S-09) contra la API.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

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
  a: UsuarioDePrueba
  b: UsuarioDePrueba
  tokenA: string
  tokenB: string
  tokenAdmin: string
}

// Una clase con dos maestros, A y B, y el admin.
const escenario = async (): Promise<Escenario> => {
  const a = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestro A" })
  const b = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestro B" })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: a.id, maestroIds: [a.id, b.id] })
  return {
    claseId: clase.id,
    a,
    b,
    tokenA: await firmarTokenDePrueba({ usuarioId: a.id }),
    tokenB: await firmarTokenDePrueba({ usuarioId: b.id }),
    tokenAdmin: await tokenDelAdminDePrueba(),
  }
}

const peticion = (opciones: {
  method: "GET" | "POST" | "PUT" | "DELETE"
  url: string
  token: string
  payload?: InjectOptions["payload"]
}): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: opciones.method,
    url: opciones.url,
    ...(opciones.payload === undefined ? {} : { payload: opciones.payload }),
    headers: { authorization: `Bearer ${opciones.token}` },
  })

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const crearComo = async (e: Escenario, token: string): Promise<string> => {
  const respuesta = await peticion({
    method: "POST",
    url: `/api/clases/${e.claseId}/tareas`,
    token,
    payload: cuerpoDeTarea({ titulo: "Original" }),
  })
  expect(respuesta.statusCode, respuesta.body).toBe(201)
  return tareaRespuestaSchema.parse(respuesta.json()).tarea.id
}

const urlTarea = (e: Escenario, id: string): string => `/api/clases/${e.claseId}/tareas/${id}`

const editar = async (e: Escenario, id: string, token: string, titulo = "Editada") => {
  const fila = await leerTareaDb(id)
  const fechaLimite = fila?.fechaLimite.toISOString()
  return peticion({
    method: "PUT",
    url: urlTarea(e, id),
    token,
    payload: cuerpoDeTarea({ titulo, fechaLimite, version: fila?.version }),
  })
}

const borrar = (e: Escenario, id: string, token: string) =>
  peticion({ method: "DELETE", url: urlTarea(e, id), token })

const tituloDe = async (id: string): Promise<string | null | undefined> =>
  (await obtenerDb().publicacion.findUnique({ where: { id }, select: { titulo: true } }))?.titulo

const estadosDeTrabajos = async (id: string): Promise<string[]> => [
  ...(await trabajosDeTarea(COLA_RECORDATORIO_24H, id)).map((t) => `recordatorio:${t.state}`),
  ...(await trabajosDeTarea(COLA_TAREA_CREADA, id)).map((t) => `creada:${t.state}`),
]

const retirar = async (e: Escenario, maestroId: string): Promise<void> => {
  await obtenerDb().maestroDeClase.delete({
    where: { claseId_maestroId: { claseId: e.claseId, maestroId } },
    select: { claseId: true },
  })
}

describe("autoría de las tareas (PR-1B09)", () => {
  it("PR-1B09: un maestro contra la tarea del otro maestro, 403 al editar y al borrar, sin escribir y con el trabajo igual", async () => {
    const e = await escenario()
    const id = await crearComo(e, e.tokenA)
    const antes = await estadosDeTrabajos(id)

    const editada = await editar(e, id, e.tokenB)
    const borrada = await borrar(e, id, e.tokenB)

    expect(editada.statusCode).toBe(403)
    expect(codigoDe(editada)).toBe("EDICION_NO_PERMITIDA")
    expect(borrada.statusCode).toBe(403)
    expect(codigoDe(borrada)).toBe("BORRADO_NO_PERMITIDO")
    expect(await tituloDe(id)).toBe("Original")
    expect(await leerTareaDb(id)).not.toBeNull()
    expect(await estadosDeTrabajos(id)).toEqual(antes)
  })

  it("PR-1B09: un maestro contra la tarea del admin, 403 al editar y al borrar, sin escribir y con el trabajo igual", async () => {
    const e = await escenario()
    const id = await crearComo(e, e.tokenAdmin)
    const antes = await estadosDeTrabajos(id)

    for (const token of [e.tokenA, e.tokenB]) {
      const editada = await editar(e, id, token)
      const borrada = await borrar(e, id, token)
      expect(editada.statusCode).toBe(403)
      expect(codigoDe(editada)).toBe("EDICION_NO_PERMITIDA")
      expect(borrada.statusCode).toBe(403)
      expect(codigoDe(borrada)).toBe("BORRADO_NO_PERMITIDO")
    }
    expect(await tituloDe(id)).toBe("Original")
    expect(await estadosDeTrabajos(id)).toEqual(antes)
  })

  it("PR-1B09: el autor edita y borra la suya", async () => {
    const e = await escenario()
    const id = await crearComo(e, e.tokenA)

    const editada = await editar(e, id, e.tokenA)
    const borrada = await borrar(e, id, e.tokenA)

    expect(editada.statusCode, editada.body).toBe(200)
    expect(borrada.statusCode).toBe(204)
  })

  it("PR-1B09: un maestro contra la tarea de un maestro retirado de la clase pasa al editar y al borrar", async () => {
    const e = await escenario()
    const paraEditar = await crearComo(e, e.tokenA)
    const paraBorrar = await crearComo(e, e.tokenA)
    await retirar(e, e.a.id)

    const editada = await editar(e, paraEditar, e.tokenB)
    const borrada = await borrar(e, paraBorrar, e.tokenB)

    expect(editada.statusCode, editada.body).toBe(200)
    expect(await tituloDe(paraEditar)).toBe("Editada")
    expect(borrada.statusCode).toBe(204)
    expect(await leerTareaDb(paraBorrar)).toBeNull()
  })

  it("PR-1B09: si el maestro retirado vuelve a la clase, el otro maestro vuelve a no poder", async () => {
    const e = await escenario()
    const id = await crearComo(e, e.tokenA)
    await retirar(e, e.a.id)
    await obtenerDb().maestroDeClase.create({
      data: { claseId: e.claseId, maestroId: e.a.id },
      select: { claseId: true },
    })

    const editada = await editar(e, id, e.tokenB)

    expect(editada.statusCode).toBe(403)
    expect(codigoDe(editada)).toBe("EDICION_NO_PERMITIDA")
  })

  it("PR-1B09: el admin edita la de un maestro (403 EDICION_NO_PERMITIDA) y la borra (204); edita la suya", async () => {
    const e = await escenario()
    const deMaestro = await crearComo(e, e.tokenA)
    const deAdmin = await crearComo(e, e.tokenAdmin)

    const editaAjena = await editar(e, deMaestro, e.tokenAdmin)
    const editaPropia = await editar(e, deAdmin, e.tokenAdmin)
    const borraAjena = await borrar(e, deMaestro, e.tokenAdmin)
    const borraPropia = await borrar(e, deAdmin, e.tokenAdmin)

    expect(editaAjena.statusCode).toBe(403)
    expect(codigoDe(editaAjena)).toBe("EDICION_NO_PERMITIDA")
    expect(editaPropia.statusCode, editaPropia.body).toBe(200)
    expect(borraAjena.statusCode).toBe(204)
    expect(borraPropia.statusCode).toBe(204)
  })

  // actor × autor: los banderines del detalle y del muro coinciden con lo que de verdad pasa.
  type Actor = "autor" | "otro maestro" | "admin"
  type Autor = "maestro en la clase" | "maestro retirado" | "admin"
  const CELDAS: [Actor, Autor][] = [
    ["autor", "maestro en la clase"],
    ["otro maestro", "maestro en la clase"],
    ["admin", "maestro en la clase"],
    ["otro maestro", "maestro retirado"],
    ["admin", "maestro retirado"],
    ["otro maestro", "admin"],
    ["admin", "admin"],
  ]

  it("PR-1B09: puedeEditar y puedeBorrar del detalle y del muro coinciden con el resultado real en cada actor y autor", async () => {
    for (const [actor, autor] of CELDAS) {
      const e = await escenario()
      // "autor" es el maestro A salvo que el autor sea el admin (el actor del mismo nombre es el admin).
      const tokenDelAutor = autor === "admin" ? e.tokenAdmin : e.tokenA
      const tokenDelActor = {
        autor: autor === "admin" ? e.tokenAdmin : e.tokenA,
        "otro maestro": e.tokenB,
        admin: e.tokenAdmin,
      }[actor]
      const id = await crearComo(e, tokenDelAutor)
      if (autor === "maestro retirado") await retirar(e, e.a.id)
      const etiqueta = `${actor} frente a ${autor}`

      const detalle = tareaRespuestaSchema.parse(
        (await peticion({ method: "GET", url: urlTarea(e, id), token: tokenDelActor })).json(),
      ).tarea
      const muro = listaPublicacionesRespuestaSchema
        .parse(
          (
            await peticion({
              method: "GET",
              url: `/api/clases/${e.claseId}/publicaciones`,
              token: tokenDelActor,
            })
          ).json(),
        )
        .publicaciones.find((p) => p.id === id)
      const editada = await editar(e, id, tokenDelActor)
      const borrada = await borrar(e, id, tokenDelActor)

      expect(detalle.puedeEditar, etiqueta).toBe(editada.statusCode === 200)
      expect(editada.statusCode, etiqueta).toBe(detalle.puedeEditar ? 200 : 403)
      expect(detalle.puedeBorrar, etiqueta).toBe(borrada.statusCode === 204)
      expect(borrada.statusCode, etiqueta).toBe(detalle.puedeBorrar ? 204 : 403)
      expect(muro?.puedeBorrar, etiqueta).toBe(detalle.puedeBorrar)
    }
  }, 120_000)

  it("PR-1B09: un maestro de otra clase recibe 403 SIN_ACCESO_A_LA_CLASE, no EDICION_NO_PERMITIDA", async () => {
    const e = await escenario()
    const otra = await escenario()
    const id = await crearComo(e, e.tokenA)

    const editada = await peticion({
      method: "PUT",
      url: urlTarea(e, id),
      token: otra.tokenA,
      payload: cuerpoDeTarea({ version: 0 }),
    })
    const borrada = await borrar(e, id, otra.tokenB)

    expect(editada.statusCode).toBe(403)
    expect(codigoDe(editada)).toBe("SIN_ACCESO_A_LA_CLASE")
    expect(codigoDe(borrada)).toBe("SIN_ACCESO_A_LA_CLASE")
    expect(await tituloDe(id)).toBe("Original")
  })
})
