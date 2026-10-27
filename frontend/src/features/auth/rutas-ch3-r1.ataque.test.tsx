import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { limpiarToken } from "@/services/tokenAcceso"

import { MENSAJE_ERROR_AUTH_GENERICO } from "./data"

// Tester, ronda 1 de CHORE-03 03c. La frase "No pudimos completar la operación. Inténtalo de nuevo." del
// MensajeError de los formularios de auth, con el router real (rutas de app/router) y Providers:
// repetir el control; ir a otra pantalla pública con sus enlaces y volver antes de 30 s; y atrás y
// adelante del historial. Al volver, el formulario no muestra el error viejo, y repetirlo manda una
// petición nueva que sale bien. Reloj fijo (solo Date). El servidor es un doble en memoria.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/login") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const GENERICO = MENSAJE_ERROR_AUTH_GENERICO
const TOKEN = "C".repeat(43)
const CLAVE = "clave-secreta-1234"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

interface Llamada {
  metodo: string
  ruta: string
}

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
  if (metodo !== "POST") return null
  if (["/api/auth/login", "/api/auth/registro"].includes(ruta)) {
    return respuestaJson(200, { tokenAcceso: "token-nuevo" })
  }
  if (["/api/auth/recuperar", "/api/auth/restablecer"].includes(ruta)) {
    return new Response(null, { status: 204 })
  }
  return null
}

beforeAll(async () => {
  await import("@/app/router")
}, 30_000)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  limpiarToken()
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
        return Promise.resolve(
          respuestaJson(400, { error: { codigo: "VALIDACION", mensaje: "   " } }),
        )
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

const peticionesA = (ruta: string) =>
  llamadas.filter((l) => l.metodo === "POST" && l.ruta === ruta).length

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

const llenar = (etiqueta: string, valor: string) => {
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
}

const adelantar = (ms: number) => vi.setSystemTime(new Date(Date.now() + ms))

interface Formulario {
  ruta: string
  api: string
  boton: string
  // Un enlace de la pantalla que lleva a otra pública, y el de esa que regresa.
  irse: string
  regresar: string
  llenarYEnviar: () => Promise<void>
  exitoVisible: (router: Awaited<ReturnType<typeof montarEn>>) => Promise<void>
}

const enviar = (boton: string) => fireEvent.click(screen.getByRole("button", { name: boton }))

const FORMULARIOS: Readonly<Record<string, Formulario>> = {
  "iniciar sesión": {
    ruta: "/login",
    api: "/api/auth/login",
    boton: "Iniciar sesión",
    irse: "¿Olvidaste tu contraseña?",
    regresar: "Volver a iniciar sesión",
    llenarYEnviar: async () => {
      await screen.findByRole("button", { name: "Iniciar sesión" })
      llenar("Correo", "admin@colegio.mx")
      llenar("Contraseña", CLAVE)
      enviar("Iniciar sesión")
    },
    exitoVisible: async (router) => {
      await waitFor(() => expect(router.state.location.pathname).toBe("/admin"))
    },
  },
  "registro de estudiante": {
    ruta: "/registro",
    api: "/api/auth/registro",
    boton: "Crear cuenta",
    irse: "¿Ya tienes cuenta? Inicia sesión",
    regresar: "Regístrate como estudiante",
    llenarYEnviar: async () => {
      await screen.findByRole("button", { name: "Crear cuenta" })
      llenar("Nombre completo", "Ana López")
      llenar("Correo", "ana@colegio.mx")
      llenar("Contraseña", CLAVE)
      enviar("Crear cuenta")
    },
    exitoVisible: async (router) => {
      await waitFor(() => expect(router.state.location.pathname).toBe("/admin"))
    },
  },
  "recuperar contraseña": {
    ruta: "/recuperar",
    api: "/api/auth/recuperar",
    boton: "Enviar enlace",
    irse: "Volver a iniciar sesión",
    regresar: "¿Olvidaste tu contraseña?",
    llenarYEnviar: async () => {
      await screen.findByRole("button", { name: "Enviar enlace" })
      llenar("Correo", "ana@colegio.mx")
      enviar("Enviar enlace")
    },
    exitoVisible: async () => {
      expect(await screen.findByRole("status")).toHaveTextContent(/^Si hay una cuenta/)
    },
  },
}

