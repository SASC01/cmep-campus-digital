import { describe, expect, it } from "vitest"

import {
  decidirCalificacion,
  escalarALaTarea,
  exigirEntregaCalificable,
  exigirRubricaCongelada,
  type CriterioParaCalificar,
} from "./calificar.js"

// CALIFICACIONES-01a (CAL-1A02, CAL-1A03, CAL-1A04 y CAL-1A07). Dobles en memoria y reloj explícito.

const errorCon = (codigo: string, estado: number, mensaje?: string) =>
  expect.objectContaining({
    codigo,
    estado,
    ...(mensaje === undefined ? {} : { message: mensaje }),
  })

describe("escalarALaTarea (CAL-1A02)", () => {
  it("CAL-1A02: con la suma de máximos igual a los puntos de la tarea es la identidad", () => {
    expect(escalarALaTarea({ puntos: [3, 4], maximos: [5, 5], puntosDeLaTarea: 10 })).toBe(7)
    expect(escalarALaTarea({ puntos: [8.5], maximos: [10], puntosDeLaTarea: 10 })).toBe(8.5)
  })

  it("CAL-1A02: con una suma distinta escala y redondea a la centésima (7/9 de 10 = 7.78)", () => {
    expect(escalarALaTarea({ puntos: [3, 4], maximos: [4, 5], puntosDeLaTarea: 10 })).toBe(7.78)
  })

  it("CAL-1A02: rúbrica parcial con puntos parciales por criterio (2.5 de 5 y 4 de 5)", () => {
    expect(escalarALaTarea({ puntos: [2.5, 4], maximos: [5, 5], puntosDeLaTarea: 10 })).toBe(6.5)
    expect(escalarALaTarea({ puntos: [2.5, 4], maximos: [5, 5], puntosDeLaTarea: 100 })).toBe(65)
  })

  it("CAL-1A02: todo en 0 da 0 y todo al máximo da los puntos de la tarea", () => {
    expect(escalarALaTarea({ puntos: [0, 0, 0], maximos: [3, 3, 3], puntosDeLaTarea: 7 })).toBe(0)
    expect(escalarALaTarea({ puntos: [3, 3, 3], maximos: [3, 3, 3], puntosDeLaTarea: 7 })).toBe(7)
  })

  it("CAL-1A02: una mitad exacta en la centésima redondea hacia arriba", () => {
    // 1 de 8 sobre 1 punto = 0.125 → 0.13; 3 de 8 sobre 1 punto = 0.375 → 0.38.
    expect(escalarALaTarea({ puntos: [1], maximos: [8], puntosDeLaTarea: 1 })).toBe(0.13)
    expect(escalarALaTarea({ puntos: [3], maximos: [8], puntosDeLaTarea: 1 })).toBe(0.38)
    // Justo debajo de la mitad baja: 1 de 3 sobre 1 punto = 0.333… → 0.33.
    expect(escalarALaTarea({ puntos: [1], maximos: [3], puntosDeLaTarea: 1 })).toBe(0.33)
  })

  it("CAL-1A02: decimales en los puntos de los criterios se suman sin error de float", () => {
    // 0.1 + 0.2 en float es 0.30000000000000004; en centésimas, 30.
    expect(escalarALaTarea({ puntos: [0.1, 0.2], maximos: [1, 2], puntosDeLaTarea: 3 })).toBe(0.3)
    expect(escalarALaTarea({ puntos: [2.25], maximos: [3], puntosDeLaTarea: 4 })).toBe(3)
    expect(escalarALaTarea({ puntos: [7.25, 0.01], maximos: [10, 10], puntosDeLaTarea: 20 })).toBe(
      7.26,
    )
  })

  it("CAL-1A02: puntos de la tarea en los extremos, 1 y 1000", () => {
    expect(escalarALaTarea({ puntos: [1], maximos: [3], puntosDeLaTarea: 1000 })).toBe(333.33)
    expect(escalarALaTarea({ puntos: [2], maximos: [3], puntosDeLaTarea: 1000 })).toBe(666.67)
    expect(escalarALaTarea({ puntos: [1000], maximos: [1000], puntosDeLaTarea: 1 })).toBe(1)
    expect(
      escalarALaTarea({
        puntos: Array.from({ length: 20 }, () => 1000),
        maximos: Array.from({ length: 20 }, () => 1000),
        puntosDeLaTarea: 1000,
      }),
    ).toBe(1000)
  })
})

