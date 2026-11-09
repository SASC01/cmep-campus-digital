import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Ataques del Tester (AUTH-02b, ronda 2) contra las correcciones de T-03 (guarda con useRef),
// T-04 y T-05 (estados cruzados entre búsqueda, corrección y restablecimiento) y T-07 (foco con
// autoFocus en "Sí, restablecer" y en "Copiar").

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
const CORREO_CORREGIDO = "carla.ruiz@ejemplo.mx"

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

// Respuesta que la prueba resuelve cuando quiere: sirve para dejar una petición "en vuelo".
const diferida = () => {
  let resolver: (respuesta: Response) => void = () => {
    throw new Error("la respuesta diferida se resolvió antes de crearse")
  }
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver: (respuesta: Response) => resolver(respuesta) }
}

interface ApiDeCuentas {
  restablecer?: () => Response | Promise<Response>
  corregir?: (init?: RequestInit) => Response | Promise<Response>
}

const apiDeCuentas = ({ restablecer, corregir }: ApiDeCuentas = {}) =>
  stubFetch((ruta, init) => {
    if (ruta.endsWith("/restablecer-contrasena")) {
      if (restablecer) return restablecer()
      return respuestaJson(200, { contrasenaTemporal: TEMPORAL })
    }
    if (ruta.endsWith("/correo")) {
      if (corregir) return corregir(init)
      return respuestaJson(200, { ...carla, email: CORREO_CORREGIDO })
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

// La ficha de una cuenta: su región con nombre (E-24). Sin clases de estilo.
const fichaDe = (nombre: string): HTMLElement => screen.getByRole("region", { name: nombre })

const corregirCorreo = (correo: string) => {
  fireEvent.change(screen.getByLabelText("Correo correcto"), { target: { value: correo } })
  fireEvent.click(screen.getByRole("button", { name: "Guardar correo" }))
}

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 30)))

// jsdom no ejecuta la acción por defecto de una tecla: en un navegador, Enter sobre un botón con el
// foco dispara su "click" (comportamiento de activación del HTML). Se emula así, sobre lo que tenga
// el foco en ese momento.
const pulsarEnter = () => {
  const conFoco = document.activeElement
  if (!(conFoco instanceof HTMLElement) || conFoco === document.body) {
    throw new Error("no hay ningún control con el foco al pulsar Enter")
  }
  fireEvent.click(conFoco)
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
  Reflect.deleteProperty(window.navigator, "clipboard")
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque (AUTH-02b r2): la guarda de T-03 se libera y no deja pasar un segundo envío", () => {
  it("tras un 500 al restablecer, 'Sí, restablecer' vuelve a funcionar y el reintento muestra la temporal", async () => {
    let intentos = 0
    const fetchMock = apiDeCuentas({
      restablecer: () => {
        intentos += 1
        if (intentos === 1) return errorJson(500, "ERROR_INTERNO")
        return respuestaJson(200, { contrasenaTemporal: TEMPORAL })
      },
    })
    await renderVista()
    await abrirFicha(carla)
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))
    expect(await screen.findByRole("alert")).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))

    expect(
      await screen.findByText(TEMPORAL),
      "la guarda quedó tomada tras el error y el reintento no salió",
    ).toBeVisible()
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(2)
  })

  it("tras un fallo de red al restablecer, el reintento sale y muestra la temporal", async () => {
    let intentos = 0
    const fetchMock = stubFetch(() => {
      intentos += 1
      if (intentos === 1) throw new TypeError("Failed to fetch")
      return respuestaJson(200, { contrasenaTemporal: TEMPORAL })
    })
    await renderVista()
    await abrirFicha(carla)
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))
    expect(await screen.findByRole("alert")).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))

    expect(await screen.findByText(TEMPORAL)).toBeVisible()
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(2)
  })

  it("con la primera petición en vuelo, 'Cancelar' y volver a confirmar no manda una segunda", async () => {
    const pendiente = diferida()
    const fetchMock = apiDeCuentas({ restablecer: () => pendiente.promesa })
    await renderVista()
    await abrirFicha(carla)
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))
    await esperarUnMomento()
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)

    await act(async () => {
      pendiente.resolver(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await pendiente.promesa
    })
    expect(await screen.findByText(TEMPORAL)).toBeVisible()
    expect(llamadasQueContienen(fetchMock, "/restablecer-contrasena")).toBe(1)
  })
})

