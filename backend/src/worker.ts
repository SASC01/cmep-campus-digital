import { pino } from "pino"

import { cargarEnv } from "./config/env.js"
import { opcionesDeLogger } from "./config/logger.js"

const env = cargarEnv()
const log = pino(opcionesDeLogger(env))

// Sin pg-boss todavía (DEC-06): el proceso solo se mantiene vivo hasta recibir una señal.
const latido = setInterval(() => undefined, 60_000)

const detener = (senal: NodeJS.Signals): void => {
  clearInterval(latido)
  log.info({ senal }, "Deteniendo el worker")
  process.exit(0)
}

process.once("SIGINT", detener)
process.once("SIGTERM", detener)

log.info({ evento: "worker_listo" }, "Worker listo, sin trabajos registrados")
