import { Client } from "minio"

import type { OpcionesAlmacen } from "../../config/almacen.js"
import type { Almacen } from "../../core/archivos/almacen.js"
import type { AlmacenDeObjetos } from "../../core/archivos/objetos.js"
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

// ADMIN-01b (§D-6). Lo mínimo del cliente de minio que usan la copia y el borrado; las pruebas pasan
// un cliente falso con esta forma. removeObjects devuelve `unknown[]` a propósito: minio 8.0.7 declara
// `{ Error: { Code } }`, pero en ejecución su parser entrega cada error de DeleteObjects como
// `{ Key, Code, Message }` (T-01 de la ronda 1 de 01b); el adaptador lee las dos formas.
export interface ClienteDeObjetos {
  copyObject(destinoBucket: string, destino: string, origenConBucket: string): Promise<unknown>
  removeObjects(bucket: string, claves: string[]): Promise<unknown[]>
}

// El código de un elemento de la respuesta de DeleteObjects: null si no es un error. Con `Quiet`,
// la respuesta solo trae errores, así que un objeto sin código reconocible también cuenta como
// error (código vacío), nunca como éxito.
const codigoDeErrorDeBorrado = (resultado: unknown): string | null => {
  if (typeof resultado !== "object" || resultado === null) return null
  const { Code, Error: envuelto } = resultado as { Code?: unknown; Error?: unknown }
  if (typeof Code === "string") return Code
  if (typeof envuelto === "object" && envuelto !== null) {
    const codigo = (envuelto as { Code?: unknown }).Code
    return typeof codigo === "string" ? codigo : ""
  }
  return ""
}

const clienteDeMinio = (opciones: OpcionesAlmacen): ClienteDeObjetos => {
  const cliente = new Client({
    endPoint: opciones.endPoint,
    port: opciones.port,
    useSSL: opciones.useSSL,
    accessKey: opciones.accessKey,
    secretKey: opciones.secretKey,
    region: opciones.region,
  })
  return {
    copyObject: (destinoBucket, destino, origenConBucket) =>
      cliente.copyObject(destinoBucket, destino, origenConBucket),
    removeObjects: (bucket, claves) => cliente.removeObjects(bucket, claves),
  }
}

// La copia y el borrado ocurren del lado del almacén (CopyObject y DeleteObjects del protocolo S3,
// que MinIO y R2 admiten): ningún objeto pasa por Node. Un fallo del proveedor se traduce a AppError
// sin repetir la URL, las llaves ni el mensaje original; el worker lo deja propagar y pg-boss
// reintenta. Borrar una clave que no existe no es un error en S3.
export const crearAlmacenDeObjetos = (
  opciones: OpcionesAlmacen,
  cliente: ClienteDeObjetos = clienteDeMinio(opciones),
): AlmacenDeObjetos => ({
  copiar: async (origen, destino) => {
    try {
      await cliente.copyObject(opciones.bucket, destino, `/${opciones.bucket}/${origen}`)
      return "copiado"
    } catch (error) {
      if (esObjetoAusente(error)) return "origen_inexistente"
      throw almacenNoDisponible()
    }
  },

  borrar: async (claves) => {
    if (claves.length === 0) return
    let resultados: unknown[]
    try {
      resultados = await cliente.removeObjects(opciones.bucket, [...claves])
    } catch {
      throw almacenNoDisponible()
    }
    // Un error por clave lanza el 503 para que pg-boss reintente el lote completo (borrar otra vez lo
    // ya borrado no falla). La clave que ya no existe (NoSuchKey o NotFound, si el almacén la
    // reporta) no es error: el borrado es idempotente.
    const fallidos = resultados
      .map(codigoDeErrorDeBorrado)
      .filter((codigo) => codigo !== null && !CODIGOS_DE_OBJETO_AUSENTE.has(codigo))
    if (fallidos.length > 0) throw almacenNoDisponible()
  },
})
