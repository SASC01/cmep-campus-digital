import { randomUUID } from "node:crypto"
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"

import { pino } from "pino"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  cerrarConexion,
  ejecutorSqlDe,
  enTransaccion,
  inicializarDb,
  obtenerDb,
} from "../src/adapters/db/cliente.js"
import { asegurarCola, detenerCola, encolar, iniciarCola } from "../src/adapters/queue/index.js"
import { crearAlmacenDeObjetos } from "../src/adapters/storage/index.js"
import { opcionesDeCola } from "../src/config/cola.js"
import { cargarEnv } from "../src/config/env.js"
import { registrarConsumidoresDeObjetos } from "../src/workers/objetos.js"

// Ataque del Tester, ADMIN-01b, ronda 2 (T-01 a fondo): el reintento de pg-boss después de un 503 por
// clave, de punta a punta. Un trabajo de borrado en una cola PROPIA de este archivo (N-29: nunca
// BORRAR_OBJETOS ni COPIAR_OBJETOS), su consumidor real (registrarConsumidoresDeObjetos con las colas
// como parámetro) y el cliente real de minio contra un servidor S3 falso local (127.0.0.1). La
// primera llamada devuelve un <Error> por una clave; la segunda, nada. Sin retenciones de bloqueos.

const COLAS = {
  copiar: "ATAQUE_T2B_COPIAR_OBJETOS",
  borrar: "ATAQUE_T2B_BORRAR_OBJETOS",
  copiarFallidos: "ATAQUE_T2B_COPIAR_OBJETOS_FALLIDO",
}
const BORRAR_FALLIDOS = "ATAQUE_T2B_BORRAR_OBJETOS_FALLIDO"

let servidor: Server | undefined
const cuerpos: string[] = []
let llamadas = 0

const XML = '<?xml version="1.0" encoding="UTF-8"?>'
const NS = 'xmlns="http://s3.amazonaws.com/doc/2006-03-01/"'

const registros: { nivel: string; obj: unknown }[] = []
const log = {
  info: (obj: unknown) => registros.push({ nivel: "info", obj }),
  warn: (obj: unknown) => registros.push({ nivel: "warn", obj }),
  error: (obj: unknown) => registros.push({ nivel: "error", obj }),
}

type PoliticaConFallidos = NonNullable<Parameters<typeof asegurarCola>[1]> & { deadLetter: string }

beforeAll(async () => {
  servidor = createServer((req: IncomingMessage, res: ServerResponse) => {
    const partes: Buffer[] = []
    req.on("data", (parte: Buffer) => partes.push(parte))
    req.on("end", () => {
      llamadas += 1
      cuerpos.push(Buffer.concat(partes).toString("utf8"))
      const error =
        llamadas === 1
          ? "<Error><Key>materiales/c/falla</Key><Code>InternalError</Code><Message>x</Message></Error>"
          : ""
      res.writeHead(200, { "content-type": "application/xml" })
      res.end(`${XML}<DeleteResult ${NS}>${error}</DeleteResult>`)
    })
  })
  await new Promise<void>((listo) => servidor?.listen(0, "127.0.0.1", listo))
  const puerto = (servidor.address() as AddressInfo).port

  const env = cargarEnv()
  inicializarDb({ connectionString: env.DATABASE_URL })
  await iniciarCola({ ...opcionesDeCola(env, "worker"), log: pino({ level: "silent" }) })
  await asegurarCola(COLAS.copiarFallidos, { retentionSeconds: 3600, deleteAfterSeconds: 3600 })
  await asegurarCola(COLAS.copiar, { retentionSeconds: 3600, deleteAfterSeconds: 3600 })
  await asegurarCola(BORRAR_FALLIDOS, { retentionSeconds: 3600, deleteAfterSeconds: 3600 })
  const politica: PoliticaConFallidos = {
    retryLimit: 2,
    retryDelay: 1,
    retryBackoff: false,
    expireInSeconds: 30,
    deadLetter: BORRAR_FALLIDOS,
    retentionSeconds: 3600,
    deleteAfterSeconds: 3600,
  }
  await asegurarCola(COLAS.borrar, politica)
  const almacenDeObjetos = crearAlmacenDeObjetos({
    endPoint: "127.0.0.1",
    port: puerto,
    useSSL: false,
    accessKey: "llave-del-reintento",
    secretKey: "secreto-del-reintento",
    region: "us-east-1",
    bucket: "campus-privado",
  })
  await registrarConsumidoresDeObjetos({ almacenDeObjetos, log }, COLAS)
}, 30_000)

afterAll(async () => {
  await detenerCola()
  await cerrarConexion()
  await new Promise<void>((listo) => servidor?.close(() => listo()))
})

const leerTrabajo = async (id: string) => {
  const [fila] = await obtenerDb().$queryRaw<
    { state: string; retry_count: number; output: unknown }[]
  >`SELECT state::text AS state, retry_count, output FROM pgboss.job WHERE id = ${id}::uuid`
  return fila ?? null
}

describe("ataque ADMIN-01b r2: reintento del borrado de objetos por pg-boss", () => {
  it("ADM-T2B04: un <Error> por clave en la primera llamada hace fallar el intento; pg-boss reintenta con las mismas claves y el trabajo termina completado, sin pasar a la cola de fallidos", async () => {
    const claves = ["materiales/c/bien-1", "materiales/c/falla", "entregas/t/a/bien-2"]
    const id = randomUUID()
    await enTransaccion(obtenerDb(), async (tx) => {
      await encolar(COLAS.borrar, { claves }, { id, sql: ejecutorSqlDe(tx) })
    })

    const limite = Date.now() + 40_000
    let trabajo = await leerTrabajo(id)
    while (trabajo?.state !== "completed" && trabajo?.state !== "failed" && Date.now() < limite) {
      await new Promise((listo) => setTimeout(listo, 250))
      trabajo = await leerTrabajo(id)
    }
    expect(trabajo?.state, "el trabajo terminó completado").toBe("completed")
    expect(trabajo?.retry_count, "un solo reintento").toBe(1)
    expect(llamadas).toBe(2)
    const pedidas = cuerpos.map((c) => [...c.matchAll(/<Key>([^<]*)<\/Key>/g)].map((m) => m[1]))
    expect(pedidas).toEqual([claves, claves])
    const fallidos = await obtenerDb().$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pgboss.job WHERE name = ${BORRAR_FALLIDOS}`
    expect(fallidos[0]?.n).toBe(0)
    expect(JSON.stringify(registros)).not.toContain("secreto-del-reintento")
  }, 60_000)
})
