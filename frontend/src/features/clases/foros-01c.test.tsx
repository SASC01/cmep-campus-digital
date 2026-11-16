// FORO-01c1 (§D-8.1, §D-8.2, §D-10; §E7.4 y §E8.3): la sección «Foro» y su lista, con el router real
// (`rutas`) y el QueryClient de app/providers.tsx (staleTime de 30 s, un reintento). FORO-1C01 (su parte
// de 01c1), FORO-1C02, FORO-1C03, FORO-1C14 (la lista), y las partes de la lista de FORO-1C50 a FORO-1C54.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveListaDeForos } from "@/services/trabajoService"

import { CAPACIDADES_POR_PERSPECTIVA } from "./data"
import { indiceDeSeccionActiva } from "./lib"

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

type Rol = "estudiante" | "maestro" | "admin"

const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const CLASE_A = uuid("2a2b3c4d", 1)
const CLASE_B = uuid("2a2b3c4d", 2)
const MAESTRO = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez" }
const FIRMA = { ...MAESTRO, administracion: false }
const ESPERA = { timeout: 5000 }
const DIA_MS = 86_400_000
const BASES: Record<Rol, string> = {
  estudiante: "/estudiante/clases",
  maestro: "/maestro/clases",
  admin: "/admin/clases",
}
const FORO = (rol: Rol, claseId = CLASE_A) => `${BASES[rol]}/${claseId}/foro`
const API_FOROS = (claseId = CLASE_A) => `/api/clases/${claseId}/foros`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface ForoDoble {
  id: string
  titulo: string
  autor: typeof FIRMA
  creadoEn: string
  fechaLimite: string
  puntos: number
  tema: null
  participaciones: number
  entrega: { estado: "asignado" | "entregado" | "calificado"; conRetraso: boolean } | null
}

const idForo = (n: number) => uuid("5a5b3c4d", n)
const foro = (n: number, extra: Partial<ForoDoble> = {}): ForoDoble => ({
  id: idForo(n),
  titulo: `Foro ${String(n)}`,
  autor: FIRMA,
  creadoEn: "2026-10-01T15:30:00.000Z",
  fechaLimite: new Date(Date.now() + 5 * DIA_MS).toISOString(),
  puntos: 10,
  tema: null,
  participaciones: 0,
  entrega: null,
  ...extra,
})

interface Llamada {
  metodo: string
  url: URL
}

interface Estado {
  rol: Rol
  archivada: boolean
  refrescoFalla: boolean
  foros: Record<string, ForoDoble[]>
  // Una respuesta propia para una petición (undefined: la de siempre).
  falla: (llamada: Llamada) => Response | Promise<Response> | undefined
  llamadas: Llamada[]
}

let estado: Estado

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

const responder = (llamada: Llamada): Response | Promise<Response> => {
  const { metodo, url } = llamada
  const ruta = url.pathname
  if (ruta === "/api/auth/refrescar") {
    if (estado.refrescoFalla) return errorApi(401, "NO_AUTENTICADO")
    return respuestaJson(200, { tokenAcceso: "otra" })
  }
  if (ruta === "/api/me") {
    return respuestaJson(200, {
      id: uuid("4f4f3c4d", 1),
      nombre: "Ana López",
      email: "ana@ejemplo.mx",
      rol: estado.rol,
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  const propia = estado.falla(llamada)
  if (propia !== undefined) return propia
  if (ruta === "/api/clases/inscritas" || ruta === "/api/clases/impartidas") {
    return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
  }
  const deClase = /^\/api\/clases\/([^/]+)(\/.*)?$/.exec(ruta)
  const claseId = deClase?.[1] ?? ""
  const resto = deClase?.[2] ?? ""
  if (resto === "" && metodo === "GET") {
    return respuestaJson(200, {
      clase: {
        id: claseId,
        nombre: claseId === CLASE_A ? "Historia" : "Química",
        descripcion: null,
        maestro: MAESTRO,
        maestros: [MAESTRO],
        archivadaEn: estado.archivada ? "2026-10-20T10:00:00.000Z" : null,
      },
    })
  }
  if (resto === "/codigo") return respuestaJson(200, { codigo: "ABCDEFG" })
  if (resto === "/publicaciones") {
    return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
  }
  if (resto === "/foros" && metodo === "GET") {
    const r = paginar(estado.foros[claseId] ?? [], url)
    if (r === null) return errorApi(400, "VALIDACION", "cursor: no es válido")
    return respuestaJson(200, { foros: r.pagina, siguienteCursor: r.siguiente })
  }
  return errorApi(500, "ERROR_INTERNO", `no esperada: ${metodo} ${ruta}`)
}

const pedidasDeForos = (claseId = CLASE_A) =>
  estado.llamadas.filter(
    ({ metodo, url }) => metodo === "GET" && url.pathname === API_FOROS(claseId),
  )

const montar = async (entradas: string[], cliente?: QueryClient) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: entradas })
  const arbol = <RouterProvider router={router} />
  render(
    cliente === undefined ? (
      <Providers>{arbol}</Providers>
    ) : (
      <QueryClientProvider client={cliente}>{arbol}</QueryClientProvider>
    ),
  )
  return router
}

