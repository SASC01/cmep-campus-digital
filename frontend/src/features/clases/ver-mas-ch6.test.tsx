import { QueryClient, QueryClientProvider, type QueryKey } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/services/apiClient"
import {
  CLAVE_CLASES_IMPARTIDAS,
  CLAVE_CLASES_INSCRITAS,
  clavePublicaciones,
} from "@/services/clasesService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveTrabajo } from "@/services/trabajoService"

import {
  claveAlumnos,
  claveComentarios,
  claveDudas,
  clavePersonas,
  claveRespuestas,
  TEXTOS_COMENTARIOS,
  TEXTOS_DUDAS,
  TEXTOS_MURO,
  TEXTOS_PANEL,
  TEXTOS_PUBLICACION,
  TEXTOS_RECURSOS,
  TEXTOS_RESPUESTAS,
  TEXTOS_TRABAJO,
} from "./data"
import { mensajeDeConsultaClases, mensajeDeErrorDeLista } from "./lib"

// CHORE-06b (§D-5, DH-02 a; CH6-B10 a CH6-B13): el fallo de la página siguiente en las 9 listas de
// features/clases. Router real (`rutas` de app/router) y un QueryClient con las defaultOptions de
// app/providers.tsx (retry: 1, refetchOnWindowFocus: false, staleTime: 30 s). La red se dobla con fetch y
// se cuentan las peticiones; lo que debe quedar en vuelo se retiene con una promesa que la prueba suelta.
// El servidor responde páginas de 2 filas (3 filas por lista), así que cada lista tiene «Ver más».

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
vi.mock("@/services/navegacion", () => navegacion)

type Rol = "estudiante" | "maestro"
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
const sinRed: Respuesta = () => Promise.reject(new TypeError("Failed to fetch"))
const cursorVencido: Respuesta = () => errorApi(400, "VALIDACION", "cursor: no es válido")
const ERROR_500 = new ApiError("ERROR_INTERNO", "mensaje del servidor", 500)
const ERROR_RED = new ApiError("SIN_CONEXION", "No pudimos conectar con el servidor.", 0)

interface Servidor {
  rol: Rol
  borradas: Set<string>
  refrescoFalla: boolean
}

type Interceptor = (llamada: Llamada) => Respuesta | undefined

let servidor: Servidor
let llamadas: Llamada[] = []
let interceptores: Interceptor[] = []

// Una respuesta propia para la próxima petición que cumpla la condición; después, la del doble.
const interceptarUnaVez = (cumple: (llamada: Llamada) => boolean, respuesta: Respuesta) => {
  const propio: Interceptor = (llamada) => {
    if (!cumple(llamada)) return undefined
    interceptores = interceptores.filter((otro) => otro !== propio)
    return respuesta
  }
  interceptores.push(propio)
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
  if (recurso === "alumnos") {
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
  if (recurso === "inscritas") {
    return { id, nombre: texto, maestro: { nombre: "Luis" }, maestros: [{ nombre: "Luis" }] }
  }
  return { id, nombre: texto, alumnos: n }
}

const paginaDe = (recurso: Recurso, claseId: string, url: URL, campo: string) => {
  const { pagina, siguiente } = paginar(idsDe(recurso, claseId), url)
  return { [campo]: pagina.map((id) => fila(recurso, claseId, id)), siguienteCursor: siguiente }
}

const responder = (llamada: Llamada): Response | Promise<Response> => {
  const { metodo, url } = llamada
  const ruta = url.pathname
  if (ruta === "/api/auth/refrescar") {
    if (servidor.refrescoFalla) return errorApi(401, "NO_AUTENTICADO")
    return respuestaJson(200, { tokenAcceso: "otra" })
  }
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
    const recurso: Recurso = ruta === "/api/clases/inscritas" ? "inscritas" : "impartidas"
    if (url.searchParams.get("limite") === "100") {
      return respuestaJson(200, {
        clases: idsDe(recurso, A).map((id) => fila(recurso, A, id)),
        total: 3,
        siguienteCursor: null,
      })
    }
    return respuestaJson(200, { ...paginaDe(recurso, A, url, "clases"), total: 3 })
  }
  if (ruta === "/api/clases/anteriores") {
    return respuestaJson(200, {
      clases: [],
      total: 0,
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
        archivadaEn: null,
      },
    })
  }
  if (sub === "codigo") return respuestaJson(200, { codigo: "ABCDEFG" })
  if (sub === "categorias") return respuestaJson(200, { categorias: [] })
  if (sub === "publicaciones" && subId === undefined && metodo === "GET") {
    return respuestaJson(200, paginaDe("publicaciones", claseId, url, "publicaciones"))
  }
  if (sub === "publicaciones" && subId !== undefined && detalle === "comentarios") {
    if (servidor.borradas.has(`comentarios:${subId}`)) {
      return errorApi(404, "PUBLICACION_NO_ENCONTRADA")
    }
    if (metodo === "POST") {
      return respuestaJson(201, {
        comentario: {
          id: uuid("6c6c3c4d", 99),
          texto: "Nuevo comentario",
          autor: FIRMA,
          creadoEn: CREADO_EN,
          propio: true,
          puedeBorrar: true,
        },
      })
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
  servidor = { rol: "maestro", borradas: new Set(), refrescoFalla: false }
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
  navegacion.irA.mockClear()
})

const montar = async (entrada: string) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [entrada] })
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
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

// ---------------------------------------------------------------------------------------------------
// Las 9 listas de §D-5
// ---------------------------------------------------------------------------------------------------

interface ListaDePaginas {
  nombre: string
  rol: Rol
  vista: string
  otra: string
  api: string
  recurso: Recurso
  abrir?: () => Promise<void>
  verMas: string
  encabezado: () => HTMLElement
  clave: QueryKey
  // Lo que pinta la lista cuando un error la reemplaza.
  frase: (error: unknown) => string
  inicio: boolean
  conSenal: boolean
}

const MAESTRO_A = `/maestro/clases/${A}`
const PUB_A1 = idDe("publicaciones", A, 1)
const DUDA_A1 = idDe("dudas", A, 1)
const abrirComentarios = async () => {
  fireEvent.click(await buscarBoton(TEXTOS_PUBLICACION.verComentarios(3)))
}
const abrirRespuestas = async () => {
  fireEvent.click(await buscarBoton(TEXTOS_DUDAS.verRespuestas(3)))
}
const h = (nivel: number, nombre: string | RegExp) => () =>
  screen.getByRole("heading", { level: nivel, name: nombre })

