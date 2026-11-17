import { randomUUID } from "node:crypto"

import {
  borrarTareaQuerySchema,
  calificarEntregaSchema,
  CONFIRMAR_BORRADO_CON_ENTREGAS,
  crearForoSchema,
  crearParticipacionSchema,
  crearReplicaSchema,
  editarForoSchema,
  entregaDeAlumnoRespuestaSchema,
  foroIdParamSchema,
  foroRespuestaSchema,
  forosQuerySchema,
  listaComentariosPrivadosRespuestaSchema,
  listaEntregasRespuestaSchema,
  listaForosRespuestaSchema,
  listaParticipacionesDeAlumnoRespuestaSchema,
  listaParticipacionesRespuestaSchema,
  listaReplicasRespuestaSchema,
  miParticipacionRespuestaSchema,
  paginacionSchema,
  participacionParamSchema,
  participacionPublicadaRespuestaSchema,
  participanteParamSchema,
  replicaPublicadaRespuestaSchema,
} from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"

import {
  adjuntosConfirmadosDe,
  borrarParticipacion,
  borrarTarea,
  calificarEntrega,
  crearTarea,
  editarTarea,
  leerEntregaDeAlumno,
  leerMiParticipacion,
  leerTarea,
  listarEntregas,
  listarForos,
  listarHiloPrivado,
  listarParticipaciones,
  listarParticipacionesDeAlumno,
  listarReplicas,
  publicarParticipacion,
  publicarReplica,
  type ListaComentariosPrivadosDb,
  type MiParticipacionDb,
  type ParticipacionDb,
  type ReplicaDb,
  type TareaDetalleDb,
} from "../adapters/db/index.js"
import { cancelar, encolar } from "../adapters/queue/index.js"
import { TEXTOS_POR_ACTIVIDAD } from "../core/actividades.js"
import type { Almacen } from "../core/archivos/almacen.js"
import { firmaDelAutor } from "../core/autoria.js"
import { conTextosNormalizados } from "../core/clases/texto.js"
import { alumnoDeLaRelacion } from "../core/entregas/entregas.js"
import { AppError } from "../core/errores.js"
import {
  COLA_CALIFICACION_PUBLICADA,
  COLA_RECORDATORIO_24H,
  COLA_TAREA_CREADA,
  type DatosCalificacionPublicada,
  type DatosRecordatorio24h,
  type DatosTareaCreada,
} from "../core/eventos/avisos-de-clase.js"
import { momentoDelRecordatorio } from "../core/tareas/recordatorio.js"
import { validarFechaLimite } from "../core/tareas/tareas.js"
import { conTextosDeTareaNormalizados } from "../core/tareas/texto.js"
import { claseDe, perfilDe, protegido } from "../middleware/index.js"
import { adjuntosParaResponder, archivosParaPublicar } from "./adjuntos.js"
import { calificacionParaResponder, entregaDeAlumnoParaResponder } from "./respuestas-de-entrega.js"
import { validarCuerpo, validarParametros } from "./validacion.js"

// S-08: un null del adaptador (el foro no existe en la clase, o el id es de una tarea, un anuncio o
// un material) responde el código de la tarea con el texto del foro.
const foroNoEncontrado = (): AppError =>
  new AppError("TAREA_NO_ENCONTRADA", TEXTOS_POR_ACTIVIDAD.foro.tareaNoEncontrada, 404)

const iso = (fecha: Date | null): string | null => (fecha === null ? null : fecha.toISOString())

// El detalle de la tarea sin requiereAdjuntos (un foro no se entrega con archivos); instrucciones es
// el planteamiento. El autor sale firmado y el rol nunca sale; tampoco trabajo_id, correos ni estado
// de pago. Las fechas, en ISO 8601 (regla 7).
const foroParaResponder = async (almacen: Almacen | null, foro: TareaDetalleDb) => ({
  id: foro.id,
  titulo: foro.titulo,
  instrucciones: foro.instrucciones,
  fechaLimite: foro.fechaLimite.toISOString(),
  puntos: foro.puntos,
  aceptaTardias: foro.aceptaTardias,
  version: foro.version,
  categoria: foro.categoria,
  tema: foro.tema,
  rubrica: foro.rubrica,
  adjuntos: await adjuntosParaResponder(almacen, foro.adjuntos),
  autor: firmaDelAutor(foro.autor),
  creadoEn: foro.creadoEn.toISOString(),
  actualizadoEn: foro.actualizadoEn.toISOString(),
  puedeEditar: foro.puedeEditar,
  puedeBorrar: foro.puedeBorrar,
})

