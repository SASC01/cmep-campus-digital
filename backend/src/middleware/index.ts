import type { Rol } from "@campus/shared"
import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify"

import type { PoliticaDeClaseArchivada } from "../core/clases/archivada.js"
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
  // ADMIN-01a (§D-1, DH-01): qué hace la ruta con una clase archivada. Sin declararlo, la ruta queda
  // cerrada en una archivada: 409 CLASE_ARCHIVADA para todos.
  enClaseArchivada?: PoliticaDeClaseArchivada
}

const pasoDePertenencia = (
  pertenencia: OpcionesProtegido["pertenencia"],
  admiteAdmin: boolean,
  enClaseArchivada: PoliticaDeClaseArchivada | undefined,
): preHandlerAsyncHookHandler[] => {
  if (pertenencia === "inscripcion") {
    return [
      marcarPasoDeLaCadena(
        requireMembership({ admiteAdmin, enClaseArchivada }),
        "requireMembership",
      ),
    ]
  }
  if (pertenencia === "propiedad") {
    return [
      marcarPasoDeLaCadena(requireOwnership({ admiteAdmin, enClaseArchivada }), "requireOwnership"),
    ]
  }
  return []
}

// ADMIN-01a (§D-1, ADM-1A03): una política de clase archivada sin sexto paso no tendría efecto, y
// "gestion" abre la clase archivada a todo rol que la ruta admita, así que solo vale para rutas
// exclusivas del admin. Se comprueba al construir la ruta: la API no arranca.
const comprobarPoliticaDeClaseArchivada = (opciones: OpcionesProtegido): void => {
  if (opciones.enClaseArchivada === undefined) return
  if (opciones.pertenencia === undefined) {
    throw new Error("protegido(): enClaseArchivada exige pertenencia.")
  }
  if (opciones.enClaseArchivada !== "gestion") return
  const roles = opciones.roles ?? []
  if (roles.length !== 1 || roles[0] !== "admin") {
    throw new Error('protegido(): enClaseArchivada "gestion" exige roles exactamente ["admin"].')
  }
}

// Cadena con orden fijo por construcción (DEC-08, ESSENTIALS > Autorización):
// authenticate → withProfile → withPasswordGate → withAccess → requireRole →
// requireMembership | requireOwnership → handler. Ningún handler compone la cadena a mano: la
// guarda de rutas solo reconoce los pasos marcados aquí (T-06).
export const protegido = (
  opciones: OpcionesProtegido = {},
): { preHandler: preHandlerAsyncHookHandler[] } => {
  comprobarPoliticaDeClaseArchivada(opciones)
  // Cerrado por defecto (CLASES-02, M-01): el admin solo pasa el sexto paso si `roles` lo nombra, y se
  // decide aquí, al construir la cadena: mutar `roles` después no abre nada.
  const admiteAdmin = (opciones.roles ?? []).includes("admin")
  return {
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
      ...pasoDePertenencia(opciones.pertenencia, admiteAdmin, opciones.enClaseArchivada),
    ],
  }
}

// Se llama en app.ts después de los plugins transversales y ANTES de registrar cualquier handler:
// decora la petición y activa la guarda onRoute (DEC-16).
export const registrarMiddleware = (app: FastifyInstance): void => {
  app.decorateRequest("usuarioId", null)
  app.decorateRequest("perfil", null)
  app.decorateRequest("clase", null)
  registrarGuardaDeRutas(app)
}

export { claseDe, perfilDe } from "./tipos.js"
export { RUTAS_PUBLICAS } from "./rutas-publicas.js"
export type { PerfilAutenticado } from "../core/auth/autorizacion.js"
export type { ClaseDeLaRuta } from "./pertenencia.js"
