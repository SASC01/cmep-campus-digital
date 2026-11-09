import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Ataques del Tester (DESIGN-01a, ronda 1) contra `enEspera` en los cinco botones de /admin
// ("Buscar", "Enviar invitación", "Guardar correo", "Sí, restablecer" y "Copiar"): con la petición
// en vuelo, aria-disabled y aria-busy sin `disabled`, el mismo nombre accesible, el foco conservado
// y el botón en el orden de tabulación; ninguna activación repetida (clic, Enter o Espacio, envío
// del formulario, requestSubmit) manda una segunda petición; y al asentarse, con éxito o con error,
// el botón sale de la espera (plan, §D-5 y "Puntos de ataque", punto 2).

// ADMIN-01f ronda 0 (C-13, §D-R0 01f y §D-11): CuentasView y POST /admin/usuarios/buscar se borran.
// Cada caso monta ahora el router real (createMemoryRouter con las rutas de app/router) y abre la
// ficha /admin/usuarios/:usuarioId (GET /admin/usuarios/:id), que se localiza por su región con
// nombre (E-24). Equivalencias: "buscar una cuenta" es abrir su ficha (navegar a su ruta, como el
// enlace "Ver" de la tabla); "buscar otra cuenta", abrir la de otra; "una búsqueda rechazada en el
// cliente", abrir /admin/usuarios/abc (400 VALIDACION, "Esa cuenta ya no existe.", ADM-1F26); el
// campo de búsqueda donde se quedaba el foco es el enlace "Usuarios" de la barra (sigue montado al
// cambiar de ficha); "Nombre completo" de "Invitar maestro" (otro formulario de la página) es
// "Correo correcto" de la ficha, fuera de la confirmación; "Invitar maestro" vive en
// /admin/maestros. Lo que protege cada caso no cambia.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))

const TEMPORAL = "Kp7mWq4Rt9Xz"

const carla = {
  id: "b7e6a1a0-1111-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Carla Ruiz",
  email: "carla@ejemplo.mx",
  rol: "maestro",
  activo: true,
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const CUENTAS: CuentaDePrueba[] = [carla]

const ME_ADMIN = {
  id: "d9a8c3c2-3333-4da0-9c3a-2b4c5d6e7f80",
  nombre: "Administración",
  email: "admin@ejemplo.mx",
  rol: "admin",
  debeCambiarContrasena: false,
  accesoRestringido: false,
}

interface CuentaDePrueba {
  id: string
  nombre: string
  email: string
  rol: string
  activo: boolean
}

// La fila de GET /admin/usuarios/:id: los datos de alumno solo en estudiantes (RN-02).
const filaDe = (cuenta: CuentaDePrueba) => ({
  ...cuenta,
  creadoEn: "2026-09-01T15:00:00.000Z",
  ...(cuenta.rol === "estudiante"
    ? {
        estadoPago: "al_corriente",
        fechaEstadoPago: null,
        accesoRestringido: false,
        motivoRestriccion: null,
        fechaRestriccion: null,
      }
    : {}),
})

// El marco del admin y la ficha (sesión, /me, la tabla, la cuenta por id y los enlaces de
// /admin/maestros) responden antes que el manejador del caso.
const respuestaDelMarco = (ruta: string, init?: RequestInit): Response | null => {
  const metodo = init?.method ?? "GET"
  if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "t" })
  if (ruta === "/api/me") return respuestaJson(200, ME_ADMIN)
  if (metodo !== "GET") return null
  if (/^\/api\/admin\/usuarios(\?|$)/.test(ruta)) {
    return respuestaJson(200, {
      usuarios: CUENTAS.map(filaDe),
      siguienteCursor: null,
      siguienteCursorNombre: null,
    })
  }
  const ficha = /^\/api\/admin\/usuarios\/([^/?]+)$/.exec(ruta)
  if (ficha) {
    const cuenta = CUENTAS.find((u) => u.id === ficha[1])
    if (cuenta) return respuestaJson(200, filaDe(cuenta))
    if (ficha[1] === "abc") {
      return errorJson(400, "VALIDACION", "id: id: debe ser un identificador válido")
    }
    return errorJson(404, "USUARIO_NO_ENCONTRADO")
  }
  if (ruta.startsWith("/api/admin/enlaces-registro")) {
    return respuestaJson(200, { enlaces: [], siguienteCursor: null })
  }
  return null
}

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

