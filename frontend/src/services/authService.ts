// Token de acceso SOLO en memoria (ESSENTIALS > Autenticación; AGENTS.md regla 13). Nunca en
// localStorage ni sessionStorage. Se pierde al recargar: el refresco silencioso (cookie HttpOnly,
// POST /api/auth/refrescar) lo repone. login / refrescar / logout llegan con el encargo de
// autenticación (carril sensible); no se dejan esqueletos que rechacen para que nadie los llame.
// Contrato futuro: POST /api/auth/login -> token de acceso en memoria; POST /api/auth/refrescar con
// la cookie HttpOnly -> token nuevo; POST /api/auth/logout -> limpia el token.
let tokenDeAcceso: string | undefined

export const obtenerToken = (): string | undefined => tokenDeAcceso
export const establecerToken = (token: string): void => {
  tokenDeAcceso = token
}
export const limpiarToken = (): void => {
  tokenDeAcceso = undefined
}
export const haySesion = (): boolean => tokenDeAcceso !== undefined
