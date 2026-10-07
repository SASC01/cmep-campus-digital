import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/services/apiClient"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { CrearTareaView } from "./crear-tarea-view"
import { DetalleTareaView } from "./detalle-tarea-view"
import { EditarTareaView } from "./editar-tarea-view"
import { errorQueReemplazaLaVista, erroresConLlavesDeFila } from "./lib"

// Ataque del Tester, TAREAS-01d, ronda 2: los bordes de los remedios de T-06 a T-09 y de M-01, y los
// estados vecinos de su mecanismo. Sin selectores de clase: rol, etiqueta y texto accesible.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const CATEGORIA_ID = "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d41"
const AVISO_EDICION = "No pudimos actualizar la tarea. Puedes seguir editando; revisa tu conexión."
const AVISO_DETALLE = "No pudimos actualizar la tarea. Mostramos la última versión que tenemos."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const tareaDetalle = (cambios: Record<string, unknown> = {}) => ({
  id: TAREA_ID,
  titulo: "Ensayo",
  instrucciones: "Dos páginas.",
  fechaLimite: "2030-01-15T16:00:00.000Z",
  puntos: 100,
  aceptaTardias: true,
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

type Responder = (metodo: string, url: string) => Response | Promise<Response> | undefined

const stubApi = (responder: Responder) => {
  const llamadas: Llamada[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null
      llamadas.push({ metodo, url, cuerpo })
      return Promise.resolve(responder(metodo, url) ?? respuestaJson(500, {}))
    }),
  )
  return llamadas
}

const listasVacias: Responder = (_m, url) => {
  if (url.endsWith("/categorias")) return respuestaJson(200, { categorias: [] })
  if (url.endsWith("/temas")) return respuestaJson(200, { temas: [], sinTema: 0 })
  return undefined
}

const esGetDeLaTarea = (l: Llamada) => l.metodo === "GET" && l.url.endsWith(`/tareas/${TAREA_ID}`)

const nuevoCliente = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockReset()
  aviso.error.mockReset()
})

const renderCrear = () => {
  const cliente = nuevoCliente()
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[`/maestro/clases/${CLASE_ID}/tareas/nueva`]}>
        <Routes>
          <Route path="/maestro/clases/:claseId/tareas/nueva" element={<CrearTareaView />} />
          <Route path="/maestro/clases/:claseId/tareas/:tareaId" element={<p>Detalle</p>} />
          <Route path="/maestro/clases/:claseId" element={<p>Muro</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return cliente
}

// Detalle y edición en el mismo router y con la misma caché, como en la aplicación.
const renderTarea = (entrada: "detalle" | "editar") => {
  const cliente = nuevoCliente()
  const base = `/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}`
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[entrada === "detalle" ? base : `${base}/editar`]}>
        <Routes>
          <Route path="/maestro/clases/:claseId/tareas/:tareaId" element={<DetalleTareaView />} />
          <Route
            path="/maestro/clases/:claseId/tareas/:tareaId/editar"
            element={<EditarTareaView />}
          />
          <Route path="/maestro/clases/:claseId" element={<p>Muro</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return cliente
}

const recargar = async (cliente: QueryClient) => {
  await act(() => cliente.refetchQueries({ type: "active" }))
  await waitFor(() => expect(cliente.isFetching()).toBe(0))
}

const llenarLoMinimo = () => {
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Ensayo" } })
  fireEvent.change(screen.getByLabelText("Fecha límite"), { target: { value: "2030-01-15T10:00" } })
}
const enviar = () => fireEvent.click(screen.getByRole("button", { name: "Publicar tarea" }))
const campoCriterio = (n: number) => screen.getByLabelText(new RegExp(`^Criterio\\s+${String(n)}$`))
const campoPuntosMax = (n: number) =>
  screen.getByLabelText(new RegExp(`^Puntos máximos\\s+${String(n)}$`))
const quitar = (n: number) =>
  fireEvent.click(
    screen.getByRole("button", { name: new RegExp(`^Quitar criterio\\s+${String(n)}$`) }),
  )
const agregar = () => fireEvent.click(screen.getByRole("button", { name: "Agregar criterio" }))
const cuantosInvalidos = () =>
  screen
    .queryAllByLabelText(/^(Criterio|Puntos máximos)\s+\d+$/)
    .filter((campo) => campo.getAttribute("aria-invalid") === "true").length

