import { createServer } from "node:http"
import type { AddressInfo } from "node:net"

import { describe, expect, it } from "vitest"

import { crearAlmacen } from "./index.js"

const opciones = {
  endPoint: "127.0.0.1",
  port: 9,
  useSSL: false,
  accessKey: "llave-de-prueba",
  secretKey: "secreto-de-prueba",
  region: "us-east-1",
  bucket: "campus-privado",
}

describe("crearAlmacen", () => {
  it("PR-D03a: con un endpoint inalcanzable, la URL de subida se firma sin red y lleva X-Amz-Expires=300", async () => {
    const almacen = crearAlmacen(opciones)

    const url = new URL(await almacen.urlDeSubida({ clave: "materiales/c/a", tipo: "image/png" }))

    expect(url.host).toBe("127.0.0.1:9")
    expect(url.pathname).toBe("/campus-privado/materiales/c/a")
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300")
    expect(url.searchParams.get("X-Amz-Signature")).not.toBeNull()
  })

  it("PR-D03b: la URL de descarga lleva response-content-disposition y response-content-type", async () => {
    const almacen = crearAlmacen(opciones)

    const url = new URL(
      await almacen.urlDeDescarga({
        clave: "materiales/c/a",
        tipo: "application/pdf",
        disposicion: "attachment; filename*=UTF-8''guia.pdf",
      }),
    )

    expect(url.searchParams.get("response-content-disposition")).toBe(
      "attachment; filename*=UTF-8''guia.pdf",
    )
    expect(url.searchParams.get("response-content-type")).toBe("application/pdf")
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300")
  })

  it("metadatosDe: un objeto ausente da null y un error del proveedor da 503 sin llaves ni URL", async () => {
    const servidor = createServer((peticion, respuesta) => {
      if (peticion.url?.endsWith("/ausente")) {
        respuesta.statusCode = 404
        respuesta.end()
        return
      }
      if (peticion.url?.endsWith("/presente")) {
        respuesta.setHeader("Content-Length", "42")
        respuesta.setHeader("Content-Type", "image/png")
        respuesta.setHeader("ETag", '"abc"')
        respuesta.setHeader("Last-Modified", new Date().toUTCString())
        respuesta.end()
        return
      }
      respuesta.statusCode = 500
      respuesta.end()
    })
    await new Promise<void>((resolver) => servidor.listen(0, "127.0.0.1", resolver))
    try {
      const { port } = servidor.address() as AddressInfo
      const almacen = crearAlmacen({ ...opciones, port })

      expect(await almacen.metadatosDe("materiales/c/ausente")).toBeNull()
      expect(await almacen.metadatosDe("materiales/c/presente")).toEqual({
        tamano: 42,
        tipo: "image/png",
      })
      const error = await almacen.metadatosDe("materiales/c/roto").catch((e: unknown) => e)
      expect(error).toMatchObject({ codigo: "ALMACEN_NO_DISPONIBLE", estado: 503 })
      const mensaje = (error as Error).message
      expect(mensaje).not.toContain("secreto-de-prueba")
      expect(mensaje).not.toContain("127.0.0.1")
    } finally {
      await new Promise<void>((resolver) => servidor.close(() => resolver()))
    }
  })
})
