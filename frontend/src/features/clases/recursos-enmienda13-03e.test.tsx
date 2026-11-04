// CLASES-03e (Enmienda 13, decisiones (1) y (2) del humano): la nota de temas fallidos al editar un
// recurso, con E13-9 (CL3-E16), y el aviso del 404 al borrar un recurso (CL3-E17), con el router real
// y un servidor doble.
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
const RECURSOS = `${BASES.maestro}/${CLASE_ID}/recursos`
const AVISOS = `${BASES.maestro}/${CLASE_ID}`

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

const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
const botonGuardar = () => screen.getByRole("button", { name: "Guardar cambios" })
const portadoresDeError = () => document.querySelectorAll('[aria-invalid="true"]')

const NOTA_AL_EDITAR = "No pudimos cargar los temas. El recurso conserva su tema."
const NOTA_AL_CREAR = "No pudimos cargar los temas. El recurso se publicará sin tema."

const esElTotalDeTemas = ({ metodo, url }: Llamada) =>
  metodo === "GET" && url.pathname === `${API}/temas` && !url.searchParams.has("seccion")

type Falla = "500" | "red"
const FALLAS = ["500", "red"] as const
const fallaDe = (falla: Falla) =>
  falla === "red" ? sinRed() : errorJson(500, "ERROR_INTERNO", "Falló.")

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

const ponerTemasViejos = async (cliente: QueryClient) => {
  const { claveTemas } = await import("@/services/trabajoService")
  cliente.setQueryData(claveTemas(CLASE_ID), {
    temas: [{ id: TEMA_1, nombre: "Unidad 1", orden: 0, elementos: 1 }],
    sinTema: 0,
  })
}

const laNotaNoAnuncia = (nota: HTMLElement) => {
  expect(nota.closest("[role='alert'], [role='status']")).toBeNull()
  expect(nota.tagName).toBe("P")
}

const cuerpoDelPut = (fetchMock: FetchMock, n: number) =>
  llamadasDe(fetchMock, "PUT", `${API}/recursos/${idRecurso(n)}`).map(
    ({ cuerpo }) => (cuerpo as { temaId: string | null }).temaId,
  )

