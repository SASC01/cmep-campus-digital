// Ritmo de envío de correos de cuenta (AUTH-03c, §D-C5, M-06, M-09 y M-12). Resend admite 10
// peticiones por segundo por equipo; 250 ms entre intentos son 4 por segundo como máximo, con
// margen para cualquier otro uso de la misma cuenta.

export const INTERVALO_MINIMO_ENTRE_CORREOS_MS = 250

// Cuánto falta esperar antes del siguiente intento. Sin intento previo, o si ya pasó el intervalo,
// no hay que esperar. El resultado nunca es negativo ni mayor que el intervalo, aunque el reloj
// vaya hacia atrás.
export const esperaAntesDelSiguiente = (
  ultimoIntentoMs: number | null,
  ahoraMs: number,
): number => {
  if (ultimoIntentoMs === null) return 0
  const transcurrido = ahoraMs - ultimoIntentoMs
  if (transcurrido >= INTERVALO_MINIMO_ENTRE_CORREOS_MS) return 0
  const restante = INTERVALO_MINIMO_ENTRE_CORREOS_MS - transcurrido
  return Math.min(Math.max(restante, 0), INTERVALO_MINIMO_ENTRE_CORREOS_MS)
}
