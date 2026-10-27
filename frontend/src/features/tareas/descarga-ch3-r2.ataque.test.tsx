import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ENTRADAS_DE_FORMULARIO, MENSAJE_DE_PRUEBA } from "@/lib/errores-de-api-fuera-de-contrato"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { DetalleTareaView } from "./detalle-tarea-view"
import { EntregaDeAlumnoView } from "./entrega-de-alumno-view"

// Ataque CHORE-03 03a, ronda 2 (tester): la guarda con ref de «Descargar» (Enmienda 2, T-02; DH-6) en
// los tres sitios de features/tareas, por la interfaz real (vista → AdjuntosDePublicacion →
// useUrlDeDescarga(En) → alFallarLaDescarga). Los estados vecinos que CH3-A26 no tiene (O-10 del
// manager): dos fallos seguidos con un tercer intento bueno; tres clics, uno después de que React
// vuelve a pintar; la vista desmontada con la petición en vuelo (que falla o que sale bien), y
// desmontar y volver a montar con la petición en vuelo. Ningún caso deja un error en la consola.
// Reloj fijo (solo Date). El servidor es un doble en memoria.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ALUMNO_ID = "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0301"
const RUTA_CLASE = `/api/clases/${CLASE_ID}`
const RUTA_TAREA = `${RUTA_CLASE}/tareas/${TAREA_ID}`
const RUTA_MI_ENTREGA = `${RUTA_TAREA}/entrega`
const RUTA_ALUMNO = `${RUTA_TAREA}/entregas/${ALUMNO_ID}`
const URL_DE_DESCARGA = "https://almacen.ejemplo.mx/descarga/x?X-Amz-Expires=300"
const uuid = (n: number) => `9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`