describe("CL3-E16 · la nota de temas fallidos al editar un recurso (Enmienda 13)", () => {
  const COMBINACIONES = CASOS_DE_EDICION.flatMap((caso) =>
    FALLAS.flatMap((falla) => [false, true].map((conCache) => ({ ...caso, falla, conCache }))),
  )

  it.each(COMBINACIONES)(
    "CL3-E16 (a): $rol con la lectura de temas al abrir en $falla (caché vieja: $conCache): sin campo «Tema», la nota sin rol ni aviso ni aria-invalid, y guardar envía el tema del recurso",
    async (combinacion) => {
      const { estado, fetchMock } = prepararEdicion(combinacion)
      estado.falla = (llamada) => (esElTotalDeTemas(llamada) ? fallaDe(combinacion.falla) : null)
      const cliente = clienteDePrueba()
      if (combinacion.conCache) await ponerTemasViejos(cliente)
      await montar([rutaDeEdicion(combinacion)], cliente)
      const nota = await screen.findByText(NOTA_AL_EDITAR, undefined, ESPERA)
      laNotaNoAnuncia(nota)
      expect(screen.queryByLabelText("Tema")).toBeNull()
      expect(screen.queryByText(NOTA_AL_CREAR)).toBeNull()
      expect(portadoresDeError()).toHaveLength(0)
      expect(avisosDeError()).toEqual([])
      fireEvent.click(botonGuardar())
      await waitFor(() =>
        expect(cuerpoDelPut(fetchMock, combinacion.n)).toEqual([combinacion.tema]),
      )
    },
  )

  it.each(CASOS_DE_EDICION)(
    "CL3-E16 (b): $rol con la lectura de temas pendiente no ve ni el campo ni ninguna nota",
    async (caso) => {
      const { estado } = prepararEdicion(caso)
      estado.falla = (llamada) =>
        esElTotalDeTemas(llamada) ? new Promise<Response>(() => undefined) : null
      await montar([rutaDeEdicion(caso)], clienteDePrueba())
      await screen.findByLabelText("Título del recurso", undefined, ESPERA)
      await reposar()
      expect(screen.queryByLabelText("Tema")).toBeNull()
      expect(screen.queryByText(NOTA_AL_EDITAR)).toBeNull()
      expect(screen.queryByText(NOTA_AL_CREAR)).toBeNull()
    },
  )

  it.each(CASOS_DE_EDICION)(
    "CL3-E16 (c): $rol · con la nota a la vista, una lectura posterior en vuelo la deja, una que falla también, y una correcta (invalidación de claveTemas) muestra el campo con el tema elegido; guardar lo envía",
    async (caso) => {
      const { estado, fetchMock } = prepararEdicion(caso)
      let modo: "falla" | "retener" | "bien" = "falla"
      let soltar: (respuesta: Response) => void = () => {
        throw new Error("Precondición: la lectura retenida no salió")
      }
      estado.falla = (llamada) => {
        if (!esElTotalDeTemas(llamada) || modo === "bien") return null
        if (modo === "falla") return errorJson(500, "ERROR_INTERNO", "Falló.")
        return new Promise<Response>((resolver) => {
          soltar = resolver
        })
      }
      const cliente = clienteDePrueba()
      await montar([rutaDeEdicion(caso)], cliente)
      await screen.findByText(NOTA_AL_EDITAR, undefined, ESPERA)
      const { claveTemas } = await import("@/services/trabajoService")

      // En vuelo: la nota sigue.
      modo = "retener"
      const totalesAntes = pedidas(fetchMock, `${API}/temas`).length
      void cliente.invalidateQueries({ queryKey: claveTemas(CLASE_ID), exact: true })
      await waitFor(() =>
        expect(pedidas(fetchMock, `${API}/temas`).length).toBeGreaterThan(totalesAntes),
      )
      await reposar()
      expect(screen.getByText(NOTA_AL_EDITAR)).toBeInTheDocument()
      expect(screen.queryByLabelText("Tema")).toBeNull()

      // Falla también: la nota sigue.
      await act(async () => {
        soltar(errorJson(500, "ERROR_INTERNO", "Falló."))
        await Promise.resolve()
      })
      await reposar()
      expect(screen.getByText(NOTA_AL_EDITAR)).toBeInTheDocument()
      expect(screen.queryByLabelText("Tema")).toBeNull()

      // Una correcta posterior: el campo con el tema del recurso y sin nota.
      modo = "bien"
      await act(() => cliente.invalidateQueries({ queryKey: claveTemas(CLASE_ID), exact: true }))
      await waitFor(() => expect(screen.getByLabelText("Tema")).toHaveValue(caso.tema), ESPERA)
      expect(screen.queryByText(NOTA_AL_EDITAR)).toBeNull()
      fireEvent.change(screen.getByLabelText("Tema"), { target: { value: "" } })
      fireEvent.change(screen.getByLabelText("Tema"), { target: { value: caso.tema } })
      fireEvent.click(botonGuardar())
      await waitFor(() => expect(cuerpoDelPut(fetchMock, caso.n)).toEqual([caso.tema]))
    },
  )

  it("CL3-E16 (c): con la nota a la vista por falta de red, recuperar la red (evento online) pide la lista y muestra el campo", async () => {
    const caso = CASOS_DE_EDICION[0]
    if (caso === undefined) throw new Error("Precondición: el caso del maestro")
    const { estado } = prepararEdicion(caso)
    let sinConexion = true
    estado.falla = (llamada) => (sinConexion && esElTotalDeTemas(llamada) ? sinRed() : null)
    await montar([rutaDeEdicion(caso)], clienteDePrueba())
    await screen.findByText(NOTA_AL_EDITAR, undefined, ESPERA)
    act(() => {
      window.dispatchEvent(new Event("offline"))
    })
    sinConexion = false
    act(() => {
      window.dispatchEvent(new Event("online"))
    })
    await waitFor(() => expect(screen.getByLabelText("Tema")).toHaveValue(caso.tema), ESPERA)
    expect(screen.queryByText(NOTA_AL_EDITAR)).toBeNull()
  })

  it("CL3-E16 (d): tras un 409 que reinicia el formulario y una nueva lectura de temas que falla, la nota está y el foco sigue en «Título del recurso»", async () => {
    const { estado } = crearServidor("maestro")
    await abrirEdicion(clienteDePrueba())
    await waitFor(() => expect(screen.getByLabelText("Tema")).toHaveValue(TEMA_1), ESPERA)
    escribir("Título del recurso", "Lo mío")
    Object.assign(elRecurso(estado), { titulo: "De otra persona", version: 1 })
    estado.falla = (llamada) =>
      esElTotalDeTemas(llamada) ? errorJson(500, "ERROR_INTERNO", "Falló.") : null
    fireEvent.click(botonGuardar())
    await waitFor(() =>
      expect(screen.getByLabelText("Título del recurso")).toHaveValue("De otra persona"),
    )
    expect(await screen.findByText(NOTA_AL_EDITAR, undefined, ESPERA)).toBeInTheDocument()
    expect(screen.getByLabelText("Título del recurso")).toHaveFocus()
    expect(screen.queryByLabelText("Tema")).toBeNull()
  })

  it.each(FALLAS)(
    "CL3-E16 (e): al crear, con la lista de temas en %s, sigue «…se publicará sin tema.» y nunca «…conserva su tema.»; pendiente, sin nota",
    async (falla) => {
      const { estado } = crearServidor("maestro")
      estado.falla = (llamada) => (esElTotalDeTemas(llamada) ? fallaDe(falla) : null)
      await montar([RECURSOS], clienteDePrueba())
      expect(await screen.findByText(NOTA_AL_CREAR, undefined, ESPERA)).toBeInTheDocument()
      expect(screen.queryByText(NOTA_AL_EDITAR)).toBeNull()
      cleanup()
      vi.unstubAllGlobals()
      const otro = crearServidor("maestro")
      otro.estado.falla = (llamada) =>
        esElTotalDeTemas(llamada) ? new Promise<Response>(() => undefined) : null
      await montar([RECURSOS], clienteDePrueba())
      await screen.findByLabelText("Título del recurso", undefined, ESPERA)
      await reposar()
      expect(screen.queryByText(NOTA_AL_CREAR)).toBeNull()
      expect(screen.queryByText(NOTA_AL_EDITAR)).toBeNull()
    },
  )
})

