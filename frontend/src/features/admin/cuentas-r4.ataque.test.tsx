import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { StrictMode, type ReactNode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Ataques del Tester (AUTH-02b, ronda 4) contra el cambio de la ronda 4 en ficha-de-cuenta.tsx:
// manejarDesenfoque ya no apaga tieneFocoRef si el blur no tiene destino (relatedTarget nulo o
// <body>), onError devuelve el foco a "Cancelar" y confirmandoAnteriorRef sustituye a
// esPrimerRenderRef.

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

const beto = {
  id: "c8f7b2b1-2222-4c9f-8b2f-1a3b4c5d6e7f",
  nombre: "Beto Díaz",
  email: "beto@ejemplo.mx",
  rol: "estudiante",
  activo: true,
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const CUENTAS: CuentaDePrueba[] = [carla, beto]

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

type Manejador = (ruta: string, init?: RequestInit) => Response | Promise<Response>

const stubFetch = (manejador: Manejador) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const delMarco = respuestaDelMarco(String(entrada), init)
    if (delMarco !== null) return Promise.resolve(delMarco)
    return Promise.resolve(manejador(String(entrada), init))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadasQueContienen = (fetchMock: ReturnType<typeof stubFetch>, fragmento: string) =>
  fetchMock.mock.calls.filter(([entrada]) => String(entrada).includes(fragmento)).length

const diferida = () => {
  let resolver: (respuesta: Response) => void = () => {
    throw new Error("la respuesta diferida se resolvió antes de crearse")
  }
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver: (respuesta: Response) => resolver(respuesta) }
}

// Cada llamada a /restablecer-contrasena toma la siguiente respuesta de la lista, en orden.
const apiDeCuentas = (...respuestas: Array<() => Response | Promise<Response>>) => {
  let siguiente = 0
  return stubFetch((ruta) => {
    if (ruta.endsWith("/restablecer-contrasena")) {
      const respuesta = respuestas[siguiente]
      siguiente += 1
      if (respuesta) return respuesta()
      return respuestaJson(200, { contrasenaTemporal: TEMPORAL })
    }
    return errorJson(500, "ERROR_INTERNO")
  })
}

const conStrictMode = (hijo: ReactNode) => <StrictMode>{hijo}</StrictMode>

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

// La ficha de una cuenta: su región con nombre (E-24). Sin clases de estilo.
const fichaDe = (nombre: string): HTMLElement => screen.getByRole("region", { name: nombre })

const boton = (nombre: string) => screen.getByRole("button", { name: nombre })

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 30)))

const pulsarEnter = () => {
  const conFoco = document.activeElement
  if (!(conFoco instanceof HTMLElement) || conFoco === document.body) {
    throw new Error("no hay ningún control con el foco al pulsar Enter")
  }
  fireEvent.click(conFoco)
}

const controlesEnfocables = () =>
  Array.from(document.querySelectorAll<HTMLElement>("button, input, a[href], select, textarea"))
    .filter((control) => !control.hasAttribute("disabled"))
    .filter((control) => control.tabIndex >= 0)

const pulsarShiftTab = () => {
  const lista = controlesEnfocables()
  const conFoco = document.activeElement
  if (!(conFoco instanceof HTMLElement)) throw new Error("no hay ningún control con el foco")
  const indice = lista.indexOf(conFoco)
  if (indice <= 0) throw new Error("no hay un control anterior en el orden de tabulación")
  const anterior = lista[indice - 1]
  if (!anterior) throw new Error("no hay un control anterior en el orden de tabulación")
  act(() => anterior.focus())
}

// La misma preparación de la ronda 3 (T-12): Chromium saca el foco del botón que pasa a `disabled`
// y lo deja en <body>. Desde DESIGN-01a (§D-5, §D-6) el botón en vuelo ya no se deshabilita: queda
// en espera. Esta preparación comprueba ahora F-1: `aria-disabled` y `aria-busy` en "true", sin
// `disabled`, y el foco conservado. El camino "foco en <body>" lo sigue cubriendo
// clicEnZonaNoEnfocable (tester, ronda 1).
const emularCorreccionDelFocoDeChromium = async (control: HTMLElement) => {
  await waitFor(() => expect(control).toHaveAttribute("aria-disabled", "true"))
  expect(control).toHaveAttribute("aria-busy", "true")
  expect(control).not.toBeDisabled()
  expect(control).not.toHaveAttribute("disabled")
  expect(document.activeElement, "el botón en espera debía conservar el foco").toBe(control)
}

