import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ClaseLayout } from "./clase-layout"

// CLASES-03c1, ronda 1 del tester (adenda 1, tras el arbitraje de T-02): el indicador medido de
// "Secciones de la clase" (§D-7.2, DH-03). jsdom no mide, así que este archivo simula la geometría con
// un solo modelo, coherente en todas las lecturas con que un remedio podría medir:
// - El panel (la Card) empieza en x = X_DEL_PANEL de la ventana, tiene un borde de BORDE_DEL_PANEL px
//   (clientLeft y border-left-width) y un relleno de `medidas.relleno` px (el relleno calculado de
//   getComputedStyle), y deja ver `medidas.panel` px (clientWidth).
// - Dentro del área desplazable del panel, el contenedor del <ul> y el <ul> empiezan después del
//   relleno; cada <li> se mide desde el <ul> (offsetLeft = índice × posición; ancho = base + índice × 10).
// - getBoundingClientRect del panel, del contenedor, del <ul>, de cada <li> (y de lo que lleva dentro)
//   y del indicador sale de esos desplazamientos y del scrollLeft del momento; scrollWidth del panel
//   suma el relleno de los dos lados; offsetLeft del panel y del contenedor comparten offsetParent.
// Con relleno 0, el modelo da lo mismo que el de CL3-C04 (secciones-03c1.test.tsx), donde jsdom deja
// el relleno calculado, el borde y los rectángulos en 0.

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const OTRA_CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const BASES = {
  estudiante: "/estudiante/clases",
  maestro: "/maestro/clases",
  admin: "/admin/clases",
} as const
const LISTA = '[aria-label="Secciones de la clase"]'
const X_DEL_PANEL = 24
const BORDE_DEL_PANEL = 1
const ALTO = 36

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const stubClases = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) => {
      const ruta = String(entrada)
      for (const id of [CLASE_ID, OTRA_CLASE_ID]) {
        if (ruta === `/api/clases/${id}`) {
          return Promise.resolve(
            respuestaJson(200, {
              clase: {
                id,
                nombre: id === CLASE_ID ? "Álgebra I" : "Historia",
                descripcion: null,
                maestro: MAESTRO,
                maestros: [MAESTRO],
              },
            }),
          )
        }
        if (ruta === `/api/clases/${id}/codigo`) {
          return Promise.resolve(respuestaJson(200, { codigo: "ABCDEFG" }))
        }
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
  { path: "editar", element: <p>{`editar ${rol}`}</p> },
]

const montar = (entradas: string[], indice = entradas.length - 1) => {
  const router = createMemoryRouter(
    (Object.keys(BASES) as (keyof typeof BASES)[]).map((rol) => ({
      path: `${BASES[rol]}/:claseId`,
      element: <ClaseLayout />,
      children: hijos(rol),
    })),
    { initialEntries: entradas, initialIndex: indice },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const vista = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, vista }
}

// Medidas simuladas (se leen en cada consulta). `alMedir` deja ver qué tenía el indicador en el
// momento en que el código lee la geometría de las secciones (en el navegador, cualquiera de esas
// lecturas fuerza el cálculo de estilos).
const medidas = { posicion: 100, anchoBase: 80, panel: 1000, relleno: 4 }
let alMedir: (() => void) | null = null

const esLaLista = (elemento: Element): elemento is HTMLUListElement =>
  elemento.tagName === "UL" && elemento.getAttribute("aria-label") === "Secciones de la clase"
const indiceEnSecciones = (elemento: HTMLElement) => {
  const lista = elemento.parentElement
  if (elemento.tagName !== "LI" || lista === null || !esLaLista(lista)) return -1
  return Array.from(lista.children).indexOf(elemento)
}
const esElPanel = (elemento: HTMLElement) =>
  elemento.getAttribute("data-slot") === "card" && elemento.querySelector(LISTA) !== null
const esElContenedor = (elemento: HTMLElement) =>
  Array.from(elemento.children).some(esLaLista) && !esElPanel(elemento)
const anchoDeLaLista = (lista: Element) => {
  const n = lista.children.length
  return n === 0 ? 0 : (n - 1) * medidas.posicion + medidas.anchoBase + (n - 1) * 10
}

interface Caja {
  left: number
  width: number
}

// La caja de un elemento del modelo en la ventana, o null si no es de las secciones.
const cajaDe = (elemento: HTMLElement): Caja | null => {
  if (esElPanel(elemento)) {
    return { left: X_DEL_PANEL, width: medidas.panel + 2 * BORDE_DEL_PANEL }
  }
  const panel = elemento.closest<HTMLElement>('[data-slot="card"]')
  if (panel === null || !esElPanel(panel)) return null
  const inicio = X_DEL_PANEL + BORDE_DEL_PANEL + medidas.relleno - panel.scrollLeft
  const lista = panel.querySelector(LISTA)
  if (lista === null) return null
  if (esLaLista(elemento) || esElContenedor(elemento)) {
    return { left: inicio, width: anchoDeLaLista(lista) }
  }
  const opcion = elemento.closest("li")
  if (opcion !== null && indiceEnSecciones(opcion) >= 0) {
    const i = indiceEnSecciones(opcion)
    return { left: inicio + i * medidas.posicion, width: medidas.anchoBase + i * 10 }
  }
  if (elemento.getAttribute("aria-hidden") === "true" && elemento.parentElement !== null) {
    if (!esElContenedor(elemento.parentElement)) return null
    const x = Number.parseFloat(elemento.style.getPropertyValue("--indicador-x"))
    const ancho = Number.parseFloat(elemento.style.getPropertyValue("--indicador-ancho"))
    return {
      left: inicio + (Number.isNaN(x) ? 0 : x),
      width: Number.isNaN(ancho) ? 0 : ancho,
    }
  }
  return null
}

const rectangulo = ({ left, width }: Caja): DOMRect => ({
  x: left,
  y: 0,
  left,
  top: 0,
  width,
  height: ALTO,
  right: left + width,
  bottom: ALTO,
  toJSON: () => ({ left, width }),
})

const nombreEnCamello = (nombre: string) =>
  nombre.replace(/-([a-z])/g, (_, letra: string) => letra.toUpperCase())

// El estilo calculado del panel con su relleno y su borde; lo demás, el de jsdom.
const estiloDelPanel = (estilo: CSSStyleDeclaration): CSSStyleDeclaration => {
  const relleno = `${String(medidas.relleno)}px`
  const borde = `${String(BORDE_DEL_PANEL)}px`
  const valores: Record<string, string> = {
    padding: relleno,
    "padding-left": relleno,
    "padding-right": relleno,
    "padding-inline-start": relleno,
    "padding-inline-end": relleno,
    "border-left-width": borde,
    "border-right-width": borde,
    "border-inline-start-width": borde,
    "border-inline-end-width": borde,
  }
  const porPropiedad = new Map(
    Object.entries(valores).map(([nombre, valor]) => [nombreEnCamello(nombre), valor]),
  )
  return new Proxy(estilo, {
    get(objetivo, propiedad) {
      if (propiedad === "getPropertyValue") {
        return (nombre: string) => valores[nombre] ?? objetivo.getPropertyValue(nombre)
      }
      if (typeof propiedad === "string" && porPropiedad.has(propiedad)) {
        return porPropiedad.get(propiedad)
      }
      const valor: unknown = Reflect.get(objetivo, propiedad, objetivo)
      return typeof valor === "function" ? (valor as () => unknown).bind(objetivo) : valor
    },
  })
}

beforeEach(() => {
  establecerToken("token-de-prueba")
  medidas.posicion = 100
  medidas.anchoBase = 80
  medidas.panel = 1000
  medidas.relleno = 4
  alMedir = null
  const rectanguloDeJsdom = HTMLElement.prototype.getBoundingClientRect
  const estiloDeJsdom = window.getComputedStyle.bind(window)
  vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    const i = indiceEnSecciones(this)
    if (i >= 0) {
      alMedir?.()
      return i * medidas.posicion
    }
    if (esElPanel(this)) {
      alMedir?.()
      return X_DEL_PANEL
    }
    if (esElContenedor(this)) {
      alMedir?.()
      return X_DEL_PANEL + BORDE_DEL_PANEL + medidas.relleno
    }
    return 0
  })
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    const caja = cajaDe(this)
    if (caja === null) return 0
    alMedir?.()
    return caja.width
  })
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    if (esElPanel(this)) {
      alMedir?.()
      return medidas.panel
    }
    const caja = cajaDe(this)
    return caja === null ? 0 : caja.width
  })
  vi.spyOn(HTMLElement.prototype, "clientLeft", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return esElPanel(this) ? BORDE_DEL_PANEL : 0
  })
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    if (esElPanel(this)) {
      const lista = this.querySelector(LISTA)
      const contenido = lista === null ? 0 : anchoDeLaLista(lista)
      return Math.max(medidas.panel, contenido + 2 * medidas.relleno)
    }
    const caja = cajaDe(this)
    return caja === null ? 0 : caja.width
  })
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    const caja = cajaDe(this)
    if (caja === null) return rectanguloDeJsdom.call(this)
    alMedir?.()
    return rectangulo(caja)
  })
  vi.spyOn(window, "getComputedStyle").mockImplementation(
    (elemento: Element, pseudo?: string | null) => {
      const estilo = estiloDeJsdom(elemento, pseudo)
      if (!(elemento instanceof HTMLElement) || !esElPanel(elemento)) return estilo
      return estiloDelPanel(estilo)
    },
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Reflect.deleteProperty(document, "fonts")
})

