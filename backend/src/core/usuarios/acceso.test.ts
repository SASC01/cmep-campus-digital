import { describe, expect, it } from "vitest"

import { AppError } from "../errores.js"
import { decidirCambioDeAcceso } from "./acceso.js"

describe("decidirCambioDeAcceso (ADM-1E01)", () => {
  it("ADM-1E01: un maestro o el admin → 409 NO_ES_ALUMNO, al restringir y al restablecer", () => {
    for (const rol of ["maestro", "admin"] as const) {
      for (const restringido of [true, false]) {
        const resultado = decidirCambioDeAcceso({
          rol,
          restringidoActual: false,
          motivoActual: null,
          pedido: { restringido },
        })
        expect(resultado, "Se esperaba el 409 NO_ES_ALUMNO").toBeInstanceOf(AppError)
        const error = resultado as AppError
        expect(error.codigo).toBe("NO_ES_ALUMNO")
        expect(error.estado).toBe(409)
        expect(error.message).toBe("Solo se restringe el acceso de un alumno.")
      }
    }
  })

  it("ADM-1E01: restringir a un alumno con acceso → escribe y revoca sus sesiones, con motivo o sin él", () => {
    for (const motivo of ["Adeudo", undefined]) {
      expect(
        decidirCambioDeAcceso({
          rol: "estudiante",
          restringidoActual: false,
          motivoActual: null,
          pedido: { restringido: true, motivo },
        }),
      ).toEqual({ escribir: true, revocarSesiones: true })
    }
  })

  it("ADM-1E01: restablecer a un alumno restringido → escribe y no revoca", () => {
    expect(
      decidirCambioDeAcceso({
        rol: "estudiante",
        restringidoActual: true,
        motivoActual: "Adeudo",
        pedido: { restringido: false },
      }),
    ).toEqual({ escribir: true, revocarSesiones: false })
  })

  it("ADM-1E01: mismo estado → sin escribir (restringido con el mismo motivo o sin motivo; con acceso)", () => {
    expect(
      decidirCambioDeAcceso({
        rol: "estudiante",
        restringidoActual: true,
        motivoActual: "Adeudo",
        pedido: { restringido: true, motivo: "Adeudo" },
      }),
    ).toEqual({ escribir: false, revocarSesiones: false })
    expect(
      decidirCambioDeAcceso({
        rol: "estudiante",
        restringidoActual: true,
        motivoActual: null,
        pedido: { restringido: true },
      }),
    ).toEqual({ escribir: false, revocarSesiones: false })
    expect(
      decidirCambioDeAcceso({
        rol: "estudiante",
        restringidoActual: false,
        motivoActual: null,
        pedido: { restringido: false, motivo: "Ignorado" },
      }),
    ).toEqual({ escribir: false, revocarSesiones: false })
  })

  it("ADM-1E01: restringir de nuevo con otro motivo (o quitándolo) → escribe el motivo, sin revocar", () => {
    for (const [motivoActual, motivo] of [
      ["Adeudo", "Otro motivo"],
      ["Adeudo", undefined],
      [null, "Ahora con motivo"],
    ] as const) {
      expect(
        decidirCambioDeAcceso({
          rol: "estudiante",
          restringidoActual: true,
          motivoActual,
          pedido: { restringido: true, motivo },
        }),
      ).toEqual({ escribir: true, revocarSesiones: false })
    }
  })
})
