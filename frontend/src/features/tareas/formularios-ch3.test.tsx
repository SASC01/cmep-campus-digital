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

import { TEXTOS_ADJUNTOS } from "@/components/adjuntos/data"
import {
  CAMPO_FUERA_DE_CONTRATO,
  ENTRADAS_DE_FORMULARIO,
  MENSAJE_DE_PRUEBA,
} from "@/lib/errores-de-api-fuera-de-contrato"
import { ApiError } from "@/services/apiClient"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { CrearTareaView } from "./crear-tarea-view"
import { DetalleTareaView } from "./detalle-tarea-view"
import { EditarTareaView } from "./editar-tarea-view"
import { EntregaDeAlumnoView } from "./entrega-de-alumno-view"
import { useAnularEntrega, useAvisoDeRecargaFallida, useBorrarTarea } from "./hooks"

// CHORE-03 (03a): los formularios y los controles de features/tareas ante un 400 VALIDACION fuera de
// contrato (la tabla común: F1 campo no pintable, F2 campo pintado sin texto visible, F3 sin texto
// visible y sin ruta, F4 ruta de tres niveles). En cada caso: exactamente un mensaje legible (un aviso
// o un ErrorDeCampo, nunca los dos ni ninguno), sin la ruta ni un texto invisible, lo escrito se
// conserva y el botón sale de la espera. Una sola función de montaje y una prueba parametrizada por
// formulario (indicación del humano, 2026-10-26). Reloj fijo (solo Date). El servidor es un doble en
// memoria.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const FECHA_LOCAL = "2030-01-15T10:00"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ALUMNO_ID = "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0301"
const CRITERIO_1 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d81"
const CRITERIO_2 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d82"
const ORIGEN_ALMACEN = "https://almacen.ejemplo.mx"
const RUTA_CLASE = `/api/clases/${CLASE_ID}`
const RUTA_TAREA = `${RUTA_CLASE}/tareas/${TAREA_ID}`
const RUTA_MI_ENTREGA = `${RUTA_TAREA}/entrega`
const RUTA_ALUMNO = `${RUTA_TAREA}/entregas/${ALUMNO_ID}`
const RUTA_CALIFICACION = `${RUTA_ALUMNO}/calificacion`
const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const CLARIDAD = "Claridad (de 5 puntos)"
const ORTOGRAFIA = "Ortografía (de 4 puntos)"
const CALIFICACION = "Calificación (de 80 puntos)"
const COMENTARIO = "Comentario para el alumno (opcional)"
const ENLACE = "https://ejemplo.com/mi-trabajo"
const ARCHIVO = "ensayo.pdf"
const uuid = (n: number) => `9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`

let conRubrica = true

const tareaDoble = () => ({
  tarea: {
    id: TAREA_ID,
    titulo: "Ensayo final",
    instrucciones: "",
    fechaLimite: FUTURA,
    puntos: conRubrica ? 10 : 80,
    aceptaTardias: true,
    requiereAdjuntos: true,
    version: 0,
    categoria: null,
    tema: null,
    rubrica: conRubrica
      ? [
          { id: CRITERIO_1, criterio: "Claridad", puntosMax: 5 },
          { id: CRITERIO_2, criterio: "Ortografía", puntosMax: 4 },
        ]
      : [],
    adjuntos: [],
    autor: { id: uuid(1), nombre: "Luis Pérez", administracion: false },
    creadoEn: "2030-01-01T15:30:00.000Z",
    actualizadoEn: "2030-01-01T15:30:00.000Z",
    puedeEditar: true,
    puedeBorrar: true,
  },
})

const miEntrega = {
  estado: "asignado",
  fechaEntrega: null,
  conRetraso: false,
  enlaces: [],
  adjuntos: [],
  puedeEntregar: true,
  puedeAnular: false,
  calificacion: null,
}

