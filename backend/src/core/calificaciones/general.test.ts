import { describe, expect, it } from "vitest"

import {
  calificacionGeneral,
  type AgregadoPorCategoria,
  type CategoriaDeLaClase,
} from "./general.js"

// CALIFICACIONES-01a (CAL-1A05). Los cinco casos del cálculo de AGENTS.md y los de P-01 de TAREAS-01,
// con dobles en memoria. Los agregados son lo que suma la consulta: solo entregas calificadas.

const A: CategoriaDeLaClase = { id: "cat-a", nombre: "Tareas", peso: 40 }
const B: CategoriaDeLaClase = { id: "cat-b", nombre: "Exámenes", peso: 40 }
const C: CategoriaDeLaClase = { id: "cat-c", nombre: "Proyecto", peso: 20 }

const agregado = (
  categoriaId: string | null,
  obtenidoCentesimas: number,
  posible: number,
  tareas = 1,
): AgregadoPorCategoria => ({ categoriaId, obtenidoCentesimas, posible, tareas })

describe("calificacionGeneral (CAL-1A05)", () => {
  it("CAL-1A05 (a): una categoría sin tareas calificadas no cuenta: pesoEfectivo y porcentaje nulos", () => {
    const general = calificacionGeneral({
      categorias: [
        { ...A, peso: 50 },
        { ...B, peso: 50 },
      ],
      agregados: [agregado(A.id, 8000, 100)],
    })
    expect(general.modo).toBe("categorias")
    expect(general.porcentaje).toBe(80)
    expect(general.categorias).toEqual([
      {
        id: A.id,
        nombre: A.nombre,
        peso: 50,
        pesoEfectivo: 100,
        porcentaje: 80,
        obtenido: 80,
        posible: 100,
        tareas: 1,
      },
      {
        id: B.id,
        nombre: B.nombre,
        peso: 50,
        pesoEfectivo: null,
        porcentaje: null,
        obtenido: 0,
        posible: 0,
        tareas: 0,
      },
    ])
  })

  it("CAL-1A05 (b): pesos redistribuidos: 40/40/20 con la de 20 vacía cuenta 50/50 y el general es el ponderado", () => {
    const general = calificacionGeneral({
      categorias: [A, B, C],
      agregados: [agregado(A.id, 8000, 100), agregado(B.id, 6000, 100)],
    })
    expect(general.categorias.map((c) => c.pesoEfectivo)).toEqual([50, 50, null])
    expect(general.porcentaje).toBe(70)
    expect(general.puntos).toEqual({ obtenido: 140, posible: 200, tareas: 2 })
  })

  it("CAL-1A05 (b): con 40/40/20 completas, los pesos efectivos son los mismos y pesan distinto", () => {
    const general = calificacionGeneral({
      categorias: [A, B, C],
      agregados: [agregado(A.id, 10000, 100), agregado(B.id, 5000, 100), agregado(C.id, 0, 10)],
    })
    expect(general.categorias.map((c) => c.pesoEfectivo)).toEqual([40, 40, 20])
    // 100 × 0.4 + 50 × 0.4 + 0 × 0.2 = 60.
    expect(general.porcentaje).toBe(60)
  })

  it("CAL-1A05 (c): tareas sin calificar no entran: una categoría con tareas sin calificar es una categoría sin tareas calificadas", () => {
    // La consulta solo suma entregas calificadas: una categoría con solo tareas sin calificar no
    // trae agregado. El resultado es el mismo que si no tuviera tareas.
    const sinCalificar = calificacionGeneral({
      categorias: [A, B],
      agregados: [agregado(A.id, 9000, 100)],
    })
    const sinTareas = calificacionGeneral({
      categorias: [A, B],
      agregados: [agregado(A.id, 9000, 100)],
    })
    expect(sinCalificar).toEqual(sinTareas)
    expect(sinCalificar.porcentaje).toBe(90)
    expect(sinCalificar.categorias[1]).toMatchObject({ porcentaje: null, pesoEfectivo: null })
  })

  it("CAL-1A05 (d): rúbrica parcial: agregados con centésimas (7.78 de 10 y 2.5 de 5)", () => {
    const general = calificacionGeneral({
      categorias: [],
      agregados: [agregado(null, 778 + 250, 15, 2)],
    })
    // 10.28 / 15 = 68.5333… → 68.53.
    expect(general.porcentaje).toBe(68.53)
    expect(general.puntos).toEqual({ obtenido: 10.28, posible: 15, tareas: 2 })
  })

  it("CAL-1A05 (e): entregas tardías: el agregado no distingue el retraso y el resultado es el mismo (S-03)", () => {
    // Dos alumnos con las mismas notas, uno a tiempo y otro con retraso, producen el mismo agregado.
    const aTiempo = calificacionGeneral({ categorias: [A], agregados: [agregado(A.id, 7500, 100)] })
    const conRetraso = calificacionGeneral({
      categorias: [A],
      agregados: [agregado(A.id, 7500, 100)],
    })
    expect(conRetraso).toEqual(aTiempo)
    expect(conRetraso.porcentaje).toBe(75)
  })

  it("CAL-1A05 (f): una clase sin categorías califica por puntos", () => {
    const general = calificacionGeneral({
      categorias: [],
      agregados: [agregado(null, 8500, 100, 3)],
    })
    expect(general).toEqual({
      modo: "puntos",
      porcentaje: 85,
      puntos: { obtenido: 85, posible: 100, tareas: 3 },
      categorias: [],
      sinCategoria: { tareas: 0 },
    })
  })

  it("CAL-1A05 (g): con categorías, las tareas «Sin categoría» no cuentan y sinCategoria las dice", () => {
    const general = calificacionGeneral({
      categorias: [A],
      agregados: [agregado(A.id, 6000, 100), agregado(null, 0, 100, 2)],
    })
    expect(general.porcentaje).toBe(60)
    expect(general.sinCategoria).toEqual({ tareas: 2 })
    expect(general.puntos).toEqual({ obtenido: 60, posible: 100, tareas: 1 })
  })

  it("CAL-1A05 (h): si nada cuenta, el porcentaje es null (con categorías y sin ellas)", () => {
    expect(calificacionGeneral({ categorias: [], agregados: [] }).porcentaje).toBeNull()
    const soloSinCategoria = calificacionGeneral({
      categorias: [A, B],
      agregados: [agregado(null, 5000, 100)],
    })
    expect(soloSinCategoria.porcentaje).toBeNull()
    expect(soloSinCategoria.sinCategoria).toEqual({ tareas: 1 })
    expect(soloSinCategoria.puntos).toEqual({ obtenido: 0, posible: 0, tareas: 0 })
  })

  it("CAL-1A05 (i): un categoriaId que no es de la clase es ERROR_INTERNO, con categorías y sin ellas", () => {
    const esperado = expect.objectContaining({
      codigo: "ERROR_INTERNO",
      estado: 500,
      message: "La calificación tiene una categoría que no es de la clase.",
    })
    expect(() =>
      calificacionGeneral({ categorias: [A], agregados: [agregado("ajena", 100, 10)] }),
    ).toThrow(esperado)
    expect(() =>
      calificacionGeneral({ categorias: [], agregados: [agregado("ajena", 100, 10)] }),
    ).toThrow(esperado)
  })

  it("CAL-1A05 (j): se redondea al final, no se suman porcentajes ya redondeados", () => {
    // A: 0.01 de 8 puntos = 0.125 % (se muestra 0.13); B: 0 %. Con 50/50, el exacto es 0.0625 → 0.06;
    // con los redondeados daría (0.13 + 0) / 2 = 0.065 → 0.07.
    const general = calificacionGeneral({
      categorias: [
        { ...A, peso: 50 },
        { ...B, peso: 50 },
      ],
      agregados: [agregado(A.id, 1, 8), agregado(B.id, 0, 10)],
    })
    expect(general.categorias.map((c) => c.porcentaje)).toEqual([0.13, 0])
    expect(general.porcentaje).toBe(0.06)
  })

  it("CAL-1A05 (j): los pesos efectivos de tres categorías iguales redondean cada uno a 33.33", () => {
    const general = calificacionGeneral({
      categorias: [
        { ...A, peso: 10 },
        { ...B, peso: 10 },
        { ...C, peso: 10 },
      ],
      agregados: [agregado(A.id, 100, 3), agregado(B.id, 200, 3), agregado(C.id, 300, 3)],
    })
    expect(general.categorias.map((c) => c.pesoEfectivo)).toEqual([33.33, 33.33, 33.33])
    // 33.33…, 66.66… y 100: el promedio exacto es 66.666… → 66.67.
    expect(general.categorias.map((c) => c.porcentaje)).toEqual([33.33, 66.67, 100])
    expect(general.porcentaje).toBe(66.67)
  })

  it("CAL-1A05 (k): con P-05 (a), dentro de una categoría una tarea de 100 puntos pesa más que una de 10", () => {
    // 50 de 100 y 10 de 10: por puntos, 60 / 110 = 54.55 %; el promedio de porcentajes daría 75 %.
    const general = calificacionGeneral({
      categorias: [A],
      agregados: [agregado(A.id, 5000 + 1000, 110, 2)],
    })
    expect(general.porcentaje).toBe(54.55)
    expect(general.categorias[0]).toMatchObject({ porcentaje: 54.55, tareas: 2, posible: 110 })
  })

  it("CAL-1A05: varios agregados de la misma categoría se suman", () => {
    const general = calificacionGeneral({
      categorias: [A],
      agregados: [agregado(A.id, 5000, 100), agregado(A.id, 1000, 10)],
    })
    expect(general.porcentaje).toBe(54.55)
  })
})
