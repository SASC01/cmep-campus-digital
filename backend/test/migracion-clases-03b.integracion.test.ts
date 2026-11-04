import { randomUUID } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"
import { crearDudaDePrueba, crearRespuestaDePrueba } from "./ayudas-dudas.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import { crearTareaDePrueba } from "./ayudas-tareas.js"

// CLASES-03b (CL3-B01). La migración clases_03_dudas (§D-4): la tabla dudas con sus FK, su índice y el
// CHECK dudas_resuelta_completa; comentarios.duda_id con su FK en cascada y su índice; y el CHECK
// comentarios_un_solo_contexto reemplazado con el mismo nombre para tres contextos. La parte sobre
// datos de antes sigue el patrón de CAL-1A01: un esquema propio, las migraciones hasta la anterior,
// los datos y al final la de este encargo.

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
const SUFIJO_DEL_ENCARGO = "_clases_03_dudas"
// Nombre generado aquí (sin datos externos): SET y CREATE SCHEMA no admiten parámetros.
const ESQUEMA = `migracion_cl3b_${randomUUID().replaceAll("-", "").slice(0, 12)}`

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
  maestro: randomUUID(),
  alumna: randomUUID(),
  clase: randomUUID(),
  anuncio: randomUUID(),
  tarea: randomUUID(),
  entrega: randomUUID(),
  delMuro: randomUUID(),
  delHilo: randomUUID(),
}

describe("migración clases_03_dudas sobre datos de antes (CL3-B01)", () => {
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
        VALUES (${ids.maestro}::uuid, ${`m-${ids.maestro}@prueba.mx`}, 'x', 'Maestra D', 'maestra d', 'maestro', now()),
               (${ids.alumna}::uuid, ${`a-${ids.alumna}@prueba.mx`}, 'x', 'Alumna D', 'alumna d', 'estudiante', now())`
      await tx.$executeRaw`
        INSERT INTO clases (id, nombre, codigo_invitacion, maestro_id, actualizado_en)
        VALUES (${ids.clase}::uuid, 'Clase D', ${ids.clase.slice(0, 12)}, ${ids.maestro}::uuid, now())`
      await tx.$executeRaw`
        INSERT INTO publicaciones (id, clase_id, autor_id, tipo, titulo, texto, actualizado_en)
        VALUES (${ids.anuncio}::uuid, ${ids.clase}::uuid, ${ids.maestro}::uuid, 'anuncio', NULL, 'Aviso', now()),
               (${ids.tarea}::uuid, ${ids.clase}::uuid, ${ids.maestro}::uuid, 'tarea', 'Tarea D', 'Hazla', now())`
      await tx.$executeRaw`
        INSERT INTO tareas (id, clase_id, fecha_limite, puntos, acepta_tardias, actualizado_en)
        VALUES (${ids.tarea}::uuid, ${ids.clase}::uuid, '2030-01-15T00:00:00Z', 10, true, now())`
      await tx.$executeRaw`
        INSERT INTO entregas (id, tarea_id, alumno_id, estado, fecha_entrega, con_retraso, enlaces, version, actualizado_en)
        VALUES (${ids.entrega}::uuid, ${ids.tarea}::uuid, ${ids.alumna}::uuid, 'asignado', NULL, false, '[]'::jsonb, 0, now())`
      await tx.$executeRaw`
        INSERT INTO comentarios (id, publicacion_id, autor_id, texto, actualizado_en)
        VALUES (${ids.delMuro}::uuid, ${ids.anuncio}::uuid, ${ids.alumna}::uuid, 'Del muro', now())`
      await tx.$executeRaw`
        INSERT INTO comentarios (id, entrega_id, autor_id, texto, actualizado_en)
        VALUES (${ids.delHilo}::uuid, ${ids.entrega}::uuid, ${ids.alumna}::uuid, 'Del hilo', now())`
    })

    const nombre = todas[indice]
    if (nombre === undefined) throw new Error("Precondición: el nombre de la migración del encargo")
    await aplicar(nombre)
  }, 180_000)

  afterAll(async () => {
    await obtenerDb().$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${ESQUEMA}" CASCADE`)
  })

  it("CL3-B01: los comentarios de antes (del muro y del hilo privado) siguen igual y sin duda", async () => {
    const filas = await enElEsquema(
      (tx) => tx.$queryRaw<{ id: string; p: string | null; e: string | null; d: string | null }[]>`
        SELECT id::text AS id, publicacion_id::text AS p, entrega_id::text AS e, duda_id::text AS d
        FROM comentarios ORDER BY id`,
    )
    expect(filas).toEqual(
      [
        { id: ids.delMuro, p: ids.anuncio, e: null, d: null },
        { id: ids.delHilo, p: null, e: ids.entrega, d: null },
      ].sort((a, b) => (a.id < b.id ? -1 : 1)),
    )
  })

  it("CL3-B01: en el esquema migrado existen, validados, dudas_resuelta_completa y comentarios_un_solo_contexto (uno solo con ese nombre)", async () => {
    const nombres = ["comentarios_un_solo_contexto", "dudas_resuelta_completa"]
    const checks = await obtenerDb().$queryRaw<{ conname: string; convalidated: boolean }[]>`
      SELECT c.conname, c.convalidated FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = ${ESQUEMA} AND c.contype = 'c' AND c.conname = ANY(${nombres}::text[])
      ORDER BY c.conname`
    expect(checks).toEqual(nombres.map((conname) => ({ conname, convalidated: true })))
  })
})

