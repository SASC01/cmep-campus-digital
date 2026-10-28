import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { AlumnosView } from "./alumnos-view"
import { CategoriasView } from "./categorias-view"
import { ClaseLayout } from "./clase-layout"
import { FormularioClase } from "./components/formulario-clase"
import {
  TEXTOS_BUSCADOR_ALUMNOS,
  TEXTOS_BUSCADOR_MAESTROS,
  TEXTOS_COMENTARIOS,
  TEXTOS_MURO,
  TEXTOS_PANEL,
  TEXTOS_PERSONAS,
  TEXTOS_TRABAJO,
} from "./data"
import { EditarClaseView } from "./editar-clase-view"
import { InicioEstudianteView } from "./inicio-estudiante-view"
import { InicioMaestroView } from "./inicio-maestro-view"
import { MaestrosDeClaseView } from "./maestros-de-clase-view"
import { MuroView } from "./muro-view"
import { PersonasView } from "./personas-view"
import { TrabajoView } from "./trabajo-view"

// CHORE-03 (03b, S-01): un 400 VALIDACION fuera de contrato en una consulta de features/clases (la
// primera carga, una recarga o un "Ver más") da el genérico del módulo, nunca el texto de zod ni la
// ruta; en las listas de mensajeDeErrorDeLista, el "cursor:" sigue dando su texto de "cambió mientras…".
// Una sola función de montaje; el servidor es un doble en memoria. Sin fechas que comparar.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const LIMITE = "limite: Too big: expected number"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TEMA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d31"
const PUBLICACION_ID = "5a5b3c4d-1c1f-4b8e-9a1e-000000000001"
const CURSOR = "6a6b3c4d-1c1f-4b8e-9a1e-0000000000c1"
const RUTA_CLASE = `/api/clases/${CLASE_ID}`
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const AUTOR = { ...MAESTRO, administracion: false }

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const validacion = (mensaje: string) =>
  respuestaJson(400, { error: { codigo: "VALIDACION", mensaje } })

interface Llamada {
  metodo: string
  url: string
}

const conCursor = (url: string) => url.includes(`cursor=${CURSOR}`)

const ME = (rol: string) => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana Ruiz",
  email: "ana@ejemplo.mx",
  rol,
  debeCambiarContrasena: false,
  accesoRestringido: false,
})

const material = (n: number) => ({
  id: `5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5e${String(10 + n)}`,
  tipo: "material",
  titulo: `Lectura ${String(n)}`,
  autor: AUTOR,
  creadoEn: "2030-01-02T15:00:00.000Z",
  material: { texto: "", adjuntos: [] },
  tarea: null,
  puedeMover: false,
  entrega: null,
})

