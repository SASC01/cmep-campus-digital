import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { StrictMode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { claveGradebook } from "@/services/calificacionesService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// CHORE-06b, ronda 1 del tester (ATQ-CH6-46 a ATQ-CH6-49). N-52 (§D-6, Enmiendas 4 y 4b) por la otra
// dimensión del gradebook (las tareas, `cursorTareas`), las dos dimensiones a la vez, una segunda
// ocurrencia de la frase después de marcar la primera y StrictMode. Router real (`rutas` de app/router)
// y un QueryClient con las defaultOptions de app/providers.tsx. El reloj (solo Date) se fija y avanza
// un segundo entre respuestas, como el tiempo real entre dos clics (cada respuesta, su dataUpdatedAt).

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const ESPERA = { timeout: 8000 }
const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const A = uuid("2a2b3c4d", 1)
const B = uuid("2a2b3c4d", 2)
const NOMBRES: Record<string, string> = { [A]: "Historia", [B]: "Geografía" }
const MAESTRO = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez" }
const FUTURA = "2030-01-15T16:00:00.000Z"
const CURSOR_ALUMNOS = uuid("6a6b3c4d", 960)
const CURSOR_TAREAS = uuid("6a6b3c4d", 970)
const CURSOR_TEXTO =
  "La clase cambió mientras veías las calificaciones. Vuelve a abrir Calificaciones para verlas completas."
const ALUMNOS_PRIMERA = [
  { id: uuid("6a6b3c4d", 301), nombre: "Ana Ruiz" },
  { id: uuid("6a6b3c4d", 302), nombre: "Beto Díaz" },
]
const ALUMNOS_SIGUIENTES = [{ id: uuid("6a6b3c4d", 303), nombre: "Carla Gómez" }]
const columna = (n: number) => ({
  id: uuid("6a6b3c4d", 100 + n),
  titulo: `Tarea ${String(n)}`,
  fechaLimite: FUTURA,
  puntos: 10,
  categoria: null,
})
const T1 = columna(1)
const T2 = columna(2)

type Columna = ReturnType<typeof columna>

const fila = (alumno: { id: string; nombre: string }, tareas: Columna[]) => ({
  alumno,
  celdas: tareas.map((tarea) => ({
    tareaId: tarea.id,
    estado: "asignado",
    conRetraso: false,
    calificacion: null,
  })),
  porcentaje: null,
  vencidasSinEntregar: 0,
  motivosDeRiesgo: [],
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

interface Llamada {
  claseId: string
  cursor: string | null
  cursorTareas: string | null
}

// Etapa por dimensión. 0: dos ventanas. 1: lo del cursor salió (la ventana con cursor llega vacía y la
// primera ya no tiene siguiente). 2: llegó otra cosa y la primera vuelve a tener el mismo cursor; la
// ventana con cursor ya no está vacía.
let etapaAlumnos = 0
let etapaTareas = 0
let llamadas: Llamada[] = []

const gradebook = (claseId: string, cursor: string | null, cursorTareas: string | null) => {
  const tareas = claseId === B || cursorTareas === null ? [T1] : etapaTareas === 1 ? [] : [T2]
  const siguienteCursorTareas =
    claseId === B || cursorTareas !== null || etapaTareas === 1 ? null : CURSOR_TAREAS
  let alumnos = ALUMNOS_PRIMERA
  if (claseId === A && cursor !== null) alumnos = etapaAlumnos === 1 ? [] : ALUMNOS_SIGUIENTES
  const siguienteCursor =
    claseId === B || cursor !== null || etapaAlumnos === 1 ? null : CURSOR_ALUMNOS
  return {
    tareas,
    siguienteCursorTareas,
    alumnos: alumnos.map((alumno) => fila(alumno, tareas)),
    siguienteCursor,
    resumen: {
      modo: "puntos",
      totalAlumnos: siguienteCursor === null && cursor === null ? 2 : 3,
      promedioDeLaClase: null,
      alumnosEnRiesgo: 0,
    },
  }
}

const responder = (url: URL): Response => {
  const ruta = url.pathname
  if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "otra" })
  if (ruta === "/api/me") {
    return respuestaJson(200, {
      id: uuid("4f4f3c4d", 1),
      nombre: "Ana López",
      email: "ana@ejemplo.mx",
      rol: "maestro",
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  if (ruta === "/api/clases/inscritas" || ruta === "/api/clases/impartidas") {
    return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
  }
  const [, , , claseId, sub] = ruta.split("/")
  if (claseId === undefined)
    return respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } })
  if (sub === undefined) {
    return respuestaJson(200, {
      clase: {
        id: claseId,
        nombre: NOMBRES[claseId] ?? "Clase",
        descripcion: null,
        maestro: MAESTRO,
        maestros: [MAESTRO],
        archivadaEn: null,
      },
    })
  }
  if (sub === "codigo") return respuestaJson(200, { codigo: "ABCDEFG" })
  if (sub === "gradebook") {
    const cursor = url.searchParams.get("cursor")
    const cursorTareas = url.searchParams.get("cursorTareas")
    llamadas.push({ claseId, cursor, cursorTareas })
    return respuestaJson(200, gradebook(claseId, cursor, cursorTareas))
  }
  if (sub === "dudas") return respuestaJson(200, { dudas: [], siguienteCursor: null })
  return respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } })
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

