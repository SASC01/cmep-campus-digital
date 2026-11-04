import { randomUUID } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { bloqueEfectivo } from "../src/core/recursos.js"

// Ataque del Tester, CLASES-03a, ronda 1: la migración clases_03_recursos sobre datos raros (un
// material de un estudiante, materiales del admin con tema y en dos clases, decenas de materiales,
// anuncios y tareas del admin). Mismo método que CL3-A01 y CAL-1A01: un esquema propio de la base
// desechable, las migraciones hasta la anterior, los datos con SQL parametrizado y al final la del
// encargo. El reparto debe coincidir fila por fila con bloqueEfectivo (la regla que usan los
// permisos con un bloque nulo).

type Tx = Parameters<Parameters<ReturnType<typeof obtenerDb>["$transaction"]>[0]>[0]
type Rol = "admin" | "maestro" | "estudiante"

let app: FastifyInstance | undefined

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await app?.close()
})

const MIGRACIONES = join(import.meta.dirname, "..", "prisma", "migrations")
const SUFIJO_DEL_ENCARGO = "_clases_03_recursos"
// Nombre generado aquí (sin datos externos): SET y CREATE SCHEMA no admiten parámetros.
const ESQUEMA = `ataque_cl3a_${randomUUID().replaceAll("-", "").slice(0, 12)}`

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

const aplicar = (nombre: string): Promise<void> =>
  enElEsquema(async (tx) => {
    for (const sentencia of sentenciasDe(nombre)) await tx.$executeRawUnsafe(sentencia)
  })

const usuarios: Record<Rol, string> = {
  admin: randomUUID(),
  maestro: randomUUID(),
  estudiante: randomUUID(),
}
const clases = [randomUUID(), randomUUID()]
const tema = randomUUID()
const MATERIALES_POR_AUTOR = 12

interface Sembrada {
  id: string
  tipo: "material" | "anuncio" | "tarea"
  rol: Rol
}
const sembradas: Sembrada[] = []

interface FilaMigrada {
  id: string
  bloque: "aprendizaje" | "docente" | null
}

describe("ataque CLASES-03a r1: la migración clases_03_recursos con datos raros", () => {
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

    for (const rol of ["admin", "maestro", "estudiante"] as const) {
      for (let i = 0; i < MATERIALES_POR_AUTOR; i += 1) {
        sembradas.push({ id: randomUUID(), tipo: "material", rol })
      }
    }
    sembradas.push(
      { id: randomUUID(), tipo: "anuncio", rol: "admin" },
      { id: randomUUID(), tipo: "anuncio", rol: "estudiante" },
      { id: randomUUID(), tipo: "tarea", rol: "admin" },
      { id: randomUUID(), tipo: "tarea", rol: "maestro" },
    )

    await enElEsquema(async (tx) => {
      for (const rol of ["admin", "maestro", "estudiante"] as const) {
        const id = usuarios[rol]
        await tx.$executeRaw`
          INSERT INTO usuarios (id, email, hash_contrasena, nombre, nombre_busqueda, rol, actualizado_en)
          VALUES (${id}::uuid, ${`${rol}-${id}@prueba.mx`}, 'x', ${`Persona ${rol}`},
                  ${`persona ${rol}`}, ${rol}::rol_usuario, now())`
      }
      for (const clase of clases) {
        await tx.$executeRaw`
          INSERT INTO clases (id, nombre, codigo_invitacion, maestro_id, actualizado_en)
          VALUES (${clase}::uuid, 'Clase rara', ${clase.slice(0, 12)}, ${usuarios.maestro}::uuid, now())`
      }
      await tx.$executeRaw`
        INSERT INTO temas (id, clase_id, nombre, orden, actualizado_en)
        VALUES (${tema}::uuid, ${clases[0] ?? ""}::uuid, 'Tema raro', 0, now())`
      for (const [i, s] of sembradas.entries()) {
        const clase = clases[i % 2] ?? ""
        const conTema = s.tipo !== "anuncio" && i % 2 === 0
        await tx.$executeRaw`
          INSERT INTO publicaciones (id, clase_id, autor_id, tipo, titulo, texto, tema_id, actualizado_en)
          VALUES (${s.id}::uuid, ${clase}::uuid, ${usuarios[s.rol]}::uuid, ${s.tipo}::tipo_publicacion,
                  ${s.tipo === "anuncio" ? null : "Título"}, 'Texto',
                  ${conTema ? tema : null}::uuid, now())`
      }
    })

    const nombre = todas[indice]
    if (nombre === undefined) throw new Error("Precondición: el nombre de la migración del encargo")
    await aplicar(nombre)
  }, 180_000)

  afterAll(async () => {
    await obtenerDb().$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${ESQUEMA}" CASCADE`)
  })

  it("CL3a-r1-21: cada fila migrada tiene el bloque que le da bloqueEfectivo con el rol de su autor (un material de estudiante, docente); anuncios y tareas, nulo; ningún material queda sin bloque", async () => {
    const filas = await enElEsquema(
      (tx) => tx.$queryRaw<FilaMigrada[]>`
        SELECT id::text AS id, bloque::text AS bloque FROM publicaciones`,
    )
    const porId = new Map(filas.map((fila) => [fila.id, fila.bloque]))
    expect(porId.size, "Precondición: todas las filas sembradas").toBe(sembradas.length)
    const fallas: string[] = []
    for (const s of sembradas) {
      const esperado =
        s.tipo === "material" ? bloqueEfectivo(null, { id: usuarios[s.rol], rol: s.rol }) : null
      const obtenido = porId.get(s.id)
      if (obtenido !== esperado) fallas.push(`${s.tipo} de ${s.rol}: ${String(obtenido)}`)
    }
    expect(fallas).toEqual([])
    expect(filas.filter((f) => f.bloque === null).length).toBe(4)
  })

  it("CL3a-r1-22: después de migrar, la base rechaza un anuncio con bloque y una versión negativa, y un UPDATE que quita el bloque de un material lo acepta (DH-02 a)", async () => {
    const material = sembradas.find((s) => s.tipo === "material")
    const anuncio = sembradas.find((s) => s.tipo === "anuncio")
    if (material === undefined || anuncio === undefined) throw new Error("Precondición: sembradas")
    const intentar = async (sql: (tx: Tx) => Promise<unknown>): Promise<string> => {
      try {
        await enElEsquema(async (tx) => {
          await sql(tx)
          throw new Error("revertir")
        })
        return "sin error"
      } catch (error) {
        const texto = error instanceof Error ? error.message : String(error)
        return (
          texto.match(/publicaciones_[a-z_]+/)?.[0] ?? (texto === "revertir" ? "aceptado" : texto)
        )
      }
    }
    expect(
      await intentar(
        (tx) =>
          tx.$executeRaw`UPDATE publicaciones SET bloque = 'docente' WHERE id = ${anuncio.id}::uuid`,
      ),
    ).toBe("publicaciones_bloque_solo_material")
    expect(
      await intentar(
        (tx) =>
          tx.$executeRaw`UPDATE publicaciones SET version = -1 WHERE id = ${material.id}::uuid`,
      ),
    ).toBe("publicaciones_version_no_negativa")
    expect(
      await intentar(
        (tx) =>
          tx.$executeRaw`UPDATE publicaciones SET bloque = NULL WHERE id = ${material.id}::uuid`,
      ),
    ).toBe("aceptado")
  })
})
