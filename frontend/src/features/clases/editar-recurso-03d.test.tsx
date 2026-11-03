// CLASES-03d (§D-8.5, §D-8.6, §D-14): «Editar recurso» con el router real: lectura fresca, guardar,
// el 409, lo que reemplaza la vista, la recarga fallida, VALIDACION fuera de contrato, O-16, R7, R9 en
// su lugar (5) y el título vacío (CL3-D11 a D14, D16, D17, D22, D25, D27 y D28 al editar).
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
const EDITAR = `${BASES.maestro}/${CLASE_ID}/recursos/${idRecurso(2)}/editar`
const RECURSOS = `${BASES.maestro}/${CLASE_ID}/recursos`
const AVISOS = `${BASES.maestro}/${CLASE_ID}`
const MODIFICADO =
  "Otra persona guardó este recurso mientras lo editabas. Te mostramos la versión actual."
const RECARGA_RED = "No pudimos actualizar el recurso. Puedes seguir editando; revisa tu conexión."
const RECARGA_SERVIDOR =
  "No pudimos actualizar el recurso. Puedes seguir editando; inténtalo de nuevo en un momento."
const RUTA_DEL_RECURSO = `${API}/recursos/${idRecurso(2)}`

const detalleDe = (r: RecursoDoble) => ({
  recurso: {
    ...deLaLista(r),
    version: r.version,
    tema: r.tema === null ? null : { id: r.tema, nombre: "Unidad 1" },
  },
})

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
const puts = (fetchMock: FetchMock) => llamadasDe(fetchMock, "PUT", RUTA_DEL_RECURSO)
const validacion = (mensaje: string) => errorJson(400, "VALIDACION", mensaje)
const portadoresDeError = () => document.querySelectorAll('[aria-invalid="true"]')
const archivo = (nombre: string) => new File(["x"], nombre, { type: "application/pdf" })
const elegirArchivos = (...archivos: File[]) =>
  fireEvent.change(screen.getByLabelText("Adjuntar archivos"), { target: { files: archivos } })
const esElPut = ({ metodo, url }: Llamada) => metodo === "PUT" && url.pathname === RUTA_DEL_RECURSO
const esElGet = ({ metodo, url }: Llamada) => metodo === "GET" && url.pathname === RUTA_DEL_RECURSO

describe("CL3-D11 · editar un recurso", () => {
  it("CL3-D11: el formulario nace con el recurso; «Guardar cambios» envía la versión y la lista final de archivoIds con un solo PUT; al éxito, el aviso y vuelve a Recursos", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    Object.assign(elRecurso(estado), {
      texto: "Lee el capítulo",
      version: 3,
      adjuntos: [adjunto(1, "a.pdf"), adjunto(2, "b.pdf")],
    })
    const { router } = await abrirEdicion()
    expect(screen.getByLabelText("Título del recurso")).toHaveValue("Recurso 2")
    expect(screen.getByLabelText("Descripción (opcional)")).toHaveValue("Lee el capítulo")
    await waitFor(() => expect(screen.getByLabelText("Tema")).toHaveValue(TEMA_1), ESPERA)
    fireEvent.click(screen.getByRole("button", { name: "Quitar a.pdf" }))
    expect(screen.getByRole("button", { name: "Quitar b.pdf" })).toHaveFocus()
    elegirArchivos(archivo("c.pdf"))
    const formulario = botonGuardar().closest("form")
    if (formulario === null) throw new Error("Precondición: el formulario")
    fireEvent.submit(formulario)
    fireEvent.submit(formulario)
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Cambios guardados"))
    await waitFor(() => expect(router.state.location.pathname).toBe(RECURSOS))
    expect(puts(fetchMock)).toHaveLength(1)
    const cuerpo = puts(fetchMock)[0]?.cuerpo as { archivoIds: string[] }
    expect(cuerpo).toEqual({
      titulo: "Recurso 2",
      texto: "Lee el capítulo",
      temaId: TEMA_1,
      archivoIds: [idArchivo(2), cuerpo.archivoIds[1]],
      version: 3,
    })
    expect(cuerpo.archivoIds).toHaveLength(2)
  })

  it("CL3-D11: lectura fresca al abrir: con el recurso viejo en caché, espera la lectura y nace con la versión nueva", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    const cliente = clienteDePrueba()
    const { claveRecurso } = await import("./data")
    cliente.setQueryData(claveRecurso(CLASE_ID, idRecurso(2)), detalleDe(elRecurso(estado)))
    await cliente.invalidateQueries({
      queryKey: claveRecurso(CLASE_ID, idRecurso(2)),
      refetchType: "none",
    })
    Object.assign(elRecurso(estado), { titulo: "Movido y nuevo", version: 5 })
    await montar([EDITAR], cliente)
    expect(await screen.findByText("Cargando el recurso…", undefined, ESPERA)).toBeInTheDocument()
    expect(await screen.findByLabelText("Título del recurso", undefined, ESPERA)).toHaveValue(
      "Movido y nuevo",
    )
    fireEvent.click(botonGuardar())
    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1))
    expect((puts(fetchMock)[0]?.cuerpo as { version: number }).version).toBe(5)
  })
})

