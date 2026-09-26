import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"

let app: FastifyInstance
const ids: string[] = []
let idParaRutas: string

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  const cuenta = await crearUsuarioDePrueba(ids)
  idParaRutas = cuenta.id
})

afterAll(async () => {
  await borrarUsuariosDePrueba(ids)
  await app.close()
})

interface Ruta {
  nombre: string
  metodo: "POST" | "PUT"
  url: () => string
  payload?: Record<string, unknown>
}

const rutas: Ruta[] = [
  {
    nombre: "POST /api/admin/maestros",
    metodo: "POST",
    url: () => "/api/admin/maestros",
    payload: { nombre: "x", email: "x@ejemplo.mx" },
  },
  {
    nombre: "POST /api/admin/usuarios/buscar",
    metodo: "POST",
    url: () => "/api/admin/usuarios/buscar",
    payload: { email: "x@ejemplo.mx" },
  },
  {
    nombre: "POST /api/admin/usuarios/:id/restablecer-contrasena",
    metodo: "POST",
    url: () => `/api/admin/usuarios/${idParaRutas}/restablecer-contrasena`,
  },
  {
    nombre: "PUT /api/admin/usuarios/:id/correo",
    metodo: "PUT",
    url: () => `/api/admin/usuarios/${idParaRutas}/correo`,
    payload: { email: "x@ejemplo.mx" },
  },
]

const pedir = (ruta: Ruta, token?: string) =>
  app.inject({
    method: ruta.metodo,
    url: ruta.url(),
    ...(token === undefined ? {} : { headers: { authorization: `Bearer ${token}` } }),
    ...(ruta.payload ? { payload: ruta.payload } : {}),
  })

describe("autorización de las rutas de /api/admin", () => {
  for (const ruta of rutas) {
    describe(ruta.nombre, () => {
      it("sin token → 401", async () => {
        const respuesta = await pedir(ruta)
        expect(respuesta.statusCode).toBe(401)
      })

      it("un estudiante → 403 ROL_NO_PERMITIDO", async () => {
        const estudiante = await crearUsuarioDePrueba(ids, { rol: "estudiante" })
        const token = await firmarTokenDePrueba({ usuarioId: estudiante.id })
        const respuesta = await pedir(ruta, token)
        expect(respuesta.statusCode).toBe(403)
        expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe(
          "ROL_NO_PERMITIDO",
        )
      })

      it("un maestro → 403 ROL_NO_PERMITIDO", async () => {
        const maestro = await crearUsuarioDePrueba(ids, { rol: "maestro" })
        const token = await firmarTokenDePrueba({ usuarioId: maestro.id })
        const respuesta = await pedir(ruta, token)
        expect(respuesta.statusCode).toBe(403)
        expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe(
          "ROL_NO_PERMITIDO",
        )
      })

      it("un estudiante restringido → 403 ACCESO_RESTRINGIDO (antes que el rol)", async () => {
        const restringido = await crearUsuarioDePrueba(ids, {
          rol: "estudiante",
          accesoRestringido: true,
        })
        const token = await firmarTokenDePrueba({ usuarioId: restringido.id })
        const respuesta = await pedir(ruta, token)
        expect(respuesta.statusCode).toBe(403)
        expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe(
          "ACCESO_RESTRINGIDO",
        )
      })

      it("un maestro con cambio pendiente → 403 CAMBIO_DE_CONTRASENA_REQUERIDO (antes que el rol)", async () => {
        const conCambioPendiente = await crearUsuarioDePrueba(ids, {
          rol: "maestro",
          debeCambiarContrasena: true,
        })
        const token = await firmarTokenDePrueba({ usuarioId: conCambioPendiente.id })
        const respuesta = await pedir(ruta, token)
        expect(respuesta.statusCode).toBe(403)
        expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe(
          "CAMBIO_DE_CONTRASENA_REQUERIDO",
        )
      })
    })
  }

  it("ninguna respuesta de admin contiene estadoPago, hashContrasena ni hash_token", async () => {
    const email = process.env.ADMIN_EMAIL
    const contrasena = process.env.ADMIN_PASSWORD
    if (!email || !contrasena) throw new Error("Faltan ADMIN_EMAIL/ADMIN_PASSWORD")
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, contrasena },
    })
    const { tokenAcceso } = login.json<{ tokenAcceso: string }>()
    const buscar = await app.inject({
      method: "POST",
      url: "/api/admin/usuarios/buscar",
      headers: { authorization: `Bearer ${tokenAcceso}` },
      payload: { email },
    })
    const texto = JSON.stringify(buscar.json())
    expect(texto).not.toContain("estadoPago")
    expect(texto).not.toContain("hashContrasena")
    expect(texto).not.toContain("hash_token")
  })
})
