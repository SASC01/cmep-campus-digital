import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ContextoDeSoloLectura } from "@/components/clase/contexto-de-solo-lectura"
import { celdasDeLaHoja } from "@/lib/lector-xlsx-de-prueba"
import { descargarArchivo } from "@/services/descargaService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { GradebookView } from "./gradebook-view"
import { MisCalificacionesView } from "./mis-calificaciones-view"

// FORO-01e (§D-8.5, FORO-1E11 a FORO-1E14): el foro en el gradebook (pide conTipo=si y la celda de un
// foro lleva a la participación del alumno), en "Mis calificaciones" (enlaza al foro; en una clase
// anterior, sin enlace), en el modal de cálculo (cuenta en su categoría) y en la exportación (su columna).
// El servidor es un doble en memoria (fetch); la descarga, un doble. Reloj fijo en todas (solo Date).

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
}))
vi.mock("@/services/descargaService", () => ({ descargarArchivo: vi.fn() }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-20T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const uuid = (n: number) => `9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`
const TAREA = { id: uuid(101), titulo: "Ensayo", fechaLimite: FUTURA, puntos: 10, categoria: null }
const FORO = {
  id: uuid(102),
  titulo: "Debate",
  fechaLimite: FUTURA,
  puntos: 10,
  categoria: { id: uuid(201), nombre: "Foros" },
}
const ANA = { id: uuid(301), nombre: "Ana Ruiz" }

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

let urls: string[] = []
let conTipoEnLaRespuesta = true

const gradebook = (url: URL) => {
  const conTipo = conTipoEnLaRespuesta && url.searchParams.get("conTipo") === "si"
  return {
    tareas: [
      { ...TAREA, ...(conTipo ? { tipo: "tarea" } : {}) },
      { ...FORO, ...(conTipo ? { tipo: "foro" } : {}) },
    ],
    siguienteCursorTareas: null,
    alumnos: [
      {
        alumno: ANA,
        celdas: [
          { tareaId: TAREA.id, estado: "entregado", conRetraso: false, calificacion: null },
          { tareaId: FORO.id, estado: "calificado", conRetraso: false, calificacion: 9 },
        ],
        porcentaje: 90,
        vencidasSinEntregar: 0,
        motivosDeRiesgo: [],
      },
    ],
    siguienteCursor: null,
    resumen: { modo: "categorias", totalAlumnos: 1, promedioDeLaClase: 90, alumnosEnRiesgo: 0 },
  }
}

const misCalificaciones = (url: URL) => {
  const conTipo = conTipoEnLaRespuesta && url.searchParams.get("conTipo") === "si"
  return {
    general: {
      modo: "categorias",
      porcentaje: 90,
      puntos: { obtenido: 9, posible: 10, tareas: 1 },
      categorias: [
        {
          id: uuid(201),
          nombre: "Foros",
          peso: 100,
          pesoEfectivo: 100,
          porcentaje: 90,
          obtenido: 9,
          posible: 10,
          tareas: 1,
        },
      ],
      sinCategoria: { tareas: 1 },
    },
    tareas: [
      {
        ...TAREA,
        ...(conTipo ? { tipo: "tarea" } : {}),
        entrega: { estado: "asignado", conRetraso: false, calificacion: null },
      },
      {
        ...FORO,
        ...(conTipo ? { tipo: "foro" } : {}),
        entrega: { estado: "calificado", conRetraso: false, calificacion: 9 },
      },
    ],
    siguienteCursor: null,
  }
}

const exportacion = () => ({
  clase: { nombre: "Historia" },
  tareas: [TAREA, FORO],
  siguienteCursorTareas: null,
  totalTareas: 2,
  alumnos: [
    {
      alumno: { ...ANA, email: "ana.ruiz@ejemplo.mx" },
      celdas: [
        { tareaId: TAREA.id, estado: "entregado", conRetraso: false, calificacion: null },
        { tareaId: FORO.id, estado: "calificado", conRetraso: false, calificacion: 9 },
      ],
      porcentaje: 90,
    },
  ],
  siguienteCursor: null,
  totalAlumnos: 1,
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  urls = []
  conTipoEnLaRespuesta = true
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) => {
      const url = new URL(String(entrada), "http://local")
      urls.push(String(entrada))
      if (url.pathname === `/api/clases/${CLASE_ID}/gradebook`) {
        return Promise.resolve(respuestaJson(200, gradebook(url)))
      }
      if (url.pathname === `/api/clases/${CLASE_ID}/mis-calificaciones`) {
        return Promise.resolve(respuestaJson(200, misCalificaciones(url)))
      }
      if (url.pathname === `/api/clases/${CLASE_ID}/calificaciones/exportacion`) {
        return Promise.resolve(respuestaJson(200, exportacion()))
      }
      return Promise.resolve(
        respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } }),
      )
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.mocked(descargarArchivo).mockReset()
})

const montar = (ruta: string, elemento: ReactNode, soloLectura = false) => {
  const router = createMemoryRouter(
    [
      { path: "/:rol/clases/:claseId/calificaciones", element: elemento },
      { path: "/:rol/clases/:claseId/*", element: <p>Destino de prueba</p> },
    ],
    { initialEntries: [ruta] },
  )
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={cliente}>
      <ContextoDeSoloLectura.Provider value={soloLectura}>
        <RouterProvider router={router} />
      </ContextoDeSoloLectura.Provider>
    </QueryClientProvider>,
  )
  return router
}

