import { esApiError } from "@/services/apiClient"

// TAREAS-01c (§D-9). Lo que `features/clases` y `features/tareas` comparten para leer los errores de
// la API y de los esquemas de shared/. Movido sin cambios desde features/clases/lib.ts y types.ts,
// que lo reexportan. Lo que dependía de mensajeDeErrorClases recibe la función de mensajes de cada
// módulo como parámetro.

// Errores de validación en cliente por campo (nombre del campo → primer mensaje). Genérico: lo usan
// tanto el formulario de clase (nombre, descripcion) como el de unirse (codigo).
export type ErroresFormulario = Partial<Record<string, string>>

export interface IncidenciaValidacion {
  path: readonly PropertyKey[]
  message: string
}

// T-17 (ronda 2 del tester): el mensaje de un VALIDACION del servidor lleva el nombre técnico del
// campo como prefijo ("descripcion: No puede tener más de 2000 caracteres"), porque el cliente y el
// servidor comparten el mismo esquema de shared/. Ese prefijo nunca es para la persona que usa la
// interfaz (ni siquiera cuando el campo no es uno de un formulario, como claseId).
const PREFIJO_DE_CAMPO = /^([a-zA-Z_]+):\s*/

export const quitarPrefijoDeCampo = (mensaje: string): string =>
  mensaje.replace(PREFIJO_DE_CAMPO, "")

// T-17 (ronda 2 del tester): el nombre de campo que trae el prefijo técnico del mensaje, o null si
// el error no es un VALIDACION con esa forma.
export const campoDeErrorDeApi = (error: unknown): string | null => {
  if (!esApiError(error) || error.codigo !== "VALIDACION") return null
  const coincidencia = PREFIJO_DE_CAMPO.exec(error.message)
  return coincidencia ? (coincidencia[1] ?? null) : null
}

// El 400 "cursor: no es válido" de una lista paginada (la fila del cursor ya no existe).
export const esErrorDeCursor = (error: unknown): boolean => campoDeErrorDeApi(error) === "cursor"

// T-19 (ronda 3 del tester): un error que no es de un campo (500, sin conexión, SIN_ACCESO_A_LA_CLASE
// al editar) no es un VALIDACION con el prefijo técnico de un campo, así que no debe marcar ningún
// campo como inválido: es un error del formulario, no de un campo (CLAUDE.md, "Manejo de errores en
// el frontend"). Devuelve el error asociado al campo del formulario que nombra el VALIDACION del
// servidor, o `null` si el error no encaja en ninguno de `camposValidos` (porque no es VALIDACION,
// o porque nombra un campo que ese formulario no tiene); en ese caso, cada formulario decide qué
// hacer con el error. `mensajeDeError` es el de cada módulo.
export const erroresDeFormularioDeApi = (
  error: unknown,
  camposValidos: readonly string[],
  mensajeDeError: (error: unknown) => string,
): ErroresFormulario | null => {
  if (!esApiError(error) || error.codigo !== "VALIDACION") return null
  const campo = campoDeErrorDeApi(error)
  if (campo === null || !camposValidos.includes(campo)) return null
  return { [campo]: mensajeDeError(error) }
}

// Primer mensaje de cada campo a partir de las incidencias de safeParse de un esquema de shared/.
export const erroresPorCampo = (
  incidencias: readonly IncidenciaValidacion[],
): ErroresFormulario => {
  const errores: ErroresFormulario = {}
  for (const incidencia of incidencias) {
    const campo = incidencia.path[0]
    if (typeof campo !== "string" || errores[campo] !== undefined) continue
    errores[campo] = incidencia.message
  }
  return errores
}
