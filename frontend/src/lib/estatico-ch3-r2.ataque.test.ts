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

// ADMIN-01f ronda 0 (C-35): los formularios de T-05 que ganan la guarda con una ref antes de la de
// isPending (§D-11, Enmienda 9). En 01f, solo el de corregir el correo.
// ADMIN-01g ronda 0 (C-38, Enmienda 9 y Enmienda 15; filas 8 a 10 de CHORE-04): suman invitar maestro,
// la invitación masiva y generar enlace.
// CHORE-04 ronda 0 (C-1, §D-R0; §D-1, filas 12 a 17 de CHORE-04): suman los seis formularios de
// features/auth; los diez llevan la ref.
const CON_REF: ReadonlySet<string> = new Set([
  "/src/features/admin/components/formulario-corregir-correo.tsx",
  "/src/features/admin/components/formulario-invitar-maestro.tsx",
  "/src/features/admin/components/formulario-invitacion-masiva.tsx",
  "/src/features/admin/components/formulario-generar-enlace.tsx",
  "/src/features/auth/components/formulario-login.tsx",
  "/src/features/auth/components/formulario-registro.tsx",
  "/src/features/auth/components/formulario-registro-maestro.tsx",
  "/src/features/auth/components/formulario-recuperar.tsx",
  "/src/features/auth/components/formulario-nueva-contrasena.tsx",
  "/src/features/auth/components/formulario-cambiar-contrasena.tsx",
])

// ADMIN-01f ronda 0 (C-35): los formularios nuevos de 01f que pueden reiniciar su mutación
// condicionado a isError después de su guarda de envío (§D-11, Enmienda 9, "Reinicios").
const REINICIAN_EN_01F: readonly string[] = [
  "/src/features/admin/components/formulario-nombre-de-cuenta.tsx",
  "/src/features/admin/components/formulario-alta-alumno.tsx",
  "/src/features/admin/components/dialogo-restringir-acceso.tsx",
  "/src/features/admin/components/estado-de-pago-de-cuenta.tsx",
  // ADMIN-01g ronda 0 (C-38): el diálogo del lote (§D-11, Enmienda 9, "Reinicios").
  "/src/features/admin/components/dialogo-estado-pago-lote.tsx",
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

  // ADMIN-01f ronda 0 (C-35, Enmienda 9; §D-11, "La ref de los formularios de T-05", fila 7 de
  // CHORE-04): en los archivos de CON_REF, entre evento.preventDefault() y la guarda isPending va
  // exactamente una línea `if (<nombre>Ref.current) return`; en los demás, la expresión de siempre,
  // sin esa línea. Lo demás del caso no cambia: el manejador, antes de leer el formulario y una sola
  // <m>.reset(.
  it.each(DIEZ.map(([ruta, mutacion]) => [ruta.split("/").pop() ?? ruta, ruta, mutacion] as const))(
    "%s: la línea de T-05 es la sentencia que sigue a la guarda isPending, dentro del manejador del submit y antes de leer el formulario",
    (_archivo, ruta, mutacion) => {
      const texto = sinComentarios(leer(ruta))
      const conRef = CON_REF.has(ruta) ? "if \\(\\w+Ref\\.current\\) return\\s*\\n\\s*" : ""
      const guardaYLinea = new RegExp(
        `evento\\.preventDefault\\(\\)\\s*\\n\\s*${conRef}if \\(${mutacion}\\.isPending\\) return\\s*\\n\\s*if \\(${mutacion}\\.isError\\) ${mutacion}\\.reset\\(\\)\\s*\\n`,
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

  // ADMIN-01f ronda 0 (C-35): los excluidos son los diez más los cuatro de REINICIAN_EN_01F. `otros`
  // sigue vacío y la regla del render no cambia.
  it("fuera de los diez y de los cuatro de 01f, ningún archivo de producción de src/ reinicia una mutación condicionado a isError, y nadie reinicia una mutación en el render", () => {
    const diez = new Set([...DIEZ.map(([ruta]) => ruta), ...REINICIAN_EN_01F])
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
