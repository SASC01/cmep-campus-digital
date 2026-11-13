import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { StrictMode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { claveClaseDetalle } from "@/services/clasesService"
import { establecerToken, limpiarToken, obtenerToken } from "@/services/tokenAcceso"

// Ataque del Tester, CHORE-06a, ronda 1. Con el router real (`rutas` de app/router) y las defaultOptions
// de app/providers.tsx; "salto del historial" es router.navigate(-1) o (1) entre dos entradas de la misma
// ruta con otro id, con el destino en caché. La red se dobla con fetch y lo que debe quedar en vuelo se
// retiene. Puntos de ataque del manager (revision.md, "Verificación del resumen del programador —
// CHORE-06a") y del plan:
// 1. EntregasDeLaTarea sin key: sus refs de «Ver más alumnos» sobreviven al salto de T1 a T2.
// 2. El salto combinado con un código que redirige, con 5xx, con red y con un código que no redirige.
// 3. La regla de PA-1: un guardado que llega con la vista desmontada avisa y no navega.
// 4. La Forma C con StrictMode y con la clase que se archiva en medio.
// 5. R-03 al revés: un 401 sin token enviado.
// 7. Los render props de varias líneas (los maestros del maestro en Personas).
// El arnés (dobles, montar, navegar, retenida) sigue el de app/estado-por-id-ch6.test.tsx. Sin
// selectores de clases de estilo.

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

const pedidas = (metodo: string, ruta: string) =>
  llamadas.filter((l) => l.metodo === metodo && l.url.pathname === ruta)

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
const pulsar = async (nombre: string | RegExp) => {
  fireEvent.click(await buscarBoton(nombre))
}
const campo = (etiqueta: string | RegExp) => screen.findByLabelText(etiqueta, {}, ESPERA)
const escribir = async (etiqueta: string | RegExp, valor: string) => {
  fireEvent.change(await campo(etiqueta), { target: { value: valor } })
}
const valorDe = async (etiqueta: string | RegExp) => {
  const elemento = await campo(etiqueta)
  if (!(elemento instanceof HTMLInputElement || elemento instanceof HTMLTextAreaElement)) {
    throw new Error(`Precondición: «${String(etiqueta)}» es un campo de texto`)
  }
  return elemento.value
}
const nadaEnEspera = () => expect(screen.queryAllByRole("button", { busy: true })).toHaveLength(0)

// La raíz de la vista de la ruta: el último hijo de la raíz de la clase (ClaseLayout pinta su Outlet
// al final), enfocable con tabIndex -1.
const raizDeLaVista = () => {
  const tituloDeLaClase = screen.getByRole("heading", { level: 1 })
  const raizDeLaClase = tituloDeLaClase.parentElement?.closest('[tabindex="-1"]')
  const raiz = raizDeLaClase?.lastElementChild
  if (!(raiz instanceof HTMLElement) || raiz.getAttribute("tabindex") !== "-1") {
    throw new Error("Precondición: la vista tiene su raíz enfocable al final de la clase")
  }
  return raiz
}

const BASE = (rol: Rol, claseId: string) => `/${rol}/clases/${claseId}`

const rutaTarea = (tareaId: string, resto = "") => `${BASE("maestro", A)}/tareas/${tareaId}${resto}`
const rutaEntrega = (tareaId: string, alumnoId: string) =>
  `${BASE("maestro", A)}/tareas/${tareaId}/entregas/${alumnoId}`
const rutaApiEntrega = (tareaId: string, alumnoId: string) =>
  `/api/clases/${A}/tareas/${tareaId}/entregas/${alumnoId}`
const rutaRecurso = (recursoId: string) => `${BASE("maestro", A)}/recursos/${recursoId}/editar`
const rutaNueva = (claseId: string) => `${BASE("maestro", claseId)}/tareas/nueva`
const CLARIDAD = "Claridad (de 5 puntos)"
const ORTOGRAFIA = "Ortografía (de 5 puntos)"
const TITULO_RECURSO = "Título del recurso"
const ARCHIVADA = "Esta clase está archivada: solo se puede consultar."
const TAREA_NUEVA_A = uuid("7e7e3c4d", 1)
const TAREA_NUEVA_B = uuid("7e7e3c4d", 2)

const tituloDeLaTareaEs = (tareaId: string) =>
  waitFor(async () => expect(await valorDe("Título")).toBe(TITULOS[tareaId]), ESPERA)
const tituloDelRecursoEs = (recursoId: string) =>
  waitFor(async () => expect(await valorDe(TITULO_RECURSO)).toBe(RECURSOS[recursoId]), ESPERA)
const llenarTarea = async (tituloDeLaTarea: string) => {
  await escribir("Título", tituloDeLaTarea)
  await escribir("Instrucciones (opcional)", `Instrucciones de ${tituloDeLaTarea}`)
  await escribir("Fecha límite", "2030-01-15T10:00")
}
const errores = () => aviso.error.mock.calls.map(([texto]) => String(texto))
const tareaCreada = (tareaId: string) => () => respuestaJson(201, tareaDoble(tareaId))

// Archiva (o restaura) la clase en el doble y hace que la sesión la lea: la caché del detalle se marca
// vieja y se vuelve a pedir aunque nadie la observe.
const archivarEnElServidor = async (cliente: QueryClient, claseId: string, archivada: boolean) => {
  if (archivada) servidor.archivadas.add(claseId)
  if (!archivada) servidor.archivadas.delete(claseId)
  await act(async () => {
    await cliente.invalidateQueries({ queryKey: claveClaseDetalle(claseId), refetchType: "all" })
  })
}

// ---------------------------------------------------------------------------------------------------
// Punto 1 del manager: EntregasDeLaTarea (entregas-view.tsx) no lleva key y guarda refs de «Ver más».
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
const ULTIMO_DE_LA_PRIMERA = ALUMNOS_DE_LA_LISTA[19]?.id ?? ""
const ULTIMO = ALUMNOS_DE_LA_LISTA[20] ?? { id: "", nombre: "" }

// Cada tarea con 21 alumnos: una página de 20 y la siguiente de 1. Lo que se ponga en `siguientes` de una
// tarea responde, en orden, a sus páginas siguientes (con cursor).
const siguientes = new Map<string, Respuesta[]>()
const conListasEnPaginas = () => {
  siguientes.clear()
  manejador = (llamada) => {
    if (llamada.metodo !== "GET") return undefined
    const tareaId = [T1, T2].find((id) => llamada.url.pathname === apiEntregas(id))
    if (tareaId === undefined) return undefined
    const cursor = llamada.url.searchParams.get("cursor")
    if (cursor === null) {
      return respuestaJson(200, {
        entregas: ALUMNOS_DE_LA_LISTA.slice(0, 20).map(filaDeLaLista),
        total: 21,
        entregadas: 0,
        siguienteCursor: ULTIMO_DE_LA_PRIMERA,
      })
    }
    const propia = siguientes.get(tareaId)?.shift()
    if (propia !== undefined) return Promise.resolve().then(propia)
    return respuestaJson(200, {
      entregas: [filaDeLaLista(ULTIMO)],
      total: 21,
      entregadas: 0,
      siguienteCursor: null,
    })
  }
}
const paginasSiguientesDe = (tareaId: string) =>
  llamadas.filter(
    (l) =>
      l.metodo === "GET" &&
      l.url.pathname === apiEntregas(tareaId) &&
      l.url.searchParams.get("cursor") !== null,
  ).length
const listaLista = async (tareaId: string) => {
  await waitFor(
    () => expect(screen.queryAllByText(TITULOS[tareaId] ?? "").length).toBeGreaterThan(0),
    ESPERA,
  )
  await waitFor(() => expect(screen.queryAllByText("Alumno 20").length).toBeGreaterThan(0), ESPERA)
  return await buscarBoton("Ver más alumnos")
}

// Monta las entregas de T2, salta a las de T1 (push), pide la página siguiente de T1 (retenida) y
// vuelve a T2 con el historial.
const conLaPaginaDeT1EnVuelo = async () => {
  servidor.rol = "maestro"
  conListasEnPaginas()
  const deT1 = retenida()
  siguientes.set(T1, [deT1.respuesta])
  const { router } = await montar(rutaEntregas(T2))
  await listaLista(T2)
  await navegar(router, rutaEntregas(T1))
  fireEvent.click(await listaLista(T1))
  await waitFor(() => expect(paginasSiguientesDe(T1)).toBe(1), ESPERA)
  await navegar(router, -1)
  const verMasDeT2 = await listaLista(T2)
  return { router, deT1, verMasDeT2 }
}

describe("ataque CHORE-06a r1 · las entregas de una tarea (EntregasDeLaTarea sin key)", () => {
  it("ATQ-CH6-01: con «Ver más alumnos» de T1 en vuelo, en las entregas de T2 el botón no está en espera y un clic pide la página siguiente de T2", async () => {
    const { deT1, verMasDeT2 } = await conLaPaginaDeT1EnVuelo()
    expect(verMasDeT2.getAttribute("aria-busy")).not.toBe("true")
    expect(paginasSiguientesDe(T2)).toBe(0)

    fireEvent.click(verMasDeT2)
    await reposar(200)
    const pedidasDeT2 = paginasSiguientesDe(T2)
    await deT1.soltar(() =>
      respuestaJson(200, {
        entregas: [filaDeLaLista(ULTIMO)],
        total: 21,
        entregadas: 0,
        siguienteCursor: null,
      }),
    )
    expect(pedidasDeT2, "el clic en «Ver más alumnos» de T2 no pidió nada (clic muerto)").toBe(1)
  })

  it("ATQ-CH6-02: si la página siguiente de T1 falla (503) estando ya en las entregas de T2, en T2 no sale el aviso de T1 y su lista y su «Ver más alumnos» siguen", async () => {
    const { deT1, verMasDeT2 } = await conLaPaginaDeT1EnVuelo()
    await deT1.soltar(() => errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado."))
    await reposar(150)
    expect(screen.queryAllByText("Alumno 20").length).toBeGreaterThan(0)
    expect(verMasDeT2.isConnected).toBe(true)
    expect(errores(), "un aviso de la página de T1 salió en la vista de T2").toEqual([])
  })

  it("ATQ-CH6-03: con el foco en «Ver más alumnos» de T2 cuando llega la página de T1, el foco no se mueve y la lista de T2 no cambia", async () => {
    const { deT1, verMasDeT2 } = await conLaPaginaDeT1EnVuelo()
    act(() => verMasDeT2.focus())
    await deT1.soltar(() =>
      respuestaJson(200, {
        entregas: [filaDeLaLista(ULTIMO)],
        total: 21,
        entregadas: 0,
        siguienteCursor: null,
      }),
    )
    await reposar(150)
    expect(document.activeElement).toBe(verMasDeT2)
    expect(screen.queryAllByText(ULTIMO.nombre)).toHaveLength(0)
    expect(errores()).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------------
// Punto 2 del manager: el salto con la escritura de A en vuelo y una respuesta que redirige, 5xx, red o
// un código que no redirige (R-03). En B: lo escrito y el foco se quedan, nada espera, la ruta no cambia.
// ---------------------------------------------------------------------------------------------------

interface Escritura {
  nombre: string
  rol: Rol
  origen: string
  destino: string
  listoEnOrigen: () => Promise<unknown>
  listoEnDestino: () => Promise<unknown>
  clave: string
  hacer: () => Promise<void>
  campoDeDestino: string
}

const ESCRITURAS: readonly Escritura[] = [
  {
    nombre: "crear una tarea",
    rol: "maestro",
    origen: rutaNueva(A),
    destino: rutaNueva(B),
    listoEnOrigen: async () => {
      await titulo(NOMBRES[A] ?? "")
      await campo("Título")
    },
    listoEnDestino: async () => {
      await titulo(NOMBRES[B] ?? "")
      await campo("Título")
    },
    clave: `POST /api/clases/${A}/tareas`,
    hacer: async () => {
      await llenarTarea("Tarea de Historia")
      await pulsar("Publicar tarea")
    },
    campoDeDestino: "Título",
  },
  {
    nombre: "editar una tarea",
    rol: "maestro",
    origen: rutaTarea(T1, "/editar"),
    destino: rutaTarea(T2, "/editar"),
    listoEnOrigen: () => tituloDeLaTareaEs(T1),
    listoEnDestino: () => tituloDeLaTareaEs(T2),
    clave: `PUT /api/clases/${A}/tareas/${T1}`,
    hacer: async () => {
      await escribir("Título", "Cambiado en uno")
      await pulsar("Guardar cambios")
    },
    campoDeDestino: "Título",
  },
  {
    nombre: "editar un recurso",
    rol: "maestro",
    origen: rutaRecurso(R1),
    destino: rutaRecurso(R2),
    listoEnOrigen: () => tituloDelRecursoEs(R1),
    listoEnDestino: () => tituloDelRecursoEs(R2),
    clave: `PUT /api/clases/${A}/recursos/${R1}`,
    hacer: async () => {
      await escribir(TITULO_RECURSO, "Cambiado en uno")
      await pulsar("Guardar cambios")
    },
    campoDeDestino: TITULO_RECURSO,
  },
  {
    nombre: "calificar",
    rol: "maestro",
    origen: rutaEntrega(T1, P1.id),
    destino: rutaEntrega(T1, P2.id),
    listoEnOrigen: () => screen.findByRole("heading", { level: 2, name: P1.nombre }, ESPERA),
    listoEnDestino: () => screen.findByRole("heading", { level: 2, name: P2.nombre }, ESPERA),
    clave: `PUT ${rutaApiEntrega(T1, P1.id)}/calificacion`,
    hacer: async () => {
      await escribir(CLARIDAD, "4")
      await escribir(ORTOGRAFIA, "3")
      await pulsar("Calificar y devolver")
    },
    campoDeDestino: CLARIDAD,
  },
  {
    nombre: "publicar un anuncio",
    rol: "maestro",
    origen: BASE("maestro", A),
    destino: BASE("maestro", B),
    listoEnOrigen: async () => {
      await titulo(NOMBRES[A] ?? "")
      await campo("Anuncio")
    },
    listoEnDestino: async () => {
      await titulo(NOMBRES[B] ?? "")
      await campo("Anuncio")
    },
    clave: `POST /api/clases/${A}/publicaciones`,
    hacer: async () => {
      await escribir("Anuncio", "Aviso para Historia")
      await pulsar("Publicar anuncio")
    },
    campoDeDestino: "Anuncio",
  },
  {
    nombre: "quitar a un alumno",
    rol: "maestro",
    origen: `${BASE("maestro", A)}/personas`,
    destino: `${BASE("maestro", B)}/personas`,
    listoEnOrigen: async () => {
      await titulo(NOMBRES[A] ?? "")
      await buscarBoton(`Quitar ${P1.nombre}`)
    },
    listoEnDestino: async () => {
      await titulo(NOMBRES[B] ?? "")
      await buscarBoton(`Quitar ${P1.nombre}`)
    },
    clave: `DELETE /api/clases/${A}/alumnos/${P1.id}`,
    hacer: async () => {
      await pulsar(`Quitar ${P1.nombre}`)
      await pulsar(`Sí, quitar ${P1.nombre}`)
    },
    campoDeDestino: "Buscar alumno por nombre",
  },
]

interface Final {
  nombre: string
  respuesta: Respuesta
  refrescoFalla: boolean
  // null: el caso es un aviso (5xx, red o un código que no redirige).
  redirigeA: string | null
}

const FINALES: readonly Final[] = [
  {
    nombre: "403 ACCESO_RESTRINGIDO",
    respuesta: () => errorApi(403, "ACCESO_RESTRINGIDO", "Tu acceso está restringido."),
    refrescoFalla: false,
    redirigeA: "/acceso-restringido",
  },
  {
    nombre: "401 y el refresco rechazado",
    respuesta: () => errorApi(401, "NO_AUTENTICADO", "El token venció."),
    refrescoFalla: true,
    redirigeA: "/login",
  },
  {
    nombre: "503",
    respuesta: () => errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado."),
    refrescoFalla: false,
    redirigeA: null,
  },
  {
    nombre: "un error de red",
    respuesta: () => {
      throw new TypeError("Failed to fetch")
    },
    refrescoFalla: false,
    redirigeA: null,
  },
  {
    nombre: "403 SIN_ACCESO_A_LA_CLASE (no redirige; R-03)",
    respuesta: () => errorApi(403, "SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase."),
    refrescoFalla: false,
    redirigeA: null,
  },
]

describe("ataque CHORE-06a r1 · el salto con la escritura de A en vuelo y una respuesta de error", () => {
  it.each(
    ESCRITURAS.flatMap((escritura) =>
      FINALES.map((final) => [escritura.nombre, final.nombre, escritura, final] as const),
    ),
  )(
    "ATQ-CH6-04: %s, respuesta de A con %s estando en B: cero avisos e irA una vez si redirige, un solo aviso si no; en B la ruta, lo escrito y el foco se quedan y nada espera",
    async (_escritura, _final, escritura, final) => {
      servidor.rol = escritura.rol
      const pendiente = retenida()
      preparar(escritura.clave, pendiente.respuesta)
      const { router } = await montar(escritura.destino)
      await escritura.listoEnDestino()
      await navegar(router, escritura.origen)
      await escritura.listoEnOrigen()
      await escritura.hacer()
      const [metodo = "", ruta = ""] = escritura.clave.split(" ")
      await waitFor(() => expect(pedidas(metodo, ruta)).toHaveLength(1), ESPERA)

      await navegar(router, -1)
      await escritura.listoEnDestino()
      nadaEnEspera()
      await escribir(escritura.campoDeDestino, "Escrito en B")
      const enB = await campo(escritura.campoDeDestino)
      act(() => enB.focus())
      await reposar(400)
      if (final.refrescoFalla) {
        preparar("POST /api/auth/refrescar", () => errorApi(401, "NO_AUTENTICADO", "Sin sesión."))
      }

      await pendiente.soltar(final.respuesta)
      await reposar(200)
      if (final.redirigeA === null) {
        await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
        expect(errores()[0]?.trim()).not.toBe("")
        expect(navegacion.irA).not.toHaveBeenCalled()
      } else {
        await waitFor(() => expect(navegacion.irA).toHaveBeenCalledTimes(1), ESPERA)
        expect(navegacion.irA).toHaveBeenCalledWith(final.redirigeA)
        expect(errores()).toEqual([])
      }
      expect(router.state.location.pathname).toBe(escritura.destino)
      expect(await campo(escritura.campoDeDestino)).toBe(enB)
      expect(await valorDe(escritura.campoDeDestino)).toBe("Escrito en B")
      expect(document.activeElement).toBe(enB)
      nadaEnEspera()
      expect(aviso.success).not.toHaveBeenCalled()
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// Punto 3 del manager: la regla de PA-1 (un guardado que llega con la vista desmontada avisa y no navega).
// ---------------------------------------------------------------------------------------------------

describe("ataque CHORE-06a r1 · un guardado que llega con la vista desmontada", () => {
  it("ATQ-CH6-05: crear una tarea, salir a Dudas y volver a «Nueva tarea» de la misma clase antes de la respuesta: un solo aviso de éxito, la ruta no cambia y nada espera", async () => {
    servidor.rol = "maestro"
    const pendiente = retenida()
    preparar(`POST /api/clases/${A}/tareas`, pendiente.respuesta)
    const { router } = await montar(rutaNueva(A))
    await titulo(NOMBRES[A] ?? "")
    await llenarTarea("Tarea de Historia")
    await pulsar("Publicar tarea")
    await waitFor(() => expect(pedidas("POST", `/api/clases/${A}/tareas`)).toHaveLength(1), ESPERA)

    await navegar(router, `${BASE("maestro", A)}/dudas`)
    await campo("Escribe tu duda")
    await navegar(router, -1)
    await campo("Título")
    await pendiente.soltar(tareaCreada(TAREA_NUEVA_A))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    await reposar(150)
    expect(router.state.location.pathname).toBe(rutaNueva(A))
    expect(aviso.success).toHaveBeenCalledTimes(1)
    expect(errores()).toEqual([])
    nadaEnEspera()
  })

  it("ATQ-CH6-06: editar una tarea, salir a Dudas y volver a la misma edición antes de la respuesta: un solo aviso de éxito y la ruta no cambia", async () => {
    servidor.rol = "maestro"
    const pendiente = retenida()
    preparar(`PUT /api/clases/${A}/tareas/${T1}`, pendiente.respuesta)
    const { router } = await montar(rutaTarea(T1, "/editar"))
    await tituloDeLaTareaEs(T1)
    await escribir("Título", "Cambiado en uno")
    await pulsar("Guardar cambios")
    await waitFor(() => expect(pedidas("PUT", `/api/clases/${A}/tareas/${T1}`)).toHaveLength(1))

    await navegar(router, `${BASE("maestro", A)}/dudas`)
    await campo("Escribe tu duda")
    await navegar(router, -1)
    await campo("Título")
    await pendiente.soltar(() => respuestaJson(200, tareaDoble(T1)))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    await reposar(150)
    expect(router.state.location.pathname).toBe(rutaTarea(T1, "/editar"))
    expect(aviso.success).toHaveBeenCalledTimes(1)
    expect(errores()).toEqual([])
  })

  it.each(["A y después B", "B y después A"] as const)(
    "ATQ-CH6-07: dos «Publicar tarea» seguidos (A, salto a «Nueva tarea» de B, B) que responden %s: dos avisos de éxito y solo B navega, al detalle de su tarea",
    async (orden) => {
      servidor.rol = "maestro"
      const deA = retenida()
      const deB = retenida()
      preparar(`POST /api/clases/${A}/tareas`, deA.respuesta)
      preparar(`POST /api/clases/${B}/tareas`, deB.respuesta)
      const { router } = await montar(rutaNueva(B))
      await titulo(NOMBRES[B] ?? "")
      await navegar(router, rutaNueva(A))
      await titulo(NOMBRES[A] ?? "")
      await llenarTarea("Tarea de Historia")
      await pulsar("Publicar tarea")
      await waitFor(() => expect(pedidas("POST", `/api/clases/${A}/tareas`)).toHaveLength(1))
      await navegar(router, -1)
      await titulo(NOMBRES[B] ?? "")
      nadaEnEspera()
      await llenarTarea("Tarea de Geografía")
      await pulsar("Publicar tarea")
      await waitFor(() => expect(pedidas("POST", `/api/clases/${B}/tareas`)).toHaveLength(1))

      const detalleDeB = `${BASE("maestro", B)}/tareas/${TAREA_NUEVA_B}`
      if (orden === "A y después B") {
        await deA.soltar(tareaCreada(TAREA_NUEVA_A))
        await reposar(100)
        expect(router.state.location.pathname).toBe(rutaNueva(B))
        await deB.soltar(tareaCreada(TAREA_NUEVA_B))
      } else {
        await deB.soltar(tareaCreada(TAREA_NUEVA_B))
        await waitFor(() => expect(router.state.location.pathname).toBe(detalleDeB), ESPERA)
        await deA.soltar(tareaCreada(TAREA_NUEVA_A))
      }
      await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(2), ESPERA)
      await reposar(150)
      expect(router.state.location.pathname).toBe(detalleDeB)
      expect(errores()).toEqual([])
    },
  )

  it("ATQ-CH6-08: crear una tarea en A, saltar a B, la clase A pasa a archivada y se vuelve a ella antes de la respuesta: un solo aviso de éxito y la ruta no cambia", async () => {
    servidor.rol = "maestro"
    const pendiente = retenida()
    preparar(`POST /api/clases/${A}/tareas`, pendiente.respuesta)
    const { router, cliente } = await montar(rutaNueva(B))
    await titulo(NOMBRES[B] ?? "")
    await navegar(router, rutaNueva(A))
    await titulo(NOMBRES[A] ?? "")
    await llenarTarea("Tarea de Historia")
    await pulsar("Publicar tarea")
    await waitFor(() => expect(pedidas("POST", `/api/clases/${A}/tareas`)).toHaveLength(1))
    await navegar(router, -1)
    await titulo(NOMBRES[B] ?? "")
    await archivarEnElServidor(cliente, A, true)
    await navegar(router, 1)
    await titulo(NOMBRES[A] ?? "")
    await waitFor(() => expect(screen.queryAllByText(ARCHIVADA).length).toBeGreaterThan(0), ESPERA)

    await pendiente.soltar(tareaCreada(TAREA_NUEVA_A))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    await reposar(150)
    expect(router.state.location.pathname).toBe(rutaNueva(A))
    expect(errores()).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------------
// Punto 4 del manager: la Forma C con StrictMode y con la clase que pasa a archivada en medio.
// ---------------------------------------------------------------------------------------------------

describe("ataque CHORE-06a r1 · la Forma C con StrictMode", () => {
  it("ATQ-CH6-09: editar una tarea con StrictMode: lo escrito en T1 no pasa a T2, el foco va a la raíz, y guardar T2 (montada) sí lleva al detalle de T2", async () => {
    servidor.rol = "maestro"
    const { router } = await montar(rutaTarea(T2, "/editar"), true)
    await tituloDeLaTareaEs(T2)
    await navegar(router, rutaTarea(T1, "/editar"))
    await tituloDeLaTareaEs(T1)
    await escribir("Título", "Cambiado en uno")
    act(() => screen.getByLabelText("Título").focus())

    await navegar(router, -1)
    await tituloDeLaTareaEs(T2)
    await waitFor(() => expect(document.activeElement).toBe(raizDeLaVista()), ESPERA)
    await pulsar("Guardar cambios")
    await waitFor(() => expect(router.state.location.pathname).toBe(rutaTarea(T2)), ESPERA)
    expect(pedidas("PUT", `/api/clases/${A}/tareas/${T1}`)).toHaveLength(0)
    expect(pedidas("PUT", `/api/clases/${A}/tareas/${T2}`)[0]?.cuerpo).toMatchObject({
      titulo: TITULOS[T2],
    })
    expect(aviso.success).toHaveBeenCalledTimes(1)
  })

  it("ATQ-CH6-10: editar un recurso con StrictMode: lo escrito en R1 no pasa a R2, y guardar R2 (montada) sí vuelve a Recursos", async () => {
    servidor.rol = "maestro"
    const { router } = await montar(rutaRecurso(R2), true)
    await tituloDelRecursoEs(R2)
    await navegar(router, rutaRecurso(R1))
    await tituloDelRecursoEs(R1)
    await escribir(TITULO_RECURSO, "Cambiado en uno")

    await navegar(router, -1)
    await tituloDelRecursoEs(R2)
    await pulsar("Guardar cambios")
    await waitFor(
      () => expect(router.state.location.pathname).toBe(`${BASE("maestro", A)}/recursos`),
      ESPERA,
    )
    expect(pedidas("PUT", `/api/clases/${A}/recursos/${R1}`)).toHaveLength(0)
    expect(aviso.success).toHaveBeenCalledTimes(1)
  })

  it("ATQ-CH6-11: la entrega de un alumno con StrictMode: los puntos de P1 no pasan a P2, el foco va a la raíz, y calificar a P2 manda solo su PUT y reinicia su panel", async () => {
    servidor.rol = "maestro"
    const { router } = await montar(rutaEntrega(T1, P2.id), true)
    await screen.findByRole("heading", { level: 2, name: P2.nombre }, ESPERA)
    await navegar(router, rutaEntrega(T1, P1.id))
    await screen.findByRole("heading", { level: 2, name: P1.nombre }, ESPERA)
    await escribir(CLARIDAD, "4")
    act(() => screen.getByLabelText(CLARIDAD).focus())

    await navegar(router, -1)
    await screen.findByRole("heading", { level: 2, name: P2.nombre }, ESPERA)
    expect(await valorDe(CLARIDAD)).toBe("")
    await waitFor(() => expect(document.activeElement).toBe(raizDeLaVista()), ESPERA)
    await escribir(CLARIDAD, "5")
    await escribir(ORTOGRAFIA, "5")
    await pulsar("Calificar y devolver")
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    expect(pedidas("PUT", `${rutaApiEntrega(T1, P2.id)}/calificacion`)).toHaveLength(1)
    expect(pedidas("PUT", `${rutaApiEntrega(T1, P1.id)}/calificacion`)).toHaveLength(0)
    expect(errores()).toEqual([])
  })
})

describe("ataque CHORE-06a r1 · la Forma C con la clase que pasa a archivada en medio", () => {
  it("ATQ-CH6-12: el PUT de T1 en vuelo, salto a la edición de T2 y la clase se archiva: al soltarlo, un aviso y no navega; al restaurarse, T2 nace con su título y no se lleva el foco", async () => {
    servidor.rol = "maestro"
    const pendiente = retenida()
    preparar(`PUT /api/clases/${A}/tareas/${T1}`, pendiente.respuesta)
    const { router, cliente } = await montar(rutaTarea(T2, "/editar"))
    await tituloDeLaTareaEs(T2)
    await navegar(router, rutaTarea(T1, "/editar"))
    await tituloDeLaTareaEs(T1)
    await escribir("Título", "Cambiado en uno")
    await pulsar("Guardar cambios")
    await waitFor(() => expect(pedidas("PUT", `/api/clases/${A}/tareas/${T1}`)).toHaveLength(1))

    await navegar(router, -1)
    await tituloDeLaTareaEs(T2)
    await archivarEnElServidor(cliente, A, true)
    await waitFor(() => expect(screen.queryByLabelText("Título")).toBeNull(), ESPERA)
    const tituloDeLaClase = screen.getByRole("heading", { level: 1 })
    act(() => tituloDeLaClase.focus())

    await pendiente.soltar(() => respuestaJson(200, tareaDoble(T1)))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    await reposar(150)
    expect(router.state.location.pathname).toBe(rutaTarea(T2, "/editar"))

    await archivarEnElServidor(cliente, A, false)
    await tituloDeLaTareaEs(T2)
    await reposar(150)
    expect(document.activeElement).toBe(tituloDeLaClase)
    expect(errores()).toEqual([])
  })

  it("ATQ-CH6-13: el PUT de la calificación de P1 en vuelo, salto a P2 y la clase se archiva: al soltarlo, un aviso; al restaurarse, el panel de P2 nace vacío y no se lleva el foco", async () => {
    servidor.rol = "maestro"
    const pendiente = retenida()
    preparar(`PUT ${rutaApiEntrega(T1, P1.id)}/calificacion`, pendiente.respuesta)
    const { router, cliente } = await montar(rutaEntrega(T1, P2.id))
    await screen.findByRole("heading", { level: 2, name: P2.nombre }, ESPERA)
    await navegar(router, rutaEntrega(T1, P1.id))
    await screen.findByRole("heading", { level: 2, name: P1.nombre }, ESPERA)
    await escribir(CLARIDAD, "4")
    await escribir(ORTOGRAFIA, "3")
    await pulsar("Calificar y devolver")
    await waitFor(() =>
      expect(pedidas("PUT", `${rutaApiEntrega(T1, P1.id)}/calificacion`)).toHaveLength(1),
    )

    await navegar(router, -1)
    await screen.findByRole("heading", { level: 2, name: P2.nombre }, ESPERA)
    await archivarEnElServidor(cliente, A, true)
    await waitFor(() => expect(screen.queryByLabelText(CLARIDAD)).toBeNull(), ESPERA)
    const tituloDeLaClase = screen.getByRole("heading", { level: 1 })
    act(() => tituloDeLaClase.focus())

    await pendiente.soltar(() => respuestaJson(200, entregaDeAlumnoDoble(P1.id, true)))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    await archivarEnElServidor(cliente, A, false)
    expect(await valorDe(CLARIDAD)).toBe("")
    await reposar(150)
    expect(document.activeElement).toBe(tituloDeLaClase)
    expect(router.state.location.pathname).toBe(rutaEntrega(T1, P2.id))
    expect(errores()).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------------
// Punto 5 del manager: R-03 al revés. Un 401 sin token enviado no redirige en apiClient y la guarda
// calla por el código. Se fija que solo se llega ahí con la sesión ya perdida (irA ya salió).
// ---------------------------------------------------------------------------------------------------

describe("ataque CHORE-06a r1 · R-03, un 401 sin token enviado", () => {
  it("ATQ-CH6-14: «Sí, quitar» con 401 y el refresco rechazado redirige una vez y limpia el token; un segundo «Sí, quitar» sin token no refresca, no avisa y no vuelve a redirigir", async () => {
    servidor.rol = "maestro"
    const ruta = `/api/clases/${A}/alumnos/${P1.id}`
    preparar(
      `DELETE ${ruta}`,
      () => errorApi(401, "NO_AUTENTICADO", "El token venció."),
      () => errorApi(401, "NO_AUTENTICADO", "Falta el token."),
    )
    preparar("POST /api/auth/refrescar", () => errorApi(401, "NO_AUTENTICADO", "Sin sesión."))
    await montar(`${BASE("maestro", A)}/personas`)
    await titulo(NOMBRES[A] ?? "")
    await pulsar(`Quitar ${P1.nombre}`)
    await pulsar(`Sí, quitar ${P1.nombre}`)
    await waitFor(() => expect(navegacion.irA).toHaveBeenCalledTimes(1), ESPERA)
    expect(navegacion.irA).toHaveBeenCalledWith("/login")
    expect(obtenerToken()).toBeUndefined()
    await reposar(100)

    // Tras el error, la fila puede seguir con su confirmación abierta: se repite desde donde esté.
    const nombres = screen.getAllByRole("button").map((b) => b.textContent)
    if (screen.queryByRole("button", { name: `Sí, quitar ${P1.nombre}` }) === null) {
      expect(nombres, "Precondición: «Quitar» o «Sí, quitar» a la vista").toContain(
        `Quitar ${P1.nombre}`,
      )
      await pulsar(`Quitar ${P1.nombre}`)
    }
    await pulsar(`Sí, quitar ${P1.nombre}`)
    await waitFor(() => expect(pedidas("DELETE", ruta)).toHaveLength(2), ESPERA)
    await reposar(200)
    expect(pedidas("POST", "/api/auth/refrescar")).toHaveLength(1)
    expect(navegacion.irA).toHaveBeenCalledTimes(1)
    expect(errores()).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------------
// Punto 7 del manager: render props de varias líneas que CH6-A30 no ve.
// ---------------------------------------------------------------------------------------------------

describe("ataque CHORE-06a r1 · los maestros del maestro en Personas (render prop de varias líneas)", () => {
  it("ATQ-CH6-15: de Personas de A (dos maestros) a la de B (uno) por el historial: en B se lee solo su maestro y su título, sin nada de A", async () => {
    servidor.rol = "maestro"
    servidor.maestros[B] = [MAESTRO_1]
    const { router } = await montar(`${BASE("maestro", B)}/personas`)
    await titulo(NOMBRES[B] ?? "")
    await screen.findByText(MAESTRO_1.nombre, {}, ESPERA)
    await navegar(router, `${BASE("maestro", A)}/personas`)
    await titulo(NOMBRES[A] ?? "")
    await screen.findByText(MAESTRO_2.nombre, {}, ESPERA)

    await navegar(router, -1)
    await titulo(NOMBRES[B] ?? "")
    await waitFor(() => expect(screen.queryByText(MAESTRO_2.nombre)).toBeNull(), ESPERA)
    expect(screen.getByText(MAESTRO_1.nombre)).toBeInTheDocument()
    expect(screen.queryAllByRole("button", { name: /^Quitar Luis|^Quitar Marta/ })).toHaveLength(0)
  })
})
