import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from "react-router"
import { StrictMode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { EditarTareaView } from "./editar-tarea-view"
import { isoAFechaLocal } from "./lib"

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const CATEGORIA_ID = "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d41"
const TEMA_ID = "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d51"
const ADJUNTO_ID = "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d61"
const FECHA_ISO = "2030-01-15T16:00:00.000Z"

const categoria = { id: CATEGORIA_ID, nombre: "Examen", peso: 40, tareas: 1 }
const tema = { id: TEMA_ID, nombre: "Unidad 1", orden: 0, elementos: 2 }

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const tareaConId = (extra: Record<string, unknown> = {}) => ({
  tarea: {
    id: TAREA_ID,
    titulo: "Ensayo final",
    instrucciones: "Dos páginas",
    fechaLimite: FECHA_ISO,
    puntos: 80,
    aceptaTardias: false,
    requiereAdjuntos: true,
    version: 0,
    categoria: { id: CATEGORIA_ID, nombre: "Examen", peso: 40 },
    tema: { id: TEMA_ID, nombre: "Unidad 1" },
    rubrica: [{ id: "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d81", criterio: "Claridad", puntosMax: 10 }],
    adjuntos: [
      {
        id: ADJUNTO_ID,
        nombre: "guia.pdf",
        tipo: "application/pdf",
        tamano: 2048,
        vistaPrevia: null,
      },
    ],
    autor: {
      id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
      nombre: "Luis Pérez",
      administracion: false,
    },
    creadoEn: "2026-10-06T15:30:00.000Z",
    actualizadoEn: "2026-10-06T15:30:00.000Z",
    puedeEditar: true,
    puedeBorrar: true,
    ...extra,
  },
})

interface Llamada {
  metodo: string
  url: string
  cuerpo: unknown
}

interface Opciones {
  tarea?: ReturnType<typeof tareaConId>
  categorias?: (typeof categoria)[]
  categoriasAhora?: () => (typeof categoria)[]
  temasAhora?: () => (typeof tema)[]
  alGuardar?: () => Response | Promise<Response>
  alVer?: () => Response
}

const stubApi = ({
  tarea = tareaConId(),
  categorias = [categoria],
  categoriasAhora = () => categorias,
  temasAhora = () => [tema],
  alGuardar = () => respuestaJson(200, tarea),
  alVer = () => respuestaJson(200, tarea),
}: Opciones = {}) => {
  const llamadas: Llamada[] = []
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const url = String(entrada)
    const metodo = init?.method ?? "GET"
    const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : init?.body
    llamadas.push({ metodo, url, cuerpo })
    if (url.endsWith("/categorias"))
      return Promise.resolve(respuestaJson(200, { categorias: categoriasAhora() }))
    if (url.endsWith("/temas"))
      return Promise.resolve(respuestaJson(200, { temas: temasAhora(), sinTema: 0 }))
    if (metodo === "PUT") return Promise.resolve(alGuardar())
    return Promise.resolve(alVer())
  })
  vi.stubGlobal("fetch", fetchMock)
  return { llamadas }
}

const guardados = (llamadas: Llamada[]) => llamadas.filter(({ metodo }) => metodo === "PUT")

interface OpcionesDeRender {
  cliente?: QueryClient
  estricto?: boolean
}

