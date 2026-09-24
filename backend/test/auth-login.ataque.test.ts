import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  correoDePrueba,
  crearUsuarioDePrueba,
  desactivarUsuarioDePrueba,
} from "./ayudas-auth.js"

// Ataques del Tester (AUTH-01, ronda 1) contra POST /api/auth/login: límite de intentos,
// enumeración de cuentas por mensaje o tiempo, y evasión del límite.

let app: FastifyInstance | undefined
const ids: string[] = []
let ipSiguiente = 1

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

// Cada prueba usa su propia IP para que el almacén de intentos no se cruce entre casos.
const nuevaIp = (): string => {
  ipSiguiente += 1
  return `10.66.${Math.floor(ipSiguiente / 250)}.${ipSiguiente % 250}`
}

const login = (
  email: string,
  contrasena: string,
  ip: string,
  extra: Record<string, unknown> = {},
): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: "POST",
    url: "/api/auth/login",
    remoteAddress: ip,
    payload: { email, contrasena, ...extra },
  })

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const mediana = (valores: number[]): number => {
  const ordenados = [...valores].sort((a, b) => a - b)
  const medio = Math.floor(ordenados.length / 2)
  return ordenados[medio] ?? 0
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarUsuariosDePrueba(ids)
  await app?.close()
})

describe("ataque: límite de intentos de login (5 / 15 min por IP + correo)", () => {
  it("20 intentos concurrentes con contraseña incorrecta: a lo sumo 5 llegan a verificarse (el resto 429)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const ip = nuevaIp()

    const respuestas = await Promise.all(
      Array.from({ length: 20 }, (_, i) => login(usuario.email, `incorrecta-${i}-xxxx`, ip)),
    )

    const estados = respuestas.map((respuesta) => respuesta.statusCode)
    const verificados = estados.filter((estado) => estado === 401).length
    const bloqueados = estados.filter((estado) => estado === 429).length
    expect({ verificados, bloqueados }).toEqual({ verificados: 5, bloqueados: 15 })
  })

  it("una ráfaga concurrente de 19 contraseñas incorrectas más la correcta no debe dejar entrar", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const ip = nuevaIp()

    const intentos = Array.from({ length: 19 }, (_, i) => `incorrecta-${i}-xxxx`)
    intentos.push(usuario.contrasena)
    const respuestas = await Promise.all(intentos.map((clave) => login(usuario.email, clave, ip)))

    const ultima = respuestas.at(-1)
    // Con el límite respetado, la vigésima petición llega con 5 fallos previos: 429.
    expect(ultima?.statusCode).toBe(429)
  })

  it("las variantes de mayúsculas y espacios del correo comparten la misma llave (sin evasión)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const ip = nuevaIp()
    const [local, dominio] = usuario.email.split("@")
    const variantes = [
      usuario.email.toUpperCase(),
      `  ${usuario.email}  `,
      `${local?.toUpperCase()}@${dominio}`,
      `\t${usuario.email}\n`,
      `${local}@${dominio?.toUpperCase()}`,
    ]

    for (const variante of variantes) {
      const respuesta = await login(variante, "incorrecta-xxxx", ip)
      expect(respuesta.statusCode).toBe(401)
    }

    const sexto = await login(usuario.email, usuario.contrasena, ip)
    expect(sexto.statusCode).toBe(429)
    expect(sexto.headers["retry-after"]).toBe("900")
  })

  it("la ventana es de 15 minutos exactos: a los 14:59 sigue bloqueado y a los 15:01 se puede entrar", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const ip = nuevaIp()
    const inicio = Date.now()
    vi.useFakeTimers({ toFake: ["Date"] })
    try {
      vi.setSystemTime(inicio)
      for (let i = 0; i < 5; i += 1) {
        expect((await login(usuario.email, "incorrecta-xxxx", ip)).statusCode).toBe(401)
      }
      vi.setSystemTime(inicio + 14 * 60_000 + 59_000)
      expect((await login(usuario.email, usuario.contrasena, ip)).statusCode).toBe(429)
      vi.setSystemTime(inicio + 15 * 60_000 + 1_000)
      expect((await login(usuario.email, usuario.contrasena, ip)).statusCode).toBe(200)
    } finally {
      vi.useRealTimers()
    }
  })

  it("los fallos contra un usuario inactivo también cuentan (M-07): sexto 429", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    await desactivarUsuarioDePrueba(usuario.id)
    const ip = nuevaIp()

    for (let i = 0; i < 5; i += 1) {
      const respuesta = await login(usuario.email, usuario.contrasena, ip)
      expect(respuesta.statusCode).toBe(401)
      expect(codigoDe(respuesta)).toBe("CREDENCIALES_INVALIDAS")
    }
    const sexto = await login(usuario.email, usuario.contrasena, ip)
    expect(sexto.statusCode).toBe(429)
  })

  it("el 429 es idéntico para un correo existente y uno inexistente (no revela la cuenta)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const inexistente = correoDePrueba("nadie")
    const ipA = nuevaIp()
    const ipB = nuevaIp()

    for (let i = 0; i < 5; i += 1) {
      await login(usuario.email, "incorrecta-xxxx", ipA)
      await login(inexistente, "incorrecta-xxxx", ipB)
    }
    const existente = await login(usuario.email, "incorrecta-xxxx", ipA)
    const ausente = await login(inexistente, "incorrecta-xxxx", ipB)

    expect(existente.statusCode).toBe(429)
    expect(ausente.statusCode).toBe(429)
    expect(existente.body).toBe(ausente.body)
    expect(existente.headers["retry-after"]).toBe(ausente.headers["retry-after"])
  })

  it("una contraseña de más de 128 caracteres responde igual exista o no la cuenta", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const larga = "x".repeat(129)

    const existente = await login(usuario.email, larga, nuevaIp())
    const ausente = await login(correoDePrueba("nadie"), larga, nuevaIp())

    expect(existente.statusCode).toBe(ausente.statusCode)
    expect(existente.body).toBe(ausente.body)
    expect(existente.body).not.toContain(larga)
  })

  it("una contraseña corta en login es CREDENCIALES_INVALIDAS, no VALIDACION (no revela la política)", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const respuesta = await login(usuario.email, "corta", nuevaIp())
    expect(respuesta.statusCode).toBe(401)
    expect(codigoDe(respuesta)).toBe("CREDENCIALES_INVALIDAS")
  })
})

