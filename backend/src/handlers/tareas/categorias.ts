import { listaCategoriasRespuestaSchema, reemplazarCategoriasSchema } from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"

import { listarCategorias, reemplazarCategorias } from "../../adapters/db/index.js"
import { conNombresDeCategoriaNormalizados } from "../../core/tareas/categorias.js"
import { claseDe, protegido } from "../../middleware/index.js"
import { validarCuerpo } from "../validacion.js"

// Rutas de categorías de TAREAS-01a (§D-3). Las ven y las guardan los maestros de la clase y el
// admin (el alumno no ve la lista: S-17). Ningún handler verifica rol ni pertenencia a mano.
export const categoriasHandler: FastifyPluginAsync = async (app) => {
  app.get(
    "/clases/:claseId/categorias",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const categorias = await listarCategorias(claseId)
      return reply.send(listaCategoriasRespuestaSchema.parse({ categorias }))
    },
  )

  // S-06: la lista completa reemplaza a la actual; el servidor rechaza pesos que no sumen 100.
  app.put(
    "/clases/:claseId/categorias",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { categorias } = validarCuerpo(
        reemplazarCategoriasSchema,
        conNombresDeCategoriaNormalizados(request.body),
      )
      const guardadas = await reemplazarCategorias({ claseId, categorias })
      return reply.send(listaCategoriasRespuestaSchema.parse({ categorias: guardadas }))
    },
  )
}
