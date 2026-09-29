import { describe, expect, it } from "vitest"

import type { PerfilAutenticado } from "./autorizacion.js"
import {
  errorDelCambioPropio,
  estaVivaParaCambio,
  evaluarCambioSolicitado,
  evaluarContrasenaRepetida,
} from "./cambio-de-contrasena.js"

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

const sesionBase = {
  usuarioId: "u1",
  revocadaEn: null,
  reemplazadaPor: null,
  expiraEn: new Date("2030-01-01T00:00:00.000Z"),
}

const ahora = new Date("2029-01-01T00:00:00.000Z")

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

describe("evaluarContrasenaRepetida", () => {
  it("coincide con la vigente → 400 CONTRASENA_REPETIDA", () => {
    const error = evaluarContrasenaRepetida(true)
    expect(error?.codigo).toBe("CONTRASENA_REPETIDA")
    expect(error?.estado).toBe(400)
  })

  it("no coincide → null", () => {
    expect(evaluarContrasenaRepetida(false)).toBeNull()
  })
})

describe("estaVivaParaCambio", () => {
  it("sin sesión (null) → false", () => {
    expect(estaVivaParaCambio(null, "u1", ahora)).toBe(false)
  })

  it("sesión de otro usuario → false", () => {
    expect(estaVivaParaCambio({ ...sesionBase, usuarioId: "u2" }, "u1", ahora)).toBe(false)
  })

  it("sesión revocada → false", () => {
    expect(estaVivaParaCambio({ ...sesionBase, revocadaEn: ahora }, "u1", ahora)).toBe(false)
  })

  it("sesión reemplazada → false", () => {
    expect(estaVivaParaCambio({ ...sesionBase, reemplazadaPor: "s2" }, "u1", ahora)).toBe(false)
  })

  it("expira_en == ahora → false", () => {
    expect(estaVivaParaCambio({ ...sesionBase, expiraEn: ahora }, "u1", ahora)).toBe(false)
  })

  it("sesión viva del mismo usuario → true", () => {
    expect(estaVivaParaCambio(sesionBase, "u1", ahora)).toBe(true)
  })
})

describe("errorDelCambioPropio", () => {
  it("'cambiada' → null", () => {
    expect(errorDelCambioPropio("cambiada")).toBeNull()
  })

  it("'credencial_cambiada' → 401 SESION_INVALIDA", () => {
    const error = errorDelCambioPropio("credencial_cambiada")
    expect(error?.codigo).toBe("SESION_INVALIDA")
    expect(error?.estado).toBe(401)
  })

  it("'sin_sesion' → 401 SESION_INVALIDA", () => {
    const error = errorDelCambioPropio("sin_sesion")
    expect(error?.codigo).toBe("SESION_INVALIDA")
    expect(error?.estado).toBe(401)
  })
})
