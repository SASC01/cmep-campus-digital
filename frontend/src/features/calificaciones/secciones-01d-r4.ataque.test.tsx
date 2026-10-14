import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { StrictMode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Tester, ronda 4 cerrada de CALIFICACIONES-01d: pasada mínima sobre pulsar la sección activa
// («Calificaciones» estando en ella) y sus vecinos, con el router real: StrictMode, historial entre dos
// location.key de la misma ruta, el modal abierto, el foco dentro de la vista al pulsar (el clic que no
// enfoca el enlace), el filtro conservado, dos pulsaciones con la petición retenida y las marcas de
// useMarcarViejoElGradebook. La QueryClient lleva el staleTime y el refetchOnWindowFocus de
// app/providers.tsx (retry en false). Reloj fijo en todas (solo Date).

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const CLASE_A = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ALUMNO_1 = "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0301"
const ALUMNO_2 = "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0302"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const CURSOR_GRADEBOOK =
  "La clase cambió mientras veías las calificaciones. Vuelve a abrir Calificaciones para verlas completas."
const CURSOR_MIS =
  "Tus tareas cambiaron mientras las veías. Vuelve a abrir Calificaciones para verlas completas."
const RUTA_MAESTRO = `/maestro/clases/${CLASE_A}/calificaciones`
const RUTA_ALUMNO = `/estudiante/clases/${CLASE_A}/calificaciones`

type Rol = "estudiante" | "maestro"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const cursorInvalido = () =>
  respuestaJson(400, { error: { codigo: "VALIDACION", mensaje: "cursor: no es válido" } })

const me = (rol: Rol) => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol,
  debeCambiarContrasena: false,
  accesoRestringido: false,
})

const columna = {
  id: TAREA_ID,
  titulo: "Ensayo final",
  fechaLimite: FUTURA,
  puntos: 10,
  categoria: null,
}
const filaDe = (id: string, nombre: string) => ({
  alumno: { id, nombre },
  celdas: [{ tareaId: TAREA_ID, estado: "calificado", conRetraso: false, calificacion: 9 }],
  porcentaje: 90,
  vencidasSinEntregar: 0,
  motivosDeRiesgo: [],
})
const resumen = (total: number) => ({
  modo: "puntos",
  totalAlumnos: total,
  promedioDeLaClase: 90,
  alumnosEnRiesgo: 0,
})
// Primera ventana: antes del cambio, 1 de 2 alumnos con «Alumnos siguientes»; después, la clase completa.
const primeraVentana = (cambio: boolean) => ({
  tareas: [columna],
  siguienteCursorTareas: null,
  alumnos: [filaDe(ALUMNO_1, "Ana Ruiz")],
  siguienteCursor: cambio ? null : ALUMNO_1,
  resumen: resumen(cambio ? 1 : 2),
})
const segundaVentana = {
  tareas: [columna],
  siguienteCursorTareas: null,
  alumnos: [filaDe(ALUMNO_2, "Carla Gómez")],
  siguienteCursor: null,
  resumen: resumen(2),
}

const general = {
  modo: "puntos",
  porcentaje: 90,
  puntos: { obtenido: 9, posible: 10, tareas: 1 },
  categorias: [],
  sinCategoria: { tareas: 0 },
}
const primeraPaginaMia = (cambio: boolean) => ({
  general,
  tareas: [
    {
      id: TAREA_ID,
      titulo: "Ensayo final",
      fechaLimite: FUTURA,
      puntos: 10,
      categoria: null,
      entrega: { estado: "calificado", conRetraso: false, calificacion: 9 },
    },
  ],
  siguienteCursor: cambio ? null : TAREA_ID,
})

const estado = {
  rol: "maestro" as Rol,
  cambio: false,
  cursorGradebook: "sano" as "sano" | "400",
}
let llamadas: string[] = []
// Si devuelve una promesa, la petición queda retenida hasta resolverla.
let retener: ((ruta: string) => Promise<Response> | undefined) | null = null

