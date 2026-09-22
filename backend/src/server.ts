import { construirApp } from "./app.js"
import { cargarEnv } from "./config/env.js"

// Con Prisma 7 el cliente ya no carga backend/.env al importarse, así que la importación puede ser
// estática: cargarEnv() sigue siendo la única fuente de verdad de la configuración.
const env = cargarEnv()
const app = await construirApp({ env })

const detener = (senal: NodeJS.Signals): void => {
  app.log.info({ senal }, "Deteniendo la API")
  app.close().then(
    () => process.exit(0),
    (error: unknown) => {
      app.log.error({ err: error }, "La API no se cerró limpiamente")
      process.exit(1)
    },
  )
}

process.once("SIGINT", detener)
process.once("SIGTERM", detener)

try {
  await app.listen({ host: env.HOST, port: env.PORT })
} catch (error) {
  app.log.fatal({ err: error }, "No se pudo iniciar la API")
  process.exit(1)
}
