import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  ENTRADAS_FUERA_DE_CONTRATO,
  RESTOS_SIN_TEXTO_VISIBLE,
} from "@/lib/errores-de-api-fuera-de-contrato"
import { ApiError } from "@/services/apiClient"

import { MENSAJES_ERROR_CALIFICACIONES, MENSAJES_ERROR_EXPORTACION } from "./data"
import {
  cabeEnUnaHoja,
  combinarVentanasDeExportacion,
  filasDeLaHojaDeExportacion,
  hojaDeExportacion,
  mensajeDeErrorDeExportacion,
  mismoAlumnoDeExportacion,
  nombreDelArchivoDeExportacion,
  ventanasDeLaExportacion,
} from "./lib"
import type {
  AlumnoDeExportacion,
  ColumnaDelGradebook,
  ExportacionDeCalificacionesRespuesta,
  FilaDeExportacion,
  MatrizDeExportacion,
  VentanaDeExportacion,
} from "./types"

// CALIFICACIONES-02b (CAL2-B04 a CAL2-B07). Las funciones puras de la exportación: combinar las
// ventanas, la hoja, el nombre del archivo y el texto de un error. Reloj fijo en todas (solo Date).

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const UN_MINUTO = 60_000
const uuid = (n: number) => `9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c${String(n).padStart(4, "0")}`

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
})

afterEach(() => {
  vi.useRealTimers()
})

const tarea = (n: number, fechaLimite: string): ColumnaDelGradebook => ({
  id: uuid(100 + n),
  titulo: `Tarea ${String(n)}`,
  fechaLimite,
  puntos: 10,
  categoria: null,
})

// En el orden de la API: de la más reciente a la más antigua.
const T4 = tarea(4, "2030-01-15T16:00:00.000Z")
const T3 = tarea(3, "2030-01-12T16:00:00.000Z")
const T2 = tarea(2, "2030-01-05T16:00:00.000Z")
const T1 = tarea(1, "2030-01-01T16:00:00.000Z")
const TODAS = [T4, T3, T2, T1]

interface AlumnoDePrueba {
  alumno: AlumnoDeExportacion
  porcentaje: number | null
}

const alumnoDePrueba = (n: number, porcentaje: number | null): AlumnoDePrueba => ({
  alumno: {
    id: uuid(300 + n),
    nombre: `Alumno ${String(n)}`,
    email: `alumno${String(n)}@ejemplo.mx`,
  },
  porcentaje,
})
const A = alumnoDePrueba(1, 85)
const B = alumnoDePrueba(2, null)

// La celda de un alumno en una tarea: calificada con un número que dice cuál es.
const filaDe = (a: AlumnoDePrueba, tareas: readonly ColumnaDelGradebook[]): FilaDeExportacion => ({
  alumno: a.alumno,
  celdas: tareas.map((t) => ({
    tareaId: t.id,
    estado: "calificado",
    conRetraso: false,
    calificacion: Number(a.alumno.id.slice(-1)) + Number(t.id.slice(-1)) / 10,
  })),
  porcentaje: a.porcentaje,
})

const respuesta = (
  tareas: readonly ColumnaDelGradebook[],
  alumnos: readonly AlumnoDePrueba[],
  cambios: Partial<ExportacionDeCalificacionesRespuesta> = {},
): ExportacionDeCalificacionesRespuesta => ({
  clase: { nombre: "Historia" },
  tareas: [...tareas],
  siguienteCursorTareas: null,
  totalTareas: 4,
  alumnos: alumnos.map((a) => filaDe(a, tareas)),
  siguienteCursor: null,
  totalAlumnos: 2,
  ...cambios,
})

const ventana = (
  ventanaDeTareas: number,
  r: ExportacionDeCalificacionesRespuesta,
): VentanaDeExportacion => ({ ventanaDeTareas, respuesta: r })

