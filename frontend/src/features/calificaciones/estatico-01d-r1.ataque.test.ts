import { describe, expect, it } from "vitest"

// Tester, ronda 1 de CALIFICACIONES-01d: revisión estática por texto fuente del código final de 01d
// (features/calificaciones, components/foco y las pruebas de 01d). Complementa CAL-1D09 y las 23
// reglas de la ronda 0 (que viven en otras *.ataque y corren en la suite completa). No depende del
// reloj.

const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

const esPrueba = (ruta: string) => /\.test\.tsx?$/.test(ruta)

const MODULO = Object.entries(fuentes).filter(
  ([ruta]) => ruta.startsWith("/src/features/calificaciones/") && !esPrueba(ruta),
)
const FOCO = Object.entries(fuentes).filter(
  ([ruta]) => ruta.startsWith("/src/components/foco/") && !esPrueba(ruta),
)
const PRUEBAS_DE_01D = Object.entries(fuentes).filter(
  ([ruta]) =>
    esPrueba(ruta) &&
    (ruta.startsWith("/src/features/calificaciones/") ||
      ruta.startsWith("/src/components/foco/") ||
      ruta === "/src/app/router-01d.test.tsx" ||
      ruta === "/src/app/rutas-01d-r1.ataque.test.tsx"),
)

const sinComentarios = (texto: string): string =>
  texto
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1")

const fuente = (ruta: string): string => {
  const texto = fuentes[ruta]
  if (texto === undefined) throw new Error(`Precondición: existe ${ruta}`)
  return texto
}

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u

describe("estática de 01d (ronda 1 del tester)", () => {
  it("CAL-T-182: hay código que revisar (precondición de las reglas siguientes)", () => {
    expect(MODULO.length).toBe(11)
    expect(FOCO.length).toBe(3)
    expect(PRUEBAS_DE_01D.length).toBeGreaterThanOrEqual(8)
  })

  it("CAL-T-184: components/foco no importa de features/ (crudo, comentarios incluidos en la forma de importación)", () => {
    for (const [ruta, texto] of FOCO) {
      expect(texto, ruta).not.toMatch(/from\s+["']@\/features\//)
      expect(texto, ruta).not.toMatch(/import\(\s*["']@\/features\//)
    }
  })

  it("CAL-T-185: sin emojis en el módulo, en components/foco ni en las pruebas de 01d", () => {
    for (const [ruta, texto] of [...MODULO, ...FOCO, ...PRUEBAS_DE_01D]) {
      expect(EMOJI.test(texto), ruta).toBe(false)
    }
  })

  it("CAL-T-186: ninguna acción principal en las dos vistas ni en sus componentes (variant=primary)", () => {
    for (const [ruta, texto] of MODULO) {
      expect(sinComentarios(texto), ruta).not.toMatch(/variant=["{]?["']?primary/)
    }
  })

  it("CAL-T-187: los textos de la interfaz viven en data.ts: ningún texto suelto en el JSX ni en atributos de texto de los .tsx del módulo", () => {
    for (const [ruta, texto] of MODULO.filter(([r]) => r.endsWith(".tsx"))) {
      const codigo = sinComentarios(texto)
      expect(codigo, ruta).not.toMatch(/>[^<>{}()=;]*[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,}[^<>{}()=;]*<\//)
      expect(codigo, ruta).not.toMatch(
        /\b(aria-label|title|placeholder|alt|titulo|texto|mensaje)="[^"]/,
      )
    }
  })

  it("CAL-T-188: sin la palabra fixed, valores arbitrarios -[…], text-danger ni text-destructive en el módulo (crudo)", () => {
    for (const [ruta, texto] of MODULO) {
      expect(texto, ruta).not.toMatch(/\bfixed\b/)
      expect(texto, ruta).not.toMatch(/-\[[^\]]+\]/)
      expect(texto, ruta).not.toMatch(/text-(danger|destructive)\b/)
    }
  })

  it("CAL-T-189: el gradebook nunca avisa y «Mis calificaciones» tiene un solo toast.error, sin id de sonner que junte intentos; los ganchos no avisan", () => {
    const gradebook = sinComentarios(fuente("/src/features/calificaciones/gradebook-view.tsx"))
    expect(gradebook).not.toMatch(/toast|sonner/)
    const ganchos = sinComentarios(fuente("/src/features/calificaciones/hooks.ts"))
    expect(ganchos).not.toMatch(/toast|sonner|onError/)
    const mis = sinComentarios(fuente("/src/features/calificaciones/mis-calificaciones-view.tsx"))
    expect(mis.match(/toast\.error\(/g)).toHaveLength(1)
    expect(mis).not.toMatch(/toast\.(success|info|warning|message)\(/)
    expect(mis).not.toMatch(/\bid:\s*["'`]/)
  })

  it("CAL-T-190: «Ver cálculo» no lleva enEspera (no pide nada) y el modal no tiene la equis de esquina", () => {
    const modal = sinComentarios(
      fuente("/src/features/calificaciones/components/calculo-de-calificacion.tsx"),
    )
    expect(modal).not.toMatch(/enEspera/)
    expect(modal).toMatch(/showCloseButton=\{false\}/)
    expect(modal).not.toMatch(/useQuery|useMutation|api\(/)
  })

  it("CAL-T-191: reloj fijo en toda prueba de 01d que construye fechas o compara textos de tiempo", () => {
    const conFechas = PRUEBAS_DE_01D.filter(([, texto]) =>
      /new Date\(|\d{4}-\d{2}-\d{2}T|Vence|Venció|vencimientoDe\(/.test(texto),
    )
    expect(conFechas.length).toBeGreaterThan(0)
    for (const [ruta, texto] of conFechas) {
      const fija = /useFakeTimers\(/.test(texto) && /setSystemTime\(/.test(texto)
      expect(fija, `${ruta} construye fechas sin fijar el reloj`).toBe(true)
    }
  })

  it("CAL-T-192: ninguna prueba de 01d termina con un return temprano antes de sus aserciones", () => {
    for (const [ruta, texto] of PRUEBAS_DE_01D) {
      expect(sinComentarios(texto), ruta).not.toMatch(/\bif\s*\([^)]*\)\s*return\s*;?\s*$/m)
    }
  })
})
