import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AlumnosView } from "./alumnos-view"
import { ClaseLayout } from "./clase-layout"
import { FormularioUnirseClase } from "./components/formulario-unirse-clase"
import { MuroView } from "./muro-view"
import { PersonasView } from "./personas-view"

// Tester, CLASES-02d, ronda 1. Los pendientes heredados de 02c que 02d cierra: O-07 (503
// SERVICIO_OCUPADO con el mensaje del servidor, en sus hermanos), O-10 (el error de «Sí, quitar» del
// roster da un solo aviso), M-12 y O-06 (indicador y perspectiva con la ruta en mayúsculas) y O-14
// (el foco de una publicación de A al cambiar a B en caché). Por rol, nombre y texto.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const CLASE_A = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const CLASE_B = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02"
const LUIS = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const ALUMNA = "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11"
const OCUPADO = "El servicio está ocupado en este momento. Inténtalo de nuevo en unos segundos."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const ocupado = () =>
  respuestaJson(503, { error: { codigo: "SERVICIO_OCUPADO", mensaje: OCUPADO } })

const cliente = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

const conRutas = (ruta: string, rutas: ReactNode) =>
  render(
    <QueryClientProvider client={cliente()}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>{rutas}</Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const nombreDeClase = (id: string) => (id === CLASE_A ? "Clase A" : "Clase B")

const publicacionDe = (id: string) => ({
  id:
    id === CLASE_A
      ? "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d1a"
      : "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d1b",
  tipo: "anuncio",
  titulo: null,
  texto: `Publicación de ${nombreDeClase(id)}`,
  autor: { ...LUIS, administracion: false },
  creadoEn: "2026-10-01T15:30:00.000Z",
  comentarios: 2,
  adjuntos: [],
  puedeBorrar: false,
})

// La clase, su código, su muro (con una publicación) y sus personas; lo demás, 500.
const responderClase = (ruta: string): Response => {
  const m = /^\/api\/clases\/([0-9a-fA-F-]{36})(\/[^?]*)?/.exec(ruta)
  const id = m?.[1]?.toLowerCase()
  if (id !== CLASE_A && id !== CLASE_B) {
    return respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } })
  }
  const resto = m?.[2] ?? ""
  if (resto === "") {
    return respuestaJson(200, {
      clase: { id, nombre: nombreDeClase(id), descripcion: null, maestro: LUIS, maestros: [LUIS] },
    })
  }
  if (resto === "/codigo") return respuestaJson(200, { codigo: "ABCDEFG" })
  if (resto === "/publicaciones") {
    return respuestaJson(200, { publicaciones: [publicacionDe(id)], siguienteCursor: null })
  }
  if (resto === "/personas") {
    const maestro = { ...LUIS, email: "luis@x.mx" }
    return respuestaJson(200, {
      maestro,
      maestros: [maestro],
      alumnos: [],
      totalAlumnos: 0,
      siguienteCursor: null,
    })
  }
  return respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } })
}

afterEach(() => {
  vi.unstubAllGlobals()
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque CLASES-02d r1: O-07, 503 SERVICIO_OCUPADO con el mensaje del servidor", () => {
  it("al unirse: un solo aviso, exactamente el mensaje del servidor, sin marcar el campo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() => Promise.resolve(ocupado())),
    )
    conRutas("/estudiante", <Route path="/estudiante" element={<FormularioUnirseClase />} />)
    fireEvent.change(screen.getByLabelText("Código de la clase"), {
      target: { value: "ABCDEFG" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Unirme a la clase" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(aviso.error).toHaveBeenCalledWith(OCUPADO)
    expect(screen.getByLabelText("Código de la clase")).not.toHaveAttribute("aria-invalid", "true")
  })

  it("al publicar: un solo aviso con el mensaje del servidor y el texto se conserva", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada, init) =>
        Promise.resolve(init?.method === "POST" ? ocupado() : responderClase(String(entrada))),
      ),
    )
    conRutas(
      `/maestro/clases/${CLASE_A}`,
      <Route path="/maestro/clases/:claseId" element={<MuroView />} />,
    )
    await screen.findByText("Publicación de Clase A")
    fireEvent.change(screen.getByLabelText("Anuncio"), { target: { value: "Aviso" } })
    fireEvent.click(screen.getByRole("button", { name: "Publicar anuncio" }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(aviso.error).toHaveBeenCalledWith(OCUPADO)
    expect(screen.getByLabelText("Anuncio")).toHaveValue("Aviso")
  })

  it.each([
    [
      "el muro",
      `/estudiante/clases/${CLASE_A}`,
      "/estudiante/clases/:claseId",
      <MuroView key="m" />,
    ],
    [
      "«Personas»",
      `/estudiante/clases/${CLASE_A}/personas`,
      "/estudiante/clases/:claseId/personas",
      <PersonasView key="p" />,
    ],
  ] as const)(
    "%s que no carga muestra el mensaje del servidor",
    async (_n, ruta, patron, vista) => {
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>(() => Promise.resolve(ocupado())),
      )
      conRutas(ruta, <Route path={patron} element={vista} />)
      expect(await screen.findByText(OCUPADO)).toBeInTheDocument()
    },
  )
})

