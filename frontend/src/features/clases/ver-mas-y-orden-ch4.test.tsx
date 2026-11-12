import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/services/apiClient"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import {
  CLAVE_CLASES_IMPARTIDAS,
  CLAVE_CLASES_INSCRITAS,
  claveComentarios,
  TEXTOS_COMENTARIOS,
  TEXTOS_PANEL,
  TEXTOS_PUBLICACION,
  TEXTOS_TRABAJO,
} from "./data"
import { mensajeDeErrorDeLista, ordenDeLasVariables } from "./lib"

// CHORE-04 (§D-3, §D-4 y §D-4 bis; filas 27 a 29 y H-1): «Ver más comentarios», «Ver más clases» de los
// dos inicios, «Reintentar» de la lista de clases de la barra y «Subir»/«Bajar» de los temas entre
// montajes y entre clases. Router real (`rutas` de app/router) y la caché con las defaultOptions de
// app/providers.tsx. "El mismo render" es dos eventos dentro de un solo act. La red es un doble de fetch;
// las respuestas que la prueba sostiene se retienen con una promesa que la prueba suelta.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

type Rol = "estudiante" | "maestro"
type Respuesta = () => Response | Promise<Response>

interface Llamada {
  metodo: string
  url: URL
  cuerpo: unknown
}

const ESPERA = { timeout: 5000 }
const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const A = uuid("2a2b3c4d", 1)
const B = uuid("2a2b3c4d", 2)
const PUBLICACION = uuid("5a5b3c4d", 1)
const MAESTRO = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez" }
const FIRMA = { ...MAESTRO, administracion: false }
const CREADO_EN = "2026-10-01T15:30:00.000Z"
const tema = (claseId: string, n: number) => uuid(claseId === A ? "7a7b3c4d" : "8a8b3c4d", n)
const NOMBRE_TEMA: Record<string, string> = {}
for (const claseId of [A, B]) {
  for (const n of [1, 2, 3]) {
    NOMBRE_TEMA[tema(claseId, n)] = claseId === A ? `Unidad ${String(n)}` : `Bloque ${String(n)}`
  }
}
const idComentario = (n: number) => uuid("6a6b3c4d", n)
const idClase = (n: number) => uuid("9a9b3c4d", n)

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })
const error500 = () => errorApi(500, "ERROR_INTERNO")
const ERROR_500 = new ApiError("ERROR_INTERNO", "mensaje del servidor", 500)

// CH4-30 (c) y CH4-31 (c): tras el fallo de una página (con su reintento), un solo MensajeError con el
// texto esperado, el «Ver más» ya no está y nada queda en espera.
const comprobarFalloDeLaPagina = async (nombreDelBoton: string, texto: string) => {
  await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1), { timeout: 8000 })
  expect(screen.getByRole("alert")).toHaveTextContent(texto)
  expect(screen.queryByRole("button", { name: nombreDelBoton })).toBeNull()
  expect(screen.queryAllByRole("button", { busy: true })).toHaveLength(0)
}

interface Servidor {
  rol: Rol
  temas: Record<string, string[]>
  comentarios: string[]
  clases: string[]
  barraFalla: number
}

type Interceptor = (llamada: Llamada) => Respuesta | undefined

let servidor: Servidor
let llamadas: Llamada[] = []
let interceptores: Interceptor[] = []

// Una respuesta propia para la próxima petición que cumpla la condición; después, la del doble.
const interceptarUnaVez = (cumple: (llamada: Llamada) => boolean, respuesta: Respuesta) => {
  const propio: Interceptor = (llamada) => {
    if (!cumple(llamada)) return undefined
    interceptores = interceptores.filter((otro) => otro !== propio)
    return respuesta
  }
  interceptores.push(propio)
}

const retenida = () => {
  const pendientes: ((respuesta: Response) => void)[] = []
  const respuesta: Respuesta = () =>
    new Promise<Response>((resolver) => {
      pendientes.push(resolver)
    })
  const soltar = async (valor?: Respuesta) => {
    const resolver = pendientes.shift()
    if (resolver === undefined) throw new Error("Precondición: la petición retenida ya salió")
    await act(async () => {
      resolver(await Promise.resolve().then(valor ?? (() => new Response(null, { status: 599 }))))
      await new Promise((r) => setTimeout(r, 0))
    })
  }
  return { respuesta, soltar }
}

const paginar = (ids: readonly string[], url: URL, tamano: number) => {
  const cursor = url.searchParams.get("cursor")
  const inicio = cursor === null ? 0 : ids.indexOf(cursor) + 1
  const pagina = ids.slice(inicio, inicio + tamano)
  const siguiente = ids.length > inicio + tamano ? (pagina.at(-1) ?? null) : null
  return { pagina, siguiente }
}

