import { TIPOS_DE_ARCHIVO_PERMITIDOS } from "@campus/shared"

// TAREAS-01c (§D-9): movidos sin cambios desde features/clases/data.ts, que los reexporta.

// §D-D6: textos de CLASES-d (propuesta).
export const TEXTOS_ADJUNTOS = {
  adjuntar: "Adjuntar archivos",
  ayuda: "Hasta 5 archivos de 25 MB: PDF, imágenes, Word, Excel, PowerPoint o texto.",
  elegidos: "Archivos elegidos",
  adjuntos: "Archivos adjuntos",
  quitar: "Quitar",
  descargar: "Descargar",
  imagenAdjunta: (nombre: string) => `Imagen adjunta: ${nombre}`,
  errorPesaMucho: (nombre: string) => `«${nombre}» pesa más de 25 MB.`,
  errorTipo: (nombre: string) => `«${nombre}» no es de un tipo permitido.`,
  errorCantidad: "Puedes adjuntar hasta 5 archivos.",
  errorSubida: (nombre: string) => `No pudimos subir «${nombre}». Inténtalo de nuevo.`,
  // T-41: la solicitud de subida de un archivo fue rechazada; `motivo` ya viene en español.
  errorRechazado: (nombre: string, motivo: string) => `No pudimos subir «${nombre}»: ${motivo}`,
  // T-38: la lista no cambia mientras se publica.
  listaFija: "Mientras se publica no puedes cambiar los archivos.",
} as const

// Los tipos y las extensiones que acepta el selector de archivos, salidos de la misma tabla que usa
// el servidor para validar (shared/).
export const ACCEPT_DE_ADJUNTOS = Object.entries(TIPOS_DE_ARCHIVO_PERMITIDOS)
  .flatMap(([tipo, extensiones]) => [tipo, ...extensiones.map((extension) => `.${extension}`)])
  .join(",")

// T-40: el muro se vuelve a pedir este tiempo antes de que venza la primera vista previa; así las URL
// viejas siguen vigentes mientras llega la respuesta nueva.
export const MARGEN_DE_VISTA_PREVIA_MS = 60_000

// §D-D6 (TAREAS-01c, §D-9): los mensajes de los códigos de error de los archivos adjuntos, ya en
// español, y su relación con los cuatro códigos que el servidor responde. Los usan features/clases
// (mensajeDeErrorClases) y features/tareas (el formulario de tarea sube adjuntos).
export const MENSAJES_ERROR_DE_ARCHIVOS = {
  archivoNoSubido: "Uno de los archivos no terminó de subir. Inténtalo de nuevo.",
  archivoInvalido: "Uno de los archivos no coincide con lo que elegiste. Vuelve a adjuntarlo.",
  almacenNoDisponible: "Los archivos no están disponibles en este momento. Inténtalo más tarde.",
} as const

export const MENSAJES_POR_CODIGO_DE_ARCHIVO: Readonly<Record<string, string>> = {
  ARCHIVO_NO_SUBIDO: MENSAJES_ERROR_DE_ARCHIVOS.archivoNoSubido,
  ARCHIVO_INVALIDO: MENSAJES_ERROR_DE_ARCHIVOS.archivoInvalido,
  ALMACEN_NO_CONFIGURADO: MENSAJES_ERROR_DE_ARCHIVOS.almacenNoDisponible,
  ALMACEN_NO_DISPONIBLE: MENSAJES_ERROR_DE_ARCHIVOS.almacenNoDisponible,
}
