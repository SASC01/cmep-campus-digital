import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/services/apiClient"

import {
  CAMPOS_DE_CURSOR_DE_MIS_CALIFICACIONES,
  CAMPOS_DE_CURSOR_DEL_GRADEBOOK,
  MENSAJES_ERROR_CALIFICACIONES,
} from "./data"
import {
  enlaceAEntregaDeAlumno,
  enlaceATarea,
  esErrorDeCursorDeCalificaciones,
  mensajeDeErrorCalificaciones,
  rutaDeMisCalificaciones,
  rutaDelGradebook,
  textoDeCelda,
  textoDeMotivos,
  VENTANAS_INICIALES,
  ventanaAnterior,
  ventanaSiguiente,
} from "./lib"

// CALIFICACIONES-01d (§D-13.2; CAL-1D10 de la Enmienda 2): funciones puras del módulo. Reloj fijo.

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const R = "Respaldo del lugar."

const validacion = (mensaje: string) => new ApiError("VALIDACION", mensaje, 400)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("esErrorDeCursorDeCalificaciones (CAL-1D10)", () => {
  it.each([
    ["cursor: no es válido", true, true],
    ["cursorTareas: no es válido", true, false],
    ["cursor:", true, true],
    ["cursorTareas:   ", true, false],
  ])(
    "CAL-1D10: «%s» es cursor en el gradebook (%s) y en «Mis calificaciones» (%s)",
    (mensaje, enGradebook, enMisCalificaciones) => {
      const error = validacion(mensaje)
      expect(esErrorDeCursorDeCalificaciones(error, CAMPOS_DE_CURSOR_DEL_GRADEBOOK)).toBe(
        enGradebook,
      )
      expect(esErrorDeCursorDeCalificaciones(error, CAMPOS_DE_CURSOR_DE_MIS_CALIFICACIONES)).toBe(
        enMisCalificaciones,
      )
    },
  )

  it.each([
    "cursorTareas.0: no es válido",
    "cursor.0: x",
    " cursor: x",
    "Cursor: x",
    "",
    "   ",
    "Revisa este valor.",
  ])("CAL-1D10: «%s» no es cursor en ninguna de las dos vistas", (mensaje) => {
    const error = validacion(mensaje)
    expect(esErrorDeCursorDeCalificaciones(error, CAMPOS_DE_CURSOR_DEL_GRADEBOOK)).toBe(false)
    expect(esErrorDeCursorDeCalificaciones(error, CAMPOS_DE_CURSOR_DE_MIS_CALIFICACIONES)).toBe(
      false,
    )
  })

  it("CAL-1D10: un 500 con «cursor: x» y un error que no es ApiError no son cursor", () => {
    const interno = new ApiError("ERROR_INTERNO", "cursor: x", 500)
    const otro = new Error("cursor: x")
    for (const error of [interno, otro]) {
      expect(esErrorDeCursorDeCalificaciones(error, CAMPOS_DE_CURSOR_DEL_GRADEBOOK)).toBe(false)
      expect(esErrorDeCursorDeCalificaciones(error, CAMPOS_DE_CURSOR_DE_MIS_CALIFICACIONES)).toBe(
        false,
      )
    }
  })
})

describe("mensajeDeErrorCalificaciones (CAL-1D10)", () => {
  const fueraDeContrato = [
    "limiteTareas: Too big: expected number to be <=50",
    "limite: Too small: expected number to be >=1",
    'estado: Invalid option: expected one of "todas"|"asignadas"',
    "",
    "   ",
    "cursorTareas.0: no es válido",
    "alumnos.0.id: x",
    "Revisa este valor.",
  ]

  it.each(fueraDeContrato)("CAL-1D10: el VALIDACION «%s» da el respaldo", (mensaje) => {
    expect(mensajeDeErrorCalificaciones(validacion(mensaje), R)).toBe(R)
  })

  it("CAL-1D10: «claseId: Invalid UUID», «claseId:» sin mensaje y SIN_ACCESO_A_LA_CLASE dan el de sin acceso", () => {
    const sinAcceso = MENSAJES_ERROR_CALIFICACIONES.sinAcceso
    expect(mensajeDeErrorCalificaciones(validacion("claseId: Invalid UUID"), R)).toBe(sinAcceso)
    expect(mensajeDeErrorCalificaciones(validacion("claseId:"), R)).toBe(sinAcceso)
    const prohibido = new ApiError("SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.", 403)
    expect(mensajeDeErrorCalificaciones(prohibido, R)).toBe(sinAcceso)
  })

  it("CAL-1D10: un 500, un 503 y un error de red dan el respaldo", () => {
    expect(mensajeDeErrorCalificaciones(new ApiError("ERROR_INTERNO", "falló", 500), R)).toBe(R)
    expect(mensajeDeErrorCalificaciones(new ApiError("SERVICIO_OCUPADO", "ocupado", 503), R)).toBe(
      R,
    )
    expect(
      mensajeDeErrorCalificaciones(new ApiError("SIN_CONEXION", "No pudimos conectar.", 0), R),
    ).toBe(R)
  })

  it("CAL-1D10: con los respaldos reales, el resultado nunca es vacío ni contiene «:», «Too» ni el mensaje del servidor", () => {
    const respaldos = [
      MENSAJES_ERROR_CALIFICACIONES.gradebook,
      MENSAJES_ERROR_CALIFICACIONES.misCalificaciones,
      MENSAJES_ERROR_CALIFICACIONES.verMasTareas,
    ]
    const errores = [
      ...fueraDeContrato.map(validacion),
      validacion("claseId: Invalid UUID"),
      new ApiError("ERROR_INTERNO", "Error interno del servidor", 500),
      new ApiError("SIN_CONEXION", "No pudimos conectar con el servidor.", 0),
    ]
    for (const respaldo of respaldos) {
      for (const error of errores) {
        const texto = mensajeDeErrorCalificaciones(error, respaldo)
        expect(texto.trim()).not.toBe("")
        expect(texto).not.toContain(":")
        expect(texto).not.toContain("Too")
        if (error.message.trim() !== "") expect(texto).not.toContain(error.message)
      }
    }
  })
})

