import { notifyManager, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { StrictMode, type ReactNode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Ataque del Tester (ADMIN-01g, ronda 2) sobre /admin/estado-pago: puntos 6 (O-01g-r1-2: «Restablecer»
// en vuelo con una recarga que trae la fila sin restricción, con dos pulsaciones en la espera y el PUT
// que falla o sale bien) y 7 (Escape y la recarga en el otro orden: la respuesta de la recarga llega
// antes que la tecla, en el mismo turno) de "Puntos de ataque para la ronda 2" (revision.md, "##
// Verificación de la corrección de la ronda 1 — ADMIN-01g"). Router real (rutas de app/router) y un
// QueryClient con la configuración de app/providers.tsx. El servidor es un doble en memoria.

const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))
vi.mock("@/services/navegacion", () => navegacion)
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const GENERICO = "No pudimos completar la operación. Inténtalo de nuevo."
const ESPERA = { timeout: 4000 }

type Estado = "deudor" | "al_corriente"

const alumno = (n: number, estadoPago: Estado = "al_corriente", extra: object = {}) => ({
  id: `6a5b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`,
  nombre: `Alumno ${String(n).padStart(3, "0")}`,
  email: `a${String(n)}@ejemplo.mx`,
  rol: "estudiante" as const,
  activo: true,
  creadoEn: "2026-09-01T15:00:00.000Z",
  estadoPago,
  fechaEstadoPago: null,
  accesoRestringido: false,
  motivoRestriccion: null,
  fechaRestriccion: null,
  ...extra,
})

type Alumno = ReturnType<typeof alumno>

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const pagina = (usuarios: Alumno[], siguiente: string | null = null) =>
  respuestaJson(200, {
    usuarios,
    siguienteCursor: siguiente,
    siguienteCursorNombre: siguiente === null ? null : "Alumno 999",
  })

interface Llamada {
  metodo: string
  url: URL
  cuerpo: unknown
}

type Respuesta = Response | Promise<Response>

let llamadas: Llamada[] = []
let alumnos: Alumno[] = []
let tabla: (url: URL) => Respuesta = () => pagina([])
let accion: (metodo: string, ruta: string, cuerpo: unknown) => Respuesta | null = () => null
let refrescoFalla = false

const tablaDelDoble = (url: URL) => {
  const estado = url.searchParams.get("estadoPago")
  const q = url.searchParams.get("q")?.toLowerCase()
  return pagina(
    alumnos.filter(
      (a) =>
        (estado === null || a.estadoPago === estado) &&
        (q === undefined || a.nombre.toLowerCase().includes(q)),
    ),
  )
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  llamadas = []
  alumnos = [alumno(1, "deudor"), alumno(2, "al_corriente"), alumno(3, "deudor")]
  tabla = tablaDelDoble
  accion = () => null
  refrescoFalla = false
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://local")
      const metodo = init?.method ?? "GET"
      const cuerpo = init?.body === undefined ? undefined : JSON.parse(String(init.body))
      llamadas.push({ metodo, url, cuerpo })
      if (url.pathname === "/api/auth/refrescar") {
        return Promise.resolve(
          refrescoFalla
            ? errorJson(401, "NO_AUTENTICADO")
            : respuestaJson(200, { tokenAcceso: "token-de-prueba" }),
        )
      }
      if (url.pathname === "/api/me") {
        return Promise.resolve(
          respuestaJson(200, {
            id: "d9a8c3c2-3333-4da0-9c3a-2b4c5d6e7f80",
            nombre: "Administración",
            email: "admin@ejemplo.mx",
            rol: "admin",
            debeCambiarContrasena: false,
            accesoRestringido: false,
          }),
        )
      }
      const propia = accion(metodo, url.pathname, cuerpo)
      if (propia !== null) return Promise.resolve(propia)
      if (metodo === "GET" && url.pathname === "/api/admin/usuarios") {
        return Promise.resolve(tabla(url))
      }
      if (metodo === "GET" && url.pathname === "/api/admin/resumen") {
        return Promise.resolve(respuestaJson(200, { alumnos: 3, maestros: 1, clasesActivas: 1 }))
      }
      if (metodo === "GET" && url.pathname === "/api/admin/movimientos-inscripcion") {
        return Promise.resolve(respuestaJson(200, { movimientos: [], siguienteCursor: null }))
      }
      return Promise.resolve(errorJson(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  aviso.success.mockClear()
  aviso.error.mockClear()
  navegacion.irA.mockClear()
})

const montar = async (estricto = false, ruta = "/admin/estado-pago") => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
  const arbol: ReactNode = (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  render(estricto ? <StrictMode>{arbol}</StrictMode> : arbol)
  await screen.findByRole("navigation", { name: "Navegación principal" }, ESPERA)
  return { router, queryClient }
}

const montarConTabla = async (estricto = false) => {
  const montada = await montar(estricto)
  await screen.findByRole("table", {}, ESPERA)
  return montada
}

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const recargar = async (queryClient: QueryClient) => {
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "usuarios", "lista"] })
  })
  await reposar()
}

const diferida = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver: (respuesta: Response) => resolver(respuesta) }
}

const filaDe = (n: number) => {
  const fila = document.querySelector<HTMLElement>(`[data-alumno-id="${alumno(n).id}"]`)
  if (fila === null) throw new Error(`Precondición: la fila ${String(n)} está en la tabla`)
  return fila
}

const hayFila = (n: number) => document.querySelector(`[data-alumno-id="${alumno(n).id}"]`) !== null

const botonDeAcceso = (n: number) =>
  within(filaDe(n)).getByRole("button", { name: /^(Restringir|Restablecer) / })
