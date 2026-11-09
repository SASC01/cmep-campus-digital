import { publicacionRespuestaSchema } from "@campus/shared"
import {
  MutationObserver,
  QueryClient,
  QueryClientProvider,
  type QueryKey,
} from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, Outlet, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { useSoloLecturaDeLaClase } from "@/components/clase/hooks"
import { formatearFechaLarga } from "@/lib/format"
import { api, ApiError } from "@/services/apiClient"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ClaseLayout } from "./clase-layout"
import { claveClaseDetalle, claveCodigoDeClase, TEXTOS_CLASE_ARCHIVADA } from "./data"
import { mensajeDeErrorClases } from "./lib"

// ADMIN-01d1 (§D-9): la clase archivada en la interfaz, con el router real (`rutas` de app/router) y el
// QueryClient de app/providers.tsx salvo donde la prueba necesita la caché a mano (ADM-1D108 y
// ADM-1D109, con las mismas opciones y sin reintento). Las esperas son por estado (findBy, waitFor sobre
// la caché, los avisos o `aria-busy`), nunca por tiempo. Las respuestas que la prueba necesita sostener
// (el detalle nuevo) se retienen con una promesa que la prueba suelta.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

type Rol = "estudiante" | "maestro" | "admin"

const ESPERA = { timeout: 6000 }
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const API = `/api/clases/${CLASE_ID}`
const ARCHIVADA_EN = "2026-10-05T12:00:00.000Z"
const TEMA_1 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0001"
const TEMA_2 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0002"
const TAREA_ID = "5a5b3c4d-1c1f-4b8e-9a1e-000000000001"
const MATERIAL_ID = "5a5b3c4d-1c1f-4b8e-9a1e-000000000002"
const PUBLICACION_ID = "5a5b3c4d-1c1f-4b8e-9a1e-000000000003"
const COMENTARIO_ID = "7a7b3c4d-1c1f-4b8e-9a1e-000000000001"
const RECURSO_ID = "6a6b3c4d-1c1f-4b8e-9a1e-000000000001"
const CATEGORIA_1 = "9b9b3c4d-1c1f-4b8e-9a1e-000000000001"
const CATEGORIA_2 = "9b9b3c4d-1c1f-4b8e-9a1e-000000000002"
const ARCHIVO_ID = "9a9b3c4d-1c1f-4b8e-9a1e-000000000001"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const FIRMA = { ...MAESTRO, administracion: false }
const CREADO_EN = "2026-10-01T15:30:00.000Z"
const ARCHIVADA = "Esta clase está archivada: solo se puede consultar."
const BASES: Record<Rol, string> = {
  estudiante: `/estudiante/clases/${CLASE_ID}`,
  maestro: `/maestro/clases/${CLASE_ID}`,
  admin: `/admin/clases/${CLASE_ID}`,
}
const FECHA = formatearFechaLarga(new Date(ARCHIVADA_EN))
const AVISO_MAESTRO = TEXTOS_CLASE_ARCHIVADA.aviso(FECHA)
const AVISO_ADMIN = TEXTOS_CLASE_ARCHIVADA.avisoAdmin(FECHA)

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorJson = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })
const archivadaJson = () => errorJson(409, "CLASE_ARCHIVADA", ARCHIVADA)

interface Llamada {
  metodo: string
  url: URL
  cuerpo: unknown
}

// Respuesta propia para una petición (undefined: la de siempre).
type Manejador = (llamada: Llamada) => Response | Promise<Response> | undefined
const sinManejador: Manejador = () => undefined

const servidor = {
  rol: "maestro" as Rol,
  archivada: false,
  manejador: sinManejador,
}
let llamadas: Llamada[] = []

const detalle = () => ({
  clase: {
    id: CLASE_ID,
    nombre: "Historia",
    descripcion: "Primer semestre",
    maestro: MAESTRO,
    maestros: [MAESTRO],
    archivadaEn: servidor.archivada ? ARCHIVADA_EN : null,
  },
})

const temas = (seccion: string | null) => ({
  temas: [
    { id: TEMA_1, nombre: "Unidad 1", orden: 0, elementos: seccion === "actividades" ? 2 : 0 },
    { id: TEMA_2, nombre: "Unidad 2", orden: 1, elementos: 0 },
  ],
  sinTema: seccion === "docente" ? 1 : 0,
})

const elementoDeTrabajo = (id: string, tipo: "tarea" | "material", titulo: string) => ({
  id,
  tipo,
  titulo,
  autor: FIRMA,
  creadoEn: CREADO_EN,
  material: tipo === "material" ? { texto: "Leer el capítulo 2.", adjuntos: [] } : null,
  tarea: tipo === "tarea" ? { fechaLimite: "2030-10-10T15:00:00.000Z", puntos: 10 } : null,
  puedeMover: true,
  entrega: null,
})

const recursoDeLaLista = {
  id: RECURSO_ID,
  titulo: "Guía de estudio",
  texto: "",
  autor: FIRMA,
  creadoEn: CREADO_EN,
  bloque: "docente",
  adjuntos: [],
  comentarios: 0,
  puedeEditar: true,
  puedeBorrar: true,
  puedeMover: true,
}

const responder = (llamada: Llamada): Response | Promise<Response> => {
  const { metodo, url } = llamada
  if (url.pathname === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "otra" })
  if (url.pathname === "/api/me") {
    return respuestaJson(200, {
      id: "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
      nombre: "Ana López",
      email: "ana@ejemplo.mx",
      rol: servidor.rol,
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  const propia = servidor.manejador(llamada)
  if (propia !== undefined) return propia
  if (url.hostname === "almacen.ejemplo.mx") return new Response(null, { status: 200 })
  if (url.pathname === "/api/clases/inscritas" || url.pathname === "/api/clases/impartidas") {
    return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
  }
  if (url.pathname === API && metodo === "GET") return respuestaJson(200, detalle())
  if (url.pathname === `${API}/codigo`) {
    if (servidor.archivada) return archivadaJson()
    return respuestaJson(200, { codigo: "ABCDEFG" })
  }
  if (url.pathname === `/api/admin/clases/${CLASE_ID}/restaurar` && metodo === "POST") {
    servidor.archivada = false
    return respuestaJson(200, detalle())
  }
  // Toda escritura en una clase archivada responde 409 CLASE_ARCHIVADA, como el sexto paso.
  if (metodo !== "GET" && servidor.archivada) return archivadaJson()
  if (url.pathname === `${API}/publicaciones` && metodo === "GET") {
    return respuestaJson(200, {
      publicaciones: [
        {
          id: PUBLICACION_ID,
          tipo: "anuncio",
          titulo: null,
          texto: "Primer aviso",
          autor: FIRMA,
          creadoEn: CREADO_EN,
          comentarios: 1,
          adjuntos: [],
          puedeBorrar: true,
          tarea: null,
        },
      ],
      siguienteCursor: null,
    })
  }
  if (url.pathname === `${API}/publicaciones` && metodo === "POST") {
    const datos = llamada.cuerpo as { texto?: string; titulo?: string }
    return respuestaJson(201, {
      publicacion: {
        id: "5a5b3c4d-1c1f-4b8e-9a1e-000000000099",
        tipo: "anuncio",
        titulo: datos.titulo ?? null,
        texto: datos.texto ?? "",
        autor: FIRMA,
        creadoEn: CREADO_EN,
        comentarios: 0,
        adjuntos: [],
        puedeBorrar: true,
        tarea: null,
      },
    })
  }
  if (url.pathname === `${API}/publicaciones/${PUBLICACION_ID}/comentarios`) {
    return respuestaJson(200, {
      comentarios: [
        {
          id: COMENTARIO_ID,
          texto: "Un comentario",
          autor: FIRMA,
          creadoEn: CREADO_EN,
          propio: true,
          puedeBorrar: true,
        },
      ],
      siguienteCursor: null,
    })
  }
  if (url.pathname === `${API}/temas` && metodo === "GET") {
    return respuestaJson(200, temas(url.searchParams.get("seccion")))
  }
  if (url.pathname === `${API}/trabajo`) {
    const delTema = url.searchParams.get("tema") === TEMA_1
    return respuestaJson(200, {
      elementos: delTema
        ? [
            elementoDeTrabajo(TAREA_ID, "tarea", "Ensayo final"),
            elementoDeTrabajo(MATERIAL_ID, "material", "Lectura de apoyo"),
          ]
        : [],
      siguienteCursor: null,
    })
  }
  if (url.pathname === `${API}/categorias` && metodo === "GET") {
    return respuestaJson(200, {
      categorias: [
        { id: CATEGORIA_1, nombre: "Tareas", peso: 60, tareas: 0 },
        { id: CATEGORIA_2, nombre: "Exámenes", peso: 40, tareas: 0 },
      ],
    })
  }
  if (url.pathname === `${API}/recursos` && metodo === "GET") {
    const delDocente =
      url.searchParams.get("bloque") === "docente" && url.searchParams.get("tema") === "sin-tema"
    return respuestaJson(200, {
      recursos: delDocente ? [recursoDeLaLista] : [],
      siguienteCursor: null,
    })
  }
  if (url.pathname === `${API}/recursos/${RECURSO_ID}` && metodo === "GET") {
    return respuestaJson(200, { recurso: { ...recursoDeLaLista, version: 0, tema: null } })
  }
  if (url.pathname === `${API}/archivos` && metodo === "POST") {
    const { nombre, tipo, tamano } = llamada.cuerpo as {
      nombre: string
      tipo: string
      tamano: number
    }
    return respuestaJson(201, {
      archivo: { id: ARCHIVO_ID, nombre, tipo, tamano },
      subida: {
        url: "https://almacen.ejemplo.mx/subida/1",
        metodo: "PUT",
        cabeceras: { "Content-Type": tipo },
        expiraEn: "2030-10-02T15:05:00.000Z",
      },
    })
  }
  return errorJson(500, "ERROR_INTERNO", "no esperada")
}

const retener = () => {
  let soltar: () => void = () => {
    throw new Error("Precondición: la respuesta retenida no se creó")
  }
  const promesa = new Promise<void>((resolver) => {
    soltar = resolver
  })
  return { promesa, soltar: () => soltar() }
}

const clienteDePrueba = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 },
      mutations: { retry: false },
    },
  })

const montar = async (entrada: string, cliente?: QueryClient) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [entrada] })
  const arbol = <RouterProvider router={router} />
  render(
    cliente === undefined ? (
      <Providers>{arbol}</Providers>
    ) : (
      <QueryClientProvider client={cliente}>{arbol}</QueryClientProvider>
    ),
  )
  return router
}

const pedidas = (metodo: string, ruta: string) =>
  llamadas.filter((l) => l.metodo === metodo && l.url.pathname === ruta)
