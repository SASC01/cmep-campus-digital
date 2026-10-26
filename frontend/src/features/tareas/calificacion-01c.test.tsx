import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { DetalleTareaView } from "./detalle-tarea-view"
import { EditarTareaView } from "./editar-tarea-view"

// CALIFICACIONES-01c (CAL-1C09 y CAL-1C10): la calificación en «Tu trabajo» del alumno y el aviso al
// editar una tarea calificada. Reloj fijo en todas (solo Date). El servidor es un doble en memoria.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const PASADA = "2030-01-05T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const CRITERIO_1 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d81"
const CRITERIO_2 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d82"
const RUTA_TAREA = `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const RUTA_ENTREGA = `${RUTA_TAREA}/entrega`
const MENSAJE_CON_CALIFICACIONES =
  "Esta tarea ya tiene calificaciones: no puedes cambiar sus puntos ni su rúbrica. Lo demás sí se puede editar."

const tareaDoble = (extra: Record<string, unknown> = {}) => ({
  tarea: {
    id: TAREA_ID,
    titulo: "Ensayo final",
    instrucciones: "",
    fechaLimite: FUTURA,
    puntos: 10,
    aceptaTardias: true,
    requiereAdjuntos: true,
    version: 4,
    categoria: null,
    tema: null,
    rubrica: [
      { id: CRITERIO_1, criterio: "Claridad", puntosMax: 5 },
      { id: CRITERIO_2, criterio: "Ortografía", puntosMax: 4 },
    ],
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

const calificacionDoble = (extra: Record<string, unknown> = {}) => ({
  puntos: 8.5,
  sobre: 10,
  fecha: "2030-01-09T18:00:00.000Z",
  puntajes: [
    { criterioId: CRITERIO_1, criterio: "Claridad", puntosMax: 5, puntos: 4.5 },
    { criterioId: CRITERIO_2, criterio: "Ortografía", puntosMax: 4, puntos: 3.25 },
  ],
  ...extra,
})

const miEntregaDoble = (extra: Record<string, unknown> = {}) => ({
  estado: "entregado",
  fechaEntrega: "2030-01-09T15:30:00.000Z",
  conRetraso: false,
  enlaces: ["https://ejemplo.com/mi-trabajo"],
  adjuntos: [],
  puedeEntregar: false,
  puedeAnular: true,
  calificacion: null,
  ...extra,
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
}

let llamadas: Llamada[] = []
let tarea: () => Response
let entrega: () => Response
let guardar: () => Response

const instalarServidor = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      llamadas.push({ metodo, url })
      if (metodo === "GET" && url === RUTA_TAREA) return Promise.resolve(tarea())
      if (metodo === "PUT" && url === RUTA_TAREA) return Promise.resolve(guardar())
      if (metodo === "GET" && url === RUTA_ENTREGA) return Promise.resolve(entrega())
      if (metodo === "GET" && url.startsWith(`${RUTA_ENTREGA}/comentarios?`)) {
        return Promise.resolve(respuestaJson(200, { comentarios: [], siguienteCursor: null }))
      }
      if (url.endsWith("/categorias"))
        return Promise.resolve(respuestaJson(200, { categorias: [] }))
      if (url.endsWith("/temas")) {
        return Promise.resolve(respuestaJson(200, { temas: [], sinTema: 0 }))
      }
      return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
}

const renderEn = (ruta: string) => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route
            path="/estudiante/clases/:claseId/tareas/:tareaId"
            element={<DetalleTareaView />}
          />
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

const tuTrabajo = async () => {
  const titulo = await screen.findByRole("heading", { name: "Tu trabajo", level: 3 })
  const seccion = titulo.closest("section")
  if (seccion === null) throw new Error("Precondición: «Tu trabajo» es una sección")
  return seccion
}

const sinPeticionesEnVuelo = async (cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isFetching() + cliente.isMutating()).toBe(0))
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  llamadas = []
  tarea = () => respuestaJson(200, tareaDoble())
  entrega = () => respuestaJson(200, { entrega: miEntregaDoble() })
  guardar = () => respuestaJson(200, tareaDoble({ version: 5 }))
  instalarServidor()
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

const DETALLE = `/estudiante/clases/${CLASE_ID}/tareas/${TAREA_ID}`

describe("la calificación en «Tu trabajo» (CAL-1C09)", () => {
  it("CAL-1C09: calificada con entrega: la frase de hoy, «Calificación: 8.5 de 10», la fecha y el desglose por criterio", async () => {
    entrega = () =>
      respuestaJson(200, {
        entrega: miEntregaDoble({
          estado: "calificado",
          puedeAnular: false,
          calificacion: calificacionDoble(),
        }),
      })
    renderEn(DETALLE)
    const seccion = await tuTrabajo()
    expect(await within(seccion).findByText("Tu entrega ya está calificada.")).toBeInTheDocument()
    expect(within(seccion).getByText("Calificación: 8.5 de 10")).toBeInTheDocument()
    expect(within(seccion).getByText(/^Calificada el .* a las \d{2}:\d{2}$/)).toBeInTheDocument()
    expect(within(seccion).getByText("Claridad: 4.5 de 5")).toBeInTheDocument()
    expect(within(seccion).getByText("Ortografía: 3.25 de 4")).toBeInTheDocument()
    expect(within(seccion).queryByText("No entregaste esta tarea y ya está calificada.")).toBeNull()
    expect(within(seccion).getByText(/^Entregaste el /)).toBeInTheDocument()
  })

  it("CAL-1C09: calificada sin entrega: «No entregaste esta tarea y ya está calificada.», sin la frase de la entrega hecha, y la calificación sin desglose si la tarea no tiene rúbrica", async () => {
    tarea = () =>
      respuestaJson(200, tareaDoble({ fechaLimite: PASADA, aceptaTardias: false, rubrica: [] }))
    entrega = () =>
      respuestaJson(200, {
        entrega: miEntregaDoble({
          estado: "calificado",
          fechaEntrega: null,
          enlaces: [],
          puedeAnular: false,
          calificacion: calificacionDoble({ puntos: 0, puntajes: [] }),
        }),
      })
    renderEn(DETALLE)
    const seccion = await tuTrabajo()
    expect(
      await within(seccion).findByText("No entregaste esta tarea y ya está calificada."),
    ).toBeInTheDocument()
    expect(within(seccion).getByText("Calificación: 0 de 10")).toBeInTheDocument()
    expect(within(seccion).queryByText("Tu entrega ya está calificada.")).toBeNull()
    expect(within(seccion).queryByText(/^Entregaste el /)).toBeNull()
    expect(within(seccion).queryByRole("listitem")).toBeNull()
    expect(within(seccion).queryByRole("button", { name: "Anular entrega" })).toBeNull()
  })

  it("CAL-1C09: sin calificación no aparece nada nuevo", async () => {
    renderEn(DETALLE)
    const seccion = await tuTrabajo()
    expect(await within(seccion).findByText(/^Entregaste el /)).toBeInTheDocument()
    expect(within(seccion).queryByText(/^Calificación:/)).toBeNull()
    expect(within(seccion).queryByText(/^Calificada el /)).toBeNull()
    expect(within(seccion).queryByText("Tu entrega ya está calificada.")).toBeNull()
  })
})

describe("editar una tarea calificada (CAL-1C10)", () => {
  it("CAL-1C10: 409 TAREA_CON_CALIFICACIONES da un aviso con el mensaje del servidor, lo escrito se conserva y no hay GET de la tarea", async () => {
    guardar = () => errorApi(409, "TAREA_CON_CALIFICACIONES", MENSAJE_CON_CALIFICACIONES)
    const cliente = renderEn(`/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/editar`)
    const titulo = await screen.findByLabelText("Título")
    await sinPeticionesEnVuelo(cliente)
    const lecturasAntes = llamadas.filter((l) => l.metodo === "GET" && l.url === RUTA_TAREA).length
    fireEvent.change(titulo, { target: { value: "Lo que escribí" } })
    fireEvent.change(screen.getByLabelText("Puntos"), { target: { value: "20" } })

    const boton = screen.getByRole("button", { name: "Guardar cambios" })
    boton.focus()
    fireEvent.click(boton)

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.error).toHaveBeenCalledWith(MENSAJE_CON_CALIFICACIONES)
    expect(aviso.success).not.toHaveBeenCalled()
    expect(llamadas.filter((l) => l.metodo === "PUT" && l.url === RUTA_TAREA)).toHaveLength(1)
    expect(llamadas.filter((l) => l.metodo === "GET" && l.url === RUTA_TAREA)).toHaveLength(
      lecturasAntes,
    )
    expect(screen.getByLabelText("Título")).toHaveValue("Lo que escribí")
    expect(screen.getByLabelText("Puntos")).toHaveValue(20)
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toHaveFocus()
    expect(screen.queryByText("Detalle de prueba")).toBeNull()
  })
})
