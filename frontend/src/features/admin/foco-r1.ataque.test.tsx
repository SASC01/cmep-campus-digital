import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { StrictMode, type ReactNode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Ataques del Tester (DESIGN-01a, ronda 1) contra la corrección de T-14 en ficha-de-cuenta.tsx
// (§D-6): el foco se decide con el elemento activo en el momento de la respuesta. Contrato F-1 a
// F-4: el camino "foco en <body>" (clic en una zona no enfocable) seguido o no de otro campo, con
// éxito y con error; salir con Tab y volver antes de la respuesta; cambio de ventana; <StrictMode>;
// cancelar en vuelo y seguir en otro control; un 500 seguido de un reintento.

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

// Cada llamada a /restablecer-contrasena toma la siguiente respuesta diferida, en orden.
const apiDeCuentas = (...pendientes: Diferida[]) => {
  let siguiente = 0
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const ruta = String(entrada)
    const delMarco = respuestaDelMarco(ruta, init)
    if (delMarco !== null) return Promise.resolve(delMarco)
    if (ruta.endsWith("/restablecer-contrasena")) {
      const pendiente = pendientes[siguiente]
      siguiente += 1
      if (!pendiente) throw new Error("llegó una petición de restablecimiento que no se esperaba")
      return pendiente.promesa
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

// Antes: el campo de búsqueda, que seguía montado con la ficha. Ahora: el enlace "Usuarios" de la
// barra, que sigue montado al cambiar de ficha.
const campoBuscar = () =>
  within(screen.getByRole("navigation", { name: "Navegación principal" })).getByRole("link", {
    name: "Usuarios",
  })

// Como un admin con el foco en "Usuarios" que abre otra ficha sin moverlo.
const buscarConEnter = async (cuenta: CuentaDePrueba) => {
  const campo = campoBuscar()
  act(() => campo.focus())
  return abrirFicha(cuenta)
}

const boton = (nombre: string) => screen.getByRole("button", { name: nombre })

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 30)))

const resolverCon = async (pendiente: Diferida, respuesta: Response) => {
  await act(async () => {
    pendiente.resolver(respuesta)
    await pendiente.promesa
  })
}

const describirFoco = () => {
  const conFoco = document.activeElement
  if (!conFoco || conFoco === document.body) return "<body>"
  return `${conFoco.tagName.toLowerCase()} "${conFoco.textContent || conFoco.getAttribute("aria-label") || conFoco.id}"`
}

// Abre la confirmación y confirma con el foco puesto en "Sí, restablecer" (Chromium lo enfoca con
// el clic; jsdom no). Comprueba F-1: en espera, sin `disabled` y con el foco.
const confirmarEnVuelo = async () => {
  fireEvent.click(boton("Restablecer contraseña"))
  const confirmar = boton("Sí, restablecer")
  act(() => confirmar.focus())
  fireEvent.click(confirmar)
  await waitFor(() => expect(confirmar).toHaveAttribute("aria-disabled", "true"))
  expect(confirmar).toHaveAttribute("aria-busy", "true")
  expect(confirmar).not.toHaveAttribute("disabled")
  expect(document.activeElement, "F-1: 'Sí, restablecer' en vuelo perdió el foco").toBe(confirmar)
  return confirmar
}

// Un clic sobre una zona no enfocable de la página: el control con el foco lo pierde hacia <body>.
const clicEnZonaNoEnfocable = () => {
  const conFoco = document.activeElement
  if (!(conFoco instanceof HTMLElement) || conFoco === document.body) {
    throw new Error("no hay ningún control con el foco antes del clic en la zona no enfocable")
  }
  act(() => conFoco.blur())
  expect(document.activeElement).toBe(document.body)
}

