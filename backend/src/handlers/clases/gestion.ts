import {
  asignarMaestroSchema,
  busquedaCandidatosSchema,
  candidatosMaestroRespuestaSchema,
  claseRespuestaSchema,
  crearClaseAdminSchema,
  editarClaseSchema,
  listaClasesAdminRespuestaSchema,
  maestroIdParamSchema,
  maestrosDeClaseRespuestaSchema,
  paginacionSchema,
} from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"

import {
  asignarMaestro,
  buscarMaestrosCandidatos,
  crearClaseAdministrada,
  editarClase,
  listarClasesAdmin,
  retirarMaestro,
} from "../../adapters/db/index.js"
import { prepararTerminoDeBusqueda } from "../../core/clases/busqueda.js"
import { conTextosNormalizados } from "../../core/clases/texto.js"
import { AppError } from "../../core/errores.js"
import { claseDe, protegido } from "../../middleware/index.js"
import { validarCuerpo, validarParametros } from "../validacion.js"
import { conMaestroPrincipal, generarCodigo } from "./clases.js"

const sinAcceso = (): AppError =>
  new AppError("SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.", 403)

const maestroNoEncontrado = (): AppError =>
  new AppError("MAESTRO_NO_ENCONTRADO", "No encontramos a ese maestro.", 404)

// Rutas de gestión de clases del administrador (CLASES-02, §D-2A3). Ningún handler verifica rol ni
// pertenencia a mano: todo pasa por protegido(); las rutas con :claseId llevan el sexto paso, que
// resuelve que la clase existe y deja pasar al admin porque `roles` lo nombra.
export const gestionDeClasesHandler: FastifyPluginAsync = async (app) => {
  app.get("/admin/clases", protegido({ roles: ["admin"] }), async (request, reply) => {
    const { cursor, limite } = validarParametros(paginacionSchema, request.query)
    const resultado = await listarClasesAdmin({ cursor, limite })
    return reply.send(
      listaClasesAdminRespuestaSchema.parse({
        ...resultado,
        clases: resultado.clases.map((clase) => ({
          ...clase,
          creadoEn: clase.creadoEn.toISOString(),
        })),
      }),
    )
  })

  app.post("/admin/clases", protegido({ roles: ["admin"] }), async (request, reply) => {
    const datos = validarCuerpo(
      crearClaseAdminSchema,
      conTextosNormalizados(request.body, ["descripcion"]),
    )
    const clase = await crearClaseAdministrada(
      { nombre: datos.nombre, descripcion: datos.descripcion, maestroIds: datos.maestroIds },
      generarCodigo,
    )
    if (clase === null) throw maestroNoEncontrado()
    return reply.status(201).send(claseRespuestaSchema.parse({ clase: conMaestroPrincipal(clase) }))
  })

  app.put(
    "/admin/clases/:claseId",
    protegido({ roles: ["admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const datos = validarCuerpo(
        editarClaseSchema,
        conTextosNormalizados(request.body, ["descripcion"]),
      )
      const clase = await editarClase({
        claseId: id,
        nombre: datos.nombre,
        descripcion: datos.descripcion,
      })
      if (clase === null) throw sinAcceso()
      return reply.send(claseRespuestaSchema.parse({ clase: conMaestroPrincipal(clase) }))
    },
  )

  app.post(
    "/admin/clases/:claseId/maestros",
    protegido({ roles: ["admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const { maestroId } = validarCuerpo(asignarMaestroSchema, request.body)
      const resultado = await asignarMaestro({ claseId: id, maestroId })
      if (resultado === null) throw maestroNoEncontrado()
      return reply.send(maestrosDeClaseRespuestaSchema.parse(resultado))
    },
  )

  app.delete(
    "/admin/clases/:claseId/maestros/:maestroId",
    protegido({ roles: ["admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const { maestroId } = validarParametros(maestroIdParamSchema, request.params)
      const resultado = await retirarMaestro({ claseId: id, maestroId })
      return reply.send(maestrosDeClaseRespuestaSchema.parse(resultado))
    },
  )

  app.get("/admin/maestros/candidatos", protegido({ roles: ["admin"] }), async (request, reply) => {
    const { q, limite } = validarParametros(busquedaCandidatosSchema, request.query)
    const termino = prepararTerminoDeBusqueda(q)
    if (termino === null) {
      throw new AppError(
        "BUSQUEDA_MUY_CORTA",
        "Escribe al menos 3 letras para buscar un maestro.",
        400,
      )
    }
    const resultado = await buscarMaestrosCandidatos({ termino, limite })
    return reply.send(candidatosMaestroRespuestaSchema.parse(resultado))
  })
}
