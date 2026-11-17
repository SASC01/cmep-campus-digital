// FORO-01c2 (§E7.3 "Frontend", punto 8 a; ESTADO §3, fila "CHORE-06a, los «sin caso» de CH6-A14"):
// FORO-1C40, los dos vecinos sin caso de CH6-A14 en la tarea nueva y en su edición. Con el router real
// (`rutas`) y el QueryClient de app/providers.tsx.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1c2f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const CLASE = uuid("2a2b3c4d", 1)
const TAREA_ID = uuid("7a7b3c4d", 1)
const MAESTRO = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez" }
const ESPERA = { timeout: 5000 }
const BASE = `/maestro/clases/${CLASE}`
const API_TAREAS = `/api/clases/${CLASE}/tareas`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const validacion = (mensaje: string) =>
  respuestaJson(400, { error: { codigo: "VALIDACION", mensaje } })

const tareaJson = () => ({
  tarea: {
    id: TAREA_ID,
    titulo: "Ensayo final",
    instrucciones: "",
    fechaLimite: "2030-01-15T16:00:00.000Z",
    puntos: 10,
    aceptaTardias: true,
    requiereAdjuntos: true,
    version: 2,
    categoria: null,
    tema: null,
    rubrica: [],
    adjuntos: [],
    autor: { ...MAESTRO, administracion: false },
    creadoEn: "2026-10-06T15:30:00.000Z",
    actualizadoEn: "2026-10-06T15:30:00.000Z",
    puedeEditar: true,
    puedeBorrar: true,
  },
})

interface Llamada {
  metodo: string
  url: URL
}

let respuestasDeEscritura: (() => Response)[]
let llamadas: Llamada[]

const responder = ({ metodo, url }: Llamada): Response => {
  const ruta = url.pathname
  if (ruta === "/api/me") {
    return respuestaJson(200, {
      id: MAESTRO.id,
      nombre: MAESTRO.nombre,
      email: "luis@ejemplo.mx",
      rol: "maestro",
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  if (ruta === "/api/clases/impartidas") {
    return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
  }
  if (ruta === `/api/clases/${CLASE}`) {
    return respuestaJson(200, {
      clase: {
        id: CLASE,
        nombre: "Historia",
        descripcion: null,
        maestro: MAESTRO,
        maestros: [MAESTRO],
        archivadaEn: null,
      },
    })
  }
  if (ruta === `/api/clases/${CLASE}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
  if (ruta.endsWith("/temas")) return respuestaJson(200, { temas: [], sinTema: 0 })
  if (ruta.endsWith("/categorias")) return respuestaJson(200, { categorias: [] })
  if (metodo !== "GET") {
    const siguiente = respuestasDeEscritura.shift()
    if (siguiente === undefined) throw new Error("Precondición: el doble no tiene respuesta")
    return siguiente()
  }
  if (ruta === `${API_TAREAS}/${TAREA_ID}`) return respuestaJson(200, tareaJson())
  return respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: `no esperada: ${ruta}` } })
}

const montar = async (entrada: string) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [entrada] })
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return cliente
}

const reposar = (ms = 150) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))

const escrituras = () => llamadas.filter(({ metodo }) => metodo !== "GET")
const marcados = () => document.querySelectorAll("[aria-invalid='true']")

const MODOS = [
  {
    modo: "la tarea nueva",
    ruta: `${BASE}/tareas/nueva`,
    boton: "Publicar tarea",
    preparar: () => {
      fireEvent.change(screen.getByLabelText("Fecha límite"), {
        target: { value: "2030-01-15T10:00" },
      })
    },
  },
  {
    modo: "la edición de la tarea",
    ruta: `${BASE}/tareas/${TAREA_ID}/editar`,
    boton: "Guardar cambios",
    preparar: () => undefined,
  },
] as const

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  respuestasDeEscritura = []
  llamadas = []
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const llamada = { metodo: init?.method ?? "GET", url: new URL(String(entrada), "http://x") }
      llamadas.push(llamada)
      return Promise.resolve().then(() => responder(llamada))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
})

describe("FORO-1C40 · los vecinos de CH6-A14 en la tarea nueva y en su edición", () => {
  it.each(MODOS)(
    "FORO-1C40: en $modo, un 400 VALIDACION de «version:» (un campo que el formulario no pinta en ningún modo; solo lo lleva el cuerpo de la edición) da un solo aviso legible, ningún ErrorDeCampo, conserva lo escrito y el botón sale de la espera",
    async ({ ruta, boton, preparar }) => {
      await montar(ruta)
      const titulo = await screen.findByLabelText("Título", undefined, ESPERA)
      fireEvent.change(titulo, { target: { value: "Lo que escribí" } })
      preparar()
      respuestasDeEscritura = [() => validacion("version: version: Se requiere la versión.")]
      fireEvent.click(screen.getByRole("button", { name: boton }))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      await reposar()
      expect(aviso.error).toHaveBeenCalledWith("Se requiere la versión.")
      expect(marcados()).toHaveLength(0)
      expect(screen.getByLabelText("Título")).toHaveValue("Lo que escribí")
      expect(screen.getByRole("button", { name: boton })).not.toHaveAttribute("aria-busy", "true")
      expect(escrituras()).toHaveLength(1)
    },
  )

  it.each(MODOS)(
    "FORO-1C40: en $modo, tras el ErrorDeCampo de «puntos:» del servidor, un envío que la validación local rechaza por el título muestra solo «Escribe el título de la tarea», sin aviso y sin pedir nada",
    async ({ ruta, boton, preparar }) => {
      await montar(ruta)
      const titulo = await screen.findByLabelText("Título", undefined, ESPERA)
      fireEvent.change(titulo, { target: { value: "Lo que escribí" } })
      preparar()
      respuestasDeEscritura = [() => validacion("puntos: Los puntos no son válidos.")]
      fireEvent.click(screen.getByRole("button", { name: boton }))
      expect(
        await screen.findByText("Los puntos no son válidos.", undefined, ESPERA),
      ).toBeInTheDocument()
      await reposar()
      expect(aviso.error).not.toHaveBeenCalled()
      fireEvent.change(screen.getByLabelText("Título"), { target: { value: "   " } })
      fireEvent.click(screen.getByRole("button", { name: boton }))
      expect(
        await screen.findByText("Escribe el título de la tarea", undefined, ESPERA),
      ).toBeInTheDocument()
      expect(screen.queryByText("Los puntos no son válidos.")).toBeNull()
      expect(marcados()).toHaveLength(1)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(escrituras()).toHaveLength(1)
      expect(screen.getByRole("button", { name: boton })).not.toHaveAttribute("aria-busy", "true")
    },
  )
})
