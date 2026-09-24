import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Ataques del Tester (AUTH-01, ronda 2) contra las correcciones de T-02 (/me de la cuenta nueva) y
// T-07 (restauración cerrada tras logout): salir y volver a entrar en la misma pestaña, registro con
// otra sesión abierta y /me que falla justo después del login.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/login") }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
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

const meLuis = meDe({
  id: "7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f",
  nombre: "Luis Pérez",
  rol: "maestro",
  email: "luis@ejemplo.mx",
})

const autorizacionDe = (init: RequestInit | undefined) =>
  new Headers(init?.headers).get("Authorization")

type Manejador = (ruta: string, init: RequestInit | undefined) => Response | Promise<Response>

const stubFetch = (manejador: Manejador) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) =>
    Promise.resolve(manejador(String(entrada), init)),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadasA = (fetchMock: ReturnType<typeof stubFetch>, ruta: string) =>
  fetchMock.mock.calls.filter(([entrada]) => String(entrada) === ruta).length

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

// Espera a que el formulario de login esté montado (tras navegar, el render puede ir un paso atrás).
const entrarComo = async (correo: string) => {
  fireEvent.change(await screen.findByLabelText("Correo"), { target: { value: correo } })
  fireEvent.change(screen.getByLabelText("Contraseña"), {
    target: { value: "clave-de-prueba-1234" },
  })
  fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }))
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

describe("ataque (ronda 2): salir y volver a entrar en la misma pestaña", () => {
  it("cerrar sesión como Ana y entrar como Luis: dashboard de Luis, sin /refrescar extra", async () => {
    const fetchMock = stubFetch((ruta, init) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "token-ana" })
      if (ruta === "/api/auth/logout") return new Response(null, { status: 204 })
      if (ruta === "/api/auth/login") return respuestaJson(200, { tokenAcceso: "token-luis" })
      if (autorizacionDe(init) === "Bearer token-luis") return respuestaJson(200, meLuis)
      return respuestaJson(200, meDe({}))
    })
    const router = await renderEn("/estudiante")
    fireEvent.click(await screen.findByRole("button", { name: "Cerrar sesión" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))

    await entrarComo("luis@ejemplo.mx")

    await waitFor(() => expect(router.state.location.pathname).toBe("/maestro"))
    expect(await screen.findByRole("heading", { name: "Hola, Luis Pérez" })).toBeInTheDocument()
    expect(screen.queryByText("Ana López")).not.toBeInTheDocument()
    expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(1)
  })

  it("tras salir y volver a entrar, un 401 por token vencido todavía se recupera con el refresco", async () => {
    let tokenLuisVencido = false
    stubFetch((ruta, init) => {
      if (ruta === "/api/auth/refrescar") {
        return respuestaJson(200, { tokenAcceso: tokenLuisVencido ? "token-luis-2" : "token-ana" })
      }
      if (ruta === "/api/auth/logout") return new Response(null, { status: 204 })
      if (ruta === "/api/auth/login") return respuestaJson(200, { tokenAcceso: "token-luis" })
      const token = autorizacionDe(init)
      if (token === "Bearer token-luis" && tokenLuisVencido) return errorJson(401, "NO_AUTENTICADO")
      if (token === "Bearer token-luis" || token === "Bearer token-luis-2") {
        return respuestaJson(200, meLuis)
      }
      return respuestaJson(200, meDe({}))
    })
    const router = await renderEn("/estudiante")
    fireEvent.click(await screen.findByRole("button", { name: "Cerrar sesión" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    await entrarComo("luis@ejemplo.mx")
    await waitFor(() => expect(router.state.location.pathname).toBe("/maestro"))

    tokenLuisVencido = true
    const { api } = await import("@/services/apiClient")
    const { meRespuestaSchema } = await import("@campus/shared")
    const datos = await act(() => api("/api/me", { schema: meRespuestaSchema }))

    expect(datos.nombre).toBe("Luis Pérez")
    const { obtenerToken } = await import("@/services/tokenAcceso")
    expect(obtenerToken()).toBe("token-luis-2")
  })

  it("salir, fallar el login y abrir /estudiante: termina en /login sin volver a pedir /refrescar", async () => {
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "token-ana" })
      if (ruta === "/api/auth/logout") return new Response(null, { status: 204 })
      if (ruta === "/api/auth/login") return errorJson(401, "CREDENCIALES_INVALIDAS")
      return respuestaJson(200, meDe({}))
    })
    const router = await renderEn("/estudiante")
    fireEvent.click(await screen.findByRole("button", { name: "Cerrar sesión" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    await entrarComo("ana@ejemplo.mx")
    expect(await screen.findByRole("alert")).toHaveTextContent("Correo o contraseña incorrectos.")

    await act(() => router.navigate("/estudiante"))

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(1)
    expect(screen.queryByText(/Hola, Ana/)).not.toBeInTheDocument()
  })
})

describe("ataque (ronda 2): identidad al entrar con otra sesión abierta", () => {
  it("registrarse con la sesión de Ana abierta lleva al dashboard de la cuenta nueva", async () => {
    stubFetch((ruta, init) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "token-ana" })
      if (ruta === "/api/auth/registro") return respuestaJson(201, { tokenAcceso: "token-nuevo" })
      if (autorizacionDe(init) === "Bearer token-nuevo") {
        return respuestaJson(
          200,
          meDe({ id: "9e8d7c6b-5a49-4382-9716-253443526170", nombre: "Pedro Nuevo" }),
        )
      }
      return respuestaJson(200, meDe({}))
    })
    const router = await renderEn("/estudiante")
    expect(await screen.findByRole("heading", { name: "Hola, Ana López" })).toBeInTheDocument()

    await act(() => router.navigate("/registro"))
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Pedro Nuevo" } })
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "pedro@ejemplo.mx" } })
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "clave-de-prueba-1234" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }))

    expect(await screen.findByRole("heading", { name: "Hola, Pedro Nuevo" })).toBeInTheDocument()
    expect(screen.queryByText("Ana López")).not.toBeInTheDocument()
  })

  it("si el /me de la cuenta nueva falla, no reaparece Ana con el token de Luis", async () => {
    let meLuisFalla = true
    stubFetch((ruta, init) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "token-ana" })
      if (ruta === "/api/auth/login") return respuestaJson(200, { tokenAcceso: "token-luis" })
      if (autorizacionDe(init) === "Bearer token-luis") {
        return meLuisFalla ? new Response("", { status: 502 }) : respuestaJson(200, meLuis)
      }
      return respuestaJson(200, meDe({}))
    })
    const router = await renderEn("/estudiante")
    expect(await screen.findByRole("heading", { name: "Hola, Ana López" })).toBeInTheDocument()
    await act(() => router.navigate("/login"))
    await entrarComo("luis@ejemplo.mx")
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos conectar")

    meLuisFalla = false
    await act(() => router.navigate("/estudiante"))

    await waitFor(() => expect(router.state.location.pathname).toBe("/maestro"))
    expect(await screen.findByRole("heading", { name: "Hola, Luis Pérez" })).toBeInTheDocument()
  })
})
