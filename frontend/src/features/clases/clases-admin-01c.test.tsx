import { duplicarClaseSchema } from "@campus/shared"
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider, useParams } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/services/apiClient"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ClasesAdminView } from "./clases-admin-view"
import { DuplicarClaseView } from "./duplicar-clase-view"
import { erroresDeLaClaseDeApi, erroresPorCampo, mensajeDeErrorClases } from "./lib"

// ADMIN-01c (§D-10, §D-12, Enmiendas 5, 9 y 10): /admin/clases con "Activas" y "Archivadas",
// archivar con confirmación en línea, restaurar, el diálogo de borrado definitivo con el conteo, la vista
// de duplicar, el cursor con posición y el descarte de filas repetidas. El servidor es un doble en memoria
// (fetch) y los avisos, un doble de sonner. Los caminos con el router real y app/providers.tsx viven en
// clases-admin-01c-rutas.test.tsx.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const idClase = (n: number) => `2a2b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const LUIS = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const MARTA = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d10", nombre: "Marta Ruiz" }
const ID_COPIA = idClase(90)
const archivadaEn = (n: number) => `2026-10-${String(n).padStart(2, "0")}T12:00:00.000Z`

interface ClaseDoble {
  id: string
  nombre: string
  maestros: { id: string; nombre: string }[]
  alumnos: number
  creadoEn: string
  archivadaEn: string | null
}

const clase = (n: number, extra: Partial<ClaseDoble> = {}): ClaseDoble => ({
  id: idClase(n),
  nombre: `Clase ${String(n)}`,
  maestros: [LUIS],
  alumnos: n,
  creadoEn: "2026-09-01T15:00:00.000Z",
  archivadaEn: null,
  ...extra,
})
const archivada = (n: number, extra: Partial<ClaseDoble> = {}) =>
  clase(n, { archivadaEn: archivadaEn(n), ...extra })

const TEXTO_ARCHIVAR =
  "La clase saldrá de las listas de sus maestros y alumnos. Podrás restaurarla."
const AVISO_DUPLICADA =
  "Clase duplicada. Los archivos de los recursos pueden tardar unos minutos en estar disponibles."
const LISTA_CAMBIADA = "La lista cambió mientras la veías. Vuelve a abrirla para verla completa."
const COPIAS_EN_CURSO =
  "Esta clase tiene archivos que todavía se están copiando. Inténtalo en unos minutos."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorJson = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })
const validacion = (mensaje: string) => new ApiError("VALIDACION", mensaje, 400)

const detalle = (id: string, nombre: string) => ({
  clase: { id, nombre, descripcion: null, maestro: LUIS, maestros: [LUIS], archivadaEn: null },
})

interface Llamada {
  metodo: string
  ruta: string
  url: URL
  cuerpo: unknown
}

const servidor = {
  activas: [] as ClaseDoble[],
  archivadas: [] as ClaseDoble[],
  conteo: { alumnos: 32, actividades: 14, entregas: 210, calificaciones: 180, archivos: 57 },
}
let llamadas: Llamada[] = []
// Una respuesta propia para una petición (undefined: la de siempre).
let manejador: (llamada: Llamada) => Response | Promise<Response> | undefined = () => undefined

const pagina = (clases: ClaseDoble[], siguienteCursor: string | null = null, extra = {}) => ({
  clases,
  total: clases.length,
  siguienteCursor,
  siguienteCursorArchivadaEn: null,
  ...extra,
})

const porDefecto = (llamada: Llamada): Response => {
  const { metodo, url } = llamada
  if (metodo === "GET" && url.pathname === "/api/admin/clases") {
    const lista = url.searchParams.get("estado") === "archivadas" ? "archivadas" : "activas"
    return respuestaJson(200, pagina(servidor[lista]))
  }
  const accion =
    /^\/api\/admin\/clases\/([^/]+)\/(archivar|restaurar|conteo-de-borrado|duplicar)$/.exec(
      url.pathname,
    )
  if (accion?.[2] === "archivar") {
    const fila = servidor.activas.find((c) => c.id === accion[1])
    servidor.activas = servidor.activas.filter((c) => c.id !== accion[1])
    if (fila !== undefined) servidor.archivadas.unshift({ ...fila, archivadaEn: archivadaEn(28) })
    return respuestaJson(200, detalle(accion[1] ?? "", fila?.nombre ?? "x"))
  }
  if (accion?.[2] === "restaurar") {
    const fila = servidor.archivadas.find((c) => c.id === accion[1])
    servidor.archivadas = servidor.archivadas.filter((c) => c.id !== accion[1])
    if (fila !== undefined) servidor.activas.unshift({ ...fila, archivadaEn: null })
    return respuestaJson(200, detalle(accion[1] ?? "", fila?.nombre ?? "x"))
  }
  if (accion?.[2] === "conteo-de-borrado") return respuestaJson(200, servidor.conteo)
  if (accion?.[2] === "duplicar") return respuestaJson(201, detalle(ID_COPIA, "Copia"))
  const borrar = /^\/api\/admin\/clases\/([^/]+)$/.exec(url.pathname)
  if (metodo === "DELETE" && borrar !== null) {
    servidor.archivadas = servidor.archivadas.filter((c) => c.id !== borrar[1])
    return new Response(null, { status: 204 })
  }
  const deLaClase = /^\/api\/clases\/([^/]+)$/.exec(url.pathname)
  if (metodo === "GET" && deLaClase !== null) {
    const id = deLaClase[1] ?? ""
    const fila = [...servidor.activas, ...servidor.archivadas].find((c) => c.id === id)
    return respuestaJson(200, detalle(id, fila?.nombre ?? "Original"))
  }
  if (url.pathname === "/api/admin/maestros/candidatos") {
    return respuestaJson(200, {
      candidatos: [{ ...MARTA, email: "marta@ejemplo.mx" }],
      hayMas: false,
    })
  }
  return errorJson(500, "ERROR_INTERNO", "no esperada")
}

function PantallaDeLaClase() {
  const { claseId } = useParams()
  return <p>pantalla de la clase {claseId}</p>
}

const nuevoCliente = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

const montar = (entrada = "/admin/clases", cliente = nuevoCliente()) => {
  const router = createMemoryRouter(
    [
      { path: "/admin/clases", element: <ClasesAdminView /> },
      { path: "/admin/clases/nueva", element: <p>pantalla de crear</p> },
      { path: "/admin/clases/:claseId", element: <PantallaDeLaClase /> },
      { path: "/admin/clases/:claseId/duplicar", element: <DuplicarClaseView /> },
    ],
    { initialEntries: [entrada] },
  )
  clienteActual = cliente
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, cliente }
}

// M-03: en vez de un tiempo fijo, se espera a que la caché no tenga ninguna consulta ni mutación en vuelo:
// así una respuesta ya llegó y se procesó antes de comprobar lo que no debe aparecer.
let clienteActual: QueryClient | null = null
const asentado = () =>
  waitFor(() => {
    if (clienteActual === null) throw new Error("Precondición: la vista no se montó")
    expect(clienteActual.isFetching()).toBe(0)
    expect(clienteActual.isMutating()).toBe(0)
  })
const sinConsultasEnVuelo = () =>
  waitFor(() => {
    if (clienteActual === null) throw new Error("Precondición: la vista no se montó")
    expect(clienteActual.isFetching()).toBe(0)
  })

// Una respuesta retenida: la prueba decide cuándo llega.
const retener = () => {
  let soltar: (respuesta: Response) => void = () => {
    throw new Error("Precondición: la respuesta retenida no se creó")
  }
  const promesa = new Promise<Response>((resolver) => {
    soltar = resolver
  })
  return { promesa, soltar: (respuesta: Response) => soltar(respuesta) }
}

const pedidas = (metodo: string, filtro: (url: URL) => boolean) =>
  llamadas.filter((l) => l.metodo === metodo && filtro(l.url))
const deLaLista = (estado: string) => (url: URL) =>
  url.pathname === "/api/admin/clases" && url.searchParams.get("estado") === estado
const columnas = () =>
  within(screen.getByRole("table"))
    .getAllByRole("columnheader")
    .map((c) => c.textContent)
const enfocarYPulsar = (control: HTMLElement) => {
  act(() => control.focus())
  fireEvent.click(control)
}
const errores = () => aviso.error.mock.calls.map(([texto]) => String(texto))
const exitos = () => aviso.success.mock.calls.map(([texto]) => String(texto))

