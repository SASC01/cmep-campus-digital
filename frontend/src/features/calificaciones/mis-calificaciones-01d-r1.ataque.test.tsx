import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { MisCalificacionesView } from "./mis-calificaciones-view"

// Tester, ronda 1 de CALIFICACIONES-01d: ataques a "Mis calificaciones" y al modal de cálculo (filtro y
// "Ver más tareas" cruzados, respuestas viejas, N-48, Enmienda 2 en sus bordes, modal durante errores y
// recargas, redondeo y RN-02). El servidor es un doble en memoria (fetch) y los avisos, un doble de
// sonner. Reloj fijo en todas (vi.useFakeTimers solo para Date).

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const LEJANA = "2030-02-20T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const uuid = (n: number) => `7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`
const RUTA_API = `/api/clases/${CLASE_ID}/mis-calificaciones`
const RUTA_VISTA = `/estudiante/clases/${CLASE_ID}/calificaciones`
const GENERICO = "No pudimos cargar tus calificaciones. Inténtalo de nuevo."
const VER_MAS_FALLO = "No pudimos cargar más tareas. Inténtalo de nuevo."
const SIN_ACCESO = "No tienes acceso a esta clase."
const CURSOR_TEXTO =
  "Tus tareas cambiaron mientras las veías. Vuelve a abrir Calificaciones para verlas completas."

type Filtro = "todas" | "asignadas" | "entregadas" | "calificadas" | "sin-entregar"

