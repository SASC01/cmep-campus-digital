import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  consultarMe,
  contarSesionesVivas,
  crearSesionDePrueba,
  crearUsuarioDePrueba,
  leerSesiones,
  valorCookieRefresco,
} from "./ayudas-auth.js"

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

const login = (email: string, contrasena: string) =>
  app.inject({ method: "POST", url: "/api/auth/login", payload: { email, contrasena } })

const cambiar = (
  tokenAcceso: string,
  {
    contrasenaNueva,
    cookie,
    extra = {},
  }: { contrasenaNueva: string; cookie?: string | undefined; extra?: Record<string, unknown> },
) =>
  app.inject({
    method: "POST",
    url: "/api/auth/cambiar-contrasena",
    headers: { authorization: `Bearer ${tokenAcceso}` },
    payload: { contrasenaNueva, ...extra },
    ...(cookie === undefined ? {} : { cookies: { campus_refresco: cookie } }),
  })

const crearConCambioPendiente = async () => {
  const usuario = await crearUsuarioDePrueba(ids, { debeCambiarContrasena: true })
  const sesion = await login(usuario.email, usuario.contrasena)
  const cookie = valorCookieRefresco(sesion)
  const { tokenAcceso } = sesion.json<{ tokenAcceso: string }>()
  return { usuario, tokenAcceso, cookie }
}

