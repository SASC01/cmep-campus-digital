import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// ADMIN-01g: /admin/movimientos con el router real (rutas de app/router) y Providers (staleTime de 30 s,
// un reintento salvo ante un 4xx). El servidor es un doble en memoria.

const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))
vi.mock("@/services/navegacion", () => navegacion)
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const ERROR = "No pudimos cargar los movimientos. Revisa tu conexión e inténtalo de nuevo."
const LISTA_CAMBIADA = "La lista cambió mientras la veías. Vuelve a abrirla para verla completa."
const ESPERA = { timeout: 4000 }
const RUTA = "/api/admin/movimientos-inscripcion"

const movimiento = (n: number, tipo: "alta" | "baja" = "alta") => ({
  id: `6a6b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`,
  secuencia: String(n),
  tipo,
  creadoEn: "2026-10-01T15:00:00.000Z",
  clase: { id: "7a7b3c4d-1c1f-4b8e-9a1e-000000000001", nombre: `Clase ${String(n)}` },
  alumno: {
    id: "8a8b3c4d-1c1f-4b8e-9a1e-000000000001",
    nombre: `Alumno ${String(n)}`,
    email: "a@x.mx",
  },
  actor: {
    id: "9a9b3c4d-1c1f-4b8e-9a1e-000000000001",
    nombre: "Administración",
    administracion: true,
  },
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

let llamadas: URL[] = []
let refrescoFalla = false
let lista: (url: URL) => Response = () =>
  respuestaJson(200, { movimientos: [], siguienteCursor: null })

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  llamadas = []
  refrescoFalla = false
  navegacion.irA.mockClear()
  lista = () => respuestaJson(200, { movimientos: [], siguienteCursor: null })
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) => {
      const url = new URL(String(entrada), "http://local")
      if (url.pathname === "/api/auth/refrescar") {
        return Promise.resolve(
          refrescoFalla
            ? errorJson(401, "NO_AUTENTICADO")
            : respuestaJson(200, { tokenAcceso: "t" }),
        )
      }
      if (url.pathname === "/api/me") {
        return Promise.resolve(
          respuestaJson(200, {
            id: "d9a8c3c2-3333-4da0-9c3a-2b4c5d6e7f80",
            nombre: "Administración",
            email: "admin@ejemplo.mx",
            rol: "admin",
            debeCambiarContrasena: false,
            accesoRestringido: false,
          }),
        )
      }
      if (url.pathname === RUTA) {
        llamadas.push(url)
        return Promise.resolve(lista(url))
      }
      if (url.pathname === "/api/admin/resumen") {
        return Promise.resolve(respuestaJson(200, { alumnos: 1, maestros: 1, clasesActivas: 1 }))
      }
      if (url.pathname === "/api/admin/usuarios") {
        return Promise.resolve(
          respuestaJson(200, { usuarios: [], siguienteCursor: null, siguienteCursorNombre: null }),
        )
      }
      return Promise.resolve(errorJson(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

const montar = async () => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: ["/admin/movimientos"] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  await screen.findByRole("navigation", { name: "Navegación principal" })
  return router
}

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const enLaBarra = async (seccion: string) => {
  const nav = screen.getByRole("navigation", { name: "Navegación principal" })
  fireEvent.click(within(nav).getByRole("link", { name: seccion }))
  await reposar()
}

const encabezado = () =>
  screen.getByRole("heading", { level: 1, name: "Movimientos de inscripción" })

describe("ADMIN-01g · /admin/movimientos (ADM-1G04, ADM-1G12, ADM-1G14 c)", () => {
  it("ADM-1G04: la tabla con sus columnas, «Alta» o «Baja» y «Hecho por»; «Cargar más movimientos» pide solo el cursor, una vez con dos clics, y al cargar la última página el foco va al h1", async () => {
    lista = (url) =>
      url.searchParams.has("cursor")
        ? respuestaJson(200, { movimientos: [movimiento(3, "baja")], siguienteCursor: null })
        : respuestaJson(200, {
            movimientos: [movimiento(1), movimiento(2, "baja")],
            siguienteCursor: movimiento(2).id,
          })
    await montar()
    const tabla = await screen.findByRole("table", {}, ESPERA)
    expect(
      within(tabla)
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(["Fecha", "Clase", "Alumno", "Movimiento", "Hecho por"])
    expect(within(tabla).getAllByText("Administración").length).toBeGreaterThan(0)
    expect(within(tabla).getByText("Alta")).toBeInTheDocument()
    const cargarMas = screen.getByRole("button", { name: "Cargar más movimientos" })
    act(() => cargarMas.focus())
    fireEvent.click(cargarMas)
    fireEvent.click(cargarMas)
    expect(await screen.findByText("Clase 3")).toBeInTheDocument()
    const siguientes = llamadas.filter((u) => u.searchParams.has("cursor"))
    expect(siguientes).toHaveLength(1)
    expect([...(siguientes[0]?.searchParams.keys() ?? [])]).toEqual(["cursor"])
    await reposar()
    expect(document.activeElement).toBe(encabezado())
  })

  it("ADM-1G04: sin movimientos, «Aún no hay movimientos»", async () => {
    await montar()
    expect(await screen.findByText("Aún no hay movimientos", {}, ESPERA)).toBeInTheDocument()
  })

  const conCursorVencido = async () => {
    let vencido = true
    lista = (url) => {
      if (url.searchParams.has("cursor") && vencido) {
        vencido = false
        return errorJson(400, "VALIDACION", "cursor: no es válido")
      }
      if (url.searchParams.has("cursor")) {
        return respuestaJson(200, { movimientos: [movimiento(3)], siguienteCursor: null })
      }
      return respuestaJson(200, { movimientos: [movimiento(1)], siguienteCursor: movimiento(1).id })
    }
    const router = await montar()
    fireEvent.click(await screen.findByRole("button", { name: "Cargar más movimientos" }, ESPERA))
    expect(await screen.findByText(LISTA_CAMBIADA)).toBeInTheDocument()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    return router
  }

  const conError = async () => {
    let fallos = 2
    lista = () => {
      if (fallos > 0) {
        fallos -= 1
        return errorJson(500, "ERROR_INTERNO")
      }
      return respuestaJson(200, { movimientos: [movimiento(1)], siguienteCursor: null })
    }
    const router = await montar()
    expect(await screen.findByText(ERROR, {}, ESPERA)).toBeInTheDocument()
    return router
  }

  it.each([
    ["la lista cambiada", conCursorVencido, LISTA_CAMBIADA],
    ["el error de carga", conError, ERROR],
  ])(
    "ADM-1G04 y ADM-1G12, con %s, camino (a): pulsar «Movimientos» estando aquí la vuelve a pedir y el texto desaparece",
    async (_caso, preparar, texto) => {
      await preparar()
      await enLaBarra("Movimientos")
      expect(await screen.findByRole("table", {}, ESPERA)).toBeInTheDocument()
      expect(screen.queryByText(texto)).toBeNull()
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )

  it.each([
    ["la lista cambiada", conCursorVencido, LISTA_CAMBIADA],
    ["el error de carga", conError, ERROR],
  ])(
    "ADM-1G04 y ADM-1G12, con %s, camino (b): ir a otra sección y regresar antes del staleTime la vuelve a pedir",
    async (_caso, preparar, texto) => {
      await preparar()
      await enLaBarra("Inicio")
      await enLaBarra("Movimientos")
      expect(await screen.findByRole("table", {}, ESPERA)).toBeInTheDocument()
      expect(screen.queryByText(texto)).toBeNull()
    },
  )

  it.each([
    ["la lista cambiada", conCursorVencido, LISTA_CAMBIADA],
    ["el error de carga", conError, ERROR],
  ])(
    "ADM-1G04 y ADM-1G12, con %s, camino (d): atrás, adelante y atrás del historial",
    async (_caso, preparar, texto) => {
      const router = await preparar()
      await enLaBarra("Maestros")
      for (const paso of [-1, 1, -1] as const) {
        await act(async () => {
          await router.navigate(paso)
        })
        await reposar()
      }
      await waitFor(() => expect(router.state.location.pathname).toBe("/admin/movimientos"))
      expect(await screen.findByRole("table", {}, ESPERA)).toBeInTheDocument()
      expect(screen.queryByText(texto)).toBeNull()
    },
  )
})

// Corrección M-27 (ADM-1G20 c, plan :1304): un 401 con el refresco fallido en «Cargar más movimientos» y,
// su estado vecino, en la primera carga de /admin/movimientos: apiClient lleva al login; la vista no pinta
// ningún mensaje ni avisa, y ningún botón queda en espera.
describe("ADMIN-01g · /admin/movimientos con un 401 (ADM-1G20 c, corrección M-27)", () => {
  it("ADM-1G20 (c): un 401 con el refresco fallido en «Cargar más movimientos»: lleva al login; ningún mensaje ni aviso y ningún botón en espera", async () => {
    lista = (url) =>
      url.searchParams.has("cursor")
        ? errorJson(401, "NO_AUTENTICADO")
        : respuestaJson(200, { movimientos: [movimiento(1)], siguienteCursor: movimiento(1).id })
    await montar()
    const cargarMas = await screen.findByRole("button", { name: "Cargar más movimientos" }, ESPERA)
    refrescoFalla = true
    fireEvent.click(cargarMas)
    await waitFor(() => expect(navegacion.irA).toHaveBeenCalled(), ESPERA)
    await reposar()
    expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0)
    expect(screen.queryByText(ERROR)).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(0)
    expect(screen.getByText("Clase 1")).toBeInTheDocument()
  })

  it("ADM-1G20 (c), estado vecino: un 401 con el refresco fallido en la primera carga: lleva al login; ningún mensaje ni aviso", async () => {
    lista = () => errorJson(401, "NO_AUTENTICADO")
    refrescoFalla = true
    await montar()
    await waitFor(() => expect(navegacion.irA).toHaveBeenCalled(), ESPERA)
    await reposar()
    expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0)
    expect(screen.queryByText(ERROR)).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
  })
})
