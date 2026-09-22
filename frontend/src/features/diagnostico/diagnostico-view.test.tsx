import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DiagnosticoView } from "./diagnostico-view"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const renderVista = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <DiagnosticoView />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("DiagnosticoView", () => {
  it("muestra el estado de la API y de la base de datos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          respuestaJson(200, {
            estado: "ok",
            baseDeDatos: "ok",
            marcaDeTiempo: "2026-09-22T14:42:06.290Z",
          }),
        ),
      ),
    )

    renderVista()

    expect(await screen.findByText("Base de datos: ok")).toBeInTheDocument()
    expect(screen.getByText("API: ok")).toBeInTheDocument()
  })

  it("muestra el error tipado cuando la API responde 503", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          respuestaJson(503, {
            error: {
              codigo: "BASE_DE_DATOS_NO_DISPONIBLE",
              mensaje: "La base de datos no responde.",
            },
          }),
        ),
      ),
    )

    renderVista()

    const alerta = await screen.findByRole("alert")
    expect(alerta).toHaveTextContent("BASE_DE_DATOS_NO_DISPONIBLE")
    expect(alerta).toHaveTextContent("La base de datos no responde.")
  })
})
