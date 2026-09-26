import { hkdfSync, randomBytes } from "node:crypto"

import { hashConParametros } from "./contrasenas.js"
import { establecerEstado, mismaConfiguracion, type ConfiguracionAuth } from "./estado.js"

// Info fija de la derivación (DEC-03): distingue esta clave de cualquier otra que se derive de
// jwtSecret en el futuro. No es secreta; solo etiqueta el uso.
const INFO_TOKENS_CUENTA = "campus-tokens-cuenta"
const LONGITUD_CLAVE_TOKENS_CUENTA = 32

// Idempotente: con la misma configuración no hace nada; con otra (pruebas) recalcula el estado.
// El hash de relleno se genera aquí, una vez por proceso, con los mismos parámetros que los hashes
// reales para que login tarde lo mismo exista o no la cuenta (DEC-03).
export const inicializarAuth = async ({ jwtSecret, argon2 }: ConfiguracionAuth): Promise<void> => {
  if (mismaConfiguracion({ jwtSecret, argon2 })) return
  const hashDeRelleno = await hashConParametros(randomBytes(32).toString("base64url"), argon2)
  const claveTokensCuenta = new Uint8Array(
    hkdfSync("sha256", jwtSecret, "", INFO_TOKENS_CUENTA, LONGITUD_CLAVE_TOKENS_CUENTA),
  )
  establecerEstado({
    jwtSecret,
    argon2,
    clave: new TextEncoder().encode(jwtSecret),
    hashDeRelleno,
    claveTokensCuenta,
  })
}

export { hashContrasena, obtenerHashDeRelleno, verificarContrasena } from "./contrasenas.js"
export { hashDeContrasenaInutilizable } from "./contrasenas.js"
export { generarContrasenaTemporal } from "./contrasena-temporal.js"
export type { ConfiguracionAuth, OpcionesArgon2 } from "./estado.js"
export { generarTokenRefresco, hashTokenRefresco } from "./refresco.js"
export { derivarTokenDeCuenta, hashTokenDeCuenta } from "./tokens-cuenta.js"
export { firmarTokenAcceso, verificarTokenAcceso } from "./tokens.js"
