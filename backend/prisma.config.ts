import { defineConfig, env } from "prisma/config"

// El CLI de Prisma 7 no carga .env por su cuenta y este proyecto no usa dotenv (DEC-03 de BACK-01).
// En desarrollo lee backend/.env; en prod las variables llegan del entorno y el archivo no existe.
// loadEnvFile no pisa variables ya definidas: el entorno siempre gana sobre el archivo.
try {
  process.loadEnvFile(new URL(".env", import.meta.url))
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
})
