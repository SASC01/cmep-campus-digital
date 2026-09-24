import { randomUUID } from "node:crypto"

import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, correoDePrueba, crearUsuarioDePrueba } from "./ayudas-auth.js"

// Ataques del Tester (AUTH-01, ronda 2) contra reservarIntento (corrección de T-01): errores a mitad
// del login, aciertos con reservas en vuelo, ventana con reservas y poda con muchas llaves.

// Doble parcial de adapters/db: pasa todo al original salvo cuando la prueba pide un fallo.
const control = vi.hoisted(() => ({ fallarBusqueda: false, fallarSesion: false }))

vi.mock("../src/adapters/db/index.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/adapters/db/index.js")>()
  return {
    ...original,
    buscarCredencialesPorEmail: async (
      ...args: Parameters<typeof original.buscarCredencialesPorEmail>
    ) => {
      if (control.fallarBusqueda) throw new Error("fallo simulado de la base en la búsqueda")
      return original.buscarCredencialesPorEmail(...args)
    },
    crearSesion: async (...args: Parameters<typeof original.crearSesion>) => {
      if (control.fallarSesion) throw new Error("fallo simulado de la base al crear la sesión")
      return original.crearSesion(...args)
    },
  }
})

let app: FastifyInstance | undefined
const ids: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const nuevaIp = (): string => {
  const bytes = randomUUID().replace(/-/g, "")
  return `10.${parseInt(bytes.slice(0, 2), 16)}.${parseInt(bytes.slice(2, 4), 16)}.${parseInt(bytes.slice(4, 6), 16)}`
}

const login = (email: string, contrasena: string, ip: string): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: "POST",
    url: "/api/auth/login",
    remoteAddress: ip,
    payload: { email, contrasena },
  })

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const contar = (respuestas: readonly LightMyRequestResponse[], estado: number): number =>
  respuestas.filter((respuesta) => respuesta.statusCode === estado).length

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  control.fallarBusqueda = false
  control.fallarSesion = false
  vi.useRealTimers()
  await borrarUsuariosDePrueba(ids)
  await app?.close()
})

describe("ataque (ronda 2): reservas de intentos", () => {
  it("con 3 fallos previos, una ráfaga de 10 solo verifica 2 contraseñas más", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const ip = nuevaIp()
    for (let i = 0; i < 3; i += 1) {
      expect((await login(usuario.email, "incorrecta-xxxx", ip)).statusCode).toBe(401)
    }

    const rafaga = await Promise.all(
      Array.from({ length: 10 }, (_, i) => login(usuario.email, `incorrecta-${i}-xxxx`, ip)),
    )

    expect({ verificadas: contar(rafaga, 401), bloqueadas: contar(rafaga, 429) }).toEqual({
      verificadas: 2,
      bloqueadas: 8,
    })
  })

  it("un 429 durante el bloqueo no alarga la ventana: a los 15:01 del primer fallo se puede entrar", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const ip = nuevaIp()
    const inicio = Date.now()
    vi.useFakeTimers({ toFake: ["Date"] })
    try {
      vi.setSystemTime(inicio)
      for (let i = 0; i < 5; i += 1) await login(usuario.email, "incorrecta-xxxx", ip)
      vi.setSystemTime(inicio + 10 * 60_000)
      expect((await login(usuario.email, usuario.contrasena, ip)).statusCode).toBe(429)
      vi.setSystemTime(inicio + 14 * 60_000)
      expect((await login(usuario.email, usuario.contrasena, ip)).statusCode).toBe(429)
      vi.setSystemTime(inicio + 15 * 60_000 + 1_000)
      expect((await login(usuario.email, usuario.contrasena, ip)).statusCode).toBe(200)
    } finally {
      vi.useRealTimers()
    }
  })

  it("un error de la base a mitad del login responde 500 sin detalles, cuenta como intento y se libera al vencer la ventana", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const ip = nuevaIp()
    const inicio = Date.now()
    vi.useFakeTimers({ toFake: ["Date"] })
    try {
      vi.setSystemTime(inicio)
      control.fallarBusqueda = true
      for (let i = 0; i < 5; i += 1) {
        const respuesta = await login(usuario.email, usuario.contrasena, ip)
        expect(respuesta.statusCode).toBe(500)
        expect(codigoDe(respuesta)).toBe("ERROR_INTERNO")
        expect(respuesta.body).not.toContain("fallo simulado")
      }
      control.fallarBusqueda = false

      // Queda cerrada (fail-closed): cinco errores del servidor bloquean 15 minutos.
      expect((await login(usuario.email, usuario.contrasena, ip)).statusCode).toBe(429)
      // No queda colgada: al vencer la ventana, la llave se libera.
      vi.setSystemTime(inicio + 15 * 60_000 + 1_000)
      expect((await login(usuario.email, usuario.contrasena, ip)).statusCode).toBe(200)
    } finally {
      control.fallarBusqueda = false
      vi.useRealTimers()
    }
  })

  it("si falla la creación de la sesión tras una contraseña correcta, el siguiente intento no está bloqueado", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const ip = nuevaIp()
    for (let i = 0; i < 4; i += 1) await login(usuario.email, "incorrecta-xxxx", ip)

    control.fallarSesion = true
    try {
      expect((await login(usuario.email, usuario.contrasena, ip)).statusCode).toBe(500)
    } finally {
      control.fallarSesion = false
    }
    expect((await login(usuario.email, usuario.contrasena, ip)).statusCode).toBe(200)
  })

  it("un acierto borra la llave también para los fallos en vuelo de la misma ráfaga (DEC-06: el acierto reinicia)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const ip = nuevaIp()
    const claves = [usuario.contrasena, ...Array.from({ length: 9 }, (_, i) => `mala-${i}-xxxx`)]

    const rafaga = await Promise.all(claves.map((clave) => login(usuario.email, clave, ip)))

    expect(rafaga[0]?.statusCode).toBe(200)
    // Cinco reservas permitidas (la correcta + 4) y cinco bloqueadas: nunca más de 5 verificadas.
    expect(contar(rafaga, 401) + contar(rafaga, 200)).toBe(5)
    expect(contar(rafaga, 429)).toBe(5)
  })

  it("la poda de cada 500 escrituras no borra las reservas vigentes de otra llave", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const ip = nuevaIp()
    for (let i = 0; i < 3; i += 1) await login(usuario.email, "incorrecta-xxxx", ip)

    // 510 llaves distintas (correos inexistentes) para forzar al menos una poda.
    const relleno = await Promise.all(
      Array.from({ length: 510 }, () => login(correoDePrueba("relleno"), "x", nuevaIp())),
    )
    expect(contar(relleno, 401)).toBe(510)

    expect((await login(usuario.email, "incorrecta-xxxx", ip)).statusCode).toBe(401)
    expect((await login(usuario.email, "incorrecta-xxxx", ip)).statusCode).toBe(401)
    expect((await login(usuario.email, usuario.contrasena, ip)).statusCode).toBe(429)
  }, 120_000)
})
