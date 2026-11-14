import { QueryClient, QueryClientProvider, type QueryKey } from "@tanstack/react-query"
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import type { ReactNode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/services/apiClient"
import {
  CLAVE_CLASES_IMPARTIDAS,
  CLAVE_CLASES_INSCRITAS,
  clavePublicaciones,
} from "@/services/clasesService"
import { claveClasesAnteriores } from "@/services/clasesService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveTrabajo } from "@/services/trabajoService"

import {
  CLAVE_SIN_TEMA,
  claveAlumnos,
  claveClasesAdmin,
  claveComentarios,
  claveDudas,
  clavePersonas,
  claveRecursos,
  claveRespuestas,
  claveTemasDeLaSeccion,
  TEXTOS_COMENTARIOS,
  TEXTOS_DUDAS,
  TEXTOS_MURO,
  TEXTOS_PANEL,
  TEXTOS_PUBLICACION,
  TEXTOS_RECURSOS,
  TEXTOS_RESPUESTAS,
  TEXTOS_TRABAJO,
} from "./data"
import { useListaConservadaTrasLaPagina, useRenovarSiLaPublicacionYaNoEsta } from "./hooks"
import { mensajeDeConsultaClases } from "./lib"

// CHORE-06b (§D-4 a §D-6; CH6-B03 a CH6-B09 y CH6-B15 a CH6-B18): las frases de recuperación por cada
// camino, pulsar la sección (la política de DH-03 b), la clase archivada en la barra, el salto del
// historial a otra clase (DH-10) y la Regla de la clave. Router real (`rutas` de app/router) y un
// QueryClient con las defaultOptions de app/providers.tsx. "Salto" es router.navigate(-1) o (1) entre
// la misma sección de A y de B, con B en caché (S-02). La red se dobla con fetch; lo que debe quedar en
// vuelo se retiene con una promesa que la prueba suelta. Páginas de 2 filas (3 filas por lista).

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

type Rol = "estudiante" | "maestro" | "admin"
type Respuesta = () => Response | Promise<Response>
type Recurso =
  | "publicaciones"
  | "comentarios"
  | "dudas"
  | "respuestas"
  | "trabajo"
  | "recursos"
  | "personas"
  | "alumnos"
  | "inscritas"
  | "impartidas"

interface Llamada {
  metodo: string
  url: URL
  cuerpo: unknown
}

const ESPERA = { timeout: 8000 }
const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const A = uuid("2a2b3c4d", 1)
const B = uuid("2a2b3c4d", 2)
const NOMBRES: Record<string, string> = { [A]: "Historia", [B]: "Geografía" }
const MAESTRO = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez", email: "luis@ejemplo.mx" }
const FIRMA = { id: MAESTRO.id, nombre: MAESTRO.nombre, administracion: false }
const CREADO_EN = "2026-10-01T15:30:00.000Z"
const ARCHIVADA_EN = "2026-10-05T12:00:00.000Z"
const PREFIJO: Record<Recurso, string> = {
  publicaciones: "5a5b3c4d",
  comentarios: "6a6b3c4d",
  dudas: "1a1b3c4d",
  respuestas: "1c1d3c4d",
  trabajo: "8c8c3c4d",
  recursos: "8d8d3c4d",
  personas: "6e6e3c4d",
  alumnos: "6f6f3c4d",
  inscritas: "9a9b3c4d",
  impartidas: "9c9d3c4d",
}
const ETIQUETA: Record<Recurso, string> = {
  publicaciones: "Aviso",
  comentarios: "Comentario",
  dudas: "Duda",
  respuestas: "Respuesta",
  trabajo: "Material",
  recursos: "Recurso",
  personas: "Persona",
  alumnos: "Alumno",
  inscritas: "Clase",
  impartidas: "Clase",
}
const idDe = (recurso: Recurso, claseId: string, n: number) =>
  uuid(PREFIJO[recurso], (claseId === A ? 10 : 20) + n)
const textoDe = (recurso: Recurso, claseId: string, n: number) =>
  `${ETIQUETA[recurso]} ${String(n)} de ${NOMBRES[claseId] ?? ""}`
const TEMA = (claseId: string) => uuid("4a4b3c4d", claseId === A ? 1 : 2)

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })
const error500: Respuesta = () => errorApi(500, "ERROR_INTERNO")
const error503: Respuesta = () => errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado.")
const cursorVencido: Respuesta = () => errorApi(400, "VALIDACION", "cursor: no es válido")

interface Servidor {
  rol: Rol
  borradas: Set<string>
  archivadas: Set<string>
  // Las clases de la lista del inicio y de la barra (null: tres clases de prueba).
  clases: string[] | null
}

type Interceptor = (llamada: Llamada) => Respuesta | undefined

let servidor: Servidor
let llamadas: Llamada[] = []
let interceptores: Interceptor[] = []

const interceptarUnaVez = (cumple: (llamada: Llamada) => boolean, respuesta: Respuesta) => {
  const propio: Interceptor = (llamada) => {
    if (!cumple(llamada)) return undefined
    interceptores = interceptores.filter((otro) => otro !== propio)
    return respuesta
  }
  interceptores.push(propio)
}

const interceptarSiempre = (cumple: (llamada: Llamada) => boolean, respuesta: Respuesta) => {
  const propio: Interceptor = (llamada) => (cumple(llamada) ? respuesta : undefined)
  interceptores.push(propio)
  return () => {
    interceptores = interceptores.filter((otro) => otro !== propio)
  }
}

const retenida = () => {
  const pendientes: ((respuesta: Response | Promise<Response>) => void)[] = []
  const respuesta: Respuesta = () =>
    new Promise<Response>((resolver) => {
      pendientes.push(resolver)
    })
  const soltar = async (valor: Respuesta) => {
    const resolver = pendientes.shift()
    if (resolver === undefined) throw new Error("Precondición: la petición retenida ya salió")
    await act(async () => {
      resolver(Promise.resolve().then(valor))
      await new Promise((r) => setTimeout(r, 0))
    })
  }
  return { respuesta, soltar }
}

const TAMANO = 2
const paginar = (ids: readonly string[], url: URL) => {
  const cursor = url.searchParams.get("cursor")
  const inicio = cursor === null ? 0 : ids.indexOf(cursor) + 1
  const pagina = ids.slice(inicio, inicio + TAMANO)
  const siguiente = ids.length > inicio + TAMANO ? (pagina.at(-1) ?? null) : null
  return { pagina, siguiente }
}

const idsDe = (recurso: Recurso, claseId: string) =>
  [1, 2, 3].map((n) => idDe(recurso, claseId, n)).filter((id) => !servidor.borradas.has(id))
const numeroDe = (id: string) => Number(id.slice(-2)) % 10

const fila = (recurso: Recurso, claseId: string, id: string) => {
  const n = numeroDe(id)
  const texto = textoDe(recurso, claseId, n)
  if (recurso === "publicaciones") {
    return {
      id,
      tipo: "anuncio",
      titulo: null,
      texto,
      autor: FIRMA,
      creadoEn: CREADO_EN,
      comentarios: n === 1 ? 3 : 0,
      adjuntos: [],
      puedeBorrar: true,
      tarea: null,
    }
  }
  if (recurso === "comentarios" || recurso === "respuestas") {
    return { id, texto, autor: FIRMA, creadoEn: CREADO_EN, propio: false, puedeBorrar: false }
  }
  if (recurso === "dudas") {
    return {
      id,
      texto,
      autor: FIRMA,
      creadoEn: CREADO_EN,
      resuelta: false,
      resueltaEn: null,
      respuestas: n === 1 ? 3 : 0,
      propia: true,
      puedeBorrar: true,
      puedeMarcar: true,
    }
  }
  if (recurso === "trabajo") {
    return {
      id,
      tipo: "material",
      titulo: texto,
      autor: FIRMA,
      creadoEn: CREADO_EN,
      material: { texto: "", adjuntos: [] },
      tarea: null,
      puedeMover: false,
      entrega: null,
    }
  }
  if (recurso === "recursos") {
    return {
      id,
      titulo: texto,
      texto: "",
      autor: FIRMA,
      creadoEn: CREADO_EN,
      bloque: "docente",
      adjuntos: [],
      comentarios: n === 1 ? 3 : 0,
      puedeEditar: true,
      puedeBorrar: true,
      puedeMover: false,
    }
  }
  if (recurso === "personas") return { id, nombre: texto, email: "persona@ejemplo.mx" }
  return {
    id,
    nombre: texto,
    email: "alumno@ejemplo.mx",
    estadoPago: "al_corriente",
    accesoRestringido: false,
    origen: "codigo",
    inscritoEn: CREADO_EN,
  }
}

const paginaDe = (recurso: Recurso, claseId: string, url: URL, campo: string) => {
  const { pagina, siguiente } = paginar(idsDe(recurso, claseId), url)
  return { [campo]: pagina.map((id) => fila(recurso, claseId, id)), siguienteCursor: siguiente }
}

const claseDeLaLista = (recurso: "inscritas" | "impartidas", id: string) => {
  const nombre = NOMBRES[id] ?? `Clase ${String(numeroDe(id))} de Historia`
  if (recurso === "inscritas") {
    return { id, nombre, maestro: { nombre: "Luis" }, maestros: [{ nombre: "Luis" }] }
  }
  return { id, nombre, alumnos: 1 }
}

const clasesDeLaSesion = (recurso: "inscritas" | "impartidas") =>
  (servidor.clases ?? idsDe(recurso, A)).filter((id) => !servidor.archivadas.has(id))

