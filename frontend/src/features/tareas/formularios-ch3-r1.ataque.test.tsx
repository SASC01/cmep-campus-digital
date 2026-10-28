import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import {
  ENTRADAS_DE_FORMULARIO,
  ENTRADAS_FUERA_DE_CONTRATO,
  MENSAJE_DE_PRUEBA,
} from "@/lib/errores-de-api-fuera-de-contrato"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { CrearTareaView } from "./crear-tarea-view"
import { DetalleTareaView } from "./detalle-tarea-view"
import { EditarTareaView } from "./editar-tarea-view"
import { EntregaDeAlumnoView } from "./entrega-de-alumno-view"
import { EntregasView } from "./entregas-view"

// Ataque CHORE-03 03a, ronda 1 (tester), por la interfaz de features/tareas:
// - cada formulario recorre la tabla común COMPLETA (ENTRADAS_FUERA_DE_CONTRATO), una prueba
//   parametrizada por formulario (indicación del humano, 2026-10-26), reenviando el mismo formulario;
// - F2 en el primer envío, en todos los campos pintados, con "\u{200B}" y mezclas, y a dónde va el foco
//   (O-01);
// - la consulta de la tarea dentro de la lista de entregas y de la entrega de un alumno, y la primera
//   carga del hilo del maestro (O-02), y las recargas con un VALIDACION de un parámetro;
// - la descarga de un adjunto por el camino real (O-03), incluidos los mensajes que el servidor real
//   arma para un id de la ruta (T-01) y dos clics seguidos;
// - CH3-A19 regresando por un enlace (O-04);
// - los dos "Ver más": dos fallos seguidos, dos clics seguidos y la vista desmontada;
// - anular y borrar por la interfaz.
// Reloj fijo (solo Date). El servidor es un doble en memoria. Todo carácter invisible va como escape.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const FECHA_LOCAL = "2030-01-15T10:00"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ALUMNO_ID = "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0301"
const CRITERIO_1 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d81"
const CRITERIO_2 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d82"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const ORIGEN_ALMACEN = "https://almacen.ejemplo.mx"
const RUTA_CLASE = `/api/clases/${CLASE_ID}`
const RUTA_TAREA = `${RUTA_CLASE}/tareas/${TAREA_ID}`
const RUTA_MI_ENTREGA = `${RUTA_TAREA}/entrega`
const RUTA_MI_HILO = `${RUTA_MI_ENTREGA}/comentarios`
const RUTA_ENTREGAS = `${RUTA_TAREA}/entregas`
const RUTA_ALUMNO = `${RUTA_ENTREGAS}/${ALUMNO_ID}`
const RUTA_HILO_ALUMNO = `${RUTA_ALUMNO}/comentarios`
const RUTA_CALIFICACION = `${RUTA_ALUMNO}/calificacion`
const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const ZOD = "limite: Too big: expected number"
const CLARIDAD = "Claridad (de 5 puntos)"
const ORTOGRAFIA = "Ortografía (de 4 puntos)"
const CALIFICACION = "Calificación (de 80 puntos)"
const COMENTARIO = "Comentario para el alumno (opcional)"
const ENLACE = "https://ejemplo.com/mi-trabajo"
const uuid = (n: number) => `9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`
const SIGUIENTE = uuid(901)
// Lo que el servidor real responde ante un archivoId de la ruta que no es un UUID (T-01).
const ARCHIVO_ID_DEL_SERVIDOR = "archivoId: archivoId: debe ser un identificador válido"
const RUTA_TECNICA = /^[\p{L}\p{M}\p{N}_.-]+:/u

const DETALLE_ALUMNO = `/estudiante/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const DETALLE_MAESTRO = `/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const NUEVA = `/maestro/clases/${CLASE_ID}/tareas/nueva`
const EDITAR = `${DETALLE_MAESTRO}/editar`
const ENTREGAS = `${DETALLE_MAESTRO}/entregas`
const DE_ALUMNO = `${ENTREGAS}/${ALUMNO_ID}`

const adjunto = (n: number, nombre: string) => ({
  id: uuid(700 + n),
  nombre,
  tipo: "application/pdf",
  tamano: 2048,
  vistaPrevia: null,
})

// El estado del doble (se reinicia en cada caso).
let conRubrica = true
let adjuntosDeLaTarea: ReturnType<typeof adjunto>[] = []
let adjuntosDeMiEntrega: ReturnType<typeof adjunto>[] = []
let adjuntosDelAlumno: ReturnType<typeof adjunto>[] = []
let entregada = false
let getsFallan: string | null = null

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
    adjuntos: adjuntosDeLaTarea,
    autor: { id: uuid(1), nombre: "Luis Pérez", administracion: false },
    creadoEn: "2030-01-01T15:30:00.000Z",
    actualizadoEn: "2030-01-01T15:30:00.000Z",
    puedeEditar: true,
    puedeBorrar: true,
  },
})

const miEntrega = () => ({
  estado: entregada ? "entregado" : "asignado",
  fechaEntrega: entregada ? "2030-01-09T15:30:00.000Z" : null,
  conRetraso: false,
  enlaces: entregada ? [ENLACE] : [],
  adjuntos: adjuntosDeMiEntrega,
  puedeEntregar: !entregada,
  puedeAnular: entregada,
  calificacion: null,
})

const entregaDeAlumno = () => ({
  alumno: { id: ALUMNO_ID, nombre: "Ana Ruiz" },
  estado: "entregado",
  fechaEntrega: "2030-01-09T15:30:00.000Z",
  conRetraso: false,
  enlaces: [],
  adjuntos: adjuntosDelAlumno,
  version: 2,
  calificacion: null,
})

