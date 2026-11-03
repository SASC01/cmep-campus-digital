import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { AdjuntosDePublicacion } from "./components/adjuntos-de-publicacion"
import { tiempoFrescoDelMuro } from "./lib"
import { MuroView } from "./muro-view"
import type { Adjunto, PaginaDelMuro } from "./types"

// Ataque del Tester (CLASES-d, ronda 2; puntos 1 a 5 y 8 de la lista del manager). Las
// correcciones de T-38 a T-41 por la razón correcta y en sus bordes: la lista fija se sostiene por
// la referencia y no por el estado de React (dos eventos en el mismo lote), queda editable después
// del finally, y el foco no se pierde; las tres URL del almacén con protocolos y formas raras; la
// vigencia del muro antes y después del margen, con páginas de vencimientos distintos; y el aviso
// del rechazo con varios archivos, un 503 y textos inesperados. Sin selectores de clases de estilo.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/maestro") }))
vi.mock("@/services/navegacion", () => navegacion)

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const ORIGEN_ALMACEN = "https://almacen.ejemplo.mx"
// CLASES-02b ronda 0 (C-10, §D-2B1 y §D-2B2): el autor del muro suma administracion (obligatorio;
// un maestro firma con su nombre y false) y cada publicación suma puedeBorrar: true en la que el
// maestro acaba de crear (§D-2B3) y false en el muro que ve el estudiante. Ninguna aserción cambia;
// en «otro protocolo», el muro sigue fallando solo por la vistaPrevia.
const AUTOR = {
  id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
  nombre: "Luis Pérez",
  administracion: false,
}
const TAB = String.fromCharCode(9)
const idDeArchivo = (n: number) => `9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d${String(10 + n)}`
const idPublicacion = (n: number) => `5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d${String(10 + n)}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const publicacionCreada = () => ({
  publicacion: {
    id: idPublicacion(1),
    tipo: "material",
    titulo: "Con adjuntos",
    texto: "",
    autor: AUTOR,
    creadoEn: "2026-10-02T15:30:00.000Z",
    comentarios: 0,
    // TAREAS-01b ronda 0 (C-5, §D-R0): publicacionSchema gana la clave obligatoria tarea, null en anuncios y materiales.
    tarea: null,
    adjuntos: [],
    puedeBorrar: true,
  },
})

const diferido = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

const archivoDe = (nombre: string, tipo: string, tamano = 100) => {
  const archivo = new File(["x"], nombre, { type: tipo })
  Object.defineProperty(archivo, "size", { value: tamano })
  return archivo
}

const elegirArchivos = (...archivos: File[]) =>
  fireEvent.change(screen.getByLabelText("Adjuntar archivos"), { target: { files: archivos } })

interface Llamada {
  metodo: string
  url: string
  cuerpo: unknown
}

// CLASES-03d ronda 0 (C-23, §D-R0; §D-8.5): el material se publica desde «Nuevo recurso» en
// «Recursos», que se monta con el router real. El marco pide la sesión, la barra del maestro, la
// clase, su código y las listas (vacías) de temas y recursos.
const respuestaDelMarco = (url: string): Response | null => {
  const { pathname } = new URL(url, "http://local")
  const base = `/api/clases/${CLASE_ID}`
  if (pathname === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "restaurado" })
  if (pathname === "/api/me") {
    return respuestaJson(200, {
      id: AUTOR.id,
      nombre: AUTOR.nombre,
      email: "luis@ejemplo.mx",
      rol: "maestro",
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  if (pathname === "/api/clases/impartidas") {
    return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
  }
  if (pathname === base) {
    const maestro = { id: AUTOR.id, nombre: AUTOR.nombre }
    return respuestaJson(200, {
      clase: { id: CLASE_ID, nombre: "Álgebra I", descripcion: null, maestro, maestros: [maestro] },
    })
  }
  if (pathname === `${base}/codigo`) return respuestaJson(200, { codigo: "ABCD234" })
  if (pathname === `${base}/temas`) return respuestaJson(200, { temas: [], sinTema: 0 })
  if (pathname === `${base}/recursos`) {
    return respuestaJson(200, { recursos: [], siguienteCursor: null })
  }
  return null
}

const stubFlujo = ({
  retenerSolicitud,
  responderSolicitud,
  responderPublicar,
}: {
  retenerSolicitud?: number
  responderSolicitud?: (n: number, nombre: string) => Response | null
  responderPublicar?: () => Response
} = {}) => {
  const llamadas: Llamada[] = []
  const enVuelo = diferido()
  let solicitudes = 0
  const fetchMock = vi.fn<typeof fetch>(async (entrada, init) => {
    const url = String(entrada)
    const metodo = init?.method ?? "GET"
    const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : init?.body
    llamadas.push({ metodo, url, cuerpo })
    if (!url.startsWith("/api/")) return new Response(null, { status: 200 })
    if (url.endsWith("/archivos")) {
      solicitudes += 1
      const n = solicitudes
      if (n === retenerSolicitud) await enVuelo.promesa
      const { nombre, tipo, tamano } = cuerpo as { nombre: string; tipo: string; tamano: number }
      const propia = responderSolicitud?.(n, nombre)
      if (propia) return propia
      return respuestaJson(201, {
        archivo: { id: idDeArchivo(n), nombre, tipo, tamano },
        subida: {
          url: `${ORIGEN_ALMACEN}/subida/${String(n)}`,
          metodo: "PUT",
          cabeceras: { "Content-Type": tipo },
          expiraEn: "2026-10-02T15:05:00.000Z",
        },
      })
    }
    if (url.endsWith("/publicaciones")) {
      return responderPublicar ? responderPublicar() : respuestaJson(201, publicacionCreada())
    }
    // CLASES-03d ronda 0 (C-23): lo que pide el marco de «Recursos» con el router real.
    const marco = respuestaDelMarco(url)
    if (marco) return marco
    return respuestaJson(404, { error: { codigo: "NO_ENCONTRADO", mensaje: "No existe" } })
  })
  vi.stubGlobal("fetch", fetchMock)
  return { llamadas, soltar: () => enVuelo.resolver(new Response(null)) }
}

const solicitudesDe = (llamadas: Llamada[]) =>
  llamadas.filter((l) => l.metodo === "POST" && l.url.endsWith("/archivos"))
const publicacionesDe = (llamadas: Llamada[]) =>
  llamadas.filter((l) => l.metodo === "POST" && l.url.endsWith("/publicaciones"))
const subidasDe = (llamadas: Llamada[]) => llamadas.filter((l) => l.metodo === "PUT")
const nombresSolicitados = (llamadas: Llamada[]) =>
  solicitudesDe(llamadas).map((l) => (l.cuerpo as { nombre: string }).nombre)

// CLASES-03d ronda 0 (C-23): sale `renderFormulario` (montaba FormularioPublicacion para el
// material); todos sus casos eran del material y pasan a `renderNuevoRecurso`.
// CLASES-03d ronda 0 (C-23, §D-R0; §D-8.5): el material se publica desde «Nuevo recurso» en
// «Recursos» («Título del recurso», «Publicar recurso», sin grupo de tipo), con el router real y sin
// importar el formulario, que todavía no existe (así la prueba compila y queda roja hasta que exista).
// Los casos del material siguen valiendo para el recurso (la lista fija por la referencia, la nota
// mientras se publica, el finally, los rechazos al solicitar y las URL del almacén) y siguen
// protegiendo lo mismo.
const renderNuevoRecurso = async () => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, {
    initialEntries: [`/maestro/clases/${CLASE_ID}/recursos`],
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

const prepararRecurso = async (titulo = "Con adjuntos") => {
  const campo = await screen.findByLabelText("Título del recurso", {}, { timeout: 3000 })
  fireEvent.change(campo, { target: { value: titulo } })
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

const botonPublicar = () => screen.getByRole("button", { name: "Publicar recurso" })
const formulario = () => {
  const form = botonPublicar().closest("form")
  if (!form) throw new Error("Precondición: el botón no está dentro de un formulario")
  return form
}

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
  navegacion.irA.mockClear()
})

describe("ataque d-r2: T-38 por la referencia, no por el estado", () => {
  it("«Quitar» y elegir en el mismo lote que el envío (antes de que React vuelva a pintar): la lista no cambia y se publica la que se veía", async () => {
    const { llamadas } = stubFlujo()
    await renderNuevoRecurso()
    await prepararRecurso()
    elegirArchivos(archivoDe("a.pdf", "application/pdf"), archivoDe("b.pdf", "application/pdf"))
    const quitarB = screen.getByRole("button", { name: "Quitar b.pdf" })
    const selector = screen.getByLabelText("Adjuntar archivos")

    // Un solo act: el estado (enProceso) todavía no se ve en los manejadores; solo la referencia.
    act(() => {
      fireEvent.submit(formulario())
      fireEvent.click(quitarB)
      fireEvent.change(selector, { target: { files: [archivoDe("c.pdf", "application/pdf")] } })
      fireEvent.submit(formulario())
    })

    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    expect(nombresSolicitados(llamadas)).toEqual(["a.pdf", "b.pdf"])
    expect(publicacionesDe(llamadas)).toHaveLength(1)
    // CLASES-03d ronda 0 (C-23): sin temas en la clase, el tema no viaja o viaja en null («Sin
    // tema»; CL3-D08 lo deja opcional); el resto del cuerpo, exacto.
    const { temaId, ...cuerpo } = publicacionesDe(llamadas)[0]?.cuerpo as Record<string, unknown>
    expect(temaId ?? null).toBeNull()
    expect(cuerpo).toEqual({
      tipo: "material",
      titulo: "Con adjuntos",
      texto: "",
      archivoIds: [idDeArchivo(1), idDeArchivo(2)],
    })
  })

  it("con la publicación en vuelo, «Quitar» no saca el archivo, el foco se queda en ese botón y la nota se anuncia; al terminar, la nota desaparece", async () => {
    const { llamadas, soltar } = stubFlujo({ retenerSolicitud: 1 })
    await renderNuevoRecurso()
    await prepararRecurso()
    elegirArchivos(archivoDe("a.pdf", "application/pdf"), archivoDe("b.pdf", "application/pdf"))
    fireEvent.click(botonPublicar())
    await waitFor(() => expect(solicitudesDe(llamadas)).toHaveLength(1))

    const quitarB = screen.getByRole("button", { name: "Quitar b.pdf" })
    quitarB.focus()
    fireEvent.keyDown(quitarB, { key: "Enter" })
    fireEvent.click(quitarB)
    expect(screen.getByRole("button", { name: "Quitar b.pdf" })).toHaveFocus()
    // CLASES-03d ronda 0 (C-23): con el router real, la página tiene otros estados (la barra de
    // clases mientras carga); la nota se busca dentro del formulario.
    expect(within(formulario()).getByRole("status")).toHaveTextContent(
      "Mientras se publica no puedes cambiar los archivos.",
    )
    soltar()

    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    expect(nombresSolicitados(llamadas)).toEqual(["a.pdf", "b.pdf"])
    expect(within(formulario()).queryByRole("status")).not.toBeInTheDocument()
  })

  it.each([
    ["falla el PUT del segundo archivo", { fallaSubida: true, fallaPublicar: false }],
    ["falla publicar después de subir", { fallaSubida: false, fallaPublicar: true }],
  ])(
    "después del finally (%s) la lista vuelve a ser editable: se puede quitar y elegir",
    async (_caso, { fallaSubida, fallaPublicar }) => {
      let subidas = 0
      const { llamadas } = stubFlujo({
        ...(fallaPublicar
          ? {
              responderPublicar: () =>
                respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "Falla" } }),
            }
          : {}),
      })
      const base = vi.mocked(globalThis.fetch)
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>((entrada, init) => {
          if ((init?.method ?? "GET") === "PUT") {
            subidas += 1
            if (fallaSubida && subidas === 2)
              return Promise.resolve(new Response(null, { status: 500 }))
          }
          return base(entrada, init)
        }),
      )
      await renderNuevoRecurso()
      await prepararRecurso()
      elegirArchivos(archivoDe("a.pdf", "application/pdf"), archivoDe("b.pdf", "application/pdf"))
      fireEvent.click(botonPublicar())
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
      await waitFor(() => expect(botonPublicar()).not.toHaveAttribute("aria-busy"))

      fireEvent.click(screen.getByRole("button", { name: "Quitar a.pdf" }))
      expect(screen.queryByRole("button", { name: "Quitar a.pdf" })).not.toBeInTheDocument()
      elegirArchivos(archivoDe("c.pdf", "application/pdf"))
      expect(screen.getByRole("button", { name: "Quitar c.pdf" })).toBeInTheDocument()
      // CLASES-03d ronda 0 (C-23): la nota se busca dentro del formulario (ver arriba).
      expect(within(formulario()).queryByRole("status")).not.toBeInTheDocument()
      expect(publicacionesDe(llamadas).length).toBe(fallaPublicar ? 1 : 0)
    },
  )

  it("después de publicar con éxito la lista queda vacía y se puede elegir de nuevo", async () => {
    stubFlujo()
    await renderNuevoRecurso()
    await prepararRecurso()
    elegirArchivos(archivoDe("a.pdf", "application/pdf"))
    fireEvent.click(botonPublicar())
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(botonPublicar()).not.toHaveAttribute("aria-busy"))
    elegirArchivos(archivoDe("nuevo.pdf", "application/pdf"))
    expect(screen.getByRole("button", { name: "Quitar nuevo.pdf" })).toBeInTheDocument()
  })
})

describe("ataque d-r2: T-41 con varios archivos, un 503 y textos inesperados", () => {
  it("[aceptado, rechazado, rechazado]: se detiene en el primer rechazo, un solo aviso con ese nombre y su motivo, sin subir el resto ni publicar", async () => {
    const { llamadas } = stubFlujo({
      responderSolicitud: (_n, nombre) =>
        nombre === "bien.pdf"
          ? null
          : respuestaJson(400, {
              error: { codigo: "ARCHIVO_INVALIDO", mensaje: `Motivo de ${nombre}.` },
            }),
    })
    await renderNuevoRecurso()
    await prepararRecurso()
    elegirArchivos(
      archivoDe("bien.pdf", "application/pdf"),
      archivoDe("malo1.pdf", "application/pdf"),
      archivoDe("malo2.pdf", "application/pdf"),
    )
    fireEvent.click(botonPublicar())

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(aviso.error).toHaveBeenCalledWith("No pudimos subir «malo1.pdf»: Motivo de malo1.pdf.")
    expect(nombresSolicitados(llamadas)).toEqual(["bien.pdf", "malo1.pdf"])
    expect(subidasDe(llamadas)).toHaveLength(1)
    expect(publicacionesDe(llamadas)).toHaveLength(0)
    expect(screen.getAllByRole("button", { name: /^Quitar / })).toHaveLength(3)
  })

  it("un 503 al solicitar nombra el archivo y dice que el almacén no está disponible", async () => {
    stubFlujo({
      responderSolicitud: () =>
        respuestaJson(503, {
          error: { codigo: "ALMACEN_NO_DISPONIBLE", mensaje: "Texto del servidor" },
        }),
    })
    await renderNuevoRecurso()
    await prepararRecurso()
    elegirArchivos(archivoDe("a.pdf", "application/pdf"))
    fireEvent.click(botonPublicar())
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(aviso.error).toHaveBeenCalledWith(
      "No pudimos subir «a.pdf»: Los archivos no están disponibles en este momento. Inténtalo más tarde.",
    )
  })

  it("un nombre con HTML y «», y un motivo con HTML, llegan al aviso como texto; un motivo vacío no deja el aviso a medias", async () => {
    const nombre = "<b>«tarea»</b>.pdf"
    stubFlujo({
      responderSolicitud: (n) =>
        n === 1
          ? respuestaJson(400, {
              error: { codigo: "ARCHIVO_INVALIDO", mensaje: "<img src=x onerror=alert(1)>" },
            })
          : respuestaJson(400, { error: { codigo: "ARCHIVO_INVALIDO", mensaje: "" } }),
    })
    await renderNuevoRecurso()
    await prepararRecurso()
    elegirArchivos(archivoDe(nombre, "application/pdf"))
    fireEvent.click(botonPublicar())
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(aviso.error).toHaveBeenCalledWith(
      `No pudimos subir «${nombre}»: <img src=x onerror=alert(1)>`,
    )
    expect(document.querySelector("b")).toBeNull()
    await waitFor(() => expect(botonPublicar()).not.toHaveAttribute("aria-busy"))

    fireEvent.click(botonPublicar())
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
    const segundo = String(aviso.error.mock.calls[1]?.[0])
    expect(segundo.startsWith(`No pudimos subir «${nombre}»: `)).toBe(true)
    expect(segundo.length).toBeGreaterThan(`No pudimos subir «${nombre}»: `.length)
  })
})

const adjunto = (extra: Partial<Adjunto> = {}): Adjunto => ({
  id: idDeArchivo(1),
  nombre: "a.pdf",
  tipo: "application/pdf",
  tamano: 2048,
  vistaPrevia: null,
  ...extra,
})

const renderConClient = (hijo: ReactNode) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{hijo}</QueryClientProvider>)
}

describe("ataque d-r2: T-39 en las tres URL del almacén", () => {
  it.each([
    `${TAB}javascript:alert(1)`,
    "   javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "vbscript:msgbox(1)",
    "blob:https://campus.ejemplo.mx/1234",
    "file:///C:/Windows/win.ini",
    "//almacen.ejemplo.mx/descarga",
    "data:application/pdf;base64,AAAA",
  ])("«Descargar» con %j: avisa y no navega", async (url) => {
    const asignar = vi.fn()
    vi.stubGlobal("location", { ...window.location, assign: asignar })
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(respuestaJson(200, { url, expiraEn: "2026-10-02T15:05:00.000Z" })),
      ),
    )
    renderConClient(<AdjuntosDePublicacion claseId={CLASE_ID} adjuntos={[adjunto()]} />)
    fireEvent.click(screen.getByRole("button", { name: "Descargar a.pdf" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(asignar).not.toHaveBeenCalled()
  })

  it("«Descargar» con HTTPS:// en mayúsculas sí navega (es https)", async () => {
    const asignar = vi.fn()
    vi.stubGlobal("location", { ...window.location, assign: asignar })
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          respuestaJson(200, {
            url: "HTTPS://almacen.ejemplo.mx/descarga",
            expiraEn: "2026-10-02T15:05:00.000Z",
          }),
        ),
      ),
    )
    renderConClient(<AdjuntosDePublicacion claseId={CLASE_ID} adjuntos={[adjunto()]} />)
    fireEvent.click(screen.getByRole("button", { name: "Descargar a.pdf" }))
    await waitFor(() => expect(asignar).toHaveBeenCalledTimes(1))
    expect(String(asignar.mock.calls[0]?.[0]).toLowerCase()).toMatch(/^https:\/\//)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("una URL de subida javascript: no se usa: no hay PUT, avisa con el nombre y no publica", async () => {
    const { llamadas } = stubFlujo({
      responderSolicitud: (n, nombre) =>
        respuestaJson(201, {
          archivo: { id: idDeArchivo(n), nombre, tipo: "application/pdf", tamano: 100 },
          subida: {
            url: "javascript:alert(1)",
            metodo: "PUT",
            cabeceras: { "Content-Type": "application/pdf" },
            expiraEn: "2026-10-02T15:05:00.000Z",
          },
        }),
    })
    await renderNuevoRecurso()
    await prepararRecurso()
    elegirArchivos(archivoDe("a.pdf", "application/pdf"))
    fireEvent.click(botonPublicar())
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(String(aviso.error.mock.calls[0]?.[0])).toContain("«a.pdf»")
    expect(subidasDe(llamadas)).toHaveLength(0)
    expect(llamadas.some((l) => l.url.startsWith("javascript:"))).toBe(false)
    expect(publicacionesDe(llamadas)).toHaveLength(0)
  })

  it("una vistaPrevia con otro protocolo hace fallar el muro completo (error), no oculta la publicación", async () => {
    const pagina = {
      publicaciones: [
        {
          id: idPublicacion(1),
          tipo: "material",
          titulo: "Material raro",
          texto: "",
          autor: AUTOR,
          creadoEn: "2026-10-02T15:00:00.000Z",
          comentarios: 0,
          tarea: null,
          adjuntos: [
            {
              ...adjunto({ nombre: "f.png", tipo: "image/png" }),
              vistaPrevia: { url: "blob:https://x/1", expiraEn: "2026-10-02T15:05:00.000Z" },
            },
          ],
          puedeBorrar: false,
        },
      ],
      siguienteCursor: null,
    }
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() => Promise.resolve(respuestaJson(200, pagina))),
    )
    conMuro(new QueryClient({ defaultOptions: { queries: { retry: false } } }))
    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(screen.queryByText("Material raro")).not.toBeInTheDocument()
  })
})

const pagina = (
  vencimientos: (string | null)[],
  siguienteCursor: string | null = null,
): PaginaDelMuro => ({
  publicaciones: [
    {
      id: idPublicacion(1),
      tipo: "material",
      titulo: "M",
      texto: "",
      autor: AUTOR,
      creadoEn: "2026-10-02T15:00:00.000Z",
      comentarios: 0,
      tarea: null,
      adjuntos: vencimientos.map((expiraEn, i) =>
        adjunto({
          id: idDeArchivo(i + 1),
          tipo: "image/png",
          vistaPrevia:
            expiraEn === null ? null : { url: `${ORIGEN_ALMACEN}/v/${String(i)}`, expiraEn },
        }),
      ),
      puedeBorrar: false,
    },
  ],
  siguienteCursor,
})

const conMuro = (queryClient: QueryClient) =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/estudiante/clases/${CLASE_ID}`]}>
        <Routes>
          <Route path="/estudiante/clases/:claseId" element={<MuroView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

describe("ataque d-r2: T-40, tiempoFrescoDelMuro y el muro antes y después del margen", () => {
  const T0 = Date.UTC(2026, 9, 2, 15, 0, 0)
  const iso = (ms: number) => new Date(ms).toISOString()

  it("el vencimiento más temprano de todas las páginas manda, aunque esté en la segunda; sin vistas previas, 4 minutos; un vencimiento pasado da 0; una fecha inválida se ignora", () => {
    const primera = pagina([iso(T0 + 300_000), null])
    const segunda = pagina([iso(T0 + 200_000)])
    expect(tiempoFrescoDelMuro([primera, segunda], T0)).toBe(200_000 - 60_000)
    expect(tiempoFrescoDelMuro([primera], T0)).toBe(300_000 - 60_000)
    expect(tiempoFrescoDelMuro([pagina([null, null])], T0)).toBe(240_000)
    expect(tiempoFrescoDelMuro([], T0)).toBe(240_000)
    expect(tiempoFrescoDelMuro([pagina([iso(T0 - 1000)])], T0)).toBe(0)
    expect(tiempoFrescoDelMuro([pagina([iso(T0 + 30_000)])], T0)).toBe(0)
    expect(tiempoFrescoDelMuro([pagina(["no es fecha", iso(T0 + 300_000)])], T0)).toBe(240_000)
  })

  it("con 50,000 vistas previas cargadas no lanza", () => {
    const vencimientos = Array.from({ length: 5 }, (_, i) => iso(T0 + 300_000 + i))
    const paginas = Array.from({ length: 10_000 }, () => pagina(vencimientos))
    expect(tiempoFrescoDelMuro(paginas, T0)).toBe(240_000)
  })

  it.each([
    ["antes del margen (3 min 59 s)", 239_000, 1],
    ["después del margen (4 min 1 s)", 241_000, 2],
  ])(
    "volver al muro %s: se vuelve a pedir solo después del margen, y la imagen que falló se intenta con su URL nueva",
    async (_caso, despues, pedidasEsperadas) => {
      let ahora = T0
      vi.spyOn(Date, "now").mockImplementation(() => ahora)
      let pedidas = 0
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>(() => {
          pedidas += 1
          const p = pagina([iso(ahora + 300_000)])
          const adjuntoUnico = p.publicaciones[0]?.adjuntos[0]
          if (adjuntoUnico?.vistaPrevia) {
            adjuntoUnico.vistaPrevia.url = `${ORIGEN_ALMACEN}/v/${String(pedidas)}`
          }
          return Promise.resolve(respuestaJson(200, p))
        }),
      )
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const primera = conMuro(queryClient)
      const foto = await screen.findByRole("img", { name: "Imagen adjunta: a.pdf" })
      fireEvent.error(foto)
      expect(screen.queryByRole("img")).not.toBeInTheDocument()
      primera.unmount()

      ahora = T0 + despues
      conMuro(queryClient)
      // C-28: se espera la petición que corresponde y la vista previa con su URL, no un tiempo fijo.
      await waitFor(() => expect(pedidas).toBe(pedidasEsperadas))
      await waitFor(() =>
        expect(screen.getByRole("img", { name: "Imagen adjunta: a.pdf" })).toHaveAttribute(
          "src",
          `${ORIGEN_ALMACEN}/v/${String(pedidasEsperadas)}`,
        ),
      )
      expect(pedidas).toBe(pedidasEsperadas)
      const imagenes = screen.queryAllByRole("img").map((img) => img.getAttribute("src"))
      expect(imagenes).toEqual([`${ORIGEN_ALMACEN}/v/${String(pedidasEsperadas)}`])
    },
  )
})
