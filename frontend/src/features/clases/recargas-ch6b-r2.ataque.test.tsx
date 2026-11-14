import { QueryClient, QueryClientProvider, type QueryKey } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { StrictMode } from "react"
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
  CLAVE_SIN_TEMA,
  claveAlumnos,
  claveComentarios,
  claveDudas,
  clavePersonas,
  claveRecursos,
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

// CHORE-06b, ronda 2 del tester (ATQ-CH6-50 a ATQ-CH6-58). Ataca la Enmienda 5 (la marca de
// useListaConservadaTrasLaPagina es de la consulta: un WeakMap por instancia), las carreras, las claves
// cruzadas, la clase archivada y lo que siguió abierto de la ronda 1. Arnés de la ronda 1, con una
// segunda publicación, una segunda duda y un segundo tema, cada uno con sus filas. Router real (`rutas` de app/router) y un QueryClient con las
// defaultOptions de app/providers.tsx (retry: 1, refetchOnWindowFocus: false, staleTime: 30 s). La red
// se dobla con fetch; lo que debe quedar en vuelo se retiene con una promesa que la prueba suelta.
// Páginas de 2 filas (3 filas por lista), así que cada lista tiene «Ver más». "Salto" es
// router.navigate(-1) o (1) entre la misma sección de A y de B (DH-10). Sin selectores de estilo.

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

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
      comentarios: n === 1 ? 3 : n === 2 ? 4 : 0,
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
      respuestas: n === 1 ? 3 : n === 2 ? 4 : 0,
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

// La segunda publicación, la segunda duda y el segundo tema: 4 filas propias, «Otro n».
const TEMA2 = (claseId: string) => uuid("4b4b3c4d", claseId === A ? 1 : 2)
const OTRAS = (prefijo: string) => [1, 2, 3, 4].map((n) => uuid(prefijo, 30 + n))
const textoOtro = (etiqueta: string, id: string) =>
  `${etiqueta} ${String(numeroDe(id))} del segundo`
