import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { StrictMode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// ADMIN-01g, ronda 2 (T-04, T-05 y T-06): las dos listas de /admin/maestros ante un 401 sin sesión, una
// recarga que reemplaza o cambia la tabla con el foco dentro, y pulsar «Maestros» estando ahí. Router real y
// Providers (staleTime de 30 s; las consultas del módulo no reintentan un 4xx y reintentan un 5xx una vez).
// Para provocar una recarga de la lista se genera un enlace: con éxito, la lista se marca vieja y se pide.

const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))
vi.mock("@/services/navegacion", () => navegacion)
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const ESPERA = { timeout: 4000 }
const RUTA_ENLACES = "/api/admin/enlaces-registro"
const ERROR_DE_LA_LISTA = "No pudimos completar la operación. Inténtalo de nuevo."

const enlace = (n: number, estado = "vigente") => ({
  id: `2a2b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`,
  creadoEn: `2030-01-${String(10 + n).padStart(2, "0")}T15:00:00.000Z`,
  expiraEn: "2030-03-19T15:00:00.000Z",
  revocadoEn: null,
  estado,
  registrados: 1,
})

const registrado = (n: number) => ({
  id: `3a3b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`,
  nombre: `Maestro ${String(n)}`,
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

let llamadas: Llamada[] = []
let refrescoFalla = false
let lista: (url: URL) => Response = () =>
  respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: null })
let registrados: (url: URL) => Response = () =>
  respuestaJson(200, { registrados: [registrado(1)], siguienteCursor: null })

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  llamadas = []
  refrescoFalla = false
  navegacion.irA.mockClear()
  lista = () => respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: null })
  registrados = () => respuestaJson(200, { registrados: [registrado(1)], siguienteCursor: null })
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
            : respuestaJson(200, { tokenAcceso: "t" }),
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
      if (metodo === "POST" && url.pathname === RUTA_ENLACES) {
        return Promise.resolve(respuestaJson(201, { enlace: enlace(9), token: "t".repeat(43) }))
      }
      if (metodo === "POST" && url.pathname.endsWith("/revocar")) {
        return Promise.resolve(respuestaJson(200, { enlace: enlace(1, "revocado") }))
      }
      if (metodo === "GET" && url.pathname === RUTA_ENLACES) return Promise.resolve(lista(url))
      if (metodo === "GET" && url.pathname.endsWith("/registrados")) {
        return Promise.resolve(registrados(url))
      }
      return Promise.resolve(errorJson(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

const montar = async (estricto = false) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: ["/admin/maestros"] })
  const app = (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  )
  render(estricto ? <StrictMode>{app}</StrictMode> : app)
  await screen.findByRole("button", { name: "Enviar invitaciones" }, ESPERA)
  return router
}

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const peticionesDeLaLista = () =>
  llamadas.filter((l) => l.metodo === "GET" && l.url.pathname === RUTA_ENLACES)

// La raíz de la tabla de enlaces: el contenedor con tabIndex -1 que envuelve la lista (o su error).
const raizDeLaTabla = () => {
  const dentro = document.querySelector("[data-enlace-id]") ?? screen.queryByText(ERROR_DE_LA_LISTA)
  const raiz = dentro?.closest('[tabindex="-1"]') ?? null
  if (raiz === null) throw new Error("Precondición: la tabla de enlaces tiene su raíz")
  return raiz
}

// Genera un enlace (sin mover el foco): con éxito, la lista se marca vieja y se vuelve a pedir.
const provocarRecarga = () => {
  fireEvent.change(screen.getByLabelText("Vigencia en días"), { target: { value: "10" } })
  fireEvent.click(screen.getByRole("button", { name: "Generar enlace" }))
}

const enLaBarra = async (seccion: string) => {
  const nav = screen.getByRole("navigation", { name: "Navegación principal" })
  fireEvent.click(within(nav).getByRole("link", { name: seccion }))
  await reposar()
}

