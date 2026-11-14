import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { claveGradebook, clavePrefijoDeCalificaciones } from "@/services/calificacionesService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// CHORE-06b (§D-6, N-52; CH6-B14): la ventana vacía del gradebook ya no se sirve de la caché cuando la
// frase "La clase cambió…" estaba a la vista y la persona pulsa «Calificaciones», sale y vuelve, o salta
// a otra clase con el historial. Router real (`rutas` de app/router) y un QueryClient con las
// defaultOptions de app/providers.tsx. El escenario es el de CAL-T-248: dos cambios de la clase en menos
// de 30 s con el mismo cursor en la primera ventana nueva.

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
const CURSOR_TEXTO =
  "La clase cambió mientras veías las calificaciones. Vuelve a abrir Calificaciones para verlas completas."
const ALUMNOS_PRIMERA = [
  { id: uuid("6a6b3c4d", 301), nombre: "Ana Ruiz" },
  { id: uuid("6a6b3c4d", 302), nombre: "Beto Díaz" },
]
const ALUMNOS_SIGUIENTES = [{ id: uuid("6a6b3c4d", 303), nombre: "Carla Gómez" }]
const COLUMNA = {
  id: uuid("6a6b3c4d", 101),
  titulo: "Tarea 1",
  fechaLimite: FUTURA,
  puntos: 10,
  categoria: null,
}

const fila = (alumno: { id: string; nombre: string }) => ({
  alumno,
  celdas: [{ tareaId: COLUMNA.id, estado: "asignado", conRetraso: false, calificacion: null }],
  porcentaje: null,
  vencidasSinEntregar: 0,
  motivosDeRiesgo: [],
})

const ventana = (
  alumnos: { id: string; nombre: string }[],
  siguiente: string | null,
  total: number,
) => ({
  tareas: [COLUMNA],
  siguienteCursorTareas: null,
  alumnos: alumnos.map(fila),
  siguienteCursor: siguiente,
  resumen: { modo: "puntos", totalAlumnos: total, promedioDeLaClase: null, alumnosEnRiesgo: 0 },
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

interface Llamada {
  claseId: string
  cursor: string | null
}

// Etapa 0: la clase con dos ventanas. Etapa 1: salió el alumno del cursor (la ventana con cursor llega
// vacía y la primera ya no tiene siguiente). Etapa 2: llegó otro alumno y la primera vuelve a tener el
// mismo cursor; la ventana con cursor ya no está vacía.
let etapa = 0
let llamadas: Llamada[] = []

const gradebook = (claseId: string, cursor: string | null) => {
  if (claseId === B) return ventana(ALUMNOS_PRIMERA, null, 2)
  if (cursor !== null) {
    return etapa === 1 ? ventana([], null, 2) : ventana(ALUMNOS_SIGUIENTES, null, 3)
  }
  if (etapa === 1) return ventana(ALUMNOS_PRIMERA, null, 2)
  return ventana(ALUMNOS_PRIMERA, CURSOR_ALUMNOS, 3)
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
    llamadas.push({ claseId, cursor })
    return respuestaJson(200, gradebook(claseId, cursor))
  }
  if (sub === "dudas") return respuestaJson(200, { dudas: [], siguienteCursor: null })
  return respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } })
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

// Reloj fijo (solo Date): la frescura de la caché depende de Date.now() (CAL-T-191).
const AHORA = new Date("2030-01-10T12:00:00.000Z")

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  etapa = 0
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

const montar = async (entrada: string) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [entrada] })
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
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
const fila1 = () => screen.findByRole("row", { name: /^Ana Ruiz/ }, ESPERA)
const boton = (nombre: string) => screen.findByRole("button", { name: nombre }, ESPERA)
const desde = (indice: number, claseId = A) =>
  llamadas.slice(indice).filter((llamada) => llamada.claseId === claseId)

// La frase "La clase cambió…" a la vista en A: avanzar a la ventana que llega vacía (etapa 1).
const conLaFraseALaVista = async () => {
  await fila1()
  etapa = 1
  fireEvent.click(await boton("Alumnos siguientes"))
  await screen.findByText(CURSOR_TEXTO, {}, ESPERA)
  await reposar()
}

// Con la clase ya cambiada otra vez (etapa 2) y la primera ventana de nuevo con el cursor, «Alumnos
// siguientes» pide la ventana (una vez) y ya no dice la frase.
const avanzarPideLaVentana = async () => {
  await screen.findByText("3 alumnos", {}, ESPERA)
  await reposar()
  const i = llamadas.length
  fireEvent.click(await boton("Alumnos siguientes"))
  await waitFor(() => expect(desde(i)).toHaveLength(1), ESPERA)
  expect(desde(i)[0]?.cursor).toBe(CURSOR_ALUMNOS)
  expect(await screen.findByRole("row", { name: /^Carla Gómez/ }, ESPERA)).toBeInTheDocument()
  await reposar()
  expect(desde(i)).toHaveLength(1)
  expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
  expect(aviso.error).not.toHaveBeenCalled()
}

