import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
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
} from "./ayudas-clases.js"

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
// PR-B08i: los cuerpos de toda respuesta que recibió una cuenta de estudiante.
const idsDeEstudiantes = new Set<string>()
const cuerposDeEstudiantes: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const maestroDePrueba = (): Promise<UsuarioDePrueba> =>
  crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
const estudianteDePrueba = async (
  opciones: Parameters<typeof crearUsuarioDePrueba>[1] = {},
): Promise<UsuarioDePrueba> => {
  const estudiante = await crearUsuarioDePrueba(idsUsuarios, { ...opciones, rol: "estudiante" })
  idsDeEstudiantes.add(estudiante.id)
  return estudiante
}
const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

// Extrae "sub" de un token de acceso de prueba, sin verificar la firma: solo para saber de quién
// es la petición (PR-B08i).
const idDelToken = (token: string): string => {
  const carga = token.split(".")[1]
  if (carga === undefined) throw new Error("Token de prueba sin carga")
  const payload = JSON.parse(Buffer.from(carga, "base64url").toString("utf8")) as { sub?: string }
  if (payload.sub === undefined) throw new Error("Token de prueba sin sub")
  return payload.sub
}

interface PreparadoRuta {
  nombre: string
  metodo: "GET" | "POST" | "DELETE"
  url: string
  payload?: unknown
  estatusPermitido: number
  tokenPermitido: string
  // El estudiante inscrito, cuando la ruta es solo del maestro (GET …/personas acepta a los dos).
  tokenIncorrecto?: string
  // Maestro ajeno y, si la ruta deja pasar a estudiantes, el estudiante no inscrito.
  tokensAjenos: string[]
  // Un restringido inscrito de verdad en la clase de la ruta (M-01 de a: la restricción gana aunque
  // la pertenencia sea legítima).
  prepararRestringido: () => Promise<string>
  // Lo que ninguna negación debe cambiar (PR-B08h): las inscripciones y los movimientos de la clase.
  snapshotControlado: () => Promise<unknown>
}

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  otroMaestro: UsuarioDePrueba
  inscrito: UsuarioDePrueba
  noInscrito: UsuarioDePrueba
  // Un alumno con el que el POST y el DELETE hacen algo real si una negación se colara.
  objetivo: UsuarioDePrueba
}

const escenario = async (objetivoInscrito: boolean): Promise<Escenario> => {
  const maestro = await maestroDePrueba()
  const otroMaestro = await maestroDePrueba()
  const inscrito = await estudianteDePrueba()
  const noInscrito = await estudianteDePrueba()
  const objetivo = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Objetivo de autorización" })
  idsDeEstudiantes.add(objetivo.id)
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await inscribirDePrueba(clase.id, inscrito.id, "codigo")
  if (objetivoInscrito) await inscribirDePrueba(clase.id, objetivo.id, "manual")
  return { claseId: clase.id, maestro, otroMaestro, inscrito, noInscrito, objetivo }
}

const restringidoInscrito = async (claseId: string): Promise<string> => {
  const restringido = await estudianteDePrueba({ accesoRestringido: true })
  await inscribirDePrueba(claseId, restringido.id, "codigo")
  return tokenDe(restringido)
}

const snapshotDe = (claseId: string) => async (): Promise<unknown> => ({
  inscripciones: await obtenerDb().inscripcion.findMany({
    where: { claseId },
    orderBy: { usuarioId: "asc" },
    select: { usuarioId: true, origen: true },
  }),
  movimientos: await obtenerDb().movimientoInscripcion.count({ where: { claseId } }),
})

const prepararGetPersonas = async (): Promise<PreparadoRuta> => {
  const e = await escenario(false)
  // Un compañero deudor, para que una fuga del estado de pago a un estudiante se vea (PR-B08i).
  const deudor = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: "Compañero Deudor",
    estadoPago: "deudor",
  })
  idsDeEstudiantes.add(deudor.id)
  await inscribirDePrueba(e.claseId, deudor.id)
  return {
    nombre: "GET /clases/:claseId/personas",
    metodo: "GET",
    url: `/api/clases/${e.claseId}/personas`,
    estatusPermitido: 200,
    tokenPermitido: await tokenDe(e.inscrito),
    tokensAjenos: [await tokenDe(e.otroMaestro), await tokenDe(e.noInscrito)],
    prepararRestringido: () => restringidoInscrito(e.claseId),
    snapshotControlado: snapshotDe(e.claseId),
  }
}

