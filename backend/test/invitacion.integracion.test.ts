import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  borrarUsuariosDePruebaPorCorreo,
  correoDePrueba,
  consultarMe,
  crearUsuarioDePrueba,
  leerUsuarioPorCorreo,
} from "./ayudas-auth.js"
import { crearTokenDePrueba, leerTokens, pedirComoAdmin, tokenDelEnlace } from "./ayudas-cuentas.js"
import { crearNotifierEnMemoria } from "./notifier-en-memoria.js"
import { procesarCorreoDeCuenta } from "../src/workers/correo-de-cuenta.js"

// AUTH-02: alta de un maestro por invitación individual, de punta a punta.
// AUTH-03a, §D-A2 (T-02, ronda 2 del tester): se agregó POST /auth/invitacion (pública, solo
// devuelve el nombre con un token de invitación vivo) y el nombre opcional en
// POST /auth/establecer-contrasena, sin retirar ninguno de los casos de AUTH-02 de abajo.

let app: FastifyInstance
const correos: string[] = []
const ids: string[] = []
const urlPublicaFrontend = "http://127.0.0.1:5173"
let tokenAdmin: string

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  const email = process.env.ADMIN_EMAIL
  const contrasena = process.env.ADMIN_PASSWORD
  if (!email || !contrasena)
    throw new Error("Faltan ADMIN_EMAIL/ADMIN_PASSWORD en el entorno de pruebas")
  const sesion = await pedirComoAdmin(app, { email, contrasena })
  tokenAdmin = sesion.tokenAcceso
})

afterAll(async () => {
  await borrarUsuariosDePruebaPorCorreo(correos)
  await borrarUsuariosDePrueba(ids)
  await app.close()
})

const invitar = (nombre: string, email: string) =>
  app.inject({
    method: "POST",
    url: "/api/admin/maestros",
    headers: { authorization: `Bearer ${tokenAdmin}` },
    payload: { nombre, email },
  })

const nuevoCorreo = (): string => {
  const email = correoDePrueba("invitado")
  correos.push(email)
  return email
}