const LISTAS: readonly ListaDePaginas[] = [
  {
    nombre: "Avisos",
    rol: "maestro",
    vista: MAESTRO_A,
    otra: `${MAESTRO_A}/dudas`,
    api: `/api/clases/${A}/publicaciones`,
    recurso: "publicaciones",
    verMas: "Ver más avisos",
    encabezado: h(2, "Avisos"),
    clave: clavePublicaciones(A),
    frase: (error) => mensajeDeErrorDeLista(error, TEXTOS_MURO.cambioMientrasLoVeias),
    inicio: false,
    conSenal: false,
  },
  {
    nombre: "comentarios",
    rol: "maestro",
    vista: MAESTRO_A,
    otra: `${MAESTRO_A}/dudas`,
    api: `/api/clases/${A}/publicaciones/${PUB_A1}/comentarios`,
    recurso: "comentarios",
    abrir: abrirComentarios,
    verMas: TEXTOS_COMENTARIOS.verMas,
    encabezado: h(3, TEXTOS_COMENTARIOS.titulo),
    clave: claveComentarios(A, PUB_A1),
    frase: (error) => mensajeDeErrorDeLista(error, TEXTOS_COMENTARIOS.cambioMientrasLosVeias),
    inicio: false,
    conSenal: false,
  },
  {
    nombre: "Dudas",
    rol: "maestro",
    vista: `${MAESTRO_A}/dudas`,
    otra: MAESTRO_A,
    api: `/api/clases/${A}/dudas`,
    recurso: "dudas",
    verMas: TEXTOS_DUDAS.verMas,
    encabezado: h(2, TEXTOS_DUDAS.titulo),
    clave: claveDudas(A),
    frase: (error) => mensajeDeErrorDeLista(error, TEXTOS_DUDAS.cambioMientrasLasVeias),
    inicio: false,
    conSenal: false,
  },
  {
    nombre: "respuestas",
    rol: "maestro",
    vista: `${MAESTRO_A}/dudas`,
    otra: MAESTRO_A,
    api: `/api/clases/${A}/dudas/${DUDA_A1}/respuestas`,
    recurso: "respuestas",
    abrir: abrirRespuestas,
    verMas: "Ver más respuestas",
    encabezado: h(3, "Respuestas"),
    clave: claveRespuestas(A, DUDA_A1),
    frase: (error) => mensajeDeErrorDeLista(error, TEXTOS_RESPUESTAS.cambioMientrasLasVeias),
    inicio: false,
    conSenal: false,
  },
  {
    nombre: "un tema de Actividades",
    rol: "maestro",
    vista: `${MAESTRO_A}/trabajo`,
    otra: `${MAESTRO_A}/dudas`,
    api: `/api/clases/${A}/trabajo`,
    recurso: "trabajo",
    verMas: "Ver más de Unidad 1",
    encabezado: h(2, /^Unidad 1/),
    clave: claveTrabajo(A, TEMA(A)),
    frase: (error) => mensajeDeErrorDeLista(error, TEXTOS_TRABAJO.cambioMientrasLoVeias),
    inicio: false,
    conSenal: true,
  },
  {
    nombre: "Personas",
    rol: "estudiante",
    vista: `/estudiante/clases/${A}/personas`,
    otra: `/estudiante/clases/${A}/dudas`,
    api: `/api/clases/${A}/personas`,
    recurso: "personas",
    verMas: "Ver más alumnos",
    encabezado: h(2, "Alumnos"),
    clave: clavePersonas(A),
    frase: (error) => mensajeDeConsultaClases(error),
    inicio: false,
    conSenal: false,
  },
  {
    nombre: "el roster",
    rol: "maestro",
    vista: `${MAESTRO_A}/personas`,
    otra: `${MAESTRO_A}/dudas`,
    api: `/api/clases/${A}/alumnos`,
    recurso: "alumnos",
    verMas: "Ver más alumnos",
    encabezado: h(2, "Alumnos"),
    clave: claveAlumnos(A),
    frase: (error) => mensajeDeConsultaClases(error),
    inicio: false,
    conSenal: false,
  },
  {
    nombre: "inicio del estudiante",
    rol: "estudiante",
    vista: "/estudiante",
    otra: "/estudiante/clases-anteriores",
    api: "/api/clases/inscritas",
    recurso: "inscritas",
    verMas: TEXTOS_PANEL.verMas,
    encabezado: h(2, TEXTOS_PANEL.titulo),
    clave: CLAVE_CLASES_INSCRITAS,
    frase: (error) => mensajeDeErrorDeLista(error, TEXTOS_PANEL.cambioMientrasLasVeias),
    inicio: true,
    conSenal: false,
  },
  {
    nombre: "inicio del maestro",
    rol: "maestro",
    vista: "/maestro",
    otra: "/maestro/clases-archivadas",
    api: "/api/clases/impartidas",
    recurso: "impartidas",
    verMas: TEXTOS_PANEL.verMas,
    encabezado: h(2, TEXTOS_PANEL.titulo),
    clave: CLAVE_CLASES_IMPARTIDAS,
    frase: (error) => mensajeDeErrorDeLista(error, TEXTOS_PANEL.cambioMientrasLasVeias),
    inicio: true,
    conSenal: false,
  },
]

const SIN_SENAL = LISTAS.filter((lista) => !lista.conSenal)
const ACTIVIDADES = LISTAS.find((lista) => lista.conSenal)
const AVISOS_Y_DUDAS = LISTAS.filter((l) => l.nombre === "Avisos" || l.nombre === "Dudas")
const COMENTARIOS = LISTAS.find((lista) => lista.recurso === "comentarios")
const AVISOS = LISTAS.find((lista) => lista.recurso === "publicaciones")

const deLaLista =
  (lista: ListaDePaginas, conCursor: boolean | null) =>
  ({ metodo, url }: Llamada) =>
    metodo === "GET" &&
    url.pathname === lista.api &&
    url.searchParams.get("limite") !== "100" &&
    (conCursor === null || url.searchParams.has("cursor") === conCursor)

const entrar = async (lista: ListaDePaginas) => {
  servidor.rol = lista.rol
  const montado = await montar(lista.vista)
  await lista.abrir?.()
  const verMas = await buscarBoton(lista.verMas)
  return { ...montado, verMas }
}

const volverALaVista = async (router: Enrutador, lista: ListaDePaginas) => {
  await navegar(router, lista.vista)
  await lista.abrir?.()
}

// La lista sigue a la vista: «Ver más» con la primera fila a su lado y ningún MensajeError.
const listaALaVista = () => {
  const lista = LISTA_ACTUAL
  if (lista === undefined) throw new Error("Precondición: hay una lista en curso")
  const verMas = screen.getByRole("button", { name: lista.verMas })
  const contenedor = verMas.parentElement
  if (contenedor === null) throw new Error("Precondición: «Ver más» tiene contenedor")
  expect(within(contenedor).getAllByText(textoDe(lista.recurso, A, 1)).length).toBeGreaterThan(0)
  expect(screen.queryByRole("alert")).toBeNull()
  if (lista.inicio) expect(screen.queryByText(TEXTOS_PANEL.error)).toBeNull()
  return verMas
}
let LISTA_ACTUAL: ListaDePaginas | undefined

const fallarLaPagina = (lista: ListaDePaginas, respuesta: Respuesta) => {
  interceptarUnaVez(deLaLista(lista, true), respuesta)
  interceptarUnaVez(deLaLista(lista, true), respuesta)
}

