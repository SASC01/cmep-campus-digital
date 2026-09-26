import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Ataques del Tester (AUTH-02b, ronda 2) contra las correcciones de T-01 y T-02 en
// /cambiar-contrasena: el 409 CAMBIO_NO_REQUERIDO reutiliza el camino del éxito (descartar /me,
// volver a pedirlo y navegar). Se busca un bucle con RequireCambioDeContrasena o con apiClient, un
// rebote a /login con la sesión viva, un doble envío en la ventana del 409 y contraseñas en la caché.

const navegacion = vi.hoisted(() => ({ ruta: "/cambiar-contrasena" }))

vi.mock("@/services/navegacion", () => ({
  irA: vi.fn(),
  rutaActual: vi.fn(() => navegacion.ruta),
}))

const TEMPORAL = "Temporal-R2-XYZ"
const NUEVA = "mi-clave-propia-r2"
const MENSAJE_409 = "Ya no tienes un cambio de contraseña pendiente."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: cuerpo === undefined ? {} : { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const meDe = (extra: Record<string, unknown>) => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol: "estudiante",
  debeCambiarContrasena: false,
  accesoRestringido: false,
  ...extra,
})

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

const diferida = () => {
  let resolver: (respuesta: Response) => void = () => {
    throw new Error("la respuesta diferida se resolvió antes de crearse")
  }
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver: (respuesta: Response) => resolver(respuesta) }
}

const clienteActual: { queryClient: QueryClient | undefined } = { queryClient: undefined }

