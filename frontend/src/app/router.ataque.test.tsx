import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Ataques del Tester (AUTH-01, ronda 1) contra las guardas, el login y el cierre de sesión:
// identidad obsoleta tras volver a entrar, rutas de otro rol, contrato de /me incompleto, logout
// y restauración de la sesión.

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

const llenarLogin = (correo: string, contrasena: string) => {
  fireEvent.change(screen.getByLabelText("Correo"), { target: { value: correo } })
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: contrasena } })
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

describe("ataque: identidad tras volver a iniciar sesión", () => {
  it("entrar como otra cuenta sin cerrar sesión lleva al dashboard de la cuenta nueva, no de la anterior", async () => {
    // Ana (estudiante) tiene sesión; vuelve a /login (atrás o escribiendo la URL) y entra Luis (maestro).
    stubFetch((ruta, init) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "token-ana" })
      if (ruta === "/api/auth/login") return respuestaJson(200, { tokenAcceso: "token-luis" })
      if (autorizacionDe(init) === "Bearer token-luis") {
        return respuestaJson(
          200,
          meDe({ nombre: "Luis Pérez", rol: "maestro", email: "luis@ejemplo.mx" }),
        )
      }
      return respuestaJson(200, meDe({}))
    })
    const router = await renderEn("/estudiante")
    expect(await screen.findByRole("heading", { name: "Hola, Ana López" })).toBeInTheDocument()

    await act(() => router.navigate("/login"))
    llenarLogin("luis@ejemplo.mx", "clave-de-prueba-1234")
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }))

    await waitFor(() => expect(router.state.location.pathname).not.toBe("/login"))
    expect(router.state.location.pathname).toBe("/maestro")
    expect(screen.queryByText("Ana López")).not.toBeInTheDocument()
  })
})

describe("ataque: guardas por rol", () => {
  it.each([
    ["estudiante", "/admin", "/estudiante"],
    ["maestro", "/estudiante", "/maestro"],
    ["admin", "/maestro", "/admin"],
  ])("un %s que entra a %s termina en %s", async (rol, destino, esperado) => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      return respuestaJson(200, meDe({ rol }))
    })
    const router = await renderEn(destino)
    await waitFor(() => expect(router.state.location.pathname).toBe(esperado))
  })

  it("un restringido que entra a /admin termina en /acceso-restringido", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      return respuestaJson(200, meDe({ accesoRestringido: true }))
    })
    const router = await renderEn("/admin")
    await waitFor(() => expect(router.state.location.pathname).toBe("/acceso-restringido"))
  })

  it("un maestro no restringido que abre /acceso-restringido vuelve a /maestro", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      return respuestaJson(200, meDe({ rol: "maestro" }))
    })
    const router = await renderEn("/acceso-restringido")
    await waitFor(() => expect(router.state.location.pathname).toBe("/maestro"))
  })

  it("un /me sin accesoRestringido ni rol no se completa con valores por defecto: no muestra ningún dashboard", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      const { accesoRestringido: _a, rol: _r, ...incompleto } = meDe({})
      void _a
      void _r
      return respuestaJson(200, incompleto)
    })
    const router = await renderEn("/estudiante")
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(screen.queryByText(/Hola,/)).not.toBeInTheDocument()
  })

  it("al recargar con cookie válida restaura con exactamente un /refrescar y un /me", async () => {
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      return respuestaJson(200, meDe({}))
    })
    await renderEn("/estudiante")
    expect(await screen.findByRole("heading", { name: "Hola, Ana López" })).toBeInTheDocument()
    expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(1)
    expect(llamadasA(fetchMock, "/api/me")).toBe(1)
  })
})

describe("ataque: cerrar sesión", () => {
  it("tras cerrar sesión, volver a /estudiante no muestra datos en caché y termina en /login", async () => {
    let cerrada = false
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/logout") {
        cerrada = true
        return new Response(null, { status: 204 })
      }
      if (ruta === "/api/auth/refrescar") {
        return cerrada
          ? errorJson(401, "SESION_INVALIDA")
          : respuestaJson(200, { tokenAcceso: "t" })
      }
      return respuestaJson(200, meDe({}))
    })
    const router = await renderEn("/estudiante")
    fireEvent.click(await screen.findByRole("button", { name: "Cerrar sesión" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))

    await act(() => router.navigate("/estudiante"))

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(screen.queryByText(/Hola, Ana/)).not.toBeInTheDocument()
    expect(llamadasA(fetchMock, "/api/me")).toBe(1)
    const { haySesion } = await import("@/services/tokenAcceso")
    expect(haySesion()).toBe(false)
  })

  it("tras un logout exitoso la app no vuelve a intentar restaurar la sesión (/refrescar)", async () => {
    let cerrada = false
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/logout") {
        cerrada = true
        return new Response(null, { status: 204 })
      }
      if (ruta === "/api/auth/refrescar") {
        return cerrada
          ? errorJson(401, "SESION_INVALIDA")
          : respuestaJson(200, { tokenAcceso: "t" })
      }
      return respuestaJson(200, meDe({}))
    })
    const router = await renderEn("/estudiante")
    fireEvent.click(await screen.findByRole("button", { name: "Cerrar sesión" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    await act(() => new Promise((resolver) => setTimeout(resolver, 300)))

    // Solo la restauración inicial; ninguna después de salir.
    expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(1)
  })

  it("si el logout falla por red, igual se sale y el token queda limpio", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/logout") throw new TypeError("Failed to fetch")
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      return respuestaJson(200, meDe({}))
    })
    const router = await renderEn("/estudiante")
    fireEvent.click(await screen.findByRole("button", { name: "Cerrar sesión" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    await act(() => new Promise((resolver) => setTimeout(resolver, 300)))
    const { haySesion } = await import("@/services/tokenAcceso")
    expect(haySesion()).toBe(false)
  })
})

describe("ataque: doble envío", () => {
  it("dos clics en 'Crear cuenta' separados por una tarea del navegador hacen una sola petición", async () => {
    let responder: (respuesta: Response) => void = () => undefined
    const fetchMock = stubFetch(
      () =>
        new Promise<Response>((resolver) => {
          responder = resolver
        }),
    )
    await renderEn("/registro")
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana López" } })
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "ana@ejemplo.mx" } })
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "clave-de-prueba-1234" },
    })
    const boton = screen.getByRole("button", { name: "Crear cuenta" })

    fireEvent.click(boton)
    await act(() => new Promise((resolver) => setTimeout(resolver, 5)))
    fireEvent.click(boton)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    responder(errorJson(409, "CORREO_EN_USO"))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya existe una cuenta con ese correo",
    )
  })
})
