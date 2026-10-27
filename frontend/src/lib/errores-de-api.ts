import { contarCaracteresVisibles } from "@campus/shared"

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

// El 400 "cursor: no es válido" de una lista paginada (la fila del cursor ya no existe). CHORE-03
// (§D-1): `campos` deja reconocer otros nombres de cursor de una misma lista; sin él, solo "cursor".
const CAMPOS_DE_CURSOR: readonly string[] = ["cursor"]

export const esErrorDeCursor = (
  error: unknown,
  campos: readonly string[] = CAMPOS_DE_CURSOR,
): boolean => {
  const campo = campoDeErrorDeApi(error)
  return campo !== null && campos.includes(campo)
}

// CHORE-03 (§D-1): lo que cada módulo le dice al contrato para traducir los errores de la API.
export interface TraduccionDeErrores {
  // El genérico del módulo.
  generico: string
  // Códigos con texto fijo propio.
  mensajesPorCodigo: Readonly<Record<string, string>>
  // Códigos cuyo mensaje ya viene en español del servidor.
  codigosConMensajeDelServidor: readonly string[]
  // VALIDACION de un id con texto fijo (claseId, tareaId…).
  textosPorCampo: Readonly<Record<string, string>>
}

// CHORE-03 (§D-1, S-05): una ruta de campo (letras, también fuera de ASCII, marcas, dígitos, punto,
// guion bajo y guion) seguida de dos puntos y de los espacios que la separan del mensaje. Se quitan
// la ruta, una vez, y el nombre de campo que la sigue, y solo de un VALIDACION: nunca son para la
// persona.
const RUTA_DEL_MENSAJE = /^[\p{L}\p{M}\p{N}_.-]+:\s*/u

// CHORE-03 (Enmienda 2, T-01): el nombre de un campo en camelCase (minúscula ASCII al inicio; letras y
// dígitos ASCII, sin puntos ni espacios) que algunos esquemas de shared/ repiten al inicio de su
// mensaje, así que el servidor responde "archivoId: archivoId: …".
const CAMPO_QUE_REPITE_EL_ESQUEMA = /^[a-z][A-Za-z0-9]*:\s*/

// La ruta, una vez; y, solo si había ruta, el nombre de campo que la sigue, una vez.
export const quitarRutaDelMensaje = (mensaje: string): string => {
  const sinRuta = mensaje.replace(RUTA_DEL_MENSAJE, "")
  if (sinRuta === mensaje) return mensaje
  return sinRuta.replace(CAMPO_QUE_REPITE_EL_ESQUEMA, "")
}

// CHORE-03 (§D-1, S-04): un texto sin caracteres visibles (la regla única de shared/) nunca llega a
// la persona: en su lugar va el genérico.
export const textoVisibleOGenerico = (texto: string, generico: string): string =>
  contarCaracteresVisibles(texto) > 0 ? texto : generico

// El texto fijo de un VALIDACION de un id (claseId, tareaId…), o null si el error no es de uno.
const textoDelCampo = (error: unknown, traduccion: TraduccionDeErrores): string | null => {
  const campo = campoDeErrorDeApi(error)
  if (campo === null || !Object.hasOwn(traduccion.textosPorCampo, campo)) return null
  return traduccion.textosPorCampo[campo] ?? null
}

// El texto fijo de un código, o null si el código no tiene uno.
const textoDelCodigo = (codigo: string, traduccion: TraduccionDeErrores): string | null => {
  if (!Object.hasOwn(traduccion.mensajesPorCodigo, codigo)) return null
  return traduccion.mensajesPorCodigo[codigo] ?? null
}

// CHORE-03 (§D-1): el mensaje de un error de una acción (guardar, enviar, borrar, descargar). Un
// VALIDACION va antes que los mapas, para que ningún módulo lo muestre crudo aunque lo liste.
export const mensajeDeErrorDeApi = (error: unknown, traduccion: TraduccionDeErrores): string => {
  if (!esApiError(error)) return traduccion.generico
  const delCampo = textoDelCampo(error, traduccion)
  if (delCampo !== null) return delCampo
  if (error.codigo === "VALIDACION") {
    return textoVisibleOGenerico(quitarRutaDelMensaje(error.message), traduccion.generico)
  }
  const delCodigo = textoDelCodigo(error.codigo, traduccion)
  if (delCodigo !== null) return delCodigo
  if (traduccion.codigosConMensajeDelServidor.includes(error.codigo)) {
    return textoVisibleOGenerico(error.message, traduccion.generico)
  }
  return traduccion.generico
}

// CHORE-03 (§D-1, S-01): el mensaje de un error de lo que se carga (incluidos los "Ver más"). Ante un
// VALIDACION que no es de un id con texto fijo, el texto fijo del lugar (`respaldo`), nunca el del
// servidor ni un trozo de él.
export const mensajeDeErrorDeConsulta = (
  error: unknown,
  traduccion: TraduccionDeErrores,
  respaldo: string = traduccion.generico,
): string => {
  if (!esApiError(error)) return respaldo
  const delCampo = textoDelCampo(error, traduccion)
  if (delCampo !== null) return delCampo
  if (error.codigo === "VALIDACION") return respaldo
  const delCodigo = textoDelCodigo(error.codigo, traduccion)
  if (delCodigo !== null) return delCodigo
  if (traduccion.codigosConMensajeDelServidor.includes(error.codigo)) {
    return textoVisibleOGenerico(error.message, respaldo)
  }
  return respaldo
}

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
