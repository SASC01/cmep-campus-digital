import { normalizarTerminoDeBusqueda } from "@campus/shared"
import { describe, expect, it } from "vitest"

import { normalizarParaBusqueda } from "../auth/normalizacion.js"

import {
  enmascararCorreo,
  escaparComodinesLike,
  LONGITUD_MINIMA_BUSQUEDA,
  prepararTerminoDeBusqueda,
} from "./busqueda.js"

describe("prepararTerminoDeBusqueda", () => {
  it('PR-B01a: "José" se normaliza a "jose"', () => {
    expect(LONGITUD_MINIMA_BUSQUEDA).toBe(3)
    expect(prepararTerminoDeBusqueda("José")).toBe("jose")
    expect(prepararTerminoDeBusqueda("  PÉREZ ")).toBe("perez")
  })

  // La viñeta del plan dice '"  a  b " → null', pero normalizarParaBusqueda colapsa los espacios y
  // deja "a b" (3 caracteres), que §D-B3 y S-11 aceptan (no es menos de 3). Se prueban los dos
  // lados: lo que sí queda en menos de 3 y ese ejemplo tal cual.
  it('PR-B01b: un término que queda en menos de 3 caracteres después de normalizar → null ("  a  b " normaliza a "a b", de 3)', () => {
    expect(prepararTerminoDeBusqueda("  a  ")).toBeNull()
    expect(prepararTerminoDeBusqueda("  ab  ")).toBeNull()
    expect(prepararTerminoDeBusqueda("")).toBeNull()
    expect(prepararTerminoDeBusqueda("   ")).toBeNull()
    expect(prepararTerminoDeBusqueda("ÁÉ")).toBeNull()
    expect(prepararTerminoDeBusqueda("  a  b ")).toBe("a b")
    expect(prepararTerminoDeBusqueda("abc")).toBe("abc")
  })

  it("T-20 (ronda 1): el hangul se descompone en 3 o más caracteres al normalizar y es un término válido", () => {
    expect(prepararTerminoDeBusqueda("각")).not.toBeNull()
    expect(prepararTerminoDeBusqueda("가나")).not.toBeNull()
  })

  it("PR-B01c: escaparComodinesLike escapa %, _ y \\", () => {
    expect(escaparComodinesLike("100%")).toBe("100\\%")
    expect(escaparComodinesLike("a_b")).toBe("a\\_b")
    expect(escaparComodinesLike("a\\b")).toBe("a\\\\b")
    expect(escaparComodinesLike("%%%")).toBe("\\%\\%\\%")
    expect(escaparComodinesLike("sin comodines")).toBe("sin comodines")
  })
})

describe("enmascararCorreo", () => {
  it("PR-B01d: con 3 o más caracteres en la parte local deja los 2 primeros, ***, y el dominio", () => {
    expect(enmascararCorreo("ana.lopez@colegio.mx")).toBe("an***@colegio.mx")
    expect(enmascararCorreo("abc@x.mx")).toBe("ab***@x.mx")
  })

  it('PR-B01e: con 2 y con 1 caracteres en la parte local nunca deja ver la parte local completa ("jo@x.mx" → "j***@x.mx", "a@x.mx" → "***@x.mx")', () => {
    expect(enmascararCorreo("jo@x.mx")).toBe("j***@x.mx")
    expect(enmascararCorreo("a@x.mx")).toBe("***@x.mx")
    for (const [correo, local] of [
      ["jo@x.mx", "jo"],
      ["a@x.mx", "a"],
      ["abc@x.mx", "abc"],
    ] as const) {
      expect(enmascararCorreo(correo).startsWith(local)).toBe(false)
    }
  })

  it('PR-B01f: sin @, con la parte local vacía o con el dominio vacío → "***" sin lanzar; con dos @ separa en la última', () => {
    expect(enmascararCorreo("sinarroba")).toBe("***")
    expect(enmascararCorreo("")).toBe("***")
    expect(enmascararCorreo("@x.mx")).toBe("***")
    expect(enmascararCorreo("ana@")).toBe("***")
    expect(enmascararCorreo("@")).toBe("***")
    expect(enmascararCorreo("ana@beto@x.mx")).toBe("an***@x.mx")
  })

  it("PR-B01g: cuenta caracteres Unicode completos: un emoji o una letra fuera del plano básico no se parte a la mitad", () => {
    expect(enmascararCorreo("😀😀😀@x.mx")).toBe("😀😀***@x.mx")
    expect(enmascararCorreo("😀a@x.mx")).toBe("😀***@x.mx")
    expect(enmascararCorreo("😀@x.mx")).toBe("***@x.mx")
    expect(enmascararCorreo("𝒜𝒷𝒸@x.mx")).toBe("𝒜𝒷***@x.mx")
  })
})

describe("normalizarTerminoDeBusqueda (shared)", () => {
  it("T-24 (ronda 2): es la misma normalización que core/auth aplica a nombre_busqueda", () => {
    const muestras = [
      "José Pérez",
      "  PÉREZ  ",
      "각 가나",
      "ÁÉÍ  ÓÚ",
      "a b c",
      "😀 ñandú",
      "ǅ ǆ",
      "",
    ]
    for (const muestra of muestras) {
      expect(normalizarTerminoDeBusqueda(muestra), JSON.stringify(muestra)).toBe(
        normalizarParaBusqueda(muestra),
      )
    }
  })
})
