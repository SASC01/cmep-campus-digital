import { ALFABETO_CODIGO_CLASE, LONGITUD_CODIGO_CLASE } from "@campus/shared"

// Código de invitación de una clase (S-03): traduce bytes aleatorios (node:crypto.randomBytes en
// el handler) a caracteres del alfabeto de 32 símbolos con `b % 32`, sin sesgo porque 256 es
// múltiplo exacto de 32. Pura: no genera aleatoriedad, solo la traduce.
export const codigoDesdeBytes = (bytes: Uint8Array): string => {
  if (bytes.length !== LONGITUD_CODIGO_CLASE) {
    throw new Error(
      `codigoDesdeBytes espera ${LONGITUD_CODIGO_CLASE} bytes, recibió ${bytes.length}`,
    )
  }
  return Array.from(bytes, (b) => ALFABETO_CODIGO_CLASE[b % ALFABETO_CODIGO_CLASE.length]).join("")
}
