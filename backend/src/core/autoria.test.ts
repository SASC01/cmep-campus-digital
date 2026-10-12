import { FIRMA_ADMINISTRACION, type Rol } from "@campus/shared"
import { describe, expect, it } from "vitest"

import { firmaDelAutor, puedeBorrar, puedeBorrarTarea, puedeEditarTarea } from "./autoria.js"

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

// TAREAS-01b (P-04 b, S-09): la matriz completa actor × autor de las tareas.
describe("puedeEditarTarea y puedeBorrarTarea (P-04 b, S-09)", () => {
  const C = "cccccccc-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
  const D = "dddddddd-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
  type Autor = "maestro en la clase" | "maestro retirado" | "admin"
  type Actor = "maestro autor" | "otro maestro" | "admin"
  const ACTORES: Record<Actor, { id: string; rol: Rol }> = {
    "maestro autor": { id: A, rol: "maestro" },
    "otro maestro": { id: B, rol: "maestro" },
    admin: { id: C, rol: "admin" },
  }
  const AUTORES: Record<Autor, { autor: { id: string; rol: Rol }; sigue: boolean }> = {
    "maestro en la clase": { autor: { id: A, rol: "maestro" }, sigue: true },
    "maestro retirado": { autor: { id: A, rol: "maestro" }, sigue: false },
    admin: { autor: { id: D, rol: "admin" }, sigue: true },
  }
  const EDITAR: Record<Actor, Record<Autor, boolean>> = {
    "maestro autor": { "maestro en la clase": true, "maestro retirado": true, admin: false },
    "otro maestro": { "maestro en la clase": false, "maestro retirado": true, admin: false },
    admin: { "maestro en la clase": false, "maestro retirado": false, admin: false },
  }
  const BORRAR: Record<Actor, Record<Autor, boolean>> = {
    "maestro autor": { "maestro en la clase": true, "maestro retirado": true, admin: false },
    "otro maestro": { "maestro en la clase": false, "maestro retirado": true, admin: false },
    admin: { "maestro en la clase": true, "maestro retirado": true, admin: true },
  }

  it("PR-1B04: puedeEditarTarea, matriz completa actor × autor", () => {
    for (const actor of Object.keys(ACTORES) as Actor[]) {
      for (const autor of Object.keys(AUTORES) as Autor[]) {
        const { autor: datos, sigue } = AUTORES[autor]
        expect(puedeEditarTarea(ACTORES[actor], datos, sigue), `${actor} frente a ${autor}`).toBe(
          EDITAR[actor][autor],
        )
      }
    }
  })

  it("PR-1B04: puedeBorrarTarea, matriz completa actor × autor", () => {
    for (const actor of Object.keys(ACTORES) as Actor[]) {
      for (const autor of Object.keys(AUTORES) as Autor[]) {
        const { autor: datos, sigue } = AUTORES[autor]
        expect(puedeBorrarTarea(ACTORES[actor], datos, sigue), `${actor} frente a ${autor}`).toBe(
          BORRAR[actor][autor],
        )
      }
    }
  })

  it("PR-1B04: el admin edita la suya (S-09) y la borra; el estudiante nunca puede", () => {
    const admin = { id: C, rol: "admin" as const }
    expect(puedeEditarTarea(admin, admin, true)).toBe(true)
    expect(puedeBorrarTarea(admin, admin, true)).toBe(true)
    const estudiante = { id: B, rol: "estudiante" as const }
    expect(puedeEditarTarea(estudiante, { id: A, rol: "maestro" }, false)).toBe(false)
    expect(puedeBorrarTarea(estudiante, { id: A, rol: "maestro" }, false)).toBe(false)
  })
})
