import type { preHandlerAsyncHookHandler } from "fastify"

import { resolverClaseDeLaRuta } from "./pertenencia.js"

// Paso 6 (variante inscripción, §D-0.1): deja pasar al estudiante inscrito y al maestro dueño.
// Deja la clase resuelta en request.clase, que el handler lee con claseDe(request).
export const requireMembership = (): preHandlerAsyncHookHandler =>
  async function requireMembership(request) {
    request.clase = await resolverClaseDeLaRuta(request, "inscripcion")
  }
