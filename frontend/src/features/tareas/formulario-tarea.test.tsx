import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { CrearTareaView } from "./crear-tarea-view"

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const CATEGORIA_ID = "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d41"
const TEMA_ID = "5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d51"
const ORIGEN_ALMACEN = "https://almacen.ejemplo.mx"
const FECHA_LOCAL = "2030-01-15T10:00"

const categoria = { id: CATEGORIA_ID, nombre: "Examen", peso: 40, tareas: 1 }
const tema = { id: TEMA_ID, nombre: "Unidad 1", orden: 0, elementos: 2 }

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const tareaCreada = () => ({
  tarea: {
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
  },
})

interface Llamada {
  metodo: string
  url: string
  cuerpo: unknown
}

interface Opciones {
  categorias?: (typeof categoria)[]
  // T-08: lo que responde cada petición de la lista, para cambiarla entre una y otra.
  categoriasAhora?: () => (typeof categoria)[]
  temasAhora?: () => (typeof tema)[]
  temas?: (typeof tema)[]
  alCrear?: () => Promise<Response>
  fallaLaSubida?: boolean
}

const stubApi = ({
  categorias = [],
  temas = [],
  categoriasAhora = () => categorias,
  temasAhora = () => temas,
  alCrear = () => Promise.resolve(respuestaJson(201, tareaCreada())),
  fallaLaSubida = false,
}: Opciones = {}) => {
  const llamadas: Llamada[] = []
  let solicitudes = 0
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const url = String(entrada)
    const metodo = init?.method ?? "GET"
    const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : init?.body
    llamadas.push({ metodo, url, cuerpo })
    if (url.startsWith(ORIGEN_ALMACEN)) {
      return Promise.resolve(new Response(null, { status: fallaLaSubida ? 500 : 200 }))
    }
    if (url.endsWith("/categorias"))
      return Promise.resolve(respuestaJson(200, { categorias: categoriasAhora() }))
    if (url.endsWith("/temas"))
      return Promise.resolve(respuestaJson(200, { temas: temasAhora(), sinTema: 0 }))
    if (url.endsWith("/archivos")) {
      solicitudes += 1
      const { nombre, tipo, tamano } = cuerpo as { nombre: string; tipo: string; tamano: number }
      return Promise.resolve(
        respuestaJson(201, {
          archivo: {
            id: `9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d${String(10 + solicitudes)}`,
            nombre,
            tipo,
            tamano,
          },
          subida: {
            url: `${ORIGEN_ALMACEN}/subida/${String(solicitudes)}`,
            metodo: "PUT",
            cabeceras: { "Content-Type": tipo },
            expiraEn: "2026-10-06T15:35:00.000Z",
          },
        }),
      )
    }
    return alCrear()
  })
  vi.stubGlobal("fetch", fetchMock)
  return { llamadas }
}

const creaciones = (llamadas: Llamada[]) =>
  llamadas.filter(({ metodo, url }) => metodo === "POST" && url.endsWith("/tareas"))

