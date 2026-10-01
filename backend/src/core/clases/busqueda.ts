import { LONGITUD_MINIMA_BUSQUEDA, normalizarTerminoDeBusqueda } from "@campus/shared"

// Mínimo de caracteres del término, ya normalizado, para buscar alumnos (RN-04, S-11). La
// normalización y el mínimo viven en shared/ (T-24): el frontend y el esquema usan los mismos.
export { LONGITUD_MINIMA_BUSQUEDA }

// Normaliza el término igual que nombre_busqueda (DEC-02, C-07). null si queda en menos de
// LONGITUD_MINIMA_BUSQUEDA caracteres: el handler lo responde como BUSQUEDA_MUY_CORTA. Cuenta
// caracteres Unicode completos, no unidades de UTF-16.
export const prepararTerminoDeBusqueda = (q: string): string | null => {
  const termino = normalizarTerminoDeBusqueda(q)
  if (Array.from(termino).length < LONGITUD_MINIMA_BUSQUEDA) return null
  return termino
}

// Prisma no escapa los comodines de LIKE en `contains` (R-16): "%" y "_" buscarían de más. Se
// antepone "\" (el escape por defecto de LIKE en PostgreSQL) a "\", "%" y "_".
export const escaparComodinesLike = (termino: string): string =>
  termino.replace(/[\\%_]/g, (caracter) => `\\${caracter}`)

const CORREO_OCULTO = "***"

// Correo enmascarado del buscador (P-05 f, S-22): hasta 2 caracteres de la parte local, y nunca
// todos, más "***" y el dominio completo. Separa en la última "@". Sin "@", con la parte local o el
// dominio vacíos, no deja ver nada del original. Pura: no lanza.
export const enmascararCorreo = (email: string): string => {
  const posicionDeArroba = email.lastIndexOf("@")
  if (posicionDeArroba === -1) return CORREO_OCULTO

  const dominio = email.slice(posicionDeArroba + 1)
  const parteLocal = Array.from(email.slice(0, posicionDeArroba))
  if (parteLocal.length === 0 || dominio.length === 0) return CORREO_OCULTO

  const visibles = parteLocal.slice(0, Math.min(2, parteLocal.length - 1)).join("")
  return `${visibles}${CORREO_OCULTO}@${dominio}`
}
