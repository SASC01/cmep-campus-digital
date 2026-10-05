import { randomUUID } from "node:crypto"

import {
  archivoIdParamSchema,
  descargaRespuestaSchema,
  solicitarSubidaRespuestaSchema,
  solicitarSubidaSchema,
} from "@campus/shared"
import type { FastifyPluginAsync } from "fastify"

import { buscarArchivoConfirmado, registrarArchivoPendiente } from "../adapters/db/index.js"
import type { Almacen } from "../core/archivos/almacen.js"
import {
  almacenNoConfigurado,
  claveDeMaterial,
  disposicionDeContenido,
  validarArchivoDeclarado,
  VIGENCIA_URL_FIRMADA_S,
} from "../core/archivos/politica.js"
import { AppError } from "../core/errores.js"
import { claseDe, perfilDe, protegido } from "../middleware/index.js"
import { validarCuerpo, validarParametros } from "./validacion.js"

const archivoNoEncontrado = (): AppError =>
  new AppError("ARCHIVO_NO_ENCONTRADO", "Ese archivo ya no existe.", 404)

const expiraEn = (): string => new Date(Date.now() + VIGENCIA_URL_FIRMADA_S * 1000).toISOString()

// Rutas de CLASES-d (§D-D3). Los archivos nunca pasan por la API: aquí solo se firman URL del
// almacén y se guardan metadatos. Ningún handler verifica rol, propiedad o inscripción a mano.
export const archivosHandler: FastifyPluginAsync<{ almacen: Almacen | null }> = async (
  app,
  { almacen },
) => {
  app.post(
    "/clases/:claseId/archivos",
    protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const datos = validarCuerpo(solicitarSubidaSchema, request.body)
      const invalido = validarArchivoDeclarado(datos)
      if (invalido !== null) throw invalido
      if (almacen === null) throw almacenNoConfigurado()

      // El id nace aquí; el nombre del usuario nunca forma parte de la clave.
      const archivoId = randomUUID()
      const claveObjeto = claveDeMaterial(claseId, archivoId)
      // Primero se firma: si el almacén falla no queda una fila pendiente huérfana.
      const url = await almacen.urlDeSubida({ clave: claveObjeto, tipo: datos.tipo })
      await registrarArchivoPendiente({
        id: archivoId,
        claseId,
        subidoPor: perfilDe(request).id,
        nombre: datos.nombre,
        tipo: datos.tipo,
        tamano: datos.tamano,
        claveObjeto,
      })
      reply.header("Cache-Control", "no-store")
      return reply.status(201).send(
        solicitarSubidaRespuestaSchema.parse({
          archivo: { id: archivoId, nombre: datos.nombre, tipo: datos.tipo, tamano: datos.tamano },
          subida: {
            url,
            metodo: "PUT",
            cabeceras: { "Content-Type": datos.tipo },
            expiraEn: expiraEn(),
          },
        }),
      )
    },
  )

  app.post(
    "/clases/:claseId/archivos/:archivoId/descarga",
    protegido({ roles: ["estudiante", "maestro", "admin"], pertenencia: "inscripcion" }),
    async (request, reply) => {
      const { id: claseId } = claseDe(request)
      const { archivoId } = validarParametros(archivoIdParamSchema, request.params)
      if (almacen === null) throw almacenNoConfigurado()
      const archivo = await buscarArchivoConfirmado({ archivoId, claseId })
      if (archivo === null) throw archivoNoEncontrado()

      const url = await almacen.urlDeDescarga({
        clave: archivo.claveObjeto,
        tipo: archivo.tipo,
        disposicion: disposicionDeContenido(archivo.nombre, "attachment"),
      })
      reply.header("Cache-Control", "no-store")
      return reply.send(descargaRespuestaSchema.parse({ url, expiraEn: expiraEn() }))
    },
  )
}
