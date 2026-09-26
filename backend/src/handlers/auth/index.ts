import { loginSchema, registroSchema, tokenAccesoRespuestaSchema } from "@campus/shared"
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify"

import {
  firmarTokenAcceso,
  generarTokenRefresco,
  hashContrasena,
  hashTokenRefresco,
  obtenerHashDeRelleno,
  verificarContrasena,
} from "../../adapters/auth/index.js"
import {
  buscarCredencialesPorEmail,
  buscarSesionPorHash,
  crearSesion,
  crearUsuarioConSesion,
  revocarSesion,
  revocarSesionPorHash,
  revocarTodasLasSesiones,
  rotarSesion,
} from "../../adapters/db/index.js"
import type { Env } from "../../config/env.js"
import { llaveDeIntento, podarLlaves, reservarIntento } from "../../core/auth/intentos.js"
import { normalizarCorreo, prepararRegistro } from "../../core/auth/normalizacion.js"
import { calcularExpiracionSesion, decidirRefresco } from "../../core/auth/sesiones.js"
import { AppError } from "../../core/errores.js"
import { validarCuerpo } from "../validacion.js"
import { limpiarCookieRefresco, NOMBRE_COOKIE_REFRESCO, ponerCookieRefresco } from "./cookie.js"

const LONGITUD_MAXIMA_AGENTE = 256
const ESCRITURAS_ENTRE_PODAS = 500

const agenteDe = (request: FastifyRequest): string | null => {
  const agente = request.headers["user-agent"]
  if (typeof agente !== "string" || agente.length === 0) return null
  return agente.slice(0, LONGITUD_MAXIMA_AGENTE)
}

const credencialesInvalidas = (): AppError =>
  new AppError("CREDENCIALES_INVALIDAS", "Correo o contraseña incorrectos.", 401)

const sesionInvalida = (): AppError =>
  new AppError("SESION_INVALIDA", "Tu sesión terminó. Vuelve a iniciar sesión.", 401)

