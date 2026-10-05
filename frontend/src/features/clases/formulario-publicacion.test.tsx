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
    autor: {
      id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
      nombre: "Luis Pérez",
      administracion: false,
    },
    creadoEn: "2026-09-29T15:30:00.000Z",
    comentarios: 0,
    // C-21 (Enmienda 10): la respuesta siempre lleva adjuntos.
    adjuntos: [],
    // CLASES-02b (C-10): el esquema ahora exige `administracion` y `puedeBorrar`; solo se agregan los campos.
    puedeBorrar: true,
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
    expect(JSON.parse(String(init?.body))).toEqual({
      tipo: "anuncio",
      texto: "Mañana hay examen",
      archivoIds: [],
    })
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
      archivoIds: [],
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
      archivoIds: [],
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
      archivoIds: [],
    })

    // 5,001 sin saltos: el formulario lo rechaza con el mensaje del servidor y no llama a la API.
    fireEvent.click(screen.getByRole("button", { name: "Anuncio" }))
    escribirYPublicarAnuncio("a".repeat(5001))
    expect(await screen.findByText("No puede tener más de 5000 caracteres")).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

// CLASES-d (§D-D5): adjuntos. El doble del servidor reconoce las tres peticiones del flujo: pedir la
// subida (API), subir al almacén (otro origen) y publicar (API).
describe("adjuntos del formulario (CLASES-d)", () => {
  const ORIGEN_ALMACEN = "https://almacen.ejemplo.mx"
  const MB = 1024 * 1024

  const archivoDe = (nombre: string, tipo: string, tamano = 100) => {
    const archivo = new File(["x"], nombre, { type: tipo })
    Object.defineProperty(archivo, "size", { value: tamano })
    return archivo
  }

  const elegirArchivos = (...archivos: File[]) =>
    fireEvent.change(screen.getByLabelText("Adjuntar archivos"), { target: { files: archivos } })

  const idDeArchivo = (n: number) => `9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d${String(10 + n)}`

  interface Llamada {
    metodo: string
    url: string
    cuerpo: unknown
    ocupado: string | null
  }

  const stubFlujo = ({ fallaLaSubidaNumero }: { fallaLaSubidaNumero?: number } = {}) => {
    const llamadas: Llamada[] = []
    let solicitudes = 0
    let subidas = 0
    const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      const cuerpo =
        typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : init?.body
      const boton = screen.queryByRole("button", { name: /^Publicar (anuncio|material)$/ })
      llamadas.push({ metodo, url, cuerpo, ocupado: boton?.getAttribute("aria-busy") ?? null })

      if (url.startsWith(ORIGEN_ALMACEN)) {
        subidas += 1
        const falla = subidas === fallaLaSubidaNumero
        return Promise.resolve(new Response(null, { status: falla ? 500 : 200 }))
      }
      if (url.endsWith("/archivos")) {
        solicitudes += 1
        const { nombre, tipo, tamano } = cuerpo as { nombre: string; tipo: string; tamano: number }
        return Promise.resolve(
          respuestaJson(201, {
            archivo: { id: idDeArchivo(solicitudes), nombre, tipo, tamano },
            subida: {
              url: `${ORIGEN_ALMACEN}/subida/${String(solicitudes)}`,
              metodo: "PUT",
              cabeceras: { "Content-Type": tipo },
              expiraEn: "2026-10-02T15:05:00.000Z",
            },
          }),
        )
      }
      return Promise.resolve(respuestaJson(201, publicacionCreada()))
    })
    vi.stubGlobal("fetch", fetchMock)
    return { llamadas }
  }

  const resumen = (llamadas: Llamada[]) =>
    llamadas.map(({ metodo, url }) => `${metodo} ${url.replace(ORIGEN_ALMACEN, "almacen")}`)

  it("PR-D11a: rechaza en cliente un tipo no permitido, con ErrorDeCampo", () => {
    stubApi()
    renderFormulario()

    elegirArchivos(archivoDe("virus.exe", "application/x-msdownload"))

    expect(screen.getByText("«virus.exe» no es de un tipo permitido.")).toBeInTheDocument()
    expect(screen.queryByRole("list", { name: "Archivos elegidos" })).not.toBeInTheDocument()
  })

  it("PR-D11b: rechaza un archivo de más de 25 MB", () => {
    stubApi()
    renderFormulario()

    elegirArchivos(archivoDe("grande.pdf", "application/pdf", 25 * MB + 1))

    expect(screen.getByText("«grande.pdf» pesa más de 25 MB.")).toBeInTheDocument()
    expect(screen.queryByRole("list", { name: "Archivos elegidos" })).not.toBeInTheDocument()

    elegirArchivos(archivoDe("justo.pdf", "application/pdf", 25 * MB))
    expect(screen.getByRole("button", { name: "Quitar justo.pdf" })).toBeInTheDocument()
    expect(screen.getByText("25 MB")).toBeInTheDocument()
  })

  it("PR-D11c: rechaza un sexto archivo", () => {
    stubApi()
    renderFormulario()

    elegirArchivos(
      ...[1, 2, 3, 4, 5].map((n) => archivoDe(`doc${String(n)}.pdf`, "application/pdf")),
    )
    expect(screen.getAllByRole("listitem")).toHaveLength(5)
    elegirArchivos(archivoDe("sexto.pdf", "application/pdf"))

    expect(screen.getByText("Puedes adjuntar hasta 5 archivos.")).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(5)
    expect(screen.queryByRole("button", { name: "Quitar sexto.pdf" })).not.toBeInTheDocument()
  })

  it("PR-D11d: infiere el tipo por la extensión cuando File.type viene vacío", async () => {
    const { llamadas } = stubFlujo()
    renderFormulario()
    elegirMaterial()
    fireEvent.change(screen.getByLabelText("Título del material"), { target: { value: "Informe" } })

    elegirArchivos(archivoDe("informe.docx", ""))
    expect(screen.getByRole("button", { name: "Quitar informe.docx" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Publicar material" }))

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Publicado"))
    expect(llamadas[0]?.cuerpo).toEqual({
      nombre: "informe.docx",
      tipo: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      tamano: 100,
    })
  })

  it("PR-D12a: el orden es solicitar, subir y publicar, con los ids en el orden de subida", async () => {
    const { llamadas } = stubFlujo()
    renderFormulario()
    elegirMaterial()
    fireEvent.change(screen.getByLabelText("Título del material"), {
      target: { value: "Con dos archivos" },
    })
    elegirArchivos(archivoDe("a.pdf", "application/pdf"), archivoDe("b.png", "image/png"))

    fireEvent.click(screen.getByRole("button", { name: "Publicar material" }))

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Publicado"))
    expect(resumen(llamadas)).toEqual([
      `POST /api/clases/${CLASE_ID}/archivos`,
      "PUT almacen/subida/1",
      `POST /api/clases/${CLASE_ID}/archivos`,
      "PUT almacen/subida/2",
      `POST /api/clases/${CLASE_ID}/publicaciones`,
    ])
    expect(llamadas[4]?.cuerpo).toEqual({
      tipo: "material",
      titulo: "Con dos archivos",
      texto: "",
      archivoIds: [idDeArchivo(1), idDeArchivo(2)],
    })
    // Con el éxito, el formulario se limpia, también la lista de archivos.
    expect(screen.queryByRole("list", { name: "Archivos elegidos" })).not.toBeInTheDocument()
  })

  it("PR-D12b: si falla la subida del segundo archivo, aparece el toast y no se llama a publicar", async () => {
    const { llamadas } = stubFlujo({ fallaLaSubidaNumero: 2 })
    renderFormulario()
    elegirMaterial()
    fireEvent.change(screen.getByLabelText("Título del material"), {
      target: { value: "Se queda escrito" },
    })
    elegirArchivos(archivoDe("a.pdf", "application/pdf"), archivoDe("b.pdf", "application/pdf"))

    fireEvent.click(screen.getByRole("button", { name: "Publicar material" }))

    await waitFor(() =>
      expect(aviso.error).toHaveBeenCalledWith("No pudimos subir «b.pdf». Inténtalo de nuevo."),
    )
    expect(llamadas.some(({ url }) => url.endsWith("/publicaciones"))).toBe(false)
    expect(aviso.success).not.toHaveBeenCalled()
    // El formulario conserva lo escrito y los archivos elegidos, y el botón vuelve a estar libre.
    expect(screen.getByLabelText("Título del material")).toHaveValue("Se queda escrito")
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Publicar material" })).not.toHaveAttribute(
        "aria-busy",
      ),
    )
  })

  it("PR-D12c: el botón principal sigue en enEspera durante todo el proceso", async () => {
    const { llamadas } = stubFlujo()
    renderFormulario()
    elegirMaterial()
    fireEvent.change(screen.getByLabelText("Título del material"), { target: { value: "Espera" } })
    elegirArchivos(archivoDe("a.pdf", "application/pdf"), archivoDe("b.pdf", "application/pdf"))

    fireEvent.click(screen.getByRole("button", { name: "Publicar material" }))

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Publicado"))
    expect(llamadas).toHaveLength(5)
    // En cada una de las cinco peticiones (solicitar, subir, solicitar, subir y publicar), el botón
    // ya estaba en espera.
    expect(llamadas.map(({ ocupado }) => ocupado)).toEqual(["true", "true", "true", "true", "true"])
    expect(screen.getByRole("button", { name: "Publicar material" })).not.toHaveAttribute(
      "aria-busy",
    )
  })

  it("Quitar saca el archivo de la lista y manda el foco a la fila vecina o, sin filas, a Adjuntar archivos", () => {
    stubApi()
    renderFormulario()
    elegirArchivos(archivoDe("a.pdf", "application/pdf"), archivoDe("b.pdf", "application/pdf"))

    fireEvent.click(screen.getByRole("button", { name: "Quitar a.pdf" }))
    expect(screen.queryByRole("button", { name: "Quitar a.pdf" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Quitar b.pdf" })).toHaveFocus()

    fireEvent.click(screen.getByRole("button", { name: "Quitar b.pdf" }))
    expect(screen.queryByRole("list", { name: "Archivos elegidos" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Adjuntar archivos" })).toHaveFocus()
  })

  it("sin archivos elegidos, el cuerpo de publicar lleva archivoIds vacío y no hay peticiones al almacén (C-22)", async () => {
    const { llamadas } = stubFlujo()
    renderFormulario()

    escribirYPublicarAnuncio("Sin archivos")

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Publicado"))
    expect(resumen(llamadas)).toEqual([`POST /api/clases/${CLASE_ID}/publicaciones`])
    expect(llamadas[0]?.cuerpo).toEqual({ tipo: "anuncio", texto: "Sin archivos", archivoIds: [] })
  })

  it("PR-D16: con la solicitud del primer archivo en vuelo, Quitar no saca el archivo, elegir otro no lo agrega y la nota está visible; al terminar se publica exactamente la lista que se veía y los controles vuelven a actuar", async () => {
    let liberarPrimera: () => void = () => undefined
    let solicitudes = 0
    const cuerpos: unknown[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada, init) => {
        const url = String(entrada)
        const cuerpo =
          typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined
        cuerpos.push(cuerpo)
        if (url.startsWith(ORIGEN_ALMACEN))
          return Promise.resolve(new Response(null, { status: 200 }))
        if (!url.endsWith("/archivos"))
          return Promise.resolve(respuestaJson(201, publicacionCreada()))
        solicitudes += 1
        const { nombre, tipo, tamano } = cuerpo as { nombre: string; tipo: string; tamano: number }
        const respuesta = respuestaJson(201, {
          archivo: { id: idDeArchivo(solicitudes), nombre, tipo, tamano },
          subida: {
            url: `${ORIGEN_ALMACEN}/subida/${String(solicitudes)}`,
            metodo: "PUT",
            cabeceras: { "Content-Type": tipo },
            expiraEn: "2026-10-02T15:05:00.000Z",
          },
        })
        if (solicitudes > 1) return Promise.resolve(respuesta)
        return new Promise<Response>((resolver) => {
          liberarPrimera = () => resolver(respuesta)
        })
      }),
    )
    renderFormulario()
    elegirMaterial()
    fireEvent.change(screen.getByLabelText("Título del material"), { target: { value: "Fija" } })
    elegirArchivos(archivoDe("a.pdf", "application/pdf"), archivoDe("b.pdf", "application/pdf"))
    fireEvent.click(screen.getByRole("button", { name: "Publicar material" }))
    await waitFor(() => expect(solicitudes).toBe(1))

    // En vuelo: la lista no cambia y la nota lo dice.
    expect(screen.getByRole("status")).toHaveTextContent(
      "Mientras se publica no puedes cambiar los archivos.",
    )
    fireEvent.click(screen.getByRole("button", { name: "Quitar a.pdf" }))
    elegirArchivos(archivoDe("c.pdf", "application/pdf"))
    expect(screen.getByRole("button", { name: "Quitar a.pdf" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Quitar b.pdf" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Quitar c.pdf" })).not.toBeInTheDocument()

    liberarPrimera()
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Publicado"))
    const publicacion = cuerpos.at(-1) as { archivoIds: string[] }
    expect(publicacion.archivoIds).toEqual([idDeArchivo(1), idDeArchivo(2)])
    expect(solicitudes).toBe(2)
    expect(screen.queryByRole("list", { name: "Archivos elegidos" })).not.toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()

    // Terminada la publicación, elegir y quitar vuelven a actuar.
    elegirArchivos(archivoDe("d.pdf", "application/pdf"))
    fireEvent.click(screen.getByRole("button", { name: "Quitar d.pdf" }))
    expect(screen.queryByRole("button", { name: "Quitar d.pdf" })).not.toBeInTheDocument()
  })

  it("PR-D19: un 400 ARCHIVO_INVALIDO al solicitar da un solo aviso con el nombre y el mensaje del servidor; un 503 da el nombre y el texto de ALMACEN_*; ninguno publica", async () => {
    const casos = [
      {
        estado: 400,
        error: { codigo: "ARCHIVO_INVALIDO", mensaje: "El nombre del archivo no es válido." },
        aviso: "No pudimos subir «a.pdf»: El nombre del archivo no es válido.",
      },
      {
        estado: 503,
        error: { codigo: "ALMACEN_NO_DISPONIBLE", mensaje: "mensaje del servidor" },
        aviso:
          "No pudimos subir «a.pdf»: Los archivos no están disponibles en este momento. Inténtalo más tarde.",
      },
    ]
    for (const caso of casos) {
      const fetchMock = vi.fn<typeof fetch>(() =>
        Promise.resolve(respuestaJson(caso.estado, { error: caso.error })),
      )
      vi.stubGlobal("fetch", fetchMock)
      renderFormulario()
      fireEvent.change(screen.getByLabelText("Anuncio"), { target: { value: "Con un archivo" } })
      elegirArchivos(archivoDe("a.pdf", "application/pdf"))

      fireEvent.click(screen.getByRole("button", { name: "Publicar anuncio" }))

      await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(caso.aviso))
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(screen.getByLabelText("Anuncio")).toHaveValue("Con un archivo")
      expect(screen.getByRole("button", { name: "Quitar a.pdf" })).toBeInTheDocument()
      aviso.error.mockClear()
      cleanup()
    }
  })
})
