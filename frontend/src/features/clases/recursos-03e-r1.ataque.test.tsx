// Tester, CLASES-03e, ronda 1. La nota de temas fallidos al editar un recurso (Enmienda 13, decisión (1),
// con E13-9) contra la desviación `notifyOnChangeProps: "all"` de useTemasDelRecurso (indicación 1 de la
// verificación del manager) y un 409 que trae otro tema con la lectura de temas fallida. El servidor doble
// es el de recursos-enmienda13-03e.test.tsx, copiado (un archivo de pruebas no se importa desde otro).
// Ids CL3-4R1-nn, que siguen la numeración de dudas-03e-r1.ataque.test.tsx.
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

const EDITAR = `${BASES.maestro}/${CLASE_ID}/recursos/${idRecurso(2)}/editar`

const elRecurso = (estado: Estado) => {
  const encontrado = estado.recursos.find(({ id }) => id === idRecurso(2))
  if (encontrado === undefined) throw new Error("Precondición: el recurso 2")
  return encontrado
}

const abrirEdicion = async (cliente?: QueryClient, entradas = [EDITAR]) => {
  const montaje = await montar(entradas, cliente)
  await screen.findByRole("heading", { level: 2, name: "Editar recurso" }, ESPERA)
  return montaje
}

const botonGuardar = () => screen.getByRole("button", { name: "Guardar cambios" })

const NOTA_AL_EDITAR = "No pudimos cargar los temas. El recurso conserva su tema."

const esElTotalDeTemas = ({ metodo, url }: Llamada) =>
  metodo === "GET" && url.pathname === `${API}/temas` && !url.searchParams.has("seccion")

// Lo que edita cada perspectiva: el maestro, su recurso del docente (tema «Unidad 1»); el admin, uno de
// aprendizaje (tema «Unidad 2») que sí puede editar.
interface CasoDeEdicion {
  rol: "maestro" | "admin"
  n: number
  tema: string
}

const CASOS_DE_EDICION: readonly CasoDeEdicion[] = [
  { rol: "maestro", n: 2, tema: TEMA_1 },
  { rol: "admin", n: 1, tema: TEMA_2 },
]

const rutaDeEdicion = ({ rol, n }: CasoDeEdicion) =>
  `${BASES[rol]}/${CLASE_ID}/recursos/${idRecurso(n)}/editar`

const prepararEdicion = (caso: CasoDeEdicion) => {
  const servidor = crearServidor(caso.rol)
  const r = servidor.estado.recursos.find(({ id }) => id === idRecurso(caso.n))
  if (r === undefined) throw new Error("Precondición: el recurso que se edita")
  r.tema = caso.tema
  r.puedeEditar = true
  return servidor
}

const cuerpoDelPut = (fetchMock: FetchMock, n: number) =>
  llamadasDe(fetchMock, "PUT", `${API}/recursos/${idRecurso(n)}`).map(
    ({ cuerpo }) => (cuerpo as { temaId: string | null }).temaId,
  )

const MAESTRO_DOCENTE = CASOS_DE_EDICION[0]

// La lista total de temas en la caché, pedida al servidor doble con la consulta real: la respuesta que
// llegue después con los mismos datos es idéntica y TanStack Query conserva la misma referencia.
const ponerTemasIdenticos = async (cliente: QueryClient) => {
  const { consultaTemas } = await import("@/services/trabajoService")
  await cliente.fetchQuery(consultaTemas(CLASE_ID))
}

const datosDeTemas = async (cliente: QueryClient) => {
  const { claveTemas } = await import("@/services/trabajoService")
  return cliente.getQueryData(claveTemas(CLASE_ID))
}

