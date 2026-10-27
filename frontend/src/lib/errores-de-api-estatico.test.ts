import { describe, expect, it } from "vitest"

// CHORE-03: reglas estáticas del contrato de los errores de la API. Leen el texto crudo de los
// archivos (comentarios incluidos). En 03a cubren features/tareas y components/adjuntos; 03b y 03c las
// extienden.

const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

const esPrueba = (ruta: string) => /\.test\.tsx?$/.test(ruta)

const deProduccion = Object.entries(fuentes).filter(([ruta]) => !esPrueba(ruta))

const leer = (ruta: string): string => {
  const texto = fuentes[ruta]
  if (texto === undefined) throw new Error(`Precondición: existe ${ruta}`)
  return texto
}

const CONTRATO = "/src/lib/errores-de-api.ts"
const TABLA = "/src/lib/errores-de-api-fuera-de-contrato.ts"

// Lo que nadie fuera del contrato hace con el mensaje del servidor.
const MANIPULACIONES: readonly [string, RegExp][] = [
  [".message.replace(", /\.message\.replace\(/],
  [".message.slice(", /\.message\.slice\(/],
  [".message.substring(", /\.message\.substring\(/],
  ["return error.message", /return error\.message\b/],
  ["? error.message", /\?\s*error\.message\b/],
  [": error.message", /:\s*error\.message\b/],
]

// Una expresión que empieza con una clase de caracteres y termina en ":\s*": la ruta de un campo.
const EXPRESION_DE_RUTA = /\/\^\[[^\]\n]*\]\+:\\s\*\//

const ALCANCE_03A = ["/src/features/tareas/", "/src/components/adjuntos/"] as const

describe("CHORE-03 · reglas estáticas del contrato", () => {
  it("CH3-A20: features/tareas y components/adjuntos no manipulan error.message; la expresión de ruta vive solo en el contrato; la tabla común no importa de features/ y ningún archivo de producción la importa", () => {
    const enAlcance = deProduccion.filter(([ruta]) =>
      ALCANCE_03A.some((prefijo) => ruta.startsWith(prefijo)),
    )
    expect(enAlcance.length).toBeGreaterThan(30)
    const fallas = enAlcance.flatMap(([ruta, texto]) =>
      MANIPULACIONES.filter(([, regla]) => regla.test(texto)).map(
        ([nombre]) => `${ruta}: ${nombre}`,
      ),
    )
    expect(fallas).toEqual([])

    expect(EXPRESION_DE_RUTA.test(leer(CONTRATO))).toBe(true)
    const conExpresion = deProduccion
      .filter(([, texto]) => EXPRESION_DE_RUTA.test(texto))
      .map(([ruta]) => ruta)
    expect(conExpresion).toEqual([CONTRATO])

    expect(leer(TABLA)).not.toMatch(/from\s+["'](@\/features\/|(\.\.\/)+features\/)/)
    expect(leer(TABLA)).not.toMatch(/^import\b/m)
    const importanLaTabla = deProduccion
      .filter(([, texto]) => texto.includes("errores-de-api-fuera-de-contrato"))
      .map(([ruta]) => ruta)
    expect(importanLaTabla).toEqual([])
  })

  it("CH3-A24: ni la tabla común, ni el contrato, ni las pruebas nuevas del chore tienen un carácter invisible literal", () => {
    const invisibles = [
      "\u{00A0}",
      "\u{3000}",
      "\u{200B}",
      "\u{200C}",
      "\u{200D}",
      "\u{2060}",
      "\u{FEFF}",
      "\u{0085}",
      "\u{2800}",
      "\u{3164}",
      "\u{1D159}",
    ]
    const delChore = Object.keys(fuentes).filter((ruta) => /-ch3\.test\.tsx?$/.test(ruta))
    expect(delChore.length).toBeGreaterThanOrEqual(5)
    const revisados = [TABLA, CONTRATO, "/src/lib/errores-de-api.test.ts", ...delChore]
    const fallas = revisados.flatMap((ruta) => {
      const texto = leer(ruta)
      return invisibles
        .filter((caracter) => texto.includes(caracter))
        .map(
          (caracter) => `${ruta}: U+${(caracter.codePointAt(0) ?? 0).toString(16).toUpperCase()}`,
        )
    })
    expect(fallas).toEqual([])
  })
})