// 2 ventanas de tareas × 2 páginas de un alumno.
const dosPorDos = (): VentanaDeExportacion[] => [
  ventana(0, respuesta([T4, T3], [A])),
  ventana(0, respuesta([T4, T3], [B])),
  ventana(1, respuesta([T2, T1], [A])),
  ventana(1, respuesta([T2, T1], [B])),
]

describe("combinar las ventanas (CAL2-B04)", () => {
  it("CAL2-B04: una sola respuesta da la matriz, con las columnas de la más antigua a la más reciente y las celdas en ese orden; 2 × 2 ventanas dan la misma matriz", () => {
    const una = combinarVentanasDeExportacion([ventana(0, respuesta(TODAS, [A, B]))])
    expect(una.tipo).toBe("matriz")
    const matriz = una.tipo === "matriz" ? una.matriz : null
    expect(matriz?.clase).toBe("Historia")
    expect(matriz?.columnas.map((c) => c.id)).toEqual([T1.id, T2.id, T3.id, T4.id])
    expect(matriz?.filas.map((f) => f.alumno)).toEqual([A.alumno, B.alumno])
    expect(matriz?.filas.map((f) => f.porcentaje)).toEqual([85, null])
    for (const fila of matriz?.filas ?? []) {
      expect(fila.celdas.map((c) => c.tareaId)).toEqual([T1.id, T2.id, T3.id, T4.id])
    }
    expect(matriz?.filas[0]?.celdas.map((c) => c.calificacion)).toEqual([1.1, 1.2, 1.3, 1.4])
    expect(combinarVentanasDeExportacion(dosPorDos())).toEqual(una)
  })

  it("CAL2-B04: cada regla de §D-4 da cambio con su propio caso", () => {
    const casos: [string, VentanaDeExportacion[]][] = [
      [
        "1: otro nombre de clase",
        dosPorDos().map((v, i) =>
          i === 3 ? ventana(1, { ...v.respuesta, clase: { nombre: "Otra" } }) : v,
        ),
      ],
      [
        "1: otro total de alumnos",
        dosPorDos().map((v, i) => (i === 2 ? ventana(1, { ...v.respuesta, totalAlumnos: 3 }) : v)),
      ],
      [
        "1: otro total de tareas",
        dosPorDos().map((v, i) => (i === 1 ? ventana(0, { ...v.respuesta, totalTareas: 5 }) : v)),
      ],
      [
        "2: otras tareas dentro de una ventana",
        [
          ventana(0, respuesta([T4, T3], [A])),
          ventana(0, respuesta([T4, T2], [B])),
          ventana(1, respuesta([T2, T1], [A])),
          ventana(1, respuesta([T2, T1], [B])),
        ],
      ],
      [
        "3: una celda desalineada",
        [
          ventana(0, {
            ...respuesta(TODAS, [A, B]),
            alumnos: [filaDe(A, [T3, T4, T2, T1]), filaDe(B, TODAS)],
          }),
        ],
      ],
      [
        "3: una celda de menos",
        [
          ventana(0, {
            ...respuesta(TODAS, [A, B]),
            alumnos: [filaDe(A, [T4, T3, T2]), filaDe(B, TODAS)],
          }),
        ],
      ],
      [
        "4: otros alumnos en la segunda ventana",
        [
          ventana(0, respuesta([T4, T3], [A, B])),
          ventana(1, respuesta([T2, T1], [A, alumnoDePrueba(3, 70)])),
        ],
      ],
      [
        "4: otro orden en la segunda ventana",
        [ventana(0, respuesta([T4, T3], [A, B])), ventana(1, respuesta([T2, T1], [B, A]))],
      ],
      [
        "4: otro nombre en la segunda ventana",
        [
          ventana(0, respuesta([T4, T3], [A, B])),
          ventana(1, respuesta([T2, T1], [{ ...A, alumno: { ...A.alumno, nombre: "Otro" } }, B])),
        ],
      ],
      [
        "4: otra dirección en la segunda ventana",
        [
          ventana(0, respuesta([T4, T3], [A, B])),
          ventana(
            1,
            respuesta([T2, T1], [{ ...A, alumno: { ...A.alumno, email: "otra@ejemplo.mx" } }, B]),
          ),
        ],
      ],
      [
        "4: otro porcentaje en la segunda ventana",
        [
          ventana(0, respuesta([T4, T3], [A, B])),
          ventana(1, respuesta([T2, T1], [{ ...A, porcentaje: 90 }, B])),
        ],
      ],
      [
        "5: una tarea repetida entre ventanas",
        [ventana(0, respuesta([T4, T3], [A, B])), ventana(1, respuesta([T3, T2, T1], [A, B]))],
      ],
      [
        "6: los totales no cuadran con lo recorrido",
        [ventana(0, respuesta([T4, T3, T2], [A, B], { totalTareas: 4 }))],
      ],
      [
        "6: un alumno de más en el total",
        [ventana(0, respuesta(TODAS, [A, B], { totalAlumnos: 3 }))],
      ],
    ]
    for (const [nombre, ventanas] of casos) {
      expect(combinarVentanasDeExportacion(ventanas), nombre).toEqual({ tipo: "cambio" })
    }
  })

  it("CAL2-B04: sin alumnos o sin tareas da vacio", () => {
    expect(
      combinarVentanasDeExportacion([ventana(0, respuesta(TODAS, [], { totalAlumnos: 0 }))]),
    ).toEqual({ tipo: "vacio" })
    expect(
      combinarVentanasDeExportacion([ventana(0, respuesta([], [A, B], { totalTareas: 0 }))]),
    ).toEqual({ tipo: "vacio" })
  })

  it("CAL2-B04: mismoAlumnoDeExportacion da false con id, nombre, dirección o porcentaje distinto (incluido null frente a un número) y true con los cuatro iguales", () => {
    const base = filaDe(A, TODAS)
    expect(mismoAlumnoDeExportacion(base, filaDe(A, [T1]))).toBe(true)
    const distintas: FilaDeExportacion[] = [
      { ...base, alumno: { ...base.alumno, id: uuid(399) } },
      { ...base, alumno: { ...base.alumno, nombre: "Otro" } },
      { ...base, alumno: { ...base.alumno, email: "otra@ejemplo.mx" } },
      { ...base, porcentaje: 84 },
      { ...base, porcentaje: null },
    ]
    for (const otra of distintas) expect(mismoAlumnoDeExportacion(base, otra)).toBe(false)
    expect(mismoAlumnoDeExportacion(filaDe(B, TODAS), filaDe(B, [T2]))).toBe(true)
  })

  it("CAL2-B04: ventanasDeLaExportacion da 1 con 0 × 0, 1 × 1 y 100 × 100; 2 con 101 × 100; 4 con 101 × 101 y 201 con 20,100 × 100", () => {
    expect(ventanasDeLaExportacion(0, 0, 100)).toBe(1)
    expect(ventanasDeLaExportacion(1, 1, 100)).toBe(1)
    expect(ventanasDeLaExportacion(100, 100, 100)).toBe(1)
    expect(ventanasDeLaExportacion(101, 100, 100)).toBe(2)
    expect(ventanasDeLaExportacion(101, 101, 100)).toBe(4)
    expect(ventanasDeLaExportacion(20100, 100, 100)).toBe(201)
  })
})

