import {
  contarCaracteresVisibles,
  nombreClaseSchema,
  normalizarTextoLargo as normalizarTextoLargoDeShared,
  textoConContenidoSchema,
} from "@campus/shared"
import { describe, expect, it } from "vitest"

import { normalizarTextoLargo } from "./texto.js"

describe("normalizarTextoLargo", () => {
  it("PR-A05: convierte CRLF y CR a LF, recorta los extremos, sin tocar el interior", () => {
    const entrada = "  \r\nlínea uno\r\nlínea dos\rlínea tres\n  "
    expect(normalizarTextoLargo(entrada)).toBe("línea uno\nlínea dos\nlínea tres")
  })

  it("PR-C15a: es la misma función que la de @campus/shared y da lo mismo con CRLF, CR y extremos en blanco", () => {
    expect(normalizarTextoLargo).toBe(normalizarTextoLargoDeShared)
    for (const entrada of ["a\r\nb", "a\rb", "  \t a b \n ", "\r\n\r\n", ""]) {
      expect(normalizarTextoLargo(entrada)).toBe(normalizarTextoLargoDeShared(entrada))
    }
    expect(normalizarTextoLargo("a\r\nb\rc")).toBe("a\nb\nc")
    expect(normalizarTextoLargo("  x  ")).toBe("x")
  })
})

describe("contenido visible (CLASES-c, §D-C4)", () => {
  it("PR-C12a: contarCaracteresVisibles cuenta por punto de código solo lo que se ve", () => {
    expect(contarCaracteresVisibles("ab")).toBe(2)
    expect(contarCaracteresVisibles("a b")).toBe(2)
    expect(contarCaracteresVisibles("\u{1F44D}")).toBe(1)
    expect(contarCaracteresVisibles("\u2764\uFE0F")).toBe(1)
    expect(contarCaracteresVisibles("\u{1F44D}\u{1F3FD}")).toBe(2)
    expect(contarCaracteresVisibles("\u{1F1F2}\u{1F1FD}")).toBe(2)
    expect(contarCaracteresVisibles("\u{1F469}\u200D\u{1F4BB}")).toBe(2)
    expect(contarCaracteresVisibles("数学")).toBe(2)
    expect(contarCaracteresVisibles("\u200B\u2060\uFEFF\u00AD")).toBe(0)
    expect(contarCaracteresVisibles("\u3164\u115F")).toBe(0)
    expect(contarCaracteresVisibles("\u2800")).toBe(0)
    expect(contarCaracteresVisibles("\u{1D159}")).toBe(0)
    expect(contarCaracteresVisibles("\u0301")).toBe(0)
    expect(contarCaracteresVisibles(" \u3000\u00A0")).toBe(0)
  })

  it("PR-C12b: nombreClaseSchema rechaza los nombres sin al menos 2 caracteres visibles", () => {
    const rechazados = [
      "\u200B\u200B",
      "\u2060\uFEFF\u2060",
      "a\u200B",
      "\u3164\u3164",
      "\u2800\u2800",
      "\u{1F44D}",
    ]
    for (const nombre of rechazados) {
      const resultado = nombreClaseSchema.safeParse(nombre)
      expect(resultado.success).toBe(false)
      expect(resultado.error?.issues[0]?.message).toBe("El nombre debe tener al menos 2 caracteres")
    }
  })

  it("PR-C12c: nombreClaseSchema acepta emojis compuestos, otros alfabetos y un Cf en medio", () => {
    const aceptados = [
      "\u{1F469}\u200D\u{1F4BB} Programación",
      "\u2764\uFE0F\u2764\uFE0F",
      "\u{1F44D}\u{1F3FD}",
      "\u{1F1F2}\u{1F1FD} Historia",
      "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F} Escocia",
      "数学",
      "می\u200Cخواهم",
      "Mate\u200Bmáticas",
    ]
    for (const nombre of aceptados) {
      expect(nombreClaseSchema.safeParse(nombre).success).toBe(true)
    }
  })

  it("PR-C12d: se normaliza primero y después se valida el contenido visible", () => {
    const mensaje = "Escribe tu comentario"
    const esquema = textoConContenidoSchema(1000, mensaje)

    const sinContenido = esquema.safeParse(normalizarTextoLargo("\r\n\u200B\r\n"))
    expect(sinContenido.success).toBe(false)
    expect(sinContenido.error?.issues[0]?.message).toBe(mensaje)

    const conEmoji = esquema.safeParse(normalizarTextoLargo("\r\n\u{1F44D}\r\n"))
    expect(conEmoji.success).toBe(true)
    expect(conEmoji.data).toBe("\u{1F44D}")

    expect(esquema.safeParse("\u200D").success).toBe(false)
    expect(esquema.safeParse("\u{1F469}\u200D\u{1F4BB}").success).toBe(true)
  })
})
