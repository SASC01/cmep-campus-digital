import cookie from "@fastify/cookie"
import Fastify, { LogController, type FastifyInstance } from "fastify"

import { inicializarAuth } from "./adapters/auth/index.js"
import { cerrarConexion, inicializarDb } from "./adapters/db/index.js"
import { detenerCola, iniciarCola } from "./adapters/queue/index.js"
import { opcionesDeAuth } from "./config/auth.js"
import { opcionesDeCola } from "./config/cola.js"
import type { Env } from "./config/env.js"
import { opcionesDeLogger } from "./config/logger.js"
import { adminHandler } from "./handlers/admin.js"
import { authHandler } from "./handlers/auth/index.js"
import { cuentasHandler } from "./handlers/auth/cuentas.js"
import { erroresDeEnrutamiento, manejoDeErrores } from "./handlers/errores.js"
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
    // T-05: FST_ERR_BAD_URL y FST_ERR_MAX_PARAM_LENGTH los lanza find-my-way antes de manejoDeErrores
    // (un :id demasiado largo o con codificación rota); sin esto, Fastify responde con su formato
    // por defecto y repite la URL recibida.
    frameworkErrors: erroresDeEnrutamiento,
  })

  // DEC-16, N-06: justo después de crear app (ya existe app.log) y antes de manejoDeErrores o de
  // registrar cualquier handler. La API no supervisa ni programa (N-03: si la base no responde,
  // start() falla y construirApp lanza; la API no arranca).
  await iniciarCola({ ...opcionesDeCola(env, "api"), log: app.log })

  await app.register(manejoDeErrores)
  // Sin secret: la cookie de refresco no se firma; su valor solo se compara por hash en la base.
  await app.register(cookie)
  // Antes de cualquier handler: decora la petición y activa la guarda onRoute (DEC-16).
  registrarMiddleware(app)

  await app.register(saludHandler, { prefix: "/api" })
  await app.register(authHandler, { prefix: "/api/auth", env })
  await app.register(cuentasHandler, { prefix: "/api/auth" })
  await app.register(usuariosHandler, { prefix: "/api" })
  await app.register(adminHandler, { prefix: "/api/admin" })

  app.addHook("onClose", async () => {
    await detenerCola()
    await cerrarConexion()
  })

  return app
}
