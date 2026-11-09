import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, matchRoutes, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { DESTINOS_POR_ROL } from "@/components/layout/data"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// ADMIN-01f (§D-R0 01f, lista cerrada): CuentasView (la pantalla provisional de /admin) se borra con
// DH-05 a; este archivo se reescribe como prueba del dashboard de /admin y de la tabla de
// /admin/usuarios, con el router real (rutas de app/router) y Providers (staleTime de 30 s). El servidor
// es un doble en memoria; lo que nadie responde es un 500 "no esperada". Un 5xx de una consulta se reintenta
// una vez (Providers), así que "en error" son dos fallos seguidos.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const RESUMEN = { alumnos: 120, maestros: 9, clasesActivas: 14 }
const ERROR_RESUMEN = "No pudimos cargar el resumen. Revisa tu conexión e inténtalo de nuevo."

const CARLA = {
  id: "b7e6a1a0-1111-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Carla Ruiz",
  email: "carla@ejemplo.mx",
  rol: "maestro",
  activo: true,
  creadoEn: "2026-09-01T15:00:00.000Z",
}

const BETO = {
  id: "c8f7b2b1-2222-4c9f-8b2f-1a3b4c5d6e7f",
  nombre: "Beto Díaz",
  email: "beto@ejemplo.mx",
  rol: "estudiante",
  activo: false,
  creadoEn: "2026-09-02T15:00:00.000Z",
  estadoPago: "deudor",
  fechaEstadoPago: null,
  accesoRestringido: true,
  motivoRestriccion: null,
  fechaRestriccion: null,
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const error500 = () =>
  respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } })

interface Llamada {
  metodo: string
  url: URL
}

let llamadas: Llamada[] = []
let resumen: () => Response = () => respuestaJson(200, RESUMEN)
let usuarios: (url: URL) => Response = () =>
  respuestaJson(200, {
    usuarios: [CARLA, BETO],
    siguienteCursor: null,
    siguienteCursorNombre: null,
  })

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  llamadas = []
  resumen = () => respuestaJson(200, RESUMEN)
  usuarios = () =>
    respuestaJson(200, {
      usuarios: [CARLA, BETO],
      siguienteCursor: null,
      siguienteCursorNombre: null,
    })
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://local")
      const metodo = init?.method ?? "GET"
      llamadas.push({ metodo, url })
      if (url.pathname === "/api/auth/refrescar") {
        return Promise.resolve(respuestaJson(200, { tokenAcceso: "t" }))
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
      if (metodo === "GET" && url.pathname === "/api/admin/resumen") {
        return Promise.resolve(resumen())
      }
      if (metodo === "GET" && url.pathname === "/api/admin/usuarios") {
        return Promise.resolve(usuarios(url))
      }
      if (metodo === "GET" && url.pathname === "/api/admin/enlaces-registro") {
        return Promise.resolve(respuestaJson(200, { enlaces: [], siguienteCursor: null }))
      }
      return Promise.resolve(error500())
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

const montarEn = async (ruta: string) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  await screen.findByRole("navigation", { name: "Navegación principal" })
  return { router, rutas }
}

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const pedidas = (ruta: string) =>
  llamadas.filter((llamada) => llamada.metodo === "GET" && llamada.url.pathname === ruta).length

const enLaBarra = async (seccion: string) => {
  const nav = screen.getByRole("navigation", { name: "Navegación principal" })
  fireEvent.click(within(nav).getByRole("link", { name: seccion }))
  await reposar()
}

