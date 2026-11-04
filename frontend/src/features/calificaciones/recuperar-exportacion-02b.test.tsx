import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// CALIFICACIONES-02b (CAL2-B13): las dos frases de recuperación de «Exportar a Excel», cada una por
// cada camino con que la persona puede volver a intentarlo, con el router real (rutas de app/router),
// la QueryClient de app/providers.tsx (retry 1, refetchOnWindowFocus false, staleTime 30 s) y el
// Toaster de components/ui/sonner. En cada camino, el intento siguiente vuelve a pedir a la red desde
// la primera ventana (sin cursores), descarga y la frase ya no está. Reloj fijo (solo Date).

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
vi.mock("@/services/descargaService", () => ({ descargarArchivo: vi.fn() }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const CLASE = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const uuid = (n: number) => `6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`
const MAESTRO = { id: uuid(9), nombre: "Luis Pérez" }
const RUTA = `/maestro/clases/${CLASE}/calificaciones`
const RUTA_PERSONAS = `/maestro/clases/${CLASE}/personas`
const EXPORTACION = `/api/clases/${CLASE}/calificaciones/exportacion`
const GRADEBOOK = `/api/clases/${CLASE}/gradebook`

const CAMBIO = "Las calificaciones cambiaron mientras preparábamos el archivo. Inténtalo de nuevo."
const GENERICO = "No pudimos preparar el archivo de calificaciones. Inténtalo de nuevo."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const T1 = { id: uuid(101), titulo: "Ensayo", fechaLimite: FUTURA, puntos: 10, categoria: null }
const T2 = { id: uuid(102), titulo: "Examen", fechaLimite: FUTURA, puntos: 10, categoria: null }
const A1 = { id: uuid(301), nombre: "Ana Ruiz" }
const A2 = { id: uuid(302), nombre: "Carla Gómez" }

const filaDelGradebook = (alumno: { id: string; nombre: string }, tareas: { id: string }[]) => ({
  alumno,
  celdas: tareas.map((t) => ({
    tareaId: t.id,
    estado: "calificado",
    conRetraso: false,
    calificacion: 9,
  })),
  porcentaje: 90,
  vencidasSinEntregar: 0,
  motivosDeRiesgo: [],
})

// Ventanas de 1 × 1 del gradebook: «Alumnos siguientes» y «Tareas más antiguas» al inicio.
const ventanaDelGradebook = (cursor: string | null, cursorTareas: string | null) => {
  const tareas = cursorTareas === null ? [T1] : [T2]
  const alumno = cursor === null ? A1 : A2
  return {
    tareas,
    siguienteCursorTareas: cursorTareas === null ? T1.id : null,
    alumnos: [filaDelGradebook(alumno, tareas)],
    siguienteCursor: cursor === null ? A1.id : null,
    resumen: { modo: "puntos", totalAlumnos: 2, promedioDeLaClase: 90, alumnosEnRiesgo: 0 },
  }
}

const exportacionCompleta = {
  clase: { nombre: "Álgebra I" },
  tareas: [T1, T2],
  siguienteCursorTareas: null,
  totalTareas: 2,
  alumnos: [A1, A2].map((a, i) => ({
    alumno: { ...a, email: `alumno${String(i)}@ejemplo.mx` },
    celdas: [T1, T2].map((t) => ({
      tareaId: t.id,
      estado: "calificado",
      conRetraso: false,
      calificacion: 9,
    })),
    porcentaje: 90,
  })),
  siguienteCursor: null,
  totalAlumnos: 2,
}

let llamadas: string[] = []
// Lo que responde cada intento de exportar, en orden; después, la exportación completa.
let intentos: (() => Response)[] = []

const instalarServidor = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) => {
      const ruta = String(entrada)
      llamadas.push(ruta)
      const url = new URL(ruta, "http://local")
      if (ruta === "/api/auth/refrescar") {
        return Promise.resolve(respuestaJson(200, { tokenAcceso: "restaurado" }))
      }
      if (ruta === "/api/me") {
        return Promise.resolve(
          respuestaJson(200, {
            id: MAESTRO.id,
            nombre: MAESTRO.nombre,
            email: "luis@ejemplo.mx",
            rol: "maestro",
            debeCambiarContrasena: false,
            accesoRestringido: false,
          }),
        )
      }
      if (url.pathname === "/api/clases/impartidas") {
        return Promise.resolve(
          respuestaJson(200, {
            clases: [{ id: CLASE, nombre: "Álgebra I", alumnos: 2 }],
            total: 1,
            siguienteCursor: null,
          }),
        )
      }
      if (url.pathname === `/api/clases/${CLASE}`) {
        return Promise.resolve(
          respuestaJson(200, {
            clase: {
              id: CLASE,
              nombre: "Álgebra I",
              descripcion: null,
              maestro: MAESTRO,
              maestros: [MAESTRO],
            },
          }),
        )
      }
      if (url.pathname === `/api/clases/${CLASE}/alumnos`) {
        return Promise.resolve(respuestaJson(200, { alumnos: [], total: 0, siguienteCursor: null }))
      }
      if (url.pathname === GRADEBOOK) {
        return Promise.resolve(
          respuestaJson(
            200,
            ventanaDelGradebook(
              url.searchParams.get("cursor"),
              url.searchParams.get("cursorTareas"),
            ),
          ),
        )
      }
      if (url.pathname === EXPORTACION) {
        const siguiente = intentos.shift()
        return Promise.resolve(siguiente ? siguiente() : respuestaJson(200, exportacionCompleta))
      }
      return Promise.resolve(errorApi(500, "ERROR_INTERNO", `no esperada: ${ruta}`))
    }),
  )
}

