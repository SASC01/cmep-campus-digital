import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from "react-router"
import { StrictMode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { clavePublicaciones } from "@/services/clasesService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { DetalleTareaView } from "./detalle-tarea-view"

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const tareaConId = (extra: Record<string, unknown> = {}) => ({
  tarea: {
    id: TAREA_ID,
    titulo: "Ensayo final",
    instrucciones: "Escribe dos páginas.\n<b>Sin formato</b>",
    fechaLimite: "2030-01-15T16:00:00.000Z",
    puntos: 80,
    aceptaTardias: false,
    categoria: { id: "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d41", nombre: "Examen", peso: 40 },
    tema: { id: "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d51", nombre: "Unidad 1" },
    rubrica: [
      { id: "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d81", criterio: "Claridad", puntosMax: 10 },
      { id: "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d82", criterio: "Fuentes", puntosMax: 20 },
    ],
    adjuntos: [
      {
        id: "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d61",
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
    puedeEditar: false,
    puedeBorrar: false,
    ...extra,
  },
})

interface Llamada {
  metodo: string
  url: string
}

const stubApi = (
  alVer: () => Response,
  alBorrar: () => Response = () => new Response(null, { status: 204 }),
) => {
  const llamadas: Llamada[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const metodo = init?.method ?? "GET"
      llamadas.push({ metodo, url: String(entrada) })
      if (metodo === "DELETE") return Promise.resolve(alBorrar())
      return Promise.resolve(alVer())
    }),
  )
  return { llamadas }
}

const renderDetalle = (perspectiva: "estudiante" | "maestro" | "admin") => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/${perspectiva}/clases/${CLASE_ID}/tareas/${TAREA_ID}`]}>
        <Routes>
          <Route
            path={`/${perspectiva}/clases/:claseId/tareas/:tareaId`}
            element={<DetalleTareaView />}
          />
          <Route path={`/${perspectiva}/clases/:claseId`} element={<p>Pantalla del muro</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return queryClient
}

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

describe("PR-1D05: detalle de una tarea", () => {
  it("PR-1D05: el estudiante ve la tarea completa, «Tu trabajo» y ninguna acción de maestro", async () => {
    stubApi(() => respuestaJson(200, tareaConId()))
    renderDetalle("estudiante")

    expect(await screen.findByRole("heading", { name: "Ensayo final" })).toBeInTheDocument()
    expect(screen.getByText("Tarea")).toBeInTheDocument()
    expect(screen.getByText("Luis Pérez")).toBeInTheDocument()
    expect(screen.getByRole("list", { name: "Archivos adjuntos" })).toHaveTextContent("guia.pdf")
    expect(screen.getByText("80")).toBeInTheDocument()
    expect(screen.getByText("Examen (40 %)")).toBeInTheDocument()
    expect(screen.getByText("Unidad 1")).toBeInTheDocument()
    expect(
      screen.getByText("No se aceptan entregas después de la fecha límite"),
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Tu trabajo" })).toBeInTheDocument()
    expect(
      screen.getByText(
        "Todavía no puedes entregar desde Campus Digital. Sigue las indicaciones de tu maestro para entregar esta tarea.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Editar tarea" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Borrar tarea" })).not.toBeInTheDocument()
  })

  it("PR-1D05: las instrucciones se muestran como texto plano", async () => {
    stubApi(() => respuestaJson(200, tareaConId()))
    renderDetalle("estudiante")

    const instrucciones = await screen.findByText(/Escribe dos páginas/)
    expect(instrucciones).toHaveTextContent("<b>Sin formato</b>")
    expect(instrucciones.querySelector("b")).toBeNull()
    expect(instrucciones.className).toContain("whitespace-pre-line")
  })

  it("PR-1D05: la rúbrica de solo lectura lista criterio y puntos con el total", async () => {
    stubApi(() => respuestaJson(200, tareaConId()))
    renderDetalle("estudiante")

    expect(await screen.findByRole("heading", { name: "Rúbrica" })).toBeInTheDocument()
    expect(screen.getByText("Claridad")).toBeInTheDocument()
    expect(screen.getByText("10 puntos")).toBeInTheDocument()
    expect(screen.getByText("Fuentes")).toBeInTheDocument()
    expect(screen.getByText("Total: 30 puntos")).toBeInTheDocument()
  })

  it("PR-1D05: la fecha límite lleva el texto de vencimiento", async () => {
    stubApi(() => respuestaJson(200, tareaConId({ fechaLimite: "2020-01-15T16:00:00.000Z" })))
    renderDetalle("estudiante")

    expect(await screen.findByText(/^Venció el /)).toBeInTheDocument()
  })

  it("PR-1D05: el maestro con puedeEditar y sin puedeBorrar ve «Editar tarea» y no «Borrar tarea»", async () => {
    stubApi(() => respuestaJson(200, tareaConId({ puedeEditar: true, puedeBorrar: false })))
    renderDetalle("maestro")

    const editar = await screen.findByRole("link", { name: "Editar tarea" })
    expect(editar).toHaveAttribute("href", `/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/editar`)
    expect(screen.queryByRole("button", { name: "Borrar tarea" })).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Tu trabajo" })).not.toBeInTheDocument()
  })

  it("PR-1D05: el admin con puedeBorrar y sin puedeEditar ve «Borrar tarea» y no «Editar tarea»", async () => {
    stubApi(() => respuestaJson(200, tareaConId({ puedeEditar: false, puedeBorrar: true })))
    renderDetalle("admin")

    expect(await screen.findByRole("button", { name: "Borrar tarea" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Editar tarea" })).not.toBeInTheDocument()
  })

  it("PR-1D05: sin ningún permiso el maestro no ve acciones", async () => {
    stubApi(() => respuestaJson(200, tareaConId()))
    renderDetalle("maestro")

    await screen.findByRole("heading", { name: "Ensayo final" })
    expect(screen.queryByRole("link", { name: "Editar tarea" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Borrar tarea" })).not.toBeInTheDocument()
  })

  it("PR-1D05: borrar pide confirmación en línea con el foco en «Cancelar», que vuelve a «Borrar tarea»", async () => {
    const { llamadas } = stubApi(() => respuestaJson(200, tareaConId({ puedeBorrar: true })))
    renderDetalle("maestro")

    fireEvent.click(await screen.findByRole("button", { name: "Borrar tarea" }))

    expect(screen.getByText("Se borrará con su rúbrica y sus adjuntos.")).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus())
    expect(screen.queryByRole("button", { name: "Borrar tarea" })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))

    await waitFor(() => expect(screen.getByRole("button", { name: "Borrar tarea" })).toHaveFocus())
    expect(screen.queryByText("Se borrará con su rúbrica y sus adjuntos.")).not.toBeInTheDocument()
    expect(llamadas.filter(({ metodo }) => metodo === "DELETE")).toHaveLength(0)
  })

  it("PR-1D05: confirmar borra con DELETE, avisa «Tarea borrada» y navega al muro", async () => {
    const { llamadas } = stubApi(() => respuestaJson(200, tareaConId({ puedeBorrar: true })))
    renderDetalle("maestro")
    fireEvent.click(await screen.findByRole("button", { name: "Borrar tarea" }))

    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar tarea" }))

    expect(await screen.findByText("Pantalla del muro")).toBeInTheDocument()
    expect(aviso.success).toHaveBeenCalledWith("Tarea borrada")
    expect(llamadas.filter(({ metodo }) => metodo === "DELETE").map(({ url }) => url)).toEqual([
      `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}`,
    ])
  })

  it("PR-1D05: si el borrado falla, avisa con el mensaje del servidor y no navega", async () => {
    stubApi(
      () => respuestaJson(200, tareaConId({ puedeBorrar: true })),
      () =>
        respuestaJson(403, {
          error: { codigo: "BORRADO_NO_PERMITIDO", mensaje: "No puedes borrar esta tarea." },
        }),
    )
    renderDetalle("maestro")
    fireEvent.click(await screen.findByRole("button", { name: "Borrar tarea" }))

    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar tarea" }))

    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith("No puedes borrar esta tarea."))
    expect(screen.queryByText("Pantalla del muro")).not.toBeInTheDocument()
  })

  it("PR-1D05: mientras carga muestra «Cargando la tarea…»", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() => new Promise<Response>(() => undefined)),
    )
    renderDetalle("estudiante")

    expect(screen.getByText("Cargando la tarea…")).toBeInTheDocument()
  })

  it("PR-1D05: un 404 dice «Esa tarea ya no existe.»", async () => {
    stubApi(() =>
      respuestaJson(404, { error: { codigo: "TAREA_NO_ENCONTRADA", mensaje: "No encontrada" } }),
    )
    renderDetalle("estudiante")

    expect(await screen.findByText("Esa tarea ya no existe.")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Ensayo final" })).not.toBeInTheDocument()
  })

  it("PR-1D05: un error de servidor muestra el aviso genérico", async () => {
    stubApi(() => respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } }))
    renderDetalle("estudiante")

    expect(await screen.findByText("Algo salió mal. Inténtalo de nuevo.")).toBeInTheDocument()
  })
})

const enfocadoFueraDeBody = () => {
  const activo = document.activeElement
  expect(activo).not.toBeNull()
  expect(activo).not.toBe(document.body)
  return activo as HTMLElement
}

// T-09: el foco no cae en <body> cuando una recarga quita el control que lo tenía.
describe("PR-1D05: el foco cuando una recarga quita el control enfocado (T-09)", () => {
  let tarea = tareaConId()
  const recargar = async (cliente: QueryClient) => {
    await act(() => cliente.invalidateQueries())
  }

  beforeEach(() => {
    tarea = tareaConId({ puedeEditar: false, puedeBorrar: true })
  })

  it("PR-1D05: puedeBorrar pasa a false con la confirmación abierta: el foco va a la raíz de la vista", async () => {
    stubApi(() => respuestaJson(200, tarea))
    const cliente = renderDetalle("maestro")
    fireEvent.click(await screen.findByRole("button", { name: "Borrar tarea" }))
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus())

    tarea = tareaConId({ puedeEditar: false, puedeBorrar: false })
    await recargar(cliente)

    await waitFor(() => expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull())
    const activo = enfocadoFueraDeBody()
    expect(activo).toContainElement(screen.getByRole("heading", { name: "Ensayo final" }))
  })

  it("PR-1D05: puedeEditar pasa a false con el foco en «Editar tarea»: el foco va a la raíz de la vista", async () => {
    tarea = tareaConId({ puedeEditar: true, puedeBorrar: false })
    stubApi(() => respuestaJson(200, tarea))
    const cliente = renderDetalle("maestro")
    const editar = await screen.findByRole("link", { name: "Editar tarea" })
    act(() => editar.focus())
    expect(editar).toHaveFocus()

    tarea = tareaConId({ puedeEditar: false, puedeBorrar: false })
    await recargar(cliente)

    await waitFor(() => expect(screen.queryByRole("link", { name: "Editar tarea" })).toBeNull())
    expect(enfocadoFueraDeBody()).toContainElement(
      screen.getByRole("heading", { name: "Ensayo final" }),
    )
  })

  it("PR-1D05: la tarea desaparece (404) con el foco en una acción: el foco va a la raíz y se dice que no existe", async () => {
    let existe = true
    stubApi(() =>
      existe
        ? respuestaJson(200, tarea)
        : respuestaJson(404, { error: { codigo: "TAREA_NO_ENCONTRADA", mensaje: "x" } }),
    )
    const cliente = renderDetalle("maestro")
    const borrar = await screen.findByRole("button", { name: "Borrar tarea" })
    act(() => borrar.focus())

    existe = false
    await recargar(cliente)

    expect(await screen.findByText("Esa tarea ya no existe.")).toBeInTheDocument()
    expect(enfocadoFueraDeBody()).toContainElement(screen.getByText("Esa tarea ya no existe."))
  })

  it("PR-1D05: un error de servidor en la recarga con la tarea en caché deja el detalle, avisa y no mueve el foco (M-01)", async () => {
    let falla = false
    stubApi(() =>
      falla
        ? respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } })
        : respuestaJson(200, tarea),
    )
    const cliente = renderDetalle("maestro")
    const borrar = await screen.findByRole("button", { name: "Borrar tarea" })
    act(() => borrar.focus())

    falla = true
    await recargar(cliente)

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(aviso.error).toHaveBeenCalledWith(
      "No pudimos actualizar la tarea. Mostramos la última versión que tenemos.",
    )
    expect(screen.getByRole("heading", { name: "Ensayo final" })).toBeInTheDocument()
    expect(screen.queryByText("Algo salió mal. Inténtalo de nuevo.")).not.toBeInTheDocument()
    expect(borrar).toHaveFocus()
  })

  it("PR-1D05: dos fallos seguidos con la tarea en caché avisan dos veces y el detalle sigue (M-01)", async () => {
    let falla = false
    stubApi(() =>
      falla
        ? respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } })
        : respuestaJson(200, tarea),
    )
    const cliente = renderDetalle("maestro")
    await screen.findByRole("button", { name: "Borrar tarea" })

    falla = true
    await recargar(cliente)
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await recargar(cliente)

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
    expect(screen.getByRole("heading", { name: "Ensayo final" })).toBeInTheDocument()
  })

  it("PR-1D05: tras un fallo, una recarga exitosa muestra la versión nueva del detalle (M-01)", async () => {
    let falla = false
    stubApi(() =>
      falla
        ? respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } })
        : respuestaJson(200, tarea),
    )
    const cliente = renderDetalle("maestro")
    await screen.findByRole("heading", { name: "Ensayo final" })
    falla = true
    await recargar(cliente)
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))

    falla = false
    tarea = tareaConId({ titulo: "Ensayo corregido", puedeEditar: false, puedeBorrar: true })
    await recargar(cliente)

    expect(await screen.findByRole("heading", { name: "Ensayo corregido" })).toBeInTheDocument()
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })

  it("PR-1D05: una recarga que no cambia nada deja el foco donde estaba", async () => {
    stubApi(() => respuestaJson(200, tarea))
    const cliente = renderDetalle("maestro")
    fireEvent.click(await screen.findByRole("button", { name: "Borrar tarea" }))
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus())

    await recargar(cliente)

    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus()
  })

  it("PR-1D05: quien soltó el foco con un clic fuera no lo recupera cuando una recarga cambia la vista", async () => {
    stubApi(() => respuestaJson(200, tarea))
    const cliente = renderDetalle("maestro")
    const borrar = await screen.findByRole("button", { name: "Borrar tarea" })
    act(() => borrar.focus())
    fireEvent.mouseDown(document.body)
    act(() => borrar.blur())

    tarea = tareaConId({ puedeEditar: false, puedeBorrar: false })
    await recargar(cliente)

    await waitFor(() => expect(screen.queryByRole("button", { name: "Borrar tarea" })).toBeNull())
    expect(document.activeElement).toBe(document.body)
  })

  it("PR-1D05: al cambiar de tarea (otro tareaId) con el foco en una acción, el foco va a la raíz mientras carga la nueva", async () => {
    const OTRA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d78"
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada) => {
        if (String(entrada).endsWith(OTRA_ID)) return new Promise<Response>(() => undefined)
        return Promise.resolve(respuestaJson(200, tarea))
      }),
    )
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const router = createMemoryRouter(
      [
        {
          path: "/maestro/clases/:claseId/tareas/:tareaId",
          element: <DetalleTareaView />,
        },
      ],
      { initialEntries: [`/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}`] },
    )
    render(
      <QueryClientProvider client={cliente}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    const borrar = await screen.findByRole("button", { name: "Borrar tarea" })
    act(() => borrar.focus())

    await act(() => router.navigate(`/maestro/clases/${CLASE_ID}/tareas/${OTRA_ID}`))

    expect(await screen.findByText("Cargando la tarea…")).toBeInTheDocument()
    expect(enfocadoFueraDeBody()).toContainElement(screen.getByText("Cargando la tarea…"))
  })

  it("PR-1D05: una respuesta sin `tarea` no se pinta como detalle: dice que algo salió mal", async () => {
    stubApi(() => respuestaJson(200, {}))
    renderDetalle("maestro")

    expect(await screen.findByText("Algo salió mal. Inténtalo de nuevo.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Borrar tarea" })).not.toBeInTheDocument()
  })
})

const errorDeApi = (estado: number, codigo: string, mensaje = "x") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const esperarUnTurno = () => act(() => new Promise<void>((resolver) => setTimeout(resolver, 5)))

const AVISO_DEL_DETALLE = "No pudimos actualizar la tarea. Mostramos la última versión que tenemos."

// T-11: lo que el servidor niega al borrar vuelve a pedir la tarea para que la vista reaccione.
describe("PR-1D05: borrar con la tarea en caché vieja (T-11)", () => {
  const abrirConfirmacion = async () => {
    fireEvent.click(await screen.findByRole("button", { name: "Borrar tarea" }))
    return screen.findByRole("button", { name: "Sí, borrar tarea" })
  }

  it("PR-1D05: un 404 al borrar vuelve a pedir la tarea, dice que ya no existe, lleva el foco a la raíz y marca viejos el muro y el trabajo", async () => {
    let existe = true
    const { llamadas } = stubApi(
      () =>
        existe
          ? respuestaJson(200, tareaConId({ puedeBorrar: true }))
          : errorDeApi(404, "TAREA_NO_ENCONTRADA"),
      () => {
        existe = false
        return errorDeApi(404, "TAREA_NO_ENCONTRADA")
      },
    )
    const cliente = renderDetalle("maestro")
    cliente.setQueryData(clavePublicaciones(CLASE_ID), { pages: [], pageParams: [] })
    fireEvent.click(await abrirConfirmacion())

    expect(await screen.findByText("Esa tarea ya no existe.")).toBeInTheDocument()
    expect(aviso.error).toHaveBeenCalledWith("Esa tarea ya no existe.")
    expect(llamadas.filter(({ metodo }) => metodo === "GET")).toHaveLength(2)
    expect(screen.queryByRole("button", { name: "Sí, borrar tarea" })).not.toBeInTheDocument()
    expect(cliente.getQueryState(clavePublicaciones(CLASE_ID))?.isInvalidated).toBe(true)
    expect(enfocadoFueraDeBody()).toContainElement(screen.getByText("Esa tarea ya no existe."))
  })

  it("PR-1D05: un 403 BORRADO_NO_PERMITIDO vuelve a pedir la tarea y, con puedeBorrar en false, la vista deja de ofrecer borrar y el foco va a la raíz", async () => {
    let permitido = true
    const { llamadas } = stubApi(
      () => respuestaJson(200, tareaConId({ puedeBorrar: permitido })),
      () => {
        permitido = false
        return errorDeApi(403, "BORRADO_NO_PERMITIDO", "Ya no puedes borrar esta tarea.")
      },
    )
    const cliente = renderDetalle("maestro")
    cliente.setQueryData(clavePublicaciones(CLASE_ID), { pages: [], pageParams: [] })
    fireEvent.click(await abrirConfirmacion())

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Sí, borrar tarea" })).not.toBeInTheDocument(),
    )
    expect(aviso.error).toHaveBeenCalledWith("Ya no puedes borrar esta tarea.")
    expect(screen.queryByRole("button", { name: "Borrar tarea" })).not.toBeInTheDocument()
    expect(llamadas.filter(({ metodo }) => metodo === "GET")).toHaveLength(2)
    expect(cliente.getQueryState(clavePublicaciones(CLASE_ID))?.isInvalidated).toBe(false)
    expect(enfocadoFueraDeBody()).toContainElement(
      screen.getByRole("heading", { name: "Ensayo final" }),
    )
  })

  it("PR-1D05: un 403 SIN_ACCESO_A_LA_CLASE al borrar vuelve a pedir la tarea y la vista dice que ya no hay acceso", async () => {
    let acceso = true
    stubApi(
      () =>
        acceso
          ? respuestaJson(200, tareaConId({ puedeBorrar: true }))
          : errorDeApi(403, "SIN_ACCESO_A_LA_CLASE"),
      () => {
        acceso = false
        return errorDeApi(403, "SIN_ACCESO_A_LA_CLASE")
      },
    )
    renderDetalle("maestro")
    fireEvent.click(await abrirConfirmacion())

    expect(await screen.findByText("No tienes acceso a esta clase.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Sí, borrar tarea" })).not.toBeInTheDocument()
    expect(aviso.error).toHaveBeenCalledWith("No tienes acceso a esta clase.")
  })

  it("PR-1D05: un fallo que no dice que la tarea cambió (500 al borrar) no vuelve a pedirla y deja la confirmación", async () => {
    const { llamadas } = stubApi(
      () => respuestaJson(200, tareaConId({ puedeBorrar: true })),
      () => errorDeApi(500, "ERROR_INTERNO"),
    )
    renderDetalle("maestro")
    fireEvent.click(await abrirConfirmacion())

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(llamadas.filter(({ metodo }) => metodo === "GET")).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Sí, borrar tarea" })).toBeInTheDocument()
  })
})

// T-12: el aviso de una recarga fallida es por fallo nuevo, no por montar la vista con el error en caché.
describe("PR-1D05: el aviso de una recarga fallida solo sale por un fallo nuevo (T-12)", () => {
  const rutas = (cliente: QueryClient) => {
    const router = createMemoryRouter(
      [
        { path: "/maestro/clases/:claseId/tareas/:tareaId", element: <DetalleTareaView /> },
        { path: "/maestro/clases/:claseId/tareas/:tareaId/editar", element: <p>Otra pantalla</p> },
      ],
      { initialEntries: [`/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}`] },
    )
    render(
      <QueryClientProvider client={cliente}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    return router
  }

  it("PR-1D05: volver al detalle con el error ya avisado en caché no avisa otra vez", async () => {
    let respuestas = 0
    stubApi(() => {
      respuestas += 1
      return respuestas === 2
        ? errorDeApi(500, "ERROR_INTERNO")
        : respuestaJson(200, tareaConId({ puedeBorrar: true }))
    })
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const router = rutas(cliente)
    await screen.findByRole("button", { name: "Borrar tarea" })
    await act(() => cliente.invalidateQueries())
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))

    await act(() => router.navigate(`/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/editar`))
    expect(await screen.findByText("Otra pantalla")).toBeInTheDocument()
    await act(() => router.navigate(`/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}`))
    await screen.findByRole("button", { name: "Borrar tarea" })
    await waitFor(() => expect(cliente.isFetching()).toBe(0))

    expect(aviso.error.mock.calls).toEqual([[AVISO_DEL_DETALLE]])
  })

  it("PR-1D05: con StrictMode (efectos dos veces) un fallo avisa una sola vez", async () => {
    let respuestas = 0
    stubApi(() => {
      respuestas += 1
      return respuestas === 2
        ? errorDeApi(500, "ERROR_INTERNO")
        : respuestaJson(200, tareaConId({ puedeBorrar: true }))
    })
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <StrictMode>
        <QueryClientProvider client={cliente}>
          <MemoryRouter initialEntries={[`/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}`]}>
            <Routes>
              <Route
                path="/maestro/clases/:claseId/tareas/:tareaId"
                element={<DetalleTareaView />}
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </StrictMode>,
    )
    await screen.findByRole("button", { name: "Borrar tarea" })
    const antes = respuestas

    await act(() => cliente.invalidateQueries())
    await waitFor(() => expect(aviso.error).toHaveBeenCalled())
    await esperarUnTurno()

    expect(respuestas).toBeGreaterThan(antes)
    expect(aviso.error.mock.calls).toEqual([[AVISO_DEL_DETALLE]])
  })

  it("PR-1D05: un fallo, una recarga exitosa y otro fallo avisan dos veces", async () => {
    let respuestas = 0
    stubApi(() => {
      respuestas += 1
      return respuestas === 2 || respuestas === 4
        ? errorDeApi(500, "ERROR_INTERNO")
        : respuestaJson(200, tareaConId({ puedeBorrar: true }))
    })
    const cliente = renderDetalle("maestro")
    await screen.findByRole("button", { name: "Borrar tarea" })

    await act(() => cliente.invalidateQueries())
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await act(() => cliente.invalidateQueries())
    await waitFor(() => expect(respuestas).toBe(3))
    await act(() => cliente.invalidateQueries())

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
  })
})

// T-13: el aviso o la vista dependen de qué falló.
describe("PR-1D05: qué dice la vista según el error de la recarga (T-13)", () => {
  const conFalloEnLaRecarga = async (fallo: () => Response) => {
    let falla = false
    stubApi(() => (falla ? fallo() : respuestaJson(200, tareaConId({ puedeBorrar: true }))))
    const cliente = renderDetalle("maestro")
    const borrar = await screen.findByRole("button", { name: "Borrar tarea" })
    act(() => borrar.focus())
    falla = true
    await act(() => cliente.invalidateQueries())
    return borrar
  }

  it("PR-1D05: un 403 SIN_ACCESO_A_LA_CLASE reemplaza el detalle por «No tienes acceso a esta clase.», sin ofrecer acciones y con el foco en la raíz", async () => {
    await conFalloEnLaRecarga(() => errorDeApi(403, "SIN_ACCESO_A_LA_CLASE"))

    expect(await screen.findByText("No tienes acceso a esta clase.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Borrar tarea" })).not.toBeInTheDocument()
    expect(aviso.error).not.toHaveBeenCalled()
    expect(enfocadoFueraDeBody()).toContainElement(
      screen.getByText("No tienes acceso a esta clase."),
    )
  })

  it.each([
    ["tareaId: Identificador no válido", "Esa tarea ya no existe."],
    ["claseId: Identificador no válido", "No tienes acceso a esta clase."],
  ])(
    "PR-1D05: un VALIDACION «%s» en la recarga se trata como 404 o como pérdida de acceso",
    async (mensaje, texto) => {
      await conFalloEnLaRecarga(() => errorDeApi(400, "VALIDACION", mensaje))

      expect(await screen.findByText(texto)).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Borrar tarea" })).not.toBeInTheDocument()
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )

  it("PR-1D05: un VALIDACION de otro campo en la recarga deja el detalle y solo avisa", async () => {
    await conFalloEnLaRecarga(() => errorDeApi(400, "VALIDACION", "cursor: No es válido"))

    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(AVISO_DEL_DETALLE))
    expect(screen.getByRole("button", { name: "Borrar tarea" })).toBeInTheDocument()
  })

  it("PR-1D05: un 429 en la recarga deja el detalle y avisa con la última versión que se tiene", async () => {
    const borrar = await conFalloEnLaRecarga(() => errorDeApi(429, "DEMASIADAS_SOLICITUDES"))

    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(AVISO_DEL_DETALLE))
    expect(borrar).toHaveFocus()
  })

  it("PR-1D05: sin conexión en la recarga deja el detalle y avisa con la última versión que se tiene", async () => {
    let falla = false
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() =>
        falla
          ? Promise.reject(new TypeError("Failed to fetch"))
          : Promise.resolve(respuestaJson(200, tareaConId({ puedeBorrar: true }))),
      ),
    )
    const cliente = renderDetalle("maestro")
    await screen.findByRole("button", { name: "Borrar tarea" })
    falla = true

    await act(() => cliente.invalidateQueries())

    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(AVISO_DEL_DETALLE))
    expect(screen.getByRole("button", { name: "Borrar tarea" })).toBeInTheDocument()
  })
})

// T-14: el foco solo se recupera cuando el control que lo tenía desaparece, con el criterio de CLASES-02.
describe("PR-1D05: el foco se recupera solo si el control desaparece (T-14)", () => {
  let tarea = tareaConId()
  const recargar = (cliente: QueryClient) => act(() => cliente.invalidateQueries())

  beforeEach(() => {
    tarea = tareaConId({ puedeEditar: false, puedeBorrar: true })
  })

  const abrirConFoco = async () => {
    stubApi(() => respuestaJson(200, tarea))
    const cliente = renderDetalle("maestro")
    const borrar = await screen.findByRole("button", { name: "Borrar tarea" })
    act(() => borrar.focus())
    return { cliente, borrar }
  }

  const quitarElBoton = async (cliente: QueryClient) => {
    tarea = tareaConId({ puedeEditar: false, puedeBorrar: false })
    await recargar(cliente)
    await waitFor(() => expect(screen.queryByRole("button", { name: "Borrar tarea" })).toBeNull())
  }

  it("PR-1D05: la primera carga, con el foco en <body>, no lo mueve", async () => {
    stubApi(() => respuestaJson(200, tarea))
    renderDetalle("maestro")

    await screen.findByRole("button", { name: "Borrar tarea" })

    expect(document.activeElement).toBe(document.body)
  })

  it("PR-1D05: un clic en un espacio en blanco de la vista suelta el foco: una recarga que quita el control después no lo recupera", async () => {
    const { cliente, borrar } = await abrirConFoco()
    fireEvent.mouseDown(screen.getByText(/Escribe dos páginas/))
    act(() => borrar.blur())
    await esperarUnTurno()

    await quitarElBoton(cliente)

    expect(document.activeElement).toBe(document.body)
  })

  it("PR-1D05: un clic en blanco y una recarga sin cambios dejan el foco en <body>", async () => {
    const { cliente, borrar } = await abrirConFoco()
    fireEvent.mouseDown(screen.getByText(/Escribe dos páginas/))
    act(() => borrar.blur())
    await esperarUnTurno()

    await recargar(cliente)

    expect(document.activeElement).toBe(document.body)
  })

  it("PR-1D05: al cambiar de pestaña (focusout sin destino y blur de la ventana) la memoria se conserva y la recarga que quita el control lleva el foco a la raíz", async () => {
    const { cliente, borrar } = await abrirConFoco()
    fireEvent.focusOut(borrar)
    window.dispatchEvent(new Event("blur"))
    await esperarUnTurno()

    await quitarElBoton(cliente)

    expect(enfocadoFueraDeBody()).toContainElement(
      screen.getByRole("heading", { name: "Ensayo final" }),
    )
    window.dispatchEvent(new Event("focus"))
  })

  it("PR-1D05: un focusout sin destino con el control todavía enfocado (el aviso de la ventana llega después) conserva la memoria", async () => {
    const { cliente, borrar } = await abrirConFoco()
    fireEvent.focusOut(borrar)
    await esperarUnTurno()
    window.dispatchEvent(new Event("blur"))

    await quitarElBoton(cliente)

    expect(enfocadoFueraDeBody()).toContainElement(
      screen.getByRole("heading", { name: "Ensayo final" }),
    )
    window.dispatchEvent(new Event("focus"))
  })

  it("PR-1D05: al ocultarse la página (visibilitychange) antes del focusout, la memoria se conserva", async () => {
    const { cliente, borrar } = await abrirConFoco()
    const oculta = vi.spyOn(document, "hidden", "get").mockReturnValue(true)
    document.dispatchEvent(new Event("visibilitychange"))
    fireEvent.focusOut(borrar)
    await esperarUnTurno()
    oculta.mockRestore()

    await quitarElBoton(cliente)

    expect(enfocadoFueraDeBody()).toContainElement(
      screen.getByRole("heading", { name: "Ensayo final" }),
    )
    document.dispatchEvent(new Event("visibilitychange"))
  })

  it("PR-1D05: pasar el foco a otro control de la vista y quitar el primero no mueve el foco", async () => {
    tarea = tareaConId({ puedeEditar: true, puedeBorrar: true })
    stubApi(() => respuestaJson(200, tarea))
    const cliente = renderDetalle("maestro")
    const borrar = await screen.findByRole("button", { name: "Borrar tarea" })
    act(() => borrar.focus())
    act(() => screen.getByRole("link", { name: "Editar tarea" }).focus())

    tarea = tareaConId({ puedeEditar: true, puedeBorrar: false })
    await recargar(cliente)
    await waitFor(() => expect(screen.queryByRole("button", { name: "Borrar tarea" })).toBeNull())

    expect(screen.getByRole("link", { name: "Editar tarea" })).toHaveFocus()
  })
})

// T-15: la misma clave de foco que la edición (claveDeFocoDeLaTarea), que ahora incluye el contador de
// errores.
describe("PR-1D05: el foco tras dos fallos seguidos de distinto tipo (T-15)", () => {
  const recargar = async (cliente: QueryClient) => {
    await act(() => cliente.invalidateQueries())
    await waitFor(() => expect(cliente.isFetching()).toBe(0))
  }

  it("PR-1D05: con los dos fallos en el mismo milisegundo (500 y luego 403 SIN_ACCESO_A_LA_CLASE), el foco va a la raíz y no a <body>", async () => {
    let lecturas = 0
    stubApi(() => {
      lecturas += 1
      if (lecturas === 2) return errorDeApi(500, "ERROR_INTERNO")
      if (lecturas >= 3) return errorDeApi(403, "SIN_ACCESO_A_LA_CLASE")
      return respuestaJson(200, tareaConId({ puedeBorrar: true }))
    })
    const cliente = renderDetalle("maestro")
    const borrar = await screen.findByRole("button", { name: "Borrar tarea" })
    act(() => borrar.focus())
    const ahora = vi.spyOn(Date, "now").mockReturnValue(Date.now())

    await recargar(cliente)
    expect(borrar).toHaveFocus()
    await recargar(cliente)
    ahora.mockRestore()

    expect(await screen.findByText("No tienes acceso a esta clase.")).toBeInTheDocument()
    expect(enfocadoFueraDeBody()).toContainElement(
      screen.getByText("No tienes acceso a esta clase."),
    )
  })

  it("PR-1D05: quien soltó el foco con un clic en blanco no lo recupera cuando un 500 va seguido de un 404 (T-14 sigue valiendo)", async () => {
    let lecturas = 0
    stubApi(() => {
      lecturas += 1
      if (lecturas === 2) return errorDeApi(500, "ERROR_INTERNO")
      if (lecturas >= 3) return errorDeApi(404, "TAREA_NO_ENCONTRADA")
      return respuestaJson(200, tareaConId({ puedeBorrar: true }))
    })
    const cliente = renderDetalle("maestro")
    const borrar = await screen.findByRole("button", { name: "Borrar tarea" })
    act(() => borrar.focus())
    fireEvent.mouseDown(screen.getByText(/Escribe dos páginas/))
    act(() => borrar.blur())
    await esperarUnTurno()

    await recargar(cliente)
    await recargar(cliente)

    expect(await screen.findByText("Esa tarea ya no existe.")).toBeInTheDocument()
    expect(document.activeElement).toBe(document.body)
  })
})
