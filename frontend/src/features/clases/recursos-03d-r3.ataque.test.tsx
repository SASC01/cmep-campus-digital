// Tester, CLASES-03d, ronda 3 (la última antes de escalar). Las correcciones de T-03
// (useTemasDelRecurso: solo una lista pedida después de abrir confirma), T-04 (el 409 marca vieja la
// edición sin pedirla) y T-05 (el 404 al borrar saca la edición de la caché; el 403 la marca vieja), por
// las indicaciones 1 a 3 de "Verificación de la corrección de la ronda 2 — 03d". Router real (`rutas`) y
// el servidor doble de la ronda 2. Además de lo funcional, cada caso vigila la consola: un error o una
// advertencia de la aplicación es un efecto visible (las advertencias de act() de la prueba no cuentan).
// Sin selectores de clases de estilo. La vista no muestra textos relativos al tiempo: sin reloj.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

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

// Un material de "Actividades de aprendizaje" (el doble de "Trabajo de clase" no filtra por sección).
interface ActividadDoble {
  id: string
  titulo: string
  tema: string | null
}

interface Estado {
  temas: { id: string; nombre: string }[]
  actividades: ActividadDoble[]
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

const crearServidor = (
  rol: Rol,
  inicial: Partial<Pick<Estado, "temas" | "recursos" | "actividades">> = {},
) => {
  const estado: Estado = {
    temas: inicial.temas ?? [
      { id: idTema(1), nombre: "Unidad 1" },
      { id: idTema(2), nombre: "Unidad 2" },
    ],
    recursos: inicial.recursos ?? [
      recurso(2, "docente", idTema(1)),
      recurso(3, "docente", idTema(1)),
    ],
    actividades: inicial.actividades ?? [],
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
      const deActividades = (tema: string | null) =>
        estado.actividades.filter((a) => a.tema === tema).length
      const contar = (tema: string | null) =>
        seccion === "actividades" ? deActividades(tema) : cuenta(tema)
      return respuestaJson(200, {
        temas: estado.temas.map((tema, orden) => ({ ...tema, orden, elementos: contar(tema.id) })),
        sinTema: contar(null),
      })
    }
    if (url.pathname === `${API}/trabajo` && metodo === "GET") {
      const tema = url.searchParams.get("tema")
      const filas = estado.actividades.filter((a) =>
        tema === "sin-tema" ? a.tema === null : a.tema === tema,
      )
      const r = paginar(filas, url)
      if (r === null) return errorJson(400, "VALIDACION", "cursor: no es válido")
      return respuestaJson(200, {
        elementos: r.pagina.map((a) => ({
          id: a.id,
          tipo: "material",
          titulo: a.titulo,
          autor: FIRMA_MAESTRO,
          creadoEn: CREADO_EN,
          material: { texto: "", adjuntos: [] },
          tarea: null,
          entrega: null,
          puedeMover: true,
        })),
        siguienteCursor: r.siguiente,
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
      const actividad = estado.actividades.find((a) => a.id === id)
      if (dePublicacion[2] === "/tema" && actividad !== undefined) {
        const { temaId } = cuerpo as { temaId: string | null }
        if (temaId !== null && !estado.temas.some((t) => t.id === temaId)) {
          return errorJson(404, "TEMA_NO_ENCONTRADO", "Ese tema ya no existe.")
        }
        actividad.tema = temaId
        return respuestaJson(200, { publicacionId: id, temaId })
      }
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
        if (temaId !== null && !estado.temas.some((t) => t.id === temaId)) {
          return errorJson(404, "TEMA_NO_ENCONTRADO", "Ese tema ya no existe.")
        }
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

const putsDel = (fetchMock: FetchMock, n: number) =>
  llamadasA(fetchMock, "PUT", `${API}/recursos/${idRecurso(n)}`)
const totalDeTemas = (url: URL) =>
  url.pathname === `${API}/temas` && url.searchParams.get("seccion") === null
const temaDelPut = (fetchMock: FetchMock, n: number, i = 0) =>
  (putsDel(fetchMock, n)[i]?.cuerpo as { temaId: string | null } | undefined)?.temaId
const campoTitulo = () => screen.getByLabelText("Título del recurso")

const abrirEdicion = async (titulo = "Recurso 2") => {
  const campo = await screen.findByLabelText("Título del recurso", {}, ESPERA)
  await waitFor(() => expect(campo).toHaveValue(titulo), ESPERA)
  return campo
}

const guardarConOtroTitulo = async (titulo = "Recurso 2") => {
  const campo = await abrirEdicion(titulo)
  fireEvent.change(campo, { target: { value: "Solo cambio el título" } })
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
}

// Otra persona crea «Unidad 3» y mueve ahí el recurso n (sube su versión).
const moverEnElServidor = (estado: Estado, n: number) => {
  estado.temas = [...estado.temas, { id: idTema(3), nombre: "Unidad 3" }]
  const fila = estado.recursos.find(({ id }) => id === idRecurso(n))
  if (fila === undefined) throw new Error(`Precondición: el recurso ${String(n)} en el servidor`)
  fila.tema = idTema(3)
  fila.version += 1
}

// La consola: un error o una advertencia de la aplicación es un efecto visible. Las advertencias de
// act() son de la prueba (una actualización fuera de act), no de la aplicación.
let consola: string[] = []
beforeEach(() => {
  consola = []
  for (const metodo of ["error", "warn"] as const) {
    vi.spyOn(console, metodo).mockImplementation((...args: unknown[]) => {
      consola.push(args.map((parte) => String(parte)).join(" "))
    })
  }
})
afterEach(() => {
  vi.restoreAllMocks()
})
const consolaDeLaApp = () => consola.filter((linea) => !linea.includes("not wrapped in act"))

const totalesPedidos = (fetchMock: FetchMock) =>
  llamadas(fetchMock).filter((l) => l.metodo === "GET" && totalDeTemas(l.url)).length
const lecturasDel = (fetchMock: FetchMock, n: number) =>
  llamadasA(fetchMock, "GET", `${API}/recursos/${idRecurso(n)}`).length
const cambioAjeno = (estado: Estado, titulo: string) => {
  const fila = estado.recursos.find(({ id }) => id === idRecurso(2))
  if (fila === undefined) throw new Error("Precondición: el recurso 2 en el servidor")
  fila.titulo = titulo
  fila.version += 1
  return fila
}
// La lista total como la respondía el servidor antes de que otra persona creara «Unidad 3».
const listaSinUnidad3 = () =>
  respuestaJson(200, {
    temas: [
      { id: idTema(1), nombre: "Unidad 1", orden: 0, elementos: 0 },
      { id: idTema(2), nombre: "Unidad 2", orden: 1, elementos: 0 },
    ],
    sinTema: 0,
  })
// Recuento de peticiones de la lista total, solo para el reporte (indicación 1 b): no es hallazgo.
const anotarRecuento = async (
  anotar: (mensaje: string) => Promise<unknown>,
  fetchMock: FetchMock,
) => {
  await anotar(`${String(totalesPedidos(fetchMock))} GET …/temas (total)`)
}

// ---------------------------------------------------------------------------------------------------
// Indicación 1: useTemasDelRecurso en las combinaciones que no se probaron.

describe("CL3-3R3 · useTemasDelRecurso (indicación 1)", () => {
  it("CL3-3R3-01: reinicio por 409 con otra petición de temas (anterior al movimiento) en vuelo: el formulario remontado no confirma «Sin tema» y guardar conserva el tema nuevo del recurso", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    const { cliente } = await montar(RUTA_EDITAR("maestro", 2))
    await abrirEdicion()
    await screen.findByRole("combobox", { name: "Tema" }, ESPERA)
    moverEnElServidor(estado, 2)
    cambioAjeno(estado, "Cambio ajeno")
    let soltarPut: ((r: Response) => void) | null = null
    let soltarVieja: (() => void) | null = null
    estado.falla = ({ metodo, url, signal }) => {
      if (metodo === "PUT" && esDelRecurso(url, 2) && soltarPut === null) {
        const r = retenida(signal)
        soltarPut = r.soltar
        return r.promesa
      }
      if (metodo === "GET" && totalDeTemas(url) && soltarVieja === null) {
        const r = retenida(undefined)
        soltarVieja = () => r.soltar(listaSinUnidad3())
        return r.promesa
      }
      return null
    }
    fireEvent.change(campoTitulo(), { target: { value: "Mío" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(soltarPut).not.toBeNull(), ESPERA)
    await act(async () => {
      void cliente.invalidateQueries({ queryKey: ["clases", CLASE_ID, "temas"] })
      await Promise.resolve()
    })
    await waitFor(() => expect(soltarVieja).not.toBeNull(), ESPERA)
    await act(async () => {
      soltarPut?.(errorJson(409, "RECURSO_MODIFICADO", MENSAJE_409))
      await Promise.resolve()
    })
    await waitFor(() => expect(campoTitulo()).toHaveValue("Cambio ajeno"), ESPERA)
    await act(async () => {
      soltarVieja?.()
      await Promise.resolve()
    })
    await reposar(250)
    fireEvent.change(campoTitulo(), { target: { value: "Solo el título" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(putsDel(fetchMock, 2)).toHaveLength(2), ESPERA)
    expect(temaDelPut(fetchMock, 2, 1)).toBe(idTema(3))
    expect(errores().map(([texto]) => texto)).toEqual([MENSAJE_409])
    expect(consolaDeLaApp()).toEqual([])
  })

  // Las tres siguientes: «Recursos» pide la lista total (retenida) antes de que otra persona mueva el
  // recurso 2 a «Unidad 3»; la persona abre «Editar recurso» con esa petición en vuelo.
  const abrirConLaPreviaEnVuelo = async () => {
    const servidor = crearServidor("maestro")
    let soltarPrevia: ((r: Response) => void) | null = null
    servidor.estado.falla = ({ metodo, url }) => {
      if (metodo !== "GET" || !totalDeTemas(url) || soltarPrevia !== null) return null
      const r = retenida(undefined)
      soltarPrevia = r.soltar
      return r.promesa
    }
    const montado = await montar(RUTA_RECURSOS("maestro"))
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    await waitFor(() => expect(soltarPrevia).not.toBeNull(), ESPERA)
    moverEnElServidor(servidor.estado, 2)
    await act(() => montado.router.navigate(RUTA_EDITAR("maestro", 2)))
    await abrirEdicion()
    const soltar = (r: Response) => {
      if (soltarPrevia === null) throw new Error("Precondición: la petición previa")
      soltarPrevia(r)
    }
    return { ...servidor, ...montado, soltarPrevia: soltar }
  }

  it("CL3-3R3-02: salir de la edición mientras espera la petición previa y volver antes de 30 s: sin cambio de tema, sin aviso ni error en consola, y el formulario nuevo confirma con su propia petición", async ({
    annotate,
  }) => {
    const { estado, fetchMock, router, soltarPrevia } = await abrirConLaPreviaEnVuelo()
    await act(() => router.navigate(`${BASES.maestro}/${CLASE_ID}`))
    await screen.findByRole("button", { name: "Publicar anuncio" }, ESPERA)
    await act(async () => {
      soltarPrevia(listaSinUnidad3())
      await Promise.resolve()
    })
    await reposar(250)
    estado.falla = () => null
    const antesDeVolver = totalesPedidos(fetchMock)
    await act(() => router.navigate(RUTA_EDITAR("maestro", 2)))
    await abrirEdicion()
    const tema = await screen.findByRole("combobox", { name: "Tema" }, ESPERA)
    expect(tema).toHaveValue(idTema(3))
    expect(totalesPedidos(fetchMock)).toBeGreaterThan(antesDeVolver)
    await anotarRecuento(annotate, fetchMock)
    await guardarConOtroTitulo()
    await waitFor(() => expect(putsDel(fetchMock, 2)).toHaveLength(1), ESPERA)
    expect(temaDelPut(fetchMock, 2)).toBe(idTema(3))
    expect(errores()).toEqual([])
    expect(consolaDeLaApp()).toEqual([])
  })

  it("CL3-3R3-03: la petición previa falla y la segunda llega bien: la confirmación sale de la segunda (con «Unidad 3») y guardar la conserva", async ({
    annotate,
  }) => {
    const { fetchMock, soltarPrevia } = await abrirConLaPreviaEnVuelo()
    await act(async () => {
      soltarPrevia(errorJson(500, "ERROR_INTERNO", "Falla"))
      await Promise.resolve()
    })
    const tema = await screen.findByRole("combobox", { name: "Tema" }, ESPERA)
    expect(tema).toHaveValue(idTema(3))
    await anotarRecuento(annotate, fetchMock)
    await guardarConOtroTitulo()
    await waitFor(() => expect(putsDel(fetchMock, 2)).toHaveLength(1), ESPERA)
    expect(temaDelPut(fetchMock, 2)).toBe(idTema(3))
    expect(errores()).toEqual([])
    expect(consolaDeLaApp()).toEqual([])
  })

  it("CL3-3R3-04: la petición previa llega bien (vieja) y la segunda falla: no hay confirmación ni campo «Tema», y guardar conserva el tema del recurso", async ({
    annotate,
  }) => {
    const { estado, fetchMock, soltarPrevia } = await abrirConLaPreviaEnVuelo()
    estado.falla = ({ metodo, url }) =>
      metodo === "GET" && totalDeTemas(url) ? errorJson(500, "ERROR_INTERNO", "Falla") : null
    const antes = totalesPedidos(fetchMock)
    await act(async () => {
      soltarPrevia(listaSinUnidad3())
      await Promise.resolve()
    })
    await waitFor(() => expect(totalesPedidos(fetchMock)).toBeGreaterThan(antes), ESPERA)
    await reposar(250)
    expect(screen.queryByRole("combobox", { name: "Tema" })).toBeNull()
    await anotarRecuento(annotate, fetchMock)
    await guardarConOtroTitulo()
    await waitFor(() => expect(putsDel(fetchMock, 2)).toHaveLength(1), ESPERA)
    expect(temaDelPut(fetchMock, 2)).toBe(idTema(3))
    expect(errores()).toEqual([])
    expect(consolaDeLaApp()).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------------
// Indicación 2: T-04, estados vecinos.

describe("CL3-3R3 · T-04, estados vecinos (indicación 2)", () => {
  // Retiene el próximo PUT del recurso 2; devuelve cómo soltarlo.
  const retenerElPut = (estado: Estado) => {
    const caja: { soltar: ((r: Response) => void) | null } = { soltar: null }
    estado.falla = ({ metodo, url, signal }) => {
      if (metodo !== "PUT" || !esDelRecurso(url, 2) || caja.soltar !== null) return null
      const r = retenida(signal)
      caja.soltar = r.soltar
      return r.promesa
    }
    return caja
  }

  // Guarda con el PUT retenido, sale a «Avisos» y suelta el 409 con la vista desmontada.
  const conflictoDesmontado = async (
    estado: Estado,
    router: Awaited<ReturnType<typeof montar>>["router"],
    fetchMock: FetchMock,
    salirA: string,
  ) => {
    const caja = retenerElPut(estado)
    fireEvent.change(campoTitulo(), { target: { value: "Mío" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(caja.soltar).not.toBeNull(), ESPERA)
    await act(() => router.navigate(salirA))
    await reposar()
    const lecturasSinVista = lecturasDel(fetchMock, 2)
    const avisosAntes = errores().length
    await act(async () => {
      caja.soltar?.(errorJson(409, "RECURSO_MODIFICADO", MENSAJE_409))
      await Promise.resolve()
    })
    await waitFor(() => expect(errores()).toHaveLength(avisosAntes + 1), ESPERA)
    await reposar(250)
    expect(lecturasDel(fetchMock, 2), "una lectura del recurso sin vista").toBe(lecturasSinVista)
    estado.falla = () => null
  }

  it("CL3-3R3-05: un 409 con la vista desmontada y volver con «atrás» del historial: la versión del servidor y guardar no da otro 409", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    const { router } = await montar(RUTA_EDITAR("maestro", 2))
    await abrirEdicion()
    cambioAjeno(estado, "Cambio ajeno")
    await conflictoDesmontado(estado, router, fetchMock, `${BASES.maestro}/${CLASE_ID}`)
    await act(() => router.navigate(-1))
    await abrirEdicion("Cambio ajeno")
    fireEvent.change(campoTitulo(), { target: { value: "Mío, sobre lo nuevo" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(exitos()).toEqual(["Cambios guardados"]), ESPERA)
    expect(errores().map(([texto]) => texto)).toEqual([MENSAJE_409])
    expect(putsDel(fetchMock, 2).at(-1)?.cuerpo).toMatchObject({ version: 1 })
    expect(consolaDeLaApp()).toEqual([])
  })

  it("CL3-3R3-06: un 409 desmontado y después «Mover» del mismo recurso desde «Recursos»: la edición que se abre es la versión del servidor, con su tema nuevo", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    const { router } = await montar(RUTA_EDITAR("maestro", 2))
    await abrirEdicion()
    cambioAjeno(estado, "Cambio ajeno")
    await conflictoDesmontado(estado, router, fetchMock, RUTA_RECURSOS("maestro"))
    const selector = await screen.findByLabelText("Tema de «Cambio ajeno»", {}, ESPERA)
    fireEvent.change(selector, { target: { value: idTema(2) } })
    const fila = filaDe("Cambio ajeno")
    enfocarYPulsar(within(fila).getByRole("button", { name: "Mover" }))
    await waitFor(() => expect(exitos()).toHaveLength(1), ESPERA)
    await waitFor(
      () =>
        expect(screen.getByRole("heading", { level: 3, name: /^Unidad 2 / })).toBeInTheDocument(),
      ESPERA,
    )
    fireEvent.click(within(filaDe("Cambio ajeno")).getByRole("link", { name: "Editar recurso" }))
    await abrirEdicion("Cambio ajeno")
    const tema = await screen.findByRole("combobox", { name: "Tema" }, ESPERA)
    expect(tema).toHaveValue(idTema(2))
    fireEvent.change(campoTitulo(), { target: { value: "Mío, sobre lo nuevo" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(exitos()).toHaveLength(2), ESPERA)
    expect(putsDel(fetchMock, 2).at(-1)?.cuerpo).toMatchObject({ version: 2, temaId: idTema(2) })
    expect(errores().map(([texto]) => texto)).toEqual([MENSAJE_409])
    expect(consolaDeLaApp()).toEqual([])
  })

  it("CL3-3R3-07: dos 409 seguidos con la vista desmontada entre ellos: un aviso por cada uno y ninguna lectura sin vista; cada vuelta abre la versión del servidor", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    const { router } = await montar(RUTA_EDITAR("maestro", 2))
    await abrirEdicion()
    cambioAjeno(estado, "Cambio ajeno 1")
    await conflictoDesmontado(estado, router, fetchMock, `${BASES.maestro}/${CLASE_ID}`)
    await act(() => router.navigate(RUTA_EDITAR("maestro", 2)))
    await abrirEdicion("Cambio ajeno 1")
    cambioAjeno(estado, "Cambio ajeno 2")
    await conflictoDesmontado(estado, router, fetchMock, `${BASES.maestro}/${CLASE_ID}`)
    expect(errores().map(([texto]) => texto)).toEqual([MENSAJE_409, MENSAJE_409])
    await act(() => router.navigate(RUTA_EDITAR("maestro", 2)))
    await abrirEdicion("Cambio ajeno 2")
    expect(consolaDeLaApp()).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------------
// Indicación 3: T-05, estados vecinos.

describe("CL3-3R3 · T-05, estados vecinos (indicación 3)", () => {
  // «Recursos» → «Editar recurso» del recurso 2 (deja su edición en la caché), con algo escrito, y
  // «Cancelar».
  const visitarLaEdicion = async (router: Awaited<ReturnType<typeof montar>>["router"]) => {
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    fireEvent.click(within(filaDe("Recurso 2")).getByRole("link", { name: "Editar recurso" }))
    const campo = await abrirEdicion()
    fireEvent.change(campo, { target: { value: "Cambios sin guardar" } })
    fireEvent.click(screen.getByRole("link", { name: "Cancelar" }))
    await waitFor(
      () => expect(router.state.location.pathname).toBe(RUTA_RECURSOS("maestro")),
      ESPERA,
    )
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
  }

  it("CL3-3R3-08: un 403 BORRADO_NO_PERMITIDO y después entrar por el enlace «Editar recurso» de la fila: la lectura fresca trae la versión del servidor", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    const { router } = await montar(RUTA_RECURSOS("maestro"))
    await visitarLaEdicion(router)
    const fila = cambioAjeno(estado, "Cambio ajeno")
    fila.puedeBorrar = false
    estado.falla = ({ metodo, url }) =>
      metodo === "DELETE" && esDelRecurso(url, 2)
        ? errorJson(403, "BORRADO_NO_PERMITIDO", "No puedes borrar este recurso.")
        : null
    await pedirBorrar("Recurso 2")
    await screen.findByRole("heading", { level: 4, name: "Cambio ajeno" }, ESPERA)
    const lecturasAntes = lecturasDel(fetchMock, 2)
    fireEvent.click(within(filaDe("Cambio ajeno")).getByRole("link", { name: "Editar recurso" }))
    await abrirEdicion("Cambio ajeno")
    expect(lecturasDel(fetchMock, 2)).toBeGreaterThan(lecturasAntes)
    expect(errores().map(([texto]) => texto)).toEqual(["No puedes borrar este recurso."])
    expect(consolaDeLaApp()).toEqual([])
  })

  it("CL3-3R3-09: un 404 al borrar y después «adelante» del historial hacia la edición: «Ese recurso ya no existe.», sin formulario", async () => {
    const servidor = crearServidor("maestro")
    const { router } = await montar(RUTA_RECURSOS("maestro"))
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    fireEvent.click(within(filaDe("Recurso 2")).getByRole("link", { name: "Editar recurso" }))
    await abrirEdicion()
    await act(() => router.navigate(-1))
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    servidor.estado.recursos = servidor.estado.recursos.filter(({ id }) => id !== idRecurso(2))
    await pedirBorrar("Recurso 2")
    await waitFor(
      () => expect(screen.queryByRole("heading", { level: 4, name: "Recurso 2" })).toBeNull(),
      ESPERA,
    )
    await act(() => router.navigate(1))
    await waitFor(
      () => expect(router.state.location.pathname).toBe(RUTA_EDITAR("maestro", 2)),
      ESPERA,
    )
    expect(await screen.findByText("Ese recurso ya no existe.", {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByLabelText("Título del recurso")).toBeNull()
    expect(consolaDeLaApp()).toEqual([])
  })

  it("CL3-3R3-10: un 404 al borrar con la edición en caché de una visita anterior con cambios sin guardar: al volver a ella, ningún formulario de un recurso que ya no existe", async () => {
    const { estado } = crearServidor("maestro")
    const { router } = await montar(RUTA_RECURSOS("maestro"))
    await visitarLaEdicion(router)
    estado.recursos = estado.recursos.filter(({ id }) => id !== idRecurso(2))
    await pedirBorrar("Recurso 2")
    await waitFor(
      () => expect(screen.queryByRole("heading", { level: 4, name: "Recurso 2" })).toBeNull(),
      ESPERA,
    )
    await act(() => router.navigate(-1))
    await waitFor(
      () => expect(router.state.location.pathname).toBe(RUTA_EDITAR("maestro", 2)),
      ESPERA,
    )
    expect(await screen.findByText("Ese recurso ya no existe.", {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByLabelText("Título del recurso")).toBeNull()
    expect(screen.queryByDisplayValue("Cambios sin guardar")).toBeNull()
    expect(consolaDeLaApp()).toEqual([])
  })
})
