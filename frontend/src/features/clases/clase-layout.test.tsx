import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ClaseLayout } from "./clase-layout"

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"

const claseDetalle = (extra: Record<string, unknown> = {}) => ({
  id: CLASE_ID,
  nombre: "Álgebra I",
  descripcion: "Curso de álgebra",
  maestro: { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" },
  // CLASES-02a (C-7): el esquema ahora exige `maestros`; solo se agrega el campo.
  maestros: [{ id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }],
  ...extra,
})

interface Api {
  clase?: () => Response
  codigo?: () => Response
  regenerar?: () => Response
}

const stubApi = (api: Api) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const ruta = String(entrada)
    const metodo = init?.method ?? "GET"
    if (ruta === `/api/clases/${CLASE_ID}/codigo` && metodo === "GET") {
      return Promise.resolve(api.codigo?.() ?? respuestaJson(200, { codigo: "ABCDEFG" }))
    }
    if (ruta === `/api/clases/${CLASE_ID}/codigo` && metodo === "POST") {
      return Promise.resolve(api.regenerar?.() ?? respuestaJson(200, { codigo: "HIJKLMN" }))
    }
    if (ruta === `/api/clases/${CLASE_ID}`) {
      return Promise.resolve(api.clase?.() ?? respuestaJson(200, { clase: claseDetalle() }))
    }
    return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderLayout = (ruta: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/estudiante/clases/:claseId" element={<ClaseLayout />}>
            <Route index element={<p>muro estudiante</p>} />
          </Route>
          <Route path="/maestro/clases/:claseId" element={<ClaseLayout />}>
            <Route index element={<p>muro maestro</p>} />
            <Route path="alumnos" element={<p>alumnos maestro</p>} />
          </Route>
          <Route path="/admin/clases/:claseId" element={<ClaseLayout />}>
            <Route index element={<p>muro admin</p>} />
            <Route path="alumnos" element={<p>alumnos admin</p>} />
            <Route path="maestros" element={<p>maestros admin</p>} />
            <Route path="editar" element={<p>editar admin</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  establecerToken("token-de-prueba")
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn(() => Promise.resolve()) },
    configurable: true,
  })
})

afterEach(() => {
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ClaseLayout", () => {
  it("PR-A22a: SIN_ACCESO_A_LA_CLASE muestra MensajeError y 'Volver a mis clases'", async () => {
    stubApi({ clase: () => errorJson(403, "SIN_ACCESO_A_LA_CLASE") })
    renderLayout(`/estudiante/clases/${CLASE_ID}`)

    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Volver a mis clases" })).toHaveAttribute(
      "href",
      "/estudiante",
    )
  })

  it("PR-A22b: las secciones llevan aria-current y no hay nav", async () => {
    stubApi({})
    renderLayout(`/estudiante/clases/${CLASE_ID}`)

    const lista = await screen.findByRole("list", { name: "Secciones de la clase" })
    expect(lista.tagName).toBe("UL")
    expect(screen.getByRole("link", { name: "Muro" })).toHaveAttribute("aria-current", "page")
    expect(
      screen.queryByRole("navigation", { name: "Secciones de la clase" }),
    ).not.toBeInTheDocument()
  })

  it("PR-B14: las secciones suman 'Personas' (estudiante) y 'Alumnos' (maestro)", async () => {
    stubApi({})
    renderLayout(`/estudiante/clases/${CLASE_ID}`)
    await screen.findByRole("list", { name: "Secciones de la clase" })

    expect(screen.getByRole("link", { name: "Personas" })).toHaveAttribute(
      "href",
      `/estudiante/clases/${CLASE_ID}/personas`,
    )
    expect(screen.queryByRole("link", { name: "Alumnos" })).not.toBeInTheDocument()
    cleanup()

    renderLayout(`/maestro/clases/${CLASE_ID}`)
    await screen.findByRole("list", { name: "Secciones de la clase" })

    expect(screen.getByRole("link", { name: "Alumnos" })).toHaveAttribute(
      "href",
      `/maestro/clases/${CLASE_ID}/alumnos`,
    )
    expect(screen.queryByRole("link", { name: "Personas" })).not.toBeInTheDocument()
  })

  it("PR-A22c: el maestro copia el código (portapapeles doble), y un fallo da un toast", async () => {
    stubApi({})
    renderLayout(`/maestro/clases/${CLASE_ID}`)

    await screen.findByText("ABCDEFG")
    fireEvent.click(screen.getByRole("button", { name: "Copiar código" }))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("ABCDEFG"))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Código copiado"))

    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(() => Promise.reject(new Error("denegado"))) },
      configurable: true,
    })
    fireEvent.click(screen.getByRole("button", { name: "Copiar código" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
  })

  it("PR-A22d: regenerar pide confirmación en línea: foco a 'Cancelar' y, al cancelar, vuelve a 'Regenerar código'", async () => {
    stubApi({})
    renderLayout(`/maestro/clases/${CLASE_ID}`)

    const regenerar = await screen.findByRole("button", { name: "Regenerar código" })
    fireEvent.click(regenerar)

    const cancelar = await screen.findByRole("button", { name: "Cancelar" })
    await waitFor(() => expect(document.activeElement).toBe(cancelar))

    fireEvent.click(cancelar)

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Regenerar código" })),
    )
  })

  it("PR-A22e: el estudiante no ve el código ni pide /codigo", async () => {
    const fetchMock = stubApi({})
    renderLayout(`/estudiante/clases/${CLASE_ID}`)

    await screen.findByText("Álgebra I")
    expect(screen.queryByText("Código de la clase")).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([entrada]) => String(entrada).endsWith("/codigo"))).toBe(
      false,
    )
  })
})

