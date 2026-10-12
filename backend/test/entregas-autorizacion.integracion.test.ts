import { randomUUID } from "node:crypto"

import { errorApiSchema, solicitarSubidaRespuestaSchema } from "@campus/shared"
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
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
  leerArchivoDb,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { crearTareaDePrueba } from "./ayudas-tareas.js"

// ENTREGAS-01b (PR-1B24 y PR-1B25): autorización de las ocho rutas de entregas (tabla de
// "Autorización"). Los alumnos de la clase son deudores: si una respuesta filtrara el estado de pago,
// la prueba lo vería.

let app: FastifyInstance | undefined
const almacen: AlmacenEnMemoria = crearAlmacenEnMemoria()
const idsUsuarios: string[] = []
const idsClases: string[] = []
// Todas las respuestas de este archivo, para buscar campos que nunca deben salir.
const respuestas: LightMyRequestResponse[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen })
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
  // Un archivo confirmado de la entrega del alumno.
  archivoId: string
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
    nombre: `Maestro Ajeno ${ficha}`,
    rol: "maestro",
  })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await crearClaseDePrueba(idsClases, { maestroId: maestroAjeno.id })
  const alumno = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Alumna Ficha ${ficha}`,
    estadoPago: "deudor",
  })
  const noInscrito = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Fuera ${ficha}` })
  const restringido = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Restringido ${ficha}`,
    estadoPago: "deudor",
    accesoRestringido: true,
  })
  const cambioPendiente = await crearUsuarioDePrueba(idsUsuarios, {
    rol: "estudiante",
    debeCambiarContrasena: true,
  })
  for (const id of [alumno.id, restringido.id, cambioPendiente.id]) {
    await inscribirDePrueba(clase.id, id)
  }
  const tareaId = await crearTareaDePrueba({
    claseId: clase.id,
    autorId: maestro.id,
    fechaLimite: new Date(Date.now() + 48 * 60 * 60 * 1000),
  })
  const tokenAlumno = await firmarTokenDePrueba({ usuarioId: alumno.id })
  const base = `/api/clases/${clase.id}/tareas/${tareaId}/entrega`
  const subida = await pedir("POST", `${base}/archivos`, tokenAlumno, {
    nombre: "trabajo.pdf",
    tipo: "application/pdf",
    tamano: 400,
  })
  expect(subida.statusCode, subida.body).toBe(201)
  const archivoId = solicitarSubidaRespuestaSchema.parse(subida.json()).archivo.id
  const fila = await leerArchivoDb(archivoId)
  if (fila === null) throw new Error("Precondición: existe el archivo")
  almacen.subir(fila.claveObjeto, { tamano: 400, tipo: "application/pdf" })
  const entregada = await pedir("POST", base, tokenAlumno, { archivoIds: [archivoId] })
  expect(entregada.statusCode, entregada.body).toBe(200)
  return {
    claseId: clase.id,
    tareaId,
    alumno,
    archivoId,
    tokens: {
      alumno: tokenAlumno,
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
  // La ruta con los ids del escenario (y otra clase, si se pide).
  url: (e: Escenario, claseId?: string) => string
  payload?: InjectOptions["payload"]
}

const tarea = (e: Escenario, claseId = e.claseId): string =>
  `/api/clases/${claseId}/tareas/${e.tareaId}`

const RUTAS: readonly Ruta[] = [
  {
    nombre: "GET …/entrega",
    familia: "alumno",
    metodo: "GET",
    url: (e, c) => `${tarea(e, c)}/entrega`,
  },
  {
    nombre: "POST …/entrega",
    familia: "alumno",
    metodo: "POST",
    url: (e, c) => `${tarea(e, c)}/entrega`,
    payload: { enlaces: ["https://ejemplo.com/"] },
  },
  {
    nombre: "POST …/entrega/anular",
    familia: "alumno",
    metodo: "POST",
    url: (e, c) => `${tarea(e, c)}/entrega/anular`,
  },
  {
    nombre: "POST …/entrega/archivos",
    familia: "alumno",
    metodo: "POST",
    url: (e, c) => `${tarea(e, c)}/entrega/archivos`,
    payload: { nombre: "a.pdf", tipo: "application/pdf", tamano: 10 },
  },
  {
    nombre: "POST …/entrega/archivos/:archivoId/descarga",
    familia: "alumno",
    metodo: "POST",
    url: (e, c) => `${tarea(e, c)}/entrega/archivos/${e.archivoId}/descarga`,
  },
  {
    nombre: "GET …/entregas",
    familia: "maestro",
    metodo: "GET",
    url: (e, c) => `${tarea(e, c)}/entregas`,
  },
  {
    nombre: "GET …/entregas/:alumnoId",
    familia: "maestro",
    metodo: "GET",
    url: (e, c) => `${tarea(e, c)}/entregas/${e.alumno.id}`,
  },
  {
    nombre: "POST …/entregas/:alumnoId/archivos/:archivoId/descarga",
    familia: "maestro",
    metodo: "POST",
    url: (e, c) => `${tarea(e, c)}/entregas/${e.alumno.id}/archivos/${e.archivoId}/descarga`,
  },
]

const pedirRuta = (ruta: Ruta, e: Escenario, token?: string, claseId?: string) =>
  pedir(ruta.metodo, ruta.url(e, claseId), token, ruta.payload)

// Lo que una petición rechazada no puede haber escrito en la clase.
const escrito = async (claseId: string, tareaId: string) => ({
  entregas: await obtenerDb().entrega.findMany({
    where: { tareaId },
    orderBy: { id: "asc" },
    select: { id: true, alumnoId: true, estado: true, version: true },
  }),
  archivos: await obtenerDb().archivo.findMany({
    where: { claseId },
    orderBy: { id: "asc" },
    select: { id: true, estado: true, entregaId: true },
  }),
  trabajos: (
    await obtenerDb().$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pgboss.job
      WHERE name = 'ENTREGA_REALIZADA' AND data ->> 'claseId' = ${claseId}::text`
  )[0]?.n,
})

