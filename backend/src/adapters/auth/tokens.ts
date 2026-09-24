import { jwtVerify, SignJWT, type JWTPayload } from "jose"

import { DURACION_TOKEN_ACCESO_S } from "../../core/auth/sesiones.js"
import { AppError } from "../../core/errores.js"
import { obtenerEstado } from "./estado.js"

// Única importación de jose del proyecto (regla 1). JWT HS256 con solo sub (uuid del usuario) más
// los metadatos estándar iat, exp, iss y aud (S-05): ni rol ni banderas; esos se leen de la base
// en cada petición (withProfile).
const EMISOR = "campus-digital"
const AUDIENCIA = "campus-api"
const FORMA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const firmarTokenAcceso = ({
  usuarioId,
  ahora,
}: {
  usuarioId: string
  ahora: Date
}): Promise<string> => {
  const emitidoEn = Math.floor(ahora.getTime() / 1000)
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(usuarioId)
    .setIssuedAt(emitidoEn)
    .setExpirationTime(emitidoEn + DURACION_TOKEN_ACCESO_S)
    .setIssuer(EMISOR)
    .setAudience(AUDIENCIA)
    .sign(obtenerEstado().clave)
}

const noAutenticado = (): AppError =>
  new AppError("NO_AUTENTICADO", "Inicia sesión para continuar.", 401)

// Cualquier fallo (firma, algoritmo, exp, iss, aud, forma) es el mismo 401: un solo código (R-12).
export const verificarTokenAcceso = async (
  token: string,
  { ahora }: { ahora: Date },
): Promise<{ usuarioId: string }> => {
  let carga: JWTPayload
  try {
    const { payload } = await jwtVerify(token, obtenerEstado().clave, {
      algorithms: ["HS256"],
      issuer: EMISOR,
      audience: AUDIENCIA,
      currentDate: ahora,
      clockTolerance: 0,
      // T-05: sin exp, iat o sub no hay token; maxTokenAge también rechaza un iat en el futuro.
      requiredClaims: ["exp", "iat", "sub"],
      maxTokenAge: DURACION_TOKEN_ACCESO_S,
    })
    carga = payload
  } catch {
    throw noAutenticado()
  }
  const { sub, exp, iat } = carga
  if (sub === undefined || !FORMA_UUID.test(sub)) throw noAutenticado()
  // Ningún token de acceso dura más de 15 minutos, aunque se haya firmado con el secreto correcto.
  if (exp === undefined || iat === undefined || exp - iat > DURACION_TOKEN_ACCESO_S) {
    throw noAutenticado()
  }
  return { usuarioId: sub }
}
