import { saludRespuestaSchema } from "@campus/shared"
import { describe, expect, it } from "vitest"

import { AppError } from "./errores.js"
import { evaluarSalud } from "./salud.js"

describe("evaluarSalud", () => {
  const ahora = new Date("2026-09-21T15:04:05.000Z")

  it("devuelve ok con la marca de tiempo recibida cuando la base responde", () => {
    const salud = evaluarSalud({ baseDeDatos: true, ahora })

    expect(salud.estado).toBe("ok")
    expect(salud.baseDeDatos).toBe("ok")
    expect(salud.marcaDeTiempo).toBe(ahora.toISOString())
  })

  it("produce un objeto válido según saludRespuestaSchema", () => {
    const salud = evaluarSalud({ baseDeDatos: true, ahora })

    expect(saludRespuestaSchema.safeParse(salud).success).toBe(true)
  })

  it("lanza AppError 503 BASE_DE_DATOS_NO_DISPONIBLE cuando la base no responde", () => {
    let capturado: unknown

    try {
      evaluarSalud({ baseDeDatos: false, ahora })
    } catch (error) {
      capturado = error
    }

    expect(capturado).toBeInstanceOf(AppError)
    const error = capturado as AppError
    expect(error.estado).toBe(503)
    expect(error.codigo).toBe("BASE_DE_DATOS_NO_DISPONIBLE")
    expect(error.message).toBe("La base de datos no responde.")
  })
})
