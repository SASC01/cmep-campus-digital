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
import { PersonasView } from "./personas-view"

// Ataque del Tester (CLASES-b, ronda 4, regresión final): el foco de T-25 ("Agregar a la clase") y
// de T-26 ("Ver más alumnos" en el roster y en personas) según DESIGN.md §7.14, "Foco cuando un
// control desaparece por su propia acción": filas del medio, última, única, siguiente ya inscrita,
// doble Enter, escribir mientras se agrega, varias páginas con el botón todavía montado, última
// página con elementos o vacía, consulta de la página siguiente que falla, y ratón con clic fuera
// (ningún movimiento en renders sin desmontaje). Sin selectores de clase.

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
const resultados = () => screen.findByRole("list", { name: "Resultados de la búsqueda" })
const agregarDe = async (nombre: string) =>
  within(await resultados()).findByRole("button", { name: `Agregar a la clase ${nombre}` })

// Teclado: el foco en el botón y Enter (un clic sobre el botón enfocado).
const pulsar = (boton: HTMLElement) => {
  boton.focus()
  fireEvent.click(boton)
}

const CANDIDATOS = [
  { n: 201, nombre: "Nora Uno" },
  { n: 202, nombre: "Nora Dos" },
  { n: 203, nombre: "Nora Tres" },
]

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

describe("ataque CLASES-b r4: T-25, el foco al agregar con teclado", { timeout: 30000 }, () => {
  it.each([
    ["la fila del medio va al siguiente «Agregar»", "Nora Dos", "Nora Tres"],
    ["la última fila va al anterior «Agregar»", "Nora Tres", "Nora Dos"],
  ])("%s", async (_titulo, origen, destino) => {
    crearServidor(0, CANDIDATOS)
    renderVista("alumnos")
    fireEvent.change(campo(), { target: { value: "nora" } })
    pulsar(await agregarDe(origen))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(focoEn()).toBe(screen.getByRole("button", { name: `Agregar a la clase ${destino}` })),
    )
  })

  it("la única fila va al campo de búsqueda", async () => {
    crearServidor(0, [{ n: 201, nombre: "Nora Uno" }])
    renderVista("alumnos")
    fireEvent.change(campo(), { target: { value: "nora" } })
    pulsar(await agregarDe("Nora Uno"))
    await within(await resultados()).findByText("Ya está en la clase")
    await waitFor(() => expect(focoEn()).toBe(campo()))
  })

  it("si la siguiente fila ya dice «Ya está en la clase», salta al siguiente «Agregar» que exista", async () => {
    const { control } = crearServidor(0, CANDIDATOS)
    control.inscritos = [idDe(202)]
    renderVista("alumnos")
    fireEvent.change(campo(), { target: { value: "nora" } })
    pulsar(await agregarDe("Nora Uno"))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(focoEn()).toBe(screen.getByRole("button", { name: "Agregar a la clase Nora Tres" })),
    )
  })

  it("doble Enter con la petición en vuelo: un solo POST y el foco al siguiente «Agregar»", async () => {
    const { control, fetchMock } = crearServidor(0, CANDIDATOS)
    let soltar: () => void = () => undefined
    control.demoraPost = new Promise<void>((resolver) => {
      soltar = resolver
    })
    renderVista("alumnos")
    fireEvent.change(campo(), { target: { value: "nora" } })
    const boton = await agregarDe("Nora Uno")
    pulsar(boton)
    await esperar(30)
    pulsar(boton)
    await act(async () => {
      soltar()
      await Promise.resolve()
    })
    await waitFor(() =>
      expect(focoEn()).toBe(screen.getByRole("button", { name: "Agregar a la clase Nora Dos" })),
    )
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1)
  })

  it("escribir un término nuevo mientras se agrega: el foco se queda en el campo", async () => {
    const { control } = crearServidor(0, [...CANDIDATOS, { n: 204, nombre: "Pita Cuatro" }])
    let soltar: () => void = () => undefined
    control.demoraPost = new Promise<void>((resolver) => {
      soltar = resolver
    })
    renderVista("alumnos")
    fireEvent.change(campo(), { target: { value: "nora" } })
    pulsar(await agregarDe("Nora Uno"))
    campo().focus()
    fireEvent.change(campo(), { target: { value: "pita" } })
    await screen.findByRole("button", { name: "Agregar a la clase Pita Cuatro" })
    await act(async () => {
      soltar()
      await Promise.resolve()
    })
    // El alta se completa (la fila del roster aparece) aunque la fila del buscador ya no esté.
    await screen.findByRole("cell", { name: "Nora Uno" })
    await esperar(50)
    expect(focoEn()).toBe(campo())
  })

  it("un render sin desmontaje (los candidatos se vuelven a pedir) no mueve el foco de «Agregar»", async () => {
    crearServidor(0, CANDIDATOS)
    const { queryClient } = renderVista("alumnos")
    fireEvent.change(campo(), { target: { value: "nora" } })
    const boton = await agregarDe("Nora Dos")
    boton.focus()
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ["clases", CLASE_ID, "candidatos"] })
    })
    await esperar(20)
    expect(focoEn()).toBe(boton)
  })
})

