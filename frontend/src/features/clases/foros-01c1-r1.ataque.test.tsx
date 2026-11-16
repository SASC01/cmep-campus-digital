// Ataque FORO-01c1, ronda 1 (tester). La sección «Foro» con el router real (`rutas` de app/router) y
// el QueryClient de app/providers.tsx (staleTime de 30 s, un reintento), como pide AGENTS.md para las
// frases de recuperación. Puntos 1 a 3 y 7 de la verificación del manager: la frase «Vuelve a abrir Foro»
// por el salto de clase (historial y barra) y con dos pulsaciones; el aviso heredado o doble entre clases
// y montajes; los códigos con que apiClient redirige, en la primera página y en la recarga de una lista
// conservada; la lista conservada en StrictMode y de A a B y de vuelta; el 400 del cursor y el 4xx de la
// recuperación después de conservarla.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { StrictMode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const CLASE_A = uuid("2a2b3c4d", 1)
const CLASE_B = uuid("2a2b3c4d", 2)
const MAESTRO = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez" }
const ESPERA = { timeout: 6000 }
const FORO_A = `/maestro/clases/${CLASE_A}/foro`
const FORO_B = `/maestro/clases/${CLASE_B}/foro`
const R_FOROS =
  "La lista de foros cambió mientras la veías. Vuelve a abrir Foro para verla completa."
const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const SIN_ACCESO = "No tienes acceso a esta clase."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const idForo = (clase: string, n: number) => uuid(clase === CLASE_A ? "5a5b3c4d" : "6a6b3c4d", n)
const foro = (clase: string, n: number) => ({
  id: idForo(clase, n),
  titulo: clase === CLASE_A ? `Foro ${String(n)}` : `Debate ${String(n)}`,
  autor: { ...MAESTRO, administracion: false },
  creadoEn: "2026-10-01T15:30:00.000Z",
  fechaLimite: new Date(Date.now() + 5 * 86_400_000).toISOString(),
  puntos: 10,
  tema: null,
  participaciones: 0,
  entrega: null,
})

interface Llamada {
  metodo: string
  url: URL
}

let foros: Record<string, ReturnType<typeof foro>[]>
let llamadas: Llamada[]
// Una respuesta propia para una petición (undefined: la de siempre).
let propia: (llamada: Llamada) => Response | Promise<Response> | undefined
let refrescoFalla: boolean

const nombreDe = (clase: string) => (clase === CLASE_A ? "Historia" : "Química")

const responder = (llamada: Llamada): Response | Promise<Response> => {
  const { metodo, url } = llamada
  const ruta = url.pathname
  if (ruta === "/api/auth/refrescar") {
    return refrescoFalla
      ? errorApi(401, "NO_AUTENTICADO")
      : respuestaJson(200, { tokenAcceso: "otra" })
  }
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
  const deEstaPrueba = propia(llamada)
  if (deEstaPrueba !== undefined) return deEstaPrueba
  if (ruta === "/api/clases/impartidas") {
    return respuestaJson(200, {
      clases: [CLASE_A, CLASE_B].map((id) => ({ id, nombre: nombreDe(id), alumnos: 3 })),
      total: 2,
      siguienteCursor: null,
    })
  }
  const deClase = /^\/api\/clases\/([^/]+)(\/.*)?$/.exec(ruta)
  const claseId = deClase?.[1] ?? ""
  const resto = deClase?.[2] ?? ""
  if (resto === "" && metodo === "GET") {
    return respuestaJson(200, {
      clase: {
        id: claseId,
        nombre: nombreDe(claseId),
        descripcion: null,
        maestro: MAESTRO,
        maestros: [MAESTRO],
        archivadaEn: null,
      },
    })
  }
  if (resto === "/codigo") return respuestaJson(200, { codigo: "ABCDEFG" })
  if (resto === "/publicaciones") {
    return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
  }
  if (resto === "/foros" && metodo === "GET") {
    const filas = foros[claseId] ?? []
    const limite = Number(url.searchParams.get("limite") ?? "20")
    const cursor = url.searchParams.get("cursor")
    let inicio = 0
    if (cursor !== null) {
      const indice = filas.findIndex((fila) => fila.id === cursor)
      if (indice === -1) return errorApi(400, "VALIDACION", "cursor: no es válido")
      inicio = indice + 1
    }
    const pagina = filas.slice(inicio, inicio + limite)
    const siguiente = filas.length > inicio + limite ? (pagina.at(-1)?.id ?? null) : null
    return respuestaJson(200, { foros: pagina, siguienteCursor: siguiente })
  }
  return errorApi(500, "ERROR_INTERNO", `no esperada: ${metodo} ${ruta}`)
}

