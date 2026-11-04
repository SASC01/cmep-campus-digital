// Tester, CLASES-03e, ronda 3 (la última antes de escalar). «Dudas» con el router real y el servidor doble
// de las rondas 1 y 2 (copiado: un archivo de pruebas no se importa desde otro). Ataca el mecanismo "una
// duda que se está borrando o ya no existe, con su bloque de respuestas" tras la corrección de T-03, T-04
// y M-01, con las indicaciones de revision.md, "## Verificación de la corrección de M-01 de la ronda 2 —
// 03e": M-01 (a) con dos páginas, M-01 (b) con R5, O-7, la suscripción de
// quitarRespuestasAlCerrarseSuBloque y un solo mensaje por acción.
// Ids CL3-4R3-nn (el prefijo no choca con ningún otro del repositorio).
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

const claveRespuestas = (n: number) => ["clases", CLASE_ID, "respuestas", idDuda(n)] as const
const R5 = "Las respuestas cambiaron mientras las veías. Vuelve a abrirlas para verlas completas."
const OCUPADO = "El servidor está ocupado. Inténtalo de nuevo en unos segundos."

type Borrado = "204" | "404"
const BORRADOS = ["204", "404"] as const

// Lo vivo dentro de la fila: estados (role="status"), alertas (role="alert") y «Cargando…».
const loVivoEn = (fila: HTMLElement) => [
  ...within(fila)
    .queryAllByRole("status")
    .map((e) => `status: ${e.textContent ?? ""}`),
  ...within(fila)
    .queryAllByRole("alert")
    .map((e) => `alert: ${e.textContent ?? ""}`),
  ...within(fila)
    .queryAllByText(/Cargando/)
    .map((e) => `texto: ${e.textContent ?? ""}`),
]

const avisos = () => [...avisosDeExito(), ...avisosDeError()]
const avisoDelBorrado = (borrado: Borrado) =>
  borrado === "204" ? ["Duda borrada"] : [YA_NO_EXISTE]

const consultasDeRespuestas = (cliente: QueryClient, n: number) =>
  cliente.getQueryCache().findAll({ queryKey: claveRespuestas(n), exact: true }).length

// Lo que queda en la caché de las respuestas de la duda `n`: para que el fallo diga qué quedó.
const restosDeRespuestas = (cliente: QueryClient, n: number) =>
  cliente
    .getQueryCache()
    .findAll({ queryKey: claveRespuestas(n), exact: true })
    .map((consulta) => ({
      conDatos: consulta.state.data !== undefined,
      estado: consulta.state.status,
      observadores: consulta.getObserversCount(),
    }))

const getsDeRespuestas = (fetchMock: FetchMock, n: number) =>
  llamadasDe(fetchMock, "GET", rutaRespuestas(n)).length

// Pide el borrado de la duda `n`: con 204, el servidor la borra al recibir el DELETE; con 404, ya la
// había borrado otra persona. Retiene la lista que sigue.
const borrarConLaListaRetenida = async (
  estado: Estado,
  fila: HTMLElement,
  n: number,
  borrado: Borrado,
) => {
  fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
  if (borrado === "404") borrarEnElServidor(estado, n)
  const lista = retener(estado, esLaLista)
  fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
  await waitFor(() => expect(lista.salio()).toBe(true), ESPERA)
  return lista
}

const soltarLaLista = async (estado: Estado, lista: Retenida, fila: HTMLElement) => {
  await soltarCon(
    lista,
    respuestaJson(200, {
      dudas: estado.dudas.slice(0, 20),
      siguienteCursor: estado.dudas.length > 20 ? (estado.dudas[19]?.id ?? null) : null,
    }),
  )
  await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
}

const abrirDosPaginas = async () => {
  const servidor = crearServidor("maestro", muchasDudas(21))
  servidor.estado.respuestas[idDuda(21)] = [respuesta(1)]
  const cliente = clienteDePrueba()
  await abrirDudas("maestro", cliente)
  await screen.findByRole("button", { name: "Ver más dudas" }, ESPERA)
  const fila = await esperarFila("Duda 21")
  const control = controlDe(fila)
  fireEvent.click(control)
  await within(fila).findByText("Respuesta 1", undefined, ESPERA)
  return { ...servidor, cliente, fila, control }
}

