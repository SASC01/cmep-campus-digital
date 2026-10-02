import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  act,
  cleanup,
  configure,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { AlumnosView } from "./alumnos-view"
import { terminoDeBusquedaValido } from "./lib"

// Ataque del Tester (CLASES-b, ronda 2): la corrección de T-21 (foco a la fila vecina o al h2) con
// varias páginas, la última fila de una página, la única fila, la consulta nueva fallando y la fila
// que sale de los datos antes del onSuccess; D-4 (aviso neutro solo con yaEstaba) y la coherencia de
// T-20 entre el frontend y el backend en el tope de 120 normalizados. DESIGN.md §7.14, §D-B4,
// S-11. Sin selectores de clase.

// Con la suite completa en paralelo, montar 52 filas tarda: más margen para las esperas y los casos.
configure({ asyncUtilTimeout: 5000 })

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), neutro: vi.fn() }))
vi.mock("sonner", () => ({
  toast: Object.assign(aviso.neutro, { success: aviso.success, error: aviso.error }),
}))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const idDe = (n: number) => `7a7b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const nombreDe = (n: number) => `Alumno ${String(n).padStart(3, "0")}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

interface Control {
  inscritos: string[]
  fallarRoster: boolean
  // Si existe, el DELETE aplica el cambio de inmediato y responde cuando se resuelve.
  demoraDelete?: Promise<void>
  demoraPost?: Promise<void>
  yaEstaba?: boolean
}

// Servidor en memoria con paginación por cursor (limite y cursor como la API real).
const crearServidor = (total: number) => {
  const control: Control = {
    inscritos: Array.from({ length: total }, (_, i) => idDe(i + 1)),
    fallarRoster: false,
  }
  const fetchMock = vi.fn<typeof fetch>(async (entrada, init) => {
    const url = new URL(String(entrada), "http://x")
    const metodo = init?.method ?? "GET"
    const base = `/api/clases/${CLASE_ID}/alumnos`
    if (url.pathname === `${base}/candidatos`) {
      return respuestaJson(200, {
        candidatos: [
          {
            id: idDe(900),
            nombre: "Nadia Ruiz",
            correoEnmascarado: "na***@x.mx",
            yaInscrito: false,
          },
        ],
        hayMas: false,
      })
    }
    if (url.pathname === base && metodo === "POST") {
      if (control.demoraPost) await control.demoraPost
      return respuestaJson(200, {
        alumno: { id: idDe(900), nombre: "Nadia Ruiz" },
        yaEstaba: control.yaEstaba ?? false,
      })
    }
    if (url.pathname.startsWith(`${base}/`) && metodo === "DELETE") {
      const id = url.pathname.slice(base.length + 1)
      control.inscritos = control.inscritos.filter((x) => x !== id)
      if (control.demoraDelete) await control.demoraDelete
      return new Response(null, { status: 204 })
    }
    if (url.pathname === base && metodo === "GET") {
      if (control.fallarRoster) {
        return respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } })
      }
      const limite = Number(url.searchParams.get("limite") ?? "50")
      const cursor = url.searchParams.get("cursor")
      const desde = cursor === null ? 0 : control.inscritos.indexOf(cursor) + 1
      const pagina = control.inscritos.slice(desde, desde + limite)
      const hayMas = control.inscritos.length > desde + limite
      return respuestaJson(200, {
        alumnos: pagina.map((id) => {
          const n = Number(id.slice(-12))
          return {
            id,
            nombre: nombreDe(n),
            email: `a${String(n)}@x.mx`,
            estadoPago: "al_corriente",
            accesoRestringido: false,
            origen: "manual",
            inscritoEn: "2026-09-29T15:30:00.000Z",
          }
        }),
        total: control.inscritos.length,
        siguienteCursor: hayMas ? (pagina.at(-1) ?? null) : null,
      })
    }
    return respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } })
  })
  vi.stubGlobal("fetch", fetchMock)
  return { control, fetchMock }
}