const secciones = () => screen.findByRole("list", { name: "Secciones de la clase" })
const indicadorDe = (lista: HTMLElement) =>
  lista.parentElement?.querySelector<HTMLElement>(':scope > [aria-hidden="true"]') ?? null
const medidasDe = (indicador: HTMLElement | null) => ({
  x: indicador?.style.getPropertyValue("--indicador-x") ?? null,
  ancho: indicador?.style.getPropertyValue("--indicador-ancho") ?? null,
})
// CLASES-03d ronda 0, adenda 1 (C-8 ampliada por el arbitraje de la ronda 0 de 03d; §D-7.1): con
// «Recursos» en el índice 2, «Personas» pasa del índice 2 al 3 y «Calificaciones» del 3 al 4 (posición
// simulada "300px" → "400px"); «Avisos» (0) y «Actividades de aprendizaje» (1) no cambian. Siguen
// protegiendo lo mismo: el ciclo de vida del indicador, no la posición de cada sección.
const esperadas = (i: number) => ({
  x: `${String(i * medidas.posicion)}px`,
  ancho: `${String(medidas.anchoBase + i * 10)}px`,
})
const panelDe = (lista: HTMLElement) => {
  const panel = lista.closest<HTMLElement>('[data-slot="card"]')
  if (panel === null) throw new Error("Precondición: el panel de las secciones")
  return panel
}
const opcionDe = (lista: HTMLElement, i: number) => {
  const opcion = lista.children[i]
  if (!(opcion instanceof HTMLElement)) throw new Error(`Precondición: la opción ${String(i)}`)
  return opcion
}
// Cuántos píxeles de la opción quedan fuera del área visible del panel (dentro del borde), por cada
// lado. "Entera a la vista" es { izquierda: 0, derecha: 0 }, sea cual sea el scrollLeft.
const cortesDe = (panel: HTMLElement, opcion: HTMLElement) => {
  const deLaOpcion = opcion.getBoundingClientRect()
  const desde = panel.getBoundingClientRect().left + panel.clientLeft
  const hasta = desde + panel.clientWidth
  return {
    izquierda: Math.max(0, desde - deLaOpcion.left),
    derecha: Math.max(0, deLaOpcion.right - hasta),
  }
}
const ENTERA = { izquierda: 0, derecha: 0 }
// Lo que tenía el indicador cuando se midió: "ausente" si no estaba en la página. Solo consultas del
// DOM, sin Testing Library, para no volver a medir dentro de la medición.
const fotoDelIndicador = (): string => {
  const lista = document.querySelector<HTMLElement>(LISTA)
  if (lista === null) return "sin lista"
  const indicador = indicadorDe(lista)
  if (indicador === null) return "ausente"
  const x = indicador.style.getPropertyValue("--indicador-x")
  return x === "" ? "sin posición" : x
}

