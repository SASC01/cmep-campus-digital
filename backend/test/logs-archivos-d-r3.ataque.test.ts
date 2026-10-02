import fs from "node:fs"

import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { inicializarAuth } from "../src/adapters/auth/index.js"
import { inicializarDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv, type Env } from "../src/config/env.js"
import type { Almacen } from "../src/core/archivos/almacen.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"

// Ataque del Tester (CLASES-d, ronda 3; punto 7 de la lista del manager y PA-10): las rutas de
// archivos con LOG_LEVEL=trace cuando un almacén doble firma URL imposibles (las de O-14): el
// ZodError del handler se registra, pero ni la URL firmada, ni su firma, ni una clave de objeto
// aparecen en el log. Captura en memoria de los descriptores 1 y 2, como logs-archivos-d-r1
// (reescrito aquí: no se importa de ningún *.ataque).

const URL_SUBIDA = "javascript:alert(1)//X-Amz-Signature=firma-de-subida-d-r3"
const URL_DESCARGA =
  "data:text/html,<script>alert(2)</script>X-Amz-Signature=firma-de-descarga-d-r3"
const almacenImposible: Almacen = {
  urlDeSubida: () => Promise.resolve(URL_SUBIDA),
  urlDeDescarga: () => Promise.resolve(URL_DESCARGA),
  metadatosDe: () => Promise.resolve(null),
}

const idsUsuarios: string[] = []
const idsClases: string[] = []
const claves: string[] = []
const estados: number[] = []
let capturado = ""
let app: FastifyInstance | undefined

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

beforeAll(async () => {
  const base = cargarEnv()
  inicializarDb({ connectionString: base.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(base))
  const env: Env = { ...base, LOG_LEVEL: "trace" }
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestra D3" })
  const alumna = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumna D3" })
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
  claves.push(imagen.claveObjeto)
  const conToken = async (id: string) => ({
    authorization: `Bearer ${await firmarTokenDePrueba({ usuarioId: id })}`,
  })
  const deMaestro = await conToken(maestro.id)
  const deAlumna = await conToken(alumna.id)

  capturar()
  try {
    app = await construirApp({ env, almacen: almacenImposible })
    await app.ready()
    for (const peticion of [
      {
        method: "POST" as const,
        url: `/api/clases/${clase.id}/archivos`,
        headers: deMaestro,
        payload: { nombre: "tarea.pdf", tipo: "application/pdf", tamano: 1234 },
      },
      {
        method: "POST" as const,
        url: `/api/clases/${clase.id}/archivos/${imagen.id}/descarga`,
        headers: deAlumna,
      },
      { method: "GET" as const, url: `/api/clases/${clase.id}/publicaciones`, headers: deAlumna },
    ]) {
      const respuesta = await app.inject(peticion)
      estados.push(respuesta.statusCode)
    }
    // C-28: se espera a que el log tenga los tres ZodError y los tres cierres (con un tope), no un
    // tiempo fijo.
    const limite = Date.now() + 5000
    while (
      ((capturado.match(/"type":"ZodError"/g)?.length ?? 0) < 3 ||
        (capturado.match(/"request completed"/g)?.length ?? 0) < 3) &&
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
  await app?.close()
})

describe("ataque d-r3: logs con trace y los ZodError provocados (PA-10)", () => {
  it("precondición: las tres rutas fallaron por la URL imposible, a nivel trace, y el log registró los tres ZodError", () => {
    expect(estados).toEqual([500, 500, 500])
    expect(app?.log.level).toBe("trace")
    expect(capturado.match(/"type":"ZodError"/g)?.length).toBe(3)
  })

  it("ni las URL imposibles, ni sus firmas, ni una clave de objeto aparecen en el log", () => {
    expect(capturado).not.toContain("javascript:")
    expect(capturado).not.toContain("data:text")
    expect(capturado).not.toContain("<script>")
    expect(capturado).not.toContain("X-Amz-Signature")
    expect(capturado).not.toContain("firma-de-subida-d-r3")
    expect(capturado).not.toContain("firma-de-descarga-d-r3")
    expect(capturado).not.toContain("materiales/")
    for (const clave of claves) expect(capturado).not.toContain(clave)
  })
})
