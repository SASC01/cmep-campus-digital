import { randomUUID } from "node:crypto"

import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { RUTAS_PUBLICAS } from "../src/middleware/rutas-publicas.js"
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

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
const cuerposDeEstudiantes: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

let tokenAdmin = ""

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  tokenAdmin = await tokenDelAdminDePrueba()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

const maestroDePrueba = (opciones: Parameters<typeof crearUsuarioDePrueba>[1] = {}) =>
  crearUsuarioDePrueba(idsUsuarios, { ...opciones, rol: "maestro" })
const estudianteDePrueba = (opciones: Parameters<typeof crearUsuarioDePrueba>[1] = {}) =>
  crearUsuarioDePrueba(idsUsuarios, { ...opciones, rol: "estudiante" })

interface Ruta {
  nombre: string
  metodo: "GET" | "POST" | "PUT" | "DELETE"
  url: string
  payload?: InjectOptions["payload"]
  // El mismo método y la misma ruta con una clase que no existe, si la ruta cuelga de :claseId.
  urlDeClaseInexistente?: string
  // Estatus del administrador (siempre permitido).
  estatusDelAdmin: number
  // Un restringido inscrito en la clase de la ruta, si cuelga de una (que la restricción gane
  // aunque la pertenencia sea legítima).
  claseId?: string
  // Lo que ninguna negación debe cambiar.
  snapshot: () => Promise<unknown>
}

const pedir = async (
  ruta: Pick<Ruta, "metodo" | "url" | "payload">,
  token?: string,
  esEstudiante = false,
): Promise<LightMyRequestResponse> => {
  const respuesta = await obtenerApp().inject({
    method: ruta.metodo,
    url: ruta.url,
    ...(ruta.payload === undefined ? {} : { payload: ruta.payload }),
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  })
  if (esEstudiante) cuerposDeEstudiantes.push(respuesta.body)
  return respuesta
}

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const snapshotDeClase = (claseId: string) => async (): Promise<unknown> => ({
  clase: await obtenerDb().clase.findUnique({
    where: { id: claseId },
    select: { nombre: true, descripcion: true, codigoInvitacion: true, maestroId: true },
  }),
  maestros: await obtenerDb().maestroDeClase.findMany({
    where: { claseId },
    orderBy: { maestroId: "asc" },
    select: { maestroId: true },
  }),
})

const nuevaClase = async (maestros = 1) => {
  const maestro = await maestroDePrueba()
  const segundo = maestros === 2 ? await maestroDePrueba() : undefined
  const clase = await crearClaseDePrueba(idsClases, {
    maestroId: maestro.id,
    ...(segundo === undefined ? {} : { maestroIds: [maestro.id, segundo.id] }),
  })
  return { claseId: clase.id, maestro, segundo }
}

const prepararGetLista = async (): Promise<Ruta> => ({
  nombre: "GET /admin/clases",
  metodo: "GET",
  url: "/api/admin/clases?limite=1",
  estatusDelAdmin: 200,
  snapshot: async () => null,
})

const prepararPostCrear = async (): Promise<Ruta> => {
  const maestro = await maestroDePrueba()
  const nombre = `Autorización ${randomUUID().slice(0, 8)}`
  return {
    nombre: "POST /admin/clases",
    metodo: "POST",
    url: "/api/admin/clases",
    payload: { nombre, maestroIds: [maestro.id] },
    estatusDelAdmin: 201,
    snapshot: async () => obtenerDb().clase.count({ where: { nombre } }),
  }
}

const prepararPutEditar = async (): Promise<Ruta> => {
  const { claseId } = await nuevaClase()
  return {
    nombre: "PUT /admin/clases/:claseId",
    metodo: "PUT",
    url: `/api/admin/clases/${claseId}`,
    payload: { nombre: "Editada por autorización" },
    urlDeClaseInexistente: `/api/admin/clases/${randomUUID()}`,
    estatusDelAdmin: 200,
    claseId,
    snapshot: snapshotDeClase(claseId),
  }
}

const prepararPostAsignar = async (): Promise<Ruta> => {
  const { claseId } = await nuevaClase()
  const nuevo = await maestroDePrueba()
  return {
    nombre: "POST /admin/clases/:claseId/maestros",
    metodo: "POST",
    url: `/api/admin/clases/${claseId}/maestros`,
    payload: { maestroId: nuevo.id },
    urlDeClaseInexistente: `/api/admin/clases/${randomUUID()}/maestros`,
    estatusDelAdmin: 200,
    claseId,
    snapshot: snapshotDeClase(claseId),
  }
}

