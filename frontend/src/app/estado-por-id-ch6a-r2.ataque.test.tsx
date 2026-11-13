import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { StrictMode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { claveTemasDeLaSeccion } from "@/features/clases/data"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Ataque del Tester, CHORE-06a, ronda 2. Con el router real (`rutas` de app/router) y las defaultOptions
// de app/providers.tsx; "salto del historial" es router.navigate(-1) o (1) entre dos entradas de la misma
// ruta con otro id, con el destino en caché. Puntos de ataque del manager (revision.md, "Verificación de
// la corrección de la ronda 1 — CHORE-06a"):
// 1. «Sin tema» de Recursos y de Actividades, con su key constante: ¿el foco va al h2 de la lista (O-14)?
// 2. BloqueDeRecursos (key={bloque}) y la vista de Actividades, que sobreviven al cambio de clase: que en
//    la otra clase no salga ningún aviso de recarga de esta.
// 3, 4 y 5. Las entregas de una tarea con la Forma C: el foco tras la última página, T1 → T2 → T1, doble
//    clic, errores de la página de T1 que llegan estando en T2 y una sola petición por consulta (R-07).
// El arnés sigue el de app/estado-por-id-ch6.test.tsx. Sin selectores de clases de estilo.

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
vi.mock("@/services/navegacion", () => navegacion)

type Rol = "estudiante" | "maestro" | "admin"
type Respuesta = () => Response | Promise<Response>

const ESPERA = { timeout: 6000 }
const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const A = uuid("2a2b3c4d", 1)
const B = uuid("2a2b3c4d", 2)
const T1 = uuid("7a7b3c4d", 1)
const T2 = uuid("7a7b3c4d", 2)
const P1 = { id: uuid("6a6b3c4d", 1), nombre: "Pedro Paz" }
const P2 = { id: uuid("6a6b3c4d", 2), nombre: "Pía Luna" }
const R1 = uuid("8a8b3c4d", 1)
const R2 = uuid("8a8b3c4d", 2)
const CRITERIO_1 = uuid("9a9b3c4d", 1)
const CRITERIO_2 = uuid("9a9b3c4d", 2)
const MAESTRO_1 = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez" }
const MAESTRO_2 = { id: uuid("3a3b3c4d", 2), nombre: "Marta Ruiz" }
const FIRMA = { ...MAESTRO_1, administracion: false }
const CREADO_EN = "2026-10-01T15:30:00.000Z"
const FUTURA = "2030-01-15T16:00:00.000Z"
const NOMBRES: Record<string, string> = { [A]: "Historia", [B]: "Geografía" }
const TITULOS: Record<string, string> = { [T1]: "Ensayo uno", [T2]: "Ensayo dos" }
const RECURSOS: Record<string, string> = { [R1]: "Guía uno", [R2]: "Guía dos" }
const publicacionDe = (claseId: string) =>
  claseId === A ? uuid("5a5b3c4d", 1) : uuid("5a5b3c4d", 2)
const temaDe = (claseId: string) => (claseId === A ? uuid("4a4b3c4d", 1) : uuid("4a4b3c4d", 2))
const dudaDe = (claseId: string) => (claseId === A ? uuid("1a1b3c4d", 1) : uuid("1a1b3c4d", 2))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const sinContenido = () => new Response(null, { status: 204 })
const errorApi = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface Llamada {
  metodo: string
  url: URL
  cuerpo: unknown
}

interface Servidor {
  rol: Rol
  maestros: Record<string, (typeof MAESTRO_1)[]>
  alumnos: Record<string, (typeof P1)[]>
  // Estado de "mi entrega" del alumno por tarea.
  miEntrega: Record<string, "asignado" | "entregado">
  archivadas: Set<string>
}

let servidor: Servidor
let colas = new Map<string, Respuesta[]>()
let llamadas: Llamada[] = []

const preparar = (clave: string, ...respuestas: Respuesta[]) => {
  const cola = colas.get(clave)
  if (cola === undefined) {
    colas.set(clave, [...respuestas])
    return
  }
  cola.push(...respuestas)
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

const detalleDeClase = (claseId: string) => ({
  clase: {
    id: claseId,
    nombre: NOMBRES[claseId] ?? "Clase",
    descripcion: null,
    maestro: servidor.maestros[claseId]?.[0] ?? MAESTRO_1,
    maestros: servidor.maestros[claseId] ?? [MAESTRO_1],
    archivadaEn: servidor.archivadas.has(claseId) ? "2026-10-05T12:00:00.000Z" : null,
  },
})

const rubricaDe = (tareaId: string) =>
  tareaId === T1
    ? [
        { id: CRITERIO_1, criterio: "Claridad", puntosMax: 5 },
        { id: CRITERIO_2, criterio: "Ortografía", puntosMax: 5 },
      ]
    : []

const tareaDoble = (tareaId: string) => ({
  tarea: {
    id: tareaId,
    titulo: TITULOS[tareaId] ?? "Tarea nueva",
    instrucciones: "",
    fechaLimite: FUTURA,
    puntos: 10,
    aceptaTardias: true,
    requiereAdjuntos: true,
    version: 0,
    categoria: null,
    tema: null,
    rubrica: rubricaDe(tareaId),
    adjuntos: [],
    autor: FIRMA,
    creadoEn: CREADO_EN,
    actualizadoEn: CREADO_EN,
    puedeEditar: true,
    puedeBorrar: true,
  },
})

const alumnoPorId = (id: string) => (id === P2.id ? P2 : P1)

const entregaDeAlumnoDoble = (alumnoId: string, calificada = false) => ({
  entrega: {
    alumno: alumnoPorId(alumnoId),
    estado: calificada ? "calificado" : "entregado",
    fechaEntrega: "2026-10-09T15:30:00.000Z",
    conRetraso: false,
    enlaces: [],
    adjuntos: [],
    version: 2,
    calificacion: calificada
      ? { puntos: 8, sobre: 10, fecha: "2026-10-10T18:00:00.000Z", puntajes: [] }
      : null,
  },
})

const miEntregaDoble = (tareaId: string) => {
  const entregado = servidor.miEntrega[tareaId] === "entregado"
  return {
    entrega: {
      estado: entregado ? "entregado" : "asignado",
      fechaEntrega: entregado ? "2026-10-09T15:30:00.000Z" : null,
      conRetraso: false,
      enlaces: entregado ? ["https://ejemplo.mx/trabajo"] : [],
      adjuntos: [],
      puedeEntregar: !entregado,
      puedeAnular: entregado,
      calificacion: null,
    },
  }
}

const recursoDoble = (recursoId: string) => ({
  recurso: {
    id: recursoId,
    titulo: RECURSOS[recursoId] ?? "Recurso",
    texto: "",
    autor: FIRMA,
    creadoEn: CREADO_EN,
    bloque: "docente",
    adjuntos: [],
    comentarios: 0,
    puedeEditar: true,
    puedeBorrar: true,
    puedeMover: true,
    version: 0,
    tema: null,
  },
})

const columna = (n: number) => ({
  id: uuid("0a0b3c4d", n),
  titulo: `Tarea ${String(n)}`,
  fechaLimite: FUTURA,
  puntos: 10,
  categoria: null,
})

const gradebook = (claseId: string, siguiente: boolean) => ({
  tareas: [columna(1)],
  siguienteCursorTareas: null,
  alumnos: [
    {
      alumno: siguiente ? P2 : P1,
      celdas: [
        { tareaId: columna(1).id, estado: "asignado", conRetraso: false, calificacion: null },
      ],
      porcentaje: null,
      vencidasSinEntregar: 0,
      motivosDeRiesgo: [],
    },
  ],
  siguienteCursor: siguiente || claseId === B ? null : P1.id,
  resumen: { modo: "puntos", totalAlumnos: 2, promedioDeLaClase: null, alumnosEnRiesgo: 0 },
})

const misCalificaciones = {
  general: {
    modo: "puntos",
    porcentaje: null,
    puntos: { obtenido: 0, posible: 0, tareas: 0 },
    categorias: [],
    sinCategoria: { tareas: 0 },
  },
  tareas: [],
  siguienteCursor: null,
}

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
    return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
  }
  if (ruta === "/api/clases/anteriores") {
    return respuestaJson(200, {
      clases: [],
      total: 0,
      siguienteCursor: null,
      siguienteCursorArchivadaEn: null,
    })
  }
  if (ruta.startsWith("/api/admin/clases/")) {
    const [, , , , claseId, accion, maestroId] = ruta.split("/")
    if (claseId === undefined) return errorApi(500, "ERROR_INTERNO")
    if (accion === undefined && metodo === "PUT") return respuestaJson(200, detalleDeClase(claseId))
    if (accion === "maestros" && metodo === "DELETE") {
      servidor.maestros[claseId] = (servidor.maestros[claseId] ?? []).filter(
        (m) => m.id !== maestroId,
      )
      return respuestaJson(200, { maestros: servidor.maestros[claseId] })
    }
    return errorApi(500, "ERROR_INTERNO")
  }
  if (ruta === "/api/admin/maestros/candidatos") {
    return respuestaJson(200, { candidatos: [], hayMas: false })
  }
  const [, , , claseId, ...resto] = ruta.split("/")
  if (claseId === undefined) return errorApi(500, "ERROR_INTERNO")
  const sub = resto.join("/")
  if (sub === "" && metodo === "GET") return respuestaJson(200, detalleDeClase(claseId))
  if (sub === "codigo") return respuestaJson(200, { codigo: "ABCDEFG" })
  if (sub === "publicaciones" && metodo === "GET") {
    return respuestaJson(200, {
      publicaciones: [
        {
          id: publicacionDe(claseId),
          tipo: "anuncio",
          titulo: null,
          texto: `Aviso de ${NOMBRES[claseId] ?? ""}`,
          autor: FIRMA,
          creadoEn: CREADO_EN,
          comentarios: 0,
          adjuntos: [],
          puedeBorrar: true,
          tarea: null,
        },
      ],
      siguienteCursor: null,
    })
  }
  if (sub === "publicaciones" && metodo === "POST") {
    return respuestaJson(201, {
      publicacion: {
        id: uuid("5f5f3c4d", 9),
        tipo: "anuncio",
        titulo: null,
        texto: "Nuevo",
        autor: FIRMA,
        creadoEn: CREADO_EN,
        comentarios: 0,
        adjuntos: [],
        puedeBorrar: true,
        tarea: null,
      },
    })
  }
  if (sub === "dudas" && metodo === "GET") {
    return respuestaJson(200, {
      dudas: [
        {
          id: dudaDe(claseId),
          texto: `Duda de ${NOMBRES[claseId] ?? ""}`,
          autor: FIRMA,
          creadoEn: CREADO_EN,
          resuelta: false,
          resueltaEn: null,
          respuestas: 0,
          propia: true,
          puedeBorrar: true,
          puedeMarcar: true,
        },
      ],
      siguienteCursor: null,
    })
  }
  if (sub === "temas" && metodo === "GET") {
    const seccion = url.searchParams.get("seccion")
    if (seccion === "aprendizaje" || seccion === "docente") {
      return respuestaJson(200, { temas: [], sinTema: 0 })
    }
    return respuestaJson(200, {
      temas: [{ id: temaDe(claseId), nombre: "Unidad 1", orden: 0, elementos: 0 }],
      sinTema: 0,
    })
  }
  if (sub === "trabajo") return respuestaJson(200, { elementos: [], siguienteCursor: null })
  if (sub === "categorias") return respuestaJson(200, { categorias: [] })
  if (sub === "alumnos" && metodo === "GET") {
    const alumnos = (servidor.alumnos[claseId] ?? []).map((alumno) => ({
      ...alumno,
      email: "alumno@ejemplo.mx",
      estadoPago: "al_corriente",
      accesoRestringido: false,
      origen: "codigo",
      inscritoEn: CREADO_EN,
    }))
    return respuestaJson(200, { alumnos, total: alumnos.length, siguienteCursor: null })
  }
  if (sub.startsWith("alumnos/") && metodo === "DELETE") {
    const alumnoId = sub.split("/")[1]
    servidor.alumnos[claseId] = (servidor.alumnos[claseId] ?? []).filter((a) => a.id !== alumnoId)
    return sinContenido()
  }
  if (sub === "alumnos/candidatos") return respuestaJson(200, { candidatos: [], hayMas: false })
  if (sub === "gradebook") {
    if (claseId === B && url.searchParams.get("cursor") !== null) {
      return errorApi(400, "VALIDACION", "cursor: no es válido")
    }
    return respuestaJson(200, gradebook(claseId, url.searchParams.get("cursor") !== null))
  }
  if (sub === "mis-calificaciones") return respuestaJson(200, misCalificaciones)
  if (sub === "recursos" && metodo === "GET") {
    return respuestaJson(200, { recursos: [], siguienteCursor: null })
  }
  const [seccion, id, detalle, alumnoId, final] = resto
  if (seccion === "recursos" && id !== undefined && metodo === "GET") {
    return respuestaJson(200, recursoDoble(id))
  }
  if (seccion === "recursos" && id !== undefined && metodo === "PUT") {
    return respuestaJson(200, recursoDoble(id))
  }
  if (seccion === "tareas" && id === undefined && metodo === "POST") {
    return respuestaJson(201, tareaDoble(uuid("7f7f3c4d", 9)))
  }
  if (seccion === "tareas" && id !== undefined) {
    if (detalle === undefined && metodo === "GET") return respuestaJson(200, tareaDoble(id))
    if (detalle === undefined && metodo === "PUT") return respuestaJson(200, tareaDoble(id))
    if (detalle === undefined && metodo === "DELETE") return sinContenido()
    if (detalle === "entrega" && alumnoId === undefined && metodo === "GET") {
      return respuestaJson(200, miEntregaDoble(id))
    }
    if (detalle === "entrega" && alumnoId === undefined && metodo === "POST") {
      servidor.miEntrega[id] = "entregado"
      return respuestaJson(200, miEntregaDoble(id))
    }
    if (detalle === "entrega" && alumnoId === "comentarios" && metodo === "GET") {
      return respuestaJson(200, { comentarios: [], siguienteCursor: null })
    }
    if (detalle === "entregas" && alumnoId === undefined) {
      return respuestaJson(200, { entregas: [], total: 0, entregadas: 0, siguienteCursor: null })
    }
    if (detalle === "entregas" && alumnoId !== undefined) {
      if (final === undefined && metodo === "GET") {
        return respuestaJson(200, entregaDeAlumnoDoble(alumnoId))
      }
      if (final === "comentarios" && metodo === "GET") {
        return respuestaJson(200, { comentarios: [], siguienteCursor: null })
      }
      if (final === "calificacion" && metodo === "PUT") {
        return respuestaJson(200, entregaDeAlumnoDoble(alumnoId, true))
      }
    }
  }
  return errorApi(500, "ERROR_INTERNO", "no esperada")
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

// Un manejador propio de cada caso, antes de las colas y del doble general (por ejemplo, las páginas de
// la lista de entregas, que dependen del cursor).
type Manejador = (llamada: Llamada) => Response | Promise<Response> | undefined
let manejador: Manejador | undefined

beforeEach(() => {
  establecerToken("token-de-prueba")
  servidor = {
    rol: "maestro",
    maestros: { [A]: [MAESTRO_1, MAESTRO_2], [B]: [MAESTRO_1, MAESTRO_2] },
    alumnos: { [A]: [P1], [B]: [P1] },
    miEntrega: { [T1]: "asignado", [T2]: "asignado" },
    archivadas: new Set(),
  }
  colas = new Map()
  llamadas = []
  manejador = undefined
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://x")
      const metodo = init?.method ?? "GET"
      const cuerpo: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : undefined
      const llamada = { metodo, url, cuerpo }
      llamadas.push(llamada)
      const propia = manejador?.(llamada)
      if (propia !== undefined) return Promise.resolve(propia)
      const siguiente = colas.get(`${metodo} ${url.pathname}`)?.shift()
      if (siguiente !== undefined) return Promise.resolve().then(siguiente)
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

const montar = async (entrada: string, estricto = false) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [entrada] })
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
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
const titulo = (nombre: string) => screen.findByRole("heading", { level: 1, name: nombre }, ESPERA)
const buscarBoton = (nombre: string | RegExp) =>
  screen.findByRole("button", { name: nombre }, ESPERA)

const BASE = (rol: Rol, claseId: string) => `/${rol}/clases/${claseId}`

const errores = () => aviso.error.mock.calls.map(([texto]) => String(texto))
const h2 = (nombre: string) => screen.getByRole("heading", { level: 2, name: nombre })

// ---------------------------------------------------------------------------------------------------
// Punto 1: «Sin tema» de Recursos y de Actividades (key constante, CLAVE_SIN_TEMA).
// ---------------------------------------------------------------------------------------------------

type Agrupacion = "Sin tema" | "un tema"
const AGRUPACIONES: readonly Agrupacion[] = ["Sin tema", "un tema"]
const RECURSOS_DEL_DOCENTE = "Recursos del docente"
const ACTIVIDADES = "Actividades de aprendizaje"

// Cada clase con dos filas en la sección de la agrupación elegida: o «Sin tema», o un tema propio de la
// clase (Unidad 1, con un id por clase). Con `conMas`, la sección de A trae una página más (retenida).
const listaDeTemas = (claseId: string, agrupacion: Agrupacion) =>
  agrupacion === "Sin tema"
    ? { temas: [], sinTema: 2 }
    : { temas: [{ id: temaDe(claseId), nombre: "Unidad 1", orden: 0, elementos: 2 }], sinTema: 0 }
const idDeFila = (claseId: string, n: number) => uuid("8c8c3c4d", (claseId === A ? 10 : 20) + n)
const tituloDeFila = (claseId: string, n: number) =>
  `Fila ${String(n)} de ${NOMBRES[claseId] ?? ""}`
const recursoDeLista = (claseId: string, n: number) => ({
  id: idDeFila(claseId, n),
  titulo: tituloDeFila(claseId, n),
  texto: "",
  autor: FIRMA,
  creadoEn: CREADO_EN,
  bloque: "docente",
  adjuntos: [],
  comentarios: 0,
  puedeEditar: true,
  puedeBorrar: true,
  puedeMover: false,
})
const materialDeLista = (claseId: string, n: number) => ({
  id: idDeFila(claseId, n),
  tipo: "material",
  titulo: tituloDeFila(claseId, n),
  autor: FIRMA,
  creadoEn: CREADO_EN,
  material: { texto: "", adjuntos: [] },
  tarea: null,
  puedeMover: false,
  entrega: null,
})

let paginaDeMasDeA: Respuesta | undefined
const conSecciones = (agrupacion: Agrupacion, conMas = false) => {
  paginaDeMasDeA = undefined
  manejador = (llamada) => {
    if (llamada.metodo !== "GET") return undefined
    const [, , , claseId, recurso] = llamada.url.pathname.split("/")
    if (claseId === undefined) return undefined
    const parametros = llamada.url.searchParams
    if (recurso === "temas") {
      const seccion = parametros.get("seccion")
      if (seccion === "docente" || seccion === "actividades") {
        return respuestaJson(200, listaDeTemas(claseId, agrupacion))
      }
      return undefined
    }
    if (recurso !== "recursos" && recurso !== "trabajo") return undefined
    if (recurso === "recursos" && parametros.get("bloque") !== "docente") return undefined
    const fila = recurso === "recursos" ? recursoDeLista : materialDeLista
    const campo = recurso === "recursos" ? "recursos" : "elementos"
    if (parametros.get("cursor") !== null) {
      if (paginaDeMasDeA !== undefined && claseId === A)
        return Promise.resolve().then(paginaDeMasDeA)
      return respuestaJson(200, { [campo]: [fila(claseId, 3)], siguienteCursor: null })
    }
    return respuestaJson(200, {
      [campo]: [fila(claseId, 1), fila(claseId, 2)],
      siguienteCursor: conMas && claseId === A ? idDeFila(claseId, 2) : null,
    })
  }
}

const filaConTitulo = (titulo: string) => {
  const fila = screen
    .getByText(titulo)
    .closest<HTMLElement>("[data-recurso-id], [data-elemento-id]")
  if (fila === null) throw new Error(`Precondición: la fila de «${titulo}»`)
  return fila
}

// Monta la lista de B y salta a la de A (push): las dos quedan en caché.
const listaDeBaA = async (seccion: string, agrupacion: Agrupacion, conMas = false) => {
  servidor.rol = "maestro"
  conSecciones(agrupacion, conMas)
  const montado = await montar(`${BASE("maestro", B)}/${seccion}`)
  await titulo(NOMBRES[B] ?? "")
  await screen.findByText(tituloDeFila(B, 2), {}, ESPERA)
  await navegar(montado.router, `${BASE("maestro", A)}/${seccion}`)
  await titulo(NOMBRES[A] ?? "")
  await screen.findByText(tituloDeFila(A, 2), {}, ESPERA)
  return montado
}

describe("ataque CHORE-06a r2 · «Sin tema» al cambiar de clase (O-14)", () => {
  it.each(AGRUPACIONES)(
    "ATQ-CH6-16 (Recursos, %s): con el foco en «Borrar recurso» de una fila de A, saltar a B lleva el foco al h2 «Recursos del docente», no a una fila de B",
    async (agrupacion) => {
      const { router } = await listaDeBaA("recursos", agrupacion)
      const borrar = within(filaConTitulo(tituloDeFila(A, 2))).getByRole("button", {
        name: "Borrar recurso",
      })
      act(() => borrar.focus())
      expect(document.activeElement).toBe(borrar)

      await navegar(router, -1)
      await titulo(NOMBRES[B] ?? "")
      await screen.findByText(tituloDeFila(B, 2), {}, ESPERA)
      await reposar(150)
      const activo = document.activeElement
      const dondeQuedo =
        activo?.closest("li")?.textContent?.slice(0, 40) ?? activo?.textContent ?? "(nada)"
      expect(activo, `el foco quedó en «${dondeQuedo}»`).toBe(h2(RECURSOS_DEL_DOCENTE))
    },
  )

  it.each(AGRUPACIONES)(
    "ATQ-CH6-17 (Actividades, %s): con el foco en una fila de A, saltar a B lleva el foco al h2 «Actividades de aprendizaje», no a una fila de B",
    async (agrupacion) => {
      const { router } = await listaDeBaA("trabajo", agrupacion)
      const fila = filaConTitulo(tituloDeFila(A, 2))
      act(() => fila.focus())
      expect(document.activeElement).toBe(fila)

      await navegar(router, -1)
      await titulo(NOMBRES[B] ?? "")
      await screen.findByText(tituloDeFila(B, 2), {}, ESPERA)
      await reposar(150)
      const activo = document.activeElement
      const dondeQuedo =
        activo?.closest("li")?.textContent?.slice(0, 40) ?? activo?.textContent ?? "(nada)"
      expect(activo, `el foco quedó en «${dondeQuedo}»`).toBe(h2(ACTIVIDADES))
    },
  )

  it.each(AGRUPACIONES)(
    "ATQ-CH6-18 (Recursos, %s): con «Ver más de …» de A en vuelo y el foco en él, saltar a B (sin página siguiente) lleva el foco al h2 «Recursos del docente», no a una fila de B",
    async (agrupacion) => {
      const { router } = await listaDeBaA("recursos", agrupacion, true)
      const pendiente = retenida()
      paginaDeMasDeA = pendiente.respuesta
      const nombre = agrupacion === "Sin tema" ? "Ver más de Sin tema" : "Ver más de Unidad 1"
      const verMas = await buscarBoton(nombre)
      act(() => verMas.focus())
      fireEvent.click(verMas)
      await waitFor(
        () =>
          expect(
            llamadas.filter(
              (l) =>
                l.url.pathname === `/api/clases/${A}/recursos` &&
                l.url.searchParams.get("cursor") !== null,
            ),
          ).toHaveLength(1),
        ESPERA,
      )

      await navegar(router, -1)
      await titulo(NOMBRES[B] ?? "")
      await screen.findByText(tituloDeFila(B, 2), {}, ESPERA)
      await reposar(150)
      const activo = document.activeElement
      const dondeQuedo =
        activo?.closest("li")?.textContent?.slice(0, 40) ?? activo?.textContent ?? "(nada)"
      expect(activo, `el foco quedó en «${dondeQuedo}»`).toBe(h2(RECURSOS_DEL_DOCENTE))
      await pendiente.soltar(() =>
        respuestaJson(200, { recursos: [recursoDeLista(A, 3)], siguienteCursor: null }),
      )
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// Punto 2: BloqueDeRecursos (key={bloque}) y la vista de Actividades (sin key) sobreviven al cambio de
// clase con la memoria de su aviso de recarga (`fallosVistos` de useAvisoDeRecargaFallida).
// ---------------------------------------------------------------------------------------------------

type ListaConAviso = "Recursos" | "Actividades"
const LISTAS_CON_AVISO: readonly {
  nombre: ListaConAviso
  seccion: string
  temas: "docente" | "actividades"
}[] = [
  {
    nombre: "Recursos",
    seccion: "recursos",
    temas: "docente",
  },
  {
    nombre: "Actividades",
    seccion: "trabajo",
    temas: "actividades",
  },
]

describe("ataque CHORE-06a r2 · el aviso de recarga de una lista que sobrevive al cambio de clase", () => {
  it.each(LISTAS_CON_AVISO)(
    "ATQ-CH6-19 ($nombre): la recarga de los temas de B falla y avisa una vez; al saltar a A (sana, en caché) y volver a B no sale ningún otro aviso de recarga",
    async ({ seccion, temas }) => {
      const { router, cliente } = await listaDeBaA(seccion, "un tema")
      await navegar(router, -1)
      await titulo(NOMBRES[B] ?? "")
      await screen.findByText(tituloDeFila(B, 2), {}, ESPERA)
      const sano = manejador
      manejador = (llamada) => {
        const esTemasDeB =
          llamada.url.pathname === `/api/clases/${B}/temas` &&
          llamada.url.searchParams.get("seccion") === temas
        if (esTemasDeB) return errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado.")
        return sano?.(llamada)
      }
      await act(async () => {
        await cliente
          .refetchQueries({ queryKey: claveTemasDeLaSeccion(B, temas), exact: true })
          .catch(() => undefined)
      })
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      const primero = errores()[0] ?? ""
      expect(primero.trim()).not.toBe("")
      manejador = sano

      await navegar(router, 1)
      await titulo(NOMBRES[A] ?? "")
      await screen.findByText(tituloDeFila(A, 2), {}, ESPERA)
      await reposar(150)
      expect(errores(), "en A (sana) salió un aviso de recarga fallida").toEqual([primero])

      await navegar(router, -1)
      await titulo(NOMBRES[B] ?? "")
      await screen.findByText(tituloDeFila(B, 2), {}, ESPERA)
      await reposar(150)
      expect(errores(), "al volver a B se repitió el aviso del fallo ya avisado").toEqual([primero])
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// Puntos 3, 4 y 5: las entregas de una tarea con la Forma C (ListaDeEntregasDeLaTarea, key={tareaId}).
// ---------------------------------------------------------------------------------------------------

const ALUMNOS_DE_LA_LISTA = Array.from({ length: 21 }, (_, i) => ({
  id: uuid("6c6c3c4d", 100 + i),
  nombre: `Alumno ${String(i + 1)}`,
}))
const filaDeLaLista = (alumno: { id: string; nombre: string }) => ({
  alumno,
  estado: "asignado",
  fechaEntrega: null,
  conRetraso: false,
})
const rutaEntregas = (tareaId: string) => `${BASE("maestro", A)}/tareas/${tareaId}/entregas`
const apiEntregas = (tareaId: string) => `/api/clases/${A}/tareas/${tareaId}/entregas`
const apiTarea = (tareaId: string) => `/api/clases/${A}/tareas/${tareaId}`
const ULTIMO = ALUMNOS_DE_LA_LISTA[20] ?? { id: "", nombre: "" }
const ultimaPagina = () =>
  respuestaJson(200, {
    entregas: [filaDeLaLista(ULTIMO)],
    total: 21,
    entregadas: 0,
    siguienteCursor: null,
  })

const siguientes = new Map<string, Respuesta[]>()
const conListasEnPaginas = () => {
  siguientes.clear()
  manejador = (llamada) => {
    if (llamada.metodo !== "GET") return undefined
    const tareaId = [T1, T2].find((id) => llamada.url.pathname === apiEntregas(id))
    if (tareaId === undefined) return undefined
    if (llamada.url.searchParams.get("cursor") === null) {
      return respuestaJson(200, {
        entregas: ALUMNOS_DE_LA_LISTA.slice(0, 20).map(filaDeLaLista),
        total: 21,
        entregadas: 0,
        siguienteCursor: ALUMNOS_DE_LA_LISTA[19]?.id ?? null,
      })
    }
    const propia = siguientes.get(tareaId)?.shift()
    if (propia !== undefined) return Promise.resolve().then(propia)
    return ultimaPagina()
  }
}
const paginasSiguientesDe = (tareaId: string) =>
  llamadas.filter(
    (l) =>
      l.metodo === "GET" &&
      l.url.pathname === apiEntregas(tareaId) &&
      l.url.searchParams.get("cursor") !== null,
  ).length
const primerasPaginasDe = (tareaId: string) =>
  llamadas.filter(
    (l) =>
      l.metodo === "GET" &&
      l.url.pathname === apiEntregas(tareaId) &&
      l.url.searchParams.get("cursor") === null,
  ).length
const lecturasDeLaTarea = (tareaId: string) =>
  llamadas.filter((l) => l.metodo === "GET" && l.url.pathname === apiTarea(tareaId)).length
const listaLista = async (tareaId: string) => {
  await waitFor(
    () => expect(screen.queryAllByText(TITULOS[tareaId] ?? "").length).toBeGreaterThan(0),
    ESPERA,
  )
  await waitFor(() => expect(screen.queryAllByText("Alumno 20").length).toBeGreaterThan(0), ESPERA)
  return await buscarBoton("Ver más alumnos")
}
const enlaceDeLaFila = (nombre: string) => {
  const fila = screen.getAllByText(nombre)[0]?.closest("[data-entrega-de-alumno]")
  if (!(fila instanceof HTMLElement)) throw new Error(`Precondición: la fila de «${nombre}»`)
  return within(fila).getByRole("link")
}

// Monta las entregas de T2, salta a las de T1 (push), pide la página siguiente de T1 (retenida) y
// vuelve a T2 con el historial.
const conLaPaginaDeT1EnVuelo = async (pagina?: ReturnType<typeof retenida>) => {
  servidor.rol = "maestro"
  conListasEnPaginas()
  const deT1 = pagina ?? retenida()
  siguientes.set(T1, [deT1.respuesta])
  const montado = await montar(rutaEntregas(T2))
  await listaLista(T2)
  await navegar(montado.router, rutaEntregas(T1))
  fireEvent.click(await listaLista(T1))
  await waitFor(() => expect(paginasSiguientesDe(T1)).toBe(1), ESPERA)
  await navegar(montado.router, -1)
  const verMasDeT2 = await listaLista(T2)
  return { ...montado, deT1, verMasDeT2 }
}

describe("ataque CHORE-06a r2 · las entregas de una tarea con la Forma C", () => {
  it("ATQ-CH6-20: tras el salto, con el foco en «Ver más alumnos» de T2, su última página lleva el foco al «Ver entrega» de la primera fila nueva (Alumno 21)", async () => {
    const { verMasDeT2, deT1 } = await conLaPaginaDeT1EnVuelo()
    act(() => verMasDeT2.focus())
    fireEvent.click(verMasDeT2)
    await waitFor(
      () => expect(screen.queryAllByText(ULTIMO.nombre).length).toBeGreaterThan(0),
      ESPERA,
    )
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Ver más alumnos" })).toBeNull(),
    )
    await reposar(100)
    expect(document.activeElement).toBe(enlaceDeLaFila(ULTIMO.nombre))
    await deT1.soltar(ultimaPagina)
    await reposar(100)
    expect(document.activeElement).toBe(enlaceDeLaFila(ULTIMO.nombre))
    expect(errores()).toEqual([])
  })

  it("ATQ-CH6-21: T1 → T2 → T1 con la página de T1 en vuelo: al volver, «Ver más alumnos» de T1 está en espera, un clic no pide otra y la página llega una sola vez", async () => {
    const { router, deT1 } = await conLaPaginaDeT1EnVuelo()
    await navegar(router, 1)
    const verMasDeT1 = await listaLista(T1)
    await waitFor(() => expect(verMasDeT1).toHaveAttribute("aria-busy", "true"), ESPERA)
    fireEvent.click(verMasDeT1)
    await reposar(100)
    expect(paginasSiguientesDe(T1)).toBe(1)
    await deT1.soltar(ultimaPagina)
    await waitFor(
      () => expect(screen.queryAllByText(ULTIMO.nombre).length).toBeGreaterThan(0),
      ESPERA,
    )
    await reposar(100)
    expect(paginasSiguientesDe(T1)).toBe(1)
    expect(errores()).toEqual([])
  })

  it("ATQ-CH6-22: tras el salto, dos clics en el mismo render en «Ver más alumnos» de T2 piden su página una sola vez", async () => {
    const { verMasDeT2, deT1 } = await conLaPaginaDeT1EnVuelo()
    act(() => {
      fireEvent.click(verMasDeT2)
      fireEvent.click(verMasDeT2)
    })
    await waitFor(
      () => expect(screen.queryAllByText(ULTIMO.nombre).length).toBeGreaterThan(0),
      ESPERA,
    )
    await reposar(100)
    expect(paginasSiguientesDe(T2)).toBe(1)
    await deT1.soltar(ultimaPagina)
  })

  it.each([
    {
      caso: "404 TAREA_NO_ENCONTRADA",
      respuesta: () => errorApi(404, "TAREA_NO_ENCONTRADA", "Esa tarea ya no existe."),
      refrescoFalla: false,
      redirigeA: null,
    },
    {
      caso: "409 CLASE_ARCHIVADA",
      respuesta: () => errorApi(409, "CLASE_ARCHIVADA", "La clase está archivada."),
      refrescoFalla: false,
      redirigeA: null,
    },
    {
      caso: "403 ACCESO_RESTRINGIDO",
      respuesta: () => errorApi(403, "ACCESO_RESTRINGIDO", "Tu acceso está restringido."),
      refrescoFalla: false,
      redirigeA: "/acceso-restringido",
    },
    {
      caso: "401 y el refresco rechazado",
      respuesta: () => errorApi(401, "NO_AUTENTICADO", "El token venció."),
      refrescoFalla: true,
      redirigeA: "/login",
    },
  ] as const)(
    "ATQ-CH6-23: la página de T1 responde $caso estando en T2: en T2 nada se reemplaza, ningún aviso, la ruta no cambia e irA sale una vez solo si redirige",
    async ({ respuesta, refrescoFalla, redirigeA }) => {
      const { router, deT1, verMasDeT2 } = await conLaPaginaDeT1EnVuelo()
      act(() => verMasDeT2.focus())
      if (refrescoFalla) {
        preparar("POST /api/auth/refrescar", () => errorApi(401, "NO_AUTENTICADO", "Sin sesión."))
      }
      await deT1.soltar(respuesta)
      await reposar(200)
      expect(screen.queryAllByText("Alumno 20").length).toBeGreaterThan(0)
      expect(screen.queryAllByRole("alert")).toHaveLength(0)
      expect(document.activeElement).toBe(verMasDeT2)
      expect(router.state.location.pathname).toBe(rutaEntregas(T2))
      expect(errores()).toEqual([])
      if (redirigeA === null) {
        expect(navegacion.irA).not.toHaveBeenCalled()
        return
      }
      expect(navegacion.irA).toHaveBeenCalledTimes(1)
      expect(navegacion.irA).toHaveBeenCalledWith(redirigeA)
    },
  )

  it("ATQ-CH6-24: una sola petición por consulta (R-07): al montar, al saltar a T2 sin caché, al volver a T1 en caché, al volver a T1 con su caché vieja y al recargarla", async () => {
    servidor.rol = "maestro"
    conListasEnPaginas()
    const { router, cliente } = await montar(rutaEntregas(T1))
    await listaLista(T1)
    await reposar(100)
    expect([lecturasDeLaTarea(T1), primerasPaginasDe(T1)]).toEqual([1, 1])

    await navegar(router, rutaEntregas(T2))
    await listaLista(T2)
    await reposar(100)
    expect([lecturasDeLaTarea(T2), primerasPaginasDe(T2)]).toEqual([1, 1])

    await navegar(router, -1)
    await listaLista(T1)
    await reposar(100)
    expect([lecturasDeLaTarea(T1), primerasPaginasDe(T1)]).toEqual([1, 1])

    await navegar(router, 1)
    await listaLista(T2)
    const deT1 = (consulta: { queryKey: readonly unknown[] }) => consulta.queryKey.includes(T1)
    await act(async () => {
      await cliente.invalidateQueries({ predicate: deT1, refetchType: "none" })
    })
    await navegar(router, -1)
    await listaLista(T1)
    await reposar(150)
    expect([lecturasDeLaTarea(T1), primerasPaginasDe(T1)]).toEqual([2, 2])

    await act(async () => {
      await cliente.invalidateQueries({ predicate: deT1 })
    })
    await reposar(150)
    expect([lecturasDeLaTarea(T1), primerasPaginasDe(T1)]).toEqual([3, 3])
    expect(errores()).toEqual([])
  })
})
