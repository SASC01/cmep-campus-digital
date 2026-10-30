import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ClaseLayout } from "./clase-layout"

// CLASES-03c1 (CL3-C01, CL3-C02 y CL3-C04): las secciones de la clase en las tres perspectivas y el
// indicador medido (DH-03, §D-7.2). jsdom no mide: cada opción de "Secciones de la clase" simula su
// posición y su ancho, y el panel su ancho visible.

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const NOMBRES = ["Avisos", "Actividades de aprendizaje", "Personas", "Calificaciones"]
const BASES = {
  estudiante: "/estudiante/clases",
  maestro: "/maestro/clases",
  admin: "/admin/clases",
} as const

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const stubClase = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) => {
      const ruta = String(entrada)
      if (ruta === `/api/clases/${CLASE_ID}`) {
        return Promise.resolve(
          respuestaJson(200, {
            clase: {
              id: CLASE_ID,
              nombre: "Álgebra I",
              descripcion: null,
              maestro: MAESTRO,
              maestros: [MAESTRO],
            },
          }),
        )
      }
      if (ruta === `/api/clases/${CLASE_ID}/codigo`) {
        return Promise.resolve(respuestaJson(200, { codigo: "ABCDEFG" }))
      }
      return Promise.resolve(
        respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } }),
      )
    }),
  )

const hijos = (rol: keyof typeof BASES) => [
  { index: true, element: <p>{`avisos ${rol}`}</p> },
  { path: "trabajo", element: <p>{`trabajo ${rol}`}</p> },
  { path: "personas", element: <p>{`personas ${rol}`}</p> },
  { path: "calificaciones", element: <p>{`calificaciones ${rol}`}</p> },
  { path: "categorias", element: <p>{`categorias ${rol}`}</p> },
  { path: "editar", element: <p>{`editar ${rol}`}</p> },
  { path: "tareas/:tareaId", element: <p>{`tarea ${rol}`}</p> },
]

const montar = (ruta: string) => {
  const router = createMemoryRouter(
    (Object.keys(BASES) as (keyof typeof BASES)[]).map((rol) => ({
      path: `${BASES[rol]}/:claseId`,
      element: <ClaseLayout />,
      children: hijos(rol),
    })),
    { initialEntries: [ruta] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

// Medidas simuladas: posición = índice × POSICION px y ancho = ANCHO_BASE + índice × 10 px. Se leen
// en cada consulta, así una prueba puede cambiarlas después de montar.
const medidas = { posicion: 100, anchoBase: 80, panel: 1000 }
const indiceEnSecciones = (elemento: HTMLElement) => {
  const lista = elemento.parentElement
  if (elemento.tagName !== "LI" || lista?.getAttribute("aria-label") !== "Secciones de la clase")
    return -1
  return Array.from(lista.children).indexOf(elemento)
}
const esElPanel = (elemento: HTMLElement) =>
  elemento.getAttribute("data-slot") === "card" &&
  elemento.querySelector('[aria-label="Secciones de la clase"]') !== null

beforeEach(() => {
  establecerToken("token-de-prueba")
  medidas.posicion = 100
  medidas.anchoBase = 80
  medidas.panel = 1000
  vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    const i = indiceEnSecciones(this)
    return i < 0 ? 0 : i * medidas.posicion
  })
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    const i = indiceEnSecciones(this)
    return i < 0 ? 0 : medidas.anchoBase + i * 10
  })
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return esElPanel(this) ? medidas.panel : 0
  })
})

