import { z } from "zod"

// Colas de los avisos del muro (§D-C3). Sin consumidor hasta NOTIFICACIONES: los trabajos esperan
// en la cola, con retención de 7 días. El id del trabajo es el id de la publicación o del
// comentario (el eventId idempotente). Los datos llevan solo ids: nunca texto, nombres ni correos.
export const COLA_PUBLICACION_CREADA = "PUBLICACION_CREADA"
export const COLA_MATERIAL_CREADO = "MATERIAL_CREADO"
export const COLA_COMENTARIO_CREADO = "COMENTARIO_CREADO"
export const COLA_AVISO_FALLIDO = "AVISO_FALLIDO"

export const datosPublicacionCreadaSchema = z.strictObject({
  publicacionId: z.uuid(),
  claseId: z.uuid(),
})

export const datosComentarioDelMuroSchema = z.strictObject({
  comentarioId: z.uuid(),
  publicacionId: z.uuid(),
  claseId: z.uuid(),
})

// ENTREGAS-01c (§D-5): la misma cola sirve al hilo privado. Dos objetos estrictos con llaves
// distintas (publicacionId o entregaId): ningún dato encaja en los dos, y uno con las dos llaves, sin
// ninguna o con llaves de más no encaja en ninguno. Para NOTIFICACIONES: el aviso del hilo va a la
// contraparte (los maestros de la clase si escribió el alumno; el alumno si escribió un maestro) y
// termina sin avisar si el comentario ya no existe (la tarea se borró con sus entregas).
export const datosComentarioPrivadoSchema = z.strictObject({
  comentarioId: z.uuid(),
  entregaId: z.uuid(),
  claseId: z.uuid(),
})

export const datosComentarioCreadoSchema = z.union([
  datosComentarioDelMuroSchema,
  datosComentarioPrivadoSchema,
])

export type DatosPublicacionCreada = z.infer<typeof datosPublicacionCreadaSchema>
// El tipo del muro conserva su nombre y su forma; DatosComentarioDelMuro es un alias.
export type DatosComentarioCreado = z.infer<typeof datosComentarioDelMuroSchema>
export type DatosComentarioDelMuro = DatosComentarioCreado
export type DatosComentarioPrivado = z.infer<typeof datosComentarioPrivadoSchema>

export const colaDePublicacion = (tipo: "anuncio" | "material"): string =>
  tipo === "anuncio" ? COLA_PUBLICACION_CREADA : COLA_MATERIAL_CREADO

// TAREAS-01b (§D-5). Colas de las tareas: TAREA_CREADA (id del trabajo = id de la tarea) y
// RECORDATORIO_24H (diferido a fecha_limite − 24 h; al editar la fecha se cancela y se recrea con un
// id nuevo, y el consumidor descarta un trabajo cuyo id ya no es tareas.trabajo_id). Sin consumidor
// hasta NOTIFICACIONES; los datos llevan solo ids.
export const COLA_TAREA_CREADA = "TAREA_CREADA"
export const COLA_RECORDATORIO_24H = "RECORDATORIO_24H"

export const datosTareaCreadaSchema = z.strictObject({
  tareaId: z.uuid(),
  claseId: z.uuid(),
})

export const datosRecordatorio24hSchema = z.strictObject({
  tareaId: z.uuid(),
  claseId: z.uuid(),
})

export type DatosTareaCreada = z.infer<typeof datosTareaCreadaSchema>
export type DatosRecordatorio24h = z.infer<typeof datosRecordatorio24hSchema>

// ENTREGAS-01b (§D-5, S-09). ENTREGA_REALIZADA se encola en la transacción de la entrega, con un id
// nuevo por cada entrega (la misma fila puede entregarse varias veces) y solo ids. Anular no encola
// ni cancela nada: el consumidor (NOTIFICACIONES) carga la entrega por id y termina sin avisar si ya
// no existe, si no está entregada o si su version ya no es la del evento. Sin consumidor por ahora.
export const COLA_ENTREGA_REALIZADA = "ENTREGA_REALIZADA"

export const datosEntregaRealizadaSchema = z.strictObject({
  entregaId: z.uuid(),
  tareaId: z.uuid(),
  claseId: z.uuid(),
  version: z.number().int().min(1),
})

export type DatosEntregaRealizada = z.infer<typeof datosEntregaRealizadaSchema>
