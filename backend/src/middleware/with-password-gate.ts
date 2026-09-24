import type { preHandlerAsyncHookHandler } from "fastify"

import { evaluarPasswordGate } from "../core/auth/autorizacion.js"
import { perfilDe } from "./tipos.js"

// Paso 3: con debe_cambiar_contrasena solo pasan las rutas que lo permiten explícitamente
// (POST /auth/cambiar-contrasena, AUTH-02). La decisión es de core/; aquí solo se lanza.
export const withPasswordGate = (
  opciones: { permitirCambioPendiente?: boolean } = {},
): preHandlerAsyncHookHandler =>
  async function withPasswordGate(request) {
    const error = evaluarPasswordGate(perfilDe(request), opciones)
    if (error) throw error
  }
