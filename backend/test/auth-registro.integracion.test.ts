import { randomBytes } from "node:crypto"

import { errorApiSchema, tokenAccesoRespuestaSchema } from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { verificarTokenAcceso } from "../src/adapters/auth/index.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { crearUsuario } from "../src/adapters/db/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePruebaPorCorreo,
  correoDePrueba,
  encabezadoCookieRefresco,
  leerUsuarioPorCorreo,
  valorCookieRefresco,
} from "./ayudas-auth.js"

// Precondición: la base desechable de test/global-setup.ts.
let app: FastifyInstance | undefined
let appProduccion: FastifyInstance | undefined
const correos: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const registrar = (cuerpo: Record<string, unknown>, aplicacion = obtenerApp()) =>
  aplicacion.inject({ method: "POST", url: "/api/auth/registro", payload: cuerpo })

const datosValidos = (extra: Record<string, unknown> = {}) => {
  const email = correoDePrueba("registro")
  correos.push(email)
  return { nombre: "Ana López", email, contrasena: "clave-de-prueba-1234", ...extra }
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarUsuariosDePruebaPorCorreo(correos)
  await appProduccion?.close()
  await app?.close()
})

describe("POST /api/auth/registro", () => {
  it("responde 201 con un token verificable y la cookie de refresco con sus atributos exactos", async () => {
    const datos = datosValidos()

    const respuesta = await registrar(datos)

    expect(respuesta.statusCode).toBe(201)
    const cuerpo = tokenAccesoRespuestaSchema.parse(respuesta.json())
    const fila = await leerUsuarioPorCorreo(datos.email)
    expect(fila).not.toBeNull()
    const { usuarioId } = await verificarTokenAcceso(cuerpo.tokenAcceso, { ahora: new Date() })
    expect(usuarioId).toBe(fila?.id)

    const cookie = encabezadoCookieRefresco(respuesta)
    expect(cookie).toBeDefined()
    expect(cookie).toContain("Max-Age=2592000")
    expect(cookie).toContain("Path=/api/auth")
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("SameSite=Strict")
    expect(cookie).not.toContain("Secure")
    expect(valorCookieRefresco(respuesta)?.length).toBeGreaterThanOrEqual(40)
  })

  it("rechaza con 409 CORREO_EN_USO el mismo correo con mayúsculas y espacios", async () => {
    const datos = datosValidos()
    expect((await registrar(datos)).statusCode).toBe(201)

    const duplicado = await registrar({ ...datos, email: `  ${datos.email.toUpperCase()}  ` })

    expect(duplicado.statusCode).toBe(409)
    expect(errorApiSchema.parse(duplicado.json()).error.codigo).toBe("CORREO_EN_USO")
  })

  it("rechaza con 400 VALIDACION una contraseña de 9 caracteres, sin repetirla", async () => {
    const respuesta = await registrar(datosValidos({ contrasena: "solo-nuev" }))

    expect(respuesta.statusCode).toBe(400)
    const { error } = errorApiSchema.parse(respuesta.json())
    expect(error.codigo).toBe("VALIDACION")
    expect(error.mensaje).toBe("contrasena: La contraseña debe tener al menos 10 caracteres")
    expect(respuesta.body).not.toContain("solo-nuev")
  })

  it("rechaza con 400 VALIDACION un correo inválido", async () => {
    const respuesta = await registrar({ ...datosValidos(), email: "no-es-un-correo" })

    expect(respuesta.statusCode).toBe(400)
    const { error } = errorApiSchema.parse(respuesta.json())
    expect(error.codigo).toBe("VALIDACION")
    expect(error.mensaje).toBe("email: Escribe un correo válido")
  })

  it("rechaza con 400 VALIDACION un nombre de un carácter", async () => {
    const respuesta = await registrar(datosValidos({ nombre: "A" }))

    expect(respuesta.statusCode).toBe(400)
    const { error } = errorApiSchema.parse(respuesta.json())
    expect(error.codigo).toBe("VALIDACION")
    expect(error.mensaje).toBe("nombre: Escribe tu nombre completo")
  })

  it("ignora rol, estadoPago, accesoRestringido, activo y debeCambiarContrasena del cuerpo", async () => {
    const datos = datosValidos({
      rol: "admin",
      estadoPago: "deudor",
      accesoRestringido: true,
      activo: false,
      debeCambiarContrasena: true,
    })

    const respuesta = await registrar(datos)

    expect(respuesta.statusCode).toBe(201)
    const fila = await leerUsuarioPorCorreo(datos.email)
    expect(fila).toMatchObject({
      rol: "estudiante",
      estadoPago: "al_corriente",
      accesoRestringido: false,
      activo: true,
      debeCambiarContrasena: false,
    })
  })

  it("guarda el nombre colapsado y nombre_busqueda normalizado, y el correo en minúsculas", async () => {
    const email = correoDePrueba("registro")
    correos.push(email)

    const respuesta = await registrar({
      nombre: "  José Ángel  Núñez ",
      email: ` ${email.toUpperCase()} `,
      contrasena: "clave-de-prueba-1234",
    })

    expect(respuesta.statusCode).toBe(201)
    const fila = await leerUsuarioPorCorreo(email)
    expect(fila?.nombre).toBe("José Ángel Núñez")
    expect(fila?.nombreBusqueda).toBe("jose angel nunez")
    expect(fila?.email).toBe(email)
  })

  it("el cuerpo de la respuesta solo trae tokenAcceso: sin hashes, ids de sesión ni estado de pago", async () => {
    const respuesta = await registrar(datosValidos())

    expect(respuesta.statusCode).toBe(201)
    expect(Object.keys(respuesta.json<Record<string, unknown>>())).toEqual(["tokenAcceso"])
    expect(respuesta.body).not.toMatch(/hash|argon2|sesion|estadoPago|estado_pago/i)
  })

  it("adapters/db traduce el 22021 de PostgreSQL (carácter nulo) a 400 VALIDACION, no a un 500 (T-03)", async () => {
    // Por debajo del esquema de shared/, que ya rechaza el nulo: el insert falla y no deja filas.
    await expect(
      obtenerDb().$transaction(async (tx) => {
        await crearUsuario(
          {
            nombre: "Ana\u0000López",
            nombreBusqueda: "ana lopez",
            email: correoDePrueba("registro"),
            hashContrasena: "no-es-un-hash",
            rol: "estudiante",
          },
          tx,
        )
      }),
    ).rejects.toMatchObject({ codigo: "VALIDACION", estado: 400 })
  })

  it("con NODE_ENV=production la cookie de refresco lleva Secure (V-16)", async () => {
    const env = cargarEnv()
    appProduccion = await construirApp({
      env: {
        ...env,
        NODE_ENV: "production",
        JWT_SECRET: randomBytes(48).toString("base64url"),
      },
    })
    await appProduccion.ready()

    const respuesta = await registrar(datosValidos(), appProduccion)

    expect(respuesta.statusCode).toBe(201)
    const cookie = encabezadoCookieRefresco(respuesta)
    expect(cookie).toContain("Secure")
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("SameSite=Strict")
    expect(cookie).toContain("Path=/api/auth")
  })
})
