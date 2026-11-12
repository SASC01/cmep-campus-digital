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
import { mensajeDeErrorDeLista } from "./lib"

// Tester, ronda 1 de CHORE-04 (puntos 3 y 4 del manager). El andamiaje (doble del servidor con
// interceptores, montaje con `rutas` de app/router y las defaultOptions de app/providers.tsx, y las
// ayudas del orden de los temas) es copia del de features/clases/ver-mas-y-orden-ch4.test.tsx; los
// casos ATQ-CH4-2x son del tester. Punto 3: el fallo de una página de «Ver más» por red, por un 400 de
// cursor y con una recarga de fondo. Punto 4: «Subir»/«Bajar» con la respuesta de A llegando en B.

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

const TRABAJO = (claseId: string) => `/maestro/clases/${claseId}/trabajo`
const RUTA_ORDEN = (claseId: string) => `/api/clases/${claseId}/temas/orden`
const esOrden =
  (claseId: string) =>
  ({ metodo, url }: Llamada) =>
    metodo === "PUT" && url.pathname === RUTA_ORDEN(claseId)
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

// ---- Ataque CHORE-04 r1 (casos propios del tester) ----

const errorDeRed = () => Promise.reject(new TypeError("Failed to fetch"))
const ERROR_DE_RED = new ApiError("SIN_CONEXION", "No pudimos conectar con el servidor.", 0)
const MENSAJE_DE_CURSOR = "cursor: El cursor no es válido."
const errorDeCursor = () => errorApi(400, "VALIDACION", MENSAJE_DE_CURSOR)
const ERROR_DE_CURSOR = new ApiError("VALIDACION", MENSAJE_DE_CURSOR, 400)

// Las fallas de una página que la Enmienda 4 deja sin caso propio (punto 3 del manager).
const FALLAS: readonly (readonly [string, Respuesta, ApiError])[] = [
  ["red", errorDeRed, ERROR_DE_RED],
  ["400 VALIDACION de cursor", errorDeCursor, ERROR_DE_CURSOR],
]

const RUTA_COMENTARIOS = `/api/clases/${A}/publicaciones/${PUBLICACION}/comentarios`
const esPaginaDeComentarios = ({ metodo, url }: Llamada) =>
  metodo === "GET" && url.pathname === RUTA_COMENTARIOS && url.searchParams.has("cursor")
const esPrimeraDeComentarios = ({ metodo, url }: Llamada) =>
  metodo === "GET" && url.pathname === RUTA_COMENTARIOS && !url.searchParams.has("cursor")

const abrirComentarios = async () => {
  const montado = await montar([`/maestro/clases/${A}`])
  fireEvent.click(
    await screen.findByRole("button", { name: TEXTOS_PUBLICACION.verComentarios(3) }, ESPERA),
  )
  const verMas = await screen.findByRole("button", { name: TEXTOS_COMENTARIOS.verMas }, ESPERA)
  return { ...montado, verMas }
}

