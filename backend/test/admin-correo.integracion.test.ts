import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  correoDePrueba,
  crearSesionDePrueba,
  crearUsuarioDePrueba,
  refrescarDePrueba,
} from "./ayudas-auth.js"
import { crearTokenDePrueba, leerTokens, pedirComoAdmin } from "./ayudas-cuentas.js"

let app: FastifyInstance
const ids: string[] = []
let tokenAdmin: string

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  const email = process.env.ADMIN_EMAIL
  const contrasena = process.env.ADMIN_PASSWORD
  if (!email || !contrasena)
    throw new Error("Faltan ADMIN_EMAIL/ADMIN_PASSWORD en el entorno de pruebas")
  tokenAdmin = (await pedirComoAdmin(app, { email, contrasena })).tokenAcceso
})

afterAll(async () => {
  await borrarUsuariosDePrueba(ids)
  await app.close()
})

const buscar = (email: string) =>
  app.inject({
    method: "POST",
    url: "/api/admin/usuarios/buscar",
    headers: { authorization: `Bearer ${tokenAdmin}` },
    payload: { email },
  })

const corregir = (id: string, email: string) =>
  app.inject({
    method: "PUT",
    url: `/api/admin/usuarios/${id}/correo`,
    headers: { authorization: `Bearer ${tokenAdmin}` },
    payload: { email },
  })

describe("POST /api/admin/usuarios/buscar", () => {
  it("una cuenta existente no lleva estadoPago ni hash", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const respuesta = await buscar(usuario.email)
    expect(respuesta.statusCode).toBe(200)
    const cuerpo = JSON.stringify(respuesta.json())
    expect(cuerpo).not.toContain("estadoPago")
    expect(cuerpo).not.toContain("hashContrasena")
  })

  it("normaliza mayúsculas y espacios", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const respuesta = await buscar(` ${usuario.email.toUpperCase()} `)
    expect(respuesta.statusCode).toBe(200)
    expect(respuesta.json<{ usuario: { email: string } }>().usuario.email).toBe(usuario.email)
  })

  it("un correo inexistente responde 404", async () => {
    const respuesta = await buscar(correoDePrueba("no-existe"))
    expect(respuesta.statusCode).toBe(404)
  })

  it("un correo inválido responde 400", async () => {
    const respuesta = await buscar("no-es-un-correo")
    expect(respuesta.statusCode).toBe(400)
  })
})

describe("PUT /api/admin/usuarios/:id/correo", () => {
  it("corrige el correo y lo devuelve normalizado", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const nuevo = correoDePrueba("corregido")
    const respuesta = await corregir(usuario.id, ` ${nuevo.toUpperCase()} `)
    expect(respuesta.statusCode).toBe(200)
    expect(respuesta.json<{ email: string }>().email).toBe(nuevo)
  })

  it("el login funciona con el correo nuevo", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const nuevo = correoDePrueba("login-nuevo")
    await corregir(usuario.id, nuevo)
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: nuevo, contrasena: usuario.contrasena },
    })
    expect(login.statusCode).toBe(200)
  })

  it("un correo ya en uso responde 409", async () => {
    const usuarioA = await crearUsuarioDePrueba(ids)
    const usuarioB = await crearUsuarioDePrueba(ids)
    const respuesta = await corregir(usuarioA.id, usuarioB.email)
    expect(respuesta.statusCode).toBe(409)
  })

  it("un id inexistente responde 404", async () => {
    const respuesta = await corregir("00000000-0000-0000-0000-000000000000", correoDePrueba("x"))
    expect(respuesta.statusCode).toBe(404)
  })

  it("revoca los enlaces vivos del usuario", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { id: tokenId } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: new Date(Date.now() + 60_000),
    })
    await corregir(usuario.id, correoDePrueba("con-token-revocado"))
    const [fila] = await leerTokens(usuario.id)
    expect(fila?.id).toBe(tokenId)
    expect(fila?.revocadoEn).not.toBeNull()
  })

  it("no revoca las sesiones (S-06)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { token } = await crearSesionDePrueba({
      usuarioId: usuario.id,
      expiraEn: new Date(Date.now() + 60_000),
    })
    await corregir(usuario.id, correoDePrueba("sesion-viva"))
    const refresco = await refrescarDePrueba(app, token)
    expect(refresco.statusCode).toBe(200)
  })
})
