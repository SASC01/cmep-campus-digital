import { describe, expect, it } from "vitest"

import { tareaModificada, validarCategoriaRequerida, validarFechaLimite } from "./tareas.js"

const AHORA = new Date("2026-10-06T12:00:00.000Z")
const DIA_MS = 24 * 60 * 60 * 1000
const despues = (ms: number): Date => new Date(AHORA.getTime() + ms)

const rechaza = (nueva: Date, anterior: Date | null) =>
  expect(() => validarFechaLimite({ nueva, anterior, ahora: AHORA })).toThrowError(
    expect.objectContaining({ codigo: "FECHA_LIMITE_INVALIDA", estado: 400 }),
  )

describe("validarFechaLimite", () => {
  it("PR-1B03: al crear, una fecha pasada o igual a ahora rechaza", () => {
    rechaza(despues(-1), null)
    rechaza(despues(0), null)
    rechaza(despues(-30 * DIA_MS), null)
  })

  it("PR-1B03: al crear, una fecha futura dentro del año pasa (1 ms y 365 días exactos)", () => {
    expect(() =>
      validarFechaLimite({ nueva: despues(1), anterior: null, ahora: AHORA }),
    ).not.toThrow()
    expect(() =>
      validarFechaLimite({ nueva: despues(365 * DIA_MS), anterior: null, ahora: AHORA }),
    ).not.toThrow()
  })

  it("PR-1B03: al crear, a 366 días rechaza", () => {
    rechaza(despues(366 * DIA_MS), null)
    rechaza(despues(365 * DIA_MS + 1), null)
  })

  it("PR-1B03: al crear, una fecha inválida rechaza", () => {
    rechaza(new Date("no es fecha"), null)
  })

  it("PR-1B03: al editar, conservar la misma fecha ya pasada pasa", () => {
    const pasada = despues(-5 * DIA_MS)
    expect(() =>
      validarFechaLimite({ nueva: new Date(pasada.getTime()), anterior: pasada, ahora: AHORA }),
    ).not.toThrow()
  })

  it("PR-1B03: al editar, una fecha nueva pasada rechaza, y una distinta por 1 ms de una pasada también", () => {
    const pasada = despues(-5 * DIA_MS)
    rechaza(despues(-2 * DIA_MS), pasada)
    rechaza(new Date(pasada.getTime() + 1), pasada)
  })

  it("PR-1B03: al editar, una fecha nueva futura dentro del año pasa y a 366 días rechaza", () => {
    const anterior = despues(2 * DIA_MS)
    expect(() =>
      validarFechaLimite({ nueva: despues(10 * DIA_MS), anterior, ahora: AHORA }),
    ).not.toThrow()
    rechaza(despues(366 * DIA_MS), anterior)
  })
})

describe("validarCategoriaRequerida", () => {
  it("PR-1B03: sin categorías en la clase, la tarea puede quedar sin categoría", () => {
    expect(() =>
      validarCategoriaRequerida({ categoriaId: null, categoriasEnLaClase: 0 }),
    ).not.toThrow()
  })

  it("PR-1B03: con categorías en la clase y sin una elegida, 409 CATEGORIA_REQUERIDA", () => {
    expect(() =>
      validarCategoriaRequerida({ categoriaId: null, categoriasEnLaClase: 1 }),
    ).toThrowError(expect.objectContaining({ codigo: "CATEGORIA_REQUERIDA", estado: 409 }))
  })

  it("PR-1B03: con categorías en la clase y una elegida, pasa", () => {
    expect(() =>
      validarCategoriaRequerida({ categoriaId: "id", categoriasEnLaClase: 3 }),
    ).not.toThrow()
  })
})

describe("tareaModificada (§D-7)", () => {
  it("PR-1A03: TAREA_MODIFICADA es un 409 con el mensaje de §D-7", () => {
    expect(tareaModificada()).toMatchObject({
      codigo: "TAREA_MODIFICADA",
      estado: 409,
      message:
        "Otra persona guardó cambios en esta tarea mientras la editabas. Tus cambios no se guardaron: vuelve a hacerlos sobre la versión actual.",
    })
  })
})
