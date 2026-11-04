// CLASES-03d (§D-8, §D-14): «Recursos» con el router real (`rutas`): la estructura por bloque, las
// peticiones y el limitador, la fila, los permisos, borrar, mover (y la guarda de redirección), los
// comentarios y «Nuevo recurso» (CL3-D01 a CL3-D10, D15, D17, D22, D25 y D28 en crear).
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

type Rol = "estudiante" | "maestro" | "admin"
type Bloque = "aprendizaje" | "docente"

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const API = `/api/clases/${CLASE_ID}`
const TEMA_1 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0001"
const TEMA_2 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0002"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const FIRMA_MAESTRO = { ...MAESTRO, administracion: false }
const FIRMA_ADMIN = {
  id: "1a1b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01",
  nombre: "Dirección",
  administracion: true,
}
const BASES: Record<Rol, string> = {
  estudiante: "/estudiante/clases",
  maestro: "/maestro/clases",
  admin: "/admin/clases",
}
const ESPERA = { timeout: 5000 }
const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const CREADO_EN = "2026-10-01T15:30:00.000Z"

const idRecurso = (n: number) => `6a6b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const idArchivo = (n: number) => `9a9b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const idComentario = (n: number) => `7a7b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorJson = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })
interface AdjuntoDoble {
  id: string
  nombre: string
  tipo: string
  tamano: number
  vistaPrevia: null
}

interface RecursoDoble {
  id: string
  titulo: string
  texto: string
  autor: typeof FIRMA_MAESTRO
  creadoEn: string
  bloque: Bloque
  tema: string | null
  adjuntos: AdjuntoDoble[]
  comentarios: number
  puedeEditar: boolean
  puedeBorrar: boolean
  puedeMover: boolean
  version: number
}

const recurso = (
  n: number,
  bloqueDelRecurso: Bloque,
  tema: string | null,
  extra: Partial<RecursoDoble> = {},
): RecursoDoble => ({
  id: idRecurso(n),
  titulo: `Recurso ${String(n)}`,
  texto: "",
  autor: bloqueDelRecurso === "aprendizaje" ? FIRMA_ADMIN : FIRMA_MAESTRO,
  creadoEn: CREADO_EN,
  bloque: bloqueDelRecurso,
  tema,
  adjuntos: [],
  comentarios: 0,
  puedeEditar: true,
  puedeBorrar: true,
  puedeMover: true,
  version: 0,
  ...extra,
})

const adjunto = (n: number, nombre: string): AdjuntoDoble => ({
  id: idArchivo(n),
  nombre,
  tipo: "application/pdf",
  tamano: 2048,
  vistaPrevia: null,
})

interface ComentarioDoble {
  id: string
  texto: string
  autor: typeof FIRMA_MAESTRO
  creadoEn: string
  propio: boolean
  puedeBorrar: boolean
}

const comentario = (n: number): ComentarioDoble => ({
  id: idComentario(n),
  texto: `Comentario ${String(n)}`,
  autor: FIRMA_MAESTRO,
  creadoEn: CREADO_EN,
  propio: false,
  puedeBorrar: false,
})

interface Llamada {
  metodo: string
  url: URL
  cuerpo: unknown
}

interface Estado {
  temas: { id: string; nombre: string }[]
  recursos: RecursoDoble[]
  comentarios: Record<string, ComentarioDoble[]>
  // Respuesta propia para una petición (null: la de siempre).
  falla: (llamada: Llamada) => Response | Promise<Response> | null
  inesperadas: string[]
}

// Paginación real (cursor = id de la última fila); un cursor que ya no está responde 400 VALIDACION
// "cursor: no es válido", como el adaptador.
const paginar = <T extends { id: string }>(filas: readonly T[], url: URL) => {
  const limite = Number(url.searchParams.get("limite") ?? "20")
  const cursor = url.searchParams.get("cursor")
  let inicio = 0
  if (cursor !== null) {
    const indice = filas.findIndex((fila) => fila.id === cursor)
    if (indice === -1) return null
    inicio = indice + 1
  }
  const pagina = filas.slice(inicio, inicio + limite)
  const siguiente = filas.length > inicio + limite ? (pagina.at(-1)?.id ?? null) : null
  return { pagina, siguiente }
}

const cursorInvalido = () => errorJson(400, "VALIDACION", "cursor: no es válido")

const deLaLista = (r: RecursoDoble) => ({
  id: r.id,
  titulo: r.titulo,
  texto: r.texto,
  autor: r.autor,
  creadoEn: r.creadoEn,
  bloque: r.bloque,
  adjuntos: r.adjuntos,
  comentarios: r.comentarios,
  puedeEditar: r.puedeEditar,
  puedeBorrar: r.puedeBorrar,
  puedeMover: r.puedeMover,
})

// Servidor doble de "Recursos" (y de lo que pide el marco de la clase): temas por sección, listas por
// bloque y tema con cursor, el detalle y su edición con versión, publicar, borrar, mover, comentarios y
// archivos. `estado.falla` responde por su cuenta la petición que quiera la prueba.
const crearServidor = (rol: Rol) => {
  const estado: Estado = {
    temas: [
      { id: TEMA_1, nombre: "Unidad 1" },
      { id: TEMA_2, nombre: "Unidad 2" },
    ],
    recursos: [
      recurso(1, "aprendizaje", null, {
        puedeEditar: false,
        puedeBorrar: false,
        puedeMover: false,
      }),
      recurso(2, "docente", TEMA_1),
      recurso(3, "docente", TEMA_1),
    ],
    comentarios: {},
    falla: () => null,
    inesperadas: [],
  }
  let siguienteId = 100
  const nombreDelTema = (id: string) => estado.temas.find((tema) => tema.id === id)?.nombre ?? ""
  const detalle = (r: RecursoDoble) => ({
    recurso: {
      ...deLaLista(r),
      version: r.version,
      tema: r.tema === null ? null : { id: r.tema, nombre: nombreDelTema(r.tema) },
    },
  })
  const fetchMock = vi.fn<typeof fetch>(async (entrada, init) => {
    const url = new URL(String(entrada), "http://x")
    const metodo = init?.method ?? "GET"
    const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined
    if (url.pathname === "/api/auth/refrescar") {
      return respuestaJson(200, { tokenAcceso: "restaurado" })
    }
    if (url.pathname === "/api/me") {
      return respuestaJson(200, {
        id: "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
        nombre: "Ana López",
        email: "ana@ejemplo.mx",
        rol,
        debeCambiarContrasena: false,
        accesoRestringido: false,
      })
    }
    const propia = estado.falla({ metodo, url, cuerpo })
    if (propia !== null) return propia
    if (url.pathname === "/api/clases/inscritas" || url.pathname === "/api/clases/impartidas") {
      return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
    }
    if (url.pathname === API) {
      return respuestaJson(200, {
        clase: {
          id: CLASE_ID,
          nombre: "Historia",
          descripcion: null,
          maestro: MAESTRO,
          maestros: [MAESTRO],
        },
      })
    }
    if (url.pathname === `${API}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
    if (url.pathname === `${API}/publicaciones` && metodo === "GET") {
      return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
    }
    if (url.pathname === `${API}/temas` && metodo === "GET") {
      const seccion = url.searchParams.get("seccion")
      const cuenta = (tema: string | null) =>
        estado.recursos.filter((r) => r.tema === tema && (seccion === null || r.bloque === seccion))
          .length
      const ninguno = seccion === "actividades"
      return respuestaJson(200, {
        temas: estado.temas.map((tema, orden) => ({
          ...tema,
          orden,
          elementos: ninguno ? 0 : cuenta(tema.id),
        })),
        sinTema: ninguno ? 0 : cuenta(null),
      })
    }
    if (url.pathname === `${API}/recursos` && metodo === "GET") {
      const tema = url.searchParams.get("tema")
      const filas = estado.recursos.filter(
        (r) =>
          r.bloque === url.searchParams.get("bloque") &&
          (tema === "sin-tema" ? r.tema === null : r.tema === tema),
      )
      const r = paginar(filas, url)
      if (r === null) return cursorInvalido()
      return respuestaJson(200, {
        recursos: r.pagina.map(deLaLista),
        siguienteCursor: r.siguiente,
      })
    }
    const delRecurso = /^\/api\/clases\/[^/]+\/recursos\/([^/]+)$/.exec(url.pathname)
    if (delRecurso !== null) {
      const encontrado = estado.recursos.find(({ id }) => id === delRecurso[1])
      if (encontrado === undefined) {
        return errorJson(404, "RECURSO_NO_ENCONTRADO", "Ese recurso ya no existe.")
      }
      if (metodo === "GET") return respuestaJson(200, detalle(encontrado))
      const datos = cuerpo as {
        titulo: string
        texto: string
        temaId: string | null
        archivoIds: string[]
        version: number
      }
      if (datos.version !== encontrado.version) {
        return errorJson(
          409,
          "RECURSO_MODIFICADO",
          "Otra persona guardó este recurso mientras lo editabas. Te mostramos la versión actual.",
        )
      }
      encontrado.titulo = datos.titulo
      encontrado.texto = datos.texto
      encontrado.tema = datos.temaId
      encontrado.adjuntos = encontrado.adjuntos.filter(({ id }) => datos.archivoIds.includes(id))
      encontrado.version += 1
      return respuestaJson(200, detalle(encontrado))
    }
    if (url.pathname === `${API}/publicaciones` && metodo === "POST") {
      const datos = cuerpo as { titulo: string; texto?: string; temaId?: string | null }
      siguienteId += 1
      const nuevo = recurso(
        siguienteId,
        rol === "admin" ? "aprendizaje" : "docente",
        datos.temaId ?? null,
        { titulo: datos.titulo, texto: datos.texto ?? "" },
      )
      estado.recursos.push(nuevo)
      return respuestaJson(201, {
        publicacion: {
          id: nuevo.id,
          tipo: "material",
          titulo: nuevo.titulo,
          texto: nuevo.texto,
          autor: nuevo.autor,
          creadoEn: CREADO_EN,
          comentarios: 0,
          adjuntos: [],
          puedeBorrar: true,
          tarea: null,
        },
      })
    }
    const dePublicacion =
      /^\/api\/clases\/[^/]+\/publicaciones\/([^/]+)(\/tema|\/comentarios)?$/.exec(url.pathname)
    if (dePublicacion !== null) {
      const id = dePublicacion[1] ?? ""
      const encontrado = estado.recursos.find((r) => r.id === id)
      if (dePublicacion[2] === "/comentarios") {
        const lista = (estado.comentarios[id] ??= [])
        if (metodo === "POST") {
          siguienteId += 1
          const nuevo = { ...comentario(siguienteId), texto: (cuerpo as { texto: string }).texto }
          lista.push(nuevo)
          if (encontrado !== undefined) encontrado.comentarios += 1
          return respuestaJson(201, { comentario: nuevo })
        }
        const r = paginar(lista, url)
        if (r === null) return cursorInvalido()
        return respuestaJson(200, { comentarios: r.pagina, siguienteCursor: r.siguiente })
      }
      if (encontrado === undefined) {
        return errorJson(404, "PUBLICACION_NO_ENCONTRADA", "Esa publicación ya no existe.")
      }
      if (dePublicacion[2] === "/tema") {
        const { temaId } = cuerpo as { temaId: string | null }
        encontrado.tema = temaId
        encontrado.version += 1
        return respuestaJson(200, { publicacionId: id, temaId })
      }
      if (metodo === "DELETE") {
        estado.recursos = estado.recursos.filter((r) => r.id !== id)
        return new Response(null, { status: 204 })
      }
    }
    if (url.pathname === `${API}/archivos` && metodo === "POST") {
      siguienteId += 1
      const { nombre, tipo, tamano } = cuerpo as { nombre: string; tipo: string; tamano: number }
      return respuestaJson(201, {
        archivo: { id: idArchivo(siguienteId), nombre, tipo, tamano },
        subida: {
          url: `https://almacen.ejemplo.mx/subida/${String(siguienteId)}`,
          metodo: "PUT",
          cabeceras: { "Content-Type": tipo },
          expiraEn: "2026-10-02T15:05:00.000Z",
        },
      })
    }
    if (url.hostname === "almacen.ejemplo.mx") return new Response(null, { status: 200 })
    estado.inesperadas.push(`${metodo} ${url.pathname}${url.search}`)
    return errorJson(500, "ERROR_INTERNO", "no esperada")
  })
  vi.stubGlobal("fetch", fetchMock)
  return { estado, fetchMock }
}

