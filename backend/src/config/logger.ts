import type { LoggerOptions } from "pino"

import type { Env } from "./env.js"

// Mismas opciones para la API (Fastify) y el worker (pino directo). JSON crudo, sin transport.
// Los encabezados con credenciales, las contraseñas del cuerpo y cualquier cuerpo de respuesta se
// censuran si alguna vez se serializan (AGENTS.md, regla 13).
export const opcionesDeLogger = (env: Env): LoggerOptions => ({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
      "req.body.contrasena",
      "req.body.password",
      "req.body.contrasenaActual",
      "req.body.contrasenaNueva",
      "req.body.token",
      "res.body",
      "contrasenaTemporal",
      "token",
      "enlace",
      "*.contrasenaTemporal",
      "*.token",
      "*.enlace",
    ],
    censor: "[oculto]",
  },
})
