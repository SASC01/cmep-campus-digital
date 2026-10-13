import { describe, expect, it } from "vitest"

import { promedioDeLaClase } from "./general.js"
import {
  motivosDeRiesgo,
  UMBRAL_PROMEDIO_EN_RIESGO,
  UMBRAL_VENCIDAS_SIN_ENTREGAR,
} from "./riesgo.js"

// CALIFICACIONES-01a (CAL-1A06). Alumno en riesgo (RN-05, S-04) y promedio de la clase (S-08).

describe("motivosDeRiesgo (CAL-1A06)", () => {
  it("CAL-1A06: los umbrales son 70 % y 3 vencidas", () => {
    expect(UMBRAL_PROMEDIO_EN_RIESGO).toBe(70)
    expect(UMBRAL_VENCIDAS_SIN_ENTREGAR).toBe(3)
  })

  it("CAL-1A06: 69.99 está en riesgo por promedio; 70 no; sin porcentaje, tampoco", () => {
    expect(motivosDeRiesgo({ porcentaje: 69.99, vencidasSinEntregar: 0 })).toEqual(["promedio"])
    expect(motivosDeRiesgo({ porcentaje: 70, vencidasSinEntregar: 0 })).toEqual([])
    expect(motivosDeRiesgo({ porcentaje: null, vencidasSinEntregar: 0 })).toEqual([])
  })

  it("CAL-1A06: 2 vencidas sin entregar no están en riesgo; 3 sí", () => {
    expect(motivosDeRiesgo({ porcentaje: 90, vencidasSinEntregar: 2 })).toEqual([])
    expect(motivosDeRiesgo({ porcentaje: 90, vencidasSinEntregar: 3 })).toEqual(["vencidas"])
    expect(motivosDeRiesgo({ porcentaje: null, vencidasSinEntregar: 4 })).toEqual(["vencidas"])
  })

  it("CAL-1A06: los dos motivos, en ese orden", () => {
    expect(motivosDeRiesgo({ porcentaje: 50, vencidasSinEntregar: 3 })).toEqual([
      "promedio",
      "vencidas",
    ])
  })
})

describe("promedioDeLaClase (CAL-1A06)", () => {
  it("CAL-1A06: la media ignora los nulos y se redondea a 2 decimales", () => {
    expect(promedioDeLaClase([80, null, 90])).toBe(85)
    expect(promedioDeLaClase([33.33, 33.33, 33.34])).toBe(33.33)
    // (70 + 70.01) / 2 = 70.005 → 70.01 (mitad hacia arriba).
    expect(promedioDeLaClase([70, 70.01])).toBe(70.01)
  })

  it("CAL-1A06: sin ningún porcentaje es null", () => {
    expect(promedioDeLaClase([])).toBeNull()
    expect(promedioDeLaClase([null, null])).toBeNull()
  })
})
