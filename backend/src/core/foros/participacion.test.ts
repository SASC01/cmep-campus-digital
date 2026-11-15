import { describe, expect, it } from "vitest"

import { exigirEntregaCalificable } from "../calificaciones/calificar.js"
import type { EstadoEntrega } from "../entregas/entregas.js"
import {
  accionesDelForo,
  decidirParticipacionPrincipal,
  decidirReplica,
  reglaDeParticipacion,
  verRetrasoDe,
  type TipoDeParticipacion,
} from "./participacion.js"

const LIMITE = new Date("2026-11-20T12:00:00.000Z")
const ANTES = new Date(LIMITE.getTime() - 60_000)
const EXACTO = new Date(LIMITE.getTime())
const DESPUES = new Date(LIMITE.getTime() + 1)

const INSTANTES = [
  { nombre: "antes de la fecha", ahora: ANTES },
  { nombre: "en el milisegundo exacto", ahora: EXACTO },
  { nombre: "un milisegundo después", ahora: DESPUES },
] as const

const TIPOS: readonly TipoDeParticipacion[] = ["principal", "replica"]
const ESTADOS: readonly EstadoEntrega[] = ["asignado", "entregado", "calificado"]

const foroCon = (aceptaTardias: boolean) => ({ fechaLimite: LIMITE, aceptaTardias })

// Lo que FORO-1A01 espera para el alumno: con tardías, siempre abierta y con retraso solo después;
// sin tardías, cerrada después (y con retraso).
const esperadoDelAlumno = (aceptaTardias: boolean, ahora: Date) => {
  const despues = ahora.getTime() > LIMITE.getTime()
  return { abierta: aceptaTardias || !despues, conRetraso: despues }
}

// Todas las combinaciones de FORO-1A01: tardías × instante.
const COMBINACIONES = [true, false].flatMap((aceptaTardias) =>
  INSTANTES.map(({ nombre, ahora }) => ({ aceptaTardias, nombre, ahora })),
)

const capturar = (accion: () => unknown): unknown => {
  try {
    accion()
  } catch (error) {
    return error
  }
  return null
}

describe("FORO-1A01: reglaDeParticipacion, la tabla completa con el valor por omisión", () => {
  it("FORO-1A01: el alumno, en la principal y en la réplica, antes, en el milisegundo exacto y un milisegundo después, con y sin tardías", () => {
    expect(COMBINACIONES).toHaveLength(6)
    for (const tipo of TIPOS) {
      for (const { aceptaTardias, nombre, ahora } of COMBINACIONES) {
        expect(
          reglaDeParticipacion({
            tipo,
            rolDelAutor: "estudiante",
            foro: foroCon(aceptaTardias),
            ahora,
          }),
          `${tipo}, tardías ${String(aceptaTardias)}, ${nombre}`,
        ).toEqual(esperadoDelAlumno(aceptaTardias, ahora))
      }
    }
    // Las filas que el plan escribe a mano, para que la tabla no dependa solo de la ayuda.
    const sin = foroCon(false)
    const con = foroCon(true)
    const alumno = (foro: typeof sin, ahora: Date) =>
      reglaDeParticipacion({ tipo: "principal", rolDelAutor: "estudiante", foro, ahora })
    expect(alumno(con, ANTES)).toEqual({ abierta: true, conRetraso: false })
    expect(alumno(con, EXACTO)).toEqual({ abierta: true, conRetraso: false })
    expect(alumno(con, DESPUES)).toEqual({ abierta: true, conRetraso: true })
    expect(alumno(sin, ANTES)).toEqual({ abierta: true, conRetraso: false })
    expect(alumno(sin, EXACTO)).toEqual({ abierta: true, conRetraso: false })
    expect(alumno(sin, DESPUES)).toEqual({ abierta: false, conRetraso: true })
  })

  it("FORO-1A01: el maestro, siempre abierta y sin retraso, también después en un foro sin tardías", () => {
    for (const tipo of TIPOS) {
      for (const { aceptaTardias, ahora } of COMBINACIONES) {
        expect(
          reglaDeParticipacion({
            tipo,
            rolDelAutor: "maestro",
            foro: foroCon(aceptaTardias),
            ahora,
          }),
        ).toEqual({ abierta: true, conRetraso: false })
      }
    }
  })

  it("FORO-1A01: el admin, siempre cerrada y sin retraso", () => {
    for (const tipo of TIPOS) {
      for (const { aceptaTardias, ahora } of COMBINACIONES) {
        expect(
          reglaDeParticipacion({ tipo, rolDelAutor: "admin", foro: foroCon(aceptaTardias), ahora }),
        ).toEqual({ abierta: false, conRetraso: false })
      }
    }
  })
})

