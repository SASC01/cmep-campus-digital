import { randomBytes, randomUUID } from "node:crypto"
import fs from "node:fs"

import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { inicializarAuth } from "../src/adapters/auth/index.js"
import { cerrarConexion, inicializarDb, obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv, type Env } from "../src/config/env.js"
import { normalizarParaBusqueda } from "../src/core/auth/normalizacion.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import { idDelAdminDePrueba } from "./ayudas-clases.js"

// Ataque del Tester (ADMIN-01e, ronda 2; punto 5 de la verificación del manager, M-09 y T-01): con
// LOG_LEVEL=trace, las peticiones con el carácter nulo en q y el resto de la consulta cargada
// (estado de pago, nombre, correo, cursor y una marca) responden 400 y el log no repite nada de
// eso. El nulo se construye con String.fromCharCode. La captura es la de
// logs-usuarios-admin.integracion (descriptores 1 y 2).

const idsUsuarios: string[] = []
let capturado = ""
const writeSyncOriginal = fs.writeSync
const writeOriginal = fs.write
const stdoutOriginal = process.stdout.write.bind(process.stdout)
const stderrOriginal = process.stderr.write.bind(process.stderr)

const aTexto = (dato: unknown): string => {
  if (typeof dato === "string") return dato
  if (dato instanceof Uint8Array) return Buffer.from(dato).toString("utf8")
  return ""
}

const capturar = (): void => {
  const writeSyncCapturado = (fd: number, dato: unknown, ...resto: unknown[]): number => {
    if (fd === 1 || fd === 2) {
      const texto = aTexto(dato)
      capturado += texto
      return Buffer.byteLength(texto)
    }
    return (writeSyncOriginal as (...a: unknown[]) => number)(fd, dato, ...resto)
  }
  const writeCapturado = (fd: number, dato: unknown, ...resto: unknown[]): void => {
    const retrollamada = resto.at(-1)
    if ((fd === 1 || fd === 2) && typeof retrollamada === "function") {
      const texto = aTexto(dato)
      capturado += texto
      ;(retrollamada as (e: null, n: number) => void)(null, Buffer.byteLength(texto))
      return
    }
    ;(writeOriginal as (...a: unknown[]) => void)(fd, dato, ...resto)
  }
  Object.assign(fs, { writeSync: writeSyncCapturado, write: writeCapturado })
  process.stdout.write = ((dato: unknown) => {
    capturado += aTexto(dato)
    return true
  }) as typeof process.stdout.write
  process.stderr.write = ((dato: unknown) => {
    capturado += aTexto(dato)
    return true
  }) as typeof process.stderr.write
}

const soltar = (): void => {
  Object.assign(fs, { writeSync: writeSyncOriginal, write: writeOriginal })
  process.stdout.write = stdoutOriginal
  process.stderr.write = stderrOriginal
}

const marca = `zn${randomBytes(5).toString("hex")}`
const secretos: string[] = []
const estados: Record<string, number> = {}
const cuerpos: Record<string, string> = {}
let app: FastifyInstance | undefined

