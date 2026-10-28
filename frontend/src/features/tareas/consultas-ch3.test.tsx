import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { useState, type ReactNode } from "react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { DetalleTareaView } from "./detalle-tarea-view"
import { EditarTareaView } from "./editar-tarea-view"
import { EntregaDeAlumnoView } from "./entrega-de-alumno-view"
import { EntregasView } from "./entregas-view"

// CHORE-03 (03a): las consultas de features/tareas ante un 400 VALIDACION de un parámetro (el texto de
// zod, en inglés): la persona ve o recibe el genérico, nunca el texto del servidor ni su ruta. Los dos
// "Ver más" con aviso se prueban además con el camino "repetir el control" y la configuración de
// TanStack Query de app/providers.tsx (Providers, con retry: 1). Reloj fijo (solo Date). El servidor
// es un doble en memoria.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ALUMNO_ID = "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0301"
const RUTA_TAREA = `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const RUTA_MI_ENTREGA = `${RUTA_TAREA}/entrega`
const RUTA_MI_HILO = `${RUTA_MI_ENTREGA}/comentarios`
const RUTA_ENTREGAS = `${RUTA_TAREA}/entregas`
const RUTA_ALUMNO = `${RUTA_ENTREGAS}/${ALUMNO_ID}`
const RUTA_HILO_ALUMNO = `${RUTA_ALUMNO}/comentarios`
const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const SIN_ACCESO = "No tienes acceso a esta clase."
const ZOD = "limite: Too big: expected number"
const CURSOR = "cursor: el cursor no es válido"
const uuid = (n: number) => `9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`
const SIGUIENTE = uuid(901)

const DETALLE_ALUMNO = `/estudiante/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const EDITAR = `/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/editar`
const ENTREGAS = `/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/entregas`
const DE_ALUMNO = `${ENTREGAS}/${ALUMNO_ID}`

const tareaDoble = () => ({
  tarea: {
    id: TAREA_ID,
    titulo: "Ensayo final",
    instrucciones: "",
    fechaLimite: FUTURA,
    puntos: 80,
    aceptaTardias: true,
    requiereAdjuntos: true,
    version: 0,
    categoria: null,
    tema: null,
    rubrica: [],
    adjuntos: [],
    autor: { id: uuid(1), nombre: "Luis Pérez", administracion: false },
    creadoEn: "2030-01-01T15:30:00.000Z",
    actualizadoEn: "2030-01-01T15:30:00.000Z",
    puedeEditar: true,
    puedeBorrar: true,
  },
})

const miEntrega = {
  estado: "asignado",
  fechaEntrega: null,
  conRetraso: false,
  enlaces: [],
  adjuntos: [],
  puedeEntregar: true,
  puedeAnular: false,
  calificacion: null,
}

const entregaDeAlumno = {
  alumno: { id: ALUMNO_ID, nombre: "Ana Ruiz" },
  estado: "entregado",
  fechaEntrega: "2030-01-09T15:30:00.000Z",
  conRetraso: false,
  enlaces: [],
  adjuntos: [],
  version: 2,
  calificacion: null,
}

const fila = (n: number, nombre: string) => ({
  alumno: { id: uuid(300 + n), nombre },
  estado: "asignado",
  fechaEntrega: null,
  conRetraso: false,
})

const comentario = (n: number, texto: string) => ({
  id: uuid(100 + n),
  texto,
  autor: { id: uuid(2), nombre: "Ana Ruiz", administracion: false },
  creadoEn: "2030-01-09T10:00:00.000Z",
  propio: true,
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const validacion = (mensaje: string) =>
  respuestaJson(400, { error: { codigo: "VALIDACION", mensaje } })

interface Llamada {
  metodo: string
  url: string
}

// Lo que responde cada consulta; `null` = lo de siempre. Las segundas páginas (con cursor) responden
// la lista `siguientes` en orden y, al acabarse, bien.
interface Servidor {
  tarea: Response | null
  miEntrega: Response | null
  entregas: Response | null
  alumno: Response | null
  hilo: Response | null
  siguientes: (() => Response)[]
}

let servidor: Servidor
let llamadas: Llamada[] = []
let inesperadas: string[] = []

const conCursor = (url: string) => new URL(url, "http://local").searchParams.get("cursor")

const instalarServidor = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      llamadas.push({ metodo, url })
      if (metodo !== "GET") {
        inesperadas.push(`${metodo} ${url}`)
        return Promise.resolve(validacion("no esperada"))
      }
      if (url === RUTA_TAREA)
        return Promise.resolve(servidor.tarea ?? respuestaJson(200, tareaDoble()))
      if (url.endsWith("/categorias"))
        return Promise.resolve(respuestaJson(200, { categorias: [] }))
      if (url.endsWith("/temas")) {
        return Promise.resolve(respuestaJson(200, { temas: [], sinTema: 0 }))
      }
      if (url === RUTA_MI_ENTREGA) {
        return Promise.resolve(servidor.miEntrega ?? respuestaJson(200, { entrega: miEntrega }))
      }
      if (url === RUTA_ALUMNO) {
        return Promise.resolve(servidor.alumno ?? respuestaJson(200, { entrega: entregaDeAlumno }))
      }
      if (url.startsWith(`${RUTA_ENTREGAS}?`)) {
        if (conCursor(url) === SIGUIENTE) {
          const siguiente = servidor.siguientes.shift()
          if (siguiente !== undefined) return Promise.resolve(siguiente())
          return Promise.resolve(
            respuestaJson(200, {
              entregas: [fila(2, "Bruno Díaz")],
              total: 2,
              entregadas: 0,
              siguienteCursor: null,
            }),
          )
        }
        return Promise.resolve(
          servidor.entregas ??
            respuestaJson(200, {
              entregas: [fila(1, "Ana Ruiz")],
              total: 2,
              entregadas: 0,
              siguienteCursor: SIGUIENTE,
            }),
        )
      }
      if (url.startsWith(`${RUTA_MI_HILO}?`) || url.startsWith(`${RUTA_HILO_ALUMNO}?`)) {
        if (conCursor(url) === SIGUIENTE) {
          const siguiente = servidor.siguientes.shift()
          if (siguiente !== undefined) return Promise.resolve(siguiente())
          return Promise.resolve(
            respuestaJson(200, {
              comentarios: [comentario(2, "Segundo comentario")],
              siguienteCursor: null,
            }),
          )
        }
        return Promise.resolve(
          servidor.hilo ??
            respuestaJson(200, {
              comentarios: [comentario(1, "Primer comentario")],
              siguienteCursor: SIGUIENTE,
            }),
        )
      }
      inesperadas.push(`${metodo} ${url}`)
      return Promise.resolve(validacion("no esperada"))
    }),
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  servidor = {
    tarea: null,
    miEntrega: null,
    entregas: null,
    alumno: null,
    hilo: null,
    siguientes: [],
  }
  llamadas = []
  inesperadas = []
  instalarServidor()
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
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

