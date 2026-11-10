import { describe, expect, it } from "vitest"

import * as hooksDelFoco from "@/components/foco/hooks"
import * as libDelFoco from "@/components/foco/lib"

import * as hooksDeClases from "./hooks"
import * as libDeClases from "./lib"

// ADMIN-01f (ADM-1F11, §D-11 y Enmienda 14): useFocoAlCargarMas y focoPerdido suben a components/foco/;
// features/clases los reexporta con el mismo nombre, así que sus usos y las simulaciones de ./hooks no
// cambian. Va fuera de components/foco/ (CAL-T-191 y CAL-T-192 recorren las pruebas de esa carpeta).
describe("ADMIN-01f · reexportaciones del foco", () => {
  it("ADM-1F11: useFocoAlCargarMas de features/clases/hooks es la misma función que la de components/foco", () => {
    expect(typeof hooksDelFoco.useFocoAlCargarMas).toBe("function")
    expect(hooksDeClases.useFocoAlCargarMas).toBe(hooksDelFoco.useFocoAlCargarMas)
  })

  it("ADM-1F11: focoPerdido de features/clases/lib es la misma función que la de components/foco/lib", () => {
    expect(typeof libDelFoco.focoPerdido).toBe("function")
    expect(libDeClases.focoPerdido).toBe(libDelFoco.focoPerdido)
  })
})
