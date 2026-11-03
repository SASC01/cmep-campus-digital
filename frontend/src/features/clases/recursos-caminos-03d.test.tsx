// CLASES-03d (§D-10): las frases de recuperación de «Recursos» por cada camino, con el router real
// (`rutas`) y el QueryClient de app/providers.tsx (staleTime de 30 s, un reintento): R3 (CL3-D23), R6
// en un recurso (CL3-D24) y R9 (CL3-D27, lugares 1 y 2); y las rutas de «Recursos» (CL3-D26).
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
const sinRed = () => Promise.reject(new TypeError("Failed to fetch"))

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

const reposar = () => act(() => new Promise((resolver) => setTimeout(resolver, 150)))

const enLasSecciones = (nombre: string) =>
  within(screen.getByRole("list", { name: "Secciones de la clase" })).getByRole("link", {
    name: nombre,
  })

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

const R3 = "Este tema cambió mientras lo veías. Vuelve a abrir Recursos para verlo completo."
const R6 = "Los comentarios cambiaron mientras los veías. Vuelve a abrirlos para verlos completos."

const AVISOS = (rol: Rol) => `${BASES[rol]}/${CLASE_ID}`
const RECURSOS = (rol: Rol) => `${BASES[rol]}/${CLASE_ID}/recursos`

const esperarRecursos = () =>
  screen.findByRole("heading", { level: 2, name: "Recursos del docente" }, ESPERA)

interface CasoR3 {
  bloque: Bloque
  titulo: string
  tema: string
  nombre: string
  otroBloque: Bloque
  otroTema: string
}

const CASOS_R3: readonly CasoR3[] = [
  {
    bloque: "docente",
    titulo: "Recursos del docente",
    tema: TEMA_1,
    nombre: "Unidad 1",
    otroBloque: "aprendizaje",
    otroTema: "sin-tema",
  },
  {
    bloque: "aprendizaje",
    titulo: "Recursos de aprendizaje",
    tema: "sin-tema",
    nombre: "Sin tema",
    otroBloque: "docente",
    otroTema: TEMA_1,
  },
]

// Un tema de cada bloque con 7 recursos; al pedir "Ver más", el último de la primera página ya no está:
// el cursor vence y la sección dice R3.
const conR3 = async (caso: CasoR3, entradas = [RECURSOS("maestro")]) => {
  const servidor = crearServidor("maestro")
  for (let n = 0; n < 5; n += 1) {
    servidor.estado.recursos.push(recurso(10 + n, "docente", TEMA_1))
    servidor.estado.recursos.push(recurso(30 + n, "aprendizaje", null))
  }
  const montaje = await montar(entradas)
  await esperarRecursos()
  await screen.findByRole("heading", { level: 4, name: "Recurso 1" }, ESPERA)
  await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
  const seccion = seccionDelTema(bloque(caso.titulo), caso.nombre)
  const verMas = await within(seccion).findByRole(
    "button",
    { name: `Ver más de ${caso.nombre}` },
    ESPERA,
  )
  const cursor = recursosDe(servidor.fetchMock, caso.bloque, caso.tema)[0]
  expect(cursor, "Precondición: la primera página de la sección").toBeDefined()
  const quinto = servidor.estado.recursos.filter(
    (r) =>
      r.bloque === caso.bloque &&
      (caso.tema === "sin-tema" ? r.tema === null : r.tema === caso.tema),
  )[4]
  servidor.estado.recursos = servidor.estado.recursos.filter((r) => r !== quinto)
  fireEvent.click(verMas)
  expect(await within(seccion).findByText(R3, undefined, ESPERA)).toBeInTheDocument()
  return { ...servidor, ...montaje }
}

