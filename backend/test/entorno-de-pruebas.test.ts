import { describe, expect, inject, it } from "vitest"

import {
  NOMBRE_BASE_DE_PRUEBAS,
  USUARIO_BASE_DE_PRUEBAS,
  validarUrlDePruebas,
} from "./entorno-de-pruebas.js"

// Guarda de la base de pruebas (CHORE-01, DEC-11 y P-02): solo acepta campus_pruebas en loopback, y
// el motivo del rechazo nunca incluye la contraseña.
describe("validarUrlDePruebas", () => {
  it("rechaza campus_dev aunque esté en loopback, sin mostrar la contraseña", () => {
    const motivo = validarUrlDePruebas(
      "postgresql://campus:contrasena-secreta@127.0.0.1:5433/campus_dev?schema=public",
    )
    expect(motivo).toBe('la base es "campus_dev" y las pruebas solo aceptan "campus_pruebas"')
    expect(motivo).not.toContain("contrasena-secreta")
  })

  it("rechaza un host que no es local, aunque la base se llame campus_pruebas", () => {
    expect(
      validarUrlDePruebas(
        "postgresql://campus_pruebas:contrasena@db.ejemplo.com:5432/campus_pruebas",
      ),
    ).toBe('el host "db.ejemplo.com" no es local')
  })

  it("rechaza cualquier otra base en loopback", () => {
    expect(
      validarUrlDePruebas("postgres://campus_pruebas:contrasena@localhost:5432/postgres"),
    ).toBe('la base es "postgres" y las pruebas solo aceptan "campus_pruebas"')
  })

  it("acepta la URL de la corrida que arma test/global-setup.ts", () => {
    const plantilla = `postgresql://${USUARIO_BASE_DE_PRUEBAS}:${"a1".repeat(24)}@127.0.0.1:54321/${NOMBRE_BASE_DE_PRUEBAS}`
    expect(validarUrlDePruebas(plantilla)).toBeNull()
    expect(validarUrlDePruebas(inject("entornoDePruebas").databaseUrl)).toBeNull()
  })
})
