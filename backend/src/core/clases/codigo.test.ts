import { ALFABETO_CODIGO_CLASE, codigoInvitacionSchema } from "@campus/shared"
import { describe, expect, it } from "vitest"

import { codigoDesdeBytes } from "./codigo.js"

describe("codigoDesdeBytes", () => {
  it("PR-A01a: da 7 caracteres, todos del alfabeto", () => {
    const codigo = codigoDesdeBytes(new Uint8Array([10, 20, 30, 40, 50, 60, 70]))
    expect(codigo).toHaveLength(7)
    for (const caracter of codigo) {
      expect(ALFABETO_CODIGO_CLASE).toContain(caracter)
    }
  })

  it("PR-A01b: asociación b % 32: 0 → A, 31 → 9, 32 → A", () => {
    const codigo = codigoDesdeBytes(new Uint8Array([0, 31, 32, 0, 31, 32, 0]))
    expect(codigo).toBe("A9AA9AA")
  })

  it("PR-A01c: lanza con 6 y con 8 bytes", () => {
    expect(() => codigoDesdeBytes(new Uint8Array(6))).toThrow()
    expect(() => codigoDesdeBytes(new Uint8Array(8))).toThrow()
  })
})

describe("codigoInvitacionSchema", () => {
  it("PR-A02a: normaliza minúsculas, espacios y guiones", () => {
    const resultado = codigoInvitacionSchema.safeParse(" ab-cd 2q 3 ")
    expect(resultado.success).toBe(true)
    if (resultado.success) expect(resultado.data).toBe("ABCD2Q3")
  })

  it("PR-A02a2: acepta los espacios y guiones de Unicode del arbitraje de S-03 (ronda 2 del tester, T-15)", () => {
    // Lista cerrada: espacio no separable (U+00A0), espacio de cifra (U+2007), espacio fino no
    // separable (U+202F), espacio ideográfico (U+3000), guion (U+2010) y guion no separable
    // (U+2011). Un correo, un procesador de texto o un teclado móvil los insertan al copiar o
    // escribir el código.
    const separadores = [" ", " ", " ", "　", "‐", "‑"]
    for (const separador of separadores) {
      const resultado = codigoInvitacionSchema.safeParse(`ABC${separador}DEFG`)
      expect(resultado.success, `U+${separador.codePointAt(0)?.toString(16).toUpperCase()}`).toBe(
        true,
      )
      if (resultado.success) expect(resultado.data).toBe("ABCDEFG")
    }
  })

  it("PR-A02b: rechaza O, 0, I y 1", () => {
    for (const invalido of ["ABCDEFO", "ABCDEF0", "ABCDEFI", "ABCDEF1"]) {
      expect(codigoInvitacionSchema.safeParse(invalido).success).toBe(false)
    }
  })

  it("PR-A02c: rechaza 6 y 8 caracteres", () => {
    expect(codigoInvitacionSchema.safeParse("ABCDEF").success).toBe(false)
    expect(codigoInvitacionSchema.safeParse("ABCDEFGH").success).toBe(false)
  })

  it("PR-A02d: rechaza dígitos de ancho completo y caracteres invisibles", () => {
    expect(codigoInvitacionSchema.safeParse("ＡＢＣＤＥＦＧ").success).toBe(false)
    expect(codigoInvitacionSchema.safeParse("ABC​DEFG").success).toBe(false)
    // Ronda 1 del tester (T-04): U+FEFF es \s en JavaScript (se colaba como separador y el código
    // quedaba de 7 caracteres); ß, ſ y la ligadura ﬀ son letras no ASCII que toUpperCase() plegaba
    // o expandía en letras del alfabeto.
    expect(codigoInvitacionSchema.safeParse("ABC﻿DEFG").success, "U+FEFF").toBe(false)
    for (const variante of ["ABCDEß", "ABCDEFſ", "ABCDEﬀ"]) {
      expect(codigoInvitacionSchema.safeParse(variante).success, variante).toBe(false)
    }
  })

  it("PR-A02d2: rechaza las rayas de Unicode U+2012 a U+2015 (arbitraje de T-15: 'guion' y 'raya' son cosas distintas)", () => {
    for (const raya of ["‒", "–", "—", "―"]) {
      const resultado = codigoInvitacionSchema.safeParse(`ABC${raya}DEFG`)
      expect(resultado.success, `U+${raya.codePointAt(0)?.toString(16).toUpperCase()}`).toBe(false)
    }
  })
})
