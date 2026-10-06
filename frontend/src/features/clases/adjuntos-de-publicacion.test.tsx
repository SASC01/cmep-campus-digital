import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { AdjuntosDePublicacion } from "./components/adjuntos-de-publicacion"
import { PublicacionDelMuro } from "./components/publicacion-del-muro"
import type { Adjunto, Publicacion } from "./types"

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const ID_IMAGEN = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const ID_PDF = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02"
const URL_DE_DESCARGA = "https://almacen.ejemplo.mx/campus-privado/materiales/c/a?X-Amz-Expires=300"

const imagen: Adjunto = {
  id: ID_IMAGEN,
  nombre: "Mapa de México.png",
  tipo: "image/png",
  tamano: 2_516_582,
  vistaPrevia: {
    url: "https://almacen.ejemplo.mx/vista/mapa",
    expiraEn: "2026-10-02T15:05:00.000Z",
  },
}

const pdf: Adjunto = {
  id: ID_PDF,
  nombre: "Guía del tema 3.pdf",
  tipo: "application/pdf",
  tamano: 839_680,
  vistaPrevia: null,
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const renderConClient = (hijo: React.ReactNode) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={queryClient}>{hijo}</QueryClientProvider>)
}

const asignar = vi.fn()

beforeEach(() => {
  establecerToken("token-de-prueba")
  vi.stubGlobal("location", { ...window.location, assign: asignar })
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  asignar.mockReset()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("AdjuntosDePublicacion", () => {
  it('PR-D13a: la imagen lleva alt="Imagen adjunta: <nombre>"', () => {
    renderConClient(<AdjuntosDePublicacion claseId={CLASE_ID} adjuntos={[imagen, pdf]} />)

    const foto = screen.getByRole("img", { name: "Imagen adjunta: Mapa de México.png" })
    expect(foto).toHaveAttribute("src", imagen.vistaPrevia?.url)
    expect(foto).not.toHaveAttribute("loading")
    // Solo la imagen con vista previa lleva <img>: el PDF solo tiene su ficha.
    expect(screen.getAllByRole("img")).toHaveLength(1)
    expect(screen.getByText("820 KB")).toBeInTheDocument()
    expect(screen.getByText("2.4 MB")).toBeInTheDocument()
  })

  it("PR-D13b: con onError, la imagen pasa a la ficha", () => {
    renderConClient(<AdjuntosDePublicacion claseId={CLASE_ID} adjuntos={[imagen]} />)

    fireEvent.error(screen.getByRole("img", { name: "Imagen adjunta: Mapa de México.png" }))

    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Descargar Mapa de México.png" })).toBeInTheDocument()
  })

  it("PR-D13c: Descargar pide la URL (enEspera) y llama a window.location.assign", async () => {
    let resolver: (respuesta: Response) => void = () => undefined
    const fetchMock = vi.fn<typeof fetch>(
      () =>
        new Promise<Response>((resolve) => {
          resolver = resolve
        }),
    )
    vi.stubGlobal("fetch", fetchMock)
    renderConClient(<AdjuntosDePublicacion claseId={CLASE_ID} adjuntos={[pdf]} />)

    fireEvent.click(screen.getByRole("button", { name: "Descargar Guía del tema 3.pdf" }))

    const boton = await screen.findByRole("button", { name: "Descargar Guía del tema 3.pdf" })
    await waitFor(() => expect(boton).toHaveAttribute("aria-busy", "true"))
    expect(asignar).not.toHaveBeenCalled()
    const [ruta, init] = fetchMock.mock.calls[0] ?? []
    expect(String(ruta)).toBe(`/api/clases/${CLASE_ID}/archivos/${ID_PDF}/descarga`)
    expect(init?.method).toBe("POST")

    resolver(respuestaJson(200, { url: URL_DE_DESCARGA, expiraEn: "2026-10-02T15:05:00.000Z" }))

    await waitFor(() => expect(asignar).toHaveBeenCalledWith(URL_DE_DESCARGA))
    expect(aviso.error).not.toHaveBeenCalled()
    await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy"))
  })

  it("si no se puede pedir la URL, avisa con un mensaje en español y no navega", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          respuestaJson(503, {
            error: { codigo: "ALMACEN_NO_DISPONIBLE", mensaje: "mensaje del servidor" },
          }),
        ),
      ),
    )
    renderConClient(<AdjuntosDePublicacion claseId={CLASE_ID} adjuntos={[pdf]} />)

    fireEvent.click(screen.getByRole("button", { name: "Descargar Guía del tema 3.pdf" }))

    await waitFor(() =>
      expect(aviso.error).toHaveBeenCalledWith(
        "Los archivos no están disponibles en este momento. Inténtalo más tarde.",
      ),
    )
    expect(asignar).not.toHaveBeenCalled()
  })

  it("sin adjuntos no pinta nada", () => {
    renderConClient(<AdjuntosDePublicacion claseId={CLASE_ID} adjuntos={[]} />)

    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })
})

