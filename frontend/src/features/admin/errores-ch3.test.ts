import { contarCaracteresVisibles } from "@campus/shared"
import { describe, expect, it } from "vitest"

import {
  ENTRADAS_FUERA_DE_CONTRATO,
  MENSAJE_DE_PRUEBA,
  RESTOS_SIN_TEXTO_VISIBLE,
} from "@/lib/errores-de-api-fuera-de-contrato"
import { ApiError } from "@/services/apiClient"

import {
  CODIGOS_CON_MENSAJE_DEL_SERVIDOR,
  MENSAJES_ERROR_ADMIN,
  TRADUCCION_DE_ERRORES_ADMIN,
} from "./data"
import { mensajeDeConsultaAdmin, mensajeDeErrorAdmin } from "./lib"

// CHORE-03 (03c): las funciones de traducción de features/admin recorren la tabla común de entradas
// fuera de contrato.

const GENERICO = "No pudimos completar la operación. Inténtalo de nuevo."
const CUPO = "CUPO_DIARIO_INSUFICIENTE"
const MENSAJE_DEL_CUPO = "Hoy solo quedan 3 invitaciones."
const ID_INVALIDO = "debe ser un identificador válido"

// Enmienda 3 (M-04): el esquema local `parametrosIdSchema` de backend/src/handlers/admin.ts:60
// (`z.uuid("id: debe ser un identificador válido")`) no está en @campus/shared y no se puede importar.
// validarParametros (backend/src/handlers/validacion.ts) arma `${path.join(".")}: ${message}`, así que
// a restablecer, corregir el correo, revocar y los registrados de un enlace llega literal:
const RUTA_DOBLE_DEL_ID = "id: id: debe ser un identificador válido"

const RUTA_AL_INICIO = /^[\p{L}\p{M}\p{N}_.-]+:/u

const validacion = (mensaje: string) => new ApiError("VALIDACION", mensaje, 400)

// El resto escrito por sus puntos de código, para que el título de la prueba se pueda leer.
const nombreDelResto = (resto: string): string =>
  resto === ""
    ? "(vacío)"
    : [...resto]
        .map((caracter) => `U+${(caracter.codePointAt(0) ?? 0).toString(16).toUpperCase()}`)
        .join(" ")

// Lo que cada código con texto fijo daba antes de CHORE-03 (MENSAJES_ERROR_ADMIN en 9272501e).
const TEXTOS_FIJOS_DE_SIEMPRE: readonly (readonly [string, string])[] = [
  ["CORREO_EN_USO", "Ya existe una cuenta con ese correo."],
  ["OPERACION_NO_PERMITIDA", "La contraseña del administrador se restablece desde el servidor."],
  ["USUARIO_NO_ENCONTRADO", "No hay ninguna cuenta con ese correo."],
  ["ENLACE_NO_ENCONTRADO", "Ese enlace ya no existe."],
]

const FUNCIONES: readonly (readonly [string, (error: unknown) => string])[] = [
  ["mensajeDeErrorAdmin", mensajeDeErrorAdmin],
  ["mensajeDeConsultaAdmin", mensajeDeConsultaAdmin],
]

