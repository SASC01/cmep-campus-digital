import { describe, expect, it } from "vitest"

import tokens from "./tokens.css?raw"

// ---------------------------------------------------------------------------
// Color, en sRGB [0, 1]. Auxiliares del propio archivo de prueba (DESIGN-01a, D-2).
// ---------------------------------------------------------------------------
type Rgb = [number, number, number]
type Rgba = [number, number, number, number]

const clamp01 = (valor: number) => Math.min(1, Math.max(0, valor))

const hexARgb = (hex: string): Rgb => {
  const limpio = hex.replace("#", "")
  const r = parseInt(limpio.slice(0, 2), 16) / 255
  const g = parseInt(limpio.slice(2, 4), 16) / 255
  const b = parseInt(limpio.slice(4, 6), 16) / 255
  return [r, g, b]
}

const canalASrgbLineal = (canal: number) =>
  canal <= 0.04045 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4
const canalALinealASrgb = (canal: number) =>
  canal <= 0.0031308 ? canal * 12.92 : 1.055 * canal ** (1 / 2.4) - 0.055

const luminanciaRelativa = ([r, g, b]: Rgb): number => {
  const rl = canalASrgbLineal(r)
  const gl = canalASrgbLineal(g)
  const bl = canalASrgbLineal(b)
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
}

const razonDeContraste = (a: Rgb, b: Rgb): number => {
  const la = luminanciaRelativa(a)
  const lb = luminanciaRelativa(b)
  const claro = Math.max(la, lb)
  const oscuro = Math.min(la, lb)
  return (claro + 0.05) / (oscuro + 0.05)
}

// Compone un color con transparencia sobre un fondo opaco, canal por canal, en sRGB.
const componer = ([tr, tg, tb, ta]: Rgba, [br, bg, bb]: Rgb): Rgb => [
  ta * tr + (1 - ta) * br,
  ta * tg + (1 - ta) * bg,
  ta * tb + (1 - ta) * bb,
]

// Matriz de saturación de Filter Effects (feColorMatrix type="saturate"), s = 1.7.
const S = 1.7
const matrizSaturacion = ([r, g, b]: Rgb): Rgb => [
  clamp01((0.213 + 0.787 * S) * r + (0.715 - 0.715 * S) * g + (0.072 - 0.072 * S) * b),
  clamp01((0.213 - 0.213 * S) * r + (0.715 + 0.285 * S) * g + (0.072 - 0.072 * S) * b),
  clamp01((0.213 - 0.213 * S) * r + (0.715 - 0.715 * S) * g + (0.072 + 0.928 * S) * b),
]

const saturarEnSrgb = (rgb: Rgb): Rgb => matrizSaturacion(rgb)
const saturarEnLineal = (rgb: Rgb): Rgb => {
  const lineal = rgb.map(canalASrgbLineal) as Rgb
  const satLineal = matrizSaturacion(lineal)
  return satLineal.map((c) => clamp01(canalALinealASrgb(c))) as Rgb
}

type VarianteSaturacion = "srgb" | "lineal" | "ninguna"
const VARIANTES: VarianteSaturacion[] = ["srgb", "lineal", "ninguna"]

const aplicarSaturacion = (rgb: Rgb, variante: VarianteSaturacion): Rgb => {
  if (variante === "srgb") return saturarEnSrgb(rgb)
  if (variante === "lineal") return saturarEnLineal(rgb)
  return rgb
}

