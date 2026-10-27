import { describe, expect, it } from "vitest"

// CHORE-03: reglas estáticas del contrato de los errores de la API. Leen el texto crudo de los
// archivos (comentarios incluidos). En 03a cubren features/tareas y components/adjuntos; 03b las
// extiende a features/clases y features/calificaciones, y 03c a todo src/. import.meta.glob no
// incluye al archivo que lo llama (O-r1-3); este es una prueba, fuera de la regla de producción.

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
const ALCANCE_03B = ["/src/features/clases/", "/src/features/calificaciones/"] as const
// 03c (S-09): todo src/ salvo el contrato y features/diagnostico, temporal, que muestra
// `codigo: mensaje` a propósito.
const FUERA_DE_03C = (ruta: string) =>
  ruta === CONTRATO || ruta.startsWith("/src/features/diagnostico/")

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

  it("CH3-B13: features/clases y features/calificaciones tampoco manipulan error.message, ni tienen la expresión de ruta; quitarPrefijoDeCampo ya no existe en el código de producción de src/", () => {
    const enAlcance = deProduccion.filter(([ruta]) =>
      ALCANCE_03B.some((prefijo) => ruta.startsWith(prefijo)),
    )
    for (const prefijo of ALCANCE_03B) {
      expect(enAlcance.filter(([ruta]) => ruta.startsWith(prefijo)).length).toBeGreaterThan(10)
    }
    const fallas = enAlcance.flatMap(([ruta, texto]) => [
      ...MANIPULACIONES.filter(([, regla]) => regla.test(texto)).map(
        ([nombre]) => `${ruta}: ${nombre}`,
      ),
      ...(EXPRESION_DE_RUTA.test(texto) ? [`${ruta}: expresión de ruta`] : []),
    ])
    expect(fallas).toEqual([])

    const conElNombre = deProduccion
      .filter(([, texto]) => /quitarPrefijoDeCampo/.test(texto))
      .map(([ruta]) => ruta)
    expect(conElNombre).toEqual([])
  })

  it("CH3-C07: ningún archivo de producción de src/ salvo el contrato y features/diagnostico manipula error.message ni tiene la expresión de ruta", () => {
    const enAlcance = deProduccion.filter(([ruta]) => !FUERA_DE_03C(ruta))
    for (const prefijo of ["/src/features/admin/", "/src/features/auth/"]) {
      expect(enAlcance.filter(([ruta]) => ruta.startsWith(prefijo)).length).toBeGreaterThan(10)
    }
    for (const prefijo of ["/src/app/", "/src/components/", "/src/services/", "/src/lib/"]) {
      expect(enAlcance.filter(([ruta]) => ruta.startsWith(prefijo)).length).toBeGreaterThan(3)
    }
    expect(enAlcance.map(([ruta]) => ruta)).not.toContain(CONTRATO)
    expect(enAlcance.some(([ruta]) => ruta.startsWith("/src/features/diagnostico/"))).toBe(false)
    expect(enAlcance.map(([ruta]) => ruta)).toContain(TABLA)
    const fallas = enAlcance.flatMap(([ruta, texto]) => [
      ...MANIPULACIONES.filter(([, regla]) => regla.test(texto)).map(
        ([nombre]) => `${ruta}: ${nombre}`,
      ),
      ...(EXPRESION_DE_RUTA.test(texto) ? [`${ruta}: expresión de ruta`] : []),
    ])
    expect(fallas).toEqual([])
  })

  it("CH3-C13: en los diez formularios de T-05, `if (<m>.isError) <m>.reset()` aparece una vez, con su mutación, después de la guarda isPending y antes del primer safeParse; ninguno gana una ref; en admin y auth solo esos diez y buscador-de-cuenta reinician una mutación", () => {
    // Sin comentarios: el comentario de T-05 nombra la línea y no debe contar.
    const sinComentarios = (texto: string) =>
      texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
    const LINEA_DE_T05 = /if \((\w+)\.isError\) \1\.reset\(\)/g
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
    const BUSCADOR = "/src/features/admin/components/buscador-de-cuenta.tsx"

    for (const [ruta, mutacion] of DIEZ) {
      const texto = sinComentarios(leer(ruta))
      const apariciones = [...texto.matchAll(LINEA_DE_T05)]
      expect(
        apariciones.map((aparicion) => aparicion[1]),
        ruta,
      ).toEqual([mutacion])
      const linea = apariciones[0]?.index ?? -1
      const guarda = texto.indexOf(`if (${mutacion}.isPending) return`)
      const validacion = texto.indexOf("safeParse(")
      expect(guarda, ruta).toBeGreaterThan(-1)
      expect(validacion, ruta).toBeGreaterThan(-1)
      expect(linea, ruta).toBeGreaterThan(guarda)
      expect(linea, ruta).toBeLessThan(validacion)
      expect(texto, ruta).not.toMatch(/Ref\.current\) return/)
    }

    // D-2 (manager): se cuenta `<m>.reset()` con el nombre de cada mutación del archivo (lo que sale
    // de un gancho `use…(`), no cualquier `.reset(` (formulario.reset() del <form> no cuenta).
    const reinicianUnaMutacion = deProduccion
      .filter(([ruta]) => /^\/src\/features\/(admin|auth)\//.test(ruta))
      .flatMap(([ruta, crudo]) => {
        const texto = sinComentarios(crudo)
        const deGanchos = [...texto.matchAll(/const (\w+) = use[A-Z]\w*\(/g)].map(
          (declaracion) => declaracion[1],
        )
        return deGanchos
          .filter((nombre) => nombre !== undefined && texto.includes(`${nombre}.reset()`))
          .map((nombre) => `${ruta}#${String(nombre)}`)
      })
      .sort()
    expect(reinicianUnaMutacion).toEqual(
      [...DIEZ.map(([ruta, mutacion]) => `${ruta}#${mutacion}`), `${BUSCADOR}#buscar`].sort(),
    )

    // BuscadorDeCuenta no cambia: su reset sigue sin condición (DEC-19).
    const buscador = sinComentarios(leer(BUSCADOR))
    expect(buscador).toContain("buscar.reset()")
    expect(buscador).not.toMatch(/if \(buscar\.isError\) buscar\.reset\(\)/)
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
