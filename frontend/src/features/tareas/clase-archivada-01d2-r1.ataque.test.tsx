import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { claveClaseDetalle } from "@/services/clasesService"
import { claveTarea } from "@/services/trabajoService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { TEXTOS_DETALLE_TAREA, TEXTOS_TU_TRABAJO } from "./data"

// Ataque ADMIN-01d2, ronda 1 (tester): features/tareas con otras cosas abiertas: fila 32 con el segundo paso y dos
// vueltas, filas 35 y 36 con un archivo a medio subir, el alumno con la entrega en vuelo cuando entra N-05, y la
// recarga tras un 409 con la vista desmontada o con un segundo 409. Router real; la caché a mano, con las opciones
// de app/providers.tsx y sin reintento. Las esperas son por estado; lo que debe quedar en vuelo se retiene con una
// promesa. El arnés es el de clase-archivada-01d2-tareas.test.tsx.

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

const pulsarCalificar = async () => {
  fireEvent.change(await campoCalificacion(), { target: { value: "8" } })
  fireEvent.click(await buscarBoton(CALIFICAR))
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
// Lo de la ronda 1

const RUTA_DEL_ALUMNO = `${BASES.estudiante}/tareas/${TAREA}`
const RUTA_ANTERIOR = `/estudiante/clases-anteriores/${CLASE}`
const RUTA_ADMIN = `${BASES.admin}/tareas/${TAREA}`
const SUBIDA = "almacen.ejemplo.mx"

const esAlmacen = ({ url }: Llamada) => url.hostname === SUBIDA
const esPutTarea = ({ metodo, url }: Llamada) => metodo === "PUT" && url.pathname === API_TAREA
const esCalificar = ({ metodo, url }: Llamada) => metodo === "PUT" && url.pathname === API_CALIFICAR
const esBorrar = ({ metodo, url }: Llamada) => metodo === "DELETE" && url.pathname === API_TAREA

let solicitudes = 0
const solicitudDeSubida = () => {
  solicitudes += 1
  return respuestaJson(201, {
    archivo: {
      id: `6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(5000 + solicitudes)}`,
      nombre: "guia.pdf",
      tipo: "application/pdf",
      tamano: 1,
    },
    subida: {
      url: `https://${SUBIDA}/subida/${String(solicitudes)}`,
      metodo: "PUT",
      cabeceras: { "Content-Type": "application/pdf" },
      expiraEn: "2030-01-10T12:05:00.000Z",
    },
  })
}

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

describe("ataque ADMIN-01d2 r1, punto 3: fila 32 con el segundo paso abierto y dos vueltas", () => {
  const conElSegundoPasoEnVuelo = async (
    respuesta: () => Response,
    llevar: (cliente: QueryClient) => Promise<void>,
  ) => {
    const enVuelo = retener()
    servidor.rol = "admin"
    servidor.manejador = (llamada) => {
      if (!esBorrar(llamada)) return undefined
      if (llamada.url.searchParams.get("confirmar") === null) {
        return errorJson(409, "TAREA_CON_ENTREGAS", CON_ENTREGAS)
      }
      return enVuelo.promesa.then(respuesta)
    }
    const cliente = clienteDePrueba()
    const router = await montar([RUTA_ADMIN], cliente)
    fireEvent.click(await buscarBoton("Borrar tarea"))
    fireEvent.click(await buscarBoton("Sí, borrar tarea"))
    expect(await screen.findByRole("alert", {}, ESPERA)).toHaveTextContent(CON_ENTREGAS)
    fireEvent.click(await buscarBoton("Borrar con las entregas"))
    await waitFor(() => expect(llamadas.filter(esBorrar)).toHaveLength(2), ESPERA)
    await llevar(cliente)
    return { cliente, router, soltar: enVuelo.soltar }
  }

  it("ADM-T1D201: con «Borrar con las entregas» en vuelo y dos vueltas, reabrir da el primer paso y no sale otro DELETE; con éxito navega a Actividades y da un solo aviso", async () => {
    const { router, soltar, cliente } = await conElSegundoPasoEnVuelo(
      () => new Response(null, { status: 204 }),
      dosVueltas,
    )
    expect(boton("Borrar con las entregas")).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
    fireEvent.click(await buscarBoton("Borrar tarea"))
    const si = await buscarBoton("Sí, borrar tarea")
    fireEvent.click(si)
    fireEvent.click(si)
    expect(llamadas.filter(esBorrar)).toHaveLength(2)
    soltar()
    await waitFor(
      () => expect(router.state.location.pathname).toBe(`${BASES.admin}/trabajo`),
      ESPERA,
    )
    await dejarCorrer(cliente)
    expect(exitos()).toEqual([TEXTOS_DETALLE_TAREA.avisoBorrada])
    expect(errores()).toEqual([])
    expect(llamadas.filter(esBorrar)).toHaveLength(2)
  })

  it("ADM-T1D202: con «Borrar con las entregas» en vuelo y dos vueltas, un 409 da un solo aviso, no abre el segundo paso, y el siguiente intento vuelve a abrirlo sin aviso", async () => {
    const { soltar, cliente } = await conElSegundoPasoEnVuelo(
      () => errorJson(409, "TAREA_CON_ENTREGAS", CON_ENTREGAS),
      dosVueltas,
    )
    fireEvent.click(await buscarBoton("Borrar tarea"))
    await buscarBoton("Sí, borrar tarea")
    soltar()
    await waitFor(() => expect(errores()).toEqual([CON_ENTREGAS]), ESPERA)
    await dejarCorrer(cliente)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(boton("Borrar con las entregas")).toBeNull()
    fireEvent.click(await buscarBoton("Sí, borrar tarea"))
    expect(await screen.findByRole("alert", {}, ESPERA)).toHaveTextContent(CON_ENTREGAS)
    expect(errores()).toEqual([CON_ENTREGAS])
  })

  it("ADM-T1D203: el DELETE con éxito llega con la clase ya archivada: navega a Actividades en solo lectura, con un solo aviso y sin otra escritura", async () => {
    const { router, soltar, cliente } = await conElSegundoPasoEnVuelo(
      () => new Response(null, { status: 204 }),
      archivar,
    )
    soltar()
    await waitFor(
      () => expect(router.state.location.pathname).toBe(`${BASES.admin}/trabajo`),
      ESPERA,
    )
    await dejarCorrer(cliente)
    expect(avisoFijo()).not.toBeNull()
    expect(screen.queryByRole("link", { name: "Crear tarea" })).toBeNull()
    expect(exitos()).toEqual([TEXTOS_DETALLE_TAREA.avisoBorrada])
    expect(errores()).toEqual([])
  })
})

describe("ataque ADMIN-01d2 r1, punto 4: filas 35 y 36 con un archivo a medio subir", () => {
  const CASOS = [
    { modo: "editar", ruta: RUTAS.editar, accion: "Guardar cambios" },
    { modo: "crear", ruta: RUTAS.crear, accion: "Publicar tarea" },
  ]

  const conElArchivoEnVuelo = async (ruta: string, modo: string, accion: string) => {
    const enVuelo = retener()
    servidor.manejador = (llamada) => {
      if (llamada.url.pathname === `${API}/archivos` && llamada.metodo === "POST") {
        return solicitudDeSubida()
      }
      if (esAlmacen(llamada)) return enVuelo.promesa.then(() => new Response(null, { status: 200 }))
      return undefined
    }
    const cliente = clienteDePrueba()
    const router = await montar([ruta], cliente)
    if (modo === "crear") await llenarLaTareaNueva()
    const titulo = await screen.findByLabelText("Título", {}, ESPERA)
    fireEvent.change(titulo, { target: { value: "Lo escrito" } })
    fireEvent.change(screen.getByLabelText("Adjuntar archivos"), {
      target: { files: [textoDeArchivo()] },
    })
    await screen.findAllByText("guia.pdf", {}, ESPERA)
    fireEvent.click(await buscarBoton(accion))
    await waitFor(() => expect(llamadas.filter(esAlmacen)).toHaveLength(1), ESPERA)
    return { cliente, router, titulo, soltar: enVuelo.soltar }
  }

  const escriturasDeLaTarea = () =>
    llamadas.filter(
      (l) =>
        (l.metodo === "PUT" && l.url.pathname === API_TAREA) ||
        (l.metodo === "POST" && l.url.pathname === `${API}/tareas`),
    )

  it.each(CASOS)(
    "ADM-T1D204 ($modo): el PUT al almacén llega y la tarea recibe 409 CLASE_ARCHIVADA: un solo aviso, sin navegar, lo escrito sigue hasta el detalle nuevo, que se pide una vez",
    async ({ modo, ruta, accion }) => {
      const { cliente, router, titulo, soltar } = await conElArchivoEnVuelo(ruta, modo, accion)
      const detalleRetenido = retener()
      const antes = pedidas("GET", API).length
      servidor.archivada = true
      servidor.detalleRetenido = detalleRetenido.promesa
      soltar()
      await waitFor(() => expect(errores()).toEqual([ARCHIVADA]), ESPERA)
      expect(escriturasDeLaTarea()).toHaveLength(1)
      expect(router.state.location.pathname).toBe(ruta)
      expect(screen.getByLabelText("Título")).toBe(titulo)
      expect(titulo).toHaveValue("Lo escrito")
      await waitFor(() => expect(pedidas("GET", API)).toHaveLength(antes + 1), ESPERA)
      detalleRetenido.soltar()
      expect(await screen.findByRole("link", { name: VOLVER }, ESPERA)).toBeInTheDocument()
      await dejarCorrer(cliente)
      expect(pedidas("GET", API)).toHaveLength(antes + 1)
      expect(errores()).toEqual([ARCHIVADA])
      expect(exitos()).toEqual([])
      expect(router.state.location.pathname).toBe(ruta)
    },
  )

  it.each(CASOS)(
    "ADM-T1D205 ($modo): la clase se archiva con el PUT en vuelo y el formulario se va; al llegar, la tarea recibe el 409: un solo aviso, sin navegar; al restaurar, el formulario nace limpio y sin otra escritura",
    async ({ modo, ruta, accion }) => {
      const { cliente, router, soltar } = await conElArchivoEnVuelo(ruta, modo, accion)
      await archivar(cliente)
      expect(screen.queryByLabelText("Título")).toBeNull()
      soltar()
      await waitFor(() => expect(errores()).toEqual([ARCHIVADA]), ESPERA)
      await dejarCorrer(cliente)
      expect(escriturasDeLaTarea()).toHaveLength(1)
      expect(router.state.location.pathname).toBe(ruta)
      expect(screen.getByRole("link", { name: VOLVER })).toBeInTheDocument()
      await restaurar(cliente)
      const titulo = await screen.findByLabelText("Título", {}, ESPERA)
      expect(titulo).not.toHaveValue("Lo escrito")
      expect(escriturasDeLaTarea()).toHaveLength(1)
      expect(errores()).toEqual([ARCHIVADA])
    },
  )

  it.each(CASOS)(
    "ADM-T1D206 ($modo): con dos archivos, el PUT del primero en vuelo al archivar y la solicitud del segundo con 409: un solo aviso, con el texto de archivada, sin escribir la tarea",
    async ({ modo, ruta, accion }) => {
      const enVuelo = retener()
      servidor.manejador = (llamada) => {
        if (llamada.url.pathname === `${API}/archivos` && llamada.metodo === "POST") {
          return servidor.archivada ? archivadaJson() : solicitudDeSubida()
        }
        if (esAlmacen(llamada)) {
          return enVuelo.promesa.then(() => new Response(null, { status: 200 }))
        }
        return undefined
      }
      const cliente = clienteDePrueba()
      const router = await montar([ruta], cliente)
      if (modo === "crear") await llenarLaTareaNueva()
      await screen.findByLabelText("Título", {}, ESPERA)
      fireEvent.change(screen.getByLabelText("Adjuntar archivos"), {
        target: {
          files: [
            new File(["x"], "a.pdf", { type: "application/pdf" }),
            new File(["y"], "b.pdf", { type: "application/pdf" }),
          ],
        },
      })
      await screen.findAllByText("b.pdf", {}, ESPERA)
      fireEvent.click(await buscarBoton(accion))
      await waitFor(() => expect(llamadas.filter(esAlmacen)).toHaveLength(1), ESPERA)
      await archivar(cliente)
      enVuelo.soltar()
      await waitFor(() => expect(errores()).toHaveLength(1), ESPERA)
      await dejarCorrer(cliente)
      expect(errores()).toHaveLength(1)
      expect(errores()[0]).toContain("b.pdf")
      expect(errores()[0]).toContain(ARCHIVADA)
      expect(escriturasDeLaTarea()).toHaveLength(0)
      expect(router.state.location.pathname).toBe(ruta)
    },
  )
})

describe("ataque ADMIN-01d2 r1, punto 5: el alumno con la entrega en vuelo cuando entra N-05", () => {
  const ENTREGA_VACIA = "Agrega al menos un archivo o un enlace."
  const esEntregar = ({ metodo, url }: Llamada) =>
    metodo === "POST" && url.pathname === API_MI_ENTREGA

  const conLaSubidaEnVuelo = async (almacen: () => Response, entrega: () => Response) => {
    const enVuelo = retener()
    servidor.rol = "estudiante"
    servidor.manejador = (llamada) => {
      if (llamada.url.pathname === `${API_MI_ENTREGA}/archivos` && llamada.metodo === "POST") {
        return solicitudDeSubida()
      }
      if (esAlmacen(llamada)) return enVuelo.promesa.then(almacen)
      if (esEntregar(llamada)) return entrega()
      return undefined
    }
    const cliente = clienteDePrueba()
    const router = await montar(["/estudiante", RUTA_DEL_ALUMNO], cliente)
    fireEvent.change(await screen.findByLabelText("Enlace", {}, ESPERA), {
      target: { value: "https://ejemplo.mx/trabajo" },
    })
    fireEvent.click(await buscarBoton("Agregar enlace"))
    await screen.findAllByText("https://ejemplo.mx/trabajo", {}, ESPERA)
    fireEvent.change(screen.getByLabelText("Adjuntar archivos"), {
      target: { files: [textoDeArchivo()] },
    })
    await screen.findAllByText("guia.pdf", {}, ESPERA)
    fireEvent.click(await buscarBoton("Entregar tarea"))
    await waitFor(() => expect(llamadas.filter(esAlmacen)).toHaveLength(1), ESPERA)
    await cambiarDetalle(cliente, true)
    await waitFor(() => expect(router.state.location.pathname).toBe(RUTA_ANTERIOR), ESPERA)
    return { cliente, router, soltar: enVuelo.soltar }
  }

  const bien = () => new Response(null, { status: 200 })

  it.each([
    {
      nombre: "ENTREGA_VACIA",
      respuesta: () => errorJson(400, "ENTREGA_VACIA", ENTREGA_VACIA),
      texto: ENTREGA_VACIA,
    },
    {
      nombre: "enlaces.0",
      respuesta: () => errorJson(400, "VALIDACION", "enlaces.0: Enlace no válido"),
      texto: "Enlace no válido",
    },
    { nombre: "CLASE_ARCHIVADA", respuesta: archivadaJson, texto: ARCHIVADA },
  ])(
    "ADM-T1D207 ($nombre): la subida en vuelo llega después de la redirección: sale la entrega, un solo aviso legible y el alumno se queda en la clase anterior",
    async ({ respuesta, texto }) => {
      const { cliente, router, soltar } = await conLaSubidaEnVuelo(bien, respuesta)
      soltar()
      await waitFor(() => expect(errores()).toEqual([texto]), ESPERA)
      await dejarCorrer(cliente)
      expect(llamadas.filter(esEntregar)).toHaveLength(1)
      expect(errores()).toEqual([texto])
      expect(exitos()).toEqual([])
      expect(router.state.location.pathname).toBe(RUTA_ANTERIOR)
    },
  )

  it("ADM-T1D208: el PUT al almacén falla después de la redirección: un solo aviso, sin entregar, y se queda en la clase anterior", async () => {
    const { cliente, router, soltar } = await conLaSubidaEnVuelo(
      () => new Response(null, { status: 500 }),
      () => respuestaJson(200, miEntregaDoble()),
    )
    soltar()
    await waitFor(() => expect(errores()).toHaveLength(1), ESPERA)
    await dejarCorrer(cliente)
    expect(errores()).toHaveLength(1)
    expect(errores()[0]).toContain("guia.pdf")
    expect(llamadas.filter(esEntregar)).toHaveLength(0)
    expect(router.state.location.pathname).toBe(RUTA_ANTERIOR)
  })

  it("ADM-T1D209: la entrega se acepta después de la redirección: un solo aviso de éxito y ningún error", async () => {
    const { cliente, router, soltar } = await conLaSubidaEnVuelo(bien, () =>
      respuestaJson(200, miEntregaDoble()),
    )
    soltar()
    await waitFor(() => expect(exitos()).toEqual([TEXTOS_TU_TRABAJO.avisoEntregada]), ESPERA)
    await dejarCorrer(cliente)
    expect(errores()).toEqual([])
    expect(router.state.location.pathname).toBe(RUTA_ANTERIOR)
  })
})

describe("ataque ADMIN-01d2 r1, punto 8: la recarga tras el 409 con la vista desmontada y con un segundo 409", () => {
  // Cada lectura de `rutas` se retiene por separado desde que `control.retener` se enciende.
  const conLecturasRetenidas = (
    esEscritura: (llamada: Llamada) => boolean,
    conflicto: () => Response,
    rutas: string[],
    lectura: (ruta: string) => Response,
  ) => {
    const lecturas: { ruta: string; soltar: () => void }[] = []
    const control = { retener: false }
    servidor.manejador = (llamada) => {
      if (esEscritura(llamada)) return conflicto()
      const { metodo, url } = llamada
      if (metodo !== "GET" || !control.retener || !rutas.includes(url.pathname)) return undefined
      const retenida = retener()
      lecturas.push({ ruta: url.pathname, soltar: retenida.soltar })
      return retenida.promesa.then(() => lectura(url.pathname))
    }
    return { lecturas, control }
  }

  const tareaModificada = () => errorJson(409, "TAREA_MODIFICADA", MODIFICADA)
  const entregaModificada = () => errorJson(409, "ENTREGA_MODIFICADA", ENTREGA_MODIFICADA)

  it("ADM-T1D210 fila 36: la persona sale con la recarga en vuelo: al llegar no navega ni avisa otra vez, y al volver el formulario guarda con la versión nueva", async () => {
    const { lecturas, control } = conLecturasRetenidas(
      (l) => esPutTarea(l) && (l.cuerpo as { version: number }).version === 3,
      tareaModificada,
      [API_TAREA],
      () => respuestaJson(200, tareaDoble()),
    )
    const cliente = clienteDePrueba()
    const router = await montar([RUTAS.editar], cliente)
    await screen.findByLabelText("Título", {}, ESPERA)
    control.retener = true
    await pulsarGuardar()
    await waitFor(() => expect(errores()).toEqual([MODIFICADA]), ESPERA)
    await waitFor(() => expect(lecturas).toHaveLength(1), ESPERA)
    await act(() => router.navigate(RUTAS.otra))
    await screen.findByRole("heading", { name: "Dudas" }, ESPERA)
    servidor.version = 4
    lecturas[0]?.soltar()
    await dejarCorrer(cliente)
    expect(router.state.location.pathname).toBe(RUTAS.otra)
    expect(errores()).toEqual([MODIFICADA])
    control.retener = false
    await act(() => router.navigate(RUTAS.editar))
    expect(await screen.findByLabelText("Título", {}, ESPERA)).toHaveValue("Versión 4")
    await pulsarGuardar()
    await waitFor(() => expect(router.state.location.pathname).toBe(RUTAS.detalle), ESPERA)
    expect(
      llamadas.filter(esPutTarea).map((l) => (l.cuerpo as { version: number }).version),
    ).toEqual([3, 4])
    expect(errores()).toEqual([MODIFICADA])
  })

  it("ADM-T1D211 fila 33: la persona sale con la recarga en vuelo: al llegar no avisa otra vez ni navega", async () => {
    const { lecturas, control } = conLecturasRetenidas(
      esCalificar,
      entregaModificada,
      [API_ALUMNO],
      () => respuestaJson(200, entregaDoble()),
    )
    const cliente = clienteDePrueba()
    const router = await montar([RUTAS.entrega], cliente)
    await campoCalificacion()
    control.retener = true
    await pulsarCalificar()
    await waitFor(() => expect(errores()).toEqual([ENTREGA_MODIFICADA]), ESPERA)
    await waitFor(() => expect(lecturas).toHaveLength(1), ESPERA)
    await act(() => router.navigate(RUTAS.otra))
    await screen.findByRole("heading", { name: "Dudas" }, ESPERA)
    lecturas[0]?.soltar()
    await dejarCorrer(cliente)
    expect(router.state.location.pathname).toBe(RUTAS.otra)
    expect(errores()).toEqual([ENTREGA_MODIFICADA])
  })

  it.each([
    { orden: "la nueva primero", primera: 1, segunda: 0 },
    { orden: "la vieja primero", primera: 0, segunda: 1 },
  ])(
    "ADM-T1D212 fila 36, $orden: con la recarga de antes de archivar sin resolver, un segundo 409 reinicia una sola vez con la versión nueva y lleva el foco al título",
    async ({ primera, segunda }) => {
      const { lecturas, control } = conLecturasRetenidas(
        esPutTarea,
        tareaModificada,
        [API_TAREA],
        () => respuestaJson(200, tareaDoble()),
      )
      const cliente = clienteDePrueba()
      await montar([RUTAS.editar], cliente)
      await screen.findByLabelText("Título", {}, ESPERA)
      control.retener = true
      await pulsarGuardar()
      await waitFor(() => expect(lecturas).toHaveLength(1), ESPERA)
      await archivar(cliente)
      await restaurar(cliente)
      const nuevo = await screen.findByLabelText("Título", {}, ESPERA)
      fireEvent.change(nuevo, { target: { value: "Escrito después" } })
      fireEvent.click(await buscarBoton("Guardar cambios"))
      await waitFor(() => expect(errores()).toEqual([MODIFICADA, MODIFICADA]), ESPERA)
      await waitFor(() => expect(lecturas).toHaveLength(2), ESPERA)
      servidor.version = 4
      lecturas[primera]?.soltar()
      lecturas[segunda]?.soltar()
      await dejarCorrer(cliente)
      const reiniciado = await screen.findByLabelText("Título", {}, ESPERA)
      expect(reiniciado).toHaveValue("Versión 4")
      expect(reiniciado).toHaveFocus()
      expect(errores()).toEqual([MODIFICADA, MODIFICADA])
    },
  )

  it("ADM-T1D213 fila 36: sin pasar por una archivada, con la recarga en vuelo el botón espera: dos clics no mandan otro PUT", async () => {
    const { lecturas, control } = conLecturasRetenidas(
      esPutTarea,
      tareaModificada,
      [API_TAREA],
      () => respuestaJson(200, tareaDoble()),
    )
    const cliente = clienteDePrueba()
    await montar([RUTAS.editar], cliente)
    await screen.findByLabelText("Título", {}, ESPERA)
    control.retener = true
    await pulsarGuardar()
    await waitFor(() => expect(lecturas).toHaveLength(1), ESPERA)
    const guardar = await buscarBoton("Guardar cambios")
    fireEvent.click(guardar)
    fireEvent.click(guardar)
    expect(llamadas.filter(esPutTarea)).toHaveLength(1)
    lecturas[0]?.soltar()
    await dejarCorrer(cliente)
    expect(errores()).toEqual([MODIFICADA])
  })

  it.each([
    { orden: "la nueva primero", primera: 1, segunda: 0 },
    { orden: "la vieja primero", primera: 0, segunda: 1 },
  ])(
    "ADM-T1D214 fila 33, $orden: con la recarga de antes de archivar sin resolver, un segundo 409 reinicia una sola vez y lo escrito se descarta, con el foco fuera de body",
    async ({ primera, segunda }) => {
      const { lecturas, control } = conLecturasRetenidas(
        esCalificar,
        entregaModificada,
        [API_ALUMNO],
        () => respuestaJson(200, entregaDoble()),
      )
      const cliente = clienteDePrueba()
      await montar([RUTAS.entrega], cliente)
      await campoCalificacion()
      control.retener = true
      await pulsarCalificar()
      await waitFor(() => expect(lecturas).toHaveLength(1), ESPERA)
      await archivar(cliente)
      await restaurar(cliente)
      const campo = await campoCalificacion()
      fireEvent.change(campo, { target: { value: "9" } })
      fireEvent.click(await buscarBoton(CALIFICAR))
      await waitFor(
        () => expect(errores()).toEqual([ENTREGA_MODIFICADA, ENTREGA_MODIFICADA]),
        ESPERA,
      )
      await waitFor(() => expect(lecturas).toHaveLength(2), ESPERA)
      lecturas[primera]?.soltar()
      lecturas[segunda]?.soltar()
      await dejarCorrer(cliente)
      const reiniciado = await campoCalificacion()
      expect(reiniciado).toHaveValue("")
      expect(document.activeElement).not.toBe(document.body)
      expect(errores()).toEqual([ENTREGA_MODIFICADA, ENTREGA_MODIFICADA])
    },
  )
})

describe("ataque ADMIN-01d2 r1: el alumno en el detalle de una tarea cuando la clase ya está archivada", () => {
  it("ADM-T1D215: la recarga de la tarea recibe 409 CLASE_ARCHIVADA: termina en la clase anterior y no se avisa que se muestra una versión que ya no se ve", async () => {
    servidor.rol = "estudiante"
    servidor.manejador = ({ metodo, url }) => {
      if (!servidor.archivada || metodo !== "GET") return undefined
      if (url.pathname === API || url.pathname === `${API}/mis-calificaciones`) return undefined
      return url.pathname.startsWith(API) ? archivadaJson() : undefined
    }
    const cliente = clienteDePrueba()
    const router = await montar(["/estudiante", RUTA_DEL_ALUMNO], cliente)
    await screen.findByRole("heading", { name: "Tu trabajo" }, ESPERA)
    servidor.archivada = true
    await act(() => cliente.invalidateQueries({ queryKey: claveTarea(CLASE, TAREA) }))
    await waitFor(() => expect(router.state.location.pathname).toBe(RUTA_ANTERIOR), ESPERA)
    await dejarCorrer(cliente)
    expect(errores().filter((texto) => texto.includes("Mostramos la última versión"))).toEqual([])
    expect(errores().length).toBeLessThanOrEqual(1)
  })
})

describe("ataque ADMIN-01d2 r1: el foco en cada control de las filas 31 a 36 cuando la clase pasa a archivada", () => {
  const CONTROLES: { fila: string; ruta: string; control: () => Promise<HTMLElement> }[] = [
    {
      fila: "31, Editar tarea",
      ruta: RUTAS.detalle,
      control: () => screen.findByRole("link", { name: "Editar tarea" }, ESPERA),
    },
    { fila: "32, Borrar tarea", ruta: RUTAS.detalle, control: () => buscarBoton("Borrar tarea") },
    {
      fila: "32, Cancelar",
      ruta: RUTAS.detalle,
      control: async () => {
        fireEvent.click(await buscarBoton("Borrar tarea"))
        return buscarBoton("Cancelar")
      },
    },
    { fila: "33, campo", ruta: RUTAS.entrega, control: campoCalificacion },
    {
      fila: "34, comentario",
      ruta: RUTAS.entrega,
      control: () => screen.findByLabelText("Comentario privado", {}, ESPERA),
    },
    {
      fila: "35, título",
      ruta: RUTAS.crear,
      control: () => screen.findByLabelText("Título", {}, ESPERA),
    },
    {
      fila: "36, título",
      ruta: RUTAS.editar,
      control: () => screen.findByLabelText("Título", {}, ESPERA),
    },
  ]

  it.each(CONTROLES)(
    "ADM-T1D234 fila $fila: el control sale y el foco queda en la página, nunca en body",
    async ({ ruta, control }) => {
      const cliente = clienteDePrueba()
      await montar([ruta], cliente)
      const elemento = await control()
      act(() => elemento.focus())
      expect(elemento).toHaveFocus()
      await archivar(cliente)
      await waitFor(() => expect(elemento.isConnected).toBe(false), ESPERA)
      await waitFor(() => expect(document.activeElement).not.toBe(document.body), ESPERA)
      expect(document.activeElement?.isConnected).toBe(true)
    },
  )
})
