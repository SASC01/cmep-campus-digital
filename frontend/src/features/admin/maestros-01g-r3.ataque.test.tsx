import { notifyManager, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { StrictMode, type ReactNode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Ataque del Tester (ADMIN-01g, ronda 3, la última) sobre /admin/maestros: puntos 1 (ir y regresar
// antes del staleTime con la primera carga de enlaces en error y con registrados en error, y el historial
// con registrados en error), 2 (los dos ganchos de foco de tabla-enlaces.tsx en el mismo turno, también
// con <StrictMode>), 3 (pulsar «Maestros» varias veces, con la lista recargando por otra causa y con dos
// listas de registrados en error) y 4 (un 5xx seguido de un 401 en el reintento; un 403
// ACCESO_RESTRINGIDO en las dos listas) de "Puntos de ataque para la ronda 3" (revision.md, "##
// Verificación de la corrección de la ronda 2 — ADMIN-01g"). Router real y un QueryClient con la
// configuración de app/providers.tsx. El servidor es un doble en memoria.

const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))
vi.mock("@/services/navegacion", () => navegacion)
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const ESPERA = { timeout: 4000 }
const RUTA_ENLACES = "/api/admin/enlaces-registro"
const GENERICO = "No pudimos completar la operación. Inténtalo de nuevo."

const enlace = (n: number, extra: object = {}) => ({
  id: `8a2b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`,
  creadoEn: `2030-01-${String(10 + n).padStart(2, "0")}T15:00:00.000Z`,
  expiraEn: "2030-03-19T15:00:00.000Z",
  revocadoEn: null,
  estado: "vigente",
  registrados: 1,
  ...extra,
})

const registrado = (n: number, nombre = `Maestro ${String(n)}`) => ({
  id: `9b3b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`,
  nombre,
  email: `m${String(n)}@x.mx`,
  creadoEn: "2030-01-12T15:00:00.000Z",
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface Llamada {
  metodo: string
  url: URL
}

type Respuesta = Response | Promise<Response>

let llamadas: Llamada[] = []
let refrescoFalla = false
let manejador: (metodo: string, url: URL) => Respuesta | null = () => null

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  llamadas = []
  refrescoFalla = false
  manejador = () => null
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://local")
      const metodo = init?.method ?? "GET"
      llamadas.push({ metodo, url })
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
      const propia = manejador(metodo, url)
      if (propia !== null) return Promise.resolve(propia)
      if (metodo === "GET" && url.pathname === RUTA_ENLACES) {
        return Promise.resolve(respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: null }))
      }
      if (metodo === "GET" && url.pathname.endsWith("/registrados")) {
        return Promise.resolve(
          respuestaJson(200, { registrados: [registrado(1)], siguienteCursor: null }),
        )
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

const montar = async (estricto = false) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: ["/admin/maestros"] })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
  const arbol: ReactNode = (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  render(estricto ? <StrictMode>{arbol}</StrictMode> : arbol)
  await screen.findByRole("button", { name: "Enviar invitaciones" }, ESPERA)
  return { router, queryClient }
}

const diferida = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver: (respuesta: Response) => resolver(respuesta) }
}

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const filaDeEnlace = (n: number) => {
  const fila = document.querySelector<HTMLElement>(`[data-enlace-id="${enlace(n).id}"]`)
  if (fila === null) throw new Error(`Precondición: la fila del enlace ${String(n)}`)
  return fila
}

// El primer botón de la fila: «Ver registrados» u «Ocultar registrados».
const botonDeExpandir = (n: number) => {
  const boton = within(filaDeEnlace(n)).getAllByRole("button")[0]
  if (boton === undefined)
    throw new Error(`Precondición: el botón de expandir del enlace ${String(n)}`)
  return boton
}

const conCursor = (sufijo: string) =>
  llamadas.filter(
    (l) =>
      l.metodo === "GET" && l.url.pathname.endsWith(sufijo) && l.url.searchParams.has("cursor"),
  )

const primerasDe = (sufijo: string) =>
  llamadas.filter(
    (l) =>
      l.metodo === "GET" && l.url.pathname.endsWith(sufijo) && !l.url.searchParams.has("cursor"),
  )

const alertas = () => document.querySelectorAll('[role="alert"]')

const irAMovimientosYVolver = async () => {
  const nav = () => screen.getByRole("navigation", { name: "Navegación principal" })
  fireEvent.click(within(nav()).getByRole("link", { name: "Movimientos" }))
  await screen.findByRole("heading", { level: 1, name: "Movimientos de inscripción" }, ESPERA)
  fireEvent.click(within(nav()).getByRole("link", { name: "Maestros" }))
  await screen.findByRole("button", { name: "Enviar invitaciones" }, ESPERA)
  await reposar()
}

