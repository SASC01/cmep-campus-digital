import { describe, expect, it } from "vitest"

import { conTextosDeTareaNormalizados } from "./texto.js"

describe("conTextosDeTareaNormalizados", () => {
  it("PR-1B05: pasa CRLF y CR a LF y recorta en título, instrucciones y criterios", () => {
    const resultado = conTextosDeTareaNormalizados({
      titulo: "  Ensayo\r\n",
      instrucciones: "Línea 1\r\nLínea 2\rLínea 3  \r\n",
      puntos: 10,
      rubrica: [
        { criterio: " Claridad \r\n", puntosMax: 5 },
        { criterio: "Uno\r\nDos", puntosMax: 5 },
      ],
    })
    expect(resultado).toEqual({
      titulo: "Ensayo",
      instrucciones: "Línea 1\nLínea 2\nLínea 3",
      puntos: 10,
      rubrica: [
        { criterio: "Claridad", puntosMax: 5 },
        { criterio: "Uno\nDos", puntosMax: 5 },
      ],
    })
  })

  it("PR-1B05: lo que no es texto queda intacto (criterios, título, rúbrica que no es arreglo)", () => {
    const cuerpo = {
      titulo: 5,
      instrucciones: null,
      rubrica: [{ criterio: 7, puntosMax: 1 }, null, "x", [], { puntosMax: 2 }],
    }
    expect(conTextosDeTareaNormalizados(cuerpo)).toEqual(cuerpo)
    expect(conTextosDeTareaNormalizados({ titulo: "a", rubrica: { criterio: "x\r\n" } })).toEqual({
      titulo: "a",
      rubrica: { criterio: "x\r\n" },
    })
  })

  it("PR-1B05: un cuerpo que es arreglo, null o texto queda intacto", () => {
    const arreglo = [{ titulo: "x\r\n" }]
    expect(conTextosDeTareaNormalizados(arreglo)).toBe(arreglo)
    expect(conTextosDeTareaNormalizados(null)).toBeNull()
    expect(conTextosDeTareaNormalizados("texto\r\n")).toBe("texto\r\n")
    expect(conTextosDeTareaNormalizados(undefined)).toBeUndefined()
  })

  it("PR-1B05: no muta lo recibido", () => {
    const cuerpo = { titulo: " a\r\n", rubrica: [{ criterio: " b\r\n", puntosMax: 1 }] }
    const copia = structuredClone(cuerpo)
    conTextosDeTareaNormalizados(cuerpo)
    expect(cuerpo).toEqual(copia)
  })
})