beforeEach(() => {
  establecerToken("token-de-prueba")
  servidor.activas = []
  servidor.archivadas = []
  servidor.conteo = {
    alumnos: 32,
    actividades: 14,
    entregas: 210,
    calificaciones: 180,
    archivos: 57,
  }
  llamadas = []
  manejador = () => undefined
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const ruta = String(entrada)
      const llamada: Llamada = {
        metodo: init?.method ?? "GET",
        ruta,
        url: new URL(ruta, "http://x"),
        cuerpo: typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined,
      }
      llamadas.push(llamada)
      return Promise.resolve(manejador(llamada) ?? porDefecto(llamada))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("/admin/clases: «Activas» y «Archivadas» (ADM-1C01, ADM-1C14)", () => {
  it("ADM-1C01: los dos botones están en el grupo «Estado de las clases»; «Archivadas» escribe ?estado= en el historial y atrás y adelante cambian de tabla", async () => {
    servidor.activas = [clase(1)]
    servidor.archivadas = [archivada(5)]
    const { router } = montar()

    await screen.findByRole("link", { name: "Abrir Clase 1" })
    expect(router.state.location.search, "al montar no escribe ?estado=").toBe("")
    const grupo = screen.getByRole("group", { name: "Estado de las clases" })
    const botonActivas = within(grupo).getByRole("button", { name: "Activas" })
    const botonArchivadas = within(grupo).getByRole("button", { name: "Archivadas" })
    expect(botonActivas).toHaveAttribute("aria-pressed", "true")
    expect(botonArchivadas).toHaveAttribute("aria-pressed", "false")
    expect(columnas()).toEqual(["Clase", "Maestros", "Alumnos", "Creada", "Acciones"])

    fireEvent.click(botonArchivadas)
    await screen.findByRole("link", { name: "Abrir Clase 5" })
    expect(router.state.location.search).toBe("?estado=archivadas")
    expect(columnas()).toEqual(["Clase", "Maestros", "Alumnos", "Archivada", "Acciones"])
    expect(screen.queryByRole("link", { name: "Abrir Clase 1" })).toBeNull()
    expect(within(grupo).getByRole("button", { name: "Archivadas" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )

    await act(() => router.navigate(-1))
    await screen.findByRole("link", { name: "Abrir Clase 1" })
    expect(screen.queryByRole("link", { name: "Abrir Clase 5" })).toBeNull()
    expect(
      within(screen.getByRole("group", { name: "Estado de las clases" })).getByRole("button", {
        name: "Activas",
      }),
    ).toHaveAttribute("aria-pressed", "true")

    await act(() => router.navigate(1))
    await screen.findByRole("link", { name: "Abrir Clase 5" })
    expect(router.state.location.search).toBe("?estado=archivadas")
  })

  it("ADM-1C14: la lista pide ?estado=activas&limite=50 en «Activas» y ?estado=archivadas&limite=50 en «Archivadas»", async () => {
    servidor.activas = [clase(1)]
    servidor.archivadas = [archivada(5)]
    montar()
    await screen.findByRole("link", { name: "Abrir Clase 1" })
    fireEvent.click(screen.getByRole("button", { name: "Archivadas" }))
    await screen.findByRole("link", { name: "Abrir Clase 5" })
    const rutas = llamadas.filter((l) => l.url.pathname === "/api/admin/clases").map((l) => l.ruta)
    expect(rutas).toEqual([
      "/api/admin/clases?estado=activas&limite=50",
      "/api/admin/clases?estado=archivadas&limite=50",
    ])
  })

  it.each([
    ["archivar", "/admin/clases"],
    ["restaurar", "/admin/clases?estado=archivadas"],
    ["borrar", "/admin/clases?estado=archivadas"],
    ["duplicar", `/admin/clases/${idClase(1)}/duplicar`],
  ])(
    "ADM-1C14: %s marca viejas las dos listas del admin (prefijo) y las listas de la barra lateral",
    async (accion, entrada) => {
      servidor.activas = [clase(1)]
      servidor.archivadas = [archivada(1)]
      const cliente = nuevoCliente()
      const invalidar = vi.spyOn(cliente, "invalidateQueries")
      montar(entrada, cliente)
      if (accion === "archivar") {
        fireEvent.click(await screen.findByRole("button", { name: "Archivar Clase 1" }))
        fireEvent.click(await screen.findByRole("button", { name: "Sí, archivar Clase 1" }))
      }
      if (accion === "restaurar") {
        fireEvent.click(await screen.findByRole("button", { name: "Restaurar Clase 1" }))
      }
      if (accion === "borrar") {
        fireEvent.click(
          await screen.findByRole("button", { name: "Borrar definitivamente Clase 1" }),
        )
        fireEvent.click(await screen.findByRole("button", { name: "Sí, borrar definitivamente" }))
      }
      if (accion === "duplicar") {
        await elegirAMarta()
        fireEvent.click(screen.getByRole("button", { name: "Duplicar clase" }))
      }
      await waitFor(() => expect(exitos()).toHaveLength(1))
      const claves = invalidar.mock.calls.map(([filtro]) => JSON.stringify(filtro?.queryKey))
      expect(claves).toContain(JSON.stringify(["clases", "admin"]))
      expect(claves).toContain(JSON.stringify(["clases", "inscritas"]))
      expect(claves).toContain(JSON.stringify(["clases", "impartidas"]))
      // Enmienda 10 (E10-6): ninguna mutación del admin toca la lista de clases anteriores.
      expect(claves.some((clave) => clave?.includes("anteriores") === true)).toBe(false)
    },
  )
})

describe("archivar con la confirmación en línea (ADM-1C02)", () => {
  it("ADM-1C02: la confirmación lleva el foco a «Cancelar» y cancelar lo regresa a «Archivar»; «Sí, archivar» con dos clics hace una sola petición, la fila sale, un aviso y el foco va al «Archivar» de la fila vecina", async () => {
    servidor.activas = [clase(1), clase(2)]
    const retenida = retener()
    manejador = ({ metodo, url }) => {
      if (metodo !== "POST" || !url.pathname.endsWith("/archivar")) return undefined
      return retenida.promesa
    }
    montar()

    enfocarYPulsar(await screen.findByRole("button", { name: "Archivar Clase 1" }))
    expect(await screen.findByText(TEXTO_ARCHIVAR)).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Cancelar Clase 1" })).toHaveFocus(),
    )
    fireEvent.click(screen.getByRole("button", { name: "Cancelar Clase 1" }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Archivar Clase 1" })).toHaveFocus(),
    )
    expect(screen.queryByText(TEXTO_ARCHIVAR)).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Archivar Clase 1" }))
    const si = await screen.findByRole("button", { name: "Sí, archivar Clase 1" })
    act(() => si.focus())
    fireEvent.click(si)
    fireEvent.click(si)
    await waitFor(() => expect(si).toHaveAttribute("aria-busy", "true"))
    await waitFor(() =>
      expect(pedidas("POST", (u) => u.pathname.endsWith("/archivar"))).toHaveLength(1),
    )
    fireEvent.click(si)
    expect(pedidas("POST", (u) => u.pathname.endsWith("/archivar"))).toHaveLength(1)

    servidor.activas = [clase(2)]
    retenida.soltar(respuestaJson(200, detalle(idClase(1), "Clase 1")))
    await waitFor(() => expect(screen.queryByRole("link", { name: "Abrir Clase 1" })).toBeNull())
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Archivar Clase 2" })).toHaveFocus(),
    )
    expect(exitos()).toEqual(["Clase archivada"])
    expect(errores()).toEqual([])
  })

  it("ADM-1C02: al archivar la última clase de la lista, el foco va al encabezado «Clases», nunca a <body>", async () => {
    servidor.activas = [clase(1)]
    montar()
    fireEvent.click(await screen.findByRole("button", { name: "Archivar Clase 1" }))
    enfocarYPulsar(await screen.findByRole("button", { name: "Sí, archivar Clase 1" }))
    await screen.findByText("Aún no hay clases")
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "Clases" })).toHaveFocus(),
    )
  })

  it("ADM-1C02: 409 CLASE_YA_ARCHIVADA da un solo aviso con el texto del servidor y la lista se renueva", async () => {
    servidor.activas = [clase(1), clase(2)]
    manejador = ({ metodo, url }) => {
      if (metodo !== "POST" || !url.pathname.endsWith("/archivar")) return undefined
      servidor.activas = [clase(2)]
      return errorJson(409, "CLASE_YA_ARCHIVADA", "Esta clase ya está archivada.")
    }
    montar()
    fireEvent.click(await screen.findByRole("button", { name: "Archivar Clase 1" }))
    enfocarYPulsar(await screen.findByRole("button", { name: "Sí, archivar Clase 1" }))
    await waitFor(() => expect(screen.queryByRole("link", { name: "Abrir Clase 1" })).toBeNull())
    await asentado()
    expect(errores()).toEqual(["Esta clase ya está archivada."])
    expect(exitos()).toEqual([])
    expect(pedidas("GET", deLaLista("activas")).length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole("button", { name: "Archivar Clase 2" })).toHaveFocus()
  })
})

