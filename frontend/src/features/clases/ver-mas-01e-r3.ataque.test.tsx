import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { clavePrefijoDelTrabajo } from "@/services/trabajoService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { MuroView } from "./muro-view"
import { TrabajoView } from "./trabajo-view"

// Ataque del Tester, TAREAS-01e, ronda 3 (última del tope): bordes del remedio de T-19 ("Ver más" en
// espera durante una recarga en segundo plano) en "Trabajo de clase" y en el muro, y la revisión
// estática final de 01e. Sin selectores de clase. Ningún caso termina con lugares del limitador
// ocupados.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorDeApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const CLASE = uuid("2a2b3c4d", 1)
const idTema = (n: number) => uuid("7a7b3c4d", n)
const idElemento = (n: number) => uuid("5a5b3c4d", n)
const AUTOR = { id: uuid("3a3b3c4d", 9), nombre: "Luis Pérez", administracion: false }

const material = (n: number) => ({
  id: idElemento(n),
  tipo: "material" as const,
  titulo: `Lectura ${String(n)}`,
  autor: AUTOR,
  creadoEn: "2026-10-01T15:00:00.000Z",
  material: { texto: "", adjuntos: [] },
  tarea: null,
  puedeMover: false,
})

const publicacion = (n: number) => ({
  id: idElemento(100 + n),
  tipo: "anuncio",
  titulo: null,
  texto: `Texto de la publicación ${String(n)}`,
  autor: AUTOR,
  creadoEn: "2026-09-29T15:30:00.000Z",
  comentarios: 0,
  adjuntos: [],
  puedeBorrar: false,
  tarea: null,
})

const esperar = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockReset()
  aviso.error.mockReset()
})

describe("ataque TAREAS-01e r3: «Ver más de <tema>» con su recarga esperando turno en el limitador (sin hallazgo esperado)", () => {
  it("con 8 temas recargándose (6 en vuelo y 2 en fila), «Ver más» del 8.\u00BA está en espera; al terminar todo, el clic pide su página siguiente y no quedan lugares ocupados", async () => {
    const temas = Array.from({ length: 8 }, (_, i) => ({
      id: idTema(i + 1),
      nombre: `U${String(i + 1)}`,
    }))
    const elementos: Record<string, ReturnType<typeof material>[]> = Object.fromEntries(
      temas.map((t, i) => [t.id, Array.from({ length: 7 }, (_, j) => material(i * 10 + j + 1))]),
    )
    let retener = false
    let enVuelo = 0
    const retenidas: (() => void)[] = []
    const conCursor: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada, init) => {
        const url = new URL(String(entrada), "http://localhost")
        if (url.pathname.endsWith("/temas")) {
          return Promise.resolve(
            respuestaJson(200, {
              temas: temas.map((t, orden) => ({ ...t, orden, elementos: 7 })),
              sinTema: 0,
            }),
          )
        }
        if (!url.pathname.endsWith("/trabajo")) {
          return Promise.resolve(errorDeApi(500, "ERROR_INTERNO", "sin manejador"))
        }
        const tema = url.searchParams.get("tema") ?? ""
        const lista = elementos[tema] ?? []
        const cursor = url.searchParams.get("cursor")
        if (cursor !== null) conCursor.push(tema)
        const limite = Number(url.searchParams.get("limite") ?? "20")
        const desde = cursor === null ? 0 : lista.findIndex(({ id }) => id === cursor) + 1
        const pagina = lista.slice(desde, desde + limite)
        const respuesta = () =>
          respuestaJson(200, {
            elementos: pagina,
            siguienteCursor: desde + limite < lista.length ? (pagina.at(-1)?.id ?? null) : null,
          })
        if (!retener) return Promise.resolve(respuesta())
        enVuelo += 1
        return new Promise<Response>((resolver, rechazar) => {
          let asentado = false
          const asentar = () => {
            if (asentado) return false
            asentado = true
            enVuelo -= 1
            return true
          }
          retenidas.push(() => {
            if (asentar()) resolver(respuesta())
          })
          init?.signal?.addEventListener("abort", () => {
            if (asentar()) rechazar(new DOMException("aborted", "AbortError"))
          })
        })
      }),
    )
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const router = createMemoryRouter(
      [{ path: "/estudiante/clases/:claseId/trabajo", element: <TrabajoView /> }],
      { initialEntries: [`/estudiante/clases/${CLASE}/trabajo`] },
    )
    render(
      <QueryClientProvider client={cliente}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    await screen.findByText("Lectura 75")
    retener = true
    await act(async () => {
      void cliente.invalidateQueries({ queryKey: clavePrefijoDelTrabajo(CLASE) })
      await Promise.resolve()
    })
    await waitFor(() => expect(enVuelo).toBe(6))
    const verMas = screen.getByRole("button", { name: /^Ver más de U8/ })
    expect(verMas).toHaveAttribute("aria-busy", "true")
    fireEvent.click(verMas)
    retener = false
    while (retenidas.length > 0 || enVuelo > 0) {
      await act(async () => {
        for (const soltar of retenidas.splice(0)) soltar()
        await Promise.resolve()
      })
      await esperar(5)
    }
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Ver más de U8/ })).not.toHaveAttribute(
        "aria-busy",
        "true",
      ),
    )
    expect(conCursor).toEqual([])
    fireEvent.click(screen.getByRole("button", { name: /^Ver más de U8/ }))
    expect(await screen.findByText("Lectura 77")).toBeInTheDocument()
    expect(conCursor).toEqual([idTema(8)])
    expect(enVuelo).toBe(0)
  })
})

