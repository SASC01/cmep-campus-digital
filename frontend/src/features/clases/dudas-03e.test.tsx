// CLASES-03e (§D-9, §D-11, §D-14, §D-15): «Dudas» con el router real y un servidor doble: la vista, la
// fila, publicar, marcar y quitar «Resuelta», borrar, las respuestas, VALIDACION fuera de contrato, O-16,
// R7 y el control de las respuestas (CL3-E01 a E08, E11, E14 y E15).
import { normalizarTextoLargo } from "@campus/shared"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { formatearFechaHora } from "@/lib/format"

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
const OCUPADO = "El servidor está ocupado. Inténtalo de nuevo en unos segundos."
const CREADO_EN = "2026-10-01T15:30:00.000Z"
const M = "Revisa este valor."

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

const clienteDePrueba = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } },
  })

const reposar = () => act(() => new Promise((resolver) => setTimeout(resolver, 150)))
const avisosDeError = () => aviso.error.mock.calls.map((llamada) => String(llamada[0]))
const avisosDeExito = () => aviso.success.mock.calls.map((llamada) => String(llamada[0]))

const DUDAS = (rol: Rol) => `${BASES[rol]}/${CLASE_ID}/dudas`
const AVISOS = (rol: Rol) => `${BASES[rol]}/${CLASE_ID}`
const RUTA_DUDAS = `${API}/dudas`
const rutaRespuestas = (n: number) => `${API}/dudas/${idDuda(n)}/respuestas`
const rutaMarca = (n: number) => `${API}/dudas/${idDuda(n)}/resuelta`
const claveDudas = ["clases", CLASE_ID, "dudas"] as const
const claveRespuestas = (n: number) => ["clases", CLASE_ID, "respuestas", idDuda(n)] as const

const abrirDudas = async (rol: Rol, cliente?: QueryClient, entradas = [DUDAS(rol)]) => {
  const montaje = await montar(entradas, cliente)
  await screen.findByRole("heading", { level: 2, name: "Dudas" }, ESPERA)
  return montaje
}

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

const escribirDuda = (valor: string) =>
  fireEvent.change(screen.getByLabelText("Escribe tu duda"), { target: { value: valor } })
const publicar = () => fireEvent.click(screen.getByRole("button", { name: "Publicar duda" }))
const escribirRespuesta = (fila: HTMLElement, valor: string) =>
  fireEvent.change(within(fila).getByLabelText("Escribe una respuesta"), {
    target: { value: valor },
  })
const enviarRespuesta = (fila: HTMLElement) => {
  const formulario = within(fila).getByLabelText("Escribe una respuesta").closest("form")
  if (formulario === null) throw new Error("Precondición: el formulario de respuesta")
  fireEvent.submit(formulario)
}
const portadoresDeError = () => document.querySelectorAll('[aria-invalid="true"]')
const erroresDeCampo = () => document.querySelectorAll('[id$="-error"]')

// Retiene la primera petición que casa con `casa` hasta que la prueba la suelta con su respuesta.
const retener = (estado: Estado, casa: (llamada: Llamada) => boolean) => {
  let soltar: (respuesta: Response) => void = () => {
    throw new Error("Precondición: la petición retenida no salió")
  }
  let usada = false
  estado.falla = (llamada) => {
    if (usada || !casa(llamada)) return null
    usada = true
    return new Promise<Response>((resolver) => {
      soltar = resolver
    })
  }
  return (respuestaFinal: Response) => {
    soltar(respuestaFinal)
  }
}

const esPost =
  (pathname: string) =>
  ({ metodo, url }: Llamada) =>
    metodo === "POST" && url.pathname === pathname

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

describe("CL3-E01 · la vista de Dudas", () => {
  it.each(["estudiante", "maestro", "admin"] as const)(
    "CL3-E01: %s ve el h2 «Dudas» y su frase; el formulario solo para estudiante y maestro",
    async (rol) => {
      crearServidor(rol, [duda(1)])
      await abrirDudas(rol)
      expect(screen.getByText("Lo que escribas aquí lo ve toda la clase.")).toBeInTheDocument()
      const campo = screen.queryByLabelText("Escribe tu duda")
      const boton = screen.queryByRole("button", { name: "Publicar duda" })
      if (rol === "admin") {
        expect(campo).toBeNull()
        expect(boton).toBeNull()
        return
      }
      expect(campo).toHaveAttribute("autocomplete", "off")
      expect(boton).toBeInTheDocument()
    },
  )

  it("CL3-E01: la lista sale en el orden del servidor (de la más reciente a la más antigua)", async () => {
    crearServidor("maestro", [duda(3), duda(2), duda(1)])
    await abrirDudas("maestro")
    await esperarFila("Duda 1")
    const textos = Array.from(document.querySelectorAll("[data-duda-id]")).map(
      (fila) => fila.getAttribute("data-duda-id") ?? "",
    )
    expect(textos).toEqual([idDuda(3), idDuda(2), idDuda(1)])
  })

  it.each(["estudiante", "maestro", "admin"] as const)(
    "CL3-E01: %s con la clase sin dudas ve «Aún no hay dudas en esta clase.»",
    async (rol) => {
      crearServidor(rol)
      await abrirDudas(rol)
      expect(
        await screen.findByText("Aún no hay dudas en esta clase.", undefined, ESPERA),
      ).toBeInTheDocument()
    },
  )

  it("CL3-E01: «Ver más dudas» pide la página siguiente con el cursor y espera también mientras la lista se recarga", async () => {
    const { estado, fetchMock } = crearServidor(
      "maestro",
      Array.from({ length: 25 }, (_, i) => duda(25 - i)),
    )
    const cliente = clienteDePrueba()
    await abrirDudas("maestro", cliente)
    await esperarFila("Duda 6")
    expect(screen.queryByText("Duda 5", { selector: "p" })).toBeNull()
    const verMas = screen.getByRole("button", { name: "Ver más dudas" })
    const soltar = retener(
      estado,
      ({ metodo, url }) => metodo === "GET" && url.pathname === RUTA_DUDAS,
    )
    void cliente.invalidateQueries({ queryKey: claveDudas })
    await waitFor(() => expect(verMas).toHaveAttribute("aria-busy", "true"))
    const antes = pedidas(fetchMock, RUTA_DUDAS).length
    fireEvent.click(verMas)
    await reposar()
    expect(pedidas(fetchMock, RUTA_DUDAS)).toHaveLength(antes)
    estado.falla = () => null
    await act(async () => {
      soltar(respuestaJson(200, { dudas: estado.dudas.slice(0, 20), siguienteCursor: idDuda(6) }))
      await Promise.resolve()
    })
    await waitFor(() => expect(verMas).not.toHaveAttribute("aria-busy", "true"))
    fireEvent.click(verMas)
    await esperarFila("Duda 1")
    const ultima = pedidas(fetchMock, RUTA_DUDAS).at(-1)
    expect(ultima?.searchParams.get("cursor")).toBe(idDuda(6))
  })
})

describe("CL3-E02 · la fila de una duda", () => {
  it("CL3-E02: firma, fecha, texto plano (nunca HTML) e insignia «Resuelta» con icono y texto solo si está resuelta", async () => {
    crearServidor("estudiante", [
      duda(2, { texto: "<b>¿Cuándo es el examen?</b>", resuelta: true, resueltaEn: CREADO_EN }),
      duda(1),
    ])
    await abrirDudas("estudiante")
    const resuelta = await esperarFila("<b>¿Cuándo es el examen?</b>")
    expect(resuelta.querySelector("b")).toBeNull()
    expect(resuelta).toHaveTextContent(FIRMA_ALUMNA.nombre)
    expect(resuelta).toHaveTextContent(formatearFechaHora(CREADO_EN))
    const insignia = within(resuelta).getByText("Resuelta")
    expect(insignia.closest("[data-slot='badge']")?.querySelector("svg")).not.toBeNull()
    expect(within(filaDe("Duda 1")).queryByText("Resuelta")).toBeNull()
  })

  it.each(["estudiante", "maestro"] as const)(
    "CL3-E02: %s ve «Ver respuestas (n)» con n ≥ 1 y «Responder» con 0",
    async (rol) => {
      crearServidor(rol, [duda(2, { respuestas: 3 }), duda(1)])
      await abrirDudas(rol)
      expect(controlDe(await esperarFila("Duda 2"))).toHaveTextContent("Ver respuestas (3)")
      expect(controlDe(filaDe("Duda 1"))).toHaveTextContent("Responder")
      expect(screen.queryByText("Ver respuestas (0)")).toBeNull()
    },
  )
})