const CRITERIOS: CriterioParaCalificar[] = [
  { id: "c1", criterio: "Claridad", puntosMax: 5 },
  { id: "c2", criterio: "Contenido", puntosMax: 4 },
]

describe("decidirCalificacion (CAL-1A03)", () => {
  it("CAL-1A03: puntosVistos distintos de los puntos de la tarea es RUBRICA_MODIFICADA, con y sin rúbrica, antes que cualquier otro error", () => {
    // El "9 de 10" que se guardaría como "9 de 100": forma correcta y valor en rango.
    expect(() =>
      decidirCalificacion({
        criterios: [],
        puntosDeLaTarea: 100,
        puntosVistos: 10,
        puntajes: [],
        calificacionDirecta: 9,
      }),
    ).toThrow(errorCon("RUBRICA_MODIFICADA", 409))
    expect(() =>
      decidirCalificacion({
        criterios: CRITERIOS,
        puntosDeLaTarea: 20,
        puntosVistos: 10,
        puntajes: [
          { criterioId: "c1", puntos: 1 },
          { criterioId: "c2", puntos: 1 },
        ],
        calificacionDirecta: null,
      }),
    ).toThrow(errorCon("RUBRICA_MODIFICADA", 409))
    // Antes que la forma y que el rango: un valor fuera de rango y una forma vieja siguen siendo 409.
    expect(() =>
      decidirCalificacion({
        criterios: CRITERIOS,
        puntosDeLaTarea: 20,
        puntosVistos: 10,
        puntajes: [{ criterioId: "otro", puntos: 999 }],
        calificacionDirecta: 999,
      }),
    ).toThrow(errorCon("RUBRICA_MODIFICADA", 409))
  })

  it("CAL-1A03: con rúbrica, una calificación directa no nula, un criterio de menos, de más o de otra tarea es RUBRICA_MODIFICADA", () => {
    const con =
      (puntajes: { criterioId: string; puntos: number }[], directa: number | null) => () =>
        decidirCalificacion({
          criterios: CRITERIOS,
          puntosDeLaTarea: 10,
          puntosVistos: 10,
          puntajes,
          calificacionDirecta: directa,
        })
    const completos = [
      { criterioId: "c1", puntos: 1 },
      { criterioId: "c2", puntos: 1 },
    ]
    expect(con(completos, 5)).toThrow(errorCon("RUBRICA_MODIFICADA", 409))
    expect(con([{ criterioId: "c1", puntos: 1 }], null)).toThrow(
      errorCon("RUBRICA_MODIFICADA", 409),
    )
    expect(con([...completos, { criterioId: "c3", puntos: 1 }], null)).toThrow(
      errorCon("RUBRICA_MODIFICADA", 409),
    )
    expect(
      con(
        [
          { criterioId: "c1", puntos: 1 },
          { criterioId: "deOtraTarea", puntos: 1 },
        ],
        null,
      ),
    ).toThrow(errorCon("RUBRICA_MODIFICADA", 409))
    expect(
      con(
        [
          { criterioId: "c1", puntos: 1 },
          { criterioId: "c1", puntos: 1 },
        ],
        null,
      ),
    ).toThrow(errorCon("RUBRICA_MODIFICADA", 409))
  })

  it("CAL-1A03: sin rúbrica, puntajes no vacíos o calificación nula es RUBRICA_MODIFICADA", () => {
    expect(() =>
      decidirCalificacion({
        criterios: [],
        puntosDeLaTarea: 10,
        puntosVistos: 10,
        puntajes: [{ criterioId: "c1", puntos: 1 }],
        calificacionDirecta: 5,
      }),
    ).toThrow(errorCon("RUBRICA_MODIFICADA", 409))
    expect(() =>
      decidirCalificacion({
        criterios: [],
        puntosDeLaTarea: 10,
        puntosVistos: 10,
        puntajes: [],
        calificacionDirecta: null,
      }),
    ).toThrow(errorCon("RUBRICA_MODIFICADA", 409))
  })

  it("CAL-1A03: un criterio por encima de su máximo es VALIDACION con la posición del cuerpo, no la de la rúbrica", () => {
    expect(() =>
      decidirCalificacion({
        criterios: CRITERIOS,
        puntosDeLaTarea: 10,
        puntosVistos: 10,
        // c2 va primero en el cuerpo y es el segundo de la rúbrica.
        puntajes: [
          { criterioId: "c2", puntos: 4.01 },
          { criterioId: "c1", puntos: 1 },
        ],
        calificacionDirecta: null,
      }),
    ).toThrow(errorCon("VALIDACION", 400, "puntajes.0.puntos: Escribe de 0 a 4 puntos."))
    expect(() =>
      decidirCalificacion({
        criterios: CRITERIOS,
        puntosDeLaTarea: 10,
        puntosVistos: 10,
        puntajes: [
          { criterioId: "c2", puntos: 4 },
          { criterioId: "c1", puntos: 6 },
        ],
        calificacionDirecta: null,
      }),
    ).toThrow(errorCon("VALIDACION", 400, "puntajes.1.puntos: Escribe de 0 a 5 puntos."))
  })

  it("CAL-1A03: una calificación directa mayor que los puntos de la tarea es VALIDACION en calificacion", () => {
    expect(() =>
      decidirCalificacion({
        criterios: [],
        puntosDeLaTarea: 80,
        puntosVistos: 80,
        puntajes: [],
        calificacionDirecta: 80.01,
      }),
    ).toThrow(errorCon("VALIDACION", 400, "calificacion: Escribe de 0 a 80 puntos."))
    expect(
      decidirCalificacion({
        criterios: [],
        puntosDeLaTarea: 80,
        puntosVistos: 80,
        puntajes: [],
        calificacionDirecta: 80,
      }),
    ).toEqual({ calificacion: 80, puntajes: [] })
  })

  it("CAL-1A03: la forma va antes que el rango (§D-2.2): un criterio de otra tarea fuera de rango es 409, no 400", () => {
    expect(() =>
      decidirCalificacion({
        criterios: CRITERIOS,
        puntosDeLaTarea: 10,
        puntosVistos: 10,
        puntajes: [
          { criterioId: "c1", puntos: 99 },
          { criterioId: "otro", puntos: 99 },
        ],
        calificacionDirecta: null,
      }),
    ).toThrow(errorCon("RUBRICA_MODIFICADA", 409))
  })

  it("CAL-1A03: los puntajes salen en el orden de la rúbrica aunque lleguen en otro, con la calificación escalada", () => {
    expect(
      decidirCalificacion({
        criterios: CRITERIOS,
        puntosDeLaTarea: 10,
        puntosVistos: 10,
        puntajes: [
          { criterioId: "c2", puntos: 4 },
          { criterioId: "c1", puntos: 3 },
        ],
        calificacionDirecta: null,
      }),
    ).toEqual({
      calificacion: 7.78,
      puntajes: [
        { criterioId: "c1", puntos: 3 },
        { criterioId: "c2", puntos: 4 },
      ],
    })
  })
})