const renderEn = async (entradas: string[]) => {
  const { rutas } = await import("@/app/router")
  const { Toaster } = await import("@/components/ui/sonner")
  const { descargarArchivo } = await import("@/services/descargaService")
  vi.mocked(descargarArchivo).mockClear()
  const router = createMemoryRouter(rutas, {
    initialEntries: entradas,
    initialIndex: entradas.length - 1,
  })
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  )
  return { router, descargas: vi.mocked(descargarArchivo) }
}

const esperarTabla = () =>
  screen.findByRole("table", { name: "Calificaciones por alumno y tarea" }, { timeout: 5_000 })
const botonExportar = () => screen.getByRole("button", { name: "Exportar a Excel" })
const exportaciones = () => llamadas.filter((r) => r.startsWith(`${EXPORTACION}?`))
const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 8; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}
const seccion = async (nombre: string) =>
  within(await screen.findByRole("list", { name: "Secciones de la clase" })).getByRole("link", {
    name: nombre,
  })

const exportar = async () => {
  await waitFor(() => expect(botonExportar()).not.toHaveAttribute("aria-busy"))
  fireEvent.click(botonExportar())
  await waitFor(() => expect(botonExportar()).not.toHaveAttribute("aria-busy"))
  await reposar()
}

// El primer intento falla con la frase; devuelve cuántas exportaciones se habían pedido.
const fallarCon = async (frase: string) => {
  intentos.push(
    frase === CAMBIO
      ? () => errorApi(400, "VALIDACION", "cursor: no es válido")
      : () => errorApi(500, "ERROR_INTERNO", "falla"),
  )
  await exportar()
  expect(await screen.findByText(frase)).toBeInTheDocument()
  return exportaciones().length
}

