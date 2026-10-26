import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { Link, MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveTarea } from "@/services/trabajoService"

import { DetalleTareaView } from "./detalle-tarea-view"
import { EditarTareaView } from "./editar-tarea-view"
import { EntregaDeAlumnoView } from "./entrega-de-alumno-view"
import { EntregasView } from "./entregas-view"

// Ataque (CALIFICACIONES-01c, ronda 2): los remedios de T-03 y M-07 (el parámetro `callado` de
// useAvisoDeRecargaFallida) y sus vecinos. Todos los cruces de la recarga tras un 409, el conteo de
// avisos en la vista y en la siguiente (lista, detalle, editar, la misma entrega), salir durante la
// recarga, dos fallos seguidos, un éxito de la tarea antes de salir, la caché fresca (N-35) y las vistas
// de TAREAS y ENTREGAS sin `callado`. Reloj fijo (solo Date). El servidor es un doble en memoria.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ALUMNO_ID = "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0301"
const OTRO_ALUMNO_ID = "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0302"
const CRITERIO_1 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d81"
const CRITERIO_2 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d82"
const RUTA_TAREA = `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const RUTA_ALUMNO = `${RUTA_TAREA}/entregas/${ALUMNO_ID}`
const RUTA_OTRO_ALUMNO = `${RUTA_TAREA}/entregas/${OTRO_ALUMNO_ID}`
const RUTA_CALIFICACION = `${RUTA_ALUMNO}/calificacion`
const BASE_UI = `/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const UI_ENTREGA = `${BASE_UI}/entregas/${ALUMNO_ID}`
const UI_OTRA_ENTREGA = `${BASE_UI}/entregas/${OTRO_ALUMNO_ID}`
const UI_LISTA = `${BASE_UI}/entregas`
const UI_DETALLE = BASE_UI
const UI_EDITAR = `${BASE_UI}/editar`
const MENSAJE_RUBRICA =
  "La rúbrica o los puntos de la tarea cambiaron mientras calificabas. No se guardó tu calificación; vuelve a calificar con la versión actual."
const MENSAJE_NO_CALIFICABLE =
  "Este alumno todavía puede entregar. Podrás calificarlo cuando entregue o cuando se cierre la entrega."
const AVISO_TAREA = "No pudimos actualizar la tarea. Mostramos la última versión que tenemos."
const AVISO_EDITAR = "No pudimos actualizar la tarea. Puedes seguir editando; revisa tu conexión."
const AVISO_RECARGA_ENTREGA =
  "No pudimos cargar la entrega actual. Revisa tu conexión e inténtalo de nuevo."
const SIN_ALUMNO = "No encontramos a ese alumno en esta clase."
const SIN_TAREA = "Esa tarea ya no existe."
const SIN_ACCESO = "No tienes acceso a esta clase."
const CLARIDAD = "Claridad (de 5 puntos)"
const ORTOGRAFIA = "Ortografía (de 4 puntos)"

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
    rubrica: [
      { id: CRITERIO_1, criterio: "Claridad", puntosMax: 5 },
      { id: CRITERIO_2, criterio: "Ortografía", puntosMax: 4 },
    ],
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

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorApi = (estado: number, codigo: string, mensaje = "x") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const tareaBien = () => respuestaJson(200, tareaDoble())
const tareaEn500 = () => errorApi(500, "ERROR_INTERNO", "falló")
const entregaBien = () => respuestaJson(200, { entrega: entregaDoble() })
const entregaEn404 = () => errorApi(404, "ALUMNO_NO_ENCONTRADO", "x")
const sinConexion = () => Promise.reject(new TypeError("Failed to fetch"))

interface Llamada {
  metodo: string
  url: string
}

type Respuesta = () => Response | Promise<Response>

interface Servidor {
  tarea: Respuesta
  entrega: Respuesta
  otraEntrega: Respuesta
  calificar: Respuesta
}

let servidor: Servidor
let llamadas: Llamada[] = []
let inesperadas: string[] = []

