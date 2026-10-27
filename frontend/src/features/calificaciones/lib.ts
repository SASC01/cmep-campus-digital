import { estadoDeEntregaVisible, TEXTOS_ESTADO_DE_ENTREGA } from "@/lib/estado-de-entrega"
import { campoDeErrorDeApi, esErrorDeCursor } from "@/lib/errores-de-api"
import { formatearPuntos } from "@/lib/format"
import { CODIGOS_QUE_REDIRIGE_EL_CLIENTE, esApiError } from "@/services/apiClient"

import { MENSAJES_ERROR_CALIFICACIONES, TEXTOS_GRADEBOOK } from "./data"
import type {
  AccionDeVentana,
  CeldaDelGradebook,
  DimensionDelGradebook,
  FiltroDeMisCalificaciones,
  LimitesDelGradebook,
  MotivoDeRiesgo,
  TextoDeCelda,
  VentanaDelGradebook,
  VentanasDelGradebook,
} from "./types"

// CALIFICACIONES-01d (§D-13.2). Funciones puras del gradebook y de "Mis calificaciones".

const rutaDeLaClase = (claseId: string): string => `/api/clases/${claseId}`

// Una ventana del gradebook: los dos tamaños siempre; cada cursor, solo si hay.
export const rutaDelGradebook = (
  claseId: string,
  ventana: VentanaDelGradebook,
  limites: LimitesDelGradebook,
): string => {
  const consulta = new URLSearchParams({
    limite: String(limites.limite),
    limiteTareas: String(limites.limiteTareas),
  })
  if (ventana.cursor !== null) consulta.set("cursor", ventana.cursor)
  if (ventana.cursorTareas !== null) consulta.set("cursorTareas", ventana.cursorTareas)
  return `${rutaDeLaClase(claseId)}/gradebook?${consulta.toString()}`
}

// Una página de "Mis calificaciones" con su filtro (el filtro lo aplica el servidor).
export const rutaDeMisCalificaciones = (
  claseId: string,
  filtro: FiltroDeMisCalificaciones,
  cursor: string | undefined,
  limite: number,
): string => {
  const consulta = new URLSearchParams({ estado: filtro, limite: String(limite) })
  if (cursor !== undefined) consulta.set("cursor", cursor)
  return `${rutaDeLaClase(claseId)}/mis-calificaciones?${consulta.toString()}`
}

// Lo que dice una celda: la calificación si la hay; si no, el estado en palabras de
// estadoDeEntregaVisible; la asignada sin vencer se ve "—" y se oye "Asignado". "con retraso" va
// aparte solo cuando el texto visible no lo dice ya (una calificada que se entregó tarde).
export const textoDeCelda = (
  celda: CeldaDelGradebook,
  fechaLimite: string,
  ahora: Date,
): TextoDeCelda => {
  if (celda.estado === "calificado" && celda.calificacion !== null) {
    return {
      visible: formatearPuntos(celda.calificacion),
      soloLector: null,
      conRetraso: celda.conRetraso,
    }
  }
  const estado = estadoDeEntregaVisible(celda, fechaLimite, ahora)
  if (estado === "asignado") {
    return {
      visible: TEXTOS_GRADEBOOK.sinDato,
      soloLector: TEXTOS_GRADEBOOK.asignado,
      conRetraso: false,
    }
  }
  return { visible: TEXTOS_ESTADO_DE_ENTREGA[estado], soloLector: null, conRetraso: false }
}

const TEXTO_DE_MOTIVO: Readonly<Record<MotivoDeRiesgo, string>> = {
  promedio: TEXTOS_GRADEBOOK.motivoPromedio,
  vencidas: TEXTOS_GRADEBOOK.motivoVencidas,
}

// Los motivos de riesgo de una fila, en el orden del servidor.
export const textoDeMotivos = (motivos: readonly MotivoDeRiesgo[]): string =>
  motivos.map((motivo) => TEXTO_DE_MOTIVO[motivo]).join(TEXTOS_GRADEBOOK.separadorDeMotivos)

