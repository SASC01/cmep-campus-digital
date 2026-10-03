import { errorApiSchema } from "@campus/shared"
import Fastify, { type FastifyInstance, type RouteShorthandOptions } from "fastify"
import fp from "fastify-plugin"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { inicializarAuth } from "../src/adapters/auth/index.js"
import { construirApp } from "../src/app.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv } from "../src/config/env.js"
import { manejoDeErrores } from "../src/handlers/errores.js"
import { protegido, registrarMiddleware } from "../src/middleware/index.js"
import { RUTAS_PUBLICAS } from "../src/middleware/rutas-publicas.js"

// CHORE-02 (§D-5, M-15): la guarda onRoute revisa toda ruta, con cualquier URL, y rechaza
// parámetros o comodines en sus dos primeros segmentos. Apps de Fastify sueltas con
// registrarMiddleware (sin base), salvo PR-CH-05d, que usa construirApp real.

const MOTIVO_SIN_CADENA = "no pasa por protegido() (AGENTS.md, regla 2)"
const MOTIVO_COMODIN =
  "tiene un parámetro o un comodín en sus dos primeros segmentos (AGENTS.md, regla 2)"
const MOTIVO_SIN_PERTENENCIA = "no pasa por requireMembership ni requireOwnership"

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

const ok = async () => ({ ok: true })

beforeAll(async () => {
  await inicializarAuth(opcionesDeAuth(cargarEnv()))
})

afterAll(async () => {
  await Promise.allSettled(abiertas.map((app) => app.close()))
})

describe("guarda sobre toda ruta (PR-CH-05a, M-15)", () => {
  it.each<[string, Registro, string | undefined]>([
    ["GET /interno", (h) => h.get("/interno", ok), undefined],
    ["GET /prueba/x", (h) => h.get("/prueba/x", ok), undefined],
    ["GET /x bajo el prefijo //api", (h) => h.get("/x", ok), "//api"],
    ["GET /x bajo el prefijo /API", (h) => h.get("/x", ok), "/API"],
    ["GET / en la raíz", (h) => h.get("/", ok), undefined],
  ])("%s sin protegido() → la API no arranca", async (_nombre, registrar, prefijo) => {
    expect(await arranca(registrar, prefijo)).toContain(MOTIVO_SIN_CADENA)
  })

  it("GET /interno con protegido() arranca y sin token responde 401", async () => {
    const app = await nuevaApp()
    app.get("/interno", protegido(), ok)
    await app.ready()

    const respuesta = await app.inject({ method: "GET", url: "/interno" })

    expect(respuesta.statusCode).toBe(401)
    expect(errorApiSchema.safeParse(respuesta.json()).success).toBe(true)
  })
})

const CON_CADENA: [string, ReturnType<typeof protegido>][] = [
  ["protegido()", protegido()],
  ['protegido({ pertenencia: "inscripcion" })', protegido({ pertenencia: "inscripcion" })],
  ['protegido({ pertenencia: "propiedad" })', protegido({ pertenencia: "propiedad" })],
]

describe("guarda: parámetros y comodines en los dos primeros segmentos (PR-CH-05b)", () => {
  const COMODINES = [
    "/api/*",
    "/api/:seccion/*",
    "/api/:seccion",
    "/:seccion/*",
    "/*",
    "*",
    "/api*",
    "/ap:resto/x",
  ]

  describe.each(CON_CADENA)("con %s", (_nombre, preHandler) => {
    it.each(COMODINES)("GET %s → la API no arranca con el motivo del comodín", async (url) => {
      expect(await arranca((h) => h.get(url, preHandler, ok))).toContain(MOTIVO_COMODIN)
    })
  })

  describe("solo con pertenencia (sin ella gana por orden el motivo de CLASES-a)", () => {
    const URLS = ["/:seccion/clases/:claseId", "/api/cla:resto/:claseId", "/api/clases*"]

    it.each(URLS)("GET %s sin pertenencia → no arranca por la pertenencia", async (url) => {
      const mensaje = await arranca((h) => h.get(url, protegido(), ok))
      expect(mensaje).toContain(MOTIVO_SIN_PERTENENCIA)
      expect(mensaje).not.toContain(MOTIVO_COMODIN)
    })

    it.each(URLS)("GET %s con pertenencia → no arranca por el comodín", async (url) => {
      expect(
        await arranca((h) => h.get(url, protegido({ pertenencia: "inscripcion" }), ok)),
      ).toContain(MOTIVO_COMODIN)
      expect(
        await arranca((h) => h.get(url, protegido({ pertenencia: "propiedad" }), ok)),
      ).toContain(MOTIVO_COMODIN)
    })
  })
})

