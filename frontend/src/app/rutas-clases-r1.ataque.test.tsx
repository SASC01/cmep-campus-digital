import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Tester, CLASES-a, ronda 1. Rutas de clase de otro rol y de un restringido: la guarda del frontend
// redirige y la página no llega a pedir datos de la clase (la seguridad real está en el backend).

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"

const me = (extra: Record<string, unknown> = {}) => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol: "estudiante",
  debeCambiarContrasena: false,
  accesoRestringido: false,
  ...extra,
})

const stubFetch = (datosMe: Record<string, unknown>) => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => {
    const ruta = String(entrada)
    if (ruta === "/api/auth/refrescar") {
      return Promise.resolve(respuestaJson(200, { tokenAcceso: "restaurado" }))
    }
    if (ruta === "/api/me") return Promise.resolve(respuestaJson(200, datosMe))
    if (ruta.startsWith("/api/clases/inscritas") || ruta.startsWith("/api/clases/impartidas")) {
      return Promise.resolve(respuestaJson(200, { clases: [], total: 0, siguienteCursor: null }))
    }
    return Promise.resolve(
      respuestaJson(403, { error: { codigo: "SIN_ACCESO_A_LA_CLASE", mensaje: "No." } }),
    )
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderEn = async (ruta: string) => {
  const { rutas } = await import("./router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const pidioAlgoDeLaClase = (fetchMock: ReturnType<typeof stubFetch>) =>
  fetchMock.mock.calls.filter(([entrada]) => String(entrada).includes(CLASE_ID)).length

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ataque CLASES-a r1: rutas de clase de otro rol", () => {
  it("un maestro en /estudiante/clases/:claseId termina en /maestro sin pedir la clase", async () => {
    const fetchMock = stubFetch(me({ rol: "maestro" }))
    const router = await renderEn(`/estudiante/clases/${CLASE_ID}`)

    await waitFor(() => expect(router.state.location.pathname).toBe("/maestro"))
    expect(pidioAlgoDeLaClase(fetchMock)).toBe(0)
  })

  it("un estudiante en /maestro/clases/:claseId/editar termina en /estudiante sin pedir la clase ni su código", async () => {
    const fetchMock = stubFetch(me())
    const router = await renderEn(`/maestro/clases/${CLASE_ID}/editar`)

    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
    expect(pidioAlgoDeLaClase(fetchMock)).toBe(0)
  })

  it("un estudiante restringido en /estudiante/clases/:claseId termina en /acceso-restringido sin pedir la clase", async () => {
    const fetchMock = stubFetch(me({ accesoRestringido: true, motivoRestriccion: "Adeudo" }))
    const router = await renderEn(`/estudiante/clases/${CLASE_ID}`)

    await waitFor(() => expect(router.state.location.pathname).toBe("/acceso-restringido"))
    expect(pidioAlgoDeLaClase(fetchMock)).toBe(0)
  })
})
