import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { esUrlPublicable } from "./lib"
import { PieDePagina } from "./pie-de-pagina"
import type { EnlaceDelColegio } from "./types"

// Ataques del Tester (DESIGN-01b-1, ronda 2) contra la guarda nueva de esUrlPublicable (arbitraje
// de T-01, plan-01b.md §D-5 paso 2): un control en cualquier posición o un espacio en un extremo
// no se publica; un espacio en medio sí, si el analizador lo acepta (tel: con espacios). Y que
// ninguna forma de javascript: pase. Se localiza por rol, texto y atributos de datos, nunca por
// clases de estilo (tester.md).

const enlaces = vi.hoisted(() => [] as EnlaceDelColegio[])

vi.mock("./data", async (importOriginal) => {
  const original = await importOriginal<typeof import("./data")>()
  return { ...original, ENLACES_DEL_COLEGIO: enlaces }
})

const usarEnlaces = (lista: EnlaceDelColegio[]) => {
  enlaces.splice(0, enlaces.length, ...lista)
}

const anclas = () => Array.from(document.querySelectorAll("a"))
const marcadores = () => Array.from(document.querySelectorAll<HTMLElement>("[data-marcador]"))

afterEach(() => {
  vi.unstubAllEnvs()
})

// Controles en cualquier posición, solos o combinados con espacios en los extremos.
const CON_CONTROLES: [string, string][] = [
  ["\\t en medio", "https://cole\tgio.mx"],
  ["\\n en medio", "https://cole\ngio.mx"],
  ["\\r en medio", "https://cole\rgio.mx"],
  ["\\r\\n en la ruta", "https://colegio.mx/aviso\r\nde-privacidad"],
  ["U+0000 en medio", "https://cole\u0000gio.mx"],
  ["U+007F en medio", "https://cole\u007fgio.mx"],
  ["U+007F al inicio", "\u007fhttps://colegio.mx"],
  ["U+007F al final", "https://colegio.mx\u007f"],
  ["U+0001 en el esquema", "ht\u0001tps://colegio.mx"],
  ["U+001F en la ruta", "https://colegio.mx/a\u001fb"],
  ["\\t en un tel:", "tel:+52\t55 1234 5678"],
  ["\\n en un mailto:", "mailto:contacto@colegio.mx\n"],
  ["U+0000 en un mailto:", "mailto:contacto\u0000@colegio.mx"],
  ["espacio y U+0001 al inicio", " \u0001https://colegio.mx"],
  ["U+0001 y espacio al inicio", "\u0001 https://colegio.mx"],
  ["U+0000 y espacio al final", "https://colegio.mx\u0000 "],
  ["espacio y U+0000 al final", "https://colegio.mx \u0000"],
  ["espacios y controles en los dos extremos", " \t\u0001https://colegio.mx\u0000\n "],
  ["\\v al inicio", "\u000bhttps://colegio.mx"],
  ["\\f al final", "https://colegio.mx\u000c"],
]

// Todas las formas de javascript: (y parientes) que se nos ocurrieron.
const JAVASCRIPT: string[] = [
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  "JAVASCRIPT:alert(1)",
  "java\nscript:alert(1)",
  "java\tscript:alert(1)",
  "java\rscript:alert(1)",
  "\u0001javascript:alert(1)",
  "\u0000javascript:alert(1)",
  " javascript:alert(1)",
  "javascript\u0000:alert(1)",
  "java­script:alert(1)",
  "javascript&colon;alert(1)",
  "javascript&#58;alert(1)",
  "jav&#x09;ascript:alert(1)",
  "%6Aavascript:alert(1)",
  "javascript://colegio.mx/%0Aalert(1)",
  "https:javascript:alert(1)",
  "vbscript:msgbox(1)",
  "data:text/html,<script>alert(1)</script>",
  "blob:https://colegio.mx/uuid",
  "file:///etc/passwd",
]