const AHORA = new Date("2030-01-10T12:00:00.000Z")
let segundos = 0
// Un segundo más en el reloj (solo Date): la siguiente respuesta tiene otro dataUpdatedAt.
const pasaUnSegundo = () => {
  segundos += 1
  vi.setSystemTime(new Date(AHORA.getTime() + segundos * 1000))
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  segundos = 0
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  etapaAlumnos = 0
  etapaTareas = 0
  llamadas = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) =>
      Promise.resolve().then(() => responder(new URL(String(entrada), "http://x"))),
    ),
  )
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.mockClear()
  aviso.error.mockClear()
})

const RUTA = (claseId: string) => `/maestro/clases/${claseId}/calificaciones`

const montar = async (entrada: string, estricto = false) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [entrada] })
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
  const arbol = (
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  render(estricto ? <StrictMode>{arbol}</StrictMode> : arbol)
  return { router, cliente }
}

type Enrutador = Awaited<ReturnType<typeof montar>>["router"]

const navegar = async (router: Enrutador, destino: string | number) => {
  await act(async () => {
    if (typeof destino === "number") await router.navigate(destino)
    else await router.navigate(destino)
  })
}

const reposar = (ms = 100) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))
const boton = (nombre: string) => screen.findByRole("button", { name: nombre }, ESPERA)
const desde = (indice: number, claseId = A) =>
  llamadas.slice(indice).filter((llamada) => llamada.claseId === claseId)
const columnaT1 = () => screen.findByRole("columnheader", { name: /^Tarea 1/ }, ESPERA)

const WT = (claseId = A) => claveGradebook(claseId, { cursor: null, cursorTareas: CURSOR_TAREAS })
const WA = (claseId = A) => claveGradebook(claseId, { cursor: CURSOR_ALUMNOS, cursorTareas: null })
const invalidada = (cliente: QueryClient, clave: readonly unknown[]) =>
  cliente.getQueryCache().find({ queryKey: clave, exact: true })?.state.isInvalidated
const espiarMarcas = (cliente: QueryClient) => {
  const espia = vi.spyOn(cliente, "invalidateQueries")
  return () =>
    espia.mock.calls.filter(
      ([filtro]) => (filtro as { refetchType?: string } | undefined)?.refetchType === "none",
    ).length
}