describe("CL3-D12 · editar con 409 RECURSO_MODIFICADO", () => {
  it("CL3-D12: el aviso del servidor; «Guardar cambios» sigue en espera hasta la recarga; el formulario se reinicia con la versión nueva y el foco va a «Título del recurso»", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    await abrirEdicion()
    escribir("Título del recurso", "Lo mío")
    Object.assign(elRecurso(estado), { titulo: "De otra persona", version: 1 })
    let soltar: () => void = () => undefined
    let tras409 = false
    estado.falla = (llamada) => {
      if (esElPut(llamada)) tras409 = true
      if (!tras409 || !esElGet(llamada)) return null
      return new Promise<Response>((resolver) => {
        soltar = () => resolver(respuestaJson(200, detalleDe(elRecurso(estado))))
      })
    }
    fireEvent.click(botonGuardar())
    await waitFor(() => expect(avisosDeError()).toEqual([MODIFICADO]))
    await waitFor(() => expect(pedidas(fetchMock, RUTA_DEL_RECURSO).length).toBeGreaterThan(1))
    expect(botonGuardar()).toHaveAttribute("aria-busy", "true")
    act(() => soltar())
    await waitFor(() =>
      expect(screen.getByLabelText("Título del recurso")).toHaveValue("De otra persona"),
    )
    expect(screen.getByLabelText("Título del recurso")).toHaveFocus()
    expect(botonGuardar()).not.toHaveAttribute("aria-busy", "true")
    estado.falla = () => null
    fireEvent.click(botonGuardar())
    await waitFor(() => expect(puts(fetchMock)).toHaveLength(2))
    expect((puts(fetchMock)[1]?.cuerpo as { version: number }).version).toBe(1)
  })

  it("CL3-D12: si la recarga tras el 409 falla, lo escrito y la versión se conservan y sale el aviso de recarga fallida", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    await abrirEdicion(clienteDePrueba())
    escribir("Título del recurso", "Lo mío")
    elRecurso(estado).version = 1
    let tras409 = false
    estado.falla = (llamada) => {
      if (esElPut(llamada)) tras409 = true
      if (!tras409 || !esElGet(llamada)) return null
      return errorJson(500, "ERROR_INTERNO", "Falló.")
    }
    fireEvent.click(botonGuardar())
    await waitFor(() => expect(avisosDeError()).toEqual([MODIFICADO, RECARGA_RED]))
    await waitFor(() => expect(botonGuardar()).not.toHaveAttribute("aria-busy", "true"))
    expect(screen.getByLabelText("Título del recurso")).toHaveValue("Lo mío")
    fireEvent.click(botonGuardar())
    await waitFor(() => expect(puts(fetchMock)).toHaveLength(2))
    expect((puts(fetchMock)[1]?.cuerpo as { version: number }).version).toBe(0)
  })
})

