import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Ataques del Tester (DESIGN-01a, ronda 1) contra `enEspera` en los ocho botones de fuera de
// /admin: "Iniciar sesión", "Crear cuenta", "Enviar enlace", "Guardar contraseña", "Activar mi
// cuenta", "Guardar y continuar" y los tres "Cerrar sesión" (marco, /cambiar-contrasena y
// /acceso-restringido). Router completo y API simulada con fetch (plan, §D-5 y "Puntos de
// ataque", punto 2). Un segundo envío del login contaría dos intentos para el bloqueo.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/login") }))

const TOKEN_ENLACE = "a".repeat(43)

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

const diferida = () => {
  let resolver: (respuesta: Response) => void = () => {
    throw new Error("la respuesta diferida se resolvió antes de crearse")
  }
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver: (respuesta: Response) => resolver(respuesta) }
}

type Diferida = ReturnType<typeof diferida>

// La ruta atacada queda en vuelo; el resto responde según la sesión que se quiera simular.
const stubApi = (rutaEnVuelo: string, pendiente: Diferida, me: () => Response) => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => {
    const ruta = String(entrada)
    if (ruta === rutaEnVuelo) return pendiente.promesa
    // AUTH-03a ronda 0 (C-6): los datos de la invitación que /establecer-contrasena pide al montar.
    if (ruta === "/api/auth/invitacion") {
      return Promise.resolve(respuestaJson(200, { nombre: "Ana López" }))
    }
    if (ruta === "/api/auth/refrescar") {
      return Promise.resolve(respuestaJson(200, { tokenAcceso: "token-ana" }))
    }
    if (ruta === "/api/me") return Promise.resolve(me())
    if (ruta === "/api/auth/logout") return Promise.resolve(respuestaJson(204, undefined))
    return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadasA = (fetchMock: ReturnType<typeof stubApi>, ruta: string) =>
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

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 30)))

const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })

const comprobarEnEspera = async (control: HTMLElement, nombre: string) => {
  await waitFor(() => expect(control).toHaveAttribute("aria-disabled", "true"))
  expect(control).toHaveAttribute("aria-busy", "true")
  expect(control).not.toHaveAttribute("disabled")
  expect(control).not.toBeDisabled()
  expect(
    screen.getByRole("button", { name: nombre }),
    "el nombre accesible cambió con la petición en vuelo",
  ).toBe(control)
  expect(document.activeElement, `"${nombre}" en espera perdió el foco`).toBe(control)
  expect(control.tabIndex).toBeGreaterThanOrEqual(0)
}

// Clic, Enter y Espacio (el navegador los convierte en "click"; jsdom no), y los dos envíos del
// formulario que no pasan por el botón.
const activarDeTodasLasFormas = (control: HTMLElement) => {
  fireEvent.click(control)
  fireEvent.click(control)
  fireEvent.click(control)
  const formulario = control.closest("form")
  if (formulario) {
    fireEvent.submit(formulario)
    act(() => formulario.requestSubmit())
  }
}

const comprobarFueraDeEspera = async (control: HTMLElement) => {
  await waitFor(() => expect(control).not.toHaveAttribute("aria-disabled"))
  expect(control).not.toHaveAttribute("aria-busy")
  expect(control).not.toHaveAttribute("data-en-espera")
}

interface CasoFormulario {
  nombre: string
  ruta: string
  endpoint: string
  boton: string
  me: () => Response
  llenar: () => void
  error: () => Response
}

const sinSesion = () => errorJson(401, "NO_AUTENTICADO")
const conCambioPendiente = () => errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")

