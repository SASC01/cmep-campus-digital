import { esApiError } from "@/services/apiClient"

import {
  AVISOS_LOGIN,
  CAMPOS_FORMULARIO_AUTH,
  ETIQUETAS_ROL,
  MENSAJE_ERROR_AUTH_GENERICO,
  MENSAJES_ERROR_AUTH,
  RUTA_ACCESO_RESTRINGIDO,
  RUTA_POR_ROL,
} from "./data"
import type {
  Anuncio,
  AvisoDeLogin,
  CampoFormularioAuth,
  ErroresFormulario,
  IncidenciaValidacion,
  MeRespuesta,
  Rol,
} from "./types"

// Solo #token=<43 base64url> (DEC-18): cualquier otra forma es un enlace inválido, sin petición.
const PATRON_TOKEN_FRAGMENTO = /^#token=([A-Za-z0-9_-]{43})$/

// Copia ordenada por orden ascendente. Array.prototype.sort es estable; se copia para no mutar.
export const ordenarAnuncios = (anuncios: readonly Anuncio[]): Anuncio[] =>
  [...anuncios].sort((a, b) => a.orden - b.orden)

export const rutaPorRol = (rol: Rol): string => RUTA_POR_ROL[rol]

// RF-05: cada rol llega a su dashboard; un alumno restringido, a su única pantalla (RN-03).
export const rutaTrasLogin = (me: MeRespuesta): string => {
  if (me.accesoRestringido) return RUTA_ACCESO_RESTRINGIDO
  return rutaPorRol(me.rol)
}

export const etiquetaDeRol = (rol: Rol): string => ETIQUETAS_ROL[rol]

const tieneMensajePropio = (codigo: string): codigo is keyof typeof MENSAJES_ERROR_AUTH =>
  Object.hasOwn(MENSAJES_ERROR_AUTH, codigo)

export const mensajeDeErrorAuth = (error: unknown): string => {
  if (!esApiError(error)) return MENSAJE_ERROR_AUTH_GENERICO
  if (error.codigo === "VALIDACION") return error.message
  if (tieneMensajePropio(error.codigo)) return MENSAJES_ERROR_AUTH[error.codigo]
  return MENSAJE_ERROR_AUTH_GENERICO
}

const esCampoFormulario = (valor: unknown): valor is CampoFormularioAuth =>
  CAMPOS_FORMULARIO_AUTH.some((campo) => campo === valor)

// Primer mensaje de cada campo a partir de las incidencias de safeParse de un esquema de shared/.
export const erroresPorCampo = (
  incidencias: readonly IncidenciaValidacion[],
): ErroresFormulario => {
  const errores: ErroresFormulario = {}
  for (const incidencia of incidencias) {
    const campo = incidencia.path[0]
    if (!esCampoFormulario(campo) || errores[campo] !== undefined) continue
    errores[campo] = incidencia.message
  }
  return errores
}

// DEC-18: token del fragmento leído una sola vez; null si no tiene la forma esperada.
export const leerTokenDelFragmento = (hash: string): string | null => {
  const coincidencia = PATRON_TOKEN_FRAGMENTO.exec(hash)
  return coincidencia?.[1] ?? null
}

// DEC-17: simétrico a esApiError(error) && error.codigo === "ACCESO_RESTRINGIDO".
export const requiereCambioDeContrasena = (error: unknown): boolean =>
  esApiError(error) && error.codigo === "CAMBIO_DE_CONTRASENA_REQUERIDO"

const esAvisoDeLogin = (valor: unknown): valor is AvisoDeLogin =>
  typeof valor === "string" && Object.hasOwn(AVISOS_LOGIN, valor)

// Aviso de /login tras un enlace de cuenta (DEC-17). Un state desconocido no muestra nada.
export const avisoDeLogin = (estado: unknown): string | null => {
  if (typeof estado !== "object" || estado === null || !("aviso" in estado)) return null
  const { aviso } = estado as { aviso: unknown }
  if (!esAvisoDeLogin(aviso)) return null
  return AVISOS_LOGIN[aviso]
}

// Validación de confirmación (solo en cliente: el servidor no conoce ese campo).
export const contrasenasCoinciden = (a: string, b: string): boolean => a === b