describe("FORO-1A02: decidirParticipacionPrincipal", () => {
  it("FORO-1A02: el orden de los errores: YA_PUBLICADA antes que CALIFICADA antes que FORO_CERRADO", () => {
    const cerrado = { foro: foroCon(false), ahora: DESPUES }
    // Con todo a la vez (publicó, está calificada y el foro cerró): YA_PUBLICADA.
    expect(
      capturar(() =>
        decidirParticipacionPrincipal({ ...cerrado, estado: "calificado", fechaEntrega: ANTES }),
      ),
    ).toMatchObject({ codigo: "PARTICIPACION_YA_PUBLICADA", estado: 409 })
    // Calificado sin fechaEntrega y cerrado: CALIFICADA.
    expect(
      capturar(() =>
        decidirParticipacionPrincipal({ ...cerrado, estado: "calificado", fechaEntrega: null }),
      ),
    ).toMatchObject({ codigo: "PARTICIPACION_CALIFICADA", estado: 409 })
    // Asignado y cerrado: FORO_CERRADO.
    expect(
      capturar(() =>
        decidirParticipacionPrincipal({ ...cerrado, estado: "asignado", fechaEntrega: null }),
      ),
    ).toMatchObject({ codigo: "FORO_CERRADO", estado: 409 })
  })

  it("FORO-1A02: calificado con fechaEntrega es YA_PUBLICADA y sin ella es CALIFICADA, aunque el foro esté abierto", () => {
    const abierto = { foro: foroCon(true), ahora: ANTES }
    expect(
      capturar(() =>
        decidirParticipacionPrincipal({ ...abierto, estado: "calificado", fechaEntrega: ANTES }),
      ),
    ).toMatchObject({ codigo: "PARTICIPACION_YA_PUBLICADA" })
    expect(
      capturar(() =>
        decidirParticipacionPrincipal({ ...abierto, estado: "calificado", fechaEntrega: null }),
      ),
    ).toMatchObject({ codigo: "PARTICIPACION_CALIFICADA" })
  })

  it("FORO-1A02: sin principal y con el foro abierto, devuelve el conRetraso de la regla", () => {
    for (const { aceptaTardias, nombre, ahora } of COMBINACIONES) {
      const foro = foroCon(aceptaTardias)
      const regla = reglaDeParticipacion({
        tipo: "principal",
        rolDelAutor: "estudiante",
        foro,
        ahora,
      })
      const resultado = capturar(() =>
        decidirParticipacionPrincipal({ foro, estado: "asignado", fechaEntrega: null, ahora }),
      )
      if (!regla.abierta) {
        expect(resultado, nombre).toMatchObject({ codigo: "FORO_CERRADO" })
        continue
      }
      expect(resultado, nombre).toBeNull()
      expect(
        decidirParticipacionPrincipal({ foro, estado: "asignado", fechaEntrega: null, ahora }),
        nombre,
      ).toEqual({ conRetraso: regla.conRetraso })
    }
  })
})

describe("FORO-1A03: decidirReplica", () => {
  it("FORO-1A03: el alumno con el foro cerrado recibe FORO_CERRADO", () => {
    expect(
      capturar(() =>
        decidirReplica({ foro: foroCon(false), rolDelAutor: "estudiante", ahora: DESPUES }),
      ),
    ).toMatchObject({ codigo: "FORO_CERRADO", estado: 409 })
  })

  it("FORO-1A03: el maestro nunca recibe FORO_CERRADO y replica sin retraso", () => {
    for (const { aceptaTardias, ahora } of COMBINACIONES) {
      expect(
        decidirReplica({ foro: foroCon(aceptaTardias), rolDelAutor: "maestro", ahora }),
      ).toEqual({ conRetraso: false })
    }
  })

  it("FORO-1A03: el alumno con el foro abierto recibe el conRetraso de la regla", () => {
    for (const { aceptaTardias, nombre, ahora } of COMBINACIONES) {
      const foro = foroCon(aceptaTardias)
      const regla = reglaDeParticipacion({
        tipo: "replica",
        rolDelAutor: "estudiante",
        foro,
        ahora,
      })
      if (!regla.abierta) continue
      expect(decidirReplica({ foro, rolDelAutor: "estudiante", ahora }), nombre).toEqual({
        conRetraso: regla.conRetraso,
      })
    }
    expect(
      decidirReplica({ foro: foroCon(true), rolDelAutor: "estudiante", ahora: DESPUES }),
    ).toEqual({ conRetraso: true })
  })
})

