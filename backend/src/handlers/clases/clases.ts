import {
  claseRespuestaSchema,
  codigoClaseRespuestaSchema,
  crearClaseSchema,
  editarClaseSchema,
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
  buscarClasePorCodigo,
  crearClase,
  editarClase,
  inscribir,
  leerClase,
  leerCodigo,
  listarClasesImpartidas,
  listarClasesInscritas,
  regenerarCodigo,
} from "../../adapters/db/index.js"
import { codigoDesdeBytes } from "../../core/clases/codigo.js"
import { normalizarTextoLargo } from "../../core/clases/texto.js"
import { AppError } from "../../core/errores.js"
import { claseDe, perfilDe, protegido } from "../../middleware/index.js"
import { validarCuerpo, validarParametros } from "../validacion.js"

// El generador de código vive en el handler (S-03): node:crypto (aleatoriedad) + codigoDesdeBytes
// (core, pura). El adaptador reintenta una sola vez si choca con el índice único.
const generarCodigo = (): string => codigoDesdeBytes(randomBytes(LONGITUD_CODIGO_CLASE))

// T-01 (ronda 1 del tester): normalizarTextoLargo (CRLF y CR → LF, recorte en los extremos) se
// aplica a la descripción antes de validarla con el esquema (§D-C4: "también en a"). Si se
// validara primero, un CR o un CRLF haría fallar el refine de caracteres de control antes de que
// hubiera oportunidad de normalizarlo. Solo toca el campo si llega como cadena; cualquier otra
// forma (ausente, número, objeto…) se deja intacta para que el esquema la rechace igual que antes.
const conDescripcionNormalizada = (cuerpo: unknown): unknown => {
  if (typeof cuerpo !== "object" || cuerpo === null) return cuerpo
  const objeto = cuerpo as Record<string, unknown>
  if (typeof objeto.descripcion !== "string") return cuerpo
  return { ...objeto, descripcion: normalizarTextoLargo(objeto.descripcion) }
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
  app.post("/clases", protegido({ roles: ["maestro"] }), async (request, reply) => {
    const datos = validarCuerpo(crearClaseSchema, conDescripcionNormalizada(request.body))
    const perfil = perfilDe(request)
    const clase = await crearClase(
      { maestroId: perfil.id, nombre: datos.nombre, descripcion: datos.descripcion },
      generarCodigo,
    )
    return reply.status(201).send(claseRespuestaSchema.parse({ clase }))
  })

  app.get("/clases/inscritas", protegido({ roles: ["estudiante"] }), async (request, reply) => {
    const { cursor, limite } = validarParametros(paginacionSchema, request.query)
    const perfil = perfilDe(request)
    const resultado = await listarClasesInscritas({ usuarioId: perfil.id, cursor, limite })
    return reply.send(listaClasesInscritasRespuestaSchema.parse(resultado))
  })

  app.get("/clases/impartidas", protegido({ roles: ["maestro"] }), async (request, reply) => {
    const { cursor, limite } = validarParametros(paginacionSchema, request.query)
    const perfil = perfilDe(request)
    const resultado = await listarClasesImpartidas({ maestroId: perfil.id, cursor, limite })
    return reply.send(listaClasesImpartidasRespuestaSchema.parse(resultado))
  })

  app.post("/clases/unirse", protegido({ roles: ["estudiante"] }), async (request, reply) => {
    const datos = validarCuerpo(unirseSchema, request.body)
    const perfil = perfilDe(request)
    const clase = await buscarClasePorCodigo(datos.codigo)
    if (clase === null) throw codigoInvalido()
    const { yaEstaba } = await inscribir({
      claseId: clase.id,
      usuarioId: perfil.id,
      origen: "codigo",
    })
    return reply.send(unirseRespuestaSchema.parse({ clase, yaEstabas: yaEstaba }))
  })

  app.get(
    "/clases/:claseId",
    protegido({ roles: ["estudiante", "maestro"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const clase = await leerClase(id)
      if (clase === null) throw sinAcceso()
      return reply.send(claseRespuestaSchema.parse({ clase }))
    },
  )

  app.put(
    "/clases/:claseId",
    protegido({ roles: ["maestro"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const datos = validarCuerpo(editarClaseSchema, conDescripcionNormalizada(request.body))
      const perfil = perfilDe(request)
      const clase = await editarClase({
        claseId: id,
        maestroId: perfil.id,
        nombre: datos.nombre,
        descripcion: datos.descripcion,
      })
      if (clase === null) throw sinAcceso()
      return reply.send(claseRespuestaSchema.parse({ clase }))
    },
  )

  app.get(
    "/clases/:claseId/codigo",
    protegido({ roles: ["maestro"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const perfil = perfilDe(request)
      const codigo = await leerCodigo({ claseId: id, maestroId: perfil.id })
      if (codigo === null) throw sinAcceso()
      reply.header("Cache-Control", "no-store")
      return reply.send(codigoClaseRespuestaSchema.parse({ codigo }))
    },
  )

  app.post(
    "/clases/:claseId/codigo",
    protegido({ roles: ["maestro"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const perfil = perfilDe(request)
      const codigo = await regenerarCodigo({ claseId: id, maestroId: perfil.id }, generarCodigo)
      if (codigo === null) throw sinAcceso()
      reply.header("Cache-Control", "no-store")
      return reply.send(codigoClaseRespuestaSchema.parse({ codigo }))
    },
  )
}
