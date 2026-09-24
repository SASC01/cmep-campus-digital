import { meRespuestaSchema } from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"

import { construirRespuestaMe } from "../core/auth/me.js"
import { perfilDe, protegido } from "../middleware/index.js"

// GET /me: cualquier rol autenticado y activo; única ruta de AUTH-01 que permite acceso
// restringido (RN-03). Negada con debe_cambiar_contrasena (403). Nunca devuelve estadoPago (P-02).
export const usuariosHandler: FastifyPluginAsync = async (app) => {
  app.get("/me", protegido({ permitirRestringido: true }), async (request, reply) =>
    reply.send(meRespuestaSchema.parse(construirRespuestaMe(perfilDe(request)))),
  )
}