// «Ver más» con el foco y su página que falla dos veces (retry: 1): un aviso y la lista se queda.
const paginaQueFalla = async (lista: ListaDePaginas, verMas: HTMLElement, respuesta = error500) => {
  LISTA_ACTUAL = lista
  fallarLaPagina(lista, respuesta)
  act(() => verMas.focus())
  fireEvent.click(verMas)
  await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
  await waitFor(
    () =>
      expect(screen.getByRole("button", { name: lista.verMas })).not.toHaveAttribute(
        "aria-busy",
        "true",
      ),
    ESPERA,
  )
}

// ---------------------------------------------------------------------------------------------------
// CH6-B10 · 5xx y red
// ---------------------------------------------------------------------------------------------------

describe("CH6-B10 · «Ver más» que falla por la red o el servidor", () => {
  const casos = LISTAS.flatMap((lista) => [
    [lista.nombre, "500", lista, error500, ERROR_500] as const,
    [lista.nombre, "sin red", lista, sinRed, ERROR_RED] as const,
  ])

  it.each(casos)(
    "CH6-B10 (%s, %s): salen las dos peticiones de la página y ninguna más, la lista se queda, un solo aviso con mensajeDeConsultaClases, «Ver más» sigue fuera de espera y con el foco; repetirlo pide la página con el mismo cursor y, si responde bien, llegan las filas sin otro aviso",
    async (_nombre, _clase, lista, respuesta, error) => {
      LISTA_ACTUAL = lista
      const { verMas } = await entrar(lista)
      await paginaQueFalla(lista, verMas, respuesta)
      await reposar(1500)
      expect(contar(deLaLista(lista, true))).toBe(2)
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(aviso.error.mock.calls[0]?.[0]).toBe(mensajeDeConsultaClases(error))
      const boton = listaALaVista()
      expect(boton).not.toHaveAttribute("aria-busy", "true")
      expect(document.activeElement).toBe(boton)

      const cursor = llamadas.filter(deLaLista(lista, true))[0]?.url.searchParams.get("cursor")
      fireEvent.click(boton)
      await waitFor(() => expect(contar(deLaLista(lista, true))).toBe(3), ESPERA)
      expect(llamadas.filter(deLaLista(lista, true))[2]?.url.searchParams.get("cursor")).toBe(
        cursor,
      )
      await waitFor(
        () => expect(screen.getAllByText(textoDe(lista.recurso, A, 3)).length).toBeGreaterThan(0),
        ESPERA,
      )
      await reposar(100)
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole("alert")).toBeNull()
    },
    20_000,
  )

  it.each(LISTAS.map((lista) => [lista.nombre, lista] as const))(
    "CH6-B10 (%s, pulsar la sección): mientras vuela la recarga que recupera la lista conservada, la lista sigue con «Ver más» en espera, sin role=alert ni texto de error y con el foco donde estaba; al responder bien, se renueva sin aviso",
    async (_nombre, lista) => {
      const { router, verMas } = await entrar(lista)
      await paginaQueFalla(lista, verMas)
      const recarga = retenida()
      interceptarUnaVez(deLaLista(lista, false), recarga.respuesta)
      const antes = contar(deLaLista(lista, false))
      await navegar(router, lista.vista)
      await waitFor(() => expect(contar(deLaLista(lista, false))).toBe(antes + 1), ESPERA)
      const boton = listaALaVista()
      expect(boton).toHaveAttribute("aria-busy", "true")
      expect(screen.queryByText(mensajeDeConsultaClases(ERROR_500))).toBeNull()
      expect(document.activeElement).toBe(boton)
      await recarga.soltar(() =>
        responder(llamadas.filter(deLaLista(lista, false)).at(-1) as Llamada),
      )
      await waitFor(
        () =>
          expect(screen.getByRole("button", { name: lista.verMas })).not.toHaveAttribute(
            "aria-busy",
            "true",
          ),
        ESPERA,
      )
      listaALaVista()
      await reposar(100)
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(contar(deLaLista(lista, false))).toBe(antes + 1)
    },
    20_000,
  )

  it.each(LISTAS.map((lista) => [lista.nombre, lista] as const))(
    "CH6-B10 (%s, volver de otra sección): mientras vuela la recarga del montaje, la lista conservada se ve con «Ver más» en espera y sin role=alert; al responder bien, se renueva sin aviso",
    async (_nombre, lista) => {
      const { router, verMas } = await entrar(lista)
      await paginaQueFalla(lista, verMas)
      await navegar(router, lista.otra)
      await waitFor(
        () => expect(screen.queryByRole("button", { name: lista.verMas })).toBeNull(),
        ESPERA,
      )
      const recarga = retenida()
      interceptarUnaVez(deLaLista(lista, false), recarga.respuesta)
      const antes = contar(deLaLista(lista, false))
      // En el tema de Actividades (useTrabajo consume signal) la página ya había fallado con la vista
      // montada, así que la consulta está en error y se pide al volver, como en las demás.
      await volverALaVista(router, lista)
      await waitFor(() => expect(contar(deLaLista(lista, false))).toBe(antes + 1), ESPERA)
      const boton = listaALaVista()
      expect(boton).toHaveAttribute("aria-busy", "true")
      // N-01 (verificación del manager): el foco donde lo dejó el montaje, y ahí sigue tras la respuesta.
      const focoDelMontaje = document.activeElement
      expect(focoDelMontaje).not.toBeNull()
      await recarga.soltar(() =>
        responder(llamadas.filter(deLaLista(lista, false)).at(-1) as Llamada),
      )
      await reposar(100)
      expect(document.activeElement).toBe(focoDelMontaje)
      await waitFor(
        () =>
          expect(screen.getByRole("button", { name: lista.verMas })).not.toHaveAttribute(
            "aria-busy",
            "true",
          ),
        ESPERA,
      )
      listaALaVista()
      await reposar(100)
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
    20_000,
  )

  it.each(LISTAS.map((lista) => [lista.nombre, lista] as const))(
    "CH6-B10 (%s, la recuperación falla): la recarga que recupera la lista conservada falla, la lista se reemplaza por su MensajeError sin aviso y el foco, que estaba en «Ver más», va al encabezado de la lista",
    async (_nombre, lista) => {
      const { router, verMas } = await entrar(lista)
      await paginaQueFalla(lista, verMas)
      const recarga = retenida()
      interceptarUnaVez(deLaLista(lista, false), recarga.respuesta)
      interceptarUnaVez(deLaLista(lista, false), error503)
      await navegar(router, lista.vista)
      await waitFor(
        () =>
          expect(screen.getByRole("button", { name: lista.verMas })).toHaveAttribute(
            "aria-busy",
            "true",
          ),
        ESPERA,
      )
      expect(screen.queryByRole("alert")).toBeNull()
      await recarga.soltar(error503)
      await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1), ESPERA)
      expect(screen.getByRole("alert")).toHaveTextContent(
        lista.frase(new ApiError("SERVICIO_OCUPADO", "El servicio está ocupado.", 503)),
      )
      expect(screen.queryByRole("button", { name: lista.verMas })).toBeNull()
      await reposar(100)
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(document.activeElement).toBe(lista.encabezado())
    },
    20_000,
  )

  it("CH6-B10 (Avisos, invalidación por comentar): mientras vuela la recarga que el comentario pide, la lista de Avisos conservada sigue con «Ver más avisos» en espera y sin role=alert; al responder bien, sin otro aviso", async () => {
    if (AVISOS === undefined) throw new Error("Precondición: la lista de Avisos")
    const { verMas } = await entrar(AVISOS)
    await paginaQueFalla(AVISOS, verMas)
    await abrirComentarios()
    await screen.findByText(textoDe("comentarios", A, 1), {}, ESPERA)
    const recarga = retenida()
    interceptarUnaVez(deLaLista(AVISOS, false), recarga.respuesta)
    const antes = contar(deLaLista(AVISOS, false))
    fireEvent.change(await screen.findByLabelText(TEXTOS_COMENTARIOS.campo, {}, ESPERA), {
      target: { value: "Un comentario" },
    })
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_COMENTARIOS.comentar }))
    await waitFor(() => expect(contar(deLaLista(AVISOS, false))).toBe(antes + 1), ESPERA)
    LISTA_ACTUAL = AVISOS
    const boton = screen.getByRole("button", { name: AVISOS.verMas })
    expect(boton).toHaveAttribute("aria-busy", "true")
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getAllByText(textoDe("publicaciones", A, 1)).length).toBeGreaterThan(0)
    await recarga.soltar(() =>
      responder(llamadas.filter(deLaLista(AVISOS, false)).at(-1) as Llamada),
    )
    await waitFor(
      () =>
        expect(screen.getByRole("button", { name: AVISOS.verMas })).not.toHaveAttribute(
          "aria-busy",
          "true",
        ),
      ESPERA,
    )
    expect(screen.queryByRole("alert")).toBeNull()
    await reposar(100)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  }, 20_000)

  it.each(AVISOS_Y_DUDAS.map((lista) => [lista.nombre, lista] as const))(
    "CH6-B10 (%s, foco en una fila): con el foco en una fila de la lista conservada, una invalidación que responde 503 reemplaza la lista y el foco va al h2, nunca a <body>",
    async (_nombre, lista) => {
      const { cliente, verMas } = await entrar(lista)
      await paginaQueFalla(lista, verMas)
      const control =
        lista.recurso === "publicaciones"
          ? within(
              screen
                .getByText(textoDe("publicaciones", A, 1))
                .closest<HTMLElement>("[data-publicacion-id]") ?? document.body,
            ).getByRole("button", { name: TEXTOS_PUBLICACION.borrarPublicacion })
          : within(
              screen.getByText(textoDe("dudas", A, 1)).closest<HTMLElement>("[data-duda-id]") ??
                document.body,
            ).getByRole("button", { name: /Borrar duda/ })
      act(() => control.focus())
      expect(document.activeElement).toBe(control)
      interceptarUnaVez(deLaLista(lista, false), error503)
      interceptarUnaVez(deLaLista(lista, false), error503)
      await act(async () => {
        await cliente
          .invalidateQueries({ queryKey: lista.clave, exact: true })
          .catch(() => undefined)
      })
      await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1), ESPERA)
      await waitFor(() => expect(document.activeElement).toBe(lista.encabezado()), ESPERA)
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
    20_000,
  )
})