describe("ADMIN-01g, ronda 2 · un 401 sin sesión en las listas de /admin/maestros (T-04)", () => {
  it("T-04: un 401 con el refresco fallido en «Cargar más enlaces»: sale de la espera, sin mensaje ni aviso, y no sale otra petición", async () => {
    lista = (url) =>
      url.searchParams.has("cursor")
        ? errorJson(401, "NO_AUTENTICADO")
        : respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: enlace(1).id })
    await montar()
    const cargarMas = await screen.findByRole("button", { name: "Cargar más enlaces" }, ESPERA)
    refrescoFalla = true
    fireEvent.click(cargarMas)
    await waitFor(() => expect(navegacion.irA).toHaveBeenCalled(), ESPERA)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1500))
    })
    expect(peticionesDeLaLista().filter((l) => l.url.searchParams.has("cursor"))).toHaveLength(1)
    expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(0)
    expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("T-04: un 401 con el refresco fallido en «Cargar más» de registrados: sale de la espera, sin mensaje, y no sale otra petición", async () => {
    registrados = (url) =>
      url.searchParams.has("cursor")
        ? errorJson(401, "NO_AUTENTICADO")
        : respuestaJson(200, { registrados: [registrado(1)], siguienteCursor: registrado(1).id })
    await montar()
    fireEvent.click(await screen.findByRole("button", { name: /^Ver registrados/ }, ESPERA))
    const cargarMas = await screen.findByRole("button", { name: /^Cargar más registrados/ }, ESPERA)
    refrescoFalla = true
    fireEvent.click(cargarMas)
    await waitFor(() => expect(navegacion.irA).toHaveBeenCalled(), ESPERA)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1500))
    })
    expect(
      llamadas.filter(
        (l) => l.url.pathname.endsWith("/registrados") && l.url.searchParams.has("cursor"),
      ),
    ).toHaveLength(1)
    expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(0)
    expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0)
  })

  it("T-04 (estado vecino): un 401 con el refresco fallido en la primera carga de la lista: una sola petición, sin mensaje", async () => {
    lista = () => errorJson(401, "NO_AUTENTICADO")
    refrescoFalla = true
    await montar()
    await waitFor(() => expect(navegacion.irA).toHaveBeenCalled(), ESPERA)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1500))
    })
    expect(peticionesDeLaLista()).toHaveLength(1)
    expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0)
  })
})

describe("ADMIN-01g, ronda 2 · el foco cuando una recarga cambia la tabla de enlaces (T-05)", () => {
  const conRecargaQueFalla = () => {
    let fallar = false
    lista = () =>
      fallar
        ? errorJson(500, "ERROR_INTERNO")
        : respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: null })
    return () => {
      fallar = true
    }
  }

  it.each([
    ["«Revocar»", /^Revocar/],
    ["«Ver registrados»", /^Ver registrados/],
  ])(
    "T-05: con el foco en %s, una recarga que falla reemplaza la tabla: el foco va a la raíz de la tabla",
    async (_control, nombre) => {
      const empezarAFallar = conRecargaQueFalla()
      await montar()
      const control = await screen.findByRole("button", { name: nombre }, ESPERA)
      act(() => control.focus())
      empezarAFallar()
      provocarRecarga()
      expect(await screen.findByText(ERROR_DE_LA_LISTA, {}, ESPERA)).toBeInTheDocument()
      await reposar()
      expect(document.activeElement).not.toBe(document.body)
      expect(document.activeElement).toBe(raizDeLaTabla())
    },
  )

  it("T-05: con el foco en «Ocultar registrados», una recarga que falla reemplaza la tabla: el foco va a la raíz", async () => {
    const empezarAFallar = conRecargaQueFalla()
    await montar()
    fireEvent.click(await screen.findByRole("button", { name: /^Ver registrados/ }, ESPERA))
    const ocultar = await screen.findByRole("button", { name: /^Ocultar registrados/ }, ESPERA)
    act(() => ocultar.focus())
    empezarAFallar()
    provocarRecarga()
    expect(await screen.findByText(ERROR_DE_LA_LISTA, {}, ESPERA)).toBeInTheDocument()
    await reposar()
    expect(document.activeElement).toBe(raizDeLaTabla())
  })

  it("T-05: tras «Sí, revocar» (el foco vuelve a «Revocar») y una recarga que falla, el foco va a la raíz, nunca a <body>", async () => {
    let revocado = false
    lista = () =>
      revocado
        ? errorJson(500, "ERROR_INTERNO")
        : respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: null })
    await montar()
    fireEvent.click(await screen.findByRole("button", { name: /^Revocar/ }, ESPERA))
    const confirmar = screen.getByRole("button", { name: /^Sí, revocar/ })
    act(() => confirmar.focus())
    revocado = true
    fireEvent.click(confirmar)
    expect(await screen.findByText(ERROR_DE_LA_LISTA, {}, ESPERA)).toBeInTheDocument()
    await reposar()
    expect(document.activeElement).not.toBe(document.body)
  })

  it("T-05: una recarga 200 que quita la fila con el foco en su «Ver registrados» (otra persona la quitó) lleva el foco a la raíz", async () => {
    let quitar = false
    lista = () =>
      respuestaJson(200, {
        enlaces: quitar ? [enlace(2)] : [enlace(1), enlace(2)],
        siguienteCursor: null,
      })
    await montar()
    const fila = await waitFor(() => {
      const encontrada = document.querySelector<HTMLElement>(`[data-enlace-id="${enlace(1).id}"]`)
      if (encontrada === null) throw new Error("sin fila")
      return encontrada
    }, ESPERA)
    const ver = within(fila).getAllByRole("button")[0] as HTMLElement
    act(() => ver.focus())
    quitar = true
    provocarRecarga()
    await waitFor(
      () => expect(document.querySelector(`[data-enlace-id="${enlace(1).id}"]`)).toBeNull(),
      ESPERA,
    )
    await reposar()
    expect(document.activeElement).toBe(raizDeLaTabla())
  })

  it("T-05 con <StrictMode>: con el foco en «Revocar», una recarga que falla lleva el foco a la raíz", async () => {
    const empezarAFallar = conRecargaQueFalla()
    await montar(true)
    const revocar = await screen.findByRole("button", { name: /^Revocar/ }, ESPERA)
    act(() => revocar.focus())
    empezarAFallar()
    provocarRecarga()
    expect(await screen.findByText(ERROR_DE_LA_LISTA, {}, ESPERA)).toBeInTheDocument()
    await reposar()
    expect(document.activeElement).toBe(raizDeLaTabla())
  })

  it("T-05 (control): una recarga 200 con la fila todavía en la lista no mueve el foco de «Ver registrados»", async () => {
    await montar()
    const ver = await screen.findByRole("button", { name: /^Ver registrados/ }, ESPERA)
    act(() => ver.focus())
    provocarRecarga()
    await waitFor(() => expect(peticionesDeLaLista().length).toBeGreaterThan(1), ESPERA)
    await reposar()
    expect(document.activeElement).toBe(ver)
  })
})