// ---------------------------------------------------------------------------
// Tokens (deben coincidir con frontend/src/styles/tokens.css; la aserción 3 los revisa)
// ---------------------------------------------------------------------------
const COLOR = {
  background: hexARgb("#E9EEF3"),
  surface: hexARgb("#FFFFFF"),
  foreground: hexARgb("#16202E"),
  muted: hexARgb("#EFECE3"),
  mutedForeground: hexARgb("#3D4654"),
  input: hexARgb("#5A6472"), // --field-border, resuelto a través de --input (cierre de DESIGN-01a)
  primary: hexARgb("#22409A"),
  primaryForeground: hexARgb("#FFFFFF"),
  accent: hexARgb("#22409A"),
  accentForeground: hexARgb("#FFFFFF"),
  accentSoft: hexARgb("#E1E7F7"),
  accentSoftGlass: hexARgb("#E8ECF8"),
  link: hexARgb("#1B3480"),
  brand: hexARgb("#1D5B4B"),
  brandForeground: hexARgb("#FFFFFF"),
  brandSoft: hexARgb("#E1EEE8"),
  ring: hexARgb("#22409A"), // var(--accent)
  success: hexARgb("#1D5B4B"),
  successSoft: hexARgb("#E1EEE8"),
  warning: hexARgb("#7A4F09"),
  warningSoft: hexARgb("#F6EBD3"),
  danger: hexARgb("#A3341F"),
  dangerSoft: hexARgb("#F7E4DE"),
  destructive: hexARgb("#A3341F"),
  destructiveForeground: hexARgb("#FFFFFF"),
  orbBlue: hexARgb("#22409A"), // var(--accent)
  orbGreen: hexARgb("#1D5B4B"), // var(--brand)
  orbSoft: hexARgb("#9FB3E6"),
}

const VEIL: Rgba = [247 / 255, 245 / 255, 239 / 255, 0.35]
const GLASS: Rgba = [1, 1, 1, 0.62]
const GLASS_STRONG: Rgba = [1, 1, 1, 0.78]
const GLASS_ACCENT: Rgba = [34 / 255, 64 / 255, 154 / 255, 0.78]

// Los cuatro fondos de partida, con el velo compuesto encima (obligatorio, §3).
const FONDOS: Rgb[] = [COLOR.background, COLOR.orbBlue, COLOR.orbGreen, COLOR.orbSoft].map((base) =>
  componer(VEIL, base),
)

const vidrio = (fondo: Rgb, variante: VarianteSaturacion): Rgb =>
  componer(GLASS, aplicarSaturacion(fondo, variante))
const vidrioFuerte = (fondo: Rgb, variante: VarianteSaturacion): Rgb =>
  componer(GLASS_STRONG, aplicarSaturacion(fondo, variante))
const vidrioAzul = (fondo: Rgb, variante: VarianteSaturacion): Rgb =>
  componer(GLASS_ACCENT, aplicarSaturacion(fondo, variante))
const tarjetaInterna = (fondo: Rgb, variante: VarianteSaturacion): Rgb =>
  componer(GLASS_STRONG, aplicarSaturacion(vidrioAzul(fondo, variante), variante))

type Superficie = (fondo: Rgb, variante: VarianteSaturacion) => Rgb

// Peor caso: el mínimo de la razón de contraste sobre los 4 fondos y las 3 variantes.
const peorCaso = (texto: Rgb, superficie: Superficie): number => {
  let minimo = Infinity
  for (const fondo of FONDOS) {
    for (const variante of VARIANTES) {
      const razon = razonDeContraste(texto, superficie(fondo, variante))
      if (razon < minimo) minimo = razon
    }
  }
  return minimo
}

