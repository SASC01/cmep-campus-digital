import { describe, expect, it } from "vitest"

import {
  puedeMoverElemento,
  siguienteOrden,
  validarNuevoTema,
  validarOrdenDeTemas,
  validarRenombre,
} from "./temas.js"

const A = "aaaaaaaa-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
const B = "bbbbbbbb-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
const C = "cccccccc-1c1f-4b8e-9a1e-0f2a3b4c5d6e"

const temas = (cantidad: number) =>
  Array.from({ length: cantidad }, (_, i) => ({ id: `id-${i}`, nombre: `Tema ${i}` }))

describe("validarNuevoTema", () => {
  it("PR-1A01: con 29 temas pasa y con 30 rechaza con 409 TOPE_DE_TEMAS", () => {
    expect(() => validarNuevoTema(temas(29), "Nuevo")).not.toThrow()
    expect(() => validarNuevoTema(temas(30), "Nuevo")).toThrowError(
      expect.objectContaining({ codigo: "TOPE_DE_TEMAS", estado: 409 }),
    )
  })

  it("PR-1A01: un nombre repetido sin distinguir mayúsculas, acentos ni espacios de más → 409 TEMA_REPETIDO", () => {
    const existentes = [{ id: A, nombre: "Álgebra lineal" }]
    const intentos = ["algebra lineal", "ÁLGEBRA LINEAL", "  Algebra   lineal  ", "Álgebra lineal"]
    for (const intento of intentos) {
      expect(() => validarNuevoTema(existentes, intento)).toThrowError(
        expect.objectContaining({ codigo: "TEMA_REPETIDO", estado: 409 }),
      )
    }
  })

  it("PR-1A01: un nombre distinto pasa", () => {
    expect(() => validarNuevoTema([{ id: A, nombre: "Álgebra" }], "Geometría")).not.toThrow()
  })

  it("PR-1A01: con el tope y un nombre repetido, el tope va primero", () => {
    expect(() => validarNuevoTema(temas(30), "Tema 1")).toThrowError(
      expect.objectContaining({ codigo: "TOPE_DE_TEMAS" }),
    )
  })
})

describe("validarRenombre", () => {
  const existentes = [
    { id: A, nombre: "Unidad 1" },
    { id: B, nombre: "Unidad 2" },
  ]

  it("PR-1A01: renombrar a su mismo nombre (aunque cambie la capitalización) pasa", () => {
    expect(() => validarRenombre(existentes, A, "Unidad 1")).not.toThrow()
    expect(() => validarRenombre(existentes, A, "UNIDAD 1")).not.toThrow()
  })

  it("PR-1A01: renombrar al nombre de otro tema → 409 TEMA_REPETIDO", () => {
    expect(() => validarRenombre(existentes, A, " unidad  2 ")).toThrowError(
      expect.objectContaining({ codigo: "TEMA_REPETIDO", estado: 409 }),
    )
  })

  it("PR-1A01: un tema que no está → 404 TEMA_NO_ENCONTRADO", () => {
    expect(() => validarRenombre(existentes, C, "Otro")).toThrowError(
      expect.objectContaining({ codigo: "TEMA_NO_ENCONTRADO", estado: 404 }),
    )
    expect(() => validarRenombre([], A, "Otro")).toThrowError(
      expect.objectContaining({ codigo: "TEMA_NO_ENCONTRADO", estado: 404 }),
    )
  })
})

describe("siguienteOrden", () => {
  it("PR-1A01: sin temas → 0", () => {
    expect(siguienteOrden([])).toBe(0)
  })

  it("PR-1A01: con huecos → el mayor más 1", () => {
    expect(siguienteOrden([0, 1, 2])).toBe(3)
    expect(siguienteOrden([0, 5, 2])).toBe(6)
    expect(siguienteOrden([4])).toBe(5)
  })
})

describe("validarOrdenDeTemas", () => {
  const rechaza = (actuales: string[], propuestos: string[]) =>
    expect(() => validarOrdenDeTemas(actuales, propuestos)).toThrowError(
      expect.objectContaining({ codigo: "ORDEN_DESACTUALIZADO", estado: 409 }),
    )

  it("PR-1A01: el mismo conjunto en otro orden pasa", () => {
    expect(() => validarOrdenDeTemas([A, B, C], [C, A, B])).not.toThrow()
    expect(() => validarOrdenDeTemas([A, B, C], [A, B, C])).not.toThrow()
  })

  it("PR-1A01: los ids en otra capitalización cuentan como los mismos", () => {
    expect(() => validarOrdenDeTemas([A, B], [B.toUpperCase(), A])).not.toThrow()
  })

  it("PR-1A01: un tema faltante rechaza", () => {
    rechaza([A, B, C], [A, B])
  })

  it("PR-1A01: un tema sobrante o ajeno rechaza", () => {
    rechaza([A, B], [A, B, C])
    rechaza([A, B], [A, C])
  })

  it("PR-1A01: un id repetido rechaza", () => {
    rechaza([A, B], [A, A])
    rechaza([A, B], [A, B, A])
    rechaza([A, B], [A, A.toUpperCase()])
  })

  it("PR-1A01: una lista vacía con temas rechaza", () => {
    rechaza([A, B], [])
  })
})