describe("CL3-D23 · R3, «Vuelve a abrir Recursos», por cada camino", () => {
  it.each(CASOS_R3)(
    "CL3-D23 (a): en $titulo, pulsar «Recursos» estando ahí pide la primera página del tema en error (sin cursor); los temas sanos no piden nada",
    async (caso) => {
      const { fetchMock } = await conR3(caso)
      await reposar()
      const antes = recursosDe(fetchMock, caso.bloque, caso.tema).length
      const otroAntes = recursosDe(fetchMock, caso.otroBloque, caso.otroTema).length
      fireEvent.click(enLasSecciones("Recursos"))
      await waitFor(() => expect(screen.queryByText(R3)).toBeNull(), ESPERA)
      const nuevas = recursosDe(fetchMock, caso.bloque, caso.tema).slice(antes)
      expect(nuevas.length).toBeGreaterThan(0)
      expect(nuevas.every((url) => !url.searchParams.has("cursor"))).toBe(true)
      await reposar()
      expect(recursosDe(fetchMock, caso.otroBloque, caso.otroTema)).toHaveLength(otroAntes)
    },
  )

  it.each(CASOS_R3)(
    "CL3-D23 (b): en $titulo, ir a «Avisos» y volver antes de 30 s pide el tema y la frase desaparece",
    async (caso) => {
      const { fetchMock } = await conR3(caso)
      const antes = recursosDe(fetchMock, caso.bloque, caso.tema).length
      fireEvent.click(enLasSecciones("Avisos"))
      await screen.findByText("Publica el primer aviso de tu clase.", undefined, ESPERA)
      fireEvent.click(enLasSecciones("Recursos"))
      await esperarRecursos()
      await waitFor(() => expect(screen.queryByText(R3)).toBeNull(), ESPERA)
      expect(recursosDe(fetchMock, caso.bloque, caso.tema).length).toBeGreaterThan(antes)
    },
  )

  it.each(CASOS_R3)(
    "CL3-D23 (c): en $titulo, atrás y adelante del historial piden el tema y la frase desaparece",
    async (caso) => {
      const { fetchMock, router } = await conR3(caso, [AVISOS("maestro"), RECURSOS("maestro")])
      const antes = recursosDe(fetchMock, caso.bloque, caso.tema).length
      await act(() => router.navigate(-1))
      await screen.findByText("Publica el primer aviso de tu clase.", undefined, ESPERA)
      await act(() => router.navigate(1))
      await esperarRecursos()
      await waitFor(() => expect(screen.queryByText(R3)).toBeNull(), ESPERA)
      expect(recursosDe(fetchMock, caso.bloque, caso.tema).length).toBeGreaterThan(antes)
    },
  )

  it.each(CASOS_R3)(
    "CL3-D23 (d): en $titulo, con la frase a la vista no se ofrece «Ver más»",
    async (caso) => {
      await conR3(caso)
      expect(screen.queryByRole("button", { name: `Ver más de ${caso.nombre}` })).toBeNull()
    },
  )
})

// R6 en un recurso: 25 comentarios; al pedir "Ver más comentarios", el último de la primera página ya
// no está y el bloque dice R6.
const conR6 = async () => {
  const servidor = crearServidor("maestro")
  servidor.estado.comentarios[idRecurso(2)] = Array.from({ length: 25 }, (_, i) =>
    comentario(i + 1),
  )
  const r2 = servidor.estado.recursos[1]
  if (r2 === undefined) throw new Error("Precondición: el recurso 2")
  r2.comentarios = 25
  const montaje = await montar([AVISOS("maestro"), RECURSOS("maestro")])
  await esperarRecursos()
  await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
  fireEvent.click(within(filaDe("Recurso 2")).getByRole("button", { name: "Ver recurso" }))
  fireEvent.click(within(filaDe("Recurso 2")).getByRole("button", { name: "Ver comentarios (25)" }))
  const verMas = await screen.findByRole("button", { name: "Ver más comentarios" }, ESPERA)
  servidor.estado.comentarios[idRecurso(2)] = (
    servidor.estado.comentarios[idRecurso(2)] ?? []
  ).filter(({ id }) => id !== idComentario(20))
  fireEvent.click(verMas)
  expect(await screen.findByText(R6, undefined, ESPERA)).toBeInTheDocument()
  return { ...servidor, ...montaje }
}

