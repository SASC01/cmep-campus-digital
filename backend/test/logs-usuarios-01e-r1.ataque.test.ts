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

// Ataque del Tester (ADMIN-01e, ronda 1; punto 6 de la verificación del manager, M-09): con
// LOG_LEVEL=trace, las salidas del log que no son "incoming request" de una petición correcta.
// Cada petición lleva en su consulta el estado de pago, el nombre y el correo de una alumna, un
// cursor y una marca propia: un JSON inválido, un 415, una ruta inexistente, un HEAD, el 400 de
// validarParametros (que tampoco debe repetir el valor en la respuesta) y el 500 del término con
// el carácter nulo (su "Error no controlado" no puede llevar la consulta). La captura es la de
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

const marca = `zl${randomBytes(5).toString("hex")}`
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
    await pedir("json inválido", {
      method: "PUT",
      url: `/api/admin/alumnos/estado-pago?${consulta}`,
      payload: `{"alumnoIds": ["${id}"], "estadoPago": "deudor"`,
      contentType: "application/json",
    })
    await pedir("415", {
      method: "PUT",
      url: `/api/admin/alumnos/${id}/acceso?${consulta}`,
      payload: `<motivo>${marca}</motivo>`,
      contentType: "application/xml",
    })
    await pedir("ruta inexistente", { method: "GET", url: `/api/admin/no-existe?${consulta}` })
    await pedir("HEAD", { method: "HEAD", url: `/api/admin/usuarios?${consulta}` })
    await pedir("limite inválido", {
      method: "GET",
      url: `/api/admin/usuarios?${consulta}&limite=${valorDeLimite}`,
    })
    await pedir("nulo", {
      method: "GET",
      url: `/api/admin/usuarios?q=${encodeURIComponent(`${marca}\u0000`)}&${consulta.replace(`q=${marca}&`, "")}`,
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

describe("ataque ADMIN-01e r1: otras salidas del log con la consulta (M-09, punto 6)", () => {
  it("ADM-T1E17: las seis peticiones llegaron con su resultado (precondición) y el log registró cada camino", () => {
    const { nulo, ...demas } = estados
    expect(demas).toEqual({
      "json inválido": 400,
      "415": 415,
      "ruta inexistente": 404,
      HEAD: 200,
      "limite inválido": 400,
    })
    // El 500 de hoy es T-01 (ADM-T1E01); con su remedio, 400. En los dos casos el log se revisa.
    expect([400, 500]).toContain(nulo)
    expect(capturado).toContain("/api/admin/alumnos/estado-pago")
    expect(capturado).toContain("/api/admin/no-existe")
    expect(capturado.match(/"msg":"incoming request"/g)?.length ?? 0).toBeGreaterThanOrEqual(6)
  })

  it("ADM-T1E18: ni el log a trace ni las respuestas llevan el estado de pago, el nombre, el correo, el cursor, la marca ni el valor rechazado", () => {
    const fugas = secretos.filter((secreto) => capturado.includes(secreto))
    expect(fugas).toEqual([])
    expect(capturado).not.toMatch(/deudor|al_corriente|estadoPago=|cursorNombre=/)
    const enRespuestas = Object.entries(cuerpos).filter(([, cuerpo]) =>
      secretos.some((secreto) => cuerpo.includes(secreto)),
    )
    expect(enRespuestas.map(([etiqueta]) => etiqueta)).toEqual([])
  })
})
