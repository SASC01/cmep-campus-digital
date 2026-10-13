import {
  calificacionDeEntregaSchema,
  calificarEntregaSchema,
  entregaDeAlumnoSchema,
  miEntregaSchema,
  puntajeDeCriterioSchema,
  tieneHastaDosDecimales,
} from "@campus/shared"
import { describe, expect, it } from "vitest"

// CALIFICACIONES-01a (CAL-1A08). Los esquemas de shared/ se prueban aquí, porque shared/ no tiene
// corredor de pruebas (O-1 de la Enmienda 2 de ENTREGAS-01).

const CRITERIO_A = "aaaaaaaa-1c1f-4b8e-9a1e-0f2a3b4c5d6e"
const CRITERIO_B = "bbbbbbbb-1c1f-4b8e-9a1e-0f2a3b4c5d6e"

const cuerpo = (cambios: Record<string, unknown> = {}): Record<string, unknown> => ({
  version: 1,
  puntosDeLaTarea: 10,
  puntajes: [],
  calificacion: 8.5,
  ...cambios,
})

const conPuntos = (puntos: unknown) =>
  calificarEntregaSchema.safeParse(cuerpo({ puntajes: [{ criterioId: CRITERIO_A, puntos }] }))

describe("calificarEntregaSchema (CAL-1A08)", () => {
  it("CAL-1A08: es estricto y exige version, puntosDeLaTarea, puntajes y calificacion (que puede ser null)", () => {
    expect(calificarEntregaSchema.safeParse(cuerpo()).success).toBe(true)
    expect(calificarEntregaSchema.safeParse(cuerpo({ calificacion: null })).success).toBe(true)
    expect(calificarEntregaSchema.safeParse(cuerpo({ extra: 1 })).success).toBe(false)
    for (const llave of ["version", "puntosDeLaTarea", "puntajes", "calificacion"]) {
      const sinLlave = cuerpo()
      delete sinLlave[llave]
      expect(calificarEntregaSchema.safeParse(sinLlave).success, llave).toBe(false)
    }
  })

  it("CAL-1A08: version es un entero no negativo y puntosDeLaTarea un entero de 1 a 1000", () => {
    expect(calificarEntregaSchema.safeParse(cuerpo({ version: 0 })).success).toBe(true)
    expect(calificarEntregaSchema.safeParse(cuerpo({ version: -1 })).success).toBe(false)
    expect(calificarEntregaSchema.safeParse(cuerpo({ version: 1.5 })).success).toBe(false)
    expect(calificarEntregaSchema.safeParse(cuerpo({ version: "1" })).success).toBe(false)
    expect(calificarEntregaSchema.safeParse(cuerpo({ puntosDeLaTarea: 1 })).success).toBe(true)
    expect(calificarEntregaSchema.safeParse(cuerpo({ puntosDeLaTarea: 1000 })).success).toBe(true)
    expect(calificarEntregaSchema.safeParse(cuerpo({ puntosDeLaTarea: 0 })).success).toBe(false)
    expect(calificarEntregaSchema.safeParse(cuerpo({ puntosDeLaTarea: 1001 })).success).toBe(false)
    expect(calificarEntregaSchema.safeParse(cuerpo({ puntosDeLaTarea: 9.5 })).success).toBe(false)
    expect(calificarEntregaSchema.safeParse(cuerpo({ puntosDeLaTarea: "10" })).success).toBe(false)
  })

  it("CAL-1A08: los puntos negativos, NaN, Infinity, texto, con 3 decimales o de 1000.01 se rechazan; 0, 1000 y 2 decimales pasan", () => {
    for (const malo of [-0.01, -1, Number.NaN, Infinity, -Infinity, "5", 7.785, 1.005, 1000.01]) {
      expect(conPuntos(malo).success, String(malo)).toBe(false)
      expect(calificarEntregaSchema.safeParse(cuerpo({ calificacion: malo })).success).toBe(false)
    }
    for (const bueno of [0, 1000, 8.5, 7.25, 0.1, 0.29]) {
      expect(conPuntos(bueno).success, String(bueno)).toBe(true)
      expect(calificarEntregaSchema.safeParse(cuerpo({ calificacion: bueno })).success).toBe(true)
    }
  })

  it("CAL-1A08: un criterioId repetido (también en mayúsculas) se rechaza y los ids pasan a minúsculas", () => {
    const repetido = calificarEntregaSchema.safeParse(
      cuerpo({
        puntajes: [
          { criterioId: CRITERIO_A, puntos: 1 },
          { criterioId: CRITERIO_A.toUpperCase(), puntos: 2 },
        ],
      }),
    )
    expect(repetido.success).toBe(false)
    expect(repetido.error?.issues[0]?.message).toBe("No repitas un criterio")

    const datos = calificarEntregaSchema.parse(
      cuerpo({
        puntajes: [
          { criterioId: CRITERIO_A.toUpperCase(), puntos: 1 },
          { criterioId: CRITERIO_B, puntos: 2 },
        ],
      }),
    )
    expect(datos.puntajes.map((p) => p.criterioId)).toEqual([CRITERIO_A, CRITERIO_B])
    expect(conPuntos(1).success).toBe(true)
    expect(
      calificarEntregaSchema.safeParse(cuerpo({ puntajes: [{ criterioId: "no-uuid", puntos: 1 }] }))
        .success,
    ).toBe(false)
    expect(
      calificarEntregaSchema.safeParse(
        cuerpo({ puntajes: [{ criterioId: CRITERIO_A, puntos: 1, extra: true }] }),
      ).success,
    ).toBe(false)
  })

  it("CAL-1A08: más de 20 puntajes se rechazan", () => {
    const puntajes = Array.from({ length: 21 }, (_, i) => ({
      criterioId: `${String(i).padStart(8, "c")}-1c1f-4b8e-9a1e-0f2a3b4c5d6e`,
      puntos: 1,
    }))
    expect(calificarEntregaSchema.safeParse(cuerpo({ puntajes })).success).toBe(false)
    expect(
      calificarEntregaSchema.safeParse(cuerpo({ puntajes: puntajes.slice(0, 20) })).success,
    ).toBe(true)
  })

  it("CAL-1A08: el comentario es opcional; vacío, solo invisibles o de 1001 caracteres se rechaza", () => {
    expect(calificarEntregaSchema.safeParse(cuerpo({ comentario: "Buen trabajo" })).success).toBe(
      true,
    )
    expect(calificarEntregaSchema.safeParse(cuerpo({ comentario: "a".repeat(1000) })).success).toBe(
      true,
    )
    for (const malo of ["", "​​", "a".repeat(1001), 5]) {
      expect(calificarEntregaSchema.safeParse(cuerpo({ comentario: malo })).success).toBe(false)
    }
  })
})