// Cada ruta puede quedar en vuelo con su propia respuesta diferida; las demás responden al instante.
const apiDeCuentas = (enVuelo: Partial<Record<"invitar" | "correo" | "restablecer", Diferida>>) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const ruta = String(entrada)
    const delMarco = respuestaDelMarco(ruta, init)
    if (delMarco !== null) return Promise.resolve(delMarco)
    if (ruta === "/api/admin/maestros" && enVuelo.invitar) return enVuelo.invitar.promesa
    if (ruta.endsWith("/correo") && enVuelo.correo) return enVuelo.correo.promesa
    if (ruta.endsWith("/restablecer-contrasena") && enVuelo.restablecer) {
      return enVuelo.restablecer.promesa
    }
    if (ruta.endsWith("/restablecer-contrasena")) {
      return Promise.resolve(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    }
    return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadasQueContienen = (fetchMock: ReturnType<typeof apiDeCuentas>, fragmento: string) =>
  fetchMock.mock.calls.filter(([entrada]) => String(entrada).includes(fragmento)).length

const enrutador: { actual: ReturnType<typeof createMemoryRouter> | undefined } = {
  actual: undefined,
}

const routerActual = () => {
  if (!enrutador.actual) throw new Error("Precondición: la vista se montó con renderVista")
  return enrutador.actual
}

// Monta el router real en /admin/usuarios (la tabla): cada caso abre después la ficha que necesita.
const renderVista = async (
  envolver: (hijo: ReactNode) => ReactNode = (hijo) => hijo,
  entrada = "/admin/usuarios",
) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [entrada] })
  enrutador.actual = router
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const vista = render(
    envolver(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  )
  await screen.findByRole("navigation", { name: "Navegación principal" })
  return Object.assign(vista, { queryClient, router })
}

const irARuta = async (ruta: string) => {
  await act(async () => {
    await routerActual().navigate(ruta)
  })
}

// Antes: escribir el correo y pulsar "Buscar". Ahora: abrir la ficha de la cuenta.
const abrirFicha = async (cuenta: CuentaDePrueba) => {
  await irARuta(`/admin/usuarios/${cuenta.id}`)
  return screen.findByRole("region", { name: cuenta.nombre })
}

const boton = (nombre: string) => screen.getByRole("button", { name: nombre })

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 30)))

const resolverCon = async (pendiente: Diferida, respuesta: Response) => {
  await act(async () => {
    pendiente.resolver(respuesta)
    await pendiente.promesa
  })
}

// Clic con el foco puesto, como en Chromium (jsdom no enfoca el botón con el clic).
const pulsar = (nombre: string) => {
  const control = boton(nombre)
  act(() => control.focus())
  fireEvent.click(control)
  return control
}

// F-1 aplicado a cualquier botón en vuelo (§D-5): en espera, sin `disabled`, con el mismo nombre,
// con el foco y dentro del orden de tabulación.
const comprobarEnEspera = async (control: HTMLElement, nombre: string) => {
  await waitFor(() => expect(control).toHaveAttribute("aria-disabled", "true"))
  expect(control).toHaveAttribute("aria-busy", "true")
  expect(control).not.toHaveAttribute("disabled")
  expect(control).not.toBeDisabled()
  expect(boton(nombre), "el nombre accesible cambió con la petición en vuelo").toBe(control)
  expect(document.activeElement, `"${nombre}" en espera perdió el foco`).toBe(control)
  expect(
    control.tabIndex,
    `"${nombre}" en espera salió del orden de tabulación`,
  ).toBeGreaterThanOrEqual(0)
}