const instalarServidor = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      llamadas.push({ metodo, url })
      if (metodo === "GET" && url === RUTA_TAREA) return Promise.resolve(servidor.tarea())
      if (metodo === "GET" && url === RUTA_ALUMNO) return Promise.resolve(servidor.entrega())
      if (metodo === "GET" && url === RUTA_OTRO_ALUMNO) {
        return Promise.resolve(servidor.otraEntrega())
      }
      if (metodo === "GET" && url.includes("/comentarios?")) {
        return Promise.resolve(respuestaJson(200, { comentarios: [], siguienteCursor: null }))
      }
      if (metodo === "GET" && url.startsWith(`${RUTA_TAREA}/entregas?`)) {
        return Promise.resolve(
          respuestaJson(200, { entregas: [], total: 0, entregadas: 0, siguienteCursor: null }),
        )
      }
      if (metodo === "GET" && url.endsWith("/categorias")) {
        return Promise.resolve(respuestaJson(200, { categorias: [] }))
      }
      if (metodo === "GET" && url.endsWith("/temas")) {
        return Promise.resolve(respuestaJson(200, { temas: [], sinTema: 0 }))
      }
      if (metodo === "PUT" && url === RUTA_CALIFICACION) {
        return Promise.resolve(servidor.calificar())
      }
      inesperadas.push(`${metodo} ${url}`)
      return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
}

const nuevoCliente = (staleTime = 0) =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime }, mutations: { retry: false } },
  })

// Todas las vistas de la tarea en el mismo router, como en router.tsx. El enlace de fuera de las rutas
// solo existe para CAL-T-108 (la interfaz no tiene enlace de una entrega a otra).
const montar = (cliente: QueryClient, ruta: string) => {
  const base = "/maestro/clases/:claseId/tareas/:tareaId"
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[ruta]}>
        <Link to={UI_OTRA_ENTREGA}>Ir a otra entrega (solo prueba)</Link>
        <Routes>
          <Route path={base} element={<DetalleTareaView />} />
          <Route path={`${base}/editar`} element={<EditarTareaView />} />
          <Route path={`${base}/entregas`} element={<EntregasView />} />
          <Route path={`${base}/entregas/:alumnoId`} element={<EntregaDeAlumnoView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const deLaTarea = () => llamadas.filter((l) => l.metodo === "GET" && l.url === RUTA_TAREA)
const deLaEntrega = () => llamadas.filter((l) => l.metodo === "GET" && l.url === RUTA_ALUMNO)

const diferida = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver: (respuesta: Response) => resolver(respuesta) }
}

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const sinPeticionesEnVuelo = async (cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isFetching() + cliente.isMutating()).toBe(0))
  await reposar()
}

const avanzar = (ms: number) => vi.setSystemTime(new Date(Date.now() + ms))

const avisos = () => aviso.error.mock.calls.map((llamada) => llamada[0] as unknown)

const fueraDeBody = () => {
  const activo = document.activeElement
  if (!(activo instanceof HTMLElement) || activo === document.body) {
    throw new Error("El foco quedó en <body>")
  }
  return activo
}

// La entrega del alumno con el panel listo y nada en vuelo.
const abrirEntrega = async (cliente: QueryClient) => {
  montar(cliente, UI_ENTREGA)
  await screen.findByLabelText(CLARIDAD)
  await sinPeticionesEnVuelo(cliente)
}

const escribirYCalificar = () => {
  fireEvent.change(screen.getByLabelText(CLARIDAD), { target: { value: "4" } })
  fireEvent.change(screen.getByLabelText(ORTOGRAFIA), { target: { value: "3" } })
  avanzar(5_000)
  const boton = screen.getByRole("button", { name: "Calificar y devolver" })
  boton.focus()
  fireEvent.click(boton)
}

// Recarga de fondo de todo (la tarea y, por su prefijo, la entrega), esperada.
const recargarTodo = async (cliente: QueryClient) => {
  avanzar(5_000)
  await act(() => cliente.invalidateQueries())
  await sinPeticionesEnVuelo(cliente)
}

