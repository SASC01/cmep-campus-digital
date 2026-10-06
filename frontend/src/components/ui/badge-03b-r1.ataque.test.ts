import { describe, expect, it } from "vitest"

import tokens from "../../styles/tokens.css?raw"
import badge from "./badge.tsx?raw"

// Ataque del Tester (AUTH-03b, ronda 1): la insignia (DESIGN.md §7.8) pinta texto de 12 px
// (--text-caption) en el color del estado sobre su fondo *-soft sólido. Cada par que usa
// components/ui/badge.tsx debe llegar a 4.5:1 (WCAG 2.2, AA para texto normal). Los pares se leen
// del propio badge.tsx y los valores de tokens.css, no se copian del plan.

const raiz = (() => {
  const desde = tokens.indexOf(":root")
  const abre = tokens.indexOf("{", desde)
  const cierra = tokens.indexOf("}", abre)
  return tokens.slice(abre + 1, cierra)
})()

const valorDe = (token: string): string => {
  const coincidencia = new RegExp(`${token}\\s*:\\s*([^;]+);`).exec(raiz)
  const valor = coincidencia?.[1]?.trim()
  if (!valor) throw new Error(`${token} no está en :root de tokens.css`)
  const referencia = /^var\((--[\w-]+)\)$/.exec(valor)
  return referencia?.[1] ? valorDe(referencia[1]) : valor
}

type Rgb = [number, number, number]
const hexARgb = (hex: string): Rgb => {
  const limpio = hex.replace("#", "")
  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) throw new Error(`no es un color hexadecimal: ${hex}`)
  return [0, 2, 4].map((i) => parseInt(limpio.slice(i, i + 2), 16) / 255) as Rgb
}
const lineal = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminancia = ([r, g, b]: Rgb) => 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b)
const razon = (a: Rgb, b: Rgb) => {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number]
  return (claro + 0.05) / (oscuro + 0.05)
}

describe("ataque (AUTH-03b r1): contraste de las insignias", () => {
  const variantes = [...badge.matchAll(/(\w+):\s*"bg-([\w-]+)\s+text-([\w-]+)"/g)].map(
    ([, nombre, fondo, texto]) => ({ nombre, fondo, texto }),
  )

  // CLASES-02 ronda 0 de 02c (C-19, Enmienda 1, M-03; §D-2C4): badge.tsx suma la quinta variante,
  // `institucional` = `bg-accent-soft text-link` (la firma "Administración" del muro). No es un
  // estado ni pinta rojo. Sigue protegiendo lo mismo: se leen todas las variantes, cada una con su
  // par de tokens (el caso siguiente mide el contraste de las cinco), y el rojo solo en `danger`.
  it("se leyeron las cinco variantes de badge.tsx; institucional es accent-soft con link y el rojo solo está en danger", () => {
    expect(variantes.map((v) => v.nombre).sort()).toEqual([
      "danger",
      "institucional",
      "muted",
      "success",
      "warning",
    ])
    expect(variantes.find((v) => v.nombre === "institucional")).toEqual({
      nombre: "institucional",
      fondo: "accent-soft",
      texto: "link",
    })
    const conRojo = variantes.filter(({ fondo, texto }) =>
      [fondo, texto].some((token) => /^(danger|destructive)/.test(token ?? "")),
    )
    expect(conRojo.map((v) => v.nombre)).toEqual(["danger"])
  })

  it("cada variante: texto sobre su fondo ≥ 4.5:1", () => {
    for (const { nombre, fondo, texto } of variantes) {
      const valor = razon(hexARgb(valorDe(`--${texto}`)), hexARgb(valorDe(`--${fondo}`)))
      expect(
        valor,
        `${nombre}: --${texto} sobre --${fondo} = ${valor.toFixed(2)}`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })
})
