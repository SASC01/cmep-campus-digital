import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ClasesAdminView } from "./clases-admin-view"
import { InicioEstudianteView } from "./inicio-estudiante-view"
import { InicioMaestroView } from "./inicio-maestro-view"
import { MuroView } from "./muro-view"

// Tester, CLASES-02c, ronda 2 (O-08 de la ronda 1). Los cinco «Cargar más» / «Ver más» de 02c, con
// `fetchNextPage({ cancelRefetch: false })`: dos clics en el mismo instante y a 30 ms con la página
// en vuelo piden la página siguiente una sola vez, y ninguna fila se duplica al llegar.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const PUB_ID = "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11"
const id = (prefijo: string, n: number) =>
  `${prefijo}-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
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

const ME = (rol: "estudiante" | "maestro") => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol,
  debeCambiarContrasena: false,
  accesoRestringido: false,
})

interface Lugar {
  nombre: string
  boton: string
  ruta: string
  patron: string
  vista: ReactNode
  rol: "estudiante" | "maestro"
  // La lista de la primera página (con cursor) y la de la segunda (sin cursor).
  primera: () => unknown
  segunda: () => unknown
  esLista: (ruta: string) => boolean
  // Cuántas veces aparece cada elemento (por su texto) al terminar.
  textos: string[]
  // En la tabla del admin cada nombre está en su celda y en el sr-only de «Abrir»: se cuenta el enlace.
  contar?: (texto: string) => number
  abrir?: () => Promise<void>
  extra?: (ruta: string) => Response | undefined
}

const publicacion = (n: number, comentarios = 0) => ({
  id: n === 1 ? PUB_ID : id("5a5b3c4d", n),
  tipo: "anuncio",
  titulo: null,
  texto: `Publicación ${String(n)}`,
  autor: AUTOR,
  creadoEn: "2026-10-01T15:30:00.000Z",
  comentarios,
  adjuntos: [],
  puedeBorrar: false,
})

const comentario = (n: number) => ({
  id: id("6a6b3c4d", n),
  texto: `Comentario ${String(n)}`,
  autor: AUTOR,
  creadoEn: "2026-10-01T16:30:00.000Z",
  propio: false,
  puedeBorrar: false,
})

const LUGARES: Lugar[] = [
  {
    nombre: "«Cargar más clases» (/admin/clases)",
    boton: "Cargar más clases",
    ruta: "/admin/clases",
    patron: "/admin/clases",
    vista: <ClasesAdminView />,
    rol: "maestro",
    primera: () => ({
      clases: [1, 2].map((n) => ({
        id: id("9a9b3c4d", n),
        nombre: `Clase ${String(n)}`,
        maestros: [{ id: AUTOR.id, nombre: AUTOR.nombre }],
        alumnos: n,
        creadoEn: "2026-10-01T15:00:00.000Z",
      })),
      total: 3,
      siguienteCursor: id("9a9b3c4d", 2),
    }),
    segunda: () => ({
      clases: [
        {
          id: id("9a9b3c4d", 3),
          nombre: "Clase 3",
          maestros: [{ id: AUTOR.id, nombre: AUTOR.nombre }],
          alumnos: 3,
          creadoEn: "2026-10-01T15:00:00.000Z",
        },
      ],
      total: 3,
      siguienteCursor: null,
    }),
    esLista: (r) => r.startsWith("/api/admin/clases?"),
    textos: ["Clase 1", "Clase 2", "Clase 3"],
    contar: (texto) => screen.getAllByRole("link", { name: `Abrir ${texto}` }).length,
  },
  {
    nombre: "«Ver más clases» (inicio del maestro)",
    boton: "Ver más clases",
    ruta: "/maestro",
    patron: "/maestro",
    vista: <InicioMaestroView />,
    rol: "maestro",
    primera: () => ({
      clases: [1, 2].map((n) => ({
        id: id("9a9b3c4d", n),
        nombre: `Clase ${String(n)}`,
        alumnos: n,
      })),
      total: 3,
      siguienteCursor: id("9a9b3c4d", 2),
    }),
    segunda: () => ({
      clases: [{ id: id("9a9b3c4d", 3), nombre: "Clase 3", alumnos: 3 }],
      total: 3,
      siguienteCursor: null,
    }),
    esLista: (r) => r.startsWith("/api/clases/impartidas"),
    textos: ["Clase 1", "Clase 2", "Clase 3"],
  },
  {
    nombre: "«Ver más clases» (inicio del estudiante)",
    boton: "Ver más clases",
    ruta: "/estudiante",
    patron: "/estudiante",
    vista: <InicioEstudianteView />,
    rol: "estudiante",
    primera: () => ({
      clases: [1, 2].map((n) => ({
        id: id("9a9b3c4d", n),
        nombre: `Clase ${String(n)}`,
        maestro: { nombre: "L" },
        maestros: [{ nombre: "L" }],
      })),
      total: 3,
      siguienteCursor: id("9a9b3c4d", 2),
    }),
    segunda: () => ({
      clases: [
        {
          id: id("9a9b3c4d", 3),
          nombre: "Clase 3",
          maestro: { nombre: "L" },
          maestros: [{ nombre: "L" }],
        },
      ],
      total: 3,
      siguienteCursor: null,
    }),
    esLista: (r) => r.startsWith("/api/clases/inscritas"),
    textos: ["Clase 1", "Clase 2", "Clase 3"],
  },
  {
    nombre: "«Ver más publicaciones» (muro)",
    boton: "Ver más publicaciones",
    ruta: `/estudiante/clases/${CLASE_ID}`,
    patron: "/estudiante/clases/:claseId",
    vista: <MuroView />,
    rol: "estudiante",
    primera: () => ({
      publicaciones: [publicacion(1), publicacion(2)],
      siguienteCursor: id("5a5b3c4d", 2),
    }),
    segunda: () => ({ publicaciones: [publicacion(3)], siguienteCursor: null }),
    esLista: (r) => r.startsWith(`/api/clases/${CLASE_ID}/publicaciones?`),
    textos: ["Publicación 1", "Publicación 2", "Publicación 3"],
  },
  {
    nombre: "«Ver más comentarios»",
    boton: "Ver más comentarios",
    ruta: `/estudiante/clases/${CLASE_ID}`,
    patron: "/estudiante/clases/:claseId",
    vista: <MuroView />,
    rol: "estudiante",
    primera: () => ({
      comentarios: [comentario(1), comentario(2)],
      siguienteCursor: id("6a6b3c4d", 2),
    }),
    segunda: () => ({ comentarios: [comentario(3)], siguienteCursor: null }),
    esLista: (r) => r.includes(`/publicaciones/${PUB_ID}/comentarios`),
    textos: ["Comentario 1", "Comentario 2", "Comentario 3"],
    abrir: async () => {
      fireEvent.click(await screen.findByRole("button", { name: "Ver comentarios (3)" }))
    },
    extra: (r) =>
      r.startsWith(`/api/clases/${CLASE_ID}/publicaciones?`)
        ? respuestaJson(200, { publicaciones: [publicacion(1, 3)], siguienteCursor: null })
        : undefined,
  },
]

const montar = (lugar: Lugar) => {
  const pendientes: (() => void)[] = []
  const conCursor: string[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) => {
      const ruta = String(entrada)
      if (ruta === "/api/me") return Promise.resolve(respuestaJson(200, ME(lugar.rol)))
      if (lugar.esLista(ruta)) {
        if (!ruta.includes("cursor=")) return Promise.resolve(respuestaJson(200, lugar.primera()))
        conCursor.push(ruta)
        return new Promise<Response>((resolver) => {
          pendientes.push(() => resolver(respuestaJson(200, lugar.segunda())))
        })
      }
      const propia = lugar.extra?.(ruta)
      if (propia) return Promise.resolve(propia)
      return Promise.resolve(
        respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "mensaje del servidor" } }),
      )
    }),
  )
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[lugar.ruta]}>
        <Routes>
          <Route path={lugar.patron} element={lugar.vista} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { pendientes, conCursor }
}

const esperar = (ms: number) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))

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

describe("ataque CLASES-02c r2: los cinco «Cargar más» con dos clics y la página en vuelo", () => {
  const casos = LUGARES.flatMap((lugar) =>
    (["el mismo instante", "30 ms"] as const).map(
      (cuando) => [lugar.nombre, cuando, lugar] as const,
    ),
  )

  it.each(casos)(
    "%s, dos clics en %s: una sola petición y ninguna fila duplicada",
    async (_n, cuando, lugar) => {
      const { pendientes, conCursor } = montar(lugar)
      await lugar.abrir?.()
      const boton = await screen.findByRole("button", { name: lugar.boton })
      act(() => boton.focus())
      fireEvent.click(boton)
      if (cuando === "30 ms") await esperar(30)
      fireEvent.click(boton)
      await esperar(30)
      expect(conCursor, "peticiones de la página siguiente").toHaveLength(1)
      await act(async () => {
        for (const resolver of pendientes) resolver()
        await new Promise((r) => setTimeout(r, 0))
      })
      await waitFor(() => expect(screen.queryByRole("button", { name: lugar.boton })).toBeNull())
      for (const texto of lugar.textos) {
        const veces = lugar.contar ? lugar.contar(texto) : screen.getAllByText(texto).length
        expect(veces, `«${texto}»`).toBe(1)
      }
      expect(document.activeElement, "el foco quedó en <body>").not.toBe(document.body)
    },
  )
})
