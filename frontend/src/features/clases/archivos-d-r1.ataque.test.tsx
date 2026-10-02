import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { AdjuntosDePublicacion } from "./components/adjuntos-de-publicacion"
import { FormularioPublicacion } from "./components/formulario-publicacion"
import { MuroView } from "./muro-view"
import type { Adjunto } from "./types"

// Ataque del Tester (CLASES-d, ronda 1; puntos 9 a 12 de la lista del manager y punto 5 del plan).
// El formulario con archivos (cambios en la lista con la publicación en vuelo, doble envío, fallos
// por paso, desmontaje, límites y el aviso de un rechazo del servidor al solicitar), la ficha y la
// vista previa (URL que no son http(s), onError) y el muro (respuesta sin adjuntos, vigencia de las
// vistas previas frente al staleTime). Sin selectores de clases de estilo: rol, etiqueta o texto.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/maestro") }))
vi.mock("@/services/navegacion", () => navegacion)

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const ORIGEN_ALMACEN = "https://almacen.ejemplo.mx"
const AUTOR = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
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
    adjuntos: [],
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

// Servidor doble del flujo de publicar: pedir la subida (API), subir al almacén y publicar (API).
// `retener` deja en vuelo la petición número n de solicitar; `responderSolicitud` cambia la
// respuesta de la n-ésima solicitud; `responderPublicar` la de publicar.
const stubFlujo = ({
  retenerSolicitud,
  responderSolicitud,
  responderPublicar,
}: {
  retenerSolicitud?: number
  responderSolicitud?: (n: number) => Response | null
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
    if (url.startsWith(ORIGEN_ALMACEN)) return new Response(null, { status: 200 })
    if (url.endsWith("/archivos")) {
      solicitudes += 1
      const n = solicitudes
      if (n === retenerSolicitud) await enVuelo.promesa
      const propia = responderSolicitud?.(n)
      if (propia) return propia
      const { nombre, tipo, tamano } = cuerpo as { nombre: string; tipo: string; tamano: number }
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
    return respuestaJson(404, { error: { codigo: "NO_ENCONTRADO", mensaje: "No existe" } })
  })
  vi.stubGlobal("fetch", fetchMock)
  return { llamadas, soltar: () => enVuelo.resolver(new Response(null)) }
}

const solicitudesDe = (llamadas: Llamada[]) =>
  llamadas.filter((l) => l.metodo === "POST" && l.url.endsWith("/archivos"))
const publicacionesDe = (llamadas: Llamada[]) =>
  llamadas.filter((l) => l.metodo === "POST" && l.url.endsWith("/publicaciones"))

const renderFormulario = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <FormularioPublicacion claseId={CLASE_ID} />
    </QueryClientProvider>,
  )
}

const prepararMaterial = (titulo = "Con adjuntos") => {
  fireEvent.click(screen.getByRole("button", { name: "Material" }))
  fireEvent.change(screen.getByLabelText("Título del material"), { target: { value: titulo } })
}

const botonPublicar = () => screen.getByRole("button", { name: "Publicar material" })

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

describe("ataque d-r1: la lista de archivos con la publicación en vuelo", () => {
  it("«Quitar» un archivo mientras se suben los anteriores: o no se deja quitar, o no se publica", async () => {
    const { llamadas, soltar } = stubFlujo({ retenerSolicitud: 1 })
    renderFormulario()
    prepararMaterial()
    elegirArchivos(
      archivoDe("a.pdf", "application/pdf"),
      archivoDe("privado.pdf", "application/pdf"),
    )

    fireEvent.click(botonPublicar())
    await waitFor(() => expect(solicitudesDe(llamadas)).toHaveLength(1))
    fireEvent.click(screen.getByRole("button", { name: "Quitar privado.pdf" }))
    const seQuitoDeLaLista = screen.queryByRole("button", { name: "Quitar privado.pdf" }) === null
    soltar()

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Publicado"))
    const nombresSolicitados = solicitudesDe(llamadas).map(
      (l) => (l.cuerpo as { nombre: string }).nombre,
    )
    const publicado = nombresSolicitados.includes("privado.pdf")
    expect(
      { seQuitoDeLaLista, publicado },
      `solicitudes: ${nombresSolicitados.join(", ")}; publicar: ${JSON.stringify(
        publicacionesDe(llamadas)[0]?.cuerpo,
      )}`,
    ).not.toEqual({ seQuitoDeLaLista: true, publicado: true })
  })

  it("«Adjuntar archivos» con la publicación en vuelo: el archivo nuevo o se publica o se queda en la lista; nunca desaparece en silencio", async () => {
    const { llamadas, soltar } = stubFlujo({ retenerSolicitud: 1 })
    renderFormulario()
    prepararMaterial()
    elegirArchivos(archivoDe("a.pdf", "application/pdf"))

    fireEvent.click(botonPublicar())
    await waitFor(() => expect(solicitudesDe(llamadas)).toHaveLength(1))
    elegirArchivos(archivoDe("tardio.pdf", "application/pdf"))
    const aceptadoEnLaLista = screen.queryByRole("button", { name: "Quitar tardio.pdf" }) !== null
    soltar()

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Publicado"))
    const publicado = solicitudesDe(llamadas).some(
      (l) => (l.cuerpo as { nombre: string }).nombre === "tardio.pdf",
    )
    const sigueEnLaLista = screen.queryByRole("button", { name: "Quitar tardio.pdf" }) !== null
    expect(
      { aceptadoEnLaLista, perdido: aceptadoEnLaLista && !publicado && !sigueEnLaLista },
      `publicar: ${JSON.stringify(publicacionesDe(llamadas)[0]?.cuerpo)}`,
    ).toEqual({ aceptadoEnLaLista, perdido: false })
  })
})

