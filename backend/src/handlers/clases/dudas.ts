import {
  comentarioRespuestaSchema,
  crearDudaSchema,
  crearRespuestaSchema,
  dudaIdParamSchema,
  dudaRespuestaSchema,
  dudaYRespuestaParamSchema,
  listaComentariosRespuestaSchema,
  listaDudasRespuestaSchema,
  marcarDudaSchema,
  paginacionSchema,
} from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"

import {
  borrarDuda,
  borrarRespuesta,
  crearDuda,
  crearRespuesta,
  listarDudas,
  listarRespuestas,
  marcarDuda,
  type ComentarioDb,
  type DudaDb,
} from "../../adapters/db/index.js"
import { firmaDelAutor } from "../../core/autoria.js"
import { conTextosNormalizados } from "../../core/clases/texto.js"
import { puedeMarcarDuda } from "../../core/dudas.js"
import { AppError } from "../../core/errores.js"
import { claseDe, perfilDe, protegido } from "../../middleware/index.js"
import { validarCuerpo, validarParametros } from "../validacion.js"

const dudaNoEncontrada = (): AppError =>
  new AppError("DUDA_NO_ENCONTRADA", "Esa duda ya no existe.", 404)

const respuestaNoEncontrada = (): AppError =>
  new AppError("RESPUESTA_NO_ENCONTRADA", "Esa respuesta ya no existe.", 404)

// El autor sale firmado según su rol (la firma "Administración") y el rol nunca sale; tampoco quién
// marcó la duda, correos ni estado de pago. Las fechas, en ISO 8601 (regla 7). `propia` es un dato de
// la respuesta; `puedeMarcar` sale de core/ con la relación del sexto paso (la ruta de marcar lo exige
// por su cuenta).
const dudaParaResponder = (duda: DudaDb, personaId: string, puedeMarcar: boolean) => ({
  id: duda.id,
  texto: duda.texto,
  autor: firmaDelAutor(duda.autor),
  creadoEn: duda.creadoEn.toISOString(),
  resuelta: duda.resueltaEn !== null,
  resueltaEn: duda.resueltaEn?.toISOString() ?? null,
  respuestas: duda.respuestas,
  propia: duda.autor.id === personaId,
  puedeBorrar: duda.puedeBorrar,
  puedeMarcar,
})

const respuestaParaResponder = (respuesta: ComentarioDb, personaId: string) => ({
  id: respuesta.id,
  texto: respuesta.texto,
  autor: firmaDelAutor(respuesta.autor),
  creadoEn: respuesta.creadoEn.toISOString(),
  propio: respuesta.autor.id === personaId,
  puedeBorrar: respuesta.puedeBorrar,
})

// Rutas de CLASES-03b (§D-5). Ningún handler verifica rol, propiedad, inscripción ni autoría a mano:
// todo pasa por protegido(), por claseDe(request) (sexto paso) y, la autoría, por core/ dentro de la
// transacción del adaptador. Dudas y respuestas no avisan a nadie (S-04): ninguna ruta encola.
export const dudasHandler: FastifyPluginAsync = async (app) => {
  app.get(
    "/clases/:claseId/dudas",
    protegido({ roles: ["estudiante", "maestro", "admin"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id: claseId, relacion } = claseDe(request)
      const { cursor, limite } = validarParametros(paginacionSchema, request.query)
      const perfil = perfilDe(request)
      const lista = await listarDudas({ claseId, cursor, limite, actor: perfil })
      const puedeMarcar = puedeMarcarDuda(relacion)
      return reply.send(
        listaDudasRespuestaSchema.parse({
          dudas: lista.dudas.map((duda) => dudaParaResponder(duda, perfil.id, puedeMarcar)),
          siguienteCursor: lista.siguienteCursor,
        }),
      )
    },
  )

  app.post(
    "/clases/:claseId/dudas",
    protegido({ roles: ["estudiante", "maestro"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id: claseId, relacion } = claseDe(request)
      const { texto } = validarCuerpo(
        crearDudaSchema,
        conTextosNormalizados(request.body, ["texto"]),
      )
      const perfil = perfilDe(request)
      const duda = await crearDuda({ claseId, autorId: perfil.id, texto })
      return reply.status(201).send(
        dudaRespuestaSchema.parse({
          duda: dudaParaResponder(duda, perfil.id, puedeMarcarDuda(relacion)),
        }),
      )
    },
  )

  app.put(
    "/clases/:claseId/dudas/:dudaId/resuelta",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId, relacion } = claseDe(request)
      const { dudaId } = validarParametros(dudaIdParamSchema, request.params)
      const { resuelta } = validarCuerpo(marcarDudaSchema, request.body)
      const perfil = perfilDe(request)
      const duda = await marcarDuda({ claseId, dudaId, resuelta, actor: perfil, ahora: new Date() })
      if (duda === null) throw dudaNoEncontrada()
      return reply.send(
        dudaRespuestaSchema.parse({
          duda: dudaParaResponder(duda, perfil.id, puedeMarcarDuda(relacion)),
        }),
      )
    },
  )

  app.delete(
    "/clases/:claseId/dudas/:dudaId",
    protegido({ roles: ["estudiante", "maestro", "admin"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { dudaId } = validarParametros(dudaIdParamSchema, request.params)
      const borrada = await borrarDuda({ claseId, dudaId, actor: perfilDe(request) })
      if (!borrada) throw dudaNoEncontrada()
      return reply.status(204).send()
    },
  )

  app.get(
    "/clases/:claseId/dudas/:dudaId/respuestas",
    protegido({ roles: ["estudiante", "maestro", "admin"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { dudaId } = validarParametros(dudaIdParamSchema, request.params)
      const { cursor, limite } = validarParametros(paginacionSchema, request.query)
      const perfil = perfilDe(request)
      const lista = await listarRespuestas({ claseId, dudaId, cursor, limite, actor: perfil })
      if (lista === null) throw dudaNoEncontrada()
      return reply.send(
        listaComentariosRespuestaSchema.parse({
          comentarios: lista.respuestas.map((r) => respuestaParaResponder(r, perfil.id)),
          siguienteCursor: lista.siguienteCursor,
        }),
      )
    },
  )

  app.post(
    "/clases/:claseId/dudas/:dudaId/respuestas",
    protegido({ roles: ["estudiante", "maestro"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { dudaId } = validarParametros(dudaIdParamSchema, request.params)
      const { texto } = validarCuerpo(
        crearRespuestaSchema,
        conTextosNormalizados(request.body, ["texto"]),
      )
      const perfil = perfilDe(request)
      const respuesta = await crearRespuesta({ claseId, dudaId, autorId: perfil.id, texto })
      if (respuesta === null) throw dudaNoEncontrada()
      return reply.status(201).send(
        comentarioRespuestaSchema.parse({
          comentario: respuestaParaResponder(respuesta, perfil.id),
        }),
      )
    },
  )

  app.delete(
    "/clases/:claseId/dudas/:dudaId/respuestas/:respuestaId",
    protegido({ roles: ["estudiante", "maestro", "admin"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { dudaId, respuestaId } = validarParametros(dudaYRespuestaParamSchema, request.params)
      const borrada = await borrarRespuesta({
        claseId,
        dudaId,
        respuestaId,
        actor: perfilDe(request),
      })
      if (!borrada) throw respuestaNoEncontrada()
      return reply.status(204).send()
    },
  )
}
