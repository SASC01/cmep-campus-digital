import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { buttonVariants } from "@/components/ui/button-variants"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ClasesAdminView } from "./clases-admin-view"

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const idDe = (n: number) => `2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d${String(10 + n)}`
const MAESTRO_A = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const MAESTRO_B = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d10", nombre: "Ana Ruiz" }

const clase = (n: number, extra: Record<string, unknown> = {}) => ({
  id: idDe(n),
  nombre: `Clase ${String(n)}`,
  maestros: [MAESTRO_A],
  alumnos: n,
  creadoEn: "2026-10-01T15:00:00.000Z",
  ...extra,
})

const pagina = (clases: ReturnType<typeof clase>[], siguienteCursor: string | null = null) => ({
  clases,
  total: clases.length,
  siguienteCursor,
})

type Manejador = (ruta: string) => Response | Promise<Response>

const stubApi = (manejador: Manejador) => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => Promise.resolve(manejador(String(entrada))))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const nuevoCliente = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

const renderVista = () =>
  render(
    <QueryClientProvider client={nuevoCliente()}>
      <MemoryRouter initialEntries={["/admin/clases"]}>
        <Routes>
          <Route path="/admin/clases" element={<ClasesAdminView />} />
          <Route path="/admin/clases/nueva" element={<p>pantalla de crear</p>} />
          <Route path="/admin/clases/:claseId" element={<p>pantalla de la clase</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  limpiarToken()
  vi.unstubAllGlobals()
})

