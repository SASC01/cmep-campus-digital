import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { crearAlmacenDeObjetos } from "./index.js"

// Ataque del Tester, ADMIN-01b, ronda 2: T-01 a fondo. Cliente REAL de minio contra un servidor S3
// falso dentro de la prueba (node:http en 127.0.0.1, puerto efímero), sin red ni proveedor, como
// ADM-T1B01. Lo que se mira es lo que minio entrega de verdad al leer el XML de DeleteObjects.

interface Peticion {
  metodo: string
  url: string
  cuerpo: string
}

let servidor: Server | undefined
let puerto = 0
const peticiones: Peticion[] = []
let responder: (peticion: Peticion) => { estado: number; cuerpo: string } = () => ({
  estado: 200,
  cuerpo: "",
})

const XML = '<?xml version="1.0" encoding="UTF-8"?>'
const NS = 'xmlns="http://s3.amazonaws.com/doc/2006-03-01/"'
const errorDeClave = (clave: string, codigo: string): string =>
  `<Error><Key>${clave}</Key><Code>${codigo}</Code><Message>${codigo}</Message></Error>`
const borradaDeClave = (clave: string): string => `<Deleted><Key>${clave}</Key></Deleted>`
const resultado = (partes: string[]): string =>
  `${XML}<DeleteResult ${NS}>${partes.join("")}</DeleteResult>`

beforeAll(async () => {
  servidor = createServer((req: IncomingMessage, res: ServerResponse) => {
    const partes: Buffer[] = []
    req.on("data", (parte: Buffer) => partes.push(parte))
    req.on("end", () => {
      const peticion = {
        metodo: req.method ?? "",
        url: req.url ?? "",
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
    accessKey: "llave-del-ataque-r2",
    secretKey: "secreto-del-ataque-r2",
    region: "us-east-1",
    bucket: "campus-privado",
  })

const intentar = (claves: string[]) =>
  almacen()
    .borrar(claves)
    .then(
      () => "resolvió",
      (error: unknown) => error,
    )

const clavesEn = (cuerpo: string): string[] =>
  [...cuerpo.matchAll(/<Key>([^<]*)<\/Key>/g)].map((m) => m[1] ?? "")

describe("ataque ADMIN-01b r2: T-01 a fondo con el cliente real de minio", () => {
  it("ADM-T2B01: claves que existen mezcladas con ausentes. Un servidor que ignora Quiet y devuelve <Deleted> por cada borrada, más NoSuchKey o NotFound por las ausentes → resuelve; si junto a ellas hay un AccessDenied, un SlowDown, un código numérico o un <Error> sin <Code> → 503 sin la llave ni el secreto", async () => {
    const claves = [
      "materiales/c/existe-1",
      "materiales/c/ausente",
      "materiales/c/existe-2",
      "entregas/t/a/ausente-2",
    ]
    const base = [
      borradaDeClave(claves[0] ?? ""),
      errorDeClave(claves[1] ?? "", "NoSuchKey"),
      borradaDeClave(claves[2] ?? ""),
      errorDeClave(claves[3] ?? "", "NotFound"),
    ]
    responder = () => ({ estado: 200, cuerpo: resultado(base) })
    expect(await intentar(claves)).toBe("resolvió")

    const extras: [string, string][] = [
      ["AccessDenied", errorDeClave(claves[2] ?? "", "AccessDenied")],
      ["SlowDown", errorDeClave(claves[0] ?? "", "SlowDown")],
      ["numérico", errorDeClave(claves[0] ?? "", "500")],
      ["sin Code", `<Error><Key>${claves[0] ?? ""}</Key><Message>x</Message></Error>`],
    ]
    for (const [nombre, extra] of extras) {
      responder = () => ({ estado: 200, cuerpo: resultado([...base, extra]) })
      const r = await intentar(claves)
      expect(r, nombre).toMatchObject({ codigo: "ALMACEN_NO_DISPONIBLE", estado: 503 })
      expect(JSON.stringify(r), nombre).not.toContain("secreto-del-ataque-r2")
      expect((r as Error).message, nombre).not.toContain("llave-del-ataque-r2")
      expect((r as Error).message, nombre).not.toContain("materiales/c/")
    }
  })

  it("ADM-T2B02: un lote de 1000 claves (el máximo del esquema de BORRAR_OBJETOS) sale en una sola llamada DeleteObjects con las 1000 claves, en orden y sin repetir; un error en la última clave del lote lanza", async () => {
    const claves = Array.from(
      { length: 1000 },
      (_, i) => `materiales/c/${String(i).padStart(4, "0")}`,
    )
    peticiones.length = 0
    responder = () => ({ estado: 200, cuerpo: resultado([]) })
    expect(await intentar(claves)).toBe("resolvió")
    const borrados = peticiones.filter((p) => p.metodo === "POST")
    expect(borrados, "una sola llamada").toHaveLength(1)
    expect(clavesEn(borrados[0]?.cuerpo ?? "")).toEqual(claves)
    expect(borrados[0]?.cuerpo).toContain("<Quiet>true</Quiet>")

    responder = () => ({
      estado: 200,
      cuerpo: resultado([errorDeClave(claves[999] ?? "", "InternalError")]),
    })
    expect(await intentar(claves)).toMatchObject({ codigo: "ALMACEN_NO_DISPONIBLE", estado: 503 })
  })

  it("ADM-T2B03: el reintento después de un 503 por clave pide otra vez el lote completo; si el almacén ya borró las demás (no las reporta, o reporta NoSuchKey) y la que falló ahora se borra, resuelve", async () => {
    const claves = ["materiales/c/r1", "materiales/c/r2", "materiales/c/r3"]
    let llamada = 0
    peticiones.length = 0
    responder = () => {
      llamada += 1
      if (llamada === 1)
        return {
          estado: 200,
          cuerpo: resultado([errorDeClave("materiales/c/r2", "InternalError")]),
        }
      return {
        estado: 200,
        cuerpo: resultado([
          errorDeClave("materiales/c/r1", "NoSuchKey"),
          errorDeClave("materiales/c/r3", "NoSuchKey"),
        ]),
      }
    }
    expect(await intentar(claves)).toMatchObject({ codigo: "ALMACEN_NO_DISPONIBLE", estado: 503 })
    expect(await intentar(claves)).toBe("resolvió")
    const borrados = peticiones.filter((p) => p.metodo === "POST")
    expect(borrados.map((p) => clavesEn(p.cuerpo))).toEqual([claves, claves])
  })
})