describe("ataque TAREAS-01d r2: T-06, los errores de la rúbrica viajan con su fila", () => {
  it("un error del servidor por una fila que se quitó mientras el envío estaba en vuelo no se pierde en silencio (ni campo ni aviso)", async () => {
    let soltar: (r: Response) => void = () => undefined
    const llamadas = stubApi((metodo, url) => {
      if (metodo === "POST" && url.endsWith("/tareas"))
        return new Promise<Response>((resolver) => {
          soltar = resolver
        })
      return listasVacias(metodo, url)
    })
    renderCrear()
    await screen.findByLabelText("Título")
    llenarLoMinimo()
    agregar()
    agregar()
    fireEvent.change(campoCriterio(1), { target: { value: "Claridad" } })
    fireEvent.change(campoPuntosMax(1), { target: { value: "10" } })
    fireEvent.change(campoCriterio(2), { target: { value: "Orden" } })
    fireEvent.change(campoPuntosMax(2), { target: { value: "5" } })
    enviar()
    await waitFor(() => expect(llamadas.some((l) => l.metodo === "POST")).toBe(true))
    quitar(2)
    await act(async () => {
      soltar(errorApi(400, "VALIDACION", "rubrica.1.criterio: El criterio no es válido."))
      await Promise.resolve()
    })
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Publicar tarea" })).not.toHaveAttribute(
        "aria-busy",
        "true",
      ),
    )
    const enPantalla = screen.queryByText("El criterio no es válido.") !== null
    const avisado = aviso.error.mock.calls.length > 0
    expect({ enPantalla, avisado }).not.toEqual({ enPantalla: false, avisado: false })
  })

  it("errores en varias filas a la vez, con quitar y agregar en secuencia: cada error sigue en su fila y la fila nueva nace limpia (sin hallazgo esperado)", async () => {
    stubApi(listasVacias)
    renderCrear()
    await screen.findByLabelText("Título")
    llenarLoMinimo()
    agregar()
    agregar()
    agregar()
    fireEvent.change(campoPuntosMax(1), { target: { value: "10" } })
    fireEvent.change(campoCriterio(2), { target: { value: "B" } })
    fireEvent.change(campoPuntosMax(3), { target: { value: "5" } })
    enviar()
    await waitFor(() => expect(campoCriterio(1)).toHaveAttribute("aria-invalid", "true"))
    expect(campoPuntosMax(2)).toHaveAttribute("aria-invalid", "true")
    expect(campoCriterio(3)).toHaveAttribute("aria-invalid", "true")
    expect(campoCriterio(2)).toHaveAttribute("aria-invalid", "false")

    quitar(2)
    expect([campoCriterio(1), campoCriterio(2)].map((c) => c.getAttribute("aria-invalid"))).toEqual(
      ["true", "true"],
    )
    expect(
      [campoPuntosMax(1), campoPuntosMax(2)].map((c) => c.getAttribute("aria-invalid")),
    ).toEqual(["false", "false"])

    agregar()
    expect(campoCriterio(3)).toHaveAttribute("aria-invalid", "false")
    expect(campoPuntosMax(3)).toHaveAttribute("aria-invalid", "false")

    quitar(1)
    expect(campoPuntosMax(1)).toHaveValue(5)
    expect(cuantosInvalidos()).toBe(1)
    expect(campoCriterio(1)).toHaveAttribute("aria-invalid", "true")
  })

  it("un error del servidor por una fila fuera de rango (rubrica.7 con dos filas) se muestra como error de la rúbrica, sin marcar filas ni aviso (sin hallazgo esperado)", async () => {
    stubApi((metodo, url) => {
      if (metodo === "POST" && url.endsWith("/tareas"))
        return errorApi(400, "VALIDACION", "rubrica.7.criterio: El criterio no es válido.")
      return listasVacias(metodo, url)
    })
    renderCrear()
    await screen.findByLabelText("Título")
    llenarLoMinimo()
    agregar()
    agregar()
    for (const n of [1, 2]) {
      fireEvent.change(campoCriterio(n), { target: { value: `C${String(n)}` } })
      fireEvent.change(campoPuntosMax(n), { target: { value: "5" } })
    }
    enviar()
    expect(await screen.findByText("El criterio no es válido.")).toBeInTheDocument()
    expect(cuantosInvalidos()).toBe(0)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("erroresConLlavesDeFila: una posición con cero a la izquierda apunta a su fila; negativas u otro campo no se confunden con filas (sin hallazgo esperado)", () => {
    const filas = [
      { llave: "a", criterio: "", puntosMax: "" },
      { llave: "b", criterio: "", puntosMax: "" },
    ]
    expect(
      erroresConLlavesDeFila(
        {
          "rubrica.01.criterio": "x",
          "rubrica.1.puntosMax": "y",
          "rubrica.-1.criterio": "z",
          "rubrica.0.otro": "w",
          titulo: "t",
        },
        filas,
      ),
    ).toEqual({
      "rubrica.b.criterio": "x",
      "rubrica.b.puntosMax": "y",
      "rubrica.-1.criterio": "z",
      "rubrica.0.otro": "w",
      titulo: "t",
    })
  })
})

