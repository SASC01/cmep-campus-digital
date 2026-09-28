import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { esUrlPublicable } from "./lib"
import { PieDePagina } from "./pie-de-pagina"
import type { EnlaceDelColegio } from "./types"

// Ataques del Tester (DESIGN-01b-1, ronda 3) contra la regla final de esUrlPublicable (arbitraje
// de la ronda 2; plan-01b.md §D-5 paso 3 y S-07): se publica solo una URL que el analizador deja
// exactamente igual, salvo la barra final de un dominio sin ruta. Nada que el analizador cambie
// sale como <a>, en desarrollo ni en producción, y las 4 URL publicables salen con el href tal
// cual. Se localiza por rol, texto y atributos de datos, nunca por clases de estilo (tester.md).

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

const hrefAnalizado = (url: string): string | null => {
  try {
    return new URL(url).href
  } catch {
    return null
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
})

const PUBLICABLES = [
  "https://colegio.mx",
  "mailto:contacto@colegio.mx",
  "tel:+525555555555",
  "tel:+52 55 1234 5678",
]

// URL que el analizador acepta pero reescribe: ninguna puede salir como <a>. Incluye las
// consecuencias aceptadas del arbitraje (mayúsculas, puerto por defecto, acentos, espacio en ruta).
const REESCRITAS = [
  "HTTPS://colegio.mx",
  "https://Colegio.mx",
  "https://COLEGIO.MX/aviso",
  "https://colegio.mx:443",
  "https://colegio.mx:0443/aviso",
  "https://colegío.mx",
  "https://ｃｏｌｅｇｉｏ.mx",
  "https://colegio.mx/a b",
  "https://colegio.mx/aviso?q=a b",
  "https://colegio.mx/#a b",
  "https://colegio.mx/á",
  "https://colegio.mx/?q=ñ",
  "https://colegio.mx/#ñ",
  "https://colegio.mx/./aviso",
  "https://colegio.mx/aviso/../privacidad",
  "https://colegio.mx/..",
  "https://colegio.mx?",
  "https://colegio.mx#",
  "https://colegio.mx?x=1",
  "https://colegio.mx#y",
  "https:colegio.mx",
  "https:/colegio.mx",
  "https:\\\\colegio.mx",
  "https://colegio.mx\\aviso",
  "https://2130706433",
  "https://0x7f.0.0.1",
  "https://127.1",
  "https://[0:0:0:0:0:0:0:1]",
  "https://cole­gio.mx",
  "https://cole​gio.mx",
  "https://cole⁠gio.mx",
  "https://cole﻿gio.mx",
  "https://cole͏gio.mx",
  "https://cole᠎gio.mx",
  "https://colegio.mx/​",
  "https://colegio.mx/‮",
  "https://colegio.mx/?‎",
  "https://colegio.mx/#⁦",
  "mailto:contacto​@colegio.mx",
  "mailto:contácto@colegio.mx",
  "tel:+52 55",
  "tel:+52​5555555555",
  "tel:+52 55",
  " https://colegio.mx",
  "https://colegio.mx ",
  "\thttps://colegio.mx",
  "https://colegio.mx\n",
  "https://cole\ngio.mx",
  "https://colegio.mx/a\tb",
  "tel:+52\r5555555555",
  "\u0001https://colegio.mx",
  "https://colegio.mx\u0000",
  "https://colegio.mx/\u007f",
  "tel:+52 55 1234 5678 ",
]

describe("ataque (DESIGN-01b-1 r3): las 4 URL publicables salen con el href tal cual", () => {
  it.each(PUBLICABLES)("%j es publicable", (url) => {
    expect(esUrlPublicable(url)).toBe(true)
  })

  it.each([false, true])(
    "con PROD=%s, las 4 salen como enlace, en orden y con el href exacto",
    (prod) => {
      vi.stubEnv("PROD", prod)
      usarEnlaces(PUBLICABLES.map((url, i) => ({ texto: `Enlace ${i}`, url })))
      render(<PieDePagina />)
      const lista = screen.getAllByRole("link")
      expect(lista.map((a) => a.textContent)).toEqual(PUBLICABLES.map((_, i) => `Enlace ${i}`))
      expect(lista.map((a) => a.getAttribute("href"))).toEqual(PUBLICABLES)
      expect(marcadores()).toEqual([])
    },
  )
})