describe("ataque d-r1: doble envío, fallos por paso y desmontaje", () => {
  it("dos envíos seguidos del formulario (submit doble y clic en espera) solicitan cada archivo una vez y publican una vez", async () => {
    const { llamadas } = stubFlujo()
    renderFormulario()
    prepararMaterial()
    elegirArchivos(archivoDe("a.pdf", "application/pdf"), archivoDe("b.png", "image/png"))

    const formulario = botonPublicar().closest("form")
    if (!formulario) throw new Error("Precondición: el botón no está dentro de un formulario")
    fireEvent.submit(formulario)
    fireEvent.submit(formulario)
    fireEvent.click(botonPublicar())

    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    expect(solicitudesDe(llamadas)).toHaveLength(2)
    expect(publicacionesDe(llamadas)).toHaveLength(1)
    expect(publicacionesDe(llamadas)[0]?.cuerpo).toEqual({
      tipo: "material",
      titulo: "Con adjuntos",
      texto: "",
      archivoIds: [idDeArchivo(1), idDeArchivo(2)],
    })
  })

  it("si falla publicar después de subir: un solo aviso, conserva lo escrito y los archivos, y el botón queda libre", async () => {
    const { llamadas } = stubFlujo({
      responderPublicar: () =>
        respuestaJson(400, {
          error: {
            codigo: "ARCHIVO_NO_SUBIDO",
            mensaje: "Uno de los archivos no terminó de subir. Inténtalo de nuevo.",
          },
        }),
    })
    renderFormulario()
    prepararMaterial("Se queda")
    elegirArchivos(archivoDe("a.pdf", "application/pdf"))
    fireEvent.click(botonPublicar())

    await waitFor(() => expect(aviso.error).toHaveBeenCalled())
    await waitFor(() => expect(botonPublicar()).not.toHaveAttribute("aria-busy"))
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(aviso.error).toHaveBeenCalledWith(
      "Uno de los archivos no terminó de subir. Inténtalo de nuevo.",
    )
    expect(aviso.success).not.toHaveBeenCalled()
    expect(publicacionesDe(llamadas)).toHaveLength(1)
    expect(screen.getByLabelText("Título del material")).toHaveValue("Se queda")
    expect(screen.getByRole("button", { name: "Quitar a.pdf" })).toBeInTheDocument()
  })

  it("desmontar el formulario con la subida en vuelo: termina, publica una vez, avisa una vez y no lanza", async () => {
    const { llamadas, soltar } = stubFlujo({ retenerSolicitud: 1 })
    const vista = renderFormulario()
    prepararMaterial()
    elegirArchivos(archivoDe("a.pdf", "application/pdf"))
    fireEvent.click(botonPublicar())
    await waitFor(() => expect(solicitudesDe(llamadas)).toHaveLength(1))

    vista.unmount()
    soltar()

    await waitFor(() => expect(publicacionesDe(llamadas)).toHaveLength(1))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

describe("ataque d-r1: límites en el cliente y el aviso de un rechazo del servidor (N-D1)", () => {
  it("3 y 3 en dos elecciones: quedan 5 y el sexto se rechaza; tipo vacío con extensión desconocida, extensión cruzada y sin extensión se rechazan", () => {
    stubFlujo()
    renderFormulario()
    elegirArchivos(...[1, 2, 3].map((n) => archivoDe(`a${String(n)}.pdf`, "application/pdf")))
    elegirArchivos(...[4, 5, 6].map((n) => archivoDe(`a${String(n)}.pdf`, "application/pdf")))
    expect(screen.getAllByRole("button", { name: /^Quitar a\d\.pdf$/ })).toHaveLength(5)
    expect(screen.getByText("Puedes adjuntar hasta 5 archivos.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Quitar a6.pdf" })).not.toBeInTheDocument()

    cleanup()
    renderFormulario()
    const rechazos: [File, string][] = [
      [archivoDe("virus.exe", ""), "«virus.exe» no es de un tipo permitido."],
      [archivoDe("foto.png", "application/pdf"), "«foto.png» no es de un tipo permitido."],
      [archivoDe("LEEME", "text/plain"), "«LEEME» no es de un tipo permitido."],
      [archivoDe("dibujo.svg", "image/svg+xml"), "«dibujo.svg» no es de un tipo permitido."],
      [
        archivoDe("grande.pdf", "application/pdf", 25 * 1024 * 1024 + 1),
        "«grande.pdf» pesa más de 25 MB.",
      ],
    ]
    for (const [archivo, mensaje] of rechazos) {
      elegirArchivos(archivo)
      expect(screen.getByText(mensaje)).toBeInTheDocument()
    }
    expect(screen.queryByRole("list", { name: "Archivos elegidos" })).not.toBeInTheDocument()
  })

  it.each([
    ["vacío", "vacio.pdf", 0, "El archivo está vacío o pesa más de 25 MB."],
    ["con un carácter de control", "tarea\u0001.pdf", 100, "El nombre del archivo no es válido."],
  ])(
    "si el servidor rechaza al solicitar un archivo %s, el aviso nombra ese archivo (DESIGN.md §7.19)",
    async (_caso, nombre, tamano, mensajeDelServidor) => {
      const { llamadas } = stubFlujo({
        responderSolicitud: () =>
          respuestaJson(400, {
            error: { codigo: "ARCHIVO_INVALIDO", mensaje: mensajeDelServidor },
          }),
      })
      renderFormulario()
      prepararMaterial()
      elegirArchivos(archivoDe(nombre, "application/pdf", tamano))
      // El cliente lo deja pasar (no lo rechaza al elegirlo): lo rechaza el servidor.
      expect(screen.getByRole("button", { name: `Quitar ${nombre}` })).toBeInTheDocument()
      fireEvent.click(botonPublicar())

      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
      expect(publicacionesDe(llamadas)).toHaveLength(0)
      expect(String(aviso.error.mock.calls[0]?.[0])).toContain(`«${nombre}»`)
    },
  )
})

const imagen = (url: string, expiraEn = "2026-10-02T15:05:00.000Z"): Adjunto => ({
  id: idDeArchivo(1),
  nombre: "Mapa.png",
  tipo: "image/png",
  tamano: 2048,
  vistaPrevia: { url, expiraEn },
})

const renderConClient = (hijo: ReactNode) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{hijo}</QueryClientProvider>)
}

describe("ataque d-r1: vista previa y «Descargar»", () => {
  it("onError: la imagen desaparece y queda la ficha con «Descargar»; el alt nombra el archivo", () => {
    stubFlujo()
    renderConClient(
      <AdjuntosDePublicacion claseId={CLASE_ID} adjuntos={[imagen(`${ORIGEN_ALMACEN}/vista/1`)]} />,
    )
    const foto = screen.getByRole("img", { name: "Imagen adjunta: Mapa.png" })
    fireEvent.error(foto)
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Descargar Mapa.png" })).toBeInTheDocument()
  })

  it("un nombre con HTML se pinta como texto en la ficha, en el alt y en «Quitar»; no crea elementos", () => {
    stubFlujo()
    const nombre = '<img src=x onerror="alert(1)"><b>x</b>.png'
    renderConClient(
      <AdjuntosDePublicacion
        claseId={CLASE_ID}
        adjuntos={[{ ...imagen(`${ORIGEN_ALMACEN}/vista/1`), nombre }]}
      />,
    )
    expect(screen.getAllByRole("img")).toHaveLength(1)
    expect(screen.getByRole("img", { name: `Imagen adjunta: ${nombre}` })).toBeInTheDocument()
    expect(screen.getAllByText(nombre).length).toBeGreaterThan(0)
    expect(document.querySelector("b")).toBeNull()
    expect(document.querySelector("[onerror]")).toBeNull()

    cleanup()
    renderFormulario()
    elegirArchivos(archivoDe('<script>alert(1)</script>".pdf', "application/pdf"))
    expect(
      screen.getByRole("button", { name: 'Quitar <script>alert(1)</script>".pdf' }),
    ).toBeInTheDocument()
    expect(document.querySelector("script")).toBeNull()
  })

  it.each(["javascript:alert(document.domain)", "data:text/html,<script>alert(1)</script>"])(
    "«Descargar» con una URL %s del servidor: no navega a ella",
    async (url) => {
      const asignar = vi.fn()
      vi.stubGlobal("location", { ...window.location, assign: asignar })
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>(() =>
          Promise.resolve(respuestaJson(200, { url, expiraEn: "2026-10-02T15:05:00.000Z" })),
        ),
      )
      renderConClient(
        <AdjuntosDePublicacion
          claseId={CLASE_ID}
          adjuntos={[
            {
              ...imagen(`${ORIGEN_ALMACEN}/vista/1`),
              vistaPrevia: null,
              nombre: "a.pdf",
              tipo: "application/pdf",
            },
          ]}
        />,
      )
      fireEvent.click(screen.getByRole("button", { name: "Descargar a.pdf" }))
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Descargar a.pdf" })).not.toHaveAttribute(
          "aria-busy",
        ),
      )
      // C-28: se espera el aviso del catch (la URL no pasó el esquema), no un tiempo fijo.
      await waitFor(() => expect(aviso.error).toHaveBeenCalled())
      expect(asignar.mock.calls.map(([destino]) => String(destino))).not.toContain(url)
    },
  )
})

