import { randomUUID } from "node:crypto"

import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import { fotoDeLaClase } from "./ayudas-borrado-duplicado.js"
import {
  archivarClaseDePrueba,
  clavesDe,
  codigoDeError,
  pedirComo,
  type MetodoDePrueba,
} from "./ayudas-clases-archivadas.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"

// ADMIN-01b (ADM-1B07): autorización del conteo, el borrado y el duplicado. Todas con
// roles ["admin"], pertenencia "propiedad" y enClaseArchivada "gestion".

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const ficha = (): string => randomUUID().slice(0, 8)
const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

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

const NOMBRE_NO_AUTORIZADO = `Copia no autorizada ${randomUUID().slice(0, 8)}`

interface Ruta {
  nombre: string
  method: MetodoDePrueba
  url: (claseId: string) => string
  payload?: (maestroId: string) => object
}

const RUTAS: readonly Ruta[] = [
  {
    nombre: "conteo",
    method: "GET",
    url: (id) => `/api/admin/clases/${id}/conteo-de-borrado`,
  },
  {
    nombre: "conteo (HEAD)",
    method: "HEAD",
    url: (id) => `/api/admin/clases/${id}/conteo-de-borrado`,
  },
  {
    nombre: "borrar",
    method: "DELETE",
    url: (id) => `/api/admin/clases/${id}?confirmar=borrar`,
  },
  {
    nombre: "duplicar",
    method: "POST",
    url: (id) => `/api/admin/clases/${id}/duplicar`,
    payload: (maestroId) => ({ nombre: NOMBRE_NO_AUTORIZADO, maestroIds: [maestroId] }),
  },
]

describe("autorización de conteo, borrado y duplicado (ADM-1B07)", () => {
  it("ADM-1B07: sin token 401; estudiante y maestro de la clase 403 ROL_NO_PERMITIDO; restringido 403 ACCESO_RESTRINGIDO; clase inexistente 403 SIN_ACCESO_A_LA_CLASE; nada borrado ni creado; sin estado de pago en las respuestas del admin", async () => {
    const maestro = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Maestro ${ficha()}`,
      rol: "maestro",
    })
    const alumno = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Alumno ${ficha()}` })
    const restringido = await crearAlumnoDePrueba(idsUsuarios, {
      nombre: `Restringido ${ficha()}`,
      accesoRestringido: true,
    })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, alumno.id)
    await inscribirDePrueba(clase.id, restringido.id)
    await archivarClaseDePrueba(clase.id)
    const antes = await fotoDeLaClase(clase.id)

    for (const ruta of RUTAS) {
      const base = {
        method: ruta.method,
        url: ruta.url(clase.id),
        ...(ruta.payload === undefined ? {} : { payload: ruta.payload(maestro.id) }),
      }
      const sinToken = await pedirComo(obtenerApp(), base)
      expect(sinToken.statusCode, `${ruta.nombre} sin token`).toBe(401)

      for (const usuario of [alumno, maestro]) {
        const respuesta = await pedirComo(obtenerApp(), { ...base, token: await tokenDe(usuario) })
        expect(respuesta.statusCode, ruta.nombre).toBe(403)
        if (ruta.method !== "HEAD")
          expect(codigoDeError(respuesta), ruta.nombre).toBe("ROL_NO_PERMITIDO")
      }

      const deRestringido = await pedirComo(obtenerApp(), {
        ...base,
        token: await tokenDe(restringido),
      })
      expect(deRestringido.statusCode, ruta.nombre).toBe(403)
      if (ruta.method !== "HEAD") {
        expect(codigoDeError(deRestringido), ruta.nombre).toBe("ACCESO_RESTRINGIDO")
      }

      const inexistente = await pedirComo(obtenerApp(), {
        ...base,
        url: ruta.url(randomUUID()),
        token: tokenAdmin,
      })
      expect(inexistente.statusCode, ruta.nombre).toBe(403)
      if (ruta.method !== "HEAD") {
        expect(codigoDeError(inexistente), ruta.nombre).toBe("SIN_ACCESO_A_LA_CLASE")
      }
    }
    expect(await fotoDeLaClase(clase.id)).toEqual(antes)
    expect(await obtenerDb().clase.count({ where: { nombre: NOMBRE_NO_AUTORIZADO } })).toBe(0)

    // El admin sí: ninguna respuesta lleva estado de pago, restricción ni correo.
    const conteo = await pedirComo(obtenerApp(), {
      method: "GET",
      url: `/api/admin/clases/${clase.id}/conteo-de-borrado`,
      token: tokenAdmin,
    })
    expect(conteo.statusCode).toBe(200)
    const copia = await pedirComo(obtenerApp(), {
      method: "POST",
      url: `/api/admin/clases/${clase.id}/duplicar`,
      token: tokenAdmin,
      payload: { nombre: `Copia ${ficha()}`, maestroIds: [maestro.id] },
    })
    expect(copia.statusCode).toBe(201)
    idsClases.push((copia.json() as { clase: { id: string } }).clase.id)
    for (const cuerpo of [conteo.json(), copia.json()]) {
      const claves = clavesDe(cuerpo)
      for (const prohibida of ["estadoPago", "accesoRestringido", "email", "codigoInvitacion"]) {
        expect(claves).not.toContain(prohibida)
      }
    }
    const borrado = await pedirComo(obtenerApp(), {
      method: "DELETE",
      url: `/api/admin/clases/${clase.id}?confirmar=borrar`,
      token: tokenAdmin,
    })
    expect(borrado.statusCode).toBe(204)
  })
})
