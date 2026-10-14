import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { MisCalificacionesView } from "./mis-calificaciones-view"

// Tester, ronda 2 de CALIFICACIONES-01d: el equivalente de T-06 en "Mis calificaciones" ("Ver más
// tareas" con una página vacía, con y sin cursor siguiente), la instrucción del texto del cursor
// ("Vuelve a abrir Calificaciones") con la caché de la app, y el modal con datos que cambian mientras
// está abierto. El servidor es un doble en memoria (fetch) y los avisos, un doble de sonner. Reloj fijo
// en todas (vi.useFakeTimers solo para Date): la frescura de la caché depende de Date.now().

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const LEJANA = "2030-02-20T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const uuid = (n: number) => `5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`
const RUTA_API = `/api/clases/${CLASE_ID}/mis-calificaciones`
const RUTA_VISTA = `/estudiante/clases/${CLASE_ID}/calificaciones`
const CURSOR_TEXTO =
  "Tus tareas cambiaron mientras las veías. Vuelve a abrir Calificaciones para verlas completas."
const VACIO_TODAS = "Aún no hay tareas en esta clase."
// El staleTime de producción (app/providers.tsx): 30 s.
const STALE_DE_PRODUCCION = 30_000

type Filtro = "todas" | "asignadas" | "entregadas" | "calificadas" | "sin-entregar"

const tarea = (n: number) => ({
  id: uuid(100 + n),
  titulo: `Tarea ${String(n)}`,
  fechaLimite: LEJANA,
  puntos: 10,
  categoria: null,
  entrega: { estado: "asignado", conRetraso: false, calificacion: null },
})

const generalPuntos = (porcentaje: number | null = 85) => ({
  modo: "puntos",
  porcentaje,
  puntos: { obtenido: 85, posible: 100, tareas: porcentaje === null ? 0 : 2 },
  categorias: [],
  sinCategoria: { tareas: 0 },
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface Llamada {
  url: string
  estado: string | null
  cursor: string | null
}
type Manejador = (llamada: Llamada) => Response | Promise<Response> | undefined

interface Servidor {
  general: Record<string, unknown>
  paginas: Partial<Record<Filtro, ReturnType<typeof tarea>[][]>>
  // El cursor siguiente de cada página (por índice); si falta, el de la página siguiente si existe.
  siguientes: Partial<Record<number, string | null>>
  manejador: Manejador
}

let servidor: Servidor
let llamadas: Llamada[] = []
const asignar = vi.fn()

const cursorDePagina = (indice: number) => uuid(900 + indice)

const paginaDe = (filtro: Filtro, cursor: string | null) => {
  const paginas = servidor.paginas[filtro] ?? [[]]
  const indice = cursor === null ? 0 : Number(cursor.slice(-4)) - 900
  const porDefecto = indice + 1 < paginas.length ? cursorDePagina(indice + 1) : null
  const fijado = servidor.siguientes[indice]
  return {
    general: servidor.general,
    tareas: paginas[indice] ?? [],
    siguienteCursor: fijado === undefined ? porDefecto : fijado,
  }
}

const instalarServidor = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) => {
      const url = String(entrada)
      const parametros = new URL(url, "http://local").searchParams
      const llamada = { url, estado: parametros.get("estado"), cursor: parametros.get("cursor") }
      llamadas.push(llamada)
      const propia = servidor.manejador(llamada)
      if (propia !== undefined) return Promise.resolve(propia)
      if (url.startsWith(`${RUTA_API}?`)) {
        const filtro = (llamada.estado ?? "todas") as Filtro
        return Promise.resolve(respuestaJson(200, paginaDe(filtro, llamada.cursor)))
      }
      return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
}

const nuevoCliente = (staleTime = 0) =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime }, mutations: { retry: false } },
  })

const montar = (cliente: QueryClient = nuevoCliente()) => {
  const resultado = render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[RUTA_VISTA]}>
        <Routes>
          <Route
            path="/estudiante/clases/:claseId/calificaciones"
            element={<MisCalificacionesView />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { cliente, ...resultado }
}

