// FORO-01c2, ronda 1 del tester: ataques a las vistas del foro (detalle, crear y editar), con el router
// real (`rutas`) y el QueryClient de app/providers.tsx (staleTime de 30 s, un reintento). Ids desde
// ATQ-FORO-111.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { clavePrefijoDeCalificaciones } from "@/services/calificacionesService"
import { claveClaseDetalle } from "@/services/clasesService"
import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import {
  claveCategorias,
  claveForo,
  claveListaDeForos,
  clavePrefijoDelTrabajo,
  claveTemas,
} from "@/services/trabajoService"

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

type Rol = "estudiante" | "maestro" | "admin"

const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1c2f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const CLASE = uuid("2a2b3c4d", 1)
const FORO_A = uuid("5a5b3c4d", 1)
const FORO_B = uuid("5a5b3c4d", 2)
const FORO_NUEVO = uuid("5a5b3c4d", 9)
const MAESTRO = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez" }
const TEMA = { id: uuid("4b4b3c4d", 1), nombre: "Unidad 1", orden: 0, elementos: 1 }
const CATEGORIA = { id: uuid("4a4b3c4d", 1), nombre: "Participación", peso: 30, tareas: 1 }
const ESPERA = { timeout: 5000 }
const BASES: Record<Rol, string> = {
  estudiante: `/estudiante/clases/${CLASE}`,
  maestro: `/maestro/clases/${CLASE}`,
  admin: `/admin/clases/${CLASE}`,
}
const API_CLASE = `/api/clases/${CLASE}`
const API_FOROS = `${API_CLASE}/foros`
const API_FORO = (foroId = FORO_A) => `${API_FOROS}/${foroId}`
const CONFLICTO = "Otra persona cambió este foro. Cargamos la versión actual."
const NO_EXISTE = "Ese foro ya no existe."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface ForoDoble {
  titulo: string
  version: number
  existe: boolean
  puedeEditar: boolean
  puedeBorrar: boolean
}

interface Llamada {
  metodo: string
  url: URL
  cuerpo: unknown
}

interface Estado {
  rol: Rol
  archivada: boolean
  foros: Record<string, ForoDoble>
  falla: (llamada: Llamada) => Response | Promise<Response> | undefined
  llamadas: Llamada[]
}

let estado: Estado

const foroDoble = (titulo: string, version = 0): ForoDoble => ({
  titulo,
  version,
  existe: true,
  puedeEditar: true,
  puedeBorrar: true,
})

const foroJson = (foroId: string, foro: ForoDoble) => ({
  foro: {
    id: foroId,
    titulo: foro.titulo,
    instrucciones: "Opina sobre la lectura.",
    fechaLimite: "2030-01-15T16:00:00.000Z",
    puntos: 20,
    aceptaTardias: false,
    version: foro.version,
    categoria: { id: CATEGORIA.id, nombre: CATEGORIA.nombre, peso: CATEGORIA.peso },
    tema: { id: TEMA.id, nombre: TEMA.nombre },
    rubrica: [],
    adjuntos: [],
    autor: { ...MAESTRO, administracion: false },
    creadoEn: "2026-10-06T15:30:00.000Z",
    actualizadoEn: "2026-10-06T15:30:00.000Z",
    puedeEditar: estado.rol !== "estudiante" && foro.puedeEditar,
    puedeBorrar: estado.rol !== "estudiante" && foro.puedeBorrar,
  },
})

const filaDeLaLista = (foroId: string, foro: ForoDoble) => ({
  id: foroId,
  titulo: foro.titulo,
  autor: { ...MAESTRO, administracion: false },
  creadoEn: "2026-10-01T15:30:00.000Z",
  fechaLimite: "2030-01-15T16:00:00.000Z",
  puntos: 20,
  tema: null,
  participaciones: 0,
  entrega: null,
})