describe("FORO-1E11 · el gradebook con un foro", () => {
  it.each(["maestro", "admin"] as const)(
    "FORO-1E11: %s: el gradebook pide conTipo=si; la celda del foro enlaza a la participación del alumno y la de la tarea, a su entrega",
    async (rol) => {
      montar(`/${rol}/clases/${CLASE_ID}/calificaciones`, <GradebookView />)
      const tabla = await screen.findByRole("table", { name: "Calificaciones por alumno y tarea" })
      expect(urls.some((url) => url.includes("/gradebook?") && url.includes("conTipo=si"))).toBe(
        true,
      )
      const foro = within(tabla).getByRole("link", { name: "9 Ana Ruiz, Debate" })
      expect(foro).toHaveAttribute(
        "href",
        `/${rol}/clases/${CLASE_ID}/foros/${FORO.id}/participantes/${ANA.id}`,
      )
      const tarea = within(tabla).getByRole("link", { name: "Entregado Ana Ruiz, Ensayo" })
      expect(tarea).toHaveAttribute(
        "href",
        `/${rol}/clases/${CLASE_ID}/tareas/${TAREA.id}/entregas/${ANA.id}`,
      )
    },
  )

  it("FORO-1E11: sin tipo en la respuesta, cada celda enlaza como una tarea (como hoy)", async () => {
    conTipoEnLaRespuesta = false
    montar(`/maestro/clases/${CLASE_ID}/calificaciones`, <GradebookView />)
    const tabla = await screen.findByRole("table", { name: "Calificaciones por alumno y tarea" })
    expect(within(tabla).getByRole("link", { name: "9 Ana Ruiz, Debate" })).toHaveAttribute(
      "href",
      `/maestro/clases/${CLASE_ID}/tareas/${FORO.id}/entregas/${ANA.id}`,
    )
  })
})

describe("FORO-1E12 · «Mis calificaciones» con un foro", () => {
  it("FORO-1E12: pide conTipo=si; el foro enlaza a ../foros/:id y la tarea a ../tareas/:id", async () => {
    montar(`/estudiante/clases/${CLASE_ID}/calificaciones`, <MisCalificacionesView />)
    const foro = await screen.findByRole("link", { name: "Debate" })
    expect(foro).toHaveAttribute("href", `/estudiante/clases/${CLASE_ID}/foros/${FORO.id}`)
    expect(screen.getByRole("link", { name: "Ensayo" })).toHaveAttribute(
      "href",
      `/estudiante/clases/${CLASE_ID}/tareas/${TAREA.id}`,
    )
    expect(
      urls.some((url) => url.includes("/mis-calificaciones?") && url.includes("conTipo=si")),
    ).toBe(true)
    fireEvent.click(foro)
    expect(await screen.findByText("Destino de prueba")).toBeInTheDocument()
  })

  it("FORO-1E12: en una clase anterior (solo lectura) el foro no lleva enlace, como la tarea (S-04)", async () => {
    montar(`/estudiante/clases/${CLASE_ID}/calificaciones`, <MisCalificacionesView />, true)
    expect(await screen.findByText("Debate")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Debate" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Ensayo" })).toBeNull()
  })
})

describe("FORO-1E13 · el modal de cálculo cuenta el foro en su categoría", () => {
  it("FORO-1E13: la categoría «Foros» del foro calificado aparece con su porcentaje y su conteo", async () => {
    montar(`/estudiante/clases/${CLASE_ID}/calificaciones`, <MisCalificacionesView />)
    const boton = await screen.findByRole("button", { name: "Ver cálculo" })
    act(() => boton.focus())
    fireEvent.click(boton)
    const dialogo = await screen.findByRole("dialog", { name: "Cálculo de tu calificación" })
    const foros = within(dialogo).getByRole("row", { name: /^Foros / })
    expect(within(foros).getAllByText("100 %")).not.toHaveLength(0)
    expect(within(foros).getByText("90 %")).toBeInTheDocument()
    expect(within(foros).getByText("1")).toBeInTheDocument()
    expect(within(dialogo).getByText("Tu calificación general: 90 %.")).toBeInTheDocument()
  })
})

describe("FORO-1E14 · la exportación trae la columna del foro", () => {
  it("FORO-1E14: el .xlsx lleva la columna del foro con la calificación del alumno", async () => {
    montar(`/maestro/clases/${CLASE_ID}/calificaciones`, <GradebookView />)
    await screen.findByRole("table", { name: "Calificaciones por alumno y tarea" })
    const boton = screen.getByRole("button", { name: "Exportar a Excel" })
    act(() => boton.focus())
    fireEvent.click(boton)
    await waitFor(() => expect(descargarArchivo).toHaveBeenCalledTimes(1))
    const [bytes] = vi.mocked(descargarArchivo).mock.calls[0] ?? []
    expect(bytes).toBeInstanceOf(Uint8Array)
    const celdas = celdasDeLaHoja(bytes as Uint8Array)
    const valor = (ref: string) => celdas.get(ref)?.valor
    expect([valor("C1"), valor("D1")]).toEqual(["Ensayo", "Debate"])
    expect([valor("A4"), valor("D4")]).toEqual(["Ana Ruiz", "9"])
    expect(valor("C2")).toBe("Sin categoría")
    expect(valor("D2")).toBe("Foros")
  })
})