// El QueryClient de app/providers.tsx, a la vista de la prueba (para marcar la lista vieja).
const clienteComoElDeLaApp = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })

const reposar = (ms = 150) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))

// Una promesa que la prueba resuelve cuando quiere (una petición en vuelo).
const enVuelo = () => {
  let soltar: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((resolver) => {
    soltar = resolver
  })
  return { promesa, soltar }
}

const enLasSecciones = (nombre: string) =>
  within(screen.getByRole("list", { name: "Secciones de la clase" })).getByRole("link", {
    name: nombre,
  })

const esperarFila = (titulo: string) =>
  screen.findByRole("link", { name: nombreDeLaFila(titulo) }, ESPERA)

// El nombre del enlace de una fila empieza con «Foro: <título>»; el título no sigue con otro dígito.
function nombreDeLaFila(titulo: string): RegExp {
  return new RegExp(`^Foro: ${titulo}(?!\\d)`)
}

const veintiCinco = () => Array.from({ length: 25 }, (_, i) => foro(25 - i))

const esperarH2 = () => screen.findByRole("heading", { level: 2, name: "Foro" }, ESPERA)

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  estado = {
    rol: "maestro",
    archivada: false,
    refrescoFalla: false,
    foros: { [CLASE_A]: [], [CLASE_B]: [] },
    falla: () => undefined,
    llamadas: [],
  }
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
  vi.mocked(irA).mockClear()
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://x")
      const llamada = { metodo: init?.method ?? "GET", url }
      estado.llamadas.push(llamada)
      return Promise.resolve().then(() => responder(llamada))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
})

describe("FORO-1C01 · la sección «Foro», tercera de siete (01c1)", () => {
  it.each(["estudiante", "maestro", "admin"] as const)(
    "FORO-1C01: indiceDeSeccionActiva da 2 en …/foro, …/foro/ y …/FORO, y -1 en …/foros y …/foros/x (%s)",
    (rol) => {
      const secciones = CAPACIDADES_POR_PERSPECTIVA[rol].secciones
      const base = `${BASES[rol]}/${CLASE_A}`
      expect(indiceDeSeccionActiva(`${base}/foro`, base, secciones)).toBe(2)
      expect(indiceDeSeccionActiva(`${base}/foro/`, base, secciones)).toBe(2)
      expect(indiceDeSeccionActiva(`${base}/FORO`, base, secciones)).toBe(2)
      expect(indiceDeSeccionActiva(`${base}/foros/x`, base, secciones)).toBe(-1)
      expect(indiceDeSeccionActiva(`${base}/foros`, base, secciones)).toBe(-1)
    },
  )

  it.each(["estudiante", "maestro", "admin"] as const)(
    "FORO-1C01: %s en …/foro ve las siete secciones con «Foro» tercera, con su href y aria-current, y la vista monta «Foro»",
    async (rol) => {
      estado.rol = rol
      await montar([FORO(rol)])
      expect(await esperarH2()).toBeInTheDocument()
      const nombres = within(screen.getByRole("list", { name: "Secciones de la clase" }))
        .getAllByRole("link")
        .map((enlace) => enlace.textContent)
      expect(nombres).toEqual([
        "Avisos",
        "Actividades de aprendizaje",
        "Foro",
        "Recursos",
        "Dudas",
        "Personas",
        "Calificaciones",
      ])
      expect(enLasSecciones("Foro")).toHaveAttribute("href", FORO(rol))
      expect(enLasSecciones("Foro")).toHaveAttribute("aria-current", "page")
      expect(enLasSecciones("Avisos")).not.toHaveAttribute("aria-current")
    },
  )
})

