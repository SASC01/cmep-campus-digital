import { errorApiSchema } from "@campus/shared"
import Fastify, { type FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { authenticate } from "../src/middleware/authenticate.js"
import { protegido, registrarMiddleware } from "../src/middleware/index.js"
import { requireRole } from "../src/middleware/require-role.js"
import { withAccess } from "../src/middleware/with-access.js"
import { withPasswordGate } from "../src/middleware/with-password-gate.js"
import { withProfile } from "../src/middleware/with-profile.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"

let app: FastifyInstance | undefined
const ids: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const pedir = (url: string, token?: string) =>
  obtenerApp().inject({
    method: "GET",
    url,
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  })

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  // Fuera de /api: la guarda onRoute no aplica y se puede probar la cadena aislada.
  app.get("/prueba/solo-admin", protegido({ roles: ["admin"] }), async () => ({ ok: true }))
  app.get("/prueba/pertenencia", protegido({ pertenencia: "inscripcion" }), async () => ({
    ok: true,
  }))
  await app.ready()
})

afterAll(async () => {
  await borrarUsuariosDePrueba(ids)
  await app?.close()
})

describe("cadena de middleware (orden fijo)", () => {
  it("un estudiante en una ruta de admin recibe 403 ROL_NO_PERMITIDO", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const token = await firmarTokenDePrueba({ usuarioId: usuario.id })

    const respuesta = await pedir("/prueba/solo-admin", token)

    expect(respuesta.statusCode).toBe(403)
    expect(errorApiSchema.parse(respuesta.json()).error.codigo).toBe("ROL_NO_PERMITIDO")
  })

  it("un restringido recibe 403 ACCESO_RESTRINGIDO antes de que se evalúe el rol", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { accesoRestringido: true })
    const token = await firmarTokenDePrueba({ usuarioId: usuario.id })

    const respuesta = await pedir("/prueba/solo-admin", token)

    expect(respuesta.statusCode).toBe(403)
    expect(errorApiSchema.parse(respuesta.json()).error.codigo).toBe("ACCESO_RESTRINGIDO")
  })

  it("restringido y con cambio pendiente recibe CAMBIO_DE_CONTRASENA_REQUERIDO (gate antes de access)", async () => {
    const usuario = await crearUsuarioDePrueba(ids, {
      accesoRestringido: true,
      debeCambiarContrasena: true,
    })
    const token = await firmarTokenDePrueba({ usuarioId: usuario.id })

    const respuesta = await pedir("/prueba/solo-admin", token)

    expect(respuesta.statusCode).toBe(403)
    expect(errorApiSchema.parse(respuesta.json()).error.codigo).toBe(
      "CAMBIO_DE_CONTRASENA_REQUERIDO",
    )
  })

  it("sin token recibe 401 NO_AUTENTICADO antes de tocar la base", async () => {
    const respuesta = await pedir("/prueba/solo-admin")

    expect(respuesta.statusCode).toBe(401)
    expect(errorApiSchema.parse(respuesta.json()).error.codigo).toBe("NO_AUTENTICADO")
  })

  it("un maestro tampoco pasa la ruta de admin: el rol se lee de la base, no del token", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { rol: "maestro" })
    const token = await firmarTokenDePrueba({ usuarioId: usuario.id })

    // La rama positiva de la cadena se cubre con GET /api/me (me.integracion). No se crea un admin
    // de prueba fuera de una transacción: chocaría con el índice de un solo admin (admin-unico).
    const respuesta = await pedir("/prueba/solo-admin", token)
    expect(respuesta.statusCode).toBe(403)
    expect(errorApiSchema.parse(respuesta.json()).error.codigo).toBe("ROL_NO_PERMITIDO")
  })

  it("una ruta con pertenencia responde 501 NO_IMPLEMENTADO hasta el módulo de clases", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const token = await firmarTokenDePrueba({ usuarioId: usuario.id })

    const respuesta = await pedir("/prueba/pertenencia", token)

    expect(respuesta.statusCode).toBe(501)
    expect(errorApiSchema.parse(respuesta.json()).error.codigo).toBe("NO_IMPLEMENTADO")
  })
})

describe("guarda onRoute (M-09)", () => {
  it("una ruta bajo /api sin protegido() hace fallar el arranque, también dentro de un plugin con prefijo", async () => {
    const suelta = Fastify({ logger: false })
    registrarMiddleware(suelta)

    // Fastify ejecuta onRoute al registrar la ruta, así que el error sale del register del plugin
    // (y, en server.ts, de construirApp): la API no llega a escuchar.
    const arranque = async () => {
      await suelta.register(
        async (hijo) => {
          hijo.get("/sin-proteger", async () => ({ ok: true }))
        },
        { prefix: "/api/prueba" },
      )
      await suelta.ready()
    }

    await expect(arranque()).rejects.toThrow(
      "La ruta GET /api/prueba/sin-proteger no pasa por protegido() (AGENTS.md, regla 2)",
    )
  })

  it("una cadena compuesta a mano con los mismos pasos no pasa la guarda: solo cuenta protegido() (T-06)", async () => {
    const amano = Fastify({ logger: false })
    registrarMiddleware(amano)
    const arranque = async () => {
      await amano.register(
        async (hijo) => {
          hijo.get(
            "/a-mano",
            {
              preHandler: [
                authenticate,
                withProfile,
                withPasswordGate(),
                withAccess(),
                requireRole(),
              ],
            },
            async () => ({ ok: true }),
          )
        },
        { prefix: "/api/prueba" },
      )
      await amano.ready()
    }

    await expect(arranque()).rejects.toThrow(
      "La ruta GET /api/prueba/a-mano no pasa por protegido() (AGENTS.md, regla 2)",
    )
  })

  it("protegido() más un hook de ruta que corre antes de la cadena (preValidation) no arranca (T-12)", async () => {
    const conHook = Fastify({ logger: false })
    registrarMiddleware(conHook)
    const arranque = async () => {
      await conHook.register(
        async (hijo) => {
          hijo.get(
            "/con-hook",
            { ...protegido(), preValidation: async () => undefined },
            async () => ({ ok: true }),
          )
        },
        { prefix: "/api/prueba" },
      )
      await conHook.ready()
    }

    await expect(arranque()).rejects.toThrow(
      "La ruta GET /api/prueba/con-hook declara preValidation, que se ejecuta antes de protegido() (AGENTS.md, regla 2)",
    )
  })

  it("una ruta bajo /api con protegido() arranca, y las públicas de la lista también", async () => {
    const protegida = Fastify({ logger: false })
    registrarMiddleware(protegida)
    await protegida.register(
      async (hijo) => {
        hijo.get("/protegida", protegido(), async () => ({ ok: true }))
        hijo.post("/auth/login", async () => ({ ok: true }))
        hijo.get("/salud", async () => ({ ok: true }))
      },
      { prefix: "/api" },
    )

    await expect(protegida.ready()).resolves.toBeDefined()
    await protegida.close()
  })

  it("la guarda está activa en construirApp: una ruta /api añadida sin protegido() impide el ready", async () => {
    const otra = await construirApp({ env: cargarEnv() })
    const arranque = async () => {
      await otra.register(async (hijo) => {
        hijo.get("/api/prueba/otra-sin-proteger", async () => ({ ok: true }))
      })
      await otra.ready()
    }

    await expect(arranque()).rejects.toThrow(
      "La ruta GET /api/prueba/otra-sin-proteger no pasa por protegido() (AGENTS.md, regla 2)",
    )
    // No se cierra: nunca escuchó y su onClose desconectaría el cliente compartido de la base.
  })
})
