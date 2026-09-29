import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Textarea } from "./textarea"

describe("Textarea", () => {
  it("renderiza con la etiqueta y acepta texto", () => {
    render(<Textarea aria-label="Lista de maestros" defaultValue="ana@colegio.mx" />)
    const campo = screen.getByRole("textbox", { name: "Lista de maestros" })
    expect(campo).toBeInTheDocument()
    expect(campo).toHaveValue("ana@colegio.mx")
  })

  it("marca aria-invalid cuando se le pasa", () => {
    render(<Textarea aria-label="Lista" aria-invalid />)
    expect(screen.getByRole("textbox", { name: "Lista" })).toHaveAttribute("aria-invalid", "true")
  })
})
