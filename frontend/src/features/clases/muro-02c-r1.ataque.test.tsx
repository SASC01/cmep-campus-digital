import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { MuroView } from "./muro-view"

// Tester, CLASES-02c, ronda 1. El muro en las tres perspectivas: la firma "Administración" sale
// solo de `autor.administracion` (O-07; nunca del nombre), y los botones de borrar existen si y
// solo si el servidor dice `puedeBorrar` (nunca por el rol ni por `propio`), con el borrado de un
// comentario siempre por la ruta general (nunca `mis-comentarios`, C-13 y O-04 de la ronda 0).
// Sin selectores de clases de estilo: rol, nombre accesible, texto y `data-slot` del Badge.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

type Perspectiva = "estudiante" | "maestro" | "admin"

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const PUB_ID = "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11"
const COM_ID = "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11"

interface Autor {
  id: string
  nombre: string
  administracion: boolean
}

const MAESTRO: Autor = {
  id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
  nombre: "Luis Pérez",
  administracion: false,
}

const publicacion = (autor: Autor, puedeBorrar: boolean, comentarios = 1) => ({
  id: PUB_ID,
  tipo: "anuncio",
  titulo: null,
  texto: "Texto de la publicación",
  autor,
  creadoEn: "2026-10-01T15:30:00.000Z",
  comentarios,
  adjuntos: [],
  puedeBorrar,
})