type FetchMock = ReturnType<typeof crearServidor>["fetchMock"]

const llamadasDe = (fetchMock: FetchMock, metodo: string, pathname: string) =>
  fetchMock.mock.calls
    .filter(([, init]) => (init?.method ?? "GET") === metodo)
    .map(([entrada, init]) => ({
      url: new URL(String(entrada), "http://x"),
      cuerpo: typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined,
    }))
    .filter(({ url }) => url.pathname === pathname)

const pedidas = (fetchMock: FetchMock, pathname: string) =>
  llamadasDe(fetchMock, "GET", pathname).map(({ url }) => url)

const temasDe = (fetchMock: FetchMock, seccion: string) =>
  pedidas(fetchMock, `${API}/temas`).filter((url) => url.searchParams.get("seccion") === seccion)

const recursosDe = (fetchMock: FetchMock, bloqueBuscado: string, tema: string) =>
  pedidas(fetchMock, `${API}/recursos`).filter(
    (url) =>
      url.searchParams.get("bloque") === bloqueBuscado && url.searchParams.get("tema") === tema,
  )

const montar = async (entradas: string[], cliente?: QueryClient, indice = entradas.length - 1) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: entradas, initialIndex: indice })
  const arbol = <RouterProvider router={router} />
  const vista = render(
    cliente === undefined ? (
      <Providers>{arbol}</Providers>
    ) : (
      <QueryClientProvider client={cliente}>{arbol}</QueryClientProvider>
    ),
  )
  return { router, vista }
}

