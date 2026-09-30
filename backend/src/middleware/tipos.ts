import type { FastifyRequest } from "fastify"

import type { PerfilAutenticado } from "../core/auth/autorizacion.js"
import { AppError } from "../core/errores.js"
import type { ClaseDeLaRuta } from "./pertenencia.js"

// Decoraciones que la cadena deja en la petición (DEC-09). Se inicializan en null con
// decorateRequest (registrarMiddleware) y las rellenan authenticate, withProfile y (el sexto paso)
// requireMembership/requireOwnership.
declare module "fastify" {
  interface FastifyRequest {
    usuarioId: string | null
    perfil: PerfilAutenticado | null
    clase: ClaseDeLaRuta | null
  }
}

// Único acceso al perfil desde un handler. Si falta, la ruta no pasó por protegido(): es un error
// de programación (500), nunca un 401 silencioso.
export const perfilDe = (request: FastifyRequest): PerfilAutenticado => {
  if (!request.perfil) {
    throw new AppError(
      "PERFIL_AUSENTE",
      "La ruta no pasó por la cadena de autorización (protegido()).",
      500,
    )
  }
  return request.perfil
}

// Único acceso a la clase de la ruta desde un handler (§D-0.1). Si falta, la ruta no pasó por el
// sexto paso: error de programación (500), igual que perfilDe.
export const claseDe = (request: FastifyRequest): ClaseDeLaRuta => {
  if (!request.clase) {
    throw new AppError(
      "CLASE_AUSENTE",
      "La ruta no pasó por requireMembership ni requireOwnership.",
      500,
    )
  }
  return request.clase
}
