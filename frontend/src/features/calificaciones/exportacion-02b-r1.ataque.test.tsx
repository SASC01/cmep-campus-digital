import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { toast, Toaster } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { celdasDeLaHoja, leerZip } from "@/lib/lector-xlsx-de-prueba"
import { armarLibroXlsx } from "@/lib/xlsx"
import { descargarArchivo } from "@/services/descargaService"
import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { GradebookView } from "./gradebook-view"
import {
  combinarVentanasDeExportacion,
  hojaDeExportacion,
  nombreDelArchivoDeExportacion,
} from "./lib"
import type {
  ColumnaDelGradebook,
  ExportacionDeCalificacionesRespuesta,
  MatrizDeExportacion,
  VentanaDeExportacion,
} from "./types"

// Ataque del Tester, CALIFICACIONES-02b, ronda 1 (plan, "Puntos de ataque para el Tester" → 02b):
// lo que las pruebas requeridas no recorren. El aborto entre dos ventanas, los cursores que se
// repiten en la interfaz, el tope exacto de 200 peticiones, el texto del servidor y los datos de los
// alumnos fuera de la hoja (avisos, DOM y caché de mutaciones), el doble clic con una ventana del
// gradebook en vuelo, el escape de punta a punta, el nombre del archivo en el borde de 80 con
// emojis de varios puntos de código, el límite de columnas de Excel y N-07 (una combinación aceptada
// siempre deja cada celda en su columna). El servidor es un doble (fetch sustituido), la descarga un
// doble, los avisos sonner real con espías. Reloj fijo (solo Date). Los emojis van con escapes.

