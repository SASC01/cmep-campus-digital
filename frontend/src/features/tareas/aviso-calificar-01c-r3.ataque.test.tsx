import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/services/apiClient"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { EntregaDeAlumnoView } from "./entrega-de-alumno-view"
import { useAnularEntrega, useComentarEnHilo, useEntregar } from "./hooks"
import { mensajeDeErrorTareas, mensajeDelAvisoDeCalificar } from "./lib"

// Ataque (CALIFICACIONES-01c, ronda 3): el remedio de T-04 (mensajeDelAvisoDeCalificar y el quinto
// parámetro de avisarDelErrorDeLaEntrega) y sus vecinos. Prefijos con puntos, dígitos, guiones y
// guiones bajos; prefijo sin mensaje; dos puntos dentro del mensaje; VALIDACION sin prefijo; otros
// códigos con dos puntos (no se recortan); claseId:, tareaId: y alumnoId: con su texto fijo; un aviso
// por intento, nunca dos ni cero; lo escrito y el botón; y las otras llamadas de
// avisarDelErrorDeLaEntrega sin cambio. Reloj fijo (solo Date). El servidor es un doble en memoria.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

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
const RUTA_HILO = `${RUTA_TAREA}/mi-entrega/comentarios`
const CLARIDAD = "Claridad (de 5 puntos)"
const ORTOGRAFIA = "Ortografía (de 4 puntos)"
const COMENTARIO = "Comentario para el alumno (opcional)"
const MENSAJE = "Revisa este valor."
const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const SIN_ALUMNO = "No encontramos a ese alumno en esta clase."
const SIN_TAREA = "Esa tarea ya no existe."
const SIN_ACCESO = "No tienes acceso a esta clase."

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
    rubrica: [
      { id: CRITERIO_1, criterio: "Claridad", puntosMax: 5 },
      { id: CRITERIO_2, criterio: "Ortografía", puntosMax: 4 },
    ],
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

// Lo que responde el servidor a un POST o un PUT (calificar, entregar, anular, comentar).
let escribirEnElServidor: () => Response | Promise<Response> = () => errorApi(500, "ERROR_INTERNO")
let llamadas: Llamada[] = []
let inesperadas: string[] = []

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  llamadas = []
  inesperadas = []
  escribirEnElServidor = () => errorApi(500, "ERROR_INTERNO")
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      llamadas.push({ metodo, url })
      if (metodo === "GET" && url === RUTA_TAREA) {
        return Promise.resolve(respuestaJson(200, tareaDoble()))
      }
      if (metodo === "GET" && url === RUTA_ALUMNO) {
        return Promise.resolve(respuestaJson(200, { entrega: entregaDoble() }))
      }
      if (metodo === "GET" && url.includes("/comentarios?")) {
        return Promise.resolve(respuestaJson(200, { comentarios: [], siguienteCursor: null }))
      }
      if (metodo === "PUT" || metodo === "POST") return Promise.resolve(escribirEnElServidor())
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

const nuevoCliente = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

