import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen } from "@testing-library/react"
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

  // CLASES-02c (C-12, §D-2C3): el maestro ya no crea clases; la administración se las asigna.
  it("PR-2C08: el inicio del maestro no tiene «Crear clase» ni tarjeta interna", async () => {
    stubApi({})
    renderVista()

    await screen.findByText(
      "La administración te asigna tus clases. Cuando lo haga, aparecerán aquí.",
    )
    expect(screen.queryByRole("link", { name: "Crear clase" })).toBeNull()
    expect(screen.queryByText("Nueva clase")).toBeNull()
  })

  it("PR-2C08: el vacío de «Mis clases» no tiene botón y dice que la administración asigna las clases", async () => {
    stubApi({})
    renderVista()

    expect(await screen.findByText("Aún no tienes clases", { selector: "p" })).toBeInTheDocument()
    expect(screen.getByText("La administración te asigna tus clases.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Crea tu primera clase" })).toBeNull()
    expect(screen.queryAllByRole("button")).toHaveLength(0)
  })

  it("PR-2C12: el 400 del cursor de «Ver más clases» muestra el texto que dice qué pasó", async () => {
    const cursor = "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
    let pedidas = 0
    stubApi({
      impartidas: () => {
        pedidas += 1
        if (pedidas > 1) {
          return respuestaJson(400, {
            error: { codigo: "VALIDACION", mensaje: "cursor: no es válido" },
          })
        }
        return respuestaJson(200, { clases: [clase(1)], total: 2, siguienteCursor: cursor })
      },
    })
    renderVista()

    fireEvent.click(await screen.findByRole("button", { name: "Ver más clases" }))

    expect(
      await screen.findByText(
        "Tus clases cambiaron mientras las veías. Vuelve a entrar para verlas completas.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/cursor/)).toBeNull()
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
