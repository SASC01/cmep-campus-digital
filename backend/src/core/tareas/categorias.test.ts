import { describe, expect, it } from "vitest"

import {
  conNombresDeCategoriaNormalizados,
  planearReemplazoDeCategorias,
  validarPesos,
} from "./categorias.js"

const A = "aaaaaaaa-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
const B = "bbbbbbbb-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
const C = "cccccccc-1c1f-4b8e-9a1e-0f2a3b4c5d6e"

const validacion = (mensaje: string) =>
  expect.objectContaining({ codigo: "VALIDACION", estado: 400, message: mensaje })

describe("validarPesos", () => {
  it("PR-1A02: una lista vacía es válida", () => {
    expect(() => validarPesos([])).not.toThrow()
  })

  it("PR-1A02: 100 pasa; 99 y 101 rechazan", () => {
    expect(() => validarPesos([60, 40])).not.toThrow()
    expect(() => validarPesos([60, 39])).toThrowError(
      validacion("categorias: Los pesos deben sumar 100 %"),
    )
    expect(() => validarPesos([60, 41])).toThrowError(
      validacion("categorias: Los pesos deben sumar 100 %"),
    )
  })

  it("PR-1A02: una sola categoría de 100 pasa", () => {
    expect(() => validarPesos([100])).not.toThrow()
  })

  it("PR-1A02: diez categorías que suman 100 pasan", () => {
    expect(() => validarPesos(Array.from({ length: 10 }, () => 10))).not.toThrow()
  })

  it("PR-1A02: un peso fuera de 1 a 100 o con decimales rechaza aunque la suma sea 100", () => {
    const mensaje = "categorias: El peso debe ser un número entero de 1 a 100"
    expect(() => validarPesos([100, 0])).toThrowError(validacion(mensaje))
    expect(() => validarPesos([50.5, 49.5])).toThrowError(validacion(mensaje))
    expect(() => validarPesos([101, -1])).toThrowError(validacion(mensaje))
  })
})

describe("planearReemplazoDeCategorias", () => {
  it("PR-1A02: sin actuales, todas las nuevas se crean", () => {
    const plan = planearReemplazoDeCategorias(
      [],
      [
        { nombre: "Tareas", peso: 60 },
        { nombre: "Examen", peso: 40 },
      ],
    )
    expect(plan).toEqual({
      crear: [
        { nombre: "Tareas", peso: 60 },
        { nombre: "Examen", peso: 40 },
      ],
      actualizar: [],
      quitar: [],
    })
  })

  it("PR-1A02: las que traen id se actualizan", () => {
    const plan = planearReemplazoDeCategorias(
      [{ id: A }, { id: B }],
      [
        { id: A, nombre: "Tareas", peso: 70 },
        { id: B, nombre: "Examen", peso: 30 },
      ],
    )
    expect(plan).toEqual({
      crear: [],
      actualizar: [
        { id: A, nombre: "Tareas", peso: 70 },
        { id: B, nombre: "Examen", peso: 30 },
      ],
      quitar: [],
    })
  })

  it("PR-1A02: las actuales que no vienen se quitan; una lista vacía las quita todas", () => {
    expect(
      planearReemplazoDeCategorias([{ id: A }, { id: B }], [{ id: A, nombre: "Todo", peso: 100 }]),
    ).toEqual({ crear: [], actualizar: [{ id: A, nombre: "Todo", peso: 100 }], quitar: [B] })
    expect(planearReemplazoDeCategorias([{ id: A }, { id: B }], [])).toEqual({
      crear: [],
      actualizar: [],
      quitar: [A, B],
    })
  })

  it("PR-1A02: crear, actualizar y quitar combinados", () => {
    const plan = planearReemplazoDeCategorias(
      [{ id: A }, { id: B }, { id: C }],
      [
        { id: B, nombre: "Examen", peso: 50 },
        { nombre: "Proyecto", peso: 50 },
      ],
    )
    expect(plan).toEqual({
      crear: [{ nombre: "Proyecto", peso: 50 }],
      actualizar: [{ id: B, nombre: "Examen", peso: 50 }],
      quitar: [A, C],
    })
  })

  it("PR-1A02: un id que no es de la clase → 404 CATEGORIA_NO_ENCONTRADA", () => {
    expect(() =>
      planearReemplazoDeCategorias([{ id: A }], [{ id: C, nombre: "Ajena", peso: 100 }]),
    ).toThrowError(expect.objectContaining({ codigo: "CATEGORIA_NO_ENCONTRADA", estado: 404 }))
  })

  it("PR-1A02: un id repetido (también en otra capitalización) → 400 VALIDACION", () => {
    const repetido = (segundo: string) =>
      planearReemplazoDeCategorias(
        [{ id: A }],
        [
          { id: A, nombre: "Uno", peso: 50 },
          { id: segundo, nombre: "Dos", peso: 50 },
        ],
      )
    expect(() => repetido(A)).toThrowError(validacion("categorias: No repitas una categoría"))
    expect(() => repetido(A.toUpperCase())).toThrowError(
      validacion("categorias: No repitas una categoría"),
    )
  })

  it("PR-1A02: un nombre repetido, normalizado, → 400 VALIDACION", () => {
    expect(() =>
      planearReemplazoDeCategorias(
        [],
        [
          { nombre: "Evaluación", peso: 50 },
          { nombre: "  evaluacion ", peso: 50 },
        ],
      ),
    ).toThrowError(validacion("categorias: No repitas el nombre de una categoría"))
  })

  it("PR-1A02: once categorías → 400 por el tope de 10", () => {
    const once = Array.from({ length: 11 }, (_, i) => ({ nombre: `C${i}`, peso: i === 0 ? 10 : 9 }))
    expect(() => planearReemplazoDeCategorias([], once)).toThrowError(
      validacion("categorias: Una clase puede tener hasta 10 categorías"),
    )
  })

  it("PR-1A02: pesos que no suman 100 → 400 VALIDACION", () => {
    expect(() =>
      planearReemplazoDeCategorias(
        [],
        [
          { nombre: "Uno", peso: 50 },
          { nombre: "Dos", peso: 49 },
        ],
      ),
    ).toThrowError(validacion("categorias: Los pesos deben sumar 100 %"))
  })
})

