import { randomUUID } from "node:crypto"

import { pino } from "pino"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

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
  cancelarVarios,
  describirCola,
  detenerCola,
  encolar,
  iniciarCola,
} from "../src/adapters/queue/index.js"
import { opcionesDeCola } from "../src/config/cola.js"
import { cargarEnv } from "../src/config/env.js"
import {
  COLA_BORRAR_OBJETOS,
  COLA_BORRAR_OBJETOS_FALLIDO,
  COLA_COPIAR_OBJETOS,
  COLA_COPIAR_OBJETOS_FALLIDO,
} from "../src/core/eventos/objetos.js"

// ADMIN-01b (ADM-1B16): cancelarVarios dentro de la transacción y la opción timeout de enTransaccion.
// Usa una cola propia para cancelar (nunca la de los recordatorios reales).

const COLA = "PRUEBA_CANCELAR_VARIOS"

beforeAll(async () => {
  const env = cargarEnv()
  inicializarDb({ connectionString: env.DATABASE_URL })
  await iniciarCola({ ...opcionesDeCola(env, "api"), log: pino({ level: "silent" }) })
  await asegurarCola(COLA, { retentionSeconds: 3600, deleteAfterSeconds: 3600 })
}, 30_000)

afterAll(async () => {
  await detenerCola()
  await cerrarConexion()
})

const encolarDiferido = async (): Promise<string> => {
  const id = randomUUID()
  await enTransaccion(obtenerDb(), async (tx) => {
    await encolar(
      COLA,
      { prueba: true },
      { id, sql: ejecutorSqlDe(tx), inicio: new Date(Date.now() + 3_600_000) },
    )
  })
  return id
}

const estado = async (id: string) => (await buscarTrabajo(COLA, id))?.estado

describe("cancelarVarios y timeout (ADM-1B16)", () => {
  it("ADM-1B16: cancelarVarios cancela la lista dentro de la transacción; si la transacción se revierte, los trabajos siguen vivos; los que no están en la lista no se tocan", async () => {
    const [a, b, c] = [await encolarDiferido(), await encolarDiferido(), await encolarDiferido()]

    const revertida = await enTransaccion(obtenerDb(), async (tx) => {
      await cancelarVarios(COLA, [a, b], { sql: ejecutorSqlDe(tx) })
      throw new Error("revertir")
    }).catch((error: unknown) => error)
    expect(revertida).toBeInstanceOf(Error)
    expect([await estado(a), await estado(b), await estado(c)]).toEqual([
      "created",
      "created",
      "created",
    ])

    await enTransaccion(obtenerDb(), async (tx) => {
      await cancelarVarios(COLA, [a, b], { sql: ejecutorSqlDe(tx) })
      await cancelarVarios(COLA, [], { sql: ejecutorSqlDe(tx) })
    })
    expect([await estado(a), await estado(b), await estado(c)]).toEqual([
      "cancelled",
      "cancelled",
      "created",
    ])
  })

  it("ADM-1B16: enTransaccion con timeout lo respeta (expira con 503 SERVICIO_OCUPADO o aguanta más de 5 s) y sin él sigue en 5 s", async () => {
    const dormir = (segundos: number) => (tx: Parameters<Parameters<typeof enTransaccion>[1]>[0]) =>
      tx.$executeRaw`SELECT pg_sleep(${segundos})`

    const corta = await enTransaccion(obtenerDb(), dormir(1.5), { timeout: 500 }).catch(
      (error: unknown) => error,
    )
    expect(corta).toMatchObject({ codigo: "SERVICIO_OCUPADO", estado: 503 })

    const [larga, sinOpcion] = await Promise.all([
      enTransaccion(obtenerDb(), dormir(5.5), { timeout: 15_000 }).then(
        () => "ok",
        (error: unknown) => error,
      ),
      enTransaccion(obtenerDb(), dormir(5.5)).then(
        () => "ok",
        (error: unknown) => error,
      ),
    ])
    expect(larga).toBe("ok")
    expect(sinOpcion).toMatchObject({ codigo: "SERVICIO_OCUPADO", estado: 503 })
  }, 30_000)

  it("las colas de objetos existen con la política de los avisos y su cola de fallidos (§D-6)", async () => {
    for (const [cola, fallidos] of [
      [COLA_BORRAR_OBJETOS, COLA_BORRAR_OBJETOS_FALLIDO],
      [COLA_COPIAR_OBJETOS, COLA_COPIAR_OBJETOS_FALLIDO],
    ] as const) {
      expect(await describirCola(cola)).toEqual({
        retryLimit: 3,
        retryDelay: 30,
        retryBackoff: true,
        expireInSeconds: 300,
        deadLetter: fallidos,
        retentionSeconds: 604_800,
        deleteAfterSeconds: 604_800,
      })
      // Sin política propia de reintentos (la de pg-boss por omisión), como AVISO_FALLIDO.
      expect(await describirCola(fallidos)).toMatchObject({
        deadLetter: null,
        retentionSeconds: 604_800,
      })
    }
  })
})