const paginaDeOtra = (etiqueta: string, prefijo: string, url: URL) => {
  const { pagina, siguiente } = paginar(OTRAS(prefijo), url)
  return {
    comentarios: pagina.map((id) => ({
      id,
      texto: textoOtro(etiqueta, id),
      autor: FIRMA,
      creadoEn: CREADO_EN,
      propio: false,
      puedeBorrar: false,
    })),
    siguienteCursor: siguiente,
  }
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
    if (numeroDe(subId) === 2)
      return respuestaJson(200, paginaDeOtra("Comentario", "6c6c3c4d", url))
    return respuestaJson(200, paginaDe("comentarios", claseId, url, "comentarios"))
  }
  if (sub === "dudas" && subId === undefined && metodo === "GET") {
    return respuestaJson(200, paginaDe("dudas", claseId, url, "dudas"))
  }
  if (sub === "dudas" && subId !== undefined && detalle === "respuestas") {
    if (numeroDe(subId) === 2) return respuestaJson(200, paginaDeOtra("Respuesta", "1e1e3c4d", url))
    return respuestaJson(200, paginaDe("respuestas", claseId, url, "comentarios"))
  }
  if (sub === "temas" && metodo === "GET") {
    const seccion = url.searchParams.get("seccion")
    if (seccion === "docente") return respuestaJson(200, { temas: [], sinTema: 3 })
    if (seccion === "aprendizaje") return respuestaJson(200, { temas: [], sinTema: 0 })
    return respuestaJson(200, {
      temas: [
        { id: TEMA(claseId), nombre: "Unidad 1", orden: 0, elementos: 3 },
        { id: TEMA2(claseId), nombre: "Unidad 2", orden: 1, elementos: 4 },
      ],
      sinTema: 0,
    })
  }
  if (sub === "trabajo" && url.searchParams.get("tema") === TEMA2(claseId)) {
    const { pagina, siguiente } = paginar(OTRAS("8e8e3c4d"), url)
    return respuestaJson(200, {
      elementos: pagina.map((id) => ({
        ...fila("trabajo", claseId, id),
        titulo: textoOtro("Lectura", id),
      })),
      siguienteCursor: siguiente,
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
      const llamada = { metodo, url }
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

const montar = async (entradas: string | string[], estricto = false) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, {
    initialEntries: typeof entradas === "string" ? [entradas] : entradas,
  })
  const cliente = nuevoCliente()
  const arbol = (
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  render(estricto ? <StrictMode>{arbol}</StrictMode> : arbol)
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
// Las 9 listas de §D-5 (y los comentarios de un recurso, el mismo componente dentro de Recursos)
// ---------------------------------------------------------------------------------------------------

interface Lista {
  nombre: string
  rol: Rol
  vista: (claseId: string) => string
  otra: (claseId: string) => string
  api: (claseId: string) => string
  abrir?: () => Promise<void>
  fila: (claseId: string) => string
  clave: (claseId: string) => QueryKey
  verMas: string
  encabezado: () => HTMLElement
  // Lo que pinta la lista cuando un error la reemplaza.
  frase: (error: unknown) => string
  // true: la consulta consume `signal` (salir aborta lo que vuela).
  conSenal: boolean
}

const BASE = (rol: Rol, claseId: string) => `/${rol}/clases/${claseId}`
const PUB = (claseId: string) => idDe("publicaciones", claseId, 1)
const DUDA = (claseId: string) => idDe("dudas", claseId, 1)
const RECURSO = (claseId: string) => idDe("recursos", claseId, 1)
const abrirComentarios = async () => {
  fireEvent.click(await buscarBoton(TEXTOS_PUBLICACION.verComentarios(3)))
}
const abrirRespuestas = async () => {
  fireEvent.click(await buscarBoton(TEXTOS_DUDAS.verRespuestas(3)))
}
const filaDelRecurso = async (claseId = A) => {
  const texto = await screen.findByText(textoDe("recursos", claseId, 1), {}, ESPERA)
  const filaDelDom = texto.closest<HTMLElement>("[data-recurso-id]")
  if (filaDelDom === null) throw new Error("Precondición: la fila del recurso")
  return filaDelDom
}
const abrirComentariosDelRecurso = async () => {
  const filaDelDom = await filaDelRecurso()
  const verRecurso = within(filaDelDom).queryByRole("button", { name: TEXTOS_RECURSOS.verRecurso })
  if (verRecurso !== null) fireEvent.click(verRecurso)
  fireEvent.click(
    await within(filaDelDom).findByRole(
      "button",
      { name: TEXTOS_PUBLICACION.verComentarios(3) },
      ESPERA,
    ),
  )
}
const h = (nivel: number, nombre: string | RegExp) => () =>
  screen.getByRole("heading", { level: nivel, name: nombre })

const LISTAS: readonly Lista[] = [
  {
    nombre: "Avisos",
    rol: "maestro",
    vista: (c) => BASE("maestro", c),
    otra: (c) => `${BASE("maestro", c)}/personas`,
    api: (c) => `/api/clases/${c}/publicaciones`,
    fila: (c) => textoDe("publicaciones", c, 1),
    clave: (c) => clavePublicaciones(c),
    verMas: "Ver más avisos",
    encabezado: h(2, "Avisos"),
    frase: (error) => mensajeDeErrorDeLista(error, TEXTOS_MURO.cambioMientrasLoVeias),
    conSenal: false,
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
    verMas: TEXTOS_COMENTARIOS.verMas,
    encabezado: h(3, TEXTOS_COMENTARIOS.titulo),
    frase: (error) => mensajeDeErrorDeLista(error, TEXTOS_COMENTARIOS.cambioMientrasLosVeias),
    conSenal: false,
  },
  {
    nombre: "Dudas",
    rol: "maestro",
    vista: (c) => `${BASE("maestro", c)}/dudas`,
    otra: (c) => BASE("maestro", c),
    api: (c) => `/api/clases/${c}/dudas`,
    fila: (c) => textoDe("dudas", c, 1),
    clave: (c) => claveDudas(c),
    verMas: TEXTOS_DUDAS.verMas,
    encabezado: h(2, TEXTOS_DUDAS.titulo),
    frase: (error) => mensajeDeErrorDeLista(error, TEXTOS_DUDAS.cambioMientrasLasVeias),
    conSenal: false,
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
    verMas: "Ver más respuestas",
    encabezado: h(3, "Respuestas"),
    frase: (error) => mensajeDeErrorDeLista(error, TEXTOS_RESPUESTAS.cambioMientrasLasVeias),
    conSenal: false,
  },
  {
    nombre: "un tema de Actividades",
    rol: "maestro",
    vista: (c) => `${BASE("maestro", c)}/trabajo`,
    otra: (c) => `${BASE("maestro", c)}/dudas`,
    api: (c) => `/api/clases/${c}/trabajo`,
    fila: (c) => textoDe("trabajo", c, 1),
    clave: (c) => claveTrabajo(c, TEMA(c)),
    verMas: "Ver más de Unidad 1",
    encabezado: h(2, /^Unidad 1/),
    frase: (error) => mensajeDeErrorDeLista(error, TEXTOS_TRABAJO.cambioMientrasLoVeias),
    conSenal: true,
  },
  {
    nombre: "Personas",
    rol: "estudiante",
    vista: (c) => `${BASE("estudiante", c)}/personas`,
    otra: (c) => `${BASE("estudiante", c)}/dudas`,
    api: (c) => `/api/clases/${c}/personas`,
    fila: (c) => textoDe("personas", c, 1),
    clave: (c) => clavePersonas(c),
    verMas: "Ver más alumnos",
    encabezado: h(2, "Alumnos"),
    frase: (error) => mensajeDeConsultaClases(error),
    conSenal: false,
  },
  {
    nombre: "el roster",
    rol: "maestro",
    vista: (c) => `${BASE("maestro", c)}/personas`,
    otra: (c) => `${BASE("maestro", c)}/dudas`,
    api: (c) => `/api/clases/${c}/alumnos`,
    fila: (c) => textoDe("alumnos", c, 1),
    clave: (c) => claveAlumnos(c),
    verMas: "Ver más alumnos",
    encabezado: h(2, "Alumnos"),
    frase: (error) => mensajeDeConsultaClases(error),
    conSenal: false,
  },
  {
    nombre: "inicio del estudiante",
    rol: "estudiante",
    vista: () => "/estudiante",
    otra: () => "/estudiante/clases-anteriores",
    api: () => "/api/clases/inscritas",
    fila: () => "Clase 1 de Historia",
    clave: () => CLAVE_CLASES_INSCRITAS,
    verMas: TEXTOS_PANEL.verMas,
    encabezado: h(2, TEXTOS_PANEL.titulo),
    frase: (error) => mensajeDeErrorDeLista(error, TEXTOS_PANEL.cambioMientrasLasVeias),
    conSenal: false,
  },
  {
    nombre: "inicio del maestro",
    rol: "maestro",
    vista: () => "/maestro",
    otra: () => "/maestro/clases-archivadas",
    api: () => "/api/clases/impartidas",
    fila: () => "Clase 1 de Historia",
    clave: () => CLAVE_CLASES_IMPARTIDAS,
    verMas: TEXTOS_PANEL.verMas,
    encabezado: h(2, TEXTOS_PANEL.titulo),
    frase: (error) => mensajeDeErrorDeLista(error, TEXTOS_PANEL.cambioMientrasLasVeias),
    conSenal: false,
  },
  {
    nombre: "comentarios de un recurso",
    rol: "maestro",
    vista: (c) => `${BASE("maestro", c)}/recursos`,
    otra: (c) => `${BASE("maestro", c)}/dudas`,
    api: (c) => `/api/clases/${c}/publicaciones/${RECURSO(c)}/comentarios`,
    abrir: abrirComentariosDelRecurso,
    fila: (c) => textoDe("comentarios", c, 1),
    clave: (c) => claveComentarios(c, RECURSO(c)),
    verMas: TEXTOS_COMENTARIOS.verMas,
    encabezado: h(3, TEXTOS_COMENTARIOS.titulo),
    frase: (error) => mensajeDeErrorDeLista(error, TEXTOS_COMENTARIOS.cambioMientrasLosVeias),
    conSenal: false,
  },
]

const porNombre = (nombre: string) => {
  const lista = LISTAS.find((l) => l.nombre === nombre)
  if (lista === undefined) throw new Error(`Precondición: la lista «${nombre}»`)
  return lista
}
const conNombre = (listas: readonly Lista[]) =>
  listas.map((lista) => [lista.nombre, lista] as const)
const AVISOS_Y_DUDAS = [porNombre("Avisos"), porNombre("Dudas")]

const deLaLista =
  (lista: Lista, conCursor: boolean | null, claseId = A) =>
  ({ metodo, url }: Llamada) =>
    metodo === "GET" &&
    url.pathname === lista.api(claseId) &&
    url.searchParams.get("limite") !== "100" &&
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

// La lista conservada a la vista: su fila, «Ver más» y ningún role=alert ni el panel en error.
const conservadaALaVista = (lista: Lista, claseId = A) => {
  filaVisible(lista, claseId)
  expect(screen.queryByRole("alert")).toBeNull()
  expect(screen.queryByText(TEXTOS_PANEL.error)).toBeNull()
  return screen.getByRole("button", { name: lista.verMas })
}

// «Ver más» que falla con un 500 (dos veces, retry: 1): la lista se conserva y avisa una vez más.
const conservarLaPagina = async (lista: Lista, claseId = A) => {
  const avisosAntes = aviso.error.mock.calls.length
  const verMas = await buscarBoton(lista.verMas)
  fallarDosVeces(deLaLista(lista, true, claseId), error500)
  fireEvent.click(verMas)
  await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(avisosAntes + 1), ESPERA)
  await waitFor(
    () =>
      expect(screen.getByRole("button", { name: lista.verMas })).not.toHaveAttribute(
        "aria-busy",
        "true",
      ),
    ESPERA,
  )
  conservadaALaVista(lista, claseId)
}

const entrar = async (lista: Lista, estricto = false) => {
  servidor.rol = lista.rol
  const montado = await montar(lista.vista(A), estricto)
  await lista.abrir?.()
  await buscarBoton(lista.verMas)
  return montado
}

const responderLaUltima = (cumple: (llamada: Llamada) => boolean) => () =>
  responder(llamadas.filter(cumple).at(-1) as Llamada)

// ---------------------------------------------------------------------------------------------------
// Ayudas de la ronda 2
// ---------------------------------------------------------------------------------------------------

const RECURSOS_UN_TEMA: Lista = {
  nombre: "Recursos (un tema)",
  rol: "maestro",
  vista: (c) => `${BASE("maestro", c)}/recursos`,
  otra: (c) => `${BASE("maestro", c)}/dudas`,
  api: (c) => `/api/clases/${c}/recursos`,
  fila: (c) => textoDe("recursos", c, 1),
  clave: (c) => claveRecursos(c, "docente", CLAVE_SIN_TEMA),
  verMas: "Ver más de Sin tema",
  encabezado: h(3, /^Sin tema/),
  frase: (error) => mensajeDeConsultaClases(error),
  conSenal: true,
}

// La recuperación de la lista conservada: pulsar la sección con la recarga retenida.
const recuperarEnVuelo = async (router: Enrutador, lista: Lista) => {
  const recarga = retenida()
  interceptarUnaVez(deLaLista(lista, false), recarga.respuesta)
  const antes = contar(deLaLista(lista, false))
  await navegar(router, lista.vista(A))
  await waitFor(() => expect(contar(deLaLista(lista, false))).toBe(antes + 1), ESPERA)
  expect(conservadaALaVista(lista)).toHaveAttribute("aria-busy", "true")
  return { recarga, antes }
}

const articuloDe = (atributo: string, id: string) => {
  const nodo = document.querySelector<HTMLElement>(`[${atributo}="${id}"]`)
  if (nodo === null) throw new Error(`Precondición: la fila ${id}`)
  return nodo
}

// ---------------------------------------------------------------------------------------------------
// ATQ-CH6-50 · carreras de la marca
// ---------------------------------------------------------------------------------------------------

describe("ATQ-CH6-50 · carreras del fallo de página", () => {
  it.each(conNombre(AVISOS_Y_DUDAS))(
    "ATQ-CH6-50 (%s, O-01): el fallo de la página y una invalidación de la misma clave en el mismo lote de notificaciones: solo el MensajeError mientras vuela la recarga, ningún aviso, el foco en el h2 y nunca en <body>; al responder bien, la lista sin aviso",
    async (_nombre, lista) => {
      const { cliente } = await entrar(lista)
      const verMas = screen.getByRole("button", { name: lista.verMas })
      fallarDosVeces(deLaLista(lista, true), error500)
      const recarga = retenida()
      interceptarUnaVez(deLaLista(lista, false), recarga.respuesta)
      const consulta = cliente.getQueryCache().find({ queryKey: lista.clave(A), exact: true })
      if (consulta === undefined) throw new Error("Precondición: la consulta de la lista")
      let invalidada = false
      const dejar = cliente.getQueryCache().subscribe((evento) => {
        if (invalidada || evento.query !== consulta) return
        if (evento.type !== "updated" || evento.action.type !== "error") return
        invalidada = true
        void cliente.invalidateQueries({ queryKey: lista.clave(A), exact: true })
      })
      try {
        act(() => verMas.focus())
        fireEvent.click(verMas)
        await waitFor(() => expect(invalidada).toBe(true), ESPERA)
        await waitFor(() => expect(contar(deLaLista(lista, false))).toBe(2), ESPERA)
        await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1), ESPERA)
        await reposar(200)
        expect(aviso.error).not.toHaveBeenCalled()
        expect(document.activeElement).not.toBe(document.body)
        expect(document.activeElement).toBe(lista.encabezado())
        await recarga.soltar(responderLaUltima(deLaLista(lista, false)))
        await esperarSana(lista)
        await reposar(100)
        expect(aviso.error).not.toHaveBeenCalled()
        expect(contar(deLaLista(lista, false))).toBe(2)
      } finally {
        dejar()
      }
    },
    25_000,
  )

  it.each(conNombre(AVISOS_Y_DUDAS))(
    "ATQ-CH6-50 (%s, salir en el mismo act en que falla la página): a lo más un aviso; al volver, la lista conservada se ve mientras se pide, sin role=alert ni aviso nuevo",
    async (_nombre, lista) => {
      const { router } = await entrar(lista)
      interceptarUnaVez(deLaLista(lista, true), error500)
      const reintento = retenida()
      interceptarUnaVez(deLaLista(lista, true), reintento.respuesta)
      fireEvent.click(screen.getByRole("button", { name: lista.verMas }))
      await waitFor(() => expect(contar(deLaLista(lista, true))).toBe(2), ESPERA)
      await act(async () => {
        void reintento.soltar(error500)
        await router.navigate(lista.otra(A))
      })
      await reposar(300)
      expect(aviso.error.mock.calls.length).toBeLessThanOrEqual(1)
      const avisosAlSalir = aviso.error.mock.calls.length
      const recarga = retenida()
      interceptarUnaVez(deLaLista(lista, false), recarga.respuesta)
      const antes = contar(deLaLista(lista, false))
      await navegar(router, lista.vista(A))
      await waitFor(() => expect(contar(deLaLista(lista, false))).toBe(antes + 1), ESPERA)
      await reposar(100)
      expect(conservadaALaVista(lista)).toHaveAttribute("aria-busy", "true")
      await recarga.soltar(responderLaUltima(deLaLista(lista, false)))
      await esperarSana(lista)
      await reposar(100)
      expect(aviso.error.mock.calls.length).toBe(avisosAlSalir)
    },
    25_000,
  )
})

