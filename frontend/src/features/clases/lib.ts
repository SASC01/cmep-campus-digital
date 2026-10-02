import { estadoDeTerminoDeBusqueda } from "@campus/shared"

import { esApiError } from "@/services/apiClient"

import {
  MENSAJES_ERROR_CLASES_GENERALES,
  TEXTOS_INICIO_ESTUDIANTE,
  TEXTOS_INICIO_MAESTRO,
  TEXTOS_TARJETA,
  TEXTOS_UNIRSE,
} from "./data"
import type { ErroresFormulario, IncidenciaValidacion, RolDeClases, VarianteDeClase } from "./types"

// S-06: variante determinista a partir del id de la clase (UUID), sin guardarse ni elegirse. La
// suma de los puntos de código módulo 3 reparte entre las tres variantes.
export const varianteDeClase = (claseId: string): VarianteDeClase => {
  let suma = 0
  for (const caracter of claseId) suma += caracter.codePointAt(0) ?? 0
  const variantes: VarianteDeClase[] = ["verde", "azul", "blanca"]
  return variantes[suma % 3] ?? "blanca"
}

const textosPorRol = (rol: RolDeClases) =>
  rol === "estudiante" ? TEXTOS_INICIO_ESTUDIANTE : TEXTOS_INICIO_MAESTRO

export const titularInicio = (rol: RolDeClases, total: number): string => {
  const textos = textosPorRol(rol)
  if (total === 0) return textos.titularSinClases
  if (total === 1) return textos.titularUnaClase
  return textos.titularVariasClases(total)
}

export const siguientePasoInicio = (rol: RolDeClases, total: number): string => {
  const textos = textosPorRol(rol)
  return total === 0 ? textos.siguientePasoSinClases : textos.siguientePasoConClases
}

export const textoConteoAlumnos = (n: number): string => {
  if (n === 0) return TEXTOS_TARJETA.sinAlumnos
  if (n === 1) return TEXTOS_TARJETA.unAlumno
  return TEXTOS_TARJETA.variosAlumnos(n)
}

// §D-B5, T-24: el frontend decide con el mismo criterio que el servidor (estadoDeTerminoDeBusqueda,
// de shared/): un término se pregunta solo si, normalizado, mide de 3 a 120 caracteres. Lo que se
// envía es el texto tal cual y el servidor lo normaliza.
export const terminoDeBusquedaValido = (termino: string): boolean =>
  estadoDeTerminoDeBusqueda(termino) === "valido"

// El término es demasiado largo para el servidor (T-24): se avisa y no se pregunta.
export const terminoDeBusquedaMuyLargo = (termino: string): boolean =>
  estadoDeTerminoDeBusqueda(termino) === "largo"

// true si el foco se perdió: ningún elemento, <body> o uno que ya no está en el documento. Recibe el
// documento en lugar de leer el global, así que es pura respecto de su entrada (§D-C5 bis).
export const focoPerdido = (documento: Pick<Document, "activeElement" | "body">): boolean => {
  const activo = documento.activeElement
  return activo === null || activo === documento.body || !activo.isConnected
}

// N-03 (ronda 4 del manager): los dos textos fijos viven en data.ts, no aquí (regla 2 de CLAUDE.md).
const MENSAJES_ERROR_CLASES: Record<string, string> = {
  CODIGO_INVALIDO: TEXTOS_UNIRSE.codigoInvalido,
  SIN_ACCESO_A_LA_CLASE: MENSAJES_ERROR_CLASES_GENERALES.sinAccesoALaClase,
  ALUMNO_NO_ENCONTRADO: MENSAJES_ERROR_CLASES_GENERALES.alumnoNoEncontrado,
  PUBLICACION_NO_ENCONTRADA: MENSAJES_ERROR_CLASES_GENERALES.publicacionNoEncontrada,
  COMENTARIO_NO_ENCONTRADO: MENSAJES_ERROR_CLASES_GENERALES.comentarioNoEncontrado,
}

// T-17 (ronda 2 del tester): el mensaje de un VALIDACION del servidor lleva el nombre técnico del
// campo como prefijo ("descripcion: No puede tener más de 2000 caracteres"), porque el cliente y el
// servidor comparten el mismo esquema de shared/. Ese prefijo nunca es para la persona que usa la
// interfaz (ni siquiera cuando el campo no es uno de un formulario, como claseId).
const PREFIJO_DE_CAMPO = /^([a-zA-Z_]+):\s*/

const quitarPrefijoDeCampo = (mensaje: string): string => mensaje.replace(PREFIJO_DE_CAMPO, "")