const clienteDePrueba = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } },
  })

const reposar = () => act(() => new Promise((resolver) => setTimeout(resolver, 150)))

const bloque = (titulo: string) => {
  const encabezado = screen.getByRole("heading", { level: 2, name: titulo })
  const seccion = encabezado.closest("section")
  if (seccion === null) throw new Error(`Precondición: el bloque «${titulo}»`)
  return seccion
}

const seccionDelTema = (contenedor: HTMLElement, nombre: string) => {
  const encabezado = within(contenedor).getByRole("heading", {
    level: 3,
    name: new RegExp(`^${nombre} ·`),
  })
  const seccion = encabezado.closest("section")
  if (seccion === null) throw new Error(`Precondición: la sección «${nombre}»`)
  return seccion
}

const filaDe = (titulo: string) => {
  const fila = screen.getByRole("heading", { level: 4, name: titulo }).closest("li")
  if (fila === null) throw new Error(`Precondición: la fila «${titulo}»`)
  return fila
}

const avisosDeError = () => aviso.error.mock.calls.map((llamada) => String(llamada[0]))

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const RECARGA = "No pudimos actualizar Recursos. Mostramos la última versión que tenemos."
const ID_DEL_AVISO = "recarga-fallida-de-recursos"
const M = "Revisa este valor."

const abrirRecursos = async (rol: Rol, cliente?: QueryClient) => {
  const montaje = await montar([`${BASES[rol]}/${CLASE_ID}/recursos`], cliente)
  await screen.findByRole("heading", { level: 2, name: "Recursos del docente" }, ESPERA)
  return montaje
}

const conSusFilas = async (titulo: string) =>
  screen.findByRole("heading", { level: 4, name: titulo }, ESPERA)

describe("CL3-D01 · estructura de «Recursos»", () => {
  it("CL3-D01: dos bloques en orden con su h2; en cada uno «Sin tema» y los temas con recursos de ese bloque, en su orden; un tema sin recursos del bloque no aparece", async () => {
    const { estado } = crearServidor("maestro")
    estado.recursos.push(recurso(4, "docente", null), recurso(5, "aprendizaje", TEMA_2))
    await abrirRecursos("maestro")
    await conSusFilas("Recurso 4")
    const titulos = screen
      .getAllByRole("heading", { level: 2 })
      .map((encabezado) => encabezado.textContent)
    expect(titulos.indexOf("Recursos de aprendizaje")).toBeLessThan(
      titulos.indexOf("Recursos del docente"),
    )
    expect(titulos.indexOf("Recursos de aprendizaje")).toBeGreaterThanOrEqual(0)
    const temasDelBloque = (titulo: string) =>
      within(bloque(titulo))
        .getAllByRole("heading", { level: 3 })
        .map((encabezado) => encabezado.textContent)
    expect(temasDelBloque("Recursos del docente")).toEqual([
      "Sin tema · 1 recurso",
      "Unidad 1 · 2 recursos",
    ])
    expect(temasDelBloque("Recursos de aprendizaje")).toEqual([
      "Sin tema · 1 recurso",
      "Unidad 2 · 1 recurso",
    ])
    expect(estado.inesperadas).toEqual([])
  })

  it("CL3-D01: un bloque sin recursos dice su vacío, y el error de un bloque no tapa el otro", async () => {
    const { estado } = crearServidor("maestro")
    estado.recursos = estado.recursos.filter((r) => r.bloque === "docente")
    estado.falla = ({ url }) =>
      url.searchParams.get("seccion") === "docente"
        ? errorJson(500, "ERROR_INTERNO", "Falló.")
        : null
    await abrirRecursos("maestro", clienteDePrueba())
    expect(
      await within(bloque("Recursos de aprendizaje")).findByText(
        "Aún no hay recursos de aprendizaje.",
        undefined,
        ESPERA,
      ),
    ).toBeInTheDocument()
    expect(
      await within(bloque("Recursos del docente")).findByRole("alert", undefined, ESPERA),
    ).toHaveTextContent(GENERICO)
    expect(within(bloque("Recursos de aprendizaje")).queryByRole("alert")).toBeNull()
  })

  it("CL3-D01: si los dos bloques fallan su recarga con datos, cada aviso lleva el mismo id (uno visible); montar la vista con los fallos ya ocurridos no avisa", async () => {
    const { estado } = crearServidor("maestro")
    const cliente = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 30_000, refetchOnMount: false },
        mutations: { retry: false },
      },
    })
    const { vista } = await abrirRecursos("maestro", cliente)
    await conSusFilas("Recurso 2")
    estado.falla = ({ url }) =>
      url.searchParams.has("seccion") ? errorJson(500, "ERROR_INTERNO", "Falló.") : null
    await act(() => cliente.invalidateQueries({ queryKey: ["clases", CLASE_ID, "temas"] }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
    for (const llamada of aviso.error.mock.calls) {
      expect(llamada).toEqual([RECARGA, { id: ID_DEL_AVISO }])
    }
    expect(screen.getByRole("heading", { level: 4, name: "Recurso 2" })).toBeInTheDocument()

    vista.unmount()
    aviso.error.mockClear()
    await abrirRecursos("maestro", cliente)
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("CL3-D02 · peticiones de «Recursos»", () => {
  it("CL3-D02: pide los temas de cada bloque, la primera página de 5 de cada sección y «Ver más» de 20 con cursor", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    for (let n = 10; n < 15; n += 1) estado.recursos.push(recurso(n, "docente", TEMA_1))
    await abrirRecursos("maestro")
    await conSusFilas("Recurso 2")
    expect(temasDe(fetchMock, "aprendizaje").length).toBeGreaterThan(0)
    expect(temasDe(fetchMock, "docente").length).toBeGreaterThan(0)
    const primera = recursosDe(fetchMock, "docente", TEMA_1)[0]
    expect(primera?.searchParams.get("limite")).toBe("5")
    expect(primera?.searchParams.has("cursor")).toBe(false)
    expect(recursosDe(fetchMock, "aprendizaje", "sin-tema")[0]?.searchParams.get("limite")).toBe(
      "5",
    )
    fireEvent.click(screen.getByRole("button", { name: "Ver más de Unidad 1" }))
    await conSusFilas("Recurso 14")
    const verMas = recursosDe(fetchMock, "docente", TEMA_1).at(-1)
    expect(verMas?.searchParams.get("limite")).toBe("20")
    expect(verMas?.searchParams.get("cursor")).toBe(idRecurso(12))
  })

  it("CL3-D02: como máximo 6 lecturas a la vez; al desmontar, las que esperan en la fila no salen", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    estado.temas = Array.from({ length: 8 }, (_, i) => ({
      id: `8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c10${String(i).padStart(2, "0")}`,
      nombre: `Tema ${String(i + 1)}`,
    }))
    estado.recursos = estado.temas.map((tema, i) => recurso(20 + i, "docente", tema.id))
    const pendientes: (() => void)[] = []
    estado.falla = ({ url }) =>
      url.pathname === `${API}/recursos`
        ? new Promise<Response>((resolver) => {
            pendientes.push(() =>
              resolver(respuestaJson(200, { recursos: [], siguienteCursor: null })),
            )
          })
        : null
    const { vista } = await abrirRecursos("maestro")
    await waitFor(() => expect(pedidas(fetchMock, `${API}/recursos`)).toHaveLength(6))
    await reposar()
    expect(pedidas(fetchMock, `${API}/recursos`)).toHaveLength(6)
    vista.unmount()
    for (const soltar of pendientes) soltar()
    await reposar()
    expect(pedidas(fetchMock, `${API}/recursos`)).toHaveLength(6)
  })
})

