import { FIRMA_ADMINISTRACION, type Rol } from "@campus/shared"
import { describe, expect, it } from "vitest"

import { firmaDelAutor, puedeBorrar } from "./autoria.js"

const ROLES: Rol[] = ["estudiante", "maestro", "admin"]
const A = "aaaaaaaa-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
const B = "bbbbbbbb-1c1f-4b8e-9a1e-0f2a3b4c5d6e"

describe("puedeBorrar (P-01 b)", () => {
  // Tabla completa actor x autor con ids distintos: [actor, autor] -> resultado.
  const ESPERADO: Record<Rol, Record<Rol, boolean>> = {
    admin: { admin: true, maestro: true, estudiante: true },
    maestro: { admin: false, maestro: false, estudiante: true },
    estudiante: { admin: false, maestro: false, estudiante: false },
  }

  it("PR-2B01: tabla completa actor × autor con los tres roles y personas distintas", () => {
    for (const actor of ROLES) {
      for (const autor of ROLES) {
        expect(
          puedeBorrar({ id: A, rol: actor }, { id: B, rol: autor }),
          `${actor} frente a ${autor}`,
        ).toBe(ESPERADO[actor][autor])
      }
    }
  })

  it("PR-2B01: cada quien borra lo suyo, con cualquiera de los tres roles", () => {
    for (const rol of ROLES) {
      expect(puedeBorrar({ id: A, rol }, { id: A, rol })).toBe(true)
    }
  })

  it("PR-2B01: ids iguales con roles distintos (dato imposible): true, manda la identidad", () => {
    for (const actor of ROLES) {
      for (const autor of ROLES) {
        expect(puedeBorrar({ id: A, rol: actor }, { id: A, rol: autor })).toBe(true)
      }
    }
  })
})

describe("firmaDelAutor", () => {
  it("PR-2B02: el admin sale como «Administración» con administracion: true y su id real", () => {
    expect(firmaDelAutor({ id: A, nombre: "Nombre real", rol: "admin" })).toEqual({
      id: A,
      nombre: FIRMA_ADMINISTRACION,
      administracion: true,
    })
  })

  it("PR-2B02: el maestro y el estudiante salen con su nombre y administracion: false, aunque se llamen «Administración»", () => {
    for (const rol of ["maestro", "estudiante"] as const) {
      expect(firmaDelAutor({ id: B, nombre: "Ana Ruiz", rol })).toEqual({
        id: B,
        nombre: "Ana Ruiz",
        administracion: false,
      })
      expect(firmaDelAutor({ id: B, nombre: FIRMA_ADMINISTRACION, rol }).administracion).toBe(false)
    }
  })

  it("PR-2B02: la salida no tiene la clave rol", () => {
    for (const rol of ROLES) {
      expect(Object.keys(firmaDelAutor({ id: A, nombre: "X", rol })).sort()).toEqual([
        "administracion",
        "id",
        "nombre",
      ])
    }
  })
})
