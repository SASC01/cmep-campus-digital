import { esApiError } from "@/services/apiClient"

import {
  CAMPOS_FORMULARIO_ADMIN,
  ETIQUETAS_ROL_ADMIN,
  MENSAJE_ERROR_ADMIN_GENERICO,
  MENSAJES_ERROR_ADMIN,
  TEXTOS_MAESTROS,
} from "./data"
import type {
  CampoFormularioAdmin,
  ErroresFormularioAdmin,
  EstadoEnlaceRegistro,
  IncidenciaValidacion,
  Rol,
} from "./types"

export const etiquetaDeRolAdmin = (rol: Rol): string => ETIQUETAS_ROL_ADMIN[rol]

// T-14: el foco solo se mueve por programa si nadie más lo tiene ya (o si está en <body>, es decir,
// nadie lo tiene). Se decide con el elemento activo en el momento de la respuesta, no con el
// historial de eventos blur/focus (DESIGN-01a, D-6).
export const focoDisponiblePara = (
  contenedor: Element | null,
  activo: Element | null,
  cuerpo: Element,
): boolean =>
  activo === null || activo === cuerpo || (contenedor !== null && contenedor.contains(activo))

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

// AUTH-03b, §D-B3: el token va en el fragmento (DEC-14 de AUTH-02), nunca a un servidor ni a
// Referer.
export const construirUrlDeRegistro = (origen: string, token: string): string =>
  `${origen}/registro-maestro#token=${token}`

export const etiquetaDeEstadoEnlace = (estado: EstadoEnlaceRegistro): string =>
  TEXTOS_MAESTROS.estados[estado]

// AUTH-03b, Enmienda 6 (arbitraje de T-10): sustituye {fecha} en una plantilla de
// TEXTOS_MAESTROS.enlaces.ocultoDeFila por la fecha ya formateada (zona local, legible), para el
// texto sr-only que distingue una fila de otra en el nombre accesible de sus botones ("Revocar el
// enlace creado el 27 sept 2026, 10:00"). Nunca en aria-hidden ni en aria-label.
export const textoOcultoDeFila = (plantilla: string, fechaFormateada: string): string =>
  plantilla.replace("{fecha}", fechaFormateada)