describe("ADMIN-01g, ronda 2 · pulsar «Maestros» estando ahí (T-06)", () => {
  it("T-06: tras el 5xx de la primera carga, pulsar «Maestros» vuelve a pedir la lista y el texto desaparece", async () => {
    let fallos = 2
    lista = () => {
      if (fallos > 0) {
        fallos -= 1
        return errorJson(500, "ERROR_INTERNO")
      }
      return respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: null })
    }
    await montar()
    expect(await screen.findByText(ERROR_DE_LA_LISTA, {}, ESPERA)).toBeInTheDocument()
    await enLaBarra("Maestros")
    expect(
      await screen.findByRole("button", { name: /^Ver registrados/ }, ESPERA),
    ).toBeInTheDocument()
    expect(screen.queryByText(ERROR_DE_LA_LISTA)).toBeNull()
  })

  it("T-06: tras el 5xx de «Cargar más enlaces», pulsar «Maestros» vuelve a pedir la lista desde la primera página y el texto desaparece", async () => {
    let fallar = true
    lista = (url) => {
      if (url.searchParams.has("cursor") && fallar) return errorJson(500, "ERROR_INTERNO")
      if (url.searchParams.has("cursor"))
        return respuestaJson(200, { enlaces: [enlace(2)], siguienteCursor: null })
      return respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: enlace(1).id })
    }
    await montar()
    fireEvent.click(await screen.findByRole("button", { name: "Cargar más enlaces" }, ESPERA))
    expect(await screen.findByText(ERROR_DE_LA_LISTA, {}, ESPERA)).toBeInTheDocument()
    fallar = false
    const antes = peticionesDeLaLista().filter((l) => !l.url.searchParams.has("cursor")).length
    await enLaBarra("Maestros")
    await waitFor(() =>
      expect(peticionesDeLaLista().filter((l) => !l.url.searchParams.has("cursor")).length).toBe(
        antes + 1,
      ),
    )
    expect(
      await screen.findByRole("button", { name: /^Ver registrados/ }, ESPERA),
    ).toBeInTheDocument()
    expect(screen.queryByText(ERROR_DE_LA_LISTA)).toBeNull()
  })

  it("T-06 (control): con la lista sana, pulsar «Maestros» no pide nada", async () => {
    await montar()
    await screen.findByRole("button", { name: /^Ver registrados/ }, ESPERA)
    const antes = peticionesDeLaLista().length
    await enLaBarra("Maestros")
    await reposar()
    expect(peticionesDeLaLista()).toHaveLength(antes)
  })

  it("T-06, hermano: con la lista de registrados abierta y en error, pulsar «Maestros» la vuelve a pedir y el texto desaparece; sana, no", async () => {
    let fallos = 2
    registrados = () => {
      if (fallos > 0) {
        fallos -= 1
        return errorJson(500, "ERROR_INTERNO")
      }
      return respuestaJson(200, { registrados: [registrado(1)], siguienteCursor: null })
    }
    await montar()
    fireEvent.click(await screen.findByRole("button", { name: /^Ver registrados/ }, ESPERA))
    expect(await screen.findByText(ERROR_DE_LA_LISTA, {}, ESPERA)).toBeInTheDocument()
    await enLaBarra("Maestros")
    expect(await screen.findByText("Maestro 1", {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryByText(ERROR_DE_LA_LISTA)).toBeNull()
    const antes = llamadas.filter((l) => l.url.pathname.endsWith("/registrados")).length
    await enLaBarra("Maestros")
    await reposar()
    expect(llamadas.filter((l) => l.url.pathname.endsWith("/registrados"))).toHaveLength(antes)
  })
})
