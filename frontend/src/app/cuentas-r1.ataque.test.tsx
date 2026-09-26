import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Ataques del Tester (AUTH-02b, ronda 1) contra DEC-17: redirecciones entre /cambiar-contrasena,
// los dashboards, /login y /acceso-restringido; el 403 CAMBIO_DE_CONTRASENA_REQUERIDO estando ya en
// /cambiar-contrasena; el restringido con cambio pendiente; y el refresco ante un 401 en
// /api/auth/cambiar-contrasena. Router completo, API simulada con fetch.

const navegacion = vi.hoisted(() => ({ ruta: "/login" }))

vi.mock("@/services/navegacion", () => ({
  irA: vi.fn(),
  rutaActual: vi.fn(() => navegacion.ruta),
}))

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

// El QueryClient del último render, para inspeccionar la caché sin cambiar la firma de renderEn.
const clienteActual: { queryClient: QueryClient | undefined } = { queryClient: undefined }

const llenarCambio = (actual: string, nueva: string, confirmacion = nueva) => {
  fireEvent.change(screen.getByLabelText("Contraseña temporal"), { target: { value: actual } })
  fireEvent.change(screen.getByLabelText("Contraseña nueva"), { target: { value: nueva } })
  fireEvent.change(screen.getByLabelText("Confirma la contraseña nueva"), {
    target: { value: confirmacion },
  })
  fireEvent.click(screen.getByRole("button", { name: "Guardar y continuar" }))
}

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 50)))

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

describe("ataque (AUTH-02b r1): sin bucles de redirección", () => {
  it("en /cambiar-contrasena, el 403 CAMBIO… de /me no navega: muestra el formulario y /me no se repite", async () => {
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
    })
    const router = await renderEn("/cambiar-contrasena")
    const { irA } = await import("@/services/navegacion")

    expect(await screen.findByRole("heading", { name: "Cambia tu contraseña" })).toBeVisible()
    await esperarUnMomento()
    expect(router.state.location.pathname).toBe("/cambiar-contrasena")
    expect(irA).not.toHaveBeenCalled()
    expect(llamadasA(fetchMock, "/api/me")).toBe(1)
    expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(1)
  })

  it.each(["/estudiante", "/maestro", "/admin", "/acceso-restringido"])(
    "%s con cambio pendiente termina en el formulario de /cambiar-contrasena, con /me una sola vez por guarda",
    async (ruta) => {
      const fetchMock = stubFetch((r) => {
        if (r === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
        return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
      })
      const router = await renderEn(ruta)

      expect(await screen.findByRole("heading", { name: "Cambia tu contraseña" })).toBeVisible()
      await esperarUnMomento()
      expect(router.state.location.pathname).toBe("/cambiar-contrasena")
      expect(llamadasA(fetchMock, "/api/me")).toBeLessThanOrEqual(2)
    },
  )

  it("/cambiar-contrasena de un restringido SIN cambio pendiente termina en /acceso-restringido y se queda ahí", async () => {
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      return respuestaJson(200, meDe({ accesoRestringido: true }))
    })
    const router = await renderEn("/cambiar-contrasena")

    expect(await screen.findByRole("heading", { name: "Acceso restringido" })).toBeVisible()
    await esperarUnMomento()
    expect(router.state.location.pathname).toBe("/acceso-restringido")
    expect(llamadasA(fetchMock, "/api/me")).toBe(1)
  })

  it("/cambiar-contrasena del admin sin cambio pendiente termina en /admin", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      return respuestaJson(200, meDe({ rol: "admin", nombre: "Admin" }))
    })
    const router = await renderEn("/cambiar-contrasena")

    expect(await screen.findByRole("heading", { name: "Cuentas" })).toBeVisible()
    expect(router.state.location.pathname).toBe("/admin")
  })

  it("/cambiar-contrasena sin conexión termina en /login sin bucle", async () => {
    const fetchMock = stubFetch(() => {
      throw new TypeError("Failed to fetch")
    })
    const router = await renderEn("/cambiar-contrasena")

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    await esperarUnMomento()
    expect(router.state.location.pathname).toBe("/login")
    expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(1)
  })

  it("login con la temporal: un solo irA a /cambiar-contrasena y el login no dice que la contraseña es incorrecta", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return errorJson(401, "SESION_INVALIDA")
      if (ruta === "/api/auth/login") return respuestaJson(200, { tokenAcceso: "t" })
      return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
    })
    await renderEn("/login")
    const { irA } = await import("@/services/navegacion")

    fireEvent.change(await screen.findByLabelText("Correo"), {
      target: { value: "ana@ejemplo.mx" },
    })
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "Temporal-XYZ-1" } })
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }))

    await waitFor(() => expect(irA).toHaveBeenCalledWith("/cambiar-contrasena"))
    await esperarUnMomento()
    expect(irA).toHaveBeenCalledTimes(1)
    expect(screen.queryByText("Correo o contraseña incorrectos.")).not.toBeInTheDocument()
  })
})

