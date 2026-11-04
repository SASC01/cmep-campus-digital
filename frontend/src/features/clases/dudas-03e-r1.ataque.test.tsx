// Tester, CLASES-03e, ronda 1. «Dudas» con el router real y un servidor doble (el de dudas-03e.test.tsx,
// copiado: un archivo de pruebas no se importa desde otro). Ataca lo que pidió la verificación del
// manager (revision.md, "## Verificación del resumen del programador — 03e"):
// - O-3: la marca de S-14 de ElementoDeDuda tras un clic en blanco (indicación 2).
// - O-1 y O-2: la matriz tal como la describe el código (indicación 3).
// - La recarga de la lista con 5xx y un bloque de respuestas abierto con texto escrito (indicación 4).
// - Los puntos de ataque de 03e del plan (indicación 5).
// Ids CL3-4R1-nn (el prefijo no choca con ningún otro del repositorio).
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

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
const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const CREADO_EN = "2026-10-01T15:30:00.000Z"
const YA_NO_EXISTE = "Esa duda ya no existe."

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
  dudas: DudaDoble[]
  respuestas: Record<string, RespuestaDoble[]>
  falla: (llamada: Llamada) => Response | Promise<Response> | null
  inesperadas: string[]
}

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
const noEncontrada = () => errorJson(404, "DUDA_NO_ENCONTRADA", YA_NO_EXISTE)

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
    .map(([entrada]) => new URL(String(entrada), "http://x"))
    .filter((url) => url.pathname === pathname)

const montar = async (entradas: string[], cliente: QueryClient) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: entradas })
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router }
}

const clienteDePrueba = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } },
  })

const reposar = (ms = 150) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))
const avisosDeError = () => aviso.error.mock.calls.map((llamada) => String(llamada[0]))
const avisosDeExito = () => aviso.success.mock.calls.map((llamada) => String(llamada[0]))

const DUDAS = (rol: Rol) => `${BASES[rol]}/${CLASE_ID}/dudas`
const AVISOS = (rol: Rol) => `${BASES[rol]}/${CLASE_ID}`
const RUTA_DUDAS = `${API}/dudas`
const rutaRespuestas = (n: number) => `${API}/dudas/${idDuda(n)}/respuestas`
const claveDudas = ["clases", CLASE_ID, "dudas"] as const
const claveRespuestas = (n: number) => ["clases", CLASE_ID, "respuestas", idDuda(n)] as const

const abrirDudas = async (rol: Rol, cliente: QueryClient) => {
  const montaje = await montar([DUDAS(rol)], cliente)
  await screen.findByRole("heading", { level: 2, name: "Dudas" }, ESPERA)
  return montaje
}

const filaDe = (texto: string) => {
  const fila = screen.getByText(texto, { selector: "p" }).closest<HTMLElement>("li")
  if (fila === null) throw new Error(`Precondición: la fila «${texto}»`)
  return fila
}

const esperarFila = async (texto: string) => {
  await screen.findByText(texto, { selector: "p" }, ESPERA)
  return filaDe(texto)
}

// El control que despliega las respuestas: el único botón de la fila con aria-expanded.
const controlEn = (fila: HTMLElement) =>
  within(fila)
    .queryAllByRole("button")
    .find((boton) => boton.hasAttribute("aria-expanded")) ?? null
const controlDe = (fila: HTMLElement) => {
  const control = controlEn(fila)
  if (control === null) throw new Error("Precondición: el control de las respuestas")
  return control
}

const encabezadoDudas = () => screen.getByRole("heading", { level: 2, name: "Dudas" })
const laDuda = (estado: Estado, n: number) => {
  const encontrada = estado.dudas.find(({ id }) => id === idDuda(n))
  if (encontrada === undefined) throw new Error(`Precondición: la duda ${String(n)}`)
  return encontrada
}

// Retiene la próxima petición que casa con `casa` (con las demás, el servidor de siempre) hasta que la
// prueba la suelta con su respuesta.
const retener = (estado: Estado, casa: (llamada: Llamada) => boolean) => {
  let soltar: ((respuesta: Response) => void) | null = null
  let salio = false
  estado.falla = (llamada) => {
    if (salio || !casa(llamada)) return null
    salio = true
    return new Promise<Response>((resolver) => {
      soltar = resolver
    })
  }
  return {
    salio: () => salio,
    soltar: (respuestaFinal: Response) => {
      if (soltar === null) throw new Error("Precondición: la petición retenida no salió")
      soltar(respuestaFinal)
    },
  }
}

