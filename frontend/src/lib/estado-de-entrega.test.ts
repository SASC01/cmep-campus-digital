import { describe, expect, it } from "vitest"

import { estadoDeEntregaVisible } from "./estado-de-entrega"

// ENTREGAS-01d (PR-1D01): el estado visible de una entrega. El reloj es explícito (`ahora`).

const LIMITE = "2026-10-20T17:00:00.000Z"
const antes = new Date("2026-10-20T16:59:59.999Z")
const justo = new Date(LIMITE)
const despues = new Date("2026-10-20T17:00:00.001Z")

describe("estadoDeEntregaVisible (PR-1D01)", () => {
  it("PR-1D01: los cinco resultados: asignado, sin entregar, entregado, entregado con retraso y calificado", () => {
    expect(estadoDeEntregaVisible(null, LIMITE, antes)).toBe("asignado")
    expect(estadoDeEntregaVisible(null, LIMITE, despues)).toBe("sin-entregar")
    expect(
      estadoDeEntregaVisible({ estado: "entregado", conRetraso: false }, LIMITE, despues),
    ).toBe("entregado")
    expect(estadoDeEntregaVisible({ estado: "entregado", conRetraso: true }, LIMITE, antes)).toBe(
      "entregado-con-retraso",
    )
    expect(
      estadoDeEntregaVisible({ estado: "calificado", conRetraso: true }, LIMITE, despues),
    ).toBe("calificado")
  })

  it("PR-1D01: una fila asignado (anulada o solo con hilo) se trata como sin entrega", () => {
    expect(estadoDeEntregaVisible({ estado: "asignado", conRetraso: false }, LIMITE, antes)).toBe(
      "asignado",
    )
    expect(estadoDeEntregaVisible({ estado: "asignado", conRetraso: false }, LIMITE, despues)).toBe(
      "sin-entregar",
    )
  })

  it("PR-1D01: la frontera de la fecha límite es la de vencimientoDe (vencida desde su milisegundo exacto)", () => {
    expect(estadoDeEntregaVisible(null, LIMITE, antes)).toBe("asignado")
    expect(estadoDeEntregaVisible(null, LIMITE, justo)).toBe("sin-entregar")
    expect(estadoDeEntregaVisible(null, "no-es-fecha", despues)).toBe("asignado")
  })
})