describe("el indicador no entra deslizándose desde una posición que no es la suya (CL3-R1-01)", () => {
  // En el navegador, medir dentro del useLayoutEffect fuerza el cálculo de estilos con el indicador ya
  // en la página. Si en ese momento no tiene su posición (o tiene la de otra opción), el cambio
  // siguiente de --indicador-x es una transición de `translate` de 200 ms: el indicador se desliza
  // desde el borde izquierdo (o desde la opción vieja) al entrar, aunque nadie cambió de sección.
  // DESIGN.md §7.3: "Solo la posición se desliza", y solo al cambiar de opción.
  it("CL3-R1-01: al entrar directo en «Calificaciones», cuando se mide la opción el indicador o no está o ya tiene su posición", async () => {
    stubClases()
    const fotos: string[] = []
    alMedir = () => fotos.push(fotoDelIndicador())
    montar([`${BASES.maestro}/${CLASE_ID}/calificaciones`])
    const lista = await secciones()
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(4)))
    alMedir = null
    expect(fotos.length).toBeGreaterThan(0)
    expect(fotos.filter((foto) => foto !== "ausente" && foto !== "400px")).toEqual([])
  })

  it("CL3-R1-01: de «Avisos» a «Editar clase» y de ahí a «Calificaciones», el indicador no reaparece con la posición vieja de «Avisos»", async () => {
    stubClases()
    const { router } = montar([`${BASES.admin}/${CLASE_ID}`])
    const lista = await secciones()
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(0)))
    await act(() => router.navigate(`${BASES.admin}/${CLASE_ID}/editar`))
    expect(await screen.findByText("editar admin")).toBeInTheDocument()
    expect(indicadorDe(lista)).toBeNull()

    const fotos: string[] = []
    alMedir = () => fotos.push(fotoDelIndicador())
    await act(() => router.navigate(`${BASES.admin}/${CLASE_ID}/calificaciones`))
    expect(await screen.findByText("calificaciones admin")).toBeInTheDocument()
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(4)))
    alMedir = null
    expect(fotos.length).toBeGreaterThan(0)
    expect(fotos.filter((foto) => foto !== "ausente" && foto !== "400px")).toEqual([])
  })

  it("CL3-R1-01 (control): al cambiar de «Avisos» a «Calificaciones» sí parte de la posición de «Avisos» (es el deslizamiento que pide el diseño)", async () => {
    stubClases()
    const { router } = montar([`${BASES.maestro}/${CLASE_ID}`])
    const lista = await secciones()
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(0)))
    const fotos: string[] = []
    alMedir = () => fotos.push(fotoDelIndicador())
    await act(() => router.navigate(`${BASES.maestro}/${CLASE_ID}/calificaciones`))
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(4)))
    alMedir = null
    expect(fotos[0]).toBe("0px")
  })
})

