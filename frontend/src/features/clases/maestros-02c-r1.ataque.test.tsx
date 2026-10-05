import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ClaseLayout } from "./clase-layout"
import { CrearClaseView } from "./crear-clase-view"
import { EditarClaseView } from "./editar-clase-view"
import { MaestrosDeClaseView } from "./maestros-de-clase-view"

// Tester, CLASES-02c, ronda 1. El selector de 1 o 2 maestros al crear una clase, editar la clase y
// "Maestros de la clase" del admin: tope, repetidos, quitar al último, búsqueda corta, errores del
// servidor (TOPE_DE_MAESTROS, MAESTRO_NO_ENCONTRADO, CLASE_SIN_MAESTRO, VALIDACION, 503 y sin
// conexión), máximos del nombre y la descripción, doble envío y el foco de DESIGN.md §7.14. Sin
// selectores de clases de estilo: rol, etiqueta y texto accesible.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin/clases") }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const LUIS = {
  id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
  nombre: "Luis Pérez",
  email: "luis@x.mx",
}
const MARIA = {
  id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d10",
  nombre: "María Gómez",
  email: "maria@x.mx",
}
const SOFIA = {
  id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11",
  nombre: "Sofía Ruiz",
  email: "sofia@x.mx",
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorJson = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const OCUPADO = "El servicio está ocupado en este momento. Inténtalo de nuevo en unos segundos."

const diferido = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

type Manejador = (
  ruta: string,
  metodo: string,
  cuerpo: unknown,
) => Response | Promise<Response> | undefined

const stubFetch = (manejador: Manejador) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const ruta = String(entrada)
    const metodo = init?.method ?? "GET"
    const cuerpo: unknown = init?.body ? JSON.parse(String(init.body)) : undefined
    const propia = manejador(ruta, metodo, cuerpo)
    if (propia) return Promise.resolve(propia)
    if (ruta.startsWith("/api/admin/maestros/candidatos")) {
      return Promise.resolve(
        respuestaJson(200, { candidatos: [LUIS, MARIA, SOFIA], hayMas: false }),
      )
    }
    return Promise.resolve(errorJson(500, "ERROR_INTERNO", "mensaje del servidor"))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadas = (fetchMock: ReturnType<typeof stubFetch>, metodo: string, parte: string) =>
  fetchMock.mock.calls.filter(
    ([entrada, init]) => (init?.method ?? "GET") === metodo && String(entrada).includes(parte),
  )

const nuevoCliente = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

const renderCrear = () =>
  render(
    <QueryClientProvider client={nuevoCliente()}>
      <MemoryRouter initialEntries={["/admin/clases/nueva"]}>
        <Routes>
          <Route path="/admin/clases/nueva" element={<CrearClaseView />} />
          <Route path="/admin/clases/:claseId" element={<p>clase creada</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const renderEnClase = (ruta: string) =>
  render(
    <QueryClientProvider client={nuevoCliente()}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/admin/clases/:claseId" element={<ClaseLayout />}>
            <Route index element={<p>muro</p>} />
            <Route path="maestros" element={<MaestrosDeClaseView />} />
            <Route path="editar" element={<EditarClaseView />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const detalle = (maestros: { id: string; nombre: string }[], extra: Record<string, unknown> = {}) =>
  respuestaJson(200, {
    clase: {
      id: CLASE_ID,
      nombre: "Álgebra I",
      descripcion: "Curso",
      maestro: maestros[0],
      maestros,
      ...extra,
    },
  })

const esperar = (ms: number) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))

const buscar = (texto: string) =>
  fireEvent.change(screen.getByLabelText("Buscar maestro por nombre"), { target: { value: texto } })

const elegir = async (nombre: string) => {
  buscar(nombre.slice(0, 4))
  fireEvent.click(await screen.findByRole("button", { name: `Elegir ${nombre}` }))
}

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque CLASES-02c r1: el selector de maestros al crear una clase", () => {
  it.each(["L", "Lu", "  Lu  "])(
    "con «%s» (menos de 3 letras) no pide candidatos",
    async (texto) => {
      const fetchMock = stubFetch(() => undefined)
      renderCrear()
      buscar(texto)
      await esperar(500)
      expect(llamadas(fetchMock, "GET", "/api/admin/maestros/candidatos")).toHaveLength(0)
      expect(screen.queryByRole("button", { name: /^Elegir / })).toBeNull()
    },
  )

  it("con dos elegidos el buscador se oculta con su nota y el foco va a un «Quitar»; al quitar a uno vuelve el buscador; al quitar al último el foco va al buscador", async () => {
    stubFetch(() => undefined)
    renderCrear()
    await elegir("Luis Pérez")
    expect(await screen.findByText("Ya elegido")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Elegir Luis Pérez" })).toBeNull()
    const elegirMaria = screen.getByRole("button", { name: "Elegir María Gómez" })
    act(() => elegirMaria.focus())
    fireEvent.click(elegirMaria)

    expect(
      await screen.findByText("Ya elegiste 2 maestros. Quita a uno para elegir a otro."),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText("Buscar maestro por nombre")).toBeNull()
    await esperar(30)
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement?.textContent ?? "").toMatch(/^Quitar /)

    const quitarLuis = screen.getByRole("button", { name: "Quitar Luis Pérez" })
    act(() => quitarLuis.focus())
    fireEvent.click(quitarLuis)
    await esperar(30)
    expect(screen.getByLabelText("Buscar maestro por nombre")).toBeInTheDocument()
    expect(document.activeElement).not.toBe(document.body)

    const quitarMaria = screen.getByRole("button", { name: "Quitar María Gómez" })
    act(() => quitarMaria.focus())
    fireEvent.click(quitarMaria)
    await esperar(30)
    expect(screen.queryByRole("button", { name: /^Quitar / })).toBeNull()
    expect(document.activeElement).toBe(screen.getByLabelText("Buscar maestro por nombre"))
  })

  it("dos clics seguidos en «Elegir» del mismo maestro no lo eligen dos veces", async () => {
    const fetchMock = stubFetch((ruta, metodo) =>
      ruta === "/api/admin/clases" && metodo === "POST" ? diferido().promesa : undefined,
    )
    renderCrear()
    fireEvent.change(screen.getByLabelText("Nombre de la clase"), { target: { value: "Historia" } })
    buscar("Luis")
    const boton = await screen.findByRole("button", { name: "Elegir Luis Pérez" })
    fireEvent.click(boton)
    fireEvent.click(boton)
    await esperar(30)
    expect(screen.getAllByRole("button", { name: "Quitar Luis Pérez" })).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "Crear clase" }))
    await waitFor(() => expect(llamadas(fetchMock, "POST", "/api/admin/clases")).toHaveLength(1))
    const cuerpo = JSON.parse(
      String(llamadas(fetchMock, "POST", "/api/admin/clases")[0]?.[1]?.body),
    )
    expect(cuerpo).toEqual({ nombre: "Historia", maestroIds: [LUIS.id] })
  })

  it("sin elegidos: «Elige al menos un maestro» y no se pide nada; al elegir, el error se va", async () => {
    const fetchMock = stubFetch(() => undefined)
    renderCrear()
    fireEvent.change(screen.getByLabelText("Nombre de la clase"), { target: { value: "Historia" } })
    fireEvent.click(screen.getByRole("button", { name: "Crear clase" }))
    expect(await screen.findByText("Elige al menos un maestro")).toBeInTheDocument()
    expect(llamadas(fetchMock, "POST", "/api/")).toHaveLength(0)
    await elegir("Luis Pérez")
    await waitFor(() => expect(screen.queryByText("Elige al menos un maestro")).toBeNull())
  })

  it.each([
    [
      "404 MAESTRO_NO_ENCONTRADO",
      () => errorJson(404, "MAESTRO_NO_ENCONTRADO", "No encontramos a ese maestro."),
      "No encontramos a ese maestro.",
    ],
    [
      "409 TOPE_DE_MAESTROS",
      () =>
        errorJson(
          409,
          "TOPE_DE_MAESTROS",
          "La clase ya tiene 2 maestros. Quita a uno antes de asignar a otro.",
        ),
      "La clase ya tiene 2 maestros. Quita a uno antes de asignar a otro.",
    ],
    ["503 SERVICIO_OCUPADO", () => errorJson(503, "SERVICIO_OCUPADO", OCUPADO), null],
    ["sin conexión", () => Promise.reject(new TypeError("Failed to fetch")), null],
  ] as const)(
    "%s al crear: un solo aviso en español, el botón se libera y se conservan el nombre y los elegidos",
    async (_caso, respuesta, mensaje) => {
      stubFetch((ruta, metodo) =>
        ruta === "/api/admin/clases" && metodo === "POST" ? (respuesta() as Response) : undefined,
      )
      renderCrear()
      fireEvent.change(screen.getByLabelText("Nombre de la clase"), {
        target: { value: "Historia" },
      })
      await elegir("Luis Pérez")
      fireEvent.click(screen.getByRole("button", { name: "Crear clase" }))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
      const texto = String(aviso.error.mock.calls[0]?.[0])
      if (mensaje !== null) expect(texto).toBe(mensaje)
      expect(texto).not.toMatch(/^[a-zA-Z_]+:|mensaje del servidor|Failed to fetch|undefined/)
      expect(texto).toMatch(/[a-záéíóúñ]/)
      await esperar(30)
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(aviso.success).not.toHaveBeenCalled()
      expect(screen.getByRole("button", { name: "Crear clase" })).not.toHaveAttribute(
        "aria-busy",
        "true",
      )
      expect(screen.getByLabelText("Nombre de la clase")).toHaveValue("Historia")
      expect(screen.getByRole("button", { name: "Quitar Luis Pérez" })).toBeInTheDocument()
      expect(screen.getByLabelText("Nombre de la clase")).not.toHaveAttribute(
        "aria-invalid",
        "true",
      )
    },
  )

  it("un VALIDACION de maestroIds del servidor queda bajo el selector, sin prefijo y sin aviso", async () => {
    stubFetch((ruta, metodo) =>
      ruta === "/api/admin/clases" && metodo === "POST"
        ? errorJson(400, "VALIDACION", "maestroIds: No repitas un maestro")
        : undefined,
    )
    renderCrear()
    fireEvent.change(screen.getByLabelText("Nombre de la clase"), { target: { value: "Historia" } })
    await elegir("Luis Pérez")
    fireEvent.click(screen.getByRole("button", { name: "Crear clase" }))
    expect(await screen.findByText("No repitas un maestro")).toBeInTheDocument()
    expect(screen.queryByText(/maestroIds:/)).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("doble clic en «Crear clase» (el mismo instante y a 30 ms): una sola petición", async () => {
    const enVuelo = diferido()
    const fetchMock = stubFetch((ruta, metodo) =>
      ruta === "/api/admin/clases" && metodo === "POST" ? enVuelo.promesa : undefined,
    )
    renderCrear()
    fireEvent.change(screen.getByLabelText("Nombre de la clase"), { target: { value: "Historia" } })
    await elegir("Luis Pérez")
    const crear = screen.getByRole("button", { name: "Crear clase" })
    fireEvent.click(crear)
    fireEvent.click(crear)
    await esperar(30)
    fireEvent.click(crear)
    expect(llamadas(fetchMock, "POST", "/api/admin/clases")).toHaveLength(1)
  })
})