// Sin reintentos, para la primera carga; con `Providers`, la configuración de producción.
const SinReintentos = ({ children }: { children: ReactNode }) => {
  const [cliente] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
  )
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
}

// La única función de montaje del módulo (R-01).
const montar = (ruta: string, Envoltura: (props: { children: ReactNode }) => ReactNode) =>
  render(
    <Envoltura>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route
            path="/estudiante/clases/:claseId/tareas/:tareaId"
            element={<DetalleTareaView />}
          />
          <Route
            path="/maestro/clases/:claseId/tareas/:tareaId/editar"
            element={<EditarTareaView />}
          />
          <Route
            path="/maestro/clases/:claseId/tareas/:tareaId/entregas"
            element={<EntregasView />}
          />
          <Route
            path="/maestro/clases/:claseId/tareas/:tareaId/entregas/:alumnoId"
            element={<EntregaDeAlumnoView />}
          />
        </Routes>
      </MemoryRouter>
    </Envoltura>,
  )

const avisos = () => aviso.error.mock.calls.map((llamada) => String(llamada[0]))

const sinTextoDelServidor = () => {
  expect(document.body).not.toHaveTextContent("Too big")
  expect(document.body).not.toHaveTextContent("limite:")
  for (const texto of avisos()) {
    expect(texto).not.toContain("Too big")
    expect(texto).not.toContain("limite")
  }
}

interface PrimeraCarga {
  nombre: string
  ruta: string
  fallar: (respuesta: Response) => void
}

const PRIMERAS_CARGAS: readonly PrimeraCarga[] = [
  {
    nombre: "la primera carga del detalle",
    ruta: DETALLE_ALUMNO,
    fallar: (r) => {
      servidor.tarea = r
    },
  },
  {
    nombre: "la primera carga de «Editar tarea»",
    ruta: EDITAR,
    fallar: (r) => {
      servidor.tarea = r
    },
  },
  {
    nombre: "la primera carga de la lista de entregas",
    ruta: ENTREGAS,
    fallar: (r) => {
      servidor.entregas = r
    },
  },
  {
    nombre: "la entrega de un alumno",
    ruta: DE_ALUMNO,
    fallar: (r) => {
      servidor.alumno = r
    },
  },
  {
    nombre: "la primera carga del hilo",
    ruta: DETALLE_ALUMNO,
    fallar: (r) => {
      servidor.hilo = r
    },
  },
  {
    nombre: "«Tu trabajo»",
    ruta: DETALLE_ALUMNO,
    fallar: (r) => {
      servidor.miEntrega = r
    },
  },
]

