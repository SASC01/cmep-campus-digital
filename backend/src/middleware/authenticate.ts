import type { FastifyReply, FastifyRequest } from "fastify"

import { verificarTokenAcceso } from "../adapters/auth/index.js"
import { AppError } from "../core/errores.js"

const PREFIJO_BEARER = "Bearer "

const noAutenticado = (): AppError =>
  new AppError("NO_AUTENTICADO", "Inicia sesión para continuar.", 401)

// Paso 1 de la cadena: valida el JWT del encabezado Authorization y deja request.usuarioId.
// No consulta la base; eso es withProfile. Función con nombre: la guarda de rutas la reconoce.
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const cabecera = request.headers.authorization
  if (typeof cabecera !== "string" || !cabecera.startsWith(PREFIJO_BEARER)) throw noAutenticado()

  const token = cabecera.slice(PREFIJO_BEARER.length).trim()
  if (token.length === 0) throw noAutenticado()

  const { usuarioId } = await verificarTokenAcceso(token, { ahora: new Date() })
  request.usuarioId = usuarioId
  // ESSENTIALS > Operación (T-09): desde aquí cada línea de log de la petición lleva requestId y
  // userId (el uuid; nunca el token). reply.log escribe "request completed": se actualiza también.
  request.log = request.log.child({ userId: usuarioId })
  reply.log = request.log
}
