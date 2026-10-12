import {
  crearTemaSchema,
  listaTemasRespuestaSchema,
  moverElementoRespuestaSchema,
  moverElementoSchema,
  ordenTemasSchema,
  publicacionDeMoverParamSchema,
  renombrarTemaSchema,
  temaIdParamSchema,
  temaRespuestaSchema,
} from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"

import {
  borrarTema,
  crearTema,
  listarTemas,
  moverATema,
  ordenarTemas,
  renombrarTema,
} from "../../adapters/db/index.js"
import { conTextosNormalizados } from "../../core/clases/texto.js"
import { claseDe, protegido } from "../../middleware/index.js"
import { validarCuerpo, validarParametros } from "../validacion.js"

// Rutas de temas de TAREAS-01a (§D-2). Ningún handler verifica rol, propiedad o inscripción a mano:
// todo pasa por protegido() y por claseDe(request) (sexto paso). Ningún handler crea avisos ni
// encola nada: organizar la clase no avisa a nadie. Las reglas (tope, nombres repetidos, orden) las
// decide core/ dentro de la transacción del adaptador.
export const temasHandler: FastifyPluginAsync = async (app) => {
  app.get(
    "/clases/:claseId/temas",
    protegido({ roles: ["estudiante", "maestro", "admin"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      return reply.send(listaTemasRespuestaSchema.parse(await listarTemas(claseId)))
    },
  )

  app.post(
    "/clases/:claseId/temas",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { nombre } = validarCuerpo(
        crearTemaSchema,
        conTextosNormalizados(request.body, ["nombre"]),
      )
      const tema = await crearTema({ claseId, nombre })
      return reply.status(201).send(temaRespuestaSchema.parse({ tema }))
    },
  )

  // El segmento literal "orden" gana al parámetro :temaId (find-my-way); un DELETE …/temas/orden
  // llega a :temaId = "orden" y responde 400 VALIDACION (no es un UUID).
  app.put(
    "/clases/:claseId/temas/orden",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { temaIds } = validarCuerpo(ordenTemasSchema, request.body)
      const lista = await ordenarTemas({ claseId, temaIds })
      return reply.send(listaTemasRespuestaSchema.parse(lista))
    },
  )

  app.put(
    "/clases/:claseId/temas/:temaId",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { temaId } = validarParametros(temaIdParamSchema, request.params)
      const { nombre } = validarCuerpo(
        renombrarTemaSchema,
        conTextosNormalizados(request.body, ["nombre"]),
      )
      const tema = await renombrarTema({ claseId, temaId, nombre })
      return reply.send(temaRespuestaSchema.parse({ tema }))
    },
  )

  app.delete(
    "/clases/:claseId/temas/:temaId",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { temaId } = validarParametros(temaIdParamSchema, request.params)
      await borrarTema({ claseId, temaId })
      return reply.status(204).send()
    },
  )

  // P-02 (b): mover un elemento de tema organiza la clase y no cuenta como editarlo, así que no mira
  // la autoría: basta ser maestro de la clase o admin.
  app.put(
    "/clases/:claseId/publicaciones/:publicacionId/tema",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { publicacionId } = validarParametros(publicacionDeMoverParamSchema, request.params)
      const { temaId } = validarCuerpo(moverElementoSchema, request.body)
      const movido = await moverATema({ claseId, publicacionId, temaId })
      return reply.send(moverElementoRespuestaSchema.parse(movido))
    },
  )
}