describe("ataque CLASES-02d r1: O-10, el error de «Sí, quitar» del roster", () => {
  it("un DELETE que falla da un solo aviso de error, ninguno de éxito, y la fila sigue con su botón libre", async () => {
    const alumna = {
      id: ALUMNA,
      nombre: "Ana López",
      email: "ana@x.mx",
      estadoPago: "al_corriente",
      accesoRestringido: false,
      origen: "manual",
      inscritoEn: "2026-09-29T15:30:00.000Z",
    }
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada, init) => {
        const ruta = String(entrada)
        if (init?.method === "DELETE") {
          return Promise.resolve(
            respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } }),
          )
        }
        if (ruta.includes("/candidatos")) {
          return Promise.resolve(respuestaJson(200, { candidatos: [], hayMas: false }))
        }
        return Promise.resolve(
          respuestaJson(200, { alumnos: [alumna], total: 1, siguienteCursor: null }),
        )
      }),
    )
    conRutas(
      `/maestro/clases/${CLASE_A}/alumnos`,
      <Route path="/maestro/clases/:claseId/alumnos" element={<AlumnosView />} />,
    )
    fireEvent.click(await screen.findByRole("button", { name: "Quitar Ana López" }))
    const si = screen.getByRole("button", { name: "Sí, quitar Ana López" })
    fireEvent.click(si)
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await act(() => new Promise((r) => setTimeout(r, 50)))
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(aviso.success).not.toHaveBeenCalled()
    expect(screen.getByRole("cell", { name: "Ana López" })).toBeInTheDocument()
    expect(si).not.toHaveAttribute("aria-busy", "true")
  })
})

describe("ataque CLASES-02d r1: M-12 y O-06 con la ruta en mayúsculas", () => {
  const secciones = () => screen.findByRole("list", { name: "Secciones de la clase" })
  const indicadorDe = (lista: HTMLElement) =>
    lista.parentElement?.querySelector(':scope > [aria-hidden="true"]') ?? null

  it.each([
    [
      "estudiante en /ESTUDIANTE/Clases/<ID>/PERSONAS",
      `/ESTUDIANTE/Clases/${CLASE_A.toUpperCase()}/PERSONAS`,
      "/estudiante/clases/:claseId",
      "Personas",
      ["Muro", "Personas"],
    ],
    [
      "maestro en /Maestro/clases/<id>",
      `/Maestro/clases/${CLASE_A}`,
      "/maestro/clases/:claseId",
      "Muro",
      ["Muro", "Alumnos"],
    ],
    [
      "admin en /ADMIN/CLASES/<id>/MAESTROS",
      `/ADMIN/CLASES/${CLASE_A}/MAESTROS`,
      "/admin/clases/:claseId",
      "Maestros",
      ["Muro", "Alumnos", "Maestros"],
    ],
  ] as const)(
    "%s: la perspectiva de su prefijo, su sección activa y el indicador montado",
    async (_n, ruta, patron, activa, esperadas) => {
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>((entrada) => Promise.resolve(responderClase(String(entrada)))),
      )
      conRutas(
        ruta,
        <Route path={patron} element={<ClaseLayout />}>
          <Route index element={<p>muro</p>} />
          <Route path="personas" element={<p>personas</p>} />
          <Route path="alumnos" element={<p>alumnos</p>} />
          <Route path="maestros" element={<p>maestros</p>} />
        </Route>,
      )
      const lista = await secciones()
      expect(
        within(lista)
          .getAllByRole("link")
          .map((a) => a.textContent),
      ).toEqual(esperadas)
      expect(within(lista).getByRole("link", { name: activa })).toHaveAttribute(
        "aria-current",
        "page",
      )
      expect(indicadorDe(lista), "sin indicador con la ruta en mayúsculas").not.toBeNull()
    },
  )
})

describe("ataque CLASES-02d r1: O-14, de una publicación de A a la clase B en caché", () => {
  it("el foco que estaba en una publicación de A va al encabezado «Publicaciones» de B, no a <body> ni a una publicación de B", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada) => Promise.resolve(responderClase(String(entrada)))),
    )
    const router = createMemoryRouter(
      [{ path: "/estudiante/clases/:claseId", element: <MuroView /> }],
      { initialEntries: [`/estudiante/clases/${CLASE_B}`] },
    )
    render(
      <QueryClientProvider client={cliente()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    await screen.findByText("Publicación de Clase B")
    await act(() => router.navigate(`/estudiante/clases/${CLASE_A}`))
    const deA = (await screen.findByText("Publicación de Clase A")).closest("li")
    if (!(deA instanceof HTMLElement)) throw new Error("Precondición: sin la publicación de A")
    const control = within(deA).getAllByRole("button")[0]
    if (!control) throw new Error("Precondición: la publicación de A no tiene controles")
    act(() => control.focus())
    expect(document.activeElement).toBe(control)

    await act(() => router.navigate(`/estudiante/clases/${CLASE_B}`))
    await screen.findByText("Publicación de Clase B")
    await act(() => new Promise((r) => setTimeout(r, 50)))
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Publicaciones" }))
  })
})