// CLASES-02c (§D-2C2, PR-2C03): /admin/clases.
describe("ClasesAdminView", () => {
  it("PR-2C03: un error al cargar muestra el mensaje de la lista y nada más", async () => {
    stubApi(() => respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } }))
    renderVista()
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos cargar las clases. Revisa tu conexión e inténtalo de nuevo.",
    )
  })

  it("PR-2C03: mientras carga muestra «Cargando» y no la tabla ni el vacío", () => {
    stubApi(() => new Promise<Response>(() => undefined))
    renderVista()
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByRole("table")).toBeNull()
    expect(screen.queryByText("Aún no hay clases")).toBeNull()
  })

  it("PR-2C03: sin clases, «Aún no hay clases» con la acción «Crea la primera clase» en outline, que lleva a crear", async () => {
    stubApi(() => respuestaJson(200, pagina([])))
    renderVista()

    expect(await screen.findByText("Aún no hay clases")).toBeInTheDocument()
    const accion = screen.getByRole("button", { name: "Crea la primera clase" })
    expect(accion).toHaveAttribute("data-variant", "outline")
    // La única acción principal sigue siendo el enlace «Crear clase» del encabezado.
    expect(screen.getByRole("link", { name: "Crear clase" }).className).toBe(
      buttonVariants({ variant: "primary" }),
    )

    fireEvent.click(accion)
    expect(await screen.findByText("pantalla de crear")).toBeInTheDocument()
  })

  it("PR-2C03: con clases, la tabla con sus cinco columnas; «Abrir» lleva el nombre de la clase como texto sr-only y apunta a la clase", async () => {
    stubApi(() =>
      respuestaJson(
        200,
        pagina([clase(1), clase(2, { maestros: [MAESTRO_A, MAESTRO_B], alumnos: 12 })]),
      ),
    )
    renderVista()

    const tabla = await screen.findByRole("table")
    expect(
      within(tabla)
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(["Clase", "Maestros", "Alumnos", "Creada", "Acciones"])

    const fila = within(tabla)
      .getByRole("link", { name: "Abrir Clase 2" })
      .closest("tr") as HTMLElement
    expect(within(fila).getByText("Luis Pérez, Ana Ruiz")).toBeInTheDocument()
    const alumnos = within(fila).getByText("12")
    expect(alumnos).toHaveClass("text-right", "tabular-nums")
    const abrir = within(fila).getByRole("link", { name: "Abrir Clase 2" })
    expect(abrir).toHaveAttribute("href", `/admin/clases/${idDe(2)}`)
    expect(abrir.querySelector(".sr-only")).toHaveTextContent("Clase 2")
    expect(abrir).not.toHaveAttribute("aria-label")
  })

  it("PR-2C03: una sola acción principal: el enlace «Crear clase», con exactamente la clase del botón primary", async () => {
    stubApi(() => respuestaJson(200, pagina([clase(1)])))
    renderVista()

    await screen.findByRole("table")
    const crear = screen.getByRole("link", { name: "Crear clase" })
    expect(crear.className).toBe(buttonVariants({ variant: "primary" }))
    expect(crear).toHaveAttribute("href", "/admin/clases/nueva")
    const primarias = [...screen.queryAllByRole("link"), ...screen.queryAllByRole("button")].filter(
      (control) => control.className === buttonVariants({ variant: "primary" }),
    )
    expect(primarias).toHaveLength(1)
  })

  it("PR-2C03: «Cargar más clases» con enEspera pide la siguiente página con su cursor, y al cargar la última el foco va al «Abrir» de la primera clase nueva", async () => {
    const cursor = idDe(1)
    let respuestaDeLaSegunda: (respuesta: Response) => void = () => undefined
    const fetchMock = stubApi((ruta) => {
      if (ruta.includes(`cursor=${cursor}`)) {
        return new Promise<Response>((resolver) => {
          respuestaDeLaSegunda = resolver
        })
      }
      return respuestaJson(200, pagina([clase(1)], cursor))
    })
    renderVista()

    const boton = await screen.findByRole("button", { name: "Cargar más clases" })
    boton.focus()
    fireEvent.click(boton)
    await waitFor(() => expect(boton).toHaveAttribute("aria-busy", "true"))
    fireEvent.click(boton)
    expect(fetchMock.mock.calls.filter(([e]) => String(e).includes("cursor="))).toHaveLength(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("/api/admin/clases?limite=50")

    respuestaDeLaSegunda(respuestaJson(200, pagina([clase(2)])))

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Cargar más clases" })).toBeNull(),
    )
    await waitFor(() => expect(screen.getByRole("link", { name: "Abrir Clase 2" })).toHaveFocus())
  })

  it("PR-2C03: si no llegó ninguna clase nueva, el foco va al encabezado «Clases»", async () => {
    const cursor = idDe(1)
    stubApi((ruta) =>
      ruta.includes("cursor=")
        ? respuestaJson(200, pagina([]))
        : respuestaJson(200, pagina([clase(1)], cursor)),
    )
    renderVista()

    const boton = await screen.findByRole("button", { name: "Cargar más clases" })
    boton.focus()
    fireEvent.click(boton)

    await waitFor(() => expect(screen.getByRole("heading", { name: "Clases" })).toHaveFocus())
  })

  it("PR-2C03: el 400 del cursor muestra el texto que dice qué pasó, no el técnico", async () => {
    const cursor = idDe(1)
    stubApi((ruta) =>
      ruta.includes("cursor=")
        ? respuestaJson(400, { error: { codigo: "VALIDACION", mensaje: "cursor: no es válido" } })
        : respuestaJson(200, pagina([clase(1)], cursor)),
    )
    renderVista()

    fireEvent.click(await screen.findByRole("button", { name: "Cargar más clases" }))

    expect(
      await screen.findByText(
        "La lista cambió mientras la veías. Vuelve a abrirla para verla completa.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/cursor/)).toBeNull()
  })

  it("PR-2C03: con el router de la aplicación, la lista queda en el contexto opaco y denso del administrador", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada) => {
        const ruta = String(entrada)
        if (ruta === "/api/auth/refrescar") {
          return Promise.resolve(respuestaJson(200, { tokenAcceso: "restaurado" }))
        }
        if (ruta === "/api/me") {
          return Promise.resolve(
            respuestaJson(200, {
              id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
              nombre: "Ana López",
              email: "ana@ejemplo.mx",
              rol: "admin",
              debeCambiarContrasena: false,
              accesoRestringido: false,
            }),
          )
        }
        return Promise.resolve(respuestaJson(200, pagina([clase(1)])))
      }),
    )
    const { rutas } = await import("@/app/router")
    render(
      <QueryClientProvider client={nuevoCliente()}>
        <RouterProvider router={createMemoryRouter(rutas, { initialEntries: ["/admin/clases"] })} />
      </QueryClientProvider>,
    )

    const encabezado = await screen.findByRole("heading", { name: "Clases" })
    const contexto = encabezado.closest("[data-material]")
    expect(contexto).toHaveAttribute("data-material", "opaco")
    expect(contexto).toHaveAttribute("data-densidad", "densa")
  })
})
