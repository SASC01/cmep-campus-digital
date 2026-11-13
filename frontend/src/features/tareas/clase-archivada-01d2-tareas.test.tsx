import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { claveClaseDetalle } from "@/services/clasesService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { HiloPrivado } from "./components/hilo-privado"

// ADMIN-01d2 (§D-9): lo de features/tareas en una clase archivada (filas 31 a 36, M-06, M-07 y T-01 a T-03 de
// 01d1), con el router real (`rutas` de app/router). Donde la prueba necesita la caché a mano, un QueryClient
// con las opciones de app/providers.tsx y sin reintento. Las esperas son por estado; lo que debe quedar en
// vuelo se retiene con una promesa que la prueba suelta.

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
const CRITERIO = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d81"
const ARCHIVO = "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d61"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const API = `/api/clases/${CLASE}`
const API_TAREA = `${API}/tareas/${TAREA}`
const API_ALUMNO = `${API_TAREA}/entregas/${ALUMNO}`
const API_CALIFICAR = `${API_ALUMNO}/calificacion`
const API_MI_ENTREGA = `${API_TAREA}/entrega`
const ARCHIVADA = "Esta clase está archivada: solo se puede consultar."
const VOLVER = "Volver a Actividades de aprendizaje"
const MODIFICADA = "Otra persona guardó cambios en esta tarea mientras la editabas."
const ENTREGA_MODIFICADA = "La entrega cambió mientras la calificabas."
const CON_ENTREGAS = "Esta tarea tiene 3 entregas. Pídelo a administración."
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

const pedidas = (metodo: string, ruta: string) =>
  llamadas.filter((l) => l.metodo === metodo && l.url.pathname === ruta)
const errores = () => aviso.error.mock.calls.map(([texto]) => String(texto))
const exitos = () => aviso.success.mock.calls.map(([texto]) => String(texto))
const avisoFijo = () => screen.queryByText(/^Clase archivada el /)
const boton = (nombre: string | RegExp) => screen.queryByRole("button", { name: nombre })
const buscarBoton = (nombre: string | RegExp) =>
  screen.findByRole("button", { name: nombre }, ESPERA)
