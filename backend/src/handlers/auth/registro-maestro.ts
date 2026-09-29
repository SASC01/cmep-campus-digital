import { registroMaestroSchema, tokenAccesoRespuestaSchema } from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"

import {
  firmarTokenAcceso,
  generarTokenRefresco,
  hashContrasena,
  hashTokenDeEnlace,
  hashTokenRefresco,
} from "../../adapters/auth/index.js"
import { buscarEnlacePorHash, registrarMaestroConEnlace } from "../../adapters/db/index.js"
import type { Env } from "../../config/env.js"
import { decidirUsoDeEnlace } from "../../core/auth/enlaces-registro.js"
import { prepararRegistro } from "../../core/auth/normalizacion.js"
import { calcularExpiracionSesion } from "../../core/auth/sesiones.js"
import { AppError } from "../../core/errores.js"
import { validarCuerpo } from "../validacion.js"
import { ponerCookieRefresco } from "./cookie.js"

const LONGITUD_MAXIMA_AGENTE = 256

const enlaceInvalido = (): AppError =>
  new AppError(
    "ENLACE_INVALIDO",
    "El enlace de registro no es válido, ya venció o fue revocado. Pide uno nuevo a administración.",
    400,
  )

// AUTH-03b, §D-B5: pública. Registro de maestro con un enlace de registro vivo del admin. rol,
// enlaceRegistroId y cualquier otro campo extra del cuerpo se descartan (registroMaestroSchema).
export const registroMaestroHandler: FastifyPluginAsync<{ env: Env }> = async (app, { env }) => {
  app.post("/registro-maestro", async (request, reply) => {
    const datos = validarCuerpo(registroMaestroSchema, request.body)
    const ahora = new Date()

    const enlace = await buscarEnlacePorHash(hashTokenDeEnlace(datos.token))
    const decision = decidirUsoDeEnlace(enlace, ahora)
    if (!decision.valido || enlace === null) throw enlaceInvalido()

    const cuenta = prepararRegistro(datos)
    const hash = await hashContrasena(datos.contrasena)
    const tokenRefresco = generarTokenRefresco()
    const agente = request.headers["user-agent"]

    const creado = await registrarMaestroConEnlace({
      enlaceId: enlace.id,
      usuario: { ...cuenta, hashContrasena: hash, rol: "maestro", enlaceRegistroId: enlace.id },
      sesion: {
        hashToken: hashTokenRefresco(tokenRefresco),
        expiraEn: calcularExpiracionSesion(ahora),
        ip: request.ip,
        agente:
          typeof agente === "string" && agente.length > 0
            ? agente.slice(0, LONGITUD_MAXIMA_AGENTE)
            : null,
      },
      ahora,
    })
    if (creado === null) throw enlaceInvalido()

    const tokenAcceso = await firmarTokenAcceso({ usuarioId: creado.usuarioId, ahora })
    ponerCookieRefresco(reply, env, tokenRefresco)
    return reply.status(201).send(tokenAccesoRespuestaSchema.parse({ tokenAcceso }))
  })
}
