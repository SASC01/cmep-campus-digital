import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

// CALIFICACIONES-01b (CAL-1B08). Reglas estáticas de las dos lecturas: adapters/db/calificaciones.ts
// no escribe, su SQL es etiquetado (sin Unsafe), no consulta dentro de ciclos y pide la instantánea
// única exactamente dos veces, en código; el handler registra las dos rutas con su cadena; los
// esquemas nuevos de shared/ son estrictos; y ningún comentario de los archivos nuevos o cambiados de
// backend/src en 01b nombra las palabras de §D-0.9.

const SRC = join(import.meta.dirname, "..", "src")
const SHARED = join(import.meta.dirname, "..", "..", "shared", "src")

const sinComentarios = (texto: string): string =>
  texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1")

const comentariosDe = (texto: string): string[] => [
  ...[...texto.matchAll(/\/\*[\s\S]*?\*\//g)].map((m) => m[0]),
  ...[...texto.matchAll(/(?:^|[^:"'`])(\/\/.*)$/gm)].map((m) => m[1] ?? ""),
]

const leerCrudo = (ruta: string): string => readFileSync(join(SRC, ruta), "utf8")

// El cuerpo de cada ciclo for/while: desde su llave de apertura hasta la que la cierra.
const cuerposDeCiclos = (codigo: string): string[] =>
  [...codigo.matchAll(/\b(for|while)\s*\(/g)].map((m) => {
    const apertura = codigo.indexOf("{", m.index)
    let profundidad = 0
    for (let i = apertura; i < codigo.length; i += 1) {
      if (codigo[i] === "{") profundidad += 1
      if (codigo[i] === "}") profundidad -= 1
      if (profundidad === 0) return codigo.slice(apertura, i + 1)
    }
    return codigo.slice(apertura)
  })

describe("reglas estáticas de las lecturas de calificaciones (CAL-1B08)", () => {
  const crudo = leerCrudo("adapters/db/calificaciones.ts")
  const codigo = sinComentarios(crudo)

  it("CAL-1B08: adapters/db/calificaciones.ts no escribe ni bloquea filas (ni create, update, delete, upsert ni SQL de escritura)", () => {
    expect(codigo.length, "Precondición: existe el archivo").toBeGreaterThan(0)
    expect(codigo).not.toMatch(
      /\.(create|createMany|update|updateMany|delete|deleteMany|upsert)\s*\(|\$executeRaw/,
    )
    expect(codigo).not.toMatch(/\b(INSERT|UPDATE|DELETE|TRUNCATE|MERGE)\b/i)
    expect(codigo).not.toMatch(/\bFOR\s+(NO\s+KEY\s+)?(UPDATE|SHARE|KEY\s+SHARE)\b/i)
  })

  it("CAL-1B08: su SQL es etiquetado y sin Unsafe (tres consultas: los dos agregados y las vencidas), y no hay consultas dentro de ciclos", () => {
    expect(crudo).not.toMatch(/Unsafe/)
    expect(codigo.match(/\$queryRaw\s*(<[^`]*>)?\s*`/g)?.length).toBe(3)
    expect(codigo.match(/\$queryRaw/g)?.length).toBe(3)
    const ciclos = cuerposDeCiclos(codigo)
    expect(ciclos.length, "Precondición: el archivo tiene ciclos que revisar").toBeGreaterThan(0)
    for (const cuerpo of ciclos) {
      expect(cuerpo).not.toMatch(/\bawait\b|\btx\.|\bdb\./)
    }
    expect(codigo).not.toMatch(/\.(map|flatMap|forEach|filter|reduce)\(\s*async\b/)
    expect(codigo).not.toMatch(/Promise\.all/)
  })

  it("CAL-1B08: nombra «instantaneaUnica: true» exactamente 2 veces, en código (leerGradebook y leerMisCalificaciones)", () => {
    expect(crudo.match(/instantaneaUnica: true/g)?.length).toBe(2)
    expect(codigo.match(/instantaneaUnica: true/g)?.length).toBe(2)
    for (const nombre of ["leerGradebook", "leerMisCalificaciones"]) {
      const desde = codigo.indexOf(`export const ${nombre} =`)
      expect(desde, `Precondición: existe ${nombre}`).toBeGreaterThanOrEqual(0)
      const siguiente = codigo.slice(desde + 1).search(/\n(export )?(const|interface|type) /)
      const cuerpo =
        siguiente < 0 ? codigo.slice(desde) : codigo.slice(desde, desde + 1 + siguiente)
      expect(cuerpo, nombre).toMatch(/enTransaccion\([\s\S]*\{ instantaneaUnica: true \}\)/)
    }
  })

  it("CAL-1B08: handlers/calificaciones.ts registra las dos lecturas con su cadena exacta", () => {
    const handler = sinComentarios(leerCrudo("handlers/calificaciones.ts"))
    expect(handler).toMatch(
      /app\.get\(\s*"\/clases\/:claseId\/gradebook",\s*protegido\(\{ roles: \["maestro", "admin"\], pertenencia: "propiedad" \}\)/,
    )
    expect(handler).toMatch(
      /app\.get\(\s*"\/clases\/:claseId\/mis-calificaciones",\s*protegido\(\{ roles: \["estudiante"\], pertenencia: "inscripcion" \}\)/,
    )
    expect(handler.match(/app\.get\(/g)?.length).toBe(2)
    // El alumno de "Mis calificaciones" es siempre el de la sesión.
    expect(handler).toMatch(/alumnoId: perfilDe\(request\)\.id/)
  })

  it("CAL-1B08: las respuestas nuevas de shared/ son z.strictObject", () => {
    const calificaciones = sinComentarios(readFileSync(join(SHARED, "calificaciones.ts"), "utf8"))
    for (const nombre of [
      "desgloseDeCategoriaSchema",
      "calificacionGeneralSchema",
      "columnaDelGradebookSchema",
      "celdaDelGradebookSchema",
      "filaDelGradebookSchema",
      "resumenDelGradebookSchema",
      "gradebookRespuestaSchema",
      "tareaDeMisCalificacionesSchema",
      "misCalificacionesRespuestaSchema",
    ]) {
      expect(
        new RegExp(`export const ${nombre} = (z\\.\\w+)\\(`).exec(calificaciones)?.[1],
        nombre,
      ).toBe("z.strictObject")
    }
  })

  it("CAL-1B08 (§D-0.9): ningún comentario de los archivos nuevos o cambiados de backend/src en 01b nombra las palabras que leen en crudo las listas estáticas", () => {
    const archivos = [
      "adapters/db/calificaciones.ts",
      "adapters/db/index.ts",
      "adapters/db/entregas.ts",
      "core/calificaciones/calificar.ts",
      "handlers/calificaciones.ts",
    ]
    const hallazgos: string[] = []
    for (const ruta of archivos) {
      const comentarios = comentariosDe(leerCrudo(ruta)).join("\n")
      const prohibidas = [
        /COMENTARIO_CREADO|AVISO_FALLIDO|PUBLICACION_CREADA|MATERIAL_CREADO|colaDePublicacion/,
        /DELETE\s+FROM|TRUNCATE/i,
        /REPEATABLE READ|RepeatableRead|Serializable/,
        /instantaneaUnica: true/,
        ...(ruta.startsWith("adapters/db/")
          ? []
          : [/enTransaccion|instantaneaUnica|isolationLevel/]),
      ]
      for (const palabra of prohibidas) {
        if (palabra.test(comentarios)) hallazgos.push(`${ruta}: ${String(palabra)}`)
      }
    }
    expect(hallazgos).toEqual([])
  })
})