describe("ataque (AUTH-02b r1): restringido con cambio pendiente", () => {
  it("cambia la contraseña y termina en /acceso-restringido, sin pasar por su dashboard", async () => {
    let cambiada = false
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      if (ruta === "/api/auth/cambiar-contrasena") {
        cambiada = true
        return respuestaJson(204, undefined)
      }
      if (!cambiada) return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
      if (ruta === "/api/me") return respuestaJson(200, meDe({ accesoRestringido: true }))
      return errorJson(403, "ACCESO_RESTRINGIDO")
    })
    const router = await renderEn("/cambiar-contrasena")
    await screen.findByRole("heading", { name: "Cambia tu contraseña" })

    llenarCambio("Temporal-XYZ-1", "mi-clave-propia-1")

    expect(await screen.findByRole("heading", { name: "Acceso restringido" })).toBeVisible()
    expect(router.state.location.pathname).toBe("/acceso-restringido")
    const rutasPedidas = fetchMock.mock.calls.map(([r]) => String(r))
    expect(rutasPedidas.filter((r) => !r.startsWith("/api/auth/") && r !== "/api/me")).toEqual([])
  })
})

describe("ataque (AUTH-02b r1): la temporal del usuario después de cambiarla", () => {
  it("tras cambiarla y llegar al dashboard, ni la temporal ni la nueva quedan en la caché de mutaciones", async () => {
    let cambiada = false
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      if (ruta === "/api/auth/cambiar-contrasena") {
        cambiada = true
        return respuestaJson(204, undefined)
      }
      if (!cambiada) return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
      return respuestaJson(200, meDe({}))
    })
    const router = await renderEn("/cambiar-contrasena")
    await screen.findByRole("heading", { name: "Cambia tu contraseña" })

    llenarCambio("Temporal-XYZ-1", "mi-clave-propia-1")
    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
    await esperarUnMomento()

    const queryClient = clienteActual.queryClient
    if (!queryClient) throw new Error("renderEn no dejó el QueryClient")
    const mutaciones = JSON.stringify(
      queryClient
        .getMutationCache()
        .getAll()
        .map((m) => m.state),
    )
    expect(mutaciones, "la contraseña temporal sigue en la caché de mutaciones").not.toContain(
      "Temporal-XYZ-1",
    )
    expect(mutaciones, "la contraseña nueva sigue en la caché de mutaciones").not.toContain(
      "mi-clave-propia-1",
    )
  })
})

describe("ataque (AUTH-02b r1): 401 en /api/auth/cambiar-contrasena", () => {
  it("token vencido: refresca una vez, reintenta con el nuevo y llega al dashboard", async () => {
    let refrescos = 0
    let cambiada = false
    const fetchMock = stubFetch((ruta, init) => {
      if (ruta === "/api/auth/refrescar") {
        refrescos += 1
        return respuestaJson(200, { tokenAcceso: `t${refrescos}` })
      }
      if (ruta === "/api/auth/cambiar-contrasena") {
        if (autorizacionDe(init) === "Bearer t1") return errorJson(401, "NO_AUTENTICADO")
        cambiada = true
        return respuestaJson(204, undefined)
      }
      if (!cambiada) return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
      return respuestaJson(200, meDe({}))
    })
    const router = await renderEn("/cambiar-contrasena")
    await screen.findByRole("heading", { name: "Cambia tu contraseña" })

    llenarCambio("Temporal-XYZ-1", "mi-clave-propia-1")

    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
    expect(llamadasA(fetchMock, "/api/auth/cambiar-contrasena")).toBe(2)
    expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(2)
  })

  it("si el refresco falla, la sesión se pierde y se va a /login (una sola vez)", async () => {
    let refrescos = 0
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") {
        refrescos += 1
        if (refrescos === 1) return respuestaJson(200, { tokenAcceso: "t1" })
        return errorJson(401, "SESION_INVALIDA")
      }
      if (ruta === "/api/auth/cambiar-contrasena") return errorJson(401, "NO_AUTENTICADO")
      return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
    })
    await renderEn("/cambiar-contrasena")
    const { irA } = await import("@/services/navegacion")
    await screen.findByRole("heading", { name: "Cambia tu contraseña" })

    llenarCambio("Temporal-XYZ-1", "mi-clave-propia-1")

    await waitFor(() => expect(irA).toHaveBeenCalledWith("/login"))
    expect(irA).toHaveBeenCalledTimes(1)
  })

  it.each(["/api/auth/recuperar", "/api/auth/restablecer", "/api/auth/establecer-contrasena"])(
    "un 401 con token en %s no refresca",
    async (rutaApi) => {
      const fetchMock = stubFetch((ruta) => {
        if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "nuevo" })
        return errorJson(401, "NO_AUTENTICADO")
      })
      const { api } = await import("@/services/apiClient")
      const { establecerToken } = await import("@/services/tokenAcceso")
      const { sinContenidoSchema } = await import("@campus/shared")
      establecerToken("viejo")

      const error: unknown = await api(rutaApi, {
        method: "POST",
        body: {},
        schema: sinContenidoSchema,
      }).catch((e: unknown) => e)

      expect(error).toMatchObject({ codigo: "NO_AUTENTICADO" })
      expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(0)
    },
  )
})

