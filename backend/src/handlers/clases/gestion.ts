import { randomUUID } from "node:crypto"

import {
  asignarMaestroSchema,
  busquedaCandidatosSchema,
  candidatosMaestroRespuestaSchema,
  claseRespuestaSchema,
  confirmarBorradoClaseSchema,
  CONFIRMAR_BORRADO_DE_CLASE,
  conteoDeBorradoRespuestaSchema,
  crearClaseAdminSchema,
  duplicarClaseSchema,
  editarClaseSchema,
  listaClasesAdminConsultaSchema,
  listaClasesAdminRespuestaSchema,
  maestroIdParamSchema,
  maestrosDeClaseRespuestaSchema,
} from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"

import {
  archivarClase,
  asignarMaestro,
  borrarClaseDefinitivamente,
  buscarMaestrosCandidatos,
  contarParaBorrar,
  crearClaseAdministrada,
  duplicarClase,
  editarClase,
  listarClasesAdmin,
  restaurarClase,
  retirarMaestro,
} from "../../adapters/db/index.js"
import { cancelarVarios, encolarVarios } from "../../adapters/queue/index.js"
import { partirEnLotes } from "../../core/clases/borrado.js"
import { prepararTerminoDeBusqueda } from "../../core/clases/busqueda.js"
import { conTextosNormalizados } from "../../core/clases/texto.js"
import { AppError } from "../../core/errores.js"
import {
  COLA_BORRAR_OBJETOS,
  COLA_COPIAR_OBJETOS,
  MAXIMO_CLAVES_POR_TRABAJO,
  MAXIMO_COPIAS_POR_TRABAJO,
  RETRASO_BORRADO_DE_OBJETOS_MS,
} from "../../core/eventos/objetos.js"
import { COLA_RECORDATORIO_24H } from "../../core/eventos/avisos-de-clase.js"
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
    const { cursor, cursorArchivadaEn, limite, estado } = validarParametros(
      listaClasesAdminConsultaSchema,
      request.query,
    )
    const resultado = await listarClasesAdmin({ cursor, cursorArchivadaEn, limite, estado })
    return reply.send(
      listaClasesAdminRespuestaSchema.parse({
        ...resultado,
        clases: resultado.clases.map((clase) => ({
          ...clase,
          creadoEn: clase.creadoEn.toISOString(),
          archivadaEn: clase.archivadaEn === null ? null : clase.archivadaEn.toISOString(),
        })),
        siguienteCursorArchivadaEn: resultado.siguienteCursorArchivadaEn?.toISOString() ?? null,
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

  // ADMIN-01a (§D-2, S-01): archivar y restaurar. El estado de la clase lo deciden core/ y el
  // adaptador dentro de su transacción (409 CLASE_YA_ARCHIVADA o CLASE_NO_ARCHIVADA, sin escribir).
  app.post(
    "/admin/clases/:claseId/archivar",
    protegido({ roles: ["admin"], pertenencia: "propiedad", enClaseArchivada: "gestion" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const clase = await archivarClase(id)
      return reply.send(claseRespuestaSchema.parse({ clase: conMaestroPrincipal(clase) }))
    },
  )

  app.post(
    "/admin/clases/:claseId/restaurar",
    protegido({ roles: ["admin"], pertenencia: "propiedad", enClaseArchivada: "gestion" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const clase = await restaurarClase(id)
      return reply.send(claseRespuestaSchema.parse({ clase: conMaestroPrincipal(clase) }))
    },
  )

  // ADMIN-01b (§D-4, DH-04 a): el conteo para el diálogo y el borrado definitivo de una archivada.
  // El estado de la clase, las copias en curso y la confirmación los deciden core/ y el adaptador
  // dentro de su transacción; los objetos del almacén se borran por la cola, diferidos (N-09).
  app.get(
    "/admin/clases/:claseId/conteo-de-borrado",
    protegido({ roles: ["admin"], pertenencia: "propiedad", enClaseArchivada: "gestion" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const conteo = await contarParaBorrar(id)
      return reply.send(conteoDeBorradoRespuestaSchema.parse(conteo))
    },
  )

  app.delete(
    "/admin/clases/:claseId",
    protegido({ roles: ["admin"], pertenencia: "propiedad", enClaseArchivada: "gestion" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const { confirmar } = validarParametros(confirmarBorradoClaseSchema, request.query)
      await borrarClaseDefinitivamente({
        claseId: id,
        confirmado: confirmar === CONFIRMAR_BORRADO_DE_CLASE,
        cancelarRecordatorios: (sql, trabajoIds) =>
          cancelarVarios(COLA_RECORDATORIO_24H, trabajoIds, { sql }),
        encolarBorrados: (sql, claves) => {
          const inicio = new Date(Date.now() + RETRASO_BORRADO_DE_OBJETOS_MS)
          return encolarVarios(
            COLA_BORRAR_OBJETOS,
            partirEnLotes(claves, MAXIMO_CLAVES_POR_TRABAJO).map((lote) => ({
              id: randomUUID(),
              datos: { claves: lote },
              inicio,
            })),
            { sql },
          )
        },
      })
      return reply.status(204).send()
    },
  )

  // ADMIN-01b (§D-5, DH-03 a): también desde una archivada; la copia nace activa. Los objetos de sus
  // archivos los copia el worker (COPIAR_OBJETOS), en lotes de hasta 100.
  app.post(
    "/admin/clases/:claseId/duplicar",
    protegido({ roles: ["admin"], pertenencia: "propiedad", enClaseArchivada: "gestion" }),
    async (request, reply) => {
      const { id } = claseDe(request)
      const datos = validarCuerpo(duplicarClaseSchema, request.body)
      const clase = await duplicarClase({
        claseId: id,
        nombre: datos.nombre,
        maestroIds: datos.maestroIds,
        generarCodigo,
        encolarCopias: (sql, archivoIds) =>
          encolarVarios(
            COLA_COPIAR_OBJETOS,
            partirEnLotes(archivoIds, MAXIMO_COPIAS_POR_TRABAJO).map((lote) => ({
              id: randomUUID(),
              datos: { archivoIds: lote },
            })),
            { sql },
          ),
      })
      if (clase === null) throw maestroNoEncontrado()
      return reply
        .status(201)
        .send(claseRespuestaSchema.parse({ clase: conMaestroPrincipal(clase) }))
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
