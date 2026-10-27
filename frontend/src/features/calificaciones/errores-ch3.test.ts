import { describe, expect, it } from "vitest"

import { esErrorDeCursor } from "@/lib/errores-de-api"
import {
  ENTRADAS_FUERA_DE_CONTRATO,
  RESTOS_SIN_TEXTO_VISIBLE,
} from "@/lib/errores-de-api-fuera-de-contrato"
import { ApiError } from "@/services/apiClient"

import * as datosDelModulo from "./data"
import { MENSAJES_ERROR_CALIFICACIONES } from "./data"
import { esErrorDeCursorDeCalificaciones, mensajeDeErrorCalificaciones } from "./lib"

// CHORE-03 (03b): features/calificaciones solo gana el alias del cursor y N-46. Su función de consulta
// no se migra (Enmienda 1, M-01): ya da el texto de "sin acceso" o el respaldo, nunca el del servidor.

const RESPALDOS = [
  MENSAJES_ERROR_CALIFICACIONES.gradebook,
  MENSAJES_ERROR_CALIFICACIONES.misCalificaciones,
  MENSAJES_ERROR_CALIFICACIONES.verMasTareas,
]

const validacion = (mensaje: string) => new ApiError("VALIDACION", mensaje, 400)

describe("CHORE-03 · features/calificaciones", () => {
  it("CH3-B06: el alias del cursor es esErrorDeCursor; mensajeDeErrorCalificaciones sigue dando el respaldo ante la tabla y el texto de sin acceso; data.ts ya no declara la traducción ni los códigos que redirige el cliente", () => {
    expect(esErrorDeCursorDeCalificaciones).toBe(esErrorDeCursor)
    const sinAcceso = MENSAJES_ERROR_CALIFICACIONES.sinAcceso
    for (const respaldo of RESPALDOS) {
      for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
        expect(mensajeDeErrorCalificaciones(validacion(entrada.mensaje), respaldo)).toBe(respaldo)
      }
      expect(mensajeDeErrorCalificaciones(validacion("claseId: x"), respaldo)).toBe(sinAcceso)
      for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
        expect(mensajeDeErrorCalificaciones(validacion(`claseId:${resto}`), respaldo)).toBe(
          sinAcceso,
        )
        expect(
          mensajeDeErrorCalificaciones(new ApiError("SERVICIO_OCUPADO", resto, 503), respaldo),
        ).toBe(respaldo)
      }
      expect(
        mensajeDeErrorCalificaciones(new ApiError("SIN_ACCESO_A_LA_CLASE", "x", 403), respaldo),
      ).toBe(sinAcceso)
      expect(
        mensajeDeErrorCalificaciones(
          new ApiError("SERVICIO_OCUPADO", "El servicio está ocupado.", 503),
          respaldo,
        ),
      ).toBe(respaldo)
    }
    const nombres = Object.keys(datosDelModulo)
    expect(nombres.length).toBeGreaterThan(0)
    expect(nombres).not.toContain("TRADUCCION_DE_ERRORES_CALIFICACIONES")
    expect(nombres).not.toContain("CODIGOS_QUE_REDIRIGE_EL_CLIENTE")
  })
})
