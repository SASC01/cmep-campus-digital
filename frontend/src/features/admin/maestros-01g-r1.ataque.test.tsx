import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Ataque del Tester (ADMIN-01g, ronda 1) sobre /admin/maestros: puntos 5 (E-07 y E-18: «Cargar más
// enlaces» con la lista recargando, con dos clics y el foco nunca en <body>, más su hermano, «Cargar más»
// de registrados, en el mismo archivo que toca E-07) y 6 (E-17: el texto de una línea inválida con
// caracteres de dirección, escritos con su código, y con <, & y comillas) de "Puntos de ataque finales
// para la ronda 1" (revision.md, "## Verificación de la corrección — ADMIN-01g"). Router real y
// Providers; el servidor es un doble en memoria.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const ESPERA = { timeout: 4000 }
const RUTA_ENLACES = "/api/admin/enlaces-registro"

const enlace = (n: number, extra: object = {}) => ({
  id: `4a2b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`,
  creadoEn: `2030-01-${String(10 + n).padStart(2, "0")}T15:00:00.000Z`,
  expiraEn: "2030-03-19T15:00:00.000Z",
  revocadoEn: null,
  estado: "vigente",
  registrados: 1,
  ...extra,
})

const registrado = (n: number) => ({
  id: `5b3b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`,
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

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const conCursor = (metodo: string, sufijo: string) =>
  llamadas.filter(
    (l) =>
      l.metodo === metodo && l.url.pathname.endsWith(sufijo) && l.url.searchParams.has("cursor"),
  )

describe("ATQ-1G R1 · E-07 y E-18 en /admin/maestros (punto 5)", () => {
  it("ATQ-1G23: «Cargar más enlaces» con la lista recargando (tras revocar): espera, dos clics no piden la página siguiente y, al responder, la lista queda", async () => {
    const recarga = diferida()
    let revocado = false
    manejador = (metodo, url) => {
      if (metodo === "POST" && url.pathname.endsWith("/revocar")) {
        revocado = true
        return respuestaJson(200, {
          enlace: enlace(1, { estado: "revocado", revocadoEn: "2030-01-20T15:00:00.000Z" }),
        })
      }
      if (metodo !== "GET" || url.pathname !== RUTA_ENLACES) return null
      if (url.searchParams.has("cursor")) {
        return respuestaJson(200, { enlaces: [enlace(2)], siguienteCursor: null })
      }
      if (revocado) return recarga.promesa
      return respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: enlace(1).id })
    }
    await montar()
    fireEvent.click(await screen.findByRole("button", { name: /^Revocar/ }, ESPERA))
    fireEvent.click(screen.getByRole("button", { name: /^Sí, revocar/ }))
    await waitFor(() => expect(revocado).toBe(true))
    await reposar()
    const cargarMas = screen.getByRole("button", { name: "Cargar más enlaces" })
    await waitFor(() => expect(cargarMas).toHaveAttribute("aria-busy", "true"))
    fireEvent.click(cargarMas)
    fireEvent.click(cargarMas)
    await reposar()
    expect(conCursor("GET", RUTA_ENLACES)).toHaveLength(0)
    await act(async () => {
      recarga.resolver(
        respuestaJson(200, {
          enlaces: [enlace(1, { estado: "revocado", revocadoEn: "2030-01-20T15:00:00.000Z" })],
          siguienteCursor: enlace(1).id,
        }),
      )
    })
    await reposar()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Cargar más enlaces" })).not.toHaveAttribute(
        "aria-busy",
        "true",
      ),
    )
    expect(conCursor("GET", RUTA_ENLACES)).toHaveLength(0)
    expect(screen.queryAllByRole("alert")).toHaveLength(0)
  })

  it("ATQ-1G24: «Cargar más enlaces» con el foco y la página siguiente con 5xx: la tabla pasa a su error y el foco no cae en <body>", async () => {
    manejador = (metodo, url) => {
      if (metodo !== "GET" || url.pathname !== RUTA_ENLACES) return null
      if (url.searchParams.has("cursor")) return errorJson(500, "ERROR_INTERNO")
      return respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: enlace(1).id })
    }
    await montar()
    const cargarMas = await screen.findByRole("button", { name: "Cargar más enlaces" }, ESPERA)
    act(() => cargarMas.focus())
    fireEvent.click(cargarMas)
    await screen.findByRole("alert", {}, ESPERA)
    await reposar()
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement?.isConnected).toBe(true)
  })

  it.each([["la última página"], ["un 5xx en la página siguiente"]])(
    "ATQ-1G25: «Cargar más» de registrados con el foco y %s: el foco no cae en <body>",
    async (caso) => {
      manejador = (metodo, url) => {
        if (metodo !== "GET" || !url.pathname.endsWith("/registrados")) return null
        if (url.searchParams.has("cursor")) {
          return caso === "la última página"
            ? respuestaJson(200, { registrados: [registrado(2)], siguienteCursor: null })
            : errorJson(500, "ERROR_INTERNO")
        }
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
      expect(document.activeElement).toBe(cargarMas)
      fireEvent.click(cargarMas)
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: /^Cargar más registrados/ })).toBeNull(),
      )
      await reposar()
      expect(document.activeElement).not.toBe(document.body)
      expect(document.activeElement?.isConnected).toBe(true)
    },
  )
})

describe("ATQ-1G R1 · E-17 en /admin/maestros (punto 6)", () => {
  const RLO = String.fromCharCode(0x202e)
  const PDF = String.fromCharCode(0x202c)
  const RLI = String.fromCharCode(0x2067)
  const ALEF = String.fromCharCode(0x05d0)

  it.each([
    ["con el inversor de dirección", `${RLO}moc.liame@ana${PDF}`],
    ["con un aislante sin cerrar", `${RLI}ana@colegio.mx`],
    ["con texto de derecha a izquierda y dígitos", `${ALEF}${ALEF} 123`],
    ["con <, & y comillas", `<b>ana</b> & "beto" 'x'`],
    ["con una entidad escrita", "&lt;script&gt;"],
  ])(
    "ATQ-1G26: la línea inválida %s va en <bdi>, sin elementos nuevos, y su texto no cambia",
    async (_caso, texto) => {
      manejador = (metodo, url) =>
        metodo === "POST" && url.pathname === "/api/admin/maestros/lote"
          ? respuestaJson(200, {
              enviadas: [],
              yaExistentes: [],
              invalidas: [{ linea: 3, texto, motivo: "correo_invalido" }],
            })
          : null
      await montar()
      fireEvent.change(screen.getByLabelText("Lista de maestros"), {
        target: { value: "no-es-correo" },
      })
      fireEvent.click(screen.getByRole("button", { name: "Enviar invitaciones" }))
      await waitFor(() => expect(document.querySelectorAll("bdi")).toHaveLength(1), ESPERA)
      const bdi = document.querySelector("bdi")
      if (bdi === null) throw new Error("Precondición: el <bdi> de la línea")
      expect(bdi.textContent).toBe(texto)
      expect(bdi.children).toHaveLength(0)
      const linea = bdi.closest("li")
      expect(linea?.textContent).toBe(`Línea 3 · ${texto} · Correo no válido`)
      expect(linea?.querySelector("b, script")).toBeNull()
      expect(within(linea as HTMLElement).getByText("Correo no válido")).toBeInTheDocument()
    },
  )
})
