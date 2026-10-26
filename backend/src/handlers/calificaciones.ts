import { randomUUID } from "node:crypto"

import {
  alumnoDeEntregaParamSchema,
  calificarEntregaSchema,
  entregaDeAlumnoRespuestaSchema,
  gradebookQuerySchema,
  gradebookRespuestaSchema,
  misCalificacionesQuerySchema,
  misCalificacionesRespuestaSchema,
} from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"

import {
  calificarEntrega,
  leerGradebook,
  leerMisCalificaciones,
  type ColumnaDelGradebookDb,
} from "../adapters/db/index.js"
import { encolar } from "../adapters/queue/index.js"
import type { Almacen } from "../core/archivos/almacen.js"
import { conTextosNormalizados } from "../core/clases/texto.js"
import { AppError } from "../core/errores.js"
import {
  COLA_CALIFICACION_PUBLICADA,
  type DatosCalificacionPublicada,
} from "../core/eventos/avisos-de-clase.js"
import { claseDe, perfilDe, protegido } from "../middleware/index.js"
import { entregaDeAlumnoParaResponder } from "./respuestas-de-entrega.js"
import { validarCuerpo, validarParametros } from "./validacion.js"

const tareaNoEncontrada = (): AppError =>
  new AppError("TAREA_NO_ENCONTRADA", "Esa tarea ya no existe.", 404)

// Una tarea del gradebook o de "Mis calificaciones", con la fecha límite en ISO 8601.
const columnaParaResponder = (tarea: ColumnaDelGradebookDb) => ({
  id: tarea.id,
  titulo: tarea.titulo,
  fechaLimite: tarea.fechaLimite.toISOString(),
  puntos: tarea.puntos,
  categoria: tarea.categoria,
})

// Rutas de CALIFICACIONES-01 (§D-0.1). En 01b, las dos lecturas: el gradebook y "Mis calificaciones".
// En 01a, calificar: solo los maestros de la clase (S-01: el admin lee la calificación en la
// entrega de un alumno y no califica). Ningún handler verifica rol,
// propiedad ni inscripción a mano: todo pasa por protegido() y por claseDe(request) (sexto paso); que
// :alumnoId sea un alumno inscrito con cuenta activa es un filtro de datos del adaptador (404
// ALUMNO_NO_ENCONTRADO). CALIFICACION_PUBLICADA se encola en la transacción de la calificación, con un
// id nuevo por publicación y solo ids (§D-8); el comentario de devolución no tiene aviso propio (S-11).
export const calificacionesHandler: FastifyPluginAsync<{ almacen: Almacen | null }> = async (
  app,
  { almacen },
) => {
  app.put(
    "/clases/:claseId/tareas/:tareaId/entregas/:alumnoId/calificacion",
    protegido({ roles: ["maestro"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const claseId = claseDe(request).id.toLowerCase()
      const { tareaId, alumnoId } = validarParametros(alumnoDeEntregaParamSchema, request.params)
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
          tareaId,
          alumnoId,
          autorId: perfilDe(request).id,
          ahora: new Date(),
          version: datos.version,
          puntosDeLaTarea: datos.puntosDeLaTarea,
          puntajes: datos.puntajes,
          calificacion: datos.calificacion,
          comentario,
        },
        async (sql, { entregaId, version }) => {
          const aviso: DatosCalificacionPublicada = { entregaId, tareaId, claseId, version }
          await encolar(COLA_CALIFICACION_PUBLICADA, aviso, { id: eventoId, sql })
        },
      )
      if (entrega === null) throw tareaNoEncontrada()
      return reply.send(
        entregaDeAlumnoRespuestaSchema.parse(await entregaDeAlumnoParaResponder(almacen, entrega)),
      )
    },
  )

  // CALIFICACIONES-01b (§D-6). El gradebook: los maestros de la clase y el admin, en cualquier clase.
  // El resumen es de toda la clase; las filas y las columnas se paginan por separado.
  app.get(
    "/clases/:claseId/gradebook",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const claseId = claseDe(request).id.toLowerCase()
      const { cursor, limite, cursorTareas, limiteTareas } = validarParametros(
        gradebookQuerySchema,
        request.query,
      )
      const gradebook = await leerGradebook({
        claseId,
        cursor,
        limite,
        cursorTareas,
        limiteTareas,
        ahora: new Date(),
      })
      return reply.send(
        gradebookRespuestaSchema.parse({
          ...gradebook,
          tareas: gradebook.tareas.map(columnaParaResponder),
        }),
      )
    },
  )

  // CALIFICACIONES-01b (§D-7). "Mis calificaciones": solo el alumno inscrito, siempre el de la sesión
  // (la ruta no lleva un id de alumno). Nunca la versión, el estado de pago ni nada de otro alumno.
  app.get(
    "/clases/:claseId/mis-calificaciones",
    protegido({ roles: ["estudiante"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const claseId = claseDe(request).id.toLowerCase()
      const { estado, cursor, limite } = validarParametros(
        misCalificacionesQuerySchema,
        request.query,
      )
      const mis = await leerMisCalificaciones({
        claseId,
        alumnoId: perfilDe(request).id,
        filtro: estado,
        cursor,
        limite,
        ahora: new Date(),
      })
      return reply.send(
        misCalificacionesRespuestaSchema.parse({
          ...mis,
          tareas: mis.tareas.map((tarea) => ({
            ...columnaParaResponder(tarea),
            entrega: tarea.entrega,
          })),
        }),
      )
    },
  )
}
