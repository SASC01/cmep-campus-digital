import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { TEXTOS_DE_LA_CLASE } from "@/components/clase/data"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { DetallesDeLaTarea } from "./components/detalles-de-la-tarea"
import { EditorDeRubrica } from "./components/editor-de-rubrica"
import { CrearTareaView } from "./crear-tarea-view"
import {
  LIMITE_CRITERIOS,
  MENSAJES_ERROR_TAREAS,
  TEXTOS_DETALLE_TAREA,
  TEXTOS_FORMULARIO_TAREA,
} from "./data"
import { EditarTareaView } from "./editar-tarea-view"
import { criterioVacio } from "./lib"
import type { TareaDetalle } from "./types"

// ENTREGAS-01a: "Cómo se entrega" en el formulario y en el detalle (P-03 a; PR-1A11 y PR-1A15) y los
// triviales heredados de TAREAS-01d (O-2 y O-3; PR-1A17 y PR-1A18). Reloj fijo en todas.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2026-10-11T12:00:00.000Z")
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const FECHA_LOCAL = "2030-01-15T10:00"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const tarea = (cambios: Partial<TareaDetalle> = {}): TareaDetalle => ({
  id: TAREA_ID,
  titulo: "Ensayo",
  instrucciones: "",
  fechaLimite: "2030-01-15T16:00:00.000Z",
  puntos: 100,
  aceptaTardias: true,
  requiereAdjuntos: true,
  version: 0,
  categoria: null,
  tema: null,
  rubrica: [],
  adjuntos: [],
  autor: {
    id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
    nombre: "Luis Pérez",
    administracion: false,
  },
  creadoEn: "2026-10-06T15:30:00.000Z",
  actualizadoEn: "2026-10-06T15:30:00.000Z",
  puedeEditar: true,
  puedeBorrar: true,
  ...cambios,
})

interface Llamada {
  metodo: string
  url: string
  cuerpo: unknown
}

const stubApi = (laTarea: TareaDetalle) => {
  const llamadas: Llamada[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      const cuerpo =
        typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : init?.body
      llamadas.push({ metodo, url, cuerpo })
      if (url.endsWith("/categorias"))
        return Promise.resolve(respuestaJson(200, { categorias: [] }))
      if (url.endsWith("/temas"))
        return Promise.resolve(respuestaJson(200, { temas: [], sinTema: 0 }))
      if (metodo === "POST") return Promise.resolve(respuestaJson(201, { tarea: laTarea }))
      return Promise.resolve(respuestaJson(200, { tarea: laTarea }))
    }),
  )
  return { llamadas }
}

