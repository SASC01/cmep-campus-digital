import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  contarSesionesVivas,
  crearSesionDePrueba,
  crearUsuarioDePrueba,
  desactivarUsuarioDePrueba,
  firmarTokenDePrueba,
  leerUsuarioPorCorreo,
} from "./ayudas-auth.js"
import {
  buscarTrabajosPorCorreo,
  crearTokenDePrueba,
  leerTokens,
  pedirComoAdmin,
  tokenDelEnlace,
} from "./ayudas-cuentas.js"
import { crearNotifierEnMemoria } from "./notifier-en-memoria.js"
import { procesarCorreoDeCuenta } from "../src/workers/correo-de-cuenta.js"

let app: FastifyInstance
const ids: string[] = []
const urlPublicaFrontend = "http://127.0.0.1:5173"

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarUsuariosDePrueba(ids)
  await app.close()
})

const login = (email: string, contrasena: string) =>
  app.inject({ method: "POST", url: "/api/auth/login", payload: { email, contrasena } })

const restablecer = (token: string, contrasena: string) =>
  app.inject({ method: "POST", url: "/api/auth/restablecer", payload: { token, contrasena } })

describe("POST /api/auth/restablecer", () => {
  it("de punta a punta: recuperar, worker, restablecer y el login usa la contraseña nueva", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    await app.inject({
      method: "POST",
      url: "/api/auth/recuperar",
      remoteAddress: "10.20.1.1",
      payload: { email: usuario.email },
    })

    const [trabajo] = await buscarTrabajosPorCorreo(usuario.email)
    expect(trabajo).toBeDefined()
    if (!trabajo) throw new Error("no se encontró el trabajo encolado")

    const notifier = crearNotifierEnMemoria()
    const resultado = await procesarCorreoDeCuenta(
      { id: trabajo.id, datos: { tipo: "recuperacion", correo: usuario.email } },
      {
        notifier,
        urlPublicaFrontend,
        reloj: () => new Date(),
        log: { info: () => undefined, warn: () => undefined, error: () => undefined },
      },
    )
    expect(resultado).toBe("enviado")
    const enlace = notifier.enviados[0]?.enlace
    expect(enlace).toBeDefined()
    const token = tokenDelEnlace(enlace ?? "")
    expect(token).not.toBeNull()
    if (!token) throw new Error("el enlace no contenía un token")

    const respuesta = await restablecer(token, "contrasena-nueva-1234")
    expect(respuesta.statusCode).toBe(204)

    const conNueva = await login(usuario.email, "contrasena-nueva-1234")
    expect(conNueva.statusCode).toBe(200)
    const conVieja = await login(usuario.email, usuario.contrasena)
    expect(conVieja.statusCode).toBe(401)
  })

  it("revoca las sesiones previas del usuario", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: new Date(Date.now() + 60_000) })
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: new Date(Date.now() + 60_000),
    })
    await restablecer(token, "contrasena-nueva-1234")
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  })

  it("deja debe_cambiar_contrasena en false", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { debeCambiarContrasena: true })
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: new Date(Date.now() + 60_000),
    })
    await restablecer(token, "contrasena-nueva-1234")
    const actualizado = await leerUsuarioPorCorreo(usuario.email)
    expect(actualizado?.debeCambiarContrasena).toBe(false)
  })

  it("un segundo uso del mismo token → 400 ENLACE_INVALIDO", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: new Date(Date.now() + 60_000),
    })
    const primero = await restablecer(token, "contrasena-nueva-1234")
    expect(primero.statusCode).toBe(204)
    const segundo = await restablecer(token, "otra-contrasena-1234")
    expect(segundo.statusCode).toBe(400)
  })

  it("token vencido → 400", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: new Date(Date.now() - 1000),
    })
    const respuesta = await restablecer(token, "contrasena-nueva-1234")
    expect(respuesta.statusCode).toBe(400)
  })

  it("un token de invitación no vale en /restablecer → 400", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "invitacion",
      expiraEn: new Date(Date.now() + 60_000),
    })
    const respuesta = await restablecer(token, "contrasena-nueva-1234")
    expect(respuesta.statusCode).toBe(400)
  })

  it("un token revocado por uno más nuevo → 400", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: new Date(Date.now() + 60_000),
      revocadoEn: new Date(),
    })
    const respuesta = await restablecer(token, "contrasena-nueva-1234")
    expect(respuesta.statusCode).toBe(400)
  })

  it("contraseña de 9 caracteres → 400 VALIDACION sin consumir el token", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: new Date(Date.now() + 60_000),
    })
    const respuesta = await restablecer(token, "corta1234")
    expect(respuesta.statusCode).toBe(400)
    const [fila] = await leerTokens(usuario.id)
    expect(fila?.usadoEn).toBeNull()
  })

  it("usuario inactivo → 400", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    await desactivarUsuarioDePrueba(usuario.id)
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: new Date(Date.now() + 60_000),
    })
    const respuesta = await restablecer(token, "contrasena-nueva-1234")
    expect(respuesta.statusCode).toBe(400)
  })

  it("dos usos concurrentes del mismo token: exactamente un 204", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: new Date(Date.now() + 60_000),
    })
    const [a, b] = await Promise.all([
      restablecer(token, "contrasena-nueva-1234"),
      restablecer(token, "contrasena-nueva-5678"),
    ])
    const exitos = [a, b].filter((respuesta) => respuesta.statusCode === 204)
    expect(exitos).toHaveLength(1)
  })
})

