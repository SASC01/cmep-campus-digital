import { errorApiSchema, tareaRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { COLA_RECORDATORIO_24H } from "../src/core/eventos/avisos-de-clase.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import { borrarMovimientosYClasesDePrueba, crearClaseDePrueba } from "./ayudas-clases.js"
import {
  crearCategoriaDePrueba,
  crearTemaDePrueba,
  cuerpoDeTarea,
  diasDespues,
  leerTareaDb,
  listarCategoriasDb,
  trabajosDeTarea,
} from "./ayudas-tareas.js"

// TAREAS-01b (PR-1B12): concurrencia de las escrituras de tareas (§D-7). Nunca 500 ni 503 (P2028).

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
  maestro: UsuarioDePrueba
  token: string
}

const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  return {
    claseId: clase.id,
    maestro,
    token: await firmarTokenDePrueba({ usuarioId: maestro.id }),
  }
}

const peticion = (
  e: Escenario,
  method: "POST" | "PUT" | "DELETE",
  url: string,
  payload?: InjectOptions["payload"],
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload }),
    headers: { authorization: `Bearer ${e.token}` },
  })

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const crearTareaApi = async (
  e: Escenario,
  cambios: Record<string, unknown> = {},
): Promise<string> => {
  const respuesta = await peticion(
    e,
    "POST",
    `/api/clases/${e.claseId}/tareas`,
    cuerpoDeTarea(cambios),
  )
  expect(respuesta.statusCode, respuesta.body).toBe(201)
  return tareaRespuestaSchema.parse(respuesta.json()).tarea.id
}

const urlTarea = (e: Escenario, id: string): string => `/api/clases/${e.claseId}/tareas/${id}`

const sinErrorDeServidor = (respuestas: LightMyRequestResponse[]): void => {
  for (const respuesta of respuestas) {
    expect(respuesta.statusCode, respuesta.body).toBeLessThan(500)
  }
}

const vivos = async (id: string): Promise<string[]> =>
  (await trabajosDeTarea(COLA_RECORDATORIO_24H, id))
    .filter((t) => t.state === "created")
    .map((t) => t.id)

