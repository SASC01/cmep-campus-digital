import type { Env } from "./env.js"

// Parámetros de argon2id iguales en todos los entornos (S-06): 19 MiB, 2 iteraciones, 1 hilo.
export interface OpcionesArgon2 {
  memoryCost: number
  timeCost: number
  parallelism: number
}

export interface OpcionesAuth {
  jwtSecret: string
  argon2: OpcionesArgon2
  cookieSegura: boolean
}

// Único puente entre las variables de entorno y adapters/auth: adapters/ no lee process.env.
export const opcionesDeAuth = (env: Env): OpcionesAuth => ({
  jwtSecret: env.JWT_SECRET,
  argon2: { memoryCost: 19456, timeCost: 2, parallelism: 1 },
  cookieSegura: env.NODE_ENV === "production",
})
