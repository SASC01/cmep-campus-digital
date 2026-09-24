import type { preHandlerAsyncHookHandler } from "fastify"

import { AppError } from "../core/errores.js"

// Paso 6 (variante inscripción): esqueleto hasta el módulo de clases (RN-06). Ninguna ruta de
// AUTH-01 lo usa; si alguien lo compone antes de tiempo, responde 501 en lugar de dejar pasar.
export const requireMembership = (): preHandlerAsyncHookHandler =>
  async function requireMembership() {
    throw new AppError(
      "NO_IMPLEMENTADO",
      "La verificación de inscripción llega con el módulo de clases.",
      501,
    )
  }
