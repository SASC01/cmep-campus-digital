import type { Rol } from "@campus/shared"

import { AppError } from "../errores.js"

// Lo que withProfile lee de la base en cada petición. Sin estadoPago (P-02) ni hashContrasena.
export interface PerfilAutenticado {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  accesoRestringido: boolean
  motivoRestriccion: string | null
  debeCambiarContrasena: boolean
}

// Decisiones puras de la cadena de autorización: el middleware solo las evalúa y lanza.
export const evaluarPasswordGate = (
  perfil: PerfilAutenticado,
  { permitirCambioPendiente = false }: { permitirCambioPendiente?: boolean } = {},
): AppError | null => {
  if (!perfil.debeCambiarContrasena || permitirCambioPendiente) return null
  return new AppError(
    "CAMBIO_DE_CONTRASENA_REQUERIDO",
    "Debes cambiar tu contraseña antes de continuar.",
    403,
  )
}

export const evaluarAcceso = (
  perfil: PerfilAutenticado,
  { permitirRestringido = false }: { permitirRestringido?: boolean } = {},
): AppError | null => {
  if (!perfil.accesoRestringido || permitirRestringido) return null
  return new AppError(
    "ACCESO_RESTRINGIDO",
    "Tu acceso está restringido. Acude a administración.",
    403,
  )
}

export const evaluarRol = (perfil: PerfilAutenticado, roles: readonly Rol[]): AppError | null => {
  if (roles.length === 0 || roles.includes(perfil.rol)) return null
  return new AppError("ROL_NO_PERMITIDO", "No tienes permiso para esta acción.", 403)
}
