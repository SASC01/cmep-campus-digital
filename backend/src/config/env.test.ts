import { describe, expect, it } from "vitest"

import { JWT_SECRET_DE_EJEMPLO, validarEnv, validarEnvAdmin } from "./env.js"

const urlDePrueba = "postgresql://usuario:clave-de-prueba@127.0.0.1:5433/base?schema=public"
const secretoDePrueba = "secreto-de-prueba-con-mas-de-treinta-y-dos-caracteres"
const minimo = { DATABASE_URL: urlDePrueba, JWT_SECRET: secretoDePrueba }

describe("validarEnv", () => {
  it("acepta el mínimo (DATABASE_URL y JWT_SECRET) y aplica los valores por defecto", () => {
    const resultado = validarEnv(minimo)

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    expect(resultado.env).toEqual({
      NODE_ENV: "development",
      HOST: "127.0.0.1",
      PORT: 3000,
      LOG_LEVEL: "info",
      DATABASE_URL: urlDePrueba,
      JWT_SECRET: secretoDePrueba,
    })
  })

  it("acepta valores explícitos y convierte PORT a número", () => {
    const resultado = validarEnv({
      ...minimo,
      NODE_ENV: "test",
      HOST: "0.0.0.0",
      PORT: "8080",
      LOG_LEVEL: "debug",
      DATABASE_URL: "postgres://usuario:clave-de-prueba@127.0.0.1:5433/base",
    })

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    expect(resultado.env.PORT).toBe(8080)
    expect(resultado.env.NODE_ENV).toBe("test")
    expect(resultado.env.LOG_LEVEL).toBe("debug")
  })

  it("rechaza DATABASE_URL ausente y la nombra como obligatoria", () => {
    const resultado = validarEnv({ JWT_SECRET: secretoDePrueba })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores).toContain("DATABASE_URL: obligatoria")
  })

  it("rechaza DATABASE_URL con un protocolo distinto de postgresql:// o postgres://", () => {
    const resultado = validarEnv({
      ...minimo,
      DATABASE_URL: "mysql://usuario:clave-de-prueba@127.0.0.1/base",
    })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores.some((error) => error.startsWith("DATABASE_URL: "))).toBe(true)
  })

  it("rechaza PORT no numérico nombrando la variable sin repetir su valor", () => {
    const resultado = validarEnv({ ...minimo, PORT: "puerto-invalido" })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores).toContain("PORT: debe ser un entero entre 1 y 65535")
    expect(resultado.errores.join("\n")).not.toContain("puerto-invalido")
  })

  it("rechaza PORT fuera de rango", () => {
    const resultado = validarEnv({ ...minimo, PORT: "70000" })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores).toContain("PORT: debe ser un entero entre 1 y 65535")
  })

  it("no incluye el valor de DATABASE_URL en los mensajes de error", () => {
    const resultado = validarEnv({ ...minimo, DATABASE_URL: "no es una url clave-centinela" })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores.join("\n")).not.toContain("clave-centinela")
    expect(resultado.errores.every((error) => error.startsWith("DATABASE_URL: "))).toBe(true)
  })

  it("rechaza JWT_SECRET ausente y la nombra como obligatoria", () => {
    const resultado = validarEnv({ DATABASE_URL: urlDePrueba })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores).toContain("JWT_SECRET: obligatoria")
  })

  it("rechaza JWT_SECRET corta sin repetir su valor", () => {
    const resultado = validarEnv({ ...minimo, JWT_SECRET: "corta-centinela" })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores).toContain("JWT_SECRET: debe tener al menos 32 caracteres")
    expect(resultado.errores.join("\n")).not.toContain("corta-centinela")
  })

  it("rechaza en production el JWT_SECRET de .env.example sin mostrar el valor (DEC-17)", () => {
    const resultado = validarEnv({
      ...minimo,
      NODE_ENV: "production",
      JWT_SECRET: JWT_SECRET_DE_EJEMPLO,
    })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores).toContain(
      "JWT_SECRET: en production debe ser un secreto propio de al menos 32 caracteres, distinto del de .env.example",
    )
    expect(resultado.errores.join("\n")).not.toContain(JWT_SECRET_DE_EJEMPLO)
  })

  it("en production también rechaza el ejemplo con blancos alrededor y un secreto de solo blancos (T-08)", () => {
    for (const JWT_SECRET of [
      ` ${JWT_SECRET_DE_EJEMPLO}`,
      `${JWT_SECRET_DE_EJEMPLO}\n`,
      " ".repeat(40),
      `${" ".repeat(10)}corto-de-veinte-chars${" ".repeat(10)}`,
    ]) {
      const resultado = validarEnv({ ...minimo, NODE_ENV: "production", JWT_SECRET })

      expect(resultado.ok).toBe(false)
      if (resultado.ok) continue
      expect(resultado.errores.join("\n")).not.toContain(JWT_SECRET_DE_EJEMPLO)
    }
  })

  it("acepta en development el JWT_SECRET de .env.example", () => {
    const resultado = validarEnv({
      ...minimo,
      NODE_ENV: "development",
      JWT_SECRET: JWT_SECRET_DE_EJEMPLO,
    })

    expect(resultado.ok).toBe(true)
  })

  it("acepta en production un JWT_SECRET propio de 32 caracteres o más", () => {
    const resultado = validarEnv({
      ...minimo,
      NODE_ENV: "production",
      JWT_SECRET: "un-secreto-propio-de-produccion-de-prueba-1234567890",
    })

    expect(resultado.ok).toBe(true)
  })
})

describe("validarEnvAdmin", () => {
  it("acepta ADMIN_EMAIL, ADMIN_PASSWORD y ADMIN_NOMBRE válidos", () => {
    const resultado = validarEnvAdmin({
      ADMIN_EMAIL: "admin@campus.local",
      ADMIN_PASSWORD: "clave-de-prueba-larga",
      ADMIN_NOMBRE: "Administración CMEP",
    })

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    expect(resultado.env).toEqual({
      ADMIN_EMAIL: "admin@campus.local",
      ADMIN_PASSWORD: "clave-de-prueba-larga",
      ADMIN_NOMBRE: "Administración CMEP",
    })
  })

  it("rechaza ADMIN_PASSWORD corta sin repetir su valor", () => {
    const resultado = validarEnvAdmin({
      ADMIN_EMAIL: "admin@campus.local",
      ADMIN_PASSWORD: "corta-xyz",
      ADMIN_NOMBRE: "Administración CMEP",
    })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores).toContain("ADMIN_PASSWORD: debe tener entre 10 y 128 caracteres")
    expect(resultado.errores.join("\n")).not.toContain("corta-xyz")
  })

  it("rechaza las tres variables ausentes nombrándolas como obligatorias", () => {
    const resultado = validarEnvAdmin({})

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores).toEqual([
      "ADMIN_EMAIL: obligatoria",
      "ADMIN_PASSWORD: obligatoria",
      "ADMIN_NOMBRE: obligatoria",
    ])
  })
})