const campoCalificacion = () => screen.findByLabelText(/^Calificación \(/, {}, ESPERA)
const CALIFICAR = "Calificar y devolver"
const textoDeArchivo = () => new File(["x"], "guia.pdf", { type: "application/pdf" })

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

const llenarLaTareaNueva = async () => {
  fireEvent.change(await screen.findByLabelText("Título", {}, ESPERA), {
    target: { value: "Ensayo" },
  })
  fireEvent.change(screen.getByLabelText("Fecha límite"), {
    target: { value: "2030-01-15T10:00" },
  })
}

const pulsarGuardar = async () => {
  await screen.findByLabelText("Título", {}, ESPERA)
  fireEvent.click(await buscarBoton("Guardar cambios"))
}

const pulsarPublicar = async () => {
  await llenarLaTareaNueva()
  fireEvent.click(await buscarBoton("Publicar tarea"))
}

const pulsarCalificar = async () => {
  fireEvent.change(await campoCalificacion(), { target: { value: "8" } })
  fireEvent.click(await buscarBoton(CALIFICAR))
}

const pedirElBorrado = async () => {
  fireEvent.click(await buscarBoton("Borrar tarea"))
  fireEvent.click(await buscarBoton("Sí, borrar tarea"))
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
// ADM-1D201, filas 31 a 36, y ADM-1D207

describe("ADM-1D201: filas 31 a 36", () => {
  const FILAS: { fila: number; ruta: string; control: () => HTMLElement | null }[] = [
    {
      fila: 31,
      ruta: RUTAS.detalle,
      control: () => screen.queryByRole("link", { name: "Editar tarea" }),
    },
    { fila: 32, ruta: RUTAS.detalle, control: () => boton("Borrar tarea") },
    { fila: 33, ruta: RUTAS.entrega, control: () => boton(CALIFICAR) },
    { fila: 34, ruta: RUTAS.entrega, control: () => screen.queryByLabelText("Comentario privado") },
  ]

  it.each(FILAS)(
    "ADM-1D201 fila $fila: en una archivada el control no está; en una activa, sí",
    async ({ ruta, control }) => {
      await montar([ruta])
      await waitFor(() => expect(control()).not.toBeNull(), ESPERA)
      cleanup()
      servidor.archivada = true
      await montar([ruta])
      await waitFor(() => expect(avisoFijo()).not.toBeNull(), ESPERA)
      await screen.findByText("Versión 3", {}, ESPERA)
      expect(control()).toBeNull()
    },
  )

  it.each([
    ["maestro" as Rol, "crear", "tareas/nueva"],
    ["admin" as Rol, "crear", "tareas/nueva"],
    ["maestro" as Rol, "editar", `tareas/${TAREA}/editar`],
    ["admin" as Rol, "editar", `tareas/${TAREA}/editar`],
  ])(
    "ADM-1D201 filas 35 y 36 (%s, %s): el texto de archivada y Volver a Actividades, que lleva a su trabajo, sin formulario",
    async (rol, _nombre, resto) => {
      servidor.rol = rol
      servidor.archivada = true
      await montar([`${BASES[rol]}/${resto}`])
      expect(await screen.findByRole("link", { name: VOLVER }, ESPERA)).toHaveAttribute(
        "href",
        `${BASES[rol]}/trabajo`,
      )
      expect(screen.getByText(ARCHIVADA)).toBeInTheDocument()
      expect(screen.queryByLabelText("Título")).toBeNull()
    },
  )
})

describe("ADM-1D207: entrega de un alumno en una archivada", () => {
  it("ADM-1D207: el panel muestra la calificación sin formulario y el hilo del maestro, sin campo", async () => {
    servidor.archivada = true
    servidor.calificacion = calificacionDoble
    await montar([RUTAS.entrega])
    await screen.findByText("Revisa la conclusión", {}, ESPERA)
    expect(screen.getByRole("heading", { name: "Calificación" })).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Calificación \(/)).toBeNull()
    expect(boton("Actualizar calificación")).toBeNull()
    expect(screen.queryByLabelText("Comentario privado")).toBeNull()
    expect(screen.getByText(/8 de 10/)).toBeInTheDocument()
  })

  it("ADM-1D207: sin calificar, dice Sin calificar todavía", async () => {
    servidor.archivada = true
    await montar([RUTAS.entrega])
    expect(await screen.findByText("Sin calificar todavía.", {}, ESPERA)).toBeInTheDocument()
  })

  it("ADM-1D207 control: HiloPrivado montado sin la prop sigue como hoy, con su formulario", async () => {
    render(
      <QueryClientProvider client={clienteDePrueba()}>
        <MemoryRouter>
          <HiloPrivado
            claseId={CLASE}
            tareaId={TAREA}
            rutaDelHilo={`${API_ALUMNO}/comentarios`}
            puedeEscribir
            textoDePrivacidad="Privado"
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByLabelText("Comentario privado", {}, ESPERA)).toBeInTheDocument()
  })
})

// ------------------------------------------------------------------------------------------------
// ADM-1D210 a ADM-1D214: 409 CLASE_ARCHIVADA

describe("ADM-1D210: calificar recibe 409 CLASE_ARCHIVADA", () => {
  it("ADM-1D210: un solo aviso, lo escrito sigue y la key no cambia hasta que llega el detalle, sin pedir la entrega ni la tarea; dos clics, una petición", async () => {
    servidor.rubrica = [{ id: CRITERIO, criterio: "Claridad", puntosMax: 10 }]
    servidor.manejador = ({ metodo, url }) =>
      url.pathname === API_CALIFICAR && metodo === "PUT" ? archivadaJson() : undefined
    const cliente = clienteDePrueba()
    await montar([RUTAS.entrega], cliente)
    const puntos = await screen.findByLabelText(/^Claridad/, {}, ESPERA)
    const comentario = screen.getByLabelText("Comentario para el alumno (opcional)")
    fireEvent.change(puntos, { target: { value: "8" } })
    fireEvent.change(comentario, { target: { value: "Bien hecho" } })
    const retenido = retener()
    servidor.detalleRetenido = retenido.promesa
    servidor.archivada = true
    const antesTarea = pedidas("GET", API_TAREA).length
    const antesEntrega = pedidas("GET", API_ALUMNO).length
    const calificar = await buscarBoton(CALIFICAR)
    fireEvent.click(calificar)
    fireEvent.click(calificar)
    await waitFor(() => expect(errores()).toEqual([ARCHIVADA]), ESPERA)
    expect(pedidas("PUT", API_CALIFICAR)).toHaveLength(1)
    expect(screen.getByLabelText(/^Claridad/)).toBe(puntos)
    expect(puntos).toHaveValue("8")
    expect(comentario).toHaveValue("Bien hecho")
    expect(pedidas("GET", API_TAREA)).toHaveLength(antesTarea)
    expect(pedidas("GET", API_ALUMNO)).toHaveLength(antesEntrega)
    retenido.soltar()
    await waitFor(() => expect(avisoFijo()).not.toBeNull(), ESPERA)
    expect(boton(CALIFICAR)).toBeNull()
    expect(screen.getByText("Sin calificar todavía.")).toBeInTheDocument()
    expect(errores()).toEqual([ARCHIVADA])
  })
})

describe("ADM-1D211 y ADM-1D212: guardar recibe 409 CLASE_ARCHIVADA", () => {
  it("ADM-1D211: un solo aviso, conserva lo escrito sin reiniciarse ni pedir la tarea; al llegar el detalle, el texto de archivada", async () => {
    const cliente = clienteDePrueba()
    await montar([RUTAS.editar], cliente)
    const titulo = await screen.findByLabelText("Título", {}, ESPERA)
    fireEvent.change(titulo, { target: { value: "Lo escrito" } })
    const retenido = retener()
    servidor.detalleRetenido = retenido.promesa
    servidor.archivada = true
    const antes = pedidas("GET", API_TAREA).length
    fireEvent.click(await buscarBoton("Guardar cambios"))
    await waitFor(() => expect(errores()).toEqual([ARCHIVADA]), ESPERA)
    expect(screen.getByLabelText("Título")).toBe(titulo)
    expect(titulo).toHaveValue("Lo escrito")
    expect(pedidas("GET", API_TAREA)).toHaveLength(antes)
    retenido.soltar()
    expect(await screen.findByText(ARCHIVADA, {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByLabelText("Título")).toBeNull()
    expect(errores()).toEqual([ARCHIVADA])
  })

  it("ADM-1D211 control: con 409 TAREA_MODIFICADA sigue recargando y reiniciando como hoy", async () => {
    servidor.manejador = ({ metodo, url }) =>
      url.pathname === API_TAREA && metodo === "PUT"
        ? errorJson(409, "TAREA_MODIFICADA", MODIFICADA)
        : undefined
    await montar([RUTAS.editar])
    const titulo = await screen.findByLabelText("Título", {}, ESPERA)
    fireEvent.change(titulo, { target: { value: "Lo escrito" } })
    servidor.version = 4
    fireEvent.click(await buscarBoton("Guardar cambios"))
    await screen.findByDisplayValue("Versión 4", {}, ESPERA)
    expect(errores()).toEqual([MODIFICADA])
    await waitFor(() => expect(screen.getByLabelText("Título")).toHaveFocus(), ESPERA)
  })

  it("ADM-1D211 hermano: con la vista desmontada, el 409 avisa y deja viejo el detalle (exact), sin pedir nada más", async () => {
    const enVuelo = retener()
    servidor.manejador = ({ metodo, url }) =>
      url.pathname === API_TAREA && metodo === "PUT"
        ? enVuelo.promesa.then(() => archivadaJson())
        : undefined
    const cliente = clienteDePrueba()
    const router = await montar([RUTAS.editar], cliente)
    await pulsarGuardar()
    await waitFor(() => expect(pedidas("PUT", API_TAREA)).toHaveLength(1), ESPERA)
    await act(() => router.navigate("/maestro"))
    await screen.findByRole("link", { name: "Clases archivadas" }, ESPERA)
    enVuelo.soltar()
    await waitFor(() => expect(errores()).toEqual([ARCHIVADA]), ESPERA)
    expect(cliente.getQueryState(claveClaseDetalle(CLASE))?.isInvalidated).toBe(true)
    expect(cliente.getQueryState(["clases", CLASE, "tareas", TAREA])?.isInvalidated).toBe(false)
  })

  it("ADM-1D212: un solo aviso, conserva lo escrito sin navegar; al llegar el detalle, el texto de archivada", async () => {
    const cliente = clienteDePrueba()
    const router = await montar([RUTAS.crear], cliente)
    await llenarLaTareaNueva()
    const retenido = retener()
    servidor.detalleRetenido = retenido.promesa
    servidor.archivada = true
    fireEvent.click(await buscarBoton("Publicar tarea"))
    await waitFor(() => expect(errores()).toEqual([ARCHIVADA]), ESPERA)
    expect(screen.getByLabelText("Título")).toHaveValue("Ensayo")
    expect(router.state.location.pathname).toBe(RUTAS.crear)
    retenido.soltar()
    expect(await screen.findByRole("link", { name: VOLVER }, ESPERA)).toBeInTheDocument()
    expect(screen.getByText(ARCHIVADA)).toBeInTheDocument()
  })
})

describe("ADM-1D213: el alumno", () => {
  const RUTA_TAREA_DEL_ALUMNO = `${BASES.estudiante}/tareas/${TAREA}`
  const RUTA_ANTERIOR = `/estudiante/clases-anteriores/${CLASE}`

  const agregarEnlace = async () => {
    fireEvent.change(await screen.findByLabelText("Enlace", {}, ESPERA), {
      target: { value: "https://ejemplo.mx/trabajo" },
    })
    fireEvent.click(await buscarBoton("Agregar enlace"))
    await screen.findAllByText("https://ejemplo.mx/trabajo", {}, ESPERA)
  }

  const ACCIONES: { accion: string; preparar: () => void; hacer: () => Promise<void> }[] = [
    {
      accion: "Entregar tarea",
      preparar: () => undefined,
      hacer: async () => {
        await agregarEnlace()
        fireEvent.click(await buscarBoton("Entregar tarea"))
      },
    },
    {
      accion: "Anular entrega",
      preparar: () => {
        servidor.estadoDeMiEntrega = "entregado"
      },
      hacer: async () => {
        fireEvent.click(await buscarBoton("Anular entrega"))
        fireEvent.click(await buscarBoton("Sí, anular entrega"))
      },
    },
    {
      accion: "escribir en su hilo",
      preparar: () => undefined,
      hacer: async () => {
        fireEvent.change(await screen.findByLabelText("Comentario privado", {}, ESPERA), {
          target: { value: "Una duda" },
        })
        fireEvent.click(await buscarBoton("Enviar comentario"))
      },
    },
  ]

  it.each(ACCIONES)(
    "ADM-1D213a ($accion): un solo aviso, sin pedir la entrega, y termina en la clase anterior con replace",
    async ({ preparar, hacer }) => {
      servidor.rol = "estudiante"
      preparar()
      const cliente = clienteDePrueba()
      const router = await montar(["/estudiante", RUTA_TAREA_DEL_ALUMNO], cliente)
      await screen.findByText("Revisa la conclusión", {}, ESPERA)
      await screen.findByRole("heading", { name: "Tu trabajo" }, ESPERA)
      const antes = pedidas("GET", API_MI_ENTREGA).length
      servidor.manejador = ({ metodo }) => (metodo === "POST" ? archivadaJson() : undefined)
      servidor.archivada = false
      const original = servidor.manejador
      servidor.manejador = (llamada) => {
        const respuesta = original(llamada)
        if (respuesta !== undefined) servidor.archivada = true
        return respuesta
      }
      await hacer()
      await waitFor(() => expect(router.state.location.pathname).toBe(RUTA_ANTERIOR), ESPERA)
      await waitFor(() => expect(errores()).toEqual([ARCHIVADA]), ESPERA)
      expect(pedidas("GET", API_MI_ENTREGA)).toHaveLength(antes)
      await act(() => router.navigate(-1))
      await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"), ESPERA)
    },
  )

  it("ADM-1D213b: con un archivo y un enlace, la solicitud de subida recibe el 409: sin entregar ni PUT, un aviso, lo elegido sigue y el detalle viejo termina en la clase anterior", async () => {
    servidor.rol = "estudiante"
    const cliente = clienteDePrueba()
    const router = await montar(["/estudiante", RUTA_TAREA_DEL_ALUMNO], cliente)
    await agregarEnlace()
    fireEvent.change(screen.getByLabelText("Adjuntar archivos"), {
      target: { files: [textoDeArchivo()] },
    })
    await screen.findAllByText("guia.pdf", {}, ESPERA)
    const retenido = retener()
    servidor.manejador = ({ metodo, url }) =>
      url.pathname === `${API_MI_ENTREGA}/archivos` && metodo === "POST"
        ? archivadaJson()
        : undefined
    servidor.archivada = true
    servidor.detalleRetenido = retenido.promesa
    fireEvent.click(await buscarBoton("Entregar tarea"))
    await waitFor(() => expect(errores()).toHaveLength(1), ESPERA)
    expect(errores()[0]).toContain(ARCHIVADA)
    expect(pedidas("POST", API_MI_ENTREGA)).toHaveLength(0)
    expect(llamadas.filter((l) => l.metodo === "PUT")).toHaveLength(0)
    expect(screen.getAllByText("guia.pdf").length).toBeGreaterThan(0)
    expect(screen.getAllByText("https://ejemplo.mx/trabajo").length).toBeGreaterThan(0)
    await waitFor(
      () => expect(cliente.getQueryState(claveClaseDetalle(CLASE))?.isInvalidated).toBe(true),
      ESPERA,
    )
    expect(pedidas("GET", API).length).toBe(2)
    retenido.soltar()
    await waitFor(() => expect(router.state.location.pathname).toBe(RUTA_ANTERIOR), ESPERA)
  })

  it("ADM-1D215 (archivo de su entrega): un solo aviso y termina en la redirección de N-05", async () => {
    servidor.rol = "estudiante"
    servidor.estadoDeMiEntrega = "entregado"
    servidor.adjuntosDeMiEntrega = [
      {
        id: ARCHIVO,
        nombre: "mi-trabajo.pdf",
        tipo: "application/pdf",
        tamano: 10,
        vistaPrevia: null,
      },
    ]
    const router = await montar([RUTA_TAREA_DEL_ALUMNO], clienteDePrueba())
    const descargar = await buscarBoton(/^Descargar/)
    servidor.archivada = true
    fireEvent.click(descargar)
    await waitFor(() => expect(router.state.location.pathname).toBe(RUTA_ANTERIOR), ESPERA)
    await waitFor(() => expect(errores()).toHaveLength(1), ESPERA)
    expect(errores()[0]).toContain(ARCHIVADA)
  })
})

describe("ADM-1D214: tarea con un adjunto nuevo", () => {
  it.each([
    ["editar", RUTAS.editar, "Guardar cambios"],
    ["crear", RUTAS.crear, "Publicar tarea"],
  ])(
    "ADM-1D214 (%s): la solicitud de subida recibe el 409: sin guardar, un aviso, conserva lo escrito y el archivo, y al llegar el detalle el texto de archivada",
    async (modo, ruta, accion) => {
      const cliente = clienteDePrueba()
      await montar([ruta], cliente)
      if (modo === "crear") await llenarLaTareaNueva()
      const titulo = await screen.findByLabelText("Título", {}, ESPERA)
      fireEvent.change(titulo, { target: { value: "Lo escrito" } })
      fireEvent.change(screen.getByLabelText("Adjuntar archivos"), {
        target: { files: [textoDeArchivo()] },
      })
      await screen.findAllByText("guia.pdf", {}, ESPERA)
      const retenido = retener()
      servidor.manejador = ({ metodo, url }) =>
        url.pathname === `${API}/archivos` && metodo === "POST" ? archivadaJson() : undefined
      servidor.archivada = true
      servidor.detalleRetenido = retenido.promesa
      const antes = pedidas("GET", API_TAREA).length
      fireEvent.click(await buscarBoton(accion))
      await waitFor(() => expect(errores()).toHaveLength(1), ESPERA)
      expect(errores()[0]).toContain(ARCHIVADA)
      expect(pedidas("PUT", API_TAREA)).toHaveLength(0)
      expect(pedidas("POST", `${API}/tareas`)).toHaveLength(0)
      expect(screen.getByLabelText("Título")).toBe(titulo)
      expect(titulo).toHaveValue("Lo escrito")
      expect(screen.getAllByText("guia.pdf").length).toBeGreaterThan(0)
      expect(pedidas("GET", API_TAREA)).toHaveLength(antes)
      retenido.soltar()
      expect(await screen.findByRole("link", { name: VOLVER }, ESPERA)).toBeInTheDocument()
    },
  )
})

// ------------------------------------------------------------------------------------------------
// ADM-1D220: filas 32, 33 y 36

describe("ADM-1D220: al restaurar nada reaparece abierto (features/tareas)", () => {
  it("ADM-1D220 fila 32 (confirmando): «Sí, borrar tarea» no reaparece, tampoco tras dos vueltas, sin escrituras", async () => {
    const cliente = clienteDePrueba()
    await montar([RUTAS.detalle], cliente)
    fireEvent.click(await buscarBoton("Borrar tarea"))
    await buscarBoton("Sí, borrar tarea")
    await archivar(cliente)
    expect(document.activeElement).not.toBe(document.body)
    await restaurar(cliente)
    expect(boton("Sí, borrar tarea")).toBeNull()
    await archivar(cliente)
    await restaurar(cliente)
    expect(boton("Sí, borrar tarea")).toBeNull()
    expect(boton("Borrar tarea")).not.toBeNull()
    expect(pedidas("DELETE", API_TAREA)).toHaveLength(0)
  })

  it("ADM-1D220 fila 32 (conEntregas): reabrir «Borrar tarea» da el primer paso, no el segundo con el conteo viejo", async () => {
    servidor.manejador = ({ metodo, url }) =>
      url.pathname === API_TAREA && metodo === "DELETE"
        ? errorJson(409, "TAREA_CON_ENTREGAS", CON_ENTREGAS)
        : undefined
    const cliente = clienteDePrueba()
    await montar([RUTAS.detalle], cliente)
    await pedirElBorrado()
    await screen.findByText(CON_ENTREGAS, {}, ESPERA)
    await archivar(cliente)
    await restaurar(cliente)
    expect(screen.queryByText(CON_ENTREGAS)).toBeNull()
    fireEvent.click(await buscarBoton("Borrar tarea"))
    expect(await buscarBoton("Sí, borrar tarea")).toBeInTheDocument()
    expect(screen.queryByText(CON_ENTREGAS)).toBeNull()
  })

  it("ADM-1D220 fila 33 (reinicios): tras un 409 de calificar, al restaurar el panel nace sin llevarse el foco", async () => {
    servidor.manejador = ({ metodo, url }) =>
      url.pathname === API_CALIFICAR && metodo === "PUT"
        ? errorJson(409, "ENTREGA_MODIFICADA", ENTREGA_MODIFICADA)
        : undefined
    const cliente = clienteDePrueba()
    await montar([RUTAS.entrega], cliente)
    await pulsarCalificar()
    await waitFor(() => expect(errores()).toEqual([ENTREGA_MODIFICADA]), ESPERA)
    await waitFor(
      () => expect(screen.getByRole("heading", { name: "Calificación" })).toHaveFocus(),
      ESPERA,
    )
    await archivar(cliente)
    const titulo = screen.getByRole("heading", { level: 1, name: "Historia" })
    act(() => titulo.focus())
    await restaurar(cliente)
    await buscarBoton(CALIFICAR)
    expect(titulo).toHaveFocus()
    await archivar(cliente)
    await restaurar(cliente)
    await buscarBoton(CALIFICAR)
    expect(titulo).toHaveFocus()
  })

  it("ADM-1D220 fila 36 (reinicios): tras un 409 de guardar, al restaurar el formulario nace sin llevarse el foco", async () => {
    servidor.manejador = ({ metodo, url }) =>
      url.pathname === API_TAREA && metodo === "PUT"
        ? errorJson(409, "TAREA_MODIFICADA", MODIFICADA)
        : undefined
    const cliente = clienteDePrueba()
    await montar([RUTAS.editar], cliente)
    await pulsarGuardar()
    await waitFor(() => expect(screen.getByLabelText("Título")).toHaveFocus(), ESPERA)
    await archivar(cliente)
    const titulo = screen.getByRole("heading", { level: 1, name: "Historia" })
    act(() => titulo.focus())
    await restaurar(cliente)
    await screen.findByLabelText("Título", {}, ESPERA)
    expect(titulo).toHaveFocus()
    await archivar(cliente)
    await restaurar(cliente)
    await screen.findByLabelText("Título", {}, ESPERA)
    expect(titulo).toHaveFocus()
  })
})

// ------------------------------------------------------------------------------------------------
// ADM-1D221 (tabla B2) y ADM-1D222 (controles)

type Router = Awaited<ReturnType<typeof montar>>

interface Orden {
  orden: string
  llevar: (cliente: QueryClient, router: Router) => Promise<void>
}

const CON_LA_CLASE_ARCHIVADA: Orden = {
  orden: "con la clase archivada",
  llevar: (cliente) => archivar(cliente),
}
const DESPUES_DE_RESTAURAR: Orden = {
  orden: "después de restaurar",
  llevar: async (cliente) => {
    await archivar(cliente)
    await restaurar(cliente)
  },
}
const DOS_VECES: Orden = {
  orden: "después de archivar y restaurar dos veces",
  llevar: async (cliente) => {
    await archivar(cliente)
    await restaurar(cliente)
    await archivar(cliente)
    await restaurar(cliente)
  },
}
const VISTA_DESMONTADA: Orden = {
  orden: "con la vista desmontada",
  llevar: async (_cliente, router) => {
    await act(() => router.navigate(RUTAS.otra))
    await screen.findByRole("heading", { name: "Dudas" }, ESPERA)
  },
}

const RESTAURADOS = [DESPUES_DE_RESTAURAR, DOS_VECES]

// Lanza la escritura, la retiene, lleva la clase al orden y la suelta. La respuesta de la clase archivada
// no se usa aquí: la petición salió con la clase activa.
const conLaEscrituraEnVuelo = async (
  ruta: string,
  esLaEscritura: (llamada: Llamada) => boolean,
  respuesta: () => Response,
  lanzar: () => Promise<void>,
  orden: Orden,
) => {
  const enVuelo = retener()
  servidor.manejador = (llamada) =>
    esLaEscritura(llamada) ? enVuelo.promesa.then(respuesta) : undefined
  const cliente = clienteDePrueba()
  const router = await montar([ruta], cliente)
  await lanzar()
  await waitFor(() => expect(llamadas.filter(esLaEscritura)).toHaveLength(1), ESPERA)
  await orden.llevar(cliente, router)
  return { cliente, router, soltar: enVuelo.soltar }
}

const esPutTarea = ({ metodo, url }: Llamada) => metodo === "PUT" && url.pathname === API_TAREA
const esPostTarea = ({ metodo, url }: Llamada) =>
  metodo === "POST" && url.pathname === `${API}/tareas`
const esCalificar = ({ metodo, url }: Llamada) => metodo === "PUT" && url.pathname === API_CALIFICAR
const esBorrar = ({ metodo, url }: Llamada) => metodo === "DELETE" && url.pathname === API_TAREA

// Escribe en el formulario de ahora y deja ahí el foco: lo que el efecto tardío no debe tocar.
const escribirEnElCampoDeAhora = async (encontrar: () => Promise<HTMLElement>, valor: string) => {
  const campo = await encontrar()
  fireEvent.change(campo, { target: { value: valor } })
  act(() => campo.focus())
  return campo
}

const reposar = (cliente: QueryClient) =>
  waitFor(() => {
    expect(cliente.isFetching()).toBe(0)
    expect(cliente.isMutating()).toBe(0)
  }, ESPERA)

const respuestaTareaModificada = () => errorJson(409, "TAREA_MODIFICADA", MODIFICADA)
const respuestaGuardada = () => respuestaJson(200, tareaDoble())
const respuestaCreada = () => respuestaJson(201, tareaDoble(TAREA_NUEVA))
const respuestaEntregaModificada = () => errorJson(409, "ENTREGA_MODIFICADA", ENTREGA_MODIFICADA)
const respuestaCalificada = () => {
  servidor.calificacion = calificacionDoble
  return respuestaJson(200, entregaDoble())
}
const respuestaConEntregas = () => errorJson(409, "TAREA_CON_ENTREGAS", CON_ENTREGAS)
const respuestaBorrada = () => new Response(null, { status: 204 })

describe("ADM-1D221: tabla B2", () => {
  describe("fila 36, recarga tras 409", () => {
    it("ADM-1D221 fila 36, 409, con la clase archivada: no pide la recarga; un aviso", async () => {
      const { cliente, soltar } = await conLaEscrituraEnVuelo(
        RUTAS.editar,
        esPutTarea,
        respuestaTareaModificada,
        pulsarGuardar,
        CON_LA_CLASE_ARCHIVADA,
      )
      const antes = pedidas("GET", API_TAREA).length
      soltar()
      await reposar(cliente)
      expect(errores()).toEqual([MODIFICADA])
      expect(pedidas("GET", API_TAREA)).toHaveLength(antes)
      expect(screen.getByText(ARCHIVADA)).toBeInTheDocument()
    })

    it.each(RESTAURADOS)(
      "ADM-1D221 fila 36, 409, $orden: un aviso; no pide ni reinicia; lo escrito y el foco siguen",
      async (orden) => {
        const { cliente, soltar } = await conLaEscrituraEnVuelo(
          RUTAS.editar,
          esPutTarea,
          respuestaTareaModificada,
          pulsarGuardar,
          orden,
        )
        const campo = await escribirEnElCampoDeAhora(
          () => screen.findByLabelText("Título", {}, ESPERA),
          "Escrito después",
        )
        await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
        const antes = pedidas("GET", API_TAREA).length
        soltar()
        await waitFor(() => expect(errores()).toEqual([MODIFICADA]), ESPERA)
        await reposar(cliente)
        expect(pedidas("GET", API_TAREA)).toHaveLength(antes)
        expect(screen.getByLabelText("Título")).toBe(campo)
        expect(campo).toHaveValue("Escrito después")
        expect(campo).toHaveFocus()
      },
    )

    it("ADM-1D221 fila 36, 409, con la vista desmontada: como hoy, pide la recarga", async () => {
      const { cliente, soltar } = await conLaEscrituraEnVuelo(
        RUTAS.editar,
        esPutTarea,
        respuestaTareaModificada,
        pulsarGuardar,
        VISTA_DESMONTADA,
      )
      const antes = pedidas("GET", API_TAREA).length
      soltar()
      await waitFor(() => expect(errores()).toEqual([MODIFICADA]), ESPERA)
      await waitFor(() => expect(pedidas("GET", API_TAREA).length).toBe(antes + 1), ESPERA)
      await reposar(cliente)
    })
  })

  describe("filas 36 y 35, éxito", () => {
    const FILAS = [
      {
        fila: 36,
        ruta: RUTAS.editar,
        es: esPutTarea,
        respuesta: respuestaGuardada,
        lanzar: pulsarGuardar,
        destino: RUTAS.detalle,
      },
      {
        fila: 35,
        ruta: RUTAS.crear,
        es: esPostTarea,
        respuesta: respuestaCreada,
        lanzar: pulsarPublicar,
        destino: `${BASES.maestro}/tareas/${TAREA_NUEVA}`,
      },
    ]

    describe.each(FILAS)("fila $fila", ({ ruta, es, respuesta, lanzar, destino }) => {
      it("ADM-1D221 éxito, con la clase archivada: no navega; sigue el texto de archivada; un aviso", async () => {
        const { router, soltar } = await conLaEscrituraEnVuelo(
          ruta,
          es,
          respuesta,
          lanzar,
          CON_LA_CLASE_ARCHIVADA,
        )
        soltar()
        await waitFor(() => expect(exitos()).toHaveLength(1), ESPERA)
        expect(router.state.location.pathname).toBe(ruta)
        expect(await screen.findByText(ARCHIVADA, {}, ESPERA)).toBeInTheDocument()
      })

      it.each(RESTAURADOS)(
        "ADM-1D221 éxito, $orden: no navega; un aviso; lo escrito y el foco siguen",
        async (orden) => {
          const { cliente, router, soltar } = await conLaEscrituraEnVuelo(
            ruta,
            es,
            respuesta,
            lanzar,
            orden,
          )
          const campo = await escribirEnElCampoDeAhora(
            () => screen.findByLabelText("Título", {}, ESPERA),
            "Escrito después",
          )
          soltar()
          await waitFor(() => expect(exitos()).toHaveLength(1), ESPERA)
          await reposar(cliente)
          expect(router.state.location.pathname).toBe(ruta)
          expect(campo).toHaveValue("Escrito después")
          expect(campo).toHaveFocus()
        },
      )

      it("ADM-1D221 éxito, con la vista desmontada: no navega; un aviso (CHORE-06a, como editar recurso y crear o editar clase)", async () => {
        const { cliente, router, soltar } = await conLaEscrituraEnVuelo(
          ruta,
          es,
          respuesta,
          lanzar,
          VISTA_DESMONTADA,
        )
        soltar()
        await waitFor(() => expect(exitos()).toHaveLength(1), ESPERA)
        await reposar(cliente)
        expect(router.state.location.pathname).toBe(RUTAS.otra)
        expect(router.state.location.pathname).not.toBe(destino)
        expect(exitos()).toHaveLength(1)
      })
    })
  })

  describe("fila 33", () => {
    it("ADM-1D221 fila 33, 409, con la clase archivada: no pide la recarga; un aviso", async () => {
      const { cliente, soltar } = await conLaEscrituraEnVuelo(
        RUTAS.entrega,
        esCalificar,
        respuestaEntregaModificada,
        pulsarCalificar,
        CON_LA_CLASE_ARCHIVADA,
      )
      const antes = pedidas("GET", API_ALUMNO).length
      soltar()
      await waitFor(() => expect(errores()).toEqual([ENTREGA_MODIFICADA]), ESPERA)
      await reposar(cliente)
      expect(pedidas("GET", API_ALUMNO)).toHaveLength(antes)
    })

    it.each(RESTAURADOS)(
      "ADM-1D221 fila 33, 409, $orden: un aviso; no pide ni reinicia; lo escrito y el foco siguen",
      async (orden) => {
        const { cliente, soltar } = await conLaEscrituraEnVuelo(
          RUTAS.entrega,
          esCalificar,
          respuestaEntregaModificada,
          pulsarCalificar,
          orden,
        )
        const campo = await escribirEnElCampoDeAhora(campoCalificacion, "7")
        await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
        const antes = pedidas("GET", API_ALUMNO).length
        soltar()
        await waitFor(() => expect(errores()).toEqual([ENTREGA_MODIFICADA]), ESPERA)
        await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
        expect(pedidas("GET", API_ALUMNO)).toHaveLength(antes)
        expect(campo).toHaveValue("7")
        expect(campo).toHaveFocus()
      },
    )

    it("ADM-1D221 fila 33, 409, con la vista desmontada: no pide la recarga; el aviso del 409", async () => {
      const { cliente, soltar } = await conLaEscrituraEnVuelo(
        RUTAS.entrega,
        esCalificar,
        respuestaEntregaModificada,
        pulsarCalificar,
        VISTA_DESMONTADA,
      )
      const antes = pedidas("GET", API_ALUMNO).length
      soltar()
      await waitFor(() => expect(errores()).toEqual([ENTREGA_MODIFICADA]), ESPERA)
      await reposar(cliente)
      expect(pedidas("GET", API_ALUMNO)).toHaveLength(antes)
    })

    it("ADM-1D221 fila 33, éxito, con la clase archivada: no reinicia; un aviso; al restaurar, el panel nace con la respuesta", async () => {
      const { cliente, soltar } = await conLaEscrituraEnVuelo(
        RUTAS.entrega,
        esCalificar,
        respuestaCalificada,
        pulsarCalificar,
        CON_LA_CLASE_ARCHIVADA,
      )
      soltar()
      await waitFor(() => expect(exitos()).toHaveLength(1), ESPERA)
      expect(await screen.findByText(/8 de 10/, {}, ESPERA)).toBeInTheDocument()
      await restaurar(cliente)
      expect(await buscarBoton("Actualizar calificación")).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "Calificación" })).not.toHaveFocus()
    })

    it.each(RESTAURADOS)(
      "ADM-1D221 fila 33, éxito, $orden: no reinicia; un aviso; lo escrito y el foco siguen",
      async (orden) => {
        const { soltar } = await conLaEscrituraEnVuelo(
          RUTAS.entrega,
          esCalificar,
          respuestaCalificada,
          pulsarCalificar,
          orden,
        )
        const campo = await escribirEnElCampoDeAhora(campoCalificacion, "7")
        soltar()
        await waitFor(() => expect(exitos()).toHaveLength(1), ESPERA)
        expect(screen.getByLabelText(/^Calificación \(/)).toBe(campo)
        expect(campo).toHaveValue("7")
        expect(campo).toHaveFocus()
      },
    )

    it("ADM-1D221 fila 33, éxito, con la vista desmontada: un aviso", async () => {
      const { soltar } = await conLaEscrituraEnVuelo(
        RUTAS.entrega,
        esCalificar,
        respuestaCalificada,
        pulsarCalificar,
        VISTA_DESMONTADA,
      )
      soltar()
      await waitFor(() => expect(exitos()).toHaveLength(1), ESPERA)
      expect(errores()).toEqual([])
    })
  })

  describe("fila 32", () => {
    it.each([CON_LA_CLASE_ARCHIVADA, ...RESTAURADOS])(
      "ADM-1D221 fila 32, TAREA_CON_ENTREGAS, $orden: un aviso con el mensaje del servidor; no abre el segundo paso",
      async (orden) => {
        const { soltar } = await conLaEscrituraEnVuelo(
          RUTAS.detalle,
          esBorrar,
          respuestaConEntregas,
          pedirElBorrado,
          orden,
        )
        soltar()
        await waitFor(() => expect(errores()).toEqual([CON_ENTREGAS]), ESPERA)
        expect(screen.queryByText(CON_ENTREGAS)).toBeNull()
        expect(boton("Sí, borrar tarea")).toBeNull()
      },
    )

    it("ADM-1D221 fila 32, TAREA_CON_ENTREGAS, con la vista desmontada: un aviso del gancho", async () => {
      const { soltar } = await conLaEscrituraEnVuelo(
        RUTAS.detalle,
        esBorrar,
        respuestaConEntregas,
        pedirElBorrado,
        VISTA_DESMONTADA,
      )
      soltar()
      await waitFor(() => expect(errores()).toEqual([CON_ENTREGAS]), ESPERA)
    })

    it.each([CON_LA_CLASE_ARCHIVADA, ...RESTAURADOS])(
      "ADM-1D221 fila 32, DELETE con éxito, $orden: navega a Actividades; un aviso",
      async (orden) => {
        const { router, soltar } = await conLaEscrituraEnVuelo(
          RUTAS.detalle,
          esBorrar,
          respuestaBorrada,
          pedirElBorrado,
          orden,
        )
        soltar()
        await waitFor(
          () => expect(router.state.location.pathname).toBe(`${BASES.maestro}/trabajo`),
          ESPERA,
        )
        expect(exitos()).toHaveLength(1)
      },
    )

    it("ADM-1D221 fila 32, DELETE con éxito, con la vista desmontada: un aviso, sin navegar", async () => {
      const { cliente, router, soltar } = await conLaEscrituraEnVuelo(
        RUTAS.detalle,
        esBorrar,
        respuestaBorrada,
        pedirElBorrado,
        VISTA_DESMONTADA,
      )
      soltar()
      await waitFor(() => expect(exitos()).toHaveLength(1), ESPERA)
      await reposar(cliente)
      expect(router.state.location.pathname).toBe(RUTAS.otra)
    })
  })
})

// N-01d2-1 (verificación del manager): el 409 llega con la clase activa y la recarga que pide sigue en vuelo
// cuando la clase se archiva y se restaura. B2 ordena la llegada de la escritura; esto, la de la recarga.
describe("ADM-1D221: la recarga tras el 409 ya en vuelo", () => {
  // Lo que queda después de soltar la recarga son promesas ya resueltas: se dejan correr, sin medir tiempo.
  const dejarCorrerLoQueLlego = async (cliente: QueryClient) => {
    await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
    await act(async () => {
      for (let turno = 0; turno < 50; turno += 1) await Promise.resolve()
    })
  }

  // Responde el 409 enseguida y retiene las lecturas de `rutas` desde que `control.retener` se enciende.
  const conLaRecargaEnVuelo = (
    esEscritura: (llamada: Llamada) => boolean,
    conflicto: () => Response,
    rutas: string[],
    lectura: (ruta: string) => Response,
  ) => {
    const recarga = retener()
    const control = { retener: false }
    servidor.manejador = (llamada) => {
      if (esEscritura(llamada)) return conflicto()
      const { metodo, url } = llamada
      if (metodo !== "GET" || !control.retener || !rutas.includes(url.pathname)) return undefined
      return recarga.promesa.then(() => lectura(url.pathname))
    }
    return { recarga, control }
  }

  const lecturaDeLaEntrega = () => respuestaJson(200, entregaDoble())
  const RUBRICA_MODIFICADA = "La rúbrica cambió mientras calificabas."

  it.each(RESTAURADOS)(
    "ADM-1D221 fila 36, recarga en vuelo, $orden: al llegar no reinicia; lo escrito, el foco y un solo aviso",
    async ({ llevar }) => {
      const { recarga, control } = conLaRecargaEnVuelo(
        esPutTarea,
        respuestaTareaModificada,
        [API_TAREA],
        () => respuestaJson(200, tareaDoble()),
      )
      const cliente = clienteDePrueba()
      const router = await montar([RUTAS.editar], cliente)
      await screen.findByLabelText("Título", {}, ESPERA)
      control.retener = true
      const antes = pedidas("GET", API_TAREA).length
      await pulsarGuardar()
      await waitFor(() => expect(errores()).toEqual([MODIFICADA]), ESPERA)
      await waitFor(() => expect(pedidas("GET", API_TAREA)).toHaveLength(antes + 1), ESPERA)
      await llevar(cliente, router)
      const campo = await escribirEnElCampoDeAhora(
        () => screen.findByLabelText("Título", {}, ESPERA),
        "Escrito después",
      )
      recarga.soltar()
      await dejarCorrerLoQueLlego(cliente)
      expect(screen.getByLabelText("Título")).toBe(campo)
      expect(campo).toHaveValue("Escrito después")
      expect(campo).toHaveFocus()
      expect(errores()).toEqual([MODIFICADA])
    },
  )

  it("ADM-1D221 fila 36, recarga en vuelo: llega con la clase archivada y, al restaurar, el formulario no se lleva el foco", async () => {
    const { recarga, control } = conLaRecargaEnVuelo(
      esPutTarea,
      respuestaTareaModificada,
      [API_TAREA],
      () => respuestaJson(200, tareaDoble()),
    )
    const cliente = clienteDePrueba()
    await montar([RUTAS.editar], cliente)
    await screen.findByLabelText("Título", {}, ESPERA)
    control.retener = true
    const antes = pedidas("GET", API_TAREA).length
    await pulsarGuardar()
    await waitFor(() => expect(pedidas("GET", API_TAREA)).toHaveLength(antes + 1), ESPERA)
    await archivar(cliente)
    recarga.soltar()
    await dejarCorrerLoQueLlego(cliente)
    expect(screen.getByText(ARCHIVADA)).toBeInTheDocument()
    const enlace = screen.getByRole("link", { name: VOLVER })
    act(() => enlace.focus())
    await restaurar(cliente)
    const campo = await screen.findByLabelText("Título", {}, ESPERA)
    await dejarCorrerLoQueLlego(cliente)
    expect(campo).not.toHaveFocus()
    expect(errores()).toEqual([MODIFICADA])
  })

  describe.each(RESTAURADOS)("fila 33, $orden", ({ llevar }) => {
    const lanzarYLlevar = async (
      recargas: string[],
      cliente: QueryClient,
      control: { retener: boolean },
    ) => {
      const router = await montar([RUTAS.entrega], cliente)
      await campoCalificacion()
      await screen.findByText("Revisa la conclusión", {}, ESPERA)
      control.retener = true
      const antes = recargas.map((ruta) => pedidas("GET", ruta).length)
      await pulsarCalificar()
      await waitFor(() => {
        recargas.forEach((ruta, i) =>
          expect(pedidas("GET", ruta)).toHaveLength((antes[i] ?? 0) + 1),
        )
      }, ESPERA)
      await llevar(cliente, router)
      return escribirEnElCampoDeAhora(campoCalificacion, "7")
    }

    const comprobar = (campo: HTMLElement, mensaje: string) => {
      expect(screen.getByLabelText(/^Calificación \(/)).toBe(campo)
      expect(campo).toHaveValue("7")
      expect(campo).toHaveFocus()
      expect(errores()).toEqual([mensaje])
    }

    it("ADM-1D221 fila 33, recarga en vuelo: al llegar bien no reinicia; lo escrito, el foco y un solo aviso", async () => {
      const { recarga, control } = conLaRecargaEnVuelo(
        esCalificar,
        respuestaEntregaModificada,
        [API_ALUMNO],
        lecturaDeLaEntrega,
      )
      const cliente = clienteDePrueba()
      const campo = await lanzarYLlevar([API_ALUMNO], cliente, control)
      recarga.soltar()
      await dejarCorrerLoQueLlego(cliente)
      comprobar(campo, ENTREGA_MODIFICADA)
    })

    it("ADM-1D221 fila 33, recarga en vuelo: al llegar con 500, ningún otro aviso; lo escrito y el foco siguen", async () => {
      const { recarga, control } = conLaRecargaEnVuelo(
        esCalificar,
        respuestaEntregaModificada,
        [API_ALUMNO],
        () => errorJson(500, "ERROR_INTERNO", "x"),
      )
      const cliente = clienteDePrueba()
      const campo = await lanzarYLlevar([API_ALUMNO], cliente, control)
      recarga.soltar()
      await dejarCorrerLoQueLlego(cliente)
      comprobar(campo, ENTREGA_MODIFICADA)
    })

    it("ADM-1D221 fila 33, recarga en vuelo de la entrega y de la tarea (RUBRICA_MODIFICADA): al llegar no reinicia", async () => {
      const { recarga, control } = conLaRecargaEnVuelo(
        esCalificar,
        () => errorJson(409, "RUBRICA_MODIFICADA", RUBRICA_MODIFICADA),
        [API_ALUMNO, API_TAREA],
        (ruta) => (ruta === API_TAREA ? respuestaJson(200, tareaDoble()) : lecturaDeLaEntrega()),
      )
      const cliente = clienteDePrueba()
      const campo = await lanzarYLlevar([API_ALUMNO, API_TAREA], cliente, control)
      recarga.soltar()
      await dejarCorrerLoQueLlego(cliente)
      comprobar(campo, RUBRICA_MODIFICADA)
    })
  })
})

describe("ADM-1D222: controles sin pasar por una archivada", () => {
  it("ADM-1D222 (a) fila 36: con 409, un aviso, una lectura, el formulario reiniciado y el foco en el título", async () => {
    servidor.manejador = ({ metodo, url }) =>
      url.pathname === API_TAREA && metodo === "PUT" ? respuestaTareaModificada() : undefined
    await montar([RUTAS.editar])
    await screen.findByLabelText("Título", {}, ESPERA)
    const antes = pedidas("GET", API_TAREA).length
    servidor.version = 4
    fireEvent.click(await buscarBoton("Guardar cambios"))
    await screen.findByDisplayValue("Versión 4", {}, ESPERA)
    expect(errores()).toEqual([MODIFICADA])
    expect(pedidas("GET", API_TAREA)).toHaveLength(antes + 1)
    await waitFor(() => expect(screen.getByLabelText("Título")).toHaveFocus(), ESPERA)
  })

  const GUARDADOS: { fila: number; ruta: string; lanzar: () => Promise<void>; destino: string }[] =
    [
      { fila: 36, ruta: RUTAS.editar, lanzar: pulsarGuardar, destino: RUTAS.detalle },
      {
        fila: 35,
        ruta: RUTAS.crear,
        lanzar: pulsarPublicar,
        destino: `${BASES.maestro}/tareas/${TAREA_NUEVA}`,
      },
    ]

  it.each(GUARDADOS)(
    "ADM-1D222 (a) fila $fila: con éxito, navega",
    async ({ ruta, lanzar, destino }) => {
      const router = await montar([ruta])
      await lanzar()
      await waitFor(() => expect(router.state.location.pathname).toBe(destino), ESPERA)
    },
  )

  it("ADM-1D222 (a) fila 33: con 409 recarga, reinicia y lleva el foco al encabezado", async () => {
    servidor.manejador = ({ metodo, url }) =>
      url.pathname === API_CALIFICAR && metodo === "PUT" ? respuestaEntregaModificada() : undefined
    await montar([RUTAS.entrega])
    const antes = () => pedidas("GET", API_ALUMNO).length
    await campoCalificacion()
    const primero = antes()
    await pulsarCalificar()
    await waitFor(() => expect(errores()).toEqual([ENTREGA_MODIFICADA]), ESPERA)
    await waitFor(() => expect(antes()).toBe(primero + 1), ESPERA)
    await waitFor(
      () => expect(screen.getByRole("heading", { name: "Calificación" })).toHaveFocus(),
      ESPERA,
    )
  })

  it("ADM-1D222 (a) fila 33: con éxito reinicia y lleva el foco al encabezado", async () => {
    await montar([RUTAS.entrega])
    await pulsarCalificar()
    await waitFor(() => expect(exitos()).toHaveLength(1), ESPERA)
    await waitFor(
      () => expect(screen.getByRole("heading", { name: "Calificación" })).toHaveFocus(),
      ESPERA,
    )
  })

  it("ADM-1D222 (a) fila 32: TAREA_CON_ENTREGAS abre el segundo paso, sin aviso, con el foco en Cancelar", async () => {
    servidor.manejador = ({ metodo, url }) =>
      url.pathname === API_TAREA && metodo === "DELETE" ? respuestaConEntregas() : undefined
    await montar([RUTAS.detalle])
    await pedirElBorrado()
    expect(await screen.findByText(CON_ENTREGAS, {}, ESPERA)).toBeInTheDocument()
    expect(errores()).toEqual([])
    await waitFor(() => expect(boton("Cancelar")).toHaveFocus(), ESPERA)
  })

  it("ADM-1D222 (a) fila 32: DELETE con éxito navega a Actividades", async () => {
    const router = await montar([RUTAS.detalle])
    await pedirElBorrado()
    await waitFor(
      () => expect(router.state.location.pathname).toBe(`${BASES.maestro}/trabajo`),
      ESPERA,
    )
  })

  describe.each([
    ["archivar y restaurar sin nada en vuelo", false],
    ["una clase que nace archivada y se restaura", true],
  ])("ADM-1D222 (b) %s", (_nombre, naceArchivada) => {
    const preparar = async (ruta: string) => {
      servidor.archivada = naceArchivada
      const cliente = clienteDePrueba()
      const router = await montar([ruta], cliente)
      if (naceArchivada) {
        await waitFor(() => expect(avisoFijo()).not.toBeNull(), ESPERA)
      }
      if (!naceArchivada) {
        await waitFor(() => expect(pedidas("GET", API).length).toBe(1), ESPERA)
        await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
        await archivar(cliente)
      }
      await restaurar(cliente)
      return router
    }

    it("ADM-1D222 (b) fila 36: un guardado nuevo navega y con 409 reinicia", async () => {
      const router = await preparar(RUTAS.editar)
      await pulsarGuardar()
      await waitFor(() => expect(router.state.location.pathname).toBe(RUTAS.detalle), ESPERA)
    })

    it("ADM-1D222 (b) fila 36: con 409 reinicia y lleva el foco al título", async () => {
      servidor.manejador = ({ metodo, url }) =>
        url.pathname === API_TAREA && metodo === "PUT" ? respuestaTareaModificada() : undefined
      await preparar(RUTAS.editar)
      await screen.findByLabelText("Título", {}, ESPERA)
      servidor.version = 4
      fireEvent.click(await buscarBoton("Guardar cambios"))
      await screen.findByDisplayValue("Versión 4", {}, ESPERA)
      await waitFor(() => expect(screen.getByLabelText("Título")).toHaveFocus(), ESPERA)
    })

    it("ADM-1D222 (b) fila 35: un guardado nuevo navega", async () => {
      const router = await preparar(RUTAS.crear)
      await pulsarPublicar()
      await waitFor(
        () => expect(router.state.location.pathname).toBe(`${BASES.maestro}/tareas/${TAREA_NUEVA}`),
        ESPERA,
      )
    })

    it("ADM-1D222 (b) fila 33: un guardado nuevo reinicia y lleva el foco al encabezado", async () => {
      await preparar(RUTAS.entrega)
      await pulsarCalificar()
      await waitFor(() => expect(exitos()).toHaveLength(1), ESPERA)
      await waitFor(
        () => expect(screen.getByRole("heading", { name: "Calificación" })).toHaveFocus(),
        ESPERA,
      )
    })
  })
})

// ------------------------------------------------------------------------------------------------
// ADM-1D223: tabla C

describe("ADM-1D223: tabla C", () => {
  const validacion = (mensaje: string) => () => errorJson(400, "VALIDACION", mensaje)

  const SE_PERDIAN = [
    {
      nombre: "fila 32, TAREA_CON_ENTREGAS",
      ruta: RUTAS.detalle,
      preparar: () => undefined,
      es: esBorrar,
      respuesta: respuestaConEntregas,
      lanzar: pedirElBorrado,
      texto: CON_ENTREGAS,
    },
    {
      nombre: "fila 33, puntajes.0.puntos",
      ruta: RUTAS.entrega,
      preparar: () => {
        servidor.rubrica = [{ id: CRITERIO, criterio: "Claridad", puntosMax: 10 }]
      },
      es: esCalificar,
      respuesta: validacion("puntajes.0.puntos: Fuera de rango"),
      lanzar: async () => {
        fireEvent.change(await screen.findByLabelText(/^Claridad/, {}, ESPERA), {
          target: { value: "8" },
        })
        fireEvent.click(await buscarBoton(CALIFICAR))
      },
      texto: "Fuera de rango",
    },
    {
      nombre: "fila 34, texto",
      ruta: RUTAS.entrega,
      preparar: () => undefined,
      es: ({ metodo, url }: Llamada) =>
        metodo === "POST" && url.pathname === `${API_ALUMNO}/comentarios`,
      respuesta: validacion("texto: Demasiado largo"),
      lanzar: async () => {
        fireEvent.change(await screen.findByLabelText("Comentario privado", {}, ESPERA), {
          target: { value: "Un comentario" },
        })
        fireEvent.click(await buscarBoton("Enviar comentario"))
      },
      texto: "Demasiado largo",
    },
    {
      nombre: "fila 35, titulo",
      ruta: RUTAS.crear,
      preparar: () => undefined,
      es: esPostTarea,
      respuesta: validacion("titulo: Demasiado largo"),
      lanzar: pulsarPublicar,
      texto: "Demasiado largo",
    },
    {
      nombre: "fila 36, titulo",
      ruta: RUTAS.editar,
      preparar: () => undefined,
      es: esPutTarea,
      respuesta: validacion("titulo: Demasiado largo"),
      lanzar: pulsarGuardar,
      texto: "Demasiado largo",
    },
  ]

  const ESTADOS: Orden[] = [CON_LA_CLASE_ARCHIVADA, VISTA_DESMONTADA]

  describe.each(ESTADOS)("$orden", (orden) => {
    it.each(SE_PERDIAN)(
      "ADM-1D223 $nombre: un solo aviso legible, sin la ruta",
      async ({ ruta, preparar, es, respuesta, lanzar, texto }) => {
        preparar()
        const { soltar } = await conLaEscrituraEnVuelo(ruta, es, respuesta, lanzar, orden)
        soltar()
        await waitFor(() => expect(errores()).toEqual([texto]), ESPERA)
      },
    )
  })

  it("ADM-1D223 fila 32 control: con el control montado, el segundo paso, sin aviso", async () => {
    servidor.manejador = ({ metodo, url }) =>
      url.pathname === API_TAREA && metodo === "DELETE" ? respuestaConEntregas() : undefined
    await montar([RUTAS.detalle])
    await pedirElBorrado()
    expect(await screen.findByText(CON_ENTREGAS, {}, ESPERA)).toBeInTheDocument()
    expect(errores()).toEqual([])
  })

  it("ADM-1D223 fila 33 control: con el panel montado, el ErrorDeCampo, sin aviso", async () => {
    servidor.rubrica = [{ id: CRITERIO, criterio: "Claridad", puntosMax: 10 }]
    servidor.manejador = ({ metodo, url }) =>
      url.pathname === API_CALIFICAR && metodo === "PUT"
        ? errorJson(400, "VALIDACION", "puntajes.0.puntos: Fuera de rango")
        : undefined
    await montar([RUTAS.entrega])
    fireEvent.change(await screen.findByLabelText(/^Claridad/, {}, ESPERA), {
      target: { value: "8" },
    })
    fireEvent.click(await buscarBoton(CALIFICAR))
    expect(await screen.findByText("Fuera de rango", {}, ESPERA)).toBeInTheDocument()
    expect(errores()).toEqual([])
  })

  it("ADM-1D223 fila 34 control: con el formulario montado, el ErrorDeCampo, sin aviso", async () => {
    servidor.manejador = ({ metodo, url }) =>
      metodo === "POST" && url.pathname === `${API_ALUMNO}/comentarios`
        ? errorJson(400, "VALIDACION", "texto: Demasiado largo")
        : undefined
    await montar([RUTAS.entrega])
    fireEvent.change(await screen.findByLabelText("Comentario privado", {}, ESPERA), {
      target: { value: "Un comentario" },
    })
    fireEvent.click(await buscarBoton("Enviar comentario"))
    expect(await screen.findByText("Demasiado largo", {}, ESPERA)).toBeInTheDocument()
    expect(errores()).toEqual([])
  })

  it.each([
    ["fila 35", RUTAS.crear, esPostTarea, pulsarPublicar],
    ["fila 36", RUTAS.editar, esPutTarea, pulsarGuardar],
  ] as const)(
    "ADM-1D223 %s control: con el formulario montado, el ErrorDeCampo, sin aviso",
    async (_nombre, ruta, es, lanzar) => {
      servidor.manejador = (llamada) =>
        es(llamada) ? errorJson(400, "VALIDACION", "titulo: Demasiado largo") : undefined
      await montar([ruta])
      await lanzar()
      expect(await screen.findByText("Demasiado largo", {}, ESPERA)).toBeInTheDocument()
      expect(errores()).toEqual([])
    },
  )

  describe("entregar del alumno", () => {
    const RUTA = `${BASES.estudiante}/tareas/${TAREA}`
    const esEntregar = ({ metodo, url }: Llamada) =>
      metodo === "POST" && url.pathname === API_MI_ENTREGA
    const ENTREGA_VACIA = "Agrega al menos un archivo o un enlace."
    const ERRORES: { nombre: string; respuesta: () => Response; texto: string; enLinea: string }[] =
      [
        {
          nombre: "ENTREGA_VACIA",
          respuesta: () => errorJson(400, "ENTREGA_VACIA", ENTREGA_VACIA),
          texto: ENTREGA_VACIA,
          enLinea: "Agrega al menos un archivo o un enlace para entregar.",
        },
        {
          nombre: "enlaces.0",
          respuesta: () => errorJson(400, "VALIDACION", "enlaces.0: Enlace no válido"),
          texto: "Enlace no válido",
          enLinea: "Enlace no válido",
        },
      ]
    const lanzarEntrega = async () => {
      fireEvent.change(await screen.findByLabelText("Enlace", {}, ESPERA), {
        target: { value: "https://ejemplo.mx/trabajo" },
      })
      fireEvent.click(await buscarBoton("Agregar enlace"))
      await screen.findAllByText("https://ejemplo.mx/trabajo", {}, ESPERA)
      fireEvent.click(await buscarBoton("Entregar tarea"))
    }

    it.each(ERRORES)(
      "ADM-1D223 entregar, $nombre, con la redirección de N-05: un solo aviso legible, sin la ruta",
      async ({ respuesta, texto }) => {
        servidor.rol = "estudiante"
        const { router, soltar } = await conLaEscrituraEnVuelo(
          RUTA,
          esEntregar,
          respuesta,
          lanzarEntrega,
          {
            orden: "archivada",
            llevar: (cliente) => cambiarDetalle(cliente, true),
          },
        )
        await waitFor(
          () =>
            expect(router.state.location.pathname).toBe(`/estudiante/clases-anteriores/${CLASE}`),
          ESPERA,
        )
        soltar()
        await waitFor(() => expect(errores()).toEqual([texto]), ESPERA)
      },
    )

    it.each(ERRORES)(
      "ADM-1D223 entregar, $nombre, al salir de la vista: un solo aviso legible, sin la ruta",
      async ({ respuesta, texto }) => {
        servidor.rol = "estudiante"
        const { soltar } = await conLaEscrituraEnVuelo(RUTA, esEntregar, respuesta, lanzarEntrega, {
          orden: "salir",
          llevar: async (_cliente, router) => {
            await act(() => router.navigate(BASES.estudiante))
          },
        })
        soltar()
        await waitFor(() => expect(errores()).toEqual([texto]), ESPERA)
      },
    )

    it.each(ERRORES)(
      "ADM-1D223 entregar, $nombre, control: con el formulario montado, sin aviso",
      async ({ respuesta, enLinea }) => {
        servidor.rol = "estudiante"
        servidor.manejador = (llamada) => (esEntregar(llamada) ? respuesta() : undefined)
        await montar([RUTA])
        await lanzarEntrega()
        expect(await screen.findByText(enLinea, {}, ESPERA)).toBeInTheDocument()
        expect(errores()).toEqual([])
      },
    )
  })
})

// ------------------------------------------------------------------------------------------------
// ADM-1D232, fila 36

describe("ADM-1D232 fila 36", () => {
  it("ADM-1D232 fila 36: una recarga que falla en una archivada no avisa Puedes seguir editando; al restaurar con esa consulta aún en error, un solo aviso", async () => {
    const cliente = clienteDePrueba()
    await montar([RUTAS.editar], cliente)
    await screen.findByLabelText("Título", {}, ESPERA)
    await archivar(cliente)
    servidor.manejador = ({ url, metodo }) =>
      url.pathname === API_TAREA && metodo === "GET"
        ? errorJson(500, "ERROR_INTERNO", "x")
        : undefined
    await act(() =>
      cliente.refetchQueries({ queryKey: ["clases", CLASE, "tareas", TAREA], exact: true }),
    )
    await waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
    expect(errores()).toEqual([])
    expect(screen.getByText(ARCHIVADA)).toBeInTheDocument()
    await restaurar(cliente)
    await waitFor(() => expect(errores()).toHaveLength(1), ESPERA)
    expect(errores()[0]).toMatch(/Puedes seguir editando/)
    await screen.findByLabelText("Título", {}, ESPERA)
    expect(errores()).toHaveLength(1)
  })
})

describe("T-01 (ronda 1): la recarga de la tarea en caché recibe 409 CLASE_ARCHIVADA", () => {
  const ULTIMA_VERSION = "No pudimos actualizar la tarea. Mostramos la última versión que tenemos."
  const RUTA_DEL_ALUMNO = `${BASES.estudiante}/tareas/${TAREA}`
  const RUTA_ANTERIOR = `/estudiante/clases-anteriores/${CLASE}`
  const claveDeLaTarea = ["clases", CLASE, "tareas", TAREA]
  const reposo = (cliente: QueryClient) =>
    waitFor(() => expect(cliente.isFetching()).toBe(0), ESPERA)
  const recargar = async (cliente: QueryClient) => {
    await act(() => cliente.refetchQueries({ queryKey: claveDeLaTarea, exact: true }))
    await reposo(cliente)
  }
  // La lectura de la tarea responde lo que diga `respuesta`; undefined: la de siempre.
  const instalar = () => {
    const control: { respuesta: (() => Response) | undefined } = { respuesta: undefined }
    servidor.manejador = ({ metodo, url }) =>
      metodo === "GET" && url.pathname === API_TAREA && control.respuesta !== undefined
        ? control.respuesta()
        : undefined
    return control
  }

  it("T-01 estado recarga, alumno, 5xx (control): sigue avisando una vez, porque ahí sí se muestra la última versión", async () => {
    servidor.rol = "estudiante"
    const control = instalar()
    const cliente = clienteDePrueba()
    await montar([RUTA_DEL_ALUMNO], cliente)
    await screen.findByRole("heading", { name: "Tu trabajo" }, ESPERA)
    await reposo(cliente)
    control.respuesta = () => errorJson(500, "ERROR_INTERNO", "x")
    await recargar(cliente)
    await waitFor(() => expect(errores()).toEqual([ULTIMA_VERSION]), ESPERA)
  })

  it("T-01 fallos seguidos: el 409 no avisa y un 5xx después sí, una vez", async () => {
    servidor.rol = "estudiante"
    const control = instalar()
    const cliente = clienteDePrueba()
    await montar([RUTA_DEL_ALUMNO], cliente)
    await screen.findByRole("heading", { name: "Tu trabajo" }, ESPERA)
    await reposo(cliente)
    // El detalle de la clase no cambia: el alumno se queda en la vista y se ven los dos fallos.
    control.respuesta = archivadaJson
    await recargar(cliente)
    expect(errores()).toEqual([])
    await recargar(cliente)
    expect(errores()).toEqual([])
    control.respuesta = () => errorJson(500, "ERROR_INTERNO", "x")
    await recargar(cliente)
    await waitFor(() => expect(errores()).toEqual([ULTIMA_VERSION]), ESPERA)
  })

  it("T-01 error ya en caché: volver a montar la vista con el 409 en la caché no avisa", async () => {
    servidor.rol = "estudiante"
    const control = instalar()
    const cliente = clienteDePrueba()
    const router = await montar([RUTA_DEL_ALUMNO], cliente)
    await screen.findByRole("heading", { name: "Tu trabajo" }, ESPERA)
    await reposo(cliente)
    control.respuesta = archivadaJson
    await recargar(cliente)
    await act(() => router.navigate(BASES.estudiante))
    await reposo(cliente)
    await act(() => router.navigate(RUTA_DEL_ALUMNO))
    await screen.findByRole("heading", { name: "Tu trabajo" }, ESPERA)
    await reposo(cliente)
    expect(errores()).toEqual([])
  })

  it("T-01 primera carga: sin la tarea en caché, el 409 reemplaza la vista con el texto de archivada, sin aviso", async () => {
    servidor.rol = "estudiante"
    instalar().respuesta = archivadaJson
    await montar([RUTA_DEL_ALUMNO], clienteDePrueba())
    expect(await screen.findByText(ARCHIVADA, {}, ESPERA)).toBeInTheDocument()
    expect(errores()).toEqual([])
  })

  it("T-01 redirección: con el detalle ya archivado, termina en la clase anterior sin ningún aviso", async () => {
    servidor.rol = "estudiante"
    const control = instalar()
    const cliente = clienteDePrueba()
    const router = await montar([RUTA_DEL_ALUMNO], cliente)
    await screen.findByRole("heading", { name: "Tu trabajo" }, ESPERA)
    await reposo(cliente)
    servidor.archivada = true
    control.respuesta = archivadaJson
    await recargar(cliente)
    await waitFor(() => expect(router.state.location.pathname).toBe(RUTA_ANTERIOR), ESPERA)
    await reposo(cliente)
    expect(errores()).toEqual([])
  })

  it.each([
    ["el detalle", RUTAS.detalle],
    ["las entregas", `${BASES.maestro}/tareas/${TAREA}/entregas`],
    ["la entrega de un alumno", RUTAS.entrega],
    ["editar", RUTAS.editar],
  ])(
    "T-01 hermanos, maestro, %s: el gancho compartido tampoco avisa de una recarga con 409",
    async (_nombre, ruta) => {
      const control = instalar()
      const cliente = clienteDePrueba()
      await montar([ruta], cliente)
      await waitFor(() => expect(pedidas("GET", API_TAREA).length).toBeGreaterThan(0), ESPERA)
      await reposo(cliente)
      control.respuesta = archivadaJson
      await recargar(cliente)
      expect(errores()).toEqual([])
    },
  )
})