// T-11 (ronda 1 del tester): un claseId con una forma inválida en la URL responde 400 VALIDACION
// con el nombre técnico del parámetro ("claseId: debe ser un identificador válido"). El mismo
// mensaje de SIN_ACCESO_A_LA_CLASE (S-08: la misma respuesta visible para lo que no existe) evita
// mostrar ese texto interno. Los demás VALIDACION (nombre, descripcion, codigo de un formulario)
// muestran el mensaje del servidor sin el prefijo técnico del campo (T-17).
export const mensajeDeErrorClases = (error: unknown): string => {
  if (!esApiError(error)) return MENSAJES_ERROR_CLASES_GENERALES.generico
  if (error.codigo === "VALIDACION") {
    if (error.message.startsWith("claseId:"))
      return MENSAJES_ERROR_CLASES_GENERALES.sinAccesoALaClase
    return quitarPrefijoDeCampo(error.message)
  }
  return MENSAJES_ERROR_CLASES[error.codigo] ?? MENSAJES_ERROR_CLASES_GENERALES.generico
}

// T-17 (ronda 2 del tester): el nombre de campo que trae el prefijo técnico del mensaje, o null si
// el error no es un VALIDACION con esa forma.
const campoDeErrorClases = (error: unknown): string | null => {
  if (!esApiError(error) || error.codigo !== "VALIDACION") return null
  const coincidencia = PREFIJO_DE_CAMPO.exec(error.message)
  return coincidencia ? (coincidencia[1] ?? null) : null
}

// T-34: el 400 "cursor: no es válido" de "Ver más" (el cursor ya no existe) no es un texto para la
// persona: en su lugar se muestra `textoDelCursor`, que dice qué pasó y qué hacer. Cualquier otro
// error sigue pasando por mensajeDeErrorClases.
export const mensajeDeErrorDeLista = (error: unknown, textoDelCursor: string): string => {
  if (campoDeErrorClases(error) === "cursor") return textoDelCursor
  return mensajeDeErrorClases(error)
}

// T-19 (ronda 3 del tester): un error que no es de un campo (500, sin conexión, SIN_ACCESO_A_LA_CLASE
// al editar) no es un VALIDACION con el prefijo técnico de un campo, así que no debe marcar ningún
// campo como inválido: es un error del formulario, no de un campo (CLAUDE.md, "Manejo de errores en
// el frontend"). Devuelve el error asociado al campo del formulario que nombra el VALIDACION del
// servidor, o `null` si el error no encaja en ninguno de `camposValidos` (porque no es VALIDACION,
// o porque nombra un campo que ese formulario no tiene); en ese caso, cada formulario decide qué
// hacer con el error (un aviso del formulario, o su propio error de dominio, como CODIGO_INVALIDO
// en "Unirme a la clase").
export const erroresDeFormularioClases = (
  error: unknown,
  camposValidos: readonly string[],
): ErroresFormulario | null => {
  if (!esApiError(error) || error.codigo !== "VALIDACION") return null
  const campo = campoDeErrorClases(error)
  if (campo === null || !camposValidos.includes(campo)) return null
  return { [campo]: mensajeDeErrorClases(error) }
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

// N-04 (ronda 4 de CLASES-a, §D-B4 bis): en "Unirme a la clase" solo CODIGO_INVALIDO y un VALIDACION
// de "codigo" son errores del campo del código. Cualquier otro (un 500, "sin conexión",
// ACCESO_RESTRINGIDO) devuelve null y el formulario avisa con un toast, sin marcar el campo: es el
// mismo patrón que T-19 en FormularioClase.
export const errorDelCampoCodigo = (error: unknown): ErroresFormulario | null => {
  if (esApiError(error) && error.codigo === "CODIGO_INVALIDO") {
    return { codigo: mensajeDeErrorClases(error) }
  }
  return erroresDeFormularioClases(error, ["codigo"])
}

// DESIGN.md §7.14: cuando la fila con el foco sale de la lista, el foco va a la fila que ocupa su
// lugar (la siguiente o, si era la última, la anterior). `previos` son los ids del render anterior;
// undefined si la lista no estaba cargada. Sin filas, no hay vecina y el foco va al encabezado.
export const vecinaDeFila = (
  previos: string[] | undefined,
  actuales: string[],
  id: string,
): string | undefined => {
  if (actuales.length === 0) return undefined
  const indice = previos?.indexOf(id) ?? actuales.indexOf(id)
  return actuales[Math.min(Math.max(indice, 0), actuales.length - 1)]
}
