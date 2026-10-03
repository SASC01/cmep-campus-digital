import { randomUUID } from "node:crypto"

import Fastify, { type FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { inicializarAuth } from "../src/adapters/auth/index.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv } from "../src/config/env.js"
import { manejoDeErrores } from "../src/handlers/errores.js"
import { protegido, registrarMiddleware } from "../src/middleware/index.js"

// Ataque del Tester (CHORE-02, ronda 1, punto 7): la guarda onRoute sobre toda ruta (M-15) y la
// regla de los dos primeros segmentos (§D-5). Apps de Fastify sueltas con las mismas opciones de
// enrutador que construirApp (las de por defecto), sin base.

const MOTIVO_SIN_CADENA = "no pasa por protegido() (AGENTS.md, regla 2)"
const MOTIVO_COMODIN =
  "tiene un parámetro o un comodín en sus dos primeros segmentos (AGENTS.md, regla 2)"

const abiertas: FastifyInstance[] = []

beforeAll(async () => {
  await inicializarAuth(opcionesDeAuth(cargarEnv()))
})

afterAll(async () => {
  await Promise.allSettled(abiertas.map((app) => app.close()))
})

type Registro = (hijo: FastifyInstance) => void
type Montada = { app: FastifyInstance } | { error: string }

// La app si arrancó, o el mensaje del error que lo impidió.
const montar = async (registrar: Registro, prefijo?: string): Promise<Montada> => {
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
    return { app }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

// "no arranca: <motivo>" o "responde <estado> <cuerpo>" al pedir la URL sin token.
const desenlaceSinToken = async (montada: Montada, url: string): Promise<string> => {
  if ("error" in montada) return `no arranca: ${montada.error}`
  const respuesta = await montada.app.inject({ method: "GET", url })
  return `responde ${String(respuesta.statusCode)} ${respuesta.body}`
}

const motivoDe = (montada: Montada): string => ("error" in montada ? montada.error : "arranca")

const contenidoDeClase = async () => ({ secreto: "contenido de la clase" })

const urlDeClase = (): string => `/api/clases/${randomUUID()}/publicaciones`

describe("ataque (CHORE-02 r1): manejador de 404 de un plugin, fuera de la guarda", () => {
  // setNotFoundHandler no registra una ruta (no dispara onRoute), pero atiende toda URL sin ruta
  // bajo el prefijo del plugin. Bajo /api/clases atiende /api/clases/<id>/… sin authenticate, sin
  // rol y sin pertenencia. §D-5 y el punto de ataque 7: ninguna forma de atender
  // /api/clases/<id>/… sin la cadena y sin :claseId puede arrancar. O la API no arranca, o la
  // petición sin token responde 401 sin llegar al manejador.
  const ACEPTABLE = /^(no arranca: |responde 401 )/

  it("un plugin con prefijo /api/clases y setNotFoundHandler propio: o no arranca, o sin token responde 401", async () => {
    const montada = await montar((hijo) => {
      hijo.setNotFoundHandler(contenidoDeClase)
    }, "/api/clases")

    expect(await desenlaceSinToken(montada, urlDeClase())).toMatch(ACEPTABLE)
  })

  it("un plugin con prefijo /api y setNotFoundHandler propio: o no arranca, o sin token responde 401", async () => {
    const montada = await montar((hijo) => {
      hijo.setNotFoundHandler(contenidoDeClase)
    }, "/api")

    expect(await desenlaceSinToken(montada, urlDeClase())).toMatch(ACEPTABLE)
  })
})

describe("ataque (CHORE-02 r1): segmentos vacíos delante del comodín", () => {
  // La regla toma los dos primeros segmentos después de quitar una sola "/" inicial; un segmento
  // vacío (//api, /api//) ocupa uno de los dos lugares. Lo que importa es si la ruta atiende
  // /api/clases/<id>/…: sin token, 404 = no la atiende; 401 = la atiende (la cadena la cortó).
  it.each(["//api/*", "//api/:seccion/*", "/api//*", "/api//:seccion/*", "///*"])(
    "GET %s con protegido(): o no arranca, o no atiende /api/clases/<id>/…",
    async (url) => {
      const montada = await montar((hijo) => {
        hijo.get(url, protegido(), contenidoDeClase)
      })
      expect(await desenlaceSinToken(montada, urlDeClase())).toMatch(
        /^(no arranca: .*AGENTS\.md, regla 2|responde 404 )/,
      )
    },
  )
})

describe("ataque (CHORE-02 r1): formas de registrar que la regla sí debe rechazar", () => {
  it.each<[string, Registro]>([
    ["app.all('/api/*')", (h) => h.all("/api/*", protegido(), contenidoDeClase)],
    [
      "route con method en arreglo",
      (h) =>
        h.route({
          method: ["GET", "POST"],
          url: "/api/:seccion/*",
          ...protegido(),
          handler: contenidoDeClase,
        }),
    ],
    [
      "parámetro con expresión regular en el primer segmento",
      (h) =>
        h.get(
          "/:raiz(^api$)/clases/:claseId/x",
          protegido({ pertenencia: "inscripcion" }),
          contenidoDeClase,
        ),
    ],
    [
      "parámetro con expresión regular en el segundo segmento",
      (h) => h.get("/api/:seccion(^clases$)/*", protegido(), contenidoDeClase),
    ],
    ["comodín pegado al segundo segmento", (h) => h.get("/api/c*", protegido(), contenidoDeClase)],
  ])("%s → no arranca por el comodín", async (_nombre, registrar) => {
    expect(motivoDe(await montar(registrar))).toContain(MOTIVO_COMODIN)
  })

  it("prefijo con parámetro y ruta literal: /:seccion como prefijo y /clases/:claseId/x con pertenencia", async () => {
    const montada = await montar(
      (h) =>
        h.get("/clases/:claseId/x", protegido({ pertenencia: "inscripcion" }), contenidoDeClase),
      "/:seccion",
    )
    expect(motivoDe(montada)).toContain(MOTIVO_COMODIN)
  })

  it("ruta fuera de /api sin cadena con método en minúsculas → no arranca", async () => {
    const montada = await montar((h) =>
      // "get" en minúsculas a propósito: el tipo de Fastify solo admite mayúsculas.
      h.route({ method: "get" as "GET", url: "/interno-ch", handler: contenidoDeClase }),
    )
    expect(motivoDe(montada)).toContain(MOTIVO_SIN_CADENA)
  })
})
