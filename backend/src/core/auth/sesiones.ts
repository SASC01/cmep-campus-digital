// Política de sesiones (ESSENTIALS > Autenticación): token de acceso de 15 minutos y sesión de
// refresco de 30 días, deslizante (cada rotación crea una sesión nueva con vigencia completa, S-12).

export const DURACION_TOKEN_ACCESO_S = 15 * 60

export const DURACION_SESION_MS = 30 * 24 * 3_600_000

export const calcularExpiracionSesion = (ahora: Date): Date =>
  new Date(ahora.getTime() + DURACION_SESION_MS)

export interface EstadoDeSesion {
  expiraEn: Date
  revocadaEn: Date | null
  reemplazadaPor: string | null
}

export type DecisionRefresco =
  | { tipo: "rotar" }
  | { tipo: "reutilizacion" }
  | { tipo: "rechazar"; motivo: "revocada" | "vencida" }

// Una sesión reemplazada que vuelve a presentarse es una reutilización (alguien tiene el token
// viejo): se revocan todas, sin gracia (P-04). Una revocada sin reemplazo (logout) solo se rechaza.
export const decidirRefresco = ({
  sesion,
  ahora,
}: {
  sesion: EstadoDeSesion
  ahora: Date
}): DecisionRefresco => {
  if (sesion.reemplazadaPor !== null) return { tipo: "reutilizacion" }
  if (sesion.revocadaEn !== null) return { tipo: "rechazar", motivo: "revocada" }
  if (sesion.expiraEn.getTime() <= ahora.getTime()) return { tipo: "rechazar", motivo: "vencida" }
  return { tipo: "rotar" }
}
