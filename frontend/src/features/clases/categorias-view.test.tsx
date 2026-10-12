import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { CategoriasView } from "./categorias-view"

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

// TAREAS-01e (§D-11, S-06, P-01 a; PR-1E03): "Categorías de calificación".

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorDeApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const idCategoria = (n: number) => `6a6b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`

interface Categoria {
  id: string
  nombre: string
  peso: number
  tareas: number
}

const EXAMEN: Categoria = { id: idCategoria(1), nombre: "Examen", peso: 60, tareas: 0 }
const TAREAS: Categoria = { id: idCategoria(2), nombre: "Tareas", peso: 40, tareas: 3 }

interface Llamada {
  metodo: string
  cuerpo: unknown
}

const stubApi = (
  inicial: Categoria[],
  alGuardar: (cuerpo: unknown, llamada: number) => Response = (cuerpo) => {
    const { categorias } = cuerpo as { categorias: { id?: string; nombre: string; peso: number }[] }
    return respuestaJson(200, {
      categorias: categorias.map((categoria, i) => ({
        id: categoria.id ?? idCategoria(50 + i),
        nombre: categoria.nombre,
        peso: categoria.peso,
        tareas: 0,
      })),
    })
  },
) => {
  const llamadas: Llamada[] = []
  let actuales = inicial
  let guardados = 0
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const metodo = init?.method ?? "GET"
    const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined
    llamadas.push({ metodo, cuerpo })
    if (String(entrada) !== `/api/clases/${CLASE_ID}/categorias`) {
      return Promise.resolve(errorDeApi(500, "ERROR_INTERNO", "sin manejador"))
    }
    if (metodo === "GET") return Promise.resolve(respuestaJson(200, { categorias: actuales }))
    guardados += 1
    return Promise.resolve(alGuardar(cuerpo, guardados))
  })
  vi.stubGlobal("fetch", fetchMock)
  return {
    llamadas,
    guardados: () => llamadas.filter(({ metodo }) => metodo === "PUT"),
    cambiarServidor: (nuevas: Categoria[]) => {
      actuales = nuevas
    },
  }
}

