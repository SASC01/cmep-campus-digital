import { describe, expect, it } from "vitest"

import {
  TEXTO_FECHA_NO_DISPONIBLE,
  UMBRAL_FECHA_PROXIMA_MS,
  varianteDeVencimiento,
  vencimientoDe,
} from "./vencimiento"

// Todo se arma con fechas locales (new Date(año, mes, día, hora, minuto)): las pruebas dan lo mismo
// en cualquier zona horaria. El 6 de octubre de 2026 es martes.
const local = (dia: number, hora: number, minuto = 0, mes = 9): Date =>
  new Date(2026, mes, dia, hora, minuto, 0, 0)
const AHORA = local(6, 12)
const MINUTO = 60_000
const iso = (fecha: Date): string => fecha.toISOString()
const despues = (ms: number): string => iso(new Date(AHORA.getTime() + ms))

describe("vencimientoDe: el umbral de 72 horas (S-10)", () => {
  it("PR-1D01: el umbral vale 72 horas", () => {
    expect(UMBRAL_FECHA_PROXIMA_MS).toBe(72 * 60 * MINUTO)
  })

  it("PR-1D01: a 71 h 59 min es próxima y a 72 h exactas también", () => {
    expect(vencimientoDe(despues(71 * 60 * MINUTO + 59 * MINUTO), AHORA).estado).toBe("proxima")
    expect(vencimientoDe(despues(UMBRAL_FECHA_PROXIMA_MS), AHORA).estado).toBe("proxima")
  })

  it("PR-1D01: a 72 h 1 min es pendiente", () => {
    expect(vencimientoDe(despues(UMBRAL_FECHA_PROXIMA_MS + MINUTO), AHORA).estado).toBe("pendiente")
  })

  it("PR-1D01: mucho después es pendiente y con la fecha en palabras", () => {
    expect(vencimientoDe(iso(local(11, 18)), AHORA)).toEqual({
      estado: "pendiente",
      texto: "Vence el domingo 11 de octubre",
    })
  })
})

describe("vencimientoDe: los textos de S-10", () => {
  it('PR-1D01: "Vence hoy a las …" con la hora local de 24 h', () => {
    expect(vencimientoDe(iso(local(6, 18, 30)), AHORA)).toEqual({
      estado: "proxima",
      texto: "Vence hoy a las 18:30",
    })
    expect(vencimientoDe(iso(local(6, 23, 59)), AHORA).texto).toBe("Vence hoy a las 23:59")
  })

  it('PR-1D01: "Vence mañana a las …"', () => {
    expect(vencimientoDe(iso(local(7, 9, 5)), AHORA)).toEqual({
      estado: "proxima",
      texto: "Vence mañana a las 09:05",
    })
  })

  it('PR-1D01: "Vence en 2 días" y "Vence en 3 días" (días de calendario)', () => {
    expect(vencimientoDe(iso(local(8, 12)), AHORA).texto).toBe("Vence en 2 días")
    expect(vencimientoDe(iso(local(9, 12)), AHORA)).toEqual({
      estado: "proxima",
      texto: "Vence en 3 días",
    })
  })

  it('PR-1D01: con 4 días o más, "Vence el <día de la semana> <d> de <mes>"', () => {
    expect(vencimientoDe(iso(local(10, 12)), AHORA).texto).toBe("Vence el sábado 10 de octubre")
  })

  it("PR-1D01: una fecha pasada es vencida y dice «Venció el …»; la fecha exacta de ahora también", () => {
    expect(vencimientoDe(despues(-MINUTO), AHORA)).toEqual({
      estado: "vencida",
      texto: "Venció el martes 6 de octubre",
    })
    expect(vencimientoDe(iso(AHORA), AHORA).estado).toBe("vencida")
    expect(vencimientoDe(iso(local(1, 8)), AHORA).texto).toBe("Venció el jueves 1 de octubre")
  })
})

describe("vencimientoDe: medianoche local y fechas inválidas", () => {
  it("PR-1D01: pasada la medianoche local, 45 minutos después es «mañana», no «hoy»", () => {
    const ahora = local(6, 23, 30)
    expect(vencimientoDe(iso(local(7, 0, 15)), ahora)).toEqual({
      estado: "proxima",
      texto: "Vence mañana a las 00:15",
    })
  })

  it("PR-1D01: justo después de la medianoche, el final del mismo día sigue siendo «hoy»", () => {
    const ahora = local(6, 0, 10)
    expect(vencimientoDe(iso(local(6, 23, 59)), ahora).texto).toBe("Vence hoy a las 23:59")
  })

  it("PR-1D01: el cambio de mes cuenta días de calendario", () => {
    const ahora = local(30, 20, 0, 8)
    expect(vencimientoDe(iso(local(1, 8, 0, 9)), ahora).texto).toBe("Vence mañana a las 08:00")
    expect(vencimientoDe(iso(local(2, 8, 0, 9)), ahora).texto).toBe("Vence en 2 días")
  })

  it("PR-1D01: una fecha inválida da un valor explícito, no el texto recibido ni «Invalid Date»", () => {
    for (const texto of ["", "mañana", "2030-13-45T99:00:00Z", "no es una fecha"]) {
      const resultado = vencimientoDe(texto, AHORA)
      expect(resultado, texto).toEqual({ estado: "pendiente", texto: TEXTO_FECHA_NO_DISPONIBLE })
      expect(resultado.texto).not.toContain(texto === "" ? "Invalid" : texto)
      expect(resultado.texto).not.toMatch(/Invalid|NaN/)
    }
  })
})

describe("PR-1D01: variante de la insignia", () => {
  it("PR-1D01: solo la fecha próxima usa la variante warning", () => {
    expect(varianteDeVencimiento("proxima")).toBe("warning")
    expect(varianteDeVencimiento("pendiente")).toBe("muted")
    expect(varianteDeVencimiento("vencida")).toBe("muted")
  })
})
