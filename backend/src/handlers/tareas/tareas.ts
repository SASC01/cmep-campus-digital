import { randomUUID } from "node:crypto"

import {
  borrarTareaQuerySchema,
  CONFIRMAR_BORRADO_CON_ENTREGAS,
  crearTareaSchema,
  editarTareaSchema,
  listaTrabajoRespuestaSchema,
  tareaIdParamSchema,
  tareaRespuestaSchema,
  trabajoQuerySchema,
} from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"

import {
  adjuntosConfirmadosDe,
  borrarTarea,
  crearTarea,
  editarTarea,
  leerTarea,
  listarTrabajo,
  type TareaDetalleDb,
} from "../../adapters/db/index.js"
import { cancelar, encolar } from "../../adapters/queue/index.js"
import type { Almacen } from "../../core/archivos/almacen.js"
import { firmaDelAutor } from "../../core/autoria.js"
import { alumnoDeLaRelacion } from "../../core/entregas/entregas.js"
import { AppError } from "../../core/errores.js"
import {
  COLA_RECORDATORIO_24H,
  COLA_TAREA_CREADA,
  type DatosRecordatorio24h,
  type DatosTareaCreada,
} from "../../core/eventos/avisos-de-clase.js"
import { momentoDelRecordatorio } from "../../core/tareas/recordatorio.js"
import { validarFechaLimite } from "../../core/tareas/tareas.js"
import { puedeMoverElemento } from "../../core/tareas/temas.js"
import { conTextosDeTareaNormalizados } from "../../core/tareas/texto.js"
import { claseDe, perfilDe, protegido } from "../../middleware/index.js"
import { adjuntosParaResponder, archivosParaPublicar } from "../adjuntos.js"
import { validarCuerpo, validarParametros } from "../validacion.js"

const tareaNoEncontrada = (): AppError =>
  new AppError("TAREA_NO_ENCONTRADA", "Esa tarea ya no existe.", 404)

// TareaDetalle (§D-4): el autor sale firmado según su rol (la firma "Administración") y el rol nunca
// sale; tampoco trabajo_id, correos ni estado de pago. Las fechas, en ISO 8601 (regla 7).
const detalleParaResponder = async (almacen: Almacen | null, tarea: TareaDetalleDb) => ({
  ...tarea,
  autor: firmaDelAutor(tarea.autor),
  fechaLimite: tarea.fechaLimite.toISOString(),
  creadoEn: tarea.creadoEn.toISOString(),
  actualizadoEn: tarea.actualizadoEn.toISOString(),
  adjuntos: await adjuntosParaResponder(almacen, tarea.adjuntos),
})

