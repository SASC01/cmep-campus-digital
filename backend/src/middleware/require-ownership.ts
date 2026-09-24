import type { preHandlerAsyncHookHandler } from "fastify"

import { AppError } from "../core/errores.js"

// Paso 6 (variante propiedad): esqueleto hasta el módulo de clases (RN-06). Igual que
// requireMembership: 501 en lugar de dejar pasar.
export const requireOwnership = (): preHandlerAsyncHookHandler =>
  async function requireOwnership() {
    throw new AppError(
      "NO_IMPLEMENTADO",
      "La verificación de propiedad llega con el módulo de clases.",
      501,
    )
  }