describe("guarda: lo legítimo sigue arrancando (PR-CH-05c)", () => {
  it.each(["/api/clases/*", "/api/x/:claseId"])("GET %s con pertenencia arranca", async (url) => {
    expect(await arranca((h) => h.get(url, protegido({ pertenencia: "inscripcion" }), ok))).toBe(
      "arranca",
    )
  })

  it.each(["/api/me/*", "/prueba-ataque/x"])("GET %s con protegido() arranca", async (url) => {
    expect(await arranca((h) => h.get(url, protegido(), ok))).toBe("arranca")
  })

  it("las rutas públicas de la lista arrancan sin protegido(), con HEAD explícito de /api/salud", async () => {
    expect(RUTAS_PUBLICAS.size, "Precondición: la lista pública no está vacía").toBeGreaterThan(0)
    const publicas = [...RUTAS_PUBLICAS].map((entrada) => {
      const [metodo, url] = entrada.split(" ")
      if (!metodo || !url) throw new Error(`Precondición: entrada pública mal formada: ${entrada}`)
      return { metodo, url }
    })

    const mensaje = await arranca((h) => {
      // HEAD explícito antes del GET: Fastify no genera el suyo y la guarda lo trata como su GET.
      h.head("/api/salud", ok)
      for (const { metodo, url } of publicas) {
        h.route({ method: metodo as "GET" | "POST", url, handler: ok })
      }
    })

    expect(mensaje).toBe("arranca")
  })
})

describe("guarda: la API real arranca (PR-CH-05d)", () => {
  it("construirApp arranca y GET /api/me sin token responde 401", async () => {
    const app = await construirApp({ env: cargarEnv() })
    abiertas.push(app)
    await app.ready()

    const respuesta = await app.inject({ method: "GET", url: "/api/me" })

    expect(respuesta.statusCode).toBe(401)
    expect(errorApiSchema.safeParse(respuesta.json()).success).toBe(true)
  })
})

describe("guarda: HEAD hereda la decisión de su GET (PR-CH-05e)", () => {
  it("HEAD explícito de /api/* con protegido() no arranca por el comodín", async () => {
    expect(await arranca((h) => h.head("/api/*", protegido(), ok))).toContain(MOTIVO_COMODIN)
  })

  it("HEAD explícito de /interno sin protegido() no arranca", async () => {
    expect(await arranca((h) => h.head("/interno", ok))).toContain(MOTIVO_SIN_CADENA)
  })
})

describe("guarda: segmentos vacíos delante del comodín (PR-CH-05f, O-2)", () => {
  it.each(["//api/*", "//api/:seccion/*", "/api//*", "/api//:seccion/*", "///*"])(
    "GET %s con protegido() → la API no arranca con el motivo del comodín",
    async (url) => {
      expect(await arranca((h) => h.get(url, protegido(), ok))).toContain(MOTIVO_COMODIN)
    },
  )
})

// CHORE-02, T-01: setNotFoundHandler y setErrorHandler no disparan onRoute; la guarda los bloquea
// en la raíz y todo contexto hereda el bloqueo.
const MENSAJE_NOT_FOUND =
  "La instancia llama a setNotFoundHandler después de registrarMiddleware: el único es el de handlers/errores.ts, registrado antes (AGENTS.md, regla 2)"
const MENSAJE_ERROR_HANDLER =
  "La instancia llama a setErrorHandler después de registrarMiddleware: el único es el de handlers/errores.ts, registrado antes (AGENTS.md, regla 2)"

