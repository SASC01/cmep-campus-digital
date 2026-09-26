import { randomUUID } from "node:crypto"

import { beforeAll, describe, expect, it } from "vitest"

import {
  derivarTokenDeCuenta,
  hashTokenDeCuenta,
  inicializarAuth,
} from "../src/adapters/auth/index.js"

// Unitaria, sin base: inicializarAuth con un secreto de prueba y argon2 con los parámetros reales.
const secreto = "secreto-de-prueba-de-tokens-con-mas-de-32-caracteres"
const otroSecreto = "otro-secreto-de-prueba-con-mas-de-32-caracteres-aaa"

beforeAll(async () => {
  await inicializarAuth({
    jwtSecret: secreto,
    argon2: { memoryCost: 19456, timeCost: 2, parallelism: 1 },
  })
})

describe("derivarTokenDeCuenta", () => {
  it("el mismo id produce el mismo token", () => {
    const id = randomUUID()
    expect(derivarTokenDeCuenta(id).token).toBe(derivarTokenDeCuenta(id).token)
  })

  it("ids distintos producen tokens distintos", () => {
    expect(derivarTokenDeCuenta(randomUUID()).token).not.toBe(
      derivarTokenDeCuenta(randomUUID()).token,
    )
  })

  it("otro JWT_SECRET produce otro token para el mismo id", async () => {
    const id = randomUUID()
    const { token: tokenConSecretoActual } = derivarTokenDeCuenta(id)
    await inicializarAuth({
      jwtSecret: otroSecreto,
      argon2: { memoryCost: 19456, timeCost: 2, parallelism: 1 },
    })
    const { token: tokenConOtroSecreto } = derivarTokenDeCuenta(id)
    expect(tokenConOtroSecreto).not.toBe(tokenConSecretoActual)
    // Restaura el estado para el resto de las pruebas del archivo.
    await inicializarAuth({
      jwtSecret: secreto,
      argon2: { memoryCost: 19456, timeCost: 2, parallelism: 1 },
    })
  })

  it("hash === SHA-256(token)", () => {
    const { token, hash } = derivarTokenDeCuenta(randomUUID())
    expect(hash).toBe(hashTokenDeCuenta(token))
  })

  it("el token tiene 43 caracteres base64url", () => {
    const { token } = derivarTokenDeCuenta(randomUUID())
    expect(token).toHaveLength(43)
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })
})
