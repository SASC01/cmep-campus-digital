import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { procesarCorreoDeCuenta } from "../src/workers/correo-de-cuenta.js"
import {
  borrarUsuariosDePruebaPorCorreo,
  consultarMe,
  correoDePrueba,
  crearUsuarioDePrueba,
  borrarUsuariosDePrueba,
} from "./ayudas-auth.js"
import { leerTokens, pedirComoAdmin, tokenDelEnlace } from "./ayudas-cuentas.js"
import { crearNotifierEnMemoria } from "./notifier-en-memoria.js"

// Ataque del Tester (AUTH-03a, ronda 2): regresión del recorrido de invitación de AUTH-02
// (RF-04a) con el código de 03a. La corrección de T-01 reemplazó el contenido anterior de
// invitacion.integracion.test.ts, así que sus casos de POST /admin/maestros y del recorrido
// completo ya no existen como pruebas normales (T-02). Aquí se vuelve a recorrer de punta a punta
// con /auth/invitacion y el nombre corregido de 03a en medio.

let app: FastifyInstance | undefined
const correos: string[] = []
const ids: string[] = []
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  const email = process.env.ADMIN_EMAIL ?? ""
  const contrasena = process.env.ADMIN_PASSWORD ?? ""
  if (email === "" || contrasena === "") {
    throw new Error("Precondición: setup.ts debe exponer ADMIN_EMAIL y ADMIN_PASSWORD")
  }
  tokenAdmin = (await pedirComoAdmin(app, { email, contrasena })).tokenAcceso
})

afterAll(async () => {
  await borrarUsuariosDePruebaPorCorreo(correos)
  await borrarUsuariosDePrueba(ids)
  await app?.close()
})

let contadorIp = 0
const ipPropia = (): string => {
  contadorIp += 1
  return `10.142.${Math.floor(contadorIp / 250)}.${contadorIp % 250}`
}

const post = (url: string, payload: unknown, token?: string) =>
  obtenerApp().inject({
    method: "POST",
    url,
    headers: {
      "content-type": "application/json",
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
    },
    payload: JSON.stringify(payload),
    remoteAddress: ipPropia(),
  })

const sinFecha = (respuesta: LightMyRequestResponse): Record<string, unknown> => {
  const resto: Record<string, unknown> = { ...respuesta.headers }
  delete resto.date
  return resto
}

const logSilencioso = { info: () => undefined, warn: () => undefined, error: () => undefined }

const invitar = async (nombre: string) => {
  const email = correoDePrueba("invitado-03a-r2")
  correos.push(email)
  const respuesta = await post("/api/admin/maestros", { nombre, email }, tokenAdmin)
  return { email, respuesta }
}

// El enlace del correo, como lo arma el worker con el notifier en memoria.
const enlaceDelCorreo = async (email: string): Promise<string> => {
  const usuario = await obtenerDb().usuario.findUnique({ where: { email }, select: { id: true } })
  expect(usuario, "Precondición: la invitación creó la cuenta").not.toBeNull()
  const [fila] = await leerTokens(usuario?.id ?? "")
  expect(fila, "Precondición: la invitación creó el token").toBeDefined()
  const notifier = crearNotifierEnMemoria()
  const resultado = await procesarCorreoDeCuenta(
    { id: fila?.id ?? "", datos: { tipo: "invitacion" } },
    {
      notifier,
      urlPublicaFrontend: "http://127.0.0.1:5173",
      reloj: () => new Date(),
      log: logSilencioso,
    },
  )
  expect(resultado).toBe("enviado")
  const token = tokenDelEnlace(notifier.enviados[0]?.enlace ?? "")
  expect(token, "Precondición: el correo trae /establecer-contrasena#token=").not.toBeNull()
  return token ?? ""
}

