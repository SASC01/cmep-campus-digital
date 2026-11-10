import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { MENSAJE_ERROR_ADMIN_GENERICO } from "./data"

// Tester, ronda 1 de CHORE-03 03c. La frase "No pudimos completar la operación. Inténtalo de nuevo." del
// MensajeError de cada control de admin, con el router real (rutas de app/router) y Providers
// (staleTime de 30 s): repetir el control; pulsar en la barra la sección en la que ya se está (otra
// location.key); ir a la otra sección y volver con la barra antes de 30 s; y atrás y adelante del
// historial. Al volver, el control no muestra el error viejo, y repetirlo manda una petición nueva que
// sale bien. Reloj fijo (solo Date). El servidor es un doble en memoria.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const GENERICO = MENSAJE_ERROR_ADMIN_GENERICO
const F3 = "   "

const USUARIO = {
  id: "1a1b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01",
  nombre: "Carla Ruiz",
  email: "carla@colegio.mx",
  rol: "maestro",
  activo: true,
} as const

const ENLACE = {
  id: "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02",
  creadoEn: "2030-01-02T15:00:00.000Z",
  expiraEn: "2030-01-19T15:00:00.000Z",
  revocadoEn: null,
  estado: "vigente",
  registrados: 0,
} as const

const RUTA_ENLACES = "/api/admin/enlaces-registro"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const f3 = () => respuestaJson(400, { error: { codigo: "VALIDACION", mensaje: F3 } })

interface Llamada {
  metodo: string
  ruta: string
}

// Por cada "MÉTODO ruta": cuántas veces falla con F3 antes de responder bien.
let fallosPendientes: Record<string, number> = {}
let llamadas: Llamada[] = []
let inesperadas: string[] = []

