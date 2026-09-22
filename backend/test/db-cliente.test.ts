import { afterAll, describe, expect, it } from "vitest"

import { cerrarConexion, inicializarDb, obtenerDb } from "../src/adapters/db/cliente.js"
import { cargarEnv } from "../src/config/env.js"
import { esAppError } from "../src/core/errores.js"

// No consulta PostgreSQL: el cliente y el pool son perezosos. Vitest aísla este archivo en su propio
// proceso, así que el módulo empieza sin inicializar.
afterAll(async () => {
  await cerrarConexion()
})

describe("adapters/db/cliente", () => {
  it("obtenerDb lanza BASE_DE_DATOS_NO_INICIALIZADA antes de inicializarDb", () => {
    try {
      obtenerDb()
    } catch (error) {
      expect(esAppError(error)).toBe(true)
      if (!esAppError(error)) return
      expect(error.codigo).toBe("BASE_DE_DATOS_NO_INICIALIZADA")
      expect(error.estado).toBe(500)
      return
    }
    expect.unreachable("obtenerDb no lanzó")
  })

  it("inicializarDb es idempotente y obtenerDb devuelve la misma instancia", () => {
    const env = cargarEnv()
    inicializarDb({ connectionString: env.DATABASE_URL })
    const primera = obtenerDb()
    inicializarDb({ connectionString: env.DATABASE_URL })
    expect(obtenerDb()).toBe(primera)
  })

  it("cerrarConexion deja el módulo sin inicializar", async () => {
    await cerrarConexion()
    expect(() => obtenerDb()).toThrowError("La base de datos no está inicializada.")
  })
})
