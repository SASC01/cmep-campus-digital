import { randomUUID } from "node:crypto"
import { Writable } from "node:stream"

import { pino } from "pino"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { inicializarAuth } from "../src/adapters/auth/index.js"
import {
  cerrarConexion,
  ejecutorSqlDe,
  enTransaccion,
  inicializarDb,
  obtenerDb,
} from "../src/adapters/db/cliente.js"
import { asegurarCola, detenerCola, encolar, iniciarCola } from "../src/adapters/queue/index.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { opcionesDeCola } from "../src/config/cola.js"
import { cargarEnv } from "../src/config/env.js"
import { opcionesDeLogger } from "../src/config/logger.js"
import type { Notifier } from "../src/core/correo/notifier.js"
import { registrarConsumidores } from "../src/workers/index.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from "./ayudas-auth.js"

// Ataques del Tester (AUTH-02a, ronda 2) contra la corrección de T-02: el id original llega al log
// de la cola de fallidos también cuando el trabajo se reintentó antes de fallar, y un trabajo que
// llega a la cola de fallidos sin pasar por la original conserva su propio id.

const env = cargarEnv()
const ids: string[] = []
const sufijo = randomUUID().slice(0, 8)
const COLA = `ATAQUE_R2_CORREO_${sufijo}`
const COLA_FALLIDOS = `ATAQUE_R2_CORREO_FALLIDO_${sufijo}`

const crearLogCapturado = () => {
  let salida = ""
  const destino = new Writable({
    write(trozo: Buffer, _codificacion, listo) {
      salida += trozo.toString("utf8")
      listo()
    },
  })
  const log = pino({ ...opcionesDeLogger(env), level: "trace" }, destino)
  return { log, leer: () => salida }
}

const logDelConsumidor = crearLogCapturado()
let intentosDelNotifier = 0

const notifierQueSiempreFalla: Notifier = {
  correoDeCuenta: async () => {
    intentosDelNotifier += 1
    throw new Error("fallo transitorio de ataque r2")
  },
}

const esperarHasta = async (condicion: () => boolean | Promise<boolean>, limiteMs = 40_000) => {
  const limite = Date.now() + limiteMs
  while (Date.now() < limite) {
    if (await condicion()) return true
    await new Promise((resolver) => setTimeout(resolver, 200))
  }
  return false
}

const lineasFallidas = (): Record<string, unknown>[] =>
  logDelConsumidor
    .leer()
    .split("\n")
    .filter((linea) => linea.includes('"correo_de_cuenta_fallido"'))
    .map((linea) => JSON.parse(linea) as Record<string, unknown>)

beforeAll(async () => {
  inicializarDb({ connectionString: env.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(env))
  await iniciarCola({ ...opcionesDeCola(env, "worker"), log: pino({ level: "silent" }) })
  await asegurarCola(COLA_FALLIDOS, { retentionSeconds: 3600, deleteAfterSeconds: 3600 })
  await asegurarCola(COLA, {
    retryLimit: 2,
    retryDelay: 0,
    retryBackoff: false,
    expireInSeconds: 30,
    deadLetter: COLA_FALLIDOS,
    retentionSeconds: 3600,
    deleteAfterSeconds: 3600,
  })
  await registrarConsumidores(
    {
      notifier: notifierQueSiempreFalla,
      urlPublicaFrontend: "http://127.0.0.1:5173",
      reloj: () => new Date(),
      log: logDelConsumidor.log,
    },
    { correoDeCuenta: COLA, fallidos: COLA_FALLIDOS },
  )
}, 30_000)

afterAll(async () => {
  await borrarUsuariosDePrueba(ids)
  await detenerCola()
  await cerrarConexion()
})

describe("ataque: cola de fallidos con reintentos (T-02, ronda 2)", () => {
  it("tras 2 reintentos, el log correo_de_cuenta_fallido lleva el id original, una sola vez", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const idOriginal = randomUUID()
    await enTransaccion(obtenerDb(), async (tx) => {
      await encolar(
        COLA,
        { tipo: "recuperacion", correo: usuario.email },
        { id: idOriginal, sql: ejecutorSqlDe(tx) },
      )
    })

    const llego = await esperarHasta(() => lineasFallidas().length > 0)
    expect(llego, "el trabajo debía llegar a la cola de fallidos tras sus reintentos").toBe(true)
    // Un intento inicial más dos reintentos antes de la cola de fallidos.
    expect(intentosDelNotifier).toBeGreaterThanOrEqual(3)

    const lineas = lineasFallidas()
    expect(lineas.map((linea) => linea.trabajoId)).toEqual([idOriginal])
    const token = await obtenerDb().tokenCuenta.findUnique({
      where: { id: idOriginal },
      select: { id: true },
    })
    expect(token, "el token del intento conserva el id original (DEC-06)").not.toBeNull()
  }, 60_000)

  it("un trabajo encolado directamente en la cola de fallidos se registra con su propio id", async () => {
    const antes = lineasFallidas().length
    const idDirecto = randomUUID()
    await encolar(
      COLA_FALLIDOS,
      { tipo: "recuperacion", correo: "nadie@pruebas.local" },
      {
        id: idDirecto,
      },
    )
    const llego = await esperarHasta(() => lineasFallidas().length > antes)
    expect(llego, "el consumidor de fallidos debía procesar el trabajo directo").toBe(true)
    expect(
      lineasFallidas()
        .slice(antes)
        .map((linea) => linea.trabajoId),
    ).toEqual([idDirecto])
    expect(logDelConsumidor.leer()).not.toContain("nadie@pruebas.local")
  }, 60_000)
})