const renderCategorias = (ruta = `/maestro/clases/${CLASE_ID}/categorias`) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/maestro/clases/:claseId/categorias" element={<CategoriasView />} />
          <Route path="/admin/clases/:claseId/categorias" element={<CategoriasView />} />
          <Route path="/estudiante/clases/:claseId/categorias" element={<CategoriasView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const filas = () =>
  screen.getAllByRole("textbox", { name: /^Nombre de la categoría/ }).map((campo) => {
    const fila = campo.closest("[data-llave]")
    if (!(fila instanceof HTMLElement)) throw new Error("campo sin fila")
    return fila
  })

const total = () => screen.getByRole("status")

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("CategoriasView (PR-1E03)", () => {
  it("PR-1E03 · sin categorías dice que la clase se califica por puntos y ofrece «Agregar categoría»", async () => {
    stubApi([])
    renderCategorias()

    expect(
      await screen.findByText(
        "Esta clase no tiene categorías. Sus tareas se califican por puntos.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Categorías de calificación" })).toBeInTheDocument()
    expect(
      screen.getByText(
        "Los pesos deben sumar 100 %. Cada categoría cuenta según su peso en la calificación general.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Agregar categoría" })).toBeInTheDocument()
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("PR-1E03 · agregar, editar y quitar filas; el total en vivo dice si es exacto, si faltan o si sobran", async () => {
    stubApi([EXAMEN])
    renderCategorias()
    expect(await screen.findByDisplayValue("Examen")).toBeInTheDocument()
    expect(total()).toHaveTextContent("Total: 60 %. Faltan 40 %.")

    fireEvent.click(screen.getByRole("button", { name: "Agregar categoría" }))
    expect(filas()).toHaveLength(2)
    const nueva = filas()[1] ?? document.body
    expect(within(nueva).getByRole("textbox", { name: /^Nombre/ })).toHaveFocus()
    fireEvent.change(within(nueva).getByRole("textbox", { name: /^Nombre/ }), {
      target: { value: "Proyecto" },
    })
    fireEvent.change(within(nueva).getByRole("textbox", { name: /^Peso/ }), {
      target: { value: "40" },
    })
    expect(total()).toHaveTextContent("Total: 100 %")

    fireEvent.change(within(nueva).getByRole("textbox", { name: /^Peso/ }), {
      target: { value: "50" },
    })
    expect(total()).toHaveTextContent("Total: 110 %. Sobran 10 %.")

    fireEvent.click(within(nueva).getByRole("button", { name: /^Quitar/ }))
    expect(filas()).toHaveLength(1)
    expect(total()).toHaveTextContent("Total: 60 %. Faltan 40 %.")
    for (const campo of screen.getAllByRole("textbox")) {
      expect(campo).toHaveAttribute("autocomplete", "off")
    }
  })

  it("PR-1E03 · una categoría con tareas no ofrece «Quitar» y muestra la nota", async () => {
    stubApi([EXAMEN, TAREAS])
    renderCategorias()
    await screen.findByDisplayValue("Tareas")
    const [examen, tareas] = filas()

    expect(within(examen ?? document.body).getByText("0 tareas")).toBeInTheDocument()
    expect(
      within(examen ?? document.body).getByRole("button", { name: /^Quitar/ }),
    ).toBeInTheDocument()
    expect(within(tareas ?? document.body).getByText("Tiene 3 tareas.")).toBeInTheDocument()
    expect(within(tareas ?? document.body).queryByRole("button", { name: /^Quitar/ })).toBeNull()
  })

  it("PR-1E03 · guardar valida con el esquema de shared/: con 99 % o un nombre vacío no envía nada y cada error queda en su lugar", async () => {
    const servidor = stubApi([EXAMEN])
    renderCategorias()
    await screen.findByDisplayValue("Examen")
    fireEvent.click(screen.getByRole("button", { name: "Agregar categoría" }))
    const nueva = filas()[1] ?? document.body
    fireEvent.change(within(nueva).getByRole("textbox", { name: /^Peso/ }), {
      target: { value: "39" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Guardar categorías" }))

    expect(await screen.findByText("Escribe el nombre de la categoría")).toBeInTheDocument()
    expect(within(nueva).getByRole("textbox", { name: /^Nombre/ })).toHaveAttribute(
      "aria-invalid",
      "true",
    )
    expect(servidor.guardados()).toHaveLength(0)

    fireEvent.change(within(nueva).getByRole("textbox", { name: /^Nombre/ }), {
      target: { value: "Proyecto" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar categorías" }))
    expect(await screen.findByText("Los pesos deben sumar 100 %")).toBeInTheDocument()
    expect(total()).toHaveTextContent("Total: 99 %. Faltan 1 %.")
    expect(servidor.guardados()).toHaveLength(0)

    fireEvent.change(within(nueva).getByRole("textbox", { name: /^Peso/ }), {
      target: { value: "4x" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar categorías" }))
    expect(
      await screen.findByText("El peso debe ser un número entero de 1 a 100"),
    ).toBeInTheDocument()
    expect(servidor.guardados()).toHaveLength(0)
  })

  it("PR-1E03 · guardar envía la lista completa en bloque (ids de las guardadas, sin id las nuevas, peso con «%» pegado), avisa y adopta los ids nuevos", async () => {
    const servidor = stubApi([EXAMEN])
    renderCategorias()
    await screen.findByDisplayValue("Examen")
    fireEvent.click(screen.getByRole("button", { name: "Agregar categoría" }))
    const nueva = filas()[1] ?? document.body
    fireEvent.change(within(nueva).getByRole("textbox", { name: /^Nombre/ }), {
      target: { value: " Proyecto " },
    })
    fireEvent.change(within(nueva).getByRole("textbox", { name: /^Peso/ }), {
      target: { value: "40 %" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Guardar categorías" }))

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Categorías guardadas"))
    expect(servidor.guardados().map(({ cuerpo }) => cuerpo)).toEqual([
      {
        categorias: [
          { id: idCategoria(1), nombre: "Examen", peso: 60 },
          { nombre: "Proyecto", peso: 40 },
        ],
      },
    ])
    // La respuesta trae el id de la nueva: guardar otra vez ya no la crea de nuevo.
    await waitFor(() => expect(screen.getAllByText("0 tareas")).toHaveLength(2))
    fireEvent.click(screen.getByRole("button", { name: "Guardar categorías" }))
    await waitFor(() => expect(servidor.guardados()).toHaveLength(2))
    expect(servidor.guardados()[1]?.cuerpo).toEqual({
      categorias: [
        { id: idCategoria(1), nombre: "Examen", peso: 60 },
        { id: idCategoria(51), nombre: "Proyecto", peso: 40 },
      ],
    })
  })

  it("PR-1E03 · un 409 CATEGORIA_CON_TAREAS avisa con el mensaje del servidor y el editor parte de la lista que el servidor acaba de devolver", async () => {
    const servidor = stubApi([EXAMEN, { ...TAREAS, tareas: 0 }], () => {
      servidor.cambiarServidor([EXAMEN, TAREAS])
      return errorDeApi(
        409,
        "CATEGORIA_CON_TAREAS",
        "No puedes quitar «Tareas»: tiene 3 tareas. Muévelas a otra categoría primero.",
      )
    })
    renderCategorias()
    await screen.findByDisplayValue("Tareas")
    const tareas = filas()[1] ?? document.body
    fireEvent.click(within(tareas).getByRole("button", { name: /^Quitar/ }))
    fireEvent.change(within(filas()[0] ?? document.body).getByRole("textbox", { name: /^Peso/ }), {
      target: { value: "100" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Guardar categorías" }))

    await waitFor(() =>
      expect(aviso.error).toHaveBeenCalledWith(
        "No puedes quitar «Tareas»: tiene 3 tareas. Muévelas a otra categoría primero.",
      ),
    )
    await waitFor(() => expect(filas()).toHaveLength(2))
    expect(screen.getByText("Tiene 3 tareas.")).toBeInTheDocument()
    expect(total()).toHaveTextContent("Total: 100 %")
  })

  it("PR-1E03 · un VALIDACION del servidor de una fila queda bajo esa fila, y uno de la lista bajo el total", async () => {
    stubApi([EXAMEN, { ...TAREAS, tareas: 0 }], (_cuerpo, llamada) =>
      llamada === 1
        ? errorDeApi(400, "VALIDACION", "categorias.1.nombre: Escribe el nombre de la categoría")
        : errorDeApi(400, "VALIDACION", "categorias: No repitas el nombre de una categoría"),
    )
    renderCategorias()
    await screen.findByDisplayValue("Tareas")

    fireEvent.click(screen.getByRole("button", { name: "Guardar categorías" }))
    const segunda = filas()[1] ?? document.body
    expect(
      await within(segunda).findByText("Escribe el nombre de la categoría"),
    ).toBeInTheDocument()
    expect(aviso.error).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Guardar categorías" }))
    expect(await screen.findByText("No repitas el nombre de una categoría")).toBeInTheDocument()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("PR-1E03 · al quitar una fila el foco va al «Quitar» de la vecina y, sin filas, a «Agregar categoría»", async () => {
    stubApi([EXAMEN, { ...TAREAS, tareas: 0 }])
    renderCategorias()
    await screen.findByDisplayValue("Tareas")

    const quitarExamen = within(filas()[0] ?? document.body).getByRole("button", {
      name: /^Quitar/,
    })
    quitarExamen.focus()
    fireEvent.click(quitarExamen)
    await waitFor(() =>
      expect(
        within(filas()[0] ?? document.body).getByRole("button", { name: /^Quitar/ }),
      ).toHaveFocus(),
    )
    expect(screen.getByDisplayValue("Tareas")).toBeInTheDocument()

    fireEvent.click(within(filas()[0] ?? document.body).getByRole("button", { name: /^Quitar/ }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Agregar categoría" })).toHaveFocus(),
    )
    expect(
      screen.getByText("Esta clase no tiene categorías. Sus tareas se califican por puntos."),
    ).toBeInTheDocument()
  })

  it("PR-1E03 · desde una ruta de estudiante no pide nada", async () => {
    const servidor = stubApi([EXAMEN])
    renderCategorias(`/estudiante/clases/${CLASE_ID}/categorias`)
    expect(await screen.findByRole("alert")).toHaveTextContent("No tienes acceso a esta clase.")
    expect(servidor.llamadas).toHaveLength(0)
  })
})

// TAREAS-01e, corrección de la ronda 1 (T-17 y T-18): los errores se van con su fila y el foco no cae
// en <body> cuando la lista se reemplaza con la respuesta del servidor.
describe("CategoriasView: errores y foco de las filas (T-17 y T-18)", () => {
  const nombreDe = (fila: HTMLElement) => within(fila).getByRole("textbox", { name: /^Nombre/ })
  const pesoDe = (fila: HTMLElement) => within(fila).getByRole("textbox", { name: /^Peso/ })
  const quitarDe = (fila: HTMLElement) => within(fila).getByRole("button", { name: /^Quitar/ })
  const filaN = (n: number) => {
    const fila = filas()[n]
    if (fila === undefined) throw new Error(`no hay fila ${String(n)}`)
    return fila
  }
  const agregar = () => fireEvent.click(screen.getByRole("button", { name: "Agregar categoría" }))
  const guardar = () => fireEvent.click(screen.getByRole("button", { name: "Guardar categorías" }))
  const erroresVisibles = () =>
    Array.from(document.querySelectorAll("[id$='-error']")).map((nodo) => nodo.textContent)

  it("T-17 · quitar una fila con un error del cliente (nombre o peso) se lleva su error y no aparece bajo el total; el error de otra fila se queda", async () => {
    stubApi([EXAMEN])
    renderCategorias()
    await screen.findByDisplayValue("Examen")
    agregar()
    fireEvent.change(pesoDe(filaN(1)), { target: { value: "20" } })
    agregar()
    fireEvent.change(nombreDe(filaN(2)), { target: { value: "Proyecto" } })
    fireEvent.change(pesoDe(filaN(2)), { target: { value: "abc" } })
    guardar()
    expect(await screen.findByText("Escribe el nombre de la categoría")).toBeInTheDocument()
    expect(screen.getByText("El peso debe ser un número entero de 1 a 100")).toBeInTheDocument()

    // Quitar la fila del medio (el nombre vacío): su error se va, el del peso de la otra se queda.
    fireEvent.click(quitarDe(filaN(1)))
    expect(screen.queryByText("Escribe el nombre de la categoría")).toBeNull()
    expect(within(filaN(1)).getByText("El peso debe ser un número entero de 1 a 100")).toBeVisible()
    expect(total()).toHaveTextContent("Total: 60 %. Faltan 40 %.")

    // Quitar la última (el peso inválido): no queda ningún error.
    fireEvent.click(quitarDe(filaN(1)))
    expect(erroresVisibles()).toEqual([])
    expect(total()).toHaveTextContent("Total: 60 %. Faltan 40 %.")
  })

  it("T-17 · quitar la primera fila con un error del servidor se lleva el error; agregar otra fila no lo trae de vuelta", async () => {
    stubApi(
      [
        { ...EXAMEN, peso: 50 },
        { ...TAREAS, peso: 50, tareas: 0 },
      ],
      () => errorDeApi(400, "VALIDACION", "categorias.0.nombre: Ya existe esa categoría"),
    )
    renderCategorias()
    await screen.findByDisplayValue("Tareas")
    guardar()
    expect(await within(filaN(0)).findByText("Ya existe esa categoría")).toBeInTheDocument()

    fireEvent.click(quitarDe(filaN(0)))
    expect(screen.queryByText("Ya existe esa categoría")).toBeNull()
    agregar()
    expect(screen.queryByText("Ya existe esa categoría")).toBeNull()
    expect(erroresVisibles()).toEqual([])
  })

  it("T-17 · el error de toda la lista sigue bajo el total al quitar una fila sin error", async () => {
    stubApi([EXAMEN, { ...TAREAS, tareas: 0 }])
    renderCategorias()
    await screen.findByDisplayValue("Tareas")
    fireEvent.change(pesoDe(filaN(1)), { target: { value: "30" } })
    agregar()
    fireEvent.change(nombreDe(filaN(2)), { target: { value: "Extra" } })
    fireEvent.change(pesoDe(filaN(2)), { target: { value: "5" } })
    guardar()
    expect(await screen.findByText("Los pesos deben sumar 100 %")).toBeInTheDocument()

    fireEvent.click(quitarDe(filaN(2)))
    expect(screen.getByText("Los pesos deben sumar 100 %")).toBeInTheDocument()
    expect(total()).toHaveTextContent("Total: 90 %. Faltan 10 %.")
  })

  it.each([
    ["Nombre", "nombre"],
    ["Peso", "peso"],
  ])(
    "T-18 · guardar con Enter desde el «%s» de una fila nueva deja el foco en ese mismo campo, también en un segundo guardado",
    async (_rotulo, campo) => {
      const servidor = stubApi([])
      renderCategorias()
      await screen.findByRole("button", { name: "Agregar categoría" })
      agregar()
      fireEvent.change(nombreDe(filaN(0)), { target: { value: "Examen" } })
      fireEvent.change(pesoDe(filaN(0)), { target: { value: "100" } })
      const elegido = () => (campo === "nombre" ? nombreDe(filaN(0)) : pesoDe(filaN(0)))
      const enfocado = elegido()
      act(() => enfocado.focus())
      fireEvent.submit(enfocado.closest("form") ?? document.body)

      await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
      await waitFor(() => expect(screen.getByText("0 tareas")).toBeInTheDocument())
      expect(elegido()).toHaveFocus()
      expect(elegido()).toBe(enfocado)

      fireEvent.submit(enfocado.closest("form") ?? document.body)
      await waitFor(() => expect(servidor.guardados()).toHaveLength(2))
      await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(2))
      expect(servidor.guardados()[1]?.cuerpo).toEqual({
        categorias: [{ id: idCategoria(50), nombre: "Examen", peso: 100 }],
      })
      expect(elegido()).toHaveFocus()
    },
  )

  it("T-18 · guardar con el foco en «Guardar categorías» lo deja ahí", async () => {
    stubApi([])
    renderCategorias()
    await screen.findByRole("button", { name: "Agregar categoría" })
    agregar()
    fireEvent.change(nombreDe(filaN(0)), { target: { value: "Examen" } })
    fireEvent.change(pesoDe(filaN(0)), { target: { value: "100" } })
    const boton = screen.getByRole("button", { name: "Guardar categorías" })
    act(() => boton.focus())
    fireEvent.click(boton)

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Categorías guardadas"))
    await waitFor(() => expect(screen.getByText("0 tareas")).toBeInTheDocument())
    expect(boton).toHaveFocus()
  })

  it("T-18 · tras un 409 que quita la fila nueva que tenía el foco, el foco va al primer campo de la lista y nunca a <body>", async () => {
    const servidor = stubApi([EXAMEN, { ...TAREAS, tareas: 0 }], () => {
      servidor.cambiarServidor([EXAMEN, TAREAS])
      return errorDeApi(
        409,
        "CATEGORIA_CON_TAREAS",
        "No puedes quitar «Tareas»: tiene 3 tareas. Muévelas a otra categoría primero.",
      )
    })
    renderCategorias()
    await screen.findByDisplayValue("Tareas")
    fireEvent.click(quitarDe(filaN(1)))
    agregar()
    fireEvent.change(nombreDe(filaN(1)), { target: { value: "Proyecto" } })
    const peso = pesoDe(filaN(1))
    fireEvent.change(peso, { target: { value: "40" } })
    act(() => peso.focus())
    fireEvent.submit(peso.closest("form") ?? document.body)

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByText("Tiene 3 tareas.")).toBeInTheDocument())
    expect(screen.queryByDisplayValue("Proyecto")).toBeNull()
    expect(nombreDe(filaN(0))).toHaveFocus()
    expect(document.activeElement).not.toBe(document.body)
  })
})

// TAREAS-01e, corrección de M-01 (revisión de la ronda 1): la lista que se guarda no cambia desde el
// mismo turno del envío; `guardar.isPending` llega un render después.
describe("CategoriasView: la lista no cambia desde el mismo turno del envío (M-01)", () => {
  const filaN = (n: number) => {
    const fila = filas()[n]
    if (fila === undefined) throw new Error(`no hay fila ${String(n)}`)
    return fila
  }

  // El PUT se retiene hasta que la prueba lo suelta; el GET responde la lista de inicio.
  const stubRetenido = (inicial: Categoria[]) => {
    const puts: unknown[] = []
    let soltar: (respuesta: Response) => void = () => undefined
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((_entrada, init) => {
        if ((init?.method ?? "GET") === "GET") {
          return Promise.resolve(respuestaJson(200, { categorias: inicial }))
        }
        puts.push(JSON.parse(String(init?.body)) as unknown)
        return new Promise<Response>((resolver) => {
          soltar = resolver
        })
      }),
    )
    return { puts, soltar: (respuesta: Response) => soltar(respuesta) }
  }

  it("M-01 · con el envío en vuelo, «Quitar», «Agregar», una tecla y un segundo Enter del mismo turno no cambian la lista ni mandan otro PUT; si falla, el error queda en su fila", async () => {
    const servidor = stubRetenido([
      { ...EXAMEN, peso: 50 },
      { ...TAREAS, peso: 50, tareas: 0 },
    ])
    renderCategorias()
    await screen.findByDisplayValue("Tareas")
    const formulario = screen.getByRole("button", { name: "Guardar categorías" }).closest("form")
    if (formulario === null) throw new Error("sin formulario")

    // El mismo turno: todo dentro de un solo act, sin un render de React en medio (isPending todavía
    // no llegó); solo la guarda síncrona lo detiene.
    const quitar = within(filaN(1)).getByRole("button", { name: /^Quitar/ })
    const agregar = screen.getByRole("button", { name: "Agregar categoría" })
    const peso = within(filaN(0)).getByRole("textbox", { name: /^Peso/ })
    act(() => {
      fireEvent.submit(formulario)
      fireEvent.click(quitar)
      fireEvent.click(agregar)
      fireEvent.change(peso, { target: { value: "70" } })
      fireEvent.submit(formulario)
    })

    expect(filas()).toHaveLength(2)
    expect(screen.getByDisplayValue("Tareas")).toBeInTheDocument()
    expect(within(filaN(0)).getByRole("textbox", { name: /^Peso/ })).toHaveValue("50")
    await waitFor(() => expect(servidor.puts).toHaveLength(1))

    servidor.soltar(errorDeApi(400, "VALIDACION", "categorias.1.nombre: Ya existe esa categoría"))
    expect(await within(filaN(1)).findByText("Ya existe esa categoría")).toBeInTheDocument()
    expect(servidor.puts).toHaveLength(1)

    // Ya asentado, la lista vuelve a cambiar.
    fireEvent.click(within(filaN(1)).getByRole("button", { name: /^Quitar/ }))
    expect(filas()).toHaveLength(1)
  })

  it("M-01 · con el envío en vuelo, «Quitar» del mismo turno no saca la fila y, si sale bien, la respuesta no la trae de vuelta sin que se vea", async () => {
    const servidor = stubRetenido([
      { ...EXAMEN, peso: 50 },
      { ...TAREAS, peso: 50, tareas: 0 },
    ])
    renderCategorias()
    await screen.findByDisplayValue("Tareas")
    // El mismo turno: todo dentro de un solo act, sin un render de React en medio (isPending todavía
    // no llegó); solo la guarda síncrona lo detiene.
    const guardar = screen.getByRole("button", { name: "Guardar categorías" })
    const quitar = within(filaN(1)).getByRole("button", { name: /^Quitar/ })
    act(() => {
      fireEvent.click(guardar)
      fireEvent.click(quitar)
    })
    expect(filas()).toHaveLength(2)

    await waitFor(() => expect(servidor.puts).toHaveLength(1))
    servidor.soltar(
      respuestaJson(200, {
        categorias: [
          { ...EXAMEN, peso: 50 },
          { ...TAREAS, peso: 50, tareas: 0 },
        ],
      }),
    )
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Categorías guardadas"))
    expect(servidor.puts).toEqual([
      {
        categorias: [
          { id: idCategoria(1), nombre: "Examen", peso: 50 },
          { id: idCategoria(2), nombre: "Tareas", peso: 50 },
        ],
      },
    ])
    expect(filas()).toHaveLength(2)
  })
})
