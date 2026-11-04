import { describe, expect, it } from "vitest"

import type { RelacionConClase } from "./clases/pertenencia.js"
import { puedeMarcarDuda } from "./dudas.js"

describe("puedeMarcarDuda (P-07)", () => {
  it("CL3-B02: el maestro de la clase y el admin marcan; el estudiante nunca", () => {
    const esperado: Record<RelacionConClase, boolean> = {
      maestro: true,
      admin: true,
      estudiante: false,
    }
    for (const relacion of Object.keys(esperado) as RelacionConClase[]) {
      expect(puedeMarcarDuda(relacion), relacion).toBe(esperado[relacion])
    }
  })
})