const entregaDeAlumno = {
  alumno: { id: ALUMNO_ID, nombre: "Ana Ruiz" },
  estado: "entregado",
  fechaEntrega: "2030-01-09T15:30:00.000Z",
  conRetraso: false,
  enlaces: [],
  adjuntos: [],
  version: 2,
  calificacion: null,
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const validacion = (mensaje: string) => errorApi(400, "VALIDACION", mensaje)

const solicitudDeSubida = (n: number) =>
  respuestaJson(201, {
    archivo: { id: uuid(500 + n), nombre: ARCHIVO, tipo: "application/pdf", tamano: 9 },
    subida: {
      url: `${ORIGEN_ALMACEN}/subida/${String(n)}`,
      metodo: "PUT",
      cabeceras: { "Content-Type": "application/pdf" },
      expiraEn: "2030-01-10T12:05:00.000Z",
    },
  })

interface Llamada {
  metodo: string
  url: string
}

// La petición que se responde con `respuestas` (en orden); las demás, con lo de siempre.
let esLaPeticion: (llamada: Llamada) => boolean = () => false
let respuestas: (() => Response)[] = []
let llamadas: Llamada[] = []
let inesperadas: string[] = []

const instalarServidor = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      const llamada = { metodo, url }
      llamadas.push(llamada)
      if (esLaPeticion(llamada)) {
        const siguiente = respuestas.shift()
        if (siguiente !== undefined) return Promise.resolve(siguiente())
        inesperadas.push(`${metodo} ${url} sin respuesta preparada`)
        return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
      }
      if (url.startsWith(ORIGEN_ALMACEN)) {
        return Promise.resolve(new Response(null, { status: 200 }))
      }
      if (metodo === "GET" && url === RUTA_TAREA) {
        return Promise.resolve(respuestaJson(200, tareaDoble()))
      }
      if (metodo === "GET" && url === `${RUTA_CLASE}/categorias`) {
        return Promise.resolve(respuestaJson(200, { categorias: [] }))
      }
      if (metodo === "GET" && url === `${RUTA_CLASE}/temas`) {
        return Promise.resolve(respuestaJson(200, { temas: [], sinTema: 0 }))
      }
      if (metodo === "GET" && url === RUTA_MI_ENTREGA) {
        return Promise.resolve(respuestaJson(200, { entrega: miEntrega }))
      }
      if (metodo === "GET" && url === RUTA_ALUMNO) {
        return Promise.resolve(respuestaJson(200, { entrega: entregaDeAlumno }))
      }
      if (metodo === "GET" && url.includes("/comentarios?")) {
        return Promise.resolve(respuestaJson(200, { comentarios: [], siguienteCursor: null }))
      }
      if (metodo === "POST" && url.endsWith("/archivos")) {
        return Promise.resolve(solicitudDeSubida(llamadas.length))
      }
      inesperadas.push(`${metodo} ${url}`)
      return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  conRubrica = true
  esLaPeticion = () => false
  respuestas = []
  llamadas = []
  inesperadas = []
  instalarServidor()
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

const asentar = async (cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isFetching() + cliente.isMutating()).toBe(0))
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

// La única función de montaje del módulo (R-01): todas las vistas de tareas con un formulario.
const montar = async (ruta: string) => {
  const cliente = nuevoCliente()
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/maestro/clases/:claseId/tareas/nueva" element={<CrearTareaView />} />
          <Route
            path="/maestro/clases/:claseId/tareas/:tareaId/editar"
            element={<EditarTareaView />}
          />
          <Route
            path="/maestro/clases/:claseId/tareas/:tareaId/entregas/:alumnoId"
            element={<EntregaDeAlumnoView />}
          />
          <Route
            path="/estudiante/clases/:claseId/tareas/:tareaId"
            element={<DetalleTareaView />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await asentar(cliente)
  return cliente
}

const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })

const elegirArchivo = () =>
  fireEvent.change(screen.getByLabelText(TEXTOS_ADJUNTOS.adjuntar), {
    target: { files: [new File(["contenido"], ARCHIVO, { type: "application/pdf" })] },
  })

// Los ErrorDeCampo de la vista: todos llevan un id que termina en "-error" (o "-error-servidor", el de
// los enlaces) o en "-vacia" (la entrega vacía).
const erroresDeCampo = () =>
  Array.from(document.querySelectorAll("[id]"))
    .filter((elemento) => /-(error|vacia)(-servidor)?$/.test(elemento.id))
    .map((elemento) => (elemento.textContent ?? "").trim())

const avisos = () => aviso.error.mock.calls.map((llamada) => String(llamada[0]))

// (a) y (b): exactamente un mensaje legible, sin la ruta ni un texto invisible.
const unSoloMensaje = (esperado: { aviso: string } | { campo: string }) => {
  const todos = [...avisos(), ...erroresDeCampo()]
  expect(todos).toHaveLength(1)
  for (const texto of todos) {
    expect(texto.trim().length).toBeGreaterThan(0)
    expect(texto).not.toContain(CAMPO_FUERA_DE_CONTRATO)
    expect(texto).not.toContain("archivoIds")
  }
  if ("aviso" in esperado) {
    expect(avisos()).toEqual([esperado.aviso])
    expect(erroresDeCampo()).toEqual([])
    return
  }
  expect(avisos()).toEqual([])
  expect(erroresDeCampo()).toEqual([esperado.campo])
}