describe("tokens.css", () => {
  it("no está vacío y contiene --background (condición de parada de D-2)", () => {
    expect(tokens.length).toBeGreaterThan(0)
    expect(tokens).toContain("--background")
  })

  it("no usa el signo menos U+2212 en el interletraje, solo el guion ASCII", () => {
    expect(tokens).not.toContain("−")
  })

  describe("valores de :root", () => {
    const pares: Array<[string, string]> = [
      ["--background", "#e9eef3"],
      ["--background-veil", "rgb(247 245 239 / 0.35)"],
      ["--surface", "#ffffff"],
      ["--foreground", "#16202e"],
      ["--muted", "#efece3"],
      ["--muted-foreground", "#3d4654"],
      ["--border", "#ddd8cb"],
      ["--field-border", "#5a6472"],
      ["--primary", "#22409a"],
      ["--primary-foreground", "#ffffff"],
      ["--accent", "#22409a"],
      ["--accent-foreground", "#ffffff"],
      ["--accent-soft", "#e1e7f7"],
      ["--accent-soft-glass", "#e8ecf8"],
      ["--link", "#1b3480"],
      ["--brand", "#1d5b4b"],
      ["--brand-foreground", "#ffffff"],
      ["--brand-soft", "#e1eee8"],
      ["--success", "#1d5b4b"],
      ["--success-soft", "#e1eee8"],
      ["--warning", "#7a4f09"],
      ["--warning-soft", "#f6ebd3"],
      ["--danger", "#a3341f"],
      ["--danger-soft", "#f7e4de"],
      ["--destructive", "#a3341f"],
      ["--destructive-foreground", "#ffffff"],
      ["--glass", "rgb(255 255 255 / 0.62)"],
      ["--glass-strong", "rgb(255 255 255 / 0.78)"],
      ["--glass-accent", "rgb(34 64 154 / 0.78)"],
      ["--glass-border", "rgb(255 255 255 / 0.75)"],
      ["--orb-soft", "#9fb3e6"],
      ["--control-height", "2.75rem"],
      ["--orb-blue-size", "620px"],
      ["--orb-green-size", "560px"],
      ["--orb-soft-size", "520px"],
      ["--orb-blue-cycle", "22s"],
      ["--orb-green-cycle", "26s"],
      ["--orb-soft-cycle", "30s"],
    ]

    it.each(pares)("%s vale %s", (token, valor) => {
      expect(tokens.toLowerCase()).toContain(`${token}: ${valor}`)
    })

    it("--ring, --orb-blue y --orb-green apuntan a su token", () => {
      expect(tokens).toContain("--ring: var(--accent)")
      expect(tokens).toContain("--orb-blue: var(--accent)")
      expect(tokens).toContain("--orb-green: var(--brand)")
    })

    // Cierre de DESIGN-01a (corrección de M-01, revision.md): --input ya no apunta a --foreground
    // (2 px, tinta) ni lleva un valor propio; apunta a --field-border, un token base nuevo, más
    // claro y de 1 px, con contraste 3:1 verificado contra vidrio y superficies sólidas (descripción
    // más abajo). El botón `outline` en contexto opaco conserva la tinta con border-foreground
    // (button-variants.ts), no con --input ni --field-border.
    it("--input apunta a --field-border, como --ring apunta a --accent", () => {
      expect(tokens).toContain("--input: var(--field-border)")
    })

    it("los derivados de shadcn apuntan a un token propio (S-12)", () => {
      expect(tokens).toContain("--card: var(--surface)")
      expect(tokens).toContain("--card-foreground: var(--foreground)")
      expect(tokens).toContain("--popover: var(--surface)")
      expect(tokens).toContain("--popover-foreground: var(--foreground)")
      expect(tokens).toContain("--secondary: var(--muted)")
      expect(tokens).toContain("--secondary-foreground: var(--foreground)")
    })

    it("no declara --radius suelto (los radios son los de DESIGN.md §5)", () => {
      expect(tokens).not.toMatch(/(^|\s)--radius:\s/)
    })
  })

  it("el bloque @supports not (…backdrop-filter…) redefine el vidrio a sólido", () => {
    const inicio = tokens.indexOf("@supports not")
    expect(inicio).toBeGreaterThan(-1)
    const bloque = tokens.slice(inicio, inicio + 400)
    expect(bloque).toContain("--glass: var(--surface)")
    expect(bloque).toContain("--glass-strong: var(--surface)")
    expect(bloque).toContain("--glass-accent: var(--accent)")
  })

  it('[data-material="opaco"] redefine las siete variables del contexto opaco', () => {
    const inicio = tokens.indexOf('[data-material="opaco"]')
    expect(inicio).toBeGreaterThan(-1)
    const bloque = tokens.slice(inicio, inicio + 400)
    expect(bloque).toContain("--glass: var(--surface)")
    expect(bloque).toContain("--glass-strong: var(--surface)")
    expect(bloque).toContain("--glass-border: var(--border)")
    expect(bloque).toContain("--glass-highlight: 0 0 transparent")
    expect(bloque).toContain("--shadow-glass: 0 0 transparent")
    expect(bloque).toContain("--glass-filter: none")
    expect(bloque).toContain("--glass-strong-filter: none")
  })

  it('el @media (width >= 48rem) fija --control-height a 2.25rem para [data-densidad="densa"]', () => {
    expect(tokens).toContain("@media (width >= 48rem)")
    const inicio = tokens.indexOf("@media (width >= 48rem)")
    const bloque = tokens.slice(inicio, inicio + 200)
    expect(bloque).toContain('[data-densidad="densa"]')
    expect(bloque).toContain("--control-height: 2.25rem")
  })

  describe("@theme", () => {
    const anulaciones = [
      "--color-*: initial",
      "--text-*: initial",
      "--font-*: initial",
      "--font-weight-*: initial",
      "--radius-*: initial",
      "--shadow-*: initial",
      "--inset-shadow-*: initial",
      "--drop-shadow-*: initial",
      "--text-shadow-*: initial",
      "--blur-*: initial",
    ]

    it.each(anulaciones)("anula %s", (linea) => {
      expect(tokens).toContain(linea)
    })

    it("declara las tres familias con su respaldo del sistema", () => {
      expect(tokens).toContain(
        '--font-sans: "Atkinson Hyperlegible Next", ui-sans-serif, system-ui, sans-serif',
      )
      expect(tokens).toContain(
        '--font-heading: "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif',
      )
      expect(tokens).toContain('--font-mono: "Atkinson Hyperlegible Mono", ui-monospace, monospace')
    })

    it("declara los tres pesos", () => {
      expect(tokens).toContain("--font-weight-normal: 400")
      expect(tokens).toContain("--font-weight-medium: 500")
      expect(tokens).toContain("--font-weight-bold: 700")
    })

    const escala: Array<[string, string, string, string, string?]> = [
      ["--text-display", "2.75rem", "1.05", "-0.03em", "700"],
      ["--text-h1", "1.75rem", "1.15", "-0.02em", "700"],
      ["--text-h2", "1.375rem", "1.2", "-0.015em", "700"],
      ["--text-h3", "1.125rem", "1.3", "-0.01em", "500"],
      ["--text-body", "1rem", "1.5", "0"],
      ["--text-small", "0.875rem", "1.45", "0"],
      ["--text-caption", "0.75rem", "1.35", "0"],
    ]

    it.each(escala)(
      "%s: tamaño %s, interlineado %s, interletraje %s",
      (token, tamano, interlineado, interletraje, peso) => {
        expect(tokens).toContain(`${token}: ${tamano}`)
        expect(tokens).toContain(`${token}--line-height: ${interlineado}`)
        expect(tokens).toContain(`${token}--letter-spacing: ${interletraje}`)
        if (peso !== undefined) {
          expect(tokens).toContain(`${token}--font-weight: ${peso}`)
        }
      },
    )

    // CLASES-a: --text-display-compacto es un token nuevo; va en su propio caso, con su propio ID
    // al inicio del título (M-02 del plan), sin tocar los 7 casos existentes de arriba (PA-16).
    it("PR-A24: --text-display-compacto: tamaño 2rem, interlineado 1.05, interletraje -0.03em", () => {
      expect(tokens).toContain("--text-display-compacto: 2rem")
      expect(tokens).toContain("--text-display-compacto--line-height: 1.05")
      expect(tokens).toContain("--text-display-compacto--letter-spacing: -0.03em")
      expect(tokens).toContain("--text-display-compacto--font-weight: 700")
    })

    const radios: Array<[string, string]> = [
      ["--radius-hero", "24px"],
      ["--radius-panel", "22px"],
      ["--radius-bar", "20px"],
      ["--radius-card", "16px"],
      ["--radius-row", "14px"],
      ["--radius-date", "12px"],
      ["--radius-pill", "999px"],
    ]

    it.each(radios)("%s vale %s", (token, valor) => {
      expect(tokens).toContain(`${token}: ${valor}`)
    })

    it("declara --shadow-overlay", () => {
      expect(tokens).toContain("--shadow-overlay: 0 8px 24px rgb(22 32 46 / 0.12)")
    })
  })

  describe("materiales", () => {
    it.each(["vidrio", "vidrio-fuerte", "vidrio-azul"] as const)(
      "la utilidad %s existe y usa backdrop-filter",
      (nombre) => {
        const inicio = tokens.indexOf(`@utility ${nombre} {`)
        expect(inicio).toBeGreaterThan(-1)
        const fin = tokens.indexOf("}", inicio)
        const bloque = tokens.slice(inicio, fin)
        expect(bloque).toContain("backdrop-filter")
        expect(bloque).toContain("-webkit-backdrop-filter")
      },
    )

    it.each(["--glass-filter", "--glass-strong-filter", "--glass-accent-filter"])(
      "%s contiene saturate(170%%)",
      (token) => {
        const linea = tokens.split("\n").find((l) => l.trim().startsWith(`${token}:`))
        expect(linea).toBeDefined()
        expect(linea).toContain("saturate(170%)")
      },
    )

    it("sin-sombra-de-vidrio redefine --shadow-glass a transparente", () => {
      const inicio = tokens.indexOf("@utility sin-sombra-de-vidrio {")
      expect(inicio).toBeGreaterThan(-1)
      const fin = tokens.indexOf("}", inicio)
      expect(tokens.slice(inicio, fin)).toContain("--shadow-glass: 0 0 transparent")
    })
  })

  describe("fondo con orbes (§D-2)", () => {
    it("[data-fondo] es fijo, no recibe el puntero y va debajo de todo", () => {
      const inicio = tokens.indexOf("[data-fondo] {")
      expect(inicio).toBeGreaterThan(-1)
      const fin = tokens.indexOf("}", inicio)
      const bloque = tokens.slice(inicio, fin)
      expect(bloque).toContain("position: fixed")
      expect(bloque).toContain("pointer-events: none")
      expect(bloque).toContain("z-index: -1")
    })

    it("[data-velo] usa var(--background-veil)", () => {
      const inicio = tokens.indexOf("[data-velo] {")
      expect(inicio).toBeGreaterThan(-1)
      const fin = tokens.indexOf("}", inicio)
      expect(tokens.slice(inicio, fin)).toContain("var(--background-veil)")
    })

    it("cada @keyframes orbe-* solo declara transform, con la amplitud y la escala del plan", () => {
      for (const nombre of ["orbe-azul", "orbe-verde", "orbe-suave"]) {
        const inicio = tokens.indexOf(`@keyframes ${nombre} {`)
        expect(inicio, `@keyframes ${nombre} no existe`).toBeGreaterThan(-1)
        let profundidad = 0
        let fin = inicio
        const abre = tokens.indexOf("{", inicio)
        for (let i = abre; i < tokens.length; i += 1) {
          if (tokens[i] === "{") profundidad += 1
          if (tokens[i] === "}") profundidad -= 1
          if (profundidad === 0) {
            fin = i
            break
          }
        }
        const bloque = tokens.slice(inicio, fin)
        const declaraciones = [...bloque.matchAll(/\n\s*([\w-]+):\s*[^;]+;/g)].map((m) => m[1])
        expect(declaraciones.length).toBeGreaterThan(0)
        expect(declaraciones.every((propiedad) => propiedad === "transform")).toBe(true)
        expect(bloque).toContain("translate(0, 0) scale(1)")
        const traslados = [...bloque.matchAll(/translate\((-?\d+)px,\s*(-?\d+)px\)/g)]
        for (const [, x, y] of traslados) {
          const modulo = Math.hypot(Number(x), Number(y))
          expect(modulo).toBeLessThanOrEqual(60)
        }
        const escalas = [...bloque.matchAll(/scale\(([\d.]+)\)/g)].map(([, valor]) => Number(valor))
        for (const escala of escalas) {
          expect(escala).toBeGreaterThanOrEqual(0.92)
          expect(escala).toBeLessThanOrEqual(1.08)
        }
      }
    })

    it("prefers-reduced-motion quita la animación; sin movimiento, se pausa", () => {
      expect(tokens).toContain("@media (prefers-reduced-motion: reduce)")
      const inicio = tokens.indexOf("@media (prefers-reduced-motion: reduce)")
      const bloque = tokens.slice(inicio, inicio + 150)
      expect(bloque).toContain("[data-orbe]")
      expect(bloque).toContain("animation: none")
      expect(tokens).toContain('[data-fondo][data-movimiento="no"] [data-orbe] {')
      const inicioPausa = tokens.indexOf('[data-fondo][data-movimiento="no"] [data-orbe] {')
      const bloquePausa = tokens.slice(inicioPausa, inicioPausa + 100)
      expect(bloquePausa).toContain("animation-play-state: paused")
    })

    it("will-change aparece exactamente una vez, en [data-orbe]", () => {
      const apariciones = tokens.match(/will-change/g) ?? []
      expect(apariciones).toHaveLength(1)
      const inicio = tokens.indexOf("[data-orbe] {")
      const fin = tokens.indexOf("}", inicio)
      expect(tokens.slice(inicio, fin)).toContain("will-change: transform")
    })
  })

  // -------------------------------------------------------------------------
  // Contraste calculado (WCAG 2.2), método de DESIGN.md §3.
  // Si un par no llega a su umbral, el programador se detiene: no cambia valores.
  // -------------------------------------------------------------------------
  describe("contraste sobre superficies sólidas (>= 4.5, salvo lo marcado)", () => {
    const pares: Array<[string, Rgb, Rgb, number]> = [
      ["--foreground / --surface", COLOR.foreground, COLOR.surface, 4.5],
      ["--foreground / --background", COLOR.foreground, COLOR.background, 4.5],
      ["--muted-foreground / --surface", COLOR.mutedForeground, COLOR.surface, 4.5],
      ["--muted-foreground / --background", COLOR.mutedForeground, COLOR.background, 4.5],
      ["--muted-foreground / --muted", COLOR.mutedForeground, COLOR.muted, 4.5],
      ["--primary-foreground / --primary", COLOR.primaryForeground, COLOR.primary, 4.5],
      ["--accent-foreground / --accent", COLOR.accentForeground, COLOR.accent, 4.5],
      ["--accent-soft / --accent", COLOR.accentSoft, COLOR.accent, 4.5],
      ["--accent-soft-glass / --accent", COLOR.accentSoftGlass, COLOR.accent, 4.5],
      ["--link / --surface", COLOR.link, COLOR.surface, 4.5],
      ["--link / --muted", COLOR.link, COLOR.muted, 4.5],
      ["--link / --accent-soft", COLOR.link, COLOR.accentSoft, 4.5],
      ["--brand-foreground / --brand", COLOR.brandForeground, COLOR.brand, 4.5],
      ["--brand-soft / --brand", COLOR.brandSoft, COLOR.brand, 4.5],
      ["--success / --surface", COLOR.success, COLOR.surface, 4.5],
      ["--success / --success-soft", COLOR.success, COLOR.successSoft, 4.5],
      ["--warning / --surface", COLOR.warning, COLOR.surface, 4.5],
      ["--warning / --warning-soft", COLOR.warning, COLOR.warningSoft, 4.5],
      ["--warning / --muted", COLOR.warning, COLOR.muted, 4.5],
      ["--danger / --surface", COLOR.danger, COLOR.surface, 4.5],
      ["--danger / --background", COLOR.danger, COLOR.background, 4.5],
      ["--danger / --danger-soft", COLOR.danger, COLOR.dangerSoft, 4.5],
      [
        "--destructive-foreground / --destructive",
        COLOR.destructiveForeground,
        COLOR.destructive,
        4.5,
      ],
      [
        "--destructive / --danger-soft (error de un campo)",
        COLOR.destructive,
        COLOR.dangerSoft,
        4.5,
      ],
      ["--input / --surface", COLOR.input, COLOR.surface, 3],
      ["--input / --background", COLOR.input, COLOR.background, 3],
      ["--ring / --surface", COLOR.ring, COLOR.surface, 3],
      ["--ring / --background", COLOR.ring, COLOR.background, 3],
      ["#FFFFFF / --primary (anillo de foco interior)", hexARgb("#FFFFFF"), COLOR.primary, 3],
      [
        "#FFFFFF / --destructive (anillo de foco interior)",
        hexARgb("#FFFFFF"),
        COLOR.destructive,
        3,
      ],
    ]

    it.each(pares)("%s", (nombre, texto, fondo, umbral) => {
      const razon = razonDeContraste(texto, fondo)
      expect(
        razon,
        `${nombre}: razón calculada ${razon.toFixed(2)}, umbral ${umbral}`,
      ).toBeGreaterThanOrEqual(umbral)
    })
  })

  describe("contraste sobre vidrio, peor caso (4 fondos x 3 variantes de saturación)", () => {
    const altoContraste: Array<[string, Rgb]> = [
      ["--foreground", COLOR.foreground],
      ["--muted-foreground", COLOR.mutedForeground],
      ["--link", COLOR.link],
      ["--warning", COLOR.warning],
      ["--success", COLOR.success],
      ["--brand", COLOR.brand],
    ]

    it.each(altoContraste)("%s sobre vidrio (62%%) >= 4.5", (nombre, texto) => {
      const razon = peorCaso(texto, vidrio)
      expect(razon, `${nombre} sobre vidrio: peor caso ${razon.toFixed(2)}`).toBeGreaterThanOrEqual(
        4.5,
      )
    })

    const bordeYFoco: Array<[string, Rgb]> = [
      ["--input (contorno, 3:1)", COLOR.input],
      ["--ring (foco, 3:1)", COLOR.ring],
    ]

    it.each(bordeYFoco)("%s sobre vidrio (62%%) >= 3", (nombre, texto) => {
      const razon = peorCaso(texto, vidrio)
      expect(razon, `${nombre} sobre vidrio: peor caso ${razon.toFixed(2)}`).toBeGreaterThanOrEqual(
        3,
      )
    })

    it("--danger como icono (3:1) sobre vidrio (62%) >= 3", () => {
      const razon = peorCaso(COLOR.danger, vidrio)
      expect(razon, `--danger sobre vidrio: peor caso ${razon.toFixed(2)}`).toBeGreaterThanOrEqual(
        3,
      )
    })

    const superficies: Array<[string, Superficie]> = [
      ["vidrio fuerte (78%)", vidrioFuerte],
      ["tarjeta interna (vidrio fuerte sobre vidrio azul)", tarjetaInterna],
    ]

    for (const [nombreSuperficie, superficie] of superficies) {
      const textoAltoContraste: Array<[string, Rgb]> = [
        ["--foreground", COLOR.foreground],
        ["--muted-foreground", COLOR.mutedForeground],
        ["--link", COLOR.link],
        ["--warning", COLOR.warning],
        ["--success", COLOR.success],
        ["--danger", COLOR.danger],
        ["--brand", COLOR.brand],
      ]

      it.each(textoAltoContraste)(`%s sobre ${nombreSuperficie} >= 4.5`, (nombre, texto) => {
        const razon = peorCaso(texto, superficie)
        expect(
          razon,
          `${nombre} sobre ${nombreSuperficie}: peor caso ${razon.toFixed(2)}`,
        ).toBeGreaterThanOrEqual(4.5)
      })

      const textoBordeYFoco: Array<[string, Rgb]> = [
        ["--input (contorno, 3:1)", COLOR.input],
        ["--ring (foco, 3:1)", COLOR.ring],
      ]

      it.each(textoBordeYFoco)(`%s sobre ${nombreSuperficie} >= 3`, (nombre, texto) => {
        const razon = peorCaso(texto, superficie)
        expect(
          razon,
          `${nombre} sobre ${nombreSuperficie}: peor caso ${razon.toFixed(2)}`,
        ).toBeGreaterThanOrEqual(3)
      })
    }
  })

  describe("contraste sobre vidrio azul, peor caso", () => {
    const pares: Array<[string, Rgb]> = [
      ["#FFFFFF (--accent-foreground)", hexARgb("#FFFFFF")],
      ["--accent-soft-glass", COLOR.accentSoftGlass],
    ]

    it.each(pares)("%s sobre vidrio azul (78%%) >= 4.5", (nombre, texto) => {
      const razon = peorCaso(texto, vidrioAzul)
      expect(
        razon,
        `${nombre} sobre vidrio azul: peor caso ${razon.toFixed(2)}`,
      ).toBeGreaterThanOrEqual(4.5)
    })
  })
})