const prepararGetAlumnos = async (): Promise<PreparadoRuta> => {
  const e = await escenario(false)
  return {
    nombre: "GET /clases/:claseId/alumnos",
    metodo: "GET",
    url: `/api/clases/${e.claseId}/alumnos`,
    estatusPermitido: 200,
    tokenPermitido: await tokenDe(e.maestro),
    tokenIncorrecto: await tokenDe(e.inscrito),
    tokensAjenos: [await tokenDe(e.otroMaestro)],
    prepararRestringido: () => restringidoInscrito(e.claseId),
    snapshotControlado: snapshotDe(e.claseId),
  }
}

const prepararGetCandidatos = async (): Promise<PreparadoRuta> => {
  const e = await escenario(false)
  return {
    nombre: "GET /clases/:claseId/alumnos/candidatos",
    metodo: "GET",
    url: `/api/clases/${e.claseId}/alumnos/candidatos?q=objetivo`,
    estatusPermitido: 200,
    tokenPermitido: await tokenDe(e.maestro),
    tokenIncorrecto: await tokenDe(e.inscrito),
    tokensAjenos: [await tokenDe(e.otroMaestro)],
    prepararRestringido: () => restringidoInscrito(e.claseId),
    snapshotControlado: snapshotDe(e.claseId),
  }
}

const prepararPostAlumnos = async (): Promise<PreparadoRuta> => {
  const e = await escenario(false)
  return {
    nombre: "POST /clases/:claseId/alumnos",
    metodo: "POST",
    url: `/api/clases/${e.claseId}/alumnos`,
    payload: { alumnoId: e.objetivo.id },
    estatusPermitido: 200,
    tokenPermitido: await tokenDe(e.maestro),
    tokenIncorrecto: await tokenDe(e.inscrito),
    tokensAjenos: [await tokenDe(e.otroMaestro)],
    prepararRestringido: () => restringidoInscrito(e.claseId),
    snapshotControlado: snapshotDe(e.claseId),
  }
}

const prepararDeleteAlumno = async (): Promise<PreparadoRuta> => {
  const e = await escenario(true)
  return {
    nombre: "DELETE /clases/:claseId/alumnos/:alumnoId",
    metodo: "DELETE",
    url: `/api/clases/${e.claseId}/alumnos/${e.objetivo.id}`,
    estatusPermitido: 204,
    tokenPermitido: await tokenDe(e.maestro),
    tokenIncorrecto: await tokenDe(e.inscrito),
    tokensAjenos: [await tokenDe(e.otroMaestro)],
    prepararRestringido: () => restringidoInscrito(e.claseId),
    snapshotControlado: snapshotDe(e.claseId),
  }
}

// Las 5 rutas de CLASES-b (con sus HEAD automáticos, que Fastify deriva de los GET).
const preparadores = [
  prepararGetPersonas,
  prepararGetAlumnos,
  prepararGetCandidatos,
  prepararPostAlumnos,
  prepararDeleteAlumno,
]