// Recarga de fondo solo de la tarea (la consulta exacta), sin marcarla invalidada.
const recargarSoloLaTarea = async (cliente: QueryClient) => {
  avanzar(5_000)
  await act(() => cliente.refetchQueries({ queryKey: claveTarea(CLASE_ID, TAREA_ID), exact: true }))
  await sinPeticionesEnVuelo(cliente)
}

// Fallo de la tarea callado por la entrega que reemplaza la vista (tarea 500, entrega 404).
const fallarCallado = async (cliente: QueryClient) => {
  servidor.tarea = tareaEn500
  servidor.entrega = entregaEn404
  await recargarTodo(cliente)
  expect(screen.getByText(SIN_ALUMNO)).toBeInTheDocument()
}

// Desmonta la vista y monta otra con la misma caché (como navegar dentro de la SPA). Solo cuenta los
// avisos de la vista nueva.
const irA = async (cliente: QueryClient, ruta: string) => {
  cleanup()
  aviso.error.mockClear()
  avanzar(60_000)
  montar(cliente, ruta)
  await sinPeticionesEnVuelo(cliente)
}

const LO_QUE_SE_VE = {
  lista: () => screen.getByRole("heading", { name: "Entregas", level: 2 }),
  detalle: () => screen.getByRole("heading", { name: "Ensayo final", level: 2 }),
  editar: () => screen.getByLabelText(/^Título/),
  entrega: () => screen.getByLabelText(CLARIDAD),
} as const

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  llamadas = []
  inesperadas = []
  servidor = {
    tarea: tareaBien,
    entrega: entregaBien,
    otraEntrega: () =>
      respuestaJson(200, {
        entrega: entregaDoble({ alumno: { id: OTRO_ALUMNO_ID, nombre: "Bruno Díaz" }, version: 7 }),
      }),
    calificar: () => errorApi(409, "RUBRICA_MODIFICADA", MENSAJE_RUBRICA),
  }
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

const sinInesperadas = () =>
  expect(inesperadas, "el doble recibió peticiones que no conoce").toEqual([])

const CODIGOS_409 = [
  ["RUBRICA_MODIFICADA", MENSAJE_RUBRICA],
  ["ENTREGA_NO_CALIFICABLE", MENSAJE_NO_CALIFICABLE],
] as const

type Cruce = readonly [string, Respuesta, Respuesta, string | null, readonly string[]]

// [nombre, tarea, entrega, texto que reemplaza la vista (null: el panel sigue), avisos tras el del 409]
const CRUCES: readonly Cruce[] = [
  [
    "tarea 404 y entrega 5xx",
    () => errorApi(404, "TAREA_NO_ENCONTRADA"),
    () => errorApi(500, "ERROR_INTERNO"),
    SIN_TAREA,
    [],
  ],
  ["las dos 404", () => errorApi(404, "TAREA_NO_ENCONTRADA"), entregaEn404, SIN_TAREA, []],
  [
    "tarea 5xx y entrega 403 SIN_ACCESO_A_LA_CLASE",
    tareaEn500,
    () => errorApi(403, "SIN_ACCESO_A_LA_CLASE"),
    SIN_ACCESO,
    [],
  ],
  [
    "tarea 5xx y entrega 400 VALIDACION de alumnoId",
    tareaEn500,
    () => errorApi(400, "VALIDACION", "alumnoId: Invalid UUID"),
    SIN_ALUMNO,
    [],
  ],
  [
    "tarea 503 SERVICIO_OCUPADO y entrega 404",
    () => errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado."),
    entregaEn404,
    SIN_ALUMNO,
    [],
  ],
  ["tarea sin conexión y entrega 404", sinConexion, entregaEn404, SIN_ALUMNO, []],
  ["las dos 5xx", tareaEn500, () => errorApi(500, "ERROR_INTERNO"), null, [AVISO_TAREA]],
]

