import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ClaseLayout } from "./clase-layout"

// CLASES-03c1, ronda 2 del tester: la corrección de T-01 (el indicador no entra deslizándose desde una
// posición ajena) y de T-02 (la opción activa entera a la vista con el relleno del panel), por los
// estados vecinos que la ronda 1 no fijó (revision.md, "Para la ronda 2 del tester (03c1)"):
// - cambio de clase en otra sección con la clase nueva en caché (ClaseLayout no remonta las
//   secciones), y la ida y vuelta A → B → A;
// - la vuelta desde «Categorías» y desde el detalle de una tarea (pantallas sin sección);
// - el historial con relleno, y el cambio de sección con el panel ya desplazado y relleno, con la
//   opción a la derecha y a la izquierda del área visible.
// El modelo geométrico es el mismo de indicador-03c1-r1.ataque.test.tsx (adenda 1): panel con borde y
// relleno, <ul> después del relleno, cada <li> medido desde el <ul>, y rectángulos coherentes con el
// scrollLeft del momento.

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const CLASE_A = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const CLASE_B = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02"
const TAREA_ID = "6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d07"
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
      for (const id of [CLASE_A, CLASE_B]) {
        if (ruta === `/api/clases/${id}`) {
          return Promise.resolve(
            respuestaJson(200, {
              clase: {
                id,
                nombre: id === CLASE_A ? "Álgebra I" : "Historia",
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

// Las secciones y las pantallas sin sección que son hijas de ClaseLayout en el router real
// (`categorias` y `tareas/:tareaId`, además de `editar`, que ya cubrió la ronda 1).
const hijos = (rol: keyof typeof BASES) => [
  { index: true, element: <p>{`avisos ${rol}`}</p> },
  { path: "trabajo", element: <p>{`trabajo ${rol}`}</p> },
  // CLASES-03d ronda 0, adenda 1 (C-8): la sección «Recursos», para el control de CL3-R2-08.
  { path: "recursos", element: <p>{`recursos ${rol}`}</p> },
  { path: "personas", element: <p>{`personas ${rol}`}</p> },
  { path: "calificaciones", element: <p>{`calificaciones ${rol}`}</p> },
  { path: "categorias", element: <p>{`categorias ${rol}`}</p> },
  { path: "tareas/:tareaId", element: <p>{`detalle de tarea ${rol}`}</p> },
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
// CLASES-03e ronda 0, adenda (C-8 ampliada por el arbitraje de la ronda 0 de 03e; §D-7.1): con
// «Dudas» en el índice 3, «Personas» pasa del índice 3 al 4 y «Calificaciones» del 4 al 5 (en
// esperadas, opcionDe y los destinos de visitar y fotosAjenasAlNavegar); «Avisos», «Actividades de
// aprendizaje» y «Recursos» no cambian, así que el control de CL3-R2-08 tampoco. Siguen protegiendo
// lo mismo.
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
const fotoDelIndicador = (): string => {
  const lista = document.querySelector<HTMLElement>(LISTA)
  if (lista === null) return "sin lista"
  const indicador = indicadorDe(lista)
  if (indicador === null) return "ausente"
  const x = indicador.style.getPropertyValue("--indicador-x")
  return x === "" ? "sin posición" : x
}

// Navega con las fotos encendidas y devuelve las que no son "ausente" ni la posición de la opción
// `destino` (las que el navegador animaría desde una posición ajena). También exige que se haya medido.
const fotosAjenasAlNavegar = async (
  navegar: () => Promise<void>,
  texto: string,
  lista: HTMLElement,
  destino: number,
) => {
  const fotos: string[] = []
  alMedir = () => fotos.push(fotoDelIndicador())
  await act(navegar)
  expect(await screen.findByText(texto)).toBeInTheDocument()
  await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(destino)))
  alMedir = null
  expect(fotos.length).toBeGreaterThan(0)
  const propia = esperadas(destino).x
  return fotos.filter((foto) => foto !== "ausente" && foto !== propia)
}

// Lleva a la clase y espera su indicador; deja la clase en la caché de TanStack Query.
const visitar = async (
  router: ReturnType<typeof montar>["router"],
  ruta: string,
  texto: string,
  indice: number,
) => {
  await act(() => router.navigate(ruta))
  expect(await screen.findByText(texto)).toBeInTheDocument()
  const lista = await secciones()
  await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(indice)))
  return lista
}

describe("cambio de clase con la clase nueva en caché (CL3-R2-01 a CL3-R2-03)", () => {
  // ClaseLayout no pone key a SeccionesDeClase: con la clase nueva en caché, el mismo componente
  // recibe otra base y otra sección activa. Si heredara la medida de la otra clase, el indicador se
  // deslizaría desde la sección de la otra clase sin que nadie cambiara de sección en esta.
  it("CL3-R2-01: clase B en «Calificaciones» → clase A en «Actividades de aprendizaje» → clase B en «Calificaciones»: al medir, el indicador o no está o ya tiene su posición", async () => {
    stubClases()
    const { router } = montar([`${BASES.maestro}/${CLASE_A}`])
    expect(await screen.findByText("avisos maestro")).toBeInTheDocument()
    const lista = await visitar(
      router,
      `${BASES.maestro}/${CLASE_B}/calificaciones`,
      "calificaciones maestro",
      5,
    )

    const haciaA = await fotosAjenasAlNavegar(
      () => router.navigate(`${BASES.maestro}/${CLASE_A}/trabajo`),
      "trabajo maestro",
      lista,
      1,
    )
    // Precondición: la clase A estaba en caché, así que las secciones son las mismas (no se remontaron).
    expect(await secciones()).toBe(lista)
    expect(within(lista).getByRole("link", { name: "Actividades de aprendizaje" })).toHaveAttribute(
      "href",
      `${BASES.maestro}/${CLASE_A}/trabajo`,
    )
    expect(haciaA).toEqual([])

    const haciaB = await fotosAjenasAlNavegar(
      () => router.navigate(`${BASES.maestro}/${CLASE_B}/calificaciones`),
      "calificaciones maestro",
      lista,
      5,
    )
    expect(await secciones()).toBe(lista)
    expect(haciaB).toEqual([])
  })

  it("CL3-R2-02: ida y vuelta A «Avisos» → B «Personas» → A «Calificaciones» con las dos clases en caché: ninguna foto con la posición de otra sección", async () => {
    stubClases()
    const { router } = montar([`${BASES.admin}/${CLASE_B}`])
    expect(await screen.findByText("avisos admin")).toBeInTheDocument()
    const lista = await visitar(router, `${BASES.admin}/${CLASE_A}`, "avisos admin", 0)

    const haciaB = await fotosAjenasAlNavegar(
      () => router.navigate(`${BASES.admin}/${CLASE_B}/personas`),
      "personas admin",
      lista,
      4,
    )
    expect(await secciones()).toBe(lista)
    expect(haciaB).toEqual([])

    const deVueltaEnA = await fotosAjenasAlNavegar(
      () => router.navigate(`${BASES.admin}/${CLASE_A}/calificaciones`),
      "calificaciones admin",
      lista,
      5,
    )
    expect(await secciones()).toBe(lista)
    expect(deVueltaEnA).toEqual([])
  })

  it("CL3-R2-03: atrás del historial de la clase B a la clase A (otra sección, en caché): el indicador no se desliza desde la sección de B", async () => {
    stubClases()
    const { router } = montar([`${BASES.estudiante}/${CLASE_A}/calificaciones`])
    const lista = await secciones()
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(5)))
    const enB = await visitar(router, `${BASES.estudiante}/${CLASE_B}`, "avisos estudiante", 0)
    // B no estaba en caché: las secciones se remontaron tras el Cargando. Desde aquí, A sí lo está.
    const atras = await fotosAjenasAlNavegar(
      () => router.navigate(-1),
      "calificaciones estudiante",
      enB,
      5,
    )
    expect(await secciones()).toBe(enB)
    expect(atras).toEqual([])
  })
})

describe("la vuelta desde otras pantallas sin sección (CL3-R2-04 y CL3-R2-05)", () => {
  it("CL3-R2-04: de «Avisos» a «Categorías» y de ahí a «Calificaciones»: el indicador no reaparece con la posición de «Avisos»", async () => {
    stubClases()
    const { router } = montar([`${BASES.maestro}/${CLASE_A}`])
    const lista = await secciones()
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(0)))
    await act(() => router.navigate(`${BASES.maestro}/${CLASE_A}/categorias`))
    expect(await screen.findByText("categorias maestro")).toBeInTheDocument()
    expect(indicadorDe(lista)).toBeNull()
    const ajenas = await fotosAjenasAlNavegar(
      () => router.navigate(`${BASES.maestro}/${CLASE_A}/calificaciones`),
      "calificaciones maestro",
      lista,
      5,
    )
    expect(ajenas).toEqual([])
  })

  it("CL3-R2-05: de «Calificaciones» a «Avisos», al detalle de una tarea y dos pasos atrás del historial: el indicador no reaparece con la posición de «Avisos»", async () => {
    stubClases()
    const { router } = montar([`${BASES.estudiante}/${CLASE_A}/calificaciones`])
    const lista = await secciones()
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(5)))
    await visitar(router, `${BASES.estudiante}/${CLASE_A}`, "avisos estudiante", 0)
    await act(() => router.navigate(`${BASES.estudiante}/${CLASE_A}/tareas/${TAREA_ID}`))
    expect(await screen.findByText("detalle de tarea estudiante")).toBeInTheDocument()
    expect(indicadorDe(lista)).toBeNull()
    const ajenas = await fotosAjenasAlNavegar(
      () => router.navigate(-2),
      "calificaciones estudiante",
      lista,
      5,
    )
    expect(ajenas).toEqual([])
  })

  it("CL3-R2-05 (hermano): del detalle de una tarea del admin a «Personas»: al medir, el indicador o no está o ya tiene su posición", async () => {
    stubClases()
    const { router } = montar([`${BASES.admin}/${CLASE_A}/tareas/${TAREA_ID}`])
    expect(await screen.findByText("detalle de tarea admin")).toBeInTheDocument()
    const lista = await secciones()
    expect(indicadorDe(lista)).toBeNull()
    const ajenas = await fotosAjenasAlNavegar(
      () => router.navigate(`${BASES.admin}/${CLASE_A}/personas`),
      "personas admin",
      lista,
      4,
    )
    expect(ajenas).toEqual([])
  })
})

