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
const MAESTRO_ID = "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09"

// CLASES-02c (C-12): crear una clase es del administrador: POST /api/admin/clases con al menos un
// maestro elegido en el buscador.
const respuestaDeCandidatos = () =>
  respuestaJson(200, {
    candidatos: [{ id: MAESTRO_ID, nombre: "Luis Pérez", email: "luis@x.mx" }],
    hayMas: false,
  })

const elegirMaestro = async () => {
  fireEvent.change(screen.getByLabelText("Buscar maestro por nombre"), {
    target: { value: "Luis" },
  })
  fireEvent.click(await screen.findByRole("button", { name: "Elegir Luis Pérez" }))
}

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
    const fetchMock = stubFetch((ruta, metodo) => {
      if (ruta.startsWith("/api/admin/maestros/candidatos")) return respuestaDeCandidatos()
      return ruta === "/api/admin/clases" && metodo === "POST"
        ? respuestaJson(201, {
            clase: {
              id: CLASE_ID,
              nombre: "Álgebra",
              descripcion: null,
              maestro: { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis" },
              // CLASES-02a (C-7): el esquema ahora exige `maestros`; solo se agrega el campo.
              maestros: [{ id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis" }],
            },
          })
        : respuestaJson(500, {})
    })
    renderFormulario({ modo: "crear" })

    fireEvent.change(screen.getByLabelText("Nombre de la clase"), {
      target: { value: "Álgebra" },
    })
    await elegirMaestro()
    fireEvent.click(screen.getByRole("button", { name: "Crear clase" }))

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([entrada, init]) => String(entrada) === "/api/admin/clases" && init?.method === "POST",
        ),
      ).toBe(true),
    )
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Clase creada"))
    await waitFor(() => expect(navegar).toHaveBeenCalledWith(`/admin/clases/${CLASE_ID}`))
  })

  it("PR-A21c: el botón está en enEspera mientras envía", async () => {
    let responder: (respuesta: Response) => void = () => undefined
    stubFetch((ruta) => {
      if (ruta.startsWith("/api/admin/maestros/candidatos")) return respuestaDeCandidatos()
      return new Promise<Response>((resolver) => {
        responder = resolver
      })
    })
    renderFormulario({ modo: "crear" })

    fireEvent.change(screen.getByLabelText("Nombre de la clase"), {
      target: { value: "Álgebra" },
    })
    await elegirMaestro()
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
          // CLASES-02a (C-7): el esquema ahora exige `maestros`; solo se agrega el campo.
          maestros: [{ id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis" }],
        },
      }),
    )
  })

  // CLASES-02c (§D-2C5, PR-2C05): el id llega al mutar (sin valor de respaldo para un claseId que falte), y la edición es del
  // administrador.
  it("PR-2C05: al guardar, el PUT va a /api/admin/clases/:claseId con el id de la clase y la descripción normalizada, y navega a la clase", async () => {
    const fetchMock = stubFetch((ruta, metodo) =>
      ruta === `/api/admin/clases/${CLASE_ID}` && metodo === "PUT"
        ? respuestaJson(200, {
            clase: {
              id: CLASE_ID,
              nombre: "Álgebra II",
              descripcion: "uno\ndos",
              maestro: { id: MAESTRO_ID, nombre: "Luis" },
              maestros: [{ id: MAESTRO_ID, nombre: "Luis" }],
            },
          })
        : respuestaJson(500, {}),
    )
    renderFormulario({
      modo: "editar",
      claseId: CLASE_ID,
      valoresIniciales: { nombre: "Álgebra I", descripcion: null },
    })

    fireEvent.change(screen.getByLabelText("Nombre de la clase"), {
      target: { value: "Álgebra II" },
    })
    fireEvent.change(screen.getByLabelText("Descripción (opcional)"), {
      target: { value: "uno\r\ndos  " },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Cambios guardados"))
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT")
    expect(String(put?.[0])).toBe(`/api/admin/clases/${CLASE_ID}`)
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({
      nombre: "Álgebra II",
      descripcion: "uno\ndos",
    })
    expect(fetchMock.mock.calls.some(([entrada]) => String(entrada) === "/api/clases")).toBe(false)
    await waitFor(() => expect(navegar).toHaveBeenCalledWith(`/admin/clases/${CLASE_ID}`))
  })

  it("PR-2C05: en modo editar no hay selector de maestros y «Cancelar» vuelve a la clase", () => {
    stubFetch(() => respuestaJson(500, {}))
    renderFormulario({
      modo: "editar",
      claseId: CLASE_ID,
      valoresIniciales: { nombre: "Álgebra II", descripcion: null },
    })

    expect(screen.queryByLabelText("Buscar maestro por nombre")).toBeNull()
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      `/admin/clases/${CLASE_ID}`,
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
      ruta === `/api/admin/clases/${CLASE_ID}` && metodo === "PUT"
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

  it("PR-C12g: un nombre de solo caracteres invisibles muestra ErrorDeCampo y no llama a la API", async () => {
    const fetchMock = stubFetch(() => respuestaJson(500, {}))
    renderFormulario({ modo: "crear" })

    fireEvent.change(screen.getByLabelText("Nombre de la clase"), {
      target: { value: "\u200B\u200B" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Crear clase" }))

    expect(
      await screen.findByText("El nombre debe tener al menos 2 caracteres"),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Nombre de la clase")).toHaveAttribute("aria-invalid", "true")
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
