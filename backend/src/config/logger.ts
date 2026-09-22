import type { LoggerOptions } from "pino"

import type { Env } from "./env.js"

// Mismas opciones para la API (Fastify) y el worker (pino directo). JSON crudo, sin transport.
// Los encabezados con credenciales se censuran si alguna vez se serializan (AGENTS.md, regla 13).
export const opcionesDeLogger = (env: Env): LoggerOptions => ({
  level: env.LOG_LEVEL,
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", 'res.headers["set-cookie"]'],
    censor: "[oculto]",
  },
})