// La frase a la vista en la ventana de tareas WT (etapa 1 de las tareas) y el regreso con «Tareas más
// recientes» (la frase desaparece y WT queda fresca en la caché); después la clase cambia otra vez.
const fraseDeTareasYRegreso = async () => {
  await columnaT1()
  etapaTareas = 1
  pasaUnSegundo()
  fireEvent.click(await boton("Tareas más antiguas"))
  await screen.findByText(CURSOR_TEXTO, {}, ESPERA)
  await reposar()
  etapaTareas = 2
  pasaUnSegundo()
  fireEvent.click(await boton("Tareas más recientes"))
  await columnaT1()
  await reposar()
  expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
}

// «Tareas más antiguas» pide WT una vez y, como ya no está vacía, aparece «Tarea 2» y la frase no vuelve.
const antiguasPideLaVentana = async () => {
  await columnaT1()
  await reposar()
  const i = llamadas.length
  pasaUnSegundo()
  fireEvent.click(await boton("Tareas más antiguas"))
  await waitFor(() => expect(desde(i)).toHaveLength(1), ESPERA)
  expect(desde(i)[0]?.cursorTareas).toBe(CURSOR_TAREAS)
  expect(await screen.findByRole("columnheader", { name: /^Tarea 2/ }, ESPERA)).toBeInTheDocument()
  await reposar()
  expect(desde(i)).toHaveLength(1)
  expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
  expect(aviso.error).not.toHaveBeenCalled()
}

describe("ATQ-CH6-46 · N-52 por la dimensión de las tareas (cursorTareas)", () => {
  it("ATQ-CH6-46 (f): tras ver la frase en la ventana de tareas y regresar, pulsar «Calificaciones» deja WT isInvalidated; «Tareas más antiguas» la pide una vez y la frase no vuelve", async () => {
    const { router, cliente } = await montar(RUTA(A))
    await fraseDeTareasYRegreso()
    await navegar(router, RUTA(A))
    await waitFor(() => expect(invalidada(cliente, WT())).toBe(true), ESPERA)
    await antiguasPideLaVentana()
  }, 25_000)

  it("ATQ-CH6-46 (g): tras ver la frase en la ventana de tareas y regresar, ir a otra sección y volver antes de 30 s deja WT isInvalidated; «Tareas más antiguas» la pide una vez", async () => {
    const { router, cliente } = await montar(RUTA(A))
    await fraseDeTareasYRegreso()
    await navegar(router, `/maestro/clases/${A}/dudas`)
    await reposar()
    expect(invalidada(cliente, WT())).toBe(true)
    await navegar(router, RUTA(A))
    await antiguasPideLaVentana()
  }, 25_000)

  it("ATQ-CH6-46 (h): tras ver la frase de tareas en A y regresar, saltar con el historial a B y volver a A: WT de A queda isInvalidated y «Tareas más antiguas» la pide una vez", async () => {
    const { router, cliente } = await montar(RUTA(B))
    await columnaT1()
    await navegar(router, RUTA(A))
    await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
    await fraseDeTareasYRegreso()
    await navegar(router, -1)
    await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
    await columnaT1()
    await reposar()
    expect(invalidada(cliente, WT())).toBe(true)
    expect(invalidada(cliente, WT(B))).not.toBe(true)
    await navegar(router, 1)
    await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
    await antiguasPideLaVentana()
  }, 25_000)
})