describe("rutas, celdas, motivos y ventanas del módulo (§D-13.2)", () => {
  it("rutaDelGradebook lleva los dos tamaños y solo los cursores que hay", () => {
    const limites = { limite: 25, limiteTareas: 20 }
    expect(rutaDelGradebook(CLASE_ID, { cursor: null, cursorTareas: null }, limites)).toBe(
      `/api/clases/${CLASE_ID}/gradebook?limite=25&limiteTareas=20`,
    )
    expect(rutaDelGradebook(CLASE_ID, { cursor: "a", cursorTareas: "t" }, limites)).toBe(
      `/api/clases/${CLASE_ID}/gradebook?limite=25&limiteTareas=20&cursor=a&cursorTareas=t`,
    )
  })

  it("rutaDeMisCalificaciones lleva el filtro, el tamaño y el cursor si lo hay", () => {
    expect(rutaDeMisCalificaciones(CLASE_ID, "calificadas", undefined, 20)).toBe(
      `/api/clases/${CLASE_ID}/mis-calificaciones?estado=calificadas&limite=20`,
    )
    expect(rutaDeMisCalificaciones(CLASE_ID, "sin-entregar", "c", 20)).toBe(
      `/api/clases/${CLASE_ID}/mis-calificaciones?estado=sin-entregar&limite=20&cursor=c`,
    )
  })

  it("textoDeCelda: calificación, Entregado, Entregado con retraso, Sin entregar y «—» con «Asignado» para el lector", () => {
    const futura = "2030-01-15T16:00:00.000Z"
    const pasada = "2030-01-05T16:00:00.000Z"
    const celda = { tareaId: "t", conRetraso: false, calificacion: null }
    expect(
      textoDeCelda(
        { ...celda, estado: "calificado", calificacion: 8.5, conRetraso: true },
        futura,
        AHORA,
      ),
    ).toEqual({ visible: "8.5", soloLector: null, conRetraso: true })
    expect(textoDeCelda({ ...celda, estado: "entregado" }, futura, AHORA).visible).toBe("Entregado")
    expect(
      textoDeCelda({ ...celda, estado: "entregado", conRetraso: true }, pasada, AHORA),
    ).toEqual({ visible: "Entregado con retraso", soloLector: null, conRetraso: false })
    expect(textoDeCelda({ ...celda, estado: "asignado" }, pasada, AHORA).visible).toBe(
      "Sin entregar",
    )
    expect(textoDeCelda({ ...celda, estado: "asignado" }, futura, AHORA)).toEqual({
      visible: "—",
      soloLector: "Asignado",
      conRetraso: false,
    })
  })

  it("textoDeMotivos y los enlaces relativos a la clase", () => {
    expect(textoDeMotivos(["promedio", "vencidas"])).toBe(
      "Promedio menor a 70 % · 3 o más tareas vencidas sin entregar",
    )
    expect(textoDeMotivos([])).toBe("")
    expect(enlaceAEntregaDeAlumno("t1", "a1")).toBe("../tareas/t1/entregas/a1")
    expect(enlaceATarea("t1")).toBe("../tareas/t1")
  })

  it("las pilas de ventanas: avanzar y regresar en una dimensión no toca la otra", () => {
    const tras1 = ventanaSiguiente(VENTANAS_INICIALES, "tareas", "t2")
    const tras2 = ventanaSiguiente(tras1, "alumnos", "a2")
    expect(tras2.ventana).toEqual({ cursor: "a2", cursorTareas: "t2" })
    expect(tras2.anterioresDeTareas).toEqual([null])
    expect(tras2.anterioresDeAlumnos).toEqual([null])
    const atrasTareas = ventanaAnterior(tras2, "tareas")
    expect(atrasTareas.ventana).toEqual({ cursor: "a2", cursorTareas: null })
    expect(atrasTareas.anterioresDeTareas).toEqual([])
    expect(ventanaAnterior(VENTANAS_INICIALES, "alumnos")).toBe(VENTANAS_INICIALES)
  })
})
