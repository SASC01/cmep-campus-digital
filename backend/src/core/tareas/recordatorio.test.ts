import { describe, expect, it } from "vitest"

import { momentoDelRecordatorio, planDeRecordatorio } from "./recordatorio.js"

const AHORA = new Date("2026-10-06T12:00:00.000Z")
const HORA_MS = 60 * 60 * 1000
const despues = (ms: number): Date => new Date(AHORA.getTime() + ms)

describe("momentoDelRecordatorio", () => {
  it("PR-1B01: con la fecha 3 días después, el momento es fecha − 24 h exacta (milisegundos)", () => {
    const fecha = new Date("2026-10-09T12:00:00.123Z")
    expect(momentoDelRecordatorio(fecha, AHORA)?.toISOString()).toBe("2026-10-08T12:00:00.123Z")
  })

  it("PR-1B01: a 24 h exactas, null (el momento sería ahora)", () => {
    expect(momentoDelRecordatorio(despues(24 * HORA_MS), AHORA)).toBeNull()
  })

  it("PR-1B01: a 24 h y 1 ms, el momento es 1 ms después de ahora", () => {
    expect(momentoDelRecordatorio(despues(24 * HORA_MS + 1), AHORA)?.getTime()).toBe(
      AHORA.getTime() + 1,
    )
  })

  it("PR-1B01: a 23 h, null", () => {
    expect(momentoDelRecordatorio(despues(23 * HORA_MS), AHORA)).toBeNull()
  })

  it("PR-1B01: con la fecha pasada, null", () => {
    expect(momentoDelRecordatorio(despues(-HORA_MS), AHORA)).toBeNull()
  })
})

describe("planDeRecordatorio", () => {
  const TRABAJO = "11111111-1111-4111-8111-111111111111"
  const lejos = despues(5 * 24 * HORA_MS)

  it("PR-1B02: la misma fecha, con o sin trabajo, no hace nada", () => {
    for (const trabajoActual of [TRABAJO, null]) {
      expect(
        planDeRecordatorio({
          fechaAnterior: lejos,
          fechaNueva: new Date(lejos.getTime()),
          trabajoActual,
          ahora: AHORA,
        }),
      ).toEqual({ cancelar: null, programarEn: null })
    }
  })

  it("PR-1B02: una fecha nueva con trabajo cancela el actual y programa el nuevo", () => {
    const nueva = despues(7 * 24 * HORA_MS)
    expect(
      planDeRecordatorio({
        fechaAnterior: lejos,
        fechaNueva: nueva,
        trabajoActual: TRABAJO,
        ahora: AHORA,
      }),
    ).toEqual({ cancelar: TRABAJO, programarEn: new Date(nueva.getTime() - 24 * HORA_MS) })
  })

  it("PR-1B02: una fecha nueva cuyo momento ya pasó solo cancela", () => {
    expect(
      planDeRecordatorio({
        fechaAnterior: lejos,
        fechaNueva: despues(10 * HORA_MS),
        trabajoActual: TRABAJO,
        ahora: AHORA,
      }),
    ).toEqual({ cancelar: TRABAJO, programarEn: null })
  })

  it("PR-1B02: sin trabajo y con una fecha nueva futura, solo programa", () => {
    const nueva = despues(3 * 24 * HORA_MS)
    expect(
      planDeRecordatorio({
        fechaAnterior: despues(10 * HORA_MS),
        fechaNueva: nueva,
        trabajoActual: null,
        ahora: AHORA,
      }),
    ).toEqual({ cancelar: null, programarEn: new Date(nueva.getTime() - 24 * HORA_MS) })
  })

  it("PR-1B02: borrar (fecha nueva null) cancela el trabajo si hay y no hace nada si no", () => {
    expect(
      planDeRecordatorio({
        fechaAnterior: lejos,
        fechaNueva: null,
        trabajoActual: TRABAJO,
        ahora: AHORA,
      }),
    ).toEqual({ cancelar: TRABAJO, programarEn: null })
    expect(
      planDeRecordatorio({
        fechaAnterior: lejos,
        fechaNueva: null,
        trabajoActual: null,
        ahora: AHORA,
      }),
    ).toEqual({ cancelar: null, programarEn: null })
  })

  it("PR-1B02: una fecha que difiere por 1 ms cuenta como otra fecha", () => {
    expect(
      planDeRecordatorio({
        fechaAnterior: lejos,
        fechaNueva: new Date(lejos.getTime() + 1),
        trabajoActual: TRABAJO,
        ahora: AHORA,
      }).cancelar,
    ).toBe(TRABAJO)
  })
})
