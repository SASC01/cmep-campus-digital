import { describe, expect, it } from "vitest"

import {
  ENTRADAS_FUERA_DE_CONTRATO,
  MENSAJE_DE_PRUEBA,
  RESTOS_SIN_TEXTO_VISIBLE,
} from "@/lib/errores-de-api-fuera-de-contrato"
import { ApiError } from "@/services/apiClient"

import {
  CAMPOS_PINTADOS_DE_LA_DUDA,
  CAMPOS_PINTADOS_DE_LA_RESPUESTA,
  CODIGOS_QUE_RENUEVAN_LAS_DUDAS,
  MENSAJES_POR_CODIGO_DE_CLASES,
} from "./data"
import { erroresDeLaDudaDeApi, erroresDeLaRespuestaDeApi, mensajeDeErrorClases } from "./lib"

// CLASES-03e (§D-9.4, §D-13, §D-15; CL3-E07): las funciones de traducción de «Publicar duda» y
// «Responder» y los textos de los errores de «Dudas».

const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const validacion = (mensaje: string) => new ApiError("VALIDACION", mensaje, 400)

const FUNCIONES = [
  ["erroresDeLaDudaDeApi", erroresDeLaDudaDeApi],
  ["erroresDeLaRespuestaDeApi", erroresDeLaRespuestaDeApi],
] as const

describe("CL3-E07 · traducción de errores de la duda y la respuesta", () => {
  it("CL3-E07: la duda y la respuesta pintan solo «texto»", () => {
    expect(CAMPOS_PINTADOS_DE_LA_DUDA).toEqual(["texto"])
    expect(CAMPOS_PINTADOS_DE_LA_RESPUESTA).toEqual(["texto"])
  })

  it.each(FUNCIONES)(
    "CL3-E07: %s da el error de «texto» bajo su campo, con el genérico si queda sin texto visible",
    (_nombre, traducir) => {
      expect(traducir(validacion(`texto: ${MENSAJE_DE_PRUEBA}`))).toEqual({
        texto: MENSAJE_DE_PRUEBA,
      })
      for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
        expect(traducir(validacion(`texto:${resto}`))).toEqual({ texto: GENERICO })
      }
    },
  )

  it.each(FUNCIONES)(
    "CL3-E07: %s recorre ENTRADAS_FUERA_DE_CONTRATO: ninguna va a un campo y el aviso es legible",
    (_nombre, traducir) => {
      expect(ENTRADAS_FUERA_DE_CONTRATO.length).toBeGreaterThan(0)
      for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
        expect(traducir(validacion(entrada.mensaje))).toBeNull()
        expect(mensajeDeErrorClases(validacion(entrada.mensaje))).toBe(entrada.resto ?? GENERICO)
      }
    },
  )

  it.each(FUNCIONES)(
    "CL3-E07: %s no pinta «resuelta:», «dudaId:», «respuestaId:» ni «texto.0:»",
    (_nombre, traducir) => {
      for (const mensaje of [
        "resuelta: debe ser verdadero o falso",
        "dudaId: dudaId: debe ser un identificador válido",
        "respuestaId: respuestaId: debe ser un identificador válido",
        `texto.0: ${MENSAJE_DE_PRUEBA}`,
      ]) {
        expect(traducir(validacion(mensaje))).toBeNull()
      }
    },
  )

  it("CL3-E07: los avisos de lo que no se pinta son legibles: dudaId da «Esa duda ya no existe.», respuestaId «Esa respuesta ya no existe.» y resuelta el genérico", () => {
    expect(
      mensajeDeErrorClases(validacion("dudaId: dudaId: debe ser un identificador válido")),
    ).toBe("Esa duda ya no existe.")
    expect(
      mensajeDeErrorClases(
        validacion("respuestaId: respuestaId: debe ser un identificador válido"),
      ),
    ).toBe("Esa respuesta ya no existe.")
    expect(mensajeDeErrorClases(validacion("resuelta: debe ser verdadero o falso"))).toBe(GENERICO)
    expect(mensajeDeErrorClases(validacion("resuelta.0: debe ser verdadero o falso"))).toBe(
      "debe ser verdadero o falso",
    )
    for (const vacio of ["", "   "]) {
      expect(mensajeDeErrorClases(validacion(vacio))).toBe(GENERICO)
    }
  })

  it("CL3-E07: DUDA_NO_ENCONTRADA y RESPUESTA_NO_ENCONTRADA tienen su texto fijo y renuevan la lista, con BORRADO_NO_PERMITIDO", () => {
    expect(MENSAJES_POR_CODIGO_DE_CLASES.DUDA_NO_ENCONTRADA).toBe("Esa duda ya no existe.")
    expect(MENSAJES_POR_CODIGO_DE_CLASES.RESPUESTA_NO_ENCONTRADA).toBe(
      "Esa respuesta ya no existe.",
    )
    expect(mensajeDeErrorClases(new ApiError("DUDA_NO_ENCONTRADA", "x", 404))).toBe(
      "Esa duda ya no existe.",
    )
    expect([...CODIGOS_QUE_RENUEVAN_LAS_DUDAS].sort()).toEqual([
      "BORRADO_NO_PERMITIDO",
      "DUDA_NO_ENCONTRADA",
      "RESPUESTA_NO_ENCONTRADA",
    ])
  })
})