describe("ataque 01c r2 · cruces de la recarga tras un 409 (T-03)", () => {
  const casos = CODIGOS_409.flatMap(([codigo, mensaje]) =>
    CRUCES.map((cruce) => [codigo, mensaje, ...cruce] as const),
  )

  it.each(casos)(
    "CAL-T-101: %s con %s: la vista queda como dice §D-14, el foco nunca en <body> y los avisos son exactamente el del 409 y los de la fila",
    async (codigo, mensaje, _nombre, tarea, entrega, reemplazo, despues) => {
      const cliente = nuevoCliente()
      servidor.calificar = () => errorApi(409, codigo, mensaje)
      await abrirEntrega(cliente)
      servidor.tarea = tarea
      servidor.entrega = entrega

      escribirYCalificar()

      await waitFor(() => expect(deLaTarea()).toHaveLength(2))
      await sinPeticionesEnVuelo(cliente)
      if (reemplazo === null) {
        expect(screen.getByLabelText(CLARIDAD)).toHaveValue("4")
        expect(screen.getByRole("button", { name: "Calificar y devolver" })).not.toHaveAttribute(
          "aria-busy",
          "true",
        )
      } else {
        expect(screen.getByText(reemplazo)).toBeInTheDocument()
        expect(screen.queryByLabelText(CLARIDAD)).not.toBeInTheDocument()
      }
      fueraDeBody()
      expect(avisos()).toEqual([mensaje, ...despues])
      expect(avisos()).not.toContain(AVISO_RECARGA_ENTREGA)
      sinInesperadas()
    },
  )
})

describe("ataque 01c r2 · la vista siguiente tras cada cruce (M-07)", () => {
  const casos = [
    ["tarea 5xx y entrega 404", entregaEn404, tareaEn500, 500],
    ["tarea 5xx y entrega 404", entregaEn404, tareaEn500, 200],
    ["tarea 5xx y entrega 403", () => errorApi(403, "SIN_ACCESO_A_LA_CLASE"), tareaEn500, 500],
    ["tarea 5xx y entrega 403", () => errorApi(403, "SIN_ACCESO_A_LA_CLASE"), tareaEn500, 200],
    ["tarea sin conexión y entrega 404", entregaEn404, sinConexion, 500],
    ["tarea sin conexión y entrega 404", entregaEn404, sinConexion, 200],
  ] as const

  it.each(casos)(
    "CAL-T-102: tras el 409 con %s (callado), la lista de entregas con la tarea en el estado del caso: un aviso solo si su propia recarga falla (%#)",
    async (_nombre, entrega, tarea, tareaEnLaLista) => {
      const cliente = nuevoCliente()
      await abrirEntrega(cliente)
      servidor.tarea = tarea
      servidor.entrega = entrega
      escribirYCalificar()
      await waitFor(() => expect(deLaTarea()).toHaveLength(2))
      await sinPeticionesEnVuelo(cliente)
      expect(avisos()).toEqual([MENSAJE_RUBRICA])

      servidor.tarea = tareaEnLaLista === 500 ? tareaEn500 : tareaBien
      await irA(cliente, UI_LISTA)

      expect(LO_QUE_SE_VE.lista()).toBeInTheDocument()
      expect(avisos()).toEqual(tareaEnLaLista === 500 ? [AVISO_TAREA] : [])
      sinInesperadas()
    },
  )

  it.each([500, 200] as const)(
    "CAL-T-102 (las dos 5xx, no callado): tras el aviso de la tarea en la vista, «Volver a las entregas» y la lista con la tarea en %i no repiten el aviso viejo",
    async (tareaEnLaLista) => {
      const cliente = nuevoCliente()
      await abrirEntrega(cliente)
      servidor.tarea = tareaEn500
      servidor.entrega = () => errorApi(500, "ERROR_INTERNO")
      escribirYCalificar()
      await waitFor(() => expect(deLaTarea()).toHaveLength(2))
      await sinPeticionesEnVuelo(cliente)
      expect(avisos()).toEqual([MENSAJE_RUBRICA, AVISO_TAREA])
      aviso.error.mockClear()
      servidor.tarea = tareaEnLaLista === 500 ? tareaEn500 : tareaBien
      avanzar(5_000)

      fireEvent.click(screen.getByRole("link", { name: "Volver a las entregas" }))

      await screen.findByRole("heading", { name: "Entregas", level: 2 })
      await sinPeticionesEnVuelo(cliente)
      expect(avisos()).toEqual(tareaEnLaLista === 500 ? [AVISO_TAREA] : [])
      sinInesperadas()
    },
  )
})

