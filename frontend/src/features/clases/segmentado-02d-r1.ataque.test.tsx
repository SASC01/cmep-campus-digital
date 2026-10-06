import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { MuroView } from "./muro-view"

// Tester, CLASES-02d, ronda 1. "Tipo de publicación" como control segmentado (§D-2D3, DESIGN.md
// §7.3): aria-pressed y Check en el elegido, el indicador aria-hidden que se desliza sin movimiento
// con prefers-reduced-motion, el material del grupo, el contexto opaco del admin y el cambio de tipo
// con una publicación en vuelo. El indicador se localiza por aria-hidden dentro del grupo; sus clases
// solo se leen como aserción sobre el elemento ya localizado.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const LUIS = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const publicacion = (datos: { tipo: string; titulo?: string; texto: string }) => ({
  id: "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d99",
  tipo: datos.tipo,
  titulo: datos.titulo ?? null,
  texto: datos.texto,
  autor: { ...LUIS, administracion: false },
  creadoEn: "2026-10-05T15:30:00.000Z",
  comentarios: 0,
  adjuntos: [],
  puedeBorrar: true,
})

const stubMuro = () => {
  let soltar: () => void = () => undefined
  const retenido = new Promise<void>((r) => {
    soltar = r
  })
  const fetchMock = vi.fn<typeof fetch>(async (entrada, init) => {
    const ruta = String(entrada)
    if (init?.method === "POST" && ruta === `/api/clases/${CLASE_ID}/publicaciones`) {
      await retenido
      const cuerpo = JSON.parse(String(init.body)) as { tipo: string; texto: string }
      return respuestaJson(201, { publicacion: publicacion(cuerpo) })
    }
    if (ruta.startsWith(`/api/clases/${CLASE_ID}/publicaciones`)) {
      return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
    }
    return respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } })
  })
  vi.stubGlobal("fetch", fetchMock)
  const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")
  return { posts, soltar }
}

const renderMuro = (perspectiva: "maestro" | "admin") => {
  const contenido = (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/${perspectiva}/clases/${CLASE_ID}`]}>
        <Routes>
          <Route path={`/${perspectiva}/clases/:claseId`} element={<MuroView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
  // El contexto opaco del admin lo pone ContenedorRol con data-material en un ancestro.
  return render(
    perspectiva === "admin" ? (
      <div data-material="opaco" data-densidad="densa">
        {contenido}
      </div>
    ) : (
      contenido
    ),
  )
}

const clasesDe = (elemento: Element) => (elemento.getAttribute("class") ?? "").split(/\s+/)

const indicadorDe = (grupo: HTMLElement) => {
  const ocultos = Array.from(grupo.querySelectorAll('[aria-hidden="true"]')).filter(
    (e) => e.tagName.toLowerCase() !== "svg" && e.closest("button") === null,
  )
  expect(ocultos, "el grupo no tiene exactamente un indicador aria-hidden").toHaveLength(1)
  const [indicador] = ocultos
  if (!indicador) throw new Error("sin indicador")
  return indicador
}

afterEach(() => {
  vi.unstubAllGlobals()
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque CLASES-02d r1: el control segmentado del tipo", () => {
  it.each(["maestro", "admin"] as const)(
    "%s: aria-pressed, Check e indicador cambian juntos; el indicador no tiene transición con movimiento reducido",
    async (perspectiva) => {
      stubMuro()
      renderMuro(perspectiva)
      const grupo = await screen.findByRole("group", { name: "Tipo de publicación" })
      const anuncio = within(grupo).getByRole("button", { name: "Anuncio" })
      const material = within(grupo).getByRole("button", { name: "Material" })
      expect(within(grupo).getAllByRole("button")).toHaveLength(2)
      for (const boton of [anuncio, material]) {
        expect(boton).toHaveAttribute("type", "button")
        expect(boton).not.toHaveAttribute("tabindex", "-1")
        expect(boton).not.toHaveAttribute("disabled")
      }
      expect(clasesDe(grupo)).toContain("vidrio-fuerte")
      expect(clasesDe(grupo)).not.toContain("vidrio")

      const indicador = indicadorDe(grupo)
      for (const clase of [
        "rounded-row",
        "transition-transform",
        "duration-200",
        "motion-reduce:transition-none",
      ]) {
        expect(clasesDe(indicador), clase).toContain(clase)
      }
      expect(clasesDe(indicador)).toContain("in-data-[material=opaco]:bg-accent-soft")

      const estado = () => ({
        anuncio: anuncio.getAttribute("aria-pressed"),
        material: material.getAttribute("aria-pressed"),
        checkEnAnuncio: anuncio.querySelector("svg") !== null,
        checkEnMaterial: material.querySelector("svg") !== null,
        trasladado: clasesDe(indicadorDe(grupo)).includes("translate-x-full"),
        principal: screen.getByRole("button", { name: /^Publicar / }).textContent,
      })
      expect(estado()).toEqual({
        anuncio: "true",
        material: "false",
        checkEnAnuncio: true,
        checkEnMaterial: false,
        trasladado: false,
        principal: "Publicar anuncio",
      })
      fireEvent.click(material)
      expect(estado()).toEqual({
        anuncio: "false",
        material: "true",
        checkEnAnuncio: false,
        checkEnMaterial: true,
        trasladado: true,
        principal: "Publicar material",
      })
      expect(screen.getByLabelText("Título del material")).toBeInTheDocument()
      fireEvent.click(material)
      expect(estado().material).toBe("true")
      fireEvent.click(anuncio)
      expect(estado()).toEqual({
        anuncio: "true",
        material: "false",
        checkEnAnuncio: true,
        checkEnMaterial: false,
        trasladado: false,
        principal: "Publicar anuncio",
      })
      expect(screen.queryByLabelText("Título del material")).toBeNull()
    },
  )

  it("cambiar a «Material» con un anuncio en vuelo no manda otra publicación: un solo POST, el del anuncio, y un solo aviso", async () => {
    const { posts, soltar } = stubMuro()
    renderMuro("maestro")
    const grupo = await screen.findByRole("group", { name: "Tipo de publicación" })
    fireEvent.change(screen.getByLabelText("Anuncio"), { target: { value: "Aviso importante" } })
    const publicar = screen.getByRole("button", { name: "Publicar anuncio" })
    fireEvent.click(publicar)
    await waitFor(() => expect(posts()).toHaveLength(1))
    await waitFor(() => expect(publicar).toHaveAttribute("aria-busy", "true"))

    fireEvent.click(within(grupo).getByRole("button", { name: "Material" }))
    fireEvent.change(screen.getByLabelText("Título del material"), {
      target: { value: "Título nuevo" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^Publicar / }))
    fireEvent.submit(publicar.closest("form") ?? publicar)
    await act(() => new Promise((r) => setTimeout(r, 30)))
    expect(posts()).toHaveLength(1)

    soltar()
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    await act(() => new Promise((r) => setTimeout(r, 30)))
    expect(posts()).toHaveLength(1)
    expect(JSON.parse(String(posts()[0]?.[1]?.body))).toEqual({
      tipo: "anuncio",
      texto: "Aviso importante",
      archivoIds: [],
    })
    expect(aviso.error).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: /^Publicar / })).not.toHaveAttribute(
      "aria-busy",
      "true",
    )
  })
})