const fila = (n: number, nombre: string) => ({
  alumno: { id: uuid(300 + n), nombre },
  estado: "asignado",
  fechaEntrega: null,
  conRetraso: false,
})

const comentario = (n: number, texto: string) => ({
  id: uuid(100 + n),
  texto,
  autor: { id: uuid(2), nombre: "Ana Ruiz", administracion: false },
  creadoEn: "2030-01-09T10:00:00.000Z",
  propio: true,
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const validacion = (mensaje: string) => errorApi(400, "VALIDACION", mensaje)

interface Llamada {
  metodo: string
  url: string
}

type Respuesta = () => Response | Promise<Response>

// Las respuestas preparadas para las peticiones que cumplen `cuando`, en orden; al acabarse, lo de
// siempre.
let colas: { cuando: (llamada: Llamada) => boolean; respuestas: Respuesta[] }[] = []
let llamadas: Llamada[] = []
let inesperadas: string[] = []

const preparar = (cuando: (llamada: Llamada) => boolean, ...respuestas: Respuesta[]) => {
  colas.push({ cuando, respuestas })
}

const conCursor = (url: string) => new URL(url, "http://local").searchParams.get("cursor")

const deSiempre = (llamada: Llamada): Response => {
  const { metodo, url } = llamada
  const ruta = new URL(url, "http://local")
  if (url.startsWith(ORIGEN_ALMACEN)) return new Response(null, { status: 200 })
  if (url === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "restaurado" })
  if (url === "/api/me") {
    return respuestaJson(200, {
      id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
      nombre: "Ana Ruiz",
      email: "ana@ejemplo.mx",
      rol: "estudiante",
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  if (ruta.pathname === "/api/clases/inscritas") {
    return respuestaJson(200, {
      clases: [{ id: CLASE_ID, nombre: "Álgebra I", maestro: MAESTRO, maestros: [MAESTRO] }],
      total: 1,
      siguienteCursor: null,
    })
  }
  if (metodo === "GET" && url === RUTA_CLASE) {
    return respuestaJson(200, {
      clase: {
        id: CLASE_ID,
        nombre: "Álgebra I",
        descripcion: null,
        maestro: MAESTRO,
        maestros: [MAESTRO],
      },
    })
  }
  if (metodo === "GET" && ruta.pathname === `${RUTA_CLASE}/trabajo`) {
    return respuestaJson(200, {
      elementos: [
        {
          id: TAREA_ID,
          tipo: "tarea",
          titulo: "Ensayo final",
          autor: { id: uuid(1), nombre: "Luis Pérez", administracion: false },
          creadoEn: "2030-01-01T15:30:00.000Z",
          material: null,
          tarea: { fechaLimite: FUTURA, puntos: 10 },
          puedeMover: false,
          entrega: { estado: "asignado", conRetraso: false },
        },
      ],
      siguienteCursor: null,
    })
  }
  if (metodo === "GET" && url === `${RUTA_CLASE}/categorias`) {
    return respuestaJson(200, { categorias: [] })
  }
  if (metodo === "GET" && url === `${RUTA_CLASE}/temas`) {
    return respuestaJson(200, { temas: [], sinTema: 1 })
  }
  const esConsultaQueFalla =
    metodo === "GET" &&
    (url === RUTA_TAREA ||
      url === RUTA_MI_ENTREGA ||
      url === RUTA_ALUMNO ||
      url.startsWith(`${RUTA_ENTREGAS}?`) ||
      url.includes("/comentarios?"))
  if (esConsultaQueFalla && getsFallan !== null) return validacion(getsFallan)
  if (metodo === "GET" && url === RUTA_TAREA) return respuestaJson(200, tareaDoble())
  if (metodo === "GET" && url === RUTA_MI_ENTREGA) {
    return respuestaJson(200, { entrega: miEntrega() })
  }
  if (metodo === "GET" && url === RUTA_ALUMNO) {
    return respuestaJson(200, { entrega: entregaDeAlumno() })
  }
  if (metodo === "GET" && url.startsWith(`${RUTA_ENTREGAS}?`)) {
    if (conCursor(url) === SIGUIENTE) {
      return respuestaJson(200, {
        entregas: [fila(2, "Bruno Díaz")],
        total: 2,
        entregadas: 0,
        siguienteCursor: null,
      })
    }
    return respuestaJson(200, {
      entregas: [fila(1, "Carla Soto")],
      total: 2,
      entregadas: 0,
      siguienteCursor: SIGUIENTE,
    })
  }
  if (metodo === "GET" && url.includes("/comentarios?")) {
    if (conCursor(url) === SIGUIENTE) {
      return respuestaJson(200, {
        comentarios: [comentario(2, "Segundo comentario")],
        siguienteCursor: null,
      })
    }
    return respuestaJson(200, {
      comentarios: [comentario(1, "Primer comentario")],
      siguienteCursor: SIGUIENTE,
    })
  }
  if (metodo === "POST" && url.endsWith("/archivos")) {
    return respuestaJson(201, {
      archivo: { id: uuid(500), nombre: "ensayo.pdf", tipo: "application/pdf", tamano: 9 },
      subida: {
        url: `${ORIGEN_ALMACEN}/subida/1`,
        metodo: "PUT",
        cabeceras: { "Content-Type": "application/pdf" },
        expiraEn: "2030-01-10T12:05:00.000Z",
      },
    })
  }
  if (metodo === "POST" && url === `${RUTA_CLASE}/tareas`) return respuestaJson(201, tareaDoble())
  if (metodo === "PUT" && url === RUTA_TAREA) return respuestaJson(200, tareaDoble())
  if (metodo === "POST" && url.endsWith("/comentarios")) {
    return respuestaJson(201, { comentario: comentario(50, "Tengo una duda") })
  }
  inesperadas.push(`${metodo} ${url}`)
  return errorApi(500, "ERROR_INTERNO", "no esperada")
}

const instalarServidor = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const llamada = { metodo: init?.method ?? "GET", url: String(entrada) }
      llamadas.push(llamada)
      const cola = colas.find((c) => c.cuando(llamada) && c.respuestas.length > 0)
      const siguiente = cola?.respuestas.shift()
      if (siguiente !== undefined) return Promise.resolve(siguiente())
      return Promise.resolve(deSiempre(llamada))
    }),
  )
}

