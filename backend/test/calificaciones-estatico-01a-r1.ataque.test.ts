import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

// Ataques del Tester, CALIFICACIONES-01a ronda 1, reglas estáticas: lo que CAL-1A18 deja fuera
// (N-13: adapters/queue/colas.ts es un archivo cambiado del encargo y queda sin vigilar para las
// palabras que leen en crudo lecturas-fx-r1 y lecturas-fx-r2) y que la respuesta del alumno no pueda
// llevar version ni datos de la persona.

const SRC = join(import.meta.dirname, "..", "src")

const leerCrudo = (ruta: string): string => readFileSync(join(SRC, ruta), "utf8")

const comentariosDe = (texto: string): string =>
  [
    ...[...texto.matchAll(/\/\*[\s\S]*?\*\//g)].map((m) => m[0]),
    ...[...texto.matchAll(/(?:^|[^:"'`])(\/\/.*)$/gm)].map((m) => m[1] ?? ""),
  ].join("\n")

describe("ataque CALIFICACIONES-01a r1: reglas estáticas", () => {
  it("CAL-T-20: en adapters/queue/colas.ts ningún comentario nombra el borrado crudo, los niveles de aislamiento ni la opción de instantánea (§D-0.9, sin la excepción de los nombres de cola)", () => {
    const comentarios = comentariosDe(leerCrudo("adapters/queue/colas.ts"))
    expect(comentarios.length, "Precondición: colas.ts tiene comentarios").toBeGreaterThan(0)
    const prohibidas = [
      /DELETE\s+FROM|TRUNCATE/i,
      /REPEATABLE READ|RepeatableRead|Serializable/,
      /enTransaccion|instantaneaUnica|isolationLevel/,
    ]
    expect(prohibidas.filter((p) => p.test(comentarios)).map(String)).toEqual([])
  })

  it("CAL-T-21: miEntregaParaResponder no nombra version, alumno, correo, estado de pago ni restricción; ninguna respuesta de handlers/respuestas-de-entrega.ts los nombra salvo la version del maestro", () => {
    const codigo = leerCrudo("handlers/respuestas-de-entrega.ts")
    const desde = codigo.indexOf("export const miEntregaParaResponder")
    const hasta = codigo.indexOf("export const entregaDeAlumnoParaResponder")
    expect(desde, "Precondición: existe miEntregaParaResponder").toBeGreaterThanOrEqual(0)
    expect(hasta, "Precondición: existe entregaDeAlumnoParaResponder").toBeGreaterThan(desde)
    const delAlumno = codigo.slice(desde, hasta).replace(/\/\/.*$/gm, "")
    expect(delAlumno).not.toMatch(/version|alumno|email|correo|estadoPago|accesoRestringido/)
    const todo = codigo.replace(/\/\/.*$/gm, "")
    expect(todo).not.toMatch(/email|estadoPago|accesoRestringido|motivoRestriccion|\brol\b/)
    expect(todo.match(/version/g)?.length).toBe(2)
  })
})
