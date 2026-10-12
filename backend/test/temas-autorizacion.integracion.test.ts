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
  crearClaseDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import {
  crearCategoriaDePrueba,
  crearMaterialConTemaDePrueba,
  crearTemaDePrueba,
} from "./ayudas-tareas.js"

// TAREAS-01a (PR-1A09): autorización de las ocho rutas de temas, mover y categorías.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const maestroDePrueba = (): Promise<UsuarioDePrueba> =>
  crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
const estudianteDePrueba = (
  opciones: Parameters<typeof crearUsuarioDePrueba>[1] = {},
): Promise<UsuarioDePrueba> => crearUsuarioDePrueba(idsUsuarios, { ...opciones, rol: "estudiante" })
const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

interface PreparadoRuta {
  nombre: string
  metodo: "GET" | "POST" | "PUT" | "DELETE"
  url: string
  claseId: string
  payload?: InjectOptions["payload"]
  estatusPermitido: number
  // true: el estudiante inscrito también puede (solo GET …/temas).
  admiteEstudiante: boolean
  tokenMaestro: string
  tokenEstudiante: string
  // Maestro de otra clase y, si la ruta deja pasar a estudiantes, el estudiante no inscrito.
  tokensAjenos: string[]
  prepararRestringido: () => Promise<string>
  // Lo que ninguna negación debe cambiar: temas, categorías y el tema de cada publicación.
  snapshotControlado: () => Promise<unknown>
}

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  otroMaestro: UsuarioDePrueba
  inscrito: UsuarioDePrueba
  noInscrito: UsuarioDePrueba
  temaId: string
  materialId: string
}

const escenario = async (): Promise<Escenario> => {
  const maestro = await maestroDePrueba()
  const otroMaestro = await maestroDePrueba()
  const inscrito = await estudianteDePrueba()
  const noInscrito = await estudianteDePrueba()
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await inscribirDePrueba(clase.id, inscrito.id, "codigo")
  const tema = await crearTemaDePrueba({ claseId: clase.id, nombre: "Unidad 1", orden: 0 })
  await crearCategoriaDePrueba({ claseId: clase.id, nombre: "Todo", peso: 100 })
  const materialId = await crearMaterialConTemaDePrueba({
    claseId: clase.id,
    autorId: maestro.id,
    temaId: tema.id,
  })
  return {
    claseId: clase.id,
    maestro,
    otroMaestro,
    inscrito,
    noInscrito,
    temaId: tema.id,
    materialId,
  }
}

const restringidoInscrito = async (claseId: string): Promise<string> => {
  const restringido = await estudianteDePrueba({ accesoRestringido: true })
  await inscribirDePrueba(claseId, restringido.id, "codigo")
  return tokenDe(restringido)
}

const snapshotDe = (claseId: string) => async (): Promise<unknown> => ({
  temas: await obtenerDb().tema.findMany({
    where: { claseId },
    orderBy: { id: "asc" },
    select: { id: true, nombre: true, orden: true },
  }),
  categorias: await obtenerDb().categoria.findMany({
    where: { claseId },
    orderBy: { id: "asc" },
    select: { id: true, nombre: true, peso: true },
  }),
  publicaciones: await obtenerDb().publicacion.findMany({
    where: { claseId },
    orderBy: { id: "asc" },
    select: { id: true, temaId: true },
  }),
})

const preparar = async (
  nombre: string,
  datos: {
    metodo: PreparadoRuta["metodo"]
    ruta: (e: Escenario) => string
    payload?: (e: Escenario) => InjectOptions["payload"]
    estatusPermitido: number
    admiteEstudiante?: boolean
  },
): Promise<PreparadoRuta> => {
  const e = await escenario()
  const admiteEstudiante = datos.admiteEstudiante ?? false
  return {
    nombre,
    metodo: datos.metodo,
    url: `/api/clases/${e.claseId}${datos.ruta(e)}`,
    claseId: e.claseId,
    ...(datos.payload === undefined ? {} : { payload: datos.payload(e) }),
    estatusPermitido: datos.estatusPermitido,
    admiteEstudiante,
    tokenMaestro: await tokenDe(e.maestro),
    tokenEstudiante: await tokenDe(e.inscrito),
    tokensAjenos: admiteEstudiante
      ? [await tokenDe(e.otroMaestro), await tokenDe(e.noInscrito)]
      : [await tokenDe(e.otroMaestro)],
    prepararRestringido: () => restringidoInscrito(e.claseId),
    snapshotControlado: snapshotDe(e.claseId),
  }
}