describe("CL3-D13 · lo que reemplaza «Editar recurso»", () => {
  const raiz = () => {
    const alerta = screen.getByRole("alert")
    const contenedor = alerta.closest<HTMLElement>("[tabindex='-1']")
    if (contenedor === null) throw new Error("Precondición: la raíz de la vista")
    return contenedor
  }

  it.each([
    ["404", "Ese recurso ya no existe."],
    ["403 EDICION_NO_PERMITIDA", "No puedes editar este recurso."],
    ["403 SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase."],
  ])(
    "CL3-D13: al guardar con %s, un aviso, la vista se reemplaza por su mensaje con «Volver a Recursos» y el foco va a la raíz",
    async (caso, mensaje) => {
      const { estado } = crearServidor("maestro")
      await abrirEdicion(clienteDePrueba())
      estado.falla = (llamada) => {
        if (caso === "404" && esElPut(llamada)) {
          estado.recursos = estado.recursos.filter(({ id }) => id !== idRecurso(2))
          return null
        }
        if (caso === "403 EDICION_NO_PERMITIDA" && esElPut(llamada)) {
          elRecurso(estado).puedeEditar = false
          return errorJson(403, "EDICION_NO_PERMITIDA", "No puedes editar este recurso.")
        }
        if (caso === "403 SIN_ACCESO_A_LA_CLASE" && (esElPut(llamada) || esElGet(llamada))) {
          return errorJson(403, "SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.")
        }
        return null
      }
      botonGuardar().focus()
      fireEvent.click(botonGuardar())
      expect(await screen.findByRole("alert", undefined, ESPERA)).toHaveTextContent(mensaje)
      expect(screen.getByRole("link", { name: "Volver a Recursos" })).toHaveAttribute(
        "href",
        RECURSOS,
      )
      expect(screen.queryByLabelText("Título del recurso")).toBeNull()
      await waitFor(() => expect(raiz()).toHaveFocus())
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
  )

  it.each([
    ["404", errorJson(404, "RECURSO_NO_ENCONTRADO", "x"), "Ese recurso ya no existe."],
    ["un VALIDACION de recursoId", validacion("recursoId: no"), "Ese recurso ya no existe."],
    [
      "403 SIN_ACCESO_A_LA_CLASE",
      errorJson(403, "SIN_ACCESO_A_LA_CLASE", "x"),
      "No tienes acceso a esta clase.",
    ],
  ])(
    "CL3-D13: en la primera carga con %s, el mensaje y «Volver a Recursos»",
    async (_caso, respuesta, mensaje) => {
      const { estado } = crearServidor("maestro")
      estado.falla = (llamada) => (esElGet(llamada) ? respuesta.clone() : null)
      await montar([EDITAR], clienteDePrueba())
      expect(await screen.findByRole("alert", undefined, ESPERA)).toHaveTextContent(mensaje)
      expect(screen.getByRole("link", { name: "Volver a Recursos" })).toBeInTheDocument()
    },
  )

  it("CL3-D13: con `puedeEditar: false`, «No puedes editar este recurso.» y «Volver a Recursos»", async () => {
    const { estado } = crearServidor("maestro")
    elRecurso(estado).puedeEditar = false
    await montar([EDITAR], clienteDePrueba())
    expect(await screen.findByRole("alert", undefined, ESPERA)).toHaveTextContent(
      "No puedes editar este recurso.",
    )
    expect(screen.getByRole("link", { name: "Volver a Recursos" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Título del recurso")).toBeNull()
  })
})

describe("CL3-D14 · recarga fallida con el recurso en caché", () => {
  it("CL3-D14: un aviso por fallo con la variante por error; volver a montar la vista no lo repite y «Guardar cambios» envía el PUT", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    const cliente = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 30_000, refetchOnMount: false },
        mutations: { retry: false },
      },
    })
    const { claveRecurso } = await import("./data")
    const { vista } = await abrirEdicion(cliente)
    escribir("Título del recurso", "Lo mío")
    estado.falla = (llamada) => (esElGet(llamada) ? sinRed() : null)
    await act(() => cliente.refetchQueries({ queryKey: claveRecurso(CLASE_ID, idRecurso(2)) }))
    await waitFor(() => expect(avisosDeError()).toEqual([RECARGA_RED]))
    estado.falla = (llamada) => (esElGet(llamada) ? errorJson(429, "DEMASIADAS", "x") : null)
    await act(() => cliente.refetchQueries({ queryKey: claveRecurso(CLASE_ID, idRecurso(2)) }))
    await waitFor(() => expect(avisosDeError()).toEqual([RECARGA_RED, RECARGA_SERVIDOR]))
    expect(screen.getByLabelText("Título del recurso")).toHaveValue("Lo mío")

    vista.unmount()
    await abrirEdicion(cliente)
    await reposar()
    expect(avisosDeError()).toEqual([RECARGA_RED, RECARGA_SERVIDOR])
    fireEvent.click(botonGuardar())
    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1))
  })
})