// Dos tareas: una venció hace un minuto (con categoría) y otra vence en un minuto.
const VENCIDA: ColumnaDelGradebook = {
  id: uuid(501),
  titulo: "Ensayo",
  fechaLimite: new Date(AHORA.getTime() - UN_MINUTO).toISOString(),
  puntos: 10,
  categoria: { id: uuid(601), nombre: "Proyectos" },
}
const POR_VENCER: ColumnaDelGradebook = {
  id: uuid(502),
  titulo: "Examen",
  fechaLimite: new Date(AHORA.getTime() + UN_MINUTO).toISOString(),
  puntos: 20,
  categoria: null,
}

const matrizDeLaHoja = (): MatrizDeExportacion => ({
  clase: "Historia",
  columnas: [VENCIDA, POR_VENCER],
  filas: [
    {
      alumno: { id: uuid(301), nombre: "Ana Ruiz", email: "ana@ejemplo.mx" },
      celdas: [
        { tareaId: VENCIDA.id, estado: "calificado", conRetraso: true, calificacion: 8.5 },
        { tareaId: POR_VENCER.id, estado: "calificado", conRetraso: false, calificacion: 7 },
      ],
      porcentaje: 82.4,
    },
    {
      alumno: { id: uuid(302), nombre: "Beto Díaz", email: "beto@ejemplo.mx" },
      celdas: [
        { tareaId: VENCIDA.id, estado: "entregado", conRetraso: false, calificacion: null },
        { tareaId: POR_VENCER.id, estado: "entregado", conRetraso: true, calificacion: null },
      ],
      porcentaje: null,
    },
    {
      alumno: { id: uuid(303), nombre: "Carla Gómez", email: "carla@ejemplo.mx" },
      celdas: [
        { tareaId: VENCIDA.id, estado: "asignado", conRetraso: false, calificacion: null },
        { tareaId: POR_VENCER.id, estado: "asignado", conRetraso: false, calificacion: null },
      ],
      porcentaje: 0,
    },
  ],
})