describe("POST /api/admin/maestros", () => {
  it("201 crea un maestro activo sin hash en la respuesta", async () => {
    const email = nuevoCorreo()
    const respuesta = await invitar("Maestro de Prueba", email)
    expect(respuesta.statusCode).toBe(201)
    const cuerpo = respuesta.json<Record<string, unknown>>()
    expect(cuerpo.rol).toBe("maestro")
    expect(cuerpo.activo).toBe(true)
    expect(cuerpo).not.toHaveProperty("hashContrasena")
  })

  it("el login del invitado responde 401 CREDENCIALES_INVALIDAS, igual que una contraseña incorrecta", async () => {
    const email = nuevoCorreo()
    await invitar("Maestro Sin Contrasena", email)
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, contrasena: "cualquier-cosa-1234" },
    })
    expect(login.statusCode).toBe(401)
    const cuerpo = login.json<{ error: { codigo: string; mensaje: string } }>()
    expect(cuerpo.error.codigo).toBe("CREDENCIALES_INVALIDAS")
    expect(cuerpo.error.mensaje).toBe("Correo o contraseña incorrectos.")
  })

  it("existe un trabajo con id igual al id del token de invitación", async () => {
    const email = nuevoCorreo()
    await invitar("Maestro Con Trabajo", email)
    const usuario = await obtenerDb().usuario.findUnique({ where: { email }, select: { id: true } })
    if (!usuario) throw new Error("no se creó el usuario invitado")
    const [tokenFila] = await leerTokens(usuario.id)
    expect(tokenFila).toBeDefined()
  })

  it("un correo duplicado responde 409 sin usuario, token ni trabajo nuevos", async () => {
    const email = nuevoCorreo()
    await invitar("Primera Invitacion", email)
    const duplicado = await invitar("Segunda Invitacion", email)
    expect(duplicado.statusCode).toBe(409)
    const usuarios = await obtenerDb().usuario.count({ where: { email } })
    expect(usuarios).toBe(1)
  })

  it("establecer-contrasena activa la cuenta y el login entra como maestro", async () => {
    const email = nuevoCorreo()
    await invitar("Maestro Activable", email)

    const usuario = await obtenerDb().usuario.findUnique({ where: { email }, select: { id: true } })
    if (!usuario) throw new Error("no se creó el usuario invitado")
    const [tokenFila] = await leerTokens(usuario.id)
    if (!tokenFila) throw new Error("no se creó el token de invitación")

    const notifier = crearNotifierEnMemoria()
    const resultado = await procesarCorreoDeCuenta(
      { id: tokenFila.id, datos: { tipo: "invitacion" } },
      {
        notifier,
        urlPublicaFrontend,
        reloj: () => new Date(),
        log: { info: () => undefined, warn: () => undefined, error: () => undefined },
      },
    )
    expect(resultado).toBe("enviado")
    const token = tokenDelEnlace(notifier.enviados[0]?.enlace ?? "")
    if (!token) throw new Error("el enlace no contenía un token")

    const establecer = await app.inject({
      method: "POST",
      url: "/api/auth/establecer-contrasena",
      payload: { token, contrasena: "contrasena-elegida-1234" },
    })
    expect(establecer.statusCode).toBe(204)

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, contrasena: "contrasena-elegida-1234" },
    })
    expect(login.statusCode).toBe(200)
    const { tokenAcceso } = login.json<{ tokenAcceso: string }>()
    const me = await consultarMe(app, tokenAcceso)
    expect(me.json<{ rol: string }>().rol).toBe("maestro")
  })

  it("un token de recuperación no vale en establecer-contrasena → 400", async () => {
    const email = nuevoCorreo()
    await invitar("Maestro Con Token Cruzado", email)
    const usuario = await obtenerDb().usuario.findUnique({ where: { email }, select: { id: true } })
    if (!usuario) throw new Error("no se creó el usuario invitado")
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: new Date(Date.now() + 60_000),
    })
    const respuesta = await app.inject({
      method: "POST",
      url: "/api/auth/establecer-contrasena",
      payload: { token, contrasena: "contrasena-elegida-1234" },
    })
    expect(respuesta.statusCode).toBe(400)
  })

  it("un token de invitación vencido (72 h) → 400", async () => {
    const email = nuevoCorreo()
    await invitar("Maestro Vencido", email)
    const usuario = await obtenerDb().usuario.findUnique({ where: { email }, select: { id: true } })
    if (!usuario) throw new Error("no se creó el usuario invitado")
    await obtenerDb().tokenCuenta.updateMany({
      where: { usuarioId: usuario.id },
      data: { expiraEn: new Date(Date.now() - 1000) },
    })
    const [tokenFila] = await leerTokens(usuario.id)
    if (!tokenFila) throw new Error("no se creó el token")
    const { derivarTokenDeCuenta } = await import("../src/adapters/auth/index.js")
    const { token } = derivarTokenDeCuenta(tokenFila.id)
    const respuesta = await app.inject({
      method: "POST",
      url: "/api/auth/establecer-contrasena",
      payload: { token, contrasena: "contrasena-elegida-1234" },
    })
    expect(respuesta.statusCode).toBe(400)
  })

  it("un segundo uso del mismo token de invitación → 400", async () => {
    const email = nuevoCorreo()
    await invitar("Maestro Doble Uso", email)
    const usuario = await obtenerDb().usuario.findUnique({ where: { email }, select: { id: true } })
    if (!usuario) throw new Error("no se creó el usuario invitado")
    const [tokenFila] = await leerTokens(usuario.id)
    if (!tokenFila) throw new Error("no se creó el token")

    const notifier = crearNotifierEnMemoria()
    await procesarCorreoDeCuenta(
      { id: tokenFila.id, datos: { tipo: "invitacion" } },
      {
        notifier,
        urlPublicaFrontend,
        reloj: () => new Date(),
        log: { info: () => undefined, warn: () => undefined, error: () => undefined },
      },
    )
    const token = tokenDelEnlace(notifier.enviados[0]?.enlace ?? "")
    if (!token) throw new Error("el enlace no contenía un token")

    const primero = await app.inject({
      method: "POST",
      url: "/api/auth/establecer-contrasena",
      payload: { token, contrasena: "contrasena-elegida-1234" },
    })
    expect(primero.statusCode).toBe(204)

    const segundo = await app.inject({
      method: "POST",
      url: "/api/auth/establecer-contrasena",
      payload: { token, contrasena: "otra-contrasena-1234" },
    })
    expect(segundo.statusCode).toBe(400)
  })

  it("crearMaestroInvitado con un alGuardar que lanza no deja ni usuario ni token", async () => {
    const { crearMaestroInvitado } = await import("../src/adapters/db/index.js")
    const { hashDeContrasenaInutilizable, derivarTokenDeCuenta } =
      await import("../src/adapters/auth/index.js")
    const { randomUUID } = await import("node:crypto")
    const email = nuevoCorreo()
    const tokenId = randomUUID()
    const { hash } = derivarTokenDeCuenta(tokenId)

    await expect(
      crearMaestroInvitado(
        {
          usuario: {
            nombre: "Maestro Fallido",
            nombreBusqueda: "maestro fallido",
            email,
            hashContrasena: await hashDeContrasenaInutilizable(),
            rol: "maestro",
          },
          token: { id: tokenId, hashToken: hash, expiraEn: new Date(Date.now() + 60_000) },
        },
        () => {
          throw new Error("fallo deliberado en alGuardar")
        },
      ),
    ).rejects.toThrow("fallo deliberado en alGuardar")

    const usuario = await obtenerDb().usuario.findUnique({ where: { email } })
    expect(usuario).toBeNull()
  })
})