const comentario = (autor: Autor, puedeBorrar: boolean, propio: boolean) => ({
  id: COM_ID,
  texto: "Texto del comentario",
  autor,
  creadoEn: "2026-10-01T16:30:00.000Z",
  propio,
  puedeBorrar,
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const servidor = (pub: ReturnType<typeof publicacion>, coms: ReturnType<typeof comentario>[]) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const ruta = String(entrada)
    const metodo = init?.method ?? "GET"
    if (metodo === "DELETE") return Promise.resolve(new Response(null, { status: 204 }))
    if (ruta.includes("/comentarios")) {
      return Promise.resolve(respuestaJson(200, { comentarios: coms, siguienteCursor: null }))
    }
    if (ruta.startsWith(`/api/clases/${CLASE_ID}/publicaciones`)) {
      return Promise.resolve(respuestaJson(200, { publicaciones: [pub], siguienteCursor: null }))
    }
    return Promise.resolve(
      respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "mensaje del servidor" } }),
    )
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderMuro = (perspectiva: Perspectiva) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/${perspectiva}/clases/${CLASE_ID}`]}>
        <Routes>
          <Route path={`/${perspectiva}/clases/:claseId`} element={<MuroView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const tarjeta = async () => {
  const texto = await screen.findByText("Texto de la publicación")
  const li = texto.closest("li")
  if (!li) throw new Error("Precondición: la publicación no está en un <li>")
  return li
}

const abrirComentarios = async () => {
  fireEvent.click(await screen.findByRole("button", { name: /^Ver comentarios/ }))
  const texto = await screen.findByText("Texto del comentario")
  const fila = texto.closest("li")
  if (!fila) throw new Error("Precondición: el comentario no está en un <li>")
  return fila
}

// La insignia "Administración" es un Badge (data-slot="badge") con el icono oculto delante.
const insigniasDeAdministracion = (dentro: HTMLElement) =>
  within(dentro)
    .queryAllByText("Administración")
    .filter((nodo) => nodo.closest('[data-slot="badge"]') !== null)

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

describe("ataque CLASES-02c r1: la firma del admin solo sale de autor.administracion (O-07)", () => {
  const PARECIDOS = [
    "Administración",
    "administración",
    "ADMINISTRACIÓN",
    " Administración ",
    "Administracion",
  ]

  it.each(PARECIDOS)(
    "un autor llamado «%s» con administracion: false firma con su nombre, sin la insignia, en la publicación y en el comentario",
    async (nombre) => {
      const autor: Autor = {
        id: "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01",
        nombre,
        administracion: false,
      }
      servidor(publicacion(autor, false), [comentario(autor, false, false)])
      renderMuro("estudiante")
      // La publicación se revisa con los comentarios cerrados (su tarjeta los contiene al abrirlos).
      const pub = await tarjeta()
      expect(insigniasDeAdministracion(pub), "insignia en la publicación").toEqual([])
      expect(within(pub).getAllByText(nombre.trim(), { exact: false }).length).toBeGreaterThan(0)
      const fila = await abrirComentarios()
      expect(insigniasDeAdministracion(fila), "insignia en el comentario").toEqual([])
      expect(within(fila).getAllByText(nombre.trim(), { exact: false }).length).toBeGreaterThan(0)
    },
  )

  it.each(["estudiante", "maestro", "admin"] as const)(
    "%s: con administracion: true y otro nombre («Luis Pérez»), la insignia «Administración» con su icono y ningún nombre",
    async (perspectiva) => {
      const autor: Autor = { ...MAESTRO, administracion: true }
      servidor(publicacion(autor, false), [comentario(autor, false, false)])
      renderMuro(perspectiva)
      const revisar = (donde: string, nodo: HTMLElement) => {
        const insignias = insigniasDeAdministracion(nodo)
        expect(insignias, `insignia en ${donde}`).toHaveLength(1)
        const badge = insignias[0]?.closest('[data-slot="badge"]')
        expect(badge?.querySelector('svg[aria-hidden="true"]'), `icono en ${donde}`).not.toBeNull()
        expect(within(nodo).queryByText("Luis Pérez"), `nombre real en ${donde}`).toBeNull()
      }
      // La publicación se revisa con los comentarios cerrados (su tarjeta los contiene al abrirlos).
      revisar("publicación", await tarjeta())
      revisar("comentario", await abrirComentarios())
    },
  )
})

describe("ataque CLASES-02c r1: los botones de borrar existen si y solo si el servidor dice puedeBorrar", () => {
  const casos = (["estudiante", "maestro", "admin"] as const).flatMap((perspectiva) =>
    [true, false].flatMap((pubBorrable) =>
      [true, false].flatMap((comBorrable) =>
        [true, false].map((propio) => [perspectiva, pubBorrable, comBorrable, propio] as const),
      ),
    ),
  )

  it.each(casos)(
    "%s · publicación puedeBorrar=%s · comentario puedeBorrar=%s, propio=%s",
    async (perspectiva, pubBorrable, comBorrable, propio) => {
      servidor(publicacion(MAESTRO, pubBorrable), [
        comentario({ ...MAESTRO, nombre: "Ana López" }, comBorrable, propio),
      ])
      renderMuro(perspectiva)
      const pub = await tarjeta()
      expect(
        within(pub).queryAllByRole("button", { name: "Borrar publicación" }),
        "«Borrar publicación»",
      ).toHaveLength(pubBorrable ? 1 : 0)
      const fila = await abrirComentarios()
      expect(
        within(fila).queryAllByRole("button", { name: "Borrar" }),
        "«Borrar» del comentario",
      ).toHaveLength(comBorrable ? 1 : 0)
    },
  )

  it.each(["estudiante", "maestro", "admin"] as const)(
    "%s: borrar un comentario con puedeBorrar va a la ruta general, nunca a mis-comentarios",
    async (perspectiva) => {
      const fetchMock = servidor(publicacion(MAESTRO, false), [
        comentario({ ...MAESTRO, nombre: "Ana López" }, true, perspectiva === "estudiante"),
      ])
      renderMuro(perspectiva)
      const fila = await abrirComentarios()
      fireEvent.click(within(fila).getByRole("button", { name: "Borrar" }))
      fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar comentario" }))
      await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Comentario borrado"))
      const borrados = fetchMock.mock.calls
        .filter(([, init]) => init?.method === "DELETE")
        .map(([entrada]) => String(entrada))
      expect(borrados).toEqual([
        `/api/clases/${CLASE_ID}/publicaciones/${PUB_ID}/comentarios/${COM_ID}`,
      ])
    },
  )

  it("el admin no tiene formulario de comentario pero sí el de publicar; el muro vacío le dice que no hay publicaciones", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(respuestaJson(200, { publicaciones: [], siguienteCursor: null })),
      ),
    )
    renderMuro("admin")
    expect(await screen.findByText("Aún no hay publicaciones en esta clase.")).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Tipo de publicación" })).toBeInTheDocument()
    await act(() => new Promise((r) => setTimeout(r, 30)))
    expect(screen.queryByLabelText("Escribe un comentario")).toBeNull()
  })
})