const detallesPedidos = () => pedidas("GET", API).length
const errores = () => aviso.error.mock.calls.map(([texto]) => String(texto))
const exitos = () => aviso.success.mock.calls.map(([texto]) => String(texto))
const titulo = () => screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
const avisoFijo = () => screen.queryByText(/^Clase archivada el /)
const enfocarYPulsar = (control: HTMLElement) => {
  act(() => control.focus())
  fireEvent.click(control)
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  servidor.rol = "maestro"
  servidor.archivada = false
  servidor.manejador = sinManejador
  llamadas = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://x")
      const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined
      const llamada = { metodo: init?.method ?? "GET", url, cuerpo }
      llamadas.push(llamada)
      return Promise.resolve(responder(llamada))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

// ---------------------------------------------------------------------------------------------------
// ADM-1D102: ClaseLayout provee el contexto con true al maestro y al admin en una archivada, y con false a
// los tres en una activa. El alumno en una archivada sale por N-05 (ADM-1D208), Enmienda 12, P-01.

function Sonda() {
  const soloLectura = useSoloLecturaDeLaClase()
  return <p data-testid="sonda">{soloLectura ? "solo-lectura" : "escritura"}</p>
}

describe("ClaseLayout provee el contexto de solo lectura (ADM-1D102)", () => {
  it.each([
    ["maestro", true],
    ["admin", true],
    ["estudiante", false],
    ["maestro", false],
    ["admin", false],
  ] as const)(
    "ADM-1D102: perspectiva %s, archivada %s: lo que lee una sección es exactamente si la clase está archivada",
    async (rol, archivada) => {
      servidor.archivada = archivada
      const router = createMemoryRouter(
        [
          {
            path: "/:perspectiva",
            element: <Outlet />,
            children: [
              {
                path: "clases/:claseId",
                element: <ClaseLayout />,
                children: [{ index: true, element: <Sonda /> }],
              },
            ],
          },
        ],
        { initialEntries: [BASES[rol]] },
      )
      render(
        <QueryClientProvider client={clienteDePrueba()}>
          <RouterProvider router={router} />
        </QueryClientProvider>,
      )
      expect(await screen.findByTestId("sonda", {}, ESPERA)).toHaveTextContent(
        archivada ? "solo-lectura" : "escritura",
      )
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// ADM-1D103: el aviso fijo.

describe("el aviso de clase archivada (ADM-1D103)", () => {
  it("ADM-1D103: maestro: el aviso con la fecha larga, sin código, sin «Editar clase», sin «Restaurar» ni «Duplicar»", async () => {
    servidor.archivada = true
    await montar(BASES.maestro)
    expect(await screen.findByText(AVISO_MAESTRO, {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText("ABCDEFG")).toBeNull()
    expect(screen.queryByRole("button", { name: "Regenerar código" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Editar clase" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Restaurar" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Duplicar" })).toBeNull()
    expect(pedidas("GET", `${API}/codigo`)).toEqual([])
  })

  it("ADM-1D103: admin: el aviso «Es de solo lectura.» con la fecha larga, «Restaurar» y «Duplicar», sin código ni «Editar clase»", async () => {
    servidor.rol = "admin"
    servidor.archivada = true
    await montar(BASES.admin)
    expect(await screen.findByText(AVISO_ADMIN, {}, ESPERA)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Restaurar" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Duplicar" })).toHaveAttribute(
      "href",
      `${BASES.admin}/duplicar`,
    )
    expect(screen.queryByText("ABCDEFG")).toBeNull()
    expect(screen.queryByRole("link", { name: "Editar clase" })).toBeNull()
    expect(pedidas("GET", `${API}/codigo`)).toEqual([])
  })

  it.each(["maestro", "admin"] as const)(
    "ADM-1D103: %s: en una clase activa no hay aviso y el código y sus controles siguen",
    async (rol) => {
      servidor.rol = rol
      await montar(BASES[rol])
      expect(await screen.findByText("ABCDEFG", {}, ESPERA)).toBeInTheDocument()
      expect(avisoFijo()).toBeNull()
      expect(screen.queryByRole("button", { name: "Restaurar" })).toBeNull()
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// ADM-1D104: el inventario de §D-9, filas 1 a 21.

interface FilaDelInventario {
  fila: number
  control: string
  rol: Rol
  ruta: string
  // Lo que se lee igual en las dos: la prueba lo espera antes de mirar el control.
  ancla: () => Promise<unknown>
  preparar?: () => Promise<void>
  localizar: () => HTMLElement | null
  // Lo que la fila pinta en su lugar en una archivada (15, 20 y 21).
  enArchivada?: () => Promise<void>
}

const dentroDe = (selector: string, nombre: string) => () => {
  const fila = document.querySelector<HTMLElement>(selector)
  if (fila === null) return null
  return within(fila).queryByRole("button", { name: nombre })
}
const boton = (nombre: string | RegExp) => () => screen.queryByRole("button", { name: nombre })
const enlace = (nombre: string) => () => screen.queryByRole("link", { name: nombre })
const texto = (contenido: string) => () => screen.findByText(contenido, {}, ESPERA)
const abrirComentarios = async () => {
  fireEvent.click(await screen.findByRole("button", { name: "Ver comentarios (1)" }, ESPERA))
  await screen.findByText("Un comentario", {}, ESPERA)
}

const INVENTARIO: FilaDelInventario[] = [
  {
    fila: 1,
    control: "código de invitación",
    rol: "maestro",
    ruta: BASES.maestro,
    ancla: titulo,
    localizar: () => screen.queryByText("ABCDEFG"),
    // El código tampoco se pide: en una archivada no sirve para unirse (y la ruta responde 409).
    enArchivada: async () => {
      await screen.findByText("Primer aviso", {}, ESPERA)
      expect(pedidas("GET", `${API}/codigo`)).toEqual([])
      expect(screen.queryByRole("button", { name: "Regenerar código" })).toBeNull()
    },
  },
  {
    fila: 2,
    control: "«Editar clase»",
    rol: "admin",
    ruta: BASES.admin,
    ancla: texto("Primer aviso"),
    localizar: enlace("Editar clase"),
  },
  {
    fila: 3,
    control: "formulario de publicar aviso",
    rol: "maestro",
    ruta: BASES.maestro,
    ancla: texto("Primer aviso"),
    localizar: boton("Publicar anuncio"),
  },
  {
    fila: 4,
    control: "«Borrar publicación»",
    rol: "maestro",
    ruta: BASES.maestro,
    ancla: texto("Primer aviso"),
    localizar: boton("Borrar publicación"),
  },
  {
    fila: 5,
    control: "formulario de comentar",
    rol: "maestro",
    ruta: BASES.maestro,
    ancla: texto("Primer aviso"),
    preparar: abrirComentarios,
    localizar: boton("Comentar"),
  },
  {
    fila: 6,
    control: "«Borrar» comentario",
    rol: "maestro",
    ruta: BASES.maestro,
    ancla: texto("Primer aviso"),
    preparar: abrirComentarios,
    localizar: dentroDe(`[data-comentario-id="${COMENTARIO_ID}"]`, "Borrar"),
  },
  {
    fila: 7,
    control: "«Crear tarea»",
    rol: "maestro",
    ruta: `${BASES.maestro}/trabajo`,
    ancla: texto("Ensayo final"),
    localizar: enlace("Crear tarea"),
  },
  {
    fila: 8,
    control: "«Nuevo tema»",
    rol: "maestro",
    ruta: `${BASES.maestro}/trabajo`,
    ancla: texto("Ensayo final"),
    localizar: boton("Nuevo tema"),
  },
  {
    fila: 9,
    control: "«Subir»",
    rol: "maestro",
    ruta: `${BASES.maestro}/trabajo`,
    ancla: texto("Ensayo final"),
    localizar: boton("Subir tema Unidad 2"),
  },
  {
    fila: 10,
    control: "«Bajar»",
    rol: "maestro",
    ruta: `${BASES.maestro}/trabajo`,
    ancla: texto("Ensayo final"),
    localizar: boton("Bajar tema Unidad 1"),
  },
  {
    fila: 11,
    control: "renombrar tema",
    rol: "maestro",
    ruta: `${BASES.maestro}/trabajo`,
    ancla: texto("Ensayo final"),
    localizar: boton("Renombrar tema Unidad 1"),
  },
  {
    fila: 12,
    control: "«Borrar tema»",
    rol: "maestro",
    ruta: `${BASES.maestro}/trabajo`,
    ancla: texto("Ensayo final"),
    localizar: boton("Borrar tema tema Unidad 1"),
  },
  {
    fila: 13,
    control: "«Mover» una tarea",
    rol: "maestro",
    ruta: `${BASES.maestro}/trabajo`,
    ancla: texto("Ensayo final"),
    localizar: dentroDe(`[data-elemento-id="${TAREA_ID}"]`, "Mover"),
  },
  {
    fila: 14,
    control: "la acción de escritura de un material («Mover»)",
    rol: "maestro",
    ruta: `${BASES.maestro}/trabajo`,
    ancla: async () => {
      await screen.findByText("Lectura de apoyo", {}, ESPERA)
      // "Ver material" es lectura: se queda en las dos.
      expect(
        within(
          document.querySelector<HTMLElement>(`[data-elemento-id="${MATERIAL_ID}"]`) ??
            document.body,
        ).getByRole("button", { name: "Ver material" }),
      ).toBeInTheDocument()
    },
    localizar: dentroDe(`[data-elemento-id="${MATERIAL_ID}"]`, "Mover"),
  },
  {
    fila: 15,
    control: "editor de categorías",
    rol: "maestro",
    ruta: `${BASES.maestro}/categorias`,
    ancla: () => screen.findByRole("heading", { name: "Categorías de calificación" }, ESPERA),
    localizar: boton("Guardar categorías"),
    enArchivada: async () => {
      expect(await screen.findByText("Tareas", {}, ESPERA)).toBeInTheDocument()
      expect(screen.getByText("60 %")).toBeInTheDocument()
      expect(screen.getByText("Exámenes")).toBeInTheDocument()
      expect(screen.getByText("40 %")).toBeInTheDocument()
      expect(screen.queryAllByRole("textbox")).toEqual([])
      expect(screen.queryByRole("button", { name: /Agregar categoría|Quitar/ })).toBeNull()
    },
  },
  {
    fila: 16,
    control: "formulario de publicar recurso",
    rol: "maestro",
    ruta: `${BASES.maestro}/recursos`,
    ancla: texto("Guía de estudio"),
    localizar: boton("Publicar recurso"),
  },
  {
    fila: 17,
    control: "«Editar recurso»",
    rol: "maestro",
    ruta: `${BASES.maestro}/recursos`,
    ancla: texto("Guía de estudio"),
    localizar: enlace("Editar recurso"),
  },
  {
    fila: 18,
    control: "«Borrar recurso»",
    rol: "maestro",
    ruta: `${BASES.maestro}/recursos`,
    ancla: texto("Guía de estudio"),
    localizar: boton("Borrar recurso"),
  },
  {
    fila: 19,
    control: "«Mover» recurso",
    rol: "maestro",
    ruta: `${BASES.maestro}/recursos`,
    ancla: texto("Guía de estudio"),
    localizar: dentroDe(`[data-recurso-id="${RECURSO_ID}"]`, "Mover"),
  },
  {
    fila: 20,
    control: "la ruta de editar un recurso",
    rol: "maestro",
    ruta: `${BASES.maestro}/recursos/${RECURSO_ID}/editar`,
    ancla: titulo,
    localizar: boton("Guardar cambios"),
    enArchivada: async () => {
      expect(await screen.findByRole("alert", {}, ESPERA)).toHaveTextContent(ARCHIVADA)
      expect(screen.getByRole("link", { name: "Volver a Recursos" })).toHaveAttribute(
        "href",
        `${BASES.maestro}/recursos`,
      )
      expect(screen.queryByRole("textbox")).toBeNull()
    },
  },
  {
    fila: 21,
    control: "la ruta de editar la clase",
    rol: "admin",
    ruta: `${BASES.admin}/editar`,
    ancla: titulo,
    localizar: () => screen.queryByRole("textbox", { name: "Nombre de la clase" }),
    enArchivada: async () => {
      expect(await screen.findByRole("alert", {}, ESPERA)).toHaveTextContent(ARCHIVADA)
      expect(screen.getByRole("link", { name: "Volver a la clase" })).toHaveAttribute(
        "href",
        BASES.admin,
      )
      expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull()
    },
  },
]

describe("los controles de escritura de las filas 1 a 21 (ADM-1D104)", () => {
  it("ADM-1D104: el inventario cubre las filas 1 a 21, una vez cada una", () => {
    expect(INVENTARIO.map(({ fila }) => fila)).toEqual(
      Array.from({ length: 21 }, (_, indice) => indice + 1),
    )
  })

  it.each(INVENTARIO.map((fila) => [fila.fila, fila.control, fila] as const))(
    "ADM-1D104 fila %i (%s): en una activa se pinta",
    async (_n, _control, fila) => {
      servidor.rol = fila.rol
      await montar(fila.ruta)
      await fila.ancla()
      await fila.preparar?.()
      await waitFor(() => expect(fila.localizar()).not.toBeNull(), ESPERA)
      expect(avisoFijo()).toBeNull()
    },
  )

  it.each(INVENTARIO.map((fila) => [fila.fila, fila.control, fila] as const))(
    "ADM-1D104 fila %i (%s): en una archivada no se pinta",
    async (_n, _control, fila) => {
      servidor.rol = fila.rol
      servidor.archivada = true
      await montar(fila.ruta)
      expect(await screen.findByText(/^Clase archivada el /, {}, ESPERA)).toBeInTheDocument()
      await fila.ancla()
      await fila.preparar?.()
      await fila.enArchivada?.()
      expect(fila.localizar()).toBeNull()
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// ADM-1D105: la clase se archiva con Avisos abierto.

describe("la clase se archiva con la vista abierta (ADM-1D105)", () => {
  it("ADM-1D105: el envío recibe 409 CLASE_ARCHIVADA: un solo aviso, lo escrito se conserva hasta el detalle nuevo, que se pide una vez; después, el aviso fijo, sin formulario, y el foco en el título", async () => {
    await montar(BASES.maestro)
    const campo = await screen.findByRole("textbox", { name: "Anuncio" }, ESPERA)
    await screen.findByText("Primer aviso", {}, ESPERA)
    const publicacionesAntes = pedidas("GET", `${API}/publicaciones`).length
    const detallesAntes = detallesPedidos()
    fireEvent.change(campo, { target: { value: "Mañana no hay clase" } })

    // El servidor archiva la clase; el detalle nuevo se retiene para ver lo escrito mientras llega.
    servidor.archivada = true
    const detalleNuevo = retener()
    servidor.manejador = ({ metodo, url }) => {
      if (metodo !== "GET" || url.pathname !== API) return undefined
      return detalleNuevo.promesa.then(() => respuestaJson(200, detalle()))
    }
    enfocarYPulsar(screen.getByRole("button", { name: "Publicar anuncio" }))

    await waitFor(() => expect(errores()).toEqual([ARCHIVADA]), ESPERA)
    await waitFor(() => expect(detallesPedidos()).toBe(detallesAntes + 1), ESPERA)
    expect(screen.getByRole("textbox", { name: "Anuncio" })).toHaveValue("Mañana no hay clase")
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Publicar anuncio" })).not.toHaveAttribute(
        "aria-busy",
      ),
    )
    expect(avisoFijo()).toBeNull()

    detalleNuevo.soltar()
    expect(await screen.findByText(AVISO_MAESTRO, {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "Anuncio" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Publicar anuncio" })).toBeNull()
    expect(await titulo()).toHaveFocus()
    expect(detallesPedidos()).toBe(detallesAntes + 1)
    expect(errores()).toEqual([ARCHIVADA])
    expect(exitos()).toEqual([])
    // Solo el detalle (exact): la lista de Avisos no se vuelve a pedir por este error.
    expect(pedidas("GET", `${API}/publicaciones`)).toHaveLength(publicacionesAntes)
    expect(pedidas("POST", `${API}/publicaciones`)).toHaveLength(1)
  })

  it("ADM-1D105 (vista desmontada): el 409 llega cuando la persona ya salió de la clase: un solo aviso, el detalle queda viejo sin pedirse y, al volver, se pide y aparece el aviso fijo", async () => {
    const cliente = clienteDePrueba()
    const router = await montar(BASES.maestro, cliente)
    const campo = await screen.findByRole("textbox", { name: "Anuncio" }, ESPERA)
    fireEvent.change(campo, { target: { value: "Mañana no hay clase" } })
    const envio = retener()
    servidor.manejador = ({ metodo, url }) => {
      if (metodo !== "POST" || url.pathname !== `${API}/publicaciones`) return undefined
      return envio.promesa.then(() => archivadaJson())
    }
    fireEvent.click(screen.getByRole("button", { name: "Publicar anuncio" }))
    await waitFor(() => expect(pedidas("POST", `${API}/publicaciones`)).toHaveLength(1))

    await act(() => router.navigate("/maestro"))
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Historia" })).toBeNull())
    const detallesAntes = detallesPedidos()
    servidor.archivada = true
    envio.soltar()

    await waitFor(() => expect(errores()).toEqual([ARCHIVADA]), ESPERA)
    await waitFor(() =>
      expect(cliente.getQueryState(claveClaseDetalle(CLASE_ID))?.isInvalidated).toBe(true),
    )
    expect(detallesPedidos()).toBe(detallesAntes)

    // Al volver se pinta primero el detalle viejo y se pide el nuevo. Con el viejo, el encabezado puede
    // pedir el código antes de que llegue: su 409 vuelve a marcar el detalle (una petición más, sin ciclo).
    await act(() => router.navigate(BASES.maestro))
    expect(await screen.findByText(AVISO_MAESTRO, {}, ESPERA)).toBeInTheDocument()
    await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
    expect(detallesPedidos()).toBeGreaterThanOrEqual(detallesAntes + 1)
    expect(detallesPedidos()).toBeLessThanOrEqual(detallesAntes + 2)
    expect(errores()).toEqual([ARCHIVADA])
  })
})

// ---------------------------------------------------------------------------------------------------
// ADM-1D106: «Restaurar» desde el aviso.

const ENTRADAS_DE_ACCION = [
  ["(a) claseId:", "claseId: debe ser un identificador válido"],
  ["(b) vacío", ""],
  ["(b) espacios", "   "],
  ["(c) confirmar.0:", "confirmar.0: no es válido"],
] as const

describe("«Restaurar» desde el aviso (ADM-1D106)", () => {
  beforeEach(() => {
    servidor.rol = "admin"
    servidor.archivada = true
  })

  it("ADM-1D106: dos clics, una petición; aviso «Clase restaurada»; el aviso fijo desaparece, vuelven los controles y el foco va al título", async () => {
    const respuesta = retener()
    servidor.manejador = ({ metodo, url }) => {
      if (metodo !== "POST" || !url.pathname.endsWith("/restaurar")) return undefined
      return respuesta.promesa.then(() => {
        servidor.archivada = false
        return respuestaJson(200, detalle())
      })
    }
    await montar(BASES.admin)
    const restaurar = await screen.findByRole("button", { name: "Restaurar" }, ESPERA)
    enfocarYPulsar(restaurar)
    fireEvent.click(restaurar)
    await waitFor(() => expect(restaurar).toHaveAttribute("aria-busy", "true"))
    fireEvent.click(restaurar)
    respuesta.soltar()

    await waitFor(() => expect(avisoFijo()).toBeNull(), ESPERA)
    expect(pedidas("POST", `/api/admin/clases/${CLASE_ID}/restaurar`)).toHaveLength(1)
    expect(exitos()).toEqual(["Clase restaurada"])
    expect(errores()).toEqual([])
    expect(await screen.findByRole("link", { name: "Editar clase" }, ESPERA)).toBeInTheDocument()
    expect(
      await screen.findByRole("button", { name: "Publicar anuncio" }, ESPERA),
    ).toBeInTheDocument()
    expect(await titulo()).toHaveFocus()
  })

  it("ADM-1D106: con 409 CLASE_NO_ARCHIVADA (otra pestaña ya la restauró): un solo aviso y se renueva el detalle; el aviso fijo desaparece", async () => {
    const yaRestaurada = "Esta clase no está archivada."
    servidor.manejador = ({ metodo, url }) => {
      if (metodo !== "POST" || !url.pathname.endsWith("/restaurar")) return undefined
      servidor.archivada = false
      return errorJson(409, "CLASE_NO_ARCHIVADA", yaRestaurada)
    }
    await montar(BASES.admin)
    const detallesAntes = await waitFor(() => {
      expect(screen.getByRole("button", { name: "Restaurar" })).toBeInTheDocument()
      return detallesPedidos()
    }, ESPERA)
    enfocarYPulsar(screen.getByRole("button", { name: "Restaurar" }))

    await waitFor(() => expect(avisoFijo()).toBeNull(), ESPERA)
    expect(errores()).toEqual([yaRestaurada])
    expect(exitos()).toEqual([])
    expect(detallesPedidos()).toBe(detallesAntes + 1)
    expect(await titulo()).toHaveFocus()
  })

  it.each(ENTRADAS_DE_ACCION)(
    "ADM-1D106 (ADM-1C15 %s) en «Restaurar» del aviso: un solo aviso legible y el botón sale de la espera",
    async (_caso, mensaje) => {
      servidor.manejador = ({ url }) =>
        url.pathname.endsWith("/restaurar") ? errorJson(400, "VALIDACION", mensaje) : undefined
      await montar(BASES.admin)
      const restaurar = await screen.findByRole("button", { name: "Restaurar" }, ESPERA)
      enfocarYPulsar(restaurar)
      await waitFor(() => expect(errores()).toHaveLength(1), ESPERA)
      expect(errores()).toEqual([mensajeDeErrorClases(new ApiError("VALIDACION", mensaje, 400))])
      expect(errores()[0]?.trim().length).toBeGreaterThan(0)
      await waitFor(() => expect(restaurar).not.toHaveAttribute("aria-busy"))
      expect(screen.queryAllByRole("alert")).toHaveLength(0)
      expect(avisoFijo()).not.toBeNull()
    },
  )

  it("ADM-1D106 (matriz, 5xx): un solo aviso, el aviso fijo se queda y el botón sale de la espera", async () => {
    servidor.manejador = ({ url }) =>
      url.pathname.endsWith("/restaurar") ? errorJson(500, "ERROR_INTERNO", "Falló.") : undefined
    await montar(BASES.admin)
    const restaurar = await screen.findByRole("button", { name: "Restaurar" }, ESPERA)
    enfocarYPulsar(restaurar)
    await waitFor(() => expect(errores()).toHaveLength(1), ESPERA)
    expect(errores()).toEqual([mensajeDeErrorClases(new ApiError("ERROR_INTERNO", "Falló.", 500))])
    await waitFor(() => expect(restaurar).not.toHaveAttribute("aria-busy"))
    expect(avisoFijo()).not.toBeNull()
    expect(restaurar).toHaveFocus()
  })

  it("ADM-1D106 (en vuelo a la vez): con la restauración de esa clase en vuelo desde otra instancia (la tabla), «Restaurar» del aviso espera con ella y no manda otra", async () => {
    const respuesta = retener()
    servidor.manejador = ({ metodo, url }) => {
      if (metodo === "GET" && url.pathname === "/api/admin/clases") {
        return respuestaJson(200, {
          clases: [
            {
              id: CLASE_ID,
              nombre: "Historia",
              maestros: [MAESTRO],
              alumnos: 3,
              creadoEn: CREADO_EN,
              archivadaEn: servidor.archivada ? ARCHIVADA_EN : null,
            },
          ].filter((c) => c.archivadaEn !== null),
          total: servidor.archivada ? 1 : 0,
          siguienteCursor: null,
          siguienteCursorArchivadaEn: null,
        })
      }
      if (metodo !== "POST" || !url.pathname.endsWith("/restaurar")) return undefined
      return respuesta.promesa.then(() => {
        servidor.archivada = false
        return respuestaJson(200, detalle())
      })
    }
    const router = await montar("/admin/clases?estado=archivadas")
    fireEvent.click(await screen.findByRole("button", { name: "Restaurar Historia" }, ESPERA))
    await waitFor(() =>
      expect(pedidas("POST", `/api/admin/clases/${CLASE_ID}/restaurar`)).toHaveLength(1),
    )
    await act(() => router.navigate(BASES.admin))
    const delAviso = await screen.findByRole("button", { name: "Restaurar" }, ESPERA)
    expect(delAviso).toHaveAttribute("aria-busy", "true")
    fireEvent.click(delAviso)
    respuesta.soltar()
    await waitFor(() => expect(avisoFijo()).toBeNull(), ESPERA)
    expect(pedidas("POST", `/api/admin/clases/${CLASE_ID}/restaurar`)).toHaveLength(1)
    expect(exitos()).toEqual(["Clase restaurada"])
  })
})

// ---------------------------------------------------------------------------------------------------
// ADM-1D107: la solicitud de subida recibe el 409 (aviso y recurso con adjunto).

const elegirArchivo = () => {
  const archivo = new File(["contenido"], "lectura.pdf", { type: "application/pdf" })
  fireEvent.change(screen.getByLabelText("Adjuntar archivos"), { target: { files: [archivo] } })
}

const FORMULARIOS_CON_ADJUNTO = [
  {
    nombre: "aviso",
    ruta: BASES.maestro,
    llenar: async () => {
      const campo = await screen.findByRole("textbox", { name: "Anuncio" }, ESPERA)
      fireEvent.change(campo, { target: { value: "Lean esto" } })
    },
    escrito: () => screen.queryByRole("textbox", { name: "Anuncio" }),
    valor: "Lean esto",
    enviar: "Publicar anuncio",
  },
  {
    nombre: "recurso",
    ruta: `${BASES.maestro}/recursos`,
    llenar: async () => {
      const campo = await screen.findByRole("textbox", { name: "Título del recurso" }, ESPERA)
      fireEvent.change(campo, { target: { value: "Lectura extra" } })
    },
    escrito: () => screen.queryByRole("textbox", { name: "Título del recurso" }),
    valor: "Lectura extra",
    enviar: "Publicar recurso",
  },
] as const

describe("la solicitud de subida recibe 409 CLASE_ARCHIVADA (ADM-1D107)", () => {
  it.each(FORMULARIOS_CON_ADJUNTO)(
    "ADM-1D107 $nombre: no sale la publicación ni el PUT; un solo aviso; lo escrito y el archivo se conservan hasta el detalle nuevo; después, el aviso fijo y el formulario deja de pintarse",
    async (formulario) => {
      await montar(formulario.ruta)
      await formulario.llenar()
      elegirArchivo()
      expect(screen.getAllByText("lectura.pdf").length).toBeGreaterThan(0)
      const publicacionesAntes = pedidas("GET", `${API}/publicaciones`).length
      const detallesAntes = detallesPedidos()

      servidor.archivada = true
      const detalleNuevo = retener()
      servidor.manejador = ({ metodo, url }) => {
        if (metodo !== "GET" || url.pathname !== API) return undefined
        return detalleNuevo.promesa.then(() => respuestaJson(200, detalle()))
      }
      enfocarYPulsar(screen.getByRole("button", { name: formulario.enviar }))

      await waitFor(
        () =>
          expect(errores()).toEqual([
            "No pudimos subir «lectura.pdf»: Esta clase está archivada: solo se puede consultar.",
          ]),
        ESPERA,
      )
      await waitFor(() => expect(detallesPedidos()).toBe(detallesAntes + 1), ESPERA)
      expect(pedidas("POST", `${API}/archivos`)).toHaveLength(1)
      expect(pedidas("POST", `${API}/publicaciones`)).toEqual([])
      expect(llamadas.filter(({ metodo }) => metodo === "PUT")).toEqual([])
      expect(formulario.escrito()).toHaveValue(formulario.valor)
      expect(screen.getAllByText("lectura.pdf").length).toBeGreaterThan(0)

      detalleNuevo.soltar()
      expect(await screen.findByText(AVISO_MAESTRO, {}, ESPERA)).toBeInTheDocument()
      expect(formulario.escrito()).toBeNull()
      expect(screen.queryByRole("button", { name: formulario.enviar })).toBeNull()
      expect(errores()).toHaveLength(1)
      expect(detallesPedidos()).toBe(detallesAntes + 1)
      expect(pedidas("GET", `${API}/publicaciones`)).toHaveLength(publicacionesAntes)
    },
  )

  it.each(FORMULARIOS_CON_ADJUNTO)(
    "ADM-1D107 $nombre en una clase activa: la subida sigue como hoy (solicitud, PUT y publicación), sin pedir el detalle",
    async (formulario) => {
      await montar(formulario.ruta)
      await formulario.llenar()
      elegirArchivo()
      const detallesAntes = detallesPedidos()
      fireEvent.click(screen.getByRole("button", { name: formulario.enviar }))
      await waitFor(() => expect(pedidas("POST", `${API}/publicaciones`)).toHaveLength(1), ESPERA)
      expect(pedidas("POST", `${API}/archivos`)).toHaveLength(1)
      expect(llamadas.filter(({ metodo }) => metodo === "PUT")).toHaveLength(1)
      expect(errores()).toEqual([])
      expect(detallesPedidos()).toBe(detallesAntes)
      expect(avisoFijo()).toBeNull()
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// ADM-1D108: la recarga del código recibe el 409.

describe("la recarga del código recibe 409 CLASE_ARCHIVADA (ADM-1D108)", () => {
  it("ADM-1D108: el detalle se marca viejo y se pide una sola vez; el código deja de pintarse y aparece el aviso fijo; nada entra en ciclo", async () => {
    const cliente = clienteDePrueba()
    await montar(BASES.maestro, cliente)
    expect(await screen.findByText("ABCDEFG", {}, ESPERA)).toBeInTheDocument()
    await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
    const detallesAntes = detallesPedidos()

    servidor.archivada = true
    await act(() => cliente.invalidateQueries({ queryKey: claveCodigoDeClase(CLASE_ID) }))

    expect(await screen.findByText(AVISO_MAESTRO, {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText("ABCDEFG")).toBeNull()
    await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
    expect(detallesPedidos()).toBe(detallesAntes + 1)
    expect(pedidas("GET", `${API}/codigo`)).toHaveLength(2)
    expect(errores()).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------------
// ADM-1D109: la escucha se da de baja y solo reacciona a CLASE_ARCHIVADA.

const fallarUnaConsulta = (cliente: QueryClient, clave: QueryKey, error: ApiError) =>
  act(async () => {
    await cliente
      .fetchQuery({ queryKey: clave, queryFn: () => Promise.reject(error), retry: false })
      .catch(() => undefined)
  })

const fallarUnaMutacion = (cliente: QueryClient, error: ApiError) =>
  act(async () => {
    await new MutationObserver(cliente, { mutationFn: () => Promise.reject(error) })
      .mutate()
      .catch(() => undefined)
  })

describe("la escucha de ClaseLayout (ADM-1D109)", () => {
  it.each([
    ["una consulta", "consulta"],
    ["una mutación", "mutacion"],
  ] as const)(
    "ADM-1D109: con ClaseLayout montado, %s con CLASE_ARCHIVADA renueva el detalle una vez; con 409 TAREA_MODIFICADA o 500, no",
    async (_nombre, origen) => {
      const cliente = clienteDePrueba()
      await montar(BASES.maestro, cliente)
      await titulo()
      await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
      const fallar = (error: ApiError) =>
        origen === "consulta"
          ? fallarUnaConsulta(cliente, ["otra", error.codigo], error)
          : fallarUnaMutacion(cliente, error)
      const detallesAntes = detallesPedidos()

      await fallar(new ApiError("TAREA_MODIFICADA", "Otra versión.", 409))
      await fallar(new ApiError("ERROR_INTERNO", "Falló.", 500))
      expect(cliente.getQueryState(claveClaseDetalle(CLASE_ID))?.isInvalidated).toBe(false)
      expect(detallesPedidos()).toBe(detallesAntes)

      await fallar(new ApiError("CLASE_ARCHIVADA", ARCHIVADA, 409))
      await waitFor(() => expect(detallesPedidos()).toBe(detallesAntes + 1), ESPERA)
      await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
      expect(detallesPedidos()).toBe(detallesAntes + 1)
    },
  )

  it.each([
    ["una consulta", "consulta"],
    ["una mutación", "mutacion"],
  ] as const)(
    "ADM-1D109: con ClaseLayout desmontado, %s con CLASE_ARCHIVADA no toca el detalle",
    async (_nombre, origen) => {
      const cliente = clienteDePrueba()
      const router = await montar(BASES.maestro, cliente)
      await titulo()
      await act(() => router.navigate("/maestro"))
      await waitFor(() => expect(screen.queryByRole("heading", { name: "Historia" })).toBeNull())
      await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
      const detallesAntes = detallesPedidos()
      const error = new ApiError("CLASE_ARCHIVADA", ARCHIVADA, 409)

      if (origen === "consulta") await fallarUnaConsulta(cliente, ["otra"], error)
      if (origen === "mutacion") await fallarUnaMutacion(cliente, error)

      expect(cliente.getQueryState(claveClaseDetalle(CLASE_ID))?.isInvalidated).toBe(false)
      expect(detallesPedidos()).toBe(detallesAntes)
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// Estados vecinos del foco (§D-9, DESIGN.md §7.14): la clase pasa a archivada con el foco en un control
// que desaparece. Fuera de una fila, al título (ADM-1D105). Dentro de una fila con su propio mecanismo
// de foco (la publicación, el tema, la sección de recursos), ese mecanismo lo deja en la fila o en su
// encabezado, nunca en <body>. Con el foco soltado, no se mueve.

const archivarConLaVistaAbierta = async (cliente: QueryClient) => {
  servidor.archivada = true
  await act(() => cliente.invalidateQueries({ queryKey: claveClaseDetalle(CLASE_ID), exact: true }))
  expect(await screen.findByText(AVISO_MAESTRO, {}, ESPERA)).toBeInTheDocument()
}

describe("el foco cuando la clase pasa a archivada (estados vecinos de ADM-1D105)", () => {
  it("vecino: con el foco en «Borrar publicación», el foco queda en su publicación, no en <body>", async () => {
    const cliente = clienteDePrueba()
    await montar(BASES.maestro, cliente)
    const borrar = await screen.findByRole("button", { name: "Borrar publicación" }, ESPERA)
    act(() => borrar.focus())
    await archivarConLaVistaAbierta(cliente)
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.querySelector(`[data-publicacion-id="${PUBLICACION_ID}"]`),
      ),
    )
  })

  it("vecino: con el foco en «Borrar tema», el foco queda en el encabezado de ese tema, no en <body>", async () => {
    const cliente = clienteDePrueba()
    await montar(`${BASES.maestro}/trabajo`, cliente)
    const borrar = await screen.findByRole("button", { name: "Borrar tema tema Unidad 1" }, ESPERA)
    act(() => borrar.focus())
    await archivarConLaVistaAbierta(cliente)
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.querySelector(`[data-tema-id="${TEMA_1}"] [data-encabezado-tema]`),
      ),
    )
  })

  it("vecino: con el foco en «Borrar recurso», el foco no cae en <body>", async () => {
    const cliente = clienteDePrueba()
    await montar(`${BASES.maestro}/recursos`, cliente)
    const borrar = await screen.findByRole("button", { name: "Borrar recurso" }, ESPERA)
    act(() => borrar.focus())
    await archivarConLaVistaAbierta(cliente)
    await waitFor(() => expect(screen.queryByRole("button", { name: "Borrar recurso" })).toBeNull())
    await waitFor(() => {
      expect(document.activeElement).not.toBe(document.body)
      expect(document.activeElement?.isConnected).toBe(true)
    })
  })

  it("vecino: con el foco soltado (en <body>), la clase pasa a archivada y el foco no se mueve", async () => {
    const cliente = clienteDePrueba()
    await montar(BASES.maestro, cliente)
    await screen.findByRole("button", { name: "Publicar anuncio" }, ESPERA)
    act(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    })
    expect(document.activeElement).toBe(document.body)
    await archivarConLaVistaAbierta(cliente)
    expect(document.activeElement).toBe(document.body)
  })

  it("vecino: con el foco en un control que sigue (la barra), la clase pasa a archivada y el foco no se mueve", async () => {
    const cliente = clienteDePrueba()
    await montar(BASES.maestro, cliente)
    await screen.findByRole("button", { name: "Publicar anuncio" }, ESPERA)
    const cerrar = screen.getByRole("button", { name: "Cerrar sesión" })
    act(() => cerrar.focus())
    await archivarConLaVistaAbierta(cliente)
    expect(cerrar).toHaveFocus()
  })
})

// ---------------------------------------------------------------------------------------------------
// M-01 de la verificación de 01d1: más estados vecinos del foco al título y de la escucha.

const OTRA_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02"
const OTRA_API = `/api/clases/${OTRA_ID}`

// La otra clase: activa, con sus Avisos vacíos y dos categorías.
const responderLaOtra: Manejador = ({ metodo, url }) => {
  if (!url.pathname.startsWith(OTRA_API)) return undefined
  if (url.pathname === OTRA_API) {
    return respuestaJson(200, {
      clase: {
        id: OTRA_ID,
        nombre: "Geografía",
        descripcion: null,
        maestro: MAESTRO,
        maestros: [MAESTRO],
        archivadaEn: null,
      },
    })
  }
  if (url.pathname === `${OTRA_API}/codigo`) return respuestaJson(200, { codigo: "HIJKLMN" })
  if (url.pathname === `${OTRA_API}/publicaciones` && metodo === "GET") {
    return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
  }
  if (url.pathname === `${OTRA_API}/categorias` && metodo === "GET") {
    return respuestaJson(200, {
      categorias: [{ id: CATEGORIA_1, nombre: "Proyectos", peso: 100, tareas: 0 }],
    })
  }
  if (metodo === "POST") return archivadaJson()
  return undefined
}

const laRaiz = async () => {
  const raiz = (await titulo()).parentElement?.closest<HTMLElement>('[tabindex="-1"]')
  if (raiz === null || raiz === undefined) throw new Error("Precondición: la raíz de ClaseLayout")
  return raiz
}

describe("M-01: estados vecinos del foco al título y de la escucha", () => {
  it("M-01 (a): con el foco en la raíz de la clase (un clic en un espacio en blanco), la clase pasa a archivada y el foco se queda en la raíz", async () => {
    const cliente = clienteDePrueba()
    await montar(BASES.maestro, cliente)
    await screen.findByRole("button", { name: "Publicar anuncio" }, ESPERA)
    const raiz = await laRaiz()
    act(() => raiz.focus())
    await archivarConLaVistaAbierta(cliente)
    expect(raiz).toHaveFocus()
  })

  it("M-01 (a): con el foco en la raíz de una clase archivada, la clase pasa a activa (restaurada en otra pestaña) y el foco se queda en la raíz", async () => {
    servidor.rol = "admin"
    servidor.archivada = true
    const cliente = clienteDePrueba()
    await montar(BASES.admin, cliente)
    expect(await screen.findByText(AVISO_ADMIN, {}, ESPERA)).toBeInTheDocument()
    const raiz = await laRaiz()
    act(() => raiz.focus())
    servidor.archivada = false
    await act(() =>
      cliente.invalidateQueries({ queryKey: claveClaseDetalle(CLASE_ID), exact: true }),
    )
    await waitFor(() => expect(avisoFijo()).toBeNull(), ESPERA)
    expect(raiz).toHaveFocus()
  })

  it("M-01 (b): cambio de clase sin la nueva en caché, con el foco en un campo que desaparece: el marco pinta «Cargando» y el foco queda en <body>, como antes de 01d1", async () => {
    servidor.manejador = responderLaOtra
    const router = await montar(`${BASES.maestro}/categorias`)
    const campo = await screen.findByDisplayValue("Tareas", {}, ESPERA)
    act(() => campo.focus())
    await act(() => router.navigate(`/maestro/clases/${OTRA_ID}/categorias`))
    expect(await screen.findByDisplayValue("Proyectos", {}, ESPERA)).toBeInTheDocument()
    expect(document.activeElement).toBe(document.body)
  })

  it("M-01 (b): cambio de clase con la nueva en caché, con el foco en un campo que desaparece y sin mecanismo de fila: el foco va al título de la clase nueva", async () => {
    servidor.manejador = responderLaOtra
    const router = await montar(`/maestro/clases/${OTRA_ID}/categorias`)
    await screen.findByDisplayValue("Proyectos", {}, ESPERA)
    await act(() => router.navigate(`${BASES.maestro}/categorias`))
    const campo = await screen.findByDisplayValue("Tareas", {}, ESPERA)
    act(() => campo.focus())
    await act(() => router.navigate(`/maestro/clases/${OTRA_ID}/categorias`))
    expect(await screen.findByDisplayValue("Proyectos", {}, ESPERA)).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "Geografía" })).toHaveFocus(),
    )
  })

  it("M-01 (b): cambio de clase con la nueva en caché y el foco en «Borrar publicación»: gana el mecanismo de Avisos (O-14), el encabezado de la lista", async () => {
    servidor.manejador = responderLaOtra
    const router = await montar(`/maestro/clases/${OTRA_ID}`)
    await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
    await act(() => router.navigate(BASES.maestro))
    const borrar = await screen.findByRole("button", { name: "Borrar publicación" }, ESPERA)
    act(() => borrar.focus())
    await act(() => router.navigate(`/maestro/clases/${OTRA_ID}`))
    await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("heading", { level: 2, name: "Avisos" }),
      ),
    )
  })

  it("M-01 (c): un 409 CLASE_ARCHIVADA de una escritura de otra clase, con esta abierta, pide una vez más el detalle de esta, sin aviso de más ni ciclo", async () => {
    servidor.manejador = responderLaOtra
    const cliente = clienteDePrueba()
    await montar(BASES.maestro, cliente)
    await screen.findByText("Primer aviso", {}, ESPERA)
    await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
    const detallesAntes = detallesPedidos()
    await act(async () => {
      await new MutationObserver(cliente, {
        mutationFn: () =>
          api(`${OTRA_API}/publicaciones`, {
            method: "POST",
            body: { texto: "x", archivoIds: [] },
            schema: publicacionRespuestaSchema,
          }),
      })
        .mutate()
        .catch(() => undefined)
    })
    await waitFor(() => expect(detallesPedidos()).toBe(detallesAntes + 1), ESPERA)
    await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
    expect(detallesPedidos()).toBe(detallesAntes + 1)
    expect(avisoFijo()).toBeNull()
    expect(errores()).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------------
// T-01 (ronda 1 de 01d1): lo abierto a medio usar no reaparece al volver a activa. Estados vecinos que no
// cubren ADM-T1D111 y ADM-T1D112 (admin): el maestro con la restauración de otra sesión, archivar,
// restaurar y volver a archivar, restaurar con la vista desmontada, cambiar de clase entre archivar y
// restaurar, y un 409 en vuelo cuando llega la restauración.

const restaurarConLaVistaAbierta = async (cliente: QueryClient) => {
  servidor.archivada = false
  await act(() => cliente.invalidateQueries({ queryKey: claveClaseDetalle(CLASE_ID), exact: true }))
  await waitFor(() => expect(avisoFijo()).toBeNull(), ESPERA)
}

const ABIERTOS_DEL_MAESTRO = [
  {
    nombre: "la confirmación de borrar un recurso (fila 18)",
    ruta: `${BASES.maestro}/recursos`,
    ancla: texto("Guía de estudio"),
    abrir: () => screen.findByRole("button", { name: "Borrar recurso" }, ESPERA),
    abierto: () => screen.queryByRole("button", { name: "Sí, borrar recurso" }),
  },
  {
    nombre: "el formulario de «Nuevo tema» (fila 8)",
    ruta: `${BASES.maestro}/trabajo`,
    ancla: texto("Ensayo final"),
    abrir: () => screen.findByRole("button", { name: "Nuevo tema" }, ESPERA),
    abierto: () => screen.queryByRole("button", { name: "Crear tema" }),
  },
  {
    nombre: "la confirmación de borrar un tema (fila 12)",
    ruta: `${BASES.maestro}/trabajo`,
    ancla: texto("Ensayo final"),
    abrir: () => screen.findByRole("button", { name: "Borrar tema tema Unidad 1" }, ESPERA),
    abierto: () => screen.queryByRole("button", { name: "Sí, borrar tema" }),
  },
] as const

describe("T-01: lo abierto a medio usar no reaparece al volver a activa (estados vecinos)", () => {
  it.each(ABIERTOS_DEL_MAESTRO)(
    "T-01 vecino, maestro, otra sesión archiva y restaura: $nombre no reaparece abierto",
    async (caso) => {
      const cliente = clienteDePrueba()
      await montar(caso.ruta, cliente)
      await caso.ancla()
      fireEvent.click(await caso.abrir())
      await waitFor(() => expect(caso.abierto()).not.toBeNull(), ESPERA)
      await archivarConLaVistaAbierta(cliente)
      expect(caso.abierto()).toBeNull()
      await restaurarConLaVistaAbierta(cliente)
      await caso.ancla()
      expect(caso.abierto()).toBeNull()
      expect(await caso.abrir()).toBeInTheDocument()
    },
  )

  it("T-01 vecino: archivar, restaurar, volver a abrir la confirmación, archivar y restaurar otra vez: tampoco reaparece", async () => {
    const cliente = clienteDePrueba()
    await montar(BASES.maestro, cliente)
    await screen.findByText("Primer aviso", {}, ESPERA)
    for (let vuelta = 1; vuelta <= 2; vuelta += 1) {
      fireEvent.click(await screen.findByRole("button", { name: "Borrar publicación" }, ESPERA))
      expect(await screen.findByRole("button", { name: "Sí, borrar" }, ESPERA)).toBeInTheDocument()
      await archivarConLaVistaAbierta(cliente)
      expect(screen.queryByRole("button", { name: "Sí, borrar" })).toBeNull()
      await restaurarConLaVistaAbierta(cliente)
      expect(screen.queryByRole("button", { name: "Sí, borrar" })).toBeNull()
    }
    expect(pedidas("DELETE", `${API}/publicaciones/${PUBLICACION_ID}`)).toEqual([])
  })

  it("T-01 vecino: restaurar con la vista desmontada: al volver, la confirmación está cerrada", async () => {
    const cliente = clienteDePrueba()
    const router = await montar(BASES.maestro, cliente)
    fireEvent.click(await screen.findByRole("button", { name: "Borrar publicación" }, ESPERA))
    await screen.findByRole("button", { name: "Sí, borrar" }, ESPERA)
    await archivarConLaVistaAbierta(cliente)
    await act(() => router.navigate("/maestro"))
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Historia" })).toBeNull())
    servidor.archivada = false
    await act(() =>
      cliente.invalidateQueries({ queryKey: claveClaseDetalle(CLASE_ID), exact: true }),
    )
    await act(() => router.navigate(BASES.maestro))
    await waitFor(() => expect(avisoFijo()).toBeNull(), ESPERA)
    await screen.findByText("Primer aviso", {}, ESPERA)
    expect(screen.queryByRole("button", { name: "Sí, borrar" })).toBeNull()
    expect(screen.getByRole("button", { name: "Borrar publicación" })).toBeInTheDocument()
  })

  it("T-01 vecino: cambiar de clase entre archivar y restaurar: al volver a la clase restaurada, «Nuevo tema» está cerrado", async () => {
    servidor.manejador = (llamada) => {
      const { url } = llamada
      if (url.pathname === `${OTRA_API}/temas`) {
        return respuestaJson(200, { temas: [], sinTema: 0 })
      }
      return responderLaOtra(llamada)
    }
    const cliente = clienteDePrueba()
    const router = await montar(`${BASES.maestro}/trabajo`, cliente)
    await screen.findByText("Ensayo final", {}, ESPERA)
    fireEvent.click(await screen.findByRole("button", { name: "Nuevo tema" }, ESPERA))
    await screen.findByRole("button", { name: "Crear tema" }, ESPERA)
    await archivarConLaVistaAbierta(cliente)
    await act(() => router.navigate(`/maestro/clases/${OTRA_ID}/trabajo`))
    await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
    servidor.archivada = false
    await act(() =>
      cliente.invalidateQueries({ queryKey: claveClaseDetalle(CLASE_ID), exact: true }),
    )
    await act(() => router.navigate(`${BASES.maestro}/trabajo`))
    await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
    await waitFor(() => expect(avisoFijo()).toBeNull(), ESPERA)
    await screen.findByText("Ensayo final", {}, ESPERA)
    expect(screen.queryByRole("button", { name: "Crear tema" })).toBeNull()
    expect(screen.getByRole("button", { name: "Nuevo tema" })).toBeInTheDocument()
  })

  it("T-01 vecino: un 409 en vuelo cuando llega la restauración: un aviso, la confirmación sigue cerrada y no sale otro DELETE", async () => {
    const cliente = clienteDePrueba()
    await montar(BASES.maestro, cliente)
    fireEvent.click(await screen.findByRole("button", { name: "Borrar publicación" }, ESPERA))
    const si = await screen.findByRole("button", { name: "Sí, borrar" }, ESPERA)
    const borrado = retener()
    servidor.manejador = ({ metodo, url }) => {
      if (metodo !== "DELETE" || url.pathname !== `${API}/publicaciones/${PUBLICACION_ID}`) {
        return undefined
      }
      return borrado.promesa.then(() => archivadaJson())
    }
    enfocarYPulsar(si)
    await waitFor(() =>
      expect(pedidas("DELETE", `${API}/publicaciones/${PUBLICACION_ID}`)).toHaveLength(1),
    )
    await archivarConLaVistaAbierta(cliente)
    await restaurarConLaVistaAbierta(cliente)
    expect(screen.queryByRole("button", { name: "Sí, borrar" })).toBeNull()

    borrado.soltar()
    await waitFor(() => expect(errores()).toEqual([ARCHIVADA]), ESPERA)
    await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
    expect(avisoFijo()).toBeNull()
    expect(screen.queryByRole("button", { name: "Sí, borrar" })).toBeNull()
    expect(screen.getByRole("button", { name: "Borrar publicación" })).toBeInTheDocument()
    expect(pedidas("DELETE", `${API}/publicaciones/${PUBLICACION_ID}`)).toHaveLength(1)
  })
})

describe("T-01, hermano de la ruta 20: el formulario reiniciado tras un conflicto no se lleva el foco al volver a activa", () => {
  it("T-01 vecino, ruta 20: tras un 409 RECURSO_MODIFICADO, la clase se archiva y se restaura con el foco fuera del formulario: el formulario vuelve sin quitarle el foco a la persona", async () => {
    let versionDelServidor = 0
    servidor.manejador = ({ metodo, url }) => {
      if (url.pathname !== `${API}/recursos/${RECURSO_ID}`) return undefined
      if (metodo === "PUT") {
        versionDelServidor = 1
        return errorJson(
          409,
          "RECURSO_MODIFICADO",
          "Otra persona guardó este recurso mientras lo editabas. Te mostramos la versión actual.",
        )
      }
      return respuestaJson(200, {
        recurso: { ...recursoDeLaLista, version: versionDelServidor, tema: null },
      })
    }
    const cliente = clienteDePrueba()
    await montar(`${BASES.maestro}/recursos/${RECURSO_ID}/editar`, cliente)
    const campo = await screen.findByRole("textbox", { name: "Título del recurso" }, ESPERA)
    fireEvent.change(campo, { target: { value: "Guía nueva" } })
    enfocarYPulsar(screen.getByRole("button", { name: "Guardar cambios" }))
    // Tras el conflicto, el formulario se reinicia con la versión del servidor y se lleva el foco.
    await waitFor(
      () => expect(screen.getByRole("textbox", { name: "Título del recurso" })).toHaveFocus(),
      ESPERA,
    )
    await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)

    const cerrar = screen.getByRole("button", { name: "Cerrar sesión" })
    act(() => cerrar.focus())
    await archivarConLaVistaAbierta(cliente)
    expect(screen.queryByRole("textbox", { name: "Título del recurso" })).toBeNull()
    await restaurarConLaVistaAbierta(cliente)
    expect(await screen.findByRole("textbox", { name: "Título del recurso" }, ESPERA)).toHaveValue(
      "Guía de estudio",
    )
    expect(cerrar).toHaveFocus()
  })
})

// ---------------------------------------------------------------------------------------------------
// T-02 (ronda 2 de 01d1): una recarga tras un conflicto lanzada antes de pasar a solo lectura no tiene
// efecto si llega después. Órdenes de llegada de la recarga retenida.

const RUTA_20 = `${BASES.maestro}/recursos/${RECURSO_ID}/editar`

const prepararConflictoRetenido = () => {
  const recarga = retener()
  let version = 0
  let pidioLaRecarga = false
  servidor.manejador = ({ metodo, url }) => {
    if (url.pathname !== `${API}/recursos/${RECURSO_ID}`) return undefined
    if (metodo === "PUT") {
      version = 1
      return errorJson(
        409,
        "RECURSO_MODIFICADO",
        "Otra persona guardó este recurso mientras lo editabas. Te mostramos la versión actual.",
      )
    }
    const cuerpo = () =>
      respuestaJson(200, {
        recurso: {
          ...recursoDeLaLista,
          titulo: version === 0 ? "Guía de estudio" : "Guía actualizada",
          version,
          tema: null,
        },
      })
    if (version === 1 && !pidioLaRecarga) {
      pidioLaRecarga = true
      return recarga.promesa.then(cuerpo)
    }
    return cuerpo()
  }
  const recargasPedidas = () => pedidas("GET", `${API}/recursos/${RECURSO_ID}`).length
  return { recarga, recargasPedidas }
}

const guardarConConflicto = async (recargasPedidas: () => number) => {
  const campo = await screen.findByRole("textbox", { name: "Título del recurso" }, ESPERA)
  fireEvent.change(campo, { target: { value: "Guía nueva" } })
  const antes = recargasPedidas()
  enfocarYPulsar(screen.getByRole("button", { name: "Guardar cambios" }))
  await waitFor(() => expect(recargasPedidas()).toBe(antes + 1), ESPERA)
}

const escribirYDejarElFocoEnElTitulo = async () => {
  const campo = await screen.findByRole("textbox", { name: "Título del recurso" }, ESPERA)
  fireEvent.change(campo, { target: { value: "Lo que escribo después" } })
  const h1 = await titulo()
  act(() => h1.focus())
  return h1
}

describe("T-02: la recarga tras un conflicto en vuelo al pasar a solo lectura (ruta 20)", () => {
  it("T-02 control: sin archivar, la recarga del conflicto sigue reiniciando el formulario con la versión nueva y llevándose el foco", async () => {
    const { recarga, recargasPedidas } = prepararConflictoRetenido()
    const cliente = clienteDePrueba()
    await montar(RUTA_20, cliente)
    await guardarConConflicto(recargasPedidas)
    recarga.soltar()
    await waitFor(
      () =>
        expect(screen.getByRole("textbox", { name: "Título del recurso" })).toHaveValue(
          "Guía actualizada",
        ),
      ESPERA,
    )
    expect(screen.getByRole("textbox", { name: "Título del recurso" })).toHaveFocus()
  })

  it("T-02: la recarga llega después de archivar y restaurar: el formulario no se reinicia ni se lleva el foco", async () => {
    const { recarga, recargasPedidas } = prepararConflictoRetenido()
    const cliente = clienteDePrueba()
    await montar(RUTA_20, cliente)
    await guardarConConflicto(recargasPedidas)
    await archivarConLaVistaAbierta(cliente)
    await restaurarConLaVistaAbierta(cliente)
    const h1 = await escribirYDejarElFocoEnElTitulo()

    recarga.soltar()
    await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
    expect(h1).toHaveFocus()
    expect(screen.getByRole("textbox", { name: "Título del recurso" })).toHaveValue(
      "Lo que escribo después",
    )
  })

  it("T-02: la recarga llega después de archivar y restaurar dos veces: tampoco reinicia ni se lleva el foco", async () => {
    const { recarga, recargasPedidas } = prepararConflictoRetenido()
    const cliente = clienteDePrueba()
    await montar(RUTA_20, cliente)
    await guardarConConflicto(recargasPedidas)
    for (let vuelta = 1; vuelta <= 2; vuelta += 1) {
      await archivarConLaVistaAbierta(cliente)
      await restaurarConLaVistaAbierta(cliente)
    }
    const h1 = await escribirYDejarElFocoEnElTitulo()

    recarga.soltar()
    await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
    expect(h1).toHaveFocus()
    expect(screen.getByRole("textbox", { name: "Título del recurso" })).toHaveValue(
      "Lo que escribo después",
    )
  })

  it("T-02: la recarga llega con la vista desmontada y vuelta a montar: el formulario nuevo no se reinicia ni se lleva el foco", async () => {
    const { recarga, recargasPedidas } = prepararConflictoRetenido()
    const cliente = clienteDePrueba()
    const router = await montar(RUTA_20, cliente)
    await guardarConConflicto(recargasPedidas)
    await act(() => router.navigate(`${BASES.maestro}/recursos`))
    await screen.findByText("Guía de estudio", {}, ESPERA)
    await act(() => router.navigate(RUTA_20))
    // La vista nueva espera la lectura fresca que sigue en vuelo (§7.21) y no pinta el formulario.
    const h1 = await titulo()
    expect(await screen.findByText("Cargando el recurso…", {}, ESPERA)).toBeInTheDocument()
    act(() => h1.focus())

    recarga.soltar()
    expect(await screen.findByRole("textbox", { name: "Título del recurso" }, ESPERA)).toHaveValue(
      "Guía actualizada",
    )
    await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
    expect(h1).toHaveFocus()
  })
})

// T-02, hermanos y más órdenes de llegada: todo efecto asíncrono de un control que nació antes de pasar a
// solo lectura y que, al llegar, reiniciaría, navegaría o movería el foco. Las escrituras se retienen.

const prepararGuardadoRetenido = (respuesta: () => Response) => {
  const envio = retener()
  servidor.manejador = ({ metodo, url }) => {
    if (metodo !== "PUT" || url.pathname !== `${API}/recursos/${RECURSO_ID}`) return undefined
    return envio.promesa.then(respuesta)
  }
  return envio
}

const quieto = (cliente: QueryClient) =>
  waitFor(() => {
    expect(cliente.isFetching()).toBe(0)
    expect(cliente.isMutating()).toBe(0)
  }, ESPERA)

const guardarSinEsperar = async () => {
  const campo = await screen.findByRole("textbox", { name: "Título del recurso" }, ESPERA)
  fireEvent.change(campo, { target: { value: "Guía nueva" } })
  enfocarYPulsar(screen.getByRole("button", { name: "Guardar cambios" }))
  await waitFor(
    () => expect(pedidas("PUT", `${API}/recursos/${RECURSO_ID}`)).toHaveLength(1),
    ESPERA,
  )
}

const recursoGuardado = () =>
  respuestaJson(200, {
    recurso: { ...recursoDeLaLista, titulo: "Guía nueva", version: 1, tema: null },
  })

const recursoModificado = () =>
  errorJson(
    409,
    "RECURSO_MODIFICADO",
    "Otra persona guardó este recurso mientras lo editabas. Te mostramos la versión actual.",
  )

describe("T-02: órdenes de llegada y hermanos del efecto asíncrono viejo", () => {
  it("T-02: la recarga llega con la clase archivada: el formulario no se pinta y, al restaurar, nace con la versión nueva sin llevarse el foco", async () => {
    const { recarga, recargasPedidas } = prepararConflictoRetenido()
    const cliente = clienteDePrueba()
    await montar(RUTA_20, cliente)
    await guardarConConflicto(recargasPedidas)
    await archivarConLaVistaAbierta(cliente)
    recarga.soltar()
    await quieto(cliente)
    expect(screen.queryByRole("textbox", { name: "Título del recurso" })).toBeNull()
    const h1 = await titulo()
    act(() => h1.focus())

    await restaurarConLaVistaAbierta(cliente)
    expect(await screen.findByRole("textbox", { name: "Título del recurso" }, ESPERA)).toHaveValue(
      "Guía actualizada",
    )
    expect(h1).toHaveFocus()
  })

  it("T-02 hermano: el 409 RECURSO_MODIFICADO del guardado llega después de restaurar: un aviso, no se pide la recarga, no se reinicia ni se lleva el foco", async () => {
    const envio = prepararGuardadoRetenido(recursoModificado)
    const cliente = clienteDePrueba()
    await montar(RUTA_20, cliente)
    await guardarSinEsperar()
    await archivarConLaVistaAbierta(cliente)
    await restaurarConLaVistaAbierta(cliente)
    const h1 = await escribirYDejarElFocoEnElTitulo()
    const lecturas = pedidas("GET", `${API}/recursos/${RECURSO_ID}`).length

    envio.soltar()
    await waitFor(() => expect(errores()).toHaveLength(1), ESPERA)
    await quieto(cliente)
    expect(pedidas("GET", `${API}/recursos/${RECURSO_ID}`)).toHaveLength(lecturas)
    expect(h1).toHaveFocus()
    expect(screen.getByRole("textbox", { name: "Título del recurso" })).toHaveValue(
      "Lo que escribo después",
    )
  })

  it("T-02 hermano: el guardado con éxito llega después de restaurar: un aviso, no navega y lo escrito sigue", async () => {
    const envio = prepararGuardadoRetenido(recursoGuardado)
    const cliente = clienteDePrueba()
    const router = await montar(RUTA_20, cliente)
    await guardarSinEsperar()
    await archivarConLaVistaAbierta(cliente)
    await restaurarConLaVistaAbierta(cliente)
    const h1 = await escribirYDejarElFocoEnElTitulo()

    envio.soltar()
    await waitFor(() => expect(exitos()).toHaveLength(1), ESPERA)
    await quieto(cliente)
    expect(router.state.location.pathname).toBe(RUTA_20)
    expect(h1).toHaveFocus()
    expect(screen.getByRole("textbox", { name: "Título del recurso" })).toHaveValue(
      "Lo que escribo después",
    )
    expect(errores()).toEqual([])
  })

  it("T-02 hermano: el guardado con éxito llega con la clase archivada: un aviso, no navega y sigue el texto de archivada con «Volver a Recursos»", async () => {
    const envio = prepararGuardadoRetenido(recursoGuardado)
    const cliente = clienteDePrueba()
    const router = await montar(RUTA_20, cliente)
    await guardarSinEsperar()
    await archivarConLaVistaAbierta(cliente)

    envio.soltar()
    await waitFor(() => expect(exitos()).toHaveLength(1), ESPERA)
    await quieto(cliente)
    expect(router.state.location.pathname).toBe(RUTA_20)
    expect(screen.getByRole("alert")).toHaveTextContent(ARCHIVADA)
    expect(screen.getByRole("link", { name: "Volver a Recursos" })).toBeInTheDocument()
  })

  it("T-02 control: sin archivar, el guardado con éxito sigue navegando a Recursos", async () => {
    const envio = prepararGuardadoRetenido(recursoGuardado)
    const cliente = clienteDePrueba()
    const router = await montar(RUTA_20, cliente)
    await guardarSinEsperar()
    envio.soltar()
    await waitFor(
      () => expect(router.state.location.pathname).toBe(`${BASES.maestro}/recursos`),
      ESPERA,
    )
    expect(exitos()).toHaveLength(1)
  })

  it("T-02 hermano, ruta 21: el guardado de la clase llega después de restaurar: un aviso, no navega y lo escrito en el formulario nuevo sigue", async () => {
    servidor.rol = "admin"
    const envio = retener()
    servidor.manejador = ({ metodo, url }) => {
      if (metodo !== "PUT" || url.pathname !== `/api/admin/clases/${CLASE_ID}`) return undefined
      return envio.promesa.then(() => respuestaJson(200, detalle()))
    }
    const cliente = clienteDePrueba()
    const ruta = `${BASES.admin}/editar`
    const router = await montar(ruta, cliente)
    const campo = await screen.findByRole("textbox", { name: "Nombre de la clase" }, ESPERA)
    fireEvent.change(campo, { target: { value: "Historia II" } })
    enfocarYPulsar(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(cliente.isMutating()).toBe(1), ESPERA)

    servidor.archivada = true
    await act(() =>
      cliente.invalidateQueries({ queryKey: claveClaseDetalle(CLASE_ID), exact: true }),
    )
    expect(await screen.findByText(AVISO_ADMIN, {}, ESPERA)).toBeInTheDocument()
    await restaurarConLaVistaAbierta(cliente)
    const nacido = await screen.findByRole("textbox", { name: "Nombre de la clase" }, ESPERA)
    fireEvent.change(nacido, { target: { value: "Lo que escribo después" } })
    const h1 = await titulo()
    act(() => h1.focus())

    envio.soltar()
    await waitFor(() => expect(exitos()).toHaveLength(1), ESPERA)
    await quieto(cliente)
    expect(router.state.location.pathname).toBe(ruta)
    expect(h1).toHaveFocus()
    expect(screen.getByRole("textbox", { name: "Nombre de la clase" })).toHaveValue(
      "Lo que escribo después",
    )
  })

  it("T-02 hermano, «Subir»: el orden llega después de restaurar, con la persona en otro control del mismo tema: el foco no se mueve", async () => {
    const envio = retener()
    servidor.manejador = ({ metodo, url }) => {
      if (metodo !== "PUT" || url.pathname !== `${API}/temas/orden`) return undefined
      return envio.promesa.then(() => respuestaJson(200, temas(null)))
    }
    const cliente = clienteDePrueba()
    await montar(`${BASES.maestro}/trabajo`, cliente)
    enfocarYPulsar(await screen.findByRole("button", { name: "Subir tema Unidad 2" }, ESPERA))
    await waitFor(() => expect(pedidas("PUT", `${API}/temas/orden`)).toHaveLength(1), ESPERA)
    await archivarConLaVistaAbierta(cliente)
    await restaurarConLaVistaAbierta(cliente)
    const renombrar = await screen.findByRole("button", { name: "Renombrar tema Unidad 2" }, ESPERA)
    act(() => renombrar.focus())

    envio.soltar()
    await quieto(cliente)
    expect(screen.getByRole("button", { name: "Renombrar tema Unidad 2" })).toHaveFocus()
  })

  it("T-02 control, «Subir»: sin archivar, el foco vuelve al botón del tema que se movió", async () => {
    const envio = retener()
    servidor.manejador = ({ metodo, url }) => {
      if (metodo !== "PUT" || url.pathname !== `${API}/temas/orden`) return undefined
      return envio.promesa.then(() => respuestaJson(200, temas(null)))
    }
    const cliente = clienteDePrueba()
    await montar(`${BASES.maestro}/trabajo`, cliente)
    enfocarYPulsar(await screen.findByRole("button", { name: "Subir tema Unidad 2" }, ESPERA))
    await waitFor(() => expect(pedidas("PUT", `${API}/temas/orden`)).toHaveLength(1), ESPERA)
    const renombrar = screen.getByRole("button", { name: "Renombrar tema Unidad 2" })
    act(() => renombrar.focus())

    envio.soltar()
    await quieto(cliente)
    expect(screen.getByRole("button", { name: "Subir tema Unidad 2" })).toHaveFocus()
  })
})

// ---------------------------------------------------------------------------------------------------
// T-03 (ronda 3 de 01d1): un aviso no se pierde si el componente que lanzó la escritura se desmonta. La
// petición se retiene. ADM-T3D111 (tester) cubre «Regenerar código» al archivar; aquí, el texto exacto, salir
// de la clase, los códigos que redirigen y los hermanos que el tester leyó sin correr.

const NO_REGENERADO = "No pudimos regenerar el código. Inténtalo de nuevo."
const REGENERADO = "Código nuevo listo"

const regenerarRetenido = async (respuesta: () => Response) => {
  const regenerado = retener()
  servidor.manejador = ({ metodo, url }) => {
    if (metodo !== "POST" || url.pathname !== `${API}/codigo`) return undefined
    return regenerado.promesa.then(respuesta)
  }
  const cliente = clienteDePrueba()
  const router = await montar(BASES.maestro, cliente)
  await screen.findByText("ABCDEFG", {}, ESPERA)
  await quieto(cliente)
  fireEvent.click(screen.getByRole("button", { name: "Regenerar código" }))
  fireEvent.click(await screen.findByRole("button", { name: "Sí, regenerar" }, ESPERA))
  await waitFor(() => expect(pedidas("POST", `${API}/codigo`)).toHaveLength(1), ESPERA)
  return { cliente, router, regenerado }
}

const salirDeLaClase = async (router: Awaited<ReturnType<typeof montar>>) => {
  await act(() => router.navigate("/maestro"))
  await waitFor(() => expect(screen.queryByRole("heading", { name: "Historia" })).toBeNull())
}

describe("T-03: el aviso no se pierde con el componente desmontado", () => {
  it("T-03 (a): «Regenerar código» recibe 409 CLASE_ARCHIVADA con la clase ya archivada: un aviso con el texto de archivada, no «Inténtalo de nuevo»", async () => {
    const { cliente, regenerado } = await regenerarRetenido(() => archivadaJson())
    await archivarConLaVistaAbierta(cliente)
    regenerado.soltar()
    await waitFor(() => expect(errores()).toEqual([ARCHIVADA]), ESPERA)
    await quieto(cliente)
    expect(errores()).toEqual([ARCHIVADA])
    expect(exitos()).toEqual([])
  })

  it("T-03: con el componente montado, un 409 CLASE_ARCHIVADA da un solo aviso y la confirmación se cierra", async () => {
    const { cliente, regenerado } = await regenerarRetenido(() => archivadaJson())
    regenerado.soltar()
    await waitFor(() => expect(errores()).toEqual([ARCHIVADA]), ESPERA)
    await quieto(cliente)
    expect(errores()).toEqual([ARCHIVADA])
    expect(screen.queryByRole("button", { name: "Sí, regenerar" })).toBeNull()
  })

  it("T-03 (T-06 de CLASES): con el componente montado, un 500 da un solo aviso y la confirmación se cierra con «Regenerar código» de vuelta", async () => {
    const { cliente, regenerado } = await regenerarRetenido(() =>
      errorJson(500, "ERROR_INTERNO", "Falló."),
    )
    regenerado.soltar()
    await waitFor(() => expect(errores()).toEqual([NO_REGENERADO]), ESPERA)
    await quieto(cliente)
    expect(errores()).toEqual([NO_REGENERADO])
    expect(screen.queryByRole("button", { name: "Sí, regenerar" })).toBeNull()
    expect(screen.getByRole("button", { name: "Regenerar código" })).toBeInTheDocument()
  })

  it("T-03: con el componente montado, un 200 da un solo aviso, el código nuevo y la confirmación cerrada", async () => {
    const { cliente, regenerado } = await regenerarRetenido(() =>
      respuestaJson(200, { codigo: "NUEVO12" }),
    )
    regenerado.soltar()
    await screen.findByText("NUEVO12", {}, ESPERA)
    await quieto(cliente)
    expect(exitos()).toEqual([REGENERADO])
    expect(errores()).toEqual([])
    expect(screen.queryByRole("button", { name: "Sí, regenerar" })).toBeNull()
  })

  it.each([
    ["500", () => errorJson(500, "ERROR_INTERNO", "Falló."), [NO_REGENERADO], []],
    ["200", () => respuestaJson(200, { codigo: "NUEVO12" }), [], [REGENERADO]],
  ] as const)(
    "T-03: la persona sale de la clase con «Regenerar código» en vuelo y la respuesta es %s: un solo aviso",
    async (_nombre, respuesta, conError, conExito) => {
      const { cliente, router, regenerado } = await regenerarRetenido(respuesta)
      await salirDeLaClase(router)
      regenerado.soltar()
      await waitFor(() => expect(cliente.isMutating()).toBe(0), ESPERA)
      await quieto(cliente)
      expect(errores()).toEqual([...conError])
      expect(exitos()).toEqual([...conExito])
    },
  )

  it.each(["ACCESO_RESTRINGIDO", "CAMBIO_DE_CONTRASENA_REQUERIDO"])(
    "T-03: «Regenerar código» con %s, con que apiClient redirige: sin aviso, como useMoverElemento y las de recursos y dudas",
    async (codigo) => {
      const { cliente, regenerado } = await regenerarRetenido(() => errorJson(403, codigo, "No."))
      regenerado.soltar()
      await waitFor(() => expect(cliente.isMutating()).toBe(0), ESPERA)
      await quieto(cliente)
      expect(errores()).toEqual([])
      expect(exitos()).toEqual([])
    },
  )

  it("T-03 hermano, categorías: un VALIDACION de una fila llega con el editor desmontado por archivar: un aviso legible, sin la ruta", async () => {
    const envio = retener()
    servidor.manejador = ({ metodo, url }) => {
      if (metodo !== "PUT" || url.pathname !== `${API}/categorias`) return undefined
      return envio.promesa.then(() =>
        errorJson(400, "VALIDACION", "categorias.0.nombre: Escribe el nombre"),
      )
    }
    const cliente = clienteDePrueba()
    await montar(`${BASES.maestro}/categorias`, cliente)
    fireEvent.click(await screen.findByRole("button", { name: "Guardar categorías" }, ESPERA))
    await waitFor(() => expect(pedidas("PUT", `${API}/categorias`)).toHaveLength(1), ESPERA)
    await archivarConLaVistaAbierta(cliente)
    envio.soltar()
    await waitFor(() => expect(errores()).toEqual(["Escribe el nombre"]), ESPERA)
    await quieto(cliente)
    expect(errores()).toEqual(["Escribe el nombre"])
  })

  it("T-03 hermano, categorías (control): con el editor montado, ese VALIDACION va en su fila, sin aviso", async () => {
    const envio = retener()
    servidor.manejador = ({ metodo, url }) => {
      if (metodo !== "PUT" || url.pathname !== `${API}/categorias`) return undefined
      return envio.promesa.then(() =>
        errorJson(400, "VALIDACION", "categorias.0.nombre: Escribe el nombre"),
      )
    }
    const cliente = clienteDePrueba()
    await montar(`${BASES.maestro}/categorias`, cliente)
    fireEvent.click(await screen.findByRole("button", { name: "Guardar categorías" }, ESPERA))
    await waitFor(() => expect(pedidas("PUT", `${API}/categorias`)).toHaveLength(1), ESPERA)
    envio.soltar()
    expect(await screen.findByText("Escribe el nombre", {}, ESPERA)).toBeInTheDocument()
    await quieto(cliente)
    expect(errores()).toEqual([])
  })

  it("T-03 hermano, comentar: el 409 llega con el formulario desmontado por archivar: un solo aviso", async () => {
    const envio = retener()
    const ruta = `${API}/publicaciones/${PUBLICACION_ID}/comentarios`
    servidor.manejador = ({ metodo, url }) => {
      if (metodo !== "POST" || url.pathname !== ruta) return undefined
      return envio.promesa.then(() => archivadaJson())
    }
    const cliente = clienteDePrueba()
    await montar(BASES.maestro, cliente)
    await abrirComentarios()
    fireEvent.change(screen.getByRole("textbox", { name: "Escribe un comentario" }), {
      target: { value: "Una duda" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Comentar" }))
    await waitFor(() => expect(pedidas("POST", ruta)).toHaveLength(1), ESPERA)
    await archivarConLaVistaAbierta(cliente)
    envio.soltar()
    await waitFor(() => expect(errores()).toEqual([ARCHIVADA]), ESPERA)
    await quieto(cliente)
    expect(errores()).toEqual([ARCHIVADA])
  })

  it("T-03 hermano, mover: el 409 llega con el selector desmontado por archivar: un solo aviso", async () => {
    const envio = retener()
    const ruta = `${API}/publicaciones/${TAREA_ID}/tema`
    servidor.manejador = ({ metodo, url }) => {
      if (metodo !== "PUT" || url.pathname !== ruta) return undefined
      return envio.promesa.then(() => archivadaJson())
    }
    const cliente = clienteDePrueba()
    await montar(`${BASES.maestro}/trabajo`, cliente)
    await screen.findByText("Ensayo final", {}, ESPERA)
    const fila = document.querySelector<HTMLElement>(`[data-elemento-id="${TAREA_ID}"]`)
    if (fila === null) throw new Error("Precondición: la fila de la tarea")
    fireEvent.change(within(fila).getByRole("combobox"), { target: { value: TEMA_2 } })
    fireEvent.click(within(fila).getByRole("button", { name: "Mover" }))
    await waitFor(() => expect(pedidas("PUT", ruta)).toHaveLength(1), ESPERA)
    await archivarConLaVistaAbierta(cliente)
    envio.soltar()
    await waitFor(() => expect(errores()).toEqual([ARCHIVADA]), ESPERA)
    await quieto(cliente)
    expect(errores()).toEqual([ARCHIVADA])
  })
})
