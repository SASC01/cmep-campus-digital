import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  alumnoDeExportacionSchema,
  exportacionDeCalificacionesRespuestaSchema,
  exportacionQuerySchema,
  filaDeExportacionSchema,
  LIMITE_DE_LA_EXPORTACION,
} from "@campus/shared"
import { describe, expect, it } from "vitest"

// CALIFICACIONES-02a (CAL2-A09). Los esquemas de la exportación (§D-1). Se prueban aquí porque
// shared/ no tiene corredor de pruebas (como CAL-1A08).

const SHARED = join(import.meta.dirname, "..", "..", "shared", "src")

const sinComentarios = (texto: string): string =>
  texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1")

const ALUMNO = "aaaaaaaa-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
const TAREA = "bbbbbbbb-1c1f-4b8e-9a1e-0f2a3b4c5d6e"

const alumno = (cambios: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: ALUMNO,
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  ...cambios,
})

const fila = (cambios: Record<string, unknown> = {}): Record<string, unknown> => ({
  alumno: alumno(),
  celdas: [{ tareaId: TAREA, estado: "calificado", conRetraso: false, calificacion: 8.5 }],
  porcentaje: 85,
  ...cambios,
})

const respuesta = (cambios: Record<string, unknown> = {}): Record<string, unknown> => ({
  clase: { nombre: "Matemáticas I" },
  tareas: [
    {
      id: TAREA,
      titulo: "Tarea 1",
      fechaLimite: "2026-11-03T18:00:00.000Z",
      puntos: 10,
      categoria: null,
    },
  ],
  siguienteCursorTareas: null,
  totalTareas: 1,
  alumnos: [fila()],
  siguienteCursor: null,
  totalAlumnos: 1,
  ...cambios,
})

describe("exportacionQuerySchema (CAL2-A09)", () => {
  it("CAL2-A09: limite y limiteTareas valen 100 por omisión y aceptan de 1 a 100 enteros", () => {
    expect(LIMITE_DE_LA_EXPORTACION).toBe(100)
    expect(exportacionQuerySchema.parse({})).toEqual({ limite: 100, limiteTareas: 100 })
    for (const campo of ["limite", "limiteTareas"]) {
      for (const bueno of ["1", "100", 1, 100, "50"]) {
        expect(
          exportacionQuerySchema.safeParse({ [campo]: bueno }).success,
          `${campo}=${String(bueno)}`,
        ).toBe(true)
      }
      for (const malo of ["0", "101", "abc", "100.5", "-1", "", 0, 101]) {
        expect(
          exportacionQuerySchema.safeParse({ [campo]: malo }).success,
          `${campo}=${String(malo)}`,
        ).toBe(false)
      }
    }
  })

  it("CAL2-A09: cursor y cursorTareas son UUID; cursorTareas se pasa a minúsculas", () => {
    expect(exportacionQuerySchema.safeParse({ cursor: "no-es-un-id" }).success).toBe(false)
    expect(exportacionQuerySchema.safeParse({ cursorTareas: "no-es-un-id" }).success).toBe(false)
    expect(exportacionQuerySchema.parse({ cursor: ALUMNO }).cursor).toBe(ALUMNO)
    expect(exportacionQuerySchema.parse({ cursorTareas: TAREA.toUpperCase() }).cursorTareas).toBe(
      TAREA,
    )
  })
})

describe("las respuestas de la exportación son estrictas (CAL2-A09)", () => {
  it("CAL2-A09: exportacionDeCalificacionesRespuestaSchema, filaDeExportacionSchema y alumnoDeExportacionSchema son z.strictObject en shared/src/calificaciones.ts", () => {
    const calificaciones = sinComentarios(readFileSync(join(SHARED, "calificaciones.ts"), "utf8"))
    for (const nombre of [
      "alumnoDeExportacionSchema",
      "filaDeExportacionSchema",
      "exportacionDeCalificacionesRespuestaSchema",
    ]) {
      expect(
        new RegExp(`export const ${nombre} = (z\\.\\w+)\\(`).exec(calificaciones)?.[1],
        nombre,
      ).toBe("z.strictObject")
    }
    // La clase de la respuesta también.
    const respuestaSchema = calificaciones.slice(
      calificaciones.indexOf("export const exportacionDeCalificacionesRespuestaSchema"),
    )
    expect(respuestaSchema).toMatch(/clase: z\.strictObject\(\{ nombre: z\.string\(\) \}\)/)
  })

  it("CAL2-A09: una respuesta válida pasa; con estadoPago, accesoRestringido o rol de más en el alumno, en la fila o en la respuesta, se rechaza", () => {
    expect(alumnoDeExportacionSchema.safeParse(alumno()).success).toBe(true)
    expect(filaDeExportacionSchema.safeParse(fila()).success).toBe(true)
    expect(exportacionDeCalificacionesRespuestaSchema.safeParse(respuesta()).success).toBe(true)

    for (const extra of [
      { estadoPago: "deudor" },
      { accesoRestringido: true },
      { rol: "estudiante" },
    ]) {
      const llave = Object.keys(extra)[0] ?? ""
      expect(alumnoDeExportacionSchema.safeParse(alumno(extra)).success, llave).toBe(false)
      expect(filaDeExportacionSchema.safeParse(fila(extra)).success, llave).toBe(false)
      expect(
        exportacionDeCalificacionesRespuestaSchema.safeParse(
          respuesta({ alumnos: [fila({ alumno: alumno(extra) })] }),
        ).success,
        llave,
      ).toBe(false)
      expect(
        exportacionDeCalificacionesRespuestaSchema.safeParse(respuesta(extra)).success,
        llave,
      ).toBe(false)
      expect(
        exportacionDeCalificacionesRespuestaSchema.safeParse(
          respuesta({ clase: { nombre: "Matemáticas I", ...extra } }),
        ).success,
        llave,
      ).toBe(false)
    }
  })
})
