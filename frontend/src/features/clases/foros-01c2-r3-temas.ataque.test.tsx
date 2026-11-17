// FORO-01c2, ronda 3 del tester: el remedio de T-03 (las tres mutaciones de temas y categorías invalidan
// también clavePrefijoDeForos) en los dos sentidos, y el vecino 13 (editar la clase invalida el prefijo
// de la clase). Llama a los ganchos de producción de features/clases/hooks.ts con el router real
// (`rutas`) y el QueryClient de app/providers.tsx (staleTime de 30 s). Ids desde ATQ-FORO-134.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import {
  claveForo,
  claveListaDeForos,
  claveTarea,
  clavePrefijoDelTrabajo,
} from "@/services/trabajoService"

import { useBorrarTema, useEditarClase, useGuardarCategorias, useRenombrarTema } from "./hooks"

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1c2f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const CLASE = uuid("2a2b3c4d", 1)
const FORO = uuid("5a5b3c4d", 1)
const TAREA = uuid("7a7b3c4d", 1)
const MAESTRO = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez" }
const TEMA_ID = uuid("4b4b3c4d", 1)
const CATEGORIA_ID = uuid("4a4b3c4d", 1)
const ESPERA = { timeout: 5000 }
const BASE = `/maestro/clases/${CLASE}`
const API_CLASE = `/api/clases/${CLASE}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

interface Llamada {
  metodo: string
  url: URL
}

interface Estado {
  falla: boolean
  foroEnVuelo: Promise<Response> | null
  llamadas: Llamada[]
}

let estado: Estado

const clase = () => ({
  clase: {
    id: CLASE,
    nombre: "Historia",
    descripcion: null,
    maestro: MAESTRO,
    maestros: [MAESTRO],
    archivadaEn: null,
  },
})

const foroJson = () => ({
  foro: {
    id: FORO,
    titulo: "Debate de la unidad",
    instrucciones: "Opina sobre la lectura.",
    fechaLimite: "2030-01-15T16:00:00.000Z",
    puntos: 20,
    aceptaTardias: false,
    version: 0,
    categoria: { id: CATEGORIA_ID, nombre: "Participación", peso: 30 },
    tema: { id: TEMA_ID, nombre: "Unidad 1" },
    rubrica: [],
    adjuntos: [],
    autor: { ...MAESTRO, administracion: false },
    creadoEn: "2026-10-06T15:30:00.000Z",
    actualizadoEn: "2026-10-06T15:30:00.000Z",
    puedeEditar: true,
    puedeBorrar: true,
  },
})

const fila = {
  id: FORO,
  titulo: "Debate de la unidad",
  autor: { ...MAESTRO, administracion: false },
  creadoEn: "2026-10-01T15:30:00.000Z",
  fechaLimite: "2030-01-15T16:00:00.000Z",
  puntos: 20,
  tema: null,
  participaciones: 0,
  entrega: null,
}

const responder = ({ metodo, url }: Llamada): Response | Promise<Response> => {
  const ruta = url.pathname
  if (ruta === "/api/me") {
    return respuestaJson(200, {
      id: uuid("4f4f3c4d", 1),
      nombre: "Luis Pérez",
      email: "luis@ejemplo.mx",
      rol: "maestro",
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  if (estado.falla && metodo !== "GET") {
    return respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "falló" } })
  }
  if (ruta === "/api/clases/impartidas") {
    return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
  }
  if (ruta === API_CLASE) return respuestaJson(200, clase())
  if (ruta === `/api/admin/clases/${CLASE}` && metodo === "PUT") {
    return respuestaJson(200, clase())
  }
  if (ruta === `${API_CLASE}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
  if (ruta === `${API_CLASE}/foros` && metodo === "GET") {
    return respuestaJson(200, { foros: [fila], siguienteCursor: null })
  }
  if (ruta === `${API_CLASE}/foros/${FORO}`) {
    if (estado.foroEnVuelo !== null) return estado.foroEnVuelo
    return respuestaJson(200, foroJson())
  }
  if (ruta === `${API_CLASE}/temas/${TEMA_ID}` && metodo === "PUT") {
    return respuestaJson(200, {
      tema: { id: TEMA_ID, nombre: "Unidad 1: la Revolución", orden: 0, elementos: 1 },
    })
  }
  if (ruta === `${API_CLASE}/temas/${TEMA_ID}` && metodo === "DELETE") {
    return new Response(null, { status: 204 })
  }
  if (ruta === `${API_CLASE}/categorias` && metodo === "PUT") {
    return respuestaJson(200, {
      categorias: [{ id: CATEGORIA_ID, nombre: "Participación", peso: 45, tareas: 1 }],
    })
  }
  if (ruta === `${API_CLASE}/temas`) return respuestaJson(200, { temas: [], sinTema: 0 })
  return respuestaJson(200, {})
}

