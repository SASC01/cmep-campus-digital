import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { MuroView } from "./muro-view"

// Ataque del Tester (CLASES-c, ronda 2): las correcciones de T-29 (qué ve la persona tras el 400 del
// cursor y que una invalidación no reuse un cursor borrado), T-30 (avisos en los hooks: error de
// campo, 404, cierre y reapertura, doble envío, convivencia con los avisos de borrar) y T-31 (CR
// solo y extremos en blanco: el valor enviado es el normalizado). Sin selectores de clases de
// estilo: rol, etiqueta o texto accesible. Cadenas invisibles con escapes.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/maestro") }))
vi.mock("@/services/navegacion", () => navegacion)

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const AUTOR = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const ALUMNA = { id: "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Ana López" }
const idPublicacion = (n: number) => `5a5b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const idComentario = (n: number) => `6a6b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

// CLASES-d ronda 0, complemento (C-21, §D-R0; §D-D5 "Forma de los datos" y Enmienda 10 del plan de
// CLASES-01): adjuntos es obligatorio en publicacionSchema y el backend lo manda siempre ([] si no
// hay adjuntos), en el muro y en la respuesta 201 de crear. El doble lo trae para seguir pasando el
// schema.parse de apiClient; ninguna aserción cambia y protege lo mismo que antes.
interface PublicacionFalsa {
  id: string
  tipo: "anuncio" | "material"
  titulo: string | null
  texto: string
  autor: { id: string; nombre: string }
  creadoEn: string
  comentarios: number
  adjuntos: unknown[]
}

const publicacion = (n: number, comentarios = 0): PublicacionFalsa => ({
  id: idPublicacion(n),
  tipo: "anuncio",
  titulo: null,
  texto: `Publicación ${String(n)}`,
  autor: AUTOR,
  creadoEn: "2026-09-29T15:30:00.000Z",
  comentarios,
  adjuntos: [],
})

const comentario = (n: number, propio = false) => ({
  id: idComentario(n),
  texto: `Comentario ${String(n)}`,
  autor: ALUMNA,
  creadoEn: "2026-09-29T16:30:00.000Z",
  propio,
})

const diferido = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

// Servidor en memoria con paginación real (cursor = id de la última fila; un cursor que ya no está
// responde 400 VALIDACION "cursor: no es válido", como el adaptador corregido). `pendientes` deja en
// vuelo el siguiente POST o DELETE; `respuestas` fija la respuesta del siguiente POST o DELETE.
const crearServidor = (publicaciones: PublicacionFalsa[]) => {
  const estado = {
    publicaciones: [...publicaciones],
    comentarios: new Map<string, ReturnType<typeof comentario>[]>(),
  }
  const pendientes = new Map<string, Promise<Response>>()
  const base = `/api/clases/${CLASE_ID}/publicaciones`
  const fetchMock = vi.fn<typeof fetch>(async (entrada, init) => {
    const ruta = String(entrada)
    const metodo = init?.method ?? "GET"
    const pendiente = pendientes.get(metodo)
    if (metodo !== "GET" && pendiente) {
      pendientes.delete(metodo)
      return pendiente
    }
    const url = new URL(ruta, "http://x")
    const enComentarios = /\/publicaciones\/([^/?]+)\/comentarios/.exec(url.pathname)
    if (enComentarios && metodo === "GET") {
      const lista = estado.comentarios.get(enComentarios[1] ?? "") ?? []
      return respuestaJson(200, { comentarios: lista, siguienteCursor: null })
    }
    if (enComentarios && metodo === "POST") {
      return respuestaJson(201, { comentario: comentario(88, true) })
    }
    if (url.pathname === base && metodo === "GET") {
      const limite = Number(url.searchParams.get("limite") ?? "20")
      const cursor = url.searchParams.get("cursor")
      let inicio = 0
      if (cursor !== null) {
        const indice = estado.publicaciones.findIndex((p) => p.id === cursor)
        if (indice === -1) return errorApi(400, "VALIDACION", "cursor: no es válido")
        inicio = indice + 1
      }
      const pagina = estado.publicaciones.slice(inicio, inicio + limite)
      const hayMas = estado.publicaciones.length > inicio + limite
      return respuestaJson(200, {
        publicaciones: pagina,
        siguienteCursor: hayMas ? (pagina.at(-1)?.id ?? null) : null,
      })
    }
    if (url.pathname === base && metodo === "POST") {
      return respuestaJson(201, { publicacion: publicacion(899) })
    }
    if (url.pathname.startsWith(`${base}/`) && metodo === "DELETE") {
      const id = url.pathname.slice(url.pathname.lastIndexOf("/") + 1)
      estado.publicaciones = estado.publicaciones.filter((p) => p.id !== id)
      return new Response(null, { status: 204 })
    }
    if (url.pathname.includes("/mis-comentarios/") && metodo === "DELETE") {
      return new Response(null, { status: 204 })
    }
    return errorApi(500, "ERROR_INTERNO", "mensaje del servidor")
  })
  vi.stubGlobal("fetch", fetchMock)
  return { estado, pendientes, fetchMock }
}

