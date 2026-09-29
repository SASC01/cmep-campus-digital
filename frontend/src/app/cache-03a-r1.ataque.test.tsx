import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Ataques del Tester (AUTH-03a, ronda 1) contra §D-A3 (MF-05 de AUTH-02b) y el cambio obligatorio
// sin la temporal: después del login (con la contraseña propia o con la temporal, con éxito o con
// error), del registro y del cambio, ninguna contraseña queda en la caché de mutaciones ni en la de
// consultas. Y el cambio manda solo la contraseña nueva y no entra en bucle ante SESION_INVALIDA.
// Router completo y API simulada con fetch; se localiza por rol, etiqueta y texto accesible.

const navegacion = vi.hoisted(() => ({ ruta: "/login" }))

vi.mock("@/services/navegacion", () => ({
  irA: vi.fn(),
  rutaActual: vi.fn(() => navegacion.ruta),
}))

const TEMPORAL = "Kp7mWq4Rt9Xz-temporal"
const PROPIA = "mi-clave-propia-r1-03a"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: cuerpo === undefined ? {} : { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const meDe = (extra: Record<string, unknown> = {}) => ({
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
  fetchMock.mock.calls.filter(([entrada]) => String(entrada) === ruta)

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
  return { router, queryClient }
}

// Todo lo que TanStack Query conserva (consultas y mutaciones, con sus variables), serializado.
const volcadoDeLaCache = (queryClient: QueryClient): string =>
  JSON.stringify({
    consultas: queryClient
      .getQueryCache()
      .getAll()
      .map((consulta) => ({ clave: consulta.queryKey, estado: consulta.state })),
    mutaciones: queryClient
      .getMutationCache()
      .getAll()
      .map((mutacion) => ({ clave: mutacion.options.mutationKey, estado: mutacion.state })),
  })

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 50)))

const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })

const entrar = async (contrasena: string) => {
  await screen.findByRole("button", { name: "Iniciar sesión" })
  escribir("Correo", "ana@ejemplo.mx")
  escribir("Contraseña", contrasena)
  fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }))
}

const registrarse = async (contrasena: string) => {
  await screen.findByRole("button", { name: "Crear cuenta" })
  escribir("Nombre completo", "Ana López")
  escribir("Correo", "ana@ejemplo.mx")
  escribir("Contraseña", contrasena)
  fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }))
}

const sinSesion = (ruta: string) => {
  if (ruta === "/api/auth/refrescar") return errorJson(401, "SESION_INVALIDA")
  return errorJson(401, "NO_AUTENTICADO")
}

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
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("ataque (AUTH-03a r1): el login y el registro salen de la caché (§D-A3)", () => {
  it("login con la temporal (el /me responde 403 CAMBIO…): la temporal no queda en ninguna caché", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/login") return respuestaJson(200, { tokenAcceso: "t" })
      if (ruta === "/api/me") return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
      return sinSesion(ruta)
    })
    const { queryClient } = await renderEn("/login")
    const { irA } = await import("@/services/navegacion")

    await entrar(TEMPORAL)
    await waitFor(() => expect(irA).toHaveBeenCalledWith("/cambiar-contrasena"))
    await esperarUnMomento()

    expect(volcadoDeLaCache(queryClient)).not.toContain(TEMPORAL)
    expect(queryClient.getMutationCache().findAll({ mutationKey: ["login"] })).toHaveLength(0)
    expect(window.localStorage.length + window.sessionStorage.length).toBe(0)
  })

  it.each([
    ["401 CREDENCIALES_INVALIDAS", () => errorJson(401, "CREDENCIALES_INVALIDAS")],
    ["429 DEMASIADOS_INTENTOS", () => errorJson(429, "DEMASIADOS_INTENTOS")],
    [
      "una red caída",
      (): Response => {
        throw new TypeError("Failed to fetch")
      },
    ],
  ])("login con %s: alerta y la contraseña fuera de la caché", async (_caso, respuesta) => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/login") return respuesta()
      return sinSesion(ruta)
    })
    const { queryClient } = await renderEn("/login")

    await entrar(PROPIA)
    expect(await screen.findByRole("alert")).toBeVisible()
    await esperarUnMomento()

    expect(volcadoDeLaCache(queryClient)).not.toContain(PROPIA)
  })

  it("login con éxito: llega al dashboard y la contraseña no queda en ninguna caché", async () => {
    let conSesion = false
    stubFetch((ruta) => {
      if (ruta === "/api/auth/login") {
        conSesion = true
        return respuestaJson(200, { tokenAcceso: "t" })
      }
      if (ruta === "/api/me" && conSesion) return respuestaJson(200, meDe())
      return sinSesion(ruta)
    })
    const { router, queryClient } = await renderEn("/login")

    await entrar(PROPIA)
    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
    await esperarUnMomento()

    expect(volcadoDeLaCache(queryClient)).not.toContain(PROPIA)
  })

  it("registro con 409 CORREO_EN_USO: alerta y la contraseña fuera de la caché", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/registro") return errorJson(409, "CORREO_EN_USO")
      return sinSesion(ruta)
    })
    const { queryClient } = await renderEn("/registro")

    await registrarse(PROPIA)
    expect(await screen.findByRole("alert")).toBeVisible()
    await esperarUnMomento()

    expect(volcadoDeLaCache(queryClient)).not.toContain(PROPIA)
    expect(queryClient.getMutationCache().findAll({ mutationKey: ["registro"] })).toHaveLength(0)
  })

  it("registro con éxito: llega al dashboard y la contraseña no queda en ninguna caché", async () => {
    let conSesion = false
    stubFetch((ruta) => {
      if (ruta === "/api/auth/registro") {
        conSesion = true
        return respuestaJson(201, { tokenAcceso: "t" })
      }
      if (ruta === "/api/me" && conSesion) return respuestaJson(200, meDe())
      return sinSesion(ruta)
    })
    const { router, queryClient } = await renderEn("/registro")

    await registrarse(PROPIA)
    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
    await esperarUnMomento()

    expect(volcadoDeLaCache(queryClient)).not.toContain(PROPIA)
  })
})

