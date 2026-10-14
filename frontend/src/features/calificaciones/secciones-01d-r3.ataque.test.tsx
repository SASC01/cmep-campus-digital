import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Tester, ronda 3 de CALIFICACIONES-01d: la instrucción del texto del cursor ("Vuelve a abrir
// Calificaciones…") con el router real y la sección "Calificaciones" de la clase, y el cambio de
// clase con la vista montada. La QueryClient lleva el staleTime y el refetchOnWindowFocus de
// app/providers.tsx (retry en false para no esperar el reintento de 1 s; el 400 no depende de él).
// Reloj fijo en todas (solo Date: la frescura de la caché depende de Date.now()).

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const CLASE_A = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const CLASE_B = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02"
const TAREA_ID = "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ALUMNO_1 = "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0301"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const CURSOR_GRADEBOOK =
  "La clase cambió mientras veías las calificaciones. Vuelve a abrir Calificaciones para verlas completas."
const CURSOR_MIS =
  "Tus tareas cambiaron mientras las veías. Vuelve a abrir Calificaciones para verlas completas."
const STALE_DE_PRODUCCION = 30_000

type Rol = "estudiante" | "maestro" | "admin"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const cursorInvalido = (campo: string) =>
  respuestaJson(400, { error: { codigo: "VALIDACION", mensaje: `${campo}: no es válido` } })

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

// La primera ventana: antes del cambio, 1 de 2 alumnos con "Alumnos siguientes"; después (el alumno 2
// salió), la clase completa sin cursor.
const primeraVentana = (cambio: boolean) => ({
  tareas: [columna],
  siguienteCursorTareas: null,
  alumnos: [filaDe(ALUMNO_1, "Ana Ruiz")],
  siguienteCursor: cambio ? null : ALUMNO_1,
  resumen: {
    modo: "puntos",
    totalAlumnos: cambio ? 1 : 2,
    promedioDeLaClase: 90,
    alumnosEnRiesgo: 0,
  },
})
const ventanaVacia = {
  tareas: [columna],
  siguienteCursorTareas: null,
  alumnos: [],
  siguienteCursor: null,
  resumen: { modo: "puntos", totalAlumnos: 1, promedioDeLaClase: 90, alumnosEnRiesgo: 0 },
}

const tareaMia = (id: string, titulo: string) => ({
  id,
  titulo,
  fechaLimite: FUTURA,
  puntos: 10,
  categoria: null,
  entrega: { estado: "calificado", conRetraso: false, calificacion: 9 },
})
const general = {
  modo: "puntos",
  porcentaje: 90,
  puntos: { obtenido: 9, posible: 10, tareas: 1 },
  categorias: [],
  sinCategoria: { tareas: 0 },
}
const primeraPaginaMia = (cambio: boolean) => ({
  general,
  tareas: [tareaMia(TAREA_ID, "Ensayo final")],
  siguienteCursor: cambio ? null : TAREA_ID,
})

interface Estado {
  rol: Rol
  cambio: boolean
  modoCursor: "400" | "vacia"
}

const estado: Estado = { rol: "maestro", cambio: false, modoCursor: "400" }
let llamadas: string[] = []

const instalarServidor = () => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => {
    const ruta = String(entrada)
    llamadas.push(ruta)
    const url = new URL(ruta, "http://local")
    if (ruta === "/api/auth/refrescar") {
      return Promise.resolve(respuestaJson(200, { tokenAcceso: "restaurado" }))
    }
    if (ruta === "/api/me") return Promise.resolve(respuestaJson(200, me(estado.rol)))
    if (url.pathname === "/api/clases/impartidas") {
      return Promise.resolve(
        respuestaJson(200, {
          clases: [
            { id: CLASE_A, nombre: "Álgebra I", alumnos: 2 },
            { id: CLASE_B, nombre: "Biología II", alumnos: 0 },
          ],
          total: 2,
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
    const deClase = /^\/api\/clases\/([0-9a-f-]{36})(\/.*)?$/.exec(url.pathname)
    if (deClase !== null) {
      const id = deClase[1] ?? ""
      const resto = deClase[2] ?? ""
      const nombre = id === CLASE_A ? "Álgebra I" : "Biología II"
      if (resto === "") {
        return Promise.resolve(
          respuestaJson(200, {
            clase: { id, nombre, descripcion: null, maestro: MAESTRO, maestros: [MAESTRO] },
          }),
        )
      }
      if (resto === "/codigo") return Promise.resolve(respuestaJson(200, { codigo: "ABCDEFG" }))
      if (resto === "/publicaciones") {
        return Promise.resolve(respuestaJson(200, { publicaciones: [], siguienteCursor: null }))
      }
      if (resto === "/gradebook" && id === CLASE_A) {
        const cursor = url.searchParams.get("cursor")
        if (cursor === null)
          return Promise.resolve(respuestaJson(200, primeraVentana(estado.cambio)))
        if (estado.modoCursor === "400") return Promise.resolve(cursorInvalido("cursor"))
        return Promise.resolve(respuestaJson(200, ventanaVacia))
      }
      if (resto === "/mis-calificaciones" && id === CLASE_A) {
        const cursor = url.searchParams.get("cursor")
        if (cursor === null) {
          return Promise.resolve(respuestaJson(200, primeraPaginaMia(estado.cambio)))
        }
        return Promise.resolve(cursorInvalido("cursor"))
      }
    }
    return Promise.resolve(
      respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } }),
    )
  })
  vi.stubGlobal("fetch", fetchMock)
}