describe("exigirEntregaCalificable (CAL-1A04, P-03 c′)", () => {
  const ahora = new Date("2026-10-13T12:00:00.000Z")
  const fechas = {
    "vencida hace 1 ms": new Date(ahora.getTime() - 1),
    exacta: new Date(ahora.getTime()),
    "dentro de 1 ms": new Date(ahora.getTime() + 1),
  } as const

  it("CAL-1A04: entregado y calificado son calificables siempre; asignado solo vencida y en una tarea que no acepta tardías", () => {
    for (const estado of ["asignado", "entregado", "calificado"] as const) {
      for (const [nombre, fechaLimite] of Object.entries(fechas)) {
        for (const aceptaTardias of [true, false]) {
          const caso = `${estado}, ${nombre}, aceptaTardias=${String(aceptaTardias)}`
          const llamar = () =>
            exigirEntregaCalificable({ estado, tarea: { fechaLimite, aceptaTardias }, ahora })
          const calificable =
            estado !== "asignado" || (nombre === "vencida hace 1 ms" && !aceptaTardias)
          if (calificable) {
            expect(llamar, caso).not.toThrow()
          } else {
            expect(llamar, caso).toThrow(
              errorCon(
                "ENTREGA_NO_CALIFICABLE",
                409,
                "Este alumno todavía puede entregar. Podrás calificarlo cuando entregue o cuando se cierre la entrega.",
              ),
            )
          }
        }
      }
    }
  })
})

