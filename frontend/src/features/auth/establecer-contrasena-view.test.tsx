import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { EstablecerContrasenaView } from "./establecer-contrasena-view"

const TOKEN = "B".repeat(43)

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: cuerpo === undefined ? {} : { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

const stubFetch = (manejador: (ruta: string, init?: RequestInit) => Response) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) =>
    Promise.resolve(manejador(String(entrada), init)),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderVista = () => {
  const router = createMemoryRouter(
    [
      { path: "/establecer-contrasena", element: <EstablecerContrasenaView /> },
      { path: "/login", element: <p>Pantalla de login</p> },
    ],
    { initialEntries: [{ pathname: "/establecer-contrasena", hash: `#token=${TOKEN}` }] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const llenarYEnviar = () => {
  fireEvent.change(screen.getByLabelText("Contraseña nueva"), {
    target: { value: "clave-nueva-1234" },
  })
  fireEvent.change(screen.getByLabelText("Confirma la contraseña nueva"), {
    target: { value: "clave-nueva-1234" },
  })
  fireEvent.click(screen.getByRole("button", { name: "Activar mi cuenta" }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("EstablecerContrasenaView", () => {
  it("al elegir la contraseña, llega a /login con el aviso de cuenta activada", async () => {
    stubFetch(() => respuestaJson(204, undefined))
    const router = renderVista()

    llenarYEnviar()

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(router.state.location.state).toEqual({ aviso: "cuenta-activada" })
  })

  it("con ENLACE_INVALIDO muestra el mensaje de enlace vencido", async () => {
    stubFetch(() => errorJson(400, "ENLACE_INVALIDO"))
    renderVista()

    llenarYEnviar()

    expect(
      await screen.findByText(
        "El enlace no es válido o ya venció. Pide uno nuevo en ¿Olvidaste tu contraseña? o acude a administración.",
      ),
    ).toBeInTheDocument()
  })

  it("envía la petición a /api/auth/establecer-contrasena, no a /api/auth/restablecer", async () => {
    const fetchMock = stubFetch(() => respuestaJson(204, undefined))
    renderVista()

    llenarYEnviar()

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([entrada]) => String(entrada) === "/api/auth/establecer-contrasena",
        ),
      ).toBe(true),
    )
    expect(
      fetchMock.mock.calls.some(([entrada]) => String(entrada) === "/api/auth/restablecer"),
    ).toBe(false)
  })
})
