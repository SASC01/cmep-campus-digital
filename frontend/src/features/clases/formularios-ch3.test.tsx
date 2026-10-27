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
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { TEXTOS_ADJUNTOS } from "@/components/adjuntos/data"
import {
  CAMPO_FUERA_DE_CONTRATO,
  ENTRADAS_DE_FORMULARIO,
  MENSAJE_DE_PRUEBA,
} from "@/lib/errores-de-api-fuera-de-contrato"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { AdjuntosDePublicacion } from "./components/adjuntos-de-publicacion"
import { CodigoDeClase } from "./components/codigo-de-clase"
import { EditorDeCategorias } from "./components/editor-de-categorias"
import { ElementoDeTrabajo } from "./components/elemento-de-trabajo"
import { FormularioClase } from "./components/formulario-clase"
import { FormularioComentario } from "./components/formulario-comentario"
import { FormularioPublicacion } from "./components/formulario-publicacion"
import { FormularioTema } from "./components/formulario-tema"
import { FormularioUnirseClase } from "./components/formulario-unirse-clase"
import {
  TEXTOS_BUSCADOR_MAESTROS,
  TEXTOS_CATEGORIAS,
  TEXTOS_CODIGO,
  TEXTOS_COMENTARIOS,
  TEXTOS_FORMULARIO_CLASE,
  TEXTOS_FORMULARIO_PUBLICACION,
  TEXTOS_TEMAS,
  TEXTOS_TRABAJO,
  TEXTOS_UNIRSE,
} from "./data"
import {
  useAgregarAlumno,
  useAsignarMaestro,
  useBorrarComentario,
  useBorrarPublicacion,
  useBorrarTema,
  useMoverElemento,
  useOrdenarTemas,
  useQuitarAlumno,
  useRetirarMaestro,
} from "./hooks"
import type { Adjunto, ElementoDeTrabajo as Elemento } from "./types"

// CHORE-03 (03b): los formularios y los controles de features/clases ante un 400 VALIDACION fuera de
// contrato (la tabla común: F1 campo no pintable, F2 campo pintado sin texto visible, F3 sin texto
// visible y sin ruta, F4 ruta de tres niveles). En cada formulario: exactamente un mensaje legible (un
// aviso o un ErrorDeCampo, nunca los dos ni ninguno), sin la ruta ni un texto invisible, lo escrito se
// conserva y el botón sale de la espera. Una sola función de montaje y una prueba parametrizada por
// formulario (indicación del humano, 2026-10-26). El servidor es un doble en memoria. Sin fechas que
// comparar.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const ID_INVALIDO = "debe ser un identificador válido"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const PUBLICACION_ID = "5a5b3c4d-1c1f-4b8e-9a1e-000000000001"
const COMENTARIO_ID = "6a6b3c4d-1c1f-4b8e-9a1e-000000000001"
const TEMA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d31"
const CATEGORIA_ID = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d41"
const ALUMNO_ID = "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const AUTOR = { ...MAESTRO, administracion: false }
const RUTA_CLASE = `/api/clases/${CLASE_ID}`
const ORIGEN_ALMACEN = "https://almacen.ejemplo.mx"
const ARCHIVO = "guia.pdf"

const ADJUNTO: Adjunto = {
  id: "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11",
  nombre: "lectura.pdf",
  tipo: "application/pdf",
  tamano: 2048,
  vistaPrevia: null,
}
const RUTA_DESCARGA = `${RUTA_CLASE}/archivos/${ADJUNTO.id}/descarga`

const MATERIAL: Elemento = {
  id: "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d12",
  tipo: "material",
  titulo: "Lectura de la semana",
  autor: AUTOR,
  creadoEn: "2030-01-02T15:00:00.000Z",
  material: { texto: "", adjuntos: [ADJUNTO] },
  tarea: null,
  puedeMover: false,
  entrega: null,
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
  metodo: string
  url: string
}

// La petición que se responde con `respuestas` (en orden); las demás, con lo de siempre.
let esLaPeticion: (llamada: Llamada) => boolean = () => false
let respuestas: (() => Response)[] = []
let retenidas: ((respuesta: Response) => void)[] = []
let retener = false
let llamadas: Llamada[] = []
let inesperadas: string[] = []