const renderEn = async (ruta: string) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, staleTime: STALE_DE_PRODUCCION },
    },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const secciones = () => screen.findByRole("list", { name: "Secciones de la clase" })
const seccion = async (nombre: string) =>
  within(await secciones()).getByRole("link", { name: nombre })
const esperarTabla = () =>
  screen.findByRole("table", { name: "Calificaciones por alumno y tarea" }, { timeout: 5_000 })
const pedidasDelGradebook = () => llamadas.filter((r) => r.includes(`/${CLASE_A}/gradebook?`))
const pedidasMias = () => llamadas.filter((r) => r.includes(`/${CLASE_A}/mis-calificaciones?`))
const sinCursor = (r: string) => !new URL(r, "http://local").searchParams.has("cursor")

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  vi.resetModules()
  estado.rol = "maestro"
  estado.cambio = false
  estado.modoCursor = "400"
  llamadas = []
  instalarServidor()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

// Lleva el gradebook de la clase A al texto del cursor: la clase cambia (sale el alumno 2) y se pulsa
// «Alumnos siguientes».
const llegarAlTextoDelGradebook = async (modo: "400" | "vacia") => {
  estado.modoCursor = modo
  const router = await renderEn(`/maestro/clases/${CLASE_A}/calificaciones`)
  await esperarTabla()
  expect(screen.getByText("2 alumnos")).toBeInTheDocument()
  estado.cambio = true
  fireEvent.click(screen.getByRole("button", { name: "Alumnos siguientes" }))
  expect(await screen.findByText(CURSOR_GRADEBOOK)).toBeInTheDocument()
  return router
}