beforeAll(async () => {
  const base = cargarEnv()
  const env: Env = { ...base, LOG_LEVEL: "trace" }
  inicializarDb({ connectionString: base.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(base))
  const nombre = `${marca} Ñandú Pérez`
  const email = `${marca}-${randomUUID()}@pruebas.local`
  const { id } = await obtenerDb().usuario.create({
    data: {
      email,
      hashContrasena: "hash-que-no-debe-salir-01e-r1",
      nombre,
      nombreBusqueda: normalizarParaBusqueda(nombre),
      rol: "estudiante",
      estadoPago: "deudor",
    },
    select: { id: true },
  })
  idsUsuarios.push(id)
  const valorDeLimite = `9${marca}`
  secretos.push(nombre, email, marca, valorDeLimite, encodeURIComponent(nombre))
  const token = await firmarTokenDePrueba({ usuarioId: await idDelAdminDePrueba() })
  const consulta = new URLSearchParams({
    q: marca,
    rol: "estudiante",
    estadoPago: "deudor",
    cursor: id,
    cursorNombre: nombre,
    correo: email,
  }).toString()

  capturar()
  try {
    app = await construirApp({ env })
    await app.ready()
    const pedir = async (
      etiqueta: string,
      opciones: {
        method: "GET" | "HEAD" | "PUT"
        url: string
        payload?: string
        contentType?: string
      },
    ): Promise<LightMyRequestResponse> => {
      if (!app) throw new Error("La aplicación no se construyó")
      const r = await app.inject({
        method: opciones.method,
        url: opciones.url,
        headers: {
          authorization: `Bearer ${token}`,
          ...(opciones.contentType === undefined ? {} : { "content-type": opciones.contentType }),
        },
        ...(opciones.payload === undefined ? {} : { payload: opciones.payload }),
      })
      estados[etiqueta] = r.statusCode
      cuerpos[etiqueta] = r.body
      return r
    }
    const nuloCodificado = encodeURIComponent(String.fromCharCode(0))
    const sinQ = consulta.replace(`q=${marca}&`, "")
    await pedir("nulo al final", {
      method: "GET",
      url: `/api/admin/usuarios?q=${marca}${nuloCodificado}&${sinQ}`,
    })
    await pedir("nulo al principio", {
      method: "GET",
      url: `/api/admin/usuarios?q=${nuloCodificado}${marca}&${sinQ}`,
    })
    await pedir("nulo en HEAD", {
      method: "HEAD",
      url: `/api/admin/usuarios?q=${marca}${nuloCodificado}&${sinQ}`,
    })
    await pedir("nulo y largo", {
      method: "GET",
      url: `/api/admin/usuarios?q=${marca}${nuloCodificado}${"a".repeat(130)}&${sinQ}`,
    })
    await app.close()
    app = undefined
  } finally {
    soltar()
  }
}, 60_000)

afterAll(async () => {
  await app?.close()
  // app.close() cierra la conexión de la base: se vuelve a abrir solo para limpiar.
  inicializarDb({ connectionString: cargarEnv().DATABASE_URL })
  await borrarUsuariosDePrueba(idsUsuarios)
  await cerrarConexion()
})

describe("ataque ADMIN-01e r2: el 400 del nulo en q en el log (punto 5)", () => {
  it("ADM-T2E07: las cuatro peticiones con el nulo responden 400 (precondición) y el log registra la ruta sin consulta", () => {
    expect(estados).toEqual({
      "nulo al final": 400,
      "nulo al principio": 400,
      "nulo en HEAD": 400,
      "nulo y largo": 400,
    })
    const urls = capturado
      .split("\n")
      .filter((linea) => linea.includes('"incoming request"'))
      .map((linea) => (JSON.parse(linea) as { req?: { url?: string } }).req?.url)
    expect(urls).toEqual([
      "/api/admin/usuarios",
      "/api/admin/usuarios",
      "/api/admin/usuarios",
      "/api/admin/usuarios",
    ])
  })

  it("ADM-T2E08: ni el log a trace ni las respuestas llevan el término, el nulo, el estado de pago, el nombre, el correo ni el cursor; ningún Error no controlado", () => {
    const fugas = secretos.filter((secreto) => capturado.includes(secreto))
    expect(fugas).toEqual([])
    expect(capturado).not.toMatch(/deudor|al_corriente|estadoPago=|cursorNombre=|%00/)
    expect(capturado).not.toContain("\\u0000")
    expect(capturado).not.toContain(String.fromCharCode(0))
    expect(capturado).not.toContain("Error no controlado")
    const enRespuestas = Object.entries(cuerpos).filter(
      ([, cuerpo]) =>
        secretos.some((secreto) => cuerpo.includes(secreto)) || cuerpo.includes("\\u0000"),
    )
    expect(enRespuestas.map(([etiqueta]) => etiqueta)).toEqual([])
  })
})
