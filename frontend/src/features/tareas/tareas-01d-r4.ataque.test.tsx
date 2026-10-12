import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { EditarTareaView } from "./editar-tarea-view"
import { claveDeFocoDeLaTarea } from "./lib"

// Ataque del Tester, TAREAS-01d, ronda 4 cerrada: solo T-15 (la clave de foco común de detalle y
// edición, claveDeFocoDeLaTarea). Sin selectores de clase.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const tareaDetalle = (titulo: string) => ({
  id: TAREA_ID,
  titulo,
  instrucciones: "Dos páginas.",
  fechaLimite: "2030-01-15T16:00:00.000Z",
  puntos: 100,
  aceptaTardias: true,
  categoria: null,
  tema: null,
  rubrica: [],
  adjuntos: [],
  autor: {
    id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
    nombre: "Luis Pérez",
    administracion: false,
  },
  creadoEn: "2026-10-06T15:30:00.000Z",
  actualizadoEn: "2026-10-06T15:30:00.000Z",
  puedeEditar: true,
  puedeBorrar: true,
})

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

const momento = (cambios: Partial<Parameters<typeof claveDeFocoDeLaTarea>[1]> = {}) => ({
  status: "success" as const,
  dataUpdatedAt: 1000,
  errorUpdatedAt: 0,
  errorUpdateCount: 0,
  ...cambios,
})

describe("ataque TAREAS-01d r4: T-15, la clave de foco común", () => {
  it("la clave es la misma para dos momentos iguales (objetos distintos) y cambia con cada uno de sus cinco componentes", () => {
    const base = claveDeFocoDeLaTarea(TAREA_ID, momento())
    expect(claveDeFocoDeLaTarea(TAREA_ID, momento())).toBe(base)
    const variantes = [
      claveDeFocoDeLaTarea("otra", momento()),
      claveDeFocoDeLaTarea(TAREA_ID, momento({ status: "error" })),
      claveDeFocoDeLaTarea(TAREA_ID, momento({ dataUpdatedAt: 1001 })),
      claveDeFocoDeLaTarea(TAREA_ID, momento({ errorUpdatedAt: 5 })),
      claveDeFocoDeLaTarea(TAREA_ID, momento({ errorUpdateCount: 1 })),
    ]
    expect(new Set([base, ...variantes]).size).toBe(6)
  })

  it("edición: escribir en «Título» (renders sin cambio de la consulta) no mueve el foco; éxito → 500 → 404 lleva el foco a la raíz, no a <body>", async () => {
    let respuestas = 0
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada) => {
        const url = String(entrada)
        if (url.endsWith("/categorias"))
          return Promise.resolve(respuestaJson(200, { categorias: [] }))
        if (url.endsWith("/temas"))
          return Promise.resolve(respuestaJson(200, { temas: [], sinTema: 0 }))
        respuestas += 1
        if (respuestas === 3)
          return Promise.resolve(errorApi(500, "ERROR_INTERNO", "Error interno"))
        if (respuestas >= 4)
          return Promise.resolve(errorApi(404, "TAREA_NO_ENCONTRADA", "Esa tarea ya no existe."))
        return Promise.resolve(
          respuestaJson(200, { tarea: tareaDetalle(respuestas === 1 ? "Ensayo" : "Ensayo v2") }),
        )
      }),
    )
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={cliente}>
        <MemoryRouter initialEntries={[`/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/editar`]}>
          <Routes>
            <Route
              path="/maestro/clases/:claseId/tareas/:tareaId/editar"
              element={<EditarTareaView />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    const titulo = await screen.findByLabelText("Título")
    act(() => titulo.focus())
    for (const texto of ["M", "Mi", "Mío"]) {
      fireEvent.change(screen.getByLabelText("Título"), { target: { value: texto } })
      expect(screen.getByLabelText("Título")).toHaveFocus()
    }
    const recargar = async () => {
      await act(async () => {
        await new Promise((resolver) => setTimeout(resolver, 5))
      })
      await act(() => cliente.refetchQueries({ type: "active" }))
      await waitFor(() => expect(cliente.isFetching()).toBe(0))
    }
    await recargar()
    expect(respuestas).toBe(2)
    expect(screen.getByLabelText("Título")).toHaveFocus()
    expect(screen.getByLabelText("Título")).toHaveValue("Mío")
    await recargar()
    expect(respuestas).toBe(3)
    expect(screen.getByLabelText("Título")).toHaveFocus()
    await recargar()
    expect(respuestas).toBe(4)
    expect(await screen.findByText("Esa tarea ya no existe.")).toBeInTheDocument()
    expect(document.activeElement).not.toBe(document.body)
  })
})