// Enter y Espacio sobre un botón con el foco se convierten en "click" en el navegador; jsdom no lo
// hace, así que se emulan con el clic. Además, el envío del formulario por las dos vías que no pasan
// por el botón: el evento submit y requestSubmit().
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

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  enrutador.actual = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Reflect.deleteProperty(window.navigator, "clipboard")
  aviso.success.mockClear()
  aviso.error.mockClear()
})

// ADMIN-01f ronda 0 (C-13): el bloque de «Buscar» sale con el buscador de /admin, que se borra. La
// espera de los botones nuevos de 01f la cubren ADM-1F05 a ADM-1F09 y V-06 (C-17).

// ADMIN-01f ronda 0 (C-13 y §D-11): "Invitar maestro" vive en /admin/maestros.
describe("ataque (DESIGN-01a r1): 'Enviar invitación' en espera", () => {
  const llenarInvitacion = () => {
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana López" } })
    fireEvent.change(screen.getByLabelText("Correo"), {
      target: { value: "ana@ejemplo.mx" },
    })
  }

  it("en vuelo: una sola invitación aunque se active de todas las formas; con error sale de la espera", async () => {
    const pendiente = diferida()
    const fetchMock = apiDeCuentas({ invitar: pendiente })
    await renderVista(undefined, "/admin/maestros")
    await screen.findByRole("button", { name: "Enviar invitación" })
    llenarInvitacion()

    const control = pulsar("Enviar invitación")
    await comprobarEnEspera(control, "Enviar invitación")
    activarDeTodasLasFormas(control)
    await esperarUnMomento()
    expect(llamadasQueContienen(fetchMock, "/api/admin/maestros")).toBe(1)

    await resolverCon(pendiente, errorJson(409, "CORREO_EN_USO"))
    await comprobarFueraDeEspera(control)
    expect(document.activeElement).toBe(control)
  })

  it("con éxito sale de la espera", async () => {
    const pendiente = diferida()
    apiDeCuentas({ invitar: pendiente })
    await renderVista(undefined, "/admin/maestros")
    await screen.findByRole("button", { name: "Enviar invitación" })
    llenarInvitacion()

    const control = pulsar("Enviar invitación")
    await comprobarEnEspera(control, "Enviar invitación")
    await resolverCon(
      pendiente,
      respuestaJson(201, {
        id: "e1b2c3d4-4444-4e5f-8a6b-7c8d9e0f1a2b",
        nombre: "Ana López",
        email: "ana@ejemplo.mx",
        rol: "maestro",
        activo: true,
      }),
    )
    // ADMIN-01f (C-13): en /admin/maestros puede haber otras regiones de estado; se busca la de la
    // invitación por su texto.
    expect(await screen.findByText(/^Invitación creada\./)).toBeVisible()

    await comprobarFueraDeEspera(control)
  })
})

describe("ataque (DESIGN-01a r1): 'Guardar correo' en espera", () => {
  it("en vuelo: una sola corrección; con error sale de la espera y conserva el foco", async () => {
    const pendiente = diferida()
    const fetchMock = apiDeCuentas({ correo: pendiente })
    await renderVista()
    await abrirFicha(carla)
    fireEvent.change(screen.getByLabelText("Correo correcto"), {
      target: { value: "carla.ruiz@ejemplo.mx" },
    })

    const control = pulsar("Guardar correo")
    await comprobarEnEspera(control, "Guardar correo")
    activarDeTodasLasFormas(control)
    await esperarUnMomento()
    expect(llamadasQueContienen(fetchMock, "/correo")).toBe(1)

    await resolverCon(pendiente, errorJson(409, "CORREO_EN_USO"))
    await comprobarFueraDeEspera(control)
    expect(document.activeElement).toBe(control)
  })

  it("con éxito sale de la espera", async () => {
    const pendiente = diferida()
    apiDeCuentas({ correo: pendiente })
    await renderVista()
    await abrirFicha(carla)
    fireEvent.change(screen.getByLabelText("Correo correcto"), {
      target: { value: "carla.ruiz@ejemplo.mx" },
    })

    const control = pulsar("Guardar correo")
    await comprobarEnEspera(control, "Guardar correo")
    await resolverCon(pendiente, respuestaJson(200, { ...carla, email: "carla.ruiz@ejemplo.mx" }))
    await screen.findByText("carla.ruiz@ejemplo.mx")

    await comprobarFueraDeEspera(control)
  })
})

