import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { rutas } from "@/app/router"
import { consultaMe as consultaMeDesdeSesion } from "@/services/sesionService"
import { limpiarToken } from "@/services/tokenAcceso"

import { consultaMe as consultaMeDesdeAuth } from "./hooks"

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/login") }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const meDe = (nombre: string) => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre,
  email: `${nombre.toLowerCase()}@ejemplo.mx`,
  rol: "estudiante",
  debeCambiarContrasena: false,
  accesoRestringido: false,
})

const stubFetch = (manejador: (ruta: string) => Response | Promise<Response>) => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => Promise.resolve(manejador(String(entrada))))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

afterEach(() => {
  limpiarToken()
  vi.unstubAllGlobals()
})

describe("cambio de identidad (CLASES-a)", () => {
  it("PR-A23a: con ['clases', 'inscritas'] de la cuenta A en caché, entrar con B deja esa consulta fuera de la caché antes del primer render del inicio de B", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/login") return respuestaJson(200, { tokenAcceso: "token-b" })
      if (ruta.startsWith("/api/clases/inscritas")) {
        // Si la consulta vieja siguiera en caché, TanStack Query no volvería a pedirla: esta
        // respuesta demuestra que sí se pidió de nuevo, ya sin datos de A.
        return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
      }
      return respuestaJson(200, meDe("Beto"))
    })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(["clases", "inscritas"], {
      pages: [{ clases: [{ id: "x", nombre: "Clase de Ana", maestro: { nombre: "Prof" } }] }],
      pageParams: [undefined],
    })

    const router = createMemoryRouter(rutas, { initialEntries: ["/login"] })
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "beto@ejemplo.mx" } })
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "clave-de-prueba-1234" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
    // La consulta vieja de "clases" ya no está en caché: nunca se ve "Clase de Ana" de la cuenta A.
    expect(screen.queryByText("Clase de Ana")).not.toBeInTheDocument()
    expect(await screen.findByText("Hola, Beto")).toBeInTheDocument()
  })

  it("PR-A23b: consultaMe importada de features/auth/hooks y de services/sesionService es el mismo objeto", () => {
    expect(consultaMeDesdeAuth).toBe(consultaMeDesdeSesion)
  })
})
