import { randomUUID } from "node:crypto"

import {
  buscarUsuarioRespuestaSchema,
  buscarUsuarioSchema,
  contrasenaTemporalRespuestaSchema,
  corregirCorreoSchema,
  crearEnlaceRegistroRespuestaSchema,
  crearEnlaceRegistroSchema,
  enlaceRegistroRespuestaSchema,
  invitacionMasivaRespuestaSchema,
  invitacionMasivaSchema,
  invitarMaestroSchema,
  listaEnlacesRegistroRespuestaSchema,
  listaRegistradosRespuestaSchema,
  paginacionSchema,
  usuarioAdminSchema,
  type EnlaceRegistroAdmin,
} from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"
import { z } from "zod"

import {
  derivarTokenDeCuenta,
  generarContrasenaTemporal,
  generarTokenDeEnlace,
  hashContrasena,
  hashDeContrasenaInutilizable,
} from "../adapters/auth/index.js"
import {
  buscarCuentaPorEmail,
  buscarCuentaPorId,
  corregirCorreo,
  crearEnlaceRegistro,
  crearMaestroInvitado,
  invitarMaestrosEnLote,
  listarEnlacesRegistro,
  listarRegistradosPorEnlace,
  restablecerConTemporal,
  revocarEnlaceRegistro,
  type CandidatoParaInvitarEnLote,
  type EnlaceRegistroConRegistrados,
} from "../adapters/db/index.js"
import { encolar, encolarVarios } from "../adapters/queue/index.js"
import { calcularExpiracionEnlace, estadoDeEnlace } from "../core/auth/enlaces-registro.js"
import {
  analizarListaDeInvitaciones,
  evaluarCupo,
  nombreProvisionalDe,
  VENTANA_CUPO_MS,
} from "../core/auth/invitacion-masiva.js"
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

const enlaceNoEncontrado = (): AppError =>
  new AppError("ENLACE_NO_ENCONTRADO", "Ese enlace ya no existe.", 404)

// Vista de un enlace para el admin: el estado se deriva aquí (nunca se guarda, §D-B1).
const vistaDeEnlace = (enlace: EnlaceRegistroConRegistrados, ahora: Date): EnlaceRegistroAdmin => ({
  id: enlace.id,
  creadoEn: enlace.creadoEn.toISOString(),
  expiraEn: enlace.expiraEn.toISOString(),
  revocadoEn: enlace.revocadoEn === null ? null : enlace.revocadoEn.toISOString(),
  estado: estadoDeEnlace(enlace, ahora),
  registrados: enlace.registrados,
})

