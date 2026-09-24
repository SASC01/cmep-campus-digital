import { describe, expect, it } from "vitest"

import {
  normalizarCorreo,
  normalizarNombre,
  normalizarParaBusqueda,
  prepararRegistro,
} from "./normalizacion.js"

describe("normalizarCorreo", () => {
  it("quita espacios alrededor y pasa todo a minúsculas", () => {
    expect(normalizarCorreo("  Ana.Lopez@Ejemplo.MX  ")).toBe("ana.lopez@ejemplo.mx")
  })

  it("deja intacto un correo ya normalizado", () => {
    expect(normalizarCorreo("ana@ejemplo.mx")).toBe("ana@ejemplo.mx")
  })
})

describe("normalizarNombre", () => {
  it("quita espacios alrededor y colapsa los interiores", () => {
    expect(normalizarNombre("  José   Ángel \t Núñez ")).toBe("José Ángel Núñez")
  })

  it("conserva mayúsculas y acentos", () => {
    expect(normalizarNombre("María-José")).toBe("María-José")
  })
})

describe("normalizarParaBusqueda", () => {
  it("quita acentos y diéresis, pasa a minúsculas y colapsa espacios", () => {
    expect(normalizarParaBusqueda("José Ángel  Núñez")).toBe("jose angel nunez")
  })

  it("convierte la eñe y las vocales con diéresis en su letra base", () => {
    expect(normalizarParaBusqueda("Ñoño Güero")).toBe("nono guero")
  })

  it("es idempotente", () => {
    const una = normalizarParaBusqueda("  Ángela   Ruíz ")
    expect(normalizarParaBusqueda(una)).toBe(una)
  })
})

describe("prepararRegistro", () => {
  it("normaliza nombre y correo y calcula nombreBusqueda a partir del nombre normalizado", () => {
    expect(
      prepararRegistro({ nombre: "  José Ángel  Núñez ", email: " Jose.Nunez@Ejemplo.MX " }),
    ).toEqual({
      nombre: "José Ángel Núñez",
      email: "jose.nunez@ejemplo.mx",
      nombreBusqueda: "jose angel nunez",
    })
  })
})
