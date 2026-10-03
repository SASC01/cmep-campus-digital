import { randomUUID } from "node:crypto"
import { Writable } from "node:stream"

import { errorApiSchema } from "@campus/shared"
import Fastify, { type FastifyInstance } from "fastify"
import fp from "fastify-plugin"
import { pino } from "pino"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { inicializarAuth } from "../src/adapters/auth/index.js"
import { construirApp } from "../src/app.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv } from "../src/config/env.js"
import { manejoDeErrores } from "../src/handlers/errores.js"
import { protegido, registrarMiddleware } from "../src/middleware/index.js"

// Ataque del Tester (CHORE-02, ronda 3): §E4-1 (clasificación cerrada de las opciones de ruta y
// copia congelada) y §E4-2 (addHook por nombre y métodos de la instancia), por la API pública de
// Fastify. Apps sueltas con el orden de app.ts (manejoDeErrores antes de registrarMiddleware), sin
// base: se pide sin token, así que la cadena corta en authenticate con 401. Lo aceptable es que la
// API no arranque o que responda el 401 del envoltorio sin ejecutar el handler.

const abiertas: FastifyInstance[] = []

beforeAll(async () => {
  await inicializarAuth(opcionesDeAuth(cargarEnv()))
})

afterAll(async () => {
  await Promise.allSettled(abiertas.map((app) => app.close()))
})

type Montada = { app: FastifyInstance } | { error: string }
type Registro = (app: FastifyInstance) => void

