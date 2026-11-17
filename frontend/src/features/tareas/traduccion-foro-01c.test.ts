// FORO-01c2 (§E7.3 "Frontend", punto 6): la traducción de errores del foro, envoltorio de
// lib/errores-de-api.ts. FORO-1C10 (recorre ENTRADAS_FUERA_DE_CONTRATO) y FORO-1C43 (sus textos fijos y
// sus 18 códigos con el texto del servidor; la de las tareas no cambia).
import { describe, expect, it } from "vitest"

import {
  ENTRADAS_FUERA_DE_CONTRATO,
  RESTOS_SIN_TEXTO_VISIBLE,
} from "@/lib/errores-de-api-fuera-de-contrato"
import { ApiError } from "@/services/apiClient"

import {
  CODIGOS_CON_MENSAJE_DEL_SERVIDOR,
  CODIGOS_CON_MENSAJE_DEL_SERVIDOR_DEL_FORO,
  TRADUCCION_DE_ERRORES_FORO,
} from "./data"
import {
  erroresDelForoDeApi,
  errorQueReemplazaLaVistaDelForo,
  mensajeDeConsultaForo,
  mensajeDeConsultaTareas,
  mensajeDeErrorForo,
  mensajeDeErrorTareas,
} from "./lib"

const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const SIN_ACCESO = "No tienes acceso a esta clase."
const FORO_NO_EXISTE = "Ese foro ya no existe."
const PARTICIPACION_NO_EXISTE = "Esa participación ya no existe."
const ALUMNO_NO_EXISTE = "No encontramos a ese alumno en esta clase."

const validacion = (mensaje: string) => new ApiError("VALIDACION", mensaje, 400)

const IDS_CON_TEXTO = [
  ["claseId", SIN_ACCESO],
  ["foroId", FORO_NO_EXISTE],
  ["alumnoId", ALUMNO_NO_EXISTE],
  ["participacionId", PARTICIPACION_NO_EXISTE],
] as const

const NUEVOS = ["PARTICIPACION_YA_PUBLICADA", "PARTICIPACION_CALIFICADA", "FORO_CERRADO"] as const

describe("FORO-1C10 · la traducción del foro recorre ENTRADAS_FUERA_DE_CONTRATO", () => {
  it("FORO-1C10: mensajeDeErrorForo da el resto sin la ruta, o el genérico, en cada entrada de la tabla", () => {
    expect(ENTRADAS_FUERA_DE_CONTRATO.length).toBeGreaterThan(0)
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      expect(mensajeDeErrorForo(validacion(entrada.mensaje))).toBe(entrada.resto ?? GENERICO)
    }
  })

  it("FORO-1C10: mensajeDeConsultaForo da el genérico ante toda la tabla y conserva los ids con texto fijo", () => {
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      expect(mensajeDeConsultaForo(validacion(entrada.mensaje))).toBe(GENERICO)
    }
    for (const [campo, texto] of IDS_CON_TEXTO) {
      expect(mensajeDeConsultaForo(validacion(`${campo}: x`))).toBe(texto)
    }
  })

  it("FORO-1C10: erroresDelForoDeApi da null en las rutas de la tabla y el genérico en un campo pintado sin texto visible", () => {
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      expect(erroresDelForoDeApi(validacion(entrada.mensaje))).toBeNull()
    }
    for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
      expect(erroresDelForoDeApi(validacion(`titulo:${resto}`))).toEqual({ titulo: GENERICO })
      expect(erroresDelForoDeApi(validacion(`instrucciones:${resto}`))).toEqual({
        instrucciones: GENERICO,
      })
      expect(erroresDelForoDeApi(validacion(`rubrica.0.criterio:${resto}`))).toEqual({
        "rubrica.0.criterio": GENERICO,
      })
    }
    // Los que el formulario del foro no pinta: requiereAdjuntos (solo la tarea) y version (ningún modo).
    expect(erroresDelForoDeApi(validacion("requiereAdjuntos: Elige cómo se entrega."))).toBeNull()
    expect(erroresDelForoDeApi(validacion("version: Se requiere la versión."))).toBeNull()
    expect(erroresDelForoDeApi(validacion("rubrica.1.criterio: Falta."))).toEqual({
      "rubrica.1.criterio": "Falta.",
    })
  })
})