describe("concurrencia de las tareas (PR-1B12)", () => {
  it("PR-1B12: dos ediciones de fecha simultáneas dejan un solo RECORDATORIO_24H en created y es el de trabajo_id", async () => {
    const e = await escenario()
    const id = await crearTareaApi(e)

    const respuestas = await Promise.all(
      [8, 9].map((dias) =>
        peticion(
          e,
          "PUT",
          urlTarea(e, id),
          cuerpoDeTarea({ fechaLimite: diasDespues(dias).toISOString(), version: 0 }),
        ),
      ),
    )

    // ENTREGAS-01a (lista cerrada (i), Enmienda 3): con la misma versión, una sola gana (P-05).
    sinErrorDeServidor(respuestas)
    expect(respuestas.map((r) => r.statusCode).sort((a, b) => a - b)).toEqual([200, 409])
    for (const respuesta of respuestas.filter((r) => r.statusCode === 409)) {
      expect(codigoDe(respuesta)).toBe("TAREA_MODIFICADA")
    }
    expect(await vivos(id)).toEqual([(await leerTareaDb(id))?.trabajoId])
    expect((await leerTareaDb(id))?.version).toBe(1)
  })

  it("PR-1B12: una ráfaga de diez ediciones de fecha deja un solo recordatorio vivo, el de trabajo_id", async () => {
    const e = await escenario()
    const id = await crearTareaApi(e)

    const respuestas = await Promise.all(
      Array.from({ length: 10 }, (_, k) =>
        peticion(
          e,
          "PUT",
          urlTarea(e, id),
          cuerpoDeTarea({ fechaLimite: diasDespues(6 + k).toISOString(), version: 0 }),
        ),
      ),
    )

    sinErrorDeServidor(respuestas)
    // ENTREGAS-01a (lista cerrada (ii), Enmienda 3): con la misma versión, una sola gana (P-05).
    expect(respuestas.map((r) => r.statusCode).sort((a, b) => a - b)).toEqual([
      200,
      ...Array.from({ length: 9 }, () => 409),
    ])
    for (const respuesta of respuestas.filter((r) => r.statusCode === 409)) {
      expect(codigoDe(respuesta)).toBe("TAREA_MODIFICADA")
    }
    const fila = await leerTareaDb(id)
    expect(await vivos(id)).toEqual([fila?.trabajoId])
    expect(fila?.version).toBe(1)
  })

  it("PR-1B12: editar y borrar a la vez no deja ningún recordatorio vivo", async () => {
    for (let intento = 0; intento < 5; intento += 1) {
      const e = await escenario()
      const id = await crearTareaApi(e)

      const [edicion, borrado] = await Promise.all([
        peticion(
          e,
          "PUT",
          urlTarea(e, id),
          cuerpoDeTarea({ fechaLimite: diasDespues(9).toISOString(), version: 0 }),
        ),
        peticion(e, "DELETE", urlTarea(e, id)),
      ])

      sinErrorDeServidor([edicion, borrado])
      expect(borrado.statusCode, `intento ${String(intento)}`).toBe(204)
      expect([200, 404]).toContain(edicion.statusCode)
      expect(await leerTareaDb(id)).toBeNull()
      expect(await vivos(id)).toEqual([])
    }
  })

  it("PR-1B12: guardar categorías que quita una con la que se crea una tarea: o la tarea existe y el guardado da 409, o el guardado gana y la creación da 404", async () => {
    for (let intento = 0; intento < 5; intento += 1) {
      const e = await escenario()
      const categoria = await crearCategoriaDePrueba({ claseId: e.claseId, peso: 100 })

      const [guardado, creacion] = await Promise.all([
        peticion(e, "PUT", `/api/clases/${e.claseId}/categorias`, { categorias: [] }),
        peticion(
          e,
          "POST",
          `/api/clases/${e.claseId}/tareas`,
          cuerpoDeTarea({ categoriaId: categoria.id }),
        ),
      ])

      sinErrorDeServidor([guardado, creacion])
      if (creacion.statusCode === 201) {
        expect(guardado.statusCode, `intento ${String(intento)}`).toBe(409)
        expect(codigoDe(guardado)).toBe("CATEGORIA_CON_TAREAS")
        expect(await listarCategoriasDb(e.claseId)).toHaveLength(1)
      } else {
        expect(creacion.statusCode, `intento ${String(intento)}`).toBe(404)
        expect(codigoDe(creacion)).toBe("CATEGORIA_NO_ENCONTRADA")
        expect(guardado.statusCode).toBe(200)
        expect(await listarCategoriasDb(e.claseId)).toHaveLength(0)
        expect(await obtenerDb().tarea.count({ where: { claseId: e.claseId } })).toBe(0)
      }
    }
  })

  it("PR-1B12: borrar un tema mientras se crea una tarea con él: la tarea queda sin tema o la creación da 404, nunca 500", async () => {
    for (let intento = 0; intento < 5; intento += 1) {
      const e = await escenario()
      const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })

      const [borrado, creacion] = await Promise.all([
        peticion(e, "DELETE", `/api/clases/${e.claseId}/temas/${tema.id}`),
        peticion(e, "POST", `/api/clases/${e.claseId}/tareas`, cuerpoDeTarea({ temaId: tema.id })),
      ])

      sinErrorDeServidor([borrado, creacion])
      expect(borrado.statusCode, `intento ${String(intento)}`).toBe(204)
      expect([201, 404]).toContain(creacion.statusCode)
      if (creacion.statusCode === 201) {
        const { id } = tareaRespuestaSchema.parse(creacion.json()).tarea
        const publicacion = await obtenerDb().publicacion.findUnique({
          where: { id },
          select: { temaId: true },
        })
        expect(publicacion?.temaId).toBeNull()
      } else {
        expect(codigoDe(creacion)).toBe("TEMA_NO_ENCONTRADO")
        expect(await obtenerDb().tarea.count({ where: { claseId: e.claseId } })).toBe(0)
      }
    }
  })

  it("PR-1B12: editar una tarea con el tema que se borra a la vez termina sin 500 y sin P2003", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const id = await crearTareaApi(e)
    const fechaLimite = (await leerTareaDb(id))?.fechaLimite.toISOString()

    const [borrado, edicion] = await Promise.all([
      peticion(e, "DELETE", `/api/clases/${e.claseId}/temas/${tema.id}`),
      peticion(
        e,
        "PUT",
        urlTarea(e, id),
        cuerpoDeTarea({ fechaLimite, temaId: tema.id, version: 0 }),
      ),
    ])

    sinErrorDeServidor([borrado, edicion])
    expect(borrado.statusCode).toBe(204)
    expect([200, 404]).toContain(edicion.statusCode)
  })
})