const prepararDeleteRetirar = async (): Promise<Ruta> => {
  const { claseId, segundo } = await nuevaClase(2)
  if (!segundo) throw new Error("Precondición: la clase tiene dos maestros")
  return {
    nombre: "DELETE /admin/clases/:claseId/maestros/:maestroId",
    metodo: "DELETE",
    url: `/api/admin/clases/${claseId}/maestros/${segundo.id}`,
    urlDeClaseInexistente: `/api/admin/clases/${randomUUID()}/maestros/${segundo.id}`,
    estatusDelAdmin: 200,
    claseId,
    snapshot: snapshotDeClase(claseId),
  }
}

const prepararGetCandidatos = async (): Promise<Ruta> => ({
  nombre: "GET /admin/maestros/candidatos",
  metodo: "GET",
  url: "/api/admin/maestros/candidatos?q=maestro",
  estatusDelAdmin: 200,
  snapshot: async () => null,
})

const preparadores = [
  prepararGetLista,
  prepararPostCrear,
  prepararPutEditar,
  prepararPostAsignar,
  prepararDeleteRetirar,
  prepararGetCandidatos,
]

describe("autorización de las rutas de gestión de clases (CLASES-02a)", () => {
  it("PR-2A22: sin token, 401 en cada una de las seis rutas", async () => {
    for (const preparar of preparadores) {
      const ruta = await preparar()
      const respuesta = await pedir(ruta)
      expect(respuesta.statusCode, ruta.nombre).toBe(401)
      expect(codigoDe(respuesta), ruta.nombre).toBe("NO_AUTENTICADO")
    }
  })

  it("PR-2A22: cuenta inactiva, 401; con cambio de contraseña pendiente, 403 CAMBIO_DE_CONTRASENA_REQUERIDO; alumno restringido, 403 ACCESO_RESTRINGIDO", async () => {
    for (const preparar of preparadores) {
      const ruta = await preparar()

      const inactivo = await maestroDePrueba({ activo: false })
      const deInactivo = await pedir(ruta, await tokenDe(inactivo))
      expect(deInactivo.statusCode, ruta.nombre).toBe(401)

      const pendiente = await estudianteDePrueba({ debeCambiarContrasena: true })
      const conCambio = await pedir(ruta, await tokenDe(pendiente), true)
      expect(conCambio.statusCode, ruta.nombre).toBe(403)
      expect(codigoDe(conCambio), ruta.nombre).toBe("CAMBIO_DE_CONTRASENA_REQUERIDO")

      const restringido = await estudianteDePrueba({ accesoRestringido: true })
      if (ruta.claseId !== undefined) await inscribirDePrueba(ruta.claseId, restringido.id)
      const conRestriccion = await pedir(ruta, await tokenDe(restringido), true)
      expect(conRestriccion.statusCode, ruta.nombre).toBe(403)
      expect(codigoDe(conRestriccion), ruta.nombre).toBe("ACCESO_RESTRINGIDO")
    }
  })

  it("PR-2A22: el estudiante inscrito y el no inscrito, el maestro de la clase y el maestro ajeno reciben 403 ROL_NO_PERMITIDO, y nada cambia", async () => {
    for (const preparar of preparadores) {
      const ruta = await preparar()
      const inscrito = await estudianteDePrueba()
      if (ruta.claseId !== undefined) await inscribirDePrueba(ruta.claseId, inscrito.id)
      const noInscrito = await estudianteDePrueba()
      const ajeno = await maestroDePrueba()
      const deLaClase =
        ruta.claseId === undefined
          ? undefined
          : (
              await obtenerDb().maestroDeClase.findFirst({
                where: { claseId: ruta.claseId },
                select: { maestroId: true },
              })
            )?.maestroId
      const actores: { descripcion: string; token: string; esEstudiante: boolean }[] = [
        { descripcion: "inscrito", token: await tokenDe(inscrito), esEstudiante: true },
        { descripcion: "no inscrito", token: await tokenDe(noInscrito), esEstudiante: true },
        { descripcion: "maestro ajeno", token: await tokenDe(ajeno), esEstudiante: false },
      ]
      if (deLaClase !== undefined) {
        actores.push({
          descripcion: "maestro de la clase",
          token: await firmarTokenDePrueba({ usuarioId: deLaClase }),
          esEstudiante: false,
        })
      }

      for (const actor of actores) {
        const antes = await ruta.snapshot()
        const respuesta = await pedir(ruta, actor.token, actor.esEstudiante)
        expect(respuesta.statusCode, `${ruta.nombre} / ${actor.descripcion}`).toBe(403)
        expect(codigoDe(respuesta), `${ruta.nombre} / ${actor.descripcion}`).toBe(
          "ROL_NO_PERMITIDO",
        )
        expect(await ruta.snapshot(), `${ruta.nombre} / ${actor.descripcion}`).toEqual(antes)
      }
    }
  })

  it("PR-2A22: el admin recibe 2xx en cada ruta, y una clase inexistente responde 403 SIN_ACCESO_A_LA_CLASE también al admin", async () => {
    for (const preparar of preparadores) {
      const ruta = await preparar()
      const inexistente = ruta.urlDeClaseInexistente
      if (inexistente !== undefined) {
        const respuesta = await pedir({ ...ruta, url: inexistente }, tokenAdmin)
        expect(respuesta.statusCode, `${ruta.nombre} (inexistente)`).toBe(403)
        expect(codigoDe(respuesta), `${ruta.nombre} (inexistente)`).toBe("SIN_ACCESO_A_LA_CLASE")
      }

      const respuesta = await pedir(ruta, tokenAdmin)
      expect(respuesta.statusCode, `${ruta.nombre}: ${respuesta.body}`).toBe(ruta.estatusDelAdmin)
      if (ruta.nombre === "POST /admin/clases") {
        idsClases.push(respuesta.json<{ clase: { id: string } }>().clase.id)
      }
    }
  })

  it("PR-2A22: ninguna respuesta a un estudiante lleva estadoPago ni accesoRestringido", () => {
    expect(cuerposDeEstudiantes.length).toBeGreaterThan(0)
    for (const cuerpo of cuerposDeEstudiantes) {
      expect(cuerpo).not.toContain("estadoPago")
      expect(cuerpo).not.toContain("estado_pago")
      expect(cuerpo).not.toContain("accesoRestringido")
    }
  })
})

