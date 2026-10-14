import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { StrictMode, useState, type ReactNode } from "react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { claveGradebook, clavePrefijoDeCalificaciones } from "@/services/calificacionesService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { GradebookView } from "./gradebook-view"

// Tester, ronda 3 de CALIFICACIONES-01d: ataques al remedio de T-07 (useMarcarViejoElGradebook) y a
// sus vecinos: fallos seguidos, invalidaciones y recargas externas, StrictMode, el regreso desde la
// ventana vacía con la recarga en segundo plano, isPlaceholderData, la vista desmontada, volver a abrir
// con la clase vacía de verdad, las dos dimensiones a la vez, la QueryClient real de la app y la
// evidencia de N-52. El servidor es un doble en memoria (fetch) y los avisos, un doble de sonner. Reloj
// fijo en todas (vi.useFakeTimers solo para Date): la frescura de la caché depende de Date.now().

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const PASADA = "2030-01-05T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const uuid = (n: number) => `6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`
const RUTA_API = `/api/clases/${CLASE_ID}/gradebook`
const CURSOR_TAREAS = uuid(950)
const CURSOR_ALUMNOS = uuid(960)
const CURSOR_TEXTO =
  "La clase cambió mientras veías las calificaciones. Vuelve a abrir Calificaciones para verlas completas."
const SIN_ALUMNOS = "Aún no hay alumnos en esta clase."
const SIN_TAREAS = "Aún no hay tareas en esta clase."
const GENERICO = "No pudimos cargar las calificaciones. Inténtalo de nuevo."
const STALE_DE_PRODUCCION = 30_000

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

interface Respuesta {
  tareas: ReturnType<typeof columna>[]
  siguienteCursorTareas: string | null
  alumnos: ReturnType<typeof fila>[]
  siguienteCursor: string | null
  resumen: {
    modo: string
    totalAlumnos: number
    promedioDeLaClase: number | null
    alumnosEnRiesgo: number
  }
}

const respuestaGradebook = (cursor: string | null, cursorTareas: string | null): Respuesta => {
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

const sinAlumnos = (r: Respuesta): Respuesta => ({ ...r, alumnos: [], siguienteCursor: null })
const sinTareas = (r: Respuesta): Respuesta => ({
  ...r,
  tareas: [],
  alumnos: r.alumnos.map((f) => ({ ...f, celdas: [] })),
  siguienteCursorTareas: null,
})
// La primera ventana después de que salió el alumno del cursor: la clase completa, sin cursor.
const primeraCambiada = (): Respuesta => ({
  ...respuestaGradebook(null, null),
  siguienteCursor: null,
  resumen: { modo: "puntos", totalAlumnos: 2, promedioDeLaClase: 82.4, alumnosEnRiesgo: 0 },
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })
const cursorInvalido = (campo = "cursor") => errorApi(400, "VALIDACION", `${campo}: no es válido`)

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

const nuevoCliente = (staleTime = STALE_DE_PRODUCCION) =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  })

const rutas = (
  <MemoryRouter initialEntries={[`/maestro/clases/${CLASE_ID}/calificaciones`]}>
    <Routes>
      <Route path="/maestro/clases/:claseId">
        <Route path="calificaciones" element={<GradebookView />} />
      </Route>
    </Routes>
  </MemoryRouter>
)