// ---------------------------------------------------------------------------------------------------
// CH6-B11 · lo que sigue reemplazando
// ---------------------------------------------------------------------------------------------------

describe("CH6-B11 · lo que sigue reemplazando la lista", () => {
  const casos = LISTAS.flatMap((lista) => {
    const propios: (readonly [string, string, ListaDePaginas, Respuesta, ApiError])[] = [
      [
        lista.nombre,
        "400 del cursor",
        lista,
        cursorVencido,
        new ApiError("VALIDACION", "cursor: no es válido", 400),
      ],
      [
        lista.nombre,
        "400 VALIDACION de otro campo",
        lista,
        () => errorApi(400, "VALIDACION", "limite: no es válido"),
        new ApiError("VALIDACION", "limite: no es válido", 400),
      ],
      [
        lista.nombre,
        "429",
        lista,
        () => errorApi(429, "DEMASIADAS_SOLICITUDES"),
        new ApiError("DEMASIADAS_SOLICITUDES", "mensaje del servidor", 429),
      ],
    ]
    if (!lista.inicio) {
      propios.push([
        lista.nombre,
        "403 SIN_ACCESO_A_LA_CLASE",
        lista,
        () => errorApi(403, "SIN_ACCESO_A_LA_CLASE"),
        new ApiError("SIN_ACCESO_A_LA_CLASE", "mensaje del servidor", 403),
      ])
    }
    if (lista.recurso === "comentarios") {
      propios.push([
        lista.nombre,
        "404 PUBLICACION_NO_ENCONTRADA",
        lista,
        () => errorApi(404, "PUBLICACION_NO_ENCONTRADA"),
        new ApiError("PUBLICACION_NO_ENCONTRADA", "mensaje del servidor", 404),
      ])
    }
    if (lista.recurso === "respuestas") {
      propios.push([
        lista.nombre,
        "404 DUDA_NO_ENCONTRADA",
        lista,
        () => errorApi(404, "DUDA_NO_ENCONTRADA"),
        new ApiError("DUDA_NO_ENCONTRADA", "mensaje del servidor", 404),
      ])
    }
    return propios
  })

  it.each(casos)(
    "CH6-B11 (%s, %s): la página que falla reemplaza la lista por su frase, sin aviso, y «Ver más» ya no está",
    async (_nombre, _clase, lista, respuesta, error) => {
      LISTA_ACTUAL = lista
      const { verMas } = await entrar(lista)
      fallarLaPagina(lista, respuesta)
      fireEvent.click(verMas)
      await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0), ESPERA)
      expect(screen.getAllByText(lista.frase(error)).length).toBeGreaterThan(0)
      await waitFor(
        () => expect(screen.queryByRole("button", { name: lista.verMas })).toBeNull(),
        ESPERA,
      )
      await reposar(1200)
      expect(aviso.error).not.toHaveBeenCalled()
    },
    20_000,
  )

  it.each(LISTAS.map((lista) => [lista.nombre, lista] as const))(
    "CH6-B11 (%s, 401 sin refresco): ningún aviso e irA a /login",
    async (_nombre, lista) => {
      const { verMas } = await entrar(lista)
      servidor.refrescoFalla = true
      fallarLaPagina(lista, () => errorApi(401, "NO_AUTENTICADO"))
      fireEvent.click(verMas)
      await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/login"), ESPERA)
      await reposar(1500)
      expect(aviso.error).not.toHaveBeenCalled()
    },
    20_000,
  )
})

// ---------------------------------------------------------------------------------------------------
// CH6-B12 · estados vecinos
// ---------------------------------------------------------------------------------------------------

