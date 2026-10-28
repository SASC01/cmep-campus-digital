import { describe, expect, it } from "vitest"

import {
  ENTRADAS_FUERA_DE_CONTRATO,
  MENSAJE_DE_PRUEBA,
  RESTOS_SIN_TEXTO_VISIBLE,
} from "@/lib/errores-de-api-fuera-de-contrato"
import { ApiError } from "@/services/apiClient"

import { MENSAJES_ERROR_AUTH, TRADUCCION_DE_ERRORES_AUTH } from "./data"
import { mensajeDeErrorAuth } from "./lib"

// CHORE-03 (03c): la traducción de errores de features/auth recorre la tabla común de entradas fuera
// de contrato. S-08: auth no tiene variante de consulta.

const GENERICO = "No pudimos completar la operación. Inténtalo de nuevo."

const validacion = (mensaje: string) => new ApiError("VALIDACION", mensaje, 400)

// Lo que cada código con texto fijo daba antes de CHORE-03 (MENSAJES_ERROR_AUTH en 9272501e).
const TEXTOS_FIJOS_DE_SIEMPRE: readonly (readonly [string, string])[] = [
  ["CREDENCIALES_INVALIDAS", "Correo o contraseña incorrectos."],
  ["DEMASIADOS_INTENTOS", "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo."],
  ["CORREO_EN_USO", "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña."],
  ["SIN_CONEXION", "No pudimos conectar con el servidor. Revisa tu conexión."],
  ["ENLACE_INVALIDO", "El enlace no es válido o ya venció. Pide uno nuevo."],
  [
    "DEMASIADAS_SOLICITUDES",
    "Ya pediste varios enlaces para este correo. Espera una hora e inténtalo de nuevo.",
  ],
  ["CONTRASENA_ACTUAL_INCORRECTA", "La contraseña temporal no es correcta."],
  ["CONTRASENA_REPETIDA", "La contraseña nueva debe ser distinta de la temporal."],
  ["CAMBIO_DE_CONTRASENA_REQUERIDO", "Debes cambiar tu contraseña antes de continuar."],
  ["CAMBIO_NO_REQUERIDO", "Ya no tienes un cambio de contraseña pendiente."],
  ["SESION_INVALIDA", "Tu sesión terminó. Vuelve a iniciar sesión."],
]

describe("CHORE-03 · traducción de errores de features/auth", () => {
  it("CH3-C01: mensajeDeErrorAuth recorre la tabla (el resto o el genérico) y nunca deja la ruta ni un texto sin caracteres visibles", () => {
    expect(ENTRADAS_FUERA_DE_CONTRATO.length).toBeGreaterThan(50)
    for (const entrada of ENTRADAS_FUERA_DE_CONTRATO) {
      expect(mensajeDeErrorAuth(validacion(entrada.mensaje))).toBe(entrada.resto ?? GENERICO)
    }
  })

  it.each(TEXTOS_FIJOS_DE_SIEMPRE)(
    "CH3-C01: el código fijo %s sigue dando su texto, con mensaje del servidor, sin texto visible o vacío",
    (codigo, texto) => {
      expect(mensajeDeErrorAuth(new ApiError(codigo, MENSAJE_DE_PRUEBA, 400))).toBe(texto)
      for (const resto of RESTOS_SIN_TEXTO_VISIBLE) {
        expect(mensajeDeErrorAuth(new ApiError(codigo, resto, 400))).toBe(texto)
      }
    },
  )

  it("CH3-C01: los códigos fijos son exactamente los de siempre y ningún código muestra el mensaje del servidor", () => {
    expect(Object.entries(MENSAJES_ERROR_AUTH)).toEqual(TEXTOS_FIJOS_DE_SIEMPRE)
    expect(TRADUCCION_DE_ERRORES_AUTH.codigosConMensajeDelServidor).toEqual([])
    expect(TRADUCCION_DE_ERRORES_AUTH.textosPorCampo).toEqual({})
    expect(TRADUCCION_DE_ERRORES_AUTH.generico).toBe(GENERICO)
  })

  it.each([["constructor"], ["toString"], ["__proto__"], ["hasOwnProperty"]])(
    "CH3-C01: «%s» como código da el genérico",
    (codigo) => {
      expect(mensajeDeErrorAuth(new ApiError(codigo, MENSAJE_DE_PRUEBA, 400))).toBe(GENERICO)
    },
  )

  it("CH3-C01: un código desconocido, un error que no es ApiError, undefined y una cadena dan el genérico", () => {
    expect(mensajeDeErrorAuth(new ApiError("ERROR_INTERNO", MENSAJE_DE_PRUEBA, 500))).toBe(GENERICO)
    expect(mensajeDeErrorAuth(new Error(MENSAJE_DE_PRUEBA))).toBe(GENERICO)
    expect(mensajeDeErrorAuth(undefined)).toBe(GENERICO)
    expect(mensajeDeErrorAuth(MENSAJE_DE_PRUEBA)).toBe(GENERICO)
  })
})