const montar = (cliente: QueryClient = nuevoCliente(), estricto = false) => {
  const contenido: ReactNode = (
    <QueryClientProvider client={cliente}>
      <button type="button">Control fuera de la vista</button>
      {rutas}
    </QueryClientProvider>
  )
  return { cliente, ...render(estricto ? <StrictMode>{contenido}</StrictMode> : contenido) }
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
    for (let i = 0; i < 8; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const raizDeLaVista = () => {
  const raiz = document.querySelector("[data-material='opaco']")
  if (!(raiz instanceof HTMLElement)) throw new Error("Precondición: la vista tiene su raíz")
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
const prefijo = clavePrefijoDeCalificaciones(CLASE_ID)
const ventana = (cursor: string | null, cursorTareas: string | null) =>
  claveGradebook(CLASE_ID, { cursor, cursorTareas })
const estaVieja = (cliente: QueryClient, cursor: string | null, cursorTareas: string | null) =>
  cliente.getQueryCache().find({ queryKey: ventana(cursor, cursorTareas), exact: true })?.state
    .isInvalidated
const espiarMarcas = (cliente: QueryClient) => {
  const espia = vi.spyOn(cliente, "invalidateQueries")
  return () =>
    espia.mock.calls.filter(
      ([filtro]) => (filtro as { refetchType?: string } | undefined)?.refetchType === "none",
    ).length
}
const desde = (indice: number) => llamadas.slice(indice)
const esPrimera = (l: Llamada) => l.cursor === null && l.cursorTareas === null

const unSoloTexto = async () => {
  await waitFor(() => expect(screen.getByText(CURSOR_TEXTO)).toBeInTheDocument())
  expect(screen.getAllByText(CURSOR_TEXTO)).toHaveLength(1)
  expect(screen.getAllByRole("alert")).toHaveLength(1)
  expect(screen.queryByText(GENERICO)).toBeNull()
  expect(aviso.error).not.toHaveBeenCalled()
  expect(aviso.success).not.toHaveBeenCalled()
}

const vacioConCursor = (c: string | null, t: string | null) => {
  const r = respuestaGradebook(c, t)
  return c !== null ? sinAlumnos(r) : r
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

describe("Fallos seguidos con la vista montada: sin bucle y una marca por ocurrencia", () => {
  it("CAL-T-232: dos 400 del cursor seguidos (el segundo por la invalidación de calificar sobre el prefijo): una petición por invalidación, dos marcas, un solo texto y volver a abrir pide la primera ventana", async () => {
    manejador = (l) => (l.cursor !== null ? cursorInvalido() : undefined)
    const cliente = nuevoCliente()
    const marcas = espiarMarcas(cliente)
    const primera = montar(cliente)
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await unSoloTexto()
    await reposar()
    expect(marcas()).toBe(1)
    const i = llamadas.length
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: prefijo })
    })
    await reposar()
    await reposar()
    expect(desde(i)).toHaveLength(1)
    expect(desde(i)[0]).toMatchObject({ cursor: CURSOR_ALUMNOS, cursorTareas: null })
    expect(marcas()).toBe(2)
    await unSoloTexto()
    expect(estaVieja(cliente, null, null)).toBe(true)
    primera.unmount()
    const j = llamadas.length
    montar(cliente)
    await waitFor(() => expect(desde(j).filter(esPrimera)).toHaveLength(1))
  })

  it("CAL-T-233: un 400 del cursor y después la ventana vacía (invalidación externa): el mismo texto con el h2, el resumen y «Alumnos anteriores»; una petición y dos marcas", async () => {
    manejador = (l) => (l.cursor !== null ? cursorInvalido() : undefined)
    const cliente = nuevoCliente()
    const marcas = espiarMarcas(cliente)
    montar(cliente)
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await unSoloTexto()
    await reposar()
    expect(screen.queryByRole("heading", { name: "Calificaciones", level: 2 })).toBeNull()
    manejador = () => undefined
    cuerpoDelServidor = vacioConCursor
    const i = llamadas.length
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: prefijo })
    })
    await reposar()
    await unSoloTexto()
    expect(encabezado()).toBeInTheDocument()
    expect(screen.getByText("3 alumnos")).toBeInTheDocument()
    expect(boton("Alumnos anteriores")).toBeInTheDocument()
    expect(desde(i)).toHaveLength(1)
    expect(marcas()).toBe(2)
    await reposar()
    expect(desde(i)).toHaveLength(1)
  })

  it("CAL-T-234: la ventana vacía y después un 400 del cursor en su recarga: sigue la ventana vacía con el texto (S-19), sin marca nueva, sin bucle, y volver a abrir pide la primera ventana", async () => {
    cuerpoDelServidor = vacioConCursor
    const cliente = nuevoCliente()
    const marcas = espiarMarcas(cliente)
    const primera = montar(cliente)
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await unSoloTexto()
    await reposar()
    expect(marcas()).toBe(1)
    const alerta = screen.getByRole("alert")
    manejador = (l) => (l.cursor !== null ? cursorInvalido() : undefined)
    vi.setSystemTime(new Date(AHORA.getTime() + 1_000))
    const i = llamadas.length
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: prefijo })
    })
    await reposar()
    await reposar()
    expect(desde(i)).toHaveLength(1)
    await unSoloTexto()
    expect(screen.getByRole("alert")).toBe(alerta)
    expect(encabezado()).toBeInTheDocument()
    expect(boton("Alumnos anteriores")).toBeInTheDocument()
    expect(marcas()).toBe(1)
    primera.unmount()
    const j = llamadas.length
    montar(cliente)
    await waitFor(() => expect(desde(j).filter(esPrimera)).toHaveLength(1))
  })

  it("CAL-T-235: una invalidación externa con la ventana vacía a la vista (otra respuesta, 1 s después): una sola petición, una marca más, el mismo nodo alert y nada más en vuelo", async () => {
    cuerpoDelServidor = vacioConCursor
    const cliente = nuevoCliente()
    const marcas = espiarMarcas(cliente)
    montar(cliente)
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await unSoloTexto()
    await reposar()
    const alerta = screen.getByRole("alert")
    vi.setSystemTime(new Date(AHORA.getTime() + 1_000))
    const i = llamadas.length
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: prefijo })
    })
    await reposar()
    await reposar()
    expect(desde(i)).toHaveLength(1)
    expect(marcas()).toBe(2)
    expect(screen.getByRole("alert")).toBe(alerta)
    expect(cliente.isFetching()).toBe(0)
    expect(document.querySelector("[aria-busy='true']")).toBeNull()
    expect(estaVieja(cliente, CURSOR_ALUMNOS, null)).toBe(false)
  })

  it("CAL-T-236: un refetch manual de todo el prefijo con el 400 a la vista: dos peticiones (la rota y la primera), ninguna más, un solo texto", async () => {
    manejador = (l) => (l.cursor !== null ? cursorInvalido() : undefined)
    const cliente = nuevoCliente()
    montar(cliente)
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await unSoloTexto()
    await reposar()
    const i = llamadas.length
    await act(async () => {
      await cliente.refetchQueries({ queryKey: prefijo })
    })
    await reposar()
    await reposar()
    expect(desde(i)).toHaveLength(2)
    expect(desde(i).filter(esPrimera)).toHaveLength(1)
    expect(desde(i).filter((l) => l.cursor === CURSOR_ALUMNOS)).toHaveLength(1)
    await unSoloTexto()
    expect(cliente.isFetching()).toBe(0)
  })

  it("CAL-T-237: en StrictMode (efectos dobles), el 400 del cursor da una sola petición rota, un solo texto, sin bucle, y volver a abrir pide la primera ventana", async () => {
    manejador = (l) => (l.cursor !== null ? cursorInvalido() : undefined)
    const cliente = nuevoCliente()
    const primera = montar(cliente, true)
    await esperarTabla()
    const i = llamadas.length
    fireEvent.click(boton("Alumnos siguientes"))
    await unSoloTexto()
    await reposar()
    await reposar()
    expect(desde(i)).toHaveLength(1)
    expect(cliente.isFetching()).toBe(0)
    primera.unmount()
    const j = llamadas.length
    montar(cliente, true)
    await waitFor(() => expect(desde(j).filter(esPrimera).length).toBeGreaterThanOrEqual(1))
    expect(desde(j).filter((l) => l.cursor !== null)).toHaveLength(0)
  })
})

