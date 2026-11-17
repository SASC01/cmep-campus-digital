// FORO-01d (§D-8.3 "Actividades", E1-4, E1-9; §E11.1, §E11.4 y §E11.5): "Actividades de aprendizaje" con
// foros y los textos de categorías, con el router real (`rutas`) y el QueryClient de app/providers.tsx
// (staleTime de 30 s, un reintento). FORO-1D29, FORO-1D30, FORO-1D31, FORO-1D39 y FORO-1D54.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveForo } from "@/services/trabajoService"

import { claveTemasDeLaSeccion } from "./data"

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

type Rol = "estudiante" | "maestro" | "admin"

const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1d0f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const CLASE = uuid("2a2b3c4d", 1)
const FORO = uuid("5a5b3c4d", 1)
const FORO_2 = uuid("5a5b3c4d", 2)
const TEMA = uuid("6a6b3c4d", 1)
const MAESTRO = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez" }
const ESPERA = { timeout: 5000 }
const DIA_MS = 86_400_000
const BASES: Record<Rol, string> = {
  estudiante: `/estudiante/clases/${CLASE}`,
  maestro: `/maestro/clases/${CLASE}`,
  admin: `/admin/clases/${CLASE}`,
}
const API = `/api/clases/${CLASE}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

type Entrega = { estado: "asignado" | "entregado" | "calificado"; conRetraso: boolean } | null

interface ElementoDoble {
  id: string
  titulo: string
  fechaLimite: string
  entrega: Entrega
  temaId: string | null
}

interface Llamada {
  metodo: string
  url: URL
  cuerpo: unknown
}

interface Estado {
  rol: Rol
  archivada: boolean
  elementos: ElementoDoble[]
  categorias: { id: string; nombre: string; peso: number; tareas: number }[]
  falla: (llamada: Llamada) => Response | Promise<Response> | undefined
  llamadas: Llamada[]
}

let estado: Estado

const elemento = (n: number, extra: Partial<ElementoDoble> = {}): ElementoDoble => ({
  id: n === 1 ? FORO : FORO_2,
  titulo: `Debate ${String(n)}`,
  fechaLimite: new Date(Date.now() + 5 * DIA_MS).toISOString(),
  entrega: null,
  temaId: null,
  ...extra,
})

const elementoJson = (e: ElementoDoble) => ({
  id: e.id,
  tipo: "foro",
  titulo: e.titulo,
  autor: { ...MAESTRO, administracion: false },
  creadoEn: "2026-10-06T15:30:00.000Z",
  material: null,
  tarea: { fechaLimite: e.fechaLimite, puntos: 10 },
  puedeMover: estado.rol !== "estudiante",
  entrega: estado.rol === "estudiante" ? e.entrega : null,
})

const foroJson = (e: ElementoDoble) => ({
  foro: {
    id: e.id,
    titulo: e.titulo,
    instrucciones: "Opina.",
    fechaLimite: e.fechaLimite,
    puntos: 10,
    aceptaTardias: true,
    version: 0,
    categoria: null,
    tema: e.temaId === null ? null : { id: e.temaId, nombre: "Unidad 1" },
    rubrica: [],
    adjuntos: [],
    autor: { ...MAESTRO, administracion: false },
    creadoEn: "2026-10-06T15:30:00.000Z",
    actualizadoEn: "2026-10-06T15:30:00.000Z",
    puedeEditar: estado.rol !== "estudiante",
    puedeBorrar: estado.rol !== "estudiante",
  },
})

const responder = (llamada: Llamada): Response | Promise<Response> => {
  const { metodo, url } = llamada
  const ruta = url.pathname
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
  if (ruta === API) {
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
  if (ruta === `${API}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
  if (ruta === `${API}/publicaciones`) {
    return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
  }
  if (ruta === `${API}/temas`) {
    const conTema = estado.elementos.filter(({ temaId }) => temaId === TEMA).length
    return respuestaJson(200, {
      temas: [{ id: TEMA, nombre: "Unidad 1", orden: 0, elementos: conTema }],
      sinTema: estado.elementos.length - conTema,
    })
  }
  if (ruta === `${API}/trabajo`) {
    const tema = url.searchParams.get("tema")
    const elementos = estado.elementos.filter(({ temaId }) =>
      tema === "sin-tema" ? temaId === null : temaId === tema,
    )
    return respuestaJson(200, { elementos: elementos.map(elementoJson), siguienteCursor: null })
  }
  if (ruta === `${API}/categorias` && metodo === "GET") {
    return respuestaJson(200, { categorias: estado.categorias })
  }
  const mover = /^\/api\/clases\/[^/]+\/publicaciones\/([^/]+)\/tema$/.exec(ruta)
  if (mover !== null && metodo === "PUT") {
    const temaId = (llamada.cuerpo as { temaId: string | null }).temaId
    const movido = estado.elementos.find(({ id }) => id === mover[1])
    if (movido !== undefined) movido.temaId = temaId
    return respuestaJson(200, { publicacionId: mover[1], temaId })
  }
  const deForo = /^\/api\/clases\/[^/]+\/foros\/([^/]+)(\/.*)?$/.exec(ruta)
  if (deForo !== null) {
    const foro = estado.elementos.find(({ id }) => id === deForo[1])
    if (foro === undefined) return errorApi(404, "TAREA_NO_ENCONTRADA")
    const resto = deForo[2] ?? ""
    if (resto === "") return respuestaJson(200, foroJson(foro))
    if (resto === "/participaciones") {
      return respuestaJson(200, { participaciones: [], siguienteCursor: null })
    }
    if (resto === "/mi-participacion") {
      return respuestaJson(200, {
        estado: "asignado",
        fechaEntrega: null,
        conRetraso: false,
        calificacion: null,
        principalId: null,
        puedeParticipar: true,
        puedeReplicar: false,
        participarConRetraso: false,
        replicarConRetraso: false,
      })
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
const actividades = (rol: Rol) => `${BASES[rol]}/trabajo`
const pedidas = (ruta: string) =>
  estado.llamadas.filter(({ metodo, url }) => metodo === "GET" && url.pathname === ruta)
const filaDe = (titulo: string) =>
  screen.findByRole("link", { name: new RegExp(`^Foro: ${titulo}(?!\\d)`) }, ESPERA)
const enLasSecciones = (nombre: string) =>
  within(screen.getByRole("list", { name: "Secciones de la clase" })).getByRole("link", {
    name: nombre,
  })

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  estado = {
    rol: "maestro",
    archivada: false,
    elementos: [elemento(1)],
    categorias: [],
    falla: () => undefined,
    llamadas: [],
  }
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
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

describe("FORO-1D29 · «Actividades de aprendizaje» con foros", () => {
  it.each(["estudiante", "maestro", "admin"] as const)(
    "FORO-1D29: %s pide los temas y el trabajo con seccion=actividades&conForos=si, con la misma clave de caché",
    async (rol) => {
      estado.rol = rol
      const { queryClient } = await montar([actividades(rol)])
      await filaDe("Debate 1")
      const temas = pedidas(`${API}/temas`).map(({ url }) => `${url.pathname}${url.search}`)
      expect(temas).toContain(`${API}/temas?seccion=actividades&conForos=si`)
      const trabajo = pedidas(`${API}/trabajo`)
      expect(trabajo.length).toBeGreaterThan(0)
      for (const { url } of trabajo) {
        expect(url.searchParams.get("seccion")).toBe("actividades")
        expect(url.searchParams.get("conForos")).toBe("si")
      }
      expect(queryClient.getQueryState(claveTemasDeLaSeccion(CLASE, "actividades"))).toBeDefined()
    },
  )

  it.each(["estudiante", "maestro"] as const)(
    "FORO-1D29: %s ve el foro como «Foro: …», con la insignia «Foro», y su enlace lleva a foros/:id",
    async (rol) => {
      estado.rol = rol
      await montar([actividades(rol)])
      const fila = await filaDe("Debate 1")
      expect(fila).toHaveAttribute("href", `${BASES[rol]}/foros/${FORO}`)
      expect(within(fila).getByText("Foro", { exact: true })).toBeInTheDocument()
    },
  )

  it.each(["maestro", "admin"] as const)(
    "FORO-1D29: %s ve «Crear foro» junto a «Crear tarea», hacia foros/nuevo, y no en una clase archivada",
    async (rol) => {
      estado.rol = rol
      await montar([actividades(rol)])
      await filaDe("Debate 1")
      const crearTarea = screen.getByRole("link", { name: "Crear tarea" })
      const crearForo = screen.getByRole("link", { name: "Crear foro" })
      expect(crearForo).toHaveAttribute("href", `${BASES[rol]}/foros/nuevo`)
      expect(
        crearTarea.compareDocumentPosition(crearForo) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
      cleanup()
      estado.archivada = true
      await montar([actividades(rol)])
      await filaDe("Debate 1")
      await reposar()
      expect(screen.queryByRole("link", { name: "Crear foro" })).toBeNull()
      expect(screen.queryByRole("link", { name: "Crear tarea" })).toBeNull()
    },
  )

  it("FORO-1D29: el alumno no ve «Crear foro»", async () => {
    estado.rol = "estudiante"
    await montar([actividades("estudiante")])
    await filaDe("Debate 1")
    expect(screen.queryByRole("link", { name: "Crear foro" })).toBeNull()
  })

  it.each([
    { caso: "abierto (la fecha, como una tarea asignada)", desfase: 5 * DIA_MS, texto: null },
    { caso: "vencido («Sin entregar»)", desfase: -2 * DIA_MS, texto: "Sin entregar" },
  ])(
    "FORO-1D29: para el alumno, entrega null y { asignado, conRetraso: false } pintan la misma insignia y la misma segunda línea, con el foro $caso",
    async ({ desfase, texto }) => {
      estado.rol = "estudiante"
      const fecha = new Date(Date.now() + desfase).toISOString()
      estado.elementos = [
        elemento(1, { fechaLimite: fecha, entrega: null }),
        elemento(2, { fechaLimite: fecha, entrega: { estado: "asignado", conRetraso: false } }),
      ]
      await montar([actividades("estudiante")])
      const sinFila = await filaDe("Debate 1")
      const conFila = await filaDe("Debate 2")
      if (texto !== null) {
        expect(within(sinFila).getByText(texto)).toBeInTheDocument()
        expect(within(conFila).getByText(texto)).toBeInTheDocument()
      }
      if (texto === null) {
        expect(within(sinFila).queryByText("Sin entregar")).toBeNull()
        expect(within(conFila).queryByText("Sin entregar")).toBeNull()
      }
      expect(within(sinFila).getByText("Foro", { exact: true })).toBeInTheDocument()
      expect(within(conFila).getByText("Foro", { exact: true })).toBeInTheDocument()
      expect(sinFila.textContent?.replace("Debate 1", "")).toBe(
        conFila.textContent?.replace("Debate 2", ""),
      )
    },
  )

  it("FORO-1D29: «Mover» un foro con éxito avisa y lo pasa al tema", async () => {
    await montar([actividades("maestro")])
    await filaDe("Debate 1")
    fireEvent.change(screen.getByLabelText("Tema de «Debate 1»"), { target: { value: TEMA } })
    fireEvent.click(screen.getByRole("button", { name: "Mover" }))
    await waitFor(
      () => expect(aviso.success).toHaveBeenCalledWith("Moviste «Debate 1» a «Unidad 1»"),
      ESPERA,
    )
  })

  it.each([
    ["TEMA_NO_ENCONTRADO", 404, "Ese tema ya no existe."],
    ["PUBLICACION_NO_ENCONTRADA", 404, "Esa publicación ya no existe."],
  ] as const)(
    "FORO-1D29: «Mover» un foro con %s da un solo aviso, como el de una tarea",
    async (codigo, http, texto) => {
      await montar([actividades("maestro")])
      await filaDe("Debate 1")
      estado.falla = ({ metodo, url }) =>
        metodo === "PUT" && url.pathname.endsWith("/tema")
          ? errorApi(http, codigo, texto)
          : undefined
      fireEvent.change(screen.getByLabelText("Tema de «Debate 1»"), { target: { value: TEMA } })
      fireEvent.click(screen.getByRole("button", { name: "Mover" }))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      await reposar()
      expect(aviso.error).toHaveBeenCalledWith(texto)
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
  )
})

describe("FORO-1D39 · «Mover» un foro marca viejo su detalle (nota (c) de la revisión final de 01c2)", () => {
  it("FORO-1D39: con el detalle en caché y sin observador, mover deja viejo el foro sin pedirlo y sin marcar sus participaciones; volver antes de 30 s lo pide y «Detalles» muestra el tema", async () => {
    const { router, queryClient } = await montar([`${BASES.maestro}/foros/${FORO}`])
    await screen.findByRole("heading", { level: 2, name: "Debate 1" }, ESPERA)
    await act(() => router.navigate(actividades("maestro")))
    await filaDe("Debate 1")
    // Las participaciones del foro, en caché (como las dejaría ForoView).
    const participaciones = [...claveForo(CLASE, FORO), "participaciones"]
    queryClient.setQueryData(participaciones, { pages: [], pageParams: [] })
    const antes = pedidas(`${API}/foros/${FORO}`).length
    fireEvent.change(screen.getByLabelText("Tema de «Debate 1»"), { target: { value: TEMA } })
    fireEvent.click(screen.getByRole("button", { name: "Mover" }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    await reposar()
    expect(queryClient.getQueryState(claveForo(CLASE, FORO))?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(participaciones)?.isInvalidated).toBe(false)
    expect(pedidas(`${API}/foros/${FORO}`)).toHaveLength(antes)
    await act(() => router.navigate(`${BASES.maestro}/foros/${FORO}`))
    await waitFor(() => expect(pedidas(`${API}/foros/${FORO}`).length).toBe(antes + 1), ESPERA)
    expect(await screen.findByText("Unidad 1", undefined, ESPERA)).toBeInTheDocument()
  })
})

describe("FORO-1D30 · «No pudimos actualizar el foro…»: volver a abrirlo desde «Actividades» antes de 30 s", () => {
  it("FORO-1D30: tras la recarga fallida, abrir el foro desde su fila en «Actividades» lo pide de nuevo y muestra la versión nueva", async () => {
    const { queryClient } = await montar([`${BASES.maestro}/foros/${FORO}`])
    await screen.findByRole("heading", { level: 2, name: "Debate 1" }, ESPERA)
    estado.falla = ({ metodo, url }) =>
      metodo === "GET" && url.pathname === `${API}/foros/${FORO}`
        ? errorApi(503, "SERVICIO_OCUPADO")
        : undefined
    await act(() =>
      queryClient.invalidateQueries({ queryKey: claveForo(CLASE, FORO), exact: true }),
    )
    await waitFor(
      () =>
        expect(aviso.error).toHaveBeenCalledWith(
          "No pudimos actualizar el foro. Mostramos la última versión que tenemos.",
        ),
      ESPERA,
    )
    await reposar()
    estado.falla = () => undefined
    const foro = estado.elementos[0]
    if (foro === undefined) throw new Error("Precondición: existe el foro")
    foro.titulo = "Debate renovado"
    const antes = pedidas(`${API}/foros/${FORO}`).length
    fireEvent.click(enLasSecciones("Actividades de aprendizaje"))
    fireEvent.click(await filaDe("Debate renovado"))
    expect(
      await screen.findByRole("heading", { level: 2, name: "Debate renovado" }, ESPERA),
    ).toBeInTheDocument()
    expect(pedidas(`${API}/foros/${FORO}`).length).toBeGreaterThan(antes)
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })
})

describe("FORO-1D31 · el editor de categorías cuenta actividades (E1-9, §E7.8)", () => {
  it("FORO-1D31: «0 actividades», «1 actividad» y «Tiene 3 actividades.»; sin categorías, «Sus actividades se califican por puntos.»", async () => {
    estado.categorias = [
      { id: uuid("7a7b3c4d", 1), nombre: "Examen", peso: 40, tareas: 0 },
      { id: uuid("7a7b3c4d", 2), nombre: "Foros", peso: 30, tareas: 1 },
      { id: uuid("7a7b3c4d", 3), nombre: "Tareas", peso: 30, tareas: 3 },
    ]
    await montar([`${BASES.maestro}/categorias`])
    expect(await screen.findByText("0 actividades", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.getByText("1 actividad")).toBeInTheDocument()
    expect(screen.getByText("Tiene 1 actividad.")).toBeInTheDocument()
    expect(screen.getByText("Tiene 3 actividades.")).toBeInTheDocument()
    cleanup()
    estado.categorias = []
    await montar([`${BASES.maestro}/categorias`])
    expect(
      await screen.findByText(
        "Esta clase no tiene categorías. Sus actividades se califican por puntos.",
        undefined,
        ESPERA,
      ),
    ).toBeInTheDocument()
  })

  it("FORO-1D31: un 409 CATEGORIA_CON_TAREAS con el texto de foros avisa una vez con el mensaje del servidor", async () => {
    const mensaje =
      "No puedes quitar «Foros»: tiene 2 actividades (tareas o foros). Muévelas a otra categoría primero."
    estado.categorias = [
      { id: uuid("7a7b3c4d", 1), nombre: "Examen", peso: 40, tareas: 0 },
      // Sin actividades al abrir; en el servidor ya tiene dos (otra persona creó un foro y una tarea).
      { id: uuid("7a7b3c4d", 2), nombre: "Foros", peso: 60, tareas: 0 },
    ]
    estado.falla = ({ metodo, url }) =>
      metodo === "PUT" && url.pathname === `${API}/categorias`
        ? errorApi(409, "CATEGORIA_CON_TAREAS", mensaje)
        : undefined
    await montar([`${BASES.maestro}/categorias`])
    await screen.findByDisplayValue("Foros", undefined, ESPERA)
    const filaDe = (nombre: string) => {
      const fila = screen.getByDisplayValue(nombre).closest("[data-llave]")
      if (!(fila instanceof HTMLElement)) throw new Error(`sin la fila de ${nombre}`)
      return fila
    }
    fireEvent.click(within(filaDe("Foros")).getByRole("button", { name: /^Quitar/ }))
    fireEvent.change(within(filaDe("Examen")).getByRole("textbox", { name: /^Peso/ }), {
      target: { value: "100" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar categorías" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(mensaje), ESPERA)
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })
})

describe("FORO-1D54 · «Actividades» con conForos=si y la política única", () => {
  it("FORO-1D54: con la sección en error, pulsar «Actividades de aprendizaje» estando ahí la pide una sola vez, otra vez con conForos=si", async () => {
    estado.falla = ({ url }) =>
      url.pathname === `${API}/temas` ? errorApi(503, "SERVICIO_OCUPADO") : undefined
    await montar([actividades("maestro")])
    await screen.findByRole("alert", undefined, ESPERA)
    await reposar()
    const antes = pedidas(`${API}/temas`).length
    estado.falla = () => undefined
    fireEvent.click(enLasSecciones("Actividades de aprendizaje"))
    await filaDe("Debate 1")
    await reposar()
    const nuevas = pedidas(`${API}/temas`).slice(antes)
    expect(nuevas).toHaveLength(1)
    expect(nuevas[0]?.url.searchParams.get("conForos")).toBe("si")
  })
})
