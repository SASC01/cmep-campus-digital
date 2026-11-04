import { randomUUID } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from "./ayudas-auth.js"
import { borrarMovimientosYClasesDePrueba, crearClaseDePrueba } from "./ayudas-clases.js"
import { crearTareaDePrueba } from "./ayudas-tareas.js"

// CLASES-03a (CL3-A01 a CL3-A03). La migración clases_03_recursos (§D-1): el reparto de los materiales
// existentes por el rol de su autor, los dos CHECK a mano y los dos índices nuevos. CL3-A01 sigue el
// patrón de CAL-1A01: un esquema propio de la base desechable, las migraciones hasta la anterior a la
// de este encargo, los datos y al final la de este encargo.

type Tx = Parameters<Parameters<ReturnType<typeof obtenerDb>["$transaction"]>[0]>[0]

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

// La aplicación inicializa el cliente de la base desechable (como en CAL-1A01).
beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const MIGRACIONES = join(import.meta.dirname, "..", "prisma", "migrations")
const SUFIJO_DEL_ENCARGO = "_clases_03_recursos"
// Nombre generado aquí (sin datos externos): SET y CREATE SCHEMA no admiten parámetros.
const ESQUEMA = `migracion_cl3_${randomUUID().replaceAll("-", "").slice(0, 12)}`

const enElEsquema = <T>(trabajo: (tx: Tx) => Promise<T>): Promise<T> =>
  obtenerDb().$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${ESQUEMA}", public`)
      return trabajo(tx)
    },
    { timeout: 30_000, maxWait: 5_000 },
  )

const sentenciasDe = (nombre: string): string[] =>
  readFileSync(join(MIGRACIONES, nombre, "migration.sql"), "utf8")
    .split("\n")
    .filter((linea) => !linea.trimStart().startsWith("--"))
    .join("\n")
    .split(/;\s*$/m)
    .map((sentencia) => sentencia.trim())
    .filter((sentencia) => sentencia.length > 0)

// El texto de una migración es un archivo del repositorio, no un dato: va tal cual.
const aplicar = (nombre: string): Promise<void> =>
  enElEsquema(async (tx) => {
    for (const sentencia of sentenciasDe(nombre)) await tx.$executeRawUnsafe(sentencia)
  })

const ids = {
  admin: randomUUID(),
  maestro: randomUUID(),
  clase: randomUUID(),
  materialAdmin: randomUUID(),
  materialMaestro: randomUUID(),
  anuncio: randomUUID(),
  tarea: randomUUID(),
}

// Un instante fijo y antiguo: si la migración tocara actualizado_en, cambiaría.
const ACTUALIZADO_EN = new Date("2026-01-15T10:00:00.000Z")

interface FilaMigrada {
  id: string
  bloque: string | null
  version: number
  actualizado: Date
}

describe("migración clases_03_recursos sobre datos de antes (CL3-A01)", () => {
  beforeAll(async () => {
    await obtenerDb().$executeRawUnsafe(`CREATE SCHEMA "${ESQUEMA}"`)
    const todas = readdirSync(MIGRACIONES, { withFileTypes: true })
      .filter((entrada) => entrada.isDirectory())
      .map((entrada) => entrada.name)
      .sort()
    const indice = todas.findIndex((nombre) => nombre.endsWith(SUFIJO_DEL_ENCARGO))
    if (indice < 1)
      throw new Error("Precondición: la migración del encargo existe y no es la primera")
    for (const nombre of todas.slice(0, indice)) await aplicar(nombre)

    await enElEsquema(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO usuarios (id, email, hash_contrasena, nombre, nombre_busqueda, rol, actualizado_en)
        VALUES (${ids.admin}::uuid, ${`a-${ids.admin}@prueba.mx`}, 'x', 'Admin R', 'admin r', 'admin', now()),
               (${ids.maestro}::uuid, ${`m-${ids.maestro}@prueba.mx`}, 'x', 'Maestra R', 'maestra r', 'maestro', now())`
      await tx.$executeRaw`
        INSERT INTO clases (id, nombre, codigo_invitacion, maestro_id, actualizado_en)
        VALUES (${ids.clase}::uuid, 'Clase R', ${ids.clase.slice(0, 12)}, ${ids.maestro}::uuid, now())`
      await tx.$executeRaw`
        INSERT INTO publicaciones (id, clase_id, autor_id, tipo, titulo, texto, actualizado_en)
        VALUES (${ids.materialAdmin}::uuid, ${ids.clase}::uuid, ${ids.admin}::uuid, 'material', 'Guía', '', ${ACTUALIZADO_EN}),
               (${ids.materialMaestro}::uuid, ${ids.clase}::uuid, ${ids.maestro}::uuid, 'material', 'Notas', '', ${ACTUALIZADO_EN}),
               (${ids.anuncio}::uuid, ${ids.clase}::uuid, ${ids.admin}::uuid, 'anuncio', NULL, 'Aviso', ${ACTUALIZADO_EN}),
               (${ids.tarea}::uuid, ${ids.clase}::uuid, ${ids.maestro}::uuid, 'tarea', 'Tarea', 'Hazla', ${ACTUALIZADO_EN})`
    })

    const nombre = todas[indice]
    if (nombre === undefined) throw new Error("Precondición: el nombre de la migración del encargo")
    await aplicar(nombre)
  }, 180_000)

  afterAll(async () => {
    await obtenerDb().$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${ESQUEMA}" CASCADE`)
  })

  it("CL3-A01: el material del admin queda en aprendizaje, el del maestro en docente, anuncio y tarea sin bloque; actualizado_en no cambia y version es 0 en todas", async () => {
    const filas = await enElEsquema(
      (tx) => tx.$queryRaw<FilaMigrada[]>`
        SELECT id::text AS id, bloque::text AS bloque, version, actualizado_en AS actualizado
        FROM publicaciones WHERE clase_id = ${ids.clase}::uuid ORDER BY id`,
    )
    const esperado = [
      { id: ids.materialAdmin, bloque: "aprendizaje" },
      { id: ids.materialMaestro, bloque: "docente" },
      { id: ids.anuncio, bloque: null },
      { id: ids.tarea, bloque: null },
    ]
      .map((fila) => ({ ...fila, version: 0, actualizado: ACTUALIZADO_EN }))
      .sort((a, b) => (a.id < b.id ? -1 : 1))
    expect(filas).toEqual(esperado)
  })

  it("CL3-A01: en el esquema migrado existen los dos CHECK nuevos, validados", async () => {
    const nombres = ["publicaciones_bloque_solo_material", "publicaciones_version_no_negativa"]
    const checks = await obtenerDb().$queryRaw<{ conname: string; convalidated: boolean }[]>`
      SELECT c.conname, c.convalidated FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = ${ESQUEMA} AND c.contype = 'c' AND c.conname = ANY(${nombres}::text[])
      ORDER BY c.conname`
    expect(checks).toEqual(nombres.map((conname) => ({ conname, convalidated: true })))
  })
})

