// AUTH-03b: enlaces de registro de maestro. El estado del enlace nunca se guarda: se deriva de
// expiraEn y revocadoEn en cada consulta (§D-B1).

export const calcularExpiracionEnlace = (vigenciaDias: number, ahora: Date): Date =>
  new Date(ahora.getTime() + vigenciaDias * 24 * 3_600_000)

export type EstadoEnlace = "vigente" | "vencido" | "revocado"

export const estadoDeEnlace = (
  enlace: { expiraEn: Date; revocadoEn: Date | null },
  ahora: Date,
): EstadoEnlace => {
  if (enlace.revocadoEn !== null) return "revocado"
  if (enlace.expiraEn.getTime() <= ahora.getTime()) return "vencido"
  return "vigente"
}

export type DecisionDeUsoDeEnlace =
  { valido: true } | { valido: false; motivo: "inexistente" | "vencido" | "revocado" }

export const decidirUsoDeEnlace = (
  enlace: { expiraEn: Date; revocadoEn: Date | null } | null,
  ahora: Date,
): DecisionDeUsoDeEnlace => {
  if (enlace === null) return { valido: false, motivo: "inexistente" }
  const estado = estadoDeEnlace(enlace, ahora)
  if (estado === "revocado") return { valido: false, motivo: "revocado" }
  if (estado === "vencido") return { valido: false, motivo: "vencido" }
  return { valido: true }
}
