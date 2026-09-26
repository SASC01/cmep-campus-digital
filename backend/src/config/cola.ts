import type { Env } from "./env.js"

export interface OpcionesCola {
  connectionString: string
  rol: "api" | "worker"
  maxConexiones: number
}

// La API no supervisa ni programa (supervise: false, schedule: false en adapters/queue): el
// worker es quien lo hace. max distinto por rol (DEC-06): la API solo encola, el worker consume.
export const opcionesDeCola = (env: Env, rol: "api" | "worker"): OpcionesCola => ({
  connectionString: env.DATABASE_URL,
  rol,
  maxConexiones: rol === "api" ? 3 : 4,
})
