import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PublicacionDelMuro } from "./components/publicacion-del-muro"
import type { Perspectiva, Publicacion } from "./types"

// Ataque del Tester, TAREAS-01d, ronda 1: la tarjeta de la tarea en el muro (§D-10, S-08, DESIGN.md
// §7.18). Sin selectores de clase.

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

const pintar = (publicacion: Publicacion, perspectiva: Perspectiva) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <PublicacionDelMuro
          claseId={CLASE_ID}
          publicacion={publicacion}
          perspectiva={perspectiva}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("ataque TAREAS-01d r1: la tarjeta de la tarea en el muro", () => {
  it("un elemento de tipo tarea con tarea: null (forma que el esquema admite) no se pinta como publicación común: sin «Ver comentarios» ni «Borrar publicación» (S-08)", () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>())
    pintar(elemento(null), "maestro")
    expect(screen.queryByRole("button", { name: /Ver comentarios/ })).toBeNull()
    expect(screen.queryByRole("button", { name: "Borrar publicación" })).toBeNull()
  })

  it.each([
    ["maestro", "/maestro/clases"],
    ["admin", "/admin/clases"],
    ["estudiante", "/estudiante/clases"],
  ] as const)(
    "%s: el título enlaza al detalle de su perspectiva, la insignia dice «Tarea», hay texto de vencimiento y puntos, y no hay comentarios ni borrado aunque puedeBorrar sea true (sin hallazgo esperado)",
    (perspectiva, prefijo) => {
      const pedidas = vi.fn<typeof fetch>()
      vi.stubGlobal("fetch", pedidas)
      pintar(elemento({ fechaLimite: "2020-01-15T16:00:00.000Z", puntos: 80 }), perspectiva)
      expect(screen.getByRole("link", { name: "Ensayo" })).toHaveAttribute(
        "href",
        `${prefijo}/${CLASE_ID}/tareas/${TAREA_ID}`,
      )
      expect(screen.getByText("Tarea")).toBeInTheDocument()
      expect(screen.getByText(/^Venció el /)).toBeInTheDocument()
      expect(screen.getByText(/80 puntos/)).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /comentarios/i })).toBeNull()
      expect(screen.queryByRole("button", { name: /Borrar/ })).toBeNull()
      expect(pedidas).not.toHaveBeenCalled()
    },
  )
})
