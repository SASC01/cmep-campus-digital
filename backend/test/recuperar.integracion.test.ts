import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, correoDePrueba, crearUsuarioDePrueba } from "./ayudas-auth.js"
import { buscarTrabajosPorCorreo } from "./ayudas-cuentas.js"

let app: FastifyInstance
const ids: string[] = []

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarUsuariosDePrueba(ids)
  await app.close()
})

const recuperar = (email: string, ip: string): Promise<LightMyRequestResponse> =>
  app.inject({ method: "POST", url: "/api/auth/recuperar", remoteAddress: ip, payload: { email } })

describe("POST /api/auth/recuperar", () => {
  it("correo existente y correo inexistente responden 204 con el mismo cuerpo y encabezados", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const respuestaExistente = await recuperar(usuario.email, "10.10.10.1")
    const respuestaInexistente = await recuperar(correoDePrueba("inexistente"), "10.10.10.2")

    expect(respuestaExistente.statusCode).toBe(204)
    expect(respuestaInexistente.statusCode).toBe(204)
    expect(respuestaExistente.body).toBe("")
    expect(respuestaInexistente.body).toBe("")
  })

  it("cada solicitud encola un trabajo con el correo normalizado", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    await recuperar(usuario.email.toUpperCase(), "10.10.10.3")
    const trabajos = await buscarTrabajosPorCorreo(usuario.email)
    expect(trabajos.length).toBeGreaterThanOrEqual(1)
  })

  it("el handler no escribe tokens_cuenta", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    await recuperar(usuario.email, "10.10.10.4")
    const filas = await obtenerDb().tokenCuenta.findMany({ where: { usuarioId: usuario.id } })
    expect(filas).toHaveLength(0)
  })

  it("la 4.ª solicitud desde la misma IP y correo responde 429 con Retry-After: 3600", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const ip = "10.10.10.5"
    await recuperar(usuario.email, ip)
    await recuperar(usuario.email, ip)
    await recuperar(usuario.email, ip)
    const cuarta = await recuperar(usuario.email, ip)
    expect(cuarta.statusCode).toBe(429)
    expect(cuarta.headers["retry-after"]).toBe("3600")
  })

  it("otro correo desde la misma IP no se bloquea", async () => {
    const ip = "10.10.10.6"
    const usuarioA = await crearUsuarioDePrueba(ids)
    const usuarioB = await crearUsuarioDePrueba(ids)
    await recuperar(usuarioA.email, ip)
    await recuperar(usuarioA.email, ip)
    await recuperar(usuarioA.email, ip)
    const otraCuenta = await recuperar(usuarioB.email, ip)
    expect(otraCuenta.statusCode).toBe(204)
  })

  it("correo inválido → 400", async () => {
    const respuesta = await recuperar("no-es-un-correo", "10.10.10.7")
    expect(respuesta.statusCode).toBe(400)
  })

  it("cuerpo no JSON → 400", async () => {
    const respuesta = await app.inject({
      method: "POST",
      url: "/api/auth/recuperar",
      remoteAddress: "10.10.10.8",
      headers: { "content-type": "application/json" },
      payload: "no es json",
    })
    expect(respuesta.statusCode).toBe(400)
  })

  it("mayúsculas y espacios cuentan como el mismo correo para el límite", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const ip = "10.10.10.9"
    await recuperar(usuario.email, ip)
    await recuperar(` ${usuario.email.toUpperCase()} `, ip)
    await recuperar(usuario.email, ip)
    const cuarta = await recuperar(usuario.email, ip)
    expect(cuarta.statusCode).toBe(429)
  })
})
