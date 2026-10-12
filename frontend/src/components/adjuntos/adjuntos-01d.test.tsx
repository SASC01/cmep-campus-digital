import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { AdjuntosDePublicacion } from "./adjuntos-de-publicacion"
import { useSolicitarSubida, useUrlDeDescarga } from "./hooks"
import { rutaDeArchivosDeLaClase } from "./lib"

// ENTREGAS-01d (PR-1D13, R-04): los adjuntos con y sin ruta de archivos. Sin `rutaDeArchivos`, la
// descarga sigue pidiendo la ruta de la clase; con ella, la ruta dada. Los ganchos de siempre piden las
// mismas URL de siempre.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ARCHIVO_ID = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02"
const URL_DE_DESCARGA = "https://almacen.ejemplo.mx/descarga/x?X-Amz-Expires=300"

const pdf = {
  id: ARCHIVO_ID,
  nombre: "trabajo.pdf",
  tipo: "application/pdf",
  tamano: 1000,
  vistaPrevia: null,
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const asignar = vi.fn()
const pedidas: { metodo: string; url: string }[] = []

const nuevoCliente = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

const conCliente = (cliente: QueryClient) =>
  function Envoltorio({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  }

beforeEach(() => {
  establecerToken("token-de-prueba")
  pedidas.length = 0
  vi.stubGlobal("location", { ...window.location, assign: asignar })
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      pedidas.push({ metodo: init?.method ?? "GET", url })
      if (url.endsWith("/descarga")) {
        return Promise.resolve(
          respuestaJson(200, { url: URL_DE_DESCARGA, expiraEn: "2030-01-01T00:00:00.000Z" }),
        )
      }
      return Promise.resolve(
        respuestaJson(201, {
          archivo: { id: ARCHIVO_ID, nombre: "a.pdf", tipo: "application/pdf", tamano: 10 },
          subida: {
            url: "https://almacen.ejemplo.mx/subida/1",
            metodo: "PUT",
            cabeceras: { "Content-Type": "application/pdf" },
            expiraEn: "2030-01-01T00:00:00.000Z",
          },
        }),
      )
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  asignar.mockReset()
  aviso.error.mockClear()
})

describe("adjuntos con ruta de archivos (PR-1D13)", () => {
  it("PR-1D13: sin rutaDeArchivos, «Descargar» pide /api/clases/:claseId/archivos/:id/descarga, como siempre", async () => {
    const cliente = nuevoCliente()
    render(
      <AdjuntosDePublicacion claseId={CLASE_ID} adjuntos={[pdf]} mensajeDeError={() => "error"} />,
      { wrapper: conCliente(cliente) },
    )
    fireEvent.click(screen.getByRole("button", { name: /Descargar/ }))
    await waitFor(() => expect(asignar).toHaveBeenCalledWith(URL_DE_DESCARGA))
    expect(pedidas).toEqual([
      { metodo: "POST", url: `/api/clases/${CLASE_ID}/archivos/${ARCHIVO_ID}/descarga` },
    ])
  })

  it("PR-1D13: con rutaDeArchivos, «Descargar» pide la descarga a esa ruta", async () => {
    const ruta = `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}/entrega`
    render(
      <AdjuntosDePublicacion
        claseId={CLASE_ID}
        adjuntos={[pdf]}
        mensajeDeError={() => "error"}
        rutaDeArchivos={ruta}
      />,
      { wrapper: conCliente(nuevoCliente()) },
    )
    fireEvent.click(screen.getByRole("button", { name: /Descargar/ }))
    await waitFor(() => expect(asignar).toHaveBeenCalledWith(URL_DE_DESCARGA))
    expect(pedidas).toEqual([{ metodo: "POST", url: `${ruta}/archivos/${ARCHIVO_ID}/descarga` }])
  })

  it("PR-1D13: useSolicitarSubida(claseId) y useUrlDeDescarga(claseId) siguen pidiendo las mismas URL", async () => {
    expect(rutaDeArchivosDeLaClase(CLASE_ID)).toBe(`/api/clases/${CLASE_ID}`)
    const envoltorio = conCliente(nuevoCliente())
    const subida = renderHook(() => useSolicitarSubida(CLASE_ID), { wrapper: envoltorio })
    await subida.result.current.mutateAsync({
      nombre: "a.pdf",
      tipo: "application/pdf",
      tamano: 10,
    })
    const descarga = renderHook(() => useUrlDeDescarga(CLASE_ID), { wrapper: envoltorio })
    await descarga.result.current.mutateAsync(ARCHIVO_ID)
    expect(pedidas).toEqual([
      { metodo: "POST", url: `/api/clases/${CLASE_ID}/archivos` },
      { metodo: "POST", url: `/api/clases/${CLASE_ID}/archivos/${ARCHIVO_ID}/descarga` },
    ])
  })
})