const listaDeTemas = (claseId: string) => ({
  temas: (servidor.temas[claseId] ?? []).map((id, orden) => ({
    id,
    nombre: NOMBRE_TEMA[id] ?? "Tema",
    orden,
    elementos: 0,
  })),
  sinTema: 0,
})

const NOMBRE_CLASE: Record<string, string> = { [A]: "Historia", [B]: "Geografía" }

const responder = (llamada: Llamada): Response | Promise<Response> => {
  const { metodo, url } = llamada
  const ruta = url.pathname
  if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "token-de-prueba" })
  if (ruta === "/api/me") {
    return respuestaJson(200, {
      id: uuid("4a4b3c4d", 1),
      nombre: "Ana López",
      email: "ana@ejemplo.mx",
      rol: servidor.rol,
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  if (ruta === "/api/clases/inscritas" || ruta === "/api/clases/impartidas") {
    const deLaBarra = url.searchParams.get("limite") === "100"
    if (deLaBarra && servidor.barraFalla > 0) {
      servidor.barraFalla -= 1
      return error500()
    }
    const { pagina, siguiente } = paginar(servidor.clases, url, deLaBarra ? 100 : 2)
    const clases = pagina.map((id, i) =>
      ruta === "/api/clases/inscritas"
        ? {
            id,
            nombre: `Clase ${id.slice(-2)}`,
            maestro: { nombre: MAESTRO.nombre },
            maestros: [{ nombre: MAESTRO.nombre }],
          }
        : { id, nombre: `Clase ${id.slice(-2)}`, alumnos: i },
    )
    return respuestaJson(200, { clases, total: servidor.clases.length, siguienteCursor: siguiente })
  }
  if (ruta === "/api/clases/anteriores") {
    return respuestaJson(200, {
      clases: [],
      total: 0,
      siguienteCursor: null,
      siguienteCursorArchivadaEn: null,
    })
  }
  const claseId = ruta.split("/")[3]
  if (claseId === undefined) return error500()
  const base = `/api/clases/${claseId}`
  if (ruta === base) {
    return respuestaJson(200, {
      clase: {
        id: claseId,
        nombre: NOMBRE_CLASE[claseId] ?? "Clase",
        descripcion: null,
        maestro: MAESTRO,
        maestros: [MAESTRO],
        archivadaEn: null,
      },
    })
  }
  if (ruta === `${base}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
  if (ruta === `${base}/temas` && metodo === "GET") return respuestaJson(200, listaDeTemas(claseId))
  if (ruta === `${base}/temas/orden` && metodo === "PUT") {
    const { temaIds } = llamada.cuerpo as { temaIds: string[] }
    servidor.temas[claseId] = temaIds
    return respuestaJson(200, listaDeTemas(claseId))
  }
  if (ruta === `${base}/trabajo`)
    return respuestaJson(200, { elementos: [], siguienteCursor: null })
  if (ruta === `${base}/publicaciones` && metodo === "GET") {
    return respuestaJson(200, {
      publicaciones: [
        {
          id: PUBLICACION,
          tipo: "anuncio",
          titulo: null,
          texto: "Primer aviso",
          autor: FIRMA,
          creadoEn: CREADO_EN,
          comentarios: servidor.comentarios.length,
          adjuntos: [],
          puedeBorrar: false,
          tarea: null,
        },
      ],
      siguienteCursor: null,
    })
  }
  if (ruta === `${base}/publicaciones/${PUBLICACION}/comentarios` && metodo === "GET") {
    const { pagina, siguiente } = paginar(servidor.comentarios, url, 2)
    return respuestaJson(200, {
      comentarios: pagina.map((id) => ({
        id,
        texto: `Comentario ${id.slice(-2)}`,
        autor: FIRMA,
        creadoEn: CREADO_EN,
        propio: false,
        puedeBorrar: false,
      })),
      siguienteCursor: siguiente,
    })
  }
  return error500()
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  servidor = {
    rol: "maestro",
    temas: { [A]: [1, 2, 3].map((n) => tema(A, n)), [B]: [1, 2, 3].map((n) => tema(B, n)) },
    comentarios: [1, 2, 3].map(idComentario),
    clases: [1, 2, 3].map(idClase),
    barraFalla: 0,
  }
  llamadas = []
  interceptores = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://x")
      const metodo = init?.method ?? "GET"
      const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null
      const llamada = { metodo, url, cuerpo }
      llamadas.push(llamada)
      for (const interceptor of interceptores) {
        const propia = interceptor(llamada)
        if (propia !== undefined) return Promise.resolve().then(propia)
      }
      return Promise.resolve().then(() => responder(llamada))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

const montar = async (entradas: string[]) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: entradas })
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, cliente }
}

type Router = Awaited<ReturnType<typeof montar>>["router"]

const navegar = async (router: Router, destino: string | number) => {
  await act(async () => {
    if (typeof destino === "number") await router.navigate(destino)
    else await router.navigate(destino)
  })
}

const esperarUnMomento = (ms = 30) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))

const dosClicsEnElMismoRender = (boton: HTMLElement) => {
  act(() => {
    fireEvent.click(boton)
    fireEvent.click(boton)
  })
}

const enEspera = async (boton: HTMLElement) => {
  await waitFor(() => expect(boton).toHaveAttribute("aria-busy", "true"), ESPERA)
}

const fueraDeEspera = async (boton: HTMLElement) => {
  await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy", "true"), ESPERA)
}

const nadaEnEspera = async () => {
  await waitFor(
    () => expect(screen.queryAllByRole("button", { busy: true })).toHaveLength(0),
    ESPERA,
  )
}

const contar = (cumple: (llamada: Llamada) => boolean) => llamadas.filter(cumple).length

const enLasSecciones = (nombre: string) =>
  within(screen.getByRole("list", { name: "Secciones de la clase" })).getByRole("link", {
    name: nombre,
  })

const pulsarSeccion = async (nombre: string) => {
  fireEvent.click(await waitFor(() => enLasSecciones(nombre), ESPERA))
}

describe("CHORE-04 · «Ver más comentarios»", () => {
  const RUTA_COMENTARIOS = `/api/clases/${A}/publicaciones/${PUBLICACION}/comentarios`
  const esPagina = ({ metodo, url }: Llamada) =>
    metodo === "GET" && url.pathname === RUTA_COMENTARIOS && url.searchParams.has("cursor")
  const esPrimera = ({ metodo, url }: Llamada) =>
    metodo === "GET" && url.pathname === RUTA_COMENTARIOS && !url.searchParams.has("cursor")

  const abrirComentarios = async () => {
    const montado = await montar([`/maestro/clases/${A}`])
    fireEvent.click(
      await screen.findByRole("button", { name: TEXTOS_PUBLICACION.verComentarios(3) }, ESPERA),
    )
    const verMas = await screen.findByRole("button", { name: TEXTOS_COMENTARIOS.verMas }, ESPERA)
    return { ...montado, verMas }
  }

  it("CH4-30 (a): dos clics en el mismo render piden una sola página", async () => {
    const pendiente = retenida()
    interceptarUnaVez(esPagina, pendiente.respuesta)
    const { verMas } = await abrirComentarios()

    dosClicsEnElMismoRender(verMas)
    await esperarUnMomento()

    expect(contar(esPagina)).toBe(1)
    await pendiente.soltar(() => responder(llamadas.filter(esPagina)[0] as Llamada))
    expect(await screen.findByText("Comentario 03", {}, ESPERA)).toBeInTheDocument()
    expect(contar(esPagina)).toBe(1)
  })

  it("CH4-30 (b): con la lista recargándose, el botón espera y su clic no pide página; al soltar la recarga, un clic pide la página con el cursor de la lista renovada", async () => {
    const { cliente, verMas } = await abrirComentarios()
    const recarga = retenida()
    interceptarUnaVez(esPrimera, recarga.respuesta)

    await act(async () => {
      void cliente.invalidateQueries({ queryKey: claveComentarios(A, PUBLICACION) })
      await Promise.resolve()
    })

    await enEspera(verMas)
    fireEvent.click(verMas)
    await esperarUnMomento()
    expect(contar(esPagina)).toBe(0)

    servidor.comentarios = [idComentario(1), idComentario(4), idComentario(2), idComentario(3)]
    await recarga.soltar(() =>
      responder({ metodo: "GET", url: new URL(RUTA_COMENTARIOS, "http://x"), cuerpo: null }),
    )
    const renovado = await screen.findByRole("button", { name: TEXTOS_COMENTARIOS.verMas }, ESPERA)
    await fueraDeEspera(renovado)
    fireEvent.click(renovado)

    await waitFor(() => expect(contar(esPagina)).toBe(1), ESPERA)
    expect(llamadas.filter(esPagina)[0]?.url.searchParams.get("cursor")).toBe(idComentario(4))
  })

  it("CH4-30 (c): si la página falla, salen sus dos peticiones y ninguna más, la lista se reemplaza por un solo MensajeError, «Ver más comentarios» ya no está y nada queda en espera", async () => {
    interceptarUnaVez(esPagina, error500)
    interceptarUnaVez(esPagina, error500)
    const { verMas } = await abrirComentarios()

    fireEvent.click(verMas)

    await comprobarFalloDeLaPagina(
      TEXTOS_COMENTARIOS.verMas,
      mensajeDeErrorDeLista(ERROR_500, TEXTOS_COMENTARIOS.cambioMientrasLosVeias),
    )
    // El reintento (retry: 1) ya salió; después de esperar no sale ninguna petición más.
    await esperarUnMomento(1500)
    expect(contar(esPagina)).toBe(2)
    expect(screen.getAllByRole("alert")).toHaveLength(1)
  })
})

const INICIOS = [
  {
    rol: "estudiante",
    ruta: "/estudiante",
    api: "/api/clases/inscritas",
    clave: CLAVE_CLASES_INSCRITAS,
  },
  {
    rol: "maestro",
    ruta: "/maestro",
    api: "/api/clases/impartidas",
    clave: CLAVE_CLASES_IMPARTIDAS,
  },
] as const

describe("CHORE-04 · «Ver más clases» de los dos inicios", () => {
  const delInicio =
    (api: string, conCursor: boolean) =>
    ({ metodo, url }: Llamada) =>
      metodo === "GET" &&
      url.pathname === api &&
      url.searchParams.get("limite") !== "100" &&
      url.searchParams.has("cursor") === conCursor

  const verMasClases = () => screen.findByRole("button", { name: TEXTOS_PANEL.verMas }, ESPERA)

  it.each(INICIOS)(
    "CH4-31 (a): $rol, dos clics en el mismo render piden una sola página",
    async (inicio) => {
      servidor.rol = inicio.rol
      const pendiente = retenida()
      interceptarUnaVez(delInicio(inicio.api, true), pendiente.respuesta)
      await montar([inicio.ruta])
      const verMas = await verMasClases()

      dosClicsEnElMismoRender(verMas)
      await esperarUnMomento()

      expect(contar(delInicio(inicio.api, true))).toBe(1)
      const pedida = llamadas.filter(delInicio(inicio.api, true))[0] as Llamada
      await pendiente.soltar(() => responder(pedida))
      await waitFor(
        () => expect(screen.queryByRole("button", { name: TEXTOS_PANEL.verMas })).toBeNull(),
        ESPERA,
      )
      expect(contar(delInicio(inicio.api, true))).toBe(1)
    },
  )

  it.each(INICIOS)(
    "CH4-31 (b): $rol, con la lista recargándose por invalidateQueries, el botón espera y su clic no pide página; al soltar, un clic pide la página con el cursor renovado",
    async (inicio) => {
      servidor.rol = inicio.rol
      const { cliente } = await montar([inicio.ruta])
      const verMas = await verMasClases()
      const recarga = retenida()
      interceptarUnaVez(delInicio(inicio.api, false), recarga.respuesta)

      await act(async () => {
        void cliente.invalidateQueries({ queryKey: inicio.clave })
        await Promise.resolve()
      })

      await enEspera(verMas)
      fireEvent.click(verMas)
      await esperarUnMomento()
      expect(contar(delInicio(inicio.api, true))).toBe(0)

      servidor.clases = [idClase(1), idClase(4), idClase(2), idClase(3)]
      await recarga.soltar(() =>
        responder({
          metodo: "GET",
          url: new URL(`${inicio.api}?limite=20`, "http://x"),
          cuerpo: null,
        }),
      )
      const renovado = await verMasClases()
      await fueraDeEspera(renovado)
      fireEvent.click(renovado)
      await waitFor(() => expect(contar(delInicio(inicio.api, true))).toBe(1), ESPERA)
      expect(llamadas.filter(delInicio(inicio.api, true))[0]?.url.searchParams.get("cursor")).toBe(
        idClase(4),
      )
    },
  )

  it.each(INICIOS)(
    "CH4-31 (b): $rol, salir del inicio, marcar vieja la lista y volver con la recarga retenida: el inicio pinta la lista de la caché, el botón espera y su clic no pide página; al soltar, un clic pide la página con el cursor renovado",
    async (inicio) => {
      servidor.rol = inicio.rol
      const { router, cliente } = await montar([inicio.ruta])
      await verMasClases()
      const otra =
        inicio.rol === "estudiante" ? "/estudiante/clases-anteriores" : "/maestro/clases-archivadas"
      await navegar(router, otra)
      await waitFor(
        () => expect(screen.queryByRole("button", { name: TEXTOS_PANEL.verMas })).toBeNull(),
        ESPERA,
      )
      await act(async () => {
        await cliente.invalidateQueries({ queryKey: inicio.clave, refetchType: "none" })
      })
      const recarga = retenida()
      interceptarUnaVez(delInicio(inicio.api, false), recarga.respuesta)

      await navegar(router, inicio.ruta)

      const verMas = await verMasClases()
      await enEspera(verMas)
      fireEvent.click(verMas)
      await esperarUnMomento()
      expect(contar(delInicio(inicio.api, true))).toBe(0)

      // La lista del servidor cambia antes de soltar: la página pedida lleva el cursor de la renovada.
      servidor.clases = [idClase(1), idClase(4), idClase(2), idClase(3)]
      await recarga.soltar(() =>
        responder({
          metodo: "GET",
          url: new URL(`${inicio.api}?limite=20`, "http://x"),
          cuerpo: null,
        }),
      )
      const renovado = await verMasClases()
      await fueraDeEspera(renovado)
      fireEvent.click(renovado)
      await waitFor(() => expect(contar(delInicio(inicio.api, true))).toBe(1), ESPERA)
      expect(llamadas.filter(delInicio(inicio.api, true))[0]?.url.searchParams.get("cursor")).toBe(
        idClase(4),
      )
    },
  )

  it.each(INICIOS)(
    "CH4-31 (c): $rol, si la página falla, salen sus dos peticiones y ninguna más, la lista se reemplaza por un solo MensajeError del panel, «Ver más clases» ya no está y nada queda en espera",
    async (inicio) => {
      servidor.rol = inicio.rol
      interceptarUnaVez(delInicio(inicio.api, true), error500)
      interceptarUnaVez(delInicio(inicio.api, true), error500)
      await montar([inicio.ruta])
      const verMas = await verMasClases()

      fireEvent.click(verMas)

      await comprobarFalloDeLaPagina(
        TEXTOS_PANEL.verMas,
        mensajeDeErrorDeLista(ERROR_500, TEXTOS_PANEL.cambioMientrasLasVeias),
      )
      // Solo las del inicio (las de la barra van con limite=100); el reintento ya salió.
      await esperarUnMomento(1500)
      expect(contar(delInicio(inicio.api, true))).toBe(2)
      expect(screen.getAllByRole("alert")).toHaveLength(1)
    },
  )
})

describe("CHORE-04 · «Reintentar» de la lista de clases de la barra (H-1)", () => {
  it.each(INICIOS)(
    "CH4-32: $rol, con la consulta en error y la nueva petición retenida, dos clics en el mismo render mandan un solo GET; al responder, la lista aparece",
    async (inicio) => {
      servidor.rol = inicio.rol
      servidor.barraFalla = 2
      const deLaBarra = ({ metodo, url }: Llamada) =>
        metodo === "GET" && url.pathname === inicio.api && url.searchParams.get("limite") === "100"
      await montar([inicio.ruta])
      const reintentar = await screen.findByRole(
        "button",
        { name: /Reintentar/ },
        { timeout: 8000 },
      )
      await fueraDeEspera(reintentar)
      const antes = contar(deLaBarra)
      const pendiente = retenida()
      interceptarUnaVez(deLaBarra, pendiente.respuesta)

      dosClicsEnElMismoRender(reintentar)
      await esperarUnMomento()

      expect(contar(deLaBarra)).toBe(antes + 1)
      await pendiente.soltar(() =>
        responder({
          metodo: "GET",
          url: new URL(`${inicio.api}?limite=100`, "http://x"),
          cuerpo: null,
        }),
      )
      const navegacion = screen.getByRole("navigation", { name: "Navegación principal" })
      expect(
        await within(navegacion).findByRole("link", { name: /Clase 01/ }, ESPERA),
      ).toBeInTheDocument()
      expect(contar(deLaBarra)).toBe(antes + 1)
    },
  )
})

describe("CHORE-04 · ordenDeLasVariables (unitaria)", () => {
  it("CH4-33: el tema y el control salen de las variables de un orden; cualquier otra forma da null", () => {
    expect(ordenDeLasVariables({ temaIds: ["a"], temaId: "t", control: "subir" })).toEqual({
      temaId: "t",
      control: "subir",
    })
    expect(ordenDeLasVariables({ temaIds: ["a"], temaId: "t", control: "bajar" })).toEqual({
      temaId: "t",
      control: "bajar",
    })
    for (const otra of [
      null,
      undefined,
      3,
      ["t", "subir"],
      { control: "subir" },
      { temaId: 5, control: "subir" },
      { temaId: "t" },
      { temaId: "t", control: "otro" },
    ]) {
      expect(ordenDeLasVariables(otra), JSON.stringify(otra) ?? "undefined").toBeNull()
    }
  })
})

const TRABAJO = (claseId: string) => `/maestro/clases/${claseId}/trabajo`
const RUTA_ORDEN = (claseId: string) => `/api/clases/${claseId}/temas/orden`
const esOrden =
  (claseId: string) =>
  ({ metodo, url }: Llamada) =>
    metodo === "PUT" && url.pathname === RUTA_ORDEN(claseId)
const esRecargaDeSeccion =
  (claseId: string) =>
  ({ metodo, url }: Llamada) =>
    metodo === "GET" &&
    url.pathname === `/api/clases/${claseId}/temas` &&
    url.searchParams.get("seccion") === "actividades"
const ordenes = (claseId: string) =>
  llamadas.filter(esOrden(claseId)).map(({ cuerpo }) => (cuerpo as { temaIds: string[] }).temaIds)

const control = (accion: "Subir" | "Bajar", nombre: string) =>
  screen.getByRole("button", { name: `${accion} tema ${nombre}` })
const controlCuandoEste = (accion: "Subir" | "Bajar", nombre: string) =>
  screen.findByRole("button", { name: `${accion} tema ${nombre}` }, ESPERA)

// Los nombres de los temas en el orden en que se ven.
const nombresDeTemas = () =>
  screen
    .getAllByRole("heading", { level: 2 })
    .filter((encabezado) => encabezado.closest("section") !== null)
    .map((encabezado) => (encabezado.textContent ?? "").split(" · ")[0])

const respuestaDelOrden = (claseId: string) => () => {
  const pedida = llamadas.filter(esOrden(claseId)).at(-1)
  if (pedida === undefined) throw new Error("Precondición: hubo un PUT del orden")
  return responder(pedida)
}

const controlesDeOrden = () =>
  screen
    .getAllByRole("button")
    .filter((boton) => /^(Subir|Bajar) tema /.test(boton.textContent ?? ""))

const irYVolverASeccion = async () => {
  await pulsarSeccion("Avisos")
  await waitFor(
    () => expect(screen.queryByRole("button", { name: /Subir tema/ })).toBeNull(),
    ESPERA,
  )
  await pulsarSeccion(TEXTOS_TRABAJO.titulo)
}

describe("CHORE-04 · «Subir» y «Bajar» entre montajes (fila 29)", () => {
  it.each([
    ["ir a otra sección y volver", "seccion"],
    ["atrás y adelante del historial", "historial"],
  ] as const)(
    "CH4-34: con el PUT en vuelo, %s: «Subir» de origen espera, ningún orden manda otro PUT; al soltar, nada espera, se ve el orden nuevo y el siguiente parte de él",
    async (_camino, camino) => {
      const pendiente = retenida()
      interceptarUnaVez(esOrden(A), pendiente.respuesta)
      const { router } = await montar([`/maestro/clases/${A}`, TRABAJO(A)])
      fireEvent.click(await controlCuandoEste("Subir", "Unidad 2"))
      await waitFor(() => expect(ordenes(A)).toHaveLength(1))

      if (camino === "seccion") {
        await irYVolverASeccion()
      } else {
        await navegar(router, -1)
        await waitFor(
          () => expect(screen.queryByRole("button", { name: /Subir tema/ })).toBeNull(),
          ESPERA,
        )
        await navegar(router, 1)
      }

      const origen = await controlCuandoEste("Subir", "Unidad 2")
      await enEspera(origen)
      for (const otro of controlesDeOrden()) fireEvent.click(otro)
      await esperarUnMomento()
      expect(ordenes(A)).toHaveLength(1)

      await pendiente.soltar(respuestaDelOrden(A))
      await nadaEnEspera()
      await waitFor(
        () => expect(nombresDeTemas()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"]),
        ESPERA,
      )
      fireEvent.click(control("Subir", "Unidad 3"))
      await waitFor(() => expect(ordenes(A)).toHaveLength(2), ESPERA)
      expect(ordenes(A)[1]).toEqual([tema(A, 2), tema(A, 3), tema(A, 1)])
    },
  )

  it("CH4-35: con el PUT ya respondido y la recarga por sección retenida, ir a otra sección y volver: el control de origen espera y no manda otro PUT; al soltar la recarga, nada espera y el siguiente parte del orden nuevo", async () => {
    await montar([TRABAJO(A)])
    await controlCuandoEste("Subir", "Unidad 2")
    // 1. Retener la recarga por sección con la vista montada.
    const recarga = retenida()
    interceptarUnaVez(esRecargaDeSeccion(A), recarga.respuesta)
    const recargasAntes = contar(esRecargaDeSeccion(A))
    // 2. «Subir» y el PUT responde con la vista montada.
    fireEvent.click(control("Subir", "Unidad 2"))
    await waitFor(() => expect(ordenes(A)).toHaveLength(1))
    // 3. La recarga retenida sale (la mutación sigue pendiente).
    await waitFor(() => expect(contar(esRecargaDeSeccion(A))).toBe(recargasAntes + 1), ESPERA)
    // 4. Otra sección y vuelta.
    await irYVolverASeccion()
    // 5. El control de origen espera y su clic no manda otro PUT.
    const origen = await controlCuandoEste("Subir", "Unidad 2")
    await enEspera(origen)
    fireEvent.click(origen)
    for (const otro of controlesDeOrden()) fireEvent.click(otro)
    await esperarUnMomento()
    expect(ordenes(A)).toHaveLength(1)
    // 6. Soltar la recarga.
    await recarga.soltar(() =>
      responder({
        metodo: "GET",
        url: new URL(`/api/clases/${A}/temas?seccion=actividades`, "http://x"),
        cuerpo: null,
      }),
    )
    await nadaEnEspera()
    await waitFor(
      () => expect(nombresDeTemas()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"]),
      ESPERA,
    )
    fireEvent.click(control("Subir", "Unidad 1"))
    await waitFor(() => expect(ordenes(A)).toHaveLength(2), ESPERA)
    expect(ordenes(A)[1]).toEqual([tema(A, 1), tema(A, 2), tema(A, 3)])
  })
})

const DESACTUALIZADO = "Los temas cambiaron mientras los ordenabas. Vuelve a intentarlo."
const GENERICO = "Algo salió mal. Inténtalo de nuevo."

describe("CHORE-04 · frases del orden con la vista desmontada al responder", () => {
  const casos = [
    ["409 ORDEN_DESACTUALIZADO", DESACTUALIZADO],
    ["500", GENERICO],
  ] as const
  const caminos = [
    "repetir «Subir»",
    "pulsar la sección activa y repetir",
    "otra sección, volver y repetir",
  ] as const

  it.each(
    casos.flatMap(([error, frase]) => caminos.map((camino) => [error, frase, camino] as const)),
  )(
    "CH4-36: %s («%s») con la vista fuera; al volver nada espera, hay un solo aviso y el camino «%s» manda un PUT calculado con la lista renovada",
    async (error, frase, camino) => {
      const pendiente = retenida()
      interceptarUnaVez(esOrden(A), pendiente.respuesta)
      await montar([TRABAJO(A)])
      fireEvent.click(await controlCuandoEste("Subir", "Unidad 2"))
      await waitFor(() => expect(ordenes(A)).toHaveLength(1))
      await pulsarSeccion("Avisos")
      await waitFor(
        () => expect(screen.queryByRole("button", { name: /Subir tema/ })).toBeNull(),
        ESPERA,
      )

      if (error.startsWith("409")) {
        // Otra sesión reordenó: el servidor ya tiene Unidad 3 antes que Unidad 2.
        servidor.temas[A] = [tema(A, 1), tema(A, 3), tema(A, 2)]
        await pendiente.soltar(() => errorApi(409, "ORDEN_DESACTUALIZADO", DESACTUALIZADO))
      } else {
        await pendiente.soltar(error500)
      }
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      expect(aviso.error.mock.calls[0]?.[0]).toBe(frase)

      await pulsarSeccion(TEXTOS_TRABAJO.titulo)
      await controlCuandoEste("Subir", "Unidad 2")
      await nadaEnEspera()
      const esperado = error.startsWith("409")
        ? ["Unidad 1", "Unidad 3", "Unidad 2"]
        : ["Unidad 1", "Unidad 2", "Unidad 3"]
      await waitFor(() => expect(nombresDeTemas()).toEqual(esperado), ESPERA)

      if (camino === "pulsar la sección activa y repetir")
        await pulsarSeccion(TEXTOS_TRABAJO.titulo)
      if (camino === "otra sección, volver y repetir") await irYVolverASeccion()
      fireEvent.click(await controlCuandoEste("Subir", "Unidad 2"))

      await waitFor(() => expect(ordenes(A)).toHaveLength(2), ESPERA)
      // «Subir Unidad 2» sobre la lista que se ve: con el 409, la renovada (1, 3, 2); con el 500, la de siempre.
      const calculado = error.startsWith("409")
        ? [tema(A, 1), tema(A, 2), tema(A, 3)]
        : [tema(A, 2), tema(A, 1), tema(A, 3)]
      expect(ordenes(A)[1]).toEqual(calculado)
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
  )
})

describe("CHORE-04 · otra clase no espera", () => {
  it("CH4-37 (a): con el PUT de A retenido, ir a B pasando por otra ruta: en B nada espera y su «Subir» manda el PUT de B", async () => {
    const pendiente = retenida()
    interceptarUnaVez(esOrden(A), pendiente.respuesta)
    const { router } = await montar([TRABAJO(A)])
    fireEvent.click(await controlCuandoEste("Subir", "Unidad 2"))
    await waitFor(() => expect(ordenes(A)).toHaveLength(1))

    await navegar(router, "/maestro")
    await navegar(router, TRABAJO(B))

    const subirB = await controlCuandoEste("Subir", "Bloque 2")
    await nadaEnEspera()
    fireEvent.click(subirB)
    await waitFor(() => expect(ordenes(B)).toHaveLength(1), ESPERA)
    await pendiente.soltar(respuestaDelOrden(A))
  })

  const saltarDeAaB = async () => {
    const pendiente = retenida()
    interceptarUnaVez(esOrden(A), pendiente.respuesta)
    const montado = await montar([TRABAJO(B)])
    await controlCuandoEste("Subir", "Bloque 2")
    await navegar(montado.router, TRABAJO(A))
    const subir = await controlCuandoEste("Subir", "Unidad 2")
    act(() => subir.focus())
    fireEvent.click(subir)
    await waitFor(() => expect(ordenes(A)).toHaveLength(1))
    await enEspera(subir)
    await navegar(montado.router, -1)
    await controlCuandoEste("Subir", "Bloque 2")
    return { ...montado, pendiente }
  }

  it("CH4-37 (b): misma instancia, de A a B por el historial con el PUT de A retenido: el foco va al encabezado de la vista, B no espera por A, la respuesta de A no escribe la lista de B y, de vuelta en A, su «Subir» manda un PUT nuevo", async () => {
    const { router, pendiente } = await saltarDeAaB()

    const encabezado = screen.getByRole("heading", { level: 2, name: TEXTOS_TRABAJO.titulo })
    await waitFor(() => expect(document.activeElement).toBe(encabezado), ESPERA)
    await nadaEnEspera()
    fireEvent.click(control("Subir", "Bloque 2"))
    await waitFor(() => expect(ordenes(B)).toHaveLength(1), ESPERA)
    await nadaEnEspera()
    await waitFor(
      () => expect(nombresDeTemas()).toEqual(["Bloque 2", "Bloque 1", "Bloque 3"]),
      ESPERA,
    )

    await pendiente.soltar(respuestaDelOrden(A))
    await esperarUnMomento(50)

    expect(nombresDeTemas()).toEqual(["Bloque 2", "Bloque 1", "Bloque 3"])
    await nadaEnEspera()

    await navegar(router, 1)
    await waitFor(
      () => expect(nombresDeTemas()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"]),
      ESPERA,
    )
    await nadaEnEspera()
    fireEvent.click(control("Subir", "Unidad 3"))
    await waitFor(() => expect(ordenes(A)).toHaveLength(2), ESPERA)
  })

  it("CH4-37 (c): volver a A con el PUT de A todavía retenido: el control de origen espera por la caché y no manda otro; al soltarlo sale de la espera y el siguiente «Subir» manda", async () => {
    const { router, pendiente } = await saltarDeAaB()

    await navegar(router, 1)
    const origen = await controlCuandoEste("Subir", "Unidad 2")
    await enEspera(origen)
    fireEvent.click(origen)
    await esperarUnMomento()
    expect(ordenes(A)).toHaveLength(1)

    await pendiente.soltar(respuestaDelOrden(A))
    await nadaEnEspera()
    await waitFor(
      () => expect(nombresDeTemas()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"]),
      ESPERA,
    )
    fireEvent.click(control("Subir", "Unidad 3"))
    await waitFor(() => expect(ordenes(A)).toHaveLength(2), ESPERA)
  })
})

describe("CHORE-04 · regresión de la ref de TAREAS-01e y parpadeo", () => {
  it("CH4-38: «Bajar» de un tema y «Subir» de otro en el mismo render mandan un solo PUT", async () => {
    await montar([TRABAJO(A)])
    const bajar = await controlCuandoEste("Bajar", "Unidad 1")
    const subir = control("Subir", "Unidad 3")

    act(() => {
      fireEvent.click(bajar)
      fireEvent.click(subir)
    })
    await esperarUnMomento()

    expect(ordenes(A)).toHaveLength(1)
    await nadaEnEspera()
  })

  // Registra cada botón de orden que pasó por aria-busy="true".
  const vigilarEsperas = () => {
    const enEsperaAlgunaVez = new Set<string>()
    const registrar = () => {
      for (const boton of controlesDeOrden()) {
        if (boton.getAttribute("aria-busy") === "true")
          enEsperaAlgunaVez.add(boton.textContent ?? "")
      }
    }
    const observador = new MutationObserver(registrar)
    observador.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-busy"],
    })
    return { enEsperaAlgunaVez, registrar, detener: () => observador.disconnect() }
  }

  it.each([
    ["la vista que lanzó el orden", false],
    ["la vista que se montó con el orden en vuelo", true],
  ] as const)(
    "CH4-39: en %s, desde el clic hasta que todo sale de la espera, solo el control pulsado estuvo en espera",
    async (_vista, remontar) => {
      const pendiente = retenida()
      interceptarUnaVez(esOrden(A), pendiente.respuesta)
      await montar([`/maestro/clases/${A}`, TRABAJO(A)])
      await controlCuandoEste("Subir", "Unidad 2")
      const vigia = vigilarEsperas()

      fireEvent.click(control("Subir", "Unidad 2"))
      await waitFor(() => expect(ordenes(A)).toHaveLength(1))
      if (remontar) {
        await irYVolverASeccion()
        await controlCuandoEste("Subir", "Unidad 2")
      }
      vigia.registrar()
      await pendiente.soltar(respuestaDelOrden(A))
      await nadaEnEspera()
      vigia.registrar()
      vigia.detener()

      const nombres = [...vigia.enEsperaAlgunaVez].map((texto) => texto.trim())
      expect(nombres).toEqual(["Subir tema Unidad 2"])
    },
  )
})
