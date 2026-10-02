import { describe, expect, it } from "vitest"

import { evaluarPertenencia, relacionConClase } from "./pertenencia.js"

const MAESTRO_ID = "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
const OTRO_ID = "aaaaaaaa-1c1f-4b8e-9a1e-0f2a3b4c5d6e"

describe("relacionConClase", () => {
  it("PR-A03a: maestro dueño → 'maestro'", () => {
    expect(
      relacionConClase(
        { id: MAESTRO_ID, rol: "maestro" },
        { maestroId: MAESTRO_ID, inscrito: false },
      ),
    ).toBe("maestro")
  })

  it("PR-A03a: maestro ajeno → null", () => {
    expect(
      relacionConClase({ id: OTRO_ID, rol: "maestro" }, { maestroId: MAESTRO_ID, inscrito: false }),
    ).toBeNull()
  })

  it("PR-A03a: estudiante inscrito → 'estudiante'", () => {
    expect(
      relacionConClase(
        { id: OTRO_ID, rol: "estudiante" },
        { maestroId: MAESTRO_ID, inscrito: true },
      ),
    ).toBe("estudiante")
  })

  it("PR-A03a: estudiante no inscrito → null", () => {
    expect(
      relacionConClase(
        { id: OTRO_ID, rol: "estudiante" },
        { maestroId: MAESTRO_ID, inscrito: false },
      ),
    ).toBeNull()
  })

  it("PR-A03a: admin → null", () => {
    expect(
      relacionConClase({ id: OTRO_ID, rol: "admin" }, { maestroId: MAESTRO_ID, inscrito: true }),
    ).toBeNull()
  })

  it("PR-A03a: datos nulos (clase inexistente) → null", () => {
    expect(relacionConClase({ id: OTRO_ID, rol: "maestro" }, null)).toBeNull()
  })

  it("PR-A03a: un estudiante cuyo id coincide con maestroId sigue sin relación (rol manda)", () => {
    expect(
      relacionConClase(
        { id: MAESTRO_ID, rol: "estudiante" },
        { maestroId: MAESTRO_ID, inscrito: false },
      ),
    ).toBeNull()
  })
})

describe("evaluarPertenencia", () => {
  it("PR-A03b: 'propiedad' solo deja pasar a 'maestro'", () => {
    expect(evaluarPertenencia("maestro", "propiedad")).toBeNull()
    expect(evaluarPertenencia("estudiante", "propiedad")?.codigo).toBe("SIN_ACCESO_A_LA_CLASE")
    expect(evaluarPertenencia(null, "propiedad")?.codigo).toBe("SIN_ACCESO_A_LA_CLASE")
  })

  it("PR-A03b: 'inscripcion' deja pasar cualquier relación no nula", () => {
    expect(evaluarPertenencia("maestro", "inscripcion")).toBeNull()
    expect(evaluarPertenencia("estudiante", "inscripcion")).toBeNull()
    const error = evaluarPertenencia(null, "inscripcion")
    expect(error?.codigo).toBe("SIN_ACCESO_A_LA_CLASE")
    expect(error?.estado).toBe(403)
  })
})