const instalarServidor = () => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => {
    const ruta = String(entrada)
    llamadas.push(ruta)
    const retenida = retener?.(ruta)
    if (retenida !== undefined) return retenida
    const url = new URL(ruta, "http://local")
    if (ruta === "/api/auth/refrescar") {
      return Promise.resolve(respuestaJson(200, { tokenAcceso: "restaurado" }))
    }
    if (ruta === "/api/me") return Promise.resolve(respuestaJson(200, me(estado.rol)))
    if (url.pathname === "/api/clases/impartidas") {
      return Promise.resolve(
        respuestaJson(200, {
          clases: [{ id: CLASE_A, nombre: "Álgebra I", alumnos: 2 }],
          total: 1,
          siguienteCursor: null,
        }),
      )
    }
    if (url.pathname === "/api/clases/inscritas") {
      return Promise.resolve(
        respuestaJson(200, {
          clases: [{ id: CLASE_A, nombre: "Álgebra I", maestro: MAESTRO, maestros: [MAESTRO] }],
          total: 1,
          siguienteCursor: null,
        }),
      )
    }
    if (url.pathname === `/api/clases/${CLASE_A}`) {
      return Promise.resolve(
        respuestaJson(200, {
          clase: {
            id: CLASE_A,
            nombre: "Álgebra I",
            descripcion: null,
            maestro: MAESTRO,
            maestros: [MAESTRO],
          },
        }),
      )
    }
    if (url.pathname === `/api/clases/${CLASE_A}/gradebook`) {
      if (url.searchParams.get("cursor") === null) {
        return Promise.resolve(respuestaJson(200, primeraVentana(estado.cambio)))
      }
      if (estado.cursorGradebook === "400") return Promise.resolve(cursorInvalido())
      return Promise.resolve(respuestaJson(200, segundaVentana))
    }
    if (url.pathname === `/api/clases/${CLASE_A}/mis-calificaciones`) {
      if (url.searchParams.get("cursor") === null) {
        return Promise.resolve(respuestaJson(200, primeraPaginaMia(estado.cambio)))
      }
      return Promise.resolve(cursorInvalido())
    }
    return Promise.resolve(
      respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } }),
    )
  })
  vi.stubGlobal("fetch", fetchMock)
}

interface Montaje {
  entradas?: string[]
  estricto?: boolean
}

const renderEn = async (ruta: string, montaje: Montaje = {}) => {
  const { rutas } = await import("@/app/router")
  const entradas = montaje.entradas ?? [ruta]
  const router = createMemoryRouter(rutas, {
    initialEntries: entradas,
    initialIndex: entradas.length - 1,
  })
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 },
    },
  })
  const espia = vi.spyOn(queryClient, "invalidateQueries")
  const arbol = (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  render(montaje.estricto === true ? <StrictMode>{arbol}</StrictMode> : arbol)
  return { router, espia }
}

const seccion = async (nombre: string) =>
  within(await screen.findByRole("list", { name: "Secciones de la clase" })).getByRole("link", {
    name: nombre,
  })
// Como en el navegador: el enlace toma el foco y después recibe el clic.
const pulsarCalificaciones = async () => {
  const enlace = await seccion("Calificaciones")
  expect(enlace).toHaveAttribute("aria-current", "page")
  act(() => enlace.focus())
  fireEvent.click(enlace)
  return enlace
}
const esperarTabla = () =>
  screen.findByRole("table", { name: "Calificaciones por alumno y tarea" }, { timeout: 5_000 })
const esperarMisTareas = () =>
  screen.findByRole("link", { name: "Ensayo final" }, { timeout: 5_000 })
const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 8; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}
const sinCursor = (r: string) => !new URL(r, "http://local").searchParams.has("cursor")
const delGradebook = (desde: number) =>
  llamadas.slice(desde).filter((r) => r.includes(`/${CLASE_A}/gradebook?`))
const mias = (desde: number) =>
  llamadas.slice(desde).filter((r) => r.includes(`/${CLASE_A}/mis-calificaciones?`))
const marcasViejas = (espia: { mock: { calls: unknown[][] } }) =>
  espia.mock.calls.filter((llamada) => {
    const filtros = llamada[0] as { refetchType?: string } | undefined
    return filtros?.refetchType === "none"
  })
