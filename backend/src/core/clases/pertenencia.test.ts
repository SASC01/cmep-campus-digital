import { describe, expect, it } from "vitest"

import { evaluarPertenencia, relacionConClase } from "./pertenencia.js"

const MAESTRO_ID = "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
const OTRO_ID = "aaaaaaaa-1c1f-4b8e-9a1e-0f2a3b4c5d6e"

describe("relacionConClase", () => {
  it("PR-2A01: estudiante inscrito → 'estudiante'", () => {
    expect(
      relacionConClase({ id: OTRO_ID, rol: "estudiante" }, { esMaestro: false, inscrito: true }),
    ).toBe("estudiante")
  })

  it("PR-2A01: estudiante no inscrito → null", () => {
    expect(
      relacionConClase({ id: OTRO_ID, rol: "estudiante" }, { esMaestro: false, inscrito: false }),
    ).toBeNull()
  })

  it("PR-2A01: maestro asignado → 'maestro'", () => {
    expect(
      relacionConClase({ id: MAESTRO_ID, rol: "maestro" }, { esMaestro: true, inscrito: false }),
    ).toBe("maestro")
  })

  it("PR-2A01: maestro no asignado → null", () => {
    expect(
      relacionConClase({ id: OTRO_ID, rol: "maestro" }, { esMaestro: false, inscrito: false }),
    ).toBeNull()
  })

  it("PR-2A01: admin con clase → 'admin'", () => {
    expect(
      relacionConClase({ id: OTRO_ID, rol: "admin" }, { esMaestro: false, inscrito: false }),
    ).toBe("admin")
  })

  it("PR-2A01: admin sin clase (datos null) → null", () => {
    expect(relacionConClase({ id: OTRO_ID, rol: "admin" }, null)).toBeNull()
  })

  it("PR-2A01: un rol desconocido → null", () => {
    expect(
      relacionConClase({ id: OTRO_ID, rol: "invitado" }, { esMaestro: true, inscrito: true }),
    ).toBeNull()
  })

  it("PR-2A01: datos nulos (clase inexistente) → null para maestro y estudiante", () => {
    expect(relacionConClase({ id: OTRO_ID, rol: "maestro" }, null)).toBeNull()
    expect(relacionConClase({ id: OTRO_ID, rol: "estudiante" }, null)).toBeNull()
  })

  it("PR-2A01: un maestro con inscrito: true (dato imposible) → null", () => {
    expect(
      relacionConClase({ id: MAESTRO_ID, rol: "maestro" }, { esMaestro: true, inscrito: true }),
    ).toBeNull()
  })

  it("PR-2A01: un estudiante con esMaestro: true (dato imposible) → null", () => {
    expect(
      relacionConClase({ id: MAESTRO_ID, rol: "estudiante" }, { esMaestro: true, inscrito: true }),
    ).toBeNull()
    expect(
      relacionConClase({ id: MAESTRO_ID, rol: "estudiante" }, { esMaestro: true, inscrito: false }),
    ).toBeNull()
  })
})

describe("evaluarPertenencia", () => {
  it("PR-2A02: con admiteAdmin true, 'propiedad' deja pasar a 'maestro' y 'admin' y niega al resto", () => {
    expect(evaluarPertenencia("maestro", "propiedad", true)).toBeNull()
    expect(evaluarPertenencia("admin", "propiedad", true)).toBeNull()
    expect(evaluarPertenencia("estudiante", "propiedad", true)?.codigo).toBe(
      "SIN_ACCESO_A_LA_CLASE",
    )
    expect(evaluarPertenencia(null, "propiedad", true)?.codigo).toBe("SIN_ACCESO_A_LA_CLASE")
  })

  it("PR-2A02: con admiteAdmin true, 'inscripcion' deja pasar las tres relaciones y niega null", () => {
    expect(evaluarPertenencia("maestro", "inscripcion", true)).toBeNull()
    expect(evaluarPertenencia("estudiante", "inscripcion", true)).toBeNull()
    expect(evaluarPertenencia("admin", "inscripcion", true)).toBeNull()
    const error = evaluarPertenencia(null, "inscripcion", true)
    expect(error?.codigo).toBe("SIN_ACCESO_A_LA_CLASE")
    expect(error?.estado).toBe(403)
  })

  it("PR-2A02: con admiteAdmin false, las dos exigencias niegan 'admin' y el resto queda igual", () => {
    for (const exigencia of ["propiedad", "inscripcion"] as const) {
      const error = evaluarPertenencia("admin", exigencia, false)
      expect(error?.codigo).toBe("SIN_ACCESO_A_LA_CLASE")
      expect(error?.estado).toBe(403)
      expect(evaluarPertenencia("maestro", exigencia, false)).toBeNull()
      expect(evaluarPertenencia(null, exigencia, false)?.codigo).toBe("SIN_ACCESO_A_LA_CLASE")
    }
    expect(evaluarPertenencia("estudiante", "inscripcion", false)).toBeNull()
    expect(evaluarPertenencia("estudiante", "propiedad", false)?.codigo).toBe(
      "SIN_ACCESO_A_LA_CLASE",
    )
  })
})