const renderMuro = (rol: "maestro" | "estudiante") => {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[`/${rol}/clases/${CLASE}`]}>
        <Routes>
          <Route path={`/${rol}/clases/:claseId`} element={<MuroView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return cliente
}

describe("ataque TAREAS-01e r3: «Ver más publicaciones» y la recarga del muro (sin hallazgo esperado)", () => {
  it("con el foco en «Ver más publicaciones», una recarga en segundo plano que falla quita el botón y el foco no cae en <body>", async () => {
    let primeras = 0
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada) => {
        const ruta = String(entrada)
        if (!ruta.includes("/publicaciones")) {
          return Promise.resolve(errorDeApi(500, "ERROR_INTERNO", "sin manejador"))
        }
        primeras += 1
        if (primeras >= 2) return Promise.resolve(errorDeApi(500, "ERROR_INTERNO", "x"))
        return Promise.resolve(
          respuestaJson(200, {
            publicaciones: [publicacion(1), publicacion(2)],
            siguienteCursor: idElemento(102),
          }),
        )
      }),
    )
    const cliente = renderMuro("estudiante")
    const verMas = await screen.findByRole("button", { name: "Ver más publicaciones" })
    act(() => verMas.focus())
    await act(() => cliente.invalidateQueries({ queryKey: ["clases", CLASE, "publicaciones"] }))
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Ver más publicaciones" })).toBeNull(),
    )
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(document.activeElement).not.toBe(document.body)
  })

  it("maestro: con un anuncio en vuelo (O-18) y el muro recargándose a la vez, «Ver más» espera la recarga, después pide su página, y se publica un solo anuncio", async () => {
    let soltarPost: (r: Response) => void = () => undefined
    let soltarRecarga: () => void = () => undefined
    let lecturas = 0
    const pedidas: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada, init) => {
        const ruta = String(entrada)
        const metodo = init?.method ?? "GET"
        pedidas.push(`${metodo} ${ruta}`)
        if (!ruta.includes("/publicaciones")) {
          return Promise.resolve(errorDeApi(500, "ERROR_INTERNO", "sin manejador"))
        }
        if (metodo === "POST") {
          return new Promise<Response>((resolver) => {
            soltarPost = resolver
          })
        }
        if (ruta.includes("cursor=")) {
          return Promise.resolve(
            respuestaJson(200, { publicaciones: [publicacion(3)], siguienteCursor: null }),
          )
        }
        lecturas += 1
        const respuesta = respuestaJson(200, {
          publicaciones: [publicacion(1), publicacion(2)],
          siguienteCursor: idElemento(102),
        })
        if (lecturas !== 2) return Promise.resolve(respuesta)
        return new Promise<Response>((resolver) => {
          soltarRecarga = () => resolver(respuesta)
        })
      }),
    )
    const cliente = renderMuro("maestro")
    const verMas = await screen.findByRole("button", { name: "Ver más publicaciones" })
    fireEvent.change(screen.getByLabelText("Anuncio"), { target: { value: "Aviso" } })
    fireEvent.click(screen.getByRole("button", { name: "Publicar anuncio" }))
    await waitFor(() => expect(pedidas.filter((p) => p.startsWith("POST"))).toHaveLength(1))
    void cliente.invalidateQueries({ queryKey: ["clases", CLASE, "publicaciones"] })
    await waitFor(() => expect(verMas).toHaveAttribute("aria-busy", "true"))
    fireEvent.click(screen.getByRole("button", { name: "Material" }))
    expect(screen.getByRole("button", { name: /^Publicar / })).toHaveTextContent("Publicar anuncio")
    fireEvent.click(verMas)
    await act(async () => {
      soltarRecarga()
      await Promise.resolve()
    })
    await waitFor(() => expect(verMas).not.toHaveAttribute("aria-busy"))
    expect(pedidas.filter((p) => p.includes("cursor="))).toEqual([])
    fireEvent.click(verMas)
    expect(await screen.findByText("Texto de la publicación 3")).toBeInTheDocument()
    await act(async () => {
      soltarPost(respuestaJson(201, { publicacion: publicacion(9) }))
      await Promise.resolve()
    })
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    expect(pedidas.filter((p) => p.startsWith("POST"))).toHaveLength(1)
    await waitFor(() => expect(cliente.isFetching()).toBe(0))
  })
})