afterEach(() => {
  limpiarToken()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const secciones = () => screen.findByRole("list", { name: "Secciones de la clase" })
const indicadorDe = (lista: HTMLElement) =>
  lista.parentElement?.querySelector<HTMLElement>(':scope > [aria-hidden="true"]') ?? null
const medidasDe = (indicador: HTMLElement | null) => ({
  x: indicador?.style.getPropertyValue("--indicador-x") ?? null,
  ancho: indicador?.style.getPropertyValue("--indicador-ancho") ?? null,
})
const esperadas = (i: number) => ({
  x: `${String(i * medidas.posicion)}px`,
  ancho: `${String(medidas.anchoBase + i * 10)}px`,
})

describe("secciones de la clase (CL3-C01)", () => {
  it.each(["estudiante", "maestro", "admin"] as const)(
    "CL3-C01: %s ve las cuatro secciones en orden, sin «Foro», y la activa lleva aria-current y text-link",
    async (rol) => {
      stubClase()
      montar(`${BASES[rol]}/${CLASE_ID}/personas`)
      const lista = await secciones()
      const enlaces = within(lista).getAllByRole("link")
      expect(enlaces.map((enlace) => enlace.textContent)).toEqual(NOMBRES)
      expect(within(lista).queryByRole("link", { name: "Foro" })).toBeNull()
      const activa = within(lista).getByRole("link", { name: "Personas" })
      expect(activa).toHaveAttribute("aria-current", "page")
      expect(activa).toHaveClass("text-link")
      expect(activa).toHaveAttribute("href", `${BASES[rol]}/${CLASE_ID}/personas`)
      for (const otro of enlaces.filter((enlace) => enlace !== activa)) {
        expect(otro).not.toHaveAttribute("aria-current")
        expect(otro).not.toHaveClass("text-link")
      }
    },
  )
})

describe("indicador medido de las secciones (CL3-C02)", () => {
  it("CL3-C02: lleva la posición y el ancho de la opción activa, y cambian al navegar a otra sección", async () => {
    stubClase()
    montar(`${BASES.maestro}/${CLASE_ID}/trabajo`)
    const lista = await secciones()
    const indicador = indicadorDe(lista)
    expect(indicador).not.toBeNull()
    await waitFor(() => expect(medidasDe(indicador)).toEqual(esperadas(1)))

    fireEvent.click(within(lista).getByRole("link", { name: "Calificaciones" }))
    expect(await screen.findByText("calificaciones maestro")).toBeInTheDocument()
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(3)))

    fireEvent.click(within(lista).getByRole("link", { name: "Avisos" }))
    expect(await screen.findByText("avisos maestro")).toBeInTheDocument()
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(0)))
  })

  it("CL3-C02: usa las dos variables medidas, el color del contexto opaco y sin animación con movimiento reducido", async () => {
    stubClase()
    montar(`${BASES.admin}/${CLASE_ID}`)
    const indicador = indicadorDe(await secciones())
    expect(indicador).toHaveClass(
      "translate-x-(--indicador-x)",
      "w-(--indicador-ancho)",
      "transition-transform",
      "in-data-[material=opaco]:bg-accent-soft",
      "motion-reduce:transition-none",
    )
  })

  it.each([
    ["«Editar clase»", `${BASES.admin}/${CLASE_ID}/editar`, "editar admin"],
    [
      "«Categorías de calificación»",
      `${BASES.maestro}/${CLASE_ID}/categorias`,
      "categorias maestro",
    ],
    [
      "el detalle de una tarea",
      `${BASES.estudiante}/${CLASE_ID}/tareas/${TAREA_ID}`,
      "tarea estudiante",
    ],
  ])("CL3-C02: en %s no hay indicador ni sección activa", async (_, ruta, contenido) => {
    stubClase()
    montar(ruta)
    expect(await screen.findByText(contenido)).toBeInTheDocument()
    const lista = await secciones()
    expect(indicadorDe(lista)).toBeNull()
    expect(within(lista).queryByRole("link", { current: "page" })).toBeNull()
  })

  it("CL3-C02: un ResizeObserver vuelve a medir sin desplazar el panel", async () => {
    const avisos: (() => void)[] = []
    const desconectar = vi.fn()
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(alCambiar: () => void) {
          avisos.push(alCambiar)
        }
        observe() {}
        disconnect() {
          desconectar()
        }
      },
    )
    stubClase()
    montar(`${BASES.estudiante}/${CLASE_ID}/personas`)
    const lista = await secciones()
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(2)))
    expect(avisos.length).toBeGreaterThan(0)
    const panel = lista.closest<HTMLElement>('[data-slot="card"]')
    if (panel === null) throw new Error("Precondición: el panel de las secciones")
    panel.scrollLeft = 37

    // Cambian las fuentes o el ancho: las opciones miden otra cosa.
    medidas.posicion = 130
    medidas.anchoBase = 95
    act(() => {
      for (const avisar of avisos) avisar()
    })
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(2)))
    expect(medidasDe(indicadorDe(lista))).toEqual({ x: "260px", ancho: "115px" })
    expect(panel.scrollLeft).toBe(37)
  })

  it("CL3-C02: la carga de las fuentes vuelve a medir; sin ResizeObserver ni document.fonts no falla", async () => {
    expect(typeof ResizeObserver).toBe("undefined")
    expect("fonts" in document).toBe(false)
    stubClase()
    montar(`${BASES.estudiante}/${CLASE_ID}/trabajo`)
    const lista = await secciones()
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(1)))

    let fuentesListas: () => void = () => undefined
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: new Promise<void>((resolver) => (fuentesListas = resolver)) },
    })
    try {
      fireEvent.click(within(lista).getByRole("link", { name: "Personas" }))
      expect(await screen.findByText("personas estudiante")).toBeInTheDocument()
      await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(2)))
      medidas.anchoBase = 120
      await act(async () => {
        fuentesListas()
        await Promise.resolve()
      })
      await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(2)))
      expect(medidasDe(indicadorDe(lista)).ancho).toBe("140px")
    } finally {
      Reflect.deleteProperty(document, "fonts")
    }
  })
})

describe("la sección activa a la vista (CL3-C04)", () => {
  it("CL3-C04: al entrar con una sección que no cabe, el panel desplaza su scrollLeft para dejarla a la vista; la página no se desplaza", async () => {
    // El panel deja ver 250 px; «Calificaciones» ocupa de 300 a 410 px.
    medidas.panel = 250
    const desplazarPagina = vi.fn()
    vi.stubGlobal("scrollTo", desplazarPagina)
    const llevarALaVista = vi.fn()
    HTMLElement.prototype.scrollIntoView = llevarALaVista
    try {
      stubClase()
      montar(`${BASES.maestro}/${CLASE_ID}/calificaciones`)
      const lista = await secciones()
      const panel = lista.closest<HTMLElement>('[data-slot="card"]')
      if (panel === null) throw new Error("Precondición: el panel de las secciones")
      await waitFor(() => expect(panel.scrollLeft).toBe(410 - 250))
      expect(desplazarPagina).not.toHaveBeenCalled()
      expect(llevarALaVista).not.toHaveBeenCalled()
      expect(window.scrollY).toBe(0)
    } finally {
      Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView")
    }
  })

  it("CL3-C04: con la sección activa a la vista, el panel no se desplaza", async () => {
    medidas.panel = 250
    stubClase()
    montar(`${BASES.maestro}/${CLASE_ID}/trabajo`)
    const lista = await secciones()
    const panel = lista.closest<HTMLElement>('[data-slot="card"]')
    if (panel === null) throw new Error("Precondición: el panel de las secciones")
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(1)))
    expect(panel.scrollLeft).toBe(0)
  })
})