const focoSano = () => {
  const activo = document.activeElement
  expect(activo).not.toBeNull()
  expect(activo).not.toBe(document.body)
  expect(activo?.isConnected).toBe(true)
}
const diferido = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  vi.resetModules()
  estado.rol = "maestro"
  estado.cambio = false
  estado.cursorGradebook = "sano"
  llamadas = []
  retener = null
  instalarServidor()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("Pulsar la sección activa en StrictMode (main.tsx monta la app así)", () => {
  it("CAL-T-253: gradebook en StrictMode con el 400 del cursor: el montaje pide la primera ventana una vez y pulsar la sección la pide una vez más, sin aviso, sin aria-busy y con el foco en la sección", async () => {
    estado.cursorGradebook = "400"
    await renderEn(RUTA_MAESTRO, { estricto: true })
    await esperarTabla()
    await reposar()
    expect(delGradebook(0).filter(sinCursor)).toHaveLength(1)
    estado.cambio = true
    fireEvent.click(screen.getByRole("button", { name: "Alumnos siguientes" }))
    expect(await screen.findByText(CURSOR_GRADEBOOK)).toBeInTheDocument()
    await reposar()
    const desde = llamadas.length
    const enlace = await pulsarCalificaciones()
    await waitFor(() => expect(screen.getByText("1 alumno")).toBeInTheDocument())
    await reposar()
    expect(delGradebook(desde)).toHaveLength(1)
    expect(delGradebook(desde).filter(sinCursor)).toHaveLength(1)
    expect(screen.queryByText(CURSOR_GRADEBOOK)).toBeNull()
    expect(document.querySelector("[aria-busy='true']")).toBeNull()
    expect(document.activeElement).toBe(enlace)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-T-254: «Mis calificaciones» en StrictMode con el 400 de «Ver más tareas»: pulsar la sección pide la primera página una sola vez, sin aviso y con el foco en la sección", async () => {
    estado.rol = "estudiante"
    await renderEn(RUTA_ALUMNO, { estricto: true })
    await esperarMisTareas()
    await reposar()
    expect(mias(0)).toHaveLength(1)
    estado.cambio = true
    fireEvent.click(screen.getByRole("button", { name: "Ver más tareas" }))
    expect(await screen.findByText(CURSOR_MIS)).toBeInTheDocument()
    await reposar()
    const desde = llamadas.length
    const enlace = await pulsarCalificaciones()
    await waitFor(() => expect(screen.queryByText(CURSOR_MIS)).toBeNull())
    await reposar()
    expect(mias(desde)).toHaveLength(1)
    expect(mias(desde).filter(sinCursor)).toHaveLength(1)
    expect(screen.getByRole("link", { name: "Ensayo final" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ver más tareas" })).toBeNull()
    expect(document.activeElement).toBe(enlace)
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("Historial entre dos location.key de la misma ruta (el NavLink a la misma URL reemplaza la entrada)", () => {
  it("CAL-T-255: atrás y adelante entre dos entradas de la misma ruta del gradebook: la vista no se remonta, cada paso vuelve a la primera ventana sin pilas con una sola petición, sin aviso", async () => {
    const { router } = await renderEn(RUTA_MAESTRO, { entradas: [RUTA_MAESTRO, RUTA_MAESTRO] })
    await esperarTabla()
    const encabezado = screen.getByRole("heading", { name: "Calificaciones", level: 2 })
    fireEvent.click(screen.getByRole("button", { name: "Alumnos siguientes" }))
    expect(await screen.findByRole("row", { name: /^Carla Gómez/ })).toBeInTheDocument()
    await reposar()
    let desde = llamadas.length
    await act(async () => {
      await router.navigate(-1)
    })
    expect(await screen.findByRole("row", { name: /^Ana Ruiz/ })).toBeInTheDocument()
    await reposar()
    expect(delGradebook(desde)).toHaveLength(1)
    expect(delGradebook(desde).filter(sinCursor)).toHaveLength(1)
    expect(screen.queryByRole("button", { name: "Alumnos anteriores" })).toBeNull()
    expect(screen.getByRole("heading", { name: "Calificaciones", level: 2 })).toBe(encabezado)
    desde = llamadas.length
    await act(async () => {
      await router.navigate(1)
    })
    await reposar()
    expect(delGradebook(desde)).toHaveLength(1)
    expect(document.querySelector("[aria-busy='true']")).toBeNull()
    focoSano()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-T-256: con «Ver cálculo» abierto, atrás a otra entrada de la misma ruta de «Mis calificaciones» recarga una vez sin cerrar el modal ni sacar el foco de él", async () => {
    estado.rol = "estudiante"
    const { router } = await renderEn(RUTA_ALUMNO, { entradas: [RUTA_ALUMNO, RUTA_ALUMNO] })
    await esperarMisTareas()
    fireEvent.click(screen.getByRole("button", { name: "Ver cálculo" }))
    const dialogo = await screen.findByRole("dialog", { name: "Cálculo de tu calificación" })
    await reposar()
    expect(dialogo.contains(document.activeElement)).toBe(true)
    const desde = llamadas.length
    await act(async () => {
      await router.navigate(-1)
    })
    await reposar()
    expect(mias(desde)).toHaveLength(1)
    expect(screen.getByRole("dialog", { name: "Cálculo de tu calificación" })).toBe(dialogo)
    expect(dialogo.contains(document.activeElement)).toBe(true)
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("Vecinos del mecanismo", () => {
  it("CAL-T-257: el clic que no enfoca el enlace (el foco sigue en «Alumnos anteriores», que desaparece al volver a la primera ventana) deja el foco en la vista, nunca en <body>", async () => {
    await renderEn(RUTA_MAESTRO)
    await esperarTabla()
    fireEvent.click(screen.getByRole("button", { name: "Alumnos siguientes" }))
    expect(await screen.findByRole("row", { name: /^Carla Gómez/ })).toBeInTheDocument()
    await reposar()
    const anteriores = screen.getByRole("button", { name: "Alumnos anteriores" })
    act(() => anteriores.focus())
    expect(document.activeElement).toBe(anteriores)
    fireEvent.click(await seccion("Calificaciones"))
    expect(await screen.findByRole("row", { name: /^Ana Ruiz/ })).toBeInTheDocument()
    await reposar()
    expect(screen.queryByRole("button", { name: "Alumnos anteriores" })).toBeNull()
    focoSano()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("CAL-T-258: las marcas viejas de useMarcarViejoElGradebook: el 400 marca una vez y pulsar la sección dos veces (con el texto y con la tabla sana) no agrega ninguna", async () => {
    estado.cursorGradebook = "400"
    const { espia } = await renderEn(RUTA_MAESTRO)
    await esperarTabla()
    await reposar()
    expect(marcasViejas(espia)).toHaveLength(0)
    estado.cambio = true
    fireEvent.click(screen.getByRole("button", { name: "Alumnos siguientes" }))
    expect(await screen.findByText(CURSOR_GRADEBOOK)).toBeInTheDocument()
    await reposar()
    const marcas = marcasViejas(espia).length
    expect(marcas).toBe(1)
    await pulsarCalificaciones()
    await waitFor(() => expect(screen.getByText("1 alumno")).toBeInTheDocument())
    await reposar()
    await pulsarCalificaciones()
    await reposar()
    expect(marcasViejas(espia)).toHaveLength(marcas)
    expect(document.querySelector("[aria-busy='true']")).toBeNull()
  })

  it("CAL-T-259: con el filtro «Calificadas» y el 400 de «Ver más tareas», dos pulsaciones con la primera página retenida piden una sola, con el mismo filtro; el selector lo conserva y al llegar no queda aria-busy ni aviso", async () => {
    estado.rol = "estudiante"
    await renderEn(RUTA_ALUMNO)
    await esperarMisTareas()
    fireEvent.change(screen.getByLabelText("Mostrar"), { target: { value: "calificadas" } })
    await waitFor(() => expect(mias(0).some((r) => r.includes("estado=calificadas"))).toBe(true))
    expect(await screen.findByRole("button", { name: "Ver más tareas" })).toBeInTheDocument()
    await reposar()
    estado.cambio = true
    fireEvent.click(screen.getByRole("button", { name: "Ver más tareas" }))
    expect(await screen.findByText(CURSOR_MIS)).toBeInTheDocument()
    await reposar()
    const retenida = diferido()
    retener = (ruta) =>
      ruta.includes("/mis-calificaciones?") && sinCursor(ruta) ? retenida.promesa : undefined
    const desde = llamadas.length
    const enlace = await pulsarCalificaciones()
    await waitFor(() => expect(mias(desde)).toHaveLength(1))
    await pulsarCalificaciones()
    await reposar()
    expect(mias(desde)).toHaveLength(1)
    await act(async () => {
      retenida.resolver(respuestaJson(200, primeraPaginaMia(true)))
      await retenida.promesa
    })
    await waitFor(() => expect(screen.queryByText(CURSOR_MIS)).toBeNull())
    await reposar()
    expect(mias(desde)).toHaveLength(1)
    const pedida = new URL(mias(desde)[0] ?? "", "http://local")
    expect(pedida.searchParams.get("estado")).toBe("calificadas")
    expect(pedida.searchParams.has("cursor")).toBe(false)
    expect(screen.getByLabelText("Mostrar")).toHaveValue("calificadas")
    expect(screen.queryByRole("button", { name: "Ver más tareas" })).toBeNull()
    expect(document.querySelector("[aria-busy='true']")).toBeNull()
    expect(document.activeElement).toBe(enlace)
    expect(aviso.error).not.toHaveBeenCalled()
  })
})
