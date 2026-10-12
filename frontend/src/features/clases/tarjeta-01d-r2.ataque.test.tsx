import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PublicacionDelMuro } from "./components/publicacion-del-muro"
import type { Perspectiva, Publicacion } from "./types"

// Ataque del Tester, TAREAS-01d, ronda 2: el remedio de T-07 (toda tarea va a TarjetaDeTarea) en las
// tres perspectivas y con una recarga que trae el resumen. Sin selectores de clase.

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"

const elemento = (tarea: Publicacion["tarea"]) =>
  ({
    id: TAREA_ID,
    tipo: "tarea",
    titulo: "Ensayo",
    texto: "",
    autor: {
      id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
      nombre: "Luis Pérez",
      administracion: false,
    },
    creadoEn: "2026-10-06T15:30:00.000Z",
    comentarios: 3,
    adjuntos: [],
    puedeBorrar: true,
    tarea,
  }) as Publicacion

const arbol = (publicacion: Publicacion, perspectiva: Perspectiva, cliente: QueryClient) => (
  <QueryClientProvider client={cliente}>
    <MemoryRouter>
      <PublicacionDelMuro claseId={CLASE_ID} publicacion={publicacion} perspectiva={perspectiva} />
    </MemoryRouter>
  </QueryClientProvider>
)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("ataque TAREAS-01d r2: la tarjeta de una tarea sin resumen (sin hallazgo esperado)", () => {
  it.each([
    ["maestro", "/maestro/clases"],
    ["admin", "/admin/clases"],
    ["estudiante", "/estudiante/clases"],
  ] as const)(
    "%s: con tarea null dice «Fecha límite no disponible» con su enlace y sin acciones; cuando la recarga trae el resumen, muestra el vencimiento y los puntos en el mismo nodo",
    (perspectiva, prefijo) => {
      const pedidas = vi.fn<typeof fetch>()
      vi.stubGlobal("fetch", pedidas)
      const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const { rerender } = render(arbol(elemento(null), perspectiva, cliente))
      const enlace = screen.getByRole("link", { name: "Ensayo" })
      expect(enlace).toHaveAttribute("href", `${prefijo}/${CLASE_ID}/tareas/${TAREA_ID}`)
      expect(screen.getByText("Fecha límite no disponible")).toBeInTheDocument()
      expect(screen.queryByText(/puntos/)).toBeNull()
      expect(screen.queryAllByRole("button")).toEqual([])

      rerender(
        arbol(
          elemento({ fechaLimite: "2020-01-15T16:00:00.000Z", puntos: 80 }),
          perspectiva,
          cliente,
        ),
      )
      expect(screen.getByRole("link", { name: "Ensayo" })).toBe(enlace)
      expect(screen.queryByText("Fecha límite no disponible")).toBeNull()
      expect(screen.getByText(/^Venció el /)).toBeInTheDocument()
      expect(screen.getByText(/80 puntos/)).toBeInTheDocument()
      expect(screen.queryAllByRole("button")).toEqual([])
      expect(pedidas).not.toHaveBeenCalled()
    },
  )
})