// T-01 (ronda 2): el Tester probó el consumo concurrente de dos tokens del mismo usuario
// (usarTokenYCambiarContrasena contra sí misma) y dejó sin probar por separado las otras dos
// combinaciones que comparten la causa (el orden de bloqueo de usuarios/tokens_cuenta/sesiones).
// El mismo patrón: se retiene la fila del usuario 1,5 s con SELECT ... FOR UPDATE, se lanzan las
// dos peticiones y se comprueba que ninguna termine en 500.
describe("ataque de carrera con otras transacciones del mismo usuario (T-01, ronda 2)", () => {
  it("/auth/restablecer contra el restablecimiento por el admin: nunca un 500", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: new Date(Date.now() + 60_000),
    })
    const admin = await pedirComoAdmin(app, {
      email: process.env.ADMIN_EMAIL ?? "",
      contrasena: process.env.ADMIN_PASSWORD ?? "",
    })

    let peticiones:
      Promise<[Awaited<ReturnType<typeof restablecer>>, ReturnType<typeof app.inject>]> | undefined
    await obtenerDb().$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${usuario.id}::uuid FOR UPDATE`
        peticiones = Promise.all([
          restablecer(token, "contrasena-por-recuperacion-1"),
          app.inject({
            method: "POST",
            url: `/api/admin/usuarios/${usuario.id}/restablecer-contrasena`,
            headers: { authorization: `Bearer ${admin.tokenAcceso}` },
          }),
        ])
        await new Promise((resolver) => setTimeout(resolver, 1500))
      },
      { timeout: 15_000, maxWait: 5_000 },
    )
    if (!peticiones) throw new Error("no se lanzaron las peticiones")
    const [respuestaRestablecer, respuestaAdmin] = await peticiones

    expect(respuestaRestablecer.statusCode).toBeLessThan(500)
    expect(respuestaAdmin.statusCode).toBeLessThan(500)
  }, 30_000)

  it("/auth/restablecer contra /auth/cambiar-contrasena del mismo usuario: nunca un 500", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { debeCambiarContrasena: true })
    const { token } = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: new Date(Date.now() + 60_000),
    })
    const tokenAcceso = await firmarTokenDePrueba({ usuarioId: usuario.id })

    let peticiones:
      Promise<[Awaited<ReturnType<typeof restablecer>>, ReturnType<typeof app.inject>]> | undefined
    await obtenerDb().$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${usuario.id}::uuid FOR UPDATE`
        peticiones = Promise.all([
          restablecer(token, "contrasena-por-recuperacion-2"),
          app.inject({
            method: "POST",
            url: "/api/auth/cambiar-contrasena",
            headers: { authorization: `Bearer ${tokenAcceso}` },
            payload: {
              contrasenaActual: usuario.contrasena,
              contrasenaNueva: "contrasena-por-cambio-1",
            },
          }),
        ])
        await new Promise((resolver) => setTimeout(resolver, 1500))
      },
      { timeout: 15_000, maxWait: 5_000 },
    )
    if (!peticiones) throw new Error("no se lanzaron las peticiones")
    const [respuestaRestablecer, respuestaCambio] = await peticiones

    expect(respuestaRestablecer.statusCode).toBeLessThan(500)
    expect(respuestaCambio.statusCode).toBeLessThan(500)
  }, 30_000)
})
