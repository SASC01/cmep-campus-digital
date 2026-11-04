import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

// CALIFICACIONES-02a (CAL2-A08). Reglas estáticas de la exportación: el adaptador nuevo solo lee, en
// una sola instantánea, con la lectura del gradebook, y lee el correo solo en su consulta de correos;
// el adaptador del gradebook sigue sin nombrar el correo y exporta leerGradebookCon; el handler
// registra la ruta con su cadena exacta y no compara rol ni relación ni toca la base; y ningún
// comentario de los archivos nuevos o cambiados de backend/src en 02a nombra las palabras de §D-0.6.

const SRC = join(import.meta.dirname, "..", "src")

const sinComentarios = (texto: string): string =>
  texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1")

const comentariosDe = (texto: string): string[] => [
  ...[...texto.matchAll(/\/\*[\s\S]*?\*\//g)].map((m) => m[0]),
  ...[...texto.matchAll(/(?:^|[^:"'`])(\/\/.*)$/gm)].map((m) => m[1] ?? ""),
]

const leerCrudo = (ruta: string): string => readFileSync(join(SRC, ruta), "utf8")

// Desde la declaración de nivel superior que empieza en `inicio` hasta la siguiente.
const declaracion = (codigo: string, inicio: string): string => {
  const desde = codigo.indexOf(inicio)
  if (desde < 0) return ""
  const siguiente = codigo
    .slice(desde + 1)
    .search(/\n(export )?(const|interface|type|async function|function) /)
  return siguiente < 0 ? codigo.slice(desde) : codigo.slice(desde, desde + 1 + siguiente)
}

const RUTA_DEL_ADAPTADOR = "adapters/db/exportacion-de-calificaciones.ts"

describe("reglas estáticas de la exportación (CAL2-A08)", () => {
  const crudo = leerCrudo(RUTA_DEL_ADAPTADOR)
  const codigo = sinComentarios(crudo)

  it("CAL2-A08: el adaptador de la exportación no escribe ni bloquea, no usa SQL crudo ni Promise.all", () => {
    expect(codigo.length, "Precondición: existe el archivo").toBeGreaterThan(0)
    expect(codigo).not.toMatch(
      /\.(create|createMany|update|updateMany|delete|deleteMany|upsert)\s*\(|\$executeRaw/,
    )
    expect(codigo).not.toMatch(/\b(INSERT|UPDATE|DELETE|TRUNCATE|MERGE)\b/i)
    expect(codigo).not.toMatch(/\bFOR\s+(NO\s+KEY\s+)?(UPDATE|SHARE|KEY\s+SHARE)\b/i)
    expect(crudo).not.toMatch(/\$queryRaw|Unsafe/)
    expect(codigo).not.toMatch(/Promise\.all/)
    expect(codigo).not.toMatch(/\.(map|flatMap|forEach|filter|reduce)\(\s*async\b/)
  })

  it("CAL2-A08: nombra «instantaneaUnica: true» exactamente una vez, en el texto crudo y en código, dentro de leerExportacionDeCalificaciones, y llama a leerGradebookCon(tx", () => {
    expect(crudo.match(/instantaneaUnica: true/g)?.length).toBe(1)
    expect(codigo.match(/instantaneaUnica: true/g)?.length).toBe(1)
    const cuerpo = declaracion(codigo, "export const leerExportacionDeCalificaciones =")
    expect(cuerpo, "Precondición: existe leerExportacionDeCalificaciones").not.toBe("")
    expect(cuerpo).toMatch(/enTransaccion\([\s\S]*\{ instantaneaUnica: true \}\)/)
    expect(codigo).toMatch(/leerGradebookCon\(tx,/)
  })

  it("CAL2-A08: en código no nombra el estado de pago, la restricción, el rol, la versión ni el hash, y el correo solo en su tipo y en la consulta de correos", () => {
    for (const palabra of [
      /estadoPago/,
      /estado_pago/,
      /fechaEstadoPago/,
      /accesoRestringido/,
      /acceso_restringido/,
      /motivoRestriccion/,
      /\brol\b/,
      /\bversion\b/,
      /\bhash/i,
    ]) {
      expect(codigo, String(palabra)).not.toMatch(palabra)
    }

    // El tipo del alumno y el tramo que lee los correos y los lleva a cada fila.
    const tipo = declaracion(codigo, "export interface AlumnoDeExportacionDb")
    expect(tipo, "Precondición: existe el tipo").toMatch(/\bemail: string\b/)
    const desde = codigo.indexOf("const cuentas =")
    // El return de la función (dos espacios), no el de cada fila (cuatro).
    const hasta = codigo.indexOf("\n  return {", desde)
    expect(desde, "Precondición: existe la consulta de correos").toBeGreaterThanOrEqual(0)
    expect(hasta, "Precondición: la consulta va antes de la respuesta").toBeGreaterThan(desde)
    const tramo = codigo.slice(desde, hasta)
    expect(tramo).toMatch(/tx\.usuario\.findMany\(\{[\s\S]*select: \{ id: true, email: true \}/)
    expect(tramo.match(/select:/g)?.length).toBe(1)
    const fuera = codigo.replace(tipo, "").replace(tramo, "")
    expect(fuera).not.toMatch(/\bemail\b/i)
  })

  it("CAL2-A08: adapters/db/calificaciones.ts sigue sin nombrar el correo y exporta leerGradebookCon", () => {
    const gradebook = sinComentarios(leerCrudo("adapters/db/calificaciones.ts"))
    expect(gradebook).toMatch(/export const leerGradebookCon = async \(/)
    expect(gradebook).not.toMatch(/\bemail\b/i)
  })

  it("CAL2-A08: handlers/calificaciones.ts registra la exportación con la cadena exacta y no compara rol ni relación ni toca la base", () => {
    const handlerCrudo = leerCrudo("handlers/calificaciones.ts")
    const handler = sinComentarios(handlerCrudo)
    expect(handler).toMatch(
      /app\.get\(\s*"\/clases\/:claseId\/calificaciones\/exportacion",\s*protegido\(\{ roles: \["maestro", "admin"\], pertenencia: "propiedad" \}\)/,
    )
    const desde = handler.indexOf('"/clases/:claseId/calificaciones/exportacion"')
    expect(desde, "Precondición: existe la ruta").toBeGreaterThanOrEqual(0)
    const ruta = handler.slice(desde)
    expect(ruta).toMatch(/leerExportacionDeCalificaciones\(/)
    expect(ruta).toMatch(/exportacionDeCalificacionesRespuestaSchema\.parse\(/)
    for (const palabra of [
      /\.rol\b/,
      /\brol\s*[!=]==/,
      /inscripcion/,
      /\bmaestros\b/,
      /maestroId/,
      /esDueno/,
      /propietario/,
      /accesoRestringido/,
      /request\.(query|params)\.\w/,
      /request\.(query|params) as/,
      /try \{/,
      /obtenerDb|prisma|\$queryRaw|\$executeRaw|\btx\./i,
      /\bSELECT\b|\bFROM\b/,
    ]) {
      expect(ruta, String(palabra)).not.toMatch(palabra)
    }
    expect(handler).not.toMatch(/@prisma|generated\/client|from "pg"/)
    // Fuera de adapters/db, nadie abre transacciones ni elige aislamiento (§D-0.6).
    expect(handlerCrudo).not.toMatch(/enTransaccion|instantaneaUnica|isolationLevel/)
  })

  it("CAL2-A08 (§D-0.6): ningún comentario de los archivos nuevos o cambiados de backend/src en 02a nombra las palabras que leen en crudo las listas estáticas", () => {
    const archivos = [
      RUTA_DEL_ADAPTADOR,
      "adapters/db/calificaciones.ts",
      "adapters/db/index.ts",
      "handlers/calificaciones.ts",
    ]
    const hallazgos: string[] = []
    for (const ruta of archivos) {
      const comentarios = comentariosDe(leerCrudo(ruta)).join("\n")
      expect(comentarios.length, `Precondición: ${ruta} tiene comentarios`).toBeGreaterThan(0)
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
