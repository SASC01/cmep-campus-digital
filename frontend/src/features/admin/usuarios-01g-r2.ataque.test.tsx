import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Ataque del Tester (ADMIN-01g, ronda 2), punto 5 de "Puntos de ataque para la ronda 2" (revision.md,
// "## Verificación de la corrección de la ronda 1 — ADMIN-01g"): los vecinos de T-01 en los tres
// archivos de 01f autorizados (usuarios-view.tsx, usuario-view.tsx e inicio-admin-view.tsx): el 401 en
// una recarga con datos de la tabla y de la ficha, los otros dos códigos que redirigen (403
// ACCESO_RESTRINGIDO y 403 CAMBIO_DE_CONTRASENA_REQUERIDO) en las tres pantallas y el 401 con la frase de
// lista cambiada a la vista. Lo esperado es el de ADM-1G20 (c): apiClient redirige y ninguna vista avisa
// ni pinta un mensaje. Router real y la configuración de app/providers.tsx.

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

const LISTA_CAMBIADA = "La lista cambió mientras la veías. Vuelve a abrirla para verla completa."

const RUTA_DE: Record<string, string> = {
  ACCESO_RESTRINGIDO: "/acceso-restringido",
  CAMBIO_DE_CONTRASENA_REQUERIDO: "/cambiar-contrasena",
}

describe("ATQ-1G R2 · vecinos de T-01 en 01f (punto 5)", () => {
  it("ATQ-1G49: un 401 con el refresco fallido en una recarga de la tabla con datos: la tabla se queda, sin mensaje ni aviso", async () => {
    const { queryClient } = await montar("/admin/usuarios")
    await screen.findByRole("link", { name: "Ver Ana Ruiz" }, ESPERA)
    refrescoFalla = true
    tabla = () => errorJson(401, "NO_AUTENTICADO")
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "usuarios", "lista"] })
    })
    await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/login"), ESPERA)
    await reposar()
    expect(screen.getByRole("link", { name: "Ver Ana Ruiz" })).toBeInTheDocument()
    expect(encabezado("Usuarios")).toBeInTheDocument()
    expect(screen.queryByText(ERROR_TABLA)).toBeNull()
    expect(alertas()).toHaveLength(0)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("ATQ-1G50: un 401 con el refresco fallido en una recarga de la ficha con datos: la ficha se queda, sin mensaje ni aviso", async () => {
    const { queryClient } = await montar(`/admin/usuarios/${cuenta(1).id}`)
    await screen.findByRole("heading", { level: 2, name: "Ana Ruiz" }, ESPERA)
    refrescoFalla = true
    ficha = () => errorJson(401, "NO_AUTENTICADO")
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "usuarios", "cuenta"] })
    })
    await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/login"), ESPERA)
    await reposar()
    expect(screen.getByRole("heading", { level: 2, name: "Ana Ruiz" })).toBeInTheDocument()
    expect(screen.queryByText(ERROR_FICHA)).toBeNull()
    expect(alertas()).toHaveLength(0)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it.each([
    ["la tabla de usuarios", "ACCESO_RESTRINGIDO"],
    ["la tabla de usuarios", "CAMBIO_DE_CONTRASENA_REQUERIDO"],
    ["«Cargar más usuarios»", "ACCESO_RESTRINGIDO"],
    ["«Cargar más usuarios»", "CAMBIO_DE_CONTRASENA_REQUERIDO"],
    ["la ficha", "ACCESO_RESTRINGIDO"],
    ["la ficha", "CAMBIO_DE_CONTRASENA_REQUERIDO"],
    ["el resumen de /admin", "ACCESO_RESTRINGIDO"],
    ["el resumen de /admin", "CAMBIO_DE_CONTRASENA_REQUERIDO"],
  ])(
    "ATQ-1G51: un 403 en %s con %s: apiClient redirige y ninguna vista pinta su texto de error",
    async (donde, codigo) => {
      const rechazo = () => errorJson(403, codigo)
      if (donde === "la tabla de usuarios") tabla = rechazo
      if (donde === "«Cargar más usuarios»") {
        tabla = (url) =>
          url.searchParams.has("cursor") ? rechazo() : pagina(cuentas, cuentas[1]?.id ?? null)
      }
      if (donde === "la ficha") ficha = rechazo
      if (donde === "el resumen de /admin") resumen = rechazo
      const ruta =
        donde === "la ficha"
          ? `/admin/usuarios/${cuenta(1).id}`
          : donde === "el resumen de /admin"
            ? "/admin"
            : "/admin/usuarios"
      await montar(ruta)
      if (donde === "«Cargar más usuarios»") {
        fireEvent.click(await screen.findByRole("button", { name: "Cargar más usuarios" }, ESPERA))
      }
      await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith(RUTA_DE[codigo]), ESPERA)
      await reposar()
      expect(screen.queryByText(ERROR_TABLA)).toBeNull()
      expect(screen.queryByText(ERROR_FICHA)).toBeNull()
      expect(screen.queryByText(ERROR_RESUMEN)).toBeNull()
      expect(screen.queryByText(GENERICO)).toBeNull()
      expect(alertas()).toHaveLength(0)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(0)
    },
  )

  it("ATQ-1G52: con la frase de lista cambiada a la vista, pulsar «Usuarios» y un 401 con el refresco fallido: la frase se va y no sale ningún mensaje", async () => {
    let vencido = true
    tabla = (url) => {
      if (url.searchParams.has("cursor") && vencido) {
        vencido = false
        return errorJson(400, "VALIDACION", "cursor: no es válido")
      }
      return pagina(cuentas, cuentas[1]?.id ?? null)
    }
    await montar("/admin/usuarios")
    fireEvent.click(await screen.findByRole("button", { name: "Cargar más usuarios" }, ESPERA))
    expect(await screen.findByText(LISTA_CAMBIADA, {}, ESPERA)).toBeInTheDocument()
    refrescoFalla = true
    tabla = () => errorJson(401, "NO_AUTENTICADO")
    const nav = screen.getByRole("navigation", { name: "Navegación principal" })
    fireEvent.click(within(nav).getByRole("link", { name: "Usuarios" }))
    await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/login"), ESPERA)
    await reposar()
    expect(screen.queryByText(LISTA_CAMBIADA)).toBeNull()
    expect(screen.queryByText(ERROR_TABLA)).toBeNull()
    expect(alertas()).toHaveLength(0)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("ATQ-1G53: la ficha desmontada con «Guardar» en vuelo y un 403 ACCESO_RESTRINGIDO: ningún aviso", async () => {
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
      pendiente.resolver(errorJson(403, "ACCESO_RESTRINGIDO"))
    })
    await reposar()
    expect(navegacion.irA).toHaveBeenCalledWith("/acceso-restringido")
    expect(aviso.error).not.toHaveBeenCalled()
    expect(peticionesDelLote()).toHaveLength(1)
  })
})

const peticionesDelLote = () =>
  llamadas.filter((l) => l.metodo === "PUT" && l.url.pathname === RUTA_LOTE)
