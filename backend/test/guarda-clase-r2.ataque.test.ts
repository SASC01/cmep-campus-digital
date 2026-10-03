import { fileURLToPath } from "node:url"

import { ESLint } from "eslint"
import Fastify, { type FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { protegido, registrarMiddleware } from "../src/middleware/index.js"

// Tester, CLASES-a, ronda 2. Guarda §D-0.3 después de la corrección de T-02 (regla enmendada por el
// manager: todo parámetro claseId en cualquier posición y todo comodín bajo /clases/ exigen el
// sexto paso; bajo /clases/ el segmento siguiente solo puede ser :claseId) y ESLint §D-0.4 (T-03).

// construirApp inicializa db/auth/cola y demuestra que las rutas reales siguen arrancando (PA-13).
let appBase: FastifyInstance | undefined

beforeAll(async () => {
  appBase = await construirApp({ env: cargarEnv() })
  await appBase.ready()
})

afterAll(async () => {
  await appBase?.close()
})

type Registro = (app: FastifyInstance) => Promise<void>

const arranca = async (registrar: Registro) => {
  const app = Fastify({ logger: false })
  registrarMiddleware(app)
  try {
    await registrar(app)
    await app.ready()
    return { arranco: true, error: "" }
  } catch (error) {
    return { arranco: false, error: String(error) }
  } finally {
    await app.close().catch(() => undefined)
  }
}

const bajoApi =
  (url: string, opciones: Parameters<typeof protegido>[0] = {}): Registro =>
  async (app) => {
    await app.register(
      async (hijo) => {
        hijo.get(url, protegido(opciones), async () => ({ ok: true }))
      },
      { prefix: "/api" },
    )
  }

const FORMAS_CON_CLASE_ID = [
  "/x/:claseId",
  "/x/:claseId?",
  "/x/:claseId(^[0-9a-f-]{36}$)",
  "/x/:claseId-:parte",
  "/x/:parte-:claseId",
  "/x/pre-:claseId",
  "/x/:parte.:claseId",
  "/x/:claseId.:ext",
  "/x/:claseId(^x)-:y",
  "/x/:a.:claseId(^x)",
]

describe("ataque CLASES-a r2: formas con :claseId fuera de /clases", () => {
  it("todas se rechazan sin el sexto paso", async () => {
    for (const url of FORMAS_CON_CLASE_ID) {
      const r = await arranca(bajoApi(url))
      expect(r.arranco, `${url} arrancó sin sexto paso`).toBe(false)
      expect(r.error, url).toContain("no pasa por requireMembership ni requireOwnership")
    }
  })

  it("todas arrancan con pertenencia 'inscripcion' y con 'propiedad'", async () => {
    for (const url of FORMAS_CON_CLASE_ID) {
      for (const pertenencia of ["inscripcion", "propiedad"] as const) {
        const r = await arranca(bajoApi(url, { pertenencia }))
        expect(r.arranco, `${url} con ${pertenencia}: ${r.error}`).toBe(true)
      }
    }
  })
})

describe("ataque CLASES-a r2: otras formas de registrar la ruta", () => {
  it("app.route({ url }) con :claseId y sin sexto paso no arranca", async () => {
    const r = await arranca(async (app) => {
      await app.register(
        async (hijo) => {
          hijo.route({
            method: "GET",
            url: "/x/:claseId",
            ...protegido(),
            handler: async () => ({ ok: true }),
          })
        },
        { prefix: "/api" },
      )
    })
    expect(r.arranco).toBe(false)
  })

  it("con prefix anidado (/api → /clases) y :id no arranca, ni con pertenencia", async () => {
    const r = await arranca(async (app) => {
      await app.register(
        async (api) => {
          await api.register(
            async (clases) => {
              clases.get("/:id", protegido({ pertenencia: "inscripcion" }), async () => ({}))
            },
            { prefix: "/clases" },
          )
        },
        { prefix: "/api" },
      )
    })
    expect(r.arranco).toBe(false)
    expect(r.error).toContain("nombra el parámetro de clase distinto de :claseId")
  })

  it("con :claseId en el prefix y la ruta vacía, sin sexto paso, no arranca", async () => {
    const r = await arranca(async (app) => {
      await app.register(
        async (hijo) => {
          hijo.get("/", protegido(), async () => ({}))
        },
        { prefix: "/api/x/:claseId" },
      )
    })
    expect(r.arranco).toBe(false)
  })

  it("comodines bajo /clases/ a cualquier profundidad, sin sexto paso, no arrancan", async () => {
    for (const url of ["/clases/*", "/clases/x/*", "/clases/:claseId/a/*"]) {
      const r = await arranca(bajoApi(url))
      expect(r.arranco, url).toBe(false)
    }
  })

  it("/api/clases* (comodín pegado a 'clases', sin barra) sin sexto paso no debe arrancar", async () => {
    // find-my-way resuelve /api/clases/<uuid>/personas con esta ruta (params["*"] = "/<uuid>/personas")
    // cuando no hay otra más específica: atiende toda la familia /clases/ como el comodín /clases/*.
    const r = await arranca(bajoApi("/clases*"))
    expect(r.arranco, "la ruta /api/clases* arrancó sin sexto paso").toBe(false)
  })

  it("/api/clases* atiende de verdad /api/clases/<uuid>/personas (precondición del caso anterior)", async () => {
    const app = Fastify({ logger: false })
    app.get("/api/clases*", async (request) => ({
      comodin: (request.params as Record<string, string>)["*"],
    }))
    await app.ready()
    const r = await app.inject({
      method: "GET",
      url: "/api/clases/2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01/personas",
    })
    await app.close()
    expect(r.statusCode).toBe(200)
    expect(r.json<{ comodin: string }>().comodin).toBe(
      "/2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01/personas",
    )
  })
})

describe("ataque CLASES-a r2: ESLint §D-0.4 (T-03)", () => {
  const raiz = fileURLToPath(new URL("../..", import.meta.url))
  const archivoVirtual = `${raiz}backend/src/handlers/ataque-r2-virtual.ts`

  const erroresDe = async (llamada: string): Promise<string[]> => {
    const codigo = `import type { FastifyPluginAsync } from "fastify"

export const plugin: FastifyPluginAsync = async (app) => {
  ${llamada}
}
`
    const eslint = new ESLint({ cwd: raiz, overrideConfigFile: `${raiz}eslint.config.mjs` })
    const [resultado] = await eslint.lintText(codigo, { filePath: archivoVirtual })
    if (!resultado) throw new Error("Precondición: ESLint no devolvió resultado")
    return resultado.messages.map((m) => m.message)
  }

  // A-15 (CHORE-02, ronda 6): primer caso del archivo que llama a ESLint; paga la carga en frío de
  // ESLint y typescript-eslint, que con la suite cargada llegó a 46.7 s (T-08). Límite propio de 60 s.
  it("control: app.addHook, app['addHook'] y app?.addHook se rechazan", async () => {
    for (const llamada of [
      `app.addHook("onRequest", async () => undefined)`,
      `app["addHook"]("onRequest", async () => undefined)`,
      `app?.addHook("onRequest", async () => undefined)`,
    ]) {
      const errores = await erroresDe(llamada)
      expect(
        errores.some((m) => m.includes("no añaden hooks")),
        llamada,
      ).toBe(true)
    }
  }, 60_000)

  it("app[`addHook`](...) (acceso con plantilla) también debe rechazarse", async () => {
    const errores = await erroresDe('app[`addHook`]("onRequest", async () => undefined)')
    expect(
      errores.some((m) => m.includes("no añaden hooks")),
      "app[`addHook`] pasó ESLint",
    ).toBe(true)
  })
})