const escribirEn = (campo: HTMLElement, texto: string) => {
  act(() => campo.focus())
  fireEvent.change(campo, { target: { value: texto } })
  expect(document.activeElement, "el campo debía recibir el foco con el clic").toBe(campo)
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
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque (DESIGN-01a r1): F-2 y F-3 tras un clic en una zona no enfocable", () => {
  it("clic fuera y a escribir en 'Correo correcto' (fuera de la confirmación): la temporal no le roba el foco", async () => {
    const pendiente = diferida()
    apiDeCuentas(pendiente)
    await renderVista()
    await buscarConEnter(carla)
    await confirmarEnVuelo()

    clicEnZonaNoEnfocable()
    const nombre = screen.getByLabelText("Correo correcto")
    escribirEn(nombre, "Ana Lóp")
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(document.activeElement, `la temporal llevó el foco a ${describirFoco()}`).toBe(nombre)
  })

  it("clic fuera y a escribir en 'Correo correcto' de la misma ficha: un 500 no le lleva el foco a 'Cancelar'", async () => {
    const pendiente = diferida()
    apiDeCuentas(pendiente)
    await renderVista()
    await buscarConEnter(carla)
    await confirmarEnVuelo()

    clicEnZonaNoEnfocable()
    const correo = screen.getByLabelText("Correo correcto")
    escribirEn(correo, "carla.r")
    await resolverCon(pendiente, errorJson(500, "ERROR_INTERNO"))
    expect(await screen.findByRole("alert")).toBeVisible()
    await esperarUnMomento()

    expect(document.activeElement, `el error llevó el foco a ${describirFoco()}`).toBe(correo)
  })

  it("clic fuera sin ir a otro campo (nadie tiene el foco): la temporal lleva el foco a 'Copiar'", async () => {
    const pendiente = diferida()
    apiDeCuentas(pendiente)
    await renderVista()
    await buscarConEnter(carla)
    await confirmarEnVuelo()

    clicEnZonaNoEnfocable()
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(boton("Copiar"))
  })

  it("clic fuera sin ir a otro campo: un 500 lleva el foco a 'Cancelar', nunca lo deja en <body>", async () => {
    const pendiente = diferida()
    apiDeCuentas(pendiente)
    await renderVista()
    await buscarConEnter(carla)
    await confirmarEnVuelo()

    clicEnZonaNoEnfocable()
    await resolverCon(pendiente, errorJson(500, "ERROR_INTERNO"))
    expect(await screen.findByRole("alert")).toBeVisible()
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(boton("Cancelar"))
  })
})

describe("ataque (DESIGN-01a r1): salir y volver antes de la respuesta", () => {
  it("sale con Tab a 'Correo correcto' y vuelve a 'Sí, restablecer': la temporal lleva el foco a 'Copiar'", async () => {
    const pendiente = diferida()
    apiDeCuentas(pendiente)
    await renderVista()
    await buscarConEnter(carla)
    const confirmar = await confirmarEnVuelo()

    act(() => screen.getByLabelText("Correo correcto").focus())
    act(() => confirmar.focus())
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(boton("Copiar"))
  })

  it("sale al enlace 'Usuarios' de la barra y se queda ahí: la temporal aparece y el foco no se mueve", async () => {
    const pendiente = diferida()
    apiDeCuentas(pendiente)
    await renderVista()
    await buscarConEnter(carla)
    await confirmarEnVuelo()

    const buscar = campoBuscar()
    act(() => buscar.focus())
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    expect(await screen.findByText(TEMPORAL)).toBeVisible()
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(buscar)
  })

  it("cambio de ventana (el documento conserva su elemento activo): la temporal lleva el foco a 'Copiar'", async () => {
    const pendiente = diferida()
    apiDeCuentas(pendiente)
    await renderVista()
    await buscarConEnter(carla)
    const confirmar = await confirmarEnVuelo()

    act(() => {
      window.dispatchEvent(new FocusEvent("blur"))
    })
    expect(document.activeElement).toBe(confirmar)
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    act(() => {
      window.dispatchEvent(new FocusEvent("focus"))
    })
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(boton("Copiar"))
  })
})

