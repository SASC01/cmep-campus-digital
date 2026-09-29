import { createHash, randomBytes } from "node:crypto"

// AUTH-03b (§D-B3): token aleatorio de un enlace de registro, mostrado una sola vez. 32 bytes
// aleatorios en base64url (43 caracteres, la misma forma que valida leerTokenDelFragmento). Solo
// su SHA-256 se guarda en la base.
export const generarTokenDeEnlace = (): { token: string; hash: string } => {
  const token = randomBytes(32).toString("base64url")
  return { token, hash: hashTokenDeEnlace(token) }
}

export const hashTokenDeEnlace = (token: string): string =>
  createHash("sha256").update(token).digest("hex")
