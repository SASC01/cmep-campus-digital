import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { StrictMode, type ReactNode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Ataque del Tester (ADMIN-01g, ronda 1) sobre /admin/estado-pago: puntos 1 (la acción vigente), 2 (T-01
// en la fila y el lote), 3 (T-02 con incluirDialogos), 7 (el 401) y 9 (M-26, el borde de la casilla) de
// "Puntos de ataque finales para la ronda 1" (revision.md, "## Verificación de la corrección —
// ADMIN-01g"). Router real (rutas de app/router) y un QueryClient con la configuración de
// app/providers.tsx. El servidor es un doble en memoria; lo que nadie responde es un 500 "no esperada".

const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))
vi.mock("@/services/navegacion", () => navegacion)
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const GENERICO = "No pudimos completar la operación. Inténtalo de nuevo."
const ERROR_TABLA = "No pudimos cargar los alumnos. Revisa tu conexión e inténtalo de nuevo."
const ESPERA = { timeout: 4000 }
const RUTA_LOTE = "/api/admin/alumnos/estado-pago"

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

const botonDeMarcar = (n: number) =>
  within(filaDe(n)).getByRole("button", { name: /^Marcar (como deudor|al corriente) / })
const botonDeAcceso = (n: number) =>
  within(filaDe(n)).getByRole("button", { name: /^(Restringir|Restablecer) / })
const casilla = (n: number) => within(filaDe(n)).getByRole("checkbox")
const casillaDeLaCabecera = () =>
  screen.getByRole("checkbox", { name: "Seleccionar los de esta página" })
const boton = (nombre: string) => screen.getByRole("button", { name: nombre })
const peticiones = (metodo: string, ruta: string) =>
  llamadas.filter((l) => l.metodo === metodo && l.url.pathname === ruta)
const encabezado = () => screen.getByRole("heading", { level: 1, name: "Estado de pago" })
const raiz = () => {
  const contenedor = encabezado().parentElement?.closest('[tabindex="-1"]')
  if (contenedor === null || contenedor === undefined) throw new Error("Precondición: la raíz")
  return contenedor
}
const alertasEnElDocumento = () => [...document.querySelectorAll('[role="alert"]')]

// Cada PUT del lote (la fila manda el lote con un solo id) queda en vuelo, con su id, hasta soltarlo.
const lotesEnVuelo = () => {
  const pendientes = new Map<string, ReturnType<typeof diferida>>()
  accion = (metodo, ruta, cuerpo) => {
    if (metodo !== "PUT" || ruta !== RUTA_LOTE) return null
    const { alumnoIds } = cuerpo as { alumnoIds: string[] }
    const pendiente = diferida()
    pendientes.set(alumnoIds.join(","), pendiente)
    return pendiente.promesa
  }
  return (n: number, respuesta: Response) => {
    const pendiente = pendientes.get(alumno(n).id)
    if (pendiente === undefined) throw new Error(`Precondición: el PUT de la fila ${String(n)}`)
    pendiente.resolver(respuesta)
  }
}

