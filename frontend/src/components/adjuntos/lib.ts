import {
  MAXIMO_ADJUNTOS_POR_PUBLICACION,
  TAMANO_MAXIMO_ARCHIVO_BYTES,
  TIPOS_DE_ARCHIVO_PERMITIDOS,
  type Adjunto,
} from "@campus/shared"

import { esApiError } from "@/services/apiClient"

import { MARGEN_DE_VISTA_PREVIA_MS, TEXTOS_ADJUNTOS } from "./data"
import type { ArchivoCandidato } from "./types"

// TAREAS-01c (§D-9): movido desde features/clases/lib.ts, que lo reexporta. Lo que dependía de
// mensajeDeErrorClases recibe la función de mensajes como parámetro; features/clases conserva un
// envoltorio con el mismo nombre y la misma salida.

const extensionDe = (nombre: string): string => {
  const punto = nombre.lastIndexOf(".")
  if (punto < 0) return ""
  return nombre.slice(punto + 1).toLowerCase()
}

// Algunos sistemas no informan el tipo de un archivo (File.type vacío): se infiere por la extensión,
// con la misma tabla que usa el servidor. "" si no se reconoce.
export const tipoDeArchivo = (archivo: Pick<ArchivoCandidato, "name" | "type">): string => {
  if (archivo.type !== "") return archivo.type
  const extension = extensionDe(archivo.name)
  const entrada = Object.entries(TIPOS_DE_ARCHIVO_PERMITIDOS).find(([, extensiones]) =>
    extensiones.includes(extension),
  )
  return entrada?.[0] ?? ""
}

// §D-D5: la misma política del servidor, antes de pedirle una URL de subida. `yaElegidos` es el
// número de archivos que ya estaban en la lista. null: el archivo se puede agregar.
export const errorDeArchivoElegido = (
  archivo: ArchivoCandidato,
  yaElegidos: number,
): string | null => {
  if (archivo.size > TAMANO_MAXIMO_ARCHIVO_BYTES)
    return TEXTOS_ADJUNTOS.errorPesaMucho(archivo.name)
  const tipo = tipoDeArchivo(archivo)
  const extensiones = Object.hasOwn(TIPOS_DE_ARCHIVO_PERMITIDOS, tipo)
    ? TIPOS_DE_ARCHIVO_PERMITIDOS[tipo]
    : undefined
  if (extensiones === undefined || !extensiones.includes(extensionDe(archivo.name))) {
    return TEXTOS_ADJUNTOS.errorTipo(archivo.name)
  }
  if (yaElegidos >= MAXIMO_ADJUNTOS_POR_PUBLICACION) return TEXTOS_ADJUNTOS.errorCantidad
  return null
}

// T-40 (§D-D5): cuánto tiempo se considera fresca una lista cargada con adjuntos. Las vistas previas
// son URL firmadas que vencen; la lista se vuelve vieja MARGEN_DE_VISTA_PREVIA_MS antes del `expiraEn`
// más temprano de todos los adjuntos recibidos, medido desde `dataUpdatedAt` (que se renueva con cada
// página). Con un vencimiento ya pasado da 0; sin vistas previas, `tiempoSinVistasPrevias`.
export const tiempoFrescoDeAdjuntos = (
  adjuntos: readonly Adjunto[],
  dataUpdatedAt: number,
  tiempoSinVistasPrevias: number,
): number => {
  const vencimientos = adjuntos
    .flatMap((adjunto) =>
      adjunto.vistaPrevia === null ? [] : [Date.parse(adjunto.vistaPrevia.expiraEn)],
    )
    .filter((vencimiento) => !Number.isNaN(vencimiento))
  if (vencimientos.length === 0) return tiempoSinVistasPrevias
  const primero = Math.min(...vencimientos)
  return Math.max(0, primero - MARGEN_DE_VISTA_PREVIA_MS - dataUpdatedAt)
}

// T-41: una solicitud rechazada (ApiError) dice qué archivo y por qué; con ARCHIVO_INVALIDO el motivo es
// el mensaje del servidor (ya en español y sin valores). Un fallo del PUT al almacén no es un
// ApiError: conserva el texto de siempre. `mensajeDeError` es el de cada módulo para los demás códigos.
export const avisoDeFalloAlSubir = (
  error: unknown,
  nombre: string,
  mensajeDeError: (error: unknown) => string,
): string => {
  if (!esApiError(error)) return TEXTOS_ADJUNTOS.errorSubida(nombre)
  const motivo = error.codigo === "ARCHIVO_INVALIDO" ? error.message : mensajeDeError(error)
  return TEXTOS_ADJUNTOS.errorRechazado(nombre, motivo)
}

// ENTREGAS-01d (§D-9.1): la ruta de archivos de una clase (subida y descarga de materiales, anuncios y
// tareas). La de una entrega la arma quien la usa (…/tareas/:tareaId/entrega o …/entregas/:alumnoId).
export const rutaDeArchivosDeLaClase = (claseId: string): string => `/api/clases/${claseId}`
