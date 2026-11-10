import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// ADMIN-01g, ronda 1 (T-01, R-23, autorizado por el humano el 2026-11-09): en /admin/usuarios, en la
// ficha de una cuenta y en el resumen de /admin, un 401 con el refresco fallido lo resuelve apiClient
// (lleva al login): la vista no pinta su texto de error de carga ni avisa, y ningún botón queda en espera.
// Router real y Providers; el servidor es un doble en memoria.

const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))
vi.mock("@/services/navegacion", () => navegacion)
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const ESPERA = { timeout: 4000 }
const CUENTA = {
  id: "b7e6a1a0-1111-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Carla Ruiz",
  email: "carla@ejemplo.mx",
  rol: "maestro",
  activo: true,
  creadoEn: "2026-09-01T15:00:00.000Z",
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const noAutenticado = () =>
  respuestaJson(401, { error: { codigo: "NO_AUTENTICADO", mensaje: "sesión terminada" } })

let refrescoFalla = false
let responder: (url: URL) => Response | null = () => null

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  refrescoFalla = false
  responder = () => null
  navegacion.irA.mockClear()
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) => {
      const url = new URL(String(entrada), "http://local")
      if (url.pathname === "/api/auth/refrescar") {
        return Promise.resolve(
          refrescoFalla ? noAutenticado() : respuestaJson(200, { tokenAcceso: "t" }),
        )
      }
      if (url.pathname === "/api/me") {
        return Promise.resolve(
          respuestaJson(200, {
            id: "d9a8c3c2-3333-4da0-9c3a-2b4c5d6e7f80",
            nombre: "Administración",
            email: "admin@ejemplo.mx",
            rol: "admin",
            debeCambiarContrasena: false,
            accesoRestringido: false,
          }),
        )
      }
      const propia = responder(url)
      if (propia !== null) return Promise.resolve(propia)
      return Promise.resolve(
        respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } }),
      )
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.error.mockClear()
})

const montar = async (ruta: string) => {
  const { rutas } = await import("@/app/router")
  render(
    <Providers>
      <RouterProvider router={createMemoryRouter(rutas, { initialEntries: [ruta] })} />
    </Providers>,
  )
  await screen.findByRole("navigation", { name: "Navegación principal" })
}

const sinMensajeNiEspera = async () => {
  await waitFor(() => expect(navegacion.irA).toHaveBeenCalled(), ESPERA)
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
  expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0)
  expect(aviso.error).not.toHaveBeenCalled()
  expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(0)
}

describe("ADMIN-01g, ronda 1 · un error que redirige no se pinta en las vistas de 01f (T-01)", () => {
  it("T-01: un 401 con el refresco fallido en la primera carga de /admin/usuarios: ningún mensaje", async () => {
    refrescoFalla = true
    responder = (url) => (url.pathname === "/api/admin/usuarios" ? noAutenticado() : null)
    await montar("/admin/usuarios")
    await sinMensajeNiEspera()
    expect(screen.queryByText(/No pudimos cargar los usuarios/)).toBeNull()
  })

  it("T-01: un 401 con el refresco fallido en «Cargar más usuarios»: ningún mensaje, la tabla se queda y nada en espera", async () => {
    responder = (url) => {
      if (url.pathname !== "/api/admin/usuarios") return null
      if (url.searchParams.has("cursor")) return noAutenticado()
      return respuestaJson(200, {
        usuarios: [CUENTA],
        siguienteCursor: CUENTA.id,
        siguienteCursorNombre: CUENTA.nombre,
      })
    }
    await montar("/admin/usuarios")
    const cargarMas = await screen.findByRole("button", { name: "Cargar más usuarios" }, ESPERA)
    refrescoFalla = true
    fireEvent.click(cargarMas)
    await sinMensajeNiEspera()
    expect(screen.getByRole("table")).toBeInTheDocument()
  })

  it("T-01: un 401 con el refresco fallido al abrir la ficha: ningún mensaje (tampoco «Esa cuenta ya no existe.»)", async () => {
    refrescoFalla = true
    responder = (url) =>
      url.pathname === `/api/admin/usuarios/${CUENTA.id}` ? noAutenticado() : null
    await montar(`/admin/usuarios/${CUENTA.id}`)
    await sinMensajeNiEspera()
    expect(screen.queryByText("Esa cuenta ya no existe.")).toBeNull()
  })

  it("T-01: un 401 con el refresco fallido en el resumen de /admin: ningún mensaje y los accesos siguen", async () => {
    refrescoFalla = true
    responder = (url) => (url.pathname === "/api/admin/resumen" ? noAutenticado() : null)
    await montar("/admin")
    await sinMensajeNiEspera()
    expect(screen.queryByText(/No pudimos cargar el resumen/)).toBeNull()
    expect(screen.getAllByRole("link", { name: "Usuarios" }).length).toBeGreaterThan(1)
  })
})