const CASOS_FORMULARIO: CasoFormulario[] = [
  {
    nombre: "login",
    ruta: "/login",
    endpoint: "/api/auth/login",
    boton: "Iniciar sesión",
    me: sinSesion,
    llenar: () => {
      escribir("Correo", "ana@ejemplo.mx")
      escribir("Contraseña", "clave-de-prueba-1234")
    },
    error: () => errorJson(401, "CREDENCIALES_INVALIDAS"),
  },
  {
    nombre: "registro",
    ruta: "/registro",
    endpoint: "/api/auth/registro",
    boton: "Crear cuenta",
    me: sinSesion,
    llenar: () => {
      escribir("Nombre completo", "Ana López")
      escribir("Correo", "ana@ejemplo.mx")
      escribir("Contraseña", "clave-de-prueba-1234")
    },
    error: () => errorJson(409, "CORREO_EN_USO"),
  },
  {
    nombre: "recuperar",
    ruta: "/recuperar",
    endpoint: "/api/auth/recuperar",
    boton: "Enviar enlace",
    me: sinSesion,
    llenar: () => escribir("Correo", "ana@ejemplo.mx"),
    error: () => errorJson(429, "DEMASIADAS_SOLICITUDES"),
  },
  {
    nombre: "restablecer",
    ruta: `/restablecer#token=${TOKEN_ENLACE}`,
    endpoint: "/api/auth/restablecer",
    boton: "Guardar contraseña",
    me: sinSesion,
    llenar: () => {
      escribir("Contraseña nueva", "clave-nueva-1234")
      escribir("Confirma la contraseña nueva", "clave-nueva-1234")
    },
    error: () => errorJson(500, "ERROR_INTERNO"),
  },
  {
    nombre: "establecer contraseña",
    ruta: `/establecer-contrasena#token=${TOKEN_ENLACE}`,
    endpoint: "/api/auth/establecer-contrasena",
    boton: "Activar mi cuenta",
    me: sinSesion,
    llenar: () => {
      escribir("Contraseña nueva", "clave-nueva-1234")
      escribir("Confirma la contraseña nueva", "clave-nueva-1234")
    },
    error: () => errorJson(500, "ERROR_INTERNO"),
  },
  {
    nombre: "cambio obligatorio",
    ruta: "/cambiar-contrasena",
    endpoint: "/api/auth/cambiar-contrasena",
    boton: "Guardar y continuar",
    me: conCambioPendiente,
    // AUTH-03a ronda 0 (C-5 y C-1): sin el campo de la temporal; el error del servidor es el que
    // sigue emitiendo (CONTRASENA_REPETIDA).
    llenar: () => {
      escribir("Contraseña nueva", "clave-nueva-1234")
      escribir("Confirma la contraseña nueva", "clave-nueva-1234")
    },
    error: () => errorJson(400, "CONTRASENA_REPETIDA"),
  },
]

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ataque (DESIGN-01a r1): botones de envío de las pantallas de cuenta en espera", () => {
  it.each(CASOS_FORMULARIO)(
    "$nombre: en vuelo, en espera con el foco y una sola petición; con error, sale de la espera",
    async (caso) => {
      const pendiente = diferida()
      const fetchMock = stubApi(caso.endpoint, pendiente, caso.me)
      await renderEn(caso.ruta)
      const control = await screen.findByRole("button", { name: caso.boton })
      caso.llenar()

      act(() => control.focus())
      fireEvent.click(control)
      await comprobarEnEspera(control, caso.boton)
      activarDeTodasLasFormas(control)
      await esperarUnMomento()
      expect(llamadasA(fetchMock, caso.endpoint), `peticiones a ${caso.endpoint}`).toBe(1)

      await act(async () => {
        pendiente.resolver(caso.error())
        await pendiente.promesa
      })
      expect(await screen.findByRole("alert")).toBeVisible()
      await comprobarFueraDeEspera(control)
      expect(document.activeElement, "tras el error, el botón perdió el foco").toBe(control)
      expect(llamadasA(fetchMock, caso.endpoint)).toBe(1)
    },
  )
})

interface CasoCerrarSesion {
  nombre: string
  ruta: string
  me: () => Response
}

const CASOS_CERRAR_SESION: CasoCerrarSesion[] = [
  { nombre: "marco de /estudiante", ruta: "/estudiante", me: () => respuestaJson(200, meDe({})) },
  {
    nombre: "marco de /admin",
    ruta: "/admin",
    me: () => respuestaJson(200, meDe({ rol: "admin", nombre: "Administración" })),
  },
  { nombre: "/cambiar-contrasena", ruta: "/cambiar-contrasena", me: conCambioPendiente },
  {
    nombre: "/acceso-restringido",
    ruta: "/acceso-restringido",
    me: () => respuestaJson(200, meDe({ accesoRestringido: true, motivoRestriccion: "Adeudo" })),
  },
]

describe("ataque (DESIGN-01a r1): 'Cerrar sesión' en espera", () => {
  it.each(CASOS_CERRAR_SESION)(
    "$nombre: en vuelo, en espera con el foco y un solo logout; al asentarse llega a /login",
    async (caso) => {
      const pendiente = diferida()
      const fetchMock = stubApi("/api/auth/logout", pendiente, caso.me)
      const router = await renderEn(caso.ruta)
      const control = await screen.findByRole("button", { name: "Cerrar sesión" })

      act(() => control.focus())
      fireEvent.click(control)
      await comprobarEnEspera(control, "Cerrar sesión")
      activarDeTodasLasFormas(control)
      await esperarUnMomento()
      expect(llamadasA(fetchMock, "/api/auth/logout")).toBe(1)

      await act(async () => {
        pendiente.resolver(respuestaJson(204, undefined))
        await pendiente.promesa
      })
      await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
      expect(llamadasA(fetchMock, "/api/auth/logout")).toBe(1)
    },
  )
})

describe("ataque (DESIGN-01a r1): dos clics en el mismo instante, sin repintado entre ellos", () => {
  it.each(CASOS_FORMULARIO.filter((caso) => caso.nombre === "login" || caso.nombre === "registro"))(
    "$nombre: una sola petición (un segundo envío del login contaría dos intentos)",
    async (caso) => {
      const pendiente = diferida()
      const fetchMock = stubApi(caso.endpoint, pendiente, caso.me)
      await renderEn(caso.ruta)
      const control = await screen.findByRole("button", { name: caso.boton })
      caso.llenar()

      fireEvent.click(control)
      fireEvent.click(control)
      await esperarUnMomento()

      expect(llamadasA(fetchMock, caso.endpoint)).toBe(1)
    },
  )
})
