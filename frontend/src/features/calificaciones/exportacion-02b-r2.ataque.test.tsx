import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { toast, Toaster } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { celdasDeLaHoja } from "@/lib/lector-xlsx-de-prueba"
import { armarLibroXlsx, type CeldaXlsx } from "@/lib/xlsx"
import { descargarArchivo } from "@/services/descargaService"
import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { GradebookView } from "./gradebook-view"
import { cabeEnUnaHoja, nombreDelArchivoDeExportacion } from "./lib"
import type { ColumnaDelGradebook } from "./types"

// Ataque del Tester, CALIFICACIONES-02b, ronda 2: la corrección de T-01 (el nombre del archivo
// recortado sin partir un grafema), de T-02 (la hoja que no cabe en Excel: el recorrido, la función
// pura y el escritor) y sus estados vecinos. Los emojis, las marcas y los invisibles van con escapes.
// Reloj fijo (solo Date).

vi.mock("@/services/descargaService", () => ({ descargarArchivo: vi.fn() }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`
const RUTA_GRADEBOOK = `/api/clases/${CLASE_ID}/gradebook`
const RUTA_EXPORTACION = `/api/clases/${CLASE_ID}/calificaciones/exportacion`
const RUTA = `/maestro/clases/${CLASE_ID}/calificaciones`

const CAMBIO = "Las calificaciones cambiaron mientras preparábamos el archivo. Inténtalo de nuevo."
const DEMASIADO = "Esta clase tiene demasiadas calificaciones para exportarlas en un solo archivo."

const ANA = { id: id(301), nombre: "Ana Ruiz", email: "ana.ruiz@ejemplo.mx" }
const ASIGNADA = { estado: "asignado", conRetraso: false, calificacion: null }

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const columnaDelGradebook: ColumnaDelGradebook = {
  id: id(101),
  titulo: "Tarea A",
  fechaLimite: "2030-01-15T16:00:00.000Z",
  puntos: 10,
  categoria: null,
}
const gradebook = {
  tareas: [columnaDelGradebook],
  siguienteCursorTareas: null,
  alumnos: [
    {
      alumno: { id: ANA.id, nombre: ANA.nombre },
      celdas: [{ tareaId: columnaDelGradebook.id, ...ASIGNADA }],
      porcentaje: null,
      vencidasSinEntregar: 0,
      motivosDeRiesgo: [],
    },
  ],
  siguienteCursor: null,
  resumen: { modo: "puntos", totalAlumnos: 1, promedioDeLaClase: null, alumnosEnRiesgo: 0 },
}

interface Llamada {
  url: string
  cursor: string | null
  cursorTareas: string | null
}
let llamadas: Llamada[] = []
let manejarExportacion: (l: Llamada) => Response = () =>
  respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } })

const instalarServidor = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) => {
      const url = String(entrada)
      const p = new URL(url, "http://local").searchParams
      const llamada = { url, cursor: p.get("cursor"), cursorTareas: p.get("cursorTareas") }
      llamadas.push(llamada)
      if (url.startsWith(`${RUTA_EXPORTACION}?`))
        return Promise.resolve(manejarExportacion(llamada))
      if (url.startsWith(`${RUTA_GRADEBOOK}?`))
        return Promise.resolve(respuestaJson(200, gradebook))
      return Promise.resolve(
        respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } }),
      )
    }),
  )
}

const montar = () => {
  const router = createMemoryRouter(
    [{ path: "/maestro/clases/:claseId/calificaciones", element: <GradebookView /> }],
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
}

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 8; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}
const botonExportar = () => screen.getByRole("button", { name: "Exportar a Excel" })
const exportaciones = () => llamadas.filter((l) => l.url.startsWith(`${RUTA_EXPORTACION}?`))
const textosDeAvisos = () => [
  ...vi.mocked(toast.success).mock.calls.map(([t]) => String(t)),
  ...vi.mocked(toast.error).mock.calls.map(([t]) => String(t)),
]
const exportarYEsperar = async () => {
  await screen.findByRole("table", { name: "Calificaciones por alumno y tarea" })
  fireEvent.click(botonExportar())
  await waitFor(() => expect(botonExportar()).not.toHaveAttribute("aria-busy"), {
    timeout: 60_000,
  })
  await reposar()
}

// Un servidor de exportación con 1 alumno y `total` tareas, paginadas de 100 en 100. `totalDe`
// decide el total que dice cada respuesta según su número (desde 1) y `tareasReales` cuántas hay.
const servidorDeTareas = (
  tareasReales: number,
  totalDe: (numero: number) => number,
): ((l: Llamada) => Response) => {
  let numero = 0
  const tareaDe = (i: number): ColumnaDelGradebook => ({
    id: id(100_000 + i),
    titulo: `T${String(i)}`,
    fechaLimite: new Date(Date.UTC(2030, 0, 1) + (tareasReales - i) * 60_000).toISOString(),
    puntos: 10,
    categoria: null,
  })
  return (l) => {
    numero += 1
    const desde =
      l.cursorTareas === null ? 0 : Number.parseInt(l.cursorTareas.slice(-12), 16) - 100_000 + 1
    const tareas = Array.from({ length: Math.min(100, tareasReales - desde) }, (_, i) =>
      tareaDe(desde + i),
    )
    return respuestaJson(200, {
      clase: { nombre: "Muchas" },
      tareas,
      siguienteCursorTareas: desde + 100 < tareasReales ? (tareas.at(-1)?.id ?? null) : null,
      totalTareas: totalDe(numero),
      alumnos: [
        {
          alumno: ANA,
          celdas: tareas.map((t) => ({ tareaId: t.id, ...ASIGNADA })),
          porcentaje: 10,
        },
      ],
      siguienteCursor: null,
      totalAlumnos: 1,
    })
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  llamadas = []
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

const ahoraLocal = new Date(2030, 0, 10, 12, 0, 0)
const claseDelNombre = (archivo: string): string =>
  archivo.replace(/^Calificaciones - /, "").replace(/ ?-? ?2030-01-10\.xlsx$/, "")
const puntos = (texto: string): number => Array.from(texto).length

describe("ataque CALIFICACIONES-02b r2: T-01, el recorte por grafemas en el borde de 80", () => {
  const a = (n: number) => "a".repeat(n)
  const TONO = "\u{1F44D}\u{1F3FD}"
  const BANDERA = "\u{1F1F2}\u{1F1FD}"
  const FAMILIA = "\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}"
  const ESCOCIA = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}"
  const E_AGUDA = "e\u{0301}"
  const HAN = "\u{1112}\u{1161}\u{11AB}"

  it("CAL2-T-22: con Intl.Segmenter, cada grafema de varios puntos (tono de piel, bandera, familia con ZWJ, subdivisión con etiquetas, letra con marca combinante y hangul en jamo) se conserva entero si termina en el punto 80 y se quita entero si lo cruza", () => {
    const casos: [string, string, string][] = [
      ["tono, cabe", a(78) + TONO + "z", a(78) + TONO],
      ["tono, cruza", a(79) + TONO + "z", a(79)],
      ["bandera, cabe", a(78) + BANDERA + "z", a(78) + BANDERA],
      ["bandera, cruza", a(79) + BANDERA + "z", a(79)],
      ["familia, cabe", a(75) + FAMILIA + "z", a(75) + FAMILIA],
      ["familia, cruza", a(76) + FAMILIA + "z", a(76)],
      ["etiquetas, cabe", a(73) + ESCOCIA + "z", a(73) + ESCOCIA],
      ["etiquetas, cruza", a(74) + ESCOCIA + "z", a(74)],
      ["marca, cabe", a(78) + E_AGUDA + "z", a(78) + E_AGUDA],
      ["marca, cruza", a(79) + E_AGUDA + "z", a(79)],
      ["hangul, cabe", a(77) + HAN + "z", a(77) + HAN],
      ["hangul, cruza", a(78) + HAN + "z", a(78)],
    ]
    const obtenido = casos.map(([nombre, clase]) => [
      nombre,
      claseDelNombre(nombreDelArchivoDeExportacion(clase, ahoraLocal)),
    ])
    expect(obtenido).toEqual(casos.map(([nombre, , esperado]) => [nombre, esperado]))
    for (const [, clase] of obtenido) expect(puntos(clase ?? "")).toBeLessThanOrEqual(80)
  })

  it("CAL2-T-23: un solo grafema de más de 80 puntos da el nombre sin clase; tras el recorte, los puntos y espacios que quedan al final se quitan", () => {
    expect(nombreDelArchivoDeExportacion(`a${"\u{0301}".repeat(100)}`, ahoraLocal)).toBe(
      "Calificaciones - 2030-01-10.xlsx",
    )
    expect(nombreDelArchivoDeExportacion(`${a(77)}. ${TONO}z`, ahoraLocal)).toBe(
      `Calificaciones - ${a(77)} - 2030-01-10.xlsx`,
    )
    expect(nombreDelArchivoDeExportacion(`${a(76)} .. ${FAMILIA}`, ahoraLocal)).toBe(
      `Calificaciones - ${a(76)} - 2030-01-10.xlsx`,
    )
  })

  it("CAL2-T-24: sin Intl.Segmenter no lanza, recorta a 80 puntos de código sin partir un par sustituto y quita los puntos y espacios del final; con Segmenter restaurado vuelve a cortar por grafemas", () => {
    const original = Object.getOwnPropertyDescriptor(Intl, "Segmenter")
    expect(original, "Precondición: el entorno tiene Intl.Segmenter").toBeDefined()
    Object.defineProperty(Intl, "Segmenter", { value: undefined, configurable: true })
    try {
      expect(nombreDelArchivoDeExportacion(`${a(79)}\u{1F600}z`, ahoraLocal)).toBe(
        `Calificaciones - ${a(79)}\u{1F600} - 2030-01-10.xlsx`,
      )
      expect(nombreDelArchivoDeExportacion(`${a(79)} .b`, ahoraLocal)).toBe(
        `Calificaciones - ${a(79)} - 2030-01-10.xlsx`,
      )
      expect(nombreDelArchivoDeExportacion(`${a(78)}.${TONO}`, ahoraLocal)).toBe(
        `Calificaciones - ${a(78)}.\u{1F44D} - 2030-01-10.xlsx`,
      )
    } finally {
      if (original !== undefined) Object.defineProperty(Intl, "Segmenter", original)
    }
    expect(claseDelNombre(nombreDelArchivoDeExportacion(`${a(79)}${TONO}`, ahoraLocal))).toBe(a(79))
  })
})

describe("ataque CALIFICACIONES-02b r2: T-02, la hoja que cabe en Excel", () => {
  it("CAL2-T-25: cabeEnUnaHoja en los bordes: 16,381 tareas caben y 16,382 no con 0, 1 y 20,000 alumnos; 1,048,573 alumnos caben y 1,048,574 no con 0 tareas", () => {
    for (const alumnos of [0, 1, 20_000]) {
      expect(cabeEnUnaHoja(alumnos, 16_381), String(alumnos)).toBe(true)
      expect(cabeEnUnaHoja(alumnos, 16_382), String(alumnos)).toBe(false)
    }
    expect(cabeEnUnaHoja(1_048_573, 0)).toBe(true)
    expect(cabeEnUnaHoja(1_048_574, 0)).toBe(false)
    expect(cabeEnUnaHoja(1_048_574, 16_382)).toBe(false)
  })

  it("CAL2-T-26: por la vista, una clase de 1 alumno y 16,381 tareas sí se exporta: 164 peticiones, una descarga y «Promedio (%)» en la columna XFD", async () => {
    manejarExportacion = servidorDeTareas(16_381, () => 16_381)
    montar()
    await exportarYEsperar()
    expect(exportaciones()).toHaveLength(164)
    expect(textosDeAvisos()).toHaveLength(1)
    expect(textosDeAvisos()[0]).toMatch(/^Se descargó/)
    const llamada = vi.mocked(descargarArchivo).mock.calls[0]
    expect(llamada, "Precondición: hubo una descarga").toBeDefined()
    const celdas = celdasDeLaHoja(llamada?.[0] ?? new Uint8Array())
    expect(celdas.get("XFD1")).toMatchObject({ tipo: "texto", valor: "Promedio (%)" })
    expect(celdas.get("XFD4")).toMatchObject({ tipo: "numero", valor: "10" })
  }, 120_000)

  it("CAL2-T-27: una clase que crece a mitad del recorrido (la primera respuesta dice 16,381 tareas y las siguientes 16,382, con la tarea nueva) no descarga una hoja después de XFD: da el aviso de cambio y nunca el genérico", async () => {
    manejarExportacion = servidorDeTareas(16_382, (numero) => (numero === 1 ? 16_381 : 16_382))
    montar()
    await exportarYEsperar()
    expect(textosDeAvisos()).toEqual([CAMBIO])
    expect(descargarArchivo).not.toHaveBeenCalled()
  }, 120_000)

  it("CAL2-T-28: con las dos condiciones a la vez en la primera respuesta (101 alumnos y 16,382 tareas: 2 × 164 = 328 ventanas) hace una sola petición y da el aviso de demasiadas", async () => {
    manejarExportacion = () =>
      respuestaJson(200, {
        clase: { nombre: "Muchas" },
        tareas: [columnaDelGradebook],
        siguienteCursorTareas: columnaDelGradebook.id,
        totalTareas: 16_382,
        alumnos: [
          {
            alumno: ANA,
            celdas: [{ tareaId: columnaDelGradebook.id, ...ASIGNADA }],
            porcentaje: null,
          },
        ],
        siguienteCursor: ANA.id,
        totalAlumnos: 101,
      })
    montar()
    await exportarYEsperar()
    expect(exportaciones()).toHaveLength(1)
    expect(textosDeAvisos()).toEqual([DEMASIADO])
    expect(descargarArchivo).not.toHaveBeenCalled()
  })

  it("CAL2-T-29: el escritor: 16,384 celdas en una fila y 16,384 anchos dan XFD; 16,385 celdas en una sola fila (con anchos de sobra cortos), 16,385 anchos (con filas cortas) y 1,048,577 filas lanzan un Error", () => {
    const texto = (valor: string): CeldaXlsx => ({ tipo: "texto", valor })
    const base = { nombre: "Hoja", inmovilizar: { filas: 1, columnas: 1 } }
    const ancha = Array.from({ length: 16_384 }, (_, i) => texto(`c${String(i)}`))
    const celdas = celdasDeLaHoja(
      armarLibroXlsx({ ...base, filas: [ancha], anchos: ancha.map(() => 10) }),
    )
    expect(celdas.get("XFD1")).toMatchObject({ valor: "c16383" })
    const lanza = (accion: () => unknown): string => {
      try {
        accion()
        return "no lanzó"
      } catch (error) {
        return error instanceof Error ? "Error" : "otro"
      }
    }
    expect({
      celdas: lanza(() =>
        armarLibroXlsx({ ...base, filas: [[texto("a")], [...ancha, texto("x")]], anchos: [10] }),
      ),
      anchos: lanza(() =>
        armarLibroXlsx({
          ...base,
          filas: [[texto("a")]],
          anchos: Array.from({ length: 16_385 }, () => 10),
        }),
      ),
      filas: lanza(() =>
        armarLibroXlsx({
          ...base,
          filas: Array.from({ length: 1_048_577 }, () => []),
          anchos: [],
        }),
      ),
    }).toEqual({ celdas: "Error", anchos: "Error", filas: "Error" })
  }, 60_000)
})
