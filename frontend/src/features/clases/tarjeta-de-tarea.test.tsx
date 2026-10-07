import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { MuroView } from "./muro-view"

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const AUTOR = {
  id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
  nombre: "Luis Pérez",
  administracion: false,
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const elementoTarea = (extra: Record<string, unknown> = {}) => ({
  id: TAREA_ID,
  tipo: "tarea",
  titulo: "Ensayo final",
  texto: "",
  autor: AUTOR,
  creadoEn: "2026-09-29T15:30:00.000Z",
  comentarios: 0,
  adjuntos: [],
  puedeBorrar: true,
  tarea: { fechaLimite: "2020-01-15T16:00:00.000Z", puntos: 80 },
  ...extra,
})

const anuncio = {
  id: "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11",
  tipo: "anuncio",
  titulo: null,
  texto: "Mañana hay examen",
  autor: AUTOR,
  creadoEn: "2026-09-29T15:30:00.000Z",
  comentarios: 0,
  adjuntos: [],
  puedeBorrar: true,
  tarea: null,
}

const stubMuro = (publicaciones: unknown[]) =>
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(() =>
      Promise.resolve(respuestaJson(200, { publicaciones, siguienteCursor: null })),
    ),
  )

const renderMuro = (rol: "maestro" | "estudiante" | "admin") => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/${rol}/clases/${CLASE_ID}`]}>
        <Routes>
          <Route path={`/${rol}/clases/:claseId`} element={<MuroView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
})

describe("PR-1D06: tarjeta de tarea en el muro", () => {
  it("PR-1D06: la tarjeta lleva la insignia con texto e icono, el título, el vencimiento y los puntos", async () => {
    stubMuro([elementoTarea()])
    renderMuro("estudiante")

    const titulo = await screen.findByRole("heading", { name: "Ensayo final" })
    const tarjeta = titulo.closest<HTMLElement>("[data-publicacion-id]")
    expect(tarjeta).not.toBeNull()
    const dentro = within(tarjeta as HTMLElement)
    const insignia = dentro.getByText("Tarea")
    expect(insignia.querySelector("svg")).not.toBeNull()
    expect(dentro.getByText("Luis Pérez")).toBeInTheDocument()
    expect(dentro.getByText(/^Venció el /)).toBeInTheDocument()
    expect(dentro.getByText(/80 puntos/)).toBeInTheDocument()
  })

  it("PR-1D06: el título es un enlace al detalle de la perspectiva de cada rol", async () => {
    for (const rol of ["estudiante", "maestro", "admin"] as const) {
      stubMuro([elementoTarea()])
      renderMuro(rol)

      const enlace = await screen.findByRole("link", { name: "Ensayo final" })
      expect(enlace).toHaveAttribute("href", `/${rol}/clases/${CLASE_ID}/tareas/${TAREA_ID}`)
      cleanup()
    }
  })

  it("PR-1D06: la tarjeta no ofrece comentarios ni borrar publicación", async () => {
    stubMuro([elementoTarea({ puedeBorrar: true })])
    renderMuro("maestro")

    await screen.findByRole("heading", { name: "Ensayo final" })
    expect(screen.queryByRole("button", { name: /Ver comentarios/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Borrar publicación" })).not.toBeInTheDocument()
  })

  it("PR-1D06: con un punto, el texto dice «1 punto»", async () => {
    stubMuro([elementoTarea({ tarea: { fechaLimite: "2020-01-15T16:00:00.000Z", puntos: 1 } })])
    renderMuro("estudiante")

    expect(await screen.findByText(/1 punto$/)).toBeInTheDocument()
  })

  it("PR-1D06: un anuncio sigue con su publicación de siempre, con comentarios", async () => {
    stubMuro([anuncio, elementoTarea()])
    renderMuro("estudiante")

    expect(await screen.findByText("Mañana hay examen")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /Ver comentarios/ })).toHaveLength(1)
  })

  it("PR-1D06: el maestro y el admin ven «Crear tarea» como enlace al formulario; el estudiante no", async () => {
    for (const rol of ["maestro", "admin"] as const) {
      stubMuro([anuncio])
      renderMuro(rol)

      const enlace = await screen.findByRole("link", { name: "Crear tarea" })
      expect(enlace).toHaveAttribute("href", `/${rol}/clases/${CLASE_ID}/tareas/nueva`)
      cleanup()
    }

    stubMuro([anuncio])
    renderMuro("estudiante")
    await screen.findByText("Mañana hay examen")
    expect(screen.queryByRole("link", { name: "Crear tarea" })).not.toBeInTheDocument()
  })

  it("PR-1D06: una tarea sin su resumen (tarea: null) no se pinta como publicación común y lo dice, en las tres perspectivas", async () => {
    for (const rol of ["estudiante", "maestro", "admin"] as const) {
      stubMuro([elementoTarea({ tarea: null, puedeBorrar: true })])
      renderMuro(rol)

      const enlace = await screen.findByRole("link", { name: "Ensayo final" })
      expect(enlace).toHaveAttribute("href", `/${rol}/clases/${CLASE_ID}/tareas/${TAREA_ID}`)
      expect(screen.getByText("Tarea")).toBeInTheDocument()
      expect(screen.getByText("Fecha límite no disponible")).toBeInTheDocument()
      expect(screen.queryByText(/punto/)).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /Ver comentarios/ })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Borrar publicación" })).not.toBeInTheDocument()
      cleanup()
    }
  })
})