const renderCrear = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/maestro/clases/${CLASE_ID}/tareas/nueva`]}>
        <Routes>
          <Route path="/maestro/clases/:claseId/tareas/nueva" element={<CrearTareaView />} />
          <Route
            path="/maestro/clases/:claseId/tareas/:tareaId"
            element={<p>Pantalla del detalle</p>}
          />
          <Route path="/maestro/clases/:claseId" element={<p>Pantalla del muro</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const esperarFormulario = () => screen.findByLabelText("Título")

const llenarLoMinimo = () => {
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Ensayo" } })
  fireEvent.change(screen.getByLabelText("Fecha límite"), { target: { value: FECHA_LOCAL } })
}

const enviar = () => fireEvent.click(screen.getByRole("button", { name: "Publicar tarea" }))

const archivoDe = (nombre: string, tipo: string) => new File(["x"], nombre, { type: tipo })

const elegirArchivos = (...archivos: File[]) =>
  fireEvent.change(screen.getByLabelText("Adjuntar archivos"), { target: { files: archivos } })

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

describe("PR-1D03: formulario de tarea al crear", () => {
  it("PR-1D03: enviar vacío muestra los errores del cliente con ErrorDeCampo y no hace ninguna petición", async () => {
    const { llamadas } = stubApi()
    renderCrear()
    await esperarFormulario()

    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "   " } })
    fireEvent.change(screen.getByLabelText("Puntos"), { target: { value: "10,5" } })
    enviar()

    expect(screen.getByText("Escribe el título de la tarea")).toBeInTheDocument()
    expect(screen.getByText("Elige la fecha límite")).toBeInTheDocument()
    expect(
      screen.getByText("Los puntos deben ser un número entero de 1 a 1000"),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Título")).toHaveAttribute("aria-invalid", "true")
    expect(creaciones(llamadas)).toHaveLength(0)
  })

  it("PR-1D03: un error de campo del servidor se muestra bajo el campo y no como aviso", async () => {
    stubApi({
      alCrear: () =>
        Promise.resolve(
          respuestaJson(400, {
            error: { codigo: "FECHA_LIMITE_INVALIDA", mensaje: "La fecha límite no es válida" },
          }),
        ),
    })
    renderCrear()
    await esperarFormulario()
    llenarLoMinimo()

    enviar()

    expect(
      await screen.findByText("Elige una fecha límite futura, dentro del próximo año."),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Fecha límite")).toHaveAttribute("aria-invalid", "true")
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("PR-1D03: un error que no es de un campo se avisa con un toast y no marca ningún campo", async () => {
    stubApi({
      alCrear: () =>
        Promise.resolve(
          respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "Fallo interno" } }),
        ),
    })
    renderCrear()
    await esperarFormulario()
    llenarLoMinimo()

    enviar()

    await waitFor(() =>
      expect(aviso.error).toHaveBeenCalledWith("Algo salió mal. Inténtalo de nuevo."),
    )
    expect(screen.getByLabelText("Título")).toHaveAttribute("aria-invalid", "false")
  })

  it("PR-1D03: sin categorías en la clase, «Sin categoría» es la única opción", async () => {
    stubApi({ categorias: [] })
    renderCrear()
    await esperarFormulario()

    const selector = screen.getByLabelText("Categoría")
    expect(Array.from(selector.querySelectorAll("option")).map((o) => o.textContent)).toEqual([
      "Sin categoría",
    ])
  })

  it("PR-1D03: con categorías, la opción inicial es «Elige una categoría» y enviar sin elegir no hace ninguna petición", async () => {
    const { llamadas } = stubApi({ categorias: [categoria] })
    renderCrear()
    await esperarFormulario()

    const selector = screen.getByLabelText("Categoría")
    expect(Array.from(selector.querySelectorAll("option")).map((o) => o.textContent)).toEqual([
      "Elige una categoría",
      "Examen (40 %)",
    ])
    expect(selector).toHaveValue("")
    expect(screen.queryByRole("option", { name: "Sin categoría" })).not.toBeInTheDocument()
    llenarLoMinimo()

    enviar()

    expect(screen.getByText("Elige la categoría de la tarea.")).toBeInTheDocument()
    expect(selector).toHaveAttribute("aria-invalid", "true")
    expect(creaciones(llamadas)).toHaveLength(0)
  })

  it("PR-1D03: el cuerpo lleva la categoría y el tema elegidos, y la fecha en UTC", async () => {
    const { llamadas } = stubApi({ categorias: [categoria], temas: [tema] })
    renderCrear()
    await esperarFormulario()
    llenarLoMinimo()
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: CATEGORIA_ID } })
    fireEvent.change(screen.getByLabelText("Tema"), { target: { value: TEMA_ID } })

    enviar()

    await waitFor(() => expect(creaciones(llamadas)).toHaveLength(1))
    expect(creaciones(llamadas)[0]?.cuerpo).toMatchObject({
      titulo: "Ensayo",
      fechaLimite: new Date(FECHA_LOCAL).toISOString(),
      puntos: 100,
      aceptaTardias: true,
      categoriaId: CATEGORIA_ID,
      temaId: TEMA_ID,
      rubrica: [],
      archivoIds: [],
    })
  })

  it("PR-1D03: el control de entregas tardías usa aria-pressed y cambia el cuerpo", async () => {
    const { llamadas } = stubApi()
    renderCrear()
    await esperarFormulario()
    const grupo = screen.getByRole("group", { name: "Entregas después de la fecha límite" })
    const aceptar = screen.getByRole("button", { name: "Aceptar con retraso" })
    const noAceptar = screen.getByRole("button", { name: "No aceptar" })
    expect(grupo).toContainElement(aceptar)
    expect(aceptar).toHaveAttribute("aria-pressed", "true")
    expect(noAceptar).toHaveAttribute("aria-pressed", "false")

    fireEvent.click(noAceptar)

    expect(screen.getByRole("button", { name: "Aceptar con retraso" })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
    expect(screen.getByRole("button", { name: "No aceptar" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    llenarLoMinimo()
    enviar()
    await waitFor(() => expect(creaciones(llamadas)).toHaveLength(1))
    expect(creaciones(llamadas)[0]?.cuerpo).toMatchObject({ aceptaTardias: false })
  })

  it("PR-1D03: agregar y quitar criterios mueve el foco como pide §7.14 y muestra el total en vivo", async () => {
    stubApi()
    renderCrear()
    await esperarFormulario()
    const agregar = screen.getByRole("button", { name: "Agregar criterio" })

    fireEvent.click(agregar)
    await waitFor(() => expect(screen.getByLabelText("Criterio 1")).toHaveFocus())
    fireEvent.click(agregar)
    await waitFor(() => expect(screen.getByLabelText("Criterio 2")).toHaveFocus())
    fireEvent.change(screen.getByLabelText("Puntos máximos 1"), { target: { value: "10" } })
    fireEvent.change(screen.getByLabelText("Puntos máximos 2"), { target: { value: "20" } })
    expect(
      screen.getByText(
        "La rúbrica suma 30 puntos. La calificación se escala a los 100 puntos de la tarea.",
      ),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Quitar criterio 1" }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Quitar criterio 1" })).toHaveFocus(),
    )
    expect(screen.queryByLabelText("Criterio 2")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Puntos máximos 1")).toHaveValue(20)

    fireEvent.click(screen.getByRole("button", { name: "Quitar criterio 1" }))
    await waitFor(() => expect(agregar).toHaveFocus())
  })

  it("PR-1D03: el error de un criterio se muestra en su fila", async () => {
    const { llamadas } = stubApi()
    renderCrear()
    await esperarFormulario()
    llenarLoMinimo()
    fireEvent.click(screen.getByRole("button", { name: "Agregar criterio" }))

    enviar()

    expect(screen.getByText("Escribe el criterio")).toBeInTheDocument()
    expect(screen.getByLabelText("Criterio 1")).toHaveAttribute("aria-invalid", "true")
    expect(creaciones(llamadas)).toHaveLength(0)
  })

  it("PR-1D03: sube los archivos antes de publicar y publica con sus ids en orden", async () => {
    const { llamadas } = stubApi()
    renderCrear()
    await esperarFormulario()
    llenarLoMinimo()
    elegirArchivos(archivoDe("a.pdf", "application/pdf"), archivoDe("b.png", "image/png"))

    enviar()

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Tarea publicada"))
    expect(
      llamadas
        .filter(({ url }) => !url.endsWith("/categorias") && !url.endsWith("/temas"))
        .map(({ metodo, url }) => `${metodo} ${url.replace(ORIGEN_ALMACEN, "almacen")}`),
    ).toEqual([
      `POST /api/clases/${CLASE_ID}/archivos`,
      "PUT almacen/subida/1",
      `POST /api/clases/${CLASE_ID}/archivos`,
      "PUT almacen/subida/2",
      `POST /api/clases/${CLASE_ID}/tareas`,
    ])
    expect(creaciones(llamadas)[0]?.cuerpo).toMatchObject({
      archivoIds: ["9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11", "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d12"],
    })
  })

  it("PR-1D03: si falla la subida de un archivo, el aviso lo nombra y no se publica", async () => {
    const { llamadas } = stubApi({ fallaLaSubida: true })
    renderCrear()
    await esperarFormulario()
    llenarLoMinimo()
    elegirArchivos(archivoDe("informe.pdf", "application/pdf"))

    enviar()

    await waitFor(() =>
      expect(aviso.error).toHaveBeenCalledWith(
        "No pudimos subir «informe.pdf». Inténtalo de nuevo.",
      ),
    )
    expect(creaciones(llamadas)).toHaveLength(0)
    expect(aviso.success).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Publicar tarea" })).not.toHaveAttribute("aria-busy")
  })

  it("PR-1D03: quitar un archivo elegido lleva el foco al vecino y, sin archivos, a «Adjuntar archivos»", async () => {
    stubApi()
    renderCrear()
    await esperarFormulario()
    elegirArchivos(archivoDe("a.pdf", "application/pdf"), archivoDe("b.pdf", "application/pdf"))

    fireEvent.click(screen.getByRole("button", { name: "Quitar a.pdf" }))
    await waitFor(() => expect(screen.getByRole("button", { name: "Quitar b.pdf" })).toHaveFocus())

    fireEvent.click(screen.getByRole("button", { name: "Quitar b.pdf" }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Adjuntar archivos" })).toHaveFocus(),
    )
  })

  it("PR-1D03: el botón queda en espera y un segundo clic no envía dos veces", async () => {
    let resolver: (respuesta: Response) => void = () => undefined
    const { llamadas } = stubApi({
      alCrear: () =>
        new Promise<Response>((resolve) => {
          resolver = resolve
        }),
    })
    renderCrear()
    await esperarFormulario()
    llenarLoMinimo()

    enviar()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Publicar tarea" })).toHaveAttribute(
        "aria-busy",
        "true",
      ),
    )
    enviar()
    enviar()

    expect(creaciones(llamadas)).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Publicar tarea" })).not.toBeDisabled()
    resolver(respuestaJson(201, tareaCreada()))
    expect(await screen.findByText("Pantalla del detalle")).toBeInTheDocument()
  })

  it("PR-1D03: todos los campos llevan autoComplete off", async () => {
    stubApi({ categorias: [categoria], temas: [tema] })
    renderCrear()
    await esperarFormulario()
    fireEvent.click(screen.getByRole("button", { name: "Agregar criterio" }))

    const campos = [
      ...document.querySelectorAll<HTMLElement>("input:not([type=file]), textarea, select"),
    ]
    expect(campos.length).toBeGreaterThanOrEqual(8)
    for (const campo of campos) expect(campo).toHaveAttribute("autocomplete", "off")
  })

  it("PR-1D03: al terminar avisa «Tarea publicada» y navega al detalle de la tarea nueva", async () => {
    stubApi()
    renderCrear()
    await esperarFormulario()
    llenarLoMinimo()

    enviar()

    expect(await screen.findByText("Pantalla del detalle")).toBeInTheDocument()
    expect(aviso.success).toHaveBeenCalledWith("Tarea publicada")
  })

  it("PR-1D03: «Cancelar» es un enlace al muro de la clase", async () => {
    stubApi()
    renderCrear()
    await esperarFormulario()

    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      `/maestro/clases/${CLASE_ID}`,
    )
  })

  it("PR-1D03: si no cargan las categorías o los temas, dice que no pudo y no muestra el formulario", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } })),
      ),
    )
    renderCrear()

    expect(
      await screen.findByText(
        "No pudimos cargar las categorías y los temas. Revisa tu conexión e inténtalo de nuevo.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument()
  })
})

const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const campoCriterio = (n: number) => screen.getByLabelText(new RegExp(`^Criterio\\s+${String(n)}$`))
const campoPuntosMax = (n: number) =>
  screen.getByLabelText(new RegExp(`^Puntos máximos\\s+${String(n)}$`))
const quitarCriterio = (n: number) =>
  fireEvent.click(
    screen.getByRole("button", { name: new RegExp(`^Quitar criterio\\s+${String(n)}$`) }),
  )
const agregarCriterio = () =>
  fireEvent.click(screen.getByRole("button", { name: "Agregar criterio" }))

// T-06: cada fila de la rúbrica es la dueña de sus errores.
describe("PR-1D03: los errores de la rúbrica viajan con su fila (T-06)", () => {
  const prepararFilas = async (filas: { criterio: string; puntos: string }[]) => {
    stubApi()
    renderCrear()
    await esperarFormulario()
    llenarLoMinimo()
    for (const [indice, fila] of filas.entries()) {
      agregarCriterio()
      fireEvent.change(campoCriterio(indice + 1), { target: { value: fila.criterio } })
      fireEvent.change(campoPuntosMax(indice + 1), { target: { value: fila.puntos } })
    }
  }

  it("PR-1D03: quitar la fila con error deja sin error a la fila válida que ocupa su lugar", async () => {
    await prepararFilas([
      { criterio: "", puntos: "10" },
      { criterio: "Ortografía", puntos: "5" },
    ])
    enviar()
    expect(campoCriterio(1)).toHaveAttribute("aria-invalid", "true")

    quitarCriterio(1)

    expect(campoCriterio(1)).toHaveValue("Ortografía")
    expect(campoCriterio(1)).toHaveAttribute("aria-invalid", "false")
    expect(screen.queryByText("Escribe el criterio")).not.toBeInTheDocument()
  })

  it("PR-1D03: quitar una fila válida anterior conserva el error de la inválida, que sube de lugar", async () => {
    await prepararFilas([
      { criterio: "Claridad", puntos: "10" },
      { criterio: "", puntos: "5" },
    ])
    enviar()
    expect(campoCriterio(2)).toHaveAttribute("aria-invalid", "true")

    quitarCriterio(1)

    expect(campoCriterio(1)).toHaveValue("")
    expect(campoCriterio(1)).toHaveAttribute("aria-invalid", "true")
    expect(screen.getAllByText("Escribe el criterio")).toHaveLength(1)
  })

  it("PR-1D03: «Puntos máximos» sigue a su fila al quitar la primera, una del medio y la última", async () => {
    await prepararFilas([
      { criterio: "A", puntos: "10" },
      { criterio: "B", puntos: "x" },
      { criterio: "C", puntos: "5" },
    ])
    enviar()
    expect(campoPuntosMax(2)).toHaveAttribute("aria-invalid", "true")
    expect(campoPuntosMax(1)).toHaveAttribute("aria-invalid", "false")
    expect(campoPuntosMax(3)).toHaveAttribute("aria-invalid", "false")

    quitarCriterio(1)
    expect(campoCriterio(1)).toHaveValue("B")
    expect(campoPuntosMax(1)).toHaveAttribute("aria-invalid", "true")
    expect(campoPuntosMax(2)).toHaveAttribute("aria-invalid", "false")

    quitarCriterio(2)
    expect(campoCriterio(1)).toHaveValue("B")
    expect(campoPuntosMax(1)).toHaveAttribute("aria-invalid", "true")

    agregarCriterio()
    expect(campoPuntosMax(2)).toHaveAttribute("aria-invalid", "false")
    quitarCriterio(1)
    expect(campoPuntosMax(1)).toHaveAttribute("aria-invalid", "false")
    expect(
      screen.queryByText("Los puntos máximos deben ser un número entero de 1 a 1000"),
    ).not.toBeInTheDocument()
  })

  it("PR-1D03: quitar y volver a agregar una fila no le devuelve el error de la que se quitó", async () => {
    await prepararFilas([{ criterio: "", puntos: "10" }])
    enviar()
    expect(campoCriterio(1)).toHaveAttribute("aria-invalid", "true")

    quitarCriterio(1)
    agregarCriterio()

    expect(campoCriterio(1)).toHaveAttribute("aria-invalid", "false")
  })

  it("PR-1D03: tras quitar una fila, el foco va a «Quitar criterio» de la fila vecina correcta", async () => {
    await prepararFilas([
      { criterio: "A", puntos: "1" },
      { criterio: "B", puntos: "2" },
      { criterio: "C", puntos: "3" },
    ])

    quitarCriterio(2)
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Quitar criterio 2" })).toHaveFocus(),
    )
    expect(campoCriterio(2)).toHaveValue("C")

    quitarCriterio(2)
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Quitar criterio 1" })).toHaveFocus(),
    )
  })

  it("PR-1D03: un error del servidor por la fila N se asigna a la fila que ocupaba esa posición en el envío y viaja con ella", async () => {
    const { llamadas } = stubApi({
      alCrear: () =>
        Promise.resolve(errorApi(400, "VALIDACION", "rubrica.1.criterio: Escribe el criterio")),
    })
    renderCrear()
    await esperarFormulario()
    llenarLoMinimo()
    for (const [indice, texto] of ["A", "B", "C"].entries()) {
      agregarCriterio()
      fireEvent.change(campoCriterio(indice + 1), { target: { value: texto } })
      fireEvent.change(campoPuntosMax(indice + 1), { target: { value: "5" } })
    }

    enviar()

    await waitFor(() => expect(campoCriterio(2)).toHaveAttribute("aria-invalid", "true"))
    expect(creaciones(llamadas)).toHaveLength(1)
    expect(campoCriterio(1)).toHaveAttribute("aria-invalid", "false")
    expect(campoCriterio(3)).toHaveAttribute("aria-invalid", "false")
    expect(aviso.error).not.toHaveBeenCalled()

    quitarCriterio(1)

    expect(campoCriterio(1)).toHaveValue("B")
    expect(campoCriterio(1)).toHaveAttribute("aria-invalid", "true")
    expect(campoCriterio(2)).toHaveAttribute("aria-invalid", "false")
  })
})

// T-08: lo que el servidor dice que ya no existe se vuelve a pedir y el campo no lo conserva.
describe("PR-1D03: las opciones que cambiaron se vuelven a pedir (T-08)", () => {
  it("PR-1D03: tras un 404 de categoría la lista se pide de nuevo y el campo vuelve a «Elige una categoría»", async () => {
    let vigentes = [categoria]
    const { llamadas } = stubApi({
      categoriasAhora: () => vigentes,
      alCrear: () => {
        vigentes = [{ ...categoria, id: "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d42", nombre: "Tareas" }]
        return Promise.resolve(errorApi(404, "CATEGORIA_NO_ENCONTRADA", "No existe"))
      },
    })
    renderCrear()
    await esperarFormulario()
    llenarLoMinimo()
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: CATEGORIA_ID } })

    enviar()

    expect(await screen.findByText("Esa categoría ya no existe. Elige otra.")).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Tareas (40 %)" })).toBeInTheDocument(),
    )
    expect(screen.queryByRole("option", { name: "Examen (40 %)" })).not.toBeInTheDocument()
    expect(screen.getByLabelText("Categoría")).toHaveValue("")
    expect(screen.getByRole("option", { name: "Elige una categoría" })).toBeInTheDocument()
    expect(llamadas.filter(({ url }) => url.endsWith("/categorias")).length).toBeGreaterThan(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("PR-1D03: tras un 404 de tema la lista se pide de nuevo y el campo vuelve a «Sin tema»", async () => {
    let vigentes = [tema]
    const { llamadas } = stubApi({
      temasAhora: () => vigentes,
      alCrear: () => {
        vigentes = []
        return Promise.resolve(errorApi(404, "TEMA_NO_ENCONTRADO", "No existe"))
      },
    })
    renderCrear()
    await esperarFormulario()
    llenarLoMinimo()
    fireEvent.change(screen.getByLabelText("Tema"), { target: { value: TEMA_ID } })

    enviar()

    expect(await screen.findByText("Ese tema ya no existe.")).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole("option", { name: "Unidad 1" })).not.toBeInTheDocument(),
    )
    expect(screen.getByLabelText("Tema")).toHaveValue("")
    expect(llamadas.filter(({ url }) => url.endsWith("/temas")).length).toBeGreaterThan(1)
  })

  it("PR-1D03: con CATEGORIA_REQUERIDA (la clase ganó categorías) se pide de nuevo y el campo pasa a «Elige una categoría» con su mensaje", async () => {
    let vigentes: (typeof categoria)[] = []
    const { llamadas } = stubApi({
      categoriasAhora: () => vigentes,
      alCrear: () => {
        vigentes = [categoria]
        return Promise.resolve(errorApi(409, "CATEGORIA_REQUERIDA", "Elige una categoría"))
      },
    })
    renderCrear()
    await esperarFormulario()
    llenarLoMinimo()
    expect(screen.getByRole("option", { name: "Sin categoría" })).toBeInTheDocument()

    enviar()

    expect(await screen.findByText("Elige la categoría de la tarea.")).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Elige una categoría" })).toBeInTheDocument(),
    )
    expect(screen.getByRole("option", { name: "Examen (40 %)" })).toBeInTheDocument()
    expect(screen.getByLabelText("Categoría")).toHaveValue("")
    expect(llamadas.filter(({ url }) => url.endsWith("/categorias")).length).toBeGreaterThan(1)
  })

  it("PR-1D03: una recarga de las listas que falla no desmonta el formulario ni borra lo escrito", async () => {
    let falla = false
    let recargasFallidas = 0
    stubApi({
      alCrear: () => Promise.resolve(errorApi(404, "CATEGORIA_NO_ENCONTRADA", "No existe")),
    })
    const original = globalThis.fetch
    vi.stubGlobal("fetch", (entrada: RequestInfo | URL, init?: RequestInit) => {
      if (falla && String(entrada).endsWith("/categorias")) {
        recargasFallidas += 1
        return Promise.resolve(errorApi(500, "ERROR_INTERNO", "x"))
      }
      return original(entrada, init)
    })
    renderCrear()
    await esperarFormulario()
    llenarLoMinimo()
    falla = true

    enviar()

    expect(await screen.findByText("Esa categoría ya no existe. Elige otra.")).toBeInTheDocument()
    await waitFor(() => expect(recargasFallidas).toBeGreaterThan(0))
    expect(screen.getByLabelText("Título")).toHaveValue("Ensayo")
  })
})

// T-10: la respuesta de un envío llega después de que se pudieron quitar filas de la rúbrica.
describe("PR-1D03: un error por una fila que se quitó con el envío en vuelo (T-10)", () => {
  const enviarConTresFilas = async (campo: "criterio" | "puntosMax", posicion: number) => {
    let soltar: (respuesta: Response) => void = () => undefined
    const { llamadas } = stubApi({
      alCrear: () =>
        new Promise<Response>((resolver) => {
          soltar = resolver
        }),
    })
    renderCrear()
    await esperarFormulario()
    llenarLoMinimo()
    for (const [indice, texto] of ["A", "B", "C"].entries()) {
      agregarCriterio()
      fireEvent.change(campoCriterio(indice + 1), { target: { value: texto } })
      fireEvent.change(campoPuntosMax(indice + 1), { target: { value: "5" } })
    }
    enviar()
    await waitFor(() => expect(creaciones(llamadas)).toHaveLength(1))
    const responderConError = () =>
      soltar(
        errorApi(
          400,
          "VALIDACION",
          `rubrica.${String(posicion)}.${campo}: El criterio no es válido.`,
        ),
      )
    return { responderConError }
  }

  const invalidos = () =>
    screen
      .queryAllByLabelText(/^(Criterio|Puntos máximos)\s+\d+$/)
      .filter((control) => control.getAttribute("aria-invalid") === "true")

  it("PR-1D03: el error de «Criterio» de una fila quitada se muestra como error de la rúbrica, sin marcar otras filas ni perderse", async () => {
    const { responderConError } = await enviarConTresFilas("criterio", 1)
    quitarCriterio(2)

    responderConError()

    expect(await screen.findByText("El criterio no es válido.")).toBeInTheDocument()
    expect(invalidos()).toHaveLength(0)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("PR-1D03: el error de «Puntos máximos» de una fila quitada se muestra igual como error de la rúbrica", async () => {
    const { responderConError } = await enviarConTresFilas("puntosMax", 2)
    quitarCriterio(3)

    responderConError()

    expect(await screen.findByText("El criterio no es válido.")).toBeInTheDocument()
    expect(invalidos()).toHaveLength(0)
  })

  it("PR-1D03: quitar una fila anterior antes de la respuesta deja el error en su fila, que sube de lugar, y no sale como error de la rúbrica", async () => {
    const { responderConError } = await enviarConTresFilas("criterio", 2)
    quitarCriterio(1)

    responderConError()

    await waitFor(() => expect(campoCriterio(2)).toHaveAttribute("aria-invalid", "true"))
    expect(invalidos()).toHaveLength(1)
    expect(campoCriterio(2)).toHaveValue("C")
    expect(screen.getAllByText("El criterio no es válido.")).toHaveLength(1)
  })

  it("PR-1D03: sin filas quitadas, el error del servidor sigue en su fila (el remedio no cambia ese camino)", async () => {
    const { responderConError } = await enviarConTresFilas("criterio", 0)

    responderConError()

    await waitFor(() => expect(campoCriterio(1)).toHaveAttribute("aria-invalid", "true"))
    expect(invalidos()).toHaveLength(1)
  })

  it("PR-1D03: quitar todas las filas antes de la respuesta deja el error en la rúbrica y la sección sigue usable", async () => {
    const { responderConError } = await enviarConTresFilas("criterio", 0)
    quitarCriterio(1)
    quitarCriterio(1)
    quitarCriterio(1)

    responderConError()

    expect(await screen.findByText("El criterio no es válido.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Agregar criterio" })).toBeInTheDocument()
  })
})

// T-11, vecino de crear: no hay tarea en caché que renovar; el aviso lo da el hook y el formulario sigue.
describe("PR-1D03: crear con un 403 SIN_ACCESO_A_LA_CLASE (T-11)", () => {
  it("PR-1D03: avisa que no hay acceso, conserva lo escrito y no navega", async () => {
    const { llamadas } = stubApi({
      alCrear: () => Promise.resolve(errorApi(403, "SIN_ACCESO_A_LA_CLASE", "x")),
    })
    renderCrear()
    await esperarFormulario()
    llenarLoMinimo()

    enviar()

    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith("No tienes acceso a esta clase."))
    expect(screen.getByLabelText("Título")).toHaveValue("Ensayo")
    expect(screen.queryByText("Pantalla del detalle")).not.toBeInTheDocument()
    expect(
      llamadas.filter(({ metodo, url }) => metodo === "GET" && url.includes("/tareas/")),
    ).toHaveLength(0)
  })
})