describe("ataque 01c r2 · cada vista siguiente tras un fallo callado de fondo (M-07)", () => {
  const casos = [
    ["detalle", UI_DETALLE, 500, [AVISO_TAREA]],
    ["detalle", UI_DETALLE, 200, []],
    ["editar", UI_EDITAR, 500, [AVISO_EDITAR]],
    ["editar", UI_EDITAR, 200, []],
    ["lista", UI_LISTA, 500, [AVISO_TAREA]],
    ["lista", UI_LISTA, 200, []],
    ["entrega", UI_ENTREGA, 500, [AVISO_TAREA]],
    ["entrega", UI_ENTREGA, 200, []],
  ] as const

  it.each(casos)(
    "CAL-T-103: fondo con tarea 5xx y entrega 404 (sin aviso); %s con la tarea en %i (la entrega ya responde) da exactamente %j",
    async (vista, ruta, tareaAlVolver, esperados) => {
      const cliente = nuevoCliente()
      await abrirEntrega(cliente)
      await fallarCallado(cliente)
      expect(avisos()).toEqual([])

      servidor.tarea = tareaAlVolver === 500 ? tareaEn500 : tareaBien
      servidor.entrega = entregaBien
      await irA(cliente, ruta)

      expect(LO_QUE_SE_VE[vista]()).toBeInTheDocument()
      expect(avisos()).toEqual(esperados)
      sinInesperadas()
    },
  )
})

describe("ataque 01c r2 · salir durante la recarga de la entrega tras un 409 (M-07)", () => {
  const casos = [
    [404, 500],
    [404, 200],
    [200, 500],
    [200, 200],
  ] as const

  it.each(casos)(
    "CAL-T-104: «Volver a las entregas» con la tarea ya en 5xx y la entrega en vuelo; la entrega responde %i después de salir y la lista recarga la tarea con %i: el aviso del 409 y, solo si la lista falla, uno suyo",
    async (entregaDespues, tareaEnLaLista) => {
      const cliente = nuevoCliente()
      await abrirEntrega(cliente)
      const enVuelo = diferida()
      servidor.tarea = tareaEn500
      servidor.entrega = () => enVuelo.promesa

      escribirYCalificar()
      await waitFor(() =>
        expect(cliente.getQueryState(claveTarea(CLASE_ID, TAREA_ID))?.status).toBe("error"),
      )
      await reposar()
      expect(deLaEntrega()).toHaveLength(2)
      expect(avisos()).toEqual([MENSAJE_RUBRICA])
      servidor.tarea = tareaEnLaLista === 500 ? tareaEn500 : tareaBien
      avanzar(5_000)

      fireEvent.click(screen.getByRole("link", { name: "Volver a las entregas" }))
      await screen.findByRole("heading", { name: "Entregas", level: 2 })
      enVuelo.resolver(entregaDespues === 404 ? entregaEn404() : entregaBien())
      await sinPeticionesEnVuelo(cliente)

      const propios = tareaEnLaLista === 500 ? [AVISO_TAREA] : []
      expect(avisos()).toEqual([MENSAJE_RUBRICA, ...propios])
      sinInesperadas()
    },
  )
})

