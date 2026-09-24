import { randomUUID } from "node:crypto"

import { errorApiSchema, meRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  alterarFirma,
  borrarUsuariosDePrueba,
  cargaDeTokenDePrueba,
  consultarMe,
  crearUsuarioDePrueba,
  firmarJwtDePrueba,
  firmarTokenDePrueba,
  iniciarSesionDePrueba,
} from "./ayudas-auth.js"

let app: FastifyInstance | undefined
const ids: string[] = []
const cuerposRecibidos: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const me = async (tokenAcceso?: string, cookie?: string): Promise<LightMyRequestResponse> => {
  const respuesta = await consultarMe(obtenerApp(), tokenAcceso, cookie)
  cuerposRecibidos.push(respuesta.body)
  return respuesta
}

const esperarNoAutenticado = (respuesta: LightMyRequestResponse) => {
  expect(respuesta.statusCode).toBe(401)
  expect(errorApiSchema.parse(respuesta.json()).error.codigo).toBe("NO_AUTENTICADO")
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarUsuariosDePrueba(ids)
  await app?.close()
})

describe("GET /api/me", () => {
  it("estudiante: 200 con los campos exactos del contrato y sin estadoPago", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { nombre: "Ana López" })
    const { tokenAcceso } = await iniciarSesionDePrueba(obtenerApp(), usuario)

    const respuesta = await me(tokenAcceso)

    expect(respuesta.statusCode).toBe(200)
    const cuerpo = meRespuestaSchema.parse(respuesta.json())
    expect(cuerpo).toEqual({
      id: usuario.id,
      nombre: "Ana López",
      email: usuario.email,
      rol: "estudiante",
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
    expect(Object.keys(respuesta.json<Record<string, unknown>>()).sort()).toEqual(
      ["accesoRestringido", "debeCambiarContrasena", "email", "id", "nombre", "rol"].sort(),
    )
  })

  it("maestro: 200 con su rol", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { rol: "maestro" })
    const token = await firmarTokenDePrueba({ usuarioId: usuario.id })

    const respuesta = await me(token)

    expect(respuesta.statusCode).toBe(200)
    expect(meRespuestaSchema.parse(respuesta.json()).rol).toBe("maestro")
  })

  it("sin token responde 401 NO_AUTENTICADO", async () => {
    esperarNoAutenticado(await me())
  })

  it("con la cookie de refresco pero sin Authorization responde 401 (V-15)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { cookie } = await iniciarSesionDePrueba(obtenerApp(), usuario)

    esperarNoAutenticado(await me(undefined, cookie))
  })

  it("con un token vencido (firmado hace 16 minutos) responde 401", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const token = await firmarTokenDePrueba({
      usuarioId: usuario.id,
      ahora: new Date(Date.now() - 16 * 60_000),
    })

    esperarNoAutenticado(await me(token))
  })

  it("con la firma alterada responde 401", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const token = await firmarTokenDePrueba({ usuarioId: usuario.id })

    esperarNoAutenticado(await me(alterarFirma(token)))
  })

  it("con alg: none responde 401", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const token = firmarJwtDePrueba({
      payload: cargaDeTokenDePrueba({ usuarioId: usuario.id, ahora: new Date() }),
      alg: "none",
    })

    esperarNoAutenticado(await me(token))
  })

  it("con un sub que no existe responde 401", async () => {
    const token = await firmarTokenDePrueba({ usuarioId: randomUUID() })

    esperarNoAutenticado(await me(token))
  })

  it("con un usuario inactivo responde 401 aunque el token sea válido", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { activo: false })
    const token = await firmarTokenDePrueba({ usuarioId: usuario.id })

    esperarNoAutenticado(await me(token))
  })

  it("con acceso restringido responde 200 e incluye motivoRestriccion", async () => {
    const usuario = await crearUsuarioDePrueba(ids, {
      accesoRestringido: true,
      motivoRestriccion: "Adeudo de colegiatura",
    })
    const token = await firmarTokenDePrueba({ usuarioId: usuario.id })

    const respuesta = await me(token)

    expect(respuesta.statusCode).toBe(200)
    const cuerpo = meRespuestaSchema.parse(respuesta.json())
    expect(cuerpo.accesoRestringido).toBe(true)
    expect(cuerpo.motivoRestriccion).toBe("Adeudo de colegiatura")
  })

  it("con cambio de contraseña pendiente responde 403 CAMBIO_DE_CONTRASENA_REQUERIDO", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { debeCambiarContrasena: true })
    const token = await firmarTokenDePrueba({ usuarioId: usuario.id })

    const respuesta = await me(token)

    expect(respuesta.statusCode).toBe(403)
    expect(errorApiSchema.parse(respuesta.json()).error.codigo).toBe(
      "CAMBIO_DE_CONTRASENA_REQUERIDO",
    )
  })

  it("en ningún cuerpo recibido aparece hash, argon2, hashToken ni estadoPago", () => {
    expect(cuerposRecibidos.length).toBeGreaterThan(0)
    for (const cuerpo of cuerposRecibidos) {
      expect(cuerpo).not.toMatch(/hash|argon2|hashToken|estadoPago|estado_pago/i)
    }
  })
})
