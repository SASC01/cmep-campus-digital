import { errorApiSchema, tokenAccesoRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { verificarTokenAcceso } from "../src/adapters/auth/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  contarSesionesVivas,
  crearSesionDePrueba,
  crearUsuarioDePrueba,
  desactivarUsuarioDePrueba,
  encabezadoCookieRefresco,
  iniciarSesionDePrueba,
  leerSesiones,
  NOMBRE_COOKIE,
  refrescarDePrueba,
  valorCookieRefresco,
} from "./ayudas-auth.js"

let app: FastifyInstance | undefined
const ids: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const refrescar = (cookie?: string) => refrescarDePrueba(obtenerApp(), cookie)

const logout = (cookie?: string) =>
  obtenerApp().inject({
    method: "POST",
    url: "/api/auth/logout",
    ...(cookie === undefined ? {} : { cookies: { [NOMBRE_COOKIE]: cookie } }),
  })

const esperarSesionInvalida = (respuesta: LightMyRequestResponse) => {
  expect(respuesta.statusCode).toBe(401)
  expect(errorApiSchema.parse(respuesta.json()).error.codigo).toBe("SESION_INVALIDA")
  esperarCookieLimpia(respuesta)
}

const esperarCookieLimpia = (respuesta: LightMyRequestResponse) => {
  const cookie = encabezadoCookieRefresco(respuesta)
  expect(cookie).toBeDefined()
  expect(cookie?.startsWith(`${NOMBRE_COOKIE}=;`)).toBe(true)
  expect(cookie).toContain("Max-Age=0")
  expect(cookie).toContain("Path=/api/auth")
  expect(cookie).toContain("HttpOnly")
  expect(cookie).toContain("SameSite=Strict")
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarUsuariosDePrueba(ids)
  await app?.close()
})

describe("POST /api/auth/refrescar", () => {
  it("rota la sesión: token y cookie nuevos, la vieja queda revocada y apunta a la nueva", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await iniciarSesionDePrueba(obtenerApp(), usuario)

    const respuesta = await refrescar(sesion.cookie)

    expect(respuesta.statusCode).toBe(200)
    const { tokenAcceso } = tokenAccesoRespuestaSchema.parse(respuesta.json())
    // El JWT puede coincidir byte a byte con el del login si ambos se firman en el mismo segundo
    // (mismo sub, iat y exp; S-05 no incluye jti): lo que se comprueba es que sea válido y del usuario.
    expect(await verificarTokenAcceso(tokenAcceso, { ahora: new Date() })).toEqual({
      usuarioId: usuario.id,
    })
    const cookieNueva = valorCookieRefresco(respuesta)
    expect(cookieNueva).toBeDefined()
    expect(cookieNueva).not.toBe(sesion.cookie)
    expect(encabezadoCookieRefresco(respuesta)).toContain("Max-Age=2592000")

    const sesiones = await leerSesiones(usuario.id)
    expect(sesiones).toHaveLength(2)
    const [vieja, nueva] = sesiones
    expect(vieja?.revocadaEn).not.toBeNull()
    expect(vieja?.reemplazadaPor).toBe(nueva?.id)
    expect(nueva?.revocadaEn).toBeNull()
    expect(nueva?.reemplazadaPor).toBeNull()
  })

  it("reutilizar el token rotado revoca todas las sesiones: el viejo y el nuevo dejan de servir", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await iniciarSesionDePrueba(obtenerApp(), usuario)
    const rotada = await refrescar(sesion.cookie)
    const cookieNueva = valorCookieRefresco(rotada)
    expect(cookieNueva).toBeDefined()

    esperarSesionInvalida(await refrescar(sesion.cookie))

    esperarSesionInvalida(await refrescar(cookieNueva))
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  })

  it("sin cookie responde 401 SESION_INVALIDA y limpia la cookie", async () => {
    esperarSesionInvalida(await refrescar())
  })

  it("con una cookie que no corresponde a ninguna sesión responde 401", async () => {
    esperarSesionInvalida(await refrescar("valor-inventado-que-no-existe"))
  })

  it("con una sesión vencida responde 401 y no la rota", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const vencida = await crearSesionDePrueba({
      usuarioId: usuario.id,
      expiraEn: new Date(Date.now() - 60_000),
    })

    esperarSesionInvalida(await refrescar(vencida.token))
    expect(await leerSesiones(usuario.id)).toHaveLength(1)
  })

  it("con el usuario desactivado responde 401 y revoca esa sesión", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await iniciarSesionDePrueba(obtenerApp(), usuario)
    await desactivarUsuarioDePrueba(usuario.id)

    esperarSesionInvalida(await refrescar(sesion.cookie))

    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  })

  it("dos refrescos concurrentes con el mismo token: a lo sumo uno 200 y al final ninguna sesión viva (M-06)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await iniciarSesionDePrueba(obtenerApp(), usuario)

    const [a, b] = await Promise.all([refrescar(sesion.cookie), refrescar(sesion.cookie)])

    const estados = [a.statusCode, b.statusCode].sort()
    expect([
      [200, 401],
      [401, 401],
    ]).toContainEqual(estados)
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
    // Ninguna sesión nueva huérfana: como mucho una insertada (la del ganador), y revocada.
    const sesiones = await leerSesiones(usuario.id)
    expect(sesiones.length).toBeLessThanOrEqual(2)
    expect(sesiones.every((s) => s.revocadaEn !== null)).toBe(true)
  })
})

describe("POST /api/auth/logout", () => {
  it("responde 204 sin cuerpo, limpia la cookie y revoca la sesión", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const sesion = await iniciarSesionDePrueba(obtenerApp(), usuario)

    const respuesta = await logout(sesion.cookie)

    expect(respuesta.statusCode).toBe(204)
    expect(respuesta.body).toBe("")
    esperarCookieLimpia(respuesta)
    expect(await contarSesionesVivas(usuario.id)).toBe(0)
  })

  it("sin cookie también responde 204 y limpia la cookie", async () => {
    const respuesta = await logout()

    expect(respuesta.statusCode).toBe(204)
    esperarCookieLimpia(respuesta)
  })

  it("tras logout, refrescar con esa cookie responde 401 sin revocar las demás sesiones", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const cerrada = await iniciarSesionDePrueba(obtenerApp(), usuario)
    const otra = await iniciarSesionDePrueba(obtenerApp(), usuario)
    expect((await logout(cerrada.cookie)).statusCode).toBe(204)

    esperarSesionInvalida(await refrescar(cerrada.cookie))

    expect(await contarSesionesVivas(usuario.id)).toBe(1)
    expect((await refrescar(otra.cookie)).statusCode).toBe(200)
  })
})