const pulsarMaestros = () => {
  const nav = screen.getByRole("navigation", { name: "Navegación principal" })
  fireEvent.click(within(nav).getByRole("link", { name: "Maestros" }))
}

describe("ATQ-1G R3 · ir y regresar, y el historial, en /admin/maestros (punto 1)", () => {
  it("ATQ-1G56: la primera carga de enlaces en error; ir a otra sección y regresar antes del staleTime la vuelve a pedir y el texto desaparece", async () => {
    let falla = true
    manejador = (metodo, url) =>
      metodo === "GET" && url.pathname === RUTA_ENLACES && falla
        ? errorJson(500, "ERROR_INTERNO")
        : null
    await montar()
    expect(await screen.findByText(GENERICO, {}, ESPERA)).toBeInTheDocument()
    falla = false
    const antes = primerasDe(RUTA_ENLACES).length
    await irAMovimientosYVolver()
    await waitFor(() => expect(primerasDe(RUTA_ENLACES).length).toBeGreaterThan(antes), ESPERA)
    await waitFor(() => expect(screen.queryByText(GENERICO)).toBeNull(), ESPERA)
    expect(filaDeEnlace(1)).toBeInTheDocument()
  })

  it.each([["ir a otra sección y regresar"], ["atrás y adelante del historial"]])(
    "ATQ-1G57: una lista de registrados abierta y en error; %s: al abrirla de nuevo se pide y el texto desaparece",
    async (camino) => {
      let falla = true
      manejador = (metodo, url) =>
        metodo === "GET" && url.pathname.endsWith("/registrados") && falla
          ? errorJson(500, "ERROR_INTERNO")
          : null
      const { router } = await montar()
      fireEvent.click(await screen.findByRole("button", { name: /^Ver registrados/ }, ESPERA))
      expect(await screen.findByText(GENERICO, {}, ESPERA)).toBeInTheDocument()
      falla = false
      const antes = primerasDe("/registrados").length
      if (camino === "ir a otra sección y regresar") await irAMovimientosYVolver()
      if (camino === "atrás y adelante del historial") {
        await act(async () => {
          await router.navigate("/admin/movimientos")
        })
        await screen.findByRole("heading", { level: 1, name: "Movimientos de inscripción" }, ESPERA)
        await act(async () => {
          await router.navigate(-1)
        })
        await screen.findByRole("button", { name: "Enviar invitaciones" }, ESPERA)
        await act(async () => {
          await router.navigate(1)
        })
        await screen.findByRole("heading", { level: 1, name: "Movimientos de inscripción" }, ESPERA)
        await act(async () => {
          await router.navigate(-1)
        })
        await screen.findByRole("button", { name: "Enviar invitaciones" }, ESPERA)
        await reposar()
      }
      expect(screen.queryByText(GENERICO)).toBeNull()
      fireEvent.click(await screen.findByRole("button", { name: /^Ver registrados/ }, ESPERA))
      expect(await screen.findByText("Maestro 1", {}, ESPERA)).toBeInTheDocument()
      expect(primerasDe("/registrados").length).toBeGreaterThan(antes)
      expect(screen.queryByText(GENERICO)).toBeNull()
    },
  )
})

describe("ATQ-1G R3 · los dos ganchos de foco de la tabla de enlaces juntos (punto 2)", () => {
  it.each([
    ["sin StrictMode, la recarga quita la primera fila", false, false],
    ["con StrictMode, la recarga quita la primera fila", true, false],
    ["sin StrictMode, la recarga deja la lista vacía", false, true],
    ["con StrictMode, la recarga deja la lista vacía", true, true],
  ])(
    "ATQ-1G58: «Cargar más enlaces» con el foco; en el mismo turno la página siguiente trae solo repetidos y una recarga cambia la lista (%s): el foco salta una sola vez, a un destino válido",
    async (_caso, estricto, vacia) => {
      manejador = (metodo, url) =>
        metodo === "GET" && url.pathname === RUTA_ENLACES && !url.searchParams.has("cursor")
          ? respuestaJson(200, { enlaces: [enlace(1), enlace(2)], siguienteCursor: enlace(2).id })
          : null
      const { queryClient } = await montar(estricto)
      const cargarMas = await screen.findByRole("button", { name: "Cargar más enlaces" }, ESPERA)
      act(() => cargarMas.focus())
      expect(document.activeElement).toBe(cargarMas)
      const destinos: Element[] = []
      const anotar = (evento: FocusEvent) => {
        if (evento.target instanceof Element) destinos.push(evento.target)
      }
      document.addEventListener("focusin", anotar)
      const restantes = vacia ? [] : [enlace(2)]
      notifyManager.setScheduler((tarea) => tarea())
      try {
        act(() => {
          queryClient.setQueryData(["admin", "enlaces-registro"], {
            pages: [
              { enlaces: restantes, siguienteCursor: enlace(2).id },
              { enlaces: restantes, siguienteCursor: null },
            ],
            pageParams: [undefined, enlace(2).id],
          })
        })
      } finally {
        notifyManager.setScheduler((tarea) => setTimeout(tarea, 0))
      }
      await reposar()
      await act(() => new Promise((r) => setTimeout(r, 30)))
      document.removeEventListener("focusin", anotar)
      expect(screen.queryByRole("button", { name: "Cargar más enlaces" })).toBeNull()
      expect(document.activeElement).not.toBe(document.body)
      expect(destinos).toHaveLength(1)
      if (!vacia) {
        expect(document.querySelectorAll("[data-enlace-id]")).toHaveLength(1)
        expect(document.activeElement).toBe(botonDeExpandir(2))
      }
      if (vacia) {
        expect(document.querySelectorAll("[data-enlace-id]")).toHaveLength(0)
        expect(document.activeElement?.getAttribute("tabindex")).toBe("-1")
        expect(document.activeElement?.isConnected).toBe(true)
      }
    },
  )
})