// El intento siguiente pidió a la red desde la primera ventana, descargó y la frase se fue.
const comprobarElReintento = async (
  frase: string,
  antes: number,
  descargas: { mock: { calls: unknown[] } },
) => {
  const nuevas = exportaciones().slice(antes)
  expect(nuevas.length).toBeGreaterThan(0)
  const primera = new URL(nuevas[0] ?? "", "http://local").searchParams
  expect(primera.has("cursor")).toBe(false)
  expect(primera.has("cursorTareas")).toBe(false)
  expect(descargas.mock.calls).toHaveLength(1)
  await waitFor(() => expect(screen.queryByText(frase)).toBeNull())
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  vi.resetModules()
  llamadas = []
  intentos = []
  instalarServidor()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe.each([
  ["cambio", CAMBIO],
  ["genérico", GENERICO],
])("frase de recuperación «%s» (CAL2-B13)", (_nombre, frase) => {
  it(`CAL2-B13 (1): repetir el control: pulsar otra vez «Exportar a Excel» vuelve a pedir desde la primera ventana y descarga (${frase})`, async () => {
    const { descargas } = await renderEn([RUTA])
    await esperarTabla()
    const antes = await fallarCon(frase)
    await exportar()
    await comprobarElReintento(frase, antes, descargas)
  })

  it(`CAL2-B13 (2): ir a Personas y volver a Calificaciones antes del staleTime, y exportar (${frase})`, async () => {
    const { descargas } = await renderEn([RUTA])
    await esperarTabla()
    const antes = await fallarCon(frase)
    fireEvent.click(await seccion("Personas"))
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Exportar a Excel" })).toBeNull(),
    )
    fireEvent.click(await seccion("Calificaciones"))
    await esperarTabla()
    await exportar()
    await comprobarElReintento(frase, antes, descargas)
  })

  it(`CAL2-B13 (3): pulsar «Calificaciones» estando en ella no exporta por sí solo; después «Exportar a Excel» sí (${frase})`, async () => {
    const { descargas } = await renderEn([RUTA])
    await esperarTabla()
    const antes = await fallarCon(frase)
    const enlace = await seccion("Calificaciones")
    expect(enlace).toHaveAttribute("aria-current", "page")
    fireEvent.click(enlace)
    await esperarTabla()
    await reposar()
    expect(exportaciones()).toHaveLength(antes)
    await exportar()
    await comprobarElReintento(frase, antes, descargas)
  })

  it(`CAL2-B13 (4): atrás y adelante del historial, y exportar (${frase})`, async () => {
    const { router, descargas } = await renderEn([RUTA_PERSONAS, RUTA])
    await esperarTabla()
    const antes = await fallarCon(frase)
    await act(async () => {
      await router.navigate(-1)
    })
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Exportar a Excel" })).toBeNull(),
    )
    await act(async () => {
      await router.navigate(1)
    })
    await esperarTabla()
    await exportar()
    await comprobarElReintento(frase, antes, descargas)
  })

  it.each([
    ["Alumnos siguientes", "Alumnos anteriores", "Carla Gómez"],
    ["Tareas más antiguas", "Tareas más recientes", "Examen"],
  ])(
    `CAL2-B13 (5): con el gradebook en otra ventana (%s) y al regresar (%s), la exportación pide desde su primera ventana (${frase})`,
    async (ir, regresar, enLaVentana) => {
      const { descargas } = await renderEn([RUTA])
      await esperarTabla()
      const antes = await fallarCon(frase)
      fireEvent.click(screen.getByRole("button", { name: ir }))
      expect(await screen.findAllByText(enLaVentana)).not.toHaveLength(0)
      await exportar()
      await comprobarElReintento(frase, antes, descargas)

      const otra = await fallarCon(frase)
      fireEvent.click(screen.getByRole("button", { name: regresar }))
      await waitFor(() => expect(screen.queryByRole("button", { name: regresar })).toBeNull())
      await exportar()
      const nuevas = exportaciones().slice(otra)
      const primera = new URL(nuevas[0] ?? "", "http://local").searchParams
      expect(primera.has("cursor")).toBe(false)
      expect(primera.has("cursorTareas")).toBe(false)
      expect(descargas.mock.calls).toHaveLength(2)
      await waitFor(() => expect(screen.queryByText(frase)).toBeNull())
    },
  )
})

describe("las dos frases en la misma sesión (CAL2-B13)", () => {
  it("CAL2-B13 (6): un intento con cambio, otro con el genérico y el tercero con éxito: solo se ve el aviso del intento que acaba de terminar", async () => {
    const { descargas } = await renderEn([RUTA])
    await esperarTabla()
    const antes = await fallarCon(CAMBIO)
    await fallarCon(GENERICO)
    await waitFor(() => expect(screen.queryByText(CAMBIO)).toBeNull())
    await exportar()
    await comprobarElReintento(GENERICO, antes, descargas)
    expect(screen.queryByText(CAMBIO)).toBeNull()
    expect(
      await screen.findByText(/^Se descargó «Calificaciones - Álgebra I - /),
    ).toBeInTheDocument()
  })
})