describe("CL3-4R3 · M-01 (a) con dos páginas de dudas (indicación 1)", () => {
  it.each(BORRADOS)(
    "CL3-4R3-01: borrar (%s) con la lista retenida, plegar y desplegar: nada vivo en la fila, ningún GET de respuestas y un solo aviso",
    async (borrado) => {
      const { estado, fetchMock, fila, control } = await abrirDosPaginas()
      const getsAntes = getsDeRespuestas(fetchMock, 21)
      const lista = await borrarConLaListaRetenida(estado, fila, 21, borrado)
      await reposar()
      fireEvent.click(control)
      await reposar()
      fireEvent.click(control)
      await reposar()
      expect(loVivoEn(fila)).toEqual([])
      expect(getsDeRespuestas(fetchMock, 21)).toBe(getsAntes)
      expect(avisos()).toEqual(avisoDelBorrado(borrado))
      await soltarLaLista(estado, lista, fila)
      expect(getsDeRespuestas(fetchMock, 21)).toBe(getsAntes)
      expect(avisos()).toEqual(avisoDelBorrado(borrado))
    },
  )

  it.each(BORRADOS)(
    "CL3-4R3-02: el bloque plegado cuando llega el %s y desplegado antes de la lista: nada vivo en la fila, ningún GET de respuestas y un solo aviso",
    async (borrado) => {
      const { estado, fetchMock, fila, control } = await abrirDosPaginas()
      fireEvent.click(control)
      const getsAntes = getsDeRespuestas(fetchMock, 21)
      fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
      if (borrado === "404") borrarEnElServidor(estado, 21)
      const elBorrado = retener(estado, esElBorradoDe(21), () => {
        borrarEnElServidor(estado, 21)
      })
      const lista = retener(estado, esLaLista)
      fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
      await waitFor(() => expect(elBorrado.salio()).toBe(true), ESPERA)
      await soltarCon(
        elBorrado,
        borrado === "204" ? new Response(null, { status: 204 }) : noEncontrada(),
      )
      await waitFor(() => expect(lista.salio()).toBe(true), ESPERA)
      fireEvent.click(control)
      await reposar()
      expect(loVivoEn(fila)).toEqual([])
      expect(getsDeRespuestas(fetchMock, 21)).toBe(getsAntes)
      expect(avisos()).toEqual(avisoDelBorrado(borrado))
      await soltarLaLista(estado, lista, fila)
      expect(getsDeRespuestas(fetchMock, 21)).toBe(getsAntes)
    },
  )
})

// La duda 2 tiene 25 respuestas; la última de la primera página ya no está cuando se pide «Ver más
// respuestas», así que el bloque dice R5.
const conR5 = async () => {
  const servidor = crearServidor("maestro", [duda(2, { respuestas: 25 }), duda(1)])
  servidor.estado.respuestas[idDuda(2)] = Array.from({ length: 25 }, (_, i) => respuesta(i + 1))
  const cliente = clienteDePrueba()
  await abrirDudas("maestro", cliente)
  const fila = await esperarFila("Duda 2")
  fireEvent.click(controlDe(fila))
  const verMas = await within(fila).findByRole("button", { name: "Ver más respuestas" }, ESPERA)
  servidor.estado.respuestas[idDuda(2)] = (servidor.estado.respuestas[idDuda(2)] ?? []).filter(
    ({ id }) => id !== idRespuesta(20),
  )
  fireEvent.click(verMas)
  expect(await within(fila).findByText(R5, undefined, ESPERA)).toBeInTheDocument()
  return { ...servidor, cliente, fila }
}

