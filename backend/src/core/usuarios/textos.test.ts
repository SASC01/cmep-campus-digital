import { describe, expect, it } from "vitest"

import { mensajeMaestroConClases, TEXTOS_USUARIOS } from "./textos.js"

describe("textos de la gestión de usuarios (ADM-1E01)", () => {
  it("ADM-1E01: MAESTRO_CON_CLASES en singular con 1 y en plural con 2 y con 10", () => {
    expect(mensajeMaestroConClases(1)).toBe(
      "Este maestro tiene 1 clase activa asignada. Asigna otro maestro a esa clase y quítalo de ella antes de darlo de baja.",
    )
    expect(mensajeMaestroConClases(2)).toBe(
      "Este maestro tiene 2 clases activas asignadas. Asigna otro maestro a esas clases y quítalo de ellas antes de darlo de baja.",
    )
    expect(mensajeMaestroConClases(10)).toContain("tiene 10 clases activas asignadas.")
  })

  it("ADM-1E01: los textos de §D-7 y §D-8, literales", () => {
    expect(TEXTOS_USUARIOS).toEqual({
      busquedaMuyCorta: "Escribe al menos 3 letras para buscar.",
      usuarioNoEncontrado: "No hay ninguna cuenta con ese identificador.",
      cuentaDeAdministracion: "La cuenta de administración no se da de baja.",
      noEsAlumno: "Solo se restringe el acceso de un alumno.",
      loteConCuentasQueNoSonDeAlumnos: "alumnoIds: hay cuentas que no son de alumnos",
    })
  })
})
