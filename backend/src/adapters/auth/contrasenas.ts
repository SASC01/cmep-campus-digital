import * as argon2 from "argon2"

import { obtenerEstado, type OpcionesArgon2 } from "./estado.js"

// Única importación de argon2 del proyecto (regla 1). Siempre argon2id (AGENTS.md, regla 13).
export const hashConParametros = (
  contrasena: string,
  parametros: OpcionesArgon2,
): Promise<string> => argon2.hash(contrasena, { type: argon2.argon2id, ...parametros })

export const hashContrasena = (contrasena: string): Promise<string> =>
  hashConParametros(contrasena, obtenerEstado().argon2)

// Un hash malformado cuenta como contraseña incorrecta, nunca como error del servidor.
export const verificarContrasena = async (hash: string, contrasena: string): Promise<boolean> => {
  try {
    return await argon2.verify(hash, contrasena)
  } catch {
    return false
  }
}

// Con él verifica login cuando el correo no existe o el usuario está inactivo, para que el tiempo
// de respuesta no revele si la cuenta existe (DEC-03).
export const obtenerHashDeRelleno = (): string => obtenerEstado().hashDeRelleno
