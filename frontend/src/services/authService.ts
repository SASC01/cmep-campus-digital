import {
  sinContenidoSchema,
  tokenAccesoRespuestaSchema,
  type Login,
  type Registro,
} from "@campus/shared"

import { api, refrescarSesion } from "./apiClient"
import { establecerToken, limpiarToken } from "./tokenAcceso"

// Contrato con la API de autenticación (DEC-12). El token de acceso vive en tokenAcceso.ts, solo en
// memoria; el de refresco, en la cookie HttpOnly campus_refresco que el navegador envía solo a
// /api/auth/* (Path=/api/auth) y que el código nunca lee.
export { establecerToken, haySesion, limpiarToken, obtenerToken } from "./tokenAcceso"

export const login = async (credenciales: Login): Promise<void> => {
  const { tokenAcceso } = await api("/api/auth/login", {
    method: "POST",
    body: credenciales,
    schema: tokenAccesoRespuestaSchema,
  })
  establecerToken(tokenAcceso)
}

// Registro público: solo estudiantes; deja la sesión iniciada (P-01).
export const registro = async (datos: Registro): Promise<void> => {
  const { tokenAcceso } = await api("/api/auth/registro", {
    method: "POST",
    body: datos,
    schema: tokenAccesoRespuestaSchema,
  })
  establecerToken(tokenAcceso)
}

export const refrescar = refrescarSesion

// Una sola petición a /refrescar por carga de la aplicación (M-08): la guarda y cualquier otro
// llamador comparten el resultado memoizado.
let restauracion: Promise<boolean> | undefined

export const restaurarSesion = (): Promise<boolean> => {
  restauracion ??= refrescarSesion()
  return restauracion
}

// Un fallo de red no impide salir: el token en memoria se limpia igual y la cookie la invalida el
// servidor en cuanto la reciba (o vence sola). logout es idempotente y responde 204. Tras salir, la
// restauración queda cerrada hasta una carga nueva de la aplicación o un login (T-07): ninguna
// guarda vuelve a pedir /refrescar, y si el logout no llegó al servidor la sesión no se reabre sola.
export const logout = async (): Promise<void> => {
  try {
    await api("/api/auth/logout", { method: "POST", schema: sinContenidoSchema })
  } catch {
    // Sin aviso: la salida continúa; el hook navega a /login de todos modos.
  } finally {
    limpiarToken()
    restauracion = Promise.resolve(false)
  }
}
