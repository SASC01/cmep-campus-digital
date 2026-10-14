import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { EntregaDeAlumnoView } from "./entrega-de-alumno-view"

// Ataque (CALIFICACIONES-01c, ronda 2): el remedio de T-02 y sus vecinos. Un 400 VALIDACION de
// calificar con cada forma de prefijo (pintable, no pintable, de otro campo, sin prefijo), con y sin
// rúbrica: un solo anuncio (el campo marcado o un aviso, nunca los dos ni ninguno), el aviso sin el
// prefijo técnico, el botón fuera de la espera, lo escrito conservado y un aviso por intento. Reloj
// fijo (solo Date). El servidor es un doble en memoria.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ALUMNO_ID = "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0301"
const CRITERIO_1 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d81"
const CRITERIO_2 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d82"
const RUTA_TAREA = `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const RUTA_ALUMNO = `${RUTA_TAREA}/entregas/${ALUMNO_ID}`
const RUTA_CALIFICACION = `${RUTA_ALUMNO}/calificacion`
const CLARIDAD = "Claridad (de 5 puntos)"
const ORTOGRAFIA = "Ortografía (de 4 puntos)"
const CALIFICACION = "Calificación (de 10 puntos)"
const COMENTARIO = "Comentario para el alumno (opcional)"
const MENSAJE = "Revisa este valor."

const RUBRICA = [
  { id: CRITERIO_1, criterio: "Claridad", puntosMax: 5 },
  { id: CRITERIO_2, criterio: "Ortografía", puntosMax: 4 },
]

const tareaDoble = (rubrica: readonly unknown[]) => ({
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
    rubrica,
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
  },
})

const entregaDoble = () => ({
  alumno: { id: ALUMNO_ID, nombre: "Ana Ruiz" },
  estado: "entregado",
  fechaEntrega: "2030-01-09T15:30:00.000Z",
  conRetraso: false,
  enlaces: [],
  adjuntos: [],
  version: 2,
  calificacion: null,
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
}

let rubricaDelServidor: readonly unknown[] = RUBRICA
let calificar: () => Response = () => errorApi(500, "ERROR_INTERNO")
let llamadas: Llamada[] = []
let inesperadas: string[] = []

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  llamadas = []
  inesperadas = []
  rubricaDelServidor = RUBRICA
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      llamadas.push({ metodo, url })
      if (metodo === "GET" && url === RUTA_TAREA) {
        return Promise.resolve(respuestaJson(200, tareaDoble(rubricaDelServidor)))
      }
      if (metodo === "GET" && url === RUTA_ALUMNO) {
        return Promise.resolve(respuestaJson(200, { entrega: entregaDoble() }))
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
  await screen.findByLabelText(COMENTARIO)
  await sinPeticionesEnVuelo(cliente)
  return cliente
}

const sinPeticionesEnVuelo = async (cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isFetching() + cliente.isMutating()).toBe(0))
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const escribir = (nombre: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(nombre), { target: { value: valor } })

const boton = () => screen.getByRole("button", { name: "Calificar y devolver" })

const deCalificar = () => llamadas.filter((l) => l.metodo === "PUT" && l.url === RUTA_CALIFICACION)

const enviar = async (cliente: QueryClient) => {
  const antes = deCalificar().length
  vi.setSystemTime(new Date(Date.now() + 5_000))
  boton().focus()
  fireEvent.click(boton())
  await waitFor(() => expect(deCalificar()).toHaveLength(antes + 1))
  await sinPeticionesEnVuelo(cliente)
}

const avisos = () => aviso.error.mock.calls.map((llamada) => llamada[0] as unknown)
const marcados = () =>
  Array.from(document.querySelectorAll('[aria-invalid="true"]')).map(
    (elemento) => elemento.getAttribute("name") ?? "",
  )

// Lo que se escribe en cada formulario antes de enviar, y cómo comprobar que se conservó.
const llenar = (conRubrica: boolean) => {
  if (conRubrica) {
    escribir(CLARIDAD, "4")
    escribir(ORTOGRAFIA, "3")
  } else {
    escribir(CALIFICACION, "7")
  }
  escribir(COMENTARIO, "Buen trabajo")
}

const conservado = (conRubrica: boolean) => {
  if (conRubrica) {
    expect(screen.getByLabelText(CLARIDAD)).toHaveValue("4")
    expect(screen.getByLabelText(ORTOGRAFIA)).toHaveValue("3")
  } else {
    expect(screen.getByLabelText(CALIFICACION)).toHaveValue("7")
  }
  expect(screen.getByLabelText(COMENTARIO)).toHaveValue("Buen trabajo")
  expect(boton()).not.toHaveAttribute("aria-busy", "true")
  expect(boton()).not.toHaveAttribute("aria-disabled", "true")
}

describe("ataque 01c r2 · 400 de un campo que el panel sí tiene (T-02)", () => {
  const casos = [
    ["con rúbrica", RUBRICA, `puntajes.0.puntos: ${MENSAJE}`, `puntajes.${CRITERIO_1}`, CLARIDAD],
    ["con rúbrica", RUBRICA, `puntajes.1.puntos:${MENSAJE}`, `puntajes.${CRITERIO_2}`, ORTOGRAFIA],
    ["con rúbrica", RUBRICA, `comentario: ${MENSAJE}`, "comentario", COMENTARIO],
    ["sin rúbrica", [], `calificacion: ${MENSAJE}`, "calificacion", CALIFICACION],
    ["sin rúbrica", [], `comentario: ${MENSAJE}`, "comentario", COMENTARIO],
  ] as const

  it.each(casos)(
    "CAL-T-111: %s, «%s» se marca solo bajo su campo, sin aviso, con el foco en él, lo escrito sigue y el botón sale de la espera; el mismo error otra vez se vuelve a marcar sin aviso",
    async (_rubrica, rubrica, mensaje, nombre, etiqueta) => {
      rubricaDelServidor = rubrica
      calificar = () => errorApi(400, "VALIDACION", mensaje)
      const cliente = await renderVista()
      const conRubrica = rubrica.length > 0
      llenar(conRubrica)

      await enviar(cliente)

      expect(avisos()).toEqual([])
      expect(marcados()).toEqual([nombre])
      expect(screen.getByLabelText(etiqueta)).toHaveFocus()
      expect(screen.getByLabelText(etiqueta)).toHaveAccessibleDescription(
        expect.stringContaining(MENSAJE) as string,
      )
      expect(screen.getAllByText(MENSAJE)).toHaveLength(1)
      conservado(conRubrica)

      await enviar(cliente)

      expect(avisos()).toEqual([])
      expect(marcados()).toEqual([nombre])
      expect(screen.getAllByText(MENSAJE)).toHaveLength(1)
      conservado(conRubrica)
      expect(inesperadas).toEqual([])
    },
  )
})

describe("ataque 01c r2 · 400 de un campo de calificar que el panel no tiene (T-02)", () => {
  const casos = [
    ["con rúbrica", RUBRICA, `puntajes.2.puntos: ${MENSAJE}`],
    ["con rúbrica", RUBRICA, `puntajes.99999999999999999999.puntos: ${MENSAJE}`],
    ["con rúbrica", RUBRICA, `calificacion: ${MENSAJE}`],
    ["sin rúbrica", [], `puntajes.0.puntos: ${MENSAJE}`],
  ] as const

  it.each(casos)(
    "CAL-T-112: %s, «%s» da un solo aviso con el mensaje sin el prefijo, ningún campo marcado, lo escrito sigue, el botón sale de la espera con el foco; un segundo intento igual da un segundo aviso",
    async (_rubrica, rubrica, mensaje) => {
      rubricaDelServidor = rubrica
      calificar = () => errorApi(400, "VALIDACION", mensaje)
      const cliente = await renderVista()
      const conRubrica = rubrica.length > 0
      llenar(conRubrica)

      await enviar(cliente)

      expect(avisos()).toEqual([MENSAJE])
      expect(marcados()).toEqual([])
      expect(screen.queryByText(MENSAJE)).not.toBeInTheDocument()
      expect(boton()).toHaveFocus()
      conservado(conRubrica)

      await enviar(cliente)

      expect(avisos()).toEqual([MENSAJE, MENSAJE])
      expect(marcados()).toEqual([])
      conservado(conRubrica)
      expect(inesperadas).toEqual([])
    },
  )
})

describe("ataque 01c r2 · 400 VALIDACION que no es de un campo de calificar (vecinos de T-02)", () => {
  // Los prefijos que el esquema de calificar puede producir en el servidor
  // (validarCuerpo: la ruta de la primera incidencia unida con puntos), y el mensaje sin prefijo.
  const casos = [
    `version: ${MENSAJE}`,
    `puntosDeLaTarea: ${MENSAJE}`,
    `puntajes: ${MENSAJE}`,
    `cuerpo: ${MENSAJE}`,
    MENSAJE,
    `puntajes.0.criterioId: ${MENSAJE}`,
    `puntajes.1.criterioId: ${MENSAJE}`,
    `puntajes.0: ${MENSAJE}`,
  ] as const

  it.each(casos)(
    "CAL-T-113: «%s» da exactamente un aviso, con el mensaje sin el nombre técnico del campo, y ningún campo marcado",
    async (mensaje) => {
      calificar = () => errorApi(400, "VALIDACION", mensaje)
      const cliente = await renderVista()
      llenar(true)

      await enviar(cliente)

      expect(avisos()).toEqual([MENSAJE])
      expect(marcados()).toEqual([])
      conservado(true)
      expect(inesperadas).toEqual([])
    },
  )

  // Posiciones que zod nunca produce (negativa, no numérica, decimal): igual, un aviso limpio.
  it.each([
    `puntajes.-1.puntos: ${MENSAJE}`,
    `puntajes.x.puntos: ${MENSAJE}`,
    `puntajes.1.5.puntos: ${MENSAJE}`,
  ] as const)(
    "CAL-T-114: «%s» (una posición imposible) da exactamente un aviso sin prefijo técnico y ningún campo marcado",
    async (mensaje) => {
      calificar = () => errorApi(400, "VALIDACION", mensaje)
      const cliente = await renderVista()
      llenar(true)

      await enviar(cliente)

      expect(avisos()).toHaveLength(1)
      expect(avisos()[0]).not.toMatch(/^puntajes/)
      expect(marcados()).toEqual([])
      conservado(true)
    },
  )
})

describe("ataque 01c r2 · un error pintado y después otro sin lugar (T-02)", () => {
  it("CAL-T-115: un 400 de Claridad se marca; al reenviar, un 400 de una posición que no está avisa una vez y quita la marca vieja (no queda un error que ya no describe lo enviado)", async () => {
    const respuestas = [
      () => errorApi(400, "VALIDACION", `puntajes.0.puntos: ${MENSAJE}`),
      () => errorApi(400, "VALIDACION", "puntajes.5.puntos: Otro problema."),
    ]
    let n = 0
    calificar = () => {
      const responder = respuestas[Math.min(n, respuestas.length - 1)]
      n += 1
      if (responder === undefined) throw new Error("Precondición: hay respuesta")
      return responder()
    }
    const cliente = await renderVista()
    llenar(true)
    await enviar(cliente)
    expect(marcados()).toEqual([`puntajes.${CRITERIO_1}`])

    await enviar(cliente)

    expect(avisos()).toEqual(["Otro problema."])
    expect(marcados()).toEqual([])
    expect(screen.queryByText(MENSAJE)).not.toBeInTheDocument()
    conservado(true)
  })

  it("CAL-T-116: un 400 sin lugar seguido de un 500: un aviso por intento, cada uno el suyo, y el botón sale de la espera las dos veces", async () => {
    const respuestas = [
      () => errorApi(400, "VALIDACION", `calificacion: ${MENSAJE}`),
      () => errorApi(500, "ERROR_INTERNO", "boom"),
    ]
    let n = 0
    calificar = () => {
      const responder = respuestas[Math.min(n, respuestas.length - 1)]
      n += 1
      if (responder === undefined) throw new Error("Precondición: hay respuesta")
      return responder()
    }
    const cliente = await renderVista()
    llenar(true)

    await enviar(cliente)
    expect(avisos()).toEqual([MENSAJE])
    conservado(true)

    await enviar(cliente)
    expect(avisos()).toEqual([MENSAJE, "Algo salió mal. Inténtalo de nuevo."])
    conservado(true)
  })
})
