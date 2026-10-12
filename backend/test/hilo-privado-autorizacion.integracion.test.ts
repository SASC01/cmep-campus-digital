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
import { crearTareaDePrueba } from "./ayudas-tareas.js"

// ENTREGAS-01c (PR-1C07): autorización de las cuatro rutas del hilo privado (tabla de
// "Autorización"), como PR-1B24. Los alumnos de la clase son deudores: si una respuesta filtrara el
// estado de pago, la prueba lo vería.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
const respuestas: LightMyRequestResponse[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const pedir = async (
  method: "GET" | "POST",
  url: string,
  token?: string,
  payload?: InjectOptions["payload"],
): Promise<LightMyRequestResponse> => {
  const respuesta = await obtenerApp().inject({
    method,
    url,
    ...(payload === undefined ? {} : { payload }),
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  })
  respuestas.push(respuesta)
  return respuesta
}

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

interface Escenario {
  claseId: string
  tareaId: string
  alumno: UsuarioDePrueba
  restringido: UsuarioDePrueba
  tokens: {
    alumno: string
    maestro: string
    admin: string
    maestroAjeno: string
    noInscrito: string
    restringido: string
    cambioPendiente: string
  }
}

const escenario = async (): Promise<Escenario> => {
  const ficha = randomUUID().slice(0, 6)
  const maestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Maestra ${ficha}`,
    rol: "maestro",
  })
  const maestroAjeno = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Ajeno ${ficha}`,
    rol: "maestro",
  })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await crearClaseDePrueba(idsClases, { maestroId: maestroAjeno.id })
  const alumno = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Alumna ${ficha}`,
    estadoPago: "deudor",
  })
  const noInscrito = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Fuera ${ficha}` })
  const restringido = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Limitado ${ficha}`,
    estadoPago: "deudor",
    accesoRestringido: true,
  })
  const cambioPendiente = await crearUsuarioDePrueba(idsUsuarios, {
    rol: "estudiante",
    debeCambiarContrasena: true,
  })
  for (const id of [alumno.id, restringido.id, cambioPendiente.id])
    await inscribirDePrueba(clase.id, id)
  const tareaId = await crearTareaDePrueba({ claseId: clase.id, autorId: maestro.id })
  return {
    claseId: clase.id,
    tareaId,
    alumno,
    restringido,
    tokens: {
      alumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
      maestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
      admin: await tokenDelAdminDePrueba(),
      maestroAjeno: await firmarTokenDePrueba({ usuarioId: maestroAjeno.id }),
      noInscrito: await firmarTokenDePrueba({ usuarioId: noInscrito.id }),
      restringido: await firmarTokenDePrueba({ usuarioId: restringido.id }),
      cambioPendiente: await firmarTokenDePrueba({ usuarioId: cambioPendiente.id }),
    },
  }
}

interface Ruta {
  nombre: string
  familia: "alumno" | "maestro"
  metodo: "GET" | "POST"
  url: (e: Escenario, claseId?: string, alumnoId?: string) => string
  payload?: InjectOptions["payload"]
  // Roles que pasan requireRole (los demás reciben ROL_NO_PERMITIDO).
  admiteAdmin: boolean
}

const base = (e: Escenario, claseId = e.claseId) => `/api/clases/${claseId}/tareas/${e.tareaId}`

const RUTAS: readonly Ruta[] = [
  {
    nombre: "GET …/entrega/comentarios",
    familia: "alumno",
    metodo: "GET",
    url: (e, c) => `${base(e, c)}/entrega/comentarios`,
    admiteAdmin: false,
  },
  {
    nombre: "POST …/entrega/comentarios",
    familia: "alumno",
    metodo: "POST",
    url: (e, c) => `${base(e, c)}/entrega/comentarios`,
    payload: { texto: "Hola" },
    admiteAdmin: false,
  },
  {
    nombre: "GET …/entregas/:alumnoId/comentarios",
    familia: "maestro",
    metodo: "GET",
    url: (e, c, a) => `${base(e, c)}/entregas/${a ?? e.alumno.id}/comentarios`,
    admiteAdmin: true,
  },
  {
    nombre: "POST …/entregas/:alumnoId/comentarios",
    familia: "maestro",
    metodo: "POST",
    url: (e, c, a) => `${base(e, c)}/entregas/${a ?? e.alumno.id}/comentarios`,
    payload: { texto: "Hola" },
    admiteAdmin: false,
  },
]

const pedirRuta = (ruta: Ruta, e: Escenario, token?: string, claseId?: string, alumnoId?: string) =>
  pedir(ruta.metodo, ruta.url(e, claseId, alumnoId), token, ruta.payload)

const escrito = async (e: Escenario) => ({
  entregas: await obtenerDb().entrega.count({ where: { tareaId: e.tareaId } }),
  comentarios: await obtenerDb().comentario.count({ where: { entrega: { tareaId: e.tareaId } } }),
  trabajos: (
    await obtenerDb().$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pgboss.job
      WHERE name = 'COMENTARIO_CREADO' AND data ->> 'claseId' = ${e.claseId}::text`
  )[0]?.n,
})