describe("la opción activa queda entera a la vista con el relleno del panel (CL3-R1-02)", () => {
  // Dos rellenos distintos: un remedio con el relleno escrito como número no pasa los dos.
  it.each([4, 12])(
    "CL3-R1-02: al entrar en «Calificaciones» con 250 px visibles y un relleno de %i px, la opción queda entera a la vista",
    async (relleno) => {
      medidas.panel = 250
      medidas.relleno = relleno
      stubClases()
      montar([`${BASES.maestro}/${CLASE_ID}/calificaciones`])
      const lista = await secciones()
      const panel = panelDe(lista)
      await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(4)))
      expect(panel.scrollLeft).toBeGreaterThan(0)
      expect(cortesDe(panel, opcionDe(lista, 4))).toEqual(ENTERA)
    },
  )

  it("CL3-R1-02: al cambiar de «Avisos» a «Calificaciones» con 250 px visibles y un relleno de 4 px, la opción queda entera a la vista", async () => {
    medidas.panel = 250
    stubClases()
    montar([`${BASES.maestro}/${CLASE_ID}`])
    const lista = await secciones()
    const panel = panelDe(lista)
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(0)))
    expect(cortesDe(panel, opcionDe(lista, 0))).toEqual(ENTERA)
    fireEvent.click(within(lista).getByRole("link", { name: "Calificaciones" }))
    expect(await screen.findByText("calificaciones maestro")).toBeInTheDocument()
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(4)))
    expect(cortesDe(panel, opcionDe(lista, 4))).toEqual(ENTERA)
  })

  it("CL3-R1-02 (control): sin relleno (el modelo de CL3-C04), la opción también queda entera a la vista", async () => {
    medidas.panel = 250
    medidas.relleno = 0
    stubClases()
    montar([`${BASES.maestro}/${CLASE_ID}/calificaciones`])
    const lista = await secciones()
    const panel = panelDe(lista)
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(4)))
    expect(panel.scrollLeft).toBeGreaterThan(0)
    expect(cortesDe(panel, opcionDe(lista, 4))).toEqual(ENTERA)
  })
})

