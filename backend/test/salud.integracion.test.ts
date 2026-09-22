import { errorApiSchema, saludRespuestaSchema } from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { AppError } from "../src/core/errores.js"

// Precondición: infra levantado (docker compose up -d en infra/) y backend/.env presente.
let app: FastifyInstance | undefined

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })

  app.get("/prueba/app-error", async () => {
    throw new AppError("PRUEBA", "mensaje", 418)
  })
  app.get("/prueba/error-comun", async () => {
    throw new Error("boom")
  })

  await app.ready()

  const respuesta = await app.inject({ method: "GET", url: "/api/salud" })
  if (respuesta.statusCode !== 200) {
    throw new Error(
      "PostgreSQL de infra no responde en DATABASE_URL. Levanta infra: docker compose up -d en infra/",
    )
  }
})

afterAll(async () => {
  await app?.close()
})

describe("GET /api/salud", () => {
  it("responde 200 con JSON válido según saludRespuestaSchema", async () => {
    const respuesta = await obtenerApp().inject({ method: "GET", url: "/api/salud" })

    expect(respuesta.statusCode).toBe(200)
    expect(respuesta.headers["content-type"]).toContain("application/json")
    expect(saludRespuestaSchema.safeParse(respuesta.json()).success).toBe(true)
  })
})

describe("formato de error", () => {
  it("responde 404 NO_ENCONTRADO para una ruta inexistente", async () => {
    const respuesta = await obtenerApp().inject({ method: "GET", url: "/api/no-existe" })

    expect(respuesta.statusCode).toBe(404)
    const cuerpo = errorApiSchema.parse(respuesta.json())
    expect(cuerpo.error.codigo).toBe("NO_ENCONTRADO")
  })

  it("traduce un AppError a su estado y código", async () => {
    const respuesta = await obtenerApp().inject({ method: "GET", url: "/prueba/app-error" })

    expect(respuesta.statusCode).toBe(418)
    const cuerpo = errorApiSchema.parse(respuesta.json())
    expect(cuerpo.error.codigo).toBe("PRUEBA")
    expect(cuerpo.error.mensaje).toBe("mensaje")
  })

  it("responde 500 ERROR_INTERNO sin filtrar el mensaje original", async () => {
    const respuesta = await obtenerApp().inject({ method: "GET", url: "/prueba/error-comun" })

    expect(respuesta.statusCode).toBe(500)
    const cuerpo = errorApiSchema.parse(respuesta.json())
    expect(cuerpo.error.codigo).toBe("ERROR_INTERNO")
    expect(cuerpo.error.mensaje).not.toContain("boom")
    expect(respuesta.body).not.toContain("boom")
    expect(respuesta.body).not.toContain("stack")
  })
})