describe("ataque: enumeración de cuentas en login", () => {
  it("inexistente, inactivo y contraseña incorrecta responden el mismo cuerpo exacto", async () => {
    const activo = await crearUsuarioDePrueba(ids)
    const inactivo = await crearUsuarioDePrueba(ids)
    await desactivarUsuarioDePrueba(inactivo.id)

    const incorrecta = await login(activo.email, "incorrecta-xxxx", nuevaIp())
    const deInactivo = await login(inactivo.email, inactivo.contrasena, nuevaIp())
    const inexistente = await login(correoDePrueba("nadie"), "incorrecta-xxxx", nuevaIp())

    expect(new Set([incorrecta.statusCode, deInactivo.statusCode, inexistente.statusCode])).toEqual(
      new Set([401]),
    )
    expect(deInactivo.body).toBe(incorrecta.body)
    expect(inexistente.body).toBe(incorrecta.body)
    // Tampoco difieren en encabezados que delaten la rama (ni cookie ni Retry-After).
    for (const respuesta of [incorrecta, deInactivo, inexistente]) {
      expect(respuesta.headers["set-cookie"]).toBeUndefined()
      expect(respuesta.headers["retry-after"]).toBeUndefined()
    }
  })

  // Robusta frente al ruido de CPU (CHORE-01, M-02) sin cambiar la aserción: mismas medianas, misma
  // tolerancia max(20 ms, 35 % de la mediana de "incorrecta"). Cambia solo cómo se toman las muestras:
  // calentamiento descartado, 24 muestras por rama en vez de 9, y el orden de las tres ramas rota por
  // las 6 permutaciones, así que ninguna rama ocupa siempre la misma posición de la ronda (con la
  // suite en paralelo, el ruido que caía siempre en la primera posición cargaba una sola serie).
  it("el tiempo de respuesta no distingue un correo inexistente de una contraseña incorrecta", async ({
    annotate,
  }) => {
    const usuario = await crearUsuarioDePrueba(ids)
    const inactivo = await crearUsuarioDePrueba(ids)
    await desactivarUsuarioDePrueba(inactivo.id)
    const inexistente = correoDePrueba("nadie")

    const medir = async (email: string, contrasena: string): Promise<number> => {
      const inicio = performance.now()
      const respuesta = await login(email, contrasena, nuevaIp())
      const duracion = performance.now() - inicio
      expect(respuesta.statusCode).toBe(401)
      return duracion
    }

    type Rama = "incorrecta" | "inexistente" | "inactivo"
    const ramas: Record<Rama, () => Promise<number>> = {
      incorrecta: () => medir(usuario.email, "incorrecta-xxxx"),
      inexistente: () => medir(inexistente, "incorrecta-xxxx"),
      inactivo: () => medir(inactivo.email, inactivo.contrasena),
    }
    const ORDENES: readonly (readonly Rama[])[] = [
      ["incorrecta", "inexistente", "inactivo"],
      ["inexistente", "inactivo", "incorrecta"],
      ["inactivo", "incorrecta", "inexistente"],
      ["incorrecta", "inactivo", "inexistente"],
      ["inexistente", "incorrecta", "inactivo"],
      ["inactivo", "inexistente", "incorrecta"],
    ]
    const medirRondas = async (rondas: number): Promise<Record<Rama, number[]>> => {
      const tiempos: Record<Rama, number[]> = { incorrecta: [], inexistente: [], inactivo: [] }
      for (let i = 0; i < rondas; i += 1) {
        for (const rama of ORDENES[i % ORDENES.length] ?? [])
          tiempos[rama].push(await ramas[rama]())
      }
      return tiempos
    }

    // Calentamiento (argon2, JIT, conexión a la base): una vuelta completa de las 6 permutaciones,
    // descartada.
    await medirRondas(ORDENES.length)
    const tiempos = await medirRondas(4 * ORDENES.length)

    const cuartil = (valores: number[], q: number): number => {
      const ordenados = [...valores].sort((a, b) => a - b)
      return ordenados[Math.floor(q * (ordenados.length - 1))] ?? 0
    }
    const describir = (rama: Rama): string =>
      `${rama}=${mediana(tiempos[rama]).toFixed(1)} [p25 ${cuartil(tiempos[rama], 0.25).toFixed(1)}, p75 ${cuartil(tiempos[rama], 0.75).toFixed(1)}]`

    const base = mediana(tiempos.incorrecta)
    const tolerancia = Math.max(20, base * 0.35)
    const resumen = `medianas ms (n=${tiempos.incorrecta.length} por rama): ${describir("incorrecta")} ${describir("inexistente")} ${describir("inactivo")} · tolerancia ${tolerancia.toFixed(1)}`
    await annotate(resumen, "tiempos")
    expect(tiempos.incorrecta).toHaveLength(24)
    expect(Math.abs(mediana(tiempos.inexistente) - base), resumen).toBeLessThan(tolerancia)
    expect(Math.abs(mediana(tiempos.inactivo) - base), resumen).toBeLessThan(tolerancia)
  }, 120_000)
})

