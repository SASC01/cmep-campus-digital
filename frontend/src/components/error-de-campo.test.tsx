import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ErrorDeCampo } from "./error-de-campo"

describe("ErrorDeCampo", () => {
  it("pinta el id y el texto, con un icono aria-hidden", () => {
    render(<ErrorDeCampo id="correo-error">El correo es obligatorio</ErrorDeCampo>)
    const parrafo = document.getElementById("correo-error")
    expect(parrafo).not.toBeNull()
    expect(parrafo?.querySelector("svg[aria-hidden='true']")).not.toBeNull()
  })

  it("getByText encuentra un solo elemento con el texto exacto", () => {
    render(<ErrorDeCampo id="correo-error">El correo es obligatorio</ErrorDeCampo>)
    expect(screen.getByText("El correo es obligatorio")).toBeInTheDocument()
  })
})
