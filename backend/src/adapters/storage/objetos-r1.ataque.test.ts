import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { crearAlmacenDeObjetos } from "./index.js"

// Ataque del Tester, ADMIN-01b, ronda 1. ADM-1B15 prueba crearAlmacenDeObjetos con un cliente falso
// que devuelve la forma que declaran los tipos de minio ({ Error: { Code } }). Aquí se usa el cliente
// REAL de minio (el que construye crearAlmacenDeObjetos sin segundo argumento) contra un servidor S3
// falso en 127.0.0.1, dentro de la prueba: sin red ni proveedor. Lo que importa es lo que minio
// devuelve de verdad al leer la respuesta XML de DeleteObjects y de CopyObject.

interface Peticion {
  metodo: string
  url: string
  cabeceras: IncomingMessage["headers"]
  cuerpo: string
}

type Respuesta = { estado: number; cuerpo: string }

let servidor: Server | undefined
let puerto = 0
const peticiones: Peticion[] = []
let responder: (peticion: Peticion) => Respuesta = () => ({ estado: 200, cuerpo: "" })

const XML = '<?xml version="1.0" encoding="UTF-8"?>'
const NS = 'xmlns="http://s3.amazonaws.com/doc/2006-03-01/"'

const resultadoDeBorrado = (errores: { clave: string; codigo: string }[]): string =>
  `${XML}<DeleteResult ${NS}>${errores
    .map(
      ({ clave, codigo }) =>
        `<Error><Key>${clave}</Key><Code>${codigo}</Code><Message>${codigo}</Message></Error>`,
    )
    .join("")}</DeleteResult>`

const errorS3 = (codigo: string, clave: string): string =>
  `${XML}<Error><Code>${codigo}</Code><Message>${codigo}</Message><Key>${clave}</Key><RequestId>r1</RequestId></Error>`

const resultadoDeCopia = `${XML}<CopyObjectResult ${NS}><LastModified>2026-11-05T10:00:00.000Z</LastModified><ETag>"abc"</ETag></CopyObjectResult>`

beforeAll(async () => {
  servidor = createServer((req: IncomingMessage, res: ServerResponse) => {
    const partes: Buffer[] = []
    req.on("data", (parte: Buffer) => partes.push(parte))
    req.on("end", () => {
      const peticion: Peticion = {
        metodo: req.method ?? "",
        url: req.url ?? "",
        cabeceras: req.headers,
        cuerpo: Buffer.concat(partes).toString("utf8"),
      }
      peticiones.push(peticion)
      const { estado, cuerpo } = responder(peticion)
      res.writeHead(estado, { "content-type": "application/xml" })
      res.end(cuerpo)
    })
  })
  await new Promise<void>((listo) => servidor?.listen(0, "127.0.0.1", listo))
  puerto = (servidor.address() as AddressInfo).port
})

afterAll(async () => {
  await new Promise<void>((listo) => servidor?.close(() => listo()))
})

const almacen = () =>
  crearAlmacenDeObjetos({
    endPoint: "127.0.0.1",
    port: puerto,
    useSSL: false,
    accessKey: "llave-del-ataque",
    secretKey: "secreto-del-ataque",
    region: "us-east-1",
    bucket: "campus-privado",
  })

describe("ataque ADMIN-01b r1: crearAlmacenDeObjetos con el cliente real de minio", () => {
  it("ADM-T1B01: borrar con un DeleteObjects que responde 200 con un <Error> por clave (AccessDenied, InternalError) debe lanzar para que pg-boss reintente; NoSuchKey y la respuesta vacía no lanzan", async () => {
    peticiones.length = 0
    responder = () => ({ estado: 200, cuerpo: resultadoDeBorrado([]) })
    await expect(almacen().borrar(["materiales/c/1", "materiales/c/2"])).resolves.toBeUndefined()
    const [primera] = peticiones
    expect(primera?.metodo, "Precondición: minio pidió DeleteObjects").toBe("POST")
    expect(primera?.url).toMatch(/^\/campus-privado\/?\?delete/)
    expect(primera?.cuerpo).toContain("<Key>materiales/c/1</Key>")
    expect(primera?.cuerpo).toContain("<Key>materiales/c/2</Key>")

    responder = () => ({
      estado: 200,
      cuerpo: resultadoDeBorrado([{ clave: "materiales/c/2", codigo: "NoSuchKey" }]),
    })
    await expect(almacen().borrar(["materiales/c/1", "materiales/c/2"])).resolves.toBeUndefined()

    for (const codigo of ["AccessDenied", "InternalError"]) {
      responder = () => ({
        estado: 200,
        cuerpo: resultadoDeBorrado([{ clave: "materiales/c/2", codigo }]),
      })
      const resultado = await almacen()
        .borrar(["materiales/c/1", "materiales/c/2"])
        .then(
          () =>
            "resolvió sin error: la clave materiales/c/2 queda en el almacén y el trabajo se completa",
          (error: unknown) => error,
        )
      expect(resultado, codigo).toMatchObject({ codigo: "ALMACEN_NO_DISPONIBLE", estado: 503 })
    }
  })

  it("ADM-T1B01b (control): un DeleteObjects rechazado entero (403) lanza 503 sin repetir la llave ni el secreto", async () => {
    responder = () => ({ estado: 403, cuerpo: errorS3("AccessDenied", "") })
    const error = await almacen()
      .borrar(["materiales/c/1"])
      .then(
        () => null,
        (e: unknown) => e,
      )
    expect(error).toMatchObject({ codigo: "ALMACEN_NO_DISPONIBLE", estado: 503 })
    expect(JSON.stringify(error)).not.toContain("secreto-del-ataque")
    expect((error as Error).message).not.toContain("llave-del-ataque")
  })

  it("ADM-T1B02: copiar manda PUT al destino con x-amz-copy-source del bucket privado; 200 → copiado; 404 NoSuchKey → origen_inexistente; 200 con <Error> en el cuerpo (S3 lo hace en una copia) → lanza, nunca copiado", async () => {
    peticiones.length = 0
    responder = () => ({ estado: 200, cuerpo: resultadoDeCopia })
    expect(await almacen().copiar("materiales/a/1", "materiales/b/2")).toBe("copiado")
    const [copia] = peticiones
    expect(copia?.metodo).toBe("PUT")
    expect(copia?.url).toBe("/campus-privado/materiales/b/2")
    expect(copia?.cabeceras["x-amz-copy-source"]).toBe("/campus-privado/materiales/a/1")

    responder = () => ({ estado: 404, cuerpo: errorS3("NoSuchKey", "materiales/a/1") })
    expect(await almacen().copiar("materiales/a/1", "materiales/b/2")).toBe("origen_inexistente")

    responder = () => ({ estado: 200, cuerpo: errorS3("InternalError", "materiales/b/2") })
    const resultado = await almacen()
      .copiar("materiales/a/1", "materiales/b/2")
      .then(
        (r) => r,
        (e: unknown) => e,
      )
    expect(resultado).toMatchObject({ codigo: "ALMACEN_NO_DISPONIBLE", estado: 503 })
  })
})
