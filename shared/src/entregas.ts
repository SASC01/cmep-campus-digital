import { z } from "zod"

import { adjuntoSchema } from "./archivos.js"
import { archivoIdsSchema, autorDelMuroSchema } from "./clases.js"

// ENTREGAS-01b (§D-3.2). La entrega de un alumno en una tarea. Este archivo no importa tareas.ts:
// tareas.ts toma de aquí el estado de la entrega para "Trabajo de clase" y una importación de ida y
// vuelta dejaría un esquema sin inicializar al cargar el índice.

// P-04 (a): los archivos usan los mismos límites que los materiales (MAXIMO_ADJUNTOS_POR_PUBLICACION
// y TAMANO_MAXIMO_ARCHIVO_BYTES); los enlaces, estos.
export const MAXIMO_ENLACES_POR_ENTREGA = 5
export const LONGITUD_MAXIMA_ENLACE = 2048

const MENSAJE_ENLACE = "Escribe un enlace que empiece con https:// o http://."

const enMinusculas = (ids: readonly string[]): string[] => ids.map((id) => id.toLowerCase())

// S-08: solo http o https y sin usuario ni contraseña en la URL (un «https://banco.com@otro.com»
// disfraza el destino). URL lanza con lo que no puede leer (también «https://» sin servidor).
const esEnlaceAceptado = (texto: string): boolean => {
  let url: URL
  try {
    url = new URL(texto)
  } catch {
    return false
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false
  return url.username === "" && url.password === ""
}

// Se guarda normalizado (URL.href): los caracteres de control y los bidireccionales quedan
// codificados, así que un inversor de dirección no puede disfrazar el destino al mostrarlo.
// T-01 (ronda 1 de 01b): el tope se mide también después de normalizar, porque codificar alarga el
// enlace (una ñ o un espacio pasan a 3 o más caracteres): el enlace que se guarda y se devuelve nunca
// supera LONGITUD_MAXIMA_ENLACE. El tope del texto crudo se conserva para no procesar entradas enormes.
export const enlaceDeEntregaSchema = z
  .string({ error: MENSAJE_ENLACE })
  .trim()
  .min(1, MENSAJE_ENLACE)
  .max(LONGITUD_MAXIMA_ENLACE, MENSAJE_ENLACE)
  .refine(esEnlaceAceptado, { error: MENSAJE_ENLACE })
  .transform((texto) => new URL(texto).href)
  .pipe(z.string().max(LONGITUD_MAXIMA_ENLACE, MENSAJE_ENLACE))

// Al leer se vuelve a exigir http o https (como urlDelAlmacenSchema): si la base trajera otra cosa,
// el parse del cliente falla y el enlace nunca se pinta.
export const urlDeEntregaRespuestaSchema = z.url({
  protocol: /^https?$/,
  error: "El enlace de la entrega debe ser http o https",
})

export const entregarSchema = z.strictObject({
  // Los ids se comparan en minúsculas: un UUID es el mismo en mayúsculas y en minúsculas.
  archivoIds: archivoIdsSchema
    .refine((ids) => new Set(enMinusculas(ids)).size === ids.length, {
      error: "No repitas un archivo adjunto",
    })
    .transform(enMinusculas),
  enlaces: z
    .array(enlaceDeEntregaSchema, { error: "Los enlaces deben ser una lista" })
    .max(MAXIMO_ENLACES_POR_ENTREGA, `Puedes agregar hasta ${MAXIMO_ENLACES_POR_ENTREGA} enlaces`)
    .default([]),
})

// §D-3.7: anular no lleva cuerpo; si llega uno, no puede traer campos.
export const anularEntregaSchema = z.strictObject({})

export const estadoEntregaSchema = z.enum(["asignado", "entregado", "calificado"])

// Lo que ve el alumno de su propia entrega (S-11): sin version ni id de la fila.
export const miEntregaSchema = z.strictObject({
  estado: estadoEntregaSchema,
  fechaEntrega: z.iso.datetime().nullable(),
  conRetraso: z.boolean(),
  enlaces: z.array(urlDeEntregaRespuestaSchema),
  adjuntos: z.array(adjuntoSchema),
  puedeEntregar: z.boolean(),
  puedeAnular: z.boolean(),
})

export const miEntregaRespuestaSchema = z.strictObject({ entrega: miEntregaSchema })

// Lo que ve un maestro de la clase o el admin (S-05, S-11): el alumno solo con id y nombre, y la
// version que usará CALIFICACIONES. Nunca correo, estado de pago ni restricción (RN-02).
export const alumnoDeEntregaSchema = z.strictObject({ id: z.uuid(), nombre: z.string() })

export const entregaDeAlumnoSchema = z.strictObject({
  alumno: alumnoDeEntregaSchema,
  estado: estadoEntregaSchema,
  fechaEntrega: z.iso.datetime().nullable(),
  conRetraso: z.boolean(),
  enlaces: z.array(urlDeEntregaRespuestaSchema),
  adjuntos: z.array(adjuntoSchema),
  version: z.number().int().min(0),
})

export const entregaDeAlumnoRespuestaSchema = z.strictObject({ entrega: entregaDeAlumnoSchema })

export const filaDeEntregaSchema = z.strictObject({
  alumno: alumnoDeEntregaSchema,
  estado: estadoEntregaSchema,
  fechaEntrega: z.iso.datetime().nullable(),
  conRetraso: z.boolean(),
})

export const listaEntregasRespuestaSchema = z.strictObject({
  entregas: z.array(filaDeEntregaSchema),
  total: z.number().int().min(0),
  entregadas: z.number().int().min(0),
  siguienteCursor: z.uuid().nullable(),
})

// Los ids de la ruta se pasan a minúsculas, como tareaIdParamSchema.
const idDeRuta = (campo: string) =>
  z.uuid(`${campo}: debe ser un identificador válido`).transform((id) => id.toLowerCase())

export const tareaDeEntregaParamSchema = z.object({ tareaId: idDeRuta("tareaId") })

export const alumnoDeEntregaParamSchema = tareaDeEntregaParamSchema.extend({
  alumnoId: idDeRuta("alumnoId"),
})

export const archivoDeEntregaParamSchema = tareaDeEntregaParamSchema.extend({
  archivoId: idDeRuta("archivoId"),
})

export const archivoDeEntregaDeAlumnoParamSchema = alumnoDeEntregaParamSchema.extend({
  archivoId: idDeRuta("archivoId"),
})

export const CODIGOS_ENTREGAS = {
  ENTREGA_YA_REALIZADA: "ENTREGA_YA_REALIZADA",
  ENTREGA_NO_REALIZADA: "ENTREGA_NO_REALIZADA",
  ENTREGA_CALIFICADA: "ENTREGA_CALIFICADA",
  ENTREGA_CERRADA: "ENTREGA_CERRADA",
  ENTREGA_VACIA: "ENTREGA_VACIA",
} as const

export type CodigoEntregas = (typeof CODIGOS_ENTREGAS)[keyof typeof CODIGOS_ENTREGAS]
export type Entregar = z.infer<typeof entregarSchema>
export type EstadoEntrega = z.infer<typeof estadoEntregaSchema>
export type MiEntrega = z.infer<typeof miEntregaSchema>
export type MiEntregaRespuesta = z.infer<typeof miEntregaRespuestaSchema>
export type EntregaDeAlumno = z.infer<typeof entregaDeAlumnoSchema>
export type EntregaDeAlumnoRespuesta = z.infer<typeof entregaDeAlumnoRespuestaSchema>
export type FilaDeEntrega = z.infer<typeof filaDeEntregaSchema>
export type ListaEntregasRespuesta = z.infer<typeof listaEntregasRespuestaSchema>
export type AlumnoDeEntregaParam = z.infer<typeof alumnoDeEntregaParamSchema>
export type ArchivoDeEntregaParam = z.infer<typeof archivoDeEntregaParamSchema>
export type ArchivoDeEntregaDeAlumnoParam = z.infer<typeof archivoDeEntregaDeAlumnoParamSchema>

// ENTREGAS-01c (§D-4). El hilo privado de una entrega: uno por alumno y tarea (S-04), entre el alumno
// y los maestros de la clase; el admin lo lee y no escribe (P-01 a). Sin borrar ni editar en esta
// fase. El cuerpo de un comentario es crearComentarioSchema (clases.ts), como en el muro. El autor sale
// firmado (firmaDelAutor) y propio dice si lo escribió quien pide; sin puedeBorrar, sin rol, correo
// ni estado de pago.
export const comentarioPrivadoSchema = z.strictObject({
  id: z.uuid(),
  texto: z.string(),
  autor: autorDelMuroSchema,
  creadoEn: z.iso.datetime(),
  propio: z.boolean(),
})

export const comentarioPrivadoRespuestaSchema = z.strictObject({
  comentario: comentarioPrivadoSchema,
})

export const listaComentariosPrivadosRespuestaSchema = z.strictObject({
  comentarios: z.array(comentarioPrivadoSchema),
  siguienteCursor: z.uuid().nullable(),
})

export type ComentarioPrivado = z.infer<typeof comentarioPrivadoSchema>
export type ComentarioPrivadoRespuesta = z.infer<typeof comentarioPrivadoRespuestaSchema>
export type ListaComentariosPrivadosRespuesta = z.infer<
  typeof listaComentariosPrivadosRespuestaSchema
>
