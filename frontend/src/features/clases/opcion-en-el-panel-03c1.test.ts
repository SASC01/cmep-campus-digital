import { describe, expect, it } from "vitest"

import { desplazamientoParaVer, opcionEnElPanel } from "./lib"

// CLASES-03c1, corrección de la ronda 1 (T-02): la opción de las secciones en las coordenadas del
// área desplazable del panel. Su offsetLeft se mide desde la lista; la lista empieza después del
// borde y del relleno del panel, y esa distancia sale de las medidas, no de un número escrito.

describe("opcionEnElPanel (CL3-C1R1-02)", () => {
  it("CL3-C1R1-02: suma a la opción lo que la lista empieza dentro del panel (borde y relleno medidos)", () => {
    // Panel en x = 24 con borde de 1 px; la lista empieza tras 4 px de relleno: en 29.
    expect(
      opcionEnElPanel({ offsetLeft: 300, offsetWidth: 110 }, 29, {
        left: 24,
        clientLeft: 1,
        scrollLeft: 0,
      }),
    ).toEqual({ offsetLeft: 304, offsetWidth: 110 })
  })

  it("CL3-C1R1-02: con el panel ya desplazado, el resultado no cambia (la lista se movió lo mismo que el desplazamiento)", () => {
    expect(
      opcionEnElPanel({ offsetLeft: 300, offsetWidth: 110 }, 29 - 160, {
        left: 24,
        clientLeft: 1,
        scrollLeft: 160,
      }),
    ).toEqual({ offsetLeft: 304, offsetWidth: 110 })
  })

  it("CL3-C1R1-02: sin borde ni relleno (o sin medidas, como en jsdom), la opción queda igual", () => {
    expect(
      opcionEnElPanel({ offsetLeft: 300, offsetWidth: 110 }, 0, {
        left: 0,
        clientLeft: 0,
        scrollLeft: 0,
      }),
    ).toEqual({ offsetLeft: 300, offsetWidth: 110 })
  })

  it.each([4, 12])(
    "CL3-C1R1-02: con un relleno de %i px y 250 px visibles, desplazamientoParaVer deja la opción entera a la vista",
    (relleno) => {
      const panel = { left: 24, clientLeft: 1, scrollLeft: 0, clientWidth: 250 }
      const opcion = opcionEnElPanel(
        { offsetLeft: 300, offsetWidth: 110 },
        panel.left + panel.clientLeft + relleno,
        panel,
      )
      const destino = desplazamientoParaVer(panel, opcion)
      expect(destino).toBe(300 + relleno + 110 - 250)
      if (destino === null) throw new Error("Precondición: el panel se desplaza")
      expect(opcion.offsetLeft + opcion.offsetWidth).toBeLessThanOrEqual(destino + 250)
      expect(opcion.offsetLeft).toBeGreaterThanOrEqual(destino)
    },
  )
})
