import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { claveGradebook } from "@/services/calificacionesService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { GradebookView } from "./gradebook-view"

// Tester, ronda 1 de CALIFICACIONES-01d: ataques al gradebook (foco y recargas, N-48, la pila de
// ventanas, Enmienda 2 en sus bordes, datos y RN-02). El servidor es un doble en memoria (fetch) y los
// avisos, un doble de sonner. Reloj fijo en todas (vi.useFakeTimers solo para Date).

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const PASADA = "2030-01-05T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const uuid = (n: number) => `8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`
const RUTA_API = `/api/clases/${CLASE_ID}/gradebook`
const CURSOR_TAREAS = uuid(950)
const CURSOR_ALUMNOS = uuid(960)
const OTRO_CURSOR_ALUMNOS = uuid(961)
const GENERICO = "No pudimos cargar las calificaciones. Inténtalo de nuevo."
const CURSOR_TEXTO =
  "La clase cambió mientras veías las calificaciones. Vuelve a abrir Calificaciones para verlas completas."
const SIN_ACCESO = "No tienes acceso a esta clase."

const columna = (n: number, extra: Record<string, unknown> = {}) => ({
  id: uuid(100 + n),
  titulo: `Tarea ${String(n)}`,
  fechaLimite: FUTURA,
  puntos: 10,
  categoria: null,
  ...extra,
})

const COLUMNAS_A = [columna(1), columna(2, { fechaLimite: PASADA }), columna(3)]
const COLUMNAS_B = [columna(4, { fechaLimite: PASADA })]
const ALUMNOS_A = [
  { id: uuid(301), nombre: "Ana Ruiz" },
  { id: uuid(302), nombre: "Beto Díaz" },
]
const ALUMNOS_B = [{ id: uuid(303), nombre: "Carla Gómez" }]

const fila = (alumno: { id: string; nombre: string }, columnas: { id: string }[]) => ({
  alumno,
  celdas: columnas.map((c) => ({
    tareaId: c.id,
    estado: "asignado",
    conRetraso: false,
    calificacion: null,
  })),
  porcentaje: null,
  vencidasSinEntregar: 0,
  motivosDeRiesgo: [],
})

const respuestaGradebook = (cursor: string | null, cursorTareas: string | null) => {
  const columnas = cursorTareas === null ? COLUMNAS_A : COLUMNAS_B
  const alumnos = cursor === null ? ALUMNOS_A : ALUMNOS_B
  return {
    tareas: columnas,
    siguienteCursorTareas: cursorTareas === null ? CURSOR_TAREAS : null,
    alumnos: alumnos.map((a) => fila(a, columnas)),
    siguienteCursor: cursor === null ? CURSOR_ALUMNOS : null,
    resumen: { modo: "puntos", totalAlumnos: 3, promedioDeLaClase: 82.4, alumnosEnRiesgo: 0 },
  }
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })
const validacion = (mensaje: string) => errorApi(400, "VALIDACION", mensaje)

interface Llamada {
  url: string
  cursor: string | null
  cursorTareas: string | null
}
type Manejador = (llamada: Llamada) => Response | Promise<Response> | undefined

let manejador: Manejador
let cuerpoDelServidor: (cursor: string | null, cursorTareas: string | null) => unknown
let llamadas: Llamada[] = []
const asignar = vi.fn()

const instalarServidor = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) => {
      const url = String(entrada)
      const p = new URL(url, "http://local").searchParams
      const llamada = { url, cursor: p.get("cursor"), cursorTareas: p.get("cursorTareas") }
      llamadas.push(llamada)
      const propia = manejador(llamada)
      if (propia !== undefined) return Promise.resolve(propia)
      if (url.startsWith(`${RUTA_API}?`)) {
        return Promise.resolve(
          respuestaJson(200, cuerpoDelServidor(llamada.cursor, llamada.cursorTareas)),
        )
      }
      return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
}

const nuevoCliente = (staleTime = 0) =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime }, mutations: { retry: false } },
  })