describe("CL3-E03 · publicar una duda", () => {
  it("CL3-E03: envía { texto } normalizado, avisa, vacía el campo y la lista se renueva", async () => {
    const { fetchMock } = crearServidor("estudiante", [duda(1)])
    await abrirDudas("estudiante")
    await esperarFila("Duda 1")
    const antes = pedidas(fetchMock, RUTA_DUDAS).length
    const escrito = "  ¿Entra el tema 3?  "
    escribirDuda(escrito)
    publicar()
    await waitFor(() => expect(avisosDeExito()).toEqual(["Duda publicada"]))
    expect(llamadasDe(fetchMock, "POST", RUTA_DUDAS).map(({ cuerpo }) => cuerpo)).toEqual([
      { texto: normalizarTextoLargo(escrito) },
    ])
    expect(screen.getByLabelText("Escribe tu duda")).toHaveValue("")
    await waitFor(() => expect(pedidas(fetchMock, RUTA_DUDAS).length).toBeGreaterThan(antes))
    expect(
      await screen.findByText(normalizarTextoLargo(escrito), { selector: "p" }, ESPERA),
    ).toBeInTheDocument()
  })

  it.each(["", "   ", "​​"])(
    "CL3-E03: con el texto %j, «Escribe tu duda» bajo el campo y ninguna petición",
    async (texto) => {
      const { fetchMock } = crearServidor("maestro")
      await abrirDudas("maestro")
      escribirDuda(texto)
      publicar()
      expect(
        await screen.findByText("Escribe tu duda", {
          selector: "[id$='-error'] *, [id$='-error']",
        }),
      ).toBeInTheDocument()
      expect(screen.getByLabelText("Escribe tu duda")).toHaveAttribute("aria-invalid", "true")
      await reposar()
      expect(llamadasDe(fetchMock, "POST", RUTA_DUDAS)).toHaveLength(0)
      expect(avisosDeError()).toEqual([])
    },
  )

  it("CL3-E03: doble clic en «Publicar duda» manda un solo POST", async () => {
    const { estado, fetchMock } = crearServidor("estudiante")
    const soltar = retener(estado, esPost(RUTA_DUDAS))
    await abrirDudas("estudiante")
    escribirDuda("Una duda")
    publicar()
    publicar()
    await reposar()
    expect(llamadasDe(fetchMock, "POST", RUTA_DUDAS)).toHaveLength(1)
    await act(async () => {
      soltar(respuestaJson(201, { duda: duda(9, { texto: "Una duda" }) }))
      await Promise.resolve()
    })
    await waitFor(() => expect(avisosDeExito()).toEqual(["Duda publicada"]))
    expect(llamadasDe(fetchMock, "POST", RUTA_DUDAS)).toHaveLength(1)
  })
})

describe("CL3-E04 · marcar y quitar «Resuelta»", () => {
  it("CL3-E04: el mismo botón cambia de texto, el foco se queda, avisa y la insignia aparece y desaparece", async () => {
    const { fetchMock } = crearServidor("maestro", [duda(1)])
    await abrirDudas("maestro")
    const fila = await esperarFila("Duda 1")
    const boton = within(fila).getByRole("button", { name: "Marcar como resuelta" })
    boton.focus()
    fireEvent.click(boton)
    await waitFor(() => expect(boton).toHaveTextContent("Quitar «Resuelta»"))
    expect(within(filaDe("Duda 1")).getByRole("button", { name: "Quitar «Resuelta»" })).toBe(boton)
    expect(boton).toHaveFocus()
    expect(avisosDeExito()).toEqual(["Marcada como resuelta"])
    expect(within(filaDe("Duda 1")).getByText("Resuelta")).toBeInTheDocument()
    fireEvent.click(boton)
    await waitFor(() => expect(boton).toHaveTextContent("Marcar como resuelta"))
    expect(boton).toHaveFocus()
    expect(avisosDeExito()).toEqual(["Marcada como resuelta", "Ya no está marcada como resuelta"])
    expect(within(filaDe("Duda 1")).queryByText("Resuelta")).toBeNull()
    expect(llamadasDe(fetchMock, "PUT", rutaMarca(1)).map(({ cuerpo }) => cuerpo)).toEqual([
      { resuelta: true },
      { resuelta: false },
    ])
  })

  it("CL3-E04: sin `puedeMarcar` no hay botón; el estudiante nunca lo ve aunque el dato diga true", async () => {
    crearServidor("maestro", [duda(1, { puedeMarcar: false })])
    await abrirDudas("maestro")
    expect(
      within(await esperarFila("Duda 1")).queryByRole("button", { name: "Marcar como resuelta" }),
    ).toBeNull()
    cleanup()
    vi.unstubAllGlobals()
    crearServidor("estudiante", [duda(1, { puedeMarcar: true })])
    await abrirDudas("estudiante")
    const fila = await esperarFila("Duda 1")
    expect(within(fila).queryByRole("button", { name: "Marcar como resuelta" })).toBeNull()
    expect(fila.querySelector("[data-marcar-duda]")).toBeNull()
  })

  it("CL3-E04: doble clic manda un solo PUT", async () => {
    const { estado, fetchMock } = crearServidor("admin", [duda(1)])
    await abrirDudas("admin")
    const fila = await esperarFila("Duda 1")
    const soltar = retener(estado, ({ metodo }) => metodo === "PUT")
    const boton = within(fila).getByRole("button", { name: "Marcar como resuelta" })
    fireEvent.click(boton)
    fireEvent.click(boton)
    await reposar()
    expect(llamadasDe(fetchMock, "PUT", rutaMarca(1))).toHaveLength(1)
    await act(async () => {
      soltar(respuestaJson(200, { duda: duda(1, { resuelta: true, resueltaEn: CREADO_EN }) }))
      await Promise.resolve()
    })
    await waitFor(() => expect(avisosDeExito()).toEqual(["Marcada como resuelta"]))
    expect(llamadasDe(fetchMock, "PUT", rutaMarca(1))).toHaveLength(1)
  })

  it("CL3-E04: con 404, el aviso, la fila desaparece y el foco va al «Marcar como resuelta» de la vecina", async () => {
    const { estado } = crearServidor("maestro", [duda(2), duda(1)])
    await abrirDudas("maestro")
    const fila = await esperarFila("Duda 2")
    await esperarFila("Duda 1")
    estado.dudas = estado.dudas.filter(({ id }) => id !== idDuda(2))
    const boton = within(fila).getByRole("button", { name: "Marcar como resuelta" })
    boton.focus()
    fireEvent.click(boton)
    await waitFor(() => expect(avisosDeError()).toEqual(["Esa duda ya no existe."]))
    await waitFor(() => expect(screen.queryByText("Duda 2", { selector: "p" })).toBeNull())
    expect(
      within(filaDe("Duda 1")).getByRole("button", { name: "Marcar como resuelta" }),
    ).toHaveFocus()
  })

  it("CL3-E04: con 404 y sin vecinas, el foco va al h2 «Dudas»", async () => {
    const { estado } = crearServidor("maestro", [duda(1)])
    await abrirDudas("maestro")
    const fila = await esperarFila("Duda 1")
    estado.dudas = []
    const boton = within(fila).getByRole("button", { name: "Marcar como resuelta" })
    boton.focus()
    fireEvent.click(boton)
    await waitFor(() => expect(avisosDeError()).toEqual(["Esa duda ya no existe."]))
    await screen.findByText("Aún no hay dudas en esta clase.", undefined, ESPERA)
    expect(screen.getByRole("heading", { level: 2, name: "Dudas" })).toHaveFocus()
  })
})

describe("CL3-E05 · borrar una duda", () => {
  it("CL3-E05: la confirmación en línea dice «Se borrará con sus respuestas.»; el foco va a «Cancelar» y vuelve a «Borrar duda»", async () => {
    crearServidor("estudiante", [duda(1, { propia: true })])
    await abrirDudas("estudiante")
    const fila = await esperarFila("Duda 1")
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
    expect(within(fila).getByText("Se borrará con sus respuestas.")).toBeInTheDocument()
    expect(within(fila).getByRole("button", { name: "Cancelar" })).toHaveFocus()
    fireEvent.click(within(fila).getByRole("button", { name: "Cancelar" }))
    expect(within(fila).getByRole("button", { name: "Borrar duda" })).toHaveFocus()
  })

  it("CL3-E05: «Sí, borrar duda» avisa, la fila sale, el foco va al «Borrar duda» de la vecina y sus respuestas salen de la caché", async () => {
    const { estado } = crearServidor("maestro", [duda(2, { respuestas: 1 }), duda(1)])
    estado.respuestas[idDuda(2)] = [respuesta(1)]
    const cliente = clienteDePrueba()
    await abrirDudas("maestro", cliente)
    const fila = await esperarFila("Duda 2")
    fireEvent.click(controlDe(fila))
    await within(fila).findByText("Respuesta 1", undefined, ESPERA)
    expect(cliente.getQueryData(claveRespuestas(2))).toBeDefined()
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
    await waitFor(() => expect(avisosDeExito()).toEqual(["Duda borrada"]))
    await waitFor(() => expect(screen.queryByText("Duda 2", { selector: "p" })).toBeNull())
    expect(within(filaDe("Duda 1")).getByRole("button", { name: "Borrar duda" })).toHaveFocus()
    expect(cliente.getQueryData(claveRespuestas(2))).toBeUndefined()
  })

  it("CL3-E05: sin vecinas, el foco va al h2 «Dudas»", async () => {
    crearServidor("admin", [duda(1)])
    await abrirDudas("admin")
    const fila = await esperarFila("Duda 1")
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
    await screen.findByText("Aún no hay dudas en esta clase.", undefined, ESPERA)
    expect(screen.getByRole("heading", { level: 2, name: "Dudas" })).toHaveFocus()
  })

  it("CL3-E05: con 403 BORRADO_NO_PERMITIDO, el aviso del servidor, la lista se renueva, el botón desaparece y el foco va a la fila", async () => {
    const { estado, fetchMock } = crearServidor("maestro", [duda(1)])
    await abrirDudas("maestro")
    const fila = await esperarFila("Duda 1")
    const antes = pedidas(fetchMock, RUTA_DUDAS).length
    estado.falla = ({ metodo }) => {
      if (metodo !== "DELETE") return null
      const encontrada = estado.dudas[0]
      if (encontrada !== undefined) encontrada.puedeBorrar = false
      return errorJson(403, "BORRADO_NO_PERMITIDO", "No puedes borrar esta duda.")
    }
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
    await waitFor(() => expect(avisosDeError()).toEqual(["No puedes borrar esta duda."]))
    await waitFor(() => expect(pedidas(fetchMock, RUTA_DUDAS).length).toBeGreaterThan(antes))
    await waitFor(() =>
      expect(within(filaDe("Duda 1")).queryByRole("button", { name: /borrar duda/i })).toBeNull(),
    )
    expect(filaDe("Duda 1")).toHaveFocus()
  })

  it("CL3-E05: con 404, el aviso «Esa duda ya no existe.», la lista se renueva y la fila desaparece", async () => {
    const { estado } = crearServidor("maestro", [duda(2), duda(1)])
    await abrirDudas("maestro")
    const fila = await esperarFila("Duda 2")
    estado.dudas = estado.dudas.filter(({ id }) => id !== idDuda(2))
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
    await waitFor(() => expect(avisosDeError()).toEqual(["Esa duda ya no existe."]))
    await waitFor(() => expect(screen.queryByText("Duda 2", { selector: "p" })).toBeNull())
    expect(within(filaDe("Duda 1")).getByRole("button", { name: "Borrar duda" })).toHaveFocus()
  })
})

