// FORO-01c2 (§D-8.6, §E7.3 "Frontend" punto 8; E1-27): los hermanos T-01 a T-05 de CLASES-03d en
// features/tareas, con el router real (`rutas`) y el QueryClient de app/providers.tsx (staleTime de
// 30 s, un reintento). FORO-1C30 a FORO-1C35 en la tarea y FORO-1C36, los mismos en el foro.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { TEXTOS_DE_LA_CLASE } from "@/components/clase/data"
import { claveClaseDetalle } from "@/services/clasesService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import {
  claveCategorias,
  claveForo,
  claveTarea,
  claveTemas,
  consultaTemas,
} from "@/services/trabajoService"

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1c2f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const CLASE = uuid("2a2b3c4d", 1)
const ACTIVIDAD_ID = uuid("7a7b3c4d", 1)
const MAESTRO = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez" }
const TEMA_VIEJO = { id: uuid("5a5b3c4d", 1), nombre: "Unidad 1", orden: 0, elementos: 1 }
const TEMA_NUEVO = { id: uuid("5a5b3c4d", 2), nombre: "Unidad 2", orden: 1, elementos: 1 }
const CATEGORIA = { id: uuid("4a4b3c4d", 1), nombre: "Examen", peso: 40, tareas: 1 }
const ESPERA = { timeout: 5000 }
const BASE = `/maestro/clases/${CLASE}`

type Tipo = "tarea" | "foro"

interface Config {
  tipo: Tipo
  segmento: "tareas" | "foros"
  llave: "tarea" | "foro"
  laActividad: string
  deLaActividad: string
  vieja: string
  editar: string
  borrar: string
  siBorrar: string
  noExiste: string
  cargando: string
  conflicto: string
  // A dónde lleva borrar con éxito (la sección de la actividad).
  trasBorrar: string
}

const TAREA: Config = {
  tipo: "tarea",
  segmento: "tareas",
  llave: "tarea",
  laActividad: "la tarea",
  deLaActividad: "de la tarea",
  vieja: "la tarea vieja",
  editar: "Editar tarea",
  borrar: "Borrar tarea",
  siBorrar: "Sí, borrar tarea",
  noExiste: "Esa tarea ya no existe.",
  cargando: "Cargando la tarea…",
  conflicto: "Otra persona cambió esta tarea. Cargamos la versión actual.",
  trasBorrar: `${BASE}/trabajo`,
}

