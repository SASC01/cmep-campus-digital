import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { EntregaDeAlumnoView } from "./entrega-de-alumno-view"

// Ataque (CALIFICACIONES-01c, ronda 2): M-06 y sus vecinos. Recargas de fondo que cambian la forma del
// árbol del panel con el formulario abierto (la nota aparece o desaparece, la entrega pasa a calificada
// o entregada, la tarea cambia puntos, rúbrica, fecha límite o si acepta tardías): el formulario es el
// mismo nodo, lo escrito y la versión de apertura sobreviven y el guardado recibe el 409 y sigue el
// camino probado. Si la entrega deja de ser calificable, el formulario se va (§D-14) y el foco no cae
// en <body>. Reloj fijo (solo Date). El servidor es un doble en memoria.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const PASADA = "2030-01-05T16:00:00.000Z"
const OTRA_PASADA = "2030-01-07T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ALUMNO_ID = "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0301"
const CRITERIO_1 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d81"
const CRITERIO_2 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d82"
const CRITERIO_3 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d83"
const RUTA_TAREA = `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const RUTA_ALUMNO = `${RUTA_TAREA}/entregas/${ALUMNO_ID}`
const RUTA_CALIFICACION = `${RUTA_ALUMNO}/calificacion`
const CLARIDAD = "Claridad (de 5 puntos)"
const ORTOGRAFIA = "Ortografía (de 4 puntos)"
const PUNTUALIDAD = "Puntualidad (de 1 punto)"
const COMENTARIO = "Comentario para el alumno (opcional)"
const NOTA = "Este alumno no entregó la tarea y la entrega ya está cerrada."
const PODRAS = "Podrás calificar cuando el alumno entregue o cuando se cierre la entrega."
const MENSAJE_MODIFICADA =
  "La entrega cambió mientras la calificabas: el alumno la anuló o la volvió a entregar, u otra persona la calificó. No se guardó tu calificación; revisa la entrega actual."
const MENSAJE_RUBRICA =
  "La rúbrica o los puntos de la tarea cambiaron mientras calificabas. No se guardó tu calificación; vuelve a calificar con la versión actual."

const RUBRICA = [
  { id: CRITERIO_1, criterio: "Claridad", puntosMax: 5 },
  { id: CRITERIO_2, criterio: "Ortografía", puntosMax: 4 },
]
const RUBRICA_NUEVA = [...RUBRICA, { id: CRITERIO_3, criterio: "Puntualidad", puntosMax: 1 }]

const tareaDoble = (extra: Record<string, unknown> = {}) => ({
  tarea: {
    id: TAREA_ID,
    titulo: "Ensayo final",
    instrucciones: "",
    fechaLimite: FUTURA,
    puntos: 10,
    aceptaTardias: true,
    requiereAdjuntos: true,
    version: 0,
    categoria: null,
    tema: null,
    rubrica: RUBRICA,
    adjuntos: [],
    autor: {
      id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
      nombre: "Luis Pérez",
      administracion: false,
    },
    creadoEn: "2030-01-01T15:30:00.000Z",
    actualizadoEn: "2030-01-01T15:30:00.000Z",
    puedeEditar: true,
    puedeBorrar: true,
    ...extra,
  },
})

const entregaDoble = (extra: Record<string, unknown> = {}) => ({
  alumno: { id: ALUMNO_ID, nombre: "Ana Ruiz" },
  estado: "entregado",
  fechaEntrega: "2030-01-09T15:30:00.000Z",
  conRetraso: false,
  enlaces: [],
  adjuntos: [],
  version: 2,
  calificacion: null,
  ...extra,
})

const SIN_ENTREGA = { estado: "asignado", fechaEntrega: null, conRetraso: false }
const CERRADA = { fechaLimite: PASADA, aceptaTardias: false }
const calificadaPorOtro = (version: number) => ({
  estado: "calificado",
  version,
  calificacion: {
    puntos: 2,
    sobre: 10,
    fecha: "2030-01-10T11:00:00.000Z",
    puntajes: [
      { criterioId: CRITERIO_1, criterio: "Claridad", puntosMax: 5, puntos: 1 },
      { criterioId: CRITERIO_2, criterio: "Ortografía", puntosMax: 4, puntos: 1 },
    ],
  },
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorApi = (estado: number, codigo: string, mensaje = "x") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface Llamada {
  metodo: string
  url: string
  cuerpo: unknown
}

let tarea: Record<string, unknown> = {}
let entrega: Record<string, unknown> = {}
let calificar: () => Response = () => errorApi(500, "ERROR_INTERNO")
let llamadas: Llamada[] = []
let inesperadas: string[] = []

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  llamadas = []
  inesperadas = []
  tarea = {}
  entrega = {}
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null
      llamadas.push({ metodo, url, cuerpo })
      if (metodo === "GET" && url === RUTA_TAREA) {
        return Promise.resolve(respuestaJson(200, tareaDoble(tarea)))
      }
      if (metodo === "GET" && url === RUTA_ALUMNO) {
        return Promise.resolve(respuestaJson(200, { entrega: entregaDoble(entrega) }))
      }
      if (metodo === "GET" && url.includes("/comentarios?")) {
        return Promise.resolve(respuestaJson(200, { comentarios: [], siguienteCursor: null }))
      }
      if (metodo === "PUT" && url === RUTA_CALIFICACION) return Promise.resolve(calificar())
      inesperadas.push(`${metodo} ${url}`)
      return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
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

const renderVista = async () => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const base = "/maestro/clases/:claseId/tareas/:tareaId/entregas"
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter
        initialEntries={[`/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/entregas/${ALUMNO_ID}`]}
      >
        <Routes>
          <Route path={`${base}/:alumnoId`} element={<EntregaDeAlumnoView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByRole("heading", { name: "Calificación", level: 3 })
  await sinPeticionesEnVuelo(cliente)
  return cliente
}

const sinPeticionesEnVuelo = async (cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isFetching() + cliente.isMutating()).toBe(0))
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const recargarDeFondo = async (cliente: QueryClient) => {
  vi.setSystemTime(new Date(Date.now() + 5_000))
  await act(() => cliente.invalidateQueries())
  await sinPeticionesEnVuelo(cliente)
}

const campo = (nombre: string) => screen.getByLabelText(nombre)
const escribir = (nombre: string, valor: string) =>
  fireEvent.change(campo(nombre), { target: { value: valor } })
const encabezado = () => screen.getByRole("heading", { name: "Calificación", level: 3 })
const deCalificar = () => llamadas.filter((l) => l.metodo === "PUT" && l.url === RUTA_CALIFICACION)
const avisos = () => aviso.error.mock.calls.map((llamada) => llamada[0] as unknown)

const fueraDeBody = () => {
  const activo = document.activeElement
  if (!(activo instanceof HTMLElement) || activo === document.body) {
    throw new Error("El foco quedó en <body>")
  }
  return activo
}

type Cambio = Record<string, unknown>

// [nombre, tarea de apertura, entrega de apertura, tarea tras la recarga, entrega tras la recarga,
//  409 que da el guardado, botón tras el reinicio, ¿el reinicio trae el tercer criterio?]
const TRANSICIONES = [
  [
    "asignado cerrada → calificada por otra persona",
    CERRADA,
    SIN_ENTREGA,
    CERRADA,
    calificadaPorOtro(3),
    ["ENTREGA_MODIFICADA", MENSAJE_MODIFICADA],
    "Actualizar calificación",
    false,
  ],
  [
    "asignado cerrada → la tarea cambia puntos, rúbrica y fecha (sigue cerrada)",
    CERRADA,
    SIN_ENTREGA,
    { fechaLimite: OTRA_PASADA, aceptaTardias: false, puntos: 20, rubrica: RUBRICA_NUEVA },
    SIN_ENTREGA,
    ["RUBRICA_MODIFICADA", MENSAJE_RUBRICA],
    "Calificar y devolver",
    true,
  ],
  [
    "asignado cerrada → calificada por otra persona y la tarea a 20 puntos a la vez",
    CERRADA,
    SIN_ENTREGA,
    { ...CERRADA, puntos: 20 },
    calificadaPorOtro(3),
    ["ENTREGA_MODIFICADA", MENSAJE_MODIFICADA],
    "Actualizar calificación",
    false,
  ],
  [
    "asignado cerrada → la tarea acepta tardías y el alumno entrega tarde a la vez",
    CERRADA,
    SIN_ENTREGA,
    { fechaLimite: PASADA, aceptaTardias: true },
    { estado: "entregado", version: 3, fechaEntrega: "2030-01-10T11:30:00.000Z", conRetraso: true },
    ["ENTREGA_MODIFICADA", MENSAJE_MODIFICADA],
    "Calificar y devolver",
    false,
  ],
  [
    "entregada → calificada por otra persona",
    {},
    {},
    {},
    calificadaPorOtro(3),
    ["ENTREGA_MODIFICADA", MENSAJE_MODIFICADA],
    "Actualizar calificación",
    false,
  ],
  [
    "entregada → la tarea se cierra sin tardías y cambia de rúbrica",
    {},
    {},
    { ...CERRADA, rubrica: RUBRICA_NUEVA },
    {},
    ["RUBRICA_MODIFICADA", MENSAJE_RUBRICA],
    "Calificar y devolver",
    true,
  ],
  [
    "entregada → el alumno la vuelve a entregar (otra versión, con retraso)",
    { fechaLimite: PASADA, aceptaTardias: true },
    {},
    { fechaLimite: PASADA, aceptaTardias: true },
    { version: 3, fechaEntrega: "2030-01-10T11:30:00.000Z", conRetraso: true },
    ["ENTREGA_MODIFICADA", MENSAJE_MODIFICADA],
    "Calificar y devolver",
    false,
  ],
] as const satisfies readonly (readonly [
  string,
  Cambio,
  Cambio,
  Cambio,
  Cambio,
  readonly [string, string],
  string,
  boolean,
])[]

describe("ataque 01c r2 · recargas de fondo que cambian la forma del panel (M-06)", () => {
  it.each(TRANSICIONES)(
    "CAL-T-117: %s: el formulario es el mismo nodo, conserva el foco, lo escrito y la versión de apertura; el guardado recibe el 409 y sigue su camino (un aviso, reinicio y foco en el h3)",
    async (
      _nombre,
      tareaInicial,
      entregaInicial,
      tareaDespues,
      entregaDespues,
      [codigo, mensaje],
      botonTrasReinicio,
      conTercerCriterio,
    ) => {
      tarea = tareaInicial
      entrega = entregaInicial
      const cliente = await renderVista()
      const claridad = campo(CLARIDAD)
      escribir(CLARIDAD, "4")
      escribir(ORTOGRAFIA, "3")
      escribir(COMENTARIO, "Lo que escribí")
      claridad.focus()

      tarea = tareaDespues
      entrega = entregaDespues
      await recargarDeFondo(cliente)

      expect(campo(CLARIDAD)).toBe(claridad)
      expect(claridad).toHaveFocus()
      expect(claridad).toHaveValue("4")
      expect(campo(ORTOGRAFIA)).toHaveValue("3")
      expect(campo(COMENTARIO)).toHaveValue("Lo que escribí")
      expect(screen.queryByLabelText(PUNTUALIDAD)).not.toBeInTheDocument()
      expect(screen.queryByText(PODRAS)).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Calificar y devolver" })).toBeInTheDocument()
      expect(avisos()).toEqual([])

      calificar = () => errorApi(409, codigo, mensaje)
      vi.setSystemTime(new Date(Date.now() + 5_000))
      const boton = screen.getByRole("button", { name: "Calificar y devolver" })
      boton.focus()
      fireEvent.click(boton)
      await waitFor(() => expect(deCalificar()).toHaveLength(1))
      await waitFor(() => expect(encabezado()).toHaveFocus())
      await sinPeticionesEnVuelo(cliente)

      expect(deCalificar()[0]?.cuerpo).toMatchObject({
        version: 2,
        puntosDeLaTarea: 10,
        puntajes: [
          { criterioId: CRITERIO_1, puntos: 4 },
          { criterioId: CRITERIO_2, puntos: 3 },
        ],
        comentario: "Lo que escribí",
      })
      expect(avisos()).toEqual([mensaje])
      expect(encabezado()).toHaveFocus()
      expect(screen.getByRole("button", { name: botonTrasReinicio })).toBeInTheDocument()
      if (conTercerCriterio) {
        expect(campo(PUNTUALIDAD)).toHaveValue("")
      } else {
        expect(screen.queryByLabelText(PUNTUALIDAD)).not.toBeInTheDocument()
      }
      expect(campo(COMENTARIO)).toHaveValue("")
      // La nota solo sigue si la entrega vigente es la de quien no entregó.
      const sigueSinEntregar = "estado" in entregaDespues && entregaDespues.estado === "asignado"
      expect(screen.queryAllByText(NOTA)).toHaveLength(sigueSinEntregar ? 1 : 0)
      expect(inesperadas).toEqual([])
    },
  )
})

describe("ataque 01c r2 · la recarga que vuelve no calificable la entrega cerrada (vecino de M-06)", () => {
  it.each([
    ["la fecha límite pasa al futuro", { fechaLimite: FUTURA, aceptaTardias: false }],
    ["la tarea empieza a aceptar tardías", { fechaLimite: PASADA, aceptaTardias: true }],
  ] as const)(
    "CAL-T-118: con el formulario de una entrega cerrada sin entregar, %s: el formulario se va sin aviso, el foco no cae en <body>; al cerrarse otra vez nace un formulario nuevo con la versión vigente",
    async (_nombre, reabierta) => {
      tarea = CERRADA
      entrega = SIN_ENTREGA
      const cliente = await renderVista()
      expect(screen.getByText(NOTA)).toBeInTheDocument()
      escribir(CLARIDAD, "4")
      campo(CLARIDAD).focus()

      tarea = reabierta
      await recargarDeFondo(cliente)

      expect(screen.queryByLabelText(CLARIDAD)).not.toBeInTheDocument()
      expect(screen.getByText(PODRAS)).toBeInTheDocument()
      expect(screen.queryByText(NOTA)).not.toBeInTheDocument()
      fueraDeBody()
      expect(avisos()).toEqual([])

      tarea = CERRADA
      entrega = { ...SIN_ENTREGA, version: 5 }
      await recargarDeFondo(cliente)

      expect(campo(CLARIDAD)).toHaveValue("")
      expect(screen.getByText(NOTA)).toBeInTheDocument()
      calificar = () => errorApi(500, "ERROR_INTERNO")
      escribir(CLARIDAD, "1")
      escribir(ORTOGRAFIA, "1")
      vi.setSystemTime(new Date(Date.now() + 5_000))
      fireEvent.click(screen.getByRole("button", { name: "Calificar y devolver" }))
      await waitFor(() => expect(deCalificar()).toHaveLength(1))
      await sinPeticionesEnVuelo(cliente)
      expect(deCalificar()[0]?.cuerpo).toMatchObject({ version: 5 })
      expect(inesperadas).toEqual([])
    },
  )
})
