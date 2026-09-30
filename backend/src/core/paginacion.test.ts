import { describe, expect, it } from "vitest"

import { paginar } from "./paginacion.js"

interface Fila {
  id: string
}

const filas = (n: number): Fila[] => Array.from({ length: n }, (_, i) => ({ id: `id-${i}` }))

describe("paginar", () => {
  it("PR-A04a: con limite + 1 filas, el cursor es el id de la última de la página", () => {
    const resultado = paginar(filas(4), 3, (f) => f.id)
    expect(resultado.pagina).toHaveLength(3)
    expect(resultado.pagina.map((f) => f.id)).toEqual(["id-0", "id-1", "id-2"])
    expect(resultado.siguienteCursor).toBe("id-2")
  })

  it("PR-A04b: con limite filas o menos, cursor null", () => {
    const resultado = paginar(filas(3), 3, (f) => f.id)
    expect(resultado.pagina).toHaveLength(3)
    expect(resultado.siguienteCursor).toBeNull()

    const menos = paginar(filas(2), 3, (f) => f.id)
    expect(menos.pagina).toHaveLength(2)
    expect(menos.siguienteCursor).toBeNull()
  })

  it("PR-A04c: lista vacía", () => {
    const resultado = paginar(filas(0), 3, (f) => f.id)
    expect(resultado.pagina).toEqual([])
    expect(resultado.siguienteCursor).toBeNull()
  })
})
