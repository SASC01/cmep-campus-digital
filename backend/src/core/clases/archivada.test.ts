import { describe, expect, it } from "vitest"

import { AppError } from "../errores.js"
import {
  errorAlArchivar,
  errorAlRestaurar,
  errorClaseArchivada,
  errorClaseNoArchivada,
  errorClaseYaArchivada,
  evaluarClaseArchivada,
  type PoliticaDeClaseArchivada,
} from "./archivada.js"
import type { RelacionConClase } from "./pertenencia.js"

const RELACIONES: readonly RelacionConClase[] = ["estudiante", "maestro", "admin"]
const POLITICAS: readonly (PoliticaDeClaseArchivada | undefined)[] = [
  undefined,
  "lectura",
  "lectura-del-alumno",
  "gestion",
]
const MENSAJE_ARCHIVADA = "Esta clase está archivada: solo se puede consultar."

const esperarArchivada = (error: AppError | null): void => {
  expect(error, "Se esperaba el 409 CLASE_ARCHIVADA").toBeInstanceOf(AppError)
  expect(error?.codigo).toBe("CLASE_ARCHIVADA")
  expect(error?.estado).toBe(409)
  expect(error?.message).toBe(MENSAJE_ARCHIVADA)
}

describe("evaluarClaseArchivada (ADM-1A01)", () => {
  it("ADM-1A01: clase activa → null con las tres relaciones y las cuatro políticas", () => {
    const resultados = RELACIONES.flatMap((relacion) =>
      POLITICAS.map((politica) => evaluarClaseArchivada(relacion, false, politica)),
    )
    expect(resultados).toHaveLength(12)
    expect(resultados.every((resultado) => resultado === null)).toBe(true)
  })

  it("ADM-1A01: archivada sin política → 409 CLASE_ARCHIVADA para las tres relaciones", () => {
    for (const relacion of RELACIONES) {
      esperarArchivada(evaluarClaseArchivada(relacion, true, undefined))
    }
  })

  it("ADM-1A01: archivada con 'lectura' → estudiante 409; maestro y admin null", () => {
    esperarArchivada(evaluarClaseArchivada("estudiante", true, "lectura"))
    expect(evaluarClaseArchivada("maestro", true, "lectura")).toBeNull()
    expect(evaluarClaseArchivada("admin", true, "lectura")).toBeNull()
  })

  it("ADM-1A01: archivada con 'lectura-del-alumno' o 'gestion' → null para las tres relaciones", () => {
    for (const relacion of RELACIONES) {
      expect(evaluarClaseArchivada(relacion, true, "lectura-del-alumno")).toBeNull()
      expect(evaluarClaseArchivada(relacion, true, "gestion")).toBeNull()
    }
  })

  it("ADM-1A01: errorClaseArchivada da el código, el estado y el texto exactos", () => {
    esperarArchivada(errorClaseArchivada())
  })
})

describe("errorAlArchivar y errorAlRestaurar (ADM-1A02)", () => {
  it("ADM-1A02: archivar una activa → null; una archivada → 409 CLASE_YA_ARCHIVADA", () => {
    expect(errorAlArchivar(null)).toBeNull()
    const error = errorAlArchivar(new Date("2026-11-04T10:00:00.000Z"))
    expect(error).toBeInstanceOf(AppError)
    expect(error?.codigo).toBe("CLASE_YA_ARCHIVADA")
    expect(error?.estado).toBe(409)
    expect(error?.message).toBe("Esta clase ya está archivada.")
  })

  it("ADM-1A02: restaurar una archivada → null; una activa → 409 CLASE_NO_ARCHIVADA", () => {
    expect(errorAlRestaurar(new Date("2026-11-04T10:00:00.000Z"))).toBeNull()
    const error = errorAlRestaurar(null)
    expect(error).toBeInstanceOf(AppError)
    expect(error?.codigo).toBe("CLASE_NO_ARCHIVADA")
    expect(error?.estado).toBe(409)
    expect(error?.message).toBe("Esta clase no está archivada.")
  })
})

describe("errorClaseYaArchivada y errorClaseNoArchivada (M-28)", () => {
  it("M-28: los 409 que lanza el adaptador son los mismos que deciden errorAlArchivar y errorAlRestaurar", () => {
    const yaArchivada = errorClaseYaArchivada()
    expect(yaArchivada).toBeInstanceOf(AppError)
    expect(yaArchivada.codigo).toBe("CLASE_YA_ARCHIVADA")
    expect(yaArchivada.estado).toBe(409)
    expect(yaArchivada.message).toBe("Esta clase ya está archivada.")
    expect(errorAlArchivar(new Date("2026-11-04T10:00:00.000Z"))).toEqual(yaArchivada)

    const noArchivada = errorClaseNoArchivada()
    expect(noArchivada).toBeInstanceOf(AppError)
    expect(noArchivada.codigo).toBe("CLASE_NO_ARCHIVADA")
    expect(noArchivada.estado).toBe(409)
    expect(noArchivada.message).toBe("Esta clase no está archivada.")
    expect(errorAlRestaurar(null)).toEqual(noArchivada)
  })
})