const responder = (llamada: Llamada): Response | Promise<Response> => {
  const { metodo, url } = llamada
  const ruta = url.pathname
  if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "otra" })
  if (ruta === "/api/me") {
    return respuestaJson(200, {
      id: uuid("4f4f3c4d", 1),
      nombre: "Ana López",
      email: "ana@ejemplo.mx",
      rol: servidor.rol,
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  if (ruta === "/api/clases/inscritas" || ruta === "/api/clases/impartidas") {
    const recurso = ruta === "/api/clases/inscritas" ? "inscritas" : "impartidas"
    const ids = clasesDeLaSesion(recurso)
    if (url.searchParams.get("limite") === "100") {
      return respuestaJson(200, {
        clases: ids.map((id) => claseDeLaLista(recurso, id)),
        total: ids.length,
        siguienteCursor: null,
      })
    }
    const { pagina, siguiente } = paginar(ids, url)
    return respuestaJson(200, {
      clases: pagina.map((id) => claseDeLaLista(recurso, id)),
      total: ids.length,
      siguienteCursor: siguiente,
    })
  }
  if (ruta === "/api/clases/anteriores") {
    const ids = [A, B].filter((id) => servidor.archivadas.has(id))
    return respuestaJson(200, {
      clases: ids.map((id) => ({
        id,
        nombre: NOMBRES[id] ?? "Clase",
        maestros: [{ nombre: "Luis" }],
        archivadaEn: ARCHIVADA_EN,
      })),
      total: ids.length,
      siguienteCursor: null,
      siguienteCursorArchivadaEn: null,
    })
  }
  if (ruta === "/api/admin/clases") {
    return respuestaJson(200, {
      clases: [A, B].map((id) => ({
        id,
        nombre: NOMBRES[id] ?? "Clase",
        maestros: [{ id: MAESTRO.id, nombre: MAESTRO.nombre }],
        alumnos: 0,
        creadoEn: CREADO_EN,
        archivadaEn: null,
      })),
      total: 2,
      siguienteCursor: null,
      siguienteCursorArchivadaEn: null,
    })
  }
  const [, , , claseId, sub, subId, detalle] = ruta.split("/")
  if (claseId === undefined) return error500()
  if (sub === undefined && metodo === "GET") {
    return respuestaJson(200, {
      clase: {
        id: claseId,
        nombre: NOMBRES[claseId] ?? "Clase",
        descripcion: null,
        maestro: MAESTRO,
        maestros: [MAESTRO],
        archivadaEn: servidor.archivadas.has(claseId) ? ARCHIVADA_EN : null,
      },
    })
  }
  if (sub === "codigo") return respuestaJson(200, { codigo: "ABCDEFG" })
  if (sub === "categorias") return respuestaJson(200, { categorias: [] })
  if (sub === "mis-calificaciones") {
    return respuestaJson(200, {
      general: {
        modo: "puntos",
        porcentaje: null,
        puntos: { obtenido: 0, posible: 0, tareas: 0 },
        categorias: [],
        sinCategoria: { tareas: 0 },
      },
      tareas: [],
      siguienteCursor: null,
    })
  }
  if (sub === "publicaciones" && subId === undefined && metodo === "GET") {
    return respuestaJson(200, paginaDe("publicaciones", claseId, url, "publicaciones"))
  }
  if (sub === "publicaciones" && subId !== undefined && detalle === "comentarios") {
    if (servidor.borradas.has(`comentarios:${subId}`)) {
      return errorApi(404, "PUBLICACION_NO_ENCONTRADA")
    }
    return respuestaJson(200, paginaDe("comentarios", claseId, url, "comentarios"))
  }
  if (sub === "dudas" && subId === undefined && metodo === "GET") {
    return respuestaJson(200, paginaDe("dudas", claseId, url, "dudas"))
  }
  if (sub === "dudas" && subId !== undefined && detalle === "respuestas") {
    return respuestaJson(200, paginaDe("respuestas", claseId, url, "comentarios"))
  }
  if (sub === "temas" && metodo === "GET") {
    const seccion = url.searchParams.get("seccion")
    if (seccion === "docente") return respuestaJson(200, { temas: [], sinTema: 3 })
    if (seccion === "aprendizaje") return respuestaJson(200, { temas: [], sinTema: 0 })
    return respuestaJson(200, {
      temas: [{ id: TEMA(claseId), nombre: "Unidad 1", orden: 0, elementos: 3 }],
      sinTema: 0,
    })
  }
  if (sub === "trabajo") return respuestaJson(200, paginaDe("trabajo", claseId, url, "elementos"))
  if (sub === "recursos" && subId === undefined) {
    if (url.searchParams.get("bloque") !== "docente") {
      return respuestaJson(200, { recursos: [], siguienteCursor: null })
    }
    return respuestaJson(200, paginaDe("recursos", claseId, url, "recursos"))
  }
  if (sub === "personas") {
    const { pagina, siguiente } = paginar(idsDe("personas", claseId), url)
    return respuestaJson(200, {
      maestro: MAESTRO,
      maestros: [MAESTRO],
      alumnos: pagina.map((id) => fila("personas", claseId, id)),
      totalAlumnos: 3,
      siguienteCursor: siguiente,
    })
  }
  if (sub === "alumnos" && subId === undefined && metodo === "GET") {
    return respuestaJson(200, { ...paginaDe("alumnos", claseId, url, "alumnos"), total: 3 })
  }
  if (sub === "alumnos" && subId === "candidatos") {
    return respuestaJson(200, { candidatos: [], hayMas: false })
  }
  return error500()
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  servidor = { rol: "maestro", borradas: new Set(), archivadas: new Set(), clases: null }
  llamadas = []
  interceptores = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://x")
      const metodo = init?.method ?? "GET"
      const cuerpo: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : undefined
      const llamada = { metodo, url, cuerpo }
      llamadas.push(llamada)
      for (const interceptor of interceptores) {
        const propia = interceptor(llamada)
        if (propia !== undefined) return Promise.resolve().then(propia)
      }
      return Promise.resolve().then(() => responder(llamada))
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

const nuevoCliente = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })

const montar = async (entradas: string | string[]) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, {
    initialEntries: typeof entradas === "string" ? [entradas] : entradas,
  })
  const cliente = nuevoCliente()
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, cliente }
}

type Enrutador = Awaited<ReturnType<typeof montar>>["router"]

const navegar = async (router: Enrutador, destino: string | number) => {
  await act(async () => {
    if (typeof destino === "number") await router.navigate(destino)
    else await router.navigate(destino)
  })
}

const reposar = (ms = 50) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))
const buscarBoton = (nombre: string | RegExp) =>
  screen.findByRole("button", { name: nombre }, ESPERA)
const contar = (cumple: (llamada: Llamada) => boolean) => llamadas.filter(cumple).length
const titulo = (claseId: string) =>
  screen.findByRole("heading", { level: 1, name: NOMBRES[claseId] ?? "" }, ESPERA)

// ---------------------------------------------------------------------------------------------------
// Las 12 listas de §D-4
// ---------------------------------------------------------------------------------------------------

interface Lista {
  nombre: string
  rol: Rol
  // La ruta de la vista de la clase (`claseId`) o del inicio.
  vista: (claseId: string) => string
  otra: (claseId: string) => string
  // El pathname y los parámetros que distinguen sus peticiones.
  api: (claseId: string) => string
  parametro?: readonly [string, string]
  abrir?: () => Promise<void>
  // El texto de una fila que solo se ve con la lista sana.
  fila: (claseId: string) => string
  clave: (claseId: string) => QueryKey
  // true: «Ver más» y el 400 del cursor; los temas de Recursos y Actividades no se paginan.
  paginada: boolean
  // true: una recarga fallida con datos conserva la lista y avisa (Recursos y Actividades).
  conservaLaRecarga: boolean
  verMas?: string
}

const BASE = (rol: Rol, claseId: string) => `/${rol}/clases/${claseId}`
const PUB = (claseId: string) => idDe("publicaciones", claseId, 1)
const DUDA = (claseId: string) => idDe("dudas", claseId, 1)
const abrirComentarios = async () => {
  fireEvent.click(await buscarBoton(TEXTOS_PUBLICACION.verComentarios(3)))
}
const abrirRespuestas = async () => {
  fireEvent.click(await buscarBoton(TEXTOS_DUDAS.verRespuestas(3)))
}

const LISTAS: readonly Lista[] = [
  {
    nombre: "Avisos",
    rol: "maestro",
    vista: (c) => BASE("maestro", c),
    otra: (c) => `${BASE("maestro", c)}/personas`,
    api: (c) => `/api/clases/${c}/publicaciones`,
    fila: (c) => textoDe("publicaciones", c, 1),
    clave: (c) => clavePublicaciones(c),
    paginada: true,
    conservaLaRecarga: false,
    verMas: "Ver más avisos",
  },
  {
    nombre: "comentarios",
    rol: "maestro",
    vista: (c) => BASE("maestro", c),
    otra: (c) => `${BASE("maestro", c)}/personas`,
    api: (c) => `/api/clases/${c}/publicaciones/${PUB(c)}/comentarios`,
    abrir: abrirComentarios,
    fila: (c) => textoDe("comentarios", c, 1),
    clave: (c) => claveComentarios(c, PUB(c)),
    paginada: true,
    conservaLaRecarga: false,
    verMas: TEXTOS_COMENTARIOS.verMas,
  },
  {
    nombre: "Dudas",
    rol: "maestro",
    vista: (c) => `${BASE("maestro", c)}/dudas`,
    otra: (c) => BASE("maestro", c),
    api: (c) => `/api/clases/${c}/dudas`,
    fila: (c) => textoDe("dudas", c, 1),
    clave: (c) => claveDudas(c),
    paginada: true,
    conservaLaRecarga: false,
    verMas: TEXTOS_DUDAS.verMas,
  },
  {
    nombre: "respuestas",
    rol: "maestro",
    vista: (c) => `${BASE("maestro", c)}/dudas`,
    otra: (c) => BASE("maestro", c),
    api: (c) => `/api/clases/${c}/dudas/${DUDA(c)}/respuestas`,
    abrir: abrirRespuestas,
    fila: (c) => textoDe("respuestas", c, 1),
    clave: (c) => claveRespuestas(c, DUDA(c)),
    paginada: true,
    conservaLaRecarga: false,
    verMas: "Ver más respuestas",
  },
  {
    nombre: "Actividades (los temas)",
    rol: "maestro",
    vista: (c) => `${BASE("maestro", c)}/trabajo`,
    otra: (c) => `${BASE("maestro", c)}/dudas`,
    api: (c) => `/api/clases/${c}/temas`,
    parametro: ["seccion", "actividades"],
    fila: (c) => textoDe("trabajo", c, 1),
    clave: (c) => claveTemasDeLaSeccion(c, "actividades"),
    paginada: false,
    conservaLaRecarga: true,
  },
  {
    nombre: "Actividades (un tema)",
    rol: "maestro",
    vista: (c) => `${BASE("maestro", c)}/trabajo`,
    otra: (c) => `${BASE("maestro", c)}/dudas`,
    api: (c) => `/api/clases/${c}/trabajo`,
    fila: (c) => textoDe("trabajo", c, 1),
    clave: (c) => claveTrabajo(c, TEMA(c)),
    paginada: true,
    conservaLaRecarga: false,
    verMas: "Ver más de Unidad 1",
  },
  {
    nombre: "Recursos (los temas del bloque)",
    rol: "maestro",
    vista: (c) => `${BASE("maestro", c)}/recursos`,
    otra: (c) => `${BASE("maestro", c)}/dudas`,
    api: (c) => `/api/clases/${c}/temas`,
    parametro: ["seccion", "docente"],
    fila: (c) => textoDe("recursos", c, 1),
    clave: (c) => claveTemasDeLaSeccion(c, "docente"),
    paginada: false,
    conservaLaRecarga: true,
  },
  {
    nombre: "Recursos (un tema)",
    rol: "maestro",
    vista: (c) => `${BASE("maestro", c)}/recursos`,
    otra: (c) => `${BASE("maestro", c)}/dudas`,
    api: (c) => `/api/clases/${c}/recursos`,
    parametro: ["bloque", "docente"],
    fila: (c) => textoDe("recursos", c, 1),
    clave: (c) => claveRecursos(c, "docente", CLAVE_SIN_TEMA),
    paginada: true,
    conservaLaRecarga: true,
    verMas: "Ver más de Sin tema",
  },
  {
    nombre: "Personas",
    rol: "estudiante",
    vista: (c) => `${BASE("estudiante", c)}/personas`,
    otra: (c) => `${BASE("estudiante", c)}/dudas`,
    api: (c) => `/api/clases/${c}/personas`,
    fila: (c) => textoDe("personas", c, 1),
    clave: (c) => clavePersonas(c),
    paginada: true,
    conservaLaRecarga: false,
    verMas: "Ver más alumnos",
  },
  {
    nombre: "el roster",
    rol: "maestro",
    vista: (c) => `${BASE("maestro", c)}/personas`,
    otra: (c) => `${BASE("maestro", c)}/dudas`,
    api: (c) => `/api/clases/${c}/alumnos`,
    fila: (c) => textoDe("alumnos", c, 1),
    clave: (c) => claveAlumnos(c),
    paginada: true,
    conservaLaRecarga: false,
    verMas: "Ver más alumnos",
  },
  {
    nombre: "inicio del estudiante",
    rol: "estudiante",
    vista: () => "/estudiante",
    otra: () => "/estudiante/clases-anteriores",
    api: () => "/api/clases/inscritas",
    fila: () => `Clase 1 de Historia`,
    clave: () => CLAVE_CLASES_INSCRITAS,
    paginada: true,
    conservaLaRecarga: false,
    verMas: TEXTOS_PANEL.verMas,
  },
  {
    nombre: "inicio del maestro",
    rol: "maestro",
    vista: () => "/maestro",
    otra: () => "/maestro/clases-archivadas",
    api: () => "/api/clases/impartidas",
    fila: () => `Clase 1 de Historia`,
    clave: () => CLAVE_CLASES_IMPARTIDAS,
    paginada: true,
    conservaLaRecarga: false,
    verMas: TEXTOS_PANEL.verMas,
  },
]

const porNombre = (nombre: string) => {
  const lista = LISTAS.find((l) => l.nombre === nombre)
  if (lista === undefined) throw new Error(`Precondición: la lista «${nombre}»`)
  return lista
}
const conNombre = (listas: readonly Lista[]) =>
  listas.map((lista) => [lista.nombre, lista] as const)

const deLaLista =
  (lista: Lista, conCursor: boolean | null, claseId = A) =>
  ({ metodo, url }: Llamada) =>
    metodo === "GET" &&
    url.pathname === lista.api(claseId) &&
    url.searchParams.get("limite") !== "100" &&
    (lista.parametro === undefined ||
      url.searchParams.get(lista.parametro[0]) === lista.parametro[1]) &&
    (conCursor === null || url.searchParams.has("cursor") === conCursor)

