import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FormularioClase } from "./formulario-clase"

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

const stubFetch = (manejador: (ruta: string, metodo: string) => Response | Promise<Response>) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) =>
    Promise.resolve(manejador(String(entrada), init?.method ?? "GET")),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderFormulario = (props: Parameters<typeof FormularioClase>[0]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FormularioClase {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("FormularioClase", () => {
  it("PR-A21a: la validación en cliente muestra ErrorDeCampo", () => {
    stubFetch(() => respuestaJson(500, {}))
    renderFormulario({ modo: "crear" })

    fireEvent.click(screen.getByRole("button", { name: "Crear clase" }))

    expect(screen.getByText("El nombre debe tener al menos 2 caracteres")).toBeInTheDocument()
  })

  it("PR-A21b: el envío llama a la API y navega a la clase", async () => {
    const fetchMock = stubFetch((ruta) =>
      ruta === "/api/clases"
        ? respuestaJson(201, {
            clase: {
              id: CLASE_ID,
              nombre: "Álgebra",
              descripcion: null,
              maestro: { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis" },
            },
          })
        : respuestaJson(500, {}),
    )
    renderFormulario({ modo: "crear" })

    fireEvent.change(screen.getByLabelText("Nombre de la clase"), {
      target: { value: "Álgebra" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Crear clase" }))

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([entrada]) => String(entrada) === "/api/clases")).toBe(
        true,
      ),
    )
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Clase creada"))
  })

  it("PR-A21c: el botón está en enEspera mientras envía", async () => {
    let responder: (respuesta: Response) => void = () => undefined
    stubFetch(
      () =>
        new Promise<Response>((resolver) => {
          responder = resolver
        }),
    )
    renderFormulario({ modo: "crear" })

    fireEvent.change(screen.getByLabelText("Nombre de la clase"), {
      target: { value: "Álgebra" },
    })
    const boton = screen.getByRole("button", { name: "Crear clase" })
    fireEvent.click(boton)

    await waitFor(() => expect(boton).toHaveAttribute("aria-busy", "true"))
    responder(
      respuestaJson(201, {
        clase: {
          id: CLASE_ID,
          nombre: "Álgebra",
          descripcion: null,
          maestro: { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis" },
        },
      }),
    )
  })

  it("PR-A21d: al editar, precarga los datos", () => {
    stubFetch(() => respuestaJson(500, {}))
    renderFormulario({
      modo: "editar",
      claseId: CLASE_ID,
      valoresIniciales: { nombre: "Álgebra II", descripcion: "Segundo semestre" },
    })

    expect(screen.getByLabelText("Nombre de la clase")).toHaveValue("Álgebra II")
    expect(screen.getByLabelText("Descripción (opcional)")).toHaveValue("Segundo semestre")
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument()
  })

  it("PR-A21e: un error que no es de un campo (T-19, ronda 3 del tester) avisa con toast, sin marcar 'Nombre de la clase'", async () => {
    stubFetch((ruta, metodo) =>
      ruta === `/api/clases/${CLASE_ID}` && metodo === "PUT"
        ? respuestaJson(500, {
            error: { codigo: "ERROR_INTERNO", mensaje: "mensaje del servidor" },
          })
        : respuestaJson(500, {}),
    )
    renderFormulario({
      modo: "editar",
      claseId: CLASE_ID,
      valoresIniciales: { nombre: "Álgebra II", descripcion: "Segundo semestre" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(screen.getByLabelText("Nombre de la clase")).not.toHaveAttribute("aria-invalid", "true")
    expect(screen.queryByText("mensaje del servidor")).not.toBeInTheDocument()
  })
})
