import { randomUUID } from "node:crypto"

import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { crearDudaDePrueba, crearRespuestaDePrueba } from "./ayudas-dudas.js"

// CLASES-03b (CL3-B03 a CL3-B08, autorización): las siete rutas de dudas y respuestas pasan por la
// cadena completa. Cada ruta se prueba sin sesión, con cambio de contraseña pendiente, con un alumno
// restringido, en una clase ajena o inexistente, con el rol que no admite y con los que sí, y ninguna
// respuesta lleva estado de pago, correo, rol ni quién marcó una duda.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  tokenAdmin = await tokenDelAdminDePrueba()
})

afterAll(async () => {
  // N-10: clases (con sus dudas y respuestas en cascada) antes que los usuarios.
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

const maestroDePrueba = (): Promise<UsuarioDePrueba> =>
  crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })

const estudianteDePrueba = (
  opciones: Parameters<typeof crearUsuarioDePrueba>[1] = {},
): Promise<UsuarioDePrueba> => crearUsuarioDePrueba(idsUsuarios, { ...opciones, rol: "estudiante" })

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

// Claves de todos los objetos de un JSON, en cualquier profundidad.
const clavesDe = (valor: unknown): string[] => {
  const claves: string[] = []
  const pila: unknown[] = [valor]
  while (pila.length > 0) {
    const actual = pila.pop()
    if (actual === null || typeof actual !== "object") continue
    for (const [clave, hijo] of Object.entries(actual)) {
      claves.push(clave)
      pila.push(hijo)
    }
  }
  return claves
}

const CLAVES_PROHIBIDAS = [
  "estadoPago",
  "accesoRestringido",
  "email",
  "rol",
  "resueltaPor",
  "marcadaPor",
]

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  autora: UsuarioDePrueba
  tokenMaestro: string
  tokenAutora: string
  dudaId: string
  respuestaId: string
}

// Una clase con un maestro y una alumna inscrita con deuda, autora de una duda resuelta y de una
// respuesta a esa duda.
const escenario = async (): Promise<Escenario> => {
  const maestro = await maestroDePrueba()
  const autora = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: "Alumna Dudas",
    estadoPago: "deudor",
  })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await inscribirDePrueba(clase.id, autora.id, "codigo")
  const dudaId = await crearDudaDePrueba({
    claseId: clase.id,
    autorId: autora.id,
    resueltaPor: maestro.id,
    resueltaEn: new Date("2026-10-29T12:00:00.000Z"),
  })
  const respuestaId = await crearRespuestaDePrueba({ dudaId, autorId: autora.id })
  return {
    claseId: clase.id,
    maestro,
    autora,
    tokenMaestro: await tokenDe(maestro),
    tokenAutora: await tokenDe(autora),
    dudaId,
    respuestaId,
  }
}

type Quien = "estudiante" | "maestro" | "admin"

interface RutaDePrueba {
  nombre: string
  metodo: "GET" | "POST" | "PUT" | "DELETE"
  url: (e: Escenario) => string
  payload?: InjectOptions["payload"]
  admite: readonly Quien[]
  exito: number
}

const base = (e: Escenario): string => `/api/clases/${e.claseId}/dudas`

const RUTAS: RutaDePrueba[] = [
  {
    nombre: "GET /clases/:claseId/dudas",
    metodo: "GET",
    url: base,
    admite: ["estudiante", "maestro", "admin"],
    exito: 200,
  },
  {
    nombre: "POST /clases/:claseId/dudas",
    metodo: "POST",
    url: base,
    payload: { texto: "¿Cuándo es el examen?" },
    admite: ["estudiante", "maestro"],
    exito: 201,
  },
  {
    nombre: "PUT /clases/:claseId/dudas/:dudaId/resuelta",
    metodo: "PUT",
    url: (e) => `${base(e)}/${e.dudaId}/resuelta`,
    payload: { resuelta: true },
    admite: ["maestro", "admin"],
    exito: 200,
  },
  {
    nombre: "DELETE /clases/:claseId/dudas/:dudaId",
    metodo: "DELETE",
    url: (e) => `${base(e)}/${e.dudaId}`,
    admite: ["estudiante", "maestro", "admin"],
    exito: 204,
  },
  {
    nombre: "GET /clases/:claseId/dudas/:dudaId/respuestas",
    metodo: "GET",
    url: (e) => `${base(e)}/${e.dudaId}/respuestas`,
    admite: ["estudiante", "maestro", "admin"],
    exito: 200,
  },
  {
    nombre: "POST /clases/:claseId/dudas/:dudaId/respuestas",
    metodo: "POST",
    url: (e) => `${base(e)}/${e.dudaId}/respuestas`,
    payload: { texto: "Mañana a las 9" },
    admite: ["estudiante", "maestro"],
    exito: 201,
  },
  {
    nombre: "DELETE /clases/:claseId/dudas/:dudaId/respuestas/:respuestaId",
    metodo: "DELETE",
    url: (e) => `${base(e)}/${e.dudaId}/respuestas/${e.respuestaId}`,
    admite: ["estudiante", "maestro", "admin"],
    exito: 204,
  },
]

