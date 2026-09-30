import { describe, expect, it } from "vitest"

import { formatearFechaHora, formatearFechaLarga, inicialesDe } from "./format"

describe("formatearFechaHora", () => {
  it("muestra fecha y hora en la zona indicada", () => {
    const texto = formatearFechaHora("2026-09-22T14:42:06.290Z", "UTC")
    expect(texto).toContain("2026")
    expect(texto).toContain("14:42")
  })
})

describe("formatearFechaLarga", () => {
  it("PR-A27: da 'martes 29 de septiembre' en la zona indicada", () => {
    const fecha = new Date("2026-09-29T14:00:00.000Z")
    expect(formatearFechaLarga(fecha, "UTC")).toBe("martes 29 de septiembre")
  })
})

describe("inicialesDe", () => {
  it.each([
    ["Ana López", "AL"],
    ["Andrea López García", "AL"],
    ["Administración", "A"],
    ["  ángel   ruiz ", "ÁR"],
  ])("%s da %s", (nombre, esperado) => {
    expect(inicialesDe(nombre)).toBe(esperado)
  })
})
