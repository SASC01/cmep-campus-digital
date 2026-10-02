import { randomBytes } from "node:crypto"

import { codigoInvitacionSchema, LONGITUD_CODIGO_CLASE } from "@campus/shared"
import { describe, expect, it } from "vitest"

import { codigoDesdeBytes } from "./codigo.js"

// Tester, CLASES-a, ronda 1. Variantes Unicode del código de invitación (S-03: "se aceptan
// minúsculas, espacios y guiones"; PR-A02d: "rechaza ... caracteres invisibles").

describe("ataque CLASES-a r1: codigoInvitacionSchema con variantes Unicode", () => {
  it("control: minúsculas, espacios ASCII y guiones se aceptan", () => {
    expect(codigoInvitacionSchema.safeParse(" abc-defg ").success).toBe(true)
  })

  it("rechaza el carácter invisible U+FEFF (ZERO WIDTH NO-BREAK SPACE) dentro del código", () => {
    const resultado = codigoInvitacionSchema.safeParse("ABC﻿DEFG")
    expect(resultado.success, `se aceptó como ${JSON.stringify(resultado.data)}`).toBe(false)
  })

  it("rechaza letras no ASCII que toUpperCase convierte en letras del alfabeto (ß, ſ, ﬀ)", () => {
    for (const variante of ["ABCDEß", "ABCDEFſ", "ABCDEﬀ"]) {
      const resultado = codigoInvitacionSchema.safeParse(variante)
      expect(
        resultado.success,
        `${JSON.stringify(variante)} se aceptó como ${JSON.stringify(resultado.data)}`,
      ).toBe(false)
    }
  })

  it("rechaza dígitos y letras de otros sistemas o formas compatibles", () => {
    for (const variante of ["ABCDE٢٣", "ABCDEF٢", "ＡBCDEFG", "ABCDEFK", "ABCDEFı"]) {
      expect(codigoInvitacionSchema.safeParse(variante).success, JSON.stringify(variante)).toBe(
        false,
      )
    }
  })
})

describe("ataque CLASES-a r1: 10,000 códigos generados", () => {
  it("nunca contienen I, O, 0 ni 1 y siempre miden 7", () => {
    for (let i = 0; i < 10_000; i++) {
      const codigo = codigoDesdeBytes(randomBytes(LONGITUD_CODIGO_CLASE))
      expect(codigo).toMatch(/^[A-HJ-NP-Z2-9]{7}$/)
    }
  })
})
