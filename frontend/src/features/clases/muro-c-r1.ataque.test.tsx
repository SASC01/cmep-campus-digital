import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { AlumnosView } from "./alumnos-view"
import { ClaseLayout } from "./clase-layout"
import { EditarClaseView } from "./editar-clase-view"
import { MuroView } from "./muro-view"
import { PersonasView } from "./personas-view"

// Ataque del Tester (CLASES-c, ronda 1): el muro en la interfaz. Avisos perdidos al crear con el
// formulario desmontado (N-C5), doble envío, el mismo criterio que el servidor (§D-C4), texto como
// texto, foco de §7.14 con dos publicaciones abiertas, las cinco vistas con ConClaseDeLaRuta sin
// :claseId y el aviso de "Agregar a la clase" con la fila desmontada (§D-C5 bis). Sin selectores de
// clases de estilo: rol, etiqueta o texto accesible.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/maestro") }))
vi.mock("@/services/navegacion", () => navegacion)

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const AUTOR = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const ALUMNA = { id: "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Ana López" }
const idPublicacion = (n: number) => `5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d${String(10 + n)}`
const idComentario = (n: number) => `6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d${String(10 + n)}`
const idAlumno = (n: number) => `7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d${String(10 + n)}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const error500 = () =>
  respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "mensaje del servidor" } })

interface PublicacionFalsa {
  id: string
  tipo: "anuncio" | "material"
  titulo: string | null
  texto: string
  autor: { id: string; nombre: string }
  creadoEn: string
  comentarios: number
}

interface ComentarioFalso {
  id: string
  texto: string
  autor: { id: string; nombre: string }
  creadoEn: string
  propio: boolean
}

const publicacion = (n: number, extra: Partial<PublicacionFalsa> = {}): PublicacionFalsa => ({
  id: idPublicacion(n),
  tipo: "anuncio",
  titulo: null,
  texto: `Publicación ${String(n)}`,
  autor: AUTOR,
  creadoEn: "2026-09-29T15:30:00.000Z",
  comentarios: 0,
  ...extra,
})

const comentario = (n: number, extra: Partial<ComentarioFalso> = {}): ComentarioFalso => ({
  id: idComentario(n),
  texto: `Comentario ${String(n)}`,
  autor: ALUMNA,
  creadoEn: "2026-09-29T16:30:00.000Z",
  propio: false,
  ...extra,
})

const diferido = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

// Servidor en memoria del muro: el estado cambia con los POST y DELETE, y las listas se calculan
// en cada GET. `pendientes` deja en vuelo el siguiente POST o DELETE que coincida.
const crearServidor = (
  publicaciones: PublicacionFalsa[],
  comentarios: Record<string, ComentarioFalso[]>,
) => {
  const estado = { publicaciones: [...publicaciones], comentarios: { ...comentarios } }
  const pendientes = new Map<string, Promise<Response>>()
  // Si hay compuerta, todo GET espera a que se abra: así dos consultas llegan en el mismo turno.
  const compuerta: { lecturas: Promise<void> | null } = { lecturas: null }
  const base = `/api/clases/${CLASE_ID}`
  const fetchMock = vi.fn<typeof fetch>(async (entrada, init) => {
    const ruta = String(entrada)
    const metodo = init?.method ?? "GET"
    if (metodo === "GET" && compuerta.lecturas) await compuerta.lecturas
    const pendiente = pendientes.get(metodo)
    if (metodo !== "GET" && pendiente) {
      pendientes.delete(metodo)
      return pendiente
    }
    const conComentarios = /\/publicaciones\/([^/?]+)\/comentarios/.exec(ruta)
    if (conComentarios && metodo === "GET") {
      const lista = estado.comentarios[conComentarios[1] ?? ""] ?? []
      return respuestaJson(200, { comentarios: lista, siguienteCursor: null })
    }
    if (conComentarios && metodo === "POST") {
      const cuerpo = JSON.parse(String(init?.body)) as { texto: string }
      const nuevo = comentario(89, { texto: cuerpo.texto, propio: true })
      return respuestaJson(201, { comentario: nuevo })
    }
    if (conComentarios && metodo === "DELETE") {
      const publicacionId = conComentarios[1] ?? ""
      const comentarioId = ruta.slice(ruta.lastIndexOf("/") + 1)
      estado.comentarios[publicacionId] = (estado.comentarios[publicacionId] ?? []).filter(
        (c) => c.id !== comentarioId,
      )
      estado.publicaciones = estado.publicaciones.map((p) =>
        p.id === publicacionId ? { ...p, comentarios: p.comentarios - 1 } : p,
      )
      return new Response(null, { status: 204 })
    }
    if (ruta.startsWith(`${base}/publicaciones`) && metodo === "GET") {
      return respuestaJson(200, { publicaciones: estado.publicaciones, siguienteCursor: null })
    }
    if (ruta.startsWith(`${base}/publicaciones`) && metodo === "POST") {
      return respuestaJson(201, { publicacion: publicacion(88) })
    }
    if (ruta.startsWith(`${base}/publicaciones/`) && metodo === "DELETE") {
      const publicacionId = ruta.slice(ruta.lastIndexOf("/") + 1)
      estado.publicaciones = estado.publicaciones.filter((p) => p.id !== publicacionId)
      return new Response(null, { status: 204 })
    }
    return error500()
  })
  vi.stubGlobal("fetch", fetchMock)
  return { estado, pendientes, compuerta, fetchMock }
}

const llamadas = (
  fetchMock: ReturnType<typeof vi.fn<typeof fetch>>,
  metodo: string,
  parte = "/api/",
) =>
  fetchMock.mock.calls.filter(
    ([entrada, init]) => (init?.method ?? "GET") === metodo && String(entrada).includes(parte),
  )

const conProveedores = (hijo: ReactNode, ruta: string, patron: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path={patron} element={hijo} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const renderMuro = (rol: "maestro" | "estudiante") =>
  conProveedores(<MuroView />, `/${rol}/clases/${CLASE_ID}`, `/${rol}/clases/:claseId`)

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms))

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
  navegacion.irA.mockClear()
})

describe("ataque CLASES-c r1: avisos de crear con el formulario desmontado (N-C5)", () => {
  it.each([
    ["error", () => error500(), "error", "Algo salió mal. Inténtalo de nuevo."],
    [
      "éxito",
      () => respuestaJson(201, { comentario: comentario(89, { propio: true }) }),
      "success",
      "Comentario publicado",
    ],
  ] as const)(
    "comentario con %s: si la persona pulsa «Ocultar comentarios» con el POST en vuelo, el aviso sale igual (una vez)",
    async (_caso, respuesta, tipo, texto) => {
      const { pendientes } = crearServidor([publicacion(1)], { [idPublicacion(1)]: [] })
      renderMuro("estudiante")
      fireEvent.click(await screen.findByRole("button", { name: "Ver comentarios (0)" }))
      const campo = await screen.findByLabelText("Escribe un comentario")
      fireEvent.change(campo, { target: { value: "Mi duda sobre la tarea" } })
      const enVuelo = diferido()
      pendientes.set("POST", enVuelo.promesa)
      fireEvent.click(screen.getByRole("button", { name: "Comentar" }))
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Comentar" })).toHaveAttribute(
          "aria-busy",
          "true",
        ),
      )

      fireEvent.click(screen.getByRole("button", { name: "Ocultar comentarios" }))
      expect(screen.queryByLabelText("Escribe un comentario")).toBeNull()
      enVuelo.resolver(respuesta())

      await waitFor(
        () => expect(aviso[tipo], `faltó el aviso «${texto}»`).toHaveBeenCalledWith(texto),
        { timeout: 2000 },
      )
      expect(aviso[tipo]).toHaveBeenCalledTimes(1)
    },
  )

  it.each([
    ["error", () => error500(), "error", "Algo salió mal. Inténtalo de nuevo."],
    ["éxito", () => respuestaJson(201, { publicacion: publicacion(88) }), "success", "Publicado"],
  ] as const)(
    "publicación con %s: si la persona sale del muro con el POST en vuelo, el aviso sale igual (una vez)",
    async (_caso, respuesta, tipo, texto) => {
      const { pendientes } = crearServidor([publicacion(1)], {})
      const vista = renderMuro("maestro")
      await screen.findByText("Publicación 1")
      fireEvent.change(screen.getByLabelText("Anuncio"), {
        target: { value: "Mañana no hay clase" },
      })
      const enVuelo = diferido()
      pendientes.set("POST", enVuelo.promesa)
      fireEvent.click(screen.getByRole("button", { name: "Publicar anuncio" }))
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Publicar anuncio" })).toHaveAttribute(
          "aria-busy",
          "true",
        ),
      )

      // Ir a otra pestaña de la clase desmonta el muro; la caché y la mutación siguen vivas.
      vista.unmount()
      enVuelo.resolver(respuesta())

      await waitFor(
        () => expect(aviso[tipo], `faltó el aviso «${texto}»`).toHaveBeenCalledWith(texto),
        { timeout: 2000 },
      )
      expect(aviso[tipo]).toHaveBeenCalledTimes(1)
    },
  )
})

describe("ataque CLASES-c r1: doble envío (enEspera)", () => {
  it("doble clic humano (30 ms) en «Comentar», «Publicar anuncio», «Sí, borrar» y «Sí, borrar comentario»: una sola petición cada uno", async () => {
    const { fetchMock, pendientes } = crearServidor([publicacion(1, { comentarios: 1 })], {
      [idPublicacion(1)]: [comentario(1)],
    })
    renderMuro("maestro")
    await screen.findByText("Publicación 1")

    // Publicar anuncio.
    fireEvent.change(screen.getByLabelText("Anuncio"), { target: { value: "Aviso" } })
    const publicar = diferido()
    pendientes.set("POST", publicar.promesa)
    fireEvent.click(screen.getByRole("button", { name: "Publicar anuncio" }))
    await esperar(30)
    fireEvent.click(screen.getByRole("button", { name: "Publicar anuncio" }))
    expect(llamadas(fetchMock, "POST", "/publicaciones")).toHaveLength(1)
    publicar.resolver(respuestaJson(201, { publicacion: publicacion(88) }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Publicado"))

    // Comentar.
    fireEvent.click(screen.getByRole("button", { name: "Ver comentarios (1)" }))
    fireEvent.change(await screen.findByLabelText("Escribe un comentario"), {
      target: { value: "Hola" },
    })
    const comentar = diferido()
    pendientes.set("POST", comentar.promesa)
    fireEvent.click(screen.getByRole("button", { name: "Comentar" }))
    await esperar(30)
    fireEvent.click(screen.getByRole("button", { name: "Comentar" }))
    expect(llamadas(fetchMock, "POST", "/comentarios")).toHaveLength(1)
    comentar.resolver(respuestaJson(201, { comentario: comentario(89, { propio: true }) }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Comentario publicado"))

    // Sí, borrar comentario.
    const fila = (await screen.findByText("Comentario 1")).closest("li")
    if (!fila) throw new Error("Precondición: el comentario no está en una fila")
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar" }))
    const borrarComentario = diferido()
    pendientes.set("DELETE", borrarComentario.promesa)
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar comentario" }))
    await esperar(30)
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, borrar comentario" }))
    expect(llamadas(fetchMock, "DELETE", "/comentarios/")).toHaveLength(1)
    borrarComentario.resolver(new Response(null, { status: 204 }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Comentario borrado"))

    // Sí, borrar (publicación).
    fireEvent.click(screen.getByRole("button", { name: "Borrar publicación" }))
    const borrarPublicacion = diferido()
    pendientes.set("DELETE", borrarPublicacion.promesa)
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar" }))
    await esperar(30)
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar" }))
    expect(
      llamadas(fetchMock, "DELETE", "/publicaciones/").filter(
        ([entrada]) => !String(entrada).includes("/comentarios/"),
      ),
    ).toHaveLength(1)
    borrarPublicacion.resolver(new Response(null, { status: 204 }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Publicación borrada"))
    expect(aviso.success.mock.calls.filter(([t]) => t === "Publicación borrada")).toHaveLength(1)
    expect(aviso.success.mock.calls.filter(([t]) => t === "Comentario borrado")).toHaveLength(1)
  })
})

describe("ataque CLASES-c r1: el formulario decide igual que el servidor (§D-C4)", () => {
  it("un comentario de 1,000 caracteres seguido de un salto de línea se envía: el servidor lo recorta y lo acepta", async () => {
    const { fetchMock } = crearServidor([publicacion(1)], { [idPublicacion(1)]: [] })
    renderMuro("estudiante")
    fireEvent.click(await screen.findByRole("button", { name: "Ver comentarios (0)" }))
    fireEvent.change(await screen.findByLabelText("Escribe un comentario"), {
      target: { value: `${"a".repeat(1000)}\n` },
    })
    fireEvent.click(screen.getByRole("button", { name: "Comentar" }))
    await waitFor(
      () =>
        expect(
          llamadas(fetchMock, "POST", "/comentarios"),
          `el formulario no lo envió: ${screen.queryByText(/No puede tener más de/)?.textContent ?? "sin error visible"}`,
        ).toHaveLength(1),
      { timeout: 1500 },
    )
  })

  it("un anuncio de 5,000 caracteres entre saltos de línea se envía: el servidor lo recorta y lo acepta", async () => {
    const { fetchMock } = crearServidor([publicacion(1)], {})
    renderMuro("maestro")
    await screen.findByText("Publicación 1")
    fireEvent.change(screen.getByLabelText("Anuncio"), {
      target: { value: `\n${"a".repeat(5000)}\n` },
    })
    fireEvent.click(screen.getByRole("button", { name: "Publicar anuncio" }))
    await waitFor(
      () =>
        expect(
          llamadas(fetchMock, "POST", "/publicaciones"),
          `el formulario no lo envió: ${screen.queryByText(/No puede tener más de/)?.textContent ?? "sin error visible"}`,
        ).toHaveLength(1),
      { timeout: 1500 },
    )
  })

  it("solo invisibles: el formulario muestra el mismo mensaje que el servidor y no llama a la API (comentario, anuncio y título)", async () => {
    const { fetchMock } = crearServidor([publicacion(1)], { [idPublicacion(1)]: [] })
    renderMuro("maestro")
    await screen.findByText("Publicación 1")
    const invisibles = "\u{2800}\u{3164}\u{1D159}\u{200B}\u{E0041}\u{301}\u{3000}"
    fireEvent.change(screen.getByLabelText("Anuncio"), { target: { value: invisibles } })
    fireEvent.click(screen.getByRole("button", { name: "Publicar anuncio" }))
    expect(await screen.findByText("Escribe el anuncio")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Material" }))
    fireEvent.change(screen.getByLabelText("Título del material"), {
      target: { value: invisibles },
    })
    fireEvent.click(screen.getByRole("button", { name: "Publicar material" }))
    expect(await screen.findByText("Escribe el título del material")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Ver comentarios (0)" }))
    fireEvent.change(await screen.findByLabelText("Escribe un comentario"), {
      target: { value: invisibles },
    })
    fireEvent.click(screen.getByRole("button", { name: "Comentar" }))
    expect(await screen.findByText("Escribe tu comentario")).toBeInTheDocument()
    expect(llamadas(fetchMock, "POST")).toHaveLength(0)
  })
})

describe("ataque CLASES-c r1: texto como texto", () => {
  it("HTML en el título, el texto, el comentario y el nombre del autor se muestra como texto, sin nodos nuevos; los saltos de línea llegan al nodo", async () => {
    const malicioso = '<img src="x" onerror="alert(1)">'
    crearServidor(
      [
        publicacion(1, {
          tipo: "material",
          titulo: `Título ${malicioso}`,
          texto: "<script>alert(2)</script>\nsegunda línea",
          autor: { id: AUTOR.id, nombre: "<b>Maestro</b><svg onload=alert(3)>" },
          comentarios: 1,
        }),
      ],
      {
        [idPublicacion(1)]: [
          comentario(1, {
            texto: `<iframe src="javascript:alert(4)"></iframe>${malicioso}`,
            autor: { id: ALUMNA.id, nombre: '<a href="javascript:alert(5)">Ana</a>' },
          }),
        ],
      },
    )
    const vista = renderMuro("estudiante")
    expect(
      await screen.findByRole("heading", { level: 3, name: `Título ${malicioso}` }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Ver comentarios (1)" }))
    await screen.findByText(`<iframe src="javascript:alert(4)"></iframe>${malicioso}`)
    expect(screen.getByText("<b>Maestro</b><svg onload=alert(3)>")).toBeInTheDocument()
    expect(screen.getByText('<a href="javascript:alert(5)">Ana</a>')).toBeInTheDocument()
    expect(vista.container.querySelectorAll("img, script, iframe, svg[onload], b, a")).toHaveLength(
      0,
    )
    const texto = screen.getByText(
      (_contenido, elemento) =>
        elemento?.tagName === "P" &&
        elemento.textContent === "<script>alert(2)</script>\nsegunda línea",
    )
    expect(texto.textContent).toContain("\n")
  })
})

describe("ataque CLASES-c r1: foco de §7.14 con dos publicaciones abiertas", () => {
  it("al borrar un comentario de la segunda publicación, el foco queda en esa publicación (su vecino o su encabezado), nunca en otra ni en <body>", async () => {
    crearServidor([publicacion(1, { comentarios: 2 }), publicacion(2, { comentarios: 2 })], {
      [idPublicacion(1)]: [comentario(11, { texto: "A uno" }), comentario(12, { texto: "A dos" })],
      [idPublicacion(2)]: [comentario(21, { texto: "B uno" }), comentario(22, { texto: "B dos" })],
    })
    renderMuro("maestro")
    await screen.findByText("Publicación 2")
    for (const boton of screen.getAllByRole("button", { name: "Ver comentarios (2)" })) {
      fireEvent.click(boton)
    }
    await screen.findByText("A uno")
    const filaB1 = (await screen.findByText("B uno")).closest("li")
    if (!filaB1) throw new Error("Precondición: el comentario B uno no está en una fila")
    const borrar = within(filaB1).getByRole("button", { name: "Borrar" })
    borrar.focus()
    fireEvent.click(borrar)
    const confirmar = within(filaB1).getByRole("button", { name: "Sí, borrar comentario" })
    confirmar.focus()
    fireEvent.click(confirmar)

    await waitFor(() => expect(screen.queryByText("B uno")).toBeNull())
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Comentario borrado"))
    // Deja que lleguen las dos consultas que invalida el borrado (comentarios y muro).
    await esperar(100)
    const filaB2 = screen.getByText("B dos").closest("li")
    if (!filaB2) throw new Error("Precondición: el comentario B dos no está en una fila")
    await waitFor(() => expect(document.activeElement).not.toBe(document.body))
    const filaA1 = screen.getByText("A uno").closest("li")
    const filaA2 = screen.getByText("A dos").closest("li")
    expect(
      filaA1?.contains(document.activeElement) === true ||
        filaA2?.contains(document.activeElement) === true,
      `el foco saltó a la otra publicación: ${document.activeElement?.textContent ?? ""}`,
    ).toBe(false)
    expect(document.activeElement).toBe(within(filaB2).getByRole("button", { name: "Borrar" }))
  })

  it("al pedir confirmación el foco va a «Cancelar» y al cancelar vuelve a «Borrar», en la publicación y en el comentario", async () => {
    crearServidor([publicacion(1, { comentarios: 1 })], { [idPublicacion(1)]: [comentario(1)] })
    renderMuro("maestro")
    await screen.findByText("Publicación 1")
    fireEvent.click(screen.getByRole("button", { name: "Borrar publicación" }))
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar" }))
    expect(screen.getByText("Se borrará con sus comentarios.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Borrar publicación" }))

    fireEvent.click(screen.getByRole("button", { name: "Ver comentarios (1)" }))
    const fila = (await screen.findByText("Comentario 1")).closest("li")
    if (!fila) throw new Error("Precondición: el comentario no está en una fila")
    fireEvent.click(within(fila).getByRole("button", { name: "Borrar" }))
    expect(document.activeElement).toBe(within(fila).getByRole("button", { name: "Cancelar" }))
    fireEvent.click(within(fila).getByRole("button", { name: "Cancelar" }))
    expect(document.activeElement).toBe(within(fila).getByRole("button", { name: "Borrar" }))
  })
})

describe("ataque CLASES-c r1: las cinco vistas con ConClaseDeLaRuta, sin :claseId (§D-C5 bis)", () => {
  it.each([
    ["ClaseLayout", <ClaseLayout key="a" />],
    ["EditarClaseView", <EditarClaseView key="b" />],
    ["PersonasView", <PersonasView key="c" />],
    ["AlumnosView", <AlumnosView key="d" />],
    ["MuroView", <MuroView key="e" />],
  ])(
    "%s sin :claseId muestra «No tienes acceso a esta clase.» y no pide nada",
    async (_n, vista) => {
      const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(error500()))
      vi.stubGlobal("fetch", fetchMock)
      conProveedores(vista, "/maestro/clases", "/maestro/clases")
      expect(await screen.findByRole("alert")).toHaveTextContent("No tienes acceso a esta clase.")
      await esperar(50)
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )
})

describe("ataque CLASES-c r1: «Agregar a la clase» con la fila desmontada (§D-C5 bis)", () => {
  it("con el POST en vuelo, la persona escribe otro término y el POST falla: el error se avisa una sola vez", async () => {
    const enVuelo = diferido()
    const base = `/api/clases/${CLASE_ID}/alumnos`
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada, init) => {
        const ruta = String(entrada)
        if (ruta.startsWith(`${base}/candidatos`)) {
          const candidatos = ruta.includes("q=candidato")
            ? [
                {
                  id: idAlumno(1),
                  nombre: "Candidato 1",
                  correoEnmascarado: "ca***@x.mx",
                  yaInscrito: false,
                },
              ]
            : []
          return Promise.resolve(respuestaJson(200, { candidatos, hayMas: false }))
        }
        if (ruta === base && init?.method === "POST") return enVuelo.promesa
        return Promise.resolve(respuestaJson(200, { alumnos: [], total: 0, siguienteCursor: null }))
      }),
    )
    conProveedores(
      <AlumnosView />,
      `/maestro/clases/${CLASE_ID}/alumnos`,
      "/maestro/clases/:claseId/alumnos",
    )
    const campo = await screen.findByLabelText("Buscar alumno por nombre")
    fireEvent.change(campo, { target: { value: "candidato" } })
    fireEvent.click(await screen.findByRole("button", { name: "Agregar a la clase Candidato 1" }))
    fireEvent.change(campo, { target: { value: "zzzzzz" } })
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Agregar a la clase Candidato 1" })).toBeNull(),
    )
    enVuelo.resolver(error500())
    await waitFor(() =>
      expect(aviso.error).toHaveBeenCalledWith("Algo salió mal. Inténtalo de nuevo."),
    )
    await esperar(50)
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(aviso.success).not.toHaveBeenCalled()
  })
})

describe("ataque CLASES-c r1: foco de §7.14 cuando el muro y los comentarios llegan juntos", () => {
  it("al borrar un comentario de la segunda publicación y llegar en el mismo turno la lista del muro y la de comentarios, el foco no salta a la primera publicación", async () => {
    const { compuerta, fetchMock } = crearServidor(
      [publicacion(1, { comentarios: 2 }), publicacion(2, { comentarios: 2 })],
      {
        [idPublicacion(1)]: [
          comentario(11, { texto: "A uno" }),
          comentario(12, { texto: "A dos" }),
        ],
        [idPublicacion(2)]: [
          comentario(21, { texto: "B uno" }),
          comentario(22, { texto: "B dos" }),
        ],
      },
    )
    renderMuro("maestro")
    await screen.findByText("Publicación 2")
    for (const boton of screen.getAllByRole("button", { name: "Ver comentarios (2)" })) {
      fireEvent.click(boton)
    }
    await screen.findByText("A uno")
    const filaB1 = (await screen.findByText("B uno")).closest("li")
    if (!filaB1) throw new Error("Precondición: el comentario B uno no está en una fila")
    const borrar = within(filaB1).getByRole("button", { name: "Borrar" })
    borrar.focus()
    fireEvent.click(borrar)
    const confirmar = within(filaB1).getByRole("button", { name: "Sí, borrar comentario" })
    confirmar.focus()

    let abrir: () => void = () => undefined
    compuerta.lecturas = new Promise<void>((resolver) => {
      abrir = resolver
    })
    const lecturasAntes = llamadas(fetchMock, "GET").length
    fireEvent.click(confirmar)
    // El borrado invalida los comentarios de B y el muro: las dos lecturas quedan en la compuerta.
    await waitFor(() =>
      expect(llamadas(fetchMock, "GET").length).toBeGreaterThanOrEqual(lecturasAntes + 2),
    )
    compuerta.lecturas = null
    abrir()

    await waitFor(() => expect(screen.queryByText("B uno")).toBeNull())
    await esperar(100)
    const filaB2 = screen.getByText("B dos").closest("li")
    const filaA1 = screen.getByText("A uno").closest("li")
    const filaA2 = screen.getByText("A dos").closest("li")
    if (!filaB2 || !filaA1 || !filaA2) throw new Error("Precondición: faltan filas de comentarios")
    expect(document.activeElement, "el foco quedó en <body>").not.toBe(document.body)
    expect(
      filaA1.contains(document.activeElement) || filaA2.contains(document.activeElement),
      `el foco saltó a la otra publicación: «${document.activeElement?.textContent ?? ""}» de «${
        filaA1.contains(document.activeElement) ? "A uno" : "A dos"
      }»`,
    ).toBe(false)
    expect(document.activeElement).toBe(within(filaB2).getByRole("button", { name: "Borrar" }))
  })
})

describe("ataque CLASES-c r1: foco de «Ver más publicaciones» y «Ver más comentarios»", () => {
  const conPaginas = (
    tipo: "publicaciones" | "comentarios",
    segunda: () => Response,
  ): ReturnType<typeof vi.fn<typeof fetch>> => {
    const fetchMock = vi.fn<typeof fetch>((entrada) => {
      const ruta = String(entrada)
      const esComentarios = ruta.includes("/comentarios")
      if (esComentarios && tipo === "comentarios" && ruta.includes(`cursor=${idComentario(1)}`))
        return Promise.resolve(segunda())
      if (esComentarios) {
        const siguiente = tipo === "comentarios" ? idComentario(1) : null
        return Promise.resolve(
          respuestaJson(200, { comentarios: [comentario(1)], siguienteCursor: siguiente }),
        )
      }
      if (tipo === "publicaciones" && ruta.includes(`cursor=${idPublicacion(1)}`))
        return Promise.resolve(segunda())
      const siguiente = tipo === "publicaciones" ? idPublicacion(1) : null
      return Promise.resolve(
        respuestaJson(200, {
          publicaciones: [publicacion(1, { comentarios: 2 })],
          siguienteCursor: siguiente,
        }),
      )
    })
    vi.stubGlobal("fetch", fetchMock)
    return fetchMock
  }

  it("con más páginas pendientes, «Ver más publicaciones» sigue montado y el foco no se mueve (render sin desmontaje)", async () => {
    conPaginas("publicaciones", () =>
      respuestaJson(200, { publicaciones: [publicacion(2)], siguienteCursor: idPublicacion(2) }),
    )
    renderMuro("estudiante")
    const boton = await screen.findByRole("button", { name: "Ver más publicaciones" })
    boton.focus()
    fireEvent.click(boton)
    await screen.findByText("Publicación 2")
    await esperar(50)
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Ver más publicaciones" }),
    )
  })

  it("si la página siguiente del muro falla, el foco que estaba en «Ver más publicaciones» no cae en <body>", async () => {
    conPaginas("publicaciones", () => error500())
    renderMuro("estudiante")
    const boton = await screen.findByRole("button", { name: "Ver más publicaciones" })
    boton.focus()
    fireEvent.click(boton)
    await screen.findByRole("alert")
    await esperar(50)
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Publicaciones" }))
  })

  it("si la página siguiente de comentarios falla, el foco que estaba en «Ver más comentarios» no cae en <body>", async () => {
    conPaginas("comentarios", () => error500())
    renderMuro("estudiante")
    fireEvent.click(await screen.findByRole("button", { name: "Ver comentarios (2)" }))
    const boton = await screen.findByRole("button", { name: "Ver más comentarios" })
    boton.focus()
    fireEvent.click(boton)
    await screen.findByRole("alert")
    await esperar(50)
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Comentarios" }))
  })

  it("con la última página de comentarios vacía, el foco va al encabezado de los comentarios", async () => {
    conPaginas("comentarios", () => respuestaJson(200, { comentarios: [], siguienteCursor: null }))
    renderMuro("estudiante")
    fireEvent.click(await screen.findByRole("button", { name: "Ver comentarios (2)" }))
    const boton = await screen.findByRole("button", { name: "Ver más comentarios" })
    boton.focus()
    fireEvent.click(boton)
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Ver más comentarios" })).toBeNull(),
    )
    await esperar(50)
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Comentarios" }))
  })
})