describe("ATQ-1G R1 · la acción vigente (punto 1, M-23 y M-25)", () => {
  it("ATQ-1G01: dos filas en vuelo que fallan en orden inverso al de las pulsaciones: solo el mensaje de la última pulsada, sin aviso y sin espera", async () => {
    const soltar = lotesEnVuelo()
    await montarConTabla()
    fireEvent.click(botonDeMarcar(1))
    fireEvent.click(botonDeMarcar(3))
    await waitFor(() => expect(peticiones("PUT", RUTA_LOTE)).toHaveLength(2))
    await act(async () => {
      soltar(3, errorJson(500, "ERROR_INTERNO"))
    })
    await reposar()
    expect(within(filaDe(3)).getByRole("alert")).toHaveTextContent(GENERICO)
    await act(async () => {
      soltar(1, errorJson(500, "ERROR_INTERNO"))
    })
    await reposar()
    expect(alertasEnElDocumento()).toHaveLength(1)
    expect(within(filaDe(3)).getByRole("alert")).toHaveTextContent(GENERICO)
    expect(within(filaDe(1)).queryByRole("alert")).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(botonDeMarcar(1)).not.toHaveAttribute("aria-busy", "true")
    expect(botonDeMarcar(3)).not.toHaveAttribute("aria-busy", "true")
  })

  it("ATQ-1G02: dos filas en vuelo; falla primero la que no es la vigente y después la vigente sale bien: ningún mensaje, ningún aviso de error y un aviso de éxito", async () => {
    const soltar = lotesEnVuelo()
    await montarConTabla()
    fireEvent.click(botonDeMarcar(1))
    fireEvent.click(botonDeMarcar(3))
    await waitFor(() => expect(peticiones("PUT", RUTA_LOTE)).toHaveLength(2))
    await act(async () => {
      soltar(1, errorJson(500, "ERROR_INTERNO"))
    })
    await reposar()
    expect(alertasEnElDocumento()).toHaveLength(0)
    await act(async () => {
      soltar(3, respuestaJson(200, { actualizados: 1 }))
    })
    await reposar()
    expect(alertasEnElDocumento()).toHaveLength(0)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(
      aviso.success.mock.calls.filter(([t]) => t === "Estado de pago actualizado"),
    ).toHaveLength(1)
  })

  it("ATQ-1G03: con el mensaje de una fila a la vista, una casilla, la de la cabecera y un término corto del buscador no son acciones: el mensaje sigue, uno solo", async () => {
    accion = (metodo, ruta) =>
      metodo === "PUT" && ruta === RUTA_LOTE ? errorJson(500, "ERROR_INTERNO") : null
    await montarConTabla()
    fireEvent.click(botonDeMarcar(1))
    expect(await within(filaDe(1)).findByRole("alert", {}, ESPERA)).toHaveTextContent(GENERICO)
    fireEvent.click(casilla(2))
    expect(within(filaDe(1)).getByRole("alert")).toHaveTextContent(GENERICO)
    fireEvent.click(casillaDeLaCabecera())
    expect(screen.getByText("3 seleccionados")).toBeInTheDocument()
    expect(within(filaDe(1)).getByRole("alert")).toHaveTextContent(GENERICO)
    const antes = peticiones("GET", "/api/admin/usuarios").length
    fireEvent.change(screen.getByLabelText("Buscar por nombre o correo"), {
      target: { value: "Al" },
    })
    await act(() => new Promise((r) => setTimeout(r, 450)))
    expect(peticiones("GET", "/api/admin/usuarios")).toHaveLength(antes)
    expect(alertasEnElDocumento()).toHaveLength(1)
    expect(within(filaDe(1)).getByRole("alert")).toHaveTextContent(GENERICO)
  })

  it("ATQ-1G04: la fila con el mensaje vigente sale de la lista y vuelve: el mensaje no regresa y el botón no queda en espera", async () => {
    accion = (metodo, ruta) =>
      metodo === "PUT" && ruta === RUTA_LOTE ? errorJson(500, "ERROR_INTERNO") : null
    const { queryClient } = await montarConTabla()
    fireEvent.click(botonDeMarcar(1))
    await within(filaDe(1)).findByRole("alert", {}, ESPERA)
    const guardados = alumnos
    alumnos = alumnos.filter((a) => a.id !== alumno(1).id)
    await recargar(queryClient)
    await waitFor(() => expect(hayFila(1)).toBe(false), ESPERA)
    expect(alertasEnElDocumento()).toHaveLength(0)
    alumnos = guardados
    await recargar(queryClient)
    await waitFor(() => expect(hayFila(1)).toBe(true), ESPERA)
    expect(alertasEnElDocumento()).toHaveLength(0)
    expect(botonDeMarcar(1)).not.toHaveAttribute("aria-busy", "true")
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("ATQ-1G05: la fila sale de la lista con «Marcar…» en vuelo y vuelve antes de la respuesta; el error se avisa una sola vez y no se pinta en la fila que volvió", async () => {
    const soltar = lotesEnVuelo()
    const { queryClient } = await montarConTabla()
    fireEvent.click(botonDeMarcar(1))
    await waitFor(() => expect(peticiones("PUT", RUTA_LOTE)).toHaveLength(1))
    const guardados = alumnos
    alumnos = alumnos.filter((a) => a.id !== alumno(1).id)
    await recargar(queryClient)
    await waitFor(() => expect(hayFila(1)).toBe(false), ESPERA)
    alumnos = guardados
    await recargar(queryClient)
    await waitFor(() => expect(hayFila(1)).toBe(true), ESPERA)
    await act(async () => {
      soltar(1, errorJson(500, "ERROR_INTERNO"))
    })
    await reposar()
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(aviso.error).toHaveBeenCalledWith(GENERICO)
    expect(alertasEnElDocumento()).toHaveLength(0)
  })

  it("ATQ-1G06: en <StrictMode>, dos clics hacen una petición; un error deja un solo mensaje en la fila y «Marcar…» con éxito en otra lo quita", async () => {
    let falla = true
    accion = (metodo, ruta, cuerpo) => {
      if (metodo !== "PUT" || ruta !== RUTA_LOTE) return null
      if (falla) return errorJson(500, "ERROR_INTERNO")
      const { alumnoIds, estadoPago } = cuerpo as { alumnoIds: string[]; estadoPago: Estado }
      alumnos = alumnos.map((a) => (alumnoIds.includes(a.id) ? { ...a, estadoPago } : a))
      return respuestaJson(200, { actualizados: alumnoIds.length })
    }
    await montarConTabla(true)
    fireEvent.click(botonDeMarcar(1))
    fireEvent.click(botonDeMarcar(1))
    expect(await within(filaDe(1)).findByRole("alert", {}, ESPERA)).toHaveTextContent(GENERICO)
    expect(peticiones("PUT", RUTA_LOTE)).toHaveLength(1)
    expect(alertasEnElDocumento()).toHaveLength(1)
    falla = false
    fireEvent.click(botonDeMarcar(3))
    await waitFor(() => expect(alertasEnElDocumento()).toHaveLength(0), ESPERA)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(
      aviso.success.mock.calls.filter(([t]) => t === "Estado de pago actualizado"),
    ).toHaveLength(1)
  })
})

describe("ATQ-1G R1 · T-01 en la fila y el lote (punto 2)", () => {
  it.each([["con error"], ["con éxito"]])(
    "ATQ-1G07: una recarga con el otro estado a mitad de «Marcar…» en vuelo, %s: lo enviado es el contrario al de antes y la fila termina con el estado del servidor",
    async (caso) => {
      const soltar = lotesEnVuelo()
      const { queryClient } = await montarConTabla()
      fireEvent.click(botonDeMarcar(1))
      await waitFor(() => expect(peticiones("PUT", RUTA_LOTE)).toHaveLength(1))
      expect(peticiones("PUT", RUTA_LOTE)[0]?.cuerpo).toEqual({
        alumnoIds: [alumno(1).id],
        estadoPago: "al_corriente",
      })
      alumnos = alumnos.map((a) =>
        a.id === alumno(1).id ? { ...a, estadoPago: "al_corriente" as const } : a,
      )
      await recargar(queryClient)
      await waitFor(() => expect(within(filaDe(1)).getByText("Al corriente")).toBeInTheDocument())
      expect(botonDeMarcar(1)).toHaveAccessibleName("Marcar como deudor Alumno 001")
      expect(botonDeMarcar(1)).toHaveAttribute("aria-busy", "true")
      await act(async () => {
        soltar(
          1,
          caso === "con error"
            ? errorJson(500, "ERROR_INTERNO")
            : respuestaJson(200, { actualizados: 1 }),
        )
      })
      await reposar()
      await waitFor(() => expect(botonDeMarcar(1)).not.toHaveAttribute("aria-busy", "true"))
      expect(within(filaDe(1)).getByText("Al corriente")).toBeInTheDocument()
      expect(botonDeMarcar(1)).toHaveAccessibleName("Marcar como deudor Alumno 001")
      expect(peticiones("PUT", RUTA_LOTE)).toHaveLength(1)
      if (caso === "con error") {
        expect(alertasEnElDocumento()).toHaveLength(1)
        expect(within(filaDe(1)).getByRole("alert")).toHaveTextContent(GENERICO)
        expect(aviso.success).not.toHaveBeenCalled()
      }
      if (caso === "con éxito") {
        expect(alertasEnElDocumento()).toHaveLength(0)
        expect(
          aviso.success.mock.calls.filter(([t]) => t === "Estado de pago actualizado"),
        ).toHaveLength(1)
      }
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )

  it("ATQ-1G08: con el lote abierto, una fila elegida cambia dos veces (sale y vuelve a su estado): el diálogo cuenta una menos, no la recupera y «Sí, cambiar» manda solo la otra con el destino elegido", async () => {
    accion = (metodo, ruta, cuerpo) =>
      metodo === "PUT" && ruta === RUTA_LOTE
        ? respuestaJson(200, { actualizados: (cuerpo as { alumnoIds: string[] }).alumnoIds.length })
        : null
    const { queryClient } = await montarConTabla()
    fireEvent.click(casilla(1))
    fireEvent.click(casilla(3))
    fireEvent.click(boton("Marcar al corriente"))
    const dialogo = await screen.findByRole("dialog")
    expect(within(dialogo).getByText("Se marcarán 2 alumnos al corriente.")).toBeInTheDocument()
    alumnos = alumnos.map((a) =>
      a.id === alumno(1).id ? { ...a, estadoPago: "al_corriente" as const } : a,
    )
    await recargar(queryClient)
    await waitFor(() =>
      expect(within(dialogo).getByText("Se marcará 1 alumno al corriente.")).toBeInTheDocument(),
    )
    alumnos = alumnos.map((a) =>
      a.id === alumno(1).id ? { ...a, estadoPago: "deudor" as const } : a,
    )
    await recargar(queryClient)
    await waitFor(() => expect(within(filaDe(1)).getByText("Deudor")).toBeInTheDocument())
    expect(within(dialogo).getByText("Se marcará 1 alumno al corriente.")).toBeInTheDocument()
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, cambiar" }))
    await waitFor(() => expect(peticiones("PUT", RUTA_LOTE)).toHaveLength(1))
    expect(peticiones("PUT", RUTA_LOTE)[0]?.cuerpo).toEqual({
      alumnoIds: [alumno(3).id],
      estadoPago: "al_corriente",
    })
  })

  it("ATQ-1G09: el destino del lote no cambia con una recarga que trae otro estado para una fila que no está elegida", async () => {
    accion = (metodo, ruta, cuerpo) =>
      metodo === "PUT" && ruta === RUTA_LOTE
        ? respuestaJson(200, { actualizados: (cuerpo as { alumnoIds: string[] }).alumnoIds.length })
        : null
    const { queryClient } = await montarConTabla()
    fireEvent.click(casilla(2))
    fireEvent.click(boton("Marcar como deudores"))
    const dialogo = await screen.findByRole("dialog")
    alumnos = alumnos.map((a) =>
      a.id === alumno(3).id ? { ...a, estadoPago: "al_corriente" as const } : a,
    )
    await recargar(queryClient)
    await waitFor(() => expect(within(filaDe(3)).getByText("Al corriente")).toBeInTheDocument())
    expect(within(dialogo).getByText("Se marcará 1 alumno como deudor.")).toBeInTheDocument()
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, cambiar" }))
    await waitFor(() => expect(peticiones("PUT", RUTA_LOTE)).toHaveLength(1))
    expect(peticiones("PUT", RUTA_LOTE)[0]?.cuerpo).toEqual({
      alumnoIds: [alumno(2).id],
      estadoPago: "deudor",
    })
  })

  it.each([
    ["100 distintas (101 recibidas, una repetida entre páginas)", 50, 100, true, 100],
    ["101 distintas", 51, 101, false, 101],
  ])(
    "ATQ-1G10: «Seleccionar los de esta página» con %s",
    async (_caso, desdeSegunda, hastaSegunda, manda, distintas) => {
      const primera = Array.from({ length: 50 }, (_, i) => alumno(i + 1, "deudor"))
      const segunda = Array.from({ length: hastaSegunda - desdeSegunda + 1 }, (_, i) =>
        alumno(desdeSegunda + i, "deudor"),
      )
      tabla = (url) =>
        url.searchParams.has("cursor") ? pagina(segunda) : pagina(primera, alumno(50).id)
      accion = (metodo, ruta, cuerpo) =>
        metodo === "PUT" && ruta === RUTA_LOTE
          ? respuestaJson(200, {
              actualizados: (cuerpo as { alumnoIds: string[] }).alumnoIds.length,
            })
          : null
      const errorDeConsola = vi.spyOn(console, "error")
      await montarConTabla()
      fireEvent.click(boton("Cargar más alumnos"))
      await waitFor(() => expect(hayFila(hastaSegunda)).toBe(true), ESPERA)
      expect(screen.getAllByRole("checkbox")).toHaveLength(distintas + 1)
      fireEvent.click(casillaDeLaCabecera())
      expect(screen.getByText(`${String(distintas)} seleccionados`)).toBeInTheDocument()
      fireEvent.click(boton("Marcar al corriente"))
      const dialogo = await screen.findByRole("dialog")
      fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, cambiar" }))
      await reposar()
      if (manda) {
        await waitFor(() => expect(peticiones("PUT", RUTA_LOTE)).toHaveLength(1))
        const { alumnoIds } = peticiones("PUT", RUTA_LOTE)[0]?.cuerpo as { alumnoIds: string[] }
        expect(alumnoIds).toHaveLength(100)
        expect(new Set(alumnoIds).size).toBe(100)
      }
      if (!manda) {
        expect(within(dialogo).getByRole("alert")).toHaveTextContent(
          "No puedes cambiar más de 100 alumnos a la vez",
        )
        expect(peticiones("PUT", RUTA_LOTE)).toHaveLength(0)
      }
      expect(errorDeConsola.mock.calls.filter((a) => String(a[0]).includes("same key"))).toEqual([])
    },
  )
})

describe("ATQ-1G R1 · T-02 con incluirDialogos (punto 3)", () => {
  it("ATQ-1G11: restringir abierto, Escape y una recarga 200 que saca la fila en el mismo turno: el diálogo se cierra y el foco no cae en <body>", async () => {
    const { queryClient } = await montarConTabla()
    fireEvent.click(botonDeAcceso(2))
    const dialogo = await screen.findByRole("dialog")
    const cancelar = within(dialogo).getByRole("button", { name: "Cancelar" })
    await waitFor(() => expect(document.activeElement).toBe(cancelar))
    alumnos = alumnos.filter((a) => a.id !== alumno(2).id)
    await act(async () => {
      fireEvent.keyDown(cancelar, { key: "Escape" })
      await queryClient.invalidateQueries({ queryKey: ["admin", "usuarios", "lista"] })
    })
    await reposar()
    await act(() => new Promise((r) => setTimeout(r, 50)))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(hayFila(2)).toBe(false)
    expect(document.activeElement).not.toBe(document.body)
    expect([encabezado(), raiz()]).toContain(document.activeElement)
  })

  it("ATQ-1G12: el lote abierto cuando llega la búsqueda diferida que vacía la tabla: el diálogo sigue con el foco, cuenta 0 y no manda nada; al cerrarlo, el foco va al h1", async () => {
    await montarConTabla()
    fireEvent.change(screen.getByLabelText("Buscar por nombre o correo"), {
      target: { value: "zzz" },
    })
    fireEvent.click(casilla(1))
    fireEvent.click(boton("Marcar al corriente"))
    const dialogo = await screen.findByRole("dialog")
    const cancelar = within(dialogo).getByRole("button", { name: "Cancelar" })
    await waitFor(() => expect(document.activeElement).toBe(cancelar))
    await act(() => new Promise((r) => setTimeout(r, 450)))
    expect(
      await screen.findByText("No encontramos alumnos con esa búsqueda", {}, ESPERA),
    ).toBeInTheDocument()
    await reposar()
    expect(screen.getByRole("dialog")).toBe(dialogo)
    expect(document.activeElement).toBe(cancelar)
    expect(within(dialogo).getByText("Se marcarán 0 alumnos al corriente.")).toBeInTheDocument()
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, cambiar" }))
    expect(within(dialogo).getByRole("alert")).toHaveTextContent("Elige al menos un alumno")
    expect(peticiones("PUT", RUTA_LOTE)).toHaveLength(0)
    fireEvent.click(cancelar)
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(encabezado()))
  })

  it("ATQ-1G13: el foco en el motivo con una recarga 5xx y después una 200 con la fila: el diálogo sigue con el foco y lo escrito; una 200 que la saca lo cierra y el foco va a la raíz", async () => {
    let falla = false
    tabla = (url) => (falla ? errorJson(500, "ERROR_INTERNO") : tablaDelDoble(url))
    const { queryClient } = await montarConTabla()
    fireEvent.click(botonDeAcceso(2))
    const dialogo = await screen.findByRole("dialog")
    const motivo = within(dialogo).getByLabelText("Motivo (opcional)")
    act(() => motivo.focus())
    fireEvent.change(motivo, { target: { value: "Adeudo de octubre" } })
    falla = true
    await recargar(queryClient)
    await screen.findByText(ERROR_TABLA, {}, ESPERA)
    expect(screen.getByRole("dialog")).toBe(dialogo)
    expect(document.activeElement).toBe(motivo)
    falla = false
    await recargar(queryClient)
    await screen.findByRole("table", { hidden: true }, ESPERA)
    await reposar()
    expect(screen.getByRole("dialog")).toBe(dialogo)
    expect(document.activeElement).toBe(motivo)
    expect(motivo).toHaveValue("Adeudo de octubre")
    alumnos = alumnos.filter((a) => a.id !== alumno(2).id)
    await recargar(queryClient)
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), ESPERA)
    await act(() => new Promise((r) => setTimeout(r, 50)))
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement).toBe(raiz())
  })

  it("ATQ-1G14: restringir con éxito y la recarga de la tabla falla: el foco va al h1, nunca a <body>", async () => {
    let falla = false
    tabla = (url) => (falla ? errorJson(500, "ERROR_INTERNO") : tablaDelDoble(url))
    accion = (metodo, ruta) => {
      if (metodo !== "PUT" || !ruta.endsWith("/acceso")) return null
      falla = true
      return respuestaJson(200, { ...alumno(2), accesoRestringido: true })
    }
    await montarConTabla()
    fireEvent.click(botonDeAcceso(2))
    const dialogo = await screen.findByRole("dialog")
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, restringir" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), ESPERA)
    await screen.findByText(ERROR_TABLA, {}, ESPERA)
    await reposar()
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement).toBe(encabezado())
  })

  it("ATQ-1G15: restringir con éxito pero la recarga trae la fila sin restricción (otro admin la restableció): el foco no se queda en <body>", async () => {
    accion = (metodo, ruta) =>
      metodo === "PUT" && ruta.endsWith("/acceso")
        ? respuestaJson(200, { ...alumno(2), accesoRestringido: true })
        : null
    await montarConTabla()
    fireEvent.click(botonDeAcceso(2))
    const dialogo = await screen.findByRole("dialog")
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, restringir" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), ESPERA)
    await waitFor(
      () =>
        expect(
          peticiones("GET", "/api/admin/usuarios").filter(
            (l) => l.url.searchParams.get("rol") === "estudiante",
          ).length,
        ).toBeGreaterThan(1),
      ESPERA,
    )
    await reposar()
    await act(() => new Promise((r) => setTimeout(r, 50)))
    expect(document.activeElement).not.toBe(document.body)
  })
})

