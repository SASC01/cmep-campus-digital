import { randomUUID } from "node:crypto"

import {
  cambiarContrasenaSchema,
  nuevaContrasenaConTokenSchema,
  recuperarSchema,
} from "@campus/shared"
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify"

import {
  hashContrasena,
  hashTokenDeCuenta,
  hashTokenRefresco,
  verificarContrasena,
} from "../../adapters/auth/index.js"
import {
  buscarCredencialesPorId,
  buscarSesionPorHash,
  buscarTokenPorHash,
  cambiarContrasenaPropia,
  usarTokenYCambiarContrasena,
} from "../../adapters/db/index.js"
import { encolar } from "../../adapters/queue/index.js"
import {
  evaluarCambioSolicitado,
  evaluarContrasenaNueva,
} from "../../core/auth/cambio-de-contrasena.js"
import { normalizarCorreo } from "../../core/auth/normalizacion.js"
import { llaveDeIntento, podarLlaves, reservarIntento } from "../../core/auth/intentos.js"
import { POLITICA_SOLICITUDES_RECUPERACION } from "../../core/auth/recuperacion.js"
import { decidirUsoDeToken } from "../../core/auth/tokens-cuenta.js"
import { AppError } from "../../core/errores.js"
import { COLA_CORREO_DE_CUENTA } from "../../core/eventos/correo-de-cuenta.js"
import { perfilDe, protegido } from "../../middleware/index.js"
import { validarCuerpo } from "../validacion.js"
import { NOMBRE_COOKIE_REFRESCO } from "./cookie.js"

const ESCRITURAS_ENTRE_PODAS = 500

const enlaceInvalido = (): AppError =>
  new AppError("ENLACE_INVALIDO", "El enlace no es válido o ya venció. Pide uno nuevo.", 400)

// Enmienda 2: también la usa el paso 8 (cambiarContrasenaPropia devuelve false si el hash vigente
// ya no es el verificado en el paso 5, por ejemplo porque el admin generó otra temporal entretanto).
const contrasenaActualIncorrecta = (): AppError =>
  new AppError("CONTRASENA_ACTUAL_INCORRECTA", "La contraseña temporal no es correcta.", 400)

