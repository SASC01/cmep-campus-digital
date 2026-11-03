// Tester, CLASES-03d, ronda 1. «Recursos» y «Editar recurso» con el router real (`rutas`) y un
// servidor doble en memoria. Frentes (indicaciones 2 a 8 de la verificación del resumen de 03d):
// el foco al borrar con 403 y 404 (y el último de una sección), "Ver más" sin red y sus combinaciones,
// el mismo tema en los dos bloques, la guarda de redirección en publicar, guardar y borrar, los
// puntos de ataque de 03d del plan (409 tras 409, 409 con la vista desmontada, la recarga tras el 409
// con un 404, O-16 durante la renovación, el limitador de 6 con dos bloques, borrar con los
// comentarios abiertos), el tema al editar con la lista pendiente, fallida o vieja (temaVigente) y la
// rama sin salida de recursoNuevoValidado. Sin selectores de clases de estilo: rol, etiqueta, texto
// accesible o los atributos de datos de la fila. La vista no muestra textos relativos al tiempo: sin
// reloj.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ID_DEL_AVISO_DE_RECARGA_DE_RECURSOS } from "./data"
import { recursoEditadoValidado, recursoNuevoValidado } from "./lib"

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/maestro") }))
vi.mock("@/services/navegacion", () => navegacion)