describe("ataque (DESIGN-01b-1 r3): nada que el analizador cambie sale como <a>", () => {
  it("cada URL de la lista la cambia el analizador (precondición del ataque)", () => {
    for (const url of REESCRITAS) {
      const href = hrefAnalizado(url)
      expect(href, `${JSON.stringify(url)} no la acepta el analizador`).not.toBeNull()
      expect(
        href === url || href === `${url}/`,
        `${JSON.stringify(url)} no la cambia el analizador`,
      ).toBe(false)
    }
  })

  it.each(REESCRITAS)("%j no es publicable", (url) => {
    expect(esUrlPublicable(url)).toBe(false)
  })

  it("en desarrollo, todas quedan como marcador, en su orden, y ninguna como <a>", () => {
    usarEnlaces(REESCRITAS.map((url, i) => ({ texto: `Reescrita ${i}`, url })))
    render(<PieDePagina />)
    expect(anclas().map((a) => JSON.stringify(a.getAttribute("href")))).toEqual([])
    expect(marcadores().map((m) => m.textContent)).toEqual(
      REESCRITAS.map((_, i) => `Reescrita ${i}`),
    )
  })

  it("en producción, ninguna sale: ni <a>, ni marcador, ni la lista", () => {
    vi.stubEnv("PROD", true)
    usarEnlaces(REESCRITAS.map((url, i) => ({ texto: `Reescrita ${i}`, url })))
    render(<PieDePagina />)
    expect(anclas()).toEqual([])
    expect(marcadores()).toEqual([])
    expect(screen.queryByRole("list", { name: "Enlaces del colegio" })).toBeNull()
  })

  it("mezcladas con las publicables, solo salen las 4 publicables, en orden, en los dos modos", () => {
    const mezcla: EnlaceDelColegio[] = []
    REESCRITAS.forEach((url, i) => {
      mezcla.push({ texto: `Reescrita ${i}`, url })
      const buena = PUBLICABLES[i % PUBLICABLES.length]
      if (i < PUBLICABLES.length && buena) mezcla.push({ texto: `Buena ${i}`, url: buena })
    })
    usarEnlaces(mezcla)
    const { rerender } = render(<PieDePagina />)
    expect(anclas().map((a) => a.getAttribute("href"))).toEqual(PUBLICABLES)
    vi.stubEnv("PROD", true)
    rerender(<PieDePagina />)
    expect(anclas().map((a) => a.getAttribute("href"))).toEqual(PUBLICABLES)
    expect(marcadores()).toEqual([])
  })
})

describe("ataque (DESIGN-01b-1 r3): barrido de caracteres invisibles o de control en cada posición", () => {
  // Controles C0, espacio, DEL, controles C1, espacios raros, marcas de dirección, caracteres de
  // formato, selectores de variante y etiquetas Unicode, insertados en cada posición de las 4 URL
  // publicables y de una URL con ruta, consulta y fragmento.
  const puntos: number[] = []
  for (let c = 0x00; c <= 0x20; c += 1) puntos.push(c)
  for (let c = 0x7f; c <= 0xa0; c += 1) puntos.push(c)
  for (let c = 0x2000; c <= 0x206f; c += 1) puntos.push(c)
  for (let c = 0xfe00; c <= 0xfe0f; c += 1) puntos.push(c)
  for (let c = 0xe0020; c <= 0xe007f; c += 1) puntos.push(c)
  puntos.push(0xad, 0x34f, 0x61c, 0x115f, 0x1160, 0x17b4, 0x17b5, 0x180e, 0x3000, 0x3164)
  puntos.push(0xfeff, 0xffa0, 0xfff9, 0xfffa, 0xfffb, 0xe0001, 0xe0100, 0x1d173)
  const bases = [...PUBLICABLES, "https://colegio.mx/aviso-de-privacidad?x=1#y"]

  // Lo que se publica solo puede tener ASCII visible, y espacios solo en tel: o mailto: (el
  // analizador los deja tal cual en esos esquemas; en https: los codifica).
  const soloVisible = (url: string) => {
    const esquema = url.slice(0, url.indexOf(":") + 1)
    for (const caracter of url) {
      const punto = caracter.codePointAt(0) ?? 0
      if (punto >= 0x21 && punto <= 0x7e) continue
      if (punto === 0x20 && (esquema === "tel:" || esquema === "mailto:")) continue
      return false
    }
    return true
  }

  it("ninguna inserción publicable lleva un carácter invisible o de control", () => {
    const publicadas: string[] = []
    let casos = 0
    for (const base of bases) {
      const caracteres = [...base]
      for (let i = 0; i <= caracteres.length; i += 1) {
        for (const punto of puntos) {
          const url = [
            ...caracteres.slice(0, i),
            String.fromCodePoint(punto),
            ...caracteres.slice(i),
          ].join("")
          casos += 1
          if (esUrlPublicable(url) && !soloVisible(url)) publicadas.push(JSON.stringify(url))
        }
      }
    }
    expect(casos).toBeGreaterThan(30_000)
    expect(publicadas, "se publicaría una URL con un carácter invisible").toEqual([])
  })

  it("toda URL publicable del barrido es exactamente la que usa el navegador", () => {
    const distintas: string[] = []
    for (const base of bases) {
      const caracteres = [...base]
      for (let i = 0; i <= caracteres.length; i += 1) {
        for (const punto of puntos) {
          const url = [
            ...caracteres.slice(0, i),
            String.fromCodePoint(punto),
            ...caracteres.slice(i),
          ].join("")
          if (!esUrlPublicable(url)) continue
          const href = hrefAnalizado(url)
          if (href !== url && href !== `${url}/`) distintas.push(JSON.stringify(url))
        }
      }
    }
    expect(distintas).toEqual([])
  })
})
