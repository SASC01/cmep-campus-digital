import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AccesoRestringidoBadge } from "./acceso-restringido-badge"
import { EstadoPagoBadge } from "./estado-pago-badge"

// DESIGN.md §7.8: el estado nunca se comunica solo con color; texto y un icono decorativo de lucide.
const iconoDe = (texto: string) => screen.getByText(texto).querySelector("svg")

describe("EstadoPagoBadge y AccesoRestringidoBadge", () => {
  it("PR-B13a: 'Al corriente' con su icono", () => {
    render(<EstadoPagoBadge estado="al_corriente" />)

    expect(screen.getByText("Al corriente")).toBeInTheDocument()
    const icono = iconoDe("Al corriente")
    expect(icono).toHaveClass("lucide-circle-check")
    expect(icono).toHaveAttribute("aria-hidden", "true")
  })

  it("PR-B13b: 'Deudor' con su icono", () => {
    render(<EstadoPagoBadge estado="deudor" />)

    expect(screen.getByText("Deudor")).toBeInTheDocument()
    expect(screen.queryByText("Al corriente")).not.toBeInTheDocument()
    const icono = iconoDe("Deudor")
    expect(icono).toHaveClass("lucide-circle-alert")
    expect(icono).toHaveAttribute("aria-hidden", "true")
  })

  it("PR-B13c: AccesoRestringidoBadge con 'Acceso restringido' y su icono", () => {
    render(<AccesoRestringidoBadge />)

    expect(screen.getByText("Acceso restringido")).toBeInTheDocument()
    const icono = iconoDe("Acceso restringido")
    expect(icono).toHaveClass("lucide-lock")
    expect(icono).toHaveAttribute("aria-hidden", "true")
  })
})
