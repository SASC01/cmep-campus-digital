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
  crearComentarioDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"

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
  metodo: "GET" | "POST" | "DELETE"
  url: string
  payload?: InjectOptions["payload"]
  estatusPermitido: number
  tokenPermitido: string
  // El estudiante inscrito, cuando la ruta es solo del maestro.
  tokenIncorrecto?: string
  // Maestro ajeno y, si la ruta deja pasar a estudiantes, el estudiante no inscrito.
  tokensAjenos: string[]
  // Un restringido inscrito de verdad en la clase de la ruta (la restricción gana aunque la
  // pertenencia sea legítima).
  prepararRestringido: () => Promise<string>
  // Lo que ninguna negación debe cambiar: publicaciones, comentarios y trabajos de la clase.
  snapshotControlado: () => Promise<unknown>
}

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  otroMaestro: UsuarioDePrueba
  inscrito: UsuarioDePrueba
  noInscrito: UsuarioDePrueba
  publicacionId: string
  // Un comentario del estudiante inscrito: lo que borran las rutas de borrado.
  comentarioId: string
}

const escenario = async (): Promise<Escenario> => {
  const maestro = await maestroDePrueba()
  const otroMaestro = await maestroDePrueba()
  const inscrito = await estudianteDePrueba()
  const noInscrito = await estudianteDePrueba()
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await inscribirDePrueba(clase.id, inscrito.id, "codigo")
  const publicacionId = await crearPublicacionDePrueba({
    claseId: clase.id,
    autorId: maestro.id,
  })
  const comentarioId = await crearComentarioDePrueba({ publicacionId, autorId: inscrito.id })
  return {
    claseId: clase.id,
    maestro,
    otroMaestro,
    inscrito,
    noInscrito,
    publicacionId,
    comentarioId,
  }
}

const restringidoInscrito = async (claseId: string): Promise<string> => {
  const restringido = await estudianteDePrueba({ accesoRestringido: true })
  await inscribirDePrueba(claseId, restringido.id, "codigo")
  return tokenDe(restringido)
}