describe("ataque (AUTH-03a r1): /cambiar-contrasena sin la temporal", () => {
  it("el envío lleva exactamente { contrasenaNueva }: ni la temporal, ni la confirmación, ni otra clave", async () => {
    let cambiada = false
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      if (ruta === "/api/auth/cambiar-contrasena") {
        cambiada = true
        return respuestaJson(204, undefined)
      }
      if (!cambiada) return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
      return respuestaJson(200, meDe())
    })
    const { router, queryClient } = await renderEn("/cambiar-contrasena")
    await screen.findByRole("heading", { name: "Cambia tu contraseña" })

    expect(screen.queryByLabelText(/temporal/i)).toBeNull()
    escribir("Contraseña nueva", PROPIA)
    escribir("Confirma la contraseña nueva", PROPIA)
    fireEvent.click(screen.getByRole("button", { name: "Guardar y continuar" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
    const [envio] = llamadasA(fetchMock, "/api/auth/cambiar-contrasena")
    expect(JSON.parse(String(envio?.[1]?.body))).toEqual({ contrasenaNueva: PROPIA })
    await esperarUnMomento()
    expect(volcadoDeLaCache(queryClient)).not.toContain(PROPIA)
  })

  it("SESION_INVALIDA en el envío y también en el reintento tras refrescar: sin bucle y con el mensaje de sesión terminada", async () => {
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      if (ruta === "/api/auth/cambiar-contrasena") {
        return errorJson(401, "SESION_INVALIDA", "Tu sesión terminó. Vuelve a iniciar sesión.")
      }
      return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
    })
    const { router, queryClient } = await renderEn("/cambiar-contrasena")
    await screen.findByRole("heading", { name: "Cambia tu contraseña" })

    escribir("Contraseña nueva", PROPIA)
    escribir("Confirma la contraseña nueva", PROPIA)
    fireEvent.click(screen.getByRole("button", { name: "Guardar y continuar" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tu sesión terminó. Vuelve a iniciar sesión.",
    )
    await act(() => new Promise((resolver) => setTimeout(resolver, 200)))
    expect(llamadasA(fetchMock, "/api/auth/cambiar-contrasena").length).toBeLessThanOrEqual(2)
    expect(llamadasA(fetchMock, "/api/auth/refrescar").length).toBeLessThanOrEqual(2)
    expect(router.state.location.pathname).toBe("/cambiar-contrasena")
    expect(volcadoDeLaCache(queryClient)).not.toContain(PROPIA)
  })
})