describe("CL3-E06 · las respuestas de una duda", () => {
  it("CL3-E06: se piden al abrir, en orden ascendente, y «Ver más respuestas» pide con el cursor", async () => {
    const { estado, fetchMock } = crearServidor("maestro", [duda(1, { respuestas: 25 })])
    estado.respuestas[idDuda(1)] = Array.from({ length: 25 }, (_, i) => respuesta(i + 1))
    await abrirDudas("maestro")
    const fila = await esperarFila("Duda 1")
    await reposar()
    expect(pedidas(fetchMock, rutaRespuestas(1))).toHaveLength(0)
    fireEvent.click(controlDe(fila))
    await within(fila).findByText("Respuesta 20", undefined, ESPERA)
    const textos = within(fila)
      .getAllByText(/^Respuesta \d+$/)
      .map((elemento) => elemento.textContent)
    expect(textos.slice(0, 3)).toEqual(["Respuesta 1", "Respuesta 2", "Respuesta 3"])
    fireEvent.click(within(fila).getByRole("button", { name: "Ver más respuestas" }))
    await within(fila).findByText("Respuesta 25", undefined, ESPERA)
    expect(pedidas(fetchMock, rutaRespuestas(1)).at(-1)?.searchParams.get("cursor")).toBe(
      idRespuesta(20),
    )
  })

  it.each(["estudiante", "maestro"] as const)(
    "CL3-E06: %s responde: un POST, el aviso, la respuesta aparece y el conteo de la duda se renueva",
    async (rol) => {
      const { estado, fetchMock } = crearServidor(rol, [duda(1, { respuestas: 1 })])
      estado.respuestas[idDuda(1)] = [respuesta(1)]
      await abrirDudas(rol)
      const fila = await esperarFila("Duda 1")
      fireEvent.click(controlDe(fila))
      await within(fila).findByLabelText("Escribe una respuesta", undefined, ESPERA)
      const antes = pedidas(fetchMock, RUTA_DUDAS).length
      escribirRespuesta(fila, "Sí entra")
      enviarRespuesta(fila)
      await waitFor(() => expect(avisosDeExito()).toEqual(["Respuesta publicada"]))
      expect(llamadasDe(fetchMock, "POST", rutaRespuestas(1)).map(({ cuerpo }) => cuerpo)).toEqual([
        { texto: "Sí entra" },
      ])
      expect(await within(fila).findByText("Sí entra", undefined, ESPERA)).toBeInTheDocument()
      await waitFor(() => expect(pedidas(fetchMock, RUTA_DUDAS).length).toBeGreaterThan(antes))
      fireEvent.click(controlDe(fila))
      await waitFor(() => expect(controlDe(fila)).toHaveTextContent("Ver respuestas (2)"))
    },
  )

  it("CL3-E06: el admin lee las respuestas sin formulario", async () => {
    const { estado } = crearServidor("admin", [duda(1, { respuestas: 1 })])
    estado.respuestas[idDuda(1)] = [respuesta(1)]
    await abrirDudas("admin")
    const fila = await esperarFila("Duda 1")
    fireEvent.click(controlDe(fila))
    await within(fila).findByText("Respuesta 1", undefined, ESPERA)
    expect(within(fila).queryByLabelText("Escribe una respuesta")).toBeNull()
    expect(within(fila).queryByRole("button", { name: "Responder" })).toBeNull()
  })

  it("CL3-E06: borrar una respuesta pide confirmación y el foco va al «Borrar» de la vecina; sin vecinas, al h3 «Respuestas»", async () => {
    const { estado } = crearServidor("maestro", [duda(1, { respuestas: 2 })])
    estado.respuestas[idDuda(1)] = [respuesta(1), respuesta(2)]
    await abrirDudas("maestro")
    const fila = await esperarFila("Duda 1")
    fireEvent.click(controlDe(fila))
    const primera = (await within(fila).findByText("Respuesta 1", undefined, ESPERA)).closest("li")
    if (primera === null) throw new Error("Precondición: la respuesta 1")
    fireEvent.click(within(primera).getByRole("button", { name: "Borrar" }))
    expect(within(primera).getByRole("button", { name: "Cancelar" })).toHaveFocus()
    fireEvent.click(within(primera).getByRole("button", { name: "Sí, borrar respuesta" }))
    await waitFor(() => expect(avisosDeExito()).toEqual(["Respuesta borrada"]))
    await waitFor(() => expect(within(fila).queryByText("Respuesta 1")).toBeNull())
    const segunda = within(fila).getByText("Respuesta 2").closest("li")
    if (segunda === null) throw new Error("Precondición: la respuesta 2")
    expect(within(segunda).getByRole("button", { name: "Borrar" })).toHaveFocus()
    fireEvent.click(within(segunda).getByRole("button", { name: "Borrar" }))
    fireEvent.click(within(segunda).getByRole("button", { name: "Sí, borrar respuesta" }))
    await waitFor(() => expect(within(fila).queryByText("Respuesta 2")).toBeNull())
    expect(within(fila).getByRole("heading", { level: 3, name: "Respuestas" })).toHaveFocus()
  })
})

// Un solo mensaje legible: un aviso o un ErrorDeCampo con texto, nunca los dos ni ninguno.
const mensajesVisibles = () => {
  const deCampo = Array.from(erroresDeCampo()).map((elemento) => elemento.textContent ?? "")
  return [...avisosDeError(), ...deCampo]
}

const esLegible = (texto: string) =>
  texto.trim() !== "" && !/^[A-Za-z_.0-9]+:/.test(texto) && !texto.includes("cursor")