const snapshotDe = (claseId: string) => async (): Promise<unknown> => ({
  publicaciones: await obtenerDb().publicacion.findMany({
    where: { claseId },
    orderBy: { id: "asc" },
    select: { id: true, texto: true, titulo: true },
  }),
  comentarios: await obtenerDb().comentario.findMany({
    where: { publicacion: { claseId } },
    orderBy: { id: "asc" },
    select: { id: true, texto: true },
  }),
  trabajos: (
    await obtenerDb().$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pgboss.job WHERE data ->> 'claseId' = ${claseId}::text`
  )[0]?.n,
})

const base = (e: Escenario) => ({
  tokensAjenos: [] as string[],
  prepararRestringido: () => restringidoInscrito(e.claseId),
  snapshotControlado: snapshotDe(e.claseId),
})

const prepararGetPublicaciones = async (): Promise<PreparadoRuta> => {
  const e = await escenario()
  return {
    ...base(e),
    nombre: "GET /clases/:claseId/publicaciones",
    metodo: "GET",
    url: `/api/clases/${e.claseId}/publicaciones`,
    estatusPermitido: 200,
    tokenPermitido: await tokenDe(e.inscrito),
    tokensAjenos: [await tokenDe(e.otroMaestro), await tokenDe(e.noInscrito)],
  }
}

const prepararPostPublicaciones = async (): Promise<PreparadoRuta> => {
  const e = await escenario()
  return {
    ...base(e),
    nombre: "POST /clases/:claseId/publicaciones",
    metodo: "POST",
    url: `/api/clases/${e.claseId}/publicaciones`,
    payload: { tipo: "anuncio", texto: "Un anuncio de prueba" },
    estatusPermitido: 201,
    tokenPermitido: await tokenDe(e.maestro),
    tokenIncorrecto: await tokenDe(e.inscrito),
    tokensAjenos: [await tokenDe(e.otroMaestro)],
  }
}

const prepararDeletePublicacion = async (): Promise<PreparadoRuta> => {
  const e = await escenario()
  return {
    ...base(e),
    nombre: "DELETE /clases/:claseId/publicaciones/:publicacionId",
    metodo: "DELETE",
    url: `/api/clases/${e.claseId}/publicaciones/${e.publicacionId}`,
    estatusPermitido: 204,
    tokenPermitido: await tokenDe(e.maestro),
    tokenIncorrecto: await tokenDe(e.inscrito),
    tokensAjenos: [await tokenDe(e.otroMaestro)],
  }
}

const prepararGetComentarios = async (): Promise<PreparadoRuta> => {
  const e = await escenario()
  return {
    ...base(e),
    nombre: "GET /clases/:claseId/publicaciones/:publicacionId/comentarios",
    metodo: "GET",
    url: `/api/clases/${e.claseId}/publicaciones/${e.publicacionId}/comentarios`,
    estatusPermitido: 200,
    tokenPermitido: await tokenDe(e.inscrito),
    tokensAjenos: [await tokenDe(e.otroMaestro), await tokenDe(e.noInscrito)],
  }
}

const prepararPostComentarios = async (): Promise<PreparadoRuta> => {
  const e = await escenario()
  return {
    ...base(e),
    nombre: "POST /clases/:claseId/publicaciones/:publicacionId/comentarios",
    metodo: "POST",
    url: `/api/clases/${e.claseId}/publicaciones/${e.publicacionId}/comentarios`,
    payload: { texto: "Un comentario de prueba" },
    estatusPermitido: 201,
    tokenPermitido: await tokenDe(e.inscrito),
    tokensAjenos: [await tokenDe(e.otroMaestro), await tokenDe(e.noInscrito)],
  }
}

const prepararDeleteComentario = async (): Promise<PreparadoRuta> => {
  const e = await escenario()
  return {
    ...base(e),
    nombre: "DELETE /clases/:claseId/publicaciones/:publicacionId/comentarios/:comentarioId",
    metodo: "DELETE",
    url: `/api/clases/${e.claseId}/publicaciones/${e.publicacionId}/comentarios/${e.comentarioId}`,
    estatusPermitido: 204,
    tokenPermitido: await tokenDe(e.maestro),
    tokenIncorrecto: await tokenDe(e.inscrito),
    tokensAjenos: [await tokenDe(e.otroMaestro)],
  }
}

const prepararDeleteMiComentario = async (): Promise<PreparadoRuta> => {
  const e = await escenario()
  return {
    ...base(e),
    nombre: "DELETE /clases/:claseId/mis-comentarios/:comentarioId",
    metodo: "DELETE",
    url: `/api/clases/${e.claseId}/mis-comentarios/${e.comentarioId}`,
    estatusPermitido: 204,
    tokenPermitido: await tokenDe(e.inscrito),
    tokensAjenos: [await tokenDe(e.otroMaestro), await tokenDe(e.noInscrito)],
  }
}

// Las 7 rutas de CLASES-c (con sus HEAD automáticos, que Fastify deriva de los GET).
const preparadores = [
  prepararGetPublicaciones,
  prepararPostPublicaciones,
  prepararDeletePublicacion,
  prepararGetComentarios,
  prepararPostComentarios,
  prepararDeleteComentario,
  prepararDeleteMiComentario,
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

// El admin es único por base (índice parcial): se usa el que sembró seed:admin, con sus
// credenciales de prueba, nunca se crea uno nuevo.
const tokenAdminDePrueba = async (): Promise<string> => {
  const email = process.env.ADMIN_EMAIL
  const contrasena = process.env.ADMIN_PASSWORD
  if (!email || !contrasena) {
    throw new Error("Faltan ADMIN_EMAIL/ADMIN_PASSWORD en el entorno de pruebas")
  }
  const login = await obtenerApp().inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, contrasena },
  })
  if (login.statusCode !== 200) {
    throw new Error(`El login del admin de prueba respondió ${login.statusCode}: ${login.body}`)
  }
  return login.json<{ tokenAcceso: string }>().tokenAcceso
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  // N-10: movimientos y clases (con sus publicaciones y comentarios en cascada) antes que los
  // usuarios (ON DELETE RESTRICT).
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("autorización de las rutas de CLASES-c", () => {
  it("PR-C08a: cada ruta de c: sin token, 401", { timeout: 60000 }, async () => {
    for (const preparar of preparadores) {
      const prep = await preparar()
      const respuesta = await pedir(prep)
      expect(respuesta.statusCode, prep.nombre).toBe(401)
      expect(codigoDe(respuesta), prep.nombre).toBe("NO_AUTENTICADO")
    }
  })

  it(
    "PR-C08b: cada ruta: con debe_cambiar_contrasena, 403 CAMBIO_DE_CONTRASENA_REQUERIDO",
    { timeout: 60000 },
    async () => {
      for (const preparar of preparadores) {
        const prep = await preparar()
        const conCambioPendiente = await estudianteDePrueba({ debeCambiarContrasena: true })
        const respuesta = await pedir(prep, await tokenDe(conCambioPendiente))
        expect(respuesta.statusCode, prep.nombre).toBe(403)
        expect(codigoDe(respuesta), prep.nombre).toBe("CAMBIO_DE_CONTRASENA_REQUERIDO")
      }
    },
  )

  it(
    "PR-C08c: cada ruta: estudiante restringido inscrito, 403 ACCESO_RESTRINGIDO",
    { timeout: 60000 },
    async () => {
      for (const preparar of preparadores) {
        const prep = await preparar()
        const respuesta = await pedir(prep, await prep.prepararRestringido())
        expect(respuesta.statusCode, prep.nombre).toBe(403)
        expect(codigoDe(respuesta), prep.nombre).toBe("ACCESO_RESTRINGIDO")
      }
    },
  )

  it("PR-C08d: cada ruta: admin, 403 ROL_NO_PERMITIDO", { timeout: 60000 }, async () => {
    const token = await tokenAdminDePrueba()
    for (const preparar of preparadores) {
      const prep = await preparar()
      const respuesta = await pedir(prep, token)
      expect(respuesta.statusCode, prep.nombre).toBe(403)
      expect(codigoDe(respuesta), prep.nombre).toBe("ROL_NO_PERMITIDO")
    }
  })

  it(
    "PR-C08e: cada ruta: rol incorrecto, 403 ROL_NO_PERMITIDO (el estudiante inscrito en el POST y el DELETE de publicaciones y en el DELETE de comentarios)",
    { timeout: 60000 },
    async () => {
      const rutasConRolIncorrecto: string[] = []
      for (const preparar of preparadores) {
        const prep = await preparar()
        // Las rutas de miembros aceptan a los dos roles: no tienen "rol incorrecto".
        if (prep.tokenIncorrecto === undefined) continue
        rutasConRolIncorrecto.push(prep.nombre)
        const respuesta = await pedir(prep, prep.tokenIncorrecto)
        expect(respuesta.statusCode, prep.nombre).toBe(403)
        expect(codigoDe(respuesta), prep.nombre).toBe("ROL_NO_PERMITIDO")
      }
      expect(rutasConRolIncorrecto).toHaveLength(3)
    },
  )

  it(
    "PR-C08f: cada ruta: maestro ajeno y estudiante no inscrito, 403 SIN_ACCESO_A_LA_CLASE",
    { timeout: 60000 },
    async () => {
      for (const preparar of preparadores) {
        const prep = await preparar()
        expect(prep.tokensAjenos.length, prep.nombre).toBeGreaterThan(0)
        for (const tokenAjeno of prep.tokensAjenos) {
          const respuesta = await pedir(prep, tokenAjeno)
          expect(respuesta.statusCode, prep.nombre).toBe(403)
          expect(codigoDe(respuesta), prep.nombre).toBe("SIN_ACCESO_A_LA_CLASE")
        }
      }
    },
  )

  it("PR-C08g: cada ruta: el caso permitido, 2xx", { timeout: 60000 }, async () => {
    for (const preparar of preparadores) {
      const prep = await preparar()
      const respuesta = await pedir(prep, prep.tokenPermitido)
      expect(respuesta.statusCode, prep.nombre).toBe(prep.estatusPermitido)
    }
  })

  it(
    "PR-C08h: en cada caso negado, publicaciones, comentarios y trabajos de la clase quedan como estaban",
    { timeout: 60000 },
    async () => {
      const tokenAdmin = await tokenAdminDePrueba()
      for (const preparar of preparadores) {
        const prep = await preparar()
        const conCambioPendiente = await estudianteDePrueba({ debeCambiarContrasena: true })
        const negaciones: { descripcion: string; token: string | undefined }[] = [
          { descripcion: "sin token", token: undefined },
          { descripcion: "cambio pendiente", token: await tokenDe(conCambioPendiente) },
          { descripcion: "restringido", token: await prep.prepararRestringido() },
          { descripcion: "admin", token: tokenAdmin },
        ]
        if (prep.tokenIncorrecto !== undefined) {
          negaciones.push({ descripcion: "rol incorrecto", token: prep.tokenIncorrecto })
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

  it("una publicación de otra clase con un claseId propio responde 404, sin escribir", async () => {
    const e = await escenario()
    const otra = await escenario()
    const token = await tokenDe(e.maestro)

    for (const [metodo, url] of [
      ["DELETE", `/api/clases/${e.claseId}/publicaciones/${otra.publicacionId}`],
      [
        "DELETE",
        `/api/clases/${e.claseId}/publicaciones/${otra.publicacionId}/comentarios/${otra.comentarioId}`,
      ],
      ["DELETE", `/api/clases/${e.claseId}/mis-comentarios/${otra.comentarioId}`],
      ["GET", `/api/clases/${e.claseId}/publicaciones/${otra.publicacionId}/comentarios`],
      ["GET", `/api/clases/${e.claseId}/publicaciones/${randomUUID()}/comentarios`],
    ] as const) {
      const antes = await snapshotDe(otra.claseId)()
      const respuesta = await pedir({ metodo, url }, token)
      expect(respuesta.statusCode, url).toBe(404)
      expect(await snapshotDe(otra.claseId)(), url).toEqual(antes)
    }
  })
})
