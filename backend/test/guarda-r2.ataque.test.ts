import Fastify, { type FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { inicializarAuth } from "../src/adapters/auth/index.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv } from "../src/config/env.js"
import { manejoDeErrores } from "../src/handlers/errores.js"
import { protegido, registrarMiddleware } from "../src/middleware/index.js"

// Ataques del Tester (AUTH-01, ronda 2) contra la guarda de rutas ampliada (corrección de T-06).
// Apps de Fastify sueltas con registrarMiddleware (como la prueba del Programador): sin base.

const abiertas: FastifyInstance[] = []

const nuevaApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({ logger: false })
  await app.register(manejoDeErrores)
  registrarMiddleware(app)
  abiertas.push(app)
  return app
}

type Registro = (app: FastifyInstance) => void

// "arranca" si la app arranca con las rutas dadas; si no, el mensaje del error que lo impidió.
const arranca = async (registrar: Registro, prefijo?: string): Promise<string> => {
  const app = await nuevaApp()
  try {
    await app.register(
      async (hijo) => {
        registrar(hijo)
      },
      prefijo === undefined ? {} : { prefix: prefijo },
    )
    await app.ready()
    return "arranca"
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

const ok = async () => ({ datos: "privados" })

beforeAll(async () => {
  await inicializarAuth(opcionesDeAuth(cargarEnv()))
})

afterAll(async () => {
  await Promise.allSettled(abiertas.map((app) => app.close()))
})

describe("ataque (ronda 2): la guarda acepta todo lo legítimo", () => {
  it.each([
    ["sin opciones", {}],
    ["roles admin", { roles: ["admin"] as const }],
    ["roles maestro y admin", { roles: ["maestro", "admin"] as const }],
    ["permitirRestringido", { permitirRestringido: true }],
    ["permitirCambioPendiente", { permitirCambioPendiente: true }],
    ["pertenencia inscripcion", { pertenencia: "inscripcion" as const }],
    ["pertenencia propiedad", { pertenencia: "propiedad" as const }],
    [
      "todas a la vez",
      {
        roles: ["maestro"] as const,
        permitirRestringido: true,
        permitirCambioPendiente: true,
        pertenencia: "propiedad" as const,
      },
    ],
  ])("protegido(%s) arranca bajo /api (GET, POST, PUT, PATCH, DELETE)", async (_, opciones) => {
    expect(
      await arranca((hijo) => {
        hijo.get("/x", protegido(opciones), ok)
        hijo.post("/x", protegido(opciones), ok)
        hijo.put("/x", protegido(opciones), ok)
        hijo.patch("/x", protegido(opciones), ok)
        hijo.delete("/x", protegido(opciones), ok)
      }, "/api"),
    ).toBe("arranca")
  })

  it("las rutas públicas de la lista siguen arrancando sin protegido(), también con HEAD explícito de salud", async () => {
    expect(
      await arranca((hijo) => {
        hijo.get("/salud", ok)
        hijo.post("/auth/registro", ok)
        hijo.post("/auth/login", ok)
        hijo.post("/auth/refrescar", ok)
        hijo.post("/auth/logout", ok)
      }, "/api"),
    ).toBe("arranca")
  })

  it("una ruta con pertenencia responde 501 y sin token 401 (la cadena corre antes)", async () => {
    const app = await nuevaApp()
    await app.register(
      async (hijo) => {
        hijo.get("/clase", protegido({ pertenencia: "inscripcion" }), ok)
      },
      { prefix: "/api" },
    )
    await app.ready()
    expect((await app.inject({ method: "GET", url: "/api/clase" })).statusCode).toBe(401)
    expect((await app.inject({ method: "HEAD", url: "/api/clase" })).statusCode).toBe(401)
  })
})

describe("ataque (ronda 2): la guarda rechaza lo ilegítimo", () => {
  it.each<[string, Registro, string | undefined]>([
    ["HEAD explícito sin protegido()", (h) => h.head("/me2", ok), "/api"],
    ["ALL sin protegido()", (h) => h.all("/todo", ok), "/api"],
    [
      "un método público con otro verbo (GET /api/auth/login)",
      (h) => h.get("/auth/login", ok),
      "/api",
    ],
    [
      "la cadena de protegido() reordenada",
      (h) => {
        const [a, b, c, d, e] = protegido().preHandler
        h.get("/reordenada", { preHandler: [a, b, c, e, d].filter((p) => p !== undefined) }, ok)
      },
      "/api",
    ],
    [
      "solo 4 pasos de protegido()",
      (h) => h.get("/incompleta", { preHandler: protegido().preHandler.slice(0, 4) }, ok),
      "/api",
    ],
    ["regex en el primer segmento", (h) => h.get("/:seccion(^api$)/secreto", ok), undefined],
    ["regex numérica en el primer segmento", (h) => h.get("/:id(^\\d+)/x", ok), undefined],
    ["comodín global", (h) => h.get("*", ok), undefined],
    ["comodín en el primer segmento", (h) => h.get("/ap*", ok), undefined],
    ["parámetro con prefijo en el segmento", (h) => h.get("/ap:resto/secreto", ok), undefined],
    ["prefijo partido que compone /api (/ap + i/z)", (h) => h.get("i/z", ok), "/ap"],
    ["prefijo paramétrico", (h) => h.get("/x", ok), "/:seccion"],
  ])("%s → no arranca", async (_, registrar, prefijo) => {
    expect(await arranca(registrar, prefijo)).toContain(
      "no pasa por protegido() (AGENTS.md, regla 2)",
    )
  })

  it("prefijos //api o /API (errores de tecleo) no atienden /api/*: sin bypass efectivo", async () => {
    const app = await nuevaApp()
    await app.register(async (h) => h.get("/x", ok), { prefix: "//api" })
    await app.register(async (h) => h.get("/y", ok), { prefix: "/API" })
    await app.ready()
    expect((await app.inject({ method: "GET", url: "/api/x" })).statusCode).toBe(404)
    expect((await app.inject({ method: "GET", url: "/api/y" })).statusCode).toBe(404)
  })

  it("un hook de ruta que responde antes de la cadena (onRequest) no debe poder saltarse protegido()", async () => {
    const app = await nuevaApp()
    let arranco = true
    try {
      await app.register(
        async (hijo) => {
          hijo.get(
            "/con-hook",
            {
              ...protegido(),
              onRequest: async (_request, reply) => {
                await reply.send({ datos: "privados" })
              },
            },
            ok,
          )
        },
        { prefix: "/api" },
      )
      await app.ready()
    } catch {
      arranco = false
    }
    const sinToken = arranco
      ? (await app.inject({ method: "GET", url: "/api/con-hook" })).statusCode
      : "no aplica"

    expect({ arranco, sinToken }).toEqual({ arranco: false, sinToken: "no aplica" })
  })
})
