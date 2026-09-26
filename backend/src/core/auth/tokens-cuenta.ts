// Vigencia y decisión de uso de un enlace de cuenta (recuperación 30 min, invitación 72 h, DEC-08).
// Puro: el token nunca aparece aquí, solo su estado en la base.

export type TipoTokenCuenta = "recuperacion" | "invitacion"

export const VIGENCIA_TOKEN_MS: Record<TipoTokenCuenta, number> = {
  recuperacion: 30 * 60_000,
  invitacion: 72 * 3_600_000,
}

export const calcularExpiracionToken = (tipo: TipoTokenCuenta, ahora: Date): Date =>
  new Date(ahora.getTime() + VIGENCIA_TOKEN_MS[tipo])

export interface EstadoDeTokenCuenta {
  tipo: TipoTokenCuenta
  expiraEn: Date
  usadoEn: Date | null
  revocadoEn: Date | null
  usuario: { activo: boolean }
}

export const estaVivo = (
  token: Pick<EstadoDeTokenCuenta, "expiraEn" | "usadoEn" | "revocadoEn">,
  ahora: Date,
): boolean =>
  token.usadoEn === null && token.revocadoEn === null && token.expiraEn.getTime() > ahora.getTime()

// Motivos internos: nunca se exponen (la respuesta siempre es 400 ENLACE_INVALIDO, sin pistas).
export type MotivoTokenInvalido =
  "inexistente" | "tipo" | "usado" | "revocado" | "vencido" | "usuario_inactivo"

export type DecisionUsoDeToken = { valido: true } | { valido: false; motivo: MotivoTokenInvalido }

export const decidirUsoDeToken = ({
  token,
  tipoEsperado,
  ahora,
}: {
  token: EstadoDeTokenCuenta | null
  tipoEsperado: TipoTokenCuenta
  ahora: Date
}): DecisionUsoDeToken => {
  if (token === null) return { valido: false, motivo: "inexistente" }
  if (token.tipo !== tipoEsperado) return { valido: false, motivo: "tipo" }
  if (token.usadoEn !== null) return { valido: false, motivo: "usado" }
  if (token.revocadoEn !== null) return { valido: false, motivo: "revocado" }
  if (token.expiraEn.getTime() <= ahora.getTime()) return { valido: false, motivo: "vencido" }
  if (!token.usuario.activo) return { valido: false, motivo: "usuario_inactivo" }
  return { valido: true }
}