describe("ataque CLASES-02c r1: contenido visible y máximos al crear y al editar", () => {
  const nombres: [string, string, string | null][] = [
    ["121 letras", "A".repeat(121), "El nombre no puede tener más de 120 caracteres"],
    ["solo invisibles", "\u{200B}\u{2800}\u{3164}", "El nombre debe tener al menos 2 caracteres"],
    ["solo espacios", "     ", "El nombre debe tener al menos 2 caracteres"],
    ["dos líneas (U+2028)", "Uno\u{2028}Dos", "El nombre debe ser de una sola línea"],
    ["120 letras", "B".repeat(120), null],
    ["60 emojis", "\u{1F9EA}".repeat(60), null],
  ]

  it.each(nombres)("crear con un nombre de %s", async (_caso, nombre, error) => {
    const fetchMock = stubFetch((ruta, metodo) =>
      ruta === "/api/admin/clases" && metodo === "POST" ? diferido().promesa : undefined,
    )
    renderCrear()
    fireEvent.change(screen.getByLabelText("Nombre de la clase"), { target: { value: nombre } })
    await elegir("Luis Pérez")
    fireEvent.click(screen.getByRole("button", { name: "Crear clase" }))
    await esperar(30)
    if (error === null) {
      expect(llamadas(fetchMock, "POST", "/api/admin/clases")).toHaveLength(1)
      return
    }
    expect(screen.getByText(error)).toBeInTheDocument()
    expect(screen.getByLabelText("Nombre de la clase")).toHaveAttribute("aria-invalid", "true")
    expect(llamadas(fetchMock, "POST", "/api/admin/clases")).toHaveLength(0)
  })

  it("crear con una descripción de 2001 caracteres no envía; con 2000 entre saltos CRLF envía la normalizada", async () => {
    const fetchMock = stubFetch((ruta, metodo) =>
      ruta === "/api/admin/clases" && metodo === "POST" ? diferido().promesa : undefined,
    )
    renderCrear()
    fireEvent.change(screen.getByLabelText("Nombre de la clase"), { target: { value: "Historia" } })
    await elegir("Luis Pérez")
    const descripcion = screen.getByLabelText("Descripción (opcional)")
    fireEvent.change(descripcion, { target: { value: "x".repeat(2001) } })
    fireEvent.click(screen.getByRole("button", { name: "Crear clase" }))
    expect(await screen.findByText("No puede tener más de 2000 caracteres")).toBeInTheDocument()
    expect(llamadas(fetchMock, "POST", "/api/admin/clases")).toHaveLength(0)
    fireEvent.change(descripcion, { target: { value: `\r\n${"y".repeat(2000)}\r\n` } })
    fireEvent.click(screen.getByRole("button", { name: "Crear clase" }))
    await waitFor(() => expect(llamadas(fetchMock, "POST", "/api/admin/clases")).toHaveLength(1))
    const cuerpo = JSON.parse(
      String(llamadas(fetchMock, "POST", "/api/admin/clases")[0]?.[1]?.body),
    )
    expect(cuerpo).toEqual({
      nombre: "Historia",
      descripcion: "y".repeat(2000),
      maestroIds: [LUIS.id],
    })
  })

  it.each(nombres)("editar con un nombre de %s", async (_caso, nombre, error) => {
    const fetchMock = stubFetch((ruta, metodo) => {
      if (ruta === `/api/clases/${CLASE_ID}` && metodo === "GET") return detalle([LUIS])
      if (ruta === `/api/clases/${CLASE_ID}/codigo`)
        return respuestaJson(200, { codigo: "ABCDEFG" })
      if (ruta === `/api/admin/clases/${CLASE_ID}` && metodo === "PUT") return diferido().promesa
      return undefined
    })
    renderEnClase(`/admin/clases/${CLASE_ID}/editar`)
    const campo = await screen.findByLabelText("Nombre de la clase")
    fireEvent.change(campo, { target: { value: nombre } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await esperar(30)
    if (error === null) {
      expect(llamadas(fetchMock, "PUT", `/api/admin/clases/${CLASE_ID}`)).toHaveLength(1)
      return
    }
    expect(screen.getByText(error)).toBeInTheDocument()
    expect(llamadas(fetchMock, "PUT", "/api/")).toHaveLength(0)
  })

  it("editar: 503, doble clic y «Cancelar» vuelven a la clase del admin; el PUT va a la ruta del admin", async () => {
    let respuestaDelPut: () => Response | Promise<Response> = () =>
      errorJson(503, "SERVICIO_OCUPADO", OCUPADO)
    const fetchMock = stubFetch((ruta, metodo) => {
      if (ruta === `/api/clases/${CLASE_ID}` && metodo === "GET") return detalle([LUIS])
      if (ruta === `/api/clases/${CLASE_ID}/codigo`)
        return respuestaJson(200, { codigo: "ABCDEFG" })
      if (ruta === `/api/admin/clases/${CLASE_ID}` && metodo === "PUT") return respuestaDelPut()
      return undefined
    })
    renderEnClase(`/admin/clases/${CLASE_ID}/editar`)
    await screen.findByLabelText("Nombre de la clase")
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      `/admin/clases/${CLASE_ID}`,
    )
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(String(aviso.error.mock.calls[0]?.[0])).toMatch(/[a-záéíóúñ]/)
    expect(screen.getByRole("button", { name: "Guardar cambios" })).not.toHaveAttribute(
      "aria-busy",
      "true",
    )

    const enVuelo = diferido()
    respuestaDelPut = () => enVuelo.promesa
    const guardar = screen.getByRole("button", { name: "Guardar cambios" })
    fireEvent.click(guardar)
    fireEvent.click(guardar)
    await esperar(30)
    fireEvent.click(guardar)
    expect(llamadas(fetchMock, "PUT", "/api/")).toHaveLength(2)
    expect(llamadas(fetchMock, "PUT", "/api/clases/")).toHaveLength(0)
  })
})

describe("ataque CLASES-02c r1: «Maestros de la clase»", () => {
  const ruta = `/admin/clases/${CLASE_ID}/maestros`

  it("con uno: sin «Quitar», con la nota; el que ya da la clase sale como «Ya da esta clase» y sin «Asignar»", async () => {
    stubFetch((r, m) =>
      r === `/api/clases/${CLASE_ID}` && m === "GET" ? detalle([LUIS]) : undefined,
    )
    renderEnClase(ruta)
    await screen.findByRole("heading", { name: "Maestros de la clase" })
    expect(screen.queryByRole("button", { name: /^Quitar / })).toBeNull()
    expect(
      screen.getByText(
        "Una clase necesita al menos un maestro. Asigna a otro antes de quitar a este.",
      ),
    ).toBeInTheDocument()
    buscar("Luis")
    const resultados = await screen.findByRole("list", { name: "Resultados de la búsqueda" })
    expect(within(resultados).getByText("Ya da esta clase")).toBeInTheDocument()
    expect(
      within(resultados).queryByRole("button", { name: "Asignar a la clase Luis Pérez" }),
    ).toBeNull()
    expect(
      within(resultados).getByRole("button", { name: "Asignar a la clase María Gómez" }),
    ).toBeInTheDocument()
  })

  it.each(["L", "Lu", " a "])("con «%s» no pide candidatos", async (texto) => {
    const fetchMock = stubFetch((r, m) =>
      r === `/api/clases/${CLASE_ID}` && m === "GET" ? detalle([LUIS]) : undefined,
    )
    renderEnClase(ruta)
    await screen.findByRole("heading", { name: "Maestros de la clase" })
    buscar(texto)
    await esperar(500)
    expect(llamadas(fetchMock, "GET", "/api/admin/maestros/candidatos")).toHaveLength(0)
  })

  // El POST y la recarga de la clase quedan en vuelo por separado: así se distingue el doble clic con
  // la petición en vuelo (enEspera) del clic que llega con el POST ya respondido y la clase todavía
  // sin recargar (el botón sigue ahí si la interfaz no lo retira).
  const montarAsignar = async () => {
    const post = diferido()
    const recarga = diferido()
    let detalles = 0
    const fetchMock = stubFetch((r, m) => {
      if (r === `/api/clases/${CLASE_ID}` && m === "GET") {
        detalles += 1
        return detalles === 1 ? detalle([LUIS]) : recarga.promesa.then(() => detalle([LUIS, MARIA]))
      }
      // Como el servidor real (asignar es idempotente): cada POST responde 200 con un cuerpo nuevo.
      if (r === `/api/admin/clases/${CLASE_ID}/maestros` && m === "POST") {
        return post.promesa.then(() => respuestaJson(200, { maestros: [LUIS, MARIA] }))
      }
      return undefined
    })
    renderEnClase(ruta)
    await screen.findByRole("heading", { name: "Maestros de la clase" })
    buscar("Mari")
    const asignar = await screen.findByRole("button", { name: "Asignar a la clase María Gómez" })
    act(() => asignar.focus())
    return { fetchMock, post, recarga, asignar }
  }

  it("asignar: doble clic humano (30 ms) con el POST en vuelo manda un solo POST con el id", async () => {
    const { fetchMock, asignar } = await montarAsignar()
    fireEvent.click(asignar)
    await esperar(30)
    fireEvent.click(asignar)
    await esperar(30)
    expect(asignar).toHaveAttribute("aria-busy", "true")
    expect(llamadas(fetchMock, "POST", "/maestros")).toHaveLength(1)
    const cuerpo = JSON.parse(String(llamadas(fetchMock, "POST", "/maestros")[0]?.[1]?.body))
    expect(cuerpo).toEqual({ maestroId: MARIA.id })
  })

  it("asignar: con el POST ya respondido y la clase sin recargar, un segundo clic en «Asignar a la clase» del mismo maestro no manda otro POST ni otro aviso", async () => {
    const { fetchMock, post, asignar } = await montarAsignar()
    fireEvent.click(asignar)
    await act(async () => {
      post.resolver(respuestaJson(200, { maestros: [LUIS, MARIA] }))
      await post.promesa
    })
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Asignaste a María Gómez"))
    const otraVez = screen.queryByRole("button", { name: "Asignar a la clase María Gómez" })
    if (otraVez) fireEvent.click(otraVez)
    await esperar(30)
    expect({
      posts: llamadas(fetchMock, "POST", "/maestros").length,
      avisosDeExito: aviso.success.mock.calls.length,
    }).toEqual({ posts: 1, avisosDeExito: 1 })
  })

  it("asignar: al recargar la clase con dos maestros, el buscador se oculta con su nota y el foco que estaba en «Asignar» no cae en <body>", async () => {
    const { post, recarga, asignar } = await montarAsignar()
    fireEvent.click(asignar)
    await act(async () => {
      post.resolver(respuestaJson(200, { maestros: [LUIS, MARIA] }))
      await post.promesa
    })
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Asignaste a María Gómez"))
    await act(async () => {
      recarga.resolver(detalle([LUIS, MARIA]))
      await recarga.promesa
    })
    expect(
      await screen.findByText("La clase ya tiene 2 maestros. Quita a uno para asignar a otro."),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText("Buscar maestro por nombre")).toBeNull()
    await esperar(30)
    expect(document.activeElement).not.toBe(document.body)
    expect(aviso.success).toHaveBeenCalledTimes(1)
  })

  const montarQuitar = async () => {
    const borrado = diferido()
    const recarga = diferido()
    let detalles = 0
    const fetchMock = stubFetch((r, m) => {
      if (r === `/api/clases/${CLASE_ID}` && m === "GET") {
        detalles += 1
        return detalles === 1
          ? detalle([LUIS, MARIA])
          : recarga.promesa.then(() => detalle([MARIA]))
      }
      if (r === `/api/admin/clases/${CLASE_ID}/maestros/${LUIS.id}` && m === "DELETE") {
        // Como el servidor real (retirar es idempotente): cada DELETE responde 200 con un cuerpo nuevo.
        return borrado.promesa.then(() => respuestaJson(200, { maestros: [MARIA] }))
      }
      return undefined
    })
    renderEnClase(ruta)
    await screen.findByRole("button", { name: "Quitar Luis Pérez" })
    return { fetchMock, borrado, recarga }
  }

  it("quitar: el foco va a «Cancelar» y vuelve a «Quitar»; doble clic humano (30 ms) en «Sí, quitar» con el DELETE en vuelo manda uno solo", async () => {
    const { fetchMock } = await montarQuitar()
    const quitar = screen.getByRole("button", { name: "Quitar Luis Pérez" })
    act(() => quitar.focus())
    fireEvent.click(quitar)
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar Luis Pérez" }))
    expect(
      screen.getByText("Dejará de ver la clase. Lo que publicó se queda en el muro."),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Cancelar Luis Pérez" }))
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Quitar Luis Pérez" }))

    fireEvent.click(screen.getByRole("button", { name: "Quitar Luis Pérez" }))
    const si = screen.getByRole("button", { name: "Sí, quitar Luis Pérez" })
    act(() => si.focus())
    fireEvent.click(si)
    await esperar(30)
    fireEvent.click(si)
    await esperar(30)
    expect(si).toHaveAttribute("aria-busy", "true")
    expect(llamadas(fetchMock, "DELETE", "/maestros/")).toHaveLength(1)
  })

  it("quitar: con el DELETE ya respondido y la clase sin recargar, un segundo clic en «Sí, quitar» no manda otro DELETE ni otro aviso", async () => {
    const { fetchMock, borrado } = await montarQuitar()
    fireEvent.click(screen.getByRole("button", { name: "Quitar Luis Pérez" }))
    const si = screen.getByRole("button", { name: "Sí, quitar Luis Pérez" })
    act(() => si.focus())
    fireEvent.click(si)
    await act(async () => {
      borrado.resolver(respuestaJson(200, { maestros: [MARIA] }))
      await borrado.promesa
    })
    await waitFor(() =>
      expect(aviso.success).toHaveBeenCalledWith("Quitaste a Luis Pérez de la clase"),
    )
    const otraVez = screen.queryByRole("button", { name: "Sí, quitar Luis Pérez" })
    if (otraVez) fireEvent.click(otraVez)
    await esperar(30)
    expect({
      deletes: llamadas(fetchMock, "DELETE", "/maestros/").length,
      avisosDeExito: aviso.success.mock.calls.length,
    }).toEqual({ deletes: 1, avisosDeExito: 1 })
  })

  it("quitar: al recargar la clase con un solo maestro, ya no hay «Quitar» y el foco va al encabezado «Maestros de la clase»", async () => {
    const { borrado, recarga } = await montarQuitar()
    fireEvent.click(screen.getByRole("button", { name: "Quitar Luis Pérez" }))
    const si = screen.getByRole("button", { name: "Sí, quitar Luis Pérez" })
    act(() => si.focus())
    fireEvent.click(si)
    await act(async () => {
      borrado.resolver(respuestaJson(200, { maestros: [MARIA] }))
      await borrado.promesa
    })
    await waitFor(() =>
      expect(aviso.success).toHaveBeenCalledWith("Quitaste a Luis Pérez de la clase"),
    )
    await act(async () => {
      recarga.resolver(detalle([MARIA]))
      await recarga.promesa
    })
    await waitFor(() => expect(screen.queryByText("Luis Pérez")).toBeNull())
    await esperar(30)
    expect(screen.queryByRole("button", { name: /^Quitar / })).toBeNull()
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Maestros de la clase" }),
    )
    expect(aviso.success).toHaveBeenCalledTimes(1)
  })

  it.each([
    [
      "asignar",
      "409 TOPE_DE_MAESTROS",
      () =>
        errorJson(
          409,
          "TOPE_DE_MAESTROS",
          "La clase ya tiene 2 maestros. Quita a uno antes de asignar a otro.",
        ),
      "La clase ya tiene 2 maestros. Quita a uno antes de asignar a otro.",
    ],
    [
      "asignar",
      "404 MAESTRO_NO_ENCONTRADO",
      () => errorJson(404, "MAESTRO_NO_ENCONTRADO", "No encontramos a ese maestro."),
      "No encontramos a ese maestro.",
    ],
    ["asignar", "503 SERVICIO_OCUPADO", () => errorJson(503, "SERVICIO_OCUPADO", OCUPADO), null],
    [
      "quitar",
      "409 CLASE_SIN_MAESTRO",
      () =>
        errorJson(
          409,
          "CLASE_SIN_MAESTRO",
          "Una clase necesita al menos un maestro. Asigna a otro antes de quitar a este.",
        ),
      "Una clase necesita al menos un maestro. Asigna a otro antes de quitar a este.",
    ],
    ["quitar", "503 SERVICIO_OCUPADO", () => errorJson(503, "SERVICIO_OCUPADO", OCUPADO), null],
    ["quitar", "sin conexión", () => Promise.reject(new TypeError("Failed to fetch")), null],
  ] as const)(
    "%s con %s: un solo aviso en español y el botón se libera",
    async (accion, _caso, respuesta, mensaje) => {
      stubFetch((r, m) => {
        if (r === `/api/clases/${CLASE_ID}` && m === "GET") {
          return detalle(accion === "quitar" ? [LUIS, MARIA] : [LUIS])
        }
        if (r.startsWith(`/api/admin/clases/${CLASE_ID}/maestros`) && m !== "GET")
          return respuesta() as Response
        return undefined
      })
      renderEnClase(ruta)
      await screen.findByRole("heading", { name: "Maestros de la clase" })
      let boton: HTMLElement
      if (accion === "asignar") {
        buscar("Mari")
        boton = await screen.findByRole("button", { name: "Asignar a la clase María Gómez" })
      } else {
        fireEvent.click(screen.getByRole("button", { name: "Quitar Luis Pérez" }))
        boton = screen.getByRole("button", { name: "Sí, quitar Luis Pérez" })
      }
      fireEvent.click(boton)
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
      const texto = String(aviso.error.mock.calls[0]?.[0])
      if (mensaje !== null) expect(texto).toBe(mensaje)
      expect(texto).not.toMatch(/^[a-zA-Z_]+:|mensaje del servidor|Failed to fetch|undefined/)
      expect(texto).toMatch(/[a-záéíóúñ]/)
      await esperar(30)
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(aviso.success).not.toHaveBeenCalled()
      expect(boton).not.toHaveAttribute("aria-busy", "true")
    },
  )
})
