import { createHash, randomBytes } from "node:crypto"

// Token de refresco aleatorio (32 bytes) que viaja solo en la cookie HttpOnly; la base guarda
// únicamente su SHA-256 (S-07, AGENTS.md regla 13).
export const generarTokenRefresco = (): string => randomBytes(32).toString("base64url")

export const hashTokenRefresco = (token: string): string =>
  createHash("sha256").update(token).digest("hex")
