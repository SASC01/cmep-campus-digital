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
import { listaTraeLaClase, mensajeDeConsultaClases, mensajeDeErrorDeLista } from "./lib"

// CHORE-06b, ronda 1 del tester (ATQ-CH6-36 a ATQ-CH6-45). Ataca §D-5 (M-02 de la Enmienda 3b:
// useListaConservadaTrasLaPagina), DH-10 con páginas en vuelo, CH6-B13 sin vecina, StrictMode y
// listaTraeLaClase (§D-6). Router real (`rutas` de app/router) y un QueryClient con las
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
const titulo = (claseId: string) =>
  screen.findByRole("heading", { level: 1, name: NOMBRES[claseId] ?? "" }, ESPERA)

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
const SIN_SENAL = LISTAS.filter((lista) => !lista.conSenal)
const AVISOS_Y_DUDAS = [porNombre("Avisos"), porNombre("Dudas")]
const DE_CLASE = LISTAS.filter((lista) => !lista.nombre.startsWith("inicio"))

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
// ATQ-CH6-36 · la recuperación de una lista conservada sigue en vuelo al volver a montarla
// ---------------------------------------------------------------------------------------------------

describe("ATQ-CH6-36 · lista conservada, recuperación en vuelo, salir y volver mientras vuela", () => {
  it.each(conNombre(SIN_SENAL))(
    "ATQ-CH6-36 (%s): con la lista conservada tras un «Ver más» fallido, pulsar la sección (la recarga queda en vuelo), ir a otra sección y volver antes de que responda: la lista sigue a la vista con «Ver más» en espera y sin role=alert (M-02), sin petición nueva; al responder, sana y sin otro aviso",
    async (_nombre, lista) => {
      const { router } = await entrar(lista)
      await conservarLaPagina(lista)
      const recarga = retenida()
      interceptarUnaVez(deLaLista(lista, false), recarga.respuesta)
      const antes = contar(deLaLista(lista, false))
      await navegar(router, lista.vista(A))
      await waitFor(() => expect(contar(deLaLista(lista, false))).toBe(antes + 1), ESPERA)
      expect(conservadaALaVista(lista)).toHaveAttribute("aria-busy", "true")

      await navegar(router, lista.otra(A))
      await waitFor(
        () => expect(screen.queryByRole("button", { name: lista.verMas })).toBeNull(),
        ESPERA,
      )
      await reposar(100)
      await navegar(router, lista.vista(A))
      await lista.abrir?.()
      await reposar(200)
      // La misma recarga sigue en vuelo: nadie pidió otra.
      expect(contar(deLaLista(lista, false))).toBe(antes + 1)
      // M-02 (Enmienda 3b): mientras vuela la recarga que recupera la lista conservada, ningún
      // role=alert ni texto de error; la lista y «Ver más» en espera.
      expect(screen.queryByRole("alert")).toBeNull()
      expect(conservadaALaVista(lista)).toHaveAttribute("aria-busy", "true")

      await recarga.soltar(responderLaUltima(deLaLista(lista, false)))
      await esperarSana(lista)
      await reposar(100)
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
    25_000,
  )

  it("ATQ-CH6-36 (un tema de Actividades, con signal; control): salir con la recuperación en vuelo la aborta y la revierte; al volver, el montaje la pide otra vez y la lista conservada se ve mientras vuela, sin role=alert", async () => {
    const lista = porNombre("un tema de Actividades")
    const { router } = await entrar(lista)
    await conservarLaPagina(lista)
    const recarga = retenida()
    interceptarUnaVez(deLaLista(lista, false), recarga.respuesta)
    const antes = contar(deLaLista(lista, false))
    await navegar(router, lista.vista(A))
    await waitFor(() => expect(contar(deLaLista(lista, false))).toBe(antes + 1), ESPERA)
    expect(conservadaALaVista(lista)).toHaveAttribute("aria-busy", "true")
    await navegar(router, lista.otra(A))
    await waitFor(
      () => expect(screen.queryByRole("button", { name: lista.verMas })).toBeNull(),
      ESPERA,
    )
    const otra = retenida()
    interceptarUnaVez(deLaLista(lista, false), otra.respuesta)
    await navegar(router, lista.vista(A))
    await waitFor(() => expect(contar(deLaLista(lista, false))).toBe(antes + 2), ESPERA)
    await reposar(200)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(conservadaALaVista(lista)).toHaveAttribute("aria-busy", "true")
    await otra.soltar(responderLaUltima(deLaLista(lista, false)))
    await esperarSana(lista)
    await reposar(100)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  }, 25_000)

  it.each([
    ["comentarios", TEXTOS_PUBLICACION.ocultarComentarios] as const,
    ["respuestas", TEXTOS_DUDAS.ocultarRespuestas] as const,
  ])(
    "ATQ-CH6-36 (%s, cerrar y abrir): con la lista conservada, pulsar la sección (la recarga queda en vuelo), cerrar el bloque y volver a abrirlo antes de que responda: la lista sigue a la vista con «Ver más» en espera y sin role=alert (M-02)",
    async (nombre, ocultar) => {
      const lista = porNombre(nombre)
      const { router } = await entrar(lista)
      await conservarLaPagina(lista)
      const recarga = retenida()
      interceptarUnaVez(deLaLista(lista, false), recarga.respuesta)
      const antes = contar(deLaLista(lista, false))
      await navegar(router, lista.vista(A))
      await waitFor(() => expect(contar(deLaLista(lista, false))).toBe(antes + 1), ESPERA)
      expect(conservadaALaVista(lista)).toHaveAttribute("aria-busy", "true")
      fireEvent.click(screen.getByRole("button", { name: ocultar }))
      await waitFor(
        () => expect(screen.queryByRole("button", { name: lista.verMas })).toBeNull(),
        ESPERA,
      )
      await lista.abrir?.()
      await reposar(200)
      expect(contar(deLaLista(lista, false))).toBe(antes + 1)
      expect(screen.queryByRole("alert")).toBeNull()
      expect(conservadaALaVista(lista)).toHaveAttribute("aria-busy", "true")
      await recarga.soltar(responderLaUltima(deLaLista(lista, false)))
      await esperarSana(lista)
      await reposar(100)
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
    25_000,
  )
})

// ---------------------------------------------------------------------------------------------------
// ATQ-CH6-37 · A → B → A → B → A con las dos listas conservadas (la marca es una sola por vista)
// ---------------------------------------------------------------------------------------------------

// Monta la lista de B y salta a la de A (push): historial [B, A].
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

describe("ATQ-CH6-37 · DH-10 con las dos listas conservadas", () => {
  it.each(conNombre(AVISOS_Y_DUDAS))(
    "ATQ-CH6-37 (%s): A y B conservadas tras un «Ver más» fallido; saltos A → B → A con las dos renovaciones en vuelo: al volver a A, su lista sigue a la vista mientras vuela su renovación, sin role=alert (M-02)",
    async (_nombre, lista) => {
      const { router } = await deBaA(lista)
      await conservarLaPagina(lista, A)
      await navegar(router, -1)
      await titulo(B)
      await waitFor(() => filaVisible(lista, B), ESPERA)
      await conservarLaPagina(lista, B)
      expect(aviso.error).toHaveBeenCalledTimes(2)

      const renovacionDeA = retenida()
      interceptarUnaVez(deLaLista(lista, false, A), renovacionDeA.respuesta)
      const antesA = contar(deLaLista(lista, false, A))
      await navegar(router, 1)
      await titulo(A)
      await waitFor(() => expect(contar(deLaLista(lista, false, A))).toBe(antesA + 1), ESPERA)
      // Primera llegada a A: la marca se toma y la lista se ve (como CH6-B16 f).
      expect(conservadaALaVista(lista, A)).toHaveAttribute("aria-busy", "true")

      const renovacionDeB = retenida()
      interceptarUnaVez(deLaLista(lista, false, B), renovacionDeB.respuesta)
      const antesB = contar(deLaLista(lista, false, B))
      await navegar(router, -1)
      await titulo(B)
      await waitFor(() => expect(contar(deLaLista(lista, false, B))).toBe(antesB + 1), ESPERA)
      expect(conservadaALaVista(lista, B)).toHaveAttribute("aria-busy", "true")

      // Regreso a A con su renovación todavía en vuelo.
      await navegar(router, 1)
      await titulo(A)
      await reposar(200)
      expect(contar(deLaLista(lista, false, A))).toBe(antesA + 1)
      expect(screen.queryByRole("alert")).toBeNull()
      expect(conservadaALaVista(lista, A)).toHaveAttribute("aria-busy", "true")

      await renovacionDeA.soltar(responderLaUltima(deLaLista(lista, false, A)))
      await esperarSana(lista, A)
      await renovacionDeB.soltar(responderLaUltima(deLaLista(lista, false, B)))
      await reposar(100)
      expect(aviso.error).toHaveBeenCalledTimes(2)
    },
    25_000,
  )
})

// ---------------------------------------------------------------------------------------------------
// ATQ-CH6-38 · N-05 reflejado en Dudas
// ---------------------------------------------------------------------------------------------------

describe("ATQ-CH6-38 · la clave de la marca, en Dudas (reflejo de N-05)", () => {
  it("ATQ-CH6-38 (Dudas): A conservada tras un «Ver más» fallido y B en error por una recarga con el mismo contador: al saltar a B, B muestra su MensajeError mientras vuela su renovación y no la lista", async () => {
    const lista = porNombre("Dudas")
    const { router, cliente } = await deBaA(lista)
    await navegar(router, -1)
    await titulo(B)
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
    await conservarLaPagina(lista, A)
    const contadorDeA = cliente.getQueryCache().find({ queryKey: lista.clave(A), exact: true })
      ?.state.errorUpdateCount
    expect(contadorDeA).toBe(contadorDeB)
    const recarga = retenida()
    interceptarUnaVez(deLaLista(lista, false, B), recarga.respuesta)
    const antes = contar(deLaLista(lista, false, B))
    await navegar(router, -1)
    await titulo(B)
    await waitFor(() => expect(contar(deLaLista(lista, false, B))).toBe(antes + 1), ESPERA)
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0)
    expect(screen.queryByText(lista.fila(B))).toBeNull()
    await recarga.soltar(responderLaUltima(deLaLista(lista, false, B)))
    await esperarSana(lista, B)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  }, 25_000)
})

// ---------------------------------------------------------------------------------------------------
// ATQ-CH6-39 y ATQ-CH6-40 · lo que llega después de una lista conservada
// ---------------------------------------------------------------------------------------------------

describe("ATQ-CH6-39 · la recuperación de una lista conservada falla con un 4xx", () => {
  const casos = DE_CLASE.flatMap((lista) => {
    const propios: (readonly [string, string, Lista, Respuesta, ApiError])[] = [
      [
        lista.nombre,
        "403 SIN_ACCESO_A_LA_CLASE",
        lista,
        () => errorApi(403, "SIN_ACCESO_A_LA_CLASE"),
        new ApiError("SIN_ACCESO_A_LA_CLASE", "mensaje del servidor", 403),
      ],
    ]
    if (lista.nombre.startsWith("comentarios")) {
      propios.push([
        lista.nombre,
        "404 PUBLICACION_NO_ENCONTRADA",
        lista,
        () => errorApi(404, "PUBLICACION_NO_ENCONTRADA"),
        new ApiError("PUBLICACION_NO_ENCONTRADA", "mensaje del servidor", 404),
      ])
    }
    return propios
  })

  it.each(casos)(
    "ATQ-CH6-39 (%s, %s): la lista conservada se recupera al pulsar la sección y la recarga falla con un 4xx: la lista se reemplaza por su error, sin aviso nuevo (DH-02 a)",
    async (_nombre, _clase, lista, respuesta, error) => {
      const { router } = await entrar(lista)
      await conservarLaPagina(lista)
      fallarDosVeces(deLaLista(lista, false), respuesta)
      await navegar(router, lista.vista(A))
      await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0), ESPERA)
      if (error.codigo === "PUBLICACION_NO_ENCONTRADA") {
        expect(screen.getAllByText("Esa publicación ya no existe.")).toHaveLength(1)
      } else {
        expect(screen.getAllByText(lista.frase(error)).length).toBeGreaterThan(0)
      }
      expect(screen.queryByRole("button", { name: lista.verMas })).toBeNull()
      await reposar(300)
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
    25_000,
  )
})