const esLaLista = ({ metodo, url }: Llamada) => metodo === "GET" && url.pathname === RUTA_DUDAS

// "Clic en blanco": el foco sale del control a ningún elemento (relatedTarget null) y la ventana conserva
// el foco, como en un navegador. jsdom responde document.hasFocus() con false cuando ningún elemento
// tiene el foco; en el navegador, con la ventana activa, es true.
const clicEnBlanco = (control: HTMLElement) => {
  vi.spyOn(document, "hasFocus").mockReturnValue(true)
  act(() => control.blur())
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
  vi.restoreAllMocks()
})

describe("CL3-4R1 · O-3: la marca de S-14 tras un clic en blanco (indicación 2)", () => {
  it("CL3-4R1-01: el admin deja el control plegado con un clic en blanco y una recarga baja el conteo a 0: el foco no va a la fila", async () => {
    const { estado } = crearServidor("admin", [duda(1, { respuestas: 1 })])
    const cliente = clienteDePrueba()
    await abrirDudas("admin", cliente)
    const fila = await esperarFila("Duda 1")
    const control = controlDe(fila)
    act(() => control.focus())
    clicEnBlanco(control)
    await reposar(30)
    expect(document.activeElement).toBe(document.body)
    laDuda(estado, 1).respuestas = 0
    await act(() => cliente.invalidateQueries({ queryKey: claveDudas, exact: true }))
    await waitFor(() => expect(controlEn(fila)).toBeNull(), ESPERA)
    await reposar(30)
    expect(fila).not.toHaveFocus()
    expect(document.activeElement).toBe(document.body)
  })

  it("CL3-4R1-02: el admin despliega, pliega con el ratón, hace clic en blanco y una recarga baja el conteo a 0: el foco no va a la fila", async () => {
    const { estado } = crearServidor("admin", [duda(1, { respuestas: 1 })])
    estado.respuestas[idDuda(1)] = [respuesta(1)]
    const cliente = clienteDePrueba()
    await abrirDudas("admin", cliente)
    const fila = await esperarFila("Duda 1")
    const control = controlDe(fila)
    act(() => control.focus())
    fireEvent.click(control)
    await within(fila).findByText("Respuesta 1", undefined, ESPERA)
    fireEvent.click(control)
    expect(control).toHaveTextContent("Ver respuestas (1)")
    expect(control).toHaveFocus()
    clicEnBlanco(control)
    await reposar(30)
    laDuda(estado, 1).respuestas = 0
    estado.respuestas[idDuda(1)] = []
    await act(() => cliente.invalidateQueries({ queryKey: claveDudas, exact: true }))
    await waitFor(() => expect(controlEn(fila)).toBeNull(), ESPERA)
    await reposar(30)
    expect(fila).not.toHaveFocus()
    expect(document.activeElement).toBe(document.body)
  })

  it("CL3-4R1-03 (control): el foco pasa del control a «Marcar como resuelta» y una recarga quita el control: el foco se queda en «Marcar como resuelta»", async () => {
    const { estado } = crearServidor("admin", [duda(1, { respuestas: 1 })])
    const cliente = clienteDePrueba()
    await abrirDudas("admin", cliente)
    const fila = await esperarFila("Duda 1")
    act(() => controlDe(fila).focus())
    const marcar = within(fila).getByRole("button", { name: "Marcar como resuelta" })
    act(() => marcar.focus())
    laDuda(estado, 1).respuestas = 0
    await act(() => cliente.invalidateQueries({ queryKey: claveDudas, exact: true }))
    await waitFor(() => expect(controlEn(fila)).toBeNull(), ESPERA)
    await reposar(30)
    expect(marcar).toHaveFocus()
  })
})

