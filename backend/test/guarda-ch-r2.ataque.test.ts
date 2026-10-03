import { randomUUID } from "node:crypto"

import Fastify, { type FastifyInstance } from "fastify"
import fp from "fastify-plugin"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { inicializarAuth } from "../src/adapters/auth/index.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv } from "../src/config/env.js"
import { manejoDeErrores } from "../src/handlers/errores.js"
import { protegido, registrarMiddleware } from "../src/middleware/index.js"

// Ataque del Tester (CHORE-02, ronda 2): el remedio de T-01 (§E3-1, setNotFoundHandler y
// setErrorHandler bloqueados en la raíz) y sus hermanos. La propiedad que se ataca es la de §D-5 y
// del punto 7: ninguna forma de registrar algo que responda a /api/clases/<id>/… sin pasar por la
// cadena puede arrancar, y la respuesta de la cadena (401/403) no se puede rehacer. Apps sueltas con
// el mismo orden que app.ts (manejoDeErrores antes de registrarMiddleware), sin base: se pide sin
// token, así que la cadena corta en authenticate con 401.

const abiertas: FastifyInstance[] = []

beforeAll(async () => {
  await inicializarAuth(opcionesDeAuth(cargarEnv()))
})

afterAll(async () => {
  await Promise.allSettled(abiertas.map((app) => app.close()))
})

type Montada = { app: FastifyInstance } | { error: string }

