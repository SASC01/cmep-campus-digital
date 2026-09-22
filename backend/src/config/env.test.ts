import { describe, expect, it } from "vitest"

import { validarEnv } from "./env.js"

const urlDePrueba = "postgresql://usuario:clave-de-prueba@127.0.0.1:5433/base?schema=public"

describe("validarEnv", () => {
  it("acepta el mínimo (DATABASE_URL) y aplica los valores por defecto", () => {
    const resultado = validarEnv({ DATABASE_URL: urlDePrueba })

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    expect(resultado.env).toEqual({
      NODE_ENV: "development",
      HOST: "127.0.0.1",
      PORT: 3000,
      LOG_LEVEL: "info",
      DATABASE_URL: urlDePrueba,
    })
  })

  it("acepta valores explícitos y convierte PORT a número", () => {
    const resultado = validarEnv({
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
    const resultado = validarEnv({})

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores).toContain("DATABASE_URL: obligatoria")
  })

  it("rechaza DATABASE_URL con un protocolo distinto de postgresql:// o postgres://", () => {
    const resultado = validarEnv({ DATABASE_URL: "mysql://usuario:clave-de-prueba@127.0.0.1/base" })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores.some((error) => error.startsWith("DATABASE_URL: "))).toBe(true)
  })

  it("rechaza PORT no numérico nombrando la variable sin repetir su valor", () => {
    const resultado = validarEnv({ DATABASE_URL: urlDePrueba, PORT: "puerto-invalido" })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores).toContain("PORT: debe ser un entero entre 1 y 65535")
    expect(resultado.errores.join("\n")).not.toContain("puerto-invalido")
  })

  it("rechaza PORT fuera de rango", () => {
    const resultado = validarEnv({ DATABASE_URL: urlDePrueba, PORT: "70000" })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores).toContain("PORT: debe ser un entero entre 1 y 65535")
  })

  it("no incluye el valor de DATABASE_URL en los mensajes de error", () => {
    const resultado = validarEnv({ DATABASE_URL: "no es una url clave-centinela" })

    expect(resultado.ok).toBe(false)
    if (resultado.ok) return

    expect(resultado.errores.join("\n")).not.toContain("clave-centinela")
    expect(resultado.errores.every((error) => error.startsWith("DATABASE_URL: "))).toBe(true)
  })
})
