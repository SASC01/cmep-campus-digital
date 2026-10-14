import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { claveGradebook } from "@/services/calificacionesService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveTarea } from "@/services/trabajoService"

import { EntregaDeAlumnoView } from "./entrega-de-alumno-view"
import { EntregasView } from "./entregas-view"
import { aNumeroDePuntos, claveEntregaDeAlumno, claveListaDeEntregas } from "./lib"

// CALIFICACIONES-01c (CAL-1C01 a CAL-1C08 y CAL-1C14): el panel «Calificación» de la entrega de un
// alumno. El maestro califica y recalifica; el admin lee. Reloj fijo en todas (solo Date). El servidor es
// un doble en memoria.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const PASADA = "2030-01-05T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ALUMNO_ID = "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0301"
const CRITERIO_1 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d81"
const CRITERIO_2 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d82"
const CRITERIO_3 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d83"
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
const PODRAS = "Podrás calificar cuando el alumno entregue o cuando se cierre la entrega."
const NOTA_CERRADA = "Este alumno no entregó la tarea y la entrega ya está cerrada."

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

interface Llamada {
  metodo: string
  url: string
  cuerpo: unknown
}

type Respuesta = () => Response | Promise<Response>

interface Servidor {
  tarea: Respuesta
  entrega: Respuesta
  // El n-ésimo PUT de calificar; el último se repite.
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
        return Promise.resolve(respuestaJson(200, { comentarios: [], siguienteCursor: null }))
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
const delHilo = () =>
  llamadas.filter((l) => l.metodo === "GET" && l.url.startsWith(`${RUTA_HILO}?`))

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
const formulario = () => {
  const form = campo("Comentario para el alumno (opcional)").closest("form")
  if (form === null) throw new Error("Precondición: el panel tiene su formulario")
  return form
}

// Como una persona: pasan unos segundos (con el reloj fijo, una recarga en el mismo milisegundo no
// cambiaría dataUpdatedAt), el botón recibe el foco y después el clic.
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

describe("panel con rúbrica (CAL-1C01)", () => {
  it("CAL-1C01: un campo por criterio con su etiqueta, la suma y la calificación escalada en el texto, con punto o coma decimal", async () => {
    renderVista()
    expect(await screen.findByLabelText("Claridad (de 5 puntos)")).toHaveAttribute(
      "inputmode",
      "decimal",
    )
    expect(campo("Ortografía (de 4 puntos)")).toHaveAttribute("autocomplete", "off")
    expect(
      screen.getByText("Suma de la rúbrica: 0 de 9 · Calificación: 0 de 10"),
    ).toBeInTheDocument()

    escribir("Claridad (de 5 puntos)", "4")
    escribir("Ortografía (de 4 puntos)", "3,5")

    expect(
      screen.getByText("Suma de la rúbrica: 7.5 de 9 · Calificación: 8.33 de 10"),
    ).toBeInTheDocument()
    escribir("Ortografía (de 4 puntos)", "3")
    expect(
      screen.getByText("Suma de la rúbrica: 7 de 9 · Calificación: 7.78 de 10"),
    ).toBeInTheDocument()
  })

  it.each([
    ["vacío", "", "Escribe los puntos de este criterio."],
    ["mayor que el máximo", "6", "Escribe de 0 a 5 puntos."],
    ["negativo", "-1", "Escribe de 0 a 5 puntos."],
    ["con 3 decimales", "1.234", "Usa hasta 2 decimales."],
    ["con letras", "cuatro", "Escribe de 0 a 5 puntos."],
  ])(
    "CAL-1C01: validación local (%s): no pide nada, marca el campo con ErrorDeCampo y lleva el foco al primer error",
    async (_caso, valor, mensaje) => {
      const cliente = renderVista()
      await screen.findByLabelText("Claridad (de 5 puntos)")
      escribir("Claridad (de 5 puntos)", valor)
      escribir("Ortografía (de 4 puntos)", "")

      pulsar(botonCalificar())

      expect(deCalificar()).toEqual([])
      const primero = campo("Claridad (de 5 puntos)")
      expect(primero).toHaveFocus()
      expect(primero).toHaveAttribute("aria-invalid", "true")
      const idError = primero.getAttribute("aria-describedby")
      if (idError === null) throw new Error("Precondición: el campo nombra su error")
      expect(document.getElementById(idError)).toHaveTextContent(mensaje)
      expect(campo("Ortografía (de 4 puntos)")).toHaveAttribute("aria-invalid", "true")
      await sinPeticionesEnVuelo(cliente)
      expect(deCalificar()).toEqual([])
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )

  it("CAL-1C01: aNumeroDePuntos acepta punto o coma decimal con hasta 2 decimales y rechaza lo demás sin coaccionar", () => {
    expect(aNumeroDePuntos("8,5")).toBe(8.5)
    expect(aNumeroDePuntos(" 8.5 ")).toBe(8.5)
    expect(aNumeroDePuntos("08.50")).toBe(8.5)
    expect(aNumeroDePuntos("10")).toBe(10)
    for (const texto of ["8.", ".5", "1e1", "Infinity", "-1", "", "8.123", "8,5,1", "0x10"]) {
      expect(aNumeroDePuntos(texto), texto).toBeNaN()
    }
  })

  it("CAL-1C01: el cuerpo es exactamente { version, puntosDeLaTarea, puntajes en orden, calificacion: null, comentario } con la versión, los puntos y la rúbrica de apertura aunque una recarga de fondo traiga otros, y las etiquetas siguen con los de apertura", async () => {
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    escribir("Ortografía (de 4 puntos)", " 3.25 ")
    escribir("Claridad (de 5 puntos)", "4,5")
    escribir("Comentario para el alumno (opcional)", "  Buen trabajo  ")

    servidor.entrega = () => respuestaJson(200, { entrega: entregaDoble({ version: 7 }) })
    servidor.tarea = () =>
      respuestaJson(
        200,
        tareaDoble({
          puntos: 20,
          rubrica: [
            { id: CRITERIO_3, criterio: "Estructura", puntosMax: 10 },
            { id: CRITERIO_2, criterio: "Ortografía", puntosMax: 8 },
          ],
        }),
      )
    await recargarDeFondo(cliente)
    expect(deLaEntrega(), "Precondición: la recarga de fondo llegó").toHaveLength(2)
    expect(deLaTarea()).toHaveLength(2)

    expect(campo("Claridad (de 5 puntos)")).toHaveValue("4,5")
    expect(campo("Ortografía (de 4 puntos)")).toHaveValue(" 3.25 ")
    expect(screen.queryByLabelText("Estructura (de 10 puntos)")).toBeNull()
    expect(
      screen.getByText("Suma de la rúbrica: 7.75 de 9 · Calificación: 8.61 de 10"),
    ).toBeInTheDocument()

    pulsar(botonCalificar())

    await waitFor(() => expect(deCalificar()).toHaveLength(1))
    expect(deCalificar()[0]?.cuerpo).toEqual({
      version: 2,
      puntosDeLaTarea: 10,
      puntajes: [
        { criterioId: CRITERIO_1, puntos: 4.5 },
        { criterioId: CRITERIO_2, puntos: 3.25 },
      ],
      calificacion: null,
      comentario: "Buen trabajo",
    })
  })
})

describe("panel sin rúbrica (CAL-1C02)", () => {
  it("CAL-1C02: un campo «Calificación (de 80 puntos)» y el cuerpo lleva puntajes: [] y la calificación directa, sin comentario si quedó vacío", async () => {
    servidor.tarea = () => respuestaJson(200, tareaDoble({ rubrica: [], puntos: 80 }))
    renderVista()
    await screen.findByLabelText("Calificación (de 80 puntos)")
    escribir("Calificación (de 80 puntos)", "72,5")
    expect(screen.queryByText(/^Suma de la rúbrica/)).toBeNull()
    escribir("Comentario para el alumno (opcional)", "   ")

    pulsar(botonCalificar())

    await waitFor(() => expect(deCalificar()).toHaveLength(1))
    expect(deCalificar()[0]?.cuerpo).toEqual({
      version: 2,
      puntosDeLaTarea: 80,
      puntajes: [],
      calificacion: 72.5,
    })
  })

  it("CAL-1C02: sin rúbrica, vacío o fuera de rango no pide nada y el error va bajo «Calificación»", async () => {
    servidor.tarea = () => respuestaJson(200, tareaDoble({ rubrica: [], puntos: 80 }))
    renderVista()
    await screen.findByLabelText("Calificación (de 80 puntos)")

    pulsar(botonCalificar())
    expect(campo("Calificación (de 80 puntos)")).toHaveFocus()
    expect(screen.getByText("Escribe la calificación.")).toBeInTheDocument()

    escribir("Calificación (de 80 puntos)", "80.5")
    pulsar(botonCalificar())
    expect(screen.getByText("Escribe de 0 a 80 puntos.")).toBeInTheDocument()
    expect(deCalificar()).toEqual([])
  })
})

describe("éxito (CAL-1C03)", () => {
  it("CAL-1C03: un aviso «Calificación publicada», la entrega en caché es la respuesta, se marcan viejas la lista de entregas, el prefijo de calificaciones y el hilo (con comentario); el panel se reinicia con lo guardado, «Actualizar calificación» y el foco en el h3", async () => {
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    cliente.setQueryData(claveListaDeEntregas(CLASE_ID, TAREA_ID), { pages: [], pageParams: [] })
    cliente.setQueryData(claveGradebook(CLASE_ID, { cursor: null, cursorTareas: null }), {})
    await waitFor(() => expect(delHilo()).toHaveLength(1))
    escribir("Claridad (de 5 puntos)", "4.5")
    escribir("Ortografía (de 4 puntos)", "3.25")
    escribir("Comentario para el alumno (opcional)", "Buen trabajo")

    pulsar(botonCalificar())

    expect(
      await screen.findByRole("button", { name: "Actualizar calificación" }),
    ).toBeInTheDocument()
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.success).toHaveBeenCalledTimes(1)
    expect(aviso.success).toHaveBeenCalledWith("Calificación publicada")
    expect(aviso.error).not.toHaveBeenCalled()
    expect(cliente.getQueryData(claveEntregaDeAlumno(CLASE_ID, TAREA_ID, ALUMNO_ID))).toEqual({
      entrega: entregaDoble({
        estado: "calificado",
        version: 3,
        calificacion: calificacionDoble(),
      }),
    })
    expect(cliente.getQueryState(claveListaDeEntregas(CLASE_ID, TAREA_ID))?.isInvalidated).toBe(
      true,
    )
    expect(
      cliente.getQueryState(claveGradebook(CLASE_ID, { cursor: null, cursorTareas: null }))
        ?.isInvalidated,
    ).toBe(true)
    expect(delHilo()).toHaveLength(2)
    expect(deLaEntrega()).toHaveLength(1)
    expect(campo("Claridad (de 5 puntos)")).toHaveValue("4.5")
    expect(campo("Ortografía (de 4 puntos)")).toHaveValue("3.25")
    expect(campo("Comentario para el alumno (opcional)")).toHaveValue("")
    expect(encabezado()).toHaveFocus()
  })

  it("CAL-1C03: sin comentario el hilo no se marca viejo; recalificar avisa «Calificación actualizada» y envía la versión nueva", async () => {
    servidor.entrega = () =>
      respuestaJson(200, {
        entrega: entregaDoble({
          estado: "calificado",
          version: 3,
          calificacion: calificacionDoble(),
        }),
      })
    servidor.calificar = [() => calificadaEn(4), () => calificadaEn(5)]
    const cliente = renderVista()
    expect(await screen.findByLabelText("Claridad (de 5 puntos)")).toHaveValue("4.5")
    await waitFor(() => expect(delHilo()).toHaveLength(1))
    escribir("Claridad (de 5 puntos)", "5")

    pulsar(botonActualizar())

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Calificación actualizada"))
    await sinPeticionesEnVuelo(cliente)
    expect(delHilo()).toHaveLength(1)
    expect(deCalificar()[0]?.cuerpo).not.toHaveProperty("comentario")
    expect(encabezado()).toHaveFocus()

    pulsar(botonActualizar())

    await waitFor(() => expect(deCalificar()).toHaveLength(2))
    expect(deCalificar()[1]?.cuerpo).toMatchObject({ version: 4 })
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.success).toHaveBeenCalledTimes(2)
  })
})

