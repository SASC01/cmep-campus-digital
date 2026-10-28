import { describe, expect, it } from "vitest"

// Tester, ronda 2 de CHORE-03 03c. Estática final del encargo sobre el texto crudo de src/ (los
// comentarios se quitan antes de buscar código). Cubre lo que la ronda 1 no fijaba del todo: ningún
// carácter invisible literal en el código de producción ni en ningún archivo de prueba del chore
// (`-ch3`, también las `*.ataque`); la tabla común solo la importan pruebas; la línea de T-05 es la
// sentencia inmediatamente siguiente a la guarda isPending de su manejador; ningún otro archivo de
// producción de src/ reinicia una mutación condicionado a isError; y las piezas que el chore quitó o
// centralizó siguen así (quitarPrefijoDeCampo, PREFIJO_DE_RUTA, CODIGOS_QUE_REDIRIGE_EL_CLIENTE,
// esErrorDeCursor). import.meta.glob no incluye al archivo que lo llama: este archivo escribe sus
// invisibles por punto de código, nunca literales.

const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

const esPrueba = (ruta: string) => /\.test\.tsx?$/.test(ruta)
const deProduccion = Object.entries(fuentes).filter(([ruta]) => !esPrueba(ruta))
const delChore = Object.entries(fuentes).filter(([ruta]) =>
  /-ch3(-r\d+)?(\.ataque)?\.test\.tsx?$/.test(ruta),
)

const sinComentarios = (texto: string) =>
  texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

const leer = (ruta: string): string => {
  const texto = fuentes[ruta]
  if (texto === undefined) throw new Error(`Precondición: existe ${ruta}`)
  return texto
}

// Invisibles y espacios que no se ven: los de la tabla común y los que la ronda 1 encontró en los
// nombres, más los de dirección y el guion suave.
const INVISIBLES = [
  0x00a0, 0x00ad, 0x0085, 0x115f, 0x1160, 0x180e, 0x2007, 0x200b, 0x200c, 0x200d, 0x200e, 0x200f,
  0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x202f, 0x2060, 0x2800, 0x3000, 0x3164, 0xfeff, 0xffa0,
  0x1d159,
].map((punto) => String.fromCodePoint(punto))

const invisiblesEn = (texto: string) =>
  INVISIBLES.filter((caracter) => texto.includes(caracter)).map(
    (caracter) => `U+${(caracter.codePointAt(0) ?? 0).toString(16).toUpperCase()}`,
  )

const DIEZ: readonly (readonly [string, string])[] = [
  ["/src/features/admin/components/formulario-invitar-maestro.tsx", "invitar"],
  ["/src/features/admin/components/formulario-invitacion-masiva.tsx", "invitar"],
  ["/src/features/admin/components/formulario-generar-enlace.tsx", "generar"],
  ["/src/features/admin/components/formulario-corregir-correo.tsx", "corregir"],
  ["/src/features/auth/components/formulario-login.tsx", "inicioSesion"],
  ["/src/features/auth/components/formulario-registro.tsx", "alta"],
  ["/src/features/auth/components/formulario-registro-maestro.tsx", "alta"],
  ["/src/features/auth/components/formulario-recuperar.tsx", "recuperar"],
  ["/src/features/auth/components/formulario-nueva-contrasena.tsx", "nuevaContrasena"],
  ["/src/features/auth/components/formulario-cambiar-contrasena.tsx", "cambiar"],
]