// Un clic sobre una zona no enfocable de la página (texto, fondo): el control con el foco lo pierde
// hacia <body> con un blur sin destino (relatedTarget nulo), en cualquier navegador.
const clicEnZonaNoEnfocable = () => {
  const conFoco = document.activeElement
  if (!(conFoco instanceof HTMLElement) || conFoco === document.body) {
    throw new Error("no hay ningún control con el foco antes del clic en la zona no enfocable")
  }
  act(() => conFoco.blur())
  expect(document.activeElement).toBe(document.body)
}

// El admin hace clic en un campo y empieza a escribir.
const escribirEn = (campo: HTMLElement, texto: string) => {
  act(() => campo.focus())
  fireEvent.change(campo, { target: { value: texto } })
  expect(document.activeElement, "el campo debía recibir el foco con el clic").toBe(campo)
}

const describirFoco = () => {
  const conFoco = document.activeElement
  if (!conFoco || conFoco === document.body) return "<body>"
  return `${conFoco.tagName.toLowerCase()} "${conFoco.textContent || conFoco.getAttribute("aria-label") || conFoco.id}"`
}

const confirmarConClic = () => {
  fireEvent.click(boton("Restablecer contraseña"))
  const confirmar = boton("Sí, restablecer")
  // Chromium enfoca el botón con el clic; jsdom no, así que se enfoca a mano antes del clic.
  act(() => confirmar.focus())
  fireEvent.click(confirmar)
  return confirmar
}

const resolverCon = async (pendiente: ReturnType<typeof diferida>, respuesta: Response) => {
  await act(async () => {
    pendiente.resolver(respuesta)
    await pendiente.promesa
  })
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

// T-14. Tras la corrección del foco de Chromium (el caso que la ronda 4 dejó de contar como
// abandono), el foco ya está en <body>: cuando el admin hace clic en otro campo, ningún blur sale
// del contenedor de la confirmación, así que tieneFocoRef se queda en true y la llegada de la
// respuesta le quita el foco. Es la reproducción de T-11, ahora en el navegador real.
describe("ataque (AUTH-02b r4): en Chromium, el admin se va a otro campo con la petición en vuelo", () => {
  // T-14: riesgo aceptado el 2026-09-26; corregido en DESIGN-01a (§D-6), sin it.fails (ronda 1)
  it("la temporal que llega mientras escribe en 'Correo correcto' (fuera de la confirmación) no le roba el foco", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    await renderVista()
    await buscarConEnter(carla)
    const confirmar = confirmarConClic()
    await emularCorreccionDelFocoDeChromium(confirmar)

    const nombreMaestro = screen.getByLabelText("Correo correcto")
    escribirEn(nombreMaestro, "Ana Lóp")
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(
      document.activeElement,
      `el admin escribía en "Correo correcto" y la temporal le llevó el foco a ${describirFoco()}`,
    ).toBe(nombreMaestro)
  })

  // T-14: riesgo aceptado el 2026-09-26; corregido en DESIGN-01a (§D-6), sin it.fails (ronda 1)
  it("la temporal que llega mientras escribe en 'Correo correcto' de la misma ficha no le roba el foco", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    await renderVista()
    await buscarConEnter(carla)
    const confirmar = confirmarConClic()
    await emularCorreccionDelFocoDeChromium(confirmar)

    const correo = screen.getByLabelText("Correo correcto")
    escribirEn(correo, "carla.r")
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(
      document.activeElement,
      `el admin escribía en "Correo correcto" y la temporal le llevó el foco a ${describirFoco()}`,
    ).toBe(correo)
  })

  // T-14: riesgo aceptado el 2026-09-26; corregido en DESIGN-01a (§D-6), sin it.fails (ronda 1)
  it("un 500 que llega mientras escribe en 'Correo correcto' no le lleva el foco a 'Cancelar'", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    await renderVista()
    await buscarConEnter(carla)
    const confirmar = confirmarConClic()
    await emularCorreccionDelFocoDeChromium(confirmar)

    const nombreMaestro = screen.getByLabelText("Correo correcto")
    escribirEn(nombreMaestro, "Ana Lóp")
    await resolverCon(pendiente, errorJson(500, "ERROR_INTERNO"))
    expect(await screen.findByRole("alert")).toBeVisible()
    await esperarUnMomento()

    expect(
      document.activeElement,
      `el admin escribía en "Correo correcto" y el error le llevó el foco a ${describirFoco()}`,
    ).toBe(nombreMaestro)
  })
})