describe("CL3-D16 · VALIDACION fuera de contrato al editar", () => {
  it.each([
    ["version:", `version: ${M}`, M],
    ["tipo:", `tipo: ${M}`, M],
    ["vacío", "", GENERICO],
    ["solo espacios", "   ", GENERICO],
    ["archivoIds.1:", `archivoIds.1: ${M}`, M],
  ])(
    "CL3-D16: con «%s» un solo aviso legible, ningún ErrorDeCampo, lo escrito se conserva y el botón sale de la espera",
    async (_caso, mensaje, esperado) => {
      const { estado } = crearServidor("maestro")
      estado.falla = (llamada) => (esElPut(llamada) ? validacion(mensaje) : null)
      await abrirEdicion(clienteDePrueba())
      escribir("Título del recurso", "Lo mío")
      fireEvent.click(botonGuardar())
      await waitFor(() => expect(avisosDeError()).toEqual([esperado]))
      await reposar()
      expect(avisosDeError()).toEqual([esperado])
      expect(portadoresDeError()).toHaveLength(0)
      expect(screen.getByLabelText("Título del recurso")).toHaveValue("Lo mío")
      expect(botonGuardar()).not.toHaveAttribute("aria-busy", "true")
    },
  )
})

describe("CL3-D17 · rechazo del servidor y después la validación local, al editar", () => {
  it("CL3-D17: tras un «titulo:» del servidor, un envío con el título vacío muestra solo «Escribe el título del recurso»", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    estado.falla = (llamada) => (esElPut(llamada) ? validacion(`titulo: ${M}`) : null)
    await abrirEdicion(clienteDePrueba())
    fireEvent.click(botonGuardar())
    await waitFor(() =>
      expect(screen.getByLabelText("Título del recurso")).toHaveAccessibleDescription(M),
    )
    escribir("Título del recurso", "")
    fireEvent.click(botonGuardar())
    expect(
      await screen.findByText("Escribe el título del recurso", undefined, ESPERA),
    ).toBeInTheDocument()
    expect(screen.queryByText(M)).toBeNull()
    expect(portadoresDeError()).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(puts(fetchMock)).toHaveLength(1)
  })
})

describe("CL3-D22 · O-16 al editar un recurso", () => {
  it("CL3-D22: montado, un VALIDACION de texto: va bajo la descripción y no avisa", async () => {
    const { estado } = crearServidor("maestro")
    estado.falla = (llamada) => (esElPut(llamada) ? validacion(`texto: ${M}`) : null)
    await abrirEdicion(clienteDePrueba())
    fireEvent.click(botonGuardar())
    await waitFor(() =>
      expect(screen.getByLabelText("Descripción (opcional)")).toHaveAccessibleDescription(M),
    )
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CL3-D22: desmontado con el PUT en vuelo, un VALIDACION de titulo: da un aviso", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    let soltar: (respuesta: Response) => void = () => undefined
    estado.falla = (llamada) =>
      esElPut(llamada)
        ? new Promise<Response>((resolver) => {
            soltar = resolver
          })
        : null
    const { vista } = await abrirEdicion(clienteDePrueba())
    fireEvent.click(botonGuardar())
    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1))
    vista.unmount()
    soltar(validacion(`titulo: ${M}`))
    await waitFor(() => expect(avisosDeError()).toEqual([M]))
    await reposar()
    expect(avisosDeError()).toEqual([M])
  })
})

describe("CL3-D25 · R7 al guardar un recurso", () => {
  it("CL3-D25: «Guardar cambios» tras un 503 sale de la espera, conserva lo escrito y un segundo clic guarda", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    let primera = true
    estado.falla = (llamada) => {
      if (!esElPut(llamada) || !primera) return null
      primera = false
      return errorJson(
        503,
        "SERVICIO_OCUPADO",
        "El servidor está ocupado. Inténtalo de nuevo en unos segundos.",
      )
    }
    const { router } = await abrirEdicion(clienteDePrueba())
    escribir("Título del recurso", "Lo mío")
    fireEvent.click(botonGuardar())
    await waitFor(() =>
      expect(avisosDeError()).toEqual([
        "El servidor está ocupado. Inténtalo de nuevo en unos segundos.",
      ]),
    )
    await waitFor(() => expect(botonGuardar()).not.toHaveAttribute("aria-busy", "true"))
    expect(screen.getByLabelText("Título del recurso")).toHaveValue("Lo mío")
    fireEvent.click(botonGuardar())
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Cambios guardados"))
    await waitFor(() => expect(router.state.location.pathname).toBe(RECURSOS))
    expect(puts(fetchMock)).toHaveLength(2)
  })
})

