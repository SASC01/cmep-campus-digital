import { saludRespuestaSchema } from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"

import { verificarConexion } from "../adapters/db/index.js"
import { evaluarSalud } from "../core/salud.js"

// Ruta pública de monitoreo (ESSENTIALS > Operación): exenta de la cadena de middleware, como
// las rutas que ESSENTIALS marca "sin JWT". Solo revela ok o 503, sin versión ni host.
export const saludHandler: FastifyPluginAsync = async (app) => {
  app.get("/salud", async (request, reply) => {
    const baseDeDatos = await verificarConexion(request.log)
    const salud = evaluarSalud({ baseDeDatos, ahora: new Date() })
    return reply.send(saludRespuestaSchema.parse(salud))
  })
}