const renderEn = async (ruta: string) => {
  navegacion.ruta = ruta
  const { rutas } = await import("./router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  clienteActual.queryClient = queryClient
  return router
}

const llenarCambio = () => {
  fireEvent.change(screen.getByLabelText("Contraseña temporal"), { target: { value: TEMPORAL } })
  fireEvent.change(screen.getByLabelText("Contraseña nueva"), { target: { value: NUEVA } })
  fireEvent.change(screen.getByLabelText("Confirma la contraseña nueva"), {
    target: { value: NUEVA },
  })
  fireEvent.click(screen.getByRole("button", { name: "Guardar y continuar" }))
}

const mutacionesEnCache = (): string => {
  const queryClient = clienteActual.queryClient
  if (!queryClient) throw new Error("renderEn no dejó el QueryClient")
  return JSON.stringify(
    queryClient
      .getMutationCache()
      .getAll()
      .map((mutacion) => mutacion.state),
  )
}

const esperar = (ms: number) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(async () => {
  vi.resetModules()
  const { irA } = await import("@/services/navegacion")
  vi.mocked(irA).mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ataque (AUTH-02b r2): 409 CAMBIO_NO_REQUERIDO sin bucles ni rebotes", () => {
  it("409 y después /me sin conexión: se queda en el formulario (no rebota a /login), con el mensaje propio y sin bucle", async () => {
    let consultasDeMe = 0
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      if (ruta === "/api/auth/cambiar-contrasena") return errorJson(409, "CAMBIO_NO_REQUERIDO")
      consultasDeMe += 1
      if (consultasDeMe === 1) return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
      throw new TypeError("Failed to fetch")
    })
    const router = await renderEn("/cambiar-contrasena")
    await screen.findByRole("heading", { name: "Cambia tu contraseña" })

    llenarCambio()

    expect(await screen.findByRole("alert")).toHaveTextContent(MENSAJE_409)
    await esperar(100)
    const { irA } = await import("@/services/navegacion")
    expect(router.state.location.pathname).toBe("/cambiar-contrasena")
    expect(irA).not.toHaveBeenCalled()
    expect(llamadasA(fetchMock, "/api/me")).toBe(2)
    expect(llamadasA(fetchMock, "/api/auth/cambiar-contrasena")).toBe(1)
    expect(mutacionesEnCache()).not.toContain(TEMPORAL)
  })

  it("409 pero /me insiste en 403 CAMBIO… (servidor incoherente): sin irA, sin bucle, /me solo una vez más", async () => {
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      if (ruta === "/api/auth/cambiar-contrasena") return errorJson(409, "CAMBIO_NO_REQUERIDO")
      return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
    })
    const router = await renderEn("/cambiar-contrasena")
    await screen.findByRole("heading", { name: "Cambia tu contraseña" })

    llenarCambio()

    expect(await screen.findByRole("alert")).toHaveTextContent(MENSAJE_409)
    await esperar(150)
    const { irA } = await import("@/services/navegacion")
    expect(router.state.location.pathname).toBe("/cambiar-contrasena")
    expect(irA).not.toHaveBeenCalled()
    expect(llamadasA(fetchMock, "/api/me")).toBe(2)
    expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(1)
  })

  it("204 con /me caído, y el reintento (ahora 409) llega al dashboard: el camino 2 de T-02 queda resuelto", async () => {
    let cambiada = false
    let consultasDeMe = 0
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      if (ruta === "/api/auth/cambiar-contrasena") {
        if (cambiada) return errorJson(409, "CAMBIO_NO_REQUERIDO")
        cambiada = true
        return respuestaJson(204, undefined)
      }
      consultasDeMe += 1
      if (!cambiada) return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
      if (consultasDeMe === 2) throw new TypeError("Failed to fetch")
      return respuestaJson(200, meDe({}))
    })
    const router = await renderEn("/cambiar-contrasena")
    await screen.findByRole("heading", { name: "Cambia tu contraseña" })

    llenarCambio()
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos conectar")
    expect(router.state.location.pathname).toBe("/cambiar-contrasena")

    fireEvent.click(screen.getByRole("button", { name: "Guardar y continuar" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
    expect(llamadasA(fetchMock, "/api/auth/cambiar-contrasena")).toBe(2)
    await esperar(50)
    const cache = mutacionesEnCache()
    expect(cache).not.toContain(TEMPORAL)
    expect(cache).not.toContain(NUEVA)
  })

  it("409 de un restringido: /me decide y termina en /acceso-restringido, no en su dashboard", async () => {
    let consultasDeMe = 0
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      if (ruta === "/api/auth/cambiar-contrasena") return errorJson(409, "CAMBIO_NO_REQUERIDO")
      consultasDeMe += 1
      if (consultasDeMe === 1) return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
      return respuestaJson(200, meDe({ accesoRestringido: true }))
    })
    const router = await renderEn("/cambiar-contrasena")
    await screen.findByRole("heading", { name: "Cambia tu contraseña" })

    llenarCambio()

    await waitFor(() => expect(router.state.location.pathname).toBe("/acceso-restringido"))
    expect(await screen.findByRole("heading", { name: "Acceso restringido" })).toBeVisible()
  })

  it("mientras se resuelve el /me del 409, un segundo envío no sale", async () => {
    const meTrasEl409 = diferida()
    let consultasDeMe = 0
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      if (ruta === "/api/auth/cambiar-contrasena") return errorJson(409, "CAMBIO_NO_REQUERIDO")
      consultasDeMe += 1
      if (consultasDeMe === 1) return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
      return meTrasEl409.promesa
    })
    const router = await renderEn("/cambiar-contrasena")
    await screen.findByRole("heading", { name: "Cambia tu contraseña" })

    llenarCambio()
    await waitFor(() => expect(llamadasA(fetchMock, "/api/me")).toBe(2))
    fireEvent.click(screen.getByRole("button", { name: "Guardar y continuar" }))
    await esperar(30)
    expect(llamadasA(fetchMock, "/api/auth/cambiar-contrasena")).toBe(1)

    await act(async () => {
      meTrasEl409.resolver(respuestaJson(200, meDe({ rol: "maestro" })))
      await meTrasEl409.promesa
    })
    await waitFor(() => expect(router.state.location.pathname).toBe("/maestro"))
    expect(llamadasA(fetchMock, "/api/auth/cambiar-contrasena")).toBe(1)
  })

  it("204 y la sesión se pierde al pedir /me (401 y refresco fallido): un solo irA a /login", async () => {
    let cambiada = false
    let refrescos = 0
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") {
        refrescos += 1
        if (refrescos === 1) return respuestaJson(200, { tokenAcceso: "t" })
        return errorJson(401, "NO_AUTENTICADO")
      }
      if (ruta === "/api/auth/cambiar-contrasena") {
        cambiada = true
        return respuestaJson(204, undefined)
      }
      if (!cambiada) return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
      return errorJson(401, "NO_AUTENTICADO")
    })
    await renderEn("/cambiar-contrasena")
    await screen.findByRole("heading", { name: "Cambia tu contraseña" })

    llenarCambio()

    const { irA } = await import("@/services/navegacion")
    await waitFor(() => expect(irA).toHaveBeenCalledWith("/login"))
    await esperar(100)
    expect(irA).toHaveBeenCalledTimes(1)
  })
})