const pedidasDeForos = (clase: string) =>
  llamadas.filter(
    ({ metodo, url }) => metodo === "GET" && url.pathname === `/api/clases/${clase}/foros`,
  )
const esPrimeraPagina = (llamada: Llamada) => !llamada.url.searchParams.has("cursor")
const esForos = (clase: string, llamada: Llamada) =>
  llamada.metodo === "GET" && llamada.url.pathname === `/api/clases/${clase}/foros`

const montar = async (entradas: string[], estricto = false) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: entradas })
  const arbol = (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  )
  render(estricto ? <StrictMode>{arbol}</StrictMode> : arbol)
  return router
}

const reposar = (ms = 150) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))

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

const enLaBarra = (clase: string) =>
  within(screen.getByRole("list", { name: "Mis clases" })).getByRole("link", {
    name: new RegExp(nombreDe(clase)),
  })

const nombreDeLaFila = (titulo: string) => new RegExp(`^Foro: ${titulo}(?!\\d)`)
const esperarFila = (titulo: string) =>
  screen.findByRole("link", { name: nombreDeLaFila(titulo) }, ESPERA)
const esperarH2 = () => screen.findByRole("heading", { level: 2, name: "Foro" }, ESPERA)

const sinAlerta = () => {
  expect(screen.queryByRole("alert")).toBeNull()
  expect(screen.queryByText(GENERICO)).toBeNull()
}

// 25 foros en A; "Ver más foros" vence su cursor (el foro 6 ya no está) y la lista dice la frase.
const conLaFraseEnA = async () => {
  await esperarH2()
  await esperarFila("Foro 6")
  foros[CLASE_A] = (foros[CLASE_A] ?? []).filter(({ id }) => id !== idForo(CLASE_A, 6))
  fireEvent.click(screen.getByRole("button", { name: "Ver más foros" }))
  expect(await screen.findByText(R_FOROS, undefined, ESPERA)).toBeInTheDocument()
}

// La primera página de A queda; "Ver más foros" falla con un 503 (y su reintento): la lista se conserva
// con un aviso.
const conservadaEnA = async () => {
  await esperarH2()
  await esperarFila("Foro 20")
  const anterior = propia
  propia = (llamada) => {
    if (esForos(CLASE_A, llamada) && !esPrimeraPagina(llamada)) {
      return errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado.")
    }
    return anterior(llamada)
  }
  const avisosAntes = aviso.error.mock.calls.length
  fireEvent.click(screen.getByRole("button", { name: "Ver más foros" }))
  await waitFor(() => expect(aviso.error.mock.calls.length).toBe(avisosAntes + 1), ESPERA)
  expect(screen.getByRole("link", { name: nombreDeLaFila("Foro 20") })).toBeInTheDocument()
  propia = anterior
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  foros = {
    [CLASE_A]: Array.from({ length: 25 }, (_, i) => foro(CLASE_A, 25 - i)),
    [CLASE_B]: Array.from({ length: 3 }, (_, i) => foro(CLASE_B, 3 - i)),
  }
  llamadas = []
  propia = () => undefined
  refrescoFalla = false
  aviso.mockClear()
  aviso.error.mockClear()
  vi.mocked(irA).mockClear()
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const llamada = { metodo: init?.method ?? "GET", url: new URL(String(entrada), "http://x") }
      llamadas.push(llamada)
      return Promise.resolve().then(() => responder(llamada))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
})

