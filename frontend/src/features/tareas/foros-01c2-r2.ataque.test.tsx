// FORO-01c2, ronda 2 del tester: el remedio de T-01 (claveForo con el segmento fijo "foro") contra otros
// ids que no son uuid, el aislamiento entre la lista y cada foro, y un uuid en mayúsculas (el backend lo
// acepta y lo pasa a minúsculas: shared/src/foros.ts, foroIdSchema). Router real (`rutas`) y el
// QueryClient de app/providers.tsx (staleTime de 30 s, un reintento). Ids desde ATQ-FORO-124.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveForo, claveListaDeForos, clavePrefijoDeForos } from "@/services/trabajoService"

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
const FORO_A_MAYUSCULAS = FORO_A.toUpperCase()
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
const NO_EXISTE = "Ese foro ya no existe."
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
}

interface Llamada {
  metodo: string
  url: URL
  cuerpo: unknown
}

interface Estado {
  rol: Rol
  foros: Record<string, ForoDoble>
  falla: (llamada: Llamada) => Response | Promise<Response> | undefined
  llamadas: Llamada[]
}

let estado: Estado

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
    puedeEditar: estado.rol !== "estudiante",
    puedeBorrar: estado.rol !== "estudiante",
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
        archivadaEn: null,
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
  const deForo = /^\/api\/clases\/[^/]+\/foros\/([^/]+)$/.exec(ruta)
  if (deForo !== null) {
    const crudo = decodeURIComponent(deForo[1] ?? "")
    // Como el backend: un id que no es uuid es un VALIDACION de foroId; un uuid se pasa a minúsculas.
    if (!UUID.test(crudo)) {
      return errorApi(400, "VALIDACION", "foroId: debe ser un identificador válido")
    }
    const foroId = crudo.toLowerCase()
    const foro = estado.foros[foroId]
    if (foro === undefined || !foro.existe) return errorApi(404, "TAREA_NO_ENCONTRADA", NO_EXISTE)
    if (metodo === "GET") return respuestaJson(200, foroJson(foroId, foro))
    if (metodo === "PUT") {
      const cuerpo = llamada.cuerpo as { version: number; titulo: string }
      if (cuerpo.version !== foro.version) {
        return errorApi(409, "TAREA_MODIFICADA", "Otra persona cambió este foro.")
      }
      foro.version += 1
      foro.titulo = cuerpo.titulo
      return respuestaJson(200, foroJson(foroId, foro))
    }
    if (metodo === "DELETE") {
      foro.existe = false
      return new Response(null, { status: 204 })
    }
  }
  // Una ruta que el servidor no tiene (por ejemplo, …/foros/ con la barra final).
  return errorApi(404, "NO_ENCONTRADO", `Route ${metodo}:${ruta} not found`)
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

const delForo = (rol: Rol, foroId: string = FORO_A) => `${BASES[rol]}/foros/${foroId}`
const lecturasDe = (foroId: string) =>
  estado.llamadas.filter(
    ({ metodo, url }) =>
      metodo === "GET" && decodeURIComponent(url.pathname) === `${API_FOROS}/${foroId}`,
  )
const lecturasDeLaLista = () =>
  estado.llamadas.filter(({ metodo, url }) => metodo === "GET" && url.pathname === API_FOROS)
