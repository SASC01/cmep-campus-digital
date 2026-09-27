import { describe, expect, it } from "vitest"

import design from "../../../docs/DESIGN.md?raw"
import tokens from "./tokens.css?raw"

// Ataques del Tester (DESIGN-01a, ronda 1): tokens.css contra las tablas de docs/DESIGN.md, leídas
// del propio documento (no copiadas del plan), y contraste de pares que el código usa y que la
// prueba del programador no lista (plan, "Puntos de ataque", punto 8).

const bloque = (texto: string, inicio: string): string => {
  const desde = texto.indexOf(inicio)
  if (desde === -1) throw new Error(`no se encontró "${inicio}"`)
  const abre = texto.indexOf("{", desde)
  let profundidad = 0
  for (let i = abre; i < texto.length; i += 1) {
    if (texto[i] === "{") profundidad += 1
    if (texto[i] === "}") profundidad -= 1
    if (profundidad === 0) return texto.slice(abre + 1, i)
  }
  throw new Error(`el bloque "${inicio}" no cierra`)
}

const declaraciones = (cuerpo: string): Map<string, string> => {
  const mapa = new Map<string, string>()
  for (const coincidencia of cuerpo.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const [, nombre, valor] = coincidencia
    if (nombre && valor) mapa.set(nombre, valor.trim())
  }
  return mapa
}

const raiz = declaraciones(bloque(tokens, ":root"))
const tema = declaraciones(bloque(tokens, "@theme {"))

// Resuelve var(--x) dentro de :root, hasta llegar a un valor literal.
const valorDe = (token: string): string => {
  let valor = raiz.get(token) ?? tema.get(token)
  if (valor === undefined) throw new Error(`${token} no está en tokens.css`)
  for (let vueltas = 0; vueltas < 5; vueltas += 1) {
    const referencia = /^var\((--[\w-]+)\)$/.exec(valor)
    if (!referencia?.[1]) return valor
    const siguiente = raiz.get(referencia[1])
    if (siguiente === undefined) throw new Error(`${referencia[1]} no está en :root`)
    valor = siguiente
  }
  throw new Error(`${token}: var() en ciclo`)
}

const normalizar = (valor: string) => valor.replace(/\s+/g, " ").trim().toLowerCase()

// Filas "| `--a` / `--b` | `#X` / `#Y` | …" de las tablas de tokens de color de DESIGN.md §3.
const filasDeColor = (): Array<[string, string]> => {
  const seccion = design.slice(design.indexOf("### Tokens"), design.indexOf("### Materiales"))
  const pares: Array<[string, string]> = []
  for (const linea of seccion.split("\n")) {
    const celdas = linea.split("|").map((celda) => celda.trim())
    const [, columnaToken, columnaValor] = celdas
    if (!columnaToken?.startsWith("`--") || !columnaValor) continue
    const nombres = [...columnaToken.matchAll(/`(--[\w-]+)`/g)].map((m) => m[1] ?? "")
    const valores = [...columnaValor.matchAll(/`(#[0-9A-Fa-f]{6}|rgb\([^)]*\))`/g)].map(
      (m) => m[1] ?? "",
    )
    nombres.forEach((nombre, indice) => {
      const valor = valores[indice]
      if (valor) pares.push([nombre, valor])
    })
  }
  return pares
}

