import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { StrictMode, type ReactNode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Ataques del Tester (AUTH-02b, ronda 3) contra el rediseño del foco de la ronda 3: el useEffect
// sobre "confirmando" (T-09, T-10), el ref tieneFocoRef leído en el onSuccess (T-11) y el
// esPrimerRenderRef que evita mover el foco en el primer render.

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

const NO_EXISTE = "Esa cuenta ya no existe."

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

const apiDeCuentas = (restablecer?: () => Response | Promise<Response>) =>
  stubFetch((ruta) => {
    if (ruta.endsWith("/restablecer-contrasena")) {
      if (restablecer) return restablecer()
      return respuestaJson(200, { contrasenaTemporal: TEMPORAL })
    }
    return errorJson(500, "ERROR_INTERNO")
  })

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

// Antes: una búsqueda rechazada en el cliente. Ahora: una ficha con el id mal formado.
const abrirFichaRechazada = async () => {
  await irARuta("/admin/usuarios/abc")
  await screen.findByText(NO_EXISTE)
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

// jsdom no ejecuta la acción por defecto de una tecla: en un navegador, Enter sobre un botón con el
// foco dispara su "click". Se emula así, sobre lo que tenga el foco en ese momento.
const pulsarEnter = () => {
  const conFoco = document.activeElement
  if (!(conFoco instanceof HTMLElement) || conFoco === document.body) {
    throw new Error("no hay ningún control con el foco al pulsar Enter")
  }
  fireEvent.click(conFoco)
}

// Orden secuencial del foco (Tab) de la página: controles habilitados, en orden del documento.
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

// Chromium (comprobado con Chrome 153 sin interfaz, ver el reporte): cuando el botón que tiene el
// foco pasa a `disabled`, el navegador le quita el foco y lo deja en <body> (la "corrección del
// foco" del HTML). Desde DESIGN-01a (§D-5, §D-6) el botón en vuelo ya no se deshabilita: queda en
// espera. Esta preparación comprueba ahora F-1: `aria-disabled` y `aria-busy` en "true", sin
// `disabled`, y el foco conservado, así que Chromium ya no tiene nada que corregir (tester, ronda 1).
const emularCorreccionDelFocoDeChromium = async (control: HTMLElement) => {
  await waitFor(() => expect(control).toHaveAttribute("aria-disabled", "true"))
  expect(control).toHaveAttribute("aria-busy", "true")
  expect(control).not.toBeDisabled()
  expect(control).not.toHaveAttribute("disabled")
  expect(document.activeElement, "el botón en espera debía conservar el foco").toBe(control)
}

const describirFoco = () => {
  const conFoco = document.activeElement
  if (!conFoco || conFoco === document.body) return "<body>"
  return `${conFoco.tagName.toLowerCase()} "${conFoco.textContent || conFoco.getAttribute("aria-label") || conFoco.id}"`
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

describe("ataque (AUTH-02b r3): la confirmación abierta y cerrada, y el teclado", () => {
  it("abrir y cerrar la confirmación cinco veces seguidas alterna el foco sin perderlo y sin peticiones", async () => {
    const fetchMock = apiDeCuentas()
    await renderVista()
    await buscarConEnter(carla)

    for (let vuelta = 1; vuelta <= 5; vuelta += 1) {
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

  it("Enter mantenido (nueve activaciones seguidas sobre lo que tenga el foco) nunca restablece", async () => {
    const fetchMock = apiDeCuentas()
    await renderVista()
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
    expect(screen.queryByText(TEMPORAL)).not.toBeInTheDocument()
  })

  it("Shift+Tab desde 'Cancelar' llega a 'Sí, restablecer' y Enter ahí sí restablece, una vez", async () => {
    const fetchMock = apiDeCuentas()
    await renderVista()
    await buscarConEnter(carla)
    act(() => boton("Restablecer contraseña").focus())
    pulsarEnter()
    expect(document.activeElement).toBe(boton("Cancelar"))

    pulsarShiftTab()
    expect(document.activeElement).toBe(boton("Sí, restablecer"))
    pulsarEnter()

    expect(await screen.findByText(TEMPORAL)).toBeVisible()
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)
    await waitFor(() => expect(document.activeElement).toBe(boton("Copiar")))
  })

  it("Tab desde 'Cancelar' sale de la confirmación: el siguiente control no es 'Sí, restablecer'", async () => {
    apiDeCuentas()
    await renderVista()
    await buscarConEnter(carla)
    fireEvent.click(boton("Restablecer contraseña"))
    const lista = controlesEnfocables()
    const siguiente = lista[lista.indexOf(boton("Cancelar")) + 1]

    expect(siguiente, "no hay ningún control después de 'Cancelar'").toBeDefined()
    expect(siguiente).not.toBe(boton("Sí, restablecer"))
  })
})

describe("ataque (AUTH-02b r3): el primer render no roba el foco", () => {
  it("la ficha que aparece tras buscar con Enter deja el foco en el campo de búsqueda", async () => {
    apiDeCuentas()
    await renderVista()

    await buscarConEnter(carla)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(campoBuscar())
  })

  it("buscar otra cuenta (la ficha se remonta) tampoco mueve el foco del campo de búsqueda", async () => {
    apiDeCuentas()
    await renderVista()
    await buscarConEnter(carla)

    await buscarConEnter(beto)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(campoBuscar())
  })

  // T-13. main.tsx monta la aplicación dentro de <StrictMode>: en desarrollo, React simula desmontar
  // y volver a montar cada componente nuevo y vuelve a ejecutar sus efectos, conservando los refs.
  it("con <StrictMode> (como en main.tsx), la ficha que aparece no le quita el foco al campo de búsqueda", async () => {
    apiDeCuentas()
    await renderVista((hijo) => <StrictMode>{hijo}</StrictMode>)

    await buscarConEnter(carla)
    await esperarUnMomento()

    expect(
      document.activeElement,
      `con <StrictMode>, el primer render de la ficha movió el foco a ${describirFoco()}`,
    ).toBe(campoBuscar())
  })
})

describe("ataque (AUTH-02b r3): la respuesta llega cuando la ficha ya cambió", () => {
  it("la temporal de Carla que llega con Beto en pantalla no aparece ni mueve el foco del buscador", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    await renderVista()
    await buscarConEnter(carla)
    fireEvent.click(boton("Restablecer contraseña"))
    const confirmar = boton("Sí, restablecer")
    act(() => confirmar.focus())
    fireEvent.click(confirmar)

    await buscarConEnter(beto)
    await act(async () => {
      pendiente.resolver(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await pendiente.promesa
    })
    await esperarUnMomento()

    expect(screen.queryByText(TEMPORAL)).not.toBeInTheDocument()
    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(campoBuscar())
  })

  it("la respuesta que llega tras una búsqueda rechazada en el cliente (ficha desmontada) no hace nada", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    await renderVista()
    await buscarConEnter(carla)
    fireEvent.click(boton("Restablecer contraseña"))
    fireEvent.click(boton("Sí, restablecer"))

    // ADMIN-01f (C-47, verificación del resumen de 01f): como en 10356bd, el admin vuelve al
    // "campo de búsqueda" (el enlace «Usuarios» de la barra) antes de la búsqueda rechazada.
    act(() => campoBuscar().focus())
    await abrirFichaRechazada()
    expect(screen.queryAllByText(carla.nombre)).toHaveLength(0)
    await act(async () => {
      pendiente.resolver(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await pendiente.promesa
    })
    await esperarUnMomento()

    expect(screen.queryByText(TEMPORAL)).not.toBeInTheDocument()
    expect(document.activeElement).toBe(campoBuscar())
  })

  it("la respuesta que llega con la vista ya desmontada no lanza ni escribe errores en la consola", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    const errorDeConsola = vi.spyOn(console, "error")
    const { unmount } = await renderVista()
    await buscarConEnter(carla)
    fireEvent.click(boton("Restablecer contraseña"))
    fireEvent.click(boton("Sí, restablecer"))

    unmount()
    await act(async () => {
      pendiente.resolver(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await pendiente.promesa
    })
    await esperarUnMomento()

    expect(errorDeConsola).not.toHaveBeenCalled()
    expect(document.body.textContent).not.toContain(TEMPORAL)
  })

  it("la temporal que llega mientras el admin escribe en 'Correo correcto' de la misma ficha no le roba el foco", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    await renderVista()
    await buscarConEnter(carla)
    fireEvent.click(boton("Restablecer contraseña"))
    const confirmar = boton("Sí, restablecer")
    act(() => confirmar.focus())
    fireEvent.click(confirmar)

    const correo = screen.getByLabelText("Correo correcto")
    act(() => correo.focus())
    fireEvent.change(correo, { target: { value: "carla.r" } })
    await act(async () => {
      pendiente.resolver(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await pendiente.promesa
    })
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(correo)
  })

  it("'Cancelar' con la petición en vuelo: la temporal aparece igual y el foco pasa de 'Restablecer contraseña' a 'Copiar'", async () => {
    const pendiente = diferida()
    const fetchMock = apiDeCuentas(() => pendiente.promesa)
    await renderVista()
    await buscarConEnter(carla)
    fireEvent.click(boton("Restablecer contraseña"))
    fireEvent.click(boton("Sí, restablecer"))
    fireEvent.click(boton("Cancelar"))
    expect(document.activeElement).toBe(boton("Restablecer contraseña"))

    await act(async () => {
      pendiente.resolver(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await pendiente.promesa
    })

    expect(await screen.findByText(TEMPORAL)).toBeVisible()
    await waitFor(() => expect(document.activeElement).toBe(boton("Copiar")))
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)
  })
})

describe("ataque (AUTH-02b r3): error del servidor tras confirmar (jsdom)", () => {
  it("tras un 500 el foco no queda en <body>, la alerta aparece y 'Cancelar' lo devuelve a 'Restablecer contraseña'", async () => {
    apiDeCuentas(() => errorJson(500, "ERROR_INTERNO"))
    await renderVista()
    await buscarConEnter(carla)
    fireEvent.click(boton("Restablecer contraseña"))
    const confirmar = boton("Sí, restablecer")
    act(() => confirmar.focus())
    fireEvent.click(confirmar)

    expect(await screen.findByRole("alert")).toBeVisible()
    await waitFor(() => expect(boton("Sí, restablecer")).toBeEnabled())
    // N-01 (DESIGN-01a): toBeEnabled ya no distingue un botón en espera; aria-disabled sí.
    await waitFor(() => expect(boton("Sí, restablecer")).not.toHaveAttribute("aria-disabled"))
    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).not.toBe(document.body)

    fireEvent.click(boton("Cancelar"))
    expect(document.activeElement).toBe(boton("Restablecer contraseña"))
    fireEvent.click(boton("Restablecer contraseña"))
    expect(document.activeElement).toBe(boton("Cancelar"))
  })
})

describe("ataque (AUTH-02b r3): sin fugas de estado entre cuentas", () => {
  it("con la confirmación abierta en Carla, la ficha de Beto empieza cerrada y el foco no salta a ella", async () => {
    apiDeCuentas()
    await renderVista()
    await buscarConEnter(carla)
    fireEvent.click(boton("Restablecer contraseña"))
    expect(boton("Sí, restablecer")).toBeVisible()

    await buscarConEnter(beto)
    await esperarUnMomento()

    expect(screen.queryByRole("button", { name: "Sí, restablecer" })).not.toBeInTheDocument()
    expect(boton("Restablecer contraseña")).toBeVisible()
    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(campoBuscar())
  })

  it("el error de Carla no aparece en la ficha de Beto", async () => {
    apiDeCuentas(() => errorJson(500, "ERROR_INTERNO"))
    await renderVista()
    await buscarConEnter(carla)
    fireEvent.click(boton("Restablecer contraseña"))
    fireEvent.click(boton("Sí, restablecer"))
    expect(await screen.findByRole("alert")).toBeVisible()

    await buscarConEnter(beto)

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("tras la temporal de Carla (con el foco en 'Copiar'), la ficha de Beto no la muestra y su confirmación enfoca su propio 'Cancelar'", async () => {
    const fetchMock = apiDeCuentas()
    await renderVista()
    await buscarConEnter(carla)
    fireEvent.click(boton("Restablecer contraseña"))
    const confirmar = boton("Sí, restablecer")
    act(() => confirmar.focus())
    fireEvent.click(confirmar)
    await screen.findByText(TEMPORAL)
    await waitFor(() => expect(document.activeElement).toBe(boton("Copiar")))

    await buscarConEnter(beto)
    await esperarUnMomento()
    expect(screen.queryByText(TEMPORAL)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Copiar" })).not.toBeInTheDocument()
    expect(document.activeElement).toBe(campoBuscar())

    const ficha = fichaDe(beto.nombre)
    fireEvent.click(within(ficha).getByRole("button", { name: "Restablecer contraseña" }))
    expect(document.activeElement).toBe(within(ficha).getByRole("button", { name: "Cancelar" }))
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)
  })
})

// T-12. Lo que hace un navegador Chromium con el botón deshabilitado que tiene el foco.
describe("ataque (AUTH-02b r3): en Chromium, 'Sí, restablecer' deshabilitado pierde el foco", () => {
  it("el admin confirma y no se mueve: al llegar la temporal, el foco llega a 'Copiar'", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    await renderVista()
    await buscarConEnter(carla)
    fireEvent.click(boton("Restablecer contraseña"))
    const confirmar = boton("Sí, restablecer")
    act(() => confirmar.focus())
    fireEvent.click(confirmar)
    await emularCorreccionDelFocoDeChromium(confirmar)

    await act(async () => {
      pendiente.resolver(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await pendiente.promesa
    })
    await screen.findByText(TEMPORAL)
    await esperarUnMomento()

    expect(
      document.activeElement,
      `el admin no movió el foco a ningún lado y la temporal lo dejó en ${describirFoco()}`,
    ).toBe(boton("Copiar"))
  })

  it("el admin confirma y el servidor responde 500: el foco no queda en <body>", async () => {
    const pendiente = diferida()
    apiDeCuentas(() => pendiente.promesa)
    await renderVista()
    await buscarConEnter(carla)
    fireEvent.click(boton("Restablecer contraseña"))
    const confirmar = boton("Sí, restablecer")
    act(() => confirmar.focus())
    fireEvent.click(confirmar)
    await emularCorreccionDelFocoDeChromium(confirmar)

    await act(async () => {
      pendiente.resolver(errorJson(500, "ERROR_INTERNO"))
      await pendiente.promesa
    })
    expect(await screen.findByRole("alert")).toBeVisible()
    await esperarUnMomento()

    expect(document.activeElement, `tras el error, el foco quedó en ${describirFoco()}`).not.toBe(
      document.body,
    )
  })
})