const fallarDosVeces = (cumple: (llamada: Llamada) => boolean, respuesta: Respuesta) => {
  interceptarUnaVez(cumple, respuesta)
  interceptarUnaVez(cumple, respuesta)
}

const filaVisible = (lista: Lista, claseId = A) =>
  expect(screen.getAllByText(lista.fila(claseId)).length).toBeGreaterThan(0)

const esperarSana = async (lista: Lista, claseId = A) => {
  await waitFor(() => filaVisible(lista, claseId), ESPERA)
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull(), ESPERA)
}

// La lista en error en su primera carga (sin datos): su frase a la vista.
const enErrorSinDatos = async (lista: Lista) => {
  servidor.rol = lista.rol
  fallarDosVeces(deLaLista(lista, false), error500)
  const montado = await montar(lista.vista(A))
  await lista.abrir?.()
  await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0), ESPERA)
  return montado
}

// La lista con su página siguiente que falló con el 400 del cursor: la frase "…Vuelve a abrir…".
const enErrorDelCursor = async (lista: Lista) => {
  servidor.rol = lista.rol
  const montado = await montar(lista.vista(A))
  await lista.abrir?.()
  const verMas = await buscarBoton(lista.verMas ?? "")
  fallarDosVeces(deLaLista(lista, true), cursorVencido)
  fireEvent.click(verMas)
  await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0), ESPERA)
  return montado
}

// ---------------------------------------------------------------------------------------------------
// CH6-B03 · pulsar la sección estando en ella
// ---------------------------------------------------------------------------------------------------

describe("CH6-B03 · pulsar la sección estando en ella cumple la frase", () => {
  it.each(conNombre(LISTAS))(
    "CH6-B03 (%s, primera carga fallida): pulsar la sección pide la lista una vez desde la primera página y la frase desaparece",
    async (_nombre, lista) => {
      const { router } = await enErrorSinDatos(lista)
      const antes = contar(deLaLista(lista, null))
      await navegar(router, lista.vista(A))
      await esperarSana(lista)
      await reposar(150)
      expect(contar(deLaLista(lista, null))).toBe(antes + 1)
      expect(llamadas.filter(deLaLista(lista, null)).at(-1)?.url.searchParams.has("cursor")).toBe(
        false,
      )
    },
    20_000,
  )

  it.each(conNombre(LISTAS.filter((lista) => lista.paginada)))(
    "CH6-B03 (%s, el 400 del cursor): pulsar la sección vuelve a pedir desde la primera página, sin repetir el cursor vencido, y la frase desaparece",
    async (_nombre, lista) => {
      const { router } = await enErrorDelCursor(lista)
      const antes = contar(deLaLista(lista, null))
      await navegar(router, lista.vista(A))
      await esperarSana(lista)
      await reposar(150)
      const nuevas = llamadas.filter(deLaLista(lista, null)).slice(antes)
      expect(nuevas).toHaveLength(1)
      expect(nuevas[0]?.url.searchParams.has("cursor")).toBe(false)
    },
    20_000,
  )

  it("CH6-B03 (Avisos, pulsando el enlace «Avisos» del control segmentado): la lista en error se pide una vez", async () => {
    const lista = porNombre("Avisos")
    await enErrorSinDatos(lista)
    const antes = contar(deLaLista(lista, null))
    const secciones = screen.getByRole("list", { name: "Secciones de la clase" })
    fireEvent.click(within(secciones).getByRole("link", { name: "Avisos" }))
    await esperarSana(lista)
    expect(contar(deLaLista(lista, null))).toBe(antes + 1)
  }, 20_000)

  it("CH6-B03 (comentarios de un recurso, pulsando «Recursos»): con la primera carga de los comentarios fallida, pulsar «Recursos» estando ahí los pide una vez y la frase desaparece", async () => {
    servidor.rol = "maestro"
    const recursoA1 = idDe("recursos", A, 1)
    const deLosComentarios = ({ metodo, url }: Llamada) =>
      metodo === "GET" && url.pathname === `/api/clases/${A}/publicaciones/${recursoA1}/comentarios`
    fallarDosVeces(deLosComentarios, error500)
    const { router } = await montar(`${BASE("maestro", A)}/recursos`)
    await screen.findByText(textoDe("recursos", A, 1), {}, ESPERA)
    const filaDelRecurso = screen
      .getByText(textoDe("recursos", A, 1))
      .closest<HTMLElement>("[data-recurso-id]")
    if (filaDelRecurso === null) throw new Error("Precondición: la fila del recurso")
    fireEvent.click(within(filaDelRecurso).getByRole("button", { name: "Ver recurso" }))
    fireEvent.click(
      await within(filaDelRecurso).findByRole(
        "button",
        { name: TEXTOS_PUBLICACION.verComentarios(3) },
        ESPERA,
      ),
    )
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0), ESPERA)
    const antes = contar(deLosComentarios)
    await navegar(router, `${BASE("maestro", A)}/recursos`)
    await waitFor(
      () => expect(screen.getAllByText(textoDe("comentarios", A, 1)).length).toBeGreaterThan(0),
      ESPERA,
    )
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull(), ESPERA)
    await reposar(150)
    expect(contar(deLosComentarios)).toBe(antes + 1)
  }, 20_000)

  it.each(conNombre([porNombre("inicio del estudiante"), porNombre("inicio del maestro")]))(
    "CH6-B03 (%s, pulsando «Inicio» de la barra): la lista en error se pide una vez",
    async (_nombre, lista) => {
      await enErrorSinDatos(lista)
      const antes = contar(deLaLista(lista, null))
      fireEvent.click(screen.getAllByRole("link", { name: "Inicio" })[0] as HTMLElement)
      await esperarSana(lista)
      expect(contar(deLaLista(lista, null))).toBe(antes + 1)
    },
    20_000,
  )
})

// ---------------------------------------------------------------------------------------------------
// CH6-B04 · ir a otra sección y volver antes de 30 s
// ---------------------------------------------------------------------------------------------------

describe("CH6-B04 · ir a otra sección y volver antes de 30 s", () => {
  it.each(conNombre(LISTAS))(
    "CH6-B04 (%s, sin datos): con la primera carga fallida, ir a otra sección y volver pide la lista una vez y la frase desaparece",
    async (_nombre, lista) => {
      const { router } = await enErrorSinDatos(lista)
      await navegar(router, lista.otra(A))
      await reposar(100)
      const antes = contar(deLaLista(lista, null))
      await navegar(router, lista.vista(A))
      await lista.abrir?.()
      await esperarSana(lista)
      await reposar(150)
      expect(contar(deLaLista(lista, null))).toBe(antes + 1)
    },
    20_000,
  )

  it.each(conNombre(LISTAS))(
    "CH6-B04 (%s, con datos y una recarga fallida): ir a otra sección y volver pide la lista una vez y no queda frase ni aviso nuevo",
    async (_nombre, lista) => {
      servidor.rol = lista.rol
      const { router, cliente } = await montar(lista.vista(A))
      await lista.abrir?.()
      await esperarSana(lista)
      fallarDosVeces(deLaLista(lista, false), error503)
      await act(async () => {
        await cliente
          .refetchQueries({ queryKey: lista.clave(A), exact: true })
          .catch(() => undefined)
      })
      await waitFor(
        () => expect(cliente.getQueryState(lista.clave(A))?.status).toBe("error"),
        ESPERA,
      )
      await waitFor(
        () => expect(aviso.error).toHaveBeenCalledTimes(lista.conservaLaRecarga ? 1 : 0),
        ESPERA,
      )
      await reposar(100)
      const avisos = aviso.error.mock.calls.length
      expect(avisos).toBe(lista.conservaLaRecarga ? 1 : 0)
      await navegar(router, lista.otra(A))
      await reposar(100)
      const antes = contar(deLaLista(lista, false))
      await navegar(router, lista.vista(A))
      await lista.abrir?.()
      await esperarSana(lista)
      await reposar(150)
      expect(contar(deLaLista(lista, false))).toBe(antes + 1)
      expect(aviso.error).toHaveBeenCalledTimes(avisos)
    },
    20_000,
  )

  it.each(conNombre(LISTAS))(
    "CH6-B04 (%s, recarga fallida y la nueva petición retenida al volver): mientras vuela la petición del montaje sigue lo de antes (el MensajeError en las listas que reemplaza una recarga; la lista en las que la conservan), sin aviso nuevo; al responder bien, la lista sin frase",
    async (_nombre, lista) => {
      servidor.rol = lista.rol
      const { router, cliente } = await montar(lista.vista(A))
      await lista.abrir?.()
      await esperarSana(lista)
      fallarDosVeces(deLaLista(lista, false), error503)
      await act(async () => {
        await cliente
          .refetchQueries({ queryKey: lista.clave(A), exact: true })
          .catch(() => undefined)
      })
      await waitFor(
        () => expect(cliente.getQueryState(lista.clave(A))?.status).toBe("error"),
        ESPERA,
      )
      await reposar(100)
      const avisos = aviso.error.mock.calls.length
      await navegar(router, lista.otra(A))
      await reposar(100)
      const recarga = retenida()
      interceptarUnaVez(deLaLista(lista, false), recarga.respuesta)
      const antes = contar(deLaLista(lista, false))
      await navegar(router, lista.vista(A))
      await lista.abrir?.()
      await waitFor(() => expect(contar(deLaLista(lista, false))).toBe(antes + 1), ESPERA)
      if (lista.conservaLaRecarga) {
        filaVisible(lista)
        expect(screen.queryByRole("alert")).toBeNull()
      } else {
        expect(screen.getAllByRole("alert").length).toBeGreaterThan(0)
      }
      await recarga.soltar(() =>
        responder(llamadas.filter(deLaLista(lista, false)).at(-1) as Llamada),
      )
      await esperarSana(lista)
      await reposar(150)
      expect(aviso.error).toHaveBeenCalledTimes(avisos)
    },
    20_000,
  )

  it.each(conNombre(["Avisos", "Personas", "inicio del estudiante"].map(porNombre)))(
    "CH6-B04 (c′) (%s): con una recarga en vuelo, ir a otra sección; la recarga falla con la vista desmontada; al volver antes de 30 s se pide una vez, sin aviso, y la frase no queda al responder bien",
    async (_nombre, lista) => {
      servidor.rol = lista.rol
      const { router, cliente } = await montar(lista.vista(A))
      await esperarSana(lista)
      const recarga = retenida()
      interceptarUnaVez(deLaLista(lista, false), recarga.respuesta)
      act(() => {
        void cliente.invalidateQueries({ queryKey: lista.clave(A), exact: true })
      })
      await waitFor(
        () => expect(cliente.getQueryState(lista.clave(A))?.fetchStatus).toBe("fetching"),
        ESPERA,
      )
      await navegar(router, lista.otra(A))
      await recarga.soltar(error503)
      await waitFor(
        () => expect(cliente.getQueryState(lista.clave(A))?.status).toBe("error"),
        ESPERA,
      )
      const antes = contar(deLaLista(lista, false))
      await navegar(router, lista.vista(A))
      await esperarSana(lista)
      await reposar(150)
      expect(contar(deLaLista(lista, false))).toBe(antes + 1)
      expect(aviso.error).not.toHaveBeenCalled()
    },
    20_000,
  )
})

// ---------------------------------------------------------------------------------------------------
// CH6-B05 · atrás y adelante a otra entrada de la misma ruta
// ---------------------------------------------------------------------------------------------------

describe("CH6-B05 · atrás y adelante del historial en la misma ruta", () => {
  it.each(conNombre(["Avisos", "Dudas", "inicio del estudiante"].map(porNombre)))(
    "CH6-B05 (%s): tras pulsar dos veces la sección, la lista falla en una recarga; ir atrás (otra location.key en la misma ruta) la pide una vez y la frase desaparece",
    async (_nombre, lista) => {
      servidor.rol = lista.rol
      const { router, cliente } = await montar(lista.vista(A))
      await esperarSana(lista)
      await navegar(router, lista.vista(A))
      await navegar(router, lista.vista(A))
      fallarDosVeces(deLaLista(lista, false), error503)
      await act(async () => {
        await cliente
          .refetchQueries({ queryKey: lista.clave(A), exact: true })
          .catch(() => undefined)
      })
      await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0), ESPERA)
      const antes = contar(deLaLista(lista, false))
      await navegar(router, -1)
      await esperarSana(lista)
      await reposar(150)
      expect(contar(deLaLista(lista, false))).toBe(antes + 1)
    },
    20_000,
  )
})

