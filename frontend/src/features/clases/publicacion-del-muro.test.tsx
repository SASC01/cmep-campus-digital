import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { PublicacionDelMuro } from "./components/publicacion-del-muro"
import type { Publicacion } from "./types"

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const PUBLICACION_ID = "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11"
const AUTOR = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }

const publicacion = (extra: Partial<Publicacion> = {}): Publicacion => ({
  id: PUBLICACION_ID,
  tipo: "anuncio",
  titulo: null,
  texto: "Mañana hay examen",
  autor: AUTOR,
  creadoEn: "2026-09-29T15:30:00.000Z",
  comentarios: 2,
  // C-21 (Enmienda 10): toda publicación lleva adjuntos.
  adjuntos: [],
  ...extra,
})

const idDe = (n: number) => `6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d${String(10 + n)}`

const comentario = (n: number, extra: Record<string, unknown> = {}) => ({
  id: idDe(n),
  texto: `Comentario ${String(n)}`,
  autor: { id: "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01", nombre: `Autor ${String(n)}` },
  creadoEn: "2026-09-29T16:30:00.000Z",
  propio: false,
  ...extra,
})

const listaDeComentarios = (
  comentarios: ReturnType<typeof comentario>[],
  siguienteCursor: string | null = null,
) => ({ comentarios, siguienteCursor })

type Manejador = (ruta: string, metodo: string) => Response | Promise<Response>

const stubApi = (manejador: Manejador) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) =>
    Promise.resolve(manejador(String(entrada), init?.method ?? "GET")),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const rutaDeComentarios = `/api/clases/${CLASE_ID}/publicaciones/${PUBLICACION_ID}/comentarios`

const llamadasA = (fetchMock: ReturnType<typeof stubApi>, parte: string, metodo = "GET") =>
  fetchMock.mock.calls.filter(
    ([entrada, init]) => String(entrada).includes(parte) && (init?.method ?? "GET") === metodo,
  )

const renderPublicacion = (props: { publicacion?: Publicacion; esMaestro?: boolean } = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <PublicacionDelMuro
        claseId={CLASE_ID}
        publicacion={props.publicacion ?? publicacion()}
        esMaestro={props.esMaestro ?? false}
      />
    </QueryClientProvider>,
  )
}

const abrirComentarios = (n = 2) =>
  fireEvent.click(screen.getByRole("button", { name: `Ver comentarios (${String(n)})` }))

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