describe("conNombresDeCategoriaNormalizados", () => {
  it("PR-1A02: recorta y pasa CRLF y CR a LF solo en el nombre de cada categoría, sin mutar", () => {
    const cuerpo = {
      categorias: [
        { nombre: "  Examen\r\n", peso: 40 },
        { id: A, nombre: "Tareas\r", peso: 60 },
      ],
    }
    const copia = structuredClone(cuerpo)
    expect(conNombresDeCategoriaNormalizados(cuerpo)).toEqual({
      categorias: [
        { nombre: "Examen", peso: 40 },
        { id: A, nombre: "Tareas", peso: 60 },
      ],
    })
    expect(cuerpo).toEqual(copia)
  })

  it("PR-1A02: lo que no es texto o no tiene la forma esperada queda intacto", () => {
    const raros = [
      null,
      [],
      "texto",
      {},
      { categorias: "x" },
      { categorias: [null, [], { nombre: 5, peso: 1 }, "x"] },
    ]
    for (const cuerpo of raros) {
      expect(conNombresDeCategoriaNormalizados(cuerpo)).toEqual(cuerpo)
    }
  })
})

describe("comparación de nombres (ronda 1, T-02 y T-03)", () => {
  it("PR-1A02: invisibles y formas de compatibilidad cuentan como el mismo nombre", () => {
    for (const variante of [
      "Exá\u200Bmenes",
      "Ex\u00ADámenes",
      "\uFF25xámenes",
      "Exámenes\u2060",
    ]) {
      expect(() =>
        planearReemplazoDeCategorias(
          [],
          [
            { nombre: "Exámenes", peso: 50 },
            { nombre: variante, peso: 50 },
          ],
        ),
      ).toThrowError(validacion("categorias: No repitas el nombre de una categoría"))
    }
  })
})

describe("comparación con caracteres que se ven vacíos (ronda 2, T-05)", () => {
  const BRAILLE = String.fromCodePoint(0x2800)
  const CABEZA_DE_NOTA = String.fromCodePoint(0x1d159)

  it("PR-1A02: U+2800 y U+1D159 hacen repetido un nombre en el mismo guardado", () => {
    for (const variante of [
      `Exámenes${BRAILLE}`,
      `${BRAILLE}Exámenes`,
      `Exámenes${CABEZA_DE_NOTA}`,
    ]) {
      expect(() =>
        planearReemplazoDeCategorias(
          [{ id: A }],
          [
            { id: A, nombre: "Exámenes", peso: 50 },
            { nombre: variante, peso: 50 },
          ],
        ),
      ).toThrowError(validacion("categorias: No repitas el nombre de una categoría"))
    }
  })

  it("PR-1A02: una categoría renombrada con solo un carácter que se ve vacío de diferencia pasa", () => {
    expect(
      planearReemplazoDeCategorias(
        [{ id: A }],
        [{ id: A, nombre: `Exámenes${BRAILLE}`, peso: 100 }],
      ).actualizar,
    ).toHaveLength(1)
  })
})