describe("CH6-B12 · estados vecinos del fallo de la página", () => {
  it.each(LISTAS.map((lista) => [lista.nombre, lista] as const))(
    "CH6-B12 (a) (%s): dos fallos seguidos de la página dan dos avisos, uno por fallo, y la lista sigue",
    async (_nombre, lista) => {
      const { verMas } = await entrar(lista)
      await paginaQueFalla(lista, verMas)
      fallarLaPagina(lista, error500)
      fireEvent.click(screen.getByRole("button", { name: lista.verMas }))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
      await waitFor(
        () =>
          expect(screen.getByRole("button", { name: lista.verMas })).not.toHaveAttribute(
            "aria-busy",
            "true",
          ),
        ESPERA,
      )
      listaALaVista()
      expect(contar(deLaLista(lista, true))).toBe(4)
    },
    20_000,
  )

  it.each(LISTAS.map((lista) => [lista.nombre, lista] as const))(
    "CH6-B12 (b) (%s): con la página en vuelo, una recarga de fondo que gana no deja aviso y «Ver más» pide después con el cursor renovado",
    async (_nombre, lista) => {
      const { cliente, verMas } = await entrar(lista)
      const pagina = retenida()
      interceptarUnaVez(deLaLista(lista, true), pagina.respuesta)
      fireEvent.click(verMas)
      await waitFor(() => expect(contar(deLaLista(lista, true))).toBe(1), ESPERA)
      await act(async () => {
        void cliente.invalidateQueries({ queryKey: lista.clave, exact: true })
        await Promise.resolve()
      })
      await waitFor(() => expect(contar(deLaLista(lista, false))).toBe(2), ESPERA)
      await pagina.soltar(error500)
      const renovado = await buscarBoton(lista.verMas)
      await waitFor(() => expect(renovado).not.toHaveAttribute("aria-busy", "true"), ESPERA)
      await reposar(100)
      expect(aviso.error).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole("button", { name: lista.verMas }))
      await waitFor(() => expect(contar(deLaLista(lista, true))).toBe(2), ESPERA)
      expect(llamadas.filter(deLaLista(lista, true))[1]?.url.searchParams.get("cursor")).toBe(
        idDe(lista.recurso, A, 2),
      )
    },
    20_000,
  )

  it.each(SIN_SENAL.map((lista) => [lista.nombre, lista] as const))(
    "CH6-B12 (c) (%s): con la página en vuelo, salir a otra sección antes de que falle no da aviso; al volver, la lista se pide una vez desde la primera página, sin aviso, y se ve mientras vuela",
    async (_nombre, lista) => {
      const { router, cliente, verMas } = await entrar(lista)
      const pagina = retenida()
      interceptarUnaVez(deLaLista(lista, true), pagina.respuesta)
      fireEvent.click(verMas)
      await waitFor(() => expect(contar(deLaLista(lista, true))).toBe(1), ESPERA)
      await navegar(router, lista.otra)
      await waitFor(
        () => expect(screen.queryByRole("button", { name: lista.verMas })).toBeNull(),
        ESPERA,
      )
      // Sin observadores, la librería cancela el reintento (cancelRetry): el fallo llega con una sola
      // petición de la página y deja la consulta en error, con la vista desmontada.
      await pagina.soltar(error500)
      await waitFor(() => expect(cliente.getQueryState(lista.clave)?.status).toBe("error"), ESPERA)
      await reposar(300)
      expect(contar(deLaLista(lista, true))).toBe(1)
      expect(aviso.error).not.toHaveBeenCalled()
      const recarga = retenida()
      interceptarUnaVez(deLaLista(lista, false), recarga.respuesta)
      const antes = contar(deLaLista(lista, false))
      LISTA_ACTUAL = lista
      await volverALaVista(router, lista)
      await waitFor(() => expect(contar(deLaLista(lista, false))).toBe(antes + 1), ESPERA)
      listaALaVista()
      await recarga.soltar(() =>
        responder(llamadas.filter(deLaLista(lista, false)).at(-1) as Llamada),
      )
      await reposar(200)
      expect(contar(deLaLista(lista, false))).toBe(antes + 1)
      expect(llamadas.filter(deLaLista(lista, false)).at(-1)?.url.searchParams.has("cursor")).toBe(
        false,
      )
      expect(aviso.error).not.toHaveBeenCalled()
      listaALaVista()
    },
    20_000,
  )

  it("CH6-B12 (c) (un tema de Actividades, con signal): salir con la página en vuelo la aborta y no falla; al volver antes de 30 s, la lista sigue con su «Ver más» y no se pide nada", async () => {
    if (ACTIVIDADES === undefined) throw new Error("Precondición: la lista del tema")
    LISTA_ACTUAL = ACTIVIDADES
    const { router, verMas } = await entrar(ACTIVIDADES)
    const pagina = retenida()
    interceptarUnaVez(deLaLista(ACTIVIDADES, true), pagina.respuesta)
    fireEvent.click(verMas)
    await waitFor(() => expect(contar(deLaLista(ACTIVIDADES, true))).toBe(1), ESPERA)
    await navegar(router, ACTIVIDADES.otra)
    await waitFor(
      () => expect(screen.queryByRole("button", { name: ACTIVIDADES.verMas })).toBeNull(),
      ESPERA,
    )
    await pagina.soltar(error500)
    await reposar(300)
    const antes = llamadas.length
    await navegar(router, ACTIVIDADES.vista)
    await buscarBoton(ACTIVIDADES.verMas)
    await reposar(300)
    expect(contar(deLaLista(ACTIVIDADES, false))).toBe(1)
    expect(llamadas.slice(antes).filter(deLaLista(ACTIVIDADES, null))).toHaveLength(0)
    listaALaVista()
    expect(aviso.error).not.toHaveBeenCalled()
  }, 20_000)

  it.each(LISTAS.map((lista) => [lista.nombre, lista] as const))(
    "CH6-B12 (d) (%s): montar la vista con el fallo de la página ya ocurrido (volver antes de que se pida otra vez) no repite el aviso",
    async (_nombre, lista) => {
      const { router, verMas } = await entrar(lista)
      await paginaQueFalla(lista, verMas)
      await navegar(router, lista.otra)
      await waitFor(
        () => expect(screen.queryByRole("button", { name: lista.verMas })).toBeNull(),
        ESPERA,
      )
      await volverALaVista(router, lista)
      await buscarBoton(lista.verMas)
      await reposar(300)
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
    20_000,
  )

  it.each(LISTAS.map((lista) => [lista.nombre, lista] as const))(
    "CH6-B12 (e) (%s): tras el fallo, dos clics en «Ver más» en el mismo act piden una sola página",
    async (_nombre, lista) => {
      const { verMas } = await entrar(lista)
      await paginaQueFalla(lista, verMas)
      const boton = screen.getByRole("button", { name: lista.verMas })
      const pagina = retenida()
      interceptarUnaVez(deLaLista(lista, true), pagina.respuesta)
      act(() => {
        fireEvent.click(boton)
        fireEvent.click(boton)
      })
      await reposar(100)
      expect(contar(deLaLista(lista, true))).toBe(3)
      await pagina.soltar(() =>
        responder(llamadas.filter(deLaLista(lista, true)).at(-1) as Llamada),
      )
      await reposar(100)
      expect(contar(deLaLista(lista, true))).toBe(3)
    },
    20_000,
  )
})