describe("CL3-4R3 · M-01 (b) con R5 (indicación 2)", () => {
  it.each(BORRADOS)(
    "CL3-4R3-03: con R5 en el bloque, borrar (%s) con la lista retenida y pulsar «Dudas»: ningún GET de respuestas, R5 sin cambio y un solo aviso",
    async (borrado) => {
      const { estado, fetchMock, fila } = await conR5()
      const lista = await borrarConLaListaRetenida(estado, fila, 2, borrado)
      await reposar()
      const getsAntes = getsDeRespuestas(fetchMock, 2)
      fireEvent.click(enLasSecciones("Dudas"))
      await reposar()
      expect(getsDeRespuestas(fetchMock, 2)).toBe(getsAntes)
      expect(
        within(fila)
          .getAllByRole("alert")
          .map((e) => e.textContent),
      ).toEqual([`Error${R5}`])
      expect(avisos()).toEqual(avisoDelBorrado(borrado))
      await soltarLaLista(estado, lista, fila)
      expect(getsDeRespuestas(fetchMock, 2)).toBe(getsAntes)
    },
  )

  it("CL3-4R3-04: con R5 en el bloque y un 503 al borrar, pulsar «Dudas» pide las respuestas desde la primera página y, con 200, R5 desaparece", async () => {
    const { estado, fetchMock, fila } = await conR5()
    estado.falla = ({ metodo, url }) =>
      metodo === "DELETE" && url.pathname === `${RUTA_DUDAS}/${idDuda(2)}`
        ? errorJson(503, "SERVICIO_OCUPADO", OCUPADO)
        : null
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
    await waitFor(() => expect(avisosDeError()).toHaveLength(1), ESPERA)
    await reposar()
    const antes = llamadasDe(fetchMock, "GET", rutaRespuestas(2)).length
    fireEvent.click(enLasSecciones("Dudas"))
    await waitFor(() => expect(within(fila).queryByText(R5)).toBeNull(), ESPERA)
    const nuevas = llamadasDe(fetchMock, "GET", rutaRespuestas(2)).slice(antes)
    expect(nuevas.length).toBeGreaterThan(0)
    expect(nuevas[0]?.searchParams.has("cursor")).toBe(false)
    expect(await within(fila).findByText("Respuesta 1", undefined, ESPERA)).toBeInTheDocument()
    expect(avisosDeError()).toHaveLength(1)
  })
})

// Abre por primera vez el bloque de la duda 1 (sin respuestas en la caché) con el DELETE retenido.
const abrirConElBorradoRetenido = async (rol: "maestro", conRespuesta: boolean) => {
  const servidor = crearServidor(rol, [duda(2), duda(1, { respuestas: conRespuesta ? 1 : 0 })])
  if (conRespuesta) servidor.estado.respuestas[idDuda(1)] = [respuesta(1)]
  const cliente = clienteDePrueba()
  await abrirDudas(rol, cliente)
  const fila = await esperarFila("Duda 1")
  fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
  const elBorrado = retener(servidor.estado, esElBorradoDe(1))
  fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
  await waitFor(() => expect(elBorrado.salio()).toBe(true), ESPERA)
  const control = controlDe(fila)
  act(() => control.focus())
  fireEvent.click(control)
  await reposar()
  return { ...servidor, cliente, fila, control, elBorrado }
}