describe("409 ENTREGA_MODIFICADA y sus estados vecinos (CAL-1C04)", () => {
  it("CAL-1C04: un aviso con el mensaje del servidor, exactamente un GET de la entrega, en espera sin disabled durante la recarga y ningún PUT más con clics o Enter; al llegar, lo escrito se descartó, el panel muestra lo guardado, el foco está en el h3 y el siguiente guardado envía la versión nueva", async () => {
    const enVuelo = diferida()
    servidor.calificar = [
      () => errorApi(409, "ENTREGA_MODIFICADA", MENSAJE_MODIFICADA),
      () => calificadaEn(6),
    ]
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    escribir("Claridad (de 5 puntos)", "1")
    escribir("Ortografía (de 4 puntos)", "1")
    escribir("Comentario para el alumno (opcional)", "Lo que escribí")
    servidor.entrega = () => enVuelo.promesa

    pulsar(botonCalificar())

    await waitFor(() => expect(deLaEntrega()).toHaveLength(2))
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(aviso.error).toHaveBeenCalledWith(MENSAJE_MODIFICADA)
    expect(botonCalificar()).toHaveAttribute("aria-busy", "true")
    expect(botonCalificar()).not.toHaveAttribute("disabled")
    fireEvent.click(botonCalificar())
    fireEvent.submit(formulario())
    expect(deCalificar()).toHaveLength(1)

    enVuelo.resolver(
      respuestaJson(200, {
        entrega: entregaDoble({
          estado: "calificado",
          version: 5,
          calificacion: calificacionDoble({
            puntos: 6,
            puntajes: [
              { criterioId: CRITERIO_1, criterio: "Claridad", puntosMax: 5, puntos: 3 },
              { criterioId: CRITERIO_2, criterio: "Ortografía", puntosMax: 4, puntos: 2.4 },
            ],
          }),
        }),
      }),
    )

    expect(
      await screen.findByRole("button", { name: "Actualizar calificación" }),
    ).toBeInTheDocument()
    expect(campo("Claridad (de 5 puntos)")).toHaveValue("3")
    expect(campo("Ortografía (de 4 puntos)")).toHaveValue("2.4")
    expect(campo("Comentario para el alumno (opcional)")).toHaveValue("")
    expect(encabezado()).toHaveFocus()
    await sinPeticionesEnVuelo(cliente)
    expect(deLaEntrega()).toHaveLength(2)
    expect(deLaTarea()).toHaveLength(1)
    expect(aviso.error).toHaveBeenCalledTimes(1)

    pulsar(botonActualizar())

    await waitFor(() => expect(deCalificar()).toHaveLength(2))
    expect(deCalificar()[1]?.cuerpo).toMatchObject({ version: 5 })
  })

  it("CAL-1C04 (vecino): un segundo 409 seguido vuelve a avisar, recarga una vez más, reinicia con la versión siguiente y el foco vuelve al h3", async () => {
    let version = 2
    servidor.entrega = () => respuestaJson(200, { entrega: entregaDoble({ version }) })
    servidor.calificar = [
      () => errorApi(409, "ENTREGA_MODIFICADA", MENSAJE_MODIFICADA),
      () => errorApi(409, "ENTREGA_MODIFICADA", MENSAJE_MODIFICADA),
      () => calificadaEn(9),
    ]
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    for (const siguiente of [3, 4]) {
      escribir("Claridad (de 5 puntos)", "2")
      escribir("Ortografía (de 4 puntos)", "2")
      version = siguiente
      pulsar(botonCalificar())
      await waitFor(() => expect(encabezado()).toHaveFocus())
      await sinPeticionesEnVuelo(cliente)
      expect(campo("Claridad (de 5 puntos)")).toHaveValue("")
    }
    expect(aviso.error).toHaveBeenCalledTimes(2)
    expect(deLaEntrega()).toHaveLength(3)
    expect(deCalificar().map((l) => (l.cuerpo as { version: number }).version)).toEqual([2, 3])

    escribir("Claridad (de 5 puntos)", "2")
    escribir("Ortografía (de 4 puntos)", "2")
    pulsar(botonCalificar())
    await waitFor(() => expect(deCalificar()).toHaveLength(3))
    expect(deCalificar()[2]?.cuerpo).toMatchObject({ version: 4 })
  })

  it("CAL-1C04 (vecino): si la recarga falla con 5xx, dos avisos en total, lo escrito y la versión se conservan, el botón sale de la espera y el foco no está en <body>", async () => {
    servidor.calificar = [() => errorApi(409, "ENTREGA_MODIFICADA", MENSAJE_MODIFICADA)]
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    escribir("Claridad (de 5 puntos)", "1")
    escribir("Ortografía (de 4 puntos)", "1")
    escribir("Comentario para el alumno (opcional)", "Lo que escribí")
    servidor.entrega = () => errorApi(500, "ERROR_INTERNO", "falla")

    pulsar(botonCalificar())

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.error.mock.calls).toEqual([[MENSAJE_MODIFICADA], [AVISO_RECARGA]])
    expect(campo("Claridad (de 5 puntos)")).toHaveValue("1")
    expect(campo("Comentario para el alumno (opcional)")).toHaveValue("Lo que escribí")
    expect(botonCalificar()).not.toHaveAttribute("aria-busy")
    expect(fueraDeBody()).toBe(botonCalificar())

    pulsar(botonCalificar())
    await waitFor(() => expect(deCalificar()).toHaveLength(2))
    expect(deCalificar()[1]?.cuerpo).toMatchObject({ version: 2 })
  })

  it("CAL-1C04 (vecino): si la recarga trae un 404 del alumno, la vista se reemplaza por su mensaje, solo hay el aviso del 409 y el foco va a la raíz", async () => {
    servidor.calificar = [() => errorApi(409, "ENTREGA_MODIFICADA", MENSAJE_MODIFICADA)]
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    escribir("Claridad (de 5 puntos)", "1")
    escribir("Ortografía (de 4 puntos)", "1")
    servidor.entrega = () => errorApi(404, "ALUMNO_NO_ENCONTRADO", "x")

    pulsar(botonCalificar())

    expect(
      await screen.findByText("No encontramos a ese alumno en esta clase."),
    ).toBeInTheDocument()
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.error.mock.calls).toEqual([[MENSAJE_MODIFICADA]])
    const activo = fueraDeBody()
    expect(activo).toHaveAttribute("tabindex", "-1")
    expect(activo).toHaveTextContent("No encontramos a ese alumno en esta clase.")
  })

  it("CAL-1C04 (vecino): «Volver a las entregas» durante la recarga navega sin errores en la consola ni avisos de más", async () => {
    const consola = vi.spyOn(console, "error")
    const enVuelo = diferida()
    servidor.calificar = [() => errorApi(409, "ENTREGA_MODIFICADA", MENSAJE_MODIFICADA)]
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    escribir("Claridad (de 5 puntos)", "1")
    escribir("Ortografía (de 4 puntos)", "1")
    servidor.entrega = () => enVuelo.promesa

    pulsar(botonCalificar())
    await waitFor(() => expect(deLaEntrega()).toHaveLength(2))
    fireEvent.click(screen.getByRole("link", { name: "Volver a las entregas" }))
    expect(await screen.findByText("Lista de entregas de prueba")).toBeInTheDocument()

    enVuelo.resolver(errorApi(500, "ERROR_INTERNO", "falla"))
    await sinPeticionesEnVuelo(cliente)
    expect(consola).not.toHaveBeenCalled()
    expect(aviso.error.mock.calls).toEqual([[MENSAJE_MODIFICADA]])
  })
})