// ---------------------------------------------------------------------------------------------------
// CH6-B06 · repetir el control: cerrar y abrir
// ---------------------------------------------------------------------------------------------------

describe("CH6-B06 · cerrar y abrir los comentarios y las respuestas", () => {
  it.each([
    ["comentarios", TEXTOS_PUBLICACION.ocultarComentarios] as const,
    ["respuestas", TEXTOS_DUDAS.ocultarRespuestas] as const,
  ])(
    "CH6-B06 (%s): con la primera carga fallida, cerrar y volver a abrir el bloque pide la lista una vez y la frase desaparece",
    async (nombre, ocultar) => {
      const lista = porNombre(nombre)
      await enErrorSinDatos(lista)
      const antes = contar(deLaLista(lista, null))
      fireEvent.click(screen.getByRole("button", { name: ocultar }))
      await lista.abrir?.()
      await esperarSana(lista)
      expect(contar(deLaLista(lista, null))).toBe(antes + 1)
    },
    20_000,
  )
})

// ---------------------------------------------------------------------------------------------------
// Corrección M-01 (verificación del manager): la frase del 400 del cursor por cada camino
// ---------------------------------------------------------------------------------------------------

// La frase que pinta cada lista ante el 400 del cursor con páginas ya cargadas. Personas y el roster
// pintan el texto fijo del lugar (mensajeDeConsultaClases de un VALIDACION que no es de claseId).
const CURSOR_400 = new ApiError("VALIDACION", "cursor: no es válido", 400)
const FRASE_DEL_CURSOR: Record<string, string> = {
  Avisos: TEXTOS_MURO.cambioMientrasLoVeias,
  comentarios: TEXTOS_COMENTARIOS.cambioMientrasLosVeias,
  Dudas: TEXTOS_DUDAS.cambioMientrasLasVeias,
  respuestas: TEXTOS_RESPUESTAS.cambioMientrasLasVeias,
  "Actividades (un tema)": TEXTOS_TRABAJO.cambioMientrasLoVeias,
  "Recursos (un tema)": TEXTOS_RECURSOS.cambioMientrasLoVeias,
  Personas: mensajeDeConsultaClases(CURSOR_400),
  "el roster": mensajeDeConsultaClases(CURSOR_400),
  "inicio del estudiante": TEXTOS_PANEL.cambioMientrasLasVeias,
  "inicio del maestro": TEXTOS_PANEL.cambioMientrasLasVeias,
}
const fraseDelCursor = (lista: Lista) => {
  const frase = FRASE_DEL_CURSOR[lista.nombre]
  if (frase === undefined) throw new Error(`Precondición: la frase del cursor de ${lista.nombre}`)
  return frase
}
const PAGINADAS = LISTAS.filter((lista) => lista.paginada)

// Tras el camino, la lista se pide una sola vez, desde la primera página (sin el cursor vencido), la
// frase ya no está y no sale ningún aviso.
const cumpleLaFraseDelCursor = async (lista: Lista, antes: number, claseId = A) => {
  await esperarSana(lista, claseId)
  await reposar(200)
  const nuevas = llamadas.filter(deLaLista(lista, null, claseId)).slice(antes)
  expect(nuevas).toHaveLength(1)
  expect(nuevas[0]?.url.searchParams.has("cursor")).toBe(false)
  expect(screen.queryByText(fraseDelCursor(lista))).toBeNull()
  expect(aviso.error).not.toHaveBeenCalled()
}

describe("Corrección M-01 · la frase del 400 del cursor por cada camino", () => {
  it.each(conNombre(PAGINADAS))(
    "CH6-B04 (%s, el 400 del cursor): con la frase del cursor a la vista y páginas cargadas, ir a otra sección y volver antes de 30 s pide la lista una vez desde la primera página, sin el cursor vencido, y la frase desaparece sin aviso",
    async (_nombre, lista) => {
      const { router } = await enErrorDelCursor(lista)
      expect(screen.getAllByText(fraseDelCursor(lista)).length).toBeGreaterThan(0)
      await navegar(router, lista.otra(A))
      await reposar(100)
      const antes = contar(deLaLista(lista, null))
      await navegar(router, lista.vista(A))
      await lista.abrir?.()
      await cumpleLaFraseDelCursor(lista, antes)
    },
    20_000,
  )

  it.each([
    ["comentarios", TEXTOS_PUBLICACION.ocultarComentarios] as const,
    ["respuestas", TEXTOS_DUDAS.ocultarRespuestas] as const,
  ])(
    "CH6-B06 (%s, el 400 del cursor): con «Vuelve a abrirlos» o «Vuelve a abrirlas» a la vista, cerrar y volver a abrir el bloque pide la lista una vez desde la primera página, sin el cursor vencido, y la frase desaparece sin aviso",
    async (nombre, ocultar) => {
      const lista = porNombre(nombre)
      await enErrorDelCursor(lista)
      expect(screen.getByText(fraseDelCursor(lista))).toBeInTheDocument()
      expect(fraseDelCursor(lista)).toMatch(/Vuelve a abrirl[oa]s/)
      const antes = contar(deLaLista(lista, null))
      fireEvent.click(screen.getByRole("button", { name: ocultar }))
      await lista.abrir?.()
      await cumpleLaFraseDelCursor(lista, antes)
    },
    20_000,
  )

  it.each(conNombre(["Avisos", "Dudas", "inicio del estudiante"].map(porNombre)))(
    "CH6-B05 (%s, el 400 del cursor): tras pulsar dos veces la sección, el 400 del cursor pinta la frase; ir atrás (otra location.key en la misma ruta) pide la lista una vez desde la primera página y la frase desaparece sin aviso",
    async (_nombre, lista) => {
      servidor.rol = lista.rol
      const { router } = await montar(lista.vista(A))
      await esperarSana(lista)
      await navegar(router, lista.vista(A))
      await navegar(router, lista.vista(A))
      const verMas = await buscarBoton(lista.verMas ?? "")
      fallarDosVeces(deLaLista(lista, true), cursorVencido)
      fireEvent.click(verMas)
      await waitFor(
        () => expect(screen.getByText(fraseDelCursor(lista))).toBeInTheDocument(),
        ESPERA,
      )
      const antes = contar(deLaLista(lista, null))
      await navegar(router, -1)
      await cumpleLaFraseDelCursor(lista, antes)
    },
    20_000,
  )
})

// ---------------------------------------------------------------------------------------------------
// CH6-B07 · H-2: pulsar con una petición en vuelo no la duplica ni la cancela
// ---------------------------------------------------------------------------------------------------

const SIETE = [
  "Avisos",
  "Dudas",
  "Recursos (los temas del bloque)",
  "Actividades (los temas)",
  "Recursos (un tema)",
  "respuestas",
  "Actividades (un tema)",
].map(porNombre)

describe("CH6-B07 · H-2 en las siete vistas de la fila 346", () => {
  // La lista en error CON datos (su recarga falló): con datos, refetch() sin cancelRefetch: false
  // cancela la petición en vuelo y lanza otra (query.fetch de @tanstack/query-core 5.103.2 solo cancela
  // si hay datos), que es lo que fija H-2.
  it.each(conNombre(SIETE))(
    "CH6-B07 (%s): con la lista en error (con datos) y su nueva petición retenida, dos pulsaciones en el mismo act y otra en otro render no mandan otra petición; al soltarla, la lista aparece",
    async (_nombre, lista) => {
      servidor.rol = lista.rol
      const { router, cliente } = await montar(lista.vista(A))
      await lista.abrir?.()
      await esperarSana(lista)
      fallarDosVeces(deLaLista(lista, false), error503)
      await act(async () => {
        await cliente
          .refetchQueries({ queryKey: lista.clave(A), exact: true })
          .catch(() => undefined)
      })
      await waitFor(
        () => expect(cliente.getQueryState(lista.clave(A))?.status).toBe("error"),
        ESPERA,
      )
      const recarga = retenida()
      interceptarUnaVez(deLaLista(lista, false), recarga.respuesta)
      const antes = contar(deLaLista(lista, false))
      await navegar(router, lista.vista(A))
      await waitFor(() => expect(contar(deLaLista(lista, false))).toBe(antes + 1), ESPERA)
      await act(async () => {
        await router.navigate(lista.vista(A))
        await router.navigate(lista.vista(A))
      })
      await reposar(100)
      await navegar(router, lista.vista(A))
      await reposar(150)
      expect(contar(deLaLista(lista, false))).toBe(antes + 1)
      await recarga.soltar(() =>
        responder(llamadas.filter(deLaLista(lista, false)).at(-1) as Llamada),
      )
      await esperarSana(lista)
      expect(contar(deLaLista(lista, false))).toBe(antes + 1)
    },
    20_000,
  )
})

// ---------------------------------------------------------------------------------------------------
// CH6-B08 · O-03: tras «Subir» con la recarga por sección fallida
// ---------------------------------------------------------------------------------------------------

