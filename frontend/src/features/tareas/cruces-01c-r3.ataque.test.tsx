import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { EntregaDeAlumnoView } from "./entrega-de-alumno-view"
import { EntregasView } from "./entregas-view"

// Ataque (CALIFICACIONES-01c, ronda 3): pasada final de regresión sobre los mecanismos corregidos en
// 01c (M-06, T-02, T-03, M-07 y T-04), con cruces que las rondas anteriores no probaron: un 400 sin
// lugar seguido de un 409; un 409 seguido de un 400 con el panel ya reiniciado (con otra rúbrica);
// una recarga de fondo que cambia la forma del árbol con un ErrorDeCampo pintado; el fallo de la tarea
// (callado mientras la entrega está en vuelo) y un 400 sin lugar en la misma vista; y el 400 sin lugar
// con la vista desmontada. Reloj fijo (solo Date). El servidor es un doble en memoria.

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
const BASE_UI = `/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const UI_ENTREGA = `${BASE_UI}/entregas/${ALUMNO_ID}`
const CLARIDAD = "Claridad (de 5 puntos)"
const ORTOGRAFIA = "Ortografía (de 4 puntos)"
const PUNTUALIDAD = "Puntualidad (de 1 punto)"
const CALIFICACION = "Calificación (de 10 puntos)"
const COMENTARIO = "Comentario para el alumno (opcional)"
const NOTA = "Este alumno no entregó la tarea y la entrega ya está cerrada."
const PODRAS = "Podrás calificar cuando el alumno entregue o cuando se cierre la entrega."
const MENSAJE = "Revisa este valor."
const MENSAJE_MODIFICADA =
  "La entrega cambió mientras la calificabas: el alumno la anuló o la volvió a entregar, u otra persona la calificó. No se guardó tu calificación; revisa la entrega actual."
const MENSAJE_RUBRICA =
  "La rúbrica o los puntos de la tarea cambiaron mientras calificabas. No se guardó tu calificación; vuelve a calificar con la versión actual."
const AVISO_TAREA = "No pudimos actualizar la tarea. Mostramos la última versión que tenemos."
const AVISO_RECARGA_ENTREGA =
  "No pudimos cargar la entrega actual. Revisa tu conexión e inténtalo de nuevo."

const RUBRICA = [
  { id: CRITERIO_1, criterio: "Claridad", puntosMax: 5 },
  { id: CRITERIO_2, criterio: "Ortografía", puntosMax: 4 },
]
const RUBRICA_NUEVA = [...RUBRICA, { id: CRITERIO_3, criterio: "Puntualidad", puntosMax: 1 }]

type Cambio = Record<string, unknown>

const tareaDoble = (extra: Cambio = {}) => ({
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

const entregaDoble = (extra: Cambio = {}) => ({
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

const SIN_ENTREGA: Cambio = { estado: "asignado", fechaEntrega: null, conRetraso: false }
const CERRADA: Cambio = { fechaLimite: PASADA, aceptaTardias: false }
const calificadaPorOtro = (version: number): Cambio => ({
  estado: "calificado",
  version,
  calificacion: {
    puntos: 2,
    sobre: 10,
    fecha: "2030-01-10T11:00:00.000Z",
    puntajes: [
      { criterioId: CRITERIO_1, criterio: "Claridad", puntosMax: 5, puntos: 1 },
      { criterioId: CRITERIO_2, criterio: "Ortografía", puntosMax: 4, puntos: 1 },
    ],
  },
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorApi = (estado: number, codigo: string, mensaje = "x") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

type Respuesta = () => Response | Promise<Response>

interface Llamada {
  metodo: string
  url: string
  cuerpo: unknown
}

let tarea: Respuesta
let entrega: Respuesta
let respuestasDeCalificar: Respuesta[] = []
let llamadas: Llamada[] = []
let inesperadas: string[] = []

const tareaCon =
  (extra: Cambio = {}): Respuesta =>
  () =>
    respuestaJson(200, tareaDoble(extra))
const entregaCon =
  (extra: Cambio = {}): Respuesta =>
  () =>
    respuestaJson(200, { entrega: entregaDoble(extra) })
const tareaEn500: Respuesta = () => errorApi(500, "ERROR_INTERNO", "falló")

const diferida = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver: (respuesta: Response) => resolver(respuesta) }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  llamadas = []
  inesperadas = []
  respuestasDeCalificar = []
  tarea = tareaCon()
  entrega = entregaCon()
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null
      llamadas.push({ metodo, url, cuerpo })
      if (metodo === "GET" && url === RUTA_TAREA) return Promise.resolve(tarea())
      if (metodo === "GET" && url === RUTA_ALUMNO) return Promise.resolve(entrega())
      if (metodo === "GET" && url.includes("/comentarios?")) {
        return Promise.resolve(respuestaJson(200, { comentarios: [], siguienteCursor: null }))
      }
      if (metodo === "GET" && url.startsWith(`${RUTA_TAREA}/entregas?`)) {
        return Promise.resolve(
          respuestaJson(200, { entregas: [], total: 0, entregadas: 0, siguienteCursor: null }),
        )
      }
      if (metodo === "PUT" && url === RUTA_CALIFICACION) {
        const responder = respuestasDeCalificar.shift()
        if (responder === undefined) {
          inesperadas.push("PUT sin respuesta preparada")
          return Promise.resolve(errorApi(500, "ERROR_INTERNO", "sin respuesta"))
        }
        return Promise.resolve(responder())
      }
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

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const sinPeticionesEnVuelo = async (cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isFetching() + cliente.isMutating()).toBe(0))
  await reposar()
}

const abrir = async () => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const base = "/maestro/clases/:claseId/tareas/:tareaId"
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[UI_ENTREGA]}>
        <Routes>
          <Route path={`${base}/entregas`} element={<EntregasView />} />
          <Route path={`${base}/entregas/:alumnoId`} element={<EntregaDeAlumnoView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByRole("heading", { name: "Calificación", level: 3 })
  await sinPeticionesEnVuelo(cliente)
  return cliente
}

const avanzar = (ms: number) => vi.setSystemTime(new Date(Date.now() + ms))
const campo = (nombre: string) => screen.getByLabelText(nombre)
const escribir = (nombre: string, valor: string) =>
  fireEvent.change(campo(nombre), { target: { value: valor } })
const encabezado = () => screen.getByRole("heading", { name: "Calificación", level: 3 })
const botonGuardar = () =>
  screen.getByRole("button", { name: /^(Calificar y devolver|Actualizar calificación)$/ })
const deCalificar = () => llamadas.filter((l) => l.metodo === "PUT" && l.url === RUTA_CALIFICACION)
const avisos = () => aviso.error.mock.calls.map((llamada) => llamada[0] as unknown)
const marcados = () =>
  Array.from(document.querySelectorAll('[aria-invalid="true"]')).map(
    (elemento) => elemento.getAttribute("name") ?? "",
  )
const fueraDeBody = () => {
  const activo = document.activeElement
  if (!(activo instanceof HTMLElement) || activo === document.body) {
    throw new Error("El foco quedó en <body>")
  }
  return activo
}

const fueraDeEspera = () => {
  expect(botonGuardar()).not.toHaveAttribute("aria-busy", "true")
  expect(botonGuardar()).not.toHaveAttribute("aria-disabled", "true")
}

// Envía el panel y espera a que el PUT salga y todo se asiente.
const enviar = async (cliente: QueryClient, responder: Respuesta) => {
  respuestasDeCalificar.push(responder)
  const antes = deCalificar().length
  avanzar(5_000)
  botonGuardar().focus()
  fireEvent.click(botonGuardar())
  await waitFor(() => expect(deCalificar()).toHaveLength(antes + 1))
  await sinPeticionesEnVuelo(cliente)
}

const recargarDeFondo = async (cliente: QueryClient) => {
  avanzar(5_000)
  await act(() => cliente.invalidateQueries())
  await sinPeticionesEnVuelo(cliente)
}

const sinLugar =
  (prefijo = "puntajes.0.criterioId") =>
  () =>
    errorApi(400, "VALIDACION", `${prefijo}: ${MENSAJE}`)
const conflicto = (codigo: string, mensaje: string) => () => errorApi(409, codigo, mensaje)

const llenarDosCriterios = () => {
  escribir(CLARIDAD, "4")
  escribir(ORTOGRAFIA, "3")
  escribir(COMENTARIO, "Buen trabajo")
}

const conservadosDosCriterios = () => {
  expect(campo(CLARIDAD)).toHaveValue("4")
  expect(campo(ORTOGRAFIA)).toHaveValue("3")
  expect(campo(COMENTARIO)).toHaveValue("Buen trabajo")
}

describe("ataque 01c r3 · un 400 sin lugar seguido de un 409 (T-04 y M-06)", () => {
  it("CAL-T-128: el 400 da su aviso limpio y conserva todo; el 409 RUBRICA_MODIFICADA después da el suyo y reinicia con la rúbrica nueva, sin marcas y con el foco en el h3", async () => {
    const cliente = await abrir()
    llenarDosCriterios()

    await enviar(cliente, sinLugar())

    expect(avisos()).toEqual([MENSAJE])
    expect(marcados()).toEqual([])
    conservadosDosCriterios()
    fueraDeEspera()

    tarea = tareaCon({ rubrica: RUBRICA_NUEVA })
    await enviar(cliente, conflicto("RUBRICA_MODIFICADA", MENSAJE_RUBRICA))

    expect(avisos()).toEqual([MENSAJE, MENSAJE_RUBRICA])
    expect(campo(PUNTUALIDAD)).toHaveValue("")
    expect(campo(CLARIDAD)).toHaveValue("")
    expect(campo(COMENTARIO)).toHaveValue("")
    expect(marcados()).toEqual([])
    expect(encabezado()).toHaveFocus()
    fueraDeEspera()
    const [primero, segundo] = deCalificar()
    expect(primero?.cuerpo).toEqual(segundo?.cuerpo)
    expect(segundo?.cuerpo).toMatchObject({ version: 2, puntosDeLaTarea: 10 })
    expect(inesperadas).toEqual([])
  })

  it("CAL-T-128: el 400 sin lugar y después un 409 ENTREGA_MODIFICADA (otra persona calificó): dos avisos, cada uno el suyo, y el panel reiniciado con lo de la otra persona", async () => {
    const cliente = await abrir()
    llenarDosCriterios()

    await enviar(cliente, sinLugar("puntajes.1"))
    entrega = entregaCon(calificadaPorOtro(3))
    await enviar(cliente, conflicto("ENTREGA_MODIFICADA", MENSAJE_MODIFICADA))

    expect(avisos()).toEqual([MENSAJE, MENSAJE_MODIFICADA])
    expect(campo(CLARIDAD)).toHaveValue("1")
    expect(campo(ORTOGRAFIA)).toHaveValue("1")
    expect(screen.getByRole("button", { name: "Actualizar calificación" })).toBeInTheDocument()
    expect(marcados()).toEqual([])
    expect(encabezado()).toHaveFocus()
    expect(inesperadas).toEqual([])
  })
})

describe("ataque 01c r3 · un 409 y después un 400 con el panel ya reiniciado (T-02, T-04 y M-06)", () => {
  // [nombre, rúbrica tras el 409, cómo se llena, prefijo del 400, campo marcado o null si avisa]
  const casos = [
    [
      "rúbrica de 3 criterios, el 400 del tercero se pinta",
      RUBRICA_NUEVA,
      [CLARIDAD, ORTOGRAFIA, PUNTUALIDAD],
      "puntajes.2.puntos",
      `puntajes.${CRITERIO_3}`,
    ],
    [
      "rúbrica de 3 criterios, el 400 de criterioId avisa limpio",
      RUBRICA_NUEVA,
      [CLARIDAD, ORTOGRAFIA, PUNTUALIDAD],
      "puntajes.2.criterioId",
      null,
    ],
    [
      "rúbrica de 1 criterio, el 400 de la posición 1 (ya no está) avisa limpio",
      [RUBRICA[0]],
      [CLARIDAD],
      "puntajes.1.puntos",
      null,
    ],
    [
      "sin rúbrica, el 400 de calificacion se pinta",
      [],
      [CALIFICACION],
      "calificacion",
      "calificacion",
    ],
    [
      "sin rúbrica, el 400 de puntajes.0.puntos avisa limpio",
      [],
      [CALIFICACION],
      "puntajes.0.puntos",
      null,
    ],
  ] as const

  it.each(casos)(
    "CAL-T-129: %s; un solo anuncio, lo escrito sigue y el cuerpo lleva la apertura nueva",
    async (_nombre, rubricaNueva, campos, prefijo, marcado) => {
      const cliente = await abrir()
      llenarDosCriterios()
      tarea = tareaCon({ rubrica: rubricaNueva })

      await enviar(cliente, conflicto("RUBRICA_MODIFICADA", MENSAJE_RUBRICA))

      expect(avisos()).toEqual([MENSAJE_RUBRICA])
      expect(encabezado()).toHaveFocus()
      for (const nombre of campos) escribir(nombre, "1")

      await enviar(cliente, sinLugar(prefijo))

      const enviado = deCalificar().at(-1)?.cuerpo as { puntajes: unknown[]; version: number }
      expect(enviado.puntajes).toHaveLength(rubricaNueva.length)
      expect(enviado.version).toBe(2)
      for (const nombre of campos) expect(campo(nombre)).toHaveValue("1")
      fueraDeEspera()
      if (marcado === null) {
        expect(avisos()).toEqual([MENSAJE_RUBRICA, MENSAJE])
        expect(marcados()).toEqual([])
        expect(botonGuardar()).toHaveFocus()
      } else {
        expect(avisos()).toEqual([MENSAJE_RUBRICA])
        expect(marcados()).toEqual([marcado])
        expect(screen.getAllByText(MENSAJE)).toHaveLength(1)
        expect(document.activeElement?.getAttribute("name")).toBe(marcado)
      }
      expect(inesperadas).toEqual([])
    },
  )

  it("CAL-T-129: un 400 pintado, después un 409 que reinicia (sin la marca vieja) y después un 400 sin lugar: tres intentos, dos avisos y ninguna marca al final", async () => {
    const cliente = await abrir()
    llenarDosCriterios()

    await enviar(cliente, () => errorApi(400, "VALIDACION", `puntajes.0.puntos: ${MENSAJE}`))
    expect(marcados()).toEqual([`puntajes.${CRITERIO_1}`])
    expect(avisos()).toEqual([])

    await enviar(cliente, conflicto("ENTREGA_MODIFICADA", MENSAJE_MODIFICADA))
    expect(marcados()).toEqual([])
    expect(screen.queryByText(MENSAJE)).not.toBeInTheDocument()
    expect(encabezado()).toHaveFocus()

    llenarDosCriterios()
    await enviar(cliente, sinLugar("puntajes.0"))

    expect(avisos()).toEqual([MENSAJE_MODIFICADA, MENSAJE])
    expect(marcados()).toEqual([])
    conservadosDosCriterios()
    fueraDeEspera()
  })
})

describe("ataque 01c r3 · recarga de fondo que cambia la forma con un ErrorDeCampo pintado (M-06 y T-02)", () => {
  // [nombre, tarea de apertura, entrega de apertura, tarea tras la recarga, entrega tras la recarga,
  //  ¿la nota está al abrir?]
  const casos = [
    [
      "entregada → calificada por otra persona y la tarea con otra rúbrica",
      {},
      {},
      { rubrica: RUBRICA_NUEVA },
      calificadaPorOtro(3),
      false,
    ],
    [
      "asignado cerrada → calificada por otra persona",
      CERRADA,
      SIN_ENTREGA,
      CERRADA,
      calificadaPorOtro(3),
      true,
    ],
    [
      "asignado cerrada → la tarea acepta tardías y el alumno entrega tarde",
      CERRADA,
      SIN_ENTREGA,
      { fechaLimite: PASADA, aceptaTardias: true },
      {
        estado: "entregado",
        version: 3,
        fechaEntrega: "2030-01-10T11:30:00.000Z",
        conRetraso: true,
      },
      true,
    ],
  ] as const

  it.each(casos)(
    "CAL-T-130: %s: el campo marcado es el mismo nodo, sigue marcado una sola vez, con el foco y lo escrito, sin aviso; al escribir se quita la marca y el guardado sigue su 409",
    async (_nombre, tareaAntes, entregaAntes, tareaDespues, entregaDespues, conNota) => {
      tarea = tareaCon(tareaAntes)
      entrega = entregaCon(entregaAntes)
      const cliente = await abrir()
      if (conNota) expect(screen.getByText(NOTA)).toBeInTheDocument()
      llenarDosCriterios()
      await enviar(cliente, () => errorApi(400, "VALIDACION", `puntajes.0.puntos: ${MENSAJE}`))
      const nodo = campo(CLARIDAD)
      expect(nodo).toHaveFocus()
      expect(marcados()).toEqual([`puntajes.${CRITERIO_1}`])

      tarea = tareaCon(tareaDespues)
      entrega = entregaCon(entregaDespues)
      await recargarDeFondo(cliente)

      expect(screen.queryByText(NOTA)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(PUNTUALIDAD)).not.toBeInTheDocument()
      expect(campo(CLARIDAD)).toBe(nodo)
      expect(nodo).toHaveFocus()
      expect(marcados()).toEqual([`puntajes.${CRITERIO_1}`])
      expect(screen.getAllByText(MENSAJE)).toHaveLength(1)
      expect(nodo).toHaveAccessibleDescription(expect.stringContaining(MENSAJE) as string)
      conservadosDosCriterios()
      expect(avisos()).toEqual([])

      escribir(CLARIDAD, "5")
      expect(marcados()).toEqual([])
      expect(screen.queryByText(MENSAJE)).not.toBeInTheDocument()

      await enviar(cliente, conflicto("ENTREGA_MODIFICADA", MENSAJE_MODIFICADA))

      expect(avisos()).toEqual([MENSAJE_MODIFICADA])
      expect(deCalificar().at(-1)?.cuerpo).toMatchObject({ version: 2, puntosDeLaTarea: 10 })
      expect(encabezado()).toHaveFocus()
      expect(marcados()).toEqual([])
      expect(inesperadas).toEqual([])
    },
  )

  it("CAL-T-131: con Claridad marcada, una recarga que vuelve no calificable la entrega quita el formulario y la marca sin aviso (foco fuera de <body>); al cerrarse otra vez, el formulario nuevo nace limpio y un 400 sin lugar avisa una vez con la versión vigente", async () => {
    tarea = tareaCon(CERRADA)
    entrega = entregaCon(SIN_ENTREGA)
    const cliente = await abrir()
    llenarDosCriterios()
    await enviar(cliente, () => errorApi(400, "VALIDACION", `puntajes.0.puntos: ${MENSAJE}`))
    expect(marcados()).toEqual([`puntajes.${CRITERIO_1}`])

    tarea = tareaCon({ fechaLimite: FUTURA, aceptaTardias: false })
    await recargarDeFondo(cliente)

    expect(screen.queryByLabelText(CLARIDAD)).not.toBeInTheDocument()
    expect(screen.getByText(PODRAS)).toBeInTheDocument()
    expect(screen.queryByText(MENSAJE)).not.toBeInTheDocument()
    expect(marcados()).toEqual([])
    fueraDeBody()
    expect(avisos()).toEqual([])

    tarea = tareaCon(CERRADA)
    entrega = entregaCon({ ...SIN_ENTREGA, version: 5 })
    await recargarDeFondo(cliente)

    expect(campo(CLARIDAD)).toHaveValue("")
    expect(marcados()).toEqual([])
    expect(screen.queryByText(MENSAJE)).not.toBeInTheDocument()
    llenarDosCriterios()

    await enviar(cliente, sinLugar())

    expect(avisos()).toEqual([MENSAJE])
    expect(deCalificar().at(-1)?.cuerpo).toMatchObject({ version: 5 })
    expect(marcados()).toEqual([])
    conservadosDosCriterios()
    fueraDeEspera()
    expect(inesperadas).toEqual([])
  })
})

describe("ataque 01c r3 · el fallo de la tarea y un 400 sin lugar en la misma vista (M-07, T-03 y T-04)", () => {
  it("CAL-T-132: la tarea falla mientras la entrega está en vuelo (callado); al volver la entrega, un aviso de la tarea; después un 400 sin lugar da el suyo: dos en total y el panel intacto", async () => {
    const cliente = await abrir()
    llenarDosCriterios()
    const pendiente = diferida()
    tarea = tareaEn500
    entrega = () => pendiente.promesa
    avanzar(5_000)
    act(() => {
      void cliente.invalidateQueries()
    })
    await waitFor(() =>
      expect(llamadas.filter((l) => l.url === RUTA_ALUMNO).length).toBeGreaterThan(1),
    )
    await reposar()
    expect(avisos()).toEqual([])

    await act(async () => {
      pendiente.resolver(respuestaJson(200, { entrega: entregaDoble() }))
      await Promise.resolve()
    })
    entrega = entregaCon()
    await sinPeticionesEnVuelo(cliente)
    expect(avisos()).toEqual([AVISO_TAREA])

    await enviar(cliente, sinLugar("puntajes.0.criterioId"))

    expect(avisos()).toEqual([AVISO_TAREA, MENSAJE])
    expect(marcados()).toEqual([])
    conservadosDosCriterios()
    fueraDeEspera()
    expect(inesperadas).toEqual([])
  })

  it("CAL-T-132: el 400 sin lugar llega mientras el fallo de la tarea está callado (la entrega en vuelo): un aviso del 400 al instante y uno de la tarea al volver la entrega; nunca tres", async () => {
    const cliente = await abrir()
    llenarDosCriterios()
    const pendiente = diferida()
    tarea = tareaEn500
    entrega = () => pendiente.promesa
    avanzar(5_000)
    act(() => {
      void cliente.invalidateQueries()
    })
    await waitFor(() =>
      expect(llamadas.filter((l) => l.url === RUTA_ALUMNO).length).toBeGreaterThan(1),
    )
    await reposar()

    respuestasDeCalificar.push(sinLugar("puntajes.-1.puntos"))
    botonGuardar().focus()
    fireEvent.click(botonGuardar())
    await waitFor(() => expect(deCalificar()).toHaveLength(1))
    await waitFor(() => expect(avisos()).toEqual([MENSAJE]))
    await reposar()
    expect(avisos()).toEqual([MENSAJE])

    await act(async () => {
      pendiente.resolver(respuestaJson(200, { entrega: entregaDoble() }))
      await Promise.resolve()
    })
    entrega = entregaCon()
    await sinPeticionesEnVuelo(cliente)

    expect(avisos()).toEqual([MENSAJE, AVISO_TAREA])
    expect(marcados()).toEqual([])
    conservadosDosCriterios()
    fueraDeEspera()
  })

  it("CAL-T-133: 409 RUBRICA_MODIFICADA con la tarea en 500 y la entrega bien (sin reinicio, dos avisos); un 400 sin lugar después da uno más con la apertura vieja; con la tarea sana, un 409 nuevo reinicia: cuatro avisos, cada uno el suyo", async () => {
    const cliente = await abrir()
    llenarDosCriterios()
    tarea = tareaEn500

    await enviar(cliente, conflicto("RUBRICA_MODIFICADA", MENSAJE_RUBRICA))

    expect(avisos()).toEqual([MENSAJE_RUBRICA, AVISO_TAREA])
    conservadosDosCriterios()
    fueraDeEspera()

    await enviar(cliente, sinLugar("puntajes.1.criterioId"))

    expect(avisos()).toEqual([MENSAJE_RUBRICA, AVISO_TAREA, MENSAJE])
    expect(deCalificar().at(-1)?.cuerpo).toMatchObject({ version: 2, puntosDeLaTarea: 10 })
    expect(marcados()).toEqual([])
    conservadosDosCriterios()

    tarea = tareaCon({ rubrica: RUBRICA_NUEVA })
    await enviar(cliente, conflicto("RUBRICA_MODIFICADA", MENSAJE_RUBRICA))

    expect(avisos()).toEqual([MENSAJE_RUBRICA, AVISO_TAREA, MENSAJE, MENSAJE_RUBRICA])
    expect(campo(PUNTUALIDAD)).toHaveValue("")
    expect(encabezado()).toHaveFocus()
    expect(screen.queryByText(AVISO_RECARGA_ENTREGA)).not.toBeInTheDocument()
    expect(inesperadas).toEqual([])
  })
})

describe("ataque 01c r3 · el 400 sin lugar con la vista desmontada (T-04)", () => {
  it("CAL-T-134: «Volver a las entregas» con el PUT en vuelo; el 400 sin lugar llega después y da un solo aviso limpio, sin aviso de recarga", async () => {
    const cliente = await abrir()
    llenarDosCriterios()
    const pendiente = diferida()
    respuestasDeCalificar.push(() => pendiente.promesa)
    avanzar(5_000)
    fireEvent.click(botonGuardar())
    await waitFor(() => expect(deCalificar()).toHaveLength(1))

    fireEvent.click(screen.getByRole("link", { name: "Volver a las entregas" }))
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Calificación", level: 3 })).toBeNull(),
    )

    await act(async () => {
      pendiente.resolver(errorApi(400, "VALIDACION", `puntajes.0.criterioId: ${MENSAJE}`))
      await Promise.resolve()
    })
    await sinPeticionesEnVuelo(cliente)

    expect(avisos()).toEqual([MENSAJE])
    expect(inesperadas).toEqual([])
  })
})