describe("409 RUBRICA_MODIFICADA (CAL-1C05)", () => {
  it("CAL-1C05: un GET de la tarea y uno de la entrega; el panel se reinicia con los criterios nuevos", async () => {
    servidor.calificar = [() => errorApi(409, "RUBRICA_MODIFICADA", MENSAJE_RUBRICA)]
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    escribir("Claridad (de 5 puntos)", "1")
    escribir("Ortografía (de 4 puntos)", "1")
    servidor.tarea = () =>
      respuestaJson(
        200,
        tareaDoble({ rubrica: [{ id: CRITERIO_3, criterio: "Estructura", puntosMax: 10 }] }),
      )

    pulsar(botonCalificar())

    expect(await screen.findByLabelText("Estructura (de 10 puntos)")).toHaveValue("")
    await sinPeticionesEnVuelo(cliente)
    expect(deLaTarea()).toHaveLength(2)
    expect(deLaEntrega()).toHaveLength(2)
    expect(screen.queryByLabelText("Claridad (de 5 puntos)")).toBeNull()
    expect(aviso.error.mock.calls).toEqual([[MENSAJE_RUBRICA]])
    expect(encabezado()).toHaveFocus()
  })

  it("CAL-1C05: en una tarea sin rúbrica cuyos puntos subieron de 10 a 100, el panel se reinicia con «Calificación (de 100 puntos)» y el cuerpo siguiente lleva puntosDeLaTarea: 100", async () => {
    servidor.tarea = () => respuestaJson(200, tareaDoble({ rubrica: [], puntos: 10 }))
    servidor.calificar = [
      () => errorApi(409, "RUBRICA_MODIFICADA", MENSAJE_RUBRICA),
      () => calificadaEn(3),
    ]
    const cliente = renderVista()
    await screen.findByLabelText("Calificación (de 10 puntos)")
    escribir("Calificación (de 10 puntos)", "9")
    servidor.tarea = () => respuestaJson(200, tareaDoble({ rubrica: [], puntos: 100 }))

    pulsar(botonCalificar())

    expect(await screen.findByLabelText("Calificación (de 100 puntos)")).toHaveValue("")
    await sinPeticionesEnVuelo(cliente)
    expect(deLaTarea()).toHaveLength(2)
    expect(deLaEntrega()).toHaveLength(2)
    escribir("Calificación (de 100 puntos)", "90")
    pulsar(botonCalificar())
    await waitFor(() => expect(deCalificar()).toHaveLength(2))
    expect(deCalificar()[0]?.cuerpo).toMatchObject({ puntosDeLaTarea: 10, calificacion: 9 })
    expect(deCalificar()[1]?.cuerpo).toMatchObject({ puntosDeLaTarea: 100, calificacion: 90 })
  })

  it("CAL-1C05 (vecino): si la recarga de la tarea falla con 5xx, el aviso es el de la recarga fallida de la tarea (uno), nada se reinicia y lo escrito y los puntos de apertura se conservan", async () => {
    servidor.calificar = [() => errorApi(409, "RUBRICA_MODIFICADA", MENSAJE_RUBRICA)]
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    escribir("Claridad (de 5 puntos)", "1")
    escribir("Ortografía (de 4 puntos)", "2")
    servidor.tarea = () => errorApi(500, "ERROR_INTERNO", "falla")

    pulsar(botonCalificar())

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.error.mock.calls).toEqual([
      [MENSAJE_RUBRICA],
      ["No pudimos actualizar la tarea. Mostramos la última versión que tenemos."],
    ])
    expect(campo("Claridad (de 5 puntos)")).toHaveValue("1")
    expect(campo("Ortografía (de 4 puntos)")).toHaveValue("2")
    expect(botonCalificar()).not.toHaveAttribute("aria-busy")
    expect(fueraDeBody()).toBe(botonCalificar())
  })
})

