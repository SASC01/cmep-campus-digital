import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { Link, MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { vencimientoDe } from "@/lib/vencimiento"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { MisCalificacionesView } from "./mis-calificaciones-view"

// CALIFICACIONES-01d (CAL-1D04, CAL-1D05 y, de la Enmienda 2, CAL-1D14 a CAL-1D17): "Mis calificaciones"
// del alumno y el modal de cálculo. El servidor es un doble en memoria (fetch); los avisos, un doble de
// sonner. Reloj fijo en todas (vi.useFakeTimers solo para Date).

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-12T16:00:00.000Z"
const LEJANA = "2030-02-20T16:00:00.000Z"
const PASADA = "2030-01-05T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const uuid = (n: number) => `9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`
const RUTA_API = `/api/clases/${CLASE_ID}/mis-calificaciones`
const RUTA_VISTA = `/estudiante/clases/${CLASE_ID}/calificaciones`
const GENERICO = "No pudimos cargar tus calificaciones. Inténtalo de nuevo."
const VER_MAS_FALLO = "No pudimos cargar más tareas. Inténtalo de nuevo."
const CURSOR =
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

const generalCategorias = (sinCategoria: number) => ({
  modo: "categorias",
  porcentaje: 87.5,
  puntos: { obtenido: 17.5, posible: 20, tareas: 2 },
  categorias: [
    {
      id: uuid(201),
      nombre: "Tareas",
      peso: 60,
      pesoEfectivo: 100,
      porcentaje: 87.5,
      obtenido: 17.5,
      posible: 20,
      tareas: 2,
    },
    {
      id: uuid(202),
      nombre: "Exámenes",
      peso: 40,
      pesoEfectivo: null,
      porcentaje: null,
      obtenido: 0,
      posible: 0,
      tareas: 0,
    },
  ],
  sinCategoria: { tareas: sinCategoria },
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
}

let servidor: Servidor
let llamadas: Llamada[] = []
const asignar = vi.fn()

const cursorDePagina = (indice: number) => uuid(900 + indice)

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
        const paginas = servidor.paginas[filtro] ?? [[]]
        const indice = llamada.cursor === null ? 0 : Number(llamada.cursor.slice(-4)) - 900
        const siguiente = indice + 1 < paginas.length ? cursorDePagina(indice + 1) : null
        return Promise.resolve(
          respuestaJson(200, {
            general: servidor.general,
            tareas: paginas[indice] ?? [],
            siguienteCursor: siguiente,
          }),
        )
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
          <Route
            path="/estudiante/clases/:claseId/tareas/:tareaId"
            element={<p>Detalle de prueba</p>}
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
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0))
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

// La forma común del resultado ante un 400 fuera de contrato: un solo mensaje legible, sin el mensaje
// del servidor ni su prefijo, sin ErrorDeCampo y sin controles en espera.
const sinRastroDelServidor = (mensaje: string) => {
  const texto = document.body.textContent
  if (mensaje.trim() !== "") expect(texto).not.toContain(mensaje.trim())
  const prefijo = /^([^:]+):/.exec(mensaje)?.[1]
  if (prefijo !== undefined) expect(texto).not.toContain(`${prefijo}:`)
  expect(texto).not.toContain("Too ")
  expect(texto).not.toContain("Invalid")
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
    paginas: { todas: [[tarea(1), tarea(2)]] },
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
  aviso.success.mockClear()
  aviso.error.mockClear()
  asignar.mockReset()
})