describe("puedeMoverElemento", () => {
  it("PR-1A01: el maestro y el admin pueden; el estudiante no", () => {
    expect(puedeMoverElemento("maestro")).toBe(true)
    expect(puedeMoverElemento("admin")).toBe(true)
    expect(puedeMoverElemento("estudiante")).toBe(false)
  })
})

describe("comparación de nombres y ids (ronda 1, T-01 a T-03)", () => {
  const existentes = [
    { id: A, nombre: "Unidad 1" },
    { id: B, nombre: "Unidad 2" },
  ]

  it("PR-1A01: invisibles y formas de compatibilidad cuentan como el mismo nombre", () => {
    const variantes = [
      "Uni\u200Bdad 1",
      "Uni\u00ADdad 1",
      "Uni\u200Ddad 1",
      "Uni\u2060dad 1",
      "\uFEFFUnidad 1",
      "\uFF35nidad 1",
      "Unidad \u2460",
    ]
    for (const variante of variantes) {
      expect(() => validarNuevoTema(existentes, variante), variante).toThrowError(
        expect.objectContaining({ codigo: "TEMA_REPETIDO" }),
      )
      expect(() => validarRenombre(existentes, B, variante), variante).toThrowError(
        expect.objectContaining({ codigo: "TEMA_REPETIDO" }),
      )
    }
  })

  it("PR-1A01: renombrar con el id en mayúsculas encuentra el tema y no se cuenta a sí mismo", () => {
    expect(() => validarRenombre(existentes, A.toUpperCase(), "UNIDAD 1")).not.toThrow()
    expect(() => validarRenombre(existentes, A.toUpperCase(), "Unidad 2")).toThrowError(
      expect.objectContaining({ codigo: "TEMA_REPETIDO" }),
    )
  })
})

describe("comparación con caracteres que se ven vacíos (ronda 2, T-05)", () => {
  const BRAILLE = String.fromCodePoint(0x2800)
  const CABEZA_DE_NOTA = String.fromCodePoint(0x1d159)
  const RELLENO_HANGUL = [0x3164, 0x115f, 0x1160].map((punto) => String.fromCodePoint(punto))
  const existentes = [
    { id: A, nombre: "Unidad 1" },
    { id: B, nombre: "Unidad 2" },
  ]

  it("PR-1A01: U+2800 y U+1D159 al final o en medio del nombre cuentan como el mismo nombre", () => {
    for (const variante of [
      `Unidad 1${BRAILLE}`,
      `Unidad${BRAILLE}1`,
      `Unidad 1${CABEZA_DE_NOTA}`,
    ]) {
      expect(() => validarNuevoTema(existentes, variante), variante).toThrowError(
        expect.objectContaining({ codigo: "TEMA_REPETIDO" }),
      )
      expect(() => validarRenombre(existentes, B, variante), variante).toThrowError(
        expect.objectContaining({ codigo: "TEMA_REPETIDO" }),
      )
    }
  })

  it("PR-1A01: el relleno Hangul se quita como cualquier Default_Ignorable (no cuenta como espacio)", () => {
    for (const relleno of RELLENO_HANGUL) {
      expect(() => validarNuevoTema(existentes, `Unidad 1${relleno}`)).toThrowError(
        expect.objectContaining({ codigo: "TEMA_REPETIDO" }),
      )
      expect(() => validarNuevoTema(existentes, `Unidad${relleno}1`)).not.toThrow()
    }
  })

  it("PR-1A01: renombrar a su propio nombre con solo un carácter que se ve vacío de diferencia pasa", () => {
    expect(() => validarRenombre(existentes, A, `Unidad 1${BRAILLE}`)).not.toThrow()
    expect(() =>
      validarRenombre(existentes, A, `Unidad${BRAILLE} 1${CABEZA_DE_NOTA}`),
    ).not.toThrow()
  })
})
