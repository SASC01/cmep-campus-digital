import { codigoInvitacionSchema } from "@campus/shared"
import { describe, expect, it } from "vitest"

// Tester, CLASES-a, ronda 2. T-04 corregido: los separadores son solo espacio, tabulador y guion
// ASCII. S-03 dice "se aceptan minúsculas, espacios y guiones": se contrasta con los espacios y los
// guiones de Unicode que un teléfono o un correo insertan al copiar o escribir el código.

const acepta = (texto: string) => codigoInvitacionSchema.safeParse(texto)

describe("ataque CLASES-a r2: regresión de T-04", () => {
  it("sigue rechazando U+FEFF, ß, ſ, ﬀ y el ancho completo, y acepta minúsculas, espacio, tabulador y guion ASCII", () => {
    for (const malo of ["ABC﻿DEFG", "ABCDEß", "ABCDEFſ", "ABCDEﬀ", "ＡBCDEFG", "ABC​DEFG"]) {
      expect(acepta(malo).success, JSON.stringify(malo)).toBe(false)
    }
    for (const bueno of ["abcdefg", "abc defg", "abc\tdefg", "abc-defg", " a-b c\td-e f g "]) {
      const r = acepta(bueno)
      expect(r.success, JSON.stringify(bueno)).toBe(true)
      expect(r.data).toBe("ABCDEFG")
    }
  })
})

describe("ataque CLASES-a r2: espacios y guiones de Unicode (S-03)", () => {
  it("acepta el código con espacio no separable (U+00A0), el que insertan correos y procesadores de texto", () => {
    const r = acepta("ABC DEFG")
    expect(r.success, "U+00A0 rechazado: S-03 acepta espacios").toBe(true)
  })

  it("acepta el código con espacio ideográfico (U+3000) y espacio fino no separable (U+202F)", () => {
    for (const espacio of ["　", " "]) {
      const r = acepta(`ABC${espacio}DEFG`)
      expect(r.success, `U+${espacio.codePointAt(0)?.toString(16).toUpperCase()} rechazado`).toBe(
        true,
      )
    }
  })

  it("acepta los guiones de Unicode U+2010 (guion) y U+2011 (guion no separable)", () => {
    for (const guion of ["‐", "‑"]) {
      const r = acepta(`ABC${guion}DEFG`)
      expect(r.success, `U+${guion.codePointAt(0)?.toString(16).toUpperCase()} rechazado`).toBe(
        true,
      )
    }
  })
})