// "arranca" o el mensaje del error, con el plugin registrado directamente en la raíz.
const arrancaEnLaRaiz = async (registrar: (app: FastifyInstance) => Promise<void>) => {
  const app = await nuevaApp()
  try {
    await registrar(app)
    await app.ready()
    return "arranca"
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

describe("guarda: setNotFoundHandler después de registrarMiddleware (PR-CH-09b)", () => {
  it.each(["/api/clases", "/api", "/otro"])(
    "un plugin con prefijo %s que llama a setNotFoundHandler → la API no arranca",
    async (prefijo) => {
      expect(
        await arranca((h) => {
          h.setNotFoundHandler(async () => ({ secreto: "contenido de la clase" }))
        }, prefijo),
      ).toBe(MENSAJE_NOT_FOUND)
    },
  )

  it("un plugin sin prefijo que llama a setNotFoundHandler → la API no arranca", async () => {
    expect(
      await arranca((h) => {
        h.setNotFoundHandler(async () => ({ secreto: "x" }))
      }),
    ).toBe(MENSAJE_NOT_FOUND)
  })

  it("un plugin anidado que llama a setNotFoundHandler → la API no arranca", async () => {
    expect(
      await arrancaEnLaRaiz(async (app) => {
        await app.register(
          async (hijo) => {
            await hijo.register(
              async (nieto) => {
                nieto.setNotFoundHandler(async () => ({ secreto: "x" }))
              },
              { prefix: "/clases" },
            )
          },
          { prefix: "/api" },
        )
      }),
    ).toBe(MENSAJE_NOT_FOUND)
  })

  it("un plugin envuelto con fastify-plugin (contexto de la raíz) → la API no arranca", async () => {
    expect(
      await arrancaEnLaRaiz(async (app) => {
        await app.register(
          fp(async (instancia) => {
            instancia.setNotFoundHandler(async () => ({ secreto: "x" }))
          }),
        )
      }),
    ).toBe(MENSAJE_NOT_FOUND)
  })

  it("asignar hijo.setNotFoundHandler dentro de un plugin tampoco arranca", async () => {
    const mensaje = await arranca((h) => {
      // La propiedad heredada no es escribible: en modo estricto, asignar lanza TypeError.
      ;(h as unknown as Record<string, unknown>).setNotFoundHandler = () => undefined
    }, "/api/clases")
    expect(mensaje).not.toBe("arranca")
    expect(mensaje).toMatch(/read only|Cannot assign|not writable/i)
  })
})

describe("guarda: setErrorHandler después de registrarMiddleware (PR-CH-09c)", () => {
  it("un plugin con prefijo /api/clases con una ruta protegido() y un setErrorHandler propio → la API no arranca", async () => {
    expect(
      await arranca((h) => {
        h.setErrorHandler(async () => ({ secreto: "contenido de la clase" }))
        h.get("/x", protegido({ pertenencia: "inscripcion" }), ok)
      }, "/api/clases"),
    ).toBe(MENSAJE_ERROR_HANDLER)
  })

  it("un plugin envuelto con fastify-plugin que llama a setErrorHandler → la API no arranca", async () => {
    expect(
      await arrancaEnLaRaiz(async (app) => {
        await app.register(
          fp(async (instancia) => {
            instancia.setErrorHandler(async () => ({ secreto: "x" }))
          }),
        )
      }),
    ).toBe(MENSAJE_ERROR_HANDLER)
  })
})

describe("guarda: el orden de la raíz queda fijado (PR-CH-09d)", () => {
  it("registrar manejoDeErrores después de registrarMiddleware impide el arranque", async () => {
    const app = Fastify({ logger: false })
    abiertas.push(app)
    registrarMiddleware(app)
    await expect(
      (async () => {
        await app.register(manejoDeErrores)
        await app.ready()
      })(),
    ).rejects.toThrow(MENSAJE_ERROR_HANDLER)
  })

  it("registrado antes (como app.ts), arranca", async () => {
    const app = await nuevaApp()
    app.get("/interno", protegido(), ok)
    await app.ready()
    expect((await app.inject({ method: "GET", url: "/interno" })).statusCode).toBe(401)
  })

  it("con construirApp real, GET /api/no-existe responde 404 NO_ENCONTRADO y GET /api/me sin token responde 401 con el formato de la API", async () => {
    const app = await construirApp({ env: cargarEnv() })
    abiertas.push(app)
    await app.ready()

    const noExiste = await app.inject({ method: "GET", url: "/api/no-existe" })
    const sinToken = await app.inject({ method: "GET", url: "/api/me" })

    expect(noExiste.statusCode).toBe(404)
    expect(errorApiSchema.parse(noExiste.json()).error.codigo).toBe("NO_ENCONTRADO")
    expect(sinToken.statusCode).toBe(401)
    expect(errorApiSchema.safeParse(sinToken.json()).success).toBe(true)
  })
})

// ---------------------------------------------------------------------------------------------
// CHORE-02, Enmienda 4 (§E4-1 y §E4-2): opciones de ruta, hooks y métodos de la instancia.
// ---------------------------------------------------------------------------------------------
const MOTIVO_REHACE_RUTA = "puede rehacer la respuesta de protegido()"
const MOTIVO_VALIDA_RUTA = "valida o serializa fuera de protegido()"
const MOTIVO_PETICION_RUTA = "corre con la petición antes de protegido()"

const posterior = async () => undefined
const sinEfecto = () => undefined

type Opciones = Record<string, unknown>

const comoOpciones = (valor: Opciones): RouteShorthandOptions =>
  valor as unknown as RouteShorthandOptions

// Cada opción prohibida, con su valor, su grupo y el nombre que sale en el mensaje.
const PROHIBIDAS: [string, string, Opciones, string][] = [
  ["errorHandler", "función", { errorHandler: sinEfecto }, MOTIVO_REHACE_RUTA],
  ["onSend", "función", { onSend: posterior }, MOTIVO_REHACE_RUTA],
  ["onSend", "arreglo", { onSend: [posterior] }, MOTIVO_REHACE_RUTA],
  ["preSerialization", "función", { preSerialization: posterior }, MOTIVO_REHACE_RUTA],
  ["preSerialization", "arreglo", { preSerialization: [posterior] }, MOTIVO_REHACE_RUTA],
  ["onError", "función", { onError: posterior }, MOTIVO_REHACE_RUTA],
  ["onError", "arreglo", { onError: [posterior] }, MOTIVO_REHACE_RUTA],
  ["schema", "body", { schema: { body: { type: "object" } } }, MOTIVO_VALIDA_RUTA],
  ["schema", "querystring", { schema: { querystring: { type: "object" } } }, MOTIVO_VALIDA_RUTA],
  ["schema", "params", { schema: { params: { type: "object" } } }, MOTIVO_VALIDA_RUTA],
  ["schema", "headers", { schema: { headers: { type: "object" } } }, MOTIVO_VALIDA_RUTA],
  ["schema", "response", { schema: { response: { 200: { type: "object" } } } }, MOTIVO_VALIDA_RUTA],
  ["validatorCompiler", "función", { validatorCompiler: () => () => true }, MOTIVO_VALIDA_RUTA],
  ["serializerCompiler", "función", { serializerCompiler: () => () => "" }, MOTIVO_VALIDA_RUTA],
  [
    "schemaErrorFormatter",
    "función",
    { schemaErrorFormatter: () => new Error("x") },
    MOTIVO_VALIDA_RUTA,
  ],
  [
    "childLoggerFactory",
    "función",
    { childLoggerFactory: (logger: unknown) => logger },
    MOTIVO_PETICION_RUTA,
  ],
  ["logSerializers", "objeto", { logSerializers: { req: () => "x" } }, MOTIVO_PETICION_RUTA],
]

describe("guarda: opciones de ruta prohibidas (PR-CH-11a, T-02)", () => {
  it.each(PROHIBIDAS)(
    "la opción %s (%s) no arranca, con protegido() y con pertenencia, por route y por los atajos",
    async (nombre, _forma, opciones, motivo) => {
      const esperado = `declara ${nombre}, que ${motivo} (AGENTS.md, regla 2)`
      const cadenas: [string, ReturnType<typeof protegido>, string][] = [
        ["protegido()", protegido(), "/x"],
        [
          'protegido({ pertenencia: "inscripcion" })',
          protegido({ pertenencia: "inscripcion" }),
          "/clases/:claseId/x",
        ],
      ]
      for (const [descripcion, cadena, url] of cadenas) {
        const con = comoOpciones({ ...cadena, ...opciones })
        // Fastify rechaza un schema.body en un GET antes de que la guarda lo vea: solo POST.
        const conCuerpo = "schema" in opciones && JSON.stringify(opciones.schema).includes("body")
        const registros: [string, Registro][] = conCuerpo
          ? [
              ["post", (h) => h.post(url, con, ok)],
              ["route", (h) => h.route({ method: "POST", url, handler: ok, ...con })],
            ]
          : [
              ["get", (h) => h.get(url, con, ok)],
              ["post", (h) => h.post(url, con, ok)],
              ["all", (h) => h.all(url, con, ok)],
              ["route", (h) => h.route({ method: "GET", url, handler: ok, ...con })],
            ]
        for (const [via, registrar] of registros) {
          expect(await arranca(registrar, "/api"), `${descripcion} con ${via}`).toContain(esperado)
        }
      }
    },
  )

  it("onSend en un HEAD explícito tampoco arranca", async () => {
    const con = comoOpciones({ ...protegido(), onSend: posterior })
    expect(await arranca((h) => h.head("/x", con, ok), "/api")).toContain(
      `declara onSend, que ${MOTIVO_REHACE_RUTA} (AGENTS.md, regla 2)`,
    )
  })
})

describe("guarda: opciones de ruta permitidas (PR-CH-11b)", () => {
  const PERMITIDAS: [string, Opciones, Record<string, string>][] = [
    ["onResponse (función)", { onResponse: async () => undefined }, {}],
    ["onResponse (arreglo)", { onResponse: [async () => undefined] }, {}],
    ["onTimeout (función)", { onTimeout: async () => undefined }, {}],
    ["onTimeout (arreglo)", { onTimeout: [async () => undefined] }, {}],
    [
      "onRequestAbort (función)",
      { onRequestAbort: async (peticion: unknown) => void peticion },
      {},
    ],
    [
      "onRequestAbort (arreglo)",
      { onRequestAbort: [async (peticion: unknown) => void peticion] },
      {},
    ],
    ["config", { config: { dato: 1 } }, {}],
    ["constraints", { constraints: { version: "1.0.0" } }, { "accept-version": "1.0.0" }],
    ["bodyLimit", { bodyLimit: 1024 }, {}],
    ["logLevel", { logLevel: "warn" }, {}],
    ["exposeHeadRoute", { exposeHeadRoute: false }, {}],
    ["prefixTrailingSlash", { prefixTrailingSlash: "both" }, {}],
    ["handlerTimeout", { handlerTimeout: 5000 }, {}],
    ["attachValidation", { attachValidation: true }, {}],
  ]

  it.each(PERMITIDAS)(
    "%s arranca y sin token responde el 401 del envoltorio",
    async (_nombre, opciones, cabeceras) => {
      const app = await nuevaApp()
      await app.register(
        async (hijo) => {
          hijo.get("/permitida", comoOpciones({ ...protegido(), ...opciones }), ok)
        },
        { prefix: "/api" },
      )
      await app.ready()

      const respuesta = await app.inject({
        method: "GET",
        url: "/api/permitida",
        headers: cabeceras,
      })

      expect(respuesta.statusCode).toBe(401)
      expect(errorApiSchema.safeParse(respuesta.json()).success).toBe(true)
    },
  )
})

describe("guarda: el HEAD automático (PR-CH-11c)", () => {
  it("un GET protegido con exposeHeadRoute por defecto arranca y su HEAD sin token responde 401", async () => {
    const app = await nuevaApp()
    await app.register(
      async (hijo) => {
        hijo.get("/cabeza", protegido(), ok)
      },
      { prefix: "/api" },
    )
    await app.ready()

    const respuesta = await app.inject({ method: "HEAD", url: "/api/cabeza" })

    expect(respuesta.statusCode).toBe(401)
  })
})

describe("guarda: mutar después los arreglos que devolvió protegido() (PR-CH-11d, H-3)", () => {
  const casos: [
    string,
    (opciones: ReturnType<typeof protegido> & { onResponse: unknown[] }) => void,
  ][] = [
    ["vaciar preHandler", (opciones) => opciones.preHandler.splice(0)],
    [
      "agregar un preHandler que responde",
      (opciones) => {
        opciones.preHandler.unshift(async (_peticion, respuesta) => {
          await respuesta.send({ secreto: "x" })
        })
      },
    ],
    [
      "vaciar y rellenar el arreglo de onResponse",
      (opciones) => {
        opciones.onResponse.push(async () => undefined)
        opciones.preHandler.splice(0)
      },
    ],
  ]

  it.each(casos)(
    "%s: sin token la ruta responde 401 sin ejecutar el handler",
    async (_nombre, mutar) => {
      let ejecutado = false
      const app = await nuevaApp()
      await app.register(
        async (hijo) => {
          const opciones = { ...protegido(), onResponse: [async () => undefined] }
          hijo.get("/mutada", comoOpciones(opciones), async () => {
            ejecutado = true
            return { secreto: "contenido" }
          })
          mutar(opciones)
        },
        { prefix: "/api" },
      )
      await app.ready()

      const respuesta = await app.inject({ method: "GET", url: "/api/mutada" })

      expect(respuesta.statusCode).toBe(401)
      expect(ejecutado).toBe(false)
    },
  )
})

describe("guarda: las rutas públicas están exentas de la clasificación (PR-CH-11e)", () => {
  it("las rutas de la lista pública con onSend y errorHandler propios arrancan", async () => {
    const publicas = [...RUTAS_PUBLICAS].map((entrada) => {
      const [metodo, url] = entrada.split(" ")
      if (!metodo || !url) throw new Error(`Precondición: entrada pública mal formada: ${entrada}`)
      return { metodo, url }
    })
    expect(publicas.length, "Precondición: la lista pública no está vacía").toBeGreaterThan(0)

    const mensaje = await arranca((h) => {
      for (const { metodo, url } of publicas) {
        h.route({
          method: metodo as "GET" | "POST",
          url,
          handler: ok,
          ...comoOpciones({ onSend: posterior, errorHandler: sinEfecto }),
        })
      }
    })

    expect(mensaje).toBe("arranca")
  })
})

// §E4-2, los hooks de la instancia.
const MOTIVO_HOOK_REHACE = "puede responder o rehacer la respuesta fuera de protegido()"
const MOTIVO_HOOK_ROUTE = "podría cambiar una ruta después de que la guarda la revisó"
const HOOKS_BLOQUEADOS: [string, string][] = [
  ["onRequest", MOTIVO_HOOK_REHACE],
  ["preParsing", MOTIVO_HOOK_REHACE],
  ["preValidation", MOTIVO_HOOK_REHACE],
  ["preHandler", MOTIVO_HOOK_REHACE],
  ["preSerialization", MOTIVO_HOOK_REHACE],
  ["onSend", MOTIVO_HOOK_REHACE],
  ["onError", MOTIVO_HOOK_REHACE],
  ["onRoute", MOTIVO_HOOK_ROUTE],
]

// Agrega el hook por la vía dinámica: el nombre y el manejador no se tipan juntos.
const agregarHook = (instancia: FastifyInstance, nombre: string, manejador: unknown): void => {
  ;(instancia.addHook as (n: string, m: unknown) => void).call(instancia, nombre, manejador)
}

describe("guarda: addHook bloqueado por nombre (PR-CH-12a, T-03)", () => {
  describe.each(HOOKS_BLOQUEADOS)("%s", (nombre, motivo) => {
    const esperado = `La instancia agrega el hook ${nombre} después de registrarMiddleware: ${motivo}; un plugin que lo necesite se registra antes (AGENTS.md, regla 2)`

    it("en un plugin con prefijo /api → la API no arranca", async () => {
      expect(await arranca((h) => agregarHook(h, nombre, posterior), "/api")).toBe(esperado)
    })

    it("en un plugin sin prefijo → la API no arranca", async () => {
      expect(await arranca((h) => agregarHook(h, nombre, posterior))).toBe(esperado)
    })

    it("en un plugin anidado → la API no arranca", async () => {
      expect(
        await arrancaEnLaRaiz(async (app) => {
          await app.register(
            async (hijo) => {
              await hijo.register(async (nieto) => agregarHook(nieto, nombre, posterior), {
                prefix: "/clases",
              })
            },
            { prefix: "/api" },
          )
        }),
      ).toBe(esperado)
    })

    it("en un plugin envuelto con fastify-plugin → la API no arranca", async () => {
      expect(
        await arrancaEnLaRaiz(async (app) => {
          await app.register(fp(async (instancia) => agregarHook(instancia, nombre, posterior)))
        }),
      ).toBe(esperado)
    })
  })
})

describe("guarda: los hooks que no tocan la respuesta siguen permitidos (PR-CH-12b)", () => {
  it.each([
    "onResponse",
    "onTimeout",
    "onRequestAbort",
    "onReady",
    "onListen",
    "preClose",
    "onClose",
  ])(
    "addHook(%s) después de registrarMiddleware arranca y las rutas protegidas responden 401",
    async (nombre) => {
      const app = await nuevaApp()
      app.get("/api/protegida", protegido(), ok)
      await app.register(async (hijo) =>
        agregarHook(
          hijo,
          nombre,
          nombre === "onRequestAbort" ? async (peticion: unknown) => void peticion : posterior,
        ),
      )
      await app.ready()

      expect((await app.inject({ method: "GET", url: "/api/protegida" })).statusCode).toBe(401)
    },
  )

  it("onReady, onRegister y onResponse corren de verdad", async () => {
    const marcas: string[] = []
    const app = await nuevaApp()
    await app.register(async (hijo) => {
      hijo.get("/api/protegida", protegido(), ok)
      agregarHook(hijo, "onReady", async () => {
        marcas.push("onReady")
      })
      agregarHook(hijo, "onRegister", () => {
        marcas.push("onRegister")
      })
      agregarHook(hijo, "onResponse", async () => {
        marcas.push("onResponse")
      })
      await hijo.register(async () => undefined)
    })
    await app.ready()
    await app.inject({ method: "GET", url: "/api/protegida" })
    await esperar(50)

    expect(marcas).toEqual(expect.arrayContaining(["onReady", "onRegister", "onResponse"]))
  })

  it("un nombre que Fastify no admite sigue dando el error de Fastify", async () => {
    const mensaje = await arranca((h) => agregarHook(h, "noExiste", posterior), "/api")
    expect(mensaje).toContain("noExiste hook not supported")
  })
})

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

describe("guarda: métodos de la instancia bloqueados (PR-CH-12c)", () => {
  const BLOQUEADOS: [string, string, unknown[]][] = [
    ["setReplySerializer", "puede rehacer el cuerpo de la respuesta de protegido()", [() => ""]],
    [
      "setSerializerCompiler",
      "puede rehacer el cuerpo de la respuesta de protegido()",
      [() => () => ""],
    ],
    ["setValidatorCompiler", "valida fuera de protegido()", [() => () => true]],
    ["setSchemaController", "valida fuera de protegido()", [{}]],
    ["setSchemaErrorFormatter", "valida fuera de protegido()", [() => new Error("x")]],
    ["setGenReqId", "corre con la petición antes de protegido()", [() => "id"]],
    [
      "setChildLoggerFactory",
      "corre con la petición antes de protegido()",
      [(logger: unknown) => logger],
    ],
    [
      "addContentTypeParser",
      "corre con la petición antes de protegido()",
      ["application/x-prueba", () => undefined],
    ],
    [
      "addConstraintStrategy",
      "corre con la petición antes de protegido()",
      [{ name: "x", storage: () => ({}), deriveConstraint: () => "x" }],
    ],
  ]

  it.each(BLOQUEADOS)(
    "%s en un plugin con prefijo /api → la API no arranca",
    async (metodo, motivo, argumentos) => {
      const mensaje = await arranca((h) => {
        ;(h as unknown as Record<string, (...a: unknown[]) => unknown>)[metodo]?.(...argumentos)
      }, "/api")
      expect(mensaje).toBe(
        `La instancia llama a ${metodo} después de registrarMiddleware: ${motivo}; un plugin que lo necesite se registra antes (AGENTS.md, regla 2)`,
      )
    },
  )

  it("register con logSerializers → la API no arranca", async () => {
    const mensaje = await arrancaEnLaRaiz(async (app) => {
      await app.register(async () => undefined, { logSerializers: {} })
    })
    expect(mensaje).toBe(
      "Un plugin se registra con logSerializers después de registrarMiddleware: corre con la petición antes de protegido() (AGENTS.md, regla 2)",
    )
  })
})

describe("guarda: lo permitido sigue funcionando (PR-CH-12d)", () => {
  it("decorate, decorateRequest, decorateReply, addSchema, addHttpMethod, removeContentTypeParser, register con prefix y logLevel y rutas arrancan", async () => {
    const mensaje = await arrancaEnLaRaiz(async (app) => {
      app.decorate("marcaDePrueba", 1)
      app.decorateRequest("marcaDePeticion", null)
      app.decorateReply("marcaDeRespuesta", null)
      app.addSchema({ $id: "esquema-de-prueba", type: "object" })
      app.addHttpMethod("PURGE")
      app.removeContentTypeParser("text/plain")
      await app.register(
        async (hijo) => {
          hijo.get("/permitida", protegido(), ok)
        },
        { prefix: "/api", logLevel: "warn" },
      )
    })
    expect(mensaje).toBe("arranca")
  })

  it("con construirApp real arranca y GET /api/me sin token responde 401 con el formato de la API", async () => {
    const app = await construirApp({ env: cargarEnv() })
    abiertas.push(app)
    await app.ready()

    const respuesta = await app.inject({ method: "GET", url: "/api/me" })

    expect(respuesta.statusCode).toBe(401)
    expect(errorApiSchema.safeParse(respuesta.json()).success).toBe(true)
  })
})
