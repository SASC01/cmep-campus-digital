import { describe, expect, it } from "vitest"

import {
  ENTRADAS_FUERA_DE_CONTRATO,
  RESTOS_SIN_TEXTO_VISIBLE,
} from "@/lib/errores-de-api-fuera-de-contrato"
import { ApiError } from "@/services/apiClient"

import { CODIGOS_CON_MENSAJE_DEL_SERVIDOR } from "./data"
import {
  erroresDeCalificacionDeApi,
  erroresDeLaTareaDeApi,
  errorDeEnlacesDeApi,
  errorDeTextoDeApi,
  mensajeDeConsultaTareas,
  mensajeDeErrorTareas,
  mensajeDelAvisoDeCalificar,
  mensajeDelCampoDeCalificacion,
} from "./lib"

// CHORE-03 (03a): las funciones de traducción de features/tareas recorren la tabla común de entradas
// fuera de contrato.

const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const SIN_ACCESO = "No tienes acceso a esta clase."
const TAREA_NO_EXISTE = "Esa tarea ya no existe."
const ALUMNO_NO_EXISTE = "No encontramos a ese alumno en esta clase."

const validacion = (mensaje: string) => new ApiError("VALIDACION", mensaje, 400)

const IDS_CON_TEXTO = [
  ["claseId", SIN_ACCESO],
  ["tareaId", TAREA_NO_EXISTE],
  ["alumnoId", ALUMNO_NO_EXISTE],
] as const

const CRITERIOS = [{ id: "criterio-1" }, { id: "criterio-2" }]

