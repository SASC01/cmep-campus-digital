import { randomUUID } from "node:crypto"

import {
  comentarioIdParamSchema,
  comentarioRespuestaSchema,
  crearComentarioSchema,
  crearPublicacionSchema,
  listaComentariosRespuestaSchema,
  listaPublicacionesRespuestaSchema,
  paginacionSchema,
  publicacionIdParamSchema,
  publicacionRespuestaSchema,
  publicacionYComentarioParamSchema,
} from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"

import {
  borrarComentario,
  borrarMiComentario,
  borrarPublicacion,
  crearComentario,
  crearPublicacion,
  listarComentarios,
  listarPublicaciones,
} from "../../adapters/db/index.js"
import { encolar } from "../../adapters/queue/index.js"
import { normalizarTextoLargo } from "../../core/clases/texto.js"
import { AppError } from "../../core/errores.js"
import {
  COLA_COMENTARIO_CREADO,
  colaDePublicacion,
  type DatosComentarioCreado,
  type DatosPublicacionCreada,
} from "../../core/eventos/avisos-de-clase.js"
import { claseDe, perfilDe, protegido } from "../../middleware/index.js"
import { validarCuerpo, validarParametros } from "../validacion.js"

const publicacionNoEncontrada = (): AppError =>
  new AppError("PUBLICACION_NO_ENCONTRADA", "Esa publicación ya no existe.", 404)

const comentarioNoEncontrado = (): AppError =>
  new AppError("COMENTARIO_NO_ENCONTRADO", "Ese comentario ya no existe.", 404)

// §D-C4 (T-01 de a): normalizarTextoLargo corre ANTES de validar. Si se validara primero, el CR de
// un texto escrito en Windows haría fallar el refine de caracteres de control. Solo toca los campos
// que llegan como cadena; cualquier otra forma se deja intacta para que el esquema la rechace.
const conTextosNormalizados = (cuerpo: unknown, campos: readonly string[]): unknown => {
  if (typeof cuerpo !== "object" || cuerpo === null) return cuerpo
  const objeto: Record<string, unknown> = { ...(cuerpo as Record<string, unknown>) }
  for (const campo of campos) {
    const valor = objeto[campo]
    if (typeof valor === "string") objeto[campo] = normalizarTextoLargo(valor)
  }
  return objeto
}

// Rutas de CLASES-c (§D-C2). Ningún handler verifica rol, propiedad o inscripción a mano: todo pasa
// por protegido() y por claseDe(request) (sexto paso). Ningún handler crea avisos: encola el evento
// en la misma transacción que el dato y el consumidor es de NOTIFICACIONES.
export const muroHandler: FastifyPluginAsync = async (app) => {
  app.get(
    "/clases/:claseId/publicaciones",
    protegido({ roles: ["estudiante", "maestro"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const { cursor, limite } = validarParametros(paginacionSchema, request.query)
      const lista = await listarPublicaciones({ claseId: id, cursor, limite })
      return reply.send(
        listaPublicacionesRespuestaSchema.parse({
          ...lista,
          publicaciones: lista.publicaciones.map((publicacion) => ({
            ...publicacion,
            creadoEn: publicacion.creadoEn.toISOString(),
          })),
        }),
      )
    },
  )

  app.post(
    "/clases/:claseId/publicaciones",
    protegido({ roles: ["maestro"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const datos = validarCuerpo(
        crearPublicacionSchema,
        conTextosNormalizados(request.body, ["titulo", "texto"]),
      )
      const perfil = perfilDe(request)
      // N-03: el id nace aquí, antes del adaptador; es también el id del trabajo.
      const id = randomUUID()
      const aviso: DatosPublicacionCreada = { publicacionId: id, claseId }
      const publicacion = await crearPublicacion(
        {
          id,
          claseId,
          autorId: perfil.id,
          tipo: datos.tipo,
          titulo: datos.tipo === "material" ? datos.titulo : null,
          texto: datos.texto ?? "",
        },
        (sql) => encolar(colaDePublicacion(datos.tipo), aviso, { id, sql }),
      )
      return reply.status(201).send(
        publicacionRespuestaSchema.parse({
          publicacion: { ...publicacion, creadoEn: publicacion.creadoEn.toISOString() },
        }),
      )
    },
  )

  app.delete(
    "/clases/:claseId/publicaciones/:publicacionId",
    protegido({ roles: ["maestro"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { publicacionId } = validarParametros(publicacionIdParamSchema, request.params)
      const borrada = await borrarPublicacion({ claseId, publicacionId })
      if (!borrada) throw publicacionNoEncontrada()
      return reply.status(204).send()
    },
  )

  app.get(
    "/clases/:claseId/publicaciones/:publicacionId/comentarios",
    protegido({ roles: ["estudiante", "maestro"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { publicacionId } = validarParametros(publicacionIdParamSchema, request.params)
      const { cursor, limite } = validarParametros(paginacionSchema, request.query)
      const perfil = perfilDe(request)
      const lista = await listarComentarios({ claseId, publicacionId, cursor, limite })
      if (lista === null) throw publicacionNoEncontrada()
      return reply.send(
        listaComentariosRespuestaSchema.parse({
          ...lista,
          comentarios: lista.comentarios.map((comentario) => ({
            ...comentario,
            creadoEn: comentario.creadoEn.toISOString(),
            propio: comentario.autor.id === perfil.id,
          })),
        }),
      )
    },
  )

  app.post(
    "/clases/:claseId/publicaciones/:publicacionId/comentarios",
    protegido({ roles: ["estudiante", "maestro"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { publicacionId } = validarParametros(publicacionIdParamSchema, request.params)
      const { texto } = validarCuerpo(
        crearComentarioSchema,
        conTextosNormalizados(request.body, ["texto"]),
      )
      const perfil = perfilDe(request)
      const id = randomUUID()
      const aviso: DatosComentarioCreado = { comentarioId: id, publicacionId, claseId }
      const comentario = await crearComentario(
        { id, claseId, publicacionId, autorId: perfil.id, texto },
        (sql) => encolar(COLA_COMENTARIO_CREADO, aviso, { id, sql }),
      )
      if (comentario === null) throw publicacionNoEncontrada()
      return reply.status(201).send(
        comentarioRespuestaSchema.parse({
          comentario: {
            ...comentario,
            creadoEn: comentario.creadoEn.toISOString(),
            propio: true,
          },
        }),
      )
    },
  )

  app.delete(
    "/clases/:claseId/publicaciones/:publicacionId/comentarios/:comentarioId",
    protegido({ roles: ["maestro"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { publicacionId, comentarioId } = validarParametros(
        publicacionYComentarioParamSchema,
        request.params,
      )
      const borrado = await borrarComentario({ claseId, publicacionId, comentarioId })
      if (!borrado) throw comentarioNoEncontrado()
      return reply.status(204).send()
    },
  )

  app.delete(
    "/clases/:claseId/mis-comentarios/:comentarioId",
    protegido({ roles: ["estudiante", "maestro"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { comentarioId } = validarParametros(comentarioIdParamSchema, request.params)
      const perfil = perfilDe(request)
      const borrado = await borrarMiComentario({ claseId, comentarioId, autorId: perfil.id })
      if (!borrado) throw comentarioNoEncontrado()
      return reply.status(204).send()
    },
  )
}
