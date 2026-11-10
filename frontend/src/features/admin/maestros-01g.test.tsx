import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// ADMIN-01g: las filas de /admin/maestros (E-01, E-07, E-14, E-17, E-18 y las filas 8 a 10, 24 y 25 de
// CHORE-04), con el router real y Providers. El servidor es un doble en memoria.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const ESPERA = { timeout: 4000 }
const RUTA_ENLACES = "/api/admin/enlaces-registro"

const enlace = (n: number) => ({
  id: `2a2b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`,
  creadoEn: `2030-01-${String(10 + n).padStart(2, "0")}T15:00:00.000Z`,
  expiraEn: "2030-03-19T15:00:00.000Z",
  revocadoEn: null,
  estado: "vigente",
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
let manejador: (metodo: string, url: URL) => Response | Promise<Response> | null = () => null

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  llamadas = []
  manejador = () => null
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://local")
      const metodo = init?.method ?? "GET"
      llamadas.push({ metodo, url })
      if (url.pathname === "/api/auth/refrescar") {
        return Promise.resolve(respuestaJson(200, { tokenAcceso: "t" }))
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

const montar = async () => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: ["/admin/maestros"] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  await screen.findByRole("button", { name: "Enviar invitaciones" }, ESPERA)
  return router
}

const diferida = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver: (respuesta: Response) => resolver(respuesta) }
}

const peticiones = (metodo: string, ruta: string) =>
  llamadas.filter((l) => l.metodo === metodo && l.url.pathname === ruta)

describe("ADMIN-01g · /admin/maestros (ADM-1G05)", () => {
  it("ADM-1G05: dos clics hacen una sola petición en generar enlace, invitación masiva e invitar maestro", async () => {
    const pendientes = [diferida(), diferida(), diferida()]
    manejador = (metodo, url) => {
      if (metodo !== "POST") return null
      if (url.pathname === RUTA_ENLACES) return pendientes[0]?.promesa ?? null
      if (url.pathname === "/api/admin/maestros/lote") return pendientes[1]?.promesa ?? null
      if (url.pathname === "/api/admin/maestros") return pendientes[2]?.promesa ?? null
      return null
    }
    await montar()
    fireEvent.change(screen.getByLabelText("Vigencia en días"), { target: { value: "10" } })
    fireEvent.click(screen.getByRole("button", { name: "Generar enlace" }))
    fireEvent.click(screen.getByRole("button", { name: "Generar enlace" }))
    fireEvent.change(screen.getByLabelText("Lista de maestros"), {
      target: { value: "ana@colegio.mx, Ana López" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Enviar invitaciones" }))
    fireEvent.click(screen.getByRole("button", { name: "Enviar invitaciones" }))
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Carla Ruiz" } })
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "carla@colegio.mx" } })
    fireEvent.click(screen.getByRole("button", { name: "Enviar invitación" }))
    fireEvent.click(screen.getByRole("button", { name: "Enviar invitación" }))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
    expect(peticiones("POST", RUTA_ENLACES)).toHaveLength(1)
    expect(peticiones("POST", "/api/admin/maestros/lote")).toHaveLength(1)
    expect(peticiones("POST", "/api/admin/maestros")).toHaveLength(1)
  })

  it("ADM-1G05 y ADM-1G10: «Cargar más enlaces» con isFetching, cancelRefetch: false y ref (una petición por dos clics); en la última página el foco va a «Ver registrados» del primer enlace nuevo", async () => {
    manejador = (metodo, url) => {
      if (metodo !== "GET" || url.pathname !== RUTA_ENLACES) return null
      if (url.searchParams.has("cursor")) {
        return respuestaJson(200, { enlaces: [enlace(2)], siguienteCursor: null })
      }
      return respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: enlace(1).id })
    }
    await montar()
    const cargarMas = await screen.findByRole("button", { name: "Cargar más enlaces" }, ESPERA)
    act(() => cargarMas.focus())
    fireEvent.click(cargarMas)
    fireEvent.click(cargarMas)
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Cargar más enlaces" })).toBeNull(),
    )
    expect(
      peticiones("GET", RUTA_ENLACES).filter((l) => l.url.searchParams.has("cursor")),
    ).toHaveLength(1)
    const filaNueva = document.querySelector(`[data-enlace-id="${enlace(2).id}"]`)
    expect(filaNueva).not.toBeNull()
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(filaNueva as HTMLElement).getAllByRole("button")[0],
      ),
    )
  })

  it("ADM-1G22 (E-18): la última página sin enlaces nuevos lleva el foco a «Ver registrados» de la primera fila, nunca a <body>", async () => {
    manejador = (metodo, url) => {
      if (metodo !== "GET" || url.pathname !== RUTA_ENLACES) return null
      if (url.searchParams.has("cursor")) {
        return respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: null })
      }
      return respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: enlace(1).id })
    }
    await montar()
    const cargarMas = await screen.findByRole("button", { name: "Cargar más enlaces" }, ESPERA)
    act(() => cargarMas.focus())
    fireEvent.click(cargarMas)
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Cargar más enlaces" })).toBeNull(),
    )
    const primera = document.querySelector(`[data-enlace-id="${enlace(1).id}"]`)
    await waitFor(() =>
      expect(document.activeElement).toBe(within(primera as HTMLElement).getAllByRole("button")[0]),
    )
    expect(document.activeElement).not.toBe(document.body)
  })

  it("ADM-1G05: «Cargar más» de registrados con isFetching y ref: una petición por dos clics", async () => {
    manejador = (metodo, url) => {
      if (metodo !== "GET" || !url.pathname.endsWith("/registrados")) return null
      if (url.searchParams.has("cursor")) {
        return respuestaJson(200, { registrados: [registrado(2)], siguienteCursor: null })
      }
      return respuestaJson(200, { registrados: [registrado(1)], siguienteCursor: registrado(1).id })
    }
    await montar()
    fireEvent.click(await screen.findByRole("button", { name: /^Ver registrados/ }, ESPERA))
    const cargarMas = await screen.findByRole("button", { name: /^Cargar más registrados/ }, ESPERA)
    fireEvent.click(cargarMas)
    fireEvent.click(cargarMas)
    expect(await screen.findByText("Maestro 2")).toBeInTheDocument()
    expect(
      llamadas.filter(
        (l) => l.url.pathname.endsWith("/registrados") && l.url.searchParams.has("cursor"),
      ),
    ).toHaveLength(1)
  })
})