const exito = ({ metodo, ruta }: Llamada): Response | null => {
  if (ruta === "/api/me") {
    return respuestaJson(200, {
      id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
      nombre: "Admin",
      email: "admin@colegio.mx",
      rol: "admin",
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  if (metodo === "GET" && ruta === RUTA_ENLACES) {
    return respuestaJson(200, { enlaces: [ENLACE], siguienteCursor: null })
  }
  if (metodo === "POST" && ruta === "/api/admin/maestros") {
    return respuestaJson(201, { ...USUARIO, activo: false })
  }
  if (metodo === "POST" && ruta === "/api/admin/maestros/lote") {
    return respuestaJson(200, {
      enviadas: [{ email: "ana@colegio.mx", nombre: "Ana López" }],
      yaExistentes: [],
      invalidas: [],
    })
  }
  if (metodo === "POST" && ruta === RUTA_ENLACES) {
    return respuestaJson(201, { enlace: ENLACE, token: "t".repeat(43) })
  }
  // ADMIN-01f ronda 0 (C-15, §D-R0 01f): la búsqueda por correo de /admin sale; la tabla de
  // /admin/usuarios pide GET /api/admin/usuarios al montarse (sin q).
  if (metodo === "GET" && ruta === "/api/admin/usuarios") {
    return respuestaJson(200, {
      usuarios: [{ ...USUARIO, creadoEn: "2030-01-02T15:00:00.000Z" }],
      siguienteCursor: null,
      siguienteCursorNombre: null,
    })
  }
  if (metodo === "POST" && ruta === `${RUTA_ENLACES}/${ENLACE.id}/revocar`) {
    return respuestaJson(200, {
      enlace: { ...ENLACE, estado: "revocado", revocadoEn: AHORA.toISOString() },
    })
  }
  return null
}

beforeAll(async () => {
  await import("@/app/router")
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  fallosPendientes = {}
  llamadas = []
  inesperadas = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const llamada = {
        metodo: init?.method ?? "GET",
        ruta: new URL(String(entrada), "http://local").pathname,
      }
      llamadas.push(llamada)
      const clave = `${llamada.metodo} ${llamada.ruta}`
      const pendientes = fallosPendientes[clave] ?? 0
      if (pendientes > 0) {
        fallosPendientes[clave] = pendientes - 1
        return Promise.resolve(f3())
      }
      const respuesta = exito(llamada)
      if (respuesta !== null) return Promise.resolve(respuesta)
      inesperadas.push(clave)
      return Promise.resolve(
        respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } }),
      )
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const peticionesA = (metodo: string, ruta: string) =>
  llamadas.filter((l) => l.metodo === metodo && l.ruta === ruta).length

const montarEn = async (ruta: string) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return router
}

// ADMIN-01f ronda 0 (C-15, §D-R0 01f y §D-11): la sección "Cuentas" (/admin) pasa a "Usuarios"
// (/admin/usuarios); "Invitar maestro" vive en /admin/maestros y la búsqueda de una cuenta pasa a la
// tabla de usuarios (bloque nuevo al final, con el error de carga de la tabla y sus caminos). Lo que
// protege cada caso no cambia.
const enLaBarra = async (seccion: "Usuarios" | "Maestros") => {
  const nav = await screen.findByRole("navigation", { name: "Navegación principal" })
  fireEvent.click(within(nav).getByRole("link", { name: seccion }))
  await reposar()
}

const adelantar = (ms: number) => vi.setSystemTime(new Date(Date.now() + ms))

interface Control {
  ruta: "/admin/usuarios" | "/admin/maestros"
  otra: "Usuarios" | "Maestros"
  propia: "Usuarios" | "Maestros"
  metodo: string
  api: string
  boton: string | RegExp
  // Lo que la persona hace hasta disparar la petición.
  disparar: () => Promise<void>
  // Lo que se ve cuando sale bien.
  exitoVisible: () => Promise<void>
}

const llenar = (etiqueta: string, valor: string) => {
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
}

const CONTROLES: Readonly<Record<string, Control>> = {
  "invitar maestro": {
    ruta: "/admin/maestros",
    otra: "Usuarios",
    propia: "Maestros",
    metodo: "POST",
    api: "/api/admin/maestros",
    boton: "Enviar invitación",
    disparar: async () => {
      await screen.findByRole("button", { name: "Enviar invitación" })
      llenar("Nombre completo", "Carla Ruiz")
      llenar("Correo", "carla@colegio.mx")
      fireEvent.click(screen.getByRole("button", { name: "Enviar invitación" }))
    },
    exitoVisible: async () => {
      expect(await screen.findByText(/^Invitación creada\./)).toBeInTheDocument()
    },
  },
  "invitación masiva": {
    ruta: "/admin/maestros",
    otra: "Usuarios",
    propia: "Maestros",
    metodo: "POST",
    api: "/api/admin/maestros/lote",
    boton: "Enviar invitaciones",
    disparar: async () => {
      await screen.findByRole("button", { name: "Enviar invitaciones" })
      llenar("Lista de maestros", "ana@colegio.mx, Ana López")
      fireEvent.click(screen.getByRole("button", { name: "Enviar invitaciones" }))
    },
    exitoVisible: async () => {
      expect(await screen.findByText(/^Invitaciones enviadas: 1/)).toBeInTheDocument()
    },
  },
  "generar enlace": {
    ruta: "/admin/maestros",
    otra: "Usuarios",
    propia: "Maestros",
    metodo: "POST",
    api: RUTA_ENLACES,
    boton: "Generar enlace",
    disparar: async () => {
      await screen.findByRole("button", { name: "Generar enlace" })
      llenar("Vigencia en días", "10")
      fireEvent.click(screen.getByRole("button", { name: "Generar enlace" }))
    },
    exitoVisible: async () => {
      expect(await screen.findByRole("button", { name: "Copiar enlace" })).toBeInTheDocument()
    },
  },
  "revocar un enlace": {
    ruta: "/admin/maestros",
    otra: "Usuarios",
    propia: "Maestros",
    metodo: "POST",
    api: `${RUTA_ENLACES}/${ENLACE.id}/revocar`,
    boton: /^Sí, revocar/,
    disparar: async () => {
      fireEvent.click(await screen.findByRole("button", { name: /^Revocar/ }))
      fireEvent.click(await screen.findByRole("button", { name: /^Sí, revocar/ }))
    },
    exitoVisible: async () => {
      await waitFor(() => expect(screen.queryByRole("button", { name: /^Sí, revocar/ })).toBeNull())
    },
  },
}

const NOMBRES = Object.keys(CONTROLES).map((nombre) => [nombre] as const)

const controlDe = (nombre: string): Control => {
  const control = CONTROLES[nombre]
  if (control === undefined) throw new Error(`Precondición: existe el control ${nombre}`)
  return control
}

// Monta la sección del control y deja su MensajeError con el genérico (F3).
const conElError = async (control: Control) => {
  fallosPendientes = { [`${control.metodo} ${control.api}`]: 1 }
  const router = await montarEn(control.ruta)
  await control.disparar()
  const alerta = await screen.findByRole("alert")
  expect(alerta).toHaveTextContent(GENERICO)
  await reposar()
  expect(peticionesA(control.metodo, control.api)).toBe(1)
  return router
}

// El cierre común: sin el error, el control manda una petición nueva que sale bien.
const repetirYQueSalgaBien = async (control: Control, esperadas: number) => {
  await control.disparar()
  await waitFor(() => expect(peticionesA(control.metodo, control.api)).toBe(esperadas))
  await control.exitoVisible()
  await reposar()
  expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
  expect(screen.queryAllByRole("alert")).toHaveLength(0)
  expect(aviso.error).not.toHaveBeenCalled()
  expect(inesperadas).toEqual([])
}

describe("ataque CHORE-03 03c r1 · «Inténtalo de nuevo» en admin por cada camino (rutas y Providers)", () => {
  it.each(NOMBRES)("%s: repetir el control quita el error y sale bien", async (nombre) => {
    const control = controlDe(nombre)
    await conElError(control)

    const boton = screen.getByRole("button", { name: control.boton })
    fireEvent.click(boton)
    await waitFor(() => expect(peticionesA(control.metodo, control.api)).toBe(2))
    await control.exitoVisible()
    await reposar()
    expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
    expect(inesperadas).toEqual([])
  })

  it.each(NOMBRES)(
    "%s: pulsar en la barra la sección en la que ya se está y repetir el control lo quita",
    async (nombre) => {
      const control = controlDe(nombre)
      const router = await conElError(control)
      const claveAntes = router.state.location.key

      await enLaBarra(control.propia)

      expect(router.state.location.pathname).toBe(control.ruta)
      expect(router.state.location.key).not.toBe(claveAntes)
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      fireEvent.click(screen.getByRole("button", { name: control.boton }))
      await waitFor(() => expect(peticionesA(control.metodo, control.api)).toBe(2))
      await control.exitoVisible()
      await reposar()
      expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
      expect(inesperadas).toEqual([])
    },
  )

  it.each(NOMBRES)(
    "%s: ir a la otra sección y volver con la barra antes de 30 s: sin el error, y el control sale bien",
    async (nombre) => {
      const control = controlDe(nombre)
      const router = await conElError(control)

      await enLaBarra(control.otra)
      await waitFor(() => expect(router.state.location.pathname).not.toBe(control.ruta))
      adelantar(10_000)
      await enLaBarra(control.propia)
      await waitFor(() => expect(router.state.location.pathname).toBe(control.ruta))
      await reposar()

      expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
      await repetirYQueSalgaBien(control, 2)
    },
  )

  it.each(NOMBRES)(
    "%s: atrás y adelante del historial antes de 30 s: sin el error, y el control sale bien",
    async (nombre) => {
      const control = controlDe(nombre)
      const router = await conElError(control)

      await enLaBarra(control.otra)
      await waitFor(() => expect(router.state.location.pathname).not.toBe(control.ruta))
      const otraRuta = router.state.location.pathname
      for (const [paso, destino] of [
        [-1, control.ruta],
        [1, otraRuta],
        [-1, control.ruta],
      ] as const) {
        adelantar(3_000)
        await act(async () => {
          await router.navigate(paso)
        })
        await waitFor(() => expect(router.state.location.pathname).toBe(destino))
        await reposar()
        expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
      }

      await repetirYQueSalgaBien(control, 2)
    },
  )
})

// ADMIN-01f ronda 0 (C-15): la búsqueda de una cuenta pasa a la tabla de /admin/usuarios. La tabla
// no tiene «Reintentar» (§D-11, Enmienda 1): su error de carga se recupera por los caminos de la
// barra y del historial (ADM-1F17), y nunca muestra el texto del servidor ni el genérico de las
// acciones. Con el F3 (VALIDACION en blanco) en la primera carga, cada camino vuelve a pedir y, con
// 200, el texto desaparece y la cuenta se ve.
describe("ataque CHORE-03 03c r1 · ADMIN-01f: el error de carga de la tabla de usuarios por cada camino", () => {
  const ERROR_TABLA = "No pudimos cargar los usuarios. Revisa tu conexión e inténtalo de nuevo."
  const API = "/api/admin/usuarios"

  const conLaTablaEnError = async () => {
    fallosPendientes = { [`GET ${API}`]: 1 }
    const router = await montarEn("/admin/usuarios")
    expect(await screen.findByText(ERROR_TABLA)).toBeInTheDocument()
    await reposar()
    expect(peticionesA("GET", API)).toBe(1)
    expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
    return router
  }

  const seRecupera = async (peticiones: number) => {
    await waitFor(() => expect(peticionesA("GET", API)).toBeGreaterThanOrEqual(peticiones))
    expect(await screen.findByText(USUARIO.nombre)).toBeInTheDocument()
    await reposar()
    expect(screen.queryByText(ERROR_TABLA)).not.toBeInTheDocument()
    expect(screen.queryAllByRole("alert")).toHaveLength(0)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(inesperadas).toEqual([])
  }

  it("pulsar «Usuarios» estando en la tabla vuelve a pedir y quita el error", async () => {
    const router = await conLaTablaEnError()
    const claveAntes = router.state.location.key
    await enLaBarra("Usuarios")
    expect(router.state.location.pathname).toBe("/admin/usuarios")
    expect(router.state.location.key).not.toBe(claveAntes)
    await seRecupera(2)
  })

  it("ir a «Maestros» y volver con la barra antes de 30 s vuelve a pedir y quita el error", async () => {
    const router = await conLaTablaEnError()
    await enLaBarra("Maestros")
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin/maestros"))
    adelantar(10_000)
    await enLaBarra("Usuarios")
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin/usuarios"))
    await seRecupera(2)
  })

  it("atrás y adelante del historial antes de 30 s: sin el error y con la cuenta", async () => {
    const router = await conLaTablaEnError()
    await enLaBarra("Maestros")
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin/maestros"))
    for (const [paso, destino] of [
      [-1, "/admin/usuarios"],
      [1, "/admin/maestros"],
      [-1, "/admin/usuarios"],
    ] as const) {
      adelantar(3_000)
      await act(async () => {
        await router.navigate(paso)
      })
      await waitFor(() => expect(router.state.location.pathname).toBe(destino))
      await reposar()
    }
    await seRecupera(2)
  })
})
