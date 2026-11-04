// Tester, CLASES-03e, ronda 2. «Dudas» con el router real y el servidor doble de la ronda 1 (copiado: un
// archivo de pruebas no se importa desde otro). Ataca la corrección de T-01 y T-02 y lo que pidió la
// verificación del manager (revision.md, "## Verificación de la corrección de la ronda 1 — 03e"):
// - O-4: las respuestas que se veían mientras llega la lista tras borrar la duda (indicación 1).
// - O-5: "Ver más respuestas" mientras la duda se borra (indicación 2).
// - T-01 por teclado (indicación 3).
// - El hermano agregado: "Ver más respuestas" con DUDA_NO_ENCONTRADA (indicación 4).
// Ids CL3-4R2-nn (el prefijo no choca con ningún otro del repositorio).
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
const RUTA_DUDAS = `${API}/dudas`
const rutaRespuestas = (n: number) => `${API}/dudas/${idDuda(n)}/respuestas`
const claveDudas = ["clases", CLASE_ID, "dudas"] as const

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

interface Retenida {
  salio: () => boolean
  soltar: (respuesta: Response) => void
}

// Retiene la próxima petición que casa con `casa` hasta que la prueba la suelta; las demás siguen a la
// regla anterior (se pueden encadenar). `alSalir` corre al interceptarla: así un DELETE retenido ya
// quedó hecho en el servidor aunque su respuesta no haya llegado.
const retener = (
  estado: Estado,
  casa: (llamada: Llamada) => boolean,
  alSalir: () => void = () => undefined,
): Retenida => {
  const previa = estado.falla
  let soltar: ((respuesta: Response) => void) | null = null
  let salio = false
  estado.falla = (llamada) => {
    if (salio || !casa(llamada)) return previa(llamada)
    salio = true
    alSalir()
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
const esElBorradoDe =
  (n: number) =>
  ({ metodo, url }: Llamada) =>
    metodo === "DELETE" && url.pathname === `${RUTA_DUDAS}/${idDuda(n)}`

const borrarEnElServidor = (estado: Estado, n: number) => {
  estado.dudas = estado.dudas.filter(({ id }) => id !== idDuda(n))
  delete estado.respuestas[idDuda(n)]
}

const soltarCon = async (retenida: Retenida, respuestaFinal: Response) => {
  await act(async () => {
    retenida.soltar(respuestaFinal)
    await Promise.resolve()
  })
}

// Una lista de `cuantas` dudas (de la más reciente a la más antigua); la primera tiene una respuesta.
const muchasDudas = (cuantas: number) =>
  Array.from({ length: cuantas }, (_, i) => {
    const n = cuantas - i
    return duda(n, { respuestas: n === cuantas ? 1 : 0 })
  })

// Lo que debe seguir a la vista en la fila mientras llega la lista: la respuesta, sin "Cargando…" ni un
// estado vivo (role="status") ni un error (role="alert").
const sigueLoQueSeVeia = (fila: HTMLElement, textoDeLaRespuesta: string) => {
  expect(within(fila).queryByRole("status")?.textContent ?? null).toBeNull()
  expect(within(fila).queryByText(/Cargando/)).toBeNull()
  expect(within(fila).queryByRole("alert")?.textContent ?? null).toBeNull()
  expect(within(fila).getByText(textoDeLaRespuesta)).toBeInTheDocument()
}

const enLasSecciones = (nombre: string) =>
  within(screen.getByRole("list", { name: "Secciones de la clase" })).getByRole("link", {
    name: nombre,
  })

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

describe("CL3-4R2 · O-4: las respuestas que se veían mientras llega la lista (indicación 1)", () => {
  it("CL3-4R2-01: 21 dudas (con «Ver más dudas»), respuestas abiertas, «Sí, borrar duda» 204 y la lista retenida: en la fila sigue la respuesta, sin «Cargando…» ni role=status, y un solo aviso", async () => {
    const { estado } = crearServidor("maestro", muchasDudas(21))
    estado.respuestas[idDuda(21)] = [respuesta(1)]
    const cliente = clienteDePrueba()
    await abrirDudas("maestro", cliente)
    await screen.findByRole("button", { name: "Ver más dudas" }, ESPERA)
    const fila = await esperarFila("Duda 21")
    fireEvent.click(controlDe(fila))
    await within(fila).findByText("Respuesta 1", undefined, ESPERA)
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
    const lista = retener(estado, esLaLista)
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
    await waitFor(() => expect(lista.salio()).toBe(true), ESPERA)
    await reposar()
    expect(fila.isConnected).toBe(true)
    sigueLoQueSeVeia(fila, "Respuesta 1")
    expect(avisosDeExito()).toEqual(["Duda borrada"])
    expect(avisosDeError()).toEqual([])
    await soltarCon(
      lista,
      respuestaJson(200, { dudas: estado.dudas.slice(0, 20), siguienteCursor: idDuda(1) }),
    )
    await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
  })

  it("CL3-4R2-02: lo mismo con 404 DUDA_NO_ENCONTRADA al borrar: la respuesta sigue a la vista, sin «Cargando…» ni role=status, y un solo aviso «Esa duda ya no existe.»", async () => {
    const { estado } = crearServidor("maestro", muchasDudas(21))
    estado.respuestas[idDuda(21)] = [respuesta(1)]
    const cliente = clienteDePrueba()
    await abrirDudas("maestro", cliente)
    await screen.findByRole("button", { name: "Ver más dudas" }, ESPERA)
    const fila = await esperarFila("Duda 21")
    fireEvent.click(controlDe(fila))
    await within(fila).findByText("Respuesta 1", undefined, ESPERA)
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
    borrarEnElServidor(estado, 21)
    const lista = retener(estado, esLaLista)
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
    await waitFor(() => expect(lista.salio()).toBe(true), ESPERA)
    await reposar()
    expect(fila.isConnected).toBe(true)
    sigueLoQueSeVeia(fila, "Respuesta 1")
    expect(avisosDeError()).toEqual([YA_NO_EXISTE])
    expect(avisosDeExito()).toEqual([])
    await soltarCon(lista, respuestaJson(200, { dudas: estado.dudas, siguienteCursor: null }))
    await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
  })

  it("CL3-4R2-03: una sola página y la persona pulsa «Dudas» mientras llega la lista (la vista se vuelve a pintar): la respuesta sigue a la vista, sin «Cargando…» ni role=status", async () => {
    const { estado } = crearServidor("maestro", [duda(2, { respuestas: 1 }), duda(1)])
    estado.respuestas[idDuda(2)] = [respuesta(1)]
    const cliente = clienteDePrueba()
    await abrirDudas("maestro", cliente)
    const fila = await esperarFila("Duda 2")
    expect(screen.queryByRole("button", { name: "Ver más dudas" })).toBeNull()
    fireEvent.click(controlDe(fila))
    await within(fila).findByText("Respuesta 1", undefined, ESPERA)
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
    const lista = retener(estado, esLaLista)
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
    await waitFor(() => expect(lista.salio()).toBe(true), ESPERA)
    fireEvent.click(enLasSecciones("Dudas"))
    await reposar()
    expect(fila.isConnected).toBe(true)
    sigueLoQueSeVeia(fila, "Respuesta 1")
    expect(avisosDeExito()).toEqual(["Duda borrada"])
    await soltarCon(lista, respuestaJson(200, { dudas: estado.dudas, siguienteCursor: null }))
    await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
  })
})

describe("CL3-4R2 · O-5: «Ver más respuestas» mientras la duda se borra (indicación 2)", () => {
  it("CL3-4R2-04: con el DELETE de la duda retenido (ya hecho en el servidor), «Ver más respuestas» y después 204 con la lista retenida: un solo mensaje y ningún MensajeError en la fila", async () => {
    const { estado, fetchMock } = crearServidor("maestro", [duda(2, { respuestas: 25 }), duda(1)])
    estado.respuestas[idDuda(2)] = Array.from({ length: 25 }, (_, i) => respuesta(i + 1))
    const cliente = clienteDePrueba()
    await abrirDudas("maestro", cliente)
    const fila = await esperarFila("Duda 2")
    fireEvent.click(controlDe(fila))
    const verMas = await within(fila).findByRole("button", { name: "Ver más respuestas" }, ESPERA)
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
    const borrado = retener(estado, esElBorradoDe(2), () => {
      borrarEnElServidor(estado, 2)
    })
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
    await waitFor(() => expect(borrado.salio()).toBe(true), ESPERA)
    const lista = retener(estado, esLaLista)
    const pedidasAntes = llamadasDe(fetchMock, "GET", rutaRespuestas(2)).length
    fireEvent.click(verMas)
    await reposar()
    const pidio = llamadasDe(fetchMock, "GET", rutaRespuestas(2)).length > pedidasAntes
    expect(
      { pidio, alerta: within(fila).queryByRole("alert")?.textContent ?? null },
      "«Ver más respuestas» pidió la página de una duda que se está borrando",
    ).toEqual({ pidio: false, alerta: null })
    await soltarCon(borrado, new Response(null, { status: 204 }))
    await reposar()
    expect(avisosDeExito()).toEqual(["Duda borrada"])
    expect(avisosDeError()).toEqual([])
    expect(
      fila.isConnected ? (within(fila).queryByRole("alert")?.textContent ?? null) : null,
    ).toBeNull()
    if (lista.salio()) {
      await soltarCon(lista, respuestaJson(200, { dudas: estado.dudas, siguienteCursor: null }))
    }
    await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
  })
})

describe("CL3-4R2 · T-01 por teclado (indicación 3)", () => {
  it("CL3-4R2-05: Tab del control a «Marcar como resuelta» y Shift+Tab de vuelta; una recarga baja el conteo a 0: el foco va a la fila", async () => {
    const { estado } = crearServidor("admin", [duda(1, { respuestas: 1 })])
    const cliente = clienteDePrueba()
    await abrirDudas("admin", cliente)
    const fila = await esperarFila("Duda 1")
    const control = controlDe(fila)
    act(() => control.focus())
    act(() => within(fila).getByRole("button", { name: "Marcar como resuelta" }).focus())
    act(() => control.focus())
    await reposar(30)
    laDuda(estado, 1).respuestas = 0
    await act(() => cliente.invalidateQueries({ queryKey: claveDudas, exact: true }))
    await waitFor(() => expect(controlEn(fila)).toBeNull(), ESPERA)
    await reposar(30)
    expect(fila).toHaveFocus()
  })

  it("CL3-4R2-06: Tab del control fuera de la lista (a «Ver más dudas»); una recarga baja el conteo a 0: el foco se queda en «Ver más dudas»", async () => {
    const { estado } = crearServidor("admin", muchasDudas(21))
    const cliente = clienteDePrueba()
    await abrirDudas("admin", cliente)
    const verMas = await screen.findByRole("button", { name: "Ver más dudas" }, ESPERA)
    const fila = await esperarFila("Duda 21")
    act(() => controlDe(fila).focus())
    act(() => verMas.focus())
    await reposar(30)
    laDuda(estado, 21).respuestas = 0
    await act(() => cliente.invalidateQueries({ queryKey: claveDudas, exact: true }))
    await waitFor(() => expect(controlEn(fila)).toBeNull(), ESPERA)
    await reposar(30)
    expect(verMas).toHaveFocus()
  })

  it("CL3-4R2-07: dos dudas bajan a 0 en la misma recarga con el foco en el control de una: el foco va solo a esa fila", async () => {
    const { estado } = crearServidor("admin", [
      duda(2, { respuestas: 1 }),
      duda(1, { respuestas: 1 }),
    ])
    const cliente = clienteDePrueba()
    await abrirDudas("admin", cliente)
    const fila2 = await esperarFila("Duda 2")
    const fila1 = filaDe("Duda 1")
    act(() => controlDe(fila1).focus())
    laDuda(estado, 1).respuestas = 0
    laDuda(estado, 2).respuestas = 0
    await act(() => cliente.invalidateQueries({ queryKey: claveDudas, exact: true }))
    await waitFor(() => {
      expect(controlEn(fila1)).toBeNull()
      expect(controlEn(fila2)).toBeNull()
    }, ESPERA)
    await reposar(30)
    expect(fila1).toHaveFocus()
    expect(fila2).not.toHaveFocus()
  })
})

const prepararVerMasDeUnaDudaBorrada = async () => {
  const servidor = crearServidor("maestro", [duda(2, { respuestas: 25 }), duda(1)])
  servidor.estado.respuestas[idDuda(2)] = Array.from({ length: 25 }, (_, i) => respuesta(i + 1))
  const cliente = clienteDePrueba()
  await abrirDudas("maestro", cliente)
  const fila = await esperarFila("Duda 2")
  fireEvent.click(controlDe(fila))
  const verMas = await within(fila).findByRole("button", { name: "Ver más respuestas" }, ESPERA)
  act(() => verMas.focus())
  borrarEnElServidor(servidor.estado, 2)
  const lista = retener(servidor.estado, esLaLista)
  fireEvent.click(verMas)
  expect(await within(fila).findByRole("alert", undefined, ESPERA)).toHaveTextContent(YA_NO_EXISTE)
  await waitFor(() => expect(lista.salio()).toBe(true), ESPERA)
  await reposar()
  return { ...servidor, fila, lista }
}

describe("CL3-4R2 · el hermano agregado: «Ver más respuestas» con DUDA_NO_ENCONTRADA (indicación 4)", () => {
  it("CL3-4R2-08: con el foco en «Ver más respuestas» y 404 DUDA_NO_ENCONTRADA: el foco va al h3, un solo mensaje y ningún aviso; cuando la fila sale, el foco va a la vecina, nunca a <body>", async () => {
    const { estado, fila, lista } = await prepararVerMasDeUnaDudaBorrada()
    expect(within(fila).getByRole("heading", { level: 3, name: "Respuestas" })).toHaveFocus()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(avisosDeError()).toEqual([])
    await soltarCon(lista, respuestaJson(200, { dudas: estado.dudas, siguienteCursor: null }))
    await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
    await reposar(30)
    expect(document.activeElement).not.toBe(document.body)
    expect(filaDe("Duda 1").contains(document.activeElement)).toBe(true)
    expect(screen.queryAllByRole("alert")).toHaveLength(0)
    expect(avisosDeError()).toEqual([])
  })

  it("CL3-4R2-09: lo mismo, pero la recarga de la lista que dispara responde 500: un solo MensajeError (el de la lista), ningún aviso y el foco al h2", async () => {
    const { fila, lista } = await prepararVerMasDeUnaDudaBorrada()
    await soltarCon(lista, errorJson(500, "ERROR_INTERNO", "x"))
    await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
    await reposar(30)
    const alertas = screen.getAllByRole("alert")
    expect(alertas).toHaveLength(1)
    expect(alertas[0]).toHaveTextContent(GENERICO)
    expect(avisosDeError()).toEqual([])
    expect(encabezadoDudas()).toHaveFocus()
  })
})
