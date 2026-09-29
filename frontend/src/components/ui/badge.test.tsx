import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Badge } from "./badge"

describe("Badge", () => {
  it("muestra el texto del estado", () => {
    render(<Badge variant="success">Vigente</Badge>)
    expect(screen.getByText("Vigente")).toBeInTheDocument()
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