describe("CHORE-03 · traducción de errores de features/tareas", () => {
  it("CH3-A08: mensajeDeErrorTareas recorre la tabla, da el genérico ante un código con mensaje del servidor sin texto visible y conserva los textos fijos de los ids", () => {
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      expect(mensajeDeErrorTareas(validacion(entrada.mensaje))).toBe(entrada.resto ?? GENERICO)
    }
    expect(CODIGOS_CON_MENSAJE_DEL_SERVIDOR).toHaveLength(14)
    for (const codigo of CODIGOS_CON_MENSAJE_DEL_SERVIDOR) {
      for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
        expect(mensajeDeErrorTareas(new ApiError(codigo, resto, 409))).toBe(GENERICO)
      }
      expect(mensajeDeErrorTareas(new ApiError(codigo, "Mensaje.", 409))).toBe("Mensaje.")
    }
    for (const [campo, texto] of IDS_CON_TEXTO) {
      expect(mensajeDeErrorTareas(validacion(`${campo}: debe ser un identificador`))).toBe(texto)
      expect(mensajeDeErrorTareas(validacion(`${campo}:`))).toBe(texto)
    }
    // Enmienda 2 (T-01): los mensajes reales de tareas con la ruta doble (inventario de §D-1).
    const descargar = validacion("archivoId: archivoId: debe ser un identificador válido")
    const borrar = validacion("confirmar: confirmar: no es válido")
    expect(mensajeDeErrorTareas(descargar)).toBe("debe ser un identificador válido")
    expect(mensajeDeErrorTareas(borrar)).toBe("no es válido")
    expect(mensajeDelAvisoDeCalificar(descargar)).toBe("debe ser un identificador válido")
    for (const [campo, texto] of IDS_CON_TEXTO) {
      const doble = validacion(`${campo}: ${campo}: debe ser un identificador válido`)
      expect(mensajeDeErrorTareas(doble)).toBe(texto)
      expect(mensajeDeConsultaTareas(doble)).toBe(texto)
      expect(mensajeDelAvisoDeCalificar(doble)).toBe(texto)
    }
  })

  it("CH3-A09: mensajeDeConsultaTareas da el genérico ante toda la tabla y conserva los ids y los códigos con mensaje del servidor", () => {
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      expect(mensajeDeConsultaTareas(validacion(entrada.mensaje))).toBe(GENERICO)
    }
    expect(mensajeDeConsultaTareas(validacion("limite: Too big: expected number"))).toBe(GENERICO)
    expect(mensajeDeConsultaTareas(validacion("cursor.0: x"))).toBe(GENERICO)
    for (const [campo, texto] of IDS_CON_TEXTO) {
      expect(mensajeDeConsultaTareas(validacion(`${campo}: x`))).toBe(texto)
    }
    expect(
      mensajeDeConsultaTareas(new ApiError("SERVICIO_OCUPADO", "El servicio está ocupado.", 503)),
    ).toBe("El servicio está ocupado.")
  })

  it("CH3-A10: errorDeEnlacesDeApi y errorDeTextoDeApi dan el genérico en su campo sin texto visible y null en las rutas de la tabla", () => {
    for (const prefijo of ["enlaces:", "enlaces.0:", "enlaces.4:"]) {
      for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
        expect(errorDeEnlacesDeApi(validacion(`${prefijo}${resto}`))).toBe(GENERICO)
      }
      expect(errorDeEnlacesDeApi(validacion(`${prefijo} Mensaje.`))).toBe("Mensaje.")
    }
    for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
      expect(errorDeTextoDeApi(validacion(`texto:${resto}`))).toBe(GENERICO)
    }
    expect(errorDeTextoDeApi(validacion("texto: Mensaje."))).toBe("Mensaje.")
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      expect(errorDeEnlacesDeApi(validacion(entrada.mensaje))).toBeNull()
      expect(errorDeTextoDeApi(validacion(entrada.mensaje))).toBeNull()
    }
    expect(errorDeEnlacesDeApi(validacion("enlaces.0.url: x"))).toBeNull()
  })

  it("CH3-A11: erroresDeLaTareaDeApi da el genérico en el título y en una fila de la rúbrica sin texto visible y null en las rutas de la tabla", () => {
    for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
      expect(erroresDeLaTareaDeApi(validacion(`titulo:${resto}`))).toEqual({ titulo: GENERICO })
      expect(erroresDeLaTareaDeApi(validacion(`rubrica.0.criterio:${resto}`))).toEqual({
        "rubrica.0.criterio": GENERICO,
      })
    }
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      expect(erroresDeLaTareaDeApi(validacion(entrada.mensaje))).toBeNull()
    }
    expect(erroresDeLaTareaDeApi(validacion("rubrica.2: x"))).toBeNull()
    expect(erroresDeLaTareaDeApi(new ApiError("FECHA_LIMITE_INVALIDA", "fecha", 400))).toEqual({
      fechaLimite: "Elige una fecha límite futura, dentro del próximo año.",
    })
  })

  it("CH3-A12: calificar da el genérico en sus campos sin texto visible, null en las rutas de la tabla y el aviso es el de mensajeDeErrorTareas", () => {
    for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
      const puntaje = validacion(`puntajes.0.puntos:${resto}`)
      const calificacion = validacion(`calificacion:${resto}`)
      const comentario = validacion(`comentario:${resto}`)
      for (const error of [puntaje, calificacion, comentario]) {
        expect(mensajeDelCampoDeCalificacion(error)).toBe(GENERICO)
      }
      expect(erroresDeCalificacionDeApi(puntaje, CRITERIOS)).toEqual({
        "puntajes.criterio-1": GENERICO,
      })
      expect(erroresDeCalificacionDeApi(comentario, CRITERIOS)).toEqual({ comentario: GENERICO })
      // Con rúbrica, «calificacion» no se pinta (T-02); sin rúbrica, sí.
      expect(erroresDeCalificacionDeApi(calificacion, CRITERIOS)).toBeNull()
      expect(erroresDeCalificacionDeApi(calificacion, [])).toEqual({ calificacion: GENERICO })
    }
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      const error = validacion(entrada.mensaje)
      expect(mensajeDelCampoDeCalificacion(error)).toBeNull()
      expect(erroresDeCalificacionDeApi(error, CRITERIOS)).toBeNull()
      expect(mensajeDelAvisoDeCalificar(error)).toBe(mensajeDeErrorTareas(error))
    }
    const conDosPuntos = validacion("version: Nota: algo")
    expect(mensajeDelAvisoDeCalificar(conDosPuntos)).toBe("Nota: algo")
    expect(mensajeDelAvisoDeCalificar(conDosPuntos)).toBe(mensajeDeErrorTareas(conDosPuntos))
  })
})
