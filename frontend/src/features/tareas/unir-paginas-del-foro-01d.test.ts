// FORO-01d, corrección de la ronda 1 (T-01, arbitraje del manager, opción b): las dos listas del foro
// (principales y réplicas) se unen quedándose con la ÚLTIMA aparición de cada id. La respuesta de
// publicar se agrega al final de lo cargado; si quedaban páginas, el servidor la vuelve a traer al final
// de su página y esa copia es la que tiene la posición correcta.
import { describe, expect, it } from "vitest"

import { unirPaginasConLaUltimaAparicion } from "./lib"

interface Fila {
  id: string
  texto: string
}

const fila = (id: string, texto = id): Fila => ({ id, texto })

describe("FORO-1D60 · unirPaginasConLaUltimaAparicion (T-01)", () => {
  it("FORO-1D60: sin repetidas, conserva el orden de las páginas y de sus filas", () => {
    expect(
      unirPaginasConLaUltimaAparicion([[fila("a"), fila("b")], [fila("c")]]).map(({ id }) => id),
    ).toEqual(["a", "b", "c"])
  })

  it("FORO-1D60: una fila repetida entre páginas queda en el lugar de su última aparición, con esa copia", () => {
    const unidas = unirPaginasConLaUltimaAparicion([
      [fila("a"), fila("b"), fila("x", "agregada a la caché")],
      [fila("c"), fila("x", "del servidor")],
    ])
    expect(unidas.map(({ id }) => id)).toEqual(["a", "b", "c", "x"])
    expect(unidas.at(-1)?.texto).toBe("del servidor")
  })

  it("FORO-1D60: una fila repetida en la misma página queda en su última aparición", () => {
    expect(
      unirPaginasConLaUltimaAparicion([[fila("a"), fila("x"), fila("b"), fila("x")]]).map(
        ({ id }) => id,
      ),
    ).toEqual(["a", "b", "x"])
  })

  it("FORO-1D60: sin páginas o con páginas vacías, la lista vacía", () => {
    expect(unirPaginasConLaUltimaAparicion<Fila>([])).toEqual([])
    expect(unirPaginasConLaUltimaAparicion<Fila>([[], []])).toEqual([])
  })

  it("FORO-1D60: con una sola página, la misma página", () => {
    const pagina = [fila("a"), fila("b")]
    expect(unirPaginasConLaUltimaAparicion([pagina])).toEqual(pagina)
  })

  it("FORO-1D60: no muta la entrada", () => {
    const paginas = [[fila("a"), fila("x")], [fila("x")]]
    const copia = structuredClone(paginas)
    unirPaginasConLaUltimaAparicion(paginas)
    expect(paginas).toEqual(copia)
  })
})
