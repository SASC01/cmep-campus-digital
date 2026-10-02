import { fileURLToPath } from "node:url"

import { ESLint } from "eslint"
import Fastify, { type FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { protegido, registrarMiddleware } from "../src/middleware/index.js"

// Tester, CLASES-a, ronda 1. Guarda onRoute de §D-0.3 y regla de ESLint de §D-0.4: rutas que
// capturan el id de una clase con el nombre claseId, pero en una forma que la expresión regular no
// reconoce, y hooks añadidos en handlers/ sin la forma literal app.addHook(...).

// construirApp inicializa db/auth/cola (efecto colateral, igual que guarda-clase.integracion).
let appBase: FastifyInstance | undefined

beforeAll(async () => {
  appBase = await construirApp({ env: cargarEnv() })
})

afterAll(async () => {
  await appBase?.close()
})

const arrancaCon = async (url: string, opciones: Parameters<typeof protegido>[0] = {}) => {
  const app = Fastify({ logger: false })
  registrarMiddleware(app)
  try {
    await app.register(
      async (hijo) => {
        hijo.get(url, protegido(opciones), async () => ({ ok: true }))
      },
      { prefix: "/api" },
    )
    await app.ready()
    return { arranco: true, error: "" }
  } catch (error) {
    return { arranco: false, error: String(error) }
  } finally {
    await app.close().catch(() => undefined)
  }
}

describe("ataque CLASES-a r1: guarda §D-0.3 con :claseId en formas que la regla no reconoce", () => {
  it("control: /api/x/:claseId sin sexto paso no arranca", async () => {
    const r = await arrancaCon("/x/:claseId")
    expect(r.arranco).toBe(false)
    expect(r.error).toContain("tiene :claseId y no pasa por requireMembership ni requireOwnership")
  })

  it("/api/x/:claseId? (parámetro opcional) sin sexto paso no debe arrancar", async () => {
    const r = await arrancaCon("/x/:claseId?")
    expect(
      r.arranco,
      "la ruta con :claseId? arrancó sin requireMembership ni requireOwnership",
    ).toBe(false)
  })

  it("/api/x/:claseId(^[0-9a-f-]{36}$) (parámetro con expresión) sin sexto paso no debe arrancar", async () => {
    const r = await arrancaCon("/x/:claseId(^[0-9a-f-]{36}$)")
    expect(r.arranco, "la ruta con :claseId(regex) arrancó sin sexto paso").toBe(false)
  })

  it("/api/x/:claseId-:parte (dos parámetros en un segmento) sin sexto paso no debe arrancar", async () => {
    const r = await arrancaCon("/x/:claseId-:parte")
    expect(r.arranco, "la ruta con :claseId-:parte arrancó sin sexto paso").toBe(false)
  })

  it("/api/clases/* (comodín bajo /clases) sin sexto paso no debe arrancar", async () => {
    const r = await arrancaCon("/clases/*")
    expect(r.arranco, "un comodín bajo /api/clases arrancó sin sexto paso").toBe(false)
  })

  it("/api/clases/:claseid y /api/clases/:clase_id no arrancan, ni con pertenencia", async () => {
    for (const url of ["/clases/:claseid", "/clases/:clase_id", "/clases/:claseId2"]) {
      const r = await arrancaCon(url, { pertenencia: "inscripcion" })
      expect(r.arranco, url).toBe(false)
      expect(r.error).toContain("nombra el parámetro de clase distinto de :claseId")
    }
  })
})

describe("ataque CLASES-a r1: ESLint §D-0.4 contra hooks en handlers/", () => {
  const raiz = fileURLToPath(new URL("../..", import.meta.url))
  const archivoVirtual = `${raiz}backend/src/handlers/ataque-r1-virtual.ts`

  const erroresDe = async (codigo: string): Promise<string[]> => {
    const eslint = new ESLint({ cwd: raiz, overrideConfigFile: `${raiz}eslint.config.mjs` })
    const [resultado] = await eslint.lintText(codigo, { filePath: archivoVirtual })
    if (!resultado) throw new Error("Precondición: ESLint no devolvió resultado")
    return resultado.messages
      .filter((m) => m.ruleId === "no-restricted-syntax")
      .map((m) => m.message)
  }

  const plantilla = (llamada: string) => `import type { FastifyPluginAsync } from "fastify"

export const plugin: FastifyPluginAsync = async (app) => {
  ${llamada}
}
`

  it("control: app.addHook(...) se rechaza", async () => {
    const errores = await erroresDe(plantilla(`app.addHook("onRequest", async () => undefined)`))
    expect(errores.some((m) => m.includes("no añaden hooks"))).toBe(true)
  })

  it('app["addHook"](...) también debe rechazarse', async () => {
    const errores = await erroresDe(plantilla(`app["addHook"]("onRequest", async () => undefined)`))
    expect(
      errores.some((m) => m.includes("no añaden hooks")),
      'app["addHook"] pasó ESLint',
    ).toBe(true)
  })
})