// AUTH-03a, §D-A2 (T-02, ronda 2 del tester): casos agregados por el encargo, sin quitar los de
// arriba. `ids` (borrado por id) es un registro de limpieza distinto de `correos` (borrado por
// correo, de AUTH-02): los dos corren en el mismo afterAll.

const invitacion = (token: unknown) =>
  app.inject({ method: "POST", url: "/api/auth/invitacion", payload: { token } })

const establecer = (payload: Record<string, unknown>) =>
  app.inject({ method: "POST", url: "/api/auth/establecer-contrasena", payload })

const restablecer = (payload: Record<string, unknown>) =>
  app.inject({ method: "POST", url: "/api/auth/restablecer", payload })

const treintaMinutos = () => new Date(Date.now() + 30 * 60_000)
const setentaYDosHoras = () => new Date(Date.now() + 72 * 3_600_000)

describe("POST /api/auth/invitacion", () => {
  it("con una invitación viva, responde { nombre } exacto con Cache-Control: no-store", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { nombre: "Ana López" })
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "invitacion",
      expiraEn: setentaYDosHoras(),
    })

    const respuesta = await invitacion(token)

    expect(respuesta.statusCode).toBe(200)
    expect(respuesta.json()).toEqual({ nombre: "Ana López" })
    expect(respuesta.headers["cache-control"]).toBe("no-store")
  })

  it("token inexistente → 400 ENLACE_INVALIDO", async () => {
    const respuesta = await invitacion("Z".repeat(43))
    expect(respuesta.statusCode).toBe(400)
    expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe("ENLACE_INVALIDO")
  })

  it("token de recuperación (tipo distinto) → el mismo 400", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: treintaMinutos(),
    })
    const respuesta = await invitacion(token)
    expect(respuesta.statusCode).toBe(400)
    expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe("ENLACE_INVALIDO")
  })

  it("token ya usado → 400", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "invitacion",
      expiraEn: setentaYDosHoras(),
      usadoEn: new Date(),
    })
    const respuesta = await invitacion(token)
    expect(respuesta.statusCode).toBe(400)
  })

  it("token revocado → 400", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "invitacion",
      expiraEn: setentaYDosHoras(),
      revocadoEn: new Date(),
    })
    const respuesta = await invitacion(token)
    expect(respuesta.statusCode).toBe(400)
  })

  it("token vencido → 400", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "invitacion",
      expiraEn: new Date(Date.now() - 1000),
    })
    const respuesta = await invitacion(token)
    expect(respuesta.statusCode).toBe(400)
  })

  it("cuenta inactiva → 400", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { activo: false })
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "invitacion",
      expiraEn: setentaYDosHoras(),
    })
    const respuesta = await invitacion(token)
    expect(respuesta.statusCode).toBe(400)
  })

  it("no escribe nada ni consume el enlace: el mismo token sirve después para establecer", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "invitacion",
      expiraEn: setentaYDosHoras(),
    })

    await invitacion(token)
    await invitacion(token)
    const respuesta = await establecer({ token, contrasena: "contrasena-nueva-1234" })

    expect(respuesta.statusCode).toBe(204)
  })

  it("es pública: un Authorization ajeno no cambia la respuesta", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { nombre: "Ana López" })
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "invitacion",
      expiraEn: setentaYDosHoras(),
    })

    const respuesta = await app.inject({
      method: "POST",
      url: "/api/auth/invitacion",
      headers: { authorization: "Bearer basura-de-un-token-cualquiera" },
      payload: { token },
    })

    expect(respuesta.statusCode).toBe(200)
    expect(respuesta.json()).toEqual({ nombre: "Ana López" })
  })
})