beforeAll(async () => {
  await import("@/app/router")
}, 30_000)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  conRubrica = true
  adjuntosDeLaTarea = []
  adjuntosDeMiEntrega = []
  adjuntosDelAlumno = []
  entregada = false
  getsFallan = null
  colas = []
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

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const asentar = async (cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isFetching() + cliente.isMutating()).toBe(0))
  await reposar()
}

const Rutas = () => (
  <Routes>
    <Route path="/maestro/clases/:claseId/tareas/nueva" element={<CrearTareaView />} />
    <Route path="/maestro/clases/:claseId/tareas/:tareaId/editar" element={<EditarTareaView />} />
    <Route path="/maestro/clases/:claseId/tareas/:tareaId/entregas" element={<EntregasView />} />
    <Route
      path="/maestro/clases/:claseId/tareas/:tareaId/entregas/:alumnoId"
      element={<EntregaDeAlumnoView />}
    />
    <Route path="/maestro/clases/:claseId/tareas/:tareaId" element={<DetalleTareaView />} />
    <Route path="/estudiante/clases/:claseId/tareas/:tareaId" element={<DetalleTareaView />} />
    <Route path="*" element={<p>Otra pantalla</p>} />
  </Routes>
)

// La única función de montaje con rutas de prueba (R-01); con `conProviders`, la configuración de
// producción de TanStack Query (retry: 1).
const montar = (ruta: string, conProviders = false) => {
  const cliente = nuevoCliente()
  const arbol = (
    <MemoryRouter initialEntries={[ruta]}>
      <Rutas />
    </MemoryRouter>
  )
  const resultado = render(
    conProviders ? (
      <Providers>{arbol}</Providers>
    ) : (
      <QueryClientProvider client={cliente}>{arbol}</QueryClientProvider>
    ),
  )
  return { cliente, ...resultado }
}

const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })

// Los ErrorDeCampo de la vista: todos llevan un id que termina en "-error" (o "-error-servidor", el de
// los enlaces) o en "-vacia" (la entrega vacía). Es un id, no una clase de estilo.
const erroresDeCampo = () =>
  Array.from(document.querySelectorAll("[id]"))
    .filter((elemento) => /-(error|vacia)(-servidor)?$/.test(elemento.id))
    .map((elemento) => (elemento.textContent ?? "").trim())

const avisos = () => aviso.error.mock.calls.map((llamada) => String(llamada[0]))

const sinEspera = (boton: HTMLElement) => {
  expect(boton).not.toHaveAttribute("aria-busy", "true")
  expect(boton).not.toHaveAttribute("aria-disabled", "true")
}

