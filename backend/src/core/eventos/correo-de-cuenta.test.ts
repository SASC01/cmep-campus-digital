import { describe, expect, it } from "vitest"

import { datosCorreoDeCuentaSchema } from "./correo-de-cuenta.js"

describe("datosCorreoDeCuentaSchema", () => {
  it("recuperación válida", () => {
    const resultado = datosCorreoDeCuentaSchema.safeParse({
      tipo: "recuperacion",
      correo: "ana@ejemplo.mx",
    })
    expect(resultado.success).toBe(true)
  })

  it("invitación válida", () => {
    const resultado = datosCorreoDeCuentaSchema.safeParse({ tipo: "invitacion" })
    expect(resultado.success).toBe(true)
  })

  it("tipo desconocido → inválido", () => {
    const resultado = datosCorreoDeCuentaSchema.safeParse({ tipo: "otro" })
    expect(resultado.success).toBe(false)
  })

  it("recuperación sin correo → inválido", () => {
    const resultado = datosCorreoDeCuentaSchema.safeParse({ tipo: "recuperacion" })
    expect(resultado.success).toBe(false)
  })
})
