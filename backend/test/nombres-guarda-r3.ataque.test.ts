import { nombreSchema } from "@campus/shared"
import Fastify, {
  type FastifyInstance,
  type onRequestAsyncHookHandler,
  type RouteShorthandOptions,
} from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { inicializarAuth } from "../src/adapters/auth/index.js"
import { construirApp } from "../src/app.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv } from "../src/config/env.js"
import { manejoDeErrores } from "../src/handlers/errores.js"
import { protegido, registrarMiddleware } from "../src/middleware/index.js"

// Ataques del Tester (AUTH-01, ronda 3), acotados a lo que cambió: nombreSchema (corrección de
// T-11) y la guarda de rutas con hooks anteriores a preHandler (corrección de T-12).

const abiertas: FastifyInstance[] = []

// "arranca" si la app arranca; si no, el mensaje del error que lo impidió.
const arranca = async (
  registrar: (app: FastifyInstance) => void,
  prefijo: string | undefined = "/api",
): Promise<string> => {
  const app = Fastify({ logger: false })
  abiertas.push(app)
  await app.register(manejoDeErrores)
  registrarMiddleware(app)
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
const hookInocuo: onRequestAsyncHookHandler = async () => undefined

beforeAll(async () => {
  await inicializarAuth(opcionesDeAuth(cargarEnv()))
})

afterAll(async () => {
  await Promise.allSettled(abiertas.map((app) => app.close()))
})

describe("ataque (ronda 3): nombres legítimos siguen aceptados", () => {
  it.each([
    "Łukasz Żółć",
    "Søren Ødegård",
    "İlker Işık",
    "Ōta Tarō",
    "Ngũgĩ wa Thiong'o",
    "Jean-Luc Picard",
    "J. R. Martínez",
    "Γιώργος Παπαδόπουλος",
    "Анна Иванова",
    "דוד כהן",
    "สมชาย ใจดี",
    "ნინო ბერიძე",
    "Luis 2",
    "Li Na",
  ])("acepta %j", (nombre) => {
    const resultado = nombreSchema.safeParse(nombre)
    expect(resultado.success, JSON.stringify(resultado.error?.issues)).toBe(true)
  })
})

describe("ataque (ronda 3): nombres que se ven vacíos", () => {
  it.each([
    ["rellenos Hangul separados por espacios", "\u3164 \u3164 \u3164"],
    ["Braille en blanco con espacio", "\u2800 \u2800"],
    ["rellenos con espacio ideográfico", "\u115F\u3000\u1160"],
    ["relleno de ancho medio con espacio duro", "\uFFA0\u00A0\uFFA0"],
    ["rellenos con marcas combinantes", "\u3164\u0301\u3164\u0301"],
    ["selectores de variante", "\uFE0F\uFE0F\uFE0F"],
    ["combining grapheme joiner", "\u034F\u034F"],
    ["vocales inherentes jemer", "\u17B4\u17B5"],
    ["una letra más un relleno", "a\u3164"],
    ["rellenos con espacio de ancho cero (prohibido)", "\u3164\u200B\u3164"],
    ["Braille en blanco con inversor de dirección (prohibido)", "\u2800\u202E\u2800"],
    ["cabeza de nota nula U+1D159 (se ve vacía)", "\u{1D159}\u{1D159}\u{1D159}"],
  ])("rechaza %s", (_, nombre) => {
    expect(nombreSchema.safeParse(nombre).success).toBe(false)
  })
})

describe("ataque (ronda 3): hooks anteriores a preHandler (T-12)", () => {
  const anteriores = ["onRequest", "preParsing", "preValidation"] as const

  it.each(anteriores.flatMap((hook) => [[hook, "función"] as const, [hook, "arreglo"] as const]))(
    "una ruta protegida con %s como %s no arranca",
    async (hook, forma) => {
      const opciones: RouteShorthandOptions = {
        ...protegido(),
        [hook]: forma === "función" ? hookInocuo : [hookInocuo],
      }
      const resultado = await arranca((hijo) => hijo.get("/con-hook", opciones, ok))
      expect(resultado).toContain(`declara ${hook}`)
      expect(resultado).toContain("(AGENTS.md, regla 2)")
    },
  )

  it("los tres hooks anteriores a la vez también se rechazan, con el mensaje que los nombra", async () => {
    const resultado = await arranca((hijo) =>
      hijo.post(
        "/tres",
        {
          ...protegido({ roles: ["admin"] }),
          onRequest: hookInocuo,
          preParsing: [hookInocuo],
          preValidation: hookInocuo,
        },
        ok,
      ),
    )
    expect(resultado).toContain("onRequest, preParsing, preValidation")
  })

  it.each([
    ["onSend", "función"],
    ["onSend", "arreglo"],
    ["onResponse", "función"],
    ["onResponse", "arreglo"],
    ["preSerialization", "función"],
    ["preSerialization", "arreglo"],
    ["onError", "función"],
    ["onTimeout", "función"],
    ["onRequestAbort", "función"],
  ] as const)(
    "una ruta protegida con %s como %s arranca y sigue exigiendo token",
    async (hook, forma) => {
      const posterior = async () => undefined
      const opciones: RouteShorthandOptions = {
        ...protegido(),
        [hook]: forma === "función" ? posterior : [posterior],
      }
      const app = Fastify({ logger: false })
      abiertas.push(app)
      await app.register(manejoDeErrores)
      registrarMiddleware(app)
      await app.register(async (hijo) => hijo.get("/posterior", opciones, ok), { prefix: "/api" })
      await app.ready()
      expect((await app.inject({ method: "GET", url: "/api/posterior" })).statusCode).toBe(401)
    },
  )

  it("las rutas públicas con un onRequest propio siguen arrancando (están exentas)", async () => {
    expect(
      await arranca((hijo) => {
        hijo.post("/auth/login", { onRequest: hookInocuo }, ok)
        hijo.get("/salud", { preValidation: [hookInocuo] }, ok)
      }),
    ).toBe("arranca")
  })

  it("la app real arranca con sus 6 rutas y /api/me sigue respondiendo 401 sin token", async () => {
    const app = await construirApp({ env: cargarEnv() })
    await app.ready()
    const me = await app.inject({ method: "GET", url: "/api/me" })
    expect(me.statusCode).toBe(401)
    // No se cierra: su onClose desconectaría el cliente compartido de la base (como en
    // middleware-orden.integracion); este archivo no usa la base.
  })
})