// ---------------------------------------------------------------------------------------------------
// CH6-B13 · comentarios de una publicación borrada (hermano de T-02 de CLASES-03e)
// ---------------------------------------------------------------------------------------------------

describe("CH6-B13 · comentarios de una publicación que ya no existe", () => {
  const NO_EXISTE = "Esa publicación ya no existe."
  const listaDeAvisos = ({ metodo, url }: Llamada) =>
    metodo === "GET" && url.pathname === `/api/clases/${A}/publicaciones`
  const listaDeRecursos = ({ metodo, url }: Llamada) =>
    metodo === "GET" &&
    url.pathname === `/api/clases/${A}/recursos` &&
    url.searchParams.get("bloque") === "docente"

  it("CH6-B13 (abrir): con 404 PUBLICACION_NO_ENCONTRADA al abrir los comentarios, un solo mensaje en el bloque y sin aviso; la lista de Avisos se pide una vez, la fila sale y el foco, que estaba en el bloque, va al «Borrar publicación» de la vecina", async () => {
    servidor.rol = "maestro"
    await montar(MAESTRO_A)
    await screen.findByText(textoDe("publicaciones", A, 1), {}, ESPERA)
    const antes = contar(listaDeAvisos)
    servidor.borradas.add(`comentarios:${PUB_A1}`)
    servidor.borradas.add(PUB_A1)
    const renovacion = retenida()
    interceptarUnaVez(listaDeAvisos, renovacion.respuesta)
    await abrirComentarios()
    const campo = await screen.findByLabelText(TEXTOS_COMENTARIOS.campo, {}, ESPERA)
    act(() => campo.focus())
    await waitFor(() => expect(screen.getByText(NO_EXISTE)).toBeInTheDocument(), ESPERA)
    expect(screen.getAllByText(NO_EXISTE)).toHaveLength(1)
    await waitFor(() => expect(contar(listaDeAvisos)).toBe(antes + 1), ESPERA)
    await renovacion.soltar(() => responder(llamadas.filter(listaDeAvisos).at(-1) as Llamada))
    await waitFor(
      () => expect(screen.queryByText(textoDe("publicaciones", A, 1))).toBeNull(),
      ESPERA,
    )
    await reposar(150)
    expect(contar(listaDeAvisos)).toBe(antes + 1)
    expect(aviso.error).not.toHaveBeenCalled()
    const vecina = screen
      .getByText(textoDe("publicaciones", A, 2))
      .closest<HTMLElement>("[data-publicacion-id]")
    if (vecina === null) throw new Error("Precondición: la publicación vecina")
    expect(document.activeElement).toBe(
      within(vecina).getByRole("button", { name: TEXTOS_PUBLICACION.borrarPublicacion }),
    )
  }, 20_000)

  it("CH6-B13 («Ver más comentarios»): con 404 PUBLICACION_NO_ENCONTRADA en la página siguiente, el bloque dice «Esa publicación ya no existe.» sin aviso y la lista de Avisos se pide una vez", async () => {
    if (COMENTARIOS === undefined) throw new Error("Precondición: la lista de comentarios")
    const { verMas } = await entrar(COMENTARIOS)
    const antes = contar(listaDeAvisos)
    fallarLaPagina(COMENTARIOS, () => errorApi(404, "PUBLICACION_NO_ENCONTRADA"))
    fireEvent.click(verMas)
    await waitFor(() => expect(screen.getByText(NO_EXISTE)).toBeInTheDocument(), ESPERA)
    expect(screen.getAllByText(NO_EXISTE)).toHaveLength(1)
    await waitFor(() => expect(contar(listaDeAvisos)).toBe(antes + 1), ESPERA)
    await reposar(200)
    expect(contar(listaDeAvisos)).toBe(antes + 1)
    expect(screen.getAllByText(NO_EXISTE)).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
  }, 20_000)

  it("CH6-B13 (un recurso): con 404 PUBLICACION_NO_ENCONTRADA al abrir los comentarios de un recurso, la lista de Recursos se renueva una vez y la fila sale", async () => {
    servidor.rol = "maestro"
    await montar(`${MAESTRO_A}/recursos`)
    await screen.findByText(textoDe("recursos", A, 1), {}, ESPERA)
    const filaDelRecurso = screen
      .getByText(textoDe("recursos", A, 1))
      .closest<HTMLElement>("[data-recurso-id]")
    if (filaDelRecurso === null) throw new Error("Precondición: la fila del recurso")
    fireEvent.click(
      within(filaDelRecurso).getByRole("button", { name: TEXTOS_RECURSOS.verRecurso }),
    )
    const recursoA1 = idDe("recursos", A, 1)
    servidor.borradas.add(`comentarios:${recursoA1}`)
    servidor.borradas.add(recursoA1)
    const antes = contar(listaDeRecursos)
    fireEvent.click(
      await within(filaDelRecurso).findByRole(
        "button",
        { name: TEXTOS_PUBLICACION.verComentarios(3) },
        ESPERA,
      ),
    )
    await waitFor(() => expect(screen.getByText(NO_EXISTE)).toBeInTheDocument(), ESPERA)
    await waitFor(() => expect(contar(listaDeRecursos)).toBe(antes + 1), ESPERA)
    await waitFor(() => expect(screen.queryByText(textoDe("recursos", A, 1))).toBeNull(), ESPERA)
    await reposar(200)
    expect(contar(listaDeRecursos)).toBe(antes + 1)
    expect(aviso.error).not.toHaveBeenCalled()
  }, 20_000)

  it("CH6-B13 (dos fallos seguidos): cerrar y volver a abrir los comentarios con el mismo 404 renueva la lista una vez por fallo", async () => {
    servidor.rol = "maestro"
    await montar(MAESTRO_A)
    await screen.findByText(textoDe("publicaciones", A, 1), {}, ESPERA)
    const antes = contar(listaDeAvisos)
    servidor.borradas.add(`comentarios:${PUB_A1}`)
    await abrirComentarios()
    await waitFor(() => expect(screen.getByText(NO_EXISTE)).toBeInTheDocument(), ESPERA)
    await waitFor(() => expect(contar(listaDeAvisos)).toBe(antes + 1), ESPERA)
    await reposar(200)
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_PUBLICACION.ocultarComentarios }))
    await abrirComentarios()
    await waitFor(() => expect(contar(listaDeAvisos)).toBe(antes + 2), ESPERA)
    await reposar(200)
    expect(contar(listaDeAvisos)).toBe(antes + 2)
    expect(aviso.error).not.toHaveBeenCalled()
  }, 20_000)
})

// ---------------------------------------------------------------------------------------------------
// CH6-B19 (Enmienda 5) · los estados vecinos de T-04 y T-05: la marca es de la consulta
// ---------------------------------------------------------------------------------------------------