describe("ENTREGA_NO_CALIFICABLE, errores de campo y del servidor (CAL-1C06)", () => {
  it("CAL-1C06: 409 ENTREGA_NO_CALIFICABLE pide la tarea y la entrega a la vez (N-11); el panel se reinicia con la frase y el foco queda en el h3", async () => {
    servidor.tarea = () =>
      respuestaJson(200, tareaDoble({ fechaLimite: PASADA, aceptaTardias: false }))
    servidor.entrega = () =>
      respuestaJson(200, {
        entrega: entregaDoble({ estado: "asignado", fechaEntrega: null, version: 0 }),
      })
    servidor.calificar = [() => errorApi(409, "ENTREGA_NO_CALIFICABLE", MENSAJE_NO_CALIFICABLE)]
    const cliente = renderVista()
    expect(await screen.findByText(NOTA_CERRADA)).toBeInTheDocument()
    escribir("Claridad (de 5 puntos)", "0")
    escribir("Ortografía (de 4 puntos)", "0")
    servidor.tarea = () =>
      respuestaJson(200, tareaDoble({ fechaLimite: PASADA, aceptaTardias: true }))

    pulsar(botonCalificar())

    expect(await screen.findByText(PODRAS)).toBeInTheDocument()
    await sinPeticionesEnVuelo(cliente)
    expect(deLaTarea()).toHaveLength(2)
    expect(deLaEntrega()).toHaveLength(2)
    expect(screen.queryByRole("button", { name: "Calificar y devolver" })).toBeNull()
    expect(screen.queryByText(NOTA_CERRADA)).toBeNull()
    expect(encabezado()).toHaveFocus()
    expect(aviso.error.mock.calls).toEqual([[MENSAJE_NO_CALIFICABLE]])
  })

  it("CAL-1C06: un 400 de un campo pinta ErrorDeCampo en ese criterio, sin aviso, con el foco en ese campo", async () => {
    servidor.calificar = [
      () => errorApi(400, "VALIDACION", "puntajes.1.puntos: Escribe de 0 a 4 puntos."),
    ]
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    escribir("Claridad (de 5 puntos)", "1")
    escribir("Ortografía (de 4 puntos)", "1")

    pulsar(botonCalificar())

    await waitFor(() => expect(campo("Ortografía (de 4 puntos)")).toHaveFocus())
    await sinPeticionesEnVuelo(cliente)
    const ortografia = campo("Ortografía (de 4 puntos)")
    expect(ortografia).toHaveAttribute("aria-invalid", "true")
    expect(ortografia).toHaveAccessibleDescription("Escribe de 0 a 4 puntos.")
    expect(campo("Claridad (de 5 puntos)")).toHaveAttribute("aria-invalid", "false")
    expect(aviso.error).not.toHaveBeenCalled()
    expect(deLaEntrega()).toHaveLength(1)
  })

  it.each([
    [
      "503 SERVICIO_OCUPADO",
      () =>
        errorApi(
          503,
          "SERVICIO_OCUPADO",
          "El servicio está ocupado. Inténtalo de nuevo en un momento.",
        ),
      "El servicio está ocupado. Inténtalo de nuevo en un momento.",
    ],
    [
      "sin conexión",
      () => Promise.reject(new TypeError("Failed to fetch")),
      "Algo salió mal. Inténtalo de nuevo.",
    ],
  ] as const)(
    "CAL-1C06: %s da un aviso, lo escrito se conserva y el botón vuelve a estar disponible",
    async (_caso, respuesta, mensaje) => {
      servidor.calificar = [respuesta]
      const cliente = renderVista()
      await screen.findByLabelText("Claridad (de 5 puntos)")
      escribir("Claridad (de 5 puntos)", "1")
      escribir("Ortografía (de 4 puntos)", "2")

      pulsar(botonCalificar())

      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
      await sinPeticionesEnVuelo(cliente)
      expect(aviso.error).toHaveBeenCalledWith(mensaje)
      expect(campo("Claridad (de 5 puntos)")).toHaveValue("1")
      expect(campo("Ortografía (de 4 puntos)")).toHaveValue("2")
      expect(botonCalificar()).not.toHaveAttribute("aria-busy")
      expect(deLaEntrega()).toHaveLength(1)
      expect(fueraDeBody()).toBe(botonCalificar())
    },
  )

  it("CAL-1C06: un 404 del alumno da un aviso y la vista se reemplaza", async () => {
    servidor.calificar = [() => errorApi(404, "ALUMNO_NO_ENCONTRADO", "x")]
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    escribir("Claridad (de 5 puntos)", "1")
    escribir("Ortografía (de 4 puntos)", "2")
    servidor.entrega = () => errorApi(404, "ALUMNO_NO_ENCONTRADO", "x")

    pulsar(botonCalificar())

    expect(
      await screen.findByText("No encontramos a ese alumno en esta clase."),
    ).toBeInTheDocument()
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.error.mock.calls).toEqual([["No encontramos a ese alumno en esta clase."]])
    expect(screen.queryByRole("heading", { name: "Calificación" })).toBeNull()
    expect(fueraDeBody()).toHaveAttribute("tabindex", "-1")
  })

  it("CAL-1C06 (vecino): un 404 de la tarea al calificar da un aviso y la vista dice «Esa tarea ya no existe.»", async () => {
    servidor.calificar = [() => errorApi(404, "TAREA_NO_ENCONTRADA", "x")]
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    escribir("Claridad (de 5 puntos)", "1")
    escribir("Ortografía (de 4 puntos)", "2")
    servidor.tarea = () => errorApi(404, "TAREA_NO_ENCONTRADA", "x")

    pulsar(botonCalificar())

    expect(await screen.findByText("Esa tarea ya no existe.")).toBeInTheDocument()
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.error.mock.calls).toEqual([["Esa tarea ya no existe."]])
    expect(fueraDeBody()).toHaveAttribute("tabindex", "-1")
  })

  it("CAL-1C06 (vecino): con un error con que apiClient redirige (403 ACCESO_RESTRINGIDO) no hay aviso ni recarga", async () => {
    const asignar = vi.fn()
    vi.stubGlobal("location", { ...window.location, assign: asignar })
    servidor.calificar = [() => errorApi(403, "ACCESO_RESTRINGIDO", "x")]
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    escribir("Claridad (de 5 puntos)", "1")
    escribir("Ortografía (de 4 puntos)", "2")

    pulsar(botonCalificar())

    await waitFor(() => expect(asignar).toHaveBeenCalledWith("/acceso-restringido"))
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(aviso.success).not.toHaveBeenCalled()
    expect(deLaEntrega()).toHaveLength(1)
    expect(deLaTarea()).toHaveLength(1)
  })
})