describe("CH6-B08 · O-03 de CLASES-03c2", () => {
  it("CH6-B08: tras «Subir» con la recarga por sección fallida, pulsar «Actividades de aprendizaje» estando ahí pide la lista de temas una vez y los conteos se renuevan", async () => {
    servidor.rol = "maestro"
    const temaId = (n: number) => uuid("4c4c3c4d", n)
    const temas = {
      orden: [1, 2, 3].map(temaId),
      elementos: { [temaId(1)]: 0, [temaId(2)]: 0, [temaId(3)]: 0 } as Record<string, number>,
    }
    const lista = () => ({
      temas: temas.orden.map((id, orden) => ({
        id,
        nombre: `Unidad ${String(numeroDe(id))}`,
        orden,
        elementos: temas.elementos[id] ?? 0,
      })),
      sinTema: 0,
    })
    const deTemas = ({ metodo, url }: Llamada) =>
      metodo === "GET" && url.pathname === `/api/clases/${A}/temas`
    const deLaSeccion = (l: Llamada) =>
      deTemas(l) && l.url.searchParams.get("seccion") === "actividades"
    const quitar = interceptarSiempre(deTemas, () => respuestaJson(200, lista()))
    interceptarSiempre(
      ({ metodo, url }) => metodo === "PUT" && url.pathname === `/api/clases/${A}/temas/orden`,
      () => respuestaJson(200, lista()),
    )
    const { router } = await montar(`${BASE("maestro", A)}/trabajo`)
    await screen.findByRole("heading", { level: 2, name: /^Unidad 3/ }, ESPERA)
    quitar()
    // La recarga por sección que sigue al PUT falla dos veces; las demás lecturas, sanas.
    fallarDosVeces(deLaSeccion, error500)
    interceptarSiempre(deTemas, () => respuestaJson(200, lista()))
    temas.orden = [temaId(2), temaId(1), temaId(3)]
    fireEvent.click(screen.getByRole("button", { name: "Subir tema Unidad 2" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await reposar(200)
    temas.elementos[temaId(3)] = 2
    const antes = contar(deLaSeccion)
    await navegar(router, `${BASE("maestro", A)}/trabajo`)
    await waitFor(() => expect(contar(deLaSeccion)).toBe(antes + 1), ESPERA)
    await waitFor(
      () =>
        expect(screen.getByRole("heading", { level: 2, name: /^Unidad 3/ })).toHaveTextContent(
          TEXTOS_TRABAJO.conteo(2),
        ),
      ESPERA,
    )
    await reposar(200)
    expect(contar(deLaSeccion)).toBe(antes + 1)
  }, 20_000)
})

// ---------------------------------------------------------------------------------------------------
// CH6-B09 · el hermano de T-07 en /admin/clases y "Clases anteriores"
// ---------------------------------------------------------------------------------------------------

describe("CH6-B09 · hermano de T-07: pulsar con la recarga en vuelo", () => {
  // Como T-07 de ADMIN-01g: la lista en error con una recarga que ya vuela por otro camino (aquí,
  // refetchQueries) conserva status "error"; pulsar no debe reiniciarla ni lanzar otra.
  it.each([
    [
      "/admin/clases",
      "admin",
      "/admin/clases",
      "/api/admin/clases",
      claveClasesAdmin("activas"),
    ] as const,
    [
      "Clases anteriores",
      "estudiante",
      "/estudiante/clases-anteriores",
      "/api/clases/anteriores",
      claveClasesAnteriores(),
    ] as const,
    [
      "Clases archivadas",
      "maestro",
      "/maestro/clases-archivadas",
      "/api/clases/anteriores",
      claveClasesAnteriores(),
    ] as const,
  ])(
    "CH6-B09 (%s): con la lista en error y una recarga en vuelo, pulsar la sección no manda otra; al responder, la lista aparece",
    async (_nombre, rol, vista, api, clave) => {
      servidor.rol = rol
      servidor.archivadas.add(A)
      const deLista = ({ metodo, url }: Llamada) => metodo === "GET" && url.pathname === api
      const { router, cliente } = await montar(vista)
      await waitFor(() => expect(screen.getAllByText("Historia").length).toBeGreaterThan(0), ESPERA)
      // Con datos: sin ellos, una petición en vuelo deja la consulta en "pending" (fetchState).
      fallarDosVeces(deLista, error500)
      await act(async () => {
        await cliente.refetchQueries({ queryKey: clave, exact: true }).catch(() => undefined)
      })
      await waitFor(() => expect(cliente.getQueryState(clave)?.status).toBe("error"), ESPERA)
      const recarga = retenida()
      interceptarUnaVez(deLista, recarga.respuesta)
      act(() => {
        void cliente.refetchQueries({ queryKey: clave, exact: true })
      })
      await waitFor(() => expect(contar(deLista)).toBe(4), ESPERA)
      expect(cliente.getQueryState(clave)?.status).toBe("error")
      await navegar(router, vista)
      await reposar(150)
      await navegar(router, vista)
      await reposar(150)
      expect(contar(deLista)).toBe(4)
      await recarga.soltar(() => responder(llamadas.filter(deLista).at(-1) as Llamada))
      await waitFor(() => expect(screen.getAllByText("Historia").length).toBeGreaterThan(0), ESPERA)
      await reposar(150)
      expect(contar(deLista)).toBe(4)
    },
    20_000,
  )
})

// ---------------------------------------------------------------------------------------------------
// CH6-B15 · la clase archivada en la barra y en el inicio (fila 361)
// ---------------------------------------------------------------------------------------------------

describe("CH6-B15 · una clase que se lee archivada sale de la barra y del inicio", () => {
  const deLaBarra =
    (api: string) =>
    ({ metodo, url }: Llamada) =>
      metodo === "GET" && url.pathname === api && url.searchParams.get("limite") === "100"
  const delInicio =
    (api: string) =>
    ({ metodo, url }: Llamada) =>
      metodo === "GET" && url.pathname === api && url.searchParams.get("limite") !== "100"
  const deLasListas = ({ metodo, url }: Llamada) =>
    metodo === "GET" &&
    (url.pathname === "/api/clases/inscritas" || url.pathname === "/api/clases/impartidas")
  const enlaceDeLaBarra = (nombre: string) =>
    screen
      .queryAllByRole("link", { name: nombre })
      .filter((enlace) => enlace.closest("nav") !== null)

  it.each([
    ["alumno", "estudiante", "/api/clases/inscritas"] as const,
    ["maestro", "maestro", "/api/clases/impartidas"] as const,
  ])(
    "CH6-B15 (%s): con A en la barra, abrir A y que llegue archivada pide la barra y la lista del inicio una vez cada una y ya no la traen",
    async (_quien, rol, api) => {
      servidor.rol = rol
      servidor.clases = [A, B]
      const { router } = await montar(`/${rol}`)
      await waitFor(() => expect(enlaceDeLaBarra("Historia").length).toBeGreaterThan(0), ESPERA)
      await waitFor(() => expect(contar(delInicio(api))).toBe(1), ESPERA)
      const barraAntes = contar(deLaBarra(api))
      servidor.archivadas.add(A)
      await navegar(router, `/${rol}/clases/${A}`)
      await titulo(A)
      await waitFor(() => expect(contar(deLaBarra(api))).toBe(barraAntes + 1), ESPERA)
      await waitFor(() => expect(enlaceDeLaBarra("Historia")).toHaveLength(0), ESPERA)
      await reposar(200)
      expect(contar(deLaBarra(api))).toBe(barraAntes + 1)
      await navegar(router, `/${rol}`)
      await waitFor(() => expect(contar(delInicio(api))).toBe(2), ESPERA)
      await screen.findByRole("heading", { level: 2, name: TEXTOS_PANEL.titulo }, ESPERA)
      await reposar(200)
      expect(contar(delInicio(api))).toBe(2)
      expect(screen.queryAllByRole("link", { name: "Historia" })).toHaveLength(0)
    },
    20_000,
  )

  it("CH6-B15 (alumno, la barra en vuelo): con la petición de la barra retenida mientras el alumno pasa a «Clases anteriores», la segunda corrida del efecto se une a ella y la barra se pide una sola vez", async () => {
    servidor.rol = "estudiante"
    servidor.clases = [A, B]
    const api = "/api/clases/inscritas"
    const { router } = await montar("/estudiante")
    await waitFor(() => expect(enlaceDeLaBarra("Historia").length).toBeGreaterThan(0), ESPERA)
    await reposar(100)
    const barraAntes = contar(deLaBarra(api))
    servidor.archivadas.add(A)
    const barra = retenida()
    interceptarUnaVez(deLaBarra(api), barra.respuesta)
    await navegar(router, `/estudiante/clases/${A}`)
    await titulo(A)
    await waitFor(() => expect(contar(deLaBarra(api))).toBe(barraAntes + 1), ESPERA)
    await reposar(300)
    expect(contar(deLaBarra(api))).toBe(barraAntes + 1)
    await barra.soltar(() => responder(llamadas.filter(deLaBarra(api)).at(-1) as Llamada))
    await waitFor(() => expect(enlaceDeLaBarra("Historia")).toHaveLength(0), ESPERA)
    await reposar(200)
    expect(contar(deLaBarra(api))).toBe(barraAntes + 1)
  }, 20_000)

  it("CH6-B15 (admin): abrir una clase archivada no pide las listas del alumno ni del maestro", async () => {
    servidor.rol = "admin"
    servidor.archivadas.add(A)
    await montar(`/admin/clases/${A}`)
    await titulo(A)
    await reposar(300)
    expect(contar(deLasListas)).toBe(0)
  }, 20_000)

  it("CH6-B15 (maestro desde «Clases archivadas»): con la barra en caché sin esa clase, abrirla (dos veces seguidas) no pide la barra ni el inicio", async () => {
    servidor.rol = "maestro"
    servidor.clases = [B]
    servidor.archivadas.add(A)
    const { router } = await montar("/maestro/clases-archivadas")
    await waitFor(() => expect(enlaceDeLaBarra("Geografía").length).toBeGreaterThan(0), ESPERA)
    const antes = contar(deLasListas)
    await navegar(router, `/maestro/clases/${A}`)
    await titulo(A)
    await reposar(200)
    await navegar(router, "/maestro/clases-archivadas")
    await reposar(100)
    await navegar(router, `/maestro/clases/${A}`)
    await titulo(A)
    await reposar(300)
    expect(contar(deLasListas)).toBe(antes)
  }, 20_000)

  it("CH6-B15 (maestro con el inicio en caché): A archivada → B → A con el historial: la barra se pide una sola vez, el inicio no se pide mientras no se monta pero queda isInvalidated, y al volver al inicio se pide una vez y ya no trae a A", async () => {
    servidor.rol = "maestro"
    servidor.clases = [A, B]
    const api = "/api/clases/impartidas"
    const { router, cliente } = await montar("/maestro")
    await waitFor(() => expect(enlaceDeLaBarra("Historia").length).toBeGreaterThan(0), ESPERA)
    await waitFor(() => expect(contar(delInicio(api))).toBe(1), ESPERA)
    await reposar(100)
    const barraAntes = contar(deLaBarra(api))
    servidor.archivadas.add(A)
    await navegar(router, `/maestro/clases/${A}`)
    await titulo(A)
    await waitFor(() => expect(enlaceDeLaBarra("Historia")).toHaveLength(0), ESPERA)
    await reposar(200)
    expect(contar(deLaBarra(api))).toBe(barraAntes + 1)
    expect(cliente.getQueryState(CLAVE_CLASES_IMPARTIDAS)?.isInvalidated).toBe(true)
    await navegar(router, `/maestro/clases/${B}`)
    await titulo(B)
    await reposar(200)
    await navegar(router, -1)
    await titulo(A)
    await reposar(300)
    expect(contar(deLaBarra(api))).toBe(barraAntes + 1)
    expect(contar(delInicio(api))).toBe(1)
    expect(cliente.getQueryState(CLAVE_CLASES_IMPARTIDAS)?.isInvalidated).toBe(true)
    await navegar(router, "/maestro")
    await waitFor(() => expect(contar(delInicio(api))).toBe(2), ESPERA)
    await screen.findByRole("heading", { level: 2, name: TEXTOS_PANEL.titulo }, ESPERA)
    await reposar(200)
    expect(contar(delInicio(api))).toBe(2)
    expect(contar(deLaBarra(api))).toBe(barraAntes + 1)
    expect(screen.queryAllByRole("link", { name: "Historia" })).toHaveLength(0)
  }, 20_000)

  it("CH6-B15 (salto del historial): A archivada y leída → B activa → A pide la barra una sola vez en total y saltar a B no la pide", async () => {
    servidor.rol = "maestro"
    servidor.clases = [A, B]
    const api = "/api/clases/impartidas"
    const { router } = await montar(`/maestro/clases/${B}`)
    await titulo(B)
    await waitFor(() => expect(enlaceDeLaBarra("Historia").length).toBeGreaterThan(0), ESPERA)
    const barraAntes = contar(deLaBarra(api))
    servidor.archivadas.add(A)
    await navegar(router, `/maestro/clases/${A}`)
    await titulo(A)
    await waitFor(() => expect(enlaceDeLaBarra("Historia")).toHaveLength(0), ESPERA)
    await reposar(200)
    expect(contar(deLaBarra(api))).toBe(barraAntes + 1)
    await navegar(router, `/maestro/clases/${B}`)
    await titulo(B)
    await reposar(200)
    expect(contar(deLaBarra(api))).toBe(barraAntes + 1)
    await navegar(router, -1)
    await titulo(A)
    await reposar(300)
    expect(contar(deLaBarra(api))).toBe(barraAntes + 1)
    expect(contar(delInicio(api))).toBe(0)
  }, 20_000)
})

// ---------------------------------------------------------------------------------------------------
// CH6-B16 a CH6-B18 · DH-10 (el salto del historial a otra clase) y la Regla de la clave
// ---------------------------------------------------------------------------------------------------

const CUATRO = [
  porNombre("Avisos"),
  porNombre("Dudas"),
  porNombre("Recursos (los temas del bloque)"),
  porNombre("Actividades (los temas)"),
]
const ENCABEZADO: Record<string, string> = {
  Avisos: "Avisos",
  Dudas: "Dudas",
  "Recursos (los temas del bloque)": "Recursos del docente",
  "Actividades (los temas)": "Actividades de aprendizaje",
}
const SECCION: Record<string, string> = {
  Avisos: "Avisos",
  Dudas: "Dudas",
  "Recursos (los temas del bloque)": "Recursos",
  "Actividades (los temas)": "Actividades de aprendizaje",
}
const RECURSO_DE_LA_FILA: Record<string, Recurso> = {
  Avisos: "publicaciones",
  Dudas: "dudas",
  "Recursos (los temas del bloque)": "recursos",
  "Actividades (los temas)": "trabajo",
}
const encabezadoDe = (lista: Lista) =>
  screen.getByRole("heading", { level: 2, name: ENCABEZADO[lista.nombre] ?? "" })
const enlaceDeLaSeccion = (lista: Lista) =>
  within(screen.getByRole("list", { name: "Secciones de la clase" })).getByRole("link", {
    name: SECCION[lista.nombre] ?? "",
  })

// La fila de A que recibe el foco en cada lista.
const filaDeA = (lista: Lista): HTMLElement => {
  const texto = screen.getByText(lista.fila(A))
  const fila = texto.closest<HTMLElement>(
    "[data-publicacion-id], [data-duda-id], [data-recurso-id], [data-elemento-id]",
  )
  if (fila === null) throw new Error(`Precondición: la fila de A en ${lista.nombre}`)
  return fila
}

// Monta la lista de B y salta a la de A (push): las dos quedan en caché y en el historial [B, A].
const deBaA = async (lista: Lista) => {
  servidor.rol = lista.rol
  const montado = await montar(lista.vista(B))
  await titulo(B)
  await waitFor(() => filaVisible(lista, B), ESPERA)
  await navegar(montado.router, lista.vista(A))
  await titulo(A)
  await waitFor(() => filaVisible(lista, A), ESPERA)
  await reposar(100)
  return montado
}

const saltarAB = async (router: Enrutador) => {
  await navegar(router, -1)
  await titulo(B)
}

// B en error con datos: su recarga falla con B fuera de la vista (refetchQueries de todo, en A).
const fallarBFueraDeLaVista = async (lista: Lista, cliente: QueryClient) => {
  fallarDosVeces(deLaLista(lista, false, B), error503)
  await act(async () => {
    await cliente
      .refetchQueries({ queryKey: lista.clave(B), exact: true, type: "all" })
      .catch(() => undefined)
  })
  await waitFor(() => expect(cliente.getQueryState(lista.clave(B))?.status).toBe("error"), ESPERA)
}

describe("CH6-B16 · DH-10 (a): el salto a otra clase cuenta como pulsar la sección y no mueve el foco", () => {
  it.each(conNombre(CUATRO))(
    "CH6-B16 (a) (%s): B sana y fresca: el salto no pide la lista de B",
    async (_nombre, lista) => {
      const { router } = await deBaA(lista)
      const antes = contar(deLaLista(lista, null, B))
      await saltarAB(router)
      await reposar(300)
      expect(contar(deLaLista(lista, null, B))).toBe(antes)
    },
    20_000,
  )

  it.each(conNombre(CUATRO))(
    "CH6-B16 (b) (%s): B marcada vieja: el salto la pide una vez",
    async (_nombre, lista) => {
      const { router, cliente } = await deBaA(lista)
      await act(async () => {
        await cliente.invalidateQueries({
          queryKey: lista.clave(B),
          exact: true,
          refetchType: "none",
        })
      })
      const antes = contar(deLaLista(lista, null, B))
      await saltarAB(router)
      await waitFor(() => expect(contar(deLaLista(lista, null, B))).toBe(antes + 1), ESPERA)
      await reposar(300)
      expect(contar(deLaLista(lista, null, B))).toBe(antes + 1)
    },
    20_000,
  )

  it.each(conNombre(CUATRO))(
    "CH6-B16 (c) (%s, falló estando a la vista): el salto pide una vez, la del observador, desde la primera página, y el error de B desaparece al responder bien",
    async (_nombre, lista) => {
      const { router, cliente } = await deBaA(lista)
      await saltarAB(router)
      await waitFor(() => filaVisible(lista, B), ESPERA)
      fallarDosVeces(deLaLista(lista, false, B), error503)
      await act(async () => {
        await cliente
          .refetchQueries({ queryKey: lista.clave(B), exact: true })
          .catch(() => undefined)
      })
      await waitFor(
        () => expect(cliente.getQueryState(lista.clave(B))?.status).toBe("error"),
        ESPERA,
      )
      await navegar(router, 1)
      await titulo(A)
      await reposar(100)
      const antes = contar(deLaLista(lista, null, B))
      await saltarAB(router)
      await esperarSana(lista, B)
      await reposar(300)
      const nuevas = llamadas.filter(deLaLista(lista, null, B)).slice(antes)
      expect(nuevas).toHaveLength(1)
      expect(nuevas[0]?.url.searchParams.has("cursor")).toBe(false)
    },
    20_000,
  )

  it.each(conNombre(CUATRO))(
    "CH6-B16 (c) (%s, falló fuera de la vista): el salto pide una vez y el error de B desaparece al responder bien",
    async (_nombre, lista) => {
      const { router, cliente } = await deBaA(lista)
      await fallarBFueraDeLaVista(lista, cliente)
      const antes = contar(deLaLista(lista, null, B))
      await saltarAB(router)
      await esperarSana(lista, B)
      await reposar(300)
      expect(contar(deLaLista(lista, null, B))).toBe(antes + 1)
    },
    20_000,
  )

  it("CH6-B16 (c) (Avisos, N-05: la clave de useListaConservadaTrasLaPagina): A con su lista conservada tras un «Ver más» fallido y B en error por una recarga con el mismo contador de errores: al saltar, B muestra su MensajeError mientras vuela su renovación (no conserva la marca de A)", async () => {
    const lista = porNombre("Avisos")
    const { router, cliente } = await deBaA(lista)
    await saltarAB(router)
    await waitFor(() => filaVisible(lista, B), ESPERA)
    fallarDosVeces(deLaLista(lista, false, B), error503)
    await act(async () => {
      await cliente.refetchQueries({ queryKey: lista.clave(B), exact: true }).catch(() => undefined)
    })
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0), ESPERA)
    const contadorDeB = cliente.getQueryCache().find({ queryKey: lista.clave(B), exact: true })
      ?.state.errorUpdateCount
    await navegar(router, 1)
    await titulo(A)
    await waitFor(() => filaVisible(lista, A), ESPERA)
    fallarDosVeces(deLaLista(lista, true, A), error500)
    fireEvent.click(await buscarBoton("Ver más avisos"))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    const contadorDeA = cliente.getQueryCache().find({ queryKey: lista.clave(A), exact: true })
      ?.state.errorUpdateCount
    expect(contadorDeA).toBe(contadorDeB)
    expect(screen.queryByRole("alert")).toBeNull()
    const recarga = retenida()
    interceptarUnaVez(deLaLista(lista, false, B), recarga.respuesta)
    const antes = contar(deLaLista(lista, false, B))
    await saltarAB(router)
    await waitFor(() => expect(contar(deLaLista(lista, false, B))).toBe(antes + 1), ESPERA)
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0)
    expect(screen.queryByText(lista.fila(B))).toBeNull()
    await recarga.soltar(() =>
      responder(llamadas.filter(deLaLista(lista, false, B)).at(-1) as Llamada),
    )
    await esperarSana(lista, B)
  }, 20_000)

  it.each(conNombre(CUATRO))(
    "CH6-B16 (e) (%s): B en error y pidiendo al llegar (la petición retenida): el salto no pide otra y la retenida no se cancela (su respuesta se aplica)",
    async (_nombre, lista) => {
      const { router, cliente } = await deBaA(lista)
      await fallarBFueraDeLaVista(lista, cliente)
      const recarga = retenida()
      interceptarUnaVez(deLaLista(lista, false, B), recarga.respuesta)
      act(() => {
        void cliente.refetchQueries({ queryKey: lista.clave(B), exact: true, type: "all" })
      })
      await waitFor(
        () => expect(cliente.getQueryState(lista.clave(B))?.fetchStatus).toBe("fetching"),
        ESPERA,
      )
      const antes = contar(deLaLista(lista, null, B))
      await saltarAB(router)
      await reposar(300)
      expect(contar(deLaLista(lista, null, B))).toBe(antes)
      await recarga.soltar(() =>
        responder(llamadas.filter(deLaLista(lista, false, B)).at(-1) as Llamada),
      )
      await esperarSana(lista, B)
      expect(contar(deLaLista(lista, null, B))).toBe(antes)
    },
    20_000,
  )

  it.each(conNombre([porNombre("Avisos"), porNombre("Dudas")]))(
    "CH6-B16 (f) (%s): B con su lista conservada tras un «Ver más» fallido: el salto pide una vez; mientras vuela, la lista de B sigue con «Ver más» en espera, sin role=alert ni texto de error, y el foco no se mueve; al responder, sin aviso",
    async (_nombre, lista) => {
      const { router } = await deBaA(lista)
      await saltarAB(router)
      await waitFor(() => filaVisible(lista, B), ESPERA)
      fallarDosVeces(deLaLista(lista, true, B), error500)
      fireEvent.click(await buscarBoton(lista.verMas ?? ""))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      await waitFor(
        () =>
          expect(screen.getByRole("button", { name: lista.verMas ?? "" })).not.toHaveAttribute(
            "aria-busy",
            "true",
          ),
        ESPERA,
      )
      await navegar(router, 1)
      await titulo(A)
      const segmento = enlaceDeLaSeccion(lista)
      act(() => segmento.focus())
      const recarga = retenida()
      interceptarUnaVez(deLaLista(lista, false, B), recarga.respuesta)
      const antes = contar(deLaLista(lista, null, B))
      await saltarAB(router)
      await waitFor(() => expect(contar(deLaLista(lista, null, B))).toBe(antes + 1), ESPERA)
      filaVisible(lista, B)
      expect(screen.queryByRole("alert")).toBeNull()
      expect(screen.getByRole("button", { name: lista.verMas ?? "" })).toHaveAttribute(
        "aria-busy",
        "true",
      )
      expect(document.activeElement).toBe(segmento)
      await recarga.soltar(() =>
        responder(llamadas.filter(deLaLista(lista, false, B)).at(-1) as Llamada),
      )
      await esperarSana(lista, B)
      await reposar(200)
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(contar(deLaLista(lista, null, B))).toBe(antes + 1)
      expect(document.activeElement).toBe(segmento)
    },
    20_000,
  )

  // Foco en (b) y (c): desde una fila de A va al h2 de B y ahí sigue tras la respuesta (aunque traiga
  // otras filas); desde el control segmentado no se mueve.
  const estados = ["(b) marcada vieja", "(c) en error"] as const
  const prepararB = async (
    estado: (typeof estados)[number],
    lista: Lista,
    cliente: QueryClient,
  ) => {
    if (estado === "(b) marcada vieja") {
      await act(async () => {
        await cliente.invalidateQueries({
          queryKey: lista.clave(B),
          exact: true,
          refetchType: "none",
        })
      })
      return
    }
    await fallarBFueraDeLaVista(lista, cliente)
  }

  it.each(
    CUATRO.flatMap((lista) => estados.map((estado) => [lista.nombre, estado, lista] as const)),
  )(
    "CH6-B16 (foco, %s, %s): con el foco en una fila de A, tras el salto está en el h2 de la lista de B y sigue ahí después de la respuesta, también si trae otras filas",
    async (_nombre, estado, lista) => {
      const { router, cliente } = await deBaA(lista)
      await prepararB(estado, lista, cliente)
      const filaA = filaDeA(lista)
      const control = filaA.querySelector<HTMLElement>("button") ?? filaA
      act(() => control.focus())
      expect(document.activeElement).toBe(control)
      // La respuesta de B trae otras filas: la segunda ya no está.
      servidor.borradas.add(idDe(RECURSO_DE_LA_FILA[lista.nombre] ?? "trabajo", B, 2))
      const antes = contar(deLaLista(lista, null, B))
      await saltarAB(router)
      await waitFor(() => expect(document.activeElement).toBe(encabezadoDe(lista)), ESPERA)
      await waitFor(() => expect(contar(deLaLista(lista, null, B))).toBe(antes + 1), ESPERA)
      await esperarSana(lista, B)
      await reposar(300)
      expect(document.activeElement).toBe(encabezadoDe(lista))
    },
    20_000,
  )

  it.each(
    CUATRO.flatMap((lista) => estados.map((estado) => [lista.nombre, estado, lista] as const)),
  )(
    "CH6-B16 (foco, %s, %s): con el foco en el control segmentado, no se mueve ni con el salto ni con la respuesta",
    async (_nombre, estado, lista) => {
      const { router, cliente } = await deBaA(lista)
      await prepararB(estado, lista, cliente)
      const segmento = enlaceDeLaSeccion(lista)
      act(() => segmento.focus())
      const antes = contar(deLaLista(lista, null, B))
      await saltarAB(router)
      expect(document.activeElement).toBe(segmento)
      await waitFor(() => expect(contar(deLaLista(lista, null, B))).toBe(antes + 1), ESPERA)
      await esperarSana(lista, B)
      await reposar(300)
      expect(document.activeElement).toBe(segmento)
    },
    20_000,
  )

  describe("CH6-B16 (Avisos, N-01): el foco en «Ver más avisos» de A", () => {
    const lista = porNombre("Avisos")
    const conFocoEnVerMas = async () => {
      const montado = await deBaA(lista)
      await act(async () => {
        await montado.cliente.invalidateQueries({
          queryKey: lista.clave(B),
          exact: true,
          refetchType: "none",
        })
      })
      const verMas = await buscarBoton("Ver más avisos")
      act(() => verMas.focus())
      return { ...montado, verMas }
    }

    it("CH6-B16 (Avisos, N-01, B vieja y sin página siguiente al llegar): «Ver más avisos» desaparece en el salto y el foco va al h2 de Avisos, no a una publicación de B, y sigue ahí tras la renovación", async () => {
      servidor.borradas.add(idDe("publicaciones", B, 3))
      const { router, cliente } = await deBaA(lista)
      await act(async () => {
        await cliente.invalidateQueries({
          queryKey: lista.clave(B),
          exact: true,
          refetchType: "none",
        })
      })
      const verMas = await buscarBoton("Ver más avisos")
      act(() => verMas.focus())
      const antes = contar(deLaLista(lista, null, B))
      await saltarAB(router)
      await waitFor(() => expect(document.activeElement).toBe(encabezadoDe(lista)), ESPERA)
      await waitFor(() => expect(contar(deLaLista(lista, null, B))).toBe(antes + 1), ESPERA)
      await reposar(300)
      expect(document.activeElement).toBe(encabezadoDe(lista))
    }, 20_000)

    it("CH6-B16 (Avisos, N-01, B con página siguiente): tras el salto el foco está en «Ver más avisos» de B", async () => {
      const { router } = await conFocoEnVerMas()
      const recarga = retenida()
      interceptarUnaVez(deLaLista(lista, false, B), recarga.respuesta)
      await saltarAB(router)
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Ver más avisos" }))
      await recarga.soltar(() =>
        responder(llamadas.filter(deLaLista(lista, false, B)).at(-1) as Llamada),
      )
      await reposar(200)
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Ver más avisos" }))
    }, 20_000)

    it("CH6-B16 (Avisos, N-01, la renovación llega sin página siguiente ni filas nuevas): «Ver más avisos» desaparece y el foco va al h2 de Avisos", async () => {
      const { router } = await conFocoEnVerMas()
      servidor.borradas.add(idDe("publicaciones", B, 3))
      await saltarAB(router)
      await waitFor(
        () => expect(screen.queryByRole("button", { name: "Ver más avisos" })).toBeNull(),
        ESPERA,
      )
      await waitFor(() => expect(document.activeElement).toBe(encabezadoDe(lista)), ESPERA)
    }, 20_000)

    it("CH6-B16 (Avisos, N-01, la renovación trae filas nuevas): el foco va a la primera fila nueva de B, nunca a una de A ni a <body>", async () => {
      const { router } = await conFocoEnVerMas()
      const recarga = retenida()
      interceptarUnaVez(deLaLista(lista, false, B), recarga.respuesta)
      await saltarAB(router)
      const nueva = uuid("5e5e3c4d", 9)
      await recarga.soltar(() =>
        respuestaJson(200, {
          publicaciones: [
            {
              ...fila("publicaciones", B, idDe("publicaciones", B, 1)),
              id: nueva,
              texto: "Aviso nuevo de Geografía",
            },
            fila("publicaciones", B, idDe("publicaciones", B, 1)),
          ],
          siguienteCursor: null,
        }),
      )
      await waitFor(
        () => expect(screen.queryByRole("button", { name: "Ver más avisos" })).toBeNull(),
        ESPERA,
      )
      await waitFor(
        () =>
          expect(document.activeElement).toBe(
            screen.getByText("Aviso nuevo de Geografía").closest("[data-publicacion-id]"),
          ),
        ESPERA,
      )
    }, 20_000)
  })
})

