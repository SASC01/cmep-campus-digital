import { z } from "zod"

import { autorDelMuroSchema, textoConContenidoSchema } from "./clases.js"

// CLASES-03b (§D-5, §D-6, P-07, S-06). "Dudas" de una clase: una duda sin título y sus respuestas,
// que tienen la forma de los comentarios. Nunca llevan correo, estado de pago, restricción, rol ni
// quién marcó la duda como resuelta.
export const crearDudaSchema = z.object({
  texto: textoConContenidoSchema(2000, "Escribe tu duda"),
})

export const crearRespuestaSchema = z.object({
  texto: textoConContenidoSchema(1000, "Escribe tu respuesta"),
})

// Estricto a propósito: una llave de más o un texto como "true" responden 400.
export const marcarDudaSchema = z.strictObject({
  resuelta: z.boolean({ error: "resuelta: debe ser verdadero o falso" }),
})

// Los ids de la ruta se pasan a minúsculas: un UUID es el mismo en mayúsculas y en minúsculas.
export const dudaIdParamSchema = z.object({
  dudaId: z.uuid("dudaId: debe ser un identificador válido").transform((id) => id.toLowerCase()),
})

export const dudaYRespuestaParamSchema = dudaIdParamSchema.extend({
  respuestaId: z
    .uuid("respuestaId: debe ser un identificador válido")
    .transform((id) => id.toLowerCase()),
})

// `propia` y `puedeBorrar` los decide el servidor con la persona que pide la lista; `puedeMarcar`
// sale de la relación con la clase (P-07). La interfaz solo los lee.
export const dudaSchema = z.object({
  id: z.uuid(),
  texto: z.string(),
  autor: autorDelMuroSchema,
  creadoEn: z.iso.datetime(),
  resuelta: z.boolean(),
  resueltaEn: z.iso.datetime().nullable(),
  respuestas: z.number().int().min(0),
  propia: z.boolean(),
  puedeBorrar: z.boolean(),
  puedeMarcar: z.boolean(),
})

export const dudaRespuestaSchema = z.object({ duda: dudaSchema })

export const listaDudasRespuestaSchema = z.object({
  dudas: z.array(dudaSchema),
  siguienteCursor: z.uuid().nullable(),
})

export const CODIGOS_DUDAS = {
  DUDA_NO_ENCONTRADA: "DUDA_NO_ENCONTRADA",
  RESPUESTA_NO_ENCONTRADA: "RESPUESTA_NO_ENCONTRADA",
} as const

export type CrearDuda = z.infer<typeof crearDudaSchema>
export type CrearRespuesta = z.infer<typeof crearRespuestaSchema>
export type MarcarDuda = z.infer<typeof marcarDudaSchema>
export type DudaIdParam = z.infer<typeof dudaIdParamSchema>
export type DudaYRespuestaParam = z.infer<typeof dudaYRespuestaParamSchema>
export type Duda = z.infer<typeof dudaSchema>
export type DudaRespuesta = z.infer<typeof dudaRespuestaSchema>
export type ListaDudasRespuesta = z.infer<typeof listaDudasRespuestaSchema>
export type CodigoDudas = (typeof CODIGOS_DUDAS)[keyof typeof CODIGOS_DUDAS]
