import { randomUUID } from "node:crypto"

import {
  alumnoDeEntregaParamSchema,
  comentarioPrivadoRespuestaSchema,
  crearComentarioSchema,
  listaComentariosPrivadosRespuestaSchema,
  paginacionSchema,
  tareaDeEntregaParamSchema,
} from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"

import {
  comentarEnHiloPrivado,
  listarHiloPrivado,
  type ComentarioPrivadoDb,
  type ListaComentariosPrivadosDb,
} from "../../adapters/db/index.js"
import { encolar } from "../../adapters/queue/index.js"
import { conTextosNormalizados } from "../../core/clases/texto.js"
import { AppError } from "../../core/errores.js"
import {
  COLA_COMENTARIO_CREADO,
  type DatosComentarioPrivado,
} from "../../core/eventos/avisos-de-clase.js"
import { claseDe, perfilDe, protegido } from "../../middleware/index.js"
import { validarCuerpo, validarParametros } from "../validacion.js"

const tareaNoEncontrada = (): AppError =>
  new AppError("TAREA_NO_ENCONTRADA", "Esa tarea ya no existe.", 404)

// Fechas en ISO 8601 (regla 7). La firma del autor y `propio` ya vienen armadas del adaptador.
const comentarioParaResponder = (comentario: ComentarioPrivadoDb) => ({
  ...comentario,
  creadoEn: comentario.creadoEn.toISOString(),
})

const listaParaResponder = (lista: ListaComentariosPrivadosDb) =>
  listaComentariosPrivadosRespuestaSchema.parse({
    comentarios: lista.comentarios.map(comentarioParaResponder),
    siguienteCursor: lista.siguienteCursor,
  })

// Rutas del hilo privado (ENTREGAS-01c, §D-4). Las mismas dos familias que las entregas: …/entrega/
// comentarios es el hilo del alumno que llama (perfilDe(request).id, sin :alumnoId) y
// …/entregas/:alumnoId/comentarios el de un alumno de la clase para sus maestros; el admin lo lee y no
// escribe (P-01 a: el POST solo nombra a "maestro" en roles). Ningún handler verifica rol, propiedad
// ni inscripción a mano: que :alumnoId sea un alumno inscrito con cuenta activa lo filtra el adaptador
// (404 ALUMNO_NO_ENCONTRADO). El aviso se encola en la transacción del comentario, con el id del
// comentario como id del trabajo y solo ids en los datos (§D-5). Sin borrar ni editar (S-04).
export const hiloPrivadoHandler: FastifyPluginAsync = async (app) => {
  app.get(
    "/clases/:claseId/tareas/:tareaId/entrega/comentarios",
    protegido({ roles: ["estudiante"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { tareaId } = validarParametros(tareaDeEntregaParamSchema, request.params)
      const { cursor, limite } = validarParametros(paginacionSchema, request.query)
      const perfil = perfilDe(request)
      const lista = await listarHiloPrivado({
        claseId,
        tareaId,
        alumnoId: perfil.id,
        comprobarInscripcion: false,
        cursor,
        limite,
        actorId: perfil.id,
      })
      if (lista === null) throw tareaNoEncontrada()
      return reply.send(listaParaResponder(lista))
    },
  )

  app.post(
    "/clases/:claseId/tareas/:tareaId/entrega/comentarios",
    protegido({ roles: ["estudiante"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const claseId = claseDe(request).id.toLowerCase()
      const { tareaId } = validarParametros(tareaDeEntregaParamSchema, request.params)
      const { texto } = validarCuerpo(
        crearComentarioSchema,
        conTextosNormalizados(request.body, ["texto"]),
      )
      const perfil = perfilDe(request)
      const id = randomUUID()
      const comentario = await comentarEnHiloPrivado(
        {
          id,
          claseId,
          tareaId,
          alumnoId: perfil.id,
          comprobarInscripcion: false,
          autorId: perfil.id,
          texto,
        },
        async (sql, { entregaId }) => {
          const aviso: DatosComentarioPrivado = { comentarioId: id, entregaId, claseId }
          await encolar(COLA_COMENTARIO_CREADO, aviso, { id, sql })
        },
      )
      if (comentario === null) throw tareaNoEncontrada()
      return reply.status(201).send(
        comentarioPrivadoRespuestaSchema.parse({
          comentario: comentarioParaResponder(comentario),
        }),
      )
    },
  )

  app.get(
    "/clases/:claseId/tareas/:tareaId/entregas/:alumnoId/comentarios",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { tareaId, alumnoId } = validarParametros(alumnoDeEntregaParamSchema, request.params)
      const { cursor, limite } = validarParametros(paginacionSchema, request.query)
      const lista = await listarHiloPrivado({
        claseId,
        tareaId,
        alumnoId,
        comprobarInscripcion: true,
        cursor,
        limite,
        actorId: perfilDe(request).id,
      })
      if (lista === null) throw tareaNoEncontrada()
      return reply.send(listaParaResponder(lista))
    },
  )

  app.post(
    "/clases/:claseId/tareas/:tareaId/entregas/:alumnoId/comentarios",
    protegido({ roles: ["maestro"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const claseId = claseDe(request).id.toLowerCase()
      const { tareaId, alumnoId } = validarParametros(alumnoDeEntregaParamSchema, request.params)
      const { texto } = validarCuerpo(
        crearComentarioSchema,
        conTextosNormalizados(request.body, ["texto"]),
      )
      const id = randomUUID()
      const comentario = await comentarEnHiloPrivado(
        {
          id,
          claseId,
          tareaId,
          alumnoId,
          comprobarInscripcion: true,
          autorId: perfilDe(request).id,
          texto,
        },
        async (sql, { entregaId }) => {
          const aviso: DatosComentarioPrivado = { comentarioId: id, entregaId, claseId }
          await encolar(COLA_COMENTARIO_CREADO, aviso, { id, sql })
        },
      )
      if (comentario === null) throw tareaNoEncontrada()
      return reply.status(201).send(
        comentarioPrivadoRespuestaSchema.parse({
          comentario: comentarioParaResponder(comentario),
        }),
      )
    },
  )
}