describe("FORO-1A04: accionesDelForo coincide con las dos decisiones", () => {
  it("FORO-1A04: en cada combinación de FORO-1A01 × estado (con y sin principal), sin lanzar", () => {
    let casos = 0
    for (const { aceptaTardias, nombre, ahora } of COMBINACIONES) {
      const foro = foroCon(aceptaTardias)
      for (const estado of ESTADOS) {
        for (const fechaEntrega of [null, ANTES]) {
          const etiqueta = `${nombre}, tardías ${String(aceptaTardias)}, ${estado}, ${fechaEntrega === null ? "sin" : "con"} principal`
          const acciones = accionesDelForo({ foro, estado, fechaEntrega, ahora })
          const principal = capturar(() =>
            decidirParticipacionPrincipal({ foro, estado, fechaEntrega, ahora }),
          )
          const replica = capturar(() => decidirReplica({ foro, rolDelAutor: "estudiante", ahora }))
          expect(acciones.puedeParticipar, etiqueta).toBe(principal === null)
          expect(acciones.puedeReplicar, etiqueta).toBe(replica === null)
          casos += 1
        }
      }
    }
    expect(casos).toBe(36)
  })
})

describe("FORO-1A05: verRetrasoDe", () => {
  it("FORO-1A05: el estudiante solo en lo suyo; el maestro y el admin, siempre", () => {
    expect(verRetrasoDe({ relacion: "estudiante", esPropia: true })).toBe(true)
    expect(verRetrasoDe({ relacion: "estudiante", esPropia: false })).toBe(false)
    expect(verRetrasoDe({ relacion: "maestro", esPropia: false })).toBe(true)
    expect(verRetrasoDe({ relacion: "maestro", esPropia: true })).toBe(true)
    expect(verRetrasoDe({ relacion: "admin", esPropia: false })).toBe(true)
    expect(verRetrasoDe({ relacion: "admin", esPropia: true })).toBe(true)
  })
})

describe("FORO-1A06 (ii): la regla tardía vive en un solo lugar, por equivalencia", () => {
  it("FORO-1A06 (ii): exigirEntregaCalificable con «foro» lanza si y solo si el estado es asignado y la principal todavía está abierta", () => {
    let casos = 0
    for (const { aceptaTardias, nombre, ahora } of COMBINACIONES) {
      const tarea = foroCon(aceptaTardias)
      const abierta = reglaDeParticipacion({
        tipo: "principal",
        rolDelAutor: "estudiante",
        foro: tarea,
        ahora,
      }).abierta
      for (const estado of ESTADOS) {
        const error = capturar(() =>
          exigirEntregaCalificable({ estado, tarea, ahora, actividad: "foro" }),
        )
        const debeLanzar = estado === "asignado" && abierta
        expect(error === null, `${nombre}, tardías ${String(aceptaTardias)}, ${estado}`).toBe(
          !debeLanzar,
        )
        if (debeLanzar) expect(error).toMatchObject({ codigo: "ENTREGA_NO_CALIFICABLE" })
        casos += 1
      }
    }
    expect(casos).toBe(18)
  })

  it("FORO-1A06 (ii): accionesDelForo devuelve en participarConRetraso y replicarConRetraso el conRetraso de la regla", () => {
    for (const { aceptaTardias, nombre, ahora } of COMBINACIONES) {
      const foro = foroCon(aceptaTardias)
      for (const estado of ESTADOS) {
        const acciones = accionesDelForo({ foro, estado, fechaEntrega: null, ahora })
        expect(acciones.participarConRetraso, nombre).toBe(
          reglaDeParticipacion({ tipo: "principal", rolDelAutor: "estudiante", foro, ahora })
            .conRetraso,
        )
        expect(acciones.replicarConRetraso, nombre).toBe(
          reglaDeParticipacion({ tipo: "replica", rolDelAutor: "estudiante", foro, ahora })
            .conRetraso,
        )
      }
    }
  })
})