describe("ATQ-1G R3 · pulsar «Maestros» (punto 3)", () => {
  it("ATQ-1G59: con la lista en error, pulsar «Maestros» tres veces seguidas deja una sola petición en vuelo y, al responder, el texto desaparece", async () => {
    let falla = true
    const pendiente = diferida()
    manejador = (metodo, url) => {
      if (metodo !== "GET" || url.pathname !== RUTA_ENLACES) return null
      return falla ? errorJson(500, "ERROR_INTERNO") : pendiente.promesa
    }
    await montar()
    expect(await screen.findByText(GENERICO, {}, ESPERA)).toBeInTheDocument()
    falla = false
    const antes = primerasDe(RUTA_ENLACES).length
    pulsarMaestros()
    pulsarMaestros()
    pulsarMaestros()
    await reposar()
    expect(primerasDe(RUTA_ENLACES).length - antes).toBe(1)
    await act(async () => {
      pendiente.resolver(respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: null }))
    })
    await reposar()
    await waitFor(() => expect(screen.queryByText(GENERICO)).toBeNull(), ESPERA)
    expect(filaDeEnlace(1)).toBeInTheDocument()
    expect(primerasDe(RUTA_ENLACES).length - antes).toBe(1)
  })

  it("ATQ-1G60: con la lista en error y recargando por otra causa, pulsar «Maestros» no lanza una segunda petición de la lista en vuelo", async () => {
    let fase: "error" | "recarga" = "error"
    const recarga = diferida()
    manejador = (metodo, url) => {
      if (metodo !== "GET" || url.pathname !== RUTA_ENLACES) return null
      if (url.searchParams.has("cursor")) return errorJson(500, "ERROR_INTERNO")
      if (fase === "recarga") return recarga.promesa
      return respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: enlace(1).id })
    }
    const { queryClient } = await montar()
    fireEvent.click(await screen.findByRole("button", { name: "Cargar más enlaces" }, ESPERA))
    expect(await screen.findByText(GENERICO, {}, ESPERA)).toBeInTheDocument()
    fase = "recarga"
    const antes = primerasDe(RUTA_ENLACES).length
    act(() => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "enlaces-registro"] })
    })
    await waitFor(() => expect(primerasDe(RUTA_ENLACES).length - antes).toBe(1))
    pulsarMaestros()
    await reposar()
    expect(primerasDe(RUTA_ENLACES).length - antes).toBe(1)
    await act(async () => {
      recarga.resolver(respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: null }))
    })
    await reposar()
    await waitFor(() => expect(screen.queryByText(GENERICO)).toBeNull(), ESPERA)
  })

  it("ATQ-1G61: dos listas de registrados en error a la vez; pulsar «Maestros» pide cada una una vez y los dos textos desaparecen", async () => {
    let falla = true
    manejador = (metodo, url) => {
      if (metodo !== "GET") return null
      if (url.pathname === RUTA_ENLACES) {
        return respuestaJson(200, { enlaces: [enlace(1), enlace(2)], siguienteCursor: null })
      }
      if (url.pathname.endsWith("/registrados")) {
        if (falla) return errorJson(500, "ERROR_INTERNO")
        const delSegundo = url.pathname.includes(enlace(2).id)
        return respuestaJson(200, {
          registrados: [registrado(delSegundo ? 3 : 1)],
          siguienteCursor: null,
        })
      }
      return null
    }
    await montar()
    await screen.findAllByRole("button", { name: /^Ver registrados/ }, ESPERA)
    fireEvent.click(botonDeExpandir(1))
    fireEvent.click(botonDeExpandir(2))
    await waitFor(() => expect(screen.getAllByText(GENERICO)).toHaveLength(2), ESPERA)
    falla = false
    const antes = primerasDe("/registrados")
    pulsarMaestros()
    pulsarMaestros()
    await reposar()
    await waitFor(() => expect(screen.queryByText(GENERICO)).toBeNull(), ESPERA)
    expect(screen.getByText("Maestro 1")).toBeInTheDocument()
    expect(screen.getByText("Maestro 3")).toBeInTheDocument()
    const nuevas = primerasDe("/registrados").slice(antes.length)
    expect(nuevas.filter((l) => l.url.pathname.includes(enlace(1).id))).toHaveLength(1)
    expect(nuevas.filter((l) => l.url.pathname.includes(enlace(2).id))).toHaveLength(1)
  })
})

