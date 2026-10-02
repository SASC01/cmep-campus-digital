import type { Env } from "./env.js"

export interface OpcionesAlmacen {
  endPoint: string
  port: number
  useSSL: boolean
  accessKey: string
  secretKey: string
  region: string
  bucket: string
}

// Único puente entre las variables STORAGE_* y adapters/storage: adapters/ no lee process.env.
// Sin las tres variables obligatorias el almacén no existe (null) y subir o descargar responde 503.
export const opcionesDeAlmacen = (env: Env): OpcionesAlmacen | null => {
  if (
    env.STORAGE_ENDPOINT === undefined ||
    env.STORAGE_ACCESS_KEY === undefined ||
    env.STORAGE_SECRET_KEY === undefined
  ) {
    return null
  }
  const url = new URL(env.STORAGE_ENDPOINT)
  const useSSL = url.protocol === "https:"
  // URL.port es "" cuando es el puerto por defecto del protocolo.
  const puertoPorDefecto = useSSL ? 443 : 80
  const puerto = url.port === "" ? puertoPorDefecto : Number(url.port)
  return {
    endPoint: url.hostname,
    port: puerto,
    useSSL,
    accessKey: env.STORAGE_ACCESS_KEY,
    secretKey: env.STORAGE_SECRET_KEY,
    region: env.STORAGE_REGION,
    bucket: env.STORAGE_BUCKET_PRIVADO,
  }
}