describe("exigirRubricaCongelada (CAL-1A07, P-04 a con N-02)", () => {
  const claridad = { criterio: "Claridad", puntosMax: 5 }
  const contenido = { criterio: "Contenido", puntosMax: 4 }
  const rubrica = [claridad, contenido]

  it("CAL-1A07: una rúbrica idéntica no se reemplaza, con y sin calificaciones (también si solo cambian los puntos sin calificaciones)", () => {
    for (const calificadas of [0, 3]) {
      expect(
        exigirRubricaCongelada({
          calificadas,
          puntosActuales: 10,
          puntosNuevos: 10,
          rubricaActual: rubrica,
          rubricaNueva: rubrica.map((c) => ({ ...c })),
        }),
      ).toEqual({ reemplazarRubrica: false })
    }
    expect(
      exigirRubricaCongelada({
        calificadas: 0,
        puntosActuales: 10,
        puntosNuevos: 20,
        rubricaActual: rubrica,
        rubricaNueva: rubrica,
      }),
    ).toEqual({ reemplazarRubrica: false })
    expect(
      exigirRubricaCongelada({
        calificadas: 0,
        puntosActuales: 10,
        puntosNuevos: 10,
        rubricaActual: [],
        rubricaNueva: [],
      }),
    ).toEqual({ reemplazarRubrica: false })
  })

  it("CAL-1A07: una rúbrica distinta sin calificaciones se reemplaza", () => {
    expect(
      exigirRubricaCongelada({
        calificadas: 0,
        puntosActuales: 10,
        puntosNuevos: 10,
        rubricaActual: rubrica,
        rubricaNueva: [{ criterio: "Claridad", puntosMax: 5 }],
      }),
    ).toEqual({ reemplazarRubrica: true })
  })

  it("CAL-1A07: con calificaciones, otros puntos, un criterio de más o de menos, otro texto, otro máximo u otro orden es TAREA_CON_CALIFICACIONES", () => {
    const variantes: {
      puntosNuevos: number
      rubricaNueva: { criterio: string; puntosMax: number }[]
    }[] = [
      { puntosNuevos: 20, rubricaNueva: rubrica },
      { puntosNuevos: 10, rubricaNueva: [...rubrica, { criterio: "Forma", puntosMax: 1 }] },
      { puntosNuevos: 10, rubricaNueva: rubrica.slice(0, 1) },
      { puntosNuevos: 10, rubricaNueva: [{ criterio: "claridad", puntosMax: 5 }, contenido] },
      { puntosNuevos: 10, rubricaNueva: [{ criterio: "Claridad", puntosMax: 6 }, contenido] },
      { puntosNuevos: 10, rubricaNueva: [contenido, claridad] },
      { puntosNuevos: 10, rubricaNueva: [] },
    ]
    for (const { puntosNuevos, rubricaNueva } of variantes) {
      expect(() =>
        exigirRubricaCongelada({
          calificadas: 1,
          puntosActuales: 10,
          puntosNuevos,
          rubricaActual: rubrica,
          rubricaNueva,
        }),
      ).toThrow(
        errorCon(
          "TAREA_CON_CALIFICACIONES",
          409,
          "Esta tarea ya tiene calificaciones: no puedes cambiar sus puntos ni su rúbrica. Lo demás sí se puede editar.",
        ),
      )
    }
  })
})