describe("Corrección M-01 (d) y M-02 · el salto a B con la frase del cursor y el foco en el estado (f)", () => {
  it.each(conNombre([porNombre("Avisos"), porNombre("Dudas")]))(
    "CH6-B16 (%s, el 400 del cursor en B): B con la frase del cursor (páginas cargadas) y el salto a B: se pide una vez desde la primera página, sin el cursor vencido, y la frase desaparece sin aviso",
    async (_nombre, lista) => {
      const { router } = await deBaA(lista)
      await saltarAB(router)
      await waitFor(() => filaVisible(lista, B), ESPERA)
      fallarDosVeces(deLaLista(lista, true, B), cursorVencido)
      fireEvent.click(await buscarBoton(lista.verMas ?? ""))
      await waitFor(
        () => expect(screen.getByText(fraseDelCursor(lista))).toBeInTheDocument(),
        ESPERA,
      )
      await navegar(router, 1)
      await titulo(A)
      await waitFor(() => filaVisible(lista, A), ESPERA)
      const antes = contar(deLaLista(lista, null, B))
      await saltarAB(router)
      await cumpleLaFraseDelCursor(lista, antes, B)
    },
    20_000,
  )

  // B en el estado (f): su lista quedó conservada tras un «Ver más» fallido (un aviso). Después se salta a
  // A y, ahí, se pone el foco antes del salto de regreso a B.
  const conBConservada = async (lista: Lista) => {
    const montado = await deBaA(lista)
    await saltarAB(montado.router)
    await waitFor(() => filaVisible(lista, B), ESPERA)
    fallarDosVeces(deLaLista(lista, true, B), error500)
    fireEvent.click(await buscarBoton(lista.verMas ?? ""))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await waitFor(
      () =>
        expect(screen.getByRole("button", { name: lista.verMas ?? "" })).not.toHaveAttribute(
          "aria-busy",
          "true",
        ),
      ESPERA,
    )
    await navegar(montado.router, 1)
    await titulo(A)
    await waitFor(() => filaVisible(lista, A), ESPERA)
    return montado
  }

  it.each(conNombre([porNombre("Avisos"), porNombre("Dudas")]))(
    "CH6-B16 (f) (%s, foco en una fila de A): con B conservada, tras el salto el foco está en el h2 de la lista de B, mientras vuela la renovación y después de la respuesta; nunca en <body> ni en una fila de A",
    async (_nombre, lista) => {
      const { router } = await conBConservada(lista)
      const filaA = filaDeA(lista)
      const control = filaA.querySelector<HTMLElement>("button") ?? filaA
      act(() => control.focus())
      expect(document.activeElement).toBe(control)
      const recarga = retenida()
      interceptarUnaVez(deLaLista(lista, false, B), recarga.respuesta)
      const antes = contar(deLaLista(lista, null, B))
      await saltarAB(router)
      await waitFor(() => expect(contar(deLaLista(lista, null, B))).toBe(antes + 1), ESPERA)
      await waitFor(() => expect(document.activeElement).toBe(encabezadoDe(lista)), ESPERA)
      filaVisible(lista, B)
      expect(screen.queryByRole("alert")).toBeNull()
      await recarga.soltar(() =>
        responder(llamadas.filter(deLaLista(lista, false, B)).at(-1) as Llamada),
      )
      await esperarSana(lista, B)
      await reposar(200)
      expect(document.activeElement).toBe(encabezadoDe(lista))
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
    20_000,
  )

  it("CH6-B16 (c) (Avisos, foco en «Ver más avisos» de A): B en error fuera de la vista (su MensajeError, sin «Ver más»): tras el salto el foco va al h2 de Avisos, no a una publicación de B ni a <body>, y ahí sigue después de la respuesta", async () => {
    const lista = porNombre("Avisos")
    const { router, cliente } = await deBaA(lista)
    await fallarBFueraDeLaVista(lista, cliente)
    const verMasA = await buscarBoton("Ver más avisos")
    act(() => verMasA.focus())
    const recarga = retenida()
    interceptarUnaVez(deLaLista(lista, false, B), recarga.respuesta)
    const antes = contar(deLaLista(lista, null, B))
    await saltarAB(router)
    await waitFor(() => expect(contar(deLaLista(lista, null, B))).toBe(antes + 1), ESPERA)
    await waitFor(() => expect(document.activeElement).toBe(encabezadoDe(lista)), ESPERA)
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0)
    await recarga.soltar(() =>
      responder(llamadas.filter(deLaLista(lista, false, B)).at(-1) as Llamada),
    )
    await esperarSana(lista, B)
    await reposar(200)
    expect(document.activeElement).toBe(encabezadoDe(lista))
  }, 20_000)

  it("CH6-B16 (f) (Avisos, foco en «Ver más avisos» de A): con B conservada, tras el salto el foco está en «Ver más avisos» de B, en espera mientras vuela la renovación, y ahí sigue después de la respuesta", async () => {
    const lista = porNombre("Avisos")
    const { router } = await conBConservada(lista)
    const verMasA = await buscarBoton("Ver más avisos")
    act(() => verMasA.focus())
    const recarga = retenida()
    interceptarUnaVez(deLaLista(lista, false, B), recarga.respuesta)
    const antes = contar(deLaLista(lista, null, B))
    await saltarAB(router)
    await waitFor(() => expect(contar(deLaLista(lista, null, B))).toBe(antes + 1), ESPERA)
    const verMasB = screen.getByRole("button", { name: "Ver más avisos" })
    expect(verMasB).toHaveAttribute("aria-busy", "true")
    expect(document.activeElement).toBe(verMasB)
    expect(screen.queryByRole("alert")).toBeNull()
    await recarga.soltar(() =>
      responder(llamadas.filter(deLaLista(lista, false, B)).at(-1) as Llamada),
    )
    await waitFor(
      () =>
        expect(screen.getByRole("button", { name: "Ver más avisos" })).not.toHaveAttribute(
          "aria-busy",
          "true",
        ),
      ESPERA,
    )
    await reposar(200)
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Ver más avisos" }))
    expect(document.activeElement).not.toBe(document.body)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  }, 20_000)
})

