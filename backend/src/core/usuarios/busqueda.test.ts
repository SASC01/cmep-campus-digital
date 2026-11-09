import { describe, expect, it } from "vitest"

import { AppError } from "../errores.js"
import { errorBusquedaMuyCorta, prepararBusquedaDeUsuarios } from "./busqueda.js"

describe("prepararBusquedaDeUsuarios (ADM-1E01)", () => {
  it("ADM-1E01: quita acentos, pasa a minúsculas y junta espacios en el nombre; el correo, recortado y en minúsculas", () => {
    expect(prepararBusquedaDeUsuarios("  JOSÉ   Peña ")).toEqual({
      nombre: "jose pena",
      email: "josé   peña",
    })
    expect(prepararBusquedaDeUsuarios("Ana.Lopez+Tareas@Ejemplo.MX")).toEqual({
      nombre: "ana.lopez+tareas@ejemplo.mx",
      email: "ana.lopez+tareas@ejemplo.mx",
    })
  })

  it("ADM-1E01: menos de 3 caracteres normalizados → null (también con espacios o acentos de sobra)", () => {
    for (const q of ["", "ab", "  ab  ", "áb", "   "]) {
      expect(prepararBusquedaDeUsuarios(q), JSON.stringify(q)).toBeNull()
    }
    expect(prepararBusquedaDeUsuarios("abc")).toEqual({ nombre: "abc", email: "abc" })
  })

  it("ADM-1E01: escapa %, _ y \\ en el nombre y en el correo", () => {
    expect(prepararBusquedaDeUsuarios("50%_a\\b")).toEqual({
      nombre: "50\\%\\_a\\\\b",
      email: "50\\%\\_a\\\\b",
    })
    expect(prepararBusquedaDeUsuarios("%%%")).toEqual({ nombre: "\\%\\%\\%", email: "\\%\\%\\%" })
    expect(prepararBusquedaDeUsuarios("ana_lopez@x.mx")?.email).toBe("ana\\_lopez@x.mx")
  })

  it("ADM-1E01: errorBusquedaMuyCorta → 400 BUSQUEDA_MUY_CORTA con su texto", () => {
    const error = errorBusquedaMuyCorta()
    expect(error).toBeInstanceOf(AppError)
    expect(error.codigo).toBe("BUSQUEDA_MUY_CORTA")
    expect(error.estado).toBe(400)
    expect(error.message).toBe("Escribe al menos 3 letras para buscar.")
  })
})
