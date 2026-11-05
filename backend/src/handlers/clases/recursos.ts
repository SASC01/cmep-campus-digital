import {
  editarRecursoSchema,
  listaRecursosRespuestaSchema,
  recursoIdParamSchema,
  recursoRespuestaSchema,
  recursosQuerySchema,
} from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"

import {
  adjuntosConfirmadosDe,
  editarRecurso,
  leerRecurso,
  listarRecursos,
  type RecursoDb,
} from "../../adapters/db/index.js"
import type { Almacen } from "../../core/archivos/almacen.js"
import { firmaDelAutor } from "../../core/autoria.js"
import { conTextosNormalizados } from "../../core/clases/texto.js"
import { AppError } from "../../core/errores.js"
import { claseDe, perfilDe, protegido } from "../../middleware/index.js"
import { adjuntosParaResponder, archivosParaPublicar } from "../adjuntos.js"
import { validarCuerpo, validarParametros } from "../validacion.js"

const recursoNoEncontrado = (): AppError =>
  new AppError("RECURSO_NO_ENCONTRADO", "Ese recurso ya no existe.", 404)

// El autor sale firmado según su rol (la firma "Administración") y el rol nunca sale; tampoco
// correos, estado de pago ni restricción. Las fechas, en ISO 8601 (regla 7).
const recursoParaResponder = async (almacen: Almacen | null, recurso: RecursoDb) => ({
  id: recurso.id,
  titulo: recurso.titulo,
  texto: recurso.texto,
  autor: firmaDelAutor(recurso.autor),
  creadoEn: recurso.creadoEn.toISOString(),
  bloque: recurso.bloque,
  adjuntos: await adjuntosParaResponder(almacen, recurso.adjuntos),
  comentarios: recurso.comentarios,
  puedeEditar: recurso.puedeEditar,
  puedeBorrar: recurso.puedeBorrar,
  puedeMover: recurso.puedeMover,
})

// Rutas de CLASES-03a (§D-3.5 a §D-3.7). Ningún handler verifica rol, propiedad, inscripción ni
// autoría a mano: todo pasa por protegido(), por claseDe(request) (sexto paso) y, los permisos de
// cada recurso, por core/ dentro del adaptador con el actor de la petición. Editar no encola nada
// (S-04). Publicar, borrar, mover y comentar un recurso van por las rutas del muro y de temas.
export const recursosHandler: FastifyPluginAsync<{ almacen: Almacen | null }> = async (
  app,
  { almacen },
) => {
  app.get(
    "/clases/:claseId/recursos",
    protegido({
      roles: ["estudiante", "maestro", "admin"],
      pertenencia: "inscripcion",
      enClaseArchivada: "lectura",
    }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { bloque, tema, cursor, limite } = validarParametros(recursosQuerySchema, request.query)
      const lista = await listarRecursos({
        claseId,
        bloque,
        tema,
        cursor,
        limite,
        actor: perfilDe(request),
      })
      const recursos = await Promise.all(
        lista.recursos.map((recurso) => recursoParaResponder(almacen, recurso)),
      )
      return reply.send(listaRecursosRespuestaSchema.parse({ ...lista, recursos }))
    },
  )

  app.get(
    "/clases/:claseId/recursos/:recursoId",
    protegido({
      roles: ["maestro", "admin"],
      pertenencia: "propiedad",
      enClaseArchivada: "lectura",
    }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { recursoId } = validarParametros(recursoIdParamSchema, request.params)
      const recurso = await leerRecurso({ claseId, recursoId, actor: perfilDe(request) })
      if (recurso === null) throw recursoNoEncontrado()
      return reply.send(
        recursoRespuestaSchema.parse({
          recurso: {
            ...(await recursoParaResponder(almacen, recurso)),
            version: recurso.version,
            tema: recurso.tema,
          },
        }),
      )
    },
  )

  app.put(
    "/clases/:claseId/recursos/:recursoId",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { recursoId } = validarParametros(recursoIdParamSchema, request.params)
      const datos = validarCuerpo(
        editarRecursoSchema,
        conTextosNormalizados(request.body, ["titulo", "texto"]),
      )
      const perfil = perfilDe(request)
      // Fuera de la transacción: los adjuntos que ya tenía y los nuevos pendientes (del mismo
      // usuario, de esta clase, de menos de 24 h y comprobados en el almacén). La edición vuelve a
      // comprobarlos dentro de su transacción, con el recurso bloqueado.
      const actuales = await adjuntosConfirmadosDe({ claseId, publicacionId: recursoId })
      const idsActuales = new Set(actuales.map((archivo) => archivo.id))
      const archivosNuevos = await archivosParaPublicar({
        almacen,
        ids: datos.archivoIds.filter((archivoId) => !idsActuales.has(archivoId)),
        claseId,
        subidoPor: perfil.id,
      })
      const recurso = await editarRecurso({
        claseId,
        recursoId,
        actor: perfil,
        titulo: datos.titulo,
        texto: datos.texto ?? "",
        temaId: datos.temaId,
        version: datos.version,
        archivoIds: datos.archivoIds,
        archivosNuevos,
      })
      if (recurso === null) throw recursoNoEncontrado()
      return reply.send(
        recursoRespuestaSchema.parse({
          recurso: {
            ...(await recursoParaResponder(almacen, recurso)),
            version: recurso.version,
            tema: recurso.tema,
          },
        }),
      )
    },
  )
}