describe("ataque (AUTH-02b r1): errores del servidor al cambiar la contraseña", () => {
  const casos: [string, Response, string][] = [
    [
      "429 DEMASIADOS_INTENTOS",
      errorJson(429, "DEMASIADOS_INTENTOS"),
      "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.",
    ],
    [
      "400 CONTRASENA_ACTUAL_INCORRECTA",
      errorJson(400, "CONTRASENA_ACTUAL_INCORRECTA"),
      "La contraseña temporal no es correcta.",
    ],
    [
      "400 CONTRASENA_REPETIDA",
      errorJson(400, "CONTRASENA_REPETIDA"),
      "La contraseña nueva debe ser distinta de la temporal.",
    ],
    ["400 VALIDACION", errorJson(400, "VALIDACION", "contrasenaNueva: muy larga"), "muy larga"],
  ]

  it.each(casos)(
    "%s: alerta con su mensaje y se queda en el formulario",
    async (_c, resp, texto) => {
      stubFetch((ruta) => {
        if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
        if (ruta === "/api/auth/cambiar-contrasena") return resp.clone()
        return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
      })
      const router = await renderEn("/cambiar-contrasena")
      await screen.findByRole("heading", { name: "Cambia tu contraseña" })

      llenarCambio("Temporal-XYZ-1", "mi-clave-propia-1")

      expect(await screen.findByRole("alert")).toHaveTextContent(texto)
      expect(router.state.location.pathname).toBe("/cambiar-contrasena")
    },
  )

  it("dos envíos en el mismo instante hacen una sola petición", async () => {
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      if (ruta === "/api/auth/cambiar-contrasena") return errorJson(400, "CONTRASENA_REPETIDA")
      return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
    })
    await renderEn("/cambiar-contrasena")
    await screen.findByRole("heading", { name: "Cambia tu contraseña" })

    fireEvent.change(screen.getByLabelText("Contraseña temporal"), {
      target: { value: "Temporal-XYZ-1" },
    })
    fireEvent.change(screen.getByLabelText("Contraseña nueva"), {
      target: { value: "mi-clave-propia-1" },
    })
    fireEvent.change(screen.getByLabelText("Confirma la contraseña nueva"), {
      target: { value: "mi-clave-propia-1" },
    })
    const boton = screen.getByRole("button", { name: "Guardar y continuar" })
    fireEvent.click(boton)
    fireEvent.click(boton)

    await screen.findByRole("alert")
    expect(llamadasA(fetchMock, "/api/auth/cambiar-contrasena")).toBe(1)
  })

  it("409 CAMBIO_NO_REQUERIDO (ya se cambió, por ejemplo en otra pestaña): sale del formulario hacia su dashboard", async () => {
    let consultasDeMe = 0
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      if (ruta === "/api/auth/cambiar-contrasena") {
        return errorJson(409, "CAMBIO_NO_REQUERIDO", "No tienes un cambio de contraseña pendiente.")
      }
      // Solo la primera carga ve el cambio pendiente; en la otra pestaña ya se completó.
      consultasDeMe += 1
      if (consultasDeMe === 1) return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
      return respuestaJson(200, meDe({}))
    })
    const router = await renderEn("/cambiar-contrasena")
    await screen.findByRole("heading", { name: "Cambia tu contraseña" })

    llenarCambio("Temporal-XYZ-1", "mi-clave-propia-1")

    await waitFor(
      () =>
        expect(router.state.location.pathname, "sigue atrapado en el formulario").toBe(
          "/estudiante",
        ),
      { timeout: 2000 },
    )
  })

  it("el 409 CAMBIO_NO_REQUERIDO no se presenta como un error genérico que invita a reintentar", async () => {
    stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      if (ruta === "/api/auth/cambiar-contrasena") {
        return errorJson(409, "CAMBIO_NO_REQUERIDO", "No tienes un cambio de contraseña pendiente.")
      }
      return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
    })
    await renderEn("/cambiar-contrasena")
    await screen.findByRole("heading", { name: "Cambia tu contraseña" })

    llenarCambio("Temporal-XYZ-1", "mi-clave-propia-1")

    const alerta = await screen.findByRole("alert")
    expect(alerta).not.toHaveTextContent("No pudimos completar la operación. Inténtalo de nuevo.")
  })

  it("'Cerrar sesión' desde /cambiar-contrasena llega a /login y no vuelve a pedir /me ni /refrescar", async () => {
    const fetchMock = stubFetch((ruta) => {
      if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
      if (ruta === "/api/auth/logout") return respuestaJson(204, undefined)
      return errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
    })
    const router = await renderEn("/cambiar-contrasena")
    await screen.findByRole("heading", { name: "Cambia tu contraseña" })

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    await esperarUnMomento()
    expect(llamadasA(fetchMock, "/api/auth/logout")).toBe(1)
    expect(llamadasA(fetchMock, "/api/me")).toBe(1)
    expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(1)
  })
})