interface CampoPintado {
  prefijo: string
  control?: () => HTMLElement
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
    ruta: NUEVA,
    preparar: () => undefined,
    listo: () => screen.findByLabelText("Título"),
    llenar: () => {
      escribir("Título", "Ensayo")
      escribir("Fecha límite", FECHA_LOCAL)
    },
    boton: () => screen.getByRole("button", { name: "Publicar tarea" }),
    envio: ({ metodo, url }) => metodo === "POST" && url === `${RUTA_CLASE}/tareas`,
    camposPintados: [
      { prefijo: "titulo", control: porEtiqueta("Título") },
      { prefijo: "instrucciones", control: porEtiqueta("Instrucciones (opcional)") },
      { prefijo: "fechaLimite", control: porEtiqueta("Fecha límite") },
      { prefijo: "puntos", control: porEtiqueta("Puntos") },
      { prefijo: "categoriaId", control: porEtiqueta("Categoría") },
      { prefijo: "temaId", control: porEtiqueta("Tema") },
      {
        prefijo: "requiereAdjuntos",
        control: () => screen.getByRole("group", { name: "Cómo se entrega" }),
      },
      { prefijo: "rubrica" },
    ],
    conservado: () => {
      expect(screen.getByLabelText("Título")).toHaveValue("Ensayo")
      expect(screen.getByLabelText("Fecha límite")).toHaveValue(FECHA_LOCAL)
    },
  },
  {
    nombre: "editar tarea con rúbrica",
    ruta: EDITAR,
    preparar: () => {
      conRubrica = true
    },
    listo: () => screen.findByDisplayValue("Ensayo final"),
    llenar: () => escribir("Título", "Ensayo corregido"),
    boton: () => screen.getByRole("button", { name: "Guardar cambios" }),
    envio: ({ metodo, url }) => metodo === "PUT" && url === RUTA_TAREA,
    camposPintados: [
      { prefijo: "titulo", control: porEtiqueta("Título") },
      { prefijo: "rubrica.0.criterio", control: porEtiqueta("Criterio 1") },
      { prefijo: "rubrica.1.puntosMax", control: porEtiqueta("Puntos máximos 2") },
    ],
    conservado: () => {
      expect(screen.getByLabelText("Título")).toHaveValue("Ensayo corregido")
      expect(screen.getByLabelText("Criterio 1")).toHaveValue("Claridad")
    },
  },
  {
    nombre: "entregar",
    ruta: DETALLE_ALUMNO,
    preparar: () => undefined,
    listo: () => screen.findByRole("button", { name: "Entregar tarea" }),
    llenar: () => {
      escribir("Enlace", ENLACE)
      fireEvent.click(screen.getByRole("button", { name: "Agregar enlace" }))
    },
    boton: () => screen.getByRole("button", { name: "Entregar tarea" }),
    envio: ({ metodo, url }) => metodo === "POST" && url === RUTA_MI_ENTREGA,
    camposPintados: [
      { prefijo: "enlaces", control: porEtiqueta("Enlace") },
      { prefijo: "enlaces.0", control: porEtiqueta("Enlace") },
    ],
    conservado: () =>
      expect(screen.getByRole("list", { name: "Enlaces agregados" })).toHaveTextContent(ENLACE),
  },
  {
    nombre: "comentario privado del alumno",
    ruta: DETALLE_ALUMNO,
    preparar: () => undefined,
    listo: () => screen.findByLabelText("Comentario privado"),
    llenar: () => escribir("Comentario privado", "Tengo una duda"),
    boton: () => screen.getByRole("button", { name: "Enviar comentario" }),
    envio: ({ metodo, url }) => metodo === "POST" && url === RUTA_MI_HILO,
    camposPintados: [{ prefijo: "texto", control: porEtiqueta("Comentario privado") }],
    conservado: () =>
      expect(screen.getByLabelText("Comentario privado")).toHaveValue("Tengo una duda"),
  },
  {
    nombre: "comentario privado del maestro",
    ruta: DE_ALUMNO,
    preparar: () => undefined,
    listo: () => screen.findByLabelText("Comentario privado"),
    llenar: () => escribir("Comentario privado", "Revisa la conclusión"),
    boton: () => screen.getByRole("button", { name: "Enviar comentario" }),
    envio: ({ metodo, url }) => metodo === "POST" && url === RUTA_HILO_ALUMNO,
    camposPintados: [{ prefijo: "texto", control: porEtiqueta("Comentario privado") }],
    conservado: () =>
      expect(screen.getByLabelText("Comentario privado")).toHaveValue("Revisa la conclusión"),
  },
  {
    nombre: "panel de calificación con rúbrica",
    ruta: DE_ALUMNO,
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
      { prefijo: "puntajes.1.puntos", control: porEtiqueta(ORTOGRAFIA) },
    ],
    conservado: () => {
      expect(screen.getByLabelText(CLARIDAD)).toHaveValue("4")
      expect(screen.getByLabelText(ORTOGRAFIA)).toHaveValue("3")
      expect(screen.getByLabelText(COMENTARIO)).toHaveValue("Buen trabajo")
    },
  },
  {
    nombre: "panel de calificación sin rúbrica",
    ruta: DE_ALUMNO,
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
  const montado = montar(formulario.ruta)
  await formulario.listo()
  await asentar(montado.cliente)
  formulario.llenar()
  return montado.cliente
}

const enviar = async (formulario: Formulario, cliente: QueryClient) => {
  const antes = llamadas.filter(formulario.envio).length
  formulario.boton().focus()
  fireEvent.click(formulario.boton())
  await waitFor(() => expect(llamadas.filter(formulario.envio)).toHaveLength(antes + 1))
  await asentar(cliente)
}

// Lo que identifica al elemento con el foco entre dos montajes (los id de useId cambian).
const conElFoco = () => {
  const elemento = document.activeElement
  if (elemento === null || elemento === document.body) return "body"
  const texto = elemento.tagName === "BUTTON" ? (elemento.textContent ?? "").trim() : ""
  return `${elemento.tagName}|${elemento.getAttribute("name") ?? ""}|${texto}`
}

// La tabla completa por formulario tarda más de 10 s por formulario: cada uno recorre un tercio
// rotativo (las entradas cuyo índice da su resto entre 3), más las de "dos puntos dentro" y "sin ruta";
// entre los siete formularios, cada entrada de la tabla pasa por la interfaz al menos dos veces. Las
// pruebas de las funciones recorren la tabla entera.
const entradasDelFormulario = (indice: number) =>
  ENTRADAS_FUERA_DE_CONTRATO.filter(
    (entrada, i) =>
      i % 3 === indice % 3 || entrada.clase === "dos-puntos-dentro" || entrada.clase === "sin-ruta",
  )