describe("CL3-E07 · VALIDACION fuera de contrato", () => {
  const DE_LA_DUDA = [
    ["resuelta:", "resuelta: debe ser verdadero o falso"],
    ["vacío", ""],
    ["solo espacios", "   "],
    ["texto.0:", `texto.0: ${M}`],
  ] as const

  it.each(DE_LA_DUDA)(
    "CL3-E07: publicar una duda con %s da un solo mensaje legible, conserva lo escrito y el botón sale de la espera",
    async (_caso, mensaje) => {
      const { estado } = crearServidor("estudiante")
      estado.falla = (llamada) =>
        esPost(RUTA_DUDAS)(llamada) ? errorJson(400, "VALIDACION", mensaje) : null
      await abrirDudas("estudiante")
      escribirDuda("Mi duda")
      publicar()
      await waitFor(() => expect(mensajesVisibles()).toHaveLength(1))
      await reposar()
      const [unico] = mensajesVisibles()
      expect(mensajesVisibles()).toHaveLength(1)
      expect(esLegible(unico ?? "")).toBe(true)
      expect(screen.getByLabelText("Escribe tu duda")).toHaveValue("Mi duda")
      expect(screen.getByRole("button", { name: "Publicar duda" })).not.toHaveAttribute(
        "aria-busy",
        "true",
      )
    },
  )

  it("CL3-E07: tras un «texto:» del servidor, un envío vacío muestra solo «Escribe tu duda»", async () => {
    const { estado, fetchMock } = crearServidor("maestro")
    estado.falla = (llamada) =>
      esPost(RUTA_DUDAS)(llamada) ? errorJson(400, "VALIDACION", `texto: ${M}`) : null
    await abrirDudas("maestro")
    escribirDuda("Mi duda")
    publicar()
    expect(await screen.findByText(M, undefined, ESPERA)).toBeInTheDocument()
    escribirDuda("   ")
    publicar()
    await waitFor(() => expect(screen.queryByText(M)).toBeNull())
    expect(mensajesVisibles()).toEqual(["Escribe tu duda"])
    expect(llamadasDe(fetchMock, "POST", RUTA_DUDAS)).toHaveLength(1)
  })

  const DE_LA_RESPUESTA = [
    ["dudaId:", "dudaId: dudaId: debe ser un identificador válido", "Esa duda ya no existe."],
    ["vacío", "", GENERICO],
    ["solo espacios", "   ", GENERICO],
    ["texto.0:", `texto.0: ${M}`, M],
  ] as const

  it.each(DE_LA_RESPUESTA)(
    "CL3-E07: responder con %s (el servidor dice «%s») da un solo mensaje legible, el esperado «%s», conserva lo escrito y el botón sale de la espera",
    async (_caso, mensaje, esperado) => {
      const { estado } = crearServidor("maestro", [duda(1)])
      estado.falla = (llamada) =>
        esPost(rutaRespuestas(1))(llamada) ? errorJson(400, "VALIDACION", mensaje) : null
      await abrirDudas("maestro")
      const fila = await esperarFila("Duda 1")
      fireEvent.click(controlDe(fila))
      await within(fila).findByLabelText("Escribe una respuesta", undefined, ESPERA)
      escribirRespuesta(fila, "Mi respuesta")
      enviarRespuesta(fila)
      await waitFor(() => expect(mensajesVisibles()).toHaveLength(1))
      await reposar()
      expect(mensajesVisibles()).toEqual([esperado])
      expect(within(fila).getByLabelText("Escribe una respuesta")).toHaveValue("Mi respuesta")
      expect(within(fila).getByRole("button", { name: "Responder" })).not.toHaveAttribute(
        "aria-busy",
        "true",
      )
    },
  )

  it("CL3-E07: tras un «texto:» del servidor al responder, un envío vacío muestra solo «Escribe tu respuesta»", async () => {
    const { estado, fetchMock } = crearServidor("estudiante", [duda(1)])
    estado.falla = (llamada) =>
      esPost(rutaRespuestas(1))(llamada) ? errorJson(400, "VALIDACION", `texto: ${M}`) : null
    await abrirDudas("estudiante")
    const fila = await esperarFila("Duda 1")
    fireEvent.click(controlDe(fila))
    await within(fila).findByLabelText("Escribe una respuesta", undefined, ESPERA)
    escribirRespuesta(fila, "Mi respuesta")
    enviarRespuesta(fila)
    expect(await within(fila).findByText(M, undefined, ESPERA)).toBeInTheDocument()
    escribirRespuesta(fila, "")
    enviarRespuesta(fila)
    await waitFor(() => expect(within(fila).queryByText(M)).toBeNull())
    expect(mensajesVisibles()).toEqual(["Escribe tu respuesta"])
    expect(llamadasDe(fetchMock, "POST", rutaRespuestas(1))).toHaveLength(1)
  })

  const DE_MARCAR = [
    ["resuelta:", "resuelta: debe ser verdadero o falso", GENERICO],
    ["vacío", "", GENERICO],
    ["resuelta.0:", "resuelta.0: debe ser verdadero o falso", "debe ser verdadero o falso"],
  ] as const

  it.each(DE_MARCAR)(
    "CL3-E07: marcar con %s da un aviso legible y el botón sale de la espera",
    async (_caso, mensaje, esperado) => {
      const { estado } = crearServidor("maestro", [duda(1)])
      estado.falla = ({ metodo }) =>
        metodo === "PUT" ? errorJson(400, "VALIDACION", mensaje) : null
      await abrirDudas("maestro")
      const fila = await esperarFila("Duda 1")
      const boton = within(fila).getByRole("button", { name: "Marcar como resuelta" })
      fireEvent.click(boton)
      await waitFor(() => expect(avisosDeError()).toEqual([esperado]))
      await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy", "true"))
      expect(portadoresDeError()).toHaveLength(0)
    },
  )
})

describe("CL3-E08 · O-16 en la duda y la respuesta", () => {
  it("CL3-E08: con el formulario de duda montado, un VALIDACION de texto: va bajo el campo sin aviso", async () => {
    const { estado } = crearServidor("estudiante")
    estado.falla = (llamada) =>
      esPost(RUTA_DUDAS)(llamada) ? errorJson(400, "VALIDACION", `texto: ${M}`) : null
    await abrirDudas("estudiante")
    escribirDuda("Mi duda")
    publicar()
    expect(await screen.findByText(M, undefined, ESPERA)).toBeInTheDocument()
    expect(screen.getByLabelText("Escribe tu duda")).toHaveAttribute("aria-invalid", "true")
    await reposar()
    expect(avisosDeError()).toEqual([])
  })

  it("CL3-E08: con la vista desmontada y el POST en vuelo, un VALIDACION de texto: da un aviso", async () => {
    const { estado, fetchMock } = crearServidor("estudiante")
    const soltar = retener(estado, esPost(RUTA_DUDAS))
    const { router } = await abrirDudas("estudiante")
    escribirDuda("Mi duda")
    publicar()
    await waitFor(() => expect(llamadasDe(fetchMock, "POST", RUTA_DUDAS)).toHaveLength(1))
    await act(() => router.navigate(AVISOS("estudiante")))
    await screen.findByText("Aún no hay avisos en esta clase.", undefined, ESPERA)
    await act(async () => {
      soltar(errorJson(400, "VALIDACION", `texto: ${M}`))
      await Promise.resolve()
    })
    await waitFor(() => expect(avisosDeError()).toEqual([M]))
  })

  it("CL3-E08: con el formulario de respuesta montado, un VALIDACION de texto: va bajo el campo sin aviso", async () => {
    const { estado } = crearServidor("maestro", [duda(1)])
    estado.falla = (llamada) =>
      esPost(rutaRespuestas(1))(llamada) ? errorJson(400, "VALIDACION", `texto: ${M}`) : null
    await abrirDudas("maestro")
    const fila = await esperarFila("Duda 1")
    fireEvent.click(controlDe(fila))
    await within(fila).findByLabelText("Escribe una respuesta", undefined, ESPERA)
    escribirRespuesta(fila, "Mi respuesta")
    enviarRespuesta(fila)
    expect(await within(fila).findByText(M, undefined, ESPERA)).toBeInTheDocument()
    await reposar()
    expect(avisosDeError()).toEqual([])
  })

  it("CL3-E08: con las respuestas plegadas y el POST en vuelo, un VALIDACION de texto: da un aviso", async () => {
    const { estado, fetchMock } = crearServidor("maestro", [duda(1)])
    const soltar = retener(estado, esPost(rutaRespuestas(1)))
    await abrirDudas("maestro")
    const fila = await esperarFila("Duda 1")
    fireEvent.click(controlDe(fila))
    await within(fila).findByLabelText("Escribe una respuesta", undefined, ESPERA)
    escribirRespuesta(fila, "Mi respuesta")
    enviarRespuesta(fila)
    await waitFor(() => expect(llamadasDe(fetchMock, "POST", rutaRespuestas(1))).toHaveLength(1))
    fireEvent.click(controlDe(fila))
    expect(within(fila).queryByLabelText("Escribe una respuesta")).toBeNull()
    await act(async () => {
      soltar(errorJson(400, "VALIDACION", `texto: ${M}`))
      await Promise.resolve()
    })
    await waitFor(() => expect(avisosDeError()).toEqual([M]))
  })
})

interface CasoR7 {
  accion: string
  rol: Rol
  dudas: () => DudaDoble[]
  respuestas?: () => RespuestaDoble[]
  casa: (llamada: Llamada) => boolean
  hacer: () => Promise<void>
  exito: string
}

const CASOS_R7: readonly CasoR7[] = [
  {
    accion: "publicar una duda",
    rol: "estudiante",
    dudas: () => [],
    casa: esPost(RUTA_DUDAS),
    hacer: async () => {
      if ((screen.getByLabelText("Escribe tu duda") as HTMLTextAreaElement).value === "") {
        escribirDuda("Mi duda")
      }
      publicar()
    },
    exito: "Duda publicada",
  },
  {
    accion: "marcar",
    rol: "maestro",
    dudas: () => [duda(1)],
    casa: ({ metodo }) => metodo === "PUT",
    hacer: async () => {
      fireEvent.click(
        within(await esperarFila("Duda 1")).getByRole("button", { name: "Marcar como resuelta" }),
      )
    },
    exito: "Marcada como resuelta",
  },
  {
    accion: "quitar «Resuelta»",
    rol: "admin",
    dudas: () => [duda(1, { resuelta: true, resueltaEn: CREADO_EN })],
    casa: ({ metodo }) => metodo === "PUT",
    hacer: async () => {
      fireEvent.click(
        within(await esperarFila("Duda 1")).getByRole("button", { name: "Quitar «Resuelta»" }),
      )
    },
    exito: "Ya no está marcada como resuelta",
  },
  {
    accion: "borrar una duda",
    rol: "maestro",
    dudas: () => [duda(1)],
    casa: ({ metodo, url }) => metodo === "DELETE" && url.pathname === `${RUTA_DUDAS}/${idDuda(1)}`,
    hacer: async () => {
      const fila = await esperarFila("Duda 1")
      const si = within(fila).queryByRole("button", { name: "Sí, borrar duda" })
      if (si === null) fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
      fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
    },
    exito: "Duda borrada",
  },
  {
    accion: "responder",
    rol: "estudiante",
    dudas: () => [duda(1)],
    casa: esPost(rutaRespuestas(1)),
    hacer: async () => {
      const fila = await esperarFila("Duda 1")
      if (within(fila).queryByLabelText("Escribe una respuesta") === null) {
        fireEvent.click(controlDe(fila))
        await within(fila).findByLabelText("Escribe una respuesta", undefined, ESPERA)
        escribirRespuesta(fila, "Mi respuesta")
      }
      enviarRespuesta(fila)
    },
    exito: "Respuesta publicada",
  },
  {
    accion: "borrar una respuesta",
    rol: "maestro",
    dudas: () => [duda(1, { respuestas: 1 })],
    respuestas: () => [respuesta(1)],
    casa: ({ metodo, url }) => metodo === "DELETE" && url.pathname.includes("/respuestas/"),
    hacer: async () => {
      const fila = await esperarFila("Duda 1")
      if (within(fila).queryByText("Respuesta 1") === null) {
        fireEvent.click(controlDe(fila))
        await within(fila).findByText("Respuesta 1", undefined, ESPERA)
      }
      const si = within(fila).queryByRole("button", { name: "Sí, borrar respuesta" })
      if (si === null) fireEvent.click(within(fila).getByRole("button", { name: "Borrar" }))
      fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar respuesta" }))
    },
    exito: "Respuesta borrada",
  },
]