const rutas: (() => Promise<PreparadoRuta>)[] = [
  () =>
    preparar("GET /clases/:claseId/temas", {
      metodo: "GET",
      ruta: () => "/temas",
      estatusPermitido: 200,
      admiteEstudiante: true,
    }),
  () =>
    preparar("POST /clases/:claseId/temas", {
      metodo: "POST",
      ruta: () => "/temas",
      payload: () => ({ nombre: "Tema nuevo" }),
      estatusPermitido: 201,
    }),
  () =>
    preparar("PUT /clases/:claseId/temas/:temaId", {
      metodo: "PUT",
      ruta: (e) => `/temas/${e.temaId}`,
      payload: () => ({ nombre: "Renombrado" }),
      estatusPermitido: 200,
    }),
  () =>
    preparar("DELETE /clases/:claseId/temas/:temaId", {
      metodo: "DELETE",
      ruta: (e) => `/temas/${e.temaId}`,
      estatusPermitido: 204,
    }),
  () =>
    preparar("PUT /clases/:claseId/temas/orden", {
      metodo: "PUT",
      ruta: () => "/temas/orden",
      payload: (e) => ({ temaIds: [e.temaId] }),
      estatusPermitido: 200,
    }),
  () =>
    preparar("PUT /clases/:claseId/publicaciones/:publicacionId/tema", {
      metodo: "PUT",
      ruta: (e) => `/publicaciones/${e.materialId}/tema`,
      payload: () => ({ temaId: null }),
      estatusPermitido: 200,
    }),
  () =>
    preparar("GET /clases/:claseId/categorias", {
      metodo: "GET",
      ruta: () => "/categorias",
      estatusPermitido: 200,
    }),
  () =>
    preparar("PUT /clases/:claseId/categorias", {
      metodo: "PUT",
      ruta: () => "/categorias",
      payload: () => ({ categorias: [{ nombre: "Solo una", peso: 100 }] }),
      estatusPermitido: 200,
    }),
]