describe("ataque (DESIGN-01b-1 r2): controles en cualquier posición", () => {
  it.each(CON_CONTROLES)("con %s no es publicable", (_nombre, url) => {
    expect(esUrlPublicable(url)).toBe(false)
  })

  it("en el pie, ninguna sale como <a>: en desarrollo son marcadores; en producción no salen", () => {
    usarEnlaces(CON_CONTROLES.map(([texto, url]) => ({ texto, url })))
    const { rerender } = render(<PieDePagina />)
    expect(anclas().map((a) => JSON.stringify(a.getAttribute("href")))).toEqual([])
    expect(marcadores().map((m) => m.textContent)).toEqual(CON_CONTROLES.map(([texto]) => texto))

    vi.stubEnv("PROD", true)
    rerender(<PieDePagina />)
    expect(anclas()).toEqual([])
    expect(marcadores()).toEqual([])
  })
})

describe("ataque (DESIGN-01b-1 r2): espacios en medio", () => {
  it("tel:+52 55 1234 5678 sí es publicable y sale como enlace, con el href tal cual", () => {
    expect(esUrlPublicable("tel:+52 55 1234 5678")).toBe(true)
    vi.stubEnv("PROD", true)
    usarEnlaces([{ texto: "Contacto", url: "tel:+52 55 1234 5678" }])
    render(<PieDePagina />)
    const enlace = screen.getByRole("link", { name: "Contacto" })
    expect(enlace).toHaveAttribute("href", "tel:+52 55 1234 5678")
  })

  it.each([
    ["espacio en el dominio", "https://cole gio.mx"],
    ["espacio antes del punto", "https://colegio .mx"],
    ["espacio duro en el dominio", "https://cole gio.mx"],
  ])("con %s no sale un enlace", (_nombre, url) => {
    expect(esUrlPublicable(url)).toBe(false)
    vi.stubEnv("PROD", true)
    usarEnlaces([{ texto: "Sitio web", url }])
    render(<PieDePagina />)
    expect(anclas()).toEqual([])
  })

  it("un https válido y un mailto: válido siguen publicándose", () => {
    expect(esUrlPublicable("https://colegio.mx/aviso-de-privacidad")).toBe(true)
    expect(esUrlPublicable("mailto:contacto@colegio.mx")).toBe(true)
  })
})

describe("ataque (DESIGN-01b-1 r2): ninguna forma de javascript: pasa", () => {
  it.each(JAVASCRIPT)("%j no es publicable", (url) => {
    expect(esUrlPublicable(url)).toBe(false)
  })

  it("en el pie, ninguna sale como <a>, en ningún modo", () => {
    usarEnlaces(JAVASCRIPT.map((url, i) => ({ texto: `Enlace ${i}`, url })))
    const { rerender } = render(<PieDePagina />)
    expect(anclas()).toEqual([])
    expect(marcadores()).toHaveLength(JAVASCRIPT.length)
    vi.stubEnv("PROD", true)
    rerender(<PieDePagina />)
    expect(anclas()).toEqual([])
    expect(document.querySelectorAll('[href^="javascript:" i]')).toHaveLength(0)
  })
})

describe("ataque (DESIGN-01b-1 r2): caracteres invisibles que el analizador quita en silencio", () => {
  // Misma razón que T-01 (§D-5, paso 2: "el analizador de URL quita en silencio … y el href saldría
  // con ellos"): estos caracteres de formato, invisibles al capturar, desaparecen al analizar el
  // dominio (new URL("https://cole­gio.mx").href === "https://colegio.mx/"), pero el href del
  // pie saldría con ellos. No son controles U+0000 a U+001F ni U+007F.
  it.each([
    ["guion suave U+00AD", "https://cole­gio.mx"],
    ["espacio de ancho cero U+200B", "https://cole​gio.mx"],
    ["unión de palabras U+2060", "https://cole⁠gio.mx"],
    ["marca de orden de bytes U+FEFF en medio", "https://cole﻿gio.mx"],
  ])("con un %s en el dominio no sale un <a>", (_nombre, url) => {
    usarEnlaces([{ texto: "Sitio web", url }])
    render(<PieDePagina />)
    expect(
      anclas().map((a) => JSON.stringify(a.getAttribute("href"))),
      "salió un <a> con un carácter invisible en su href",
    ).toEqual([])
    expect(marcadores().map((m) => m.textContent)).toEqual(["Sitio web"])
  })
})
