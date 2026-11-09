import { randomUUID } from "node:crypto"

import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import { codigoDeError, pedirComo, type MetodoDePrueba } from "./ayudas-clases-archivadas.js"
import { crearCuentaDeGestion, leerFilaDb } from "./ayudas-usuarios-admin.js"

// ADMIN-01e (ADM-1E14): autorización de las nueve rutas de §D-7 y §D-8 y los HEAD de sus cuatro GET.
// Todas con roles ["admin"] y sin :claseId: sin token 401; estudiante y maestro 403
// ROL_NO_PERMITIDO; un alumno restringido 403 ACCESO_RESTRINGIDO; nada se escribe y ninguna
// respuesta lleva el estado de pago.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

interface Ruta {
  nombre: string
  method: MetodoDePrueba
  url: (objetivoId: string) => string
  payload?: (objetivoId: string) => object
}

const RUTAS: readonly Ruta[] = [
  {
    nombre: "lista",
    method: "GET",
    url: () => "/api/admin/usuarios?rol=estudiante&estadoPago=deudor",
  },
  { nombre: "lista (HEAD)", method: "HEAD", url: () => "/api/admin/usuarios" },
  { nombre: "ficha", method: "GET", url: (id) => `/api/admin/usuarios/${id}` },
  { nombre: "ficha (HEAD)", method: "HEAD", url: (id) => `/api/admin/usuarios/${id}` },
  {
    nombre: "nombre",
    method: "PUT",
    url: (id) => `/api/admin/usuarios/${id}/nombre`,
    payload: () => ({ nombre: "Nombre No Autorizado" }),
  },
  {
    nombre: "activo",
    method: "PUT",
    url: (id) => `/api/admin/usuarios/${id}/activo`,
    payload: () => ({ activo: false }),
  },
  {
    nombre: "alta",
    method: "POST",
    url: () => "/api/admin/alumnos",
    payload: () => ({ nombre: "Alta No Autorizada", email: `noaut-${randomUUID()}@pruebas.local` }),
  },
  {
    nombre: "estado de pago",
    method: "PUT",
    url: () => "/api/admin/alumnos/estado-pago",
    payload: (id) => ({ alumnoIds: [id], estadoPago: "al_corriente" }),
  },
  {
    nombre: "acceso",
    method: "PUT",
    url: (id) => `/api/admin/alumnos/${id}/acceso`,
    payload: () => ({ restringido: true, motivo: "No autorizado" }),
  },
  { nombre: "resumen", method: "GET", url: () => "/api/admin/resumen" },
  { nombre: "resumen (HEAD)", method: "HEAD", url: () => "/api/admin/resumen" },
  { nombre: "movimientos", method: "GET", url: () => "/api/admin/movimientos-inscripcion" },
  {
    nombre: "movimientos (HEAD)",
    method: "HEAD",
    url: () => "/api/admin/movimientos-inscripcion",
  },
]

describe("autorización de las rutas de usuarios (ADM-1E14)", () => {
  it("ADM-1E14: sin token 401; estudiante y maestro 403 ROL_NO_PERMITIDO; alumno restringido 403 ACCESO_RESTRINGIDO; nada se escribe; ninguna respuesta lleva el estado de pago", async () => {
    const objetivo = await crearCuentaDeGestion(idsUsuarios, {
      nombre: "Objetivo Autorizacion",
      estadoPago: "deudor",
    })
    const alumno = await crearCuentaDeGestion(idsUsuarios, { nombre: "Alumno Autorizacion" })
    const maestro = await crearCuentaDeGestion(idsUsuarios, {
      nombre: "Maestro Autorizacion",
      rol: "maestro",
    })
    const restringido = await crearCuentaDeGestion(idsUsuarios, {
      nombre: "Restringido Autorizacion",
      accesoRestringido: true,
    })
    const antes = await leerFilaDb(objetivo.id)
    const alumnosAntes = await obtenerDb().usuario.count({
      where: { nombre: "Alta No Autorizada" },
    })

    for (const ruta of RUTAS) {
      const base = {
        method: ruta.method,
        url: ruta.url(objetivo.id),
        ...(ruta.payload === undefined ? {} : { payload: ruta.payload(objetivo.id) }),
      }
      const sinToken = await pedirComo(obtenerApp(), base)
      expect(sinToken.statusCode, `${ruta.nombre} sin token`).toBe(401)

      for (const usuario of [alumno, maestro]) {
        const respuesta = await pedirComo(obtenerApp(), {
          ...base,
          token: await firmarTokenDePrueba({ usuarioId: usuario.id }),
        })
        expect(respuesta.statusCode, ruta.nombre).toBe(403)
        if (ruta.method !== "HEAD") {
          expect(codigoDeError(respuesta), ruta.nombre).toBe("ROL_NO_PERMITIDO")
          expect(respuesta.body, ruta.nombre).not.toMatch(/estadoPago|deudor/)
        }
      }

      const deRestringido = await pedirComo(obtenerApp(), {
        ...base,
        token: await firmarTokenDePrueba({ usuarioId: restringido.id }),
      })
      expect(deRestringido.statusCode, ruta.nombre).toBe(403)
      if (ruta.method !== "HEAD") {
        expect(codigoDeError(deRestringido), ruta.nombre).toBe("ACCESO_RESTRINGIDO")
        expect(deRestringido.body, ruta.nombre).not.toMatch(/estadoPago|deudor/)
      }
    }

    expect(await leerFilaDb(objetivo.id)).toEqual(antes)
    expect(await obtenerDb().usuario.count({ where: { nombre: "Alta No Autorizada" } })).toBe(
      alumnosAntes,
    )
  })
})
