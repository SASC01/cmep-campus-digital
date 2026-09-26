import { describe, expect, it } from "vitest"

import { ApiError } from "@/services/apiClient"

import { mensajeDeErrorAdmin } from "./lib"

describe("mensajeDeErrorAdmin", () => {
  it("traduce por código y usa un mensaje genérico para lo que no reconoce", () => {
    expect(mensajeDeErrorAdmin(new ApiError("CORREO_EN_USO", "x", 409))).toBe(
      "Ya existe una cuenta con ese correo.",
    )
    expect(mensajeDeErrorAdmin(new ApiError("ERROR_INTERNO", "detalle", 500))).toBe(
      "No pudimos completar la operación. Inténtalo de nuevo.",
    )
  })

  it("con un error que no es ApiError devuelve el mensaje genérico", () => {
    expect(mensajeDeErrorAdmin(new Error("no es ApiError"))).toBe(
      "No pudimos completar la operación. Inténtalo de nuevo.",
    )
  })
})
