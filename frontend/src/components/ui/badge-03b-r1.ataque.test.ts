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

  it("se leyeron las cuatro variantes de badge.tsx", () => {
    expect(variantes.map((v) => v.nombre).sort()).toEqual(["danger", "muted", "success", "warning"])
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