describe("CL3-4R1 · puntos de ataque de 03e (indicación 5)", () => {
  it("CL3-4R1-04: con el foco en «Marcar como resuelta», una recarga de fondo quita `puedeMarcar`: el botón desaparece, el foco va a la fila y no hay avisos", async () => {
    const { estado } = crearServidor("maestro", [duda(2), duda(1)])
    const cliente = clienteDePrueba()
    await abrirDudas("maestro", cliente)
    const fila = await esperarFila("Duda 1")
    act(() => within(fila).getByRole("button", { name: "Marcar como resuelta" }).focus())
    laDuda(estado, 1).puedeMarcar = false
    await act(() => cliente.invalidateQueries({ queryKey: claveDudas, exact: true }))
    await waitFor(() =>
      expect(within(fila).queryByRole("button", { name: "Marcar como resuelta" })).toBeNull(),
    )
    await reposar(30)
    expect(fila).toHaveFocus()
    expect(avisosDeError()).toEqual([])
    expect(avisosDeExito()).toEqual([])
  })

  it("CL3-4R1-05: con el PUT de marcar en vuelo, una recarga quita `puedeMarcar`; al responder 200, un solo aviso de éxito y el foco no cae en <body>", async () => {
    const { estado } = crearServidor("maestro", [duda(2), duda(1)])
    const cliente = clienteDePrueba()
    await abrirDudas("maestro", cliente)
    const fila = await esperarFila("Duda 1")
    const marcar = within(fila).getByRole("button", { name: "Marcar como resuelta" })
    act(() => marcar.focus())
    const put = retener(estado, ({ metodo }) => metodo === "PUT")
    fireEvent.click(marcar)
    await waitFor(() => expect(put.salio()).toBe(true))
    laDuda(estado, 1).puedeMarcar = false
    await act(() => cliente.invalidateQueries({ queryKey: claveDudas, exact: true }))
    await waitFor(() => expect(within(fila).queryByRole("button", { name: /resuelta/ })).toBeNull())
    await act(async () => {
      put.soltar(respuestaJson(200, { duda: { ...laDuda(estado, 1), resuelta: true } }))
      await Promise.resolve()
    })
    await waitFor(() => expect(avisosDeExito()).toEqual(["Marcada como resuelta"]))
    await reposar()
    expect(avisosDeError()).toEqual([])
    expect(document.activeElement).not.toBe(document.body)
  })

  it("CL3-4R1-06: borrar una duda con sus respuestas abiertas: mientras llega la lista no se piden sus respuestas ni sale un error en la fila; después, la fila sale, un aviso y el foco al h2", async () => {
    const { estado, fetchMock } = crearServidor("maestro", [duda(1, { respuestas: 1 })])
    estado.respuestas[idDuda(1)] = [respuesta(1)]
    const cliente = clienteDePrueba()
    await abrirDudas("maestro", cliente)
    const fila = await esperarFila("Duda 1")
    fireEvent.click(controlDe(fila))
    await within(fila).findByText("Respuesta 1", undefined, ESPERA)
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
    const pedidasAntes = llamadasDe(fetchMock, "GET", rutaRespuestas(1)).length
    const lista = retener(estado, esLaLista)
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
    await waitFor(() => expect(lista.salio()).toBe(true), ESPERA)
    await reposar()
    expect(fila.isConnected).toBe(true)
    expect(within(fila).queryByRole("alert")?.textContent ?? null).toBeNull()
    expect(llamadasDe(fetchMock, "GET", rutaRespuestas(1))).toHaveLength(pedidasAntes)
    await act(async () => {
      lista.soltar(respuestaJson(200, { dudas: [], siguienteCursor: null }))
      await Promise.resolve()
    })
    await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
    await reposar()
    expect(avisosDeExito()).toEqual(["Duda borrada"])
    expect(avisosDeError()).toEqual([])
    expect(encabezadoDudas()).toHaveFocus()
    expect(llamadasDe(fetchMock, "GET", rutaRespuestas(1))).toHaveLength(pedidasAntes)
    expect(cliente.getQueryData(claveRespuestas(1))).toBeUndefined()
  })

  it("CL3-4R1-07: borrar una duda que otra persona ya borró, con sus respuestas abiertas: un solo aviso «Esa duda ya no existe.» y ningún error en la fila mientras llega la lista", async () => {
    const { estado, fetchMock } = crearServidor("maestro", [duda(1, { respuestas: 1 })])
    estado.respuestas[idDuda(1)] = [respuesta(1)]
    const cliente = clienteDePrueba()
    await abrirDudas("maestro", cliente)
    const fila = await esperarFila("Duda 1")
    fireEvent.click(controlDe(fila))
    await within(fila).findByText("Respuesta 1", undefined, ESPERA)
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
    estado.dudas = []
    delete estado.respuestas[idDuda(1)]
    const pedidasAntes = llamadasDe(fetchMock, "GET", rutaRespuestas(1)).length
    const lista = retener(estado, esLaLista)
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
    await waitFor(() => expect(lista.salio()).toBe(true), ESPERA)
    await reposar()
    expect(avisosDeError()).toEqual([YA_NO_EXISTE])
    expect(within(fila).queryByRole("alert")?.textContent ?? null).toBeNull()
    expect(llamadasDe(fetchMock, "GET", rutaRespuestas(1))).toHaveLength(pedidasAntes)
    await act(async () => {
      lista.soltar(respuestaJson(200, { dudas: [], siguienteCursor: null }))
      await Promise.resolve()
    })
    await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
    expect(avisosDeError()).toEqual([YA_NO_EXISTE])
  })

  it("CL3-4R1-08: responder a una duda que otra persona borró: un solo aviso «Esa duda ya no existe.» y ningún MensajeError en la fila antes de que la fila desaparezca", async () => {
    const { estado } = crearServidor("estudiante", [duda(1)])
    const cliente = clienteDePrueba()
    await abrirDudas("estudiante", cliente)
    const fila = await esperarFila("Duda 1")
    fireEvent.click(controlDe(fila))
    const campo = await within(fila).findByLabelText("Escribe una respuesta", undefined, ESPERA)
    await reposar()
    estado.dudas = []
    delete estado.respuestas[idDuda(1)]
    const lista = retener(estado, esLaLista)
    fireEvent.change(campo, { target: { value: "Mi respuesta" } })
    fireEvent.click(within(fila).getByRole("button", { name: "Responder" }))
    await waitFor(() => expect(avisosDeError()).toEqual([YA_NO_EXISTE]), ESPERA)
    await waitFor(() => expect(lista.salio()).toBe(true), ESPERA)
    await reposar()
    // La lista todavía no llega: la fila sigue a la vista.
    expect(fila.isConnected).toBe(true)
    expect(within(fila).queryByRole("alert")?.textContent ?? null).toBeNull()
    expect(within(fila).queryByText(YA_NO_EXISTE)).toBeNull()
    await act(async () => {
      lista.soltar(respuestaJson(200, { dudas: [], siguienteCursor: null }))
      await Promise.resolve()
    })
    await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
    expect(avisosDeError()).toEqual([YA_NO_EXISTE])
  })

  it("CL3-4R1-09: borrar una respuesta de una duda que otra persona borró: un solo aviso «Esa duda ya no existe.» y ningún MensajeError en la fila antes de que la fila desaparezca", async () => {
    const { estado } = crearServidor("maestro", [duda(1, { respuestas: 1 })])
    estado.respuestas[idDuda(1)] = [respuesta(1)]
    const cliente = clienteDePrueba()
    await abrirDudas("maestro", cliente)
    const fila = await esperarFila("Duda 1")
    fireEvent.click(controlDe(fila))
    await within(fila).findByText("Respuesta 1", undefined, ESPERA)
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar" }))
    estado.dudas = []
    delete estado.respuestas[idDuda(1)]
    const lista = retener(estado, esLaLista)
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar respuesta" }))
    await waitFor(() => expect(avisosDeError()).toEqual([YA_NO_EXISTE]), ESPERA)
    await waitFor(() => expect(lista.salio()).toBe(true), ESPERA)
    await reposar()
    expect(fila.isConnected).toBe(true)
    expect(within(fila).queryByRole("alert")?.textContent ?? null).toBeNull()
    expect(within(fila).queryByText(YA_NO_EXISTE)).toBeNull()
    await act(async () => {
      lista.soltar(respuestaJson(200, { dudas: [], siguienteCursor: null }))
      await Promise.resolve()
    })
    await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
    expect(avisosDeError()).toEqual([YA_NO_EXISTE])
  })

  it("CL3-4R1-10 (control): marcar una duda que otra persona borró, con sus respuestas abiertas: un solo aviso, sin pedir sus respuestas y sin error en la fila mientras llega la lista", async () => {
    const { estado, fetchMock } = crearServidor("maestro", [duda(1, { respuestas: 1 })])
    estado.respuestas[idDuda(1)] = [respuesta(1)]
    const cliente = clienteDePrueba()
    await abrirDudas("maestro", cliente)
    const fila = await esperarFila("Duda 1")
    fireEvent.click(controlDe(fila))
    await within(fila).findByText("Respuesta 1", undefined, ESPERA)
    estado.dudas = []
    const pedidasAntes = llamadasDe(fetchMock, "GET", rutaRespuestas(1)).length
    const lista = retener(estado, esLaLista)
    const marcar = within(fila).getByRole("button", { name: "Marcar como resuelta" })
    act(() => marcar.focus())
    fireEvent.click(marcar)
    await waitFor(() => expect(lista.salio()).toBe(true), ESPERA)
    await reposar()
    expect(avisosDeError()).toEqual([YA_NO_EXISTE])
    expect(within(fila).queryByRole("alert")?.textContent ?? null).toBeNull()
    expect(llamadasDe(fetchMock, "GET", rutaRespuestas(1))).toHaveLength(pedidasAntes)
    await act(async () => {
      lista.soltar(respuestaJson(200, { dudas: [], siguienteCursor: null }))
      await Promise.resolve()
    })
    await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
    expect(encabezadoDudas()).toHaveFocus()
  })

  it("CL3-4R1-11: de 0 a 1 respuestas por otra persona con el bloque abierto (estudiante): el mismo control sigue en «Ocultar respuestas», un solo «Responder» en la duda y, al plegar, «Ver respuestas (1)»", async () => {
    const { estado } = crearServidor("estudiante", [duda(1)])
    const cliente = clienteDePrueba()
    await abrirDudas("estudiante", cliente)
    const fila = await esperarFila("Duda 1")
    const control = controlDe(fila)
    expect(control).toHaveTextContent("Responder")
    fireEvent.click(control)
    await within(fila).findByLabelText("Escribe una respuesta", undefined, ESPERA)
    estado.respuestas[idDuda(1)] = [respuesta(1)]
    laDuda(estado, 1).respuestas = 1
    await act(() =>
      Promise.all([
        cliente.invalidateQueries({ queryKey: claveDudas, exact: true }),
        cliente.invalidateQueries({ queryKey: claveRespuestas(1) }),
      ]),
    )
    await within(fila).findByText("Respuesta 1", undefined, ESPERA)
    expect(controlDe(fila)).toBe(control)
    expect(control).toHaveTextContent("Ocultar respuestas")
    expect(control).toHaveAttribute("aria-expanded", "true")
    expect(within(fila).getAllByRole("button", { name: "Responder" })).toHaveLength(1)
    fireEvent.click(control)
    expect(controlDe(fila)).toBe(control)
    expect(control).toHaveTextContent("Ver respuestas (1)")
    expect(within(fila).queryAllByRole("button", { name: "Responder" })).toHaveLength(0)
  })

  it("CL3-4R1-12: doble clic en «Responder» (el control, con 0 respuestas) despliega y pliega sin ningún POST", async () => {
    const { fetchMock } = crearServidor("maestro", [duda(1)])
    const cliente = clienteDePrueba()
    await abrirDudas("maestro", cliente)
    const fila = await esperarFila("Duda 1")
    const control = controlDe(fila)
    fireEvent.click(control)
    fireEvent.click(control)
    await reposar()
    expect(control).toHaveTextContent("Responder")
    expect(control).toHaveAttribute("aria-expanded", "false")
    expect(within(fila).queryByLabelText("Escribe una respuesta")).toBeNull()
    expect(llamadasDe(fetchMock, "POST", rutaRespuestas(1))).toHaveLength(0)
  })
})