describe("ataque CHORE-04 r1 · el fallo de una página de «Ver más comentarios» (punto 3)", () => {
  it("precondición: el 400 de cursor da la frase de «cambiaron mientras los veías» y la red no", () => {
    expect(mensajeDeErrorDeLista(ERROR_DE_CURSOR, TEXTOS_COMENTARIOS.cambioMientrasLosVeias)).toBe(
      TEXTOS_COMENTARIOS.cambioMientrasLosVeias,
    )
    expect(mensajeDeErrorDeLista(ERROR_DE_RED, TEXTOS_COMENTARIOS.cambioMientrasLosVeias)).not.toBe(
      TEXTOS_COMENTARIOS.cambioMientrasLosVeias,
    )
    expect(mensajeDeErrorDeLista(ERROR_500, TEXTOS_COMENTARIOS.cambioMientrasLosVeias)).not.toBe(
      TEXTOS_COMENTARIOS.cambioMientrasLosVeias,
    )
  })

  it.each(FALLAS)(
    "ATQ-CH4-20: con %s, salen las dos peticiones de la página y ninguna más, un solo MensajeError con su texto, «Ver más comentarios» ya no está y nada queda en espera",
    async (_falla, respuesta, error) => {
      interceptarUnaVez(esPaginaDeComentarios, respuesta)
      interceptarUnaVez(esPaginaDeComentarios, respuesta)
      const { verMas } = await abrirComentarios()

      dosClicsEnElMismoRender(verMas)

      await comprobarFalloDeLaPagina(
        TEXTOS_COMENTARIOS.verMas,
        mensajeDeErrorDeLista(error, TEXTOS_COMENTARIOS.cambioMientrasLosVeias),
      )
      await esperarUnMomento(1500)
      expect(contar(esPaginaDeComentarios)).toBe(2)
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      expect(screen.queryAllByRole("button", { busy: true })).toHaveLength(0)
    },
  )

  it("ATQ-CH4-21: una recarga de fondo llega con la página en vuelo y la página falla después: la recarga gana, ningún MensajeError, «Ver más comentarios» sale de la espera y su clic pide la página con el cursor renovado", async () => {
    const pagina = retenida()
    interceptarUnaVez(esPaginaDeComentarios, pagina.respuesta)
    const { cliente, verMas } = await abrirComentarios()
    fireEvent.click(verMas)
    await waitFor(() => expect(contar(esPaginaDeComentarios)).toBe(1), ESPERA)
    await enEspera(verMas)

    const recarga = retenida()
    interceptarUnaVez(esPrimeraDeComentarios, recarga.respuesta)
    await act(async () => {
      void cliente.invalidateQueries({ queryKey: claveComentarios(A, PUBLICACION) })
      await Promise.resolve()
    })
    servidor.comentarios = [idComentario(1), idComentario(4), idComentario(2), idComentario(3)]
    await recarga.soltar(() =>
      responder({ metodo: "GET", url: new URL(RUTA_COMENTARIOS, "http://x"), cuerpo: null }),
    )
    await pagina.soltar(error500)
    await esperarUnMomento(1500)

    expect(screen.queryAllByRole("alert")).toHaveLength(0)
    const renovado = await screen.findByRole("button", { name: TEXTOS_COMENTARIOS.verMas }, ESPERA)
    await fueraDeEspera(renovado)
    const antes = contar(esPaginaDeComentarios)
    fireEvent.click(renovado)
    await waitFor(() => expect(contar(esPaginaDeComentarios)).toBe(antes + 1), ESPERA)
    expect(llamadas.filter(esPaginaDeComentarios).at(-1)?.url.searchParams.get("cursor")).toBe(
      idComentario(4),
    )
    await nadaEnEspera()
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

const delInicio =
  (api: string, conCursor: boolean) =>
  ({ metodo, url }: Llamada) =>
    metodo === "GET" &&
    url.pathname === api &&
    url.searchParams.get("limite") !== "100" &&
    url.searchParams.has("cursor") === conCursor

describe("ataque CHORE-04 r1 · el fallo de una página de «Ver más clases» (punto 3)", () => {
  it.each(
    INICIOS.flatMap((inicio) =>
      FALLAS.map(
        ([falla, respuesta, error]) => [inicio.rol, falla, inicio, respuesta, error] as const,
      ),
    ),
  )(
    "ATQ-CH4-22: %s con %s, salen las dos peticiones de la página y ninguna más, un solo MensajeError del panel con su texto, «Ver más clases» ya no está y nada queda en espera",
    async (_rol, _falla, inicio, respuesta, error) => {
      servidor.rol = inicio.rol
      interceptarUnaVez(delInicio(inicio.api, true), respuesta)
      interceptarUnaVez(delInicio(inicio.api, true), respuesta)
      await montar([inicio.ruta])
      const verMas = await screen.findByRole("button", { name: TEXTOS_PANEL.verMas }, ESPERA)

      dosClicsEnElMismoRender(verMas)

      await comprobarFalloDeLaPagina(
        TEXTOS_PANEL.verMas,
        mensajeDeErrorDeLista(error, TEXTOS_PANEL.cambioMientrasLasVeias),
      )
      await esperarUnMomento(1500)
      expect(contar(delInicio(inicio.api, true))).toBe(2)
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      expect(screen.queryAllByRole("button", { busy: true })).toHaveLength(0)
    },
  )

  it.each(INICIOS)(
    "ATQ-CH4-23: $rol, una recarga de fondo llega con la página en vuelo y la página falla después: la recarga gana, ningún MensajeError, «Ver más clases» sale de la espera y su clic pide la página con el cursor renovado",
    async (inicio) => {
      servidor.rol = inicio.rol
      const pagina = retenida()
      interceptarUnaVez(delInicio(inicio.api, true), pagina.respuesta)
      const { cliente } = await montar([inicio.ruta])
      const verMas = await screen.findByRole("button", { name: TEXTOS_PANEL.verMas }, ESPERA)
      fireEvent.click(verMas)
      await waitFor(() => expect(contar(delInicio(inicio.api, true))).toBe(1), ESPERA)

      const recarga = retenida()
      interceptarUnaVez(delInicio(inicio.api, false), recarga.respuesta)
      await act(async () => {
        void cliente.invalidateQueries({ queryKey: inicio.clave })
        await Promise.resolve()
      })
      servidor.clases = [idClase(1), idClase(4), idClase(2), idClase(3)]
      await recarga.soltar(() =>
        responder({
          metodo: "GET",
          url: new URL(`${inicio.api}?limite=20`, "http://x"),
          cuerpo: null,
        }),
      )
      await pagina.soltar(error500)
      await esperarUnMomento(1500)

      expect(screen.queryAllByRole("alert")).toHaveLength(0)
      const renovado = await screen.findByRole("button", { name: TEXTOS_PANEL.verMas }, ESPERA)
      await fueraDeEspera(renovado)
      const antes = contar(delInicio(inicio.api, true))
      fireEvent.click(renovado)
      await waitFor(() => expect(contar(delInicio(inicio.api, true))).toBe(antes + 1), ESPERA)
      expect(
        llamadas.filter(delInicio(inicio.api, true)).at(-1)?.url.searchParams.get("cursor"),
      ).toBe(idClase(4))
    },
  )
})

const DESACTUALIZADO = "Los temas cambiaron mientras los ordenabas. Vuelve a intentarlo."
const GENERICO = "Algo salió mal. Inténtalo de nuevo."

// De B salta a A, ordena en A con el PUT retenido y vuelve a B por el historial (misma instancia).
const ordenarEnAYVolverAB = async () => {
  const pendiente = retenida()
  interceptarUnaVez(esOrden(A), pendiente.respuesta)
  const montado = await montar([TRABAJO(B)])
  await controlCuandoEste("Subir", "Bloque 2")
  await navegar(montado.router, TRABAJO(A))
  fireEvent.click(await controlCuandoEste("Subir", "Unidad 2"))
  await waitFor(() => expect(ordenes(A)).toHaveLength(1))
  await navegar(montado.router, -1)
  await controlCuandoEste("Subir", "Bloque 2")
  return { ...montado, pendiente }
}

describe("ataque CHORE-04 r1 · «Subir»/«Bajar» con la respuesta de A llegando en B (punto 4)", () => {
  it.each([
    ["409 ORDEN_DESACTUALIZADO", DESACTUALIZADO],
    ["500", GENERICO],
  ] as const)(
    "ATQ-CH4-24: el PUT de A responde %s estando en B: un solo aviso, B conserva su lista y nada espera, «Subir» de B manda su PUT; de vuelta en A nada espera y su «Subir» parte de la lista de A",
    async (error, frase) => {
      const { router, pendiente } = await ordenarEnAYVolverAB()
      await nadaEnEspera()

      if (error.startsWith("409")) {
        servidor.temas[A] = [tema(A, 1), tema(A, 3), tema(A, 2)]
        await pendiente.soltar(() => errorApi(409, "ORDEN_DESACTUALIZADO", DESACTUALIZADO))
      } else {
        await pendiente.soltar(error500)
      }
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      expect(aviso.error.mock.calls[0]?.[0]).toBe(frase)
      await esperarUnMomento(50)
      expect(nombresDeTemas()).toEqual(["Bloque 1", "Bloque 2", "Bloque 3"])
      await nadaEnEspera()

      act(() => {
        fireEvent.click(control("Subir", "Bloque 2"))
        fireEvent.click(control("Subir", "Bloque 3"))
      })
      await waitFor(() => expect(ordenes(B)).toHaveLength(1), ESPERA)
      expect(ordenes(B)[0]).toEqual([tema(B, 2), tema(B, 1), tema(B, 3)])
      await nadaEnEspera()

      await navegar(router, 1)
      const esperada = error.startsWith("409")
        ? ["Unidad 1", "Unidad 3", "Unidad 2"]
        : ["Unidad 1", "Unidad 2", "Unidad 3"]
      await waitFor(() => expect(nombresDeTemas()).toEqual(esperada), ESPERA)
      await nadaEnEspera()
      fireEvent.click(control("Subir", "Unidad 2"))
      await waitFor(() => expect(ordenes(A)).toHaveLength(2), ESPERA)
      const calculado = error.startsWith("409")
        ? [tema(A, 1), tema(A, 2), tema(A, 3)]
        : [tema(A, 2), tema(A, 1), tema(A, 3)]
      expect(ordenes(A)[1]).toEqual(calculado)
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
  )

  it("ATQ-CH4-25: A → B → A → B con los PUT de A y de B en vuelo: en A y en B solo espera el control de origen de cada clase y ningún clic manda otro PUT; las respuestas en orden inverso no dejan nada en espera", async () => {
    const { router, pendiente: deA } = await ordenarEnAYVolverAB()
    const deB = retenida()
    interceptarUnaVez(esOrden(B), deB.respuesta)
    fireEvent.click(control("Subir", "Bloque 2"))
    await waitFor(() => expect(ordenes(B)).toHaveLength(1))

    await navegar(router, 1)
    const origenA = await controlCuandoEste("Subir", "Unidad 2")
    await enEspera(origenA)
    for (const otro of controlesDeOrden()) fireEvent.click(otro)
    await esperarUnMomento()
    expect(ordenes(A)).toHaveLength(1)
    expect(
      controlesDeOrden().filter((boton) => boton.getAttribute("aria-busy") === "true"),
    ).toEqual([origenA])

    await navegar(router, -1)
    const origenB = await controlCuandoEste("Subir", "Bloque 2")
    await enEspera(origenB)
    for (const otro of controlesDeOrden()) fireEvent.click(otro)
    await esperarUnMomento()
    expect(ordenes(B)).toHaveLength(1)
    expect(
      controlesDeOrden().filter((boton) => boton.getAttribute("aria-busy") === "true"),
    ).toEqual([origenB])

    // B responde estando en B; A, después, también estando en B.
    await deB.soltar(respuestaDelOrden(B))
    await waitFor(
      () => expect(nombresDeTemas()).toEqual(["Bloque 2", "Bloque 1", "Bloque 3"]),
      ESPERA,
    )
    await nadaEnEspera()
    await deA.soltar(respuestaDelOrden(A))
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
    expect(ordenes(B)).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("ATQ-CH4-26: el PUT de A responde 409 con la vista en otra sección de A y se vuelve por la sección: nada espera, un solo aviso y el siguiente «Subir» parte de la lista renovada", async () => {
    const pendiente = retenida()
    interceptarUnaVez(esOrden(A), pendiente.respuesta)
    await montar([TRABAJO(A)])
    fireEvent.click(await controlCuandoEste("Subir", "Unidad 3"))
    await waitFor(() => expect(ordenes(A)).toHaveLength(1))
    await irYVolverASeccion()
    const origen = await controlCuandoEste("Subir", "Unidad 3")
    await enEspera(origen)

    servidor.temas[A] = [tema(A, 2), tema(A, 1), tema(A, 3)]
    await pendiente.soltar(() => errorApi(409, "ORDEN_DESACTUALIZADO", DESACTUALIZADO))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await waitFor(
      () => expect(nombresDeTemas()).toEqual(["Unidad 2", "Unidad 1", "Unidad 3"]),
      ESPERA,
    )
    await nadaEnEspera()
    act(() => {
      fireEvent.click(control("Subir", "Unidad 3"))
      fireEvent.click(control("Subir", "Unidad 3"))
    })
    await waitFor(() => expect(ordenes(A)).toHaveLength(2), ESPERA)
    await esperarUnMomento()
    expect(ordenes(A)).toHaveLength(2)
    expect(ordenes(A)[1]).toEqual([tema(A, 2), tema(A, 3), tema(A, 1)])
  })
})
