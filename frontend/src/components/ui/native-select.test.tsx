import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { NativeSelect, NativeSelectOption } from "./native-select"

const renderizar = (props: { invalido?: boolean } = {}) =>
  render(
    <div>
      <label htmlFor="categoria">Categoría</label>
      <NativeSelect id="categoria" defaultValue="" aria-invalid={props.invalido}>
        <NativeSelectOption value="">Elige una categoría</NativeSelectOption>
        <NativeSelectOption value="a">Examen (40 %)</NativeSelectOption>
        <NativeSelectOption value="b">Tareas (60 %)</NativeSelectOption>
      </NativeSelect>
    </div>,
  )

describe("NativeSelect (PR-1D08)", () => {
  it("PR-1D08: la etiqueta queda asociada y se puede elegir una opción", () => {
    renderizar()
    const selector = screen.getByRole("combobox", { name: "Categoría" })
    expect(selector).toHaveValue("")
    expect(screen.getByRole("option", { name: "Elige una categoría" })).toBeInTheDocument()

    fireEvent.change(selector, { target: { value: "b" } })

    expect(selector).toHaveValue("b")
  })

  it("PR-1D08: el estado inválido sale en aria-invalid y la ausencia no lo pone", () => {
    const { unmount } = renderizar({ invalido: true })
    expect(screen.getByRole("combobox", { name: "Categoría" })).toHaveAttribute(
      "aria-invalid",
      "true",
    )
    unmount()
    renderizar()
    expect(screen.getByRole("combobox", { name: "Categoría" })).not.toHaveAttribute("aria-invalid")
  })

  it("PR-1D08: usa tokens y ninguna clase de las escalas anuladas de Tailwind", () => {
    renderizar()
    const clases = screen.getByRole("combobox", { name: "Categoría" }).className
    expect(clases).toContain("rounded-row")
    expect(clases).toContain("border-input")
    expect(clases).toContain("bg-surface")
    expect(clases).toContain("text-body")
    expect(clases).toContain("aria-invalid:border-destructive")
    expect(clases).not.toMatch(
      /(^|\s)(text-(xs|sm|base|lg|xl)|rounded-(sm|md|lg|xl|2xl)|shadow-(sm|md|lg|xl)|font-(medium|semibold)|backdrop-blur[\w-]*)(\s|$)/,
    )
    expect(clases).not.toMatch(/(^|\s)(bg|border|text)-(gray|slate|zinc|neutral|white|black)\b/)
  })

  it("PR-1D08: la altura sale de --control-height, como la del campo de una línea", () => {
    renderizar()
    expect(screen.getByRole("combobox", { name: "Categoría" }).className).toContain(
      "h-(--control-height)",
    )
  })

  it("PR-1D08: el chevron es decorativo y no se anuncia", () => {
    const { container } = renderizar()
    const iconos = container.querySelectorAll("svg")
    expect(iconos).toHaveLength(1)
    expect(iconos[0]).toHaveAttribute("aria-hidden", "true")
  })
})