type Rol = "estudiante" | "maestro" | "admin"
type Bloque = "aprendizaje" | "docente"

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const API = `/api/clases/${CLASE_ID}`
const idTema = (n: number) => `8a8b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const idRecurso = (n: number) => `6a6b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const idComentario = (n: number) => `7a7b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
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
const MENSAJE_409 =
  "Otra persona guardó este recurso mientras lo editabas. Te mostramos la versión actual."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorJson = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface RecursoDoble {
  id: string
  titulo: string
  texto: string
  autor: typeof FIRMA_MAESTRO
  creadoEn: string
  bloque: Bloque
  tema: string | null
  adjuntos: never[]
  comentarios: number
  puedeEditar: boolean
  puedeBorrar: boolean
  puedeMover: boolean
  version: number
}

const recurso = (
  n: number,
  bloque: Bloque,
  tema: string | null,
  extra: Partial<RecursoDoble> = {},
): RecursoDoble => ({
  id: idRecurso(n),
  titulo: `Recurso ${String(n)}`,
  texto: "",
  autor: bloque === "aprendizaje" ? FIRMA_ADMIN : FIRMA_MAESTRO,
  creadoEn: CREADO_EN,
  bloque,
  tema,
  adjuntos: [],
  comentarios: 0,
  puedeEditar: true,
  puedeBorrar: true,
  puedeMover: true,
  version: 0,
  ...extra,
})

interface Llamada {
  metodo: string
  url: URL
  cuerpo: unknown
  signal: AbortSignal | undefined
}

interface Estado {
  temas: { id: string; nombre: string }[]
  recursos: RecursoDoble[]
  comentarios: Record<string, { id: string; texto: string }[]>
  // Respuesta propia para una petición (null: la de siempre). Va antes de todo salvo /api/me.
  falla: (llamada: Llamada) => Response | Promise<Response> | null
  inesperadas: string[]
}

// Una respuesta retenida que, como fetch, se rechaza si se aborta su señal (así el limitador de
// "Recursos" libera su lugar al desmontarse la sección).
const retenida = (signal: AbortSignal | undefined) => {
  let soltar: (respuesta: Response) => void = () => {
    throw new Error("Precondición: la respuesta retenida no se creó")
  }
  let rechazar: (error: unknown) => void = () => undefined
  const promesa = new Promise<Response>((resolver, fallar) => {
    soltar = resolver
    rechazar = fallar
  })
  signal?.addEventListener("abort", () => rechazar(new DOMException("Aborted", "AbortError")))
  return { promesa, soltar: (respuesta: Response) => soltar(respuesta) }
}

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

const crearServidor = (rol: Rol, inicial: Partial<Pick<Estado, "temas" | "recursos">> = {}) => {
  const estado: Estado = {
    temas: inicial.temas ?? [
      { id: idTema(1), nombre: "Unidad 1" },
      { id: idTema(2), nombre: "Unidad 2" },
    ],
    recursos: inicial.recursos ?? [
      recurso(2, "docente", idTema(1)),
      recurso(3, "docente", idTema(1)),
    ],
    comentarios: {},
    falla: () => null,
    inesperadas: [],
  }
  let siguienteId = 500
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
    const propia = estado.falla({ metodo, url, cuerpo, signal: init?.signal ?? undefined })
    if (propia !== null) return propia
    if (url.pathname === "/api/auth/refrescar") {
      return respuestaJson(200, { tokenAcceso: "restaurado" })
    }
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
      if (r === null) return errorJson(400, "VALIDACION", "cursor: no es válido")
      return respuestaJson(200, { recursos: r.pagina.map(deLaLista), siguienteCursor: r.siguiente })
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
        version: number
      }
      if (datos.version !== encontrado.version) {
        return errorJson(409, "RECURSO_MODIFICADO", MENSAJE_409)
      }
      encontrado.titulo = datos.titulo
      encontrado.texto = datos.texto
      encontrado.tema = datos.temaId
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
        const lista = estado.comentarios[id] ?? []
        const r = paginar(lista, url)
        if (r === null) return errorJson(400, "VALIDACION", "cursor: no es válido")
        return respuestaJson(200, {
          comentarios: r.pagina.map((c) => ({
            id: c.id,
            texto: c.texto,
            autor: FIRMA_MAESTRO,
            creadoEn: CREADO_EN,
            propio: false,
            puedeBorrar: false,
          })),
          siguienteCursor: r.siguiente,
        })
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
    estado.inesperadas.push(`${metodo} ${url.pathname}${url.search}`)
    return errorJson(500, "ERROR_INTERNO", "no esperada")
  })
  vi.stubGlobal("fetch", fetchMock)
  return { estado, fetchMock }
}

type FetchMock = ReturnType<typeof crearServidor>["fetchMock"]

const llamadas = (fetchMock: FetchMock) =>
  fetchMock.mock.calls.map(([entrada, init]) => ({
    metodo: init?.method ?? "GET",
    url: new URL(String(entrada), "http://x"),
    cuerpo: typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined,
  }))

const llamadasA = (fetchMock: FetchMock, metodo: string, pathname: string) =>
  llamadas(fetchMock).filter((l) => l.metodo === metodo && l.url.pathname === pathname)

const clienteDePrueba = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } },
  })

const montar = async (entrada: string, cliente = clienteDePrueba()) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [entrada] })
  const vista = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, vista, cliente }
}

const reposar = (ms = 120) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))

const bloque = (titulo: string) => {
  const encabezado = screen.getByRole("heading", { level: 2, name: titulo })
  const seccion = encabezado.closest("section")
  if (seccion === null) throw new Error(`Precondición: el bloque «${titulo}»`)
  return seccion
}
const encabezadoDelBloque = (titulo: string) =>
  screen.getByRole("heading", { level: 2, name: titulo })
const DOCENTE = "Recursos del docente"
const APRENDIZAJE = "Recursos de aprendizaje"

const encabezadoDeSeccion = (titulo: string, tema: string) =>
  within(bloque(titulo)).getByRole("heading", { level: 3, name: new RegExp(`^${tema} `) })

const filaDe = (titulo: string) => {
  const encabezado = screen.getByRole("heading", { level: 4, name: titulo })
  const fila = encabezado.closest("li")
  if (fila === null) throw new Error(`Precondición: la fila de «${titulo}»`)
  return fila
}

const enfocarYPulsar = (boton: HTMLElement) => {
  act(() => boton.focus())
  fireEvent.click(boton)
}

// Pide borrar «titulo» y deja el foco en «Sí, borrar recurso», como lo dejaría la persona.
const pedirBorrar = async (titulo: string) => {
  enfocarYPulsar(within(filaDe(titulo)).getByRole("button", { name: "Borrar recurso" }))
  const si = await within(filaDe(titulo)).findByRole("button", { name: "Sí, borrar recurso" })
  enfocarYPulsar(si)
}

const foco = () => document.activeElement
const errores = () => aviso.error.mock.calls
const exitos = () => aviso.success.mock.calls.map(([texto]) => String(texto))

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
  navegacion.irA.mockClear()
})

const RUTA_RECURSOS = (rol: Rol) => `${BASES[rol]}/${CLASE_ID}/recursos`
const RUTA_EDITAR = (rol: Rol, n: number) =>
  `${BASES[rol]}/${CLASE_ID}/recursos/${idRecurso(n)}/editar`
const esDelRecurso = (url: URL, n: number) => url.pathname.endsWith(`/${idRecurso(n)}`)

// ---------------------------------------------------------------------------------------------------
// Indicación 2: el foco al borrar con 403 y 404, también con el último recurso de una sección.

describe("CL3-3R1 · el foco al borrar un recurso (indicación 2)", () => {
  it("CL3-3R1-01: con 403 BORRADO_NO_PERMITIDO la fila sigue sin «Borrar recurso», un aviso, y el foco va al h3 de su sección, nunca a <body>", async () => {
    const { estado } = crearServidor("maestro")
    estado.falla = ({ metodo, url }) => {
      if (metodo !== "DELETE" || !esDelRecurso(url, 2)) return null
      const fila = estado.recursos.find(({ id }) => id === idRecurso(2))
      if (fila !== undefined) fila.puedeBorrar = false
      return errorJson(403, "BORRADO_NO_PERMITIDO", "No puedes borrar este recurso.")
    }
    await montar(RUTA_RECURSOS("maestro"))
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    await pedirBorrar("Recurso 2")
    await waitFor(
      () =>
        expect(
          within(filaDe("Recurso 2")).queryByRole("button", { name: /borrar recurso/i }),
        ).toBeNull(),
      ESPERA,
    )
    await reposar()
    expect(errores().map(([texto]) => texto)).toEqual(["No puedes borrar este recurso."])
    expect(foco()).not.toBe(document.body)
    expect(foco()).toBe(encabezadoDeSeccion(DOCENTE, "Unidad 1"))
  })

  it("CL3-3R1-02: con 404 la fila desaparece, un aviso, y el foco va al «Borrar recurso» de la vecina", async () => {
    const { estado } = crearServidor("maestro")
    estado.falla = ({ metodo, url }) => {
      if (metodo !== "DELETE" || !esDelRecurso(url, 2)) return null
      estado.recursos = estado.recursos.filter(({ id }) => id !== idRecurso(2))
      return errorJson(404, "PUBLICACION_NO_ENCONTRADA", "Esa publicación ya no existe.")
    }
    await montar(RUTA_RECURSOS("maestro"))
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    await pedirBorrar("Recurso 2")
    await waitFor(
      () => expect(screen.queryByRole("heading", { level: 4, name: "Recurso 2" })).toBeNull(),
      ESPERA,
    )
    await reposar()
    expect(errores().map(([texto]) => texto)).toEqual(["Esa publicación ya no existe."])
    expect(foco()).toBe(within(filaDe("Recurso 3")).getByRole("button", { name: "Borrar recurso" }))
  })

  it("CL3-3R1-03: con 404 sobre el último recurso de una sección, el foco va al h3 de la sección vecina del mismo bloque", async () => {
    const { estado } = crearServidor("maestro", {
      recursos: [recurso(2, "docente", idTema(1)), recurso(3, "docente", idTema(2))],
    })
    estado.falla = ({ metodo, url }) => {
      if (metodo !== "DELETE" || !esDelRecurso(url, 2)) return null
      estado.recursos = estado.recursos.filter(({ id }) => id !== idRecurso(2))
      return errorJson(404, "PUBLICACION_NO_ENCONTRADA", "Esa publicación ya no existe.")
    }
    await montar(RUTA_RECURSOS("maestro"))
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    await pedirBorrar("Recurso 2")
    await waitFor(
      () =>
        expect(
          within(bloque(DOCENTE)).queryByRole("heading", { level: 3, name: /^Unidad 1 / }),
        ).toBeNull(),
      ESPERA,
    )
    await reposar()
    expect(foco()).toBe(encabezadoDeSeccion(DOCENTE, "Unidad 2"))
  })

  it("CL3-3R1-04: con 404 sobre el último recurso del bloque, el foco va al h2 del bloque y no a la sección del mismo tema del otro bloque", async () => {
    const { estado } = crearServidor("maestro", {
      recursos: [
        recurso(1, "aprendizaje", idTema(1), {
          puedeEditar: false,
          puedeBorrar: false,
          puedeMover: false,
        }),
        recurso(2, "docente", idTema(1)),
      ],
    })
    estado.falla = ({ metodo, url }) => {
      if (metodo !== "DELETE" || !esDelRecurso(url, 2)) return null
      estado.recursos = estado.recursos.filter(({ id }) => id !== idRecurso(2))
      return errorJson(404, "PUBLICACION_NO_ENCONTRADA", "Esa publicación ya no existe.")
    }
    await montar(RUTA_RECURSOS("maestro"))
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    await pedirBorrar("Recurso 2")
    await waitFor(
      () => expect(within(bloque(DOCENTE)).getByText("Aún no hay recursos del docente.")),
      ESPERA,
    )
    await reposar()
    expect(foco()).toBe(encabezadoDelBloque(DOCENTE))
  })
})

// ---------------------------------------------------------------------------------------------------
// Indicación 4: el mismo tema en los dos bloques (data-seccion-de-recursos).

describe("CL3-3R1 · el mismo tema en los dos bloques (indicación 4)", () => {
  const tresRecursos = () => [
    recurso(1, "aprendizaje", idTema(1)),
    recurso(2, "docente", idTema(1)),
    recurso(3, "docente", idTema(2)),
  ]

  it("CL3-3R1-05: el admin borra el último recurso de «Unidad 1» del docente: el foco va a «Unidad 2» del docente, nunca a «Unidad 1» de aprendizaje", async () => {
    crearServidor("admin", { recursos: tresRecursos() })
    await montar(RUTA_RECURSOS("admin"))
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    await pedirBorrar("Recurso 2")
    await waitFor(
      () =>
        expect(
          within(bloque(DOCENTE)).queryByRole("heading", { level: 3, name: /^Unidad 1 / }),
        ).toBeNull(),
      ESPERA,
    )
    await reposar()
    expect(foco()).not.toBe(encabezadoDeSeccion(APRENDIZAJE, "Unidad 1"))
    expect(foco()).toBe(encabezadoDeSeccion(DOCENTE, "Unidad 2"))
  })

  it("CL3-3R1-06: el admin mueve a «Unidad 2» el último recurso de «Unidad 1» del docente: el foco queda en el bloque del docente, en «Unidad 2»", async () => {
    crearServidor("admin", { recursos: tresRecursos() })
    await montar(RUTA_RECURSOS("admin"))
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    const fila = filaDe("Recurso 2")
    fireEvent.change(within(fila).getByLabelText("Tema de «Recurso 2»"), {
      target: { value: idTema(2) },
    })
    enfocarYPulsar(within(fila).getByRole("button", { name: "Mover" }))
    await waitFor(
      () =>
        expect(
          within(bloque(DOCENTE)).queryByRole("heading", { level: 3, name: /^Unidad 1 / }),
        ).toBeNull(),
      ESPERA,
    )
    await reposar()
    const enfocado = foco()
    expect(enfocado).not.toBe(document.body)
    expect(bloque(APRENDIZAJE).contains(enfocado)).toBe(false)
    expect(bloque(DOCENTE).contains(enfocado)).toBe(true)
  })

  it("CL3-3R1-07: el admin borra el único recurso del docente: el foco va al h2 del docente, no a «Unidad 1» de aprendizaje", async () => {
    crearServidor("admin", {
      recursos: [recurso(1, "aprendizaje", idTema(1)), recurso(2, "docente", idTema(1))],
    })
    await montar(RUTA_RECURSOS("admin"))
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    await pedirBorrar("Recurso 2")
    await waitFor(
      () => expect(within(bloque(DOCENTE)).getByText("Aún no hay recursos del docente.")),
      ESPERA,
    )
    await reposar()
    expect(foco()).toBe(encabezadoDelBloque(DOCENTE))
  })
})

// ---------------------------------------------------------------------------------------------------
// Indicación 3: "Ver más de <tema>" sin red y sus combinaciones.

const sieteEnUnidad1 = () =>
  Array.from({ length: 7 }, (_, i) => recurso(10 + i, "docente", idTema(1)))
const filasDeLaSeccion = () =>
  within(bloque(DOCENTE))
    .getAllByRole("heading", { level: 4 })
    .map((h) => h.textContent)
const verMas = () => within(bloque(DOCENTE)).getByRole("button", { name: "Ver más de Unidad 1" })
const conCursor = (url: URL) =>
  url.pathname === `${API}/recursos` && url.searchParams.get("cursor") !== null

describe("CL3-3R1 · «Ver más de <tema>» sin red y sus combinaciones (indicación 3)", () => {
  it("CL3-3R1-08: sin red, las filas se conservan, un aviso con el id de «Recursos», el botón sigue y un segundo clic carga la página", async () => {
    const { estado } = crearServidor("maestro", { recursos: sieteEnUnidad1() })
    let fallos = 0
    estado.falla = ({ url }) => {
      if (!conCursor(url) || fallos > 0) return null
      fallos += 1
      return Promise.reject(new TypeError("Failed to fetch"))
    }
    await montar(RUTA_RECURSOS("maestro"))
    await screen.findByRole("heading", { level: 4, name: "Recurso 14" }, ESPERA)
    enfocarYPulsar(verMas())
    await waitFor(() => expect(errores()).toHaveLength(1), ESPERA)
    await reposar()
    expect(errores()[0]?.[1]).toEqual({ id: ID_DEL_AVISO_DE_RECARGA_DE_RECURSOS })
    expect(filasDeLaSeccion()).toHaveLength(5)
    expect(verMas()).not.toHaveAttribute("aria-busy", "true")
    expect(foco()).toBe(verMas())
    fireEvent.click(verMas())
    await waitFor(() => expect(filasDeLaSeccion()).toHaveLength(7), ESPERA)
    expect(errores()).toHaveLength(1)
  })

  it("CL3-3R1-09: «Ver más» y la recarga del bloque fallan en el mismo turno: cada aviso lleva el id de «Recursos» (uno a la vista)", async () => {
    const { estado } = crearServidor("maestro", { recursos: sieteEnUnidad1() })
    const retenidas: ReturnType<typeof retenida>[] = []
    let temasFallan = false
    estado.falla = ({ url, signal }) => {
      if (conCursor(url)) {
        const r = retenida(signal)
        retenidas.push(r)
        return r.promesa
      }
      if (
        temasFallan &&
        url.pathname === `${API}/temas` &&
        url.searchParams.get("seccion") === "docente"
      ) {
        return errorJson(500, "ERROR_INTERNO", "Falla")
      }
      return null
    }
    const { cliente } = await montar(RUTA_RECURSOS("maestro"))
    await screen.findByRole("heading", { level: 4, name: "Recurso 14" }, ESPERA)
    fireEvent.click(verMas())
    await waitFor(() => expect(retenidas).toHaveLength(1), ESPERA)
    temasFallan = true
    await act(async () => {
      void cliente.invalidateQueries({ queryKey: ["clases", CLASE_ID, "temas"] })
      retenidas[0]?.soltar(errorJson(500, "ERROR_INTERNO", "Falla"))
      await Promise.resolve()
    })
    await waitFor(() => expect(errores()).toHaveLength(2), ESPERA)
    await reposar()
    expect(errores().map(([, opciones]) => opciones as unknown)).toEqual([
      { id: ID_DEL_AVISO_DE_RECARGA_DE_RECURSOS },
      { id: ID_DEL_AVISO_DE_RECARGA_DE_RECURSOS },
    ])
    expect(filasDeLaSeccion()).toHaveLength(5)
  })

  it("CL3-3R1-10: «Ver más» falla y después la recarga del bloque da 403 SIN_ACCESO_A_LA_CLASE: el bloque se reemplaza sin otro aviso y el foco va a su h2", async () => {
    const { estado } = crearServidor("maestro", { recursos: sieteEnUnidad1() })
    let sinAcceso = false
    estado.falla = ({ url }) => {
      if (conCursor(url)) return errorJson(500, "ERROR_INTERNO", "Falla")
      if (
        sinAcceso &&
        url.pathname === `${API}/temas` &&
        url.searchParams.get("seccion") === "docente"
      ) {
        return errorJson(403, "SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.")
      }
      return null
    }
    const { cliente } = await montar(RUTA_RECURSOS("maestro"))
    await screen.findByRole("heading", { level: 4, name: "Recurso 14" }, ESPERA)
    enfocarYPulsar(verMas())
    await waitFor(() => expect(errores()).toHaveLength(1), ESPERA)
    await reposar()
    expect(foco()).toBe(verMas())
    sinAcceso = true
    await act(() => cliente.invalidateQueries({ queryKey: ["clases", CLASE_ID, "temas"] }))
    await waitFor(
      () => expect(within(bloque(DOCENTE)).getByText("No tienes acceso a esta clase.")),
      ESPERA,
    )
    await reposar()
    expect(errores()).toHaveLength(1)
    expect(within(bloque(DOCENTE)).queryByRole("heading", { level: 4 })).toBeNull()
    expect(foco()).toBe(encabezadoDelBloque(DOCENTE))
  })

  it("CL3-3R1-11: «Ver más» falla y el segundo intento llega con el cursor vencido: la frase R3 reemplaza la lista, sin otro aviso, y el foco va al h3", async () => {
    const { estado } = crearServidor("maestro", { recursos: sieteEnUnidad1() })
    let fallos = 0
    estado.falla = ({ url }) => {
      if (!conCursor(url) || fallos > 0) return null
      fallos += 1
      return errorJson(500, "ERROR_INTERNO", "Falla")
    }
    await montar(RUTA_RECURSOS("maestro"))
    await screen.findByRole("heading", { level: 4, name: "Recurso 14" }, ESPERA)
    enfocarYPulsar(verMas())
    await waitFor(() => expect(errores()).toHaveLength(1), ESPERA)
    await reposar()
    // El cursor de la primera página es el último id que trajo; ya no existe en el servidor.
    estado.recursos = estado.recursos.filter(({ id }) => id !== idRecurso(14))
    fireEvent.click(verMas())
    await waitFor(
      () =>
        expect(
          within(bloque(DOCENTE)).getByText(
            "Este tema cambió mientras lo veías. Vuelve a abrir Recursos para verlo completo.",
          ),
        ),
      ESPERA,
    )
    await reposar()
    expect(errores()).toHaveLength(1)
    expect(
      within(bloque(DOCENTE)).queryByRole("button", { name: "Ver más de Unidad 1" }),
    ).toBeNull()
    expect(foco()).toBe(encabezadoDeSeccion(DOCENTE, "Unidad 1"))
  })
})

// ---------------------------------------------------------------------------------------------------
// Indicación 5: la guarda de redirección en publicar, guardar y borrar un recurso.

type Redireccion = "ACCESO_RESTRINGIDO" | "CAMBIO_DE_CONTRASENA_REQUERIDO" | "NO_AUTENTICADO"

const DESTINOS: Record<Redireccion, string> = {
  ACCESO_RESTRINGIDO: "/acceso-restringido",
  CAMBIO_DE_CONTRASENA_REQUERIDO: "/cambiar-contrasena",
  NO_AUTENTICADO: "/login",
}

const respuestaQueRedirige = (caso: Redireccion) =>
  caso === "NO_AUTENTICADO"
    ? errorJson(401, "NO_AUTENTICADO", "Tu sesión terminó.")
    : errorJson(403, caso, "Te sacamos de aquí.")

// Las lecturas que cuentan como "renovación" tras la acción.
const lecturasDeRecursos = (fetchMock: FetchMock) =>
  llamadas(fetchMock).filter(
    (l) =>
      l.metodo === "GET" &&
      (l.url.pathname === `${API}/temas` || l.url.pathname.startsWith(`${API}/recursos`)),
  ).length

describe("CL3-3R1 · la guarda de redirección en publicar, guardar y borrar (indicación 5)", () => {
  const casos = (
    ["ACCESO_RESTRINGIDO", "CAMBIO_DE_CONTRASENA_REQUERIDO", "NO_AUTENTICADO"] as const
  ).flatMap((caso) =>
    (["publicar", "guardar", "borrar"] as const).map((accion) => ({ caso, accion })),
  )

  it.each(casos.map((c) => [`${c.accion} con ${c.caso}`, c] as const))(
    "CL3-3R1-12: %s: ningún aviso, ninguna renovación y la redirección de apiClient",
    async (_nombre, { caso, accion }) => {
      const { estado, fetchMock } = crearServidor("maestro")
      let activa = false
      estado.falla = ({ metodo, url }) => {
        if (!activa) return null
        if (caso === "NO_AUTENTICADO" && url.pathname === "/api/auth/refrescar") {
          return errorJson(401, "NO_AUTENTICADO", "Sin sesión.")
        }
        const esLaAccion =
          (accion === "publicar" && metodo === "POST" && url.pathname === `${API}/publicaciones`) ||
          (accion === "guardar" && metodo === "PUT" && esDelRecurso(url, 2)) ||
          (accion === "borrar" && metodo === "DELETE" && esDelRecurso(url, 2))
        return esLaAccion ? respuestaQueRedirige(caso) : null
      }
      await montar(accion === "guardar" ? RUTA_EDITAR("maestro", 2) : RUTA_RECURSOS("maestro"))
      if (accion === "guardar") {
        const titulo = await screen.findByLabelText("Título del recurso", {}, ESPERA)
        await waitFor(() => expect(titulo).toHaveValue("Recurso 2"), ESPERA)
        fireEvent.change(titulo, { target: { value: "Otro título" } })
      }
      if (accion !== "guardar") {
        await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
      }
      if (accion === "publicar") {
        fireEvent.change(screen.getByLabelText("Título del recurso"), {
          target: { value: "Nuevo" },
        })
      }
      await reposar()
      const lecturasAntes = lecturasDeRecursos(fetchMock)
      activa = true
      if (accion === "borrar") await pedirBorrar("Recurso 2")
      if (accion === "publicar")
        fireEvent.click(screen.getByRole("button", { name: "Publicar recurso" }))
      if (accion === "guardar")
        fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
      await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith(DESTINOS[caso]), ESPERA)
      await reposar(250)
      expect(errores()).toEqual([])
      expect(lecturasDeRecursos(fetchMock)).toBe(lecturasAntes)
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// Indicación 6: los puntos de ataque de 03d del plan.

const putsDel = (fetchMock: FetchMock, n: number) =>
  llamadasA(fetchMock, "PUT", `${API}/recursos/${idRecurso(n)}`)
const lecturasDel = (fetchMock: FetchMock, n: number) =>
  llamadasA(fetchMock, "GET", `${API}/recursos/${idRecurso(n)}`).length

describe("CL3-3R1 · el 409 al editar (indicación 6)", () => {
  it("CL3-3R1-13: un 409 seguido de otro 409: dos avisos, dos reinicios con la versión nueva y el foco en «Título del recurso»; el tercer intento guarda con la última versión", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    const { router } = await montar(RUTA_EDITAR("maestro", 2))
    const titulo = () => screen.getByLabelText("Título del recurso")
    await waitFor(() => expect(titulo()).toHaveValue("Recurso 2"), ESPERA)
    for (const vuelta of [1, 2]) {
      const fila = estado.recursos.find(({ id }) => id === idRecurso(2))
      if (fila === undefined) throw new Error("Precondición: el recurso 2 en el servidor")
      fila.titulo = `Cambio de otra persona ${String(vuelta)}`
      fila.version += 1
      fireEvent.change(titulo(), { target: { value: `Mío ${String(vuelta)}` } })
      enfocarYPulsar(screen.getByRole("button", { name: "Guardar cambios" }))
      await waitFor(
        () => expect(titulo()).toHaveValue(`Cambio de otra persona ${String(vuelta)}`),
        ESPERA,
      )
      await reposar()
      expect(errores().map(([texto]) => texto)).toEqual(Array(vuelta).fill(MENSAJE_409))
      expect(foco()).toBe(titulo())
      expect(screen.getByRole("button", { name: "Guardar cambios" })).not.toHaveAttribute(
        "aria-busy",
        "true",
      )
    }
    fireEvent.change(titulo(), { target: { value: "Mío 3" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(
      () => expect(router.state.location.pathname).toBe(RUTA_RECURSOS("maestro")),
      ESPERA,
    )
    expect(
      putsDel(fetchMock, 2).map(({ cuerpo }) => (cuerpo as { version: number }).version),
    ).toEqual([0, 1, 2])
    expect(exitos()).toEqual(["Cambios guardados"])
  })

  it("CL3-3R1-14: un 409 con la vista desmontada da su aviso y no vuelve a pedir el recurso (§D-14: «El aviso sale; sin recarga»)", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    const retenidas: ReturnType<typeof retenida>[] = []
    estado.falla = ({ metodo, url, signal }) => {
      if (metodo !== "PUT" || !esDelRecurso(url, 2)) return null
      const r = retenida(signal)
      retenidas.push(r)
      return r.promesa
    }
    const { router } = await montar(RUTA_EDITAR("maestro", 2))
    const titulo = await screen.findByLabelText("Título del recurso", {}, ESPERA)
    await waitFor(() => expect(titulo).toHaveValue("Recurso 2"), ESPERA)
    fireEvent.change(titulo, { target: { value: "Mío" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(retenidas).toHaveLength(1), ESPERA)
    await act(() => router.navigate(`${BASES.maestro}/${CLASE_ID}`))
    await screen.findByRole("button", { name: "Publicar anuncio" }, ESPERA)
    await reposar()
    const lecturasAntes = lecturasDel(fetchMock, 2)
    await act(async () => {
      retenidas[0]?.soltar(errorJson(409, "RECURSO_MODIFICADO", MENSAJE_409))
      await Promise.resolve()
    })
    await waitFor(() => expect(errores()).toHaveLength(1), ESPERA)
    await reposar(250)
    expect(errores().map(([texto]) => texto)).toEqual([MENSAJE_409])
    expect(lecturasDel(fetchMock, 2) - lecturasAntes).toBe(0)
  })

  it("CL3-3R1-15: la recarga tras el 409 trae un 404: la vista se reemplaza por «Ese recurso ya no existe.» con «Volver a Recursos», un solo aviso y el foco en la raíz", async () => {
    const { estado } = crearServidor("maestro")
    estado.falla = ({ metodo, url }) => {
      if (metodo !== "PUT" || !esDelRecurso(url, 2)) return null
      estado.recursos = estado.recursos.filter(({ id }) => id !== idRecurso(2))
      return errorJson(409, "RECURSO_MODIFICADO", MENSAJE_409)
    }
    await montar(RUTA_EDITAR("maestro", 2))
    const titulo = await screen.findByLabelText("Título del recurso", {}, ESPERA)
    await waitFor(() => expect(titulo).toHaveValue("Recurso 2"), ESPERA)
    fireEvent.change(titulo, { target: { value: "Mío" } })
    enfocarYPulsar(screen.getByRole("button", { name: "Guardar cambios" }))
    const mensaje = await screen.findByText("Ese recurso ya no existe.", {}, ESPERA)
    await reposar()
    expect(screen.getByRole("link", { name: "Volver a Recursos" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Título del recurso")).toBeNull()
    expect(errores().map(([texto]) => texto)).toEqual([MENSAJE_409])
    const enfocado = foco()
    expect(enfocado).not.toBe(document.body)
    expect(enfocado?.contains(mensaje)).toBe(true)
  })
})

describe("CL3-3R1 · O-16 con la vista desmontada durante la renovación por TEMA_NO_ENCONTRADO (indicación 6)", () => {
  it.each(["crear", "editar"] as const)(
    "CL3-3R1-16: %s: el 404 TEMA_NO_ENCONTRADO avisa una sola vez aunque la vista se desmonte mientras se renuevan los temas",
    async (modo) => {
      const { estado } = crearServidor("maestro")
      const retenidas: ReturnType<typeof retenida>[] = []
      let renovando = false
      estado.falla = ({ metodo, url }) => {
        const esLaAccion =
          (modo === "crear" && metodo === "POST" && url.pathname === `${API}/publicaciones`) ||
          (modo === "editar" && metodo === "PUT" && esDelRecurso(url, 2))
        if (esLaAccion) {
          renovando = true
          return errorJson(404, "TEMA_NO_ENCONTRADO", "Ese tema ya no existe.")
        }
        if (renovando && metodo === "GET" && url.pathname === `${API}/temas`) {
          const r = retenida(undefined)
          retenidas.push(r)
          return r.promesa
        }
        return null
      }
      const { router } = await montar(
        modo === "crear" ? RUTA_RECURSOS("maestro") : RUTA_EDITAR("maestro", 2),
      )
      const titulo = await screen.findByLabelText("Título del recurso", {}, ESPERA)
      if (modo === "editar") await waitFor(() => expect(titulo).toHaveValue("Recurso 2"), ESPERA)
      fireEvent.change(titulo, { target: { value: "Con tema" } })
      const tema = await screen.findByRole("combobox", { name: "Tema" }, ESPERA)
      fireEvent.change(tema, { target: { value: idTema(2) } })
      fireEvent.click(
        screen.getByRole("button", {
          name: modo === "crear" ? "Publicar recurso" : "Guardar cambios",
        }),
      )
      await waitFor(() => expect(retenidas.length).toBeGreaterThan(0), ESPERA)
      await act(() => router.navigate(`${BASES.maestro}/${CLASE_ID}`))
      await screen.findByRole("button", { name: "Publicar anuncio" }, ESPERA)
      await act(async () => {
        for (const r of retenidas) {
          r.soltar(
            respuestaJson(200, {
              temas: [{ id: idTema(1), nombre: "Unidad 1", orden: 0, elementos: 2 }],
              sinTema: 0,
            }),
          )
        }
        await Promise.resolve()
      })
      await reposar(250)
      expect(errores().map(([texto]) => texto)).toEqual(["Ese tema ya no existe."])
    },
  )
})

describe("CL3-3R1 · el limitador de 6 con los dos bloques (indicación 6)", () => {
  // Cinco temas con un recurso en cada bloque: diez secciones que piden su primera página.
  const diezSecciones = () => ({
    temas: [1, 2, 3, 4, 5].map((n) => ({ id: idTema(n), nombre: `Unidad ${String(n)}` })),
    recursos: [1, 2, 3, 4, 5].flatMap((n) => [
      recurso(20 + n, "aprendizaje", idTema(n)),
      recurso(30 + n, "docente", idTema(n)),
    ]),
  })

  const retenerLasListas = (estado: Estado) => {
    const enVuelo: { url: URL; soltar: () => void }[] = []
    const vistas = { pedidas: 0, maximo: 0, abiertas: 0 }
    estado.falla = ({ metodo, url, signal }) => {
      if (metodo !== "GET" || url.pathname !== `${API}/recursos`) return null
      vistas.pedidas += 1
      vistas.abiertas += 1
      vistas.maximo = Math.max(vistas.maximo, vistas.abiertas)
      const r = retenida(signal)
      let cerrada = false
      const cerrar = () => {
        if (cerrada) return
        cerrada = true
        vistas.abiertas -= 1
      }
      signal?.addEventListener("abort", cerrar)
      const filas = estado.recursos.filter(
        (fila) =>
          fila.bloque === url.searchParams.get("bloque") &&
          fila.tema === url.searchParams.get("tema"),
      )
      enVuelo.push({
        url,
        soltar: () => {
          cerrar()
          r.soltar(respuestaJson(200, { recursos: filas.map(deLaLista), siguienteCursor: null }))
        },
      })
      return r.promesa
    }
    return { enVuelo, vistas }
  }

  it("CL3-3R1-17: diez secciones entre los dos bloques: nunca más de 6 lecturas a la vez y, al soltarlas, salen las diez", async () => {
    const { estado } = crearServidor("admin", diezSecciones())
    const { enVuelo, vistas } = retenerLasListas(estado)
    await montar(RUTA_RECURSOS("admin"))
    await waitFor(() => expect(vistas.pedidas).toBe(6), ESPERA)
    await reposar()
    expect(vistas.pedidas).toBe(6)
    // Se sueltan de una en una, en el orden en que salieron; cada una deja entrar a la siguiente.
    let liberadas = 0
    for (let vuelta = 0; vuelta < 60 && liberadas < 10; vuelta += 1) {
      const siguiente = enVuelo[liberadas]
      if (siguiente !== undefined) {
        await act(async () => {
          siguiente.soltar()
          await Promise.resolve()
        })
        liberadas += 1
      }
      await reposar(30)
    }
    await waitFor(() => expect(vistas.pedidas).toBe(10), ESPERA)
    expect(vistas.maximo).toBeLessThanOrEqual(6)
    await waitFor(
      () => expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(10),
      ESPERA,
    )
  })

  it("CL3-3R1-18: salir con 6 en vuelo y 4 en fila: las de la fila no salen, y al volver las diez se piden y se pintan (el limitador quedó libre)", async () => {
    const { estado } = crearServidor("admin", diezSecciones())
    const { vistas } = retenerLasListas(estado)
    const { router } = await montar(RUTA_RECURSOS("admin"))
    await waitFor(() => expect(vistas.pedidas).toBe(6), ESPERA)
    await act(() => router.navigate(`${BASES.admin}/${CLASE_ID}`))
    await screen.findByRole("button", { name: "Publicar anuncio" }, ESPERA)
    await reposar(250)
    expect(vistas.pedidas).toBe(6)
    expect(vistas.abiertas).toBe(0)
    estado.falla = () => null
    await act(() => router.navigate(RUTA_RECURSOS("admin")))
    await waitFor(
      () => expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(10),
      ESPERA,
    )
  })
})

describe("CL3-3R1 · borrar un recurso con sus comentarios abiertos (indicación 6)", () => {
  it("CL3-3R1-19: el recurso se va con sus comentarios, sin volver a pedirlos, sin aviso de error y con el foco en la vecina", async () => {
    const { estado, fetchMock } = crearServidor("maestro", {
      recursos: [
        recurso(2, "docente", idTema(1), { comentarios: 1 }),
        recurso(3, "docente", idTema(1)),
      ],
    })
    estado.comentarios[idRecurso(2)] = [{ id: idComentario(1), texto: "Hola desde el recurso" }]
    await montar(RUTA_RECURSOS("maestro"))
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    fireEvent.click(within(filaDe("Recurso 2")).getByRole("button", { name: "Ver recurso" }))
    fireEvent.click(
      await within(filaDe("Recurso 2")).findByRole("button", { name: "Ver comentarios (1)" }),
    )
    await screen.findByText("Hola desde el recurso", {}, ESPERA)
    const rutaDeComentarios = `${API}/publicaciones/${idRecurso(2)}/comentarios`
    await reposar()
    const antes = llamadasA(fetchMock, "GET", rutaDeComentarios).length
    await pedirBorrar("Recurso 2")
    await waitFor(
      () => expect(screen.queryByRole("heading", { level: 4, name: "Recurso 2" })).toBeNull(),
      ESPERA,
    )
    await reposar(250)
    expect(screen.queryByText("Hola desde el recurso")).toBeNull()
    expect(llamadasA(fetchMock, "GET", rutaDeComentarios)).toHaveLength(antes)
    expect(errores()).toEqual([])
    expect(exitos()).toEqual(["Recurso borrado"])
    expect(foco()).toBe(within(filaDe("Recurso 3")).getByRole("button", { name: "Borrar recurso" }))
  })
})

// ---------------------------------------------------------------------------------------------------
// Indicación 7: el tema al editar con la lista de temas pendiente, fallida, sin el tema o vieja.

const totalDeTemas = (url: URL) =>
  url.pathname === `${API}/temas` && url.searchParams.get("seccion") === null

const guardarConOtroTitulo = async () => {
  const titulo = await screen.findByLabelText("Título del recurso", {}, ESPERA)
  await waitFor(() => expect(titulo).toHaveValue("Recurso 2"), ESPERA)
  fireEvent.change(titulo, { target: { value: "Solo cambio el título" } })
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
}

describe("CL3-3R1 · el tema al editar (temaVigente, indicación 7)", () => {
  it("CL3-3R1-20: con la lista de temas pendiente, guardar conserva el tema del recurso", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    estado.falla = ({ metodo, url }) =>
      metodo === "GET" && totalDeTemas(url) ? retenida(undefined).promesa : null
    await montar(RUTA_EDITAR("maestro", 2))
    await guardarConOtroTitulo()
    await waitFor(() => expect(putsDel(fetchMock, 2)).toHaveLength(1), ESPERA)
    expect((putsDel(fetchMock, 2)[0]?.cuerpo as { temaId: string | null }).temaId).toBe(idTema(1))
  })

  it("CL3-3R1-21: con la lista de temas fallida, guardar conserva el tema del recurso", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    estado.falla = ({ metodo, url }) =>
      metodo === "GET" && totalDeTemas(url) ? errorJson(500, "ERROR_INTERNO", "Falla") : null
    await montar(RUTA_EDITAR("maestro", 2))
    await waitFor(
      () => expect(llamadas(fetchMock).some(({ url }) => totalDeTemas(url))).toBe(true),
      ESPERA,
    )
    await reposar()
    await guardarConOtroTitulo()
    await waitFor(() => expect(putsDel(fetchMock, 2)).toHaveLength(1), ESPERA)
    expect((putsDel(fetchMock, 2)[0]?.cuerpo as { temaId: string | null }).temaId).toBe(idTema(1))
  })

  it("CL3-3R1-22: la lista llega sin el tema del recurso (se borró): el campo dice «Sin tema» y el PUT lleva temaId null", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    const total = estado.falla
    estado.falla = (llamada) => {
      if (llamada.metodo !== "GET" || !totalDeTemas(llamada.url)) return total(llamada)
      return respuestaJson(200, {
        temas: [{ id: idTema(2), nombre: "Unidad 2", orden: 0, elementos: 0 }],
        sinTema: 0,
      })
    }
    await montar(RUTA_EDITAR("maestro", 2))
    const tema = await screen.findByRole("combobox", { name: "Tema" }, ESPERA)
    expect(tema).toHaveValue("")
    await guardarConOtroTitulo()
    await waitFor(() => expect(putsDel(fetchMock, 2)).toHaveLength(1), ESPERA)
    expect((putsDel(fetchMock, 2)[0]?.cuerpo as { temaId: string | null }).temaId).toBeNull()
  })

  it("CL3-3R1-23: con la lista de temas en caché todavía fresca (de «Recursos») y el recurso movido después a un tema nuevo, guardar solo el título conserva el tema del recurso", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    const { router } = await montar(RUTA_RECURSOS("maestro"))
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    // La lista total ya llegó: el formulario de «Nuevo recurso» ofrece sus temas.
    await screen.findByRole("combobox", { name: "Tema" }, ESPERA)
    // Otra persona crea «Unidad 3» y mueve ahí el recurso 2 (sube su versión), dentro del staleTime.
    estado.temas = [...estado.temas, { id: idTema(3), nombre: "Unidad 3" }]
    const fila = estado.recursos.find(({ id }) => id === idRecurso(2))
    if (fila === undefined) throw new Error("Precondición: el recurso 2 en el servidor")
    fila.tema = idTema(3)
    fila.version += 1
    await act(() => router.navigate(RUTA_EDITAR("maestro", 2)))
    await guardarConOtroTitulo()
    await waitFor(() => expect(putsDel(fetchMock, 2)).toHaveLength(1), ESPERA)
    expect((putsDel(fetchMock, 2)[0]?.cuerpo as { temaId: string | null }).temaId).toBe(idTema(3))
  })
})

// ---------------------------------------------------------------------------------------------------
// Indicación 8: la rama sin salida de recursoNuevoValidado (lib.ts:640).

describe("CL3-3R1 · la rama sin salida de la validación local (indicación 8)", () => {
  // Lo que la persona puede escribir en los dos campos; el tema sale de la lista del servidor (uuid
  // validado por listaTemasRespuestaSchema), así que solo "" o un id válido.
  const TITULOS = [
    "",
    "   ",
    "\u{200B}\u{FEFF}",
    "ㅤ",
    "a".repeat(201),
    `${"á".repeat(199)}\u{301}\u{301}`,
    "Título\u{0007}",
    "Título\u{202E}",
    "Título\u{2028}con salto",
    "Bien",
  ]
  const TEXTOS = ["", "x".repeat(5001), "x\u{0007}", "x\u{202E}", "\u{FEFF}", "Bien"]
  const TEMAS = ["", idTema(1)]
  const combinaciones = TITULOS.flatMap((titulo) =>
    TEXTOS.flatMap((texto) => TEMAS.map((temaId) => ({ titulo, texto, temaId }))),
  )
  const PINTADOS = ["titulo", "texto"]

  it("CL3-3R1-24: crear: toda combinación rechazada deja al menos un error en un campo que el formulario pinta, y ninguno fuera de ellos", () => {
    const sinSalida = combinaciones.filter((campos) => {
      const resultado = recursoNuevoValidado(campos)
      if (resultado.ok) return false
      const claves = Object.keys(resultado.errores)
      return claves.length === 0 || claves.some((clave) => !PINTADOS.includes(clave))
    })
    expect(combinaciones.length).toBeGreaterThan(100)
    expect(sinSalida).toEqual([])
  })

  it("CL3-3R1-25: editar: toda combinación rechazada deja al menos un error en un campo que el formulario pinta, y ninguno fuera de ellos", () => {
    const sinSalida = combinaciones.filter((campos) => {
      const resultado = recursoEditadoValidado(campos, [], 3)
      if (resultado.ok) return false
      const claves = Object.keys(resultado.errores)
      return claves.length === 0 || claves.some((clave) => !PINTADOS.includes(clave))
    })
    expect(sinSalida).toEqual([])
  })
})
