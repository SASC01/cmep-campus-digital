import { randomUUID } from "node:crypto"

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
import {
  asegurarCola,
  buscarTrabajo,
  detenerCola,
  encolar,
  iniciarCola,
} from "../src/adapters/queue/index.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { opcionesDeCola } from "../src/config/cola.js"
import { cargarEnv } from "../src/config/env.js"
import { registrarConsumidores } from "../src/workers/index.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from "./ayudas-auth.js"
import { crearNotifierEnMemoria } from "./notifier-en-memoria.js"

const ids: string[] = []
const urlPublicaFrontend = "http://127.0.0.1:5173"
const log = pino({ level: "silent" })

const COLA = "PRUEBA_WORKER_CONSUMIDOR"
const COLA_FALLIDOS = "PRUEBA_WORKER_CONSUMIDOR_FALLIDO"

const logsDeError: unknown[] = []
const logCapturaErrores = {
  info: () => undefined,
  warn: () => undefined,
  error: (obj: unknown) => logsDeError.push(obj),
}

// Un único notifier compartido: los tres casos configuran su comportamiento de un solo uso antes
// de encolar y esperan a que se resuelva, así que un solo consumidor registrado en beforeAll basta
// (registrar más de uno sobre la misma cola competiría por los mismos trabajos, sin garantía de
// cuál doble atiende cada uno).
const notifier = crearNotifierEnMemoria()

const esperarHasta = async (
  condicion: () => Promise<boolean>,
  limiteMs = 20_000,
): Promise<void> => {
  const limite = Date.now() + limiteMs
  while (Date.now() < limite) {
    if (await condicion()) return
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error("esperarHasta agotó el tiempo límite")
}

beforeAll(async () => {
  const env = cargarEnv()
  inicializarDb({ connectionString: env.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(env))
  await iniciarCola({ ...opcionesDeCola(env, "worker"), log })
  await asegurarCola(COLA_FALLIDOS, { retentionSeconds: 3600, deleteAfterSeconds: 3600 })
  await asegurarCola(COLA, {
    retryLimit: 1,
    retryDelay: 1,
    retryBackoff: false,
    expireInSeconds: 30,
    deadLetter: COLA_FALLIDOS,
    retentionSeconds: 3600,
    deleteAfterSeconds: 3600,
  })
  await registrarConsumidores(
    { notifier, urlPublicaFrontend, reloj: () => new Date(), log: logCapturaErrores },
    { correoDeCuenta: COLA, fallidos: COLA_FALLIDOS },
  )
}, 30_000)

afterAll(async () => {
  await borrarUsuariosDePrueba(ids)
  await detenerCola()
  await cerrarConexion()
})

const encolarEnColaDePrueba = async (correo: string): Promise<string> => {
  const id = randomUUID()
  await enTransaccion(obtenerDb(), async (tx) => {
    await encolar(COLA, { tipo: "recuperacion", correo }, { id, sql: ejecutorSqlDe(tx) })
  })
  return id
}

// Un trabajo dead-lettered nace con un id propio; pg-boss guarda el id original en source_id
// (plans.js: insertDeadLetterJob). buscarTrabajo no lo encuentra por id, así que esta consulta,
// solo de pruebas, busca por source_id.
const existeEnColaDeFallidosPorOrigen = async (idOriginal: string): Promise<boolean> => {
  const filas = await obtenerDb().$queryRaw<{ id: string }[]>`
    SELECT id FROM pgboss.job WHERE name = ${COLA_FALLIDOS} AND source_id = ${idOriginal}::uuid
  `
  return filas.length > 0
}

describe("registrarConsumidores (colas propias)", () => {
  it("procesa un trabajo y queda completado con el correo en el doble", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    const id = await encolarEnColaDePrueba(usuario.email)

    await esperarHasta(async () => (await buscarTrabajo(COLA, id))?.estado === "completed")
    expect(notifier.enviados.some((correo) => correo.para === usuario.email)).toBe(true)
  }, 30_000)

  it("un fallo transitorio agota los reintentos, pasa a la cola de fallidos y queda el log.error", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    notifier.fallarProximo(new Error("fallo transitorio de prueba"))
    notifier.fallarProximo(new Error("fallo transitorio de prueba (reintento)"))
    const id = await encolarEnColaDePrueba(usuario.email)

    await esperarHasta(async () => existeEnColaDeFallidosPorOrigen(id))
    await esperarHasta(async () =>
      logsDeError.some(
        (entrada) =>
          typeof entrada === "object" &&
          entrada !== null &&
          "evento" in entrada &&
          (entrada as { evento: unknown }).evento === "correo_de_cuenta_fallido",
      ),
    )
  }, 30_000)

  it("un rechazo permanente se completa sin reintento", async () => {
    const usuario = await crearUsuarioDePrueba(ids)
    notifier.rechazarProximo("422 invalid_parameter")
    const id = await encolarEnColaDePrueba(usuario.email)

    await esperarHasta(async () => (await buscarTrabajo(COLA, id))?.estado === "completed")
    expect(await existeEnColaDeFallidosPorOrigen(id)).toBe(false)
  }, 30_000)
})
