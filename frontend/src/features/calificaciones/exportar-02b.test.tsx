import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { toast, Toaster } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ENTRADAS_DE_FORMULARIO } from "@/lib/errores-de-api-fuera-de-contrato"
import { celdasDeLaHoja, leerZip } from "@/lib/lector-xlsx-de-prueba"
import { TIPO_MIME_XLSX } from "@/lib/xlsx"
import { clavePrefijoDeCalificaciones } from "@/services/calificacionesService"
import { descargarArchivo } from "@/services/descargaService"
import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { GradebookView } from "./gradebook-view"
import { nombreDelArchivoDeExportacion } from "./lib"

// CALIFICACIONES-02b (CAL2-B08 a CAL2-B12 y CAL2-B14): «Exportar a Excel» en el gradebook. El servidor
// es un doble en memoria (fetch sustituido) que pagina la exportación por ventanas; la descarga, un
// doble; los avisos, sonner real con su Toaster (con espías que cuentan cada aviso). Reloj fijo en
// todas (solo Date).

vi.mock("@/services/descargaService", () => ({ descargarArchivo: vi.fn() }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const PASADA = "2030-01-05T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const uuid = (n: number) => `9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`
const RUTA_GRADEBOOK = `/api/clases/${CLASE_ID}/gradebook`
const RUTA_EXPORTACION = `/api/clases/${CLASE_ID}/calificaciones/exportacion`
const CURSOR_DEL_GRADEBOOK = uuid(960)

const TEXTO_EXITO = (archivo: string) => `Se descargó «${archivo}».`
const GENERICO = "No pudimos preparar el archivo de calificaciones. Inténtalo de nuevo."
const CAMBIO = "Las calificaciones cambiaron mientras preparábamos el archivo. Inténtalo de nuevo."
const VACIO = "No hay calificaciones que exportar: la clase no tiene alumnos o tareas."
const DEMASIADO = "Esta clase tiene demasiadas calificaciones para exportarlas en un solo archivo."
const SIN_ACCESO = "No tienes acceso a esta clase."

type Perspectiva = "maestro" | "admin"
const baseDe = (p: Perspectiva) => (p === "maestro" ? "/maestro/clases" : "/admin/clases")

// En el orden de la API: la más reciente primero.
const TA = { id: uuid(101), titulo: "Tarea A", fechaLimite: FUTURA, puntos: 10, categoria: null }
const TB = {
  id: uuid(102),
  titulo: "Tarea B",
  fechaLimite: PASADA,
  puntos: 20,
  categoria: { id: uuid(201), nombre: "Proyectos" },
}

const ANA = { id: uuid(301), nombre: "Ana Ruiz", email: "ana.ruiz@ejemplo.mx" }
const BETO = { id: uuid(302), nombre: "Beto Díaz", email: "beto.diaz@ejemplo.mx" }

const ASIGNADA = { estado: "asignado", conRetraso: false, calificacion: null }

interface AlumnoDelModelo {
  alumno: { id: string; nombre: string; email: string }
  porcentaje: number | null
  celdas: Record<string, Record<string, unknown>>
}

interface Modelo {
  clase: string
  tareas: (typeof TA | typeof TB)[]
  alumnos: AlumnoDelModelo[]
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
      celdas: {
        [TA.id]: { estado: "calificado", conRetraso: true, calificacion: 8.5 },
        [TB.id]: { estado: "entregado", conRetraso: false, calificacion: null },
      },
    },
    { alumno: BETO, porcentaje: null, celdas: {} },
  ],
  porTareas: 100,
  porAlumnos: 100,
})

// El servidor de la exportación: las ventanas de §D-1 sobre el modelo.
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