describe("FORO-1C02 · los estados de la lista, las filas y «Crear foro»", () => {
  it("FORO-1C02: cargando, vacío y datos, en ese orden", async () => {
    const pendiente = enVuelo()
    estado.falla = ({ url }) => (url.pathname === API_FOROS() ? pendiente.promesa : undefined)
    await montar([FORO("maestro")])
    expect(await screen.findByText("Cargando los foros…", undefined, ESPERA)).toBeInTheDocument()
    pendiente.soltar(respuestaJson(200, { foros: [], siguienteCursor: null }))
    expect(
      await screen.findByText("Aún no hay foros en esta clase.", undefined, ESPERA),
    ).toBeInTheDocument()
    expect(screen.queryByText("Cargando los foros…")).toBeNull()
  })

  it("FORO-1C02: con la primera página fallida (5xx), la lista se reemplaza por su mensaje de error, sin aviso", async () => {
    estado.falla = ({ url }) =>
      url.pathname === API_FOROS() ? errorApi(500, "ERROR_INTERNO") : undefined
    await montar([FORO("maestro")])
    const mensaje = await screen.findByText(
      "Algo salió mal. Inténtalo de nuevo.",
      undefined,
      ESPERA,
    )
    expect(mensaje.closest("[role='alert']")).not.toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(screen.queryByRole("button", { name: "Ver más foros" })).toBeNull()
  })

  it("FORO-1C02: el maestro y el admin ven el conteo de participaciones y «Crear foro»; las filas llevan «Foro:» y van al foro", async () => {
    for (const rol of ["maestro", "admin"] as const) {
      estado.rol = rol
      estado.foros[CLASE_A] = [
        foro(3, { participaciones: 12 }),
        foro(2, { participaciones: 1 }),
        foro(1, { participaciones: 0 }),
      ]
      await montar([FORO(rol)])
      const fila = await esperarFila("Foro 3")
      expect(fila).toHaveAttribute("href", `${BASES[rol]}/${CLASE_A}/foros/${idForo(3)}`)
      expect(within(fila).getByText("12 participaciones")).toBeInTheDocument()
      expect(within(await esperarFila("Foro 2")).getByText("1 participación")).toBeInTheDocument()
      expect(
        within(await esperarFila("Foro 1")).getByText("Sin participaciones"),
      ).toBeInTheDocument()
      const crear = screen.getByRole("link", { name: "Crear foro" })
      expect(crear).toHaveAttribute("href", `${BASES[rol]}/${CLASE_A}/foros/nuevo`)
      expect(screen.queryByText("Participa en cada foro antes de su fecha límite.")).toBeNull()
      cleanup()
    }
  })

  it("FORO-1C02: el alumno ve su frase, sin «Crear foro», y el estado de su participación en cada fila (con retraso, calificado)", async () => {
    estado.rol = "estudiante"
    estado.foros[CLASE_A] = [
      foro(2, { entrega: { estado: "entregado", conRetraso: true } }),
      foro(1, { entrega: { estado: "calificado", conRetraso: false } }),
    ]
    await montar([FORO("estudiante")])
    expect(
      await screen.findByText(
        "Participa en cada foro antes de su fecha límite.",
        undefined,
        ESPERA,
      ),
    ).toBeInTheDocument()
    expect(
      within(await esperarFila("Foro 2")).getByText("Entregado con retraso"),
    ).toBeInTheDocument()
    expect(within(await esperarFila("Foro 1")).getByText("Calificado")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Crear foro" })).toBeNull()
    expect(screen.queryByText("participaciones", { exact: false })).toBeNull()
  })

  it("FORO-1C02: entrega null y { estado: asignado, conRetraso: false } se pintan igual, con el foro abierto y vencido (S-10)", async () => {
    estado.rol = "estudiante"
    const abierta = new Date(Date.now() + 5 * DIA_MS).toISOString()
    const vencida = new Date(Date.now() - DIA_MS).toISOString()
    estado.foros[CLASE_A] = [
      foro(4, { fechaLimite: abierta, entrega: null }),
      foro(3, { fechaLimite: abierta, entrega: { estado: "asignado", conRetraso: false } }),
      foro(2, { fechaLimite: vencida, entrega: null }),
      foro(1, { fechaLimite: vencida, entrega: { estado: "asignado", conRetraso: false } }),
    ]
    await montar([FORO("estudiante")])
    const textoDe = async (titulo: string) => (await esperarFila(titulo)).textContent
    const [sinFilaAbierta, asignadaAbierta, sinFilaVencida, asignadaVencida] = await Promise.all([
      textoDe("Foro 4"),
      textoDe("Foro 3"),
      textoDe("Foro 2"),
      textoDe("Foro 1"),
    ])
    expect(sinFilaAbierta?.replace("Foro 4", "")).toBe(asignadaAbierta?.replace("Foro 3", ""))
    expect(sinFilaVencida?.replace("Foro 2", "")).toBe(asignadaVencida?.replace("Foro 1", ""))
    expect(within(await esperarFila("Foro 4")).getByText("Asignado")).toBeInTheDocument()
    expect(within(await esperarFila("Foro 3")).getByText("Asignado")).toBeInTheDocument()
    expect(within(await esperarFila("Foro 2")).getByText("Sin entregar")).toBeInTheDocument()
    expect(within(await esperarFila("Foro 1")).getByText("Sin entregar")).toBeInTheDocument()
  })
})

describe("FORO-1C14 · la lista en una clase archivada (01c1)", () => {
  it.each(["maestro", "admin"] as const)(
    "FORO-1C14: %s en una clase archivada ve la lista, sin «Crear foro»",
    async (rol) => {
      estado.rol = rol
      estado.archivada = true
      estado.foros[CLASE_A] = [foro(1)]
      await montar([FORO(rol)])
      expect(await esperarFila("Foro 1")).toBeInTheDocument()
      await reposar()
      expect(screen.queryByRole("link", { name: "Crear foro" })).toBeNull()
    },
  )
})

describe("FORO-1C03 y FORO-1C50 · «Ver más foros»", () => {
  it("FORO-1C03: pide la página siguiente con el cursor, lleva el foco al primer foro nuevo y, en la última página, ya no se ofrece", async () => {
    estado.foros[CLASE_A] = veintiCinco()
    await montar([FORO("maestro")])
    await esperarFila("Foro 6")
    const verMas = screen.getByRole("button", { name: "Ver más foros" })
    verMas.focus()
    fireEvent.click(verMas)
    const nuevo = await esperarFila("Foro 5")
    await waitFor(() => expect(nuevo).toHaveFocus(), ESPERA)
    expect(screen.queryByRole("button", { name: "Ver más foros" })).toBeNull()
    const conCursor = pedidasDeForos().filter(({ url }) => url.searchParams.has("cursor"))
    expect(conCursor.map(({ url }) => url.searchParams.get("cursor"))).toEqual([idForo(6)])
  })

  it("FORO-1C50: dos clics en el mismo render de «Ver más foros» piden una sola página", async () => {
    estado.foros[CLASE_A] = veintiCinco()
    await montar([FORO("maestro")])
    await esperarFila("Foro 6")
    const pagina = enVuelo()
    estado.falla = ({ url }) =>
      url.pathname === API_FOROS() && url.searchParams.has("cursor") ? pagina.promesa : undefined
    const verMas = screen.getByRole("button", { name: "Ver más foros" })
    fireEvent.click(verMas)
    fireEvent.click(verMas)
    await reposar()
    expect(pedidasDeForos().filter(({ url }) => url.searchParams.has("cursor"))).toHaveLength(1)
    pagina.soltar(respuestaJson(200, { foros: veintiCinco().slice(20), siguienteCursor: null }))
    expect(await esperarFila("Foro 1")).toBeInTheDocument()
  })
})

describe("FORO-1C03 · «Ver más foros» en espera durante una recarga", () => {
  it("FORO-1C03: con la lista marcada vieja, pulsar «Foro» la recarga y «Ver más foros» queda en espera hasta que llega", async () => {
    estado.foros[CLASE_A] = veintiCinco()
    const cliente = clienteComoElDeLaApp()
    await montar([FORO("maestro")], cliente)
    await esperarFila("Foro 6")
    await act(() =>
      cliente.invalidateQueries({ queryKey: claveListaDeForos(CLASE_A), refetchType: "none" }),
    )
    const recarga = enVuelo()
    estado.falla = ({ url }) => (url.pathname === API_FOROS() ? recarga.promesa : undefined)
    fireEvent.click(enLasSecciones("Foro"))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Ver más foros" })).toHaveAttribute(
        "aria-busy",
        "true",
      ),
    )
    const antes = pedidasDeForos().length
    fireEvent.click(screen.getByRole("button", { name: "Ver más foros" }))
    await reposar()
    expect(pedidasDeForos()).toHaveLength(antes)
    recarga.soltar(
      respuestaJson(200, { foros: veintiCinco().slice(0, 20), siguienteCursor: idForo(6) }),
    )
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Ver más foros" })).not.toHaveAttribute(
        "aria-busy",
        "true",
      ),
    )
  })
})