describe("POST /api/auth/establecer-contrasena (nombre, §D-A2)", () => {
  it("con nombre, actualiza nombre y nombre_busqueda en la misma transacción", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { nombre: "Provisional" })
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "invitacion",
      expiraEn: setentaYDosHoras(),
    })

    const respuesta = await establecer({
      token,
      contrasena: "contrasena-nueva-1234",
      nombre: "  José Ángel  Núñez ",
    })

    expect(respuesta.statusCode).toBe(204)
    const actualizado = await leerUsuarioPorCorreo(usuario.email)
    expect(actualizado?.nombre).toBe("José Ángel Núñez")
    expect(actualizado?.nombreBusqueda).toBe("jose angel nunez")
  })

  it("sin nombre, el nombre no cambia", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { nombre: "Provisional" })
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "invitacion",
      expiraEn: setentaYDosHoras(),
    })

    const respuesta = await establecer({ token, contrasena: "contrasena-nueva-1234" })

    expect(respuesta.statusCode).toBe(204)
    const actualizado = await leerUsuarioPorCorreo(usuario.email)
    expect(actualizado?.nombre).toBe("Provisional")
  })

  it("un nombre inválido → 400 VALIDACION y el token sigue vivo", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { nombre: "Provisional" })
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "invitacion",
      expiraEn: setentaYDosHoras(),
    })

    const respuesta = await establecer({
      token,
      contrasena: "contrasena-nueva-1234",
      nombre: "a",
    })

    expect(respuesta.statusCode).toBe(400)
    expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe("VALIDACION")
    const [fila] = await leerTokens(usuario.id)
    expect(fila?.usadoEn).toBeNull()
    const intacto = await leerUsuarioPorCorreo(usuario.email)
    expect(intacto?.nombre).toBe("Provisional")

    const segundo = await establecer({ token, contrasena: "contrasena-nueva-1234" })
    expect(segundo.statusCode).toBe(204)
  })
})

describe("POST /api/auth/restablecer (nombre ignorado)", () => {
  it("un nombre en el cuerpo no cambia el nombre de la cuenta", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { nombre: "Nombre original" })
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: treintaMinutos(),
    })

    const respuesta = await restablecer({
      token,
      contrasena: "contrasena-nueva-1234",
      nombre: "Nombre que no debería quedar",
    })

    expect(respuesta.statusCode).toBe(204)
    const actualizado = await leerUsuarioPorCorreo(usuario.email)
    expect(actualizado?.nombre).toBe("Nombre original")
  })
})