describe("el indicador en sus demás estados (sin hallazgo esperado)", () => {
  // Sin relleno: aquí se ataca el historial, no el relleno (ese camino lo cubre CL3-R1-02). Con
  // relleno, este caso repetiría T-02 por otro camino.
  it("CL3-R1-03: atrás y adelante del historial mueven el indicador y dejan la opción a la vista", async () => {
    medidas.panel = 250
    medidas.relleno = 0
    stubClases()
    const { router } = montar([
      `${BASES.estudiante}/${CLASE_ID}/calificaciones`,
      `${BASES.estudiante}/${CLASE_ID}`,
    ])
    const lista = await secciones()
    const panel = panelDe(lista)
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(0)))
    // «Avisos» ya está a la vista: el panel no se desplaza (CL3-C04, segunda viñeta).
    expect(panel.scrollLeft).toBe(0)
    expect(cortesDe(panel, opcionDe(lista, 0))).toEqual(ENTERA)
    await act(() => router.navigate(-1))
    expect(await screen.findByText("calificaciones estudiante")).toBeInTheDocument()
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(4)))
    expect(panel.scrollLeft).toBeGreaterThan(0)
    expect(cortesDe(panel, opcionDe(lista, 4))).toEqual(ENTERA)
    expect(within(lista).getByRole("link", { name: "Calificaciones" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    await act(() => router.navigate(1))
    expect(await screen.findByText("avisos estudiante")).toBeInTheDocument()
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(0)))
    expect(cortesDe(panel, opcionDe(lista, 0))).toEqual(ENTERA)
  })

  it("CL3-R1-04: con medidas en cero (el panel aún sin diseño) el indicador mide 0 y el ResizeObserver lo corrige sin desplazar", async () => {
    const avisos: (() => void)[] = []
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(alCambiar: () => void) {
          avisos.push(alCambiar)
        }
        observe() {}
        disconnect() {}
      },
    )
    medidas.posicion = 0
    medidas.anchoBase = 0
    stubClases()
    montar([`${BASES.maestro}/${CLASE_ID}/trabajo`])
    const lista = await secciones()
    const panel = panelDe(lista)
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual({ x: "0px", ancho: "10px" }))
    panel.scrollLeft = 12
    medidas.posicion = 100
    medidas.anchoBase = 80
    act(() => {
      for (const avisar of avisos) avisar()
    })
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(1)))
    expect(panel.scrollLeft).toBe(12)
  })

  it("CL3-R1-05: desmontar con las fuentes y el ResizeObserver pendientes desconecta y no escribe estado", async () => {
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
    let fuentesListas: () => void = () => undefined
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: new Promise<void>((resolver) => (fuentesListas = resolver)) },
    })
    const errores = vi.spyOn(console, "error")
    stubClases()
    const { vista } = montar([`${BASES.admin}/${CLASE_ID}/personas`])
    const lista = await secciones()
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(3)))
    vista.unmount()
    expect(desconectar).toHaveBeenCalled()
    await act(async () => {
      fuentesListas()
      for (const avisar of avisos) avisar()
      await Promise.resolve()
    })
    expect(errores).not.toHaveBeenCalled()
  })

  it("CL3-R1-06: en «Editar clase» el ResizeObserver de la sección anterior se desconecta y no vuelve a montar el indicador", async () => {
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
    stubClases()
    const { router } = montar([`${BASES.admin}/${CLASE_ID}/trabajo`])
    const lista = await secciones()
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(1)))
    await act(() => router.navigate(`${BASES.admin}/${CLASE_ID}/editar`))
    expect(await screen.findByText("editar admin")).toBeInTheDocument()
    expect(desconectar).toHaveBeenCalled()
    act(() => {
      for (const avisar of avisos) avisar()
    })
    expect(indicadorDe(lista)).toBeNull()
    expect(within(lista).queryByRole("link", { current: "page" })).toBeNull()
  })

  it("CL3-R1-07: de una clase a otra en la misma sección, el indicador sigue en la opción activa", async () => {
    stubClases()
    const { router } = montar([`${BASES.maestro}/${CLASE_ID}/calificaciones`])
    await waitFor(async () =>
      expect(medidasDe(indicadorDe(await secciones()))).toEqual(esperadas(4)),
    )
    await act(() => router.navigate(`${BASES.maestro}/${OTRA_CLASE_ID}/calificaciones`))
    expect(await screen.findByText("calificaciones maestro")).toBeInTheDocument()
    const lista = await secciones()
    await waitFor(() =>
      expect(within(lista).getByRole("link", { name: "Calificaciones" })).toHaveAttribute(
        "href",
        `${BASES.maestro}/${OTRA_CLASE_ID}/calificaciones`,
      ),
    )
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(4)))
  })

  it("CL3-R1-08: pulsar la sección activa no mueve el indicador ni el panel", async () => {
    medidas.panel = 250
    stubClases()
    montar([`${BASES.maestro}/${CLASE_ID}/calificaciones`])
    const lista = await secciones()
    const panel = panelDe(lista)
    // La medición y el desplazamiento de la entrada ocurren en el mismo efecto: con el indicador ya
    // medido, la entrada terminó.
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(4)))
    expect(panel.scrollLeft).toBeGreaterThan(0)
    panel.scrollLeft = 20
    fireEvent.click(within(lista).getByRole("link", { name: "Calificaciones" }))
    await act(() => new Promise((resolver) => setTimeout(resolver, 50)))
    expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(4))
    expect(panel.scrollLeft).toBe(20)
  })
})