const n = (valor: number, negrita?: true) =>
  negrita ? { tipo: "numero", valor, negrita } : { tipo: "numero", valor }
const t = (valor: string, negrita?: true) =>
  negrita ? { tipo: "texto", valor, negrita } : { tipo: "texto", valor }
const VACIA = { tipo: "vacia" }

describe("la hoja (CAL2-B05)", () => {
  it("CAL2-B05: las tres filas de encabezado en negrita, Sin categoría, los puntos como número, las calificaciones como número, los estados según ahora y el promedio como número o —", () => {
    expect(filasDeLaHojaDeExportacion(matrizDeLaHoja(), AHORA)).toEqual([
      [
        t("Alumno", true),
        t("Correo", true),
        t("Ensayo", true),
        t("Examen", true),
        t("Promedio (%)", true),
      ],
      [t("Categoría", true), VACIA, t("Proyectos", true), t("Sin categoría", true), VACIA],
      [t("Puntos", true), VACIA, n(10, true), n(20, true), VACIA],
      [t("Ana Ruiz"), t("ana@ejemplo.mx"), n(8.5), n(7), n(82.4)],
      [t("Beto Díaz"), t("beto@ejemplo.mx"), t("Entregado"), t("Entregado con retraso"), t("—")],
      [t("Carla Gómez"), t("carla@ejemplo.mx"), t("Sin entregar"), t("Asignado"), n(0)],
    ])
  })

  it("CAL2-B05: una fila con campos de más (estado de pago y restricción forzados) no los lleva a ninguna celda", () => {
    const matriz = matrizDeLaHoja()
    const forzada = {
      ...matriz.filas[0],
      alumno: { ...matriz.filas[0]?.alumno, estadoPago: "Deudor", accesoRestringido: true },
      estadoPago: "Deudor",
    } as unknown as MatrizDeExportacion["filas"][number]
    const filas = filasDeLaHojaDeExportacion({ ...matriz, filas: [forzada] }, AHORA)
    const valores = filas.flat().map((celda) => ("valor" in celda ? String(celda.valor) : ""))
    expect(valores).not.toContain("Deudor")
    expect(valores).not.toContain("true")
    expect(filas[3]).toHaveLength(5)
  })

  it("CAL2-B05: hojaDeExportacion: nombre, anchos y panel inmovilizado de §D-5.2", () => {
    const hoja = hojaDeExportacion(matrizDeLaHoja(), AHORA)
    expect(hoja.nombre).toBe("Calificaciones")
    expect(hoja.anchos).toEqual([32, 36, 16, 16, 14])
    expect(hoja.inmovilizar).toEqual({ filas: 3, columnas: 2 })
    expect(hoja.filas).toEqual(filasDeLaHojaDeExportacion(matrizDeLaHoja(), AHORA))
  })

  it("CAL2-B05: una celda calificada sin calificación y una entregada con calificación lanzan", () => {
    const conCelda = (celda: MatrizDeExportacion["filas"][number]["celdas"][number]) => {
      const matriz = matrizDeLaHoja()
      const [ana] = matriz.filas
      expect(ana, "Precondición: la matriz tiene filas").toBeDefined()
      return {
        ...matriz,
        filas: [{ ...(ana as (typeof matriz.filas)[number]), celdas: [celda, celda] }],
      }
    }
    expect(() =>
      filasDeLaHojaDeExportacion(
        conCelda({
          tareaId: VENCIDA.id,
          estado: "calificado",
          conRetraso: false,
          calificacion: null,
        }),
        AHORA,
      ),
    ).toThrow(Error)
    expect(() =>
      filasDeLaHojaDeExportacion(
        conCelda({ tareaId: VENCIDA.id, estado: "entregado", conRetraso: false, calificacion: 5 }),
        AHORA,
      ),
    ).toThrow(Error)
  })
})