describe("ataque (DESIGN-01a r1): tokens.css contra DESIGN.md", () => {
  it("cada color de las tablas de §3 tiene en tokens.css el mismo valor (con var() resuelto)", () => {
    const filas = filasDeColor()
    expect(filas.length, "no se leyó ninguna fila de color de DESIGN.md").toBeGreaterThan(25)
    for (const [token, valor] of filas) {
      expect(normalizar(valorDe(token)), `${token} en tokens.css`).toBe(normalizar(valor))
    }
  })

  it("materiales de §3: opacidades, filtros, borde, brillo y sombra del vidrio", () => {
    const esperado: Record<string, string> = {
      "--glass": "rgb(255 255 255 / 0.62)",
      "--glass-strong": "rgb(255 255 255 / 0.78)",
      "--glass-accent": "rgb(34 64 154 / 0.78)",
      "--glass-border": "rgb(255 255 255 / 0.75)",
      "--glass-highlight": "inset 0 1px 0 rgb(255 255 255 / 0.9)",
      "--shadow-glass": "0 8px 32px rgb(22 32 46 / 0.08)",
      "--glass-filter": "blur(28px) saturate(170%)",
      "--glass-strong-filter": "blur(32px) saturate(170%)",
      "--glass-accent-filter": "blur(30px) saturate(170%)",
      "--orb-soft": "#9fb3e6",
    }
    for (const [token, valor] of Object.entries(esperado)) {
      expect(design, `DESIGN.md ya no menciona ${valor}`).toContain(
        valor.replace("#9fb3e6", "#9FB3E6"),
      )
      expect(normalizar(valorDe(token)), `${token} en tokens.css`).toBe(normalizar(valor))
    }
    expect(valorDe("--orb-blue")).toBe(valorDe("--accent"))
    expect(valorDe("--orb-green")).toBe(valorDe("--brand"))
  })

  it("radios de §5, en px, igual que la tabla del documento", () => {
    const seccion = design.slice(design.indexOf("### Radios"), design.indexOf("### Bordes"))
    const filas = [...seccion.matchAll(/\|\s*`(--radius-[\w-]+)`\s*\|\s*(\d+)\s*px/g)]
    expect(filas.length).toBe(7)
    for (const [, token, px] of filas) {
      expect(valorDe(token ?? ""), `${token} en tokens.css`).toBe(`${px}px`)
    }
  })

  it("escala tipográfica de §4: tamaño, interlineado, interletraje y peso de cada token", () => {
    const seccion = design.slice(design.indexOf("### Escala"), design.indexOf("## 5."))
    const filas = [
      ...seccion.matchAll(
        /\|\s*`(--text-[\w-]+)`\s*\|\s*(\d+)\s*px\s*\/\s*([\d.]+)\s*\|\s*([^|]+)\|\s*([^|]+)\|/g,
      ),
    ]
    expect(filas.length).toBe(7)
    for (const [, token, px, interlineado, peso, interletraje] of filas) {
      const nombre = token ?? ""
      expect(valorDe(nombre), `${nombre}`).toBe(`${Number(px) / 16}rem`)
      expect(valorDe(`${nombre}--line-height`), `${nombre}--line-height`).toBe(interlineado)
      const espaciado = /`(-?[\d.]+em)`/.exec(interletraje ?? "")?.[1] ?? "0"
      expect(valorDe(`${nombre}--letter-spacing`), `${nombre}--letter-spacing`).toBe(espaciado)
      const pesoUnico = /^\s*(\d{3})\s*$/.exec(peso ?? "")?.[1]
      if (pesoUnico && ["--text-display", "--text-h1", "--text-h2", "--text-h3"].includes(nombre)) {
        expect(valorDe(`${nombre}--font-weight`), `${nombre}--font-weight`).toBe(pesoUnico)
      }
    }
  })

  it("sombra de las capas flotantes y familias de §4", () => {
    expect(design).toContain("--shadow-overlay: 0 8px 24px rgb(22 32 46 / 0.12)")
    expect(normalizar(valorDe("--shadow-overlay"))).toBe("0 8px 24px rgb(22 32 46 / 0.12)")
    expect(valorDe("--font-heading").startsWith('"Bricolage Grotesque"')).toBe(true)
    expect(valorDe("--font-sans").startsWith('"Atkinson Hyperlegible Next"')).toBe(true)
    expect(valorDe("--font-mono").startsWith('"Atkinson Hyperlegible Mono"')).toBe(true)
  })

  it("ningún token del documento usa el signo menos tipográfico, y tokens.css tampoco", () => {
    expect(tokens).not.toContain("−")
    const escala = design.slice(design.indexOf("### Escala"), design.indexOf("## 5."))
    const tabla = escala.split("\n").filter((linea) => linea.startsWith("| `--text-"))
    expect(tabla.join("\n")).not.toContain("−")
  })
})

// ---------------------------------------------------------------------------
// Contraste WCAG 2.2 de pares sólidos que el código usa (sin vidrio de por medio).
// ---------------------------------------------------------------------------
type Rgb = [number, number, number]

const hexARgb = (hex: string): Rgb => {
  const limpio = hex.replace("#", "")
  return [0, 2, 4].map((i) => parseInt(limpio.slice(i, i + 2), 16) / 255) as Rgb
}

const lineal = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminancia = ([r, g, b]: Rgb) => 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b)
const razon = (a: Rgb, b: Rgb) => {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number]
  return (claro + 0.05) / (oscuro + 0.05)
}
const mezclar = (arriba: Rgb, alfa: number, abajo: Rgb): Rgb =>
  arriba.map((c, i) => alfa * c + (1 - alfa) * (abajo[i] ?? 0)) as Rgb

const color = (token: string) => hexARgb(valorDe(token))

describe("ataque (DESIGN-01a r1): contraste de pares sólidos del código", () => {
  it.each([
    // [texto, fondo, umbral, dónde]
    ["--muted-foreground", "--muted", 4.5, "aviso de la temporal (ContrasenaTemporal)"],
    ["--foreground", "--muted", 4.5, "la temporal en text-h3 (ContrasenaTemporal)"],
    ["--success", "--surface", 4.5, "'Invitación creada…' y 'Correo actualizado…' en /admin"],
    ["--warning", "--surface", 4.5, "'Cuenta inactiva' en la ficha de /admin"],
    ["--destructive", "--surface", 4.5, "título de MensajeError"],
    ["--destructive", "--danger-soft", 4.5, "ErrorDeCampo"],
    ["--foreground", "--surface", 4.5, "texto de los campos y del aviso de sonner"],
    ["--muted-foreground", "--surface", 4.5, "placeholder y notas de /admin"],
    [
      "--muted-foreground",
      "--background",
      4.5,
      "Cargando y notas sobre el fondo (sin orbes en 01a)",
    ],
    ["--ring", "--muted", 3, "foco de 'Copiar' dentro de la temporal"],
    ["--input", "--surface", 3, "borde de 2 px de los campos y del outline opaco"],
  ] as const)("%s sobre %s ≥ %s (%s)", (texto, fondo, umbral, donde) => {
    const valor = razon(color(texto), color(fondo))
    expect(valor, `${texto} / ${fondo} (${donde}): ${valor.toFixed(2)}`).toBeGreaterThanOrEqual(
      umbral,
    )
  })

  it("texto blanco sobre el hover al 90 % de 'primary' y 'destructive', con blanco detrás (peor caso)", () => {
    const blanco = color("--surface")
    for (const token of ["--primary", "--destructive"]) {
      const fondo = mezclar(color(token), 0.9, blanco)
      const valor = razon(color("--primary-foreground"), fondo)
      expect(valor, `blanco / ${token} al 90 %: ${valor.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it("velo de los diálogos: tinta al 40 %, como §7.11", () => {
    expect(design).toContain("tinta al 40 % (`rgb(22 32 46 / 0.4)`)")
    expect(normalizar(valorDe("--foreground"))).toBe("#16202e")
  })
})
