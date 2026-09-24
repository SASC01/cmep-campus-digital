import type { Rol } from "@campus/shared"
import type { preHandlerAsyncHookHandler } from "fastify"

import { evaluarRol } from "../core/auth/autorizacion.js"
import { perfilDe } from "./tipos.js"

// Paso 5: sin roles exigidos deja pasar a cualquier usuario autenticado y activo.
export const requireRole = (roles: readonly Rol[] = []): preHandlerAsyncHookHandler =>
  async function requireRole(request) {
    const error = evaluarRol(perfilDe(request), roles)
    if (error) throw error
  }
