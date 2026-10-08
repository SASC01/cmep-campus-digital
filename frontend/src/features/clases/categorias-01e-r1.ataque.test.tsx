import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { CategoriasView } from "./categorias-view"

// Ataque del Tester, TAREAS-01e, ronda 1: "Categorías de calificación" (§D-11, S-06, P-01 a; DESIGN
// §7.23). Sin selectores de clase: rol, etiqueta y texto accesible.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

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

type AlGuardar = (cuerpo: unknown, llamada: number) => Response | Promise<Response>

const guardarComoServidor: AlGuardar = (cuerpo) => {
  const { categorias } = cuerpo as { categorias: { id?: string; nombre: string; peso: number }[] }
  return respuestaJson(200, {
    categorias: categorias.map((categoria, i) => ({
      id: categoria.id ?? idCategoria(50 + i),
      nombre: categoria.nombre,
      peso: categoria.peso,
      tareas: 0,
    })),
  })
}

const stubApi = (
  inicial: Categoria[],
  alGuardar: AlGuardar = guardarComoServidor,
  alLeer?: (lectura: number) => Response | undefined,
) => {
  const metodos: string[] = []
  let guardados = 0
  let lecturas = 0
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const metodo = init?.method ?? "GET"
      metodos.push(metodo)
      if (String(entrada) !== `/api/clases/${CLASE_ID}/categorias`) {
        return Promise.resolve(errorDeApi(500, "ERROR_INTERNO", "sin manejador"))
      }
      if (metodo === "GET") {
        lecturas += 1
        return Promise.resolve(alLeer?.(lecturas) ?? respuestaJson(200, { categorias: inicial }))
      }
      guardados += 1
      const cuerpo = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : null
      return Promise.resolve(alGuardar(cuerpo, guardados))
    }),
  )
  return {
    puts: () => metodos.filter((m) => m === "PUT").length,
    lecturas: () => lecturas,
  }
}

