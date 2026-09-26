import { describe, expect, it } from "vitest"

import { clasificarFalloDeCorreo } from "./fallos.js"

describe("clasificarFalloDeCorreo", () => {
  it("400 → permanente", () => {
    expect(clasificarFalloDeCorreo({ estado: 400 })).toBe("permanente")
  })

  it("422 → permanente", () => {
    expect(clasificarFalloDeCorreo({ estado: 422 })).toBe("permanente")
  })

  it("403 → transitorio", () => {
    expect(clasificarFalloDeCorreo({ estado: 403 })).toBe("transitorio")
  })

  it("429 → transitorio", () => {
    expect(clasificarFalloDeCorreo({ estado: 429 })).toBe("transitorio")
  })

  it("500 → transitorio", () => {
    expect(clasificarFalloDeCorreo({ estado: 500 })).toBe("transitorio")
  })

  it("null (fallo de red) → transitorio", () => {
    expect(clasificarFalloDeCorreo({ estado: null })).toBe("transitorio")
  })
})