const NOMBRES = Object.keys(FORMULARIOS).map((nombre) => [nombre] as const)

const formularioDe = (nombre: string): Formulario => {
  const formulario = FORMULARIOS[nombre]
  if (formulario === undefined) throw new Error(`Precondición: existe el formulario ${nombre}`)
  return formulario
}

const conElError = async (formulario: Formulario) => {
  fallosPendientes = { [`POST ${formulario.api}`]: 1 }
  const router = await montarEn(formulario.ruta)
  await formulario.llenarYEnviar()
  expect(await screen.findByRole("alert")).toHaveTextContent(GENERICO)
  await reposar()
  expect(peticionesA(formulario.api)).toBe(1)
  return router
}

const repetirYQueSalgaBien = async (
  formulario: Formulario,
  router: Awaited<ReturnType<typeof montarEn>>,
) => {
  expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
  await formulario.llenarYEnviar()
  await waitFor(() => expect(peticionesA(formulario.api)).toBe(2))
  await formulario.exitoVisible(router)
  await reposar()
  expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
  expect(inesperadas).toEqual([])
}

describe("ataque CHORE-03 03c r1 · «Inténtalo de nuevo» en auth por cada camino (rutas y Providers)", () => {
  it.each(NOMBRES)("%s: repetir el control quita el error y sale bien", async (nombre) => {
    const formulario = formularioDe(nombre)
    const router = await conElError(formulario)

    enviar(formulario.boton)
    await waitFor(() => expect(peticionesA(formulario.api)).toBe(2))
    await formulario.exitoVisible(router)
    await reposar()
    expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
    expect(inesperadas).toEqual([])
  })

  it.each(NOMBRES)(
    "%s: ir a otra pantalla con su enlace y regresar con el de esa antes de 30 s: sin el error, y sale bien",
    async (nombre) => {
      const formulario = formularioDe(nombre)
      const router = await conElError(formulario)

      fireEvent.click(screen.getByRole("link", { name: formulario.irse }))
      await waitFor(() => expect(router.state.location.pathname).not.toBe(formulario.ruta))
      adelantar(10_000)
      fireEvent.click(await screen.findByRole("link", { name: formulario.regresar }))
      await waitFor(() => expect(router.state.location.pathname).toBe(formulario.ruta))
      await reposar()

      await repetirYQueSalgaBien(formulario, router)
    },
  )

  it.each(NOMBRES)(
    "%s: atrás y adelante del historial antes de 30 s: sin el error, y sale bien",
    async (nombre) => {
      const formulario = formularioDe(nombre)
      const router = await conElError(formulario)

      fireEvent.click(screen.getByRole("link", { name: formulario.irse }))
      await waitFor(() => expect(router.state.location.pathname).not.toBe(formulario.ruta))
      const otra = router.state.location.pathname
      for (const [paso, destino] of [
        [-1, formulario.ruta],
        [1, otra],
        [-1, formulario.ruta],
      ] as const) {
        adelantar(3_000)
        await act(async () => {
          await router.navigate(paso)
        })
        await waitFor(() => expect(router.state.location.pathname).toBe(destino))
        await reposar()
        expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
      }

      await repetirYQueSalgaBien(formulario, router)
    },
  )

  it("restablecer contraseña con el enlace: repetir tras el genérico manda un POST nuevo y lleva a /login con su aviso", async () => {
    fallosPendientes = { "POST /api/auth/restablecer": 1 }
    const router = await montarEn(`/restablecer#token=${TOKEN}`)
    await screen.findByRole("button", { name: "Guardar contraseña" })
    llenar("Contraseña nueva", CLAVE)
    llenar("Confirma la contraseña nueva", CLAVE)
    enviar("Guardar contraseña")
    expect(await screen.findByRole("alert")).toHaveTextContent(GENERICO)
    await reposar()
    expect(router.state.location.hash).toBe("")

    enviar("Guardar contraseña")

    await waitFor(() => expect(peticionesA("/api/auth/restablecer")).toBe(2))
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(
      await screen.findByText("Tu contraseña se actualizó. Inicia sesión con la nueva."),
    ).toBeInTheDocument()
    expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
    expect(inesperadas).toEqual([])
  })
})