// Borrar un recurso que otra persona ya borró: la ruta responde PUBLICACION_NO_ENCONTRADA.
interface CasoDeBorrado {
  rol: "maestro" | "admin"
  bloque: string
  titulo: string
  vecina: string
}

const CASOS_DE_BORRADO: readonly CasoDeBorrado[] = [
  { rol: "maestro", bloque: "Recursos del docente", titulo: "Recurso 2", vecina: "Recurso 3" },
  { rol: "admin", bloque: "Recursos del docente", titulo: "Recurso 2", vecina: "Recurso 3" },
  { rol: "admin", bloque: "Recursos de aprendizaje", titulo: "Recurso 1", vecina: "Recurso 4" },
]

const filaDelRecurso = (titulo: string) => {
  const fila = screen.getByRole("heading", { level: 4, name: titulo }).closest("li")
  if (fila === null) throw new Error(`Precondición: la fila «${titulo}»`)
  return fila
}

describe("CL3-E17 · el 404 al borrar un recurso dice «Ese recurso ya no existe.» (Enmienda 13)", () => {
  it.each(CASOS_DE_BORRADO)(
    "CL3-E17: $rol en $bloque: un solo aviso «Ese recurso ya no existe.», nada con «publicación», la fila sale y el foco va al «Borrar recurso» de la vecina",
    async (caso) => {
      const { estado } = crearServidor(caso.rol)
      const primero = estado.recursos[0]
      if (primero === undefined) throw new Error("Precondición: el recurso 1")
      primero.puedeBorrar = caso.rol === "admin"
      estado.recursos.push(recurso(4, "aprendizaje", null))
      await montar([`${BASES[caso.rol]}/${CLASE_ID}/recursos`], clienteDePrueba())
      await screen.findByRole("heading", { level: 4, name: caso.vecina }, ESPERA)
      const fila = filaDelRecurso(caso.titulo)
      estado.recursos = estado.recursos.filter(({ titulo }) => titulo !== caso.titulo)
      fireEvent.click(within(fila).getByRole("button", { name: "Borrar recurso" }))
      fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar recurso" }))
      await waitFor(() => expect(avisosDeError()).toEqual(["Ese recurso ya no existe."]))
      await waitFor(() =>
        expect(screen.queryByRole("heading", { level: 4, name: caso.titulo })).toBeNull(),
      )
      expect(
        within(filaDelRecurso(caso.vecina)).getByRole("button", { name: "Borrar recurso" }),
      ).toHaveFocus()
      await reposar()
      expect(avisosDeError()).toEqual(["Ese recurso ya no existe."])
      expect(avisosDeError().some((texto) => /publicaci/i.test(texto))).toBe(false)
      expect(document.body.textContent).not.toMatch(/publicaci/i)
    },
  )

  it("CL3-E17: «atrás» hacia la edición del recurso borrado dice «Ese recurso ya no existe.», sin «publicación»", async () => {
    const { estado } = crearServidor("admin")
    const editarElDos = `${BASES.admin}/${CLASE_ID}/recursos/${idRecurso(2)}/editar`
    const recursosDelAdmin = `${BASES.admin}/${CLASE_ID}/recursos`
    const { router } = await montar([recursosDelAdmin, editarElDos], clienteDePrueba())
    await screen.findByLabelText("Título del recurso", undefined, ESPERA)
    fireEvent.click(screen.getByRole("link", { name: "Cancelar" }))
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    estado.recursos = estado.recursos.filter(({ id }) => id !== idRecurso(2))
    const fila = filaDelRecurso("Recurso 2")
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar recurso" }))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar recurso" }))
    await waitFor(() => expect(avisosDeError()).toEqual(["Ese recurso ya no existe."]))
    await act(() => router.navigate(-1))
    expect(await screen.findByRole("alert", undefined, ESPERA)).toHaveTextContent(
      "Ese recurso ya no existe.",
    )
    expect(document.body.textContent).not.toMatch(/publicaci/i)
  })

  it("CL3-E17: con 403 BORRADO_NO_PERMITIDO el aviso sigue siendo el del servidor", async () => {
    const { estado } = crearServidor("maestro")
    await montar([RECURSOS], clienteDePrueba())
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    estado.falla = ({ metodo }) =>
      metodo === "DELETE"
        ? errorJson(403, "BORRADO_NO_PERMITIDO", "No puedes borrar este recurso.")
        : null
    const fila = filaDelRecurso("Recurso 2")
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar recurso" }))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar recurso" }))
    await waitFor(() => expect(avisosDeError()).toEqual(["No puedes borrar este recurso."]))
  })

  it("CL3-E17: en Avisos, borrar un anuncio con 404 sigue avisando «Esa publicación ya no existe.»", async () => {
    const { estado } = crearServidor("maestro")
    const ANUNCIO = "1b1b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
    estado.falla = ({ metodo, url }) => {
      if (metodo === "GET" && url.pathname === `${API}/publicaciones`) {
        return respuestaJson(200, {
          publicaciones: [
            {
              id: ANUNCIO,
              tipo: "anuncio",
              titulo: null,
              texto: "Mañana no hay clase",
              autor: FIRMA_MAESTRO,
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
      if (metodo === "DELETE" && url.pathname === `${API}/publicaciones/${ANUNCIO}`) {
        return errorJson(404, "PUBLICACION_NO_ENCONTRADA", "Esa publicación ya no existe.")
      }
      return null
    }
    await montar([AVISOS], clienteDePrueba())
    await screen.findByText("Mañana no hay clase", undefined, ESPERA)
    fireEvent.click(screen.getByRole("button", { name: "Borrar publicación" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar" }))
    await waitFor(() => expect(avisosDeError()).toEqual(["Esa publicación ya no existe."]))
  })
})