describe("FORO-1C43 · TRADUCCION_DE_ERRORES_FORO y la de las tareas", () => {
  it("FORO-1C43: «Ese foro ya no existe.» a TAREA_NO_ENCONTRADA y a un VALIDACION de foroId; «Esa participación ya no existe.» a PARTICIPACION_NO_ENCONTRADA y a uno de participacionId", () => {
    expect(mensajeDeErrorForo(new ApiError("TAREA_NO_ENCONTRADA", "x", 404))).toBe(FORO_NO_EXISTE)
    expect(mensajeDeConsultaForo(new ApiError("TAREA_NO_ENCONTRADA", "x", 404))).toBe(
      FORO_NO_EXISTE,
    )
    expect(mensajeDeErrorForo(new ApiError("PARTICIPACION_NO_ENCONTRADA", "x", 404))).toBe(
      PARTICIPACION_NO_EXISTE,
    )
    for (const [campo, texto] of IDS_CON_TEXTO) {
      expect(
        mensajeDeErrorForo(validacion(`${campo}: ${campo}: debe ser un identificador válido`)),
      ).toBe(texto)
      expect(mensajeDeErrorForo(validacion(`${campo}:`))).toBe(texto)
    }
  })

  it("FORO-1C43: los 18 códigos del foro (los 15 de las tareas y los 3 nuevos) dan el texto del servidor, o el genérico si no tiene texto visible", () => {
    expect(CODIGOS_CON_MENSAJE_DEL_SERVIDOR_DEL_FORO).toHaveLength(18)
    expect(TRADUCCION_DE_ERRORES_FORO.codigosConMensajeDelServidor).toBe(
      CODIGOS_CON_MENSAJE_DEL_SERVIDOR_DEL_FORO,
    )
    expect(CODIGOS_CON_MENSAJE_DEL_SERVIDOR_DEL_FORO).toEqual([
      ...CODIGOS_CON_MENSAJE_DEL_SERVIDOR,
      ...NUEVOS,
    ])
    for (const codigo of CODIGOS_CON_MENSAJE_DEL_SERVIDOR_DEL_FORO) {
      expect(mensajeDeErrorForo(new ApiError(codigo, "Mensaje del foro.", 409))).toBe(
        "Mensaje del foro.",
      )
      for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
        expect(mensajeDeErrorForo(new ApiError(codigo, resto, 409))).toBe(GENERICO)
      }
    }
  })

  it("FORO-1C43: la traducción de las tareas no cambia: 15 códigos, «Esa tarea ya no existe.» y los tres códigos del foro sin el texto del servidor", () => {
    expect(CODIGOS_CON_MENSAJE_DEL_SERVIDOR).toHaveLength(15)
    expect(mensajeDeErrorTareas(new ApiError("TAREA_NO_ENCONTRADA", "x", 404))).toBe(
      "Esa tarea ya no existe.",
    )
    expect(mensajeDeConsultaTareas(validacion("tareaId: x"))).toBe("Esa tarea ya no existe.")
    for (const codigo of NUEVOS) {
      expect(mensajeDeErrorTareas(new ApiError(codigo, "Mensaje del foro.", 409))).toBe(GENERICO)
    }
  })

  it("FORO-1C43: errorQueReemplazaLaVistaDelForo: sin foro, 404, 403 de la clase o un VALIDACION de claseId, foroId o alumnoId; un 5xx con foro, no", () => {
    expect(errorQueReemplazaLaVistaDelForo(false, new Error("x"))).toBe(true)
    expect(
      errorQueReemplazaLaVistaDelForo(true, new ApiError("TAREA_NO_ENCONTRADA", "x", 404)),
    ).toBe(true)
    expect(
      errorQueReemplazaLaVistaDelForo(true, new ApiError("SIN_ACCESO_A_LA_CLASE", "x", 403)),
    ).toBe(true)
    for (const campo of ["claseId", "foroId", "alumnoId"]) {
      expect(errorQueReemplazaLaVistaDelForo(true, validacion(`${campo}: x`))).toBe(true)
    }
    expect(errorQueReemplazaLaVistaDelForo(true, validacion("tareaId: x"))).toBe(false)
    expect(errorQueReemplazaLaVistaDelForo(true, new ApiError("ERROR_INTERNO", "x", 500))).toBe(
      false,
    )
  })
})