describe("ataque (DESIGN-01a r1): cancelar en vuelo y seguir en otro control", () => {
  it("'Cancelar' en vuelo y a escribir en 'Correo correcto': la temporal no le roba el foco", async () => {
    const pendiente = diferida()
    apiDeCuentas(pendiente)
    await renderVista()
    await buscarConEnter(carla)
    await confirmarEnVuelo()

    fireEvent.click(boton("Cancelar"))
    expect(document.activeElement).toBe(boton("Restablecer contraseña"))
    const campo = screen.getByLabelText("Correo correcto")
    escribirEn(campo, "beto@")
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    expect(await screen.findByText(TEMPORAL)).toBeVisible()
    await esperarUnMomento()

    expect(document.activeElement, `la temporal llevó el foco a ${describirFoco()}`).toBe(campo)
  })

  it("'Cancelar' en vuelo, reabrir la confirmación y llega un 500: el foco va a 'Cancelar' y el reintento funciona", async () => {
    const primera = diferida()
    const segunda = diferida()
    const fetchMock = apiDeCuentas(primera, segunda)
    await renderVista()
    await buscarConEnter(carla)
    await confirmarEnVuelo()

    fireEvent.click(boton("Cancelar"))
    fireEvent.click(boton("Restablecer contraseña"))
    expect(document.activeElement).toBe(boton("Cancelar"))
    expect(boton("Sí, restablecer")).toHaveAttribute("aria-disabled", "true")
    fireEvent.click(boton("Sí, restablecer"))
    await resolverCon(primera, errorJson(500, "ERROR_INTERNO"))
    expect(await screen.findByRole("alert")).toBeVisible()
    await esperarUnMomento()
    expect(document.activeElement, `tras el 500, el foco quedó en ${describirFoco()}`).toBe(
      boton("Cancelar"),
    )
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)

    const reintento = boton("Sí, restablecer")
    act(() => reintento.focus())
    fireEvent.click(reintento)
    await resolverCon(segunda, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(boton("Copiar"))
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(2)
  })
})

describe("ataque (DESIGN-01a r1): un 500 mientras escribe en otro campo, y el reintento", () => {
  it("el 500 no le quita el foco; vuelve, reintenta, y la temporal sí lleva el foco a 'Copiar'", async () => {
    const primera = diferida()
    const segunda = diferida()
    const fetchMock = apiDeCuentas(primera, segunda)
    await renderVista()
    await buscarConEnter(carla)
    await confirmarEnVuelo()

    const nombre = screen.getByLabelText("Correo correcto")
    escribirEn(nombre, "Ana")
    await resolverCon(primera, errorJson(500, "ERROR_INTERNO"))
    expect(await screen.findByRole("alert")).toBeVisible()
    await esperarUnMomento()
    expect(document.activeElement, `el 500 llevó el foco a ${describirFoco()}`).toBe(nombre)

    const reintento = boton("Sí, restablecer")
    await waitFor(() => expect(reintento).not.toHaveAttribute("aria-disabled"))
    act(() => reintento.focus())
    fireEvent.click(reintento)
    await waitFor(() => expect(reintento).toHaveAttribute("aria-disabled", "true"))
    expect(document.activeElement).toBe(reintento)
    await resolverCon(segunda, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(boton("Copiar"))
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(2)
  })
})

describe("ataque (DESIGN-01a r1): F-2 y F-4 con <StrictMode>", () => {
  it("con <StrictMode>: clic fuera y a escribir en 'Correo correcto' (fuera de la confirmación), la temporal no le roba el foco", async () => {
    const pendiente = diferida()
    apiDeCuentas(pendiente)
    await renderVista((hijo) => <StrictMode>{hijo}</StrictMode>)
    await buscarConEnter(carla)
    await confirmarEnVuelo()

    clicEnZonaNoEnfocable()
    const nombre = screen.getByLabelText("Correo correcto")
    escribirEn(nombre, "Ana Lóp")
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(document.activeElement, `la temporal llevó el foco a ${describirFoco()}`).toBe(nombre)
  })

  it("con <StrictMode>: la ficha que aparece, abrir y cancelar no mueven el foco más que lo pactado", async () => {
    apiDeCuentas()
    await renderVista((hijo) => <StrictMode>{hijo}</StrictMode>)
    await buscarConEnter(carla)
    await esperarUnMomento()
    expect(document.activeElement, `al montar, el foco quedó en ${describirFoco()}`).toBe(
      campoBuscar(),
    )

    fireEvent.click(boton("Restablecer contraseña"))
    expect(document.activeElement).toBe(boton("Cancelar"))
    fireEvent.click(boton("Cancelar"))
    expect(document.activeElement).toBe(boton("Restablecer contraseña"))
  })
})