describe("ataque TAREAS-01d r2: T-08, las opciones que cambiaron", () => {
  it("tras un 404 de categoría, si la lista nueva viene vacía, el selector solo ofrece «Sin categoría» y el reenvío va con categoriaId null (sin hallazgo esperado)", async () => {
    let pedidas = 0
    let intentos = 0
    const llamadas = stubApi((metodo, url) => {
      if (url.endsWith("/categorias")) {
        pedidas += 1
        return respuestaJson(200, {
          categorias:
            pedidas === 1 ? [{ id: CATEGORIA_ID, nombre: "Examen", peso: 100, tareas: 0 }] : [],
        })
      }
      if (url.endsWith("/temas")) return respuestaJson(200, { temas: [], sinTema: 0 })
      if (metodo === "POST" && url.endsWith("/tareas")) {
        intentos += 1
        if (intentos === 1)
          return errorApi(404, "CATEGORIA_NO_ENCONTRADA", "Esa categoría ya no existe. Elige otra.")
        return respuestaJson(201, { tarea: tareaDetalle() })
      }
      return undefined
    })
    renderCrear()
    await screen.findByLabelText("Título")
    llenarLoMinimo()
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: CATEGORIA_ID } })
    enviar()
    await waitFor(() =>
      expect(within(screen.getByLabelText("Categoría")).getAllByRole("option")).toHaveLength(1),
    )
    expect(screen.getByLabelText("Categoría")).toHaveValue("")
    enviar()
    expect(await screen.findByText("Detalle")).toBeInTheDocument()
    const posts = llamadas.filter((l) => l.metodo === "POST" && l.url.endsWith("/tareas"))
    expect(posts).toHaveLength(2)
    expect((posts[1]?.cuerpo as { categoriaId?: unknown } | null)?.categoriaId).toBeNull()
  })
})

describe("ataque TAREAS-01d r2: hermanos de T-08, el servidor niega la acción y la tarea en caché queda vieja", () => {
  it.each([
    [404, "TAREA_NO_ENCONTRADA", "Esa tarea ya no existe."],
    [403, "BORRADO_NO_PERMITIDO", "Ya no puedes borrar esta tarea."],
  ])(
    "detalle: un DELETE que responde %i %s vuelve a pedir la tarea para no seguir ofreciendo lo que el servidor ya negó",
    async (estado, codigo, mensaje) => {
      const llamadas = stubApi((metodo, url) => {
        if (metodo === "GET" && url.endsWith(`/tareas/${TAREA_ID}`))
          return respuestaJson(200, { tarea: tareaDetalle() })
        if (metodo === "DELETE") return errorApi(estado, codigo, mensaje)
        return undefined
      })
      renderTarea("detalle")
      fireEvent.click(await screen.findByRole("button", { name: "Borrar tarea" }))
      const antes = llamadas.filter(esGetDeLaTarea).length
      fireEvent.click(await screen.findByRole("button", { name: "Sí, borrar tarea" }))
      await waitFor(() => expect(aviso.error).toHaveBeenCalled())
      await waitFor(() => expect(llamadas.filter(esGetDeLaTarea).length).toBeGreaterThan(antes))
    },
  )

  it.each([
    [404, "TAREA_NO_ENCONTRADA", "Esa tarea ya no existe."],
    [403, "EDICION_NO_PERMITIDA", "Ya no puedes editar esta tarea."],
  ])(
    "edición: un PUT que responde %i %s vuelve a pedir la tarea para no dejar el formulario ofreciendo guardar",
    async (estado, codigo, mensaje) => {
      const llamadas = stubApi((metodo, url) => {
        if (metodo === "GET" && url.endsWith(`/tareas/${TAREA_ID}`))
          return respuestaJson(200, { tarea: tareaDetalle() })
        if (metodo === "PUT") return errorApi(estado, codigo, mensaje)
        return listasVacias(metodo, url)
      })
      renderTarea("editar")
      const guardar = await screen.findByRole("button", { name: "Guardar cambios" })
      const antes = llamadas.filter(esGetDeLaTarea).length
      fireEvent.click(guardar)
      await waitFor(() => expect(aviso.error).toHaveBeenCalled())
      await waitFor(() => expect(llamadas.filter(esGetDeLaTarea).length).toBeGreaterThan(antes))
    },
  )
})