describe("ADMIN-01g · E-01, E-14 y E-17 en /admin/maestros (ADM-1G06, ADM-1G07, ADM-1G09, ADM-1G22)", () => {
  it("ADM-1G06: el error de «Sí, revocar» no reaparece al reabrir la confirmación", async () => {
    manejador = (metodo, url) =>
      metodo === "POST" && url.pathname.endsWith("/revocar")
        ? errorJson(500, "ERROR_INTERNO")
        : null
    await montar()
    fireEvent.click(await screen.findByRole("button", { name: /^Revocar/ }, ESPERA))
    fireEvent.click(screen.getByRole("button", { name: /^Sí, revocar/ }))
    expect(await screen.findByRole("alert", {}, ESPERA)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /^Cancelar la revocación/ }))
    fireEvent.click(screen.getByRole("button", { name: /^Revocar/ }))
    expect(screen.queryAllByRole("alert")).toHaveLength(0)
  })

  it("ADM-1G07: el role=status de «Enlace nuevo» no contiene «Copiar enlace»", async () => {
    manejador = (metodo, url) =>
      metodo === "POST" && url.pathname === RUTA_ENLACES
        ? respuestaJson(201, { enlace: enlace(5), token: "t".repeat(43) })
        : null
    await montar()
    fireEvent.change(screen.getByLabelText("Vigencia en días"), { target: { value: "10" } })
    fireEvent.click(screen.getByRole("button", { name: "Generar enlace" }))
    const copiar = await screen.findByRole("button", { name: "Copiar enlace" }, ESPERA)
    const estado = screen.getByText(/registro-maestro#token=/).closest('[role="status"]')
    expect(estado).not.toBeNull()
    expect(estado?.contains(copiar)).toBe(false)
  })

  it("ADM-1G09 y ADM-1G22 (E-17): el texto de cada línea inválida va en <bdi> y la línea se lee igual", async () => {
    manejador = (metodo, url) =>
      metodo === "POST" && url.pathname === "/api/admin/maestros/lote"
        ? respuestaJson(200, {
            enviadas: [],
            yaExistentes: [],
            invalidas: [{ linea: 7, texto: "no-es-correo", motivo: "correo_invalido" }],
          })
        : null
    await montar()
    fireEvent.change(screen.getByLabelText("Lista de maestros"), {
      target: { value: "no-es-correo" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Enviar invitaciones" }))
    const bdi = await screen.findByText("no-es-correo", { selector: "bdi" }, ESPERA)
    expect(bdi.tagName).toBe("BDI")
    expect(bdi.closest("li")?.textContent).toBe("Línea 7 · no-es-correo · Correo no válido")
  })
})

// ADMIN-01g, ronda 1 (T-02 y T-03, estados vecinos de E-18): un «Cargar más» que se desmonta con el foco
// dentro (la última página o un error que reemplaza la lista) nunca deja el foco en <body>. Un 401 con el
// refresco fallido no pinta el texto de la lista (el hermano de D-1).
describe("ADMIN-01g, ronda 1 · el foco y los errores de los «Cargar más» de /admin/maestros", () => {
  it("T-02: «Cargar más enlaces» con un 5xx en la página siguiente: la lista pasa a su error y el foco va a la raíz de la tabla, nunca a <body>", async () => {
    manejador = (metodo, url) => {
      if (metodo !== "GET" || url.pathname !== RUTA_ENLACES) return null
      if (url.searchParams.has("cursor")) return errorJson(500, "ERROR_INTERNO")
      return respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: enlace(1).id })
    }
    await montar()
    const cargarMas = await screen.findByRole("button", { name: "Cargar más enlaces" }, ESPERA)
    act(() => cargarMas.focus())
    fireEvent.click(cargarMas)
    const alerta = await screen.findByRole("alert", {}, ESPERA)
    await waitFor(() => expect(document.activeElement).not.toBe(document.body))
    expect(document.activeElement?.contains(alerta)).toBe(true)
  })

  it.each([
    [
      "la última página",
      () => respuestaJson(200, { registrados: [registrado(2)], siguienteCursor: null }),
    ],
    ["un 5xx en la página siguiente", () => errorJson(500, "ERROR_INTERNO")],
  ])(
    "T-03: «Cargar más» de registrados con el foco y %s: el foco va a «Ocultar registrados» de su enlace, nunca a <body>",
    async (_caso, siguiente) => {
      manejador = (metodo, url) => {
        if (metodo !== "GET" || !url.pathname.endsWith("/registrados")) return null
        if (url.searchParams.has("cursor")) return siguiente()
        return respuestaJson(200, {
          registrados: [registrado(1)],
          siguienteCursor: registrado(1).id,
        })
      }
      await montar()
      fireEvent.click(await screen.findByRole("button", { name: /^Ver registrados/ }, ESPERA))
      const cargarMas = await screen.findByRole(
        "button",
        { name: /^Cargar más registrados/ },
        ESPERA,
      )
      act(() => cargarMas.focus())
      fireEvent.click(cargarMas)
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: /^Cargar más registrados/ })).toBeNull(),
      )
      await waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByRole("button", { name: /^Ocultar registrados/ }),
        ),
      )
    },
  )

  it("T-02 (estado vecino): una última página solo con enlaces repetidos lleva el foco a «Ver registrados» de la primera fila", async () => {
    manejador = (metodo, url) => {
      if (metodo !== "GET" || url.pathname !== RUTA_ENLACES) return null
      if (url.searchParams.has("cursor")) {
        return respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: null })
      }
      return respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: enlace(1).id })
    }
    await montar()
    const cargarMas = await screen.findByRole("button", { name: "Cargar más enlaces" }, ESPERA)
    act(() => cargarMas.focus())
    fireEvent.click(cargarMas)
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: /^Ver registrados/ })),
    )
  })
})