describe("CL3-E11 · R7: repetir la acción tras un 503", () => {
  it.each(CASOS_R7)(
    "CL3-E11: $accion tras un 503 avisa, sale de la espera, conserva lo escrito y un segundo clic termina como un primer envío correcto",
    async (caso) => {
      const { estado, fetchMock } = crearServidor(caso.rol, caso.dudas())
      if (caso.respuestas !== undefined) estado.respuestas[idDuda(1)] = caso.respuestas()
      let primera = true
      estado.falla = (llamada) => {
        if (!primera || !caso.casa(llamada)) return null
        primera = false
        return errorJson(503, "SERVICIO_OCUPADO", OCUPADO)
      }
      await abrirDudas(caso.rol)
      if (caso.accion === "publicar una duda") escribirDuda("Mi duda")
      await caso.hacer()
      await waitFor(() => expect(avisosDeError()).toEqual([OCUPADO]))
      await waitFor(() => expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(0))
      if (caso.accion === "publicar una duda") {
        expect(screen.getByLabelText("Escribe tu duda")).toHaveValue("Mi duda")
      }
      if (caso.accion === "responder") {
        expect(screen.getByLabelText("Escribe una respuesta")).toHaveValue("Mi respuesta")
      }
      await caso.hacer()
      await waitFor(() => expect(avisosDeExito()).toEqual([caso.exito]))
      expect(avisosDeError()).toEqual([OCUPADO])
      const peticiones = fetchMock.mock.calls.filter(([entrada, init]) =>
        caso.casa({
          metodo: init?.method ?? "GET",
          url: new URL(String(entrada), "http://x"),
          cuerpo: undefined,
        }),
      )
      expect(peticiones).toHaveLength(2)
    },
  )
})

describe("CL3-E14 · el control de las respuestas (estudiante y maestro)", () => {
  it.each(["estudiante", "maestro"] as const)(
    "CL3-E14: %s · con 0 respuestas, «Responder» despliega con un GET, el foco va al campo y el mismo botón pasa a «Ocultar respuestas»; la primera respuesta deja el bloque abierto y, al plegar, «Ver respuestas (1)»",
    async (rol) => {
      const { fetchMock } = crearServidor(rol, [duda(1)])
      await abrirDudas(rol)
      const fila = await esperarFila("Duda 1")
      const control = controlDe(fila)
      expect(control).toHaveTextContent("Responder")
      expect(control).toHaveAttribute("aria-expanded", "false")
      expect(screen.queryByText("Ver respuestas (0)")).toBeNull()
      fireEvent.click(control)
      const campo = await within(fila).findByLabelText("Escribe una respuesta", undefined, ESPERA)
      await waitFor(() => expect(pedidas(fetchMock, rutaRespuestas(1))).toHaveLength(1))
      expect(campo).toHaveFocus()
      expect(controlDe(fila)).toBe(control)
      expect(control).toHaveTextContent("Ocultar respuestas")
      expect(control).toHaveAttribute("aria-expanded", "true")
      expect(within(fila).getAllByRole("button", { name: "Responder" })).toHaveLength(1)
      escribirRespuesta(fila, "La primera")
      enviarRespuesta(fila)
      expect(await within(fila).findByText("La primera", undefined, ESPERA)).toBeInTheDocument()
      await reposar()
      expect(controlDe(fila)).toBe(control)
      expect(control).toHaveTextContent("Ocultar respuestas")
      fireEvent.click(control)
      await waitFor(() => expect(control).toHaveTextContent("Ver respuestas (1)"))
      expect(controlDe(fila)).toBe(control)
      expect(screen.queryByText("Ver respuestas (0)")).toBeNull()
    },
  )

  it.each(["estudiante", "maestro"] as const)(
    "CL3-E14: %s · con n ≥ 1, plegado «Ver respuestas (n)» y desplegado «Ocultar respuestas»; borrar la última deja «Ocultar respuestas» y al plegar, «Responder»",
    async (rol) => {
      const { estado } = crearServidor(rol, [duda(1, { respuestas: 1 })])
      estado.respuestas[idDuda(1)] = [respuesta(1)]
      await abrirDudas(rol)
      const fila = await esperarFila("Duda 1")
      const control = controlDe(fila)
      expect(control).toHaveTextContent("Ver respuestas (1)")
      fireEvent.click(control)
      expect(control).toHaveTextContent("Ocultar respuestas")
      const unica = (await within(fila).findByText("Respuesta 1", undefined, ESPERA)).closest("li")
      if (unica === null) throw new Error("Precondición: la respuesta 1")
      fireEvent.click(within(unica).getByRole("button", { name: "Borrar" }))
      fireEvent.click(within(unica).getByRole("button", { name: "Sí, borrar respuesta" }))
      await waitFor(() => expect(within(fila).queryByText("Respuesta 1")).toBeNull())
      await reposar()
      expect(controlDe(fila)).toBe(control)
      expect(control).toHaveTextContent("Ocultar respuestas")
      fireEvent.click(control)
      expect(controlDe(fila)).toBe(control)
      expect(control).toHaveTextContent("Responder")
    },
  )

  it.each(["estudiante", "maestro"] as const)(
    "CL3-E14: %s · una recarga de la lista con el bloque plegado cambia «Responder» ↔ «Ver respuestas (1)» en el mismo botón y el foco se queda",
    async (rol) => {
      const { estado } = crearServidor(rol, [duda(1)])
      const cliente = clienteDePrueba()
      await abrirDudas(rol, cliente)
      const fila = await esperarFila("Duda 1")
      const control = controlDe(fila)
      control.focus()
      const laDuda = estado.dudas[0]
      if (laDuda === undefined) throw new Error("Precondición: la duda 1")
      laDuda.respuestas = 1
      await act(() => cliente.invalidateQueries({ queryKey: claveDudas }))
      await waitFor(() => expect(control).toHaveTextContent("Ver respuestas (1)"))
      expect(controlDe(fila)).toBe(control)
      expect(control).toHaveFocus()
      laDuda.respuestas = 0
      await act(() => cliente.invalidateQueries({ queryKey: claveDudas }))
      await waitFor(() => expect(control).toHaveTextContent("Responder"))
      expect(controlDe(fila)).toBe(control)
      expect(control).toHaveFocus()
    },
  )
})

describe("CL3-E15 · el control de las respuestas del admin", () => {
  it("CL3-E15: con 0 respuestas no hay control ni formulario; con n ≥ 1, «Ver respuestas (n)» y «Ocultar respuestas», sin formulario", async () => {
    const { estado } = crearServidor("admin", [duda(2, { respuestas: 1 }), duda(1)])
    estado.respuestas[idDuda(2)] = [respuesta(1)]
    await abrirDudas("admin")
    const sinRespuestas = await esperarFila("Duda 1")
    expect(sinRespuestas.querySelector("[data-desplegar-respuestas]")).toBeNull()
    expect(within(sinRespuestas).queryByRole("button", { name: "Responder" })).toBeNull()
    const conRespuestas = filaDe("Duda 2")
    const control = controlDe(conRespuestas)
    expect(control).toHaveTextContent("Ver respuestas (1)")
    fireEvent.click(control)
    expect(control).toHaveTextContent("Ocultar respuestas")
    await within(conRespuestas).findByText("Respuesta 1", undefined, ESPERA)
    expect(within(conRespuestas).queryByLabelText("Escribe una respuesta")).toBeNull()
  })

  it("CL3-E15: si una recarga baja el conteo a 0 con el control plegado y el foco en él, el control desaparece y el foco va a la fila", async () => {
    const { estado } = crearServidor("admin", [duda(1, { respuestas: 1 })])
    const cliente = clienteDePrueba()
    await abrirDudas("admin", cliente)
    const fila = await esperarFila("Duda 1")
    controlDe(fila).focus()
    const laDuda = estado.dudas[0]
    if (laDuda === undefined) throw new Error("Precondición: la duda 1")
    laDuda.respuestas = 0
    await act(() => cliente.invalidateQueries({ queryKey: claveDudas }))
    await waitFor(() => expect(fila.querySelector("[data-desplegar-respuestas]")).toBeNull())
    expect(fila).toHaveFocus()
    expect(document.activeElement).not.toBe(document.body)
  })

  it("CL3-E15: desplegado con el conteo en 0, el bloque sigue hasta que lo pliega y entonces el control desaparece con el foco en la fila", async () => {
    const { estado } = crearServidor("admin", [duda(1, { respuestas: 1 })])
    estado.respuestas[idDuda(1)] = [respuesta(1)]
    const cliente = clienteDePrueba()
    await abrirDudas("admin", cliente)
    const fila = await esperarFila("Duda 1")
    const control = controlDe(fila)
    fireEvent.click(control)
    await within(fila).findByText("Respuesta 1", undefined, ESPERA)
    const laDuda = estado.dudas[0]
    if (laDuda === undefined) throw new Error("Precondición: la duda 1")
    laDuda.respuestas = 0
    estado.respuestas[idDuda(1)] = []
    await act(() =>
      Promise.all([
        cliente.invalidateQueries({ queryKey: claveDudas }),
        cliente.invalidateQueries({ queryKey: claveRespuestas(1) }),
      ]),
    )
    await waitFor(() => expect(within(fila).queryByText("Respuesta 1")).toBeNull())
    expect(controlDe(fila)).toBe(control)
    expect(control).toHaveTextContent("Ocultar respuestas")
    control.focus()
    fireEvent.click(control)
    await waitFor(() => expect(fila.querySelector("[data-desplegar-respuestas]")).toBeNull())
    expect(fila).toHaveFocus()
  })
})