// T-14, en cualquier navegador: el blur sin destino también lo produce un clic en una zona no
// enfocable. Después, el admin se va a otro campo sin que el contenedor se entere.
describe("ataque (AUTH-02b r4): un clic en una zona no enfocable y después otro campo", () => {
  // T-14: riesgo aceptado el 2026-09-26; corregido en DESIGN-01a (§D-6), sin it.fails (ronda 1)
  it("'Cancelar' con la petición en vuelo, clic fuera y a escribir en 'Correo correcto': la temporal no le roba el foco", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    await renderVista()
    await buscarConEnter(carla)
    confirmarConClic()
    fireEvent.click(boton("Cancelar"))
    expect(document.activeElement).toBe(boton("Restablecer contraseña"))

    clicEnZonaNoEnfocable()
    const nombreMaestro = screen.getByLabelText("Correo correcto")
    escribirEn(nombreMaestro, "Ana Lóp")
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(
      document.activeElement,
      `el admin escribía en "Correo correcto" y la temporal le llevó el foco a ${describirFoco()}`,
    ).toBe(nombreMaestro)
  })
})

describe("ataque (AUTH-02b r4): lo que el cambio de la ronda 4 sí debe sostener", () => {
  it("jsdom, sin corrección: el admin pasa directo de 'Sí, restablecer' a 'Correo correcto' y un 500 no le quita el foco", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    await renderVista()
    await buscarConEnter(carla)
    confirmarConClic()

    const nombreMaestro = screen.getByLabelText("Correo correcto")
    escribirEn(nombreMaestro, "Ana Lóp")
    await resolverCon(pendiente, errorJson(500, "ERROR_INTERNO"))
    expect(await screen.findByRole("alert")).toBeVisible()
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(nombreMaestro)
  })

  it("'Cancelar' con la petición en vuelo y después un 500: el foco se queda en 'Restablecer contraseña'", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    await renderVista()
    await buscarConEnter(carla)
    confirmarConClic()
    fireEvent.click(boton("Cancelar"))
    expect(document.activeElement).toBe(boton("Restablecer contraseña"))

    await resolverCon(pendiente, errorJson(500, "ERROR_INTERNO"))
    expect(await screen.findByRole("alert")).toBeVisible()
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(
      boton("Restablecer contraseña"),
    )
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument()
  })

  it("en Chromium: 500, el foco vuelve a 'Cancelar', Shift+Tab y Enter reintentan y la temporal lleva el foco a 'Copiar'", async () => {
    const primera = diferida()
    const segunda = diferida()
    const fetchMock = apiDeCuentas(
      () => primera.promesa,
      () => segunda.promesa,
    )
    await renderVista()
    await buscarConEnter(carla)
    const confirmar = confirmarConClic()
    await emularCorreccionDelFocoDeChromium(confirmar)
    await resolverCon(primera, errorJson(500, "ERROR_INTERNO"))
    expect(await screen.findByRole("alert")).toBeVisible()
    await waitFor(() => expect(boton("Sí, restablecer")).toBeEnabled())
    // N-01 (DESIGN-01a): toBeEnabled ya no distingue un botón en espera; aria-disabled sí.
    await waitFor(() => expect(boton("Sí, restablecer")).not.toHaveAttribute("aria-disabled"))
    expect(document.activeElement, `tras el 500, el foco quedó en ${describirFoco()}`).toBe(
      boton("Cancelar"),
    )

    pulsarShiftTab()
    expect(document.activeElement).toBe(boton("Sí, restablecer"))
    pulsarEnter()
    await emularCorreccionDelFocoDeChromium(boton("Sí, restablecer"))
    await resolverCon(segunda, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(boton("Copiar"))
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(2)
  })

  it("en Chromium: tras la corrección, el admin vuelve a 'Cancelar' con Tab y la temporal lleva el foco a 'Copiar'", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    await renderVista()
    await buscarConEnter(carla)
    const confirmar = confirmarConClic()
    await emularCorreccionDelFocoDeChromium(confirmar)

    act(() => boton("Cancelar").focus())
    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(boton("Copiar"))
  })
})