interface CampoPintado {
  prefijo: string
  control: () => HTMLElement
}

interface Formulario {
  nombre: string
  ruta: string
  preparar: () => void
  listo: () => Promise<unknown>
  llenar: () => void
  boton: () => HTMLElement
  envio: (llamada: Llamada) => boolean
  camposPintados: readonly CampoPintado[]
  conservado: () => void
}

const porEtiqueta = (etiqueta: string) => () => screen.getByLabelText(etiqueta)

const FORMULARIOS: readonly Formulario[] = [
  {
    nombre: "crear tarea",
    ruta: `/maestro/clases/${CLASE_ID}/tareas/nueva`,
    preparar: () => undefined,
    listo: () => screen.findByLabelText("Título"),
    llenar: () => {
      escribir("Título", "Ensayo")
      escribir("Fecha límite", FECHA_LOCAL)
    },
    boton: () => screen.getByRole("button", { name: "Publicar tarea" }),
    envio: ({ metodo, url }) => metodo === "POST" && url === `${RUTA_CLASE}/tareas`,
    camposPintados: [{ prefijo: "titulo", control: porEtiqueta("Título") }],
    conservado: () => {
      expect(screen.getByLabelText("Título")).toHaveValue("Ensayo")
      expect(screen.getByLabelText("Fecha límite")).toHaveValue(FECHA_LOCAL)
    },
  },
  {
    nombre: "editar tarea",
    ruta: `/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/editar`,
    preparar: () => undefined,
    listo: () => screen.findByDisplayValue("Ensayo final"),
    llenar: () => escribir("Título", "Ensayo corregido"),
    boton: () => screen.getByRole("button", { name: "Guardar cambios" }),
    envio: ({ metodo, url }) => metodo === "PUT" && url === RUTA_TAREA,
    camposPintados: [{ prefijo: "titulo", control: porEtiqueta("Título") }],
    conservado: () => expect(screen.getByLabelText("Título")).toHaveValue("Ensayo corregido"),
  },
  {
    nombre: "entregar",
    ruta: `/estudiante/clases/${CLASE_ID}/tareas/${TAREA_ID}`,
    preparar: () => undefined,
    listo: () => screen.findByRole("button", { name: "Entregar tarea" }),
    llenar: () => {
      escribir("Enlace", ENLACE)
      fireEvent.click(screen.getByRole("button", { name: "Agregar enlace" }))
    },
    boton: () => screen.getByRole("button", { name: "Entregar tarea" }),
    envio: ({ metodo, url }) => metodo === "POST" && url === RUTA_MI_ENTREGA,
    camposPintados: [{ prefijo: "enlaces.0", control: porEtiqueta("Enlace") }],
    conservado: () =>
      expect(screen.getByRole("list", { name: "Enlaces agregados" })).toHaveTextContent(ENLACE),
  },
  {
    nombre: "comentario privado del alumno",
    ruta: `/estudiante/clases/${CLASE_ID}/tareas/${TAREA_ID}`,
    preparar: () => undefined,
    listo: () => screen.findByLabelText("Comentario privado"),
    llenar: () => escribir("Comentario privado", "Tengo una duda"),
    boton: () => screen.getByRole("button", { name: "Enviar comentario" }),
    envio: ({ metodo, url }) => metodo === "POST" && url === `${RUTA_MI_ENTREGA}/comentarios`,
    camposPintados: [{ prefijo: "texto", control: porEtiqueta("Comentario privado") }],
    conservado: () =>
      expect(screen.getByLabelText("Comentario privado")).toHaveValue("Tengo una duda"),
  },
  {
    nombre: "comentario privado del maestro",
    ruta: `/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/entregas/${ALUMNO_ID}`,
    preparar: () => undefined,
    listo: () => screen.findByLabelText("Comentario privado"),
    llenar: () => escribir("Comentario privado", "Revisa la conclusión"),
    boton: () => screen.getByRole("button", { name: "Enviar comentario" }),
    envio: ({ metodo, url }) => metodo === "POST" && url === `${RUTA_ALUMNO}/comentarios`,
    camposPintados: [{ prefijo: "texto", control: porEtiqueta("Comentario privado") }],
    conservado: () =>
      expect(screen.getByLabelText("Comentario privado")).toHaveValue("Revisa la conclusión"),
  },
  {
    nombre: "panel de calificación con rúbrica",
    ruta: `/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/entregas/${ALUMNO_ID}`,
    preparar: () => {
      conRubrica = true
    },
    listo: () => screen.findByLabelText(COMENTARIO),
    llenar: () => {
      escribir(CLARIDAD, "4")
      escribir(ORTOGRAFIA, "3")
      escribir(COMENTARIO, "Buen trabajo")
    },
    boton: () => screen.getByRole("button", { name: "Calificar y devolver" }),
    envio: ({ metodo, url }) => metodo === "PUT" && url === RUTA_CALIFICACION,
    camposPintados: [
      { prefijo: "comentario", control: porEtiqueta(COMENTARIO) },
      { prefijo: "puntajes.0.puntos", control: porEtiqueta(CLARIDAD) },
    ],
    conservado: () => {
      expect(screen.getByLabelText(CLARIDAD)).toHaveValue("4")
      expect(screen.getByLabelText(ORTOGRAFIA)).toHaveValue("3")
      expect(screen.getByLabelText(COMENTARIO)).toHaveValue("Buen trabajo")
    },
  },
  {
    nombre: "panel de calificación sin rúbrica",
    ruta: `/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/entregas/${ALUMNO_ID}`,
    preparar: () => {
      conRubrica = false
    },
    listo: () => screen.findByLabelText(CALIFICACION),
    llenar: () => {
      escribir(CALIFICACION, "72.5")
      escribir(COMENTARIO, "Buen trabajo")
    },
    boton: () => screen.getByRole("button", { name: "Calificar y devolver" }),
    envio: ({ metodo, url }) => metodo === "PUT" && url === RUTA_CALIFICACION,
    camposPintados: [
      { prefijo: "calificacion", control: porEtiqueta(CALIFICACION) },
      { prefijo: "comentario", control: porEtiqueta(COMENTARIO) },
    ],
    conservado: () => {
      expect(screen.getByLabelText(CALIFICACION)).toHaveValue("72.5")
      expect(screen.getByLabelText(COMENTARIO)).toHaveValue("Buen trabajo")
    },
  },
]