describe("CHORE-03 · traducción de errores de features/admin", () => {
  it("CH3-C02: mensajeDeErrorAdmin recorre la tabla (el resto o el genérico): un VALIDACION ya no sale crudo", () => {
    expect(ENTRADAS_FUERA_DE_CONTRATO.length).toBeGreaterThan(50)
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      expect(mensajeDeErrorAdmin(validacion(entrada.mensaje))).toBe(entrada.resto ?? GENERICO)
    }
    expect(mensajeDeErrorAdmin(validacion("nombre: caracteres no permitidos"))).toBe(
      "caracteres no permitidos",
    )
  })

  it("CH3-C02: mensajeDeConsultaAdmin recorre la tabla y siempre da el genérico", () => {
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      expect(mensajeDeConsultaAdmin(validacion(entrada.mensaje))).toBe(GENERICO)
    }
    expect(mensajeDeConsultaAdmin(validacion("limite: Too big: expected number"))).toBe(GENERICO)
  })

  it.each(FUNCIONES)(
    "CH3-C02: %s con CUPO_DIARIO_INSUFICIENTE da su mensaje si tiene texto visible y el genérico si no",
    (_nombre, traducir) => {
      expect(CODIGOS_CON_MENSAJE_DEL_SERVIDOR).toEqual([CUPO])
      expect(traducir(new ApiError(CUPO, MENSAJE_DEL_CUPO, 409))).toBe(MENSAJE_DEL_CUPO)
      expect(traducir(new ApiError(CUPO, "a.b: c", 409))).toBe("a.b: c")
      for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
        expect(traducir(new ApiError(CUPO, resto, 409))).toBe(GENERICO)
      }
    },
  )

  it.each(TEXTOS_FIJOS_DE_SIEMPRE)(
    "CH3-C02: el código fijo %s sigue dando su texto en las acciones y en las consultas",
    (codigo, texto) => {
      for (const [, traducir] of FUNCIONES) {
        expect(traducir(new ApiError(codigo, MENSAJE_DE_PRUEBA, 404))).toBe(texto)
        expect(traducir(new ApiError(codigo, "", 404))).toBe(texto)
      }
    },
  )

  it("CH3-C02: la traducción del módulo es la de siempre, sin VALIDACION entre los códigos con mensaje del servidor", () => {
    expect(Object.entries(MENSAJES_ERROR_ADMIN)).toEqual(TEXTOS_FIJOS_DE_SIEMPRE)
    expect(TRADUCCION_DE_ERRORES_ADMIN.codigosConMensajeDelServidor).not.toContain("VALIDACION")
    expect(TRADUCCION_DE_ERRORES_ADMIN.textosPorCampo).toEqual({})
    expect(TRADUCCION_DE_ERRORES_ADMIN.generico).toBe(GENERICO)
  })

  it.each([["constructor"], ["toString"], ["__proto__"]])(
    "CH3-C02: «%s» como código da el genérico en las acciones y en las consultas",
    (codigo) => {
      for (const [, traducir] of FUNCIONES) {
        expect(traducir(new ApiError(codigo, MENSAJE_DE_PRUEBA, 400))).toBe(GENERICO)
      }
    },
  )

  it("CH3-C02: un código desconocido, un error que no es ApiError y undefined dan el genérico", () => {
    for (const [, traducir] of FUNCIONES) {
      expect(traducir(new ApiError("ERROR_INTERNO", MENSAJE_DE_PRUEBA, 500))).toBe(GENERICO)
      expect(traducir(new Error(MENSAJE_DE_PRUEBA))).toBe(GENERICO)
      expect(traducir(undefined)).toBe(GENERICO)
    }
  })

  it("CH3-C08: «id: id: debe ser un identificador válido» da el resto en las acciones y el genérico en la consulta, sin ruta ni «id:»", () => {
    const accion = mensajeDeErrorAdmin(validacion(RUTA_DOBLE_DEL_ID))
    const consulta = mensajeDeConsultaAdmin(validacion(RUTA_DOBLE_DEL_ID))
    expect(accion).toBe(ID_INVALIDO)
    expect(consulta).toBe(GENERICO)
    for (const salida of [accion, consulta]) {
      expect(salida).not.toMatch(RUTA_AL_INICIO)
      expect(salida).not.toContain("id:")
      expect(contarCaracteresVisibles(salida)).toBeGreaterThan(0)
    }
  })

  it.each(RESTOS_SIN_TEXTO_VISIBLE.map((resto) => [nombreDelResto(resto), resto] as const))(
    "CH3-C08: «id: id:» seguido del resto %s da el genérico en las acciones y en la consulta",
    (_nombre, resto) => {
      for (const separador of ["", " "]) {
        for (const [, traducir] of FUNCIONES) {
          const salida = traducir(validacion(`id: id:${separador}${resto}`))
          expect(salida).toBe(GENERICO)
          expect(salida).not.toMatch(RUTA_AL_INICIO)
          expect(salida).not.toContain("id:")
        }
      }
    },
  )
})