describe("el nombre del archivo (CAL2-B06)", () => {
  // A las 23:30 del 10 de enero en la zona del proceso: la fecha es la de ese día local.
  const NOCHE = new Date(2030, 0, 10, 23, 30)

  it("CAL2-B06: la forma de §D-6 con la fecha local", () => {
    vi.setSystemTime(NOCHE)
    expect(nombreDelArchivoDeExportacion("Matemáticas I", new Date())).toBe(
      "Calificaciones - Matemáticas I - 2030-01-10.xlsx",
    )
  })

  it("CAL2-B06: los reservados, los de control y los de dirección pasan a espacio y los espacios se colapsan; puntos y espacios finales fuera", () => {
    const sucio = 'a\\b/c:d*e?f"g<h>i|j\u0000k\u001Fl\u007Fm\u202En\u2066o'
    expect(nombreDelArchivoDeExportacion(sucio, NOCHE)).toBe(
      "Calificaciones - a b c d e f g h i j k l m n o - 2030-01-10.xlsx",
    )
    expect(nombreDelArchivoDeExportacion("  Física   II .. . ", NOCHE)).toBe(
      "Calificaciones - Física II - 2030-01-10.xlsx",
    )
  })

  it("CAL2-B06: una clase de 120 caracteres se recorta a 80 sin partir un emoji del borde", () => {
    const enElBorde = `${"a".repeat(79)}\u{1F600}${"b".repeat(40)}`
    expect(Array.from(enElBorde)).toHaveLength(120)
    expect(nombreDelArchivoDeExportacion(enElBorde, NOCHE)).toBe(
      `Calificaciones - ${"a".repeat(79)}\u{1F600} - 2030-01-10.xlsx`,
    )
    const despues = `${"a".repeat(80)}\u{1F600}${"b".repeat(39)}`
    const nombre = nombreDelArchivoDeExportacion(despues, NOCHE)
    expect(nombre).toBe(`Calificaciones - ${"a".repeat(80)} - 2030-01-10.xlsx`)
    for (const caracter of nombre) {
      const punto = caracter.codePointAt(0) ?? 0
      expect(punto >= 0xd800 && punto <= 0xdfff, "un sustituto suelto").toBe(false)
    }
  })

  it("CAL2-B06: una clase que queda vacía da el nombre sin clase; siempre termina en .xlsx y nunca lleva U+202E", () => {
    for (const clase of ["", "...", " . ", "\u202E", "/:*", "\u0007"]) {
      const nombre = nombreDelArchivoDeExportacion(clase, NOCHE)
      expect(nombre, JSON.stringify(clase)).toBe("Calificaciones - 2030-01-10.xlsx")
    }
    for (const clase of ["Tarea\u202Excod.exe", "Historia", "a\u202E"]) {
      const nombre = nombreDelArchivoDeExportacion(clase, NOCHE)
      expect(nombre.endsWith(".xlsx")).toBe(true)
      expect(nombre).not.toContain("\u202E")
    }
  })
})

