import { describe, expect, it } from "vitest"
import { z } from "zod"

import { validarCuerpo } from "./validacion.js"

const esquema = z.object({ nombre: z.string() })

const rechazo = (cuerpo: unknown): unknown => {
  try {
    validarCuerpo(esquema, cuerpo)
  } catch (error) {
    return error
  }
  throw new Error("Se esperaba un rechazo")
}

describe("validarCuerpo", () => {
  it("T-01: un arreglo ([], ['x'] o [{}]) responde 400 VALIDACION con «cuerpo: debe ser un objeto JSON»", () => {
    for (const cuerpo of [[], ["x"], [{}]]) {
      expect(rechazo(cuerpo)).toMatchObject({
        codigo: "VALIDACION",
        estado: 400,
        message: "cuerpo: debe ser un objeto JSON",
      })
    }
  })

  it("T-01: null y un valor que no es objeto siguen rechazándose igual, y un objeto válido pasa", () => {
    for (const cuerpo of [null, undefined, "texto", 5]) {
      expect(rechazo(cuerpo)).toMatchObject({ message: "cuerpo: debe ser un objeto JSON" })
    }
    expect(validarCuerpo(esquema, { nombre: "a" })).toEqual({ nombre: "a" })
  })
})
