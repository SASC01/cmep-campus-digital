import { describe, expect, it } from "vitest"

import { AppError } from "../errores.js"
import { decidirCambioDeActivo } from "./baja.js"

const esperarError = (resultado: unknown, codigo: string, mensaje: string): void => {
  expect(resultado, `Se esperaba el 409 ${codigo}`).toBeInstanceOf(AppError)
  const error = resultado as AppError
  expect(error.codigo).toBe(codigo)
  expect(error.estado).toBe(409)
  expect(error.message).toBe(mensaje)
}

describe("decidirCambioDeActivo (ADM-1E01)", () => {
  it("ADM-1E01: la cuenta de administración → 409 CUENTA_DE_ADMINISTRACION, al darla de baja y al reactivarla", () => {
    for (const [activoActual, activoPedido] of [
      [true, false],
      [true, true],
      [false, true],
    ] as const) {
      esperarError(
        decidirCambioDeActivo({ rol: "admin", activoActual, activoPedido, clasesAsignadas: 0 }),
        "CUENTA_DE_ADMINISTRACION",
        "La cuenta de administración no se da de baja.",
      )
    }
  })

  it("ADM-1E01: maestro con 1 clase activa → 409 MAESTRO_CON_CLASES con el texto en singular", () => {
    esperarError(
      decidirCambioDeActivo({
        rol: "maestro",
        activoActual: true,
        activoPedido: false,
        clasesAsignadas: 1,
      }),
      "MAESTRO_CON_CLASES",
      "Este maestro tiene 1 clase activa asignada. Asigna otro maestro a esa clase y quítalo de ella antes de darlo de baja.",
    )
  })

  it("ADM-1E01: maestro con 3 clases activas → 409 MAESTRO_CON_CLASES con el texto en plural", () => {
    esperarError(
      decidirCambioDeActivo({
        rol: "maestro",
        activoActual: true,
        activoPedido: false,
        clasesAsignadas: 3,
      }),
      "MAESTRO_CON_CLASES",
      "Este maestro tiene 3 clases activas asignadas. Asigna otro maestro a esas clases y quítalo de ellas antes de darlo de baja.",
    )
  })

  it("ADM-1E01: baja de un maestro sin clases activas y de un alumno → escribe", () => {
    expect(
      decidirCambioDeActivo({
        rol: "maestro",
        activoActual: true,
        activoPedido: false,
        clasesAsignadas: 0,
      }),
    ).toEqual({ escribir: true })
    expect(
      decidirCambioDeActivo({
        rol: "estudiante",
        activoActual: true,
        activoPedido: false,
        clasesAsignadas: 0,
      }),
    ).toEqual({ escribir: true })
  })

  it("ADM-1E01: reactivar escribe, también a un maestro con clases asignadas", () => {
    expect(
      decidirCambioDeActivo({
        rol: "estudiante",
        activoActual: false,
        activoPedido: true,
        clasesAsignadas: 0,
      }),
    ).toEqual({ escribir: true })
    expect(
      decidirCambioDeActivo({
        rol: "maestro",
        activoActual: false,
        activoPedido: true,
        clasesAsignadas: 2,
      }),
    ).toEqual({ escribir: true })
  })

  it("ADM-1E01: mismo estado → sin escribir (también la baja repetida de un maestro que ya tiene clases)", () => {
    for (const rol of ["estudiante", "maestro"] as const) {
      for (const activo of [true, false]) {
        expect(
          decidirCambioDeActivo({
            rol,
            activoActual: activo,
            activoPedido: activo,
            clasesAsignadas: 0,
          }),
        ).toEqual({ escribir: false })
      }
    }
    expect(
      decidirCambioDeActivo({
        rol: "maestro",
        activoActual: false,
        activoPedido: false,
        clasesAsignadas: 2,
      }),
    ).toEqual({ escribir: false })
  })
})