describe("FORO-1C51 · «Ver más foros» que falla por la red o el servidor (DESIGN.md §7.10)", () => {
  it.each([
    ["503", () => errorApi(503, "SERVICIO_OCUPADO")],
    ["sin red", () => Promise.reject(new TypeError("Failed to fetch"))],
  ] as const)(
    "FORO-1C51: con %s, la lista se queda, un solo aviso, «Ver más foros» sigue a la vista y el foco queda en el botón",
    async (_nombre, falla) => {
      estado.foros[CLASE_A] = veintiCinco()
      await montar([FORO("maestro")])
      await esperarFila("Foro 6")
      estado.falla = ({ url }) =>
        url.pathname === API_FOROS() && url.searchParams.has("cursor") ? falla() : undefined
      const verMas = screen.getByRole("button", { name: "Ver más foros" })
      verMas.focus()
      fireEvent.click(verMas)
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
      await reposar()
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(screen.getByRole("link", { name: nombreDeLaFila("Foro 6") })).toBeInTheDocument()
      expect(screen.queryByRole("alert")).toBeNull()
      const otraVez = screen.getByRole("button", { name: "Ver más foros" })
      expect(otraVez).toHaveFocus()
    },
  )

  it("FORO-1C51: mientras una recarga la recupera (pulsar «Foro»), la lista se ve sin error; si esa recarga falla, la reemplaza", async () => {
    estado.foros[CLASE_A] = veintiCinco()
    await montar([FORO("maestro")])
    await esperarFila("Foro 6")
    estado.falla = ({ url }) =>
      url.pathname === API_FOROS() && url.searchParams.has("cursor")
        ? errorApi(503, "SERVICIO_OCUPADO")
        : undefined
    fireEvent.click(screen.getByRole("button", { name: "Ver más foros" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    const recarga = enVuelo()
    estado.falla = ({ url }) => (url.pathname === API_FOROS() ? recarga.promesa : undefined)
    fireEvent.click(enLasSecciones("Foro"))
    await reposar()
    expect(screen.getByRole("link", { name: nombreDeLaFila("Foro 6") })).toBeInTheDocument()
    expect(screen.queryByRole("alert")).toBeNull()
    // El foco en una fila, que desaparece con la lista: debe ir al h2, nunca a <body>.
    screen.getByRole("link", { name: nombreDeLaFila("Foro 6") }).focus()
    recarga.soltar(errorApi(503, "SERVICIO_OCUPADO"))
    // El reintento (retry: 1) también falla: la recarga que falla reemplaza la lista.
    expect(await screen.findByRole("alert", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: nombreDeLaFila("Foro 6") })).toBeNull()
    await waitFor(
      () => expect(screen.getByRole("heading", { level: 2, name: "Foro" })).toHaveFocus(),
      ESPERA,
    )
  })
})

describe("FORO-1C52 · la lista es de la clase de la ruta", () => {
  it("FORO-1C52: la lista de la clase A con un «Ver más» en vuelo no hereda su aviso al saltar a la clase B", async () => {
    estado.foros[CLASE_A] = veintiCinco()
    estado.foros[CLASE_B] = [foro(90, { titulo: "Foro de B" })]
    const router = await montar([FORO("maestro")])
    await esperarFila("Foro 6")
    const pagina = enVuelo()
    estado.falla = ({ url }) =>
      url.pathname === API_FOROS() && url.searchParams.has("cursor") ? pagina.promesa : undefined
    fireEvent.click(screen.getByRole("button", { name: "Ver más foros" }))
    await reposar()
    await act(() => router.navigate(FORO("maestro", CLASE_B)))
    expect(await esperarFila("Foro de B")).toBeInTheDocument()
    pagina.soltar(errorApi(503, "SERVICIO_OCUPADO"))
    await reposar(300)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.queryByRole("link", { name: nombreDeLaFila("Foro 6") })).toBeNull()
  })
})

describe("FORO-1C53 · «Ver más foros» no avisa ante un código con que apiClient redirige", () => {
  it.each([
    ["401 sin refresco", "/login"],
    ["403 ACCESO_RESTRINGIDO", "/acceso-restringido"],
    ["403 CAMBIO_DE_CONTRASENA_REQUERIDO", "/cambiar-contrasena"],
  ] as const)("FORO-1C53: con %s, ningún aviso", async (nombre, destino) => {
    estado.foros[CLASE_A] = veintiCinco()
    await montar([FORO("maestro")])
    await esperarFila("Foro 6")
    if (nombre === "401 sin refresco") estado.refrescoFalla = true
    const respuesta = () => {
      if (nombre === "401 sin refresco") return errorApi(401, "NO_AUTENTICADO")
      if (nombre === "403 ACCESO_RESTRINGIDO") return errorApi(403, "ACCESO_RESTRINGIDO")
      return errorApi(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
    }
    estado.falla = ({ url }) =>
      url.pathname === API_FOROS() && url.searchParams.has("cursor") ? respuesta() : undefined
    fireEvent.click(screen.getByRole("button", { name: "Ver más foros" }))
    await waitFor(() => expect(irA).toHaveBeenCalledWith(destino), ESPERA)
    await reposar(300)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(aviso).not.toHaveBeenCalled()
  })
})

describe("FORO-1C54 · la política única al pulsar «Foro» estando en ella", () => {
  it("FORO-1C54: con la lista en error, pulsar «Foro» la pide una sola vez", async () => {
    estado.falla = ({ url }) =>
      url.pathname === API_FOROS() ? errorApi(503, "SERVICIO_OCUPADO") : undefined
    await montar([FORO("maestro")])
    await screen.findByRole("alert", undefined, ESPERA)
    await reposar()
    const antes = pedidasDeForos().length
    estado.falla = () => undefined
    estado.foros[CLASE_A] = [foro(1)]
    fireEvent.click(enLasSecciones("Foro"))
    expect(await esperarFila("Foro 1")).toBeInTheDocument()
    await reposar()
    expect(pedidasDeForos()).toHaveLength(antes + 1)
  })

  it("FORO-1C54: con la lista vieja, una sola petición; sana y fresca, ninguna", async () => {
    estado.foros[CLASE_A] = [foro(1)]
    const cliente = clienteComoElDeLaApp()
    await montar([FORO("maestro")], cliente)
    await esperarFila("Foro 1")
    await reposar()
    const fresca = pedidasDeForos().length
    fireEvent.click(enLasSecciones("Foro"))
    await reposar(300)
    expect(pedidasDeForos()).toHaveLength(fresca)
    await act(() =>
      cliente.invalidateQueries({ queryKey: claveListaDeForos(CLASE_A), refetchType: "none" }),
    )
    fireEvent.click(enLasSecciones("Foro"))
    await waitFor(() => expect(pedidasDeForos()).toHaveLength(fresca + 1), ESPERA)
    await reposar(300)
    expect(pedidasDeForos()).toHaveLength(fresca + 1)
  })

  it("FORO-1C54: con una petición en vuelo, pulsar «Foro» no la cancela ni la duplica", async () => {
    const pendiente = enVuelo()
    estado.falla = ({ url }) => (url.pathname === API_FOROS() ? pendiente.promesa : undefined)
    await montar([FORO("maestro")])
    await screen.findByText("Cargando los foros…", undefined, ESPERA)
    const antes = pedidasDeForos().length
    fireEvent.click(enLasSecciones("Foro"))
    fireEvent.click(enLasSecciones("Foro"))
    await reposar()
    expect(pedidasDeForos()).toHaveLength(antes)
    pendiente.soltar(respuestaJson(200, { foros: [foro(1)], siguienteCursor: null }))
    expect(await esperarFila("Foro 1")).toBeInTheDocument()
  })

  it("FORO-1C54: salir y volver antes de 30 s con la lista en error la pide", async () => {
    estado.falla = ({ url }) =>
      url.pathname === API_FOROS() ? errorApi(503, "SERVICIO_OCUPADO") : undefined
    await montar([FORO("maestro")])
    await screen.findByRole("alert", undefined, ESPERA)
    await reposar()
    fireEvent.click(enLasSecciones("Avisos"))
    await screen.findByText("Publica el primer aviso de tu clase.", undefined, ESPERA)
    const antes = pedidasDeForos().length
    estado.falla = () => undefined
    estado.foros[CLASE_A] = [foro(1)]
    fireEvent.click(enLasSecciones("Foro"))
    expect(await esperarFila("Foro 1")).toBeInTheDocument()
    expect(pedidasDeForos().length).toBeGreaterThan(antes)
  })
})

// M-10 (verificación del manager de 01c1): la lista que conservó un fallo de «Ver más foros» se ve sin
// error mientras una recarga la recupera también cuando la vista se monta de nuevo con esa recarga en
// vuelo: al volver de otra sección y al regresar de otra clase (con key={claseId}, la lista de A se
// monta de nuevo). Si la recarga responde, llegan las filas; si falla, reemplaza la lista.
const conLaListaConservada = async (entradas: string[]) => {
  estado.foros[CLASE_A] = veintiCinco()
  const router = await montar(entradas)
  await esperarFila("Foro 6")
  estado.falla = ({ url }) =>
    url.pathname === API_FOROS() && url.searchParams.has("cursor")
      ? errorApi(503, "SERVICIO_OCUPADO")
      : undefined
  fireEvent.click(screen.getByRole("button", { name: "Ver más foros" }))
  await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
  await reposar()
  return router
}

// Retiene la primera página de la clase A hasta que la prueba la suelta, con éxito o con un 503 (también
// el reintento: cada petición recibe su propia respuesta).
const retenerLaPrimeraPagina = () => {
  let liberar: (falla: boolean) => void = () => undefined
  const puerta = new Promise<boolean>((resolver) => {
    liberar = resolver
  })
  estado.falla = ({ url }) => {
    if (url.pathname !== API_FOROS() || url.searchParams.has("cursor")) return undefined
    return puerta.then((falla) => {
      if (falla) return errorApi(503, "SERVICIO_OCUPADO")
      const r = paginar(estado.foros[CLASE_A] ?? [], url)
      return respuestaJson(200, { foros: r?.pagina ?? [], siguienteCursor: r?.siguiente ?? null })
    })
  }
  return liberar
}

const enVueloSinError = async () => {
  await esperarH2()
  await reposar()
  const enFoco = document.activeElement
  expect(screen.getByRole("link", { name: nombreDeLaFila("Foro 6") })).toBeInTheDocument()
  expect(screen.queryByRole("alert")).toBeNull()
  expect(screen.queryByText("Algo salió mal. Inténtalo de nuevo.")).toBeNull()
  await reposar()
  expect(document.activeElement).toBe(enFoco)
  expect(screen.queryByRole("alert")).toBeNull()
}

const alResponder = async (falla: boolean, liberar: (falla: boolean) => void) => {
  liberar(falla)
  if (falla) {
    expect(await screen.findByRole("alert", undefined, ESPERA)).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: nombreDeLaFila("Foro 6") })).toBeNull()
    return
  }
  expect(await esperarFila("Foro 25")).toBeInTheDocument()
  await reposar()
  expect(screen.getByRole("link", { name: nombreDeLaFila("Foro 6") })).toBeInTheDocument()
  expect(screen.queryByRole("alert")).toBeNull()
}

