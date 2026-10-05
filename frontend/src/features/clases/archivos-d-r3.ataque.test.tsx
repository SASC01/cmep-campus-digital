import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/services/apiClient"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { FormularioPublicacion } from "./components/formulario-publicacion"
import { avisoDeFalloAlSubir } from "./lib"
import { MuroView } from "./muro-view"

// Ataque del Tester (CLASES-d, ronda 3; puntos 3 y 6 de la lista del manager). avisoDeFalloAlSubir
// desde lib.ts en sus tres caminos; el foco al quitar y publicar con el teclado; y el muro con una
// página sin vistas previas junto a otra con ellas, al volver antes y después del margen. Sin
// selectores de clases de estilo.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/maestro") }))
vi.mock("@/services/navegacion", () => navegacion)

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const ORIGEN_ALMACEN = "https://almacen.ejemplo.mx"
// CLASES-02b ronda 0 (C-10, §D-2B1 y §D-2B2): el autor del muro suma administracion (obligatorio;
// un maestro firma con su nombre y false) y cada publicación suma puedeBorrar: true en la que el
// maestro acaba de crear (§D-2B3) y false en el muro que ve el estudiante. Ninguna aserción cambia.
const AUTOR = {
  id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
  nombre: "Luis Pérez",
  administracion: false,
}
const idDeArchivo = (n: number) => `9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d${String(10 + n)}`
const idPublicacion = (n: number) => `5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d${String(10 + n)}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

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

describe("ataque d-r3: avisoDeFalloAlSubir desde lib.ts", () => {
  it("ARCHIVO_INVALIDO lleva el mensaje del servidor; otro código, el texto propio; un error que no es ApiError, el texto de la subida", () => {
    expect(
      avisoDeFalloAlSubir(
        new ApiError("ARCHIVO_INVALIDO", "El archivo está vacío o pesa más de 25 MB.", 400),
        "vacio.pdf",
      ),
    ).toBe("No pudimos subir «vacio.pdf»: El archivo está vacío o pesa más de 25 MB.")
    expect(
      avisoDeFalloAlSubir(
        new ApiError("ALMACEN_NO_DISPONIBLE", "texto crudo del servidor", 503),
        "a.pdf",
      ),
    ).toBe(
      "No pudimos subir «a.pdf»: Los archivos no están disponibles en este momento. Inténtalo más tarde.",
    )
    expect(avisoDeFalloAlSubir(new ApiError("OTRO_CODIGO", "x", 400), "a.pdf")).toBe(
      "No pudimos subir «a.pdf»: Algo salió mal. Inténtalo de nuevo.",
    )
    expect(avisoDeFalloAlSubir(new Error("El almacén rechazó el archivo."), "b.pdf")).toBe(
      "No pudimos subir «b.pdf». Inténtalo de nuevo.",
    )
    expect(avisoDeFalloAlSubir("no es un error", "c.pdf")).toBe(
      "No pudimos subir «c.pdf». Inténtalo de nuevo.",
    )
  })
})

describe("ataque d-r3: foco al quitar y publicar con el teclado", () => {
  it("tras «Quitar» el foco va al vecino; tras publicar, el foco sigue en el botón principal y nunca en <body>", async () => {
    let solicitudes = 0
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada, init) => {
        const url = String(entrada)
        if (!url.startsWith("/api/")) return Promise.resolve(new Response(null, { status: 200 }))
        if (url.endsWith("/archivos")) {
          solicitudes += 1
          const cuerpo = JSON.parse(String(init?.body)) as { nombre: string; tipo: string }
          return Promise.resolve(
            respuestaJson(201, {
              archivo: {
                id: idDeArchivo(solicitudes),
                nombre: cuerpo.nombre,
                tipo: cuerpo.tipo,
                tamano: 100,
              },
              subida: {
                url: `${ORIGEN_ALMACEN}/subida/${String(solicitudes)}`,
                metodo: "PUT",
                cabeceras: { "Content-Type": cuerpo.tipo },
                expiraEn: "2026-10-02T15:05:00.000Z",
              },
            }),
          )
        }
        return Promise.resolve(
          respuestaJson(201, {
            publicacion: {
              id: idPublicacion(1),
              tipo: "anuncio",
              titulo: null,
              texto: "Hola",
              autor: AUTOR,
              creadoEn: "2026-10-02T15:30:00.000Z",
              comentarios: 0,
              adjuntos: [],
              puedeBorrar: true,
            },
          }),
        )
      }),
    )
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <FormularioPublicacion claseId={CLASE_ID} />
      </QueryClientProvider>,
    )
    fireEvent.change(screen.getByRole("textbox", { name: "Anuncio" }), {
      target: { value: "Hola" },
    })
    const archivos = ["a.pdf", "b.pdf"].map((nombre) => {
      const archivo = new File(["x"], nombre, { type: "application/pdf" })
      Object.defineProperty(archivo, "size", { value: 100 })
      return archivo
    })
    fireEvent.change(screen.getByLabelText("Adjuntar archivos"), { target: { files: archivos } })

    const quitarA = screen.getByRole("button", { name: "Quitar a.pdf" })
    quitarA.focus()
    fireEvent.click(quitarA)
    expect(screen.getByRole("button", { name: "Quitar b.pdf" })).toHaveFocus()

    const publicar = screen.getByRole("button", { name: "Publicar anuncio" })
    publicar.focus()
    fireEvent.click(publicar)
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(publicar).not.toHaveAttribute("aria-busy"))
    expect(solicitudes).toBe(1)
    expect(document.activeElement).not.toBe(document.body)
    expect(screen.getByRole("button", { name: "Publicar anuncio" })).toHaveFocus()
  })
})

describe("ataque d-r3: muro con una página sin vistas previas y otra con ellas", () => {
  const T0 = Date.UTC(2026, 9, 2, 15, 0, 0)

  const publicacion = (n: number, vistaPreviaHasta: number | null) => ({
    id: idPublicacion(n),
    tipo: "material",
    titulo: `Material ${String(n)}`,
    texto: "",
    autor: AUTOR,
    creadoEn: "2026-10-02T15:00:00.000Z",
    comentarios: 0,
    adjuntos:
      vistaPreviaHasta === null
        ? []
        : [
            {
              id: idDeArchivo(n),
              nombre: `Imagen ${String(n)}.png`,
              tipo: "image/png",
              tamano: 2048,
              vistaPrevia: {
                url: `${ORIGEN_ALMACEN}/v/${String(n)}?t=${String(vistaPreviaHasta)}`,
                expiraEn: new Date(vistaPreviaHasta).toISOString(),
              },
            },
          ],
    puedeBorrar: false,
  })

  it.each([
    ["antes del margen (6 min 59 s)", 6 * 60_000 + 59_000, 0],
    ["después del margen (7 min 1 s)", 7 * 60_000 + 1000, 2],
  ])(
    "primera página sin vistas previas (t0) y segunda con una que vence en t0 + 8 min (pedida en t0 + 3 min): volver %s",
    async (_caso, despues, pedidasDeMas) => {
      let ahora = T0
      vi.spyOn(Date, "now").mockImplementation(() => ahora)
      let pedidas = 0
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>((entrada) => {
          pedidas += 1
          const url = String(entrada)
          return Promise.resolve(
            respuestaJson(
              200,
              url.includes("cursor=")
                ? { publicaciones: [publicacion(2, ahora + 300_000)], siguienteCursor: null }
                : { publicaciones: [publicacion(1, null)], siguienteCursor: idPublicacion(1) },
            ),
          )
        }),
      )
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const muro = () =>
        render(
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/estudiante/clases/${CLASE_ID}`]}>
              <Routes>
                <Route path="/estudiante/clases/:claseId" element={<MuroView />} />
              </Routes>
            </MemoryRouter>
          </QueryClientProvider>,
        )
      const primera = muro()
      await screen.findByText("Material 1")
      ahora = T0 + 3 * 60_000
      fireEvent.click(screen.getByRole("button", { name: "Ver más publicaciones" }))
      await screen.findByRole("img", { name: "Imagen adjunta: Imagen 2.png" })
      expect(pedidas).toBe(2)
      primera.unmount()

      ahora = T0 + despues
      muro()
      await screen.findByText("Material 1")
      // C-28: se esperan las peticiones que corresponden y la vista previa con su vencimiento, no un
      // tiempo fijo.
      await waitFor(() => expect(pedidas).toBe(2 + pedidasDeMas))
      const venceEsperado = pedidasDeMas === 0 ? T0 + 3 * 60_000 + 300_000 : T0 + despues + 300_000
      await waitFor(() =>
        expect(
          screen.getByRole("img", { name: "Imagen adjunta: Imagen 2.png" }).getAttribute("src"),
        ).toContain(`t=${String(venceEsperado)}`),
      )
      expect(pedidas).toBe(2 + pedidasDeMas)
      const src = screen
        .getByRole("img", { name: "Imagen adjunta: Imagen 2.png" })
        .getAttribute("src")
      const vence = Number(new URL(src ?? "").searchParams.get("t"))
      expect(vence - 60_000).toBeGreaterThan(ahora)
    },
  )
})
