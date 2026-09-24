import { errorApiSchema, tokenAccesoRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  correoDePrueba,
  crearUsuarioDePrueba,
  encabezadoCookieRefresco,
} from "./ayudas-auth.js"

// Precondición: infra levantado y backend/.env con DATABASE_URL y JWT_SECRET. Cada caso usa su
// propio usuario: la llave del límite de intentos es IP + correo y no debe cruzarse entre casos.
let app: FastifyInstance | undefined
const ids: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const login = (email: string, contrasena: string) =>
  obtenerApp().inject({ method: "POST", url: "/api/auth/login", payload: { email, contrasena } })

const esperarCredencialesInvalidas = (respuesta: LightMyRequestResponse) => {
  expect(respuesta.statusCode).toBe(401)
  const { error } = errorApiSchema.parse(respuesta.json())
  expect(error).toEqual({
    codigo: "CREDENCIALES_INVALIDAS",
    mensaje: "Correo o contraseña incorrectos.",
  })
}

const esperarDemasiadosIntentos = (respuesta: LightMyRequestResponse) => {
  expect(respuesta.statusCode).toBe(429)
  expect(respuesta.headers["retry-after"]).toBe("900")
  const { error } = errorApiSchema.parse(respuesta.json())
  expect(error.codigo).toBe("DEMASIADOS_INTENTOS")
  expect(error.mensaje).toBe("Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.")
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarUsuariosDePrueba(ids)
  await app?.close()
})

describe("POST /api/auth/login", () => {
  it("responde 200 con tokenAcceso y la cookie de refresco; sin rol, activo ni hashes", async () => {
    const usuario = await crearUsuarioDePrueba(ids)

    const respuesta = await login(usuario.email, usuario.contrasena)

    expect(respuesta.statusCode).toBe(200)
    expect(Object.keys(tokenAccesoRespuestaSchema.parse(respuesta.json()))).toEqual(["tokenAcceso"])
    expect(respuesta.body).not.toMatch(/hash|argon2|activo|rol|estadoPago/i)
    const cookie = encabezadoCookieRefresco(respuesta)
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("SameSite=Strict")
    expect(cookie).toContain("Path=/api/auth")
    expect(cookie).toContain("Max-Age=2592000")
  })

  it("un correo inexistente responde 401 con el mismo código y mensaje que una contraseña incorrecta", async () => {
    const usuario = await crearUsuarioDePrueba(ids)

    const inexistente = await login(correoDePrueba("nadie"), "cualquier-cosa-1234")
    const incorrecta = await login(usuario.email, "contrasena-equivocada")

    esperarCredencialesInvalidas(inexistente)
    esperarCredencialesInvalidas(incorrecta)
    expect(inexistente.json()).toEqual(incorrecta.json())
  })

  it("un usuario inactivo responde el mismo 401 aunque la contraseña sea correcta", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { activo: false })

    esperarCredencialesInvalidas(await login(usuario.email, usuario.contrasena))
  })

  it("tras 5 fallos el sexto intento responde 429 aunque la contraseña sea correcta", async () => {
    const usuario = await crearUsuarioDePrueba(ids)

    for (let i = 0; i < 5; i += 1) {
      esperarCredencialesInvalidas(await login(usuario.email, "contrasena-equivocada"))
    }

    esperarDemasiadosIntentos(await login(usuario.email, usuario.contrasena))
  })

  it("el sexto intento contra un correo inexistente también responde 429 (M-07)", async () => {
    const email = correoDePrueba("inexistente")

    for (let i = 0; i < 5; i += 1) {
      esperarCredencialesInvalidas(await login(email, "contrasena-equivocada"))
    }

    esperarDemasiadosIntentos(await login(email, "contrasena-equivocada"))
  })

  it("bloquear un correo no bloquea a otro desde la misma IP", async () => {
    const bloqueado = await crearUsuarioDePrueba(ids)
    const libre = await crearUsuarioDePrueba(ids)

    for (let i = 0; i < 5; i += 1) {
      await login(bloqueado.email, "contrasena-equivocada")
    }
    esperarDemasiadosIntentos(await login(bloqueado.email, bloqueado.contrasena))

    expect((await login(libre.email, libre.contrasena)).statusCode).toBe(200)
  })

  it("un acierto reinicia el contador de fallos", async () => {
    const usuario = await crearUsuarioDePrueba(ids)

    for (let i = 0; i < 4; i += 1) {
      esperarCredencialesInvalidas(await login(usuario.email, "contrasena-equivocada"))
    }
    expect((await login(usuario.email, usuario.contrasena)).statusCode).toBe(200)

    // Sin reinicio, estos dos serían el quinto y el sexto fallo: el segundo daría 429.
    esperarCredencialesInvalidas(await login(usuario.email, "contrasena-equivocada"))
    esperarCredencialesInvalidas(await login(usuario.email, "contrasena-equivocada"))
  })

  it("acepta el correo con mayúsculas y espacios alrededor", async () => {
    const usuario = await crearUsuarioDePrueba(ids)

    const respuesta = await login(`  ${usuario.email.toUpperCase()}  `, usuario.contrasena)

    expect(respuesta.statusCode).toBe(200)
  })

  it("un cuerpo que no es un objeto JSON se rechaza con 4xx, sin 500 ni valores en el mensaje", async () => {
    const texto = await obtenerApp().inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { "content-type": "text/plain" },
      payload: "email=alguien&contrasena=algo",
    })
    const xml = await obtenerApp().inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { "content-type": "application/xml" },
      payload: "<login><email>alguien</email></login>",
    })
    const malformado = await obtenerApp().inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { "content-type": "application/json" },
      payload: "{no es json",
    })
    const sinCuerpo = await obtenerApp().inject({ method: "POST", url: "/api/auth/login" })

    // Fastify trae un parser text/plain por defecto: el cuerpo llega como texto y validarCuerpo lo
    // rechaza como VALIDACION (plan: "Content-Type no JSON → 400").
    expect(texto.statusCode).toBe(400)
    expect(errorApiSchema.parse(texto.json()).error).toEqual({
      codigo: "VALIDACION",
      mensaje: "cuerpo: debe ser un objeto JSON",
    })
    expect(texto.body).not.toContain("alguien")
    expect(xml.statusCode).toBe(415)
    expect(errorApiSchema.parse(xml.json()).error.codigo).toBe("SOLICITUD_INVALIDA")
    expect(malformado.statusCode).toBe(400)
    expect(errorApiSchema.parse(malformado.json()).error.codigo).toBe("SOLICITUD_INVALIDA")
    expect(sinCuerpo.statusCode).toBe(400)
    expect(errorApiSchema.parse(sinCuerpo.json()).error.codigo).toBe("VALIDACION")
  })
})