describe("ATQ-CH6-40 · el 400 del cursor después de una lista conservada", () => {
  it.each(conNombre(LISTAS))(
    "ATQ-CH6-40 (%s): con la lista conservada tras un «Ver más» con 500, repetir «Ver más» con el 400 del cursor reemplaza la lista por su frase, sin aviso nuevo; pulsar la sección la pide desde la primera página y la frase desaparece",
    async (_nombre, lista) => {
      const { router } = await entrar(lista)
      await conservarLaPagina(lista)
      fallarDosVeces(deLaLista(lista, true), cursorVencido)
      fireEvent.click(screen.getByRole("button", { name: lista.verMas }))
      const frase = lista.frase(new ApiError("VALIDACION", "cursor: no es válido", 400))
      await waitFor(() => expect(screen.getAllByText(frase).length).toBeGreaterThan(0), ESPERA)
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0)
      expect(screen.queryByRole("button", { name: lista.verMas })).toBeNull()
      await reposar(300)
      expect(aviso.error).toHaveBeenCalledTimes(1)
      const antes = contar(deLaLista(lista, null))
      await navegar(router, lista.vista(A))
      await waitFor(() => expect(contar(deLaLista(lista, null))).toBe(antes + 1), ESPERA)
      expect(llamadas.filter(deLaLista(lista, null)).at(-1)?.url.searchParams.has("cursor")).toBe(
        false,
      )
      await esperarSana(lista)
      expect(screen.queryByText(frase)).toBeNull()
      await reposar(200)
      expect(contar(deLaLista(lista, null))).toBe(antes + 1)
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
    25_000,
  )
})

