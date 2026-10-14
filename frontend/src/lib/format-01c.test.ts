import { describe, expect, it } from "vitest"

import { formatearPorcentaje, formatearPuntos } from "./format"

// CALIFICACIONES-01c (CAL-1C11, S-15): puntos y porcentajes en es-MX, con hasta 2 decimales, sin
// ceros de relleno, sin separador de miles y con un espacio de no separación antes de "%".

const NBSP = " "

describe("formatearPuntos y formatearPorcentaje (CAL-1C11)", () => {
  it.each([
    [10, "10"],
    [0, "0"],
    [8.5, "8.5"],
    [7.78, "7.78"],
    [3.25, "3.25"],
    [1000, "1000"],
    [12.3, "12.3"],
  ])("CAL-1C11: formatearPuntos(%s) es «%s»", (n, texto) => {
    expect(formatearPuntos(n)).toBe(texto)
  })

  it("CAL-1C11: formatearPuntos no rellena con ceros ni redondea a más de 2 decimales", () => {
    expect(formatearPuntos(8.5)).not.toBe("8.50")
    expect(formatearPuntos(7.777)).toBe("7.78")
  })

  it.each([
    [87.5, `87.5${NBSP}%`],
    [100, `100${NBSP}%`],
    [0, `0${NBSP}%`],
    [69.99, `69.99${NBSP}%`],
    [1000, `1000${NBSP}%`],
  ])(
    "CAL-1C11: formatearPorcentaje(%s) es «%s», con el espacio de no separación antes del signo",
    (n, texto) => {
      expect(formatearPorcentaje(n)).toBe(texto)
      expect(formatearPorcentaje(n)).not.toContain(" %")
    },
  )
})