// Lo que el servidor responde bien a cada consulta; la primera página de toda lista trae un cursor.
const respuestaNormal = ({ metodo, url }: Llamada, rol: string): Response | null => {
  const { pathname } = new URL(url, "http://local")
  if (metodo !== "GET") return null
  if (pathname === "/api/me") return respuestaJson(200, ME(rol))
  if (pathname === "/api/clases/inscritas") {
    return respuestaJson(200, {
      clases: [{ id: CLASE_ID, nombre: "Álgebra I", maestro: MAESTRO, maestros: [MAESTRO] }],
      total: 2,
      siguienteCursor: CURSOR,
    })
  }
  if (pathname === "/api/clases/impartidas") {
    return respuestaJson(200, {
      clases: [{ id: CLASE_ID, nombre: "Álgebra I", alumnos: 3 }],
      total: 2,
      siguienteCursor: CURSOR,
    })
  }
  if (pathname === RUTA_CLASE) {
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
  if (pathname === `${RUTA_CLASE}/codigo`) return respuestaJson(200, { codigo: "ABCD234" })
  if (pathname === `${RUTA_CLASE}/categorias`) return respuestaJson(200, { categorias: [] })
  if (pathname === `${RUTA_CLASE}/temas`) {
    return respuestaJson(200, {
      temas: [{ id: TEMA_ID, nombre: "Unidad 1", orden: 0, elementos: 2 }],
      sinTema: 0,
    })
  }
  if (pathname === `${RUTA_CLASE}/trabajo`) {
    return respuestaJson(200, { elementos: [material(1)], siguienteCursor: CURSOR })
  }
  if (pathname === `${RUTA_CLASE}/personas`) {
    return respuestaJson(200, {
      maestro: { ...MAESTRO, email: "luis@x.mx" },
      maestros: [{ ...MAESTRO, email: "luis@x.mx" }],
      alumnos: [{ id: "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11", nombre: "Ana", email: "a@x.mx" }],
      totalAlumnos: 2,
      siguienteCursor: CURSOR,
    })
  }
  if (pathname === `${RUTA_CLASE}/alumnos`) {
    return respuestaJson(200, { alumnos: [], total: 0, siguienteCursor: null })
  }
  if (pathname.endsWith("/candidatos")) return respuestaJson(200, { candidatos: [], hayMas: false })
  if (pathname === `${RUTA_CLASE}/publicaciones`) {
    return respuestaJson(200, {
      publicaciones: [
        {
          id: PUBLICACION_ID,
          tipo: "anuncio",
          titulo: null,
          texto: "Publicación 1",
          autor: AUTOR,
          creadoEn: "2030-01-02T15:30:00.000Z",
          comentarios: 2,
          tarea: null,
          adjuntos: [],
          puedeBorrar: false,
        },
      ],
      siguienteCursor: CURSOR,
    })
  }
  if (pathname === `${RUTA_CLASE}/publicaciones/${PUBLICACION_ID}/comentarios`) {
    return respuestaJson(200, {
      comentarios: [
        {
          id: "6a6b3c4d-1c1f-4b8e-9a1e-000000000001",
          texto: "Comentario 1",
          autor: AUTOR,
          creadoEn: "2030-01-02T16:30:00.000Z",
          propio: false,
          puedeBorrar: false,
        },
      ],
      siguienteCursor: CURSOR,
    })
  }
  return null
}

let falla: (llamada: Llamada) => boolean = () => false
let mensajeDeFalla = LIMITE
let rolDeSesion = "estudiante"
let fallidas: Llamada[] = []
let inesperadas: string[] = []

beforeEach(() => {
  establecerToken("token-de-prueba")
  falla = () => false
  mensajeDeFalla = LIMITE
  rolDeSesion = "estudiante"
  fallidas = []
  inesperadas = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const llamada = { metodo: init?.method ?? "GET", url: String(entrada) }
      if (falla(llamada)) {
        fallidas.push(llamada)
        return Promise.resolve(validacion(mensajeDeFalla))
      }
      const normal = respuestaNormal(llamada, rolDeSesion)
      if (normal !== null) return Promise.resolve(normal)
      inesperadas.push(`${llamada.metodo} ${llamada.url}`)
      return Promise.resolve(
        respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } }),
      )
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
})

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

// La única función de montaje: la vista en su ruta, con un cliente sin reintentos.
const montar = (ruta: string, patron: string, elemento: ReactNode) => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path={patron} element={elemento} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const escribir = async (etiqueta: string, valor: string) => {
  fireEvent.change(await screen.findByLabelText(etiqueta), { target: { value: valor } })
}

const pulsar = async (nombre: string) => {
  fireEvent.click(await screen.findByRole("button", { name: nombre }))
}

interface Consulta {
  nombre: string
  rol: string
  ruta: string
  patron: string
  elemento: ReactNode
  falla: (llamada: Llamada) => boolean
  accionar: () => Promise<void>
}

const enRuta =
  (ruta: string) =>
  ({ metodo, url }: Llamada) =>
    metodo === "GET" && new URL(url, "http://local").pathname === ruta

const nada = async () => undefined

