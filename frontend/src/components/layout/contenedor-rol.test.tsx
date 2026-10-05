import { render, screen, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it, vi } from "vitest"

import { ContenedorRol } from "./contenedor-rol"
import { DESTINOS_POR_ROL } from "./data"

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

  // AUTH-03b: el admin gana "Maestros" (/admin/maestros); CLASES-02c (C-14, P-07 a), "Clases".
  it("con rol admin, hay tres enlaces: 'Cuentas' hacia /admin, 'Maestros' hacia /admin/maestros y 'Clases' hacia /admin/clases", () => {
    renderizar("admin")
    const cuentas = screen.getByRole("link", { name: "Cuentas" })
    expect(cuentas).toHaveAttribute("href", "/admin")
    expect(cuentas).toHaveAttribute("aria-current", "page")
    const maestros = screen.getByRole("link", { name: "Maestros" })
    expect(maestros).toHaveAttribute("href", "/admin/maestros")
    expect(maestros).not.toHaveAttribute("aria-current")
    const clases = screen.getByRole("link", { name: "Clases" })
    expect(clases).toHaveAttribute("href", "/admin/clases")
    expect(clases).not.toHaveAttribute("aria-current")
    expect(
      within(screen.getByRole("navigation", { name: "Navegación principal" }))
        .getAllByRole("link")
        .map((enlace) => enlace.textContent),
    ).toEqual(["Cuentas", "Maestros", "Clases"])
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

// CLASES-02c (PR-2C11, Enmienda 1, M-04): cada destino declara su coincidencia. "Clases" queda activo
// en todas sus subrutas; "Cuentas" y "Maestros", solo en su ruta exacta.
describe("destinos del administrador y su coincidencia", () => {
  const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"

  const renderizarAdminEn = (ruta: string) =>
    render(
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route
            path="/admin"
            element={
              <ContenedorRol
                rol="admin"
                nombre="Ana Torres"
                etiquetaRol="Administrador"
                onCerrarSesion={vi.fn()}
                cerrando={false}
              />
            }
          >
            <Route index element={<p>Contenido</p>} />
            <Route path="*" element={<p>Contenido</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

  const activos = () =>
    within(screen.getByRole("navigation", { name: "Navegación principal" }))
      .getAllByRole("link")
      .filter((enlace) => enlace.getAttribute("aria-current") === "page")
      .map((enlace) => enlace.textContent)

  it.each([
    ["/admin", ["Cuentas"]],
    ["/admin/maestros", ["Maestros"]],
    ["/admin/clases", ["Clases"]],
    ["/admin/clases/nueva", ["Clases"]],
    [`/admin/clases/${CLASE_ID}`, ["Clases"]],
    [`/admin/clases/${CLASE_ID}/maestros`, ["Clases"]],
    [`/admin/clases/${CLASE_ID}/editar`, ["Clases"]],
  ])("en %s solo queda activo %j", (ruta, esperados) => {
    renderizarAdminEn(ruta)
    expect(activos()).toEqual(esperados)
  })

  it("todo destino de DESTINOS_POR_ROL declara su coincidencia, y solo «Clases» es de prefijo", () => {
    const todos = Object.values(DESTINOS_POR_ROL).flat()
    for (const destino of todos) {
      expect(["exacta", "prefijo"], destino.etiqueta).toContain(destino.coincidencia)
    }
    expect(todos.filter((d) => d.coincidencia === "prefijo").map((d) => d.etiqueta)).toEqual([
      "Clases",
    ])
  })
})