const participacionParaResponder = (participacion: ParticipacionDb) => ({
  ...participacion,
  creadoEn: participacion.creadoEn.toISOString(),
})

const replicaParaResponder = (replica: ReplicaDb) => ({
  ...replica,
  creadoEn: replica.creadoEn.toISOString(),
})

const miParticipacionParaResponder = (mia: MiParticipacionDb) => ({
  estado: mia.estado,
  fechaEntrega: iso(mia.fechaEntrega),
  conRetraso: mia.conRetraso,
  calificacion: calificacionParaResponder(mia.calificacion),
  principalId: mia.principalId,
  puedeParticipar: mia.puedeParticipar,
  puedeReplicar: mia.puedeReplicar,
  participarConRetraso: mia.participarConRetraso,
  replicarConRetraso: mia.replicarConRetraso,
})

const devolucionesParaResponder = (lista: ListaComentariosPrivadosDb) =>
  listaComentariosPrivadosRespuestaSchema.parse({
    comentarios: lista.comentarios.map((comentario) => ({
      ...comentario,
      creadoEn: comentario.creadoEn.toISOString(),
    })),
    siguienteCursor: lista.siguienteCursor,
  })

// Rutas de FORO-01a (§D-3.1, RF-66 a RF-68). Ningún handler verifica rol, propiedad, inscripción ni
// autoría a mano: todo pasa por protegido(), por claseDe(request) (sexto paso) y, la autoría y la regla
// del foro, por core/ dentro de la transacción del adaptador. Clase archivada (ADMIN-01, §E7.3): las
// diez lecturas declaran "lectura" (maestros y admin leen; el alumno recibe 409); las escrituras no la
// declaran y quedan cerradas para todos. TAREA_CREADA, RECORDATORIO_24H y CALIFICACION_PUBLICADA se
// encolan, y el recordatorio y TAREA_CREADA se cancelan, en la misma transacción que el dato; participar
// y replicar no encolan nada (S-09).
export const forosHandler: FastifyPluginAsync<{ almacen: Almacen | null }> = async (
  app,
  { almacen },
) => {
  // 1. Crear un foro.
  app.post(
    "/clases/:claseId/foros",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const datos = validarCuerpo(crearForoSchema, conTextosDeTareaNormalizados(request.body))
      const perfil = perfilDe(request)
      // El id nace aquí: es el de la publicación, el de la fila de tareas y el del trabajo TAREA_CREADA.
      const id = randomUUID()
      const idRecordatorio = randomUUID()
      const ahora = new Date()
      const fechaLimite = new Date(datos.fechaLimite)
      validarFechaLimite({ nueva: fechaLimite, anterior: null, ahora })
      const archivos = await archivosParaPublicar({
        almacen,
        ids: datos.archivoIds,
        claseId,
        subidoPor: perfil.id,
      })
      const momento = momentoDelRecordatorio(fechaLimite, ahora)
      const aviso: DatosTareaCreada & DatosRecordatorio24h = { tareaId: id, claseId }
      const foro = await crearTarea(
        {
          id,
          claseId,
          autor: perfil,
          tipo: "foro",
          titulo: datos.titulo,
          instrucciones: datos.instrucciones,
          fechaLimite,
          puntos: datos.puntos,
          aceptaTardias: datos.aceptaTardias,
          requiereAdjuntos: false,
          categoriaId: datos.categoriaId,
          temaId: datos.temaId,
          rubrica: datos.rubrica,
          trabajoId: momento === null ? null : idRecordatorio,
          archivos,
        },
        async (sql) => {
          await encolar(COLA_TAREA_CREADA, aviso, { id, sql })
          if (momento === null) return
          await encolar(COLA_RECORDATORIO_24H, aviso, { id: idRecordatorio, sql, inicio: momento })
        },
      )
      return reply
        .status(201)
        .send(foroRespuestaSchema.parse({ foro: await foroParaResponder(almacen, foro) }))
    },
  )

  // 2. La lista de foros de la clase.
  app.get(
    "/clases/:claseId/foros",
    protegido({
      roles: ["estudiante", "maestro", "admin"],
      pertenencia: "inscripcion",
      enClaseArchivada: "lectura",
    }),
    async (request, reply) => {
      const { id: claseId, relacion } = claseDe(request)
      const { cursor, limite } = validarParametros(forosQuerySchema, request.query)
      // La entrega que se muestra es la del alumno que pide la lista; core/ lo decide con la relación.
      const alumnoId = alumnoDeLaRelacion(relacion, perfilDe(request).id)
      const lista = await listarForos({ claseId, cursor, limite, alumnoId })
      return reply.send(
        listaForosRespuestaSchema.parse({
          foros: lista.foros.map((foro) => ({
            ...foro,
            creadoEn: foro.creadoEn.toISOString(),
            fechaLimite: foro.fechaLimite.toISOString(),
          })),
          siguienteCursor: lista.siguienteCursor,
        }),
      )
    },
  )

  // 3. El detalle de un foro.
  app.get(
    "/clases/:claseId/foros/:foroId",
    protegido({
      roles: ["estudiante", "maestro", "admin"],
      pertenencia: "inscripcion",
      enClaseArchivada: "lectura",
    }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { foroId } = validarParametros(foroIdParamSchema, request.params)
      const foro = await leerTarea({
        claseId,
        tareaId: foroId,
        actor: perfilDe(request),
        tipo: "foro",
      })
      if (foro === null) throw foroNoEncontrado()
      return reply.send(foroRespuestaSchema.parse({ foro: await foroParaResponder(almacen, foro) }))
    },
  )

  // 4. Editar un foro.
  app.put(
    "/clases/:claseId/foros/:foroId",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { foroId } = validarParametros(foroIdParamSchema, request.params)
      const datos = validarCuerpo(editarForoSchema, conTextosDeTareaNormalizados(request.body))
      const perfil = perfilDe(request)
      const ahora = new Date()
      const idRecordatorioNuevo = randomUUID()
      const fechaLimite = new Date(datos.fechaLimite)
      // Fuera de la transacción: los adjuntos que ya tenía y los nuevos pendientes. La edición vuelve
      // a comprobarlos dentro de su transacción, con la fila del foro bloqueada.
      const actuales = await adjuntosConfirmadosDe({ claseId, publicacionId: foroId })
      const idsActuales = new Set(actuales.map((archivo) => archivo.id))
      const archivosNuevos = await archivosParaPublicar({
        almacen,
        ids: datos.archivoIds.filter((archivoId) => !idsActuales.has(archivoId)),
        claseId,
        subidoPor: perfil.id,
      })
      const aviso: DatosRecordatorio24h = { tareaId: foroId, claseId }
      const foro = await editarTarea(
        {
          claseId,
          tareaId: foroId,
          actor: perfil,
          ahora,
          tipo: "foro",
          version: datos.version,
          idRecordatorioNuevo,
          titulo: datos.titulo,
          instrucciones: datos.instrucciones,
          fechaLimite,
          puntos: datos.puntos,
          aceptaTardias: datos.aceptaTardias,
          requiereAdjuntos: false,
          categoriaId: datos.categoriaId,
          temaId: datos.temaId,
          rubrica: datos.rubrica,
          archivoIds: datos.archivoIds,
          archivosNuevos,
        },
        async (sql, plan) => {
          if (plan.cancelar !== null) await cancelar(COLA_RECORDATORIO_24H, plan.cancelar, { sql })
          if (plan.programarEn === null) return
          // Siempre un id nuevo: pg-boss ignora un send con un id que ya usó.
          await encolar(COLA_RECORDATORIO_24H, aviso, {
            id: idRecordatorioNuevo,
            sql,
            inicio: plan.programarEn,
          })
        },
      )
      if (foro === null) throw foroNoEncontrado()
      return reply.send(foroRespuestaSchema.parse({ foro: await foroParaResponder(almacen, foro) }))
    },
  )

  // 5. Borrar un foro (con participaciones, solo el admin y confirmándolo).
  app.delete(
    "/clases/:claseId/foros/:foroId",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { foroId } = validarParametros(foroIdParamSchema, request.params)
      const { confirmar } = validarParametros(borrarTareaQuerySchema, request.query)
      const borrado = await borrarTarea(
        {
          claseId,
          tareaId: foroId,
          actor: perfilDe(request),
          tipo: "foro",
          confirmarEntregas: confirmar === CONFIRMAR_BORRADO_CON_ENTREGAS,
        },
        async (sql, trabajoId) => {
          if (trabajoId !== null) await cancelar(COLA_RECORDATORIO_24H, trabajoId, { sql })
          // Si TAREA_CREADA ya corrió, cancelarla no hace nada.
          await cancelar(COLA_TAREA_CREADA, foroId, { sql })
        },
      )
      if (!borrado) throw foroNoEncontrado()
      return reply.status(204).send()
    },
  )

  // 6. La participación del alumno que llama, con lo que la regla del foro decide para ahora.
  app.get(
    "/clases/:claseId/foros/:foroId/mi-participacion",
    protegido({ roles: ["estudiante"], pertenencia: "inscripcion", enClaseArchivada: "lectura" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { foroId } = validarParametros(foroIdParamSchema, request.params)
      const mia = await leerMiParticipacion({
        claseId,
        foroId,
        alumnoId: perfilDe(request).id,
        ahora: new Date(),
      })
      if (mia === null) throw foroNoEncontrado()
      return reply.send(miParticipacionRespuestaSchema.parse(miParticipacionParaResponder(mia)))
    },
  )

  // 7. Las devoluciones del alumno que llama (el hilo de su entrega en el foro).
  app.get(
    "/clases/:claseId/foros/:foroId/mi-participacion/devoluciones",
    protegido({ roles: ["estudiante"], pertenencia: "inscripcion", enClaseArchivada: "lectura" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { foroId } = validarParametros(foroIdParamSchema, request.params)
      const { cursor, limite } = validarParametros(paginacionSchema, request.query)
      const perfil = perfilDe(request)
      const lista = await listarHiloPrivado({
        claseId,
        tareaId: foroId,
        alumnoId: perfil.id,
        comprobarInscripcion: false,
        cursor,
        limite,
        actorId: perfil.id,
        tipo: "foro",
      })
      if (lista === null) throw foroNoEncontrado()
      return reply.send(devolucionesParaResponder(lista))
    },
  )

  // 8. Las participaciones principales.
  app.get(
    "/clases/:claseId/foros/:foroId/participaciones",
    protegido({
      roles: ["estudiante", "maestro", "admin"],
      pertenencia: "inscripcion",
      enClaseArchivada: "lectura",
    }),
    async (request, reply) => {
      const { id: claseId, relacion } = claseDe(request)
      const { foroId } = validarParametros(foroIdParamSchema, request.params)
      const { cursor, limite } = validarParametros(paginacionSchema, request.query)
      const lista = await listarParticipaciones({
        claseId,
        foroId,
        cursor,
        limite,
        actor: perfilDe(request),
        relacion,
      })
      if (lista === null) throw foroNoEncontrado()
      return reply.send(
        listaParticipacionesRespuestaSchema.parse({
          participaciones: lista.participaciones.map(participacionParaResponder),
          siguienteCursor: lista.siguienteCursor,
        }),
      )
    },
  )

  // 9. Publicar la participación principal del alumno que llama.
  app.post(
    "/clases/:claseId/foros/:foroId/participaciones",
    protegido({ roles: ["estudiante"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const claseId = claseDe(request).id.toLowerCase()
      const { foroId } = validarParametros(foroIdParamSchema, request.params)
      const { texto } = validarCuerpo(
        crearParticipacionSchema,
        conTextosNormalizados(request.body, ["texto"]),
      )
      const publicada = await publicarParticipacion({
        id: randomUUID(),
        claseId,
        foroId,
        alumnoId: perfilDe(request).id,
        texto,
        ahora: new Date(),
      })
      if (publicada === null) throw foroNoEncontrado()
      return reply.status(201).send(
        participacionPublicadaRespuestaSchema.parse({
          participacion: participacionParaResponder(publicada.participacion),
          miParticipacion: miParticipacionParaResponder(publicada.miParticipacion),
        }),
      )
    },
  )

  // 10. Las réplicas de una participación principal.
  app.get(
    "/clases/:claseId/foros/:foroId/participaciones/:participacionId/replicas",
    protegido({
      roles: ["estudiante", "maestro", "admin"],
      pertenencia: "inscripcion",
      enClaseArchivada: "lectura",
    }),
    async (request, reply) => {
      const { id: claseId, relacion } = claseDe(request)
      const { foroId, participacionId } = validarParametros(
        participacionParamSchema,
        request.params,
      )
      const { cursor, limite } = validarParametros(paginacionSchema, request.query)
      const lista = await listarReplicas({
        claseId,
        foroId,
        participacionId,
        cursor,
        limite,
        actor: perfilDe(request),
        relacion,
      })
      if (lista === null) throw foroNoEncontrado()
      return reply.send(
        listaReplicasRespuestaSchema.parse({
          replicas: lista.replicas.map(replicaParaResponder),
          siguienteCursor: lista.siguienteCursor,
        }),
      )
    },
  )

  // 11. Replicar a una participación principal (alumnos y maestros; el admin lee, P-09).
  app.post(
    "/clases/:claseId/foros/:foroId/participaciones/:participacionId/replicas",
    protegido({ roles: ["estudiante", "maestro"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const claseId = claseDe(request).id.toLowerCase()
      const { foroId, participacionId } = validarParametros(
        participacionParamSchema,
        request.params,
      )
      const { texto } = validarCuerpo(
        crearReplicaSchema,
        conTextosNormalizados(request.body, ["texto"]),
      )
      // El perfil completo: core/ decide la regla con el rol de quien replica, sin compararlo aquí.
      const replica = await publicarReplica({
        id: randomUUID(),
        claseId,
        foroId,
        participacionId,
        autor: perfilDe(request),
        texto,
        ahora: new Date(),
      })
      if (replica === null) throw foroNoEncontrado()
      return reply
        .status(201)
        .send(replicaPublicadaRespuestaSchema.parse({ replica: replicaParaResponder(replica) }))
    },
  )

  // 12. Los participantes (los alumnos de la clase, con su entrega en el foro).
  app.get(
    "/clases/:claseId/foros/:foroId/participantes",
    protegido({
      roles: ["maestro", "admin"],
      pertenencia: "propiedad",
      enClaseArchivada: "lectura",
    }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { foroId } = validarParametros(foroIdParamSchema, request.params)
      const { cursor, limite } = validarParametros(paginacionSchema, request.query)
      const lista = await listarEntregas({ claseId, tareaId: foroId, cursor, limite, tipo: "foro" })
      if (lista === null) throw foroNoEncontrado()
      return reply.send(
        listaEntregasRespuestaSchema.parse({
          entregas: lista.entregas.map((fila) => ({
            alumno: fila.alumno,
            estado: fila.estado,
            fechaEntrega: iso(fila.fechaEntrega),
            conRetraso: fila.conRetraso,
          })),
          total: lista.total,
          entregadas: lista.entregadas,
          siguienteCursor: lista.siguienteCursor,
        }),
      )
    },
  )

  // 13. Un participante: su entrega en el foro, con la versión que exige calificar.
  app.get(
    "/clases/:claseId/foros/:foroId/participantes/:alumnoId",
    protegido({
      roles: ["maestro", "admin"],
      pertenencia: "propiedad",
      enClaseArchivada: "lectura",
    }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { foroId, alumnoId } = validarParametros(participanteParamSchema, request.params)
      const entrega = await leerEntregaDeAlumno({
        claseId,
        tareaId: foroId,
        alumnoId,
        tipo: "foro",
      })
      if (entrega === null) throw foroNoEncontrado()
      return reply.send(
        entregaDeAlumnoRespuestaSchema.parse(await entregaDeAlumnoParaResponder(almacen, entrega)),
      )
    },
  )

  // 14. Lo que escribió un participante en el foro (su principal y sus réplicas).
  app.get(
    "/clases/:claseId/foros/:foroId/participantes/:alumnoId/participaciones",
    protegido({
      roles: ["maestro", "admin"],
      pertenencia: "propiedad",
      enClaseArchivada: "lectura",
    }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { foroId, alumnoId } = validarParametros(participanteParamSchema, request.params)
      const { cursor, limite } = validarParametros(paginacionSchema, request.query)
      const lista = await listarParticipacionesDeAlumno({
        claseId,
        foroId,
        alumnoId,
        cursor,
        limite,
      })
      if (lista === null) throw foroNoEncontrado()
      return reply.send(
        listaParticipacionesDeAlumnoRespuestaSchema.parse({
          participaciones: lista.participaciones.map((participacion) => ({
            ...participacion,
            creadoEn: participacion.creadoEn.toISOString(),
          })),
          siguienteCursor: lista.siguienteCursor,
        }),
      )
    },
  )

  // 15. Las devoluciones de un participante.
  app.get(
    "/clases/:claseId/foros/:foroId/participantes/:alumnoId/devoluciones",
    protegido({
      roles: ["maestro", "admin"],
      pertenencia: "propiedad",
      enClaseArchivada: "lectura",
    }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { foroId, alumnoId } = validarParametros(participanteParamSchema, request.params)
      const { cursor, limite } = validarParametros(paginacionSchema, request.query)
      const lista = await listarHiloPrivado({
        claseId,
        tareaId: foroId,
        alumnoId,
        comprobarInscripcion: true,
        cursor,
        limite,
        actorId: perfilDe(request).id,
        tipo: "foro",
      })
      if (lista === null) throw foroNoEncontrado()
      return reply.send(devolucionesParaResponder(lista))
    },
  )

  // 16. Calificar a un participante (solo los maestros de la clase, S-01).
  app.put(
    "/clases/:claseId/foros/:foroId/participantes/:alumnoId/calificacion",
    protegido({ roles: ["maestro"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const claseId = claseDe(request).id.toLowerCase()
      const { foroId, alumnoId } = validarParametros(participanteParamSchema, request.params)
      const datos = validarCuerpo(
        calificarEntregaSchema,
        conTextosNormalizados(request.body, ["comentario"]),
      )
      // Un id nuevo por cada publicación (S-11): recalificar vuelve a avisar.
      const eventoId = randomUUID()
      const comentario =
        datos.comentario === undefined ? null : { id: randomUUID(), texto: datos.comentario }
      const entrega = await calificarEntrega(
        {
          claseId,
          tareaId: foroId,
          alumnoId,
          tipo: "foro",
          autorId: perfilDe(request).id,
          ahora: new Date(),
          version: datos.version,
          puntosDeLaTarea: datos.puntosDeLaTarea,
          puntajes: datos.puntajes,
          calificacion: datos.calificacion,
          comentario,
        },
        async (sql, { entregaId, version }) => {
          const aviso: DatosCalificacionPublicada = { entregaId, tareaId: foroId, claseId, version }
          await encolar(COLA_CALIFICACION_PUBLICADA, aviso, { id: eventoId, sql })
        },
      )
      if (entrega === null) throw foroNoEncontrado()
      return reply.send(
        entregaDeAlumnoRespuestaSchema.parse(await entregaDeAlumnoParaResponder(almacen, entrega)),
      )
    },
  )

  // 17. Borrar una participación principal o una réplica (solo el admin, PB-1 a). Sin
  // enClaseArchivada: en una clase archivada queda cerrada, también para el admin (S-E3-1).
  app.delete(
    "/clases/:claseId/foros/:foroId/participaciones/:participacionId",
    protegido({ roles: ["admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const claseId = claseDe(request).id.toLowerCase()
      const { foroId, participacionId } = validarParametros(
        participacionParamSchema,
        request.params,
      )
      const borrada = await borrarParticipacion({
        claseId,
        foroId,
        participacionId,
        actor: perfilDe(request),
      })
      if (!borrada) throw foroNoEncontrado()
      return reply.status(204).send()
    },
  )
}
