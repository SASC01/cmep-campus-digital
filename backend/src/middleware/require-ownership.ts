import type { preHandlerAsyncHookHandler } from "fastify"

import { resolverClaseDeLaRuta } from "./pertenencia.js"

// Paso 6 (variante propiedad, §D-0.1): deja pasar solo al maestro dueño de la clase.
export const requireOwnership = (): preHandlerAsyncHookHandler =>
  async function requireOwnership(request) {
    request.clase = await resolverClaseDeLaRuta(request, "propiedad")
  }