describe("CL3-D27 · R9 en «Editar recurso» (lugar 5)", () => {
  const conR9 = async (falla: "500" | "red", entradas = [EDITAR]) => {
    const servidor = crearServidor("maestro")
    let fallando = true
    servidor.estado.falla = (llamada) => {
      if (!fallando || !esElGet(llamada)) return null
      return falla === "red" ? sinRed() : errorJson(500, "ERROR_INTERNO", "Falló.")
    }
    const montaje = await montar(entradas)
    expect(await screen.findByRole("alert", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Volver a Recursos" })).toBeInTheDocument()
    fallando = false
    return { ...servidor, ...montaje }
  }

  const formularioALaVista = () =>
    waitFor(() => {
      expect(screen.getByLabelText("Título del recurso")).toHaveValue("Recurso 2")
      expect(screen.queryByRole("alert")).toBeNull()
    }, ESPERA)

  it.each(["500", "red"] as const)(
    "CL3-D27 (b): con %s, ir a «Avisos» y volver a entrar antes de 30 s pide el recurso y el texto desaparece",
    async (falla) => {
      const { fetchMock, router } = await conR9(falla)
      const antes = pedidas(fetchMock, RUTA_DEL_RECURSO).length
      await act(() => router.navigate(AVISOS))
      await screen.findByText("Publica el primer aviso de tu clase.", undefined, ESPERA)
      await act(() => router.navigate(EDITAR))
      await formularioALaVista()
      expect(pedidas(fetchMock, RUTA_DEL_RECURSO).length).toBeGreaterThan(antes)
    },
  )

  it.each(["500", "red"] as const)(
    "CL3-D27 (c): con %s, atrás y adelante del historial piden el recurso y el texto desaparece",
    async (falla) => {
      const { fetchMock, router } = await conR9(falla, [AVISOS, EDITAR])
      const antes = pedidas(fetchMock, RUTA_DEL_RECURSO).length
      await act(() => router.navigate(-1))
      await screen.findByText("Publica el primer aviso de tu clase.", undefined, ESPERA)
      await act(() => router.navigate(1))
      await formularioALaVista()
      expect(pedidas(fetchMock, RUTA_DEL_RECURSO).length).toBeGreaterThan(antes)
    },
  )

  it.each(["500", "red"] as const)(
    "CL3-D27: con %s, «Volver a Recursos» y volver a entrar por «Editar recurso» pide el recurso y el texto desaparece",
    async (falla) => {
      const { fetchMock } = await conR9(falla)
      const antes = pedidas(fetchMock, RUTA_DEL_RECURSO).length
      fireEvent.click(screen.getByRole("link", { name: "Volver a Recursos" }))
      const fila = await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
      const enlace = fila.closest("li")?.querySelector<HTMLElement>("a")
      if (enlace === null || enlace === undefined) throw new Error("Precondición: «Editar recurso»")
      expect(enlace).toHaveTextContent("Editar recurso")
      fireEvent.click(enlace)
      await formularioALaVista()
      expect(pedidas(fetchMock, RUTA_DEL_RECURSO).length).toBeGreaterThan(antes)
    },
  )
})

describe("CL3-D28 · el título vacío al editar", () => {
  it.each(["", "   ", "ㅤ", "\u{FEFF}\u{3000} "])(
    "CL3-D28: con el título «%s», «Escribe el título del recurso» bajo el campo, ningún PUT; lo escrito y los archivos se conservan",
    async (titulo) => {
      const { fetchMock } = crearServidor("maestro")
      await abrirEdicion(clienteDePrueba())
      escribir("Título del recurso", titulo)
      escribir("Descripción (opcional)", "Se queda")
      elegirArchivos(archivo("a.pdf"))
      fireEvent.click(botonGuardar())
      expect(
        await screen.findByText("Escribe el título del recurso", undefined, ESPERA),
      ).toBeInTheDocument()
      expect(screen.getByLabelText("Título del recurso")).toHaveAttribute("aria-invalid", "true")
      expect(screen.queryByText("Escribe el título del material")).toBeNull()
      expect(screen.getByLabelText("Descripción (opcional)")).toHaveValue("Se queda")
      expect(screen.getByRole("button", { name: "Quitar a.pdf" })).toBeInTheDocument()
      expect(botonGuardar()).not.toHaveAttribute("aria-busy", "true")
      await reposar()
      expect(puts(fetchMock)).toHaveLength(0)
    },
  )
})

describe("corrección de la ronda 1 de 03d (T-01 y T-02)", () => {
  it("T-01: un 409 con «Editar recurso» desmontada da un aviso y no vuelve a pedir el recurso", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    let soltar: (respuesta: Response) => void = () => undefined
    estado.falla = (llamada) =>
      esElPut(llamada)
        ? new Promise<Response>((resolver) => {
            soltar = resolver
          })
        : null
    const { vista } = await abrirEdicion(clienteDePrueba())
    fireEvent.click(botonGuardar())
    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1))
    const lecturas = pedidas(fetchMock, RUTA_DEL_RECURSO).length
    vista.unmount()
    soltar(errorJson(409, "RECURSO_MODIFICADO", MODIFICADO))
    await waitFor(() => expect(avisosDeError()).toEqual([MODIFICADO]))
    await reposar()
    expect(pedidas(fetchMock, RUTA_DEL_RECURSO)).toHaveLength(lecturas)
    expect(avisosDeError()).toEqual([MODIFICADO])
  })

  const conTemasViejos = async (
    respuestaDeLaRecarga: () => Promise<Response> | Response | null,
  ) => {
    const servidor = crearServidor("maestro")
    const cliente = clienteDePrueba()
    const { claveTemas } = await import("@/services/trabajoService")
    // La lista total en caché, fresca y anterior al recurso: no tiene «Unidad 3».
    cliente.setQueryData(claveTemas(CLASE_ID), {
      temas: [
        { id: TEMA_1, nombre: "Unidad 1", orden: 0, elementos: 1 },
        { id: TEMA_2, nombre: "Unidad 2", orden: 1, elementos: 0 },
      ],
      sinTema: 0,
    })
    const TEMA_3 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0003"
    servidor.estado.temas = [...servidor.estado.temas, { id: TEMA_3, nombre: "Unidad 3" }]
    elRecurso(servidor.estado).tema = TEMA_3
    servidor.estado.falla = ({ metodo, url }) =>
      metodo === "GET" && url.pathname === `${API}/temas` && !url.searchParams.has("seccion")
        ? respuestaDeLaRecarga()
        : null
    await abrirEdicion(cliente)
    return { ...servidor, TEMA_3 }
  }

  it("T-02: al abrir la edición se vuelven a pedir los temas; mientras no llegan, el campo no se muestra y guardar conserva el tema del recurso", async () => {
    const { fetchMock, TEMA_3 } = await conTemasViejos(() => new Promise<Response>(() => undefined))
    await waitFor(() =>
      expect(
        pedidas(fetchMock, `${API}/temas`).filter((url) => !url.searchParams.has("seccion")),
      ).toHaveLength(1),
    )
    expect(screen.queryByLabelText("Tema")).toBeNull()
    escribir("Título del recurso", "Otro título")
    fireEvent.click(botonGuardar())
    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1))
    expect((puts(fetchMock)[0]?.cuerpo as { temaId: string | null }).temaId).toBe(TEMA_3)
  })

  it("T-02: si la recarga de los temas falla, el campo no se muestra y guardar conserva el tema del recurso", async () => {
    const { fetchMock, TEMA_3 } = await conTemasViejos(() =>
      errorJson(500, "ERROR_INTERNO", "Falló."),
    )
    await reposar()
    expect(screen.queryByLabelText("Tema")).toBeNull()
    fireEvent.click(botonGuardar())
    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1))
    expect((puts(fetchMock)[0]?.cuerpo as { temaId: string | null }).temaId).toBe(TEMA_3)
  })

  it("T-02: cuando la lista nueva llega con el tema del recurso, el campo lo muestra elegido y guardar lo conserva", async () => {
    const servidor = await conTemasViejos(() => null)
    const { fetchMock, TEMA_3 } = servidor
    await waitFor(() => expect(screen.getByLabelText("Tema")).toHaveValue(TEMA_3), ESPERA)
    fireEvent.click(botonGuardar())
    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1))
    expect((puts(fetchMock)[0]?.cuerpo as { temaId: string | null }).temaId).toBe(TEMA_3)
  })
})