// Corrección de la ronda 1 de 03e (T-01 y T-02): hermanos y estados vecinos.
describe("corrección de la ronda 1 de 03e (T-01 y T-02)", () => {
  it("T-01: el foco sale del control a «Marcar como resuelta» y vuelve; una recarga quita el control: el foco va a la fila", async () => {
    const { estado } = crearServidor("admin", [duda(1, { respuestas: 1 })])
    const cliente = clienteDePrueba()
    await abrirDudas("admin", cliente)
    const fila = await esperarFila("Duda 1")
    const control = controlDe(fila)
    act(() => control.focus())
    act(() => within(fila).getByRole("button", { name: "Marcar como resuelta" }).focus())
    act(() => control.focus())
    const laDuda = estado.dudas[0]
    if (laDuda === undefined) throw new Error("Precondición: la duda 1")
    laDuda.respuestas = 0
    await act(() => cliente.invalidateQueries({ queryKey: claveDudas }))
    await waitFor(() => expect(fila.querySelector("[data-desplegar-respuestas]")).toBeNull())
    expect(fila).toHaveFocus()
  })

  it("T-01: con el foco en el control de otra duda, el control que desaparece en esta no mueve el foco", async () => {
    const { estado } = crearServidor("admin", [
      duda(2, { respuestas: 1 }),
      duda(1, { respuestas: 1 }),
    ])
    const cliente = clienteDePrueba()
    await abrirDudas("admin", cliente)
    const otra = await esperarFila("Duda 2")
    const fila = await esperarFila("Duda 1")
    const controlDeLaOtra = controlDe(otra)
    act(() => controlDe(fila).focus())
    act(() => controlDeLaOtra.focus())
    const laDuda = estado.dudas[1]
    if (laDuda === undefined) throw new Error("Precondición: la duda 1")
    laDuda.respuestas = 0
    await act(() => cliente.invalidateQueries({ queryKey: claveDudas }))
    await waitFor(() => expect(fila.querySelector("[data-desplegar-respuestas]")).toBeNull())
    await reposar()
    expect(controlDeLaOtra).toHaveFocus()
  })

  it("T-02: borrar la duda con 503 y sus respuestas abiertas: las respuestas y lo escrito siguen, sin volver a pedirlas ni otro mensaje", async () => {
    const { estado, fetchMock } = crearServidor("maestro", [duda(1, { respuestas: 1 })])
    estado.respuestas[idDuda(1)] = [respuesta(1)]
    await abrirDudas("maestro", clienteDePrueba())
    const fila = await esperarFila("Duda 1")
    fireEvent.click(controlDe(fila))
    await within(fila).findByText("Respuesta 1", undefined, ESPERA)
    escribirRespuesta(fila, "Borrador")
    const antes = pedidas(fetchMock, rutaRespuestas(1)).length
    estado.falla = ({ metodo }) =>
      metodo === "DELETE" ? errorJson(503, "SERVICIO_OCUPADO", OCUPADO) : null
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
    await waitFor(() => expect(avisosDeError()).toEqual([OCUPADO]))
    await reposar()
    expect(within(fila).getByText("Respuesta 1")).toBeInTheDocument()
    expect(within(fila).getByLabelText("Escribe una respuesta")).toHaveValue("Borrador")
    expect(within(fila).queryByRole("alert")).toBeNull()
    expect(pedidas(fetchMock, rutaRespuestas(1))).toHaveLength(antes)
  })

  it("T-02: abrir las respuestas de una duda que otra persona borró: un solo mensaje en el bloque, ningún aviso, y la lista se renueva y la fila sale", async () => {
    const { estado, fetchMock } = crearServidor("maestro", [duda(2), duda(1, { respuestas: 1 })])
    await abrirDudas("maestro")
    const fila = await esperarFila("Duda 1")
    await esperarFila("Duda 2")
    estado.dudas = estado.dudas.filter(({ id }) => id !== idDuda(1))
    const antes = pedidas(fetchMock, RUTA_DUDAS).length
    fireEvent.click(controlDe(fila))
    await waitFor(
      () => expect(pedidas(fetchMock, RUTA_DUDAS).length).toBeGreaterThan(antes),
      ESPERA,
    )
    await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
    expect(avisosDeError()).toEqual([])
    expect(screen.queryAllByRole("alert")).toHaveLength(0)
  })

  it("T-02: «Ver más respuestas» de una duda que otra persona borró: el bloque dice «Esa duda ya no existe.», ningún aviso, y la fila sale con la lista nueva", async () => {
    const { estado, fetchMock } = crearServidor("maestro", [duda(2), duda(1, { respuestas: 25 })])
    estado.respuestas[idDuda(1)] = Array.from({ length: 25 }, (_, i) => respuesta(i + 1))
    await abrirDudas("maestro")
    const fila = await esperarFila("Duda 1")
    fireEvent.click(controlDe(fila))
    const verMas = await within(fila).findByRole("button", { name: "Ver más respuestas" }, ESPERA)
    estado.dudas = estado.dudas.filter(({ id }) => id !== idDuda(1))
    const lista = retener(
      estado,
      ({ metodo, url }) => metodo === "GET" && url.pathname === RUTA_DUDAS,
    )
    fireEvent.click(verMas)
    expect(
      await within(fila).findByText("Esa duda ya no existe.", undefined, ESPERA),
    ).toBeInTheDocument()
    await waitFor(() => expect(pedidas(fetchMock, RUTA_DUDAS).length).toBeGreaterThan(1))
    expect(avisosDeError()).toEqual([])
    await act(async () => {
      lista(respuestaJson(200, { dudas: [duda(2)], siguienteCursor: null }))
      await Promise.resolve()
    })
    await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
    expect(avisosDeError()).toEqual([])
  })

  it("T-02: borrar una respuesta que otra persona ya borró (RESPUESTA_NO_ENCONTRADA): un aviso y se renuevan las respuestas y la lista", async () => {
    const { estado, fetchMock } = crearServidor("maestro", [duda(1, { respuestas: 2 })])
    estado.respuestas[idDuda(1)] = [respuesta(1), respuesta(2)]
    await abrirDudas("maestro")
    const fila = await esperarFila("Duda 1")
    fireEvent.click(controlDe(fila))
    const primera = (await within(fila).findByText("Respuesta 1", undefined, ESPERA)).closest("li")
    if (primera === null) throw new Error("Precondición: la respuesta 1")
    estado.respuestas[idDuda(1)] = [respuesta(2)]
    const laDuda = estado.dudas[0]
    if (laDuda === undefined) throw new Error("Precondición: la duda 1")
    laDuda.respuestas = 1
    const respuestasAntes = pedidas(fetchMock, rutaRespuestas(1)).length
    fireEvent.click(within(primera).getByRole("button", { name: "Borrar" }))
    fireEvent.click(within(primera).getByRole("button", { name: "Sí, borrar respuesta" }))
    await waitFor(() => expect(avisosDeError()).toEqual(["Esa respuesta ya no existe."]))
    await waitFor(() => expect(within(fila).queryByText("Respuesta 1")).toBeNull(), ESPERA)
    expect(pedidas(fetchMock, rutaRespuestas(1)).length).toBeGreaterThan(respuestasAntes)
    expect(within(fila).queryByRole("alert")).toBeNull()
  })
})

