import { describe, expect, it } from "vitest"

import { AppError } from "../errores.js"
import { decidirBorrado, partirEnLotes } from "./borrado.js"

const ARCHIVADA = new Date("2026-10-01T10:00:00.000Z")

const esperarError = (
  error: AppError | null,
  esperado: { codigo: string; mensaje: string },
): void => {
  expect(error, `Se esperaba el 409 ${esperado.codigo}`).toBeInstanceOf(AppError)
  expect(error?.codigo).toBe(esperado.codigo)
  expect(error?.estado).toBe(409)
  expect(error?.message).toBe(esperado.mensaje)
}

const NO_ARCHIVADA = {
  codigo: "CLASE_NO_ARCHIVADA",
  mensaje: "Solo se borra una clase archivada. Archívala primero.",
}
const CON_COPIAS = {
  codigo: "CLASE_CON_COPIAS_EN_CURSO",
  mensaje: "Esta clase tiene archivos que todavía se están copiando. Inténtalo en unos minutos.",
}
const SIN_CONFIRMAR = {
  codigo: "CONFIRMACION_REQUERIDA",
  mensaje: "Confirma el borrado definitivo de la clase.",
}

describe("decidirBorrado (ADM-1B01)", () => {
  it("ADM-1B01: una activa → 409 CLASE_NO_ARCHIVADA, con o sin copias y con o sin confirmar", () => {
    for (const hayCopiasEnCurso of [false, true]) {
      for (const confirmado of [false, true]) {
        esperarError(
          decidirBorrado({ archivadaEn: null, hayCopiasEnCurso, confirmado }),
          NO_ARCHIVADA,
        )
      }
    }
  })

  it("ADM-1B01: una archivada con copias en curso → 409 CLASE_CON_COPIAS_EN_CURSO, con o sin confirmar", () => {
    for (const confirmado of [false, true]) {
      esperarError(
        decidirBorrado({ archivadaEn: ARCHIVADA, hayCopiasEnCurso: true, confirmado }),
        CON_COPIAS,
      )
    }
  })

  it("ADM-1B01: una archivada sin copias y sin confirmar → 409 CONFIRMACION_REQUERIDA; confirmada → null", () => {
    esperarError(
      decidirBorrado({ archivadaEn: ARCHIVADA, hayCopiasEnCurso: false, confirmado: false }),
      SIN_CONFIRMAR,
    )
    expect(
      decidirBorrado({ archivadaEn: ARCHIVADA, hayCopiasEnCurso: false, confirmado: true }),
    ).toBeNull()
  })
})

describe("partirEnLotes (ADM-1B01)", () => {
  it("ADM-1B01: vacío → ningún lote; exacto → uno; uno de más → dos; 2 001 claves en lotes de 1000 → tres, en orden", () => {
    expect(partirEnLotes([], 1000)).toEqual([])
    expect(partirEnLotes([1, 2, 3], 3)).toEqual([[1, 2, 3]])
    expect(partirEnLotes([1, 2, 3, 4], 3)).toEqual([[1, 2, 3], [4]])

    const claves = Array.from({ length: 2001 }, (_, i) => `materiales/c/${String(i)}`)
    const lotes = partirEnLotes(claves, 1000)
    expect(lotes.map((lote) => lote.length)).toEqual([1000, 1000, 1])
    expect(lotes.flat()).toEqual(claves)
  })

  it("ADM-1B01: un tamaño que no es un entero positivo lanza", () => {
    for (const tamano of [0, -1, 1.5]) {
      expect(() => partirEnLotes([1], tamano)).toThrow(AppError)
    }
  })
})
