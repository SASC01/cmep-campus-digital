import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Tester, CLASES-c, ronda 1 (punto 11 del manager): MuroView decide el rol por el prefijo de la
// ruta. Un estudiante que escribe /maestro/clases/:claseId no debe llegar a ver el formulario de
// publicar ni pedir el muro: la guarda de rol del router lo devuelve a su inicio. El backend niega
// el POST por su cuenta (muro-c-r1.ataque.test.ts del backend, 403 ROL_NO_PERMITIDO).

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"

const me = (rol: "estudiante" | "maestro") => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol,
  debeCambiarContrasena: false,
  accesoRestringido: false,
})

const stubFetch = (rol: "estudiante" | "maestro") => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => {
    const ruta = String(entrada)
    if (ruta === "/api/auth/refrescar") {
      return Promise.resolve(respuestaJson(200, { tokenAcceso: "restaurado" }))
    }
    if (ruta === "/api/me") return Promise.resolve(respuestaJson(200, me(rol)))
    if (ruta.startsWith("/api/clases/inscritas") || ruta.startsWith("/api/clases/impartidas")) {
      return Promise.resolve(respuestaJson(200, { clases: [], total: 0, siguienteCursor: null }))
    }
    if (ruta === `/api/clases/${CLASE_ID}`) {
      return Promise.resolve(
        respuestaJson(200, {
          clase: {
            id: CLASE_ID,
            nombre: "Historia",
            descripcion: null,
            maestro: { id: "6a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e", nombre: "Luis" },
            // CLASES-02a ronda 0 (C-7): claseDetalleSchema suma maestros (1 o 2).
            maestros: [{ id: "6a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e", nombre: "Luis" }],
          },
        }),
      )
    }
    if (ruta.startsWith(`/api/clases/${CLASE_ID}/publicaciones`)) {
      return Promise.resolve(respuestaJson(200, { publicaciones: [], siguienteCursor: null }))
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

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ataque CLASES-c r1: el muro de otro rol", () => {
  it("un estudiante en /maestro/clases/:claseId termina en /estudiante sin ver «Publicar anuncio» ni pedir el muro", async () => {
    const fetchMock = stubFetch("estudiante")
    const router = await renderEn(`/maestro/clases/${CLASE_ID}`)

    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
    expect(screen.queryByRole("button", { name: "Publicar anuncio" })).toBeNull()
    expect(screen.queryByRole("group", { name: "Tipo de publicación" })).toBeNull()
    expect(
      fetchMock.mock.calls.filter(([entrada]) => String(entrada).includes("/publicaciones")),
    ).toHaveLength(0)
  })

  it("el maestro en /maestro/clases/:claseId sí ve el formulario (control del caso anterior)", async () => {
    stubFetch("maestro")
    const router = await renderEn(`/maestro/clases/${CLASE_ID}`)

    expect(await screen.findByRole("button", { name: "Publicar anuncio" })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/maestro/clases/${CLASE_ID}`)
  })
})