// S-14: relativos a la ruta de la clase, así sirven igual para el maestro, el admin y el alumno.
export const enlaceAEntregaDeAlumno = (tareaId: string, alumnoId: string): string =>
  `../tareas/${tareaId}/entregas/${alumnoId}`

export const enlaceATarea = (tareaId: string): string => `../tareas/${tareaId}`

export const VENTANAS_INICIALES: VentanasDelGradebook = {
  ventana: { cursor: null, cursorTareas: null },
  anterioresDeAlumnos: [],
  anterioresDeTareas: [],
}

// La pila de ventanas: avanzar guarda el cursor de esa dimensión en su pila; regresar lo saca. La otra
// dimensión no cambia.
export const ventanaSiguiente = (
  estado: VentanasDelGradebook,
  dimension: DimensionDelGradebook,
  siguienteCursor: string,
): VentanasDelGradebook => {
  if (dimension === "alumnos") {
    return {
      ...estado,
      ventana: { ...estado.ventana, cursor: siguienteCursor },
      anterioresDeAlumnos: [...estado.anterioresDeAlumnos, estado.ventana.cursor],
    }
  }
  return {
    ...estado,
    ventana: { ...estado.ventana, cursorTareas: siguienteCursor },
    anterioresDeTareas: [...estado.anterioresDeTareas, estado.ventana.cursorTareas],
  }
}

// Con la pila vacía no hay a dónde regresar: el estado no cambia (el botón tampoco se muestra).
export const ventanaAnterior = (
  estado: VentanasDelGradebook,
  dimension: DimensionDelGradebook,
): VentanasDelGradebook => {
  const pila = dimension === "alumnos" ? estado.anterioresDeAlumnos : estado.anterioresDeTareas
  const ultimo = pila.at(-1)
  if (ultimo === undefined) return estado
  const resto = pila.slice(0, -1)
  if (dimension === "alumnos") {
    return { ...estado, ventana: { ...estado.ventana, cursor: ultimo }, anterioresDeAlumnos: resto }
  }
  return {
    ...estado,
    ventana: { ...estado.ventana, cursorTareas: ultimo },
    anterioresDeTareas: resto,
  }
}

// La dimensión que mueve cada botón.
export const DIMENSION_DE_LA_ACCION: Readonly<Record<AccionDeVentana, DimensionDelGradebook>> = {
  "tareas-recientes": "tareas",
  "tareas-antiguas": "tareas",
  "alumnos-anteriores": "alumnos",
  "alumnos-siguientes": "alumnos",
}

// Enmienda 2 (§D-13.2): el 400 de un cursor que la vista reconoce. Decide por el prefijo exacto que
// lee campoDeErrorDeApi ("cursor:" en las dos vistas, más "cursorTareas:" en el gradebook), con
// cualquier mensaje después; no mira lo que se envió. CHORE-03 (§D-4): es la misma función de
// lib/errores-de-api.ts.
export const esErrorDeCursorDeCalificaciones = esErrorDeCursor

// Se perdió el acceso a la clase (o el id de la clase no sirve): reemplaza la vista.
export const esErrorDeSinAcceso = (error: unknown): boolean =>
  (esApiError(error) && error.codigo === "SIN_ACCESO_A_LA_CLASE") ||
  campoDeErrorDeApi(error) === "claseId"

// Un error con que apiClient ya redirigió: no se avisa.
export const errorQueRedirigeElCliente = (error: unknown): boolean =>
  esApiError(error) && CODIGOS_QUE_REDIRIGE_EL_CLIENTE.includes(error.codigo)

// Enmienda 2 (S-22): el texto de un error de consulta. El de "sin acceso" para la clase; para todo lo
// demás (un 400 fuera de contrato, un 5xx, un 503, la falta de conexión o un código desconocido), el
// respaldo del lugar. Nunca el texto que trae el servidor ni un trozo de él.
export const mensajeDeErrorCalificaciones = (error: unknown, respaldo: string): string => {
  if (esErrorDeSinAcceso(error)) return MENSAJES_ERROR_CALIFICACIONES.sinAcceso
  return respaldo
}
