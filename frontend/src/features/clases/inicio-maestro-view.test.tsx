import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { InicioMaestroView } from "./inicio-maestro-view"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const ME = {
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Luis Pérez",
  email: "luis@ejemplo.mx",
  rol: "maestro",
  debeCambiarContrasena: false,
  accesoRestringido: false,
}

const clase = (n: number, extra: Record<string, unknown> = {}) => ({
  id: `2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d0${String(n)}`,
  nombre: `Clase ${String(n)}`,
  alumnos: n,
  ...extra,
})

interface Api {
  impartidas?: () => Response | Promise<Response>
}

const stubApi = (api: Api) => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => {
    const ruta = String(entrada)
    if (ruta === "/api/me") return Promise.resolve(respuestaJson(200, ME))
    if (ruta.startsWith("/api/clases/impartidas")) {
      return Promise.resolve(
        api.impartidas?.() ?? respuestaJson(200, { clases: [], total: 0, siguienteCursor: null }),
      )
    }
    return Promise.resolve(respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "" } }))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderVista = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <InicioMaestroView />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  limpiarToken()
  vi.unstubAllGlobals()
})

describe("InicioMaestroView", () => {
  it("PR-A19a: las tarjetas muestran 'N alumnos'", async () => {
    stubApi({
      impartidas: () => respuestaJson(200, { clases: [clase(3)], total: 1, siguienteCursor: null }),
    })
    renderVista()

    expect(await screen.findByText("3 alumnos")).toBeInTheDocument()
  })

  it("PR-A19b: 'Crear clase' apunta a /maestro/clases/nueva", async () => {
    stubApi({})
    renderVista()

    expect(await screen.findByRole("link", { name: "Crear clase" })).toHaveAttribute(
      "href",
      "/maestro/clases/nueva",
    )
  })

  it("PR-A19c: la acción del vacío 'Crea tu primera clase' es outline", async () => {
    stubApi({})
    renderVista()

    const accion = await screen.findByRole("button", { name: "Crea tu primera clase" })
    expect(accion).toHaveAttribute("data-variant", "outline")
  })

  it("PR-A19d: cada tarjeta es un enlace con el nombre de la clase y destino /maestro/clases/{id}", async () => {
    stubApi({
      impartidas: () => respuestaJson(200, { clases: [clase(1)], total: 1, siguienteCursor: null }),
    })
    renderVista()

    const enlace = await screen.findByRole("link", { name: "Clase 1" })
    expect(enlace).toHaveAttribute("href", `/maestro/clases/${clase(1).id}`)
  })
})