const abrir = async (formulario: Formulario) => {
  formulario.preparar()
  esLaPeticion = formulario.envio
  const cliente = await montar(formulario.ruta)
  await formulario.listo()
  await asentar(cliente)
  formulario.llenar()
  return cliente
}

const enviar = async (formulario: Formulario, cliente: QueryClient) => {
  const antes = llamadas.filter(formulario.envio).length
  formulario.boton().focus()
  fireEvent.click(formulario.boton())
  await waitFor(() => expect(llamadas.filter(formulario.envio)).toHaveLength(antes + 1))
  await asentar(cliente)
}

// (c) y (d): lo escrito sigue y el botón salió de la espera.
const conservadoYSinEspera = (formulario: Formulario) => {
  formulario.conservado()
  expect(formulario.boton()).not.toHaveAttribute("aria-busy", "true")
  expect(formulario.boton()).not.toHaveAttribute("aria-disabled", "true")
}

const ENTRADAS_CON_AVISO = [
  ["F1", ENTRADAS_DE_FORMULARIO["campo-no-pintable"]],
  ["F3", ENTRADAS_DE_FORMULARIO["sin-texto-visible"]],
  ["F4", ENTRADAS_DE_FORMULARIO.ruta],
] as const

const RESTOS_DE_F2 = ["   ", "\u{200B}"] as const

const casosConAviso = FORMULARIOS.flatMap((formulario) =>
  ENTRADAS_CON_AVISO.map(([nombre, entrada]) => ({ formulario, nombre, entrada })),
)

const casosDeF2 = FORMULARIOS.flatMap((formulario) =>
  formulario.camposPintados.flatMap((campo) =>
    RESTOS_DE_F2.map((resto) => ({ formulario, campo, resto })),
  ),
)