const tituloH2 = (texto: string) => screen.findByRole("heading", { level: 2, name: texto }, ESPERA)

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  estado = {
    rol: "maestro",
    foros: {
      [FORO_A]: { titulo: "Debate de la unidad", version: 3, existe: true },
      [FORO_B]: { titulo: "Segundo debate", version: 7, existe: true },
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

// Rutas con un :foroId que no es uuid: [rol, sufijo bajo …/foros/, texto que se espera].
const PALABRAS = [
  ["maestro", "foro", NO_EXISTE],
  ["maestro", "FORO", NO_EXISTE],
  ["maestro", "Lista", NO_EXISTE],
  ["maestro", "foros", NO_EXISTE],
  ["maestro", "foro/editar", NO_EXISTE],
  ["maestro", "nuevo/editar", NO_EXISTE],
  ["maestro", "FORO/editar", NO_EXISTE],
  ["maestro", "%20", null],
  ["maestro", "%20/editar", null],
  ["estudiante", "foro", NO_EXISTE],
  ["estudiante", "FORO", NO_EXISTE],
  ["estudiante", "%20", null],
] as const

const esperarElError = async (texto: string | null) => {
  if (texto !== null) {
    expect(await screen.findByText(texto, undefined, ESPERA)).toBeInTheDocument()
    return
  }
  expect(await screen.findByRole("alert", undefined, ESPERA)).toBeInTheDocument()
}

describe("ATQ-FORO-124 · otros :foroId que no son uuid, con la lista y otro foro en la caché", () => {
  it.each(PALABRAS)(
    "ATQ-FORO-124: %s, primero «Foro» y el foro B, después …/foros/%s: dice que el foro no existe sin romperse; la lista y B siguen intactos",
    async (rol, sufijo, texto) => {
      estado.rol = rol
      const consola = vi.spyOn(console, "error").mockImplementation(() => undefined)
      try {
        const { router, queryClient } = await montar([`${BASES[rol]}/foro`])
        expect(
          await screen.findByText("Debate de la unidad", undefined, ESPERA),
        ).toBeInTheDocument()
        await act(() => router.navigate(delForo(rol, FORO_B)))
        await tituloH2("Segundo debate")
        const lista = queryClient.getQueryData(claveListaDeForos(CLASE))
        const foroB = queryClient.getQueryData(claveForo(CLASE, FORO_B))
        await act(() => router.navigate(`${BASES[rol]}/foros/${sufijo}`))
        await esperarElError(texto)
        expect(screen.queryByText(/Unexpected Application Error/)).toBeNull()
        expect(screen.queryByText(/Route GET|identificador válido/)).toBeNull()
        expect(queryClient.getQueryData(claveListaDeForos(CLASE))).toBe(lista)
        expect(queryClient.getQueryData(claveForo(CLASE, FORO_B))).toBe(foroB)
        await act(() => router.navigate(`${BASES[rol]}/foro`))
        expect(
          await screen.findByText("Debate de la unidad", undefined, ESPERA),
        ).toBeInTheDocument()
        await act(() => router.navigate(delForo(rol, FORO_B)))
        await tituloH2("Segundo debate")
      } finally {
        consola.mockRestore()
      }
    },
  )

  it.each(PALABRAS)(
    "ATQ-FORO-124: %s, primero …/foros/%s, después «Foro» y el foro B: los dos se muestran bien",
    async (rol, sufijo, texto) => {
      estado.rol = rol
      const consola = vi.spyOn(console, "error").mockImplementation(() => undefined)
      try {
        const { router } = await montar([`${BASES[rol]}/foros/${sufijo}`])
        await esperarElError(texto)
        await act(() => router.navigate(`${BASES[rol]}/foro`))
        expect(
          await screen.findByText("Debate de la unidad", undefined, ESPERA),
        ).toBeInTheDocument()
        await act(() => router.navigate(delForo(rol, FORO_B)))
        await tituloH2("Segundo debate")
        expect(screen.queryByText(/Unexpected Application Error/)).toBeNull()
      } finally {
        consola.mockRestore()
      }
    },
  )
})

describe("ATQ-FORO-125 · aislamiento entre la lista de «Foro» y cada foro con la clave nueva", () => {
  const sembrar = (queryClient: QueryClient) => {
    queryClient.setQueryData(claveListaDeForos(CLASE), {
      pages: [
        {
          foros: [
            filaDeLaLista(FORO_A, { titulo: "Debate de la unidad", version: 3, existe: true }),
          ],
          siguienteCursor: null,
        },
      ],
      pageParams: [null],
    })
    queryClient.setQueryData(
      claveForo(CLASE, FORO_B),
      foroJson(FORO_B, { titulo: "Segundo debate", version: 7, existe: true }),
    )
  }

  it("ATQ-FORO-125: invalidar un foro no toca la lista ni otro foro; invalidar la lista no toca ningún foro; el prefijo alcanza a todos", async () => {
    const { queryClient } = await montar([delForo("maestro")])
    await tituloH2("Debate de la unidad")
    sembrar(queryClient)
    const lecturasA = lecturasDe(FORO_A).length
    await act(() => queryClient.invalidateQueries({ queryKey: claveForo(CLASE, FORO_A) }))
    await waitFor(() => expect(lecturasDe(FORO_A)).toHaveLength(lecturasA + 1), ESPERA)
    expect(queryClient.getQueryState(claveListaDeForos(CLASE))?.isInvalidated).toBe(false)
    expect(queryClient.getQueryState(claveForo(CLASE, FORO_B))?.isInvalidated).toBe(false)
    await act(() => queryClient.invalidateQueries({ queryKey: claveListaDeForos(CLASE) }))
    await reposar()
    expect(lecturasDe(FORO_A)).toHaveLength(lecturasA + 1)
    expect(queryClient.getQueryState(claveForo(CLASE, FORO_A))?.isInvalidated).toBe(false)
    expect(queryClient.getQueryState(claveForo(CLASE, FORO_B))?.isInvalidated).toBe(false)
    expect(queryClient.getQueryState(claveListaDeForos(CLASE))?.isInvalidated).toBe(true)
    await act(() => queryClient.invalidateQueries({ queryKey: clavePrefijoDeForos(CLASE) }))
    await waitFor(() => expect(lecturasDe(FORO_A)).toHaveLength(lecturasA + 2), ESPERA)
    expect(queryClient.getQueryState(claveForo(CLASE, FORO_B))?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(claveListaDeForos(CLASE))?.isInvalidated).toBe(true)
    queryClient.removeQueries({ queryKey: claveForo(CLASE, FORO_B) })
    expect(queryClient.getQueryData(claveListaDeForos(CLASE))).toBeDefined()
  })

  it("ATQ-FORO-125: borrar A con éxito saca solo A; B sigue en caché sin marcarse; la lista se vuelve a pedir", async () => {
    const { queryClient, router } = await montar([delForo("maestro")])
    await tituloH2("Debate de la unidad")
    sembrar(queryClient)
    const foroB = queryClient.getQueryData(claveForo(CLASE, FORO_B))
    fireEvent.click(screen.getByRole("button", { name: "Borrar foro" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar foro" }))
    await screen.findByRole("heading", { level: 2, name: "Foro" }, ESPERA)
    await reposar(200)
    expect(queryClient.getQueryState(claveForo(CLASE, FORO_A))).toBeUndefined()
    expect(queryClient.getQueryData(claveForo(CLASE, FORO_B))).toBe(foroB)
    expect(queryClient.getQueryState(claveForo(CLASE, FORO_B))?.isInvalidated).toBe(false)
    expect(lecturasDeLaLista().length).toBeGreaterThanOrEqual(1)
    await act(() => router.navigate(delForo("maestro", FORO_B)))
    await tituloH2("Segundo debate")
    expect(lecturasDe(FORO_B)).toHaveLength(0)
  })

  it("ATQ-FORO-125: guardar A escribe la respuesta en A sin volver a pedirlo, marca vieja la lista y no toca B", async () => {
    const { queryClient, router } = await montar([`${delForo("maestro")}/editar`])
    await screen.findByRole("heading", { name: "Editar foro" }, ESPERA)
    await waitFor(
      () => expect(screen.getByLabelText("Título")).toHaveValue("Debate de la unidad"),
      ESPERA,
    )
    sembrar(queryClient)
    const lecturasA = lecturasDe(FORO_A).length
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Título nuevo" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await tituloH2("Título nuevo")
    await reposar(200)
    expect(lecturasDe(FORO_A)).toHaveLength(lecturasA)
    expect(queryClient.getQueryState(claveListaDeForos(CLASE))?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(claveForo(CLASE, FORO_B))?.isInvalidated).toBe(false)
    await act(() => router.navigate(delForo("maestro", FORO_B)))
    await tituloH2("Segundo debate")
    expect(lecturasDe(FORO_B)).toHaveLength(0)
  })
})

describe("ATQ-FORO-126 · un uuid en mayúsculas en la ruta (el servidor lo acepta y responde en minúsculas)", () => {
  it("ATQ-FORO-126 (control): en minúsculas, borrar con éxito y volver «atrás» no pinta el foro borrado", async () => {
    const { router } = await montar([`${BASES.maestro}/foro`, delForo("maestro")])
    await tituloH2("Debate de la unidad")
    fireEvent.click(screen.getByRole("button", { name: "Borrar foro" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar foro" }))
    await screen.findByRole("heading", { level: 2, name: "Foro" }, ESPERA)
    await act(() => router.navigate(-1))
    expect(await screen.findByText(NO_EXISTE, undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByRole("heading", { level: 2, name: "Debate de la unidad" })).toBeNull()
  })

  it("ATQ-FORO-126: en mayúsculas, borrar con éxito y volver «atrás» no pinta el foro borrado", async () => {
    const { router } = await montar([
      `${BASES.maestro}/foro`,
      delForo("maestro", FORO_A_MAYUSCULAS),
    ])
    await tituloH2("Debate de la unidad")
    fireEvent.click(screen.getByRole("button", { name: "Borrar foro" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar foro" }))
    await screen.findByRole("heading", { level: 2, name: "Foro" }, ESPERA)
    await act(() => router.navigate(-1))
    expect(await screen.findByText(NO_EXISTE, undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByRole("heading", { level: 2, name: "Debate de la unidad" })).toBeNull()
  })

  it.each([
    ["minúsculas (control)", FORO_A],
    ["mayúsculas", FORO_A_MAYUSCULAS],
  ] as const)(
    "ATQ-FORO-126: en %s, borrar con un 404 con la vista montada la reemplaza con «Ese foro ya no existe.»",
    async (_caso, foroId) => {
      await montar([delForo("maestro", foroId)])
      await tituloH2("Debate de la unidad")
      const foroA = estado.foros[FORO_A]
      if (foroA === undefined) throw new Error("Precondición: existe el foro A")
      // Otra persona lo borró: el DELETE y la siguiente lectura responden 404.
      foroA.existe = false
      fireEvent.click(screen.getByRole("button", { name: "Borrar foro" }))
      fireEvent.click(screen.getByRole("button", { name: "Sí, borrar foro" }))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(NO_EXISTE), ESPERA)
      await waitFor(
        () =>
          expect(
            screen.queryByRole("heading", { level: 2, name: "Debate de la unidad" }),
          ).toBeNull(),
        ESPERA,
      )
      expect(screen.getByRole("alert")).toHaveTextContent(NO_EXISTE)
    },
  )
})

describe("ATQ-FORO-128 · hermanos: …/tareas/<palabra> y …/foros/<palabra> con las listas en la caché", () => {
  const TAREA = uuid("7a7b3c4d", 1)
  const tareasPorPalabra = ({ metodo, url }: Llamada) => {
    const deTarea = /^\/api\/clases\/[^/]+\/tareas\/([^/]+)/.exec(url.pathname)
    if (deTarea === null || metodo !== "GET") return undefined
    const id = decodeURIComponent(deTarea[1] ?? "")
    if (!UUID.test(id))
      return errorApi(400, "VALIDACION", "tareaId: debe ser un identificador válido")
    return errorApi(404, "TAREA_NO_ENCONTRADA", "La tarea no existe")
  }

  it.each([
    ["tareas/sin-tema", "Esa tarea ya no existe."],
    ["tareas/lista", "Esa tarea ya no existe."],
    ["tareas/trabajo", "Esa tarea ya no existe."],
    ["tareas/entregas", "Esa tarea ya no existe."],
    [`tareas/${TAREA}/entregas/lista`, null],
    [`tareas/${TAREA}/entregas/alumno`, null],
    ["foros/lista", NO_EXISTE],
    ["foros/foro", NO_EXISTE],
  ] as const)(
    "ATQ-FORO-128: con las listas del trabajo, los temas, las categorías, «Foro» y las entregas en caché, …/%s dice su texto sin romperse y ninguna lista cambia",
    async (sufijo, texto) => {
      estado.falla = tareasPorPalabra
      const consola = vi.spyOn(console, "error").mockImplementation(() => undefined)
      try {
        const { router, queryClient } = await montar([`${BASES.maestro}/foro`])
        expect(
          await screen.findByText("Debate de la unidad", undefined, ESPERA),
        ).toBeInTheDocument()
        const sembradas: (readonly unknown[])[] = [
          ["clases", CLASE, "trabajo", "sin-tema"],
          ["clases", CLASE, "temas"],
          ["clases", CLASE, "categorias"],
          ["clases", CLASE, "tareas", TAREA, "entregas", "lista"],
        ]
        for (const clave of sembradas) {
          if (queryClient.getQueryData(clave) === undefined) {
            queryClient.setQueryData(clave, { pages: [], pageParams: [] })
          }
        }
        sembradas.push(claveListaDeForos(CLASE))
        const antes = sembradas.map((clave) => queryClient.getQueryData(clave))
        await act(() => router.navigate(`${BASES.maestro}/${sufijo}`))
        await esperarElError(texto)
        await reposar(300)
        expect(screen.queryByText(/Unexpected Application Error/)).toBeNull()
        expect(sembradas.map((clave) => queryClient.getQueryData(clave))).toEqual(antes)
        sembradas.forEach((clave, i) => {
          expect(queryClient.getQueryData(clave)).toBe(antes[i])
        })
      } finally {
        consola.mockRestore()
      }
    },
  )
})