describe("URL del almacén y vista previa que falla (Enmienda 12)", () => {
  it("PR-D17a: una respuesta de descarga con javascript:alert(1) o con data:text/html no llama a window.location.assign y da un solo toast.error", async () => {
    for (const url of ["javascript:alert(1)", "data:text/html,<script>alert(1)</script>"]) {
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>(() =>
          Promise.resolve(respuestaJson(200, { url, expiraEn: "2026-10-02T15:05:00.000Z" })),
        ),
      )
      renderConClient(<AdjuntosDePublicacion claseId={CLASE_ID} adjuntos={[pdf]} />)

      fireEvent.click(screen.getByRole("button", { name: "Descargar Guía del tema 3.pdf" }))

      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
      expect(asignar, url).not.toHaveBeenCalled()
      aviso.error.mockClear()
      cleanup()
    }
  })

  it("PR-D18b: una imagen que falló con una URL vuelve a mostrarse cuando el adjunto llega con otra URL", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const conUrl = (url: string): Adjunto => ({
      ...imagen,
      vistaPrevia: { url, expiraEn: "2026-10-02T15:05:00.000Z" },
    })
    const envolver = (adjuntos: Adjunto[]) => (
      <QueryClientProvider client={queryClient}>
        <AdjuntosDePublicacion claseId={CLASE_ID} adjuntos={adjuntos} />
      </QueryClientProvider>
    )
    const { rerender } = render(envolver([conUrl("https://almacen.ejemplo.mx/vieja")]))

    fireEvent.error(screen.getByRole("img", { name: "Imagen adjunta: Mapa de México.png" }))
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    // La misma URL, aunque el componente se vuelva a pintar, sigue sin intentarse.
    rerender(envolver([conUrl("https://almacen.ejemplo.mx/vieja")]))
    expect(screen.queryByRole("img")).not.toBeInTheDocument()

    rerender(envolver([conUrl("https://almacen.ejemplo.mx/nueva")]))
    expect(screen.getByRole("img", { name: "Imagen adjunta: Mapa de México.png" })).toHaveAttribute(
      "src",
      "https://almacen.ejemplo.mx/nueva",
    )
  })
})

describe("PublicacionDelMuro con adjuntos", () => {
  const publicacion = (adjuntos: Adjunto[]): Publicacion => ({
    id: "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11",
    tipo: "material",
    titulo: "Guía del tema 3",
    texto: "",
    autor: {
      id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
      nombre: "Luis Pérez",
      administracion: false,
    },
    creadoEn: "2026-09-29T15:30:00.000Z",
    comentarios: 0,
    adjuntos,
    // CLASES-02b (C-10): el esquema ahora exige `administracion` y `puedeBorrar`; solo se agregan los campos.
    puedeBorrar: true,
  })

  it("muestra los adjuntos y, al pedir borrar, la frase que también los nombra", () => {
    renderConClient(
      <PublicacionDelMuro
        claseId={CLASE_ID}
        publicacion={publicacion([imagen, pdf])}
        perspectiva="maestro"
      />,
    )

    expect(screen.getByRole("list", { name: "Archivos adjuntos" })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Descargar Guía del tema 3.pdf" }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Borrar publicación" }))
    expect(screen.getByText("Se borrará con sus comentarios y adjuntos.")).toBeInTheDocument()
  })

  it("sin adjuntos conserva la frase de siempre", () => {
    renderConClient(
      <PublicacionDelMuro claseId={CLASE_ID} publicacion={publicacion([])} perspectiva="maestro" />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Borrar publicación" }))
    expect(screen.getByText("Se borrará con sus comentarios.")).toBeInTheDocument()
  })
})
