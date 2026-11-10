import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// Ataque del Tester (ADMIN-01g, ronda 2) sobre /admin/maestros: puntos 1 (el 401 en enlaces y
// registrados), 2 (T-02 y sus vecinos: los caminos para recuperar la lista tras el 5xx de «Cargar más
// enlaces»), 3 (T-03 y sus vecinos: el botón que abrió la lista, la tabla de enlaces en error y dos listas
// abiertas) y 4 (unirPaginasSinRepetidas con una fila repetida que cambia de datos) de "Puntos de ataque
// para la ronda 2" (revision.md, "## Verificación de la corrección de la ronda 1 — ADMIN-01g"). Router
// real (rutas de app/router) y un QueryClient con la configuración de app/providers.tsx, para poder
// simular "otra recarga" con invalidateQueries. El servidor es un doble en memoria.

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

const montar = async () => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: ["/admin/maestros"] })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await screen.findByRole("button", { name: "Enviar invitaciones" }, ESPERA)
  return { router, queryClient }
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

describe("ATQ-1G R2 · el 401 en /admin/maestros (punto 1)", () => {
  it.each([
    ["la primera carga de enlaces"],
    ["«Cargar más enlaces»"],
    ["la primera página de registrados"],
    ["«Cargar más» de registrados"],
  ])(
    "ATQ-1G37: un 401 con el refresco fallido en %s: ningún mensaje, ningún aviso y nada en espera",
    async (donde) => {
      manejador = (metodo, url) => {
        if (metodo !== "GET") return null
        if (url.pathname === RUTA_ENLACES) {
          if (donde === "la primera carga de enlaces") return errorJson(401, "NO_AUTENTICADO")
          if (url.searchParams.has("cursor")) return errorJson(401, "NO_AUTENTICADO")
          return respuestaJson(200, {
            enlaces: [enlace(1)],
            siguienteCursor: donde === "«Cargar más enlaces»" ? enlace(1).id : null,
          })
        }
        if (url.pathname.endsWith("/registrados")) {
          if (donde === "la primera página de registrados") return errorJson(401, "NO_AUTENTICADO")
          if (url.searchParams.has("cursor")) return errorJson(401, "NO_AUTENTICADO")
          return respuestaJson(200, {
            registrados: [registrado(1)],
            siguienteCursor: registrado(1).id,
          })
        }
        return null
      }
      if (donde === "la primera carga de enlaces") refrescoFalla = true
      await montar()
      if (donde === "«Cargar más enlaces»") {
        const cargarMas = await screen.findByRole("button", { name: "Cargar más enlaces" }, ESPERA)
        refrescoFalla = true
        fireEvent.click(cargarMas)
      }
      if (donde === "la primera página de registrados") {
        await screen.findByRole("button", { name: /^Ver registrados/ }, ESPERA)
        refrescoFalla = true
        fireEvent.click(botonDeExpandir(1))
      }
      if (donde === "«Cargar más» de registrados") {
        fireEvent.click(await screen.findByRole("button", { name: /^Ver registrados/ }, ESPERA))
        const cargarMas = await screen.findByRole(
          "button",
          { name: /^Cargar más registrados/ },
          ESPERA,
        )
        refrescoFalla = true
        fireEvent.click(cargarMas)
      }
      await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/login"), ESPERA)
      await reposar()
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
})

describe("ATQ-1G R2 · T-02 y sus vecinos (punto 2)", () => {
  // «Cargar más enlaces» responde 5xx una vez (con su reintento); después, la lista responde bien.
  const conCargarMasQueFalla = () => {
    let falla = true
    manejador = (metodo, url) => {
      if (metodo !== "GET" || url.pathname !== RUTA_ENLACES) return null
      if (url.searchParams.has("cursor") && falla) return errorJson(500, "ERROR_INTERNO")
      if (url.searchParams.has("cursor")) {
        return respuestaJson(200, { enlaces: [enlace(2)], siguienteCursor: null })
      }
      return respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: enlace(1).id })
    }
    return () => {
      falla = false
    }
  }

  const llevarAlError = async () => {
    const montada = await montar()
    const cargarMas = await screen.findByRole("button", { name: "Cargar más enlaces" }, ESPERA)
    act(() => cargarMas.focus())
    fireEvent.click(cargarMas)
    expect(await screen.findByText(GENERICO, {}, ESPERA)).toBeInTheDocument()
    await reposar()
    expect(document.activeElement).not.toBe(document.body)
    return montada
  }

  it("ATQ-1G38: tras el 5xx de «Cargar más enlaces», pulsar «Maestros» estando aquí vuelve a pedir la lista y el texto desaparece", async () => {
    const curar = conCargarMasQueFalla()
    await llevarAlError()
    curar()
    const antes = primerasDe(RUTA_ENLACES).length
    const nav = screen.getByRole("navigation", { name: "Navegación principal" })
    fireEvent.click(within(nav).getByRole("link", { name: "Maestros" }))
    await reposar()
    await waitFor(() => expect(primerasDe(RUTA_ENLACES).length).toBeGreaterThan(antes), ESPERA)
    await waitFor(() => expect(screen.queryByText(GENERICO)).toBeNull(), ESPERA)
    expect(filaDeEnlace(1)).toBeInTheDocument()
  })

  it("ATQ-1G39: tras el 5xx de «Cargar más enlaces», ir a otra sección y regresar antes del staleTime vuelve a pedir la lista y el texto desaparece", async () => {
    const curar = conCargarMasQueFalla()
    await llevarAlError()
    curar()
    const antes = primerasDe(RUTA_ENLACES).length
    const nav = screen.getByRole("navigation", { name: "Navegación principal" })
    fireEvent.click(within(nav).getByRole("link", { name: "Movimientos" }))
    await screen.findByRole("heading", { level: 1, name: "Movimientos de inscripción" }, ESPERA)
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Navegación principal" })).getByRole("link", {
        name: "Maestros",
      }),
    )
    await screen.findByRole("button", { name: "Enviar invitaciones" }, ESPERA)
    await reposar()
    await waitFor(() => expect(primerasDe(RUTA_ENLACES).length).toBeGreaterThan(antes), ESPERA)
    await waitFor(() => expect(screen.queryByText(GENERICO)).toBeNull(), ESPERA)
    expect(filaDeEnlace(1)).toBeInTheDocument()
  })

  it("ATQ-1G40: tras el 5xx de «Cargar más enlaces», atrás y adelante del historial vuelven a pedir la lista y el texto desaparece", async () => {
    const curar = conCargarMasQueFalla()
    const { router } = await llevarAlError()
    curar()
    const antes = primerasDe(RUTA_ENLACES).length
    await act(async () => {
      await router.navigate("/admin/movimientos")
    })
    await screen.findByRole("heading", { level: 1, name: "Movimientos de inscripción" }, ESPERA)
    await act(async () => {
      await router.navigate(-1)
    })
    await screen.findByRole("button", { name: "Enviar invitaciones" }, ESPERA)
    await reposar()
    await waitFor(() => expect(primerasDe(RUTA_ENLACES).length).toBeGreaterThan(antes), ESPERA)
    await waitFor(() => expect(screen.queryByText(GENERICO)).toBeNull(), ESPERA)
    expect(filaDeEnlace(1)).toBeInTheDocument()
  })

  it("ATQ-1G41: con el foco en «Cargar más» de registrados y un 5xx, ocultar y volver a ver los registrados vuelve a pedir la lista y el texto desaparece", async () => {
    let falla = true
    manejador = (metodo, url) => {
      if (metodo !== "GET" || !url.pathname.endsWith("/registrados")) return null
      if (url.searchParams.has("cursor") && falla) return errorJson(500, "ERROR_INTERNO")
      if (url.searchParams.has("cursor")) {
        return respuestaJson(200, { registrados: [registrado(2)], siguienteCursor: null })
      }
      return respuestaJson(200, { registrados: [registrado(1)], siguienteCursor: registrado(1).id })
    }
    await montar()
    fireEvent.click(await screen.findByRole("button", { name: /^Ver registrados/ }, ESPERA))
    fireEvent.click(await screen.findByRole("button", { name: /^Cargar más registrados/ }, ESPERA))
    expect(await screen.findByText(GENERICO, {}, ESPERA)).toBeInTheDocument()
    falla = false
    const antes = primerasDe("/registrados").length
    fireEvent.click(botonDeExpandir(1))
    expect(screen.queryByText(GENERICO)).toBeNull()
    fireEvent.click(botonDeExpandir(1))
    await reposar()
    await waitFor(() => expect(primerasDe("/registrados").length).toBeGreaterThan(antes), ESPERA)
    await waitFor(() => expect(screen.queryByText(GENERICO)).toBeNull(), ESPERA)
    expect(screen.getByText("Maestro 1")).toBeInTheDocument()
  })
})

