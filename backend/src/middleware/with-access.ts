import type { preHandlerAsyncHookHandler } from "fastify"

import { evaluarAcceso } from "../core/auth/autorizacion.js"
import { perfilDe } from "./tipos.js"

// Paso 4: un alumno restringido solo pasa por las rutas que lo permiten (GET /me y, con pagos,
// GET /me/estado-pago). Efecto inmediato aunque el JWT siga vigente (D-15).
export const withAccess = (
  opciones: { permitirRestringido?: boolean } = {},
): preHandlerAsyncHookHandler =>
  async function withAccess(request) {
    const error = evaluarAcceso(perfilDe(request), opciones)
    if (error) throw error
  }