describe("ATQ-1G R3 · T-04 y sus vecinos (punto 4)", () => {
  it.each([["«Cargar más enlaces»"], ["«Cargar más» de registrados"]])(
    "ATQ-1G62: en %s, un 5xx y un 401 con el refresco fallido en el reintento: una sola redirección, sin mensaje ni espera",
    async (donde) => {
      let intentos = 0
      manejador = (metodo, url) => {
        if (metodo !== "GET") return null
        if (url.searchParams.has("cursor")) {
          intentos += 1
          return intentos === 1 ? errorJson(500, "ERROR_INTERNO") : errorJson(401, "NO_AUTENTICADO")
        }
        if (url.pathname === RUTA_ENLACES) {
          return respuestaJson(200, {
            enlaces: [enlace(1)],
            siguienteCursor: donde === "«Cargar más enlaces»" ? enlace(1).id : null,
          })
        }
        if (url.pathname.endsWith("/registrados")) {
          return respuestaJson(200, {
            registrados: [registrado(1)],
            siguienteCursor: registrado(1).id,
          })
        }
        return null
      }
      await montar()
      if (donde === "«Cargar más» de registrados") {
        fireEvent.click(await screen.findByRole("button", { name: /^Ver registrados/ }, ESPERA))
      }
      const nombre =
        donde === "«Cargar más enlaces»" ? "Cargar más enlaces" : /^Cargar más registrados/
      const cargarMas = await screen.findByRole("button", { name: nombre }, ESPERA)
      refrescoFalla = true
      fireEvent.click(cargarMas)
      await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/login"), ESPERA)
      await act(() => new Promise((r) => setTimeout(r, 1500)))
      expect(navegacion.irA).toHaveBeenCalledTimes(1)
      expect(intentos).toBe(2)
      expect(
        conCursor(donde === "«Cargar más enlaces»" ? RUTA_ENLACES : "/registrados"),
      ).toHaveLength(2)
      expect(alertas()).toHaveLength(0)
      expect(screen.queryByText(GENERICO)).toBeNull()
      expect(aviso.error).not.toHaveBeenCalled()
      expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(0)
      if (donde === "«Cargar más enlaces»") expect(filaDeEnlace(1)).toBeInTheDocument()
      if (donde === "«Cargar más» de registrados") {
        expect(screen.getByText("Maestro 1")).toBeInTheDocument()
      }
    },
  )

  it.each([["la lista de enlaces"], ["una lista de registrados"]])(
    "ATQ-1G63: un 403 ACCESO_RESTRINGIDO en %s: una redirección a la pantalla de acceso restringido, sin mensaje, sin espera y sin reintento",
    async (donde) => {
      manejador = (metodo, url) => {
        if (metodo !== "GET") return null
        if (donde === "la lista de enlaces" && url.pathname === RUTA_ENLACES) {
          return errorJson(403, "ACCESO_RESTRINGIDO")
        }
        if (donde === "una lista de registrados" && url.pathname.endsWith("/registrados")) {
          return errorJson(403, "ACCESO_RESTRINGIDO")
        }
        return null
      }
      await montar()
      if (donde === "una lista de registrados") {
        fireEvent.click(await screen.findByRole("button", { name: /^Ver registrados/ }, ESPERA))
      }
      await waitFor(
        () => expect(navegacion.irA).toHaveBeenCalledWith("/acceso-restringido"),
        ESPERA,
      )
      await act(() => new Promise((r) => setTimeout(r, 1500)))
      expect(navegacion.irA).toHaveBeenCalledTimes(1)
      const sufijo = donde === "la lista de enlaces" ? RUTA_ENLACES : "/registrados"
      expect(primerasDe(sufijo)).toHaveLength(1)
      expect(alertas()).toHaveLength(0)
      expect(screen.queryByText(GENERICO)).toBeNull()
      expect(aviso.error).not.toHaveBeenCalled()
      expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(0)
    },
  )
})
