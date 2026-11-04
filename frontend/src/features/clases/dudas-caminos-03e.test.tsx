// CLASES-03e (§D-10): las frases de recuperación de «Dudas» por cada camino, con el router real
// (`rutas`) y el QueryClient de app/providers.tsx (staleTime de 30 s, un reintento): R4 (CL3-E09), R5
// (CL3-E10) y R9 en la lista y en las respuestas (CL3-E13); y la ruta …/dudas (CL3-E12).
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

type Rol = "estudiante" | "maestro" | "admin"

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const API = `/api/clases/${CLASE_ID}`
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const FIRMA_MAESTRO = { ...MAESTRO, administracion: false }
const FIRMA_ALUMNA = {
  id: "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
  nombre: "Ana López",
  administracion: false,
}
const BASES: Record<Rol, string> = {
  estudiante: "/estudiante/clases",
  maestro: "/maestro/clases",
  admin: "/admin/clases",
}
const ESPERA = { timeout: 5000 }
const CREADO_EN = "2026-10-01T15:30:00.000Z"

const idDuda = (n: number) => `5a5b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const idRespuesta = (n: number) => `7a7b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorJson = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface DudaDoble {
  id: string
  texto: string
  autor: typeof FIRMA_ALUMNA
  creadoEn: string
  resuelta: boolean
  resueltaEn: string | null
  respuestas: number
  propia: boolean
  puedeBorrar: boolean
  puedeMarcar: boolean
}

const duda = (n: number, extra: Partial<DudaDoble> = {}): DudaDoble => ({
  id: idDuda(n),
  texto: `Duda ${String(n)}`,
  autor: FIRMA_ALUMNA,
  creadoEn: CREADO_EN,
  resuelta: false,
  resueltaEn: null,
  respuestas: 0,
  propia: false,
  puedeBorrar: true,
  puedeMarcar: true,
  ...extra,
})

interface RespuestaDoble {
  id: string
  texto: string
  autor: typeof FIRMA_MAESTRO
  creadoEn: string
  propio: boolean
  puedeBorrar: boolean
}

const respuesta = (n: number, extra: Partial<RespuestaDoble> = {}): RespuestaDoble => ({
  id: idRespuesta(n),
  texto: `Respuesta ${String(n)}`,
  autor: FIRMA_MAESTRO,
  creadoEn: CREADO_EN,
  propio: false,
  puedeBorrar: true,
  ...extra,
})

interface Llamada {
  metodo: string
  url: URL
  cuerpo: unknown
}

interface Estado {
  // De la más reciente a la más antigua, como las devuelve el servidor.
  dudas: DudaDoble[]
  respuestas: Record<string, RespuestaDoble[]>
  // Respuesta propia para una petición (null: la de siempre).
  falla: (llamada: Llamada) => Response | Promise<Response> | null
  inesperadas: string[]
}

// Paginación real (cursor = id de la última fila); un cursor que ya no está responde 400 VALIDACION
// "cursor: no es válido", como el adaptador.
const paginar = <T extends { id: string }>(filas: readonly T[], url: URL) => {
  const limite = Number(url.searchParams.get("limite") ?? "20")
  const cursor = url.searchParams.get("cursor")
  let inicio = 0
  if (cursor !== null) {
    const indice = filas.findIndex((fila) => fila.id === cursor)
    if (indice === -1) return null
    inicio = indice + 1
  }
  const pagina = filas.slice(inicio, inicio + limite)
  const siguiente = filas.length > inicio + limite ? (pagina.at(-1)?.id ?? null) : null
  return { pagina, siguiente }
}

const cursorInvalido = () => errorJson(400, "VALIDACION", "cursor: no es válido")
const noEncontrada = () => errorJson(404, "DUDA_NO_ENCONTRADA", "Esa duda ya no existe.")

