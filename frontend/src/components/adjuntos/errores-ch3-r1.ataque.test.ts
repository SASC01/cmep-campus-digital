import { contarCaracteresVisibles } from "@campus/shared"
import { describe, expect, it } from "vitest"

import { mensajeDeErrorTareas } from "@/features/tareas/lib"
import { mensajeDeErrorDeApi, type TraduccionDeErrores } from "@/lib/errores-de-api"
import {
  ENTRADAS_FUERA_DE_CONTRATO,
  RESTOS_SIN_TEXTO_VISIBLE,
} from "@/lib/errores-de-api-fuera-de-contrato"
import { ApiError } from "@/services/apiClient"

import { MENSAJES_ERROR_DE_ARCHIVOS, TEXTOS_ADJUNTOS } from "./data"
import { avisoDeFalloAlSubir } from "./lib"

// Ataque CHORE-03 03a, ronda 1 (tester): avisoDeFalloAlSubir con lo que la tabla común no trae
// (mezclas de restos, un código que empieza como una ruta) y con un módulo cuya traducción no conoce
// ARCHIVO_INVALIDO. Todo carácter invisible va como escape. Sin fechas.

const NOMBRE = "ensayo.pdf"
const GENERICO_DE_PRUEBA = "Genérico de prueba."
const SIN_ARCHIVOS: TraduccionDeErrores = {
  generico: GENERICO_DE_PRUEBA,
  mensajesPorCodigo: {},
  codigosConMensajeDelServidor: [],
  textosPorCampo: {},
}

const MEZCLAS: readonly string[] = [
  "\u{00A0}\u{200B}\n",
  "\u{2028}\u{00AD}\u{180E}",
  "\u{200E}\u{FE0F}",
  "\u{115F}\u{3164}",
  "\u{0301}",
]

describe("ataque CHORE-03 03a r1 · avisoDeFalloAlSubir", () => {
  it("la solicitud de subida con cada entrada de la tabla común da «No pudimos subir…» con el resto o el genérico, nunca con la ruta", () => {
    expect(ENTRADAS_FUERA_DE_CONTRATO.length).toBeGreaterThan(100)
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      const aviso = avisoDeFalloAlSubir(
        new ApiError("VALIDACION", entrada.mensaje, 400),
        NOMBRE,
        mensajeDeErrorTareas,
      )
      expect(aviso, JSON.stringify(entrada.mensaje)).toBe(
        TEXTOS_ADJUNTOS.errorRechazado(
          NOMBRE,
          entrada.resto ?? "Algo salió mal. Inténtalo de nuevo.",
        ),
      )
    }
  })

  it("ARCHIVO_INVALIDO con una mezcla de restos da el texto fijo del módulo; si el módulo no lo conoce, su genérico; nunca un motivo invisible", () => {
    for (const resto of [...RESTOS_SIN_TEXTO_VISIBLE, ...MEZCLAS]) {
      const error = new ApiError("ARCHIVO_INVALIDO", resto, 400)
      expect(avisoDeFalloAlSubir(error, NOMBRE, mensajeDeErrorTareas)).toBe(
        TEXTOS_ADJUNTOS.errorRechazado(NOMBRE, MENSAJES_ERROR_DE_ARCHIVOS.archivoInvalido),
      )
      const sinTexto = avisoDeFalloAlSubir(error, NOMBRE, (e) =>
        mensajeDeErrorDeApi(e, SIN_ARCHIVOS),
      )
      expect(sinTexto).toBe(TEXTOS_ADJUNTOS.errorRechazado(NOMBRE, GENERICO_DE_PRUEBA))
      const motivo = sinTexto.slice(TEXTOS_ADJUNTOS.errorRechazado(NOMBRE, "").length)
      expect(contarCaracteresVisibles(motivo)).toBeGreaterThan(0)
    }
  })

  it("ARCHIVO_INVALIDO no se recorta aunque empiece como una ruta (es un código, no un VALIDACION); un fallo que no es ApiError da el texto de siempre", () => {
    expect(
      avisoDeFalloAlSubir(
        new ApiError("ARCHIVO_INVALIDO", "tipo: El archivo no es PDF", 400),
        NOMBRE,
        mensajeDeErrorTareas,
      ),
    ).toBe(TEXTOS_ADJUNTOS.errorRechazado(NOMBRE, "tipo: El archivo no es PDF"))
    expect(avisoDeFalloAlSubir(new Error("PUT"), NOMBRE, mensajeDeErrorTareas)).toBe(
      TEXTOS_ADJUNTOS.errorSubida(NOMBRE),
    )
    expect(avisoDeFalloAlSubir(undefined, NOMBRE, mensajeDeErrorTareas)).toBe(
      TEXTOS_ADJUNTOS.errorSubida(NOMBRE),
    )
  })
})