describe("el nombre del archivo sin partir grafemas (CAL2-B06, T-01)", () => {
  const NOCHE = new Date(2030, 0, 10, 23, 30)
  const punto = (n: number) => String.fromCodePoint(n)
  const ZWJ = punto(0x200d)
  const BANDERA = `${punto(0x1f1f2)}${punto(0x1f1fd)}`
  const FAMILIA = [punto(0x1f468), punto(0x1f469), punto(0x1f467)].join(ZWJ)
  const TECLA = `1${punto(0xfe0f)}${punto(0x20e3)}`
  const PULGAR = `${punto(0x1f44d)}${punto(0x1f3fd)}`
  const nombreCon = (clase: string) =>
    nombreDelArchivoDeExportacion(clase, NOCHE).slice(
      "Calificaciones - ".length,
      -" - 2030-01-10.xlsx".length,
    )

  it("CAL2-B06: una bandera, una familia con ZWJ, una tecla con número y un tono de piel que cruzan el punto de código 80 se quitan enteros", () => {
    expect(Array.from(FAMILIA)).toHaveLength(5)
    for (const [nombre, grafema] of [
      ["bandera", BANDERA],
      ["familia", FAMILIA],
      ["tecla", TECLA],
      ["tono de piel", PULGAR],
    ] as const) {
      const largo = Array.from(grafema).length
      const antes = "a".repeat(80 - largo + 1)
      expect(nombreCon(`${antes}${grafema}z`), nombre).toBe(antes)
    }
  })

  it("CAL2-B06: el mismo grafema que termina justo en el punto de código 80 se conserva entero", () => {
    for (const grafema of [BANDERA, FAMILIA, TECLA, PULGAR, punto(0x1f600)]) {
      const antes = "a".repeat(80 - Array.from(grafema).length)
      const recortado = nombreCon(`${antes}${grafema}zzz`)
      expect(recortado).toBe(`${antes}${grafema}`)
      expect(Array.from(recortado)).toHaveLength(80)
    }
  })

  it("CAL2-B06: un punto o un espacio que queda al final tras el recorte se quita; una clase que es un solo grafema de más de 80 puntos de código da el nombre sin clase", () => {
    expect(nombreCon(`${"a".repeat(77)}. ${BANDERA}`)).toBe("a".repeat(77))
    const enorme = `e${punto(0x301).repeat(85)}`
    expect(Array.from(enorme)).toHaveLength(86)
    expect(nombreDelArchivoDeExportacion(enorme, NOCHE)).toBe("Calificaciones - 2030-01-10.xlsx")
  })

  it("CAL2-B06: sin Intl.Segmenter recorta por puntos de código, sin partir un par sustituto y sin lanzar", () => {
    const original = Intl.Segmenter
    Object.defineProperty(Intl, "Segmenter", {
      value: undefined,
      configurable: true,
      writable: true,
    })
    try {
      const clase = `${"a".repeat(79)}${BANDERA}z`
      const recortado = nombreCon(clase)
      expect(recortado).toBe(`${"a".repeat(79)}${punto(0x1f1f2)}`)
      for (const caracter of recortado) {
        const cp = caracter.codePointAt(0) ?? 0
        expect(cp >= 0xd800 && cp <= 0xdfff).toBe(false)
      }
    } finally {
      Object.defineProperty(Intl, "Segmenter", {
        value: original,
        configurable: true,
        writable: true,
      })
    }
    expect(Intl.Segmenter).toBe(original)
  })
})