// ---------------------------------------------------------------------------------------------------
// ATQ-CH6-41 · CH6-B13 sin vecina
// ---------------------------------------------------------------------------------------------------

describe("ATQ-CH6-41 · comentarios de la única publicación o del único recurso, que ya no existe", () => {
  it("ATQ-CH6-41 (Avisos): la única publicación; abrir sus comentarios con 404 PUBLICACION_NO_ENCONTRADA y el foco en el bloque: la fila sale y el foco va al h2 de Avisos, nunca a <body>", async () => {
    servidor.rol = "maestro"
    servidor.borradas.add(idDe("publicaciones", A, 2))
    servidor.borradas.add(idDe("publicaciones", A, 3))
    await montar(BASE("maestro", A))
    await screen.findByText(textoDe("publicaciones", A, 1), {}, ESPERA)
    servidor.borradas.add(`comentarios:${PUB(A)}`)
    servidor.borradas.add(PUB(A))
    const renovacion = retenida()
    const listaDeAvisos = deLaLista(porNombre("Avisos"), null)
    interceptarUnaVez(listaDeAvisos, renovacion.respuesta)
    const antes = contar(listaDeAvisos)
    await abrirComentarios()
    const campo = await screen.findByLabelText(TEXTOS_COMENTARIOS.campo, {}, ESPERA)
    act(() => campo.focus())
    await screen.findByText("Esa publicación ya no existe.", {}, ESPERA)
    await waitFor(() => expect(contar(listaDeAvisos)).toBe(antes + 1), ESPERA)
    await renovacion.soltar(responderLaUltima(listaDeAvisos))
    await waitFor(
      () => expect(screen.queryByText(textoDe("publicaciones", A, 1))).toBeNull(),
      ESPERA,
    )
    await reposar(150)
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2, name: "Avisos" }))
    expect(aviso.error).not.toHaveBeenCalled()
  }, 25_000)

  it("ATQ-CH6-41 (un recurso): el único recurso de la sección; abrir sus comentarios con 404 PUBLICACION_NO_ENCONTRADA y el foco en el bloque: la fila sale y el foco va a un encabezado, nunca a <body>", async () => {
    servidor.rol = "maestro"
    servidor.borradas.add(idDe("recursos", A, 2))
    servidor.borradas.add(idDe("recursos", A, 3))
    await montar(`${BASE("maestro", A)}/recursos`)
    const filaDelDom = await filaDelRecurso()
    fireEvent.click(within(filaDelDom).getByRole("button", { name: TEXTOS_RECURSOS.verRecurso }))
    servidor.borradas.add(`comentarios:${RECURSO(A)}`)
    servidor.borradas.add(RECURSO(A))
    fireEvent.click(
      await within(filaDelDom).findByRole(
        "button",
        { name: TEXTOS_PUBLICACION.verComentarios(3) },
        ESPERA,
      ),
    )
    const campo = await screen.findByLabelText(TEXTOS_COMENTARIOS.campo, {}, ESPERA)
    act(() => campo.focus())
    await waitFor(() => expect(screen.queryByText(textoDe("recursos", A, 1))).toBeNull(), ESPERA)
    await reposar(150)
    expect(document.activeElement).not.toBe(document.body)
    expect(screen.getAllByRole("heading")).toContain(document.activeElement)
    expect(aviso.error).not.toHaveBeenCalled()
  }, 25_000)
})