const sinPeticionesEnVuelo = async (cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isFetching() + cliente.isMutating()).toBe(0))
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const renderVista = async () => {
  const cliente = nuevoCliente()
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

const llenar = () => {
  escribir(CLARIDAD, "4")
  escribir(ORTOGRAFIA, "3")
  escribir(COMENTARIO, "Buen trabajo")
}

const conservado = () => {
  expect(screen.getByLabelText(CLARIDAD)).toHaveValue("4")
  expect(screen.getByLabelText(ORTOGRAFIA)).toHaveValue("3")
  expect(screen.getByLabelText(COMENTARIO)).toHaveValue("Buen trabajo")
  expect(boton()).not.toHaveAttribute("aria-busy", "true")
  expect(boton()).not.toHaveAttribute("aria-disabled", "true")
}

// Un 400 VALIDACION de calificar que el panel no pinta: exactamente un aviso por intento (el
// esperado), ningún campo marcado, lo escrito conservado, el botón fuera de la espera y con el foco.
const unAvisoPorIntento = async (mensajeDelServidor: string, esperado: string) => {
  escribirEnElServidor = () => errorApi(400, "VALIDACION", mensajeDelServidor)
  const cliente = await renderVista()
  llenar()

  await enviar(cliente)

  expect(avisos()).toEqual([esperado])
  expect(marcados()).toEqual([])
  expect(boton()).toHaveFocus()
  conservado()

  await enviar(cliente)

  expect(avisos()).toEqual([esperado, esperado])
  expect(marcados()).toEqual([])
  conservado()
  expect(inesperadas).toEqual([])
}

describe("ataque 01c r3 · prefijos de ruta en el aviso de calificar (T-04)", () => {
  // Rutas que el panel no pinta: con puntos, dígitos, guiones, guiones bajos, mayúsculas, un índice
  // que no es entero, una ruta más larga que la de un campo pintable, un prefijo de un solo carácter,
  // y sin espacio o con un tabulador después de los dos puntos.
  const casos = [
    `puntajes.0.criterioId: ${MENSAJE}`,
    `puntajes.19.criterioId: ${MENSAJE}`,
    `puntajes.0.puntos.extra: ${MENSAJE}`,
    `PUNTAJES.0.PUNTOS: ${MENSAJE}`,
    `puntajes.1e0.puntos: ${MENSAJE}`,
    `puntajes_0-x.y: ${MENSAJE}`,
    `a.b.c.d.e.f.g.h: ${MENSAJE}`,
    `comentario.0: ${MENSAJE}`,
    `calificacionX: ${MENSAJE}`,
    `version.0: ${MENSAJE}`,
    `0: ${MENSAJE}`,
    `-: ${MENSAJE}`,
    `_: ${MENSAJE}`,
    `.: ${MENSAJE}`,
    `puntajes.0.criterioId:${MENSAJE}`,
    `puntajes.0.criterioId:\t${MENSAJE}`,
    `puntajes.0.criterioId:   ${MENSAJE}`,
  ] as const

  it.each(casos)(
    "CAL-T-119: %j da un aviso por intento, «Revisa este valor.», sin campo marcado, con lo escrito y el botón fuera de la espera",
    async (mensajeDelServidor) => {
      await unAvisoPorIntento(mensajeDelServidor, MENSAJE)
    },
  )

  // Prefijo sin mensaje (con y sin espacios o saltos detrás): el genérico, nunca un aviso vacío.
  const vacios = [
    "puntajes.0.criterioId:",
    "puntajes.0.criterioId:   ",
    "puntajes.0:\n",
    "version:",
    "cuerpo: ",
    "-:",
    "puntajes.-1.puntos:",
  ] as const

  it.each(vacios)(
    "CAL-T-120: %j (prefijo sin mensaje) da el aviso genérico, uno por intento, nunca uno vacío",
    async (mensajeDelServidor) => {
      await unAvisoPorIntento(mensajeDelServidor, GENERICO)
    },
  )

  // Dos puntos dentro del mensaje, después de una ruta con puntos (un solo recorte: el de la ruta).
  const conDosPuntos = [
    ["puntajes.0.criterioId: Debe ser 0: 10", "Debe ser 0: 10"],
    ["puntajes.0: Llegó a las 14:30", "Llegó a las 14:30"],
    ["puntajes.0.criterioId: 14:30 no es válido", "14:30 no es válido"],
    ["puntajes.1.criterioId: Valor: 10", "Valor: 10"],
    ['cuerpo: Unrecognized key: "nota"', 'Unrecognized key: "nota"'],
    ['puntajes.0: Unrecognized key: "nota"', 'Unrecognized key: "nota"'],
  ] as const

  it.each(conDosPuntos)(
    "CAL-T-121: «%s» da «%s» (solo se quita la ruta, no lo que sigue)",
    async (mensajeDelServidor, esperado) => {
      await unAvisoPorIntento(mensajeDelServidor, esperado)
    },
  )

  // Un VALIDACION sin prefijo: se muestra tal cual (incluido el de caracteres no permitidos de
  // adapters/db/errores.ts y el de un mensaje con dos puntos después de un espacio).
  const sinPrefijo = [
    MENSAJE,
    "Debe ser 0: 10",
    "Los datos enviados tienen caracteres no permitidos.",
    "No repitas un criterio",
    "Calificación de 0 a 10: revisa los puntos",
  ] as const

  it.each(sinPrefijo)(
    "CAL-T-122: VALIDACION sin prefijo «%s» se avisa tal cual, uno por intento",
    async (mensajeDelServidor) => {
      await unAvisoPorIntento(mensajeDelServidor, mensajeDelServidor)
    },
  )
})

describe("ataque 01c r3 · lo que no es un VALIDACION no se recorta (T-04)", () => {
  // [estado, código, mensaje del servidor, aviso esperado]
  const casos = [
    [503, "SERVICIO_OCUPADO", "Ocupado: inténtalo en 5 s", "Ocupado: inténtalo en 5 s"],
    [503, "SERVICIO_OCUPADO", "puntajes.0: ocupado", "puntajes.0: ocupado"],
    [409, "EDICION_NO_PERMITIDA", "Nota: no puedes", "Nota: no puedes"],
    [409, "ENTREGA_CERRADA", "a.b: c", "a.b: c"],
    [409, "TAREA_CON_CALIFICACIONES", "14:30 ya tiene", "14:30 ya tiene"],
    [500, "ERROR_INTERNO", "puntajes.0.criterioId: boom", GENERICO],
    [418, "OTRO_CODIGO", "version: x", GENERICO],
    [404, "TAREA_NO_ENCONTRADA", "tareaId: x", SIN_TAREA],
  ] as const

  it.each(casos)(
    "CAL-T-123: %i %s con «%s» da exactamente un aviso «%s» (sin recorte)",
    async (estado, codigo, mensajeDelServidor, esperado) => {
      escribirEnElServidor = () => errorApi(estado, codigo, mensajeDelServidor)
      const cliente = await renderVista()
      llenar()

      await enviar(cliente)

      expect(avisos()).toEqual([esperado])
      expect(marcados()).toEqual([])
      expect(inesperadas).toEqual([])
    },
  )

  it("CAL-T-123: un 409 ENTREGA_MODIFICADA con «Nota: …» conserva su texto entero (el 409 no pasa por el recorte)", async () => {
    escribirEnElServidor = () => errorApi(409, "ENTREGA_MODIFICADA", "Nota: la entrega cambió")
    const cliente = await renderVista()
    llenar()

    await enviar(cliente)

    expect(avisos()).toEqual(["Nota: la entrega cambió"])
    expect(screen.getByRole("heading", { name: "Calificación", level: 3 })).toHaveFocus()
    expect(inesperadas).toEqual([])
  })

  it("CAL-T-123: sin conexión, el genérico una vez por intento", async () => {
    escribirEnElServidor = () => Promise.reject(new TypeError("Failed to fetch"))
    const cliente = await renderVista()
    llenar()

    await enviar(cliente)
    await enviar(cliente)

    expect(avisos()).toEqual([GENERICO, GENERICO])
    conservado()
  })
})

describe("ataque 01c r3 · claseId:, tareaId: y alumnoId: siguen con su texto fijo (T-04)", () => {
  const casos = [
    ["claseId: Debe ser un identificador válido", SIN_ACCESO],
    ["tareaId: Debe ser un identificador válido", SIN_TAREA],
    ["alumnoId: Debe ser un identificador válido", SIN_ALUMNO],
    ["alumnoId:", SIN_ALUMNO],
    ["claseId.0: Revisa este valor.", MENSAJE],
    ["tareaIdX: Revisa este valor.", MENSAJE],
    ["alumnoId.puntos: Revisa este valor.", MENSAJE],
  ] as const

  it.each(casos)(
    "CAL-T-124: «%s» da exactamente un aviso «%s», sin campo marcado y con lo escrito",
    async (mensajeDelServidor, esperado) => {
      escribirEnElServidor = () => errorApi(400, "VALIDACION", mensajeDelServidor)
      const cliente = await renderVista()
      llenar()

      await enviar(cliente)

      expect(avisos()).toEqual([esperado])
      expect(marcados()).toEqual([])
      conservado()
      expect(inesperadas).toEqual([])
    },
  )
})

describe("ataque 01c r3 · doble clic con un 400 sin lugar (T-04)", () => {
  it("CAL-T-125: dos clics seguidos mandan un PUT y dan un solo aviso limpio", async () => {
    escribirEnElServidor = () => errorApi(400, "VALIDACION", `puntajes.0.criterioId: ${MENSAJE}`)
    const cliente = await renderVista()
    llenar()

    vi.setSystemTime(new Date(Date.now() + 5_000))
    fireEvent.click(boton())
    fireEvent.click(boton())
    await waitFor(() => expect(deCalificar()).toHaveLength(1))
    await sinPeticionesEnVuelo(cliente)

    expect(deCalificar()).toHaveLength(1)
    expect(avisos()).toEqual([MENSAJE])
    conservado()
  })
})

describe("ataque 01c r3 · mensajeDelAvisoDeCalificar, directo (T-04)", () => {
  // [código, mensaje del servidor, esperado]
  const casos = [
    ["VALIDACION", "puntajes.0.criterioId: Revisa", "Revisa"],
    ["VALIDACION", "puntajes.0.criterioId:", GENERICO],
    ["VALIDACION", "claseId: x", SIN_ACCESO],
    ["VALIDACION", "tareaId: x", SIN_TAREA],
    ["VALIDACION", "alumnoId: x", SIN_ALUMNO],
    ["VALIDACION", "rubrica.0.criterio: Escribe el criterio", "Escribe el criterio"],
    ["VALIDACION", "Debe ser 0: 10", "Debe ser 0: 10"],
    ["SERVICIO_OCUPADO", "x: y", "x: y"],
    ["ENTREGA_MODIFICADA", "a.b.c: d", "a.b.c: d"],
    ["ERROR_INTERNO", "a: b", GENERICO],
  ] as const

  it.each(casos)("CAL-T-126: %s %j da %j", (codigo, mensaje, esperado) => {
    expect(mensajeDelAvisoDeCalificar(new ApiError(codigo, mensaje, 400))).toBe(esperado)
  })

  it("CAL-T-126: sin un ApiError (red o nada), el genérico", () => {
    expect(mensajeDelAvisoDeCalificar(new TypeError("Failed to fetch"))).toBe(GENERICO)
    expect(mensajeDelAvisoDeCalificar(undefined)).toBe(GENERICO)
  })
})

describe("ataque 01c r3 · las otras llamadas de avisarDelErrorDeLaEntrega no cambian (T-04)", () => {
  const conCliente = () => {
    const cliente = nuevoCliente()
    const envoltura = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
    )
    return { cliente, envoltura }
  }

  // [estado, código, mensaje del servidor]. El aviso de entregar, anular y comentar sigue siendo el de
  // mensajeDeErrorTareas (los hermanos con puntos de entregar van al chore posterior: decisión ya
  // tomada; aquí solo se comprueba que el texto es el mismo de antes del remedio).
  const errores = [
    [400, "VALIDACION", 'cuerpo: Unrecognized key: "x"'],
    [400, "VALIDACION", MENSAJE],
    [400, "VALIDACION", "archivoIds.0: Un archivo adjunto no es válido"],
    [400, "VALIDACION", "tareaId: x"],
    [503, "SERVICIO_OCUPADO", "Ocupado: espera"],
    [409, "ENTREGA_CERRADA", "La entrega ya está cerrada."],
    [500, "ERROR_INTERNO", "boom"],
  ] as const

  type Mutar = (datos?: unknown) => void

  const mutaciones: readonly (readonly [string, () => { mutate: Mutar }, unknown])[] = [
    [
      "entregar",
      () => {
        const mutacion = useEntregar(CLASE_ID, TAREA_ID)
        return {
          mutate: (datos) => mutacion.mutate(datos as Parameters<typeof mutacion.mutate>[0]),
        }
      },
      { archivoIds: [], enlaces: [] },
    ],
    [
      "anular",
      () => {
        const mutacion = useAnularEntrega(CLASE_ID, TAREA_ID)
        return { mutate: () => mutacion.mutate() }
      },
      undefined,
    ],
    [
      "comentar",
      () => {
        const mutacion = useComentarEnHilo(CLASE_ID, TAREA_ID, RUTA_HILO)
        return {
          mutate: (datos) => mutacion.mutate(datos as Parameters<typeof mutacion.mutate>[0]),
        }
      },
      { texto: "Hola, maestro" },
    ],
  ]

  const combinaciones = mutaciones.flatMap(([nombre, gancho, datos]) =>
    errores.map(
      ([estado, codigo, mensaje]) => [nombre, estado, codigo, mensaje, gancho, datos] as const,
    ),
  )

  it.each(combinaciones)(
    "CAL-T-127: %s con %i %s «%s» avisa una vez con el texto de mensajeDeErrorTareas",
    async (_nombre, estado, codigo, mensaje, gancho, datos) => {
      escribirEnElServidor = () => errorApi(estado, codigo, mensaje)
      const { cliente, envoltura } = conCliente()
      const { result } = renderHook(gancho, { wrapper: envoltura })

      act(() => {
        result.current.mutate(datos)
      })
      await waitFor(() => expect(aviso.error).toHaveBeenCalled())
      await sinPeticionesEnVuelo(cliente)

      expect(avisos()).toEqual([mensajeDeErrorTareas(new ApiError(codigo, mensaje, estado))])
    },
  )

  it("CAL-T-127: en hooks.ts solo calificar pasa mensajeDelAvisoDeCalificar; las otras cuatro llamadas siguen con cuatro argumentos", () => {
    const hooks = fuentes["/src/features/tareas/hooks.ts"]
    if (hooks === undefined) throw new Error("Precondición: existe src/features/tareas/hooks.ts")
    const llamadasAlAviso = Array.from(
      hooks.matchAll(/(?<!const )avisarDelErrorDeLaEntrega\(([^)]*)\)/g),
      (coincidencia) => coincidencia[1]?.replace(/\s+/g, " ").trim() ?? "",
    )
    expect(llamadasAlAviso).toHaveLength(5)
    const conMensaje = llamadasAlAviso.filter((args) => args.includes("mensajeDelAvisoDeCalificar"))
    expect(conMensaje).toEqual(["queryClient, claseId, tareaId, error, mensajeDelAvisoDeCalificar"])
    const sinMensaje = llamadasAlAviso.filter(
      (args) => !args.includes("mensajeDelAvisoDeCalificar"),
    )
    expect(sinMensaje).toEqual(Array<string>(4).fill("queryClient, claseId, tareaId, error"))
    const inicioDeCalificar = hooks.indexOf("export const useCalificarEntrega")
    expect(inicioDeCalificar).toBeGreaterThan(-1)
    expect(hooks.indexOf("error, mensajeDelAvisoDeCalificar)")).toBeGreaterThan(inicioDeCalificar)
    const deProduccion = Object.entries(fuentes).filter(
      ([ruta, texto]) =>
        !/\.test\.tsx?$/.test(ruta) && texto.includes("mensajeDelAvisoDeCalificar"),
    )
    expect(deProduccion.map(([ruta]) => ruta).sort()).toEqual([
      "/src/features/tareas/hooks.ts",
      "/src/features/tareas/lib.ts",
    ])
  })
})