describe("POST /api/auth/cambiar-contrasena", () => {
  it("con la cookie viva del login con la temporal → 204, la bandera queda en false y /me responde 200", async () => {
    const { usuario, tokenAcceso, cookie } = await crearConCambioPendiente()
    const respuesta = await cambiar(tokenAcceso, {
      contrasenaNueva: "contrasena-nueva-1234",
      cookie,
    })
    expect(respuesta.statusCode).toBe(204)
    const fila = await obtenerDb().usuario.findUnique({
      where: { id: usuario.id },
      select: { debeCambiarContrasena: true },
    })
    expect(fila?.debeCambiarContrasena).toBe(false)
    const me = await consultarMe(app, tokenAcceso)
    expect(me.statusCode).toBe(200)
  })

  it("conserva la sesión de la cookie y revoca las demás", async () => {
    const { usuario, tokenAcceso, cookie } = await crearConCambioPendiente()
    await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: new Date(Date.now() + 60_000) })
    await cambiar(tokenAcceso, { contrasenaNueva: "contrasena-nueva-1234", cookie })
    expect(await contarSesionesVivas(usuario.id)).toBe(1)
    const sesiones = await leerSesiones(usuario.id)
    expect(sesiones.filter((sesion) => sesion.revocadaEn === null)).toHaveLength(1)
  })

  it("sin cookie → 401 SESION_INVALIDA, sin gastar intentos: 6 sin cookie y una con cookie válida dan 204", async () => {
    const { usuario, tokenAcceso, cookie } = await crearConCambioPendiente()
    for (let intento = 0; intento < 6; intento += 1) {
      const respuesta = await cambiar(tokenAcceso, { contrasenaNueva: "contrasena-nueva-1234" })
      expect(respuesta.statusCode).toBe(401)
      expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe("SESION_INVALIDA")
    }
    const conCookie = await cambiar(tokenAcceso, {
      contrasenaNueva: "contrasena-nueva-1234",
      cookie,
    })
    expect(conCookie.statusCode).toBe(204)
    expect(await contarSesionesVivas(usuario.id)).toBe(1)
  })

  it("con una cookie revocada → 401 SESION_INVALIDA", async () => {
    const { usuario, tokenAcceso } = await crearConCambioPendiente()
    const revocada = await crearSesionDePrueba({
      usuarioId: usuario.id,
      expiraEn: new Date(Date.now() + 60_000),
      revocadaEn: new Date(),
    })
    const respuesta = await cambiar(tokenAcceso, {
      contrasenaNueva: "contrasena-nueva-1234",
      cookie: revocada.token,
    })
    expect(respuesta.statusCode).toBe(401)
    expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe("SESION_INVALIDA")
  })

  it("con la cookie de otro usuario → 401 SESION_INVALIDA, sin tocar las sesiones ajenas", async () => {
    const { tokenAcceso } = await crearConCambioPendiente()
    const otro = await crearUsuarioDePrueba(ids)
    const sesionDeOtro = await login(otro.email, otro.contrasena)
    const cookieAjena = valorCookieRefresco(sesionDeOtro)

    const respuesta = await cambiar(tokenAcceso, {
      contrasenaNueva: "contrasena-nueva-1234",
      cookie: cookieAjena,
    })
    expect(respuesta.statusCode).toBe(401)
    expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe("SESION_INVALIDA")
    expect(await contarSesionesVivas(otro.id)).toBe(1)
  })

  it("la nueva igual a la temporal, con cookie → 400 CONTRASENA_REPETIDA", async () => {
    const { usuario, tokenAcceso, cookie } = await crearConCambioPendiente()
    const respuesta = await cambiar(tokenAcceso, { contrasenaNueva: usuario.contrasena, cookie })
    expect(respuesta.statusCode).toBe(400)
    expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe("CONTRASENA_REPETIDA")
  })

  it("un contrasenaActual en el cuerpo se ignora", async () => {
    const { tokenAcceso, cookie } = await crearConCambioPendiente()
    const respuesta = await cambiar(tokenAcceso, {
      contrasenaNueva: "contrasena-nueva-1234",
      cookie,
      extra: { contrasenaActual: "lo-que-sea" },
    })
    expect(respuesta.statusCode).toBe(204)
  })

  it("nueva corta → 400", async () => {
    const { tokenAcceso, cookie } = await crearConCambioPendiente()
    const respuesta = await cambiar(tokenAcceso, { contrasenaNueva: "corta1", cookie })
    expect(respuesta.statusCode).toBe(400)
  })

  it("5 repetidas con cookie → la 6.ª también es 429", async () => {
    const { usuario, tokenAcceso, cookie } = await crearConCambioPendiente()
    for (let intento = 0; intento < 5; intento += 1) {
      const respuesta = await cambiar(tokenAcceso, { contrasenaNueva: usuario.contrasena, cookie })
      expect(respuesta.statusCode).toBe(400)
    }
    const sexto = await cambiar(tokenAcceso, { contrasenaNueva: "contrasena-nueva-1234", cookie })
    expect(sexto.statusCode).toBe(429)
  })

  it("sin token → 401", async () => {
    const respuesta = await app.inject({
      method: "POST",
      url: "/api/auth/cambiar-contrasena",
      payload: { contrasenaNueva: "contrasena-nueva-1234" },
    })
    expect(respuesta.statusCode).toBe(401)
  })

  it("un restringido con la bandera, con su cookie → 204", async () => {
    const usuario = await crearUsuarioDePrueba(ids, {
      debeCambiarContrasena: true,
      accesoRestringido: true,
    })
    const sesion = await login(usuario.email, usuario.contrasena)
    const cookie = valorCookieRefresco(sesion)
    const { tokenAcceso } = sesion.json<{ tokenAcceso: string }>()
    const respuesta = await cambiar(tokenAcceso, {
      contrasenaNueva: "contrasena-nueva-1234",
      cookie,
    })
    expect(respuesta.statusCode).toBe(204)
  })

  it("un usuario sin la bandera responde 409 CAMBIO_NO_REQUERIDO", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await login(usuario.email, usuario.contrasena)
    const cookie = valorCookieRefresco(sesion)
    const { tokenAcceso } = sesion.json<{ tokenAcceso: string }>()
    const respuesta = await cambiar(tokenAcceso, {
      contrasenaNueva: "contrasena-nueva-1234",
      cookie,
    })
    expect(respuesta.statusCode).toBe(409)
    expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe("CAMBIO_NO_REQUERIDO")
  })
})