// ---------------------------------------------------------------------------------------------------
// ATQ-CH6-42 · StrictMode
// ---------------------------------------------------------------------------------------------------

describe("ATQ-CH6-42 · StrictMode", () => {
  it.each(conNombre(LISTAS))(
    "ATQ-CH6-42 (%s): con StrictMode, el «Ver más» con 500 conserva la lista con un solo aviso; pulsar la sección la recupera sin role=alert mientras vuela, con una sola petición, y sin otro aviso",
    async (_nombre, lista) => {
      const { router } = await entrar(lista, true)
      await conservarLaPagina(lista)
      await reposar(200)
      expect(aviso.error).toHaveBeenCalledTimes(1)
      const recarga = retenida()
      interceptarUnaVez(deLaLista(lista, false), recarga.respuesta)
      const antes = contar(deLaLista(lista, false))
      await navegar(router, lista.vista(A))
      await waitFor(() => expect(contar(deLaLista(lista, false))).toBe(antes + 1), ESPERA)
      expect(conservadaALaVista(lista)).toHaveAttribute("aria-busy", "true")
      await reposar(100)
      expect(contar(deLaLista(lista, false))).toBe(antes + 1)
      await recarga.soltar(responderLaUltima(deLaLista(lista, false)))
      await esperarSana(lista)
      await reposar(100)
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
    25_000,
  )

  it("ATQ-CH6-42 (comentarios con 404, StrictMode): abrir los comentarios de una publicación borrada renueva la lista de Avisos una sola vez, con un solo mensaje y sin aviso", async () => {
    servidor.rol = "maestro"
    await montar(BASE("maestro", A), true)
    await screen.findByText(textoDe("publicaciones", A, 1), {}, ESPERA)
    const listaDeAvisos = deLaLista(porNombre("Avisos"), null)
    const antes = contar(listaDeAvisos)
    servidor.borradas.add(`comentarios:${PUB(A)}`)
    await abrirComentarios()
    await screen.findByText("Esa publicación ya no existe.", {}, ESPERA)
    await waitFor(() => expect(contar(listaDeAvisos)).toBe(antes + 1), ESPERA)
    await reposar(300)
    expect(contar(listaDeAvisos)).toBe(antes + 1)
    expect(screen.getAllByText("Esa publicación ya no existe.")).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
  }, 25_000)
})

// ---------------------------------------------------------------------------------------------------
// ATQ-CH6-43 · DH-10 con una página (no una recarga) en vuelo
// ---------------------------------------------------------------------------------------------------

describe("ATQ-CH6-43 · el salto con una página en vuelo", () => {
  it.each(conNombre(AVISOS_Y_DUDAS))(
    "ATQ-CH6-43 (%s, la página de A falla ya en B): ningún aviso ni mensaje en B; al volver a A, la lista se ve mientras se pide, sin role=alert, y no se avisa del fallo (R8)",
    async (_nombre, lista) => {
      const { router } = await deBaA(lista)
      const pagina = retenida()
      interceptarUnaVez(deLaLista(lista, true, A), pagina.respuesta)
      fireEvent.click(await buscarBoton(lista.verMas))
      await waitFor(() => expect(contar(deLaLista(lista, true, A))).toBe(1), ESPERA)
      await navegar(router, -1)
      await titulo(B)
      await waitFor(() => filaVisible(lista, B), ESPERA)
      await pagina.soltar(error500)
      await reposar(300)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(screen.queryByRole("alert")).toBeNull()
      filaVisible(lista, B)
      expect(screen.queryByText(lista.fila(A))).toBeNull()

      const renovacion = retenida()
      interceptarUnaVez(deLaLista(lista, false, A), renovacion.respuesta)
      const antes = contar(deLaLista(lista, false, A))
      await navegar(router, 1)
      await titulo(A)
      await waitFor(() => expect(contar(deLaLista(lista, false, A))).toBe(antes + 1), ESPERA)
      expect(conservadaALaVista(lista, A)).toHaveAttribute("aria-busy", "true")
      await renovacion.soltar(responderLaUltima(deLaLista(lista, false, A)))
      await esperarSana(lista, A)
      await reposar(100)
      expect(aviso.error).not.toHaveBeenCalled()
    },
    25_000,
  )

  it.each(conNombre(AVISOS_Y_DUDAS))(
    "ATQ-CH6-43 (%s, B pidiendo una página al llegar): la página de B, pedida antes de saltar a A, falla después de volver a B: la lista de B se queda, un solo aviso (el de B) y «Ver más» fuera de espera",
    async (_nombre, lista) => {
      const { router } = await deBaA(lista)
      await navegar(router, -1)
      await titulo(B)
      await waitFor(() => filaVisible(lista, B), ESPERA)
      const pagina = retenida()
      interceptarUnaVez(deLaLista(lista, true, B), pagina.respuesta)
      fireEvent.click(await buscarBoton(lista.verMas))
      await waitFor(() => expect(contar(deLaLista(lista, true, B))).toBe(1), ESPERA)
      await navegar(router, 1)
      await titulo(A)
      await waitFor(() => filaVisible(lista, A), ESPERA)
      await navegar(router, -1)
      await titulo(B)
      await reposar(100)
      expect(screen.getByRole("button", { name: lista.verMas })).toHaveAttribute(
        "aria-busy",
        "true",
      )
      await pagina.soltar(error500)
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      await waitFor(
        () =>
          expect(screen.getByRole("button", { name: lista.verMas })).not.toHaveAttribute(
            "aria-busy",
            "true",
          ),
        ESPERA,
      )
      conservadaALaVista(lista, B)
      expect(screen.queryByText(lista.fila(A))).toBeNull()
      await reposar(1500)
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
    25_000,
  )
})

// ---------------------------------------------------------------------------------------------------
// ATQ-CH6-44 y ATQ-CH6-45 · listaTraeLaClase y la clase archivada (§D-6, fila 361)
// ---------------------------------------------------------------------------------------------------

describe("ATQ-CH6-44 · listaTraeLaClase con formas inesperadas", () => {
  const raras: readonly (readonly [string, unknown])[] = [
    ["null", null],
    ["undefined", undefined],
    ["un número", 42],
    ["una cadena", A],
    ["un arreglo de filas sueltas", [{ id: A }]],
    ["un objeto vacío", {}],
    ["pages sin arreglo", { pages: { clases: [{ id: A }] } }],
    ["pages undefined", { pages: undefined }],
    ["pages vacío", { pages: [] }],
    ["páginas raras", { pages: [null, 7, {}, { clases: null }, { clases: "x" }] }],
    ["filas sin id", { pages: [{ clases: [{}, { nombre: "Historia" }, null, 3] }] }],
    ["id de otro tipo", { pages: [{ clases: [{ id: 1 }, { id: null }] }] }],
    ["clases no arreglo (barra)", { clases: { id: A } }],
    ["clases null (barra)", { clases: null }],
    ["otra clase (barra)", { clases: [{ id: B }] }],
  ]

  it.each(raras)("ATQ-CH6-44 (%s): no lanza y devuelve falso", (_nombre, dato) => {
    expect(() => listaTraeLaClase(dato, A)).not.toThrow()
    expect(listaTraeLaClase(dato, A)).toBe(false)
  })

  it("ATQ-CH6-44 (una forma válida junto a inesperadas): encuentra la clase en la página que la trae y en la barra con filas raras al lado", () => {
    expect(listaTraeLaClase({ pages: [null, { otro: 1 }, { clases: [null, { id: A }] }] }, A)).toBe(
      true,
    )
    expect(listaTraeLaClase({ clases: [7, null, {}, { id: A }] }, A)).toBe(true)
  })

  it("ATQ-CH6-44 (el gancho): una consulta con forma inesperada o en error sin datos bajo CLAVE_CLASES_INSCRITAS no se invalida al leer A archivada; la barra, que sí la trae, se pide una vez", async () => {
    servidor.rol = "estudiante"
    servidor.clases = [A, B]
    const { router, cliente } = await montar("/estudiante")
    await waitFor(
      () => expect(screen.getAllByRole("link", { name: "Historia" }).length).toBeGreaterThan(0),
      ESPERA,
    )
    await reposar(100)
    const rara = [...CLAVE_CLASES_INSCRITAS, "rara"]
    const enError = [...CLAVE_CLASES_INSCRITAS, "en-error"]
    cliente.setQueryData(rara, { pages: [null, { clases: [{ nombre: "Historia" }] }] })
    const consultaEnError = cliente.getQueryCache().build(cliente, { queryKey: enError })
    act(() =>
      consultaEnError.setState({
        status: "error",
        error: new Error("x"),
        fetchStatus: "idle",
        isInvalidated: false,
      }),
    )
    const deLaBarra = ({ metodo, url }: Llamada) =>
      metodo === "GET" &&
      url.pathname === "/api/clases/inscritas" &&
      url.searchParams.get("limite") === "100"
    const barraAntes = contar(deLaBarra)
    servidor.archivadas.add(A)
    await navegar(router, `/estudiante/clases/${A}`)
    await titulo(A)
    await waitFor(() => expect(contar(deLaBarra)).toBe(barraAntes + 1), ESPERA)
    await reposar(300)
    expect(contar(deLaBarra)).toBe(barraAntes + 1)
    expect(cliente.getQueryState(rara)?.isInvalidated).toBe(false)
    expect(cliente.getQueryState(enError)?.isInvalidated).toBe(false)
  }, 25_000)
})

describe("ATQ-CH6-45 · el alumno con el inicio en caché y la barra ya respondida", () => {
  it("ATQ-CH6-45: el alumno abre A, que llega archivada (pasa a «Clases anteriores»), salta a B y regresa con el historial: la barra se pide una sola vez en todo el camino; el inicio queda isInvalidated sin pedirse y, al volver al inicio, se pide una vez y ya no trae a A", async () => {
    servidor.rol = "estudiante"
    servidor.clases = [A, B]
    const api = "/api/clases/inscritas"
    const deLaBarra = ({ metodo, url }: Llamada) =>
      metodo === "GET" && url.pathname === api && url.searchParams.get("limite") === "100"
    const delInicio = ({ metodo, url }: Llamada) =>
      metodo === "GET" && url.pathname === api && url.searchParams.get("limite") !== "100"
    const { router, cliente } = await montar("/estudiante")
    await waitFor(() => expect(contar(delInicio)).toBe(1), ESPERA)
    await waitFor(() => expect(contar(deLaBarra)).toBe(1), ESPERA)
    await reposar(150)
    servidor.archivadas.add(A)
    await navegar(router, `/estudiante/clases/${A}`)
    await titulo(A)
    await waitFor(() => expect(contar(deLaBarra)).toBe(2), ESPERA)
    await reposar(300)
    expect(cliente.getQueryState(CLAVE_CLASES_INSCRITAS)?.isInvalidated).toBe(true)
    await navegar(router, `/estudiante/clases/${B}`)
    await titulo(B)
    await reposar(200)
    await navegar(router, -1)
    await titulo(A)
    await reposar(300)
    expect(contar(deLaBarra)).toBe(2)
    expect(contar(delInicio)).toBe(1)
    await navegar(router, "/estudiante")
    await waitFor(() => expect(contar(delInicio)).toBe(2), ESPERA)
    await screen.findByRole("heading", { level: 2, name: TEXTOS_PANEL.titulo }, ESPERA)
    await reposar(200)
    expect(contar(delInicio)).toBe(2)
    expect(contar(deLaBarra)).toBe(2)
    expect(screen.queryAllByRole("link", { name: "Historia" })).toHaveLength(0)
  }, 25_000)
})