describe("CHORE-03 · consultas de tareas ante un VALIDACION de un parámetro", () => {
  it.each(PRIMERAS_CARGAS)(
    "CH3-A17: $nombre con «limite: Too big: expected number» muestra el genérico, nunca el texto en inglés ni la ruta",
    async ({ ruta, fallar }) => {
      fallar(validacion(ZOD))
      montar(ruta, SinReintentos)

      expect(await screen.findByText(GENERICO)).toBeInTheDocument()
      await reposar()
      sinTextoDelServidor()
      expect(inesperadas).toEqual([])
    },
  )

  it.each(PRIMERAS_CARGAS)(
    "CH3-A17: $nombre con «claseId: x» sigue dando «No tienes acceso a esta clase.»",
    async ({ ruta, fallar }) => {
      fallar(validacion("claseId: x"))
      montar(ruta, SinReintentos)

      expect((await screen.findAllByText(SIN_ACCESO)).length).toBeGreaterThan(0)
      await reposar()
      expect(document.body).not.toHaveTextContent("claseId")
      expect(inesperadas).toEqual([])
    },
  )

  it.each([
    ["«Ver más alumnos» de la lista de entregas", ENTREGAS, "Ver más alumnos"],
    ["«Ver más comentarios» del hilo del alumno", DETALLE_ALUMNO, "Ver más comentarios"],
    ["«Ver más comentarios» del hilo de un alumno", DE_ALUMNO, "Ver más comentarios"],
  ])(
    "CH3-A17: %s con «limite: Too big: expected number» avisa una vez con el genérico",
    async (_nombre, ruta, boton) => {
      servidor.siguientes = [() => validacion(ZOD)]
      montar(ruta, SinReintentos)
      fireEvent.click(await screen.findByRole("button", { name: boton }))

      await waitFor(() => expect(avisos()).toEqual([GENERICO]))
      await reposar()
      expect(avisos()).toEqual([GENERICO])
      sinTextoDelServidor()
      expect(inesperadas).toEqual([])
    },
  )
})

// Repetir el control (Enmienda 1, M-03): la página siguiente falla con su reintento; el botón sigue y
// sale de la espera, lo cargado sigue; al pulsarlo otra vez se pide de nuevo la misma página y no hay
// un segundo aviso.
const pedidasDeLaSiguiente = (ruta: string) =>
  llamadas.filter((l) => l.url.startsWith(`${ruta}?`) && conCursor(l.url) === SIGUIENTE)

const repetirElControl = async (opciones: {
  ruta: string
  rutaDeLaLista: string
  boton: string
  error: string
  cargado: string
  siguiente: string
}) => {
  servidor.siguientes = [() => validacion(opciones.error), () => validacion(opciones.error)]
  montar(opciones.ruta, Providers)
  const boton = await screen.findByRole("button", { name: opciones.boton })
  expect(screen.getAllByText(opciones.cargado).length).toBeGreaterThan(0)

  fireEvent.click(boton)
  await waitFor(() => expect(avisos()).toEqual([GENERICO]), { timeout: 5_000 })
  await reposar()

  expect(pedidasDeLaSiguiente(opciones.rutaDeLaLista)).toHaveLength(2)
  expect(avisos()).toEqual([GENERICO])
  const deNuevo = screen.getByRole("button", { name: opciones.boton })
  expect(deNuevo).not.toHaveAttribute("aria-busy", "true")
  expect(deNuevo).not.toHaveAttribute("aria-disabled", "true")
  expect(screen.getAllByText(opciones.cargado).length).toBeGreaterThan(0)
  sinTextoDelServidor()

  fireEvent.click(deNuevo)
  expect((await screen.findAllByText(opciones.siguiente)).length).toBeGreaterThan(0)
  await reposar()

  expect(pedidasDeLaSiguiente(opciones.rutaDeLaLista)).toHaveLength(3)
  expect(avisos()).toEqual([GENERICO])
  expect(screen.getAllByText(opciones.cargado).length).toBeGreaterThan(0)
  expect(inesperadas).toEqual([])
}

describe("CHORE-03 · repetir el control en los «Ver más» con aviso (Providers)", () => {
  it("CH3-A21: «Ver más alumnos» de la lista de entregas: un aviso genérico tras el reintento, el botón sigue y, al repetir, se pide de nuevo la página sin un segundo aviso", async () => {
    await repetirElControl({
      ruta: ENTREGAS,
      rutaDeLaLista: RUTA_ENTREGAS,
      boton: "Ver más alumnos",
      error: ZOD,
      cargado: "Ana Ruiz",
      siguiente: "Bruno Díaz",
    })
    const tabla = screen.getByRole("table")
    expect(within(tabla).getAllByText("Bruno Díaz").length).toBeGreaterThan(0)
  })

  it.each([
    ["del alumno", DETALLE_ALUMNO, RUTA_MI_HILO, ZOD],
    ["de un alumno, para el maestro", DE_ALUMNO, RUTA_HILO_ALUMNO, ZOD],
    ["del alumno, con el cursor que el hilo no reconoce", DETALLE_ALUMNO, RUTA_MI_HILO, CURSOR],
    ["de un alumno, con el cursor que el hilo no reconoce", DE_ALUMNO, RUTA_HILO_ALUMNO, CURSOR],
  ])(
    "CH3-A22: «Ver más comentarios» del hilo %s: un aviso genérico tras el reintento, el botón sigue y, al repetir, se pide de nuevo la página sin un segundo aviso",
    async (_nombre, ruta, rutaDeLaLista, error) => {
      await repetirElControl({
        ruta,
        rutaDeLaLista,
        boton: "Ver más comentarios",
        error,
        cargado: "Primer comentario",
        siguiente: "Segundo comentario",
      })
      expect(document.body).not.toHaveTextContent("el cursor no es válido")
    },
  )
})
