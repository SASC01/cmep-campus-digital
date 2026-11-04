// Tester, CLASES-03d, ronda 2. Las correcciones de T-01 (el 409 con «Editar recurso» desmontada ya no
// vuelve a pedir el recurso) y T-02 (al abrir «Editar recurso» se vuelven a pedir los temas y solo cuenta
// la lista que llega después), por las seis indicaciones de "Verificación de la corrección de la ronda 1
// — 03d": lecturas cruzadas de la lista total, el 409 con la nueva lectura de temas fallida, «Mover» con
// la lista por sección vieja en Recursos y en Actividades, los estados vecinos de T-01 y O-01 (el 404 al
// borrar deja el recurso en la caché). Router real (`rutas`) y servidor doble en memoria, como en la
// ronda 1. Sin selectores de clases de estilo. La vista no muestra textos relativos al tiempo: sin reloj.
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

// ---------------------------------------------------------------------------------------------------
// Indicación 1: T-02 con lecturas cruzadas.

describe("CL3-3R2 · T-02 con lecturas cruzadas de la lista de temas (indicación 1)", () => {
  it("CL3-3R2-01: la lista total que «Recursos» pidió antes de mover el recurso llega después de abrir la edición: guardar solo el título conserva el tema del recurso", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    let soltarLaVieja: () => void = () => {
      throw new Error("Precondición: la lista total no se pidió desde «Recursos»")
    }
    let primera = true
    estado.falla = ({ metodo, url }) => {
      if (metodo !== "GET" || !totalDeTemas(url) || !primera) return null
      primera = false
      // La respuesta es la del servidor en el momento de la petición: sin «Unidad 3».
      const vieja = respuestaJson(200, {
        temas: estado.temas.map((tema, orden) => ({ ...tema, orden, elementos: 0 })),
        sinTema: 0,
      })
      const r = retenida(undefined)
      soltarLaVieja = () => r.soltar(vieja)
      return r.promesa
    }
    const { router } = await montar(RUTA_RECURSOS("maestro"))
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    moverEnElServidor(estado, 2)
    await act(() => router.navigate(RUTA_EDITAR("maestro", 2)))
    await abrirEdicion()
    await act(async () => {
      soltarLaVieja()
      await Promise.resolve()
    })
    await reposar()
    await guardarConOtroTitulo()
    await waitFor(() => expect(putsDel(fetchMock, 2)).toHaveLength(1), ESPERA)
    expect(temaDelPut(fetchMock, 2)).toBe(idTema(3))
  })

  it.each([
    ["llega sin el tema elegido", true],
    ["falla", false],
  ] as const)(
    "CL3-3R2-02: con el formulario abierto, otra acción invalida los temas y la lista nueva %s: lo que se envía es lo que el campo muestra",
    async (_caso, llega) => {
      const { estado, fetchMock } = crearServidor("maestro")
      const { cliente } = await montar(RUTA_EDITAR("maestro", 2))
      await abrirEdicion()
      const tema = await screen.findByRole("combobox", { name: "Tema" }, ESPERA)
      fireEvent.change(tema, { target: { value: idTema(2) } })
      expect(tema).toHaveValue(idTema(2))
      if (llega) estado.temas = estado.temas.filter(({ id }) => id !== idTema(2))
      if (!llega) {
        estado.falla = ({ metodo, url }) =>
          metodo === "GET" && totalDeTemas(url) ? errorJson(500, "ERROR_INTERNO", "Falla") : null
      }
      const pedidasAntes = llamadas(fetchMock).filter(({ url }) => totalDeTemas(url)).length
      await act(() => cliente.invalidateQueries({ queryKey: ["clases", CLASE_ID, "temas"] }))
      await waitFor(
        () =>
          expect(llamadas(fetchMock).filter(({ url }) => totalDeTemas(url)).length).toBeGreaterThan(
            pedidasAntes,
          ),
        ESPERA,
      )
      await reposar()
      const mostrado = screen.queryByRole("combobox", { name: "Tema" })
      const valor = mostrado === null ? null : (mostrado as HTMLSelectElement).value
      fireEvent.change(campoTitulo(), { target: { value: "Solo cambio el título" } })
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
      await waitFor(() => expect(putsDel(fetchMock, 2)).toHaveLength(1), ESPERA)
      expect(mostrado, "el campo «Tema» desapareció con la lista a la vista").not.toBeNull()
      expect(temaDelPut(fetchMock, 2)).toBe(valor === "" ? null : valor)
      expect(errores()).toEqual([])
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// Indicación 2: T-02 y el 409 (reinicio y nueva lectura de temas que falla).

describe("CL3-3R2 · T-02 con un 409 (indicación 2)", () => {
  it("CL3-3R2-03: tras el 409 el formulario se reinicia y la nueva lectura de temas falla: sin campo «Tema», un solo aviso, el foco en «Título del recurso» y guardar conserva el tema del recurso fresco", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    await montar(RUTA_EDITAR("maestro", 2))
    await abrirEdicion()
    await screen.findByRole("combobox", { name: "Tema" }, ESPERA)
    const fila = estado.recursos.find(({ id }) => id === idRecurso(2))
    if (fila === undefined) throw new Error("Precondición: el recurso 2 en el servidor")
    fila.titulo = "Cambio ajeno"
    fila.tema = idTema(2)
    fila.version += 1
    estado.falla = ({ metodo, url }) =>
      metodo === "GET" && totalDeTemas(url) ? errorJson(500, "ERROR_INTERNO", "Falla") : null
    const pedidasAntes = llamadas(fetchMock).filter(({ url }) => totalDeTemas(url)).length
    fireEvent.change(campoTitulo(), { target: { value: "Mío" } })
    enfocarYPulsar(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(campoTitulo()).toHaveValue("Cambio ajeno"), ESPERA)
    await waitFor(
      () =>
        expect(llamadas(fetchMock).filter(({ url }) => totalDeTemas(url)).length).toBeGreaterThan(
          pedidasAntes,
        ),
      ESPERA,
    )
    await reposar()
    expect(screen.queryByRole("combobox", { name: "Tema" })).toBeNull()
    expect(errores().map(([texto]) => texto)).toEqual([MENSAJE_409])
    expect(foco()).toBe(campoTitulo())
    fireEvent.change(campoTitulo(), { target: { value: "Mío otra vez" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(putsDel(fetchMock, 2)).toHaveLength(2), ESPERA)
    expect(putsDel(fetchMock, 2)[1]?.cuerpo).toMatchObject({ version: 1, temaId: idTema(2) })
  })
})

// ---------------------------------------------------------------------------------------------------
// Indicación 3: «Mover» con la lista por sección vieja, en «Recursos» y en «Actividades de aprendizaje».

const putsDeTema = (fetchMock: FetchMock) =>
  llamadas(fetchMock).filter((l) => l.metodo === "PUT" && l.url.pathname.endsWith("/tema"))

describe("CL3-3R2 · «Mover» con la lista por sección vieja (indicación 3)", () => {
  const casos = [
    {
      lugar: "Recursos",
      ruta: () => RUTA_RECURSOS("maestro"),
      inicial: () => ({
        recursos: [recurso(2, "docente", idTema(1)), recurso(3, "docente", idTema(1))],
      }),
      movido: "Recurso 2",
      otro: "Recurso 3",
      seccion: "docente",
    },
    {
      lugar: "Actividades de aprendizaje",
      ruta: () => `${BASES.maestro}/${CLASE_ID}/trabajo`,
      inicial: () => ({
        recursos: [],
        actividades: [
          { id: idRecurso(2), titulo: "Lectura 2", tema: idTema(1) },
          { id: idRecurso(3), titulo: "Lectura 3", tema: idTema(1) },
        ],
      }),
      movido: "Lectura 2",
      otro: "Lectura 3",
      seccion: "actividades",
    },
  ] as const

  const moverAfuera = (estado: Estado) => {
    estado.temas = [...estado.temas, { id: idTema(3), nombre: "Unidad 3" }]
    for (const fila of [...estado.recursos, ...estado.actividades]) {
      if (fila.id === idRecurso(2)) fila.tema = idTema(3)
    }
  }

  it.each(casos.map((c) => [c.lugar, c] as const))(
    "CL3-3R2-04: en «%s», con el elemento movido por otra persona dentro del staleTime, pulsar «Mover» sin elegir otro tema no envía nada",
    async (_lugar, caso) => {
      const { estado, fetchMock } = crearServidor("maestro", caso.inicial())
      await montar(caso.ruta())
      const selector = await screen.findByLabelText(`Tema de «${caso.movido}»`, {}, ESPERA)
      moverAfuera(estado)
      expect(selector).toHaveValue(idTema(1))
      const fila = selector.closest("li")
      if (fila === null) throw new Error("Precondición: la fila del elemento")
      enfocarYPulsar(within(fila).getByRole("button", { name: "Mover" }))
      await reposar(250)
      expect(putsDeTema(fetchMock)).toEqual([])
      expect(errores()).toEqual([])
      const temas = [...estado.recursos, ...estado.actividades].map(({ id, tema }) => [id, tema])
      expect(temas).toEqual([
        [idRecurso(2), idTema(3)],
        [idRecurso(3), idTema(1)],
      ])
    },
  )

  it.each(casos.map((c) => [c.lugar, c] as const))(
    "CL3-3R2-05: en «%s», un destino que otra persona borró da el aviso del servidor, renueva las listas y ningún tema cambia",
    async (_lugar, caso) => {
      const { estado, fetchMock } = crearServidor("maestro", caso.inicial())
      await montar(caso.ruta())
      const selector = await screen.findByLabelText(`Tema de «${caso.otro}»`, {}, ESPERA)
      moverAfuera(estado)
      estado.temas = estado.temas.filter(({ id }) => id !== idTema(2))
      const pedidasAntes = llamadas(fetchMock).filter(
        ({ url }) =>
          url.pathname === `${API}/temas` && url.searchParams.get("seccion") === caso.seccion,
      ).length
      fireEvent.change(selector, { target: { value: idTema(2) } })
      const fila = selector.closest("li")
      if (fila === null) throw new Error("Precondición: la fila del elemento")
      enfocarYPulsar(within(fila).getByRole("button", { name: "Mover" }))
      await waitFor(() => expect(errores()).toHaveLength(1), ESPERA)
      await waitFor(
        () =>
          expect(
            llamadas(fetchMock).filter(
              ({ url }) =>
                url.pathname === `${API}/temas` && url.searchParams.get("seccion") === caso.seccion,
            ).length,
          ).toBeGreaterThan(pedidasAntes),
        ESPERA,
      )
      await reposar(250)
      expect(errores().map(([texto]) => texto)).toEqual(["Ese tema ya no existe."])
      expect(putsDeTema(fetchMock)).toHaveLength(1)
      const temas = [...estado.recursos, ...estado.actividades].map(({ id, tema }) => [id, tema])
      expect(temas).toEqual([
        [idRecurso(2), idTema(3)],
        [idRecurso(3), idTema(1)],
      ])
      expect(foco()).not.toBe(document.body)
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// Indicación 4: los estados vecinos de T-01.

describe("CL3-3R2 · estados vecinos de T-01 (indicación 4)", () => {
  const cambioAjeno = (estado: Estado) => {
    const fila = estado.recursos.find(({ id }) => id === idRecurso(2))
    if (fila === undefined) throw new Error("Precondición: el recurso 2 en el servidor")
    fila.titulo = "Cambio ajeno"
    fila.version += 1
  }

  it("CL3-3R2-06: el 409 llega con la vista desmontada y la persona vuelve a «Editar recurso» antes de 30 s: la vista nace con la versión del servidor y guardar no da un segundo 409", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    const retenidas: ReturnType<typeof retenida>[] = []
    estado.falla = ({ metodo, url, signal }) => {
      if (metodo !== "PUT" || !esDelRecurso(url, 2) || retenidas.length > 0) return null
      const r = retenida(signal)
      retenidas.push(r)
      return r.promesa
    }
    const { router } = await montar(RUTA_EDITAR("maestro", 2))
    const campo = await abrirEdicion()
    cambioAjeno(estado)
    fireEvent.change(campo, { target: { value: "Mío" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(retenidas).toHaveLength(1), ESPERA)
    await act(() => router.navigate(`${BASES.maestro}/${CLASE_ID}`))
    await screen.findByRole("button", { name: "Publicar anuncio" }, ESPERA)
    await act(async () => {
      retenidas[0]?.soltar(errorJson(409, "RECURSO_MODIFICADO", MENSAJE_409))
      await Promise.resolve()
    })
    await waitFor(() => expect(errores()).toHaveLength(1), ESPERA)
    await reposar()
    await act(() => router.navigate(RUTA_EDITAR("maestro", 2)))
    await abrirEdicion("Cambio ajeno")
    fireEvent.change(campoTitulo(), { target: { value: "Mío, sobre lo nuevo" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(exitos()).toEqual(["Cambios guardados"]), ESPERA)
    expect(errores().map(([texto]) => texto)).toEqual([MENSAJE_409])
    expect(putsDel(fetchMock, 2).at(-1)?.cuerpo).toMatchObject({ version: 1 })
  })

  it("CL3-3R2-07: un 409 con la vista montada y la persona sale durante la recarga: al volver, la versión del servidor, sin reinicio pendiente ni foco movido, un solo aviso, y guardar funciona", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    const retenidas: ReturnType<typeof retenida>[] = []
    let tras409 = false
    estado.falla = ({ metodo, url }) => {
      if (metodo === "PUT" && esDelRecurso(url, 2) && !tras409) {
        tras409 = true
        return errorJson(409, "RECURSO_MODIFICADO", MENSAJE_409)
      }
      if (tras409 && retenidas.length === 0 && metodo === "GET" && esDelRecurso(url, 2)) {
        const r = retenida(undefined)
        retenidas.push(r)
        return r.promesa
      }
      return null
    }
    const { router } = await montar(RUTA_EDITAR("maestro", 2))
    const campo = await abrirEdicion()
    cambioAjeno(estado)
    fireEvent.change(campo, { target: { value: "Mío" } })
    enfocarYPulsar(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(retenidas).toHaveLength(1), ESPERA)
    await act(() => router.navigate(`${BASES.maestro}/${CLASE_ID}`))
    await screen.findByRole("button", { name: "Publicar anuncio" }, ESPERA)
    const fila = estado.recursos.find(({ id }) => id === idRecurso(2))
    if (fila === undefined) throw new Error("Precondición: el recurso 2 en el servidor")
    await act(async () => {
      retenidas[0]?.soltar(
        respuestaJson(200, {
          recurso: {
            id: fila.id,
            titulo: fila.titulo,
            texto: fila.texto,
            autor: fila.autor,
            creadoEn: fila.creadoEn,
            bloque: fila.bloque,
            adjuntos: [],
            comentarios: 0,
            puedeEditar: true,
            puedeBorrar: true,
            puedeMover: true,
            version: fila.version,
            tema: { id: idTema(1), nombre: "Unidad 1" },
          },
        }),
      )
      await Promise.resolve()
    })
    await reposar()
    await act(() => router.navigate(RUTA_EDITAR("maestro", 2)))
    await abrirEdicion("Cambio ajeno")
    await reposar()
    expect(foco()).not.toBe(campoTitulo())
    expect(errores().map(([texto]) => texto)).toEqual([MENSAJE_409])
    fireEvent.change(campoTitulo(), { target: { value: "Mío, sobre lo nuevo" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(exitos()).toEqual(["Cambios guardados"]), ESPERA)
    expect(putsDel(fetchMock, 2).at(-1)?.cuerpo).toMatchObject({ version: 1 })
    expect(errores()).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------------------------------
// Indicación 5: O-01 (el 404 al borrar deja el recurso en la caché).

describe("CL3-3R2 · O-01: después del 404 al borrar (indicación 5)", () => {
  it("CL3-3R2-08: tras borrar con 404 un recurso que otra persona ya borró, «atrás» a su «Editar recurso» antes de 30 s no muestra el formulario de un recurso que ya no existe", async () => {
    const { estado } = crearServidor("maestro")
    const { router } = await montar(RUTA_RECURSOS("maestro"))
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    fireEvent.click(within(filaDe("Recurso 2")).getByRole("link", { name: "Editar recurso" }))
    await abrirEdicion()
    fireEvent.click(screen.getByRole("link", { name: "Cancelar" }))
    await screen.findByRole("heading", { level: 4, name: "Recurso 2" }, ESPERA)
    // Otra persona borra el recurso 2; la lista que se ve todavía lo trae.
    estado.recursos = estado.recursos.filter(({ id }) => id !== idRecurso(2))
    await pedirBorrar("Recurso 2")
    await waitFor(
      () => expect(screen.queryByRole("heading", { level: 4, name: "Recurso 2" })).toBeNull(),
      ESPERA,
    )
    // CLASES-03e ronda 0 (C-33, §D-R0, Enmienda 13, decisión (2) del humano; §D-8.4): el aviso del
    // 404 al borrar un recurso es "Ese recurso ya no existe.". Sigue protegiendo un solo aviso y lo
    // que muestra «atrás» a la edición.
    expect(errores().map(([texto]) => texto)).toEqual(["Ese recurso ya no existe."])
    await act(() => router.navigate(-1))
    await waitFor(
      () => expect(router.state.location.pathname).toBe(RUTA_EDITAR("maestro", 2)),
      ESPERA,
    )
    await reposar(250)
    expect(screen.queryByLabelText("Título del recurso")).toBeNull()
    expect(await screen.findByText("Ese recurso ya no existe.", {}, ESPERA)).toBeInTheDocument()
  })
})
