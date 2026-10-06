import { describe, expect, it } from "vitest"

import { varianteDeClase } from "./variante-de-clase"

describe("varianteDeClase (lib/)", () => {
  // PR-2D06: los valores salen de la implementación anterior, la de features/clases/lib.ts (A-6 de
  // CLASES-02, mover sin cambiar el resultado).
  it("PR-2D06: da la misma variante que antes para los ids de las pruebas existentes", () => {
    expect(varianteDeClase("2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01")).toBe("blanca")
    expect(varianteDeClase("2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02")).toBe("verde")
    expect(varianteDeClase("2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d03")).toBe("azul")
  })

  it("PR-2D06: es determinista, no falla con una cadena vacía o con puntos de código fuera del BMP y usa las tres variantes", () => {
    const ids = Array.from({ length: 30 }, () => crypto.randomUUID())
    expect(new Set(ids.map((id) => varianteDeClase(id)))).toEqual(
      new Set(["verde", "azul", "blanca"]),
    )
    for (const id of ids) expect(varianteDeClase(id)).toBe(varianteDeClase(id))
    expect(varianteDeClase("")).toBe("verde")
    expect(["verde", "azul", "blanca"]).toContain(varianteDeClase("\u{1F600}"))
  })
})
