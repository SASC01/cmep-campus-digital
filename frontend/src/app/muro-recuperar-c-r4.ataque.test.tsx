import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Tester, CLASES-c, ronda 4 (regresión final de T-35): con el router real, el refetch de MuroView
// solo ocurre con una navegación nueva y la lista en error. Se cuentan las peticiones de la primera
// página: primer render, error sin navegar, "Muro" con la lista en error y "Muro" con la lista sana.
// El servidor en memoria se reescribe aquí (no se importa de ningún *.ataque).

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const AUTOR = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const idPublicacion = (n: number) => `5a5b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const idComentario = (n: number) => `6a6b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const TEXTO_MURO = "El muro cambió mientras lo veías. Vuelve a abrirlo para verlo completo."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

// CLASES-d ronda 0, complemento (C-21, §D-R0; §D-D5 "Forma de los datos" y Enmienda 10 del plan de
// CLASES-01): adjuntos es obligatorio en publicacionSchema y el backend lo manda siempre ([] si no
// hay adjuntos), en el muro y en la respuesta 201 de crear. El doble lo trae para seguir pasando el
// schema.parse de apiClient; ninguna aserción cambia y protege lo mismo que antes.
const publicacion = (n: number, comentarios = 0) => ({
  id: idPublicacion(n),
  tipo: "anuncio",
  titulo: null,
  texto: `Publicación ${String(n)}`,
  autor: AUTOR,
  creadoEn: "2026-09-29T15:30:00.000Z",
  comentarios,
  adjuntos: [],
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

// Peticiones GET de la primera página del muro (sin cursor).
const primerasPaginas = (fetchMock: ReturnType<typeof vi.fn<typeof fetch>>) =>
  fetchMock.mock.calls.filter(([entrada]) => {
    const url = new URL(String(entrada), "http://x")
    return (
      url.pathname === `/api/clases/${CLASE_ID}/publicaciones` && !url.searchParams.has("cursor")
    )
  }).length

describe("ataque CLASES-c r4: T-35 sin peticiones de más (regresión final)", () => {
  it("primer render: una sola petición de la primera página; con el error y sin navegación nueva, ninguna más; «Muro» pide una; con el muro ya sano, «Muro» no pide nada; «Ver más» vuelve a funcionar", async () => {
    const { fetchMock, router } = await muroEnError()
    expect(primerasPaginas(fetchMock), "primer render").toBe(1)
    await esperar(300)
    expect(primerasPaginas(fetchMock), "con el error y sin navegación nueva").toBe(1)

    const antes = router.state.location.key
    fireEvent.click(screen.getByRole("link", { name: "Muro" }))
    await waitFor(() => expect(router.state.location.key).not.toBe(antes))
    expect(await screen.findByText("Publicación 21", undefined, { timeout: 5000 })).toBeTruthy()
    expect(screen.queryByText(TEXTO_MURO)).toBeNull()
    expect(primerasPaginas(fetchMock), "«Muro» con la lista en error").toBe(2)

    fireEvent.click(screen.getByRole("link", { name: "Muro" }))
    await esperar(300)
    expect(primerasPaginas(fetchMock), "«Muro» con la lista sana").toBe(2)

    // El cursor se recalcula desde la página nueva: "Ver más" trae el resto sin error.
    fireEvent.click(screen.getByRole("button", { name: "Ver más publicaciones" }))
    expect(await screen.findByText("Publicación 25", undefined, { timeout: 5000 })).toBeTruthy()
    expect(screen.queryByText(TEXTO_MURO)).toBeNull()
  })
})
