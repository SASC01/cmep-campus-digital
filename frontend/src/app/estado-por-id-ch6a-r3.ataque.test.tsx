import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { StrictMode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import {
  claveRecurso,
  claveTemasDeLaSeccion,
  ID_DEL_AVISO_DE_RECARGA_DE_RECURSOS,
} from "@/features/clases/data"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Ataque del Tester, CHORE-06a, ronda 3 (la última). Con el router real (`rutas` de app/router) y las
// defaultOptions de app/providers.tsx; "salto del historial" es router.navigate(-1) o (1) entre dos
// entradas de la misma ruta con otro id, con el destino en caché. Puntos de ataque finales del manager
// (revision.md, "Verificación de la corrección de la ronda 2 — CHORE-06a"):
// 1. useAvisoDeRecargaFallida de clases con su clave: A → B → A con fallos en las dos, un fallo ya
//    ocurrido al llegar, StrictMode y editar recurso de R1 a R2.
// 2. «Sin tema» montada de nuevo: la página de «Ver más» de A que llega estando en B (Actividades) y el
//    aviso compartido de Recursos.
// 3. Avisos y Dudas con «Ver más» al saltar de clase, y la conducta de siempre en la misma clase.
// 4. Un 409 CLASE_ARCHIVADA de A que llega estando en B (useDetalleViejoAnteClaseArchivada).
// Y, por cuenta propia: la exportación del gradebook de A en vuelo al saltar a B. El arnés sigue el de
// app/estado-por-id-ch6.test.tsx. Sin selectores de clases de estilo.

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
const enfocado = () => {
  const activo = document.activeElement
  return activo?.closest("li")?.textContent?.slice(0, 40) ?? activo?.textContent ?? "(nada)"
}

// ---------------------------------------------------------------------------------------------------
// Dobles de las listas de la clase: temas por sección, recursos, actividades, avisos y dudas.
// ---------------------------------------------------------------------------------------------------

type Agrupacion = "Sin tema" | "un tema"
const idDeFila = (claseId: string, n: number) => uuid("8c8c3c4d", (claseId === A ? 100 : 200) + n)
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
const avisoDeLista = (claseId: string, n: number) => ({
  id: idDeFila(claseId, n),
  tipo: "anuncio",
  titulo: null,
  texto: tituloDeFila(claseId, n),
  autor: FIRMA,
  creadoEn: CREADO_EN,
  comentarios: 0,
  adjuntos: [],
  puedeBorrar: true,
  tarea: null,
})
const dudaDeLista = (claseId: string, n: number) => ({
  id: idDeFila(claseId, n),
  texto: tituloDeFila(claseId, n),
  autor: FIRMA,
  creadoEn: CREADO_EN,
  resuelta: false,
  resueltaEn: null,
  respuestas: 0,
  propia: true,
  puedeBorrar: true,
  puedeMarcar: true,
})

interface Listas {
  agrupacion: Agrupacion
  // Clases cuya primera página trae una siguiente.
  conMas: Set<string>
  // Clases cuyas listas de temas (y de recursos) responden 503.
  fallan: Set<string>
  // Respuestas propias de la página siguiente de A (en orden).
  siguientesDeA: Respuesta[]
}
let listas: Listas
const conListas = (agrupacion: Agrupacion) => {
  listas = { agrupacion, conMas: new Set(), fallan: new Set(), siguientesDeA: [] }
  manejador = (llamada) => {
    if (llamada.metodo !== "GET") return undefined
    const [, , , claseId, recurso] = llamada.url.pathname.split("/")
    if (claseId === undefined || llamada.url.pathname.split("/").length !== 5) return undefined
    const parametros = llamada.url.searchParams
    if (recurso === "temas") {
      const seccion = parametros.get("seccion")
      if (seccion !== "docente" && seccion !== "actividades") return undefined
      if (listas.fallan.has(claseId)) return errorApi(503, "SERVICIO_OCUPADO", "Ocupado.")
      return respuestaJson(
        200,
        listas.agrupacion === "Sin tema"
          ? { temas: [], sinTema: 2 }
          : {
              temas: [{ id: temaDe(claseId), nombre: "Unidad 1", orden: 0, elementos: 2 }],
              sinTema: 0,
            },
      )
    }
    const formas: Record<string, [string, (claseId: string, n: number) => unknown]> = {
      recursos: ["recursos", recursoDeLista],
      trabajo: ["elementos", materialDeLista],
      publicaciones: ["publicaciones", avisoDeLista],
      dudas: ["dudas", dudaDeLista],
    }
    const forma = recurso === undefined ? undefined : formas[recurso]
    if (forma === undefined) return undefined
    if (recurso === "recursos" && parametros.get("bloque") !== "docente") return undefined
    if (recurso === "recursos" && listas.fallan.has(claseId)) {
      return errorApi(503, "SERVICIO_OCUPADO", "Ocupado.")
    }
    const [campo, fila] = forma
    if (parametros.get("cursor") !== null) {
      const propia = claseId === A ? listas.siguientesDeA.shift() : undefined
      if (propia !== undefined) return Promise.resolve().then(propia)
      return respuestaJson(200, { [campo]: [fila(claseId, 3)], siguienteCursor: null })
    }
    return respuestaJson(200, {
      [campo]: [fila(claseId, 1), fila(claseId, 2)],
      siguienteCursor: listas.conMas.has(claseId) ? idDeFila(claseId, 2) : null,
    })
  }
}

// Monta la lista de B y salta a la de A (push): las dos quedan en caché.
const listaDeBaA = async (seccion: string, estricto = false) => {
  servidor.rol = "maestro"
  const montado = await montar(`${BASE("maestro", B)}${seccion}`, estricto)
  await titulo(NOMBRES[B] ?? "")
  await screen.findAllByText(tituloDeFila(B, 2), {}, ESPERA)
  await navegar(montado.router, `${BASE("maestro", A)}${seccion}`)
  await titulo(NOMBRES[A] ?? "")
  await screen.findAllByText(tituloDeFila(A, 2), {}, ESPERA)
  return montado
}
const enLaClase = async (claseId: string) => {
  await titulo(NOMBRES[claseId] ?? "")
  await screen.findAllByText(tituloDeFila(claseId, 2), {}, ESPERA)
  await reposar(150)
}

// ---------------------------------------------------------------------------------------------------
// Punto 1: useAvisoDeRecargaFallida de clases con su clave.
// ---------------------------------------------------------------------------------------------------

const LISTAS_CON_TEMAS = [
  { nombre: "Recursos", seccion: "/recursos", temas: "docente" },
  { nombre: "Actividades", seccion: "/trabajo", temas: "actividades" },
] as const

const recargarLosTemas = async (
  cliente: QueryClient,
  claseId: string,
  temas: "docente" | "actividades",
  todas = false,
) => {
  await act(async () => {
    await cliente.refetchQueries({
      queryKey: claveTemasDeLaSeccion(claseId, temas),
      exact: true,
      ...(todas ? { type: "all" as const } : {}),
    })
  })
}

describe("ataque CHORE-06a r3 · el aviso de recarga con su clave", () => {
  it.each(LISTAS_CON_TEMAS)(
    "ATQ-CH6-25 ($nombre): A → B → A → B con un fallo en A y otro en B: un aviso por fallo, en la clase donde ocurre, y ninguno al saltar",
    async ({ seccion, temas }) => {
      conListas("un tema")
      const { router, cliente } = await listaDeBaA(seccion)
      listas.fallan.add(A)
      await recargarLosTemas(cliente, A, temas)
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      listas.fallan.delete(A)

      await navegar(router, -1)
      await enLaClase(B)
      expect(errores(), "al saltar a B").toHaveLength(1)
      listas.fallan.add(B)
      await recargarLosTemas(cliente, B, temas)
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
      listas.fallan.delete(B)

      await navegar(router, 1)
      await enLaClase(A)
      expect(errores(), "al volver a A").toHaveLength(2)
      await navegar(router, -1)
      await enLaClase(B)
      expect(errores(), "al volver a B").toHaveLength(2)
    },
  )

  it.each(LISTAS_CON_TEMAS)(
    "ATQ-CH6-26 ($nombre): un fallo de B ocurrido fuera de la vista no se avisa al llegar (como una vista con key); uno que llega después, una vez",
    async ({ seccion, temas }) => {
      conListas("un tema")
      const { router, cliente } = await listaDeBaA(seccion)
      listas.fallan.add(B)
      await recargarLosTemas(cliente, B, temas, true)
      await waitFor(
        () =>
          expect(
            cliente.getQueryState(claveTemasDeLaSeccion(B, temas))?.errorUpdateCount,
          ).toBeGreaterThan(0),
        ESPERA,
      )
      expect(errores(), "con B fuera de la vista").toEqual([])

      await navegar(router, -1)
      await enLaClase(B)
      expect(errores(), "al llegar a B con su fallo ya ocurrido").toEqual([])
      await recargarLosTemas(cliente, B, temas)
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      await reposar(150)
      expect(errores()).toHaveLength(1)
    },
  )

  it("ATQ-CH6-27 (Recursos con StrictMode): el fallo de B avisa una vez y el salto a A no repite nada", async () => {
    conListas("un tema")
    const { router, cliente } = await listaDeBaA("/recursos", true)
    await navegar(router, -1)
    await enLaClase(B)
    listas.fallan.add(B)
    await recargarLosTemas(cliente, B, "docente")
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    listas.fallan.delete(B)
    await reposar(150)
    expect(errores()).toHaveLength(1)
    await navegar(router, 1)
    await enLaClase(A)
    expect(errores()).toHaveLength(1)
  })

  it("ATQ-CH6-28 (editar recurso): la recarga de R1 falla y avisa una vez; al saltar a R2 no se repite, y un fallo de R2 avisa una vez", async () => {
    servidor.rol = "maestro"
    const rutaR = (id: string) => `${BASE("maestro", A)}/recursos/${id}/editar`
    const { router, cliente } = await montar(rutaR(R2))
    await waitFor(
      () => expect(screen.getByLabelText("Título del recurso")).toHaveValue(RECURSOS[R2]),
      ESPERA,
    )
    await navegar(router, rutaR(R1))
    await waitFor(
      () => expect(screen.getByLabelText("Título del recurso")).toHaveValue(RECURSOS[R1]),
      ESPERA,
    )
    const falla = () => errorApi(503, "SERVICIO_OCUPADO", "Ocupado.")
    preparar(`GET /api/clases/${A}/recursos/${R1}`, falla, falla)
    await act(async () => {
      await cliente.refetchQueries({ queryKey: claveRecurso(A, R1), exact: true })
    })
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)

    await navegar(router, -1)
    await waitFor(
      () => expect(screen.getByLabelText("Título del recurso")).toHaveValue(RECURSOS[R2]),
      ESPERA,
    )
    await reposar(150)
    expect(errores(), "al saltar a R2").toHaveLength(1)
    preparar(`GET /api/clases/${A}/recursos/${R2}`, falla, falla)
    await act(async () => {
      await cliente.refetchQueries({ queryKey: claveRecurso(A, R2), exact: true })
    })
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
    await reposar(150)
    expect(errores()).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------------------------------
// Punto 2: «Sin tema» montada de nuevo por clase.
// ---------------------------------------------------------------------------------------------------

describe("ataque CHORE-06a r3 · «Sin tema» de Actividades con «Ver más» y el aviso compartido de Recursos", () => {
  it.each([
    [
      "con éxito",
      () => respuestaJson(200, { elementos: [materialDeLista(A, 3)], siguienteCursor: null }),
    ],
    ["con 503", () => errorApi(503, "SERVICIO_OCUPADO", "Ocupado.")],
  ] as const)(
    "ATQ-CH6-29: «Ver más de Sin tema» de A en vuelo con el foco en él, salto a B y la página de A llega %s: el foco va al h2 y se queda, nada de A en B y ningún aviso",
    async (_caso, respuesta) => {
      conListas("Sin tema")
      listas.conMas.add(A)
      const pendiente = retenida()
      listas.siguientesDeA.push(pendiente.respuesta)
      const { router } = await listaDeBaA("/trabajo")
      const verMas = await buscarBoton("Ver más de Sin tema")
      act(() => verMas.focus())
      fireEvent.click(verMas)
      await waitFor(
        () =>
          expect(
            llamadas.filter(
              (l) =>
                l.url.pathname === `/api/clases/${A}/trabajo` &&
                l.url.searchParams.get("cursor") !== null,
            ),
          ).toHaveLength(1),
        ESPERA,
      )

      await navegar(router, -1)
      await enLaClase(B)
      const encabezado = h2("Actividades de aprendizaje")
      expect(document.activeElement, `el foco quedó en «${enfocado()}»`).toBe(encabezado)
      await pendiente.soltar(respuesta)
      await reposar(200)
      expect(document.activeElement, `el foco quedó en «${enfocado()}»`).toBe(encabezado)
      expect(screen.queryAllByText(tituloDeFila(A, 3))).toHaveLength(0)
      expect(errores()).toEqual([])
    },
  )

  it("ATQ-CH6-30: en Recursos de B, la lista de temas del bloque y la de «Sin tema» fallan a la vez: cada aviso lleva el mismo id (uno a la vista) y ninguno sale al saltar a A", async () => {
    conListas("Sin tema")
    const { router, cliente } = await listaDeBaA("/recursos")
    await navegar(router, -1)
    await enLaClase(B)
    listas.fallan.add(B)
    await act(async () => {
      await cliente.refetchQueries({
        predicate: (consulta) =>
          consulta.queryKey.includes(B) && consulta.queryKey.includes("docente"),
      })
    })
    await waitFor(() => expect(aviso.error.mock.calls.length).toBeGreaterThan(0), ESPERA)
    await reposar(300)
    listas.fallan.delete(B)
    const llamadasDeB = aviso.error.mock.calls.length
    for (const [, opciones] of aviso.error.mock.calls) {
      expect(opciones).toEqual({ id: ID_DEL_AVISO_DE_RECARGA_DE_RECURSOS })
    }
    await navegar(router, 1)
    await enLaClase(A)
    expect(aviso.error.mock.calls).toHaveLength(llamadasDeB)
  })
})

// ---------------------------------------------------------------------------------------------------
// Punto 3: Avisos y Dudas con «Ver más» al saltar de clase.
// ---------------------------------------------------------------------------------------------------

const LISTAS_CON_VER_MAS = [
  { nombre: "Avisos", seccion: "", verMas: "Ver más avisos", encabezado: "Avisos" },
  { nombre: "Dudas", seccion: "/dudas", verMas: "Ver más dudas", encabezado: "Dudas" },
] as const

describe("ataque CHORE-06a r3 · Avisos y Dudas con «Ver más» al saltar de clase", () => {
  it.each(LISTAS_CON_VER_MAS)(
    "ATQ-CH6-31 ($nombre): con el foco en «Ver más» de A y B también con página siguiente, el salto deja el foco en «Ver más» de B",
    async ({ seccion, verMas }) => {
      conListas("un tema")
      listas.conMas.add(A)
      listas.conMas.add(B)
      const { router } = await listaDeBaA(seccion)
      const deA = await buscarBoton(verMas)
      act(() => deA.focus())

      await navegar(router, -1)
      await enLaClase(B)
      const deB = await buscarBoton(verMas)
      expect(document.activeElement, `el foco quedó en «${enfocado()}»`).toBe(deB)
    },
  )

  it.each(LISTAS_CON_VER_MAS)(
    "ATQ-CH6-32 ($nombre): con la página de A en vuelo y el foco en «Ver más», el salto a B (sin más) lleva el foco al encabezado; al llegar la página de A no se mueve ni aparece nada de A",
    async ({ seccion, verMas, encabezado }) => {
      conListas("un tema")
      listas.conMas.add(A)
      const pendiente = retenida()
      listas.siguientesDeA.push(pendiente.respuesta)
      const { router } = await listaDeBaA(seccion)
      const deA = await buscarBoton(verMas)
      act(() => deA.focus())
      fireEvent.click(deA)
      await reposar(100)

      await navegar(router, -1)
      await enLaClase(B)
      const titulo2 = h2(encabezado)
      expect(document.activeElement, `el foco quedó en «${enfocado()}»`).toBe(titulo2)
      await pendiente.soltar(() =>
        respuestaJson(200, {
          [seccion === "" ? "publicaciones" : "dudas"]: [
            seccion === "" ? avisoDeLista(A, 3) : dudaDeLista(A, 3),
          ],
          siguienteCursor: null,
        }),
      )
      await reposar(200)
      expect(document.activeElement, `el foco quedó en «${enfocado()}»`).toBe(titulo2)
      expect(screen.queryAllByText(tituloDeFila(A, 3))).toHaveLength(0)
      expect(errores()).toEqual([])
    },
  )

  it.each(LISTAS_CON_VER_MAS)(
    "ATQ-CH6-33 ($nombre): en la misma clase, la última página lleva el foco a la primera fila nueva (sin cambio de conducta)",
    async ({ seccion, verMas }) => {
      conListas("un tema")
      listas.conMas.add(A)
      await listaDeBaA(seccion)
      const deA = await buscarBoton(verMas)
      act(() => deA.focus())
      fireEvent.click(deA)
      await screen.findAllByText(tituloDeFila(A, 3), {}, ESPERA)
      await reposar(150)
      const atributo = seccion === "" ? "data-publicacion-id" : "data-duda-id"
      const nueva = document.querySelector(`[${atributo}="${idDeFila(A, 3)}"]`)
      expect(nueva, "Precondición: la fila nueva está en la lista").not.toBeNull()
      expect(document.activeElement, `el foco quedó en «${enfocado()}»`).toBe(nueva)
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// Punto 4: un 409 CLASE_ARCHIVADA de una escritura de A que llega estando en B.
// ---------------------------------------------------------------------------------------------------

describe("ataque CHORE-06a r3 · un 409 CLASE_ARCHIVADA de A estando en B", () => {
  it("ATQ-CH6-34: publicar en A, saltar a B y A responde 409 CLASE_ARCHIVADA: B no pasa a solo lectura, lo escrito y el foco de B se quedan, como mucho un aviso y una lectura de más del detalle de B; al volver, A sí se lee archivada", async () => {
    servidor.rol = "maestro"
    const pendiente = retenida()
    preparar(`POST /api/clases/${A}/publicaciones`, pendiente.respuesta)
    const { router } = await montar(BASE("maestro", B))
    await titulo(NOMBRES[B] ?? "")
    await navegar(router, BASE("maestro", A))
    await titulo(NOMBRES[A] ?? "")
    const anuncioA = await screen.findByLabelText("Anuncio", {}, ESPERA)
    fireEvent.change(anuncioA, { target: { value: "Aviso para Historia" } })
    fireEvent.click(await buscarBoton("Publicar anuncio"))
    await waitFor(() => expect(llamadas.filter((l) => l.metodo === "POST")).toHaveLength(1))

    await navegar(router, -1)
    await titulo(NOMBRES[B] ?? "")
    const anuncioB = await screen.findByLabelText("Anuncio", {}, ESPERA)
    fireEvent.change(anuncioB, { target: { value: "Escrito en B" } })
    act(() => anuncioB.focus())
    await reposar(150)
    const detallesDeB = llamadas.filter((l) => l.url.pathname === `/api/clases/${B}`).length

    servidor.archivadas.add(A)
    await pendiente.soltar(() => errorApi(409, "CLASE_ARCHIVADA", "La clase está archivada."))
    await reposar(300)
    expect(screen.queryAllByText(/^Clase archivada el /)).toHaveLength(0)
    expect(screen.getByLabelText("Anuncio")).toBe(anuncioB)
    expect(anuncioB).toHaveValue("Escrito en B")
    expect(document.activeElement).toBe(anuncioB)
    expect(aviso.error.mock.calls.length).toBeLessThanOrEqual(1)
    expect(
      llamadas.filter((l) => l.url.pathname === `/api/clases/${B}`).length - detallesDeB,
    ).toBeLessThanOrEqual(1)

    await navegar(router, 1)
    await titulo(NOMBRES[A] ?? "")
    await screen.findByText(/^Clase archivada el /, {}, ESPERA)
  })
})

// ---------------------------------------------------------------------------------------------------
// Por cuenta propia: la exportación del gradebook de A en vuelo al saltar a B (GradebookDeLaClase lleva
// key por la clase desde 06a: la exportación de A se aborta).
// ---------------------------------------------------------------------------------------------------

describe("ataque CHORE-06a r3 · la exportación del gradebook al cambiar de clase", () => {
  it("ATQ-CH6-35: «Exportar a Excel» de A en vuelo, salto a B y A responde: ningún aviso, «Exportar a Excel» de B no está en espera y pide la exportación de B", async () => {
    servidor.rol = "maestro"
    const pendiente = retenida()
    manejador = (llamada) =>
      llamada.url.pathname === `/api/clases/${A}/calificaciones/exportacion`
        ? pendiente.respuesta()
        : undefined
    const ruta = (claseId: string) => `${BASE("maestro", claseId)}/calificaciones`
    const { router } = await montar(ruta(B))
    await titulo(NOMBRES[B] ?? "")
    await buscarBoton("Exportar a Excel")
    await navegar(router, ruta(A))
    await titulo(NOMBRES[A] ?? "")
    fireEvent.click(await buscarBoton("Exportar a Excel"))
    await waitFor(
      () =>
        expect(
          llamadas.filter((l) => l.url.pathname === `/api/clases/${A}/calificaciones/exportacion`),
        ).toHaveLength(1),
      ESPERA,
    )

    await navegar(router, -1)
    await titulo(NOMBRES[B] ?? "")
    const deB = await buscarBoton("Exportar a Excel")
    expect(deB.getAttribute("aria-busy")).not.toBe("true")
    await pendiente.soltar(() => errorApi(503, "SERVICIO_OCUPADO", "Ocupado."))
    await reposar(200)
    expect(errores()).toEqual([])
    expect(aviso.success).not.toHaveBeenCalled()
    fireEvent.click(deB)
    await waitFor(
      () =>
        expect(
          llamadas.filter((l) => l.url.pathname === `/api/clases/${B}/calificaciones/exportacion`),
        ).toHaveLength(1),
      ESPERA,
    )
  })
})