describe("autorización de las rutas de entregas (PR-1B24)", () => {
  it("PR-1B24: son las ocho rutas de la tabla de Autorización, cinco del alumno y tres de los maestros", () => {
    expect(RUTAS.map((r) => r.nombre)).toHaveLength(8)
    expect(new Set(RUTAS.map((r) => r.nombre)).size).toBe(8)
    expect(RUTAS.filter((r) => r.familia === "alumno")).toHaveLength(5)
  })

  it("PR-1B24: cada ruta: sin token, 401 NO_AUTENTICADO", { timeout: 60_000 }, async () => {
    const e = await escenario()
    for (const ruta of RUTAS) {
      const respuesta = await pedirRuta(ruta, e)
      expect(respuesta.statusCode, ruta.nombre).toBe(401)
      expect(codigoDe(respuesta), ruta.nombre).toBe("NO_AUTENTICADO")
    }
  })

  it(
    "PR-1B24: rol incorrecto: el maestro de la clase y el admin en las rutas del alumno, y el alumno inscrito en las de los maestros, reciben 403 ROL_NO_PERMITIDO sin escribir",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const antes = await escrito(e.claseId, e.tareaId)
      for (const ruta of RUTAS) {
        const tokens =
          ruta.familia === "alumno" ? [e.tokens.maestro, e.tokens.admin] : [e.tokens.alumno]
        for (const token of tokens) {
          const respuesta = await pedirRuta(ruta, e, token)
          expect(respuesta.statusCode, ruta.nombre).toBe(403)
          expect(codigoDe(respuesta), ruta.nombre).toBe("ROL_NO_PERMITIDO")
        }
      }
      expect(await escrito(e.claseId, e.tareaId)).toEqual(antes)
    },
  )

  it(
    "PR-1B24: clase ajena (alumno no inscrito en las del alumno, maestro de otra clase en las de los maestros) y clase inexistente responden igual: 403 SIN_ACCESO_A_LA_CLASE",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      for (const ruta of RUTAS) {
        const ajeno = ruta.familia === "alumno" ? e.tokens.noInscrito : e.tokens.maestroAjeno
        const deLaClase = ruta.familia === "alumno" ? e.tokens.alumno : e.tokens.maestro
        const ajena = await pedirRuta(ruta, e, ajeno)
        const inexistente = await pedirRuta(ruta, e, deLaClase, randomUUID())
        for (const respuesta of [ajena, inexistente]) {
          expect(respuesta.statusCode, ruta.nombre).toBe(403)
          expect(codigoDe(respuesta), ruta.nombre).toBe("SIN_ACCESO_A_LA_CLASE")
        }
        expect(inexistente.body, ruta.nombre).toBe(ajena.body)
      }
      // El admin, en las rutas de los maestros, tampoco distingue una clase inexistente.
      for (const ruta of RUTAS.filter((r) => r.familia === "maestro")) {
        const inexistenteAdmin = await pedirRuta(ruta, e, e.tokens.admin, randomUUID())
        expect(inexistenteAdmin.statusCode, ruta.nombre).toBe(403)
        expect(codigoDe(inexistenteAdmin), ruta.nombre).toBe("SIN_ACCESO_A_LA_CLASE")
      }
    },
  )

  it(
    "PR-1B24: cada ruta: el alumno restringido recibe 403 ACCESO_RESTRINGIDO y después no hay fila de entrega, archivo ni trabajo nuevos",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const antes = await escrito(e.claseId, e.tareaId)
      for (const ruta of RUTAS) {
        const respuesta = await pedirRuta(ruta, e, e.tokens.restringido)
        expect(respuesta.statusCode, ruta.nombre).toBe(403)
        expect(codigoDe(respuesta), ruta.nombre).toBe("ACCESO_RESTRINGIDO")
      }
      expect(await escrito(e.claseId, e.tareaId)).toEqual(antes)
    },
  )

  it(
    "PR-1B24: cada ruta: con cambio de contraseña pendiente, 403 CAMBIO_DE_CONTRASENA_REQUERIDO",
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
    "PR-1B24: con los ids de la ruta en mayúsculas, el alumno, el maestro y el admin reciben la respuesta de la ruta",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const mayus = (url: string): string => url.replace(/[0-9a-f-]{36}/g, (id) => id.toUpperCase())
      const base = mayus(tarea(e))
      const pedidas: [string, "GET" | "POST", string, number][] = [
        [e.tokens.alumno, "GET", `${base}/entrega`, 200],
        [
          e.tokens.alumno,
          "POST",
          mayus(`${tarea(e)}/entrega/archivos/${e.archivoId}/descarga`),
          200,
        ],
        [e.tokens.maestro, "GET", `${base}/entregas`, 200],
        [e.tokens.admin, "GET", mayus(`${tarea(e)}/entregas/${e.alumno.id}`), 200],
        [
          e.tokens.maestro,
          "POST",
          mayus(`${tarea(e)}/entregas/${e.alumno.id}/archivos/${e.archivoId}/descarga`),
          200,
        ],
        [e.tokens.alumno, "POST", `${base}/entrega/anular`, 200],
      ]
      for (const [token, metodo, url, estatus] of pedidas) {
        const respuesta = await pedir(metodo, url, token)
        expect(respuesta.statusCode, `${metodo} ${url}: ${respuesta.body}`).toBe(estatus)
      }
      const subida = await pedir("POST", `${base}/entrega/archivos`, e.tokens.alumno, {
        nombre: "b.pdf",
        tipo: "application/pdf",
        tamano: 50,
      })
      expect(subida.statusCode, subida.body).toBe(201)
      const nuevo = solicitarSubidaRespuestaSchema.parse(subida.json()).archivo.id
      const fila = await leerArchivoDb(nuevo)
      expect(fila?.claveObjeto).toBe(`entregas/${e.tareaId}/${e.alumno.id}/${nuevo}`)
      almacen.subir(fila?.claveObjeto ?? "", { tamano: 50, tipo: "application/pdf" })
      const entregada = await pedir("POST", `${base}/entrega`, e.tokens.alumno, {
        archivoIds: [nuevo.toUpperCase()],
      })
      expect(entregada.statusCode, entregada.body).toBe(200)
    },
  )

  it("PR-1B24: ninguna respuesta de este archivo (de ningún rol, también las de error) contiene estadoPago, deudor, al_corriente, accesoRestringido ni un correo", () => {
    expect(
      respuestas.length,
      "Precondición: las pruebas anteriores dejaron respuestas",
    ).toBeGreaterThan(40)
    const fugas = respuestas.filter((r) =>
      /estadoPago|deudor|al_corriente|accesoRestringido|motivoRestriccion|email|@/i.test(r.body),
    )
    expect(fugas.map((r) => r.body)).toEqual([])
  })
})