describe("ataque CHORE-03 03a r1 · cada formulario de tareas recorre la tabla común", () => {
  it("entre los siete formularios, cada entrada de la tabla pasa por la interfaz al menos dos veces", () => {
    expect(FORMULARIOS).toHaveLength(7)
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      const veces = FORMULARIOS.filter((_, i) => entradasDelFormulario(i).includes(entrada)).length
      expect(veces, JSON.stringify(entrada.mensaje)).toBeGreaterThanOrEqual(2)
    }
  })

  it.each(FORMULARIOS.map((formulario, indice) => ({ formulario, indice })))(
    "$formulario.nombre: su parte rotativa de ENTRADAS_FUERA_DE_CONTRATO da exactamente un aviso legible (el resto o el genérico), ningún ErrorDeCampo, el foco en el botón, lo escrito se conserva y el botón sale de la espera",
    async ({ formulario, indice }) => {
      const entradas = entradasDelFormulario(indice)
      expect(entradas.length).toBeGreaterThan(30)
      expect(new Set(entradas.map((e) => e.clase)).size).toBeGreaterThanOrEqual(4)
      const cliente = await abrir(formulario)
      for (const entrada of entradas) {
        aviso.error.mockClear()
        preparar(formulario.envio, () => validacion(entrada.mensaje))
        // Como `enviar`, pero esperando el aviso con un intervalo corto: son decenas de envíos.
        const antes = llamadas.filter(formulario.envio).length
        formulario.boton().focus()
        fireEvent.click(formulario.boton())
        await waitFor(
          () => {
            expect(llamadas.filter(formulario.envio)).toHaveLength(antes + 1)
            expect(aviso.error).toHaveBeenCalled()
            sinEspera(formulario.boton())
          },
          { interval: 5 },
        )
        await reposar()
        const etiqueta = JSON.stringify(entrada.mensaje)
        expect(avisos(), etiqueta).toEqual([entrada.resto ?? GENERICO])
        expect(erroresDeCampo(), etiqueta).toEqual([])
        expect(formulario.boton(), etiqueta).toHaveFocus()
        formulario.conservado()
        sinEspera(formulario.boton())
      }
      await asentar(cliente)
      expect(avisos()).toHaveLength(1)
      expect(inesperadas).toEqual([])
    },
    120_000,
  )
})

const RESTOS_DEL_PRIMER_ENVIO = ["\u{200B}", "\u{00A0}\u{200B}\n", "\u{0085}"] as const

const casosDelPrimerEnvio = FORMULARIOS.flatMap((formulario) =>
  formulario.camposPintados.map((campo) => ({ formulario, campo })),
)

describe("ataque CHORE-03 03a r1 · O-01: F2 en el primer envío", () => {
  it.each(casosDelPrimerEnvio)(
    "$formulario.nombre: F2 en «$campo.prefijo» en el primer envío (\\u200B, NBSP+\\u200B+salto, \\u0085) marca el campo con el genérico, sin aviso, y el foco va donde iría con un error de campo con mensaje",
    async ({ formulario, campo }) => {
      // Dónde queda el foco con un error de ese campo con mensaje, en un primer envío.
      preparar(formulario.envio, () => validacion(`${campo.prefijo}: Revisa este campo.`))
      let cliente = await abrir(formulario)
      await enviar(formulario, cliente)
      expect(erroresDeCampo()).toEqual(["Revisa este campo."])
      expect(avisos()).toEqual([])
      const focoConMensaje = conElFoco()
      expect(focoConMensaje).not.toBe("body")

      for (const resto of RESTOS_DEL_PRIMER_ENVIO) {
        cleanup()
        aviso.error.mockClear()
        preparar(formulario.envio, () => validacion(`${campo.prefijo}:${resto}`))
        cliente = await abrir(formulario)
        await enviar(formulario, cliente)
        const etiqueta = JSON.stringify(resto)
        expect(avisos(), etiqueta).toEqual([])
        expect(erroresDeCampo(), etiqueta).toEqual([GENERICO])
        if (campo.control !== undefined) {
          expect(campo.control()).toHaveAccessibleDescription(expect.stringContaining(GENERICO))
        }
        expect(conElFoco(), etiqueta).toBe(focoConMensaje)
        formulario.conservado()
        sinEspera(formulario.boton())
      }
      expect(inesperadas).toEqual([])
    },
    30_000,
  )
})

describe("ataque CHORE-03 03a r1 · O-02: consultas que la ronda del programador no hizo fallar", () => {
  it.each([
    {
      nombre: "la tarea dentro de la lista de entregas",
      ruta: ENTREGAS,
      falla: ({ metodo, url }: Llamada) => metodo === "GET" && url === RUTA_TAREA,
    },
    {
      nombre: "la tarea dentro de la entrega de un alumno",
      ruta: DE_ALUMNO,
      falla: ({ metodo, url }: Llamada) => metodo === "GET" && url === RUTA_TAREA,
    },
    {
      nombre: "la primera carga del hilo del maestro",
      ruta: DE_ALUMNO,
      falla: ({ metodo, url }: Llamada) =>
        metodo === "GET" && url.startsWith(`${RUTA_HILO_ALUMNO}?`) && conCursor(url) === null,
    },
  ])(
    "$nombre con «limite: Too big: expected number» muestra el genérico, nunca el texto en inglés ni la ruta",
    async ({ ruta, falla }) => {
      preparar(falla, () => validacion(ZOD))
      const { cliente } = montar(ruta)

      expect((await screen.findAllByText(GENERICO)).length).toBeGreaterThan(0)
      await asentar(cliente)
      expect(document.body).not.toHaveTextContent("Too big")
      expect(document.body).not.toHaveTextContent("limite")
      expect(avisos().join(" ")).not.toContain("Too big")
      expect(inesperadas).toEqual([])
    },
  )

  it.each([
    ["el detalle del alumno (tarea, «Tu trabajo» e hilo)", DETALLE_ALUMNO, "Ensayo final"],
    ["«Editar tarea»", EDITAR, "Guardar cambios"],
    ["la lista de entregas", ENTREGAS, "Carla Soto"],
    ["la entrega de un alumno (tarea, entrega e hilo)", DE_ALUMNO, "Calificar y devolver"],
  ])(
    "una recarga de %s que responde «limite: Too big: expected number» en todas sus consultas no muestra ni avisa el texto del servidor ni la ruta, y todo aviso tiene texto visible",
    async (_nombre, ruta, cargado) => {
      const { cliente } = montar(ruta)
      expect((await screen.findAllByText(cargado)).length).toBeGreaterThan(0)
      await asentar(cliente)

      getsFallan = ZOD
      await act(async () => {
        await cliente.invalidateQueries()
      })
      await asentar(cliente)

      expect(document.body).not.toHaveTextContent("Too big")
      expect(document.body).not.toHaveTextContent("limite")
      for (const texto of avisos()) {
        expect(texto).not.toContain("Too big")
        expect(texto).not.toMatch(RUTA_TECNICA)
        expect(texto.trim().length).toBeGreaterThan(0)
      }
      expect(inesperadas).toEqual([])
    },
  )
})