const renderCategorias = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/maestro/clases/${CLASE_ID}/categorias`]}>
        <Routes>
          <Route path="/maestro/clases/:claseId/categorias" element={<CategoriasView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return queryClient
}

const filas = () =>
  screen.getAllByRole("textbox", { name: /^Nombre de la categoría/ }).map((campo) => {
    const fila = campo.closest("[data-llave]")
    if (!(fila instanceof HTMLElement)) throw new Error("campo sin fila")
    return fila
  })
const nombreDe = (fila: HTMLElement) => within(fila).getByRole("textbox", { name: /^Nombre/ })
const pesoDe = (fila: HTMLElement) => within(fila).getByRole("textbox", { name: /^Peso/ })
const fila = (n: number) => {
  const encontrada = filas()[n]
  if (encontrada === undefined) throw new Error(`no hay fila ${String(n)}`)
  return encontrada
}
const agregar = () => fireEvent.click(screen.getByRole("button", { name: "Agregar categoría" }))
const guardar = () => fireEvent.click(screen.getByRole("button", { name: "Guardar categorías" }))

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

describe("ataque TAREAS-01e r1: los errores de una fila que se quitó", () => {
  it("quitar la fila con el error del cliente lo hace desaparecer: no reaparece bajo el total como error de la lista", async () => {
    const servidor = stubApi([EXAMEN])
    renderCategorias()
    await screen.findByDisplayValue("Examen")
    agregar()
    fireEvent.change(pesoDe(fila(1)), { target: { value: "40" } })
    guardar()
    const campo = nombreDe(fila(1))
    await waitFor(() => expect(campo).toHaveAttribute("aria-invalid", "true"))
    const descripcion = campo.getAttribute("aria-describedby") ?? ""
    const mensaje = document.getElementById(descripcion)?.textContent ?? ""
    expect(mensaje, "el campo vacío no mostró su error").not.toBe("")
    expect(servidor.puts()).toBe(0)

    fireEvent.click(within(fila(1)).getByRole("button", { name: /^Quitar/ }))

    expect(filas()).toHaveLength(1)
    expect(screen.queryAllByText(mensaje)).toEqual([])
  })

  it("quitar la fila con el error del servidor (VALIDACION categorias.1.peso) lo hace desaparecer: no reaparece bajo el total", async () => {
    stubApi([EXAMEN, { ...EXAMEN, id: idCategoria(2), nombre: "Tareas", peso: 40 }], () =>
      errorDeApi(400, "VALIDACION", "categorias.1.peso: El peso no es válido"),
    )
    renderCategorias()
    await screen.findByDisplayValue("Tareas")
    guardar()
    expect(await within(fila(1)).findByText("El peso no es válido")).toBeInTheDocument()

    fireEvent.click(within(fila(1)).getByRole("button", { name: /^Quitar/ }))

    expect(filas()).toHaveLength(1)
    expect(screen.queryAllByText("El peso no es válido")).toEqual([])
  })
})

describe("ataque TAREAS-01e r1: el foco al guardar con Enter desde una fila nueva", () => {
  it("guardar con el foco en el «Peso» de una fila nueva: al adoptar el id que dio el servidor, el foco no cae en <body>", async () => {
    stubApi([])
    renderCategorias()
    await screen.findByRole("button", { name: "Agregar categoría" })
    agregar()
    fireEvent.change(nombreDe(fila(0)), { target: { value: "Examen" } })
    const peso = pesoDe(fila(0))
    fireEvent.change(peso, { target: { value: "100" } })
    act(() => peso.focus())
    const formulario = peso.closest("form")
    if (formulario === null) throw new Error("el campo no está en un formulario")
    fireEvent.submit(formulario)
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Categorías guardadas"))
    await waitFor(() => expect(screen.getByText("0 tareas")).toBeInTheDocument())
    expect(document.activeElement).not.toBe(document.body)
  })
})

describe("ataque TAREAS-01e r1: pesos, tope y doble clic (sin hallazgo esperado)", () => {
  it("«50%» y « 50 % » suman 100 y viajan como 50 y 50; «1e2», «50.5», «0», «-5», «\u0665\u0660» y «50%%» no se envían", async () => {
    const guardados: unknown[] = []
    stubApi([EXAMEN], (cuerpo) => {
      guardados.push(cuerpo)
      return guardarComoServidor(cuerpo, 1)
    })
    renderCategorias()
    await screen.findByDisplayValue("Examen")
    agregar()
    fireEvent.change(nombreDe(fila(1)), { target: { value: "Proyecto" } })
    for (const malo of ["1e2", "50.5", "0", "-5", "\u0665\u0660", "50%%"]) {
      fireEvent.change(pesoDe(fila(0)), { target: { value: "50%" } })
      fireEvent.change(pesoDe(fila(1)), { target: { value: malo } })
      guardar()
      await waitFor(() => expect(pesoDe(fila(1))).toHaveAttribute("aria-invalid", "true"))
    }
    expect(guardados).toEqual([])
    fireEvent.change(pesoDe(fila(1)), { target: { value: " 50 % " } })
    expect(screen.getByRole("status")).toHaveTextContent("Total: 100 %")
    guardar()
    await waitFor(() => expect(guardados).toHaveLength(1))
    expect(guardados[0]).toEqual({
      categorias: [
        { id: idCategoria(1), nombre: "Examen", peso: 50 },
        { nombre: "Proyecto", peso: 50 },
      ],
    })
  })

  it("con 11 filas que suman 100 no se envía nada y el error queda bajo el total", async () => {
    const servidor = stubApi([])
    renderCategorias()
    await screen.findByRole("button", { name: "Agregar categoría" })
    for (let i = 0; i < 11; i += 1) agregar()
    expect(filas()).toHaveLength(11)
    filas().forEach((f, i) => {
      fireEvent.change(nombreDe(f), { target: { value: `Categoría ${String(i + 1)}` } })
      fireEvent.change(pesoDe(f), { target: { value: i < 10 ? "9" : "10" } })
    })
    expect(screen.getByRole("status")).toHaveTextContent("Total: 100 %")
    guardar()
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(servidor.puts()).toBe(0)
    const invalidos = screen
      .queryAllByRole("textbox")
      .filter((campo) => campo.getAttribute("aria-invalid") === "true")
    const mensajesVisibles = document.querySelectorAll("[id$='-lista-error']").length
    expect([invalidos.length > 0, mensajesVisibles > 0]).toContain(true)
  })

  it("doble clic humano (30 ms) en «Guardar categorías» manda un solo PUT", async () => {
    let soltar: (r: Response) => void = () => undefined
    const servidor = stubApi(
      [{ ...EXAMEN, peso: 100 }],
      () =>
        new Promise<Response>((resolver) => {
          soltar = resolver
        }),
    )
    renderCategorias()
    await screen.findByDisplayValue("Examen")
    guardar()
    await act(() => new Promise((r) => setTimeout(r, 30)))
    guardar()
    await act(() => new Promise((r) => setTimeout(r, 30)))
    expect(servidor.puts()).toBe(1)
    await act(async () => {
      soltar(respuestaJson(200, { categorias: [{ ...EXAMEN, peso: 100 }] }))
      await Promise.resolve()
    })
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    expect(servidor.puts()).toBe(1)
  })

  it("una recarga fallida con la lista en caché conserva lo escrito y avisa una vez", async () => {
    stubApi([EXAMEN], guardarComoServidor, (lectura) =>
      lectura >= 2 ? errorDeApi(500, "ERROR_INTERNO", "x") : undefined,
    )
    const cliente = renderCategorias()
    await screen.findByDisplayValue("Examen")
    fireEvent.change(nombreDe(fila(0)), { target: { value: "Examen final" } })
    await act(() => cliente.refetchQueries({ type: "active" }))
    await waitFor(() => expect(cliente.isFetching()).toBe(0))
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(screen.getByDisplayValue("Examen final")).toBeInTheDocument()
  })
})