export const cuentasHandler: FastifyPluginAsync = async (app) => {
  let solicitudesDeRecuperacion = new Map<string, number[]>()
  let escriturasDeRecuperacion = 0

  let fallosDeCambio = new Map<string, number[]>()
  let escriturasDeCambio = 0

  app.post("/recuperar", async (request, reply) => {
    const datos = validarCuerpo(recuperarSchema, request.body)
    const correo = normalizarCorreo(datos.email)
    const ahora = new Date()
    const llave = llaveDeIntento(request.ip, correo)

    const reserva = reservarIntento(
      solicitudesDeRecuperacion.get(llave) ?? [],
      ahora,
      POLITICA_SOLICITUDES_RECUPERACION,
    )
    solicitudesDeRecuperacion.set(llave, reserva.fallos)
    escriturasDeRecuperacion += 1
    if (escriturasDeRecuperacion % ESCRITURAS_ENTRE_PODAS === 0) {
      solicitudesDeRecuperacion = podarLlaves(
        solicitudesDeRecuperacion,
        ahora,
        POLITICA_SOLICITUDES_RECUPERACION,
      )
    }
    if (!reserva.permitido) {
      reply.header("Retry-After", "3600")
      throw new AppError(
        "DEMASIADAS_SOLICITUDES",
        "Ya pediste varios enlaces para este correo. Espera una hora e inténtalo de nuevo.",
        429,
      )
    }

    // DEC-04: no se consulta usuarios ni se escribe tokens_cuenta aquí, así que no hay nada que
    // encolar en la misma transacción (T-03): el handler no abre una transacción ni obtiene el
    // cliente de Prisma (regla 1, AUTH-01 DEC-10). El encolado y la respuesta no dependen de si la
    // cuenta existe (misma cadena siempre); el worker decide y crea el token.
    await encolar(COLA_CORREO_DE_CUENTA, { tipo: "recuperacion", correo }, { id: randomUUID() })

    return reply.status(204).send()
  })

  const manejarRestablecimiento =
    (tipoEsperado: "recuperacion" | "invitacion") =>
    async (request: FastifyRequest, reply: FastifyReply) => {
      const datos = validarCuerpo(nuevaContrasenaConTokenSchema, request.body)
      const ahora = new Date()
      const registro = await buscarTokenPorHash(hashTokenDeCuenta(datos.token))
      const decision = decidirUsoDeToken({ token: registro, tipoEsperado, ahora })
      if (!decision.valido || registro === null) throw enlaceInvalido()

      const hash = await hashContrasena(datos.contrasena)
      const consumido = await usarTokenYCambiarContrasena({
        tokenId: registro.id,
        usuarioId: registro.usuarioId,
        hashContrasena: hash,
        ahora,
      })
      if (!consumido) throw enlaceInvalido()

      return reply.status(204).send()
    }

  app.post("/restablecer", manejarRestablecimiento("recuperacion"))
  app.post("/establecer-contrasena", manejarRestablecimiento("invitacion"))

  app.post(
    "/cambiar-contrasena",
    protegido({ permitirCambioPendiente: true, permitirRestringido: true }),
    async (request, reply) => {
      const perfil = perfilDe(request)
      const errorDeCambio = evaluarCambioSolicitado(perfil)
      if (errorDeCambio) throw errorDeCambio

      const datos = validarCuerpo(cambiarContrasenaSchema, request.body)
      const errorDeRepetida = evaluarContrasenaNueva({
        actual: datos.contrasenaActual,
        nueva: datos.contrasenaNueva,
      })
      if (errorDeRepetida) throw errorDeRepetida

      const ahora = new Date()
      const reserva = reservarIntento(fallosDeCambio.get(perfil.id) ?? [], ahora)
      fallosDeCambio.set(perfil.id, reserva.fallos)
      escriturasDeCambio += 1
      if (escriturasDeCambio % ESCRITURAS_ENTRE_PODAS === 0) {
        fallosDeCambio = podarLlaves(fallosDeCambio, ahora)
      }
      if (!reserva.permitido) {
        reply.header("Retry-After", "900")
        throw new AppError(
          "DEMASIADOS_INTENTOS",
          "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.",
          429,
        )
      }

      const credenciales = await buscarCredencialesPorId(perfil.id)
      if (credenciales === null) throw contrasenaActualIncorrecta()

      const coincide = await verificarContrasena(
        credenciales.hashContrasena,
        datos.contrasenaActual,
      )
      if (!coincide) throw contrasenaActualIncorrecta()

      fallosDeCambio.delete(perfil.id)
      const hash = await hashContrasena(datos.contrasenaNueva)

      const tokenActual = request.cookies[NOMBRE_COOKIE_REFRESCO]
      const sesionActual = tokenActual
        ? await buscarSesionPorHash(hashTokenRefresco(tokenActual))
        : null
      const conservarSesionId =
        sesionActual !== null &&
        sesionActual.usuarioId === perfil.id &&
        sesionActual.revocadaEn === null &&
        sesionActual.reemplazadaPor === null &&
        sesionActual.expiraEn.getTime() > ahora.getTime()
          ? sesionActual.id
          : null

      // Enmienda 2, paso 8: si el hash vigente ya no es el verificado arriba (por ejemplo, el
      // admin generó otra temporal entretanto), no escribe nada y responde igual que un error de
      // la temporal.
      const cambiada = await cambiarContrasenaPropia({
        usuarioId: perfil.id,
        hashContrasena: hash,
        hashVerificado: credenciales.hashContrasena,
        conservarSesionId,
        ahora,
      })
      if (!cambiada) throw contrasenaActualIncorrecta()

      return reply.status(204).send()
    },
  )
}
