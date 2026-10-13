import { z } from "zod"

import { textoConContenidoSchema } from "./clases.js"
import { paginacionSchema } from "./enlaces-registro.js"
import { alumnoDeEntregaSchema, estadoEntregaSchema } from "./entregas.js"
import { MAXIMO_CRITERIOS_RUBRICA, PUNTOS_MAXIMOS } from "./tareas.js"

// CALIFICACIONES-01a (§D-11). Calificar una entrega: el cuerpo del PUT y los códigos de error. Este
// archivo importa de clases.ts, enlaces-registro.ts, entregas.ts y tareas.ts y ninguno de ellos lo
// importa a él (sin ciclo).

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

// CALIFICACIONES-01b (§D-6, §D-7, §D-11). El gradebook del maestro y del admin, y "Mis calificaciones"
// del alumno. Todas las respuestas son estrictas: un campo de más (el correo, el estado de pago, la
// restricción, el rol o la versión) rompe el parse en el servidor en lugar de salir (RN-02).

export const motivoDeRiesgoSchema = z.enum(["promedio", "vencidas"])

// La forma de CalificacionGeneral de core/calificaciones/general.ts (§D-2.3).
export const desgloseDeCategoriaSchema = z.strictObject({
  id: z.uuid(),
  nombre: z.string(),
  peso: z.number().int().min(1).max(100),
  pesoEfectivo: z.number().min(0).max(100).nullable(),
  porcentaje: z.number().min(0).max(100).nullable(),
  obtenido: z.number().min(0),
  posible: z.number().int().min(0),
  tareas: z.number().int().min(0),
})

export const calificacionGeneralSchema = z.strictObject({
  modo: z.enum(["puntos", "categorias"]),
  porcentaje: z.number().min(0).max(100).nullable(),
  puntos: z.strictObject({
    obtenido: z.number().min(0),
    posible: z.number().int().min(0),
    tareas: z.number().int().min(0),
  }),
  categorias: z.array(desgloseDeCategoriaSchema),
  sinCategoria: z.strictObject({ tareas: z.number().int().min(0) }),
})

const categoriaDeLaTareaSchema = z.strictObject({ id: z.uuid(), nombre: z.string() })

const calificacionDeCeldaSchema = z.number().min(0).max(PUNTOS_MAXIMOS).nullable()

export const columnaDelGradebookSchema = z.strictObject({
  id: z.uuid(),
  titulo: z.string(),
  fechaLimite: z.iso.datetime(),
  puntos: z.number().int().min(1).max(PUNTOS_MAXIMOS),
  categoria: categoriaDeLaTareaSchema.nullable(),
})

// Sin fila de entrega: asignado, sin retraso ni calificación. Una calificada sin entrega (P-03 c′) es
// calificado, sin retraso y con su calificación.
export const celdaDelGradebookSchema = z.strictObject({
  tareaId: z.uuid(),
  estado: estadoEntregaSchema,
  conRetraso: z.boolean(),
  calificacion: calificacionDeCeldaSchema,
})

export const filaDelGradebookSchema = z.strictObject({
  alumno: alumnoDeEntregaSchema,
  // En el orden de las columnas.
  celdas: z.array(celdaDelGradebookSchema),
  porcentaje: z.number().min(0).max(100).nullable(),
  vencidasSinEntregar: z.number().int().min(0),
  motivosDeRiesgo: z.array(motivoDeRiesgoSchema),
})

// Calculado sobre toda la clase, no sobre la página.
export const resumenDelGradebookSchema = z.strictObject({
  modo: z.enum(["puntos", "categorias"]),
  totalAlumnos: z.number().int().min(0),
  promedioDeLaClase: z.number().min(0).max(100).nullable(),
  alumnosEnRiesgo: z.number().int().min(0),
})

export const gradebookRespuestaSchema = z.strictObject({
  tareas: z.array(columnaDelGradebookSchema),
  siguienteCursorTareas: z.uuid().nullable(),
  alumnos: z.array(filaDelGradebookSchema),
  siguienteCursor: z.uuid().nullable(),
  resumen: resumenDelGradebookSchema,
})

// cursor: un usuarioId (como el roster); cursorTareas: el id de la última tarea de la ventana anterior.
export const gradebookQuerySchema = paginacionSchema.extend({
  limite: z.coerce.number().int().min(1).max(50).optional().default(25),
  cursorTareas: z.uuid().transform(enMinusculas).optional(),
  limiteTareas: z.coerce.number().int().min(1).max(50).optional().default(20),
})

export const filtroDeMisCalificacionesSchema = z.enum([
  "todas",
  "asignadas",
  "entregadas",
  "calificadas",
  "sin-entregar",
])

// cursor: un tareaId de la clase.
export const misCalificacionesQuerySchema = paginacionSchema.extend({
  estado: filtroDeMisCalificacionesSchema.optional().default("todas"),
})

export const tareaDeMisCalificacionesSchema = z.strictObject({
  id: z.uuid(),
  titulo: z.string(),
  fechaLimite: z.iso.datetime(),
  puntos: z.number().int().min(1).max(PUNTOS_MAXIMOS),
  categoria: categoriaDeLaTareaSchema.nullable(),
  entrega: z.strictObject({
    estado: estadoEntregaSchema,
    conRetraso: z.boolean(),
    calificacion: calificacionDeCeldaSchema,
  }),
})

export const misCalificacionesRespuestaSchema = z.strictObject({
  general: calificacionGeneralSchema,
  tareas: z.array(tareaDeMisCalificacionesSchema),
  siguienteCursor: z.uuid().nullable(),
})

export type MotivoDeRiesgo = z.infer<typeof motivoDeRiesgoSchema>
export type DesgloseDeCategoria = z.infer<typeof desgloseDeCategoriaSchema>
export type CalificacionGeneral = z.infer<typeof calificacionGeneralSchema>
export type ColumnaDelGradebook = z.infer<typeof columnaDelGradebookSchema>
export type CeldaDelGradebook = z.infer<typeof celdaDelGradebookSchema>
export type FilaDelGradebook = z.infer<typeof filaDelGradebookSchema>
export type ResumenDelGradebook = z.infer<typeof resumenDelGradebookSchema>
export type GradebookRespuesta = z.infer<typeof gradebookRespuestaSchema>
export type GradebookQuery = z.infer<typeof gradebookQuerySchema>
export type FiltroDeMisCalificaciones = z.infer<typeof filtroDeMisCalificacionesSchema>
export type MisCalificacionesQuery = z.infer<typeof misCalificacionesQuerySchema>
export type TareaDeMisCalificaciones = z.infer<typeof tareaDeMisCalificacionesSchema>
export type MisCalificacionesRespuesta = z.infer<typeof misCalificacionesRespuestaSchema>
