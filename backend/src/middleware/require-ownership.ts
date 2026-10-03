import type { preHandlerAsyncHookHandler } from "fastify"

import { resolverClaseDeLaRuta } from "./pertenencia.js"

// Paso 6 (variante propiedad, §D-0.1): deja pasar a cualquier maestro de la clase y, solo si la ruta
// lo admite (admiteAdmin, calculado de sus `roles`), al administrador.
export const requireOwnership = ({
  admiteAdmin,
}: {
  admiteAdmin: boolean
}): preHandlerAsyncHookHandler =>
  async function requireOwnership(request) {
    request.clase = await resolverClaseDeLaRuta(request, "propiedad", admiteAdmin)
  }