describe("CL3-4R3 · O-7: abrir el bloque por primera vez con el DELETE en vuelo (indicación 3)", () => {
  it("CL3-4R3-05: con una respuesta: mientras, nada vivo ni GET; con 503, una sola petición, la respuesta a la vista y un solo aviso", async () => {
    const { fetchMock, fila, elBorrado } = await abrirConElBorradoRetenido("maestro", true)
    expect(loVivoEn(fila)).toEqual([])
    expect(getsDeRespuestas(fetchMock, 1)).toBe(0)
    await soltarCon(elBorrado, errorJson(503, "SERVICIO_OCUPADO", OCUPADO))
    expect(await within(fila).findByText("Respuesta 1", undefined, ESPERA)).toBeInTheDocument()
    await reposar()
    expect(getsDeRespuestas(fetchMock, 1)).toBe(1)
    expect(avisos()).toHaveLength(1)
    expect(loVivoEn(fila)).toEqual([])
  })

  it("CL3-4R3-06: con «Responder» (0 respuestas): mientras, nada vivo, ni campo ni GET; con 503, una sola petición, el foco va al campo y un solo aviso", async () => {
    const { fetchMock, fila, elBorrado } = await abrirConElBorradoRetenido("maestro", false)
    expect(loVivoEn(fila)).toEqual([])
    expect(within(fila).queryByLabelText("Escribe una respuesta")).toBeNull()
    expect(getsDeRespuestas(fetchMock, 1)).toBe(0)
    await soltarCon(elBorrado, errorJson(503, "SERVICIO_OCUPADO", OCUPADO))
    const campo = await within(fila).findByLabelText("Escribe una respuesta", undefined, ESPERA)
    await reposar()
    expect(campo).toHaveFocus()
    expect(getsDeRespuestas(fetchMock, 1)).toBe(1)
    expect(avisos()).toHaveLength(1)
    expect(loVivoEn(fila)).toEqual([])
  })

  it("CL3-4R3-07: con 404 (otra persona la borró): ningún GET de respuestas y la fila sale con la lista, con un solo aviso", async () => {
    const { estado, fetchMock, fila, elBorrado } = await abrirConElBorradoRetenido("maestro", true)
    borrarEnElServidor(estado, 1)
    const lista = retener(estado, esLaLista)
    await soltarCon(elBorrado, noEncontrada())
    await waitFor(() => expect(lista.salio()).toBe(true), ESPERA)
    await reposar()
    expect(loVivoEn(fila)).toEqual([])
    await soltarLaLista(estado, lista, fila)
    expect(getsDeRespuestas(fetchMock, 1)).toBe(0)
    expect(avisos()).toEqual([YA_NO_EXISTE])
  })
})

describe("CL3-4R3 · la suscripción de quitarRespuestasAlCerrarseSuBloque (indicación 4)", () => {
  it("CL3-4R3-08: 404 y un segundo clic en «Sí, borrar duda» mientras llega la lista: un solo DELETE y, al salir la fila, ninguna consulta de sus respuestas en la caché", async () => {
    const { estado, fetchMock, cliente, fila } = await abrirDosPaginas()
    const lista = await borrarConLaListaRetenida(estado, fila, 21, "404")
    await reposar()
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
    await reposar()
    expect(llamadasDe(fetchMock, "DELETE", `${RUTA_DUDAS}/${idDuda(21)}`)).toHaveLength(1)
    await soltarLaLista(estado, lista, fila)
    await reposar()
    expect(consultasDeRespuestas(cliente, 21)).toBe(0)
    expect(avisos()).toEqual([YA_NO_EXISTE])
  })

  it.each(BORRADOS)(
    "CL3-4R3-09: tras el %s, plegar y desplegar mientras llega la lista: al salir la fila, ninguna consulta de sus respuestas en la caché",
    async (borrado) => {
      const { estado, cliente, fila, control } = await abrirDosPaginas()
      const lista = await borrarConLaListaRetenida(estado, fila, 21, borrado)
      await reposar()
      fireEvent.click(control)
      await reposar()
      fireEvent.click(control)
      await reposar()
      await soltarLaLista(estado, lista, fila)
      await reposar()
      expect(restosDeRespuestas(cliente, 21)).toEqual([])
    },
  )

  it("CL3-4R3-10: cerrar sesión mientras llega la lista tras el 204: no queda la consulta de sus respuestas ni sale ningún GET de respuestas", async () => {
    const { estado, fetchMock, cliente, fila } = await abrirDosPaginas()
    let sinSesion = false
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada, init) => {
        const ruta = new URL(String(entrada), "http://x").pathname
        if (ruta === "/api/auth/logout") {
          sinSesion = true
          return Promise.resolve(new Response(null, { status: 204 }))
        }
        if (sinSesion && ruta === "/api/auth/refrescar") {
          return Promise.resolve(errorJson(401, "NO_AUTENTICADO", "Inicia sesión."))
        }
        return fetchMock(entrada, init)
      }),
    )
    const getsAntes = getsDeRespuestas(fetchMock, 21)
    const lista = await borrarConLaListaRetenida(estado, fila, 21, "204")
    await reposar()
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }))
    await waitFor(() => expect(sinSesion).toBe(true), ESPERA)
    await reposar(300)
    expect(fila.isConnected).toBe(false)
    expect(consultasDeRespuestas(cliente, 21)).toBe(0)
    await soltarCon(lista, respuestaJson(200, { dudas: [], siguienteCursor: null }))
    await reposar(300)
    expect(consultasDeRespuestas(cliente, 21)).toBe(0)
    expect(getsDeRespuestas(fetchMock, 21)).toBe(getsAntes)
  })
})

