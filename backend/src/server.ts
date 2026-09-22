import { cargarEnv } from "./config/env.js"

// Validar antes de importar la app: el cliente de Prisma 6 carga backend/.env en process.env
// al importarse, y una importación estática (izada) haría que cargarEnv() ya viera esas
// variables. Así el mensaje de "Configuración inválida" sigue siendo la única fuente de verdad.
const env = cargarEnv()
const { construirApp } = await import("./app.js")
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