const responder = (llamada: Llamada): Response | Promise<Response> => {
  const { metodo, url } = llamada
  const ruta = url.pathname
  if (ruta === "/api/auth/refrescar") return errorApi(401, "NO_AUTENTICADO")
  if (ruta === "/api/me") {
    return respuestaJson(200, {
      id: uuid("4f4f3c4d", 1),
      nombre: "Ana López",
      email: "ana@ejemplo.mx",
      rol: estado.rol,
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  const propia = estado.falla(llamada)
  if (propia !== undefined) return propia
  if (ruta === "/api/clases/inscritas" || ruta === "/api/clases/impartidas") {
    return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
  }
  if (ruta === API_CLASE) {
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
  if (ruta === `${API_CLASE}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
  if (ruta === `${API_CLASE}/temas`) return respuestaJson(200, { temas: [TEMA], sinTema: 0 })
  if (ruta === `${API_CLASE}/categorias`) {
    return respuestaJson(200, { categorias: [CATEGORIA] })
  }
  if (ruta === API_FOROS && metodo === "GET") {
    const filas = Object.entries(estado.foros)
      .filter(([, foro]) => foro.existe)
      .map(([id, foro]) => filaDeLaLista(id, foro))
    return respuestaJson(200, { foros: filas, siguienteCursor: null })
  }
  if (ruta === API_FOROS && metodo === "POST") {
    const cuerpo = llamada.cuerpo as { titulo: string }
    estado.foros[FORO_NUEVO] = foroDoble(cuerpo.titulo)
    return respuestaJson(201, foroJson(FORO_NUEVO, foroDoble(cuerpo.titulo)))
  }
  const deForo = /^\/api\/clases\/[^/]+\/foros\/([^/]+)$/.exec(ruta)
  if (deForo !== null) {
    const foroId = deForo[1] ?? ""
    // Como el backend (shared/src/foros.ts, foroIdParamSchema): un id que no es uuid es un VALIDACION.
    if (!/^[0-9a-f-]{36}$/.test(foroId)) {
      return errorApi(400, "VALIDACION", "foroId: debe ser un identificador válido")
    }
    const foro = estado.foros[foroId]
    if (foro === undefined || !foro.existe) return errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
    if (metodo === "GET") return respuestaJson(200, foroJson(foroId, foro))
    if (metodo === "PUT") {
      const cuerpo = llamada.cuerpo as { version: number; titulo: string }
      if (cuerpo.version !== foro.version) return errorApi(409, "TAREA_MODIFICADA", CONFLICTO)
      foro.version += 1
      foro.titulo = cuerpo.titulo
      return respuestaJson(200, foroJson(foroId, foro))
    }
    if (metodo === "DELETE") {
      foro.existe = false
      return new Response(null, { status: 204 })
    }
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

const delForo = (rol: Rol, foroId = FORO_A) => `${BASES[rol]}/foros/${foroId}`
const editarDe = (foroId = FORO_A, rol: Rol = "maestro") => `${delForo(rol, foroId)}/editar`
const indiceDe = (predicado: (llamada: Llamada) => boolean) => estado.llamadas.findIndex(predicado)
const lecturasDe = (foroId = FORO_A) =>
  estado.llamadas.filter(({ metodo, url }) => metodo === "GET" && url.pathname === API_FORO(foroId))
const lecturasDe_ = (ruta: string) =>
  estado.llamadas.filter(({ metodo, url }) => metodo === "GET" && url.pathname === ruta)
const escrituras = () =>
  estado.llamadas.filter(
    ({ metodo }) => metodo === "POST" || metodo === "PUT" || metodo === "DELETE",
  )
const tituloH2 = (texto: string) => screen.findByRole("heading", { level: 2, name: texto }, ESPERA)

// Vigila si un texto aparece en algún momento (aunque sea un instante) en el documento.
const vigilarTexto = (texto: string) => {
  const visto = { valor: false }
  const observador = new MutationObserver(() => {
    if (document.body.textContent.includes(texto)) visto.valor = true
  })
  observador.observe(document.body, { childList: true, subtree: true, characterData: true })
  return {
    visto,
    detener: () => {
      observador.disconnect()
    },
  }
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  estado = {
    rol: "maestro",
    archivada: false,
    foros: {
      [FORO_A]: foroDoble("Debate de la unidad", 3),
      [FORO_B]: foroDoble("Segundo debate", 7),
    },
    falla: () => undefined,
    llamadas: [],
  }
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
  vi.mocked(irA).mockClear()
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null
      const llamada = {
        metodo: init?.method ?? "GET",
        url: new URL(String(entrada), "http://x"),
        cuerpo,
      }
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

describe("ATQ-FORO-111 · un :foroId que coincide con la clave de la lista de «Foro»", () => {
  it.each(["maestro", "estudiante"] as const)(
    "ATQ-FORO-111: %s abre «Foro» y después …/foros/lista: la vista dice que el foro no existe, sin romperse, y la lista sigue sirviendo",
    async (rol) => {
      estado.rol = rol
      const { router, queryClient } = await montar([`${BASES[rol]}/foro`])
      await screen.findByRole("heading", { level: 2, name: "Foro" }, ESPERA)
      expect(await screen.findByText("Debate de la unidad", undefined, ESPERA)).toBeInTheDocument()
      const consola = vi.spyOn(console, "error").mockImplementation(() => undefined)
      try {
        await act(() => router.navigate(`${BASES[rol]}/foros/lista`))
        expect(await screen.findByText(NO_EXISTE, undefined, ESPERA)).toBeInTheDocument()
        expect(screen.queryByText(/Unexpected Application Error/)).toBeNull()
        await act(() => router.navigate(`${BASES[rol]}/foro`))
        expect(
          await screen.findByText("Debate de la unidad", undefined, ESPERA),
        ).toBeInTheDocument()
        const lista = queryClient.getQueryData<{ pages: unknown[] }>(claveListaDeForos(CLASE))
        expect(Array.isArray(lista?.pages)).toBe(true)
      } finally {
        consola.mockRestore()
      }
    },
  )

  it("ATQ-FORO-111: el maestro abre «Foro» y después …/foros/lista/editar: la vista dice que el foro no existe, sin romperse", async () => {
    const { router } = await montar([`${BASES.maestro}/foro`])
    expect(await screen.findByText("Debate de la unidad", undefined, ESPERA)).toBeInTheDocument()
    const consola = vi.spyOn(console, "error").mockImplementation(() => undefined)
    try {
      await act(() => router.navigate(`${BASES.maestro}/foros/lista/editar`))
      expect(await screen.findByText(NO_EXISTE, undefined, ESPERA)).toBeInTheDocument()
      expect(screen.queryByText(/Unexpected Application Error/)).toBeNull()
    } finally {
      consola.mockRestore()
    }
  })

  it("ATQ-FORO-111 (control): sin la lista en caché, …/foros/lista dice que el foro no existe", async () => {
    await montar([`${BASES.maestro}/foros/lista`])
    expect(await screen.findByText(NO_EXISTE, undefined, ESPERA)).toBeInTheDocument()
  })

  it("ATQ-FORO-111: después de …/foros/lista, abrir «Foro» muestra la lista sin romperse", async () => {
    const { router } = await montar([`${BASES.maestro}/foros/lista`])
    expect(await screen.findByText(NO_EXISTE, undefined, ESPERA)).toBeInTheDocument()
    const consola = vi.spyOn(console, "error").mockImplementation(() => undefined)
    try {
      await act(() => router.navigate(`${BASES.maestro}/foro`))
      expect(await screen.findByText("Debate de la unidad", undefined, ESPERA)).toBeInTheDocument()
      expect(screen.queryByText(/Unexpected Application Error/)).toBeNull()
    } finally {
      consola.mockRestore()
    }
  })
})

describe("ATQ-FORO-112 · borrar un foro con éxito (punto 1 del manager)", () => {
  it.each([
    ["Sí, borrar foro", "maestro"],
    ["Borrar con las participaciones", "admin"],
  ] as const)(
    "ATQ-FORO-112: «%s» con éxito no vuelve a pedir el foro borrado, nunca pinta «Ese foro ya no existe.», avisa una vez y la lista de «Foro» se vuelve a pedir al llegar",
    async (boton, rol) => {
      estado.rol = rol
      let primera = true
      estado.falla = ({ metodo }) => {
        if (boton !== "Borrar con las participaciones" || metodo !== "DELETE" || !primera) {
          return undefined
        }
        primera = false
        return errorApi(409, "TAREA_CON_ENTREGAS", "Este foro tiene 3 participaciones.")
      }
      const { queryClient } = await montar([delForo(rol)])
      await tituloH2("Debate de la unidad")
      // La lista de «Foro» fresca en caché: sin invalidación, al llegar no se pediría (staleTime 30 s).
      queryClient.setQueryData(claveListaDeForos(CLASE), {
        pages: [
          {
            foros: [filaDeLaLista(FORO_A, foroDoble("Debate de la unidad"))],
            siguienteCursor: null,
          },
        ],
        pageParams: [null],
      })
      const vigia = vigilarTexto(NO_EXISTE)
      fireEvent.click(screen.getByRole("button", { name: "Borrar foro" }))
      fireEvent.click(screen.getByRole("button", { name: "Sí, borrar foro" }))
      if (boton === "Borrar con las participaciones") {
        fireEvent.click(await screen.findByRole("button", { name: boton }, ESPERA))
      }
      await screen.findByRole("heading", { level: 2, name: "Foro" }, ESPERA)
      await reposar(300)
      vigia.detener()
      const borrado = indiceDe(
        ({ metodo }) => metodo === "DELETE" && estado.foros[FORO_A]?.existe === false,
      )
      expect(borrado).toBeGreaterThanOrEqual(0)
      const ultimoDelete = estado.llamadas.map(({ metodo }) => metodo).lastIndexOf("DELETE")
      const lecturasTrasBorrar = estado.llamadas
        .slice(ultimoDelete + 1)
        .filter(({ metodo, url }) => metodo === "GET" && url.pathname === API_FORO())
      expect(lecturasTrasBorrar).toHaveLength(0)
      expect(vigia.visto.valor).toBe(false)
      expect(aviso.success).toHaveBeenCalledTimes(1)
      expect(aviso.success).toHaveBeenCalledWith("Foro borrado")
      expect(aviso.error).not.toHaveBeenCalled()
      const listaTrasBorrar = estado.llamadas
        .slice(ultimoDelete + 1)
        .filter(({ metodo, url }) => metodo === "GET" && url.pathname === API_FOROS)
      expect(listaTrasBorrar.length).toBeGreaterThanOrEqual(1)
      expect(screen.queryByText("Debate de la unidad")).toBeNull()
    },
  )
})

describe("ATQ-FORO-113 · lo que FORO-1C05 y FORO-1C13 nombran en su título (N-32)", () => {
  it("ATQ-FORO-113: «Publicar foro» vuelve a pedir los temas y las categorías que el formulario mira y deja viejas las calificaciones y las actividades", async () => {
    const { queryClient } = await montar([`${BASES.maestro}/foros/nuevo`])
    await screen.findByRole("heading", { name: "Nuevo foro" }, ESPERA)
    await screen.findByLabelText("Tema", undefined, ESPERA)
    queryClient.setQueryData([...clavePrefijoDeCalificaciones(CLASE), "x"], {})
    queryClient.setQueryData([...clavePrefijoDelTrabajo(CLASE), "sin-tema"], { pages: [] })
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Debate nuevo" } })
    fireEvent.change(screen.getByLabelText("Planteamiento"), { target: { value: "¿Qué opinas?" } })
    fireEvent.change(screen.getByLabelText("Fecha límite"), {
      target: { value: "2030-01-15T10:00" },
    })
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: CATEGORIA.id } })
    fireEvent.click(screen.getByRole("button", { name: "Publicar foro" }))
    await tituloH2("Debate nuevo")
    await reposar(200)
    const publicado = indiceDe(({ metodo }) => metodo === "POST")
    expect(publicado).toBeGreaterThanOrEqual(0)
    const trasPublicar = estado.llamadas.slice(publicado + 1)
    expect(
      trasPublicar.filter(({ url }) => url.pathname === `${API_CLASE}/temas`).length,
    ).toBeGreaterThanOrEqual(1)
    expect(
      trasPublicar.filter(({ url }) => url.pathname === `${API_CLASE}/categorias`).length,
    ).toBeGreaterThanOrEqual(1)
    expect(
      queryClient.getQueryState([...clavePrefijoDeCalificaciones(CLASE), "x"])?.isInvalidated,
    ).toBe(true)
    expect(
      queryClient.getQueryState([...clavePrefijoDelTrabajo(CLASE), "sin-tema"])?.isInvalidated,
    ).toBe(true)
  })

  it("ATQ-FORO-113: borrar un foro con éxito deja viejas las actividades, los temas, las categorías y las calificaciones", async () => {
    const { queryClient } = await montar([delForo("maestro")])
    await tituloH2("Debate de la unidad")
    const claves = [
      [...clavePrefijoDelTrabajo(CLASE), "sin-tema"],
      claveTemas(CLASE),
      claveCategorias(CLASE),
      [...clavePrefijoDeCalificaciones(CLASE), "x"],
    ]
    for (const clave of claves) queryClient.setQueryData(clave, { marca: true })
    for (const clave of claves) expect(queryClient.getQueryState(clave)?.isInvalidated).toBe(false)
    fireEvent.click(screen.getByRole("button", { name: "Borrar foro" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar foro" }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Foro borrado"), ESPERA)
    await reposar()
    // La lista de «Foro», que la vista de llegada mira, se vuelve a pedir: ATQ-FORO-112.
    for (const clave of claves) expect(queryClient.getQueryState(clave)?.isInvalidated).toBe(true)
  })
})

describe("ATQ-FORO-114 · el 409 del foro A llega con la edición del foro B montada (T-01 y T-04 con key)", () => {
  it("ATQ-FORO-114: un aviso, ninguna lectura de A ni de B, A queda vieja y lo escrito en B no se toca", async () => {
    const { router, queryClient } = await montar([editarDe(FORO_A)])
    await screen.findByRole("heading", { name: "Editar foro" }, ESPERA)
    await waitFor(() => expect(screen.getByLabelText("Título")).toHaveValue("Debate de la unidad"))
    const put = enVuelo()
    estado.falla = ({ metodo, url }) =>
      metodo === "PUT" && url.pathname === API_FORO(FORO_A) ? put.promesa : undefined
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Cambio en A" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(escrituras()).toHaveLength(1))
    await act(() => router.navigate(editarDe(FORO_B)))
    await waitFor(
      () => expect(screen.getByLabelText("Título")).toHaveValue("Segundo debate"),
      ESPERA,
    )
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Escrito en B" } })
    const lecturasA = lecturasDe(FORO_A).length
    const lecturasB = lecturasDe(FORO_B).length
    put.soltar(errorApi(409, "TAREA_MODIFICADA", CONFLICTO))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledWith(CONFLICTO)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(lecturasDe(FORO_A)).toHaveLength(lecturasA)
    expect(lecturasDe(FORO_B)).toHaveLength(lecturasB)
    expect(queryClient.getQueryState(claveForo(CLASE, FORO_A))?.isInvalidated).toBe(true)
    expect(screen.getByLabelText("Título")).toHaveValue("Escrito en B")
    expect(screen.getByRole("button", { name: "Guardar cambios" })).not.toHaveAttribute(
      "aria-busy",
      "true",
    )
  })
})

describe("ATQ-FORO-115 · borrar el foro A con la vista ya en el foro B", () => {
  it.each([
    ["204", () => new Response(null, { status: 204 }), "Foro borrado"],
    ["404", () => errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE), NO_EXISTE],
    [
      "403 BORRADO_NO_PERMITIDO",
      () => errorApi(403, "BORRADO_NO_PERMITIDO", "Ya no puedes borrar este foro."),
      "Ya no puedes borrar este foro.",
    ],
  ] as const)(
    "ATQ-FORO-115: con %s, la persona sigue en B (no navega a «Foro»), B no se vuelve a pedir, un solo aviso, y A sale de la caché o queda vieja sin pedirse",
    async (caso, respuesta, texto) => {
      const { router, queryClient } = await montar([delForo("maestro", FORO_A)])
      await tituloH2("Debate de la unidad")
      const borrado = enVuelo()
      estado.falla = ({ metodo }) => (metodo === "DELETE" ? borrado.promesa : undefined)
      fireEvent.click(screen.getByRole("button", { name: "Borrar foro" }))
      fireEvent.click(screen.getByRole("button", { name: "Sí, borrar foro" }))
      await waitFor(() => expect(escrituras()).toHaveLength(1))
      await act(() => router.navigate(delForo("maestro", FORO_B)))
      await tituloH2("Segundo debate")
      const lecturasA = lecturasDe(FORO_A).length
      const lecturasB = lecturasDe(FORO_B).length
      borrado.soltar(respuesta())
      await waitFor(
        () => expect(aviso.success.mock.calls.length + aviso.error.mock.calls.length).toBe(1),
        ESPERA,
      )
      await reposar(300)
      expect(aviso.success.mock.calls.length + aviso.error.mock.calls.length).toBe(1)
      const llamado = caso === "204" ? aviso.success : aviso.error
      expect(llamado).toHaveBeenCalledWith(texto)
      expect(router.state.location.pathname).toBe(delForo("maestro", FORO_B))
      expect(screen.getByRole("heading", { level: 2, name: "Segundo debate" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Borrar foro" })).toBeInTheDocument()
      expect(lecturasDe(FORO_B)).toHaveLength(lecturasB)
      expect(lecturasDe(FORO_A)).toHaveLength(lecturasA)
      const estadoA = queryClient.getQueryState(claveForo(CLASE, FORO_A))
      if (caso === "403 BORRADO_NO_PERMITIDO") {
        expect(estadoA?.isInvalidated).toBe(true)
        return
      }
      expect(estadoA).toBeUndefined()
    },
  )
})

describe("ATQ-FORO-116 · 409 CLASE_ARCHIVADA al borrar y al guardar un foro", () => {
  it("ATQ-FORO-116: al borrar, un aviso, la clase se vuelve a pedir y el detalle queda sin «Editar foro» ni «Borrar foro», sin navegar", async () => {
    const { router } = await montar([delForo("maestro")])
    await tituloH2("Debate de la unidad")
    estado.falla = ({ metodo }) => {
      if (metodo !== "DELETE") return undefined
      estado.archivada = true
      return errorApi(409, "CLASE_ARCHIVADA", "Esta clase está archivada.")
    }
    fireEvent.click(screen.getByRole("button", { name: "Borrar foro" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar foro" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await waitFor(
      () => expect(screen.queryByRole("link", { name: "Editar foro" })).toBeNull(),
      ESPERA,
    )
    await reposar(300)
    expect(screen.queryByRole("button", { name: /Borrar foro|Sí, borrar foro/ })).toBeNull()
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(router.state.location.pathname).toBe(delForo("maestro"))
    const borrado = indiceDe(({ metodo }) => metodo === "DELETE")
    expect(
      estado.llamadas.slice(borrado + 1).filter(({ url }) => url.pathname === API_CLASE).length,
    ).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByRole("heading", { level: 2, name: "Debate de la unidad" }),
    ).toBeInTheDocument()
  })

  it("ATQ-FORO-116: al guardar, un aviso, no se vuelve a pedir el foro y la ruta pasa a decir que la clase está archivada", async () => {
    await montar([editarDe()])
    await screen.findByRole("heading", { name: "Editar foro" }, ESPERA)
    await waitFor(() => expect(screen.getByLabelText("Título")).toHaveValue("Debate de la unidad"))
    estado.falla = ({ metodo }) => {
      if (metodo !== "PUT") return undefined
      estado.archivada = true
      return errorApi(409, "CLASE_ARCHIVADA", "Esta clase está archivada.")
    }
    const lecturas = lecturasDe().length
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Cambio" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    expect(
      await screen.findByText(
        "Esta clase está archivada: solo se puede consultar.",
        undefined,
        ESPERA,
      ),
    ).toBeInTheDocument()
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(lecturasDe()).toHaveLength(lecturas)
    expect(screen.getByRole("link", { name: "Volver a Foro" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull()
  })
})

const REDIRECCIONES = [
  ["401 sin refresco", () => errorApi(401, "NO_AUTENTICADO")],
  ["403 ACCESO_RESTRINGIDO", () => errorApi(403, "ACCESO_RESTRINGIDO")],
  ["403 CAMBIO_DE_CONTRASENA_REQUERIDO", () => errorApi(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")],
] as const

describe("ATQ-FORO-117 · las tres redirecciones de apiClient no avisan", () => {
  it.each(REDIRECCIONES)(
    "ATQ-FORO-117: la primera carga del detalle y de la edición con %s redirige sin ningún aviso",
    async (_caso, respuesta) => {
      estado.falla = ({ metodo, url }) =>
        metodo === "GET" && url.pathname === API_FORO() ? respuesta() : undefined
      await montar([delForo("maestro")])
      await waitFor(() => expect(irA).toHaveBeenCalled(), ESPERA)
      await reposar(300)
      expect(aviso.error).not.toHaveBeenCalled()
      cleanup()
      vi.mocked(irA).mockClear()
      // El refresco fallido limpió el token: la segunda montura empieza con sesión, como la primera.
      establecerToken("token-de-prueba")
      await montar([editarDe()])
      await waitFor(() => expect(irA).toHaveBeenCalled(), ESPERA)
      await reposar(300)
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )

  it.each(REDIRECCIONES)(
    "ATQ-FORO-117: la recarga tras un 409 que responde %s redirige sin otro aviso que el del conflicto",
    async (_caso, respuesta) => {
      await montar([editarDe()])
      await waitFor(
        () => expect(screen.getByLabelText("Título")).toHaveValue("Debate de la unidad"),
        ESPERA,
      )
      const foroA = estado.foros[FORO_A]
      if (foroA === undefined) throw new Error("Precondición: existe el foro A")
      foroA.version = 4
      let tras409 = false
      estado.falla = ({ metodo, url }) => {
        if (metodo === "PUT") {
          tras409 = true
          return undefined
        }
        if (tras409 && metodo === "GET" && url.pathname === API_FORO()) return respuesta()
        return undefined
      }
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
      await waitFor(() => expect(irA).toHaveBeenCalled(), ESPERA)
      await reposar(300)
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(aviso.error).toHaveBeenCalledWith(CONFLICTO)
    },
  )
})

const lecturasDeTemas = () => lecturasDe_(`${API_CLASE}/temas`)
const lecturasDeCategorias = () => lecturasDe_(`${API_CLASE}/categorias`)
const putsDe = (foroId = FORO_A) =>
  estado.llamadas.filter(({ metodo, url }) => metodo === "PUT" && url.pathname === API_FORO(foroId))
const cuerpoDe = (llamada: Llamada | undefined) => {
  if (llamada === undefined) throw new Error("Precondición: la petición existe")
  return llamada.cuerpo as { temaId: string | null; categoriaId: string | null; version: number }
}
const abrirEdicion = async (entradas = [editarDe()]) => {
  const montaje = await montar(entradas)
  await screen.findByRole("heading", { name: "Editar foro" }, ESPERA)
  await waitFor(
    () => expect(screen.getByLabelText("Título")).toHaveValue("Debate de la unidad"),
    ESPERA,
  )
  return montaje
}

// Las listas ya en caché (las cargó "Actividades" o una edición anterior): sin ellas el formulario no
// se pinta (cargando o el error de las opciones), que es la conducta de antes de 01c2.
const abrirEdicionConListas = async () => {
  const montaje = await montar([delForo("maestro")])
  await tituloH2("Debate de la unidad")
  montaje.queryClient.setQueryData(claveTemas(CLASE), { temas: [TEMA], sinTema: 0 })
  montaje.queryClient.setQueryData(claveCategorias(CLASE), { categorias: [CATEGORIA] })
  await act(() => montaje.router.navigate(editarDe()))
  await screen.findByRole("heading", { name: "Editar foro" }, ESPERA)
  await waitFor(
    () => expect(screen.getByLabelText("Título")).toHaveValue("Debate de la unidad"),
    ESPERA,
  )
  return montaje
}

describe("ATQ-FORO-118 · temas y categorías al abrir la edición del foro (T-02 y T-03)", () => {
  it("ATQ-FORO-118: si las dos lecturas fallan, los campos no se muestran y guardar conserva el tema y la categoría del foro", async () => {
    estado.falla = ({ url }) =>
      url.pathname === `${API_CLASE}/temas` || url.pathname === `${API_CLASE}/categorias`
        ? errorApi(503, "SERVICIO_OCUPADO")
        : undefined
    await abrirEdicionConListas()
    await waitFor(() => expect(lecturasDeTemas().length).toBeGreaterThanOrEqual(2), ESPERA)
    await reposar(300)
    expect(screen.queryByLabelText("Tema")).toBeNull()
    expect(screen.queryByLabelText("Categoría")).toBeNull()
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Sin listas" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(putsDe()).toHaveLength(1), ESPERA)
    expect(cuerpoDe(putsDe()[0]).temaId).toBe(TEMA.id)
    expect(cuerpoDe(putsDe()[0]).categoriaId).toBe(CATEGORIA.id)
  })

  it("ATQ-FORO-118: tras el fallo, una lectura correcta posterior muestra los campos con el tema y la categoría elegidos", async () => {
    let fallar = true
    estado.falla = ({ url }) =>
      fallar &&
      (url.pathname === `${API_CLASE}/temas` || url.pathname === `${API_CLASE}/categorias`)
        ? errorApi(503, "SERVICIO_OCUPADO")
        : undefined
    const { queryClient } = await abrirEdicionConListas()
    await waitFor(() => expect(lecturasDeTemas().length).toBeGreaterThanOrEqual(2), ESPERA)
    await reposar(300)
    expect(screen.queryByLabelText("Tema")).toBeNull()
    fallar = false
    await act(() => queryClient.invalidateQueries({ queryKey: claveTemas(CLASE) }))
    await act(() => queryClient.invalidateQueries({ queryKey: claveCategorias(CLASE) }))
    expect(await screen.findByLabelText("Tema", undefined, ESPERA)).toHaveValue(TEMA.id)
    expect(await screen.findByLabelText("Categoría", undefined, ESPERA)).toHaveValue(CATEGORIA.id)
  })

  it("ATQ-FORO-118: un VALIDACION de temaId con el campo aún oculto se lee una sola vez, sin aviso, y queda ligado al campo cuando aparece", async () => {
    const temas = enVuelo()
    let primera = true
    estado.falla = ({ metodo, url }) => {
      if (url.pathname === `${API_CLASE}/temas` && primera) {
        primera = false
        return temas.promesa
      }
      if (metodo === "PUT") return errorApi(400, "VALIDACION", "temaId: El tema ya no existe")
      return undefined
    }
    await abrirEdicionConListas()
    expect(screen.queryByLabelText("Tema")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    expect(await screen.findByText("El tema ya no existe", undefined, ESPERA)).toBeInTheDocument()
    await reposar(200)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(screen.getAllByText("El tema ya no existe")).toHaveLength(1)
    temas.soltar(respuestaJson(200, { temas: [TEMA], sinTema: 0 }))
    const campo = await screen.findByLabelText("Tema", undefined, ESPERA)
    expect(screen.getAllByText("El tema ya no existe")).toHaveLength(1)
    const descrito = campo.getAttribute("aria-describedby")
    if (descrito === null) throw new Error("El campo Tema no está ligado a su error")
    expect(document.getElementById(descrito)).toHaveTextContent("El tema ya no existe")
    expect(campo).toHaveAttribute("aria-invalid", "true")
  })

  it("ATQ-FORO-118: el reinicio tras un 409 vuelve a pedir los temas y las categorías, y el siguiente guardado conserva el tema y la categoría", async () => {
    await abrirEdicion()
    await screen.findByLabelText("Tema", undefined, ESPERA)
    const foroA = estado.foros[FORO_A]
    if (foroA === undefined) throw new Error("Precondición: existe el foro A")
    foroA.version = 4
    const temasAntes = lecturasDeTemas().length
    const categoriasAntes = lecturasDeCategorias().length
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(CONFLICTO), ESPERA)
    await waitFor(() => expect(lecturasDeTemas().length).toBeGreaterThan(temasAntes), ESPERA)
    await waitFor(
      () => expect(lecturasDeCategorias().length).toBeGreaterThan(categoriasAntes),
      ESPERA,
    )
    expect(await screen.findByLabelText("Tema", undefined, ESPERA)).toHaveValue(TEMA.id)
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(putsDe()).toHaveLength(2), ESPERA)
    expect(cuerpoDe(putsDe()[1]).version).toBe(4)
    expect(cuerpoDe(putsDe()[1]).temaId).toBe(TEMA.id)
    expect(cuerpoDe(putsDe()[1]).categoriaId).toBe(CATEGORIA.id)
  })

  it("ATQ-FORO-118: abrir y cerrar la edición tres veces pide una vez cada lista por apertura y termina con los campos elegidos, sin avisos", async () => {
    await montar([delForo("maestro")])
    await tituloH2("Debate de la unidad")
    for (let vez = 1; vez <= 3; vez += 1) {
      fireEvent.click(screen.getByRole("link", { name: "Editar foro" }))
      await screen.findByRole("heading", { name: "Editar foro" }, ESPERA)
      expect(await screen.findByLabelText("Tema", undefined, ESPERA)).toHaveValue(TEMA.id)
      if (vez === 3) break
      fireEvent.click(screen.getByRole("link", { name: "Cancelar" }))
      await tituloH2("Debate de la unidad")
    }
    await reposar(200)
    expect(lecturasDeTemas()).toHaveLength(3)
    expect(lecturasDeCategorias()).toHaveLength(3)
    expect(screen.getByLabelText("Categoría")).toHaveValue(CATEGORIA.id)
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("ATQ-FORO-119 · la edición del foro sin caso (N-33)", () => {
  const EDITAR_RED = "No pudimos actualizar el foro. Puedes seguir editando; revisa tu conexión."
  const EDITAR_SERVIDOR =
    "No pudimos actualizar el foro. Puedes seguir editando; inténtalo de nuevo en un momento."

  it.each([
    ["un 503", () => errorApi(503, "SERVICIO_OCUPADO"), EDITAR_RED],
    ["la red caída", () => Promise.reject(new TypeError("Failed to fetch")), EDITAR_RED],
    [
      "un 429",
      () => errorApi(429, "DEMASIADAS_SOLICITUDES", "Espera un momento."),
      EDITAR_SERVIDOR,
    ],
  ] as const)(
    "ATQ-FORO-119: una recarga fallida con %s, con el foro en caché, avisa una vez por fallo con su texto y conserva lo escrito",
    async (_caso, respuesta, texto) => {
      const { queryClient } = await abrirEdicion()
      fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Lo que escribí" } })
      estado.falla = ({ metodo, url }) =>
        metodo === "GET" && url.pathname === API_FORO() ? respuesta() : undefined
      await act(() => queryClient.invalidateQueries({ queryKey: claveForo(CLASE, FORO_A) }))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      await reposar(300)
      expect(aviso.error).toHaveBeenCalledWith(texto)
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(screen.getByLabelText("Título")).toHaveValue("Lo que escribí")
      await act(() => queryClient.invalidateQueries({ queryKey: claveForo(CLASE, FORO_A) }))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
      await reposar(300)
      expect(aviso.error).toHaveBeenCalledTimes(2)
      expect(screen.getByLabelText("Título")).toHaveValue("Lo que escribí")
    },
  )

  it("ATQ-FORO-119: en una clase archivada, la recarga fallida del foro no avisa", async () => {
    const { queryClient } = await abrirEdicion()
    estado.archivada = true
    await act(() =>
      queryClient.invalidateQueries({ queryKey: claveClaseDetalle(CLASE), exact: true }),
    )
    expect(
      await screen.findByText(
        "Esta clase está archivada: solo se puede consultar.",
        undefined,
        ESPERA,
      ),
    ).toBeInTheDocument()
    estado.falla = ({ metodo, url }) =>
      metodo === "GET" && url.pathname === API_FORO()
        ? errorApi(503, "SERVICIO_OCUPADO")
        : undefined
    await act(() => queryClient.invalidateQueries({ queryKey: claveForo(CLASE, FORO_A) }))
    await waitFor(() => expect(lecturasDe().length).toBeGreaterThanOrEqual(2), ESPERA)
    await reposar(400)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("ATQ-FORO-119: si una recarga quita puedeEditar con el foco en «Título», dice «No puedes editar este foro.» y el foco va a la raíz de la vista, no a <body>", async () => {
    const hasFocus = vi.spyOn(document, "hasFocus").mockReturnValue(true)
    try {
      const { queryClient } = await abrirEdicion()
      const titulo = screen.getByLabelText("Título")
      titulo.focus()
      expect(titulo).toHaveFocus()
      const foroA = estado.foros[FORO_A]
      if (foroA === undefined) throw new Error("Precondición: existe el foro A")
      foroA.puedeEditar = false
      await act(() => queryClient.invalidateQueries({ queryKey: claveForo(CLASE, FORO_A) }))
      expect(
        await screen.findByText("No puedes editar este foro.", undefined, ESPERA),
      ).toBeInTheDocument()
      await reposar(100)
      expect(document.activeElement).not.toBe(document.body)
      expect(document.activeElement).toHaveAttribute("tabindex", "-1")
      expect(document.activeElement).toContainElement(
        screen.getByText("No puedes editar este foro."),
      )
      expect(aviso.error).not.toHaveBeenCalled()
    } finally {
      hasFocus.mockRestore()
    }
  })
})

describe("ATQ-FORO-120 · el alumno y las rutas del foro", () => {
  it("ATQ-FORO-120: …/foros/nuevo y …/foros/:foroId/editar no le muestran ningún formulario ni escriben nada", async () => {
    estado.rol = "estudiante"
    const { router } = await montar([`${BASES.estudiante}/foros/nuevo`])
    await waitFor(
      () => expect(router.state.location.pathname).not.toBe(`${BASES.estudiante}/foros/nuevo`),
      ESPERA,
    )
    await reposar(300)
    expect(screen.queryByRole("heading", { name: "Nuevo foro" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Publicar foro" })).toBeNull()
    cleanup()
    const segundo = await montar([editarDe(FORO_A, "estudiante")])
    await waitFor(
      () => expect(segundo.router.state.location.pathname).not.toBe(editarDe(FORO_A, "estudiante")),
      ESPERA,
    )
    await reposar(300)
    expect(screen.queryByRole("heading", { name: "Editar foro" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull()
    expect(escrituras()).toHaveLength(0)
  })

  it("ATQ-FORO-120: el detalle del alumno no trae «Editar foro» ni «Borrar foro» aunque el servidor dijera puedeEditar y puedeBorrar", async () => {
    estado.rol = "estudiante"
    estado.falla = ({ metodo, url }) => {
      if (metodo !== "GET" || url.pathname !== API_FORO()) return undefined
      const cuerpo = foroJson(FORO_A, foroDoble("Debate de la unidad", 3))
      return respuestaJson(200, { foro: { ...cuerpo.foro, puedeEditar: true, puedeBorrar: true } })
    }
    await montar([delForo("estudiante")])
    await tituloH2("Debate de la unidad")
    expect(screen.queryByRole("link", { name: "Editar foro" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Borrar foro" })).toBeNull()
  })
})

describe("ATQ-FORO-122 · VALIDACION y códigos fuera de contrato en la vista del foro", () => {
  it("ATQ-FORO-122: la primera lectura con un VALIDACION de participacionId reemplaza la vista con un texto propio, sin el del servidor y sin aviso", async () => {
    estado.falla = ({ metodo, url }) =>
      metodo === "GET" && url.pathname === API_FORO()
        ? errorApi(400, "VALIDACION", "participacionId: texto crudo del servidor")
        : undefined
    await montar([delForo("maestro")])
    expect(await screen.findByRole("alert", undefined, ESPERA)).toBeInTheDocument()
    await reposar(300)
    expect(screen.queryByText(/texto crudo del servidor/)).toBeNull()
    expect(screen.queryByText(/participacionId/)).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it.each([
    [
      "un VALIDACION de participacionId",
      () => errorApi(400, "VALIDACION", "participacionId: crudo"),
    ],
    ["ALUMNO_NO_ENCONTRADO", () => errorApi(404, "ALUMNO_NO_ENCONTRADO", "crudo del alumno")],
  ] as const)(
    "ATQ-FORO-122: una recarga con %s y el foro en caché no muestra el texto del servidor en ningún lado y avisa a lo más una vez",
    async (_caso, respuesta) => {
      const { queryClient } = await montar([delForo("maestro")])
      await tituloH2("Debate de la unidad")
      estado.falla = ({ metodo, url }) =>
        metodo === "GET" && url.pathname === API_FORO() ? respuesta() : undefined
      await act(() => queryClient.invalidateQueries({ queryKey: claveForo(CLASE, FORO_A) }))
      await waitFor(() => expect(lecturasDe().length).toBeGreaterThanOrEqual(3), ESPERA)
      await reposar(400)
      expect(screen.queryByText(/crudo/)).toBeNull()
      expect(aviso.error.mock.calls.length).toBeLessThanOrEqual(1)
      for (const [texto] of aviso.error.mock.calls) expect(String(texto)).not.toMatch(/crudo/)
    },
  )

  it("ATQ-FORO-122: guardar con un VALIDACION de participacionId da un solo aviso legible, ningún ErrorDeCampo y conserva lo escrito", async () => {
    estado.falla = ({ metodo }) =>
      metodo === "PUT"
        ? errorApi(400, "VALIDACION", "participacionId: crudo del servidor")
        : undefined
    await abrirEdicion()
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Lo que escribí" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await reposar(200)
    expect(aviso.error).toHaveBeenCalledWith("Esa participación ya no existe.")
    expect(screen.queryByText(/crudo/)).toBeNull()
    expect(screen.getByLabelText("Título")).toHaveValue("Lo que escribí")
    expect(screen.getByRole("button", { name: "Guardar cambios" })).not.toHaveAttribute(
      "aria-busy",
      "true",
    )
  })
})

describe("ATQ-FORO-121 · AccionesDeLaTarea con sus dos mutaciones (punto 8)", () => {
  const TAREA = uuid("7a7b3c4d", 1)
  const actividad = (id: string) => ({
    ...foroJson(id, foroDoble("Actividad", 0)).foro,
    requiereAdjuntos: true,
  })

  const montarAcciones = async (tipo: "tarea" | "foro" | undefined) => {
    const { AccionesDeLaTarea } = await import("./components/acciones-de-la-tarea")
    const { MemoryRouter } = await import("react-router")
    render(
      <QueryClientProvider client={cliente()}>
        <MemoryRouter initialEntries={[`${BASES.maestro}/x`]}>
          <AccionesDeLaTarea
            claseId={CLASE}
            tarea={actividad(TAREA)}
            {...(tipo === undefined ? {} : { tipo })}
            base={BASES.maestro}
            puedeConfirmarEntregas={false}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it.each([
    [undefined, "Editar tarea", "Borrar tarea", "Sí, borrar tarea", "tareas"],
    ["tarea", "Editar tarea", "Borrar tarea", "Sí, borrar tarea", "tareas"],
    ["foro", "Editar foro", "Borrar foro", "Sí, borrar foro", "foros"],
  ] as const)(
    "ATQ-FORO-121: con tipo %s, los textos, el enlace de editar y el DELETE son solo de su tipo",
    async (tipo, editar, borrar, siBorrar, segmento) => {
      const borrado = enVuelo()
      estado.falla = ({ metodo }) => (metodo === "DELETE" ? borrado.promesa : undefined)
      await montarAcciones(tipo)
      expect(screen.getByRole("link", { name: editar })).toHaveAttribute(
        "href",
        `${BASES.maestro}/${segmento}/${TAREA}/editar`,
      )
      fireEvent.click(screen.getByRole("button", { name: borrar }))
      fireEvent.click(screen.getByRole("button", { name: siBorrar }))
      await waitFor(() => expect(escrituras()).toHaveLength(1))
      expect(escrituras()[0]?.url.pathname).toBe(`${API_CLASE}/${segmento}/${TAREA}`)
      expect(screen.getByRole("button", { name: siBorrar })).toHaveAttribute("aria-busy", "true")
      borrado.soltar(new Response(null, { status: 204 }))
      await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
      expect(aviso.success).toHaveBeenCalledWith(
        segmento === "foros" ? "Foro borrado" : "Tarea borrada",
      )
      expect(escrituras()).toHaveLength(1)
    },
  )
})

describe("ATQ-FORO-123 · publicar un foro y saltar a otra clase con la publicación en vuelo", () => {
  const CLASE_B = uuid("2a2b3c4d", 2)
  const API_CLASE_B = `/api/clases/${CLASE_B}`

  it("ATQ-FORO-123: no navega al foro nuevo, avisa una vez y el formulario de la otra clase nace vacío", async () => {
    const post = enVuelo()
    estado.falla = ({ metodo, url }) => {
      if (metodo === "POST" && url.pathname === API_FOROS) return post.promesa
      if (url.pathname === API_CLASE_B) {
        return respuestaJson(200, {
          clase: {
            id: CLASE_B,
            nombre: "Geografía",
            descripcion: null,
            maestro: MAESTRO,
            maestros: [MAESTRO],
            archivadaEn: null,
          },
        })
      }
      if (url.pathname === `${API_CLASE_B}/codigo`) return respuestaJson(200, { codigo: "HIJKLMN" })
      if (url.pathname === `${API_CLASE_B}/temas`) {
        return respuestaJson(200, { temas: [], sinTema: 0 })
      }
      if (url.pathname === `${API_CLASE_B}/categorias`) {
        return respuestaJson(200, { categorias: [] })
      }
      return undefined
    }
    const { router } = await montar([`${BASES.maestro}/foros/nuevo`])
    await screen.findByRole("heading", { name: "Nuevo foro" }, ESPERA)
    await screen.findByLabelText("Categoría", undefined, ESPERA)
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Escrito en A" } })
    fireEvent.change(screen.getByLabelText("Planteamiento"), { target: { value: "¿Qué opinas?" } })
    fireEvent.change(screen.getByLabelText("Fecha límite"), {
      target: { value: "2030-01-15T10:00" },
    })
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: CATEGORIA.id } })
    fireEvent.click(screen.getByRole("button", { name: "Publicar foro" }))
    await waitFor(() => expect(escrituras()).toHaveLength(1))
    const destino = `/maestro/clases/${CLASE_B}/foros/nuevo`
    await act(() => router.navigate(destino))
    await waitFor(() => expect(screen.getByLabelText("Título")).toHaveValue(""), ESPERA)
    post.soltar(respuestaJson(201, foroJson(FORO_NUEVO, foroDoble("Escrito en A"))))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    await reposar(300)
    expect(aviso.success).toHaveBeenCalledWith("Foro publicado")
    expect(router.state.location.pathname).toBe(destino)
    expect(screen.getByRole("heading", { name: "Nuevo foro" })).toBeInTheDocument()
    expect(screen.getByLabelText("Título")).toHaveValue("")
    expect(screen.getByRole("button", { name: "Publicar foro" })).not.toHaveAttribute(
      "aria-busy",
      "true",
    )
    expect(escrituras()).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })
})
