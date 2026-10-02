import { ApiError } from "@/services/apiClient"
import { describe, expect, it } from "vitest"

import {
  focoPerdido,
  mensajeDeErrorDeLista,
  siguientePasoInicio,
  terminoDeBusquedaMuyLargo,
  terminoDeBusquedaValido,
  textoConteoAlumnos,
  titularInicio,
  varianteDeClase,
  vecinaDeFila,
} from "./lib"

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

describe("terminoDeBusquedaValido", () => {
  it("PR-B09: con espacios, acentos y 3 caracteres", () => {
    expect(terminoDeBusquedaValido("")).toBe(false)
    expect(terminoDeBusquedaValido("   ")).toBe(false)
    expect(terminoDeBusquedaValido("ab")).toBe(false)
    expect(terminoDeBusquedaValido("  ab  ")).toBe(false)
    expect(terminoDeBusquedaValido("a   ")).toBe(false)
    expect(terminoDeBusquedaValido("ÁÉ")).toBe(false)
    expect(terminoDeBusquedaValido("abc")).toBe(true)
    expect(terminoDeBusquedaValido("  abc  ")).toBe(true)
    expect(terminoDeBusquedaValido("ÁÉÍ")).toBe(true)
    expect(terminoDeBusquedaValido("José")).toBe(true)
    // Igual que el servidor (prepararTerminoDeBusqueda): "a b" normaliza a 3 caracteres.
    expect(terminoDeBusquedaValido("a  b")).toBe(true)
  })
})

describe("terminoDeBusquedaMuyLargo", () => {
  it("T-24 (ronda 2): decide con el criterio del servidor: más de 120 normalizados (41 sílabas hangul) o más de 1000 en crudo es muy largo y no es válido", () => {
    expect(terminoDeBusquedaMuyLargo("각".repeat(41))).toBe(true)
    expect(terminoDeBusquedaValido("각".repeat(41))).toBe(false)
    expect(terminoDeBusquedaMuyLargo("각".repeat(40))).toBe(false)
    expect(terminoDeBusquedaValido("각".repeat(40))).toBe(true)
    expect(terminoDeBusquedaMuyLargo("a".repeat(121))).toBe(true)
    expect(terminoDeBusquedaMuyLargo(`abc${" ".repeat(1200)}`)).toBe(true)
    expect(terminoDeBusquedaMuyLargo(`abc${" ".repeat(118)}`)).toBe(false)
    expect(terminoDeBusquedaValido(`abc${" ".repeat(118)}`)).toBe(true)
  })
})

describe("focoPerdido", () => {
  it("PR-C13c: con un documento doble, un activeElement nulo, igual a body o desconectado da true; un elemento conectado, false", () => {
    const body = document.createElement("body")
    const conectado = document.createElement("button")
    document.body.append(conectado)
    const desconectado = document.createElement("button")

    expect(focoPerdido({ activeElement: null, body })).toBe(true)
    expect(focoPerdido({ activeElement: body, body })).toBe(true)
    expect(focoPerdido({ activeElement: desconectado, body })).toBe(true)
    expect(focoPerdido({ activeElement: conectado, body })).toBe(false)
    conectado.remove()
  })
})

describe("vecinaDeFila", () => {
  it("la fila que ocupa el lugar de la que salió es la siguiente o, si era la última, la anterior; sin filas no hay vecina", () => {
    expect(vecinaDeFila(["a", "b", "c"], ["a", "c"], "b")).toBe("c")
    expect(vecinaDeFila(["a", "b", "c"], ["a", "b"], "c")).toBe("b")
    expect(vecinaDeFila(["a"], [], "a")).toBeUndefined()
    expect(vecinaDeFila(undefined, ["x", "y"], "z")).toBe("x")
  })
})

describe("mensajeDeErrorDeLista", () => {
  it("PR-C17: un VALIDACION del campo cursor da el texto dado; cualquier otro error sigue el camino de siempre", () => {
    const texto = "El muro cambió mientras lo veías."
    expect(
      mensajeDeErrorDeLista(new ApiError("VALIDACION", "cursor: no es válido", 400), texto),
    ).toBe(texto)
    expect(
      mensajeDeErrorDeLista(new ApiError("VALIDACION", "limite: debe ser un número", 400), texto),
    ).toBe("debe ser un número")
    expect(mensajeDeErrorDeLista(new ApiError("PUBLICACION_NO_ENCONTRADA", "x", 404), texto)).toBe(
      "Esa publicación ya no existe.",
    )
    expect(mensajeDeErrorDeLista(new Error("red"), texto)).not.toBe(texto)
  })
})
