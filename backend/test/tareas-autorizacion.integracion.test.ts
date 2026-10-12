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
  idDelAdminDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { crearCriteriosDePrueba, crearTareaDePrueba, cuerpoDeTarea } from "./ayudas-tareas.js"

// TAREAS-01b (PR-1B14): autorización de las cinco rutas de 01b (tabla de "Autorización").

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

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

const maestroDePrueba = (): Promise<UsuarioDePrueba> =>
  crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestro Autorización" })
const estudianteDePrueba = (
  opciones: Parameters<typeof crearUsuarioDePrueba>[1] = {},
): Promise<UsuarioDePrueba> =>
  crearUsuarioDePrueba(idsUsuarios, {
    ...opciones,
    rol: "estudiante",
    nombre: "Alumno Autorización",
  })
const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

interface PreparadoRuta {
  nombre: string
  metodo: "GET" | "POST" | "PUT" | "DELETE"
  url: string
  claseId: string
  payload?: InjectOptions["payload"]
  estatusPermitido: number
  admiteEstudiante: boolean
  tokenMaestro: string
  tokenEstudiante: string
  tokensAjenos: string[]
  prepararRestringido: () => Promise<string>
  snapshotControlado: () => Promise<unknown>
}

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  otroMaestro: UsuarioDePrueba
  inscrito: UsuarioDePrueba
  noInscrito: UsuarioDePrueba
  tareaId: string
}