describe("Regresar desde la ventana vacía: la primera ventana marcada se recarga en segundo plano", () => {
  it("CAL-T-238: la tabla de la caché se ve, los botones quedan en espera y dos clics en «Alumnos siguientes» no piden el cursor muerto; al llegar, la clase como está, sin aria-busy y el foco en el h2", async () => {
    cuerpoDelServidor = vacioConCursor
    const cliente = nuevoCliente()
    montar(cliente)
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await unSoloTexto()
    await reposar()
    const retenida = diferido()
    manejador = (l) => (esPrimera(l) ? retenida.promesa : undefined)
    const i = llamadas.length
    const anteriores = boton("Alumnos anteriores")
    enfocar(anteriores)
    fireEvent.click(anteriores)
    expect(await screen.findByRole("row", { name: /^Ana Ruiz/ })).toBeInTheDocument()
    await reposar()
    const siguientes = boton("Alumnos siguientes")
    expect(siguientes).toHaveAttribute("aria-busy", "true")
    fireEvent.click(siguientes)
    fireEvent.click(siguientes)
    await reposar()
    expect(desde(i).filter((l) => l.cursor !== null)).toHaveLength(0)
    expect(desde(i).filter(esPrimera)).toHaveLength(1)
    expect(document.activeElement).not.toBe(document.body)
    await act(async () => {
      retenida.resolver(respuestaJson(200, primeraCambiada()))
      await retenida.promesa
    })
    await waitFor(() => expect(screen.getByText("2 alumnos")).toBeInTheDocument())
    await reposar()
    expect(sinBoton("Alumnos siguientes")).toBeNull()
    expect(document.querySelector("[aria-busy='true']")).toBeNull()
    expect(document.activeElement).toBe(encabezado())
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(desde(i)).toHaveLength(1)
  })

  it("CAL-T-239: si esa recarga en segundo plano falla con 503, la tabla de la caché se queda, sin el genérico ni aviso, sin aria-busy y el foco en el h2", async () => {
    cuerpoDelServidor = vacioConCursor
    const cliente = nuevoCliente()
    montar(cliente)
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await unSoloTexto()
    await reposar()
    manejador = (l) => (esPrimera(l) ? errorApi(503, "ERROR_INTERNO", "caído") : undefined)
    const anteriores = boton("Alumnos anteriores")
    enfocar(anteriores)
    fireEvent.click(anteriores)
    expect(await screen.findByRole("row", { name: /^Ana Ruiz/ })).toBeInTheDocument()
    await waitFor(() => expect(cliente.isFetching()).toBe(0))
    await reposar()
    expect(await esperarTabla()).toBeInTheDocument()
    expect(screen.queryByText(GENERICO)).toBeNull()
    expect(screen.queryByText("caído")).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(document.querySelector("[aria-busy='true']")).toBeNull()
    expect(document.activeElement).toBe(encabezado())
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("isPlaceholderData y la vista desmontada", () => {
  it("CAL-T-240: desde la ventana vacía, «Tareas más antiguas» con la respuesta retenida: la ventana de respaldo no marca; la respuesta real vacía sí, una vez", async () => {
    cuerpoDelServidor = vacioConCursor
    const cliente = nuevoCliente()
    const marcas = espiarMarcas(cliente)
    montar(cliente)
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await unSoloTexto()
    await reposar()
    expect(marcas()).toBe(1)
    const retenida = diferido()
    manejador = (l) => (l.cursorTareas !== null ? retenida.promesa : undefined)
    fireEvent.click(boton("Tareas más antiguas"))
    await reposar()
    await reposar()
    expect(marcas()).toBe(1)
    await act(async () => {
      retenida.resolver(
        respuestaJson(200, sinAlumnos(respuestaGradebook(CURSOR_ALUMNOS, CURSOR_TAREAS))),
      )
      await retenida.promesa
    })
    await reposar()
    await unSoloTexto()
    expect(marcas()).toBe(2)
  })

  it("CAL-T-241: desde la ventana vacía, regresar a una primera ventana que ya no está en la caché (respuesta retenida): ninguna marca mientras se ve la de respaldo ni al llegar la tabla", async () => {
    cuerpoDelServidor = vacioConCursor
    const cliente = nuevoCliente()
    const marcas = espiarMarcas(cliente)
    montar(cliente)
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await unSoloTexto()
    await reposar()
    expect(marcas()).toBe(1)
    cliente.removeQueries({ queryKey: ventana(null, null), exact: true })
    const retenida = diferido()
    manejador = (l) => (esPrimera(l) ? retenida.promesa : undefined)
    fireEvent.click(boton("Alumnos anteriores"))
    await reposar()
    expect(marcas()).toBe(1)
    await act(async () => {
      retenida.resolver(respuestaJson(200, respuestaGradebook(null, null)))
      await retenida.promesa
    })
    await esperarTabla()
    await reposar()
    expect(marcas()).toBe(1)
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
  })

  it("CAL-T-242: la vista se desmonta con la ventana rota en vuelo: al llegar el 400 no marca nada ni escribe en consola; al volver a montar, la primera ventana sin el texto", async () => {
    const errores = vi.spyOn(console, "error")
    const cliente = nuevoCliente()
    const marcas = espiarMarcas(cliente)
    const primera = montar(cliente)
    await esperarTabla()
    const retenida = diferido()
    manejador = (l) => (l.cursor !== null ? retenida.promesa : undefined)
    fireEvent.click(boton("Alumnos siguientes"))
    await reposar()
    primera.unmount()
    await act(async () => {
      retenida.resolver(cursorInvalido())
      await retenida.promesa
    })
    await reposar()
    expect(marcas()).toBe(0)
    expect(errores).not.toHaveBeenCalled()
    montar(cliente)
    expect(await esperarTabla()).toBeInTheDocument()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-T-243: la vista se desmonta con una invalidación externa en curso sobre la ventana rota: sin consola, sin aviso; al volver a montar, la primera ventana se pide", async () => {
    const errores = vi.spyOn(console, "error")
    manejador = (l) => (l.cursor !== null ? cursorInvalido() : undefined)
    const cliente = nuevoCliente()
    const primera = montar(cliente)
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await unSoloTexto()
    await reposar()
    const retenida = diferido()
    manejador = (l) => (l.cursor !== null ? retenida.promesa : undefined)
    let invalidacion: Promise<void> = Promise.resolve()
    act(() => {
      invalidacion = cliente.invalidateQueries({ queryKey: prefijo })
    })
    await reposar()
    primera.unmount()
    await act(async () => {
      retenida.resolver(cursorInvalido())
      await retenida.promesa
      await invalidacion
    })
    await reposar()
    expect(errores).not.toHaveBeenCalled()
    expect(aviso.error).not.toHaveBeenCalled()
    const j = llamadas.length
    montar(cliente)
    await waitFor(() => expect(desde(j).filter(esPrimera)).toHaveLength(1))
    expect(await esperarTabla()).toBeInTheDocument()
  })
})

describe("Volver a abrir Calificaciones", () => {
  it("CAL-T-244: antes de 30 s, con la primera ventana que llega vacía de verdad (todos salieron): mientras llega, «Alumnos siguientes» en espera no pide el cursor muerto; al llegar, el vacío de la clase, sin el texto del cursor ni botones y el foco fuera de <body>", async () => {
    cuerpoDelServidor = vacioConCursor
    const cliente = nuevoCliente()
    const marcas = espiarMarcas(cliente)
    const primera = montar(cliente)
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await unSoloTexto()
    await reposar()
    primera.unmount()
    // Otra hora para la respuesta nueva: con el reloj fijo, dos respuestas del mismo milisegundo no
    // cambian la clave del gancho de foco (como en CAL-T-204 y CAL-1D02n); en la aplicación no ocurre.
    vi.setSystemTime(new Date(AHORA.getTime() + 1_000))
    const retenida = diferido()
    manejador = (l) => (esPrimera(l) ? retenida.promesa : undefined)
    const j = llamadas.length
    montar(cliente)
    await esperarTabla()
    const siguientes = boton("Alumnos siguientes")
    expect(siguientes).toHaveAttribute("aria-busy", "true")
    enfocar(siguientes)
    fireEvent.click(siguientes)
    fireEvent.click(siguientes)
    await reposar()
    expect(desde(j).filter((l) => l.cursor !== null)).toHaveLength(0)
    expect(desde(j).filter(esPrimera)).toHaveLength(1)
    await act(async () => {
      retenida.resolver(
        respuestaJson(200, {
          ...respuestaGradebook(null, null),
          alumnos: [],
          siguienteCursor: null,
          resumen: { modo: "puntos", totalAlumnos: 0, promedioDeLaClase: null, alumnosEnRiesgo: 0 },
        }),
      )
      await retenida.promesa
    })
    expect(await screen.findByText(SIN_ALUMNOS)).toBeInTheDocument()
    await reposar()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
    expect(screen.queryByRole("button", { name: /Alumnos|Tareas/ })).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(document.activeElement).not.toBe(document.body)
    expect(raizDeLaVista().contains(document.activeElement)).toBe(true)
    expect(marcas()).toBe(1)
  })

  it("CAL-T-245 (control): después de 30 s, tras el 400 del cursor, volver a abrir muestra la clase como está", async () => {
    let salio = false
    manejador = (l) => (l.cursor !== null ? cursorInvalido() : undefined)
    cuerpoDelServidor = (c, t) =>
      salio && c === null && t === null ? primeraCambiada() : respuestaGradebook(c, t)
    const cliente = nuevoCliente()
    const primera = montar(cliente)
    await esperarTabla()
    salio = true
    fireEvent.click(boton("Alumnos siguientes"))
    await unSoloTexto()
    primera.unmount()
    vi.setSystemTime(new Date(AHORA.getTime() + STALE_DE_PRODUCCION + 1_000))
    montar(cliente)
    await waitFor(() => expect(screen.getByText("2 alumnos")).toBeInTheDocument())
    await reposar()
    expect(sinBoton("Alumnos siguientes")).toBeNull()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
  })

  it("CAL-T-246: las dos dimensiones vacías a la vez (ventana con los dos cursores): un solo texto, una marca por la respuesta, y volver a abrir antes de 30 s pide la primera ventana", async () => {
    cuerpoDelServidor = (c, t) => {
      const r = respuestaGradebook(c, t)
      return c !== null && t !== null ? sinTareas(sinAlumnos(r)) : r
    }
    const cliente = nuevoCliente()
    const marcas = espiarMarcas(cliente)
    const primera = montar(cliente)
    await esperarTabla()
    fireEvent.click(boton("Tareas más antiguas"))
    expect(await screen.findByRole("columnheader", { name: /Tarea 4/ })).toBeInTheDocument()
    await reposar()
    expect(marcas()).toBe(0)
    fireEvent.click(boton("Alumnos siguientes"))
    await unSoloTexto()
    await reposar()
    expect(marcas()).toBe(1)
    expect(screen.queryByText(SIN_ALUMNOS)).toBeNull()
    expect(screen.queryByText(SIN_TAREAS)).toBeNull()
    expect(estaVieja(cliente, null, null)).toBe(true)
    expect(estaVieja(cliente, null, CURSOR_TAREAS)).toBe(true)
    primera.unmount()
    const j = llamadas.length
    montar(cliente)
    await waitFor(() => expect(desde(j).filter(esPrimera)).toHaveLength(1))
  })

  it.each(["400", "vacia"] as const)(
    "CAL-T-247: con los Providers reales de la app (retry 1, staleTime 30 s, sin refetchOnWindowFocus), el texto del cursor (%s) y volver a abrir antes de 30 s muestra la clase como está",
    async (modo) => {
      let salio = false
      manejador = (l) => (modo === "400" && l.cursor !== null ? cursorInvalido() : undefined)
      cuerpoDelServidor = (c, t) => {
        if (c !== null) return sinAlumnos(respuestaGradebook(c, t))
        return salio ? primeraCambiada() : respuestaGradebook(c, t)
      }
      function ConInterruptor() {
        const [visible, setVisible] = useState(true)
        return (
          <>
            <button type="button" onClick={() => setVisible((v) => !v)}>
              Otra sección
            </button>
            {visible && rutas}
          </>
        )
      }
      render(
        <Providers>
          <ConInterruptor />
        </Providers>,
      )
      await esperarTabla()
      salio = true
      fireEvent.click(boton("Alumnos siguientes"))
      await waitFor(() => expect(screen.getByText(CURSOR_TEXTO)).toBeInTheDocument(), {
        timeout: 4_000,
      })
      fireEvent.click(boton("Otra sección"))
      expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
      fireEvent.click(boton("Otra sección"))
      await waitFor(() => expect(screen.getByText("2 alumnos")).toBeInTheDocument(), {
        timeout: 4_000,
      })
      await reposar()
      expect(sinBoton("Alumnos siguientes")).toBeNull()
      expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
      expect(aviso.error).not.toHaveBeenCalled()
    },
    15_000,
  )
})

describe("Evidencia de N-52 (riesgo residual ya decidido; no es hallazgo)", () => {
  it("CAL-T-248 (evidencia N-52): con dos cambios de la clase en menos de 30 s y el mismo cursor en la primera ventana nueva, «Alumnos siguientes» sirve la ventana vacía de la caché sin pedirla y vuelve el texto", async () => {
    let etapa = 0
    cuerpoDelServidor = (c, t) => {
      const r = respuestaGradebook(c, t)
      if (c !== null) return etapa === 1 ? sinAlumnos(r) : r
      if (etapa === 1) return primeraCambiada()
      return r
    }
    const cliente = nuevoCliente()
    const primera = montar(cliente)
    await esperarTabla()
    etapa = 1
    fireEvent.click(boton("Alumnos siguientes"))
    await unSoloTexto()
    await reposar()
    primera.unmount()
    etapa = 2
    montar(cliente)
    await waitFor(() => expect(screen.getByText("3 alumnos")).toBeInTheDocument())
    await waitFor(() => expect(cliente.isFetching()).toBe(0))
    await reposar()
    const i = llamadas.length
    fireEvent.click(boton("Alumnos siguientes"))
    await unSoloTexto()
    expect(desde(i)).toHaveLength(0)
  })
})
