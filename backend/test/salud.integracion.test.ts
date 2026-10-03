import { errorApiSchema, saludRespuestaSchema } from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { AppError } from "../src/core/errores.js"
import { protegido } from "../src/middleware/index.js"
import { firmarTokenDePrueba } from "./ayudas-auth.js"

// Precondición: la base desechable de test/global-setup.ts (Testcontainers).
let app: FastifyInstance | undefined

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })

  // M-15 (CHORE-02): la guarda revisa toda ruta, así que las de prueba llevan protegido() y se
  // piden con el token del admin de la base desechable.
  app.get("/api/prueba/app-error", protegido({ roles: ["admin"] }), async () => {
    throw new AppError("PRUEBA", "mensaje", 418)
  })
  app.get("/api/prueba/error-comun", protegido({ roles: ["admin"] }), async () => {
    throw new Error("boom")
  })

  await app.ready()

  const respuesta = await app.inject({ method: "GET", url: "/api/salud" })
  if (respuesta.statusCode !== 200) {
    throw new Error(
      "La base de pruebas no responde en DATABASE_URL (test/global-setup.ts). Revisa que Docker Desktop siga encendido.",
    )
  }
})

afterAll(async () => {
  await app?.close()
})

// El admin es único por base (índice parcial): se usa el que sembró seed:admin.
const tokenDelAdmin = async (): Promise<string> => {
  const admin = await obtenerDb().usuario.findFirst({
    where: { rol: "admin" },
    select: { id: true },
  })
  expect(admin, "la base desechable debe tener el admin que crea seed:admin").not.toBeNull()
  if (!admin) throw new Error("Precondición: falta el admin de la base desechable")
  return firmarTokenDePrueba({ usuarioId: admin.id })
}

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
    const respuesta = await obtenerApp().inject({
      method: "GET",
      url: "/api/prueba/app-error",
      headers: { authorization: `Bearer ${await tokenDelAdmin()}` },
    })

    expect(respuesta.statusCode).toBe(418)
    const cuerpo = errorApiSchema.parse(respuesta.json())
    expect(cuerpo.error.codigo).toBe("PRUEBA")
    expect(cuerpo.error.mensaje).toBe("mensaje")
  })

  it("responde 500 ERROR_INTERNO sin filtrar el mensaje original", async () => {
    const respuesta = await obtenerApp().inject({
      method: "GET",
      url: "/api/prueba/error-comun",
      headers: { authorization: `Bearer ${await tokenDelAdmin()}` },
    })

    expect(respuesta.statusCode).toBe(500)
    const cuerpo = errorApiSchema.parse(respuesta.json())
    expect(cuerpo.error.codigo).toBe("ERROR_INTERNO")
    expect(cuerpo.error.mensaje).not.toContain("boom")
    expect(respuesta.body).not.toContain("boom")
    expect(respuesta.body).not.toContain("stack")
  })
})
