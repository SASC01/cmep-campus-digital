import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Ataque del Tester (ADMIN-01g, ronda 1), punto 8 de "Puntos de ataque finales para la ronda 1"
// (revision.md, "## Verificación de la corrección — ADMIN-01g") y punto 13 del plan (R-23): los cuatro
// casos integrados del riesgo aceptado de 01f en la tabla de usuarios y la ficha (el 401 a la mitad de
// la tabla, de la ficha y de «Guardar»; la ficha desmontada con «Guardar» en vuelo; la última página con
// solo repetidas; el alta abierta y cerrada con la tabla en error), más «Ver» con el foco cuando llega la
// búsqueda diferida. El resultado esperado del 401 es el de ADM-1G20 (c): apiClient lleva al login y
// ninguna vista avisa ni pinta un mensaje. Router real y la configuración de app/providers.tsx.

const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))
vi.mock("@/services/navegacion", () => navegacion)
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const ESPERA = { timeout: 4000 }
const GENERICO = "No pudimos completar la operación. Inténtalo de nuevo."
const ERROR_TABLA = "No pudimos cargar los usuarios. Revisa tu conexión e inténtalo de nuevo."
const ERROR_FICHA = "No pudimos cargar la cuenta. Revisa tu conexión e inténtalo de nuevo."
const ERROR_RESUMEN = "No pudimos cargar el resumen. Revisa tu conexión e inténtalo de nuevo."
const RUTA_LOTE = "/api/admin/alumnos/estado-pago"

const cuenta = (n: number, nombre = `Alumno ${String(n).padStart(3, "0")}`) => ({
  id: `7a5b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`,
  nombre,
  email: `u${String(n)}@ejemplo.mx`,
  rol: "estudiante" as const,
  activo: true,
  creadoEn: "2026-09-01T15:00:00.000Z",
  estadoPago: "al_corriente" as const,
  fechaEstadoPago: null,
  accesoRestringido: false,
  motivoRestriccion: null,
  fechaRestriccion: null,
})

type Cuenta = ReturnType<typeof cuenta>

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const pagina = (usuarios: Cuenta[], siguiente: string | null = null) =>
  respuestaJson(200, {
    usuarios,
    siguienteCursor: siguiente,
    siguienteCursorNombre: siguiente === null ? null : "Alumno 002",
  })

type Respuesta = Response | Promise<Response>

interface Llamada {
  metodo: string
  url: URL
}

let llamadas: Llamada[] = []
let cuentas: Cuenta[] = []
let refrescoFalla = false
let tabla: (url: URL) => Respuesta = () => pagina([])
let ficha: (id: string) => Respuesta = () => errorJson(404, "USUARIO_NO_ENCONTRADO")
let resumen: () => Respuesta = () =>
  respuestaJson(200, { alumnos: 2, maestros: 1, clasesActivas: 1 })
let lote: () => Respuesta = () => respuestaJson(200, { actualizados: 1 })

const tablaDelDoble = (url: URL) => {
  const q = url.searchParams.get("q")?.toLowerCase()
  return pagina(cuentas.filter((c) => q === undefined || c.nombre.toLowerCase().includes(q)))
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  llamadas = []
  cuentas = [cuenta(1, "Ana Ruiz"), cuenta(2, "Beto Díaz")]
  refrescoFalla = false
  tabla = tablaDelDoble
  ficha = (id) => {
    const encontrada = cuentas.find((c) => c.id === id)
    return encontrada === undefined
      ? errorJson(404, "USUARIO_NO_ENCONTRADO")
      : respuestaJson(200, encontrada)
  }
  resumen = () => respuestaJson(200, { alumnos: 2, maestros: 1, clasesActivas: 1 })
  lote = () => respuestaJson(200, { actualizados: 1 })
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://local")
      const metodo = init?.method ?? "GET"
      llamadas.push({ metodo, url })
      if (url.pathname === "/api/auth/refrescar") {
        return Promise.resolve(
          refrescoFalla
            ? errorJson(401, "NO_AUTENTICADO")
            : respuestaJson(200, { tokenAcceso: "token-de-prueba" }),
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
      if (metodo === "GET" && url.pathname === "/api/admin/usuarios") {
        return Promise.resolve(tabla(url))
      }
      const deFicha = /^\/api\/admin\/usuarios\/([^/]+)$/.exec(url.pathname)
      if (metodo === "GET" && deFicha) return Promise.resolve(ficha(deFicha[1] ?? ""))
      if (metodo === "GET" && url.pathname === "/api/admin/resumen") {
        return Promise.resolve(resumen())
      }
      if (metodo === "GET" && url.pathname === "/api/admin/movimientos-inscripcion") {
        return Promise.resolve(respuestaJson(200, { movimientos: [], siguienteCursor: null }))
      }
      if (metodo === "PUT" && url.pathname === RUTA_LOTE) return Promise.resolve(lote())
      return Promise.resolve(errorJson(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  aviso.success.mockClear()
  aviso.error.mockClear()
  navegacion.irA.mockClear()
})

const montar = async (ruta: string) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await screen.findByRole("navigation", { name: "Navegación principal" }, ESPERA)
  return { router, queryClient }
}

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const diferida = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver: (respuesta: Response) => resolver(respuesta) }
}

