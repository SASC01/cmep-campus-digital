import { describe, expect, it } from "vitest"

import { TEXTOS_CALIFICACION, TEXTOS_CALIFICAR } from "./data"

// Ataque (CALIFICACIONES-01c, ronda 1): reglas estáticas sobre el código nuevo y cambiado de 01c.
// Lee el texto de los archivos de producción (sin pruebas). No depende del reloj.

const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

const leer = (ruta: string): string => {
  const texto = fuentes[`/src/${ruta}`]
  if (texto === undefined) throw new Error(`Precondición: existe src/${ruta}`)
  return texto
}

const deProduccion = Object.entries(fuentes).filter(([ruta]) => !/\.test\.tsx?$/.test(ruta))

const DE_01C = [
  "features/tareas/components/panel-de-calificacion.tsx",
  "features/tareas/components/calificacion-de-la-entrega.tsx",
  "features/tareas/components/entrega-realizada.tsx",
  "features/tareas/entrega-de-alumno-view.tsx",
  "features/tareas/data.ts",
  "features/tareas/lib.ts",
  "features/tareas/hooks.ts",
  "features/tareas/types.ts",
  "lib/format.ts",
  "services/calificacionesService.ts",
  "components/clase/data.ts",
] as const

const COMPONENTES_01C = [
  "features/tareas/components/panel-de-calificacion.tsx",
  "features/tareas/components/calificacion-de-la-entrega.tsx",
  "features/tareas/entrega-de-alumno-view.tsx",
  "features/tareas/components/entrega-realizada.tsx",
] as const

const sinComentarios = (texto: string) =>
  texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