const montar = (cliente: QueryClient = nuevoCliente(), base = "/maestro/clases") => {
  const resultado = render(
    <QueryClientProvider client={cliente}>
      <button type="button">Control fuera de la vista</button>
      <MemoryRouter initialEntries={[`${base}/${CLASE_ID}/calificaciones`]}>
        <Routes>
          <Route path={`${base}/:claseId`}>
            <Route path="calificaciones" element={<GradebookView />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { cliente, ...resultado }
}

const diferido = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const raizDeLaVista = () => {
  const raiz = document.querySelector("[data-material='opaco']")
  if (!(raiz instanceof HTMLElement) || raiz.getAttribute("tabindex") !== "-1") {
    throw new Error("Precondición: la vista tiene su raíz enfocable con data-material")
  }
  return raiz
}
const esperarTabla = () => screen.findByRole("table", { name: "Calificaciones por alumno y tarea" })
const encabezado = () => screen.getByRole("heading", { name: "Calificaciones", level: 2 })
const boton = (nombre: string) => screen.getByRole("button", { name: nombre })
const sinBoton = (nombre: string) => screen.queryByRole("button", { name: nombre })
const enfocar = (elemento: HTMLElement) => {
  act(() => elemento.focus())
  expect(document.activeElement).toBe(elemento)
}

const sinRastroDelServidor = (mensaje: string) => {
  const texto = document.body.textContent
  const recortado = mensaje.trim()
  if (recortado !== "") expect(texto).not.toContain(recortado)
  const prefijo = /^\s*([^:\s]+):/.exec(mensaje)?.[1]
  if (prefijo !== undefined) expect(texto).not.toContain(`${prefijo}:`)
  expect(texto).not.toMatch(/Too |Invalid|Expected|expected/)
  expect(document.querySelector("[aria-invalid='true']")).toBeNull()
  expect(document.querySelector("[aria-busy='true']")).toBeNull()
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  llamadas = []
  manejador = () => undefined
  cuerpoDelServidor = respuestaGradebook
  instalarServidor()
  vi.stubGlobal("location", { ...window.location, assign: asignar })
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
  aviso.success.mockClear()
  aviso.error.mockClear()
  asignar.mockReset()
})

describe("N-48: el gradebook no roba el foco a quien lo movió mientras llegaba la ventana", () => {
  it("CAL-T-143: red — pulsa «Tareas más antiguas», tabula a «Alumnos siguientes» durante la carga; al llegar la ventana (el botón pulsado desaparece) el foco se queda en «Alumnos siguientes»", async () => {
    const espera = diferido()
    montar()
    await esperarTabla()
    manejador = (l) => (l.cursorTareas === CURSOR_TAREAS ? espera.promesa : undefined)
    enfocar(boton("Tareas más antiguas"))
    fireEvent.click(boton("Tareas más antiguas"))
    await waitFor(() => expect(llamadas.some((l) => l.cursorTareas === CURSOR_TAREAS)).toBe(true))
    const siguientes = boton("Alumnos siguientes")
    enfocar(siguientes)
    espera.resolver(respuestaJson(200, respuestaGradebook(null, CURSOR_TAREAS)))
    await waitFor(() => expect(sinBoton("Tareas más antiguas")).toBeNull())
    await reposar()
    expect(siguientes.isConnected).toBe(true)
    expect(document.activeElement).toBe(siguientes)
    expect(document.activeElement).not.toBe(encabezado())
  })

  it("CAL-T-144: red — durante la carga la persona enfoca un control fuera de la vista; al llegar la ventana el foco se queda ahí", async () => {
    const espera = diferido()
    montar()
    await esperarTabla()
    manejador = (l) => (l.cursorTareas === CURSOR_TAREAS ? espera.promesa : undefined)
    enfocar(boton("Tareas más antiguas"))
    fireEvent.click(boton("Tareas más antiguas"))
    await waitFor(() => expect(llamadas.some((l) => l.cursorTareas === CURSOR_TAREAS)).toBe(true))
    const fuera = boton("Control fuera de la vista")
    enfocar(fuera)
    espera.resolver(respuestaJson(200, respuestaGradebook(null, CURSOR_TAREAS)))
    await waitFor(() => expect(sinBoton("Tareas más antiguas")).toBeNull())
    await reposar()
    expect(document.activeElement).toBe(fuera)
  })

  it("CAL-T-145: caché vieja — «Tareas más antiguas» desaparece al pulsarlo (la ventana de la caché no trae cursor) y el foco pasa a la raíz; la persona tabula a «Tareas más recientes» mientras se recarga y al llegar la recarga el foco se queda ahí", async () => {
    const cliente = nuevoCliente()
    cliente.setQueryData(
      claveGradebook(CLASE_ID, { cursor: null, cursorTareas: CURSOR_TAREAS }),
      respuestaGradebook(null, CURSOR_TAREAS),
    )
    const espera = diferido()
    montar(cliente)
    await esperarTabla()
    manejador = (l) => (l.cursorTareas === CURSOR_TAREAS ? espera.promesa : undefined)
    enfocar(boton("Tareas más antiguas"))
    fireEvent.click(boton("Tareas más antiguas"))
    expect(await screen.findByRole("columnheader", { name: /^Tarea 4/ })).toBeInTheDocument()
    expect(sinBoton("Tareas más antiguas")).toBeNull()
    await waitFor(() => expect(llamadas.some((l) => l.cursorTareas === CURSOR_TAREAS)).toBe(true))
    await reposar()
    expect(document.activeElement).not.toBe(document.body)
    const recientes = boton("Tareas más recientes")
    enfocar(recientes)
    vi.setSystemTime(new Date(AHORA.getTime() + 1_000))
    espera.resolver(respuestaJson(200, respuestaGradebook(null, CURSOR_TAREAS)))
    await waitFor(() => expect(recientes).not.toHaveAttribute("aria-busy"))
    await reposar()
    expect(document.activeElement).toBe(recientes)
    expect(document.activeElement).not.toBe(encabezado())
  })

  it("CAL-T-146: caché fresca — tras pulsar «Tareas más antiguas» (foco al h2), la persona enfoca «Alumnos siguientes» y una recarga posterior de la ventana no le roba el foco (no queda un «pulsado» colgado)", async () => {
    const cliente = nuevoCliente(Infinity)
    cliente.setQueryData(
      claveGradebook(CLASE_ID, { cursor: null, cursorTareas: CURSOR_TAREAS }),
      respuestaGradebook(null, CURSOR_TAREAS),
    )
    montar(cliente)
    await esperarTabla()
    enfocar(boton("Tareas más antiguas"))
    fireEvent.click(boton("Tareas más antiguas"))
    await waitFor(() => expect(sinBoton("Tareas más antiguas")).toBeNull())
    await reposar()
    expect(document.activeElement).toBe(encabezado())
    const siguientes = boton("Alumnos siguientes")
    enfocar(siguientes)
    const desde = llamadas.length
    vi.setSystemTime(new Date(AHORA.getTime() + 1_000))
    await act(async () => {
      await cliente.invalidateQueries()
    })
    await reposar()
    expect(llamadas.length).toBeGreaterThan(desde)
    expect(document.activeElement).toBe(siguientes)
  })

  it("CAL-T-147: red — si el control al que tabuló también desaparece con la ventana (el enlace de una celda de la columna vieja), el foco va al h2, nunca a <body>", async () => {
    const espera = diferido()
    montar()
    const tabla = await esperarTabla()
    manejador = (l) => (l.cursorTareas === CURSOR_TAREAS ? espera.promesa : undefined)
    enfocar(boton("Tareas más antiguas"))
    fireEvent.click(boton("Tareas más antiguas"))
    await waitFor(() => expect(llamadas.some((l) => l.cursorTareas === CURSOR_TAREAS)).toBe(true))
    const celda = within(tabla).getByRole("link", { name: /Ana Ruiz, Tarea 1$/ })
    enfocar(celda)
    espera.resolver(respuestaJson(200, respuestaGradebook(null, CURSOR_TAREAS)))
    await waitFor(() => expect(sinBoton("Tareas más antiguas")).toBeNull())
    await reposar()
    expect(celda.isConnected).toBe(false)
    expect(document.activeElement).toBe(encabezado())
  })

  it("CAL-T-148: red — si tabuló a «Alumnos siguientes» y la ventana falla con un 5xx, el MensajeError reemplaza la tabla y el foco va a la raíz, nunca a <body>", async () => {
    const espera = diferido()
    montar()
    await esperarTabla()
    manejador = (l) => (l.cursorTareas === CURSOR_TAREAS ? espera.promesa : undefined)
    fireEvent.click(boton("Tareas más antiguas"))
    await waitFor(() => expect(llamadas.some((l) => l.cursorTareas === CURSOR_TAREAS)).toBe(true))
    enfocar(boton("Alumnos siguientes"))
    espera.resolver(errorApi(500, "ERROR_INTERNO", "Error interno"))
    expect(await screen.findByText(GENERICO)).toBeInTheDocument()
    await reposar()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(document.activeElement).toBe(raizDeLaVista())
    expect(document.querySelector("[aria-busy='true']")).toBeNull()
  })
})

describe("ventanas: keepPreviousData, la pila y las recargas", () => {
  it("CAL-T-149: mientras llega la ventana, la tabla anterior se ve y los botones visibles están en espera; al llegar, ningún control queda con aria-busy", async () => {
    const espera = diferido()
    montar()
    await esperarTabla()
    manejador = (l) => (l.cursor === CURSOR_ALUMNOS ? espera.promesa : undefined)
    fireEvent.click(boton("Alumnos siguientes"))
    await waitFor(() => expect(boton("Alumnos siguientes")).toHaveAttribute("aria-busy", "true"))
    expect(screen.getByRole("row", { name: /^Ana Ruiz/ })).toBeInTheDocument()
    const deLaVista = within(raizDeLaVista()).getAllByRole("button")
    expect(deLaVista.length).toBeGreaterThan(0)
    for (const visible of deLaVista) expect(visible).toHaveAttribute("aria-busy", "true")
    espera.resolver(respuestaJson(200, respuestaGradebook(CURSOR_ALUMNOS, null)))
    expect(await screen.findByRole("row", { name: /^Carla Gómez/ })).toBeInTheDocument()
    await reposar()
    expect(document.querySelector("[aria-busy='true']")).toBeNull()
  })

  it("CAL-T-150: la pila tras un error: «Alumnos siguientes» falla (MensajeError); al recuperarse la ventana con una recarga, «Alumnos anteriores» sigue y regresa a la primera ventana sin cursor", async () => {
    const { cliente } = montar()
    await esperarTabla()
    manejador = (l) =>
      l.cursor === CURSOR_ALUMNOS ? errorApi(500, "ERROR_INTERNO", "Error interno") : undefined
    fireEvent.click(boton("Alumnos siguientes"))
    expect(await screen.findByText(GENERICO)).toBeInTheDocument()
    expect(screen.queryByRole("table")).toBeNull()
    manejador = () => undefined
    await act(async () => {
      await cliente.refetchQueries({ type: "active" })
    })
    expect(await screen.findByRole("row", { name: /^Carla Gómez/ })).toBeInTheDocument()
    const anteriores = boton("Alumnos anteriores")
    enfocar(anteriores)
    const desde = llamadas.length
    fireEvent.click(anteriores)
    expect(await screen.findByRole("row", { name: /^Ana Ruiz/ })).toBeInTheDocument()
    await reposar()
    expect(llamadas.slice(desde).every((l) => l.cursor === null)).toBe(true)
    expect(sinBoton("Alumnos anteriores")).toBeNull()
    expect(document.activeElement).toBe(encabezado())
  })

  it("CAL-T-151: una recarga de fondo que cambia el cursor siguiente hace que «Alumnos siguientes» pida el cursor nuevo, no el viejo", async () => {
    const { cliente } = montar()
    await esperarTabla()
    cuerpoDelServidor = (cursor, cursorTareas) => ({
      ...respuestaGradebook(cursor, cursorTareas),
      siguienteCursor: cursor === null ? OTRO_CURSOR_ALUMNOS : null,
    })
    await act(async () => {
      await cliente.refetchQueries({ type: "active" })
    })
    await reposar()
    const desde = llamadas.length
    fireEvent.click(boton("Alumnos siguientes"))
    await waitFor(() => expect(llamadas.length).toBeGreaterThan(desde))
    expect(llamadas.slice(desde).map((l) => l.cursor)).toEqual([OTRO_CURSOR_ALUMNOS])
  })

  it("CAL-T-152: con la vista desmontada y una ventana en vuelo que responde 200, ningún aviso ni error en la consola; al volver a montar con la misma QueryClient, la vista empieza en la primera ventana", async () => {
    const consola = vi.spyOn(console, "error")
    const espera = diferido()
    const { cliente, unmount } = montar()
    await esperarTabla()
    manejador = (l) => (l.cursor === CURSOR_ALUMNOS ? espera.promesa : undefined)
    fireEvent.click(boton("Alumnos siguientes"))
    await waitFor(() => expect(llamadas.some((l) => l.cursor === CURSOR_ALUMNOS)).toBe(true))
    unmount()
    espera.resolver(respuestaJson(200, respuestaGradebook(CURSOR_ALUMNOS, null)))
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(consola).not.toHaveBeenCalled()
    cleanup()
    montar(cliente)
    expect(await screen.findByRole("row", { name: /^Ana Ruiz/ })).toBeInTheDocument()
    expect(sinBoton("Alumnos anteriores")).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("Enmienda 2 en sus bordes (gradebook)", () => {
  const BLANCOS_Y_CAMPOS = [
    ["\t"],
    ["\n"],
    [" \t\n "],
    ["version: Expected number, received string"],
    ["CURSOR: no es válido"],
    [" cursor: no es válido"],
    ["Cursor: no es válido"],
    ["cursorTareas.0:"],
    ["cursor.0: no es válido"],
  ] as const

  it.each(BLANCOS_Y_CAMPOS)(
    "CAL-T-153: primera carga con «%j»: un solo MensajeError con el genérico, sin aviso ni rastro del servidor; el foco no cae en <body>",
    async (mensaje) => {
      const espera = diferido()
      manejador = () => espera.promesa
      montar()
      act(() => raizDeLaVista().focus())
      espera.resolver(validacion(mensaje))
      expect(await screen.findByText(GENERICO)).toBeInTheDocument()
      await reposar()
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
      expect(aviso.error).not.toHaveBeenCalled()
      sinRastroDelServidor(mensaje)
      expect(document.activeElement).not.toBe(document.body)
    },
  )

  it.each(BLANCOS_Y_CAMPOS)(
    "CAL-T-154: ventana nueva («Alumnos siguientes») con «%j»: un solo MensajeError con el genérico, sin aviso, y el foco del botón en la raíz",
    async (mensaje) => {
      montar()
      await esperarTabla()
      manejador = (l) => (l.cursor === CURSOR_ALUMNOS ? validacion(mensaje) : undefined)
      enfocar(boton("Alumnos siguientes"))
      fireEvent.click(boton("Alumnos siguientes"))
      expect(await screen.findByText(GENERICO)).toBeInTheDocument()
      await reposar()
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      expect(aviso.error).not.toHaveBeenCalled()
      sinRastroDelServidor(mensaje)
      expect(document.activeElement).toBe(raizDeLaVista())
    },
  )

  it.each([
    ["cursor:"],
    ["cursorTareas:"],
    ["cursor:   "],
    ["cursorTareas:\t"],
    ["cursorTareas: Invalid UUID"],
  ])(
    "CAL-T-155: ventana nueva («Tareas más antiguas») con «%j»: el texto fijo del cursor, nunca el del servidor ni el genérico, sin aviso",
    async (mensaje) => {
      montar()
      await esperarTabla()
      manejador = (l) => (l.cursorTareas === CURSOR_TAREAS ? validacion(mensaje) : undefined)
      fireEvent.click(boton("Tareas más antiguas"))
      expect(await screen.findByText(CURSOR_TEXTO)).toBeInTheDocument()
      await reposar()
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      expect(screen.queryByText(GENERICO)).toBeNull()
      expect(aviso.error).not.toHaveBeenCalled()
      sinRastroDelServidor(mensaje)
    },
  )

  it("CAL-T-156: primera carga (sin cursor enviado) con «cursor: no es válido» da el texto del cursor; con «claseId:» sin mensaje, «No tienes acceso a esta clase.»", async () => {
    manejador = () => validacion("cursor: no es válido")
    montar()
    expect(await screen.findByText(CURSOR_TEXTO)).toBeInTheDocument()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    cleanup()
    manejador = () => validacion("claseId:")
    montar()
    expect(await screen.findByText(SIN_ACCESO)).toBeInTheDocument()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(screen.queryByText(GENERICO)).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("gradebook: datos, bordes y RN-02", () => {
  it("CAL-T-157: calificada sin entrega con 0 puntos dice «0» (no «—»); la asignada un segundo antes de vencer dice «—» con «Asignado» y la de un segundo después «Sin entregar»; dos motivos de riesgo; resumen con 1 alumno, promedio nulo y 0 en riesgo", async () => {
    const limite = new Date(AHORA.getTime() + 1_000).toISOString()
    const vencida = new Date(AHORA.getTime() - 1_000).toISOString()
    cuerpoDelServidor = () => ({
      tareas: [
        columna(1, { fechaLimite: PASADA }),
        columna(2, { fechaLimite: limite }),
        columna(3, { fechaLimite: vencida }),
      ],
      siguienteCursorTareas: null,
      alumnos: [
        {
          alumno: ALUMNOS_A[0],
          celdas: [
            { tareaId: uuid(101), estado: "calificado", conRetraso: false, calificacion: 0 },
            { tareaId: uuid(102), estado: "asignado", conRetraso: false, calificacion: null },
            { tareaId: uuid(103), estado: "asignado", conRetraso: false, calificacion: null },
          ],
          porcentaje: 0,
          vencidasSinEntregar: 3,
          motivosDeRiesgo: ["promedio", "vencidas"],
        },
      ],
      siguienteCursor: null,
      resumen: { modo: "puntos", totalAlumnos: 1, promedioDeLaClase: null, alumnosEnRiesgo: 0 },
    })
    montar()
    const tabla = await esperarTabla()
    const ana = within(tabla).getByRole("row", { name: /^Ana Ruiz/ })
    expect(within(ana).getByRole("link", { name: "0 Ana Ruiz, Tarea 1" })).toHaveTextContent(/^0/)
    const antes = within(ana).getByRole("link", { name: "Asignado Ana Ruiz, Tarea 2" })
    expect(antes).toHaveTextContent("—")
    expect(
      within(ana).getByRole("link", { name: "Sin entregar Ana Ruiz, Tarea 3" }),
    ).toBeInTheDocument()
    expect(within(ana).getByText("0 %")).toBeInTheDocument()
    expect(
      within(ana).getByText("Promedio menor a 70 % · 3 o más tareas vencidas sin entregar"),
    ).toBeInTheDocument()
    expect(screen.getByText("1 alumno")).toBeInTheDocument()
    expect(screen.getByText("Promedio de la clase: —")).toBeInTheDocument()
    expect(screen.getByText("0 en riesgo")).toBeInTheDocument()
    expect(sinBoton("Alumnos siguientes")).toBeNull()
    expect(sinBoton("Tareas más antiguas")).toBeNull()
  })

  it("CAL-T-158: RN-02 — si el servidor manda de más el estado de pago, la restricción o el correo de un alumno, el esquema estricto lo rechaza: un solo MensajeError genérico y nada de esos datos en el documento", async () => {
    cuerpoDelServidor = (cursor, cursorTareas) => {
      const base = respuestaGradebook(cursor, cursorTareas)
      return {
        ...base,
        alumnos: base.alumnos.map((f) => ({
          ...f,
          alumno: {
            ...f.alumno,
            estadoPago: "deudor",
            accesoRestringido: true,
            email: "ana@ejemplo.mx",
          },
        })),
      }
    }
    montar()
    expect(await screen.findByText(GENERICO)).toBeInTheDocument()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    const texto = document.body.textContent
    expect(texto).not.toMatch(/deudor|Deudor|restringid|ana@ejemplo\.mx|Ana Ruiz/)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-T-159: 50 alumnos × 50 tareas, con un título de 200 caracteres y un nombre de 120: se pintan las 2500 celdas enlazadas dentro del contenedor desplazable, el título completo con su recorte a dos líneas y el nombre en la columna fija", async () => {
    const tituloLargo = "Ensayo comparativo ".repeat(11).slice(0, 200)
    const nombreLargo = "Ana María ".repeat(12).slice(0, 120)
    expect(tituloLargo).toHaveLength(200)
    expect(nombreLargo).toHaveLength(120)
    const columnas = Array.from({ length: 50 }, (_, i) =>
      columna(i + 1, i === 0 ? { titulo: tituloLargo } : {}),
    )
    const alumnos = Array.from({ length: 50 }, (_, i) => ({
      id: uuid(1000 + i),
      nombre: i === 0 ? nombreLargo : `Alumno ${String(i)}`,
    }))
    cuerpoDelServidor = () => ({
      tareas: columnas,
      siguienteCursorTareas: null,
      alumnos: alumnos.map((a) => fila(a, columnas)),
      siguienteCursor: null,
      resumen: { modo: "puntos", totalAlumnos: 50, promedioDeLaClase: null, alumnosEnRiesgo: 0 },
    })
    const inicio = performance.now()
    montar()
    const tabla = await screen.findByRole(
      "table",
      { name: "Calificaciones por alumno y tarea" },
      { timeout: 20_000 },
    )
    const duracion = performance.now() - inicio
    expect(duracion).toBeLessThan(15_000)
    expect(tabla.querySelectorAll("tbody a")).toHaveLength(2500)
    const titulo = within(tabla).getByText(tituloLargo.trim())
    expect(titulo).toHaveClass("line-clamp-2")
    const nombre = within(tabla).getByText(nombreLargo.trim())
    expect(nombre.tagName).toBe("TD")
    expect(nombre).toHaveClass("sticky", "left-0", "bg-surface")
    const contenedor = tabla.parentElement
    if (contenedor === null) throw new Error("Precondición: la tabla está en su contenedor")
    expect(contenedor).toHaveClass("overflow-x-auto")
    expect(raizDeLaVista().contains(tabla)).toBe(true)
  }, 30_000)
})

describe("ventana vacía por un cambio concurrente (la pila no vacía debe ofrecer el regreso)", () => {
  // Con limite + 1, la primera ventana trae cursor siguiente porque había un alumno (o una tarea) más.
  // Si ese alumno sale de la clase (o se borra esa tarea) antes de pedir la ventana siguiente, el
  // cursor sigue existiendo y el servidor responde la ventana vacía (§D-6.1 y §D-6.2), sin 400.
  const ventanaVacia = (dimension: "alumnos" | "tareas") => {
    cuerpoDelServidor = (cursor, cursorTareas) => {
      const base = respuestaGradebook(cursor, cursorTareas)
      const resumen = { ...base.resumen, totalAlumnos: 26 }
      if (dimension === "alumnos" && cursor !== null) {
        return { ...base, alumnos: [], siguienteCursor: null, resumen }
      }
      if (dimension === "tareas" && cursorTareas !== null) {
        return {
          ...base,
          tareas: [],
          alumnos: base.alumnos.map((f) => ({ ...f, celdas: [] })),
          siguienteCursorTareas: null,
          resumen,
        }
      }
      return { ...base, resumen }
    }
  }

  it("CAL-T-193: «Alumnos siguientes» llega vacía: con la pila no vacía, «Alumnos anteriores» sigue a la vista para regresar (§D-13.3)", async () => {
    ventanaVacia("alumnos")
    montar()
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await waitFor(() => expect(sinBoton("Alumnos siguientes")).toBeNull())
    await reposar()
    expect(screen.getByRole("button", { name: "Alumnos anteriores" })).toBeInTheDocument()
  })

  it("CAL-T-194: «Tareas más antiguas» llega vacía: con la pila no vacía, «Tareas más recientes» sigue a la vista para regresar (§D-13.3)", async () => {
    ventanaVacia("tareas")
    montar()
    await esperarTabla()
    fireEvent.click(boton("Tareas más antiguas"))
    await waitFor(() => expect(sinBoton("Tareas más antiguas")).toBeNull())
    await reposar()
    expect(screen.getByRole("button", { name: "Tareas más recientes" })).toBeInTheDocument()
  })

  it("CAL-T-195: con 26 alumnos en la clase, una ventana de alumnos vacía no dice «Aún no hay alumnos en esta clase.»", async () => {
    ventanaVacia("alumnos")
    montar()
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await waitFor(() => expect(sinBoton("Alumnos siguientes")).toBeNull())
    await reposar()
    expect(screen.queryByText("Aún no hay alumnos en esta clase.")).toBeNull()
  })
})
