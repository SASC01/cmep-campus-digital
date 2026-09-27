import { describe, expect, it } from "vitest"

import { cn } from "./utils"

describe("cn", () => {
  it("conserva un tamaño de texto y un color a la vez", () => {
    expect(cn("text-small", "text-destructive")).toBe("text-small text-destructive")
  })

  it("dos tamaños de texto de la escala propia: gana el último", () => {
    expect(cn("text-h3", "text-body")).toBe("text-body")
  })

  it("dos radios de la escala propia: gana el último", () => {
    expect(cn("rounded-panel", "rounded-row")).toBe("rounded-row")
  })

  it("conserva una sombra de la escala propia y un color de texto", () => {
    expect(cn("shadow-overlay", "text-foreground")).toBe("shadow-overlay text-foreground")
  })
})