describe("CH6-B14 · N-52: la ventana vacía no se sirve de la caché", () => {
  it("CH6-B14 (a): con la frase a la vista, pulsar «Calificaciones»: «Alumnos siguientes» pide la ventana y, como ya no está vacía, la frase desaparece", async () => {
    const { router } = await montar(RUTA(A))
    await conLaFraseALaVista()
    etapa = 2
    await navegar(router, RUTA(A))
    await avanzarPideLaVentana()
  }, 20_000)

  it("CH6-B14 (b): con la frase a la vista, salir a otra sección y volver antes de 30 s: «Alumnos siguientes» pide la ventana y la frase desaparece", async () => {
    const { router } = await montar(RUTA(A))
    await conLaFraseALaVista()
    await navegar(router, `/maestro/clases/${A}/dudas`)
    await reposar()
    etapa = 2
    await navegar(router, RUTA(A))
    await avanzarPideLaVentana()
  }, 20_000)

  it("CH6-B14 (c): regresión de CAL-T-201: con la vista quieta y la caché fresca, regresar y volver a avanzar a la ventana vacía no la pide", async () => {
    await montar(RUTA(A))
    await fila1()
    etapa = 1
    fireEvent.click(await boton("Alumnos siguientes"))
    await screen.findByText(CURSOR_TEXTO, {}, ESPERA)
    // La primera ventana quedó vieja por T-07; al regresar se pide y vuelve a traer el cursor.
    etapa = 0
    fireEvent.click(await boton("Alumnos anteriores"))
    await fila1()
    await reposar()
    const i = llamadas.length
    fireEvent.click(await boton("Alumnos siguientes"))
    await screen.findByText(CURSOR_TEXTO, {}, ESPERA)
    await reposar()
    expect(desde(i).filter((llamada) => llamada.cursor !== null)).toHaveLength(0)
  }, 20_000)

  it("CH6-B14 (d): salto del historial de A, con la frase a la vista, a B: las ventanas de A quedan isInvalidated y las de B no; B pide solo su primera ventana y, al volver a A, «Alumnos siguientes» pide la ventana", async () => {
    const { router, cliente } = await montar(RUTA(B))
    await fila1()
    await navegar(router, RUTA(A))
    await conLaFraseALaVista()
    const i = llamadas.length
    await navegar(router, -1)
    await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
    await fila1()
    await reposar()
    const deA = cliente.getQueryCache().findAll({ queryKey: clavePrefijoDeCalificaciones(A) })
    expect(deA.length).toBeGreaterThan(0)
    for (const consulta of deA) expect(consulta.state.isInvalidated).toBe(true)
    const deB = cliente.getQueryCache().findAll({ queryKey: clavePrefijoDeCalificaciones(B) })
    expect(deB.length).toBeGreaterThan(0)
    for (const consulta of deB) expect(consulta.state.isInvalidated).toBe(false)
    const tras = llamadas.slice(i)
    expect(tras.every((llamada) => llamada.claseId === B && llamada.cursor === null)).toBe(true)
    expect(tras.length).toBeLessThanOrEqual(1)
    etapa = 2
    await navegar(router, 1)
    await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
    await avanzarPideLaVentana()
  }, 20_000)

  // (Enmienda 4b, M-01) El camino "otra ventana": la frase se vio en W, la persona regresó con «Alumnos
  // anteriores» (la frase desaparece y W queda fresca en la caché) y después hace lo que pide la frase.
  const W = (claseId: string) =>
    claveGradebook(claseId, { cursor: CURSOR_ALUMNOS, cursorTareas: null })
  const wInvalidada = (cliente: QueryClient, claseId = A) =>
    cliente.getQueryCache().find({ queryKey: W(claseId), exact: true })?.state.isInvalidated
  const espiarMarcas = (cliente: QueryClient) => {
    const espia = vi.spyOn(cliente, "invalidateQueries")
    return () =>
      espia.mock.calls.filter(
        ([filtro]) => (filtro as { refetchType?: string } | undefined)?.refetchType === "none",
      ).length
  }

  const fraseYRegreso = async () => {
    await conLaFraseALaVista()
    etapa = 2
    fireEvent.click(await boton("Alumnos anteriores"))
    await screen.findByText("3 alumnos", {}, ESPERA)
    await reposar()
    expect(screen.queryByText(CURSOR_TEXTO)).toBeNull()
  }

  it("CH6-B14 (f): tras ver la frase y regresar con «Alumnos anteriores», pulsar «Calificaciones» deja W isInvalidated; «Alumnos siguientes» la pide una vez y la frase no vuelve; otra pulsación ya con la tabla sana no marca nada", async () => {
    const { router, cliente } = await montar(RUTA(A))
    const marcas = espiarMarcas(cliente)
    await fraseYRegreso()
    await navegar(router, RUTA(A))
    await waitFor(() => expect(wInvalidada(cliente)).toBe(true), ESPERA)
    await avanzarPideLaVentana()
    const antes = marcas()
    await navegar(router, RUTA(A))
    await screen.findByText("3 alumnos", {}, ESPERA)
    await reposar()
    expect(marcas()).toBe(antes)
  }, 20_000)

  it("CH6-B14 (g): tras ver la frase y regresar con «Alumnos anteriores», ir a otra sección y volver antes de 30 s deja W isInvalidated; «Alumnos siguientes» la pide una vez y la frase no vuelve", async () => {
    const { router, cliente } = await montar(RUTA(A))
    await fraseYRegreso()
    await navegar(router, `/maestro/clases/${A}/dudas`)
    await reposar()
    expect(wInvalidada(cliente)).toBe(true)
    await navegar(router, RUTA(A))
    await avanzarPideLaVentana()
  }, 20_000)

  it("CH6-B14 (h): tras ver la frase en A y regresar con «Alumnos anteriores», saltar con el historial a B deja W de A isInvalidated; al regresar a A, «Alumnos siguientes» la pide una vez y la frase no vuelve", async () => {
    const { router, cliente } = await montar(RUTA(B))
    await fila1()
    await navegar(router, RUTA(A))
    await fraseYRegreso()
    await navegar(router, -1)
    await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
    await fila1()
    await reposar()
    expect(wInvalidada(cliente)).toBe(true)
    await navegar(router, 1)
    await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
    await avanzarPideLaVentana()
  }, 20_000)
})
