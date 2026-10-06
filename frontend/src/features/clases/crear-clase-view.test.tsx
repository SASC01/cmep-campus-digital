import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { CrearClaseView } from "./crear-clase-view"

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const navegar = vi.hoisted(() => vi.fn())
vi.mock("react-router", async (importarOriginal) => {
  const real = await importarOriginal<typeof import("react-router")>()
  return { ...real, useNavigate: () => navegar }
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const LUIS = {
  id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
  nombre: "Luis Pérez",
  email: "luis@x.mx",
}
const ANA = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d10", nombre: "Ana Ruiz", email: "ana@x.mx" }

const claseCreada = {
  clase: {
    id: CLASE_ID,
    nombre: "Historia",
    descripcion: null,
    maestro: { id: LUIS.id, nombre: LUIS.nombre },
    maestros: [{ id: LUIS.id, nombre: LUIS.nombre }],
  },
}

type Manejador = (ruta: string, metodo: string, cuerpo: unknown) => Response | undefined

// Los candidatos siempre son los dos maestros; el POST lo decide cada caso.
const stubApi = (alCrear: Manejador = () => respuestaJson(201, claseCreada)) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const ruta = String(entrada)
    const metodo = init?.method ?? "GET"
    if (ruta.startsWith("/api/admin/maestros/candidatos")) {
      return Promise.resolve(respuestaJson(200, { candidatos: [LUIS, ANA], hayMas: false }))
    }
    const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined
    return Promise.resolve(alCrear(ruta, metodo, cuerpo) ?? respuestaJson(500, {}))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const posts = (fetchMock: ReturnType<typeof stubApi>) =>
  fetchMock.mock.calls.filter(
    ([entrada, init]) => String(entrada) === "/api/admin/clases" && init?.method === "POST",
  )

const renderVista = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={["/admin/clases/nueva"]}>
        <CrearClaseView />
      </MemoryRouter>
    </QueryClientProvider>,
  )

const escribirNombre = (nombre = "Historia") =>
  fireEvent.change(screen.getByLabelText("Nombre de la clase"), { target: { value: nombre } })

const buscar = (termino: string) =>
  fireEvent.change(screen.getByLabelText("Buscar maestro por nombre"), {
    target: { value: termino },
  })

const elegir = async (nombre: string) => {
  buscar(nombre.split(" ")[0] ?? nombre)
  fireEvent.click(await screen.findByRole("button", { name: `Elegir ${nombre}` }))
}

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
  navegar.mockClear()
})