describe("«Mis calificaciones» (CAL-1D04)", () => {
  it("CAL-1D04: muestra la calificación general en porcentaje y pide la primera página con estado=todas", async () => {
    montar()
    expect(await screen.findByText("85 %")).toBeInTheDocument()
    expect(screen.getByText("Calificación general")).toBeInTheDocument()
    expect(llamadas[0]?.estado).toBe("todas")
    expect(llamadas[0]?.cursor).toBeNull()
  })

  it("CAL-1D04: sin nada que cuente, dice su frase en lugar del porcentaje", async () => {
    servidor.general = generalPuntos(null)
    montar()
    expect(
      await screen.findByText("Aún no tienes tareas calificadas que cuenten."),
    ).toBeInTheDocument()
    expect(screen.queryByText(/ %$/)).toBeNull()
  })

  it("CAL-1D04: cada fila dice el estado, la calificación, la categoría y la fecha con el texto de vencimientoDe", async () => {
    servidor.paginas.todas = [
      [
        tarea(1, {
          fechaLimite: PASADA,
          categoria: { id: uuid(201), nombre: "Proyectos" },
          entrega: { estado: "calificado", conRetraso: false, calificacion: 8.5 },
        }),
        tarea(2, { fechaLimite: FUTURA }),
        tarea(3, { fechaLimite: PASADA }),
        tarea(4, { entrega: { estado: "entregado", conRetraso: true, calificacion: null } }),
      ],
    ]
    montar()
    const primera = (await screen.findByRole("link", { name: "Tarea 1" })).closest("li")
    if (primera === null) throw new Error("Precondición: la fila es un li")
    expect(within(primera).getByText("Calificado")).toBeInTheDocument()
    expect(within(primera).getByText("8.5 de 10")).toBeInTheDocument()
    expect(within(primera).getByText("Proyectos")).toBeInTheDocument()
    const vencida = vencimientoDe(PASADA, AHORA).texto
    expect(vencida.startsWith("Venció el")).toBe(true)
    expect(within(primera).getByText(vencida)).toBeInTheDocument()

    const segunda = screen.getByRole("link", { name: "Tarea 2" }).closest("li")
    if (segunda === null) throw new Error("Precondición: la fila es un li")
    const proxima = vencimientoDe(FUTURA, AHORA).texto
    expect(proxima.startsWith("Vence")).toBe(true)
    expect(within(segunda).getByText(proxima)).toBeInTheDocument()
    expect(within(segunda).getByText("Asignado")).toBeInTheDocument()
    expect(within(segunda).getByText("Sin categoría")).toBeInTheDocument()
    expect(within(segunda).queryByText(/ de 10$/)).toBeNull()

    const tercera = screen.getByRole("link", { name: "Tarea 3" }).closest("li")
    if (tercera === null) throw new Error("Precondición: la fila es un li")
    expect(within(tercera).getByText("Sin entregar")).toBeInTheDocument()

    const cuarta = screen.getByRole("link", { name: "Tarea 4" }).closest("li")
    if (cuarta === null) throw new Error("Precondición: la fila es un li")
    expect(within(cuarta).getByText("Entregado con retraso")).toBeInTheDocument()
  })

  it.each([
    [
      "403",
      () => errorApi(403, "SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase."),
      "No tienes acceso a esta clase.",
    ],
    ["400 de claseId", () => validacion("claseId: Invalid UUID"), "No tienes acceso a esta clase."],
    ["500", () => errorApi(500, "ERROR_INTERNO", "Error interno del servidor"), GENERICO],
    ["sin conexión", () => new Response("", { status: 502 }), GENERICO],
  ] as const)(
    "CAL-1D04: primera carga con %s: un solo MensajeError en lugar de la lista, sin aviso, con el selector a la vista y el foco, puesto en la raíz antes de la respuesta, fuera de <body>",
    async (_nombre, respuesta, texto) => {
      const espera = diferido()
      servidor.manejador = () => espera.promesa
      montar()
      act(() => raiz().focus())
      espera.resolver(respuesta())
      expect(await screen.findByText(texto)).toBeInTheDocument()
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(selector()).toHaveValue("todas")
      expect(document.activeElement).toBe(raiz())
    },
  )

  it("CAL-1D04: el enlace de cada tarea va a su detalle en la clase", async () => {
    montar()
    const enlace = await screen.findByRole("link", { name: "Tarea 1" })
    expect(enlace).toHaveAttribute("href", `/estudiante/clases/${CLASE_ID}/tareas/${uuid(101)}`)
    fireEvent.click(enlace)
    expect(await screen.findByText("Detalle de prueba")).toBeInTheDocument()
  })

  it("CAL-1D04: el filtro pide con su estado y el foco se queda en el selector", async () => {
    servidor.paginas.calificadas = [
      [tarea(7, { entrega: { estado: "calificado", conRetraso: false, calificacion: 9 } })],
    ]
    montar()
    await screen.findByRole("link", { name: "Tarea 1" })
    elegir("calificadas")
    expect(await screen.findByRole("link", { name: "Tarea 7" })).toBeInTheDocument()
    expect(llamadas.at(-1)?.estado).toBe("calificadas")
    expect(selector()).toHaveValue("calificadas")
    expect(document.activeElement).toBe(selector())
  })

  it.each([
    ["todas", "Aún no hay tareas en esta clase."],
    ["asignadas", "No tienes tareas asignadas pendientes."],
    ["entregadas", "No tienes tareas entregadas sin calificar."],
    ["calificadas", "Aún no tienes tareas calificadas."],
    ["sin-entregar", "No tienes tareas sin entregar."],
  ] as const)("CAL-1D04: el vacío del filtro «%s» dice «%s»", async (filtro, texto) => {
    servidor.paginas = { todas: [[tarea(1)]], [filtro]: [[]] }
    montar()
    if (filtro !== "todas") {
      await screen.findByRole("link", { name: "Tarea 1" })
      elegir(filtro)
    }
    expect(await screen.findByText(texto)).toBeInTheDocument()
  })

  it("CAL-1D04: «Ver más tareas» pide la página siguiente; al desaparecer, el foco va al enlace de la primera fila nueva", async () => {
    servidor.paginas.todas = [[tarea(1), tarea(2)], [tarea(3)]]
    montar()
    const boton = await screen.findByRole("button", { name: "Ver más tareas" })
    act(() => boton.focus())
    fireEvent.click(boton)
    expect(await screen.findByRole("link", { name: "Tarea 3" })).toBeInTheDocument()
    expect(llamadas.at(-1)?.cursor).toBe(cursorDePagina(1))
    expect(screen.queryByRole("button", { name: "Ver más tareas" })).toBeNull()
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("link", { name: "Tarea 3" })),
    )
  })

  it("CAL-1D04: si la última página no trae filas nuevas, el foco va al h2", async () => {
    servidor.paginas.todas = [[tarea(1)], []]
    montar()
    const boton = await screen.findByRole("button", { name: "Ver más tareas" })
    act(() => boton.focus())
    fireEvent.click(boton)
    await waitFor(() => expect(screen.queryByRole("button", { name: "Ver más tareas" })).toBeNull())
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("heading", { name: "Mis calificaciones", level: 2 }),
      ),
    )
  })

  it("CAL-1D04: un 5xx en «Ver más tareas» con la vista montada avisa una vez y conserva las filas", async () => {
    servidor.paginas.todas = [[tarea(1), tarea(2)], [tarea(3)]]
    montar()
    const boton = await screen.findByRole("button", { name: "Ver más tareas" })
    servidor.manejador = (l) =>
      l.cursor !== null ? errorApi(500, "ERROR_INTERNO", "Error interno") : undefined
    act(() => boton.focus())
    fireEvent.click(boton)
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(aviso.error).toHaveBeenCalledWith(VER_MAS_FALLO)
    expect(enlacesDeTarea()).toHaveLength(2)
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Ver más tareas" }))
  })

  it("CAL-1D04: con la vista desmontada, un fallo de «Ver más tareas» no avisa", async () => {
    servidor.paginas.todas = [[tarea(1)], [tarea(2)]]
    const espera = diferido()
    const { unmount } = montar()
    const boton = await screen.findByRole("button", { name: "Ver más tareas" })
    servidor.manejador = (l) => (l.cursor !== null ? espera.promesa : undefined)
    fireEvent.click(boton)
    unmount()
    espera.resolver(errorApi(500, "ERROR_INTERNO", "Error interno"))
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1D04: el 400 del cursor en «Ver más tareas» dice su texto en la lista, sin aviso, y el foco va a la raíz", async () => {
    servidor.paginas.todas = [[tarea(1)], [tarea(2)]]
    montar()
    const boton = await screen.findByRole("button", { name: "Ver más tareas" })
    servidor.manejador = (l) => (l.cursor !== null ? validacion("cursor: no es válido") : undefined)
    act(() => boton.focus())
    fireEvent.click(boton)
    expect(await screen.findByText(CURSOR)).toBeInTheDocument()
    expect(aviso.error).not.toHaveBeenCalled()
    await waitFor(() => expect(document.activeElement).toBe(raiz()))
  })
})

