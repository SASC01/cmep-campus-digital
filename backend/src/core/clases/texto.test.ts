import { describe, expect, it } from "vitest"

import { normalizarTextoLargo } from "./texto.js"

describe("normalizarTextoLargo", () => {
  it("PR-A05: convierte CRLF y CR a LF, recorta los extremos, sin tocar el interior", () => {
    const entrada = "  \r\nlínea uno\r\nlínea dos\rlínea tres\n  "
    expect(normalizarTextoLargo(entrada)).toBe("línea uno\nlínea dos\nlínea tres")
  })
})