const CONSULTAS: readonly Consulta[] = [
  {
    nombre: "las categorías",
    rol: "maestro",
    ruta: `/maestro/clases/${CLASE_ID}/categorias`,
    patron: "/maestro/clases/:claseId/categorias",
    elemento: <CategoriasView />,
    falla: enRuta(`${RUTA_CLASE}/categorias`),
    accionar: nada,
  },
  {
    nombre: "la clase en el marco",
    rol: "maestro",
    ruta: `/maestro/clases/${CLASE_ID}`,
    patron: "/maestro/clases/:claseId",
    elemento: <ClaseLayout />,
    falla: enRuta(RUTA_CLASE),
    accionar: nada,
  },
  {
    nombre: "«Editar clase»",
    rol: "admin",
    ruta: `/admin/clases/${CLASE_ID}/editar`,
    patron: "/admin/clases/:claseId/editar",
    elemento: <EditarClaseView />,
    falla: enRuta(RUTA_CLASE),
    accionar: nada,
  },
  {
    nombre: "el buscador de maestros",
    rol: "admin",
    ruta: "/admin/clases/nueva",
    patron: "/admin/clases/nueva",
    elemento: <FormularioClase modo="crear" />,
    falla: enRuta("/api/admin/maestros/candidatos"),
    accionar: () => escribir(TEXTOS_BUSCADOR_MAESTROS.campo, "Luis"),
  },
  {
    nombre: "el buscador de alumnos",
    rol: "maestro",
    ruta: `/maestro/clases/${CLASE_ID}/alumnos`,
    patron: "/maestro/clases/:claseId/alumnos",
    elemento: <AlumnosView />,
    falla: enRuta(`${RUTA_CLASE}/alumnos/candidatos`),
    accionar: () => escribir(TEXTOS_BUSCADOR_ALUMNOS.campo, "Ana"),
  },
  {
    nombre: "los temas de «Trabajo de clase»",
    rol: "maestro",
    ruta: `/maestro/clases/${CLASE_ID}/trabajo`,
    patron: "/maestro/clases/:claseId/trabajo",
    elemento: <TrabajoView />,
    falla: enRuta(`${RUTA_CLASE}/temas`),
    accionar: nada,
  },
  {
    nombre: "«Personas» en la primera carga",
    rol: "estudiante",
    ruta: `/estudiante/clases/${CLASE_ID}/personas`,
    patron: "/estudiante/clases/:claseId/personas",
    elemento: <PersonasView />,
    falla: enRuta(`${RUTA_CLASE}/personas`),
    accionar: nada,
  },
  {
    nombre: "«Personas» en la recarga (Ver más alumnos)",
    rol: "estudiante",
    ruta: `/estudiante/clases/${CLASE_ID}/personas`,
    patron: "/estudiante/clases/:claseId/personas",
    elemento: <PersonasView />,
    falla: (llamada) => enRuta(`${RUTA_CLASE}/personas`)(llamada) && conCursor(llamada.url),
    accionar: () => pulsar(TEXTOS_PERSONAS.verMas),
  },
  {
    nombre: "el código de la clase",
    rol: "maestro",
    ruta: `/maestro/clases/${CLASE_ID}`,
    patron: "/maestro/clases/:claseId",
    elemento: <ClaseLayout />,
    falla: enRuta(`${RUTA_CLASE}/codigo`),
    accionar: nada,
  },
  {
    nombre: "«Maestros» de la clase",
    rol: "admin",
    ruta: `/admin/clases/${CLASE_ID}/maestros`,
    patron: "/admin/clases/:claseId/maestros",
    elemento: <MaestrosDeClaseView />,
    falla: enRuta(RUTA_CLASE),
    accionar: nada,
  },
  {
    nombre: "el roster de alumnos",
    rol: "maestro",
    ruta: `/maestro/clases/${CLASE_ID}/alumnos`,
    patron: "/maestro/clases/:claseId/alumnos",
    elemento: <AlumnosView />,
    falla: enRuta(`${RUTA_CLASE}/alumnos`),
    accionar: nada,
  },
]

interface ListaConCursor extends Consulta {
  textoDelCursor: string
}