// Rutas de TAREAS-01b (§D-4 a §D-6). Ningún handler verifica rol, propiedad, inscripción ni autoría a
// mano: todo pasa por protegido(), por claseDe(request) (sexto paso) y, la autoría, por core/ dentro
// de la transacción del adaptador. Los trabajos de la cola (TAREA_CREADA y RECORDATORIO_24H, sin
// consumidor hasta NOTIFICACIONES) se encolan y se cancelan en la misma transacción que el dato:
// este handler solo pasa `sql` a encolar o cancelar.
export const tareasHandler: FastifyPluginAsync<{ almacen: Almacen | null }> = async (
  app,
  { almacen },
) => {
  app.post(
    "/clases/:claseId/tareas",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const datos = validarCuerpo(crearTareaSchema, conTextosDeTareaNormalizados(request.body))
      const perfil = perfilDe(request)
      // El id nace aquí: es el de la publicación, el de la tarea y el del trabajo TAREA_CREADA.
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
      const tarea = await crearTarea(
        {
          id,
          claseId,
          autor: perfil,
          titulo: datos.titulo,
          instrucciones: datos.instrucciones ?? "",
          fechaLimite,
          puntos: datos.puntos,
          aceptaTardias: datos.aceptaTardias,
          requiereAdjuntos: datos.requiereAdjuntos,
          categoriaId: datos.categoriaId,
          temaId: datos.temaId,
          rubrica: datos.rubrica,
          trabajoId: momento === null ? null : idRecordatorio,
          archivos,
        },
        async (sql) => {
          await encolar(COLA_TAREA_CREADA, aviso, { id, sql })
          if (momento === null) return
          await encolar(COLA_RECORDATORIO_24H, aviso, {
            id: idRecordatorio,
            sql,
            inicio: momento,
          })
        },
      )
      return reply
        .status(201)
        .send(tareaRespuestaSchema.parse({ tarea: await detalleParaResponder(almacen, tarea) }))
    },
  )

  app.get(
    "/clases/:claseId/tareas/:tareaId",
    protegido({ roles: ["estudiante", "maestro", "admin"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { tareaId } = validarParametros(tareaIdParamSchema, request.params)
      const tarea = await leerTarea({ claseId, tareaId, actor: perfilDe(request) })
      if (tarea === null) throw tareaNoEncontrada()
      return reply.send(
        tareaRespuestaSchema.parse({ tarea: await detalleParaResponder(almacen, tarea) }),
      )
    },
  )

  app.put(
    "/clases/:claseId/tareas/:tareaId",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { tareaId } = validarParametros(tareaIdParamSchema, request.params)
      const datos = validarCuerpo(editarTareaSchema, conTextosDeTareaNormalizados(request.body))
      const perfil = perfilDe(request)
      const ahora = new Date()
      const idRecordatorioNuevo = randomUUID()
      const fechaLimite = new Date(datos.fechaLimite)
      // Fuera de la transacción: los adjuntos que ya tenía y los nuevos pendientes (del mismo
      // usuario, de esta clase, de menos de 24 h y comprobados en el almacén). La edición vuelve a
      // comprobarlos dentro de su transacción, con la tarea bloqueada.
      const actuales = await adjuntosConfirmadosDe({ claseId, publicacionId: tareaId })
      const idsActuales = new Set(actuales.map((archivo) => archivo.id))
      const archivosNuevos = await archivosParaPublicar({
        almacen,
        ids: datos.archivoIds.filter((archivoId) => !idsActuales.has(archivoId)),
        claseId,
        subidoPor: perfil.id,
      })
      const aviso: DatosRecordatorio24h = { tareaId, claseId }
      const tarea = await editarTarea(
        {
          claseId,
          tareaId,
          actor: perfil,
          ahora,
          version: datos.version,
          idRecordatorioNuevo,
          titulo: datos.titulo,
          instrucciones: datos.instrucciones ?? "",
          fechaLimite,
          puntos: datos.puntos,
          aceptaTardias: datos.aceptaTardias,
          requiereAdjuntos: datos.requiereAdjuntos,
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
      if (tarea === null) throw tareaNoEncontrada()
      return reply.send(
        tareaRespuestaSchema.parse({ tarea: await detalleParaResponder(almacen, tarea) }),
      )
    },
  )

  app.delete(
    "/clases/:claseId/tareas/:tareaId",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { tareaId } = validarParametros(tareaIdParamSchema, request.params)
      // ENTREGAS-01b (S-06 modificada, §D-3.8): la confirmación del borrado con entregas va en la
      // consulta. Es un dato de la petición, no un permiso: la regla (solo el admin la puede usar)
      // la aplica core/ dentro de la transacción.
      const { confirmar } = validarParametros(borrarTareaQuerySchema, request.query)
      const borrada = await borrarTarea(
        {
          claseId,
          tareaId,
          actor: perfilDe(request),
          confirmarEntregas: confirmar === CONFIRMAR_BORRADO_CON_ENTREGAS,
        },
        async (sql, trabajoId) => {
          if (trabajoId !== null) await cancelar(COLA_RECORDATORIO_24H, trabajoId, { sql })
          // Si TAREA_CREADA ya corrió, cancelarla no hace nada.
          await cancelar(COLA_TAREA_CREADA, tareaId, { sql })
        },
      )
      if (!borrada) throw tareaNoEncontrada()
      return reply.status(204).send()
    },
  )

  app.get(
    "/clases/:claseId/trabajo",
    protegido({ roles: ["estudiante", "maestro", "admin"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id: claseId, relacion } = claseDe(request)
      const { tema, cursor, limite } = validarParametros(trabajoQuerySchema, request.query)
      // ENTREGAS-01b (S-07): la entrega que se muestra es la del alumno que pide la lista; core/ lo
      // decide con la relación del sexto paso (para el maestro y el admin, ninguna).
      const alumnoId = alumnoDeLaRelacion(relacion, perfilDe(request).id)
      const lista = await listarTrabajo({ claseId, tema, cursor, limite, alumnoId })
      // puedeMover lo decide core/ con la relación que dejó el sexto paso (P-02 b).
      const puedeMover = puedeMoverElemento(relacion)
      const elementos = await Promise.all(
        lista.elementos.map(async (elemento) => ({
          id: elemento.id,
          tipo: elemento.tipo,
          titulo: elemento.titulo,
          autor: firmaDelAutor(elemento.autor),
          creadoEn: elemento.creadoEn.toISOString(),
          material:
            elemento.material === null
              ? null
              : {
                  texto: elemento.material.texto,
                  adjuntos: await adjuntosParaResponder(almacen, elemento.material.adjuntos),
                },
          tarea:
            elemento.tarea === null
              ? null
              : {
                  fechaLimite: elemento.tarea.fechaLimite.toISOString(),
                  puntos: elemento.tarea.puntos,
                },
          puedeMover,
          entrega: elemento.entrega,
        })),
      )
      return reply.send(
        listaTrabajoRespuestaSchema.parse({ elementos, siguienteCursor: lista.siguienteCursor }),
      )
    },
  )
}
