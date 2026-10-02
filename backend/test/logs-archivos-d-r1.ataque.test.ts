import fs from "node:fs"

import {
  descargaRespuestaSchema,
  errorApiSchema,
  listaPublicacionesRespuestaSchema,
  solicitarSubidaRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { inicializarAuth } from "../src/adapters/auth/index.js"
import { inicializarDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv, type Env } from "../src/config/env.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"

// Ataque del Tester (CLASES-d, ronda 1; punto 4 del plan, punto 7 del manager y PA-10). La API
// real se construye en memoria con construirApp y SIN pasarle almacén: lo arma config/almacen.ts
// con STORAGE_* del entorno, como en el servidor, con nivel trace. El endpoint es inalcanzable
// (127.0.0.1:9, sin red, como PR-D03a): firmar es local y statObject falla, así que también pasa
// por el error del proveedor (503). Una segunda app usa un bucket con nombre inválido para que la
// firma misma falle. Todo lo que pino escribe en los descriptores 1 y 2 se captura; ni la firma
// X-Amz-Signature, ni una URL prefirmada completa, ni el secreto, ni la llave, ni una clave de
// objeto pueden aparecer.

const LLAVE = "llave-de-logs-d-r1"
const SECRETO = "secreto-de-logs-d-r1-0123456789"
const idsUsuarios: string[] = []
const idsClases: string[] = []

let capturado = ""
const writeSyncOriginal = fs.writeSync
const writeOriginal = fs.write
const stdoutOriginal = process.stdout.write.bind(process.stdout)
const stderrOriginal = process.stderr.write.bind(process.stderr)

const aTexto = (dato: unknown): string => {
  if (typeof dato === "string") return dato
  if (dato instanceof Uint8Array) return Buffer.from(dato).toString("utf8")
  return ""
}

const capturar = (): void => {
  const writeSyncCapturado = (fd: number, dato: unknown, ...resto: unknown[]): number => {
    if (fd === 1 || fd === 2) {
      const texto = aTexto(dato)
      capturado += texto
      return Buffer.byteLength(texto)
    }
    return (writeSyncOriginal as (...a: unknown[]) => number)(fd, dato, ...resto)
  }
  const writeCapturado = (fd: number, dato: unknown, ...resto: unknown[]): void => {
    const retrollamada = resto.at(-1)
    if ((fd === 1 || fd === 2) && typeof retrollamada === "function") {
      const texto = aTexto(dato)
      capturado += texto
      ;(retrollamada as (e: null, n: number) => void)(null, Buffer.byteLength(texto))
      return
    }
    ;(writeOriginal as (...a: unknown[]) => void)(fd, dato, ...resto)
  }
  Object.assign(fs, { writeSync: writeSyncCapturado, write: writeCapturado })
  process.stdout.write = ((dato: unknown) => {
    capturado += aTexto(dato)
    return true
  }) as typeof process.stdout.write
  process.stderr.write = ((dato: unknown) => {
    capturado += aTexto(dato)
    return true
  }) as typeof process.stderr.write
}

const soltar = (): void => {
  Object.assign(fs, { writeSync: writeSyncOriginal, write: writeOriginal })
  process.stdout.write = stdoutOriginal
  process.stderr.write = stderrOriginal
}

const urlsFirmadas: string[] = []
const claves: string[] = []
const estados: Record<string, number> = {}
const codigos: Record<string, string> = {}
let appConAlmacen: FastifyInstance | undefined
let appBucketInvalido: FastifyInstance | undefined

const registrar = (nombre: string, respuesta: LightMyRequestResponse): LightMyRequestResponse => {
  estados[nombre] = respuesta.statusCode
  const error = errorApiSchema.safeParse(respuesta.json())
  if (error.success) codigos[nombre] = error.data.error.codigo
  return respuesta
}

beforeAll(async () => {
  const base = cargarEnv()
  inicializarDb({ connectionString: base.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(base))
  const env: Env = {
    ...base,
    LOG_LEVEL: "trace",
    STORAGE_ENDPOINT: "http://127.0.0.1:9",
    STORAGE_ACCESS_KEY: LLAVE,
    STORAGE_SECRET_KEY: SECRETO,
  }
  const maestro = await crearUsuarioDePrueba(idsUsuarios, {
    rol: "maestro",
    nombre: "Maestra Logs D",
  })
  const alumna = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumna Logs D" })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await inscribirDePrueba(clase.id, alumna.id, "codigo")
  const publicacionId = await crearPublicacionDePrueba({
    claseId: clase.id,
    autorId: maestro.id,
    tipo: "material",
  })
  const imagen = await crearArchivoDePrueba({
    claseId: clase.id,
    subidoPor: maestro.id,
    estado: "confirmado",
    publicacionId,
    nombre: "pizarron.png",
    tipo: "image/png",
  })
  const pendiente = await crearArchivoDePrueba({ claseId: clase.id, subidoPor: maestro.id })
  claves.push(imagen.claveObjeto, pendiente.claveObjeto)
  const tokenMaestro = await firmarTokenDePrueba({ usuarioId: maestro.id })
  const tokenAlumna = await firmarTokenDePrueba({ usuarioId: alumna.id })
  const con = (token: string) => ({ authorization: `Bearer ${token}` })

  capturar()
  try {
    appConAlmacen = await construirApp({ env })
    await appConAlmacen.ready()
    appBucketInvalido = await construirApp({
      env: { ...env, STORAGE_BUCKET_PRIVADO: "Bucket_Invalido!!" },
    })
    await appBucketInvalido.ready()

    const solicitud = registrar(
      "solicitar",
      await appConAlmacen.inject({
        method: "POST",
        url: `/api/clases/${clase.id}/archivos`,
        headers: con(tokenMaestro),
        payload: { nombre: "tarea.pdf", tipo: "application/pdf", tamano: 1234 },
      }),
    )
    const subida = solicitarSubidaRespuestaSchema.safeParse(solicitud.json())
    if (subida.success) {
      urlsFirmadas.push(subida.data.subida.url)
      claves.push(`materiales/${clase.id}/${subida.data.archivo.id}`)
    }
    const muro = registrar(
      "muro",
      await appConAlmacen.inject({
        method: "GET",
        url: `/api/clases/${clase.id}/publicaciones`,
        headers: con(tokenAlumna),
      }),
    )
    const lista = listaPublicacionesRespuestaSchema.safeParse(muro.json())
    if (lista.success) {
      for (const adjunto of lista.data.publicaciones.flatMap((p) => p.adjuntos)) {
        if (adjunto.vistaPrevia) urlsFirmadas.push(adjunto.vistaPrevia.url)
      }
    }
    const descarga = registrar(
      "descarga",
      await appConAlmacen.inject({
        method: "POST",
        url: `/api/clases/${clase.id}/archivos/${imagen.id}/descarga`,
        headers: con(tokenAlumna),
      }),
    )
    const url = descargaRespuestaSchema.safeParse(descarga.json())
    if (url.success) urlsFirmadas.push(url.data.url)
    registrar(
      "publicar con el proveedor caído",
      await appConAlmacen.inject({
        method: "POST",
        url: `/api/clases/${clase.id}/publicaciones`,
        headers: con(tokenMaestro),
        payload: { tipo: "anuncio", texto: "Con adjunto", archivoIds: [pendiente.id] },
      }),
    )
    registrar(
      "solicitar con la firma rota",
      await appBucketInvalido.inject({
        method: "POST",
        url: `/api/clases/${clase.id}/archivos`,
        headers: con(tokenMaestro),
        payload: { nombre: "tarea.pdf", tipo: "application/pdf", tamano: 1234 },
      }),
    )
    registrar(
      "descarga con la firma rota",
      await appBucketInvalido.inject({
        method: "POST",
        url: `/api/clases/${clase.id}/archivos/${imagen.id}/descarga`,
        headers: con(tokenAlumna),
      }),
    )
    // C-28: se espera a que el log tenga el cierre de las seis peticiones (con un tope), no un
    // tiempo fijo.
    const limite = Date.now() + 5000
    while (
      capturado.split("\n").filter((l) => l.includes('"request completed"')).length < 6 &&
      Date.now() < limite
    ) {
      await new Promise((resolver) => setTimeout(resolver, 10))
    }
  } finally {
    soltar()
  }
}, 60_000)

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await appBucketInvalido?.close()
  await appConAlmacen?.close()
})

