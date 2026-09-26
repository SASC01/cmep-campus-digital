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
    contrasenaActual,
    contrasenaNueva,
    cookie,
  }: { contrasenaActual: string; contrasenaNueva: string; cookie?: string },
) =>
  app.inject({
    method: "POST",
    url: "/api/auth/cambiar-contrasena",
    headers: { authorization: `Bearer ${tokenAcceso}` },
    payload: { contrasenaActual, contrasenaNueva },
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
  it("con la bandera → 204, la bandera queda en false y /me responde 200", async () => {
    const { usuario, tokenAcceso, cookie } = await crearConCambioPendiente()
    const respuesta = await cambiar(tokenAcceso, {
      contrasenaActual: usuario.contrasena,
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
    await cambiar(tokenAcceso, {
      contrasenaActual: usuario.contrasena,
      contrasenaNueva: "contrasena-nueva-1234",
      cookie,
    })
    expect(await contarSesionesVivas(usuario.id)).toBe(1)
    const sesiones = await leerSesiones(usuario.id)
    expect(sesiones.filter((sesion) => sesion.revocadaEn === null)).toHaveLength(1)
  })

  it("sin cookie revoca todas las sesiones", async () => {
    const { usuario, tokenAcceso } = await crearConCambioPendiente()
    await cambiar(tokenAcceso, {
      contrasenaActual: usuario.contrasena,
      contrasenaNueva: "contrasena-nueva-1234",
    })
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  })

  it("temporal incorrecta → 400 CONTRASENA_ACTUAL_INCORRECTA (no 401)", async () => {
    const { tokenAcceso } = await crearConCambioPendiente()
    const respuesta = await cambiar(tokenAcceso, {
      contrasenaActual: "una-contrasena-equivocada",
      contrasenaNueva: "contrasena-nueva-1234",
    })
    expect(respuesta.statusCode).toBe(400)
    expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe(
      "CONTRASENA_ACTUAL_INCORRECTA",
    )
  })

  it("nueva igual a la actual → 400 CONTRASENA_REPETIDA", async () => {
    const { usuario, tokenAcceso } = await crearConCambioPendiente()
    const respuesta = await cambiar(tokenAcceso, {
      contrasenaActual: usuario.contrasena,
      contrasenaNueva: usuario.contrasena,
    })
    expect(respuesta.statusCode).toBe(400)
    expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe("CONTRASENA_REPETIDA")
  })

  it("nueva corta → 400", async () => {
    const { usuario, tokenAcceso } = await crearConCambioPendiente()
    const respuesta = await cambiar(tokenAcceso, {
      contrasenaActual: usuario.contrasena,
      contrasenaNueva: "corta1",
    })
    expect(respuesta.statusCode).toBe(400)
  })

  it("el 6.º intento con temporal incorrecta responde 429", async () => {
    const { usuario, tokenAcceso } = await crearConCambioPendiente()
    for (let intento = 0; intento < 5; intento += 1) {
      await cambiar(tokenAcceso, {
        contrasenaActual: "mala",
        contrasenaNueva: "contrasena-nueva-1234",
      })
    }
    const sexto = await cambiar(tokenAcceso, {
      contrasenaActual: usuario.contrasena,
      contrasenaNueva: "contrasena-nueva-1234",
    })
    expect(sexto.statusCode).toBe(429)
  })

  it("sin token → 401", async () => {
    const respuesta = await app.inject({
      method: "POST",
      url: "/api/auth/cambiar-contrasena",
      payload: { contrasenaActual: "a", contrasenaNueva: "contrasena-nueva-1234" },
    })
    expect(respuesta.statusCode).toBe(401)
  })

  it("un restringido con la bandera puede cambiarla → 204", async () => {
    const usuario = await crearUsuarioDePrueba(ids, {
      debeCambiarContrasena: true,
      accesoRestringido: true,
    })
    const sesion = await login(usuario.email, usuario.contrasena)
    const { tokenAcceso } = sesion.json<{ tokenAcceso: string }>()
    const respuesta = await cambiar(tokenAcceso, {
      contrasenaActual: usuario.contrasena,
      contrasenaNueva: "contrasena-nueva-1234",
    })
    expect(respuesta.statusCode).toBe(204)
  })

  it("un usuario sin la bandera responde 409 CAMBIO_NO_REQUERIDO", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await login(usuario.email, usuario.contrasena)
    const { tokenAcceso } = sesion.json<{ tokenAcceso: string }>()
    const respuesta = await cambiar(tokenAcceso, {
      contrasenaActual: usuario.contrasena,
      contrasenaNueva: "contrasena-nueva-1234",
    })
    expect(respuesta.statusCode).toBe(409)
    expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe("CAMBIO_NO_REQUERIDO")
  })
})
