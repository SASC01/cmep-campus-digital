import { AppError } from "../errores.js"
import type { PerfilAutenticado } from "./autorizacion.js"

// P-05: cambiar-contrasena solo es para el cambio obligatorio (debe_cambiar_contrasena). Un
// restringido sin la bandera también recibe este 409, no un 403 (C-01): la ruta admite
// restringidos, pero no abre nada más si no tienen un cambio pendiente.
export const evaluarCambioSolicitado = (perfil: PerfilAutenticado): AppError | null => {
  if (perfil.debeCambiarContrasena) return null
  return new AppError("CAMBIO_NO_REQUERIDO", "No tienes un cambio de contraseña pendiente.", 409)
}

// La nueva contraseña debe ser distinta de la temporal (comparación exacta: "Abcdef1234" y
// "abcdef1234" son distintas contraseñas, aunque el correo no distinga mayúsculas).
export const evaluarContrasenaNueva = ({
  actual,
  nueva,
}: {
  actual: string
  nueva: string
}): AppError | null => {
  if (actual !== nueva) return null
  return new AppError(
    "CONTRASENA_REPETIDA",
    "La contraseña nueva debe ser distinta de la temporal.",
    400,
  )
}