describe("CL3-4R1 · E13-9 con la lista vieja idéntica (indicación 1)", () => {
  it("CL3-4R1-17: lista vieja idéntica en la caché, la lectura al abrir falla (500) y después una invalidación responde 200 con los mismos datos: aparece «Tema» con el tema del recurso y la nota se va", async () => {
    if (MAESTRO_DOCENTE === undefined) throw new Error("Precondición: el caso del maestro")
    const { estado, fetchMock } = prepararEdicion(MAESTRO_DOCENTE)
    const cliente = clienteDePrueba()
    await ponerTemasIdenticos(cliente)
    let falla = true
    estado.falla = (llamada) =>
      falla && esElTotalDeTemas(llamada) ? errorJson(500, "ERROR_INTERNO", "Falló.") : null
    await montar([rutaDeEdicion(MAESTRO_DOCENTE)], cliente)
    expect(await screen.findByText(NOTA_AL_EDITAR, undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByLabelText("Tema")).toBeNull()
    const antes = await datosDeTemas(cliente)
    expect(antes, "Precondición: la lista vieja sigue en la caché").toBeDefined()
    falla = false
    const { claveTemas } = await import("@/services/trabajoService")
    await act(() => cliente.invalidateQueries({ queryKey: claveTemas(CLASE_ID), exact: true }))
    // La respuesta trae los mismos datos: la referencia no cambia (el caso de la desviación).
    expect(await datosDeTemas(cliente)).toBe(antes)
    await waitFor(
      () => expect(screen.getByLabelText("Tema")).toHaveValue(MAESTRO_DOCENTE.tema),
      ESPERA,
    )
    expect(screen.queryByText(NOTA_AL_EDITAR)).toBeNull()
    expect(avisosDeError()).toEqual([])
    fireEvent.click(botonGuardar())
    await waitFor(() => expect(cuerpoDelPut(fetchMock, MAESTRO_DOCENTE.n)).toEqual([TEMA_1]))
  })

  it("CL3-4R1-18: lista vieja idéntica en la caché, la lectura al abrir falla sin red y el evento online la vuelve a pedir con los mismos datos: aparece «Tema» y la nota se va", async () => {
    if (MAESTRO_DOCENTE === undefined) throw new Error("Precondición: el caso del maestro")
    const { estado } = prepararEdicion(MAESTRO_DOCENTE)
    const cliente = clienteDePrueba()
    await ponerTemasIdenticos(cliente)
    let sinConexion = true
    estado.falla = (llamada) => (sinConexion && esElTotalDeTemas(llamada) ? sinRed() : null)
    await montar([rutaDeEdicion(MAESTRO_DOCENTE)], cliente)
    expect(await screen.findByText(NOTA_AL_EDITAR, undefined, ESPERA)).toBeInTheDocument()
    const antes = await datosDeTemas(cliente)
    act(() => {
      window.dispatchEvent(new Event("offline"))
    })
    sinConexion = false
    act(() => {
      window.dispatchEvent(new Event("online"))
    })
    await waitFor(
      () => expect(screen.getByLabelText("Tema")).toHaveValue(MAESTRO_DOCENTE.tema),
      ESPERA,
    )
    expect(await datosDeTemas(cliente)).toBe(antes)
    expect(screen.queryByText(NOTA_AL_EDITAR)).toBeNull()
  })
})

describe("CL3-4R1 · la nota tras un 409 que trae otro tema", () => {
  it("CL3-4R1-19: otra persona movió el recurso a «Unidad 2»; guardar da 409, la relectura de temas falla: la nota está y el segundo guardado envía «Unidad 2» con la versión nueva", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    await abrirEdicion(clienteDePrueba())
    await waitFor(() => expect(screen.getByLabelText("Tema")).toHaveValue(TEMA_1), ESPERA)
    Object.assign(elRecurso(estado), { tema: TEMA_2, version: 1 })
    estado.falla = (llamada) =>
      esElTotalDeTemas(llamada) ? errorJson(500, "ERROR_INTERNO", "Falló.") : null
    fireEvent.click(botonGuardar())
    expect(await screen.findByText(NOTA_AL_EDITAR, undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByLabelText("Tema")).toBeNull()
    await reposar()
    fireEvent.click(botonGuardar())
    await waitFor(() => expect(cuerpoDelPut(fetchMock, 2)).toHaveLength(2), ESPERA)
    const segundo = llamadasDe(fetchMock, "PUT", `${API}/recursos/${idRecurso(2)}`)[1]
    expect(segundo?.cuerpo).toMatchObject({ temaId: TEMA_2, version: 1 })
  })
})