export const adminHandler: FastifyPluginAsync<{ limiteDiarioInvitaciones: number }> = async (
  app,
  { limiteDiarioInvitaciones },
) => {
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

  // AUTH-03b, §D-B4: enlaces de registro de maestro. El token solo viaja aquí, una sola vez.
  app.post("/enlaces-registro", protegido({ roles: ["admin"] }), async (request, reply) => {
    const datos = validarCuerpo(crearEnlaceRegistroSchema, request.body)
    const ahora = new Date()
    const { token, hash } = generarTokenDeEnlace()
    const expiraEn = calcularExpiracionEnlace(datos.vigenciaDias, ahora)
    const enlace = await crearEnlaceRegistro({ hashToken: hash, expiraEn })

    reply.header("Cache-Control", "no-store")
    return reply.status(201).send(
      crearEnlaceRegistroRespuestaSchema.parse({
        enlace: vistaDeEnlace({ ...enlace, registrados: 0 }, ahora),
        token,
      }),
    )
  })

  app.get("/enlaces-registro", protegido({ roles: ["admin"] }), async (request, reply) => {
    const { cursor, limite } = validarParametros(paginacionSchema, request.query)
    const ahora = new Date()
    const { enlaces, siguienteCursor } = await listarEnlacesRegistro({ cursor, limite })

    return reply.send(
      listaEnlacesRegistroRespuestaSchema.parse({
        enlaces: enlaces.map((enlace) => vistaDeEnlace(enlace, ahora)),
        siguienteCursor,
      }),
    )
  })

  app.post(
    "/enlaces-registro/:id/revocar",
    protegido({ roles: ["admin"] }),
    async (request, reply) => {
      const { id } = validarParametros(parametrosIdSchema, request.params)
      // T-07: la hora de la revocación ya no la decide el handler; revocarEnlaceRegistro la fija
      // después de tomar el bloqueo de la fila. Aquí "ahora" solo sirve para derivar el estado de
      // la respuesta (estadoDeEnlace mira primero revocadoEn, así que da igual el instante exacto).
      const enlace = await revocarEnlaceRegistro({ id })
      if (enlace === null) throw enlaceNoEncontrado()

      return reply.send(
        enlaceRegistroRespuestaSchema.parse({ enlace: vistaDeEnlace(enlace, new Date()) }),
      )
    },
  )

  app.get(
    "/enlaces-registro/:id/registrados",
    protegido({ roles: ["admin"] }),
    async (request, reply) => {
      const { id } = validarParametros(parametrosIdSchema, request.params)
      const { cursor, limite } = validarParametros(paginacionSchema, request.query)
      const resultado = await listarRegistradosPorEnlace({ enlaceId: id, cursor, limite })
      if (resultado === null) throw enlaceNoEncontrado()

      return reply.send(
        listaRegistradosRespuestaSchema.parse({
          registrados: resultado.registrados.map((registrado) => ({
            id: registrado.id,
            nombre: registrado.nombre,
            email: registrado.email,
            creadoEn: registrado.creadoEn.toISOString(),
          })),
          siguienteCursor: resultado.siguienteCursor,
        }),
      )
    },
  )

  // AUTH-03c, §D-C3: invitación masiva. Todo el argon2 (un solo hash inutilizable compartido, S-11)
  // y la preparación de cada candidato van antes de la transacción; el cupo y el encolado se
  // deciden dentro de ella.
  app.post("/maestros/lote", protegido({ roles: ["admin"] }), async (request, reply) => {
    const datos = validarCuerpo(invitacionMasivaSchema, request.body)
    const { candidatos, invalidas } = analizarListaDeInvitaciones(datos.lista)

    if (candidatos.length === 0) {
      return reply.send(
        invitacionMasivaRespuestaSchema.parse({ enviadas: [], yaExistentes: [], invalidas }),
      )
    }

    const ahora = new Date()
    const hashInutilizable = await hashDeContrasenaInutilizable()

    const preparados = candidatos.map((candidato) => {
      const cuenta = prepararRegistro({
        nombre: candidato.nombre ?? nombreProvisionalDe(candidato.email),
        email: candidato.email,
      })
      const usuarioId = randomUUID()
      const tokenId = randomUUID()
      const { hash: hashToken } = derivarTokenDeCuenta(tokenId)
      const candidatoDb: CandidatoParaInvitarEnLote = {
        usuario: { id: usuarioId, ...cuenta, hashContrasena: hashInutilizable, rol: "maestro" },
        token: { id: tokenId, hashToken, expiraEn: calcularExpiracionToken("invitacion", ahora) },
      }
      return { linea: candidato.linea, nombreOriginal: candidato.nombre, candidatoDb }
    })

    const resultado = await invitarMaestrosEnLote(
      {
        candidatos: preparados.map((preparado) => preparado.candidatoDb),
        desde: new Date(ahora.getTime() - VENTANA_CUPO_MS),
      },
      (usadas, solicitadas) =>
        evaluarCupo({ limite: limiteDiarioInvitaciones, usadas, solicitadas }),
      (sql, idsDeTokens) =>
        encolarVarios(
          COLA_CORREO_DE_CUENTA,
          idsDeTokens.map((id) => ({ id, datos: { tipo: "invitacion" } })),
          { sql },
        ),
    )

    const emailsInsertados = new Set(resultado.insertados.map((insertado) => insertado.email))
    const emailsExistentes = new Set(resultado.existentes)

    const enviadas: { email: string; nombre: string | null }[] = []
    const yaExistentes: { linea: number; email: string }[] = []
    for (const preparado of preparados) {
      const email = preparado.candidatoDb.usuario.email
      if (emailsInsertados.has(email)) {
        enviadas.push({ email, nombre: preparado.nombreOriginal })
        continue
      }
      if (emailsExistentes.has(email)) {
        yaExistentes.push({ linea: preparado.linea, email })
      }
    }

    return reply.send(invitacionMasivaRespuestaSchema.parse({ enviadas, yaExistentes, invalidas }))
  })
}