const LISTAS: readonly ListaConCursor[] = [
  {
    nombre: "«Ver más publicaciones» del muro",
    rol: "estudiante",
    ruta: `/estudiante/clases/${CLASE_ID}`,
    patron: "/estudiante/clases/:claseId",
    elemento: <MuroView />,
    falla: (llamada) => enRuta(`${RUTA_CLASE}/publicaciones`)(llamada) && conCursor(llamada.url),
    accionar: () => pulsar(TEXTOS_MURO.verMasPublicaciones),
    textoDelCursor: TEXTOS_MURO.cambioMientrasLoVeias,
  },
  {
    nombre: "«Ver más comentarios» del muro",
    rol: "estudiante",
    ruta: `/estudiante/clases/${CLASE_ID}`,
    patron: "/estudiante/clases/:claseId",
    elemento: <MuroView />,
    falla: (llamada) =>
      enRuta(`${RUTA_CLASE}/publicaciones/${PUBLICACION_ID}/comentarios`)(llamada) &&
      conCursor(llamada.url),
    accionar: async () => {
      await pulsar("Ver comentarios (2)")
      await pulsar(TEXTOS_COMENTARIOS.verMas)
    },
    textoDelCursor: TEXTOS_COMENTARIOS.cambioMientrasLosVeias,
  },
  {
    nombre: "«Ver más clases» del inicio del estudiante",
    rol: "estudiante",
    ruta: "/estudiante",
    patron: "/estudiante",
    elemento: <InicioEstudianteView />,
    falla: (llamada) => enRuta("/api/clases/inscritas")(llamada) && conCursor(llamada.url),
    accionar: () => pulsar(TEXTOS_PANEL.verMas),
    textoDelCursor: TEXTOS_PANEL.cambioMientrasLasVeias,
  },
  {
    nombre: "«Ver más clases» del inicio del maestro",
    rol: "maestro",
    ruta: "/maestro",
    patron: "/maestro",
    elemento: <InicioMaestroView />,
    falla: (llamada) => enRuta("/api/clases/impartidas")(llamada) && conCursor(llamada.url),
    accionar: () => pulsar(TEXTOS_PANEL.verMas),
    textoDelCursor: TEXTOS_PANEL.cambioMientrasLasVeias,
  },
  {
    nombre: "«Ver más» de la sección de un tema",
    rol: "maestro",
    ruta: `/maestro/clases/${CLASE_ID}/trabajo`,
    patron: "/maestro/clases/:claseId/trabajo",
    elemento: <TrabajoView />,
    falla: (llamada) => enRuta(`${RUTA_CLASE}/trabajo`)(llamada) && conCursor(llamada.url),
    accionar: () => pulsar(TEXTOS_TRABAJO.verMasDe("Unidad 1")),
    textoDelCursor: TEXTOS_TRABAJO.cambioMientrasLoVeias,
  },
]

const abrir = async (consulta: Consulta, mensaje: string) => {
  rolDeSesion = consulta.rol
  falla = consulta.falla
  mensajeDeFalla = mensaje
  montar(consulta.ruta, consulta.patron, consulta.elemento)
  await reposar()
  await consulta.accionar()
}

const sinTextoDelServidor = () => {
  const visible = document.body.textContent ?? ""
  expect(visible).not.toContain("Too big")
  expect(visible).not.toContain("limite")
  expect(visible).not.toContain("expected number")
}

describe("CHORE-03 · consultas de features/clases ante un VALIDACION fuera de contrato", () => {
  it.each([...CONSULTAS, ...LISTAS])(
    "CH3-B09: $nombre con «limite: Too big: expected number» muestra el genérico, nunca el texto en inglés",
    async (consulta) => {
      await abrir(consulta, LIMITE)

      expect((await screen.findAllByText(GENERICO)).length).toBeGreaterThan(0)
      expect(fallidas.length).toBeGreaterThan(0)
      sinTextoDelServidor()
      expect(inesperadas).toEqual([])
    },
  )

  it.each(LISTAS)(
    "CH3-B09: $nombre con «cursor: x» sigue dando su texto de «cambió mientras…»",
    async (lista) => {
      await abrir(lista, "cursor: x")

      expect(await screen.findByText(lista.textoDelCursor)).toBeInTheDocument()
      expect(fallidas.length).toBeGreaterThan(0)
      expect(screen.queryByText(GENERICO)).toBeNull()
      expect(document.body.textContent ?? "").not.toContain("cursor:")
      expect(inesperadas).toEqual([])
    },
  )
})