describe("ataque (AUTH-02b r2): sin estados cruzados entre cuentas", () => {
  it("la temporal de Carla que llega después de buscar a Beto no aparece en la ficha de Beto", async () => {
    const pendiente = diferida()
    apiDeCuentas({ restablecer: () => pendiente.promesa })
    await renderVista()
    await abrirFicha(carla)
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))

    await abrirFicha(beto)
    await act(async () => {
      pendiente.resolver(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await pendiente.promesa
    })
    await esperarUnMomento()

    expect(fichaDe(beto.nombre)).toBeVisible()
    expect(
      screen.queryByText(TEMPORAL),
      "la temporal de Carla apareció en la ficha de Beto",
    ).not.toBeInTheDocument()
  })

  it("una corrección de Carla que termina después de buscar a Beto no cambia la ficha de Beto", async () => {
    const pendiente = diferida()
    apiDeCuentas({ corregir: () => pendiente.promesa })
    await renderVista()
    await abrirFicha(carla)
    corregirCorreo(CORREO_CORREGIDO)

    await abrirFicha(beto)
    await act(async () => {
      pendiente.resolver(respuestaJson(200, { ...carla, email: CORREO_CORREGIDO }))
      await pendiente.promesa
    })
    await esperarUnMomento()

    expect(fichaDe(beto.nombre)).toBeVisible()
    expect(screen.getAllByText(beto.email)[0]).toBeVisible()
    expect(screen.queryAllByText(carla.nombre)).toHaveLength(0)
    expect(screen.queryByText(CORREO_CORREGIDO)).not.toBeInTheDocument()
  })

  it("tras corregir el correo de Carla, buscar a Beto muestra los datos de Beto y no los de Carla", async () => {
    apiDeCuentas()
    await renderVista()
    await abrirFicha(carla)
    corregirCorreo(CORREO_CORREGIDO)
    await screen.findAllByText(CORREO_CORREGIDO)

    await abrirFicha(beto)

    expect(screen.getAllByText(beto.email)[0]).toBeVisible()
    expect(screen.queryByText(CORREO_CORREGIDO)).not.toBeInTheDocument()
    expect(screen.queryByText(/Correo actualizado/)).not.toBeInTheDocument()
  })

  it("tras corregir, una búsqueda rechazada en el cliente no deja la ficha corregida en pantalla", async () => {
    const fetchMock = apiDeCuentas()
    await renderVista()
    await abrirFicha(carla)
    corregirCorreo(CORREO_CORREGIDO)
    await screen.findAllByText(CORREO_CORREGIDO)
    const busquedas = llamadasQueContienen(fetchMock, "/correo")

    await abrirFichaRechazada()

    expect(llamadasQueContienen(fetchMock, "/correo")).toBe(busquedas)
    expect(screen.queryAllByText(carla.nombre)).toHaveLength(0)
    expect(screen.queryByText(CORREO_CORREGIDO)).not.toBeInTheDocument()
  })

  it("la temporal ya visible sigue en la ficha de Carla al corregir su correo, y con el correo nuevo", async () => {
    apiDeCuentas()
    await renderVista()
    await abrirFicha(carla)
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))
    await screen.findByText(TEMPORAL)

    corregirCorreo(CORREO_CORREGIDO)
    await screen.findAllByText(CORREO_CORREGIDO)

    const ficha = fichaDe(carla.nombre)
    expect(within(ficha).getByText(TEMPORAL)).toBeVisible()
    expect(within(ficha).queryByText(carla.email)).not.toBeInTheDocument()
  })
})

describe("ataque (AUTH-02b r2): foco tras la corrección de T-07", () => {
  it("Enter dos veces sobre 'Restablecer contraseña' no restablece sin que el admin confirme", async () => {
    const fetchMock = apiDeCuentas()
    await renderVista()
    await abrirFicha(carla)
    screen.getByRole("button", { name: "Restablecer contraseña" }).focus()

    pulsarEnter()
    const conFocoTrasPedirConfirmacion = document.activeElement?.textContent
    pulsarEnter()
    await esperarUnMomento()

    expect(
      llamadasQueContienen(fetchMock, "/restablecer-contrasena"),
      `un segundo Enter (o la repetición de la tecla) confirmó el restablecimiento; tras el primero el foco estaba en "${conFocoTrasPedirConfirmacion ?? ""}"`,
    ).toBe(0)
    expect(screen.queryByText(TEMPORAL)).not.toBeInTheDocument()
  })

  it("'Cancelar' no deja el foco en <body>", async () => {
    apiDeCuentas()
    await renderVista()
    await abrirFicha(carla)
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    const cancelar = screen.getByRole("button", { name: "Cancelar" })
    cancelar.focus()
    expect(document.activeElement).toBe(cancelar)

    fireEvent.click(cancelar)

    expect(screen.getByRole("button", { name: "Restablecer contraseña" })).toBeVisible()
    expect(document.activeElement, "'Cancelar' desapareció y el foco quedó en <body>").not.toBe(
      document.body,
    )
  })

  it("la temporal que llega mientras el admin escribe en otro campo no le roba el foco", async () => {
    const pendiente = diferida()
    apiDeCuentas({ restablecer: () => pendiente.promesa })
    await renderVista()
    await abrirFicha(carla)
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))

    const nombreMaestro = screen.getByLabelText("Correo correcto")
    nombreMaestro.focus()
    fireEvent.change(nombreMaestro, { target: { value: "Dora" } })
    expect(document.activeElement).toBe(nombreMaestro)

    await act(async () => {
      pendiente.resolver(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
      await pendiente.promesa
    })
    await screen.findByText(TEMPORAL)

    expect(
      document.activeElement,
      "la temporal movió el foco a 'Copiar' mientras el admin escribía en otro formulario",
    ).toBe(nombreMaestro)
  })

  it("cuando el admin sigue en la confirmación, el foco llega a 'Copiar' (no a <body>)", async () => {
    apiDeCuentas()
    await renderVista()
    await abrirFicha(carla)
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    const confirmar = screen.getByRole("button", { name: "Sí, restablecer" })
    confirmar.focus()
    fireEvent.click(confirmar)
    await screen.findByText(TEMPORAL)

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Copiar" })),
    )
  })
})