describe("ataque TAREAS-01d r2: M-01, la recarga fallida con la tarea en caché", () => {
  it("un fallo de recarga en el detalle avisa una vez; abrir «Editar tarea» con ese error en caché no vuelve a avisar de un fallo que no ocurrió (sin StrictMode)", async () => {
    let respuestas = 0
    stubApi((metodo, url) => {
      if (metodo === "GET" && url.endsWith(`/tareas/${TAREA_ID}`)) {
        respuestas += 1
        if (respuestas === 2) return errorApi(500, "ERROR_INTERNO", "Error interno")
        return respuestaJson(200, { tarea: tareaDetalle() })
      }
      return listasVacias(metodo, url)
    })
    const cliente = renderTarea("detalle")
    await screen.findByRole("link", { name: "Editar tarea" })
    await recargar(cliente)
    expect(respuestas).toBe(2)
    expect(aviso.error.mock.calls).toEqual([[AVISO_DETALLE]])

    fireEvent.click(screen.getByRole("link", { name: "Editar tarea" }))
    await screen.findByRole("button", { name: "Guardar cambios" })
    await waitFor(() => expect(cliente.isFetching()).toBe(0))
    // Las respuestas de después de la 2 son todas exitosas: no hubo un segundo fallo.
    expect(aviso.error.mock.calls).toEqual([[AVISO_DETALLE]])
  })

  it("edición: un 403 SIN_ACCESO_A_LA_CLASE en la recarga dice que ya no hay acceso, no que revise su conexión", async () => {
    let respuestas = 0
    stubApi((metodo, url) => {
      if (metodo === "GET" && url.endsWith(`/tareas/${TAREA_ID}`)) {
        respuestas += 1
        if (respuestas >= 2)
          return errorApi(403, "SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.")
        return respuestaJson(200, { tarea: tareaDetalle() })
      }
      return listasVacias(metodo, url)
    })
    const cliente = renderTarea("editar")
    await screen.findByRole("button", { name: "Guardar cambios" })
    await recargar(cliente)
    expect(respuestas).toBeGreaterThanOrEqual(2)
    const dicho = [
      ...aviso.error.mock.calls.map((llamada) => String(llamada[0])),
      document.body.textContent,
    ].join(" | ")
    expect(dicho).toContain("No tienes acceso a esta clase.")
    expect(aviso.error).not.toHaveBeenCalledWith(AVISO_EDICION)
  })

  it("edición: fallo y luego recarga exitosa que de verdad llega: la caché tiene la versión nueva, lo escrito y el foco se conservan, un solo aviso; un fallo posterior vuelve a avisar (sin hallazgo esperado)", async () => {
    let respuestas = 0
    stubApi((metodo, url) => {
      if (metodo === "GET" && url.endsWith(`/tareas/${TAREA_ID}`)) {
        respuestas += 1
        if (respuestas === 2 || respuestas === 4)
          return errorApi(500, "ERROR_INTERNO", "Error interno")
        return respuestaJson(200, {
          tarea: tareaDetalle({ titulo: respuestas === 1 ? "Ensayo" : "Ensayo v2" }),
        })
      }
      return listasVacias(metodo, url)
    })
    const cliente = renderTarea("editar")
    const titulo = await screen.findByLabelText("Título")
    fireEvent.change(titulo, { target: { value: "Mío" } })
    act(() => titulo.focus())
    await recargar(cliente)
    expect(aviso.error.mock.calls).toEqual([[AVISO_EDICION]])
    await recargar(cliente)
    expect(respuestas).toBe(3)
    const titulosEnCache = cliente
      .getQueryCache()
      .findAll()
      .map((consulta) => consulta.state.data as { tarea?: { titulo?: string } } | undefined)
      .map((datos) => datos?.tarea?.titulo)
      .filter((t) => t !== undefined)
    expect(titulosEnCache).toEqual(["Ensayo v2"])
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText("Título")).toHaveValue("Mío")
    expect(screen.getByLabelText("Título")).toHaveFocus()
    await recargar(cliente)
    expect(respuestas).toBe(4)
    expect(aviso.error).toHaveBeenCalledTimes(2)
    expect(screen.getByLabelText("Título")).toHaveValue("Mío")
  })

  it.each([
    [false, new ApiError("ERROR_INTERNO", "x", 500), true],
    [true, new ApiError("TAREA_NO_ENCONTRADA", "x", 404), true],
    [true, new ApiError("ERROR_INTERNO", "x", 500), false],
    [true, new Error("red"), false],
    [true, null, false],
  ])("errorQueReemplazaLaVista(%s, %s) = %s (sin hallazgo esperado)", (hay, error, esperado) => {
    expect(errorQueReemplazaLaVista(hay, error)).toBe(esperado)
  })
})