describe("CL3-D03 · la fila de un recurso", () => {
  it("CL3-D03: insignia «Recurso» con icono y texto, firma «Administración», fecha, título y «Ver recurso» con la descripción en texto plano, los adjuntos y «Ver comentarios (n)»", async () => {
    const { estado } = crearServidor("estudiante")
    const [deAprendizaje] = estado.recursos
    if (deAprendizaje === undefined) throw new Error("Precondición: el recurso de aprendizaje")
    deAprendizaje.texto = "<b>Lee el capítulo</b>"
    deAprendizaje.adjuntos = [adjunto(1, "Guía.pdf")]
    deAprendizaje.comentarios = 2
    await abrirRecursos("estudiante")
    await conSusFilas("Recurso 1")
    const fila = filaDe("Recurso 1")
    const insignia = within(fila).getByText("Recurso")
    expect(insignia.closest("[data-slot='badge']")?.querySelector("svg")).not.toBeNull()
    expect(within(fila).getByText("Administración")).toBeInTheDocument()
    const { formatearFechaHora } = await import("@/lib/format")
    expect(fila).toHaveTextContent(formatearFechaHora(CREADO_EN))
    const ver = within(fila).getByRole("button", { name: "Ver recurso" })
    expect(ver).toHaveAttribute("aria-expanded", "false")
    expect(within(fila).queryByText("Guía.pdf")).toBeNull()
    fireEvent.click(ver)
    expect(within(fila).getByRole("button", { name: "Ocultar recurso" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
    expect(within(fila).getByText("<b>Lee el capítulo</b>")).toBeInTheDocument()
    expect(fila.querySelector("b")).toBeNull()
    expect(within(fila).getAllByText("Guía.pdf").length).toBeGreaterThan(0)
    expect(within(fila).getByRole("button", { name: "Ver comentarios (2)" })).toBeInTheDocument()
  })
})

describe("CL3-D04 · permisos de cada fila", () => {
  it("CL3-D04: el maestro ve «Editar recurso», «Borrar recurso» y «Mover» solo donde el servidor los permite", async () => {
    crearServidor("maestro")
    await abrirRecursos("maestro")
    await conSusFilas("Recurso 2")
    const conPermiso = filaDe("Recurso 2")
    expect(within(conPermiso).getByRole("link", { name: "Editar recurso" })).toHaveAttribute(
      "href",
      `${BASES.maestro}/${CLASE_ID}/recursos/${idRecurso(2)}/editar`,
    )
    expect(within(conPermiso).getByRole("button", { name: "Borrar recurso" })).toBeInTheDocument()
    expect(within(conPermiso).getByRole("button", { name: "Mover" })).toBeInTheDocument()
    const sinPermiso = filaDe("Recurso 1")
    expect(within(sinPermiso).queryByRole("link", { name: "Editar recurso" })).toBeNull()
    expect(within(sinPermiso).queryByRole("button", { name: "Borrar recurso" })).toBeNull()
    expect(within(sinPermiso).queryByRole("button", { name: "Mover" })).toBeNull()
  })

  it("CL3-D04: el estudiante nunca ve las acciones, aunque el dato diga true", async () => {
    crearServidor("estudiante")
    await abrirRecursos("estudiante")
    await conSusFilas("Recurso 2")
    expect(screen.queryByRole("link", { name: "Editar recurso" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Borrar recurso" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Mover" })).toBeNull()
  })
})

const pedirBorrado = (titulo: string) => {
  fireEvent.click(within(filaDe(titulo)).getByRole("button", { name: "Borrar recurso" }))
  return within(filaDe(titulo)).getByRole("button", { name: "Sí, borrar recurso" })
}

describe("CL3-D05 · borrar un recurso", () => {
  it("CL3-D05: la confirmación dice la frase según los adjuntos, el foco va a «Cancelar»; al confirmar con doble clic sale un DELETE, el aviso y el foco al «Borrar recurso» de la vecina", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    const conAdjunto = estado.recursos[1]
    if (conAdjunto === undefined) throw new Error("Precondición: el recurso 2")
    conAdjunto.adjuntos = [adjunto(1, "Guía.pdf")]
    await abrirRecursos("maestro")
    await conSusFilas("Recurso 3")
    pedirBorrado("Recurso 3")
    expect(within(filaDe("Recurso 3")).getByText("Se borrará con sus comentarios.")).toBeVisible()
    expect(within(filaDe("Recurso 3")).getByRole("button", { name: "Cancelar" })).toHaveFocus()
    fireEvent.click(within(filaDe("Recurso 3")).getByRole("button", { name: "Cancelar" }))

    const siBorrar = pedirBorrado("Recurso 2")
    expect(
      within(filaDe("Recurso 2")).getByText("Se borrará con sus comentarios y adjuntos."),
    ).toBeVisible()
    siBorrar.focus()
    fireEvent.click(siBorrar)
    fireEvent.click(siBorrar)
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Recurso borrado"))
    await waitFor(() =>
      expect(screen.queryByRole("heading", { level: 4, name: "Recurso 2" })).toBeNull(),
    )
    expect(llamadasDe(fetchMock, "DELETE", `${API}/publicaciones/${idRecurso(2)}`)).toHaveLength(1)
    await waitFor(() =>
      expect(
        within(filaDe("Recurso 3")).getByRole("button", { name: "Borrar recurso" }),
      ).toHaveFocus(),
    )
  })

  it("CL3-D05: borrar el último recurso de una sección con el foco dentro lleva el foco al encabezado de la sección vecina del mismo bloque y, sin vecinas, al h2 del bloque", async () => {
    const { estado } = crearServidor("maestro")
    estado.recursos = [
      estado.recursos[0] ?? recurso(1, "aprendizaje", null),
      recurso(2, "docente", TEMA_1),
      recurso(3, "docente", TEMA_2),
    ]
    await abrirRecursos("maestro")
    await conSusFilas("Recurso 3")
    const primero = pedirBorrado("Recurso 2")
    primero.focus()
    fireEvent.click(primero)
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 3, name: "Unidad 2 · 1 recurso" })).toHaveFocus(),
    )
    const segundo = pedirBorrado("Recurso 3")
    segundo.focus()
    fireEvent.click(segundo)
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 2, name: "Recursos del docente" })).toHaveFocus(),
    )
    expect(screen.getByText("Aún no hay recursos del docente.")).toBeInTheDocument()
  })

  it("CL3-D05: con 403 BORRADO_NO_PERMITIDO, el aviso, la lista se renueva y el botón desaparece; con 404, la fila desaparece", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    await abrirRecursos("maestro")
    await conSusFilas("Recurso 2")
    estado.falla = ({ metodo, url }) => {
      if (metodo !== "DELETE" || !url.pathname.endsWith(idRecurso(2))) return null
      for (const r of estado.recursos) if (r.id === idRecurso(2)) r.puedeBorrar = false
      return errorJson(403, "BORRADO_NO_PERMITIDO", "No puedes borrar este recurso.")
    }
    const antes = recursosDe(fetchMock, "docente", TEMA_1).length
    fireEvent.click(pedirBorrado("Recurso 2"))
    await waitFor(() => expect(avisosDeError()).toEqual(["No puedes borrar este recurso."]))
    await waitFor(() =>
      expect(within(filaDe("Recurso 2")).queryByRole("button", { name: /borrar/i })).toBeNull(),
    )
    expect(recursosDe(fetchMock, "docente", TEMA_1).length).toBeGreaterThan(antes)

    estado.falla = ({ metodo, url }) => {
      if (metodo !== "DELETE" || !url.pathname.endsWith(idRecurso(3))) return null
      estado.recursos = estado.recursos.filter((r) => r.id !== idRecurso(3))
      return errorJson(404, "PUBLICACION_NO_ENCONTRADA", "Esa publicación ya no existe.")
    }
    fireEvent.click(pedirBorrado("Recurso 3"))
    await waitFor(() =>
      expect(screen.queryByRole("heading", { level: 4, name: "Recurso 3" })).toBeNull(),
    )
    expect(avisosDeError()).toContain("Ese recurso ya no existe.")
  })
})

