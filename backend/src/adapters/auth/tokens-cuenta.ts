import { createHash, createHmac } from "node:crypto"

import { obtenerEstado } from "./estado.js"

// DEC-03: el token del enlace se deriva de su id con HMAC-SHA256 (clave HKDF de jwtSecret), en
// base64url. El trabajo de la cola solo lleva el id; la base guarda solo hashTokenDeCuenta(token).
// Ni el id ni el hash sirven para reconstruir el token sin la clave.
export const derivarTokenDeCuenta = (id: string): { token: string; hash: string } => {
  const token = createHmac("sha256", obtenerEstado().claveTokensCuenta)
    .update(id)
    .digest("base64url")
  return { token, hash: hashTokenDeCuenta(token) }
}

export const hashTokenDeCuenta = (token: string): string =>
  createHash("sha256").update(token).digest("hex")