describe("PublicacionDelMuro", () => {
  it("PR-C10a: un <script> o un <img onerror> en el texto se muestran como texto, sin nodos nuevos", () => {
    stubApi(() => respuestaJson(500, {}))
    const texto = '<script>window.__x = 1</script><img src="x" onerror="window.__y = 1">'
    renderPublicacion({ publicacion: publicacion({ texto }) })

    expect(screen.getByText(texto)).toBeInTheDocument()
    expect(document.querySelector("script")).toBeNull()
    expect(document.querySelector("img")).toBeNull()
  })

  it("PR-C10b: la insignia de tipo lleva texto", () => {
    stubApi(() => respuestaJson(500, {}))
    renderPublicacion()
    expect(screen.getByText("Anuncio")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull()
    cleanup()

    renderPublicacion({
      publicacion: publicacion({ tipo: "material", titulo: "Guía del tema 3", texto: "" }),
    })
    expect(screen.getByText("Material")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Guía del tema 3" })).toBeInTheDocument()
  })

  it("PR-C10c: «Ver comentarios» con aria-expanded pide los comentarios solo al abrirse", async () => {
    const fetchMock = stubApi(() => respuestaJson(200, listaDeComentarios([comentario(1)])))
    renderPublicacion()

    const boton = screen.getByRole("button", { name: "Ver comentarios (2)" })
    expect(boton).toHaveAttribute("aria-expanded", "false")
    expect(llamadasA(fetchMock, "/comentarios")).toHaveLength(0)

    fireEvent.click(boton)

    expect(await screen.findByText("Comentario 1")).toBeInTheDocument()
    const abierto = screen.getByRole("button", { name: "Ocultar comentarios" })
    expect(abierto).toHaveAttribute("aria-expanded", "true")
    expect(abierto).toHaveAttribute("aria-controls")
    expect(llamadasA(fetchMock, "/comentarios")).toHaveLength(1)
    expect(String(llamadasA(fetchMock, "/comentarios")[0]?.[0])).toBe(
      `${rutaDeComentarios}?limite=20`,
    )

    fireEvent.click(abierto)

    expect(screen.queryByText("Comentario 1")).toBeNull()
    expect(screen.getByRole("button", { name: "Ver comentarios (2)" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  })

  it("PR-C10d: «Borrar» aparece en los comentarios propios del alumno y en todos para el maestro, con confirmación en línea", async () => {
    const fetchMock = stubApi((ruta, metodo) => {
      if (metodo === "DELETE") return new Response(null, { status: 204 })
      return respuestaJson(
        200,
        listaDeComentarios([comentario(1, { propio: true }), comentario(2)]),
      )
    })

    // El alumno: solo el suyo.
    renderPublicacion()
    abrirComentarios()
    await screen.findByText("Comentario 1")
    const botonesDelAlumno = screen.getAllByRole("button", { name: "Borrar" })
    expect(botonesDelAlumno).toHaveLength(1)

    botonesDelAlumno[0]?.focus()
    fireEvent.click(botonesDelAlumno[0] as HTMLElement)
    const cancelar = screen.getByRole("button", { name: "Cancelar" })
    expect(screen.getByRole("button", { name: "Sí, borrar comentario" })).toBeInTheDocument()
    expect(cancelar).toHaveFocus()
    expect(llamadasA(fetchMock, "/comentarios/", "DELETE")).toHaveLength(0)

    fireEvent.click(cancelar)
    expect(screen.queryByRole("button", { name: "Sí, borrar comentario" })).toBeNull()
    expect(screen.getByRole("button", { name: "Borrar" })).toHaveFocus()

    fireEvent.click(screen.getByRole("button", { name: "Borrar" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar comentario" }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Comentario borrado"))
    expect(llamadasA(fetchMock, `/api/clases/${CLASE_ID}/mis-comentarios/`, "DELETE")).toHaveLength(
      1,
    )
    cleanup()

    // El maestro: todos, por la ruta del dueño.
    renderPublicacion({ esMaestro: true })
    abrirComentarios()
    await screen.findByText("Comentario 2")
    expect(screen.getAllByRole("button", { name: "Borrar" })).toHaveLength(2)
    const fila = screen.getByText("Comentario 2").closest("li")
    if (fila === null) throw new Error("El comentario no está en una lista")
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar comentario" }))
    await waitFor(() =>
      expect(llamadasA(fetchMock, `${rutaDeComentarios}/${idDe(2)}`, "DELETE")).toHaveLength(1),
    )
  })

  it("PR-C11c: al cargar la última página, «Ver más comentarios» desaparece y el foco va al primer comentario nuevo o, si no llegó nada, al encabezado de los comentarios", async () => {
    const conPaginas = (segunda: ReturnType<typeof comentario>[]) =>
      stubApi((ruta) => {
        if (ruta.includes(`cursor=${idDe(1)}`)) {
          return respuestaJson(200, listaDeComentarios(segunda))
        }
        return respuestaJson(200, listaDeComentarios([comentario(1)], idDe(1)))
      })
    const cargarMas = async () => {
      abrirComentarios()
      const boton = await screen.findByRole("button", { name: "Ver más comentarios" })
      boton.focus()
      fireEvent.click(boton)
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: "Ver más comentarios" })).toBeNull(),
      )
    }

    conPaginas([comentario(2)])
    renderPublicacion()
    await cargarMas()
    await waitFor(() => {
      const nuevo = screen.getByText("Comentario 2").closest("li")
      expect(nuevo).toHaveFocus()
    })
    cleanup()

    conPaginas([])
    renderPublicacion()
    await cargarMas()
    await waitFor(() => expect(screen.getByRole("heading", { name: "Comentarios" })).toHaveFocus())
    expect(document.activeElement).not.toBe(document.body)
  })

  it("PR-C12i: un comentario hecho solo de caracteres invisibles muestra ErrorDeCampo «Escribe tu comentario» y no llama a la API", async () => {
    const fetchMock = stubApi(() => respuestaJson(200, listaDeComentarios([])))
    renderPublicacion()
    abrirComentarios()
    const campo = await screen.findByLabelText("Escribe un comentario")

    fireEvent.change(campo, { target: { value: "\u200B\u3164" } })
    fireEvent.click(screen.getByRole("button", { name: "Comentar" }))

    expect(await screen.findByText("Escribe tu comentario")).toBeInTheDocument()
    expect(campo).toHaveAttribute("aria-invalid", "true")
    expect(llamadasA(fetchMock, "/comentarios", "POST")).toHaveLength(0)
  })

  it("un comentario válido se publica, limpia el campo y avisa", async () => {
    const fetchMock = stubApi((_ruta, metodo) => {
      if (metodo === "POST") {
        return respuestaJson(201, { comentario: comentario(3, { propio: true }) })
      }
      return respuestaJson(200, listaDeComentarios([]))
    })
    renderPublicacion()
    abrirComentarios()
    const campo = await screen.findByLabelText("Escribe un comentario")

    fireEvent.change(campo, { target: { value: "Gracias, maestro" } })
    fireEvent.click(screen.getByRole("button", { name: "Comentar" }))

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Comentario publicado"))
    expect(JSON.parse(String(llamadasA(fetchMock, "/comentarios", "POST")[0]?.[1]?.body))).toEqual({
      texto: "Gracias, maestro",
    })
    expect(campo).toHaveValue("")
  })

  it("estados en orden: un error al pedir los comentarios muestra la alerta y deja el formulario", async () => {
    stubApi(() =>
      respuestaJson(404, {
        error: { codigo: "PUBLICACION_NO_ENCONTRADA", mensaje: "mensaje del servidor" },
      }),
    )
    renderPublicacion()
    abrirComentarios()

    expect(await screen.findByRole("alert")).toHaveTextContent("Esa publicación ya no existe.")
    expect(screen.getByLabelText("Escribe un comentario")).toBeInTheDocument()
  })

  it("el maestro borra la publicación con confirmación en línea y el aviso sale aunque la publicación desaparezca", async () => {
    const fetchMock = stubApi(() => new Response(null, { status: 204 }))
    renderPublicacion({ esMaestro: true })

    expect(screen.queryByRole("button", { name: "Sí, borrar" })).toBeNull()
    const borrar = screen.getByRole("button", { name: "Borrar publicación" })
    borrar.focus()
    fireEvent.click(borrar)
    expect(screen.getByText("Se borrará con sus comentarios.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus()
    expect(llamadasA(fetchMock, PUBLICACION_ID, "DELETE")).toHaveLength(0)

    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar" }))

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Publicación borrada"))
    expect(
      llamadasA(fetchMock, `/api/clases/${CLASE_ID}/publicaciones/${PUBLICACION_ID}`, "DELETE"),
    ).toHaveLength(1)
  })

  it("el estudiante no ve «Borrar publicación»", () => {
    stubApi(() => respuestaJson(500, {}))
    renderPublicacion({ esMaestro: false })
    expect(screen.queryByRole("button", { name: "Borrar publicación" })).toBeNull()
  })
})

describe("avisos de comentar (Enmienda 8, T-30)", () => {
  const manejadorDeComentar =
    (respuestaPost: () => Response | Promise<Response>): Manejador =>
    (_ruta, metodo) =>
      metodo === "POST" ? respuestaPost() : respuestaJson(200, listaDeComentarios([]))

  const comentarCon = async (texto: string) => {
    abrirComentarios()
    const campo = await screen.findByLabelText("Escribe un comentario")
    fireEvent.change(campo, { target: { value: texto } })
    fireEvent.click(screen.getByRole("button", { name: "Comentar" }))
    return campo
  }

  it("PR-C14b: el aviso de comentar sale una sola vez, con los comentarios abiertos o cerrados antes de la respuesta; un error de campo no avisa", async () => {
    // Éxito con los comentarios abiertos.
    stubApi(manejadorDeComentar(() => respuestaJson(201, { comentario: comentario(3) })))
    renderPublicacion()
    await comentarCon("Gracias")
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    expect(aviso.success).toHaveBeenCalledWith("Comentario publicado")
    cleanup()
    aviso.success.mockClear()

    // Éxito con los comentarios cerrados antes de la respuesta.
    let responder: (respuesta: Response) => void = () => undefined
    const diferida = stubApi(
      manejadorDeComentar(
        () =>
          new Promise<Response>((resolve) => {
            responder = resolve
          }),
      ),
    )
    renderPublicacion()
    await comentarCon("Gracias")
    await waitFor(() => expect(llamadasA(diferida, "/comentarios", "POST")).toHaveLength(1))
    fireEvent.click(screen.getByRole("button", { name: "Ocultar comentarios" }))
    responder(respuestaJson(201, { comentario: comentario(3) }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    expect(aviso.success).toHaveBeenCalledWith("Comentario publicado")
    expect(aviso.error).not.toHaveBeenCalled()
    cleanup()
    aviso.success.mockClear()

    // Error 500: un solo aviso.
    stubApi(
      manejadorDeComentar(() =>
        respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "mensaje del servidor" } }),
      ),
    )
    renderPublicacion()
    await comentarCon("Gracias")
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(aviso.success).not.toHaveBeenCalled()
    cleanup()
    aviso.error.mockClear()

    // Un error de campo se muestra bajo su campo y no se avisa.
    stubApi(
      manejadorDeComentar(() =>
        respuestaJson(400, {
          error: { codigo: "VALIDACION", mensaje: "texto: No puede tener más de 1000 caracteres" },
        }),
      ),
    )
    renderPublicacion()
    const campo = await comentarCon("Gracias")
    expect(await screen.findByText("No puede tener más de 1000 caracteres")).toBeInTheDocument()
    expect(campo).toHaveAttribute("aria-invalid", "true")
    expect(aviso.error).not.toHaveBeenCalled()
    expect(aviso.success).not.toHaveBeenCalled()
  })
})

describe("el formulario del comentario normaliza antes de validar (Enmienda 8, T-31)", () => {
  it("PR-C15c: un comentario de 1,000 caracteres más un salto se envía normalizado; uno de 1,001 se rechaza en el formulario", async () => {
    const fetchMock = stubApi((_ruta, metodo) =>
      metodo === "POST"
        ? respuestaJson(201, { comentario: comentario(3, { propio: true }) })
        : respuestaJson(200, listaDeComentarios([])),
    )
    renderPublicacion()
    abrirComentarios()
    const campo = await screen.findByLabelText("Escribe un comentario")

    fireEvent.change(campo, { target: { value: `${"c".repeat(1000)}\r\n` } })
    fireEvent.click(screen.getByRole("button", { name: "Comentar" }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Comentario publicado"))
    expect(JSON.parse(String(llamadasA(fetchMock, "/comentarios", "POST")[0]?.[1]?.body))).toEqual({
      texto: "c".repeat(1000),
    })

    fireEvent.change(campo, { target: { value: "c".repeat(1001) } })
    fireEvent.click(screen.getByRole("button", { name: "Comentar" }))
    expect(await screen.findByText("No puede tener más de 1000 caracteres")).toBeInTheDocument()
    expect(llamadasA(fetchMock, "/comentarios", "POST")).toHaveLength(1)
  })
})

describe("cursor de comentarios que ya no existe (Enmienda 8, T-34)", () => {
  it("PR-C17: tras el 400 del cursor en «Ver más comentarios», se muestra el texto que dice qué pasó y el foco no cae en body", async () => {
    stubApi((ruta, metodo) => {
      if (metodo !== "GET") return respuestaJson(500, {})
      if (ruta.includes(`cursor=${idDe(1)}`)) {
        return respuestaJson(400, {
          error: { codigo: "VALIDACION", mensaje: "cursor: no es válido" },
        })
      }
      return respuestaJson(200, listaDeComentarios([comentario(1)], idDe(1)))
    })
    renderPublicacion()
    abrirComentarios()
    const boton = await screen.findByRole("button", { name: "Ver más comentarios" })
    boton.focus()
    fireEvent.click(boton)

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Los comentarios cambiaron mientras los veías. Vuelve a abrirlos para verlos completos.",
    )
    expect(screen.queryByText("no es válido")).toBeNull()
    await waitFor(() => expect(document.activeElement).not.toBe(document.body))
  })
})
