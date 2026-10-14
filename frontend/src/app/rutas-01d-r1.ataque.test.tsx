import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Tester, ronda 1 de CALIFICACIONES-01d: la sección "Calificaciones" y sus rutas con el router real
// (mayúsculas, barra final, la URL de la otra rama y RN-02 en el gradebook). La sesión se restaura con
// el doble de fetch. Reloj fijo en todas.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ALUMNO_ID = "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0301"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }

type Rol = "estudiante" | "maestro" | "admin"
const BASES: Record<Rol, string> = {
  estudiante: "/estudiante/clases",
  maestro: "/maestro/clases",
  admin: "/admin/clases",
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const me = (rol: Rol) => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol,
  debeCambiarContrasena: false,
  accesoRestringido: false,
})

const gradebook = {
  tareas: [
    {
      id: TAREA_ID,
      titulo: "Ensayo final",
      fechaLimite: "2030-01-15T16:00:00.000Z",
      puntos: 10,
      categoria: null,
    },
  ],
  siguienteCursorTareas: null,
  alumnos: [
    {
      alumno: { id: ALUMNO_ID, nombre: "Ana Ruiz" },
      celdas: [{ tareaId: TAREA_ID, estado: "calificado", conRetraso: false, calificacion: 9 }],
      porcentaje: 90,
      vencidasSinEntregar: 0,
      motivosDeRiesgo: [],
    },
  ],
  siguienteCursor: null,
  resumen: { modo: "puntos", totalAlumnos: 1, promedioDeLaClase: 90, alumnosEnRiesgo: 0 },
}

const misCalificaciones = {
  general: {
    modo: "puntos",
    porcentaje: 90,
    puntos: { obtenido: 9, posible: 10, tareas: 1 },
    categorias: [],
    sinCategoria: { tareas: 0 },
  },
  tareas: [
    {
      id: TAREA_ID,
      titulo: "Ensayo final",
      fechaLimite: "2030-01-15T16:00:00.000Z",
      puntos: 10,
      categoria: null,
      entrega: { estado: "calificado", conRetraso: false, calificacion: 9 },
    },
  ],
  siguienteCursor: null,
}

const stubDeLaClase = (rol: Rol) => {
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
    if (ruta === `/api/clases/${CLASE_ID}/codigo`) {
      return Promise.resolve(respuestaJson(200, { codigo: "ABCDEFG" }))
    }
    if (ruta.startsWith(`/api/clases/${CLASE_ID}/gradebook?`)) {
      return Promise.resolve(respuestaJson(200, gradebook))
    }
    if (ruta.startsWith(`/api/clases/${CLASE_ID}/mis-calificaciones?`)) {
      return Promise.resolve(respuestaJson(200, misCalificaciones))
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

const secciones = async () => screen.findByRole("list", { name: "Secciones de la clase" })

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  vi.resetModules()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("«Calificaciones» con la ruta escrita a mano", () => {
  it.each(["maestro", "admin"] as const)(
    "CAL-T-179: %s en …/CALIFICACIONES/ (mayúsculas y barra final) monta el gradebook, marca la sección y la celda enlaza a la entrega de su rama",
    async (rol) => {
      const fetchMock = stubDeLaClase(rol)
      await renderEn(`${BASES[rol]}/${CLASE_ID}/CALIFICACIONES/`)
      const tabla = await screen.findByRole("table", { name: "Calificaciones por alumno y tarea" })
      expect(within(tabla).getByRole("link", { name: "9 Ana Ruiz, Ensayo final" })).toHaveAttribute(
        "href",
        `${BASES[rol]}/${CLASE_ID}/tareas/${TAREA_ID}/entregas/${ALUMNO_ID}`,
      )
      const lista = await secciones()
      expect(within(lista).getByRole("link", { name: "Calificaciones" })).toHaveAttribute(
        "aria-current",
        "page",
      )
      const posicion = rol === "admin" ? "translate-x-[400%]" : "translate-x-[300%]"
      expect(lista.previousElementSibling).toHaveClass(posicion)
      expect(pidioAlgunaRutaCon(fetchMock, "/mis-calificaciones")).toBe(false)
    },
  )

  it("CAL-T-180: el estudiante en …/Calificaciones/ (mayúsculas y barra final) monta «Mis calificaciones» y el enlace de la tarea va a su detalle en su rama", async () => {
    const fetchMock = stubDeLaClase("estudiante")
    await renderEn(`${BASES.estudiante}/${CLASE_ID}/Calificaciones/`)
    expect(
      await screen.findByRole("heading", { name: "Mis calificaciones", level: 2 }),
    ).toBeInTheDocument()
    expect(await screen.findByRole("link", { name: "Ensayo final" })).toHaveAttribute(
      "href",
      `${BASES.estudiante}/${CLASE_ID}/tareas/${TAREA_ID}`,
    )
    const lista = await secciones()
    expect(within(lista).getByRole("link", { name: "Calificaciones" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(pidioAlgunaRutaCon(fetchMock, "/gradebook")).toBe(false)
  })

  it.each([
    ["estudiante", "maestro", "/gradebook"],
    ["estudiante", "admin", "/gradebook"],
    ["maestro", "estudiante", "/mis-calificaciones"],
    ["admin", "estudiante", "/mis-calificaciones"],
  ] as const)(
    "CAL-T-181: %s que escribe la URL de «Calificaciones» de la rama de %s vuelve a su inicio y nunca pide %s",
    async (rol, rama, prohibida) => {
      const fetchMock = stubDeLaClase(rol)
      const router = await renderEn(`${BASES[rama]}/${CLASE_ID}/calificaciones`)
      await waitFor(() =>
        expect(router.state.location.pathname.startsWith(`/${rama}/`)).toBe(false),
      )
      expect(pidioAlgunaRutaCon(fetchMock, "/api/me")).toBe(true)
      expect(pidioAlgunaRutaCon(fetchMock, prohibida)).toBe(false)
      expect(screen.queryByRole("table", { name: "Calificaciones por alumno y tarea" })).toBeNull()
      expect(screen.queryByRole("heading", { name: "Mis calificaciones" })).toBeNull()
    },
  )
})
