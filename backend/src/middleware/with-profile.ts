import type { FastifyRequest } from "fastify"

import { buscarPerfilPorId } from "../adapters/db/index.js"
import { AppError } from "../core/errores.js"

const noAutenticado = (): AppError =>
  new AppError("NO_AUTENTICADO", "Inicia sesión para continuar.", 401)

// Paso 2: lee el perfil de la base en cada petición (rol y banderas nunca van en el token). Usuario
// inexistente o inactivo → 401, aunque el JWT siga vigente (S-15). Sin estadoPago (P-02).
export async function withProfile(request: FastifyRequest): Promise<void> {
  if (!request.usuarioId) throw noAutenticado()

  const perfil = await buscarPerfilPorId(request.usuarioId)
  if (!perfil || !perfil.activo) throw noAutenticado()

  request.perfil = perfil
}
