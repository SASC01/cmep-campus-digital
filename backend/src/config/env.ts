import { z } from "zod"

const mensajePuerto = "debe ser un entero entre 1 y 65535"
const mensajeUrl = "debe ser una URL que empiece con postgresql:// o postgres://"

// Mismo literal que backend/.env.example. En production se rechaza (DEC-17): un despliegue que copie
// el ejemplo firmaría tokens con un secreto público del repositorio.
export const JWT_SECRET_DE_EJEMPLO = "dev_jwt_secret_de_desarrollo_no_valido_para_prod_0123456789"

const LONGITUD_MINIMA_JWT_SECRET = 32

const envSchema = z
  .object({
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
    JWT_SECRET: z
      .string({
        error: (issue) => (issue.input === undefined ? "obligatoria" : "debe ser un texto"),
      })
      .min(
        LONGITUD_MINIMA_JWT_SECRET,
        `debe tener al menos ${LONGITUD_MINIMA_JWT_SECRET} caracteres`,
      ),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return
    if (typeof env.JWT_SECRET !== "string") return
    // T-08: el literal de ejemplo con espacios alrededor sigue siendo el secreto público, y los
    // blancos no aportan entropía: se compara recortado y la longitud se mide sin espacios.
    const esElDeEjemplo = env.JWT_SECRET.trim() === JWT_SECRET_DE_EJEMPLO
    const caracteresUtiles = env.JWT_SECRET.replace(/\s/gu, "").length
    if (!esElDeEjemplo && caracteresUtiles >= LONGITUD_MINIMA_JWT_SECRET) return
    ctx.addIssue({
      code: "custom",
      path: ["JWT_SECRET"],
      message: `en production debe ser un secreto propio de al menos ${LONGITUD_MINIMA_JWT_SECRET} caracteres, distinto del de .env.example`,
    })
  })

export type Env = z.infer<typeof envSchema>

export type ResultadoEnv = { ok: true; env: Env } | { ok: false; errores: string[] }

const formatearIncidencias = (issues: readonly z.core.$ZodIssue[]): string[] =>
  issues.map((issue) => `${String(issue.path[0] ?? "(entorno)")}: ${issue.message}`)

// Pura: no toca process.env ni la salida. Los mensajes llevan el nombre de la variable y el
// motivo, nunca su valor (AGENTS.md, regla 13).
export const validarEnv = (fuente: Record<string, string | undefined>): ResultadoEnv => {
  const resultado = envSchema.safeParse(fuente)

  if (resultado.success) return { ok: true, env: resultado.data }

  return { ok: false, errores: formatearIncidencias(resultado.error.issues) }
}

const salirPorConfiguracionInvalida = (errores: readonly string[]): never => {
  console.error(
    "Configuración inválida. Revisa backend/.env (si no existe, copia backend/.env.example):",
  )
  for (const error of errores) {
    console.error(`  - ${error}`)
  }

  process.exit(1)
}

export const cargarEnv = (): Env => {
  const resultado = validarEnv({ ...process.env })

  if (resultado.ok) return resultado.env

  return salirPorConfiguracionInvalida(resultado.errores)
}

// Variables que solo usan npm run seed:admin y npm run reset:admin (DEC-11). Mismos límites que los
// esquemas de shared/auth.ts (correo válido, contraseña 10-128, nombre 2-120); mensajes sin valores.
const adminEnvSchema = z.object({
  ADMIN_EMAIL: z
    .string({
      error: (issue) => (issue.input === undefined ? "obligatoria" : "debe ser un correo válido"),
    })
    .trim()
    .max(254, "debe ser un correo válido")
    .pipe(z.email("debe ser un correo válido")),
  ADMIN_PASSWORD: z
    .string({
      error: (issue) => (issue.input === undefined ? "obligatoria" : "debe ser un texto"),
    })
    .min(10, "debe tener entre 10 y 128 caracteres")
    .max(128, "debe tener entre 10 y 128 caracteres"),
  ADMIN_NOMBRE: z
    .string({
      error: (issue) => (issue.input === undefined ? "obligatoria" : "debe ser un texto"),
    })
    .trim()
    .min(2, "debe tener entre 2 y 120 caracteres")
    .max(120, "debe tener entre 2 y 120 caracteres"),
})

export type EnvAdmin = z.infer<typeof adminEnvSchema>

export type ResultadoEnvAdmin = { ok: true; env: EnvAdmin } | { ok: false; errores: string[] }

export const validarEnvAdmin = (fuente: Record<string, string | undefined>): ResultadoEnvAdmin => {
  const resultado = adminEnvSchema.safeParse(fuente)

  if (resultado.success) return { ok: true, env: resultado.data }

  return { ok: false, errores: formatearIncidencias(resultado.error.issues) }
}

export const cargarEnvAdmin = (): EnvAdmin => {
  const resultado = validarEnvAdmin({ ...process.env })

  if (resultado.ok) return resultado.env

  return salirPorConfiguracionInvalida(resultado.errores)
}