function Disparadores() {
  const renombrar = useRenombrarTema(CLASE)
  const borrar = useBorrarTema(CLASE)
  const guardar = useGuardarCategorias(CLASE)
  const editarClase = useEditarClase()
  return (
    <div>
      <button
        type="button"
        onClick={() => renombrar.mutate({ temaId: TEMA_ID, nombre: "Unidad 1: la Revolución" })}
      >
        Renombrar el tema
      </button>
      <button type="button" onClick={() => borrar.mutate(TEMA_ID)}>
        Borrar el tema
      </button>
      <button
        type="button"
        onClick={() =>
          guardar.mutate({ categorias: [{ id: CATEGORIA_ID, nombre: "Participación", peso: 45 }] })
        }
      >
        Guardar las categorías
      </button>
      <button
        type="button"
        onClick={() =>
          editarClase.mutate({
            claseId: CLASE,
            datos: { nombre: "Historia de México" },
          })
        }
      >
        Editar la clase
      </button>
      <p>{`Categorías: ${guardar.status}`}</p>
      <p>{`Renombrar: ${renombrar.status}`}</p>
      <p>{`Borrar: ${borrar.status}`}</p>
      <p>{`Clase: ${editarClase.status}`}</p>
    </div>
  )
}

const ESTADO_POR_ACCION: Record<string, RegExp> = {
  "Renombrar el tema": /^Renombrar: /,
  "Borrar el tema": /^Borrar: /,
  "Guardar las categorías": /^Categorías: /,
  "Editar la clase": /^Clase: /,
}

const lecturasDelForo = () =>
  estado.llamadas.filter(
    ({ metodo, url }) => metodo === "GET" && url.pathname === `${API_CLASE}/foros/${FORO}`,
  )
const lecturasDeLaLista = () =>
  estado.llamadas.filter(
    ({ metodo, url }) => metodo === "GET" && url.pathname === `${API_CLASE}/foros`,
  )

const montar = async (entrada: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [entrada] })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Disparadores />
    </QueryClientProvider>,
  )
  return { router, queryClient }
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  estado = { falla: false, foroEnVuelo: null, llamadas: [] }
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
  vi.mocked(irA).mockClear()
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const llamada = { metodo: init?.method ?? "GET", url: new URL(String(entrada), "http://x") }
      estado.llamadas.push(llamada)
      return Promise.resolve().then(() => responder(llamada))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
})

const ACCIONES = [
  "Renombrar el tema",
  "Borrar el tema",
  "Guardar las categorías",
  "Editar la clase",
] as const

