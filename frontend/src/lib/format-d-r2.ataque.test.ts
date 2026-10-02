import { describe, expect, it } from "vitest"

import { formatearTamano } from "./format"

// Ataque del Tester (CLASES-d, ronda 2; punto 7 de la lista del manager): T-43 por la razón
// correcta y los bordes de cada cambio de unidad. El mismo defecto de "1024 KB" no debe reaparecer
// un escalón más arriba como "1024 MB".

const MB = 1024 * 1024

describe("ataque d-r2: formatearTamano en todos los bordes", () => {
  it.each([
    [0, "0 B"],
    [1, "1 B"],
    [1023, "1023 B"],
    [1024, "1 KB"],
    [1_048_063, "1023 KB"],
    [1_048_064, "1 MB"],
    [1_048_575, "1 MB"],
    [MB, "1 MB"],
    [25 * MB, "25 MB"],
    [25 * MB + 1, "25 MB"],
  ])("%i bytes → %s", (bytes, esperado) => {
    expect(formatearTamano(bytes)).toBe(esperado)
  })

  it("1,073,741,823 bytes (un byte menos que 1 GB) no se muestra como «1024 MB»", () => {
    expect(formatearTamano(1_073_741_823)).not.toBe("1024 MB")
  })
})