const diferido = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const encabezado = () => screen.getByRole("heading", { name: "Mis calificaciones", level: 2 })
const enlacesDeTarea = () => screen.queryAllByRole("link", { name: /^Tarea \d+$/ })
const verMas = () => screen.getByRole("button", { name: "Ver más tareas" })
const sinVerMas = () => screen.queryByRole("button", { name: "Ver más tareas" })
const enfocar = (elemento: HTMLElement) => {
  act(() => elemento.focus())
  expect(document.activeElement).toBe(elemento)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  llamadas = []
  servidor = {
    general: generalPuntos(),
    paginas: { todas: [[tarea(1)], [tarea(2)]] },
    siguientes: {},
    manejador: () => undefined,
  }
  instalarServidor()
  vi.stubGlobal("location", { ...window.location, assign: asignar })
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
  aviso.success.mockClear()
  aviso.error.mockClear()
  asignar.mockReset()
})

describe("«Ver más tareas» con una página vacía (el equivalente de T-06)", () => {
  it("CAL-T-220: página vacía con siguienteCursor no nulo (contrato roto): las filas siguen, el botón sigue con el foco, sin aviso ni vacío del filtro, y otro clic pide el cursor nuevo", async () => {
    servidor.paginas.todas = [[tarea(1)], [], [tarea(3)]]
    montar()
    expect(await screen.findByRole("link", { name: "Tarea 1" })).toBeInTheDocument()
    const boton = verMas()
    enfocar(boton)
    fireEvent.click(boton)
    await waitFor(() => expect(llamadas.at(-1)).toMatchObject({ cursor: cursorDePagina(1) }))
    await reposar()
    expect(enlacesDeTarea().map((e) => e.textContent)).toEqual(["Tarea 1"])
    expect(verMas()).toBe(boton)
    expect(document.activeElement).toBe(boton)
    expect(screen.queryByText(VACIO_TODAS)).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(document.querySelector("[aria-busy='true']")).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
    fireEvent.click(verMas())
    expect(await screen.findByRole("link", { name: "Tarea 3" })).toBeInTheDocument()
    await reposar()
    expect(llamadas.at(-1)).toMatchObject({ cursor: cursorDePagina(2) })
    expect(sinVerMas()).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Tarea 3" }))
  })

  it("CAL-T-221: página vacía con siguienteCursor nulo (última página): el botón desaparece, las filas siguen, el foco va al h2 (no a <body> ni a la raíz) y sin aviso ni vacío del filtro", async () => {
    servidor.paginas.todas = [[tarea(1)], []]
    montar()
    expect(await screen.findByRole("link", { name: "Tarea 1" })).toBeInTheDocument()
    const boton = verMas()
    enfocar(boton)
    fireEvent.click(boton)
    await waitFor(() => expect(sinVerMas()).toBeNull())
    await reposar()
    expect(enlacesDeTarea().map((e) => e.textContent)).toEqual(["Tarea 1"])
    expect(document.activeElement).toBe(encabezado())
    expect(screen.queryByText(VACIO_TODAS)).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-T-222: última página con filas: el botón desaparece y el foco va al enlace de la primera fila nueva", async () => {
    servidor.paginas.todas = [[tarea(1)], [tarea(2), tarea(3)]]
    montar()
    expect(await screen.findByRole("link", { name: "Tarea 1" })).toBeInTheDocument()
    const boton = verMas()
    enfocar(boton)
    fireEvent.click(boton)
    expect(await screen.findByRole("link", { name: "Tarea 2" })).toBeInTheDocument()
    await reposar()
    expect(sinVerMas()).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Tarea 2" }))
  })

  it("CAL-T-223: la primera página vacía con siguienteCursor no nulo (contrato roto): el vacío del filtro, sin «Ver más tareas», sin alert y sin caída", async () => {
    servidor.paginas.todas = [[], [tarea(2)]]
    montar()
    expect(await screen.findByText(VACIO_TODAS)).toBeInTheDocument()
    await reposar()
    expect(sinVerMas()).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(llamadas).toHaveLength(1)
  })
})