const mover = (titulo: string, destino: string) => {
  const fila = filaDe(titulo)
  fireEvent.change(within(fila).getByLabelText(`Tema de «${titulo}»`), {
    target: { value: destino },
  })
  const boton = within(fila).getByRole("button", { name: "Mover" })
  boton.focus()
  fireEvent.click(boton)
  return boton
}

describe("CL3-D06 · mover un recurso", () => {
  it("CL3-D06: con éxito, el aviso, se renuevan los recursos, los temas y la edición del recurso, y el foco va al «Mover» de la vecina", async () => {
    const { fetchMock } = crearServidor("maestro")
    const cliente = clienteDePrueba()
    const { claveRecurso } = await import("./data")
    cliente.setQueryData(claveRecurso(CLASE_ID, idRecurso(2)), { recurso: null })
    await abrirRecursos("maestro", cliente)
    await conSusFilas("Recurso 3")
    const temasAntes = temasDe(fetchMock, "docente").length
    mover("Recurso 2", TEMA_2)
    await waitFor(() =>
      expect(aviso.success).toHaveBeenCalledWith("Moviste «Recurso 2» a «Unidad 2»"),
    )
    await waitFor(() =>
      expect(
        within(seccionDelTema(bloque("Recursos del docente"), "Unidad 2")).getByRole("heading", {
          level: 4,
          name: "Recurso 2",
        }),
      ).toBeInTheDocument(),
    )
    expect(temasDe(fetchMock, "docente").length).toBeGreaterThan(temasAntes)
    expect(recursosDe(fetchMock, "docente", TEMA_2).length).toBeGreaterThan(0)
    expect(cliente.getQueryState(claveRecurso(CLASE_ID, idRecurso(2)))?.isInvalidated).toBe(true)
    await waitFor(() =>
      expect(within(filaDe("Recurso 3")).getByRole("button", { name: "Mover" })).toHaveFocus(),
    )
  })

  it("CL3-D06: con 403 MOVER_NO_PERMITIDO, el aviso del servidor, la lista se renueva, «Mover» desaparece y el foco va al h3 de la sección", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    await abrirRecursos("maestro")
    await conSusFilas("Recurso 2")
    estado.falla = ({ metodo, url }) => {
      if (metodo !== "PUT" || !url.pathname.endsWith("/tema")) return null
      for (const r of estado.recursos) if (r.id === idRecurso(2)) r.puedeMover = false
      return errorJson(
        403,
        "MOVER_NO_PERMITIDO",
        "Solo la administración mueve los recursos de aprendizaje.",
      )
    }
    const antes = recursosDe(fetchMock, "docente", TEMA_1).length
    mover("Recurso 2", TEMA_2)
    await waitFor(() =>
      expect(avisosDeError()).toEqual([
        "Solo la administración mueve los recursos de aprendizaje.",
      ]),
    )
    await waitFor(() =>
      expect(within(filaDe("Recurso 2")).queryByRole("button", { name: "Mover" })).toBeNull(),
    )
    expect(recursosDe(fetchMock, "docente", TEMA_1).length).toBeGreaterThan(antes)
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 3, name: "Unidad 1 · 2 recursos" }),
      ).toHaveFocus(),
    )
  })
})

describe("guarda de redirección al mover (arbitraje de la PARADA de 03d, sección 5)", () => {
  const restringido = () =>
    errorJson(403, "ACCESO_RESTRINGIDO", "Tu acceso a la plataforma está restringido.")

  it("mover con 403 ACCESO_RESTRINGIDO en «Recursos» no da aviso ni vuelve a pedir nada", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    await abrirRecursos("maestro")
    await conSusFilas("Recurso 2")
    await reposar()
    estado.falla = ({ metodo, url }) =>
      metodo === "PUT" && url.pathname.endsWith("/tema") ? restringido() : null
    const antes = fetchMock.mock.calls.length
    mover("Recurso 2", TEMA_2)
    await waitFor(() => expect(fetchMock.mock.calls.length).toBe(antes + 1))
    await reposar()
    expect(fetchMock.mock.calls.length).toBe(antes + 1)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(aviso.success).not.toHaveBeenCalled()
  })

  it("mover con 403 ACCESO_RESTRINGIDO en «Actividades de aprendizaje» no da aviso ni vuelve a pedir nada", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    const elemento = {
      id: idRecurso(50),
      tipo: "material",
      titulo: "Material 1",
      autor: FIRMA_MAESTRO,
      creadoEn: CREADO_EN,
      material: { texto: "", adjuntos: [] },
      tarea: null,
      puedeMover: true,
      entrega: null,
    }
    let restringir = false
    estado.falla = ({ metodo, url }) => {
      if (metodo === "PUT" && url.pathname.endsWith("/tema") && restringir) return restringido()
      if (url.pathname === `${API}/trabajo`) {
        return respuestaJson(200, { elementos: [elemento], siguienteCursor: null })
      }
      if (url.pathname === `${API}/temas` && url.searchParams.get("seccion") === "actividades") {
        return respuestaJson(200, {
          temas: [
            { id: TEMA_1, nombre: "Unidad 1", orden: 0, elementos: 1 },
            { id: TEMA_2, nombre: "Unidad 2", orden: 1, elementos: 0 },
          ],
          sinTema: 0,
        })
      }
      return null
    }
    await montar([`${BASES.maestro}/${CLASE_ID}/trabajo`])
    await screen.findByText("Material 1", undefined, ESPERA)
    await reposar()
    restringir = true
    const antes = fetchMock.mock.calls.length
    fireEvent.change(screen.getByLabelText("Tema de «Material 1»"), { target: { value: TEMA_2 } })
    fireEvent.click(screen.getByRole("button", { name: "Mover" }))
    await waitFor(() => expect(fetchMock.mock.calls.length).toBe(antes + 1))
    await reposar()
    expect(fetchMock.mock.calls.length).toBe(antes + 1)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(aviso.success).not.toHaveBeenCalled()
  })
})

