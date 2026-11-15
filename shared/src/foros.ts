import { z } from "zod"

import { adjuntoSchema } from "./archivos.js"
import { autorDelMuroSchema, textoConContenidoSchema, textoDeUnaLineaSchema } from "./clases.js"
import { paginacionSchema } from "./enlaces-registro.js"
import { calificacionDeEntregaSchema, estadoEntregaSchema } from "./entregas.js"
import {
  criterioDeRubricaSchema,
  crearTareaSchema,
  editarTareaSchema,
  fechaLimiteSchema,
  idOpcionalSchema,
  PUNTOS_MAXIMOS,
} from "./tareas.js"

// FORO-01a (§D-3.2; RF-66 a RF-68). Un foro es una actividad: su fila de tareas guarda la fecha
// límite, los puntos, la rúbrica, las tardías, la categoría y el tema, como una tarea. El
// planteamiento viaja en la llave instrucciones para reutilizar la normalización de la tarea (S-01).
// Ninguna respuesta lleva correo, estado de pago, restricción, rol, el id del trabajo de la cola ni
// requiereAdjuntos.

// Los ids de la ruta se pasan a minúsculas: un UUID es el mismo en mayúsculas y en minúsculas.
const foroIdSchema = z
  .uuid("foroId: debe ser un identificador válido")
  .transform((id) => id.toLowerCase())
const participacionIdSchema = z
  .uuid("participacionId: debe ser un identificador válido")
  .transform((id) => id.toLowerCase())
const alumnoIdSchema = z
  .uuid("alumnoId: debe ser un identificador válido")
  .transform((id) => id.toLowerCase())

// Es z.object, como crearTareaSchema: un requiereAdjuntos enviado se ignora (un foro no se entrega
// con archivos). Los puntos, la rúbrica, los adjuntos y la versión llevan la regla y el mensaje de
// la tarea.
export const crearForoSchema = z.object({
  titulo: textoDeUnaLineaSchema(200, "Escribe el título del foro"),
  instrucciones: textoConContenidoSchema(10000, "Escribe el planteamiento del foro"),
  fechaLimite: fechaLimiteSchema,
  puntos: crearTareaSchema.shape.puntos,
  aceptaTardias: z
    .boolean({ error: "Elige si se aceptan participaciones con retraso" })
    .default(true),
  categoriaId: idOpcionalSchema,
  temaId: idOpcionalSchema,
  rubrica: crearTareaSchema.shape.rubrica,
  archivoIds: crearTareaSchema.shape.archivoIds,
})

export const editarForoSchema = crearForoSchema.extend({
  version: editarTareaSchema.shape.version,
})

export const foroIdParamSchema = z.object({ foroId: foroIdSchema })

export const participacionParamSchema = z.object({
  foroId: foroIdSchema,
  participacionId: participacionIdSchema,
})

export const participanteParamSchema = z.object({
  foroId: foroIdSchema,
  alumnoId: alumnoIdSchema,
})

export const crearParticipacionSchema = z.object({
  texto: textoConContenidoSchema(5000, "Escribe tu participación"),
})

export const crearReplicaSchema = z.object({
  texto: textoConContenidoSchema(1000, "Escribe tu réplica"),
})

// La lista de foros se pagina con el criterio de siempre (20 por omisión, hasta 100).
export const forosQuerySchema = paginacionSchema

// El detalle de la tarea sin requiereAdjuntos; instrucciones es el planteamiento.
export const foroDetalleSchema = z.strictObject({
  id: z.uuid(),
  titulo: z.string(),
  instrucciones: z.string(),
  fechaLimite: z.iso.datetime(),
  puntos: z.number().int().min(1).max(PUNTOS_MAXIMOS),
  aceptaTardias: z.boolean(),
  version: z.number().int().min(0),
  categoria: z
    .strictObject({ id: z.uuid(), nombre: z.string(), peso: z.number().int() })
    .nullable(),
  tema: z.strictObject({ id: z.uuid(), nombre: z.string() }).nullable(),
  rubrica: z.array(criterioDeRubricaSchema),
  adjuntos: z.array(adjuntoSchema),
  autor: autorDelMuroSchema,
  creadoEn: z.iso.datetime(),
  actualizadoEn: z.iso.datetime(),
  puedeEditar: z.boolean(),
  puedeBorrar: z.boolean(),
})

export const foroRespuestaSchema = z.strictObject({ foro: foroDetalleSchema })

// participaciones cuenta las principales. entrega es la del alumno que pide la lista: null para el
// maestro y el admin, y para el alumno que aún no tiene fila.
export const elementoDeForoSchema = z.strictObject({
  id: z.uuid(),
  titulo: z.string(),
  autor: autorDelMuroSchema,
  creadoEn: z.iso.datetime(),
  fechaLimite: z.iso.datetime(),
  puntos: z.number().int().min(1).max(PUNTOS_MAXIMOS),
  tema: z.strictObject({ id: z.uuid(), nombre: z.string() }).nullable(),
  participaciones: z.number().int().min(0),
  entrega: z.strictObject({ estado: estadoEntregaSchema, conRetraso: z.boolean() }).nullable(),
})