const tarea = (n: number, extra: Record<string, unknown> = {}) => ({
  id: uuid(100 + n),
  titulo: `Tarea ${String(n)}`,
  fechaLimite: LEJANA,
  puntos: 10,
  categoria: null,
  entrega: { estado: "asignado", conRetraso: false, calificacion: null },
  ...extra,
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
const validacion = (mensaje: string) => errorApi(400, "VALIDACION", mensaje)

interface Llamada {
  url: string
  estado: string | null
  cursor: string | null
}
type Manejador = (llamada: Llamada) => Response | Promise<Response> | undefined

interface Servidor {
  general: Record<string, unknown>
  paginas: Partial<Record<Filtro, Record<string, unknown>[][]>>
  manejador: Manejador
  extra: Record<string, unknown>
}

let servidor: Servidor
let llamadas: Llamada[] = []
const asignar = vi.fn()

const cursorDePagina = (indice: number) => uuid(900 + indice)

const paginaDe = (filtro: Filtro, cursor: string | null) => {
  const paginas = servidor.paginas[filtro] ?? [[]]
  const indice = cursor === null ? 0 : Number(cursor.slice(-4)) - 900
  const siguiente = indice + 1 < paginas.length ? cursorDePagina(indice + 1) : null
  return {
    general: servidor.general,
    tareas: paginas[indice] ?? [],
    siguienteCursor: siguiente,
    ...servidor.extra,
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

const nuevoCliente = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

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

const selector = () => screen.getByRole("combobox", { name: "Mostrar" })
const raiz = () => {
  const encabezado = screen.getByRole("heading", {
    name: "Mis calificaciones",
    level: 2,
    hidden: true,
  })
  const contenedor = encabezado.closest("[tabindex='-1']:not(h2)")
  if (!(contenedor instanceof HTMLElement)) throw new Error("Precondición: la vista tiene raíz")
  return contenedor
}
const enlacesDeTarea = () => screen.queryAllByRole("link", { name: /^Tarea \d+$/ })
const elegir = (valor: Filtro) => {
  const control = selector()
  act(() => control.focus())
  fireEvent.change(control, { target: { value: valor } })
}
const verMas = () => screen.getByRole("button", { name: "Ver más tareas" })
const pidioPaginaDe = (estado: Filtro) =>
  llamadas.filter((l) => l.estado === estado && l.cursor !== null)

const sinRastroDelServidor = (mensaje: string) => {
  const texto = document.body.textContent
  const recortado = mensaje.trim()
  if (recortado !== "") expect(texto).not.toContain(recortado)
  const prefijo = /^\s*([^:\s]+):/.exec(mensaje)?.[1]
  if (prefijo !== undefined) expect(texto).not.toContain(`${prefijo}:`)
  expect(texto).not.toMatch(/Too |Invalid|Expected|expected/)
  expect(document.querySelector("[aria-invalid='true']")).toBeNull()
  expect(document.querySelector("[aria-busy='true']")).toBeNull()
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  llamadas = []
  servidor = {
    general: generalPuntos(),
    paginas: { todas: [[tarea(1)], [tarea(2)]] },
    manejador: () => undefined,
    extra: {},
  }
  instalarServidor()
  vi.stubGlobal("location", { ...window.location, assign: asignar })
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  aviso.success.mockClear()
  aviso.error.mockClear()
  asignar.mockReset()
})

// "Ver más tareas" de «Todas» queda en vuelo, se elige «Calificadas» y se vuelve a «Todas».
const verMasEnVueloIdaYVuelta = async () => {
  servidor.paginas.calificadas = [
    [tarea(7, { entrega: { estado: "calificado", conRetraso: false, calificacion: 9 } })],
  ]
  const espera = diferido()
  montar()
  const boton = await screen.findByRole("button", { name: "Ver más tareas" })
  servidor.manejador = (l) =>
    l.cursor !== null && l.estado === "todas" ? espera.promesa : undefined
  fireEvent.click(boton)
  await waitFor(() => expect(pidioPaginaDe("todas")).toHaveLength(1))
  elegir("calificadas")
  expect(await screen.findByRole("link", { name: "Tarea 7" })).toBeInTheDocument()
  elegir("todas")
  expect(await screen.findByRole("link", { name: "Tarea 1" })).toBeInTheDocument()
  return espera
}

describe("N-48: volver al filtro cuya página está en vuelo", () => {
  it("CAL-T-160: la página de «Todas» falla con un 5xx después de ir a «Calificadas» y volver: un solo aviso, las filas se conservan y el foco sigue en el selector", async () => {
    const espera = await verMasEnVueloIdaYVuelta()
    espera.resolver(errorApi(500, "ERROR_INTERNO", "Error interno"))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(aviso.error).toHaveBeenCalledWith(VER_MAS_FALLO)
    expect(enlacesDeTarea().map((e) => e.textContent)).toEqual(["Tarea 1"])
    expect(screen.queryByRole("alert")).toBeNull()
    expect(pidioPaginaDe("todas")).toHaveLength(1)
    expect(document.activeElement).toBe(selector())
    expect(document.querySelector("[aria-busy='true']")).toBeNull()
  })

  it("CAL-T-161: la misma vuelta con un 400 fuera de contrato («limite: Too big…»): un solo aviso con el texto fijo, sin rastro del servidor", async () => {
    const espera = await verMasEnVueloIdaYVuelta()
    espera.resolver(validacion("limite: Too big: expected number to be <=100"))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(aviso.error).toHaveBeenCalledWith(VER_MAS_FALLO)
    sinRastroDelServidor("limite: Too big: expected number to be <=100")
    expect(document.activeElement).toBe(selector())
  })

  it("CAL-T-162: la misma vuelta con «cursor: no es válido»: el texto del cursor en la lista, sin aviso, y el foco sigue en el selector (nunca <body>)", async () => {
    const espera = await verMasEnVueloIdaYVuelta()
    espera.resolver(validacion("cursor: no es válido"))
    expect(await screen.findByText(CURSOR_TEXTO)).toBeInTheDocument()
    await reposar()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(selector())
  })
})

describe("filtro y respuestas viejas", () => {
  it.each([
    ["un 5xx", () => errorApi(500, "ERROR_INTERNO", "Error interno")],
    ["un 400 del cursor", () => validacion("cursor: no es válido")],
    ["un 400 fuera de contrato", () => validacion("estado: Invalid option")],
    ["un 200 con otras filas", () => respuestaJson(200, paginaDe("calificadas", null))],
  ] as const)(
    "CAL-T-163: la primera página de «Calificadas» llega tarde con %s después de elegir «Entregadas»: la lista de «Entregadas» sigue igual, sin aviso ni MensajeError, con el foco en el selector",
    async (_nombre, respuesta) => {
      servidor.paginas.calificadas = [
        [tarea(7, { entrega: { estado: "calificado", conRetraso: false, calificacion: 9 } })],
      ]
      servidor.paginas.entregadas = [
        [tarea(5, { entrega: { estado: "entregado", conRetraso: false, calificacion: null } })],
      ]
      const espera = diferido()
      montar()
      await screen.findByRole("link", { name: "Tarea 1" })
      servidor.manejador = (l) => (l.estado === "calificadas" ? espera.promesa : undefined)
      elegir("calificadas")
      await waitFor(() => expect(llamadas.some((l) => l.estado === "calificadas")).toBe(true))
      elegir("entregadas")
      expect(await screen.findByRole("link", { name: "Tarea 5" })).toBeInTheDocument()
      espera.resolver(respuesta())
      await reposar()
      expect(enlacesDeTarea().map((e) => e.textContent)).toEqual(["Tarea 5"])
      expect(screen.queryByRole("alert")).toBeNull()
      expect(aviso.error).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(selector())
      expect(selector()).toHaveValue("entregadas")
    },
  )

  it("CAL-T-164: «Ver más tareas» durante una recarga de fondo está en espera y no pide la página siguiente", async () => {
    const espera = diferido()
    const { cliente } = montar()
    await screen.findByRole("link", { name: "Tarea 1" })
    servidor.manejador = (l) => (l.cursor === null ? espera.promesa : undefined)
    let recarga: Promise<void> = Promise.resolve()
    act(() => {
      recarga = cliente.refetchQueries({ type: "active" })
    })
    await waitFor(() => expect(verMas()).toHaveAttribute("aria-busy", "true"))
    fireEvent.click(verMas())
    fireEvent.click(verMas())
    await reposar()
    expect(llamadas.filter((l) => l.cursor !== null)).toHaveLength(0)
    servidor.manejador = () => undefined
    espera.resolver(respuestaJson(200, paginaDe("todas", null)))
    await act(async () => {
      await recarga
    })
    await waitFor(() => expect(verMas()).not.toHaveAttribute("aria-busy"))
    fireEvent.click(verMas())
    expect(await screen.findByRole("link", { name: "Tarea 2" })).toBeInTheDocument()
    expect(llamadas.filter((l) => l.cursor !== null)).toHaveLength(1)
  })

  it("CAL-T-165: «Ver más tareas» de la última página con el foco movido al selector durante la petición: al llegar la página, el foco se queda en el selector", async () => {
    const espera = diferido()
    montar()
    const boton = await screen.findByRole("button", { name: "Ver más tareas" })
    servidor.manejador = (l) => (l.cursor !== null ? espera.promesa : undefined)
    act(() => boton.focus())
    fireEvent.click(boton)
    await waitFor(() => expect(pidioPaginaDe("todas")).toHaveLength(1))
    act(() => selector().focus())
    espera.resolver(respuestaJson(200, paginaDe("todas", cursorDePagina(1))))
    expect(await screen.findByRole("link", { name: "Tarea 2" })).toBeInTheDocument()
    await reposar()
    expect(screen.queryByRole("button", { name: "Ver más tareas" })).toBeNull()
    expect(document.activeElement).toBe(selector())
  })

  it("CAL-T-166: al cambiar de filtro desaparece la calificación general mientras carga (N-45), pero ningún control queda con aria-busy y el foco sigue en el selector, nunca en <body>", async () => {
    servidor.paginas.calificadas = [[tarea(7)]]
    const espera = diferido()
    montar()
    await screen.findByText("Calificación general")
    servidor.manejador = (l) => (l.estado === "calificadas" ? espera.promesa : undefined)
    elegir("calificadas")
    await reposar()
    expect(document.activeElement).toBe(selector())
    expect(document.querySelector("[aria-busy='true']")).toBeNull()
    espera.resolver(respuestaJson(200, paginaDe("calificadas", null)))
    expect(await screen.findByText("Calificación general")).toBeInTheDocument()
    await reposar()
    expect(document.activeElement).toBe(selector())
    expect(document.querySelector("[aria-busy='true']")).toBeNull()
  })
})

describe("Enmienda 2 en sus bordes («Mis calificaciones»)", () => {
  const FUERA = [
    ["\t"],
    ["\n"],
    [" \t\n "],
    ["version: Expected number, received string"],
    ["cursorTareas: no es válido"],
    ["CURSOR: no es válido"],
    [" cursor: no es válido"],
  ] as const

  it.each(FUERA)(
    "CAL-T-167: primera carga con «%j»: un solo MensajeError con el genérico (nunca el del cursor), sin aviso ni rastro del servidor",
    async (mensaje) => {
      servidor.manejador = () => validacion(mensaje)
      montar()
      expect(await screen.findByText(GENERICO)).toBeInTheDocument()
      await reposar()
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
      expect(aviso.error).not.toHaveBeenCalled()
      sinRastroDelServidor(mensaje)
    },
  )

  it.each(FUERA)(
    "CAL-T-168: filtro «Sin entregar» con «%j»: el selector conserva la opción y el foco; un solo MensajeError con el genérico, sin aviso",
    async (mensaje) => {
      montar()
      await screen.findByRole("link", { name: "Tarea 1" })
      servidor.manejador = (l) => (l.estado === "sin-entregar" ? validacion(mensaje) : undefined)
      elegir("sin-entregar")
      expect(await screen.findByText(GENERICO)).toBeInTheDocument()
      await reposar()
      expect(selector()).toHaveValue("sin-entregar")
      expect(document.activeElement).toBe(selector())
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      expect(aviso.error).not.toHaveBeenCalled()
      sinRastroDelServidor(mensaje)
    },
  )

  it.each(FUERA)(
    "CAL-T-169: «Ver más tareas» con «%j»: exactamente un aviso con el texto fijo, las filas se conservan, el botón sale de la espera con el foco y ningún MensajeError",
    async (mensaje) => {
      montar()
      const boton = await screen.findByRole("button", { name: "Ver más tareas" })
      servidor.manejador = (l) => (l.cursor !== null ? validacion(mensaje) : undefined)
      act(() => boton.focus())
      fireEvent.click(boton)
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
      await reposar()
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(aviso.error).toHaveBeenCalledWith(VER_MAS_FALLO)
      expect(enlacesDeTarea()).toHaveLength(1)
      expect(verMas()).not.toHaveAttribute("aria-busy")
      expect(document.activeElement).toBe(verMas())
      expect(screen.queryByRole("alert")).toBeNull()
      sinRastroDelServidor(mensaje)
    },
  )

  it("CAL-T-170: primera carga con «cursor: no es válido» (sin cursor enviado): el texto del cursor, una sola vez; con «claseId:» sin mensaje, «No tienes acceso a esta clase.»", async () => {
    servidor.manejador = () => validacion("cursor: no es válido")
    montar()
    expect(await screen.findByText(CURSOR_TEXTO)).toBeInTheDocument()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    cleanup()
    servidor.manejador = () => validacion("claseId:")
    montar()
    expect(await screen.findByText(SIN_ACCESO)).toBeInTheDocument()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-T-171: «Ver más tareas» con «claseId:» sin mensaje: «No tienes acceso a esta clase.» en lugar de la lista, sin aviso, y el foco en la raíz", async () => {
    montar()
    const boton = await screen.findByRole("button", { name: "Ver más tareas" })
    servidor.manejador = (l) => (l.cursor !== null ? validacion("claseId:") : undefined)
    act(() => boton.focus())
    fireEvent.click(boton)
    expect(await screen.findByText(SIN_ACCESO)).toBeInTheDocument()
    await reposar()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(raiz())
  })
})

describe("modal «Cálculo de tu calificación» bajo ataque", () => {
  const abrir = async () => {
    const boton = await screen.findByRole("button", { name: "Ver cálculo" })
    act(() => boton.focus())
    fireEvent.click(boton)
    const dialogo = await screen.findByRole("dialog", { name: "Cálculo de tu calificación" })
    return { boton, dialogo }
  }

  it("CAL-T-172: Tab y Mayús+Tab no sacan el foco del diálogo; su único control es «Cerrar»", async () => {
    montar()
    const { dialogo } = await abrir()
    const cerrar = within(dialogo).getByRole("button", { name: "Cerrar" })
    await waitFor(() => expect(document.activeElement).toBe(cerrar))
    expect(within(dialogo).getAllByRole("button")).toHaveLength(1)
    fireEvent.keyDown(cerrar, { key: "Tab" })
    expect(dialogo.contains(document.activeElement)).toBe(true)
    fireEvent.keyDown(document.activeElement ?? cerrar, { key: "Tab", shiftKey: true })
    expect(dialogo.contains(document.activeElement)).toBe(true)
  })

  it("CAL-T-173: con el modal abierto, «Ver más tareas» (pulsado antes) falla con un 400 fuera de contrato: el modal sigue abierto, hay un solo aviso y el foco sigue dentro del diálogo", async () => {
    const espera = diferido()
    montar()
    const boton = await screen.findByRole("button", { name: "Ver más tareas" })
    servidor.manejador = (l) => (l.cursor !== null ? espera.promesa : undefined)
    fireEvent.click(boton)
    const { dialogo } = await abrir()
    await waitFor(() => expect(dialogo.contains(document.activeElement)).toBe(true))
    espera.resolver(validacion("estado: Invalid option"))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await reposar()
    expect(screen.getByRole("dialog", { name: "Cálculo de tu calificación" })).toBe(dialogo)
    expect(dialogo.contains(document.activeElement)).toBe(true)
    expect(aviso.error).toHaveBeenCalledWith(VER_MAS_FALLO)
  })

  it("CAL-T-174: con el modal abierto, «Ver más tareas» (pulsado antes) responde «cursor:»: el modal sigue abierto (la consulta no se reemplaza) y, al cerrarlo, el foco vuelve a «Ver cálculo»", async () => {
    const espera = diferido()
    montar()
    const boton = await screen.findByRole("button", { name: "Ver más tareas" })
    servidor.manejador = (l) => (l.cursor !== null ? espera.promesa : undefined)
    fireEvent.click(boton)
    const { boton: verCalculo, dialogo } = await abrir()
    espera.resolver(validacion("cursor:"))
    expect(await screen.findByText(CURSOR_TEXTO, {}, { timeout: 3000 })).toBeInTheDocument()
    await reposar()
    expect(screen.getByRole("dialog", { name: "Cálculo de tu calificación" })).toBe(dialogo)
    expect(aviso.error).not.toHaveBeenCalled()
    fireEvent.keyDown(dialogo, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(verCalculo))
  })

  it("CAL-T-175: «Ver cálculo» durante una recarga de fondo abre al instante con el cálculo en caché y se actualiza sin cerrarse cuando llega otro", async () => {
    const espera = diferido()
    const { cliente } = montar()
    await screen.findByRole("link", { name: "Tarea 1" })
    servidor.manejador = (l) => (l.cursor === null ? espera.promesa : undefined)
    let recarga: Promise<void> = Promise.resolve()
    act(() => {
      recarga = cliente.refetchQueries({ type: "active" })
    })
    const { dialogo } = await abrir()
    expect(within(dialogo).getByText("Obtuviste 85 de 100 puntos: 85 %.")).toBeInTheDocument()
    servidor.general = { ...generalPuntos(90), puntos: { obtenido: 90, posible: 100, tareas: 3 } }
    espera.resolver(respuestaJson(200, paginaDe("todas", null)))
    await act(async () => {
      await recarga
    })
    expect(
      await within(dialogo).findByText("Obtuviste 90 de 100 puntos: 90 %."),
    ).toBeInTheDocument()
    expect(screen.getByRole("dialog")).toBe(dialogo)
  })

  it("CAL-T-176: redondeo — con la calificación general 87.46 y pesos efectivos de 33.33, el encabezado y el modal dicen la misma centésima que manda el servidor", async () => {
    servidor.general = {
      modo: "categorias",
      porcentaje: 87.46,
      puntos: { obtenido: 26.24, posible: 30, tareas: 3 },
      categorias: [1, 2, 3].map((n) => ({
        id: uuid(200 + n),
        nombre: `Categoría ${String(n)}`,
        peso: n === 3 ? 34 : 33,
        pesoEfectivo: 33.33,
        porcentaje: n === 1 ? 100 : 81.19,
        obtenido: 10,
        posible: 10,
        tareas: 1,
      })),
      sinCategoria: { tareas: 2 },
    }
    montar()
    expect(await screen.findByText("87.46 %")).toBeInTheDocument()
    const { dialogo } = await abrir()
    expect(within(dialogo).getByText("Tu calificación general: 87.46 %.")).toBeInTheDocument()
    expect(within(dialogo).getAllByText("33.33 %")).toHaveLength(3)
    expect(within(dialogo).getAllByText("81.19 %")).toHaveLength(2)
    expect(
      within(dialogo).getByText("2 tareas sin categoría no cuentan en tu calificación general."),
    ).toBeInTheDocument()
  })

  it("CAL-T-177: modo categorías sin nada calificado que cuente y una tarea sin categoría: la frase de «nada», la nota en singular y ninguna tabla", async () => {
    servidor.general = {
      modo: "categorias",
      porcentaje: null,
      puntos: { obtenido: 0, posible: 0, tareas: 0 },
      categorias: [
        {
          id: uuid(201),
          nombre: "Exámenes",
          peso: 100,
          pesoEfectivo: null,
          porcentaje: null,
          obtenido: 0,
          posible: 0,
          tareas: 0,
        },
      ],
      sinCategoria: { tareas: 1 },
    }
    montar()
    expect(
      await screen.findByText("Aún no tienes tareas calificadas que cuenten."),
    ).toBeInTheDocument()
    const { dialogo } = await abrir()
    expect(
      within(dialogo).getByText(
        "Todavía no tienes tareas calificadas que cuenten en tu calificación general.",
      ),
    ).toBeInTheDocument()
    expect(
      within(dialogo).getByText("1 tarea sin categoría no cuenta en tu calificación general."),
    ).toBeInTheDocument()
    expect(within(dialogo).queryByRole("table")).toBeNull()
  })
})

describe("RN-02 en «Mis calificaciones»", () => {
  it("CAL-T-178: si el servidor manda de más el estado de pago o la restricción, el esquema estricto lo rechaza: un solo MensajeError genérico y nada de esos datos", async () => {
    servidor.extra = { estadoPago: "deudor", accesoRestringido: true }
    montar()
    expect(await screen.findByText(GENERICO)).toBeInTheDocument()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(document.body.textContent).not.toMatch(/deudor|Deudor|restringid/)
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("recargas de fondo que quitan el control con el foco", () => {
  it("CAL-T-196: con el foco en «Ver cálculo», una recarga de fondo que responde 403 reemplaza la vista y el foco va a la raíz, nunca a <body>", async () => {
    const { cliente } = montar()
    const verCalculo = await screen.findByRole("button", { name: "Ver cálculo" })
    act(() => verCalculo.focus())
    servidor.manejador = () =>
      errorApi(403, "SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.")
    vi.setSystemTime(new Date(AHORA.getTime() + 1_000))
    await act(async () => {
      await cliente.refetchQueries({ type: "active" })
    })
    expect(await screen.findByText(SIN_ACCESO)).toBeInTheDocument()
    await reposar()
    expect(screen.queryByRole("button", { name: "Ver cálculo" })).toBeNull()
    expect(document.activeElement).toBe(raiz())
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-T-197: con el foco en «Ver más tareas», una recarga de fondo que ya no trae página siguiente lo quita y el foco va a la raíz, nunca a <body>", async () => {
    const { cliente } = montar()
    const boton = await screen.findByRole("button", { name: "Ver más tareas" })
    act(() => boton.focus())
    servidor.paginas.todas = [[tarea(1)]]
    vi.setSystemTime(new Date(AHORA.getTime() + 1_000))
    await act(async () => {
      await cliente.refetchQueries({ type: "active" })
    })
    await waitFor(() => expect(screen.queryByRole("button", { name: "Ver más tareas" })).toBeNull())
    await reposar()
    expect(document.activeElement).toBe(raiz())
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("filtro durante «Ver más tareas»: la página vieja que responde con un error de otra clase", () => {
  it.each([
    ["«cursor:» sin mensaje", () => validacion("cursor:")],
    ["un 403 SIN_ACCESO_A_LA_CLASE", () => errorApi(403, "SIN_ACCESO_A_LA_CLASE", "Sin acceso")],
    ["«claseId:»", () => validacion("claseId: Invalid UUID")],
  ] as const)(
    "CAL-T-198: «Ver más tareas» de «Todas» en vuelo, se elige «Calificadas» y la página vieja responde %s: la lista de «Calificadas» sigue, sin MensajeError ni aviso, y el foco en el selector",
    async (_nombre, respuesta) => {
      servidor.paginas.calificadas = [
        [tarea(7, { entrega: { estado: "calificado", conRetraso: false, calificacion: 9 } })],
      ]
      const espera = diferido()
      montar()
      const boton = await screen.findByRole("button", { name: "Ver más tareas" })
      servidor.manejador = (l) =>
        l.cursor !== null && l.estado === "todas" ? espera.promesa : undefined
      fireEvent.click(boton)
      await waitFor(() => expect(pidioPaginaDe("todas")).toHaveLength(1))
      elegir("calificadas")
      expect(await screen.findByRole("link", { name: "Tarea 7" })).toBeInTheDocument()
      espera.resolver(respuesta())
      await reposar()
      expect(enlacesDeTarea().map((e) => e.textContent)).toEqual(["Tarea 7"])
      expect(screen.queryByRole("alert")).toBeNull()
      expect(aviso.error).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(selector())
    },
  )
})
