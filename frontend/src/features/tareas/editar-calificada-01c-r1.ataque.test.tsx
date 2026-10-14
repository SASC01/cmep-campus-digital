import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { EditarTareaView } from "./editar-tarea-view"

// Ataque (CALIFICACIONES-01c, ronda 1): editar una tarea calificada. 409 TAREA_CON_CALIFICACIONES
// conserva lo escrito y no pide la tarea; su vecino TAREA_MODIFICADA sigue recargando y reiniciando
// como en ENTREGAS-01a. Reloj fijo (solo Date). Servidor en memoria.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const CRITERIO_1 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d81"
const RUTA_TAREA = `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const MENSAJE_CON_CALIFICACIONES =
  "Esta tarea ya tiene calificaciones: no puedes cambiar sus puntos ni su rúbrica. Lo demás sí se puede editar."
const MENSAJE_MODIFICADA_TAREA = "Otra persona cambió esta tarea mientras la editabas."

const tareaDoble = (extra: Record<string, unknown> = {}) => ({
  tarea: {
    id: TAREA_ID,
    titulo: "Ensayo final",
    instrucciones: "",
    fechaLimite: "2030-01-15T16:00:00.000Z",
    puntos: 10,
    aceptaTardias: true,
    requiereAdjuntos: true,
    version: 4,
    categoria: null,
    tema: null,
    rubrica: [{ id: CRITERIO_1, criterio: "Claridad", puntosMax: 10 }],
    adjuntos: [],
    autor: {
      id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
      nombre: "Luis Pérez",
      administracion: false,
    },
    creadoEn: "2030-01-01T15:30:00.000Z",
    actualizadoEn: "2030-01-01T15:30:00.000Z",
    puedeEditar: true,
    puedeBorrar: true,
    ...extra,
  },
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorApi = (estado: number, codigo: string, mensaje = "x") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface Llamada {
  metodo: string
  url: string
  cuerpo: unknown
}

let llamadas: Llamada[] = []
let tarea: () => Response
let guardar: () => Response | Promise<Response>

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  llamadas = []
  tarea = () => respuestaJson(200, tareaDoble())
  guardar = () => errorApi(409, "TAREA_CON_CALIFICACIONES", MENSAJE_CON_CALIFICACIONES)
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null
      llamadas.push({ metodo, url, cuerpo })
      if (metodo === "GET" && url === RUTA_TAREA) return Promise.resolve(tarea())
      if (metodo === "PUT" && url === RUTA_TAREA) return Promise.resolve(guardar())
      if (url.endsWith("/categorias"))
        return Promise.resolve(respuestaJson(200, { categorias: [] }))
      if (url.endsWith("/temas"))
        return Promise.resolve(respuestaJson(200, { temas: [], sinTema: 0 }))
      return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

const renderEditar = () => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[`/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/editar`]}>
        <Routes>
          <Route
            path="/maestro/clases/:claseId/tareas/:tareaId/editar"
            element={<EditarTareaView />}
          />
          <Route
            path="/maestro/clases/:claseId/tareas/:tareaId"
            element={<p>Detalle de prueba</p>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return cliente
}

const sinPeticionesEnVuelo = async (cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isFetching() + cliente.isMutating()).toBe(0))
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const lecturas = () => llamadas.filter((l) => l.metodo === "GET" && l.url === RUTA_TAREA)
const guardados = () => llamadas.filter((l) => l.metodo === "PUT" && l.url === RUTA_TAREA)

describe("ataque 01c r1 · editar una tarea calificada", () => {
  it("CAL-T-92: con 409 TAREA_CON_CALIFICACIONES, un doble clic manda un PUT; el botón sale de la espera con el foco, lo escrito sigue y el siguiente guardado reenvía la versión de apertura sin haber pedido la tarea", async () => {
    const cliente = renderEditar()
    const titulo = await screen.findByLabelText("Título")
    await sinPeticionesEnVuelo(cliente)
    const lecturasAntes = lecturas().length
    fireEvent.change(titulo, { target: { value: "Lo que escribí" } })
    fireEvent.change(screen.getByLabelText("Puntos"), { target: { value: "20" } })
    const boton = screen.getByRole("button", { name: "Guardar cambios" })
    boton.focus()
    fireEvent.click(boton)
    fireEvent.click(boton)

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await sinPeticionesEnVuelo(cliente)
    expect(guardados()).toHaveLength(1)
    expect(aviso.error).toHaveBeenCalledWith(MENSAJE_CON_CALIFICACIONES)
    expect(screen.getByRole("button", { name: "Guardar cambios" })).not.toHaveAttribute("aria-busy")
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toHaveFocus()
    expect(screen.getByLabelText("Título")).toHaveValue("Lo que escribí")
    expect(screen.getByLabelText("Puntos")).toHaveValue(20)

    vi.setSystemTime(new Date(Date.now() + 5_000))
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
    await sinPeticionesEnVuelo(cliente)
    expect(guardados()).toHaveLength(2)
    expect(guardados().map((l) => (l.cuerpo as { version: number }).version)).toEqual([4, 4])
    expect(lecturas()).toHaveLength(lecturasAntes)
    expect(screen.queryByText("Detalle de prueba")).toBeNull()
  })

  it("CAL-T-93: su vecino 409 TAREA_MODIFICADA sigue igual: un aviso, una lectura de la tarea, el formulario reinicia con la versión nueva y el foco en «Título»", async () => {
    guardar = () => errorApi(409, "TAREA_MODIFICADA", MENSAJE_MODIFICADA_TAREA)
    const cliente = renderEditar()
    const titulo = await screen.findByLabelText("Título")
    await sinPeticionesEnVuelo(cliente)
    const lecturasAntes = lecturas().length
    fireEvent.change(titulo, { target: { value: "Lo que escribí" } })
    tarea = () => respuestaJson(200, tareaDoble({ version: 5, titulo: "Título de otra persona" }))
    const boton = screen.getByRole("button", { name: "Guardar cambios" })
    vi.setSystemTime(new Date(Date.now() + 5_000))
    boton.focus()
    fireEvent.click(boton)

    await waitFor(() =>
      expect(screen.getByLabelText("Título")).toHaveValue("Título de otra persona"),
    )
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(aviso.error).toHaveBeenCalledWith(MENSAJE_MODIFICADA_TAREA)
    expect(lecturas().length - lecturasAntes).toBe(1)
    expect(screen.getByLabelText("Título")).toHaveFocus()

    guardar = () => errorApi(409, "TAREA_CON_CALIFICACIONES", MENSAJE_CON_CALIFICACIONES)
    vi.setSystemTime(new Date(Date.now() + 5_000))
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
    await sinPeticionesEnVuelo(cliente)
    expect((guardados()[1]?.cuerpo as { version: number }).version).toBe(5)
    expect(lecturas().length - lecturasAntes).toBe(1)
  })
})
