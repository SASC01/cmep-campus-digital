import {
  agregarAlumnoRespuestaSchema,
  agregarAlumnoSchema,
  alumnoIdParamSchema,
  busquedaCandidatosSchema,
  candidatosRespuestaSchema,
  listaAlumnosRespuestaSchema,
  paginacionRosterSchema,
  personasRespuestaSchema,
} from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"

import {
  agregarAlumnoManual,
  buscarCandidatos,
  listarAlumnosDeClase,
  listarPersonas,
  quitarAlumno,
} from "../../adapters/db/index.js"
import { enmascararCorreo, prepararTerminoDeBusqueda } from "../../core/clases/busqueda.js"
import { AppError } from "../../core/errores.js"
import { claseDe, perfilDe, protegido } from "../../middleware/index.js"
import { validarCuerpo, validarParametros } from "../validacion.js"

const sinAcceso = (): AppError =>
  new AppError("SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.", 403)

// Rutas de CLASES-b (§D-B1). Ningún handler verifica rol, propiedad o inscripción a mano: todo pasa
// por protegido() y por claseDe(request) (sexto paso).
export const alumnosHandler: FastifyPluginAsync = async (app) => {
  app.get(
    "/clases/:claseId/personas",
    protegido({ roles: ["estudiante", "maestro"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const { cursor, limite } = validarParametros(paginacionRosterSchema, request.query)
      const personas = await listarPersonas({ claseId: id, cursor, limite })
      if (personas === null) throw sinAcceso()
      return reply.send(personasRespuestaSchema.parse(personas))
    },
  )

  // Único lugar donde salen el correo completo, el estado de pago y la restricción (RN-02).
  app.get(
    "/clases/:claseId/alumnos",
    protegido({ roles: ["maestro"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const { cursor, limite } = validarParametros(paginacionRosterSchema, request.query)
      const lista = await listarAlumnosDeClase({ claseId: id, cursor, limite })
      return reply.send(
        listaAlumnosRespuestaSchema.parse({
          ...lista,
          alumnos: lista.alumnos.map((alumno) => ({
            ...alumno,
            inscritoEn: alumno.inscritoEn.toISOString(),
          })),
        }),
      )
    },
  )

  app.get(
    "/clases/:claseId/alumnos/candidatos",
    protegido({ roles: ["maestro"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const { q, limite } = validarParametros(busquedaCandidatosSchema, request.query)
      const termino = prepararTerminoDeBusqueda(q)
      if (termino === null) {
        throw new AppError(
          "BUSQUEDA_MUY_CORTA",
          "Escribe al menos 3 letras para buscar un alumno.",
          400,
        )
      }
      const { candidatos, hayMas } = await buscarCandidatos({ claseId: id, termino, limite })
      // El correo completo nunca sale de aquí (P-05 f): solo el enmascarado.
      return reply.send(
        candidatosRespuestaSchema.parse({
          candidatos: candidatos.map(({ email, ...candidato }) => ({
            ...candidato,
            correoEnmascarado: enmascararCorreo(email),
          })),
          hayMas,
        }),
      )
    },
  )

  app.post(
    "/clases/:claseId/alumnos",
    protegido({ roles: ["maestro"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const { alumnoId } = validarCuerpo(agregarAlumnoSchema, request.body)
      const perfil = perfilDe(request)
      const resultado = await agregarAlumnoManual({
        claseId: id,
        alumnoId,
        maestroId: perfil.id,
      })
      if (resultado === null) {
        throw new AppError("ALUMNO_NO_ENCONTRADO", "No encontramos a ese alumno.", 404)
      }
      return reply.send(agregarAlumnoRespuestaSchema.parse(resultado))
    },
  )

  app.delete(
    "/clases/:claseId/alumnos/:alumnoId",
    protegido({ roles: ["maestro"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const { alumnoId } = validarParametros(alumnoIdParamSchema, request.params)
      const perfil = perfilDe(request)
      await quitarAlumno({ claseId: id, alumnoId, maestroId: perfil.id })
      return reply.status(204).send()
    },
  )
}
