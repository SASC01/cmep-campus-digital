import { describe, expect, it } from "vitest"

import { exigirVersion } from "./concurrencia.js"
import { AppError } from "./errores.js"

const conflicto = (): AppError => new AppError("CONFLICTO_DE_PRUEBA", "Otra versión.", 409)

describe("exigirVersion (PR-1A02)", () => {
  it("PR-1A02: con la misma versión no lanza ni construye el error", () => {
    let construidos = 0
    const error = (): AppError => {
      construidos += 1
      return conflicto()
    }
    expect(() => exigirVersion({ leida: 0, actual: 0 }, error)).not.toThrow()
    expect(() => exigirVersion({ leida: 7, actual: 7 }, error)).not.toThrow()
    expect(construidos).toBe(0)
  })

  it("PR-1A02: con una versión distinta lanza exactamente el error que recibe", () => {
    const propio = conflicto()
    expect(() => exigirVersion({ leida: 0, actual: 1 }, () => propio)).toThrow(propio)
    expect(() => exigirVersion({ leida: 2, actual: 1 }, conflicto)).toThrowError(
      expect.objectContaining({ codigo: "CONFLICTO_DE_PRUEBA", estado: 409 }),
    )
  })

  it("PR-1A02: no compara por tipo ni por identidad: -0 y 0 son la misma versión", () => {
    expect(() => exigirVersion({ leida: -0, actual: 0 }, conflicto)).not.toThrow()
    expect(() => exigirVersion({ leida: 0, actual: -0 }, conflicto)).not.toThrow()
  })

  it("PR-1A02: con enteros grandes compara el valor exacto", () => {
    const tope = Number.MAX_SAFE_INTEGER
    expect(() => exigirVersion({ leida: tope, actual: tope }, conflicto)).not.toThrow()
    expect(() => exigirVersion({ leida: tope - 1, actual: tope }, conflicto)).toThrowError(
      expect.objectContaining({ codigo: "CONFLICTO_DE_PRUEBA" }),
    )
    expect(() => exigirVersion({ leida: tope, actual: tope - 1 }, conflicto)).toThrowError(
      expect.objectContaining({ codigo: "CONFLICTO_DE_PRUEBA" }),
    )
  })
})
