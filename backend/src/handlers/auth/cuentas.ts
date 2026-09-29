import { randomUUID } from "node:crypto"

import {
  cambiarContrasenaSchema,
  datosDeInvitacionSchema,
  establecerContrasenaSchema,
  nuevaContrasenaConTokenSchema,
  recuperarSchema,
} from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"

import {
  hashContrasena,
  hashTokenDeCuenta,
  hashTokenRefresco,
  verificarContrasena,
} from "../../adapters/auth/index.js"
import {
  buscarCredencialesPorId,
  buscarInvitacionPorHash,
  buscarSesionPorHash,
  buscarTokenPorHash,
  cambiarContrasenaPropia,
  usarTokenYCambiarContrasena,
} from "../../adapters/db/index.js"
import { encolar } from "../../adapters/queue/index.js"
import {
  errorDelCambioPropio,
  estaVivaParaCambio,
  evaluarCambioSolicitado,
  evaluarContrasenaRepetida,
} from "../../core/auth/cambio-de-contrasena.js"
import { normalizarCorreo, prepararNombre } from "../../core/auth/normalizacion.js"
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

// AUTH-03a (M-02, M-03): la misma respuesta para "sin sesión viva propia" (filtro previo, sin
// bloqueo) y para la decisión definitiva bajo el bloqueo ("sin_sesion" y "credencial_cambiada").
const sesionInvalida = (): AppError =>
  new AppError("SESION_INVALIDA", "Tu sesión terminó. Vuelve a iniciar sesión.", 401)

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

  app.post("/restablecer", async (request, reply) => {
    const datos = validarCuerpo(nuevaContrasenaConTokenSchema, request.body)
    const ahora = new Date()
    const registro = await buscarTokenPorHash(hashTokenDeCuenta(datos.token))
    const decision = decidirUsoDeToken({ token: registro, tipoEsperado: "recuperacion", ahora })
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
  })

  // AUTH-03a, §D-A2: pública. Con el token de una invitación viva, solo el nombre de la cuenta.
  // No escribe nada ni encola nada; nunca devuelve el correo, el rol ni el id.
  app.post("/invitacion", async (request, reply) => {
    const datos = validarCuerpo(datosDeInvitacionSchema, request.body)
    const ahora = new Date()
    const registro = await buscarInvitacionPorHash(hashTokenDeCuenta(datos.token))
    const decision = decidirUsoDeToken({ token: registro, tipoEsperado: "invitacion", ahora })
    if (!decision.valido || registro === null) throw enlaceInvalido()

    reply.header("Cache-Control", "no-store")
    return reply.status(200).send({ nombre: registro.usuario.nombre })
  })

  // AUTH-03a, §D-A2: pública (sin cambio en la cadena). Admite corregir el nombre en la misma
  // transacción que consume el token. Un nombre inválido responde 400 VALIDACION antes de tocar
  // el token (validarCuerpo corre antes de cualquier lectura): el enlace sigue vivo.
  app.post("/establecer-contrasena", async (request, reply) => {
    const datos = validarCuerpo(establecerContrasenaSchema, request.body)
    const ahora = new Date()
    const registro = await buscarTokenPorHash(hashTokenDeCuenta(datos.token))
    const decision = decidirUsoDeToken({ token: registro, tipoEsperado: "invitacion", ahora })
    if (!decision.valido || registro === null) throw enlaceInvalido()

    const hash = await hashContrasena(datos.contrasena)
    const consumido = await usarTokenYCambiarContrasena({
      tokenId: registro.id,
      usuarioId: registro.usuarioId,
      hashContrasena: hash,
      ...(datos.nombre === undefined ? {} : { nombre: prepararNombre(datos.nombre) }),
      ahora,
    })
    if (!consumido) throw enlaceInvalido()

    return reply.status(204).send()
  })

  app.post(
    "/cambiar-contrasena",
    protegido({ permitirCambioPendiente: true, permitirRestringido: true }),
    async (request, reply) => {
      const perfil = perfilDe(request)
      const errorDeCambio = evaluarCambioSolicitado(perfil)
      if (errorDeCambio) throw errorDeCambio

      const datos = validarCuerpo(cambiarContrasenaSchema, request.body)
      const ahora = new Date()

      // Filtro previo, sin bloqueo (M-02): sin una sesión viva propia, 401 SESION_INVALIDA sin
      // reservar el intento ni calcular argon2. La decisión definitiva se toma bajo el bloqueo
      // (paso 8): entre este filtro y el bloqueo, la sesión puede rotar o revocarse.
      const tokenActual = request.cookies[NOMBRE_COOKIE_REFRESCO]
      const sesionActual = tokenActual
        ? await buscarSesionPorHash(hashTokenRefresco(tokenActual))
        : null
      if (sesionActual === null || !estaVivaParaCambio(sesionActual, perfil.id, ahora)) {
        throw sesionInvalida()
      }
      const sesionId = sesionActual.id

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
      if (credenciales === null) throw sesionInvalida()

      const coincide = await verificarContrasena(credenciales.hashContrasena, datos.contrasenaNueva)
      const errorDeRepetida = evaluarContrasenaRepetida(coincide)
      if (errorDeRepetida) throw errorDeRepetida

      fallosDeCambio.delete(perfil.id)
      const hash = await hashContrasena(datos.contrasenaNueva)

      // La decisión definitiva sobre la sesión se toma aquí, bajo el bloqueo (M-03).
      const resultado = await cambiarContrasenaPropia({
        usuarioId: perfil.id,
        hashContrasena: hash,
        hashVerificado: credenciales.hashContrasena,
        sesionId,
        ahora,
      })
      const errorDelCambio = errorDelCambioPropio(resultado)
      if (errorDelCambio) throw errorDelCambio

      return reply.status(204).send()
    },
  )
}
