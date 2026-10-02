import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Tester, CLASES-c, ronda 3 (punto 3 de la lista del manager): tras el 400 del cursor, el muro dice
// "El muro cambió mientras lo veías. Vuelve a abrirlo para verlo completo." y los comentarios "…Vuelve
// a abrirlos…". Con el router real se comprueba qué acciones recuperan la lista sin recargar la
// página: pulsar "Muro" estando en el muro, cambiar de sección y regresar, y en los comentarios
// "Ocultar comentarios" y "Ver comentarios" otra vez.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const AUTOR = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const idPublicacion = (n: number) => `5a5b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const idComentario = (n: number) => `6a6b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const TEXTO_MURO = "El muro cambió mientras lo veías. Vuelve a abrirlo para verlo completo."
const TEXTO_COMENTARIOS =
  "Los comentarios cambiaron mientras los veías. Vuelve a abrirlos para verlos completos."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const publicacion = (n: number, comentarios = 0) => ({
  id: idPublicacion(n),
  tipo: "anuncio",
  titulo: null,
  texto: `Publicación ${String(n)}`,
  autor: AUTOR,
  creadoEn: "2026-09-29T15:30:00.000Z",
  comentarios,
})

const comentario = (n: number) => ({
  id: idComentario(n),
  texto: `Comentario ${String(n)}`,
  autor: AUTOR,
  creadoEn: "2026-09-29T16:30:00.000Z",
  propio: false,
})

// Paginación real (cursor = id de la última fila); un cursor que ya no está responde 400 VALIDACION
// "cursor: no es válido", como el adaptador.
const paginar = <T extends { id: string }>(filas: T[], url: URL) => {
  const limite = Number(url.searchParams.get("limite") ?? "20")
  const cursor = url.searchParams.get("cursor")
  let inicio = 0
  if (cursor !== null) {
    const indice = filas.findIndex((f) => f.id === cursor)
    if (indice === -1) return null
    inicio = indice + 1
  }
  const pagina = filas.slice(inicio, inicio + limite)
  const siguiente = filas.length > inicio + limite ? (pagina.at(-1)?.id ?? null) : null
  return { pagina, siguiente }
}

const crearServidor = () => {
  const estado = {
    publicaciones: Array.from({ length: 25 }, (_, i) => publicacion(i + 1, i === 0 ? 25 : 0)),
    comentarios: Array.from({ length: 25 }, (_, i) => comentario(i + 1)),
  }
  const cursorInvalido = () =>
    respuestaJson(400, { error: { codigo: "VALIDACION", mensaje: "cursor: no es válido" } })
  const fetchMock = vi.fn<typeof fetch>((entrada) => {
    const ruta = String(entrada)
    const url = new URL(ruta, "http://x")
    if (ruta === "/api/auth/refrescar") {
      return Promise.resolve(respuestaJson(200, { tokenAcceso: "restaurado" }))
    }
    if (ruta === "/api/me") {
      return Promise.resolve(
        respuestaJson(200, {
          id: "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
          nombre: "Ana López",
          email: "ana@ejemplo.mx",
          rol: "estudiante",
          debeCambiarContrasena: false,
          accesoRestringido: false,
        }),
      )
    }
    if (url.pathname === `/api/clases/${CLASE_ID}`) {
      return Promise.resolve(
        respuestaJson(200, {
          clase: { id: CLASE_ID, nombre: "Historia", descripcion: null, maestro: AUTOR },
        }),
      )
    }
    if (url.pathname === `/api/clases/${CLASE_ID}/personas`) {
      return Promise.resolve(
        respuestaJson(200, {
          maestro: AUTOR,
          alumnos: [],
          totalAlumnos: 0,
          siguienteCursor: null,
        }),
      )
    }
    if (url.pathname.endsWith("/comentarios")) {
      const r = paginar(estado.comentarios, url)
      if (r === null) return Promise.resolve(cursorInvalido())
      return Promise.resolve(
        respuestaJson(200, { comentarios: r.pagina, siguienteCursor: r.siguiente }),
      )
    }
    if (url.pathname === `/api/clases/${CLASE_ID}/publicaciones`) {
      const r = paginar(estado.publicaciones, url)
      if (r === null) return Promise.resolve(cursorInvalido())
      return Promise.resolve(
        respuestaJson(200, { publicaciones: r.pagina, siguienteCursor: r.siguiente }),
      )
    }
    if (url.pathname.startsWith("/api/clases/inscritas")) {
      return Promise.resolve(respuestaJson(200, { clases: [], total: 0, siguienteCursor: null }))
    }
    return Promise.resolve(
      respuestaJson(403, { error: { codigo: "SIN_ACCESO_A_LA_CLASE", mensaje: "No." } }),
    )
  })
  vi.stubGlobal("fetch", fetchMock)
  return { estado, fetchMock }
}