export const listaForosRespuestaSchema = z.strictObject({
  foros: z.array(elementoDeForoSchema),
  siguienteCursor: z.uuid().nullable(),
})

// conRetraso solo sale si el servidor decide que esa persona lo ve (DH-07): el maestro y el admin
// siempre, el alumno solo en lo suyo. propia también la decide el servidor.
export const participacionSchema = z.strictObject({
  id: z.uuid(),
  texto: z.string(),
  autor: autorDelMuroSchema,
  creadoEn: z.iso.datetime(),
  conRetraso: z.boolean().optional(),
  replicas: z.number().int().min(0),
  propia: z.boolean(),
})

export const replicaSchema = z.strictObject({
  id: z.uuid(),
  texto: z.string(),
  autor: autorDelMuroSchema,
  creadoEn: z.iso.datetime(),
  conRetraso: z.boolean().optional(),
  propia: z.boolean(),
})

export const listaParticipacionesRespuestaSchema = z.strictObject({
  participaciones: z.array(participacionSchema),
  siguienteCursor: z.uuid().nullable(),
})

export const listaReplicasRespuestaSchema = z.strictObject({
  replicas: z.array(replicaSchema),
  siguienteCursor: z.uuid().nullable(),
})

// Lo que la regla tardía decide para el alumno (E1-1): la interfaz no la recalcula.
// participarConRetraso y replicarConRetraso son el conRetraso de una publicación hecha ahora.
export const miParticipacionRespuestaSchema = z.strictObject({
  estado: estadoEntregaSchema,
  fechaEntrega: z.iso.datetime().nullable(),
  conRetraso: z.boolean(),
  calificacion: calificacionDeEntregaSchema.nullable(),
  principalId: z.uuid().nullable(),
  puedeParticipar: z.boolean(),
  puedeReplicar: z.boolean(),
  participarConRetraso: z.boolean(),
  replicarConRetraso: z.boolean(),
})

export const participacionPublicadaRespuestaSchema = z.strictObject({
  participacion: participacionSchema,
  miParticipacion: miParticipacionRespuestaSchema,
})

export const replicaPublicadaRespuestaSchema = z.strictObject({ replica: replicaSchema })

// Lo que escribió un alumno en un foro, para quien califica. enRespuestaA es null en la principal.
export const participacionDeAlumnoSchema = z.strictObject({
  id: z.uuid(),
  texto: z.string(),
  creadoEn: z.iso.datetime(),
  conRetraso: z.boolean(),
  enRespuestaA: z.strictObject({ participacionId: z.uuid(), autor: autorDelMuroSchema }).nullable(),
})

export const listaParticipacionesDeAlumnoRespuestaSchema = z.strictObject({
  participaciones: z.array(participacionDeAlumnoSchema),
  siguienteCursor: z.uuid().nullable(),
})

// S-08: los únicos códigos nuevos. Lo demás reutiliza los de tareas, entregas y calificaciones con
// un texto de foro.
export const CODIGOS_FOROS = {
  PARTICIPACION_YA_PUBLICADA: "PARTICIPACION_YA_PUBLICADA",
  PARTICIPACION_CALIFICADA: "PARTICIPACION_CALIFICADA",
  FORO_CERRADO: "FORO_CERRADO",
  PARTICIPACION_NO_ENCONTRADA: "PARTICIPACION_NO_ENCONTRADA",
} as const

export type CodigoForos = (typeof CODIGOS_FOROS)[keyof typeof CODIGOS_FOROS]
export type CrearForo = z.infer<typeof crearForoSchema>
export type EditarForo = z.infer<typeof editarForoSchema>
export type ForoIdParam = z.infer<typeof foroIdParamSchema>
export type ParticipacionParam = z.infer<typeof participacionParamSchema>
export type ParticipanteParam = z.infer<typeof participanteParamSchema>
export type CrearParticipacion = z.infer<typeof crearParticipacionSchema>
export type CrearReplica = z.infer<typeof crearReplicaSchema>
export type ForosQuery = z.infer<typeof forosQuerySchema>
export type ForoDetalle = z.infer<typeof foroDetalleSchema>
export type ForoRespuesta = z.infer<typeof foroRespuestaSchema>
export type ElementoDeForo = z.infer<typeof elementoDeForoSchema>
export type ListaForosRespuesta = z.infer<typeof listaForosRespuestaSchema>
export type Participacion = z.infer<typeof participacionSchema>
export type Replica = z.infer<typeof replicaSchema>
export type ListaParticipacionesRespuesta = z.infer<typeof listaParticipacionesRespuestaSchema>
export type ListaReplicasRespuesta = z.infer<typeof listaReplicasRespuestaSchema>
export type MiParticipacionRespuesta = z.infer<typeof miParticipacionRespuestaSchema>
export type ParticipacionPublicadaRespuesta = z.infer<typeof participacionPublicadaRespuestaSchema>
export type ReplicaPublicadaRespuesta = z.infer<typeof replicaPublicadaRespuestaSchema>
export type ParticipacionDeAlumno = z.infer<typeof participacionDeAlumnoSchema>
export type ListaParticipacionesDeAlumnoRespuesta = z.infer<
  typeof listaParticipacionesDeAlumnoRespuestaSchema
>
