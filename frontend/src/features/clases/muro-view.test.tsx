import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { Link, MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { MuroView } from "./muro-view"

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const AUTOR = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }

const idDe = (n: number) => `5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d${String(10 + n)}`

const publicacion = (n: number, extra: Record<string, unknown> = {}) => ({
  id: idDe(n),
  tipo: "anuncio",
  titulo: null,
  texto: `Texto de la publicación ${String(n)}`,
  autor: AUTOR,
  creadoEn: "2026-09-29T15:30:00.000Z",
  comentarios: 0,
  ...extra,
})

const lista = (
  publicaciones: ReturnType<typeof publicacion>[],
  siguienteCursor: string | null,
) => ({
  publicaciones,
  siguienteCursor,
})

type Manejador = (ruta: string, metodo: string) => Response | Promise<Response>

const stubApi = (manejador: Manejador) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) =>
    Promise.resolve(manejador(String(entrada), init?.method ?? "GET")),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const rutaDelMuro = `/api/clases/${CLASE_ID}/publicaciones`

const renderMuro = (rol: "maestro" | "estudiante") => {
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
  return { queryClient }
}

const botonesPrimarios = () =>
  screen
    .queryAllByRole("button")
    .filter((boton) => boton.getAttribute("data-variant") === "primary")

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("MuroView", () => {
  it("PR-C09d: un solo primary en la vista del maestro y ninguno en la del estudiante", async () => {
    stubApi((ruta) => {
      if (ruta.startsWith(rutaDelMuro)) return respuestaJson(200, lista([publicacion(1)], null))
      return errorJson(500, "ERROR_INTERNO")
    })

    renderMuro("maestro")
    await screen.findByText("Texto de la publicación 1")
    expect(botonesPrimarios()).toHaveLength(1)
    expect(botonesPrimarios()[0]).toHaveTextContent("Publicar anuncio")
    cleanup()

    renderMuro("estudiante")
    await screen.findByText("Texto de la publicación 1")
    expect(botonesPrimarios()).toHaveLength(0)
    expect(screen.queryByRole("group", { name: "Tipo de publicación" })).toBeNull()
  })

  it("PR-C09e: los vacíos por rol", async () => {
    stubApi(() => respuestaJson(200, lista([], null)))

    renderMuro("estudiante")
    expect(
      await screen.findByText("Tu maestro aún no ha publicado nada en esta clase."),
    ).toBeInTheDocument()
    cleanup()

    renderMuro("maestro")
    expect(
      await screen.findByText("Publica el primer anuncio o material de tu clase."),
    ).toBeInTheDocument()
    // Sin acción en el vacío: el único botón principal es el del formulario.
    expect(botonesPrimarios()).toHaveLength(1)
  })

  it("estados en orden: error, cargando y datos", async () => {
    stubApi(() => errorJson(403, "SIN_ACCESO_A_LA_CLASE"))
    renderMuro("estudiante")

    expect(await screen.findByRole("alert")).toHaveTextContent("No tienes acceso a esta clase.")
    expect(screen.queryByRole("list")).toBeNull()
  })

  it("PR-C11b: al cargar la última página, «Ver más publicaciones» desaparece y el foco va a la primera publicación nueva o, si no llegó nada, al encabezado de la lista", async () => {
    const conPaginas = (segunda: ReturnType<typeof publicacion>[]) =>
      stubApi((ruta) => {
        if (!ruta.startsWith(rutaDelMuro)) return errorJson(500, "ERROR_INTERNO")
        if (ruta.includes(`cursor=${idDe(1)}`)) return respuestaJson(200, lista(segunda, null))
        return respuestaJson(200, lista([publicacion(1)], idDe(1)))
      })
    const cargarMas = async () => {
      const boton = await screen.findByRole("button", { name: "Ver más publicaciones" })
      boton.focus()
      fireEvent.click(boton)
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: "Ver más publicaciones" })).toBeNull(),
      )
    }

    conPaginas([publicacion(2)])
    renderMuro("estudiante")
    await cargarMas()
    await waitFor(() => {
      const nueva = screen.getByText("Texto de la publicación 2").closest("[data-publicacion-id]")
      expect(nueva).toHaveFocus()
    })
    cleanup()

    conPaginas([])
    renderMuro("estudiante")
    await cargarMas()
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Publicaciones" })).toHaveFocus(),
    )
    expect(document.activeElement).not.toBe(document.body)
  })

  it("al borrar una publicación con el foco en su «Sí, borrar», el foco va a la vecina y, sin vecinas, al encabezado", async () => {
    let vigentes = [1, 2]
    stubApi((ruta, metodo) => {
      if (metodo === "DELETE") {
        vigentes = vigentes.filter((n) => !ruta.endsWith(idDe(n)))
        return new Response(null, { status: 204 })
      }
      return respuestaJson(
        200,
        lista(
          vigentes.map((n) => publicacion(n)),
          null,
        ),
      )
    })
    renderMuro("maestro")
    await screen.findByText("Texto de la publicación 1")

    for (const [n, destino] of [
      [1, "Texto de la publicación 2"],
      [2, null],
    ] as const) {
      const tarjeta = screen.getByText(`Texto de la publicación ${String(n)}`).closest("li")
      if (tarjeta === null) throw new Error("La publicación no está en una lista")
      const borrar = within(tarjeta).getByRole("button", { name: "Borrar publicación" })
      borrar.focus()
      fireEvent.click(borrar)
      const confirmar = await screen.findByRole("button", { name: "Sí, borrar" })
      confirmar.focus()
      fireEvent.click(confirmar)
      await waitFor(() =>
        expect(screen.queryByText(`Texto de la publicación ${String(n)}`)).toBeNull(),
      )
      await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Publicación borrada"))
      aviso.success.mockClear()

      if (destino === null) {
        await waitFor(() =>
          expect(screen.getByRole("heading", { name: "Publicaciones" })).toHaveFocus(),
        )
        continue
      }
      await waitFor(() => {
        const vecina = screen.getByText(destino).closest("li")
        if (vecina === null) throw new Error("La vecina no está en una lista")
        expect(within(vecina).getByRole("button", { name: "Borrar publicación" })).toHaveFocus()
      })
    }
    expect(document.activeElement).not.toBe(document.body)
  })
})

