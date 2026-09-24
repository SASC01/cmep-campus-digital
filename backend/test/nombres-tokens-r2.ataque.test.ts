import { errorApiSchema, nombreSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  borrarUsuariosDePruebaPorCorreo,
  cargaDeTokenDePrueba,
  CONTRASENA_DE_PRUEBA,
  correoDePrueba,
  crearUsuarioDePrueba,
  firmarJwtDePrueba,
  firmarTokenDePrueba,
  leerUsuarioPorCorreo,
} from "./ayudas-auth.js"

// Ataques del Tester (AUTH-01, ronda 2): nombreSchema endurecido (T-03/T-04) frente a nombres
// legítimos e invisibles, y verificarTokenAcceso endurecido (T-05) frente a tokens legítimos.

let app: FastifyInstance | undefined
const ids: string[] = []
const correos: string[] = []
const env = cargarEnv()

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const registrar = (nombre: string): Promise<LightMyRequestResponse> => {
  const email = correoDePrueba("ataque")
  correos.push(email)
  return obtenerApp().inject({
    method: "POST",
    url: "/api/auth/registro",
    payload: { nombre, email, contrasena: CONTRASENA_DE_PRUEBA },
  })
}

const me = (token: string) =>
  obtenerApp().inject({
    method: "GET",
    url: "/api/me",
    headers: { authorization: `Bearer ${token}` },
  })

beforeAll(async () => {
  app = await construirApp({ env })
  await app.ready()
})

afterAll(async () => {
  await borrarUsuariosDePruebaPorCorreo(correos)
  await borrarUsuariosDePrueba(ids)
  await app?.close()
})

describe("ataque (ronda 2): nombres legítimos que no deben rechazarse", () => {
  it.each([
    "José Ángel Núñez",
    "María-José O'Connor",
    "Ana María de la Luz Güémez",
    "Ñoño Ibáñez",
    "Zoë Björk Guðmundsdóttir",
    "Nguyễn Văn An",
    "O’Brien D’Angelo",
    "Mª Guadalupe",
    "Juan Pablo II",
    "山田 太郎",
    "王伟",
    "김민준",
    "محمد علي",
    "अनुष्का शर्मा",
    "Jose\u0301 Nu\u0301n\u0303ez",
    "Ana\u00A0López",
  ])("acepta %j", (nombre) => {
    const resultado = nombreSchema.safeParse(nombre)
    expect(resultado.success, JSON.stringify(resultado.error?.issues)).toBe(true)
  })

  it("por HTTP: un nombre con acentos descompuestos (NFD, como lo envía macOS) se guarda y se busca normalizado", async () => {
    const respuesta = await registrar("Jose\u0301 A\u0301ngel")
    expect(respuesta.statusCode).toBe(201)
    const fila = await leerUsuarioPorCorreo(correos.at(-1) ?? "")
    expect(fila?.nombreBusqueda).toBe("jose angel")
  })
})

describe("ataque (ronda 2): nombres que se ven vacíos", () => {
  it.each([
    ["relleno hangul U+3164", "\u3164\u3164\u3164"],
    ["relleno hangul de ancho medio U+FFA0", "\uFFA0\uFFA0"],
    ["rellenos choseong/jungseong U+115F U+1160", "\u115F\u1160\u115F"],
    ["braille en blanco U+2800", "\u2800\u2800\u2800"],
  ])("rechaza un nombre hecho solo de %s (sigue siendo invisible, T-04)", async (_, nombre) => {
    const respuesta = await registrar(nombre)
    expect(respuesta.statusCode).toBe(400)
    expect(errorApiSchema.parse(respuesta.json()).error.codigo).toBe("VALIDACION")
  })
})

describe("ataque (ronda 2): tokens legítimos tras endurecer la verificación (T-05)", () => {
  it("50 tokens recién firmados, en segundos distintos y en el borde del segundo, se aceptan todos", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const estados: number[] = []
    for (let i = 0; i < 50; i += 1) {
      // Firmado con milisegundos .999 del segundo actual: iat se trunca hacia abajo.
      const ahora = new Date(Math.floor(Date.now() / 1000) * 1000 + 999)
      const firmadoAhora = await firmarTokenDePrueba({ usuarioId: usuario.id })
      const firmadoAlFinalDelSegundo = await firmarTokenDePrueba({
        usuarioId: usuario.id,
        ahora: new Date(Math.min(ahora.getTime(), Date.now())),
      })
      estados.push(
        (await me(firmadoAhora)).statusCode,
        (await me(firmadoAlFinalDelSegundo)).statusCode,
      )
      if (i % 10 === 0) await new Promise((resolver) => setTimeout(resolver, 230))
    }
    expect(new Set(estados)).toEqual(new Set([200]))
  })

  it("un token emitido por el login y usado de inmediato se acepta (flujo real)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    for (let i = 0; i < 10; i += 1) {
      const respuesta = await obtenerApp().inject({
        method: "POST",
        url: "/api/auth/login",
        remoteAddress: `10.77.0.${i + 1}`,
        payload: { email: usuario.email, contrasena: usuario.contrasena },
      })
      const { tokenAcceso } = respuesta.json<{ tokenAcceso: string }>()
      expect((await me(tokenAcceso)).statusCode).toBe(200)
    }
  })

  it("frontera de vigencia: iat hace 899 s → 200; iat hace 900 s → 401", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const hace = (segundos: number) =>
      firmarTokenDePrueba({ usuarioId: usuario.id, ahora: new Date(Date.now() - segundos * 1000) })
    expect((await me(await hace(899))).statusCode).toBe(200)
    expect((await me(await hace(900))).statusCode).toBe(401)
  })

  it("un iat en el futuro (2 s o 1 h) se rechaza aunque exp − iat = 900", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    for (const segundos of [2, 3600]) {
      const carga = cargaDeTokenDePrueba({
        usuarioId: usuario.id,
        ahora: new Date(Date.now() + segundos * 1000),
      })
      const token = firmarJwtDePrueba({ payload: carga, secreto: env.JWT_SECRET })
      expect((await me(token)).statusCode).toBe(401)
    }
  })

  it("claims con tipos raros (exp o iat como texto, exp < iat) se rechazan", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const base = cargaDeTokenDePrueba({ usuarioId: usuario.id, ahora: new Date() })
    const variantes = [
      { ...base, exp: String(base.exp) },
      { ...base, iat: String(base.iat) },
      { ...base, exp: Number(base.iat) - 1 },
      { ...base, iat: null },
    ]
    for (const carga of variantes) {
      const token = firmarJwtDePrueba({ payload: carga, secreto: env.JWT_SECRET })
      expect((await me(token)).statusCode, JSON.stringify(carga)).toBe(401)
    }
  })
})
