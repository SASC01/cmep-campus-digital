import { describe, expect, it } from "vitest"

import { esperaAntesDelSiguiente, INTERVALO_MINIMO_ENTRE_CORREOS_MS } from "./ritmo.js"

describe("esperaAntesDelSiguiente", () => {
  it("sin intento previo → 0", () => {
    expect(esperaAntesDelSiguiente(null, 1_000)).toBe(0)
  })

  it("justo en el intervalo → 0", () => {
    expect(esperaAntesDelSiguiente(1_000, 1_000 + INTERVALO_MINIMO_ENTRE_CORREOS_MS)).toBe(0)
  })

  it("más del intervalo transcurrido → 0", () => {
    expect(esperaAntesDelSiguiente(1_000, 1_000 + INTERVALO_MINIMO_ENTRE_CORREOS_MS + 500)).toBe(0)
  })

  it("a la mitad del intervalo → lo que falta (125 ms)", () => {
    expect(esperaAntesDelSiguiente(1_000, 1_125)).toBe(125)
  })

  it("reloj hacia atrás → nunca más del intervalo ni negativo", () => {
    expect(esperaAntesDelSiguiente(2_000, 1_000)).toBe(INTERVALO_MINIMO_ENTRE_CORREOS_MS)
    expect(esperaAntesDelSiguiente(2_000, 1_000)).toBeGreaterThanOrEqual(0)
  })
})