describe("T-08: «Vuelve a abrir Calificaciones» pulsando la sección «Calificaciones» (la activa)", () => {
  it.each(["400", "vacia"] as const)(
    "CAL-T-228: gradebook con el texto del cursor (%s): pulsar la sección «Calificaciones» vuelve a pedir la primera ventana y muestra la clase como está",
    async (modo) => {
      const router = await llegarAlTextoDelGradebook(modo)
      const enlace = await seccion("Calificaciones")
      expect(enlace).toHaveAttribute("aria-current", "page")
      const desde = pedidasDelGradebook().length
      const claveAntes = router.state.location.key
      fireEvent.click(enlace)
      // El clic sí navega (una entrada nueva con la misma ruta), pero la vista no se desmonta.
      await waitFor(() => expect(router.state.location.key).not.toBe(claveAntes))
      expect(router.state.location.pathname).toBe(`/maestro/clases/${CLASE_A}/calificaciones`)
      await waitFor(
        () => expect(pedidasDelGradebook().slice(desde).filter(sinCursor).length).toBe(1),
        { timeout: 2_000 },
      )
      await esperarTabla()
      expect(screen.queryByText(CURSOR_GRADEBOOK)).toBeNull()
      expect(screen.getByText("1 alumno")).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Alumnos siguientes" })).toBeNull()
    },
  )

  it("CAL-T-229: «Mis calificaciones» con el texto del cursor de «Ver más tareas»: pulsar la sección «Calificaciones» vuelve a pedir la primera página", async () => {
    estado.rol = "estudiante"
    const router = await renderEn(`/estudiante/clases/${CLASE_A}/calificaciones`)
    expect(
      await screen.findByRole("link", { name: "Ensayo final" }, { timeout: 5_000 }),
    ).toBeInTheDocument()
    estado.cambio = true
    fireEvent.click(screen.getByRole("button", { name: "Ver más tareas" }))
    expect(await screen.findByText(CURSOR_MIS)).toBeInTheDocument()
    const enlace = await seccion("Calificaciones")
    expect(enlace).toHaveAttribute("aria-current", "page")
    const desde = pedidasMias().length
    const claveAntes = router.state.location.key
    fireEvent.click(enlace)
    await waitFor(() => expect(router.state.location.key).not.toBe(claveAntes))
    await waitFor(() => expect(pedidasMias().slice(desde).filter(sinCursor).length).toBe(1), {
      timeout: 2_000,
    })
    expect(await screen.findByRole("link", { name: "Ensayo final" })).toBeInTheDocument()
    expect(screen.queryByText(CURSOR_MIS)).toBeNull()
    expect(screen.queryByRole("button", { name: "Ver más tareas" })).toBeNull()
  })

  it.each(["400", "vacia"] as const)(
    "CAL-T-230 (control de T-07 con el router real): con el texto del cursor (%s), ir a «Muro» y volver a «Calificaciones» antes de 30 s muestra la clase como está",
    async (modo) => {
      await llegarAlTextoDelGradebook(modo)
      fireEvent.click(await seccion("Muro"))
      await waitFor(() => expect(screen.queryByText(CURSOR_GRADEBOOK)).toBeNull())
      const desde = pedidasDelGradebook().length
      fireEvent.click(await seccion("Calificaciones"))
      await waitFor(() => expect(screen.getByText("1 alumno")).toBeInTheDocument(), {
        timeout: 5_000,
      })
      expect(pedidasDelGradebook().slice(desde).filter(sinCursor)).toHaveLength(1)
      expect(screen.queryByText(CURSOR_GRADEBOOK)).toBeNull()
      expect(screen.queryByRole("button", { name: "Alumnos siguientes" })).toBeNull()
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )
})

describe("Cambio de clase con el gradebook montado (alcance del manager: no alcanzable)", () => {
  it("CAL-T-231: desde Calificaciones de la clase A, la clase B de la barra lleva a la raíz de B (el muro): el gradebook se desmonta y nunca se pide el de B ni con el cursor de A", async () => {
    await renderEn(`/maestro/clases/${CLASE_A}/calificaciones`)
    await esperarTabla()
    fireEvent.click(screen.getByRole("button", { name: "Alumnos siguientes" }))
    expect(await screen.findByText(CURSOR_GRADEBOOK)).toBeInTheDocument()
    const barra = await screen.findByRole("list", { name: "Mis clases" })
    const enlaceB = within(barra).getByRole("link", { name: /Biología II/ })
    expect(enlaceB).toHaveAttribute("href", `/maestro/clases/${CLASE_B}`)
    fireEvent.click(enlaceB)
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Calificaciones", level: 2 })).toBeNull(),
    )
    expect(screen.queryByText(CURSOR_GRADEBOOK)).toBeNull()
    expect(llamadas.some((r) => r.includes(`/${CLASE_B}/gradebook`))).toBe(false)
    // Las secciones de B apuntan a B: ninguna lleva al gradebook de A ni de otra clase.
    const lista = await secciones()
    for (const enlace of within(lista).getAllByRole("link")) {
      expect(enlace.getAttribute("href")?.startsWith(`/maestro/clases/${CLASE_B}`)).toBe(true)
    }
  })
})

describe("El admin: contexto opaco con el router real", () => {
  it("CAL-T-252: en /admin/clases/:claseId/calificaciones, la tabla, los botones de las ventanas y el texto del cursor cuelgan de un data-material=opaco, y la sección «Calificaciones» es la activa", async () => {
    estado.rol = "admin"
    await renderEn(`/admin/clases/${CLASE_A}/calificaciones`)
    const tabla = await esperarTabla()
    expect(tabla.closest("[data-material='opaco']")).not.toBeNull()
    const siguientes = screen.getByRole("button", { name: "Alumnos siguientes" })
    expect(siguientes.closest("[data-material='opaco']")).not.toBeNull()
    expect(await seccion("Calificaciones")).toHaveAttribute("aria-current", "page")
    fireEvent.click(siguientes)
    const alerta = await screen.findByRole("alert")
    expect(alerta).toHaveTextContent(CURSOR_GRADEBOOK)
    expect(alerta.closest("[data-material='opaco']")).not.toBeNull()
    expect(llamadas.some((r) => r.includes("/mis-calificaciones"))).toBe(false)
  })
})