const pedir = async (
  prep: Pick<PreparadoRuta, "metodo" | "url" | "payload">,
  token?: string,
): Promise<LightMyRequestResponse> => {
  const respuesta = await obtenerApp().inject({
    method: prep.metodo,
    url: prep.url,
    payload: prep.payload,
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  })
  if (token !== undefined && idsDeEstudiantes.has(idDelToken(token))) {
    cuerposDeEstudiantes.push(respuesta.body)
  }
  return respuesta
}

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
  // N-10: movimientos y clases antes que los usuarios (ON DELETE RESTRICT).
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("autorización de las rutas de CLASES-b", () => {
  it("PR-B08a: cada ruta de b: sin token, 401", { timeout: 60000 }, async () => {
    for (const preparar of preparadores) {
      const prep = await preparar()
      const respuesta = await pedir(prep)
      expect(respuesta.statusCode, prep.nombre).toBe(401)
      expect(codigoDe(respuesta), prep.nombre).toBe("NO_AUTENTICADO")
    }
  })

  it(
    "PR-B08b: cada ruta: con debe_cambiar_contrasena, 403 CAMBIO_DE_CONTRASENA_REQUERIDO",
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
    "PR-B08c: cada ruta: estudiante restringido inscrito, 403 ACCESO_RESTRINGIDO",
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

  it("PR-B08d: cada ruta: admin, 403 ROL_NO_PERMITIDO", { timeout: 60000 }, async () => {
    const token = await tokenAdminDePrueba()
    for (const preparar of preparadores) {
      const prep = await preparar()
      const respuesta = await pedir(prep, token)
      expect(respuesta.statusCode, prep.nombre).toBe(403)
      expect(codigoDe(respuesta), prep.nombre).toBe("ROL_NO_PERMITIDO")
    }
  })

  it(
    "PR-B08e: cada ruta: rol incorrecto, 403 ROL_NO_PERMITIDO (el estudiante inscrito en …/alumnos, …/candidatos y en el POST y el DELETE)",
    { timeout: 60000 },
    async () => {
      const rutasConRolIncorrecto: string[] = []
      for (const preparar of preparadores) {
        const prep = await preparar()
        // GET …/personas acepta a los dos roles: no tiene "rol incorrecto".
        if (prep.tokenIncorrecto === undefined) continue
        rutasConRolIncorrecto.push(prep.nombre)
        const respuesta = await pedir(prep, prep.tokenIncorrecto)
        expect(respuesta.statusCode, prep.nombre).toBe(403)
        expect(codigoDe(respuesta), prep.nombre).toBe("ROL_NO_PERMITIDO")
      }
      expect(rutasConRolIncorrecto).toHaveLength(4)
    },
  )

  it(
    "PR-B08f: cada ruta: maestro ajeno y estudiante no inscrito, 403 SIN_ACCESO_A_LA_CLASE",
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

  it("PR-B08g: cada ruta: el caso permitido, 2xx", { timeout: 60000 }, async () => {
    for (const preparar of preparadores) {
      const prep = await preparar()
      const respuesta = await pedir(prep, prep.tokenPermitido)
      expect(respuesta.statusCode, prep.nombre).toBe(prep.estatusPermitido)
    }
  })

  it(
    "PR-B08h: en cada caso negado, inscripciones y movimientos_inscripcion quedan como estaban",
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

  it(
    "PR-B08i: ninguna respuesta que recibe un estudiante contiene estadoPago",
    { timeout: 60000 },
    async () => {
      // Además de lo acumulado, un caso propio: un compañero deudor y un estudiante que pide todas
      // las rutas de b (la de compañeros permitida; las demás, negadas).
      const prep = await prepararGetPersonas()
      const respuesta = await pedir(prep, prep.tokenPermitido)
      expect(respuesta.statusCode).toBe(200)
      expect(respuesta.body).toContain("Compañero Deudor")
      for (const preparar of preparadores) {
        const otra = await preparar()
        if (otra.tokenIncorrecto !== undefined) await pedir(otra, otra.tokenIncorrecto)
        for (const tokenAjeno of otra.tokensAjenos) await pedir(otra, tokenAjeno)
      }

      expect(cuerposDeEstudiantes.length).toBeGreaterThan(0)
      const pila: unknown[] = []
      for (const cuerpo of cuerposDeEstudiantes) {
        expect(cuerpo).not.toContain("estadoPago")
        expect(cuerpo).not.toContain("estado_pago")
        expect(cuerpo).not.toContain("deudor")
        if (cuerpo !== "") pila.push(JSON.parse(cuerpo))
      }
      while (pila.length > 0) {
        const actual = pila.pop()
        if (actual === null || typeof actual !== "object") continue
        for (const [clave, valor] of Object.entries(actual)) {
          expect(clave).not.toBe("estadoPago")
          pila.push(valor)
        }
      }
    },
  )
})
