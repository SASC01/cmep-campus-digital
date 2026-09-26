import { describe, expect, it } from "vitest"

import {
  calcularExpiracionToken,
  decidirUsoDeToken,
  estaVivo,
  VIGENCIA_TOKEN_MS,
  type EstadoDeTokenCuenta,
} from "./tokens-cuenta.js"

const ahora = new Date("2026-09-24T12:00:00.000Z")

const tokenBase: EstadoDeTokenCuenta = {
  tipo: "recuperacion",
  expiraEn: new Date(ahora.getTime() + 60_000),
  usadoEn: null,
  revocadoEn: null,
  usuario: { activo: true },
}

describe("VIGENCIA_TOKEN_MS", () => {
  it("recuperación dura 30 minutos", () => {
    expect(VIGENCIA_TOKEN_MS.recuperacion).toBe(30 * 60_000)
  })

  it("invitación dura 72 horas", () => {
    expect(VIGENCIA_TOKEN_MS.invitacion).toBe(72 * 3_600_000)
  })
})

describe("calcularExpiracionToken", () => {
  it("recuperación: 30 minutos después de ahora", () => {
    expect(calcularExpiracionToken("recuperacion", ahora).getTime()).toBe(
      ahora.getTime() + 30 * 60_000,
    )
  })

  it("invitación: 72 horas después de ahora", () => {
    expect(calcularExpiracionToken("invitacion", ahora).getTime()).toBe(
      ahora.getTime() + 72 * 3_600_000,
    )
  })
})

describe("decidirUsoDeToken", () => {
  it("válido cuando está vivo y el tipo coincide", () => {
    expect(decidirUsoDeToken({ token: tokenBase, tipoEsperado: "recuperacion", ahora })).toEqual({
      valido: true,
    })
  })

  it("null → inexistente", () => {
    expect(decidirUsoDeToken({ token: null, tipoEsperado: "recuperacion", ahora })).toEqual({
      valido: false,
      motivo: "inexistente",
    })
  })

  it("tipo equivocado: invitación usada en recuperación", () => {
    const token = { ...tokenBase, tipo: "invitacion" as const }
    expect(decidirUsoDeToken({ token, tipoEsperado: "recuperacion", ahora })).toEqual({
      valido: false,
      motivo: "tipo",
    })
  })

  it("tipo equivocado: recuperación usada en invitación", () => {
    expect(decidirUsoDeToken({ token: tokenBase, tipoEsperado: "invitacion", ahora })).toEqual({
      valido: false,
      motivo: "tipo",
    })
  })

  it("usado → usado", () => {
    const token = { ...tokenBase, usadoEn: ahora }
    expect(decidirUsoDeToken({ token, tipoEsperado: "recuperacion", ahora })).toEqual({
      valido: false,
      motivo: "usado",
    })
  })

  it("revocado → revocado", () => {
    const token = { ...tokenBase, revocadoEn: ahora }
    expect(decidirUsoDeToken({ token, tipoEsperado: "recuperacion", ahora })).toEqual({
      valido: false,
      motivo: "revocado",
    })
  })

  it("expiraEn === ahora → vencido", () => {
    const token = { ...tokenBase, expiraEn: ahora }
    expect(decidirUsoDeToken({ token, tipoEsperado: "recuperacion", ahora })).toEqual({
      valido: false,
      motivo: "vencido",
    })
  })

  it("usuario inactivo → usuario_inactivo", () => {
    const token = { ...tokenBase, usuario: { activo: false } }
    expect(decidirUsoDeToken({ token, tipoEsperado: "recuperacion", ahora })).toEqual({
      valido: false,
      motivo: "usuario_inactivo",
    })
  })
})

describe("estaVivo", () => {
  it("vivo cuando no está usado, ni revocado, y no venció", () => {
    expect(estaVivo(tokenBase, ahora)).toBe(true)
  })

  it("no vivo si venció", () => {
    expect(estaVivo({ ...tokenBase, expiraEn: ahora }, ahora)).toBe(false)
  })
})