describe("T-02 por los caminos con relleno (CL3-R2-06 a CL3-R2-08)", () => {
  // CLASES-03e ronda 0, adenda (C-8 ampliada por el arbitraje de la ronda 0 de 03e): con «Dudas» en el
  // índice 3, «Calificaciones» ocupa 500..630 (antes 400..520).
  // Con 250 px visibles: «Avisos» (0..80) a la izquierda y «Calificaciones» (500..630) a la derecha,
  // en coordenadas del <ul>; el relleno las corre P px dentro del área desplazable.
  it.each([4, 12])(
    "CL3-R2-06: atrás y adelante del historial con un relleno de %i px dejan la opción entera a la vista",
    async (relleno) => {
      medidas.panel = 250
      medidas.relleno = relleno
      stubClases()
      const { router } = montar([
        `${BASES.estudiante}/${CLASE_A}/calificaciones`,
        `${BASES.estudiante}/${CLASE_A}`,
      ])
      const lista = await secciones()
      const panel = panelDe(lista)
      await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(0)))
      expect(cortesDe(panel, opcionDe(lista, 0))).toEqual(ENTERA)
      await act(() => router.navigate(-1))
      expect(await screen.findByText("calificaciones estudiante")).toBeInTheDocument()
      await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(5)))
      expect(panel.scrollLeft).toBeGreaterThan(0)
      expect(cortesDe(panel, opcionDe(lista, 5))).toEqual(ENTERA)
      // Adelante: «Avisos» queda a la izquierda del área visible.
      await act(() => router.navigate(1))
      expect(await screen.findByText("avisos estudiante")).toBeInTheDocument()
      await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(0)))
      expect(cortesDe(panel, opcionDe(lista, 0))).toEqual(ENTERA)
    },
  )

  it.each([
    [4, 30],
    [12, 30],
    [4, 7],
    [12, 50],
  ])(
    "CL3-R2-07: con un relleno de %i px y el panel ya desplazado %i px, al cambiar a «Calificaciones» (a la derecha del área visible) la opción queda entera a la vista",
    async (relleno, desplazado) => {
      medidas.panel = 250
      medidas.relleno = relleno
      stubClases()
      montar([`${BASES.maestro}/${CLASE_A}/trabajo`])
      const lista = await secciones()
      const panel = panelDe(lista)
      await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(1)))
      // La persona desplazó el panel a mano antes de elegir otra sección.
      panel.scrollLeft = desplazado
      expect(cortesDe(panel, opcionDe(lista, 5)).derecha).toBeGreaterThan(0)
      fireEvent.click(within(lista).getByRole("link", { name: "Calificaciones" }))
      expect(await screen.findByText("calificaciones maestro")).toBeInTheDocument()
      await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(5)))
      expect(cortesDe(panel, opcionDe(lista, 5))).toEqual(ENTERA)
    },
  )

  it.each([
    [4, "Avisos", 0, "avisos admin"],
    [12, "Avisos", 0, "avisos admin"],
    [4, "Actividades de aprendizaje", 1, "trabajo admin"],
    [12, "Actividades de aprendizaje", 1, "trabajo admin"],
  ])(
    "CL3-R2-08: con un relleno de %i px y el panel desplazado hasta «Calificaciones», al cambiar a «%s» (a la izquierda del área visible) la opción queda entera a la vista",
    async (relleno, nombre, indice, texto) => {
      medidas.panel = 250
      medidas.relleno = relleno
      stubClases()
      montar([`${BASES.admin}/${CLASE_A}/calificaciones`])
      const lista = await secciones()
      const panel = panelDe(lista)
      await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(5)))
      expect(panel.scrollLeft).toBeGreaterThan(0)
      expect(cortesDe(panel, opcionDe(lista, indice)).izquierda).toBeGreaterThan(0)
      fireEvent.click(within(lista).getByRole("link", { name: nombre }))
      expect(await screen.findByText(texto)).toBeInTheDocument()
      await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(indice)))
      expect(cortesDe(panel, opcionDe(lista, indice))).toEqual(ENTERA)
    },
  )

  it("CL3-R2-08 (control): una opción que ya está entera a la vista con el panel desplazado y relleno no mueve el panel", async () => {
    medidas.panel = 250
    medidas.relleno = 12
    stubClases()
    montar([`${BASES.maestro}/${CLASE_A}/trabajo`])
    const lista = await secciones()
    const panel = panelDe(lista)
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(1)))
    // CLASES-03d ronda 0, adenda 1 (C-8 ampliada por el arbitraje de la ronda 0 de 03d): «Recursos»
    // ocupa ahora el índice 2 que tenía «Personas»; el control la pulsa a ella y conserva su aritmética.
    // Con 90 px desplazados, «Recursos» (200..300 en el <ul>, 212..312 en el panel) cabe entera en 90..340.
    panel.scrollLeft = 90
    expect(cortesDe(panel, opcionDe(lista, 2))).toEqual(ENTERA)
    fireEvent.click(within(lista).getByRole("link", { name: "Recursos" }))
    expect(await screen.findByText("recursos maestro")).toBeInTheDocument()
    await waitFor(() => expect(medidasDe(indicadorDe(lista))).toEqual(esperadas(2)))
    expect(panel.scrollLeft).toBe(90)
  })
})
