import { AppError } from "../errores.js"
import type { PerfilAutenticado } from "./autorizacion.js"

// P-05: cambiar-contrasena solo es para el cambio obligatorio (debe_cambiar_contrasena). Un
// restringido sin la bandera también recibe este 409, no un 403 (C-01): la ruta admite
// restringidos, pero no abre nada más si no tienen un cambio pendiente.
export const evaluarCambioSolicitado = (perfil: PerfilAutenticado): AppError | null => {
  if (perfil.debeCambiarContrasena) return null
  return new AppError("CAMBIO_NO_REQUERIDO", "No tienes un cambio de contraseña pendiente.", 409)
}

// AUTH-03a (B-03 B): la nueva contraseña debe ser distinta de la vigente (la temporal).
// Comparación exacta: "Abcdef1234" y "abcdef1234" son contraseñas distintas.
export const evaluarContrasenaRepetida = (coincideConLaVigente: boolean): AppError | null => {
  if (!coincideConLaVigente) return null
  return new AppError(
    "CONTRASENA_REPETIDA",
    "La contraseña nueva debe ser distinta de la temporal.",
    400,
  )
}

// Filtro previo, sin bloqueo (M-02): comprueba que la cookie de refresco identifique una sesión
// viva del mismo usuario, antes de reservar el intento y de calcular argon2. La decisión
// definitiva se toma bajo el bloqueo del usuario (M-02, M-03): entre este filtro y el bloqueo, la
// sesión puede rotar o revocarse, así que este resultado nunca sustituye a esa decisión.
export const estaVivaParaCambio = (
  sesion: {
    usuarioId: string
    revocadaEn: Date | null
    reemplazadaPor: string | null
    expiraEn: Date
  } | null,
  usuarioId: string,
  ahora: Date,
): boolean => {
  if (sesion === null) return false
  if (sesion.usuarioId !== usuarioId) return false
  if (sesion.revocadaEn !== null) return false
  if (sesion.reemplazadaPor !== null) return false
  return sesion.expiraEn.getTime() > ahora.getTime()
}

export type ResultadoCambioPropio = "cambiada" | "credencial_cambiada" | "sin_sesion"

// M-03: "credencial_cambiada" y "sin_sesion" responden igual (401 SESION_INVALIDA), porque las dos
// significan que la sesión con la que se intentó el cambio ya no sirve para completarlo.
export const errorDelCambioPropio = (resultado: ResultadoCambioPropio): AppError | null => {
  if (resultado === "cambiada") return null
  return new AppError("SESION_INVALIDA", "Tu sesión terminó. Vuelve a iniciar sesión.", 401)
}