describe("ataque CLASES-b r4: T-26 en el roster y en personas", { timeout: 30000 }, () => {
  const primeraNueva = (vista: "alumnos" | "personas", n: number) =>
    vista === "alumnos"
      ? screen.getByRole("button", { name: `Quitar ${nombreDe(n)}` })
      : screen.getByText(nombreDe(n)).closest("li")
  const encabezado = (vista: "alumnos" | "personas") =>
    vista === "alumnos"
      ? screen.getByRole("heading", { name: "Alumnos" })
      : screen.getByRole("heading", { name: "Alumnos" })

  it.each(["alumnos", "personas"] as const)(
    "%s: con más páginas el botón sigue montado y el foco no se mueve; en la última página va al primer elemento nuevo",
    async (vista) => {
      crearServidor(102)
      renderVista(vista)
      await screen.findAllByText(nombreDe(1))
      pulsar(await screen.findByRole("button", { name: "Ver más alumnos" }))
      await screen.findAllByText(nombreDe(100))
      await esperar(30)
      const verMas = screen.getByRole("button", { name: "Ver más alumnos" })
      expect(focoEn()).toBe(verMas)
      pulsar(verMas)
      await screen.findAllByText(nombreDe(101))
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: "Ver más alumnos" })).toBeNull(),
      )
      await waitFor(() => expect(focoEn()).toBe(primeraNueva(vista, 101)))
    },
  )

  it.each(["alumnos", "personas"] as const)(
    "%s: si la última página llega vacía, el foco va al encabezado «Alumnos»",
    async (vista) => {
      const { control } = crearServidor(52)
      renderVista(vista)
      await screen.findAllByText(nombreDe(1))
      control.paginaSiguienteVacia = true
      pulsar(await screen.findByRole("button", { name: "Ver más alumnos" }))
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: "Ver más alumnos" })).toBeNull(),
      )
      await waitFor(() => expect(focoEn()).toBe(encabezado(vista)))
    },
  )

  it("alumnos: si la consulta de la página siguiente falla, el foco va al encabezado", async () => {
    const { control } = crearServidor(52)
    renderVista("alumnos")
    await screen.findAllByText(nombreDe(1))
    control.fallarPaginaSiguiente = true
    pulsar(await screen.findByRole("button", { name: "Ver más alumnos" }))
    await waitFor(() => expect(screen.queryAllByText(nombreDe(1))).toHaveLength(0))
    await waitFor(() => expect(focoEn()).toBe(screen.getByRole("heading", { name: "Alumnos" })))
  })

  it("T-27: personas: si la consulta de la página siguiente falla, el foco no se pierde en <body>", async () => {
    const { control } = crearServidor(52)
    renderVista("personas")
    await screen.findAllByText(nombreDe(1))
    control.fallarPaginaSiguiente = true
    pulsar(await screen.findByRole("button", { name: "Ver más alumnos" }))
    await waitFor(() => expect(screen.queryAllByText(nombreDe(1))).toHaveLength(0))
    await esperar(30)
    expect(focoEn(), "el foco quedó en <body>").not.toBe(document.body)
    expect(focoEn()?.isConnected).toBe(true)
  })

  it.each(["alumnos", "personas"] as const)(
    "T-28: %s: con ratón en «Ver más alumnos» y después un clic fuera, un render sin desmontaje no mueve el foco",
    async (vista) => {
      const { control } = crearServidor(102)
      const { queryClient } = renderVista(vista)
      await screen.findAllByText(nombreDe(1))
      const verMas = await screen.findByRole("button", { name: "Ver más alumnos" })
      // Clic con ratón: el navegador le da el foco al botón; después, un clic en blanco lo quita.
      verMas.focus()
      verMas.blur()
      await esperar(20)
      expect(focoEn()).toBe(document.body)
      // Otra pestaña quita a un alumno y la lista se vuelve a pedir: los datos cambian (hay render),
      // pero el botón "Ver más alumnos" sigue montado.
      control.inscritos = control.inscritos.filter((id) => id !== idDe(2))
      await act(async () => {
        await queryClient.invalidateQueries({ queryKey: ["clases", CLASE_ID] })
      })
      await waitFor(() => expect(screen.queryAllByText(nombreDe(2))).toHaveLength(0))
      await esperar(30)
      expect(screen.getByRole("button", { name: "Ver más alumnos" })).toBeInTheDocument()
      expect(focoEn(), "el foco se movió sin que el botón se desmontara").toBe(document.body)
    },
  )
})
