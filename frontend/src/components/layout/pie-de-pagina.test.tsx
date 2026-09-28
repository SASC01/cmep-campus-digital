import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { PieDePagina } from "./pie-de-pagina"

describe("PieDePagina", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it("el texto del año es el año calculado, no escrito", () => {
    vi.setSystemTime(new Date(2026, 5, 1))
    const { unmount } = render(<PieDePagina />)
    expect(screen.getByText(/© 2026/)).toBeInTheDocument()
    unmount()

    vi.setSystemTime(new Date(2027, 0, 1))
    render(<PieDePagina />)
    expect(screen.getByText(/© 2027/)).toBeInTheDocument()
  })

  it("en desarrollo: 4 marcadores con sus textos, 0 enlaces y ningún marcador enfocable", () => {
    render(<PieDePagina />)
    const marcadores = document.querySelectorAll("[data-marcador]")
    expect(marcadores).toHaveLength(4)
    expect(screen.getByText("Sitio web")).toBeInTheDocument()
    expect(screen.getByText("Facebook")).toBeInTheDocument()
    expect(screen.getByText("Contacto")).toBeInTheDocument()
    expect(screen.getByText("Aviso de privacidad")).toBeInTheDocument()
    expect(screen.queryAllByRole("link")).toHaveLength(0)
    for (const marcador of marcadores) {
      expect(marcador.getAttribute("tabindex")).toBeNull()
    }
  })

  it("en producción: 0 marcadores y sin lista de enlaces", () => {
    vi.stubEnv("PROD", true)
    render(<PieDePagina />)
    expect(document.querySelectorAll("[data-marcador]")).toHaveLength(0)
    expect(screen.queryByRole("list", { name: "Enlaces del colegio" })).toBeNull()
  })

  it("en los dos modos, ningún enlace con href '#' ni 'javascript:'", () => {
    const { rerender } = render(<PieDePagina />)
    expect(document.querySelectorAll('a[href^="#"]')).toHaveLength(0)
    expect(document.querySelectorAll('a[href^="javascript:"]')).toHaveLength(0)

    vi.stubEnv("PROD", true)
    rerender(<PieDePagina />)
    expect(document.querySelectorAll('a[href^="#"]')).toHaveLength(0)
    expect(document.querySelectorAll('a[href^="javascript:"]')).toHaveLength(0)
  })

  it("un solo contentinfo", () => {
    render(<PieDePagina />)
    expect(screen.getAllByRole("contentinfo")).toHaveLength(1)
  })
})
