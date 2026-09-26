import { esApiError } from "@/services/apiClient"

import {
  CAMPOS_FORMULARIO_ADMIN,
  ETIQUETAS_ROL_ADMIN,
  MENSAJE_ERROR_ADMIN_GENERICO,
  MENSAJES_ERROR_ADMIN,
} from "./data"
import type {
  CampoFormularioAdmin,
  ErroresFormularioAdmin,
  IncidenciaValidacion,
  Rol,
} from "./types"

export const etiquetaDeRolAdmin = (rol: Rol): string => ETIQUETAS_ROL_ADMIN[rol]

const tieneMensajePropio = (codigo: string): codigo is keyof typeof MENSAJES_ERROR_ADMIN =>
  Object.hasOwn(MENSAJES_ERROR_ADMIN, codigo)

export const mensajeDeErrorAdmin = (error: unknown): string => {
  if (!esApiError(error)) return MENSAJE_ERROR_ADMIN_GENERICO
  if (error.codigo === "VALIDACION") return error.message
  if (tieneMensajePropio(error.codigo)) return MENSAJES_ERROR_ADMIN[error.codigo]
  return MENSAJE_ERROR_ADMIN_GENERICO
}

const esCampoFormularioAdmin = (valor: unknown): valor is CampoFormularioAdmin =>
  CAMPOS_FORMULARIO_ADMIN.some((campo) => campo === valor)

// Primer mensaje de cada campo a partir de las incidencias de safeParse de un esquema de shared/.
export const erroresPorCampoAdmin = (
  incidencias: readonly IncidenciaValidacion[],
): ErroresFormularioAdmin => {
  const errores: ErroresFormularioAdmin = {}
  for (const incidencia of incidencias) {
    const campo = incidencia.path[0]
    if (!esCampoFormularioAdmin(campo) || errores[campo] !== undefined) continue
    errores[campo] = incidencia.message
  }
  return errores
}