describe("ataque 01c r2 · dos fallos seguidos de la tarea en la misma vista", () => {
  it("CAL-T-105: primero callado (la entrega en vuelo) y luego no: uno al volver la entrega, otro por el segundo fallo, y la lista con la tarea sana no repite ninguno", async () => {
    const cliente = nuevoCliente()
    await abrirEntrega(cliente)
    const enVuelo = diferida()
    servidor.tarea = tareaEn500
    servidor.entrega = () => enVuelo.promesa
    avanzar(5_000)
    act(() => {
      void cliente.invalidateQueries()
    })
    await waitFor(() =>
      expect(cliente.getQueryState(claveTarea(CLASE_ID, TAREA_ID))?.status).toBe("error"),
    )
    await reposar()
    expect(avisos()).toEqual([])

    enVuelo.resolver(entregaBien())
    await sinPeticionesEnVuelo(cliente)
    expect(avisos()).toEqual([AVISO_TAREA])

    servidor.entrega = entregaBien
    await recargarSoloLaTarea(cliente)
    expect(avisos()).toEqual([AVISO_TAREA, AVISO_TAREA])

    servidor.tarea = tareaBien
    await irA(cliente, UI_LISTA)
    expect(avisos()).toEqual([])
    sinInesperadas()
  })

  it.each([
    [500, [AVISO_TAREA]],
    [200, []],
  ] as const)(
    "CAL-T-105 (vecino): primero no callado y luego callado (la entrega 404): uno en la vista; la lista con la tarea en %i da exactamente %j",
    async (tareaEnLaLista, esperados) => {
      const cliente = nuevoCliente()
      await abrirEntrega(cliente)
      servidor.tarea = tareaEn500
      await recargarSoloLaTarea(cliente)
      expect(avisos()).toEqual([AVISO_TAREA])

      await fallarCallado(cliente)
      expect(avisos()).toEqual([AVISO_TAREA])

      servidor.tarea = tareaEnLaLista === 500 ? tareaEn500 : tareaBien
      servidor.entrega = entregaBien
      await irA(cliente, UI_LISTA)
      expect(avisos()).toEqual(esperados)
      sinInesperadas()
    },
  )
})

describe("ataque 01c r2 · el fallo callado y después un éxito de la tarea", () => {
  it("CAL-T-106: callado, la tarea vuelve bien y falla otra vez (callado) antes de salir: ningún aviso en la vista y ninguno en la lista con la tarea sana", async () => {
    const cliente = nuevoCliente()
    await abrirEntrega(cliente)
    await fallarCallado(cliente)
    servidor.tarea = tareaBien
    await recargarSoloLaTarea(cliente)
    expect(screen.getByText(SIN_ALUMNO)).toBeInTheDocument()
    servidor.tarea = tareaEn500
    await recargarSoloLaTarea(cliente)
    expect(avisos()).toEqual([])

    servidor.tarea = tareaBien
    servidor.entrega = entregaBien
    await irA(cliente, UI_LISTA)
    expect(avisos()).toEqual([])
    sinInesperadas()
  })

  it("CAL-T-106 (vecino): callado, la tarea vuelve bien y la entrega también: el panel vuelve sin aviso; un fallo nuevo después avisa una vez", async () => {
    const cliente = nuevoCliente()
    await abrirEntrega(cliente)
    await fallarCallado(cliente)
    servidor.tarea = tareaBien
    servidor.entrega = entregaBien
    await recargarTodo(cliente)
    expect(screen.getByLabelText(CLARIDAD)).toBeInTheDocument()
    expect(avisos()).toEqual([])

    servidor.tarea = tareaEn500
    await recargarSoloLaTarea(cliente)
    expect(avisos()).toEqual([AVISO_TAREA])
    sinInesperadas()
  })
})