describe("La instrucción del texto del cursor: «Vuelve a abrir Calificaciones para verlas completas»", () => {
  // La persona sigue la instrucción: sale de Calificaciones y vuelve a entrar con la QueryClient de la
  // app (staleTime de 30 s). Para entonces la tarea 2 ya no existe: el servidor tiene una sola página.
  it("CAL-T-224: tras el 400 del cursor de «Ver más tareas», volver a abrir Calificaciones (antes de 30 s) muestra las tareas como están: sin «Ver más tareas» hacia el cursor muerto", async () => {
    servidor.manejador = (l) =>
      l.cursor !== null ? errorApi(400, "VALIDACION", "cursor: no es válido") : undefined
    const cliente = nuevoCliente(STALE_DE_PRODUCCION)
    const primera = montar(cliente)
    expect(await screen.findByRole("link", { name: "Tarea 1" })).toBeInTheDocument()
    servidor.paginas.todas = [[tarea(1)]]
    fireEvent.click(verMas())
    expect(await screen.findByText(CURSOR_TEXTO)).toBeInTheDocument()
    primera.unmount()
    const desde = llamadas.length
    montar(cliente)
    expect(await screen.findByRole("link", { name: "Tarea 1" })).toBeInTheDocument()
    await reposar()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
    expect(sinVerMas()).toBeNull()
    expect(llamadas.slice(desde).some((l) => l.cursor === null)).toBe(true)
  })

  it("CAL-T-225 (control): pasado el staleTime, volver a abrir sí muestra las tareas como están", async () => {
    servidor.manejador = (l) =>
      l.cursor !== null ? errorApi(400, "VALIDACION", "cursor: no es válido") : undefined
    const cliente = nuevoCliente(STALE_DE_PRODUCCION)
    const primera = montar(cliente)
    expect(await screen.findByRole("link", { name: "Tarea 1" })).toBeInTheDocument()
    servidor.paginas.todas = [[tarea(1)]]
    fireEvent.click(verMas())
    expect(await screen.findByText(CURSOR_TEXTO)).toBeInTheDocument()
    primera.unmount()
    vi.setSystemTime(new Date(AHORA.getTime() + STALE_DE_PRODUCCION + 1_000))
    montar(cliente)
    expect(await screen.findByRole("link", { name: "Tarea 1" })).toBeInTheDocument()
    await waitFor(() => expect(sinVerMas()).toBeNull())
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
  })
})

describe("El modal con datos que cambian mientras está abierto", () => {
  const abrir = async () => {
    const boton = await screen.findByRole("button", { name: "Ver cálculo" })
    act(() => boton.focus())
    fireEvent.click(boton)
    const dialogo = await screen.findByRole("dialog", { name: "Cálculo de tu calificación" })
    return { boton, dialogo }
  }

  it("CAL-T-226: «Ver más tareas» (pulsado antes) trae una página con otro cálculo (pasa a categorías): el modal se actualiza con la tabla, sigue abierto, con el foco dentro y sin aviso", async () => {
    const espera = diferido()
    montar()
    const boton = await screen.findByRole("button", { name: "Ver más tareas" })
    servidor.manejador = (l) => (l.cursor !== null ? espera.promesa : undefined)
    fireEvent.click(boton)
    const { dialogo } = await abrir()
    await waitFor(() => expect(dialogo.contains(document.activeElement)).toBe(true))
    servidor.general = {
      modo: "categorias",
      porcentaje: 70,
      puntos: { obtenido: 7, posible: 10, tareas: 1 },
      categorias: [
        {
          id: uuid(201),
          nombre: "Exámenes",
          peso: 100,
          pesoEfectivo: 100,
          porcentaje: 70,
          obtenido: 7,
          posible: 10,
          tareas: 1,
        },
      ],
      sinCategoria: { tareas: 0 },
    }
    await act(async () => {
      espera.resolver(respuestaJson(200, paginaDe("todas", cursorDePagina(1))))
      await espera.promesa
    })
    expect(await within(dialogo).findByRole("cell", { name: "Exámenes" })).toBeInTheDocument()
    await reposar()
    expect(screen.getByRole("dialog", { name: "Cálculo de tu calificación" })).toBe(dialogo)
    expect(dialogo.contains(document.activeElement)).toBe(true)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(screen.getByRole("link", { name: "Tarea 2", hidden: true })).toBeInTheDocument()
  })

  it("CAL-T-227: con el modal abierto, una recarga de fondo deja la calificación sin nada que cuente: el modal lo dice sin cerrarse y Escape devuelve el foco a «Ver cálculo»", async () => {
    const { cliente } = montar()
    const { boton, dialogo } = await abrir()
    expect(within(dialogo).getByText("Obtuviste 85 de 100 puntos: 85 %.")).toBeInTheDocument()
    servidor.general = generalPuntos(null)
    vi.setSystemTime(new Date(AHORA.getTime() + 1_000))
    await act(async () => {
      await cliente.refetchQueries({ type: "active" })
    })
    expect(
      await within(dialogo).findByText(
        "Todavía no tienes tareas calificadas que cuenten en tu calificación general.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole("dialog")).toBe(dialogo)
    fireEvent.keyDown(dialogo, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(boton))
  })
})
