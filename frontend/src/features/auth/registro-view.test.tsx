import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { rutas } from "@/app/router"
import { limpiarToken } from "@/services/tokenAcceso"

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/registro") }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const meEstudiante = {
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

const renderRegistro = () => {
  const router = createMemoryRouter(rutas, { initialEntries: ["/registro"] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const llenarYEnviar = (contrasena: string) => {
  fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana López" } })
  fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "ana@ejemplo.mx" } })
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: contrasena } })
  fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }))
}

afterEach(() => {
  limpiarToken()
  vi.unstubAllGlobals()
})

describe("RegistroView", () => {
  it("con una contraseña corta no envía nada y muestra la ayuda y el error", () => {
    const fetchMock = stubFetch(() => respuestaJson(201, {}))
    const router = renderRegistro()

    llenarYEnviar("corta")

    expect(fetchMock).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe("/registro")
    expect(screen.getByText("Mínimo 10 caracteres")).toBeInTheDocument()
    expect(screen.getByText("La contraseña debe tener al menos 10 caracteres")).toBeInTheDocument()
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("aria-invalid", "true")
  })

  it("al registrarse queda con sesión y llega a /estudiante", async () => {
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/registro") return respuestaJson(201, { tokenAcceso: "token-nuevo" })
      return respuestaJson(200, meEstudiante)
    })
    const router = renderRegistro()

    llenarYEnviar("clave-de-prueba-1234")

    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
    const [registro] = fetchMock.mock.calls
    expect(String(registro?.[0])).toBe("/api/auth/registro")
    expect(JSON.parse(String(registro?.[1]?.body))).toEqual({
      nombre: "Ana López",
      email: "ana@ejemplo.mx",
      contrasena: "clave-de-prueba-1234",
    })
  })

  it("con CORREO_EN_USO muestra la alerta y sigue en /registro", async () => {
    stubFetch(() =>
      respuestaJson(409, {
        error: { codigo: "CORREO_EN_USO", mensaje: "Ya existe una cuenta con ese correo." },
      }),
    )
    const router = renderRegistro()

    llenarYEnviar("clave-de-prueba-1234")

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.",
    )
    expect(router.state.location.pathname).toBe("/registro")
  })
})