const llamadas = (fetchMock: ReturnType<typeof vi.fn<typeof fetch>>, metodo: string, parte = "") =>
  fetchMock.mock.calls.filter(
    ([entrada, init]) => (init?.method ?? "GET") === metodo && String(entrada).includes(parte),
  )

const cuerpoDe = (llamada: Parameters<typeof fetch> | undefined): unknown =>
  JSON.parse(String(llamada?.[1]?.body))

const renderMuro = (rol: "maestro" | "estudiante", queryClient?: QueryClient) => {
  const cliente = queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const vista = render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[`/${rol}/clases/${CLASE_ID}`]}>
        <Routes>
          <Route path={`/${rol}/clases/:claseId`} element={<MuroView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { vista, cliente }
}

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms))

const veinticinco = () => Array.from({ length: 25 }, (_, i) => publicacion(i + 1))

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

describe("ataque CLASES-c r2: T-29 en la interfaz", () => {
  it("tras el 400 del cursor en «Ver más publicaciones», la persona ve un mensaje que dice qué pasó (no el «no es válido» técnico) y el foco no cae en <body>", async () => {
    const { estado } = crearServidor(veinticinco())
    renderMuro("estudiante")
    const verMas = await screen.findByRole("button", { name: "Ver más publicaciones" })
    // Otra persona borra la publicación que es el cursor de la página siguiente.
    estado.publicaciones = estado.publicaciones.filter((p) => p.id !== idPublicacion(20))
    verMas.focus()
    fireEvent.click(verMas)
    const alerta = await screen.findByRole("alert")
    await esperar(50)
    expect(document.activeElement).not.toBe(document.body)
    // MensajeError pinta el título "Error" y el mensaje: el mensaje no puede ser el texto técnico del
    // VALIDACION sin su prefijo (mensajeDeErrorClases quita "cursor:" y deja "no es válido").
    expect(
      within(alerta).queryByText("no es válido"),
      `el muro solo dice «${alerta.textContent ?? ""}»: no dice qué pasó ni qué hacer (DESIGN.md §9)`,
    ).toBeNull()
  })

  it("tras el 400 del cursor, volver a entrar al muro lo recupera sin recargar la página", async () => {
    const { estado } = crearServidor(veinticinco())
    const { vista, cliente } = renderMuro("estudiante")
    const verMas = await screen.findByRole("button", { name: "Ver más publicaciones" })
    estado.publicaciones = estado.publicaciones.filter((p) => p.id !== idPublicacion(20))
    fireEvent.click(verMas)
    await screen.findByRole("alert")
    vista.unmount()
    renderMuro("estudiante", cliente)
    expect(await screen.findByText("Publicación 1")).toBeInTheDocument()
    expect(await screen.findByText("Publicación 19")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("con dos páginas cargadas, borrar la publicación que era el cursor de la página 2 no vuelve a pedir ese cursor ni muestra un error", async () => {
    const { fetchMock } = crearServidor(veinticinco())
    renderMuro("maestro")
    fireEvent.click(await screen.findByRole("button", { name: "Ver más publicaciones" }))
    await screen.findByText("Publicación 25")
    const tarjeta = screen.getByText("Publicación 20").closest("li")
    if (!(tarjeta instanceof HTMLElement))
      throw new Error("Precondición: no está la publicación 20")
    fireEvent.click(within(tarjeta).getByRole("button", { name: "Borrar publicación" }))
    fireEvent.click(within(tarjeta).getByRole("button", { name: "Sí, borrar" }))
    await waitFor(() => expect(screen.queryByText("Publicación 20")).toBeNull())
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Publicación borrada"))
    await esperar(50)
    const borrado = fetchMock.mock.calls.findIndex(([, init]) => init?.method === "DELETE")
    const despues = fetchMock.mock.calls.slice(borrado + 1)
    expect(
      despues.some(([entrada]) => String(entrada).includes(`cursor=${idPublicacion(20)}`)),
    ).toBe(false)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByText("Publicación 21")).toBeInTheDocument()
    expect(screen.getByText("Publicación 25")).toBeInTheDocument()
  })
})

describe("ataque CLASES-c r2: T-30 con los avisos en los hooks", () => {
  const abrirYEscribir = async (texto: string) => {
    fireEvent.click(await screen.findByRole("button", { name: "Ver comentarios (0)" }))
    fireEvent.change(await screen.findByLabelText("Escribe un comentario"), {
      target: { value: texto },
    })
  }

  it("un error de campo del servidor (400 «texto: …») marca el campo con el formulario montado, sin aviso", async () => {
    const { pendientes } = crearServidor([publicacion(1)])
    renderMuro("estudiante")
    await abrirYEscribir("Hola")
    pendientes.set(
      "POST",
      Promise.resolve(errorApi(400, "VALIDACION", "texto: Escribe tu comentario")),
    )
    fireEvent.click(screen.getByRole("button", { name: "Comentar" }))
    expect(await screen.findByText("Escribe tu comentario")).toBeInTheDocument()
    expect(screen.getByLabelText("Escribe un comentario")).toHaveAttribute("aria-invalid", "true")
    await esperar(50)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(aviso.success).not.toHaveBeenCalled()
  })

  it("un 404 PUBLICACION_NO_ENCONTRADA al comentar avisa una sola vez, sin marcar el campo", async () => {
    const { pendientes } = crearServidor([publicacion(1)])
    renderMuro("estudiante")
    await abrirYEscribir("Hola")
    pendientes.set(
      "POST",
      Promise.resolve(errorApi(404, "PUBLICACION_NO_ENCONTRADA", "Esa publicación ya no existe.")),
    )
    fireEvent.click(screen.getByRole("button", { name: "Comentar" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith("Esa publicación ya no existe."))
    await esperar(50)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText("Escribe un comentario")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    )
  })

  it("cerrar y volver a abrir los comentarios con el POST en vuelo: el aviso de éxito sale una sola vez", async () => {
    const { pendientes } = crearServidor([publicacion(1)])
    renderMuro("estudiante")
    await abrirYEscribir("Hola")
    const enVuelo = diferido()
    pendientes.set("POST", enVuelo.promesa)
    fireEvent.click(screen.getByRole("button", { name: "Comentar" }))
    fireEvent.click(screen.getByRole("button", { name: "Ocultar comentarios" }))
    fireEvent.click(await screen.findByRole("button", { name: "Ver comentarios (0)" }))
    await screen.findByLabelText("Escribe un comentario")
    enVuelo.resolver(respuestaJson(201, { comentario: comentario(88, true) }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Comentario publicado"))
    await esperar(50)
    expect(aviso.success).toHaveBeenCalledTimes(1)
  })

  it("doble clic rápido (sin espera) en «Comentar» y en «Publicar anuncio»: una petición y un aviso cada uno", async () => {
    const { fetchMock } = crearServidor([publicacion(1)])
    renderMuro("maestro")
    await screen.findByText("Publicación 1")
    fireEvent.change(screen.getByLabelText("Anuncio"), { target: { value: "Aviso" } })
    const publicar = screen.getByRole("button", { name: "Publicar anuncio" })
    fireEvent.click(publicar)
    fireEvent.click(publicar)
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Publicado"))
    await abrirYEscribir("Hola")
    const comentar = screen.getByRole("button", { name: "Comentar" })
    fireEvent.click(comentar)
    fireEvent.click(comentar)
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Comentario publicado"))
    await esperar(50)
    expect(llamadas(fetchMock, "POST", "/comentarios")).toHaveLength(1)
    expect(
      llamadas(fetchMock, "POST").filter(([e]) => !String(e).includes("/comentarios")),
    ).toHaveLength(1)
    expect(aviso.success.mock.calls).toEqual([["Publicado"], ["Comentario publicado"]])
  })

  it("crear y borrar seguido en la misma vista: cada aviso sale una sola vez y en su orden", async () => {
    const { estado } = crearServidor([publicacion(1), publicacion(2)])
    estado.comentarios.set(idPublicacion(1), [comentario(1, true)])
    renderMuro("maestro")
    await screen.findByText("Publicación 2")
    fireEvent.change(screen.getByLabelText("Anuncio"), { target: { value: "Aviso" } })
    fireEvent.click(screen.getByRole("button", { name: "Publicar anuncio" }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Publicado"))
    const tarjeta2 = screen.getByText("Publicación 2").closest("li")
    if (!(tarjeta2 instanceof HTMLElement)) throw new Error("Precondición: falta la publicación 2")
    fireEvent.click(within(tarjeta2).getByRole("button", { name: "Borrar publicación" }))
    fireEvent.click(within(tarjeta2).getByRole("button", { name: "Sí, borrar" }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Publicación borrada"))
    fireEvent.click(await screen.findByRole("button", { name: "Ver comentarios (0)" }))
    const fila = (await screen.findByText("Comentario 1")).closest("li")
    if (!fila) throw new Error("Precondición: el comentario no está en una fila")
    fireEvent.change(screen.getByLabelText("Escribe un comentario"), { target: { value: "Otro" } })
    fireEvent.click(screen.getByRole("button", { name: "Comentar" }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Comentario publicado"))
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar" }))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar comentario" }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Comentario borrado"))
    await esperar(50)
    expect(aviso.success.mock.calls).toEqual([
      ["Publicado"],
      ["Publicación borrada"],
      ["Comentario publicado"],
      ["Comentario borrado"],
    ])
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("ataque CLASES-c r2: T-31 en los formularios", () => {
  const blancos = "\u{FEFF}\u{A0}\u{3000}\t \n"

  it("CR solo y extremos en blanco: el comentario enviado es el normalizado y el campo visible no cambia hasta el éxito", async () => {
    const { fetchMock, pendientes } = crearServidor([publicacion(1)])
    renderMuro("estudiante")
    fireEvent.click(await screen.findByRole("button", { name: "Ver comentarios (0)" }))
    const campo = await screen.findByLabelText("Escribe un comentario")
    fireEvent.change(campo, { target: { value: `${blancos}uno\rdos\r\rtres${blancos}` } })
    const enVuelo = diferido()
    pendientes.set("POST", enVuelo.promesa)
    fireEvent.click(screen.getByRole("button", { name: "Comentar" }))
    await waitFor(() => expect(llamadas(fetchMock, "POST", "/comentarios")).toHaveLength(1))
    expect(cuerpoDe(llamadas(fetchMock, "POST", "/comentarios")[0])).toEqual({
      texto: "uno\ndos\n\ntres",
    })
    expect((campo as HTMLTextAreaElement).value).toContain("uno")
    enVuelo.resolver(respuestaJson(201, { comentario: comentario(88, true) }))
    await waitFor(() => expect((campo as HTMLTextAreaElement).value).toBe(""))
  })

  it("solo blancos: el formulario muestra el mismo mensaje que el servidor y no llama a la API (anuncio, título y comentario)", async () => {
    const { fetchMock } = crearServidor([publicacion(1)])
    renderMuro("maestro")
    await screen.findByText("Publicación 1")
    fireEvent.change(screen.getByLabelText("Anuncio"), { target: { value: `${blancos}\r` } })
    fireEvent.click(screen.getByRole("button", { name: "Publicar anuncio" }))
    expect(await screen.findByText("Escribe el anuncio")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Material" }))
    fireEvent.change(screen.getByLabelText("Título del material"), {
      target: { value: "\u{FEFF}\u{3000} " },
    })
    fireEvent.click(screen.getByRole("button", { name: "Publicar material" }))
    expect(await screen.findByText("Escribe el título del material")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Ver comentarios (0)" }))
    fireEvent.change(await screen.findByLabelText("Escribe un comentario"), {
      target: { value: blancos },
    })
    fireEvent.click(screen.getByRole("button", { name: "Comentar" }))
    expect(await screen.findByText("Escribe tu comentario")).toBeInTheDocument()
    expect(llamadas(fetchMock, "POST")).toHaveLength(0)
  })

  it("material con extremos en blanco en el título y la descripción: se envían normalizados", async () => {
    const { fetchMock } = crearServidor([publicacion(1)])
    renderMuro("maestro")
    await screen.findByText("Publicación 1")
    fireEvent.click(screen.getByRole("button", { name: "Material" }))
    fireEvent.change(screen.getByLabelText("Título del material"), {
      target: { value: "\u{FEFF}  Unidad 1\t" },
    })
    fireEvent.change(screen.getByLabelText("Descripción (opcional)"), {
      target: { value: `${blancos}línea 1\rlínea 2${blancos}` },
    })
    fireEvent.click(screen.getByRole("button", { name: "Publicar material" }))
    await waitFor(() => expect(llamadas(fetchMock, "POST")).toHaveLength(1))
    // CLASES-d ronda 0, complemento (C-22, §D-R0; §D-D5 "Forma de los datos" y Enmienda 10): el
    // formulario envía siempre archivoIds, [] si no hay adjuntos. Sigue protegiendo la normalización
    // de T-31 del título y la descripción, con el cuerpo completo.
    expect(cuerpoDe(llamadas(fetchMock, "POST")[0])).toEqual({
      tipo: "material",
      titulo: "Unidad 1",
      texto: "línea 1\nlínea 2",
      archivoIds: [],
    })
  })
})