describe("ATQ-FORO-134 · T-03 y el vecino 13: el detalle y la lista del foro quedan viejos y se piden al volver", () => {
  it.each(ACCIONES)(
    "ATQ-FORO-134: «%s», con el detalle del foro y la lista de «Foro» en caché sin observadores, los deja viejos sin pedirlos y los pide al volver",
    async (accion) => {
      const { router, queryClient } = await montar(`${BASE}/foros/${FORO}`)
      await screen.findByRole("heading", { level: 2, name: "Debate de la unidad" }, ESPERA)
      await act(() => router.navigate(`${BASE}/foro`))
      expect(await screen.findByText("Debate de la unidad", undefined, ESPERA)).toBeInTheDocument()
      // Salir a una ruta sin foros: ni la lista ni el detalle tienen observador.
      await act(() => router.navigate(`${BASE}/tareas/nueva`))
      await waitFor(() =>
        expect(
          queryClient
            .getQueryCache()
            .find({ queryKey: claveListaDeForos(CLASE) })
            ?.getObserversCount(),
        ).toBe(0),
      )
      queryClient.setQueryData(claveTarea(CLASE, TAREA), { tarea: { id: TAREA } })
      const foroAntes = lecturasDelForo().length
      const listaAntes = lecturasDeLaLista().length
      fireEvent.click(screen.getByRole("button", { name: accion }))
      await waitFor(() =>
        expect(screen.getByText(ESTADO_POR_ACCION[accion] ?? /^$/)).toHaveTextContent("success"),
      )
      await act(() => new Promise((resolver) => setTimeout(resolver, 200)))
      expect(lecturasDelForo()).toHaveLength(foroAntes)
      expect(lecturasDeLaLista()).toHaveLength(listaAntes)
      expect(queryClient.getQueryState(claveForo(CLASE, FORO))?.isInvalidated).toBe(true)
      expect(queryClient.getQueryState(claveListaDeForos(CLASE))?.isInvalidated).toBe(true)
      expect(queryClient.getQueryState(claveTarea(CLASE, TAREA))?.isInvalidated).toBe(true)
      await act(() => router.navigate(`${BASE}/foro`))
      await waitFor(() => expect(lecturasDeLaLista()).toHaveLength(listaAntes + 1), ESPERA)
      await act(() => router.navigate(`${BASE}/foros/${FORO}`))
      await waitFor(() => expect(lecturasDelForo()).toHaveLength(foroAntes + 1), ESPERA)
    },
  )

  it.each(ACCIONES.slice(0, 3))(
    "ATQ-FORO-134: «%s» con un 500 no marca viejos ni el foro ni la lista ni la tarea",
    async (accion) => {
      const { router, queryClient } = await montar(`${BASE}/foros/${FORO}`)
      await screen.findByRole("heading", { level: 2, name: "Debate de la unidad" }, ESPERA)
      await act(() => router.navigate(`${BASE}/foro`))
      expect(await screen.findByText("Debate de la unidad", undefined, ESPERA)).toBeInTheDocument()
      await act(() => router.navigate(`${BASE}/tareas/nueva`))
      queryClient.setQueryData(claveTarea(CLASE, TAREA), { tarea: { id: TAREA } })
      queryClient.setQueryData([...clavePrefijoDelTrabajo(CLASE), "sin-tema"], { pages: [] })
      estado.falla = true
      fireEvent.click(screen.getByRole("button", { name: accion }))
      await waitFor(() =>
        expect(screen.getByText(ESTADO_POR_ACCION[accion] ?? /^$/)).toHaveTextContent("error"),
      )
      await act(() => new Promise((resolver) => setTimeout(resolver, 200)))
      expect(queryClient.getQueryState(claveForo(CLASE, FORO))?.isInvalidated).toBe(false)
      expect(queryClient.getQueryState(claveListaDeForos(CLASE))?.isInvalidated).toBe(false)
      expect(queryClient.getQueryState(claveTarea(CLASE, TAREA))?.isInvalidated).toBe(false)
    },
  )

  it("ATQ-FORO-134: «Guardar las categorías» con el detalle del foro en caché sin observador termina sin esperar ninguna lectura del foro", async () => {
    const { router } = await montar(`${BASE}/foros/${FORO}`)
    await screen.findByRole("heading", { level: 2, name: "Debate de la unidad" }, ESPERA)
    await act(() => router.navigate(`${BASE}/tareas/nueva`))
    // Una lectura del foro que nunca termina: si guardar la esperara, se quedaría «pending».
    estado.foroEnVuelo = new Promise<Response>(() => undefined)
    const foroAntes = lecturasDelForo().length
    fireEvent.click(screen.getByRole("button", { name: "Guardar las categorías" }))
    await waitFor(
      () => expect(screen.getByText(/^Categorías: /)).toHaveTextContent("success"),
      ESPERA,
    )
    expect(lecturasDelForo()).toHaveLength(foroAntes)
    expect(aviso.success).toHaveBeenCalledTimes(1)
  })
})
