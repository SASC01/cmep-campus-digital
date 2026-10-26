import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

// Ataque de la ronda 1 de CALIFICACIONES-01b, revisión estática de las dos lecturas: el adaptador no
// nombra en código ningún campo que no deba salir (correo, estado de pago, restricción, rol, versión
// ni hash), no lanza sentencias en paralelo dentro de la instantánea (Promise.all) y el handler no
// decide el acceso a mano (sin comparar el rol ni leer inscripciones, maestros o propiedad).

const SRC = join(import.meta.dirname, "..", "src")

const sinComentarios = (texto: string): string =>
  texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1")

const codigoDe = (ruta: string): string => sinComentarios(readFileSync(join(SRC, ruta), "utf8"))

describe("ataque 01b r1: revisión estática de las lecturas de calificaciones", () => {
  it("CAL-T-68: adapters/db/calificaciones.ts no nombra en código email, estadoPago, fechaEstadoPago, accesoRestringido, motivoRestriccion, rol, version ni hash, y no usa Promise.all", () => {
    const codigo = codigoDe("adapters/db/calificaciones.ts")
    expect(codigo, "Precondición: el archivo tiene las dos lecturas").toMatch(
      /leerGradebook[\s\S]*leerMisCalificaciones/,
    )
    expect(codigo).not.toMatch(
      /\b(email|estadoPago|estado_pago|fechaEstadoPago|accesoRestringido|acceso_restringido|motivoRestriccion|rol|version|hashContrasena|hash)\b/,
    )
    expect(codigo).not.toMatch(/Promise\.(all|allSettled|race|any)\b/)
  })

  it("CAL-T-69: las dos rutas de 01b en handlers/calificaciones.ts no deciden el acceso a mano: el alumno sale de perfilDe(request).id y nada compara el rol ni lee inscripciones, maestros o el dueño de la clase", () => {
    const codigo = codigoDe("handlers/calificaciones.ts")
    const inicio = codigo.indexOf('"/clases/:claseId/gradebook"')
    expect(inicio, "Precondición: la ruta del gradebook está registrada").toBeGreaterThan(0)
    // La cadena de protegido() nombra la pertenencia ("inscripcion", "propiedad"): se quita antes.
    const lecturas = codigo.slice(inicio).replace(/protegido\(\{[^}]*\}\)/g, "protegido()")
    expect(lecturas).toMatch(/"\/clases\/:claseId\/mis-calificaciones"/)
    expect(lecturas).toMatch(/alumnoId: perfilDe\(request\)\.id/)
    expect(lecturas).not.toMatch(/\.rol\b|rol\s*===|===\s*"(admin|maestro|estudiante)"/)
    expect(lecturas).not.toMatch(
      /inscripcion|maestros|maestroId|esDueno|propietario|accesoRestringido/,
    )
    expect(lecturas).not.toMatch(/request\.(query|params)\s*as\b|request\.query\.\w+/)
    expect(lecturas).not.toMatch(/\btry\s*\{/)
  })
})
