import { describe, expect, it } from "vitest"

import { AppError, esAppError } from "./errores.js"

describe("AppError", () => {
  it("conserva codigo, mensaje y estado", () => {
    const error = new AppError("PRUEBA", "Mensaje de prueba", 418)

    expect(error.codigo).toBe("PRUEBA")
    expect(error.message).toBe("Mensaje de prueba")
    expect(error.estado).toBe(418)
  })

  it("usa 400 como estado por defecto", () => {
    const error = new AppError("SIN_ESTADO", "Sin estado explícito")

    expect(error.estado).toBe(400)
  })

  it("es un Error con name AppError", () => {
    const error = new AppError("PRUEBA", "Mensaje")

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe("AppError")
  })
})

describe("AppError con causa (CHORE-02)", () => {
  it("conserva la causa original en cause, sin cambiar codigo, estado ni message", () => {
    const causa = new Error("error del proveedor")
    const error = new AppError("OCUPADO", "Mensaje público", 503, { causa })

    expect(error.cause).toBe(causa)
    expect(error.codigo).toBe("OCUPADO")
    expect(error.estado).toBe(503)
    expect(error.message).toBe("Mensaje público")
  })

  it("sin opciones, cause es undefined y codigo, estado y message no cambian", () => {
    const error = new AppError("SIN_CAUSA", "Mensaje", 418)

    expect(error.cause).toBeUndefined()
    expect("cause" in error).toBe(false)
    expect(error.codigo).toBe("SIN_CAUSA")
    expect(error.estado).toBe(418)
    expect(error.message).toBe("Mensaje")
  })
})

describe("esAppError", () => {
  it("reconoce una instancia de AppError", () => {
    expect(esAppError(new AppError("PRUEBA", "Mensaje"))).toBe(true)
  })

  it("distingue un Error común", () => {
    expect(esAppError(new Error("común"))).toBe(false)
  })

  it("distingue null y valores que no son errores", () => {
    expect(esAppError(null)).toBe(false)
    expect(esAppError(undefined)).toBe(false)
    expect(esAppError({ codigo: "PRUEBA", estado: 400 })).toBe(false)
  })
})