const solicitudDeSubida = () =>
  respuestaJson(201, {
    archivo: {
      id: "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d99",
      nombre: ARCHIVO,
      tipo: "pdf",
      tamano: 9,
    },
    subida: {
      url: `${ORIGEN_ALMACEN}/subida/1`,
      metodo: "PUT",
      cabeceras: { "Content-Type": "application/pdf" },
      expiraEn: "2030-01-10T12:05:00.000Z",
    },
  })

const respuestaNormal = ({ metodo, url }: Llamada): Response | null => {
  const { pathname } = new URL(url, "http://local")
  if (url.startsWith(ORIGEN_ALMACEN)) return new Response(null, { status: 200 })
  if (metodo === "GET" && pathname === "/api/admin/maestros/candidatos") {
    return respuestaJson(200, {
      candidatos: [{ id: MAESTRO.id, nombre: MAESTRO.nombre, email: "luis@x.mx" }],
      hayMas: false,
    })
  }
  if (metodo === "GET" && pathname === `${RUTA_CLASE}/temas`) {
    return respuestaJson(200, { temas: [], sinTema: 0 })
  }
  if (metodo === "POST" && pathname === `${RUTA_CLASE}/archivos`) return solicitudDeSubida()
  return null
}

beforeEach(() => {
  establecerToken("token-de-prueba")
  esLaPeticion = () => false
  respuestas = []
  retenidas = []
  retener = false
  llamadas = []
  inesperadas = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const llamada = { metodo: init?.method ?? "GET", url: String(entrada) }
      llamadas.push(llamada)
      if (esLaPeticion(llamada) && retener) {
        return new Promise<Response>((resolver) => retenidas.push(resolver))
      }
      if (esLaPeticion(llamada)) {
        const siguiente = respuestas.shift()
        if (siguiente !== undefined) return Promise.resolve(siguiente())
        inesperadas.push(`${llamada.metodo} ${llamada.url} sin respuesta preparada`)
        return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
      }
      const normal = respuestaNormal(llamada)
      if (normal !== null) return Promise.resolve(normal)
      inesperadas.push(`${llamada.metodo} ${llamada.url}`)
      return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

const nuevoCliente = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

const asentar = async (cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isFetching() + cliente.isMutating()).toBe(0))
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

// La única función de montaje del módulo (R-01): cualquier formulario o control con su cliente.
const montar = async (elemento: ReactNode) => {
  const cliente = nuevoCliente()
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter>{elemento}</MemoryRouter>
    </QueryClientProvider>,
  )
  await asentar(cliente)
  return cliente
}

const escribir = (etiqueta: string, valor: string): void => {
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
}

const elegirArchivo = () =>
  fireEvent.change(screen.getByLabelText(TEXTOS_ADJUNTOS.adjuntar), {
    target: { files: [new File(["contenido"], ARCHIVO, { type: "application/pdf" })] },
  })

// Los ErrorDeCampo de los formularios: todos llevan un id que termina en "-error".
const erroresDeCampo = () =>
  Array.from(document.querySelectorAll("[id]"))
    .filter((elemento) => /-error$/.test(elemento.id))
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
    expect(texto).not.toContain("archivoId:")
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
  // El control que queda marcado; null si el error es de la lista entera (categorías).
  control: (() => HTMLElement) | null
}

interface Formulario {
  nombre: string
  elemento: () => ReactNode
  llenar: () => Promise<void>
  boton: () => HTMLElement
  envio: (llamada: Llamada) => boolean
  camposPintados: readonly CampoPintado[]
  conservado: () => void
}

const porEtiqueta = (etiqueta: string) => () => screen.getByLabelText(etiqueta)
const porNombre = (nombre: string) => () => screen.getByRole("button", { name: nombre })
const es = (metodo: string, ruta: string) => (llamada: Llamada) =>
  llamada.metodo === metodo && llamada.url === ruta

const NOMBRE_DE_LA_FILA = `${TEXTOS_CATEGORIAS.nombre} ${TEXTOS_CATEGORIAS.deLaFila(1)}`

