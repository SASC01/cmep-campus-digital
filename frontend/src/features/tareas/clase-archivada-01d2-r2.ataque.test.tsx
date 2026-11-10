import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { claveClaseDetalle } from "@/services/clasesService"
import { claveTarea } from "@/services/trabajoService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { TEXTOS_DETALLE_TAREA, TEXTOS_FORMULARIO_TAREA } from "./data"

// Ataque ADMIN-01d2, ronda 2 (tester): T-01 con `callado` en la entrega de un alumno, otra tarea sin desmontar y las
// cuatro vistas del gancho tras dos vueltas. Router real; la caché a mano, con las opciones de app/providers.tsx y sin
// reintento. Las esperas son por estado; lo que debe quedar en vuelo se retiene con una promesa. El arnés es el de
// clase-archivada-01d2-tareas.test.tsx.

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

type Rol = "estudiante" | "maestro" | "admin"

const ESPERA = { timeout: 8000 }
const CLASE = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const TAREA_NUEVA = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d78"
const ALUMNO = "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0301"
const ARCHIVO = "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d61"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const API = `/api/clases/${CLASE}`
const API_TAREA = `${API}/tareas/${TAREA}`
const API_ALUMNO = `${API_TAREA}/entregas/${ALUMNO}`
const API_CALIFICAR = `${API_ALUMNO}/calificacion`
const API_MI_ENTREGA = `${API_TAREA}/entrega`
const ARCHIVADA = "Esta clase está archivada: solo se puede consultar."
const BASES: Record<Rol, string> = {
  estudiante: `/estudiante/clases/${CLASE}`,
  maestro: `/maestro/clases/${CLASE}`,
  admin: `/admin/clases/${CLASE}`,
}
const RUTAS = {
  detalle: `${BASES.maestro}/tareas/${TAREA}`,
  editar: `${BASES.maestro}/tareas/${TAREA}/editar`,
  crear: `${BASES.maestro}/tareas/nueva`,
  entrega: `${BASES.maestro}/tareas/${TAREA}/entregas/${ALUMNO}`,
  otra: `${BASES.maestro}/dudas`,
}

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

type Manejador = (llamada: Llamada) => Response | Promise<Response> | undefined
const sinManejador: Manejador = () => undefined

const servidor = {
  rol: "maestro" as Rol,
  archivada: false,
  version: 3,
  rubrica: [] as { id: string; criterio: string; puntosMax: number }[],
  calificacion: null as unknown,
  estadoDeMiEntrega: "asignado",
  adjuntosDeMiEntrega: [] as unknown[],
  detalleRetenido: null as Promise<void> | null,
  manejador: sinManejador,
}
let llamadas: Llamada[] = []

const detalle = () => ({
  clase: {
    id: CLASE,
    nombre: "Historia",
    descripcion: "",
    maestro: MAESTRO,
    maestros: [MAESTRO],
    archivadaEn: servidor.archivada ? "2026-10-05T12:00:00.000Z" : null,
  },
})

const tareaDoble = (id = TAREA) => ({
  tarea: {
    id,
    titulo: `Versión ${String(servidor.version)}`,
    instrucciones: "",
    fechaLimite: "2030-01-15T16:00:00.000Z",
    puntos: 10,
    aceptaTardias: true,
    requiereAdjuntos: true,
    version: servidor.version,
    categoria: null,
    tema: null,
    rubrica: servidor.rubrica,
    adjuntos: [],
    autor: { ...MAESTRO, administracion: false },
    creadoEn: "2026-01-01T15:30:00.000Z",
    actualizadoEn: "2026-01-01T15:30:00.000Z",
    puedeEditar: true,
    puedeBorrar: true,
  },
})

const entregaDoble = () => ({
  entrega: {
    alumno: { id: ALUMNO, nombre: "Ana Ruiz" },
    estado: servidor.calificacion === null ? "entregado" : "calificado",
    fechaEntrega: "2026-01-09T15:30:00.000Z",
    conRetraso: false,
    enlaces: [],
    adjuntos: [],
    version: 2,
    calificacion: servidor.calificacion,
  },
})

const calificacionDoble = {
  puntos: 8,
  sobre: 10,
  fecha: "2026-01-10T18:00:00.000Z",
  puntajes: [],
}