describe("ATQ-1G R2 · T-03 y sus vecinos (punto 3)", () => {
  it.each([["«Cargar más» de registrados"], ["«Ocultar registrados» de su fila"]])(
    "ATQ-1G42: con el foco en %s, una recarga de la lista de enlaces que falla reemplaza la tabla: el foco no cae en <body>",
    async (donde) => {
      let falla = false
      manejador = (metodo, url) => {
        if (metodo !== "GET") return null
        if (url.pathname === RUTA_ENLACES && falla) return errorJson(500, "ERROR_INTERNO")
        if (url.pathname.endsWith("/registrados")) {
          return respuestaJson(200, {
            registrados: [registrado(1)],
            siguienteCursor: registrado(1).id,
          })
        }
        return null
      }
      const { queryClient } = await montar()
      fireEvent.click(await screen.findByRole("button", { name: /^Ver registrados/ }, ESPERA))
      const cargarMas = await screen.findByRole(
        "button",
        { name: /^Cargar más registrados/ },
        ESPERA,
      )
      const control = donde === "«Cargar más» de registrados" ? cargarMas : botonDeExpandir(1)
      act(() => control.focus())
      expect(document.activeElement).toBe(control)
      falla = true
      await act(async () => {
        await queryClient.invalidateQueries({ queryKey: ["admin", "enlaces-registro"] })
      })
      expect(await screen.findByText(GENERICO, {}, ESPERA)).toBeInTheDocument()
      await reposar()
      expect(control.isConnected).toBe(false)
      expect(document.activeElement).not.toBe(document.body)
      expect(document.activeElement?.isConnected).toBe(true)
    },
  )

  it("ATQ-1G43: el enlace se revoca con sus registrados abiertos; «Cargar más» de registrados en la última página lleva el foco al botón de su fila", async () => {
    let revocado = false
    manejador = (metodo, url) => {
      if (metodo === "POST" && url.pathname.endsWith("/revocar")) {
        revocado = true
        return respuestaJson(200, {
          enlace: enlace(1, { estado: "revocado", revocadoEn: "2030-01-20T15:00:00.000Z" }),
        })
      }
      if (metodo !== "GET") return null
      if (url.pathname === RUTA_ENLACES) {
        return respuestaJson(200, {
          enlaces: [
            revocado
              ? enlace(1, { estado: "revocado", revocadoEn: "2030-01-20T15:00:00.000Z" })
              : enlace(1),
          ],
          siguienteCursor: null,
        })
      }
      if (url.pathname.endsWith("/registrados")) {
        if (url.searchParams.has("cursor")) {
          return respuestaJson(200, { registrados: [registrado(2)], siguienteCursor: null })
        }
        return respuestaJson(200, {
          registrados: [registrado(1)],
          siguienteCursor: registrado(1).id,
        })
      }
      return null
    }
    await montar()
    fireEvent.click(await screen.findByRole("button", { name: /^Ver registrados/ }, ESPERA))
    await screen.findByText("Maestro 1", {}, ESPERA)
    fireEvent.click(screen.getByRole("button", { name: /^Revocar/ }))
    fireEvent.click(screen.getByRole("button", { name: /^Sí, revocar/ }))
    await waitFor(
      () => expect(screen.queryByRole("button", { name: /^Revocar/ })).toBeNull(),
      ESPERA,
    )
    await reposar()
    const cargarMas = await screen.findByRole("button", { name: /^Cargar más registrados/ }, ESPERA)
    act(() => cargarMas.focus())
    fireEvent.click(cargarMas)
    await screen.findByText("Maestro 2", {}, ESPERA)
    await reposar()
    expect(document.activeElement).toBe(botonDeExpandir(1))
  })

  it("ATQ-1G44: dos listas de registrados abiertas; la última página y el 5xx de cada una llevan el foco al botón de su propia fila", async () => {
    manejador = (metodo, url) => {
      if (metodo !== "GET") return null
      if (url.pathname === RUTA_ENLACES) {
        return respuestaJson(200, { enlaces: [enlace(1), enlace(2)], siguienteCursor: null })
      }
      if (url.pathname.endsWith("/registrados")) {
        const delSegundo = url.pathname.includes(enlace(2).id)
        if (url.searchParams.has("cursor")) {
          return delSegundo
            ? respuestaJson(200, { registrados: [registrado(4)], siguienteCursor: null })
            : errorJson(500, "ERROR_INTERNO")
        }
        return respuestaJson(200, {
          registrados: [registrado(delSegundo ? 3 : 1)],
          siguienteCursor: registrado(delSegundo ? 3 : 1).id,
        })
      }
      return null
    }
    await montar()
    await screen.findAllByRole("button", { name: /^Ver registrados/ }, ESPERA)
    fireEvent.click(botonDeExpandir(1))
    fireEvent.click(botonDeExpandir(2))
    await screen.findByText("Maestro 1", {}, ESPERA)
    await screen.findByText("Maestro 3", {}, ESPERA)
    const [delPrimero, delSegundo] = screen.getAllByRole("button", {
      name: /^Cargar más registrados/,
    })
    if (delPrimero === undefined || delSegundo === undefined) {
      throw new Error("Precondición: dos «Cargar más» de registrados")
    }
    act(() => delSegundo.focus())
    fireEvent.click(delSegundo)
    await screen.findByText("Maestro 4", {}, ESPERA)
    await reposar()
    expect(document.activeElement).toBe(botonDeExpandir(2))
    act(() => delPrimero.focus())
    fireEvent.click(delPrimero)
    expect(await screen.findByText(GENERICO, {}, ESPERA)).toBeInTheDocument()
    await reposar()
    expect(document.activeElement).toBe(botonDeExpandir(1))
  })
})