const renderEn = async (ruta: string) => {
  const { rutas } = await import("./router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms))

// Carga el muro, borra el cursor de la página siguiente y pulsa "Ver más publicaciones".
const muroEnError = async () => {
  const servidor = crearServidor()
  const router = await renderEn(`/estudiante/clases/${CLASE_ID}`)
  const verMas = await screen.findByRole(
    "button",
    { name: "Ver más publicaciones" },
    {
      timeout: 5000,
    },
  )
  servidor.estado.publicaciones = servidor.estado.publicaciones.filter(
    (p) => p.id !== idPublicacion(20),
  )
  fireEvent.click(verMas)
  expect(await screen.findByText(TEXTO_MURO)).toBeInTheDocument()
  return { ...servidor, router }
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

describe("ataque CLASES-c r3: qué recupera la lista tras el 400 del cursor (sin recargar)", () => {
  it("muro: cambiar a «Personas» y regresar a «Muro» recupera la lista", async () => {
    await muroEnError()
    fireEvent.click(screen.getByRole("link", { name: "Personas" }))
    await screen.findByRole("heading", { name: "Alumnos" }, { timeout: 5000 })
    fireEvent.click(screen.getByRole("link", { name: "Muro" }))
    expect(await screen.findByText("Publicación 21", undefined, { timeout: 5000 })).toBeTruthy()
    expect(screen.queryByText(TEXTO_MURO)).toBeNull()
  })

  it("muro: estando en el muro, «Vuelve a abrirlo» pulsando «Muro» recupera la lista", async () => {
    const { router } = await muroEnError()
    const antes = router.state.location.key
    fireEvent.click(screen.getByRole("link", { name: "Muro" }))
    await waitFor(() => expect(router.state.location.key).not.toBe(antes))
    await esperar(500)
    expect(
      screen.queryByText(TEXTO_MURO),
      "pulsar «Muro» (abrir el muro estando en él) no hace nada: la vista no se desmonta ni se vuelve a pedir la lista; lo que recupera es cambiar de sección y regresar",
    ).toBeNull()
    expect(screen.queryByText("Publicación 1")).toBeTruthy()
  })

  it("comentarios: «Ocultar comentarios» y «Ver comentarios» otra vez recupera la lista", async () => {
    const { estado } = crearServidor()
    await renderEn(`/estudiante/clases/${CLASE_ID}`)
    fireEvent.click(
      await screen.findByRole("button", { name: "Ver comentarios (25)" }, { timeout: 5000 }),
    )
    const verMas = await screen.findByRole("button", { name: "Ver más comentarios" })
    estado.comentarios = estado.comentarios.filter((c) => c.id !== idComentario(20))
    fireEvent.click(verMas)
    expect(await screen.findByText(TEXTO_COMENTARIOS)).toBeInTheDocument()
    const tarjeta = screen.getByText("Publicación 1").closest("li")
    if (!(tarjeta instanceof HTMLElement)) throw new Error("Precondición: falta la publicación 1")
    fireEvent.click(within(tarjeta).getByRole("button", { name: "Ocultar comentarios" }))
    fireEvent.click(within(tarjeta).getByRole("button", { name: "Ver comentarios (25)" }))
    expect(await screen.findByText("Comentario 21", undefined, { timeout: 5000 })).toBeTruthy()
    expect(screen.queryByText(TEXTO_COMENTARIOS)).toBeNull()
  })
})
