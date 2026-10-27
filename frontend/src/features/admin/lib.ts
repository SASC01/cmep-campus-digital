import { mensajeDeErrorDeApi, mensajeDeErrorDeConsulta } from "@/lib/errores-de-api"

import {
  CAMPOS_FORMULARIO_ADMIN,
  ETIQUETAS_ROL_ADMIN,
  TEXTOS_INVITACION_MASIVA,
  TEXTOS_MAESTROS,
  TRADUCCION_DE_ERRORES_ADMIN,
} from "./data"
import type {
  CampoFormularioAdmin,
  ErroresFormularioAdmin,
  EstadoEnlaceRegistro,
  IncidenciaValidacion,
  MotivoLineaInvalida,
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

// CHORE-03 (§D-4): el mensaje de un error de una acción, con el contrato de lib/errores-de-api.ts y la
// traducción del módulo (data.ts). Un VALIDACION da el mensaje del servidor sin su ruta o, sin texto
// visible, el genérico; CUPO_DIARIO_INSUFICIENTE (§D-C7), su mensaje en español.
export const mensajeDeErrorAdmin = (error: unknown): string =>
  mensajeDeErrorDeApi(error, TRADUCCION_DE_ERRORES_ADMIN)

// CHORE-03 (§D-4, S-01): el mensaje de un error de lo que se carga (la tabla de enlaces y los
// registrados de un enlace). Ante un VALIDACION, el genérico, nunca el texto del servidor.
export const mensajeDeConsultaAdmin = (error: unknown): string =>
  mensajeDeErrorDeConsulta(error, TRADUCCION_DE_ERRORES_ADMIN)

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

// AUTH-03c, §D-C6: motivo de una línea inválida de la invitación masiva, en texto legible.
export const etiquetaDeMotivo = (motivo: MotivoLineaInvalida): string =>
  TEXTOS_INVITACION_MASIVA.motivos[motivo]