describe("CH6-B19 · la lista conservada mientras vuela la recarga que la recupera, por los caminos vecinos de T-04 y T-05", () => {
  const PERSONAS = LISTAS.find((lista) => lista.recurso === "personas")
  const DUDAS = LISTAS.find((lista) => lista.recurso === "dudas")
  const POR_NOMBRE = { Avisos: AVISOS, Personas: PERSONAS, comentarios: COMENTARIOS, Dudas: DUDAS }
  const lista = (nombre: keyof typeof POR_NOMBRE) => {
    const encontrada = POR_NOMBRE[nombre]
    if (encontrada === undefined) throw new Error(`Precondición: la lista ${nombre}`)
    return encontrada
  }
  // Las mismas rutas de la lista, en la clase B.
  const enB = (ruta: string) => ruta.replace(A, B)
  const deLaListaEnB =
    (l: ListaDePaginas, conCursor: boolean | null) =>
    ({ metodo, url }: Llamada) =>
      metodo === "GET" &&
      url.pathname === enB(l.api) &&
      (conCursor === null || url.searchParams.has("cursor") === conCursor)

  // Mientras vuela la recuperación: la lista con «Ver más» en espera, sin role=alert ni texto de error.
  const conservadaMientrasVuela = (l: ListaDePaginas, claseId = A) => {
    const verMas = screen.getByRole("button", { name: l.verMas })
    expect(verMas).toHaveAttribute("aria-busy", "true")
    const contenedor = verMas.parentElement
    if (contenedor === null) throw new Error("Precondición: «Ver más» tiene contenedor")
    expect(within(contenedor).getAllByText(textoDe(l.recurso, claseId, 1)).length).toBeGreaterThan(
      0,
    )
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.queryByText(mensajeDeConsultaClases(ERROR_500))).toBeNull()
  }

  const responderLaUltima = (cumple: (llamada: Llamada) => boolean) => () =>
    responder(llamadas.filter(cumple).at(-1) as Llamada)

  it.each(["Avisos", "Personas"] as const)(
    "CH6-B19 (a) (%s): con la lista conservada y su recuperación en vuelo, volver de otra sección dos veces seguidas: la lista sigue a la vista con «Ver más» en espera y sin role=alert, sin petición de más; al responder bien, sin aviso",
    async (nombre) => {
      const l = lista(nombre)
      const { router, verMas } = await entrar(l)
      await paginaQueFalla(l, verMas)
      await navegar(router, l.otra)
      const recarga = retenida()
      interceptarUnaVez(deLaLista(l, false), recarga.respuesta)
      const antes = contar(deLaLista(l, false))
      await volverALaVista(router, l)
      await waitFor(() => expect(contar(deLaLista(l, false))).toBe(antes + 1), ESPERA)
      conservadaMientrasVuela(l)
      await navegar(router, l.otra)
      await reposar(100)
      await volverALaVista(router, l)
      await buscarBoton(l.verMas)
      await reposar(150)
      expect(contar(deLaLista(l, false))).toBe(antes + 1)
      conservadaMientrasVuela(l)
      await recarga.soltar(responderLaUltima(deLaLista(l, false)))
      await waitFor(
        () =>
          expect(screen.getByRole("button", { name: l.verMas })).not.toHaveAttribute(
            "aria-busy",
            "true",
          ),
        ESPERA,
      )
      await reposar(100)
      expect(screen.queryByRole("alert")).toBeNull()
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
    20_000,
  )

  it("CH6-B19 (b) (Avisos): la recuperación que lanza una invalidación por comentar queda en vuelo; ir a otra sección y volver: la lista sigue a la vista con «Ver más avisos» en espera y sin role=alert, sin petición de más; al responder bien, sin aviso", async () => {
    const l = lista("Avisos")
    const { router, verMas } = await entrar(l)
    await paginaQueFalla(l, verMas)
    await abrirComentarios()
    await screen.findByText(textoDe("comentarios", A, 1), {}, ESPERA)
    const recarga = retenida()
    interceptarUnaVez(deLaLista(l, false), recarga.respuesta)
    const antes = contar(deLaLista(l, false))
    fireEvent.change(await screen.findByLabelText(TEXTOS_COMENTARIOS.campo, {}, ESPERA), {
      target: { value: "Un comentario" },
    })
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_COMENTARIOS.comentar }))
    await waitFor(() => expect(contar(deLaLista(l, false))).toBe(antes + 1), ESPERA)
    await navegar(router, l.otra)
    await reposar(100)
    await navegar(router, l.vista)
    await buscarBoton(l.verMas)
    await reposar(150)
    expect(contar(deLaLista(l, false))).toBe(antes + 1)
    conservadaMientrasVuela(l)
    await recarga.soltar(responderLaUltima(deLaLista(l, false)))
    await waitFor(
      () =>
        expect(screen.getByRole("button", { name: l.verMas })).not.toHaveAttribute(
          "aria-busy",
          "true",
        ),
      ESPERA,
    )
    await reposar(100)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  }, 20_000)

  it("CH6-B19 (c) (Personas): A conservada y su renovación en vuelo; salto A → B → A (la lista se monta de nuevo por su key): al volver a A, su lista sigue a la vista con «Ver más alumnos» en espera y sin role=alert, sin petición de más; al responder bien, sin aviso", async () => {
    const l = lista("Personas")
    servidor.rol = l.rol
    const { router } = await montar(enB(l.vista))
    await screen.findByText(textoDe(l.recurso, B, 1), {}, ESPERA)
    await navegar(router, l.vista)
    const verMas = await buscarBoton(l.verMas)
    await paginaQueFalla(l, verMas)
    const recarga = retenida()
    interceptarUnaVez(deLaLista(l, false), recarga.respuesta)
    const antes = contar(deLaLista(l, false))
    await navegar(router, l.vista)
    await waitFor(() => expect(contar(deLaLista(l, false))).toBe(antes + 1), ESPERA)
    await navegar(router, -2)
    await screen.findByText(textoDe(l.recurso, B, 1), {}, ESPERA)
    await navegar(router, 2)
    await buscarBoton(l.verMas)
    await reposar(150)
    expect(contar(deLaLista(l, false))).toBe(antes + 1)
    conservadaMientrasVuela(l)
    await recarga.soltar(responderLaUltima(deLaLista(l, false)))
    await waitFor(
      () =>
        expect(screen.getByRole("button", { name: l.verMas })).not.toHaveAttribute(
          "aria-busy",
          "true",
        ),
      ESPERA,
    )
    await reposar(100)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  }, 20_000)

  it("CH6-B19 (c) (comentarios): los comentarios de A conservados y su renovación en vuelo; salto A → B → A y se vuelve a abrir el bloque (la fila se monta de nuevo con el bloque cerrado, N-01 del manager): los comentarios siguen a la vista con «Ver más comentarios» en espera y sin role=alert, sin petición de más; al responder bien, sin aviso", async () => {
    const l = lista("comentarios")
    servidor.rol = l.rol
    const { router } = await montar(enB(l.vista))
    await screen.findByText(textoDe("publicaciones", B, 1), {}, ESPERA)
    await navegar(router, l.vista)
    await abrirComentarios()
    const verMas = await buscarBoton(l.verMas)
    await paginaQueFalla(l, verMas)
    const recarga = retenida()
    interceptarUnaVez(deLaLista(l, false), recarga.respuesta)
    const antes = contar(deLaLista(l, false))
    await navegar(router, l.vista)
    await waitFor(() => expect(contar(deLaLista(l, false))).toBe(antes + 1), ESPERA)
    await navegar(router, -2)
    await screen.findByText(textoDe("publicaciones", B, 1), {}, ESPERA)
    await navegar(router, 2)
    await abrirComentarios()
    await buscarBoton(l.verMas)
    await reposar(150)
    expect(contar(deLaLista(l, false))).toBe(antes + 1)
    conservadaMientrasVuela(l)
    await recarga.soltar(responderLaUltima(deLaLista(l, false)))
    await waitFor(
      () =>
        expect(screen.getByRole("button", { name: l.verMas })).not.toHaveAttribute(
          "aria-busy",
          "true",
        ),
      ESPERA,
    )
    await reposar(100)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  }, 20_000)

  it("CH6-B19 (d) (Dudas): A y B conservadas; A → B → A → B con las dos renovaciones en vuelo: al llegar a B la segunda vez, su lista sigue a la vista con «Ver más dudas» en espera y sin role=alert, sin petición de más", async () => {
    const l = lista("Dudas")
    servidor.rol = l.rol
    const { router } = await montar(enB(l.vista))
    await screen.findByText(textoDe("dudas", B, 1), {}, ESPERA)
    await navegar(router, l.vista)
    await screen.findByText(textoDe("dudas", A, 1), {}, ESPERA)
    // B conservada (fallo de su página con B a la vista) y después A conservada.
    await navegar(router, -1)
    await screen.findByText(textoDe("dudas", B, 1), {}, ESPERA)
    interceptarUnaVez(deLaListaEnB(l, true), error500)
    interceptarUnaVez(deLaListaEnB(l, true), error500)
    fireEvent.click(await buscarBoton(l.verMas))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await navegar(router, 1)
    await screen.findByText(textoDe("dudas", A, 1), {}, ESPERA)
    fallarLaPagina(l, error500)
    fireEvent.click(await buscarBoton(l.verMas))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
    await waitFor(
      () =>
        expect(screen.getByRole("button", { name: l.verMas })).not.toHaveAttribute(
          "aria-busy",
          "true",
        ),
      ESPERA,
    )
    // B → A → B, con las dos renovaciones retenidas.
    const deB = retenida()
    interceptarUnaVez(deLaListaEnB(l, false), deB.respuesta)
    const deA = retenida()
    interceptarUnaVez(deLaLista(l, false), deA.respuesta)
    const antesB = contar(deLaListaEnB(l, false))
    const antesA = contar(deLaLista(l, false))
    await navegar(router, -1)
    await waitFor(() => expect(contar(deLaListaEnB(l, false))).toBe(antesB + 1), ESPERA)
    conservadaMientrasVuela(l, B)
    await navegar(router, 1)
    await waitFor(() => expect(contar(deLaLista(l, false))).toBe(antesA + 1), ESPERA)
    conservadaMientrasVuela(l, A)
    await navegar(router, -1)
    await reposar(150)
    expect(contar(deLaListaEnB(l, false))).toBe(antesB + 1)
    conservadaMientrasVuela(l, B)
    await deB.soltar(responderLaUltima(deLaListaEnB(l, false)))
    await deA.soltar(responderLaUltima(deLaLista(l, false)))
    await reposar(150)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(aviso.error).toHaveBeenCalledTimes(2)
  }, 20_000)

  it("CH6-B19 (e) (Avisos): la recuperación falla después de volver de otra sección: la lista se reemplaza por su MensajeError, sin aviso y sin «Ver más avisos»", async () => {
    const l = lista("Avisos")
    const { router, verMas } = await entrar(l)
    await paginaQueFalla(l, verMas)
    await navegar(router, l.otra)
    const recarga = retenida()
    interceptarUnaVez(deLaLista(l, false), recarga.respuesta)
    interceptarUnaVez(deLaLista(l, false), error503)
    const antes = contar(deLaLista(l, false))
    await navegar(router, l.vista)
    await waitFor(() => expect(contar(deLaLista(l, false))).toBe(antes + 1), ESPERA)
    conservadaMientrasVuela(l)
    await recarga.soltar(error503)
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1), ESPERA)
    expect(screen.queryByRole("button", { name: l.verMas })).toBeNull()
    await reposar(150)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  }, 20_000)

  it("CH6-B19 (e) (Avisos, la recuperación falla con la vista desmontada; N-02 del manager): pulsar la sección deja la recuperación en vuelo, se va a otra sección y la recuperación falla ahí; al volver, mientras se pide otra vez se ve el MensajeError, sin aviso, nunca la lista conservada por una marca vieja", async () => {
    const l = lista("Avisos")
    const { router, cliente, verMas } = await entrar(l)
    await paginaQueFalla(l, verMas)
    const recarga = retenida()
    interceptarUnaVez(deLaLista(l, false), recarga.respuesta)
    const antes = contar(deLaLista(l, false))
    await navegar(router, l.vista)
    await waitFor(() => expect(contar(deLaLista(l, false))).toBe(antes + 1), ESPERA)
    await navegar(router, l.otra)
    await recarga.soltar(error503)
    await waitFor(() => expect(cliente.getQueryState(l.clave)?.fetchStatus).toBe("idle"), ESPERA)
    expect(cliente.getQueryState(l.clave)?.status).toBe("error")
    const otra = retenida()
    interceptarUnaVez(deLaLista(l, false), otra.respuesta)
    const antesDeVolver = contar(deLaLista(l, false))
    await navegar(router, l.vista)
    await waitFor(() => expect(contar(deLaLista(l, false))).toBe(antesDeVolver + 1), ESPERA)
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(screen.queryByRole("button", { name: l.verMas })).toBeNull()
    await otra.soltar(responderLaUltima(deLaLista(l, false)))
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull(), ESPERA)
    await reposar(100)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  }, 20_000)

  it("CH6-B19 (f) (Avisos): con la lista conservada, la consulta sale de la caché (removeQueries) mientras la vista está en otra sección; al volver, la primera carga nueva no tiene marca y, si falla, reemplaza la lista por su MensajeError, sin aviso", async () => {
    const l = lista("Avisos")
    const { router, cliente, verMas } = await entrar(l)
    await paginaQueFalla(l, verMas)
    await navegar(router, l.otra)
    await reposar(100)
    act(() => {
      cliente.removeQueries({ queryKey: l.clave, exact: true })
    })
    interceptarUnaVez(deLaLista(l, false), error503)
    interceptarUnaVez(deLaLista(l, false), error503)
    await navegar(router, l.vista)
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1), ESPERA)
    expect(screen.queryByRole("button", { name: l.verMas })).toBeNull()
    await reposar(150)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  }, 20_000)
})