// CLASES-02c (§D-2C2, PR-2C04): /admin/clases/nueva.
describe("CrearClaseView", () => {
  it("PR-2C04: sin maestros elegidos, «Elige al menos un maestro» con ErrorDeCampo y no se pide nada", async () => {
    const fetchMock = stubApi()
    renderVista()

    escribirNombre()
    fireEvent.click(screen.getByRole("button", { name: "Crear clase" }))

    const error = await screen.findByText("Elige al menos un maestro", { selector: "p, div" })
    expect(error).toBeInTheDocument()
    expect(posts(fetchMock)).toHaveLength(0)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("PR-2C04: con un maestro elegido, el POST lleva maestroIds, la descripción normalizada, avisa y navega a la clase", async () => {
    const fetchMock = stubApi()
    renderVista()

    escribirNombre()
    fireEvent.change(screen.getByLabelText("Descripción (opcional)"), {
      target: { value: "uno\r\ndos\rtres  " },
    })
    await elegir("Luis Pérez")
    const elegidos = screen.getByRole("list", { name: "Maestros elegidos" })
    expect(within(elegidos).getByText("luis@x.mx")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Crear clase" }))

    await waitFor(() => expect(posts(fetchMock)).toHaveLength(1))
    expect(JSON.parse(String(posts(fetchMock)[0]?.[1]?.body))).toEqual({
      nombre: "Historia",
      descripcion: "uno\ndos\ntres",
      maestroIds: [LUIS.id],
    })
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Clase creada"))
    await waitFor(() => expect(navegar).toHaveBeenCalledWith(`/admin/clases/${CLASE_ID}`))
  })

  it("PR-2C04: con dos elegidos el buscador se oculta con su nota, y el POST lleva los dos ids", async () => {
    const fetchMock = stubApi()
    renderVista()

    escribirNombre()
    await elegir("Luis Pérez")
    await elegir("Ana Ruiz")

    expect(screen.queryByLabelText("Buscar maestro por nombre")).toBeNull()
    expect(
      screen.getByText("Ya elegiste 2 maestros. Quita a uno para elegir a otro."),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Crear clase" }))

    await waitFor(() => expect(posts(fetchMock)).toHaveLength(1))
    expect(JSON.parse(String(posts(fetchMock)[0]?.[1]?.body)).maestroIds).toEqual([LUIS.id, ANA.id])
  })

  it("PR-2C04: el maestro elegido sigue en los resultados con «Ya elegido», sin botón para repetirlo", async () => {
    stubApi()
    renderVista()

    await elegir("Luis Pérez")

    const resultados = await screen.findByRole("list", { name: "Resultados de la búsqueda" })
    expect(within(resultados).getByText("Ya elegido")).toBeInTheDocument()
    expect(within(resultados).queryByRole("button", { name: "Elegir Luis Pérez" })).toBeNull()
    expect(within(resultados).getByRole("button", { name: "Elegir Ana Ruiz" })).toBeInTheDocument()
  })

  it("PR-2C04: «Quitar» y su foco: al quitar a uno de dos va al otro «Quitar»; al quitar al último vuelve al buscador; nunca a <body>", async () => {
    stubApi()
    renderVista()

    await elegir("Luis Pérez")
    await elegir("Ana Ruiz")
    // Al elegir al segundo el buscador desaparece: el foco va a un «Quitar», no a <body>.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Quitar Luis Pérez" })).toHaveFocus(),
    )

    fireEvent.click(screen.getByRole("button", { name: "Quitar Luis Pérez" }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Quitar Ana Ruiz" })).toHaveFocus(),
    )
    expect(screen.getByLabelText("Buscar maestro por nombre")).toBeInTheDocument()

    screen.getByRole("button", { name: "Quitar Ana Ruiz" }).focus()
    fireEvent.click(screen.getByRole("button", { name: "Quitar Ana Ruiz" }))
    await waitFor(() => expect(screen.getByLabelText("Buscar maestro por nombre")).toHaveFocus())
    expect(screen.queryByRole("list", { name: "Maestros elegidos" })).toBeNull()
  })

  it("PR-2C04: un 404 MAESTRO_NO_ENCONTRADO avisa con el mensaje del servidor y no marca ningún campo", async () => {
    stubApi(() =>
      respuestaJson(404, {
        error: { codigo: "MAESTRO_NO_ENCONTRADO", mensaje: "No encontramos a ese maestro." },
      }),
    )
    renderVista()

    escribirNombre()
    await elegir("Luis Pérez")
    fireEvent.click(screen.getByRole("button", { name: "Crear clase" }))

    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith("No encontramos a ese maestro."))
    expect(screen.getByLabelText("Nombre de la clase")).not.toHaveAttribute("aria-invalid", "true")
    expect(navegar).not.toHaveBeenCalled()
  })

  it("PR-2C04: los campos y el buscador llevan autoComplete=off (datos de otra persona)", () => {
    stubApi()
    renderVista()

    for (const campo of [
      screen.getByLabelText("Nombre de la clase"),
      screen.getByLabelText("Descripción (opcional)"),
      screen.getByLabelText("Buscar maestro por nombre"),
    ]) {
      expect(campo).toHaveAttribute("autocomplete", "off")
    }
  })

  it("PR-2C04: un doble envío con la petición en vuelo manda un solo POST", async () => {
    const pendiente = new Promise<Response>(() => undefined)
    const fetchMock = stubApi(() => pendiente as unknown as Response)
    renderVista()

    escribirNombre()
    await elegir("Luis Pérez")
    const boton = screen.getByRole("button", { name: "Crear clase" })
    fireEvent.click(boton)
    await waitFor(() => expect(boton).toHaveAttribute("aria-busy", "true"))
    fireEvent.click(boton)
    fireEvent.submit(boton.closest("form") as HTMLFormElement)

    expect(posts(fetchMock)).toHaveLength(1)
  })
})