describe("ataque (AUTH-02b r4): confirmandoAnteriorRef con <StrictMode>, remontajes y cambios de cuenta", () => {
  it("con <StrictMode>: abrir y cancelar tres veces alterna el foco entre 'Cancelar' y 'Restablecer contraseña'", async () => {
    const fetchMock = apiDeCuentas()
    await renderVista(conStrictMode)
    await buscarConEnter(carla)
    await esperarUnMomento()
    expect(document.activeElement).toBe(campoBuscar())

    for (let vuelta = 1; vuelta <= 3; vuelta += 1) {
      fireEvent.click(boton("Restablecer contraseña"))
      expect(document.activeElement, `vuelta ${vuelta}: al abrir`).toBe(boton("Cancelar"))
      fireEvent.click(boton("Cancelar"))
      expect(document.activeElement, `vuelta ${vuelta}: al cancelar`).toBe(
        boton("Restablecer contraseña"),
      )
    }
    await esperarUnMomento()

    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(0)
  })

  it("con <StrictMode>: Enter mantenido (nueve activaciones) no restablece ni pasa por <body>", async () => {
    const fetchMock = apiDeCuentas()
    await renderVista(conStrictMode)
    await buscarConEnter(carla)
    act(() => boton("Restablecer contraseña").focus())

    const recorrido: string[] = []
    for (let pulsacion = 0; pulsacion < 9; pulsacion += 1) {
      pulsarEnter()
      recorrido.push(describirFoco())
    }
    await esperarUnMomento()

    expect(
      llamadasQueContienen(fetchMock, "/restablecer-contrasena"),
      `recorrido del foco: ${recorrido.join(" → ")}`,
    ).toBe(0)
    expect(recorrido).not.toContain("<body>")
  })

  it("con <StrictMode> y en Chromium: el admin confirma y no se mueve, y la temporal lleva el foco a 'Copiar'", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    await renderVista(conStrictMode)
    await buscarConEnter(carla)
    const confirmar = confirmarConClic()
    await emularCorreccionDelFocoDeChromium(confirmar)

    await resolverCon(pendiente, respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(boton("Copiar"))
  })

  it("con <StrictMode>: buscar a Beto con la confirmación abierta en Carla no mueve el foco del buscador, y su confirmación enfoca su 'Cancelar'", async () => {
    apiDeCuentas()
    await renderVista(conStrictMode)
    await buscarConEnter(carla)
    fireEvent.click(boton("Restablecer contraseña"))
    expect(document.activeElement).toBe(boton("Cancelar"))

    await buscarConEnter(beto)
    await esperarUnMomento()
    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(campoBuscar())
    expect(screen.queryByRole("button", { name: "Sí, restablecer" })).not.toBeInTheDocument()

    const ficha = fichaDe(beto.nombre)
    fireEvent.click(within(ficha).getByRole("button", { name: "Restablecer contraseña" }))
    expect(document.activeElement).toBe(within(ficha).getByRole("button", { name: "Cancelar" }))
  })

  it("con <StrictMode>: desmontar y volver a montar la vista entera no mueve el foco al montar", async () => {
    apiDeCuentas()
    const { unmount } = await renderVista(conStrictMode)
    await buscarConEnter(carla)
    fireEvent.click(boton("Restablecer contraseña"))
    unmount()

    await renderVista(conStrictMode)
    await buscarConEnter(carla)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(campoBuscar())
    expect(screen.queryByRole("button", { name: "Sí, restablecer" })).not.toBeInTheDocument()
  })
})
