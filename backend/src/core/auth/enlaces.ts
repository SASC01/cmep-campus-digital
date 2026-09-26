import type { TipoTokenCuenta } from "./tokens-cuenta.js"

// El token va en el fragmento (#): el navegador no lo envía en ninguna petición HTTP ni en
// Referer, así que no llega a los logs de Cloudflare ni de la API (DEC-14).
export const RUTA_DE_ENLACE: Record<TipoTokenCuenta, string> = {
  recuperacion: "/restablecer",
  invitacion: "/establecer-contrasena",
}

const sinBarraFinal = (url: string): string => url.replace(/\/+$/, "")

export const construirEnlaceDeCuenta = ({
  urlBase,
  tipo,
  token,
}: {
  urlBase: string
  tipo: TipoTokenCuenta
  token: string
}): string => `${sinBarraFinal(urlBase)}${RUTA_DE_ENLACE[tipo]}#token=${token}`

export const construirUrlRecuperar = (urlBase: string): string =>
  `${sinBarraFinal(urlBase)}/recuperar`
