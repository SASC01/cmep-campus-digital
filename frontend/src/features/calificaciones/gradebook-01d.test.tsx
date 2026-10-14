import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { Link, MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { claveGradebook, clavePrefijoDeCalificaciones } from "@/services/calificacionesService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { GradebookView } from "./gradebook-view"

// CALIFICACIONES-01d (CAL-1D01 a CAL-1D03 y, de la Enmienda 2, CAL-1D11 a CAL-1D13): el gradebook del
// maestro y del admin. El servidor es un doble en memoria (fetch); los avisos, un doble de sonner (el
// gradebook no avisa nunca). Reloj fijo en todas (vi.useFakeTimers solo para Date).

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const PASADA = "2030-01-05T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const uuid = (n: number) => `9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`
const RUTA_API = `/api/clases/${CLASE_ID}/gradebook`
const CURSOR_TAREAS = uuid(950)
const CURSOR_ALUMNOS = uuid(960)
const GENERICO = "No pudimos cargar las calificaciones. Inténtalo de nuevo."
const CURSOR_TEXTO =
  "La clase cambió mientras veías las calificaciones. Vuelve a abrir Calificaciones para verlas completas."
const SIN_ACCESO = "No tienes acceso a esta clase."

type Perspectiva = "maestro" | "admin"
const baseDe = (p: Perspectiva) => (p === "maestro" ? "/maestro/clases" : "/admin/clases")

const columna = (n: number, extra: Record<string, unknown> = {}) => ({
  id: uuid(100 + n),
  titulo: `Tarea ${String(n)}`,
  fechaLimite: FUTURA,
  puntos: 10,
  categoria: null,
  ...extra,
})

const COLUMNAS_A = [
  columna(1, { categoria: { id: uuid(201), nombre: "Proyectos" } }),
  columna(2, { fechaLimite: PASADA }),
  columna(3),
]
const COLUMNAS_B = [columna(4, { fechaLimite: PASADA })]

const ALUMNOS_A = [
  { id: uuid(301), nombre: "Ana Ruiz" },
  { id: uuid(302), nombre: "Beto Díaz" },
]
const ALUMNOS_B = [{ id: uuid(303), nombre: "Carla Gómez" }]

// Las celdas especiales; las demás, asignadas sin retraso ni calificación.
const CELDAS: Record<string, Record<string, unknown>> = {
  [`${uuid(301)}:${uuid(101)}`]: { estado: "calificado", conRetraso: true, calificacion: 8.5 },
  [`${uuid(301)}:${uuid(102)}`]: { estado: "entregado", conRetraso: true, calificacion: null },
  [`${uuid(302)}:${uuid(101)}`]: { estado: "entregado", conRetraso: false, calificacion: null },
}

const fila = (alumno: { id: string; nombre: string }, columnas: { id: string }[]) => ({
  alumno,
  celdas: columnas.map((c) => ({
    tareaId: c.id,
    estado: "asignado",
    conRetraso: false,
    calificacion: null,
    ...CELDAS[`${alumno.id}:${c.id}`],
  })),
  porcentaje: alumno.id === uuid(301) ? 85 : null,
  vencidasSinEntregar: alumno.id === uuid(302) ? 3 : 0,
  motivosDeRiesgo: alumno.id === uuid(302) ? ["vencidas"] : [],
})

const respuestaGradebook = (cursor: string | null, cursorTareas: string | null) => {
  const columnas = cursorTareas === null ? COLUMNAS_A : COLUMNAS_B
  const alumnos = cursor === null ? ALUMNOS_A : ALUMNOS_B
  return {
    tareas: columnas,
    siguienteCursorTareas: cursorTareas === null ? CURSOR_TAREAS : null,
    alumnos: alumnos.map((a) => fila(a, columnas)),
    siguienteCursor: cursor === null ? CURSOR_ALUMNOS : null,
    resumen: { modo: "puntos", totalAlumnos: 3, promedioDeLaClase: 82.4, alumnosEnRiesgo: 1 },
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
  limite: string | null
  limiteTareas: string | null
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
      const llamada = {
        url,
        cursor: p.get("cursor"),
        cursorTareas: p.get("cursorTareas"),
        limite: p.get("limite"),
        limiteTareas: p.get("limiteTareas"),
      }
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

const nuevoCliente = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

const montar = (perspectiva: Perspectiva = "maestro", cliente: QueryClient = nuevoCliente()) => {
  const base = baseDe(perspectiva)
  const resultado = render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[`${base}/${CLASE_ID}/calificaciones`]}>
        <Routes>
          <Route path={`${base}/:claseId`}>
            <Route path="calificaciones" element={<GradebookView />} />
            <Route path="tareas/:tareaId/entregas/:alumnoId" element={<p>Entrega de prueba</p>} />
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
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

// La raíz de la vista: el contenedor con tabIndex -1 que existe desde que monta (también mientras
// carga), el primer hijo del contenedor de render.
const raizDe = (container: HTMLElement) => {
  const raiz = container.firstElementChild
  if (!(raiz instanceof HTMLElement) || raiz.getAttribute("tabindex") !== "-1") {
    throw new Error("Precondición: la vista tiene su raíz enfocable")
  }
  return raiz
}

const esperarTabla = () => screen.findByRole("table", { name: "Calificaciones por alumno y tarea" })
const encabezado = () => screen.getByRole("heading", { name: "Calificaciones", level: 2 })
const boton = (nombre: string) => screen.getByRole("button", { name: nombre })

const sinRastroDelServidor = (mensaje: string) => {
  const texto = document.body.textContent
  if (mensaje.trim() !== "") expect(texto).not.toContain(mensaje.trim())
  const prefijo = /^([^:]+):/.exec(mensaje)?.[1]
  if (prefijo !== undefined) expect(texto).not.toContain(`${prefijo}:`)
  expect(texto).not.toContain("Too ")
  expect(texto).not.toContain("Invalid")
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
  aviso.success.mockClear()
  aviso.error.mockClear()
  asignar.mockReset()
})

describe("gradebook: tabla, resumen y enlaces (CAL-1D01)", () => {
  it.each(["maestro", "admin"] as const)(
    "CAL-1D01: %s ve los encabezados, las celdas con texto, el promedio, el riesgo y el resumen",
    async (perspectiva) => {
      montar(perspectiva)
      const tabla = await esperarTabla()
      const t1 = within(tabla).getByRole("columnheader", { name: /^Tarea 1/ })
      expect(within(t1).getByText("de 10 puntos")).toBeInTheDocument()
      expect(within(t1).getByText("Proyectos")).toBeInTheDocument()
      const t2 = within(tabla).getByRole("columnheader", { name: /^Tarea 2/ })
      expect(within(t2).getByText("Sin categoría")).toBeInTheDocument()

      const ana = within(tabla).getByRole("row", { name: /^Ana Ruiz/ })
      expect(within(ana).getByRole("link", { name: "8.5 Ana Ruiz, Tarea 1" })).toBeInTheDocument()
      expect(within(ana).getByText("con retraso")).toBeInTheDocument()
      expect(
        within(ana).getByRole("link", { name: "Entregado con retraso Ana Ruiz, Tarea 2" }),
      ).toBeInTheDocument()
      const asignada = within(ana).getByRole("link", { name: "Asignado Ana Ruiz, Tarea 3" })
      expect(asignada).toHaveTextContent("—")
      expect(within(ana).getByText("85 %")).toBeInTheDocument()

      const beto = within(tabla).getByRole("row", { name: /^Beto Díaz/ })
      expect(
        within(beto).getByRole("link", { name: "Entregado Beto Díaz, Tarea 1" }),
      ).toBeInTheDocument()
      expect(
        within(beto).getByRole("link", { name: "Sin entregar Beto Díaz, Tarea 2" }),
      ).toBeInTheDocument()
      expect(within(beto).getByText("En riesgo")).toBeInTheDocument()
      expect(within(beto).getByText("3 o más tareas vencidas sin entregar")).toBeInTheDocument()

      expect(screen.getByText("3 alumnos")).toBeInTheDocument()
      expect(screen.getByText("Promedio de la clase: 82.4 %")).toBeInTheDocument()
      expect(screen.getByText("1 en riesgo")).toBeInTheDocument()
      expect(within(tabla).getByRole("columnheader", { name: "Promedio" })).toBeInTheDocument()
      expect(within(tabla).getByRole("columnheader", { name: "Riesgo" })).toBeInTheDocument()
    },
  )

  it.each(["maestro", "admin"] as const)(
    "CAL-1D01: %s: cada celda enlaza a …/tareas/:tareaId/entregas/:alumnoId de su rama y abrirla lleva a la entrega",
    async (perspectiva) => {
      montar(perspectiva)
      const tabla = await esperarTabla()
      const enlace = within(tabla).getByRole("link", { name: "8.5 Ana Ruiz, Tarea 1" })
      expect(enlace).toHaveAttribute(
        "href",
        `${baseDe(perspectiva)}/${CLASE_ID}/tareas/${uuid(101)}/entregas/${uuid(301)}`,
      )
      fireEvent.click(enlace)
      expect(await screen.findByText("Entrega de prueba")).toBeInTheDocument()
    },
  )

  it("CAL-1D01: la raíz lleva data-material=opaco y todos los botones, enlaces y la tabla cuelgan de ella (maestro)", async () => {
    const { container } = montar("maestro")
    const tabla = await esperarTabla()
    const raiz = raizDe(container)
    expect(raiz).toHaveAttribute("data-material", "opaco")
    expect(raiz).not.toHaveAttribute("data-densidad")
    const controles = [...screen.getAllByRole("button"), ...screen.getAllByRole("link"), tabla]
    expect(controles.length).toBeGreaterThan(5)
    for (const control of controles) {
      expect(control.closest('[data-material="opaco"]')).toBe(raiz)
    }
  })

  it("CAL-1D01: en el admin los controles también cuelgan de un contexto opaco (sin contar contextos)", async () => {
    montar("admin")
    await esperarTabla()
    for (const control of [...screen.getAllByRole("button"), ...screen.getAllByRole("link")]) {
      expect(control.closest('[data-material="opaco"]')).not.toBeNull()
    }
  })

  it("CAL-1D01: el vacío sin alumnos y el vacío sin tareas", async () => {
    cuerpoDelServidor = () => ({
      ...respuestaGradebook(null, null),
      alumnos: [],
      siguienteCursor: null,
    })
    const primera = montar()
    expect(await screen.findByText("Aún no hay alumnos en esta clase.")).toBeInTheDocument()
    primera.unmount()
    cuerpoDelServidor = () => ({
      ...respuestaGradebook(null, null),
      tareas: [],
      siguienteCursorTareas: null,
      alumnos: ALUMNOS_A.map((a) => fila(a, [])),
    })
    montar()
    expect(await screen.findByText("Aún no hay tareas en esta clase.")).toBeInTheDocument()
  })
})

describe("gradebook: ventanas (CAL-1D02)", () => {
  it("CAL-1D02: al inicio solo aparecen «Tareas más antiguas» y «Alumnos siguientes»; la primera petición lleva los dos tamaños y ningún cursor", async () => {
    montar()
    await esperarTabla()
    expect(boton("Tareas más antiguas")).toBeInTheDocument()
    expect(boton("Alumnos siguientes")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Tareas más recientes" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Alumnos anteriores" })).toBeNull()
    expect(llamadas[0]).toMatchObject({
      cursor: null,
      cursorTareas: null,
      limite: "25",
      limiteTareas: "20",
    })
  })

  it("CAL-1D02: «Tareas más antiguas» pide cursorTareas, la tabla anterior se ve mientras llega y, si el botón desaparece, el foco va al h2", async () => {
    montar()
    await esperarTabla()
    const espera = diferido()
    manejador = (l) => (l.cursorTareas === CURSOR_TAREAS ? espera.promesa : undefined)
    const antiguas = boton("Tareas más antiguas")
    act(() => antiguas.focus())
    fireEvent.click(antiguas)
    await waitFor(() => expect(llamadas.at(-1)?.cursorTareas).toBe(CURSOR_TAREAS))
    expect(llamadas.at(-1)?.cursor).toBeNull()
    expect(screen.getByRole("columnheader", { name: /^Tarea 1/ })).toBeInTheDocument()
    for (const b of screen.getAllByRole("button")) expect(b).toHaveAttribute("aria-busy", "true")
    espera.resolver(respuestaJson(200, respuestaGradebook(null, CURSOR_TAREAS)))
    expect(await screen.findByRole("columnheader", { name: /^Tarea 4/ })).toBeInTheDocument()
    expect(screen.queryByRole("columnheader", { name: /^Tarea 1/ })).toBeNull()
    expect(screen.queryByRole("button", { name: "Tareas más antiguas" })).toBeNull()
    expect(boton("Tareas más recientes")).toBeInTheDocument()
    await waitFor(() => expect(document.activeElement).toBe(encabezado()))
  })

  it("CAL-1D02: «Tareas más recientes» regresa con la pila (sin cursorTareas) y conserva el cursor de alumnos", async () => {
    montar()
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    expect(await screen.findByRole("row", { name: /^Carla Gómez/ })).toBeInTheDocument()
    fireEvent.click(boton("Tareas más antiguas"))
    expect(await screen.findByRole("columnheader", { name: /^Tarea 4/ })).toBeInTheDocument()
    expect(llamadas.at(-1)).toMatchObject({ cursor: CURSOR_ALUMNOS, cursorTareas: CURSOR_TAREAS })
    fireEvent.click(boton("Tareas más recientes"))
    expect(await screen.findByRole("columnheader", { name: /^Tarea 1/ })).toBeInTheDocument()
    await waitFor(() =>
      expect(llamadas.at(-1)).toMatchObject({ cursor: CURSOR_ALUMNOS, cursorTareas: null }),
    )
    expect(screen.getByRole("row", { name: /^Carla Gómez/ })).toBeInTheDocument()
    fireEvent.click(boton("Alumnos anteriores"))
    expect(await screen.findByRole("row", { name: /^Ana Ruiz/ })).toBeInTheDocument()
    await waitFor(() => expect(llamadas.at(-1)).toMatchObject({ cursor: null, cursorTareas: null }))
    expect(screen.queryByRole("button", { name: "Alumnos anteriores" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Tareas más recientes" })).toBeNull()
  })

  it("CAL-1D02: dos clics seguidos (o dos botones) durante la carga piden una sola ventana", async () => {
    montar()
    await esperarTabla()
    const espera = diferido()
    manejador = (l) => (l.cursor === CURSOR_ALUMNOS ? espera.promesa : undefined)
    const antes = llamadas.length
    fireEvent.click(boton("Alumnos siguientes"))
    fireEvent.click(boton("Alumnos siguientes"))
    fireEvent.click(boton("Tareas más antiguas"))
    await reposar()
    expect(llamadas.length - antes).toBe(1)
    espera.resolver(respuestaJson(200, respuestaGradebook(CURSOR_ALUMNOS, null)))
    expect(await screen.findByRole("row", { name: /^Carla Gómez/ })).toBeInTheDocument()
    expect(llamadas.filter((l) => l.cursorTareas === CURSOR_TAREAS)).toHaveLength(0)
  })

  it("CAL-1D02: durante una recarga de fondo los botones están en espera y no piden nada", async () => {
    const { cliente } = montar()
    await esperarTabla()
    const espera = diferido()
    manejador = (l) => (l.cursor === null && l.cursorTareas === null ? espera.promesa : undefined)
    act(() => {
      void cliente.refetchQueries()
    })
    await waitFor(() => expect(boton("Alumnos siguientes")).toHaveAttribute("aria-busy", "true"))
    const antes = llamadas.length
    fireEvent.click(boton("Alumnos siguientes"))
    await reposar()
    expect(llamadas.length).toBe(antes)
    espera.resolver(respuestaJson(200, respuestaGradebook(null, null)))
    await waitFor(() =>
      expect(boton("Alumnos siguientes")).not.toHaveAttribute("aria-busy", "true"),
    )
  })
})

describe("gradebook: errores según la matriz (CAL-1D03)", () => {
  it.each([
    ["403", () => errorApi(403, "SIN_ACCESO_A_LA_CLASE", SIN_ACCESO), SIN_ACCESO],
    ["400 de claseId", () => validacion("claseId: Invalid UUID"), SIN_ACCESO],
    ["400 del cursor", () => validacion("cursor: no es válido"), CURSOR_TEXTO],
    ["500", () => errorApi(500, "ERROR_INTERNO", "Error interno del servidor"), GENERICO],
    ["503", () => errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado"), GENERICO],
    ["sin conexión", () => new Response("", { status: 502 }), GENERICO],
  ] as const)(
    "CAL-1D03: primera carga con %s: un solo MensajeError en lugar de la tabla, sin aviso; el foco, puesto en la raíz antes de la respuesta, no cae en <body>",
    async (_nombre, respuesta, texto) => {
      const espera = diferido()
      manejador = () => espera.promesa
      const { container } = montar()
      const raiz = raizDe(container)
      act(() => raiz.focus())
      espera.resolver(respuesta())
      expect(await screen.findByText(texto)).toBeInTheDocument()
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      expect(screen.queryByRole("table")).toBeNull()
      expect(aviso.error).not.toHaveBeenCalled()
      expect(document.activeElement).not.toBe(document.body)
      expect(document.activeElement).toBe(raiz)
    },
  )

  it.each([
    ["500", () => errorApi(500, "ERROR_INTERNO", "Error interno del servidor"), GENERICO],
    ["sin conexión", () => new Response("", { status: 502 }), GENERICO],
    ["403", () => errorApi(403, "SIN_ACCESO_A_LA_CLASE", SIN_ACCESO), SIN_ACCESO],
  ] as const)(
    "CAL-1D03: una ventana nueva con %s da un solo MensajeError en lugar de la tabla, sin aviso, y el foco va de «Alumnos siguientes» a la raíz",
    async (_nombre, respuesta, texto) => {
      const { container } = montar()
      await esperarTabla()
      manejador = (l) => (l.cursor === CURSOR_ALUMNOS ? respuesta() : undefined)
      const pulsado = boton("Alumnos siguientes")
      act(() => pulsado.focus())
      fireEvent.click(pulsado)
      expect(await screen.findByText(texto)).toBeInTheDocument()
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      expect(screen.queryByRole("table")).toBeNull()
      expect(aviso.error).not.toHaveBeenCalled()
      await waitFor(() => expect(document.activeElement).toBe(raizDe(container)))
    },
  )

  it("CAL-1D03: una recarga de fondo con datos que falla con un 5xx conserva la tabla, sin aviso", async () => {
    const { cliente } = montar()
    await esperarTabla()
    manejador = () => errorApi(500, "ERROR_INTERNO", "Error interno del servidor")
    await act(async () => {
      await cliente.refetchQueries()
    })
    await reposar()
    expect(screen.getByRole("table")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1D03: una recarga de fondo con datos que responde 403 reemplaza la vista y el foco va a la raíz, nunca a <body>", async () => {
    const { cliente, container } = montar()
    const tabla = await esperarTabla()
    const enlace = within(tabla).getByRole("link", { name: "8.5 Ana Ruiz, Tarea 1" })
    act(() => enlace.focus())
    manejador = () => errorApi(403, "SIN_ACCESO_A_LA_CLASE", SIN_ACCESO)
    await act(async () => {
      await cliente.refetchQueries()
    })
    expect(await screen.findByText(SIN_ACCESO)).toBeInTheDocument()
    expect(screen.queryByRole("table")).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(raizDe(container)))
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1D03: un error con que apiClient redirige no avisa", async () => {
    manejador = () => errorApi(403, "ACCESO_RESTRINGIDO", "Tu acceso está restringido.")
    montar()
    await waitFor(() => expect(asignar).toHaveBeenCalledWith("/acceso-restringido"))
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

// Enmienda 2: las tres clases de "fuera de contrato", dos entradas por clase.
const FUERA_DE_CONTRATO = [
  ["limiteTareas: Too big: expected number to be <=50"],
  ['estado: Invalid option: expected one of "todas"|"asignadas"'],
  [""],
  ["   "],
  ["cursorTareas.0: no es válido"],
  ["alumnos.0.id: Invalid UUID"],
] as const

describe("gradebook: primera carga con un 400 fuera de contrato (CAL-1D11)", () => {
  it.each(FUERA_DE_CONTRATO)(
    "CAL-1D11: «%s» en el maestro da un solo MensajeError con el genérico, sin aviso, sin tabla ni rastro del servidor; el foco, puesto en la raíz antes de la respuesta, no cae en <body>",
    async (mensaje) => {
      const espera = diferido()
      manejador = () => espera.promesa
      const { container } = montar("maestro")
      const raiz = raizDe(container)
      act(() => raiz.focus())
      espera.resolver(validacion(mensaje))
      expect(await screen.findByText(GENERICO)).toBeInTheDocument()
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(screen.queryByRole("table")).toBeNull()
      sinRastroDelServidor(mensaje)
      expect(document.activeElement).not.toBe(document.body)
    },
  )
})

describe("gradebook: ventana nueva con un 400 fuera de contrato (CAL-1D12)", () => {
  const casos = FUERA_DE_CONTRATO.flatMap(([mensaje]) => [
    ["Tareas más antiguas", mensaje] as const,
    ["Alumnos siguientes", mensaje] as const,
  ])

  it.each(casos)(
    "CAL-1D12: tras «%s», «%s» lleva el cursor correcto, deja ver la tabla anterior mientras llega y da un solo MensajeError con el genérico, sin aviso, con el foco en la raíz",
    async (nombre, mensaje) => {
      const { container } = montar()
      await esperarTabla()
      const espera = diferido()
      const deLaVentana = (l: Llamada) =>
        nombre === "Tareas más antiguas"
          ? l.cursorTareas === CURSOR_TAREAS
          : l.cursor === CURSOR_ALUMNOS
      manejador = (l) => (deLaVentana(l) ? espera.promesa : undefined)
      const pulsado = boton(nombre)
      act(() => pulsado.focus())
      fireEvent.click(pulsado)
      await waitFor(() => expect(deLaVentana(llamadas.at(-1) as Llamada)).toBe(true))
      expect(screen.getByRole("table")).toBeInTheDocument()
      espera.resolver(validacion(mensaje))
      expect(await screen.findByText(GENERICO)).toBeInTheDocument()
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      expect(screen.queryByRole("table")).toBeNull()
      expect(aviso.error).not.toHaveBeenCalled()
      sinRastroDelServidor(mensaje)
      await waitFor(() => expect(document.activeElement).toBe(raizDe(container)))
    },
  )

  it.each([
    ["Tareas más antiguas", "cursorTareas: no es válido"],
    ["Tareas más antiguas", "cursorTareas:"],
    ["Alumnos siguientes", "cursor:"],
  ] as const)(
    "CAL-1D12: vecino del cursor: tras «%s», «%s» da el texto fijo del cursor, sin aviso",
    async (nombre, mensaje) => {
      montar()
      await esperarTabla()
      manejador = (l) =>
        l.cursorTareas === CURSOR_TAREAS || l.cursor === CURSOR_ALUMNOS
          ? validacion(mensaje)
          : undefined
      fireEvent.click(boton(nombre))
      expect(await screen.findByText(CURSOR_TEXTO)).toBeInTheDocument()
      expect(screen.queryByText(GENERICO)).toBeNull()
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )
})

describe("gradebook: estados vecinos del 400 fuera de contrato (CAL-1D13)", () => {
  it.each([
    [
      "con refetch del QueryClient",
      (c: QueryClient) => c.refetchQueries({ queryKey: clavePrefijoDeCalificaciones(CLASE_ID) }),
    ],
    [
      "al invalidar el prefijo de calificaciones",
      (c: QueryClient) => c.invalidateQueries({ queryKey: clavePrefijoDeCalificaciones(CLASE_ID) }),
    ],
  ] as const)(
    "CAL-1D13: el mismo 400 dos veces seguidas (primera carga y otra petición de la misma clave %s) deja un solo MensajeError y ningún aviso; el foco, puesto en la raíz antes de la respuesta, no cae en <body>",
    async (_nombre, otraVez) => {
      const espera = diferido()
      manejador = () => espera.promesa
      const { cliente, container } = montar()
      act(() => raizDe(container).focus())
      espera.resolver(validacion("limiteTareas: Too big: expected number to be <=50"))
      expect(await screen.findByText(GENERICO)).toBeInTheDocument()
      manejador = () => validacion("limiteTareas: Too big: expected number to be <=50")
      const antes = llamadas.length
      await act(async () => {
        await otraVez(cliente)
      })
      await reposar()
      expect(llamadas.length).toBe(antes + 1)
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      expect(screen.getByText(GENERICO)).toBeInTheDocument()
      expect(aviso.error).not.toHaveBeenCalled()
      expect(document.activeElement).not.toBe(document.body)
    },
  )

  it.each(["alumnos.0.id: Invalid UUID", "cursorTareas: no es válido"])(
    "CAL-1D13: una recarga de fondo con datos que responde «%s» conserva la tabla, sin aviso (S-19)",
    async (mensaje) => {
      const { cliente } = montar()
      await esperarTabla()
      manejador = () => validacion(mensaje)
      await act(async () => {
        await cliente.refetchQueries()
      })
      await reposar()
      expect(screen.getByRole("table")).toBeInTheDocument()
      expect(screen.queryByRole("alert")).toBeNull()
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )

  it("CAL-1D13: con la vista desmontada y una ventana en vuelo, un 400 fuera de contrato no avisa ni deja errores en la consola; al volver a montar con la misma QueryClient, tampoco avisa", async () => {
    const consola = vi.spyOn(console, "error")
    const { cliente, unmount } = montar()
    await esperarTabla()
    const espera = diferido()
    manejador = (l) => (l.cursorTareas === CURSOR_TAREAS ? espera.promesa : undefined)
    fireEvent.click(boton("Tareas más antiguas"))
    await waitFor(() => expect(llamadas.at(-1)?.cursorTareas).toBe(CURSOR_TAREAS))
    unmount()
    espera.resolver(validacion("estado: Invalid option"))
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
    manejador = () => undefined
    montar("maestro", cliente)
    expect(await esperarTabla()).toBeInTheDocument()
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(consola).not.toHaveBeenCalled()
    consola.mockRestore()
  })

  it("CAL-1D13: en el admin, «limiteTareas: Too big…» da el mismo resultado que en el maestro", async () => {
    const mensaje = "limiteTareas: Too big: expected number to be <=50"
    const espera = diferido()
    manejador = () => espera.promesa
    const { container } = montar("admin")
    const raiz = raizDe(container)
    act(() => raiz.focus())
    espera.resolver(validacion(mensaje))
    expect(await screen.findByText(GENERICO)).toBeInTheDocument()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(screen.queryByRole("table")).toBeNull()
    sinRastroDelServidor(mensaje)
    expect(document.activeElement).not.toBe(document.body)
  })
})

// Corrección de la verificación de 01d (M-08): el foco cuando el botón de ventana pulsado desaparece.
// Cada botón desaparece de tres formas: la ventana de destino llega de la red (no estaba en caché), está
// en caché pero vieja (staleTime 0: se ve al instante y se vuelve a pedir) o está en caché fresca (se
// ve al instante y no se pide). "Tareas más recientes" y "Alumnos anteriores" desaparecen al pulsarlos
// (su pila se vacía); los otros dos, cuando su destino ya no trae cursor siguiente.
const VENTANA_INICIAL = { cursor: null, cursorTareas: null }
const DESTINOS = {
  "Tareas más antiguas": { previo: null, destino: { cursor: null, cursorTareas: CURSOR_TAREAS } },
  "Alumnos siguientes": { previo: null, destino: { cursor: CURSOR_ALUMNOS, cursorTareas: null } },
  "Tareas más recientes": { previo: "Tareas más antiguas", destino: VENTANA_INICIAL },
  "Alumnos anteriores": { previo: "Alumnos siguientes", destino: VENTANA_INICIAL },
} as const

type BotonDeVentana = keyof typeof DESTINOS
type ModoDeLaVentana = "red" | "caché vieja" | "caché fresca"

const clienteFresco = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  })

const pidioLaVentana = (
  desde: number,
  destino: { cursor: string | null; cursorTareas: string | null },
) =>
  llamadas
    .slice(desde)
    .some((l) => l.cursor === destino.cursor && l.cursorTareas === destino.cursorTareas)

describe("gradebook: foco cuando el botón de ventana pulsado desaparece (M-08, CAL-1D02b a CAL-1D02p)", () => {
  it.each([
    ["CAL-1D02b", "Tareas más antiguas", "red"],
    ["CAL-1D02c", "Tareas más antiguas", "caché vieja"],
    ["CAL-1D02d", "Tareas más antiguas", "caché fresca"],
    ["CAL-1D02e", "Alumnos siguientes", "red"],
    ["CAL-1D02f", "Alumnos siguientes", "caché vieja"],
    ["CAL-1D02g", "Alumnos siguientes", "caché fresca"],
    ["CAL-1D02h", "Tareas más recientes", "red"],
    ["CAL-1D02i", "Tareas más recientes", "caché vieja"],
    ["CAL-1D02j", "Tareas más recientes", "caché fresca"],
    ["CAL-1D02k", "Alumnos anteriores", "red"],
    ["CAL-1D02l", "Alumnos anteriores", "caché vieja"],
    ["CAL-1D02m", "Alumnos anteriores", "caché fresca"],
  ] as const satisfies readonly (readonly [string, BotonDeVentana, ModoDeLaVentana])[])(
    "%s: «%s» desaparece con la ventana de destino desde la %s y el foco termina en el h2, nunca en <body> ni en la raíz",
    async (_id, nombre, modo) => {
      const { previo, destino } = DESTINOS[nombre]
      const cliente = modo === "caché fresca" ? clienteFresco() : nuevoCliente()
      const clave = claveGradebook(CLASE_ID, destino)
      if (previo === null && modo !== "red") {
        cliente.setQueryData(clave, respuestaGradebook(destino.cursor, destino.cursorTareas))
      }
      const { container } = montar("maestro", cliente)
      await esperarTabla()
      if (previo !== null) {
        fireEvent.click(boton(previo))
        await waitFor(() => expect(boton(nombre)).toBeInTheDocument())
        await reposar()
      }
      if (previo !== null && modo === "red") {
        cliente.removeQueries({ queryKey: clave, exact: true })
      }
      const desde = llamadas.length
      const pulsado = boton(nombre)
      act(() => pulsado.focus())
      expect(document.activeElement).toBe(pulsado)
      fireEvent.click(pulsado)
      await waitFor(() => expect(screen.queryByRole("button", { name: nombre })).toBeNull())
      await reposar()
      expect(pidioLaVentana(desde, destino)).toBe(modo !== "caché fresca")
      expect(screen.getByRole("table")).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: nombre })).toBeNull()
      expect(document.activeElement).toBe(encabezado())
      expect(document.activeElement).not.toBe(raizDe(container))
      expect(document.activeElement).not.toBe(document.body)
    },
  )

  it("CAL-1D02n: una recarga de fondo que quita el botón con el foco sin que se haya pulsado lleva el foco a la raíz, no al h2", async () => {
    const { cliente, container } = montar()
    await esperarTabla()
    const antiguas = boton("Tareas más antiguas")
    act(() => antiguas.focus())
    cuerpoDelServidor = (cursor, cursorTareas) => ({
      ...respuestaGradebook(cursor, cursorTareas),
      siguienteCursorTareas: null,
    })
    // El reloj está fijo: se adelanta para que la respuesta de la recarga tenga su propia hora, como en
    // la aplicación (la clave del gancho de foco cambia con ella).
    vi.setSystemTime(new Date(AHORA.getTime() + 1_000))
    await act(async () => {
      await cliente.refetchQueries()
    })
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Tareas más antiguas" })).toBeNull(),
    )
    await reposar()
    expect(document.activeElement).toBe(raizDe(container))
    expect(document.activeElement).not.toBe(encabezado())
  })

  it("CAL-1D02o: con la ventana de destino en caché vieja y su recarga fallando con un 5xx, la ventana de la caché sigue a la vista, sin aviso, y el foco del botón desaparecido va al h2", async () => {
    const cliente = nuevoCliente()
    const destino = DESTINOS["Tareas más antiguas"].destino
    cliente.setQueryData(
      claveGradebook(CLASE_ID, destino),
      respuestaGradebook(destino.cursor, destino.cursorTareas),
    )
    const { container } = montar("maestro", cliente)
    await esperarTabla()
    manejador = (l) =>
      l.cursorTareas === CURSOR_TAREAS ? errorApi(500, "ERROR_INTERNO", "Error interno") : undefined
    const desde = llamadas.length
    const antiguas = boton("Tareas más antiguas")
    act(() => antiguas.focus())
    fireEvent.click(antiguas)
    await waitFor(() => expect(pidioLaVentana(desde, destino)).toBe(true))
    await reposar()
    expect(screen.getByRole("columnheader", { name: /^Tarea 4/ })).toBeInTheDocument()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(encabezado())
    expect(document.activeElement).not.toBe(raizDe(container))
  })

  it("CAL-1D02p: con la ventana de destino en caché vieja y su recarga respondiendo 403, la vista se reemplaza y el foco va a la raíz, nunca a <body>", async () => {
    const cliente = nuevoCliente()
    const destino = DESTINOS["Alumnos siguientes"].destino
    cliente.setQueryData(
      claveGradebook(CLASE_ID, destino),
      respuestaGradebook(destino.cursor, destino.cursorTareas),
    )
    const { container } = montar("maestro", cliente)
    await esperarTabla()
    manejador = (l) =>
      l.cursor === CURSOR_ALUMNOS
        ? errorApi(403, "SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.")
        : undefined
    const siguientes = boton("Alumnos siguientes")
    act(() => siguientes.focus())
    fireEvent.click(siguientes)
    expect(await screen.findByText(SIN_ACCESO)).toBeInTheDocument()
    await reposar()
    expect(screen.queryByRole("table")).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(raizDe(container))
    expect(document.activeElement).not.toBe(document.body)
  })
})

// Corrección de la ronda 1 de 01d (T-06): una ventana que llega vacía porque el alumno o la tarea del
// cursor desapareció entre dos ventanas (el servidor responde 200 con la lista vacía, sin 400) no es la
// clase vacía. Se ve el texto del cursor en lugar de la tabla, con el resumen y la navegación.
const CURSOR_ALUMNOS_2 = uuid(961)

interface VentanasVacias {
  alumnos: (cursor: string | null) => boolean
  tareas: (cursorTareas: string | null) => boolean
}

// El servidor con ventanas vacías. La ventana de CURSOR_ALUMNOS trae CURSOR_ALUMNOS_2 como siguiente
// (dos ventanas de alumnos detrás de la primera); una ventana vacía no trae cursor siguiente en su
// dimensión, como el servidor real.
const servidorConVacias =
  (vacias: VentanasVacias) => (cursor: string | null, cursorTareas: string | null) => {
    const base = respuestaGradebook(cursor, cursorTareas)
    const sinAlumnos = vacias.alumnos(cursor)
    const sinTareas = vacias.tareas(cursorTareas)
    const siguienteCursor = cursor === CURSOR_ALUMNOS ? CURSOR_ALUMNOS_2 : base.siguienteCursor
    return {
      ...base,
      tareas: sinTareas ? [] : base.tareas,
      siguienteCursorTareas: sinTareas ? null : base.siguienteCursorTareas,
      alumnos: sinAlumnos ? [] : base.alumnos.map((f) => (sinTareas ? { ...f, celdas: [] } : f)),
      siguienteCursor: sinAlumnos ? null : siguienteCursor,
    }
  }

const nunca = () => false
const siempre = () => true
const conCursor = (cursor: string | null) => cursor !== null

// El texto del cursor una sola vez, en el único alert, en lugar de la tabla; el resumen sigue; ningún
// aviso ni aria-busy colgado.
const esperarVentanaVacia = async () => {
  await waitFor(() => expect(screen.getAllByText(CURSOR_TEXTO)).toHaveLength(1))
  await reposar()
  expect(screen.getAllByText(CURSOR_TEXTO)).toHaveLength(1)
  expect(screen.getAllByRole("alert")).toHaveLength(1)
  expect(screen.queryByRole("table")).toBeNull()
  expect(screen.getByText("3 alumnos")).toBeInTheDocument()
  expect(screen.getByText("Promedio de la clase: 82.4 %")).toBeInTheDocument()
  expect(screen.queryByText("Aún no hay alumnos en esta clase.")).toBeNull()
  expect(screen.queryByText("Aún no hay tareas en esta clase.")).toBeNull()
  expect(document.querySelector("[aria-busy='true']")).toBeNull()
  expect(aviso.error).not.toHaveBeenCalled()
  expect(aviso.success).not.toHaveBeenCalled()
}

describe("gradebook: ventana vacía por un cambio concurrente (T-06, CAL-1D02q a CAL-1D02z)", () => {
  it("CAL-1D02q: la ventana de alumnos con cursor llega vacía: el texto del cursor en lugar de la tabla, el resumen y «Alumnos anteriores» siguen, sin «Alumnos siguientes», y el foco del botón desaparecido va al h2; regresar vuelve a pintar la tabla", async () => {
    cuerpoDelServidor = servidorConVacias({ alumnos: conCursor, tareas: nunca })
    const { container } = montar()
    await esperarTabla()
    const pulsado = boton("Alumnos siguientes")
    act(() => pulsado.focus())
    fireEvent.click(pulsado)
    await esperarVentanaVacia()
    expect(llamadas.at(-1)).toMatchObject({ cursor: CURSOR_ALUMNOS, cursorTareas: null })
    expect(screen.queryByRole("button", { name: "Alumnos siguientes" })).toBeNull()
    expect(boton("Alumnos anteriores")).toBeInTheDocument()
    expect(boton("Tareas más antiguas")).toBeInTheDocument()
    expect(document.activeElement).toBe(encabezado())
    expect(document.activeElement).not.toBe(raizDe(container))
    fireEvent.click(boton("Alumnos anteriores"))
    expect(await screen.findByRole("row", { name: /^Ana Ruiz/ })).toBeInTheDocument()
    await reposar()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
    expect(screen.queryByRole("button", { name: "Alumnos anteriores" })).toBeNull()
    expect(document.activeElement).toBe(encabezado())
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1D02r: la ventana de tareas con cursorTareas llega vacía: el texto del cursor en lugar de la tabla, el resumen y «Tareas más recientes» siguen, sin «Tareas más antiguas», y el foco va al h2; regresar vuelve a pintar la tabla", async () => {
    cuerpoDelServidor = servidorConVacias({ alumnos: nunca, tareas: conCursor })
    montar()
    await esperarTabla()
    const pulsado = boton("Tareas más antiguas")
    act(() => pulsado.focus())
    fireEvent.click(pulsado)
    await esperarVentanaVacia()
    expect(llamadas.at(-1)).toMatchObject({ cursor: null, cursorTareas: CURSOR_TAREAS })
    expect(screen.queryByRole("button", { name: "Tareas más antiguas" })).toBeNull()
    expect(boton("Tareas más recientes")).toBeInTheDocument()
    expect(boton("Alumnos siguientes")).toBeInTheDocument()
    expect(document.activeElement).toBe(encabezado())
    fireEvent.click(boton("Tareas más recientes"))
    expect(await screen.findByRole("columnheader", { name: /^Tarea 1/ })).toBeInTheDocument()
    await reposar()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
    expect(screen.queryByRole("button", { name: "Tareas más recientes" })).toBeNull()
    expect(document.activeElement).toBe(encabezado())
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1D02s: las dos dimensiones vacías: un solo texto del cursor, «Alumnos anteriores» y «Tareas más recientes» a la vista, y regresar por las dos pilas vuelve a la tabla", async () => {
    cuerpoDelServidor = servidorConVacias({ alumnos: conCursor, tareas: conCursor })
    montar()
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await esperarVentanaVacia()
    const antiguas = boton("Tareas más antiguas")
    act(() => antiguas.focus())
    fireEvent.click(antiguas)
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Tareas más antiguas" })).toBeNull(),
    )
    await esperarVentanaVacia()
    expect(llamadas.at(-1)).toMatchObject({ cursor: CURSOR_ALUMNOS, cursorTareas: CURSOR_TAREAS })
    expect(boton("Tareas más recientes")).toBeInTheDocument()
    expect(boton("Alumnos anteriores")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Alumnos siguientes" })).toBeNull()
    expect(document.activeElement).toBe(encabezado())
    fireEvent.click(boton("Tareas más recientes"))
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Tareas más recientes" })).toBeNull(),
    )
    await esperarVentanaVacia()
    fireEvent.click(boton("Alumnos anteriores"))
    expect(await screen.findByRole("row", { name: /^Ana Ruiz/ })).toBeInTheDocument()
    await reposar()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1D02t: desde una ventana vacía, «Alumnos anteriores» que sigue a la vista (pila de dos) regresa a la ventana con datos, la vuelve a pintar y el foco se queda en el botón; la pila no guarda el cursor vacío", async () => {
    cuerpoDelServidor = servidorConVacias({
      alumnos: (cursor) => cursor === CURSOR_ALUMNOS_2,
      tareas: nunca,
    })
    montar()
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    expect(await screen.findByRole("row", { name: /^Carla Gómez/ })).toBeInTheDocument()
    await reposar()
    fireEvent.click(boton("Alumnos siguientes"))
    await esperarVentanaVacia()
    expect(llamadas.at(-1)).toMatchObject({ cursor: CURSOR_ALUMNOS_2 })
    const anteriores = boton("Alumnos anteriores")
    act(() => anteriores.focus())
    fireEvent.click(anteriores)
    expect(await screen.findByRole("row", { name: /^Carla Gómez/ })).toBeInTheDocument()
    await reposar()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
    expect(document.activeElement).toBe(boton("Alumnos anteriores"))
    const desde = llamadas.length
    fireEvent.click(boton("Alumnos anteriores"))
    expect(await screen.findByRole("row", { name: /^Ana Ruiz/ })).toBeInTheDocument()
    await reposar()
    expect(llamadas.slice(desde).some((l) => l.cursor === CURSOR_ALUMNOS_2)).toBe(false)
    expect(screen.queryByRole("button", { name: "Alumnos anteriores" })).toBeNull()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
  })

  it("CAL-1D02u: si la ventana a la que se regresa también llega vacía y el botón pulsado sigue a la vista, el foco se queda en él y el texto del cursor se ve una sola vez", async () => {
    let vaciarLaAnterior = false
    cuerpoDelServidor = servidorConVacias({
      alumnos: (cursor) =>
        cursor === CURSOR_ALUMNOS_2 || (vaciarLaAnterior && cursor === CURSOR_ALUMNOS),
      tareas: nunca,
    })
    montar()
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    expect(await screen.findByRole("row", { name: /^Carla Gómez/ })).toBeInTheDocument()
    await reposar()
    fireEvent.click(boton("Alumnos siguientes"))
    await esperarVentanaVacia()
    vaciarLaAnterior = true
    const desde = llamadas.length
    const anteriores = boton("Alumnos anteriores")
    act(() => anteriores.focus())
    fireEvent.click(anteriores)
    await waitFor(() =>
      expect(llamadas.slice(desde).some((l) => l.cursor === CURSOR_ALUMNOS)).toBe(true),
    )
    await esperarVentanaVacia()
    expect(document.activeElement).toBe(boton("Alumnos anteriores"))
  })

  it("CAL-1D02v: la primera ventana vacía, sin cursores, sigue diciendo el vacío de la clase (alumnos o tareas), sin el texto del cursor ni botones", async () => {
    cuerpoDelServidor = servidorConVacias({ alumnos: siempre, tareas: nunca })
    const primera = montar()
    expect(await screen.findByText("Aún no hay alumnos en esta clase.")).toBeInTheDocument()
    await reposar()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
    primera.unmount()
    cuerpoDelServidor = servidorConVacias({ alumnos: nunca, tareas: siempre })
    montar()
    expect(await screen.findByText("Aún no hay tareas en esta clase.")).toBeInTheDocument()
    await reposar()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("CAL-1D02w: una recarga de fondo exitosa de una ventana con cursor que llega vacía pinta el texto del cursor con el resumen y la navegación, sin aviso", async () => {
    let vaciar = false
    cuerpoDelServidor = servidorConVacias({
      alumnos: (cursor) => vaciar && cursor !== null,
      tareas: nunca,
    })
    const { cliente } = montar()
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    expect(await screen.findByRole("row", { name: /^Carla Gómez/ })).toBeInTheDocument()
    await reposar()
    vaciar = true
    vi.setSystemTime(new Date(AHORA.getTime() + 1_000))
    await act(async () => {
      await cliente.refetchQueries({
        queryKey: claveGradebook(CLASE_ID, { cursor: CURSOR_ALUMNOS, cursorTareas: null }),
      })
    })
    await esperarVentanaVacia()
    expect(boton("Alumnos anteriores")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Alumnos siguientes" })).toBeNull()
  })

  it("CAL-1D02x: la ventana vacía y el 400 del cursor dicen lo mismo con el mismo MensajeError", async () => {
    cuerpoDelServidor = servidorConVacias({ alumnos: conCursor, tareas: nunca })
    const vacia = montar()
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await esperarVentanaVacia()
    const alertaDeLaVentana = screen.getByRole("alert").outerHTML
    vacia.unmount()
    cuerpoDelServidor = respuestaGradebook
    montar()
    await esperarTabla()
    manejador = (l) =>
      l.cursor === CURSOR_ALUMNOS ? validacion("cursor: no es válido") : undefined
    fireEvent.click(boton("Alumnos siguientes"))
    expect(await screen.findByText(CURSOR_TEXTO)).toBeInTheDocument()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(screen.getByRole("alert").outerHTML).toBe(alertaDeLaVentana)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1D02y: con la vista desmontada y la ventana vacía en vuelo, no avisa ni deja errores en la consola; al volver a montar con la misma QueryClient empieza en la primera ventana", async () => {
    const consola = vi.spyOn(console, "error")
    const servidor = servidorConVacias({ alumnos: conCursor, tareas: nunca })
    cuerpoDelServidor = servidor
    const { cliente, unmount } = montar()
    await esperarTabla()
    const espera = diferido()
    manejador = (l) => (l.cursor === CURSOR_ALUMNOS ? espera.promesa : undefined)
    fireEvent.click(boton("Alumnos siguientes"))
    await waitFor(() => expect(llamadas.at(-1)?.cursor).toBe(CURSOR_ALUMNOS))
    unmount()
    espera.resolver(respuestaJson(200, servidor(CURSOR_ALUMNOS, null)))
    await reposar()
    manejador = () => undefined
    montar("maestro", cliente)
    expect(await screen.findByRole("row", { name: /^Ana Ruiz/ })).toBeInTheDocument()
    await reposar()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(consola).not.toHaveBeenCalled()
    consola.mockRestore()
  })

  it("CAL-1D02z: al regresar desde una ventana vacía a una que ya no está en caché, mientras llega se sigue viendo el texto del cursor (nunca el vacío de la clase) y al llegar se pinta la tabla", async () => {
    cuerpoDelServidor = servidorConVacias({ alumnos: conCursor, tareas: nunca })
    const { cliente } = montar()
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    await esperarVentanaVacia()
    cliente.removeQueries({ queryKey: claveGradebook(CLASE_ID, VENTANA_INICIAL), exact: true })
    const espera = diferido()
    manejador = (l) => (l.cursor === null && l.cursorTareas === null ? espera.promesa : undefined)
    const desde = llamadas.length
    fireEvent.click(boton("Alumnos anteriores"))
    await waitFor(() => expect(pidioLaVentana(desde, VENTANA_INICIAL)).toBe(true))
    await reposar()
    expect(screen.queryByText("Aún no hay alumnos en esta clase.")).toBeNull()
    expect(screen.getAllByText(CURSOR_TEXTO)).toHaveLength(1)
    expect(screen.getByText("3 alumnos")).toBeInTheDocument()
    espera.resolver(respuestaJson(200, respuestaGradebook(null, null)))
    expect(await screen.findByRole("row", { name: /^Ana Ruiz/ })).toBeInTheDocument()
    await reposar()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
    expect(document.activeElement).toBe(encabezado())
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

// T-07: el texto del cursor pide volver a abrir Calificaciones. Con el staleTime de la app (30 s) y la
// misma QueryClient, volver a abrir antes de que pasen tiene que pedir otra vez la primera ventana.
const STALE_DE_LA_APP = 30_000
const clienteConStaleDeLaApp = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: STALE_DE_LA_APP },
      mutations: { retry: false },
    },
  })

interface CasoDeCursorRoto {
  nombre: string
  pulsar: "Alumnos siguientes" | "Tareas más antiguas"
  vacias: VentanasVacias | null
  campo: "cursor" | "cursorTareas" | null
}

const CASOS_DE_CURSOR_ROTO: CasoDeCursorRoto[] = [
  {
    nombre: "ventana vacía de alumnos",
    pulsar: "Alumnos siguientes",
    vacias: { alumnos: conCursor, tareas: nunca },
    campo: null,
  },
  {
    nombre: "ventana vacía de tareas",
    pulsar: "Tareas más antiguas",
    vacias: { alumnos: nunca, tareas: conCursor },
    campo: null,
  },
  { nombre: "400 de cursor", pulsar: "Alumnos siguientes", vacias: null, campo: "cursor" },
  {
    nombre: "400 de cursorTareas",
    pulsar: "Tareas más antiguas",
    vacias: null,
    campo: "cursorTareas",
  },
]

// La primera ventana después del cambio: dos alumnos y ninguna ventana siguiente.
const primeraVentanaCambiada = () => ({
  ...respuestaGradebook(null, null),
  siguienteCursor: null,
  siguienteCursorTareas: null,
  resumen: { modo: "puntos", totalAlumnos: 2, promedioDeLaClase: 82.4, alumnosEnRiesgo: 1 },
})

const prepararCursorRoto = (caso: CasoDeCursorRoto) => {
  const estado = { cambio: false }
  const vacias = caso.vacias
  const conVacias = vacias === null ? respuestaGradebook : servidorConVacias(vacias)
  cuerpoDelServidor = (cursor, cursorTareas) => {
    if (cursor === null && cursorTareas === null && estado.cambio) return primeraVentanaCambiada()
    return conVacias(cursor, cursorTareas)
  }
  const campo = caso.campo
  manejador = (l) =>
    campo !== null && l[campo] !== null ? validacion(`${campo}: no es válido`) : undefined
  return estado
}

// Las llamadas de la vista que marcan viejo el gradebook (las de la prueba no llevan refetchType).
const marcasViejas = (espia: { mock: { calls: unknown[][] } }) =>
  espia.mock.calls.filter(
    ([filtros]) => (filtros as { refetchType?: string }).refetchType === "none",
  )

describe("gradebook: volver a abrir tras el texto del cursor (T-07, CAL-1D02aa a CAL-1D02ae)", () => {
  it.each(CASOS_DE_CURSOR_ROTO)(
    "CAL-1D02aa: $nombre y volver a abrir antes de 30 s con la misma QueryClient: pide la primera ventana al servidor y pinta la clase como está",
    async (caso) => {
      const estado = prepararCursorRoto(caso)
      const cliente = clienteConStaleDeLaApp()
      const primera = montar("maestro", cliente)
      await esperarTabla()
      estado.cambio = true
      fireEvent.click(boton(caso.pulsar))
      await waitFor(() => expect(screen.getAllByText(CURSOR_TEXTO)).toHaveLength(1))
      await reposar()
      primera.unmount()
      const desde = llamadas.length
      montar("maestro", cliente)
      await waitFor(() => expect(screen.getByText("2 alumnos")).toBeInTheDocument())
      await reposar()
      expect(pidioLaVentana(desde, VENTANA_INICIAL)).toBe(true)
      expect(llamadas.slice(desde)).toHaveLength(1)
      expect(screen.queryByRole("button", { name: "Alumnos siguientes" })).toBeNull()
      expect(screen.queryByRole("button", { name: "Tareas más antiguas" })).toBeNull()
      expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )

  it.each(CASOS_DE_CURSOR_ROTO)(
    "CAL-1D02ab: $nombre con la vista montada: la ventana rota no se vuelve a pedir, sin aviso, sin mover el foco y sin cambiar lo que se ve",
    async (caso) => {
      prepararCursorRoto(caso)
      const cliente = clienteConStaleDeLaApp()
      montar("maestro", cliente)
      await esperarTabla()
      fireEvent.click(boton(caso.pulsar))
      await waitFor(() => expect(screen.getAllByText(CURSOR_TEXTO)).toHaveLength(1))
      await reposar()
      const desde = llamadas.length
      const foco = document.activeElement
      const html = document.body.innerHTML
      await reposar()
      await reposar()
      expect(llamadas.slice(desde)).toHaveLength(0)
      expect(document.activeElement).toBe(foco)
      expect(document.body.innerHTML).toBe(html)
      expect(screen.getAllByText(CURSOR_TEXTO)).toHaveLength(1)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(aviso.success).not.toHaveBeenCalled()
    },
  )

  it("CAL-1D02ac: dos ocurrencias seguidas (avanzar a la ventana vacía, regresar y volver a avanzar) marcan viejo el gradebook dos veces y no más, sin tocar la ventana a la vista", async () => {
    cuerpoDelServidor = servidorConVacias({ alumnos: conCursor, tareas: nunca })
    const cliente = clienteConStaleDeLaApp()
    const espia = vi.spyOn(cliente, "invalidateQueries")
    montar("maestro", cliente)
    await esperarTabla()
    expect(marcasViejas(espia)).toHaveLength(0)
    fireEvent.click(boton("Alumnos siguientes"))
    await esperarVentanaVacia()
    expect(marcasViejas(espia)).toHaveLength(1)
    fireEvent.click(boton("Alumnos anteriores"))
    expect(await screen.findByRole("row", { name: /^Ana Ruiz/ })).toBeInTheDocument()
    await reposar()
    expect(marcasViejas(espia)).toHaveLength(1)
    const desde = llamadas.length
    fireEvent.click(boton("Alumnos siguientes"))
    await esperarVentanaVacia()
    await reposar()
    expect(marcasViejas(espia)).toHaveLength(2)
    expect(llamadas.slice(desde)).toHaveLength(0)
    const actual = cliente.getQueryCache().find({
      queryKey: claveGradebook(CLASE_ID, DESTINOS["Alumnos siguientes"].destino),
      exact: true,
    })
    expect(actual?.state.isInvalidated).toBe(false)
    const inicial = cliente
      .getQueryCache()
      .find({ queryKey: claveGradebook(CLASE_ID, VENTANA_INICIAL), exact: true })
    expect(inicial?.state.isInvalidated).toBe(true)
  })

  it("CAL-1D02ad: el 400 de un cursor en la primera carga (sin cursor enviado) da el texto del cursor sin bucle: una sola petición, sin aviso", async () => {
    manejador = () => validacion("cursor: no es válido")
    const cliente = clienteConStaleDeLaApp()
    const espia = vi.spyOn(cliente, "invalidateQueries")
    montar("maestro", cliente)
    expect(await screen.findByText(CURSOR_TEXTO)).toBeInTheDocument()
    await reposar()
    await reposar()
    expect(llamadas).toHaveLength(1)
    expect(marcasViejas(espia)).toHaveLength(1)
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1D02ae: una recarga de fondo de la ventana con cursor que la deja vacía también marca viejo el gradebook: volver a abrir antes de 30 s pide la primera ventana", async () => {
    const estado = { vacia: false, cambio: false }
    const servidor = servidorConVacias({
      alumnos: (cursor) => cursor !== null && estado.vacia,
      tareas: nunca,
    })
    cuerpoDelServidor = (cursor, cursorTareas) =>
      cursor === null && cursorTareas === null && estado.cambio
        ? primeraVentanaCambiada()
        : servidor(cursor, cursorTareas)
    const cliente = clienteConStaleDeLaApp()
    const primera = montar("maestro", cliente)
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    expect(await screen.findByRole("row", { name: /^Carla Gómez/ })).toBeInTheDocument()
    await reposar()
    estado.vacia = true
    estado.cambio = true
    vi.setSystemTime(new Date(AHORA.getTime() + 1_000))
    await act(async () => {
      await cliente.refetchQueries({
        queryKey: claveGradebook(CLASE_ID, DESTINOS["Alumnos siguientes"].destino),
        exact: true,
      })
    })
    await esperarVentanaVacia()
    primera.unmount()
    const desde = llamadas.length
    montar("maestro", cliente)
    await waitFor(() => expect(screen.getByText("2 alumnos")).toBeInTheDocument())
    expect(pidioLaVentana(desde, VENTANA_INICIAL)).toBe(true)
  })
})

// T-08: la vista con un enlace a su misma ruta, como el NavLink de la sección «Calificaciones» de la
// clase: pulsarlo navega con otra location.key sin desmontar la vista (CAL-T-228 lo prueba con el
// router real). El enlace se enfoca antes del clic, como al pulsarlo en el navegador.
const RUTA_DEL_MAESTRO = `/maestro/clases/${CLASE_ID}/calificaciones`
const montarConSeccion = (cliente: QueryClient) =>
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[RUTA_DEL_MAESTRO]}>
        <Link to={RUTA_DEL_MAESTRO}>Sección Calificaciones</Link>
        <Routes>
          <Route path="/maestro/clases/:claseId/calificaciones" element={<GradebookView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
const pulsarLaSeccion = () => {
  const enlace = screen.getByRole("link", { name: "Sección Calificaciones" })
  act(() => enlace.focus())
  fireEvent.click(enlace)
  return enlace
}
const BOTONES_DE_VENTANA = [
  "Alumnos siguientes",
  "Alumnos anteriores",
  "Tareas más antiguas",
  "Tareas más recientes",
]

describe("gradebook: pulsar la sección «Calificaciones» estando en ella (T-08, CAL-1D03d a CAL-1D03i)", () => {
  it.each(CASOS_DE_CURSOR_ROTO)(
    "CAL-1D03d: $nombre y pulsar la sección «Calificaciones» (misma ruta, otra location.key): pide la primera ventana una sola vez, pinta la clase como está sin el texto ni las pilas, sin aviso, sin aria-busy ni otra marca, y el foco se queda en la sección",
    async (caso) => {
      const estado = prepararCursorRoto(caso)
      const cliente = clienteConStaleDeLaApp()
      const espia = vi.spyOn(cliente, "invalidateQueries")
      montarConSeccion(cliente)
      await esperarTabla()
      estado.cambio = true
      fireEvent.click(boton(caso.pulsar))
      await waitFor(() => expect(screen.getAllByText(CURSOR_TEXTO)).toHaveLength(1))
      await reposar()
      const marcas = marcasViejas(espia).length
      const desde = llamadas.length
      const enlace = pulsarLaSeccion()
      await waitFor(() => expect(screen.getByText("2 alumnos")).toBeInTheDocument())
      await reposar()
      expect(llamadas.slice(desde)).toHaveLength(1)
      expect(pidioLaVentana(desde, VENTANA_INICIAL)).toBe(true)
      expect(await esperarTabla()).toBeInTheDocument()
      expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
      for (const nombre of BOTONES_DE_VENTANA) {
        expect(screen.queryByRole("button", { name: nombre })).toBeNull()
      }
      expect(document.querySelector("[aria-busy='true']")).toBeNull()
      expect(marcasViejas(espia)).toHaveLength(marcas)
      expect(document.activeElement).toBe(enlace)
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )

  it("CAL-1D03e: con la tabla sana en la primera ventana, pulsar la sección la vuelve a pedir una vez: dos pulsaciones con la petición en vuelo no la duplican, los botones esperan mientras llega y al llegar no queda aria-busy ni aviso, y el foco sigue en la sección", async () => {
    const cliente = clienteConStaleDeLaApp()
    const espia = vi.spyOn(cliente, "invalidateQueries")
    montarConSeccion(cliente)
    await esperarTabla()
    await reposar()
    const retenida = diferido()
    manejador = (l) => (l.cursor === null && l.cursorTareas === null ? retenida.promesa : undefined)
    const desde = llamadas.length
    const enlace = pulsarLaSeccion()
    await waitFor(() => expect(llamadas.slice(desde)).toHaveLength(1))
    expect(boton("Alumnos siguientes")).toHaveAttribute("aria-busy", "true")
    pulsarLaSeccion()
    await reposar()
    expect(llamadas.slice(desde)).toHaveLength(1)
    await act(async () => {
      retenida.resolver(respuestaJson(200, respuestaGradebook(null, null)))
      await retenida.promesa
    })
    await waitFor(() => expect(document.querySelector("[aria-busy='true']")).toBeNull())
    await reposar()
    expect(llamadas.slice(desde)).toHaveLength(1)
    expect(pidioLaVentana(desde, VENTANA_INICIAL)).toBe(true)
    expect(await esperarTabla()).toBeInTheDocument()
    expect(marcasViejas(espia)).toHaveLength(0)
    expect(document.activeElement).toBe(enlace)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1D03f: con la tabla sana en la ventana siguiente, pulsar la sección vuelve a la primera ventana sin pilas y la pide al servidor aunque esté fresca en la caché, sin aviso", async () => {
    const cliente = clienteConStaleDeLaApp()
    montarConSeccion(cliente)
    await esperarTabla()
    fireEvent.click(boton("Alumnos siguientes"))
    expect(await screen.findByRole("row", { name: /^Carla Gómez/ })).toBeInTheDocument()
    await reposar()
    const desde = llamadas.length
    const enlace = pulsarLaSeccion()
    expect(await screen.findByRole("row", { name: /^Ana Ruiz/ })).toBeInTheDocument()
    await waitFor(() => expect(document.querySelector("[aria-busy='true']")).toBeNull())
    await reposar()
    expect(llamadas.slice(desde)).toHaveLength(1)
    expect(pidioLaVentana(desde, VENTANA_INICIAL)).toBe(true)
    expect(screen.queryByRole("button", { name: "Alumnos anteriores" })).toBeNull()
    expect(boton("Alumnos siguientes")).toBeInTheDocument()
    expect(document.activeElement).toBe(enlace)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1D03g: con el genérico a la vista (5xx en la primera carga), pulsar la sección vuelve a pedir la primera ventana y pinta la tabla, sin aviso", async () => {
    const estado = { falla: true }
    manejador = () => (estado.falla ? errorApi(503, "ERROR_INTERNO", "caído") : undefined)
    const cliente = clienteConStaleDeLaApp()
    montarConSeccion(cliente)
    expect(await screen.findByText(GENERICO)).toBeInTheDocument()
    await reposar()
    estado.falla = false
    const desde = llamadas.length
    const enlace = pulsarLaSeccion()
    expect(await esperarTabla()).toBeInTheDocument()
    await reposar()
    expect(llamadas.slice(desde)).toHaveLength(1)
    expect(screen.queryByText(GENERICO)).toBeNull()
    expect(document.querySelector("[aria-busy='true']")).toBeNull()
    expect(document.activeElement).toBe(enlace)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1D03h: mientras carga la primera ventana, pulsar la sección no pide otra: al llegar, una sola petición y la tabla", async () => {
    const retenida = diferido()
    manejador = () => retenida.promesa
    const cliente = clienteConStaleDeLaApp()
    montarConSeccion(cliente)
    await waitFor(() => expect(llamadas).toHaveLength(1))
    pulsarLaSeccion()
    await reposar()
    expect(llamadas).toHaveLength(1)
    await act(async () => {
      retenida.resolver(respuestaJson(200, respuestaGradebook(null, null)))
      await retenida.promesa
    })
    expect(await esperarTabla()).toBeInTheDocument()
    await reposar()
    expect(llamadas).toHaveLength(1)
    expect(document.querySelector("[aria-busy='true']")).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1D03i: con «Alumnos siguientes» en vuelo, pulsar la sección vuelve a la primera ventana sin volver a pedir el cursor; al llegar la ventana retenida no cambia lo que se ve ni el foco, la guarda se libera y no hay aviso", async () => {
    const cliente = clienteConStaleDeLaApp()
    montarConSeccion(cliente)
    await esperarTabla()
    await reposar()
    const retenida = diferido()
    manejador = (l) => (l.cursor !== null ? retenida.promesa : undefined)
    fireEvent.click(boton("Alumnos siguientes"))
    await waitFor(() =>
      expect(pidioLaVentana(0, DESTINOS["Alumnos siguientes"].destino)).toBe(true),
    )
    const desde = llamadas.length
    const enlace = pulsarLaSeccion()
    await waitFor(() => expect(pidioLaVentana(desde, VENTANA_INICIAL)).toBe(true))
    await act(async () => {
      retenida.resolver(respuestaJson(200, respuestaGradebook(CURSOR_ALUMNOS, null)))
      await retenida.promesa
    })
    await waitFor(() => expect(document.querySelector("[aria-busy='true']")).toBeNull())
    await reposar()
    expect(llamadas.slice(desde)).toHaveLength(1)
    expect(screen.getByRole("row", { name: /^Ana Ruiz/ })).toBeInTheDocument()
    expect(screen.queryByRole("row", { name: /^Carla Gómez/ })).toBeNull()
    expect(screen.queryByRole("button", { name: "Alumnos anteriores" })).toBeNull()
    expect(document.activeElement).toBe(enlace)
    fireEvent.click(boton("Alumnos siguientes"))
    expect(await screen.findByRole("row", { name: /^Carla Gómez/ })).toBeInTheDocument()
    expect(aviso.error).not.toHaveBeenCalled()
  })
})