describe("corrección de la ronda 2 de 03d (T-03, T-04 y T-05)", () => {
  const TEMA_3 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0003"
  const ACTIVIDADES = `${BASES.maestro}/${CLASE_ID}/trabajo`

  const totalDeTemas = ({ metodo, url }: Llamada) =>
    metodo === "GET" && url.pathname === `${API}/temas` && !url.searchParams.has("seccion")

  const pedidasDelTotal = (fetchMock: FetchMock) =>
    pedidas(fetchMock, `${API}/temas`).filter((url) => !url.searchParams.has("seccion"))

  // Otra persona crea «Unidad 3» y mueve ahí el recurso 2 (sube su versión).
  const moverEnElServidor = (estado: Estado) => {
    estado.temas = [...estado.temas, { id: TEMA_3, nombre: "Unidad 3" }]
    const r = elRecurso(estado)
    r.tema = TEMA_3
    r.version += 1
  }

  // La lista total que ya está en vuelo al abrir: la responde el servidor como estaba al pedirla.
  const retenerLaPrimeraDelTotal = (estado: Estado) => {
    let soltar: () => void = () => {
      throw new Error("Precondición: la lista total no se pidió antes de abrir")
    }
    let primera = true
    estado.falla = (llamada) => {
      if (!totalDeTemas(llamada) || !primera) return null
      primera = false
      const vieja = respuestaJson(200, {
        temas: estado.temas.map((tema, orden) => ({ ...tema, orden, elementos: 0 })),
        sinTema: 0,
      })
      return new Promise<Response>((resolver) => {
        soltar = () => resolver(vieja)
      })
    }
    return () => soltar()
  }

  const guardarSoloElTitulo = async (fetchMock: FetchMock) => {
    await waitFor(() =>
      expect(screen.getByLabelText("Título del recurso")).toHaveValue("Recurso 2"),
    )
    escribir("Título del recurso", "Solo el título")
    fireEvent.click(botonGuardar())
    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1), ESPERA)
    return (puts(fetchMock)[0]?.cuerpo as { temaId: string | null }).temaId
  }

  it("T-03: la lista total que «Actividades de aprendizaje» pidió antes de abrir llega después: no confirma «Sin tema» y guardar conserva el tema del recurso", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    const soltarLaVieja = retenerLaPrimeraDelTotal(estado)
    const { router } = await montar([ACTIVIDADES], clienteDePrueba())
    await waitFor(() => expect(pedidasDelTotal(fetchMock)).toHaveLength(1), ESPERA)
    moverEnElServidor(estado)
    await act(() => router.navigate(EDITAR))
    await screen.findByLabelText("Título del recurso", undefined, ESPERA)
    await act(async () => {
      soltarLaVieja()
      await Promise.resolve()
    })
    await reposar()
    expect(await guardarSoloElTitulo(fetchMock)).toBe(TEMA_3)
  })

  it("T-03: con una lista en caché y su recarga en vuelo desde antes de abrir, la que llega no confirma; guardar conserva el tema del recurso", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    const cliente = clienteDePrueba()
    const { router } = await montar([RECURSOS], cliente)
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    await waitFor(() => expect(pedidasDelTotal(fetchMock)).toHaveLength(1), ESPERA)
    const soltarLaVieja = retenerLaPrimeraDelTotal(estado)
    const { claveTemas } = await import("@/services/trabajoService")
    void cliente.invalidateQueries({ queryKey: claveTemas(CLASE_ID), exact: true })
    await waitFor(() => expect(pedidasDelTotal(fetchMock)).toHaveLength(2), ESPERA)
    moverEnElServidor(estado)
    await act(() => router.navigate(EDITAR))
    await screen.findByLabelText("Título del recurso", undefined, ESPERA)
    await act(async () => {
      soltarLaVieja()
      await Promise.resolve()
    })
    await reposar()
    expect(await guardarSoloElTitulo(fetchMock)).toBe(TEMA_3)
  })

  it("T-03: volver a abrir la edición vuelve a pedir la lista total de temas", async () => {
    const { fetchMock } = crearServidor("maestro")
    const { router } = await abrirEdicion(clienteDePrueba())
    await waitFor(() => expect(screen.getByLabelText("Tema")).toHaveValue(TEMA_1), ESPERA)
    const antes = pedidasDelTotal(fetchMock).length
    await act(() => router.navigate(RECURSOS))
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    await act(() => router.navigate(EDITAR))
    await screen.findByLabelText("Título del recurso", undefined, ESPERA)
    await waitFor(() => expect(pedidasDelTotal(fetchMock).length).toBeGreaterThan(antes), ESPERA)
    await waitFor(() => expect(screen.getByLabelText("Tema")).toHaveValue(TEMA_1), ESPERA)
  })

  it("T-04: tras un 409 con la vista desmontada, volver antes de 30 s pide el recurso y nace con la versión del servidor", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    let soltar: (respuesta: Response) => void = () => undefined
    estado.falla = (llamada) =>
      esElPut(llamada)
        ? new Promise<Response>((resolver) => {
            soltar = resolver
          })
        : null
    const { router } = await abrirEdicion(clienteDePrueba())
    fireEvent.click(botonGuardar())
    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1))
    Object.assign(elRecurso(estado), { titulo: "Cambio ajeno", version: 1 })
    await act(() => router.navigate(AVISOS))
    await screen.findByText("Publica el primer aviso de tu clase.", undefined, ESPERA)
    const lecturas = pedidas(fetchMock, RUTA_DEL_RECURSO).length
    soltar(errorJson(409, "RECURSO_MODIFICADO", MODIFICADO))
    await waitFor(() => expect(avisosDeError()).toEqual([MODIFICADO]))
    await reposar()
    expect(pedidas(fetchMock, RUTA_DEL_RECURSO)).toHaveLength(lecturas)
    estado.falla = () => null
    await act(() => router.navigate(EDITAR))
    await waitFor(
      () => expect(screen.getByLabelText("Título del recurso")).toHaveValue("Cambio ajeno"),
      ESPERA,
    )
    expect(pedidas(fetchMock, RUTA_DEL_RECURSO).length).toBeGreaterThan(lecturas)
  })

  it("T-05: tras borrar con 404 un recurso que ya no existe, «atrás» a su edición dice «Ese recurso ya no existe.»", async () => {
    const { estado } = crearServidor("maestro")
    const { router } = await montar([RECURSOS, EDITAR], clienteDePrueba())
    await screen.findByLabelText("Título del recurso", undefined, ESPERA)
    fireEvent.click(screen.getByRole("link", { name: "Cancelar" }))
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    estado.recursos = estado.recursos.filter(({ id }) => id !== idRecurso(2))
    const fila = screen.getByRole("heading", { level: 4, name: "Recurso 2" }).closest("li")
    if (fila === null) throw new Error("Precondición: la fila del recurso 2")
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar recurso" }))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar recurso" }))
    await waitFor(() => expect(avisosDeError()).toEqual(["Esa publicación ya no existe."]))
    await act(() => router.navigate(-1))
    expect(await screen.findByRole("alert", undefined, ESPERA)).toHaveTextContent(
      "Ese recurso ya no existe.",
    )
    expect(screen.queryByLabelText("Título del recurso")).toBeNull()
  })

  it("T-05: tras un 403 al borrar, la edición del recurso queda vieja: al abrirla se vuelve a pedir", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    const { router } = await montar([RECURSOS, EDITAR], clienteDePrueba())
    await screen.findByLabelText("Título del recurso", undefined, ESPERA)
    fireEvent.click(screen.getByRole("link", { name: "Cancelar" }))
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    estado.falla = ({ metodo }) =>
      metodo === "DELETE"
        ? errorJson(403, "BORRADO_NO_PERMITIDO", "No puedes borrar este recurso.")
        : null
    const fila = screen.getByRole("heading", { level: 4, name: "Recurso 2" }).closest("li")
    if (fila === null) throw new Error("Precondición: la fila del recurso 2")
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar recurso" }))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar recurso" }))
    await waitFor(() => expect(avisosDeError()).toEqual(["No puedes borrar este recurso."]))
    const lecturas = pedidas(fetchMock, RUTA_DEL_RECURSO).length
    await act(() => router.navigate(EDITAR))
    await screen.findByLabelText("Título del recurso", undefined, ESPERA)
    await waitFor(() =>
      expect(pedidas(fetchMock, RUTA_DEL_RECURSO).length).toBeGreaterThan(lecturas),
    )
  })
})
