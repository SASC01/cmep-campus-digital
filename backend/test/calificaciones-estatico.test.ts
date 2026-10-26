import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

// CALIFICACIONES-01a (CAL-1A18). Reglas estáticas de calificar: el handler es delgado y solo encola su
// aviso; el bloqueo compartido de la tarea vive en un solo lugar; adapters/db no importa la cola; los
// esquemas nuevos de shared/ son estrictos; y (Enmienda 1, N-01) ningún comentario de los archivos
// nuevos o cambiados de backend/src nombra las palabras que leen en crudo las listas estáticas.

const SRC = join(import.meta.dirname, "..", "src")
const SHARED = join(import.meta.dirname, "..", "..", "shared", "src")

const sinComentarios = (texto: string): string =>
  texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1")

const comentariosDe = (texto: string): string[] => [
  ...[...texto.matchAll(/\/\*[\s\S]*?\*\//g)].map((m) => m[0]),
  ...[...texto.matchAll(/(?:^|[^:"'`])(\/\/.*)$/gm)].map((m) => m[1] ?? ""),
]

const leerCrudo = (ruta: string): string => readFileSync(join(SRC, ruta), "utf8")
const leer = (ruta: string): string => sinComentarios(leerCrudo(ruta))

// El cuerpo de una declaración de nivel superior, hasta la siguiente.
const cuerpoDe = (codigo: string, inicio: string): string => {
  const desde = codigo.indexOf(inicio)
  expect(desde, `Precondición: existe ${inicio}`).toBeGreaterThanOrEqual(0)
  const siguiente = codigo.slice(desde + inicio.length).search(/\n(export )?(const|interface) /)
  return siguiente < 0
    ? codigo.slice(desde)
    : codigo.slice(desde, desde + inicio.length + siguiente)
}

describe("reglas estáticas de calificar (CAL-1A18)", () => {
  it("CAL-1A18: handlers/calificaciones.ts no compara relación ni rol, no toca Prisma ni SQL y solo encola COLA_CALIFICACION_PUBLICADA", () => {
    const handler = leer("handlers/calificaciones.ts")
    expect(handler.length, "Precondición: existe el handler").toBeGreaterThan(0)
    expect(handler).not.toMatch(
      /relacion\s*===|\.rol\b|===\s*"(admin|maestro|estudiante)"|\$queryRaw|\$executeRaw|obtenerDb|@prisma|generated\/|cancelar\(/,
    )
    expect([...handler.matchAll(/encolar\(\s*(\w+)/g)].map((m) => m[1])).toEqual([
      "COLA_CALIFICACION_PUBLICADA",
    ])
    expect(handler).not.toMatch(/COMENTARIO_CREADO|AVISO_FALLIDO/)
    expect(handler).toMatch(/protegido\(\{ roles: \["maestro"\], pertenencia: "propiedad" \}\)/)
  })

  it("CAL-1A18: el bloqueo compartido de la tarea (sin KEY) aparece una vez en adapters/db/entregas.ts, dentro de bloquearTareaParaCalificar, y lo usa calificarEntrega", () => {
    const crudo = leerCrudo("adapters/db/entregas.ts")
    const codigo = sinComentarios(crudo)
    expect(codigo.match(/FOR\s+SHARE/gi)?.length).toBe(1)
    expect(crudo.match(/FOR\s+SHARE/gi)?.length).toBe(1)
    expect(cuerpoDe(codigo, "const bloquearTareaParaCalificar =")).toMatch(/FOR\s+SHARE/)
    expect(cuerpoDe(codigo, "export const calificarEntrega =")).toContain(
      "bloquearTareaParaCalificar(tx",
    )
    // El bloqueo de la tarea va antes que cualquier otra sentencia de calificar.
    const calificar = cuerpoDe(codigo, "export const calificarEntrega =")
    const bloqueo = calificar.indexOf("bloquearTareaParaCalificar(tx")
    const otras = ["alumnoInscrito(tx", "criterioRubrica.findMany", "asegurarFilaDeEntrega(tx"]
    for (const otra of otras) {
      expect(calificar.indexOf(otra), otra).toBeGreaterThan(bloqueo)
    }
    expect(calificar).not.toMatch(/\b(for|while)\s*\(|\.forEach\(/)
  })

  it("CAL-1A18: adapters/db no importa adapters/queue", () => {
    for (const archivo of ["entregas.ts", "tareas.ts", "index.ts"]) {
      expect(leer(`adapters/db/${archivo}`), archivo).not.toMatch(
        /adapters\/queue|from\s+["']\.\.\/queue/,
      )
    }
  })

  it("CAL-1A18: los esquemas nuevos de shared/ son z.strictObject", () => {
    const entregas = sinComentarios(readFileSync(join(SHARED, "entregas.ts"), "utf8"))
    const calificaciones = sinComentarios(readFileSync(join(SHARED, "calificaciones.ts"), "utf8"))
    const constructor = (texto: string, nombre: string) =>
      new RegExp(`export const ${nombre} = (z\\.\\w+)\\(`).exec(texto)?.[1]
    expect(constructor(entregas, "puntajeDeCriterioSchema")).toBe("z.strictObject")
    expect(constructor(entregas, "calificacionDeEntregaSchema")).toBe("z.strictObject")
    expect(constructor(calificaciones, "calificarEntregaSchema")).toBe("z.strictObject")
    expect(calificaciones).toMatch(/const puntajeEnviadoSchema = z\.strictObject\(/)
  })

  it("CAL-1A18 (N-01): ningún comentario de los archivos nuevos o cambiados de backend/src nombra las palabras de §D-0.9", () => {
    // En adapters/queue/colas.ts solo se omite la primera categoría (los nombres de cola): muro-c-r1
    // la admite entre quienes nombran esas colas y su comentario de la cola de fallidos es anterior a
    // este encargo. Las demás categorías sí se revisan en él (N-13).
    const SIN_NOMBRES_DE_COLA = "adapters/queue/colas.ts"
    const archivos = [
      SIN_NOMBRES_DE_COLA,
      "app.ts",
      "core/calificaciones/calificar.ts",
      "core/calificaciones/general.ts",
      "core/calificaciones/riesgo.ts",
      "core/eventos/avisos-de-clase.ts",
      "adapters/db/entregas.ts",
      "adapters/db/tareas.ts",
      "adapters/db/index.ts",
      "handlers/calificaciones.ts",
      "handlers/respuestas-de-entrega.ts",
      "handlers/tareas/entregas.ts",
    ]
    const hallazgos: string[] = []
    for (const ruta of archivos) {
      const comentarios = comentariosDe(leerCrudo(ruta)).join("\n")
      const prohibidas = [
        ...(ruta === SIN_NOMBRES_DE_COLA
          ? []
          : [
              /COMENTARIO_CREADO|AVISO_FALLIDO|PUBLICACION_CREADA|MATERIAL_CREADO|colaDePublicacion/,
            ]),
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