describe("ADMIN-01f · el dashboard de /admin", () => {
  it("muestra las tres cifras del resumen con su etiqueta y el encabezado «Inicio»", async () => {
    await montarEn("/admin")

    expect(await screen.findByRole("heading", { level: 1, name: "Inicio" })).toBeInTheDocument()
    expect(await screen.findByText("120")).toBeInTheDocument()
    expect(screen.getByText("Alumnos con cuenta activa")).toBeInTheDocument()
    expect(screen.getByText("9")).toBeInTheDocument()
    expect(screen.getByText("Maestros con cuenta activa")).toBeInTheDocument()
    expect(screen.getByText("14")).toBeInTheDocument()
    expect(screen.getByText("Clases activas")).toBeInTheDocument()
    expect(pedidas("/api/admin/resumen")).toBe(1)
  })

  it("ADM-1F24: los accesos son los destinos del admin salvo «Inicio», en su orden, con su ruta existente y fuera de toda navegación; con el resumen en 500 siguen y solo el panel de las cifras se reemplaza", async () => {
    resumen = error500
    const { rutas } = await montarEn("/admin")

    expect(await screen.findByText(ERROR_RESUMEN, {}, { timeout: 4000 })).toBeInTheDocument()
    const nav = screen.getByRole("navigation", { name: "Navegación principal" })
    const accesos = screen
      .getAllByRole("link")
      .filter((enlace) => !nav.contains(enlace) && enlace.closest("footer") === null)
    const esperados = DESTINOS_POR_ROL.admin.filter((destino) => destino.etiqueta !== "Inicio")
    expect(esperados.length).toBeGreaterThan(0)
    expect(accesos.map((enlace) => enlace.textContent)).toEqual(
      esperados.map((destino) => destino.etiqueta),
    )
    expect(accesos.map((enlace) => enlace.getAttribute("href"))).toEqual(
      esperados.map((destino) => destino.ruta),
    )
    for (const enlace of accesos) {
      expect(enlace.closest("nav")).toBeNull()
      const coincidencias = matchRoutes(rutas, enlace.getAttribute("href") ?? "") ?? []
      expect(coincidencias.at(-1)?.route.path, enlace.textContent ?? "").not.toBe("*")
    }
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("ADM-1F01 (b): con el resumen en error, pulsar «Inicio» estando en /admin lo vuelve a pedir y el texto desaparece", async () => {
    let intentos = 0
    resumen = () => {
      intentos += 1
      return intentos <= 2 ? error500() : respuestaJson(200, RESUMEN)
    }
    const { router } = await montarEn("/admin")
    expect(await screen.findByText(ERROR_RESUMEN, {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Reintentar/ })).not.toBeInTheDocument()
    const claveAntes = router.state.location.key

    await enLaBarra("Inicio")

    expect(router.state.location.pathname).toBe("/admin")
    expect(router.state.location.key).not.toBe(claveAntes)
    expect(await screen.findByText("120")).toBeInTheDocument()
    expect(screen.queryByText(ERROR_RESUMEN)).not.toBeInTheDocument()
    expect(pedidas("/api/admin/resumen")).toBe(3)
  })

  it("ADM-1F01 (c): con el resumen en error, ir a «Usuarios» y regresar antes del staleTime lo vuelve a pedir y el texto desaparece", async () => {
    let intentos = 0
    resumen = () => {
      intentos += 1
      return intentos <= 2 ? error500() : respuestaJson(200, RESUMEN)
    }
    const { router } = await montarEn("/admin")
    expect(await screen.findByText(ERROR_RESUMEN, {}, { timeout: 4000 })).toBeInTheDocument()

    await enLaBarra("Usuarios")
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin/usuarios"))
    await enLaBarra("Inicio")

    expect(await screen.findByText("120")).toBeInTheDocument()
    expect(screen.queryByText(ERROR_RESUMEN)).not.toBeInTheDocument()
    expect(pedidas("/api/admin/resumen")).toBe(3)
  })

  it("un resumen sano no se vuelve a pedir al pulsar «Inicio» ni al regresar antes del staleTime", async () => {
    await montarEn("/admin")
    expect(await screen.findByText("120")).toBeInTheDocument()

    await enLaBarra("Inicio")
    await enLaBarra("Usuarios")
    await enLaBarra("Inicio")

    expect(await screen.findByText("120")).toBeInTheDocument()
    expect(pedidas("/api/admin/resumen")).toBe(1)
  })
})

describe("ADMIN-01f · la tabla de /admin/usuarios", () => {
  it("pinta las columnas, el rol, la cuenta y el acceso con texto, y «Ver» lleva a la ficha", async () => {
    const { router } = await montarEn("/admin/usuarios")

    const tabla = await screen.findByRole("table")
    expect(
      within(tabla)
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(["Nombre", "Correo", "Rol", "Cuenta", "Acceso", "Ver"])
    const filas = within(tabla).getAllByRole("row").slice(1)
    expect(within(filas[0] as HTMLElement).getByText("Maestro")).toBeInTheDocument()
    expect(within(filas[0] as HTMLElement).getByText("Activa")).toBeInTheDocument()
    expect(within(filas[0] as HTMLElement).getByText("No aplica")).toBeInTheDocument()
    expect(within(filas[1] as HTMLElement).getByText("Desactivada")).toBeInTheDocument()
    expect(within(filas[1] as HTMLElement).getByText("Restringido")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("link", { name: "Ver Carla Ruiz" }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/admin/usuarios/${CARLA.id}`))
  })

  it("una sola acción principal: «Dar de alta un alumno»", async () => {
    await montarEn("/admin/usuarios")
    await screen.findByRole("table")
    const principales = screen
      .getAllByRole("button")
      .filter((boton) => boton.getAttribute("data-variant") === "primary")
    expect(principales.map((boton) => boton.textContent)).toEqual(["Dar de alta un alumno"])
  })

  it("vacío sin búsqueda: «No hay cuentas con ese rol», también con «Todos» (OA-01f-1)", async () => {
    usuarios = () =>
      respuestaJson(200, { usuarios: [], siguienteCursor: null, siguienteCursorNombre: null })
    await montarEn("/admin/usuarios")
    expect(await screen.findByText("No hay cuentas con ese rol")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "maestro" } })
    await reposar()
    expect(await screen.findByText("No hay cuentas con ese rol")).toBeInTheDocument()
  })
})
