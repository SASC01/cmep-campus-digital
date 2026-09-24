import { randomBytes } from "node:crypto"

import { hashConParametros } from "./contrasenas.js"
import { establecerEstado, mismaConfiguracion, type ConfiguracionAuth } from "./estado.js"

// Idempotente: con la misma configuración no hace nada; con otra (pruebas) recalcula el estado.
// El hash de relleno se genera aquí, una vez por proceso, con los mismos parámetros que los hashes
// reales para que login tarde lo mismo exista o no la cuenta (DEC-03).
export const inicializarAuth = async ({ jwtSecret, argon2 }: ConfiguracionAuth): Promise<void> => {
  if (mismaConfiguracion({ jwtSecret, argon2 })) return
  const hashDeRelleno = await hashConParametros(randomBytes(32).toString("base64url"), argon2)
  establecerEstado({
    jwtSecret,
    argon2,
    clave: new TextEncoder().encode(jwtSecret),
    hashDeRelleno,
  })
}

export { hashContrasena, obtenerHashDeRelleno, verificarContrasena } from "./contrasenas.js"
export type { ConfiguracionAuth, OpcionesArgon2 } from "./estado.js"
export { generarTokenRefresco, hashTokenRefresco } from "./refresco.js"
export { firmarTokenAcceso, verificarTokenAcceso } from "./tokens.js"
