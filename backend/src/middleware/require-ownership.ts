import type { preHandlerAsyncHookHandler } from "fastify"

import type { PoliticaDeClaseArchivada } from "../core/clases/archivada.js"
import { resolverClaseDeLaRuta } from "./pertenencia.js"

// Paso 6 (variante propiedad, §D-0.1): deja pasar a cualquier maestro de la clase y, solo si la ruta
// lo admite (admiteAdmin, calculado de sus `roles`), al administrador.
export const requireOwnership = ({
  admiteAdmin,
  enClaseArchivada,
}: {
  admiteAdmin: boolean
  enClaseArchivada?: PoliticaDeClaseArchivada | undefined
}): preHandlerAsyncHookHandler =>
  async function requireOwnership(request) {
    request.clase = await resolverClaseDeLaRuta(request, "propiedad", admiteAdmin, enClaseArchivada)
  }