// Corrección de la ronda 2 de 03e (T-03 y T-04): estados vecinos de "una duda que deja de existir con su
// bloque de respuestas montado".
describe("corrección de la ronda 2 de 03e (T-03 y T-04)", () => {
  const esLaLista = ({ metodo, url }: Llamada) => metodo === "GET" && url.pathname === RUTA_DUDAS

  it("T-03: borrar (204) con dos páginas de respuestas abiertas: las que se veían siguen sin «Cargando…» mientras llega la lista; después la fila sale y las respuestas salen de la caché", async () => {
    const { estado, fetchMock } = crearServidor("maestro", [duda(2), duda(1, { respuestas: 25 })])
    estado.respuestas[idDuda(1)] = Array.from({ length: 25 }, (_, i) => respuesta(i + 1))
    const cliente = clienteDePrueba()
    await abrirDudas("maestro", cliente)
    const fila = await esperarFila("Duda 1")
    fireEvent.click(controlDe(fila))
    fireEvent.click(await within(fila).findByRole("button", { name: "Ver más respuestas" }, ESPERA))
    await within(fila).findByText("Respuesta 25", undefined, ESPERA)
    const pedidasAntes = pedidas(fetchMock, rutaRespuestas(1)).length
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
    const soltar = retener(estado, esLaLista)
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
    await waitFor(() => expect(avisosDeExito()).toEqual(["Duda borrada"]))
    // La vista se vuelve a pintar mientras llega la lista (pulsar la sección en la que ya se está).
    fireEvent.click(
      within(screen.getByRole("list", { name: "Secciones de la clase" })).getByRole("link", {
        name: "Dudas",
      }),
    )
    await reposar()
    expect(within(fila).getByText("Respuesta 1")).toBeInTheDocument()
    expect(within(fila).getByText("Respuesta 25")).toBeInTheDocument()
    expect(within(fila).queryByRole("status")).toBeNull()
    expect(cliente.getQueryData(claveRespuestas(1))).toBeDefined()
    await act(async () => {
      soltar(respuestaJson(200, { dudas: [duda(2)], siguienteCursor: null }))
      await Promise.resolve()
    })
    await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
    await reposar()
    expect(cliente.getQueryData(claveRespuestas(1))).toBeUndefined()
    expect(pedidas(fetchMock, rutaRespuestas(1))).toHaveLength(pedidasAntes)
    expect(avisosDeError()).toEqual([])
  })

  it("T-04: con el DELETE en vuelo, «Ver más respuestas» espera y no pide; con un 503 vuelve a pedir la página siguiente", async () => {
    const { estado, fetchMock } = crearServidor("maestro", [duda(1, { respuestas: 25 })])
    estado.respuestas[idDuda(1)] = Array.from({ length: 25 }, (_, i) => respuesta(i + 1))
    await abrirDudas("maestro", clienteDePrueba())
    const fila = await esperarFila("Duda 1")
    fireEvent.click(controlDe(fila))
    const verMas = await within(fila).findByRole("button", { name: "Ver más respuestas" }, ESPERA)
    const soltar = retener(estado, ({ metodo }) => metodo === "DELETE")
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
    await waitFor(() => expect(verMas).toHaveAttribute("aria-busy", "true"))
    const antes = pedidas(fetchMock, rutaRespuestas(1)).length
    fireEvent.click(verMas)
    await reposar()
    expect(pedidas(fetchMock, rutaRespuestas(1))).toHaveLength(antes)
    await act(async () => {
      soltar(errorJson(503, "SERVICIO_OCUPADO", OCUPADO))
      await Promise.resolve()
    })
    await waitFor(() => expect(avisosDeError()).toEqual([OCUPADO]))
    await waitFor(() => expect(verMas).not.toHaveAttribute("aria-busy", "true"))
    fireEvent.click(verMas)
    await within(fila).findByText("Respuesta 25", undefined, ESPERA)
    expect(pedidas(fetchMock, rutaRespuestas(1)).length).toBeGreaterThan(antes)
  })

  it("T-03: otra persona borra la duda y una recarga la quita: la fila sale sin pedir sus respuestas ni mostrar ningún mensaje", async () => {
    const { estado, fetchMock } = crearServidor("maestro", [duda(2), duda(1, { respuestas: 1 })])
    estado.respuestas[idDuda(1)] = [respuesta(1)]
    const cliente = clienteDePrueba()
    await abrirDudas("maestro", cliente)
    const fila = await esperarFila("Duda 1")
    fireEvent.click(controlDe(fila))
    await within(fila).findByText("Respuesta 1", undefined, ESPERA)
    const antes = pedidas(fetchMock, rutaRespuestas(1)).length
    estado.dudas = estado.dudas.filter(({ id }) => id !== idDuda(1))
    await act(() => cliente.invalidateQueries({ queryKey: claveDudas, exact: true }))
    await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
    await reposar()
    expect(pedidas(fetchMock, rutaRespuestas(1))).toHaveLength(antes)
    expect(avisosDeError()).toEqual([])
    expect(screen.queryAllByRole("alert")).toHaveLength(0)
  })

  it("T-03: con la vista desmontada mientras se borra la duda, al responder 204 sus respuestas salen de la caché", async () => {
    const { estado } = crearServidor("maestro", [duda(1, { respuestas: 1 })])
    estado.respuestas[idDuda(1)] = [respuesta(1)]
    const cliente = clienteDePrueba()
    const { router } = await abrirDudas("maestro", cliente)
    const fila = await esperarFila("Duda 1")
    fireEvent.click(controlDe(fila))
    await within(fila).findByText("Respuesta 1", undefined, ESPERA)
    const soltar = retener(estado, ({ metodo }) => metodo === "DELETE")
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
    await act(() => router.navigate(AVISOS("maestro")))
    await screen.findByText("Publica el primer aviso de tu clase.", undefined, ESPERA)
    await act(async () => {
      soltar(new Response(null, { status: 204 }))
      await Promise.resolve()
    })
    await waitFor(() => expect(avisosDeExito()).toEqual(["Duda borrada"]))
    await waitFor(() => expect(cliente.getQueryData(claveRespuestas(1))).toBeUndefined())
  })
})

