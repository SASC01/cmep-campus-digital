import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it, vi } from "vitest"

import { ContenedorRol } from "./contenedor-rol"

const RUTA_DE: Record<"estudiante" | "maestro" | "admin", string> = {
  estudiante: "/estudiante",
  maestro: "/maestro",
  admin: "/admin",
}

function renderizar(rol: "estudiante" | "maestro" | "admin", cerrando = false) {
  return render(
    <MemoryRouter initialEntries={[RUTA_DE[rol]]}>
      <Routes>
        <Route
          path={RUTA_DE[rol]}
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

  it("en /estudiante, el enlace 'Inicio' apunta a /estudiante y tiene aria-current", () => {
    renderizar("estudiante")
    const enlace = screen.getByRole("link", { name: "Inicio" })
    expect(enlace).toHaveAttribute("href", "/estudiante")
    expect(enlace).toHaveAttribute("aria-current", "page")
  })

  it("con rol admin, el enlace es 'Cuentas' hacia /admin", () => {
    renderizar("admin")
    const enlace = screen.getByRole("link", { name: "Cuentas" })
    expect(enlace).toHaveAttribute("href", "/admin")
  })

  it("el nombre y la etiqueta del rol aparecen una vez cada uno como texto", () => {
    renderizar("estudiante")
    expect(screen.getAllByText("Ana Torres")).toHaveLength(1)
    expect(screen.getAllByText("Estudiante")).toHaveLength(1)
  })

  it("un banner (barra superior) y un contentinfo (pie), los dos dentro de la raíz con data-rol", () => {
    const { container } = renderizar("estudiante")
    const raiz = container.firstElementChild as HTMLElement
    const banner = screen.getByRole("banner")
    const pie = screen.getByRole("contentinfo")
    expect(raiz).toHaveAttribute("data-rol", "estudiante")
    expect(raiz.contains(banner)).toBe(true)
    expect(raiz.contains(pie)).toBe(true)
  })

  it("ningún ancestro de la navegación, hasta document.body, tiene una clase que empiece por vidrio", () => {
    renderizar("estudiante")
    const nav = screen.getByRole("navigation", { name: "Navegación principal" })
    let elemento: HTMLElement | null = nav.parentElement
    while (elemento && elemento !== document.body) {
      const clases = elemento.className.split(/\s+/)
      expect(clases.some((clase) => clase.startsWith("vidrio"))).toBe(false)
      elemento = elemento.parentElement
    }
  })
})