describe("CL3-D07 · comentarios de un recurso", () => {
  it.each(["estudiante", "maestro"] as const)(
    "CL3-D07: %s comenta dentro de «Ver recurso» y el conteo de la lista de recursos se renueva",
    async (rol) => {
      const { fetchMock } = crearServidor(rol)
      await abrirRecursos(rol)
      await conSusFilas("Recurso 2")
      fireEvent.click(within(filaDe("Recurso 2")).getByRole("button", { name: "Ver recurso" }))
      fireEvent.click(
        within(filaDe("Recurso 2")).getByRole("button", { name: "Ver comentarios (0)" }),
      )
      const campo = await within(filaDe("Recurso 2")).findByLabelText(
        "Escribe un comentario",
        undefined,
        ESPERA,
      )
      const antes = recursosDe(fetchMock, "docente", TEMA_1).length
      fireEvent.change(campo, { target: { value: "Gracias" } })
      fireEvent.click(within(filaDe("Recurso 2")).getByRole("button", { name: "Comentar" }))
      await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Comentario publicado"))
      await waitFor(() =>
        expect(recursosDe(fetchMock, "docente", TEMA_1).length).toBeGreaterThan(antes),
      )
      fireEvent.click(
        within(filaDe("Recurso 2")).getByRole("button", { name: "Ocultar comentarios" }),
      )
      expect(
        await within(filaDe("Recurso 2")).findByRole("button", { name: "Ver comentarios (1)" }),
      ).toBeInTheDocument()
    },
  )

  it("CL3-D07: el admin lee los comentarios sin formulario", async () => {
    const { estado } = crearServidor("admin")
    estado.comentarios[idRecurso(2)] = [comentario(1)]
    const r2 = estado.recursos[1]
    if (r2 !== undefined) r2.comentarios = 1
    await abrirRecursos("admin")
    await conSusFilas("Recurso 2")
    fireEvent.click(within(filaDe("Recurso 2")).getByRole("button", { name: "Ver recurso" }))
    fireEvent.click(
      within(filaDe("Recurso 2")).getByRole("button", { name: "Ver comentarios (1)" }),
    )
    expect(await screen.findByText("Comentario 1", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByLabelText("Escribe un comentario")).toBeNull()
  })
})

const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
const botonPublicar = () => screen.getByRole("button", { name: "Publicar recurso" })
const archivo = (nombre: string) => new File(["x"], nombre, { type: "application/pdf" })
const elegirArchivos = (...archivos: File[]) =>
  fireEvent.change(screen.getByLabelText("Adjuntar archivos"), { target: { files: archivos } })
const posts = (fetchMock: FetchMock) => llamadasDe(fetchMock, "POST", `${API}/publicaciones`)

describe("CL3-D08 · publicar un recurso", () => {
  it("CL3-D08: el maestro ve «Se publicará en Recursos del docente.»; el cuerpo es el del recurso; al 201, el aviso, los campos vacíos y se vuelven a pedir los temas del bloque y la lista de la sección", async () => {
    const { fetchMock } = crearServidor("maestro")
    await abrirRecursos("maestro")
    await conSusFilas("Recurso 2")
    expect(screen.getByRole("heading", { level: 2, name: "Nuevo recurso" })).toBeInTheDocument()
    expect(screen.getByText("Se publicará en Recursos del docente.")).toBeInTheDocument()
    const campoTema = await screen.findByLabelText("Tema", undefined, ESPERA)
    escribir("Título del recurso", "  Guía  ")
    escribir("Descripción (opcional)", "Capítulo 3")
    fireEvent.change(campoTema, { target: { value: TEMA_1 } })
    const temasAntes = temasDe(fetchMock, "docente").length
    const listaAntes = recursosDe(fetchMock, "docente", TEMA_1).length
    fireEvent.click(botonPublicar())
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Recurso publicado"))
    expect(posts(fetchMock).map(({ cuerpo }) => cuerpo)).toEqual([
      { tipo: "material", titulo: "Guía", texto: "Capítulo 3", temaId: TEMA_1, archivoIds: [] },
    ])
    await waitFor(() => expect(screen.getByLabelText("Título del recurso")).toHaveValue(""))
    expect(screen.getByLabelText("Descripción (opcional)")).toHaveValue("")
    expect(screen.getByLabelText("Tema")).toHaveValue("")
    await waitFor(() => expect(temasDe(fetchMock, "docente").length).toBeGreaterThan(temasAntes))
    await waitFor(() =>
      expect(recursosDe(fetchMock, "docente", TEMA_1).length).toBeGreaterThan(listaAntes),
    )
    expect(await conSusFilas("Guía")).toBeInTheDocument()
  })

  it("CL3-D08: el admin ve «Se publicará en Recursos de aprendizaje.» y el estudiante no ve el formulario", async () => {
    crearServidor("admin")
    await abrirRecursos("admin")
    expect(screen.getByText("Se publicará en Recursos de aprendizaje.")).toBeInTheDocument()
    cleanup()
    crearServidor("estudiante")
    await abrirRecursos("estudiante")
    expect(screen.queryByRole("heading", { level: 2, name: "Nuevo recurso" })).toBeNull()
    expect(screen.queryByLabelText("Título del recurso")).toBeNull()
  })
})

describe("CL3-D09 · publicar con archivos", () => {
  it("CL3-D09: una subida por archivo, la lista fija mientras se publica y un doble envío da un solo POST", async () => {
    const { fetchMock } = crearServidor("maestro")
    await abrirRecursos("maestro")
    escribir("Título del recurso", "Con archivos")
    elegirArchivos(archivo("a.pdf"), archivo("b.pdf"))
    const formulario = botonPublicar().closest("form")
    if (formulario === null) throw new Error("Precondición: el formulario")
    fireEvent.submit(formulario)
    fireEvent.submit(formulario)
    expect(within(formulario).getByRole("status")).toHaveTextContent(
      "Mientras se publica no puedes cambiar los archivos.",
    )
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Recurso publicado"))
    expect(llamadasDe(fetchMock, "POST", `${API}/archivos`)).toHaveLength(2)
    expect(posts(fetchMock)).toHaveLength(1)
    expect((posts(fetchMock)[0]?.cuerpo as { archivoIds: string[] }).archivoIds).toHaveLength(2)
  })

  it("CL3-D09: si falla la subida de un archivo, el aviso lo nombra y no se publica", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    estado.falla = ({ url }) =>
      url.hostname === "almacen.ejemplo.mx" ? new Response(null, { status: 500 }) : null
    await abrirRecursos("maestro")
    escribir("Título del recurso", "Se queda")
    elegirArchivos(archivo("b.pdf"))
    fireEvent.click(botonPublicar())
    await waitFor(() =>
      expect(aviso.error).toHaveBeenCalledWith("No pudimos subir «b.pdf». Inténtalo de nuevo."),
    )
    expect(posts(fetchMock)).toHaveLength(0)
    expect(screen.getByLabelText("Título del recurso")).toHaveValue("Se queda")
  })
})

