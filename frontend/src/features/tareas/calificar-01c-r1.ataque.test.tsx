import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { claveGradebook, claveMisCalificaciones } from "@/services/calificacionesService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveTarea } from "@/services/trabajoService"

import { EntregaDeAlumnoView } from "./entrega-de-alumno-view"
import { aNumeroDePuntos, cuerpoDeCalificacion, totalDelPanel } from "./lib"

// Ataque (CALIFICACIONES-01c, ronda 1): el panel «Calificación» de la entrega de un alumno. Números,
// errores de campo del servidor, recargas de fondo con el formulario a la vista, recargas tras un 409
// con una de las dos lecturas fallida, perspectivas, caché e invalidaciones. Reloj fijo (solo Date).
// El servidor es un doble en memoria; nada de red real ni navegador.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const PASADA = "2030-01-05T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const OTRA_CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ALUMNO_ID = "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0301"
const CRITERIO_1 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d81"
const CRITERIO_2 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d82"
const CRITERIO_3 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d83"
const CRITERIO_VIEJO_1 = "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d61"
const CRITERIO_VIEJO_2 = "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d62"
const RUTA_TAREA = `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const RUTA_ALUMNO = `${RUTA_TAREA}/entregas/${ALUMNO_ID}`
const RUTA_CALIFICACION = `${RUTA_ALUMNO}/calificacion`
const RUTA_HILO = `${RUTA_ALUMNO}/comentarios`
const MENSAJE_MODIFICADA =
  "La entrega cambió mientras la calificabas: el alumno la anuló o la volvió a entregar, u otra persona la calificó. No se guardó tu calificación; revisa la entrega actual."
const MENSAJE_RUBRICA =
  "La rúbrica o los puntos de la tarea cambiaron mientras calificabas. No se guardó tu calificación; vuelve a calificar con la versión actual."
const MENSAJE_NO_CALIFICABLE =
  "Este alumno todavía puede entregar. Podrás calificarlo cuando entregue o cuando se cierre la entrega."
const AVISO_RECARGA =
  "No pudimos cargar la entrega actual. Revisa tu conexión e inténtalo de nuevo."
const AVISO_RECARGA_TAREA =
  "No pudimos actualizar la tarea. Mostramos la última versión que tenemos."
const AYUDA_COMENTARIO = "Se publica en los comentarios privados de esta entrega."

const CLARIDAD = "Claridad (de 5 puntos)"
const ORTOGRAFIA = "Ortografía (de 4 puntos)"
const COMENTARIO = "Comentario para el alumno (opcional)"

const RUBRICA = [
  { id: CRITERIO_1, criterio: "Claridad", puntosMax: 5 },
  { id: CRITERIO_2, criterio: "Ortografía", puntosMax: 4 },
]

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

const calificacionDoble = (extra: Record<string, unknown> = {}) => ({
  puntos: 8.5,
  sobre: 10,
  fecha: "2030-01-09T18:00:00.000Z",
  puntajes: [
    { criterioId: CRITERIO_1, criterio: "Claridad", puntosMax: 5, puntos: 4.5 },
    { criterioId: CRITERIO_2, criterio: "Ortografía", puntosMax: 4, puntos: 3.25 },
  ],
  ...extra,
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

const hiloVacio = () => respuestaJson(200, { comentarios: [], siguienteCursor: null })

interface Llamada {
  metodo: string
  url: string
  cuerpo: unknown
}

type Respuesta = () => Response | Promise<Response>

interface Servidor {
  tarea: Respuesta
  entrega: Respuesta
  hilo: Respuesta
  calificar: Respuesta[]
}

let servidor: Servidor
let llamadas: Llamada[] = []
let calificadas = 0

const instalarServidor = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null
      llamadas.push({ metodo, url, cuerpo })
      if (metodo === "GET" && url === RUTA_TAREA) return Promise.resolve(servidor.tarea())
      if (metodo === "GET" && url === RUTA_ALUMNO) return Promise.resolve(servidor.entrega())
      if (metodo === "GET" && url.startsWith(`${RUTA_HILO}?`)) {
        return Promise.resolve(servidor.hilo())
      }
      if (metodo === "GET" && url.startsWith(`${RUTA_TAREA}/entregas?`)) {
        return Promise.resolve(
          respuestaJson(200, { entregas: [], total: 0, entregadas: 0, siguienteCursor: null }),
        )
      }
      if (metodo === "PUT" && url === RUTA_CALIFICACION) {
        const responder = servidor.calificar[Math.min(calificadas, servidor.calificar.length - 1)]
        calificadas += 1
        if (responder === undefined) throw new Error("Precondición: el doble no tiene PUT")
        return Promise.resolve(responder())
      }
      return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
}

const renderVista = (perspectiva: "maestro" | "admin" = "maestro") => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const base = `/${perspectiva}/clases/:claseId/tareas/:tareaId/entregas`
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter
        initialEntries={[
          `/${perspectiva}/clases/${CLASE_ID}/tareas/${TAREA_ID}/entregas/${ALUMNO_ID}`,
        ]}
      >
        <Routes>
          <Route path={`${base}/:alumnoId`} element={<EntregaDeAlumnoView />} />
          <Route path={base} element={<p>Lista de entregas de prueba</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return cliente
}

const deLaTarea = () => llamadas.filter((l) => l.metodo === "GET" && l.url === RUTA_TAREA)
const deLaEntrega = () => llamadas.filter((l) => l.metodo === "GET" && l.url === RUTA_ALUMNO)
const deCalificar = () => llamadas.filter((l) => l.metodo === "PUT" && l.url === RUTA_CALIFICACION)
const versionDel = (llamada: Llamada | undefined) => {
  if (llamada === undefined) throw new Error("Precondición: hubo ese PUT")
  return (llamada.cuerpo as { version: number }).version
}

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

const campo = (nombre: string) => screen.getByLabelText(nombre)
const escribir = (nombre: string, valor: string) =>
  fireEvent.change(campo(nombre), { target: { value: valor } })
const encabezado = () => screen.getByRole("heading", { name: "Calificación", level: 3 })
const botonCalificar = () => screen.getByRole("button", { name: "Calificar y devolver" })
const botonActualizar = () => screen.getByRole("button", { name: "Actualizar calificación" })

const pulsar = (boton: HTMLElement) => {
  vi.setSystemTime(new Date(Date.now() + 5_000))
  boton.focus()
  fireEvent.click(boton)
}

const recargarDeFondo = async (cliente: QueryClient) => {
  vi.setSystemTime(new Date(Date.now() + 5_000))
  await act(() => cliente.invalidateQueries({ queryKey: claveTarea(CLASE_ID, TAREA_ID) }))
  await sinPeticionesEnVuelo(cliente)
}

const fueraDeBody = () => {
  const activo = document.activeElement
  if (!(activo instanceof HTMLElement) || activo === document.body) {
    throw new Error("El foco quedó en <body>")
  }
  return activo
}

const calificadaEn = (version: number, extra: Record<string, unknown> = {}) =>
  respuestaJson(200, {
    entrega: entregaDoble({
      estado: "calificado",
      version,
      calificacion: calificacionDoble(),
      ...extra,
    }),
  })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  llamadas = []
  calificadas = 0
  servidor = {
    tarea: () => respuestaJson(200, tareaDoble()),
    entrega: () => respuestaJson(200, { entrega: entregaDoble() }),
    hilo: hiloVacio,
    calificar: [() => calificadaEn(3)],
  }
  instalarServidor()
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

const APERTURA = { puntos: 10, rubrica: RUBRICA }
const estadoCon = (claridad: string, ortografia: string) => ({
  puntajes: { [CRITERIO_1]: claridad, [CRITERIO_2]: ortografia },
  calificacion: "",
  comentario: "",
})

describe("ataque 01c r1 · números del panel", () => {
  it.each([
    ["8,5", 8.5],
    [" 8.5 ", 8.5],
    [" 8.5\t", 8.5],
    ["08.50", 8.5],
    ["0", 0],
    ["0,00", 0],
    ["1000", 1000],
    ["8.", Number.NaN],
    [".5", Number.NaN],
    [",5", Number.NaN],
    ["1e1", Number.NaN],
    ["Infinity", Number.NaN],
    ["-0", Number.NaN],
    ["+5", Number.NaN],
    ["NaN", Number.NaN],
    ["", Number.NaN],
    ["   ", Number.NaN],
    ["8.555", Number.NaN],
    ["8,5,5", Number.NaN],
    ["0x5", Number.NaN],
    ["5 5", Number.NaN],
    ["٥", Number.NaN],
    ["５", Number.NaN],
  ] as const)("CAL-T-71: aNumeroDePuntos(%j) es %s, sin coaccionar", (texto, esperado) => {
    expect(Object.is(aNumeroDePuntos(texto), esperado)).toBe(true)
  })

  it.each([
    ["5", null],
    ["5.00", null],
    ["5,0", null],
    ["0", null],
    ["0.00", null],
    ["4,99", null],
    ["5.01", "Escribe de 0 a 5 puntos."],
    ["6", "Escribe de 0 a 5 puntos."],
    ["-0", "Escribe de 0 a 5 puntos."],
    ["-1", "Escribe de 0 a 5 puntos."],
    ["8.", "Escribe de 0 a 5 puntos."],
    [".5", "Escribe de 0 a 5 puntos."],
    ["1e1", "Escribe de 0 a 5 puntos."],
    ["Infinity", "Escribe de 0 a 5 puntos."],
    ["NaN", "Escribe de 0 a 5 puntos."],
    ["cuatro", "Escribe de 0 a 5 puntos."],
    ["", "Escribe los puntos de este criterio."],
    ["  ", "Escribe los puntos de este criterio."],
    ["4.555", "Usa hasta 2 decimales."],
    ["4,555", "Usa hasta 2 decimales."],
  ] as const)(
    "CAL-T-72: en un criterio de 5 puntos, %j da el error %s y nunca un cuerpo con un valor inválido",
    (texto, error) => {
      const resultado = cuerpoDeCalificacion(estadoCon(texto, "4"), APERTURA, 2)
      const esperado =
        error === null
          ? {
              ok: true,
              datos: {
                version: 2,
                puntosDeLaTarea: 10,
                puntajes: [
                  { criterioId: CRITERIO_1, puntos: aNumeroDePuntos(texto) },
                  { criterioId: CRITERIO_2, puntos: 4 },
                ],
                calificacion: null,
              },
            }
          : { ok: false, errores: { [`puntajes.${CRITERIO_1}`]: error } }
      expect(resultado).toEqual(esperado)
    },
  )

  it("CAL-T-72: sin rúbrica, exactamente el máximo vale, una centésima más no, y 0 vale", () => {
    const sinRubrica = { puntos: 80, rubrica: [] }
    const con = (calificacion: string) =>
      cuerpoDeCalificacion({ puntajes: {}, calificacion, comentario: "" }, sinRubrica, 0)
    expect(con("80")).toEqual({
      ok: true,
      datos: { version: 0, puntosDeLaTarea: 80, puntajes: [], calificacion: 80 },
    })
    expect(con("0")).toEqual({
      ok: true,
      datos: { version: 0, puntosDeLaTarea: 80, puntajes: [], calificacion: 0 },
    })
    expect(con("80,01")).toEqual({
      ok: false,
      errores: { calificacion: "Escribe de 0 a 80 puntos." },
    })
    expect(con("")).toEqual({ ok: false, errores: { calificacion: "Escribe la calificación." } })
  })

  it("CAL-T-73: la calificación escalada del texto de ayuda coincide en centésimas con un oráculo exacto (mitades hacia arriba), en una malla de rúbricas, puntos y valores", () => {
    // Oráculo independiente: cociente y resto con BigInt; el resto doble ≥ divisor sube uno.
    const oraculo = (centesimas: number, puntos: number, sumaDeMaximos: number): number => {
      const numerador = BigInt(centesimas) * BigInt(puntos)
      const divisor = BigInt(sumaDeMaximos)
      const cociente = numerador / divisor
      const resto = numerador % divisor
      return Number(2n * resto >= divisor ? cociente + 1n : cociente) / 100
    }
    const rubricas: readonly (readonly [number, number])[] = [
      [3, 7],
      [4, 4],
      [9, 1],
      [7, 6],
      [1, 1],
    ]
    const puntosDeTareas = [10, 7, 100, 33, 1]
    const valores = ["0", "0.01", "0.5", "1", "1.15", "2.33", "2.5", "3", "0.99", "0.07"]
    let comparados = 0
    for (const [max1, max2] of rubricas) {
      const rubrica = [
        { id: CRITERIO_1, criterio: "A", puntosMax: max1 },
        { id: CRITERIO_2, criterio: "B", puntosMax: max2 },
      ]
      for (const puntos of puntosDeTareas) {
        for (const v1 of valores) {
          for (const v2 of valores) {
            const n1 = Number(v1)
            const n2 = Number(v2)
            if (n1 > max1 || n2 > max2) continue
            const total = totalDelPanel(estadoCon(v1, v2), { puntos, rubrica })
            const centesimas = Math.round(n1 * 100) + Math.round(n2 * 100)
            expect(total.suma).toBe(centesimas / 100)
            expect(total.sumaDeMaximos).toBe(max1 + max2)
            expect(total.calificacion).toBe(oraculo(centesimas, puntos, max1 + max2))
            comparados += 1
          }
        }
      }
    }
    expect(comparados).toBeGreaterThan(1000)
  })

  it("CAL-T-73: en la pantalla, una mitad exacta sube (0.02 de 8 sobre 10 puntos da 0.03) y la suma no cuenta un campo inválido", async () => {
    servidor.tarea = () =>
      respuestaJson(
        200,
        tareaDoble({
          rubrica: [
            { id: CRITERIO_1, criterio: "Claridad", puntosMax: 4 },
            { id: CRITERIO_2, criterio: "Ortografía", puntosMax: 4 },
          ],
        }),
      )
    renderVista()
    await screen.findByLabelText("Claridad (de 4 puntos)")
    escribir("Claridad (de 4 puntos)", "0,01")
    escribir("Ortografía (de 4 puntos)", "9")
    expect(
      screen.getByText("Suma de la rúbrica: 0.01 de 8 · Calificación: 0.01 de 10"),
    ).toBeInTheDocument()
    escribir("Ortografía (de 4 puntos)", "")
    escribir("Claridad (de 4 puntos)", "0.02")
    // 2 centésimas × 10 / 8 = 2.5 → 3 centésimas.
    expect(
      screen.getByText("Suma de la rúbrica: 0.02 de 8 · Calificación: 0.03 de 10"),
    ).toBeInTheDocument()
  })

  it("CAL-T-74: capturados en otro orden (primero el último criterio), el cuerpo lleva los puntajes en el orden de la rúbrica y los puntos de apertura aunque una recarga de fondo traiga otros", async () => {
    const cliente = renderVista()
    await screen.findByLabelText(CLARIDAD)
    await sinPeticionesEnVuelo(cliente)
    escribir(ORTOGRAFIA, " 3,5 ")
    escribir(CLARIDAD, "05")
    servidor.tarea = () => respuestaJson(200, tareaDoble({ puntos: 20 }))
    await recargarDeFondo(cliente)
    expect(campo(CLARIDAD)).toHaveValue("05")

    pulsar(botonCalificar())

    await waitFor(() => expect(deCalificar()).toHaveLength(1))
    await sinPeticionesEnVuelo(cliente)
    expect(deCalificar()[0]?.cuerpo).toEqual({
      version: 2,
      puntosDeLaTarea: 10,
      puntajes: [
        { criterioId: CRITERIO_1, puntos: 5 },
        { criterioId: CRITERIO_2, puntos: 3.5 },
      ],
      calificacion: null,
    })
  })
})

describe("ataque 01c r1 · errores de campo y accesibilidad", () => {
  it("CAL-T-75: un error local queda enlazado (aria-invalid y aria-describedby) y se quita al escribir; un 400 de la segunda posición marca el segundo criterio, sin aviso, con el foco ahí", async () => {
    servidor.calificar = [
      () => errorApi(400, "VALIDACION", "puntajes.1.puntos: Escribe de 0 a 4 puntos."),
    ]
    const cliente = renderVista()
    await screen.findByLabelText(CLARIDAD)
    escribir(ORTOGRAFIA, "2")

    pulsar(botonCalificar())

    expect(campo(CLARIDAD)).toHaveFocus()
    expect(campo(CLARIDAD)).toHaveAttribute("aria-invalid", "true")
    expect(campo(CLARIDAD)).toHaveAccessibleDescription("Escribe los puntos de este criterio.")
    expect(deCalificar()).toHaveLength(0)
    escribir(CLARIDAD, "4")
    expect(campo(CLARIDAD)).toHaveAttribute("aria-invalid", "false")
    expect(campo(CLARIDAD)).not.toHaveAttribute("aria-describedby")

    pulsar(botonCalificar())

    await waitFor(() => expect(campo(ORTOGRAFIA)).toHaveFocus())
    await sinPeticionesEnVuelo(cliente)
    expect(campo(ORTOGRAFIA)).toHaveAttribute("aria-invalid", "true")
    expect(campo(ORTOGRAFIA)).toHaveAccessibleDescription("Escribe de 0 a 4 puntos.")
    expect(campo(CLARIDAD)).toHaveAttribute("aria-invalid", "false")
    expect(aviso.error).not.toHaveBeenCalled()
    expect(aviso.success).not.toHaveBeenCalled()
  })

  it("CAL-T-76: un 400 «comentario: …» marca el comentario con su ayuda y su error en la descripción, sin aviso, con el foco en el comentario", async () => {
    servidor.calificar = [() => errorApi(400, "VALIDACION", "comentario: Escribe tu comentario")]
    const cliente = renderVista()
    await screen.findByLabelText(CLARIDAD)
    expect(campo(COMENTARIO)).toHaveAccessibleDescription(AYUDA_COMENTARIO)
    escribir(CLARIDAD, "4")
    escribir(ORTOGRAFIA, "3")
    escribir(COMENTARIO, "Bien")

    pulsar(botonCalificar())

    await waitFor(() => expect(campo(COMENTARIO)).toHaveFocus())
    await sinPeticionesEnVuelo(cliente)
    expect(campo(COMENTARIO)).toHaveAttribute("aria-invalid", "true")
    expect(campo(COMENTARIO)).toHaveAccessibleDescription(
      `${AYUDA_COMENTARIO} Escribe tu comentario`,
    )
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-T-77: un 400 «puntajes.<i>.puntos» cuya posición no está en la rúbrica enviada no se pierde en silencio: o lo avisa o lo muestra", async () => {
    servidor.calificar = [
      () => errorApi(400, "VALIDACION", "puntajes.7.puntos: Escribe de 0 a 5 puntos."),
    ]
    const cliente = renderVista()
    await screen.findByLabelText(CLARIDAD)
    escribir(CLARIDAD, "4")
    escribir(ORTOGRAFIA, "3")

    pulsar(botonCalificar())

    await waitFor(() => expect(deCalificar()).toHaveLength(1))
    await sinPeticionesEnVuelo(cliente)
    const avisado = aviso.error.mock.calls.length
    const mostrado = screen.queryAllByText("Escribe de 0 a 5 puntos.").length
    expect(
      avisado + mostrado,
      "el 400 no dio ningún aviso ni ningún ErrorDeCampo: el maestro no sabe que no se guardó",
    ).toBeGreaterThan(0)
  })

  it("CAL-T-78: un 400 «calificacion: …» en una tarea con rúbrica (sin campo «Calificación») no se pierde en silencio: o lo avisa o lo muestra", async () => {
    servidor.calificar = [
      () => errorApi(400, "VALIDACION", "calificacion: Escribe de 0 a 10 puntos."),
    ]
    const cliente = renderVista()
    await screen.findByLabelText(CLARIDAD)
    escribir(CLARIDAD, "4")
    escribir(ORTOGRAFIA, "3")

    pulsar(botonCalificar())

    await waitFor(() => expect(deCalificar()).toHaveLength(1))
    await sinPeticionesEnVuelo(cliente)
    const avisado = aviso.error.mock.calls.length
    const mostrado = screen.queryAllByText("Escribe de 0 a 10 puntos.").length
    expect(
      avisado + mostrado,
      "el 400 no dio ningún aviso ni ningún ErrorDeCampo: el maestro no sabe que no se guardó",
    ).toBeGreaterThan(0)
  })

  it("CAL-T-79: nombres accesibles «<criterio> (de <n> puntos)» con singular, autoComplete off en cada campo y, en vuelo, aria-busy y aria-disabled sin disabled", async () => {
    servidor.tarea = () =>
      respuestaJson(
        200,
        tareaDoble({
          rubrica: [...RUBRICA, { id: CRITERIO_3, criterio: "Puntualidad", puntosMax: 1 }],
        }),
      )
    const pendiente = diferida()
    servidor.calificar = [() => pendiente.promesa]
    const cliente = renderVista()
    await screen.findByLabelText(CLARIDAD)
    const campos = [CLARIDAD, ORTOGRAFIA, "Puntualidad (de 1 punto)", COMENTARIO].map(campo)
    for (const elemento of campos) expect(elemento).toHaveAttribute("autocomplete", "off")
    const formulario = campo(COMENTARIO).closest("form")
    if (formulario === null) throw new Error("Precondición: el panel tiene su formulario")
    // Los campos del panel: tres criterios y el comentario (el del hilo privado vive en otro form).
    expect(within(formulario).getAllByRole("textbox")).toHaveLength(4)
    escribir(CLARIDAD, "1")
    escribir(ORTOGRAFIA, "1")
    escribir("Puntualidad (de 1 punto)", "1")

    pulsar(botonCalificar())

    await waitFor(() => expect(botonCalificar()).toHaveAttribute("aria-busy", "true"))
    expect(botonCalificar()).toHaveAttribute("aria-disabled", "true")
    expect(botonCalificar()).not.toBeDisabled()
    expect(botonCalificar()).toHaveFocus()
    await act(async () => {
      pendiente.resolver(calificadaEn(3))
      await pendiente.promesa
    })
    await sinPeticionesEnVuelo(cliente)
    expect(botonActualizar()).not.toHaveAttribute("aria-busy")
  })
})

describe("ataque 01c r1 · recargas de fondo con el formulario a la vista", () => {
  it("CAL-T-80: la tarea pasa a vencida sin tardías y a 20 puntos con una entrega entregada: el formulario no se vuelve a montar y el cuerpo lleva la versión y los puntos de apertura", async () => {
    const cliente = renderVista()
    await screen.findByLabelText(CLARIDAD)
    await sinPeticionesEnVuelo(cliente)
    const antes = campo(CLARIDAD)
    escribir(CLARIDAD, "4")
    escribir(ORTOGRAFIA, "3")
    escribir(COMENTARIO, "Lo que escribí")
    antes.focus()
    servidor.tarea = () =>
      respuestaJson(200, tareaDoble({ fechaLimite: PASADA, aceptaTardias: false, puntos: 20 }))
    await recargarDeFondo(cliente)

    expect(campo(CLARIDAD)).toBe(antes)
    expect(antes).toHaveFocus()
    expect(campo(ORTOGRAFIA)).toHaveValue("3")
    expect(campo(COMENTARIO)).toHaveValue("Lo que escribí")
    expect(
      screen.queryByText("Este alumno no entregó la tarea y la entrega ya está cerrada."),
    ).toBeNull()

    pulsar(botonCalificar())

    await waitFor(() => expect(deCalificar()).toHaveLength(1))
    await sinPeticionesEnVuelo(cliente)
    expect(deCalificar()[0]?.cuerpo).toMatchObject({ version: 2, puntosDeLaTarea: 10 })
  })

  it("CAL-T-81: con una calificada a la vista, otra persona recalifica (versión 3 → 4, otros puntos): lo escrito y lo guardado de apertura siguen, el botón sigue diciendo «Actualizar calificación» y el guardado envía version: 3", async () => {
    servidor.entrega = () => calificadaEn(3)
    servidor.calificar = [() => errorApi(409, "ENTREGA_MODIFICADA", MENSAJE_MODIFICADA)]
    const cliente = renderVista()
    await screen.findByLabelText(CLARIDAD)
    await sinPeticionesEnVuelo(cliente)
    expect(campo(CLARIDAD)).toHaveValue("4.5")
    expect(campo(ORTOGRAFIA)).toHaveValue("3.25")
    const antes = campo(CLARIDAD)
    escribir(CLARIDAD, "5")
    servidor.entrega = () =>
      calificadaEn(4, {
        calificacion: calificacionDoble({
          puntos: 2,
          puntajes: [
            { criterioId: CRITERIO_1, criterio: "Claridad", puntosMax: 5, puntos: 1 },
            { criterioId: CRITERIO_2, criterio: "Ortografía", puntosMax: 4, puntos: 1 },
          ],
        }),
      })
    await recargarDeFondo(cliente)

    expect(campo(CLARIDAD)).toBe(antes)
    expect(campo(CLARIDAD)).toHaveValue("5")
    expect(campo(ORTOGRAFIA)).toHaveValue("3.25")
    expect(botonActualizar()).toBeInTheDocument()
    expect(aviso.error).not.toHaveBeenCalled()

    pulsar(botonActualizar())

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(encabezado()).toHaveFocus())
    await sinPeticionesEnVuelo(cliente)
    expect(versionDel(deCalificar()[0])).toBe(3)
    // Tras el 409, el panel nace con lo de la versión 4.
    expect(campo(ORTOGRAFIA)).toHaveValue("1")
    expect(encabezado()).toHaveFocus()
  })
})

describe("ataque 01c r1 · recargas tras un 409 con una lectura fallida", () => {
  it("CAL-T-82: RUBRICA_MODIFICADA con las dos lecturas en 5xx: dos avisos en total (el del 409 y uno de la recarga), nada se reinicia y el foco se queda en el botón", async () => {
    servidor.calificar = [() => errorApi(409, "RUBRICA_MODIFICADA", MENSAJE_RUBRICA)]
    const cliente = renderVista()
    await screen.findByLabelText(CLARIDAD)
    await sinPeticionesEnVuelo(cliente)
    escribir(CLARIDAD, "4")
    escribir(ORTOGRAFIA, "3")
    servidor.tarea = () => errorApi(500, "ERROR_INTERNO", "falló")
    servidor.entrega = () => errorApi(500, "ERROR_INTERNO", "falló")

    pulsar(botonCalificar())

    await waitFor(() => expect(aviso.error.mock.calls.length).toBeGreaterThanOrEqual(2))
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.error).toHaveBeenCalledTimes(2)
    expect(aviso.error).toHaveBeenNthCalledWith(1, MENSAJE_RUBRICA)
    expect([AVISO_RECARGA, AVISO_RECARGA_TAREA]).toContain(aviso.error.mock.calls[1]?.[0])
    expect(campo(CLARIDAD)).toHaveValue("4")
    expect(campo(ORTOGRAFIA)).toHaveValue("3")
    expect(botonCalificar()).not.toHaveAttribute("aria-busy")
    expect(fueraDeBody()).toBe(botonCalificar())
  })

  it("CAL-T-83: RUBRICA_MODIFICADA con la tarea buena (rúbrica nueva) y la entrega en 5xx: un aviso de la entrega, el formulario sigue con la rúbrica de apertura y el siguiente cuerpo también", async () => {
    servidor.calificar = [
      () => errorApi(409, "RUBRICA_MODIFICADA", MENSAJE_RUBRICA),
      () => calificadaEn(3),
    ]
    const cliente = renderVista()
    await screen.findByLabelText(CLARIDAD)
    await sinPeticionesEnVuelo(cliente)
    escribir(CLARIDAD, "4")
    escribir(ORTOGRAFIA, "3")
    servidor.tarea = () =>
      respuestaJson(
        200,
        tareaDoble({ rubrica: [{ id: CRITERIO_3, criterio: "Estructura", puntosMax: 10 }] }),
      )
    servidor.entrega = () => errorApi(500, "ERROR_INTERNO", "falló")

    pulsar(botonCalificar())

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.error).toHaveBeenNthCalledWith(1, MENSAJE_RUBRICA)
    expect(aviso.error).toHaveBeenNthCalledWith(2, AVISO_RECARGA)
    expect(screen.queryByLabelText("Estructura (de 10 puntos)")).toBeNull()
    expect(campo(CLARIDAD)).toHaveValue("4")
    expect(fueraDeBody()).toBe(botonCalificar())

    pulsar(botonCalificar())

    await waitFor(() => expect(deCalificar()).toHaveLength(2))
    await sinPeticionesEnVuelo(cliente)
    expect(deCalificar()[1]?.cuerpo).toMatchObject({
      version: 2,
      puntajes: [
        { criterioId: CRITERIO_1, puntos: 4 },
        { criterioId: CRITERIO_2, puntos: 3 },
      ],
    })
  })

  it("CAL-T-84: ENTREGA_NO_CALIFICABLE con la recarga de la tarea en 404: la vista se reemplaza, solo el aviso del 409 y el foco en la raíz de la vista", async () => {
    servidor.calificar = [() => errorApi(409, "ENTREGA_NO_CALIFICABLE", MENSAJE_NO_CALIFICABLE)]
    const cliente = renderVista()
    await screen.findByLabelText(CLARIDAD)
    await sinPeticionesEnVuelo(cliente)
    escribir(CLARIDAD, "4")
    escribir(ORTOGRAFIA, "3")
    servidor.tarea = () => errorApi(404, "TAREA_NO_ENCONTRADA", "x")

    pulsar(botonCalificar())

    await screen.findByText("Esa tarea ya no existe.")
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(aviso.error).toHaveBeenCalledWith(MENSAJE_NO_CALIFICABLE)
    const activo = fueraDeBody()
    expect(activo).toHaveAttribute("tabindex", "-1")
    expect(activo).toHaveTextContent("Esa tarea ya no existe.")
  })

  it("CAL-T-85: RUBRICA_MODIFICADA y después ENTREGA_MODIFICADA: la primera recarga pide tarea y entrega una vez cada una, la segunda solo la entrega, y cada reinicio deja el foco en el h3", async () => {
    servidor.calificar = [
      () => errorApi(409, "RUBRICA_MODIFICADA", MENSAJE_RUBRICA),
      () => errorApi(409, "ENTREGA_MODIFICADA", MENSAJE_MODIFICADA),
      () => calificadaEn(5),
    ]
    const cliente = renderVista()
    await screen.findByLabelText(CLARIDAD)
    await sinPeticionesEnVuelo(cliente)
    const tareaAntes = deLaTarea().length
    const entregaAntes = deLaEntrega().length
    escribir(CLARIDAD, "4")
    escribir(ORTOGRAFIA, "3")
    servidor.entrega = () => respuestaJson(200, { entrega: entregaDoble({ version: 3 }) })

    pulsar(botonCalificar())

    await waitFor(() => expect(encabezado()).toHaveFocus())
    await sinPeticionesEnVuelo(cliente)
    expect(deLaTarea().length - tareaAntes).toBe(1)
    expect(deLaEntrega().length - entregaAntes).toBe(1)
    escribir(CLARIDAD, "4")
    escribir(ORTOGRAFIA, "3")
    servidor.entrega = () => respuestaJson(200, { entrega: entregaDoble({ version: 4 }) })

    pulsar(botonCalificar())

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(encabezado()).toHaveFocus())
    await sinPeticionesEnVuelo(cliente)
    expect(deLaTarea().length - tareaAntes).toBe(1)
    expect(deLaEntrega().length - entregaAntes).toBe(2)
    expect(deCalificar().map(versionDel)).toEqual([2, 3])
    escribir(CLARIDAD, "4")
    escribir(ORTOGRAFIA, "3")

    pulsar(botonCalificar())

    await waitFor(() => expect(deCalificar()).toHaveLength(3))
    await sinPeticionesEnVuelo(cliente)
    expect(versionDel(deCalificar()[2])).toBe(4)
  })
})

describe("ataque 01c r1 · caché, hilo y vista desmontada", () => {
  it("CAL-T-86: con comentario, el hilo vuelve a pedirse y muestra la devolución; el foco se queda en el h3 aunque el hilo llegue después", async () => {
    const TEXTO = "Buen trabajo; revisa la ortografía."
    const cliente = renderVista()
    await screen.findByLabelText(CLARIDAD)
    await sinPeticionesEnVuelo(cliente)
    escribir(CLARIDAD, "4")
    escribir(ORTOGRAFIA, "3")
    escribir(COMENTARIO, `  ${TEXTO}  `)
    const hiloPendiente = diferida()
    servidor.hilo = () => hiloPendiente.promesa

    pulsar(botonCalificar())

    await waitFor(() => expect(encabezado()).toHaveFocus())
    expect((deCalificar()[0]?.cuerpo as { comentario?: string }).comentario).toBe(TEXTO)
    await act(async () => {
      hiloPendiente.resolver(
        respuestaJson(200, {
          comentarios: [
            {
              id: "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d55",
              texto: TEXTO,
              autor: {
                id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
                nombre: "Luis Pérez",
                administracion: false,
              },
              creadoEn: new Date(Date.now()).toISOString(),
              propio: true,
            },
          ],
          siguienteCursor: null,
        }),
      )
      await hiloPendiente.promesa
    })
    expect(await screen.findByText(TEXTO)).toBeInTheDocument()
    await sinPeticionesEnVuelo(cliente)
    expect(encabezado()).toHaveFocus()
    expect(aviso.success).toHaveBeenCalledTimes(1)
  })

  it("CAL-T-87: el éxito marca viejos el gradebook y «Mis calificaciones» de esa clase (el prefijo), no los de otra clase, y la entrega en caché es la respuesta del PUT", async () => {
    const cliente = renderVista()
    await screen.findByLabelText(CLARIDAD)
    await sinPeticionesEnVuelo(cliente)
    const gradebook = claveGradebook(CLASE_ID, { cursor: null, cursorTareas: null })
    const mias = claveMisCalificaciones(CLASE_ID, "calificadas")
    const ajena = claveGradebook(OTRA_CLASE_ID, { cursor: null, cursorTareas: null })
    cliente.setQueryData(gradebook, { semilla: 1 })
    cliente.setQueryData(mias, { semilla: 2 })
    cliente.setQueryData(ajena, { semilla: 3 })
    escribir(CLARIDAD, "4")
    escribir(ORTOGRAFIA, "3")

    pulsar(botonCalificar())

    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    await sinPeticionesEnVuelo(cliente)
    expect(cliente.getQueryState(gradebook)?.isInvalidated).toBe(true)
    expect(cliente.getQueryState(mias)?.isInvalidated).toBe(true)
    expect(cliente.getQueryState(ajena)?.isInvalidated).toBe(false)
    expect(aviso.success).toHaveBeenCalledWith("Calificación publicada")
    expect(campo(CLARIDAD)).toHaveValue("4.5")
    expect(botonActualizar()).toBeInTheDocument()
  })

  it("CAL-T-88: «Volver a las entregas» con el PUT en vuelo y después 200: un solo aviso de éxito y ningún error en la consola", async () => {
    const consola = vi.spyOn(console, "error")
    const pendiente = diferida()
    servidor.calificar = [() => pendiente.promesa]
    const cliente = renderVista()
    await screen.findByLabelText(CLARIDAD)
    await sinPeticionesEnVuelo(cliente)
    escribir(CLARIDAD, "4")
    escribir(ORTOGRAFIA, "3")

    pulsar(botonCalificar())
    await waitFor(() => expect(deCalificar()).toHaveLength(1))
    fireEvent.click(screen.getByRole("link", { name: "Volver a las entregas" }))
    await screen.findByText("Lista de entregas de prueba")
    await act(async () => {
      pendiente.resolver(calificadaEn(3))
      await pendiente.promesa
    })
    await sinPeticionesEnVuelo(cliente)

    expect(aviso.success).toHaveBeenCalledTimes(1)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(consola).not.toHaveBeenCalled()
  })
})

describe("ataque 01c r1 · perspectivas", () => {
  it.each([
    ["entregada sin calificar", () => entregaDoble(), FUTURA, true],
    [
      "sin entrega, vencida y cerrada",
      () => entregaDoble({ estado: "asignado", fechaEntrega: null }),
      PASADA,
      false,
    ],
    [
      "calificada sin entrega",
      () =>
        entregaDoble({
          estado: "calificado",
          fechaEntrega: null,
          calificacion: calificacionDoble(),
        }),
      PASADA,
      false,
    ],
  ] as const)(
    "CAL-T-89: el admin con una entrega %s no tiene ningún campo ni botón de calificar",
    async (_caso, entrega, fechaLimite, aceptaTardias) => {
      servidor.tarea = () => respuestaJson(200, tareaDoble({ fechaLimite, aceptaTardias }))
      servidor.entrega = () => respuestaJson(200, { entrega: entrega() })
      const cliente = renderVista("admin")
      await screen.findByRole("heading", { name: "Calificación", level: 3 })
      await sinPeticionesEnVuelo(cliente)
      expect(screen.queryAllByRole("textbox")).toHaveLength(0)
      expect(screen.queryAllByRole("spinbutton")).toHaveLength(0)
      expect(screen.queryByRole("button", { name: /calificar|calificación/i })).toBeNull()
      expect(screen.queryByText(/Podrás calificar/)).toBeNull()
      expect(screen.queryByText(/la entrega ya está cerrada/)).toBeNull()
    },
  )

  it("CAL-T-90: una calificación cuyos criterios ya no son los de la rúbrica de la tarea (otros ids) no rompe: el admin lee el desglose guardado y el maestro ve el formulario vacío para actualizar", async () => {
    const guardada = calificacionDoble({
      puntajes: [
        { criterioId: CRITERIO_VIEJO_1, criterio: "Argumento", puntosMax: 6, puntos: 5 },
        { criterioId: CRITERIO_VIEJO_2, criterio: "Fuentes", puntosMax: 4, puntos: 3.5 },
      ],
    })
    servidor.entrega = () =>
      respuestaJson(200, {
        entrega: entregaDoble({ estado: "calificado", version: 7, calificacion: guardada }),
      })
    const admin = renderVista("admin")
    expect(await screen.findByText("Argumento: 5 de 6")).toBeInTheDocument()
    expect(screen.getByText("Fuentes: 3.5 de 4")).toBeInTheDocument()
    expect(screen.getByText("Calificación: 8.5 de 10")).toBeInTheDocument()
    await sinPeticionesEnVuelo(admin)
    cleanup()

    const maestro = renderVista("maestro")
    await screen.findByLabelText(CLARIDAD)
    await sinPeticionesEnVuelo(maestro)
    expect(campo(CLARIDAD)).toHaveValue("")
    expect(campo(ORTOGRAFIA)).toHaveValue("")
    expect(botonActualizar()).toBeInTheDocument()
    expect(screen.getAllByText("Calificado")).toHaveLength(1)
  })
})

describe("ataque 01c r1 · la recarga tras un 409 reemplaza la vista con la tarea en 5xx", () => {
  it.each([
    ["RUBRICA_MODIFICADA", MENSAJE_RUBRICA],
    ["ENTREGA_NO_CALIFICABLE", MENSAJE_NO_CALIFICABLE],
  ] as const)(
    "CAL-T-91: %s, la tarea responde 5xx y la entrega 404 ALUMNO_NO_ENCONTRADO: la vista se reemplaza y el único aviso es el del 409 (§D-14: «Solo el del 409»), sin decir que se muestra la última versión",
    async (codigo, mensaje) => {
      servidor.calificar = [() => errorApi(409, codigo, mensaje)]
      const cliente = renderVista()
      await screen.findByLabelText(CLARIDAD)
      await sinPeticionesEnVuelo(cliente)
      escribir(CLARIDAD, "4")
      escribir(ORTOGRAFIA, "3")
      servidor.tarea = () => errorApi(500, "ERROR_INTERNO", "falló")
      servidor.entrega = () => errorApi(404, "ALUMNO_NO_ENCONTRADO", "x")

      pulsar(botonCalificar())

      await screen.findByText("No encontramos a ese alumno en esta clase.")
      await sinPeticionesEnVuelo(cliente)
      expect(fueraDeBody()).toHaveTextContent("No encontramos a ese alumno en esta clase.")
      expect(aviso.error.mock.calls.map((llamada) => llamada[0])).toEqual([mensaje])
    },
  )
})