describe("autorización de las rutas existentes con el admin agregado (CLASES-02a)", () => {
  const escenario = async () => {
    const maestro = await maestroDePrueba()
    const objetivo = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: "Objetivo de administración",
    })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, objetivo.id, "manual")
    const sinInscribir = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Por inscribir" })
    return { claseId: clase.id, objetivo, sinInscribir }
  }

  it("PR-2A23: el admin recibe 200 o 204 en el detalle, el código (ver y regenerar), el roster, el buscador, el alta y la baja, y 403 SIN_ACCESO_A_LA_CLASE sobre una clase inexistente", async () => {
    const e = await escenario()
    const casos: {
      nombre: string
      metodo: "GET" | "POST" | "DELETE"
      ruta: (claseId: string) => string
      payload?: InjectOptions["payload"]
      estatus: number
    }[] = [
      { nombre: "detalle", metodo: "GET", ruta: (id) => `/api/clases/${id}`, estatus: 200 },
      { nombre: "código", metodo: "GET", ruta: (id) => `/api/clases/${id}/codigo`, estatus: 200 },
      {
        nombre: "regenerar",
        metodo: "POST",
        ruta: (id) => `/api/clases/${id}/codigo`,
        estatus: 200,
      },
      { nombre: "roster", metodo: "GET", ruta: (id) => `/api/clases/${id}/alumnos`, estatus: 200 },
      {
        nombre: "buscador",
        metodo: "GET",
        ruta: (id) => `/api/clases/${id}/alumnos/candidatos?q=inscribir`,
        estatus: 200,
      },
      {
        nombre: "alta",
        metodo: "POST",
        ruta: (id) => `/api/clases/${id}/alumnos`,
        payload: { alumnoId: e.sinInscribir.id },
        estatus: 200,
      },
      {
        nombre: "baja",
        metodo: "DELETE",
        ruta: (id) => `/api/clases/${id}/alumnos/${e.objetivo.id}`,
        estatus: 204,
      },
    ]

    for (const caso of casos) {
      const inexistente = await pedir(
        {
          metodo: caso.metodo,
          url: caso.ruta(randomUUID()),
          ...(caso.payload === undefined ? {} : { payload: caso.payload }),
        },
        tokenAdmin,
      )
      expect(inexistente.statusCode, `${caso.nombre} (inexistente)`).toBe(403)
      expect(codigoDe(inexistente), `${caso.nombre} (inexistente)`).toBe("SIN_ACCESO_A_LA_CLASE")

      const respuesta = await pedir(
        {
          metodo: caso.metodo,
          url: caso.ruta(e.claseId),
          ...(caso.payload === undefined ? {} : { payload: caso.payload }),
        },
        tokenAdmin,
      )
      expect(respuesta.statusCode, `${caso.nombre}: ${respuesta.body}`).toBe(caso.estatus)
    }
  })

  it("PR-2A23: personas, inscritas, impartidas, unirse y todas las rutas del muro y de los archivos siguen en 403 ROL_NO_PERMITIDO para el admin", async () => {
    const e = await escenario()
    const base = `/api/clases/${e.claseId}`
    const id = randomUUID()
    const cerradas: {
      metodo: "GET" | "POST" | "DELETE"
      url: string
      payload?: InjectOptions["payload"]
    }[] = [
      { metodo: "GET", url: `${base}/personas` },
      { metodo: "GET", url: "/api/clases/inscritas" },
      { metodo: "GET", url: "/api/clases/impartidas" },
      { metodo: "POST", url: "/api/clases/unirse", payload: { codigo: "ABCDEFG" } },
      { metodo: "GET", url: `${base}/publicaciones` },
      { metodo: "POST", url: `${base}/publicaciones`, payload: { tipo: "anuncio", texto: "x" } },
      { metodo: "DELETE", url: `${base}/publicaciones/${id}` },
      { metodo: "GET", url: `${base}/publicaciones/${id}/comentarios` },
      { metodo: "POST", url: `${base}/publicaciones/${id}/comentarios`, payload: { texto: "x" } },
      { metodo: "DELETE", url: `${base}/publicaciones/${id}/comentarios/${randomUUID()}` },
      { metodo: "DELETE", url: `${base}/mis-comentarios/${id}` },
      { metodo: "POST", url: `${base}/archivos`, payload: {} },
      { metodo: "POST", url: `${base}/archivos/${id}/descarga` },
    ]

    for (const ruta of cerradas) {
      const respuesta = await pedir(ruta, tokenAdmin)
      expect(respuesta.statusCode, `${ruta.metodo} ${ruta.url}`).toBe(403)
      expect(codigoDe(respuesta), `${ruta.metodo} ${ruta.url}`).toBe("ROL_NO_PERMITIDO")
    }
  })

  it("PR-2A24: las rutas de gestión existen, POST /api/clases y PUT /api/clases/:claseId ya no, RUTAS_PUBLICAS sigue con las 10 de hoy y la API arrancó sin tocar la guarda", () => {
    const arbol = obtenerApp().printRoutes({ commonPrefix: false })
    const rutas = new Set<string>()
    const porNivel: string[] = []
    for (const linea of arbol.split("\n")) {
      const coincidencia = /^((?:│ {3}| {4})*)(?:├── |└── )(\S+) \(([^)]+)\)$/.exec(linea)
      if (!coincidencia) continue
      const [, sangria, segmento, metodos] = coincidencia
      const nivel = (sangria ?? "").length / 4
      const url = `${nivel === 0 ? "" : (porNivel[nivel - 1] ?? "")}${segmento ?? ""}`
      porNivel[nivel] = url
      porNivel.length = nivel + 1
      for (const metodo of (metodos ?? "").split(", ")) rutas.add(`${metodo} ${url}`)
    }

    for (const esperada of [
      "GET /api/admin/clases",
      "HEAD /api/admin/clases",
      "POST /api/admin/clases",
      "PUT /api/admin/clases/:claseId",
      "POST /api/admin/clases/:claseId/maestros",
      "DELETE /api/admin/clases/:claseId/maestros/:maestroId",
      "GET /api/admin/maestros/candidatos",
      "HEAD /api/admin/maestros/candidatos",
    ]) {
      expect(rutas.has(esperada), esperada).toBe(true)
    }
    expect(rutas.has("POST /api/clases")).toBe(false)
    expect(rutas.has("PUT /api/clases/:claseId")).toBe(false)
    expect(RUTAS_PUBLICAS.size).toBe(10)
  })
})
