import { describe, expect, it } from "vitest"

import { JWT_SECRET_DE_EJEMPLO, validarEnv, validarEnvAdmin } from "./env.js"

// Ataques del Tester (AUTH-01, ronda 1) contra la validación del entorno (DEC-17, M-11).

const urlDePrueba = "postgresql://usuario:clave-de-prueba@127.0.0.1:5433/base?schema=public"

const enProduccion = (JWT_SECRET: string) =>
  validarEnv({ DATABASE_URL: urlDePrueba, NODE_ENV: "production", JWT_SECRET })

describe("ataque: JWT_SECRET en production", () => {
  it("rechaza 31 caracteres y acepta 32 (frontera exacta)", () => {
    expect(enProduccion("s".repeat(31)).ok).toBe(false)
    expect(enProduccion(`${"s".repeat(16)}${"t".repeat(16)}`).ok).toBe(true)
  })

  it("rechaza el literal de .env.example con espacios alrededor (sigue siendo el secreto público)", () => {
    for (const variante of [
      ` ${JWT_SECRET_DE_EJEMPLO}`,
      `${JWT_SECRET_DE_EJEMPLO} `,
      `${JWT_SECRET_DE_EJEMPLO}\n`,
    ]) {
      const resultado = enProduccion(variante)
      expect(resultado.ok, JSON.stringify(variante.slice(-3))).toBe(false)
    }
  })

  it("rechaza un secreto formado solo por espacios en blanco", () => {
    expect(enProduccion(" ".repeat(32)).ok).toBe(false)
    expect(enProduccion("\t".repeat(40)).ok).toBe(false)
  })

  it("ningún mensaje de error repite el valor recibido", () => {
    const centinela = "centinela-secreta-de-31-caract"
    const resultado = enProduccion(centinela)
    expect(resultado.ok).toBe(false)
    if (resultado.ok) return
    expect(resultado.errores.join("\n")).not.toContain(centinela)
  })
})

describe("ataque: variables ADMIN_*", () => {
  it("ADMIN_EMAIL inválido o ADMIN_PASSWORD de 129 caracteres fallan sin repetir el valor", () => {
    const larga = `P${"x".repeat(127)}Q`
    const resultado = validarEnvAdmin({
      ADMIN_EMAIL: "no-es-correo-centinela",
      ADMIN_PASSWORD: larga,
      ADMIN_NOMBRE: "Administración",
    })
    expect(resultado.ok).toBe(false)
    if (resultado.ok) return
    const texto = resultado.errores.join("\n")
    expect(texto).toContain("ADMIN_EMAIL")
    expect(texto).toContain("ADMIN_PASSWORD")
    expect(texto).not.toContain("centinela")
    expect(texto).not.toContain(larga)
  })
})