describe("CL3-D10 · el tema al publicar", () => {
  it("CL3-D10: sin temas no hay campo «Tema»; con la lista fallida, la nota en línea", async () => {
    const { estado } = crearServidor("maestro")
    estado.temas = []
    await abrirRecursos("maestro")
    await reposar()
    expect(screen.queryByLabelText("Tema")).toBeNull()
    cleanup()
    const otro = crearServidor("maestro")
    otro.estado.falla = ({ url }) =>
      url.pathname === `${API}/temas` && !url.searchParams.has("seccion")
        ? errorJson(500, "ERROR_INTERNO", "Falló.")
        : null
    await abrirRecursos("maestro", clienteDePrueba())
    expect(
      await screen.findByText(
        "No pudimos cargar los temas. El recurso se publicará sin tema.",
        undefined,
        ESPERA,
      ),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText("Tema")).toBeNull()
  })

  it("CL3-D10: con 404 TEMA_NO_ENCONTRADO se renuevan los temas y el campo vuelve a «Sin tema»", async () => {
    const { estado } = crearServidor("maestro")
    await abrirRecursos("maestro")
    fireEvent.change(await screen.findByLabelText("Tema", undefined, ESPERA), {
      target: { value: TEMA_2 },
    })
    estado.temas = estado.temas.filter(({ id }) => id !== TEMA_2)
    estado.falla = ({ metodo, url }) =>
      metodo === "POST" && url.pathname === `${API}/publicaciones`
        ? errorJson(404, "TEMA_NO_ENCONTRADO", "Ese tema ya no existe.")
        : null
    escribir("Título del recurso", "Guía")
    fireEvent.click(botonPublicar())
    await waitFor(() => expect(avisosDeError()).toEqual(["Ese tema ya no existe."]))
    await waitFor(() =>
      expect(
        Array.from((screen.getByLabelText("Tema") as HTMLSelectElement).options).map(
          (opcion) => opcion.textContent,
        ),
      ).toEqual(["Sin tema", "Unidad 1"]),
    )
    expect(screen.getByLabelText("Tema")).toHaveValue("")
    expect(screen.getByLabelText("Título del recurso")).toHaveValue("Guía")
  })
})

const validacion = (mensaje: string) => errorJson(400, "VALIDACION", mensaje)
const portadoresDeError = () => document.querySelectorAll('[aria-invalid="true"]')

describe("CL3-D15 · VALIDACION fuera de contrato al publicar un recurso", () => {
  it.each([
    ["temaId:", `temaId: ${M}`, M],
    ["version:", `version: ${M}`, M],
    ["vacío", "", GENERICO],
    ["solo espacios", "   ", GENERICO],
    ["archivoIds.0:", `archivoIds.0: ${M}`, M],
  ])(
    "CL3-D15: con «%s» un solo aviso legible, ningún ErrorDeCampo, lo escrito se conserva y el botón sale de la espera",
    async (_caso, mensaje, esperado) => {
      const { estado } = crearServidor("maestro")
      estado.falla = ({ metodo, url }) =>
        metodo === "POST" && url.pathname === `${API}/publicaciones` ? validacion(mensaje) : null
      await abrirRecursos("maestro")
      escribir("Título del recurso", "Guía")
      escribir("Descripción (opcional)", "Capítulo 3")
      fireEvent.click(botonPublicar())
      await waitFor(() => expect(avisosDeError()).toEqual([esperado]))
      await reposar()
      expect(avisosDeError()).toEqual([esperado])
      expect(portadoresDeError()).toHaveLength(0)
      expect(screen.getByLabelText("Título del recurso")).toHaveValue("Guía")
      expect(screen.getByLabelText("Descripción (opcional)")).toHaveValue("Capítulo 3")
      expect(botonPublicar()).not.toHaveAttribute("aria-busy", "true")
    },
  )
})

describe("CL3-D17 · rechazo del servidor y después la validación local, al publicar", () => {
  it.each([
    ["titulo:", "Título del recurso"],
    ["texto:", "Descripción (opcional)"],
  ])(
    "CL3-D17: tras un «%s» del servidor, un envío con el título vacío muestra solo «Escribe el título del recurso»",
    async (prefijo, etiqueta) => {
      const { estado, fetchMock } = crearServidor("maestro")
      estado.falla = ({ metodo, url }) =>
        metodo === "POST" && url.pathname === `${API}/publicaciones`
          ? validacion(`${prefijo} ${M}`)
          : null
      await abrirRecursos("maestro")
      escribir("Título del recurso", "Guía")
      fireEvent.click(botonPublicar())
      await waitFor(() => expect(screen.getByLabelText(etiqueta)).toHaveAccessibleDescription(M))
      escribir("Título del recurso", "   ")
      fireEvent.click(botonPublicar())
      expect(
        await screen.findByText("Escribe el título del recurso", undefined, ESPERA),
      ).toBeInTheDocument()
      expect(screen.queryByText(M)).toBeNull()
      expect(portadoresDeError()).toHaveLength(1)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(posts(fetchMock)).toHaveLength(1)
    },
  )
})