const DETALLE_ALUMNO = `/estudiante/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const DE_ALUMNO = `/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/entregas/${ALUMNO_ID}`

const adjunto = (n: number, nombre: string) => ({
  id: uuid(700 + n),
  nombre,
  tipo: "application/pdf",
  tamano: 2048,
  vistaPrevia: null,
})

let adjuntosDeLaTarea: ReturnType<typeof adjunto>[] = []
let adjuntosDeMiEntrega: ReturnType<typeof adjunto>[] = []
let adjuntosDelAlumno: ReturnType<typeof adjunto>[] = []
let entregada = false

const tareaDoble = () => ({
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
    rubrica: [],
    adjuntos: adjuntosDeLaTarea,
    autor: { id: uuid(1), nombre: "Luis Pérez", administracion: false },
    creadoEn: "2030-01-01T15:30:00.000Z",
    actualizadoEn: "2030-01-01T15:30:00.000Z",
    puedeEditar: true,
    puedeBorrar: true,
  },
})

const miEntrega = () => ({
  estado: entregada ? "entregado" : "asignado",
  fechaEntrega: entregada ? "2030-01-09T15:30:00.000Z" : null,
  conRetraso: false,
  enlaces: [],
  adjuntos: adjuntosDeMiEntrega,
  puedeEntregar: !entregada,
  puedeAnular: entregada,
  calificacion: null,
})

const entregaDeAlumno = () => ({
  alumno: { id: ALUMNO_ID, nombre: "Ana Ruiz" },
  estado: "entregado",
  fechaEntrega: "2030-01-09T15:30:00.000Z",
  conRetraso: false,
  enlaces: [],
  adjuntos: adjuntosDelAlumno,
  version: 2,
  calificacion: null,
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

// F4: un 400 VALIDACION con una ruta de tres niveles que nadie pinta.
const conValidacion = () =>
  respuestaJson(400, {
    error: { codigo: "VALIDACION", mensaje: ENTRADAS_DE_FORMULARIO.ruta.mensaje },
  })
const conUrl = () =>
  respuestaJson(200, { url: URL_DE_DESCARGA, expiraEn: "2030-01-10T12:05:00.000Z" })

interface Llamada {
  metodo: string
  url: string
}

let llamadas: Llamada[] = []
let inesperadas: string[] = []
// Las peticiones de descarga quedan en vuelo hasta que la prueba las suelta, en orden.
let enVuelo: ((respuesta: Response) => void)[] = []
let esDescarga: (llamada: Llamada) => boolean = () => false

const deSiempre = ({ metodo, url }: Llamada): Response => {
  if (metodo === "GET" && url === RUTA_TAREA) return respuestaJson(200, tareaDoble())
  if (metodo === "GET" && url === RUTA_MI_ENTREGA) {
    return respuestaJson(200, { entrega: miEntrega() })
  }
  if (metodo === "GET" && url === RUTA_ALUMNO) {
    return respuestaJson(200, { entrega: entregaDeAlumno() })
  }
  if (metodo === "GET" && url.includes("/comentarios?")) {
    return respuestaJson(200, { comentarios: [], siguienteCursor: null })
  }
  inesperadas.push(`${metodo} ${url}`)
  return respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } })
}

const asignar = vi.fn()
const errorDeConsola = vi.fn()

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  adjuntosDeLaTarea = []
  adjuntosDeMiEntrega = []
  adjuntosDelAlumno = []
  entregada = false
  llamadas = []
  inesperadas = []
  enVuelo = []
  esDescarga = () => false
  vi.spyOn(console, "error").mockImplementation(errorDeConsola)
  vi.stubGlobal("location", { ...window.location, assign: asignar })
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const llamada = { metodo: init?.method ?? "GET", url: String(entrada) }
      llamadas.push(llamada)
      if (esDescarga(llamada)) return new Promise<Response>((r) => enVuelo.push(r))
      return Promise.resolve(deSiempre(llamada))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
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

const asentar = async (cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isFetching() + cliente.isMutating()).toBe(0))
  await reposar()
}

const avisos = () => aviso.error.mock.calls.map((llamada) => String(llamada[0]))
const pedidas = () => llamadas.filter(esDescarga).length

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

interface LugarDeDescarga {
  nombre: string
  ruta: string
  preparar: () => void
  archivo: string
  descarga: (llamada: Llamada) => boolean
}

const ADJUNTO_TAREA = adjunto(1, "guia.pdf")
const ADJUNTO_MI_ENTREGA = adjunto(2, "mi-ensayo.pdf")
const ADJUNTO_ALUMNO = adjunto(3, "ensayo-de-ana.pdf")

const LUGARES: readonly LugarDeDescarga[] = [
  {
    nombre: "un adjunto de la tarea en el detalle",
    ruta: DETALLE_ALUMNO,
    preparar: () => {
      adjuntosDeLaTarea = [ADJUNTO_TAREA]
    },
    archivo: ADJUNTO_TAREA.nombre,
    descarga: ({ metodo, url }) =>
      metodo === "POST" && url === `${RUTA_CLASE}/archivos/${ADJUNTO_TAREA.id}/descarga`,
  },
  {
    nombre: "un archivo de «Tu trabajo»",
    ruta: DETALLE_ALUMNO,
    preparar: () => {
      entregada = true
      adjuntosDeMiEntrega = [ADJUNTO_MI_ENTREGA]
    },
    archivo: ADJUNTO_MI_ENTREGA.nombre,
    descarga: ({ metodo, url }) =>
      metodo === "POST" && url === `${RUTA_MI_ENTREGA}/archivos/${ADJUNTO_MI_ENTREGA.id}/descarga`,
  },
  {
    nombre: "un archivo de la entrega de un alumno",
    ruta: DE_ALUMNO,
    preparar: () => {
      adjuntosDelAlumno = [ADJUNTO_ALUMNO]
    },
    archivo: ADJUNTO_ALUMNO.nombre,
    descarga: ({ metodo, url }) =>
      metodo === "POST" && url === `${RUTA_ALUMNO}/archivos/${ADJUNTO_ALUMNO.id}/descarga`,
  },
]

const Rutas = () => (
  <Routes>
    <Route
      path="/maestro/clases/:claseId/tareas/:tareaId/entregas/:alumnoId"
      element={<EntregaDeAlumnoView />}
    />
    <Route path="/estudiante/clases/:claseId/tareas/:tareaId" element={<DetalleTareaView />} />
    <Route path="*" element={<p>Otra pantalla</p>} />
  </Routes>
)

const montar = async (lugar: LugarDeDescarga, cliente?: QueryClient) => {
  const propio =
    cliente ??
    new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const montado = render(
    <QueryClientProvider client={propio}>
      <MemoryRouter initialEntries={[lugar.ruta]}>
        <Rutas />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  const boton = await screen.findByRole("button", { name: `Descargar ${lugar.archivo}` })
  // Solo las consultas: al volver a montar, la descarga del montaje anterior sigue en vuelo.
  await waitFor(() => expect(propio.isFetching()).toBe(0))
  await reposar()
  return { ...montado, cliente: propio, boton }
}

const abrir = async (lugar: LugarDeDescarga) => {
  lugar.preparar()
  esDescarga = lugar.descarga
  return montar(lugar)
}

const boton = (lugar: LugarDeDescarga) =>
  screen.getByRole("button", { name: `Descargar ${lugar.archivo}` })

describe("ataque CHORE-03 03a r2 · T-02: la guarda de «Descargar» en features/tareas", () => {
  it.each(LUGARES)(
    "$nombre: dos fallos seguidos dan un aviso cada uno, el botón queda disponible entre ambos y un tercer intento bueno descarga sin aviso de más",
    async (lugar) => {
      const { cliente } = await abrir(lugar)
      boton(lugar).focus()

      fireEvent.click(boton(lugar))
      await waitFor(() => expect(pedidas()).toBe(1))
      await soltarLaPrimera(conValidacion)
      await asentar(cliente)
      expect(avisos()).toEqual([MENSAJE_DE_PRUEBA])
      sinEspera(boton(lugar))
      expect(document.activeElement).toBe(boton(lugar))

      fireEvent.click(boton(lugar))
      await waitFor(() => expect(pedidas()).toBe(2))
      await soltarLaPrimera(conValidacion)
      await asentar(cliente)
      expect(avisos()).toEqual([MENSAJE_DE_PRUEBA, MENSAJE_DE_PRUEBA])
      sinEspera(boton(lugar))
      expect(document.activeElement).toBe(boton(lugar))

      fireEvent.click(boton(lugar))
      await waitFor(() => expect(pedidas()).toBe(3))
      await soltarLaPrimera(conUrl)
      await asentar(cliente)
      expect(asignar).toHaveBeenCalledTimes(1)
      expect(asignar).toHaveBeenCalledWith(URL_DE_DESCARGA)
      expect(avisos()).toEqual([MENSAJE_DE_PRUEBA, MENSAJE_DE_PRUEBA])
      sinEspera(boton(lugar))
      expect(inesperadas).toEqual([])
      expect(errorDeConsola).not.toHaveBeenCalled()
    },
  )

  it.each(LUGARES)(
    "$nombre: tres clics (dos en el mismo instante y uno después de que React vuelve a pintar) mandan una sola petición y navegan una vez; después del éxito, un clic nuevo vuelve a pedir",
    async (lugar) => {
      const { cliente } = await abrir(lugar)

      fireEvent.click(boton(lugar))
      fireEvent.click(boton(lugar))
      await reposar()
      expect(boton(lugar)).toHaveAttribute("aria-busy", "true")
      fireEvent.click(boton(lugar))
      await reposar()
      expect(pedidas()).toBe(1)
      expect(enVuelo).toHaveLength(1)

      await soltarLaPrimera(conUrl)
      await asentar(cliente)
      expect(asignar).toHaveBeenCalledTimes(1)
      expect(pedidas()).toBe(1)
      expect(avisos()).toEqual([])
      sinEspera(boton(lugar))

      // Tras un éxito la guarda también se libera: un clic nuevo vuelve a pedir la URL.
      fireEvent.click(boton(lugar))
      await waitFor(() => expect(pedidas()).toBe(2))
      await soltarLaPrimera(conUrl)
      await asentar(cliente)
      expect(asignar).toHaveBeenCalledTimes(2)
      expect(avisos()).toEqual([])
      expect(errorDeConsola).not.toHaveBeenCalled()
    },
  )

  it.each(LUGARES)(
    "$nombre: con la vista desmontada y la petición en vuelo, el fallo da a lo sumo el aviso de siempre (el del gancho, como en la base) y nada en la consola",
    async (lugar) => {
      const { unmount } = await abrir(lugar)

      fireEvent.click(boton(lugar))
      await waitFor(() => expect(pedidas()).toBe(1))
      unmount()
      await soltarLaPrimera(conValidacion)
      await reposar()

      expect(avisos()).toEqual([MENSAJE_DE_PRUEBA])
      expect(asignar).not.toHaveBeenCalled()
      expect(pedidas()).toBe(1)
      expect(errorDeConsola).not.toHaveBeenCalled()
    },
  )

  it.each(LUGARES)(
    "$nombre: con la vista desmontada y la petición en vuelo, si sale bien navega una sola vez, sin aviso, sin otra petición y sin nada en la consola",
    async (lugar) => {
      const { unmount } = await abrir(lugar)

      fireEvent.click(boton(lugar))
      fireEvent.click(boton(lugar))
      await waitFor(() => expect(pedidas()).toBe(1))
      unmount()
      await soltarLaPrimera(conUrl)
      await reposar()

      expect(avisos()).toEqual([])
      // Como en la base: la descarga pedida sigue y navega una sola vez, aunque la vista ya no esté.
      expect(asignar).toHaveBeenCalledTimes(1)
      expect(pedidas()).toBe(1)
      expect(errorDeConsola).not.toHaveBeenCalled()
    },
  )

  it.each(LUGARES)(
    "$nombre: desmontar y volver a montar con la petición en vuelo: la ficha nueva pide una sola vez por clic doble, y cada fallo da un solo aviso legible",
    async (lugar) => {
      const primero = await abrir(lugar)
      fireEvent.click(boton(lugar))
      await waitFor(() => expect(pedidas()).toBe(1))
      primero.unmount()

      const segundo = await montar(lugar, primero.cliente)
      fireEvent.click(segundo.boton)
      fireEvent.click(segundo.boton)
      await reposar()
      const despuesDelRemontaje = pedidas()

      await soltarLaPrimera(conValidacion)
      await soltarLaPrimera(conValidacion)
      await asentar(segundo.cliente)

      expect(despuesDelRemontaje).toBe(2)
      expect(avisos()).toEqual([MENSAJE_DE_PRUEBA, MENSAJE_DE_PRUEBA])
      sinEspera(boton(lugar))
      expect(errorDeConsola).not.toHaveBeenCalled()
    },
  )
})
