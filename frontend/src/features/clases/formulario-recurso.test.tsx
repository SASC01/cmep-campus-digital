import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { FormularioRecurso } from "./components/formulario-recurso"
import { TEXTOS_FORMULARIO_RECURSO } from "./data"

// CLASES-03d (§D-8.5; Enmienda 12, E12-3): los casos del título, del tema y del material que vivían en
// formulario-publicacion.test.tsx, con su id y la misma propiedad, sobre «Nuevo recurso»
// (FormularioRecurso en modo crear), el único formulario que hoy publica un material.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"

const publicacionCreada = () => ({
  publicacion: {
    id: "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11",
    tipo: "material",
    titulo: "Guía",
    texto: "",
    autor: {
      id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
      nombre: "Luis Pérez",
      administracion: false,
    },
    creadoEn: "2026-09-29T15:30:00.000Z",
    comentarios: 0,
    adjuntos: [],
    puedeBorrar: true,
    tarea: null,
  },
})

// Los temas de la clase (GET …/temas) se responden aparte (por defecto, sin temas): lo que cuentan y
// comparan las pruebas son las peticiones de publicar.
const RUTA_TEMAS = `/api/clases/${CLASE_ID}/temas`
const sinTemas = () => respuestaJson(200, { temas: [], sinTema: 0 })
let respuestaDeTemas: () => Response | Promise<Response> = sinTemas
const conTemas = (fetchMock: typeof fetch) =>
  vi.fn<typeof fetch>((entrada, init) => {
    if (String(entrada) === RUTA_TEMAS && (init?.method ?? "GET") === "GET") {
      return Promise.resolve(respuestaDeTemas())
    }
    return fetchMock(entrada, init)
  })

const stubApi = (respuesta: () => Response = () => respuestaJson(201, publicacionCreada())) => {
  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(respuesta()))
  vi.stubGlobal("fetch", conTemas(fetchMock))
  return fetchMock
}

const renderFormulario = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <FormularioRecurso
        modo="crear"
        claseId={CLASE_ID}
        destino={TEXTOS_FORMULARIO_RECURSO.destinoDocente}
      />
    </QueryClientProvider>,
  )
}

const publicarRecurso = (titulo: string) => {
  fireEvent.change(screen.getByLabelText("Título del recurso"), { target: { value: titulo } })
  fireEvent.click(screen.getByRole("button", { name: "Publicar recurso" }))
}

const cuerpoDelPost = (fetchMock: ReturnType<typeof stubApi>) => {
  const posts = fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")
  expect(posts, "una sola publicación").toHaveLength(1)
  return JSON.parse(String(posts[0]?.[1]?.body)) as unknown
}

