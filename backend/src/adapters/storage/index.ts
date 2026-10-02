import { Client } from "minio"

import type { OpcionesAlmacen } from "../../config/almacen.js"
import type { Almacen } from "../../core/archivos/almacen.js"
import { VIGENCIA_URL_FIRMADA_S } from "../../core/archivos/politica.js"
import { AppError } from "../../core/errores.js"

// Único importador de minio del proyecto (regla 1). Habla S3, así que sirve igual contra MinIO en
// desarrollo y contra R2 en production.
//
// Con la región fija, minio no pregunta al almacén dónde vive el bucket: firmar una URL es un
// cálculo local y no abre ninguna conexión (R-18, PA-14).
const CODIGOS_DE_OBJETO_AUSENTE = new Set(["NotFound", "NoSuchKey"])

const almacenNoDisponible = (): AppError =>
  new AppError(
    "ALMACEN_NO_DISPONIBLE",
    "Los archivos no están disponibles en este momento. Inténtalo más tarde.",
    503,
  )

const esObjetoAusente = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false
  const codigo = (error as { code?: unknown }).code
  return typeof codigo === "string" && CODIGOS_DE_OBJETO_AUSENTE.has(codigo)
}

const tipoDeContenido = (metaData: Record<string, unknown>): string => {
  const clave = Object.keys(metaData).find((nombre) => nombre.toLowerCase() === "content-type")
  const valor = clave === undefined ? undefined : metaData[clave]
  return typeof valor === "string" ? valor : ""
}

export const crearAlmacen = (opciones: OpcionesAlmacen): Almacen => {
  const cliente = new Client({
    endPoint: opciones.endPoint,
    port: opciones.port,
    useSSL: opciones.useSSL,
    accessKey: opciones.accessKey,
    secretKey: opciones.secretKey,
    region: opciones.region,
  })

  // Un fallo del proveedor se traduce a AppError sin repetir la URL, las llaves ni el mensaje
  // original (que puede traerlas).
  const firmar = async (operacion: () => Promise<string>): Promise<string> => {
    try {
      return await operacion()
    } catch {
      throw almacenNoDisponible()
    }
  }

  return {
    urlDeSubida: ({ clave }) =>
      firmar(() => cliente.presignedPutObject(opciones.bucket, clave, VIGENCIA_URL_FIRMADA_S)),

    urlDeDescarga: ({ clave, tipo, disposicion }) =>
      firmar(() =>
        cliente.presignedGetObject(opciones.bucket, clave, VIGENCIA_URL_FIRMADA_S, {
          "response-content-type": tipo,
          "response-content-disposition": disposicion,
        }),
      ),

    metadatosDe: async (clave) => {
      try {
        const estado = await cliente.statObject(opciones.bucket, clave)
        return { tamano: estado.size, tipo: tipoDeContenido(estado.metaData) }
      } catch (error) {
        if (esObjetoAusente(error)) return null
        throw almacenNoDisponible()
      }
    },
  }
}