const montar = async (registrar: Registro): Promise<Montada> => {
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
const URL_DE_CLASE = "/clases/:claseId/publicaciones"
const urlDeClase = (): string => `/api/clases/${randomUUID()}/publicaciones`

let handlerEjecutado = false
const handlerDeClase = async () => {
  handlerEjecutado = true
  return { secreto: "contenido de la clase" }
}

const desenlace = async (
  montada: Montada,
  url: string,
  metodo: "GET" | "HEAD" = "GET",
): Promise<string> => {
  if ("error" in montada) return `no arranca: ${montada.error}`
  handlerEjecutado = false
  const respuesta = await montada.app.inject({ method: metodo, url })
  return `responde ${String(respuesta.statusCode)} ${respuesta.body}${handlerEjecutado ? " (handler ejecutado)" : ""}`
}

const ACEPTABLE =
  /^(no arranca: |responde 401 \{"error":\{"codigo":"[A-Z_]+","mensaje":"[^"]+"\}\}$)/
const ARRANCA_Y_401 = /^responde 401 \{"error":\{"codigo":"[A-Z_]+","mensaje":"[^"]+"\}\}$/

// Ruta de clase con la cadena completa bajo /api, más lo que el caso agregue en el plugin.
const enPlugin =
  (cuerpo: (hijo: FastifyInstance) => void, envolver: "encapsulado" | "anidado" | "fp") =>
  (app: FastifyInstance): void => {
    if (envolver === "encapsulado") {
      void app.register(async (hijo) => cuerpo(hijo), { prefix: "/api" })
      return
    }
    if (envolver === "anidado") {
      void app.register(
        async (a) => {
          await a.register(async (b) => {
            await b.register(async (c) => cuerpo(c))
          })
        },
        { prefix: "/api" },
      )
      return
    }
    void app.register(
      async (hijo) => {
        await hijo.register(fp(async (mismo) => cuerpo(mismo)))
      },
      { prefix: "/api" },
    )
  }

const conRutaDeClase = (hijo: FastifyInstance): void => {
  hijo.get(URL_DE_CLASE, protegido({ pertenencia: "inscripcion" }), handlerDeClase)
}

const reescribir = async (_r: unknown, reply: { code: (n: number) => unknown }) => {
  reply.code(200)
  return SECRETO
}

describe("ataque (CHORE-02 r3): addHook de los 8 nombres bloqueados, en tres contextos", () => {
  const BLOQUEADOS: [string, unknown][] = [
    [
      "onRequest",
      async (_r: unknown, reply: { code: (n: number) => { send: (c: string) => unknown } }) =>
        reply.code(200).send(SECRETO),
    ],
    [
      "preParsing",
      async (_r: unknown, reply: { code: (n: number) => { send: (c: string) => unknown } }) =>
        reply.code(200).send(SECRETO),
    ],
    [
      "preValidation",
      async (_r: unknown, reply: { code: (n: number) => { send: (c: string) => unknown } }) =>
        reply.code(200).send(SECRETO),
    ],
    [
      "preHandler",
      async (_r: unknown, reply: { code: (n: number) => { send: (c: string) => unknown } }) =>
        reply.code(200).send(SECRETO),
    ],
    [
      "preSerialization",
      async (_r: unknown, reply: { code: (n: number) => unknown }) => {
        reply.code(200)
        return { secreto: "contenido de la clase" }
      },
    ],
    ["onSend", reescribir],
    ["onError", async () => undefined],
    [
      "onRoute",
      (ruta: { preHandler?: unknown }) => {
        ruta.preHandler = []
      },
    ],
  ]
  const CONTEXTOS = ["encapsulado", "anidado", "fp"] as const
  const casos = BLOQUEADOS.flatMap(([nombre, hook]) =>
    CONTEXTOS.map((contexto) => [nombre, contexto, hook] as const),
  )

  it.each(casos)(
    "addHook(%s) en un plugin %s: o no arranca, o el 401 del envoltorio",
    async (nombre, contexto, hook) => {
      const montada = await montar(
        enPlugin((hijo) => {
          ;(hijo.addHook as unknown as (n: string, h: unknown) => unknown)(nombre, hook)
          conRutaDeClase(hijo)
        }, contexto),
      )
      const resultado = await desenlace(montada, urlDeClase())
      expect(resultado).toMatch(ACEPTABLE)
      expect(resultado).not.toContain("(handler ejecutado)")
    },
  )

  it.each([
    ["String", () => new String("onSend")],
    ["objeto con toString", () => ({ toString: () => "onSend" })],
  ])("addHook con el nombre como %s no se cuela", async (_nombre, nombre) => {
    const montada = await montar(
      enPlugin((hijo) => {
        ;(hijo.addHook as unknown as (n: unknown, h: unknown) => unknown)(nombre(), reescribir)
        conRutaDeClase(hijo)
      }, "encapsulado"),
    )
    expect(await desenlace(montada, urlDeClase())).toMatch(ACEPTABLE)
  })
})

describe("ataque (CHORE-02 r3): los 9 métodos bloqueados, encapsulado y con fastify-plugin", () => {
  const METODOS: [string, unknown[]][] = [
    ["setReplySerializer", [() => SECRETO]],
    ["setSerializerCompiler", [() => () => SECRETO]],
    ["setValidatorCompiler", [() => () => true]],
    ["setSchemaController", [{}]],
    ["setSchemaErrorFormatter", [() => new Error("x")]],
    ["setGenReqId", [() => "id"]],
    ["setChildLoggerFactory", [(logger: unknown) => logger]],
    [
      "addContentTypeParser",
      [
        "application/x-ch",
        (_r: unknown, _p: unknown, hecho: (e: null, b: unknown) => void) => hecho(null, {}),
      ],
    ],
    [
      "addConstraintStrategy",
      [
        {
          name: "chr3",
          storage: () => ({ get: () => null, set: () => undefined }),
          deriveConstraint: () => "x",
          mustMatchWhenDerived: false,
        },
      ],
    ],
  ]
  const casos = METODOS.flatMap(([metodo, argumentos]) =>
    (["encapsulado", "fp"] as const).map((contexto) => [metodo, contexto, argumentos] as const),
  )

  it.each(casos)("%s en un plugin %s → la API no arranca", async (metodo, contexto, argumentos) => {
    const montada = await montar(
      enPlugin((hijo) => {
        const funcion = (hijo as unknown as Record<string, (...a: unknown[]) => unknown>)[metodo]
        if (typeof funcion !== "function")
          throw new Error(`Precondición: ${metodo} no es una función`)
        funcion.apply(hijo, argumentos)
        conRutaDeClase(hijo)
      }, contexto),
    )
    expect("error" in montada ? montada.error : "arranca").toContain(
      `La instancia llama a ${metodo} después de registrarMiddleware`,
    )
  })
})

describe("ataque (CHORE-02 r3): register con logSerializers", () => {
  // Sin tipo a propósito: el tipo de logSerializers de Fastify exige un serializador que devuelva texto.
  const serializadores = { req: () => ({ secreto: true }) } as never

  it.each<[string, Registro]>([
    [
      "opciones como objeto",
      (app) => {
        void app.register(async (hijo) => conRutaDeClase(hijo), {
          prefix: "/api",
          logSerializers: serializadores,
        })
      },
    ],
    [
      "anidado",
      (app) => {
        void app.register(
          async (hijo) => {
            await hijo.register(async (nieto) => conRutaDeClase(nieto), {
              logSerializers: serializadores,
            })
          },
          { prefix: "/api" },
        )
      },
    ],
  ])("%s: no arranca", async (_nombre, registrar) => {
    const montada = await montar(registrar)
    expect("error" in montada ? montada.error : "arranca").toContain(
      "Un plugin se registra con logSerializers después de registrarMiddleware",
    )
  })
  it("control del método: sin la guarda, logSerializers en las opciones de register sí corre con la petición", async () => {
    let corrio = false
    const salida = new Writable({
      write(_trozo, _codificacion, listo) {
        listo()
      },
    })
    // Con loggerInstance, Fastify tipa la instancia con el Logger de pino; para estas pruebas basta la
    // forma por defecto, que es la que usan montar y desenlace.
    const app = Fastify({
      loggerInstance: pino({ level: "info" }, salida),
    }) as unknown as FastifyInstance
    abiertas.push(app)
    await app.register(
      async (hijo) => {
        hijo.get("/x", async () => ({ ok: true }))
      },
      {
        logSerializers: {
          req: () => {
            corrio = true
            return {}
          },
        },
      } as never,
    )
    await app.ready()
    await app.inject({ method: "GET", url: "/x" })
    expect(corrio).toBe(true)
  })

  it("opciones como función: Fastify no aplica sus logSerializers (override recibe la función), así que no corren con la petición", async () => {
    let corrio = false
    const salida = new Writable({
      write(_trozo, _codificacion, listo) {
        listo()
      },
    })
    // Con loggerInstance, Fastify tipa la instancia con el Logger de pino; para estas pruebas basta la
    // forma por defecto, que es la que usan montar y desenlace.
    const app = Fastify({
      loggerInstance: pino({ level: "info" }, salida),
    }) as unknown as FastifyInstance
    abiertas.push(app)
    await app.register(manejoDeErrores)
    registrarMiddleware(app)
    const resultado = await (async () => {
      try {
        await app.register(
          async (hijo) => {
            hijo.get(
              `/api${URL_DE_CLASE}`,
              protegido({ pertenencia: "inscripcion" }),
              handlerDeClase,
            )
          },
          (() => ({
            logSerializers: {
              req: () => {
                corrio = true
                return {}
              },
            },
          })) as never,
        )
        await app.ready()
        return desenlace({ app }, urlDeClase())
      } catch (error) {
        return `no arranca: ${error instanceof Error ? error.message : String(error)}`
      }
    })()
    expect(resultado).toMatch(ACEPTABLE)
    expect(corrio, "el serializador del plugin corrió con la petición").toBe(false)
  })
})

describe("ataque (CHORE-02 r3): opciones de ruta de la lista cerrada", () => {
  const OPCIONES: [string, Record<string, unknown>, string][] = [
    [
      "onError como función",
      { onError: async () => undefined },
      "puede rehacer la respuesta de protegido()",
    ],
    [
      "onError como arreglo",
      { onError: [async () => undefined] },
      "puede rehacer la respuesta de protegido()",
    ],
    [
      "errorHandler",
      { errorHandler: async () => SECRETO },
      "puede rehacer la respuesta de protegido()",
    ],
    [
      "schema.params",
      { schema: { params: { type: "object" } } },
      "valida o serializa fuera de protegido()",
    ],
    [
      "schema.response",
      {
        schema: {
          response: { 401: { type: "object", properties: { secreto: { type: "string" } } } },
        },
      },
      "valida o serializa fuera de protegido()",
    ],
    ["schema vacío", { schema: {} }, "valida o serializa fuera de protegido()"],
    [
      "validatorCompiler",
      { validatorCompiler: () => () => true },
      "valida o serializa fuera de protegido()",
    ],
    [
      "serializerCompiler",
      { serializerCompiler: () => () => SECRETO },
      "valida o serializa fuera de protegido()",
    ],
    [
      "schemaErrorFormatter",
      { schemaErrorFormatter: () => new Error("x") },
      "valida o serializa fuera de protegido()",
    ],
    [
      "childLoggerFactory",
      { childLoggerFactory: (l: unknown) => l },
      "corre con la petición antes de protegido()",
    ],
    [
      "logSerializers",
      { logSerializers: { req: () => ({}) } },
      "corre con la petición antes de protegido()",
    ],
    [
      "onSend vacío más un onSend",
      { onSend: [reescribir] },
      "puede rehacer la respuesta de protegido()",
    ],
  ]

  it.each(OPCIONES)("%s → no arranca con su motivo", async (_nombre, extra, motivo) => {
    const montada = await montar(
      enPlugin((hijo) => {
        hijo.route({
          method: "GET",
          url: URL_DE_CLASE,
          ...protegido({ pertenencia: "inscripcion" }),
          ...extra,
          handler: handlerDeClase,
        })
      }, "encapsulado"),
    )
    expect("error" in montada ? montada.error : "arranca").toContain(motivo)
  })

  it.each<[string, Record<string, unknown>]>([
    ["onSend: []", { onSend: [] }],
    ["onError: []", { onError: [] }],
    ["onResponse", { onResponse: async () => undefined }],
    ["onTimeout", { onTimeout: async () => undefined }],
    ["onRequestAbort", { onRequestAbort: async (peticion: unknown) => void peticion }],
    ["config, logLevel y bodyLimit", { config: { x: 1 }, logLevel: "error", bodyLimit: 1024 }],
  ])("%s (permitida) arranca y responde el 401 del envoltorio", async (_nombre, extra) => {
    const montada = await montar(
      enPlugin((hijo) => {
        hijo.route({
          method: "GET",
          url: URL_DE_CLASE,
          ...protegido({ pertenencia: "inscripcion" }),
          ...extra,
          handler: handlerDeClase,
        })
      }, "encapsulado"),
    )
    expect(await desenlace(montada, urlDeClase())).toMatch(ARRANCA_Y_401)
  })
})

describe("ataque (CHORE-02 r3): copia congelada de los hooks de la ruta (H-3)", () => {
  it("mutar después el arreglo de protegido() (quitar la cadena y meter un hook que responde) no cambia la ruta", async () => {
    const opciones = protegido({ pertenencia: "inscripcion" })
    const montada = await montar(
      enPlugin((hijo) => {
        hijo.get(URL_DE_CLASE, opciones, handlerDeClase)
        opciones.preHandler.splice(0, opciones.preHandler.length, async (_r, reply) =>
          reply.code(200).send(SECRETO),
        )
      }, "encapsulado"),
    )
    expect(await desenlace(montada, urlDeClase())).toMatch(ARRANCA_Y_401)
  })

  it("mutar después un arreglo onResponse (permitido) para meterle un onSend no cambia nada", async () => {
    const onResponse: unknown[] = [async () => undefined]
    const montada = await montar(
      enPlugin((hijo) => {
        hijo.route({
          method: "GET",
          url: URL_DE_CLASE,
          ...protegido({ pertenencia: "inscripcion" }),
          onResponse: onResponse as never,
          handler: handlerDeClase,
        })
        onResponse.push(reescribir)
      }, "encapsulado"),
    )
    expect(await desenlace(montada, urlDeClase())).toMatch(ARRANCA_Y_401)
  })

  it("un preHandler como proxy de arreglo que cambia al leerse de nuevo no se cuela", async () => {
    const cadena = protegido({ pertenencia: "inscripcion" }).preHandler
    let lecturas = 0
    const malicioso = async (
      _r: unknown,
      reply: { code: (n: number) => { send: (c: string) => unknown } },
    ) => reply.code(200).send(SECRETO)
    const proxy = new Proxy(cadena, {
      get(objetivo, propiedad, receptor) {
        if (propiedad === Symbol.iterator) lecturas += 1
        if (lecturas > 1 && propiedad === Symbol.iterator)
          return [malicioso][Symbol.iterator].bind([malicioso])
        return Reflect.get(objetivo, propiedad, receptor) as unknown
      },
    })
    const montada = await montar(
      enPlugin((hijo) => {
        hijo.get(URL_DE_CLASE, { preHandler: proxy }, handlerDeClase)
      }, "encapsulado"),
    )
    const resultado = await desenlace(montada, urlDeClase())
    expect(resultado).toMatch(ACEPTABLE)
    expect(resultado).not.toContain("(handler ejecutado)")
  })
})

describe("ataque (CHORE-02 r3): HEAD", () => {
  it("HEAD automático de una ruta protegida sin token responde 401 sin ejecutar el handler", async () => {
    const montada = await montar(enPlugin(conRutaDeClase, "encapsulado"))
    const resultado = await desenlace(montada, urlDeClase(), "HEAD")
    expect(resultado.startsWith("responde 401 "), resultado).toBe(true)
    expect(resultado).not.toContain("(handler ejecutado)")
  })

  it("exposeHeadRoute explícito con un onSend propio → no arranca", async () => {
    const montada = await montar(
      enPlugin((hijo) => {
        hijo.route({
          method: "GET",
          url: URL_DE_CLASE,
          exposeHeadRoute: true,
          ...protegido({ pertenencia: "inscripcion" }),
          onSend: reescribir,
          handler: handlerDeClase,
        })
      }, "encapsulado"),
    )
    expect("error" in montada ? montada.error : "arranca").toContain(
      "puede rehacer la respuesta de protegido()",
    )
  })

  it("HEAD explícito con la cadena y un onSend propio → no arranca", async () => {
    const montada = await montar(
      enPlugin((hijo) => {
        hijo.head(
          URL_DE_CLASE,
          { ...protegido({ pertenencia: "inscripcion" }), onSend: reescribir },
          handlerDeClase,
        )
      }, "encapsulado"),
    )
    expect("error" in montada ? montada.error : "arranca").toContain(
      "puede rehacer la respuesta de protegido()",
    )
  })
})

describe("ataque (CHORE-02 r3): lo permitido sigue funcionando", () => {
  it("addHook de los 8 nombres permitidos en un plugin: arranca, los hooks corren y la ruta sigue en 401", async () => {
    const corrieron = new Set<string>()
    const montada = await montar(
      enPlugin((hijo) => {
        hijo.addHook("onResponse", async () => {
          corrieron.add("onResponse")
        })
        hijo.addHook("onTimeout", async () => undefined)
        // onRequestAbort asíncrono debe declarar exactamente un argumento (Fastify lo valida).
        hijo.addHook("onRequestAbort", async (peticion) => void peticion)
        hijo.addHook("onReady", async () => {
          corrieron.add("onReady")
        })
        hijo.addHook("onListen", async () => undefined)
        hijo.addHook("preClose", async () => undefined)
        hijo.addHook("onClose", async () => undefined)
        hijo.addHook("onRegister", () => {
          corrieron.add("onRegister")
        })
        void hijo.register(async (nieto) => conRutaDeClase(nieto))
      }, "encapsulado"),
    )
    const resultado = await desenlace(montada, urlDeClase())
    expect(resultado).toMatch(ARRANCA_Y_401)
    expect([...corrieron].sort()).toEqual(["onReady", "onRegister", "onResponse"])
  })

  it("construirApp real: arranca, 404 NO_ENCONTRADO fuera de rutas, 401 del envoltorio en /api/me y en HEAD /api/me", async () => {
    const app = await construirApp({ env: { ...cargarEnv(), LOG_LEVEL: "error" } })
    await app.ready()
    const noExiste = await app.inject({ method: "GET", url: `/api/no-existe-${randomUUID()}` })
    const me = await app.inject({ method: "GET", url: "/api/me" })
    const cabeza = await app.inject({ method: "HEAD", url: "/api/me" })
    expect({
      noExiste: noExiste.statusCode,
      codigoNoExiste: errorApiSchema.parse(noExiste.json()).error.codigo,
      me: me.statusCode,
      formatoMe: errorApiSchema.safeParse(me.json()).success,
      cabeza: cabeza.statusCode,
      cuerpoCabeza: cabeza.body,
    }).toEqual({
      noExiste: 404,
      codigoNoExiste: "NO_ENCONTRADO",
      me: 401,
      formatoMe: true,
      cabeza: 401,
      cuerpoCabeza: "",
    })
    // No se cierra: su onClose desconectaría el cliente compartido de la base (como en
    // nombres-guarda-r3); este archivo no usa la base.
  })
})
