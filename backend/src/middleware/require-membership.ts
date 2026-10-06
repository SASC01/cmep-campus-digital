import type { preHandlerAsyncHookHandler } from "fastify"

import { resolverClaseDeLaRuta } from "./pertenencia.js"

// Paso 6 (variante inscripción, §D-0.1): deja pasar al estudiante inscrito, a cualquier maestro de
// la clase y, solo si la ruta lo admite (admiteAdmin, calculado de sus `roles`), al administrador.
// Deja la clase resuelta en request.clase, que el handler lee con claseDe(request).
export const requireMembership = ({
  admiteAdmin,
}: {
  admiteAdmin: boolean
}): preHandlerAsyncHookHandler =>
  async function requireMembership(request) {
    request.clase = await resolverClaseDeLaRuta(request, "inscripcion", admiteAdmin)
  }