const alertas = () => document.querySelectorAll('[role="alert"]')
const encabezado = (nombre: string) => screen.getByRole("heading", { level: 1, name: nombre })

describe("ATQ-1G R1 · R-23: el 401 en la tabla de usuarios, la ficha y el dashboard (punto 8)", () => {
  it("ATQ-1G27: un 401 con el refresco fallido en la primera carga de /admin/usuarios: ningún mensaje", async () => {
    refrescoFalla = true
    tabla = () => errorJson(401, "NO_AUTENTICADO")
    await montar("/admin/usuarios")
    await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/login"), ESPERA)
    await reposar()
    expect(screen.queryByText(ERROR_TABLA)).toBeNull()
    expect(alertas()).toHaveLength(0)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("ATQ-1G28: un 401 con el refresco fallido en «Cargar más usuarios»: ningún mensaje y nada en espera", async () => {
    tabla = (url) =>
      url.searchParams.has("cursor")
        ? errorJson(401, "NO_AUTENTICADO")
        : pagina(cuentas, cuentas[1]?.id ?? null)
    await montar("/admin/usuarios")
    const cargarMas = await screen.findByRole("button", { name: "Cargar más usuarios" }, ESPERA)
    refrescoFalla = true
    fireEvent.click(cargarMas)
    await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/login"), ESPERA)
    await reposar()
    expect(screen.queryByText(ERROR_TABLA)).toBeNull()
    expect(alertas()).toHaveLength(0)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(0)
  })

  it("ATQ-1G29: un 401 con el refresco fallido al abrir la ficha: ningún mensaje", async () => {
    refrescoFalla = true
    ficha = () => errorJson(401, "NO_AUTENTICADO")
    await montar(`/admin/usuarios/${cuenta(1).id}`)
    await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/login"), ESPERA)
    await reposar()
    expect(screen.queryByText(ERROR_FICHA)).toBeNull()
    expect(alertas()).toHaveLength(0)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("ATQ-1G30: un 401 con el refresco fallido en el resumen de /admin (hermano, inicio-admin-view): ningún mensaje", async () => {
    refrescoFalla = true
    resumen = () => errorJson(401, "NO_AUTENTICADO")
    await montar("/admin")
    await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/login"), ESPERA)
    await reposar()
    expect(screen.queryByText(ERROR_RESUMEN)).toBeNull()
    expect(alertas()).toHaveLength(0)
  })

  it("ATQ-1G31: un 401 con el refresco fallido en «Guardar» del estado de pago de la ficha: ningún mensaje, ningún aviso y «Guardar» sale de la espera", async () => {
    lote = () => errorJson(401, "NO_AUTENTICADO")
    await montar(`/admin/usuarios/${cuenta(1).id}`)
    const guardar = await screen.findByRole("button", { name: "Guardar" }, ESPERA)
    fireEvent.click(screen.getByRole("button", { name: "Deudor" }))
    refrescoFalla = true
    fireEvent.click(guardar)
    await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/login"), ESPERA)
    await reposar()
    expect(alertas()).toHaveLength(0)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(guardar).not.toHaveAttribute("aria-busy", "true")
  })
})

describe("ATQ-1G R1 · R-23: los otros casos integrados de 01f (punto 8)", () => {
  it.each([
    ["un 5xx", 1],
    ["un 401 con el refresco fallido", 0],
  ] as const)(
    "ATQ-1G32: la ficha desmontada (otra sección) con «Guardar» en vuelo y %s: %i aviso de error",
    async (caso, avisos) => {
      const pendiente = diferida()
      lote = () => pendiente.promesa
      await montar(`/admin/usuarios/${cuenta(1).id}`)
      const guardar = await screen.findByRole("button", { name: "Guardar" }, ESPERA)
      fireEvent.click(screen.getByRole("button", { name: "Deudor" }))
      fireEvent.click(guardar)
      await waitFor(() => expect(llamadas.filter((l) => l.metodo === "PUT")).toHaveLength(1))
      const nav = screen.getByRole("navigation", { name: "Navegación principal" })
      fireEvent.click(within(nav).getByRole("link", { name: "Movimientos" }))
      await screen.findByRole("heading", { level: 1, name: "Movimientos de inscripción" }, ESPERA)
      if (caso === "un 401 con el refresco fallido") refrescoFalla = true
      await act(async () => {
        pendiente.resolver(
          caso === "un 5xx" ? errorJson(500, "ERROR_INTERNO") : errorJson(401, "NO_AUTENTICADO"),
        )
      })
      await reposar()
      expect(aviso.error).toHaveBeenCalledTimes(avisos)
      if (avisos === 1) expect(aviso.error).toHaveBeenCalledWith(GENERICO)
      expect(alertas()).toHaveLength(0)
    },
  )

  it("ATQ-1G33: la ficha desmontada con «Guardar» en vuelo y éxito: el aviso de éxito sale una vez", async () => {
    const pendiente = diferida()
    lote = () => pendiente.promesa
    await montar(`/admin/usuarios/${cuenta(1).id}`)
    const guardar = await screen.findByRole("button", { name: "Guardar" }, ESPERA)
    fireEvent.click(screen.getByRole("button", { name: "Deudor" }))
    fireEvent.click(guardar)
    await waitFor(() => expect(llamadas.filter((l) => l.metodo === "PUT")).toHaveLength(1))
    const nav = screen.getByRole("navigation", { name: "Navegación principal" })
    fireEvent.click(within(nav).getByRole("link", { name: "Movimientos" }))
    await screen.findByRole("heading", { level: 1, name: "Movimientos de inscripción" }, ESPERA)
    await act(async () => {
      pendiente.resolver(respuestaJson(200, { actualizados: 1 }))
    })
    await reposar()
    expect(
      aviso.success.mock.calls.filter(([t]) => t === "Estado de pago actualizado"),
    ).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("ATQ-1G34: «Cargar más usuarios» con el foco y una última página con solo filas repetidas: el foco va al h1", async () => {
    tabla = (url) =>
      url.searchParams.has("cursor")
        ? pagina([cuentas[1] as Cuenta])
        : pagina(cuentas, cuentas[1]?.id ?? null)
    const errorDeConsola = vi.spyOn(console, "error")
    await montar("/admin/usuarios")
    const cargarMas = await screen.findByRole("button", { name: "Cargar más usuarios" }, ESPERA)
    act(() => cargarMas.focus())
    fireEvent.click(cargarMas)
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Cargar más usuarios" })).toBeNull(),
    )
    await reposar()
    expect(document.activeElement).toBe(encabezado("Usuarios"))
    expect(screen.getAllByRole("link", { name: /^Ver / })).toHaveLength(2)
    expect(errorDeConsola.mock.calls.filter((a) => String(a[0]).includes("same key"))).toEqual([])
  })

  it("ATQ-1G35: el foco en «Ver» de una fila cuando llega la búsqueda diferida que la saca: el foco va a la raíz, nunca a <body>", async () => {
    await montar("/admin/usuarios")
    const ver = await screen.findByRole("link", { name: "Ver Beto Díaz" }, ESPERA)
    fireEvent.change(screen.getByLabelText("Buscar por nombre o correo"), {
      target: { value: "Ana" },
    })
    act(() => ver.focus())
    expect(document.activeElement).toBe(ver)
    await act(() => new Promise((r) => setTimeout(r, 450)))
    await waitFor(
      () => expect(screen.queryByRole("link", { name: "Ver Beto Díaz" })).toBeNull(),
      ESPERA,
    )
    await reposar()
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement).toBe(encabezado("Usuarios").closest('[tabindex="-1"]:not(h1)'))
  })

  it("ATQ-1G36: el alta abierta y cerrada con la tabla en error: un solo mensaje de carga y el foco vuelve a «Dar de alta un alumno»", async () => {
    tabla = () => errorJson(500, "ERROR_INTERNO")
    await montar("/admin/usuarios")
    expect(await screen.findByText(ERROR_TABLA, {}, ESPERA)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Dar de alta un alumno" }))
    const cancelar = await screen.findByRole("button", { name: "Cancelar" })
    expect(alertas()).toHaveLength(1)
    fireEvent.click(cancelar)
    await reposar()
    const darDeAlta = screen.getByRole("button", { name: "Dar de alta un alumno" })
    expect(document.activeElement).toBe(darDeAlta)
    expect(alertas()).toHaveLength(1)
    expect(screen.getByText(ERROR_TABLA)).toBeInTheDocument()
  })
})
