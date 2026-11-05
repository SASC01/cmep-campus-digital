import {
  claseRespuestaSchema,
  codigoClaseRespuestaSchema,
  listaClasesAnterioresConsultaSchema,
  listaClasesAnterioresRespuestaSchema,
  listaClasesImpartidasRespuestaSchema,
  listaClasesInscritasRespuestaSchema,
  LONGITUD_CODIGO_CLASE,
  paginacionSchema,
  unirseRespuestaSchema,
  unirseSchema,
} from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"
import { randomBytes } from "node:crypto"

import {
  leerClase,
  leerCodigo,
  listarClasesAnteriores,
  listarClasesImpartidas,
  listarClasesInscritas,
  regenerarCodigo,
  unirseConCodigo,
  type ClaseDb,
} from "../../adapters/db/index.js"
import { codigoDesdeBytes } from "../../core/clases/codigo.js"
import { AppError } from "../../core/errores.js"
import { claseDe, perfilDe, protegido } from "../../middleware/index.js"
import { validarCuerpo, validarParametros } from "../validacion.js"

// El generador de código vive en el handler (S-03): node:crypto (aleatoriedad) + codigoDesdeBytes
// (core, pura). El adaptador reintenta una sola vez si choca con el índice único.
export const generarCodigo = (): string => codigoDesdeBytes(randomBytes(LONGITUD_CODIGO_CLASE))

// CLASES-02 (P-06 a): `maestro` (el principal, el primero de `maestros`) es un campo de
// compatibilidad con el frontend anterior; se retira junto con clases.maestro_id. ADMIN-01a (S-14):
// `archivadaEn` siempre va, en ISO o null.
export const conMaestroPrincipal = (clase: ClaseDb) => {
  const [maestro] = clase.maestros
  if (maestro === undefined) {
    throw new AppError("ERROR_INTERNO", "La clase no tiene maestros asignados.", 500)
  }
  const archivadaEn = clase.archivadaEn === null ? null : clase.archivadaEn.toISOString()
  return { ...clase, maestro, archivadaEn }
}

const codigoInvalido = (): AppError =>
  new AppError(
    "CODIGO_INVALIDO",
    "No encontramos una clase con ese código. Revisa que esté bien escrito.",
    404,
  )

const sinAcceso = (): AppError =>
  new AppError("SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.", 403)

// Rutas de CLASES-a (§D-A2). Ningún handler verifica rol, propiedad o inscripción a mano: todo pasa
// por protegido() y, en las rutas con :claseId, por claseDe(request) (sexto paso).
export const clasesHandler: FastifyPluginAsync = async (app) => {
  app.get("/clases/inscritas", protegido({ roles: ["estudiante"] }), async (request, reply) => {
    const { cursor, limite } = validarParametros(paginacionSchema, request.query)
    const perfil = perfilDe(request)
    const resultado = await listarClasesInscritas({ usuarioId: perfil.id, cursor, limite })
    // `maestro` es el primer maestro de `maestros` (compatibilidad, P-06 a).
    return reply.send(
      listaClasesInscritasRespuestaSchema.parse({
        ...resultado,
        clases: resultado.clases.map((clase) => ({ ...clase, maestro: clase.maestros[0] })),
      }),
    )
  })

  app.get("/clases/impartidas", protegido({ roles: ["maestro"] }), async (request, reply) => {
    const { cursor, limite } = validarParametros(paginacionSchema, request.query)
    const perfil = perfilDe(request)
    const resultado = await listarClasesImpartidas({ maestroId: perfil.id, cursor, limite })
    return reply.send(listaClasesImpartidasRespuestaSchema.parse(resultado))
  })

  // ADMIN-01a (§D-2, DH-02): las clases archivadas del perfil (inscripciones del alumno o
  // asignaciones del maestro); el adaptador elige cuáles con el rol del perfil autenticado.
  app.get(
    "/clases/anteriores",
    protegido({ roles: ["estudiante", "maestro"] }),
    async (request, reply) => {
      const { cursor, cursorArchivadaEn, limite } = validarParametros(
        listaClasesAnterioresConsultaSchema,
        request.query,
      )
      const perfil = perfilDe(request)
      const resultado = await listarClasesAnteriores({
        usuarioId: perfil.id,
        rol: perfil.rol,
        cursor,
        cursorArchivadaEn,
        limite,
      })
      return reply.send(
        listaClasesAnterioresRespuestaSchema.parse({
          ...resultado,
          clases: resultado.clases.map((clase) => ({
            ...clase,
            archivadaEn: clase.archivadaEn.toISOString(),
          })),
          siguienteCursorArchivadaEn: resultado.siguienteCursorArchivadaEn?.toISOString() ?? null,
        }),
      )
    },
  )

  // ADMIN-01a (§D-3): el código de una clase archivada responde como un código inexistente.
  app.post("/clases/unirse", protegido({ roles: ["estudiante"] }), async (request, reply) => {
    const datos = validarCuerpo(unirseSchema, request.body)
    const perfil = perfilDe(request)
    const resultado = await unirseConCodigo({ codigo: datos.codigo, usuarioId: perfil.id })
    if (resultado === null) throw codigoInvalido()
    return reply.send(
      unirseRespuestaSchema.parse({ clase: resultado.clase, yaEstabas: resultado.yaEstaba }),
    )
  })

  app.get(
    "/clases/:claseId",
    protegido({
      roles: ["estudiante", "maestro", "admin"],
      pertenencia: "inscripcion",
      enClaseArchivada: "lectura-del-alumno",
    }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const clase = await leerClase(id)
      if (clase === null) throw sinAcceso()
      return reply.send(claseRespuestaSchema.parse({ clase: conMaestroPrincipal(clase) }))
    },
  )

  app.get(
    "/clases/:claseId/codigo",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const codigo = await leerCodigo(id)
      if (codigo === null) throw sinAcceso()
      reply.header("Cache-Control", "no-store")
      return reply.send(codigoClaseRespuestaSchema.parse({ codigo }))
    },
  )

  app.post(
    "/clases/:claseId/codigo",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const codigo = await regenerarCodigo(id, generarCodigo)
      if (codigo === null) throw sinAcceso()
      reply.header("Cache-Control", "no-store")
      return reply.send(codigoClaseRespuestaSchema.parse({ codigo }))
    },
  )
}
