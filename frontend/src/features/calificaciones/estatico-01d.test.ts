import { describe, expect, it } from "vitest"

// CALIFICACIONES-01d (CAL-1D09; §D-13.7, Enmienda 1 M-03 y Enmienda 2): revisión estática por texto
// fuente del módulo features/calificaciones (sin pruebas) y de lo que 01d agrega fuera de él. Las
// reglas de código se aplican sin comentarios; la de los comentarios, solo a ellos. No depende del
// reloj.

const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

const sinComentarios = (texto: string): string =>
  texto
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1")

const soloComentarios = (texto: string): string[] => [
  ...[...texto.matchAll(/\/\*[\s\S]*?\*\//g)].map((m) => m[0]),
  ...[...texto.matchAll(/(?:^|[^:"'`])(\/\/.*)$/gm)].map((m) => m[1] ?? ""),
]

const MODULO = Object.entries(fuentes).filter(
  ([ruta]) => ruta.startsWith("/src/features/calificaciones/") && !/\.test\.tsx?$/.test(ruta),
)

const ESPERADOS = [
  "/src/features/calificaciones/types.ts",
  "/src/features/calificaciones/data.ts",
  "/src/features/calificaciones/lib.ts",
  "/src/features/calificaciones/hooks.ts",
  "/src/features/calificaciones/gradebook-view.tsx",
  "/src/features/calificaciones/mis-calificaciones-view.tsx",
  "/src/features/calificaciones/components/resumen-del-gradebook.tsx",
  "/src/features/calificaciones/components/navegacion-del-gradebook.tsx",
  "/src/features/calificaciones/components/tabla-del-gradebook.tsx",
  "/src/features/calificaciones/components/lista-de-mis-calificaciones.tsx",
  "/src/features/calificaciones/components/calculo-de-calificacion.tsx",
]

const CAMBIADOS_FUERA = [
  "/src/components/foco/hooks.ts",
  "/src/components/foco/lib.ts",
  "/src/components/foco/types.ts",
  "/src/services/calificacionesService.ts",
]

const fuente = (ruta: string): string => {
  const texto = fuentes[ruta]
  if (texto === undefined) throw new Error(`Precondición: existe ${ruta}`)
  return texto
}

describe("regla estática de features/calificaciones (CAL-1D09)", () => {
  it("CAL-1D09: el módulo tiene exactamente sus once archivos de producción", () => {
    expect(MODULO.map(([ruta]) => ruta).sort()).toEqual([...ESPERADOS].sort())
  })

  it("CAL-1D09: los tipos viven en types.ts; los componentes y las vistas solo declaran interfaces de Props", () => {
    const fueraDeTypes = MODULO.filter(([ruta]) => !ruta.endsWith("/types.ts")).flatMap(
      ([ruta, texto]) =>
        [...sinComentarios(texto).matchAll(/^\s*(?:export\s+)?(?:type|interface)\s+(\w+)/gm)]
          .map((m) => m[1] ?? "")
          .filter((nombre) => !(ruta.endsWith(".tsx") && nombre.endsWith("Props")))
          .map((nombre) => `${ruta}: ${nombre}`),
    )
    expect(fueraDeTypes).toEqual([])
  })

  it("CAL-1D09: sin ?? [], disabled, fetch(, console., perspectivaDeRuta(, vidrio, valores arbitrarios, estado de pago, restricción, correo ni importaciones de otro módulo de features", () => {
    const reglas: [string, RegExp][] = [
      ["?? []", /\?\?\s*\[\s*\]/],
      ["disabled", /\bdisabled\b/],
      ["fetch(", /\bfetch\(/],
      ["console.", /\bconsole\./],
      ["perspectivaDeRuta(", /perspectivaDeRuta\(/],
      ["vidrio", /\bvidrio(-fuerte|-azul)?\b|backdrop-blur|bg-white/],
      ["valor arbitrario", /-\[[^\]]*\]/],
      ["estado de pago", /estadoPago|estado_pago/],
      ["restricción", /accesoRestringido|acceso_restringido/],
      ["correo", /\bcorreo\b|\bemail\b/i],
      ["otro módulo", /from\s+["'](@\/features\/|\.\.\/\.\.\/)/],
      ["fixed", /\bfixed\b/],
    ]
    const violaciones = MODULO.flatMap(([ruta, texto]) =>
      reglas.filter(([, r]) => r.test(sinComentarios(texto))).map(([n]) => `${ruta}: ${n}`),
    )
    expect(MODULO.length).toBe(ESPERADOS.length)
    expect(violaciones).toEqual([])
  })

  it("CAL-1D09: ningún fondo escrito a mano salvo bg-surface en la columna fija de la tabla del gradebook", () => {
    const fondos = MODULO.flatMap(([ruta, texto]) =>
      [...sinComentarios(texto).matchAll(/\bbg-[\w/-]+/g)].map((m) => `${ruta}: ${m[0]}`),
    )
    expect(fondos).toEqual([
      "/src/features/calificaciones/components/tabla-del-gradebook.tsx: bg-surface",
      "/src/features/calificaciones/components/tabla-del-gradebook.tsx: bg-surface",
    ])
    const tabla = sinComentarios(
      fuente("/src/features/calificaciones/components/tabla-del-gradebook.tsx"),
    )
    const conFondo = [...tabla.matchAll(/className="([^"]*bg-surface[^"]*)"/g)].map((m) => m[1])
    expect(conFondo).toHaveLength(2)
    for (const clases of conFondo) {
      expect(clases).toMatch(/\bsticky\b/)
      expect(clases).toMatch(/\bleft-0\b/)
    }
  })

  it('CAL-1D09: data-material="opaco" aparece una sola vez, en la raíz de gradebook-view.tsx; ninguna en «Mis calificaciones» y ningún data-densidad', () => {
    const conMaterial = MODULO.flatMap(([ruta, texto]) =>
      [...sinComentarios(texto).matchAll(/data-material/g)].map(() => ruta),
    )
    expect(conMaterial).toEqual(["/src/features/calificaciones/gradebook-view.tsx"])
    const vista = sinComentarios(fuente("/src/features/calificaciones/gradebook-view.tsx"))
    expect(vista).toMatch(/<div ref=\{raizRef\} tabIndex=\{-1\} data-material="opaco">/)
    expect(MODULO.filter(([, texto]) => /data-densidad/.test(texto))).toEqual([])
    expect(fuente("/src/features/calificaciones/mis-calificaciones-view.tsx")).not.toMatch(
      /data-material/,
    )
  })

  it("CAL-1D09: (Enmienda 2) ningún archivo de producción del módulo lee .message, llama a esErrorDeCursor( ni usa ErrorDeCampo", () => {
    const violaciones = MODULO.flatMap(([ruta, texto]) => {
      const codigo = sinComentarios(texto)
      return [
        /\.message\b/.test(codigo) ? `${ruta}: .message` : null,
        /\besErrorDeCursor\(/.test(codigo) ? `${ruta}: esErrorDeCursor(` : null,
        /\bErrorDeCampo\b/.test(codigo) ? `${ruta}: ErrorDeCampo` : null,
      ].filter((v): v is string => v !== null)
    })
    expect(violaciones).toEqual([])
    expect(sinComentarios(fuente("/src/features/calificaciones/lib.ts"))).toMatch(
      /import \{ campoDeErrorDeApi \} from "@\/lib\/errores-de-api"/,
    )
  })

  it("CAL-1D09: lo compartido de 01d (components/foco y el servicio) no importa de features/", () => {
    const fallas = CAMBIADOS_FUERA.filter((ruta) =>
      /from\s+["'](@\/features\/|(\.\.\/)+features\/)/.test(fuente(ruta)),
    )
    expect(fallas).toEqual([])
  })

  it("CAL-1D09: ningún comentario de lo nuevo y lo cambiado de 01d tiene las palabras de §D-0.9", () => {
    const prohibidas = [
      "vidrio",
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
      "fixed",
    ]
    const archivos = [...ESPERADOS, ...CAMBIADOS_FUERA]
    const violaciones = archivos.flatMap((ruta) =>
      soloComentarios(fuente(ruta)).flatMap((comentario) =>
        [
          ...prohibidas.filter((palabra) => comentario.includes(palabra)),
          ...(comentario.includes("data-material") ? ["data-material"] : []),
        ].map((palabra) => `${ruta}: ${palabra}`),
      ),
    )
    expect(archivos.length).toBe(15)
    expect(violaciones).toEqual([])
  })
})
