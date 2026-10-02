import { describe, expect, it } from "vitest"

import { formatearFechaHora, formatearFechaLarga, formatearTamano, inicialesDe } from "./format"

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

describe("formatearTamano", () => {
  it('PR-D14: da "820 KB" y "2.4 MB"', () => {
    expect(formatearTamano(820 * 1024)).toBe("820 KB")
    expect(formatearTamano(2.4 * 1024 * 1024)).toBe("2.4 MB")
    expect(formatearTamano(25 * 1024 * 1024)).toBe("25 MB")
    expect(formatearTamano(512)).toBe("512 B")
  })
})

describe("formatearTamano redondea antes de elegir la unidad (T-43)", () => {
  it('PR-D21: 1,048,575 y 1,048,064 bytes dan "1 MB"; 1,047,552 da "1023 KB"', () => {
    expect(formatearTamano(1_048_575)).toBe("1 MB")
    expect(formatearTamano(1_048_064)).toBe("1 MB")
    expect(formatearTamano(1_047_552)).toBe("1023 KB")
    expect(formatearTamano(1_048_576)).toBe("1 MB")
  })
})

describe("formatearTamano redondea antes de elegir la unidad en todas (T-44)", () => {
  it('PR-D21 (MB y GB): 1,073,741,823 y 1,073,689,396 bytes dan "1 GB"; 1,073,689,395 da "1023.9 MB"; 0 bytes da "0 B"', () => {
    expect(formatearTamano(1_073_741_823)).toBe("1 GB")
    expect(formatearTamano(1_073_689_396)).toBe("1 GB")
    expect(formatearTamano(1_073_689_395)).toBe("1023.9 MB")
    expect(formatearTamano(1_073_741_824)).toBe("1 GB")
    expect(formatearTamano(0)).toBe("0 B")
  })
})
