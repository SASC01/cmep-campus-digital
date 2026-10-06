import { randomUUID } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"

let app: FastifyInstance | undefined

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await app?.close()
})

const CARPETA_DE_MIGRACIONES = new URL("../prisma/migrations/", import.meta.url)

// El SQL fijo del repositorio: el bloque "-- CLASES-02 · datos" de la migración, tal cual (sin
// entrada de usuario).
const sentenciaDeDatos = (): string => {
  const carpetas = readdirSync(fileURLToPath(CARPETA_DE_MIGRACIONES)).filter((nombre) =>
    nombre.endsWith("_clases_administradas"),
  )
  expect(carpetas, "Precondición: hay una sola migración clases_administradas").toHaveLength(1)
  const sql = readFileSync(
    fileURLToPath(new URL(`${carpetas[0] ?? ""}/migration.sql`, CARPETA_DE_MIGRACIONES)),
    "utf8",
  )
  const inicio = sql.indexOf("-- CLASES-02 · datos")
  expect(inicio, "Precondición: la migración trae el bloque de datos").toBeGreaterThanOrEqual(0)
  return sql.slice(inicio)
}

interface FilaAsignacion {
  clase_id: string
  maestro_id: string
  creado_en: Date
}

describe("migración clases_administradas (CLASES-02a)", () => {
  it("PR-2A07: la sentencia de datos deja una fila (id, maestro_id, creado_en) por clase, sin duplicar la que ya existía, es repetible, y se revierte sin dejar nada", async () => {
    const sentencia = sentenciaDeDatos()
    expect(sentencia).toContain('INSERT INTO "maestros_de_clase"')
    expect(sentencia).toContain('FROM "clases"')
    expect(sentencia).not.toMatch(/\bpublic\./)

    const clases = [0, 1, 2].map((i) => ({
      id: randomUUID(),
      maestroId: randomUUID(),
      creadoEn: new Date(Date.UTC(2020, 0, 1 + i, 10, 20, 30, 400 + i)),
    }))
    const REVERTIR = new Error("revertir la transacción de PR-2A07")
    let despuesDeLaPrimera: FilaAsignacion[] = []
    let despuesDeLaSegunda: FilaAsignacion[] = []
    let enTemporales: { clases: boolean; maestros: boolean } | undefined

    await obtenerDb()
      .$transaction(async (tx) => {
        // Tablas temporales sin FK que sombrean a las de public (pg_temp va primero en la ruta de
        // búsqueda): la sentencia, sin esquema, lee y escribe estas.
        await tx.$executeRaw`CREATE TEMP TABLE clases (
          id uuid PRIMARY KEY, maestro_id uuid NOT NULL, creado_en timestamptz(3) NOT NULL
        ) ON COMMIT DROP`
        await tx.$executeRaw`CREATE TEMP TABLE maestros_de_clase (
          clase_id uuid, maestro_id uuid, creado_en timestamptz(3) NOT NULL,
          PRIMARY KEY (clase_id, maestro_id)
        ) ON COMMIT DROP`
        // to_regclass imprime sin esquema lo que está en la ruta de búsqueda: se compara el objeto
        // al que resuelve el nombre sin esquema con el de pg_temp.
        const [resueltas] = await tx.$queryRaw<{ clases: boolean; maestros: boolean }[]>`
          SELECT to_regclass('clases') = to_regclass('pg_temp.clases') AS clases,
                 to_regclass('maestros_de_clase') = to_regclass('pg_temp.maestros_de_clase') AS maestros`
        enTemporales = resueltas
        if (resueltas?.clases !== true || resueltas.maestros !== true) {
          // Nunca se ejecuta la sentencia contra las tablas reales.
          throw new Error(
            `Precondición: las tablas sin esquema no resuelven al esquema temporal (${JSON.stringify(resueltas)})`,
          )
        }

        for (const clase of clases) {
          await tx.$executeRaw`INSERT INTO clases (id, maestro_id, creado_en)
            VALUES (${clase.id}::uuid, ${clase.maestroId}::uuid, ${clase.creadoEn})`
        }
        const ya = clases[1]
        if (!ya) throw new Error("Precondición: faltan clases de prueba")
        await tx.$executeRaw`INSERT INTO maestros_de_clase (clase_id, maestro_id, creado_en)
          VALUES (${ya.id}::uuid, ${ya.maestroId}::uuid, ${ya.creadoEn})`

        const leer = () =>
          tx.$queryRaw<FilaAsignacion[]>`
            SELECT clase_id::text AS clase_id, maestro_id::text AS maestro_id, creado_en
            FROM maestros_de_clase ORDER BY clase_id`
        await tx.$executeRawUnsafe(sentencia)
        despuesDeLaPrimera = await leer()
        await tx.$executeRawUnsafe(sentencia)
        despuesDeLaSegunda = await leer()
        throw REVERTIR
      })
      .catch((error: unknown) => {
        if (error !== REVERTIR) throw error
      })

    expect(enTemporales).toEqual({ clases: true, maestros: true })
    const esperadas = clases
      .map((c) => ({ clase_id: c.id, maestro_id: c.maestroId, creado_en: c.creadoEn }))
      .sort((a, b) => (a.clase_id < b.clase_id ? -1 : 1))
    expect(despuesDeLaPrimera).toEqual(esperadas)
    expect(despuesDeLaSegunda).toEqual(esperadas)

    // Al revertir, nada queda: las temporales desaparecen y public no recibió ninguna fila.
    const [despues] = await obtenerDb().$queryRaw<{ clases: string | null }[]>`
      SELECT to_regclass('clases')::text AS clases`
    expect(despues?.clases).toBe("clases")
    const enPublic = await obtenerDb().maestroDeClase.count({
      where: { claseId: { in: clases.map((c) => c.id) } },
    })
    expect(enPublic).toBe(0)
  })

  it("PR-2A08: maestros_de_clase tiene la PK, el índice (maestro_id, creado_en DESC, clase_id DESC), la FK a clases con ON DELETE CASCADE y la FK a usuarios con ON DELETE RESTRICT; clases tiene el índice (creado_en DESC, id DESC) y maestro_id sigue NOT NULL", async () => {
    const indices = await obtenerDb().$queryRaw<{ indexname: string; indexdef: string }[]>`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE schemaname = 'public' AND tablename IN ('maestros_de_clase', 'clases')`
    const definicion = (nombre: string): string =>
      indices.find((indice) => indice.indexname === nombre)?.indexdef ?? "(no existe)"
    expect(definicion("maestros_de_clase_pkey")).toContain("(clase_id, maestro_id)")
    expect(definicion("maestros_de_clase_maestro_id_creado_en_clase_id_idx")).toContain(
      "(maestro_id, creado_en DESC, clase_id DESC)",
    )
    expect(definicion("clases_creado_en_id_idx")).toContain("(creado_en DESC, id DESC)")
    expect(definicion("clases_maestro_id_creado_en_id_idx")).toContain(
      "(maestro_id, creado_en DESC, id DESC)",
    )

    const restricciones = await obtenerDb().$queryRaw<{ conname: string; definicion: string }[]>`
      SELECT conname, pg_get_constraintdef(oid) AS definicion FROM pg_constraint
      WHERE conrelid = 'public.maestros_de_clase'::regclass`
    const restriccion = (nombre: string): string =>
      restricciones.find((fila) => fila.conname === nombre)?.definicion ?? "(no existe)"
    expect(restriccion("maestros_de_clase_pkey")).toContain("PRIMARY KEY (clase_id, maestro_id)")
    expect(restriccion("maestros_de_clase_clase_id_fkey")).toContain("REFERENCES clases(id)")
    expect(restriccion("maestros_de_clase_clase_id_fkey")).toContain("ON DELETE CASCADE")
    expect(restriccion("maestros_de_clase_maestro_id_fkey")).toContain("REFERENCES usuarios(id)")
    expect(restriccion("maestros_de_clase_maestro_id_fkey")).toContain("ON DELETE RESTRICT")

    const [columna] = await obtenerDb().$queryRaw<{ is_nullable: string }[]>`
      SELECT is_nullable FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'clases' AND column_name = 'maestro_id'`
    expect(columna?.is_nullable).toBe("NO")
  })
})
