import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { MisCalificacionesView } from "./mis-calificaciones-view"

// Tester, ronda 3 de CALIFICACIONES-01d: "Mis calificaciones" al volver a abrir antes de 30 s (el
// staleTime de la app) tras una página vacía y tras el 400 del cursor de "Ver más tareas"; el
// remedio de T-07 no se aplicó aquí (el programador dice que no tiene el defecto): se demuestra. El
// servidor es un doble en memoria (fetch). Reloj fijo en todas (solo Date).

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const LEJANA = "2030-02-20T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const uuid = (n: number) => `5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`
const RUTA_API = `/api/clases/${CLASE_ID}/mis-calificaciones`
const RUTA_VISTA = `/estudiante/clases/${CLASE_ID}/calificaciones`
const CURSOR_TEXTO =
  "Tus tareas cambiaron mientras las veías. Vuelve a abrir Calificaciones para verlas completas."
const VACIO_TODAS = "Aún no hay tareas en esta clase."
const STALE_DE_PRODUCCION = 30_000

const tarea = (n: number) => ({
  id: uuid(100 + n),
  titulo: `Tarea ${String(n)}`,
  fechaLimite: LEJANA,
  puntos: 10,
  categoria: null,
  entrega: { estado: "asignado", conRetraso: false, calificacion: null },
})

const general = {
  modo: "puntos",
  porcentaje: 85,
  puntos: { obtenido: 85, posible: 100, tareas: 2 },
  categorias: [],
  sinCategoria: { tareas: 0 },
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const cursorInvalido = () =>
  respuestaJson(400, { error: { codigo: "VALIDACION", mensaje: "cursor: no es válido" } })

interface Llamada {
  url: string
  estado: string | null
  cursor: string | null
}

let paginas: ReturnType<typeof tarea>[][] = []
let cursorRoto = false
let llamadas: Llamada[] = []
const cursorDePagina = (indice: number) => uuid(900 + indice)

const instalarServidor = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) => {
      const url = String(entrada)
      const p = new URL(url, "http://local").searchParams
      const llamada = { url, estado: p.get("estado"), cursor: p.get("cursor") }
      llamadas.push(llamada)
      if (!url.startsWith(`${RUTA_API}?`)) {
        return Promise.resolve(
          respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } }),
        )
      }
      if (llamada.cursor !== null && cursorRoto) return Promise.resolve(cursorInvalido())
      const indice = llamada.cursor === null ? 0 : Number(llamada.cursor.slice(-4)) - 900
      const siguiente = indice + 1 < paginas.length ? cursorDePagina(indice + 1) : null
      return Promise.resolve(
        respuestaJson(200, { general, tareas: paginas[indice] ?? [], siguienteCursor: siguiente }),
      )
    }),
  )
}

const nuevoCliente = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: STALE_DE_PRODUCCION, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  })

const montar = (cliente: QueryClient) =>
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[RUTA_VISTA]}>
        <Routes>
          <Route
            path="/estudiante/clases/:claseId/calificaciones"
            element={<MisCalificacionesView />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 8; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const enlacesDeTarea = () =>
  screen.queryAllByRole("link", { name: /^Tarea \d+$/ }).map((e) => e.textContent)
const verMas = () => screen.getByRole("button", { name: "Ver más tareas" })
const sinVerMas = () => screen.queryByRole("button", { name: "Ver más tareas" })
const desde = (indice: number) => llamadas.slice(indice)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  llamadas = []
  paginas = [[tarea(1)], [tarea(2)]]
  cursorRoto = false
  instalarServidor()
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("«Mis calificaciones» al volver a abrir antes de 30 s", () => {
  it("CAL-T-249: tras una página vacía (siguienteCursor nulo) en «Ver más tareas», volver a abrir muestra lo mismo de la caché, sin texto del cursor ni «Ver más tareas»: no hay instrucción que cumplir", async () => {
    paginas = [[tarea(1)], []]
    const cliente = nuevoCliente()
    const primera = montar(cliente)
    expect(await screen.findByRole("link", { name: "Tarea 1" })).toBeInTheDocument()
    fireEvent.click(verMas())
    await waitFor(() => expect(sinVerMas()).toBeNull())
    await reposar()
    primera.unmount()
    const i = llamadas.length
    montar(cliente)
    expect(await screen.findByRole("link", { name: "Tarea 1" })).toBeInTheDocument()
    await reposar()
    expect(enlacesDeTarea()).toEqual(["Tarea 1"])
    expect(sinVerMas()).toBeNull()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(desde(i)).toHaveLength(0)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-T-250: tras el 400 del cursor de «Ver más tareas», volver a abrir con la primera página que llega vacía de verdad: el vacío del filtro, sin el texto del cursor ni «Ver más tareas»", async () => {
    const cliente = nuevoCliente()
    const primera = montar(cliente)
    expect(await screen.findByRole("link", { name: "Tarea 1" })).toBeInTheDocument()
    cursorRoto = true
    paginas = [[]]
    fireEvent.click(verMas())
    expect(await screen.findByText(CURSOR_TEXTO)).toBeInTheDocument()
    primera.unmount()
    const i = llamadas.length
    montar(cliente)
    expect(await screen.findByText(VACIO_TODAS)).toBeInTheDocument()
    await reposar()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
    expect(sinVerMas()).toBeNull()
    expect(enlacesDeTarea()).toEqual([])
    expect(desde(i).filter((l) => l.cursor === null)).toHaveLength(1)
    expect(desde(i).filter((l) => l.cursor !== null)).toHaveLength(0)
  })

  it("CAL-T-251: tras el 400 del cursor, cambiar «Mostrar» a «Asignadas» y volver a «Todas» con la vista montada pide otra vez la primera página y quita el texto", async () => {
    const cliente = nuevoCliente()
    montar(cliente)
    expect(await screen.findByRole("link", { name: "Tarea 1" })).toBeInTheDocument()
    cursorRoto = true
    paginas = [[tarea(1)]]
    fireEvent.click(verMas())
    expect(await screen.findByText(CURSOR_TEXTO)).toBeInTheDocument()
    const filtro = screen.getByRole("combobox", { name: "Mostrar" })
    fireEvent.change(filtro, { target: { value: "asignadas" } })
    await reposar()
    const i = llamadas.length
    fireEvent.change(filtro, { target: { value: "todas" } })
    expect(await screen.findByRole("link", { name: "Tarea 1" })).toBeInTheDocument()
    await reposar()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
    expect(sinVerMas()).toBeNull()
    expect(desde(i).filter((l) => l.cursor === null && l.estado === "todas")).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })
})