describe("tieneHastaDosDecimales (CAL-1A08)", () => {
  it("CAL-1A08: 0.1 y 0.29 tienen hasta dos decimales; 1.005 y 7.785 no; NaN e Infinity tampoco", () => {
    expect(tieneHastaDosDecimales(0.1)).toBe(true)
    expect(tieneHastaDosDecimales(0.29)).toBe(true)
    expect(tieneHastaDosDecimales(1.005)).toBe(false)
    expect(tieneHastaDosDecimales(7.785)).toBe(false)
    expect(tieneHastaDosDecimales(Number.NaN)).toBe(false)
    expect(tieneHastaDosDecimales(Infinity)).toBe(false)
  })
})

describe("la calificación en las respuestas (CAL-1A08, CAL-1A18)", () => {
  const calificacion = {
    puntos: 7.78,
    sobre: 10,
    fecha: "2026-10-13T10:00:00.000Z",
    puntajes: [{ criterioId: CRITERIO_A, criterio: "Claridad", puntosMax: 9, puntos: 7 }],
  }

  it("CAL-1A18: calificacionDeEntregaSchema y puntajeDeCriterioSchema son estrictos", () => {
    expect(calificacionDeEntregaSchema.safeParse(calificacion).success).toBe(true)
    expect(calificacionDeEntregaSchema.safeParse({ ...calificacion, version: 1 }).success).toBe(
      false,
    )
    expect(
      puntajeDeCriterioSchema.safeParse({ ...calificacion.puntajes[0], orden: 0 }).success,
    ).toBe(false)
  })

  it("CAL-1A08: miEntregaSchema y entregaDeAlumnoSchema exigen calificacion (null o la calificación)", () => {
    const miEntrega = {
      estado: "calificado",
      fechaEntrega: "2026-10-12T10:00:00.000Z",
      conRetraso: false,
      enlaces: [],
      adjuntos: [],
      puedeEntregar: false,
      puedeAnular: false,
    }
    expect(miEntregaSchema.safeParse(miEntrega).success).toBe(false)
    expect(miEntregaSchema.safeParse({ ...miEntrega, calificacion: null }).success).toBe(true)
    expect(miEntregaSchema.safeParse({ ...miEntrega, calificacion }).success).toBe(true)

    const deAlumno = {
      alumno: { id: CRITERIO_B, nombre: "Ana" },
      estado: "calificado",
      fechaEntrega: null,
      conRetraso: false,
      enlaces: [],
      adjuntos: [],
      version: 2,
    }
    expect(entregaDeAlumnoSchema.safeParse(deAlumno).success).toBe(false)
    expect(entregaDeAlumnoSchema.safeParse({ ...deAlumno, calificacion }).success).toBe(true)
  })
})
