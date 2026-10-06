import { describe, expect, it } from "vitest"

import { decidirAsignacion, decidirRetiro } from "./maestros.js"

const A = "aaaaaaaa-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
const B = "bbbbbbbb-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
const C = "cccccccc-1c1f-4b8e-9a1e-0f2a3b4c5d6e"

describe("decidirAsignacion", () => {
  it("PR-2A03: con 0 o 1 actuales, un maestro nuevo → 'asignar'", () => {
    expect(decidirAsignacion([], A)).toBe("asignar")
    expect(decidirAsignacion([A], B)).toBe("asignar")
  })

  it("PR-2A03: el maestro ya asignado → 'ya_asignado' con 1 y con 2", () => {
    expect(decidirAsignacion([A], A)).toBe("ya_asignado")
    expect(decidirAsignacion([A, B], B)).toBe("ya_asignado")
  })

  it("PR-2A03: un maestro nuevo con 2 actuales → 409 TOPE_DE_MAESTROS", () => {
    expect(() => decidirAsignacion([A, B], C)).toThrowError(
      expect.objectContaining({ codigo: "TOPE_DE_MAESTROS", estado: 409 }),
    )
  })
})

describe("decidirRetiro", () => {
  it("PR-2A04: el único maestro → 409 CLASE_SIN_MAESTRO", () => {
    expect(() => decidirRetiro([A], A)).toThrowError(
      expect.objectContaining({ codigo: "CLASE_SIN_MAESTRO", estado: 409 }),
    )
  })

  it("PR-2A04: de dos, retirar uno deja al otro, en el orden recibido", () => {
    expect(decidirRetiro([A, B], A)).toEqual({ tipo: "retirar", restantes: [B] })
    expect(decidirRetiro([A, B], B)).toEqual({ tipo: "retirar", restantes: [A] })
  })

  it("PR-2A04: un maestro no asignado → 'no_asignado'", () => {
    expect(decidirRetiro([A, B], C)).toEqual({ tipo: "no_asignado" })
    expect(decidirRetiro([A], C)).toEqual({ tipo: "no_asignado" })
  })

  it("PR-2A04: lista vacía y maestro cualquiera → 'no_asignado' (no lanza)", () => {
    expect(decidirRetiro([], A)).toEqual({ tipo: "no_asignado" })
  })
})