const FORMULARIOS: readonly Formulario[] = [
  {
    nombre: "crear clase",
    elemento: () => <FormularioClase modo="crear" />,
    llenar: async () => {
      escribir(TEXTOS_FORMULARIO_CLASE.campoNombre, "Álgebra")
      escribir(TEXTOS_BUSCADOR_MAESTROS.campo, "Luis")
      fireEvent.click(await screen.findByRole("button", { name: "Elegir Luis Pérez" }))
    },
    boton: porNombre(TEXTOS_FORMULARIO_CLASE.botonCrear),
    envio: es("POST", "/api/admin/clases"),
    camposPintados: [
      { prefijo: "nombre", control: porEtiqueta(TEXTOS_FORMULARIO_CLASE.campoNombre) },
    ],
    conservado: () =>
      expect(screen.getByLabelText(TEXTOS_FORMULARIO_CLASE.campoNombre)).toHaveValue("Álgebra"),
  },
  {
    nombre: "editar clase",
    elemento: () => (
      <FormularioClase
        modo="editar"
        claseId={CLASE_ID}
        valoresIniciales={{ nombre: "Álgebra", descripcion: null }}
      />
    ),
    llenar: async () => escribir(TEXTOS_FORMULARIO_CLASE.campoNombre, "Álgebra II"),
    boton: porNombre(TEXTOS_FORMULARIO_CLASE.botonGuardar),
    envio: es("PUT", `/api/admin/clases/${CLASE_ID}`),
    camposPintados: [
      { prefijo: "nombre", control: porEtiqueta(TEXTOS_FORMULARIO_CLASE.campoNombre) },
    ],
    conservado: () =>
      expect(screen.getByLabelText(TEXTOS_FORMULARIO_CLASE.campoNombre)).toHaveValue("Álgebra II"),
  },
  {
    nombre: "unirse a una clase",
    elemento: () => <FormularioUnirseClase />,
    llenar: async () => escribir(TEXTOS_UNIRSE.campoCodigo, "ABCD234"),
    boton: porNombre(TEXTOS_UNIRSE.boton),
    envio: es("POST", "/api/clases/unirse"),
    camposPintados: [{ prefijo: "codigo", control: porEtiqueta(TEXTOS_UNIRSE.campoCodigo) }],
    conservado: () =>
      expect(screen.getByLabelText(TEXTOS_UNIRSE.campoCodigo)).toHaveValue("ABCD234"),
  },
  {
    nombre: "publicar un anuncio",
    elemento: () => <FormularioPublicacion claseId={CLASE_ID} />,
    llenar: async () => escribir(TEXTOS_FORMULARIO_PUBLICACION.campoAnuncio, "Mañana hay examen"),
    boton: porNombre(TEXTOS_FORMULARIO_PUBLICACION.publicarAnuncio),
    envio: es("POST", `${RUTA_CLASE}/publicaciones`),
    camposPintados: [
      { prefijo: "texto", control: porEtiqueta(TEXTOS_FORMULARIO_PUBLICACION.campoAnuncio) },
    ],
    conservado: () =>
      expect(screen.getByLabelText(TEXTOS_FORMULARIO_PUBLICACION.campoAnuncio)).toHaveValue(
        "Mañana hay examen",
      ),
  },
  {
    nombre: "publicar un material",
    elemento: () => <FormularioPublicacion claseId={CLASE_ID} />,
    llenar: async () => {
      fireEvent.click(screen.getByRole("button", { name: TEXTOS_FORMULARIO_PUBLICACION.material }))
      escribir(TEXTOS_FORMULARIO_PUBLICACION.campoTitulo, "Lectura")
      escribir(TEXTOS_FORMULARIO_PUBLICACION.campoDescripcion, "Capítulo 3")
      await waitFor(() => expect(llamadas.some(es("GET", `${RUTA_CLASE}/temas`))).toBe(true))
    },
    boton: porNombre(TEXTOS_FORMULARIO_PUBLICACION.publicarMaterial),
    envio: es("POST", `${RUTA_CLASE}/publicaciones`),
    camposPintados: [
      { prefijo: "texto", control: porEtiqueta(TEXTOS_FORMULARIO_PUBLICACION.campoDescripcion) },
    ],
    conservado: () => {
      expect(screen.getByLabelText(TEXTOS_FORMULARIO_PUBLICACION.campoTitulo)).toHaveValue(
        "Lectura",
      )
      expect(screen.getByLabelText(TEXTOS_FORMULARIO_PUBLICACION.campoDescripcion)).toHaveValue(
        "Capítulo 3",
      )
    },
  },
  {
    nombre: "comentar en el muro",
    elemento: () => <FormularioComentario claseId={CLASE_ID} publicacionId={PUBLICACION_ID} />,
    llenar: async () => escribir(TEXTOS_COMENTARIOS.campo, "Tengo una duda"),
    boton: porNombre(TEXTOS_COMENTARIOS.comentar),
    envio: es("POST", `${RUTA_CLASE}/publicaciones/${PUBLICACION_ID}/comentarios`),
    camposPintados: [{ prefijo: "texto", control: porEtiqueta(TEXTOS_COMENTARIOS.campo) }],
    conservado: () =>
      expect(screen.getByLabelText(TEXTOS_COMENTARIOS.campo)).toHaveValue("Tengo una duda"),
  },
  {
    nombre: "crear un tema",
    elemento: () => <FormularioTema claseId={CLASE_ID} onTerminar={() => undefined} />,
    llenar: async () => escribir(TEXTOS_TEMAS.campoNombre, "Unidad 1"),
    boton: porNombre(TEXTOS_TEMAS.crear),
    envio: es("POST", `${RUTA_CLASE}/temas`),
    camposPintados: [{ prefijo: "nombre", control: porEtiqueta(TEXTOS_TEMAS.campoNombre) }],
    conservado: () =>
      expect(screen.getByLabelText(TEXTOS_TEMAS.campoNombre)).toHaveValue("Unidad 1"),
  },
  {
    nombre: "renombrar un tema",
    elemento: () => (
      <FormularioTema
        claseId={CLASE_ID}
        temaId={TEMA_ID}
        nombreInicial="Unidad 1"
        onTerminar={() => undefined}
      />
    ),
    llenar: async () => escribir(TEXTOS_TEMAS.campoNombre, "Unidad 2"),
    boton: porNombre(TEXTOS_TEMAS.guardarNombre),
    envio: es("PUT", `${RUTA_CLASE}/temas/${TEMA_ID}`),
    camposPintados: [{ prefijo: "nombre", control: porEtiqueta(TEXTOS_TEMAS.campoNombre) }],
    conservado: () =>
      expect(screen.getByLabelText(TEXTOS_TEMAS.campoNombre)).toHaveValue("Unidad 2"),
  },
  {
    nombre: "el editor de categorías",
    elemento: () => (
      <EditorDeCategorias
        claseId={CLASE_ID}
        categorias={[{ id: CATEGORIA_ID, nombre: "Tareas", peso: 100, tareas: 0 }]}
      />
    ),
    llenar: async () => escribir(NOMBRE_DE_LA_FILA, "Exámenes"),
    boton: porNombre(TEXTOS_CATEGORIAS.guardar),
    envio: es("PUT", `${RUTA_CLASE}/categorias`),
    camposPintados: [
      { prefijo: "categorias.0.nombre", control: porEtiqueta(NOMBRE_DE_LA_FILA) },
      { prefijo: "categorias", control: null },
    ],
    conservado: () => expect(screen.getByLabelText(NOMBRE_DE_LA_FILA)).toHaveValue("Exámenes"),
  },
]

