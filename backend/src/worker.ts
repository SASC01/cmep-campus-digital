import { pino } from "pino"

import { inicializarAuth } from "./adapters/auth/index.js"
import { cerrarConexion, inicializarDb } from "./adapters/db/index.js"
import { crearNotifier } from "./adapters/notifier/index.js"
import { detenerCola, iniciarCola } from "./adapters/queue/index.js"
import { opcionesDeAuth } from "./config/auth.js"
import { opcionesDeCola } from "./config/cola.js"
import { cargarEnvCorreo, opcionesDeCorreo } from "./config/correo.js"
import { cargarEnv } from "./config/env.js"
import { opcionesDeLogger } from "./config/logger.js"
import { registrarConsumidores } from "./workers/index.js"

const env = cargarEnv()
const envCorreo = cargarEnvCorreo(env.NODE_ENV)
const log = pino(opcionesDeLogger(env))

inicializarDb({ connectionString: env.DATABASE_URL })
await inicializarAuth(opcionesDeAuth(env))

const opciones = opcionesDeCorreo(env.NODE_ENV, envCorreo)
const notifier = crearNotifier(opciones, { log, nodeEnv: env.NODE_ENV })

await iniciarCola({ ...opcionesDeCola(env, "worker"), log })
await registrarConsumidores({
  notifier,
  urlPublicaFrontend: opciones.urlPublicaFrontend,
  reloj: () => new Date(),
  log,
})

const detener = (senal: NodeJS.Signals): void => {
  log.info({ senal }, "Deteniendo el worker")
  detenerCola()
    .then(() => cerrarConexion())
    .then(
      () => process.exit(0),
      (error: unknown) => {
        log.error({ err: error }, "El worker no se detuvo limpiamente")
        process.exit(1)
      },
    )
}

process.once("SIGINT", detener)
process.once("SIGTERM", detener)

log.info({ evento: "worker_listo", canalCorreo: opciones.canal }, "Worker listo")
