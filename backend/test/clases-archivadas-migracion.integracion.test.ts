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

// ADMIN-01a (ADM-1A14). La migración admin_01_clases_archivadas y sus objetos a mano (R-02): el CHECK
// clases_activa_segun_archivada y los índices parciales clases_activas_idx y clases_archivadas_idx.
// Además, la migración se aplica en un esquema propio sobre clases anteriores a ella (mismo método
// que calificaciones-migracion.integracion.test.ts).

type Tx = Parameters<Parameters<ReturnType<typeof obtenerDb>["$transaction"]>[0]>[0]

const idsUsuarios: string[] = []
const idsClases: string[] = []

const MIGRACIONES = join(import.meta.dirname, "..", "prisma", "migrations")
const SUFIJO_DEL_ENCARGO = "_admin_01_clases_archivadas"
// Nombre generado aquí (sin datos externos): SET y CREATE SCHEMA no admiten parámetros.
const ESQUEMA = `migracion_adm_${randomUUID().replaceAll("-", "").slice(0, 12)}`

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

// Intenta una escritura dentro de una transacción que siempre se revierte; devuelve el mensaje del
// error de la base, o null si la escritura pasó.
const errorAlEscribir = async (escribir: (tx: Tx) => Promise<unknown>): Promise<string | null> => {
  const REVERTIR = "revertir"
  try {
    await obtenerDb().$transaction(
      async (tx) => {
        await escribir(tx)
        throw new Error(REVERTIR)
      },
      { timeout: 10_000, maxWait: 5_000 },
    )
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error)
    return mensaje === REVERTIR ? null : mensaje
  }
  return null
}

const anteriores = { maestro: randomUUID(), activa: randomUUID(), segunda: randomUUID() }

// La app inicializa la base y la autenticación que usan las ayudas de pruebas.
let app: FastifyInstance | undefined

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await obtenerDb().$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${ESQUEMA}" CASCADE`)
  await app?.close()
})

describe("migración admin_01_clases_archivadas (ADM-1A14)", () => {
  it("ADM-1A14: el CHECK rechaza activa = true con fecha y activa = false sin fecha, y admite los dos estados válidos", async () => {
    const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })

    const activaConFecha = await errorAlEscribir(
      (tx) => tx.$executeRaw`
        UPDATE clases SET activa = true, archivada_en = now() WHERE id = ${clase.id}::uuid`,
    )
    expect(activaConFecha).toMatch(/clases_activa_segun_archivada/)

    const inactivaSinFecha = await errorAlEscribir(
      (tx) => tx.$executeRaw`
        UPDATE clases SET activa = false, archivada_en = NULL WHERE id = ${clase.id}::uuid`,
    )
    expect(inactivaSinFecha).toMatch(/clases_activa_segun_archivada/)

    const archivadaValida = await errorAlEscribir(
      (tx) => tx.$executeRaw`
        UPDATE clases SET activa = false, archivada_en = now() WHERE id = ${clase.id}::uuid`,
    )
    expect(archivadaValida).toBeNull()
  })

  it("ADM-1A14: los dos índices parciales existen con sus columnas y su predicado", async () => {
    const indices = await obtenerDb().$queryRaw<{ indexname: string; indexdef: string }[]>`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE schemaname = current_schema() AND tablename = 'clases'
        AND indexname IN ('clases_activas_idx', 'clases_archivadas_idx')
      ORDER BY indexname`
    expect(indices.map((i) => i.indexname)).toEqual(["clases_activas_idx", "clases_archivadas_idx"])
    expect(indices[0]?.indexdef).toMatch(
      /\(creado_en DESC, id DESC\) WHERE \(archivada_en IS NULL\)$/,
    )
    expect(indices[1]?.indexdef).toMatch(
      /\(archivada_en DESC, id DESC\) WHERE \(archivada_en IS NOT NULL\)$/,
    )
  })

  describe("sobre clases anteriores a la migración", () => {
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
          VALUES (${anteriores.maestro}::uuid, ${`m-${anteriores.maestro}@prueba.mx`}, 'x', 'Maestra A', 'maestra a', 'maestro', now())`
        await tx.$executeRaw`
          INSERT INTO clases (id, nombre, codigo_invitacion, maestro_id, actualizado_en)
          VALUES (${anteriores.activa}::uuid, 'Clase A', ${anteriores.activa.slice(0, 12)}, ${anteriores.maestro}::uuid, now()),
                 (${anteriores.segunda}::uuid, 'Clase B', ${anteriores.segunda.slice(0, 12)}, ${anteriores.maestro}::uuid, now())`
      })

      const nombre = todas[indice]
      if (nombre === undefined)
        throw new Error("Precondición: el nombre de la migración del encargo")
      await aplicar(nombre)
    }, 180_000)

    it("ADM-1A14: las clases anteriores a la migración quedan activas y sin fecha de archivo", async () => {
      const filas = await enElEsquema(
        (tx) =>
          tx.$queryRaw<{ id: string; activa: boolean; archivada_en: Date | null }[]>`
          SELECT id, activa, archivada_en FROM clases ORDER BY nombre`,
      )
      expect(filas).toEqual([
        { id: anteriores.activa, activa: true, archivada_en: null },
        { id: anteriores.segunda, activa: true, archivada_en: null },
      ])
    })
  })
})
