import { describe, expect, it } from "vitest"

// H6-1 (ADMIN-01, comprobación humana del 2026-11-10): revisión estática del código de producción de
// src/. Todo className con desplazamiento horizontal (overflow-x-auto, overflow-auto u
// overflow-x-scroll) lleva `relative`, para que los sr-only y los absolutos de su interior lo tomen
// como bloque contenedor y el desplazamiento los recorte; si no, ensanchan el documento.

const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

const codigo = Object.entries(fuentes).filter(([ruta]) => !/\.test\.tsx?$/.test(ruta))

const DESPLAZA = /(^|[\s"'`:])overflow-(x-auto|auto|x-scroll)(?=[\s"'`]|$)/
const POSICIONADO = /(^|[\s"'`])(relative|absolute|fixed|sticky)(?=[\s"'`]|$)/

// Excepciones justificadas, por ruta y por la línea exacta del contenedor. Si la línea cambia, la
// excepción deja de aplicar y la prueba vuelve a exigir `relative`.
const EXCEPCIONES: Record<string, { linea: string; porque: string }> = {
  "/src/features/clases/components/secciones-de-clase.tsx": {
    linea:
      '<Card ref={panelRef} className="w-fit max-w-full gap-0 overflow-x-auto rounded-card p-1">',
    porque:
      'su único hijo es <div className="relative w-max">, el bloque contenedor del indicador absoluto; nada absoluto queda entre la Card y ese div',
  },
}

const lineasQueDesplazan = codigo.flatMap(([ruta, texto]) =>
  texto
    .split("\n")
    .filter((linea) => !/^\s*(\/\/|\/?\*|\{\/\*)/.test(linea) && DESPLAZA.test(linea))
    .map((linea) => ({ ruta, linea: linea.trim() })),
)

describe("H6-1 · todo contenedor con desplazamiento horizontal está posicionado", () => {
  it("se leyó el código fuente y hay contenedores con desplazamiento (incluido el de Table)", () => {
    expect(codigo.length).toBeGreaterThan(60)
    expect(lineasQueDesplazan.map((l) => l.ruta)).toContain("/src/components/ui/table.tsx")
  })

  it("cada className con overflow-x-auto, overflow-auto u overflow-x-scroll lleva relative, salvo las excepciones justificadas", () => {
    const sinPosicion = lineasQueDesplazan
      .filter(({ ruta, linea }) => EXCEPCIONES[ruta]?.linea !== linea)
      .filter(({ linea }) => !POSICIONADO.test(linea))
      .map(({ ruta, linea }) => `${ruta}: ${linea}`)
    expect(sinPosicion).toEqual([])
  })

  it("las excepciones siguen vigentes: su línea existe y el hijo posicionado sigue detrás", () => {
    for (const [ruta, { linea }] of Object.entries(EXCEPCIONES)) {
      const texto = fuentes[ruta]
      if (texto === undefined) throw new Error(`Precondición: ${ruta} existe`)
      const lineas = texto.split("\n").map((l) => l.trim())
      const indice = lineas.indexOf(linea)
      expect(indice, `${ruta}: la línea de la excepción ya no existe`).toBeGreaterThanOrEqual(0)
      expect(lineas[indice + 1]).toBe('<div className="relative w-max">')
    }
  })
})
