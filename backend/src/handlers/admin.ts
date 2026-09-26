import { randomUUID } from "node:crypto"

import {
  buscarUsuarioRespuestaSchema,
  buscarUsuarioSchema,
  contrasenaTemporalRespuestaSchema,
  corregirCorreoSchema,
  invitarMaestroSchema,
  usuarioAdminSchema,
} from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"
import { z } from "zod"

import {
  derivarTokenDeCuenta,
  generarContrasenaTemporal,
  hashContrasena,
  hashDeContrasenaInutilizable,
} from "../adapters/auth/index.js"
import {
  buscarCuentaPorEmail,
  buscarCuentaPorId,
  corregirCorreo,
  crearMaestroInvitado,
  restablecerConTemporal,
} from "../adapters/db/index.js"
import { encolar } from "../adapters/queue/index.js"
import { evaluarObjetivoDeRestablecimiento } from "../core/auth/respaldo.js"
import { normalizarCorreo, prepararRegistro } from "../core/auth/normalizacion.js"
import { calcularExpiracionToken } from "../core/auth/tokens-cuenta.js"
import { AppError } from "../core/errores.js"
import { COLA_CORREO_DE_CUENTA } from "../core/eventos/correo-de-cuenta.js"
import { protegido } from "../middleware/index.js"
import { validarCuerpo, validarParametros } from "./validacion.js"

const parametrosIdSchema = z.object({ id: z.uuid("id: debe ser un identificador válido") })

const usuarioNoEncontrado = (): AppError =>
  new AppError("USUARIO_NO_ENCONTRADO", "No hay ninguna cuenta con ese identificador.", 404)

export const adminHandler: FastifyPluginAsync = async (app) => {
  app.post("/maestros", protegido({ roles: ["admin"] }), async (request, reply) => {
    const datos = validarCuerpo(invitarMaestroSchema, request.body)
    const cuenta = prepararRegistro(datos)
    const hash = await hashDeContrasenaInutilizable()
    const ahora = new Date()
    const tokenId = randomUUID()
    const { hash: hashToken } = derivarTokenDeCuenta(tokenId)

    const creado = await crearMaestroInvitado(
      {
        usuario: { ...cuenta, hashContrasena: hash, rol: "maestro" },
        token: {
          id: tokenId,
          hashToken,
          expiraEn: calcularExpiracionToken("invitacion", ahora),
        },
      },
      (sql) => encolar(COLA_CORREO_DE_CUENTA, { tipo: "invitacion" }, { id: tokenId, sql }),
    )

    return reply.status(201).send(usuarioAdminSchema.parse(creado))
  })

  app.post("/usuarios/buscar", protegido({ roles: ["admin"] }), async (request, reply) => {
    const datos = validarCuerpo(buscarUsuarioSchema, request.body)
    const usuario = await buscarCuentaPorEmail(normalizarCorreo(datos.email))
    if (usuario === null) throw usuarioNoEncontrado()
    return reply.send(buscarUsuarioRespuestaSchema.parse({ usuario }))
  })

  app.post(
    "/usuarios/:id/restablecer-contrasena",
    protegido({ roles: ["admin"] }),
    async (request, reply) => {
      const { id } = validarParametros(parametrosIdSchema, request.params)
      const objetivo = await buscarCuentaPorId(id)
      if (objetivo === null) throw usuarioNoEncontrado()

      const errorDeObjetivo = evaluarObjetivoDeRestablecimiento(objetivo)
      if (errorDeObjetivo) throw errorDeObjetivo

      const contrasenaTemporal = generarContrasenaTemporal()
      const hash = await hashContrasena(contrasenaTemporal)
      const actualizado = await restablecerConTemporal({
        id,
        hashContrasena: hash,
        ahora: new Date(),
      })
      if (actualizado === null) throw usuarioNoEncontrado()

      reply.header("Cache-Control", "no-store")
      return reply.send(contrasenaTemporalRespuestaSchema.parse({ contrasenaTemporal }))
    },
  )

  app.put("/usuarios/:id/correo", protegido({ roles: ["admin"] }), async (request, reply) => {
    const { id } = validarParametros(parametrosIdSchema, request.params)
    const datos = validarCuerpo(corregirCorreoSchema, request.body)
    const actualizado = await corregirCorreo({
      id,
      email: normalizarCorreo(datos.email),
      ahora: new Date(),
    })
    if (actualizado === null) throw usuarioNoEncontrado()
    return reply.send(usuarioAdminSchema.parse(actualizado))
  })
}