describe("CH6-B17 · DH-10 (b): si la renovación falla, el aviso es el de B", () => {
  it.each(
    conNombre([porNombre("Recursos (los temas del bloque)"), porNombre("Actividades (los temas)")]),
  )(
    "CH6-B17 (%s): B falló fuera de la vista y su renovación responde 503: un solo «No pudimos actualizar…», después del salto; nada al llegar; la lista de B se queda y el foco no se mueve",
    async (_nombre, lista) => {
      const { router, cliente } = await deBaA(lista)
      await fallarBFueraDeLaVista(lista, cliente)
      const segmento = enlaceDeLaSeccion(lista)
      act(() => segmento.focus())
      const recarga = retenida()
      interceptarUnaVez(deLaLista(lista, false, B), recarga.respuesta)
      interceptarUnaVez(deLaLista(lista, false, B), error503)
      await saltarAB(router)
      await reposar(100)
      expect(aviso.error).not.toHaveBeenCalled()
      filaVisible(lista, B)
      await recarga.soltar(error503)
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      expect(String(aviso.error.mock.calls[0]?.[0])).toMatch(/^No pudimos actualizar/)
      await reposar(300)
      expect(aviso.error).toHaveBeenCalledTimes(1)
      filaVisible(lista, B)
      expect(document.activeElement).toBe(segmento)
    },
    20_000,
  )

  it.each(conNombre([porNombre("Avisos"), porNombre("Dudas")]))(
    "CH6-B17 (%s): B falló fuera de la vista y su renovación también falla: la lista de B sigue reemplazada por su MensajeError y no sale ningún aviso",
    async (_nombre, lista) => {
      const { router, cliente } = await deBaA(lista)
      await fallarBFueraDeLaVista(lista, cliente)
      fallarDosVeces(deLaLista(lista, false, B), error503)
      await saltarAB(router)
      await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0), ESPERA)
      await waitFor(
        () => expect(contar(deLaLista(lista, false, B))).toBeGreaterThanOrEqual(4),
        ESPERA,
      )
      await reposar(1500)
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0)
      expect(aviso.error).not.toHaveBeenCalled()
    },
    20_000,
  )

  it.each(conNombre(CUATRO))(
    "CH6-B17 (%s, la renovación de A en vuelo): A en error y pulsada su sección; saltar a B y que la renovación de A falle ya en B: ningún aviso ni mensaje en B; al volver a A, ningún aviso de ese fallo y la lista de A se pide una vez",
    async (_nombre, lista) => {
      const { router, cliente } = await deBaA(lista)
      fallarDosVeces(deLaLista(lista, false, A), error503)
      await act(async () => {
        await cliente
          .refetchQueries({ queryKey: lista.clave(A), exact: true })
          .catch(() => undefined)
      })
      await waitFor(
        () => expect(cliente.getQueryState(lista.clave(A))?.status).toBe("error"),
        ESPERA,
      )
      const avisos = aviso.error.mock.calls.length
      const recarga = retenida()
      interceptarUnaVez(deLaLista(lista, false, A), recarga.respuesta)
      await navegar(router, lista.vista(A))
      await waitFor(
        () => expect(cliente.getQueryState(lista.clave(A))?.fetchStatus).toBe("fetching"),
        ESPERA,
      )
      await navegar(router, -2)
      await titulo(B)
      await recarga.soltar(error503)
      await reposar(300)
      expect(aviso.error).toHaveBeenCalledTimes(avisos)
      expect(screen.queryByRole("alert")).toBeNull()
      filaVisible(lista, B)
      const antes = contar(deLaLista(lista, null, A))
      await navegar(router, 2)
      await titulo(A)
      await esperarSana(lista, A)
      await reposar(300)
      expect(contar(deLaLista(lista, null, A))).toBe(antes + 1)
      expect(aviso.error).toHaveBeenCalledTimes(avisos)
    },
    20_000,
  )
})