describe("ataque 01c r1 · reglas estáticas", () => {
  it("CAL-T-94: lo nuevo y lo cambiado de 01c no usa vidrio suelto, escalas anuladas, colores sueltos ni emojis (crudo, comentarios incluidos)", () => {
    const prohibido =
      /backdrop-blur|bg-white\/|\btext-(xs|sm|base|lg|xl)\b|\brounded-(sm|md|lg|xl)\b|\bshadow-(sm|md|lg|xl)\b|#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(|\p{Extended_Pictographic}/u
    const fallas = DE_01C.filter((ruta) => prohibido.test(leer(ruta)))
    expect(DE_01C.every((ruta) => leer(ruta).length > 0)).toBe(true)
    expect(fallas).toEqual([])
  })

  it("CAL-T-95: el panel, la lectura de la calificación, la vista de la entrega de un alumno y «Tu trabajo» no escriben texto suelto en JSX: todo sale de data.ts", () => {
    const fallas: string[] = []
    for (const ruta of COMPONENTES_01C) {
      const codigo = sinComentarios(leer(ruta))
      // Texto entre una etiqueta y su cierre en la misma línea, o una línea de varias palabras sola.
      const enLinea = codigo.match(/>\s*[A-Za-zÁÉÍÓÚÑáéíóúñ¿¡][^<>{}]*<\//g) ?? []
      const sueltas =
        codigo.match(/^\s+[A-Za-zÁÉÍÓÚÑáéíóúñ¿¡]+( [A-Za-zÁÉÍÓÚÑáéíóúñ¿¡.,]+)+\s*$/gm) ?? []
      for (const hallado of [...enLinea, ...sueltas]) fallas.push(`${ruta}: ${hallado.trim()}`)
    }
    expect(fallas).toEqual([])
  })

  it('CAL-T-96: cada campo del panel lleva autoComplete="off" e inputMode decimal en los de puntos; ninguno es type number', () => {
    const panel = leer("features/tareas/components/panel-de-calificacion.tsx")
    const campos = panel.match(/<(Input|Textarea)\b[\s\S]*?\/>/g) ?? []
    expect(campos).toHaveLength(3)
    for (const campo of campos) expect(campo).toContain('autoComplete="off"')
    const dePuntos = campos.filter((campo) => campo.startsWith("<Input"))
    expect(dePuntos).toHaveLength(2)
    for (const campo of dePuntos) {
      expect(campo).toContain('inputMode="decimal"')
      expect(campo).toContain('type="text"')
    }
  })

  it("CAL-T-97: en lo que pinta la entrega de un alumno hay una sola acción primary (la del panel)", () => {
    const pintados = [
      "features/tareas/entrega-de-alumno-view.tsx",
      "features/tareas/components/panel-de-calificacion.tsx",
      "features/tareas/components/hilo-privado.tsx",
      "features/tareas/components/lista-de-enlaces.tsx",
      "features/tareas/components/calificacion-de-la-entrega.tsx",
      "components/clase/con-clase-de-la-ruta.tsx",
      "components/mensaje-error.tsx",
      "components/cargando.tsx",
      "components/estado-entrega-badge.tsx",
      ...deProduccion
        .map(([ruta]) => ruta)
        .filter((ruta) => ruta.startsWith("/src/components/adjuntos/") && ruta.endsWith(".tsx"))
        .map((ruta) => ruta.slice("/src/".length)),
    ]
    const porArchivo = pintados.map((ruta) => [
      ruta,
      (leer(ruta).match(/variant="primary"/g) ?? []).length,
    ])
    expect(porArchivo.filter(([, n]) => n !== 0)).toEqual([
      ["features/tareas/components/panel-de-calificacion.tsx", 1],
    ])
  })

  it("CAL-T-98: la versión de la entrega solo se lee en el panel del maestro (apertura); «Tu trabajo» y la lectura de la calificación no la tocan, y los textos del panel no son «Calificado» ni empiezan por «Entregó el »", () => {
    const usos = COMPONENTES_01C.flatMap((ruta) =>
      (sinComentarios(leer(ruta)).match(/\.version\b/g) ?? []).map(() => ruta),
    )
    expect(usos).toEqual([
      "features/tareas/components/panel-de-calificacion.tsx",
      "features/tareas/components/panel-de-calificacion.tsx",
    ])
    const valores: readonly unknown[] = [
      ...Object.values(TEXTOS_CALIFICAR),
      ...Object.values(TEXTOS_CALIFICACION),
    ]
    const fijos = valores.filter((valor): valor is string => typeof valor === "string")
    const textos = [
      ...fijos,
      TEXTOS_CALIFICAR.campoCriterio("Claridad", 5),
      TEXTOS_CALIFICAR.campoCalificacion(10),
      TEXTOS_CALIFICAR.total(7, 9, 7.78, 10),
      TEXTOS_CALIFICAR.fueraDeRango(5),
      TEXTOS_CALIFICACION.calificacion(8.5, 10),
      TEXTOS_CALIFICACION.calificada("lunes 6 de octubre", "14:30"),
      TEXTOS_CALIFICACION.puntaje("Claridad", 4, 5),
    ]
    expect(fijos.length).toBeGreaterThan(10)
    for (const texto of textos) {
      expect(texto).not.toBe("Calificado")
      expect(texto.startsWith("Entregó el ")).toBe(false)
    }
  })

  it("CAL-T-99: R-24 en el frontend: ninguna copia de la regla de caracteres visibles ni de normalizarTextoLargo en frontend/src de producción", () => {
    const archivos = deProduccion
    const copias = archivos.filter(([, contenido]) => {
      return (
        /Default_Ignorable_Code_Point|\\u2800|\\u\{2800\}|\\u\{1D159\}|\\u\{1d159\}|contarCaracteresVisibles\s*=|CARACTER_VISIBLE/.test(
          contenido,
        ) ||
        contenido.includes("\u{2800}") ||
        contenido.includes("\u{1D159}") ||
        /\\r\\n\|\\r|normalizarTextoLargo\s*=/.test(contenido)
      )
    })
    expect(archivos.length).toBeGreaterThan(100)
    expect(copias.map(([ruta]) => ruta)).toEqual([])
  })
})