const renderEn = (ruta: string) => {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/maestro/clases/:claseId/tareas/nueva" element={<CrearTareaView />} />
          <Route
            path="/maestro/clases/:claseId/tareas/:tareaId/editar"
            element={<EditarTareaView />}
          />
          <Route
            path="/maestro/clases/:claseId/tareas/:tareaId"
            element={<p>Pantalla del detalle</p>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const grupoComoSeEntrega = () => screen.getByRole("group", { name: "Cómo se entrega" })
const conArchivos = () => screen.getByRole("button", { name: "Con archivos o enlaces" })
const marcarCompletada = () => screen.getByRole("button", { name: "Marcar como completada" })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("«Cómo se entrega» en el formulario (PR-1A11)", () => {
  it("PR-1A11: al crear, «Cómo se entrega» es un control segmentado con «Con archivos o enlaces» elegido, antes de las entregas tardías", async () => {
    stubApi(tarea())
    renderEn(`/maestro/clases/${CLASE_ID}/tareas/nueva`)
    await screen.findByLabelText("Título")

    expect(grupoComoSeEntrega()).toContainElement(conArchivos())
    expect(grupoComoSeEntrega()).toContainElement(marcarCompletada())
    expect(conArchivos()).toHaveAttribute("aria-pressed", "true")
    expect(marcarCompletada()).toHaveAttribute("aria-pressed", "false")
    const tardias = screen.getByRole("group", { name: "Entregas después de la fecha límite" })
    expect(
      grupoComoSeEntrega().compareDocumentPosition(tardias) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it("PR-1A11: elegir «Marcar como completada» envía requiereAdjuntos: false; sin tocarlo, true", async () => {
    const { llamadas } = stubApi(tarea())
    renderEn(`/maestro/clases/${CLASE_ID}/tareas/nueva`)
    await screen.findByLabelText("Título")

    fireEvent.click(marcarCompletada())
    expect(marcarCompletada()).toHaveAttribute("aria-pressed", "true")
    expect(conArchivos()).toHaveAttribute("aria-pressed", "false")
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Ensayo" } })
    fireEvent.change(screen.getByLabelText("Fecha límite"), { target: { value: FECHA_LOCAL } })
    fireEvent.click(screen.getByRole("button", { name: "Publicar tarea" }))

    await waitFor(() => expect(llamadas.filter(({ metodo }) => metodo === "POST")).toHaveLength(1))
    expect(llamadas.find(({ metodo }) => metodo === "POST")?.cuerpo).toMatchObject({
      requiereAdjuntos: false,
    })
    expect(await screen.findByText("Pantalla del detalle")).toBeInTheDocument()
  })

  it("PR-1A11: al editar, el control muestra el valor de la tarea y el cuerpo lo conserva", async () => {
    const { llamadas } = stubApi(tarea({ requiereAdjuntos: false, version: 4 }))
    renderEn(`/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/editar`)
    await screen.findByLabelText("Título")

    expect(marcarCompletada()).toHaveAttribute("aria-pressed", "true")
    expect(conArchivos()).toHaveAttribute("aria-pressed", "false")
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

    await waitFor(() => expect(llamadas.filter(({ metodo }) => metodo === "PUT")).toHaveLength(1))
    expect(llamadas.find(({ metodo }) => metodo === "PUT")?.cuerpo).toMatchObject({
      requiereAdjuntos: false,
      version: 4,
    })
  })
})

describe("error del servidor en «Cómo se entrega» (hermano de PR-1A11)", () => {
  it("PR-1A11: un VALIDACION de requiereAdjuntos al guardar se muestra bajo el grupo, sin aviso", async () => {
    const llamadas: Llamada[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada, init) => {
        const url = String(entrada)
        const metodo = init?.method ?? "GET"
        llamadas.push({ metodo, url, cuerpo: null })
        if (url.endsWith("/categorias"))
          return Promise.resolve(respuestaJson(200, { categorias: [] }))
        if (url.endsWith("/temas"))
          return Promise.resolve(respuestaJson(200, { temas: [], sinTema: 0 }))
        if (metodo === "PUT")
          return Promise.resolve(
            respuestaJson(400, {
              error: {
                codigo: "VALIDACION",
                mensaje: "requiereAdjuntos: Elige cómo se entrega la tarea",
              },
            }),
          )
        return Promise.resolve(respuestaJson(200, { tarea: tarea() }))
      }),
    )
    renderEn(`/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/editar`)
    await screen.findByLabelText("Título")

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

    expect(await screen.findByText("Elige cómo se entrega la tarea")).toBeInTheDocument()
    expect(grupoComoSeEntrega()).toHaveAccessibleDescription("Elige cómo se entrega la tarea")
    expect(aviso.error).not.toHaveBeenCalled()
    expect(llamadas.filter(({ metodo }) => metodo === "PUT")).toHaveLength(1)
  })
})

describe("la fila «Entrega» del detalle (PR-1A15)", () => {
  it("PR-1A15: dice «Con archivos o enlaces» si la tarea requiere adjuntos", () => {
    render(<DetallesDeLaTarea tarea={tarea({ requiereAdjuntos: true })} />)

    const fila = screen.getByText("Entrega").closest("div")
    expect(fila).toHaveTextContent("Con archivos o enlaces")
    expect(screen.queryByText(/Se marca como completada/)).not.toBeInTheDocument()
  })

  it("PR-1A15: dice «Se marca como completada (los archivos son opcionales)» si no los requiere", () => {
    render(<DetallesDeLaTarea tarea={tarea({ requiereAdjuntos: false })} />)

    const fila = screen.getByText("Entrega").closest("div")
    expect(fila).toHaveTextContent("Se marca como completada (los archivos son opcionales)")
    expect(screen.queryByText("Con archivos o enlaces")).not.toBeInTheDocument()
  })
})

// La regla 9 (ESLint) impide importar features/clases desde features/tareas; para comprobar con toBe
// que su "Sin tema" es el compartido, la prueba carga ese módulo con import.meta.glob (solo lee la
// constante; el código de producción no se acopla).
const modulosDeClases = import.meta.glob<{ TEXTOS_FORMULARIO_PUBLICACION: { sinTema: string } }>(
  "/src/features/clases/data.ts",
  { eager: true },
)

describe("textos declarados una sola vez (PR-1A17, O-2 de TAREAS-01d)", () => {
  it("PR-1A17: categoriaRequerida es el mismo valor en el formulario y en los mensajes de error", () => {
    expect(MENSAJES_ERROR_TAREAS.categoriaRequerida).toBe(
      TEXTOS_FORMULARIO_TAREA.categoriaRequerida,
    )
    expect(TEXTOS_FORMULARIO_TAREA.categoriaRequerida).toBe("Elige la categoría de la tarea.")
  })

  it("PR-1A17: sinAccesoALaClase es TEXTOS_DE_LA_CLASE.sinAcceso", () => {
    expect(MENSAJES_ERROR_TAREAS.sinAccesoALaClase).toBe(TEXTOS_DE_LA_CLASE.sinAcceso)
  })

  it("PR-1A17: «Sin tema» de features/clases y de los dos objetos de features/tareas es TEXTOS_DE_LA_CLASE.sinTema", () => {
    expect(TEXTOS_DE_LA_CLASE.sinTema).toBe("Sin tema")
    const datosDeClases = modulosDeClases["/src/features/clases/data.ts"]
    if (datosDeClases === undefined) throw new Error("Precondición: features/clases/data.ts existe")
    expect(datosDeClases.TEXTOS_FORMULARIO_PUBLICACION.sinTema).toBe(TEXTOS_DE_LA_CLASE.sinTema)
    expect(TEXTOS_FORMULARIO_TAREA.sinTema).toBe(TEXTOS_DE_LA_CLASE.sinTema)
    expect(TEXTOS_DETALLE_TAREA.sinTema).toBe(TEXTOS_DE_LA_CLASE.sinTema)
  })
})

describe("la nota del tope de criterios (PR-1A18, O-3 de TAREAS-01d)", () => {
  const editor = (cantidad: number) =>
    render(
      <EditorDeRubrica
        idBase="rubrica"
        criterios={Array.from({ length: cantidad }, () => criterioVacio())}
        puntosDeLaTarea={100}
        errores={{}}
        onCambiar={() => undefined}
      />,
    )

  it("PR-1A18: con 20 criterios, «Agregar criterio» nombra la nota del tope en aria-describedby y la nota existe", () => {
    editor(LIMITE_CRITERIOS)

    const agregar = screen.getByRole("button", { name: "Agregar criterio" })
    const idDeLaNota = agregar.getAttribute("aria-describedby")
    expect(idDeLaNota).not.toBeNull()
    const nota = document.getElementById(idDeLaNota ?? "")
    expect(nota).toHaveTextContent(TEXTOS_FORMULARIO_TAREA.tope(LIMITE_CRITERIOS))
    expect(agregar).toHaveAccessibleDescription(TEXTOS_FORMULARIO_TAREA.tope(LIMITE_CRITERIOS))
  })

  it("PR-1A18: con menos de 20 criterios, «Agregar criterio» no lleva aria-describedby y no hay nota", () => {
    editor(LIMITE_CRITERIOS - 1)

    expect(screen.getByRole("button", { name: "Agregar criterio" })).not.toHaveAttribute(
      "aria-describedby",
    )
    expect(
      screen.queryByText(TEXTOS_FORMULARIO_TAREA.tope(LIMITE_CRITERIOS)),
    ).not.toBeInTheDocument()
  })
})