describe("CHORE-03 · formularios de tareas ante un VALIDACION fuera de contrato", () => {
  it.each(casosConAviso)(
    "CH3-A14: $formulario.nombre con $nombre da un solo aviso legible, ningún ErrorDeCampo, conserva lo escrito y el botón sale de la espera",
    async ({ formulario, entrada }) => {
      respuestas = [() => validacion(entrada.mensaje)]
      const cliente = await abrir(formulario)

      await enviar(formulario, cliente)

      unSoloMensaje({ aviso: entrada.resto ?? GENERICO })
      expect(formulario.boton()).toHaveFocus()
      conservadoYSinEspera(formulario)
      expect(inesperadas).toEqual([])
    },
  )

  it.each(casosDeF2)(
    "CH3-A14: $formulario.nombre con F2 en $campo.prefijo ($resto) marca ese campo con el genérico, sin aviso, con el foco donde va un error de campo con mensaje",
    async ({ formulario, campo, resto }) => {
      // Primero el mismo campo con mensaje, para saber a dónde va el foco con un error de campo.
      respuestas = [
        () => validacion(`${campo.prefijo}: Revisa este campo.`),
        () => validacion(`${campo.prefijo}:${resto}`),
      ]
      const cliente = await abrir(formulario)
      await enviar(formulario, cliente)
      unSoloMensaje({ campo: "Revisa este campo." })
      const focoConMensaje = document.activeElement

      await enviar(formulario, cliente)

      unSoloMensaje({ campo: GENERICO })
      expect(campo.control()).toHaveAttribute("aria-invalid", "true")
      expect(campo.control()).toHaveAccessibleDescription(expect.stringContaining(GENERICO))
      expect(document.activeElement).toBe(focoConMensaje)
      conservadoYSinEspera(formulario)
      expect(inesperadas).toEqual([])
    },
  )
})

const PANEL_CON_RUBRICA = FORMULARIOS[5]

describe("CHORE-03 · panel de calificación, punto (3)", () => {
  it.each([
    ["comentario:\u{200B}", { campo: GENERICO }],
    ["comentario:\u{0085}", { campo: GENERICO }],
    ["puntajes.0.puntos:\u{2060}", { campo: GENERICO }],
    ["puntajes.0.criterioId:\u{200B}\u{00A0}", { aviso: GENERICO }],
    ["parámetro: Revisa este valor.", { aviso: MENSAJE_DE_PRUEBA }],
  ] as const)(
    "CH3-A15: el panel con rúbrica ante %j da un solo mensaje legible y conserva lo escrito",
    async (mensaje, esperado) => {
      if (PANEL_CON_RUBRICA === undefined) throw new Error("Precondición: existe el panel")
      respuestas = [() => validacion(mensaje)]
      const cliente = await abrir(PANEL_CON_RUBRICA)

      await enviar(PANEL_CON_RUBRICA, cliente)

      unSoloMensaje(esperado)
      conservadoYSinEspera(PANEL_CON_RUBRICA)
      expect(inesperadas).toEqual([])
    },
  )
})

const conCliente = () => {
  const cliente = nuevoCliente()
  const envoltura = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  )
  return { cliente, envoltura }
}

const ERRORES_DE_CONTROLES = [
  ["F1", () => validacion(ENTRADAS_DE_FORMULARIO["campo-no-pintable"].mensaje), MENSAJE_DE_PRUEBA],
  ["F3", () => validacion(ENTRADAS_DE_FORMULARIO["sin-texto-visible"].mensaje), GENERICO],
  ["F4", () => validacion(ENTRADAS_DE_FORMULARIO.ruta.mensaje), MENSAJE_DE_PRUEBA],
  ["ENTREGA_CERRADA sin texto visible", () => errorApi(409, "ENTREGA_CERRADA", "   "), GENERICO],
] as const

const CONTROLES = [
  {
    nombre: "anular la entrega",
    envio: ({ metodo, url }: Llamada) => metodo === "POST" && url === `${RUTA_MI_ENTREGA}/anular`,
    accionar: (envoltura: ReturnType<typeof conCliente>["envoltura"]) => {
      const { result } = renderHook(() => useAnularEntrega(CLASE_ID, TAREA_ID), {
        wrapper: envoltura,
      })
      act(() => result.current.mutate())
    },
  },
  {
    nombre: "borrar la tarea sin confirmar",
    envio: ({ metodo, url }: Llamada) => metodo === "DELETE" && url === RUTA_TAREA,
    accionar: (envoltura: ReturnType<typeof conCliente>["envoltura"]) => {
      const { result } = renderHook(() => useBorrarTarea(CLASE_ID, TAREA_ID), {
        wrapper: envoltura,
      })
      act(() => result.current.mutate(false))
    },
  },
  {
    nombre: "borrar la tarea con confirmar",
    envio: ({ metodo, url }: Llamada) =>
      metodo === "DELETE" && url.startsWith(`${RUTA_TAREA}?confirmar=`),
    accionar: (envoltura: ReturnType<typeof conCliente>["envoltura"]) => {
      const { result } = renderHook(() => useBorrarTarea(CLASE_ID, TAREA_ID), {
        wrapper: envoltura,
      })
      act(() => result.current.mutate(true))
    },
  },
] as const