const FORO: Config = {
  tipo: "foro",
  segmento: "foros",
  llave: "foro",
  laActividad: "el foro",
  deLaActividad: "del foro",
  vieja: "el foro viejo",
  editar: "Editar foro",
  borrar: "Borrar foro",
  siBorrar: "Sí, borrar foro",
  noExiste: "Ese foro ya no existe.",
  cargando: "Cargando el foro…",
  conflicto: "Otra persona cambió este foro. Cargamos la versión actual.",
  trasBorrar: `${BASE}/foro`,
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface Llamada {
  metodo: string
  url: URL
  cuerpo: unknown
}

interface Estado {
  config: Config
  archivada: boolean
  version: number
  existe: boolean
  temaId: string | null
  categoriaId: string | null
  temas: (typeof TEMA_VIEJO)[]
  categorias: (typeof CATEGORIA)[]
  falla: (llamada: Llamada) => Response | Promise<Response> | undefined
  llamadas: Llamada[]
}

let estado: Estado

const actividadJson = () => {
  const tema = estado.temas.find(({ id }) => id === estado.temaId)
  const temaDeLaActividad =
    estado.temaId === null
      ? null
      : { id: estado.temaId, nombre: tema === undefined ? "Unidad 2" : tema.nombre }
  const comun = {
    id: ACTIVIDAD_ID,
    titulo: "Actividad uno",
    instrucciones: "Planteamiento de la actividad.",
    fechaLimite: "2030-01-15T16:00:00.000Z",
    puntos: 10,
    aceptaTardias: true,
    version: estado.version,
    categoria:
      estado.categoriaId === null ? null : { id: estado.categoriaId, nombre: "Examen", peso: 40 },
    tema: temaDeLaActividad,
    rubrica: [],
    adjuntos: [],
    autor: { ...MAESTRO, administracion: false },
    creadoEn: "2026-10-06T15:30:00.000Z",
    actualizadoEn: "2026-10-06T15:30:00.000Z",
    puedeEditar: true,
    puedeBorrar: true,
  }
  if (estado.config.tipo === "foro") return { foro: comun }
  return { tarea: { ...comun, requiereAdjuntos: true } }
}

const responder = (llamada: Llamada): Response | Promise<Response> => {
  const { metodo, url } = llamada
  const ruta = url.pathname
  if (ruta === "/api/me") {
    return respuestaJson(200, {
      id: MAESTRO.id,
      nombre: MAESTRO.nombre,
      email: "luis@ejemplo.mx",
      rol: "maestro",
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  const propia = estado.falla(llamada)
  if (propia !== undefined) return propia
  if (ruta === "/api/clases/impartidas") {
    return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
  }
  const deClase = `/api/clases/${CLASE}`
  if (ruta === deClase && metodo === "GET") {
    return respuestaJson(200, {
      clase: {
        id: CLASE,
        nombre: "Historia",
        descripcion: null,
        maestro: MAESTRO,
        maestros: [MAESTRO],
        archivadaEn: estado.archivada ? "2026-10-20T10:00:00.000Z" : null,
      },
    })
  }
  if (ruta === `${deClase}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
  if (ruta === `${deClase}/publicaciones`) {
    return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
  }
  if (ruta === `${deClase}/foros`) return respuestaJson(200, { foros: [], siguienteCursor: null })
  if (ruta === `${deClase}/temas`) return respuestaJson(200, { temas: estado.temas, sinTema: 0 })
  if (ruta === `${deClase}/categorias`) {
    return respuestaJson(200, { categorias: estado.categorias })
  }
  if (ruta === `${deClase}/${estado.config.segmento}/${ACTIVIDAD_ID}`) {
    if (!estado.existe) return errorApi(404, "TAREA_NO_ENCONTRADA")
    if (metodo === "GET") return respuestaJson(200, actividadJson())
    if (metodo === "DELETE") {
      estado.existe = false
      return new Response(null, { status: 204 })
    }
    const cuerpo = llamada.cuerpo as {
      version: number
      temaId: string | null
      categoriaId: string | null
    }
    if (cuerpo.version !== estado.version)
      return errorApi(409, "TAREA_MODIFICADA", estado.config.conflicto)
    estado.version += 1
    estado.temaId = cuerpo.temaId
    estado.categoriaId = cuerpo.categoriaId
    return respuestaJson(200, actividadJson())
  }
  return errorApi(500, "ERROR_INTERNO", `no esperada: ${metodo} ${ruta}`)
}

const cliente = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })

const montar = async (entradas: string[], queryClient = cliente()) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: entradas })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, queryClient }
}

const reposar = (ms = 150) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))

const enVuelo = () => {
  let soltar: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((resolver) => {
    soltar = resolver
  })
  return { promesa, soltar }
}

const rutaDe = (config: Config, sufijo = "") =>
  `${BASE}/${config.segmento}/${ACTIVIDAD_ID}${sufijo}`
const apiDe = (config: Config) => `/api/clases/${CLASE}/${config.segmento}/${ACTIVIDAD_ID}`
const lecturas = () =>
  estado.llamadas.filter(
    ({ metodo, url }) => metodo === "GET" && url.pathname === apiDe(estado.config),
  )
const guardados = () =>
  estado.llamadas.filter(
    ({ metodo, url }) => metodo === "PUT" && url.pathname === apiDe(estado.config),
  )
const pedidasDe = (sufijo: "temas" | "categorias") =>
  estado.llamadas.filter(
    ({ metodo, url }) => metodo === "GET" && url.pathname === `/api/clases/${CLASE}/${sufijo}`,
  )
const cuerpoDe = (llamada: Llamada | undefined) =>
  (llamada?.cuerpo ?? {}) as { version?: number; temaId?: unknown; categoriaId?: unknown }

const VACIO_DE_AVISOS = "Publica el primer aviso de tu clase."

const abrirEdicion = async (
  config: Config,
  entradas = [rutaDe(config, "/editar")],
  qc?: QueryClient,
) => {
  const montaje = await montar(entradas, qc)
  await screen.findByLabelText("Título", undefined, ESPERA)
  return montaje
}

const guardar = () => fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

const iniciar = (config: Config) => {
  estado = {
    config,
    archivada: false,
    version: 3,
    existe: true,
    temaId: null,
    categoriaId: null,
    temas: [],
    categorias: [],
    falla: () => undefined,
    llamadas: [],
  }
}

beforeEach(() => {
  establecerToken("token-de-prueba")
  iniciar(TAREA)
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://x")
      const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null
      const llamada = { metodo: init?.method ?? "GET", url, cuerpo }
      estado.llamadas.push(llamada)
      return Promise.resolve().then(() => responder(llamada))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
})

describe.each([TAREA, FORO])("Hermanos de CLASES-03d en $tipo", (config) => {
  const id = (n: string) => (config.tipo === "tarea" ? n : `FORO-1C36 (${n})`)

  beforeEach(() => {
    iniciar(config)
  })

  it(`${id("FORO-1C30")}: T-01, un 409 con la edición ya desmontada da un solo aviso y no vuelve a pedir ${config.laActividad}`, async () => {
    const { router } = await abrirEdicion(config)
    const put = enVuelo()
    estado.falla = ({ metodo, url }) =>
      metodo === "PUT" && url.pathname === apiDe(config) ? put.promesa : undefined
    guardar()
    await waitFor(() => expect(guardados()).toHaveLength(1), ESPERA)
    await act(() => router.navigate(BASE))
    await screen.findByText(VACIO_DE_AVISOS, undefined, ESPERA)
    const antes = lecturas().length
    put.soltar(errorApi(409, "TAREA_MODIFICADA", config.conflicto))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledWith(config.conflicto)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(lecturas()).toHaveLength(antes)
  })

  it(`${id("FORO-1C31")}: T-04, tras ese 409 volver antes de 30 s a la edición pide ${config.laActividad}, nace con la versión del servidor y guardar no da otro 409`, async () => {
    const { router } = await abrirEdicion(config)
    const put = enVuelo()
    estado.falla = ({ metodo, url }) =>
      metodo === "PUT" && url.pathname === apiDe(config) ? put.promesa : undefined
    guardar()
    await waitFor(() => expect(guardados()).toHaveLength(1), ESPERA)
    await act(() => router.navigate(BASE))
    await screen.findByText(VACIO_DE_AVISOS, undefined, ESPERA)
    // Otra persona guardó mientras tanto: el servidor ya está en la versión 4.
    estado.version = 4
    estado.falla = () => undefined
    put.soltar(errorApi(409, "TAREA_MODIFICADA", config.conflicto))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await reposar()
    const antes = lecturas().length
    await act(() => router.navigate(rutaDe(config, "/editar")))
    await screen.findByLabelText("Título", undefined, ESPERA)
    await waitFor(() => expect(lecturas().length).toBeGreaterThan(antes), ESPERA)
    await reposar()
    guardar()
    await waitFor(() => expect(guardados()).toHaveLength(2), ESPERA)
    expect(cuerpoDe(guardados()[1]).version).toBe(4)
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Cambios guardados"), ESPERA)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })

  describe(`${id("FORO-1C32")} a ${id("FORO-1C34")}: T-02 y T-03, los temas y las categorías al abrir la edición`, () => {
    // La lista en caché es de antes de que la actividad pasara a «Unidad 2» y a «Examen».
    const conListasViejas = () => {
      const qc = cliente()
      qc.setQueryData(claveTemas(CLASE), { temas: [TEMA_VIEJO], sinTema: 0 })
      qc.setQueryData(claveCategorias(CLASE), { categorias: [] })
      estado.temaId = TEMA_NUEVO.id
      estado.categoriaId = CATEGORIA.id
      estado.temas = [TEMA_VIEJO, TEMA_NUEVO]
      estado.categorias = [CATEGORIA]
      return qc
    }

    it(`${id("FORO-1C32")}: mientras la lectura de los temas y las categorías no llega, sus campos no se muestran y guardar conserva los ${config.deLaActividad}`, async () => {
      const qc = conListasViejas()
      const temas = enVuelo()
      const categorias = enVuelo()
      estado.falla = ({ url }) => {
        if (url.pathname.endsWith("/temas")) return temas.promesa
        if (url.pathname.endsWith("/categorias")) return categorias.promesa
        return undefined
      }
      await abrirEdicion(config, undefined, qc)
      await waitFor(() => expect(pedidasDe("temas")).toHaveLength(1), ESPERA)
      expect(pedidasDe("categorias")).toHaveLength(1)
      expect(screen.queryByLabelText("Tema")).toBeNull()
      expect(screen.queryByLabelText("Categoría")).toBeNull()
      guardar()
      await waitFor(() => expect(guardados()).toHaveLength(1), ESPERA)
      expect(cuerpoDe(guardados()[0]).temaId).toBe(TEMA_NUEVO.id)
      expect(cuerpoDe(guardados()[0]).categoriaId).toBe(CATEGORIA.id)
    })

    it(`${id("FORO-1C32")}: si esa lectura falla, los campos no se muestran y guardar conserva los ${config.deLaActividad}`, async () => {
      const qc = conListasViejas()
      estado.falla = ({ url }) =>
        url.pathname.endsWith("/temas") || url.pathname.endsWith("/categorias")
          ? errorApi(503, "SERVICIO_OCUPADO")
          : undefined
      await abrirEdicion(config, undefined, qc)
      await waitFor(() => expect(pedidasDe("temas").length).toBeGreaterThanOrEqual(2), ESPERA)
      await waitFor(() => expect(pedidasDe("categorias").length).toBeGreaterThanOrEqual(2), ESPERA)
      await reposar()
      expect(screen.queryByLabelText("Tema")).toBeNull()
      expect(screen.queryByLabelText("Categoría")).toBeNull()
      guardar()
      await waitFor(() => expect(guardados()).toHaveLength(1), ESPERA)
      expect(cuerpoDe(guardados()[0]).temaId).toBe(TEMA_NUEVO.id)
      expect(cuerpoDe(guardados()[0]).categoriaId).toBe(CATEGORIA.id)
    })

    it(`${id("FORO-1C33")}: cuando la lectura llega con el tema y la categoría, los campos los muestran elegidos y guardar los conserva`, async () => {
      const qc = conListasViejas()
      await abrirEdicion(config, undefined, qc)
      expect(await screen.findByLabelText("Tema", undefined, ESPERA)).toHaveValue(TEMA_NUEVO.id)
      expect(screen.getByLabelText("Categoría")).toHaveValue(CATEGORIA.id)
      guardar()
      await waitFor(() => expect(guardados()).toHaveLength(1), ESPERA)
      expect(cuerpoDe(guardados()[0]).temaId).toBe(TEMA_NUEVO.id)
      expect(cuerpoDe(guardados()[0]).categoriaId).toBe(CATEGORIA.id)
    })

    it(`${id("FORO-1C34")}: una lectura de los temas que salió antes de abrir y llega después no confirma: sale otra y guardar conserva el tema`, async () => {
      const qc = conListasViejas()
      // La lectura previa (de otra vista) sale con la lista vieja y queda en vuelo.
      const previa = enVuelo()
      let primera = true
      estado.falla = ({ url }) => {
        if (!url.pathname.endsWith("/temas") || !primera) return undefined
        primera = false
        return previa.promesa
      }
      void qc.fetchQuery({ ...consultaTemas(CLASE), staleTime: 0 }).catch(() => undefined)
      await waitFor(() => expect(pedidasDe("temas")).toHaveLength(1), ESPERA)
      await abrirEdicion(config, undefined, qc)
      previa.soltar(respuestaJson(200, { temas: [TEMA_VIEJO], sinTema: 0 }))
      await waitFor(() => expect(pedidasDe("temas").length).toBeGreaterThanOrEqual(2), ESPERA)
      await reposar()
      guardar()
      await waitFor(() => expect(guardados()).toHaveLength(1), ESPERA)
      expect(cuerpoDe(guardados()[0]).temaId).toBe(TEMA_NUEVO.id)
    })

    it(`${id("FORO-1C34")}: volver a abrir la edición vuelve a pedir los temas y las categorías`, async () => {
      const qc = conListasViejas()
      const { router } = await abrirEdicion(config, undefined, qc)
      await screen.findByLabelText("Tema", undefined, ESPERA)
      const temasAntes = pedidasDe("temas").length
      const categoriasAntes = pedidasDe("categorias").length
      await act(() => router.navigate(BASE))
      await screen.findByText(VACIO_DE_AVISOS, undefined, ESPERA)
      await act(() => router.navigate(rutaDe(config, "/editar")))
      await screen.findByLabelText("Tema", undefined, ESPERA)
      expect(pedidasDe("temas").length).toBeGreaterThan(temasAntes)
      expect(pedidasDe("categorias").length).toBeGreaterThan(categoriasAntes)
    })
  })

  it(`${id("FORO-1C35")}: T-05, borrar con 404 con la vista ya desmontada la quita de la caché: «atrás» dice «${config.noExiste}» sin pintar ${config.vieja}`, async () => {
    const { router } = await montar([BASE, rutaDe(config)])
    fireEvent.click(await screen.findByRole("button", { name: config.borrar }, ESPERA))
    const borrado = enVuelo()
    estado.falla = ({ metodo }) => (metodo === "DELETE" ? borrado.promesa : undefined)
    fireEvent.click(screen.getByRole("button", { name: config.siBorrar }))
    await waitFor(
      () => expect(estado.llamadas.some(({ metodo }) => metodo === "DELETE")).toBe(true),
      ESPERA,
    )
    await act(() => router.navigate(-1))
    await screen.findByText(VACIO_DE_AVISOS, undefined, ESPERA)
    estado.existe = false
    estado.falla = () => undefined
    borrado.soltar(errorApi(404, "TAREA_NO_ENCONTRADA"))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await reposar()
    await act(() => router.navigate(1))
    expect(screen.queryByRole("heading", { name: "Actividad uno" })).toBeNull()
    expect(await screen.findByText(config.noExiste, undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Actividad uno" })).toBeNull()
  })

  it(`${id("FORO-1C35")}: T-05, borrar con 403 BORRADO_NO_PERMITIDO con la vista ya desmontada la marca vieja sin pedirla; al volver se pide`, async () => {
    const { router, queryClient } = await montar([BASE, rutaDe(config)])
    fireEvent.click(await screen.findByRole("button", { name: config.borrar }, ESPERA))
    const borrado = enVuelo()
    estado.falla = ({ metodo }) => (metodo === "DELETE" ? borrado.promesa : undefined)
    fireEvent.click(screen.getByRole("button", { name: config.siBorrar }))
    await waitFor(
      () => expect(estado.llamadas.some(({ metodo }) => metodo === "DELETE")).toBe(true),
      ESPERA,
    )
    await act(() => router.navigate(-1))
    await screen.findByText(VACIO_DE_AVISOS, undefined, ESPERA)
    const antes = lecturas().length
    estado.falla = () => undefined
    borrado.soltar(errorApi(403, "BORRADO_NO_PERMITIDO", "Ya no puedes borrarla."))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith("Ya no puedes borrarla."), ESPERA)
    await reposar()
    expect(lecturas()).toHaveLength(antes)
    expect(
      queryClient.getQueryState(
        config.tipo === "foro" ? claveForo(CLASE, ACTIVIDAD_ID) : claveTarea(CLASE, ACTIVIDAD_ID),
      )?.isInvalidated,
    ).toBe(true)
    await act(() => router.navigate(1))
    await waitFor(() => expect(lecturas().length).toBeGreaterThan(antes), ESPERA)
  })
})

describe("FORO-1C41 · el 409 llega con la clase ya archivada (§E7.3, punto 8 b)", () => {
  it.each([TAREA, FORO])(
    "FORO-1C41: en $tipo, un 409 TAREA_MODIFICADA que llega con la clase archivada deja vieja la actividad; al restaurar y volver a abrir la edición nace con la versión del servidor y guardar no da otro 409",
    async (config) => {
      iniciar(config)
      const { router, queryClient } = await abrirEdicion(config)
      const put = enVuelo()
      estado.falla = ({ metodo, url }) =>
        metodo === "PUT" && url.pathname === apiDe(config) ? put.promesa : undefined
      guardar()
      await waitFor(() => expect(guardados()).toHaveLength(1), ESPERA)
      // La clase se archiva mientras el guardado vuela.
      estado.archivada = true
      await act(() =>
        queryClient.invalidateQueries({ queryKey: claveClaseDetalle(CLASE), exact: true }),
      )
      expect(
        await screen.findByText(TEXTOS_DE_LA_CLASE.archivada, undefined, ESPERA),
      ).toBeInTheDocument()
      estado.version = 4
      estado.falla = () => undefined
      put.soltar(errorApi(409, "TAREA_MODIFICADA", config.conflicto))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      await reposar()
      // Se restaura y se vuelve a abrir la edición.
      estado.archivada = false
      await act(() =>
        queryClient.invalidateQueries({ queryKey: claveClaseDetalle(CLASE), exact: true }),
      )
      await waitFor(
        () => expect(screen.queryByText(TEXTOS_DE_LA_CLASE.archivada)).toBeNull(),
        ESPERA,
      )
      await act(() => router.navigate(BASE))
      await screen.findByText(VACIO_DE_AVISOS, undefined, ESPERA)
      const antes = lecturas().length
      await act(() => router.navigate(rutaDe(config, "/editar")))
      await screen.findByLabelText("Título", undefined, ESPERA)
      await waitFor(() => expect(lecturas().length).toBeGreaterThan(antes), ESPERA)
      await reposar()
      guardar()
      await waitFor(() => expect(guardados()).toHaveLength(2), ESPERA)
      expect(cuerpoDe(guardados()[1]).version).toBe(4)
      await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Cambios guardados"), ESPERA)
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
  )
})