// Ronda 1 de 01c (T-02): un 400 VALIDACION nunca se pierde. Si el panel tiene el campo, lo pinta sin
// aviso; si no lo tiene, un solo aviso con el mensaje del servidor (sin el prefijo), sin reiniciar el
// panel ni perder lo escrito, y el botón vuelve a estar disponible.
describe("400 VALIDACION de un campo que el panel no tiene (CAL-1C06b)", () => {
  it.each([
    [
      "puntajes.<i>.puntos fuera de la rúbrica enviada",
      "puntajes.7.puntos: Escribe de 0 a 5 puntos.",
      "Escribe de 0 a 5 puntos.",
    ],
    [
      "calificacion en una tarea con rúbrica",
      "calificacion: Escribe de 0 a 10 puntos.",
      "Escribe de 0 a 10 puntos.",
    ],
    [
      "un VALIDACION sin prefijo de un campo del panel",
      "version: Falta la versión de la entrega",
      "Falta la versión de la entrega",
    ],
  ] as const)(
    "CAL-1C06b: %s da un solo aviso con el mensaje del servidor, ningún ErrorDeCampo, lo escrito se conserva sin reinicio y el botón vuelve a estar disponible con el foco",
    async (_caso, mensajeDelServidor, avisado) => {
      servidor.calificar = [() => errorApi(400, "VALIDACION", mensajeDelServidor)]
      const cliente = renderVista()
      await screen.findByLabelText("Claridad (de 5 puntos)")
      escribir("Claridad (de 5 puntos)", "4")
      escribir("Ortografía (de 4 puntos)", "3")
      escribir("Comentario para el alumno (opcional)", "Bien")

      pulsar(botonCalificar())

      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
      await sinPeticionesEnVuelo(cliente)
      expect(aviso.error.mock.calls).toEqual([[avisado]])
      for (const caja of screen.getAllByRole("textbox")) {
        expect(caja).not.toHaveAttribute("aria-invalid", "true")
      }
      expect(campo("Claridad (de 5 puntos)")).toHaveValue("4")
      expect(campo("Ortografía (de 4 puntos)")).toHaveValue("3")
      expect(campo("Comentario para el alumno (opcional)")).toHaveValue("Bien")
      expect(botonCalificar()).not.toHaveAttribute("aria-busy")
      expect(fueraDeBody()).toBe(botonCalificar())
      expect(deLaEntrega()).toHaveLength(1)
      expect(deLaTarea()).toHaveLength(1)
    },
  )

  it("CAL-1C06b (vecino): un 400 «comentario: …» sin comentario escrito se pinta bajo el comentario, sin aviso", async () => {
    servidor.calificar = [() => errorApi(400, "VALIDACION", "comentario: Escribe tu comentario")]
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    escribir("Claridad (de 5 puntos)", "4")
    escribir("Ortografía (de 4 puntos)", "3")

    pulsar(botonCalificar())

    await waitFor(() => expect(campo("Comentario para el alumno (opcional)")).toHaveFocus())
    await sinPeticionesEnVuelo(cliente)
    expect(campo("Comentario para el alumno (opcional)")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("Escribe tu comentario")).toBeInTheDocument()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1C06b (vecino): un 400 «calificacion: …» en una tarea sin rúbrica se pinta bajo «Calificación», sin aviso", async () => {
    servidor.tarea = () => respuestaJson(200, tareaDoble({ rubrica: [], puntos: 80 }))
    servidor.calificar = [
      () => errorApi(400, "VALIDACION", "calificacion: Escribe de 0 a 80 puntos."),
    ]
    const cliente = renderVista()
    await screen.findByLabelText("Calificación (de 80 puntos)")
    escribir("Calificación (de 80 puntos)", "70")

    pulsar(botonCalificar())

    await waitFor(() => expect(campo("Calificación (de 80 puntos)")).toHaveFocus())
    await sinPeticionesEnVuelo(cliente)
    expect(campo("Calificación (de 80 puntos)")).toHaveAttribute("aria-invalid", "true")
    expect(campo("Calificación (de 80 puntos)")).toHaveAccessibleDescription(
      "Escribe de 0 a 80 puntos.",
    )
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

// Ronda 1 de 01c (T-03): si la entrega reemplaza la vista, la recarga fallida de la tarea no se avisa
// («Mostramos la última versión» ya no es cierto). Tras un 409, solo queda el aviso del 409.
describe("recargas con la tarea y la entrega fallidas a la vez (CAL-1C06c)", () => {
  it.each([
    [
      "RUBRICA_MODIFICADA",
      500,
      "ERROR_INTERNO",
      403,
      "SIN_ACCESO_A_LA_CLASE",
      MENSAJE_RUBRICA,
      "No tienes acceso a esta clase.",
    ],
    [
      "ENTREGA_NO_CALIFICABLE",
      500,
      "ERROR_INTERNO",
      403,
      "SIN_ACCESO_A_LA_CLASE",
      MENSAJE_NO_CALIFICABLE,
      "No tienes acceso a esta clase.",
    ],
    [
      "RUBRICA_MODIFICADA",
      404,
      "TAREA_NO_ENCONTRADA",
      500,
      "ERROR_INTERNO",
      MENSAJE_RUBRICA,
      "Esa tarea ya no existe.",
    ],
    [
      "ENTREGA_NO_CALIFICABLE",
      404,
      "TAREA_NO_ENCONTRADA",
      500,
      "ERROR_INTERNO",
      MENSAJE_NO_CALIFICABLE,
      "Esa tarea ya no existe.",
    ],
    [
      "RUBRICA_MODIFICADA",
      404,
      "TAREA_NO_ENCONTRADA",
      404,
      "ALUMNO_NO_ENCONTRADO",
      MENSAJE_RUBRICA,
      "Esa tarea ya no existe.",
    ],
  ] as const)(
    "CAL-1C06c: tras un 409 %s, con la tarea en %i %s y la entrega en %i %s, la vista se reemplaza, el foco va a la raíz y el único aviso es el del 409",
    async (codigo, estadoTarea, codigoTarea, estadoEntrega, codigoEntrega, mensaje, reemplazo) => {
      servidor.calificar = [() => errorApi(409, codigo, mensaje)]
      const cliente = renderVista()
      await screen.findByLabelText("Claridad (de 5 puntos)")
      await sinPeticionesEnVuelo(cliente)
      escribir("Claridad (de 5 puntos)", "4")
      escribir("Ortografía (de 4 puntos)", "3")
      servidor.tarea = () => errorApi(estadoTarea, codigoTarea, "x")
      servidor.entrega = () => errorApi(estadoEntrega, codigoEntrega, "x")

      pulsar(botonCalificar())

      await screen.findByText(reemplazo)
      await sinPeticionesEnVuelo(cliente)
      expect(aviso.error.mock.calls).toEqual([[mensaje]])
      const activo = fueraDeBody()
      expect(activo).toHaveAttribute("tabindex", "-1")
      expect(activo).toHaveTextContent(reemplazo)
    },
  )

  it("CAL-1C06c (vecino): una recarga de fondo con la tarea en 5xx y la entrega en 404 reemplaza la vista sin ningún aviso", async () => {
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    await sinPeticionesEnVuelo(cliente)
    servidor.tarea = () => errorApi(500, "ERROR_INTERNO", "falló")
    servidor.entrega = () => errorApi(404, "ALUMNO_NO_ENCONTRADO", "x")

    vi.setSystemTime(new Date(Date.now() + 5_000))
    await act(() => cliente.invalidateQueries())
    await sinPeticionesEnVuelo(cliente)

    expect(screen.getByText("No encontramos a ese alumno en esta clase.")).toBeInTheDocument()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1C06c (vecino): una recarga de fondo con la tarea en 5xx y la entrega buena sigue dando un solo aviso de la tarea y deja ver la última versión", async () => {
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    await sinPeticionesEnVuelo(cliente)
    servidor.tarea = () => errorApi(500, "ERROR_INTERNO", "falló")

    vi.setSystemTime(new Date(Date.now() + 5_000))
    await act(() => cliente.invalidateQueries())
    await sinPeticionesEnVuelo(cliente)

    expect(aviso.error.mock.calls).toEqual([
      ["No pudimos actualizar la tarea. Mostramos la última versión que tenemos."],
    ])
    expect(campo("Claridad (de 5 puntos)")).toBeInTheDocument()
  })
})

// Verificación de la corrección de la ronda 1 de 01c (M-07): el fallo de la tarea que la entrega calla
// queda como atendido al salir de la vista. La siguiente vista de la tarea (la lista de entregas, con la
// misma caché) solo anuncia los fallos de sus propias recargas: uno con la tarea aún en 500, ninguno con
// la tarea ya en 200.
const AVISO_TAREA = "No pudimos actualizar la tarea. Mostramos la última versión que tenemos."

const renderEn = (cliente: QueryClient, ruta: string) => {
  const base = "/maestro/clases/:claseId/tareas/:tareaId/entregas"
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path={`${base}/:alumnoId`} element={<EntregaDeAlumnoView />} />
          <Route path={base} element={<EntregasView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const RUTA_LISTA_UI = `/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/entregas`

const irAOtraVista = async (
  cliente: QueryClient,
  ruta: string,
  tareaAlVolver: number,
  alMontar: () => void = () => undefined,
) => {
  cleanup()
  vi.setSystemTime(new Date(Date.now() + 60_000))
  servidor.tarea = () =>
    tareaAlVolver === 200
      ? respuestaJson(200, tareaDoble())
      : errorApi(500, "ERROR_INTERNO", "falló otra vez")
  renderEn(cliente, ruta)
  alMontar()
  await sinPeticionesEnVuelo(cliente)
}

describe("el fallo de la tarea callado por la entrega no se repite en la siguiente vista (CAL-1C06d)", () => {
  it.each([
    [500, [[AVISO_TAREA]]],
    [200, []],
  ] as const)(
    "CAL-1C06d: tras una recarga de fondo con la tarea en 5xx y la entrega en 404 (sin aviso), la lista de entregas con la tarea en %i da exactamente %j",
    async (tareaAlVolver, esperados) => {
      const cliente = renderVista()
      await screen.findByLabelText("Claridad (de 5 puntos)")
      await sinPeticionesEnVuelo(cliente)
      servidor.tarea = () => errorApi(500, "ERROR_INTERNO", "falló")
      servidor.entrega = () => errorApi(404, "ALUMNO_NO_ENCONTRADO", "x")
      vi.setSystemTime(new Date(Date.now() + 5_000))
      await act(() => cliente.invalidateQueries())
      await sinPeticionesEnVuelo(cliente)
      expect(screen.getByText("No encontramos a ese alumno en esta clase.")).toBeInTheDocument()
      expect(aviso.error).not.toHaveBeenCalled()

      await irAOtraVista(cliente, RUTA_LISTA_UI, tareaAlVolver)

      expect(screen.getByRole("heading", { name: "Entregas", level: 2 })).toBeInTheDocument()
      expect(aviso.error.mock.calls).toEqual(esperados)
    },
  )

  it.each([
    [500, [[AVISO_TAREA]]],
    [200, []],
  ] as const)(
    "CAL-1C06d (vecino): si se sale mientras la entrega se vuelve a pedir y la tarea ya falló, la lista de entregas con la tarea en %i da exactamente %j",
    async (tareaAlVolver, esperados) => {
      const cliente = renderVista()
      await screen.findByLabelText("Claridad (de 5 puntos)")
      await sinPeticionesEnVuelo(cliente)
      const entregaEnVuelo = diferida()
      servidor.tarea = () => errorApi(500, "ERROR_INTERNO", "falló")
      servidor.entrega = () => entregaEnVuelo.promesa
      vi.setSystemTime(new Date(Date.now() + 5_000))
      act(() => {
        void cliente.invalidateQueries()
      })
      await waitFor(() =>
        expect(cliente.getQueryState(claveTarea(CLASE_ID, TAREA_ID))?.status).toBe("error"),
      )
      await reposar()
      expect(deLaEntrega()).toHaveLength(2)
      expect(aviso.error).not.toHaveBeenCalled()

      await irAOtraVista(cliente, RUTA_LISTA_UI, tareaAlVolver, () =>
        entregaEnVuelo.resolver(respuestaJson(200, { entrega: entregaDoble() })),
      )

      expect(aviso.error.mock.calls).toEqual(esperados)
    },
  )

  it("CAL-1C06d (vecino): al volver a entrar a la misma entrega con la tarea y la entrega aún fallidas, ningún aviso", async () => {
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    await sinPeticionesEnVuelo(cliente)
    servidor.tarea = () => errorApi(500, "ERROR_INTERNO", "falló")
    servidor.entrega = () => errorApi(404, "ALUMNO_NO_ENCONTRADO", "x")
    vi.setSystemTime(new Date(Date.now() + 5_000))
    await act(() => cliente.invalidateQueries())
    await sinPeticionesEnVuelo(cliente)

    await irAOtraVista(
      cliente,
      `/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/entregas/${ALUMNO_ID}`,
      500,
    )

    expect(screen.getByText("No encontramos a ese alumno en esta clase.")).toBeInTheDocument()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1C06d (vecino): con la entrega reemplazando la vista, la entrega que vuelve bien deja ver la última versión con un solo aviso de la tarea", async () => {
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    await sinPeticionesEnVuelo(cliente)
    servidor.tarea = () => errorApi(500, "ERROR_INTERNO", "falló")
    servidor.entrega = () => errorApi(404, "ALUMNO_NO_ENCONTRADO", "x")
    vi.setSystemTime(new Date(Date.now() + 5_000))
    await act(() => cliente.invalidateQueries())
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.error).not.toHaveBeenCalled()

    servidor.entrega = () => respuestaJson(200, { entrega: entregaDoble() })
    vi.setSystemTime(new Date(Date.now() + 5_000))
    await act(() =>
      cliente.invalidateQueries({ queryKey: claveEntregaDeAlumno(CLASE_ID, TAREA_ID, ALUMNO_ID) }),
    )
    await sinPeticionesEnVuelo(cliente)

    expect(await screen.findByLabelText("Claridad (de 5 puntos)")).toBeInTheDocument()
    expect(aviso.error.mock.calls).toEqual([[AVISO_TAREA]])
  })
})

describe("guarda síncrona (CAL-1C07)", () => {
  it("CAL-1C07: un doble clic y un Enter repetido hacen un solo PUT; el botón usa enEspera, nunca disabled", async () => {
    const enVuelo = diferida()
    servidor.calificar = [() => enVuelo.promesa]
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    escribir("Claridad (de 5 puntos)", "1")
    escribir("Ortografía (de 4 puntos)", "2")

    pulsar(botonCalificar())
    fireEvent.click(botonCalificar())
    fireEvent.submit(formulario())
    fireEvent.submit(formulario())

    await waitFor(() => expect(botonCalificar()).toHaveAttribute("aria-busy", "true"))
    expect(botonCalificar()).toHaveAttribute("aria-disabled", "true")
    expect(botonCalificar()).not.toHaveAttribute("disabled")
    expect(deCalificar()).toHaveLength(1)

    enVuelo.resolver(calificadaEn(3))
    await sinPeticionesEnVuelo(cliente)
    expect(deCalificar()).toHaveLength(1)
    expect(aviso.success).toHaveBeenCalledTimes(1)
  })
})

describe("perspectivas y estados (CAL-1C08)", () => {
  it("CAL-1C08: el admin ve la calificación en solo lectura, sin ningún textbox ni botón de calificar", async () => {
    servidor.entrega = () =>
      respuestaJson(200, {
        entrega: entregaDoble({
          estado: "calificado",
          version: 3,
          calificacion: calificacionDoble(),
        }),
      })
    renderVista("admin")
    expect(await screen.findByText("Calificación: 8.5 de 10")).toBeInTheDocument()
    expect(screen.getByText(/^Calificada el .* a las \d{2}:\d{2}$/)).toBeInTheDocument()
    expect(screen.getByText("Claridad: 4.5 de 5")).toBeInTheDocument()
    expect(screen.getByText("Ortografía: 3.25 de 4")).toBeInTheDocument()
    expect(encabezado()).toBeInTheDocument()
    expect(screen.queryAllByRole("textbox")).toEqual([])
    expect(screen.queryByRole("button", { name: "Calificar y devolver" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Actualizar calificación" })).toBeNull()
  })

  it("CAL-1C08: el admin sin calificación lee «Sin calificar todavía.»", async () => {
    renderVista("admin")
    expect(await screen.findByText("Sin calificar todavía.")).toBeInTheDocument()
    expect(screen.queryAllByRole("textbox")).toEqual([])
  })

  it("CAL-1C08: una entrega asignada sin vencer muestra «Podrás calificar…» sin formulario", async () => {
    servidor.entrega = () =>
      respuestaJson(200, {
        entrega: entregaDoble({ estado: "asignado", fechaEntrega: null, version: 0 }),
      })
    renderVista()
    const frase = await screen.findByText(PODRAS)
    const panel = frase.closest("[data-slot='card']")
    if (!(panel instanceof HTMLElement)) throw new Error("Precondición: la frase vive en el panel")
    expect(within(panel).getByRole("heading", { name: "Calificación" })).toBeInTheDocument()
    expect(within(panel).queryAllByRole("textbox")).toEqual([])
    expect(screen.queryByRole("button", { name: "Calificar y devolver" })).toBeNull()
  })

  it("CAL-1C08 (c′): una vencida sin entrega en una tarea que no acepta tardías muestra la nota y el formulario", async () => {
    servidor.tarea = () =>
      respuestaJson(200, tareaDoble({ fechaLimite: PASADA, aceptaTardias: false }))
    servidor.entrega = () =>
      respuestaJson(200, {
        entrega: entregaDoble({ estado: "asignado", fechaEntrega: null, version: 0 }),
      })
    renderVista()
    expect(await screen.findByText(NOTA_CERRADA)).toBeInTheDocument()
    expect(botonCalificar()).toBeInTheDocument()
    expect(screen.queryByText(PODRAS)).toBeNull()
  })

  it("CAL-1C08 (c′): una vencida sin entrega en una tarea que acepta tardías muestra la frase sin formulario", async () => {
    servidor.tarea = () =>
      respuestaJson(200, tareaDoble({ fechaLimite: PASADA, aceptaTardias: true }))
    servidor.entrega = () =>
      respuestaJson(200, {
        entrega: entregaDoble({ estado: "asignado", fechaEntrega: null, version: 0 }),
      })
    renderVista()
    expect(await screen.findByText(PODRAS)).toBeInTheDocument()
    expect(screen.queryByText(NOTA_CERRADA)).toBeNull()
    expect(screen.queryByRole("button", { name: "Calificar y devolver" })).toBeNull()
  })
})

describe("la versión de apertura cuando el formulario aparece o desaparece (CAL-1C14)", () => {
  it("CAL-1C14: con la frase a la vista (asignado sin vencer, versión 0), una recarga de fondo trae la entrega entregada con versión 1; el formulario aparece y el primer guardado envía version: 1 sin 409", async () => {
    servidor.entrega = () =>
      respuestaJson(200, {
        entrega: entregaDoble({ estado: "asignado", fechaEntrega: null, version: 0 }),
      })
    const cliente = renderVista()
    expect(await screen.findByText(PODRAS)).toBeInTheDocument()
    servidor.entrega = () => respuestaJson(200, { entrega: entregaDoble({ version: 1 }) })

    await recargarDeFondo(cliente)

    expect(await screen.findByLabelText("Claridad (de 5 puntos)")).toBeInTheDocument()
    expect(screen.queryByText(PODRAS)).toBeNull()
    escribir("Claridad (de 5 puntos)", "5")
    escribir("Ortografía (de 4 puntos)", "4")
    pulsar(botonCalificar())
    await waitFor(() => expect(deCalificar()).toHaveLength(1))
    expect(deCalificar()[0]?.cuerpo).toMatchObject({ version: 1 })
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1C14: con el formulario a la vista y el foco en un campo, una recarga que trae la entrega no calificable lo quita y el foco no queda en <body>", async () => {
    const cliente = renderVista()
    const claridad = await screen.findByLabelText("Claridad (de 5 puntos)")
    claridad.focus()
    fireEvent.focusIn(claridad)
    escribir("Claridad (de 5 puntos)", "3")
    servidor.entrega = () =>
      respuestaJson(200, {
        entrega: entregaDoble({ estado: "asignado", fechaEntrega: null, version: 3 }),
      })

    await recargarDeFondo(cliente)

    expect(await screen.findByText(PODRAS)).toBeInTheDocument()
    expect(screen.queryByLabelText("Claridad (de 5 puntos)")).toBeNull()
    const activo = fueraDeBody()
    expect(activo).toHaveAttribute("tabindex", "-1")
    expect(activo).toContainElement(encabezado())
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1C14b: con la nota y el formulario a la vista (asignado cerrada, versión 0) y lo escrito, una recarga de fondo trae la entrega calificada con versión 1; el formulario no se vuelve a montar, lo escrito, el foco y las etiquetas siguen, y el guardado envía version: 0, recibe 409 ENTREGA_MODIFICADA, recarga una vez y el foco va al h3", async () => {
    servidor.tarea = () =>
      respuestaJson(200, tareaDoble({ fechaLimite: PASADA, aceptaTardias: false }))
    servidor.entrega = () =>
      respuestaJson(200, {
        entrega: entregaDoble({ estado: "asignado", fechaEntrega: null, version: 0 }),
      })
    servidor.calificar = [() => errorApi(409, "ENTREGA_MODIFICADA", MENSAJE_MODIFICADA)]
    const cliente = renderVista()
    expect(await screen.findByText(NOTA_CERRADA)).toBeInTheDocument()
    const claridad = campo("Claridad (de 5 puntos)")
    const form = formulario()
    escribir("Claridad (de 5 puntos)", "4")
    escribir("Ortografía (de 4 puntos)", "3")
    escribir("Comentario para el alumno (opcional)", "Lo que escribí")
    claridad.focus()
    fireEvent.focusIn(claridad)
    servidor.entrega = () => calificadaEn(1)

    await recargarDeFondo(cliente)

    expect(deLaEntrega()).toHaveLength(2)
    expect(screen.queryByText(NOTA_CERRADA)).toBeNull()
    expect(campo("Claridad (de 5 puntos)")).toBe(claridad)
    expect(formulario()).toBe(form)
    expect(claridad).toHaveFocus()
    expect(claridad).toHaveValue("4")
    expect(campo("Ortografía (de 4 puntos)")).toHaveValue("3")
    expect(campo("Comentario para el alumno (opcional)")).toHaveValue("Lo que escribí")
    expect(botonCalificar()).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Actualizar calificación" })).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
    const entregasAntes = deLaEntrega().length
    const tareasAntes = deLaTarea().length

    pulsar(botonCalificar())

    await waitFor(() => expect(deCalificar()).toHaveLength(1))
    expect(deCalificar()[0]?.cuerpo).toMatchObject({ version: 0 })
    expect(
      await screen.findByRole("button", { name: "Actualizar calificación" }),
    ).toBeInTheDocument()
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(aviso.error).toHaveBeenCalledWith(MENSAJE_MODIFICADA)
    expect(deLaEntrega()).toHaveLength(entregasAntes + 1)
    expect(deLaTarea()).toHaveLength(tareasAntes)
    expect(encabezado()).toHaveFocus()
    expect(campo("Comentario para el alumno (opcional)")).toHaveValue("")
  })

  it("CAL-1C14b (vecino): con el formulario a la vista (entregada, versión 2) y lo escrito, una recarga de fondo trae la entrega asignada y cerrada con versión 3; la nota aparece, el formulario no se vuelve a montar y el guardado envía version: 2", async () => {
    servidor.tarea = () =>
      respuestaJson(200, tareaDoble({ fechaLimite: PASADA, aceptaTardias: false }))
    servidor.calificar = [() => errorApi(409, "ENTREGA_MODIFICADA", MENSAJE_MODIFICADA)]
    const cliente = renderVista()
    const claridad = await screen.findByLabelText("Claridad (de 5 puntos)")
    expect(screen.queryByText(NOTA_CERRADA)).toBeNull()
    escribir("Claridad (de 5 puntos)", "2")
    escribir("Ortografía (de 4 puntos)", "1")
    claridad.focus()
    fireEvent.focusIn(claridad)
    servidor.entrega = () =>
      respuestaJson(200, {
        entrega: entregaDoble({ estado: "asignado", fechaEntrega: null, version: 3 }),
      })

    await recargarDeFondo(cliente)

    expect(await screen.findByText(NOTA_CERRADA)).toBeInTheDocument()
    expect(campo("Claridad (de 5 puntos)")).toBe(claridad)
    expect(claridad).toHaveFocus()
    expect(claridad).toHaveValue("2")
    expect(campo("Ortografía (de 4 puntos)")).toHaveValue("1")
    expect(aviso.error).not.toHaveBeenCalled()

    pulsar(botonCalificar())

    await waitFor(() => expect(deCalificar()).toHaveLength(1))
    expect(deCalificar()[0]?.cuerpo).toMatchObject({ version: 2 })
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(encabezado()).toHaveFocus()
  })
})

// Ronda 2 de 01c (T-04): el aviso de un 400 de calificar que el panel no pinta nunca lleva el prefijo
// técnico del campo, aunque sea una ruta con puntos, índices o signos.
describe("el aviso de un 400 sin lugar en el panel no lleva el prefijo de ruta (CAL-1C06e)", () => {
  it.each([
    "puntajes.0.criterioId: ",
    "puntajes.0: ",
    "puntajes.-1.puntos: ",
    "puntajes.x.puntos: ",
    "puntajes.1.5.puntos: ",
    "",
  ] as const)(
    "CAL-1C06e: «%sRevisa este valor.» da un solo aviso «Revisa este valor.», ningún ErrorDeCampo y lo escrito se conserva",
    async (prefijo) => {
      servidor.calificar = [() => errorApi(400, "VALIDACION", `${prefijo}Revisa este valor.`)]
      const cliente = renderVista()
      await screen.findByLabelText("Claridad (de 5 puntos)")
      escribir("Claridad (de 5 puntos)", "4")
      escribir("Ortografía (de 4 puntos)", "3")

      pulsar(botonCalificar())

      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
      await sinPeticionesEnVuelo(cliente)
      expect(aviso.error.mock.calls).toEqual([["Revisa este valor."]])
      for (const caja of screen.getAllByRole("textbox")) {
        expect(caja).not.toHaveAttribute("aria-invalid", "true")
      }
      expect(campo("Claridad (de 5 puntos)")).toHaveValue("4")
      expect(campo("Ortografía (de 4 puntos)")).toHaveValue("3")
      expect(botonCalificar()).not.toHaveAttribute("aria-busy")
    },
  )

  it("CAL-1C06e (vecino): «puntajes.0.criterioId:» sin mensaje da el aviso genérico, nunca uno vacío", async () => {
    servidor.calificar = [() => errorApi(400, "VALIDACION", "puntajes.0.criterioId:")]
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    escribir("Claridad (de 5 puntos)", "4")
    escribir("Ortografía (de 4 puntos)", "3")

    pulsar(botonCalificar())

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.error.mock.calls).toEqual([["Algo salió mal. Inténtalo de nuevo."]])
  })
})

// Ronda 3 de 01c (T-05): un 400 de un campo que el panel pinta, pero sin mensaje tras el prefijo, marca
// el campo con el texto genérico en su ErrorDeCampo, nunca uno vacío, y sin aviso.
describe("un 400 pintable sin mensaje marca el campo con el genérico, nunca vacío (CAL-1C06f)", () => {
  const GENERICO = "Algo salió mal. Inténtalo de nuevo."

  it.each([
    ["puntajes.0.puntos:", "Claridad (de 5 puntos)", ""],
    ["puntajes.1.puntos:   ", "Ortografía (de 4 puntos)", ""],
    ["puntajes.0.puntos:\t\n", "Claridad (de 5 puntos)", ""],
    ["comentario:", "Comentario para el alumno (opcional)", ""],
    ["comentario:  ", "Comentario para el alumno (opcional)", "Bien"],
  ] as const)(
    "CAL-1C06f: %j marca «%s» con «Algo salió mal. Inténtalo de nuevo.» en su ErrorDeCampo, con el foco, sin aviso y con lo escrito (comentario %j)",
    async (mensajeDelServidor, etiqueta, comentario) => {
      servidor.calificar = [() => errorApi(400, "VALIDACION", mensajeDelServidor)]
      const cliente = renderVista()
      await screen.findByLabelText("Claridad (de 5 puntos)")
      escribir("Claridad (de 5 puntos)", "4")
      escribir("Ortografía (de 4 puntos)", "3")
      if (comentario !== "") escribir("Comentario para el alumno (opcional)", comentario)

      pulsar(botonCalificar())

      await waitFor(() => expect(campo(etiqueta)).toHaveFocus())
      await sinPeticionesEnVuelo(cliente)
      expect(campo(etiqueta)).toHaveAttribute("aria-invalid", "true")
      // El comentario lleva además su ayuda («Se publica en los comentarios privados…»).
      expect(campo(etiqueta)).toHaveAccessibleDescription(expect.stringContaining(GENERICO))
      expect(aviso.error).not.toHaveBeenCalled()
      expect(campo("Claridad (de 5 puntos)")).toHaveValue("4")
      expect(campo("Ortografía (de 4 puntos)")).toHaveValue("3")
      expect(campo("Comentario para el alumno (opcional)")).toHaveValue(comentario)
      expect(botonCalificar()).not.toHaveAttribute("aria-busy")
    },
  )

  it.each(["calificacion:", "calificacion:   "] as const)(
    "CAL-1C06f (hermano): %j en una tarea sin rúbrica marca «Calificación» con «Algo salió mal. Inténtalo de nuevo.», con el foco y sin aviso",
    async (mensajeDelServidor) => {
      servidor.tarea = () => respuestaJson(200, tareaDoble({ rubrica: [], puntos: 80 }))
      servidor.calificar = [() => errorApi(400, "VALIDACION", mensajeDelServidor)]
      const cliente = renderVista()
      await screen.findByLabelText("Calificación (de 80 puntos)")
      escribir("Calificación (de 80 puntos)", "70")

      pulsar(botonCalificar())

      await waitFor(() => expect(campo("Calificación (de 80 puntos)")).toHaveFocus())
      await sinPeticionesEnVuelo(cliente)
      expect(campo("Calificación (de 80 puntos)")).toHaveAttribute("aria-invalid", "true")
      expect(campo("Calificación (de 80 puntos)")).toHaveAccessibleDescription(GENERICO)
      expect(campo("Calificación (de 80 puntos)")).toHaveValue("70")
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )

  it("CAL-1C06f (vecino): «calificacion:» sin mensaje en una tarea con rúbrica da un solo aviso genérico y ningún campo marcado", async () => {
    servidor.calificar = [() => errorApi(400, "VALIDACION", "calificacion:")]
    const cliente = renderVista()
    await screen.findByLabelText("Claridad (de 5 puntos)")
    escribir("Claridad (de 5 puntos)", "4")
    escribir("Ortografía (de 4 puntos)", "3")

    pulsar(botonCalificar())

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await sinPeticionesEnVuelo(cliente)
    expect(aviso.error.mock.calls).toEqual([[GENERICO]])
    for (const caja of screen.getAllByRole("textbox")) {
      expect(caja).not.toHaveAttribute("aria-invalid", "true")
    }
  })
})
