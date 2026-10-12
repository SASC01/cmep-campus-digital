import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { CategoriasView } from "./categorias-view"

// Ataque del Tester, TAREAS-01e, ronda 2: bordes de T-17 (errores al quitar), T-18 (llave estable y
// foco al adoptar la respuesta) y M-01 (la guarda síncrona se libera tras un error). Sin selectores de
// clase.

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

type CuerpoEnviado = { categorias: { id?: string; nombre: string; peso: number }[] }

const comoServidor = (cuerpo: CuerpoEnviado, invertir = false) => {
  const categorias = cuerpo.categorias.map((categoria, i) => ({
    id: categoria.id ?? idCategoria(50 + i),
    nombre: categoria.nombre,
    peso: categoria.peso,
    tareas: 0,
  }))
  return respuestaJson(200, { categorias: invertir ? [...categorias].reverse() : categorias })
}

const stubApi = (
  inicial: Categoria[],
  alGuardar: (cuerpo: CuerpoEnviado, n: number) => Response,
) => {
  let puts = 0
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const metodo = init?.method ?? "GET"
      if (String(entrada) !== `/api/clases/${CLASE_ID}/categorias`) {
        return Promise.resolve(errorDeApi(500, "ERROR_INTERNO", "sin manejador"))
      }
      if (metodo === "GET") return Promise.resolve(respuestaJson(200, { categorias: inicial }))
      puts += 1
      return Promise.resolve(alGuardar(JSON.parse(String(init?.body)) as CuerpoEnviado, puts))
    }),
  )
  return { puts: () => puts }
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
}

const filas = () =>
  screen.getAllByRole("textbox", { name: /^Nombre de la categoría/ }).map((campo) => {
    const fila = campo.closest("[data-llave]")
    if (!(fila instanceof HTMLElement)) throw new Error("campo sin fila")
    return fila
  })
const fila = (n: number) => {
  const encontrada = filas()[n]
  if (encontrada === undefined) throw new Error(`no hay fila ${String(n)}`)
  return encontrada
}
const nombreDe = (f: HTMLElement) => within(f).getByRole("textbox", { name: /^Nombre/ })
const pesoDe = (f: HTMLElement) => within(f).getByRole("textbox", { name: /^Peso/ })
const agregar = () => fireEvent.click(screen.getByRole("button", { name: "Agregar categoría" }))
const guardar = () => fireEvent.click(screen.getByRole("button", { name: "Guardar categorías" }))
const llenar = (n: number, nombre: string, peso: string) => {
  fireEvent.change(nombreDe(fila(n)), { target: { value: nombre } })
  fireEvent.change(pesoDe(fila(n)), { target: { value: peso } })
}

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

describe("ataque TAREAS-01e r2: T-17, quitar una fila sin error (sin hallazgo esperado)", () => {
  it("con errores en la 1.\u00AA y la 3.\u00AA, quitar la 2.\u00AA (sin error) deja cada error en su fila", async () => {
    stubApi([], (cuerpo) => comoServidor(cuerpo))
    renderCategorias()
    await screen.findByRole("button", { name: "Agregar categoría" })
    agregar()
    agregar()
    agregar()
    llenar(0, "", "30")
    llenar(1, "Tareas", "40")
    llenar(2, "Proyecto", "")
    guardar()
    await waitFor(() => expect(nombreDe(fila(0))).toHaveAttribute("aria-invalid", "true"))
    expect(pesoDe(fila(2))).toHaveAttribute("aria-invalid", "true")
    expect([nombreDe(fila(1)), pesoDe(fila(1))].map((c) => c.getAttribute("aria-invalid"))).toEqual(
      ["false", "false"],
    )
    fireEvent.click(within(fila(1)).getByRole("button", { name: /^Quitar/ }))
    expect(filas()).toHaveLength(2)
    expect(nombreDe(fila(0))).toHaveAttribute("aria-invalid", "true")
    expect(nombreDe(fila(1))).toHaveValue("Proyecto")
    expect(pesoDe(fila(1))).toHaveAttribute("aria-invalid", "true")
    expect(nombreDe(fila(1))).toHaveAttribute("aria-invalid", "false")
  })
})

