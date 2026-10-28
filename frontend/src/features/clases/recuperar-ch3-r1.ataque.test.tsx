import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { TEXTOS_CLASE, TEXTOS_TEMAS, TEXTOS_TRABAJO } from "./data"

// Tester, ronda 1 de CHORE-03 03b (O-14 del manager). La frase "Algo salió mal. Inténtalo de nuevo." en
// el ErrorDeCampo del formulario de tema de "Trabajo de clase" (F2: "nombre:" sin texto visible) por los
// caminos que CH3-B10 no recorre, con el router real (rutas de app/router) y Providers (staleTime real):
// pulsar «Trabajo de clase» en la barra de secciones estando en ella (el formulario no se desmonta:
// conserva lo escrito y su error, como dice S-06, y repetir el envío lo quita); ir al muro y volver con
// la barra; y atrás y adelante del historial. En cada camino, al final no queda el error y "Crear tema"
// manda un POST nuevo que sale bien. Reloj fijo (solo Date). El servidor es un doble en memoria.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TEMA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d31"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const RUTA_CLASE = `/api/clases/${CLASE_ID}`
const TRABAJO = `/maestro/clases/${CLASE_ID}/trabajo`
const MURO = `/maestro/clases/${CLASE_ID}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

interface Llamada {
  metodo: string
  url: string
}

let temas: { id: string; nombre: string; orden: number; elementos: number }[] = []
let primerPostFalla = true
let llamadas: Llamada[] = []
let inesperadas: string[] = []

const responder = ({ metodo, url }: Llamada): Response | null => {
  const { pathname } = new URL(url, "http://local")
  if (pathname === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "restaurado" })
  if (pathname === "/api/me") {
    return respuestaJson(200, {
      id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
      nombre: "Luis Pérez",
      email: "luis@ejemplo.mx",
      rol: "maestro",
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  if (metodo === "GET" && pathname === "/api/clases/impartidas") {
    return respuestaJson(200, {
      clases: [{ id: CLASE_ID, nombre: "Álgebra I", alumnos: 3 }],
      total: 1,
      siguienteCursor: null,
    })
  }
  if (metodo === "GET" && pathname === RUTA_CLASE) {
    return respuestaJson(200, {
      clase: {
        id: CLASE_ID,
        nombre: "Álgebra I",
        descripcion: null,
        maestro: MAESTRO,
        maestros: [MAESTRO],
      },
    })
  }
  if (metodo === "GET" && pathname === `${RUTA_CLASE}/codigo`) {
    return respuestaJson(200, { codigo: "ABCD234" })
  }
  if (metodo === "GET" && pathname === `${RUTA_CLASE}/temas`) {
    return respuestaJson(200, { temas, sinTema: 0 })
  }
  if (metodo === "GET" && pathname === `${RUTA_CLASE}/trabajo`) {
    return respuestaJson(200, { elementos: [], siguienteCursor: null })
  }
  if (metodo === "GET" && pathname === `${RUTA_CLASE}/publicaciones`) {
    return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
  }
  if (metodo === "POST" && pathname === `${RUTA_CLASE}/temas`) {
    if (primerPostFalla) {
      primerPostFalla = false
      return respuestaJson(400, { error: { codigo: "VALIDACION", mensaje: "nombre:\u{200B}" } })
    }
    temas = [{ id: TEMA_ID, nombre: "Unidad 1", orden: 0, elementos: 0 }]
    return respuestaJson(201, { tema: { id: TEMA_ID, nombre: "Unidad 1", orden: 0, elementos: 0 } })
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
  temas = []
  primerPostFalla = true
  llamadas = []
  inesperadas = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const llamada = { metodo: init?.method ?? "GET", url: String(entrada) }
      llamadas.push(llamada)
      const respuesta = responder(llamada)
      if (respuesta !== null) return Promise.resolve(respuesta)
      inesperadas.push(`${llamada.metodo} ${llamada.url}`)
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

const esCrearTema = (llamada: Llamada) =>
  llamada.metodo === "POST" &&
  new URL(llamada.url, "http://local").pathname === `${RUTA_CLASE}/temas`

const avisos = () => aviso.error.mock.calls.map((llamada) => String(llamada[0]))
const exitos = () => aviso.success.mock.calls.map((llamada) => String(llamada[0]))
const campoNombre = () => screen.getByLabelText(TEXTOS_TEMAS.campoNombre)

// Monta la app en "Trabajo de clase" y deja el genérico bajo el nombre del tema (F2), sin aviso.
const conElErrorEnElTema = async () => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [TRABAJO] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  fireEvent.click(await screen.findByRole("button", { name: TEXTOS_TRABAJO.nuevoTema }))
  fireEvent.change(campoNombre(), { target: { value: "Unidad 1" } })
  fireEvent.click(screen.getByRole("button", { name: TEXTOS_TEMAS.crear }))
  await waitFor(() => expect(campoNombre()).toHaveAccessibleDescription(GENERICO))
  await reposar()
  expect(avisos()).toEqual([])
  expect(llamadas.filter(esCrearTema)).toHaveLength(1)
  return router
}

const enLaBarra = async (seccion: string) => {
  const secciones = await screen.findByRole("list", { name: TEXTOS_CLASE.secciones })
  fireEvent.click(within(secciones).getByRole("link", { name: new RegExp(`^${seccion}`) }))
  await reposar()
}

// El cierre común de los tres caminos: sin el error, "Crear tema" (abriendo el formulario si se cerró)
// manda un POST nuevo, sale bien y no queda ningún aviso ni error.
const repetirYQueSalgaBien = async () => {
  expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
  const abierto = screen.queryByLabelText(TEXTOS_TEMAS.campoNombre)
  expect(abierto, "el formulario de tema quedó abierto tras el camino").toBeNull()
  fireEvent.click(await screen.findByRole("button", { name: TEXTOS_TRABAJO.nuevoTema }))
  fireEvent.change(campoNombre(), { target: { value: "Unidad 1" } })
  fireEvent.click(screen.getByRole("button", { name: TEXTOS_TEMAS.crear }))
  await waitFor(() => expect(llamadas.filter(esCrearTema)).toHaveLength(2))
  await waitFor(() => expect(exitos()).toEqual([TEXTOS_TEMAS.avisoCreado]))
  await reposar()
  expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
  expect(avisos()).toEqual([])
  expect(inesperadas).toEqual([])
}

describe("ataque CHORE-03 03b r1 · la frase genérica del tema por los caminos de O-14 (rutas y Providers)", () => {
  it("pulsar «Trabajo de clase» en la barra estando en ella (otra location.key): el formulario conserva lo escrito y su error (S-06), y repetir «Crear tema» manda un POST nuevo que lo quita", async () => {
    const router = await conElErrorEnElTema()
    const claveAntes = router.state.location.key

    await enLaBarra(TEXTOS_CLASE.trabajo)

    expect(router.state.location.pathname).toBe(TRABAJO)
    expect(router.state.location.key).not.toBe(claveAntes)
    expect(campoNombre()).toHaveValue("Unidad 1")
    expect(campoNombre()).toHaveAccessibleDescription(GENERICO)
    expect(screen.getAllByText(GENERICO)).toHaveLength(1)
    expect(avisos()).toEqual([])
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_TEMAS.crear }))
    await waitFor(() => expect(llamadas.filter(esCrearTema)).toHaveLength(2))
    await waitFor(() => expect(exitos()).toEqual([TEXTOS_TEMAS.avisoCreado]))
    await reposar()
    expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
    expect(avisos()).toEqual([])
    expect(inesperadas).toEqual([])
  })

  it("ir al muro con la barra y volver con la barra antes de 30 s: sin el error, y «Crear tema» manda un POST nuevo", async () => {
    const router = await conElErrorEnElTema()

    await enLaBarra(TEXTOS_CLASE.muro)
    await waitFor(() => expect(router.state.location.pathname).toBe(MURO))
    vi.setSystemTime(new Date(AHORA.getTime() + 10_000))
    await enLaBarra(TEXTOS_CLASE.trabajo)
    await waitFor(() => expect(router.state.location.pathname).toBe(TRABAJO))
    await screen.findByRole("button", { name: TEXTOS_TRABAJO.nuevoTema })

    await repetirYQueSalgaBien()
  })

  it("atrás y adelante del historial (trabajo → muro → atrás → adelante → atrás) antes de 30 s: sin el error, y «Crear tema» manda un POST nuevo", async () => {
    const router = await conElErrorEnElTema()

    await enLaBarra(TEXTOS_CLASE.muro)
    await waitFor(() => expect(router.state.location.pathname).toBe(MURO))
    for (const [paso, destino] of [
      [-1, TRABAJO],
      [1, MURO],
      [-1, TRABAJO],
    ] as const) {
      vi.setSystemTime(new Date(Date.now() + 3_000))
      await act(async () => {
        await router.navigate(paso)
      })
      await waitFor(() => expect(router.state.location.pathname).toBe(destino))
      await reposar()
      expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
    }
    await screen.findByRole("button", { name: TEXTOS_TRABAJO.nuevoTema })

    await repetirYQueSalgaBien()
  })
})
