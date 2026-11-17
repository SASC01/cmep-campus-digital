// FORO-01c1 (§D-10, §E8.3; AGENTS.md, "frases de recuperación"): «La lista de foros cambió mientras la
// veías. Vuelve a abrir Foro para verla completa.», por cada camino con que la persona puede volver a
// abrir Foro: FORO-1C20 a FORO-1C23. Con el router real (`rutas`) y el QueryClient de app/providers.tsx
// (staleTime de 30 s, un reintento). En cada caso se pide la primera página otra vez, sin cursor, y la
// frase desaparece.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const CLASE = uuid("2a2b3c4d", 1)
const MAESTRO = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez" }
const ESPERA = { timeout: 5000 }
const FORO = `/maestro/clases/${CLASE}/foro`
const AVISOS = `/maestro/clases/${CLASE}`
const API_FOROS = `/api/clases/${CLASE}/foros`
const R_FOROS =
  "La lista de foros cambió mientras la veías. Vuelve a abrir Foro para verla completa."
const VACIO_DE_AVISOS = "Publica el primer aviso de tu clase."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const idForo = (n: number) => uuid("5a5b3c4d", n)
const foro = (n: number) => ({
  id: idForo(n),
  titulo: `Foro ${String(n)}`,
  autor: { ...MAESTRO, administracion: false },
  creadoEn: "2026-10-01T15:30:00.000Z",
  fechaLimite: new Date(Date.now() + 5 * 86_400_000).toISOString(),
  puntos: 10,
  tema: null,
  participaciones: 0,
  entrega: null,
})

let foros: ReturnType<typeof foro>[]
let pedidas: URL[]

const responder = (metodo: string, url: URL): Response => {
  const ruta = url.pathname
  if (ruta === "/api/me") {
    return respuestaJson(200, {
      id: uuid("4f4f3c4d", 1),
      nombre: "Luis Pérez",
      email: "luis@ejemplo.mx",
      rol: "maestro",
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  if (ruta === "/api/clases/impartidas") {
    return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
  }
  if (ruta === `/api/clases/${CLASE}` && metodo === "GET") {
    return respuestaJson(200, {
      clase: {
        id: CLASE,
        nombre: "Historia",
        descripcion: null,
        maestro: MAESTRO,
        maestros: [MAESTRO],
        archivadaEn: null,
      },
    })
  }
  if (ruta === `/api/clases/${CLASE}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
  if (ruta === `/api/clases/${CLASE}/publicaciones`) {
    return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
  }
  if (ruta === API_FOROS && metodo === "GET") {
    pedidas.push(url)
    const limite = Number(url.searchParams.get("limite") ?? "20")
    const cursor = url.searchParams.get("cursor")
    let inicio = 0
    if (cursor !== null) {
      const indice = foros.findIndex((fila) => fila.id === cursor)
      // El cursor apunta a un foro que ya no está: el servidor lo rechaza como cursor no válido.
      if (indice === -1) return errorApi(400, "VALIDACION", "cursor: no es válido")
      inicio = indice + 1
    }
    const pagina = foros.slice(inicio, inicio + limite)
    const siguiente = foros.length > inicio + limite ? (pagina.at(-1)?.id ?? null) : null
    return respuestaJson(200, { foros: pagina, siguienteCursor: siguiente })
  }
  return errorApi(500, "ERROR_INTERNO", `no esperada: ${metodo} ${ruta}`)
}

const montar = async (entradas: string[]) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: entradas })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return router
}

const reposar = (ms = 150) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))

const enLasSecciones = (nombre: string) =>
  within(screen.getByRole("list", { name: "Secciones de la clase" })).getByRole("link", {
    name: nombre,
  })

// El nombre del enlace de una fila empieza con «Foro: <título>»; el título no sigue con otro dígito.
const esperarFila = (titulo: string) =>
  screen.findByRole("link", { name: new RegExp(`^Foro: ${titulo}(?!\\d)`) }, ESPERA)

const esperarH2 = () => screen.findByRole("heading", { level: 2, name: "Foro" }, ESPERA)

// 25 foros; al pedir "Ver más foros", el último de la primera página (el 6) ya no está: el cursor vence
// y la lista dice la frase.
const conLaFrase = async (entradas = [FORO]) => {
  foros = Array.from({ length: 25 }, (_, i) => foro(25 - i))
  const router = await montar(entradas)
  await esperarH2()
  await esperarFila("Foro 6")
  const verMas = screen.getByRole("button", { name: "Ver más foros" })
  foros = foros.filter(({ id }) => id !== idForo(6))
  fireEvent.click(verMas)
  expect(await screen.findByText(R_FOROS, undefined, ESPERA)).toBeInTheDocument()
  return router
}

const sinLaFrase = async (antes: number) => {
  await waitFor(() => expect(screen.queryByText(R_FOROS)).toBeNull(), ESPERA)
  await esperarFila("Foro 7")
  const nuevas = pedidas.slice(antes)
  expect(nuevas.length).toBeGreaterThan(0)
  expect(nuevas[0]?.searchParams.has("cursor")).toBe(false)
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  foros = []
  pedidas = []
  aviso.mockClear()
  aviso.error.mockClear()
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://x")
      return Promise.resolve().then(() => responder(init?.method ?? "GET", url))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
})

describe("FORO-1C20 a FORO-1C23 · «Vuelve a abrir Foro», por cada camino", () => {
  it("FORO-1C20: pulsar «Foro» estando ahí pide la primera página otra vez y la frase desaparece", async () => {
    await conLaFrase()
    await reposar()
    const antes = pedidas.length
    fireEvent.click(enLasSecciones("Foro"))
    await sinLaFrase(antes)
  })

  it("FORO-1C21: ir a «Avisos» y volver antes de 30 s pide la primera página y la frase desaparece", async () => {
    await conLaFrase()
    const antes = pedidas.length
    fireEvent.click(enLasSecciones("Avisos"))
    await screen.findByText(VACIO_DE_AVISOS, undefined, ESPERA)
    fireEvent.click(enLasSecciones("Foro"))
    await esperarH2()
    await sinLaFrase(antes)
  })

  it("FORO-1C22: atrás y adelante del historial piden la primera página y la frase desaparece", async () => {
    const router = await conLaFrase([AVISOS, FORO])
    const antes = pedidas.length
    await act(() => router.navigate(-1))
    await screen.findByText(VACIO_DE_AVISOS, undefined, ESPERA)
    await act(() => router.navigate(1))
    await esperarH2()
    await sinLaFrase(antes)
  })

  it("FORO-1C23: con la frase a la vista no se ofrece «Ver más foros» y no hay aviso", async () => {
    await conLaFrase()
    expect(screen.queryByRole("button", { name: "Ver más foros" })).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
  })
})
