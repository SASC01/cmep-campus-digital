// Contraseña temporal del restablecimiento por el admin (S-05). 31 caracteres sin ambigüedad visual
// (sin i, l, o, 0, 1), en grupos xxxx-xxxx-xxxx (12 caracteres útiles, 14 con guiones, ≈ 59 bits).

export const ALFABETO_CONTRASENA_TEMPORAL = "abcdefghjkmnpqrstuvwxyz23456789"
export const LONGITUD_CONTRASENA_TEMPORAL = 12
// 248 = 31 × 8: el mayor múltiplo del tamaño del alfabeto que cabe en un byte. Los bytes ≥ 248 se
// descartan (muestreo por rechazo) para que cada carácter del alfabeto tenga la misma probabilidad.
const LIMITE_BYTE_VALIDO = 248
export const BYTES_PARA_CONTRASENA_TEMPORAL = 64

const agrupar = (texto: string): string =>
  texto.replace(/(.{4})(?=.)/g, "$1-").slice(0, LONGITUD_CONTRASENA_TEMPORAL + 2)

// Puro: recibe los bytes aleatorios (adapters/auth los genera con randomBytes) y devuelve el texto
// formateado, o lanza si no hay suficientes bytes válidos (probabilidad despreciable con 64 bytes
// de entrada para 12 caracteres útiles).
export const formatearContrasenaTemporal = (bytes: Uint8Array): string => {
  const caracteres: string[] = []
  for (const byte of bytes) {
    if (caracteres.length >= LONGITUD_CONTRASENA_TEMPORAL) break
    if (byte >= LIMITE_BYTE_VALIDO) continue
    caracteres.push(ALFABETO_CONTRASENA_TEMPORAL[byte % ALFABETO_CONTRASENA_TEMPORAL.length]!)
  }
  if (caracteres.length < LONGITUD_CONTRASENA_TEMPORAL) {
    throw new Error("No hubo suficientes bytes válidos para formar la contraseña temporal.")
  }
  return agrupar(caracteres.join(""))
}
