import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, configure, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { AlumnosView } from "./alumnos-view"
import { PersonasView } from "./personas-view"

// Ataque del Tester (CLASES-b, ronda 5, regresión final): la corrección de T-27 y T-28 en
// useFocoAlCargarMas y PersonasView. "Ver más alumnos" con teclado y con ratón en el roster y en
// personas: más páginas por cargar, clic en blanco y consulta nueva, foco en otro control mientras
// llega la página, el botón que desaparece por un cambio de datos ajeno, la página siguiente que
// falla (el foco al h2 "Alumnos", DESIGN.md §7.14) y la primera carga que falla. Ningún render sin
// desmontaje mueve el foco. Sin selectores de clase.

configure({ asyncUtilTimeout: 5000 })

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), neutro: vi.fn() }))
vi.mock("sonner", () => ({
  toast: Object.assign(aviso.neutro, { success: aviso.success, error: aviso.error }),
}))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const idDe = (n: number) => `9a9b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const nombreDe = (n: number) => `Alumno ${String(n).padStart(3, "0")}`
const MAESTRO_ID = "9a9b3c4d-1c1f-4b8e-9a1e-999999999999"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorInterno = () => respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } })

interface Control {
  inscritos: string[]
  candidatos: { n: number; nombre: string }[]
  fallarPaginaSiguiente: boolean
  // Si se define, la página siguiente responde vacía aunque la anterior anunciara un cursor.
  paginaSiguienteVacia: boolean
  demoraPagina?: Promise<void>
  fallarPrimera?: boolean
  demoraPost?: Promise<void>
}

const crearServidor = (total: number, candidatos: { n: number; nombre: string }[] = []) => {
  const control: Control = {
    inscritos: Array.from({ length: total }, (_, i) => idDe(i + 1)),
    candidatos,
    fallarPaginaSiguiente: false,
    paginaSiguienteVacia: false,
  }
  const pagina = (url: URL) => {
    const limite = Number(url.searchParams.get("limite") ?? "50")
    const cursor = url.searchParams.get("cursor")
    if (cursor !== null && control.paginaSiguienteVacia) return { ids: [], siguiente: null }
    const desde = cursor === null ? 0 : control.inscritos.indexOf(cursor) + 1
    const ids = control.inscritos.slice(desde, desde + limite)
    const hayMas = control.inscritos.length > desde + limite
    return { ids, siguiente: hayMas ? (ids.at(-1) ?? null) : null }
  }
  const nombreDeId = (id: string) => {
    const n = Number(id.slice(-12))
    return control.candidatos.find((c) => c.n === n)?.nombre ?? nombreDe(n)
  }
  const fetchMock = vi.fn<typeof fetch>(async (entrada, init) => {
    const url = new URL(String(entrada), "http://x")
    const metodo = init?.method ?? "GET"
    const base = `/api/clases/${CLASE_ID}`
    if (url.pathname === `${base}/alumnos/candidatos`) {
      const q = (url.searchParams.get("q") ?? "").toLowerCase()
      return respuestaJson(200, {
        candidatos: control.candidatos
          .filter((c) => c.nombre.toLowerCase().includes(q))
          .map((c) => ({
            id: idDe(c.n),
            nombre: c.nombre,
            correoEnmascarado: "ab***@x.mx",
            yaInscrito: control.inscritos.includes(idDe(c.n)),
          })),
        hayMas: false,
      })
    }
    if (url.pathname === `${base}/alumnos` && metodo === "POST") {
      if (control.demoraPost) await control.demoraPost
      const { alumnoId } = JSON.parse(String(init?.body)) as { alumnoId: string }
      const yaEstaba = control.inscritos.includes(alumnoId)
      if (!yaEstaba) control.inscritos = [...control.inscritos, alumnoId]
      return respuestaJson(200, {
        alumno: { id: alumnoId, nombre: nombreDeId(alumnoId) },
        yaEstaba,
      })
    }
    if (
      (url.pathname === `${base}/alumnos` || url.pathname === `${base}/personas`) &&
      metodo === "GET"
    ) {
      if (url.searchParams.get("cursor") === null && control.fallarPrimera === true) {
        return errorInterno()
      }
      if (url.searchParams.get("cursor") !== null && control.demoraPagina) {
        await control.demoraPagina
      }
      if (url.searchParams.get("cursor") !== null && control.fallarPaginaSiguiente) {
        return errorInterno()
      }
      const { ids, siguiente } = pagina(url)
      if (url.pathname.endsWith("/personas")) {
        // CLASES-02b ronda 0 (C-11, §D-2B4): "Personas" trae el correo completo de cada persona y
        // maestros (1 o 2), obligatorios en personasRespuestaSchema. Ninguna aserción cambia.
        const maestro = { id: MAESTRO_ID, nombre: "Profe Luna", email: "luna@x.mx" }
        return respuestaJson(200, {
          maestro,
          maestros: [maestro],
          alumnos: ids.map((id) => ({
            id,
            nombre: nombreDeId(id),
            email: `a${id.slice(-3)}@x.mx`,
          })),
          totalAlumnos: control.inscritos.length,
          siguienteCursor: siguiente,
        })
      }
      return respuestaJson(200, {
        alumnos: ids.map((id) => ({
          id,
          nombre: nombreDeId(id),
          email: `a${id.slice(-3)}@x.mx`,
          estadoPago: "al_corriente",
          accesoRestringido: false,
          origen: "manual",
          inscritoEn: "2026-09-29T15:30:00.000Z",
        })),
        total: control.inscritos.length,
        siguienteCursor: siguiente,
      })
    }
    return errorInterno()
  })
  vi.stubGlobal("fetch", fetchMock)
  return { control, fetchMock }
}

const renderVista = (vista: "alumnos" | "personas") => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const ruta =
    vista === "alumnos"
      ? "/maestro/clases/:claseId/alumnos"
      : "/estudiante/clases/:claseId/personas"
  const inicial =
    vista === "alumnos"
      ? `/maestro/clases/${CLASE_ID}/alumnos`
      : `/estudiante/clases/${CLASE_ID}/personas`
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[inicial]}>
        <Routes>
          <Route path={ruta} element={vista === "alumnos" ? <AlumnosView /> : <PersonasView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { queryClient }
}

const esperar = (ms: number) =>
  act(async () => {
    await new Promise((resolver) => setTimeout(resolver, ms))
  })

const focoEn = () => document.activeElement
const campo = () => screen.getByLabelText("Buscar alumno por nombre")

// Teclado: el foco en el botón y Enter (un clic sobre el botón enfocado).
const pulsar = (boton: HTMLElement) => {
  boton.focus()
  fireEvent.click(boton)
}

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

const VISTAS = ["alumnos", "personas"] as const
const encabezadoAlumnos = () => screen.getByRole("heading", { name: "Alumnos" })
const releer = (queryClient: QueryClient) =>
  act(async () => {
    await queryClient.invalidateQueries({ queryKey: ["clases", CLASE_ID] })
  })
const sinAlumno = async (n: number) =>
  waitFor(() => expect(screen.queryAllByText(nombreDe(n))).toHaveLength(0))

describe(
  "ataque CLASES-b r5: T-28, sin movimientos con el botón montado",
  { timeout: 30000 },
  () => {
    it.each(VISTAS)(
      "%s, teclado: «Ver más» con más páginas, clic en blanco y consulta nueva con datos distintos: el foco no se mueve",
      async (vista) => {
        const { control } = crearServidor(152)
        const { queryClient } = renderVista(vista)
        await screen.findAllByText(nombreDe(1))
        pulsar(await screen.findByRole("button", { name: "Ver más alumnos" }))
        await screen.findAllByText(nombreDe(100))
        await esperar(30)
        const verMas = screen.getByRole("button", { name: "Ver más alumnos" })
        expect(focoEn()).toBe(verMas)
        verMas.blur()
        await esperar(20)
        control.inscritos = control.inscritos.filter((id) => id !== idDe(2))
        await releer(queryClient)
        await sinAlumno(2)
        await esperar(30)
        expect(screen.getByRole("button", { name: "Ver más alumnos" })).toBeInTheDocument()
        expect(focoEn()).toBe(document.body)
      },
    )

    it.each(VISTAS)(
      "%s: con el foco en «Ver más» y el botón montado, una consulta nueva con datos distintos no lo mueve",
      async (vista) => {
        const { control } = crearServidor(102)
        const { queryClient } = renderVista(vista)
        await screen.findAllByText(nombreDe(1))
        const verMas = await screen.findByRole("button", { name: "Ver más alumnos" })
        verMas.focus()
        control.inscritos = control.inscritos.filter((id) => id !== idDe(3))
        await releer(queryClient)
        await sinAlumno(3)
        await esperar(30)
        expect(focoEn()).toBe(screen.getByRole("button", { name: "Ver más alumnos" }))
      },
    )

    it("alumnos: el foco pasa al buscador mientras llega la última página; al desaparecer «Ver más», el foco se queda en el campo", async () => {
      const { control } = crearServidor(52)
      renderVista("alumnos")
      await screen.findAllByText(nombreDe(1))
      let soltar: () => void = () => undefined
      control.demoraPagina = new Promise<void>((resolver) => {
        soltar = resolver
      })
      pulsar(await screen.findByRole("button", { name: "Ver más alumnos" }))
      campo().focus()
      await act(async () => {
        soltar()
        await Promise.resolve()
      })
      await screen.findAllByText(nombreDe(52))
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: "Ver más alumnos" })).toBeNull(),
      )
      await esperar(30)
      expect(focoEn()).toBe(campo())
    })

    it("personas: el foco pasa a una persona mientras llega la última página; al desaparecer «Ver más», no se mueve", async () => {
      const { control } = crearServidor(52)
      renderVista("personas")
      await screen.findAllByText(nombreDe(1))
      let soltar: () => void = () => undefined
      control.demoraPagina = new Promise<void>((resolver) => {
        soltar = resolver
      })
      pulsar(await screen.findByRole("button", { name: "Ver más alumnos" }))
      const persona = screen.getByText(nombreDe(10)).closest("li")
      if (persona === null) throw new Error("No existe el elemento de la persona 10")
      persona.focus()
      await act(async () => {
        soltar()
        await Promise.resolve()
      })
      await screen.findAllByText(nombreDe(52))
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: "Ver más alumnos" })).toBeNull(),
      )
      await esperar(30)
      expect(focoEn()).toBe(persona)
    })

    it.each(VISTAS)(
      "%s: con el foco en «Ver más», otra pestaña quita alumnos y el botón desaparece sin clic: el foco va al encabezado, no a <body>",
      async (vista) => {
        const { control } = crearServidor(52)
        const { queryClient } = renderVista(vista)
        await screen.findAllByText(nombreDe(1))
        ;(await screen.findByRole("button", { name: "Ver más alumnos" })).focus()
        control.inscritos = control.inscritos.filter(
          (id) => id !== idDe(1) && id !== idDe(2) && id !== idDe(3),
        )
        await releer(queryClient)
        await sinAlumno(1)
        await waitFor(() =>
          expect(screen.queryByRole("button", { name: "Ver más alumnos" })).toBeNull(),
        )
        await waitFor(() => expect(focoEn()).not.toBe(document.body))
        expect(focoEn()?.isConnected).toBe(true)
      },
    )
  },
)

describe("ataque CLASES-b r5: T-27 y la primera carga", { timeout: 30000 }, () => {
  it.each(VISTAS)(
    "%s: si la página siguiente falla, el foco va exactamente al encabezado «Alumnos»",
    async (vista) => {
      const { control } = crearServidor(52)
      renderVista(vista)
      await screen.findAllByText(nombreDe(1))
      control.fallarPaginaSiguiente = true
      pulsar(await screen.findByRole("button", { name: "Ver más alumnos" }))
      await screen.findByRole("alert")
      await waitFor(() => expect(focoEn()).toBe(encabezadoAlumnos()))
    },
  )

  it.each(VISTAS)(
    "%s: si la primera carga falla, se ve el error y nada se rompe ni mueve el foco",
    async (vista) => {
      const { control } = crearServidor(10)
      control.fallarPrimera = true
      renderVista(vista)
      expect(await screen.findByRole("alert")).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Ver más alumnos" })).toBeNull()
      await esperar(30)
      expect(focoEn()).toBe(document.body)
    },
  )
})
