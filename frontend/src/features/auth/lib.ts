import { esApiError } from "@/services/apiClient"

import {
  CAMPOS_FORMULARIO_AUTH,
  ETIQUETAS_ROL,
  MENSAJE_ERROR_AUTH_GENERICO,
  MENSAJES_ERROR_AUTH,
  RUTA_ACCESO_RESTRINGIDO,
  RUTA_POR_ROL,
} from "./data"
import type {
  Anuncio,
  CampoFormularioAuth,
  ErroresFormulario,
  IncidenciaValidacion,
  MeRespuesta,
  Rol,
} from "./types"

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
