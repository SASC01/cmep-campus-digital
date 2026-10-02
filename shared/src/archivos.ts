import { z } from "zod"

// CLASES-d (§D-D4). Los tipos de archivo que se aceptan y sus extensiones. La política que los
// aplica vive en backend/core/archivos/politica.ts; el frontend los usa para el atributo accept y
// para validar antes de subir.
export const TIPOS_DE_ARCHIVO_PERMITIDOS: Record<string, readonly string[]> = {
  "application/pdf": ["pdf"],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "application/msword": ["doc"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.ms-powerpoint": ["ppt"],
  "text/plain": ["txt"],
}

// Solo estas imágenes tienen vista previa en el muro. SVG queda fuera a propósito: puede llevar
// código.
export const TIPOS_CON_VISTA_PREVIA: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]

export const TAMANO_MAXIMO_ARCHIVO_BYTES = 25 * 1024 * 1024
export const MAXIMO_ADJUNTOS_POR_PUBLICACION = 5

// T-39: las tres URL del almacén (subida, vista previa y descarga) son siempre http o https. Con otro
// protocolo (javascript:, data:, file:…) el schema.parse del cliente falla y la URL nunca se usa.
export const urlDelAlmacenSchema = z.url({
  protocol: /^https?$/,
  error: "La URL del almacén debe ser http o https",
})

// Los límites finos (extensión, tamaño, caracteres del nombre) los aplica core con
// ARCHIVO_INVALIDO; aquí solo se acota la forma para que ninguna cadena llegue sin tope.
export const solicitarSubidaSchema = z.object({
  nombre: z.string({ error: "El nombre del archivo debe ser texto" }).min(1).max(255),
  tipo: z.string({ error: "El tipo del archivo debe ser texto" }).min(1).max(127),
  tamano: z.number({ error: "El tamaño del archivo debe ser un número" }).int(),
})

export const solicitarSubidaRespuestaSchema = z.object({
  archivo: z.object({
    id: z.uuid(),
    nombre: z.string(),
    tipo: z.string(),
    tamano: z.number().int(),
  }),
  subida: z.object({
    url: urlDelAlmacenSchema,
    metodo: z.literal("PUT"),
    cabeceras: z.record(z.string(), z.string()),
    expiraEn: z.iso.datetime(),
  }),
})

// Nunca lleva la clave del objeto en el almacén.
export const adjuntoSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  tipo: z.string(),
  tamano: z.number().int(),
  vistaPrevia: z.object({ url: urlDelAlmacenSchema, expiraEn: z.iso.datetime() }).nullable(),
})

export const descargaRespuestaSchema = z.object({
  url: urlDelAlmacenSchema,
  expiraEn: z.iso.datetime(),
})

export const archivoIdParamSchema = z.object({
  archivoId: z.uuid("archivoId: debe ser un identificador válido"),
})

export const CODIGOS_ARCHIVOS = {
  ARCHIVO_INVALIDO: "ARCHIVO_INVALIDO",
  ARCHIVO_NO_SUBIDO: "ARCHIVO_NO_SUBIDO",
  ARCHIVO_NO_ENCONTRADO: "ARCHIVO_NO_ENCONTRADO",
  ALMACEN_NO_CONFIGURADO: "ALMACEN_NO_CONFIGURADO",
  ALMACEN_NO_DISPONIBLE: "ALMACEN_NO_DISPONIBLE",
} as const

export type CodigoArchivos = (typeof CODIGOS_ARCHIVOS)[keyof typeof CODIGOS_ARCHIVOS]
export type SolicitarSubida = z.infer<typeof solicitarSubidaSchema>
export type SolicitarSubidaRespuesta = z.infer<typeof solicitarSubidaRespuestaSchema>
export type Adjunto = z.infer<typeof adjuntoSchema>
export type DescargaRespuesta = z.infer<typeof descargaRespuestaSchema>
export type ArchivoIdParam = z.infer<typeof archivoIdParamSchema>
