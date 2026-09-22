import { describe, expect, it } from "vitest"

import { ordenarAnuncios } from "./lib"
import type { Anuncio } from "./types"

const desordenados: Anuncio[] = [
  { anuncioId: "c", titulo: "Tercero", texto: "", orden: 3 },
  { anuncioId: "a", titulo: "Primero", texto: "", orden: 1 },
  { anuncioId: "b", titulo: "Segundo", texto: "", orden: 2 },
]

describe("ordenarAnuncios", () => {
  it("ordena por orden ascendente", () => {
    expect(ordenarAnuncios(desordenados).map((a) => a.anuncioId)).toEqual(["a", "b", "c"])
  })

  it("no muta el arreglo original", () => {
    const copia = [...desordenados]
    ordenarAnuncios(desordenados)
    expect(desordenados).toEqual(copia)
  })
})
