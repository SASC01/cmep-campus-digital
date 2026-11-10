import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ContenedorRol } from "./contenedor-rol"

// Ataque del Tester (ADMIN-01g, ronda 1), punto 4 de "Puntos de ataque finales para la ronda 1"
// (revision.md, "## Verificación de la corrección — ADMIN-01g"): E-06 en los tres roles, con la ruta en
// mayúsculas y con varias barras finales; ninguna ruta parecida se activa por prefijo. El marco se monta
// con la ruta de su rol y un comodín, como contenedor-rol.test.tsx.

beforeEach(() => {
  establecerToken("token-de-prueba")
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ clases: [], total: 0, siguienteCursor: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
})

type Rol = "estudiante" | "maestro" | "admin"

const montarEn = (rol: Rol, ruta: string) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route
            path={`/${rol}`}
            element={
              <ContenedorRol
                rol={rol}
                nombre="Ana Torres"
                etiquetaRol="Rol"
                onCerrarSesion={vi.fn()}
                cerrando={false}
              />
            }
          >
            <Route index element={<p>Contenido</p>} />
            <Route path="*" element={<p>Contenido</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const activos = () =>
  within(screen.getByRole("navigation", { name: "Navegación principal" }))
    .getAllByRole("link")
    .filter((enlace) => enlace.getAttribute("aria-current") === "page")
    .map((enlace) => enlace.textContent)

describe("ATQ-1G R1 · E-06: el destino activo en los tres roles (punto 4)", () => {
  it.each([
    ["admin", "/ADMIN", ["Inicio"]],
    ["admin", "/ADMIN/", ["Inicio"]],
    ["admin", "/admin//", ["Inicio"]],
    ["admin", "/admin///", ["Inicio"]],
    ["admin", "/Admin/Usuarios/", ["Usuarios"]],
    ["admin", "/admin/usuarios//", ["Usuarios"]],
    ["admin", "/ADMIN/ESTADO-PAGO//", ["Estado de pago"]],
    ["admin", "/admin/Movimientos/", ["Movimientos"]],
    ["admin", "/admin/MAESTROS", ["Maestros"]],
    ["admin", "/admin/CLASES/2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01/", ["Clases"]],
    ["admin", "/admin/usuarios-x", []],
    ["admin", "/admin/usuariosx/abc", []],
    ["admin", "/admin/clasesx", []],
    ["admin", "/admin/clases-archivadas", []],
    ["admin", "/admin/estado-pagox", []],
    ["admin", "/admin/estado-pago/x", []],
    ["admin", "/admin/movimientos/x", []],
    ["admin", "/admin/maestros/x", []],
    ["admin", "/admin/inicio", []],
    ["estudiante", "/ESTUDIANTE/", ["Inicio"]],
    ["estudiante", "/estudiante//", ["Inicio"]],
    ["estudiante", "/estudiante/clases/x", []],
    ["maestro", "/MAESTRO//", ["Inicio"]],
    ["maestro", "/Maestro/", ["Inicio"]],
    ["maestro", "/maestro/clases/x", []],
  ] as const)("ATQ-1G22 (%s): en %s solo queda activo %j", (rol, ruta, esperados) => {
    montarEn(rol, ruta)
    expect(activos()).toEqual(esperados)
  })
})