describe("restaurar y duplicar (ADM-1C03)", () => {
  it("ADM-1C03: «Restaurar» con dos clics hace una sola petición, la fila sale de «Archivadas», un aviso y el foco va al «Restaurar» vecino", async () => {
    servidor.archivadas = [archivada(5), archivada(6)]
    const retenida = retener()
    manejador = ({ metodo, url }) =>
      metodo === "POST" && url.pathname.endsWith("/restaurar") ? retenida.promesa : undefined
    montar("/admin/clases?estado=archivadas")
    const restaurar = await screen.findByRole("button", { name: "Restaurar Clase 5" })
    act(() => restaurar.focus())
    fireEvent.click(restaurar)
    fireEvent.click(restaurar)
    await waitFor(() => expect(restaurar).toHaveAttribute("aria-busy", "true"))
    fireEvent.click(restaurar)
    expect(pedidas("POST", (u) => u.pathname.endsWith("/restaurar"))).toHaveLength(1)

    servidor.archivadas = [archivada(6)]
    retenida.soltar(respuestaJson(200, detalle(idClase(5), "Clase 5")))
    await waitFor(() => expect(screen.queryByRole("link", { name: "Abrir Clase 5" })).toBeNull())
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Restaurar Clase 6" })).toHaveFocus(),
    )
    expect(exitos()).toEqual(["Clase restaurada"])
  })

  it("ADM-1C03: «Duplicar» lleva a la vista de duplicar con el nombre prellenado; con éxito, la ruta pasa a la clase de la respuesta y hay un solo aviso, también sin recursos en la original (Enmienda 10)", async () => {
    servidor.activas = [clase(1)]
    const { router } = montar()
    const enlace = await screen.findByRole("link", { name: "Duplicar Clase 1" })
    expect(enlace).toHaveAttribute("href", `/admin/clases/${idClase(1)}/duplicar`)
    fireEvent.click(enlace)
    expect(await screen.findByRole("heading", { name: "Duplicar clase" })).toBeInTheDocument()
    expect(await screen.findByLabelText("Nombre de la clase")).toHaveValue("Clase 1")

    await elegirAMarta()
    fireEvent.click(screen.getByRole("button", { name: "Duplicar clase" }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/admin/clases/${ID_COPIA}`))
    const post = pedidas("POST", (u) => u.pathname.endsWith("/duplicar"))
    expect(post).toHaveLength(1)
    expect(post[0]?.url.pathname).toBe(`/api/admin/clases/${idClase(1)}/duplicar`)
    expect(post[0]?.cuerpo).toEqual({ nombre: "Clase 1", maestroIds: [MARTA.id] })
    expect(exitos()).toEqual([AVISO_DUPLICADA])
    expect(errores()).toEqual([])
  })
})

const abrirElBorrado = async (nombre: string) => {
  enfocarYPulsar(await screen.findByRole("button", { name: `Borrar definitivamente ${nombre}` }))
  return screen.findByRole("dialog")
}

describe("el diálogo de borrado definitivo (ADM-1C04, ADM-1C04b, ADM-1C09)", () => {
  it("ADM-1C04: pide el conteo al abrirse y lo dice en palabras; el foco empieza en «Cancelar»; dos clics, un solo DELETE con la confirmación; la fila sale, el diálogo se cierra, un aviso y el foco va al «Borrar definitivamente» vecino", async () => {
    servidor.archivadas = [archivada(5), archivada(6)]
    const retenida = retener()
    manejador = ({ metodo }) => (metodo === "DELETE" ? retenida.promesa : undefined)
    montar("/admin/clases?estado=archivadas")
    const dialogo = await abrirElBorrado("Clase 5")

    expect(
      await within(dialogo).findByText(
        "Se perderán las inscripciones de 32 alumnos, 14 actividades, 210 entregas, 180 calificaciones y 57 archivos, y el registro de altas y bajas de la clase. No se puede deshacer.",
      ),
    ).toBeInTheDocument()
    expect(pedidas("GET", (u) => u.pathname.endsWith("/conteo-de-borrado"))).toHaveLength(1)
    await waitFor(() =>
      expect(within(dialogo).getByRole("button", { name: "Cancelar" })).toHaveFocus(),
    )

    const borrar = within(dialogo).getByRole("button", { name: "Sí, borrar definitivamente" })
    act(() => borrar.focus())
    fireEvent.click(borrar)
    fireEvent.click(borrar)
    await waitFor(() => expect(borrar).toHaveAttribute("aria-busy", "true"))
    fireEvent.click(borrar)
    const deletes = pedidas("DELETE", () => true)
    expect(deletes).toHaveLength(1)
    expect(deletes[0]?.ruta).toBe(`/api/admin/clases/${idClase(5)}?confirmar=borrar`)

    servidor.archivadas = [archivada(6)]
    retenida.soltar(new Response(null, { status: 204 }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(screen.queryByRole("link", { name: "Abrir Clase 5" })).toBeNull())
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Borrar definitivamente Clase 6" })).toHaveFocus(),
    )
    expect(exitos()).toEqual(["Clase borrada"])
    expect(errores()).toEqual([])
  })

  it.each([
    [
      { alumnos: 1, actividades: 1, entregas: 1, calificaciones: 1, archivos: 1 },
      "Se perderán las inscripciones de 1 alumno, 1 actividad, 1 entrega, 1 calificación y 1 archivo, y el registro de altas y bajas de la clase. No se puede deshacer.",
    ],
    [
      { alumnos: 0, actividades: 0, entregas: 0, calificaciones: 0, archivos: 0 },
      "Se perderán las inscripciones de 0 alumnos, 0 actividades, 0 entregas, 0 calificaciones y 0 archivos, y el registro de altas y bajas de la clase. No se puede deshacer.",
    ],
  ])(
    "ADM-1C04: cada cifra con su singular y las que valen 0 dichas igual (%o)",
    async (conteo, texto) => {
      servidor.archivadas = [archivada(5)]
      servidor.conteo = conteo
      montar("/admin/clases?estado=archivadas")
      const dialogo = await abrirElBorrado("Clase 5")
      expect(await within(dialogo).findByText(texto)).toBeInTheDocument()
    },
  )

  it("ADM-1C04: 409 CLASE_CON_COPIAS_EN_CURSO da un solo mensaje en el diálogo, que sigue abierto con el conteo; el botón sale de la espera y repetirlo pide otro DELETE", async () => {
    servidor.archivadas = [archivada(5)]
    manejador = ({ metodo }) =>
      metodo === "DELETE" ? errorJson(409, "CLASE_CON_COPIAS_EN_CURSO", COPIAS_EN_CURSO) : undefined
    montar("/admin/clases?estado=archivadas")
    const dialogo = await abrirElBorrado("Clase 5")
    const borrar = await within(dialogo).findByRole("button", {
      name: "Sí, borrar definitivamente",
    })
    enfocarYPulsar(borrar)
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent(COPIAS_EN_CURSO)
    await asentado()
    expect(within(dialogo).getAllByRole("alert")).toHaveLength(1)
    expect(errores()).toEqual([])
    expect(screen.getByRole("dialog")).toBe(dialogo)
    expect(
      within(dialogo).getByText(/^Se perderán las inscripciones de 32 alumnos/),
    ).toBeInTheDocument()
    expect(borrar).not.toHaveAttribute("aria-busy")
    fireEvent.click(borrar)
    await waitFor(() => expect(pedidas("DELETE", () => true)).toHaveLength(2))
  })

  it("ADM-1C04b: el título es «Borrar definitivamente «{nombre}»» completo, sin comillas exteriores; un nombre de 120 caracteres sin espacios se conserva entero y el título parte palabras (wrap-anywhere)", async () => {
    const largo = "W".repeat(120)
    servidor.archivadas = [archivada(5), archivada(7, { nombre: largo })]
    montar("/admin/clases?estado=archivadas")
    const dialogo = await abrirElBorrado("Clase 5")
    expect(within(dialogo).getByRole("heading").textContent).toBe(
      "Borrar definitivamente «Clase 5»",
    )
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())

    const otro = await abrirElBorrado(largo)
    const titulo = within(otro).getByRole("heading")
    expect(titulo.textContent).toBe(`Borrar definitivamente «${largo}»`)
    expect(titulo.textContent).not.toContain("…")
    expect(titulo).toHaveClass("wrap-anywhere")
  })

  it("ADM-1C09: el contenido del diálogo lleva data-material=opaco y data-densidad=densa, y solo existe mientras está abierto (sin forceMount)", async () => {
    servidor.archivadas = [archivada(5)]
    montar("/admin/clases?estado=archivadas")
    await screen.findByRole("link", { name: "Abrir Clase 5" })
    expect(document.querySelectorAll("[data-material], [data-densidad]")).toHaveLength(0)
    const dialogo = await abrirElBorrado("Clase 5")
    expect(dialogo).toHaveAttribute("data-material", "opaco")
    expect(dialogo).toHaveAttribute("data-densidad", "densa")
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(document.querySelectorAll("[data-material], [data-densidad]")).toHaveLength(0)
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Borrar definitivamente Clase 5" })).toHaveFocus(),
    )
  })
})

const elegirAMarta = async () => {
  const campo = await screen.findByLabelText("Buscar maestro por nombre")
  fireEvent.change(campo, { target: { value: "Marta" } })
  fireEvent.click(
    await screen.findByRole("button", { name: "Elegir Marta Ruiz" }, { timeout: 3000 }),
  )
  await screen.findByRole("button", { name: "Quitar Marta Ruiz" })
}

const prepararDuplicado = async () => {
  servidor.activas = [clase(1)]
  montar(`/admin/clases/${idClase(1)}/duplicar`)
  const nombre = await screen.findByLabelText("Nombre de la clase")
  fireEvent.change(nombre, { target: { value: "Copia de prueba" } })
  await elegirAMarta()
  return nombre
}

const responderAlDuplicar = (respuesta: () => Response) => {
  manejador = ({ metodo, url }) =>
    metodo === "POST" && url.pathname.endsWith("/duplicar") ? respuesta() : undefined
}

const errorDelNombre = () => document.getElementById("nombre-de-la-copia-error")

describe("VALIDACION fuera de contrato del formulario de duplicar (ADM-1C05)", () => {
  it.each([
    [
      "(a) un campo que este modo no pinta (descripcion:, pintado solo al crear)",
      "descripcion: no puede tener más de 2000 caracteres",
    ],
    ["(b) mensaje vacío", ""],
    ["(b) mensaje de solo espacios", "   "],
    ["(c) prefijo con ruta", "maestroIds.0: maestroId: debe ser un identificador válido"],
  ])(
    "ADM-1C05 %s: un solo mensaje legible, lo escrito se conserva y «Duplicar clase» sale de la espera",
    async (_caso, mensaje) => {
      responderAlDuplicar(() => errorJson(400, "VALIDACION", mensaje))
      const nombre = await prepararDuplicado()
      const boton = screen.getByRole("button", { name: "Duplicar clase" })
      fireEvent.click(boton)
      await waitFor(() =>
        expect(pedidas("POST", (u) => u.pathname.endsWith("/duplicar"))).toHaveLength(1),
      )
      await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy"))
      await asentado()
      const deCampo = erroresDeLaClaseDeApi(validacion(mensaje), "duplicar")
      if (deCampo === null) {
        expect(errores()).toEqual([mensajeDeErrorClases(validacion(mensaje))])
        expect(errorDelNombre()).toBeNull()
        expect(screen.queryByText(mensajeDeErrorClases(validacion(mensaje)))).toBeNull()
      } else {
        expect(errores()).toEqual([])
        const textos = Object.values(deCampo)
        expect(textos).toHaveLength(1)
        expect(screen.getAllByText(textos[0] ?? "")).toHaveLength(1)
      }
      expect(errores().every((texto) => texto.trim().length > 0)).toBe(true)
      expect(nombre).toHaveValue("Copia de prueba")
      expect(screen.getByRole("button", { name: "Quitar Marta Ruiz" })).toBeInTheDocument()
      expect(boton).not.toHaveAttribute("aria-busy")
    },
  )

  it("ADM-1C05 (d): un rechazo del servidor bajo «Nombre» seguido de un envío que la validación local rechaza (nombre vacío): un solo mensaje, el del último envío, sin otro POST", async () => {
    responderAlDuplicar(() =>
      errorJson(400, "VALIDACION", "nombre: Ya hay una clase con ese nombre"),
    )
    const nombre = await prepararDuplicado()
    fireEvent.click(screen.getByRole("button", { name: "Duplicar clase" }))
    await waitFor(() =>
      expect(errorDelNombre()).toHaveTextContent("Ya hay una clase con ese nombre"),
    )

    fireEvent.change(nombre, { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: "Duplicar clase" }))
    const local = duplicarClaseSchema.safeParse({ nombre: "", maestroIds: [MARTA.id] })
    expect(local.success, "Precondición: el nombre vacío no es válido").toBe(false)
    const esperado = local.success ? "" : (erroresPorCampo(local.error.issues).nombre ?? "")
    expect(esperado.length).toBeGreaterThan(0)
    await waitFor(() => expect(errorDelNombre()).toHaveTextContent(esperado))
    expect(screen.queryByText("Ya hay una clase con ese nombre")).toBeNull()
    expect(errores()).toEqual([])
    expect(pedidas("POST", (u) => u.pathname.endsWith("/duplicar"))).toHaveLength(1)
  })
})

describe("duplicar con errores de negocio (ADM-1C13 y la matriz)", () => {
  it("ADM-1C13: 409 CLASE_CON_COPIAS_EN_CURSO da un solo aviso con el texto del servidor, lo escrito se conserva, «Duplicar clase» sale de la espera y repetir el envío pide otro POST", async () => {
    responderAlDuplicar(() => errorJson(409, "CLASE_CON_COPIAS_EN_CURSO", COPIAS_EN_CURSO))
    const nombre = await prepararDuplicado()
    const boton = screen.getByRole("button", { name: "Duplicar clase" })
    fireEvent.click(boton)
    await waitFor(() => expect(errores()).toEqual([COPIAS_EN_CURSO]))
    expect(nombre).toHaveValue("Copia de prueba")
    expect(screen.getByRole("button", { name: "Quitar Marta Ruiz" })).toBeInTheDocument()
    await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy"))
    fireEvent.click(boton)
    await waitFor(() =>
      expect(pedidas("POST", (u) => u.pathname.endsWith("/duplicar"))).toHaveLength(2),
    )
  })

  it("matriz de 01c: 404 MAESTRO_NO_ENCONTRADO va en el selector de maestros, sin aviso", async () => {
    responderAlDuplicar(() =>
      errorJson(404, "MAESTRO_NO_ENCONTRADO", "No encontramos a ese maestro."),
    )
    await prepararDuplicado()
    fireEvent.click(screen.getByRole("button", { name: "Duplicar clase" }))
    const grupo = screen.getByRole("group", { name: "Maestros de la clase" })
    expect(await within(grupo).findByText("No encontramos a ese maestro.")).toBeInTheDocument()
    expect(errores()).toEqual([])
  })

  it("matriz de 01c: duplicar sin elegir maestro no pide nada y marca el selector", async () => {
    servidor.activas = [clase(1)]
    montar(`/admin/clases/${idClase(1)}/duplicar`)
    await screen.findByLabelText("Nombre de la clase")
    fireEvent.click(screen.getByRole("button", { name: "Duplicar clase" }))
    const grupo = screen.getByRole("group", { name: "Maestros de la clase" })
    expect(await within(grupo).findByText("Elige al menos un maestro")).toBeInTheDocument()
    expect(pedidas("POST", () => true)).toHaveLength(0)
  })
})

const ENTRADAS_DE_ACCION = [
  ["(a) claseId:", "claseId: debe ser un identificador válido"],
  ["(b) vacío", ""],
  ["(b) espacios", "   "],
  ["(c) confirmar.0:", "confirmar.0: no es válido"],
  ["(d) nombre: (pintado solo al duplicar)", "nombre: no es válido"],
] as const

describe("VALIDACION fuera de contrato de «Sí, archivar», «Restaurar» y «Sí, borrar definitivamente» (ADM-1C15)", () => {
  it.each(ENTRADAS_DE_ACCION)(
    "ADM-1C15 %s en «Sí, archivar»: un solo aviso legible y el botón sale de la espera; (e) al cancelar y volver a abrir no queda ningún mensaje viejo",
    async (_caso, mensaje) => {
      servidor.activas = [clase(1)]
      manejador = ({ url }) =>
        url.pathname.endsWith("/archivar") ? errorJson(400, "VALIDACION", mensaje) : undefined
      montar()
      fireEvent.click(await screen.findByRole("button", { name: "Archivar Clase 1" }))
      const si = await screen.findByRole("button", { name: "Sí, archivar Clase 1" })
      enfocarYPulsar(si)
      await waitFor(() => expect(errores()).toHaveLength(1))
      expect(errores()).toEqual([mensajeDeErrorClases(validacion(mensaje))])
      expect(errores()[0]?.trim().length).toBeGreaterThan(0)
      await waitFor(() => expect(si).not.toHaveAttribute("aria-busy"))
      expect(screen.queryAllByRole("alert")).toHaveLength(0)

      fireEvent.click(screen.getByRole("button", { name: "Cancelar Clase 1" }))
      fireEvent.click(await screen.findByRole("button", { name: "Archivar Clase 1" }))
      expect(
        await screen.findByRole("button", { name: "Sí, archivar Clase 1" }),
      ).not.toHaveAttribute("aria-busy")
      expect(screen.queryAllByRole("alert")).toHaveLength(0)
      expect(errores()).toHaveLength(1)
    },
  )

  it.each(ENTRADAS_DE_ACCION)(
    "ADM-1C15 %s en «Restaurar»: un solo aviso legible y el botón sale de la espera",
    async (_caso, mensaje) => {
      servidor.archivadas = [archivada(5)]
      manejador = ({ url }) =>
        url.pathname.endsWith("/restaurar") ? errorJson(400, "VALIDACION", mensaje) : undefined
      montar("/admin/clases?estado=archivadas")
      const restaurar = await screen.findByRole("button", { name: "Restaurar Clase 5" })
      enfocarYPulsar(restaurar)
      await waitFor(() => expect(errores()).toHaveLength(1))
      expect(errores()).toEqual([mensajeDeErrorClases(validacion(mensaje))])
      await waitFor(() => expect(restaurar).not.toHaveAttribute("aria-busy"))
      expect(screen.queryAllByRole("alert")).toHaveLength(0)
    },
  )

  it.each(ENTRADAS_DE_ACCION)(
    "ADM-1C15 %s en «Sí, borrar definitivamente»: un solo mensaje legible en el diálogo, sin aviso; el botón sale de la espera; (e) al cerrar y volver a abrir el mensaje viejo no está",
    async (_caso, mensaje) => {
      servidor.archivadas = [archivada(5)]
      manejador = ({ metodo }) =>
        metodo === "DELETE" ? errorJson(400, "VALIDACION", mensaje) : undefined
      montar("/admin/clases?estado=archivadas")
      const dialogo = await abrirElBorrado("Clase 5")
      const borrar = await within(dialogo).findByRole("button", {
        name: "Sí, borrar definitivamente",
      })
      enfocarYPulsar(borrar)
      const alerta = await within(dialogo).findByRole("alert")
      expect(alerta).toHaveTextContent(mensajeDeErrorClases(validacion(mensaje)))
      expect(alerta.textContent?.trim().length).toBeGreaterThan(0)
      expect(within(dialogo).getAllByRole("alert")).toHaveLength(1)
      expect(errores()).toEqual([])
      await waitFor(() => expect(borrar).not.toHaveAttribute("aria-busy"))

      fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
      const otra = await abrirElBorrado("Clase 5")
      await within(otra).findByRole("button", { name: "Sí, borrar definitivamente" })
      expect(within(otra).queryAllByRole("alert")).toHaveLength(0)
    },
  )
})

describe("«Cargar más clases» y el cursor con posición (ADM-1C08, ADM-1C16)", () => {
  const POSICION = archivadaEn(5)

  it.each(["activas", "archivadas"] as const)(
    "ADM-1C08 y ADM-1C16 (d): en «%s», dos clics en «Cargar más clases» hacen una sola petición",
    async (estado) => {
      const primera = estado === "activas" ? clase(1) : archivada(5)
      const retenida = retener()
      manejador = ({ url }) => {
        if (!deLaLista(estado)(url)) return undefined
        if (url.searchParams.has("cursor")) return retenida.promesa
        return respuestaJson(
          200,
          pagina([primera], primera.id, {
            siguienteCursorArchivadaEn: estado === "archivadas" ? POSICION : null,
          }),
        )
      }
      montar(estado === "activas" ? "/admin/clases" : "/admin/clases?estado=archivadas")
      const boton = await screen.findByRole("button", { name: "Cargar más clases" })
      fireEvent.click(boton)
      fireEvent.click(boton)
      await waitFor(() => expect(boton).toHaveAttribute("aria-busy", "true"))
      fireEvent.click(boton)
      expect(
        pedidas("GET", (u) => deLaLista(estado)(u) && u.searchParams.has("cursor")),
      ).toHaveLength(1)
      retenida.soltar(respuestaJson(200, pagina([])))
    },
  )

  it("ADM-1C16 (a): en «Archivadas», la página siguiente lleva el cursor y la posición codificada, exactamente", async () => {
    manejador = ({ url }) => {
      if (!deLaLista("archivadas")(url)) return undefined
      if (url.searchParams.has("cursor")) return respuestaJson(200, pagina([archivada(4)]))
      return respuestaJson(
        200,
        pagina([archivada(5)], idClase(5), { siguienteCursorArchivadaEn: POSICION }),
      )
    }
    montar("/admin/clases?estado=archivadas")
    fireEvent.click(await screen.findByRole("button", { name: "Cargar más clases" }))
    await screen.findByRole("link", { name: "Abrir Clase 4" })
    const segunda = pedidas(
      "GET",
      (u) => deLaLista("archivadas")(u) && u.searchParams.has("cursor"),
    )
    expect(segunda.map((l) => l.ruta)).toEqual([
      `/api/admin/clases?estado=archivadas&limite=50&cursor=${idClase(5)}&cursorArchivadaEn=${encodeURIComponent(POSICION)}`,
    ])
  })

  it.each([
    ["con la posición en null", { siguienteCursorArchivadaEn: null }],
    ["sin la posición (dobles de hoy)", { siguienteCursorArchivadaEn: undefined }],
    ["aunque el servidor mandara una posición", { siguienteCursorArchivadaEn: POSICION }],
  ])(
    "ADM-1C16 (b): en «Activas», la segunda página sale sin cursorArchivadaEn %s",
    async (_caso, extra) => {
      manejador = ({ url }) => {
        if (!deLaLista("activas")(url)) return undefined
        if (url.searchParams.has("cursor")) return respuestaJson(200, pagina([clase(2)]))
        return respuestaJson(200, pagina([clase(1)], idClase(1), extra))
      }
      montar()
      fireEvent.click(await screen.findByRole("button", { name: "Cargar más clases" }))
      await screen.findByRole("link", { name: "Abrir Clase 2" })
      const segunda = pedidas("GET", (u) => deLaLista("activas")(u) && u.searchParams.has("cursor"))
      expect(segunda.map((l) => l.ruta)).toEqual([
        `/api/admin/clases?estado=activas&limite=50&cursor=${idClase(1)}`,
      ])
    },
  )

  it("ADM-1C16 (c): con el 400 de la posición vieja, la frase de lista cambiada una sola vez y sin aviso", async () => {
    manejador = ({ url }) => {
      if (!deLaLista("archivadas")(url)) return undefined
      if (url.searchParams.has("cursor")) {
        return errorJson(400, "VALIDACION", "cursor: no es válido")
      }
      return respuestaJson(
        200,
        pagina([archivada(5)], idClase(5), { siguienteCursorArchivadaEn: POSICION }),
      )
    }
    montar("/admin/clases?estado=archivadas")
    fireEvent.click(await screen.findByRole("button", { name: "Cargar más clases" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(LISTA_CAMBIADA)
    await asentado()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(screen.queryByText(/cursor|no es válido/)).toBeNull()
    expect(errores()).toEqual([])
  })
})

describe("filas repetidas entre páginas (ADM-1C17 b) y el foco al cargar la última (N-24)", () => {
  it.each(["activas", "archivadas"] as const)(
    "ADM-1C17 (b): en «%s», la fila que la segunda página repite se pinta una sola vez, en su lugar; React no avisa de claves repetidas y la tercera página sale con el cursor y la posición de la segunda respuesta",
    async (estado) => {
      const fila = (n: number) => (estado === "activas" ? clase(n) : archivada(n))
      const posicion = (n: number) => (estado === "archivadas" ? archivadaEn(n) : null)
      const consola = vi.spyOn(console, "error").mockImplementation(() => undefined)
      manejador = ({ url }) => {
        if (!deLaLista(estado)(url)) return undefined
        const cursor = url.searchParams.get("cursor")
        if (cursor === null) {
          return respuestaJson(
            200,
            pagina([fila(1), fila(2)], idClase(2), { siguienteCursorArchivadaEn: posicion(2) }),
          )
        }
        if (cursor === idClase(2)) {
          return respuestaJson(
            200,
            pagina([fila(2), fila(3)], idClase(3), { siguienteCursorArchivadaEn: posicion(3) }),
          )
        }
        return respuestaJson(200, pagina([fila(4)]))
      }
      montar(estado === "activas" ? "/admin/clases" : "/admin/clases?estado=archivadas")
      fireEvent.click(await screen.findByRole("button", { name: "Cargar más clases" }))
      await screen.findByRole("link", { name: "Abrir Clase 3" })
      expect(document.querySelectorAll(`[data-clase-id="${idClase(2)}"]`)).toHaveLength(1)
      expect(
        Array.from(document.querySelectorAll("[data-clase-id]")).map((n) =>
          n.getAttribute("data-clase-id"),
        ),
      ).toEqual([idClase(1), idClase(2), idClase(3)])
      expect(
        consola.mock.calls.some((llamada) => llamada.map(String).join(" ").includes("same key")),
      ).toBe(false)

      fireEvent.click(screen.getByRole("button", { name: "Cargar más clases" }))
      await screen.findByRole("link", { name: "Abrir Clase 4" })
      const tercera = pedidas(
        "GET",
        (u) => deLaLista(estado)(u) && u.searchParams.get("cursor") === idClase(3),
      )
      expect(tercera).toHaveLength(1)
      expect(tercera[0]?.url.searchParams.get("cursorArchivadaEn")).toBe(posicion(3))
    },
  )

  it("N-24: si la última página trae solo filas repetidas, el foco va al encabezado «Clases»", async () => {
    manejador = ({ url }) => {
      if (!deLaLista("activas")(url)) return undefined
      if (url.searchParams.has("cursor")) return respuestaJson(200, pagina([clase(2)]))
      return respuestaJson(200, pagina([clase(1), clase(2)], idClase(2)))
    }
    montar()
    enfocarYPulsar(await screen.findByRole("button", { name: "Cargar más clases" }))
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Cargar más clases" })).toBeNull(),
    )
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "Clases" })).toHaveFocus(),
    )
    expect(document.querySelectorAll("[data-clase-id]")).toHaveLength(2)
  })

  it("N-24: si la primera fila de la última página es repetida, el foco va al «Abrir» de la primera fila de verdad nueva", async () => {
    manejador = ({ url }) => {
      if (!deLaLista("activas")(url)) return undefined
      if (url.searchParams.has("cursor")) return respuestaJson(200, pagina([clase(2), clase(3)]))
      return respuestaJson(200, pagina([clase(1), clase(2)], idClase(2)))
    }
    montar()
    enfocarYPulsar(await screen.findByRole("button", { name: "Cargar más clases" }))
    await waitFor(() => expect(screen.getByRole("link", { name: "Abrir Clase 3" })).toHaveFocus())
  })
})

describe("corrección de la ronda 1: hermanos de T-01 en el diálogo de borrado", () => {
  it("hermano de T-01: el conteo con 409 CLASE_NO_ARCHIVADA (otra pestaña la restauró) muestra el texto del servidor, sin «Sí, borrar definitivamente», y la lista de «Archivadas» se renueva", async () => {
    servidor.archivadas = [archivada(5), archivada(6)]
    manejador = ({ url }) => {
      if (!url.pathname.endsWith("/conteo-de-borrado")) return undefined
      servidor.archivadas = [archivada(6)]
      return errorJson(409, "CLASE_NO_ARCHIVADA", "Esta clase no está archivada.")
    }
    montar("/admin/clases?estado=archivadas")
    const dialogo = await abrirElBorrado("Clase 5")
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent(
      "Esta clase no está archivada.",
    )
    expect(within(dialogo).queryByRole("button", { name: "Sí, borrar definitivamente" })).toBeNull()
    await waitFor(() =>
      expect(pedidas("GET", deLaLista("archivadas")).length).toBeGreaterThanOrEqual(2),
    )
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(screen.queryByRole("link", { name: "Abrir Clase 5" })).toBeNull())
    expect(errores()).toEqual([])
  })

  it("hermano de T-01: al cerrar el diálogo cuando su fila ya salió de la lista, el foco va a la fila que quedó, nunca a <body>", async () => {
    servidor.archivadas = [archivada(5), archivada(6)]
    manejador = ({ url }) => {
      if (!url.pathname.endsWith("/conteo-de-borrado")) return undefined
      servidor.archivadas = [archivada(6)]
      return errorJson(403, "SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.")
    }
    montar("/admin/clases?estado=archivadas")
    const dialogo = await abrirElBorrado("Clase 5")
    await within(dialogo).findByText(
      "No pudimos contar lo que se borraría. Cierra y vuelve a intentarlo.",
    )
    await waitFor(() =>
      expect(screen.queryByRole("link", { name: "Abrir Clase 5", hidden: true })).toBeNull(),
    )
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Borrar definitivamente Clase 6" })).toHaveFocus(),
    )
  })

  it("matriz de 01c: «Sí, borrar definitivamente» con 409 CLASE_NO_ARCHIVADA muestra el mensaje en el diálogo y no renueva las listas", async () => {
    servidor.archivadas = [archivada(5)]
    manejador = ({ metodo }) =>
      metodo === "DELETE"
        ? errorJson(409, "CLASE_NO_ARCHIVADA", "Esta clase no está archivada.")
        : undefined
    montar("/admin/clases?estado=archivadas")
    const dialogo = await abrirElBorrado("Clase 5")
    enfocarYPulsar(
      await within(dialogo).findByRole("button", { name: "Sí, borrar definitivamente" }),
    )
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent(
      "Esta clase no está archivada.",
    )
    await asentado()
    expect(pedidas("GET", deLaLista("archivadas"))).toHaveLength(1)
    expect(errores()).toEqual([])
  })
})

// Corrección de la ronda 1 (M-02, DESIGN.md §7.14): cuando la fila sale de la lista, el foco va al mismo
// control de la siguiente, de la anterior si era la última, o al `h1` si la lista queda vacía. Por los
// dos caminos de T-01 (el conteo y el DELETE con la clase que otra pestaña ya borró), por «Cancelar» y
// por Escape, con una y con varias páginas, al reconectar, y al borrar, archivar y restaurar con éxito.
const LUGARES = [
  ["la primera", 5, "Clase 6"],
  ["la de en medio", 6, "Clase 7"],
  ["la última", 7, "Clase 6"],
] as const

const CIERRES = [
  ["el conteo responde 403 y se cierra con «Cancelar»", "conteo", "cancelar"],
  ["el conteo responde 403 y se cierra con Escape", "conteo", "escape"],
  ["el DELETE responde 403 y se cierra con «Cancelar»", "delete", "cancelar"],
] as const

const CASOS_M02 = LUGARES.flatMap(([lugar, n, vecina]) =>
  CIERRES.map(([cierre, camino, como]) => [lugar, cierre, n, vecina, camino, como] as const),
)

const yaNoExiste = (n: number) => {
  servidor.archivadas = servidor.archivadas.filter((c) => c.id !== idClase(n))
  return errorJson(403, "SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.")
}

const cerrarElDialogo = async (dialogo: HTMLElement, como: "cancelar" | "escape") => {
  if (como === "escape") fireEvent.keyDown(dialogo, { key: "Escape" })
  if (como === "cancelar")
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
}

describe("M-02: el foco cuando la fila del diálogo ya salió de la lista", () => {
  it.each(CASOS_M02)(
    "M-02: con %s de tres filas, %s: el foco va al «Borrar definitivamente» de la vecina",
    async (_lugar, _cierre, n, vecina, camino, como) => {
      servidor.archivadas = [archivada(5), archivada(6), archivada(7)]
      manejador = ({ metodo, url }) => {
        if (
          camino === "conteo" &&
          url.pathname === `/api/admin/clases/${idClase(n)}/conteo-de-borrado`
        ) {
          return yaNoExiste(n)
        }
        if (camino === "delete" && metodo === "DELETE") return yaNoExiste(n)
        return undefined
      }
      montar("/admin/clases?estado=archivadas")
      const dialogo = await abrirElBorrado(`Clase ${String(n)}`)
      if (camino === "conteo") {
        await within(dialogo).findByText(
          "No pudimos contar lo que se borraría. Cierra y vuelve a intentarlo.",
        )
      }
      if (camino === "delete") {
        enfocarYPulsar(
          await within(dialogo).findByRole("button", { name: "Sí, borrar definitivamente" }),
        )
        await within(dialogo).findByRole("alert")
      }
      await waitFor(() =>
        expect(
          document.querySelector(`[data-clase-id="${idClase(n)}"]`),
          "Precondición: la lista ya se renovó sin la fila",
        ).toBeNull(),
      )
      await cerrarElDialogo(dialogo, como)
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: `Borrar definitivamente ${vecina}` }),
        ).toHaveFocus(),
      )
    },
  )

  it("M-02: si la fila era la única, el foco va al encabezado «Clases»", async () => {
    servidor.archivadas = [archivada(5)]
    manejador = ({ url }) =>
      url.pathname.endsWith("/conteo-de-borrado") ? yaNoExiste(5) : undefined
    montar("/admin/clases?estado=archivadas")
    const dialogo = await abrirElBorrado("Clase 5")
    await screen.findByText("Aún no hay clases archivadas")
    await cerrarElDialogo(dialogo, "cancelar")
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "Clases" })).toHaveFocus(),
    )
  })

  it("M-02: con dos páginas cargadas, la fila de la segunda página que ya salió deja el foco en su vecina", async () => {
    let quitada = false
    manejador = ({ metodo, url }) => {
      if (url.pathname.endsWith("/conteo-de-borrado") && url.pathname.includes(idClase(7))) {
        quitada = true
        return errorJson(403, "SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.")
      }
      if (metodo !== "GET" || !deLaLista("archivadas")(url)) return undefined
      const pagina2 = quitada ? [archivada(8)] : [archivada(7), archivada(8)]
      if (url.searchParams.get("cursor") === idClase(6)) return respuestaJson(200, pagina(pagina2))
      return respuestaJson(
        200,
        pagina([archivada(5), archivada(6)], idClase(6), {
          siguienteCursorArchivadaEn: archivadaEn(6),
        }),
      )
    }
    montar("/admin/clases?estado=archivadas")
    fireEvent.click(await screen.findByRole("button", { name: "Cargar más clases" }))
    const dialogo = await abrirElBorrado("Clase 7")
    await within(dialogo).findByText(
      "No pudimos contar lo que se borraría. Cierra y vuelve a intentarlo.",
    )
    await waitFor(() =>
      expect(document.querySelector(`[data-clase-id="${idClase(7)}"]`)).toBeNull(),
    )
    await cerrarElDialogo(dialogo, "cancelar")
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Borrar definitivamente Clase 8" })).toHaveFocus(),
    )
  })

  it("M-02: al reconectar, si la fila con el foco ya no está en la lista renovada, el foco va al mismo control de la vecina", async () => {
    servidor.archivadas = [archivada(5), archivada(6), archivada(7)]
    montar("/admin/clases?estado=archivadas")
    const restaurar = await screen.findByRole("button", { name: "Restaurar Clase 6" })
    act(() => restaurar.focus())
    servidor.archivadas = [archivada(5), archivada(7)]
    try {
      act(() => onlineManager.setOnline(false))
      act(() => onlineManager.setOnline(true))
      await waitFor(() => expect(screen.queryByRole("link", { name: "Abrir Clase 6" })).toBeNull())
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Restaurar Clase 7" })).toHaveFocus(),
      )
    } finally {
      act(() => onlineManager.setOnline(true))
    }
  })

  it.each([
    ["borrar con éxito", "/admin/clases?estado=archivadas", "Borrar definitivamente"],
    ["restaurar con éxito", "/admin/clases?estado=archivadas", "Restaurar"],
    ["archivar con éxito", "/admin/clases", "Archivar"],
  ] as const)(
    "M-02: %s la fila de en medio lleva el foco al mismo control de la siguiente",
    async (accion, entrada, control) => {
      servidor.activas = [clase(5), clase(6), clase(7)]
      servidor.archivadas = [archivada(5), archivada(6), archivada(7)]
      montar(entrada)
      if (accion === "borrar con éxito") {
        const dialogo = await abrirElBorrado("Clase 6")
        enfocarYPulsar(
          await within(dialogo).findByRole("button", { name: "Sí, borrar definitivamente" }),
        )
      }
      if (accion === "restaurar con éxito") {
        enfocarYPulsar(await screen.findByRole("button", { name: "Restaurar Clase 6" }))
      }
      if (accion === "archivar con éxito") {
        fireEvent.click(await screen.findByRole("button", { name: "Archivar Clase 6" }))
        enfocarYPulsar(await screen.findByRole("button", { name: "Sí, archivar Clase 6" }))
      }
      await waitFor(() => expect(screen.queryByRole("link", { name: "Abrir Clase 6" })).toBeNull())
      await waitFor(() =>
        expect(screen.getByRole("button", { name: `${control} Clase 7` })).toHaveFocus(),
      )
    },
  )
})

// Corrección de la ronda 2 (T-04): el diálogo muestra un solo mensaje, el del último envío de la persona.
// Antes de enviar, manda el conteo; desde que se pulsa «Sí, borrar definitivamente», manda el borrado.
// Los órdenes de llegada: el conteo que se vuelve a pedir al reconectar falla antes o después de que el
// DELETE responda, con cada respuesta del DELETE.
const reconectar = () => {
  act(() => onlineManager.setOnline(false))
  act(() => onlineManager.setOnline(true))
}
const conteosPedidos = () => pedidas("GET", (u) => u.pathname.endsWith("/conteo-de-borrado")).length

describe("T-04: qué mensaje muestra el diálogo de borrado (un solo mensaje, el del último envío)", () => {
  afterEach(() => {
    act(() => onlineManager.setOnline(true))
  })

  it.each([
    ["500", () => errorJson(500, "ERROR_INTERNO", "Falló."), "Algo salió mal. Inténtalo de nuevo."],
    [
      "409 CLASE_NO_ARCHIVADA",
      () => errorJson(409, "CLASE_NO_ARCHIVADA", "Esta clase no está archivada."),
      "Esta clase no está archivada.",
    ],
    [
      "403 SIN_ACCESO_A_LA_CLASE",
      () => errorJson(403, "SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase."),
      "No tienes acceso a esta clase.",
    ],
  ] as const)(
    "T-04: el DELETE responde %s y después el conteo que se vuelve a pedir al reconectar falla: un solo mensaje, el del borrado, con el conteo confirmado y el botón, y el foco en el botón",
    async (_caso, respuesta, texto) => {
      servidor.archivadas = [archivada(5), archivada(6)]
      montar("/admin/clases?estado=archivadas")
      const dialogo = await abrirElBorrado("Clase 5")
      const si = await within(dialogo).findByRole("button", { name: "Sí, borrar definitivamente" })
      manejador = ({ metodo, url }) => {
        if (metodo === "DELETE") return respuesta()
        if (url.pathname.endsWith("/conteo-de-borrado"))
          return errorJson(500, "ERROR_INTERNO", "Falló.")
        return undefined
      }
      enfocarYPulsar(si)
      expect(await within(dialogo).findByRole("alert")).toHaveTextContent(texto)
      await waitFor(() => expect(si).not.toHaveAttribute("aria-busy"))
      const antes = conteosPedidos()
      reconectar()
      await waitFor(() => expect(conteosPedidos()).toBeGreaterThan(antes))
      await sinConsultasEnVuelo()
      expect(within(dialogo).getAllByRole("alert")).toHaveLength(1)
      expect(within(dialogo).getByRole("alert")).toHaveTextContent(texto)
      expect(
        within(dialogo).queryByText(
          "No pudimos contar lo que se borraría. Cierra y vuelve a intentarlo.",
        ),
      ).toBeNull()
      expect(
        within(dialogo).getByText(/^Se perderán las inscripciones de 32 alumnos/),
      ).toBeInTheDocument()
      expect(
        within(dialogo).getByRole("button", { name: "Sí, borrar definitivamente" }),
      ).toHaveFocus()
      expect(errores()).toEqual([])
    },
  )

  it.each([
    [
      "409 CLASE_NO_ARCHIVADA",
      () => Promise.resolve(errorJson(409, "CLASE_NO_ARCHIVADA", "Esta clase no está archivada.")),
      "Esta clase no está archivada.",
    ],
    ["sin conexión", () => Promise.reject(new TypeError("Failed to fetch")), null],
  ] as const)(
    "T-04: el conteo que se vuelve a pedir al reconectar falla con el DELETE en vuelo y después el DELETE responde %s: un solo mensaje, el del borrado, y el foco en el botón",
    async (_caso, respuesta, texto) => {
      servidor.archivadas = [archivada(5), archivada(6)]
      montar("/admin/clases?estado=archivadas")
      const dialogo = await abrirElBorrado("Clase 5")
      const si = await within(dialogo).findByRole("button", { name: "Sí, borrar definitivamente" })
      const borrado = retener()
      manejador = ({ metodo, url }) => {
        if (metodo === "DELETE") return borrado.promesa.then(respuesta)
        if (url.pathname.endsWith("/conteo-de-borrado"))
          return errorJson(500, "ERROR_INTERNO", "Falló.")
        return undefined
      }
      enfocarYPulsar(si)
      await waitFor(() => expect(si).toHaveAttribute("aria-busy", "true"))
      const antes = conteosPedidos()
      reconectar()
      await waitFor(() => expect(conteosPedidos()).toBeGreaterThan(antes))
      await sinConsultasEnVuelo()
      expect(
        within(dialogo).queryAllByRole("alert"),
        "con el borrado en vuelo, ningún mensaje",
      ).toHaveLength(0)
      borrado.soltar(new Response(null, { status: 204 }))
      await asentado()
      const alertas = within(dialogo).getAllByRole("alert")
      expect(alertas).toHaveLength(1)
      if (texto !== null) expect(alertas[0]).toHaveTextContent(texto)
      expect(
        within(dialogo).queryByText(
          "No pudimos contar lo que se borraría. Cierra y vuelve a intentarlo.",
        ),
      ).toBeNull()
      expect(
        within(dialogo).getByRole("button", { name: "Sí, borrar definitivamente" }),
      ).toHaveFocus()
      expect(errores()).toEqual([])
    },
  )

  it("T-04: el conteo que se vuelve a pedir falla con el DELETE en vuelo y después el DELETE responde 204: sin mensajes, el diálogo se cierra, un aviso y el foco en la fila vecina", async () => {
    servidor.archivadas = [archivada(5), archivada(6)]
    montar("/admin/clases?estado=archivadas")
    const dialogo = await abrirElBorrado("Clase 5")
    const si = await within(dialogo).findByRole("button", { name: "Sí, borrar definitivamente" })
    const borrado = retener()
    manejador = ({ metodo, url }) => {
      if (metodo === "DELETE") return borrado.promesa
      if (url.pathname.endsWith("/conteo-de-borrado"))
        return errorJson(500, "ERROR_INTERNO", "Falló.")
      return undefined
    }
    enfocarYPulsar(si)
    await waitFor(() => expect(si).toHaveAttribute("aria-busy", "true"))
    const antes = conteosPedidos()
    reconectar()
    await waitFor(() => expect(conteosPedidos()).toBeGreaterThan(antes))
    await sinConsultasEnVuelo()
    expect(within(dialogo).queryAllByRole("alert")).toHaveLength(0)
    servidor.archivadas = [archivada(6)]
    borrado.soltar(new Response(null, { status: 204 }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Borrar definitivamente Clase 6" })).toHaveFocus(),
    )
    expect(exitos()).toEqual(["Clase borrada"])
    expect(errores()).toEqual([])
  })

  it("T-04: antes de enviar, el conteo que se vuelve a pedir y falla sustituye al conteo y al botón; si después responde, vuelven el conteo y el botón, sin mensaje", async () => {
    servidor.archivadas = [archivada(5)]
    montar("/admin/clases?estado=archivadas")
    const dialogo = await abrirElBorrado("Clase 5")
    await within(dialogo).findByRole("button", { name: "Sí, borrar definitivamente" })
    manejador = ({ url }) =>
      url.pathname.endsWith("/conteo-de-borrado")
        ? errorJson(500, "ERROR_INTERNO", "Falló.")
        : undefined
    reconectar()
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent(
      "No pudimos contar lo que se borraría. Cierra y vuelve a intentarlo.",
    )
    expect(within(dialogo).queryByRole("button", { name: "Sí, borrar definitivamente" })).toBeNull()
    manejador = () => undefined
    reconectar()
    expect(
      await within(dialogo).findByRole("button", { name: "Sí, borrar definitivamente" }),
    ).toBeInTheDocument()
    expect(within(dialogo).queryAllByRole("alert")).toHaveLength(0)
  })

  it("T-04: tras un error del borrado, cerrar y volver a abrir empieza sin mensajes, con el conteo nuevo y el botón disponible", async () => {
    servidor.archivadas = [archivada(5)]
    manejador = ({ metodo }) =>
      metodo === "DELETE" ? errorJson(500, "ERROR_INTERNO", "Falló.") : undefined
    montar("/admin/clases?estado=archivadas")
    const dialogo = await abrirElBorrado("Clase 5")
    enfocarYPulsar(
      await within(dialogo).findByRole("button", { name: "Sí, borrar definitivamente" }),
    )
    await within(dialogo).findByRole("alert")
    const antes = conteosPedidos()
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    const otra = await abrirElBorrado("Clase 5")
    const boton = await within(otra).findByRole("button", { name: "Sí, borrar definitivamente" })
    expect(boton).not.toHaveAttribute("aria-busy")
    expect(within(otra).queryAllByRole("alert")).toHaveLength(0)
    expect(conteosPedidos()).toBe(antes + 1)
  })
})

// Estados vecinos antes de la ronda 3 (verificación de la corrección de la ronda 2): el conteo confirmado
// se congela, un error con que apiClient redirige no se pinta, y la clase que ya no existe gana con el
// borrado ya respondido. Más los órdenes que pidió el manager.
const FRASE_CONTEO = "No pudimos contar lo que se borraría. Cierra y vuelve a intentarlo."
const SIN_ACCESO_TEXTO = "No tienes acceso a esta clase."

const abrirConConteo = async () => {
  servidor.archivadas = [archivada(5), archivada(6)]
  montar("/admin/clases?estado=archivadas")
  const dialogo = await abrirElBorrado("Clase 5")
  const si = await within(dialogo).findByRole("button", { name: "Sí, borrar definitivamente" })
  return { dialogo, si }
}

describe("estados vecinos antes de la ronda 3: el diálogo de borrado", () => {
  afterEach(() => {
    act(() => onlineManager.setOnline(true))
  })

  it("vecino 1: tras un error del DELETE, el conteo que se vuelve a pedir responde otras cifras: se sigue viendo el conteo confirmado, con un solo mensaje, también durante el segundo intento", async () => {
    const { dialogo, si } = await abrirConConteo()
    const segundo = retener()
    let deletes = 0
    manejador = ({ metodo, url }) => {
      if (metodo === "DELETE") {
        deletes += 1
        return deletes === 1 ? errorJson(500, "ERROR_INTERNO", "Falló.") : segundo.promesa
      }
      if (url.pathname.endsWith("/conteo-de-borrado")) {
        return respuestaJson(200, {
          alumnos: 1,
          actividades: 1,
          entregas: 1,
          calificaciones: 1,
          archivos: 1,
        })
      }
      return undefined
    }
    enfocarYPulsar(si)
    await within(dialogo).findByRole("alert")
    const antes = conteosPedidos()
    reconectar()
    await waitFor(() => expect(conteosPedidos()).toBeGreaterThan(antes))
    await sinConsultasEnVuelo()
    expect(
      within(dialogo).getByText(/^Se perderán las inscripciones de 32 alumnos/),
    ).toBeInTheDocument()
    expect(within(dialogo).queryByText(/de 1 alumno,/)).toBeNull()
    expect(within(dialogo).getAllByRole("alert")).toHaveLength(1)
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, borrar definitivamente" }))
    await waitFor(() => expect(pedidas("DELETE", () => true)).toHaveLength(2))
    expect(within(dialogo).queryAllByRole("alert"), "en vuelo, sin el mensaje viejo").toHaveLength(
      0,
    )
    expect(
      within(dialogo).getByText(/^Se perderán las inscripciones de 32 alumnos/),
    ).toBeInTheDocument()
    segundo.soltar(errorJson(409, "CLASE_CON_COPIAS_EN_CURSO", COPIAS_EN_CURSO))
    await waitFor(() =>
      expect(within(dialogo).getByRole("alert")).toHaveTextContent(COPIAS_EN_CURSO),
    )
    expect(within(dialogo).getAllByRole("alert")).toHaveLength(1)
  })

  it.each([
    [
      "403 ACCESO_RESTRINGIDO",
      () => errorJson(403, "ACCESO_RESTRINGIDO", "Tu acceso está restringido."),
    ],
    [
      "403 CAMBIO_DE_CONTRASENA_REQUERIDO",
      () => errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO", "Cambia tu contraseña."),
    ],
    ["401 sin refresco (NO_AUTENTICADO)", () => errorJson(401, "NO_AUTENTICADO", "Inicia sesión.")],
  ] as const)(
    "vecino 2: el DELETE responde %s, con que apiClient redirige: el diálogo no pinta ni anuncia ningún mensaje y no hay aviso",
    async (_caso, respuesta) => {
      const { dialogo, si } = await abrirConConteo()
      manejador = ({ metodo }) => (metodo === "DELETE" ? respuesta() : undefined)
      enfocarYPulsar(si)
      await waitFor(() => expect(pedidas("DELETE", () => true)).toHaveLength(1))
      await waitFor(() => expect(si).not.toHaveAttribute("aria-busy"))
      await asentado()
      expect(within(dialogo).queryAllByRole("alert")).toHaveLength(0)
      expect(errores()).toEqual([])
    },
  )

  it("vecino 2: el conteo que se vuelve a pedir responde con un código con que apiClient redirige: el diálogo no pinta ni anuncia ningún mensaje", async () => {
    const { dialogo } = await abrirConConteo()
    manejador = ({ url }) =>
      url.pathname.endsWith("/conteo-de-borrado")
        ? errorJson(403, "ACCESO_RESTRINGIDO", "Tu acceso está restringido.")
        : undefined
    const antes = conteosPedidos()
    reconectar()
    await waitFor(() => expect(conteosPedidos()).toBeGreaterThan(antes))
    await sinConsultasEnVuelo()
    expect(within(dialogo).queryAllByRole("alert")).toHaveLength(0)
    expect(errores()).toEqual([])
  })

  it("vecino 3: tras un error del DELETE, el conteo responde 403 (otra pestaña la borró): un solo mensaje, la frase del conteo, sin «Sí, borrar definitivamente», el foco en «Cancelar», la fila sale y al cerrar el foco va a la vecina", async () => {
    const { dialogo, si } = await abrirConConteo()
    manejador = ({ metodo, url }) => {
      if (metodo === "DELETE") return errorJson(500, "ERROR_INTERNO", "Falló.")
      if (url.pathname.endsWith("/conteo-de-borrado")) {
        servidor.archivadas = [archivada(6)]
        return errorJson(403, "SIN_ACCESO_A_LA_CLASE", SIN_ACCESO_TEXTO)
      }
      return undefined
    }
    enfocarYPulsar(si)
    await within(dialogo).findByRole("alert")
    await waitFor(() => expect(si).toHaveFocus())
    reconectar()
    await waitFor(() => expect(within(dialogo).getByRole("alert")).toHaveTextContent(FRASE_CONTEO))
    expect(within(dialogo).getAllByRole("alert")).toHaveLength(1)
    expect(within(dialogo).queryByRole("button", { name: "Sí, borrar definitivamente" })).toBeNull()
    await waitFor(() =>
      expect(within(dialogo).getByRole("button", { name: "Cancelar" })).toHaveFocus(),
    )
    await waitFor(() =>
      expect(document.querySelector(`[data-clase-id="${idClase(5)}"]`)).toBeNull(),
    )
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Borrar definitivamente Clase 6" })).toHaveFocus(),
    )
  })

  it("vecino: 409 CLASE_CON_COPIAS_EN_CURSO y después una reconexión cuyo conteo falla: un solo mensaje, el del borrado, con el conteo confirmado y el botón", async () => {
    const { dialogo, si } = await abrirConConteo()
    manejador = ({ metodo, url }) => {
      if (metodo === "DELETE") return errorJson(409, "CLASE_CON_COPIAS_EN_CURSO", COPIAS_EN_CURSO)
      if (url.pathname.endsWith("/conteo-de-borrado"))
        return errorJson(500, "ERROR_INTERNO", "Falló.")
      return undefined
    }
    enfocarYPulsar(si)
    await within(dialogo).findByText(COPIAS_EN_CURSO)
    const antes = conteosPedidos()
    reconectar()
    await waitFor(() => expect(conteosPedidos()).toBeGreaterThan(antes))
    await sinConsultasEnVuelo()
    expect(within(dialogo).getAllByRole("alert")).toHaveLength(1)
    expect(within(dialogo).getByRole("alert")).toHaveTextContent(COPIAS_EN_CURSO)
    expect(
      within(dialogo).getByRole("button", { name: "Sí, borrar definitivamente" }),
    ).toHaveFocus()
  })

  it("vecino: una reconexión con el conteo sano y después el DELETE responde 403: un solo mensaje, el del borrado; otra reconexión cuyo conteo responde 403 lo sustituye por la frase, sin botón", async () => {
    const { dialogo, si } = await abrirConConteo()
    const antes = conteosPedidos()
    reconectar()
    await waitFor(() => expect(conteosPedidos()).toBeGreaterThan(antes))
    manejador = ({ metodo, url }) => {
      if (metodo === "DELETE") {
        servidor.archivadas = [archivada(6)]
        return errorJson(403, "SIN_ACCESO_A_LA_CLASE", SIN_ACCESO_TEXTO)
      }
      if (url.pathname.endsWith("/conteo-de-borrado")) {
        return errorJson(403, "SIN_ACCESO_A_LA_CLASE", SIN_ACCESO_TEXTO)
      }
      return undefined
    }
    enfocarYPulsar(within(dialogo).getByRole("button", { name: "Sí, borrar definitivamente" }))
    expect(si.isConnected).toBe(true)
    await waitFor(() =>
      expect(within(dialogo).getByRole("alert")).toHaveTextContent(SIN_ACCESO_TEXTO),
    )
    expect(within(dialogo).getAllByRole("alert")).toHaveLength(1)
    reconectar()
    await waitFor(() => expect(within(dialogo).getByRole("alert")).toHaveTextContent(FRASE_CONTEO))
    expect(within(dialogo).getAllByRole("alert")).toHaveLength(1)
    expect(within(dialogo).queryByRole("button", { name: "Sí, borrar definitivamente" })).toBeNull()
    expect(dialogo.contains(document.activeElement)).toBe(true)
  })

  it("vecino: dos reconexiones, una con el DELETE en vuelo y otra después de su error, con el conteo fallando las dos veces: un solo mensaje, el del borrado", async () => {
    const { dialogo, si } = await abrirConConteo()
    const borrado = retener()
    manejador = ({ metodo, url }) => {
      if (metodo === "DELETE") return borrado.promesa
      if (url.pathname.endsWith("/conteo-de-borrado"))
        return errorJson(500, "ERROR_INTERNO", "Falló.")
      return undefined
    }
    enfocarYPulsar(si)
    await waitFor(() => expect(si).toHaveAttribute("aria-busy", "true"))
    let antes = conteosPedidos()
    reconectar()
    await waitFor(() => expect(conteosPedidos()).toBeGreaterThan(antes))
    await sinConsultasEnVuelo()
    expect(within(dialogo).queryAllByRole("alert")).toHaveLength(0)
    borrado.soltar(errorJson(500, "ERROR_INTERNO", "Falló."))
    await within(dialogo).findByRole("alert")
    antes = conteosPedidos()
    reconectar()
    await waitFor(() => expect(conteosPedidos()).toBeGreaterThan(antes))
    await sinConsultasEnVuelo()
    expect(within(dialogo).getAllByRole("alert")).toHaveLength(1)
    expect(within(dialogo).getByRole("alert")).toHaveTextContent(
      "Algo salió mal. Inténtalo de nuevo.",
    )
    expect(
      within(dialogo).getByRole("button", { name: "Sí, borrar definitivamente" }),
    ).toHaveFocus()
  })

  // M-03: dos casos deterministas en lugar de uno con un tiempo fijo. El estado del borrado se lee del
  // botón (aria-busy) y de la aparición del mensaje, nunca de una espera.
  it("vecino: Escape con el DELETE en vuelo no cierra el diálogo: el botón sigue en espera y el foco dentro; al responder con error, un solo mensaje y el botón sale de la espera", async () => {
    const { dialogo, si } = await abrirConConteo()
    const borrado = retener()
    manejador = ({ metodo }) => (metodo === "DELETE" ? borrado.promesa : undefined)
    enfocarYPulsar(si)
    await waitFor(() => expect(si).toHaveAttribute("aria-busy", "true"))
    fireEvent.keyDown(dialogo, { key: "Escape" })
    expect(screen.getByRole("dialog")).toBe(dialogo)
    expect(si).toHaveAttribute("aria-busy", "true")
    expect(dialogo.contains(document.activeElement)).toBe(true)
    borrado.soltar(errorJson(500, "ERROR_INTERNO", "Falló."))
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent(
      "Algo salió mal. Inténtalo de nuevo.",
    )
    await waitFor(() => expect(si).not.toHaveAttribute("aria-busy"))
    expect(within(dialogo).getAllByRole("alert")).toHaveLength(1)
    expect(screen.getByRole("dialog")).toBe(dialogo)
  })

  it("vecino: Escape en cuanto el DELETE respondió con error: el diálogo se cierra limpio, sin aviso; el foco vuelve a «Borrar definitivamente» y al volver a abrir no queda ningún mensaje", async () => {
    const { dialogo, si } = await abrirConConteo()
    const borrado = retener()
    manejador = ({ metodo }) => (metodo === "DELETE" ? borrado.promesa : undefined)
    enfocarYPulsar(si)
    await waitFor(() => expect(si).toHaveAttribute("aria-busy", "true"))
    borrado.soltar(errorJson(500, "ERROR_INTERNO", "Falló."))
    await within(dialogo).findByRole("alert")
    await waitFor(() => expect(si).not.toHaveAttribute("aria-busy"))
    fireEvent.keyDown(dialogo, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await asentado()
    expect(errores()).toEqual([])
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Borrar definitivamente Clase 5" })).toHaveFocus(),
    )
    const otra = await abrirElBorrado("Clase 5")
    expect(
      await within(otra).findByRole("button", { name: "Sí, borrar definitivamente" }),
    ).not.toHaveAttribute("aria-busy")
    expect(within(otra).queryAllByRole("alert")).toHaveLength(0)
  })
})