describe("ataque TAREAS-01e r2: T-18, la respuesta reemplaza la lista (sin hallazgo esperado)", () => {
  it("dos filas nuevas que el servidor devuelve en otro orden: cada valor sigue en su fila y el foco sigue en el «Peso» de «Beta»", async () => {
    stubApi([], (cuerpo) => comoServidor(cuerpo, true))
    renderCategorias()
    await screen.findByRole("button", { name: "Agregar categoría" })
    agregar()
    agregar()
    llenar(0, "Alfa", "30")
    llenar(1, "Beta", "70")
    const peso = pesoDe(fila(1))
    act(() => peso.focus())
    const formulario = peso.closest("form")
    if (formulario === null) throw new Error("sin formulario")
    fireEvent.submit(formulario)
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Categorías guardadas"))
    await waitFor(() => expect(screen.getAllByText("0 tareas")).toHaveLength(2))
    const pares = filas().map((f) => [
      nombreDe(f).getAttribute("value") ?? (nombreDe(f) as HTMLInputElement).value,
      (pesoDe(f) as HTMLInputElement).value,
    ])
    expect(pares).toEqual([
      ["Beta", "70"],
      ["Alfa", "30"],
    ])
    expect(document.activeElement).not.toBe(document.body)
    const activo = document.activeElement
    const filaActiva = activo instanceof HTMLElement ? activo.closest("[data-llave]") : null
    expect(
      filaActiva === null ? null : (nombreDe(filaActiva as HTMLElement) as HTMLInputElement).value,
    ).toBe("Beta")
  })

  it("guardar con el foco fuera de las filas («Agregar categoría») lo deja ahí", async () => {
    stubApi([{ id: idCategoria(1), nombre: "Examen", peso: 100, tareas: 0 }], (cuerpo) =>
      comoServidor(cuerpo),
    )
    renderCategorias()
    await screen.findByDisplayValue("Examen")
    const agregarBoton = screen.getByRole("button", { name: "Agregar categoría" })
    act(() => agregarBoton.focus())
    const formulario = agregarBoton.closest("form")
    if (formulario === null) throw new Error("sin formulario")
    fireEvent.submit(formulario)
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Categorías guardadas"))
    expect(agregarBoton).toHaveFocus()
  })

  it("una fila nueva con el nombre de una guardada (otra capitalización y acentos) no se envía: el error lo marca el cliente", async () => {
    const servidor = stubApi(
      [{ id: idCategoria(1), nombre: "Examen", peso: 50, tareas: 0 }],
      (cuerpo) => comoServidor(cuerpo),
    )
    renderCategorias()
    await screen.findByDisplayValue("Examen")
    agregar()
    llenar(1, "  ÉXAMEN ", "50")
    guardar()
    await act(() => new Promise((r) => setTimeout(r, 20)))
    expect(servidor.puts()).toBe(0)
    const invalidos = screen
      .getAllByRole("textbox")
      .filter((c) => c.getAttribute("aria-invalid") === "true").length
    const textoBajoElTotal = document.querySelector("[id$='-lista-error']")
    expect(invalidos > 0 || textoBajoElTotal !== null).toBe(true)
  })
})

describe("ataque TAREAS-01e r2: M-01, la guarda se libera tras un error (sin hallazgo esperado)", () => {
  it("un 500 al guardar avisa y libera la guarda: se puede escribir y el segundo «Guardar categorías» manda otro PUT", async () => {
    const servidor = stubApi(
      [{ id: idCategoria(1), nombre: "Examen", peso: 100, tareas: 0 }],
      (cuerpo, n) =>
        n === 1 ? errorDeApi(500, "ERROR_INTERNO", "Error interno") : comoServidor(cuerpo),
    )
    renderCategorias()
    await screen.findByDisplayValue("Examen")
    guardar()
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    await act(() => new Promise((r) => setTimeout(r, 10)))
    fireEvent.change(nombreDe(fila(0)), { target: { value: "Examen final" } })
    expect(nombreDe(fila(0))).toHaveValue("Examen final")
    guardar()
    await waitFor(() => expect(servidor.puts()).toBe(2))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Categorías guardadas"))
  })
})
