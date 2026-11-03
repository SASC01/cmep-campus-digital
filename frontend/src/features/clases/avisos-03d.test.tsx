// CLASES-03d (§D-8.7, §D-15, §D-11): el formulario de Avisos solo publica anuncios, con el router real
// (CL3-D19 a CL3-D21 y CL3-D22 en el anuncio).
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
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

const M = "Revisa este valor."
const AVISOS = `${BASES.maestro}/${CLASE_ID}`

const abrirAvisos = async (cliente?: QueryClient) => {
  const montaje = await montar([AVISOS], cliente)
  await screen.findByLabelText("Anuncio", undefined, ESPERA)
  return montaje
}

const escribirAnuncio = (texto: string) =>
  fireEvent.change(screen.getByLabelText("Anuncio"), { target: { value: texto } })
const botonPublicar = () => screen.getByRole("button", { name: "Publicar anuncio" })
const posts = (fetchMock: FetchMock) => llamadasDe(fetchMock, "POST", `${API}/publicaciones`)
const esElPost = ({ metodo, url }: Llamada) =>
  metodo === "POST" && url.pathname === `${API}/publicaciones`
const validacion = (mensaje: string) => errorJson(400, "VALIDACION", mensaje)
const portadoresDeError = () => document.querySelectorAll('[aria-invalid="true"]')
const sinRastroDelMaterial = () => {
  expect(screen.queryByRole("group", { name: "Tipo de publicación" })).toBeNull()
  expect(screen.queryByRole("button", { name: "Material" })).toBeNull()
  expect(screen.queryByLabelText(/^Título/)).toBeNull()
  expect(screen.queryByLabelText("Tema")).toBeNull()
}

describe("CL3-D19 · el formulario de Avisos solo publica anuncios", () => {
  it("CL3-D19: solo «Anuncio», los adjuntos y «Publicar anuncio»; sin tipo, título ni tema, no pide los temas y envía { tipo: anuncio, texto, archivoIds }", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    estado.falla = (llamada) =>
      esElPost(llamada)
        ? respuestaJson(201, {
            publicacion: {
              id: idRecurso(90),
              tipo: "anuncio",
              titulo: null,
              texto: "Mañana hay examen",
              autor: FIRMA_MAESTRO,
              creadoEn: CREADO_EN,
              comentarios: 0,
              adjuntos: [],
              puedeBorrar: true,
              tarea: null,
            },
          })
        : null
    await abrirAvisos()
    expect(screen.getByRole("button", { name: "Adjuntar archivos" })).toBeInTheDocument()
    sinRastroDelMaterial()
    escribirAnuncio("  Mañana hay examen \r\n")
    fireEvent.click(botonPublicar())
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Publicado"))
    expect(posts(fetchMock).map(({ cuerpo }) => cuerpo)).toEqual([
      { tipo: "anuncio", texto: "Mañana hay examen", archivoIds: [] },
    ])
    expect(pedidas(fetchMock, `${API}/temas`)).toHaveLength(0)
    sinRastroDelMaterial()
  })
})

describe("CL3-D20 · VALIDACION fuera de contrato del anuncio", () => {
  it.each([
    ["titulo:", `titulo: ${M}`, M],
    ["temaId:", `temaId: ${M}`, M],
    ["vacío", "", GENERICO],
    ["solo espacios", "   ", GENERICO],
    ["archivoIds.0:", `archivoIds.0: ${M}`, M],
  ])(
    "CL3-D20: con «%s» un solo aviso legible, ningún ErrorDeCampo, lo escrito se conserva y el botón sale de la espera",
    async (_caso, mensaje, esperado) => {
      const { estado } = crearServidor("maestro")
      estado.falla = (llamada) => (esElPost(llamada) ? validacion(mensaje) : null)
      await abrirAvisos(clienteDePrueba())
      escribirAnuncio("Mañana hay examen")
      fireEvent.click(botonPublicar())
      await waitFor(() => expect(avisosDeError()).toEqual([esperado]))
      await reposar()
      expect(avisosDeError()).toEqual([esperado])
      expect(portadoresDeError()).toHaveLength(0)
      expect(screen.getByLabelText("Anuncio")).toHaveValue("Mañana hay examen")
      expect(botonPublicar()).not.toHaveAttribute("aria-busy", "true")
    },
  )

  it("CL3-D20: tras un «texto:» del servidor, un envío vacío muestra solo «Escribe el anuncio»", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    estado.falla = (llamada) => (esElPost(llamada) ? validacion(`texto: ${M}`) : null)
    await abrirAvisos(clienteDePrueba())
    escribirAnuncio("Hola")
    fireEvent.click(botonPublicar())
    await waitFor(() => expect(screen.getByLabelText("Anuncio")).toHaveAccessibleDescription(M))
    escribirAnuncio("​")
    fireEvent.click(botonPublicar())
    expect(await screen.findByText("Escribe el anuncio", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(M)).toBeNull()
    expect(portadoresDeError()).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(posts(fetchMock)).toHaveLength(1)
  })
})

describe("CL3-D21 · O-r2-2: ningún campo de título tras un «titulo:»", () => {
  it("CL3-D21: con un 400 de «titulo:» en vuelo y al asentarse, nunca aparece un campo de título", async () => {
    const { estado } = crearServidor("maestro")
    let soltar: (respuesta: Response) => void = () => undefined
    estado.falla = (llamada) =>
      esElPost(llamada)
        ? new Promise<Response>((resolver) => {
            soltar = resolver
          })
        : null
    await abrirAvisos(clienteDePrueba())
    escribirAnuncio("Hola")
    fireEvent.click(botonPublicar())
    await waitFor(() => expect(botonPublicar()).toHaveAttribute("aria-busy", "true"))
    sinRastroDelMaterial()
    await act(async () => {
      soltar(validacion(`titulo: ${M}`))
      for (let i = 0; i < 30; i += 1) {
        await Promise.resolve()
        sinRastroDelMaterial()
      }
    })
    await waitFor(() => expect(avisosDeError()).toEqual([M]))
    sinRastroDelMaterial()
  })
})

describe("CL3-D22 · O-16 en el anuncio", () => {
  it("CL3-D22: montado, un VALIDACION de texto: va bajo «Anuncio» y no avisa", async () => {
    const { estado } = crearServidor("maestro")
    estado.falla = (llamada) => (esElPost(llamada) ? validacion(`texto: ${M}`) : null)
    await abrirAvisos(clienteDePrueba())
    escribirAnuncio("Hola")
    fireEvent.click(botonPublicar())
    await waitFor(() => expect(screen.getByLabelText("Anuncio")).toHaveAccessibleDescription(M))
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CL3-D22: desmontado con la publicación en vuelo, un VALIDACION de texto: da un aviso", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    let soltar: (respuesta: Response) => void = () => undefined
    estado.falla = (llamada) =>
      esElPost(llamada)
        ? new Promise<Response>((resolver) => {
            soltar = resolver
          })
        : null
    const { vista } = await abrirAvisos(clienteDePrueba())
    escribirAnuncio("Hola")
    fireEvent.click(botonPublicar())
    await waitFor(() => expect(posts(fetchMock)).toHaveLength(1))
    vista.unmount()
    soltar(validacion(`texto: ${M}`))
    await waitFor(() => expect(avisosDeError()).toEqual([M]))
    await reposar()
    expect(avisosDeError()).toEqual([M])
  })
})
