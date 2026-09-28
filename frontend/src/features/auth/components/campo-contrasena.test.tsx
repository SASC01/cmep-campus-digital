import { fireEvent, render, screen } from "@testing-library/react"
import type { FormEvent } from "react"
import { describe, expect, it, vi } from "vitest"

import { CampoContrasena } from "./campo-contrasena"

const NOMBRE = "Mostrar contraseña de prueba"

function renderizar(onSubmit: (evento: FormEvent) => void, id = "contrasena") {
  return render(
    <form
      onSubmit={(evento) => {
        evento.preventDefault()
        onSubmit(evento)
      }}
    >
      <CampoContrasena id={id} nombreDelBoton={NOMBRE} name={id} />
    </form>,
  )
}

describe("CampoContrasena", () => {
  it("CC-1: un clic, Enter o Espacio sobre el botón no disparan submit", () => {
    const onSubmit = vi.fn()
    renderizar(onSubmit)
    const boton = screen.getByRole("button", { name: NOMBRE })

    fireEvent.click(boton)
    fireEvent.keyDown(boton, { key: "Enter", code: "Enter" })
    fireEvent.keyDown(boton, { key: " ", code: "Space" })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("CC-2: nombre fijo, aria-pressed, type del campo y aria-controls", () => {
    renderizar(vi.fn())
    const boton = screen.getByRole("button", { name: NOMBRE })

    expect(boton).toHaveAccessibleName(NOMBRE)
    expect(boton).toHaveAttribute("aria-pressed", "false")
    expect(boton).toHaveAttribute("aria-controls", "contrasena")
    expect(boton).not.toHaveAttribute("aria-label")
    expect(boton).not.toHaveAttribute("aria-labelledby")

    const entrada = document.getElementById("contrasena") as HTMLInputElement
    expect(entrada).toHaveAttribute("type", "password")

    fireEvent.click(boton)

    expect(boton).toHaveAccessibleName(NOMBRE)
    expect(boton).toHaveAttribute("aria-pressed", "true")
    expect(entrada).toHaveAttribute("type", "text")
  })

  it("el botón contiene un elemento con el texto del nombre (sr-only) y el icono es aria-hidden", () => {
    renderizar(vi.fn())
    const boton = screen.getByRole("button", { name: NOMBRE })
    expect(boton).toHaveTextContent(NOMBRE)
    const icono = boton.querySelector("svg")
    expect(icono).toHaveAttribute("aria-hidden", "true")
  })

  it("queryByLabelText(nombreDelBoton) no encuentra el botón", () => {
    renderizar(vi.fn())
    expect(screen.queryByLabelText(NOMBRE)).toBeNull()
  })

  it("CC-3: fireEvent.mouseDown(boton) cancela la acción por defecto", () => {
    renderizar(vi.fn())
    const boton = screen.getByRole("button", { name: NOMBRE })
    const resultado = fireEvent.mouseDown(boton)
    expect(resultado).toBe(false)
  })

  it("CC-3: con el foco en el campo y la selección en (2, 4), tras el clic el foco sigue en el campo y la selección se conserva", () => {
    renderizar(vi.fn())
    const boton = screen.getByRole("button", { name: NOMBRE })
    const campo = document.getElementById("contrasena") as HTMLInputElement

    campo.value = "abcdef"
    campo.focus()
    campo.setSelectionRange(2, 4)

    fireEvent.mouseDown(boton)
    fireEvent.click(boton)

    expect(document.activeElement).toBe(campo)
    expect(campo.selectionStart).toBe(2)
    expect(campo.selectionEnd).toBe(4)
  })

  it("CC-4: autocomplete, name, required, aria-invalid y aria-describedby iguales en los dos estados; CC-5: spellcheck", () => {
    render(
      <form onSubmit={(e) => e.preventDefault()}>
        <CampoContrasena
          id="contrasena"
          nombreDelBoton={NOMBRE}
          name="contrasena"
          autoComplete="current-password"
          required
          aria-invalid={true}
          aria-describedby="contrasena-error"
        />
      </form>,
    )
    const boton = screen.getByRole("button", { name: NOMBRE })
    const campo = document.getElementById("contrasena") as HTMLInputElement

    const atributos = () => ({
      autocomplete: campo.getAttribute("autocomplete"),
      name: campo.getAttribute("name"),
      required: campo.hasAttribute("required"),
      ariaInvalid: campo.getAttribute("aria-invalid"),
      ariaDescribedby: campo.getAttribute("aria-describedby"),
    })

    const antes = atributos()
    expect(campo).toHaveAttribute("spellcheck", "false")

    fireEvent.click(boton)

    expect(atributos()).toEqual(antes)
    expect(campo).toHaveAttribute("spellcheck", "false")
  })

  it("CC-6 (P-04 A): al enviar el formulario, la contraseña vuelve a ocultarse y el botón a aria-pressed=false, con el mismo nombre", () => {
    renderizar(vi.fn())
    const boton = screen.getByRole("button", { name: NOMBRE })
    const campo = document.getElementById("contrasena") as HTMLInputElement
    const formulario = campo.form as HTMLFormElement

    fireEvent.click(boton)
    expect(campo).toHaveAttribute("type", "text")
    expect(boton).toHaveAttribute("aria-pressed", "true")

    fireEvent.submit(formulario)

    expect(campo).toHaveAttribute("type", "password")
    expect(boton).toHaveAttribute("aria-pressed", "false")
    expect(boton).toHaveAccessibleName(NOMBRE)
  })

  it("T-01 (ronda 1 de 01b-2): al ocultarse por el envío, el cursor se queda donde lo dejó la persona, no vuelve a una selección vieja", () => {
    renderizar(vi.fn())
    const boton = screen.getByRole("button", { name: NOMBRE })
    const campo = document.getElementById("contrasena") as HTMLInputElement
    const formulario = campo.form as HTMLFormElement

    campo.value = "abcdef"
    campo.focus()
    campo.setSelectionRange(2, 2)

    fireEvent.mouseDown(boton)
    fireEvent.click(boton)
    expect(campo).toHaveAttribute("type", "text")
    expect(campo.selectionStart).toBe(2)

    // La persona mueve el cursor al final antes de enviar.
    campo.setSelectionRange(6, 6)

    fireEvent.submit(formulario)

    expect(campo).toHaveAttribute("type", "password")
    expect(campo.selectionStart).toBe(6)
    expect(campo.selectionEnd).toBe(6)
  })

  it("CC-7: dos campos en el mismo formulario cambian por separado", () => {
    render(
      <form onSubmit={(e) => e.preventDefault()}>
        <CampoContrasena id="uno" nombreDelBoton="Mostrar uno" name="uno" />
        <CampoContrasena id="dos" nombreDelBoton="Mostrar dos" name="dos" />
      </form>,
    )
    const botonUno = screen.getByRole("button", { name: "Mostrar uno" })
    const campoUno = document.getElementById("uno") as HTMLInputElement
    const campoDos = document.getElementById("dos") as HTMLInputElement

    fireEvent.click(botonUno)

    expect(campoUno).toHaveAttribute("type", "text")
    expect(campoDos).toHaveAttribute("type", "password")
  })
})
