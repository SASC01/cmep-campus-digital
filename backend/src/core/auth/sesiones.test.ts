import { describe, expect, it } from "vitest"

import {
  calcularExpiracionSesion,
  decidirRefresco,
  DURACION_SESION_MS,
  DURACION_TOKEN_ACCESO_S,
} from "./sesiones.js"

const ahora = new Date("2026-09-23T12:00:00.000Z")
const enUnaHora = new Date(ahora.getTime() + 3_600_000)
const haceUnaHora = new Date(ahora.getTime() - 3_600_000)

describe("decidirRefresco", () => {
  it("rota una sesión viva, sin revocar y sin reemplazo", () => {
    expect(
      decidirRefresco({
        sesion: { expiraEn: enUnaHora, revocadaEn: null, reemplazadaPor: null },
        ahora,
      }),
    ).toEqual({ tipo: "rotar" })
  })

  it("detecta reutilización cuando la sesión ya fue reemplazada", () => {
    expect(
      decidirRefresco({
        sesion: { expiraEn: enUnaHora, revocadaEn: haceUnaHora, reemplazadaPor: "nueva" },
        ahora,
      }),
    ).toEqual({ tipo: "reutilizacion" })
  })

  it("detecta reutilización aunque la sesión reemplazada además esté vencida", () => {
    expect(
      decidirRefresco({
        sesion: { expiraEn: haceUnaHora, revocadaEn: haceUnaHora, reemplazadaPor: "nueva" },
        ahora,
      }),
    ).toEqual({ tipo: "reutilizacion" })
  })

  it("rechaza por revocada una sesión cerrada sin reemplazo (logout)", () => {
    expect(
      decidirRefresco({
        sesion: { expiraEn: enUnaHora, revocadaEn: haceUnaHora, reemplazadaPor: null },
        ahora,
      }),
    ).toEqual({ tipo: "rechazar", motivo: "revocada" })
  })

  it("rechaza por vencida una sesión cuya expiración ya pasó", () => {
    expect(
      decidirRefresco({
        sesion: { expiraEn: haceUnaHora, revocadaEn: null, reemplazadaPor: null },
        ahora,
      }),
    ).toEqual({ tipo: "rechazar", motivo: "vencida" })
  })

  it("trata expiraEn === ahora como vencida", () => {
    expect(
      decidirRefresco({
        sesion: { expiraEn: new Date(ahora.getTime()), revocadaEn: null, reemplazadaPor: null },
        ahora,
      }),
    ).toEqual({ tipo: "rechazar", motivo: "vencida" })
  })
})

describe("constantes de sesión", () => {
  it("calcularExpiracionSesion devuelve ahora + 30 días", () => {
    expect(calcularExpiracionSesion(ahora).toISOString()).toBe("2026-10-23T12:00:00.000Z")
    expect(DURACION_SESION_MS).toBe(30 * 24 * 60 * 60 * 1000)
  })

  it("el token de acceso dura 15 minutos (900 s)", () => {
    expect(DURACION_TOKEN_ACCESO_S).toBe(900)
  })
})
