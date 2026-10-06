import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Tester, CLASES-02d, ronda 3. La corrección de T-08 en useFocoDeLaLista con el router de la
// aplicación: cambio de pestaña (visibilitychange sin blur), cambio de aplicación (blur de window sin
// visibilitychange), el reintento que falla o acierta con la ventana fuera, volver antes o después de
// la respuesta, el clic en blanco que sigue olvidando, el foco que pasa a otra clase de la lista y
// desmontar con el turno pendiente. Un navegador real, al perder la ventana, dispara blur y focusout
// sin relatedTarget sobre el control (que sigue enfocado y montado) y document.hasFocus() pasa a
// falso: así se simula.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

interface Clase {
  id: string
  nombre: string
}

interface Cuenta {
  id: string
  nombre: string
  correo: string
  clases: Clase[]
}

const idDe = (n: number) => `2a2b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(estado === 204 ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: estado === 204 ? {} : { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

interface Diferido {
  promesa: Promise<Response>
  resolver: (respuesta: Response) => void
}

const diferido = (): Diferido => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

const esBarra = (ruta: string) =>
  ruta.startsWith("/api/clases/inscritas?") && ruta.includes("limite=100")

const listaDe = (clases: Clase[], siguienteCursor: string | null = null) =>
  respuestaJson(200, {
    clases: clases.map((c) => ({ ...c, maestro: MAESTRO, maestros: [MAESTRO] })),
    total: clases.length,
    siguienteCursor,
  })

const crearServidor = (cuentas: Record<string, Cuenta>, inicial: string) => {
  const estado = {
    actual: inicial as string | null,
    barra: [] as (() => Response | Promise<Response>)[],
  }
  const fetchMock = vi.fn<typeof fetch>(async (entrada, init) => {
    const ruta = String(entrada)
    const c = estado.actual === null ? undefined : cuentas[estado.actual]
    if (ruta === "/api/auth/refrescar") {
      return c ? respuestaJson(200, { tokenAcceso: "t" }) : errorJson(401, "SESION_INVALIDA")
    }
    if (ruta === "/api/auth/logout") {
      estado.actual = null
      return respuestaJson(204, undefined)
    }
    if (ruta === "/api/auth/login" && init?.method === "POST") {
      const { email } = JSON.parse(String(init.body)) as { email: string }
      const clave = Object.keys(cuentas).find((k) => cuentas[k]?.correo === email)
      if (clave === undefined) return errorJson(401, "CREDENCIALES_INVALIDAS")
      estado.actual = clave
      return respuestaJson(200, { tokenAcceso: "t" })
    }
    if (!c) return errorJson(401, "NO_AUTENTICADO")
    if (ruta === "/api/me") {
      return respuestaJson(200, {
        id: c.id,
        nombre: c.nombre,
        email: c.correo,
        rol: "estudiante",
        debeCambiarContrasena: false,
        accesoRestringido: false,
      })
    }
    if (esBarra(ruta)) {
      const siguiente = estado.barra.shift()
      if (siguiente) return siguiente()
      return listaDe(c.clases)
    }
    if (ruta.startsWith("/api/clases/inscritas")) return listaDe(c.clases.slice(0, 20))
    return errorJson(500, "ERROR_INTERNO")
  })
  vi.stubGlobal("fetch", fetchMock)
  const barra = () => fetchMock.mock.calls.map(([e]) => String(e)).filter(esBarra)
  return { estado, barra }
}

const renderEn = async (ruta: string) => {
  const { rutas } = await import("./router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, queryClient }
}

const esperar = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))
const navMontada = () => screen.findByRole("navigation", { name: "Navegación principal" })
const nav = () => screen.getByRole("navigation", { name: "Navegación principal" })
const lista = async () => within(await navMontada()).findByRole("list", { name: "Mis clases" })
const reintentar = async () =>
  within(await navMontada()).findByRole("button", { name: /Reintentar/ })
const inicio = () => within(nav()).getByRole("link", { name: "Inicio" })
const invalidarBarra = (queryClient: QueryClient) =>
  act(() => queryClient.invalidateQueries({ queryKey: ["clases", "inscritas", "barra"] }))

const ana = (clases: Clase[]): Cuenta => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  correo: "ana@ejemplo.mx",
  clases,
})

const A = { id: idDe(1), nombre: "Álgebra I" }
const B = { id: idDe(2), nombre: "Historia" }
const C = { id: idDe(3), nombre: "Química" }

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

interface Salida {
  blurDeLaVentana?: boolean
  visibilidad?: boolean
}

const espiarVentana = () => ({
  foco: vi.spyOn(document, "hasFocus"),
  oculta: vi.spyOn(document, "hidden", "get"),
})

const salir = async (control: HTMLElement, opciones: Salida = { blurDeLaVentana: true }) => {
  const ventana = espiarVentana()
  ventana.foco.mockReturnValue(false)
  ventana.oculta.mockReturnValue(opciones.visibilidad === true)
  act(() => {
    fireEvent.blur(control, { relatedTarget: null })
    fireEvent.focusOut(control, { relatedTarget: null })
    if (opciones.blurDeLaVentana === true) window.dispatchEvent(new FocusEvent("blur"))
    if (opciones.visibilidad === true) document.dispatchEvent(new Event("visibilitychange"))
  })
  await esperar(20)
  return ventana
}

// La ventana recupera el foco y el navegador lo devuelve al control, si sigue montado.
const volver = async (ventana: ReturnType<typeof espiarVentana>, control?: HTMLElement) => {
  ventana.foco.mockReturnValue(true)
  ventana.oculta.mockReturnValue(false)
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"))
    window.dispatchEvent(new FocusEvent("focus"))
    if (control?.isConnected === true) {
      fireEvent.focus(control)
      fireEvent.focusIn(control)
    }
  })
  await esperar(20)
}

// «Reintentar» enfocado, con un reintento en vuelo que responde lo que se le diga después.
const reintentoEnVuelo = async (clases: Clase[]) => {
  const servidor = crearServidor({ ana: ana(clases) }, "ana")
  servidor.estado.barra.push(() => errorJson(500, "ERROR_INTERNO"))
  const montaje = await renderEn("/estudiante")
  const boton = await reintentar()
  const enVuelo = diferido()
  servidor.estado.barra.push(() => enVuelo.promesa)
  act(() => boton.focus())
  fireEvent.click(boton)
  await waitFor(() => expect(boton).toHaveAttribute("aria-busy", "true"))
  return { servidor, boton, enVuelo, ...montaje }
}

describe("ataque CLASES-02d r3: T-08 y sus estados vecinos en la barra", () => {
  it("cambio de pestaña con visibilitychange y sin blur de la ventana: la lista llega oculta y, al volver, el foco está en el primer enlace", async () => {
    const { boton, enVuelo } = await reintentoEnVuelo([A, B])
    const ventana = await salir(boton, { blurDeLaVentana: false, visibilidad: true })
    enVuelo.resolver(listaDe([A, B]))
    const ul = await lista()
    await esperar(30)
    await volver(ventana)
    expect(document.activeElement).toBe(within(ul).getAllByRole("link")[0])
  })

  it("cambio de aplicación (blur de la ventana sin visibilitychange) y 0 clases: al volver, el foco está en «Inicio»", async () => {
    const { boton, enVuelo } = await reintentoEnVuelo([])
    const ventana = await salir(boton)
    enVuelo.resolver(listaDe([]))
    await waitFor(() => expect(boton.isConnected).toBe(false))
    await esperar(30)
    await volver(ventana)
    expect(document.activeElement).toBe(inicio())
  })

  it("el reintento falla con la ventana fuera: al volver, el mismo botón tiene el foco; el siguiente acierta y va al primer enlace", async () => {
    const { servidor, boton, enVuelo } = await reintentoEnVuelo([A, B])
    const ventana = await salir(boton)
    enVuelo.resolver(errorJson(500, "ERROR_INTERNO"))
    await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy", "true"))
    await volver(ventana, boton)
    expect(boton.isConnected).toBe(true)
    expect(document.activeElement).toBe(boton)
    servidor.estado.barra.push(() => listaDe([A, B]))
    fireEvent.click(boton)
    const ul = await lista()
    await waitFor(() => expect(document.activeElement).toBe(within(ul).getAllByRole("link")[0]))
  })

  it("vuelve antes de la respuesta (el navegador devuelve el foco al botón): al llegar la lista, el foco va al primer enlace", async () => {
    const { boton, enVuelo } = await reintentoEnVuelo([A, B])
    const ventana = await salir(boton)
    await volver(ventana, boton)
    expect(document.activeElement).toBe(boton)
    enVuelo.resolver(listaDe([A, B]))
    const ul = await lista()
    await waitFor(() => expect(document.activeElement).toBe(within(ul).getAllByRole("link")[0]))
  })

  it("vuelve antes de la respuesta y hace clic en blanco: la lista que llega no le devuelve el foco", async () => {
    const { boton, enVuelo } = await reintentoEnVuelo([A, B])
    const ventana = await salir(boton)
    await volver(ventana, boton)
    act(() => boton.blur())
    await esperar(20)
    enVuelo.resolver(listaDe([A, B]))
    await lista()
    await esperar(30)
    expect(document.activeElement).toBe(document.body)
  })

  it("el foco pasa con Tab de una clase a otra de la lista (relatedTarget) y esa sale: el foco va al primer enlace, no a <body>", async () => {
    const servidor = crearServidor({ ana: ana([A, B, C]) }, "ana")
    const { queryClient } = await renderEn("/estudiante")
    const ul = await lista()
    const historia = within(ul).getByRole("link", { name: "Historia" })
    const quimica = within(ul).getByRole("link", { name: "Química" })
    act(() => historia.focus())
    act(() => {
      fireEvent.focusOut(historia, { relatedTarget: quimica })
      quimica.focus()
    })
    await esperar(20)
    servidor.estado.barra.push(() => listaDe([A, B]))
    await invalidarBarra(queryClient)
    await waitFor(() => expect(quimica.isConnected).toBe(false))
    await waitFor(() =>
      expect(document.activeElement).toBe(within(ul).getByRole("link", { name: "Álgebra I" })),
    )
  })

  it("desmontar el marco con el turno del focusout pendiente no da errores ni avisos de React", async () => {
    const consola = { error: vi.spyOn(console, "error"), warn: vi.spyOn(console, "warn") }
    const servidor = crearServidor({ ana: ana([A]) }, "ana")
    servidor.estado.barra.push(() => errorJson(500, "ERROR_INTERNO"))
    const { router } = await renderEn("/estudiante")
    const boton = await reintentar()
    act(() => boton.focus())
    await act(async () => {
      fireEvent.focusOut(boton, { relatedTarget: null })
      await router.navigate("/login")
    })
    await esperar(50)
    expect(router.state.location.pathname).toBe("/login")
    expect(consola.error).not.toHaveBeenCalled()
    expect(consola.warn).not.toHaveBeenCalled()
  })
})
