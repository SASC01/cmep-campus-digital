import { z } from "zod"

const mensajePuerto = "debe ser un entero entre 1 y 65535"
const mensajeUrl = "debe ser una URL que empiece con postgresql:// o postgres://"

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"], {
      error: "debe ser development, test o production",
    })
    .default("development"),
  HOST: z
    .string({ error: "debe ser un texto no vacío" })
    .min(1, "no puede estar vacío")
    .default("127.0.0.1"),
  PORT: z.coerce
    .number({ error: mensajePuerto })
    .int(mensajePuerto)
    .min(1, mensajePuerto)
    .max(65535, mensajePuerto)
    .default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"], {
      error: "debe ser fatal, error, warn, info, debug o trace",
    })
    .default("info"),
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: (issue) => (issue.input === undefined ? "obligatoria" : mensajeUrl),
  }),
})

export type Env = z.infer<typeof envSchema>

export type ResultadoEnv = { ok: true; env: Env } | { ok: false; errores: string[] }

// Pura: no toca process.env ni la salida. Los mensajes llevan el nombre de la variable y el
// motivo, nunca su valor (AGENTS.md, regla 13).
export const validarEnv = (fuente: Record<string, string | undefined>): ResultadoEnv => {
  const resultado = envSchema.safeParse(fuente)

  if (resultado.success) return { ok: true, env: resultado.data }

  const errores = resultado.error.issues.map(
    (issue) => `${String(issue.path[0] ?? "(entorno)")}: ${issue.message}`,
  )

  return { ok: false, errores }
}

export const cargarEnv = (): Env => {
  const resultado = validarEnv({ ...process.env })

  if (resultado.ok) return resultado.env

  console.error(
    "Configuración inválida. Revisa backend/.env (si no existe, copia backend/.env.example):",
  )
  for (const error of resultado.errores) {
    console.error(`  - ${error}`)
  }

  process.exit(1)
}
