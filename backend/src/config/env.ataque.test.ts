import { describe, expect, it } from "vitest"

import { JWT_SECRET_DE_EJEMPLO, validarEnv, validarEnvAdmin } from "./env.js"

// Ataques del Tester (AUTH-01, ronda 1) contra la validación del entorno (DEC-17, M-11).

const urlDePrueba = "postgresql://usuario:clave-de-prueba@127.0.0.1:5433/base?schema=public"

// CLASES-d ronda 0 (C-13, §D-R0; §D-D2 del plan de CLASES-01): en production, STORAGE_ENDPOINT,
// STORAGE_ACCESS_KEY y STORAGE_SECRET_KEY pasan a ser obligatorias (STORAGE_REGION y
// STORAGE_BUCKET_PRIVADO tienen valor por defecto). Sin ellas, "acepta 32" caería por el almacén y
// los rechazos dejarían de depender solo de JWT_SECRET. El ayudante suma un almacén válido y fijo;
// como "acepta 32" usa el mismo almacén y debe dar ok, cualquier rechazo de este bloque sigue siendo
// por JWT_SECRET. Sigue protegiendo lo mismo: la frontera exacta de 32, el literal de .env.example
// con blancos, el secreto de solo blancos y que ningún mensaje repita el valor recibido.
const almacenDeProduccion = {
  STORAGE_ENDPOINT: "https://almacen.colegio-ataque.mx",
  STORAGE_ACCESS_KEY: "llave-de-acceso-del-ataque",
  STORAGE_SECRET_KEY: "secreto-del-almacen-del-ataque",
}

const enProduccion = (JWT_SECRET: string) =>
  validarEnv({
    DATABASE_URL: urlDePrueba,
    NODE_ENV: "production",
    JWT_SECRET,
    ...almacenDeProduccion,
  })

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