describe("restricciones e índices de clases_03_recursos (CL3-A02, CL3-A03)", () => {
  const escenario = async (): Promise<{ claseId: string; maestroId: string }> => {
    const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    return { claseId: clase.id, maestroId: maestro.id }
  }

  it("CL3-A02: un anuncio o una tarea con bloque se rechaza con publicaciones_bloque_solo_material", async () => {
    const { claseId, maestroId } = await escenario()
    await expect(
      obtenerDb().$executeRaw`
        INSERT INTO publicaciones (clase_id, autor_id, tipo, titulo, texto, bloque, actualizado_en)
        VALUES (${claseId}::uuid, ${maestroId}::uuid, 'anuncio', NULL, 'Aviso', 'docente', now())`,
    ).rejects.toThrow(/publicaciones_bloque_solo_material/)
    const tareaId = await crearTareaDePrueba({ claseId, autorId: maestroId })
    await expect(
      obtenerDb().publicacion.update({
        where: { id: tareaId },
        data: { bloque: "aprendizaje" },
        select: { id: true },
      }),
    ).rejects.toThrow(/publicaciones_bloque_solo_material/)
    expect(await obtenerDb().publicacion.count({ where: { claseId, bloque: { not: null } } })).toBe(
      0,
    )
  })

  it("CL3-A02: un material con bloque nulo se acepta (DH-02 a) y uno con bloque también", async () => {
    const { claseId, maestroId } = await escenario()
    await obtenerDb().$executeRaw`
      INSERT INTO publicaciones (clase_id, autor_id, tipo, titulo, texto, actualizado_en)
      VALUES (${claseId}::uuid, ${maestroId}::uuid, 'material', 'Sin bloque', '', now())`
    await obtenerDb().$executeRaw`
      INSERT INTO publicaciones (clase_id, autor_id, tipo, titulo, texto, bloque, actualizado_en)
      VALUES (${claseId}::uuid, ${maestroId}::uuid, 'material', 'Con bloque', '', 'docente', now())`
    const filas = await obtenerDb().publicacion.findMany({
      where: { claseId },
      select: { titulo: true, bloque: true, version: true },
      orderBy: { titulo: "asc" },
    })
    expect(filas).toEqual([
      { titulo: "Con bloque", bloque: "docente", version: 0 },
      { titulo: "Sin bloque", bloque: null, version: 0 },
    ])
  })

  it("CL3-A02: una versión de -1 se rechaza con publicaciones_version_no_negativa", async () => {
    const { claseId, maestroId } = await escenario()
    await expect(
      obtenerDb().$executeRaw`
        INSERT INTO publicaciones (clase_id, autor_id, tipo, titulo, texto, version, actualizado_en)
        VALUES (${claseId}::uuid, ${maestroId}::uuid, 'material', 'Negativa', '', -1, now())`,
    ).rejects.toThrow(/publicaciones_version_no_negativa/)
    expect(await obtenerDb().publicacion.count({ where: { claseId } })).toBe(0)
  })

  it("CL3-A03: los dos índices nuevos existen con sus columnas y su orden", async () => {
    const nombres = [
      "publicaciones_clase_id_bloque_tema_id_creado_en_id_idx",
      "publicaciones_clase_id_tipo_tema_id_creado_en_id_idx",
    ]
    const indices = await obtenerDb().$queryRaw<{ indexname: string; indexdef: string }[]>`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'publicaciones'
        AND indexname = ANY(${nombres}::text[])
      ORDER BY indexname`
    expect(indices.map((indice) => indice.indexname)).toEqual(nombres)
    const definicion = (nombre: string): string =>
      indices.find((indice) => indice.indexname === nombre)?.indexdef ?? ""
    expect(definicion(nombres[0] ?? "")).toContain(
      "(clase_id, bloque, tema_id, creado_en DESC, id DESC)",
    )
    expect(definicion(nombres[1] ?? "")).toContain(
      "(clase_id, tipo, tema_id, creado_en DESC, id DESC)",
    )
  })
})