describe("la hoja cabe en los topes de Excel (CAL2-B04, T-02)", () => {
  it("CAL2-B04: cabeEnUnaHoja: 16,381 tareas caben y 16,382 no, con 1 alumno y con 0", () => {
    for (const alumnos of [0, 1]) {
      expect(cabeEnUnaHoja(alumnos, 16_381), String(alumnos)).toBe(true)
      expect(cabeEnUnaHoja(alumnos, 16_382), String(alumnos)).toBe(false)
    }
    expect(cabeEnUnaHoja(20_000, 100)).toBe(true)
    expect(cabeEnUnaHoja(1_048_573, 1)).toBe(true)
    expect(cabeEnUnaHoja(1_048_574, 1)).toBe(false)
  })

  it("CAL2-B05: (T-02) hojaDeExportacion lanza antes de armar las filas si la matriz no cabe: 16,382 columnas lanzan y 16,381 no", () => {
    const columnas = (n: number): ColumnaDelGradebook[] =>
      Array.from({ length: n }, (_, i) => ({ ...T1, id: uuid(10_000 + i) }))
    const matriz = (n: number): MatrizDeExportacion => ({
      clase: "Muchas",
      columnas: columnas(n),
      filas: [],
    })
    expect(() => hojaDeExportacion(matriz(16_382), AHORA)).toThrow(Error)
    expect(hojaDeExportacion(matriz(16_381), AHORA).anchos).toHaveLength(16_384)
  })
})

describe("el texto de un error (CAL2-B07)", () => {
  const validacion = (mensaje: string) => new ApiError("VALIDACION", mensaje, 400)
  const { generico, cambio } = MENSAJES_ERROR_EXPORTACION
  const sinAcceso = MENSAJES_ERROR_CALIFICACIONES.sinAcceso

  it("CAL2-B07: las entradas fuera de contrato dan el genérico; los restos sin texto visible dan el genérico tras un campo cualquiera y el de sin acceso tras claseId", () => {
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      expect(mensajeDeErrorDeExportacion(validacion(entrada.mensaje)), entrada.mensaje).toBe(
        generico,
      )
    }
    for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
      expect(mensajeDeErrorDeExportacion(validacion(`campoFueraDeContrato:${resto}`))).toBe(
        generico,
      )
      expect(mensajeDeErrorDeExportacion(validacion(`claseId:${resto}`))).toBe(sinAcceso)
    }
  })

  it("CAL2-B07: el 400 de cursor o de cursorTareas da el de cambio; SIN_ACCESO_A_LA_CLASE el de sin acceso; 500, 503, sin conexión, respuesta inválida y un código desconocido el genérico, nunca el texto del servidor", () => {
    expect(mensajeDeErrorDeExportacion(validacion("cursor: no es válido"))).toBe(cambio)
    expect(mensajeDeErrorDeExportacion(validacion("cursorTareas: no es válido"))).toBe(cambio)
    expect(
      mensajeDeErrorDeExportacion(new ApiError("SIN_ACCESO_A_LA_CLASE", "Sin acceso x", 403)),
    ).toBe(sinAcceso)
    const otros = [
      new ApiError("ERROR_INTERNO", "Algo falló adentro", 500),
      new ApiError("SERVICIO_OCUPADO", "El servicio está ocupado.", 503),
      new ApiError("SERVICIO_OCUPADO", "", 503),
      new ApiError("SIN_CONEXION", "No pudimos conectar con el servidor.", 0),
      new ApiError("RESPUESTA_INVALIDA", "La respuesta no tiene el formato esperado.", 200),
      new ApiError("CODIGO_DESCONOCIDO", "Mensaje raro del servidor", 418),
      new Error("Una celda calificada no tiene calificación"),
    ]
    for (const error of otros) {
      const texto = mensajeDeErrorDeExportacion(error)
      expect(texto, error.message).toBe(generico)
      if (error.message !== "") expect(texto).not.toContain(error.message)
    }
  })
})