const casosDeControles = CONTROLES.flatMap((control) =>
  ERRORES_DE_CONTROLES.map(([nombre, respuesta, esperado]) => ({
    control,
    nombre,
    respuesta,
    esperado,
  })),
)

describe("CHORE-03 · controles sin campos", () => {
  it.each(casosDeControles)(
    "CH3-A16: $control.nombre con $nombre da exactamente un aviso legible",
    async ({ control, respuesta, esperado }) => {
      esLaPeticion = control.envio
      respuestas = [respuesta]
      const { cliente, envoltura } = conCliente()

      control.accionar(envoltura)
      await waitFor(() => expect(llamadas.filter(control.envio)).toHaveLength(1))
      await asentar(cliente)

      expect(avisos()).toEqual([esperado])
      expect(inesperadas).toEqual([])
    },
  )

  it.each(ERRORES_DE_CONTROLES)(
    "CH3-A16: la descarga de un adjunto (alFallarLaDescarga) con %s da exactamente un aviso legible",
    async (_nombre, respuesta, esperado) => {
      const { cliente, envoltura } = conCliente()
      const { result } = renderHook(
        () =>
          useAvisoDeRecargaFallida(
            CLASE_ID,
            TAREA_ID,
            false,
            { errorUpdateCount: 0, errorUpdatedAt: 0 },
            "No se avisa",
          ),
        { wrapper: envoltura },
      )
      const cuerpo = (await respuesta().json()) as { error: { codigo: string; mensaje: string } }
      const error = new ApiError(cuerpo.error.codigo, cuerpo.error.mensaje, 400)

      act(() => result.current(error))
      await asentar(cliente)

      expect(avisos()).toEqual([esperado])
    },
  )
})

const FORMULARIOS_CON_SUBIDA = [
  {
    formulario: FORMULARIOS[0],
    solicitud: ({ metodo, url }: Llamada) => metodo === "POST" && url === `${RUTA_CLASE}/archivos`,
  },
  {
    formulario: FORMULARIOS[2],
    solicitud: ({ metodo, url }: Llamada) =>
      metodo === "POST" && url === `${RUTA_MI_ENTREGA}/archivos`,
  },
] as const

const casosDeSubida = FORMULARIOS_CON_SUBIDA.flatMap(({ formulario, solicitud }) =>
  ENTRADAS_CON_AVISO.map(([nombre, entrada]) => ({ formulario, solicitud, nombre, entrada })),
)

describe("CHORE-03 · solicitud de subida con un VALIDACION fuera de contrato", () => {
  it.each(casosDeSubida)(
    "CH3-A23: $formulario.nombre con $nombre en la solicitud de subida da un solo aviso con el archivo, ningún ErrorDeCampo, conserva lo escrito y no envía",
    async ({ formulario, solicitud, entrada }) => {
      if (formulario === undefined) throw new Error("Precondición: existe el formulario")
      formulario.preparar()
      esLaPeticion = solicitud
      respuestas = [() => validacion(entrada.mensaje)]
      const cliente = await montar(formulario.ruta)
      await formulario.listo()
      await asentar(cliente)
      formulario.llenar()
      elegirArchivo()

      formulario.boton().focus()
      fireEvent.click(formulario.boton())
      await waitFor(() => expect(llamadas.filter(solicitud)).toHaveLength(1))
      await asentar(cliente)

      unSoloMensaje({
        aviso: TEXTOS_ADJUNTOS.errorRechazado(ARCHIVO, entrada.resto ?? GENERICO),
      })
      expect(screen.getByRole("list", { name: TEXTOS_ADJUNTOS.elegidos })).toHaveTextContent(
        ARCHIVO,
      )
      conservadoYSinEspera(formulario)
      expect(llamadas.filter(formulario.envio)).toHaveLength(0)
      expect(inesperadas).toEqual([])
    },
  )
})