describe("ATQ-CH6-47 · las dos dimensiones a la vez", () => {
  it("ATQ-CH6-47: la frase se ve en la ventana de alumnos y después en la de tareas (con regreso en las dos); una sola pulsación de «Calificaciones» deja las dos ventanas isInvalidated y cada una se pide de nuevo al avanzar", async () => {
    const { router, cliente } = await montar(RUTA(A))
    await columnaT1()
    etapaAlumnos = 1
    pasaUnSegundo()
    fireEvent.click(await boton("Alumnos siguientes"))
    await screen.findByText(CURSOR_TEXTO, {}, ESPERA)
    await reposar()
    etapaAlumnos = 2
    pasaUnSegundo()
    fireEvent.click(await boton("Alumnos anteriores"))
    await screen.findByRole("row", { name: /^Ana Ruiz/ }, ESPERA)
    await reposar()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
    await fraseDeTareasYRegreso()
    const marcas = espiarMarcas(cliente)
    await navegar(router, RUTA(A))
    await waitFor(() => expect(invalidada(cliente, WT())).toBe(true), ESPERA)
    expect(invalidada(cliente, WA())).toBe(true)
    await reposar()
    expect(marcas()).toBe(1)
    await antiguasPideLaVentana()
    fireEvent.click(await boton("Tareas más recientes"))
    await columnaT1()
    await reposar()
    const i = llamadas.length
    pasaUnSegundo()
    fireEvent.click(await boton("Alumnos siguientes"))
    await waitFor(
      () => expect(desde(i).some((l) => l.cursor === CURSOR_ALUMNOS)).toBe(true),
      ESPERA,
    )
    expect(await screen.findByRole("row", { name: /^Carla Gómez/ }, ESPERA)).toBeInTheDocument()
    await reposar()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
  }, 25_000)
})

describe("ATQ-CH6-48 · una segunda ocurrencia después de marcar la primera", () => {
  it("ATQ-CH6-48: la frase se ve, se regresa y se pulsa (primera marca); al avanzar, la ventana vuelve a llegar vacía (otra ocurrencia), se regresa y se pulsa otra vez: se marca de nuevo y «Tareas más antiguas» pide la ventana, sin servirla de la caché", async () => {
    const { router, cliente } = await montar(RUTA(A))
    const marcas = espiarMarcas(cliente)
    await columnaT1()
    etapaTareas = 1
    pasaUnSegundo()
    fireEvent.click(await boton("Tareas más antiguas"))
    await screen.findByText(CURSOR_TEXTO, {}, ESPERA)
    await reposar()
    // Primer regreso y pulsación: la primera ventana sigue sin siguiente (etapa 1), así que la clase
    // vuelve a cambiar para que «Tareas más antiguas» reaparezca.
    etapaTareas = 0
    pasaUnSegundo()
    fireEvent.click(await boton("Tareas más recientes"))
    await columnaT1()
    await reposar()
    const antesDeLaPrimera = marcas()
    pasaUnSegundo()
    await navegar(router, RUTA(A))
    await waitFor(() => expect(invalidada(cliente, WT())).toBe(true), ESPERA)
    await reposar()
    expect(marcas()).toBe(antesDeLaPrimera + 1)
    // Segunda ocurrencia: la ventana se pide de nuevo y vuelve a llegar vacía.
    await columnaT1()
    etapaTareas = 1
    const i = llamadas.length
    pasaUnSegundo()
    fireEvent.click(await boton("Tareas más antiguas"))
    await waitFor(
      () => expect(desde(i).some((l) => l.cursorTareas === CURSOR_TAREAS)).toBe(true),
      ESPERA,
    )
    await screen.findByText(CURSOR_TEXTO, {}, ESPERA)
    await reposar()
    etapaTareas = 2
    pasaUnSegundo()
    fireEvent.click(await boton("Tareas más recientes"))
    await columnaT1()
    await reposar()
    const antesDeLaSegunda = marcas()
    pasaUnSegundo()
    await navegar(router, RUTA(A))
    await waitFor(() => expect(invalidada(cliente, WT())).toBe(true), ESPERA)
    await reposar()
    expect(marcas()).toBe(antesDeLaSegunda + 1)
    await antiguasPideLaVentana()
  }, 25_000)
})

describe("ATQ-CH6-49 · StrictMode en el gradebook", () => {
  it("ATQ-CH6-49: con StrictMode, la frase de tareas vista y el regreso; pulsar «Calificaciones» marca WT y «Tareas más antiguas» la pide una sola vez, sin aviso", async () => {
    const { router, cliente } = await montar(RUTA(A), true)
    await fraseDeTareasYRegreso()
    await navegar(router, RUTA(A))
    await waitFor(() => expect(invalidada(cliente, WT())).toBe(true), ESPERA)
    await antiguasPideLaVentana()
  }, 25_000)
})
