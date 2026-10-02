import { describe, expect, it } from "vitest"

import { formatearTamano } from "./format"

// Ataque del Tester (CLASES-d, ronda 1; punto 13 de la lista del manager): los bordes de
// formatearTamano (§D-D5, DESIGN.md §7.19: "820 KB", "2.4 MB"). Un tamaño que redondea a 1024 KB
// ya es 1 MB: la ficha no debe mostrar "1024 KB".

const KB = 1024
const MB = 1024 * 1024

describe("ataque d-r1: formatearTamano en los cambios de unidad", () => {
  it("los ejemplos de DESIGN.md y los cambios de unidad exactos", () => {
    expect(formatearTamano(839_680)).toBe("820 KB")
    expect(formatearTamano(2_516_582)).toBe("2.4 MB")
    expect(formatearTamano(1023)).toBe("1023 B")
    expect(formatearTamano(KB)).toBe("1 KB")
    expect(formatearTamano(MB)).toBe("1 MB")
    expect(formatearTamano(25 * MB)).toBe("25 MB")
  })

  it.each([MB - 1, 1_048_064])(
    "%i bytes (menos de 1 MB, pero redondea a 1024 KB) no se muestra como «1024 KB»",
    (bytes) => {
      expect(formatearTamano(bytes)).not.toBe("1024 KB")
    },
  )
})
