import { render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { PieDePagina } from "./pie-de-pagina"
import type { EnlaceDelColegio } from "./types"

// Ataques del Tester (DESIGN-01b-1, ronda 1) contra el pie (plan-01b.md, §D-5 y punto de ataque 3):
// ENLACES_DEL_COLEGIO se sustituye con vi.mock por URLs hostiles; ninguna puede salir como <a>, ni
// con su href ni con su forma sin espacios. Se localiza por rol, texto y atributos de datos, nunca
// por clases de estilo (tester.md).

const enlaces = vi.hoisted(() => [] as EnlaceDelColegio[])

vi.mock("./data", async (importOriginal) => {
  const original = await importOriginal<typeof import("./data")>()
  return { ...original, ENLACES_DEL_COLEGIO: enlaces }
})

const usarEnlaces = (lista: EnlaceDelColegio[]) => {
  enlaces.splice(0, enlaces.length, ...lista)
}

const marcadores = () => Array.from(document.querySelectorAll<HTMLElement>("[data-marcador]"))
const anclas = () => Array.from(document.querySelectorAll("a"))

// Un marcador nunca se enfoca ni se pulsa: ni tabindex, ni dentro de un <a> o un <button>, ni con
// un rol interactivo.
const esperarMarcadorInerte = (marcador: HTMLElement) => {
  expect(marcador.getAttribute("tabindex"), `"${marcador.textContent}" tiene tabindex`).toBeNull()
  expect(marcador.closest("a, button, [role='link'], [role='button']")).toBeNull()
  expect(marcador.getAttribute("href")).toBeNull()
  expect(marcador.getAttribute("role")).toBeNull()
  marcador.focus()
  expect(document.activeElement).not.toBe(marcador)
}

// URLs que nunca pueden publicarse (S-07 y M-03). Cada una con un texto distinto.
const HOSTILES: EnlaceDelColegio[] = [
  { texto: "Almohadilla", url: "#" },
  { texto: "Almohadilla con ancla", url: "#aviso" },
  { texto: "Javascript", url: "javascript:alert(1)" },
  { texto: "Javascript en mayúsculas", url: "JAVASCRIPT:alert(1)" },
  { texto: "Javascript partido", url: "java\nscript:alert(1)" },
  { texto: "Javascript con tabulador", url: "java\tscript:alert(1)" },
  { texto: "Vbscript", url: "vbscript:msgbox(1)" },
  { texto: "Data", url: "data:text/html,<script>alert(1)</script>" },
  { texto: "Http", url: "http://colegio.mx" },
  { texto: "Espacios alrededor", url: " https://colegio.mx " },
  { texto: "Espacio al final", url: "https://colegio.mx " },
  { texto: "Espacio al inicio", url: " https://colegio.mx" },
  { texto: "Tabulador al inicio", url: "\thttps://colegio.mx" },
  { texto: "Salto al final", url: "https://colegio.mx\n" },
  { texto: "Espacio duro al inicio", url: " https://colegio.mx" },
  { texto: "Vacía", url: "" },
  { texto: "Solo espacios", url: "   " },
  { texto: "Relativa", url: "/aviso" },
  { texto: "Relativa al protocolo", url: "//colegio.mx" },
  { texto: "Sin esquema", url: "colegio.mx" },
  { texto: "Nula", url: null },
]

beforeEach(() => {
  vi.unstubAllEnvs()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe("ataque (DESIGN-01b-1 r1): URLs hostiles en ENLACES_DEL_COLEGIO", () => {
  it("en desarrollo, ninguna sale como <a>: cada una es un marcador inerte, en el mismo orden", () => {
    usarEnlaces(HOSTILES)
    render(<PieDePagina />)

    expect(anclas(), "salió un <a> con una URL no publicable").toEqual([])
    expect(screen.queryAllByRole("link")).toEqual([])
    const lista = marcadores()
    expect(lista.map((m) => m.textContent)).toEqual(HOSTILES.map((e) => e.texto))
    for (const marcador of lista) esperarMarcadorInerte(marcador)
    expect(screen.getByRole("list", { name: "Enlaces del colegio" })).toBeInTheDocument()
  })

  it("en producción, ninguna sale: ni <a>, ni marcador, ni la lista vacía", () => {
    vi.stubEnv("PROD", true)
    usarEnlaces(HOSTILES)
    render(<PieDePagina />)

    expect(anclas()).toEqual([])
    expect(marcadores()).toEqual([])
    expect(screen.queryByRole("list", { name: "Enlaces del colegio" })).toBeNull()
    expect(screen.queryByRole("list")).toBeNull()
    for (const enlace of HOSTILES) expect(screen.queryByText(enlace.texto)).toBeNull()
    expect(screen.getByRole("contentinfo")).toHaveTextContent(/^© \d{4} Colegio Mexicano/)
  })

  it("ningún atributo href del pie lleva #, javascript:, http: ni espacios, en los dos modos", () => {
    usarEnlaces([...HOSTILES, { texto: "Bueno", url: "https://colegio.mx/aviso" }])
    const { rerender } = render(<PieDePagina />)
    const revisar = () => {
      for (const ancla of anclas()) {
        const href = ancla.getAttribute("href") ?? ""
        expect(href, `href sospechoso: ${JSON.stringify(href)}`).toBe(href.trim())
        expect(href).not.toMatch(/^(#|javascript:|http:|\/)/i)
        expect(href).not.toBe("")
      }
    }
    revisar()
    expect(anclas()).toHaveLength(1)
    vi.stubEnv("PROD", true)
    rerender(<PieDePagina />)
    revisar()
    expect(anclas()).toHaveLength(1)
  })
})

describe("ataque (DESIGN-01b-1 r1): URLs publicables", () => {
  const BUENOS: EnlaceDelColegio[] = [
    { texto: "Sitio web", url: "https://colegio.mx/" },
    { texto: "Sin URL", url: null },
    { texto: "Contacto", url: "mailto:contacto@colegio.mx" },
    { texto: "Con espacios", url: " https://colegio.mx/aviso " },
    { texto: "Teléfono", url: "tel:+525555555555" },
  ]

  it("en producción salen solo las publicables, en su orden, con el href tal cual y sin nueva pestaña", () => {
    vi.stubEnv("PROD", true)
    usarEnlaces(BUENOS)
    render(<PieDePagina />)

    const lista = screen.getAllByRole("link")
    expect(lista.map((a) => a.textContent)).toEqual(["Sitio web", "Contacto", "Teléfono"])
    expect(lista.map((a) => a.getAttribute("href"))).toEqual([
      "https://colegio.mx/",
      "mailto:contacto@colegio.mx",
      "tel:+525555555555",
    ])
    for (const ancla of lista) expect(ancla.getAttribute("target")).toBeNull()
    expect(marcadores()).toEqual([])
    // La URL con espacios no sale ni con su forma recortada.
    expect(document.querySelector('a[href="https://colegio.mx/aviso"]')).toBeNull()
    expect(document.querySelector('a[href=" https://colegio.mx/aviso "]')).toBeNull()
  })

  it("en desarrollo, las no publicables quedan como marcador entre los enlaces reales, en su orden", () => {
    usarEnlaces(BUENOS)
    render(<PieDePagina />)

    const items = within(screen.getByRole("list", { name: "Enlaces del colegio" }))
    const textos = items.getAllByRole("listitem").map((li) => li.textContent)
    expect(textos).toEqual(BUENOS.map((e) => e.texto))
    expect(screen.getAllByRole("link")).toHaveLength(3)
    expect(marcadores().map((m) => m.textContent)).toEqual(["Sin URL", "Con espacios"])
  })

  it("PROD se lee al pintar: al cambiarlo en el mismo montaje, los marcadores desaparecen", () => {
    usarEnlaces(BUENOS)
    const { rerender } = render(<PieDePagina />)
    expect(marcadores()).toHaveLength(2)
    vi.stubEnv("PROD", true)
    rerender(<PieDePagina />)
    expect(marcadores()).toHaveLength(0)
    expect(screen.getAllByRole("link")).toHaveLength(3)
  })

  it("con la lista vacía no hay lista ni marcadores, en ningún modo", () => {
    usarEnlaces([])
    const { rerender } = render(<PieDePagina />)
    expect(screen.queryByRole("list")).toBeNull()
    vi.stubEnv("PROD", true)
    rerender(<PieDePagina />)
    expect(screen.queryByRole("list")).toBeNull()
    expect(screen.getAllByRole("contentinfo")).toHaveLength(1)
  })
})

describe("ataque (DESIGN-01b-1 r1): caracteres de control alrededor de la URL (M-03)", () => {
  // §D-5, paso 2: "false si url !== url.trim() (espacios o caracteres de control al inicio o al
  // final, M-03): el analizador de URL los quitaría en silencio y el href saldría con ellos".
  // String.prototype.trim no quita los controles C0 fuera de \t\n\v\f\r, pero new URL sí.
  it.each([
    ["U+0001 al inicio", "\u0001https://colegio.mx"],
    ["U+001F al inicio", "\u001fhttps://colegio.mx"],
    ["U+0000 al final", "https://colegio.mx\u0000"],
  ])("con %s no sale un <a> y en desarrollo queda como marcador", (_nombre, url) => {
    usarEnlaces([{ texto: "Aviso de privacidad", url }])
    render(<PieDePagina />)

    expect(
      anclas().map((a) => JSON.stringify(a.getAttribute("href"))),
      "salió un <a> con un carácter de control invisible en su href",
    ).toEqual([])
    expect(marcadores().map((m) => m.textContent)).toEqual(["Aviso de privacidad"])
  })
})

describe("ataque (DESIGN-01b-1 r1): el año se calcula al pintar", () => {
  it.each([
    [new Date(2026, 11, 31, 23, 59, 59, 999), "2026"],
    [new Date(2027, 0, 1, 0, 0, 0, 0), "2027"],
    [new Date(2099, 5, 15, 12, 0, 0, 0), "2099"],
  ])("el %s el pie dice © %s", (ahora, anio) => {
    vi.useFakeTimers()
    vi.setSystemTime(ahora)
    usarEnlaces([])
    render(<PieDePagina />)
    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      `© ${anio} Colegio Mexicano de Estudios de Posgrado Jurídicos y Económicos`,
    )
  })
})
