import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Ataques del Tester (DESIGN-01a, ronda 1) contra el contexto opaco y la densidad (§D-3 y §D-4):
// todo lo que pinta /admin cuelga de data-material="opaco" y data-densidad="densa"; ninguna otra
// ruta los tiene, tampoco después de salir de /admin. Se localiza por rol y por atributos de datos,
// nunca por clases de estilo (tester.md).

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/login") }))

const TOKEN_ENLACE = "a".repeat(43)

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: cuerpo === undefined ? {} : { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

const meDe = (extra: Record<string, unknown>) => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol: "estudiante",
  debeCambiarContrasena: false,
  accesoRestringido: false,
  ...extra,
})

const stubApi = (me: () => Response) =>
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) => {
      const ruta = String(entrada)
      if (ruta === "/api/auth/refrescar") {
        return Promise.resolve(respuestaJson(200, { tokenAcceso: "token" }))
      }
      if (ruta === "/api/me") return Promise.resolve(me())
      // AUTH-03a ronda 0 (C-6): los datos de la invitación que /establecer-contrasena pide al montar.
      if (ruta === "/api/auth/invitacion") {
        return Promise.resolve(respuestaJson(200, { nombre: "Ana López" }))
      }
      if (ruta === "/api/auth/logout") return Promise.resolve(respuestaJson(204, undefined))
      if (ruta === "/api/salud") {
        return Promise.resolve(
          respuestaJson(200, {
            estado: "ok",
            baseDeDatos: "ok",
            marcaDeTiempo: "2026-09-27T18:00:00.000Z",
          }),
        )
      }
      return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
    }),
  )

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

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 30)))

const controles = () => [
  ...screen.queryAllByRole("button"),
  ...screen.queryAllByRole("textbox"),
  ...screen.queryAllByRole("link"),
  ...Array.from(document.querySelectorAll<HTMLElement>("input")),
]

const conContexto = () => document.querySelectorAll("[data-material], [data-densidad]")

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ataque (DESIGN-01a r1): /admin opaco y denso", () => {
  it("cada botón, campo y encabezado de /admin cuelga de un contenedor opaco y denso", async () => {
    stubApi(() => respuestaJson(200, meDe({ rol: "admin", nombre: "Administración" })))
    await renderEn("/admin")
    await screen.findByRole("heading", { name: "Cuentas" })

    const elementos = [...controles(), ...screen.getAllByRole("heading")]
    expect(elementos.length, "no se encontró ningún control en /admin").toBeGreaterThan(5)
    for (const elemento of elementos) {
      const nombre = elemento.textContent || elemento.getAttribute("id") || elemento.tagName
      expect(
        elemento.closest('[data-material="opaco"]'),
        `"${nombre}" queda fuera del contexto opaco`,
      ).not.toBeNull()
      expect(
        elemento.closest('[data-densidad="densa"]'),
        `"${nombre}" queda fuera de la densidad del administrador`,
      ).not.toBeNull()
    }
    expect(conContexto(), "más de un contenedor marca el contexto").toHaveLength(1)
  })

  it("al cerrar sesión desde /admin, /login ya no tiene contexto opaco ni denso", async () => {
    stubApi(() => respuestaJson(200, meDe({ rol: "admin", nombre: "Administración" })))
    const router = await renderEn("/admin")
    fireEvent.click(await screen.findByRole("button", { name: "Cerrar sesión" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    await screen.findByRole("button", { name: "Iniciar sesión" })
    expect(conContexto()).toHaveLength(0)
  })
})

describe("ataque (DESIGN-01a r1): ninguna otra ruta es opaca ni densa", () => {
  const sinSesion = () => errorJson(401, "NO_AUTENTICADO")

  it.each([
    { ruta: "/login", me: sinSesion, espera: "Iniciar sesión" },
    { ruta: "/registro", me: sinSesion, espera: "Crear cuenta" },
    { ruta: "/recuperar", me: sinSesion, espera: "Enviar enlace" },
    { ruta: `/restablecer#token=${TOKEN_ENLACE}`, me: sinSesion, espera: "Guardar contraseña" },
    {
      ruta: `/establecer-contrasena#token=${TOKEN_ENLACE}`,
      me: sinSesion,
      espera: "Activar mi cuenta",
    },
    {
      ruta: "/cambiar-contrasena",
      me: () => errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO"),
      espera: "Guardar y continuar",
    },
    {
      ruta: "/acceso-restringido",
      me: () => respuestaJson(200, meDe({ accesoRestringido: true })),
      espera: "Cerrar sesión",
    },
    { ruta: "/estudiante", me: () => respuestaJson(200, meDe({})), espera: "Cerrar sesión" },
    {
      ruta: "/maestro",
      me: () => respuestaJson(200, meDe({ rol: "maestro" })),
      espera: "Cerrar sesión",
    },
  ])("$ruta: sin data-material ni data-densidad", async ({ ruta, me, espera }) => {
    stubApi(me)
    await renderEn(ruta)
    await screen.findByRole("button", { name: espera })
    await esperarUnMomento()

    expect(conContexto()).toHaveLength(0)
  })

  it("/diagnostico: sin data-material ni data-densidad", async () => {
    stubApi(() => errorJson(401, "NO_AUTENTICADO"))
    await renderEn("/diagnostico")
    await screen.findByRole("heading", { name: "Diagnóstico de conexión" })

    expect(conContexto()).toHaveLength(0)
  })
})