describe("ataque d-r1: logs de los archivos con nivel trace (PA-10)", () => {
  it("precondición: las seis peticiones respondieron lo esperado, se firmaron tres URL y el log se capturó completo", () => {
    expect(estados).toEqual({
      solicitar: 201,
      muro: 200,
      descarga: 200,
      "publicar con el proveedor caído": 503,
      "solicitar con la firma rota": 503,
      "descarga con la firma rota": 503,
    })
    expect(codigos).toEqual({
      "publicar con el proveedor caído": "ALMACEN_NO_DISPONIBLE",
      "solicitar con la firma rota": "ALMACEN_NO_DISPONIBLE",
      "descarga con la firma rota": "ALMACEN_NO_DISPONIBLE",
    })
    expect(urlsFirmadas).toHaveLength(3)
    const completadas = capturado.split("\n").filter((l) => l.includes('"request completed"'))
    expect(completadas.length).toBeGreaterThanOrEqual(6)
    expect(appConAlmacen?.log.level).toBe("trace")
    expect(appBucketInvalido?.log.level).toBe("trace")
  })

  it("ni la firma, ni una URL prefirmada, ni el secreto, ni la llave, ni una clave de objeto aparecen en el log", () => {
    expect(capturado.length).toBeGreaterThan(0)
    expect(capturado).not.toContain("X-Amz-Signature")
    expect(capturado).not.toContain("X-Amz-Credential")
    expect(capturado).not.toContain(SECRETO)
    expect(capturado).not.toContain(LLAVE)
    expect(capturado).not.toContain("127.0.0.1:9/")
    expect(capturado).not.toContain("materiales/")
    for (const url of urlsFirmadas) {
      expect(capturado).not.toContain(url)
      expect(capturado).not.toContain(new URL(url).searchParams.get("X-Amz-Signature") ?? "-")
    }
    for (const clave of claves) expect(capturado).not.toContain(clave)
    expect(capturado).not.toContain("Bucket_Invalido")
  })
})
