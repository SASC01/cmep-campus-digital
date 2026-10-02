import { describe, expect, it } from "vitest"

import { opcionesDeAlmacen } from "./almacen.js"
import { validarEnv } from "./env.js"

const base = {
  DATABASE_URL: "postgresql://usuario:clave-de-prueba@127.0.0.1:5433/base?schema=public",
  JWT_SECRET: "secreto-de-prueba-con-mas-de-treinta-y-dos-caracteres",
}

const envCon = (extra: Record<string, string>) => {
  const resultado = validarEnv({ ...base, ...extra })
  if (!resultado.ok)
    throw new Error(`La configuración de prueba es inválida: ${resultado.errores.join(" | ")}`)
  return resultado.env
}

describe("opcionesDeAlmacen", () => {
  it("PR-D02d: http da useSSL false con su puerto; https da true y el puerto 443", () => {
    const http = opcionesDeAlmacen(
      envCon({
        STORAGE_ENDPOINT: "http://127.0.0.1:9000",
        STORAGE_ACCESS_KEY: "llave",
        STORAGE_SECRET_KEY: "secreto",
      }),
    )
    expect(http).toEqual({
      endPoint: "127.0.0.1",
      port: 9000,
      useSSL: false,
      accessKey: "llave",
      secretKey: "secreto",
      region: "us-east-1",
      bucket: "campus-privado",
    })

    const https = opcionesDeAlmacen(
      envCon({
        STORAGE_ENDPOINT: "https://cuenta.r2.cloudflarestorage.com",
        STORAGE_ACCESS_KEY: "llave",
        STORAGE_SECRET_KEY: "secreto",
        STORAGE_REGION: "auto",
        STORAGE_BUCKET_PRIVADO: "bucket-propio",
      }),
    )
    expect(https).toMatchObject({
      endPoint: "cuenta.r2.cloudflarestorage.com",
      port: 443,
      useSSL: true,
      region: "auto",
      bucket: "bucket-propio",
    })

    const httpSinPuerto = opcionesDeAlmacen(
      envCon({
        STORAGE_ENDPOINT: "http://almacen.interno",
        STORAGE_ACCESS_KEY: "llave",
        STORAGE_SECRET_KEY: "secreto",
      }),
    )
    expect(httpSinPuerto).toMatchObject({ port: 80, useSSL: false })
  })

  it("sin las variables del almacén, opcionesDeAlmacen devuelve null", () => {
    expect(opcionesDeAlmacen(envCon({}))).toBeNull()
  })
})