describe("ataque TAREAS-01d r2: T-09, el foco cuando una recarga cambia la vista", () => {
  it("quien soltó el foco con un clic en blanco dentro de la vista no lo recupera cuando llega una recarga sin cambios", async () => {
    stubApi((metodo, url) => {
      if (metodo === "GET" && url.endsWith(`/tareas/${TAREA_ID}`))
        return respuestaJson(200, { tarea: tareaDetalle() })
      return undefined
    })
    const cliente = renderTarea("detalle")
    const borrar = await screen.findByRole("button", { name: "Borrar tarea" })
    act(() => borrar.focus())
    expect(borrar).toHaveFocus()
    const parrafo = screen.getByText("Dos páginas.")
    fireEvent.mouseDown(parrafo)
    act(() => borrar.blur())
    fireEvent.mouseUp(parrafo)
    fireEvent.click(parrafo)
    expect(document.activeElement).toBe(document.body)
    await recargar(cliente)
    expect(screen.getByRole("button", { name: "Borrar tarea" })).toBeInTheDocument()
    expect(document.activeElement).toBe(document.body)
  })

  it("con el foco en «Borrar tarea», una recarga sin cambios no mueve el foco; si la siguiente quita el botón, el foco no cae en <body> (sin hallazgo esperado)", async () => {
    let tarea = tareaDetalle({ puedeEditar: false })
    stubApi((metodo, url) => {
      if (metodo === "GET" && url.endsWith(`/tareas/${TAREA_ID}`))
        return respuestaJson(200, { tarea })
      return undefined
    })
    const cliente = renderTarea("detalle")
    const borrar = await screen.findByRole("button", { name: "Borrar tarea" })
    act(() => borrar.focus())
    await recargar(cliente)
    expect(screen.getByRole("button", { name: "Borrar tarea" })).toHaveFocus()
    tarea = tareaDetalle({ puedeEditar: false, puedeBorrar: false })
    await recargar(cliente)
    expect(screen.queryByRole("button", { name: "Borrar tarea" })).toBeNull()
    expect(document.activeElement).not.toBe(document.body)
  })
})

// Revisión estática final de 01d (lo que la ronda 1 no cubrió).
const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})
const DE_01D = Object.entries(fuentes).filter(
  ([ruta]) =>
    !/\.test\.tsx?$/.test(ruta) &&
    (ruta.startsWith("/src/features/tareas/") ||
      [
        "/src/components/ui/native-select.tsx",
        "/src/lib/vencimiento.ts",
        "/src/services/trabajoService.ts",
        "/src/features/clases/components/tarjeta-de-tarea.tsx",
        "/src/features/clases/components/publicacion-del-muro.tsx",
      ].includes(ruta)),
)

describe("ataque TAREAS-01d r2: revisión estática final (sin hallazgo esperado)", () => {
  it("sin disabled en JSX, sin clases de las escalas anuladas, sin valores arbitrarios en px, rem o color y sin importar de otro módulo de features", () => {
    expect(DE_01D.length).toBeGreaterThan(15)
    const reglas: [string, RegExp][] = [
      ["disabled en JSX", /<[A-Z][\w.]*[^>]*\sdisabled(?:[\s=>]|\{)/],
      ["escala anulada", /["'\s](?:text|rounded|shadow|blur)-(?:xs|sm|md|lg|xl|[2-9]xl)\b/],
      [
        "paleta de Tailwind",
        /["'\s](?:bg|text|border)-(?:gray|slate|zinc|neutral|red|blue|green)-\d{2,3}\b/,
      ],
      ["valor arbitrario", /-\[(?:#|\d+(?:\.\d+)?(?:px|rem|em|%))/],
      ["importa de features", /from\s+["']@\/features\//],
    ]
    const violaciones = DE_01D.flatMap(([ruta, texto]) =>
      reglas.filter(([, regla]) => regla.test(texto)).map(([nombre]) => `${ruta}: ${nombre}`),
    )
    expect(violaciones).toEqual([])
  })
})
