import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Pie en las 11 pantallas de rutas (§D-6, "Pruebas requeridas — 01b-1"). Se localiza por rol y por
// texto accesible, nunca por clase de estilo.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/login") }))

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

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const sinSesion = () => errorJson(401, "NO_AUTENTICADO")

const esperarPantalla = async (ruta: string) => {
  if (ruta === "/diagnostico") {
    await screen.findByRole("heading", { name: "Diagnóstico de conexión" })
    return
  }
  if (ruta === "/restablecer" || ruta === "/establecer-contrasena") {
    await screen.findByRole("alert")
    return
  }
  const espera: Record<string, string> = {
    "/login": "Iniciar sesión",
    "/registro": "Crear cuenta",
    "/recuperar": "Enviar enlace",
    "/cambiar-contrasena": "Guardar y continuar",
    "/acceso-restringido": "Cerrar sesión",
    "/estudiante": "Cerrar sesión",
    "/maestro": "Cerrar sesión",
    "/admin": "Cerrar sesión",
  }
  const nombre = espera[ruta]
  if (nombre === undefined) throw new Error(`sin espera configurada para ${ruta}`)
  await screen.findByRole("button", { name: nombre })
}

describe("marco: el pie aparece en las 11 pantallas, con exactamente un contentinfo", () => {
  it.each([
    { ruta: "/login", me: sinSesion },
    { ruta: "/registro", me: sinSesion },
    { ruta: "/recuperar", me: sinSesion },
    { ruta: "/restablecer", me: sinSesion },
    { ruta: "/establecer-contrasena", me: sinSesion },
    { ruta: "/diagnostico", me: sinSesion },
    { ruta: "/cambiar-contrasena", me: () => errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO") },
    {
      ruta: "/acceso-restringido",
      me: () => respuestaJson(200, meDe({ accesoRestringido: true })),
    },
    { ruta: "/estudiante", me: () => respuestaJson(200, meDe({})) },
    { ruta: "/maestro", me: () => respuestaJson(200, meDe({ rol: "maestro" })) },
    {
      ruta: "/admin",
      me: () => respuestaJson(200, meDe({ rol: "admin", nombre: "Administración" })),
    },
  ])("$ruta", async ({ ruta, me }) => {
    stubApi(me)
    await renderEn(ruta)
    await esperarPantalla(ruta)

    const pies = screen.getAllByRole("contentinfo")
    expect(pies).toHaveLength(1)
    expect(pies[0]).toHaveTextContent(`© ${new Date().getFullYear()} Colegio Mexicano`)
  })
})

describe("marco: composición del login", () => {
  it("un solo heading 'CMEP Campus Digital'; lista de anuncios enfocable con nombre; un h3 por anuncio", async () => {
    stubApi(sinSesion)
    await renderEn("/login")
    await screen.findByRole("button", { name: "Iniciar sesión" })

    expect(screen.getAllByRole("heading", { name: "CMEP Campus Digital" })).toHaveLength(1)

    const lista = screen.getByRole("list", { name: "Avisos del colegio" })
    expect(lista).toHaveAttribute("tabindex", "0")

    const anuncios = screen.getAllByRole("heading", { level: 3 })
    expect(anuncios.length).toBeGreaterThan(0)
  })
})