vi.mock("@/services/descargaService", () => ({ descargarArchivo: vi.fn() }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const PASADA = "2030-01-05T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`
const RUTA_GRADEBOOK = `/api/clases/${CLASE_ID}/gradebook`
const RUTA_EXPORTACION = `/api/clases/${CLASE_ID}/calificaciones/exportacion`
const BASE = "/maestro/clases"
const RUTA = `${BASE}/${CLASE_ID}/calificaciones`

const GENERICO = "No pudimos preparar el archivo de calificaciones. Inténtalo de nuevo."
const CAMBIO = "Las calificaciones cambiaron mientras preparábamos el archivo. Inténtalo de nuevo."
const SIN_ACCESO = "No tienes acceso a esta clase."
const DEMASIADO = "Esta clase tiene demasiadas calificaciones para exportarlas en un solo archivo."

const TA = { id: id(101), titulo: "Tarea A", fechaLimite: FUTURA, puntos: 10, categoria: null }
const TB = {
  id: id(102),
  titulo: "Tarea B",
  fechaLimite: PASADA,
  puntos: 20,
  categoria: { id: id(201), nombre: "Proyectos" },
}
const ANA = { id: id(301), nombre: "Ana Ruiz", email: "ana.ruiz@ejemplo.mx" }
const BETO = { id: id(302), nombre: "Beto Díaz", email: "beto.diaz@ejemplo.mx" }
const ASIGNADA = { estado: "asignado", conRetraso: false, calificacion: null }

type Tarea = typeof TA | typeof TB | ColumnaDelGradebook
interface Alumno {
  alumno: { id: string; nombre: string; email: string }
  porcentaje: number | null
  celdas: Record<string, Record<string, unknown>>
}
interface Modelo {
  clase: string
  tareas: Tarea[]
  alumnos: Alumno[]
  porTareas: number
  porAlumnos: number
}

const modeloBase = (): Modelo => ({
  clase: "Historia",
  tareas: [TA, TB],
  alumnos: [
    {
      alumno: ANA,
      porcentaje: 85,
      celdas: { [TA.id]: { estado: "calificado", conRetraso: false, calificacion: 8.5 } },
    },
    { alumno: BETO, porcentaje: 42.5, celdas: {} },
  ],
  porTareas: 100,
  porAlumnos: 100,
})

const responder = (m: Modelo, cursor: string | null, cursorTareas: string | null) => {
  const desdeT = cursorTareas === null ? 0 : m.tareas.findIndex((t) => t.id === cursorTareas) + 1
  const tareas = m.tareas.slice(desdeT, desdeT + m.porTareas)
  const desdeA = cursor === null ? 0 : m.alumnos.findIndex((a) => a.alumno.id === cursor) + 1
  const alumnos = m.alumnos.slice(desdeA, desdeA + m.porAlumnos)
  return {
    clase: { nombre: m.clase },
    tareas,
    siguienteCursorTareas:
      desdeT + m.porTareas < m.tareas.length ? (tareas.at(-1)?.id ?? null) : null,
    totalTareas: m.tareas.length,
    alumnos: alumnos.map((a) => ({
      alumno: a.alumno,
      celdas: tareas.map((t) => ({ tareaId: t.id, ...(a.celdas[t.id] ?? ASIGNADA) })),
      porcentaje: a.porcentaje,
    })),
    siguienteCursor:
      desdeA + m.porAlumnos < m.alumnos.length ? (alumnos.at(-1)?.alumno.id ?? null) : null,
    totalAlumnos: m.alumnos.length,
  }
}

const gradebook = (cursor: string | null) => ({
  tareas: [TA, TB],
  siguienteCursorTareas: null,
  alumnos: [
    {
      alumno:
        cursor === null ? { id: ANA.id, nombre: ANA.nombre } : { id: id(303), nombre: "Carla" },
      celdas: [TA, TB].map((t) => ({ tareaId: t.id, ...ASIGNADA })),
      porcentaje: null,
      vencidasSinEntregar: 0,
      motivosDeRiesgo: [],
    },
  ],
  siguienteCursor: cursor === null ? id(960) : null,
  resumen: { modo: "puntos", totalAlumnos: 2, promedioDeLaClase: null, alumnosEnRiesgo: 0 },
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface Llamada {
  url: string
  cursor: string | null
  cursorTareas: string | null
  signal: AbortSignal | null
}
type Manejador = (llamada: Llamada) => Response | Promise<Response> | undefined

let modelo: Modelo
let llamadas: Llamada[] = []
let manejarExportacion: Manejador
let manejarGradebook: Manejador

const instalarServidor = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const p = new URL(url, "http://local").searchParams
      const llamada: Llamada = {
        url,
        cursor: p.get("cursor"),
        cursorTareas: p.get("cursorTareas"),
        signal: init?.signal ?? null,
      }
      llamadas.push(llamada)
      if (url.startsWith(`${RUTA_EXPORTACION}?`)) {
        const propia = manejarExportacion(llamada)
        if (propia !== undefined) return Promise.resolve(propia)
        return Promise.resolve(
          respuestaJson(200, responder(modelo, llamada.cursor, llamada.cursorTareas)),
        )
      }
      if (url.startsWith(`${RUTA_GRADEBOOK}?`)) {
        const propia = manejarGradebook(llamada)
        if (propia !== undefined) return Promise.resolve(propia)
        return Promise.resolve(respuestaJson(200, gradebook(llamada.cursor)))
      }
      if (url === "/api/auth/refrescar")
        return Promise.resolve(errorApi(401, "NO_AUTENTICADO", "x"))
      return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
}

const montar = () => {
  const router = createMemoryRouter(
    [
      { path: `${BASE}/:claseId/calificaciones`, element: <GradebookView /> },
      { path: `${BASE}/:claseId/personas`, element: <p>Personas de prueba</p> },
    ],
    { initialEntries: [RUTA] },
  )
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  )
  return { router, cliente }
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

const esperarTabla = () => screen.findByRole("table", { name: "Calificaciones por alumno y tarea" })
const botonExportar = () => screen.getByRole("button", { name: "Exportar a Excel" })
const exportaciones = () => llamadas.filter((l) => l.url.startsWith(`${RUTA_EXPORTACION}?`))
const textosDeAvisos = () => [
  ...vi.mocked(toast.success).mock.calls.map(([t]) => String(t)),
  ...vi.mocked(toast.error).mock.calls.map(([t]) => String(t)),
]
const exportarYEsperar = async () => {
  fireEvent.click(botonExportar())
  await waitFor(() => expect(botonExportar()).not.toHaveAttribute("aria-busy"))
  await reposar()
}
const bytesDescargados = (vez = 0): Uint8Array => {
  const llamada = vi.mocked(descargarArchivo).mock.calls[vez]
  if (llamada === undefined) throw new Error(`Precondición: hubo la descarga ${String(vez + 1)}`)
  return llamada[0]
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  llamadas = []
  modelo = modeloBase()
  manejarExportacion = () => undefined
  manejarGradebook = () => undefined
  instalarServidor()
  vi.spyOn(toast, "success")
  vi.spyOn(toast, "error")
})

afterEach(() => {
  toast.dismiss()
  cleanup()
  limpiarToken()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.mocked(descargarArchivo).mockReset()
  vi.mocked(irA).mockReset()
})

describe("ataque CALIFICACIONES-02b r1: el recorrido en la interfaz", () => {
  it("CAL2-T-11: salir de Calificaciones entre dos ventanas (la primera ya llegó) aborta la segunda con la misma señal, no pide una tercera y no avisa ni descarga aunque la segunda llegue después", async () => {
    modelo.porAlumnos = 1
    const segunda = diferido()
    manejarExportacion = (l) => (l.cursor === null ? undefined : segunda.promesa)
    const { router } = montar()
    await esperarTabla()
    fireEvent.click(botonExportar())
    await waitFor(() => expect(exportaciones()).toHaveLength(2))
    const [primera, enVuelo] = exportaciones()
    expect(primera?.signal, "Precondición: la primera lleva señal").not.toBeNull()
    expect(enVuelo?.signal).toBe(primera?.signal)
    await act(async () => {
      await router.navigate(`${BASE}/${CLASE_ID}/personas`)
    })
    expect(await screen.findByText("Personas de prueba")).toBeInTheDocument()
    expect(enVuelo?.signal?.aborted).toBe(true)
    segunda.resolver(respuestaJson(200, responder(modelo, ANA.id, null)))
    await reposar()
    expect(exportaciones()).toHaveLength(2)
    expect(textosDeAvisos()).toEqual([])
    expect(descargarArchivo).not.toHaveBeenCalled()
  })

  it("CAL2-T-12: un cursor de alumnos que vuelve a uno ya visto (A → B → A) y un cursor de tareas que se repite paran el recorrido con el aviso de cambio, sin descarga y sin pedir de más", async () => {
    const uno = (alumno: typeof ANA, siguiente: string | null) => ({
      clase: { nombre: "Historia" },
      tareas: [TA],
      siguienteCursorTareas: null,
      totalTareas: 1,
      alumnos: [{ alumno, celdas: [{ tareaId: TA.id, ...ASIGNADA }], porcentaje: null }],
      siguienteCursor: siguiente,
      totalAlumnos: 3,
    })
    const CARLA = { id: id(303), nombre: "Carla", email: "carla@ejemplo.mx" }
    manejarExportacion = (l) => {
      if (l.cursor === null) return respuestaJson(200, uno(ANA, ANA.id))
      if (l.cursor === ANA.id) return respuestaJson(200, uno(BETO, BETO.id))
      return respuestaJson(200, uno(CARLA, ANA.id))
    }
    montar()
    await esperarTabla()
    await exportarYEsperar()
    expect(exportaciones().map((l) => l.cursor)).toEqual([null, ANA.id, BETO.id])
    expect(textosDeAvisos()).toEqual([CAMBIO])
    expect(descargarArchivo).not.toHaveBeenCalled()

    vi.mocked(toast.error).mockClear()
    llamadas = []
    const porTareas = (tarea: Tarea, siguiente: string) => ({
      clase: { nombre: "Historia" },
      tareas: [tarea],
      siguienteCursorTareas: siguiente,
      totalTareas: 3,
      alumnos: [{ alumno: ANA, celdas: [{ tareaId: tarea.id, ...ASIGNADA }], porcentaje: null }],
      siguienteCursor: null,
      totalAlumnos: 1,
    })
    manejarExportacion = (l) =>
      respuestaJson(200, l.cursorTareas === null ? porTareas(TA, TA.id) : porTareas(TB, TA.id))
    await exportarYEsperar()
    expect(exportaciones().map((l) => l.cursorTareas)).toEqual([null, TA.id])
    expect(textosDeAvisos()).toEqual([CAMBIO])
    expect(descargarArchivo).not.toHaveBeenCalled()
  })

  it("CAL2-T-13: con exactamente 200 ventanas necesarias (20,000 alumnos × 1 tarea) hace las 200 peticiones y descarga un archivo con las 20,000 filas; no dice «demasiadas»", async () => {
    const TOTAL = 20_000
    const alumnoDe = (n: number) => ({
      id: id(10_000 + n),
      nombre: `Alumno ${String(n).padStart(5, "0")}`,
      email: `a${String(n)}@ejemplo.mx`,
    })
    manejarExportacion = (l) => {
      const desde = l.cursor === null ? 0 : Number.parseInt(l.cursor.slice(-12), 16) - 10_000 + 1
      const pagina = Array.from({ length: 100 }, (_, i) => alumnoDe(desde + i))
      return respuestaJson(200, {
        clase: { nombre: "Grande" },
        tareas: [TA],
        siguienteCursorTareas: null,
        totalTareas: 1,
        alumnos: pagina.map((alumno) => ({
          alumno,
          celdas: [{ tareaId: TA.id, ...ASIGNADA }],
          porcentaje: null,
        })),
        siguienteCursor: desde + 100 < TOTAL ? (pagina.at(-1)?.id ?? null) : null,
        totalAlumnos: TOTAL,
      })
    }
    montar()
    await esperarTabla()
    fireEvent.click(botonExportar())
    await waitFor(() => expect(descargarArchivo).toHaveBeenCalledTimes(1), { timeout: 60_000 })
    await reposar()
    expect(exportaciones()).toHaveLength(200)
    expect(textosDeAvisos()).toHaveLength(1)
    expect(textosDeAvisos()[0]).toMatch(/^Se descargó/)
    const celdas = celdasDeLaHoja(bytesDescargados())
    expect(celdas.get(`A${String(TOTAL + 3)}`)?.valor).toBe("Alumno 19999")
    expect(celdas.has(`A${String(TOTAL + 4)}`)).toBe(false)
  }, 120_000)
})

describe("ataque CALIFICACIONES-02b r1: lo que la persona lee y lo que queda en la página", () => {
  it("CAL2-T-14: el texto del servidor nunca llega: 403 SIN_ACCESO, 400 de cursor, 400 de otro campo, 409 desconocido y 503 con un mensaje propio dan los textos fijos y nunca el mensaje", async () => {
    const MARCA = "MENSAJE-DEL-SERVIDOR ana.ruiz@ejemplo.mx"
    const casos: [Response, string][] = [
      [errorApi(403, "SIN_ACCESO_A_LA_CLASE", MARCA), SIN_ACCESO],
      [errorApi(400, "VALIDACION", `cursor: ${MARCA}`), CAMBIO],
      [errorApi(400, "VALIDACION", `cursorTareas: ${MARCA}`), CAMBIO],
      [errorApi(400, "VALIDACION", `limite: ${MARCA}`), GENERICO],
      [errorApi(400, "VALIDACION", MARCA), GENERICO],
      [errorApi(409, "OTRA_COSA", MARCA), GENERICO],
      [errorApi(503, "SERVICIO_OCUPADO", MARCA), GENERICO],
    ]
    montar()
    await esperarTabla()
    const vistos: string[] = []
    for (const [respuesta] of casos) {
      vi.mocked(toast.error).mockClear()
      manejarExportacion = () => respuesta.clone()
      await exportarYEsperar()
      vistos.push(textosDeAvisos().join(" | "))
      expect(document.body.textContent).not.toContain("MENSAJE-DEL-SERVIDOR")
    }
    expect(vistos).toEqual(casos.map(([, texto]) => texto))
    expect(descargarArchivo).not.toHaveBeenCalled()
  })

  it("CAL2-T-15: P-13 fuera de la hoja: tras exportar, ni la página ni los avisos ni la caché de mutaciones tienen un correo, una calificación de la hoja o un estado de pago; una respuesta con estadoPago de más no descarga y tampoco lo deja en la caché", async () => {
    const { cliente } = montar()
    await esperarTabla()
    await exportarYEsperar()
    expect(descargarArchivo).toHaveBeenCalledTimes(1)
    const cache = () =>
      JSON.stringify(
        cliente
          .getMutationCache()
          .getAll()
          .map((m) => m.state),
      )
    for (const prohibido of [ANA.email, BETO.email, "8.5", "42.5", "deudor", "estadoPago"]) {
      expect(document.body.textContent, prohibido).not.toContain(prohibido)
      expect(textosDeAvisos().join(" "), prohibido).not.toContain(prohibido)
      expect(cache(), prohibido).not.toContain(prohibido)
    }

    vi.mocked(toast.success).mockClear()
    manejarExportacion = (l) => {
      const cuerpo = responder(modelo, l.cursor, l.cursorTareas)
      return respuestaJson(200, {
        ...cuerpo,
        alumnos: cuerpo.alumnos.map((fila) => ({
          ...fila,
          alumno: { ...fila.alumno, estadoPago: "deudor", accesoRestringido: true },
        })),
      })
    }
    await exportarYEsperar()
    expect(textosDeAvisos()).toEqual([GENERICO])
    expect(descargarArchivo).toHaveBeenCalledTimes(1)
    for (const prohibido of [ANA.email, "deudor", "accesoRestringido"]) {
      expect(document.body.textContent, prohibido).not.toContain(prohibido)
      expect(cache(), prohibido).not.toContain(prohibido)
    }
  })

  it("CAL2-T-16: tres clics en «Exportar a Excel» con «Alumnos siguientes» en vuelo a la mitad: un solo recorrido, una descarga y un aviso; al final ningún control queda en espera", async () => {
    const primera = diferido()
    const ventanaDelGradebook = diferido()
    manejarExportacion = () => primera.promesa
    manejarGradebook = (l) => (l.cursor === null ? undefined : ventanaDelGradebook.promesa)
    montar()
    await esperarTabla()
    const boton = botonExportar()
    fireEvent.click(boton)
    fireEvent.click(boton)
    await waitFor(() => expect(exportaciones()).toHaveLength(1))
    fireEvent.click(screen.getByRole("button", { name: "Alumnos siguientes" }))
    await waitFor(() => expect(botonExportar()).toHaveAttribute("aria-busy", "true"))
    fireEvent.click(botonExportar())
    primera.resolver(respuestaJson(200, responder(modelo, null, null)))
    await waitFor(() => expect(descargarArchivo).toHaveBeenCalledTimes(1))
    fireEvent.click(botonExportar())
    ventanaDelGradebook.resolver(respuestaJson(200, gradebook(id(960))))
    await waitFor(() => expect(document.querySelector("[aria-busy='true']")).toBeNull())
    await reposar()
    expect(exportaciones()).toHaveLength(1)
    expect(descargarArchivo).toHaveBeenCalledTimes(1)
    expect(textosDeAvisos()).toHaveLength(1)
  })

  it("CAL2-T-17: de punta a punta, la clase, los títulos, las categorías y los nombres con XML, fórmulas, escapes de OOXML y controles llegan como texto a su celda, sin <f>, y la hoja es XML bien formado", async () => {
    const raros = {
      formula: '=HYPERLINK("http://ejemplo.mx";"clic")',
      xml: "<b>]]>&amp;</b>",
      ooxml: "Tarea_x0041_ y _x00E9_",
      control: "Uno\u{0007}Dos\u{FFFE}",
      direccion: "Ana \u{202E}xslx.exe",
      separadores: "Ln\u{2028}Par\u{2029}",
    }
    modelo.clase = raros.formula
    modelo.tareas = [
      { ...TA, titulo: raros.xml },
      { ...TB, titulo: raros.ooxml, categoria: { id: id(201), nombre: raros.separadores } },
    ]
    modelo.alumnos = [
      { alumno: { ...ANA, nombre: raros.control }, porcentaje: 85, celdas: {} },
      { alumno: { ...BETO, nombre: raros.direccion }, porcentaje: null, celdas: {} },
    ]
    montar()
    await esperarTabla()
    await exportarYEsperar()
    const bytes = bytesDescargados()
    const hoja = leerZip(bytes).find((e) => e.nombre === "xl/worksheets/sheet1.xml")?.contenido
    expect(hoja, "Precondición: la hoja está en el ZIP").toBeDefined()
    const xml = new DOMParser().parseFromString(hoja ?? "", "application/xml")
    expect(xml.getElementsByTagName("parsererror")).toHaveLength(0)
    expect(hoja).not.toMatch(/<f[\s>]/)
    const celdas = celdasDeLaHoja(bytes)
    // Columnas de la más antigua (TB) a la más reciente (TA).
    // El lector no deshace el escape de OOXML (Excel sí): se guarda _x005F_ delante de cada _xHHHH_.
    expect(celdas.get("C1")).toMatchObject({
      tipo: "texto",
      valor: "Tarea_x005F_x0041_ y _x005F_x00E9_",
    })
    expect(celdas.get("D1")).toMatchObject({ tipo: "texto", valor: raros.xml })
    expect(celdas.get("C2")).toMatchObject({ tipo: "texto", valor: raros.separadores })
    expect(celdas.get("A4")).toMatchObject({ tipo: "texto", valor: "UnoDos" })
    expect(celdas.get("A5")).toMatchObject({ tipo: "texto", valor: raros.direccion })
    const nombre = vi.mocked(descargarArchivo).mock.calls[0]?.[1] ?? ""
    expect(nombre).toMatch(
      /^Calificaciones - =HYPERLINK\( http ejemplo\.mx ; clic \) - \d{4}-\d{2}-\d{2}\.xlsx$/,
    )
  })
})

describe("ataque CALIFICACIONES-02b r1: el nombre del archivo y los límites de Excel", () => {
  const ahora = new Date(2030, 0, 10, 12, 0, 0)

  it("CAL2-T-18: en el borde de 80 puntos de código no queda un emoji partido (DH-03: «hasta 80 caracteres, sin partir un emoji»): ni una bandera a medias, ni una unión ZWJ colgando, ni un modificador o selector suelto", () => {
    const casos = {
      bandera: `${"a".repeat(79)}\u{1F1F2}\u{1F1FD}z`,
      familia: `${"a".repeat(78)}\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}z`,
      tecla: `${"a".repeat(79)}1\u{FE0F}\u{20E3}z`,
    }
    const restos: Record<string, string> = {}
    for (const [nombre, clase] of Object.entries(casos)) {
      const archivo = nombreDelArchivoDeExportacion(clase, ahora)
      const deLaClase = archivo
        .replace(/^Calificaciones - /, "")
        .replace(/ - 2030-01-10\.xlsx$/, "")
      const final = Array.from(deLaClase).slice(-1)[0] ?? ""
      restos[nombre] = (final.codePointAt(0) ?? 0).toString(16)
    }
    // Lo esperado: la clase termina en una "a" (el emoji entero se quita) o en el emoji completo.
    expect(restos).toEqual({ bandera: "61", familia: "61", tecla: "61" })
  })

  it("CAL2-T-19: el nombre usa la fecha local del clic también en la medianoche: 23:59:59.999 da ese día y 00:00:00.000 el siguiente", () => {
    expect(nombreDelArchivoDeExportacion("Mate", new Date(2030, 11, 31, 23, 59, 59, 999))).toBe(
      "Calificaciones - Mate - 2030-12-31.xlsx",
    )
    expect(nombreDelArchivoDeExportacion("Mate", new Date(2031, 0, 1, 0, 0, 0, 0))).toBe(
      "Calificaciones - Mate - 2031-01-01.xlsx",
    )
  })

  // Reescrita por el arbitraje del manager de la ronda 1 de 02b (T-02, revision.md "## Arbitraje de
  // la ronda 1 — 02b"): la versión anterior solo pasaba quitando columnas en silencio. Ahora afirma
  // que el escritor lanza en lugar de dar una hoja que pase de XFD (a), y que por la vista la primera
  // respuesta con 16,382 tareas da el aviso de demasiadas de M-03 sin descargar (b).
  it("CAL2-T-20 (a): con 1 alumno y 16,382 tareas (16,385 columnas), armarLibroXlsx(hojaDeExportacion(…)) lanza un Error y nunca devuelve una hoja que pase de la XFD", () => {
    const TAREAS = 16_382
    const columnas: ColumnaDelGradebook[] = Array.from({ length: TAREAS }, (_, i) => ({
      id: id(100_000 + i),
      titulo: `T${String(i)}`,
      fechaLimite: new Date(Date.UTC(2030, 0, 1) + i * 60_000).toISOString(),
      puntos: 10,
      categoria: null,
    }))
    const matriz: MatrizDeExportacion = {
      clase: "Muchas",
      columnas,
      filas: [
        {
          alumno: ANA,
          celdas: columnas.map((c) => ({
            tareaId: c.id,
            estado: "asignado" as const,
            conRetraso: false,
            calificacion: null,
          })),
          porcentaje: null,
        },
      ],
    }
    let libro: Uint8Array | null = null
    let error: unknown = null
    try {
      libro = armarLibroXlsx(hojaDeExportacion(matriz, ahora))
    } catch (lanzado) {
      error = lanzado
    }
    const hoja =
      libro === null
        ? ""
        : (leerZip(libro).find((e) => e.nombre === "xl/worksheets/sheet1.xml")?.contenido ?? "")
    const masAllaDeXfd = [...hoja.matchAll(/ r="([A-Z]+)\d+"/g)]
      .map((m) => m[1] ?? "")
      .filter((letras) => letras.length > 3 || (letras.length === 3 && letras > "XFD"))
    expect([...new Set(masAllaDeXfd)], "una hoja con columnas después de XFD").toEqual([])
    expect(libro, "armarLibroXlsx devolvió un libro con 16,385 columnas").toBeNull()
    expect(error).toBeInstanceOf(Error)
  })

  it("CAL2-T-20 (b): por la vista, una primera respuesta con 1 alumno y 16,382 tareas da una sola petición y el aviso de demasiadas (M-03), sin descarga y con el botón fuera de la espera", async () => {
    const TAREAS = 16_382
    // En el orden de la API: la más reciente primero.
    const tareaDe = (i: number): ColumnaDelGradebook => ({
      id: id(100_000 + i),
      titulo: `T${String(i)}`,
      fechaLimite: new Date(Date.UTC(2030, 0, 1) + (TAREAS - i) * 60_000).toISOString(),
      puntos: 10,
      categoria: null,
    })
    manejarExportacion = (l) => {
      const desde =
        l.cursorTareas === null ? 0 : Number.parseInt(l.cursorTareas.slice(-12), 16) - 100_000 + 1
      const tareas = Array.from({ length: Math.min(100, TAREAS - desde) }, (_, i) =>
        tareaDe(desde + i),
      )
      return respuestaJson(200, {
        clase: { nombre: "Muchas" },
        tareas,
        siguienteCursorTareas: desde + 100 < TAREAS ? (tareas.at(-1)?.id ?? null) : null,
        totalTareas: TAREAS,
        alumnos: [
          {
            alumno: ANA,
            celdas: tareas.map((t) => ({ tareaId: t.id, ...ASIGNADA })),
            porcentaje: null,
          },
        ],
        siguienteCursor: null,
        totalAlumnos: 1,
      })
    }
    montar()
    await esperarTabla()
    fireEvent.click(botonExportar())
    await waitFor(() => expect(botonExportar()).not.toHaveAttribute("aria-busy"), {
      timeout: 60_000,
    })
    await reposar()
    expect(exportaciones()).toHaveLength(1)
    expect(textosDeAvisos()).toEqual([DEMASIADO])
    expect(descargarArchivo).not.toHaveBeenCalled()
    expect(botonExportar()).not.toHaveAttribute("aria-busy")
  }, 120_000)
})

describe("ataque CALIFICACIONES-02b r1: N-07 (una celda que falta en una fila)", () => {
  // Generador determinista (sin Math.random): mulberry32.
  const generador = (semilla: number) => {
    let a = semilla
    return () => {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  const ventanasDe = (
    azar: () => number,
  ): { ventanas: VentanaDeExportacion[]; tareas: ColumnaDelGradebook[] } => {
    const nTareas = 1 + Math.floor(azar() * 5)
    const nAlumnos = 1 + Math.floor(azar() * 5)
    const porT = 1 + Math.floor(azar() * nTareas)
    const porA = 1 + Math.floor(azar() * nAlumnos)
    const tareas: ColumnaDelGradebook[] = Array.from({ length: nTareas }, (_, i) => ({
      id: id(500 + i),
      titulo: `T${String(i)}`,
      fechaLimite: new Date(Date.UTC(2030, 0, 1 + Math.floor(azar() * 3))).toISOString(),
      puntos: 10,
      categoria: null,
    }))
    const alumnos = Array.from({ length: nAlumnos }, (_, i) => ({
      id: id(700 + i),
      nombre: `A${String(i)}`,
      email: `a${String(i)}@x.mx`,
    }))
    const ventanas: VentanaDeExportacion[] = []
    for (let t = 0, v = 0; t < nTareas; t += porT, v += 1) {
      const deLaVentana = tareas.slice(t, t + porT)
      for (let a = 0; a < nAlumnos; a += porA) {
        const respuesta: ExportacionDeCalificacionesRespuesta = {
          clase: { nombre: "C" },
          tareas: deLaVentana,
          siguienteCursorTareas: null,
          totalTareas: nTareas,
          alumnos: alumnos.slice(a, a + porA).map((alumno) => ({
            alumno,
            celdas: deLaVentana.map((c) => ({
              tareaId: c.id,
              estado: "asignado",
              conRetraso: false,
              calificacion: null,
            })),
            porcentaje: null,
          })),
          siguienteCursor: null,
          totalAlumnos: nAlumnos,
        }
        ventanas.push({ ventanaDeTareas: v, respuesta })
      }
    }
    return { ventanas, tareas }
  }

  // Cambios que podrían dejar una fila sin una de sus celdas.
  const perturbar = (ventanas: VentanaDeExportacion[], azar: () => number): void => {
    const v = ventanas[Math.floor(azar() * ventanas.length)]
    const fila = v?.respuesta.alumnos[Math.floor(azar() * (v.respuesta.alumnos.length || 1))]
    const tipo = Math.floor(azar() * 6)
    if (v === undefined || fila === undefined) {
      expect(ventanas.length, "Precondición: hay ventanas").toBeGreaterThan(0)
    } else if (tipo === 0) fila.celdas.pop()
    else if (tipo === 1) fila.celdas.reverse()
    else if (tipo === 2) v.respuesta.alumnos.reverse()
    else if (tipo === 3) v.respuesta.alumnos.pop()
    else if (tipo === 4) v.respuesta.tareas = v.respuesta.tareas.slice(1)
    else fila.celdas.splice(0, 1, ...fila.celdas.slice(0, 1), ...fila.celdas.slice(0, 1))
  }

  it("CAL2-T-21: en 3,000 combinaciones (con y sin un cambio que quita, repite o reordena celdas, filas o tareas), toda matriz aceptada tiene en cada fila exactamente una celda por columna y en su orden", () => {
    const azar = generador(20_261_104)
    const fallas: string[] = []
    let matrices = 0
    for (let i = 0; i < 3_000; i += 1) {
      const { ventanas } = ventanasDe(azar)
      const cambios = Math.floor(azar() * 3)
      for (let c = 0; c < cambios; c += 1) perturbar(ventanas, azar)
      const resultado = combinarVentanasDeExportacion(ventanas)
      if (resultado.tipo !== "matriz") continue
      matrices += 1
      const ids = resultado.matriz.columnas.map((c) => c.id)
      for (const fila of resultado.matriz.filas) {
        const deLaFila = fila.celdas.map((c) => c.tareaId)
        if (JSON.stringify(deLaFila) !== JSON.stringify(ids)) fallas.push(`caso ${String(i)}`)
      }
    }
    expect(matrices, "Precondición: hubo matrices aceptadas").toBeGreaterThan(500)
    expect(fallas).toEqual([])
  })
})
