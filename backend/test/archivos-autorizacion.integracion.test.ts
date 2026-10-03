import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria, type AlmacenEnMemoria } from "./almacen-en-memoria.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"

let app: FastifyInstance | undefined
const almacen: AlmacenEnMemoria = crearAlmacenEnMemoria()
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
  metodo: "POST"
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
  // Lo que ninguna negación debe cambiar: los archivos de la clase.
  snapshotControlado: () => Promise<unknown>
}

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  otroMaestro: UsuarioDePrueba
  inscrito: UsuarioDePrueba
  noInscrito: UsuarioDePrueba
  // Un archivo confirmado del muro: lo que descarga la segunda ruta.
  archivoId: string
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
    tipo: "material",
  })
  const archivo = await crearArchivoDePrueba({
    claseId: clase.id,
    subidoPor: maestro.id,
    estado: "confirmado",
    publicacionId,
  })
  return { claseId: clase.id, maestro, otroMaestro, inscrito, noInscrito, archivoId: archivo.id }
}

const restringidoInscrito = async (claseId: string): Promise<string> => {
  const restringido = await estudianteDePrueba({ accesoRestringido: true })
  await inscribirDePrueba(claseId, restringido.id, "codigo")
  return tokenDe(restringido)
}

const snapshotDe = (claseId: string) => async (): Promise<unknown> =>
  obtenerDb().archivo.findMany({
    where: { claseId },
    orderBy: { id: "asc" },
    select: { id: true, estado: true, publicacionId: true, nombre: true, tamano: true },
  })

const base = (e: Escenario) => ({
  tokensAjenos: [] as string[],
  prepararRestringido: () => restringidoInscrito(e.claseId),
  snapshotControlado: snapshotDe(e.claseId),
})

const prepararPostArchivos = async (): Promise<PreparadoRuta> => {
  const e = await escenario()
  return {
    ...base(e),
    nombre: "POST /clases/:claseId/archivos",
    metodo: "POST",
    url: `/api/clases/${e.claseId}/archivos`,
    payload: { nombre: "guia.pdf", tipo: "application/pdf", tamano: 1000 },
    estatusPermitido: 201,
    tokenPermitido: await tokenDe(e.maestro),
    tokenIncorrecto: await tokenDe(e.inscrito),
    tokensAjenos: [await tokenDe(e.otroMaestro)],
  }
}

const prepararPostDescarga = async (): Promise<PreparadoRuta> => {
  const e = await escenario()
  return {
    ...base(e),
    nombre: "POST /clases/:claseId/archivos/:archivoId/descarga",
    metodo: "POST",
    url: `/api/clases/${e.claseId}/archivos/${e.archivoId}/descarga`,
    estatusPermitido: 200,
    tokenPermitido: await tokenDe(e.inscrito),
    tokensAjenos: [await tokenDe(e.otroMaestro), await tokenDe(e.noInscrito)],
  }
}

// Las 2 rutas de CLASES-d.
const preparadores = [prepararPostArchivos, prepararPostDescarga]

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
  app = await construirApp({ env: cargarEnv(), almacen })
  await app.ready()
})

afterAll(async () => {
  // N-10: movimientos y clases (con sus publicaciones y archivos en cascada) antes que los usuarios
  // (ON DELETE RESTRICT).
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("autorización de las rutas de CLASES-d", () => {
  it("PR-D09a: cada ruta de d: sin token, 401", { timeout: 60000 }, async () => {
    for (const preparar of preparadores) {
      const prep = await preparar()
      const respuesta = await pedir(prep)
      expect(respuesta.statusCode, prep.nombre).toBe(401)
      expect(codigoDe(respuesta), prep.nombre).toBe("NO_AUTENTICADO")
    }
  })

  it(
    "PR-D09b: cada ruta: con debe_cambiar_contrasena, 403 CAMBIO_DE_CONTRASENA_REQUERIDO",
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
    "PR-D09c: cada ruta: estudiante restringido inscrito, 403 ACCESO_RESTRINGIDO",
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

  it("PR-D09d: cada ruta: admin, 403 ROL_NO_PERMITIDO", { timeout: 60000 }, async () => {
    const token = await tokenAdminDePrueba()
    for (const preparar of preparadores) {
      const prep = await preparar()
      const respuesta = await pedir(prep, token)
      expect(respuesta.statusCode, prep.nombre).toBe(403)
      expect(codigoDe(respuesta), prep.nombre).toBe("ROL_NO_PERMITIDO")
    }
  })

  it(
    "PR-D09e: cada ruta: rol incorrecto, 403 ROL_NO_PERMITIDO (el estudiante inscrito en la solicitud de subida)",
    { timeout: 60000 },
    async () => {
      const rutasConRolIncorrecto: string[] = []
      for (const preparar of preparadores) {
        const prep = await preparar()
        // La descarga acepta a los dos roles: no tiene "rol incorrecto".
        if (prep.tokenIncorrecto === undefined) continue
        rutasConRolIncorrecto.push(prep.nombre)
        const respuesta = await pedir(prep, prep.tokenIncorrecto)
        expect(respuesta.statusCode, prep.nombre).toBe(403)
        expect(codigoDe(respuesta), prep.nombre).toBe("ROL_NO_PERMITIDO")
      }
      expect(rutasConRolIncorrecto).toEqual(["POST /clases/:claseId/archivos"])
    },
  )

  it(
    "PR-D09f: cada ruta: maestro ajeno y estudiante no inscrito, 403 SIN_ACCESO_A_LA_CLASE",
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

  it("PR-D09g: cada ruta: el caso permitido, 2xx", { timeout: 60000 }, async () => {
    for (const preparar of preparadores) {
      const prep = await preparar()
      const respuesta = await pedir(prep, prep.tokenPermitido)
      expect(respuesta.statusCode, prep.nombre).toBe(prep.estatusPermitido)
    }
  })

  it(
    "PR-D09h: en cada caso negado, los archivos de la clase quedan como estaban",
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

  it("PR-D09i: un restringido inscrito no obtiene ninguna URL", { timeout: 60000 }, async () => {
    const subidasAntes = almacen.subidasFirmadas.length
    const descargasAntes = almacen.descargasFirmadas.length
    for (const preparar of preparadores) {
      const prep = await preparar()
      const respuesta = await pedir(prep, await prep.prepararRestringido())
      expect(respuesta.statusCode, prep.nombre).toBe(403)
      expect(respuesta.body, prep.nombre).not.toContain("http")
      expect(respuesta.json(), prep.nombre).not.toHaveProperty("url")
      expect(respuesta.json(), prep.nombre).not.toHaveProperty("subida")
    }
    expect(almacen.subidasFirmadas).toHaveLength(subidasAntes)
    expect(almacen.descargasFirmadas).toHaveLength(descargasAntes)
  })
})
