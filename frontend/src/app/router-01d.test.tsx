import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// CALIFICACIONES-01d (CAL-1D06, CAL-1D07 y la parte de CAL-1D01 con el router real): la sección
// "Calificaciones" de la clase y sus rutas en las tres ramas. Mismo arreglo que router-01e.test.tsx:
// el router real en memoria, con la sesión restaurada por el doble de fetch. Reloj fijo.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ALUMNO_ID = "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0301"
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

describe("la sección «Calificaciones» (CAL-1D06)", () => {
  it.each([
    ["estudiante", ["Muro", "Trabajo de clase", "Personas", "Calificaciones"]],
    ["maestro", ["Muro", "Trabajo de clase", "Alumnos", "Calificaciones"]],
    ["admin", ["Muro", "Trabajo de clase", "Alumnos", "Maestros", "Calificaciones"]],
  ] as const)(
    "CAL-1D06: %s ve «Calificaciones» como última sección, con su href y aria-current en …/calificaciones",
    async (rol, esperadas) => {
      stubDeLaClase(rol)
      await renderEn(`${BASES[rol]}/${CLASE_ID}/calificaciones`)
      const lista = await secciones()
      expect(
        within(lista)
          .getAllByRole("link")
          .map((enlace) => enlace.textContent),
      ).toEqual(esperadas)
      const enlace = within(lista).getByRole("link", { name: "Calificaciones" })
      expect(enlace).toHaveAttribute("href", `${BASES[rol]}/${CLASE_ID}/calificaciones`)
      expect(enlace).toHaveAttribute("aria-current", "page")
      expect(within(lista).getByRole("link", { name: "Muro" })).not.toHaveAttribute("aria-current")
    },
  )

  it("CAL-1D06: en el admin el indicador mide un quinto (w-1/5, grid-cols-5) y en «Calificaciones» se traslada con translate-x-[400%]", async () => {
    stubDeLaClase("admin")
    await renderEn(`${BASES.admin}/${CLASE_ID}/calificaciones`)
    const lista = await secciones()
    expect(lista).toHaveClass("grid-cols-5")
    expect(lista.previousElementSibling).toHaveAttribute("aria-hidden", "true")
    expect(lista.previousElementSibling).toHaveClass("w-1/5", "translate-x-[400%]")
  })

  it.each([
    ["admin", "alumnos", "translate-x-[200%]", "w-1/5"],
    ["admin", "maestros", "translate-x-[300%]", "w-1/5"],
    ["maestro", "alumnos", "translate-x-[200%]", "w-1/4"],
    ["maestro", "calificaciones", "translate-x-[300%]", "w-1/4"],
  ] as const)(
    "CAL-1D06: %s en …/%s: el indicador sigue en %s (las posiciones de Alumnos y Maestros no cambian) y mide %s",
    async (rol, segmento, posicion, ancho) => {
      stubDeLaClase(rol)
      await renderEn(`${BASES[rol]}/${CLASE_ID}/${segmento}`)
      const lista = await secciones()
      expect(lista.previousElementSibling).toHaveClass(posicion, ancho)
    },
  )
})

describe("las rutas de «Calificaciones» (CAL-1D07 y CAL-1D01 con el router real)", () => {
  it("CAL-1D07: el estudiante en …/calificaciones monta «Mis calificaciones» y no pide el gradebook", async () => {
    const fetchMock = stubDeLaClase("estudiante")
    await renderEn(`${BASES.estudiante}/${CLASE_ID}/calificaciones`)
    expect(
      await screen.findByRole("heading", { name: "Mis calificaciones", level: 2 }),
    ).toBeInTheDocument()
    expect(await screen.findByRole("link", { name: "Ensayo final" })).toHaveAttribute(
      "href",
      `${BASES.estudiante}/${CLASE_ID}/tareas/${TAREA_ID}`,
    )
    expect(pidioAlgunaRutaCon(fetchMock, "/gradebook")).toBe(false)
    expect(screen.queryByRole("table")).toBeNull()
  })

  it.each(["maestro", "admin"] as const)(
    "CAL-1D07 y CAL-1D01: %s en …/calificaciones monta el gradebook, no pide «Mis calificaciones» y la celda enlaza a la entrega de su rama",
    async (rol) => {
      const fetchMock = stubDeLaClase(rol)
      await renderEn(`${BASES[rol]}/${CLASE_ID}/calificaciones`)
      const tabla = await screen.findByRole("table", { name: "Calificaciones por alumno y tarea" })
      expect(within(tabla).getByRole("link", { name: "9 Ana Ruiz, Ensayo final" })).toHaveAttribute(
        "href",
        `${BASES[rol]}/${CLASE_ID}/tareas/${TAREA_ID}/entregas/${ALUMNO_ID}`,
      )
      expect(pidioAlgunaRutaCon(fetchMock, "/mis-calificaciones")).toBe(false)
      expect(screen.queryByRole("heading", { name: "Mis calificaciones" })).toBeNull()
    },
  )
})