const abrir = async (formulario: Formulario) => {
  esLaPeticion = formulario.envio
  const cliente = await montar(formulario.elemento())
  await formulario.llenar()
  await asentar(cliente)
  return cliente
}

const enviar = async (formulario: Formulario, cliente: QueryClient) => {
  const antes = llamadas.filter(formulario.envio).length
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

describe("CHORE-03 · formularios de clases ante un VALIDACION fuera de contrato", () => {
  it.each(casosConAviso)(
    "CH3-B07: $formulario.nombre con $nombre da un solo aviso legible, ningún ErrorDeCampo, conserva lo escrito y el botón sale de la espera",
    async ({ formulario, entrada }) => {
      respuestas = [() => validacion(entrada.mensaje)]
      const cliente = await abrir(formulario)

      await enviar(formulario, cliente)

      unSoloMensaje({ aviso: entrada.resto ?? GENERICO })
      conservadoYSinEspera(formulario)
      expect(inesperadas).toEqual([])
    },
  )

  it.each(casosDeF2)(
    "CH3-B07: $formulario.nombre con F2 en $campo.prefijo ($resto) marca el campo con el genérico, sin aviso, conserva lo escrito y el botón sale de la espera",
    async ({ formulario, campo, resto }) => {
      respuestas = [() => validacion(`${campo.prefijo}:${resto}`)]
      const cliente = await abrir(formulario)

      await enviar(formulario, cliente)

      unSoloMensaje({ campo: GENERICO })
      if (campo.control !== null) {
        expect(campo.control()).toHaveAttribute("aria-invalid", "true")
        expect(campo.control()).toHaveAccessibleDescription(expect.stringContaining(GENERICO))
      }
      conservadoYSinEspera(formulario)
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

type Envoltura = ReturnType<typeof conCliente>["envoltura"]

// Un código con mensaje del servidor de clases, sin texto visible: el genérico (N-38).
const ERRORES_DE_CONTROLES = [
  ["F1", () => validacion(ENTRADAS_DE_FORMULARIO["campo-no-pintable"].mensaje), MENSAJE_DE_PRUEBA],
  ["F3", () => validacion(ENTRADAS_DE_FORMULARIO["sin-texto-visible"].mensaje), GENERICO],
  ["F4", () => validacion(ENTRADAS_DE_FORMULARIO.ruta.mensaje), MENSAJE_DE_PRUEBA],
  [
    "SERVICIO_OCUPADO sin texto visible",
    () => errorApi(503, "SERVICIO_OCUPADO", "\u{200B}"),
    GENERICO,
  ],
] as const

interface Control {
  nombre: string
  envio: (llamada: Llamada) => boolean
  accionar: (envoltura: Envoltura) => void
}

const CONTROLES: readonly Control[] = [
  {
    nombre: "borrar una publicación",
    envio: es("DELETE", `${RUTA_CLASE}/publicaciones/${PUBLICACION_ID}`),
    accionar: (envoltura) => {
      const { result } = renderHook(() => useBorrarPublicacion(CLASE_ID), { wrapper: envoltura })
      act(() => result.current.mutate(PUBLICACION_ID))
    },
  },
  {
    nombre: "borrar un comentario",
    envio: es(
      "DELETE",
      `${RUTA_CLASE}/publicaciones/${PUBLICACION_ID}/comentarios/${COMENTARIO_ID}`,
    ),
    accionar: (envoltura) => {
      const { result } = renderHook(() => useBorrarComentario(CLASE_ID, PUBLICACION_ID), {
        wrapper: envoltura,
      })
      act(() => result.current.mutate(COMENTARIO_ID))
    },
  },
  {
    nombre: "agregar un maestro",
    envio: es("POST", `/api/admin/clases/${CLASE_ID}/maestros`),
    accionar: (envoltura) => {
      const { result } = renderHook(() => useAsignarMaestro(CLASE_ID), { wrapper: envoltura })
      act(() => result.current.mutate(MAESTRO))
    },
  },
  {
    nombre: "quitar un maestro",
    envio: es("DELETE", `/api/admin/clases/${CLASE_ID}/maestros/${MAESTRO.id}`),
    accionar: (envoltura) => {
      const { result } = renderHook(() => useRetirarMaestro(CLASE_ID), { wrapper: envoltura })
      act(() => result.current.mutate(MAESTRO))
    },
  },
  {
    nombre: "el alta manual de un alumno",
    envio: es("POST", `${RUTA_CLASE}/alumnos`),
    accionar: (envoltura) => {
      const { result } = renderHook(() => useAgregarAlumno(CLASE_ID), { wrapper: envoltura })
      act(() => result.current.mutate(ALUMNO_ID))
    },
  },
  {
    nombre: "la baja de un alumno",
    envio: es("DELETE", `${RUTA_CLASE}/alumnos/${ALUMNO_ID}`),
    accionar: (envoltura) => {
      const { result } = renderHook(() => useQuitarAlumno(CLASE_ID), { wrapper: envoltura })
      act(() => result.current.mutate({ id: ALUMNO_ID, nombre: "Ana Ruiz" }))
    },
  },
  {
    nombre: "mover un elemento de tema",
    envio: es("PUT", `${RUTA_CLASE}/publicaciones/${PUBLICACION_ID}/tema`),
    accionar: (envoltura) => {
      const { result } = renderHook(() => useMoverElemento(CLASE_ID), { wrapper: envoltura })
      act(() =>
        result.current.mutate({
          publicacionId: PUBLICACION_ID,
          temaId: TEMA_ID,
          titulo: "Lectura",
          nombreDelTema: "Unidad 1",
        }),
      )
    },
  },
  {
    nombre: "reordenar los temas",
    envio: es("PUT", `${RUTA_CLASE}/temas/orden`),
    accionar: (envoltura) => {
      const { result } = renderHook(() => useOrdenarTemas(CLASE_ID), { wrapper: envoltura })
      act(() => result.current.mutate([TEMA_ID]))
    },
  },
  {
    nombre: "borrar un tema",
    envio: es("DELETE", `${RUTA_CLASE}/temas/${TEMA_ID}`),
    accionar: (envoltura) => {
      const { result } = renderHook(() => useBorrarTema(CLASE_ID), { wrapper: envoltura })
      act(() => result.current.mutate(TEMA_ID))
    },
  },
]

const casosDeControles = CONTROLES.flatMap((control) =>
  ERRORES_DE_CONTROLES.map(([nombre, respuesta, esperado]) => ({
    control,
    nombre,
    respuesta,
    esperado,
  })),
)

const NOMBRE_DE_DESCARGAR = `Descargar ${ADJUNTO.nombre}`

interface SitioDeLaFicha {
  sitio: string
  montar: () => Promise<QueryClient>
}

// Los dos sitios de features/clases que usan la ficha con mensajeDeErrorClases: el muro (por el
// envoltorio AdjuntosDePublicacion) y un material de "Trabajo de clase" (O-r2-3).
const SITIOS: readonly SitioDeLaFicha[] = [
  {
    sitio: "el muro",
    montar: () => montar(<AdjuntosDePublicacion claseId={CLASE_ID} adjuntos={[ADJUNTO]} />),
  },
  {
    sitio: "un material de «Trabajo de clase»",
    montar: async () => {
      const cliente = await montar(<ElementoDeTrabajo claseId={CLASE_ID} elemento={MATERIAL} />)
      fireEvent.click(screen.getByRole("button", { name: TEXTOS_TRABAJO.verMaterial }))
      await screen.findByRole("button", { name: NOMBRE_DE_DESCARGAR })
      return cliente
    },
  },
]

const ERRORES_DE_DESCARGA = [
  ...ERRORES_DE_CONTROLES.slice(0, 3),
  [
    "archivoId: archivoId: debe ser un identificador válido",
    () => validacion(`archivoId: archivoId: ${ID_INVALIDO}`),
    ID_INVALIDO,
  ],
] as const

const casosDeDescarga = SITIOS.flatMap((sitio) =>
  ERRORES_DE_DESCARGA.map(([nombre, respuesta, esperado]) => ({
    sitio,
    nombre,
    respuesta,
    esperado,
  })),
)

const botonDescargar = () => screen.getByRole("button", { name: NOMBRE_DE_DESCARGAR })

describe("CHORE-03 · controles de clases sin campos", () => {
  it.each(casosDeControles)(
    "CH3-B08: $control.nombre con $nombre da exactamente un aviso legible",
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
    "CH3-B08: regenerar el código con %s da exactamente un aviso legible (el texto fijo de regenerar)",
    async (_nombre, respuesta) => {
      const envio = es("POST", `${RUTA_CLASE}/codigo`)
      esLaPeticion = envio
      respuestas = [respuesta]
      const cliente = await montar(
        <CodigoDeClase claseId={CLASE_ID} codigo="ABCD234" isError={false} errorMensaje="" />,
      )
      fireEvent.click(screen.getByRole("button", { name: TEXTOS_CODIGO.regenerar }))
      fireEvent.click(screen.getByRole("button", { name: TEXTOS_CODIGO.siRegenerar }))
      await waitFor(() => expect(llamadas.filter(envio)).toHaveLength(1))
      await asentar(cliente)

      expect(avisos()).toEqual([TEXTOS_CODIGO.avisoErrorRegenerar])
      expect(inesperadas).toEqual([])
    },
  )

  it.each(casosDeDescarga)(
    "CH3-B08: la descarga de un adjunto en $sitio.sitio con $nombre da exactamente un aviso legible y el botón sale de la espera",
    async ({ sitio, respuesta, esperado }) => {
      const envio = es("POST", RUTA_DESCARGA)
      esLaPeticion = envio
      respuestas = [respuesta]
      const cliente = await sitio.montar()

      fireEvent.click(botonDescargar())
      await waitFor(() => expect(llamadas.filter(envio)).toHaveLength(1))
      await asentar(cliente)

      unSoloMensaje({ aviso: esperado })
      expect(botonDescargar()).not.toHaveAttribute("aria-busy", "true")
      expect(botonDescargar()).not.toHaveAttribute("aria-disabled", "true")
      expect(inesperadas).toEqual([])
    },
  )

  it.each(SITIOS)(
    "CH3-B08: en $sitio, dos clics seguidos en «Descargar» mandan una sola petición y dan un solo aviso",
    async (sitio) => {
      const envio = es("POST", RUTA_DESCARGA)
      esLaPeticion = envio
      retener = true
      const cliente = await sitio.montar()

      fireEvent.click(botonDescargar())
      fireEvent.click(botonDescargar())
      await waitFor(() => expect(llamadas.filter(envio)).toHaveLength(1))
      const soltar = retenidas.shift()
      expect(soltar, "no había ninguna descarga en vuelo").toBeDefined()
      soltar?.(validacion(ENTRADAS_DE_FORMULARIO.ruta.mensaje))
      await asentar(cliente)

      expect(llamadas.filter(envio)).toHaveLength(1)
      expect(avisos()).toEqual([MENSAJE_DE_PRUEBA])
      expect(retenidas).toEqual([])
      expect(inesperadas).toEqual([])
    },
  )
})

const FORMULARIOS_CON_SUBIDA = FORMULARIOS.filter((formulario) =>
  ["publicar un anuncio", "publicar un material"].includes(formulario.nombre),
)

const casosDeSubida = FORMULARIOS_CON_SUBIDA.flatMap((formulario) =>
  ENTRADAS_CON_AVISO.map(([nombre, entrada]) => ({ formulario, nombre, entrada })),
)

describe("CHORE-03 · solicitud de subida del muro con un VALIDACION fuera de contrato", () => {
  it.each(casosDeSubida)(
    "CH3-B14: $formulario.nombre con $nombre en la solicitud de subida da un solo aviso con el archivo, ningún ErrorDeCampo, conserva lo escrito y no publica",
    async ({ formulario, entrada }) => {
      const solicitud = es("POST", `${RUTA_CLASE}/archivos`)
      esLaPeticion = solicitud
      respuestas = [() => validacion(entrada.mensaje)]
      const cliente = await montar(formulario.elemento())
      await formulario.llenar()
      await asentar(cliente)
      elegirArchivo()

      fireEvent.click(formulario.boton())
      await waitFor(() => expect(llamadas.filter(solicitud)).toHaveLength(1))
      await asentar(cliente)

      unSoloMensaje({ aviso: TEXTOS_ADJUNTOS.errorRechazado(ARCHIVO, entrada.resto ?? GENERICO) })
      expect(screen.getByRole("list", { name: TEXTOS_ADJUNTOS.elegidos })).toHaveTextContent(
        ARCHIVO,
      )
      conservadoYSinEspera(formulario)
      expect(llamadas.filter(formulario.envio)).toHaveLength(0)
      expect(inesperadas).toEqual([])
    },
  )
})

// CHORE-03 (Enmienda 4, T-03 y T-04): un formulario con modos decide qué campos pinta con el modo de
// lo enviado. Un VALIDACION de un campo que acepta en otro modo y no pinta en este da un solo aviso.
const formularioLlamado = (nombre: string): Formulario => {
  const encontrado = FORMULARIOS.find((formulario) => formulario.nombre === nombre)
  if (encontrado === undefined) throw new Error(`No existe el formulario «${nombre}» en la prueba`)
  return encontrado
}

const grupoDeMaestros = () => screen.getByRole("group", { name: TEXTOS_BUSCADOR_MAESTROS.grupo })
const campoTitulo = () => screen.getByLabelText(TEXTOS_FORMULARIO_PUBLICACION.campoTitulo)

interface FilaPorModo {
  formulario: Formulario
  campo: string
  // El control que queda marcado si el modo pinta el campo; null si no lo pinta (un aviso).
  control: (() => HTMLElement) | null
}

const FILAS_POR_MODO: readonly FilaPorModo[] = [
  { formulario: formularioLlamado("crear clase"), campo: "maestroIds", control: grupoDeMaestros },
  { formulario: formularioLlamado("editar clase"), campo: "maestroIds", control: null },
  { formulario: formularioLlamado("publicar un anuncio"), campo: "titulo", control: null },
  { formulario: formularioLlamado("publicar un material"), campo: "titulo", control: campoTitulo },
  {
    formulario: formularioLlamado("crear un tema"),
    campo: "nombre",
    control: porEtiqueta(TEXTOS_TEMAS.campoNombre),
  },
  {
    formulario: formularioLlamado("renombrar un tema"),
    campo: "nombre",
    control: porEtiqueta(TEXTOS_TEMAS.campoNombre),
  },
]

const RESTOS_POR_MODO = [
  ["con mensaje", ` ${MENSAJE_DE_PRUEBA}`, MENSAJE_DE_PRUEBA],
  ["sin texto visible", "\u{200B}", GENERICO],
] as const

const casosPorModo = FILAS_POR_MODO.flatMap((fila) =>
  RESTOS_POR_MODO.map(([variante, resto, esperado]) => ({
    ...fila,
    variante,
    resto,
    esperado,
    pinta: fila.control === null ? "no lo pinta: un aviso" : "lo pinta: un ErrorDeCampo",
  })),
)

const anuncio = formularioLlamado("publicar un anuncio")

describe("CHORE-03 (Enmienda 4) · campo pintado por modo en los formularios de clases", () => {
  it.each(casosPorModo)(
    "CH3-B16: $formulario.nombre con «$campo:» $variante ($pinta) da exactamente un mensaje legible, conserva lo escrito y el botón sale de la espera",
    async ({ formulario, campo, control, resto, esperado }) => {
      respuestas = [() => validacion(`${campo}:${resto}`)]
      const cliente = await abrir(formulario)

      await enviar(formulario, cliente)

      if (control === null) {
        expect(avisos()).toEqual([esperado])
        expect(erroresDeCampo()).toEqual([])
        expect(screen.queryAllByText(esperado)).toHaveLength(0)
        expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
      } else {
        expect(avisos()).toEqual([])
        expect(screen.getAllByText(esperado)).toHaveLength(1)
        expect(control()).toHaveAccessibleDescription(expect.stringContaining(esperado))
      }
      for (const texto of [...avisos(), ...erroresDeCampo()]) {
        expect(texto).not.toContain(`${campo}:`)
        expect(texto).not.toContain("\u{200B}")
      }
      conservadoYSinEspera(formulario)
      expect(inesperadas).toEqual([])
    },
  )

  it("CH3-B16 (e): en el anuncio, tras el aviso de «titulo:», pulsar «Material» no muestra ningún error bajo el título", async () => {
    respuestas = [() => validacion(`titulo: ${MENSAJE_DE_PRUEBA}`)]
    const cliente = await abrir(anuncio)
    await enviar(anuncio, cliente)
    expect(avisos()).toEqual([MENSAJE_DE_PRUEBA])

    fireEvent.click(screen.getByRole("button", { name: TEXTOS_FORMULARIO_PUBLICACION.material }))
    await asentar(cliente)

    expect(campoTitulo()).not.toHaveAttribute("aria-invalid", "true")
    expect(campoTitulo()).not.toHaveAccessibleDescription(
      expect.stringContaining(MENSAJE_DE_PRUEBA),
    )
    expect(erroresDeCampo()).toEqual([])
    expect(screen.queryAllByText(MENSAJE_DE_PRUEBA)).toHaveLength(0)
    expect(avisos()).toEqual([MENSAJE_DE_PRUEBA])
    expect(inesperadas).toEqual([])
  })

  it("CH3-B16 (f): en el anuncio, con el formulario desmontado mientras la petición está en vuelo, «titulo:» da exactamente un aviso (lo da el gancho)", async () => {
    retener = true
    const cliente = await abrir(anuncio)
    fireEvent.click(anuncio.boton())
    await waitFor(() => expect(llamadas.filter(anuncio.envio)).toHaveLength(1))

    cleanup()
    const soltar = retenidas.shift()
    expect(soltar, "no había ninguna publicación en vuelo").toBeDefined()
    soltar?.(validacion(`titulo: ${MENSAJE_DE_PRUEBA}`))
    await asentar(cliente)

    expect(avisos()).toEqual([MENSAJE_DE_PRUEBA])
    expect(retenidas).toEqual([])
    expect(inesperadas).toEqual([])
  })
})