interface LugarDeDescarga {
  nombre: string
  ruta: string
  preparar: () => void
  archivo: string
  descarga: (llamada: Llamada) => boolean
}

const ADJUNTO_TAREA = adjunto(1, "guia.pdf")
const ADJUNTO_MI_ENTREGA = adjunto(2, "mi-ensayo.pdf")
const ADJUNTO_ALUMNO = adjunto(3, "ensayo-de-ana.pdf")

const LUGARES_DE_DESCARGA: readonly LugarDeDescarga[] = [
  {
    nombre: "un adjunto de la tarea en el detalle",
    ruta: DETALLE_ALUMNO,
    preparar: () => {
      adjuntosDeLaTarea = [ADJUNTO_TAREA]
    },
    archivo: ADJUNTO_TAREA.nombre,
    descarga: ({ metodo, url }) =>
      metodo === "POST" && url === `${RUTA_CLASE}/archivos/${ADJUNTO_TAREA.id}/descarga`,
  },
  {
    nombre: "un archivo de «Tu trabajo»",
    ruta: DETALLE_ALUMNO,
    preparar: () => {
      entregada = true
      adjuntosDeMiEntrega = [ADJUNTO_MI_ENTREGA]
    },
    archivo: ADJUNTO_MI_ENTREGA.nombre,
    descarga: ({ metodo, url }) =>
      metodo === "POST" && url === `${RUTA_MI_ENTREGA}/archivos/${ADJUNTO_MI_ENTREGA.id}/descarga`,
  },
  {
    nombre: "un archivo de la entrega de un alumno",
    ruta: DE_ALUMNO,
    preparar: () => {
      adjuntosDelAlumno = [ADJUNTO_ALUMNO]
    },
    archivo: ADJUNTO_ALUMNO.nombre,
    descarga: ({ metodo, url }) =>
      metodo === "POST" && url === `${RUTA_ALUMNO}/archivos/${ADJUNTO_ALUMNO.id}/descarga`,
  },
]

const ENTRADAS_CON_AVISO = [
  ["F1", ENTRADAS_DE_FORMULARIO["campo-no-pintable"]],
  ["F3", ENTRADAS_DE_FORMULARIO["sin-texto-visible"]],
  ["F4", ENTRADAS_DE_FORMULARIO.ruta],
] as const

const abrirDescarga = async (lugar: LugarDeDescarga) => {
  lugar.preparar()
  const montado = montar(lugar.ruta)
  const boton = await screen.findByRole("button", { name: `Descargar ${lugar.archivo}` })
  await asentar(montado.cliente)
  return { ...montado, boton }
}

describe("ataque CHORE-03 03a r1 · O-03: la descarga de un adjunto por el camino real", () => {
  it.each(
    LUGARES_DE_DESCARGA.flatMap((lugar) =>
      ENTRADAS_CON_AVISO.map(([nombre, entrada]) => ({ lugar, nombre, entrada })),
    ),
  )(
    "$lugar.nombre: «Descargar» con $nombre da exactamente un aviso legible y el botón sale de la espera",
    async ({ lugar, entrada }) => {
      preparar(lugar.descarga, () => validacion(entrada.mensaje))
      const { cliente, boton } = await abrirDescarga(lugar)

      fireEvent.click(boton)
      await waitFor(() => expect(llamadas.filter(lugar.descarga)).toHaveLength(1))
      await asentar(cliente)

      expect(avisos()).toEqual([entrada.resto ?? GENERICO])
      expect(erroresDeCampo()).toEqual([])
      sinEspera(screen.getByRole("button", { name: `Descargar ${lugar.archivo}` }))
      expect(inesperadas).toEqual([])
    },
  )

  it.each(LUGARES_DE_DESCARGA)(
    "T-01: $nombre: el 400 real del servidor ante un archivoId de la ruta inválido («archivoId: archivoId: …») da un aviso sin ruta técnica",
    async (lugar) => {
      preparar(lugar.descarga, () => validacion(ARCHIVO_ID_DEL_SERVIDOR))
      const { cliente, boton } = await abrirDescarga(lugar)

      fireEvent.click(boton)
      await waitFor(() => expect(llamadas.filter(lugar.descarga)).toHaveLength(1))
      await asentar(cliente)

      expect(avisos()).toHaveLength(1)
      expect(avisos()[0]).not.toMatch(RUTA_TECNICA)
    },
  )

  it.each(LUGARES_DE_DESCARGA)(
    "$nombre: dos clics seguidos en «Descargar» que falla mandan una sola petición y dan un solo aviso",
    async (lugar) => {
      // Cada petición de descarga queda en vuelo hasta que la prueba la suelta.
      const enVuelo: ((respuesta: Response) => void)[] = []
      const enEspera = () => new Promise<Response>((r) => enVuelo.push(r))
      preparar(lugar.descarga, enEspera, enEspera, enEspera)
      const { cliente, boton } = await abrirDescarga(lugar)

      fireEvent.click(boton)
      fireEvent.click(boton)
      await reposar()
      const pedidas = llamadas.filter(lugar.descarga).length
      expect(enVuelo.length).toBeGreaterThan(0)
      for (const soltar of enVuelo) soltar(validacion(ENTRADAS_DE_FORMULARIO.ruta.mensaje))
      await asentar(cliente)

      expect({ pedidas, avisos: avisos() }).toEqual({ pedidas: 1, avisos: [MENSAJE_DE_PRUEBA] })
      expect(inesperadas).toEqual([])
    },
  )
})