describe("ATQ-1G R2 · unirPaginasSinRepetidas en enlaces y registrados (punto 4)", () => {
  it("ATQ-1G45: un enlace repetido que cambia de datos en la página siguiente se ve una vez, con los datos de la primera; el foco va al único nuevo", async () => {
    manejador = (metodo, url) => {
      if (metodo !== "GET" || url.pathname !== RUTA_ENLACES) return null
      if (url.searchParams.has("cursor")) {
        return respuestaJson(200, {
          enlaces: [
            enlace(1, {
              estado: "revocado",
              revocadoEn: "2030-01-20T15:00:00.000Z",
              registrados: 9,
            }),
            enlace(2),
          ],
          siguienteCursor: null,
        })
      }
      return respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: enlace(1).id })
    }
    const errorDeConsola = vi.spyOn(console, "error")
    await montar()
    const cargarMas = await screen.findByRole("button", { name: "Cargar más enlaces" }, ESPERA)
    act(() => cargarMas.focus())
    fireEvent.click(cargarMas)
    await waitFor(
      () => expect(document.querySelectorAll("[data-enlace-id]")).toHaveLength(2),
      ESPERA,
    )
    await reposar()
    expect(document.querySelectorAll(`[data-enlace-id="${enlace(1).id}"]`)).toHaveLength(1)
    expect(within(filaDeEnlace(1)).getByRole("button", { name: /^Revocar/ })).toBeInTheDocument()
    expect(within(filaDeEnlace(1)).queryByText("9")).toBeNull()
    expect(document.activeElement).toBe(botonDeExpandir(2))
    expect(errorDeConsola.mock.calls.filter((a) => String(a[0]).includes("same key"))).toEqual([])
  })

  it("ATQ-1G46: un registrado repetido que cambia de nombre en la página siguiente se ve una vez, con el nombre de la primera; sin nuevos, el foco va al botón de su fila", async () => {
    manejador = (metodo, url) => {
      if (metodo !== "GET" || !url.pathname.endsWith("/registrados")) return null
      if (url.searchParams.has("cursor")) {
        return respuestaJson(200, {
          registrados: [registrado(1, "Otro Nombre")],
          siguienteCursor: null,
        })
      }
      return respuestaJson(200, { registrados: [registrado(1)], siguienteCursor: registrado(1).id })
    }
    const errorDeConsola = vi.spyOn(console, "error")
    await montar()
    fireEvent.click(await screen.findByRole("button", { name: /^Ver registrados/ }, ESPERA))
    const cargarMas = await screen.findByRole("button", { name: /^Cargar más registrados/ }, ESPERA)
    act(() => cargarMas.focus())
    fireEvent.click(cargarMas)
    await waitFor(
      () => expect(screen.queryByRole("button", { name: /^Cargar más registrados/ })).toBeNull(),
      ESPERA,
    )
    await reposar()
    expect(screen.getAllByText("Maestro 1")).toHaveLength(1)
    expect(screen.queryByText("Otro Nombre")).toBeNull()
    expect(document.activeElement).toBe(botonDeExpandir(1))
    expect(errorDeConsola.mock.calls.filter((a) => String(a[0]).includes("same key"))).toEqual([])
  })
})