// Corrección de M-01 de la verificación de la ronda 2 de 03e: desplegar el bloque y pulsar «Dudas»
// mientras la duda se borra o ya no existe.
describe("corrección de M-01 de la verificación de la ronda 2 de 03e", () => {
  const esLaListaDeDudas = ({ metodo, url }: Llamada) =>
    metodo === "GET" && url.pathname === RUTA_DUDAS
  const seccionDudas = () =>
    within(screen.getByRole("list", { name: "Secciones de la clase" })).getByRole("link", {
      name: "Dudas",
    })
  const RESPUESTAS_DEL_BORRADO = [
    ["204", () => new Response(null, { status: 204 }), "Duda borrada"],
    [
      "404",
      () => errorJson(404, "DUDA_NO_ENCONTRADA", "Esa duda ya no existe."),
      "Esa duda ya no existe.",
    ],
  ] as const

  // Prepara la duda 1 con una respuesta y la duda 2 de vecina; el DELETE responde lo que diga el caso y
  // la recarga de la lista que sigue queda retenida.
  const borrarConLaListaRetenida = async (
    estado: Estado,
    fila: HTMLElement,
    respuestaDelBorrado: () => Response,
  ) => {
    let soltarLista: (respuesta: Response) => void = () => {
      throw new Error("Precondición: la lista no se pidió")
    }
    let listaPedida = false
    estado.falla = (llamada) => {
      if (llamada.metodo === "DELETE") {
        estado.dudas = estado.dudas.filter(({ id }) => id !== idDuda(1))
        return respuestaDelBorrado()
      }
      if (!esLaListaDeDudas(llamada) || listaPedida) return null
      listaPedida = true
      return new Promise<Response>((resolver) => {
        soltarLista = resolver
      })
    }
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
    await waitFor(() => expect(listaPedida).toBe(true), ESPERA)
    return (respuesta: Response) => soltarLista(respuesta)
  }

  const sinNadaVivoEnLaFila = (fila: HTMLElement) => {
    expect(within(fila).queryByRole("status")).toBeNull()
    expect(within(fila).queryByRole("alert")).toBeNull()
    expect(within(fila).queryByText(/Cargando/)).toBeNull()
  }

  it.each(RESPUESTAS_DEL_BORRADO)(
    "M-01 (a): tras el %s del borrado, plegar y volver a desplegar mientras llega la lista no muestra «Cargando…» ni pide las respuestas",
    async (_codigo, respuestaDelBorrado, aviso) => {
      const { estado, fetchMock } = crearServidor("maestro", [duda(2), duda(1, { respuestas: 1 })])
      estado.respuestas[idDuda(1)] = [respuesta(1)]
      await abrirDudas("maestro", clienteDePrueba())
      const fila = await esperarFila("Duda 1")
      fireEvent.click(controlDe(fila))
      await within(fila).findByText("Respuesta 1", undefined, ESPERA)
      const antes = pedidas(fetchMock, rutaRespuestas(1)).length
      const soltarLista = await borrarConLaListaRetenida(estado, fila, respuestaDelBorrado)
      await waitFor(() => expect([...avisosDeExito(), ...avisosDeError()]).toEqual([aviso]))
      fireEvent.click(controlDe(fila))
      fireEvent.click(controlDe(fila))
      await reposar()
      sinNadaVivoEnLaFila(fila)
      expect(pedidas(fetchMock, rutaRespuestas(1))).toHaveLength(antes)
      await act(async () => {
        soltarLista(respuestaJson(200, { dudas: [duda(2)], siguienteCursor: null }))
        await Promise.resolve()
      })
      await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
      expect([...avisosDeExito(), ...avisosDeError()]).toEqual([aviso])
    },
  )

  it.each(RESPUESTAS_DEL_BORRADO)(
    "M-01 (a): con el bloque plegado cuando llega el %s, desplegarlo antes de la lista no muestra «Cargando…» ni pide las respuestas",
    async (_codigo, respuestaDelBorrado, aviso) => {
      const { estado, fetchMock } = crearServidor("maestro", [duda(2), duda(1, { respuestas: 1 })])
      estado.respuestas[idDuda(1)] = [respuesta(1)]
      await abrirDudas("maestro", clienteDePrueba())
      const fila = await esperarFila("Duda 1")
      fireEvent.click(controlDe(fila))
      await within(fila).findByText("Respuesta 1", undefined, ESPERA)
      fireEvent.click(controlDe(fila))
      const antes = pedidas(fetchMock, rutaRespuestas(1)).length
      const soltarLista = await borrarConLaListaRetenida(estado, fila, respuestaDelBorrado)
      await waitFor(() => expect([...avisosDeExito(), ...avisosDeError()]).toEqual([aviso]))
      fireEvent.click(controlDe(fila))
      await reposar()
      sinNadaVivoEnLaFila(fila)
      expect(pedidas(fetchMock, rutaRespuestas(1))).toHaveLength(antes)
      await act(async () => {
        soltarLista(respuestaJson(200, { dudas: [duda(2)], siguienteCursor: null }))
        await Promise.resolve()
      })
      await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
    },
  )

  // El bloque abierto en error R9: su primera carga falló con 500.
  const conElBloqueEnError = async () => {
    const servidor = crearServidor("maestro", [duda(2), duda(1, { respuestas: 1 })])
    servidor.estado.respuestas[idDuda(1)] = [respuesta(1)]
    let fallando = true
    servidor.estado.falla = ({ metodo, url }) =>
      fallando && metodo === "GET" && url.pathname === rutaRespuestas(1)
        ? errorJson(500, "ERROR_INTERNO", "Falló.")
        : null
    await abrirDudas("maestro", clienteDePrueba())
    const fila = await esperarFila("Duda 1")
    fireEvent.click(controlDe(fila))
    const alerta = await within(fila).findByRole("alert", undefined, ESPERA)
    fallando = false
    return { ...servidor, fila, alerta }
  }

  it.each(RESPUESTAS_DEL_BORRADO)(
    "M-01 (b): con el bloque en error y el %s del borrado, pulsar «Dudas» mientras llega la lista no pide las respuestas ni cambia el mensaje del bloque",
    async (_codigo, respuestaDelBorrado, aviso) => {
      const { estado, fetchMock, fila, alerta } = await conElBloqueEnError()
      const textoDelBloque = alerta.textContent
      const antes = pedidas(fetchMock, rutaRespuestas(1)).length
      const soltarLista = await borrarConLaListaRetenida(estado, fila, respuestaDelBorrado)
      await waitFor(() => expect([...avisosDeExito(), ...avisosDeError()]).toEqual([aviso]))
      fireEvent.click(seccionDudas())
      await reposar()
      expect(pedidas(fetchMock, rutaRespuestas(1))).toHaveLength(antes)
      expect(within(fila).getByRole("alert").textContent).toBe(textoDelBloque)
      await act(async () => {
        soltarLista(respuestaJson(200, { dudas: [duda(2)], siguienteCursor: null }))
        await Promise.resolve()
      })
      await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
      expect([...avisosDeExito(), ...avisosDeError()]).toEqual([aviso])
    },
  )

  it("M-01 (b): con el bloque en error y un 503 del borrado, pulsar «Dudas» sí vuelve a pedir las respuestas y el error se va", async () => {
    const { estado, fetchMock, fila } = await conElBloqueEnError()
    estado.falla = ({ metodo }) =>
      metodo === "DELETE" ? errorJson(503, "SERVICIO_OCUPADO", OCUPADO) : null
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
    await waitFor(() => expect(avisosDeError()).toEqual([OCUPADO]))
    await reposar()
    const antes = pedidas(fetchMock, rutaRespuestas(1)).length
    fireEvent.click(seccionDudas())
    await within(fila).findByText("Respuesta 1", undefined, ESPERA)
    expect(within(fila).queryByRole("alert")).toBeNull()
    expect(pedidas(fetchMock, rutaRespuestas(1)).length).toBeGreaterThan(antes)
  })
})

// Corrección de la ronda 3 de 03e (T-05): ninguna consulta de las respuestas de una duda que se va queda
// en la caché, por cada camino.
describe("corrección de la ronda 3 de 03e (T-05)", () => {
  const BORRADOS = [
    ["204", () => new Response(null, { status: 204 })],
    ["404", () => errorJson(404, "DUDA_NO_ENCONTRADA", "Esa duda ya no existe.")],
  ] as const

  const consultasDeRespuestas = (cliente: QueryClient) =>
    cliente.getQueryCache().findAll({ queryKey: claveRespuestas(1), exact: true }).length

  // La duda 1 con una respuesta y la 2 de vecina; el DELETE responde lo que diga el caso y la recarga de
  // la lista que sigue queda retenida hasta que la prueba la suelta.
  const preparar = async (plegarAntes: boolean) => {
    const servidor = crearServidor("maestro", [duda(2), duda(1, { respuestas: 1 })])
    servidor.estado.respuestas[idDuda(1)] = [respuesta(1)]
    const cliente = clienteDePrueba()
    const montaje = await abrirDudas("maestro", cliente)
    const fila = await esperarFila("Duda 1")
    fireEvent.click(controlDe(fila))
    await within(fila).findByText("Respuesta 1", undefined, ESPERA)
    if (plegarAntes) fireEvent.click(controlDe(fila))
    return { ...servidor, ...montaje, cliente, fila }
  }

  const borrar = async (
    estado: Estado,
    fila: HTMLElement,
    respuestaDelBorrado: () => Response,
    respuestaDeLaLista: () => Response,
  ) => {
    let soltarLista: () => void = () => {
      throw new Error("Precondición: la lista no se pidió")
    }
    let listaPedida = false
    estado.falla = (llamada) => {
      if (llamada.metodo === "DELETE") {
        estado.dudas = estado.dudas.filter(({ id }) => id !== idDuda(1))
        return respuestaDelBorrado()
      }
      if (llamada.metodo !== "GET" || llamada.url.pathname !== RUTA_DUDAS || listaPedida) {
        return null
      }
      listaPedida = true
      return new Promise<Response>((resolver) => {
        soltarLista = () => resolver(respuestaDeLaLista())
      })
    }
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar duda" }))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar duda" }))
    await waitFor(() => expect(listaPedida).toBe(true), ESPERA)
    return async () => {
      await act(async () => {
        soltarLista()
        await Promise.resolve()
      })
    }
  }

  const listaSinLaDuda = () => respuestaJson(200, { dudas: [duda(2)], siguienteCursor: null })

  it.each(BORRADOS)(
    "T-05: tras el %s, plegar y desplegar tres veces mientras llega la lista: al salir la fila, ninguna consulta de sus respuestas",
    async (_codigo, respuestaDelBorrado) => {
      const { estado, cliente, fila } = await preparar(false)
      const soltar = await borrar(estado, fila, respuestaDelBorrado, listaSinLaDuda)
      for (let vez = 0; vez < 3; vez += 1) {
        fireEvent.click(controlDe(fila))
        await reposar()
        fireEvent.click(controlDe(fila))
        await reposar()
      }
      await soltar()
      await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
      await reposar()
      expect(consultasDeRespuestas(cliente)).toBe(0)
    },
  )

  it.each(BORRADOS)(
    "T-05: con el bloque plegado cuando llega el %s, desplegarlo antes de la lista: al salir la fila, ninguna consulta de sus respuestas",
    async (_codigo, respuestaDelBorrado) => {
      const { estado, cliente, fila } = await preparar(true)
      const soltar = await borrar(estado, fila, respuestaDelBorrado, listaSinLaDuda)
      fireEvent.click(controlDe(fila))
      await reposar()
      await soltar()
      await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
      await reposar()
      expect(consultasDeRespuestas(cliente)).toBe(0)
    },
  )

  it("T-05: tras el 204, desplegar y salir de la vista antes de la lista: no queda ninguna consulta de sus respuestas", async () => {
    const { estado, cliente, fila, router } = await preparar(true)
    const soltar = await borrar(
      estado,
      fila,
      () => new Response(null, { status: 204 }),
      listaSinLaDuda,
    )
    fireEvent.click(controlDe(fila))
    await reposar()
    await act(() => router.navigate(AVISOS("maestro")))
    await screen.findByText("Publica el primer aviso de tu clase.", undefined, ESPERA)
    await reposar()
    expect(consultasDeRespuestas(cliente)).toBe(0)
    await soltar()
    await reposar()
    expect(consultasDeRespuestas(cliente)).toBe(0)
  })

  it("T-05: tras el 204, si la recarga de la lista falla (la lista se reemplaza por el error), no queda ninguna consulta de sus respuestas", async () => {
    const { estado, cliente, fila } = await preparar(false)
    const soltar = await borrar(
      estado,
      fila,
      () => new Response(null, { status: 204 }),
      () => errorJson(500, "ERROR_INTERNO", "Falló."),
    )
    fireEvent.click(controlDe(fila))
    await reposar()
    fireEvent.click(controlDe(fila))
    await reposar()
    await soltar()
    await waitFor(() => expect(fila.isConnected).toBe(false), ESPERA)
    await reposar()
    expect(consultasDeRespuestas(cliente)).toBe(0)
  })
})
