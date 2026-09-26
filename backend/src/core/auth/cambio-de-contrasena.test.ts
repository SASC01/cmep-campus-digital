import { describe, expect, it } from "vitest"

import type { PerfilAutenticado } from "./autorizacion.js"
import { evaluarCambioSolicitado, evaluarContrasenaNueva } from "./cambio-de-contrasena.js"

const perfilBase: PerfilAutenticado = {
  id: "u1",
  nombre: "Ana",
  email: "ana@ejemplo.mx",
  rol: "estudiante",
  activo: true,
  accesoRestringido: false,
  motivoRestriccion: null,
  debeCambiarContrasena: false,
}

describe("evaluarCambioSolicitado", () => {
  it("sin la bandera → 409 CAMBIO_NO_REQUERIDO", () => {
    const error = evaluarCambioSolicitado(perfilBase)
    expect(error?.codigo).toBe("CAMBIO_NO_REQUERIDO")
    expect(error?.estado).toBe(409)
  })

  it("con la bandera → null", () => {
    expect(evaluarCambioSolicitado({ ...perfilBase, debeCambiarContrasena: true })).toBeNull()
  })
})

describe("evaluarContrasenaNueva", () => {
  it("nueva idéntica a la actual → 400 CONTRASENA_REPETIDA", () => {
    const error = evaluarContrasenaNueva({ actual: "TemporalAbcd", nueva: "TemporalAbcd" })
    expect(error?.codigo).toBe("CONTRASENA_REPETIDA")
    expect(error?.estado).toBe(400)
  })

  it("distinta solo en mayúsculas → null (son contraseñas distintas)", () => {
    expect(evaluarContrasenaNueva({ actual: "TemporalAbcd", nueva: "temporalabcd" })).toBeNull()
  })
})
