import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { StrictMode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { claveAlumnos, claveTemasDeLaSeccion } from "@/features/clases/data"
import { claveClaseDetalle, clavePublicaciones } from "@/services/clasesService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// CHORE-06a (§D-1, §D-2; CH6-A01 a CH6-A14 y CH6-A17): lo abierto o escrito es del id de la ruta. Con el
// router real (`rutas` de app/router) y las defaultOptions de app/providers.tsx. "Salto del historial" es
// router.navigate(-1) o (1) entre dos entradas de la misma ruta con otro id, con el destino ya en caché
// (S-02). La red se dobla con fetch; lo que debe quedar en vuelo se retiene con una promesa diferida.

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

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
// CH6-A19: las entregas de cada tarea en dos páginas (20 alumnos y uno más). Lo que se ponga en
// `siguientesDeEntregas` de una tarea responde, en orden, a sus páginas siguientes (con cursor).
let entregasEnPaginas = false
// CH6-A20 a A22: un manejador por caso, antes del doble por defecto (undefined: el de siempre).
type Manejador = (llamada: Llamada) => Response | Promise<Response> | undefined
let manejador: Manejador | undefined
const siguientesDeEntregas = new Map<string, Respuesta[]>()
const alumnoDeLaLista = (n: number) => ({
  id: uuid("6c6c3c4d", 100 + n),
  nombre: `Alumno ${String(n)}`,
})
const filaDeEntregas = (alumno: { id: string; nombre: string }) => ({
  alumno,
  estado: "asignado",
  fechaEntrega: null,
  conRetraso: false,
})
const listaDeEntregas = (
  alumnos: { id: string; nombre: string }[],
  siguienteCursor: string | null,
) =>
  respuestaJson(200, {
    entregas: alumnos.map(filaDeEntregas),
    total: 21,
    entregadas: 0,
    siguienteCursor,
  })
const paginaDeEntregas = (tareaId: string, cursor: string | null) => {
  if (cursor === null) {
    const primeros = Array.from({ length: 20 }, (_, i) => alumnoDeLaLista(i + 1))
    return listaDeEntregas(primeros, alumnoDeLaLista(20).id)
  }
  const propia = siguientesDeEntregas.get(tareaId)?.shift()
  if (propia !== undefined) return Promise.resolve().then(propia)
  return listaDeEntregas([alumnoDeLaLista(21)], null)
}

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
    if (detalle === "entregas" && alumnoId === undefined && entregasEnPaginas) {
      return paginaDeEntregas(id, url.searchParams.get("cursor"))
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
  entregasEnPaginas = false
  siguientesDeEntregas.clear()
  manejador = undefined
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://x")
      const metodo = init?.method ?? "GET"
      const cuerpo: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : undefined
      const llamada = { metodo, url, cuerpo }
      llamadas.push(llamada)
      const siguiente = colas.get(`${metodo} ${url.pathname}`)?.shift()
      if (siguiente !== undefined) return Promise.resolve().then(siguiente)
      const propia = manejador?.(llamada)
      if (propia !== undefined) return Promise.resolve().then(() => propia)
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
const boton = (nombre: string | RegExp) => screen.queryByRole("button", { name: nombre })
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
const sinErroresDeCampo = () => expect(document.querySelector('[aria-invalid="true"]')).toBeNull()

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

const archivo = () => new File(["x"], "guia.pdf", { type: "application/pdf" })
const elegirArchivo = async () => {
  const entrada = await campo("Adjuntar archivos")
  fireEvent.change(entrada, { target: { files: [archivo()] } })
  await waitFor(() => expect(screen.queryAllByText(/guia\.pdf/).length).toBeGreaterThan(0), ESPERA)
}

const BASE = (rol: Rol, claseId: string) => `/${rol}/clases/${claseId}`

// ---------------------------------------------------------------------------------------------------
// CH6-A01 a CH6-A03: Personas (O-r1-1 y H-3)
// ---------------------------------------------------------------------------------------------------

const QUITAR_MAESTRO = `Quitar ${MAESTRO_2.nombre}`
const SI_QUITAR_MAESTRO = `Sí, quitar ${MAESTRO_2.nombre}`
const CANCELAR_MAESTRO = `Cancelar ${MAESTRO_2.nombre}`
const QUITAR_ALUMNO = `Quitar ${P1.nombre}`
const SI_QUITAR_ALUMNO = `Sí, quitar ${P1.nombre}`
const CANCELAR_ALUMNO = `Cancelar ${P1.nombre}`
const CONSECUENCIA_MAESTRO = "Dejará de ver la clase. Lo que publicó se queda en la clase."
const CONSECUENCIA_ALUMNO = "Dejará de ver la clase. Sus datos no se borran."

// Monta la ruta de B, salta a la de A (push) y espera cada una: las dos quedan en caché.
const deBaA = async (rutaB: string, rutaA: string, estricto = false) => {
  const montado = await montar(rutaB, estricto)
  await titulo(NOMBRES[B] ?? "")
  await navegar(montado.router, rutaA)
  await titulo(NOMBRES[A] ?? "")
  return montado
}

describe("CH6-A01 · quitar a un maestro (admin, Personas; O-r1-1)", () => {
  it.each([
    ["«Cancelar»", CANCELAR_MAESTRO],
    ["«Sí, quitar»", SI_QUITAR_MAESTRO],
  ])(
    "CH6-A01: con la confirmación abierta en A y el foco en %s, saltar a B: la confirmación no pasa, «Quitar» está a la vista, el foco es el título de B y al volver a A está cerrada",
    async (_foco, enfocar) => {
      servidor.rol = "admin"
      const { router } = await deBaA(`${BASE("admin", B)}/personas`, `${BASE("admin", A)}/personas`)
      await pulsar(QUITAR_MAESTRO)
      const control = await buscarBoton(enfocar)
      act(() => control.focus())
      expect(document.activeElement).toBe(control)

      await navegar(router, -1)
      const tituloB = await titulo(NOMBRES[B] ?? "")
      expect(await buscarBoton(QUITAR_MAESTRO)).toBeInTheDocument()
      expect(boton(SI_QUITAR_MAESTRO)).toBeNull()
      expect(screen.queryByText(CONSECUENCIA_MAESTRO)).toBeNull()
      await waitFor(() => expect(document.activeElement).toBe(tituloB), ESPERA)

      await navegar(router, 1)
      await titulo(NOMBRES[A] ?? "")
      expect(await buscarBoton(QUITAR_MAESTRO)).toBeInTheDocument()
      expect(boton(SI_QUITAR_MAESTRO)).toBeNull()
      expect(boton(CANCELAR_MAESTRO)).toBeNull()
    },
  )
})

describe("CH6-A02 · quitar a un alumno (maestro y admin, el roster)", () => {
  it.each(["maestro", "admin"] as const)(
    "CH6-A02: (%s) la confirmación de «Quitar» de un alumno no pasa de A a B, el foco va al título de B y al volver a A está cerrada",
    async (rol) => {
      servidor.rol = rol
      const { router } = await deBaA(`${BASE(rol, B)}/personas`, `${BASE(rol, A)}/personas`)
      await pulsar(QUITAR_ALUMNO)
      const cancelar = await buscarBoton(CANCELAR_ALUMNO)
      act(() => cancelar.focus())

      await navegar(router, -1)
      const tituloB = await titulo(NOMBRES[B] ?? "")
      expect(await buscarBoton(QUITAR_ALUMNO)).toBeInTheDocument()
      expect(boton(SI_QUITAR_ALUMNO)).toBeNull()
      expect(screen.queryByText(CONSECUENCIA_ALUMNO)).toBeNull()
      await waitFor(() => expect(document.activeElement).toBe(tituloB), ESPERA)

      await navegar(router, 1)
      await titulo(NOMBRES[A] ?? "")
      expect(await buscarBoton(QUITAR_ALUMNO)).toBeInTheDocument()
      expect(boton(SI_QUITAR_ALUMNO)).toBeNull()
    },
  )
})

describe("CH6-A03 · quitar con la petición en vuelo (H-3)", () => {
  it("CH6-A03 (maestro): con el DELETE de A retenido, en B nada espera y «Sí, quitar» manda el de B; la respuesta de A da un aviso, renueva solo A y al volver a A (antes de 30 s) el maestro quitado ya no está", async () => {
    servidor.rol = "admin"
    const claveDe = (claseId: string) => `/api/admin/clases/${claseId}/maestros/${MAESTRO_2.id}`
    const deA = retenida()
    const deB = retenida()
    preparar(`DELETE ${claveDe(A)}`, deA.respuesta)
    preparar(`DELETE ${claveDe(B)}`, deB.respuesta)
    const { router, cliente } = await deBaA(
      `${BASE("admin", B)}/personas`,
      `${BASE("admin", A)}/personas`,
    )
    await pulsar(QUITAR_MAESTRO)
    await pulsar(SI_QUITAR_MAESTRO)
    await waitFor(() => expect(pedidas("DELETE", claveDe(A))).toHaveLength(1), ESPERA)

    await navegar(router, -1)
    await titulo(NOMBRES[B] ?? "")
    await buscarBoton(QUITAR_MAESTRO)
    nadaEnEspera()
    await pulsar(QUITAR_MAESTRO)
    await pulsar(SI_QUITAR_MAESTRO)
    await waitFor(() => expect(pedidas("DELETE", claveDe(B))).toHaveLength(1), ESPERA)

    const detallesDeB = pedidas("GET", `/api/clases/${B}`).length
    await deA.soltar(() => {
      servidor.maestros[A] = [MAESTRO_1]
      return respuestaJson(200, { maestros: [MAESTRO_1] })
    })
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    expect(aviso.success.mock.calls[0]?.[0]).toBe(`Quitaste a ${MAESTRO_2.nombre} de la clase`)
    await reposar()
    expect(pedidas("GET", `/api/clases/${B}`)).toHaveLength(detallesDeB)
    expect(cliente.getQueryState(claveClaseDetalle(A))?.isInvalidated).toBe(true)
    expect(cliente.getQueryState(claveClaseDetalle(B))?.isInvalidated).toBe(false)

    await navegar(router, 1)
    await titulo(NOMBRES[A] ?? "")
    await waitFor(() => expect(boton(QUITAR_MAESTRO)).toBeNull(), ESPERA)
    await deB.soltar(() => respuestaJson(200, { maestros: [MAESTRO_1] }))
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CH6-A03 (alumno): con el DELETE de A retenido, en B nada espera y «Sí, quitar» manda el de B; la respuesta de A da un aviso, renueva solo A y al volver a A (antes de 30 s) el alumno quitado ya no está", async () => {
    servidor.rol = "maestro"
    const claveDe = (claseId: string) => `/api/clases/${claseId}/alumnos/${P1.id}`
    const deA = retenida()
    const deB = retenida()
    preparar(`DELETE ${claveDe(A)}`, deA.respuesta)
    preparar(`DELETE ${claveDe(B)}`, deB.respuesta)
    const { router, cliente } = await deBaA(
      `${BASE("maestro", B)}/personas`,
      `${BASE("maestro", A)}/personas`,
    )
    await pulsar(QUITAR_ALUMNO)
    await pulsar(SI_QUITAR_ALUMNO)
    await waitFor(() => expect(pedidas("DELETE", claveDe(A))).toHaveLength(1), ESPERA)

    await navegar(router, -1)
    await titulo(NOMBRES[B] ?? "")
    await buscarBoton(QUITAR_ALUMNO)
    nadaEnEspera()
    await pulsar(QUITAR_ALUMNO)
    await pulsar(SI_QUITAR_ALUMNO)
    await waitFor(() => expect(pedidas("DELETE", claveDe(B))).toHaveLength(1), ESPERA)

    const rosterDeB = pedidas("GET", `/api/clases/${B}/alumnos`).length
    await deA.soltar(() => {
      servidor.alumnos[A] = []
      return sinContenido()
    })
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    expect(aviso.success.mock.calls[0]?.[0]).toBe(`Quitaste a ${P1.nombre} de la clase`)
    await reposar()
    expect(pedidas("GET", `/api/clases/${B}/alumnos`)).toHaveLength(rosterDeB)
    expect(cliente.getQueryState(claveAlumnos(A))?.isInvalidated).toBe(true)
    expect(cliente.getQueryState(claveAlumnos(B))?.isInvalidated).toBe(false)

    await navegar(router, 1)
    await titulo(NOMBRES[A] ?? "")
    await waitFor(() => expect(boton(QUITAR_ALUMNO)).toBeNull(), ESPERA)
    await deB.soltar(sinContenido)
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------------------------------
// CH6-A04 y CH6-A05: el detalle de la tarea
// ---------------------------------------------------------------------------------------------------

const rutaTarea = (rol: Rol, tareaId: string, resto = "") =>
  `${BASE(rol, A)}/tareas/${tareaId}${resto}`

// Monta T2, salta a T1 (push) y espera cada una.
const deT2aT1 = async (rol: Rol, resto = "", listo?: (tareaId: string) => Promise<unknown>) => {
  const esperar =
    listo ?? ((tareaId: string) => screen.findByText(TITULOS[tareaId] ?? "", {}, ESPERA))
  const montado = await montar(rutaTarea(rol, T2, resto))
  await esperar(T2)
  await navegar(montado.router, rutaTarea(rol, T1, resto))
  await esperar(T1)
  return montado
}

describe("CH6-A04 · borrar una tarea (O-E3-1)", () => {
  it("CH6-A04 (maestro): con la confirmación de «Borrar tarea» de T1 abierta, saltar a T2: no hay confirmación, el foco es la raíz de la vista y al volver a T1 está cerrada", async () => {
    servidor.rol = "maestro"
    const { router } = await deT2aT1("maestro")
    await pulsar("Borrar tarea")
    const cancelar = await buscarBoton("Cancelar")
    act(() => cancelar.focus())
    expect(boton("Sí, borrar tarea")).not.toBeNull()

    await navegar(router, -1)
    await screen.findByText(TITULOS[T2] ?? "", {}, ESPERA)
    expect(boton("Sí, borrar tarea")).toBeNull()
    expect(await buscarBoton("Borrar tarea")).toBeInTheDocument()
    await waitFor(() => expect(document.activeElement).toBe(raizDeLaVista()), ESPERA)

    await navegar(router, 1)
    await screen.findByText(TITULOS[T1] ?? "", {}, ESPERA)
    expect(boton("Sí, borrar tarea")).toBeNull()
  })

  it("CH6-A04 (admin): con el 409 TAREA_CON_ENTREGAS de T1 a la vista, saltar a T2: no hay confirmación ni el mensaje del 409, y el foco es la raíz de la vista", async () => {
    servidor.rol = "admin"
    preparar(`DELETE /api/clases/${A}/tareas/${T1}`, () =>
      errorApi(409, "TAREA_CON_ENTREGAS", "Esta tarea tiene 3 entregas. Pídelo a administración."),
    )
    const { router } = await deT2aT1("admin")
    await pulsar("Borrar tarea")
    await pulsar("Sí, borrar tarea")
    const conEntregas = await buscarBoton("Borrar con las entregas")
    act(() => conEntregas.focus())

    await navegar(router, -1)
    await screen.findByText(TITULOS[T2] ?? "", {}, ESPERA)
    expect(boton("Borrar con las entregas")).toBeNull()
    expect(boton("Sí, borrar tarea")).toBeNull()
    expect(screen.queryByText(/Esta tarea tiene 3 entregas/)).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(raizDeLaVista()), ESPERA)
  })
})

describe("CH6-A05 · «Tu trabajo» y el hilo del alumno", () => {
  it("CH6-A05: los archivos y enlaces elegidos y el comentario privado de T1 no están en T2; «Entregar tarea» en T2 manda el POST de T2 sin lo de T1", async () => {
    servidor.rol = "estudiante"
    const { router } = await deT2aT1("estudiante")
    await elegirArchivo()
    await escribir("Enlace", "https://uno.ejemplo.mx/t1")
    await pulsar("Agregar enlace")
    await waitFor(
      () => expect(screen.queryAllByText("https://uno.ejemplo.mx/t1").length).toBeGreaterThan(0),
      ESPERA,
    )
    await escribir("Comentario privado", "Para la tarea uno")

    await navegar(router, -1)
    await screen.findByText(TITULOS[T2] ?? "", {}, ESPERA)
    expect(await valorDe("Comentario privado")).toBe("")
    expect(screen.queryAllByText(/guia\.pdf/)).toHaveLength(0)
    expect(screen.queryAllByText("https://uno.ejemplo.mx/t1")).toHaveLength(0)

    await escribir("Enlace", "https://dos.ejemplo.mx/t2")
    await pulsar("Agregar enlace")
    await pulsar("Entregar tarea")
    const ruta = `/api/clases/${A}/tareas/${T2}/entrega`
    await waitFor(() => expect(pedidas("POST", ruta)).toHaveLength(1), ESPERA)
    expect(pedidas("POST", ruta)[0]?.cuerpo).toEqual({
      archivoIds: [],
      enlaces: ["https://dos.ejemplo.mx/t2"],
    })
    expect(pedidas("POST", `/api/clases/${A}/tareas/${T1}/entrega`)).toHaveLength(0)
    expect(pedidas("POST", `/api/clases/${A}/tareas/${T2}/entrega/archivos`)).toHaveLength(0)
  })

  it("CH6-A05: con la confirmación de anular abierta en T1, saltar a T2: no está", async () => {
    servidor.rol = "estudiante"
    servidor.miEntrega = { [T1]: "entregado", [T2]: "entregado" }
    const { router } = await deT2aT1("estudiante")
    await pulsar("Anular entrega")
    expect(await buscarBoton("Sí, anular entrega")).toBeInTheDocument()

    await navegar(router, -1)
    await screen.findByText(TITULOS[T2] ?? "", {}, ESPERA)
    expect(await buscarBoton("Anular entrega")).toBeInTheDocument()
    expect(boton("Sí, anular entrega")).toBeNull()
  })
})

// ---------------------------------------------------------------------------------------------------
// CH6-A06: calificar a un alumno (O-r1c-2 y M-01)
// ---------------------------------------------------------------------------------------------------

const rutaEntrega = (tareaId: string, alumnoId: string) =>
  `${BASE("maestro", A)}/tareas/${tareaId}/entregas/${alumnoId}`
const CLARIDAD = "Claridad (de 5 puntos)"
const ORTOGRAFIA = "Ortografía (de 5 puntos)"
const CALIFICACION_DIRECTA = "Calificación (de 10 puntos)"
const rutaApiEntrega = (tareaId: string, alumnoId: string) =>
  `/api/clases/${A}/tareas/${tareaId}/entregas/${alumnoId}`

// Monta la entrega de destino, salta a la de origen (push) y espera cada una.
const entreEntregas = async (
  destino: { tareaId: string; alumnoId: string; campo: string },
  origen: { tareaId: string; alumnoId: string; campo: string },
) => {
  servidor.rol = "maestro"
  const montado = await montar(rutaEntrega(destino.tareaId, destino.alumnoId))
  await campo(destino.campo)
  await navegar(montado.router, rutaEntrega(origen.tareaId, origen.alumnoId))
  await campo(origen.campo)
  return montado
}

describe("CH6-A06 · calificar a un alumno (O-r1c-2)", () => {
  it("CH6-A06: con puntos escritos para P1 y texto en su hilo, saltar a P2 (misma versión): el panel y el hilo son de P2, y «Calificar y devolver» manda el PUT de P2 con su versión y sus puntos; el foco es la raíz", async () => {
    const { router } = await entreEntregas(
      { tareaId: T1, alumnoId: P2.id, campo: CLARIDAD },
      { tareaId: T1, alumnoId: P1.id, campo: CLARIDAD },
    )
    await escribir(CLARIDAD, "4")
    await escribir(ORTOGRAFIA, "3")
    await escribir("Comentario privado", "Para Pedro")
    act(() => screen.getByLabelText(CLARIDAD).focus())

    await navegar(router, -1)
    await screen.findByRole("heading", { level: 2, name: P2.nombre }, ESPERA)
    expect(await valorDe(CLARIDAD)).toBe("")
    expect(await valorDe(ORTOGRAFIA)).toBe("")
    expect(await valorDe("Comentario privado")).toBe("")
    await waitFor(() => expect(document.activeElement).toBe(raizDeLaVista()), ESPERA)

    await escribir(CLARIDAD, "5")
    await escribir(ORTOGRAFIA, "2")
    await pulsar("Calificar y devolver")
    const ruta = `${rutaApiEntrega(T1, P2.id)}/calificacion`
    await waitFor(() => expect(pedidas("PUT", ruta)).toHaveLength(1), ESPERA)
    expect(pedidas("PUT", ruta)[0]?.cuerpo).toMatchObject({
      version: 2,
      puntajes: [
        { criterioId: CRITERIO_1, puntos: 5 },
        { criterioId: CRITERIO_2, puntos: 2 },
      ],
    })
    expect(pedidas("PUT", `${rutaApiEntrega(T1, P1.id)}/calificacion`)).toHaveLength(0)
    expect(pedidas("POST", `${rutaApiEntrega(T1, P2.id)}/comentarios`)).toHaveLength(0)
  })

  it.each([
    ["éxito", () => respuestaJson(200, entregaDeAlumnoDoble(P1.id, true)), "success"],
    [
      "409 ENTREGA_MODIFICADA",
      () => errorApi(409, "ENTREGA_MODIFICADA", "La entrega cambió mientras la calificabas."),
      "error",
    ],
  ] as const)(
    "CH6-A06: con el PUT de P1 retenido al saltar a P2, nada espera en P2; al soltarlo (%s) sale un solo aviso, el panel de P2 no se reinicia ni toma el foco y no se vuelve a pedir la entrega de P2",
    async (_caso, respuesta, tipo) => {
      const pendiente = retenida()
      preparar(`PUT ${rutaApiEntrega(T1, P1.id)}/calificacion`, pendiente.respuesta)
      const { router } = await entreEntregas(
        { tareaId: T1, alumnoId: P2.id, campo: CLARIDAD },
        { tareaId: T1, alumnoId: P1.id, campo: CLARIDAD },
      )
      await escribir(CLARIDAD, "4")
      await escribir(ORTOGRAFIA, "3")
      await pulsar("Calificar y devolver")
      await waitFor(
        () => expect(pedidas("PUT", `${rutaApiEntrega(T1, P1.id)}/calificacion`)).toHaveLength(1),
        ESPERA,
      )

      await navegar(router, -1)
      await screen.findByRole("heading", { level: 2, name: P2.nombre }, ESPERA)
      nadaEnEspera()
      await escribir(CLARIDAD, "1")
      const claridadB = screen.getByLabelText(CLARIDAD)
      act(() => claridadB.focus())
      const entregasDeP2 = pedidas("GET", rutaApiEntrega(T1, P2.id)).length

      await pendiente.soltar(respuesta)
      await reposar(100)
      const otro = tipo === "success" ? aviso.error : aviso.success
      expect(aviso[tipo]).toHaveBeenCalledTimes(1)
      expect(otro).not.toHaveBeenCalled()
      expect(screen.getByLabelText(CLARIDAD)).toBe(claridadB)
      expect(await valorDe(CLARIDAD)).toBe("1")
      expect(document.activeElement).toBe(claridadB)
      expect(pedidas("GET", rutaApiEntrega(T1, P2.id))).toHaveLength(entregasDeP2)
    },
  )

  it("CH6-A06 (mismo alumno, otra tarea): de la entrega de P1 en T1 a la de P1 en T2 (misma versión): el panel es el de T2 sin lo escrito en T1, el hilo está vacío y «Calificar y devolver» manda el PUT de P1 en T2", async () => {
    const { router } = await entreEntregas(
      { tareaId: T2, alumnoId: P1.id, campo: CALIFICACION_DIRECTA },
      { tareaId: T1, alumnoId: P1.id, campo: CLARIDAD },
    )
    await escribir(CLARIDAD, "4")
    await escribir("Comentario privado", "Para la tarea uno")

    await navegar(router, -1)
    await campo(CALIFICACION_DIRECTA)
    expect(screen.queryByLabelText(CLARIDAD)).toBeNull()
    expect(await valorDe(CALIFICACION_DIRECTA)).toBe("")
    expect(await valorDe("Comentario privado")).toBe("")

    await escribir(CALIFICACION_DIRECTA, "9")
    await pulsar("Calificar y devolver")
    const ruta = `${rutaApiEntrega(T2, P1.id)}/calificacion`
    await waitFor(() => expect(pedidas("PUT", ruta)).toHaveLength(1), ESPERA)
    expect(pedidas("PUT", ruta)[0]?.cuerpo).toMatchObject({ version: 2, calificacion: 9 })
    expect(pedidas("PUT", `${rutaApiEntrega(T1, P1.id)}/calificacion`)).toHaveLength(0)
    expect(pedidas("POST", `${rutaApiEntrega(T2, P1.id)}/comentarios`)).toHaveLength(0)
  })

  it("CH6-A06 (mismo alumno, otra tarea): con el PUT de P1 en T1 retenido al saltar a T2, al soltarlo sale un aviso y nada se reinicia ni toma el foco en T2", async () => {
    const pendiente = retenida()
    preparar(`PUT ${rutaApiEntrega(T1, P1.id)}/calificacion`, pendiente.respuesta)
    const { router } = await entreEntregas(
      { tareaId: T2, alumnoId: P1.id, campo: CALIFICACION_DIRECTA },
      { tareaId: T1, alumnoId: P1.id, campo: CLARIDAD },
    )
    await escribir(CLARIDAD, "4")
    await escribir(ORTOGRAFIA, "3")
    await pulsar("Calificar y devolver")
    await waitFor(
      () => expect(pedidas("PUT", `${rutaApiEntrega(T1, P1.id)}/calificacion`)).toHaveLength(1),
      ESPERA,
    )

    await navegar(router, -1)
    await campo(CALIFICACION_DIRECTA)
    nadaEnEspera()
    await escribir(CALIFICACION_DIRECTA, "7")
    const directa = screen.getByLabelText(CALIFICACION_DIRECTA)
    act(() => directa.focus())
    const entregasEnT2 = pedidas("GET", rutaApiEntrega(T2, P1.id)).length

    await pendiente.soltar(() => respuestaJson(200, entregaDeAlumnoDoble(P1.id, true)))
    await reposar(100)
    expect(aviso.success).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText(CALIFICACION_DIRECTA)).toBe(directa)
    expect(await valorDe(CALIFICACION_DIRECTA)).toBe("7")
    expect(document.activeElement).toBe(directa)
    expect(pedidas("GET", rutaApiEntrega(T2, P1.id))).toHaveLength(entregasEnT2)
  })
})

// ---------------------------------------------------------------------------------------------------
// CH6-A07 a CH6-A10: editar y crear
// ---------------------------------------------------------------------------------------------------

describe("CH6-A07 · editar una tarea", () => {
  const listo = (tareaId: string) =>
    waitFor(async () => expect(await valorDe("Título")).toBe(TITULOS[tareaId]), ESPERA)

  it("CH6-A07: lo escrito para T1 no está en T2, y «Guardar cambios» en T2 manda el PUT de T2 con su versión y su contenido", async () => {
    const { router } = await deT2aT1("maestro", "/editar", listo)
    await escribir("Título", "Cambiado en uno")

    await navegar(router, -1)
    await listo(T2)
    await pulsar("Guardar cambios")
    const ruta = `/api/clases/${A}/tareas/${T2}`
    await waitFor(() => expect(pedidas("PUT", ruta)).toHaveLength(1), ESPERA)
    expect(pedidas("PUT", ruta)[0]?.cuerpo).toMatchObject({ titulo: TITULOS[T2], version: 0 })
    expect(pedidas("PUT", `/api/clases/${A}/tareas/${T1}`)).toHaveLength(0)
  })

  it("CH6-A07: con el PUT de T1 retenido al saltar a la edición de T2, al soltarlo (éxito) sale un aviso, la ruta sigue en la edición de T2 y lo escrito en T2 se conserva", async () => {
    const pendiente = retenida()
    preparar(`PUT /api/clases/${A}/tareas/${T1}`, pendiente.respuesta)
    const { router } = await deT2aT1("maestro", "/editar", listo)
    await escribir("Título", "Cambiado en uno")
    await pulsar("Guardar cambios")
    await waitFor(() => expect(pedidas("PUT", `/api/clases/${A}/tareas/${T1}`)).toHaveLength(1))

    await navegar(router, -1)
    await listo(T2)
    nadaEnEspera()
    await escribir("Título", "Escrito en dos")

    await pendiente.soltar(() => respuestaJson(200, tareaDoble(T1)))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    await reposar(100)
    expect(router.state.location.pathname).toBe(rutaTarea("maestro", T2, "/editar"))
    expect(await valorDe("Título")).toBe("Escrito en dos")
  })

  it("CH6-A07: con un 409 TAREA_MODIFICADA de T1 estando en T2, sale un aviso y T2 no se recarga ni se reinicia", async () => {
    const pendiente = retenida()
    preparar(`PUT /api/clases/${A}/tareas/${T1}`, pendiente.respuesta)
    const { router } = await deT2aT1("maestro", "/editar", listo)
    await escribir("Título", "Cambiado en uno")
    await pulsar("Guardar cambios")
    await waitFor(() => expect(pedidas("PUT", `/api/clases/${A}/tareas/${T1}`)).toHaveLength(1))

    await navegar(router, -1)
    await listo(T2)
    await escribir("Título", "Escrito en dos")
    const tituloB = screen.getByLabelText("Título")
    const lecturasDeT2 = pedidas("GET", `/api/clases/${A}/tareas/${T2}`).length

    await pendiente.soltar(() =>
      errorApi(
        409,
        "TAREA_MODIFICADA",
        "Otra persona guardó cambios en esta tarea mientras la editabas.",
      ),
    )
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await reposar(100)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(pedidas("GET", `/api/clases/${A}/tareas/${T2}`)).toHaveLength(lecturasDeT2)
    expect(screen.getByLabelText("Título")).toBe(tituloB)
    expect(await valorDe("Título")).toBe("Escrito en dos")
    expect(router.state.location.pathname).toBe(rutaTarea("maestro", T2, "/editar"))
  })
})

describe("CH6-A08 · editar un recurso", () => {
  const rutaRecurso = (recursoId: string) => `${BASE("maestro", A)}/recursos/${recursoId}/editar`
  const TITULO_RECURSO = "Título del recurso"
  const listo = (recursoId: string) =>
    waitFor(async () => expect(await valorDe(TITULO_RECURSO)).toBe(RECURSOS[recursoId]), ESPERA)
  const deR2aR1 = async () => {
    const montado = await montar(rutaRecurso(R2))
    await listo(R2)
    await navegar(montado.router, rutaRecurso(R1))
    await listo(R1)
    return montado
  }

  it("CH6-A08: lo escrito para R1 no está en R2, y «Guardar cambios» en R2 manda el PUT de R2 con su versión y su contenido", async () => {
    const { router } = await deR2aR1()
    await escribir(TITULO_RECURSO, "Cambiado en uno")

    await navegar(router, -1)
    await listo(R2)
    await pulsar("Guardar cambios")
    const ruta = `/api/clases/${A}/recursos/${R2}`
    await waitFor(() => expect(pedidas("PUT", ruta)).toHaveLength(1), ESPERA)
    expect(pedidas("PUT", ruta)[0]?.cuerpo).toMatchObject({ titulo: RECURSOS[R2], version: 0 })
    expect(pedidas("PUT", `/api/clases/${A}/recursos/${R1}`)).toHaveLength(0)
  })

  it("CH6-A08: con el PUT de R1 retenido al saltar a R2, al soltarlo (éxito) sale un aviso, la ruta sigue en la edición de R2 y lo escrito se conserva", async () => {
    const pendiente = retenida()
    preparar(`PUT /api/clases/${A}/recursos/${R1}`, pendiente.respuesta)
    const { router } = await deR2aR1()
    await escribir(TITULO_RECURSO, "Cambiado en uno")
    await pulsar("Guardar cambios")
    await waitFor(() => expect(pedidas("PUT", `/api/clases/${A}/recursos/${R1}`)).toHaveLength(1))

    await navegar(router, -1)
    await listo(R2)
    nadaEnEspera()
    await escribir(TITULO_RECURSO, "Escrito en dos")
    await pendiente.soltar(() => respuestaJson(200, recursoDoble(R1)))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    await reposar(100)
    expect(router.state.location.pathname).toBe(rutaRecurso(R2))
    expect(await valorDe(TITULO_RECURSO)).toBe("Escrito en dos")
  })

  it("CH6-A08: con un 409 RECURSO_MODIFICADO de R1 estando en R2, sale un aviso y R2 no se recarga ni se reinicia", async () => {
    const pendiente = retenida()
    preparar(`PUT /api/clases/${A}/recursos/${R1}`, pendiente.respuesta)
    const { router } = await deR2aR1()
    await escribir(TITULO_RECURSO, "Cambiado en uno")
    await pulsar("Guardar cambios")
    await waitFor(() => expect(pedidas("PUT", `/api/clases/${A}/recursos/${R1}`)).toHaveLength(1))

    await navegar(router, -1)
    await listo(R2)
    await escribir(TITULO_RECURSO, "Escrito en dos")
    const tituloB = screen.getByLabelText(TITULO_RECURSO)
    const lecturasDeR2 = pedidas("GET", `/api/clases/${A}/recursos/${R2}`).length
    await pendiente.soltar(() =>
      errorApi(409, "RECURSO_MODIFICADO", "Otra persona guardó cambios."),
    )
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await reposar(100)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(pedidas("GET", `/api/clases/${A}/recursos/${R2}`)).toHaveLength(lecturasDeR2)
    expect(screen.getByLabelText(TITULO_RECURSO)).toBe(tituloB)
    expect(await valorDe(TITULO_RECURSO)).toBe("Escrito en dos")
    expect(router.state.location.pathname).toBe(rutaRecurso(R2))
  })
})

describe("CH6-A09 · crear una tarea", () => {
  const rutaNueva = (claseId: string) => `${BASE("maestro", claseId)}/tareas/nueva`
  const llenar = async (tituloDeLaTarea: string) => {
    await escribir("Título", tituloDeLaTarea)
    await escribir("Instrucciones (opcional)", `Instrucciones de ${tituloDeLaTarea}`)
    await escribir("Fecha límite", "2030-01-15T10:00")
  }

  it("CH6-A09: lo escrito en «Nueva tarea» de A no está en la de B", async () => {
    const { router } = await deBaA(rutaNueva(B), rutaNueva(A))
    await llenar("Tarea de Historia")

    await navegar(router, -1)
    await titulo(NOMBRES[B] ?? "")
    expect(await valorDe("Título")).toBe("")
    expect(await valorDe("Instrucciones (opcional)")).toBe("")
  })

  it("CH6-A09: con el POST de A retenido al saltar a «Nueva tarea» de B, al soltarlo sale un aviso y la ruta sigue en la de B", async () => {
    const pendiente = retenida()
    preparar(`POST /api/clases/${A}/tareas`, pendiente.respuesta)
    const { router } = await deBaA(rutaNueva(B), rutaNueva(A))
    await llenar("Tarea de Historia")
    await pulsar("Publicar tarea")
    await waitFor(() => expect(pedidas("POST", `/api/clases/${A}/tareas`)).toHaveLength(1), ESPERA)

    await navegar(router, -1)
    await titulo(NOMBRES[B] ?? "")
    await escribir("Título", "Tarea de Geografía")
    await pendiente.soltar(() => respuestaJson(201, tareaDoble(uuid("7f7f3c4d", 9))))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    await reposar(100)
    expect(router.state.location.pathname).toBe(rutaNueva(B))
    expect(await valorDe("Título")).toBe("Tarea de Geografía")
  })
})

describe("CH6-A10 · editar una clase (admin)", () => {
  const rutaEditar = (claseId: string) => `${BASE("admin", claseId)}/editar`
  const NOMBRE = "Nombre de la clase"
  const listo = (claseId: string) =>
    waitFor(async () => expect(await valorDe(NOMBRE)).toBe(NOMBRES[claseId]), ESPERA)

  it("CH6-A10: el nombre escrito para A no está en el formulario de B, y «Guardar cambios» en B manda el PUT de B con el nombre de B", async () => {
    servidor.rol = "admin"
    const { router } = await deBaA(rutaEditar(B), rutaEditar(A))
    await listo(A)
    await escribir(NOMBRE, "Nombre escrito en A")

    await navegar(router, -1)
    await titulo(NOMBRES[B] ?? "")
    await listo(B)
    await pulsar("Guardar cambios")
    const ruta = `/api/admin/clases/${B}`
    await waitFor(() => expect(pedidas("PUT", ruta)).toHaveLength(1), ESPERA)
    expect(pedidas("PUT", ruta)[0]?.cuerpo).toMatchObject({ nombre: NOMBRES[B] })
    expect(pedidas("PUT", `/api/admin/clases/${A}`)).toHaveLength(0)
  })

  it("CH6-A10: con el PUT de A retenido al saltar a B, al soltarlo no navega y el formulario de B no cambia", async () => {
    servidor.rol = "admin"
    const pendiente = retenida()
    preparar(`PUT /api/admin/clases/${A}`, pendiente.respuesta)
    const { router } = await deBaA(rutaEditar(B), rutaEditar(A))
    await listo(A)
    await escribir(NOMBRE, "Nombre escrito en A")
    await pulsar("Guardar cambios")
    await waitFor(() => expect(pedidas("PUT", `/api/admin/clases/${A}`)).toHaveLength(1), ESPERA)

    await navegar(router, -1)
    await titulo(NOMBRES[B] ?? "")
    await listo(B)
    nadaEnEspera()
    await escribir(NOMBRE, "Escrito en B")
    await pendiente.soltar(() => respuestaJson(200, detalleDeClase(A)))
    await reposar(100)
    expect(router.state.location.pathname).toBe(rutaEditar(B))
    expect(await valorDe(NOMBRE)).toBe("Escrito en B")
  })
})

// ---------------------------------------------------------------------------------------------------
// CH6-A11: los formularios de las cuatro listas (Forma B)
// ---------------------------------------------------------------------------------------------------

describe("CH6-A11 · formularios de las cuatro listas", () => {
  it("CH6-A11 (Avisos): el anuncio y el archivo elegidos en A no están en B; con el foco en el campo, va al título de B", async () => {
    const { router } = await deBaA(BASE("maestro", B), BASE("maestro", A))
    await escribir("Anuncio", "Aviso para Historia")
    await elegirArchivo()
    act(() => screen.getByLabelText("Anuncio").focus())

    await navegar(router, -1)
    const tituloB = await titulo(NOMBRES[B] ?? "")
    expect(await valorDe("Anuncio")).toBe("")
    expect(screen.queryAllByText(/guia\.pdf/)).toHaveLength(0)
    await waitFor(() => expect(document.activeElement).toBe(tituloB), ESPERA)
  })

  it("CH6-A11 (Dudas): la duda escrita en A no está en B", async () => {
    const { router } = await deBaA(`${BASE("maestro", B)}/dudas`, `${BASE("maestro", A)}/dudas`)
    await escribir("Escribe tu duda", "¿Para Historia?")
    act(() => screen.getByLabelText("Escribe tu duda").focus())

    await navegar(router, -1)
    const tituloB = await titulo(NOMBRES[B] ?? "")
    expect(await valorDe("Escribe tu duda")).toBe("")
    await waitFor(() => expect(document.activeElement).toBe(tituloB), ESPERA)
  })

  it("CH6-A11 (Recursos): el recurso que se escribía en A no está en B", async () => {
    const { router } = await deBaA(
      `${BASE("maestro", B)}/recursos`,
      `${BASE("maestro", A)}/recursos`,
    )
    await escribir("Título del recurso", "Guía de Historia")
    act(() => screen.getByLabelText("Título del recurso").focus())

    await navegar(router, -1)
    const tituloB = await titulo(NOMBRES[B] ?? "")
    expect(await valorDe("Título del recurso")).toBe("")
    await waitFor(() => expect(document.activeElement).toBe(tituloB), ESPERA)
  })

  it("CH6-A11 («Nuevo tema»): abierto y con texto en A, está cerrado en B; con el foco en el campo, va al título de B", async () => {
    const { router } = await deBaA(`${BASE("maestro", B)}/trabajo`, `${BASE("maestro", A)}/trabajo`)
    await pulsar("Nuevo tema")
    await escribir("Nombre del tema", "Unidad de Historia")
    act(() => screen.getByLabelText("Nombre del tema").focus())

    await navegar(router, -1)
    const tituloB = await titulo(NOMBRES[B] ?? "")
    expect(await buscarBoton("Nuevo tema")).toBeInTheDocument()
    expect(screen.queryByLabelText("Nombre del tema")).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(tituloB), ESPERA)

    await navegar(router, 1)
    await titulo(NOMBRES[A] ?? "")
    expect(await buscarBoton("Nuevo tema")).toBeInTheDocument()
    expect(screen.queryByLabelText("Nombre del tema")).toBeNull()
  })

  it("CH6-A11: con la publicación de A retenida al saltar a B, al soltarla sale un aviso y solo se renueva la lista de A", async () => {
    const pendiente = retenida()
    preparar(`POST /api/clases/${A}/publicaciones`, pendiente.respuesta)
    const { router, cliente } = await deBaA(BASE("maestro", B), BASE("maestro", A))
    await escribir("Anuncio", "Aviso para Historia")
    await pulsar("Publicar anuncio")
    await waitFor(
      () => expect(pedidas("POST", `/api/clases/${A}/publicaciones`)).toHaveLength(1),
      ESPERA,
    )

    await navegar(router, -1)
    await titulo(NOMBRES[B] ?? "")
    nadaEnEspera()
    const listaDeB = pedidas("GET", `/api/clases/${B}/publicaciones`).length
    await pendiente.soltar(() =>
      respuestaJson(201, {
        publicacion: {
          id: uuid("5f5f3c4d", 9),
          tipo: "anuncio",
          titulo: null,
          texto: "Aviso para Historia",
          autor: FIRMA,
          creadoEn: CREADO_EN,
          comentarios: 0,
          adjuntos: [],
          puedeBorrar: true,
          tarea: null,
        },
      }),
    )
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    await reposar(100)
    expect(pedidas("GET", `/api/clases/${B}/publicaciones`)).toHaveLength(listaDeB)
    expect(cliente.getQueryState(clavePublicaciones(A))?.isInvalidated).toBe(true)
    expect(await valorDe("Anuncio")).toBe("")
  })

  it.each([
    ["Avisos", "", "Borrar publicación", "Avisos"],
    ["Actividades", "/trabajo", /^Borrar tema/, "Actividades de aprendizaje"],
  ] as const)(
    "CH6-A11 (regresión O-14, %s): con el foco en una fila de la lista de A, el salto lo lleva al h2 de la lista de B",
    async (_lista, resto, control, encabezado) => {
      const { router } = await deBaA(
        `${BASE("maestro", B)}${resto}`,
        `${BASE("maestro", A)}${resto}`,
      )
      const fila = await buscarBoton(control)
      act(() => fila.focus())

      await navegar(router, -1)
      await titulo(NOMBRES[B] ?? "")
      const h2 = await screen.findByRole("heading", { level: 2, name: encabezado }, ESPERA)
      await waitFor(() => expect(document.activeElement).toBe(h2), ESPERA)
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// CH6-A12: Calificaciones
// ---------------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------------
// CH6-A19: las entregas de una tarea (T-01 de la ronda 1; Forma C en entregas-view.tsx)
// ---------------------------------------------------------------------------------------------------

describe("CH6-A19 · las entregas de una tarea", () => {
  const rutaEntregas = (tareaId: string) => `${BASE("maestro", A)}/tareas/${tareaId}/entregas`
  const apiEntregas = (tareaId: string) => `/api/clases/${A}/tareas/${tareaId}/entregas`
  const paginasSiguientesDe = (tareaId: string) =>
    pedidas("GET", apiEntregas(tareaId)).filter((l) => l.url.searchParams.get("cursor") !== null)
      .length
  const listaLista = async (tareaId: string) => {
    await waitFor(
      () => expect(screen.queryAllByText(TITULOS[tareaId] ?? "").length).toBeGreaterThan(0),
      ESPERA,
    )
    await waitFor(
      () => expect(screen.queryAllByText("Alumno 20").length).toBeGreaterThan(0),
      ESPERA,
    )
    return await buscarBoton("Ver más alumnos")
  }

  it("CH6-A19: con «Ver más alumnos» de T1 en vuelo, saltar a las entregas de T2: su «Ver más alumnos» no espera y un clic pide la página de T2; al responder T1, nada de T1 se escribe en T2, sin aviso y sin foco en <body>", async () => {
    servidor.rol = "maestro"
    entregasEnPaginas = true
    const deT1 = retenida()
    siguientesDeEntregas.set(T1, [deT1.respuesta])
    const { router } = await montar(rutaEntregas(T2))
    await listaLista(T2)
    await navegar(router, rutaEntregas(T1))
    fireEvent.click(await listaLista(T1))
    await waitFor(() => expect(paginasSiguientesDe(T1)).toBe(1), ESPERA)

    await navegar(router, -1)
    const verMasDeT2 = await listaLista(T2)
    expect(verMasDeT2).not.toHaveAttribute("aria-busy", "true")
    act(() => verMasDeT2.focus())
    fireEvent.click(verMasDeT2)
    await waitFor(() => expect(paginasSiguientesDe(T2)).toBe(1), ESPERA)
    await waitFor(
      () => expect(screen.queryAllByText("Alumno 21").length).toBeGreaterThan(0),
      ESPERA,
    )

    await deT1.soltar(() =>
      listaDeEntregas([{ id: uuid("6c6c3c4d", 999), nombre: "Solo de la tarea uno" }], null),
    )
    await reposar(100)
    expect(screen.queryAllByText("Solo de la tarea uno")).toHaveLength(0)
    expect(screen.queryAllByText("Alumno 21").length).toBeGreaterThan(0)
    expect(paginasSiguientesDe(T2)).toBe(1)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(document.activeElement).not.toBe(document.body)
    expect(router.state.location.pathname).toBe(rutaEntregas(T2))
  })
})

// ---------------------------------------------------------------------------------------------------
// CH6-A20 a A22 (ronda 2): las listas que sobreviven al cambio de clase (Forma B)
// ---------------------------------------------------------------------------------------------------

type Agrupacion = "Sin tema" | "un tema"
const RECURSOS_DEL_DOCENTE = "Recursos del docente"
const ACTIVIDADES = "Actividades de aprendizaje"
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

// Cada clase con dos filas en «Sin tema» o en un tema propio. Con `paginaDeA`, la sección de A trae una
// página más, que responde lo que se ponga ahí (retenida). `temasQueFallan` hace fallar los temas de la
// sección de esa clase (503) mientras tenga algo.
interface Secciones {
  paginaDeA: Respuesta | undefined
  temasQueFallan: string | null
}
const conSecciones = (agrupacion: Agrupacion, conMas = false): Secciones => {
  const estado: Secciones = { paginaDeA: undefined, temasQueFallan: null }
  manejador = (llamada) => {
    if (llamada.metodo !== "GET") return undefined
    const [, , , claseId, recurso] = llamada.url.pathname.split("/")
    if (claseId === undefined) return undefined
    const parametros = llamada.url.searchParams
    if (recurso === "temas") {
      const seccion = parametros.get("seccion")
      if (seccion !== "docente" && seccion !== "actividades") return undefined
      if (estado.temasQueFallan === claseId) {
        return errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado.")
      }
      return respuestaJson(
        200,
        agrupacion === "Sin tema"
          ? { temas: [], sinTema: 2 }
          : {
              temas: [{ id: temaDe(claseId), nombre: "Unidad 1", orden: 0, elementos: 2 }],
              sinTema: 0,
            },
      )
    }
    if (recurso !== "recursos" && recurso !== "trabajo") return undefined
    if (recurso === "recursos" && parametros.get("bloque") !== "docente") return undefined
    const fila = recurso === "recursos" ? recursoDeLista : materialDeLista
    const campo = recurso === "recursos" ? "recursos" : "elementos"
    if (parametros.get("cursor") !== null) {
      if (estado.paginaDeA !== undefined && claseId === A) {
        return Promise.resolve().then(estado.paginaDeA)
      }
      return respuestaJson(200, { [campo]: [fila(claseId, 3)], siguienteCursor: null })
    }
    return respuestaJson(200, {
      [campo]: [fila(claseId, 1), fila(claseId, 2)],
      siguienteCursor: conMas && claseId === A ? idDeFila(claseId, 2) : null,
    })
  }
  return estado
}

const filaConTitulo = (tituloDeLaFila: string) => {
  const fila = screen
    .getByText(tituloDeLaFila)
    .closest<HTMLElement>("[data-recurso-id], [data-elemento-id]")
  if (fila === null) throw new Error(`Precondición: la fila de «${tituloDeLaFila}»`)
  return fila
}

// Monta la lista de B y salta a la de A (push): las dos quedan en caché.
const listaDeBaA = async (seccion: string, agrupacion: Agrupacion, conMas = false) => {
  servidor.rol = "maestro"
  const secciones = conSecciones(agrupacion, conMas)
  const montado = await montar(`${BASE("maestro", B)}/${seccion}`)
  await titulo(NOMBRES[B] ?? "")
  await screen.findByText(tituloDeFila(B, 2), {}, ESPERA)
  await navegar(montado.router, `${BASE("maestro", A)}/${seccion}`)
  await titulo(NOMBRES[A] ?? "")
  await screen.findByText(tituloDeFila(A, 2), {}, ESPERA)
  return { ...montado, secciones }
}

const volverABConElFocoEnElH2 = async (router: Enrutador, encabezado: string) => {
  await navegar(router, -1)
  await titulo(NOMBRES[B] ?? "")
  await screen.findByText(tituloDeFila(B, 2), {}, ESPERA)
  await reposar(150)
  const activo = document.activeElement
  const dondeQuedo =
    activo?.closest("li")?.textContent?.slice(0, 40) ?? activo?.textContent ?? "(nada)"
  expect(activo, `el foco quedó en «${dondeQuedo}»`).toBe(
    screen.getByRole("heading", { level: 2, name: encabezado }),
  )
}

describe("CH6-A20 · «Sin tema» de Recursos y de Actividades al cambiar de clase (T-02)", () => {
  it("CH6-A20 (Recursos): con el foco en «Borrar recurso» de una fila de «Sin tema» de A, saltar a B lleva el foco al h2 «Recursos del docente»", async () => {
    const { router } = await listaDeBaA("recursos", "Sin tema")
    const borrar = within(filaConTitulo(tituloDeFila(A, 2))).getByRole("button", {
      name: "Borrar recurso",
    })
    act(() => borrar.focus())
    expect(document.activeElement).toBe(borrar)
    await volverABConElFocoEnElH2(router, RECURSOS_DEL_DOCENTE)
  })

  it("CH6-A20 (Actividades): con el foco en una fila de «Sin tema» de A, saltar a B lleva el foco al h2 «Actividades de aprendizaje»", async () => {
    const { router } = await listaDeBaA("trabajo", "Sin tema")
    const fila = filaConTitulo(tituloDeFila(A, 2))
    act(() => fila.focus())
    expect(document.activeElement).toBe(fila)
    await volverABConElFocoEnElH2(router, ACTIVIDADES)
  })

  it("CH6-A20 (Recursos, «Ver más»): con «Ver más de Sin tema» de A en vuelo y el foco en él, saltar a B (sin página siguiente) lleva el foco al h2 «Recursos del docente» y la página de A no se escribe en B", async () => {
    const { router, secciones } = await listaDeBaA("recursos", "Sin tema", true)
    const pendiente = retenida()
    secciones.paginaDeA = pendiente.respuesta
    const verMas = await buscarBoton("Ver más de Sin tema")
    act(() => verMas.focus())
    fireEvent.click(verMas)
    await waitFor(
      () =>
        expect(
          pedidas("GET", `/api/clases/${A}/recursos`).filter(
            (l) => l.url.searchParams.get("cursor") !== null,
          ),
        ).toHaveLength(1),
      ESPERA,
    )
    await volverABConElFocoEnElH2(router, RECURSOS_DEL_DOCENTE)
    await pendiente.soltar(() =>
      respuestaJson(200, { recursos: [recursoDeLista(A, 3)], siguienteCursor: null }),
    )
    await reposar(100)
    expect(screen.queryByText(tituloDeFila(A, 3))).toBeNull()
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { level: 2, name: RECURSOS_DEL_DOCENTE }),
    )
  })
})

describe("CH6-A21 · el aviso de recarga de una lista que sobrevive al cambio de clase (T-03)", () => {
  it.each([
    ["Recursos", "recursos", "docente"],
    ["Actividades", "trabajo", "actividades"],
  ] as const)(
    "CH6-A21 (%s): la recarga de B falla y avisa una vez; al saltar a A (sana, en caché) y volver a B no sale otro aviso; un fallo nuevo después en A avisa una vez",
    async (_lista, seccion, temas) => {
      const { router, cliente, secciones } = await listaDeBaA(seccion, "un tema")
      await navegar(router, -1)
      await titulo(NOMBRES[B] ?? "")
      await screen.findByText(tituloDeFila(B, 2), {}, ESPERA)

      secciones.temasQueFallan = B
      await act(async () => {
        await cliente
          .refetchQueries({ queryKey: claveTemasDeLaSeccion(B, temas), exact: true })
          .catch(() => undefined)
      })
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      const primero = String(aviso.error.mock.calls[0]?.[0])
      expect(primero.trim()).not.toBe("")
      secciones.temasQueFallan = null

      await navegar(router, 1)
      await titulo(NOMBRES[A] ?? "")
      await screen.findByText(tituloDeFila(A, 2), {}, ESPERA)
      await reposar(150)
      expect(aviso.error, "en A (sana) salió un aviso de recarga").toHaveBeenCalledTimes(1)

      await navegar(router, -1)
      await titulo(NOMBRES[B] ?? "")
      await screen.findByText(tituloDeFila(B, 2), {}, ESPERA)
      await reposar(150)
      expect(aviso.error, "al volver a B se repitió el aviso").toHaveBeenCalledTimes(1)

      // Control de R8: un fallo nuevo, ya en A, avisa una vez.
      await navegar(router, 1)
      await titulo(NOMBRES[A] ?? "")
      await screen.findByText(tituloDeFila(A, 2), {}, ESPERA)
      secciones.temasQueFallan = A
      await act(async () => {
        await cliente
          .refetchQueries({ queryKey: claveTemasDeLaSeccion(A, temas), exact: true })
          .catch(() => undefined)
      })
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
      expect(String(aviso.error.mock.calls[1]?.[0])).toBe(primero)
      await reposar(150)
      expect(aviso.error).toHaveBeenCalledTimes(2)
    },
    15_000,
  )
})

// H-R2: Avisos y Dudas sobreviven al cambio de clase con useFocoAlCargarMas.
const publicacionDeLista = (claseId: string, n: number) => ({
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

describe("CH6-A22 · Avisos y Dudas con el foco en «Ver más» al cambiar de clase (H-R2)", () => {
  it.each([
    ["Avisos", "", "publicaciones", publicacionDeLista, "Ver más avisos", "Avisos"],
    ["Dudas", "/dudas", "dudas", dudaDeLista, "Ver más dudas", "Dudas"],
  ] as const)(
    "CH6-A22 (%s): con el foco en «Ver más» de A (con página siguiente) y el salto a B (sin página siguiente), el foco va al h2 de la lista",
    async (_lista, resto, recurso, fila, verMas, encabezado) => {
      servidor.rol = "maestro"
      manejador = (llamada) => {
        if (llamada.metodo !== "GET") return undefined
        const [, , , claseId, sub] = llamada.url.pathname.split("/")
        if (claseId === undefined || sub !== recurso) return undefined
        if (llamada.url.searchParams.get("cursor") !== null) {
          return respuestaJson(200, { [recurso]: [fila(claseId, 3)], siguienteCursor: null })
        }
        return respuestaJson(200, {
          [recurso]: [fila(claseId, 1), fila(claseId, 2)],
          siguienteCursor: claseId === A ? idDeFila(claseId, 2) : null,
        })
      }
      const { router } = await deBaA(
        `${BASE("maestro", B)}${resto}`,
        `${BASE("maestro", A)}${resto}`,
      )
      await screen.findByText(tituloDeFila(A, 2), {}, ESPERA)
      const boton = await buscarBoton(verMas)
      act(() => boton.focus())
      expect(document.activeElement).toBe(boton)

      await navegar(router, -1)
      await titulo(NOMBRES[B] ?? "")
      await screen.findByText(tituloDeFila(B, 2), {}, ESPERA)
      await reposar(150)
      const activo = document.activeElement
      const dondeQuedo =
        activo?.closest("li")?.textContent?.slice(0, 40) ?? activo?.textContent ?? "(nada)"
      expect(activo, `el foco quedó en «${dondeQuedo}»`).toBe(
        screen.getByRole("heading", { level: 2, name: encabezado }),
      )
    },
  )
})

describe("CH6-A12 · calificaciones", () => {
  it("CH6-A12 (gradebook): tras avanzar a «Alumnos siguientes» en A, saltar a B pide la primera ventana de B, sin el cursor de A, y no dice que la clase cambió", async () => {
    const { router } = await deBaA(
      `${BASE("maestro", B)}/calificaciones`,
      `${BASE("maestro", A)}/calificaciones`,
    )
    await screen.findByText(P1.nombre, {}, ESPERA)
    await pulsar("Alumnos siguientes")
    await screen.findByText(P2.nombre, {}, ESPERA)

    await navegar(router, -1)
    await titulo(NOMBRES[B] ?? "")
    await reposar(100)
    const deB = pedidas("GET", `/api/clases/${B}/gradebook`)
    expect(deB.every((llamada) => llamada.url.searchParams.get("cursor") === null)).toBe(true)
    expect(screen.queryByText(/La clase cambió/)).toBeNull()
    expect(await screen.findByText(P1.nombre, {}, ESPERA)).toBeInTheDocument()
  })

  it("CH6-A12 (Mis calificaciones): con el filtro «Entregadas» en A, en B el filtro es «Todas»", async () => {
    servidor.rol = "estudiante"
    const { router } = await deBaA(
      `${BASE("estudiante", B)}/calificaciones`,
      `${BASE("estudiante", A)}/calificaciones`,
    )
    const filtro = await campo("Mostrar")
    fireEvent.change(filtro, { target: { value: "entregadas" } })
    await waitFor(() =>
      expect((screen.getByLabelText("Mostrar") as HTMLSelectElement).value).toBe("entregadas"),
    )

    await navegar(router, -1)
    await titulo(NOMBRES[B] ?? "")
    await waitFor(
      () => expect((screen.getByLabelText("Mostrar") as HTMLSelectElement).value).toBe("todas"),
      ESPERA,
    )
  })
})

// ---------------------------------------------------------------------------------------------------
// CH6-A13: estados vecinos
// ---------------------------------------------------------------------------------------------------

describe("CH6-A13 · estados vecinos", () => {
  it("CH6-A13 (a): A → B → A → B con la confirmación abierta y el DELETE de A en vuelo: nada abierto ni en espera en ninguna, y la respuesta da un aviso", async () => {
    servidor.rol = "admin"
    const claveA = `/api/admin/clases/${A}/maestros/${MAESTRO_2.id}`
    const pendiente = retenida()
    preparar(`DELETE ${claveA}`, pendiente.respuesta)
    const { router } = await deBaA(`${BASE("admin", B)}/personas`, `${BASE("admin", A)}/personas`)
    await pulsar(QUITAR_MAESTRO)
    await pulsar(SI_QUITAR_MAESTRO)
    await waitFor(() => expect(pedidas("DELETE", claveA)).toHaveLength(1), ESPERA)

    for (const [paso, nombre] of [
      [-1, NOMBRES[B]],
      [1, NOMBRES[A]],
      [-1, NOMBRES[B]],
    ] as const) {
      await navegar(router, paso)
      await titulo(nombre ?? "")
      await buscarBoton(QUITAR_MAESTRO)
      expect(boton(SI_QUITAR_MAESTRO)).toBeNull()
      nadaEnEspera()
    }
    await pendiente.soltar(() => {
      servidor.maestros[A] = [MAESTRO_1]
      return respuestaJson(200, { maestros: [MAESTRO_1] })
    })
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    await reposar()
    expect(aviso.success).toHaveBeenCalledTimes(1)
    expect(boton(SI_QUITAR_MAESTRO)).toBeNull()
  })

  it("CH6-A13 (b): con el destino sin caché, la clase se carga y todo nace cerrado (regresión)", async () => {
    servidor.rol = "admin"
    const { router } = await montar(`${BASE("admin", A)}/personas`)
    await titulo(NOMBRES[A] ?? "")
    await pulsar(QUITAR_MAESTRO)
    await buscarBoton(SI_QUITAR_MAESTRO)

    await navegar(router, `${BASE("admin", B)}/personas`)
    await titulo(NOMBRES[B] ?? "")
    expect(await buscarBoton(QUITAR_MAESTRO)).toBeInTheDocument()
    expect(boton(SI_QUITAR_MAESTRO)).toBeNull()
  })

  it("CH6-A13 (c): con el DELETE de A en vuelo, ir al inicio y soltarlo: un aviso, sin errores", async () => {
    servidor.rol = "maestro"
    const claveA = `/api/clases/${A}/alumnos/${P1.id}`
    const pendiente = retenida()
    preparar(`DELETE ${claveA}`, pendiente.respuesta)
    const { router } = await deBaA(
      `${BASE("maestro", B)}/personas`,
      `${BASE("maestro", A)}/personas`,
    )
    await pulsar(QUITAR_ALUMNO)
    await pulsar(SI_QUITAR_ALUMNO)
    await waitFor(() => expect(pedidas("DELETE", claveA)).toHaveLength(1), ESPERA)

    await navegar(router, "/maestro")
    await waitFor(() =>
      expect(screen.queryByRole("heading", { level: 1, name: NOMBRES[A] ?? "" })).toBeNull(),
    )
    await pendiente.soltar(sinContenido)
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    await reposar()
    expect(aviso.success).toHaveBeenCalledTimes(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CH6-A13 (d): con StrictMode, el doble montaje no reabre nada ni mueve el foco", async () => {
    servidor.rol = "admin"
    const { router } = await deBaA(
      `${BASE("admin", B)}/personas`,
      `${BASE("admin", A)}/personas`,
      true,
    )
    await pulsar(QUITAR_MAESTRO)
    const cancelar = await buscarBoton(CANCELAR_MAESTRO)
    act(() => cancelar.focus())

    await navegar(router, -1)
    const tituloB = await titulo(NOMBRES[B] ?? "")
    await buscarBoton(QUITAR_MAESTRO)
    expect(boton(SI_QUITAR_MAESTRO)).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(tituloB), ESPERA)
    await reposar(100)
    expect(document.activeElement).toBe(tituloB)
    expect(boton(SI_QUITAR_MAESTRO)).toBeNull()
  })
})

// ---------------------------------------------------------------------------------------------------
// CH6-A14: un 400 VALIDACION de A que llega estando en B (§D-2)
// ---------------------------------------------------------------------------------------------------

interface FormularioDeA14 {
  nombre: string
  rol: Rol
  rutaB: string
  rutaA: string
  // Espera a que el formulario esté listo.
  listo: () => Promise<unknown>
  // Escribe en el formulario de la ruta actual algo que se pueda enviar.
  escribirEnA: () => Promise<void>
  enviar: () => Promise<void>
  clave: string
  // Escribe en el formulario de B y devuelve cómo leerlo.
  escribirEnB: () => Promise<() => Promise<string>>
  campoPintado: string
}

const conTexto = (etiqueta: string, texto: string) => async () => {
  await escribir(etiqueta, texto)
  return () => valorDe(etiqueta)
}

const FORMULARIOS_A14: readonly FormularioDeA14[] = [
  {
    nombre: "anuncio",
    rol: "maestro",
    rutaB: BASE("maestro", B),
    rutaA: BASE("maestro", A),
    listo: () => campo("Anuncio"),
    escribirEnA: () => escribir("Anuncio", "Aviso de A"),
    enviar: () => pulsar("Publicar anuncio"),
    clave: `POST /api/clases/${A}/publicaciones`,
    escribirEnB: conTexto("Anuncio", "Aviso de B"),
    campoPintado: "texto",
  },
  {
    nombre: "duda",
    rol: "maestro",
    rutaB: `${BASE("maestro", B)}/dudas`,
    rutaA: `${BASE("maestro", A)}/dudas`,
    listo: () => campo("Escribe tu duda"),
    escribirEnA: () => escribir("Escribe tu duda", "¿Duda de A?"),
    enviar: () => pulsar("Publicar duda"),
    clave: `POST /api/clases/${A}/dudas`,
    escribirEnB: conTexto("Escribe tu duda", "¿Duda de B?"),
    campoPintado: "texto",
  },
  {
    nombre: "recurso",
    rol: "maestro",
    rutaB: `${BASE("maestro", B)}/recursos`,
    rutaA: `${BASE("maestro", A)}/recursos`,
    listo: () => campo("Título del recurso"),
    escribirEnA: () => escribir("Título del recurso", "Recurso de A"),
    enviar: () => pulsar("Publicar recurso"),
    clave: `POST /api/clases/${A}/publicaciones`,
    escribirEnB: conTexto("Título del recurso", "Recurso de B"),
    campoPintado: "titulo",
  },
  {
    nombre: "tema",
    rol: "maestro",
    rutaB: `${BASE("maestro", B)}/trabajo`,
    rutaA: `${BASE("maestro", A)}/trabajo`,
    listo: () => buscarBoton("Nuevo tema"),
    escribirEnA: async () => {
      await pulsar("Nuevo tema")
      await escribir("Nombre del tema", "Tema de A")
    },
    enviar: () => pulsar("Crear tema"),
    clave: `POST /api/clases/${A}/temas`,
    escribirEnB: async () => {
      await pulsar("Nuevo tema")
      return conTexto("Nombre del tema", "Tema de B")()
    },
    campoPintado: "nombre",
  },
  {
    nombre: "tarea nueva",
    rol: "maestro",
    rutaB: `${BASE("maestro", B)}/tareas/nueva`,
    rutaA: `${BASE("maestro", A)}/tareas/nueva`,
    listo: () => campo("Título"),
    escribirEnA: async () => {
      await escribir("Título", "Tarea de A")
      await escribir("Fecha límite", "2030-01-15T10:00")
    },
    enviar: () => pulsar("Publicar tarea"),
    clave: `POST /api/clases/${A}/tareas`,
    escribirEnB: conTexto("Título", "Tarea de B"),
    campoPintado: "titulo",
  },
  {
    nombre: "edición de tarea",
    rol: "maestro",
    rutaB: rutaTarea("maestro", T2, "/editar"),
    rutaA: rutaTarea("maestro", T1, "/editar"),
    listo: () => buscarBoton("Guardar cambios"),
    escribirEnA: () => escribir("Título", "Cambiado en A"),
    enviar: () => pulsar("Guardar cambios"),
    clave: `PUT /api/clases/${A}/tareas/${T1}`,
    escribirEnB: conTexto("Título", "Cambiado en B"),
    campoPintado: "titulo",
  },
  {
    nombre: "edición de recurso",
    rol: "maestro",
    rutaB: `${BASE("maestro", A)}/recursos/${R2}/editar`,
    rutaA: `${BASE("maestro", A)}/recursos/${R1}/editar`,
    listo: () => buscarBoton("Guardar cambios"),
    escribirEnA: () => escribir("Título del recurso", "Cambiado en A"),
    enviar: () => pulsar("Guardar cambios"),
    clave: `PUT /api/clases/${A}/recursos/${R1}`,
    escribirEnB: conTexto("Título del recurso", "Cambiado en B"),
    campoPintado: "titulo",
  },
  {
    nombre: "panel de calificación",
    rol: "maestro",
    rutaB: rutaEntrega(T1, P2.id),
    rutaA: rutaEntrega(T1, P1.id),
    listo: () => campo(CLARIDAD),
    escribirEnA: async () => {
      await escribir(CLARIDAD, "4")
      await escribir(ORTOGRAFIA, "3")
    },
    enviar: () => pulsar("Calificar y devolver"),
    clave: `PUT ${rutaApiEntrega(T1, P1.id)}/calificacion`,
    escribirEnB: conTexto(CLARIDAD, "2"),
    campoPintado: "comentario",
  },
]

const VALIDACIONES = (pintado: string): readonly (readonly [string, string])[] => [
  ["un campo que el formulario pinta", `${pintado}: Revisa este campo.`],
  ["un campo que el formulario no pinta", "otroCampo: Revisa este campo."],
  ["un mensaje de solo espacios", "   "],
  ["un prefijo con ruta", "archivoIds.0.id: Revisa este campo."],
]

describe("CH6-A14 · VALIDACION de A estando en B", () => {
  it.each(
    FORMULARIOS_A14.flatMap((formulario) =>
      VALIDACIONES(formulario.campoPintado).map(
        ([caso, mensaje]) => [formulario.nombre, caso, formulario, mensaje] as const,
      ),
    ),
  )(
    "CH6-A14: %s, con %s: un solo aviso legible, ningún ErrorDeCampo en B y lo escrito en B intacto",
    async (_nombre, _caso, formulario, mensaje) => {
      servidor.rol = formulario.rol
      const pendiente = retenida()
      preparar(formulario.clave, pendiente.respuesta)
      const { router } = await montar(formulario.rutaB)
      await formulario.listo()
      await navegar(router, formulario.rutaA)
      await formulario.listo()
      await reposar()
      await formulario.escribirEnA()
      await formulario.enviar()
      const [metodo, ruta] = formulario.clave.split(" ")
      await waitFor(() => expect(pedidas(metodo ?? "", ruta ?? "")).toHaveLength(1), ESPERA)

      await navegar(router, -1)
      await formulario.listo()
      await reposar()
      const leer = await formulario.escribirEnB()
      const escrito = await leer()

      await pendiente.soltar(() => errorApi(400, "VALIDACION", mensaje))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      await reposar(100)
      expect(aviso.error).toHaveBeenCalledTimes(1)
      const texto = String(aviso.error.mock.calls[0]?.[0])
      expect(texto.trim()).not.toBe("")
      expect(texto).not.toMatch(/^[\w.]+:/)
      sinErroresDeCampo()
      expect(await leer()).toBe(escrito)
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// CH6-A17: hermanos que no cambian (regresión)
// ---------------------------------------------------------------------------------------------------

describe("CH6-A17 · hermanos que no cambian", () => {
  it("CH6-A17 (EditorDeCategorias): la categoría agregada y escrita en A no está en el editor de B", async () => {
    const rutaCategorias = (claseId: string) => `${BASE("maestro", claseId)}/categorias`
    const { router } = await deBaA(rutaCategorias(B), rutaCategorias(A))
    await pulsar("Agregar categoría")
    await escribir(/^Nombre/, "Proyectos de A")

    await navegar(router, -1)
    await titulo(NOMBRES[B] ?? "")
    expect(await buscarBoton("Agregar categoría")).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Nombre/)).toBeNull()
    expect(screen.queryByDisplayValue("Proyectos de A")).toBeNull()
  })

  it("CH6-A17 («Mis calificaciones» de una clase anterior): con el filtro «Entregadas» en A, en la clase anterior B el filtro es «Todas»", async () => {
    servidor.rol = "estudiante"
    servidor.archivadas = new Set([A, B])
    const rutaAnterior = (claseId: string) => `/estudiante/clases-anteriores/${claseId}`
    const { router } = await deBaA(rutaAnterior(B), rutaAnterior(A))
    fireEvent.change(await campo("Mostrar"), { target: { value: "entregadas" } })
    await waitFor(() =>
      expect((screen.getByLabelText("Mostrar") as HTMLSelectElement).value).toBe("entregadas"),
    )

    await navegar(router, -1)
    await titulo(NOMBRES[B] ?? "")
    await waitFor(
      () => expect((screen.getByLabelText("Mostrar") as HTMLSelectElement).value).toBe("todas"),
      ESPERA,
    )
  })

  it("CH6-A17 (DuplicarClaseDeLaRuta): el nombre escrito para duplicar A no está al duplicar B", async () => {
    servidor.rol = "admin"
    const rutaDuplicar = (claseId: string) => `${BASE("admin", claseId)}/duplicar`
    const { router } = await deBaA(rutaDuplicar(B), rutaDuplicar(A))
    await escribir("Nombre de la clase", "Copia escrita en A")

    await navegar(router, -1)
    await titulo(NOMBRES[B] ?? "")
    await waitFor(async () => expect(await valorDe("Nombre de la clase")).not.toBe(""), ESPERA)
    expect(await valorDe("Nombre de la clase")).not.toBe("Copia escrita en A")
  })
})
