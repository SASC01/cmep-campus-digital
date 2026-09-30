import { describe, expect, it } from "vitest"

import { siguientePasoInicio, textoConteoAlumnos, titularInicio, varianteDeClase } from "./lib"

describe("varianteDeClase", () => {
  it("PR-A17a: es determinista y, con 30 ids aleatorios, usa las tres variantes", () => {
    const ids = Array.from({ length: 30 }, () => crypto.randomUUID())
    const variantes = new Set(ids.map((id) => varianteDeClase(id)))

    for (const id of ids) {
      expect(varianteDeClase(id)).toBe(varianteDeClase(id))
    }
    expect(variantes).toEqual(new Set(["verde", "azul", "blanca"]))
  })
})

describe("titularInicio y siguientePasoInicio", () => {
  it("PR-A17b: en 0, 1 y N, por rol", () => {
    expect(titularInicio("estudiante", 0)).toBe("Aún no estás en ninguna clase")
    expect(titularInicio("estudiante", 1)).toBe("Estás en 1 clase")
    expect(titularInicio("estudiante", 4)).toBe("Estás en 4 clases")
    expect(titularInicio("maestro", 0)).toBe("Aún no tienes clases")
    expect(titularInicio("maestro", 1)).toBe("Tienes 1 clase")
    expect(titularInicio("maestro", 4)).toBe("Tienes 4 clases")

    expect(siguientePasoInicio("estudiante", 0)).toMatch(/código de su clase/)
    expect(siguientePasoInicio("estudiante", 1)).toMatch(/próximas entregas/)
    expect(siguientePasoInicio("maestro", 0)).toMatch(/Crea tu primera clase/)
    expect(siguientePasoInicio("maestro", 1)).toMatch(/Comparte el código/)
  })
})

describe("textoConteoAlumnos", () => {
  it("PR-A17c: en 0, 1 y N", () => {
    expect(textoConteoAlumnos(0)).toBe("Sin alumnos")
    expect(textoConteoAlumnos(1)).toBe("1 alumno")
    expect(textoConteoAlumnos(5)).toBe("5 alumnos")
  })
})