describe("ataque (AUTH-03a r2): el recorrido de invitación de AUTH-02 con el código de 03a", () => {
  it("invitar → correo → /auth/invitacion → establecer con el nombre corregido → login como maestro", async () => {
    const { email, respuesta } = await invitar("Nombre Que Puso El Admin")
    expect(respuesta.statusCode).toBe(201)
    const cuerpo = respuesta.json<Record<string, unknown>>()
    expect(cuerpo).toMatchObject({ rol: "maestro", activo: true })
    expect(respuesta.body).not.toMatch(/hash|token|estadoPago/i)

    const token = await enlaceDelCorreo(email)
    const datos = await post("/api/auth/invitacion", { token })
    expect(datos.statusCode).toBe(200)
    expect(datos.json()).toEqual({ nombre: "Nombre Que Puso El Admin" })

    const activar = await post("/api/auth/establecer-contrasena", {
      token,
      contrasena: "elegida-por-el-maestro-1",
      nombre: "Nombre Que Corrigió Él",
    })
    expect(activar.statusCode).toBe(204)

    const login = await post("/api/auth/login", { email, contrasena: "elegida-por-el-maestro-1" })
    expect(login.statusCode).toBe(200)
    const me = await consultarMe(obtenerApp(), login.json<{ tokenAcceso: string }>().tokenAcceso)
    expect(me.statusCode).toBe(200)
    expect(me.json()).toMatchObject({ rol: "maestro", nombre: "Nombre Que Corrigió Él" })

    const segundoUso = await post("/api/auth/establecer-contrasena", {
      token,
      contrasena: "otra-contrasena-12345",
      nombre: "Tercer Nombre",
    })
    const datosTrasUsar = await post("/api/auth/invitacion", { token })
    expect([segundoUso.statusCode, datosTrasUsar.statusCode]).toEqual([400, 400])
    const fila = await obtenerDb().usuario.findUnique({
      where: { email },
      select: { nombre: true },
    })
    expect(fila?.nombre).toBe("Nombre Que Corrigió Él")
  })

  it("antes de activar, el login del invitado es idéntico a una contraseña incorrecta de otra cuenta", async () => {
    const { email, respuesta } = await invitar("Invitado Sin Activar")
    expect(respuesta.statusCode).toBe(201)
    const otro = await crearUsuarioDePrueba(ids)

    const delInvitado = await post("/api/auth/login", { email, contrasena: "cualquier-cosa-1234" })
    const incorrecta = await post("/api/auth/login", {
      email: otro.email,
      contrasena: "cualquier-cosa-1234",
    })
    expect(delInvitado.statusCode).toBe(401)
    expect(delInvitado.body).toBe(incorrecta.body)
    expect(sinFecha(delInvitado)).toEqual(sinFecha(incorrecta))
  })

  it("un correo duplicado (con otra capitalización) responde 409 sin usuario ni token nuevos", async () => {
    const { email, respuesta } = await invitar("Primera Invitacion")
    expect(respuesta.statusCode).toBe(201)
    const duplicado = await post(
      "/api/admin/maestros",
      { nombre: "Segunda Invitacion", email: email.toUpperCase() },
      tokenAdmin,
    )
    expect(duplicado.statusCode).toBe(409)
    const usuarios = await obtenerDb().usuario.findMany({
      where: { email },
      select: { id: true, nombre: true },
    })
    expect(usuarios).toHaveLength(1)
    expect(usuarios[0]?.nombre).toBe("Primera Invitacion")
    expect(await leerTokens(usuarios[0]?.id ?? "")).toHaveLength(1)
  })

  it("una invitación vencida no vale ni para leer el nombre ni para establecer, con o sin nombre", async () => {
    const { email, respuesta } = await invitar("Invitacion Vencida")
    expect(respuesta.statusCode).toBe(201)
    const token = await enlaceDelCorreo(email)
    const usuario = await obtenerDb().usuario.findUnique({ where: { email }, select: { id: true } })
    await obtenerDb().tokenCuenta.updateMany({
      where: { usuarioId: usuario?.id ?? "" },
      data: { expiraEn: new Date(Date.now() - 1_000) },
    })

    const datos = await post("/api/auth/invitacion", { token })
    const conNombre = await post("/api/auth/establecer-contrasena", {
      token,
      contrasena: "tarde-para-activar-1",
      nombre: "Nombre Tardio",
    })
    const sinNombre = await post("/api/auth/establecer-contrasena", {
      token,
      contrasena: "tarde-para-activar-1",
    })
    expect([datos.statusCode, conNombre.statusCode, sinNombre.statusCode]).toEqual([400, 400, 400])
    const fila = await obtenerDb().usuario.findUnique({
      where: { email },
      select: { nombre: true },
    })
    expect(fila?.nombre).toBe("Invitacion Vencida")
    const login = await post("/api/auth/login", { email, contrasena: "tarde-para-activar-1" })
    expect(login.statusCode).toBe(401)
  })
})
