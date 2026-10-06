import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Tester, CLASES-02d, ronda 2. La corrección de T-07 (useFocoDeLaLista) con el router de la
// aplicación y sus estados vecinos: datos → 0 clases con el foco en la última clase, reintentos
// encadenados, el foco en un destino de la nav durante el reintento, la ventana que pierde el foco
// mientras el reintento está en vuelo, 101 → 100 con el foco en «Ver todas», el cambio de cuenta,
// la primera carga y el foco que la persona llevó fuera de la lista. Por rol, nombre y texto.

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

// Lo que jsdom permite ver del orden de tabulación: el destino es enfocable, no tiene tabindex
// negativo ni positivo, y Tab sigue a otro control después de él (no es un tope).
const tabulables = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>("a[href], button, input, textarea, select, [tabindex]"),
  ).filter((e) => e.getAttribute("tabindex") !== "-1" && e.getAttribute("aria-hidden") !== "true")

const sinTopes = (destino: HTMLElement) => {
  expect(destino.getAttribute("tabindex")).toBeNull()
  expect(
    document.querySelectorAll('[tabindex]:not([tabindex="-1"]):not([tabindex="0"])'),
  ).toHaveLength(0)
  const orden = tabulables()
  const i = orden.indexOf(destino)
  expect(i, "el destino no está en el orden de tabulación").toBeGreaterThan(-1)
  expect(orden[i + 1], "nada después del destino").toBeDefined()
  // Antes puede no haber nada: «Inicio» es el primer control del documento (Mayús+Tab sale al
  // navegador, sin trampa).
}

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ataque CLASES-02d r2: T-07 y sus estados vecinos", () => {
  it("reintentos encadenados (falla, falla, acierta): el botón conserva el foco y al final va al primer enlace, sin topes", async () => {
    const servidor = crearServidor({ ana: ana([A, B]) }, "ana")
    servidor.estado.barra.push(
      () => errorJson(500, "ERROR_INTERNO"),
      () => errorJson(500, "ERROR_INTERNO"),
      () => errorJson(503, "BASE_DE_DATOS_NO_DISPONIBLE"),
    )
    await renderEn("/estudiante")
    const boton = await reintentar()
    act(() => boton.focus())
    for (let i = 0; i < 2; i += 1) {
      fireEvent.click(boton)
      await waitFor(() => expect(servidor.barra()).toHaveLength(i + 2))
      await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy", "true"))
      expect(boton.isConnected).toBe(true)
      expect(document.activeElement).toBe(boton)
    }
    fireEvent.click(boton)
    const ul = await lista()
    await waitFor(() => expect(document.activeElement).toBe(within(ul).getAllByRole("link")[0]))
    sinTopes(document.activeElement as HTMLElement)
  })

  it("con el foco en «Inicio» durante el reintento, el foco no se mueve cuando llega la lista", async () => {
    const servidor = crearServidor({ ana: ana([A]) }, "ana")
    servidor.estado.barra.push(() => errorJson(500, "ERROR_INTERNO"))
    await renderEn("/estudiante")
    const boton = await reintentar()
    const enVuelo = diferido()
    servidor.estado.barra.push(() => enVuelo.promesa)
    act(() => boton.focus())
    fireEvent.click(boton)
    await waitFor(() => expect(boton).toHaveAttribute("aria-busy", "true"))
    act(() => inicio().focus())
    enVuelo.resolver(listaDe([A]))
    await lista()
    await esperar(50)
    expect(document.activeElement).toBe(inicio())
  })

  it("con el foco en el campo «Código de la clase» durante el reintento, el foco no se mueve", async () => {
    const servidor = crearServidor({ ana: ana([A]) }, "ana")
    servidor.estado.barra.push(() => errorJson(500, "ERROR_INTERNO"))
    await renderEn("/estudiante")
    const boton = await reintentar()
    const enVuelo = diferido()
    servidor.estado.barra.push(() => enVuelo.promesa)
    act(() => boton.focus())
    fireEvent.click(boton)
    const campo = screen.getByLabelText("Código de la clase")
    act(() => campo.focus())
    enVuelo.resolver(listaDe([A]))
    await lista()
    await esperar(50)
    expect(document.activeElement).toBe(campo)
  })

  it("la ventana pierde el foco con el reintento en vuelo y la lista llega mientras tanto: al volver, el foco no está en <body>", async () => {
    const servidor = crearServidor({ ana: ana([A, B]) }, "ana")
    servidor.estado.barra.push(() => errorJson(500, "ERROR_INTERNO"))
    await renderEn("/estudiante")
    const boton = await reintentar()
    const enVuelo = diferido()
    servidor.estado.barra.push(() => enVuelo.promesa)
    act(() => boton.focus())
    fireEvent.click(boton)
    await waitFor(() => expect(boton).toHaveAttribute("aria-busy", "true"))
    // Otra pestaña o aplicación: el navegador dispara blur y focusout sobre el control enfocado,
    // sin relatedTarget, y el control sigue siendo document.activeElement y sigue montado.
    act(() => {
      fireEvent.blur(boton, { relatedTarget: null })
      fireEvent.focusOut(boton, { relatedTarget: null })
      window.dispatchEvent(new FocusEvent("blur"))
    })
    expect(document.activeElement).toBe(boton)
    enVuelo.resolver(listaDe([A, B]))
    await lista()
    await esperar(50)
    // La persona vuelve: la ventana recupera el foco; el navegador no lo devuelve a un control que
    // ya no existe.
    act(() => {
      window.dispatchEvent(new FocusEvent("focus"))
    })
    await esperar(50)
    expect(
      document.activeElement,
      "al volver a la pestaña, el foco de «Reintentar» quedó en <body>",
    ).not.toBe(document.body)
    expect(nav().contains(document.activeElement)).toBe(true)
  })

  it("datos → 0 clases con el foco en la última clase: el foco va a «Inicio», sin topes", async () => {
    const servidor = crearServidor({ ana: ana([A, B, C]) }, "ana")
    const { queryClient } = await renderEn("/estudiante")
    const ul = await lista()
    const ultima = within(ul).getByRole("link", { name: "Química" })
    act(() => ultima.focus())
    servidor.estado.barra.push(() => listaDe([]))
    await invalidarBarra(queryClient)
    await waitFor(() => expect(ul.isConnected).toBe(false))
    await waitFor(() => expect(document.activeElement).toBe(inicio()))
    sinTopes(inicio())
  })

  it("con el foco en la segunda clase y una recarga que trae otras: el foco va al primer enlace que queda, no a <body>", async () => {
    const servidor = crearServidor({ ana: ana([A, B]) }, "ana")
    const { queryClient } = await renderEn("/estudiante")
    const ul = await lista()
    act(() => within(ul).getByRole("link", { name: "Historia" }).focus())
    servidor.estado.barra.push(() => listaDe([C]))
    await invalidarBarra(queryClient)
    await within(ul).findByRole("link", { name: "Química" })
    await waitFor(() =>
      expect(document.activeElement).toBe(within(ul).getByRole("link", { name: "Química" })),
    )
  })

  it("101 → 100 clases con el foco en «Ver todas»: el foco queda en la lista, no en <body>", async () => {
    const clases = Array.from({ length: 101 }, (_, i) => ({
      id: idDe(i + 1),
      nombre: `Clase ${String(i + 1)}`,
    }))
    const servidor = crearServidor({ ana: ana(clases) }, "ana")
    servidor.estado.barra.push(() => listaDe(clases.slice(0, 100), idDe(100)))
    const { queryClient } = await renderEn("/estudiante")
    const ul = await lista()
    const verTodas = within(ul).getByRole("link", { name: "Ver todas" })
    act(() => verTodas.focus())
    servidor.estado.barra.push(() => listaDe(clases.slice(0, 100)))
    await invalidarBarra(queryClient)
    await waitFor(() => expect(verTodas.isConnected).toBe(false))
    await esperar(30)
    expect(document.activeElement).not.toBe(document.body)
    expect(ul.contains(document.activeElement)).toBe(true)
  })

  it("primera carga: con el foco en <body> o en el campo del código, la lista que llega no lo mueve", async () => {
    const servidor = crearServidor({ ana: ana([A]) }, "ana")
    const tarde = diferido()
    servidor.estado.barra.push(() => tarde.promesa)
    const { queryClient } = await renderEn("/estudiante")
    const campo = await screen.findByLabelText("Código de la clase")
    expect(document.activeElement).toBe(document.body)
    tarde.resolver(listaDe([A]))
    await lista()
    await esperar(30)
    expect(document.activeElement).toBe(document.body)

    act(() => campo.focus())
    servidor.estado.barra.push(() => listaDe([A, B]))
    await invalidarBarra(queryClient)
    await within(nav()).findByRole("link", { name: "Historia" })
    await esperar(30)
    expect(document.activeElement).toBe(campo)
  })

  it("el foco que la persona llevó de la lista al contenido no vuelve a la lista cuando esta cambia", async () => {
    const servidor = crearServidor({ ana: ana([A, B]) }, "ana")
    const { queryClient } = await renderEn("/estudiante")
    const ul = await lista()
    act(() => within(ul).getByRole("link", { name: "Historia" }).focus())
    const campo = screen.getByLabelText("Código de la clase")
    act(() => campo.focus())
    servidor.estado.barra.push(() => listaDe([C]))
    await invalidarBarra(queryClient)
    await within(ul).findByRole("link", { name: "Química" })
    await esperar(30)
    expect(document.activeElement).toBe(campo)
  })

  it("cambio de cuenta con el foco en la lista: la cuenta nueva no recibe el foco en su lista al llegar", async () => {
    const beto: Cuenta = {
      id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d7f",
      nombre: "Beto Ruiz",
      correo: "beto@ejemplo.mx",
      clases: [C],
    }
    crearServidor({ ana: ana([A, B]), beto }, "ana")
    const { router } = await renderEn("/estudiante")
    const ul = await lista()
    act(() => within(ul).getByRole("link", { name: "Historia" }).focus())
    // La sesión se cierra desde la barra superior: el marco se desmonta con la navegación.
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    const correo = await screen.findByLabelText("Correo")
    fireEvent.change(correo, { target: { value: "beto@ejemplo.mx" } })
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "clave-de-beto" } })
    const entrar = screen.getByRole("button", { name: "Iniciar sesión" })
    act(() => entrar.focus())
    fireEvent.click(entrar)
    await screen.findByText("Hola, Beto Ruiz")
    const nueva = await lista()
    expect(within(nueva).getByRole("link", { name: "Química" })).toBeInTheDocument()
    await esperar(50)
    expect(
      nueva.contains(document.activeElement),
      "el foco saltó a la lista de la cuenta nueva",
    ).toBe(false)
  })
})