describe("ataque 01c r3 · prefijo pintable sin mensaje (vecino de T-04 en el camino de T-02)", () => {
  // El mismo «prefijo sin mensaje» de CAL-T-120, pero con un prefijo que el panel sí pinta: el campo
  // queda marcado y con el foco; su ErrorDeCampo debe decir algo (nunca un error vacío), igual que el
  // aviso del gancho da el genérico cuando no queda mensaje (CAL-1C06e vecino).
  const casos = [
    ["puntajes.0.puntos:", `puntajes.${CRITERIO_1}`],
    ["puntajes.1.puntos:   ", `puntajes.${CRITERIO_2}`],
    ["comentario:", "comentario"],
  ] as const

  it.each(casos)(
    "CAL-T-135: %j marca su campo con un ErrorDeCampo que tiene texto, sin aviso",
    async (mensajeDelServidor, nombre) => {
      escribirEnElServidor = () => errorApi(400, "VALIDACION", mensajeDelServidor)
      const cliente = await renderVista()
      llenar()

      await enviar(cliente)

      expect(avisos()).toEqual([])
      expect(marcados()).toEqual([nombre])
      const marcado = document.querySelector(`[name="${nombre}"]`)
      if (marcado === null) throw new Error(`Precondición: existe el campo ${nombre}`)
      expect(marcado).toHaveFocus()
      const idDelError = (marcado.getAttribute("aria-describedby") ?? "")
        .split(" ")
        .find((id) => id.endsWith("-error"))
      if (idDelError === undefined) throw new Error("Precondición: el campo apunta a su error")
      const error = document.getElementById(idDelError)
      if (error === null) throw new Error("Precondición: existe el ErrorDeCampo")
      expect((error.textContent ?? "").trim()).not.toBe("")
      conservado()
    },
  )
})
