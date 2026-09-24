// Único punto de redirección fuera del router (DEC-12). Solo lo usa apiClient cuando la sesión se
// pierde en mitad del uso o la API responde 403 ACCESO_RESTRINGIDO; la entrada sin sesión la
// resuelven las guardas con <Navigate>. Recarga completa a propósito: limpia todo el estado en
// memoria. En pruebas se sustituye con vi.mock.
export const irA = (ruta: string): void => {
  window.location.assign(ruta)
}

export const rutaActual = (): string => window.location.pathname