interface Control {
  nombre: string
  ruta: string
  preparar: () => void
  pedir: () => Promise<void>
  envio: (llamada: Llamada) => boolean
}

const CONTROLES: readonly Control[] = [
  {
    nombre: "anular la entrega",
    ruta: DETALLE_ALUMNO,
    preparar: () => {
      entregada = true
    },
    pedir: async () => {
      fireEvent.click(await screen.findByRole("button", { name: "Anular entrega" }))
      fireEvent.click(await screen.findByRole("button", { name: "Sí, anular entrega" }))
    },
    envio: ({ metodo, url }) => metodo === "POST" && url === `${RUTA_MI_ENTREGA}/anular`,
  },
  {
    nombre: "borrar la tarea",
    ruta: DETALLE_MAESTRO,
    preparar: () => undefined,
    pedir: async () => {
      fireEvent.click(await screen.findByRole("button", { name: "Borrar tarea" }))
      fireEvent.click(await screen.findByRole("button", { name: "Sí, borrar tarea" }))
    },
    envio: ({ metodo, url }) => metodo === "DELETE" && url === RUTA_TAREA,
  },
]

describe("ataque CHORE-03 03a r1 · anular y borrar por la interfaz", () => {
  it.each(
    CONTROLES.flatMap((control) =>
      ENTRADAS_CON_AVISO.map(([nombre, entrada]) => ({ control, nombre, entrada })),
    ),
  )(
    "$control.nombre con $nombre da exactamente un aviso legible, sin mensaje en línea ni ErrorDeCampo",
    async ({ control, entrada }) => {
      control.preparar()
      preparar(control.envio, () => validacion(entrada.mensaje))
      const { cliente } = montar(control.ruta)
      await screen.findByText("Ensayo final")
      await asentar(cliente)

      await control.pedir()
      await waitFor(() => expect(llamadas.filter(control.envio)).toHaveLength(1))
      await asentar(cliente)

      expect(avisos()).toEqual([entrada.resto ?? GENERICO])
      expect(erroresDeCampo()).toEqual([])
      expect(inesperadas).toEqual([])
    },
  )

  it("T-01: borrar la tarea con el 400 real del servidor ante un ?confirmar= inválido («confirmar: confirmar: no es válido») da un aviso sin ruta técnica", async () => {
    const borrar = CONTROLES[1]
    if (borrar === undefined) throw new Error("Precondición: existe el control de borrar")
    preparar(borrar.envio, () => validacion("confirmar: confirmar: no es válido"))
    const { cliente } = montar(borrar.ruta)
    await screen.findByText("Ensayo final")
    await asentar(cliente)

    await borrar.pedir()
    await waitFor(() => expect(llamadas.filter(borrar.envio)).toHaveLength(1))
    await asentar(cliente)

    expect(avisos()).toHaveLength(1)
    expect(avisos()[0]).not.toMatch(RUTA_TECNICA)
  })
})