describe("ataque: login de cuentas con banderas", () => {
  it("un alumno restringido puede iniciar sesión (RN-03) y /me refleja la restricción", async () => {
    const usuario = await crearUsuarioDePrueba(ids, {
      accesoRestringido: true,
      motivoRestriccion: "Adeudo",
    })
    const respuesta = await login(usuario.email, usuario.contrasena, nuevaIp())
    expect(respuesta.statusCode).toBe(200)
    const { tokenAcceso } = respuesta.json<{ tokenAcceso: string }>()
    const me = await obtenerApp().inject({
      method: "GET",
      url: "/api/me",
      headers: { authorization: `Bearer ${tokenAcceso}` },
    })
    expect(me.statusCode).toBe(200)
    expect(me.json()).toMatchObject({ accesoRestringido: true, motivoRestriccion: "Adeudo" })
  })

  it("una contraseña de 10 espacios es válida y distinta de la vacía", async () => {
    const usuario = await crearUsuarioDePrueba(ids, { contrasena: " ".repeat(10) })
    const ok = await login(usuario.email, " ".repeat(10), nuevaIp())
    const recortada = await login(usuario.email, " ".repeat(9), nuevaIp())
    expect(ok.statusCode).toBe(200)
    expect(recortada.statusCode).toBe(401)
  })

  it("campos extra en el login (rol, sub, usuarioId) no cambian la identidad del token", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const otro = await crearUsuarioDePrueba(ids)
    const respuesta = await login(usuario.email, usuario.contrasena, nuevaIp(), {
      rol: "admin",
      sub: otro.id,
      usuarioId: otro.id,
      id: otro.id,
    })
    expect(respuesta.statusCode).toBe(200)
    const { tokenAcceso } = respuesta.json<{ tokenAcceso: string }>()
    const me = await obtenerApp().inject({
      method: "GET",
      url: "/api/me",
      headers: { authorization: `Bearer ${tokenAcceso}` },
    })
    expect(me.json()).toMatchObject({ id: usuario.id, rol: "estudiante" })
  })
})
