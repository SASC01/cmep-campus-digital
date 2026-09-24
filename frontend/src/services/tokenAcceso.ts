// Token de acceso SOLO en memoria (ESSENTIALS > Autenticación; AGENTS.md regla 13). Nunca en
// localStorage ni sessionStorage. Se pierde al recargar: el refresco silencioso (cookie HttpOnly,
// POST /api/auth/refrescar) lo repone. Vive aparte de authService para que apiClient lo lea sin
// crear un ciclo apiClient ⇄ authService (DEC-12); authService lo reexporta.
let tokenDeAcceso: string | undefined

export const obtenerToken = (): string | undefined => tokenDeAcceso

export const establecerToken = (token: string): void => {
  tokenDeAcceso = token
}

export const limpiarToken = (): void => {
  tokenDeAcceso = undefined
}

export const haySesion = (): boolean => tokenDeAcceso !== undefined