const opcionesDe = (campo: HTMLElement) =>
  Array.from((campo as HTMLSelectElement).options).map((opcion) => opcion.textContent)

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  respuestaDeTemas = sinTemas
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("FormularioRecurso: título y descripción", () => {
  it("PR-C09f: el formulario pide el título (CLASES-03d, antes en formulario-publicacion.test.tsx)", () => {
    stubApi()
    renderFormulario()
    expect(screen.getByLabelText("Título del recurso")).toBeInTheDocument()
    expect(screen.getByLabelText("Descripción (opcional)")).toBeInTheDocument()
    expect(screen.queryByLabelText("Anuncio")).toBeNull()
  })

  it("un material sin descripción se publica con solo el título (CLASES-03d, antes en formulario-publicacion.test.tsx)", async () => {
    const fetchMock = stubApi()
    renderFormulario()
    publicarRecurso("Guía del tema 3")

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Recurso publicado"))
    expect(cuerpoDelPost(fetchMock)).toEqual({
      tipo: "material",
      titulo: "Guía del tema 3",
      texto: "",
      archivoIds: [],
    })
  })

  it("PR-C12h: el título de un recurso hecho solo de caracteres invisibles muestra su ErrorDeCampo y no llama a la API (CLASES-03d, antes en formulario-publicacion.test.tsx)", async () => {
    const fetchMock = stubApi()
    renderFormulario()
    publicarRecurso("ㅤ")
    expect(await screen.findByText("Escribe el título del recurso")).toBeInTheDocument()
    expect(screen.getByLabelText("Título del recurso")).toHaveAttribute("aria-invalid", "true")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("PR-C15b: el título de un recurso se normaliza como lo mide el servidor (CLASES-03d, antes en formulario-publicacion.test.tsx)", async () => {
    const fetchMock = stubApi()
    renderFormulario()
    publicarRecurso(`  ${"t".repeat(200)} \r\n`)
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Recurso publicado"))
    expect(cuerpoDelPost(fetchMock)).toEqual({
      tipo: "material",
      titulo: "t".repeat(200),
      texto: "",
      archivoIds: [],
    })
  })
})

describe("FormularioRecurso: el tema", () => {
  const TEMA_1 = {
    id: "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01",
    nombre: "Unidad 1",
    orden: 0,
    elementos: 2,
  }
  const TEMA_2 = {
    id: "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02",
    nombre: "Unidad 2",
    orden: 1,
    elementos: 0,
  }
  const conDosTemas = () => respuestaJson(200, { temas: [TEMA_1, TEMA_2], sinTema: 0 })

  it("PR-1E04 · «Tema» aparece con «Sin tema» elegido por defecto, y con un tema elegido el cuerpo lleva temaId (CLASES-03d, antes en formulario-publicacion.test.tsx)", async () => {
    respuestaDeTemas = conDosTemas
    const fetchMock = stubApi()
    renderFormulario()

    const campo = await screen.findByLabelText("Tema")
    expect(campo).toHaveValue("")
    expect(opcionesDe(campo)).toEqual(["Sin tema", "Unidad 1", "Unidad 2"])
    expect(campo).toHaveAttribute("autocomplete", "off")
    fireEvent.change(campo, { target: { value: TEMA_2.id } })
    publicarRecurso("Guía del tema 2")

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Recurso publicado"))
    expect(cuerpoDelPost(fetchMock)).toEqual({
      tipo: "material",
      titulo: "Guía del tema 2",
      texto: "",
      temaId: TEMA_2.id,
      archivoIds: [],
    })
  })

  it("PR-1E04 · con «Sin tema» el cuerpo del recurso no lleva la clave temaId (CLASES-03d, antes en formulario-publicacion.test.tsx)", async () => {
    respuestaDeTemas = conDosTemas
    const fetchMock = stubApi()
    renderFormulario()
    expect(await screen.findByLabelText("Tema")).toHaveValue("")
    publicarRecurso("Sin tema")

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Recurso publicado"))
    const cuerpo = cuerpoDelPost(fetchMock)
    expect(cuerpo).toEqual({ tipo: "material", titulo: "Sin tema", texto: "", archivoIds: [] })
    expect(cuerpo).not.toHaveProperty("temaId")
  })

  it("PR-1E04 · si el tema elegido ya no existe, avisa con el mensaje del servidor, vuelve a pedir los temas y el campo deja de ofrecerlo (CLASES-03d, antes en formulario-publicacion.test.tsx)", async () => {
    let temas = [TEMA_1, TEMA_2]
    respuestaDeTemas = () => respuestaJson(200, { temas, sinTema: 0 })
    const fetchMock = stubApi(() =>
      respuestaJson(404, {
        error: { codigo: "TEMA_NO_ENCONTRADO", mensaje: "Ese tema ya no existe." },
      }),
    )
    renderFormulario()
    fireEvent.change(await screen.findByLabelText("Tema"), { target: { value: TEMA_2.id } })
    temas = [TEMA_1]
    publicarRecurso("Guía")

    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith("Ese tema ya no existe."))
    await waitFor(() =>
      expect(opcionesDe(screen.getByLabelText("Tema"))).toEqual(["Sin tema", "Unidad 1"]),
    )
    expect(screen.getByLabelText("Tema")).toHaveValue("")
    expect(screen.getByLabelText("Título del recurso")).toHaveValue("Guía")
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1)
  })

  it("PR-1E08 · con la lista de temas pendiente el formulario no muestra Tema, se puede publicar y el cuerpo va sin temaId (CLASES-03d, antes en formulario-publicacion.test.tsx)", async () => {
    respuestaDeTemas = () => new Promise<Response>(() => undefined)
    const fetchMock = stubApi()
    renderFormulario()

    expect(screen.queryByLabelText("Tema")).toBeNull()
    expect(screen.queryByRole("status")).toBeNull()
    publicarRecurso("Mientras cargan")

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Recurso publicado"))
    expect(cuerpoDelPost(fetchMock)).toEqual({
      tipo: "material",
      titulo: "Mientras cargan",
      texto: "",
      archivoIds: [],
    })
  })

  it("PR-1E08 · con la lista de temas fallida el formulario muestra la nota en línea, no marca ningún campo ni avisa, y publica sin temaId (CLASES-03d, antes en formulario-publicacion.test.tsx)", async () => {
    respuestaDeTemas = () =>
      respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "mensaje del servidor" } })
    const fetchMock = stubApi()
    renderFormulario()

    await screen.findByText("No pudimos cargar los temas. El recurso se publicará sin tema.")
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.queryByLabelText("Tema")).toBeNull()
    expect(document.querySelector('[aria-invalid="true"]')).toBeNull()
    expect(aviso.error).not.toHaveBeenCalled()
    publicarRecurso("Con la lista fallida")

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Recurso publicado"))
    expect(aviso.error).not.toHaveBeenCalled()
    expect(cuerpoDelPost(fetchMock)).toEqual({
      tipo: "material",
      titulo: "Con la lista fallida",
      texto: "",
      archivoIds: [],
    })
  })

  it("PR-1E08 · con la lista de temas vacía el formulario no muestra Tema y publica sin temaId (CLASES-03d, antes en formulario-publicacion.test.tsx)", async () => {
    let pedidas = 0
    respuestaDeTemas = () => {
      pedidas += 1
      return respuestaJson(200, { temas: [], sinTema: 3 })
    }
    const fetchMock = stubApi()
    renderFormulario()
    await waitFor(() => expect(pedidas).toBe(1))

    expect(screen.queryByLabelText("Tema")).toBeNull()
    expect(
      screen.queryByText("No pudimos cargar los temas. El recurso se publicará sin tema."),
    ).toBeNull()
    publicarRecurso("Sin temas en la clase")

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Recurso publicado"))
    expect(cuerpoDelPost(fetchMock)).toEqual({
      tipo: "material",
      titulo: "Sin temas en la clase",
      texto: "",
      archivoIds: [],
    })
  })
})