// La tarea la escribe el maestro de la clase o, si `deAdmin`, el admin (para que el admin pase en PUT).
const escenario = async (deAdmin: boolean): Promise<Escenario> => {
  const maestro = await maestroDePrueba()
  const otroMaestro = await maestroDePrueba()
  const inscrito = await estudianteDePrueba()
  const noInscrito = await estudianteDePrueba()
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await inscribirDePrueba(clase.id, inscrito.id, "codigo")
  const tareaId = await crearTareaDePrueba({
    claseId: clase.id,
    autorId: deAdmin ? await idDelAdminDePrueba() : maestro.id,
  })
  await crearCriteriosDePrueba(tareaId, 2)
  return { claseId: clase.id, maestro, otroMaestro, inscrito, noInscrito, tareaId }
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
    select: { id: true, titulo: true, texto: true, temaId: true },
  }),
  tareas: await obtenerDb().tarea.findMany({
    where: { claseId },
    orderBy: { id: "asc" },
    select: { id: true, fechaLimite: true, puntos: true, categoriaId: true, trabajoId: true },
  }),
  criterios: await obtenerDb().criterioRubrica.count({ where: { tarea: { claseId } } }),
  trabajos: (
    await obtenerDb().$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pgboss.job WHERE data ->> 'claseId' = ${claseId}::text`
  )[0]?.n,
})

const preparar = async (
  nombre: string,
  datos: {
    metodo: PreparadoRuta["metodo"]
    ruta: (e: Escenario) => string
    payload?: (e: Escenario) => InjectOptions["payload"]
    estatusPermitido: number
    admiteEstudiante?: boolean
    deAdmin?: boolean
  },
): Promise<PreparadoRuta> => {
  const e = await escenario(datos.deAdmin ?? false)
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

// `deAdmin` solo importa para que el admin tenga éxito en PUT (edita únicamente lo suyo).
const rutas: ((deAdmin: boolean) => Promise<PreparadoRuta>)[] = [
  (deAdmin) =>
    preparar("POST /clases/:claseId/tareas", {
      metodo: "POST",
      ruta: () => "/tareas",
      payload: () => cuerpoDeTarea({ titulo: "Nueva" }),
      estatusPermitido: 201,
      deAdmin,
    }),
  (deAdmin) =>
    preparar("GET /clases/:claseId/tareas/:tareaId", {
      metodo: "GET",
      ruta: (e) => `/tareas/${e.tareaId}`,
      estatusPermitido: 200,
      admiteEstudiante: true,
      deAdmin,
    }),
  (deAdmin) =>
    preparar("PUT /clases/:claseId/tareas/:tareaId", {
      metodo: "PUT",
      ruta: (e) => `/tareas/${e.tareaId}`,
      payload: () => cuerpoDeTarea({ titulo: "Editada" }),
      estatusPermitido: 200,
      deAdmin,
    }),
  (deAdmin) =>
    preparar("DELETE /clases/:claseId/tareas/:tareaId", {
      metodo: "DELETE",
      ruta: (e) => `/tareas/${e.tareaId}`,
      estatusPermitido: 204,
      deAdmin,
    }),
  (deAdmin) =>
    preparar("GET /clases/:claseId/trabajo", {
      metodo: "GET",
      ruta: () => "/trabajo?tema=sin-tema",
      estatusPermitido: 200,
      admiteEstudiante: true,
      deAdmin,
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

describe("autorización de las rutas de TAREAS-01b (PR-1B14)", () => {
  it("PR-1B14: las cinco rutas de 01b se prueban", async () => {
    expect(rutas).toHaveLength(5)
    const nombres = await Promise.all(rutas.map(async (hacer) => (await hacer(false)).nombre))
    expect(new Set(nombres).size).toBe(5)
  })

  it("PR-1B14: cada ruta: sin token, 401 NO_AUTENTICADO", { timeout: 60000 }, async () => {
    for (const hacer of rutas) {
      const prep = await hacer(false)
      const respuesta = await pedir(prep)
      expect(respuesta.statusCode, prep.nombre).toBe(401)
      expect(codigoDe(respuesta), prep.nombre).toBe("NO_AUTENTICADO")
    }
  })

  it(
    "PR-1B14: cada ruta: con cambio de contraseña pendiente, 403 CAMBIO_DE_CONTRASENA_REQUERIDO",
    { timeout: 60000 },
    async () => {
      for (const hacer of rutas) {
        const prep = await hacer(false)
        const conCambioPendiente = await estudianteDePrueba({ debeCambiarContrasena: true })
        const respuesta = await pedir(prep, await tokenDe(conCambioPendiente))
        expect(respuesta.statusCode, prep.nombre).toBe(403)
        expect(codigoDe(respuesta), prep.nombre).toBe("CAMBIO_DE_CONTRASENA_REQUERIDO")
      }
    },
  )

  it(
    "PR-1B14: cada ruta: estudiante restringido inscrito, 403 ACCESO_RESTRINGIDO",
    { timeout: 60000 },
    async () => {
      for (const hacer of rutas) {
        const prep = await hacer(false)
        const respuesta = await pedir(prep, await prep.prepararRestringido())
        expect(respuesta.statusCode, prep.nombre).toBe(403)
        expect(codigoDe(respuesta), prep.nombre).toBe("ACCESO_RESTRINGIDO")
      }
    },
  )

  it(
    "PR-1B14: las tres rutas de escritura: el estudiante inscrito recibe 403 ROL_NO_PERMITIDO",
    { timeout: 60000 },
    async () => {
      const rutasDeMaestro: string[] = []
      for (const hacer of rutas) {
        const prep = await hacer(false)
        if (prep.admiteEstudiante) continue
        rutasDeMaestro.push(prep.nombre)
        const respuesta = await pedir(prep, prep.tokenEstudiante)
        expect(respuesta.statusCode, prep.nombre).toBe(403)
        expect(codigoDe(respuesta), prep.nombre).toBe("ROL_NO_PERMITIDO")
      }
      expect(rutasDeMaestro).toHaveLength(3)
    },
  )

  it(
    "PR-1B14: cada ruta: maestro de otra clase y, donde aplica, estudiante no inscrito, 403 SIN_ACCESO_A_LA_CLASE",
    { timeout: 60000 },
    async () => {
      for (const hacer of rutas) {
        const prep = await hacer(false)
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
    "PR-1B14: cada ruta: una clase inexistente responde 403 SIN_ACCESO_A_LA_CLASE, igual que una ajena, al maestro y al admin",
    { timeout: 60000 },
    async () => {
      const tokenAdmin = await tokenDelAdminDePrueba()
      for (const hacer of rutas) {
        const prep = await hacer(false)
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
    "PR-1B14: cada ruta: el maestro de la clase y el admin reciben el éxito de la ruta (el admin edita solo lo suyo)",
    { timeout: 90000 },
    async () => {
      const tokenAdmin = await tokenDelAdminDePrueba()
      for (const hacer of rutas) {
        const comoMaestro = await hacer(false)
        const respuestaMaestro = await pedir(comoMaestro, comoMaestro.tokenMaestro)
        expect(respuestaMaestro.statusCode, `${comoMaestro.nombre} / maestro`).toBe(
          comoMaestro.estatusPermitido,
        )
        const comoAdmin = await hacer(true)
        const respuestaAdmin = await pedir(comoAdmin, tokenAdmin)
        expect(respuestaAdmin.statusCode, `${comoAdmin.nombre} / admin`).toBe(
          comoAdmin.estatusPermitido,
        )
      }
    },
  )

  it("PR-1B14: PUT del admin sobre la tarea de un maestro responde 403 EDICION_NO_PERMITIDA y DELETE responde 204", async () => {
    const tokenAdmin = await tokenDelAdminDePrueba()
    const put = await rutas[2]?.(false)
    const delete_ = await rutas[3]?.(false)
    if (!put || !delete_) throw new Error("Precondición: las rutas PUT y DELETE existen")

    const editada = await pedir(put, tokenAdmin)
    const borrada = await pedir(delete_, tokenAdmin)

    expect(editada.statusCode).toBe(403)
    expect(codigoDe(editada)).toBe("EDICION_NO_PERMITIDA")
    expect(borrada.statusCode).toBe(204)
  })

  it(
    "PR-1B14: en cada caso negado, publicaciones, tareas, criterios y trabajos de la clase quedan como estaban",
    { timeout: 120000 },
    async () => {
      for (const hacer of rutas) {
        const prep = await hacer(false)
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
    "PR-1B14: el detalle y la lista para el estudiante no llevan trabajo_id, rol, correos ni estadoPago en ninguna profundidad",
    { timeout: 60000 },
    async () => {
      const prohibidas = [
        "trabajoId",
        "trabajo_id",
        "rol",
        "estadoPago",
        "accesoRestringido",
        "email",
        "correo",
      ]
      for (const indice of [1, 4]) {
        const prep = await rutas[indice]?.(false)
        if (!prep) throw new Error("Precondición: la ruta existe")
        const respuesta = await pedir(prep, prep.tokenEstudiante)
        expect(respuesta.statusCode, prep.nombre).toBe(200)
        const claves = clavesDe(respuesta.json())
        for (const clave of prohibidas)
          expect(claves, `${prep.nombre} / ${clave}`).not.toContain(clave)
        expect(respuesta.body, prep.nombre).not.toContain("@")
      }
    },
  )

  it(
    "PR-1B14: ninguna respuesta de éxito lleva estadoPago, accesoRestringido ni correos, para el maestro y el admin",
    { timeout: 90000 },
    async () => {
      const tokenAdmin = await tokenDelAdminDePrueba()
      for (const hacer of rutas) {
        for (const quien of ["maestro", "admin"] as const) {
          const prep = await hacer(quien === "admin")
          const respuesta = await pedir(prep, quien === "admin" ? tokenAdmin : prep.tokenMaestro)
          expect(respuesta.statusCode, `${prep.nombre} / ${quien}`).toBe(prep.estatusPermitido)
          if (respuesta.statusCode === 204) continue
          const claves = clavesDe(respuesta.json())
          for (const prohibida of ["estadoPago", "accesoRestringido", "email", "correo", "rol"]) {
            expect(claves, `${prep.nombre} / ${quien}`).not.toContain(prohibida)
          }
          expect(respuesta.body, `${prep.nombre} / ${quien}`).not.toContain("@")
        }
      }
    },
  )
})
