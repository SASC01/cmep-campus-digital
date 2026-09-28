import { fireEvent, render, screen } from "@testing-library/react"
import type { FormEvent } from "react"
import { describe, expect, it, vi } from "vitest"

import { Button } from "./button"

describe("Button", () => {
  it("con enEspera: aria-disabled y aria-busy en 'true', sigue habilitado y conserva el nombre accesible", () => {
    render(<Button enEspera>Guardar</Button>)
    const boton = screen.getByRole("button", { name: "Guardar" })
    expect(boton).toHaveAttribute("aria-disabled", "true")
    expect(boton).toHaveAttribute("aria-busy", "true")
    expect(boton).not.toBeDisabled()
    expect(boton.querySelector("svg[aria-hidden='true']")).not.toBeNull()
  })

  it("sin enEspera: no lleva aria-disabled, aria-busy ni data-en-espera", () => {
    render(<Button>Guardar</Button>)
    const boton = screen.getByRole("button", { name: "Guardar" })
    expect(boton).not.toHaveAttribute("aria-disabled")
    expect(boton).not.toHaveAttribute("aria-busy")
    expect(boton).not.toHaveAttribute("data-en-espera")
  })

  it("con enEspera, el clic no llama a onClick", () => {
    const alHacerClic = vi.fn()
    render(
      <Button enEspera onClick={alHacerClic}>
        Guardar
      </Button>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }))
    expect(alHacerClic).not.toHaveBeenCalled()
  })

  it("sin enEspera, un clic en el botón de envío llama a onSubmit una vez", () => {
    const alEnviar = vi.fn((evento: FormEvent<HTMLFormElement>) => evento.preventDefault())
    render(
      <form onSubmit={alEnviar}>
        <Button type="submit">Enviar</Button>
      </form>,
    )
    screen.getByRole("button", { name: "Enviar" }).click()
    expect(alEnviar).toHaveBeenCalledTimes(1)
  })

  it("con enEspera, un clic en el botón de envío no llama a onSubmit", () => {
    const alEnviar = vi.fn((evento: FormEvent<HTMLFormElement>) => evento.preventDefault())
    render(
      <form onSubmit={alEnviar}>
        <Button type="submit" enEspera>
          Enviar
        </Button>
      </form>,
    )
    screen.getByRole("button", { name: "Enviar" }).click()
    expect(alEnviar).not.toHaveBeenCalled()
  })

  it("el foco se conserva al pasar a enEspera", () => {
    const { rerender } = render(<Button>Guardar</Button>)
    const boton = screen.getByRole("button", { name: "Guardar" })
    boton.focus()
    expect(document.activeElement).toBe(boton)
    rerender(<Button enEspera>Guardar</Button>)
    expect(document.activeElement).toBe(boton)
  })

  it("variant='outline' lleva la clase vidrio-fuerte", () => {
    render(<Button variant="outline">Cancelar</Button>)
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveClass("vidrio-fuerte")
  })

  it("variant='primary' lleva el anillo de foco interior", () => {
    render(<Button variant="primary">Guardar</Button>)
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveClass(
      "focus-visible:-outline-offset-4",
    )
  })
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- solo lo comprueba tsc -b (D-5).
function _tipoInvalido() {
  // @ts-expect-error asChild y enEspera juntos no son un tipo válido (D-5).
  return <Button asChild enEspera />
}