describe("restricciones, llaves e índices de clases_03_dudas (CL3-B01)", () => {
  const escenario = async () => {
    const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const alumna = await crearUsuarioDePrueba(idsUsuarios, { rol: "estudiante" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, alumna.id, "codigo")
    const anuncio = await crearPublicacionDePrueba({ claseId: clase.id, autorId: maestro.id })
    const tarea = await crearTareaDePrueba({ claseId: clase.id, autorId: maestro.id })
    const entrega = await crearEntregaDePrueba({
      tareaId: tarea,
      alumnoId: alumna.id,
      estado: "asignado",
    })
    const duda = await crearDudaDePrueba({ claseId: clase.id, autorId: alumna.id })
    return { claseId: clase.id, maestro, alumna, anuncio, entrega, duda }
  }

  const insertarComentario = (
    autorId: string,
    contexto: { publicacionId?: string | null; entregaId?: string | null; dudaId?: string | null },
  ) => obtenerDb().$executeRaw`
    INSERT INTO comentarios (publicacion_id, entrega_id, duda_id, autor_id, texto, actualizado_en)
    VALUES (${contexto.publicacionId ?? null}::uuid, ${contexto.entregaId ?? null}::uuid,
            ${contexto.dudaId ?? null}::uuid, ${autorId}::uuid, 'Contexto', now())`

  it("CL3-B01: comentarios_un_solo_contexto rechaza cero o dos contextos entre los tres y acepta cada uno solo", async () => {
    const e = await escenario()
    const invalidos = [
      {},
      { publicacionId: e.anuncio, dudaId: e.duda },
      { entregaId: e.entrega, dudaId: e.duda },
      { publicacionId: e.anuncio, entregaId: e.entrega },
      { publicacionId: e.anuncio, entregaId: e.entrega, dudaId: e.duda },
    ]
    for (const contexto of invalidos) {
      await expect(
        insertarComentario(e.alumna.id, contexto),
        JSON.stringify(contexto),
      ).rejects.toThrow(/comentarios_un_solo_contexto/)
    }
    for (const contexto of [
      { publicacionId: e.anuncio },
      { entregaId: e.entrega },
      { dudaId: e.duda },
    ]) {
      expect(await insertarComentario(e.alumna.id, contexto), JSON.stringify(contexto)).toBe(1)
    }
  })

  it("CL3-B01: dudas_resuelta_completa rechaza la fecha sin quien la marcó y al revés", async () => {
    const e = await escenario()
    await expect(
      obtenerDb().duda.update({
        where: { id: e.duda },
        data: { resueltaEn: new Date("2026-10-29T12:00:00.000Z") },
        select: { id: true },
      }),
    ).rejects.toThrow(/dudas_resuelta_completa/)
    await expect(
      obtenerDb().duda.update({
        where: { id: e.duda },
        data: { resueltaPor: e.maestro.id },
        select: { id: true },
      }),
    ).rejects.toThrow(/dudas_resuelta_completa/)
    const fila = await obtenerDb().duda.findUnique({
      where: { id: e.duda },
      select: { resueltaEn: true, resueltaPor: true },
    })
    expect(fila).toEqual({ resueltaEn: null, resueltaPor: null })
  })

  it("CL3-B01: borrar la duda borra sus respuestas (cascada); borrar la clase borra sus dudas; el autor y quien la marcó no se pueden borrar (restrict)", async () => {
    const e = await escenario()
    const respuesta = await crearRespuestaDePrueba({ dudaId: e.duda, autorId: e.maestro.id })
    await obtenerDb().duda.delete({ where: { id: e.duda } })
    expect(await obtenerDb().comentario.count({ where: { id: respuesta } })).toBe(0)

    const otra = await escenario()
    const marcada = await crearDudaDePrueba({
      claseId: otra.claseId,
      autorId: otra.alumna.id,
      resueltaPor: otra.maestro.id,
    })
    await expect(obtenerDb().usuario.delete({ where: { id: otra.alumna.id } })).rejects.toThrow(
      /dudas_autor_id_fkey|Foreign key|foreign key/,
    )
    await expect(obtenerDb().usuario.delete({ where: { id: otra.maestro.id } })).rejects.toThrow()
    expect(await obtenerDb().duda.count({ where: { id: { in: [otra.duda, marcada] } } })).toBe(2)
    await obtenerDb().clase.delete({ where: { id: otra.claseId } })
    expect(await obtenerDb().duda.count({ where: { id: { in: [otra.duda, marcada] } } })).toBe(0)
  })

  it("CL3-B01: existen los índices dudas(clase_id, creado_en DESC, id DESC) y comentarios(duda_id, creado_en, id)", async () => {
    const indices = await obtenerDb().$queryRaw<{ indexname: string; indexdef: string }[]>`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN ('dudas_clase_id_creado_en_id_idx', 'comentarios_duda_id_creado_en_id_idx')
      ORDER BY indexname`
    expect(indices.map((i) => i.indexname)).toEqual([
      "comentarios_duda_id_creado_en_id_idx",
      "dudas_clase_id_creado_en_id_idx",
    ])
    expect(indices[0]?.indexdef).toContain("(duda_id, creado_en, id)")
    expect(indices[1]?.indexdef).toContain("(clase_id, creado_en DESC, id DESC)")
  })
})