describe("ATQ-1G R2 · lo que apareció al atacar los puntos 1 y 3", () => {
  it.each([["«Cargar más enlaces»"], ["«Cargar más» de registrados"]])(
    "ATQ-1G47: tras un 401 con el refresco fallido en %s, la consulta no vuelve a pedir la página sin sesión",
    async (donde) => {
      manejador = (metodo, url) => {
        if (metodo !== "GET") return null
        if (url.searchParams.has("cursor")) return errorJson(401, "NO_AUTENTICADO")
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
      const sufijo = donde === "«Cargar más enlaces»" ? RUTA_ENLACES : "/registrados"
      if (donde === "«Cargar más» de registrados") {
        fireEvent.click(await screen.findByRole("button", { name: /^Ver registrados/ }, ESPERA))
      }
      const nombre =
        donde === "«Cargar más enlaces»" ? "Cargar más enlaces" : /^Cargar más registrados/
      const cargarMas = await screen.findByRole("button", { name: nombre }, ESPERA)
      refrescoFalla = true
      fireEvent.click(cargarMas)
      await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/login"), ESPERA)
      await act(() => new Promise((r) => setTimeout(r, 1600)))
      expect(conCursor(sufijo)).toHaveLength(1)
      expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(0)
    },
  )

  it("ATQ-1G48: «Sí, revocar» sale bien y la recarga de la lista que dispara falla: el foco, que volvió a «Revocar», no cae en <body>", async () => {
    let revocado = false
    manejador = (metodo, url) => {
      if (metodo === "POST" && url.pathname.endsWith("/revocar")) {
        revocado = true
        return respuestaJson(200, {
          enlace: enlace(1, { estado: "revocado", revocadoEn: "2030-01-20T15:00:00.000Z" }),
        })
      }
      if (metodo === "GET" && url.pathname === RUTA_ENLACES && revocado) {
        return errorJson(500, "ERROR_INTERNO")
      }
      return null
    }
    await montar()
    fireEvent.click(await screen.findByRole("button", { name: /^Revocar/ }, ESPERA))
    fireEvent.click(screen.getByRole("button", { name: /^Sí, revocar/ }))
    await waitFor(() => expect(revocado).toBe(true))
    expect(await screen.findByText(GENERICO, {}, ESPERA)).toBeInTheDocument()
    await reposar()
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement?.isConnected).toBe(true)
  })
})
