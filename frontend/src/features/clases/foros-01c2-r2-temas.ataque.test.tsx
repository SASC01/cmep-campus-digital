// FORO-01c2, ronda 2 del tester: el detalle de un foro (nuevo en 01c2) muestra su tema y su categoría
// con el peso, igual que el de una tarea. Renombrar o borrar un tema y guardar las categorías marcan
// viejo el detalle de las tareas (`["clases", claseId, "tareas"]`, features/clases/hooks.ts); este
// archivo comprueba si hacen lo mismo con el del foro. Router real (`rutas`) y el QueryClient de
// app/providers.tsx (staleTime de 30 s). Ids ATQ-FORO-127.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveForo, claveTarea } from "@/services/trabajoService"

import { useBorrarTema, useGuardarCategorias, useRenombrarTema } from "./hooks"

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
  tema: { nombre: string } | null
  categoria: { nombre: string; peso: number }
  llamadas: Llamada[]
}

let estado: Estado

const foroJson = () => ({
  foro: {
    id: FORO,
    titulo: "Debate de la unidad",
    instrucciones: "Opina sobre la lectura.",
    fechaLimite: "2030-01-15T16:00:00.000Z",
    puntos: 20,
    aceptaTardias: false,
    version: 0,
    categoria: { id: CATEGORIA_ID, ...estado.categoria },
    tema: estado.tema === null ? null : { id: TEMA_ID, nombre: estado.tema.nombre },
    rubrica: [],
    adjuntos: [],
    autor: { ...MAESTRO, administracion: false },
    creadoEn: "2026-10-06T15:30:00.000Z",
    actualizadoEn: "2026-10-06T15:30:00.000Z",
    puedeEditar: true,
    puedeBorrar: true,
  },
})

const responder = ({ metodo, url }: Llamada): Response => {
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
  if (ruta === "/api/clases/impartidas") {
    return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
  }
  if (ruta === API_CLASE) {
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
  if (ruta === `${API_CLASE}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
  if (ruta === `${API_CLASE}/foros` && metodo === "GET") {
    return respuestaJson(200, { foros: [], siguienteCursor: null })
  }
  if (ruta === `${API_CLASE}/foros/${FORO}`) return respuestaJson(200, foroJson())
  if (ruta === `${API_CLASE}/temas/${TEMA_ID}` && metodo === "PUT") {
    estado.tema = { nombre: "Unidad 1: la Revolución" }
    return respuestaJson(200, {
      tema: { id: TEMA_ID, nombre: estado.tema.nombre, orden: 0, elementos: 1 },
    })
  }
  if (ruta === `${API_CLASE}/temas/${TEMA_ID}` && metodo === "DELETE") {
    estado.tema = null
    return new Response(null, { status: 204 })
  }
  if (ruta === `${API_CLASE}/categorias` && metodo === "PUT") {
    estado.categoria = { nombre: "Participación", peso: 45 }
    return respuestaJson(200, {
      categorias: [{ id: CATEGORIA_ID, nombre: "Participación", peso: 45, tareas: 1 }],
    })
  }
  if (ruta === `${API_CLASE}/temas`) {
    return respuestaJson(200, { temas: [], sinTema: 0 })
  }
  return respuestaJson(200, {})
}

const lecturasDelForo = () =>
  estado.llamadas.filter(
    ({ metodo, url }) => metodo === "GET" && url.pathname === `${API_CLASE}/foros/${FORO}`,
  )

function Disparadores() {
  const renombrar = useRenombrarTema(CLASE)
  const borrar = useBorrarTema(CLASE)
  const guardar = useGuardarCategorias(CLASE)
  return (
    <div aria-label="Disparadores">
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
          guardar.mutate({
            categorias: [{ id: CATEGORIA_ID, nombre: "Participación", peso: 45 }],
          })
        }
      >
        Guardar las categorías
      </button>
    </div>
  )
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  estado = {
    tema: { nombre: "Unidad 1" },
    categoria: { nombre: "Participación", peso: 30 },
    llamadas: [],
  }
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

describe("ATQ-FORO-127 · el detalle del foro ante los cambios de temas y categorías de la clase", () => {
  it.each([
    ["Renombrar el tema", "Unidad 1", "Unidad 1: la Revolución"],
    ["Borrar el tema", "Unidad 1", "Sin tema"],
    ["Guardar las categorías", "Participación (30 %)", "Participación (45 %)"],
  ] as const)(
    "ATQ-FORO-127: «%s» marca viejo el detalle del foro como el de la tarea, y al volver al foro antes de 30 s se ve lo nuevo",
    async (accion, antes, despues) => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
      })
      const { rutas } = await import("@/app/router")
      const router = createMemoryRouter(rutas, { initialEntries: [`${BASE}/foros/${FORO}`] })
      render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <Disparadores />
        </QueryClientProvider>,
      )
      await screen.findByRole("heading", { level: 2, name: "Debate de la unidad" }, ESPERA)
      const detalles = () =>
        within(
          screen.getByRole("heading", { level: 3, name: "Detalles" }).parentElement ??
            document.body,
        )
      expect(detalles().getByText(antes)).toBeInTheDocument()
      // Una tarea de la misma clase en caché: el control de lo que hoy sí se marca viejo.
      queryClient.setQueryData(claveTarea(CLASE, TAREA), { tarea: { id: TAREA } })
      await act(() => router.navigate(`${BASE}/foro`))
      await screen.findByRole("heading", { level: 2, name: "Foro" }, ESPERA)
      fireEvent.click(screen.getByRole("button", { name: accion }))
      await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
      await waitFor(
        () => expect(queryClient.getQueryState(claveTarea(CLASE, TAREA))?.isInvalidated).toBe(true),
        ESPERA,
      )
      const lecturasAntes = lecturasDelForo().length
      const marcadoViejo = queryClient.getQueryState(claveForo(CLASE, FORO))?.isInvalidated
      await act(() => router.navigate(`${BASE}/foros/${FORO}`))
      await screen.findByRole("heading", { level: 2, name: "Debate de la unidad" }, ESPERA)
      await act(() => new Promise((resolver) => setTimeout(resolver, 300)))
      expect({
        loQueSeVe: detalles().queryByText(despues) === null ? antes : despues,
        seVolvioAPedir: lecturasDelForo().length > lecturasAntes,
        marcadoViejo,
      }).toEqual({ loQueSeVe: despues, seVolvioAPedir: true, marcadoViejo: true })
    },
  )
})
