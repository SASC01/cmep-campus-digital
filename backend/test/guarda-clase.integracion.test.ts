import { errorApiSchema } from "@campus/shared"
import Fastify, { type FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { manejoDeErrores } from "../src/handlers/errores.js"
import { protegido, registrarMiddleware } from "../src/middleware/index.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"

const ids: string[] = []
// Solo para inicializar db/auth/cola (efecto colateral, como en middleware-orden.integracion.test.ts):
// las pruebas de este archivo arman sus propias instancias de Fastify sueltas.
let appBase: FastifyInstance | undefined

beforeAll(async () => {
  appBase = await construirApp({ env: cargarEnv() })
})

afterAll(async () => {
  await borrarUsuariosDePrueba(ids)
  await appBase?.close()
})

describe("guarda de rutas: regla de :claseId (§D-0.3)", () => {
  it("PR-A06a: una ruta /api/x/:claseId sin sexto paso no arranca, con el mensaje exacto", async () => {
    const app = Fastify({ logger: false })
    registrarMiddleware(app)
    const arranque = async () => {
      await app.register(
        async (hijo) => {
          hijo.get("/x/:claseId", protegido(), async () => ({ ok: true }))
        },
        { prefix: "/api" },
      )
      await app.ready()
    }

    await expect(arranque()).rejects.toThrow(
      "La ruta GET /api/x/:claseId tiene :claseId y no pasa por requireMembership ni requireOwnership (AGENTS.md, regla 2)",
    )
  })

  it("PR-A06b: con pertenencia 'inscripcion' o 'propiedad', arranca", async () => {
    const conInscripcion = Fastify({ logger: false })
    registrarMiddleware(conInscripcion)
    await conInscripcion.register(
      async (hijo) => {
        hijo.get("/x/:claseId", protegido({ pertenencia: "inscripcion" }), async () => ({
          ok: true,
        }))
      },
      { prefix: "/api" },
    )
    await expect(conInscripcion.ready()).resolves.toBeDefined()
    await conInscripcion.close()

    const conPropiedad = Fastify({ logger: false })
    registrarMiddleware(conPropiedad)
    await conPropiedad.register(
      async (hijo) => {
        hijo.get("/y/:claseId", protegido({ pertenencia: "propiedad" }), async () => ({ ok: true }))
      },
      { prefix: "/api" },
    )
    await expect(conPropiedad.ready()).resolves.toBeDefined()
    await conPropiedad.close()
  })

  it("PR-A06c: /api/clases/:id no arranca (el parámetro de clase se llama siempre :claseId)", async () => {
    const app = Fastify({ logger: false })
    registrarMiddleware(app)
    const arranque = async () => {
      await app.register(
        async (hijo) => {
          hijo.get("/clases/:id", protegido({ pertenencia: "inscripcion" }), async () => ({
            ok: true,
          }))
        },
        { prefix: "/api" },
      )
      await app.ready()
    }

    await expect(arranque()).rejects.toThrow(
      "La ruta GET /api/clases/:id nombra el parámetro de clase distinto de :claseId (AGENTS.md, regla 2)",
    )
  })

  it("PR-A06d: una ruta con pertenencia y sin :claseId arranca, y con token responde 500 CLASE_AUSENTE", async () => {
    const app = Fastify({ logger: false })
    await app.register(manejoDeErrores)
    registrarMiddleware(app)
    await app.register(
      async (hijo) => {
        hijo.get("/sin-clase", protegido({ pertenencia: "inscripcion" }), async () => ({
          ok: true,
        }))
      },
      { prefix: "/api" },
    )
    await app.ready()

    const usuario = await crearUsuarioDePrueba(ids)
    const token = await firmarTokenDePrueba({ usuarioId: usuario.id })
    const respuesta = await app.inject({
      method: "GET",
      url: "/api/sin-clase",
      headers: { authorization: `Bearer ${token}` },
    })

    expect(respuesta.statusCode).toBe(500)
    expect(errorApiSchema.parse(respuesta.json()).error.codigo).toBe("CLASE_AUSENTE")
    await app.close()
  })

  // Segunda pasada de la corrección de ronda 1 (T-02, M-02 de revision.md): el manager comprobó
  // con el find-my-way real del repositorio que estas cuatro formas entregan request.params.claseId
  // y la guarda anterior no las detectaba.
  it("PR-A06f: :claseId en cualquier posición del segmento (no solo al principio) exige el sexto paso", async () => {
    const casos = [
      "/x/:parte-:claseId",
      "/x/pre-:claseId",
      "/x/:parte.:claseId",
      "/x/:claseId.:ext",
    ]
    for (const url of casos) {
      const app = Fastify({ logger: false })
      registrarMiddleware(app)
      const arranque = async () => {
        await app.register(
          async (hijo) => {
            hijo.get(url, protegido(), async () => ({ ok: true }))
          },
          { prefix: "/api" },
        )
        await app.ready()
      }
      await expect(arranque(), url).rejects.toThrow(
        "tiene :claseId y no pasa por requireMembership ni requireOwnership",
      )
      await app.close().catch(() => undefined)
    }
  })

  it("PR-A06g: bajo /clases/, el segmento siguiente solo puede ser exactamente :claseId (ni combinado con otro parámetro)", async () => {
    const app = Fastify({ logger: false })
    registrarMiddleware(app)
    const arranque = async () => {
      await app.register(
        async (hijo) => {
          hijo.get(
            "/clases/:claseId-:parte",
            protegido({ pertenencia: "inscripcion" }),
            async () => ({ ok: true }),
          )
        },
        { prefix: "/api" },
      )
      await app.ready()
    }

    await expect(arranque()).rejects.toThrow(
      "La ruta GET /api/clases/:claseId-:parte nombra el parámetro de clase distinto de :claseId (AGENTS.md, regla 2)",
    )
  })

  it("PR-A06e: un :claseId que no es UUID responde 400 VALIDACION", async () => {
    const app = Fastify({ logger: false })
    await app.register(manejoDeErrores)
    registrarMiddleware(app)
    await app.register(
      async (hijo) => {
        hijo.get("/x/:claseId", protegido({ pertenencia: "inscripcion" }), async () => ({
          ok: true,
        }))
      },
      { prefix: "/api" },
    )
    await app.ready()

    const usuario = await crearUsuarioDePrueba(ids)
    const token = await firmarTokenDePrueba({ usuarioId: usuario.id })
    const respuesta = await app.inject({
      method: "GET",
      url: "/api/x/no-es-un-uuid",
      headers: { authorization: `Bearer ${token}` },
    })

    expect(respuesta.statusCode).toBe(400)
    expect(errorApiSchema.parse(respuesta.json()).error.codigo).toBe("VALIDACION")
    await app.close()
  })
})
