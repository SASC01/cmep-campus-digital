import { describe, expect, it } from "vitest"

import type { Rol } from "@campus/shared"

import { AppError } from "../errores.js"
import {
  exigirBorradoConEntregasPermitido,
  mensajeTareaConEntregas,
  tareaModificada,
  validarCategoriaRequerida,
  validarFechaLimite,
} from "./tareas.js"

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

// ENTREGAS-01b (S-06 modificada, §D-3.8; Enmienda 2).
describe("exigirBorradoConEntregasPermitido y mensajeTareaConEntregas (PR-1B27)", () => {
  const mensajeEsperado = (entregas: number, rol: Rol): string => {
    if (rol === "admin" && entregas === 1) {
      return "Esta tarea tiene 1 alumno con entrega o calificación. Si la borras, también se borrarán su entrega, su calificación y los comentarios privados, y no se puede deshacer."
    }
    if (rol === "admin") {
      return `Esta tarea tiene ${String(entregas)} alumnos con entrega o calificación. Si la borras, también se borrarán sus entregas, sus calificaciones y los comentarios privados, y no se puede deshacer.`
    }
    if (entregas === 1) {
      return "Esta tarea tiene 1 alumno con entrega o calificación y no se puede borrar. Si de verdad hay que borrarla, pídelo a administración."
    }
    return `Esta tarea tiene ${String(entregas)} alumnos con entrega o calificación y no se puede borrar. Si de verdad hay que borrarla, pídelo a administración.`
  }

  const resultado = (p: {
    rolDelActor: Rol
    entregas: number
    confirmarEntregas: boolean
  }): AppError | null => {
    try {
      exigirBorradoConEntregasPermitido(p)
      return null
    } catch (error) {
      if (error instanceof AppError) return error
      throw error
    }
  }

  it("PR-1B27: la matriz entregas (0, 1, 2, 30) × rol (admin, maestro, estudiante) × confirmación: con 0 nunca lanza; con al menos una, solo el admin con confirmación pasa", () => {
    const fallas: string[] = []
    let recorridos = 0
    for (const entregas of [0, 1, 2, 30]) {
      for (const rolDelActor of ["admin", "maestro", "estudiante"] as const) {
        for (const confirmarEntregas of [true, false]) {
          recorridos += 1
          const error = resultado({ rolDelActor, entregas, confirmarEntregas })
          const debePasar = entregas === 0 || (confirmarEntregas && rolDelActor === "admin")
          const nombre = `${String(entregas)}/${rolDelActor}/${String(confirmarEntregas)}`
          if (debePasar && error !== null) fallas.push(`${nombre}: lanzó ${error.codigo}`)
          if (debePasar) continue
          if (error === null) {
            fallas.push(`${nombre}: no lanzó`)
            continue
          }
          if (error.codigo !== "TAREA_CON_ENTREGAS") fallas.push(`${nombre}: ${error.codigo}`)
          if (error.estado !== 409) fallas.push(`${nombre}: estado ${String(error.estado)}`)
          if (error.message !== mensajeEsperado(entregas, rolDelActor)) {
            fallas.push(`${nombre}: mensaje «${error.message}»`)
          }
        }
      }
    }
    expect(recorridos).toBe(24)
    expect(fallas).toEqual([])
  })

  it("PR-1B27: los mensajes exactos de §D-3.8 en singular (1) y en plural (2 y 30), para el admin y para el maestro", () => {
    expect(mensajeTareaConEntregas(1, "admin")).toBe(
      "Esta tarea tiene 1 alumno con entrega o calificación. Si la borras, también se borrarán su entrega, su calificación y los comentarios privados, y no se puede deshacer.",
    )
    expect(mensajeTareaConEntregas(2, "admin")).toBe(
      "Esta tarea tiene 2 alumnos con entrega o calificación. Si la borras, también se borrarán sus entregas, sus calificaciones y los comentarios privados, y no se puede deshacer.",
    )
    expect(mensajeTareaConEntregas(30, "admin")).toBe(
      "Esta tarea tiene 30 alumnos con entrega o calificación. Si la borras, también se borrarán sus entregas, sus calificaciones y los comentarios privados, y no se puede deshacer.",
    )
    expect(mensajeTareaConEntregas(1, "maestro")).toBe(
      "Esta tarea tiene 1 alumno con entrega o calificación y no se puede borrar. Si de verdad hay que borrarla, pídelo a administración.",
    )
    expect(mensajeTareaConEntregas(2, "maestro")).toBe(
      "Esta tarea tiene 2 alumnos con entrega o calificación y no se puede borrar. Si de verdad hay que borrarla, pídelo a administración.",
    )
    expect(mensajeTareaConEntregas(30, "estudiante")).toBe(
      "Esta tarea tiene 30 alumnos con entrega o calificación y no se puede borrar. Si de verdad hay que borrarla, pídelo a administración.",
    )
  })

  it("PR-1B27: el maestro con confirmación recibe el mismo 409 que sin ella (nunca un 403)", () => {
    const con = resultado({ rolDelActor: "maestro", entregas: 2, confirmarEntregas: true })
    const sin = resultado({ rolDelActor: "maestro", entregas: 2, confirmarEntregas: false })
    expect(con).toMatchObject({ codigo: "TAREA_CON_ENTREGAS", estado: 409 })
    expect(con?.message).toBe(sin?.message)
  })
})
