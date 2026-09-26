import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { RestablecerView } from "./restablecer-view"

const TOKEN = "A".repeat(43)

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

const renderVista = (hash = `#token=${TOKEN}`) => {
  const router = createMemoryRouter(
    [
      { path: "/restablecer", element: <RestablecerView /> },
      { path: "/recuperar", element: <p>Pantalla de recuperar</p> },
      { path: "/login", element: <p>Pantalla de login</p> },
    ],
    { initialEntries: [{ pathname: "/restablecer", hash }] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("RestablecerView", () => {
  it("lee el token del fragmento y lo quita de la URL sin usar localStorage ni sessionStorage", async () => {
    stubFetch(() => respuestaJson(204, undefined))
    const router = renderVista()

    await waitFor(() => expect(router.state.location.hash).toBe(""))
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })

  it("envía { token, contrasena } y llega a /login con el aviso", async () => {
    const fetchMock = stubFetch(() => respuestaJson(204, undefined))
    const router = renderVista()
    await waitFor(() => expect(router.state.location.hash).toBe(""))

    fireEvent.change(screen.getByLabelText("Contraseña nueva"), {
      target: { value: "clave-nueva-1234" },
    })
    fireEvent.change(screen.getByLabelText("Confirma la contraseña nueva"), {
      target: { value: "clave-nueva-1234" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(router.state.location.state).toEqual({ aviso: "contrasena-actualizada" })
    const llamada = fetchMock.mock.calls.find(
      ([entrada]) => String(entrada) === "/api/auth/restablecer",
    )
    expect(llamada).toBeDefined()
    expect(JSON.parse(String(llamada?.[1]?.body))).toEqual({
      token: TOKEN,
      contrasena: "clave-nueva-1234",
    })
  })

  it("con ENLACE_INVALIDO muestra el mensaje y el enlace a /recuperar", async () => {
    stubFetch(() => errorJson(400, "ENLACE_INVALIDO"))
    renderVista()

    fireEvent.change(screen.getByLabelText("Contraseña nueva"), {
      target: { value: "clave-nueva-1234" },
    })
    fireEvent.change(screen.getByLabelText("Confirma la contraseña nueva"), {
      target: { value: "clave-nueva-1234" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }))

    expect(
      await screen.findByText("El enlace no es válido o ya venció. Pide uno nuevo."),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Pedir otro enlace" })).toHaveAttribute(
      "href",
      "/recuperar",
    )
  })

  it("sin token muestra el estado de enlace inválido sin hacer ninguna petición", () => {
    const fetchMock = stubFetch(() => respuestaJson(204, undefined))
    renderVista("")

    expect(
      screen.getByText("El enlace no es válido o ya venció. Pide uno nuevo."),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("con una confirmación distinta no envía nada", () => {
    const fetchMock = stubFetch(() => respuestaJson(204, undefined))
    renderVista()

    fireEvent.change(screen.getByLabelText("Contraseña nueva"), {
      target: { value: "clave-nueva-1234" },
    })
    fireEvent.change(screen.getByLabelText("Confirma la contraseña nueva"), {
      target: { value: "otra-clave-9999" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument()
  })
})
