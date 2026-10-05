import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Badge } from "./badge"

describe("Badge", () => {
  it("muestra el texto del estado", () => {
    render(<Badge variant="success">Vigente</Badge>)
    expect(screen.getByText("Vigente")).toBeInTheDocument()
  })

  // CLASES-02c (C-19, §D-2C4): la variante institucional firma lo que publica la administración;
  // no es un estado.
  it("la variante institucional usa --accent-soft con --link y no pinta rojo", () => {
    render(<Badge variant="institucional">Administración</Badge>)
    const insignia = screen.getByText("Administración")
    expect(insignia).toHaveClass("bg-accent-soft", "text-link")
    expect(insignia.className).not.toMatch(/danger|destructive/)
  })

  it("acepta un icono opcional antes del texto", () => {
    render(
      <Badge variant="danger" icon={<span data-testid="icono" />}>
        Revocado
      </Badge>,
    )
    expect(screen.getByTestId("icono")).toBeInTheDocument()
    expect(screen.getByText("Revocado")).toBeInTheDocument()
  })
})