const comentariosPedidos = (fetchMock: FetchMock) =>
  pedidas(fetchMock, `${API}/publicaciones/${idRecurso(2)}/comentarios`)

describe("CL3-D24 · R6 en los comentarios de un recurso", () => {
  it("CL3-D24 (a): «Ocultar comentarios» y «Ver comentarios (n)» piden la primera página y la frase desaparece", async () => {
    const { fetchMock } = await conR6()
    const antes = comentariosPedidos(fetchMock).length
    fireEvent.click(screen.getByRole("button", { name: "Ocultar comentarios" }))
    fireEvent.click(screen.getByRole("button", { name: "Ver comentarios (25)" }))
    expect(await screen.findByText("Comentario 1", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(R6)).toBeNull()
    const nuevas = comentariosPedidos(fetchMock).slice(antes)
    expect(nuevas.length).toBeGreaterThan(0)
    expect(nuevas.every((url) => !url.searchParams.has("cursor"))).toBe(true)
  })

  it("CL3-D24 (b): ir a otra sección, volver y reabrirlos los pide y la frase desaparece", async () => {
    const { fetchMock } = await conR6()
    const antes = comentariosPedidos(fetchMock).length
    fireEvent.click(enLasSecciones("Avisos"))
    await screen.findByText("Publica el primer aviso de tu clase.", undefined, ESPERA)
    fireEvent.click(enLasSecciones("Recursos"))
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    fireEvent.click(within(filaDe("Recurso 2")).getByRole("button", { name: "Ver recurso" }))
    fireEvent.click(
      within(filaDe("Recurso 2")).getByRole("button", { name: "Ver comentarios (25)" }),
    )
    expect(await screen.findByText("Comentario 1", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(R6)).toBeNull()
    expect(comentariosPedidos(fetchMock).length).toBeGreaterThan(antes)
  })

  it("CL3-D24 (c): con la frase a la vista no se ofrece «Ver más comentarios»", async () => {
    await conR6()
    expect(screen.queryByRole("button", { name: "Ver más comentarios" })).toBeNull()
  })
})

describe("CL3-D26 · rutas de «Recursos»", () => {
  it.each(["estudiante", "maestro", "admin"] as const)(
    "CL3-D26: %s en …/recursos monta «Recursos» con su sección activa",
    async (rol) => {
      crearServidor(rol)
      await montar([RECURSOS(rol)])
      await esperarRecursos()
      expect(enLasSecciones("Recursos")).toHaveAttribute("aria-current", "page")
      expect(enLasSecciones("Recursos")).toHaveAttribute("href", RECURSOS(rol))
    },
  )

  it.each(["maestro", "admin"] as const)(
    "CL3-D26: %s en …/recursos/:recursoId/editar monta «Editar recurso» y «Recursos» queda activa",
    async (rol) => {
      crearServidor(rol)
      await montar([`${RECURSOS(rol)}/${idRecurso(2)}/editar`])
      expect(
        await screen.findByRole("heading", { level: 2, name: "Editar recurso" }, ESPERA),
      ).toBeInTheDocument()
      expect(enLasSecciones("Recursos")).toHaveAttribute("aria-current", "page")
    },
  )

  it("CL3-D26: en la rama del estudiante, …/recursos/:recursoId/editar cae en `*`", async () => {
    const { fetchMock } = crearServidor("estudiante")
    const { router } = await montar([`${RECURSOS("estudiante")}/${idRecurso(2)}/editar`])
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"), ESPERA)
    expect(pedidas(fetchMock, `${API}/recursos/${idRecurso(2)}`)).toHaveLength(0)
  })
})

type Falla = "500" | "red"
type Lugar = "la lista de temas del bloque" | "la sección de un tema"

const CASOS_R9 = (["la lista de temas del bloque", "la sección de un tema"] as const).flatMap(
  (lugar) => (["500", "red"] as const).map((falla) => ({ lugar, falla })),
)

const esLaDelLugar = (lugar: Lugar, url: URL) => {
  if (lugar === "la lista de temas del bloque") {
    return url.pathname === `${API}/temas` && url.searchParams.get("seccion") === "docente"
  }
  return (
    url.pathname === `${API}/recursos` &&
    url.searchParams.get("bloque") === "docente" &&
    url.searchParams.get("tema") === TEMA_1
  )
}

const pedidasDelLugar = (fetchMock: FetchMock, lugar: Lugar) =>
  fetchMock.mock.calls
    .map(([entrada]) => new URL(String(entrada), "http://x"))
    .filter((url) => esLaDelLugar(lugar, url))

// R9: la primera carga de un lugar falla (también el reintento) y deja su MensajeError; después el
// servidor vuelve a responder.
const conR9 = async (lugar: Lugar, falla: Falla, entradas = [RECURSOS("maestro")]) => {
  const servidor = crearServidor("maestro")
  let fallando = true
  servidor.estado.falla = ({ url }) => {
    if (!fallando || !esLaDelLugar(lugar, url)) return null
    return falla === "red" ? sinRed() : errorJson(500, "ERROR_INTERNO", "Falló.")
  }
  const montaje = await montar(entradas)
  await esperarRecursos()
  expect(
    await within(bloque("Recursos del docente")).findByRole("alert", undefined, ESPERA),
  ).toBeInTheDocument()
  fallando = false
  return { ...servidor, ...montaje }
}

const sinError = () =>
  waitFor(() => {
    expect(within(bloque("Recursos del docente")).queryByRole("alert")).toBeNull()
    expect(screen.getByRole("heading", { level: 4, name: "Recurso 2" })).toBeInTheDocument()
  }, ESPERA)

describe("CL3-D27 · R9 en «Recursos», un caso por camino y por lugar", () => {
  it.each(CASOS_R9)(
    "CL3-D27 (a): primera carga de $lugar con $falla; pulsar «Recursos» estando ahí la vuelve a pedir y el texto desaparece; lo sano no se pide",
    async ({ lugar, falla }) => {
      const { fetchMock } = await conR9(lugar, falla)
      await reposar()
      const antes = pedidasDelLugar(fetchMock, lugar).length
      const sanosAntes = temasDe(fetchMock, "aprendizaje").length
      fireEvent.click(enLasSecciones("Recursos"))
      await sinError()
      expect(pedidasDelLugar(fetchMock, lugar).length).toBeGreaterThan(antes)
      expect(temasDe(fetchMock, "aprendizaje")).toHaveLength(sanosAntes)
    },
  )

  it.each(CASOS_R9)(
    "CL3-D27 (b): primera carga de $lugar con $falla; ir a «Avisos» y volver antes de 30 s la pide y el texto desaparece",
    async ({ lugar, falla }) => {
      const { fetchMock } = await conR9(lugar, falla)
      const antes = pedidasDelLugar(fetchMock, lugar).length
      fireEvent.click(enLasSecciones("Avisos"))
      await screen.findByText("Publica el primer aviso de tu clase.", undefined, ESPERA)
      fireEvent.click(enLasSecciones("Recursos"))
      await esperarRecursos()
      await sinError()
      expect(pedidasDelLugar(fetchMock, lugar).length).toBeGreaterThan(antes)
    },
  )

  it.each(CASOS_R9)(
    "CL3-D27 (c): primera carga de $lugar con $falla; atrás y adelante del historial la piden y el texto desaparece",
    async ({ lugar, falla }) => {
      const { fetchMock, router } = await conR9(lugar, falla, [
        AVISOS("maestro"),
        RECURSOS("maestro"),
      ])
      const antes = pedidasDelLugar(fetchMock, lugar).length
      await act(() => router.navigate(-1))
      await screen.findByText("Publica el primer aviso de tu clase.", undefined, ESPERA)
      await act(() => router.navigate(1))
      await esperarRecursos()
      await sinError()
      expect(pedidasDelLugar(fetchMock, lugar).length).toBeGreaterThan(antes)
    },
  )
})