describe("CH6-B18 · la Regla de la clave", () => {
  it.each(conNombre([porNombre("Avisos"), porNombre("Dudas")]))(
    "CH6-B18 (a) (%s): la página siguiente de A falla y avisa una vez; salto a B y regreso a A: ningún aviso más y, mientras vuela la recarga de A, su lista sigue sin role=alert; un fallo nuevo en A avisa una vez",
    async (_nombre, lista) => {
      const { router } = await deBaA(lista)
      fallarDosVeces(deLaLista(lista, true, A), error500)
      fireEvent.click(await buscarBoton(lista.verMas ?? ""))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      await waitFor(
        () =>
          expect(screen.getByRole("button", { name: lista.verMas ?? "" })).not.toHaveAttribute(
            "aria-busy",
            "true",
          ),
        ESPERA,
      )
      await saltarAB(router)
      await waitFor(() => filaVisible(lista, B), ESPERA)
      const recarga = retenida()
      interceptarUnaVez(deLaLista(lista, false, A), recarga.respuesta)
      await navegar(router, 1)
      await titulo(A)
      await waitFor(() => expect(contar(deLaLista(lista, false, A))).toBeGreaterThan(1), ESPERA)
      filaVisible(lista, A)
      expect(screen.queryByRole("alert")).toBeNull()
      await recarga.soltar(() =>
        responder(llamadas.filter(deLaLista(lista, false, A)).at(-1) as Llamada),
      )
      await esperarSana(lista, A)
      await reposar(200)
      expect(aviso.error).toHaveBeenCalledTimes(1)
      fallarDosVeces(deLaLista(lista, true, A), error500)
      fireEvent.click(await buscarBoton(lista.verMas ?? ""))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
      await reposar(200)
      expect(aviso.error).toHaveBeenCalledTimes(2)
    },
    20_000,
  )

  it("CH6-B18 (b): Avisos de A en error (el 400 del cursor) y salto a B: la consulta de A queda isInvalidated y la de B no (regresión de la librería)", async () => {
    const lista = porNombre("Avisos")
    const { router, cliente } = await deBaA(lista)
    fallarDosVeces(deLaLista(lista, true, A), cursorVencido)
    fireEvent.click(await buscarBoton("Ver más avisos"))
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0), ESPERA)
    await saltarAB(router)
    await waitFor(() => filaVisible(lista, B), ESPERA)
    await reposar(100)
    expect(cliente.getQueryState(lista.clave(A))?.isInvalidated).toBe(true)
    expect(cliente.getQueryState(lista.clave(B))?.isInvalidated).toBe(false)
  }, 20_000)

  it("CH6-B18 (d): con los comentarios de una publicación de A abiertos y su 404 ya dicho por el bloque, saltar a B no renueva la lista de Avisos de B", async () => {
    const lista = porNombre("Avisos")
    const { router } = await deBaA(lista)
    servidor.borradas.add(`comentarios:${PUB(A)}`)
    await abrirComentarios()
    await waitFor(
      () => expect(screen.getByText("Esa publicación ya no existe.")).toBeInTheDocument(),
      ESPERA,
    )
    await reposar(300)
    const antes = contar(deLaLista(lista, null, B))
    await saltarAB(router)
    await waitFor(() => filaVisible(lista, B), ESPERA)
    await reposar(300)
    expect(contar(deLaLista(lista, null, B))).toBe(antes)
  }, 20_000)

  describe("CH6-B18 (c) · useRenovarSiLaPublicacionYaNoEsta con renderHook", () => {
    const NO_ENCONTRADA = new ApiError("PUBLICACION_NO_ENCONTRADA", "mensaje del servidor", 404)
    const envoltorio = (cliente: QueryClient) =>
      function Envoltorio({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
      }

    it("CH6-B18 (c): un rerender a otra clave (otra clase u otra publicación) con PUBLICACION_NO_ENCONTRADA y otro contador no invalida nada; un fallo nuevo después invalida una vez", () => {
      const cliente = nuevoCliente()
      const invalidar = vi.spyOn(cliente, "invalidateQueries")
      const { rerender } = renderHook(
        (props: { claseId: string; publicacionId: string; contador: number }) =>
          useRenovarSiLaPublicacionYaNoEsta(
            props.claseId,
            props.publicacionId,
            props.contador,
            NO_ENCONTRADA,
          ),
        {
          wrapper: envoltorio(cliente),
          initialProps: { claseId: A, publicacionId: PUB(A), contador: 0 },
        },
      )
      expect(invalidar).not.toHaveBeenCalled()
      rerender({ claseId: B, publicacionId: PUB(A), contador: 1 })
      expect(invalidar).not.toHaveBeenCalled()
      rerender({ claseId: B, publicacionId: PUB(B), contador: 2 })
      expect(invalidar).not.toHaveBeenCalled()
      rerender({ claseId: B, publicacionId: PUB(B), contador: 3 })
      const deAvisos = invalidar.mock.calls.filter(
        ([filtro]) => JSON.stringify(filtro?.queryKey) === JSON.stringify(clavePublicaciones(B)),
      )
      expect(deAvisos).toHaveLength(1)
    })
  })

  describe("CH6-B18 (e) · useListaConservadaTrasLaPagina con renderHook (Enmienda 5: la marca es de la consulta)", () => {
    const ERROR_503 = new ApiError("SERVICIO_OCUPADO", "El servicio está ocupado.", 503)
    const CURSOR = new ApiError("VALIDACION", "cursor: no es válido", 400)
    const CLAVE_A: QueryKey = clavePublicaciones(A)
    const CLAVE_B: QueryKey = clavePublicaciones(B)
    interface Props {
      queryKey: QueryKey
      haciaAdelante: boolean
      isError: boolean
      contador: number
      hora: number
      error: unknown
    }
    const envoltorio = (cliente: QueryClient) =>
      function Envoltorio({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
      }
    // La consulta existe en la caché del cliente antes de llamar al gancho, como en la vista (el gancho
    // de la lista la construye antes en el mismo componente).
    const conConsultas = (...claves: QueryKey[]) => {
      const cliente = nuevoCliente()
      for (const queryKey of claves) cliente.getQueryCache().build(cliente, { queryKey })
      for (const queryKey of claves) {
        if (cliente.getQueryCache().find({ queryKey, exact: true }) === undefined) {
          throw new Error("Precondición: la consulta está en la caché del cliente")
        }
      }
      return cliente
    }
    const montarGancho = (cliente: QueryClient, inicial: Props) =>
      renderHook(
        (p: Props) =>
          useListaConservadaTrasLaPagina(
            p.queryKey,
            p.haciaAdelante,
            p.isError,
            p.contador,
            p.hora,
            p.error,
          ),
        { initialProps: inicial, wrapper: envoltorio(cliente) },
      )
    const FALLO: Props = {
      queryKey: CLAVE_A,
      haciaAdelante: true,
      isError: true,
      contador: 1,
      hora: 1_000,
      error: ERROR_503,
    }
    const RECARGA: Props = { ...FALLO, haciaAdelante: false }

    it("CH6-B18 (e): con isFetchNextPageError y un 503 devuelve verdadero; sin la dirección y con el mismo par sigue en verdadero; con otra consulta y el mismo par, o con otro errorUpdateCount, falso", () => {
      const cliente = conConsultas(CLAVE_A, CLAVE_B)
      const { result, rerender } = montarGancho(cliente, FALLO)
      expect(result.current).toBe(true)
      rerender(RECARGA)
      expect(result.current).toBe(true)
      rerender({ ...RECARGA, queryKey: CLAVE_B })
      expect(result.current).toBe(false)
      rerender({ ...RECARGA, contador: 2, hora: 2_000 })
      expect(result.current).toBe(false)
    })

    it("CH6-B18 (e): con un 400 del cursor es falso desde el principio", () => {
      const cliente = conConsultas(CLAVE_A)
      const { result, rerender } = montarGancho(cliente, { ...FALLO, error: CURSOR })
      expect(result.current).toBe(false)
      rerender({ ...RECARGA, error: CURSOR })
      expect(result.current).toBe(false)
    })

    it("CH6-B18 (e): desmontar el gancho y montarlo otra vez sobre la misma consulta, sin la dirección y con el mismo par: verdadero (T-04 a nivel del gancho)", () => {
      const cliente = conConsultas(CLAVE_A)
      const primero = montarGancho(cliente, FALLO)
      expect(primero.result.current).toBe(true)
      primero.unmount()
      const segundo = montarGancho(cliente, RECARGA)
      expect(segundo.result.current).toBe(true)
    })

    it("CH6-B18 (e): otra consulta con el mismo par, sin haber fallado su página: falso (T-05 a nivel del gancho)", () => {
      const cliente = conConsultas(CLAVE_A, CLAVE_B)
      const deA = montarGancho(cliente, FALLO)
      expect(deA.result.current).toBe(true)
      const deB = montarGancho(cliente, { ...RECARGA, queryKey: CLAVE_B })
      expect(deB.result.current).toBe(false)
      deA.rerender(RECARGA)
      expect(deA.result.current).toBe(true)
    })

    it("CH6-B18 (e): dos ganchos montados a la vez sobre la misma consulta: los dos verdaderos", () => {
      const cliente = conConsultas(CLAVE_A)
      const primero = montarGancho(cliente, FALLO)
      const segundo = montarGancho(cliente, RECARGA)
      expect(primero.result.current).toBe(true)
      expect(segundo.result.current).toBe(true)
      primero.rerender(RECARGA)
      expect(primero.result.current).toBe(true)
    })

    it("CH6-B18 (e): con la marca tomada con el contador en 1, resetQueries de la consulta y después un error con el contador otra vez en 1 y otra hora: falso", async () => {
      const cliente = conConsultas(CLAVE_A)
      const { result, rerender } = montarGancho(cliente, FALLO)
      expect(result.current).toBe(true)
      await act(async () => {
        await cliente.resetQueries({ queryKey: CLAVE_A, exact: true })
      })
      expect(cliente.getQueryCache().find({ queryKey: CLAVE_A, exact: true })).toBeDefined()
      rerender({ ...RECARGA, contador: 1, hora: 5_000 })
      expect(result.current).toBe(false)
    })

    it("CH6-B18 (e): un QueryClient nuevo con la misma queryKey, el mismo par y el reloj fijo: falso (las marcas no pasan de un cliente a otro)", () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      vi.setSystemTime(new Date("2026-11-13T12:00:00.000Z"))
      try {
        const primero = conConsultas(CLAVE_A)
        const deUno = montarGancho(primero, FALLO)
        expect(deUno.result.current).toBe(true)
        const segundo = conConsultas(CLAVE_A)
        const deOtro = montarGancho(segundo, RECARGA)
        expect(deOtro.result.current).toBe(false)
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
