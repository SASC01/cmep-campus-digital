import cookie from "@fastify/cookie"
import Fastify, { LogController, type FastifyInstance } from "fastify"

import { inicializarAuth } from "./adapters/auth/index.js"
import { cerrarConexion, inicializarDb } from "./adapters/db/index.js"
import { opcionesDeAuth } from "./config/auth.js"
import type { Env } from "./config/env.js"
import { opcionesDeLogger } from "./config/logger.js"
import { authHandler } from "./handlers/auth/index.js"
import { manejoDeErrores } from "./handlers/errores.js"
import { saludHandler } from "./handlers/salud.js"
import { usuariosHandler } from "./handlers/usuarios.js"
import { registrarMiddleware } from "./middleware/index.js"

// Construye la aplicación sin escuchar: server.ts llama a listen y las pruebas usan inject.
export const construirApp = async ({ env }: { env: Env }): Promise<FastifyInstance> => {
  inicializarDb({ connectionString: env.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(env))

  const app = Fastify({
    logger: opcionesDeLogger(env),
    // Sustituye a la opción de nivel superior requestIdLogLabel, deprecada en Fastify 5 (FSTDEP024).
    logController: new LogController({ requestIdLogLabel: "requestId" }),
  })

  await app.register(manejoDeErrores)
  // Sin secret: la cookie de refresco no se firma; su valor solo se compara por hash en la base.
  await app.register(cookie)
  // Antes de cualquier handler: decora la petición y activa la guarda onRoute (DEC-16).
  registrarMiddleware(app)

  await app.register(saludHandler, { prefix: "/api" })
  await app.register(authHandler, { prefix: "/api/auth", env })
  await app.register(usuariosHandler, { prefix: "/api" })

  app.addHook("onClose", async () => {
    await cerrarConexion()
  })

  return app
}
