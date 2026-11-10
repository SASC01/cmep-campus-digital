import type { LoggerOptions } from "pino"

import type { Env } from "./env.js"

interface PeticionParaElLog {
  method?: unknown
  url?: unknown
  headers?: Record<string, unknown>
  host?: unknown
  ip?: unknown
  socket?: { remotePort?: unknown }
}

// ADMIN-01e (M-09, §D-7.11): los mismos campos que el serializador `req` por omisión de Fastify
// (lib/logger-pino.js), con la URL cortada en el primer "?": la consulta puede llevar el estado de
// pago, el nombre de un alumno o lo que alguien escribió en un buscador. El camino, con sus ids, se
// conserva. Tolera un objeto sin url ni method y nunca devuelve el cuerpo.
const peticionSinConsulta = (req: PeticionParaElLog): Record<string, unknown> => ({
  method: req.method,
  url: typeof req.url === "string" ? req.url.split("?", 1)[0] : req.url,
  version: req.headers === undefined ? undefined : req.headers["accept-version"],
  host: req.host,
  remoteAddress: req.ip,
  remotePort: req.socket === undefined ? undefined : req.socket.remotePort,
})

// Mismas opciones para la API (Fastify) y el worker (pino directo). JSON crudo, sin transport.
// Los encabezados con credenciales, las contraseñas del cuerpo y cualquier cuerpo de respuesta se
// censuran si alguna vez se serializan (AGENTS.md, regla 13).
export const opcionesDeLogger = (env: Env): LoggerOptions => ({
  level: env.LOG_LEVEL,
  serializers: { req: peticionSinConsulta },
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
