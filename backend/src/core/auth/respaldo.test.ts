import { describe, expect, it } from "vitest"

import { evaluarObjetivoDeRestablecimiento } from "./respaldo.js"

describe("evaluarObjetivoDeRestablecimiento", () => {
  it("objetivo admin → 403 OPERACION_NO_PERMITIDA", () => {
    const error = evaluarObjetivoDeRestablecimiento({ rol: "admin" })
    expect(error?.codigo).toBe("OPERACION_NO_PERMITIDA")
    expect(error?.estado).toBe(403)
  })

  it("objetivo maestro → null", () => {
    expect(evaluarObjetivoDeRestablecimiento({ rol: "maestro" })).toBeNull()
  })

  it("objetivo estudiante → null", () => {
    expect(evaluarObjetivoDeRestablecimiento({ rol: "estudiante" })).toBeNull()
  })
})
