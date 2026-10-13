import { randomUUID } from "node:crypto"

import {
  alumnoDeEntregaParamSchema,
  calificarEntregaSchema,
  entregaDeAlumnoRespuestaSchema,
} from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"

import { calificarEntrega } from "../adapters/db/index.js"
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

// Rutas de CALIFICACIONES-01 (§D-0.1). En 01a, calificar: solo los maestros de la clase (S-01: el
// admin lee la calificación en la entrega de un alumno y no califica). Ningún handler verifica rol,
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
}
