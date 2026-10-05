import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { MaestrosDeClaseView } from "./maestros-de-clase-view"

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const LUIS = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const ANA = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d10", nombre: "Ana Ruiz" }
const BETO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11", nombre: "Beto Sosa" }
const CANDIDATOS = [LUIS, ANA, BETO].map((m) => ({ ...m, email: `${m.nombre.split(" ")[0]}@x.mx` }))

interface Estado {
  maestros: { id: string; nombre: string }[]
  asignar: (() => Response) | undefined
  retirar: (() => Response) | undefined
}

// Un servidor en memoria: el detalle de la clase refleja las asignaciones y los retiros.
const stubApi = (maestros: { id: string; nombre: string }[], extra: Partial<Estado> = {}) => {
  const estado: Estado = {
    maestros: [...maestros],
    asignar: undefined,
    retirar: undefined,
    ...extra,
  }
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const ruta = String(entrada)
    const metodo = init?.method ?? "GET"
    if (ruta.startsWith("/api/admin/maestros/candidatos")) {
      return Promise.resolve(respuestaJson(200, { candidatos: CANDIDATOS, hayMas: false }))
    }
    if (ruta === `/api/admin/clases/${CLASE_ID}/maestros` && metodo === "POST") {
      if (estado.asignar) return Promise.resolve(estado.asignar())
      const { maestroId } = JSON.parse(String(init?.body)) as { maestroId: string }
      const nuevo = CANDIDATOS.find((c) => c.id === maestroId)
      if (nuevo) estado.maestros.push({ id: nuevo.id, nombre: nuevo.nombre })
      return Promise.resolve(respuestaJson(200, { maestros: estado.maestros }))
    }
    if (ruta.startsWith(`/api/admin/clases/${CLASE_ID}/maestros/`) && metodo === "DELETE") {
      if (estado.retirar) return Promise.resolve(estado.retirar())
      const id = ruta.split("/").at(-1)
      estado.maestros = estado.maestros.filter((m) => m.id !== id)
      return Promise.resolve(respuestaJson(200, { maestros: estado.maestros }))
    }
    if (ruta === `/api/clases/${CLASE_ID}`) {
      return Promise.resolve(
        respuestaJson(200, {
          clase: {
            id: CLASE_ID,
            nombre: "Álgebra I",
            descripcion: null,
            maestro: estado.maestros[0],
            maestros: estado.maestros,
          },
        }),
      )
    }
    return Promise.resolve(respuestaJson(500, {}))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadas = (fetchMock: ReturnType<typeof stubApi>, ruta: string, metodo: string) =>
  fetchMock.mock.calls.filter(
    ([entrada, init]) => String(entrada).startsWith(ruta) && (init?.method ?? "GET") === metodo,
  )

const renderVista = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/admin/clases/${CLASE_ID}/maestros`]}>
        <Routes>
          <Route path="/admin/clases/:claseId/maestros" element={<MaestrosDeClaseView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const buscar = (termino: string) =>
  fireEvent.change(screen.getByLabelText("Buscar maestro por nombre"), {
    target: { value: termino },
  })

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

// CLASES-02c (§D-2C2, PR-2C06): los maestros de la clase.
describe("MaestrosDeClaseView", () => {
  it("PR-2C06: con un solo maestro no hay «Quitar», una nota dice que se necesita al menos uno y el buscador está", async () => {
    stubApi([LUIS])
    renderVista()

    const lista = await screen.findByRole("list", { name: "Maestros de la clase" })
    expect(within(lista).getByText("Luis Pérez")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Quitar/ })).toBeNull()
    expect(
      screen.getByText(
        "Una clase necesita al menos un maestro. Asigna a otro antes de quitar a este.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Buscar maestro por nombre")).toBeInTheDocument()
  })

  it("PR-2C06: con dos maestros, cada uno con su «Quitar», sin buscador y con la nota del tope", async () => {
    stubApi([LUIS, ANA])
    renderVista()

    await screen.findByRole("list", { name: "Maestros de la clase" })
    expect(screen.getByRole("button", { name: "Quitar Luis Pérez" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Quitar Ana Ruiz" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Buscar maestro por nombre")).toBeNull()
    expect(
      screen.getByText("La clase ya tiene 2 maestros. Quita a uno para asignar a otro."),
    ).toBeInTheDocument()
    expect(screen.queryByText(/necesita al menos un maestro/)).toBeNull()
  })

  it("PR-2C06: asignar avisa «Asignaste a …», el que ya da la clase lleva la insignia, y al llegar a dos el buscador se oculta sin perder el foco", async () => {
    const fetchMock = stubApi([LUIS])
    renderVista()

    await screen.findByRole("list", { name: "Maestros de la clase" })
    buscar("a")
    // Con una sola letra no pregunta; se escribe un término válido.
    buscar("Ana")
    const resultados = await screen.findByRole("list", { name: "Resultados de la búsqueda" })
    expect(within(resultados).getByText("Ya da esta clase")).toBeInTheDocument()
    const asignar = within(resultados).getByRole("button", { name: "Asignar a la clase Ana Ruiz" })
    asignar.focus()
    fireEvent.click(asignar)

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Asignaste a Ana Ruiz"))
    const cuerpo = JSON.parse(
      String(llamadas(fetchMock, `/api/admin/clases/${CLASE_ID}/maestros`, "POST")[0]?.[1]?.body),
    )
    expect(cuerpo).toEqual({ maestroId: ANA.id })
    // Con dos maestros, el buscador se va: el foco no queda en <body>.
    await waitFor(() => expect(screen.queryByLabelText("Buscar maestro por nombre")).toBeNull())
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Maestros de la clase" })).toHaveFocus(),
    )
    expect(screen.getByRole("button", { name: "Quitar Ana Ruiz" })).toBeInTheDocument()
  })

  it("PR-2C06: quitar pide confirmación en línea: la frase, el foco a «Cancelar», y al cancelar vuelve a «Quitar»", async () => {
    const fetchMock = stubApi([LUIS, ANA])
    renderVista()

    const quitar = await screen.findByRole("button", { name: "Quitar Luis Pérez" })
    quitar.focus()
    fireEvent.click(quitar)

    expect(
      screen.getByText("Dejará de ver la clase. Lo que publicó se queda en el muro."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancelar Luis Pérez" })).toHaveFocus()
    expect(screen.getByRole("button", { name: "Sí, quitar Luis Pérez" })).toHaveAttribute(
      "data-variant",
      "destructive",
    )
    expect(llamadas(fetchMock, `/api/admin/clases/${CLASE_ID}/maestros/`, "DELETE")).toHaveLength(0)

    fireEvent.click(screen.getByRole("button", { name: "Cancelar Luis Pérez" }))
    expect(screen.queryByRole("button", { name: "Sí, quitar Luis Pérez" })).toBeNull()
    expect(screen.getByRole("button", { name: "Quitar Luis Pérez" })).toHaveFocus()
  })

  it("PR-2C06: confirmar quita al maestro, avisa «Quitaste a … de la clase» y el foco va al encabezado (ya no queda otro «Quitar»), nunca a <body>", async () => {
    const fetchMock = stubApi([LUIS, ANA])
    renderVista()

    fireEvent.click(await screen.findByRole("button", { name: "Quitar Luis Pérez" }))
    const confirmar = screen.getByRole("button", { name: "Sí, quitar Luis Pérez" })
    confirmar.focus()
    fireEvent.click(confirmar)

    await waitFor(() =>
      expect(aviso.success).toHaveBeenCalledWith("Quitaste a Luis Pérez de la clase"),
    )
    expect(
      llamadas(fetchMock, `/api/admin/clases/${CLASE_ID}/maestros/${LUIS.id}`, "DELETE"),
    ).toHaveLength(1)
    await waitFor(() => expect(screen.queryByText("Luis Pérez")).toBeNull())
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Maestros de la clase" })).toHaveFocus(),
    )
    // Con uno solo ya no hay «Quitar» y vuelve el buscador.
    expect(screen.queryByRole("button", { name: /^Quitar/ })).toBeNull()
    expect(screen.getByLabelText("Buscar maestro por nombre")).toBeInTheDocument()
  })

  it("PR-2C06: un 409 TOPE_DE_MAESTROS al asignar avisa con el mensaje del servidor", async () => {
    stubApi([LUIS], {
      asignar: () =>
        errorJson(
          409,
          "TOPE_DE_MAESTROS",
          "La clase ya tiene 2 maestros. Quita a uno antes de asignar a otro.",
        ),
    })
    renderVista()

    await screen.findByRole("list", { name: "Maestros de la clase" })
    buscar("Beto")
    fireEvent.click(await screen.findByRole("button", { name: "Asignar a la clase Beto Sosa" }))

    await waitFor(() =>
      expect(aviso.error).toHaveBeenCalledWith(
        "La clase ya tiene 2 maestros. Quita a uno antes de asignar a otro.",
      ),
    )
    expect(aviso.success).not.toHaveBeenCalled()
  })

  it("PR-2C06: un 409 CLASE_SIN_MAESTRO al quitar avisa con el mensaje del servidor", async () => {
    stubApi([LUIS, ANA], {
      retirar: () =>
        errorJson(
          409,
          "CLASE_SIN_MAESTRO",
          "Una clase necesita al menos un maestro. Asigna a otro antes de quitar a este.",
        ),
    })
    renderVista()

    fireEvent.click(await screen.findByRole("button", { name: "Quitar Ana Ruiz" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, quitar Ana Ruiz" }))
    await waitFor(() =>
      expect(aviso.error).toHaveBeenCalledWith(
        "Una clase necesita al menos un maestro. Asigna a otro antes de quitar a este.",
      ),
    )
    // La lista no cambió: Ana sigue en ella, con la confirmación abierta.
    expect(screen.getByRole("button", { name: "Sí, quitar Ana Ruiz" })).toBeInTheDocument()
  })

  it("PR-2C06: un 404 MAESTRO_NO_ENCONTRADO al asignar avisa con el mensaje del servidor", async () => {
    stubApi([LUIS], {
      asignar: () => errorJson(404, "MAESTRO_NO_ENCONTRADO", "No encontramos a ese maestro."),
    })
    renderVista()

    await screen.findByRole("list", { name: "Maestros de la clase" })
    buscar("Ana")
    fireEvent.click(await screen.findByRole("button", { name: "Asignar a la clase Ana Ruiz" }))

    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith("No encontramos a ese maestro."))
  })
})