const pedir = (
  prep: Pick<PreparadoRuta, "metodo" | "url" | "payload">,
  token?: string,
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: prep.metodo,
    url: prep.url,
    ...(prep.payload === undefined ? {} : { payload: prep.payload }),
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  })

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

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  // N-10: clases (con sus temas, categorías y publicaciones en cascada) antes que los usuarios.
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("autorización de las rutas de temas y categorías de TAREAS-01a (PR-1A09)", () => {
  it("PR-1A09: las ocho rutas de 01a se prueban", async () => {
    expect(rutas).toHaveLength(8)
    const nombres = await Promise.all(rutas.map(async (preparar) => (await preparar()).nombre))
    expect(new Set(nombres).size).toBe(8)
  })

  it("PR-1A09: cada ruta: sin token, 401 NO_AUTENTICADO", { timeout: 60000 }, async () => {
    for (const hacer of rutas) {
      const prep = await hacer()
      const respuesta = await pedir(prep)
      expect(respuesta.statusCode, prep.nombre).toBe(401)
      expect(codigoDe(respuesta), prep.nombre).toBe("NO_AUTENTICADO")
    }
  })

  it(
    "PR-1A09: cada ruta: con cambio de contraseña pendiente, 403 CAMBIO_DE_CONTRASENA_REQUERIDO",
    { timeout: 60000 },
    async () => {
      for (const hacer of rutas) {
        const prep = await hacer()
        const conCambioPendiente = await estudianteDePrueba({ debeCambiarContrasena: true })
        const respuesta = await pedir(prep, await tokenDe(conCambioPendiente))
        expect(respuesta.statusCode, prep.nombre).toBe(403)
        expect(codigoDe(respuesta), prep.nombre).toBe("CAMBIO_DE_CONTRASENA_REQUERIDO")
      }
    },
  )

  it(
    "PR-1A09: cada ruta: estudiante restringido inscrito, 403 ACCESO_RESTRINGIDO",
    { timeout: 60000 },
    async () => {
      for (const hacer of rutas) {
        const prep = await hacer()
        const respuesta = await pedir(prep, await prep.prepararRestringido())
        expect(respuesta.statusCode, prep.nombre).toBe(403)
        expect(codigoDe(respuesta), prep.nombre).toBe("ACCESO_RESTRINGIDO")
      }
    },
  )

  it(
    "PR-1A09: las siete rutas de maestro y admin: el estudiante inscrito recibe 403 ROL_NO_PERMITIDO (también en GET …/categorias)",
    { timeout: 60000 },
    async () => {
      const rutasDeMaestro: string[] = []
      for (const hacer of rutas) {
        const prep = await hacer()
        if (prep.admiteEstudiante) continue
        rutasDeMaestro.push(prep.nombre)
        const respuesta = await pedir(prep, prep.tokenEstudiante)
        expect(respuesta.statusCode, prep.nombre).toBe(403)
        expect(codigoDe(respuesta), prep.nombre).toBe("ROL_NO_PERMITIDO")
      }
      expect(rutasDeMaestro).toHaveLength(7)
      expect(rutasDeMaestro).toContain("GET /clases/:claseId/categorias")
    },
  )

  it(
    "PR-1A09: cada ruta: maestro de otra clase y, donde aplica, estudiante no inscrito, 403 SIN_ACCESO_A_LA_CLASE",
    { timeout: 60000 },
    async () => {
      for (const hacer of rutas) {
        const prep = await hacer()
        expect(prep.tokensAjenos.length, prep.nombre).toBeGreaterThan(0)
        for (const tokenAjeno of prep.tokensAjenos) {
          const respuesta = await pedir(prep, tokenAjeno)
          expect(respuesta.statusCode, prep.nombre).toBe(403)
          expect(codigoDe(respuesta), prep.nombre).toBe("SIN_ACCESO_A_LA_CLASE")
        }
      }
    },
  )

  it(
    "PR-1A09: cada ruta: una clase inexistente responde 403 SIN_ACCESO_A_LA_CLASE, igual que una ajena, al maestro y al admin",
    { timeout: 60000 },
    async () => {
      const tokenAdmin = await tokenDelAdminDePrueba()
      for (const hacer of rutas) {
        const prep = await hacer()
        const inexistente = { ...prep, url: prep.url.replace(prep.claseId, randomUUID()) }
        for (const token of [prep.tokenMaestro, tokenAdmin]) {
          const respuesta = await pedir(inexistente, token)
          expect(respuesta.statusCode, prep.nombre).toBe(403)
          expect(codigoDe(respuesta), prep.nombre).toBe("SIN_ACCESO_A_LA_CLASE")
        }
      }
    },
  )

  it(
    "PR-1A09: cada ruta: el maestro de la clase y el admin reciben el éxito de la ruta",
    { timeout: 60000 },
    async () => {
      const tokenAdmin = await tokenDelAdminDePrueba()
      for (const hacer of rutas) {
        const comoMaestro = await hacer()
        const respuestaMaestro = await pedir(comoMaestro, comoMaestro.tokenMaestro)
        expect(respuestaMaestro.statusCode, `${comoMaestro.nombre} / maestro`).toBe(
          comoMaestro.estatusPermitido,
        )
        const comoAdmin = await hacer()
        const respuestaAdmin = await pedir(comoAdmin, tokenAdmin)
        expect(respuestaAdmin.statusCode, `${comoAdmin.nombre} / admin`).toBe(
          comoAdmin.estatusPermitido,
        )
      }
    },
  )

  it("PR-1A09: GET …/temas también responde 200 al estudiante inscrito", async () => {
    const prep = await rutas[0]?.()
    if (!prep) throw new Error("Precondición: la primera ruta es GET …/temas")
    expect(prep.admiteEstudiante).toBe(true)

    const respuesta = await pedir(prep, prep.tokenEstudiante)

    expect(respuesta.statusCode).toBe(200)
  })

  it(
    "PR-1A09: en cada caso negado, temas, categorías y el tema de cada publicación quedan como estaban",
    { timeout: 120000 },
    async () => {
      for (const hacer of rutas) {
        const prep = await hacer()
        const conCambioPendiente = await estudianteDePrueba({ debeCambiarContrasena: true })
        const negaciones: { descripcion: string; token: string | undefined }[] = [
          { descripcion: "sin token", token: undefined },
          { descripcion: "cambio pendiente", token: await tokenDe(conCambioPendiente) },
          { descripcion: "restringido", token: await prep.prepararRestringido() },
        ]
        if (!prep.admiteEstudiante) {
          negaciones.push({ descripcion: "estudiante", token: prep.tokenEstudiante })
        }
        prep.tokensAjenos.forEach((token, indice) => {
          negaciones.push({ descripcion: `ajeno ${String(indice)}`, token })
        })

        for (const { descripcion, token } of negaciones) {
          const antes = await prep.snapshotControlado()
          const respuesta = await pedir(prep, token)
          expect(respuesta.statusCode, `${prep.nombre} / ${descripcion}`).toBeGreaterThanOrEqual(
            400,
          )
          expect(await prep.snapshotControlado(), `${prep.nombre} / ${descripcion}`).toEqual(antes)
        }
      }
    },
  )

  it(
    "PR-1A09: ninguna respuesta de éxito lleva estadoPago, accesoRestringido ni correos",
    { timeout: 60000 },
    async () => {
      const tokenAdmin = await tokenDelAdminDePrueba()
      for (const hacer of rutas) {
        for (const quien of ["maestro", "admin", "estudiante"] as const) {
          const prep = await hacer()
          if (quien === "estudiante" && !prep.admiteEstudiante) continue
          const token = {
            maestro: prep.tokenMaestro,
            admin: tokenAdmin,
            estudiante: prep.tokenEstudiante,
          }[quien]
          const respuesta = await pedir(prep, token)
          expect(respuesta.statusCode, `${prep.nombre} / ${quien}`).toBe(prep.estatusPermitido)
          if (respuesta.statusCode === 204) continue
          const claves = clavesDe(respuesta.json())
          for (const prohibida of ["estadoPago", "accesoRestringido", "email", "correo"]) {
            expect(claves, `${prep.nombre} / ${quien}`).not.toContain(prohibida)
          }
          expect(respuesta.body, `${prep.nombre} / ${quien}`).not.toContain("@")
        }
      }
    },
  )
})