describe("CL3-D22 · O-16 al publicar un recurso", () => {
  it("CL3-D22: montado, un VALIDACION de titulo: va bajo el campo y no avisa", async () => {
    const { estado } = crearServidor("maestro")
    estado.falla = ({ metodo, url }) =>
      metodo === "POST" && url.pathname === `${API}/publicaciones`
        ? validacion(`titulo: ${M}`)
        : null
    await abrirRecursos("maestro")
    escribir("Título del recurso", "Guía")
    fireEvent.click(botonPublicar())
    await waitFor(() =>
      expect(screen.getByLabelText("Título del recurso")).toHaveAccessibleDescription(M),
    )
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it.each(["titulo:", "texto:"])(
    "CL3-D22: desmontado con la petición en vuelo, un VALIDACION de «%s» da un aviso",
    async (prefijo) => {
      const { estado, fetchMock } = crearServidor("maestro")
      let soltar: (respuesta: Response) => void = () => undefined
      estado.falla = ({ metodo, url }) =>
        metodo === "POST" && url.pathname === `${API}/publicaciones`
          ? new Promise<Response>((resolver) => {
              soltar = resolver
            })
          : null
      const { vista } = await abrirRecursos("maestro")
      escribir("Título del recurso", "Guía")
      fireEvent.click(botonPublicar())
      await waitFor(() => expect(posts(fetchMock)).toHaveLength(1))
      vista.unmount()
      soltar(validacion(`${prefijo} ${M}`))
      await waitFor(() =>
        expect(avisosDeError(), JSON.stringify(aviso.error.mock.calls)).toEqual([M]),
      )
      await reposar()
      expect(avisosDeError(), JSON.stringify(aviso.error.mock.calls)).toEqual([M])
    },
  )
})

describe("CL3-D25 · R7: repetir tras un 503", () => {
  const ocupado = () =>
    errorJson(
      503,
      "SERVICIO_OCUPADO",
      "El servidor está ocupado. Inténtalo de nuevo en unos segundos.",
    )

  it("CL3-D25: «Publicar recurso» tras un 503 sale de la espera, conserva lo escrito y un segundo clic publica", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    let primera = true
    estado.falla = ({ metodo, url }) => {
      if (metodo !== "POST" || url.pathname !== `${API}/publicaciones` || !primera) return null
      primera = false
      return ocupado()
    }
    await abrirRecursos("maestro")
    escribir("Título del recurso", "Guía")
    fireEvent.click(botonPublicar())
    await waitFor(() =>
      expect(avisosDeError()).toEqual([
        "El servidor está ocupado. Inténtalo de nuevo en unos segundos.",
      ]),
    )
    await waitFor(() => expect(botonPublicar()).not.toHaveAttribute("aria-busy", "true"))
    expect(screen.getByLabelText("Título del recurso")).toHaveValue("Guía")
    fireEvent.click(botonPublicar())
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Recurso publicado"))
    expect(posts(fetchMock)).toHaveLength(2)
    expect(screen.getByLabelText("Título del recurso")).toHaveValue("")
  })

  it("CL3-D25: «Sí, borrar recurso» tras un 503 sale de la espera y un segundo clic borra", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    let primera = true
    estado.falla = ({ metodo }) => {
      if (metodo !== "DELETE" || !primera) return null
      primera = false
      return ocupado()
    }
    await abrirRecursos("maestro")
    await conSusFilas("Recurso 2")
    const siBorrar = pedirBorrado("Recurso 2")
    fireEvent.click(siBorrar)
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(siBorrar).not.toHaveAttribute("aria-busy", "true"))
    fireEvent.click(siBorrar)
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Recurso borrado"))
    expect(llamadasDe(fetchMock, "DELETE", `${API}/publicaciones/${idRecurso(2)}`)).toHaveLength(2)
  })

  it("CL3-D25: «Mover» tras un 503 sale de la espera y un segundo clic mueve", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    let primera = true
    estado.falla = ({ metodo, url }) => {
      if (metodo !== "PUT" || !url.pathname.endsWith("/tema") || !primera) return null
      primera = false
      return ocupado()
    }
    await abrirRecursos("maestro")
    await conSusFilas("Recurso 2")
    const boton = mover("Recurso 2", TEMA_2)
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy", "true"))
    fireEvent.click(within(filaDe("Recurso 2")).getByRole("button", { name: "Mover" }))
    await waitFor(() =>
      expect(aviso.success).toHaveBeenCalledWith("Moviste «Recurso 2» a «Unidad 2»"),
    )
    expect(llamadasDe(fetchMock, "PUT", `${API}/publicaciones/${idRecurso(2)}/tema`)).toHaveLength(
      2,
    )
  })
})

describe("CL3-D28 · el título vacío de un recurso nuevo", () => {
  it.each([
    ["maestro", ""],
    ["maestro", "   "],
    ["maestro", "ㅤ"],
    ["admin", "\u{FEFF}\u{3000} "],
  ] as const)(
    "CL3-D28: %s con el título «%s»: «Escribe el título del recurso» bajo el campo, ningún POST, nunca el del material; lo escrito y los archivos se conservan",
    async (rol, titulo) => {
      const { fetchMock } = crearServidor(rol)
      await abrirRecursos(rol)
      escribir("Título del recurso", titulo)
      escribir("Descripción (opcional)", "Se queda")
      elegirArchivos(archivo("a.pdf"))
      fireEvent.click(botonPublicar())
      expect(
        await screen.findByText("Escribe el título del recurso", undefined, ESPERA),
      ).toBeInTheDocument()
      expect(screen.getByLabelText("Título del recurso")).toHaveAttribute("aria-invalid", "true")
      expect(screen.queryByText("Escribe el título del material")).toBeNull()
      expect(screen.getByLabelText("Descripción (opcional)")).toHaveValue("Se queda")
      expect(screen.getByRole("button", { name: "Quitar a.pdf" })).toBeInTheDocument()
      expect(botonPublicar()).not.toHaveAttribute("aria-busy", "true")
      await reposar()
      expect(posts(fetchMock)).toHaveLength(0)
      expect(llamadasDe(fetchMock, "POST", `${API}/archivos`)).toHaveLength(0)
    },
  )
})

describe("§D-14 · «Ver más de <tema>» con 5xx", () => {
  it("con un 500 al pedir «Ver más de Unidad 1», las filas se conservan, sale un aviso, el botón sigue y un segundo clic carga la página", async () => {
    const { estado } = crearServidor("maestro")
    for (let n = 10; n < 15; n += 1) estado.recursos.push(recurso(n, "docente", TEMA_1))
    let primera = true
    estado.falla = ({ url }) => {
      if (url.pathname !== `${API}/recursos` || !url.searchParams.has("cursor") || !primera) {
        return null
      }
      primera = false
      return errorJson(500, "ERROR_INTERNO", "Falló.")
    }
    await abrirRecursos("maestro", clienteDePrueba())
    await conSusFilas("Recurso 2")
    fireEvent.click(screen.getByRole("button", { name: "Ver más de Unidad 1" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(aviso.error).toHaveBeenCalledWith(GENERICO, { id: ID_DEL_AVISO })
    expect(screen.getByRole("heading", { level: 4, name: "Recurso 2" })).toBeInTheDocument()
    const verMas = screen.getByRole("button", { name: "Ver más de Unidad 1" })
    await waitFor(() => expect(verMas).not.toHaveAttribute("aria-busy", "true"))
    fireEvent.click(verMas)
    expect(await conSusFilas("Recurso 14")).toBeInTheDocument()
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })
})