// ---------------------------------------------------------------------------------------------------
// ATQ-CH6-51 · claves cruzadas: dos bloques abiertos a la vez, uno conservado y otro con la recarga caída
// ---------------------------------------------------------------------------------------------------

interface Cruce {
  nombre: string
  vista: string
  // Abre los dos bloques y devuelve sus contenedores (el primero con «Ver más» que falla).
  abrir: () => Promise<readonly [HTMLElement, HTMLElement]>
  verMas: string
  primera: string
  segunda: string
  apiPrimera: string
  temaPrimera: string | null
  claveSegunda: QueryKey
}

const PUB2 = idDe("publicaciones", A, 2)
const DUDA2 = idDe("dudas", A, 2)

const seccionDe = (nombre: RegExp) => {
  const seccion = screen.getByRole("heading", { level: 2, name: nombre }).closest("section")
  if (seccion === null) throw new Error("Precondición: la sección del tema")
  return seccion
}

const CRUCES: readonly Cruce[] = [
  {
    nombre: "dos publicaciones con los comentarios abiertos",
    vista: BASE("maestro", A),
    abrir: async () => {
      fireEvent.click(await buscarBoton(TEXTOS_PUBLICACION.verComentarios(3)))
      fireEvent.click(await buscarBoton(TEXTOS_PUBLICACION.verComentarios(4)))
      await screen.findByText("Comentario 1 del segundo", {}, ESPERA)
      await screen.findByText(textoDe("comentarios", A, 1), {}, ESPERA)
      return [articuloDe("data-publicacion-id", PUB(A)), articuloDe("data-publicacion-id", PUB2)]
    },
    verMas: TEXTOS_COMENTARIOS.verMas,
    primera: textoDe("comentarios", A, 1),
    segunda: "Comentario 1 del segundo",
    apiPrimera: `/api/clases/${A}/publicaciones/${PUB(A)}/comentarios`,
    temaPrimera: null,
    claveSegunda: claveComentarios(A, PUB2),
  },
  {
    nombre: "dos dudas con las respuestas abiertas",
    vista: `${BASE("maestro", A)}/dudas`,
    abrir: async () => {
      fireEvent.click(await buscarBoton(TEXTOS_DUDAS.verRespuestas(3)))
      fireEvent.click(await buscarBoton(TEXTOS_DUDAS.verRespuestas(4)))
      await screen.findByText("Respuesta 1 del segundo", {}, ESPERA)
      await screen.findByText(textoDe("respuestas", A, 1), {}, ESPERA)
      return [articuloDe("data-duda-id", DUDA(A)), articuloDe("data-duda-id", DUDA2)]
    },
    verMas: "Ver más respuestas",
    primera: textoDe("respuestas", A, 1),
    segunda: "Respuesta 1 del segundo",
    apiPrimera: `/api/clases/${A}/dudas/${DUDA(A)}/respuestas`,
    temaPrimera: null,
    claveSegunda: claveRespuestas(A, DUDA2),
  },
  {
    nombre: "dos temas de Actividades",
    vista: `${BASE("maestro", A)}/trabajo`,
    abrir: async () => {
      await screen.findByText("Lectura 1 del segundo", {}, ESPERA)
      await screen.findByText(textoDe("trabajo", A, 1), {}, ESPERA)
      return [seccionDe(/^Unidad 1/), seccionDe(/^Unidad 2/)]
    },
    verMas: "Ver más de Unidad 1",
    primera: textoDe("trabajo", A, 1),
    segunda: "Lectura 1 del segundo",
    apiPrimera: `/api/clases/${A}/trabajo`,
    temaPrimera: TEMA(A),
    claveSegunda: claveTrabajo(A, TEMA2(A)),
  },
]