// Ajuste visual del humano (2026-10-02), M-T1: el indicador deslizante de las secciones solo existe
// si hay una sección activa (DESIGN.md §7.3).
describe("indicador de las secciones de la clase", () => {
  const renderMaestro = (ruta: string) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[ruta]}>
          <Routes>
            <Route path="/maestro/clases/:claseId" element={<ClaseLayout />}>
              <Route index element={<p>muro maestro</p>} />
              <Route path="alumnos" element={<p>alumnos maestro</p>} />
              <Route path="editar" element={<p>editar maestro</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  // El indicador es aria-hidden y hermano de la lista: se busca dentro del contenedor del grupo.
  const indicadoresDe = (lista: HTMLElement) =>
    Array.from(lista.parentElement?.querySelectorAll(':scope > span[aria-hidden="true"]') ?? [])

  it("M-T1: en el muro el indicador va bajo la primera sección, en alumnos bajo la segunda y en editar no hay indicador", async () => {
    stubApi({})

    renderMaestro(`/maestro/clases/${CLASE_ID}`)
    let lista = await screen.findByRole("list", { name: "Secciones de la clase" })
    expect(screen.getByRole("link", { name: "Muro" })).toHaveAttribute("aria-current", "page")
    let indicadores = indicadoresDe(lista)
    expect(indicadores).toHaveLength(1)
    // Sin otra forma de ver la posición (aria-hidden): la clase que lo desplaza una columna.
    expect(indicadores[0]).not.toHaveClass("translate-x-full")
    cleanup()

    renderMaestro(`/maestro/clases/${CLASE_ID}/alumnos`)
    lista = await screen.findByRole("list", { name: "Secciones de la clase" })
    expect(screen.getByRole("link", { name: "Alumnos" })).toHaveAttribute("aria-current", "page")
    indicadores = indicadoresDe(lista)
    expect(indicadores).toHaveLength(1)
    expect(indicadores[0]).toHaveClass("translate-x-full")
    cleanup()

    renderMaestro(`/maestro/clases/${CLASE_ID}/editar`)
    lista = await screen.findByRole("list", { name: "Secciones de la clase" })
    expect(await screen.findByText("editar maestro")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Muro" })).not.toHaveAttribute("aria-current")
    expect(screen.getByRole("link", { name: "Alumnos" })).not.toHaveAttribute("aria-current")
    expect(indicadoresDe(lista)).toHaveLength(0)
  })
})

const DOS_MAESTROS = [
  { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Dra. Márquez" },
  { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d10", nombre: "Mtro. Ruiz" },
]

// CLASES-02c (§D-2C1, PR-2C07, PR-2C08 y PR-2C10): la clase vista desde cada perspectiva.
describe("ClaseLayout: perspectivas (CLASES-02c)", () => {
  it("PR-2C07: el admin vuelve a la lista de clases, ve Muro, Alumnos y Maestros con el indicador y el código, y puede editar", async () => {
    stubApi({})
    renderLayout(`/admin/clases/${CLASE_ID}`)

    expect(await screen.findByText("ABCDEFG")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Volver a la lista de clases" })).toHaveAttribute(
      "href",
      "/admin/clases",
    )
    const lista = screen.getByRole("list", { name: "Secciones de la clase" })
    expect(
      within(lista)
        .getAllByRole("link")
        .map((e) => e.textContent),
    ).toEqual(["Muro", "Alumnos", "Maestros"])
    expect(screen.getByRole("link", { name: "Muro" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Maestros" })).toHaveAttribute(
      "href",
      `/admin/clases/${CLASE_ID}/maestros`,
    )
    expect(screen.getByRole("link", { name: "Editar clase" })).toHaveAttribute(
      "href",
      `/admin/clases/${CLASE_ID}/editar`,
    )

    // El indicador es el elemento aria-hidden que antecede a la lista; mide un tercio, está en la
    // primera posición y usa el color del contexto opaco.
    const indicador = lista.previousElementSibling
    expect(indicador).toHaveAttribute("aria-hidden", "true")
    expect(indicador).toHaveClass("w-1/3", "in-data-[material=opaco]:bg-accent-soft")
    expect(indicador).not.toHaveClass("translate-x-full")
  })

  it("PR-2C07: el indicador se traslada una posición por sección y en «Editar clase» no hay indicador", async () => {
    stubApi({})
    renderLayout(`/admin/clases/${CLASE_ID}/alumnos`)
    const lista = await screen.findByRole("list", { name: "Secciones de la clase" })
    expect(lista.previousElementSibling).toHaveClass("translate-x-full")
    expect(screen.getByRole("link", { name: "Alumnos" })).toHaveAttribute("aria-current", "page")
    cleanup()

    renderLayout(`/admin/clases/${CLASE_ID}/maestros`)
    const tercera = await screen.findByRole("list", { name: "Secciones de la clase" })
    expect(tercera.previousElementSibling).toHaveClass("translate-x-[200%]")
    expect(screen.getByRole("link", { name: "Maestros" })).toHaveAttribute("aria-current", "page")
    cleanup()

    renderLayout(`/admin/clases/${CLASE_ID}/editar`)
    const sinActiva = await screen.findByRole("list", { name: "Secciones de la clase" })
    expect(sinActiva.previousElementSibling).toBeNull()
    expect(within(sinActiva).queryByRole("link", { current: "page" })).toBeNull()
  })

  it("PR-2C08: el maestro ve el código pero no «Editar clase»", async () => {
    const fetchMock = stubApi({})
    renderLayout(`/maestro/clases/${CLASE_ID}`)

    expect(await screen.findByText("ABCDEFG")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Editar clase" })).toBeNull()
    expect(screen.getByRole("link", { name: "Volver a mis clases" })).toHaveAttribute(
      "href",
      "/maestro",
    )
    expect(
      within(screen.getByRole("list", { name: "Secciones de la clase" })).getAllByRole("link"),
    ).toHaveLength(2)
    expect(fetchMock.mock.calls.some(([entrada]) => String(entrada).includes("/admin/"))).toBe(
      false,
    )
  })

  it("PR-2C08: el estudiante no ve el código, no pide /codigo y no ve «Editar clase»", async () => {
    const fetchMock = stubApi({})
    renderLayout(`/estudiante/clases/${CLASE_ID}`)

    await screen.findByText("muro estudiante")
    expect(screen.queryByRole("link", { name: "Editar clase" })).toBeNull()
    expect(screen.queryByText("ABCDEFG")).toBeNull()
    expect(fetchMock.mock.calls.some(([entrada]) => String(entrada).endsWith("/codigo"))).toBe(
      false,
    )
  })

  it("PR-2C10: el encabezado dice «Maestro: …» con uno y «Maestros: … y …» con dos", async () => {
    stubApi({})
    renderLayout(`/estudiante/clases/${CLASE_ID}`)
    expect(await screen.findByText("Maestro: Luis Pérez")).toBeInTheDocument()
    cleanup()

    stubApi({
      clase: () =>
        respuestaJson(200, {
          clase: claseDetalle({ maestro: DOS_MAESTROS[0], maestros: DOS_MAESTROS }),
        }),
    })
    renderLayout(`/estudiante/clases/${CLASE_ID}`)
    expect(await screen.findByText("Maestros: Dra. Márquez y Mtro. Ruiz")).toBeInTheDocument()
  })
})