describe("CL3-4R1 · la matriz como la describe el código (indicaciones 3 y 4)", () => {
  it("CL3-4R1-13 (O-1): «Publicar duda» con 400 de «texto»: el error bajo el campo, sin aviso, y el foco se queda en el botón, que sale de la espera", async () => {
    const { estado } = crearServidor("estudiante", [duda(1)])
    estado.falla = ({ metodo, url }) =>
      metodo === "POST" && url.pathname === RUTA_DUDAS
        ? errorJson(400, "VALIDACION", "texto: Es demasiado largo.")
        : null
    await abrirDudas("estudiante", clienteDePrueba())
    const campo = screen.getByLabelText("Escribe tu duda")
    fireEvent.change(campo, { target: { value: "Una duda" } })
    const boton = screen.getByRole("button", { name: "Publicar duda" })
    act(() => boton.focus())
    fireEvent.click(boton)
    await waitFor(() => expect(campo).toHaveAttribute("aria-invalid", "true"), ESPERA)
    const idError = campo.getAttribute("aria-describedby")
    expect(idError).not.toBeNull()
    expect(document.getElementById(idError ?? "")).toHaveTextContent("Es demasiado largo.")
    await reposar()
    expect(boton).toHaveFocus()
    expect(boton).not.toHaveAttribute("aria-busy", "true")
    expect(campo).toHaveValue("Una duda")
    expect(avisosDeError()).toEqual([])
  })

  it("CL3-4R1-14 (O-1): «Responder» con 400 de «texto»: el error bajo el campo, sin aviso, y el foco se queda en el botón", async () => {
    const { estado } = crearServidor("estudiante", [duda(1, { respuestas: 1 })])
    estado.respuestas[idDuda(1)] = [respuesta(1)]
    estado.falla = ({ metodo, url }) =>
      metodo === "POST" && url.pathname === rutaRespuestas(1)
        ? errorJson(400, "VALIDACION", "texto: Es demasiado largo.")
        : null
    await abrirDudas("estudiante", clienteDePrueba())
    const fila = await esperarFila("Duda 1")
    fireEvent.click(controlDe(fila))
    const campo = await within(fila).findByLabelText("Escribe una respuesta", undefined, ESPERA)
    fireEvent.change(campo, { target: { value: "Mi respuesta" } })
    const boton = within(fila).getByRole("button", { name: "Responder" })
    act(() => boton.focus())
    fireEvent.click(boton)
    await waitFor(() => expect(campo).toHaveAttribute("aria-invalid", "true"), ESPERA)
    await reposar()
    expect(boton).toHaveFocus()
    expect(boton).not.toHaveAttribute("aria-busy", "true")
    expect(campo).toHaveValue("Mi respuesta")
    expect(avisosDeError()).toEqual([])
  })

  it("CL3-4R1-15 (O-2): entrar a «Dudas» desde «Avisos» con la primera carga en 500: el MensajeError, sin aviso, y el foco se queda en el enlace «Dudas»", async () => {
    const { estado } = crearServidor("maestro", [duda(1)])
    estado.falla = (llamada) => (esLaLista(llamada) ? errorJson(500, "ERROR_INTERNO", "x") : null)
    await montar([AVISOS("maestro")], clienteDePrueba())
    const secciones = await screen.findByRole("list", { name: "Secciones de la clase" }, ESPERA)
    const enlace = within(secciones).getByRole("link", { name: "Dudas" })
    act(() => enlace.focus())
    fireEvent.click(enlace)
    expect(await screen.findByText(GENERICO, undefined, ESPERA)).toBeInTheDocument()
    await reposar()
    expect(within(secciones).getByRole("link", { name: "Dudas" })).toHaveFocus()
    expect(avisosDeError()).toEqual([])
  })

  it("CL3-4R1-16 (indicación 4): marcar otra duda con un bloque abierto y texto escrito, y la recarga de la lista responde 500: un solo aviso (el de éxito), el MensajeError y el foco al h2, nunca a <body>", async () => {
    const { estado } = crearServidor("maestro", [duda(2, { respuestas: 1 }), duda(1)])
    estado.respuestas[idDuda(2)] = [respuesta(1)]
    await abrirDudas("maestro", clienteDePrueba())
    const abierta = await esperarFila("Duda 2")
    fireEvent.click(controlDe(abierta))
    const campo = await within(abierta).findByLabelText("Escribe una respuesta", undefined, ESPERA)
    fireEvent.change(campo, { target: { value: "Borrador sin enviar" } })
    const marcar = within(filaDe("Duda 1")).getByRole("button", { name: "Marcar como resuelta" })
    act(() => marcar.focus())
    estado.falla = (llamada) => (esLaLista(llamada) ? errorJson(500, "ERROR_INTERNO", "x") : null)
    fireEvent.click(marcar)
    expect(await screen.findByText(GENERICO, undefined, ESPERA)).toBeInTheDocument()
    await reposar()
    expect(avisosDeExito()).toEqual(["Marcada como resuelta"])
    expect(avisosDeError()).toEqual([])
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(encabezadoDudas()).toHaveFocus()
  })
})
