import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it, vi } from "vitest"

import { ContenedorRol } from "./contenedor-rol"

function renderizar(rol: "estudiante" | "maestro" | "admin", cerrando = false) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route
          path="/"
          element={
            <ContenedorRol
              rol={rol}
              nombre="Ana Torres"
              etiquetaRol="Estudiante"
              onCerrarSesion={vi.fn()}
              cerrando={cerrando}
            />
          }
        >
          <Route index element={<p>Contenido</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe("ContenedorRol", () => {
  it("con rol admin, la raíz tiene data-material y data-densidad", () => {
    const { container } = renderizar("admin")
    const raiz = container.firstElementChild
    expect(raiz).toHaveAttribute("data-material", "opaco")
    expect(raiz).toHaveAttribute("data-densidad", "densa")
  })

  it.each(["estudiante", "maestro"] as const)("con rol %s, ninguno de los dos", (rol) => {
    const { container } = renderizar(rol)
    const raiz = container.firstElementChild
    expect(raiz).not.toHaveAttribute("data-material")
    expect(raiz).not.toHaveAttribute("data-densidad")
  })

  it("con cerrando, 'Cerrar sesión' tiene aria-disabled, no está deshabilitado y conserva el foco", () => {
    renderizar("estudiante", true)
    const boton = screen.getByRole("button", { name: "Cerrar sesión" })
    expect(boton).toHaveAttribute("aria-disabled", "true")
    expect(boton).not.toBeDisabled()
  })

  it("un solo botón 'Cerrar sesión' y una sola navegación principal", () => {
    renderizar("estudiante")
    expect(screen.getAllByRole("button", { name: "Cerrar sesión" })).toHaveLength(1)
    expect(screen.getAllByRole("navigation", { name: "Navegación principal" })).toHaveLength(1)
  })
})
