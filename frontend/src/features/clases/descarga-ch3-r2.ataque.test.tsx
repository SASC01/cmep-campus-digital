import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ENTRADAS_DE_FORMULARIO, MENSAJE_DE_PRUEBA } from "@/lib/errores-de-api-fuera-de-contrato"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ElementoDeTrabajo } from "./components/elemento-de-trabajo"
import { TEXTOS_TRABAJO } from "./data"
import { MuroView } from "./muro-view"
import type { Adjunto, ElementoDeTrabajo as Elemento, PaginaDelMuro } from "./types"

// Ataque CHORE-03 03a, ronda 2 (tester): la guarda con ref de «Descargar» (Enmienda 2, T-02; DH-6) en
// los sitios de features/clases que usan la ficha de components/adjuntos sin que clases cambie: el
// muro (por MuroView) y un material de "Trabajo de clase" (ElementoDeTrabajo, que monta la ficha solo
// con "Ver material" abierto). Dos clics seguidos, dos fallos seguidos, un clic después de que React
// vuelve a pintar, la vista desmontada con la petición en vuelo y, en el material, ocultarlo y volver
// a abrirlo con la petición en vuelo. El aviso usa F1 ("campoFueraDeContrato: Revisa este valor."),
// que mensajeDeErrorClases ya traduce hoy y seguirá traduciendo en 03b. Sin fechas que comparar.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const URL_DE_DESCARGA = "https://almacen.ejemplo.mx/descarga/x?X-Amz-Expires=300"
const AUTOR = {
  id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
  nombre: "Luis Pérez",
  administracion: false,
}

const ADJUNTO: Adjunto = {
  id: "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11",
  nombre: "lectura.pdf",
  tipo: "application/pdf",
  tamano: 2048,
  vistaPrevia: null,
}
const URL_DE_LA_PETICION = `/api/clases/${CLASE_ID}/archivos/${ADJUNTO.id}/descarga`

const PAGINA: PaginaDelMuro = {
  publicaciones: [
    {
      id: "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11",
      tipo: "material",
      titulo: "Lectura de la semana",
      texto: "",
      autor: AUTOR,
      creadoEn: "2026-10-02T15:00:00.000Z",
      comentarios: 0,
      tarea: null,
      adjuntos: [ADJUNTO],
      puedeBorrar: false,
    },
  ],
  siguienteCursor: null,
}

