import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"

// Doble en memoria de adapters/db: la base "no responde" y nadie toca Prisma en esta prueba.
vi.mock("../src/adapters/db/index.js", () => ({
  verificarConexion: async () => false,
  cerrarConexion: async () => undefined,
}))

let app: FastifyInstance | undefined

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await app?.close()
})

describe("GET /api/salud sin base de datos", () => {
  it("responde 503 BASE_DE_DATOS_NO_DISPONIBLE con el formato de error", async () => {
    const respuesta = await obtenerApp().inject({ method: "GET", url: "/api/salud" })

    expect(respuesta.statusCode).toBe(503)
    const cuerpo = errorApiSchema.parse(respuesta.json())
    expect(cuerpo.error.codigo).toBe("BASE_DE_DATOS_NO_DISPONIBLE")
    expect(cuerpo.error.mensaje).toBe("La base de datos no responde.")
  })
})
