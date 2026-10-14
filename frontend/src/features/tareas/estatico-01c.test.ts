import { describe, expect, it } from "vitest"

import { TEXTOS_DE_LA_CLASE } from "@/components/clase/data"

import { TEXTOS_DETALLE_TAREA, TEXTOS_FORMULARIO_TAREA } from "./data"

// CALIFICACIONES-01c (CAL-1C12 y CAL-1C13): revisión estática por texto fuente de lo nuevo y lo
// cambiado de 01c.

const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

const fuente = (ruta: string): string => {
  const texto = fuentes[ruta]
  if (texto === undefined) throw new Error(`Precondición: existe ${ruta}`)
  return texto
}

// O-r0c-2: los comentarios se quitan antes de buscar un literal (uno ya vive en un comentario de un
// archivo que 01c no toca).
const sinComentarios = (texto: string): string =>
  texto
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1")

const soloComentarios = (texto: string): string[] => [
  ...[...texto.matchAll(/\/\*[\s\S]*?\*\//g)].map((m) => m[0]),
  ...[...texto.matchAll(/(?:^|[^:"'`])(\/\/.*)$/gm)].map((m) => m[1] ?? ""),
]

const deProduccion = Object.entries(fuentes).filter(([ruta]) => !/\.test\.tsx?$/.test(ruta))

const NUEVOS_Y_CAMBIADOS_01C = [
  "/src/lib/format.ts",
  "/src/services/calificacionesService.ts",
  "/src/components/clase/data.ts",
  "/src/features/tareas/types.ts",
  "/src/features/tareas/data.ts",
  "/src/features/tareas/lib.ts",
  "/src/features/tareas/hooks.ts",
  "/src/features/tareas/components/calificacion-de-la-entrega.tsx",
  "/src/features/tareas/components/entrega-realizada.tsx",
  "/src/features/tareas/components/panel-de-calificacion.tsx",
  "/src/features/tareas/entrega-de-alumno-view.tsx",
]

describe("«Sin categoría» se escribe una sola vez (CAL-1C12)", () => {
  it("CAL-1C12: el literal «Sin categoría» vive solo en components/clase/data.ts (sin contar comentarios)", () => {
    expect(deProduccion.length).toBeGreaterThan(100)
    const conLiteral = deProduccion
      .filter(([, texto]) => {
        const codigo = sinComentarios(texto)
        return ['"Sin categoría"', "'Sin categoría'", "`Sin categoría`"].some((l) =>
          codigo.includes(l),
        )
      })
      .map(([ruta]) => ruta)
    expect(conLiteral).toEqual(["/src/components/clase/data.ts"])
  })

  it("CAL-1C12: las llaves sinCategoria de features/tareas son el valor de components/clase/data.ts", () => {
    expect(TEXTOS_DE_LA_CLASE.sinCategoria).toBe("Sin categoría")
    expect(TEXTOS_FORMULARIO_TAREA.sinCategoria).toBe(TEXTOS_DE_LA_CLASE.sinCategoria)
    expect(TEXTOS_DETALLE_TAREA.sinCategoria).toBe(TEXTOS_DE_LA_CLASE.sinCategoria)
  })
})

describe("regla estática de lo nuevo y lo cambiado de 01c (CAL-1C13)", () => {
  it("CAL-1C13: sin disabled, ?? [], fetch(, console., valor por defecto en calificacion, vidrio ni importaciones de otro módulo de features", () => {
    const reglas: [string, RegExp][] = [
      ["disabled", /\sdisabled(=|\s|>|\})/],
      ["?? []", /\?\?\s*\[\s*\]/],
      ["fetch(", /\bfetch\(/],
      ["console.", /\bconsole\./],
      ["defecto", /\b(estadoPago|accesoRestringido|rol|calificacion)\s*(\?\?|\|\|)/],
      ["vidrio", /\bvidrio(-fuerte|-azul)?\b|backdrop-blur/],
      ["data-material", /data-material|data-densidad/],
      [
        "otro módulo",
        /from\s+["'](@\/features\/|\.\.\/\.\.\/(clases|admin|calificaciones|auth|diagnostico))/,
      ],
    ]
    const violaciones = NUEVOS_Y_CAMBIADOS_01C.flatMap((ruta) =>
      reglas.filter(([, r]) => r.test(fuente(ruta))).map(([n]) => `${ruta}: ${n}`),
    )
    expect(violaciones).toEqual([])
    const compartidos = NUEVOS_Y_CAMBIADOS_01C.filter((ruta) => !ruta.startsWith("/src/features/"))
    expect(compartidos.filter((ruta) => /from\s+["'][^"']*features\//.test(fuente(ruta)))).toEqual(
      [],
    )
  })

  it("CAL-1C13: renovarTrasErrorDeLaEntrega( sigue en 3 en hooks.ts y el gancho nuevo no la llama", () => {
    const hooks = fuente("/src/features/tareas/hooks.ts")
    expect(hooks.match(/renovarTrasErrorDeLaEntrega\(/g)).toHaveLength(3)
    const inicio = hooks.indexOf("export const useCalificarEntrega")
    expect(inicio, "Precondición: existe useCalificarEntrega").toBeGreaterThan(0)
    expect(hooks.slice(inicio)).not.toMatch(/renovarTrasErrorDeLaEntrega/)
    expect("useCalificarEntrega").not.toMatch(/MiEntrega|Hilo|Comentar|Entregar|Anular/)
  })

  it("CAL-1C13: los tipos viven en types.ts; los componentes solo declaran interfaces de Props", () => {
    const fueraDeTypes = NUEVOS_Y_CAMBIADOS_01C.filter(
      (ruta) => ruta.startsWith("/src/features/tareas/") && !ruta.endsWith("/types.ts"),
    ).flatMap((ruta) =>
      [...fuente(ruta).matchAll(/^\s*(?:export\s+)?(?:type|interface)\s+(\w+)/gm)]
        .map((m) => m[1] ?? "")
        .filter((nombre) => !(ruta.endsWith(".tsx") && nombre.endsWith("Props")))
        .map((nombre) => `${ruta}: ${nombre}`),
    )
    expect(fueraDeTypes).toEqual([])
    const tipos = fuente("/src/features/tareas/types.ts")
    expect(tipos).toMatch(/\bCalificacionDeEntrega,\n/)
    expect(tipos).toMatch(/\bCalificarEntrega,\n/)
  })

  it("CAL-1C13: la vista de la entrega de un alumno no nombra el correo, el estado de pago ni perspectivaDeRuta(", () => {
    expect(fuente("/src/features/tareas/entrega-de-alumno-view.tsx")).not.toMatch(
      /estadoPago|accesoRestringido|\bemail\b|correo|perspectivaDeRuta\(/,
    )
  })

  it("CAL-1C13: ningún comentario de lo nuevo y lo cambiado de 01c tiene las palabras de §D-0.9", () => {
    const prohibidas = [
      "vidrio",
      "data-material",
      "disabled",
      "?? []",
      "fetch(",
      "console.",
      "_blank",
      "perspectivaDeRuta(",
      "correo",
      "estadoPago",
      '"Sin tema"',
      '"Sin categoría"',
    ]
    // El único comentario anterior a 01c que nombra una de esas palabras: el de ENTREGAS-01a en
    // components/clase/data.ts (las reglas que vigilan ese literal quitan los comentarios). 01c no lo toca.
    const anteriores = [
      '/src/components/clase/data.ts: // ENTREGAS-01a (O-2 de TAREAS-01d): "Sin tema", el mismo texto en features/clases y features/tareas.',
    ]
    const halladas = NUEVOS_Y_CAMBIADOS_01C.flatMap((ruta) =>
      soloComentarios(fuente(ruta)).flatMap((comentario) =>
        prohibidas.filter((p) => comentario.includes(p)).map(() => `${ruta}: ${comentario.trim()}`),
      ),
    ).filter((hallada) => !anteriores.includes(hallada))
    expect(halladas).toEqual([])
  })
})