describe("ataque 01c r2 · caché fresca (staleTime de producción, N-35)", () => {
  it.each([
    [500, [AVISO_TAREA]],
    [200, []],
  ] as const)(
    "CAL-T-107: con staleTime de 30 s, salir durante la recarga de la entrega tras el 409: la lista vuelve a pedir la tarea igual (un error deja la consulta invalidada) y con la tarea en %i da, además del 409, exactamente %j",
    async (tareaEnLaLista, propios) => {
      const cliente = nuevoCliente(30_000)
      await abrirEntrega(cliente)
      const enVuelo = diferida()
      servidor.tarea = tareaEn500
      servidor.entrega = () => enVuelo.promesa
      escribirYCalificar()
      await waitFor(() =>
        expect(cliente.getQueryState(claveTarea(CLASE_ID, TAREA_ID))?.status).toBe("error"),
      )
      await reposar()
      const lecturasAntes = deLaTarea().length
      servidor.tarea = tareaEnLaLista === 500 ? tareaEn500 : tareaBien

      fireEvent.click(screen.getByRole("link", { name: "Volver a las entregas" }))
      await screen.findByRole("heading", { name: "Entregas", level: 2 })
      enVuelo.resolver(entregaBien())
      await sinPeticionesEnVuelo(cliente)

      expect(deLaTarea()).toHaveLength(lecturasAntes + 1)
      expect(avisos()).toEqual([MENSAJE_RUBRICA, ...propios])
      sinInesperadas()
    },
  )
})

describe("ataque 01c r2 · cambiar de alumno sin desmontar la vista", () => {
  it("CAL-T-108: con el fallo de la tarea callado por la entrega del alumno A, pasar al alumno B (la ruta no tiene key) da un solo aviso de la tarea y el panel de B", async () => {
    const cliente = nuevoCliente()
    await abrirEntrega(cliente)
    await fallarCallado(cliente)
    expect(avisos()).toEqual([])

    avanzar(5_000)
    fireEvent.click(screen.getByRole("link", { name: "Ir a otra entrega (solo prueba)" }))
    await screen.findByRole("heading", { name: "Bruno Díaz", level: 2 })
    await sinPeticionesEnVuelo(cliente)

    expect(screen.getByLabelText(CLARIDAD)).toHaveValue("")
    expect(avisos()).toEqual([AVISO_TAREA])
    sinInesperadas()
  })
})

describe("ataque 01c r2 · las vistas sin `callado` no cambian (TAREAS y ENTREGAS)", () => {
  const vistas = [
    ["detalle", UI_DETALLE, AVISO_TAREA],
    ["editar", UI_EDITAR, AVISO_EDITAR],
    ["lista", UI_LISTA, AVISO_TAREA],
  ] as const

  it.each(vistas)(
    "CAL-T-109: %s avisa una vez por fallo (dos fallos seguidos, dos avisos) y, al volver a montarse con el último fallo en caché, no lo repite mientras su recarga está en vuelo ni cuando vuelve bien",
    async (vista, ruta, texto) => {
      const cliente = nuevoCliente()
      montar(cliente, ruta)
      await sinPeticionesEnVuelo(cliente)
      expect(LO_QUE_SE_VE[vista]()).toBeInTheDocument()
      servidor.tarea = tareaEn500
      await recargarSoloLaTarea(cliente)
      await recargarSoloLaTarea(cliente)
      expect(avisos()).toEqual([texto, texto])

      cleanup()
      aviso.error.mockClear()
      avanzar(60_000)
      const enVuelo = diferida()
      servidor.tarea = () => enVuelo.promesa
      montar(cliente, ruta)
      await reposar()
      expect(avisos()).toEqual([])
      enVuelo.resolver(tareaBien())
      await sinPeticionesEnVuelo(cliente)

      expect(LO_QUE_SE_VE[vista]()).toBeInTheDocument()
      expect(avisos()).toEqual([])
      sinInesperadas()
    },
  )

  it("CAL-T-110: la entrega de un alumno sin nada en vuelo avisa una vez por fallo de la tarea, como antes de M-07", async () => {
    const cliente = nuevoCliente()
    await abrirEntrega(cliente)
    servidor.tarea = tareaEn500
    await recargarSoloLaTarea(cliente)
    await recargarSoloLaTarea(cliente)
    expect(avisos()).toEqual([AVISO_TAREA, AVISO_TAREA])
    expect(screen.getByLabelText(CLARIDAD)).toBeInTheDocument()
    sinInesperadas()
  })
})
