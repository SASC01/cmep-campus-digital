import type { ErrorApi } from "@campus/shared"
import type { FastifyError, FastifyReply } from "fastify"
import fp from "fastify-plugin"

import { esAppError } from "../core/errores.js"

const responder = (reply: FastifyReply, estado: number, codigo: string, mensaje: string) => {
  const cuerpo: ErrorApi = { error: { codigo, mensaje } }
  return reply.status(estado).send(cuerpo)
}

// Errores que Fastify marca con un estado 4xx (cuerpo mal formado, tipo de contenido, tamaño...).
const estadoDeCliente = (error: FastifyError): number | undefined => {
  if (typeof error.statusCode !== "number") return undefined
  if (error.statusCode < 400 || error.statusCode >= 500) return undefined
  return error.statusCode
}

// Único lugar que da formato a los errores (DEC-05). fastify-plugin lo aplica al ámbito raíz.
export const manejoDeErrores = fp(
  async (app) => {
    app.setErrorHandler((error: FastifyError, request, reply) => {
      if (esAppError(error)) return responder(reply, error.estado, error.codigo, error.message)

      const estado = estadoDeCliente(error)
      if (estado !== undefined) {
        return responder(reply, estado, "SOLICITUD_INVALIDA", "La solicitud no es válida.")
      }

      request.log.error({ err: error }, "Error no controlado")
      return responder(reply, 500, "ERROR_INTERNO", "Ocurrió un error inesperado.")
    })

    app.setNotFoundHandler((_request, reply) =>
      responder(reply, 404, "NO_ENCONTRADO", "La ruta no existe."),
    )
  },
  { name: "manejo-de-errores" },
)