const miEntregaDoble = () => {
  const entregado = servidor.estadoDeMiEntrega === "entregado"
  return {
    entrega: {
      estado: servidor.estadoDeMiEntrega,
      fechaEntrega: entregado ? "2026-01-09T15:30:00.000Z" : null,
      conRetraso: false,
      enlaces: [],
      adjuntos: servidor.adjuntosDeMiEntrega,
      puedeEntregar: !entregado,
      puedeAnular: entregado,
      calificacion: null,
    },
  }
}

const hiloDoble = {
  comentarios: [
    {
      id: "5a5b3c4d-1c1f-4b8e-9a1e-000000000001",
      texto: "Revisa la conclusión",
      autor: { ...MAESTRO, administracion: false },
      creadoEn: "2026-01-09T15:30:00.000Z",
      propio: false,
    },
  ],
  siguienteCursor: null,
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
  if (url.pathname === API && metodo === "GET") {
    if (servidor.detalleRetenido !== null) {
      return servidor.detalleRetenido.then(() => respuestaJson(200, detalle()))
    }
    return respuestaJson(200, detalle())
  }
  if (url.pathname === "/api/clases/inscritas" || url.pathname === "/api/clases/impartidas") {
    return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
  }
  if (url.pathname === "/api/clases/anteriores") {
    return respuestaJson(200, {
      clases: [],
      total: 0,
      siguienteCursor: null,
      siguienteCursorArchivadaEn: null,
    })
  }
  if (url.pathname === `${API}/mis-calificaciones`) {
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
  if (metodo !== "GET" && servidor.archivada) return archivadaJson()
  if (url.pathname === `${API}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
  if (url.pathname === `${API}/dudas`) {
    return respuestaJson(200, { dudas: [], siguienteCursor: null })
  }
  if (url.pathname === `${API}/trabajo`) {
    return respuestaJson(200, { elementos: [], siguienteCursor: null })
  }
  if (url.pathname === `${API}/temas`) return respuestaJson(200, { temas: [], sinTema: 0 })
  if (url.pathname === `${API}/categorias`) return respuestaJson(200, { categorias: [] })
  if (url.pathname === `${API}/publicaciones`) {
    return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
  }
  if (url.pathname === API_TAREA && metodo === "GET") return respuestaJson(200, tareaDoble())
  if (url.pathname === `${API_TAREA}/entregas` && metodo === "GET") {
    return respuestaJson(200, { entregas: [], total: 0, entregadas: 0, siguienteCursor: null })
  }
  if (url.pathname === API_ALUMNO && metodo === "GET") return respuestaJson(200, entregaDoble())
  if (url.pathname === `${API_ALUMNO}/comentarios` && metodo === "GET") {
    return respuestaJson(200, hiloDoble)
  }
  if (url.pathname === API_MI_ENTREGA && metodo === "GET") {
    return respuestaJson(200, miEntregaDoble())
  }
  if (url.pathname === `${API_MI_ENTREGA}/comentarios` && metodo === "GET") {
    return respuestaJson(200, hiloDoble)
  }
  if (url.pathname === API_TAREA && metodo === "PUT") return respuestaJson(200, tareaDoble())
  if (url.pathname === API_TAREA && metodo === "DELETE") return new Response(null, { status: 204 })
  if (url.pathname === `${API}/tareas` && metodo === "POST") {
    return respuestaJson(201, tareaDoble(TAREA_NUEVA))
  }
  if (url.pathname === `${API}/tareas/${TAREA_NUEVA}` && metodo === "GET") {
    return respuestaJson(200, tareaDoble(TAREA_NUEVA))
  }
  if (url.pathname === `${API_MI_ENTREGA}/archivos/${ARCHIVO}/descarga`) return archivadaJson()
  if (url.pathname === API_CALIFICAR && metodo === "PUT") {
    servidor.calificacion = calificacionDoble
    return respuestaJson(200, entregaDoble())
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

const montar = async (entradas: string[], cliente?: QueryClient) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, {
    initialEntries: entradas,
    initialIndex: entradas.length - 1,
  })
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

const errores = () => aviso.error.mock.calls.map(([texto]) => String(texto))
const avisoFijo = () => screen.queryByText(/^Clase archivada el /)

const cambiarDetalle = async (cliente: QueryClient, archivada: boolean) => {
  servidor.archivada = archivada
  await act(() => cliente.invalidateQueries({ queryKey: claveClaseDetalle(CLASE), exact: true }))
}

const archivar = async (cliente: QueryClient) => {
  await cambiarDetalle(cliente, true)
  await waitFor(() => expect(avisoFijo()).not.toBeNull(), ESPERA)
}

const restaurar = async (cliente: QueryClient) => {
  await cambiarDetalle(cliente, false)
  await waitFor(() => expect(avisoFijo()).toBeNull(), ESPERA)
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  servidor.rol = "maestro"
  servidor.archivada = false
  servidor.version = 3
  servidor.rubrica = []
  servidor.calificacion = null
  servidor.estadoDeMiEntrega = "asignado"
  servidor.adjuntosDeMiEntrega = []
  servidor.detalleRetenido = null
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

// ------------------------------------------------------------------------------------------------
// Lo de la ronda 2

const ULTIMA_VERSION = TEXTOS_DETALLE_TAREA.avisoRecargaFallida
const quinientos = () => errorJson(500, "ERROR_INTERNO", "falló")

const pedidasDeLaTarea = () =>
  llamadas.filter((l) => l.metodo === "GET" && l.url.pathname === API_TAREA).length

const dejarCorrer = async (cliente: QueryClient) => {
  await waitFor(() => {
    expect(cliente.isFetching()).toBe(0)
    expect(cliente.isMutating()).toBe(0)
  }, ESPERA)
  await act(async () => {
    for (let turno = 0; turno < 50; turno += 1) await Promise.resolve()
  })
}

const dosVueltas = async (cliente: QueryClient) => {
  await archivar(cliente)
  await restaurar(cliente)
  await archivar(cliente)
  await restaurar(cliente)
}

// Las lecturas de la tarea y de la entrega de un alumno responden lo que digan estas funciones.
const lecturas = () => {
  const lectura: {
    tarea: (() => Response | Promise<Response>) | undefined
    entrega: (() => Response | Promise<Response>) | undefined
  } = { tarea: undefined, entrega: undefined }
  servidor.manejador = ({ metodo, url }) => {
    if (metodo !== "GET") return undefined
    if (url.pathname === API_TAREA && lectura.tarea !== undefined) return lectura.tarea()
    if (url.pathname === API_ALUMNO && lectura.entrega !== undefined) return lectura.entrega()
    return undefined
  }
  return lectura
}

describe("ataque ADMIN-01d2 r2, punto 1: T-01 con `callado`, en la entrega de un alumno", () => {
  const entregaNormal = () => respuestaJson(200, entregaDoble())
  const abrir = async () => {
    const lectura = lecturas()
    const cliente = clienteDePrueba()
    const router = await montar([RUTAS.entrega], cliente)
    await screen.findByRole("heading", { name: "Ana Ruiz" }, ESPERA)
    await dejarCorrer(cliente)
    return { lectura, cliente, router }
  }
  const recargar = (cliente: QueryClient) =>
    act(() => {
      void cliente.invalidateQueries({ queryKey: claveTarea(CLASE, TAREA) })
    })

  it("ADM-T2D216: la tarea con 409 mientras la entrega se vuelve a pedir: al volver bien, ningún aviso; un 5xx nuevo avisa una sola vez", async () => {
    const { lectura, cliente } = await abrir()
    const entrega = retener()
    lectura.tarea = archivadaJson
    lectura.entrega = () => entrega.promesa.then(entregaNormal)
    await recargar(cliente)
    await waitFor(() => expect(cliente.isFetching()).toBe(1), ESPERA)
    expect(errores()).toEqual([])
    entrega.soltar()
    await dejarCorrer(cliente)
    expect(errores()).toEqual([])
    lectura.entrega = undefined
    lectura.tarea = quinientos
    await recargar(cliente)
    await dejarCorrer(cliente)
    expect(errores()).toEqual([ULTIMA_VERSION])
  })

  it("ADM-T2D217: la tarea con 409 mientras la entrega se vuelve a pedir, y la persona sale: al volver el fallo no se repite, y un 5xx nuevo avisa una sola vez", async () => {
    const { lectura, cliente, router } = await abrir()
    const entrega = retener()
    lectura.tarea = archivadaJson
    lectura.entrega = () => entrega.promesa.then(entregaNormal)
    await recargar(cliente)
    await waitFor(() => expect(cliente.isFetching()).toBe(1), ESPERA)
    await act(() => router.navigate(RUTAS.otra))
    await screen.findByRole("heading", { name: "Dudas" }, ESPERA)
    entrega.soltar()
    await dejarCorrer(cliente)
    lectura.entrega = undefined
    lectura.tarea = undefined
    await act(() => router.navigate(RUTAS.entrega))
    await screen.findByRole("heading", { name: "Ana Ruiz" }, ESPERA)
    await dejarCorrer(cliente)
    expect(errores()).toEqual([])
    lectura.tarea = quinientos
    await recargar(cliente)
    await dejarCorrer(cliente)
    expect(errores()).toEqual([ULTIMA_VERSION])
  })

  it("ADM-T2D218: la tarea con 409 y la entrega reemplaza la vista: su texto, sin aviso de la tarea; al volver con la entrega sana, un 5xx nuevo avisa una sola vez", async () => {
    const { lectura, cliente, router } = await abrir()
    const NO_ESTA = "Ese alumno no está en esta clase."
    lectura.tarea = archivadaJson
    lectura.entrega = () => errorJson(404, "ALUMNO_NO_ENCONTRADO", NO_ESTA)
    await recargar(cliente)
    await dejarCorrer(cliente)
    expect(screen.queryByRole("heading", { name: "Ana Ruiz" })).toBeNull()
    expect(errores()).toEqual([])
    await act(() => router.navigate(RUTAS.otra))
    await screen.findByRole("heading", { name: "Dudas" }, ESPERA)
    lectura.tarea = undefined
    lectura.entrega = undefined
    await act(() => router.navigate(RUTAS.entrega))
    await screen.findByRole("heading", { name: "Ana Ruiz" }, ESPERA)
    await dejarCorrer(cliente)
    expect(errores()).toEqual([])
    lectura.tarea = quinientos
    await recargar(cliente)
    await dejarCorrer(cliente)
    expect(errores()).toEqual([ULTIMA_VERSION])
  })

  it("ADM-T2D219: un 5xx callado que después se vuelve 409 antes de terminar la entrega: ningún aviso de última versión al terminar", async () => {
    const { lectura, cliente } = await abrir()
    const entrega = retener()
    lectura.tarea = quinientos
    lectura.entrega = () => entrega.promesa.then(entregaNormal)
    await recargar(cliente)
    await waitFor(() => expect(cliente.isFetching()).toBe(1), ESPERA)
    expect(errores()).toEqual([])
    lectura.tarea = archivadaJson
    await waitFor(() => expect(pedidasDeLaTarea()).toBeGreaterThan(0), ESPERA)
    act(() => {
      void cliente.refetchQueries({ queryKey: claveTarea(CLASE, TAREA), exact: true })
    })
    await waitFor(() => expect(cliente.isFetching()).toBe(1), ESPERA)
    entrega.soltar()
    await dejarCorrer(cliente)
    expect(errores()).toEqual([])
  })

  it("ADM-T2D220: otra tarea sin desmontar: la marca de cada consulta es suya: el 409 de la primera no se come el 5xx de la segunda, y al regresar no repite nada", async () => {
    const API_OTRA = `${API}/tareas/${TAREA_NUEVA}`
    const lectura = lecturas()
    const otra: { tarea: () => Response } = {
      tarea: () => respuestaJson(200, tareaDoble(TAREA_NUEVA)),
    }
    const original = servidor.manejador
    servidor.manejador = (llamada) => {
      const { metodo, url } = llamada
      if (metodo !== "GET") return original(llamada)
      if (url.pathname === API_OTRA) return otra.tarea()
      if (url.pathname === `${API_OTRA}/entregas/${ALUMNO}`)
        return respuestaJson(200, entregaDoble())
      if (url.pathname === `${API_OTRA}/entregas/${ALUMNO}/comentarios`) {
        return respuestaJson(200, hiloDoble)
      }
      return original(llamada)
    }
    const cliente = clienteDePrueba()
    const router = await montar([RUTAS.entrega], cliente)
    await screen.findByRole("heading", { name: "Ana Ruiz" }, ESPERA)
    await dejarCorrer(cliente)
    lectura.tarea = archivadaJson
    await act(() => cliente.invalidateQueries({ queryKey: claveTarea(CLASE, TAREA) }))
    await dejarCorrer(cliente)
    expect(errores()).toEqual([])
    const rutaOtra = `${BASES.maestro}/tareas/${TAREA_NUEVA}/entregas/${ALUMNO}`
    await act(() => router.navigate(rutaOtra))
    await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
    await screen.findByRole("heading", { name: "Ana Ruiz" }, ESPERA)
    otra.tarea = quinientos
    await act(() => cliente.invalidateQueries({ queryKey: claveTarea(CLASE, TAREA_NUEVA) }))
    await dejarCorrer(cliente)
    expect(errores()).toEqual([ULTIMA_VERSION])
    await act(() => router.navigate(RUTAS.entrega))
    await dejarCorrer(cliente)
    expect(errores()).toEqual([ULTIMA_VERSION])
  })
})

describe("ataque ADMIN-01d2 r2, punto 7: las cuatro vistas del gancho tras dos vueltas de archivar y restaurar", () => {
  const VISTAS = [
    {
      vista: "el detalle",
      ruta: RUTAS.detalle,
      lista: () => screen.findByRole("link", { name: "Editar tarea" }, ESPERA),
      texto: ULTIMA_VERSION,
    },
    {
      vista: "las entregas",
      ruta: `${RUTAS.detalle}/entregas`,
      lista: () => screen.findByRole("heading", { level: 2, name: /entregas/i }, ESPERA),
      texto: ULTIMA_VERSION,
    },
    {
      vista: "la entrega de un alumno",
      ruta: RUTAS.entrega,
      lista: () => screen.findByRole("heading", { name: "Ana Ruiz" }, ESPERA),
      texto: ULTIMA_VERSION,
    },
    {
      vista: "editar",
      ruta: RUTAS.editar,
      lista: () => screen.findByLabelText("Título", {}, ESPERA),
      texto: TEXTOS_FORMULARIO_TAREA.avisoRecargaFallida,
    },
  ]

  it.each(VISTAS)(
    "ADM-T2D221 ($vista): con datos, el 409 no avisa; el 5xx siguiente, una vez; y otro 409 no repite",
    async ({ ruta, lista, texto }) => {
      const lectura = lecturas()
      const cliente = clienteDePrueba()
      await montar([ruta], cliente)
      await lista()
      await dejarCorrer(cliente)
      await dosVueltas(cliente)
      await lista()
      await dejarCorrer(cliente)
      expect(errores()).toEqual([])
      lectura.tarea = archivadaJson
      await act(() =>
        cliente.invalidateQueries({ queryKey: claveTarea(CLASE, TAREA), exact: true }),
      )
      await dejarCorrer(cliente)
      expect(errores()).toEqual([])
      lectura.tarea = quinientos
      await act(() =>
        cliente.invalidateQueries({ queryKey: claveTarea(CLASE, TAREA), exact: true }),
      )
      await dejarCorrer(cliente)
      expect(errores()).toEqual([texto])
      lectura.tarea = archivadaJson
      await act(() =>
        cliente.invalidateQueries({ queryKey: claveTarea(CLASE, TAREA), exact: true }),
      )
      await dejarCorrer(cliente)
      expect(errores()).toEqual([texto])
    },
  )

  it.each(VISTAS)(
    "ADM-T2D222 ($vista): sin datos en caché, el 409 reemplaza la vista con el texto de archivada, sin ningún aviso, y sin dar por atendido el fallo siguiente",
    async ({ ruta }) => {
      const lectura = lecturas()
      lectura.tarea = archivadaJson
      const cliente = clienteDePrueba()
      await montar([ruta], cliente)
      expect(await screen.findByText(ARCHIVADA, {}, ESPERA)).toBeInTheDocument()
      await dejarCorrer(cliente)
      expect(errores()).toEqual([])
    },
  )
})

describe("ataque ADMIN-01d2 r2: el alumno, con la tarea en 409 y otras cosas a la vez", () => {
  const RUTA_DEL_ALUMNO = `${BASES.estudiante}/tareas/${TAREA}`
  const RUTA_ANTERIOR = `/estudiante/clases-anteriores/${CLASE}`

  it("ADM-T2D223: la tarea en 5xx y, ya con el aviso dado, la recarga siguiente en 409: termina en la clase anterior sin otro aviso", async () => {
    servidor.rol = "estudiante"
    const lectura = lecturas()
    const cliente = clienteDePrueba()
    const router = await montar([RUTA_DEL_ALUMNO], cliente)
    await screen.findByRole("heading", { name: "Tu trabajo" }, ESPERA)
    await dejarCorrer(cliente)
    lectura.tarea = quinientos
    await act(() => cliente.invalidateQueries({ queryKey: claveTarea(CLASE, TAREA), exact: true }))
    await dejarCorrer(cliente)
    expect(errores()).toEqual([ULTIMA_VERSION])
    servidor.archivada = true
    lectura.tarea = archivadaJson
    await act(() => cliente.invalidateQueries({ queryKey: claveTarea(CLASE, TAREA), exact: true }))
    await waitFor(() => expect(router.state.location.pathname).toBe(RUTA_ANTERIOR), ESPERA)
    await dejarCorrer(cliente)
    expect(errores()).toEqual([ULTIMA_VERSION])
  })
})
