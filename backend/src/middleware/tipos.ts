import type { FastifyRequest } from "fastify"

import type { PerfilAutenticado } from "../core/auth/autorizacion.js"
import { AppError } from "../core/errores.js"

// Decoraciones que la cadena deja en la petición (DEC-09). Se inicializan en null con
// decorateRequest (registrarMiddleware) y las rellenan authenticate y withProfile.
declare module "fastify" {
  interface FastifyRequest {
    usuarioId: string | null
    perfil: PerfilAutenticado | null
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