describe("cursor que ya no existe (Enmienda 8, T-34)", () => {
  it("PR-C17: tras el 400 del cursor en «Ver más publicaciones», se muestra el texto que dice qué pasó y el foco va al encabezado", async () => {
    stubApi((ruta) => {
      if (!ruta.startsWith(rutaDelMuro)) return errorJson(500, "ERROR_INTERNO")
      if (ruta.includes(`cursor=${idDe(1)}`)) {
        return respuestaJson(400, {
          error: { codigo: "VALIDACION", mensaje: "cursor: no es válido" },
        })
      }
      return respuestaJson(200, lista([publicacion(1)], idDe(1)))
    })
    renderMuro("estudiante")
    const boton = await screen.findByRole("button", { name: "Ver más publicaciones" })
    boton.focus()
    fireEvent.click(boton)

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El muro cambió mientras lo veías. Vuelve a abrirlo para verlo completo.",
    )
    expect(screen.queryByText("no es válido")).toBeNull()
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Publicaciones" })).toHaveFocus(),
    )
    expect(document.activeElement).not.toBe(document.body)
  })
})

describe("pulsar «Muro» con el muro en error (Enmienda 8, T-35)", () => {
  const renderConEnlaceMuro = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const ruta = `/estudiante/clases/${CLASE_ID}`
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[ruta]}>
          <Link to={ruta}>Muro</Link>
          <Routes>
            <Route path="/estudiante/clases/:claseId" element={<MuroView />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  const primerasPaginas = (fetchMock: ReturnType<typeof stubApi>) =>
    fetchMock.mock.calls.filter(([entrada]) => !String(entrada).includes("cursor=")).length

  it("PR-C18: con el muro en error por el 400 del cursor, pulsar «Muro» vuelve a pedir la primera página y la lista reaparece, con el foco en «Muro»", async () => {
    const fetchMock = stubApi((ruta) => {
      if (ruta.includes(`cursor=${idDe(1)}`)) {
        return respuestaJson(400, {
          error: { codigo: "VALIDACION", mensaje: "cursor: no es válido" },
        })
      }
      return respuestaJson(200, lista([publicacion(1)], idDe(1)))
    })
    renderConEnlaceMuro()
    fireEvent.click(await screen.findByRole("button", { name: "Ver más publicaciones" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("El muro cambió mientras lo veías.")
    expect(primerasPaginas(fetchMock)).toBe(1)

    const enlace = screen.getByRole("link", { name: "Muro" })
    enlace.focus()
    fireEvent.click(enlace)

    expect(await screen.findByText("Texto de la publicación 1")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(primerasPaginas(fetchMock)).toBe(2)
    expect(screen.getByRole("link", { name: "Muro" })).toHaveFocus()
  })

  it("PR-C18: con el muro sano, pulsar «Muro» no vuelve a pedir nada", async () => {
    const sano = stubApi(() => respuestaJson(200, lista([publicacion(1)], null)))
    renderConEnlaceMuro()
    await screen.findByText("Texto de la publicación 1")
    fireEvent.click(screen.getByRole("link", { name: "Muro" }))
    await new Promise((resolver) => setTimeout(resolver, 50))
    expect(primerasPaginas(sano)).toBe(1)
    expect(screen.getByText("Texto de la publicación 1")).toBeInTheDocument()
  })
})