// Revisión estática final de 01e: los archivos nuevos o cambiados de features/clases y el destino de
// acciones-de-la-tarea.tsx.
const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})
const DE_01E = [
  "/src/features/clases/trabajo-view.tsx",
  "/src/features/clases/categorias-view.tsx",
  "/src/features/clases/components/seccion-de-tema.tsx",
  "/src/features/clases/components/fila-de-entrega.tsx",
  "/src/features/clases/components/elemento-de-trabajo.tsx",
  "/src/features/clases/components/formulario-tema.tsx",
  "/src/features/clases/components/mover-elemento.tsx",
  "/src/features/clases/components/editor-de-categorias.tsx",
  "/src/features/clases/components/formulario-publicacion.tsx",
  "/src/features/clases/components/secciones-de-clase.tsx",
  "/src/features/clases/lib.ts",
  "/src/features/clases/hooks.ts",
  "/src/features/clases/data.ts",
  "/src/features/tareas/components/acciones-de-la-tarea.tsx",
]

describe("ataque TAREAS-01e r3: revisión estática final de 01e (sin hallazgo esperado)", () => {
  it("los 14 archivos de 01e existen; sin tipos fuera de types.ts salvo Props, sin ?? [], sin disabled, sin fetch(, sin console., sin dangerouslySetInnerHTML, sin importar de otro módulo de features y sin valores arbitrarios de color o medida", () => {
    const faltan = DE_01E.filter((ruta) => fuentes[ruta] === undefined)
    expect(faltan).toEqual([])
    const reglas: [string, RegExp][] = [
      [
        "tipo fuera de types.ts",
        /^\s*(?:export\s+)?(?:interface\s+(?!\w*Props\b)\w+|type\s+(?!\w*Props\b)\w+\s*(?:<[^>]*>)?\s*=)/m,
      ],
      ["?? []", /\?\?\s*\[\s*\]/],
      ["disabled en JSX", /<[A-Z][\w.]*[^>]*\sdisabled(?:[\s=>]|\{)/],
      ["fetch(", /\bfetch\(/],
      ["console.", /\bconsole\./],
      ["dangerouslySetInnerHTML", /dangerouslySetInnerHTML/],
      ["valor arbitrario", /-\[(?:#|\d+(?:\.\d+)?(?:px|rem|em|vh|vw))/],
    ]
    const violaciones = DE_01E.flatMap((ruta) => {
      const texto = fuentes[ruta] ?? ""
      return reglas.filter(([, regla]) => regla.test(texto)).map(([nombre]) => `${ruta}: ${nombre}`)
    })
    expect(violaciones).toEqual([])
    const cruzadas = DE_01E.filter((ruta) => {
      const texto = fuentes[ruta] ?? ""
      if (ruta.startsWith("/src/features/clases/")) return /from\s+["']@\/features\//.test(texto)
      return /from\s+["']@\/features\/clases/.test(texto)
    })
    expect(cruzadas).toEqual([])
  })
})
