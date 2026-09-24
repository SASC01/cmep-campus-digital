import type { Rol } from "@campus/shared"
import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify"

import { authenticate } from "./authenticate.js"
import { marcarPasoDeLaCadena, registrarGuardaDeRutas } from "./guarda-de-rutas.js"
import { requireMembership } from "./require-membership.js"
import { requireOwnership } from "./require-ownership.js"
import { requireRole } from "./require-role.js"
import { withAccess } from "./with-access.js"
import { withPasswordGate } from "./with-password-gate.js"
import { withProfile } from "./with-profile.js"

export interface OpcionesProtegido {
  roles?: readonly Rol[]
  permitirRestringido?: boolean
  permitirCambioPendiente?: boolean
  pertenencia?: "inscripcion" | "propiedad"
}

const pasoDePertenencia = (
  pertenencia: OpcionesProtegido["pertenencia"],
): preHandlerAsyncHookHandler[] => {
  if (pertenencia === "inscripcion") return [requireMembership()]
  if (pertenencia === "propiedad") return [requireOwnership()]
  return []
}

// Cadena con orden fijo por construcción (DEC-08, ESSENTIALS > Autorización):
// authenticate → withProfile → withPasswordGate → withAccess → requireRole →
// requireMembership | requireOwnership → handler. Ningún handler compone la cadena a mano: la
// guarda de rutas solo reconoce los pasos marcados aquí (T-06).
export const protegido = (
  opciones: OpcionesProtegido = {},
): { preHandler: preHandlerAsyncHookHandler[] } => ({
  preHandler: [
    marcarPasoDeLaCadena(authenticate, "authenticate"),
    marcarPasoDeLaCadena(withProfile, "withProfile"),
    marcarPasoDeLaCadena(
      withPasswordGate({ permitirCambioPendiente: opciones.permitirCambioPendiente ?? false }),
      "withPasswordGate",
    ),
    marcarPasoDeLaCadena(
      withAccess({ permitirRestringido: opciones.permitirRestringido ?? false }),
      "withAccess",
    ),
    marcarPasoDeLaCadena(requireRole(opciones.roles ?? []), "requireRole"),
    ...pasoDePertenencia(opciones.pertenencia),
  ],
})

// Se llama en app.ts después de los plugins transversales y ANTES de registrar cualquier handler:
// decora la petición y activa la guarda onRoute (DEC-16).
export const registrarMiddleware = (app: FastifyInstance): void => {
  app.decorateRequest("usuarioId", null)
  app.decorateRequest("perfil", null)
  registrarGuardaDeRutas(app)
}

export { perfilDe } from "./tipos.js"
export { RUTAS_PUBLICAS } from "./rutas-publicas.js"
export type { PerfilAutenticado } from "../core/auth/autorizacion.js"