const montar = async (registrar: (app: FastifyInstance) => void): Promise<Montada> => {
  const app = Fastify({ logger: false })
  abiertas.push(app)
  await app.register(manejoDeErrores)
  registrarMiddleware(app)
  try {
    registrar(app)
    await app.ready()
    return { app }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

const SECRETO = JSON.stringify({ secreto: "contenido de la clase" })
const urlDeClase = (): string => `/api/clases/${randomUUID()}/publicaciones`

let handlerEjecutado = false
const handlerDeClase = async () => {
  handlerEjecutado = true
  return { secreto: "contenido de la clase" }
}

// "no arranca: <motivo>" o "responde <estado> <cuerpo>" sin token.
const desenlace = async (montada: Montada, url: string): Promise<string> => {
  if ("error" in montada) return `no arranca: ${montada.error}`
  handlerEjecutado = false
  const respuesta = await montada.app.inject({ method: "GET", url })
  return `responde ${String(respuesta.statusCode)} ${respuesta.body}${handlerEjecutado ? " (handler ejecutado)" : ""}`
}

// Sin token, lo único aceptable es no arrancar o el 401 del envoltorio, con su cuerpo.
const ACEPTABLE =
  /^(no arranca: |responde 401 \{"error":\{"codigo":"[A-Z_]+","mensaje":"[^"]+"\}\}$)/

describe("ataque (CHORE-02 r2): setNotFoundHandler y setErrorHandler por otras vías", () => {
  it.each<[string, (app: FastifyInstance) => void]>([
    [
      "plugin anidado en tres niveles con prefijo /api/clases",
      (app) => {
        void app.register(
          async (a) => {
            await a.register(async (b) => {
              await b.register(async (c) => {
                c.setNotFoundHandler(handlerDeClase)
              })
            })
          },
          { prefix: "/api/clases" },
        )
      },
    ],
    [
      "plugin con fastify-plugin registrado dentro de un plugin con prefijo",
      (app) => {
        void app.register(
          async (hijo) => {
            await hijo.register(
              fp(async (mismo) => {
                mismo.setNotFoundHandler(handlerDeClase)
              }),
            )
          },
          { prefix: "/api" },
        )
      },
    ],
    [
      "setErrorHandler en un plugin con una ruta protegido() que rehace el 401",
      (app) => {
        void app.register(
          async (hijo) => {
            hijo.setErrorHandler(async (_error, _request, reply) =>
              reply.code(200).send({ secreto: "contenido de la clase" }),
            )
            hijo.get(
              "/clases/:claseId/publicaciones",
              protegido({ pertenencia: "inscripcion" }),
              handlerDeClase,
            )
          },
          { prefix: "/api" },
        )
      },
    ],
    [
      "decorate sobre setNotFoundHandler",
      (app) => {
        void app.register(
          async (hijo) => {
            hijo.decorate("setNotFoundHandler", () => hijo)
          },
          { prefix: "/api" },
        )
      },
    ],
    [
      "reasignar setNotFoundHandler en un plugin",
      (app) => {
        void app.register(
          async (hijo) => {
            ;(hijo as unknown as { setNotFoundHandler: unknown }).setNotFoundHandler = () => hijo
          },
          { prefix: "/api" },
        )
      },
    ],
  ])("%s: o no arranca, o sin token responde el 401 del envoltorio", async (_nombre, registrar) => {
    expect(await desenlace(await montar(registrar), urlDeClase())).toMatch(ACEPTABLE)
  })

  it("redefinir la propiedad en un hijo con Object.defineProperty no recupera el manejador de 404 original", async () => {
    // Un hijo encapsulado hereda la propiedad no escribible de la raíz, pero defineProperty sobre el
    // propio hijo sí crea una propiedad nueva. Lo que importa es que con eso no se logre registrar un
    // 404 propio: el original es privado del cierre de fastify.js.
    const montada = await montar((app) => {
      void app.register(
        async (hijo) => {
          Object.defineProperty(hijo, "setNotFoundHandler", {
            value: (manejador: unknown) => manejador,
            configurable: true,
          })
          ;(hijo.setNotFoundHandler as unknown as (m: unknown) => unknown)(handlerDeClase)
        },
        { prefix: "/api" },
      )
    })
    const resultado = await desenlace(montada, urlDeClase())
    expect(resultado).not.toContain(SECRETO)
    expect(resultado).not.toContain("(handler ejecutado)")
  })
})

describe("ataque (CHORE-02 r2): opciones de ruta que corren después de la cadena y rehacen su 401", () => {
  // La guarda revisa preHandler y los hooks de ruta que corren ANTES (onRequest, preParsing,
  // preValidation). Las opciones de ruta errorHandler, onSend y preSerialization corren DESPUÉS de
  // que la cadena decidió y pueden cambiar el estado y el cuerpo: son el hermano por ruta de
  // setErrorHandler (§E3-1), y la regla de ESLint M-14 no las ve porque no son addHook.
  it.each<[string, Record<string, unknown>]>([
    [
      "errorHandler",
      {
        errorHandler: async (
          _error: unknown,
          _request: unknown,
          reply: { code: (n: number) => { send: (c: unknown) => unknown } },
        ) => reply.code(200).send({ secreto: "contenido de la clase" }),
      },
    ],
    [
      "onSend",
      {
        onSend: async (_request: unknown, reply: { code: (n: number) => unknown }) => {
          reply.code(200)
          return SECRETO
        },
      },
    ],
    [
      "preSerialization",
      {
        preSerialization: async (_request: unknown, reply: { code: (n: number) => unknown }) => {
          reply.code(200)
          return { secreto: "contenido de la clase" }
        },
      },
    ],
  ])(
    "GET /api/clases/:claseId/publicaciones con protegido({ pertenencia }) y %s propio: o no arranca, o sin token responde el 401 del envoltorio",
    async (_nombre, extra) => {
      const montada = await montar((app) => {
        void app.register(
          async (hijo) => {
            hijo.route({
              method: "GET",
              url: "/clases/:claseId/publicaciones",
              ...protegido({ pertenencia: "inscripcion" }),
              ...extra,
              handler: handlerDeClase,
            })
          },
          { prefix: "/api" },
        )
      })
      expect(await desenlace(montada, urlDeClase())).toMatch(ACEPTABLE)
    },
  )
})

describe("ataque (CHORE-02 r2): hooks y serializador de un plugin sobre el 401 de la cadena", () => {
  // CHORE-02, Enmienda 4 (§E4-2, A-14): la guarda bloquea addHook y setReplySerializer después de
  // registrarMiddleware, así que el desenlace aceptable es el del resto del archivo (ACEPTABLE): no
  // arranca, o el 401 del envoltorio. Antes se exigía el 401 (T-03 de la ronda 2).
  it("setReplySerializer en un plugin: o no arranca, o sin token responde el 401 del envoltorio, y el handler no corre", async () => {
    const montada = await montar((app) => {
      void app.register(
        async (hijo) => {
          hijo.setReplySerializer(() => SECRETO)
          hijo.get(
            "/clases/:claseId/publicaciones",
            protegido({ pertenencia: "inscripcion" }),
            handlerDeClase,
          )
        },
        { prefix: "/api" },
      )
    })
    const resultado = await desenlace(montada, urlDeClase())
    expect(resultado).toMatch(ACEPTABLE)
    expect(resultado).not.toContain("(handler ejecutado)")
  })

  it("addHook('onSend') en un plugin: o no arranca, o sin token responde el 401 del envoltorio, y el handler no corre", async () => {
    const montada = await montar((app) => {
      void app.register(
        async (hijo) => {
          hijo.addHook("onSend", async (_request, reply) => {
            reply.code(200)
            return SECRETO
          })
          hijo.get(
            "/clases/:claseId/publicaciones",
            protegido({ pertenencia: "inscripcion" }),
            handlerDeClase,
          )
        },
        { prefix: "/api" },
      )
    })
    const resultado = await desenlace(montada, urlDeClase())
    expect(resultado).toMatch(ACEPTABLE)
    expect(resultado).not.toContain("(handler ejecutado)")
  })
})

describe("ataque (CHORE-02 r2): O-2, variantes de barras", () => {
  it.each(["//api//*", "/api///:seccion/*", "////*", "//:seccion/clases/:claseId/x"])(
    "GET %s con protegido({ pertenencia }): no arranca por el comodín",
    async (url) => {
      const montada = await montar((app) => {
        app.get(url, protegido({ pertenencia: "inscripcion" }), handlerDeClase)
      })
      expect("error" in montada ? montada.error : "arranca").toContain(
        "tiene un parámetro o un comodín en sus dos primeros segmentos",
      )
    },
  )
})
