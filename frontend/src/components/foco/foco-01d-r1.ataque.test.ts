import { describe, expect, it } from "vitest"

import { useFocoAlPerderseElControl as useFocoDeTareas } from "@/features/tareas/hooks"
import { claveDeFocoDeLaTarea } from "@/features/tareas/lib"

import { useFocoAlPerderseElControl } from "./hooks"
import { claveDeFocoDeLaConsulta } from "./lib"

// Tester, ronda 1 de CALIFICACIONES-01d: la identidad de las reexportaciones de §D-13.1 y que la clave
// no cambió de forma (dos fallos seguidos en el mismo milisegundo siguen dando claves distintas). No
// depende del reloj: los momentos se escriben a mano.

describe("components/foco (ronda 1 del tester)", () => {
  it("CAL-T-183: las reexportaciones de features/tareas son los mismos objetos que los de components/foco", () => {
    expect(useFocoDeTareas).toBe(useFocoAlPerderseElControl)
    expect(claveDeFocoDeLaTarea).toBe(claveDeFocoDeLaConsulta)
  })

  it("CAL-T-199: la clave distingue dos fallos seguidos en el mismo milisegundo y no depende de nada más que del id y del momento", () => {
    const base = {
      status: "error",
      dataUpdatedAt: 5,
      errorUpdatedAt: 9,
      errorUpdateCount: 1,
    } as const
    const primera = claveDeFocoDeLaConsulta("g", base)
    const segunda = claveDeFocoDeLaConsulta("g", { ...base, errorUpdateCount: 2 })
    expect(primera).not.toBe(segunda)
    expect(claveDeFocoDeLaConsulta("g", base)).toBe(primera)
    expect(claveDeFocoDeLaConsulta("h", base)).not.toBe(primera)
  })
})
