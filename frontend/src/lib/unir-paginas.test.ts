import { describe, expect, it } from "vitest"

import { unirPaginasSinRepetidas } from "./unir-paginas"

// ADMIN-01c (§D-2, corrección de la Enmienda 5, M-08 y R-19): el descarte por `id` al unir páginas.
const fila = (id: string, nombre = id) => ({ id, nombre })

describe("unirPaginasSinRepetidas (ADM-1C17 a)", () => {
  it("ADM-1C17 (a): sin repetidas, devuelve todas las filas en el orden de las páginas", () => {
    expect(unirPaginasSinRepetidas([[fila("a"), fila("b")], [fila("c")], [fila("d")]])).toEqual([
      fila("a"),
      fila("b"),
      fila("c"),
      fila("d"),
    ])
  })

  it("ADM-1C17 (a): un id repetido en una página posterior se queda en su primera aparición y sale de la posterior", () => {
    const resultado = unirPaginasSinRepetidas([
      [fila("a", "vieja"), fila("b")],
      [fila("c"), fila("a", "nueva"), fila("d")],
    ])
    expect(resultado.map((f) => f.id)).toEqual(["a", "b", "c", "d"])
    expect(resultado[0]?.nombre).toBe("vieja")
  })

  it("ADM-1C17 (a): una repetida dentro de la misma página sale igual", () => {
    expect(unirPaginasSinRepetidas([[fila("a"), fila("b"), fila("a")]]).map((f) => f.id)).toEqual([
      "a",
      "b",
    ])
  })

  it("ADM-1C17 (a): páginas vacías", () => {
    expect(unirPaginasSinRepetidas([])).toEqual([])
    expect(unirPaginasSinRepetidas([[], []])).toEqual([])
    expect(unirPaginasSinRepetidas([[], [fila("a")], []])).toEqual([fila("a")])
  })

  it("ADM-1C17 (a): no muta la entrada", () => {
    const primera = [fila("a"), fila("b")]
    const segunda = [fila("b"), fila("c")]
    const paginas = [primera, segunda]
    const copia = JSON.parse(JSON.stringify(paginas)) as unknown
    const resultado = unirPaginasSinRepetidas(paginas)
    expect(paginas).toEqual(copia)
    expect(paginas[0]).toBe(primera)
    expect(paginas[1]).toBe(segunda)
    expect(resultado).not.toBe(primera)
  })
})