describe("ataque (DESIGN-01a r1): 'Sí, restablecer' en espera", () => {
  it("en vuelo: clic, Enter y Espacio repetidos no generan una segunda temporal; con error sale de la espera", async () => {
    const pendiente = diferida()
    const fetchMock = apiDeCuentas({ restablecer: pendiente })
    await renderVista()
    await abrirFicha(carla)
    fireEvent.click(boton("Restablecer contraseña"))

    const control = pulsar("Sí, restablecer")
    await comprobarEnEspera(control, "Sí, restablecer")
    activarDeTodasLasFormas(control)
    await esperarUnMomento()
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)

    await resolverCon(pendiente, errorJson(500, "ERROR_INTERNO"))
    expect(await screen.findByRole("alert")).toBeVisible()
    await comprobarFueraDeEspera(boton("Sí, restablecer"))
  })

  it("con éxito aparece una sola temporal y 'Sí, restablecer' desaparece", async () => {
    const pendiente = diferida()
    const fetchMock = apiDeCuentas({ restablecer: pendiente })
    await renderVista()
    await abrirFicha(carla)
    fireEvent.click(boton("Restablecer contraseña"))

    const control = pulsar("Sí, restablecer")
    await comprobarEnEspera(control, "Sí, restablecer")
    activarDeTodasLasFormas(control)
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))

    expect(await screen.findAllByText(TEMPORAL)).toHaveLength(1)
    expect(screen.queryByRole("button", { name: "Sí, restablecer" })).not.toBeInTheDocument()
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)
  })
})

describe("ataque (DESIGN-01a r1): 'Copiar' en espera con writeText lento", () => {
  const verTemporal = async () => {
    apiDeCuentas({})
    await renderVista()
    await abrirFicha(carla)
    fireEvent.click(boton("Restablecer contraseña"))
    fireEvent.click(boton("Sí, restablecer"))
    await screen.findByText(TEMPORAL)
  }

  const portapapelesLento = () => {
    let resolver: () => void = () => undefined
    let rechazar: (motivo: unknown) => void = () => undefined
    const writeText = vi.fn(
      () =>
        new Promise<void>((res, rej) => {
          resolver = res
          rechazar = rej
        }),
    )
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    })
    return {
      writeText,
      terminar: () => act(async () => resolver()),
      fallar: () => act(async () => rechazar(new DOMException("denied", "NotAllowedError"))),
    }
  }

  it("en vuelo: en espera con el foco y un solo writeText; al copiar sale de la espera con un solo aviso", async () => {
    const portapapeles = portapapelesLento()
    await verTemporal()

    const control = pulsar("Copiar")
    await comprobarEnEspera(control, "Copiar")
    activarDeTodasLasFormas(control)
    await esperarUnMomento()
    expect(portapapeles.writeText).toHaveBeenCalledTimes(1)

    await portapapeles.terminar()
    await comprobarFueraDeEspera(control)
    expect(aviso.success).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(control)
  })

  it("si writeText falla, sale de la espera con un solo aviso de error", async () => {
    const portapapeles = portapapelesLento()
    await verTemporal()

    const control = pulsar("Copiar")
    await comprobarEnEspera(control, "Copiar")
    await portapapeles.fallar()

    await comprobarFueraDeEspera(control)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(aviso.success).not.toHaveBeenCalled()
  })
})
