import { describe, expect, it } from "vitest"

import { formatearPorcentaje, formatearPuntos } from "./format"

// Ataque (CALIFICACIONES-01c, ronda 1): formatearPuntos y formatearPorcentaje. Sin fechas: no depende
// del reloj.

describe("ataque 01c r1 · formatearPuntos y formatearPorcentaje", () => {
  it.each([
    [8.5, "8.5"],
    [10, "10"],
    [7.78, "7.78"],
    [1000, "1000"],
    [1000.5, "1000.5"],
    [1234567, "1234567"],
    [0, "0"],
    [0.1 + 0.2, "0.3"],
    [8.1, "8.1"],
    [99.999, "100"],
    [0.01, "0.01"],
  ] as const)(
    "CAL-T-100: formatearPuntos(%s) es %j (punto decimal, sin separador de miles ni ceros de relleno)",
    (n, esperado) => {
      expect(formatearPuntos(n)).toBe(esperado)
    },
  )

  it.each([
    [87.5, "87.5 %"],
    [100, "100 %"],
    [0, "0 %"],
    [66.67, "66.67 %"],
  ] as const)(
    "CAL-T-100: formatearPorcentaje(%s) es %j, con un solo espacio de no separación antes de «%»",
    (n, esperado) => {
      const texto = formatearPorcentaje(n)
      expect(texto).toBe(esperado)
      expect(texto.match(/\s/gu)).toEqual([" "])
    },
  )
})