// El gradebook: la primera ventana con «Alumnos siguientes»; la segunda, Carla.
const filaDelGradebook = (alumno: { id: string; nombre: string }) => ({
  alumno,
  celdas: [TA, TB].map((t) => ({ tareaId: t.id, ...ASIGNADA })),
  porcentaje: null,
  vencidasSinEntregar: 0,
  motivosDeRiesgo: [],
})
const gradebook = (cursor: string | null, cambios: Record<string, unknown> = {}) => ({
  tareas: [TA, TB],
  siguienteCursorTareas: null,
  alumnos:
    cursor === null
      ? [filaDelGradebook({ id: ANA.id, nombre: ANA.nombre })]
      : [filaDelGradebook({ id: uuid(303), nombre: "Carla Gómez" })],
  siguienteCursor: cursor === null ? CURSOR_DEL_GRADEBOOK : null,
  resumen: { modo: "puntos", totalAlumnos: 2, promedioDeLaClase: null, alumnosEnRiesgo: 0 },
  ...cambios,
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

const montar = (perspectiva: Perspectiva = "maestro") => {
  const base = baseDe(perspectiva)
  const ruta = `${base}/${CLASE_ID}/calificaciones`
  const router = createMemoryRouter(
    [
      { path: `${base}/:claseId/calificaciones`, element: <GradebookView /> },
      { path: `${base}/:claseId/personas`, element: <p>Personas de prueba</p> },
    ],
    { initialEntries: [ruta] },
  )
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const resultado = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  )
  return { router, cliente, ruta, base, ...resultado }
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
const delGradebook = () => llamadas.filter((l) => l.url.startsWith(`${RUTA_GRADEBOOK}?`))
const avisos = () =>
  vi.mocked(toast.success).mock.calls.length + vi.mocked(toast.error).mock.calls.length
const raiz = () => {
  const r = document.querySelector('[data-material="opaco"]')
  if (!(r instanceof HTMLElement)) throw new Error("Precondición: la vista tiene su raíz")
  return r
}

// Enfoca el botón, lo pulsa y espera a que salga de la espera.
const exportar = async () => {
  const boton = botonExportar()
  act(() => boton.focus())
  fireEvent.click(boton)
  await waitFor(() => expect(botonExportar()).not.toHaveAttribute("aria-busy"))
  await reposar()
}

const esperarUnAviso = async (texto: string) => {
  expect(await screen.findByText(texto)).toBeInTheDocument()
  expect(avisos()).toBe(1)
  expect(document.activeElement).toBe(botonExportar())
  expect(botonExportar()).not.toHaveAttribute("disabled")
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
  vi.spyOn(toast, "dismiss")
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

describe("el botón (CAL2-B08)", () => {
  it.each(["maestro", "admin"] as const)(
    "CAL2-B08: %s ve «Exportar a Excel» (outline, sm) con la tabla, dentro de la raíz opaca, entre el resumen y los botones de las ventanas, sin disabled",
    async (perspectiva) => {
      montar(perspectiva)
      await esperarTabla()
      const boton = botonExportar()
      expect(boton).toHaveAttribute("data-variant", "outline")
      expect(boton).toHaveAttribute("data-size", "sm")
      expect(boton).not.toHaveAttribute("disabled")
      expect(boton).not.toHaveAttribute("aria-busy")
      expect(boton.closest('[data-material="opaco"]')).toBe(raiz())
      const resumen = screen.getByText("2 alumnos")
      const siguientes = screen.getByRole("button", { name: "Alumnos siguientes" })
      expect(resumen.compareDocumentPosition(boton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(
        boton.compareDocumentPosition(siguientes) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    },
  )

  it("CAL2-B08: con el texto del cursor a la vista también está; no está en la carga, en los dos vacíos ni con un error que reemplaza la vista", async () => {
    const espera = diferido()
    manejarGradebook = () => espera.promesa
    montar()
    expect(await screen.findByText("Cargando las calificaciones…")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Exportar a Excel" })).toBeNull()
    espera.resolver(respuestaJson(200, gradebook(null)))
    await esperarTabla()
    manejarGradebook = (l) =>
      l.cursor === null ? undefined : respuestaJson(200, gradebook(l.cursor, { alumnos: [] }))
    fireEvent.click(screen.getByRole("button", { name: "Alumnos siguientes" }))
    expect(
      await screen.findByText(
        "La clase cambió mientras veías las calificaciones. Vuelve a abrir Calificaciones para verlas completas.",
      ),
    ).toBeInTheDocument()
    expect(botonExportar()).toBeInTheDocument()
    cleanup()

    for (const [vacio, cambios] of [
      ["Aún no hay alumnos en esta clase.", { alumnos: [], siguienteCursor: null }],
      ["Aún no hay tareas en esta clase.", { tareas: [] }],
    ] as const) {
      manejarGradebook = () => respuestaJson(200, gradebook(null, cambios))
      montar()
      expect(await screen.findByText(vacio)).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Exportar a Excel" })).toBeNull()
      cleanup()
    }

    manejarGradebook = () => errorApi(500, "ERROR_INTERNO", "falla")
    montar()
    expect(
      await screen.findByText("No pudimos cargar las calificaciones. Inténtalo de nuevo."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Exportar a Excel" })).toBeNull()
  })

  it("CAL2-B08: lleva aria-busy mientras exporta y mientras se pide una ventana del gradebook; dos clics seguidos hacen un solo recorrido y un clic con la ventana pidiéndose no exporta", async () => {
    montar()
    await esperarTabla()
    const espera = diferido()
    manejarExportacion = () => espera.promesa
    fireEvent.click(botonExportar())
    fireEvent.click(botonExportar())
    await waitFor(() => expect(botonExportar()).toHaveAttribute("aria-busy", "true"))
    expect(botonExportar()).not.toHaveAttribute("disabled")
    await reposar()
    expect(exportaciones()).toHaveLength(1)
    espera.resolver(respuestaJson(200, responder(modelo, null, null)))
    await waitFor(() => expect(botonExportar()).not.toHaveAttribute("aria-busy"))
    expect(descargarArchivo).toHaveBeenCalledTimes(1)

    const ventana = diferido()
    manejarGradebook = (l) => (l.cursor === null ? undefined : ventana.promesa)
    fireEvent.click(screen.getByRole("button", { name: "Alumnos siguientes" }))
    await waitFor(() => expect(botonExportar()).toHaveAttribute("aria-busy", "true"))
    fireEvent.click(botonExportar())
    await reposar()
    expect(exportaciones()).toHaveLength(1)
    ventana.resolver(respuestaJson(200, gradebook(CURSOR_DEL_GRADEBOOK)))
    await waitFor(() => expect(botonExportar()).not.toHaveAttribute("aria-busy"))
    expect(botonExportar()).not.toHaveAttribute("disabled")
  })
})

describe("el recorrido y el archivo (CAL2-B09)", () => {
  it("CAL2-B09: con 2 × 2 ventanas pide en el orden de §D-4, descarga una vez con el nombre y el tipo, y el archivo trae encabezados, celdas, promedios y direcciones, sin estado de pago ni restricción; un solo aviso y el foco en el botón", async () => {
    modelo = { ...modeloBase(), porTareas: 1, porAlumnos: 1 }
    const { cliente } = montar()
    await esperarTabla()
    await exportar()

    expect(exportaciones()[0]?.url).toBe(`${RUTA_EXPORTACION}?limite=100&limiteTareas=100`)
    expect(exportaciones().map((l) => [l.cursor, l.cursorTareas])).toEqual([
      [null, null],
      [ANA.id, null],
      [null, TA.id],
      [ANA.id, TA.id],
    ])
    expect(descargarArchivo).toHaveBeenCalledTimes(1)
    const [bytes, nombre, tipo] = vi.mocked(descargarArchivo).mock.calls[0] ?? []
    const esperado = nombreDelArchivoDeExportacion("Historia", AHORA)
    expect(nombre).toBe(esperado)
    expect(tipo).toBe(TIPO_MIME_XLSX)
    expect(bytes).toBeInstanceOf(Uint8Array)

    const celdas = celdasDeLaHoja(bytes as Uint8Array)
    const valor = (ref: string) => celdas.get(ref)?.valor
    expect(["A1", "B1", "C1", "D1", "E1"].map(valor)).toEqual([
      "Alumno",
      "Correo",
      "Tarea B",
      "Tarea A",
      "Promedio (%)",
    ])
    expect(["A2", "C2", "D2"].map(valor)).toEqual(["Categoría", "Proyectos", "Sin categoría"])
    expect(["A3", "C3", "D3"].map(valor)).toEqual(["Puntos", "20", "10"])
    expect(["A4", "B4", "C4", "D4", "E4"].map(valor)).toEqual([
      "Ana Ruiz",
      "ana.ruiz@ejemplo.mx",
      "Entregado",
      "8.5",
      "85",
    ])
    expect(celdas.get("D4")?.tipo).toBe("numero")
    expect(["A5", "B5", "C5", "D5", "E5"].map(valor)).toEqual([
      "Beto Díaz",
      "beto.diaz@ejemplo.mx",
      "Sin entregar",
      "Asignado",
      "—",
    ])
    const texto = leerZip(bytes as Uint8Array)
      .map((e) => e.contenido)
      .join("\n")
    for (const prohibido of ["Deudor", "deudor", "Al corriente", "estring"]) {
      expect(texto).not.toContain(prohibido)
    }

    await esperarUnAviso(TEXTO_EXITO(esperado))
    const enCache = JSON.stringify(
      cliente
        .getMutationCache()
        .getAll()
        .map((m) => m.state.data),
    )
    expect(enCache).toContain(esperado)
    expect(enCache).not.toContain("@ejemplo.mx")
    expect(enCache).not.toContain("Ana Ruiz")
  })
})

describe("errores según la matriz de §D-7 (CAL2-B10)", () => {
  const segundaVentana = () => ({ ...modeloBase(), porTareas: 1, porAlumnos: 1 })
  const casos: [string, () => void, string][] = [
    [
      "403 SIN_ACCESO_A_LA_CLASE",
      () => {
        manejarExportacion = () => errorApi(403, "SIN_ACCESO_A_LA_CLASE", "Sin acceso (servidor)")
      },
      SIN_ACCESO,
    ],
    [
      "400 de cursor en la segunda ventana",
      () => {
        modelo = segundaVentana()
        manejarExportacion = (l) =>
          l.cursor === null ? undefined : errorApi(400, "VALIDACION", "cursor: no es válido")
      },
      CAMBIO,
    ],
    [
      "400 de cursorTareas en la segunda ventana",
      () => {
        modelo = segundaVentana()
        manejarExportacion = (l) =>
          l.cursorTareas === null
            ? undefined
            : errorApi(400, "VALIDACION", "cursorTareas: no es válido")
      },
      CAMBIO,
    ],
    [
      "una combinación con cambio",
      () => {
        modelo = segundaVentana()
        manejarExportacion = (l) =>
          l.cursor === null
            ? undefined
            : respuestaJson(200, {
                ...responder(modelo, l.cursor, l.cursorTareas),
                totalAlumnos: 3,
              })
      },
      CAMBIO,
    ],
    [
      "un cursor que se repite",
      () => {
        modelo = segundaVentana()
        manejarExportacion = (l) =>
          l.cursor === null
            ? undefined
            : respuestaJson(200, {
                ...responder(modelo, l.cursor, l.cursorTareas),
                siguienteCursor: ANA.id,
              })
      },
      CAMBIO,
    ],
    [
      "vacio",
      () => {
        modelo = { ...modeloBase(), alumnos: [] }
      },
      VACIO,
    ],
    [
      "500",
      () => {
        manejarExportacion = () => errorApi(500, "ERROR_INTERNO", "Algo falló (servidor)")
      },
      GENERICO,
    ],
    [
      "503",
      () => {
        manejarExportacion = () => errorApi(503, "SERVICIO_OCUPADO", "Ocupado (servidor)")
      },
      GENERICO,
    ],
    [
      "sin conexión",
      () => {
        manejarExportacion = () => {
          throw new TypeError("Failed to fetch")
        }
      },
      GENERICO,
    ],
    [
      "RESPUESTA_INVALIDA",
      () => {
        manejarExportacion = () => respuestaJson(200, { otra: "forma" })
      },
      GENERICO,
    ],
  ]

  it.each(casos)(
    "CAL2-B10: %s da su aviso, uno solo, sin descarga, con el botón fuera de la espera y el foco en él",
    async (_nombre, preparar, texto) => {
      montar()
      await esperarTabla()
      preparar()
      await exportar()
      await esperarUnAviso(texto)
      expect(descargarArchivo).not.toHaveBeenCalled()
      expect(document.body.textContent).not.toContain("(servidor)")
    },
  )

  it("CAL2-B10: un 500 no se reintenta: una sola petición de esa ventana", async () => {
    montar()
    await esperarTabla()
    manejarExportacion = () => errorApi(500, "ERROR_INTERNO", "falla")
    await exportar()
    await esperarUnAviso(GENERICO)
    expect(exportaciones()).toHaveLength(1)
  })

  it.each([
    ["401 con refresco fallido", () => errorApi(401, "NO_AUTENTICADO", "x")],
    ["403 ACCESO_RESTRINGIDO", () => errorApi(403, "ACCESO_RESTRINGIDO", "x")],
    [
      "403 CAMBIO_DE_CONTRASENA_REQUERIDO",
      () => errorApi(403, "CAMBIO_DE_CONTRASENA_REQUERIDO", "x"),
    ],
  ])("CAL2-B10: %s no da aviso ni descarga (apiClient redirige)", async (_nombre, respuesta) => {
    montar()
    await esperarTabla()
    manejarExportacion = () => respuesta()
    await exportar()
    expect(irA).toHaveBeenCalled()
    expect(avisos()).toBe(0)
    expect(descargarArchivo).not.toHaveBeenCalled()
  })

  it("CAL2-B10: con 201 ventanas necesarias según la primera respuesta, una sola petición y el aviso de demasiadas, sin promesa de reintento", async () => {
    montar()
    await esperarTabla()
    manejarExportacion = (l) =>
      respuestaJson(200, {
        ...responder(modelo, l.cursor, l.cursorTareas),
        siguienteCursor: uuid(800),
        totalAlumnos: 20100,
        totalTareas: 100,
      })
    await exportar()
    await esperarUnAviso(DEMASIADO)
    expect(exportaciones()).toHaveLength(1)
    expect(DEMASIADO).not.toContain("Inténtalo de nuevo")
    expect(descargarArchivo).not.toHaveBeenCalled()
  })

  it("CAL2-B10: (T-02) con 1 alumno y 16,382 tareas en la primera respuesta, la hoja no cabe: una sola petición, el aviso de demasiadas, ninguna descarga y el botón fuera de la espera", async () => {
    montar()
    await esperarTabla()
    manejarExportacion = (l) =>
      respuestaJson(200, {
        ...responder(modelo, l.cursor, l.cursorTareas),
        siguienteCursorTareas: TA.id,
        totalAlumnos: 1,
        totalTareas: 16_382,
      })
    await exportar()
    await esperarUnAviso(DEMASIADO)
    expect(exportaciones()).toHaveLength(1)
    expect(descargarArchivo).not.toHaveBeenCalled()
    expect(botonExportar()).not.toHaveAttribute("aria-busy")
  })

  it("CAL2-B10: con totales de una ventana pero cursores nuevos en cada respuesta, el recorrido para en la petición 200 con el aviso de demasiadas", async () => {
    montar()
    await esperarTabla()
    let n = 0
    manejarExportacion = (l) => {
      n += 1
      return respuestaJson(200, {
        ...responder(modelo, null, l.cursorTareas),
        siguienteCursor: uuid(1000 + n),
      })
    }
    await exportar()
    await esperarUnAviso(DEMASIADO)
    expect(exportaciones()).toHaveLength(200)
    expect(descargarArchivo).not.toHaveBeenCalled()
  })
})

describe("VALIDACION fuera de contrato (CAL2-B11)", () => {
  it.each(Object.entries(ENTRADAS_DE_FORMULARIO))(
    "CAL2-B11: %s da un solo aviso, el genérico, nunca el texto del servidor, y el botón sale de la espera",
    async (_clase, entrada) => {
      montar()
      await esperarTabla()
      manejarExportacion = () => errorApi(400, "VALIDACION", entrada.mensaje)
      await exportar()
      await esperarUnAviso(GENERICO)
      if (entrada.mensaje.trim() !== "") {
        expect(document.body.textContent).not.toContain(entrada.mensaje.trim())
      }
      expect(document.body.textContent).not.toContain("Revisa este valor.")
    },
  )

  it("CAL2-B11: un rechazo seguido de otro intento: el aviso del rechazo se va al empezar y solo se lee el del intento nuevo", async () => {
    montar()
    await esperarTabla()
    manejarExportacion = () =>
      errorApi(400, "VALIDACION", ENTRADAS_DE_FORMULARIO["campo-no-pintable"].mensaje)
    await exportar()
    await esperarUnAviso(GENERICO)
    manejarExportacion = () => undefined
    vi.mocked(toast.dismiss).mockClear()
    await exportar()
    expect(toast.dismiss).toHaveBeenCalledWith("exportar-calificaciones")
    const exito = TEXTO_EXITO(nombreDelArchivoDeExportacion("Historia", AHORA))
    expect(await screen.findByText(exito)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText(GENERICO)).toBeNull())
    expect(avisos()).toBe(2)
  })
})

describe("con la vista desmontada (CAL2-B12)", () => {
  it("CAL2-B12: ir a otra sección con la exportación en vuelo aborta la petición; no hay aviso ni descarga aunque la respuesta llegue después, y al volver exportar funciona", async () => {
    const { router, ruta, base } = montar()
    await esperarTabla()
    const espera = diferido()
    manejarExportacion = () => espera.promesa
    fireEvent.click(botonExportar())
    await waitFor(() => expect(exportaciones()).toHaveLength(1))
    await act(async () => {
      await router.navigate(`${base}/${CLASE_ID}/personas`)
    })
    expect(await screen.findByText("Personas de prueba")).toBeInTheDocument()
    expect(exportaciones()[0]?.signal?.aborted).toBe(true)
    espera.resolver(respuestaJson(200, responder(modelo, null, null)))
    await reposar()
    expect(avisos()).toBe(0)
    expect(descargarArchivo).not.toHaveBeenCalled()

    manejarExportacion = () => undefined
    await act(async () => {
      await router.navigate(ruta)
    })
    await esperarTabla()
    await exportar()
    expect(descargarArchivo).toHaveBeenCalledTimes(1)
    expect(avisos()).toBe(1)
  })

  it("CAL2-B12: desmontar entre la última respuesta y la descarga no descarga ni avisa", async () => {
    const { router, base } = montar()
    await esperarTabla()
    let liberar: () => void = () => undefined
    const cuerpo = new Promise<void>((r) => {
      liberar = r
    })
    manejarExportacion = (l) => {
      const real = respuestaJson(200, responder(modelo, l.cursor, l.cursorTareas))
      const lenta = new Response(null, { status: 200 })
      Object.defineProperty(lenta, "json", {
        value: async () => {
          await cuerpo
          return real.json()
        },
      })
      return lenta
    }
    fireEvent.click(botonExportar())
    await waitFor(() => expect(exportaciones()).toHaveLength(1))
    await act(async () => {
      await router.navigate(`${base}/${CLASE_ID}/personas`)
    })
    liberar()
    await reposar()
    expect(descargarArchivo).not.toHaveBeenCalled()
    expect(avisos()).toBe(0)
  })

  it.each([
    ["403 SIN_ACCESO_A_LA_CLASE", () => errorApi(403, "SIN_ACCESO_A_LA_CLASE", "x"), SIN_ACCESO],
    [
      "la primera ventana sin alumnos",
      () => respuestaJson(200, gradebook(null, { alumnos: [], siguienteCursor: null })),
      "Aún no hay alumnos en esta clase.",
    ],
  ])(
    "CAL2-B12: con la exportación en vuelo, una recarga del gradebook que trae %s quita el botón: la exportación se aborta sin aviso ni descarga y el foco queda en la raíz",
    async (_nombre, recarga, texto) => {
      const { router, ruta } = montar()
      await esperarTabla()
      const espera = diferido()
      manejarExportacion = () => espera.promesa
      const boton = botonExportar()
      act(() => boton.focus())
      fireEvent.click(boton)
      await waitFor(() => expect(exportaciones()).toHaveLength(1))
      // La recarga llega un segundo después, como en el navegador: la clave de foco de la vista lee
      // dataUpdatedAt, que con el reloj quieto no cambiaría.
      vi.setSystemTime(new Date(AHORA.getTime() + 1000))
      manejarGradebook = () => recarga()
      await act(async () => {
        await router.navigate(ruta)
      })
      expect(await screen.findByText(texto)).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Exportar a Excel" })).toBeNull()
      expect(exportaciones()[0]?.signal?.aborted).toBe(true)
      await waitFor(() => expect(document.activeElement).toBe(raiz()))
      espera.resolver(respuestaJson(200, responder(modelo, null, null)))
      await reposar()
      expect(avisos()).toBe(0)
      expect(descargarArchivo).not.toHaveBeenCalled()
      expect(document.activeElement).not.toBe(document.body)
    },
  )
})

describe("independencia del gradebook (CAL2-B14)", () => {
  it("CAL2-B14: exportar no pide ni invalida el gradebook, y una ventana del gradebook pedida mientras se exporta no cancela la exportación", async () => {
    const { cliente } = montar()
    await esperarTabla()
    const sello = () =>
      cliente
        .getQueryCache()
        .findAll({ queryKey: clavePrefijoDeCalificaciones(CLASE_ID) })
        .map((q) => [q.queryHash, q.state.dataUpdatedAt, q.state.isInvalidated])
    const antes = sello()
    expect(antes.length).toBeGreaterThan(0)
    const pedidasAntes = delGradebook().length
    await exportar()
    expect(sello()).toEqual(antes)
    expect(delGradebook()).toHaveLength(pedidasAntes)
    expect(descargarArchivo).toHaveBeenCalledTimes(1)

    const espera = diferido()
    manejarExportacion = () => espera.promesa
    fireEvent.click(botonExportar())
    await waitFor(() => expect(exportaciones()).toHaveLength(2))
    fireEvent.click(screen.getByRole("button", { name: "Alumnos siguientes" }))
    expect(await screen.findByRole("row", { name: /^Carla Gómez/ })).toBeInTheDocument()
    expect(exportaciones()[1]?.signal?.aborted).toBe(false)
    espera.resolver(respuestaJson(200, responder(modelo, null, null)))
    await waitFor(() => expect(descargarArchivo).toHaveBeenCalledTimes(2))
  })
})