describe("autorización de las rutas del hilo privado (PR-1C07)", () => {
  it("PR-1C07: son las cuatro rutas del hilo de la tabla de Autorización", () => {
    expect(new Set(RUTAS.map((r) => r.nombre)).size).toBe(4)
  })

  it("PR-1C07: cada ruta: sin token, 401 NO_AUTENTICADO", { timeout: 60_000 }, async () => {
    const e = await escenario()
    for (const ruta of RUTAS) {
      const respuesta = await pedirRuta(ruta, e)
      expect(respuesta.statusCode, ruta.nombre).toBe(401)
      expect(codigoDe(respuesta), ruta.nombre).toBe("NO_AUTENTICADO")
    }
  })

  it(
    "PR-1C07: rol incorrecto: maestro y admin en las del alumno, el alumno en las de los maestros y el admin al escribir como maestro reciben 403 ROL_NO_PERMITIDO sin escribir",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const antes = await escrito(e)
      for (const ruta of RUTAS) {
        const tokens =
          ruta.familia === "alumno"
            ? [e.tokens.maestro, e.tokens.admin]
            : [e.tokens.alumno, ...(ruta.admiteAdmin ? [] : [e.tokens.admin])]
        for (const token of tokens) {
          const respuesta = await pedirRuta(ruta, e, token)
          expect(respuesta.statusCode, ruta.nombre).toBe(403)
          expect(codigoDe(respuesta), ruta.nombre).toBe("ROL_NO_PERMITIDO")
        }
      }
      expect(await escrito(e)).toEqual(antes)
    },
  )

  it(
    "PR-1C07: clase ajena y clase inexistente responden igual: 403 SIN_ACCESO_A_LA_CLASE",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      for (const ruta of RUTAS) {
        const ajeno = ruta.familia === "alumno" ? e.tokens.noInscrito : e.tokens.maestroAjeno
        const propio = ruta.familia === "alumno" ? e.tokens.alumno : e.tokens.maestro
        const ajena = await pedirRuta(ruta, e, ajeno)
        const inexistente = await pedirRuta(ruta, e, propio, randomUUID())
        for (const respuesta of [ajena, inexistente]) {
          expect(respuesta.statusCode, ruta.nombre).toBe(403)
          expect(codigoDe(respuesta), ruta.nombre).toBe("SIN_ACCESO_A_LA_CLASE")
        }
        expect(inexistente.body, ruta.nombre).toBe(ajena.body)
      }
    },
  )

  it(
    "PR-1C07: cada ruta: el alumno restringido recibe 403 ACCESO_RESTRINGIDO y no deja comentario, fila de entrega ni trabajo (tampoco en el hilo del restringido)",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const antes = await escrito(e)
      for (const ruta of RUTAS) {
        for (const alumnoId of [e.alumno.id, e.restringido.id]) {
          const respuesta = await pedirRuta(ruta, e, e.tokens.restringido, undefined, alumnoId)
          expect(respuesta.statusCode, ruta.nombre).toBe(403)
          expect(codigoDe(respuesta), ruta.nombre).toBe("ACCESO_RESTRINGIDO")
        }
      }
      expect(await escrito(e)).toEqual(antes)
      expect(antes).toEqual({ entregas: 0, comentarios: 0, trabajos: 0 })
    },
  )

  it(
    "PR-1C07: cada ruta: con cambio de contraseña pendiente, 403 CAMBIO_DE_CONTRASENA_REQUERIDO",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      for (const ruta of RUTAS) {
        const respuesta = await pedirRuta(ruta, e, e.tokens.cambioPendiente)
        expect(respuesta.statusCode, ruta.nombre).toBe(403)
        expect(codigoDe(respuesta), ruta.nombre).toBe("CAMBIO_DE_CONTRASENA_REQUERIDO")
      }
    },
  )

  it(
    "PR-1C07: con los ids de la ruta en mayúsculas, el alumno escribe y lee, el maestro escribe y lee y el admin lee",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const mayus = (url: string): string => url.replace(/[0-9a-f-]{36}/g, (id) => id.toUpperCase())
      const pedidas: [string, "GET" | "POST", string, number][] = [
        [e.tokens.alumno, "POST", mayus(`${base(e)}/entrega/comentarios`), 201],
        [e.tokens.alumno, "GET", mayus(`${base(e)}/entrega/comentarios`), 200],
        [e.tokens.maestro, "POST", mayus(`${base(e)}/entregas/${e.alumno.id}/comentarios`), 201],
        [e.tokens.maestro, "GET", mayus(`${base(e)}/entregas/${e.alumno.id}/comentarios`), 200],
        [e.tokens.admin, "GET", mayus(`${base(e)}/entregas/${e.alumno.id}/comentarios`), 200],
      ]
      for (const [token, metodo, url, estatus] of pedidas) {
        const respuesta = await pedir(
          metodo,
          url,
          token,
          metodo === "POST" ? { texto: "Hola" } : undefined,
        )
        expect(respuesta.statusCode, `${metodo} ${url}: ${respuesta.body}`).toBe(estatus)
      }
      expect(await escrito(e)).toMatchObject({ entregas: 1, comentarios: 2, trabajos: 2 })
    },
  )

  it("PR-1C07: ninguna respuesta de este archivo (de ningún rol, también las de error) contiene estadoPago, deudor, al_corriente, accesoRestringido, el rol ni un correo", () => {
    expect(
      respuestas.length,
      "Precondición: las pruebas anteriores dejaron respuestas",
    ).toBeGreaterThan(30)
    const fugas = respuestas.filter((r) =>
      /estadoPago|deudor|al_corriente|accesoRestringido|motivoRestriccion|email|"rol"|@/i.test(
        r.body,
      ),
    )
    expect(fugas.map((r) => r.body)).toEqual([])
  })
})