describe("el admin en las entregas (PR-1B25)", () => {
  it("PR-1B25: en una clase donde no es maestro, el admin lista las entregas, ve la de un alumno y descarga sus archivos", async () => {
    const e = await escenario()
    const lista = await pedir("GET", `${tarea(e)}/entregas`, e.tokens.admin)
    expect(lista.statusCode, lista.body).toBe(200)
    const entrega = await pedir("GET", `${tarea(e)}/entregas/${e.alumno.id}`, e.tokens.admin)
    expect(entrega.statusCode, entrega.body).toBe(200)
    const descarga = await pedir(
      "POST",
      `${tarea(e)}/entregas/${e.alumno.id}/archivos/${e.archivoId}/descarga`,
      e.tokens.admin,
    )
    expect(descarga.statusCode, descarga.body).toBe(200)
  })

  it("PR-1B25: las cinco rutas del alumno le responden 403 ROL_NO_PERMITIDO al admin", async () => {
    const e = await escenario()
    const delAlumno = RUTAS.filter((r) => r.familia === "alumno")
    expect(delAlumno).toHaveLength(5)
    for (const ruta of delAlumno) {
      const respuesta = await pedirRuta(ruta, e, e.tokens.admin)
      expect(respuesta.statusCode, ruta.nombre).toBe(403)
      expect(codigoDe(respuesta), ruta.nombre).toBe("ROL_NO_PERMITIDO")
    }
  })
})