// Rutas públicas por naturaleza (lista única en middleware/rutas-publicas.ts). refrescar y logout se
// autentican con la cookie campus_refresco. Nada de aquí genera avisos ni correos.
export const authHandler: FastifyPluginAsync<{ env: Env }> = async (app, { env }) => {
  // Límite de intentos (DEC-06, S-13): Map en memoria del proceso, una sola instancia, llave
  // IP + correo normalizado. Cada intento se reserva como fallo al entrar; un acierto borra la
  // llave. Cada 500 escrituras se podan las llaves sin fallos vigentes.
  let intentos = new Map<string, number[]>()
  let escrituras = 0

  // Síncrona a propósito (T-01): comprueba, poda la llave y reserva el intento sin ningún await de
  // por medio, así una ráfaga concurrente no puede pasar entera la comprobación.
  const reservar = (llave: string, ahora: Date): boolean => {
    const reserva = reservarIntento(intentos.get(llave) ?? [], ahora)
    intentos.set(llave, reserva.fallos)
    escrituras += 1
    if (escrituras % ESCRITURAS_ENTRE_PODAS === 0) intentos = podarLlaves(intentos, ahora)
    return reserva.permitido
  }

  const responderConSesion = async (
    reply: FastifyReply,
    {
      usuarioId,
      ahora,
      tokenRefresco,
      estado,
    }: {
      usuarioId: string
      ahora: Date
      tokenRefresco: string
      estado: 200 | 201
    },
  ) => {
    const tokenAcceso = await firmarTokenAcceso({ usuarioId, ahora })
    ponerCookieRefresco(reply, env, tokenRefresco)
    return reply.status(estado).send(tokenAccesoRespuestaSchema.parse({ tokenAcceso }))
  }

  app.post("/registro", async (request, reply) => {
    const datos = validarCuerpo(registroSchema, request.body)
    const cuenta = prepararRegistro(datos)
    const hash = await hashContrasena(datos.contrasena)
    const ahora = new Date()
    const tokenRefresco = generarTokenRefresco()

    // rol, activo, estadoPago y accesoRestringido no vienen del cuerpo: zod los descarta y la firma
    // del repositorio no los acepta. Solo se crean estudiantes (ESSENTIALS > Autenticación).
    const { usuarioId } = await crearUsuarioConSesion({
      usuario: { ...cuenta, hashContrasena: hash, rol: "estudiante" },
      sesion: {
        hashToken: hashTokenRefresco(tokenRefresco),
        expiraEn: calcularExpiracionSesion(ahora),
        ip: request.ip,
        agente: agenteDe(request),
      },
    })

    return responderConSesion(reply, { usuarioId, ahora, tokenRefresco, estado: 201 })
  })

  app.post("/login", async (request, reply) => {
    const datos = validarCuerpo(loginSchema, request.body)
    const email = normalizarCorreo(datos.email)
    const ahora = new Date()
    const llave = llaveDeIntento(request.ip, email)

    // Antes de tocar la base y antes de cualquier await: el 429 no revela si el correo existe, y
    // el intento ya cuenta como fallo hasta que la contraseña resulte correcta.
    if (!reservar(llave, ahora)) {
      reply.header("Retry-After", "900")
      throw new AppError(
        "DEMASIADOS_INTENTOS",
        "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.",
        429,
      )
    }

    // Tres ramas (inexistente, inactivo, contraseña incorrecta) con el mismo código, el mismo
    // mensaje, el mismo costo de argon2 (hash de relleno) y el mismo conteo de fallos (M-07): las
    // tres dejan en pie el intento reservado.
    const credenciales = await buscarCredencialesPorEmail(email)
    const utilizable = credenciales !== null && credenciales.activo
    const hash = utilizable ? credenciales.hashContrasena : obtenerHashDeRelleno()
    const coincide = await verificarContrasena(hash, datos.contrasena)

    if (!utilizable || !coincide) throw credencialesInvalidas()

    intentos.delete(llave)
    const tokenRefresco = generarTokenRefresco()
    const creada = await crearSesion({
      usuarioId: credenciales.id,
      hashVerificado: credenciales.hashContrasena,
      hashToken: hashTokenRefresco(tokenRefresco),
      expiraEn: calcularExpiracionSesion(ahora),
      ip: request.ip,
      agente: agenteDe(request),
    })
    // null: la contraseña cambió o la cuenta se desactivó entre la verificación y este punto (T-09).
    // Se responde igual que una contraseña incorrecta.
    if (!creada) throw credencialesInvalidas()

    return responderConSesion(reply, {
      usuarioId: credenciales.id,
      ahora,
      tokenRefresco,
      estado: 200,
    })
  })

  app.post("/refrescar", async (request, reply) => {
    const rechazar = (): AppError => {
      limpiarCookieRefresco(reply, env)
      return sesionInvalida()
    }

    const tokenActual = request.cookies[NOMBRE_COOKIE_REFRESCO]
    if (!tokenActual) throw rechazar()

    const sesion = await buscarSesionPorHash(hashTokenRefresco(tokenActual))
    if (!sesion) throw rechazar()

    const ahora = new Date()
    const decision = decidirRefresco({ sesion, ahora })

    if (decision.tipo === "reutilizacion") {
      await revocarTodasLasSesiones(sesion.usuarioId)
      throw rechazar()
    }
    if (decision.tipo === "rechazar") throw rechazar()
    if (!sesion.usuario.activo) {
      await revocarSesion(sesion.id)
      throw rechazar()
    }

    const tokenRefresco = generarTokenRefresco()
    const rotada = await rotarSesion({
      sesionId: sesion.id,
      ahora,
      nueva: {
        usuarioId: sesion.usuarioId,
        hashToken: hashTokenRefresco(tokenRefresco),
        expiraEn: calcularExpiracionSesion(ahora),
        ip: request.ip,
        agente: agenteDe(request),
      },
    })

    // null: otra petición ganó la carrera con el mismo token (DEC-04). Se trata como reutilización.
    if (!rotada) {
      await revocarTodasLasSesiones(sesion.usuarioId)
      throw rechazar()
    }

    return responderConSesion(reply, {
      usuarioId: sesion.usuarioId,
      ahora,
      tokenRefresco,
      estado: 200,
    })
  })

  // Idempotente: con o sin cookie responde 204 y la limpia.
  app.post("/logout", async (request, reply) => {
    const tokenActual = request.cookies[NOMBRE_COOKIE_REFRESCO]
    if (tokenActual) await revocarSesionPorHash(hashTokenRefresco(tokenActual))
    limpiarCookieRefresco(reply, env)
    return reply.status(204).send()
  })
}
