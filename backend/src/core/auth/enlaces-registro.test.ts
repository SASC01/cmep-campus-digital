import { describe, expect, it } from "vitest"

import { calcularExpiracionEnlace, decidirUsoDeEnlace, estadoDeEnlace } from "./enlaces-registro.js"

describe("calcularExpiracionEnlace", () => {
  const ahora = new Date("2026-01-01T00:00:00.000Z")

  it("1 día", () => {
    expect(calcularExpiracionEnlace(1, ahora).toISOString()).toBe("2026-01-02T00:00:00.000Z")
  })

  it("7 días", () => {
    expect(calcularExpiracionEnlace(7, ahora).toISOString()).toBe("2026-01-08T00:00:00.000Z")
  })

  it("30 días", () => {
    expect(calcularExpiracionEnlace(30, ahora).toISOString()).toBe("2026-01-31T00:00:00.000Z")
  })

  it("mantiene la hora UTC exacta", () => {
    const conHora = new Date("2026-03-15T13:45:30.500Z")
    expect(calcularExpiracionEnlace(7, conHora).toISOString()).toBe("2026-03-22T13:45:30.500Z")
  })
})

describe("estadoDeEnlace", () => {
  const ahora = new Date("2026-01-15T00:00:00.000Z")

  it("revocado y vencido a la vez → revocado", () => {
    const enlace = {
      expiraEn: new Date("2026-01-01T00:00:00.000Z"),
      revocadoEn: new Date("2026-01-02T00:00:00.000Z"),
    }
    expect(estadoDeEnlace(enlace, ahora)).toBe("revocado")
  })

  it("expira_en == ahora → vencido", () => {
    const enlace = { expiraEn: ahora, revocadoEn: null }
    expect(estadoDeEnlace(enlace, ahora)).toBe("vencido")
  })

  it("un ms antes de expirar → vigente", () => {
    const enlace = { expiraEn: new Date(ahora.getTime() + 1), revocadoEn: null }
    expect(estadoDeEnlace(enlace, ahora)).toBe("vigente")
  })

  it("vencido sin revocar → vencido", () => {
    const enlace = { expiraEn: new Date(ahora.getTime() - 1), revocadoEn: null }
    expect(estadoDeEnlace(enlace, ahora)).toBe("vencido")
  })
})

describe("decidirUsoDeEnlace", () => {
  const ahora = new Date("2026-01-15T00:00:00.000Z")

  it("null → inválido, inexistente", () => {
    expect(decidirUsoDeEnlace(null, ahora)).toEqual({ valido: false, motivo: "inexistente" })
  })

  it("vencido → inválido, vencido", () => {
    const enlace = { expiraEn: new Date(ahora.getTime() - 1), revocadoEn: null }
    expect(decidirUsoDeEnlace(enlace, ahora)).toEqual({ valido: false, motivo: "vencido" })
  })

  it("revocado → inválido, revocado", () => {
    const enlace = {
      expiraEn: new Date(ahora.getTime() + 1_000_000),
      revocadoEn: new Date(ahora.getTime() - 1),
    }
    expect(decidirUsoDeEnlace(enlace, ahora)).toEqual({ valido: false, motivo: "revocado" })
  })

  it("vigente → válido", () => {
    const enlace = { expiraEn: new Date(ahora.getTime() + 1_000_000), revocadoEn: null }
    expect(decidirUsoDeEnlace(enlace, ahora)).toEqual({ valido: true })
  })
})
