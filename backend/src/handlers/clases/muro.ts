import { randomUUID } from "node:crypto"

import {
  type Adjunto,
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
  buscarArchivosParaConfirmar,
  crearComentario,
  crearPublicacion,
  listarComentarios,
  listarPublicaciones,
  type ArchivoDb,
  type AutorDb,
} from "../../adapters/db/index.js"
import { encolar } from "../../adapters/queue/index.js"
import type { Almacen } from "../../core/archivos/almacen.js"
import {
  almacenNoConfigurado,
  archivoNoCoincide,
  archivoNoSubido,
  coincideConLoDeclarado,
  disposicionDeContenido,
  esImagenConVistaPrevia,
  VIGENCIA_URL_FIRMADA_S,
} from "../../core/archivos/politica.js"
import { firmaDelAutor } from "../../core/autoria.js"
import { conTextosNormalizados } from "../../core/clases/texto.js"
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

// §D-2B1: el autor sale firmado según su rol (la firma "Administración") y el rol nunca sale.
// puedeBorrar lo decide el adaptador con core/autoria.ts.
const autorParaResponder = (autor: AutorDb) => firmaDelAutor(autor)

// §D-D3, punto 4: la clave del objeto nunca sale; la vista previa solo existe para las cuatro
// imágenes y solo con almacén. Firmar es un cálculo local, sin red.
const adjuntosParaResponder = (
  almacen: Almacen | null,
  archivos: readonly ArchivoDb[],
): Promise<Adjunto[]> =>
  Promise.all(
    archivos.map(async ({ id, nombre, tipo, tamano, claveObjeto }): Promise<Adjunto> => {
      if (almacen === null || !esImagenConVistaPrevia(tipo)) {
        return { id, nombre, tipo, tamano, vistaPrevia: null }
      }
      const url = await almacen.urlDeDescarga({
        clave: claveObjeto,
        tipo,
        disposicion: disposicionDeContenido(nombre, "inline"),
      })
      const expiraEn = new Date(Date.now() + VIGENCIA_URL_FIRMADA_S * 1000).toISOString()
      return { id, nombre, tipo, tamano, vistaPrevia: { url, expiraEn } }
    }),
  )

// §D-D3, puntos 3.1 y 3.2: los archivos se leen una vez (acotados a la clase y al usuario) y se
// comprueba en el almacén que lo subido es lo declarado. Sin ids no toca ni la base ni el almacén.
const archivosParaPublicar = async ({
  almacen,
  ids,
  claseId,
  subidoPor,
}: {
  almacen: Almacen | null
  ids: readonly string[]
  claseId: string
  subidoPor: string
}): Promise<ArchivoDb[]> => {
  if (ids.length === 0) return []
  if (almacen === null) throw almacenNoConfigurado()
  const archivos = await buscarArchivosParaConfirmar({ ids, claseId, subidoPor })
  if (archivos.length !== ids.length) throw archivoNoCoincide()
  const reales = await Promise.all(
    archivos.map((archivo) => almacen.metadatosDe(archivo.claveObjeto)),
  )
  const veredictos = archivos.map((archivo, i) =>
    coincideConLoDeclarado(archivo, reales[i] ?? null),
  )
  if (veredictos.includes("falta")) throw archivoNoSubido()
  if (veredictos.includes("distinto")) throw archivoNoCoincide()
  return archivos
}

// Rutas de CLASES-c (§D-C2). Ningún handler verifica rol, propiedad o inscripción a mano: todo pasa
// por protegido() y por claseDe(request) (sexto paso). Ningún handler crea avisos: encola el evento
// en la misma transacción que el dato y el consumidor es de NOTIFICACIONES.
export const muroHandler: FastifyPluginAsync<{ almacen: Almacen | null }> = async (
  app,
  { almacen },
) => {
  app.get(
    "/clases/:claseId/publicaciones",
    protegido({ roles: ["estudiante", "maestro", "admin"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const { cursor, limite } = validarParametros(paginacionSchema, request.query)
      const actor = perfilDe(request)
      const lista = await listarPublicaciones({ claseId: id, cursor, limite, actor })
      const publicaciones = await Promise.all(
        lista.publicaciones.map(async (publicacion) => ({
          ...publicacion,
          autor: autorParaResponder(publicacion.autor),
          creadoEn: publicacion.creadoEn.toISOString(),
          adjuntos: await adjuntosParaResponder(almacen, publicacion.adjuntos),
        })),
      )
      return reply.send(listaPublicacionesRespuestaSchema.parse({ ...lista, publicaciones }))
    },
  )

  app.post(
    "/clases/:claseId/publicaciones",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
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
      const archivos = await archivosParaPublicar({
        almacen,
        ids: datos.archivoIds,
        claseId,
        subidoPor: perfil.id,
      })
      const publicacion = await crearPublicacion(
        {
          id,
          claseId,
          autorId: perfil.id,
          tipo: datos.tipo,
          titulo: datos.tipo === "material" ? datos.titulo : null,
          texto: datos.texto ?? "",
          archivos,
        },
        (sql) => encolar(colaDePublicacion(datos.tipo), aviso, { id, sql }),
      )
      return reply.status(201).send(
        publicacionRespuestaSchema.parse({
          publicacion: {
            ...publicacion,
            autor: autorParaResponder(publicacion.autor),
            creadoEn: publicacion.creadoEn.toISOString(),
            adjuntos: await adjuntosParaResponder(almacen, publicacion.adjuntos),
          },
        }),
      )
    },
  )

  app.delete(
    "/clases/:claseId/publicaciones/:publicacionId",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { publicacionId } = validarParametros(publicacionIdParamSchema, request.params)
      const borrada = await borrarPublicacion({ claseId, publicacionId, actor: perfilDe(request) })
      if (!borrada) throw publicacionNoEncontrada()
      return reply.status(204).send()
    },
  )

  app.get(
    "/clases/:claseId/publicaciones/:publicacionId/comentarios",
    protegido({ roles: ["estudiante", "maestro", "admin"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { publicacionId } = validarParametros(publicacionIdParamSchema, request.params)
      const { cursor, limite } = validarParametros(paginacionSchema, request.query)
      const perfil = perfilDe(request)
      const lista = await listarComentarios({
        claseId,
        publicacionId,
        cursor,
        limite,
        actor: perfil,
      })
      if (lista === null) throw publicacionNoEncontrada()
      return reply.send(
        listaComentariosRespuestaSchema.parse({
          ...lista,
          comentarios: lista.comentarios.map((comentario) => ({
            ...comentario,
            autor: autorParaResponder(comentario.autor),
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
            autor: autorParaResponder(comentario.autor),
            creadoEn: comentario.creadoEn.toISOString(),
            propio: true,
          },
        }),
      )
    },
  )

  app.delete(
    "/clases/:claseId/publicaciones/:publicacionId/comentarios/:comentarioId",
    protegido({ roles: ["estudiante", "maestro", "admin"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { publicacionId, comentarioId } = validarParametros(
        publicacionYComentarioParamSchema,
        request.params,
      )
      const borrado = await borrarComentario({
        claseId,
        publicacionId,
        comentarioId,
        actor: perfilDe(request),
      })
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
