import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { CambiarContrasenaView } from "./cambiar-contrasena-view"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: cuerpo === undefined ? {} : { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

const me = {
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol: "estudiante",
  debeCambiarContrasena: false,
  accesoRestringido: false,
}

const stubFetch = (manejador: (ruta: string) => Response) => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => Promise.resolve(manejador(String(entrada))))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderVista = () => {
  const router = createMemoryRouter(
    [
      { path: "/cambiar-contrasena", element: <CambiarContrasenaView /> },
      { path: "/estudiante", element: <p>Dashboard del estudiante</p> },
      { path: "/login", element: <p>Pantalla de login</p> },
    ],
    { initialEntries: ["/cambiar-contrasena"] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const llenar = (temporal: string, nueva: string, confirmacion: string) => {
  fireEvent.change(screen.getByLabelText("Contraseña temporal"), { target: { value: temporal } })
  fireEvent.change(screen.getByLabelText("Contraseña nueva"), { target: { value: nueva } })
  fireEvent.change(screen.getByLabelText("Confirma la contraseña nueva"), {
    target: { value: confirmacion },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  limpiarToken()
})

describe("CambiarContrasenaView", () => {
  it("al guardar la contraseña nueva, consulta /me y llega al dashboard del rol", async () => {
    establecerToken("token-vigente")
    stubFetch((ruta) => {
      if (ruta === "/api/auth/cambiar-contrasena") return respuestaJson(204, undefined)
      return respuestaJson(200, me)
    })
    const router = renderVista()

    llenar("temporal-vieja-1234", "clave-nueva-1234", "clave-nueva-1234")
    fireEvent.click(screen.getByRole("button", { name: "Guardar y continuar" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
  })

  it("con una temporal incorrecta muestra la alerta", async () => {
    stubFetch(() => errorJson(400, "CONTRASENA_ACTUAL_INCORRECTA"))
    renderVista()

    llenar("temporal-equivocada", "clave-nueva-1234", "clave-nueva-1234")
    fireEvent.click(screen.getByRole("button", { name: "Guardar y continuar" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La contraseña temporal no es correcta.",
    )
  })

  it("con una confirmación distinta no envía nada", () => {
    const fetchMock = stubFetch(() => respuestaJson(204, undefined))
    renderVista()

    llenar("temporal-vieja-1234", "clave-nueva-1234", "otra-distinta-999")
    fireEvent.click(screen.getByRole("button", { name: "Guardar y continuar" }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument()
  })

  it("'Cerrar sesión' lleva a /login", async () => {
    stubFetch(() => respuestaJson(204, undefined))
    const router = renderVista()

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
  })
})
