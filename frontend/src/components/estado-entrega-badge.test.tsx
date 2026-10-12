import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { EstadoEntregaBadge } from "./estado-entrega-badge"

// ENTREGAS-01d (PR-1D02, DESIGN.md §7.8): cada estado con su texto, su tono y su icono.

afterEach(cleanup)

describe("EstadoEntregaBadge (PR-1D02)", () => {
  it.each([
    { estado: "asignado", texto: "Asignado", tono: "bg-muted", icono: false },
    { estado: "sin-entregar", texto: "Sin entregar", tono: "bg-danger-soft", icono: false },
    { estado: "entregado", texto: "Entregado", tono: "bg-success-soft", icono: true },
    {
      estado: "entregado-con-retraso",
      texto: "Entregado con retraso",
      tono: "bg-warning-soft",
      icono: true,
    },
    { estado: "calificado", texto: "Calificado", tono: "bg-success-soft", icono: false },
  ] as const)(
    "PR-1D02: $estado dice «$texto» con su tono y su icono (nunca solo color)",
    ({ estado, texto, tono, icono }) => {
      const { container } = render(<EstadoEntregaBadge estado={estado} />)
      const insignia = screen.getByText(texto)
      expect(insignia).toHaveTextContent(new RegExp(`^${texto}$`))
      expect(insignia.className).toContain(tono)
      expect(container.querySelectorAll("svg")).toHaveLength(icono ? 1 : 0)
      for (const svg of container.querySelectorAll("svg")) {
        expect(svg).toHaveAttribute("aria-hidden", "true")
      }
    },
  )
})