describe("ataque CHORE-03 03a r1 · O-04: CH3-A19 regresando por un enlace", () => {
  it("con el genérico bajo el comentario del alumno, ir a «Trabajo de clase» y volver por el enlace de la tarea antes de 30 s quita el error y «Enviar comentario» manda un POST nuevo", async () => {
    const { rutas } = await import("@/app/router")
    const esElComentario = ({ metodo, url }: Llamada) => metodo === "POST" && url === RUTA_MI_HILO
    preparar(esElComentario, () => validacion("texto:\u{200B}"))
    const router = createMemoryRouter(rutas, { initialEntries: [DETALLE_ALUMNO] })
    render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>,
    )
    await screen.findByLabelText("Comentario privado")
    await reposar()
    escribir("Comentario privado", "Tengo una duda")
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentario" }))
    await waitFor(() => expect(erroresDeCampo()).toEqual([GENERICO]))
    expect(avisos()).toEqual([])

    const secciones = await screen.findByRole("list", { name: "Secciones de la clase" })
    fireEvent.click(within(secciones).getByRole("link", { name: /Trabajo de clase/ }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/\/trabajo$/))
    vi.setSystemTime(new Date(AHORA.getTime() + 10_000))
    fireEvent.click(await screen.findByRole("link", { name: /Ensayo final/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe(DETALLE_ALUMNO))
    expect(router.state.historyAction).toBe("PUSH")
    await screen.findByLabelText("Comentario privado")
    await reposar()

    expect(erroresDeCampo()).toEqual([])
    expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
    escribir("Comentario privado", "Tengo una duda")
    fireEvent.click(screen.getByRole("button", { name: "Enviar comentario" }))
    await waitFor(() => expect(llamadas.filter(esElComentario)).toHaveLength(2))
    await waitFor(() => expect(screen.getByLabelText("Comentario privado")).toHaveValue(""))
    await reposar()
    expect(erroresDeCampo()).toEqual([])
    expect(avisos()).toEqual([])
    expect(inesperadas).toEqual([])
  })
})

interface ListaConVerMas {
  nombre: string
  ruta: string
  lista: string
  boton: string
  cargado: string
  siguiente: string
}

const LISTAS: readonly ListaConVerMas[] = [
  {
    nombre: "«Ver más alumnos» de la lista de entregas",
    ruta: ENTREGAS,
    lista: RUTA_ENTREGAS,
    boton: "Ver más alumnos",
    cargado: "Carla Soto",
    siguiente: "Bruno Díaz",
  },
  {
    nombre: "«Ver más comentarios» del hilo del alumno",
    ruta: DETALLE_ALUMNO,
    lista: RUTA_MI_HILO,
    boton: "Ver más comentarios",
    cargado: "Primer comentario",
    siguiente: "Segundo comentario",
  },
  {
    nombre: "«Ver más comentarios» del hilo de un alumno, para el maestro",
    ruta: DE_ALUMNO,
    lista: RUTA_HILO_ALUMNO,
    boton: "Ver más comentarios",
    cargado: "Primer comentario",
    siguiente: "Segundo comentario",
  },
]

const esLaSiguiente =
  (lista: string) =>
  ({ metodo, url }: Llamada) =>
    metodo === "GET" && url.startsWith(`${lista}?`) && conCursor(url) === SIGUIENTE

describe("ataque CHORE-03 03a r1 · los dos «Ver más»: estados vecinos", () => {
  it.each(LISTAS)(
    "$nombre (Providers, retry: 1): dos fallos seguidos dan exactamente un aviso por fallo, el botón sigue disponible y con el foco, y el tercer intento trae las filas sin un aviso de más",
    async (lista) => {
      const falla = () => validacion(ZOD)
      preparar(esLaSiguiente(lista.lista), falla, falla, falla, falla)
      montar(lista.ruta, true)
      const boton = await screen.findByRole("button", { name: lista.boton })
      await reposar()

      boton.focus()
      fireEvent.click(boton)
      await waitFor(() => expect(avisos()).toEqual([GENERICO]), { timeout: 5_000 })
      await reposar()
      expect(llamadas.filter(esLaSiguiente(lista.lista))).toHaveLength(2)
      const segundo = screen.getByRole("button", { name: lista.boton })
      sinEspera(segundo)
      expect(segundo).toHaveFocus()

      fireEvent.click(segundo)
      await waitFor(() => expect(avisos()).toEqual([GENERICO, GENERICO]), { timeout: 5_000 })
      await reposar()
      expect(llamadas.filter(esLaSiguiente(lista.lista))).toHaveLength(4)
      const tercero = screen.getByRole("button", { name: lista.boton })
      sinEspera(tercero)
      expect(tercero).toHaveFocus()
      expect(screen.getAllByText(lista.cargado).length).toBeGreaterThan(0)

      fireEvent.click(tercero)
      expect((await screen.findAllByText(lista.siguiente)).length).toBeGreaterThan(0)
      await reposar()
      expect(llamadas.filter(esLaSiguiente(lista.lista))).toHaveLength(5)
      expect(avisos()).toEqual([GENERICO, GENERICO])
      expect(document.body).not.toHaveTextContent("Too big")
      expect(inesperadas).toEqual([])
    },
    20_000,
  )

  it.each(LISTAS)(
    "$nombre: dos clics seguidos mandan una sola petición de la página siguiente y, si falla, un solo aviso",
    async (lista) => {
      let soltar: ((respuesta: Response) => void) | null = null
      preparar(esLaSiguiente(lista.lista), () => new Promise<Response>((r) => (soltar = r)))
      const { cliente } = montar(lista.ruta)
      const boton = await screen.findByRole("button", { name: lista.boton })
      await asentar(cliente)

      fireEvent.click(boton)
      fireEvent.click(boton)
      await reposar()
      fireEvent.click(screen.getByRole("button", { name: lista.boton }))
      await reposar()
      expect(llamadas.filter(esLaSiguiente(lista.lista))).toHaveLength(1)
      if (soltar === null) throw new Error("Precondición: la página siguiente quedó en vuelo")
      ;(soltar as (respuesta: Response) => void)(validacion(ZOD))
      await asentar(cliente)

      expect(llamadas.filter(esLaSiguiente(lista.lista))).toHaveLength(1)
      expect(avisos()).toEqual([GENERICO])
    },
  )

  it.each(LISTAS)(
    "$nombre: si la vista se desmonta con la página siguiente en vuelo, su fallo no avisa",
    async (lista) => {
      let soltar: ((respuesta: Response) => void) | null = null
      preparar(esLaSiguiente(lista.lista), () => new Promise<Response>((r) => (soltar = r)))
      const { cliente, unmount } = montar(lista.ruta)
      const boton = await screen.findByRole("button", { name: lista.boton })
      await asentar(cliente)

      fireEvent.click(boton)
      await reposar()
      expect(llamadas.filter(esLaSiguiente(lista.lista))).toHaveLength(1)
      unmount()
      if (soltar === null) throw new Error("Precondición: la página siguiente quedó en vuelo")
      ;(soltar as (respuesta: Response) => void)(validacion(ZOD))
      await reposar()
      await reposar()

      expect(avisos()).toEqual([])
    },
  )
})
