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
  describirCola,
  detenerCola,
  encolar,
  iniciarCola,
} from "../src/adapters/queue/index.js"
import { opcionesDeCola } from "../src/config/cola.js"
import { cargarEnv } from "../src/config/env.js"
import {
  COLA_CORREO_DE_CUENTA,
  COLA_CORREO_DE_CUENTA_FALLIDO,
} from "../src/core/eventos/correo-de-cuenta.js"

const log = pino({ level: "silent" })

beforeAll(async () => {
  const env = cargarEnv()
  inicializarDb({ connectionString: env.DATABASE_URL })
  await iniciarCola({ ...opcionesDeCola(env, "api"), log })
  // Cola propia de este archivo, para no interferir con los trabajos que dejen otros archivos en
  // CORREO_DE_CUENTA (V-10 solo necesita comprobar el mecanismo transaccional, no ese contenido).
  await asegurarCola("PRUEBA_COLA_TRANSACCIONAL")
})

afterAll(async () => {
  await detenerCola()
  await cerrarConexion()
})

describe("encolado transaccional (DEC-07, la compuerta del encargo)", () => {
  it("un trabajo encolado dentro de una transacción confirmada existe después", async () => {
    const id = randomUUID()
    await enTransaccion(obtenerDb(), async (tx) => {
      await encolar("PRUEBA_COLA_TRANSACCIONAL", { hola: "mundo" }, { id, sql: ejecutorSqlDe(tx) })
    })
    const trabajo = await buscarTrabajo("PRUEBA_COLA_TRANSACCIONAL", id)
    expect(trabajo).not.toBeNull()
  })

  it("una transacción que lanza después de encolar no deja el trabajo", async () => {
    const id = randomUUID()
    await expect(
      enTransaccion(obtenerDb(), async (tx) => {
        await encolar(
          "PRUEBA_COLA_TRANSACCIONAL",
          { hola: "mundo" },
          { id, sql: ejecutorSqlDe(tx) },
        )
        throw new Error("fallo deliberado tras encolar")
      }),
    ).rejects.toThrow("fallo deliberado tras encolar")
    const trabajo = await buscarTrabajo("PRUEBA_COLA_TRANSACCIONAL", id)
    expect(trabajo).toBeNull()
  })

  it("el mismo id dos veces crea un solo trabajo, sin error", async () => {
    const id = randomUUID()
    await enTransaccion(obtenerDb(), async (tx) => {
      await encolar("PRUEBA_COLA_TRANSACCIONAL", { intento: 1 }, { id, sql: ejecutorSqlDe(tx) })
    })
    await enTransaccion(obtenerDb(), async (tx) => {
      await encolar("PRUEBA_COLA_TRANSACCIONAL", { intento: 2 }, { id, sql: ejecutorSqlDe(tx) })
    })
    const trabajo = await buscarTrabajo("PRUEBA_COLA_TRANSACCIONAL", id)
    expect(trabajo).not.toBeNull()
    expect(trabajo?.datos).toEqual({ intento: 1 })
  })

  it("datos con un objeto anidado sobreviven igual", async () => {
    const id = randomUUID()
    const datos = { tipo: "recuperacion", detalle: { correo: "ana@ejemplo.mx", n: 3 } }
    await enTransaccion(obtenerDb(), async (tx) => {
      await encolar("PRUEBA_COLA_TRANSACCIONAL", datos, { id, sql: ejecutorSqlDe(tx) })
    })
    const trabajo = await buscarTrabajo("PRUEBA_COLA_TRANSACCIONAL", id)
    expect(trabajo?.datos).toEqual(datos)
  })

  it("las dos colas de correo existen con la política de DEC-06", async () => {
    const cola = await describirCola(COLA_CORREO_DE_CUENTA)
    expect(cola).not.toBeNull()
    expect(cola?.retryLimit).toBe(3)
    expect(cola?.retryBackoff).toBe(true)
    expect(cola?.deadLetter).toBe(COLA_CORREO_DE_CUENTA_FALLIDO)

    const fallidos = await describirCola(COLA_CORREO_DE_CUENTA_FALLIDO)
    expect(fallidos).not.toBeNull()
  })

  it("las dos colas tienen retentionSeconds y deleteAfterSeconds = 86400 (N-02)", async () => {
    const cola = await describirCola(COLA_CORREO_DE_CUENTA)
    expect(cola?.retentionSeconds).toBe(86_400)
    expect(cola?.deleteAfterSeconds).toBe(86_400)

    const fallidos = await describirCola(COLA_CORREO_DE_CUENTA_FALLIDO)
    expect(fallidos?.retentionSeconds).toBe(86_400)
    expect(fallidos?.deleteAfterSeconds).toBe(86_400)
  })

  it("buscarTrabajo de un id inexistente devuelve null", async () => {
    expect(await buscarTrabajo("PRUEBA_COLA_TRANSACCIONAL", randomUUID())).toBeNull()
  })

  it("encolar sin cola iniciada lanza COLA_NO_INICIALIZADA", async () => {
    await detenerCola()
    await expect(
      encolar("PRUEBA_COLA_TRANSACCIONAL", {}, { id: randomUUID() }),
    ).rejects.toMatchObject({ codigo: "COLA_NO_INICIALIZADA", estado: 500 })
    // Se restaura para el afterAll (que también llama a detenerCola, ya idempotente) y por si
    // Vitest reordenara algo: no debería, pero detenerCola/iniciarCola son ambos idempotentes.
    const env = cargarEnv()
    await iniciarCola({ ...opcionesDeCola(env, "api"), log })
  })
})
