import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// ENTREGAS-01e (PR-1E05): las rutas de "Entregas" y de la entrega de un alumno existen en las ramas
// de maestro y admin; en la del alumno caen en `*`. Mismo arreglo que router.test.tsx: el router real
// en memoria, con la sesión restaurada por el doble de fetch.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ALUMNO_ID = "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0301"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const RUTA_TAREA = `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const me = (rol: string) => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol,
  debeCambiarContrasena: false,
  accesoRestringido: false,
})

const tarea = {
  id: TAREA_ID,
  titulo: "Ensayo final",
  instrucciones: "",
  fechaLimite: "2030-01-15T16:00:00.000Z",
  puntos: 80,
  aceptaTardias: true,
  requiereAdjuntos: true,
  version: 0,
  categoria: null,
  tema: null,
  rubrica: [],
  adjuntos: [],
  autor: { ...MAESTRO, administracion: false },
  creadoEn: "2026-10-06T15:30:00.000Z",
  actualizadoEn: "2026-10-06T15:30:00.000Z",
  puedeEditar: true,
  puedeBorrar: true,
}

const stubDeLaClase = (rol: "estudiante" | "maestro" | "admin") => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => {
    const ruta = String(entrada)
    if (ruta === "/api/auth/refrescar") {
      return Promise.resolve(respuestaJson(200, { tokenAcceso: "restaurado" }))
    }
    if (ruta === "/api/me") return Promise.resolve(respuestaJson(200, me(rol)))
    if (ruta === `/api/clases/${CLASE_ID}`) {
      return Promise.resolve(
        respuestaJson(200, {
          clase: {
            id: CLASE_ID,
            nombre: "Álgebra I",
            descripcion: null,
            maestro: MAESTRO,
            maestros: [MAESTRO],
          },
        }),
      )
    }
    if (ruta === RUTA_TAREA) return Promise.resolve(respuestaJson(200, { tarea }))
    if (ruta.startsWith(`${RUTA_TAREA}/entregas?`)) {
      return Promise.resolve(
        respuestaJson(200, {
          entregas: [
            {
              alumno: { id: ALUMNO_ID, nombre: "Ana Ruiz" },
              estado: "asignado",
              fechaEntrega: null,
              conRetraso: false,
            },
          ],
          total: 1,
          entregadas: 0,
          siguienteCursor: null,
        }),
      )
    }
    if (ruta === `${RUTA_TAREA}/entregas/${ALUMNO_ID}`) {
      return Promise.resolve(
        respuestaJson(200, {
          entrega: {
            alumno: { id: ALUMNO_ID, nombre: "Ana Ruiz" },
            estado: "asignado",
            fechaEntrega: null,
            conRetraso: false,
            enlaces: [],
            adjuntos: [],
            version: 0,
            calificacion: null,
          },
        }),
      )
    }
    if (ruta.startsWith(`${RUTA_TAREA}/entregas/${ALUMNO_ID}/comentarios?`)) {
      return Promise.resolve(respuestaJson(200, { comentarios: [], siguienteCursor: null }))
    }
    return Promise.resolve(
      respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } }),
    )
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderEn = async (ruta: string) => {
  const { rutas } = await import("./router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const pidioAlgunaRutaCon = (fetchMock: ReturnType<typeof stubDeLaClase>, texto: string) =>
  fetchMock.mock.calls.some(([entrada]) => String(entrada).includes(texto))

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("PR-1E05: rutas de las entregas", () => {
  it.each([
    ["maestro", "/maestro/clases"],
    ["admin", "/admin/clases"],
  ] as const)("PR-1E05: %s monta «Entregas» y la entrega de un alumno", async (rol, base) => {
    stubDeLaClase(rol)
    await renderEn(`${base}/${CLASE_ID}/tareas/${TAREA_ID}/entregas`)
    expect(await screen.findByRole("heading", { name: "Entregas", level: 2 })).toBeInTheDocument()
    expect(await screen.findByRole("link", { name: "Ver entrega Ana Ruiz" })).toHaveAttribute(
      "href",
      `${base}/${CLASE_ID}/tareas/${TAREA_ID}/entregas/${ALUMNO_ID}`,
    )
    cleanup()
    vi.unstubAllGlobals()
    vi.resetModules()

    stubDeLaClase(rol)
    await renderEn(`${base}/${CLASE_ID}/tareas/${TAREA_ID}/entregas/${ALUMNO_ID}`)
    expect(await screen.findByRole("heading", { name: "Ana Ruiz", level: 2 })).toBeInTheDocument()
    expect(await screen.findByText("Todavía no entrega.")).toBeInTheDocument()
  })

  it.each([
    `/estudiante/clases/${CLASE_ID}/tareas/${TAREA_ID}/entregas`,
    `/estudiante/clases/${CLASE_ID}/tareas/${TAREA_ID}/entregas/${ALUMNO_ID}`,
  ])("PR-1E05: el alumno en %s cae en `*` (a /login) sin pedir entregas", async (ruta) => {
    const fetchMock = stubDeLaClase("estudiante")
    const router = await renderEn(ruta)
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(pidioAlgunaRutaCon(fetchMock, "/entregas")).toBe(false)
  })
})
