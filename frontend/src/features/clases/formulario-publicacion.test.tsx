import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { FormularioPublicacion } from "./components/formulario-publicacion"

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"

const publicacionCreada = (extra: Record<string, unknown> = {}) => ({
  publicacion: {
    id: "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11",
    tipo: "anuncio",
    titulo: null,
    texto: "Mañana hay examen",
    autor: { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" },
    creadoEn: "2026-09-29T15:30:00.000Z",
    comentarios: 0,
    ...extra,
  },
})

const stubApi = (respuesta: () => Response = () => respuestaJson(201, publicacionCreada())) => {
  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(respuesta()))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderFormulario = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidar = vi.spyOn(queryClient, "invalidateQueries")
  render(
    <QueryClientProvider client={queryClient}>
      <FormularioPublicacion claseId={CLASE_ID} />
    </QueryClientProvider>,
  )
  return { invalidar }
}

const elegirMaterial = () => fireEvent.click(screen.getByRole("button", { name: "Material" }))

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("FormularioPublicacion", () => {
  it("PR-C09a: el grupo de tipo usa aria-pressed", () => {
    stubApi()
    renderFormulario()

    const grupo = screen.getByRole("group", { name: "Tipo de publicación" })
    const anuncio = screen.getByRole("button", { name: "Anuncio" })
    const material = screen.getByRole("button", { name: "Material" })
    expect(grupo).toContainElement(anuncio)
    expect(grupo).toContainElement(material)
    expect(anuncio).toHaveAttribute("aria-pressed", "true")
    expect(material).toHaveAttribute("aria-pressed", "false")

    fireEvent.click(material)

    expect(screen.getByRole("button", { name: "Anuncio" })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByRole("button", { name: "Material" })).toHaveAttribute("aria-pressed", "true")
  })

  it("PR-C09f: con «Material», el formulario pide el título", () => {
    stubApi()
    renderFormulario()
    expect(screen.queryByLabelText("Título del material")).toBeNull()
    expect(screen.getByLabelText("Anuncio")).toBeInTheDocument()

    elegirMaterial()

    expect(screen.getByLabelText("Título del material")).toBeInTheDocument()
    expect(screen.getByLabelText("Descripción (opcional)")).toBeInTheDocument()
    expect(screen.queryByLabelText("Anuncio")).toBeNull()
  })

  it("PR-C09b: publicar limpia el formulario, avisa e invalida la lista", async () => {
    const fetchMock = stubApi()
    const { invalidar } = renderFormulario()

    fireEvent.change(screen.getByLabelText("Anuncio"), { target: { value: "Mañana hay examen" } })
    fireEvent.click(screen.getByRole("button", { name: "Publicar anuncio" }))

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Publicado"))
    const [ruta, init] = fetchMock.mock.calls[0] ?? []
    expect(String(ruta)).toBe(`/api/clases/${CLASE_ID}/publicaciones`)
    expect(init?.method).toBe("POST")
    expect(JSON.parse(String(init?.body))).toEqual({ tipo: "anuncio", texto: "Mañana hay examen" })
    expect(screen.getByLabelText("Anuncio")).toHaveValue("")
    expect(invalidar.mock.calls.map(([filtro]) => filtro?.queryKey)).toContainEqual([
      "clases",
      CLASE_ID,
      "publicaciones",
    ])
  })

  it("PR-C09c: el botón dice «Publicar anuncio» o «Publicar material» según el tipo", () => {
    stubApi()
    renderFormulario()
    expect(screen.getByRole("button", { name: "Publicar anuncio" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Publicar material" })).toBeNull()

    elegirMaterial()

    expect(screen.getByRole("button", { name: "Publicar material" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Publicar anuncio" })).toBeNull()
  })

  it("PR-C12h: un anuncio, o el título de un material, hechos solo de caracteres invisibles muestran su ErrorDeCampo y no llaman a la API", async () => {
    const fetchMock = stubApi()
    renderFormulario()

    fireEvent.change(screen.getByLabelText("Anuncio"), { target: { value: "\u200B\u2060" } })
    fireEvent.click(screen.getByRole("button", { name: "Publicar anuncio" }))
    expect(await screen.findByText("Escribe el anuncio")).toBeInTheDocument()
    expect(screen.getByLabelText("Anuncio")).toHaveAttribute("aria-invalid", "true")

    elegirMaterial()
    fireEvent.change(screen.getByLabelText("Título del material"), {
      target: { value: "\u3164" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Publicar material" }))
    expect(await screen.findByText("Escribe el título del material")).toBeInTheDocument()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("un material sin descripción se publica con solo el título", async () => {
    const fetchMock = stubApi()
    renderFormulario()
    elegirMaterial()

    fireEvent.change(screen.getByLabelText("Título del material"), {
      target: { value: "Guía del tema 3" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Publicar material" }))

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Publicado"))
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      tipo: "material",
      titulo: "Guía del tema 3",
      texto: "",
    })
  })

  it("un error que no es de un campo (500) se avisa y no marca ningún campo", async () => {
    stubApi(() =>
      respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "mensaje del servidor" } }),
    )
    renderFormulario()

    fireEvent.change(screen.getByLabelText("Anuncio"), { target: { value: "Hola" } })
    fireEvent.click(screen.getByRole("button", { name: "Publicar anuncio" }))

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(screen.getByLabelText("Anuncio")).not.toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText("Anuncio")).toHaveValue("Hola")
  })
})

// Una petición que se queda en vuelo hasta que la prueba la responde: permite desmontar el
// formulario antes de la respuesta.
const stubApiDiferida = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const fetchMock = vi.fn<typeof fetch>(
    () =>
      new Promise<Response>((resolve) => {
        resolver = resolve
      }),
  )
  vi.stubGlobal("fetch", fetchMock)
  return { fetchMock, responder: (respuesta: Response) => resolver(respuesta) }
}

const escribirYPublicarAnuncio = (texto: string) => {
  fireEvent.change(screen.getByLabelText("Anuncio"), { target: { value: texto } })
  fireEvent.click(screen.getByRole("button", { name: "Publicar anuncio" }))
}

describe("avisos de crear una publicación (Enmienda 8, T-30)", () => {
  it("PR-C14a: el aviso de éxito y el de error salen una sola vez, con el formulario montado y desmontado; un error de campo no avisa", async () => {
    // Éxito con el formulario montado.
    stubApi()
    renderFormulario()
    escribirYPublicarAnuncio("Mañana hay examen")
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    expect(aviso.success).toHaveBeenCalledWith("Publicado")
    cleanup()
    aviso.success.mockClear()

    // Éxito con el formulario desmontado antes de la respuesta.
    const exito = stubApiDiferida()
    renderFormulario()
    escribirYPublicarAnuncio("Mañana hay examen")
    await waitFor(() => expect(exito.fetchMock).toHaveBeenCalledTimes(1))
    cleanup()
    exito.responder(respuestaJson(201, publicacionCreada()))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    expect(aviso.success).toHaveBeenCalledWith("Publicado")
    expect(aviso.error).not.toHaveBeenCalled()
    aviso.success.mockClear()

    // Error 500 con el formulario montado.
    stubApi(() =>
      respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "mensaje del servidor" } }),
    )
    renderFormulario()
    escribirYPublicarAnuncio("Hola")
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    cleanup()
    aviso.error.mockClear()

    // Error de red con el formulario desmontado antes de la respuesta.
    const red = vi.fn<typeof fetch>(
      () =>
        new Promise<Response>((_resolver, rechazar) => {
          setTimeout(() => rechazar(new TypeError("Failed to fetch")), 20)
        }),
    )
    vi.stubGlobal("fetch", red)
    renderFormulario()
    escribirYPublicarAnuncio("Hola")
    await waitFor(() => expect(red).toHaveBeenCalledTimes(1))
    cleanup()
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(aviso.success).not.toHaveBeenCalled()
    aviso.error.mockClear()

    // Un error de campo del servidor se muestra bajo su campo y no se avisa.
    stubApi(() =>
      respuestaJson(400, {
        error: { codigo: "VALIDACION", mensaje: "texto: No puede tener más de 5000 caracteres" },
      }),
    )
    renderFormulario()
    escribirYPublicarAnuncio("Hola")
    expect(await screen.findByText("No puede tener más de 5000 caracteres")).toBeInTheDocument()
    expect(screen.getByLabelText("Anuncio")).toHaveAttribute("aria-invalid", "true")
    expect(aviso.error).not.toHaveBeenCalled()
    expect(aviso.success).not.toHaveBeenCalled()
  })
})

describe("el formulario normaliza antes de validar (Enmienda 8, T-31)", () => {
  it("PR-C15b: un anuncio de 5,000 caracteres más un salto se envía normalizado; uno de 5,001 sin saltos se rechaza en el formulario", async () => {
    const fetchMock = stubApi()
    renderFormulario()

    escribirYPublicarAnuncio(`${"a".repeat(5000)}\r\n`)
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Publicado"))
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      tipo: "anuncio",
      texto: "a".repeat(5000),
    })

    // El título de un material se normaliza igual.
    elegirMaterial()
    fireEvent.change(screen.getByLabelText("Título del material"), {
      target: { value: `  ${"t".repeat(200)} \r\n` },
    })
    fireEvent.click(screen.getByRole("button", { name: "Publicar material" }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      tipo: "material",
      titulo: "t".repeat(200),
      texto: "",
    })

    // 5,001 sin saltos: el formulario lo rechaza con el mensaje del servidor y no llama a la API.
    fireEvent.click(screen.getByRole("button", { name: "Anuncio" }))
    escribirYPublicarAnuncio("a".repeat(5001))
    expect(await screen.findByText("No puede tener más de 5000 caracteres")).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
