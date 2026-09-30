import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import * as modulo from "./estado-vacio"
import { EstadoVacio } from "./estado-vacio"

describe("EstadoVacio", () => {
  it("PR-A25: el módulo exporta exactamente ['EstadoVacio'] (M-20: AccionEstadoVacio ya no se exporta)", () => {
    expect(Object.keys(modulo)).toEqual(["EstadoVacio"])
  })

  it("muestra el título, sin descripción ni acción", () => {
    render(<EstadoVacio titulo="Aún no hay nada" />)
    expect(screen.getByText("Aún no hay nada")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("muestra la descripción cuando se pasa", () => {
    render(<EstadoVacio titulo="Título" descripcion="Una frase de ayuda." />)
    expect(screen.getByText("Una frase de ayuda.")).toBeInTheDocument()
  })

  it("la acción usa la variante que recibe y dispara su onClick", async () => {
    const onClick = vi.fn()
    render(
      <EstadoVacio
        titulo="Título"
        accion={{ texto: "Generar el primero", onClick, variante: "outline" }}
      />,
    )
    const boton = screen.getByRole("button", { name: "Generar el primero" })
    expect(boton).toHaveAttribute("data-variant", "outline")
    boton.click()
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("con variante primary, el botón la refleja", () => {
    render(
      <EstadoVacio
        titulo="Título"
        accion={{ texto: "Crear", onClick: () => undefined, variante: "primary" }}
      />,
    )
    expect(screen.getByRole("button", { name: "Crear" })).toHaveAttribute("data-variant", "primary")
  })
})