const renderEditar = ({ cliente, estricto = false }: OpcionesDeRender = {}) => {
  const queryClient = cliente ?? new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const arbol = (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/editar`]}>
        <Routes>
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
    </QueryClientProvider>
  )
  render(estricto ? <StrictMode>{arbol}</StrictMode> : arbol)
  return queryClient
}

const guardar = () => fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

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

describe("PR-1D04: editar una tarea", () => {
  it("PR-1D04: carga los valores de la tarea (fecha local, categoría, tema, criterios y adjuntos publicados)", async () => {
    stubApi()
    renderEditar()

    expect(await screen.findByLabelText("Título")).toHaveValue("Ensayo final")
    expect(screen.getByRole("heading", { name: "Editar tarea" })).toBeInTheDocument()
    expect(screen.getByLabelText("Instrucciones (opcional)")).toHaveValue("Dos páginas")
    expect(screen.getByLabelText("Fecha límite")).toHaveValue(isoAFechaLocal(FECHA_ISO))
    expect(screen.getByLabelText("Puntos")).toHaveValue(80)
    expect(screen.getByLabelText("Categoría")).toHaveValue(CATEGORIA_ID)
    expect(screen.getByLabelText("Tema")).toHaveValue(TEMA_ID)
    expect(screen.getByRole("button", { name: "No aceptar" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(screen.getByLabelText("Criterio 1")).toHaveValue("Claridad")
    expect(screen.getByLabelText("Puntos máximos 1")).toHaveValue(10)
    expect(screen.getByRole("list", { name: "Archivos adjuntos" })).toHaveTextContent("guia.pdf")
    expect(screen.getByRole("button", { name: "Quitar guia.pdf" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Elige una categoría" })).not.toBeInTheDocument()
  })

  it("PR-1D04: guardar envía un PUT con la tarea completa, conserva el adjunto, avisa y vuelve al detalle", async () => {
    const { llamadas } = stubApi()
    renderEditar()
    await screen.findByLabelText("Título")
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Ensayo corregido" } })

    guardar()

    expect(await screen.findByText("Pantalla del detalle")).toBeInTheDocument()
    expect(aviso.success).toHaveBeenCalledWith("Cambios guardados")
    const [guardado] = guardados(llamadas)
    expect(guardado?.url).toBe(`/api/clases/${CLASE_ID}/tareas/${TAREA_ID}`)
    expect(guardado?.cuerpo).toMatchObject({
      titulo: "Ensayo corregido",
      fechaLimite: FECHA_ISO,
      puntos: 80,
      aceptaTardias: false,
      categoriaId: CATEGORIA_ID,
      temaId: TEMA_ID,
      rubrica: [{ criterio: "Claridad", puntosMax: 10 }],
      archivoIds: [ADJUNTO_ID],
    })
  })

  it("PR-1D04: quitar un adjunto publicado lo saca de archivoIds y lleva el foco a «Adjuntar archivos»", async () => {
    const { llamadas } = stubApi()
    renderEditar()
    await screen.findByLabelText("Título")

    fireEvent.click(screen.getByRole("button", { name: "Quitar guia.pdf" }))

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Adjuntar archivos" })).toHaveFocus(),
    )
    expect(screen.queryByRole("list", { name: "Archivos adjuntos" })).not.toBeInTheDocument()
    guardar()
    await screen.findByText("Pantalla del detalle")
    expect(guardados(llamadas)[0]?.cuerpo).toMatchObject({ archivoIds: [] })
  })

  it("PR-1D04: una tarea sin categoría en una clase con categorías carga con «Elige una categoría» y no se guarda sin elegir", async () => {
    const { llamadas } = stubApi({ tarea: tareaConId({ categoria: null }) })
    renderEditar()
    const selector = await screen.findByLabelText("Categoría")

    expect(selector).toHaveValue("")
    expect(screen.getByRole("option", { name: "Elige una categoría" })).toBeInTheDocument()

    guardar()

    expect(screen.getByText("Elige la categoría de la tarea.")).toBeInTheDocument()
    expect(guardados(llamadas)).toHaveLength(0)

    fireEvent.change(selector, { target: { value: CATEGORIA_ID } })
    guardar()
    await screen.findByText("Pantalla del detalle")
    expect(guardados(llamadas)[0]?.cuerpo).toMatchObject({ categoriaId: CATEGORIA_ID })
  })

  it("PR-1D04: una tarea sin categoría en una clase sin categorías conserva «Sin categoría» y se guarda", async () => {
    const { llamadas } = stubApi({ tarea: tareaConId({ categoria: null }), categorias: [] })
    renderEditar()
    await screen.findByLabelText("Título")

    expect(screen.getByRole("option", { name: "Sin categoría" })).toBeInTheDocument()
    guardar()

    await screen.findByText("Pantalla del detalle")
    expect(guardados(llamadas)[0]?.cuerpo).toMatchObject({ categoriaId: null })
  })

  it("PR-1D04: un 403 EDICION_NO_PERMITIDA se avisa con el mensaje del servidor y no navega", async () => {
    stubApi({
      alGuardar: () =>
        respuestaJson(403, {
          error: {
            codigo: "EDICION_NO_PERMITIDA",
            mensaje: "Solo quien publicó la tarea puede editarla.",
          },
        }),
    })
    renderEditar()
    await screen.findByLabelText("Título")

    guardar()

    await waitFor(() =>
      expect(aviso.error).toHaveBeenCalledWith("Solo quien publicó la tarea puede editarla."),
    )
    expect(screen.queryByText("Pantalla del detalle")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Título")).toBeInTheDocument()
  })

  it("PR-1D04: sin puedeEditar la vista no muestra el formulario", async () => {
    stubApi({ tarea: tareaConId({ puedeEditar: false }) })
    renderEditar()

    expect(await screen.findByText("No puedes editar esta tarea.")).toBeInTheDocument()
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument()
  })

  it("PR-1D04: una tarea que ya no existe dice «Esa tarea ya no existe.»", async () => {
    stubApi({
      alVer: () =>
        respuestaJson(404, {
          error: { codigo: "TAREA_NO_ENCONTRADA", mensaje: "No encontrada" },
        }),
    })
    renderEditar()

    expect(await screen.findByText("Esa tarea ya no existe.")).toBeInTheDocument()
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument()
  })

  it("PR-1D04: «Cancelar» es un enlace al detalle de la tarea", async () => {
    stubApi()
    renderEditar()
    await screen.findByLabelText("Título")

    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      `/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}`,
    )
  })
})

describe("PR-1D04: opciones que cambian y foco al editar (T-08, T-09)", () => {
  it("PR-1D04: tras un 404 de categoría al guardar, la lista se pide de nuevo y el campo vuelve a «Elige una categoría»", async () => {
    let vigentes = [categoria]
    const { llamadas } = stubApi({
      categoriasAhora: () => vigentes,
      alGuardar: () => {
        vigentes = [{ ...categoria, id: "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d42", nombre: "Tareas" }]
        return respuestaJson(404, {
          error: { codigo: "CATEGORIA_NO_ENCONTRADA", mensaje: "No existe" },
        })
      },
    })
    renderEditar()
    await screen.findByLabelText("Título")

    guardar()

    expect(await screen.findByText("Esa categoría ya no existe. Elige otra.")).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Tareas (40 %)" })).toBeInTheDocument(),
    )
    expect(screen.getByLabelText("Categoría")).toHaveValue("")
    expect(llamadas.filter(({ url }) => url.endsWith("/categorias")).length).toBeGreaterThan(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("PR-1D04: tras un 404 de tema al guardar, el campo vuelve a «Sin tema»", async () => {
    let temas = [tema]
    stubApi({
      temasAhora: () => temas,
      alGuardar: () => {
        temas = []
        return respuestaJson(404, { error: { codigo: "TEMA_NO_ENCONTRADO", mensaje: "No existe" } })
      },
    })
    renderEditar()
    await screen.findByLabelText("Título")

    guardar()

    expect(await screen.findByText("Ese tema ya no existe.")).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole("option", { name: "Unidad 1" })).not.toBeInTheDocument(),
    )
    expect(screen.getByLabelText("Tema")).toHaveValue("")
  })

  it("PR-1D04: una recarga que quita puedeEditar con el foco dentro del formulario lleva el foco a la raíz de la vista", async () => {
    let tarea = tareaConId()
    stubApi({ alVer: () => respuestaJson(200, tarea) })
    const cliente = renderEditar()
    const titulo = await screen.findByLabelText("Título")
    act(() => titulo.focus())
    expect(titulo).toHaveFocus()

    tarea = tareaConId({ puedeEditar: false })
    await act(() => cliente.invalidateQueries())

    expect(await screen.findByText("No puedes editar esta tarea.")).toBeInTheDocument()
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement).toContainElement(
      screen.getByText("No puedes editar esta tarea."),
    )
  })

  it("PR-1D04: la tarea que desaparece (404) con el foco dentro del formulario lleva el foco a la raíz", async () => {
    let existe = true
    stubApi({
      alVer: () =>
        existe
          ? respuestaJson(200, tareaConId())
          : respuestaJson(404, { error: { codigo: "TAREA_NO_ENCONTRADA", mensaje: "x" } }),
    })
    const cliente = renderEditar()
    const titulo = await screen.findByLabelText("Título")
    act(() => titulo.focus())

    existe = false
    await act(() => cliente.invalidateQueries())

    expect(await screen.findByText("Esa tarea ya no existe.")).toBeInTheDocument()
    expect(document.activeElement).not.toBe(document.body)
  })

  it("PR-1D04: una recarga sin cambios no le quita el foco al formulario", async () => {
    stubApi()
    const cliente = renderEditar()
    const titulo = await screen.findByLabelText("Título")
    act(() => titulo.focus())

    await act(() => cliente.invalidateQueries())

    expect(await screen.findByLabelText("Título")).toHaveFocus()
  })
})

// M-01: una recarga fallida con la tarea en caché no desmonta el formulario ni borra lo escrito.
describe("PR-1D04: una recarga fallida con la tarea en caché (M-01)", () => {
  const AVISO = "No pudimos actualizar la tarea. Puedes seguir editando; revisa tu conexión."
  const recargar = (cliente: QueryClient) => act(() => cliente.invalidateQueries())

  it("PR-1D04: un 5xx en la recarga deja el formulario, lo escrito y el foco, y avisa sin desmontar", async () => {
    let falla = false
    stubApi({
      alVer: () =>
        falla
          ? respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } })
          : respuestaJson(200, tareaConId()),
    })
    const cliente = renderEditar()
    const titulo = await screen.findByLabelText("Título")
    fireEvent.change(titulo, { target: { value: "Ensayo a medias" } })
    act(() => titulo.focus())

    falla = true
    await recargar(cliente)

    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(AVISO))
    expect(screen.getByLabelText("Título")).toBe(titulo)
    expect(titulo).toHaveValue("Ensayo a medias")
    expect(titulo).toHaveFocus()
    expect(screen.queryByText("Algo salió mal. Inténtalo de nuevo.")).not.toBeInTheDocument()
  })

  it("PR-1D04: dos fallos seguidos avisan dos veces y el formulario sigue intacto", async () => {
    let falla = false
    stubApi({
      alVer: () =>
        falla
          ? respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } })
          : respuestaJson(200, tareaConId()),
    })
    const cliente = renderEditar()
    fireEvent.change(await screen.findByLabelText("Título"), { target: { value: "Escrito" } })

    falla = true
    await recargar(cliente)
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await recargar(cliente)

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
    expect(screen.getByLabelText("Título")).toHaveValue("Escrito")
  })

  it("PR-1D04: un fallo seguido de una recarga exitosa conserva lo escrito y no lo sobrescribe con los datos nuevos", async () => {
    let falla = false
    let tarea = tareaConId()
    stubApi({
      alVer: () =>
        falla
          ? respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } })
          : respuestaJson(200, tarea),
    })
    const cliente = renderEditar()
    const titulo = await screen.findByLabelText("Título")
    fireEvent.change(titulo, { target: { value: "Mi versión" } })
    falla = true
    await recargar(cliente)
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))

    falla = false
    tarea = tareaConId({ titulo: "Versión de otra persona" })
    await recargar(cliente)

    await waitFor(() => expect(cliente.isFetching()).toBe(0))
    expect(screen.getByLabelText("Título")).toBe(titulo)
    expect(titulo).toHaveValue("Mi versión")
  })

  it("PR-1D04: un 404 con la tarea en caché sigue diciendo que no existe y el foco va a la raíz", async () => {
    let existe = true
    stubApi({
      alVer: () =>
        existe
          ? respuestaJson(200, tareaConId())
          : respuestaJson(404, { error: { codigo: "TAREA_NO_ENCONTRADA", mensaje: "x" } }),
    })
    const cliente = renderEditar()
    const titulo = await screen.findByLabelText("Título")
    act(() => titulo.focus())

    existe = false
    await recargar(cliente)

    expect(await screen.findByText("Esa tarea ya no existe.")).toBeInTheDocument()
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument()
    expect(aviso.error).not.toHaveBeenCalledWith(AVISO)
    expect(document.activeElement).not.toBe(document.body)
  })

  it("PR-1D04: la primera carga fallida sigue diciendo el error y no muestra el formulario", async () => {
    stubApi({
      alVer: () => respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } }),
    })
    renderEditar()

    expect(await screen.findByText("Algo salió mal. Inténtalo de nuevo.")).toBeInTheDocument()
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument()
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

const errorDeApi = (estado: number, codigo: string, mensaje = "x") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const esperarUnTurno = () => act(() => new Promise<void>((resolver) => setTimeout(resolver, 5)))

const lecturasDeLaTarea = (llamadas: Llamada[]) =>
  llamadas.filter(({ metodo, url }) => metodo === "GET" && url.endsWith(`/tareas/${TAREA_ID}`))

const AVISO_SIN_CONEXION =
  "No pudimos actualizar la tarea. Puedes seguir editando; revisa tu conexión."
const AVISO_DEL_SERVIDOR =
  "No pudimos actualizar la tarea. Puedes seguir editando; inténtalo de nuevo en un momento."

const enfocadoFueraDeBody = () => {
  const activo = document.activeElement
  expect(activo).not.toBeNull()
  expect(activo).not.toBe(document.body)
  return activo as HTMLElement
}

// T-10: la respuesta de un guardado llega después de que se pudo quitar una fila de la rúbrica.
describe("PR-1D04: un error por una fila quitada con el guardado en vuelo (T-10)", () => {
  it("PR-1D04: el error del servidor por una fila que ya no está se muestra como error de la rúbrica y no se pierde", async () => {
    let soltar: (respuesta: Response) => void = () => undefined
    const { llamadas } = stubApi({
      alGuardar: () =>
        new Promise<Response>((resolver) => {
          soltar = resolver
        }),
    })
    renderEditar()
    await screen.findByLabelText("Título")
    guardar()
    await waitFor(() => expect(guardados(llamadas)).toHaveLength(1))
    fireEvent.click(screen.getByRole("button", { name: "Quitar criterio 1" }))

    soltar(errorDeApi(400, "VALIDACION", "rubrica.0.puntosMax: El criterio no es válido."))

    expect(await screen.findByText("El criterio no es válido.")).toBeInTheDocument()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Agregar criterio" })).toBeInTheDocument()
  })
})

// T-11: lo que el servidor niega al guardar vuelve a pedir la tarea para que la vista reaccione.
describe("PR-1D04: guardar con la tarea en caché vieja (T-11)", () => {
  it("PR-1D04: un 404 al guardar vuelve a pedir la tarea; el formulario a medio escribir se reemplaza por «Esa tarea ya no existe.» y el foco va a la raíz", async () => {
    let existe = true
    const { llamadas } = stubApi({
      alVer: () =>
        existe ? respuestaJson(200, tareaConId()) : errorDeApi(404, "TAREA_NO_ENCONTRADA"),
      alGuardar: () => {
        existe = false
        return errorDeApi(404, "TAREA_NO_ENCONTRADA")
      },
    })
    renderEditar()
    const titulo = await screen.findByLabelText("Título")
    fireEvent.change(titulo, { target: { value: "A medio escribir" } })
    act(() => titulo.focus())

    guardar()

    expect(await screen.findByText("Esa tarea ya no existe.")).toBeInTheDocument()
    expect(aviso.error).toHaveBeenCalledWith("Esa tarea ya no existe.")
    expect(lecturasDeLaTarea(llamadas)).toHaveLength(2)
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument()
    expect(enfocadoFueraDeBody()).toContainElement(screen.getByText("Esa tarea ya no existe."))
  })

  it("PR-1D04: un 403 EDICION_NO_PERMITIDA al guardar vuelve a pedir la tarea y, con puedeEditar en false, el formulario deja de ofrecer guardar", async () => {
    let permitido = true
    const { llamadas } = stubApi({
      alVer: () => respuestaJson(200, tareaConId({ puedeEditar: permitido })),
      alGuardar: () => {
        permitido = false
        return errorDeApi(403, "EDICION_NO_PERMITIDA", "Ya no puedes editar esta tarea.")
      },
    })
    renderEditar()
    const titulo = await screen.findByLabelText("Título")
    act(() => titulo.focus())

    guardar()

    expect(await screen.findByText("No puedes editar esta tarea.")).toBeInTheDocument()
    expect(aviso.error).toHaveBeenCalledWith("Ya no puedes editar esta tarea.")
    expect(lecturasDeLaTarea(llamadas)).toHaveLength(2)
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument()
    expect(enfocadoFueraDeBody()).toContainElement(screen.getByText("No puedes editar esta tarea."))
  })

  it("PR-1D04: un 403 SIN_ACCESO_A_LA_CLASE al guardar vuelve a pedir la tarea y la vista dice que ya no hay acceso", async () => {
    let acceso = true
    stubApi({
      alVer: () =>
        acceso ? respuestaJson(200, tareaConId()) : errorDeApi(403, "SIN_ACCESO_A_LA_CLASE"),
      alGuardar: () => {
        acceso = false
        return errorDeApi(403, "SIN_ACCESO_A_LA_CLASE")
      },
    })
    renderEditar()
    await screen.findByLabelText("Título")

    guardar()

    expect(await screen.findByText("No tienes acceso a esta clase.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument()
  })

  it("PR-1D04: un fallo que no dice que la tarea cambió (500 al guardar) no la vuelve a pedir y deja el formulario", async () => {
    const { llamadas } = stubApi({ alGuardar: () => errorDeApi(500, "ERROR_INTERNO") })
    renderEditar()
    await screen.findByLabelText("Título")

    guardar()

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(lecturasDeLaTarea(llamadas)).toHaveLength(1)
    expect(screen.getByLabelText("Título")).toBeInTheDocument()
  })
})

// T-12: el aviso de una recarga fallida es por fallo nuevo, no por montar la vista con el error en caché.
describe("PR-1D04: el aviso de una recarga fallida solo sale por un fallo nuevo (T-12)", () => {
  it("PR-1D04: montar el formulario con el error ya avisado en caché no avisa otra vez", async () => {
    let respuestas = 0
    stubApi({
      alVer: () => {
        respuestas += 1
        return respuestas === 2
          ? errorDeApi(500, "ERROR_INTERNO")
          : respuestaJson(200, tareaConId())
      },
    })
    const cliente = renderEditar()
    await screen.findByLabelText("Título")
    await act(() => cliente.invalidateQueries())
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    cleanup()

    renderEditar({ cliente })
    await screen.findByLabelText("Título")
    await waitFor(() => expect(cliente.isFetching()).toBe(0))

    expect(respuestas).toBeGreaterThanOrEqual(3)
    expect(aviso.error.mock.calls).toEqual([[AVISO_SIN_CONEXION]])
  })

  it("PR-1D04: con StrictMode (efectos dos veces) un fallo avisa una sola vez", async () => {
    let respuestas = 0
    stubApi({
      alVer: () => {
        respuestas += 1
        return respuestas === 2
          ? errorDeApi(500, "ERROR_INTERNO")
          : respuestaJson(200, tareaConId())
      },
    })
    const cliente = renderEditar({ estricto: true })
    await screen.findByLabelText("Título")

    await act(() => cliente.invalidateQueries())
    await waitFor(() => expect(aviso.error).toHaveBeenCalled())
    await esperarUnTurno()

    expect(aviso.error.mock.calls).toEqual([[AVISO_SIN_CONEXION]])
  })
})

// T-13: el aviso o la vista dependen de qué falló.
describe("PR-1D04: qué dice la vista según el error de la recarga (T-13)", () => {
  const conFalloEnLaRecarga = async (fallo: () => Response) => {
    let falla = false
    stubApi({ alVer: () => (falla ? fallo() : respuestaJson(200, tareaConId())) })
    const cliente = renderEditar()
    const titulo = await screen.findByLabelText("Título")
    fireEvent.change(titulo, { target: { value: "Lo que escribí" } })
    act(() => titulo.focus())
    falla = true
    await act(() => cliente.invalidateQueries())
    return titulo
  }

  it("PR-1D04: un 403 SIN_ACCESO_A_LA_CLASE reemplaza el formulario por «No tienes acceso a esta clase.», sin ofrecer guardar y con el foco en la raíz", async () => {
    await conFalloEnLaRecarga(() => errorDeApi(403, "SIN_ACCESO_A_LA_CLASE"))

    expect(await screen.findByText("No tienes acceso a esta clase.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(enfocadoFueraDeBody()).toContainElement(
      screen.getByText("No tienes acceso a esta clase."),
    )
  })

  it.each([
    ["tareaId: Identificador no válido", "Esa tarea ya no existe."],
    ["claseId: Identificador no válido", "No tienes acceso a esta clase."],
  ])(
    "PR-1D04: un VALIDACION «%s» en la recarga se trata como 404 o como pérdida de acceso",
    async (mensaje, texto) => {
      await conFalloEnLaRecarga(() => errorDeApi(400, "VALIDACION", mensaje))

      expect(await screen.findByText(texto)).toBeInTheDocument()
      expect(screen.queryByLabelText("Título")).not.toBeInTheDocument()
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )

  it("PR-1D04: un 429 en la recarga avisa sin hablar de conexión y deja el formulario con lo escrito", async () => {
    const titulo = await conFalloEnLaRecarga(() => errorDeApi(429, "DEMASIADAS_SOLICITUDES"))

    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(AVISO_DEL_SERVIDOR))
    expect(AVISO_DEL_SERVIDOR).not.toContain("conexión")
    expect(screen.getByLabelText("Título")).toBe(titulo)
    expect(titulo).toHaveValue("Lo que escribí")
    expect(titulo).toHaveFocus()
  })

  it("PR-1D04: un 503 sin JSON (la API caída) en la recarga avisa que revise la conexión", async () => {
    await conFalloEnLaRecarga(() => new Response("", { status: 503 }))

    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(AVISO_SIN_CONEXION))
    expect(screen.getByLabelText("Título")).toHaveValue("Lo que escribí")
  })

  it("PR-1D04: sin conexión (el fetch rechaza) en la recarga avisa que revise la conexión", async () => {
    let falla = false
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada) => {
        const url = String(entrada)
        if (url.endsWith("/categorias"))
          return Promise.resolve(respuestaJson(200, { categorias: [categoria] }))
        if (url.endsWith("/temas"))
          return Promise.resolve(respuestaJson(200, { temas: [tema], sinTema: 0 }))
        return falla
          ? Promise.reject(new TypeError("Failed to fetch"))
          : Promise.resolve(respuestaJson(200, tareaConId()))
      }),
    )
    const cliente = renderEditar()
    await screen.findByLabelText("Título")
    falla = true

    await act(() => cliente.invalidateQueries())

    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(AVISO_SIN_CONEXION))
    expect(screen.getByLabelText("Título")).toBeInTheDocument()
  })
})

// T-14: el foco solo se recupera cuando el control que lo tenía desaparece, con el criterio de CLASES-02.
describe("PR-1D04: el foco se recupera solo si el control desaparece (T-14)", () => {
  let tarea = tareaConId()
  const recargar = (cliente: QueryClient) => act(() => cliente.invalidateQueries())

  beforeEach(() => {
    tarea = tareaConId()
  })

  const abrirConFoco = async () => {
    stubApi({ alVer: () => respuestaJson(200, tarea) })
    const cliente = renderEditar()
    const titulo = await screen.findByLabelText("Título")
    act(() => titulo.focus())
    return { cliente, titulo }
  }

  const quitarElPermiso = async (cliente: QueryClient) => {
    tarea = tareaConId({ puedeEditar: false })
    await recargar(cliente)
    await screen.findByText("No puedes editar esta tarea.")
  }

  it("PR-1D04: la primera carga, con el foco en <body>, no lo mueve", async () => {
    stubApi({ alVer: () => respuestaJson(200, tarea) })
    renderEditar()

    await screen.findByLabelText("Título")

    expect(document.activeElement).toBe(document.body)
  })

  it("PR-1D04: un clic en blanco suelta el foco: una recarga sin cambios no lo recupera", async () => {
    const { cliente, titulo } = await abrirConFoco()
    fireEvent.mouseDown(screen.getByRole("heading", { name: "Editar tarea" }))
    act(() => titulo.blur())
    await esperarUnTurno()

    await recargar(cliente)

    expect(document.activeElement).toBe(document.body)
  })

  it("PR-1D04: un clic en blanco suelta el foco: una recarga que quita puedeEditar después tampoco lo recupera", async () => {
    const { cliente, titulo } = await abrirConFoco()
    fireEvent.mouseDown(screen.getByRole("heading", { name: "Editar tarea" }))
    act(() => titulo.blur())
    await esperarUnTurno()

    await quitarElPermiso(cliente)

    expect(document.activeElement).toBe(document.body)
  })

  it("PR-1D04: al cambiar de pestaña (focusout sin destino y blur de la ventana) la memoria se conserva y la recarga que quita puedeEditar lleva el foco a la raíz", async () => {
    const { cliente, titulo } = await abrirConFoco()
    fireEvent.focusOut(titulo)
    window.dispatchEvent(new Event("blur"))
    await esperarUnTurno()

    await quitarElPermiso(cliente)

    expect(enfocadoFueraDeBody()).toContainElement(screen.getByText("No puedes editar esta tarea."))
    window.dispatchEvent(new Event("focus"))
  })

  it("PR-1D04: un focusout sin destino con el campo todavía enfocado (el aviso de la ventana llega después) conserva la memoria", async () => {
    const { cliente, titulo } = await abrirConFoco()
    fireEvent.focusOut(titulo)
    await esperarUnTurno()
    window.dispatchEvent(new Event("blur"))

    await quitarElPermiso(cliente)

    expect(enfocadoFueraDeBody()).toContainElement(screen.getByText("No puedes editar esta tarea."))
    window.dispatchEvent(new Event("focus"))
  })

  it("PR-1D04: al cambiar de tarea (otro tareaId) con el foco en el formulario, el foco va a la raíz mientras carga la nueva", async () => {
    const OTRA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d78"
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada) => {
        const url = String(entrada)
        if (url.endsWith("/categorias"))
          return Promise.resolve(respuestaJson(200, { categorias: [categoria] }))
        if (url.endsWith("/temas"))
          return Promise.resolve(respuestaJson(200, { temas: [tema], sinTema: 0 }))
        if (url.endsWith(OTRA_ID)) return new Promise<Response>(() => undefined)
        return Promise.resolve(respuestaJson(200, tareaConId()))
      }),
    )
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const router = createMemoryRouter(
      [{ path: "/maestro/clases/:claseId/tareas/:tareaId/editar", element: <EditarTareaView /> }],
      { initialEntries: [`/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/editar`] },
    )
    render(
      <QueryClientProvider client={cliente}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    const titulo = await screen.findByLabelText("Título")
    act(() => titulo.focus())

    await act(() => router.navigate(`/maestro/clases/${CLASE_ID}/tareas/${OTRA_ID}/editar`))

    expect(await screen.findByText("Cargando la tarea…")).toBeInTheDocument()
    expect(enfocadoFueraDeBody()).toContainElement(screen.getByText("Cargando la tarea…"))
  })
})

// T-15: un fallo que conserva el formulario seguido de otro que lo reemplaza vuelve a evaluar el foco.
describe("PR-1D04: el foco tras dos fallos seguidos de distinto tipo (T-15)", () => {
  type Respuesta = () => Promise<Response>
  const bien: Respuesta = () => Promise.resolve(respuestaJson(200, tareaConId()))
  const con =
    (estado: number, codigo: string, mensaje = "x"): Respuesta =>
    () =>
      Promise.resolve(errorDeApi(estado, codigo, mensaje))
  const sinRed: Respuesta = () => Promise.reject(new TypeError("Failed to fetch"))
  const apiCaida: Respuesta = () => Promise.resolve(new Response("", { status: 503 }))

  // Cada lectura de la tarea toma la siguiente respuesta de la lista; la primera es la carga.
  const conLecturas = (lecturas: Respuesta[]) => {
    const pendientes = [...lecturas]
    const llamadas: Llamada[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada, init) => {
        const url = String(entrada)
        const metodo = init?.method ?? "GET"
        llamadas.push({ metodo, url, cuerpo: null })
        if (url.endsWith("/categorias"))
          return Promise.resolve(respuestaJson(200, { categorias: [categoria] }))
        if (url.endsWith("/temas"))
          return Promise.resolve(respuestaJson(200, { temas: [tema], sinTema: 0 }))
        if (metodo === "PUT") return Promise.resolve(errorDeApi(404, "TAREA_NO_ENCONTRADA"))
        const siguiente = pendientes.shift()
        if (siguiente === undefined) return bien()
        return siguiente()
      }),
    )
    return llamadas
  }

  const abrirConFocoEnTitulo = async () => {
    const cliente = renderEditar()
    const titulo = await screen.findByLabelText("Título")
    act(() => titulo.focus())
    return { cliente, titulo }
  }

  const recargar = async (cliente: QueryClient) => {
    await act(() => cliente.invalidateQueries())
    await waitFor(() => expect(cliente.isFetching()).toBe(0))
    await esperarUnTurno()
  }

  // O-1 de TAREAS-01d (ENTREGAS-01a, PR-1A16): un campo `nombre` por fila, y el título solo lo interpola
  // a él (antes el segundo %s interpolaba el código de una función).
  it.each([
    {
      nombre: "500 y después 404",
      conserva: con(500, "ERROR_INTERNO"),
      reemplaza: con(404, "TAREA_NO_ENCONTRADA"),
      texto: "Esa tarea ya no existe.",
    },
    {
      nombre: "500 y después 403 SIN_ACCESO",
      conserva: con(500, "ERROR_INTERNO"),
      reemplaza: con(403, "SIN_ACCESO_A_LA_CLASE"),
      texto: "No tienes acceso a esta clase.",
    },
    {
      nombre: "red caída y después 404",
      conserva: sinRed,
      reemplaza: con(404, "TAREA_NO_ENCONTRADA"),
      texto: "Esa tarea ya no existe.",
    },
    {
      nombre: "VALIDACION de campo y de tareaId",
      conserva: con(400, "VALIDACION", "titulo: No es válido"),
      reemplaza: con(400, "VALIDACION", "tareaId: No es válido"),
      texto: "Esa tarea ya no existe.",
    },
    {
      nombre: "429 y VALIDACION de claseId",
      conserva: con(429, "DEMASIADAS_SOLICITUDES"),
      reemplaza: con(400, "VALIDACION", "claseId: No es válido"),
      texto: "No tienes acceso a esta clase.",
    },
    {
      nombre: "503 sin JSON y después 404",
      conserva: apiCaida,
      reemplaza: con(404, "TAREA_NO_ENCONTRADA"),
      texto: "Esa tarea ya no existe.",
    },
  ])(
    "PR-1D04: $nombre: el primer fallo conserva el formulario con el foco en «Título»; el segundo lo reemplaza y el foco va a la raíz, no a <body>",
    async ({ conserva, reemplaza, texto }) => {
      conLecturas([bien, conserva, reemplaza])
      const { cliente, titulo } = await abrirConFocoEnTitulo()

      await recargar(cliente)
      expect(titulo).toHaveFocus()
      await recargar(cliente)

      expect(await screen.findByText(texto)).toBeInTheDocument()
      expect(screen.queryByLabelText("Título")).not.toBeInTheDocument()
      expect(enfocadoFueraDeBody()).toContainElement(screen.getByText(texto))
    },
  )

  it("PR-1D04: con los dos fallos en el mismo milisegundo, el segundo (404) sigue llevando el foco a la raíz", async () => {
    conLecturas([bien, con(500, "ERROR_INTERNO"), con(404, "TAREA_NO_ENCONTRADA")])
    const { cliente } = await abrirConFocoEnTitulo()
    const ahora = vi.spyOn(Date, "now").mockReturnValue(Date.now())

    await recargar(cliente)
    await recargar(cliente)
    ahora.mockRestore()

    expect(await screen.findByText("Esa tarea ya no existe.")).toBeInTheDocument()
    expect(enfocadoFueraDeBody()).toContainElement(screen.getByText("Esa tarea ya no existe."))
  })

  it("PR-1D04: camino de T-11: tras una recarga fallida, un PUT con 404 vuelve a pedir la tarea, el 404 reemplaza el formulario y el foco va a la raíz", async () => {
    const llamadas = conLecturas([bien, con(500, "ERROR_INTERNO"), con(404, "TAREA_NO_ENCONTRADA")])
    const { cliente, titulo } = await abrirConFocoEnTitulo()
    await recargar(cliente)
    expect(titulo).toHaveFocus()

    guardar()

    expect(await screen.findByText("Esa tarea ya no existe.")).toBeInTheDocument()
    expect(lecturasDeLaTarea(llamadas)).toHaveLength(3)
    expect(enfocadoFueraDeBody()).toContainElement(screen.getByText("Esa tarea ya no existe."))
  })

  it("PR-1D04: dos fallos que conservan el formulario seguidos no mueven el foco de «Título»", async () => {
    conLecturas([bien, con(500, "ERROR_INTERNO"), con(429, "DEMASIADAS_SOLICITUDES")])
    const { cliente, titulo } = await abrirConFocoEnTitulo()

    await recargar(cliente)
    await recargar(cliente)

    expect(screen.getByLabelText("Título")).toBe(titulo)
    expect(titulo).toHaveFocus()
  })

  it("PR-1D04: un fallo que conserva el formulario seguido de una recarga exitosa no mueve el foco de «Título»", async () => {
    conLecturas([bien, con(500, "ERROR_INTERNO"), bien])
    const { cliente, titulo } = await abrirConFocoEnTitulo()

    await recargar(cliente)
    await recargar(cliente)

    expect(screen.getByLabelText("Título")).toBe(titulo)
    expect(titulo).toHaveFocus()
  })

  it("PR-1D04: quien soltó el foco con un clic en blanco no lo recupera cuando un fallo que conserva va seguido de uno que reemplaza (T-14 sigue valiendo)", async () => {
    conLecturas([bien, con(500, "ERROR_INTERNO"), con(404, "TAREA_NO_ENCONTRADA")])
    const { cliente, titulo } = await abrirConFocoEnTitulo()
    fireEvent.mouseDown(screen.getByRole("heading", { name: "Editar tarea" }))
    act(() => titulo.blur())
    await esperarUnTurno()

    await recargar(cliente)
    await recargar(cliente)

    expect(await screen.findByText("Esa tarea ya no existe.")).toBeInTheDocument()
    expect(document.activeElement).toBe(document.body)
  })

  it("PR-1D04: con la memoria conservada por un cambio de pestaña, un fallo que conserva seguido de uno que reemplaza lleva el foco a la raíz", async () => {
    conLecturas([bien, con(500, "ERROR_INTERNO"), con(403, "SIN_ACCESO_A_LA_CLASE")])
    const { cliente, titulo } = await abrirConFocoEnTitulo()
    fireEvent.focusOut(titulo)
    window.dispatchEvent(new Event("blur"))
    await esperarUnTurno()

    await recargar(cliente)
    await recargar(cliente)

    expect(await screen.findByText("No tienes acceso a esta clase.")).toBeInTheDocument()
    expect(enfocadoFueraDeBody()).toContainElement(
      screen.getByText("No tienes acceso a esta clase."),
    )
    window.dispatchEvent(new Event("focus"))
  })
})
