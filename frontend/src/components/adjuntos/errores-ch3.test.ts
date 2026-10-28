import { describe, expect, it } from "vitest"

import { mensajeDeErrorTareas } from "@/features/tareas/lib"
import { mensajeDeErrorDeApi, type TraduccionDeErrores } from "@/lib/errores-de-api"
import { RESTOS_SIN_TEXTO_VISIBLE } from "@/lib/errores-de-api-fuera-de-contrato"
import { ApiError } from "@/services/apiClient"

import { MENSAJES_ERROR_DE_ARCHIVOS, MENSAJES_POR_CODIGO_DE_ARCHIVO, TEXTOS_ADJUNTOS } from "./data"
import { avisoDeFalloAlSubir } from "./lib"

// CHORE-03 (03a): el motivo de ARCHIVO_INVALIDO sin texto visible da el texto fijo del módulo.

const NOMBRE = "ensayo.pdf"

const TRADUCCION_DE_PRUEBA: TraduccionDeErrores = {
  generico: "Genérico de prueba.",
  mensajesPorCodigo: MENSAJES_POR_CODIGO_DE_ARCHIVO,
  codigosConMensajeDelServidor: [],
  textosPorCampo: {},
}

const MENSAJES_DE_ERROR: readonly [string, (error: unknown) => string][] = [
  ["tareas", mensajeDeErrorTareas],
  ["una traducción de prueba", (error) => mensajeDeErrorDeApi(error, TRADUCCION_DE_PRUEBA)],
]

describe("CHORE-03 · avisoDeFalloAlSubir", () => {
  it("CH3-A13: con ARCHIVO_INVALIDO sin texto visible da el texto fijo de ARCHIVO_INVALIDO del módulo; con mensaje, el de siempre", () => {
    for (const [, mensajeDeError] of MENSAJES_DE_ERROR) {
      for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
        const error = new ApiError("ARCHIVO_INVALIDO", resto, 400)
        expect(avisoDeFalloAlSubir(error, NOMBRE, mensajeDeError)).toBe(
          TEXTOS_ADJUNTOS.errorRechazado(NOMBRE, MENSAJES_ERROR_DE_ARCHIVOS.archivoInvalido),
        )
      }
      const conMensaje = new ApiError("ARCHIVO_INVALIDO", "El archivo pesa más de 25 MB.", 400)
      expect(avisoDeFalloAlSubir(conMensaje, NOMBRE, mensajeDeError)).toBe(
        TEXTOS_ADJUNTOS.errorRechazado(NOMBRE, "El archivo pesa más de 25 MB."),
      )
    }
  })
})