describe("modal «Cálculo de tu calificación» (CAL-1D05)", () => {
  const abrir = async () => {
    const boton = await screen.findByRole("button", { name: "Ver cálculo" })
    act(() => boton.focus())
    fireEvent.click(boton)
    const dialogo = await screen.findByRole("dialog", { name: "Cálculo de tu calificación" })
    return { boton, dialogo }
  }

  it("CAL-1D05: en modo puntos explica el cálculo y dice los puntos y el porcentaje", async () => {
    montar()
    const { dialogo } = await abrir()
    expect(
      within(dialogo).getByText(
        "Esta clase califica por puntos: se suman los puntos de tus tareas calificadas y se dividen entre los puntos posibles.",
      ),
    ).toBeInTheDocument()
    expect(within(dialogo).getByText("Obtuviste 85 de 100 puntos: 85 %.")).toBeInTheDocument()
  })

  it("CAL-1D05: en modo categorías muestra la tabla con «Peso que cuenta», «—» en la categoría sin tareas y la nota de una tarea sin categoría", async () => {
    servidor.general = generalCategorias(1)
    montar()
    const { dialogo } = await abrir()
    for (const encabezado of [
      "Categoría",
      "Peso",
      "Peso que cuenta",
      "Tu porcentaje",
      "Tareas calificadas",
    ]) {
      expect(within(dialogo).getByRole("columnheader", { name: encabezado })).toBeInTheDocument()
    }
    const examenes = within(dialogo).getByRole("row", { name: /^Exámenes / })
    expect(within(examenes).getAllByText("—")).toHaveLength(2)
    expect(within(examenes).getByText("40 %")).toBeInTheDocument()
    const tareas = within(dialogo).getByRole("row", { name: /^Tareas / })
    expect(within(tareas).getByText("100 %")).toBeInTheDocument()
    expect(within(tareas).getByText("87.5 %")).toBeInTheDocument()
    expect(
      within(dialogo).getByText(
        "Las categorías sin tareas calificadas no cuentan: su peso se reparte entre las demás.",
      ),
    ).toBeInTheDocument()
    expect(
      within(dialogo).getByText("1 tarea sin categoría no cuenta en tu calificación general."),
    ).toBeInTheDocument()
    expect(within(dialogo).getByText("Tu calificación general: 87.5 %.")).toBeInTheDocument()
  })

  it("CAL-1D05: la nota de «Sin categoría» va en plural con dos o más", async () => {
    servidor.general = generalCategorias(3)
    montar()
    const { dialogo } = await abrir()
    expect(
      within(dialogo).getByText("3 tareas sin categoría no cuentan en tu calificación general."),
    ).toBeInTheDocument()
  })

  it("CAL-1D05: sin nada que cuente, el modal lo dice", async () => {
    servidor.general = generalPuntos(null)
    montar()
    const { dialogo } = await abrir()
    expect(
      within(dialogo).getByText(
        "Todavía no tienes tareas calificadas que cuenten en tu calificación general.",
      ),
    ).toBeInTheDocument()
  })

  it("CAL-1D05: Escape lo cierra y el foco vuelve a «Ver cálculo»", async () => {
    montar()
    const { dialogo } = await abrir()
    fireEvent.keyDown(dialogo, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Ver cálculo" })),
    )
  })

  it("CAL-1D05: «Cerrar» lo cierra y el foco vuelve a «Ver cálculo»; es el único botón del diálogo (sin la equis)", async () => {
    montar()
    const { dialogo } = await abrir()
    const botones = within(dialogo).getAllByRole("button")
    expect(botones.map((b) => b.textContent)).toEqual(["Cerrar"])
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cerrar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Ver cálculo" })),
    )
  })

  it("CAL-1D05: el foco entra al diálogo y queda atrapado; el contenido va en el portal, fuera del panel de la vista", async () => {
    montar()
    const { dialogo } = await abrir()
    await waitFor(() => expect(dialogo.contains(document.activeElement)).toBe(true))
    const encabezado = screen.getByRole("heading", {
      name: "Mis calificaciones",
      level: 2,
      hidden: true,
    })
    act(() => encabezado.focus())
    await waitFor(() => expect(dialogo.contains(document.activeElement)).toBe(true))
    expect(raiz().contains(dialogo)).toBe(false)
    expect(dialogo.closest("[data-slot='card']")).toBeNull()
  })

  it("CAL-1D05: si la vista se reemplaza con el modal abierto, el diálogo deja de pintarse y el foco va a la raíz", async () => {
    const { cliente } = montar()
    await abrir()
    servidor.manejador = () =>
      errorApi(403, "SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.")
    await act(async () => {
      await cliente.refetchQueries()
    })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(screen.getByText("No tienes acceso a esta clase.")).toBeInTheDocument()
    await waitFor(() => expect(document.activeElement).toBe(raiz()))
  })

  it("CAL-1D05: Escape con «Ver más tareas» en vuelo cierra el modal y deja el foco en «Ver cálculo» aunque después desaparezca «Ver más tareas»", async () => {
    servidor.paginas.todas = [[tarea(1)], [tarea(2)]]
    const espera = diferido()
    montar()
    const verMas = await screen.findByRole("button", { name: "Ver más tareas" })
    servidor.manejador = (l) => (l.cursor !== null ? espera.promesa : undefined)
    fireEvent.click(verMas)
    const { dialogo } = await abrir()
    fireEvent.keyDown(dialogo, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    const verCalculo = screen.getByRole("button", { name: "Ver cálculo" })
    await waitFor(() => expect(document.activeElement).toBe(verCalculo))
    espera.resolver(
      respuestaJson(200, { general: servidor.general, tareas: [tarea(2)], siguienteCursor: null }),
    )
    expect(await screen.findByRole("link", { name: "Tarea 2" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ver más tareas" })).toBeNull()
    await reposar()
    expect(document.activeElement).toBe(verCalculo)
  })

  it("CAL-1D05: una recarga con otro cálculo actualiza el modal sin cerrarlo", async () => {
    const { cliente } = montar()
    const { dialogo } = await abrir()
    servidor.general = { ...generalPuntos(90), puntos: { obtenido: 90, posible: 100, tareas: 3 } }
    await act(async () => {
      await cliente.refetchQueries()
    })
    expect(
      await within(dialogo).findByText("Obtuviste 90 de 100 puntos: 90 %."),
    ).toBeInTheDocument()
    expect(screen.getByRole("dialog")).toBe(dialogo)
  })
})

// Enmienda 2: las tres clases de "fuera de contrato", dos entradas por clase.
const FUERA_DE_CONTRATO_FILTRO = [
  ['estado: Invalid option: expected one of "todas"|"asignadas"'],
  ["limite: Too big: expected number to be <=100"],
  [""],
  ["   "],
  ["estado.0: Invalid option"],
  ["tareas.0.id: x"],
] as const

const FUERA_DE_CONTRATO_VER_MAS = [
  ["limite: Too big: expected number to be <=100"],
  ['estado: Invalid option: expected one of "todas"|"asignadas"'],
  [""],
  ["   "],
  ["cursor.0: no es válido"],
  ["tareas.0.id: x"],
] as const

describe("filtro «Mostrar» con un 400 fuera de contrato (CAL-1D14)", () => {
  it.each(FUERA_DE_CONTRATO_FILTRO)(
    "CAL-1D14: en la primera carga, «%s» da un solo MensajeError con el genérico, sin aviso ni rastro del servidor; el foco, puesto en la raíz antes de la respuesta, no cae en <body>",
    async (mensaje) => {
      const espera = diferido()
      servidor.manejador = () => espera.promesa
      montar()
      act(() => raiz().focus())
      expect(document.activeElement).toBe(raiz())
      espera.resolver(validacion(mensaje))
      expect(await screen.findByText(GENERICO)).toBeInTheDocument()
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(enlacesDeTarea()).toHaveLength(0)
      sinRastroDelServidor(mensaje)
      expect(document.activeElement).not.toBe(document.body)
      expect(selector()).toHaveValue("todas")
    },
  )

  it.each(FUERA_DE_CONTRATO_FILTRO)(
    "CAL-1D14: tras elegir «Calificadas», «%s» pide estado=calificadas, conserva la opción y el foco en el selector y da un solo MensajeError con el genérico, sin aviso",
    async (mensaje) => {
      montar()
      await screen.findByRole("link", { name: "Tarea 1" })
      servidor.manejador = (l) => (l.estado === "calificadas" ? validacion(mensaje) : undefined)
      elegir("calificadas")
      expect(await screen.findByText(GENERICO)).toBeInTheDocument()
      expect(llamadas.at(-1)?.estado).toBe("calificadas")
      expect(selector()).toHaveValue("calificadas")
      expect(document.activeElement).toBe(selector())
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(enlacesDeTarea()).toHaveLength(0)
      sinRastroDelServidor(mensaje)
    },
  )
})

describe("filtro «Mostrar», estados vecinos (CAL-1D15)", () => {
  it("CAL-1D15: dos filtros seguidos que fallan («Asignadas» y «Sin entregar») dejan un solo MensajeError, el de la última clave, sin aviso", async () => {
    montar()
    await screen.findByRole("link", { name: "Tarea 1" })
    servidor.manejador = (l) =>
      l.estado === "asignadas" || l.estado === "sin-entregar"
        ? validacion("estado: Invalid option")
        : undefined
    elegir("asignadas")
    expect(await screen.findByText(GENERICO)).toBeInTheDocument()
    elegir("sin-entregar")
    await waitFor(() => expect(llamadas.at(-1)?.estado).toBe("sin-entregar"))
    await reposar()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(screen.getByText(GENERICO)).toBeInTheDocument()
    expect(selector()).toHaveValue("sin-entregar")
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1D15: volver a un filtro que responde 200 trae la lista, quita el MensajeError y deja el foco en el selector", async () => {
    servidor.paginas.entregadas = [
      [tarea(5, { entrega: { estado: "entregado", conRetraso: false, calificacion: null } })],
    ]
    montar()
    await screen.findByRole("link", { name: "Tarea 1" })
    servidor.manejador = (l) =>
      l.estado === "asignadas"
        ? validacion("limite: Too big: expected number to be <=100")
        : undefined
    elegir("asignadas")
    expect(await screen.findByText(GENERICO)).toBeInTheDocument()
    elegir("entregadas")
    expect(await screen.findByRole("link", { name: "Tarea 5" })).toBeInTheDocument()
    expect(screen.queryByText(GENERICO)).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(document.activeElement).toBe(selector())
  })

  it("CAL-1D15: un filtro nuevo con «Ver más tareas» en vuelo deja de observar esa página: no se agrega ni avisa si falla, y el foco sigue en el selector", async () => {
    servidor.paginas.todas = [[tarea(1)], [tarea(2)]]
    servidor.paginas.calificadas = [
      [tarea(7, { entrega: { estado: "calificado", conRetraso: false, calificacion: 9 } })],
    ]
    const espera = diferido()
    montar()
    const verMas = await screen.findByRole("button", { name: "Ver más tareas" })
    servidor.manejador = (l) =>
      l.cursor !== null && l.estado === "todas" ? espera.promesa : undefined
    fireEvent.click(verMas)
    elegir("calificadas")
    expect(await screen.findByRole("link", { name: "Tarea 7" })).toBeInTheDocument()
    espera.resolver(validacion("limite: Too big"))
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(screen.queryByRole("link", { name: "Tarea 2" })).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(document.activeElement).toBe(selector())
  })

  it.each([
    ["500", () => errorApi(500, "ERROR_INTERNO", "Error interno del servidor")],
    ["cursor: no es válido", () => validacion("cursor: no es válido")],
    ["limite: Too big", () => validacion("limite: Too big: expected number to be <=100")],
  ] as const)(
    "CAL-1D15: una recarga de fondo con filas que responde «%s» las conserva, sin MensajeError ni aviso (S-19)",
    async (_nombre, respuesta) => {
      const { cliente } = montar()
      await screen.findByRole("link", { name: "Tarea 1" })
      servidor.manejador = () => respuesta()
      await act(async () => {
        await cliente.refetchQueries()
      })
      await reposar()
      expect(enlacesDeTarea()).toHaveLength(2)
      expect(screen.queryByRole("alert")).toBeNull()
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )

  it("CAL-1D15: con la vista desmontada y el filtro en vuelo, un 400 fuera de contrato no avisa", async () => {
    const espera = diferido()
    const { unmount } = montar()
    await screen.findByRole("link", { name: "Tarea 1" })
    servidor.manejador = (l) => (l.estado === "calificadas" ? espera.promesa : undefined)
    elegir("calificadas")
    unmount()
    espera.resolver(validacion("estado: Invalid option"))
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("«Ver más tareas» con un 400 fuera de contrato (CAL-1D16)", () => {
  it.each(FUERA_DE_CONTRATO_VER_MAS)(
    "CAL-1D16: «%s» avisa una sola vez con el genérico de «Ver más tareas», conserva las filas y deja el botón sin espera y con el foco",
    async (mensaje) => {
      servidor.paginas.todas = [[tarea(1), tarea(2)], [tarea(3)]]
      montar()
      const boton = await screen.findByRole("button", { name: "Ver más tareas" })
      servidor.manejador = (l) => (l.cursor !== null ? validacion(mensaje) : undefined)
      act(() => boton.focus())
      fireEvent.click(boton)
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
      expect(aviso.error).toHaveBeenCalledWith(VER_MAS_FALLO)
      expect(enlacesDeTarea()).toHaveLength(2)
      const despues = screen.getByRole("button", { name: "Ver más tareas" })
      expect(despues).not.toHaveAttribute("aria-busy", "true")
      expect(document.activeElement).toBe(despues)
      expect(screen.queryByRole("alert")).toBeNull()
      sinRastroDelServidor(mensaje)
    },
  )

  it("CAL-1D16: «cursor:» sin mensaje da el texto del cursor y ningún aviso", async () => {
    servidor.paginas.todas = [[tarea(1)], [tarea(2)]]
    montar()
    const boton = await screen.findByRole("button", { name: "Ver más tareas" })
    servidor.manejador = (l) => (l.cursor !== null ? validacion("cursor:") : undefined)
    fireEvent.click(boton)
    expect(await screen.findByText(CURSOR)).toBeInTheDocument()
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("«Ver más tareas», estados vecinos (CAL-1D17)", () => {
  it("CAL-1D17: el mismo 400 fuera de contrato en dos intentos seguidos da dos avisos, uno por intento, con el mismo texto", async () => {
    servidor.paginas.todas = [[tarea(1)], [tarea(2)]]
    montar()
    servidor.manejador = (l) => (l.cursor !== null ? validacion("limite: Too big") : undefined)
    fireEvent.click(await screen.findByRole("button", { name: "Ver más tareas" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await reposar()
    fireEvent.click(screen.getByRole("button", { name: "Ver más tareas" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
    expect(aviso.error).toHaveBeenNthCalledWith(1, VER_MAS_FALLO)
    expect(aviso.error).toHaveBeenNthCalledWith(2, VER_MAS_FALLO)
  })

  it("CAL-1D17: un doble clic durante la petición manda una sola petición y da un solo aviso", async () => {
    servidor.paginas.todas = [[tarea(1)], [tarea(2)]]
    const espera = diferido()
    montar()
    const boton = await screen.findByRole("button", { name: "Ver más tareas" })
    servidor.manejador = (l) => (l.cursor !== null ? espera.promesa : undefined)
    fireEvent.click(boton)
    fireEvent.click(boton)
    await reposar()
    fireEvent.click(screen.getByRole("button", { name: "Ver más tareas" }))
    expect(llamadas.filter((l) => l.cursor !== null)).toHaveLength(1)
    espera.resolver(validacion("estado: Invalid option"))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })

  it("CAL-1D17: un 400 fuera de contrato seguido de un 200 agrega las filas sin aviso nuevo", async () => {
    servidor.paginas.todas = [[tarea(1)], [tarea(2)]]
    montar()
    let fallar = true
    servidor.manejador = (l) => (l.cursor !== null && fallar ? validacion("   ") : undefined)
    fireEvent.click(await screen.findByRole("button", { name: "Ver más tareas" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await reposar()
    fallar = false
    fireEvent.click(screen.getByRole("button", { name: "Ver más tareas" }))
    expect(await screen.findByRole("link", { name: "Tarea 2" })).toBeInTheDocument()
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })

  it("CAL-1D17: con la vista desmontada y «Ver más tareas» en vuelo, un 400 fuera de contrato no avisa, ni al responder ni al volver a montar con la misma QueryClient", async () => {
    servidor.paginas.todas = [[tarea(1)], [tarea(2)]]
    const espera = diferido()
    const { cliente, unmount } = montar()
    const boton = await screen.findByRole("button", { name: "Ver más tareas" })
    servidor.manejador = (l) => (l.cursor !== null ? espera.promesa : undefined)
    fireEvent.click(boton)
    unmount()
    espera.resolver(validacion("tareas.0.id: x"))
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
    servidor.manejador = () => undefined
    montar(cliente)
    expect(await screen.findByRole("link", { name: "Tarea 1" })).toBeInTheDocument()
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

// Corrección de la verificación de 01d (M-09 y N-44): la guarda de "Ver más tareas" es del filtro en que
// se pulsó. Un filtro nuevo la libera: su propio "Ver más tareas" responde al primer clic aunque la
// página vieja siga en vuelo, y la respuesta vieja no se agrega, no avisa y no mueve el foco. N-44: los
// dos errores de "Ver más tareas" que no avisan porque los resuelve otro (filas M14 y M15).
const paginaVieja = (tareas: Record<string, unknown>[]) =>
  respuestaJson(200, { general: servidor.general, tareas, siguienteCursor: null })

const calificada = (n: number) =>
  tarea(n, { entrega: { estado: "calificado", conRetraso: false, calificacion: 9 } })

const pidioPaginaDe = (estado: Filtro) =>
  llamadas.filter((l) => l.estado === estado && l.cursor !== null)

// "Ver más tareas" de «Todas» queda en vuelo y se elige «Calificadas», que trae dos páginas.
const verMasEnVueloYOtroFiltro = async (destino: Filtro = "calificadas") => {
  servidor.paginas.todas = [[tarea(1)], [tarea(2)]]
  servidor.paginas.calificadas = [[calificada(7)], [calificada(8)]]
  servidor.paginas.entregadas = [
    [tarea(5, { entrega: { estado: "entregado", conRetraso: false, calificacion: null } })],
    [tarea(6, { entrega: { estado: "entregado", conRetraso: false, calificacion: null } })],
  ]
  const espera = diferido()
  const montaje = montar()
  const verMas = await screen.findByRole("button", { name: "Ver más tareas" })
  servidor.manejador = (l) =>
    l.cursor !== null && l.estado === "todas" ? espera.promesa : undefined
  fireEvent.click(verMas)
  await waitFor(() => expect(pidioPaginaDe("todas")).toHaveLength(1))
  elegir(destino)
  return { espera, ...montaje }
}

describe("«Ver más tareas» ante un cambio de filtro (M-09, CAL-1D04b a CAL-1D04f)", () => {
  it("CAL-1D04b: con «Ver más tareas» de «Todas» en vuelo, el «Ver más tareas» de «Calificadas» responde al primer clic; la respuesta vieja llega después con 200 y no agrega filas, no avisa ni mueve el foco", async () => {
    const { espera } = await verMasEnVueloYOtroFiltro()
    expect(await screen.findByRole("link", { name: "Tarea 7" })).toBeInTheDocument()
    const nuevo = screen.getByRole("button", { name: "Ver más tareas" })
    expect(nuevo).not.toHaveAttribute("aria-busy", "true")
    act(() => nuevo.focus())
    fireEvent.click(nuevo)
    expect(await screen.findByRole("link", { name: "Tarea 8" })).toBeInTheDocument()
    expect(pidioPaginaDe("calificadas")).toHaveLength(1)
    const tarea8 = screen.getByRole("link", { name: "Tarea 8" })
    await waitFor(() => expect(document.activeElement).toBe(tarea8))
    espera.resolver(paginaVieja([tarea(2)]))
    await reposar()
    expect(screen.queryByRole("link", { name: "Tarea 2" })).toBeNull()
    expect(enlacesDeTarea().map((e) => e.textContent)).toEqual(["Tarea 7", "Tarea 8"])
    expect(aviso.error).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(tarea8)
  })

  it("CAL-1D04c: con «Ver más tareas» de «Todas» en vuelo y otro filtro elegido, la respuesta vieja con error no avisa, no reemplaza la lista ni mueve el foco", async () => {
    const { espera } = await verMasEnVueloYOtroFiltro()
    expect(await screen.findByRole("link", { name: "Tarea 7" })).toBeInTheDocument()
    const nuevo = screen.getByRole("button", { name: "Ver más tareas" })
    act(() => nuevo.focus())
    espera.resolver(errorApi(500, "ERROR_INTERNO", "Error interno"))
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByRole("link", { name: "Tarea 7" })).toBeInTheDocument()
    expect(document.activeElement).toBe(nuevo)
    fireEvent.click(nuevo)
    expect(await screen.findByRole("link", { name: "Tarea 8" })).toBeInTheDocument()
    expect(pidioPaginaDe("calificadas")).toHaveLength(1)
  })

  it("CAL-1D04d: dos cambios de filtro seguidos («Calificadas» y «Entregadas») con la página de «Todas» en vuelo: el «Ver más tareas» de «Entregadas» responde al primer clic", async () => {
    await verMasEnVueloYOtroFiltro("calificadas")
    expect(await screen.findByRole("link", { name: "Tarea 7" })).toBeInTheDocument()
    elegir("entregadas")
    expect(await screen.findByRole("link", { name: "Tarea 5" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Ver más tareas" }))
    expect(await screen.findByRole("link", { name: "Tarea 6" })).toBeInTheDocument()
    expect(pidioPaginaDe("entregadas")).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1D04e: al volver a «Todas» con su página aún en vuelo, su «Ver más tareas» está en espera y no pide otra; al llegar, la página se agrega sin aviso y el foco sigue en el selector", async () => {
    const { espera } = await verMasEnVueloYOtroFiltro()
    expect(await screen.findByRole("link", { name: "Tarea 7" })).toBeInTheDocument()
    elegir("todas")
    const deTodas = await screen.findByRole("button", { name: "Ver más tareas" })
    expect(deTodas).toHaveAttribute("aria-busy", "true")
    fireEvent.click(deTodas)
    await reposar()
    expect(pidioPaginaDe("todas")).toHaveLength(1)
    espera.resolver(paginaVieja([tarea(2)]))
    expect(await screen.findByRole("link", { name: "Tarea 2" })).toBeInTheDocument()
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(selector())
  })

  it("CAL-1D04f: con «Ver más tareas» de «Todas» en vuelo, otro filtro elegido y la vista desmontada, la respuesta vieja con error no avisa", async () => {
    const { espera, unmount } = await verMasEnVueloYOtroFiltro()
    expect(await screen.findByRole("link", { name: "Tarea 7" })).toBeInTheDocument()
    unmount()
    espera.resolver(errorApi(500, "ERROR_INTERNO", "Error interno"))
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("«Ver más tareas» con errores que no avisan (N-44, CAL-1D04g y CAL-1D04h)", () => {
  it("CAL-1D04g: un 403 SIN_ACCESO_A_LA_CLASE en «Ver más tareas» reemplaza la lista por «No tienes acceso a esta clase.», sin aviso, y el foco va a la raíz (fila M14)", async () => {
    servidor.paginas.todas = [[tarea(1)], [tarea(2)]]
    montar()
    const boton = await screen.findByRole("button", { name: "Ver más tareas" })
    servidor.manejador = (l) =>
      l.cursor !== null
        ? errorApi(403, "SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.")
        : undefined
    act(() => boton.focus())
    fireEvent.click(boton)
    expect(await screen.findByText("No tienes acceso a esta clase.")).toBeInTheDocument()
    await reposar()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(enlacesDeTarea()).toHaveLength(0)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(raiz())
  })

  it("CAL-1D04h: un 403 ACCESO_RESTRINGIDO en «Ver más tareas» lo redirige apiClient y no avisa (fila M15)", async () => {
    servidor.paginas.todas = [[tarea(1)], [tarea(2)]]
    montar()
    const boton = await screen.findByRole("button", { name: "Ver más tareas" })
    servidor.manejador = (l) =>
      l.cursor !== null
        ? errorApi(403, "ACCESO_RESTRINGIDO", "Tu acceso está restringido.")
        : undefined
    fireEvent.click(boton)
    await waitFor(() => expect(asignar).toHaveBeenCalledWith("/acceso-restringido"))
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

// T-08: la vista con un enlace a su misma ruta, como el NavLink de la sección «Calificaciones» de la
// clase: pulsarlo navega con otra location.key sin desmontar la vista (CAL-T-229 lo prueba con el
// router real). El enlace se enfoca antes del clic, como al pulsarlo en el navegador.
const montarConSeccion = (cliente: QueryClient = nuevoCliente()) =>
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[RUTA_VISTA]}>
        <Link to={RUTA_VISTA}>Sección Calificaciones</Link>
        <Routes>
          <Route
            path="/estudiante/clases/:claseId/calificaciones"
            element={<MisCalificacionesView />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
const pulsarLaSeccion = () => {
  const enlace = screen.getByRole("link", { name: "Sección Calificaciones" })
  act(() => enlace.focus())
  fireEvent.click(enlace)
  return enlace
}
const clienteConStaleDeLaApp = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } },
  })

describe("pulsar la sección «Calificaciones» estando en ella (T-08, CAL-1D04i a CAL-1D04m)", () => {
  it("CAL-1D04i: tras el 400 del cursor de «Ver más tareas», pulsar la sección pide la primera página una sola vez y pinta las tareas como están, sin el texto ni «Ver más tareas», sin aviso ni aria-busy, y el foco se queda en la sección", async () => {
    servidor.paginas.todas = [[tarea(1)], [tarea(2)]]
    servidor.manejador = (l) => (l.cursor !== null ? validacion("cursor: no es válido") : undefined)
    montarConSeccion(clienteConStaleDeLaApp())
    fireEvent.click(await screen.findByRole("button", { name: "Ver más tareas" }))
    expect(await screen.findByText(CURSOR)).toBeInTheDocument()
    await reposar()
    servidor.paginas.todas = [[tarea(1), tarea(3)]]
    const desde = llamadas.length
    const enlace = pulsarLaSeccion()
    expect(await screen.findByRole("link", { name: "Tarea 3" })).toBeInTheDocument()
    await reposar()
    expect(llamadas.slice(desde)).toHaveLength(1)
    expect(llamadas[desde]?.cursor).toBeNull()
    expect(screen.queryByText(CURSOR)).toBeNull()
    expect(screen.queryByRole("button", { name: "Ver más tareas" })).toBeNull()
    expect(document.querySelector("[aria-busy='true']")).toBeNull()
    expect(document.activeElement).toBe(enlace)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1D04j: con la lista sana y el filtro «Asignadas», pulsar la sección la vuelve a pedir con el mismo filtro una vez: dos pulsaciones con la petición en vuelo no la duplican, «Ver más tareas» espera mientras llega y al llegar no queda aria-busy ni aviso", async () => {
    servidor.paginas = { todas: [[tarea(1), tarea(2)]], asignadas: [[tarea(1)], [tarea(2)]] }
    montarConSeccion(clienteConStaleDeLaApp())
    await screen.findByRole("link", { name: "Tarea 2" })
    elegir("asignadas")
    await waitFor(() => expect(enlacesDeTarea()).toHaveLength(1))
    await reposar()
    const estadoDelFiltro = llamadas.at(-1)?.estado
    const retenida = diferido()
    servidor.manejador = () => retenida.promesa
    const desde = llamadas.length
    const enlace = pulsarLaSeccion()
    await waitFor(() => expect(llamadas.slice(desde)).toHaveLength(1))
    expect(screen.getByRole("button", { name: "Ver más tareas" })).toHaveAttribute(
      "aria-busy",
      "true",
    )
    pulsarLaSeccion()
    await reposar()
    expect(llamadas.slice(desde)).toHaveLength(1)
    await act(async () => {
      retenida.resolver(
        respuestaJson(200, {
          general: generalPuntos(),
          tareas: [tarea(1)],
          siguienteCursor: cursorDePagina(1),
        }),
      )
      await retenida.promesa
    })
    await waitFor(() => expect(document.querySelector("[aria-busy='true']")).toBeNull())
    await reposar()
    expect(llamadas.slice(desde)).toHaveLength(1)
    expect(llamadas[desde]?.cursor).toBeNull()
    expect(llamadas[desde]?.estado).toBe(estadoDelFiltro)
    expect(selector()).toHaveValue("asignadas")
    expect(enlacesDeTarea()).toHaveLength(1)
    expect(document.activeElement).toBe(enlace)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1D04k: con «Ver más tareas» en vuelo, pulsar la sección no la cancela ni pide otra; al llegar se agrega la página sin aviso y la guarda se libera", async () => {
    servidor.paginas.todas = [[tarea(1)], [tarea(2)], [tarea(3)]]
    montarConSeccion(clienteConStaleDeLaApp())
    const verMas = await screen.findByRole("button", { name: "Ver más tareas" })
    const retenida = diferido()
    servidor.manejador = (l) => (l.cursor !== null ? retenida.promesa : undefined)
    fireEvent.click(verMas)
    await waitFor(() => expect(llamadas.filter((l) => l.cursor !== null)).toHaveLength(1))
    const desde = llamadas.length
    pulsarLaSeccion()
    await reposar()
    expect(llamadas.slice(desde)).toHaveLength(0)
    await act(async () => {
      retenida.resolver(
        respuestaJson(200, {
          general: generalPuntos(),
          tareas: [tarea(2)],
          siguienteCursor: cursorDePagina(2),
        }),
      )
      await retenida.promesa
    })
    expect(await screen.findByRole("link", { name: "Tarea 2" })).toBeInTheDocument()
    await waitFor(() => expect(document.querySelector("[aria-busy='true']")).toBeNull())
    await reposar()
    expect(llamadas.slice(desde)).toHaveLength(0)
    servidor.manejador = () => undefined
    fireEvent.click(screen.getByRole("button", { name: "Ver más tareas" }))
    expect(await screen.findByRole("link", { name: "Tarea 3" })).toBeInTheDocument()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1D04l: con el genérico a la vista (5xx en la primera carga), pulsar la sección vuelve a pedir la primera página y pinta la lista, sin aviso", async () => {
    const estado = { falla: true }
    servidor.manejador = () => (estado.falla ? errorApi(503, "ERROR_INTERNO", "caído") : undefined)
    montarConSeccion(clienteConStaleDeLaApp())
    expect(await screen.findByText(GENERICO)).toBeInTheDocument()
    await reposar()
    estado.falla = false
    const desde = llamadas.length
    const enlace = pulsarLaSeccion()
    expect(await screen.findByRole("link", { name: "Tarea 1" })).toBeInTheDocument()
    await reposar()
    expect(llamadas.slice(desde)).toHaveLength(1)
    expect(screen.queryByText(GENERICO)).toBeNull()
    expect(document.activeElement).toBe(enlace)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-1D04m: mientras carga la primera página, pulsar la sección no pide otra: al llegar, una sola petición y la lista", async () => {
    const retenida = diferido()
    servidor.manejador = () => retenida.promesa
    montarConSeccion(clienteConStaleDeLaApp())
    await waitFor(() => expect(llamadas).toHaveLength(1))
    pulsarLaSeccion()
    await reposar()
    expect(llamadas).toHaveLength(1)
    await act(async () => {
      retenida.resolver(
        respuestaJson(200, { general: generalPuntos(), tareas: [tarea(1)], siguienteCursor: null }),
      )
      await retenida.promesa
    })
    expect(await screen.findByRole("link", { name: "Tarea 1" })).toBeInTheDocument()
    await reposar()
    expect(llamadas).toHaveLength(1)
    expect(document.querySelector("[aria-busy='true']")).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
  })
})
