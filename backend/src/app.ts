import Fastify, { type FastifyInstance } from "fastify"

import { cerrarConexion } from "./adapters/db/index.js"
import type { Env } from "./config/env.js"
import { opcionesDeLogger } from "./config/logger.js"
import { manejoDeErrores } from "./handlers/errores.js"
import { saludHandler } from "./handlers/salud.js"

// Construye la aplicación sin escuchar: server.ts llama a listen y las pruebas usan inject.
export const construirApp = async ({ env }: { env: Env }): Promise<FastifyInstance> => {
  const app = Fastify({ logger: opcionesDeLogger(env), requestIdLogLabel: "requestId" })

  await app.register(manejoDeErrores)
  await app.register(saludHandler, { prefix: "/api" })

  app.addHook("onClose", async () => {
    await cerrarConexion()
  })

  return app
}
