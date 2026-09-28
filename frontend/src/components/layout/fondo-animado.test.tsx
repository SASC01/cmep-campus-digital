import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FondoAnimado } from "./fondo-animado"

describe("FondoAnimado", () => {
  it("la raíz es aria-hidden y no tiene texto ni elementos enfocables", () => {
    const { container } = render(<FondoAnimado enMovimiento={true} />)
    const raiz = container.firstElementChild
    expect(raiz).toHaveAttribute("aria-hidden", "true")
    expect(container).toHaveTextContent("")
    expect(screen.queryAllByRole("button")).toHaveLength(0)
    expect(container.querySelectorAll("a, button, input, [tabindex]")).toHaveLength(0)
  })

  it.each([
    [true, "si"],
    [false, "no"],
  ])("enMovimiento=%s da data-movimiento=%s", (enMovimiento, esperado) => {
    const { container } = render(<FondoAnimado enMovimiento={enMovimiento} />)
    expect(container.querySelector("[data-fondo]")).toHaveAttribute("data-movimiento", esperado)
  })

  it("tiene los tres orbes y el velo", () => {
    const { container } = render(<FondoAnimado enMovimiento={false} />)
    expect(container.querySelector('[data-orbe="azul"]')).not.toBeNull()
    expect(container.querySelector('[data-orbe="verde"]')).not.toBeNull()
    expect(container.querySelector('[data-orbe="suave"]')).not.toBeNull()
    expect(container.querySelector("[data-velo]")).not.toBeNull()
  })
})
