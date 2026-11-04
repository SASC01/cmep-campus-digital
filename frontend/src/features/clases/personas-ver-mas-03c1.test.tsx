import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { clavePersonas } from "./data"
import { PersonasView } from "./personas-view"

// CLASES-03c1, corrección de la ronda 1 (hermano de T-03): «Ver más alumnos» del estudiante en
// «Personas» se pone en espera con isFetching, no con isFetchingNextPage (CLAUDE.md › Componentes):
// durante una recarga de la lista el botón no parece disponible ni pide otra página.

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const idDe = (n: number) => `6a6b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const MAESTRO = { id: idDe(1), nombre: "Luis Pérez", email: "luis@ejemplo.mx" }

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const primeraPagina = () =>
  respuestaJson(200, {
    maestro: MAESTRO,
    maestros: [MAESTRO],
    alumnos: [{ id: idDe(2), nombre: "Sol Ruiz", email: "sol@ejemplo.mx" }],
    totalAlumnos: 2,
    siguienteCursor: idDe(2),
  })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("«Ver más alumnos» del estudiante durante una recarga (CL3-C1R1-01)", () => {
  it("CL3-C1R1-01: «Ver más alumnos» del estudiante en «Personas» queda en espera mientras la lista se vuelve a pedir", async () => {
    let soltar: () => void = () => undefined
    let retener = false
    const fetchMock = vi.fn<typeof fetch>(async () => {
      if (retener) await new Promise<void>((resolver) => (soltar = resolver))
      return primeraPagina()
    })
    vi.stubGlobal("fetch", fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/estudiante/clases/${CLASE_ID}/personas`]}>
          <Routes>
            <Route path="/estudiante/clases/:claseId/personas" element={<PersonasView />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    const verMas = await screen.findByRole("button", { name: "Ver más alumnos" })
    expect(verMas).not.toHaveAttribute("aria-busy", "true")
    expect(fetchMock).toHaveBeenCalledTimes(1)

    retener = true
    act(() => {
      void queryClient.invalidateQueries({ queryKey: clavePersonas(CLASE_ID) })
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const enRecarga = screen.getByRole("button", { name: "Ver más alumnos" })
    try {
      expect(enRecarga).toHaveAttribute("aria-busy", "true")
      fireEvent.click(enRecarga)
      await act(() => new Promise((resolver) => setTimeout(resolver, 20)))
      expect(fetchMock).toHaveBeenCalledTimes(2)
      const conCursor = fetchMock.mock.calls.filter(([entrada]) =>
        String(entrada).includes("cursor="),
      )
      expect(conCursor).toEqual([])
    } finally {
      retener = false
      act(() => soltar())
    }
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Ver más alumnos" })).not.toHaveAttribute(
        "aria-busy",
        "true",
      ),
    )
  })
})