describe("FORO-1C51 · la lista conservada con la vista montada de nuevo (M-10)", () => {
  it.each([
    { resultado: "responde, llegan las filas", falla: false },
    { resultado: "falla, la reemplaza", falla: true },
  ] as const)(
    "FORO-1C51 (volver): con la lista conservada, ir a «Avisos» y volver a «Foro» con la recarga en vuelo la muestra sin error; si la recarga $resultado",
    async ({ falla }) => {
      await conLaListaConservada([FORO("maestro")])
      fireEvent.click(enLasSecciones("Avisos"))
      await screen.findByText("Publica el primer aviso de tu clase.", undefined, ESPERA)
      const liberar = retenerLaPrimeraPagina()
      fireEvent.click(enLasSecciones("Foro"))
      await enVueloSinError()
      await alResponder(falla, liberar)
    },
  )

  it.each([
    { resultado: "responde, llegan las filas", falla: false },
    { resultado: "falla, la reemplaza", falla: true },
  ] as const)(
    "FORO-1C51 (saltar de clase): con la lista de A conservada, ir a «Foro» de B y regresar a A con el historial y la recarga en vuelo la muestra sin error; si la recarga $resultado",
    async ({ falla }) => {
      estado.foros[CLASE_B] = [foro(90, { titulo: "Foro de B" })]
      const router = await conLaListaConservada([FORO("maestro", CLASE_B), FORO("maestro")])
      await act(() => router.navigate(-1))
      expect(await esperarFila("Foro de B")).toBeInTheDocument()
      const liberar = retenerLaPrimeraPagina()
      await act(() => router.navigate(1))
      await enVueloSinError()
      await alResponder(falla, liberar)
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
  )
})

describe("FORO-1C51 · dos fallos seguidos de «Ver más foros» (N-30)", () => {
  it("FORO-1C51: dos fallos seguidos dan dos avisos, uno por fallo; la lista y «Ver más foros» siguen a la vista", async () => {
    await conLaListaConservada([FORO("maestro")])
    fireEvent.click(screen.getByRole("button", { name: "Ver más foros" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledTimes(2)
    expect(screen.getByRole("link", { name: nombreDeLaFila("Foro 6") })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Ver más foros" })).toBeInTheDocument()
    expect(screen.queryByRole("alert")).toBeNull()
  })
})

describe("FORO-1C02 · una recarga correcta que quita la fila enfocada (N-28)", () => {
  it("FORO-1C02: si una recarga correcta quita el foro que tenía el foco, el foco va al h2, nunca a <body>", async () => {
    estado.foros[CLASE_A] = [foro(3), foro(2), foro(1)]
    const cliente = clienteComoElDeLaApp()
    await montar([FORO("maestro")], cliente)
    const fila = await esperarFila("Foro 2")
    fila.focus()
    expect(fila).toHaveFocus()
    estado.foros[CLASE_A] = [foro(3), foro(1)]
    await act(() => cliente.invalidateQueries({ queryKey: claveListaDeForos(CLASE_A) }))
    await waitFor(
      () => expect(screen.queryByRole("link", { name: nombreDeLaFila("Foro 2") })).toBeNull(),
      ESPERA,
    )
    await waitFor(
      () => expect(screen.getByRole("heading", { level: 2, name: "Foro" })).toHaveFocus(),
      ESPERA,
    )
    expect(document.activeElement).not.toBe(document.body)
  })
})