const pedir = (
  ruta: RutaDePrueba,
  e: Escenario,
  token: string | undefined,
  url = ruta.url(e),
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: ruta.metodo,
    url,
    ...(ruta.payload === undefined ? {} : { payload: ruta.payload }),
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  })

// Lo que ninguna negación debe cambiar: las dudas de la clase y todas sus respuestas.
const fotoDe = async (claseId: string): Promise<unknown> => ({
  dudas: await obtenerDb().duda.findMany({
    where: { claseId },
    orderBy: { id: "asc" },
    select: { id: true, texto: true, resueltaEn: true, resueltaPor: true },
  }),
  respuestas: await obtenerDb().comentario.findMany({
    where: { duda: { claseId } },
    orderBy: { id: "asc" },
    select: { id: true, texto: true, dudaId: true },
  }),
})

const tokenSegun = (e: Escenario, quien: Quien): string => {
  if (quien === "admin") return tokenAdmin
  if (quien === "maestro") return e.tokenMaestro
  return e.tokenAutora
}

describe("autorización de las rutas de dudas y respuestas (CL3-B03 a CL3-B08)", () => {
  it("CL3-B03 a CL3-B08: se prueban las siete rutas de 03b", () => {
    expect(new Set(RUTAS.map((ruta) => ruta.nombre)).size).toBe(7)
  })

  it(
    "CL3-B03 a CL3-B08: cada ruta, sin sesión, responde 401 NO_AUTENTICADO",
    { timeout: 60_000 },
    async () => {
      for (const ruta of RUTAS) {
        const e = await escenario()
        const respuesta = await pedir(ruta, e, undefined)
        expect(respuesta.statusCode, ruta.nombre).toBe(401)
        expect(codigoDe(respuesta), ruta.nombre).toBe("NO_AUTENTICADO")
      }
    },
  )

  it(
    "CL3-B03 a CL3-B08: cada ruta, con cambio de contraseña pendiente, responde 403 CAMBIO_DE_CONTRASENA_REQUERIDO",
    { timeout: 60_000 },
    async () => {
      for (const ruta of RUTAS) {
        const e = await escenario()
        const pendiente = await estudianteDePrueba({ debeCambiarContrasena: true })
        await inscribirDePrueba(e.claseId, pendiente.id, "codigo")
        const respuesta = await pedir(ruta, e, await tokenDe(pendiente))
        expect(respuesta.statusCode, ruta.nombre).toBe(403)
        expect(codigoDe(respuesta), ruta.nombre).toBe("CAMBIO_DE_CONTRASENA_REQUERIDO")
      }
    },
  )

  it(
    "CL3-B03 a CL3-B08: cada ruta, con un alumno restringido inscrito, responde 403 ACCESO_RESTRINGIDO",
    { timeout: 60_000 },
    async () => {
      for (const ruta of RUTAS) {
        const e = await escenario()
        const restringido = await estudianteDePrueba({ accesoRestringido: true })
        await inscribirDePrueba(e.claseId, restringido.id, "codigo")
        const respuesta = await pedir(ruta, e, await tokenDe(restringido))
        expect(respuesta.statusCode, ruta.nombre).toBe(403)
        expect(codigoDe(respuesta), ruta.nombre).toBe("ACCESO_RESTRINGIDO")
      }
    },
  )

  it(
    "CL3-B04, CL3-B05 y CL3-B07: el admin no publica dudas ni respuestas y el estudiante (también el autor) no marca: 403 ROL_NO_PERMITIDO",
    { timeout: 60_000 },
    async () => {
      const negadas: string[] = []
      for (const ruta of RUTAS) {
        for (const quien of ["estudiante", "admin"] as const) {
          if (ruta.admite.includes(quien)) continue
          const e = await escenario()
          const respuesta = await pedir(ruta, e, tokenSegun(e, quien))
          expect(respuesta.statusCode, `${ruta.nombre} / ${quien}`).toBe(403)
          expect(codigoDe(respuesta), `${ruta.nombre} / ${quien}`).toBe("ROL_NO_PERMITIDO")
          negadas.push(`${ruta.nombre} / ${quien}`)
        }
      }
      expect(negadas).toEqual([
        "POST /clases/:claseId/dudas / admin",
        "PUT /clases/:claseId/dudas/:dudaId/resuelta / estudiante",
        "POST /clases/:claseId/dudas/:dudaId/respuestas / admin",
      ])
    },
  )

  it(
    "CL3-B03 a CL3-B08: cada ruta, en una clase ajena o inexistente, responde 403 SIN_ACCESO_A_LA_CLASE con el mismo cuerpo",
    { timeout: 90_000 },
    async () => {
      for (const ruta of RUTAS) {
        const e = await escenario()
        const ajeno = await maestroDePrueba()
        await crearClaseDePrueba(idsClases, { maestroId: ajeno.id })
        const tokens = [await tokenDe(ajeno)]
        if (ruta.admite.includes("estudiante"))
          tokens.push(await tokenDe(await estudianteDePrueba()))
        const cuerpos: string[] = []
        for (const token of tokens) {
          const respuesta = await pedir(ruta, e, token)
          expect(respuesta.statusCode, ruta.nombre).toBe(403)
          expect(codigoDe(respuesta), ruta.nombre).toBe("SIN_ACCESO_A_LA_CLASE")
          cuerpos.push(respuesta.body)
        }
        const inexistente = ruta.url(e).replace(e.claseId, randomUUID())
        const deLaRuta = [e.tokenMaestro]
        if (ruta.admite.includes("admin")) deLaRuta.push(tokenAdmin)
        for (const token of deLaRuta) {
          const respuesta = await pedir(ruta, e, token, inexistente)
          expect(respuesta.statusCode, `${ruta.nombre} / inexistente`).toBe(403)
          cuerpos.push(respuesta.body)
        }
        expect(new Set(cuerpos).size, ruta.nombre).toBe(1)
      }
    },
  )

  it(
    "CL3-B03 a CL3-B08: en cada negación, las dudas y sus respuestas quedan como estaban",
    { timeout: 120_000 },
    async () => {
      for (const ruta of RUTAS) {
        const e = await escenario()
        const pendiente = await estudianteDePrueba({ debeCambiarContrasena: true })
        const restringido = await estudianteDePrueba({ accesoRestringido: true })
        await inscribirDePrueba(e.claseId, restringido.id, "codigo")
        const ajeno = await maestroDePrueba()
        const negaciones: { descripcion: string; token: string | undefined }[] = [
          { descripcion: "sin sesión", token: undefined },
          { descripcion: "cambio pendiente", token: await tokenDe(pendiente) },
          { descripcion: "restringido", token: await tokenDe(restringido) },
          { descripcion: "maestro ajeno", token: await tokenDe(ajeno) },
        ]
        for (const quien of ["estudiante", "admin"] as const) {
          if (!ruta.admite.includes(quien)) {
            negaciones.push({ descripcion: quien, token: tokenSegun(e, quien) })
          }
        }
        for (const { descripcion, token } of negaciones) {
          const antes = await fotoDe(e.claseId)
          const respuesta = await pedir(ruta, e, token)
          expect(respuesta.statusCode, `${ruta.nombre} / ${descripcion}`).toBeGreaterThanOrEqual(
            400,
          )
          expect(await fotoDe(e.claseId), `${ruta.nombre} / ${descripcion}`).toEqual(antes)
        }
      }
    },
  )

  it(
    "CL3-B03 a CL3-B08: cada ruta responde su éxito a cada rol que admite, sin estado de pago, correo, rol ni quién marcó la duda",
    { timeout: 120_000 },
    async () => {
      for (const ruta of RUTAS) {
        for (const quien of ruta.admite) {
          const e = await escenario()
          const respuesta = await pedir(ruta, e, tokenSegun(e, quien))
          expect(respuesta.statusCode, `${ruta.nombre} / ${quien}: ${respuesta.body}`).toBe(
            ruta.exito,
          )
          if (ruta.exito === 204) continue
          const claves = clavesDe(respuesta.json())
          for (const prohibida of CLAVES_PROHIBIDAS) {
            expect(claves, `${ruta.nombre} / ${quien} / ${prohibida}`).not.toContain(prohibida)
          }
          expect(respuesta.body, `${ruta.nombre} / ${quien}`).not.toContain("deudor")
          expect(respuesta.body, `${ruta.nombre} / ${quien}`).not.toContain(e.autora.email)
        }
      }
    },
  )
})