// Servidor doble de «Dudas» (y de lo que pide el marco de la clase). `estado.falla` responde por su
// cuenta la petición que quiera la prueba.
const crearServidor = (rol: Rol, dudas: DudaDoble[] = []) => {
  const estado: Estado = { dudas, respuestas: {}, falla: () => null, inesperadas: [] }
  let siguienteId = 500
  const fetchMock = vi.fn<typeof fetch>(async (entrada, init) => {
    const url = new URL(String(entrada), "http://x")
    const metodo = init?.method ?? "GET"
    const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined
    if (url.pathname === "/api/auth/refrescar") {
      return respuestaJson(200, { tokenAcceso: "restaurado" })
    }
    if (url.pathname === "/api/me") {
      return respuestaJson(200, {
        id: FIRMA_ALUMNA.id,
        nombre: FIRMA_ALUMNA.nombre,
        email: "ana@ejemplo.mx",
        rol,
        debeCambiarContrasena: false,
        accesoRestringido: false,
      })
    }
    const propia = estado.falla({ metodo, url, cuerpo })
    if (propia !== null) return propia
    if (url.pathname === "/api/clases/inscritas" || url.pathname === "/api/clases/impartidas") {
      return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
    }
    if (url.pathname === API) {
      return respuestaJson(200, {
        clase: {
          id: CLASE_ID,
          nombre: "Historia",
          descripcion: null,
          maestro: MAESTRO,
          maestros: [MAESTRO],
        },
      })
    }
    if (url.pathname === `${API}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
    if (url.pathname === `${API}/publicaciones` && metodo === "GET") {
      return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
    }
    if (url.pathname === `${API}/dudas` && metodo === "GET") {
      const r = paginar(estado.dudas, url)
      if (r === null) return cursorInvalido()
      return respuestaJson(200, { dudas: r.pagina, siguienteCursor: r.siguiente })
    }
    if (url.pathname === `${API}/dudas` && metodo === "POST") {
      siguienteId += 1
      const nueva = duda(siguienteId, {
        texto: (cuerpo as { texto: string }).texto,
        propia: true,
      })
      estado.dudas = [nueva, ...estado.dudas]
      return respuestaJson(201, { duda: nueva })
    }
    const deDuda =
      /^\/api\/clases\/[^/]+\/dudas\/([^/]+)(\/resuelta|\/respuestas)?(?:\/([^/]+))?$/.exec(
        url.pathname,
      )
    if (deDuda !== null) {
      const dudaId = deDuda[1] ?? ""
      const encontrada = estado.dudas.find(({ id }) => id === dudaId)
      if (encontrada === undefined) return noEncontrada()
      if (deDuda[2] === "/resuelta") {
        const { resuelta } = cuerpo as { resuelta: boolean }
        encontrada.resuelta = resuelta
        encontrada.resueltaEn = resuelta ? CREADO_EN : null
        return respuestaJson(200, { duda: encontrada })
      }
      if (deDuda[2] === "/respuestas") {
        const lista = (estado.respuestas[dudaId] ??= [])
        const respuestaId = deDuda[3]
        if (respuestaId !== undefined && metodo === "DELETE") {
          if (!lista.some(({ id }) => id === respuestaId)) {
            return errorJson(404, "RESPUESTA_NO_ENCONTRADA", "Esa respuesta ya no existe.")
          }
          estado.respuestas[dudaId] = lista.filter(({ id }) => id !== respuestaId)
          encontrada.respuestas -= 1
          return new Response(null, { status: 204 })
        }
        if (metodo === "POST") {
          siguienteId += 1
          const nueva = respuesta(siguienteId, { texto: (cuerpo as { texto: string }).texto })
          lista.push(nueva)
          encontrada.respuestas += 1
          return respuestaJson(201, { comentario: nueva })
        }
        const r = paginar(lista, url)
        if (r === null) return cursorInvalido()
        return respuestaJson(200, { comentarios: r.pagina, siguienteCursor: r.siguiente })
      }
      if (metodo === "DELETE") {
        estado.dudas = estado.dudas.filter(({ id }) => id !== dudaId)
        delete estado.respuestas[dudaId]
        return new Response(null, { status: 204 })
      }
    }
    estado.inesperadas.push(`${metodo} ${url.pathname}${url.search}`)
    return errorJson(500, "ERROR_INTERNO", "no esperada")
  })
  vi.stubGlobal("fetch", fetchMock)
  return { estado, fetchMock }
}

type FetchMock = ReturnType<typeof crearServidor>["fetchMock"]

const llamadasDe = (fetchMock: FetchMock, metodo: string, pathname: string) =>
  fetchMock.mock.calls
    .filter(([, init]) => (init?.method ?? "GET") === metodo)
    .map(([entrada, init]) => ({
      url: new URL(String(entrada), "http://x"),
      cuerpo: typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined,
    }))
    .filter(({ url }) => url.pathname === pathname)

const pedidas = (fetchMock: FetchMock, pathname: string) =>
  llamadasDe(fetchMock, "GET", pathname).map(({ url }) => url)

const montar = async (entradas: string[], cliente?: QueryClient) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: entradas })
  const arbol = <RouterProvider router={router} />
  const vista = render(
    cliente === undefined ? (
      <Providers>{arbol}</Providers>
    ) : (
      <QueryClientProvider client={cliente}>{arbol}</QueryClientProvider>
    ),
  )
  return { router, vista }
}

const reposar = () => act(() => new Promise((resolver) => setTimeout(resolver, 150)))

const DUDAS = (rol: Rol) => `${BASES[rol]}/${CLASE_ID}/dudas`
const AVISOS = (rol: Rol) => `${BASES[rol]}/${CLASE_ID}`
const RUTA_DUDAS = `${API}/dudas`
const rutaRespuestas = (n: number) => `${API}/dudas/${idDuda(n)}/respuestas`

const filaDe = (texto: string) => {
  const fila = screen.getByText(texto, { selector: "p" }).closest<HTMLElement>("[data-duda-id]")
  if (fila === null) throw new Error(`Precondición: la fila «${texto}»`)
  return fila
}

const esperarFila = async (texto: string) => {
  await screen.findByText(texto, { selector: "p" }, ESPERA)
  return filaDe(texto)
}

const controlDe = (fila: HTMLElement) => {
  const control = fila.querySelector<HTMLButtonElement>("[data-desplegar-respuestas]")
  if (control === null) throw new Error("Precondición: el control de las respuestas")
  return control
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const enLasSecciones = (nombre: string) =>
  within(screen.getByRole("list", { name: "Secciones de la clase" })).getByRole("link", {
    name: nombre,
  })

const R4 = "Las dudas cambiaron mientras las veías. Vuelve a abrir Dudas para verlas completas."
const R5 = "Las respuestas cambiaron mientras las veías. Vuelve a abrirlas para verlas completas."
const VACIO_DE_AVISOS = "Publica el primer aviso de tu clase."

// R4: 25 dudas; al pedir "Ver más dudas", la última de la primera página ya no está: el cursor vence y
// la lista dice R4.
const conR4 = async (entradas = [DUDAS("maestro")]) => {
  const servidor = crearServidor(
    "maestro",
    Array.from({ length: 25 }, (_, i) => duda(25 - i)),
  )
  const montaje = await montar(entradas)
  await screen.findByRole("heading", { level: 2, name: "Dudas" }, ESPERA)
  await esperarFila("Duda 6")
  const verMas = screen.getByRole("button", { name: "Ver más dudas" })
  servidor.estado.dudas = servidor.estado.dudas.filter(({ id }) => id !== idDuda(6))
  fireEvent.click(verMas)
  expect(await screen.findByText(R4, undefined, ESPERA)).toBeInTheDocument()
  return { ...servidor, ...montaje }
}

const sinR4 = async (fetchMock: FetchMock, antes: number) => {
  await waitFor(() => expect(screen.queryByText(R4)).toBeNull(), ESPERA)
  await esperarFila("Duda 7")
  const nuevas = pedidas(fetchMock, RUTA_DUDAS).slice(antes)
  expect(nuevas.length).toBeGreaterThan(0)
  expect(nuevas[0]?.searchParams.has("cursor")).toBe(false)
}

describe("CL3-E09 · R4, «Vuelve a abrir Dudas», por cada camino", () => {
  it("CL3-E09 (a): pulsar «Dudas» estando ahí pide la lista desde la primera página y la frase desaparece", async () => {
    const { fetchMock } = await conR4()
    await reposar()
    const antes = pedidas(fetchMock, RUTA_DUDAS).length
    fireEvent.click(enLasSecciones("Dudas"))
    await sinR4(fetchMock, antes)
  })

  it("CL3-E09 (b): ir a «Avisos» y volver antes de 30 s pide la lista y la frase desaparece", async () => {
    const { fetchMock } = await conR4()
    const antes = pedidas(fetchMock, RUTA_DUDAS).length
    fireEvent.click(enLasSecciones("Avisos"))
    await screen.findByText(VACIO_DE_AVISOS, undefined, ESPERA)
    fireEvent.click(enLasSecciones("Dudas"))
    await screen.findByRole("heading", { level: 2, name: "Dudas" }, ESPERA)
    await sinR4(fetchMock, antes)
  })

  it("CL3-E09 (c): atrás y adelante del historial piden la lista y la frase desaparece", async () => {
    const { fetchMock, router } = await conR4([AVISOS("maestro"), DUDAS("maestro")])
    const antes = pedidas(fetchMock, RUTA_DUDAS).length
    await act(() => router.navigate(-1))
    await screen.findByText(VACIO_DE_AVISOS, undefined, ESPERA)
    await act(() => router.navigate(1))
    await screen.findByRole("heading", { level: 2, name: "Dudas" }, ESPERA)
    await sinR4(fetchMock, antes)
  })

  it("CL3-E09 (d): con la frase a la vista no se ofrece «Ver más dudas»", async () => {
    await conR4()
    expect(screen.queryByRole("button", { name: "Ver más dudas" })).toBeNull()
  })
})

// R5: la duda 2 tiene 25 respuestas (y la duda 1, una, sana); al pedir "Ver más respuestas", la última de
// la primera página ya no está y el bloque de la duda 2 dice R5.
const conR5 = async (abrirLaSana = false) => {
  const servidor = crearServidor("maestro", [
    duda(2, { respuestas: 25 }),
    duda(1, { respuestas: 1 }),
  ])
  servidor.estado.respuestas[idDuda(2)] = Array.from({ length: 25 }, (_, i) => respuesta(i + 1))
  servidor.estado.respuestas[idDuda(1)] = [respuesta(90)]
  const montaje = await montar([AVISOS("maestro"), DUDAS("maestro")])
  await screen.findByRole("heading", { level: 2, name: "Dudas" }, ESPERA)
  const fila = await esperarFila("Duda 2")
  if (abrirLaSana) {
    fireEvent.click(controlDe(filaDe("Duda 1")))
    await within(filaDe("Duda 1")).findByText("Respuesta 90", undefined, ESPERA)
  }
  fireEvent.click(controlDe(fila))
  const verMas = await within(fila).findByRole("button", { name: "Ver más respuestas" }, ESPERA)
  servidor.estado.respuestas[idDuda(2)] = (servidor.estado.respuestas[idDuda(2)] ?? []).filter(
    ({ id }) => id !== idRespuesta(20),
  )
  fireEvent.click(verMas)
  expect(await within(fila).findByText(R5, undefined, ESPERA)).toBeInTheDocument()
  return { ...servidor, ...montaje, fila }
}

const sinR5 = async (fetchMock: FetchMock, antes: number) => {
  await waitFor(() => expect(screen.queryByText(R5)).toBeNull(), ESPERA)
  await within(filaDe("Duda 2")).findByText("Respuesta 1", undefined, ESPERA)
  const nuevas = pedidas(fetchMock, rutaRespuestas(2)).slice(antes)
  expect(nuevas.length).toBeGreaterThan(0)
  expect(nuevas[0]?.searchParams.has("cursor")).toBe(false)
}

describe("CL3-E10 · R5, «Vuelve a abrirlas», por cada camino", () => {
  it("CL3-E10 (a): «Ocultar respuestas» y «Ver respuestas (n)» piden la primera página y la frase desaparece", async () => {
    const { fetchMock, fila } = await conR5()
    const antes = pedidas(fetchMock, rutaRespuestas(2)).length
    fireEvent.click(controlDe(fila))
    expect(controlDe(fila)).toHaveTextContent("Ver respuestas (25)")
    fireEvent.click(controlDe(fila))
    await sinR5(fetchMock, antes)
  })

  it("CL3-E10 (b): pulsar «Dudas» estando ahí con el bloque abierto en error lo vuelve a pedir; otras respuestas abiertas y sanas no se piden", async () => {
    const { fetchMock } = await conR5(true)
    await reposar()
    const antes = pedidas(fetchMock, rutaRespuestas(2)).length
    const sanasAntes = pedidas(fetchMock, rutaRespuestas(1)).length
    fireEvent.click(enLasSecciones("Dudas"))
    await sinR5(fetchMock, antes)
    await reposar()
    expect(pedidas(fetchMock, rutaRespuestas(1))).toHaveLength(sanasAntes)
  })

  it("CL3-E10 (c): ir a «Avisos», volver y reabrirlas las pide y la frase desaparece", async () => {
    const { fetchMock } = await conR5()
    const antes = pedidas(fetchMock, rutaRespuestas(2)).length
    fireEvent.click(enLasSecciones("Avisos"))
    await screen.findByText(VACIO_DE_AVISOS, undefined, ESPERA)
    fireEvent.click(enLasSecciones("Dudas"))
    fireEvent.click(controlDe(await esperarFila("Duda 2")))
    await sinR5(fetchMock, antes)
  })

  it("CL3-E10 (d): con la frase a la vista no se ofrece «Ver más respuestas»", async () => {
    const { fila } = await conR5()
    expect(within(fila).queryByRole("button", { name: "Ver más respuestas" })).toBeNull()
  })
})

describe("CL3-E12 · la ruta …/dudas y la sección «Dudas»", () => {
  it.each(["estudiante", "maestro", "admin"] as const)(
    "CL3-E12: %s en …/dudas monta «Dudas», con la sección activa entre «Recursos» y «Personas»",
    async (rol) => {
      crearServidor(rol)
      await montar([DUDAS(rol)])
      expect(
        await screen.findByRole("heading", { level: 2, name: "Dudas" }, ESPERA),
      ).toBeInTheDocument()
      const nombres = within(screen.getByRole("list", { name: "Secciones de la clase" }))
        .getAllByRole("link")
        .map((enlace) => enlace.textContent)
      expect(nombres).toEqual([
        "Avisos",
        "Actividades de aprendizaje",
        "Recursos",
        "Dudas",
        "Personas",
        "Calificaciones",
      ])
      expect(enLasSecciones("Dudas")).toHaveAttribute("aria-current", "page")
      expect(enLasSecciones("Dudas")).toHaveAttribute("href", DUDAS(rol))
    },
  )
})

type Falla = "500" | "red"
type LugarR9 = "la lista de Dudas" | "las respuestas de una duda"

const FALLAS = ["500", "red"] as const

const respuestaDeLaFalla = (falla: Falla) =>
  falla === "red"
    ? Promise.reject(new TypeError("Failed to fetch"))
    : errorJson(500, "ERROR_INTERNO", "Falló.")

const esDelLugar = (lugar: LugarR9, { metodo, url }: Llamada) =>
  metodo === "GET" &&
  url.pathname === (lugar === "la lista de Dudas" ? RUTA_DUDAS : rutaRespuestas(1))

// R9: la primera carga del lugar falla (también el reintento) y deja su MensajeError; después el
// servidor vuelve a responder.
const conR9 = async (lugar: LugarR9, falla: Falla, entradas = [DUDAS("maestro")]) => {
  const servidor = crearServidor("maestro", [duda(1, { respuestas: 1 })])
  servidor.estado.respuestas[idDuda(1)] = [respuesta(1)]
  let fallando = true
  servidor.estado.falla = (llamada) =>
    fallando && esDelLugar(lugar, llamada) ? respuestaDeLaFalla(falla) : null
  const montaje = await montar(entradas)
  await screen.findByRole("heading", { level: 2, name: "Dudas" }, ESPERA)
  if (lugar === "las respuestas de una duda") {
    fireEvent.click(controlDe(await esperarFila("Duda 1")))
  }
  expect(await screen.findByRole("alert", undefined, ESPERA)).toBeInTheDocument()
  fallando = false
  return { ...servidor, ...montaje }
}

const pedidasDelLugar = (fetchMock: FetchMock, lugar: LugarR9) =>
  pedidas(fetchMock, lugar === "la lista de Dudas" ? RUTA_DUDAS : rutaRespuestas(1))

const sinErrorEn = async (lugar: LugarR9) => {
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull(), ESPERA)
  if (lugar === "la lista de Dudas") {
    await esperarFila("Duda 1")
    return
  }
  await within(filaDe("Duda 1")).findByText("Respuesta 1", undefined, ESPERA)
}

describe("CL3-E13 · R9 en «Dudas», un caso por camino y por lugar", () => {
  it.each(FALLAS)(
    "CL3-E13 (3a): primera carga de la lista con %s; pulsar «Dudas» estando ahí la vuelve a pedir y el texto desaparece",
    async (falla) => {
      const { fetchMock } = await conR9("la lista de Dudas", falla)
      await reposar()
      const antes = pedidasDelLugar(fetchMock, "la lista de Dudas").length
      fireEvent.click(enLasSecciones("Dudas"))
      await sinErrorEn("la lista de Dudas")
      expect(pedidasDelLugar(fetchMock, "la lista de Dudas").length).toBeGreaterThan(antes)
    },
  )

  it.each(FALLAS)(
    "CL3-E13 (3b): primera carga de la lista con %s; ir a «Avisos» y volver antes de 30 s la pide y el texto desaparece",
    async (falla) => {
      const { fetchMock } = await conR9("la lista de Dudas", falla)
      const antes = pedidasDelLugar(fetchMock, "la lista de Dudas").length
      fireEvent.click(enLasSecciones("Avisos"))
      await screen.findByText(VACIO_DE_AVISOS, undefined, ESPERA)
      fireEvent.click(enLasSecciones("Dudas"))
      await sinErrorEn("la lista de Dudas")
      expect(pedidasDelLugar(fetchMock, "la lista de Dudas").length).toBeGreaterThan(antes)
    },
  )

  it.each(FALLAS)(
    "CL3-E13 (3c): primera carga de la lista con %s; atrás y adelante del historial la piden y el texto desaparece",
    async (falla) => {
      const { fetchMock, router } = await conR9("la lista de Dudas", falla, [
        AVISOS("maestro"),
        DUDAS("maestro"),
      ])
      const antes = pedidasDelLugar(fetchMock, "la lista de Dudas").length
      await act(() => router.navigate(-1))
      await screen.findByText(VACIO_DE_AVISOS, undefined, ESPERA)
      await act(() => router.navigate(1))
      await sinErrorEn("la lista de Dudas")
      expect(pedidasDelLugar(fetchMock, "la lista de Dudas").length).toBeGreaterThan(antes)
    },
  )

  it.each(FALLAS)(
    "CL3-E13 (4): primera carga de las respuestas con %s; «Ocultar respuestas» y «Ver respuestas (n)» las piden y el texto desaparece",
    async (falla) => {
      const { fetchMock } = await conR9("las respuestas de una duda", falla)
      const antes = pedidasDelLugar(fetchMock, "las respuestas de una duda").length
      fireEvent.click(controlDe(filaDe("Duda 1")))
      fireEvent.click(controlDe(filaDe("Duda 1")))
      await sinErrorEn("las respuestas de una duda")
      expect(pedidasDelLugar(fetchMock, "las respuestas de una duda").length).toBeGreaterThan(antes)
    },
  )

  it.each(FALLAS)(
    "CL3-E13 (4): primera carga de las respuestas con %s en una duda sin respuestas; «Ocultar respuestas» y «Responder» las piden y el texto desaparece",
    async (falla) => {
      const servidor = crearServidor("maestro", [duda(1)])
      let fallando = true
      servidor.estado.falla = (llamada) =>
        fallando && esDelLugar("las respuestas de una duda", llamada)
          ? respuestaDeLaFalla(falla)
          : null
      await montar([DUDAS("maestro")])
      const fila = await esperarFila("Duda 1")
      fireEvent.click(controlDe(fila))
      expect(await within(fila).findByRole("alert", undefined, ESPERA)).toBeInTheDocument()
      fallando = false
      const antes = pedidasDelLugar(servidor.fetchMock, "las respuestas de una duda").length
      fireEvent.click(controlDe(fila))
      expect(controlDe(fila)).toHaveTextContent("Responder")
      fireEvent.click(controlDe(fila))
      await waitFor(() => expect(within(fila).queryByRole("alert")).toBeNull(), ESPERA)
      expect(
        pedidasDelLugar(servidor.fetchMock, "las respuestas de una duda").length,
      ).toBeGreaterThan(antes)
    },
  )

  it.each(FALLAS)(
    "CL3-E13 (4a): primera carga de las respuestas con %s; pulsar «Dudas» con el bloque abierto las vuelve a pedir y el texto desaparece",
    async (falla) => {
      const { fetchMock } = await conR9("las respuestas de una duda", falla)
      await reposar()
      const antes = pedidasDelLugar(fetchMock, "las respuestas de una duda").length
      fireEvent.click(enLasSecciones("Dudas"))
      await sinErrorEn("las respuestas de una duda")
      expect(pedidasDelLugar(fetchMock, "las respuestas de una duda").length).toBeGreaterThan(antes)
    },
  )

  it.each(FALLAS)(
    "CL3-E13 (4b): primera carga de las respuestas con %s; ir a «Avisos», volver y reabrirlas las pide y el texto desaparece",
    async (falla) => {
      const { fetchMock } = await conR9("las respuestas de una duda", falla)
      const antes = pedidasDelLugar(fetchMock, "las respuestas de una duda").length
      fireEvent.click(enLasSecciones("Avisos"))
      await screen.findByText(VACIO_DE_AVISOS, undefined, ESPERA)
      fireEvent.click(enLasSecciones("Dudas"))
      fireEvent.click(controlDe(await esperarFila("Duda 1")))
      await sinErrorEn("las respuestas de una duda")
      expect(pedidasDelLugar(fetchMock, "las respuestas de una duda").length).toBeGreaterThan(antes)
    },
  )

  it.each(FALLAS)(
    "CL3-E13 (4c): primera carga de las respuestas con %s; atrás y adelante del historial y reabrirlas las pide y el texto desaparece",
    async (falla) => {
      const { fetchMock, router } = await conR9("las respuestas de una duda", falla, [
        AVISOS("maestro"),
        DUDAS("maestro"),
      ])
      const antes = pedidasDelLugar(fetchMock, "las respuestas de una duda").length
      await act(() => router.navigate(-1))
      await screen.findByText(VACIO_DE_AVISOS, undefined, ESPERA)
      await act(() => router.navigate(1))
      fireEvent.click(controlDe(await esperarFila("Duda 1")))
      await sinErrorEn("las respuestas de una duda")
      expect(pedidasDelLugar(fetchMock, "las respuestas de una duda").length).toBeGreaterThan(antes)
    },
  )
})
