import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  crearSesionDePrueba,
  crearUsuarioDePrueba,
  refrescarDePrueba,
} from "./ayudas-auth.js"
import { crearTokenDePrueba, leerTokens, pedirComoAdmin } from "./ayudas-cuentas.js"

let app: FastifyInstance
const ids: string[] = []
let tokenAdmin: string
let idAdmin: string

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  const email = process.env.ADMIN_EMAIL
  const contrasena = process.env.ADMIN_PASSWORD
  if (!email || !contrasena)
    throw new Error("Faltan ADMIN_EMAIL/ADMIN_PASSWORD en el entorno de pruebas")
  const sesion = await pedirComoAdmin(app, { email, contrasena })
  tokenAdmin = sesion.tokenAcceso
  const admin = await obtenerDb().usuario.findUnique({ where: { email }, select: { id: true } })
  if (!admin) throw new Error("no se encontró el administrador de pruebas")
  idAdmin = admin.id
})

afterAll(async () => {
  await borrarUsuariosDePrueba(ids)
  await app.close()
})

const restablecer = (id: string) =>
  app.inject({
    method: "POST",
    url: `/api/admin/usuarios/${id}/restablecer-contrasena`,
    headers: { authorization: `Bearer ${tokenAdmin}` },
  })

describe("POST /api/admin/usuarios/:id/restablecer-contrasena", () => {
  it("200 con formato de temporal xxxx-xxxx-xxxx y Cache-Control: no-store", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const respuesta = await restablecer(usuario.id)
    expect(respuesta.statusCode).toBe(200)
    expect(respuesta.headers["cache-control"]).toBe("no-store")
    const cuerpo = respuesta.json<{ contrasenaTemporal: string }>()
    expect(cuerpo.contrasenaTemporal).toMatch(/^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/)
  })

  it("el login con la temporal responde 200 y /me responde 403 CAMBIO_DE_CONTRASENA_REQUERIDO", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { contrasenaTemporal } = (await restablecer(usuario.id)).json<{
      contrasenaTemporal: string
    }>()
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: usuario.email, contrasena: contrasenaTemporal },
    })
    expect(login.statusCode).toBe(200)
    const { tokenAcceso } = login.json<{ tokenAcceso: string }>()
    const me = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: { authorization: `Bearer ${tokenAcceso}` },
    })
    expect(me.statusCode).toBe(403)
    expect(me.json<{ error: { codigo: string } }>().error.codigo).toBe(
      "CAMBIO_DE_CONTRASENA_REQUERIDO",
    )
  })

  it("las sesiones previas del usuario quedan revocadas", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { token } = await crearSesionDePrueba({
      usuarioId: usuario.id,
      expiraEn: new Date(Date.now() + 60_000),
    })
    await restablecer(usuario.id)
    const refresco = await refrescarDePrueba(app, token)
    expect(refresco.statusCode).toBe(401)
  })

  it("los enlaces vivos del usuario quedan revocados", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { id: tokenId } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: new Date(Date.now() + 60_000),
    })
    await restablecer(usuario.id)
    const [fila] = await leerTokens(usuario.id)
    expect(fila?.id).toBe(tokenId)
    expect(fila?.revocadoEn).not.toBeNull()
  })

  it("un objetivo admin responde 403 OPERACION_NO_PERMITIDA", async () => {
    const respuesta = await restablecer(idAdmin)
    expect(respuesta.statusCode).toBe(403)
    expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe(
      "OPERACION_NO_PERMITIDA",
    )
  })

  it("un id inexistente responde 404", async () => {
    const respuesta = await restablecer("00000000-0000-0000-0000-000000000000")
    expect(respuesta.statusCode).toBe(404)
  })

  it("un id que no es uuid responde 400", async () => {
    const respuesta = await restablecer("no-es-un-uuid")
    expect(respuesta.statusCode).toBe(400)
  })

  it("la base guarda un argon2id distinto de la temporal", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { contrasenaTemporal } = (await restablecer(usuario.id)).json<{
      contrasenaTemporal: string
    }>()
    const fila = await obtenerDb().usuario.findUnique({
      where: { id: usuario.id },
      select: { hashContrasena: true },
    })
    expect(fila?.hashContrasena).not.toBe(contrasenaTemporal)
    expect(fila?.hashContrasena.startsWith("$argon2id$")).toBe(true)
  })

  it("ninguna respuesta posterior (buscar) contiene la temporal", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { contrasenaTemporal } = (await restablecer(usuario.id)).json<{
      contrasenaTemporal: string
    }>()
    const buscar = await app.inject({
      method: "POST",
      url: "/api/admin/usuarios/buscar",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: { email: usuario.email },
    })
    expect(JSON.stringify(buscar.json())).not.toContain(contrasenaTemporal)
  })
})