const MATERIAL: Elemento = {
  id: "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d12",
  tipo: "material",
  titulo: "Lectura de la semana",
  autor: AUTOR,
  creadoEn: "2026-10-02T15:00:00.000Z",
  material: { texto: "", adjuntos: [ADJUNTO] },
  tarea: null,
  puedeMover: false,
  entrega: null,
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const conValidacion = () =>
  respuestaJson(400, {
    error: { codigo: "VALIDACION", mensaje: ENTRADAS_DE_FORMULARIO["campo-no-pintable"].mensaje },
  })
const conUrl = () =>
  respuestaJson(200, { url: URL_DE_DESCARGA, expiraEn: "2030-01-10T12:05:00.000Z" })

let pedidas: string[] = []
let inesperadas: string[] = []
let enVuelo: ((respuesta: Response) => void)[] = []
const asignar = vi.fn()
const errorDeConsola = vi.fn()

beforeEach(() => {
  establecerToken("token-de-prueba")
  pedidas = []
  inesperadas = []
  enVuelo = []
  vi.spyOn(console, "error").mockImplementation(errorDeConsola)
  vi.stubGlobal("location", { ...window.location, assign: asignar })
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      if (metodo === "POST" && url === URL_DE_LA_PETICION) {
        pedidas.push(url)
        return new Promise<Response>((r) => enVuelo.push(r))
      }
      if (metodo === "GET" && url.startsWith(`/api/clases/${CLASE_ID}/publicaciones?`)) {
        return Promise.resolve(respuestaJson(200, PAGINA))
      }
      inesperadas.push(`${metodo} ${url}`)
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
  vi.restoreAllMocks()
  asignar.mockReset()
  errorDeConsola.mockReset()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const avisos = () => aviso.error.mock.calls.map((llamada) => String(llamada[0]))

const soltarLaPrimera = async (respuesta: () => Response) => {
  const soltar = enVuelo.shift()
  expect(soltar, "no había ninguna descarga en vuelo que soltar").toBeDefined()
  soltar?.(respuesta())
  await reposar()
}

const sinEspera = (boton: HTMLElement) => {
  expect(boton).not.toHaveAttribute("aria-busy", "true")
  expect(boton).not.toHaveAttribute("aria-disabled", "true")
}

const nuevoCliente = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

const NOMBRE_DEL_BOTON = `Descargar ${ADJUNTO.nombre}`
const boton = () => screen.getByRole("button", { name: NOMBRE_DEL_BOTON })

interface Sitio {
  sitio: string
  montar: () => Promise<{ unmount: () => void }>
}

const SITIOS: readonly Sitio[] = [
  {
    sitio: "el muro",
    montar: async () => {
      const montado = render(
        <QueryClientProvider client={nuevoCliente()}>
          <MemoryRouter initialEntries={[`/estudiante/clases/${CLASE_ID}`]}>
            <Routes>
              <Route path="/estudiante/clases/:claseId" element={<MuroView />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      )
      await screen.findByRole("button", { name: NOMBRE_DEL_BOTON })
      await reposar()
      return montado
    },
  },
  {
    sitio: "un material de «Trabajo de clase»",
    montar: async () => {
      const montado = render(
        <QueryClientProvider client={nuevoCliente()}>
          <ElementoDeTrabajo claseId={CLASE_ID} elemento={MATERIAL} />
        </QueryClientProvider>,
      )
      fireEvent.click(screen.getByRole("button", { name: TEXTOS_TRABAJO.verMaterial }))
      await screen.findByRole("button", { name: NOMBRE_DEL_BOTON })
      return montado
    },
  },
]

describe("ataque CHORE-03 03a r2 · T-02: la guarda de «Descargar» en features/clases (sin tocar clases)", () => {
  it.each(SITIOS)(
    "$sitio: dos clics seguidos que fallan mandan una sola petición y dan un solo aviso",
    async ({ montar }) => {
      await montar()

      fireEvent.click(boton())
      fireEvent.click(boton())
      await reposar()
      expect(pedidas).toEqual([URL_DE_LA_PETICION])
      await soltarLaPrimera(conValidacion)

      await waitFor(() => expect(avisos()).toEqual([MENSAJE_DE_PRUEBA]))
      sinEspera(boton())
      expect(pedidas).toHaveLength(1)
      expect(inesperadas).toEqual([])
      expect(errorDeConsola).not.toHaveBeenCalled()
    },
  )

  it.each(SITIOS)(
    "$sitio: dos fallos seguidos dan un aviso cada uno, el botón queda disponible entre ambos y un tercer intento bueno descarga sin aviso de más",
    async ({ montar }) => {
      await montar()

      fireEvent.click(boton())
      await waitFor(() => expect(pedidas).toHaveLength(1))
      await soltarLaPrimera(conValidacion)
      await waitFor(() => expect(avisos()).toEqual([MENSAJE_DE_PRUEBA]))
      await waitFor(() => sinEspera(boton()))

      fireEvent.click(boton())
      await waitFor(() => expect(pedidas).toHaveLength(2))
      await soltarLaPrimera(conValidacion)
      await waitFor(() => expect(avisos()).toEqual([MENSAJE_DE_PRUEBA, MENSAJE_DE_PRUEBA]))
      await waitFor(() => sinEspera(boton()))

      fireEvent.click(boton())
      await waitFor(() => expect(pedidas).toHaveLength(3))
      await soltarLaPrimera(conUrl)
      await waitFor(() => expect(asignar).toHaveBeenCalledTimes(1))
      expect(asignar).toHaveBeenCalledWith(URL_DE_DESCARGA)
      await waitFor(() => sinEspera(boton()))
      expect(avisos()).toEqual([MENSAJE_DE_PRUEBA, MENSAJE_DE_PRUEBA])
      expect(errorDeConsola).not.toHaveBeenCalled()
    },
  )

  it.each(SITIOS)(
    "$sitio: tres clics (dos en el mismo instante y uno después de que React vuelve a pintar) mandan una sola petición y navegan una vez; después del éxito, un clic nuevo vuelve a pedir",
    async ({ montar }) => {
      await montar()

      fireEvent.click(boton())
      fireEvent.click(boton())
      await reposar()
      expect(boton()).toHaveAttribute("aria-busy", "true")
      fireEvent.click(boton())
      await reposar()
      expect(pedidas).toHaveLength(1)

      await soltarLaPrimera(conUrl)
      await waitFor(() => expect(asignar).toHaveBeenCalledTimes(1))
      await waitFor(() => sinEspera(boton()))
      expect(pedidas).toHaveLength(1)
      expect(avisos()).toEqual([])

      // Tras un éxito la guarda también se libera: un clic nuevo vuelve a pedir la URL.
      fireEvent.click(boton())
      await waitFor(() => expect(pedidas).toHaveLength(2))
      await soltarLaPrimera(conUrl)
      await waitFor(() => expect(asignar).toHaveBeenCalledTimes(2))
      expect(avisos()).toEqual([])
      expect(errorDeConsola).not.toHaveBeenCalled()
    },
  )

  it.each(SITIOS)(
    "$sitio: con la vista desmontada y la petición en vuelo, el fallo da a lo sumo el aviso de siempre y nada en la consola",
    async ({ montar }) => {
      const { unmount } = await montar()

      fireEvent.click(boton())
      fireEvent.click(boton())
      await reposar()
      unmount()
      await soltarLaPrimera(conValidacion)
      await reposar()

      expect(avisos()).toEqual([MENSAJE_DE_PRUEBA])
      expect(pedidas).toHaveLength(1)
      expect(asignar).not.toHaveBeenCalled()
      expect(errorDeConsola).not.toHaveBeenCalled()
    },
  )

  it("un material de «Trabajo de clase»: ocultarlo y volver a abrirlo con la petición en vuelo monta una ficha nueva; dos clics en ella piden una sola vez más y cada fallo da un solo aviso", async () => {
    await SITIOS[1]?.montar()
    expect(screen.queryByRole("button", { name: NOMBRE_DEL_BOTON })).not.toBeNull()

    fireEvent.click(boton())
    await reposar()
    expect(pedidas).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_TRABAJO.ocultarMaterial }))
    expect(screen.queryByRole("button", { name: NOMBRE_DEL_BOTON })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_TRABAJO.verMaterial }))

    sinEspera(boton())
    fireEvent.click(boton())
    fireEvent.click(boton())
    await reposar()
    const despuesDeReabrir = pedidas.length

    await soltarLaPrimera(conValidacion)
    await soltarLaPrimera(conValidacion)
    await waitFor(() => expect(avisos()).toHaveLength(2))
    await waitFor(() => sinEspera(boton()))

    expect(despuesDeReabrir).toBe(2)
    expect(avisos()).toEqual([MENSAJE_DE_PRUEBA, MENSAJE_DE_PRUEBA])
    expect(errorDeConsola).not.toHaveBeenCalled()
  })
})