const encabezado = () => screen.getByRole("heading", { level: 1, name: "Estado de pago" })
const raiz = () => {
  const contenedor = encabezado().parentElement?.closest('[tabindex="-1"]')
  if (contenedor === null || contenedor === undefined) throw new Error("Precondición: la raíz")
  return contenedor
}
const alertasEnElDocumento = () => [...document.querySelectorAll('[role="alert"]')]

describe("ATQ-1G R2 · O-01g-r1-2 y el otro orden de Escape (puntos 6 y 7)", () => {
  it.each([["falla (5xx)"], ["sale bien y otra recarga trae la fila restringida otra vez"]])(
    "ATQ-1G54: «Restablecer» en vuelo y una recarga trae la fila sin restricción; dos pulsaciones en la espera no abren nada; el PUT %s",
    async (caso) => {
      alumnos = [
        alumno(1, "deudor", { accesoRestringido: true }),
        alumno(2, "al_corriente"),
        alumno(3, "deudor"),
      ]
      const pendiente = diferida()
      accion = (metodo, ruta) =>
        metodo === "PUT" && ruta.endsWith("/acceso") ? pendiente.promesa : null
      const { queryClient } = await montarConTabla()
      fireEvent.click(botonDeAcceso(1))
      await waitFor(() => expect(llamadas.filter((l) => l.metodo === "PUT")).toHaveLength(1))
      alumnos = alumnos.map((a) => (a.id === alumno(1).id ? { ...a, accesoRestringido: false } : a))
      await recargar(queryClient)
      await waitFor(() => expect(botonDeAcceso(1)).toHaveAccessibleName("Restringir Alumno 001"))
      expect(botonDeAcceso(1)).toHaveAttribute("aria-busy", "true")
      fireEvent.click(botonDeAcceso(1))
      fireEvent.click(botonDeAcceso(1))
      await reposar()
      expect(screen.queryByRole("dialog")).toBeNull()
      expect(llamadas.filter((l) => l.metodo === "PUT")).toHaveLength(1)
      if (caso === "falla (5xx)") {
        await act(async () => {
          pendiente.resolver(errorJson(500, "ERROR_INTERNO"))
        })
        await reposar()
        expect(botonDeAcceso(1)).not.toHaveAttribute("aria-busy", "true")
        expect(botonDeAcceso(1)).toHaveAccessibleName("Restringir Alumno 001")
        expect(alertasEnElDocumento()).toHaveLength(1)
        expect(within(filaDe(1)).getByRole("alert")).toHaveTextContent(GENERICO)
        expect(aviso.error).not.toHaveBeenCalled()
        fireEvent.click(botonDeAcceso(1))
        const dialogo = await screen.findByRole("dialog")
        expect(within(dialogo).getByRole("heading")).toHaveTextContent("Alumno 001")
        expect(within(filaDe(1)).queryByRole("alert", { hidden: true })).toBeNull()
        expect(llamadas.filter((l) => l.metodo === "PUT")).toHaveLength(1)
      }
      if (caso !== "falla (5xx)") {
        alumnos = alumnos.map((a) =>
          a.id === alumno(1).id ? { ...a, accesoRestringido: true } : a,
        )
        await act(async () => {
          pendiente.resolver(
            respuestaJson(200, { ...alumno(1, "deudor"), accesoRestringido: false }),
          )
        })
        await reposar()
        await waitFor(() => expect(botonDeAcceso(1)).toHaveAccessibleName("Restablecer Alumno 001"))
        expect(botonDeAcceso(1)).not.toHaveAttribute("aria-busy", "true")
        expect(aviso.success.mock.calls.filter(([t]) => t === "Acceso restablecido")).toHaveLength(
          1,
        )
        expect(alertasEnElDocumento()).toHaveLength(0)
        expect(screen.queryByRole("dialog")).toBeNull()
      }
    },
  )

  it("ATQ-1G55: restringir abierto; la respuesta de una recarga que saca la fila llega antes que Escape en el mismo turno: el diálogo se cierra y el foco no cae en <body>", async () => {
    const { queryClient } = await montarConTabla()
    fireEvent.click(botonDeAcceso(2))
    const dialogo = await screen.findByRole("dialog")
    const cancelar = within(dialogo).getByRole("button", { name: "Cancelar" })
    await waitFor(() => expect(document.activeElement).toBe(cancelar))
    const [consulta] = queryClient
      .getQueryCache()
      .findAll({ queryKey: ["admin", "usuarios", "lista"] })
    if (consulta === undefined) throw new Error("Precondición: la consulta de la tabla en la caché")
    // Con el planificador síncrono, la respuesta llega a la vista en el mismo turno, antes de la tecla, y
    // React pinta las dos cosas en un solo render (el otro orden de ATQ-1G11).
    notifyManager.setScheduler((tarea) => tarea())
    try {
      act(() => {
        queryClient.setQueryData(consulta.queryKey, (anterior: unknown) => {
          const datos = anterior as { pages: { usuarios: Alumno[] }[]; pageParams: unknown[] }
          return {
            ...datos,
            pages: datos.pages.map((pagina) => ({
              ...pagina,
              usuarios: pagina.usuarios.filter((a) => a.id !== alumno(2).id),
            })),
          }
        })
        expect(cancelar.isConnected).toBe(true)
        fireEvent.keyDown(cancelar, { key: "Escape" })
      })
    } finally {
      notifyManager.setScheduler((tarea) => setTimeout(tarea, 0))
    }
    await reposar()
    await act(() => new Promise((r) => setTimeout(r, 50)))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(hayFila(2)).toBe(false)
    expect(document.activeElement).not.toBe(document.body)
    expect([encabezado(), raiz()]).toContain(document.activeElement)
    expect(aviso.error).not.toHaveBeenCalled()
  })
})
