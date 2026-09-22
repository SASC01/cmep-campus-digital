import { describe, expect, it } from "vitest"

import { formatearFechaHora } from "./format"

describe("formatearFechaHora", () => {
  it("muestra fecha y hora en la zona indicada", () => {
    const texto = formatearFechaHora("2026-09-22T14:42:06.290Z", "UTC")
    expect(texto).toContain("2026")
    expect(texto).toContain("14:42")
  })
})
