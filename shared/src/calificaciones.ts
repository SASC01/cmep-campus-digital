import { z } from "zod"

import { textoConContenidoSchema } from "./clases.js"
import { MAXIMO_CRITERIOS_RUBRICA, PUNTOS_MAXIMOS } from "./tareas.js"

// CALIFICACIONES-01a (§D-11). Calificar una entrega: el cuerpo del PUT y los códigos de error. Este
// archivo importa de clases.ts y tareas.ts y ninguno de ellos lo importa a él (sin ciclo).

// S-02: los puntos de un criterio y la calificación directa admiten hasta 2 decimales. Se compara
// contra el número redondeado a centésimas: 7.785 o 1.005 no pasan; 0.1 y 0.29 sí.
export const tieneHastaDosDecimales = (n: number): boolean =>
  Number.isFinite(n) && Math.round(n * 100) / 100 === n

const MENSAJE_PUNTOS = `Escribe de 0 a ${String(PUNTOS_MAXIMOS)} puntos`

export const puntosDeCalificacionSchema = z
  .number({ error: "Escribe un número de puntos" })
  .min(0, MENSAJE_PUNTOS)
  .max(PUNTOS_MAXIMOS, MENSAJE_PUNTOS)
  .refine(tieneHastaDosDecimales, "Usa hasta 2 decimales")

const enMinusculas = (id: string): string => id.toLowerCase()

const puntajeEnviadoSchema = z.strictObject({
  criterioId: z.uuid("Debe ser un identificador válido").transform(enMinusculas),
  puntos: puntosDeCalificacionSchema,
})

// version: la de la entrega que vio quien califica (edición concurrente). puntosDeLaTarea (Enmienda 1,
// M-02): los puntos de la tarea con que se abrió el panel; si ya no son los de la tarea, 409. Con
// rúbrica, puntajes trae un criterio por cada uno de la rúbrica y calificacion es null; sin rúbrica,
// puntajes es [] y calificacion es la directa. El comentario es opcional y va al hilo privado.
export const calificarEntregaSchema = z.strictObject({
  version: z.number({ error: "Falta la versión de la entrega" }).int().min(0),
  puntosDeLaTarea: z
    .number({ error: "Faltan los puntos de la tarea" })
    .int()
    .min(1)
    .max(PUNTOS_MAXIMOS),
  puntajes: z
    .array(puntajeEnviadoSchema, { error: "Los puntajes deben ser una lista" })
    .max(
      MAXIMO_CRITERIOS_RUBRICA,
      `La rúbrica tiene hasta ${String(MAXIMO_CRITERIOS_RUBRICA)} criterios`,
    )
    .refine(
      (puntajes) => new Set(puntajes.map((p) => p.criterioId)).size === puntajes.length,
      "No repitas un criterio",
    ),
  calificacion: puntosDeCalificacionSchema.nullable(),
  comentario: textoConContenidoSchema(1000, "Escribe tu comentario").optional(),
})

export const CODIGOS_CALIFICACIONES = {
  ENTREGA_MODIFICADA: "ENTREGA_MODIFICADA",
  RUBRICA_MODIFICADA: "RUBRICA_MODIFICADA",
  ENTREGA_NO_CALIFICABLE: "ENTREGA_NO_CALIFICABLE",
  TAREA_CON_CALIFICACIONES: "TAREA_CON_CALIFICACIONES",
} as const

export type CodigoCalificaciones =
  (typeof CODIGOS_CALIFICACIONES)[keyof typeof CODIGOS_CALIFICACIONES]
export type CalificarEntrega = z.infer<typeof calificarEntregaSchema>
