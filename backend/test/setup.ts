// Carga backend/.env para las pruebas (DEC-03: sin dotenv). Solo carga; config/env.ts valida.
try {
  process.loadEnvFile(new URL("../.env", import.meta.url))
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === "ENOENT") {
    throw new Error("Falta backend/.env: copia backend/.env.example a backend/.env", {
      cause: error,
    })
  }
  throw error
}

export {}