describe("ATQ-1G R1 · el 401 con el refresco fallido (punto 7)", () => {
  it("ATQ-1G16: en la primera carga de la tabla: ningún mensaje, ningún aviso y nada en espera", async () => {
    refrescoFalla = true
    tabla = () => errorJson(401, "NO_AUTENTICADO")
    await montar()
    await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/login"), ESPERA)
    await reposar()
    expect(alertasEnElDocumento()).toHaveLength(0)
    expect(screen.queryByText(ERROR_TABLA)).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(0)
  })

  it("ATQ-1G17: en una recarga con la tabla a la vista: la tabla se queda, sin mensaje ni aviso", async () => {
    const { queryClient } = await montarConTabla()
    refrescoFalla = true
    tabla = () => errorJson(401, "NO_AUTENTICADO")
    await recargar(queryClient)
    await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/login"), ESPERA)
    await reposar()
    expect(screen.getByRole("table")).toBeInTheDocument()
    expect(alertasEnElDocumento()).toHaveLength(0)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("ATQ-1G18: con el mensaje de otra fila a la vista, un 401 en «Marcar…»: el mensaje viejo se va y no sale ninguno", async () => {
    accion = (metodo, ruta, cuerpo) => {
      if (metodo !== "PUT" || ruta !== RUTA_LOTE) return null
      const { alumnoIds } = cuerpo as { alumnoIds: string[] }
      if (alumnoIds[0] === alumno(1).id) return errorJson(500, "ERROR_INTERNO")
      return errorJson(401, "NO_AUTENTICADO")
    }
    await montarConTabla()
    fireEvent.click(botonDeMarcar(1))
    await within(filaDe(1)).findByRole("alert", {}, ESPERA)
    refrescoFalla = true
    fireEvent.click(botonDeMarcar(3))
    await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/login"), ESPERA)
    await reposar()
    expect(alertasEnElDocumento()).toHaveLength(0)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(0)
  })

  it.each([["«Marcar…» de la fila"], ["«Restablecer» de la fila"]])(
    "ATQ-1G19: con %s en vuelo y la vista desmontada (otra sección), un 401 no avisa",
    async (donde) => {
      const pendiente = diferida()
      alumnos = [alumno(1, "deudor", { accesoRestringido: true }), alumno(2), alumno(3, "deudor")]
      accion = (metodo) => (metodo === "PUT" ? pendiente.promesa : null)
      await montarConTabla()
      if (donde === "«Marcar…» de la fila") fireEvent.click(botonDeMarcar(3))
      if (donde === "«Restablecer» de la fila") fireEvent.click(botonDeAcceso(1))
      await waitFor(() => expect(llamadas.filter((l) => l.metodo === "PUT")).toHaveLength(1))
      const nav = screen.getByRole("navigation", { name: "Navegación principal" })
      fireEvent.click(within(nav).getByRole("link", { name: "Movimientos" }))
      await screen.findByRole("heading", { level: 1, name: "Movimientos de inscripción" }, ESPERA)
      refrescoFalla = true
      await act(async () => {
        pendiente.resolver(errorJson(401, "NO_AUTENTICADO"))
      })
      await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/login"), ESPERA)
      await reposar()
      expect(aviso.error).not.toHaveBeenCalled()
      expect(alertasEnElDocumento()).toHaveLength(0)
    },
  )

  it("ATQ-1G20: el lote en vuelo y el diálogo desmontado con el historial: un 401 no avisa", async () => {
    const pendiente = diferida()
    accion = (metodo) => (metodo === "PUT" ? pendiente.promesa : null)
    const { router } = await montar(false, "/admin/movimientos")
    await act(async () => {
      await router.navigate("/admin/estado-pago")
    })
    await screen.findByRole("table", {}, ESPERA)
    fireEvent.click(casilla(1))
    fireEvent.click(boton("Marcar al corriente"))
    const dialogo = await screen.findByRole("dialog")
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, cambiar" }))
    await waitFor(() => expect(peticiones("PUT", RUTA_LOTE)).toHaveLength(1))
    await act(async () => {
      await router.navigate(-1)
    })
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin/movimientos"))
    refrescoFalla = true
    await act(async () => {
      pendiente.resolver(errorJson(401, "NO_AUTENTICADO"))
    })
    await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/login"), ESPERA)
    await reposar()
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("ATQ-1G R1 · M-26: el área de la casilla (punto 9)", () => {
  it("ATQ-1G21: pulsar la etiqueta (el borde del área, fuera de la casilla) marca y desmarca una sola vez, en la fila y en la cabecera", async () => {
    await montarConTabla()
    const etiqueta = casilla(1).closest("label")
    if (etiqueta === null) throw new Error("Precondición: la casilla vive en una etiqueta")
    fireEvent.click(etiqueta)
    expect(casilla(1)).toBeChecked()
    expect(screen.getByText("1 seleccionado")).toBeInTheDocument()
    fireEvent.click(etiqueta)
    expect(casilla(1)).not.toBeChecked()
    expect(screen.queryByText(/seleccionad/)).toBeNull()
    const cabecera = casillaDeLaCabecera().closest("label")
    if (cabecera === null)
      throw new Error("Precondición: la casilla de la cabecera en una etiqueta")
    fireEvent.click(cabecera)
    expect(screen.getByText("3 seleccionados")).toBeInTheDocument()
    fireEvent.click(cabecera)
    expect(screen.queryByText(/seleccionad/)).toBeNull()
    expect(within(filaDe(1)).getAllByRole("checkbox")).toHaveLength(1)
    expect(etiqueta.querySelectorAll("input")).toHaveLength(1)
  })
})
