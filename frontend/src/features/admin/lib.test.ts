import { describe, expect, it } from "vitest"

import { ApiError } from "@/services/apiClient"

import { focoDisponiblePara, mensajeDeErrorAdmin } from "./lib"

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

describe("focoDisponiblePara", () => {
  const cuerpo = document.createElement("body")
  const contenedor = document.createElement("div")
  const dentro = document.createElement("button")
  const fuera = document.createElement("button")
  contenedor.appendChild(dentro)

  it("nulo: nadie tiene el foco, está disponible", () => {
    expect(focoDisponiblePara(contenedor, null, cuerpo)).toBe(true)
  })

  it("<body>: nadie lo tiene de verdad, está disponible", () => {
    expect(focoDisponiblePara(contenedor, cuerpo, cuerpo)).toBe(true)
  })

  it("dentro del contenedor: está disponible", () => {
    expect(focoDisponiblePara(contenedor, dentro, cuerpo)).toBe(true)
  })

  it("fuera del contenedor: no está disponible", () => {
    expect(focoDisponiblePara(contenedor, fuera, cuerpo)).toBe(false)
  })
})
