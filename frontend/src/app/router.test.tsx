import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const sesionInvalida = () =>
  respuestaJson(401, { error: { codigo: "SESION_INVALIDA", mensaje: "Tu sesión terminó." } })

const me = (extra: Record<string, unknown> = {}) => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol: "estudiante",
  debeCambiarContrasena: false,
  accesoRestringido: false,
  ...extra,
})

const stubFetch = (manejador: (ruta: string) => Response) => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => Promise.resolve(manejador(String(entrada))))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadasA = (fetchMock: ReturnType<typeof stubFetch>, ruta: string) =>
  fetchMock.mock.calls.filter(([entrada]) => String(entrada) === ruta).length

// Módulos de la aplicación frescos en cada prueba: restaurarSesion memoiza su resultado por carga y
// el token vive en memoria del módulo.
const renderEn = async (ruta: string) => {
  const { rutas } = await import("./router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

// La primera importación transforma todo el árbol de la aplicación (varios segundos en frío); se
// hace una vez aquí para que cada prueba solo reevalúe módulos ya transformados.
beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("rutas", () => {
  it("la raíz redirige a /login", async () => {
    stubFetch(() => sesionInvalida())
    const router = await renderEn("/")
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
  })

  it("una ruta por rol sin sesión redirige a /login", async () => {
    stubFetch(() => sesionInvalida())
    const router = await renderEn("/maestro")
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
  })

  it("con /me de estudiante, /maestro termina en /estudiante con su bienvenida", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "restaurado" })
      return respuestaJson(200, me())
    })

    const router = await renderEn("/maestro")

    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
    expect(await screen.findByRole("heading", { name: "Hola, Ana López" })).toBeInTheDocument()
    expect(screen.getByText("Estudiante")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument()
  })

  it("con accesoRestringido, /estudiante termina en /acceso-restringido con el motivo", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "restaurado" })
      return respuestaJson(
        200,
        me({ accesoRestringido: true, motivoRestriccion: "Adeudo de colegiatura" }),
      )
    })

    const router = await renderEn("/estudiante")

    await waitFor(() => expect(router.state.location.pathname).toBe("/acceso-restringido"))
    expect(
      await screen.findByText("Tu acceso está restringido. Acude a administración."),
    ).toBeInTheDocument()
    expect(screen.getByText("Adeudo de colegiatura")).toBeInTheDocument()
  })

  it("sin token y /refrescar 401: /estudiante termina en /login con una llamada a /refrescar, ninguna a /me y sin irA", async () => {
    const fetchMock = stubFetch(() => sesionInvalida())

    const router = await renderEn("/estudiante")

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(1)
    expect(llamadasA(fetchMock, "/api/me")).toBe(0)
    const { irA } = await import("@/services/navegacion")
    expect(irA).not.toHaveBeenCalled()
  })
})