describe("ataque FORO-01c1 r1 · punto 1: «Vuelve a abrir Foro» por los caminos que el plan no inventarió", () => {
  it("ATQ-FORO-90: con la frase a la vista en A, ir a «Foro» de B y volver a A con el historial pide la primera página de A sin cursor, la frase sale y no hay aviso", async () => {
    const router = await montar([FORO_A])
    await conLaFraseEnA()
    await reposar()
    await act(() => router.navigate(FORO_B))
    await esperarFila("Debate 3")
    const antes = pedidasDeForos(CLASE_A).length
    await act(() => router.navigate(-1))
    await esperarH2()
    await waitFor(() => expect(screen.queryByText(R_FOROS)).toBeNull(), ESPERA)
    await esperarFila("Foro 7")
    const nuevas = pedidasDeForos(CLASE_A).slice(antes)
    expect(nuevas.length).toBeGreaterThan(0)
    expect(esPrimeraPagina(nuevas[0] ?? { metodo: "", url: new URL("http://x/?cursor=x") })).toBe(
      true,
    )
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("ATQ-FORO-91: con la frase a la vista en A, ir por la barra a B, abrir su «Foro», volver por la barra a A y abrir «Foro» pide la primera página sin cursor, la frase sale y no hay aviso", async () => {
    await montar([FORO_A])
    await conLaFraseEnA()
    await reposar()
    fireEvent.click(enLaBarra(CLASE_B))
    await screen.findByRole("heading", { level: 1, name: "Química" }, ESPERA)
    fireEvent.click(enLasSecciones("Foro"))
    await esperarFila("Debate 3")
    const antes = pedidasDeForos(CLASE_A).length
    fireEvent.click(enLaBarra(CLASE_A))
    await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
    fireEvent.click(enLasSecciones("Foro"))
    await esperarH2()
    await waitFor(() => expect(screen.queryByText(R_FOROS)).toBeNull(), ESPERA)
    await esperarFila("Foro 7")
    const nuevas = pedidasDeForos(CLASE_A).slice(antes)
    expect(nuevas.length).toBeGreaterThan(0)
    expect(nuevas[0]?.url.searchParams.has("cursor")).toBe(false)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("ATQ-FORO-92: con la frase a la vista, pulsar «Foro» dos veces seguidas pide la primera página una sola vez y la frase sale", async () => {
    await montar([FORO_A])
    await conLaFraseEnA()
    await reposar()
    const retenida = enVuelo()
    propia = (llamada) => (esForos(CLASE_A, llamada) ? retenida.promesa : undefined)
    const antes = pedidasDeForos(CLASE_A).length
    fireEvent.click(enLasSecciones("Foro"))
    fireEvent.click(enLasSecciones("Foro"))
    await reposar(300)
    fireEvent.click(enLasSecciones("Foro"))
    await reposar(300)
    expect(pedidasDeForos(CLASE_A).slice(antes)).toHaveLength(1)
    propia = () => undefined
    act(() => {
      retenida.soltar(
        respuestaJson(200, {
          foros: (foros[CLASE_A] ?? []).slice(0, 20),
          siguienteCursor: (foros[CLASE_A] ?? [])[19]?.id ?? null,
        }),
      )
    })
    await waitFor(() => expect(screen.queryByText(R_FOROS)).toBeNull(), ESPERA)
    await esperarFila("Foro 7")
    expect(pedidasDeForos(CLASE_A).slice(antes)).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("ataque FORO-01c1 r1 · punto 2: el aviso heredado o doble", () => {
  it("ATQ-FORO-93: «Ver más foros» de A falla con la vista de A desmontada; volver a A no avisa del fallo viejo, la lista se ve sin alerta mientras la recarga vuela y llegan las filas", async () => {
    const router = await montar([FORO_A])
    await esperarH2()
    await esperarFila("Foro 20")
    const intentos: ReturnType<typeof enVuelo>[] = []
    propia = (llamada) => {
      if (!esForos(CLASE_A, llamada) || esPrimeraPagina(llamada)) return undefined
      const intento = enVuelo()
      intentos.push(intento)
      return intento.promesa
    }
    fireEvent.click(screen.getByRole("button", { name: "Ver más foros" }))
    await waitFor(() => expect(intentos).toHaveLength(1), ESPERA)
    await act(() => router.navigate(FORO_B))
    await esperarFila("Debate 3")
    act(() => {
      intentos[0]?.soltar(errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado."))
    })
    // Sin observadores, TanStack no reintenta: si llegara un reintento, también falla.
    await reposar(1500)
    act(() => {
      intentos[1]?.soltar(errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado."))
    })
    await reposar(300)
    expect(aviso.error).not.toHaveBeenCalled()
    const recarga = enVuelo()
    propia = (llamada) =>
      esForos(CLASE_A, llamada) && esPrimeraPagina(llamada) ? recarga.promesa : undefined
    await act(() => router.navigate(-1))
    await esperarH2()
    await reposar(300)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(screen.queryByRole("alert")).toBeNull()
    propia = () => undefined
    act(() => {
      recarga.soltar(
        respuestaJson(200, {
          foros: (foros[CLASE_A] ?? []).slice(0, 20),
          siguienteCursor: (foros[CLASE_A] ?? [])[19]?.id ?? null,
        }),
      )
    })
    await esperarFila("Foro 6")
    await reposar(300)
    expect(aviso.error).not.toHaveBeenCalled()
    sinAlerta()
  }, 20_000)

  it("ATQ-FORO-94: dos fallos de «Ver más foros» con un montaje de la vista entre ellos (ir a «Avisos» y volver) dan exactamente dos avisos, uno por fallo, y la lista se queda", async () => {
    await montar([FORO_A])
    await conservadaEnA()
    expect(aviso.error).toHaveBeenCalledTimes(1)
    fireEvent.click(enLasSecciones("Avisos"))
    await screen.findByText("Publica el primer aviso de tu clase.", undefined, ESPERA)
    fireEvent.click(enLasSecciones("Foro"))
    await esperarH2()
    await esperarFila("Foro 20")
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    await conservadaEnA()
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledTimes(2)
    expect(screen.getByRole("button", { name: "Ver más foros" })).toBeInTheDocument()
  }, 20_000)

  it("ATQ-FORO-95: en StrictMode, un fallo de «Ver más foros» da un solo aviso y la lista se queda", async () => {
    await montar([FORO_A], true)
    await conservadaEnA()
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    sinAlerta()
  }, 20_000)

  it("ATQ-FORO-96: A y B conservadas, de A a B y de vuelta dos veces: ningún aviso repetido ni heredado (dos en total) y ninguna alerta mientras cada recarga vuela", async () => {
    foros[CLASE_B] = Array.from({ length: 25 }, (_, i) => foro(CLASE_B, 25 - i))
    const router = await montar([FORO_A])
    await conservadaEnA()
    await act(() => router.navigate(FORO_B))
    await esperarFila("Debate 20")
    propia = (llamada) =>
      esForos(CLASE_B, llamada) && !esPrimeraPagina(llamada)
        ? errorApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado.")
        : undefined
    fireEvent.click(screen.getByRole("button", { name: "Ver más foros" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2), ESPERA)
    propia = () => undefined
    for (const destino of [-1, 1, -1, 1]) {
      await act(() => router.navigate(destino))
      await esperarH2()
      sinAlerta()
      await reposar(300)
      sinAlerta()
    }
    expect(aviso.error).toHaveBeenCalledTimes(2)
  }, 30_000)
})

describe("ataque FORO-01c1 r1 · punto 3: los códigos con que apiClient redirige", () => {
  const CODIGOS: [string, () => Response][] = [
    ["401 sin refresco", () => errorApi(401, "NO_AUTENTICADO")],
    ["403 ACCESO_RESTRINGIDO", () => errorApi(403, "ACCESO_RESTRINGIDO")],
    ["403 CAMBIO_DE_CONTRASENA_REQUERIDO", () => errorApi(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")],
  ]

  it.each(CODIGOS)(
    "ATQ-FORO-97: con %s en la primera página, apiClient redirige y la vista no avisa",
    async (_nombre, respuesta) => {
      refrescoFalla = true
      propia = (llamada) => (esForos(CLASE_A, llamada) ? respuesta() : undefined)
      await montar([FORO_A])
      await esperarH2()
      await waitFor(() => expect(vi.mocked(irA)).toHaveBeenCalled(), ESPERA)
      await reposar(300)
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )

  it.each(CODIGOS)(
    "ATQ-FORO-98: con la lista conservada, si la recarga al pulsar «Foro» responde %s, apiClient redirige y no hay un aviso más",
    async (_nombre, respuesta) => {
      await montar([FORO_A])
      await conservadaEnA()
      refrescoFalla = true
      propia = (llamada) =>
        esForos(CLASE_A, llamada) && esPrimeraPagina(llamada) ? respuesta() : undefined
      fireEvent.click(enLasSecciones("Foro"))
      await waitFor(() => expect(vi.mocked(irA)).toHaveBeenCalled(), ESPERA)
      await reposar(300)
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
  )
})

describe("ataque FORO-01c1 r1 · puntos 6 y 7: el mensaje de la primera página y la recuperación que falla", () => {
  const CASOS: [string, () => Response | Promise<Response>, string][] = [
    ["un 500 sin cuerpo", () => new Response("", { status: 500 }), GENERICO],
    ["un 502 con HTML", () => new Response("<html>Bad gateway</html>", { status: 502 }), GENERICO],
    ["sin red", () => Promise.reject(new TypeError("Failed to fetch")), GENERICO],
    ["un 503 con mensaje vacío", () => errorApi(503, "SERVICIO_OCUPADO", ""), GENERICO],
    ["un 503 con solo espacios", () => errorApi(503, "SERVICIO_OCUPADO", "   "), GENERICO],
    [
      "un VALIDACION de claseId",
      () => errorApi(400, "VALIDACION", "claseId: claseId: debe ser un identificador válido"),
      SIN_ACCESO,
    ],
    [
      "un VALIDACION con ruta",
      () => errorApi(400, "VALIDACION", "limite: Number must be less than or equal to 100"),
      GENERICO,
    ],
    ["un 403 SIN_ACCESO_A_LA_CLASE", () => errorApi(403, "SIN_ACCESO_A_LA_CLASE"), SIN_ACCESO],
    ["un 404 de la clase", () => errorApi(404, "CLASE_NO_ENCONTRADA", "Not found"), GENERICO],
  ]

  it.each(CASOS)(
    "ATQ-FORO-99: con %s en la primera página, un solo mensaje legible en lugar de la lista y ningún aviso",
    async (_nombre, respuesta, texto) => {
      propia = (llamada) => (esForos(CLASE_A, llamada) ? respuesta() : undefined)
      await montar([FORO_A])
      await esperarH2()
      const alerta = await screen.findByRole("alert", undefined, { timeout: 8000 })
      expect(alerta).toHaveTextContent(texto)
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      expect(screen.queryByText("mensaje del servidor")).toBeNull()
      expect(screen.queryByText("Not found")).toBeNull()
      expect(aviso.error).not.toHaveBeenCalled()
    },
    15_000,
  )

  it("ATQ-FORO-100: con la lista conservada, una recuperación que falla con un 403 SIN_ACCESO_A_LA_CLASE la reemplaza con su texto y no avisa; un 400 del cursor después de conservarla muestra la frase y no avisa", async () => {
    await montar([FORO_A])
    await conservadaEnA()
    foros[CLASE_A] = (foros[CLASE_A] ?? []).filter(({ id }) => id !== idForo(CLASE_A, 6))
    fireEvent.click(screen.getByRole("button", { name: "Ver más foros" }))
    expect(await screen.findByText(R_FOROS, undefined, ESPERA)).toBeInTheDocument()
    expect(aviso.error).toHaveBeenCalledTimes(1)
    cleanup()
    aviso.error.mockClear()
    foros[CLASE_A] = Array.from({ length: 25 }, (_, i) => foro(CLASE_A, 25 - i))
    await montar([FORO_A])
    await conservadaEnA()
    propia = (llamada) =>
      esForos(CLASE_A, llamada) && esPrimeraPagina(llamada)
        ? errorApi(403, "SIN_ACCESO_A_LA_CLASE")
        : undefined
    fireEvent.click(enLasSecciones("Foro"))
    const alerta = await screen.findByRole("alert", undefined, { timeout: 8000 })
    expect(alerta).toHaveTextContent(SIN_ACCESO)
    expect(screen.queryByRole("link", { name: nombreDeLaFila("Foro 20") })).toBeNull()
    await reposar(300)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  }, 30_000)
})