type Accion =
  | "marcar"
  | "quitar «Resuelta»"
  | "borrar la duda"
  | "responder"
  | "borrar una respuesta"
  | "Ver más respuestas"
  | "pulsar «Dudas» con el bloque en R9"

const ACCIONES: readonly Accion[] = [
  "marcar",
  "quitar «Resuelta»",
  "borrar la duda",
  "responder",
  "borrar una respuesta",
  "Ver más respuestas",
  "pulsar «Dudas» con el bloque en R9",
]

describe("CL3-4R3 · un solo mensaje por acción con la duda que se va (indicación 5)", () => {
  it.each(ACCIONES)(
    "CL3-4R3-11: %s sobre una duda que otra persona borró, con su bloque abierto: un solo mensaje desde la acción hasta que la fila sale",
    async (accion) => {
      const enR9 = accion === "pulsar «Dudas» con el bloque en R9"
      const { estado } = crearServidor("maestro", [
        duda(2, { respuestas: 25, resuelta: accion === "quitar «Resuelta»" }),
        duda(1),
      ])
      estado.respuestas[idDuda(2)] = Array.from({ length: 25 }, (_, i) => respuesta(i + 1))
      if (enR9) {
        estado.falla = ({ metodo, url }) =>
          metodo === "GET" && url.pathname === rutaRespuestas(2)
            ? errorJson(500, "ERROR_INTERNO", "x")
            : null
      }
      await abrirDudas("maestro", clienteDePrueba())
      const fila = await esperarFila("Duda 2")
      fireEvent.click(controlDe(fila))
      if (enR9) {
        await within(fila).findByRole("alert", undefined, ESPERA)
        estado.falla = () => null
      } else {
        await within(fila).findByText("Respuesta 1", undefined, ESPERA)
      }
      const vivoAntes = loVivoEn(fila)
      if (accion === "borrar una respuesta") {
        fireEvent.click(within(fila).getAllByRole("button", { name: "Borrar" })[0] as HTMLElement)
      }
      if (accion === "borrar la duda") {
        fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
      }
      borrarEnElServidor(estado, 2)
      const lista = retener(estado, esLaLista)
      const mensajesVistos = new Set<string>()
      const anotar = () => {
        for (const texto of loVivoEn(fila)) {
          if (!vivoAntes.includes(texto)) mensajesVistos.add(texto)
        }
      }
      if (accion === "marcar" || accion === "quitar «Resuelta»") {
        fireEvent.click(within(fila).getByRole("button", { name: /resuelta/i }))
      }
      if (accion === "borrar la duda") {
        fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
      }
      if (accion === "responder") {
        fireEvent.change(within(fila).getByLabelText("Escribe una respuesta"), {
          target: { value: "Mi respuesta" },
        })
        fireEvent.click(within(fila).getByRole("button", { name: "Responder" }))
      }
      if (accion === "borrar una respuesta") {
        fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar respuesta" }))
      }
      if (accion === "Ver más respuestas") {
        fireEvent.click(within(fila).getByRole("button", { name: "Ver más respuestas" }))
      }
      if (enR9) fireEvent.click(enLasSecciones("Dudas"))
      await waitFor(() => expect(lista.salio()).toBe(true), ESPERA)
      for (let i = 0; i < 4; i += 1) {
        await reposar(50)
        anotar()
      }
      await soltarLaLista(estado, lista, fila)
      const mensajes = [...avisos(), ...mensajesVistos]
      expect(mensajes, `mensajes: ${mensajes.join(" | ")}`).toHaveLength(1)
    },
  )
})