// El muro: forma de la respuesta y vigencia de las vistas previas.
interface PaginaFalsa {
  publicaciones: unknown[]
  siguienteCursor: string | null
}

const publicacionConImagen = (n: number, url: string, expiraEn: string) => ({
  id: idPublicacion(n),
  tipo: "material",
  titulo: `Material ${String(n)}`,
  texto: "",
  autor: AUTOR,
  creadoEn: "2026-10-02T15:00:00.000Z",
  comentarios: 0,
  adjuntos: [
    {
      id: idDeArchivo(n),
      nombre: `Imagen ${String(n)}.png`,
      tipo: "image/png",
      tamano: 2048,
      vistaPrevia: { url, expiraEn },
    },
  ],
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

describe("ataque d-r1: el muro", () => {
  it("una publicación sin adjuntos en la respuesta es un error, nunca una lista sin adjuntos", async () => {
    const sinAdjuntos: Record<string, unknown> = {
      ...publicacionConImagen(1, `${ORIGEN_ALMACEN}/vista/1`, "2026-10-02T15:05:00.000Z"),
    }
    delete sinAdjuntos.adjuntos
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          respuestaJson(200, { publicaciones: [sinAdjuntos], siguienteCursor: null }),
        ),
      ),
    )
    conMuro(new QueryClient({ defaultOptions: { queries: { retry: false } } }))
    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(screen.queryByText("Material 1")).not.toBeInTheDocument()
  })

  it("las vistas previas que pinta el muro siguen vigentes al volver a él después de «Ver más publicaciones» (staleTime frente a los 5 minutos)", async () => {
    const t0 = Date.UTC(2026, 9, 2, 15, 0, 0)
    let ahora = t0
    vi.spyOn(Date, "now").mockImplementation(() => ahora)
    const vigencias = new Map<string, number>()
    let firmas = 0
    const firmar = (n: number) => {
      firmas += 1
      const url = `${ORIGEN_ALMACEN}/vista/${String(n)}?firma=${String(firmas)}`
      vigencias.set(url, ahora + 5 * 60_000)
      return publicacionConImagen(n, url, new Date(ahora + 5 * 60_000).toISOString())
    }
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada) => {
        const url = String(entrada)
        const pagina: PaginaFalsa = url.includes("cursor=")
          ? { publicaciones: [firmar(2)], siguienteCursor: null }
          : { publicaciones: [firmar(1)], siguienteCursor: idPublicacion(1) }
        return Promise.resolve(respuestaJson(200, pagina))
      }),
    )
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const primera = conMuro(queryClient)
    await screen.findByRole("img", { name: "Imagen adjunta: Imagen 1.png" })

    ahora = t0 + 3 * 60_000
    fireEvent.click(screen.getByRole("button", { name: "Ver más publicaciones" }))
    await screen.findByRole("img", { name: "Imagen adjunta: Imagen 2.png" })
    primera.unmount()

    // La persona vuelve al muro a los 5 min 30 s: la primera página se firmó en t0.
    ahora = t0 + 5 * 60_000 + 30_000
    conMuro(queryClient)
    await screen.findByRole("img", { name: "Imagen adjunta: Imagen 1.png" })
    // C-28: se espera la vista previa nueva de las dos páginas (firmas 3 y 4), no un tiempo fijo.
    await waitFor(() =>
      expect(screen.getByRole("img", { name: "Imagen adjunta: Imagen 1.png" })).toHaveAttribute(
        "src",
        `${ORIGEN_ALMACEN}/vista/1?firma=3`,
      ),
    )
    await waitFor(() =>
      expect(screen.getByRole("img", { name: "Imagen adjunta: Imagen 2.png" })).toHaveAttribute(
        "src",
        `${ORIGEN_ALMACEN}/vista/2?firma=4`,
      ),
    )

    const vencidas = screen
      .getAllByRole("img")
      .map((img) => img.getAttribute("src") ?? "")
      .filter((src) => (vigencias.get(src) ?? 0) <= ahora)
    expect(vencidas, "vistas previas pintadas con su firma ya vencida").toEqual([])
  })
})