describe("ataque CHORE-03 03c r2 · estática final del encargo", () => {
  it("precondición: el glob ve el código de producción, las pruebas del chore y los diez formularios", () => {
    expect(deProduccion.length).toBeGreaterThan(150)
    expect(delChore.length).toBeGreaterThanOrEqual(20)
    for (const [ruta] of DIEZ) expect(fuentes[ruta], ruta).toBeDefined()
    expect(INVISIBLES).toHaveLength(25)
  })

  it("ningún archivo de producción de src/ tiene un carácter invisible literal", () => {
    const fallas = deProduccion.flatMap(([ruta, texto]) =>
      invisiblesEn(texto).map((punto) => `${ruta} ${punto}`),
    )
    expect(fallas).toEqual([])
  })

  it("ninguna prueba del chore (-ch3, normales y *.ataque de todas las rondas) tiene un carácter invisible literal", () => {
    const fallas = delChore.flatMap(([ruta, texto]) =>
      invisiblesEn(texto).map((punto) => `${ruta} ${punto}`),
    )
    expect(fallas).toEqual([])
  })

  it("la tabla común solo la importan pruebas", () => {
    const importan = deProduccion
      .filter(([, texto]) => /errores-de-api-fuera-de-contrato/.test(sinComentarios(texto)))
      .map(([ruta]) => ruta)
    expect(importan).toEqual([])
    const pruebasQueLaImportan = Object.entries(fuentes).filter(
      ([ruta, texto]) => esPrueba(ruta) && texto.includes("@/lib/errores-de-api-fuera-de-contrato"),
    )
    expect(pruebasQueLaImportan.length).toBeGreaterThan(0)
  })

  it("quitarPrefijoDeCampo y PREFIJO_DE_RUTA no existen en producción; CODIGOS_QUE_REDIRIGE_EL_CLIENTE se declara solo en apiClient y esErrorDeCursor una sola vez, en el contrato", () => {
    const conViejos = deProduccion
      .filter(([, texto]) => /quitarPrefijoDeCampo|PREFIJO_DE_RUTA/.test(texto))
      .map(([ruta]) => ruta)
    expect(conViejos).toEqual([])

    const declaranCodigos = deProduccion
      .filter(([, texto]) =>
        /(const|let|var|function)\s+CODIGOS_QUE_REDIRIGE_EL_CLIENTE\b/.test(sinComentarios(texto)),
      )
      .map(([ruta]) => ruta)
    expect(declaranCodigos).toEqual(["/src/services/apiClient.ts"])

    const definenCursor = deProduccion
      .filter(([, texto]) =>
        /(const|let|var|function)\s+esErrorDeCursor\b/.test(sinComentarios(texto)),
      )
      .map(([ruta]) => ruta)
    expect(definenCursor).toEqual(["/src/lib/errores-de-api.ts"])
  })

  it.each(DIEZ.map(([ruta, mutacion]) => [ruta.split("/").pop() ?? ruta, ruta, mutacion] as const))(
    "%s: la línea de T-05 es la sentencia que sigue a la guarda isPending, dentro del manejador del submit y antes de leer el formulario",
    (_archivo, ruta, mutacion) => {
      const texto = sinComentarios(leer(ruta))
      const guardaYLinea = new RegExp(
        `evento\\.preventDefault\\(\\)\\s*\\n\\s*if \\(${mutacion}\\.isPending\\) return\\s*\\n\\s*if \\(${mutacion}\\.isError\\) ${mutacion}\\.reset\\(\\)\\s*\\n`,
      )
      expect(texto).toMatch(guardaYLinea)
      const linea = texto.indexOf(`if (${mutacion}.isError) ${mutacion}.reset()`)
      const manejador = texto.indexOf(
        "const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {",
      )
      const formData = texto.indexOf("new FormData(")
      const lectura = formData === -1 ? texto.indexOf("safeParse(") : formData
      expect(manejador).toBeGreaterThan(-1)
      expect(linea).toBeGreaterThan(manejador)
      expect(linea).toBeLessThan(lectura)
      expect(texto.split(`${mutacion}.reset(`)).toHaveLength(2)
    },
  )

  it("fuera de los diez, ningún archivo de producción de src/ reinicia una mutación condicionado a isError, y nadie reinicia una mutación en el render", () => {
    const diez = new Set(DIEZ.map(([ruta]) => ruta))
    const otros = deProduccion
      .filter(
        ([ruta, texto]) =>
          !diez.has(ruta) && /\.isError\)\s*\w+\.reset\(\)/.test(sinComentarios(texto)),
      )
      .map(([ruta]) => ruta)
    expect(otros).toEqual([])

    const enElRender = deProduccion
      .filter(([, texto]) => /\{\s*\w+\.isError\s*&&\s*\w+\.reset\(/.test(sinComentarios(texto)))
      .map(([ruta]) => ruta)
    expect(enElRender).toEqual([])
  })
})