const renderAlumnos = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/maestro/clases/${CLASE_ID}/alumnos`]}>
        <Routes>
          <Route path="/maestro/clases/:claseId/alumnos" element={<AlumnosView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { queryClient }
}

const filaDe = async (n: number): Promise<HTMLElement> => {
  const celda = await screen.findByRole("cell", { name: nombreDe(n) })
  const fila = celda.closest("tr")
  if (fila === null) throw new Error(`La fila de ${nombreDe(n)} no existe`)
  return fila
}

// Teclado: "Quitar" → el foco va a "Cancelar" → Mayús+Tab a "Sí, quitar" → Enter.
const confirmarQuitar = async (n: number) => {
  const fila = await filaDe(n)
  const quitar = within(fila).getByRole("button", { name: `Quitar ${nombreDe(n)}` })
  quitar.focus()
  fireEvent.click(quitar)
  const si = within(fila).getByRole("button", { name: `Sí, quitar ${nombreDe(n)}` })
  si.focus()
  fireEvent.click(si)
}

const verMas = async () => {
  fireEvent.click(await screen.findByRole("button", { name: "Ver más alumnos" }))
  await waitFor(() => expect(screen.queryByRole("button", { name: "Ver más alumnos" })).toBeNull())
}

const focoEn = () => document.activeElement

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
  aviso.neutro.mockClear()
})

describe("ataque CLASES-b r2: T-21 con varias páginas", { timeout: 30000 }, () => {
  it("quitar la primera fila de la página 2 lleva el foco al «Quitar» de la que ocupa su lugar", async () => {
    crearServidor(52)
    renderAlumnos()
    await filaDe(1)
    await verMas()
    await confirmarQuitar(51)
    await waitFor(() => expect(screen.queryByRole("cell", { name: nombreDe(51) })).toBeNull())
    await waitFor(() =>
      expect(focoEn()).toBe(screen.getByRole("button", { name: `Quitar ${nombreDe(52)}` })),
    )
  })

  it("quitar la última fila de la página 1 con la página 2 cargada lleva el foco a la primera de la página 2", async () => {
    crearServidor(52)
    renderAlumnos()
    await filaDe(1)
    await verMas()
    await confirmarQuitar(50)
    await waitFor(() => expect(screen.queryByRole("cell", { name: nombreDe(50) })).toBeNull())
    await waitFor(() =>
      expect(focoEn()).toBe(screen.getByRole("button", { name: `Quitar ${nombreDe(51)}` })),
    )
  })

  it("quitar la última fila de todas lleva el foco a la anterior", async () => {
    crearServidor(52)
    renderAlumnos()
    await filaDe(1)
    await verMas()
    await confirmarQuitar(52)
    await waitFor(() => expect(screen.queryByRole("cell", { name: nombreDe(52) })).toBeNull())
    await waitFor(() =>
      expect(focoEn()).toBe(screen.getByRole("button", { name: `Quitar ${nombreDe(51)}` })),
    )
  })

  it("quitar la única fila lleva el foco al encabezado «Alumnos» del roster", async () => {
    crearServidor(1)
    renderAlumnos()
    await confirmarQuitar(1)
    await screen.findByText("Aún no hay alumnos. Comparte el código de la clase o búscalos arriba.")
    await waitFor(() => expect(focoEn()).toBe(screen.getByRole("heading", { name: "Alumnos" })))
  })

  it("T-22: si la consulta nueva del roster falla después de quitar, el foco no queda en <body> ni en un botón que ya no existe", async () => {
    const { control } = crearServidor(3)
    renderAlumnos()
    await filaDe(1)
    control.fallarRoster = true
    await confirmarQuitar(2)
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: `Sí, quitar ${nombreDe(2)}` })).toBeNull(),
    )
    expect(focoEn(), "el foco quedó en <body>").not.toBe(document.body)
    expect(focoEn()?.isConnected).toBe(true)
  })

  it("T-23: si la fila sale de los datos antes del onSuccess (otra pestaña la quitó y el roster se volvió a pedir), el foco no queda en <body>", async () => {
    const { control } = crearServidor(3)
    const { queryClient } = renderAlumnos()
    await filaDe(1)
    let soltar: () => void = () => undefined
    control.demoraDelete = new Promise<void>((resolver) => {
      soltar = resolver
    })
    await confirmarQuitar(2)
    // El servidor ya no lo tiene (otra pestaña o este mismo DELETE ya aplicado) y el roster se
    // vuelve a pedir, por ejemplo al regresar el foco a la ventana, antes de que llegue el 204.
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ["clases", CLASE_ID, "alumnos"] })
    })
    await waitFor(() => expect(screen.queryByRole("cell", { name: nombreDe(2) })).toBeNull())
    await act(async () => {
      soltar()
      await new Promise((resolver) => setTimeout(resolver, 50))
    })
    expect(focoEn(), "el foco quedó en <body>").not.toBe(document.body)
    expect(focoEn()?.isConnected).toBe(true)
  })
})

describe("ataque CLASES-b r2: D-4", () => {
  const agregarNadia = async () =>
    screen.findByRole("button", { name: "Agregar a la clase Nadia Ruiz" })

  it("con yaEstaba false: solo «Agregaste a…», sin aviso neutro", async () => {
    const { control } = crearServidor(0)
    control.yaEstaba = false
    renderAlumnos()
    fireEvent.change(screen.getByLabelText("Buscar alumno por nombre"), {
      target: { value: "nad" },
    })
    fireEvent.click(await agregarNadia())
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Agregaste a Nadia Ruiz"))
    expect(aviso.neutro).not.toHaveBeenCalled()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("con yaEstaba true y doble clic con el POST en vuelo: un solo POST, un solo aviso neutro y ningún «Agregaste a…»", async () => {
    const { control, fetchMock } = crearServidor(0)
    control.yaEstaba = true
    let soltar: () => void = () => undefined
    control.demoraPost = new Promise<void>((resolver) => {
      soltar = resolver
    })
    renderAlumnos()
    fireEvent.change(screen.getByLabelText("Buscar alumno por nombre"), {
      target: { value: "nad" },
    })
    const boton = await agregarNadia()
    fireEvent.click(boton)
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30))
    })
    fireEvent.click(boton)
    await act(async () => {
      soltar()
      await new Promise((resolver) => setTimeout(resolver, 50))
    })
    await waitFor(() => expect(aviso.neutro).toHaveBeenCalledTimes(1))
    expect(aviso.neutro).toHaveBeenCalledWith("Nadia Ruiz ya estaba en la clase")
    expect(aviso.success).not.toHaveBeenCalled()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(
      fetchMock.mock.calls.filter(([, init]) => (init?.method ?? "GET") === "POST"),
    ).toHaveLength(1)
  })
})

describe("ataque CLASES-b r2: coherencia de T-20 entre el frontend y el backend", () => {
  it("los términos de la tabla del backend (alumnos-b-r2) se deciden igual en el frontend", () => {
    // [término, ¿el backend responde 200?] — los 400 BUSQUEDA_MUY_CORTA y VALIDACION por mínimo
    // son "no" en el frontend; el tope se mide aparte.
    const casos: [string, boolean][] = [
      ["山田太", true],
      ["山田", false],
      ["محمد", true],
      ["مح", false],
      ["क्ष", false],
      ["क्षमा", true],
      ["สมชาย", true],
      ["İnc", true],
      ["İİ", false],
      ["ﬁﬁ", false],
      ["ﬁﬁﬁ", true],
      ["a b", true],
      ["a　 b", true],
      ["　a　", false],
      ["a​b", true],
      ["각", true],
      ["가나", true],
    ]
    expect(
      casos.filter(([termino, valido]) => terminoDeBusquedaValido(termino) !== valido),
    ).toEqual([])
  })

  it("T-24: un término que cabe en el campo (maxLength 120) pero pasa de 120 normalizados no se pide: el backend lo rechaza (41 sílabas hangul)", async () => {
    const { fetchMock } = crearServidor(0)
    renderAlumnos()
    await screen.findByText("Aún no hay alumnos. Comparte el código de la clase o búscalos arriba.")
    const campo = screen.getByLabelText("Buscar alumno por nombre")
    const termino = "각".repeat(41)
    // Precondición: cabe en el campo (41 unidades UTF-16 de 120).
    expect(termino.length).toBeLessThanOrEqual(Number(campo.getAttribute("maxLength")))
    fireEvent.change(campo, { target: { value: termino } })
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 600))
    })
    expect(
      fetchMock.mock.calls.filter(([entrada]) => String(entrada).includes("/candidatos")),
      "el frontend pidió un término que el backend responde con 400 (más de 120 normalizados)",
    ).toHaveLength(0)
  })
})