describe("ATQ-CH6-51 · la marca de una consulta no conserva ni reemplaza la lista de otra", () => {
  it.each(CRUCES.map((cruce) => [cruce.nombre, cruce] as const))(
    "ATQ-CH6-51 (%s): el primero conserva su lista tras un «Ver más» con 500 y el segundo pierde la suya por una recarga con 503; al pulsar la sección con las dos recargas en vuelo, el primero se ve y el segundo sigue con su error; al responder, los dos sanos y un solo aviso",
    async (_nombre, cruce) => {
      servidor.rol = "maestro"
      const { router, cliente } = await montar(cruce.vista)
      const [primero, segundo] = await cruce.abrir()
      const dePrimera = (conCursor: boolean) => (llamada: Llamada) =>
        llamada.metodo === "GET" &&
        llamada.url.pathname === cruce.apiPrimera &&
        (cruce.temaPrimera === null ||
          llamada.url.searchParams.get("tema") === cruce.temaPrimera) &&
        llamada.url.searchParams.has("cursor") === conCursor
      fallarDosVeces(dePrimera(true), error500)
      fireEvent.click(within(primero).getByRole("button", { name: cruce.verMas }))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      await waitFor(
        () =>
          expect(within(primero).getByRole("button", { name: cruce.verMas })).not.toHaveAttribute(
            "aria-busy",
            "true",
          ),
        ESPERA,
      )
      const deSegunda = (llamada: Llamada) =>
        llamada.metodo === "GET" &&
        !llamada.url.searchParams.has("cursor") &&
        (llamada.url.pathname.includes(PUB2) ||
          llamada.url.pathname.includes(DUDA2) ||
          llamada.url.searchParams.get("tema") === TEMA2(A))
      fallarDosVeces(deSegunda, error503)
      await act(async () => {
        await cliente
          .refetchQueries({ queryKey: cruce.claveSegunda, exact: true })
          .catch(() => undefined)
      })
      await waitFor(() => expect(within(segundo).getAllByRole("alert")).toHaveLength(1), ESPERA)
      expect(within(segundo).queryByText(cruce.segunda)).toBeNull()
      expect(within(primero).queryByRole("alert")).toBeNull()
      expect(within(primero).getAllByText(cruce.primera).length).toBeGreaterThan(0)
      expect(aviso.error).toHaveBeenCalledTimes(1)

      const recargaPrimera = retenida()
      interceptarUnaVez(dePrimera(false), recargaPrimera.respuesta)
      const recargaSegunda = retenida()
      interceptarUnaVez(deSegunda, recargaSegunda.respuesta)
      await navegar(router, cruce.vista)
      await reposar(200)
      expect(within(primero).queryByRole("alert")).toBeNull()
      expect(within(primero).getAllByText(cruce.primera).length).toBeGreaterThan(0)
      expect(within(primero).getByRole("button", { name: cruce.verMas })).toHaveAttribute(
        "aria-busy",
        "true",
      )
      expect(within(segundo).getAllByRole("alert")).toHaveLength(1)
      await recargaPrimera.soltar(responderLaUltima(dePrimera(false)))
      await recargaSegunda.soltar(responderLaUltima(deSegunda))
      await waitFor(() => expect(screen.queryByRole("alert")).toBeNull(), ESPERA)
      expect(screen.getAllByText(cruce.segunda).length).toBeGreaterThan(0)
      await reposar(100)
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
    25_000,
  )
})

// ---------------------------------------------------------------------------------------------------
// ATQ-CH6-52 · la recuperación de una lista conservada responde 409 CLASE_ARCHIVADA
// ---------------------------------------------------------------------------------------------------

describe("ATQ-CH6-52 · la clase pasa a archivada con una lista conservada", () => {
  it.each(conNombre(AVISOS_Y_DUDAS))(
    "ATQ-CH6-52 (%s): con el foco en «Ver más» de la lista conservada, la recuperación responde 409 CLASE_ARCHIVADA: la lista se reemplaza, la clase pasa a solo lectura con su aviso fijo, ningún aviso nuevo y el foco nunca en <body>",
    async (_nombre, lista) => {
      const { router } = await entrar(lista)
      await conservarLaPagina(lista)
      act(() => screen.getByRole("button", { name: lista.verMas }).focus())
      servidor.archivadas.add(A)
      fallarDosVeces(deLaLista(lista, false), () =>
        errorApi(409, "CLASE_ARCHIVADA", "La clase está archivada."),
      )
      await navegar(router, lista.vista(A))
      await screen.findByText(/Clase archivada el/, {}, ESPERA)
      await reposar(300)
      expect(screen.queryByRole("button", { name: lista.verMas })).toBeNull()
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0)
      expect(document.activeElement).not.toBe(document.body)
      expect(document.activeElement).not.toBeNull()
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
    25_000,
  )
})

// ---------------------------------------------------------------------------------------------------
// ATQ-CH6-53 · lo que siguió de la ronda 1
// ---------------------------------------------------------------------------------------------------

describe("ATQ-CH6-53 · después de recuperar una lista conservada", () => {
  it.each(conNombre(LISTAS))(
    "ATQ-CH6-53 (%s, otra vez «Ver más»): conservada y recuperada al pulsar la sección, «Ver más» con 500 la conserva otra vez con un aviso nuevo; después, «Ver más» con el 400 del cursor la reemplaza por su frase sin aviso; pulsar la sección la pide sin cursor y la frase desaparece",
    async (_nombre, lista) => {
      const { router } = await entrar(lista)
      await conservarLaPagina(lista)
      const { recarga } = await recuperarEnVuelo(router, lista)
      await recarga.soltar(responderLaUltima(deLaLista(lista, false)))
      await waitFor(
        () =>
          expect(screen.getByRole("button", { name: lista.verMas })).not.toHaveAttribute(
            "aria-busy",
            "true",
          ),
        ESPERA,
      )
      await conservarLaPagina(lista)
      expect(aviso.error).toHaveBeenCalledTimes(2)
      fallarDosVeces(deLaLista(lista, true), cursorVencido)
      fireEvent.click(screen.getByRole("button", { name: lista.verMas }))
      const frase = lista.frase(new ApiError("VALIDACION", "cursor: no es válido", 400))
      await waitFor(() => expect(screen.getAllByText(frase).length).toBeGreaterThan(0), ESPERA)
      expect(screen.queryByRole("button", { name: lista.verMas })).toBeNull()
      await reposar(200)
      expect(aviso.error).toHaveBeenCalledTimes(2)
      const antes = contar(deLaLista(lista, null))
      await navegar(router, lista.vista(A))
      await waitFor(() => expect(contar(deLaLista(lista, null))).toBe(antes + 1), ESPERA)
      expect(llamadas.filter(deLaLista(lista, null)).at(-1)?.url.searchParams.has("cursor")).toBe(
        false,
      )
      await esperarSana(lista)
      expect(screen.queryByText(frase)).toBeNull()
      expect(aviso.error).toHaveBeenCalledTimes(2)
    },
    25_000,
  )

  it.each(
    conNombre([porNombre("Avisos"), porNombre("comentarios"), porNombre("inicio del estudiante")]),
  )(
    "ATQ-CH6-53 (%s, StrictMode y montaje nuevo con la recuperación en vuelo): ir a otra sección y volver antes de que responda: la lista conservada se ve, sin role=alert ni petición nueva; al responder, sana y sin otro aviso",
    async (_nombre, lista) => {
      const { router } = await entrar(lista, true)
      await conservarLaPagina(lista)
      const { recarga, antes } = await recuperarEnVuelo(router, lista)
      await navegar(router, lista.otra(A))
      await waitFor(
        () => expect(screen.queryByRole("button", { name: lista.verMas })).toBeNull(),
        ESPERA,
      )
      await navegar(router, lista.vista(A))
      await lista.abrir?.()
      await reposar(200)
      expect(contar(deLaLista(lista, false))).toBe(antes + 1)
      expect(conservadaALaVista(lista)).toHaveAttribute("aria-busy", "true")
      await recarga.soltar(responderLaUltima(deLaLista(lista, false)))
      await esperarSana(lista)
      await reposar(100)
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
    25_000,
  )

  it.each(conNombre([porNombre("inicio del estudiante"), porNombre("inicio del maestro")]))(
    "ATQ-CH6-53 (%s, «Inicio» tres veces seguidas): con la lista conservada y su recuperación en vuelo, pulsar el inicio otras dos veces no pide más ni la reemplaza; al responder, sana y sin otro aviso",
    async (_nombre, lista) => {
      const { router } = await entrar(lista)
      await conservarLaPagina(lista)
      const { recarga, antes } = await recuperarEnVuelo(router, lista)
      await navegar(router, lista.vista(A))
      await navegar(router, lista.vista(A))
      await reposar(200)
      expect(contar(deLaLista(lista, false))).toBe(antes + 1)
      expect(conservadaALaVista(lista)).toHaveAttribute("aria-busy", "true")
      await recarga.soltar(responderLaUltima(deLaLista(lista, false)))
      await esperarSana(lista)
      await reposar(200)
      expect(contar(deLaLista(lista, false))).toBe(antes + 1)
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
    25_000,
  )
})

// ---------------------------------------------------------------------------------------------------
// ATQ-CH6-54 · hermanos del remedio: memoria que no sobrevive al montaje
// ---------------------------------------------------------------------------------------------------

describe("ATQ-CH6-54 · hermanos del remedio", () => {
  it("ATQ-CH6-54 (Recursos (un tema)): con su lista conservada tras un «Ver más» fallido, pulsar «Recursos», salir y volver antes de que responda: la lista se ve, sin role=alert", async () => {
    const lista = RECURSOS_UN_TEMA
    const { router } = await entrar(lista)
    await conservarLaPagina(lista)
    await recuperarEnVuelo(router, lista)
    await navegar(router, lista.otra(A))
    await waitFor(
      () => expect(screen.queryByRole("button", { name: lista.verMas })).toBeNull(),
      ESPERA,
    )
    const otra = retenida()
    interceptarUnaVez(deLaLista(lista, false), otra.respuesta)
    await navegar(router, lista.vista(A))
    await buscarBoton(lista.verMas)
    await reposar(200)
    expect(screen.queryByRole("alert")).toBeNull()
    filaVisible(lista)
    await otra.soltar(responderLaUltima(deLaLista(lista, false)))
    await esperarSana(lista)
    await reposar(100)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  }, 25_000)

  it("ATQ-CH6-54 (comentarios, el 404 llega con el bloque cerrado): «Ver más comentarios» en vuelo, la persona cierra el bloque y la página responde 404 PUBLICACION_NO_ENCONTRADA; al abrirlo otra vez, un solo mensaje, la lista de Avisos se renueva una vez y la fila sale, sin aviso", async () => {
    const lista = porNombre("comentarios")
    await entrar(lista)
    const pagina = retenida()
    interceptarUnaVez(deLaLista(lista, true), pagina.respuesta)
    fireEvent.click(screen.getByRole("button", { name: lista.verMas }))
    await waitFor(() => expect(contar(deLaLista(lista, true))).toBe(1), ESPERA)
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_PUBLICACION.ocultarComentarios }))
    await waitFor(
      () => expect(screen.queryByRole("button", { name: lista.verMas })).toBeNull(),
      ESPERA,
    )
    servidor.borradas.add(`comentarios:${PUB(A)}`)
    servidor.borradas.add(PUB(A))
    const listaDeAvisos = deLaLista(porNombre("Avisos"), null)
    const antes = contar(listaDeAvisos)
    await pagina.soltar(() => errorApi(404, "PUBLICACION_NO_ENCONTRADA"))
    await reposar(300)
    await abrirComentarios()
    await waitFor(() => expect(contar(listaDeAvisos)).toBe(antes + 1), ESPERA)
    await waitFor(
      () => expect(screen.queryByText(textoDe("publicaciones", A, 1))).toBeNull(),
      ESPERA,
    )
    await reposar(300)
    expect(contar(listaDeAvisos)).toBe(antes + 1)
    expect(aviso.error).not.toHaveBeenCalled()
  }, 25_000)
})
