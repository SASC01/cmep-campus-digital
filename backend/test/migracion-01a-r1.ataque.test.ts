import { randomUUID } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { cerrarConexion, inicializarDb, obtenerDb } from "../src/adapters/db/cliente.js"
import { cargarEnv } from "../src/config/env.js"

// Ataques del Tester, ENTREGAS-01a ronda 1: la migración del encargo (§D-1) aplicada sobre datos de
// TAREAS-01 (tareas con rúbrica, materiales, anuncios, comentarios del muro y archivos confirmados,
// pendientes y descartados) y cada CHECK nuevo de PR-1A01 contra SQL parametrizado.
// Todo ocurre en un esquema propio, creado en la base desechable de la corrida (Testcontainers) y
// borrado al final: cada transacción fija `SET LOCAL search_path` a ese esquema (y a public, donde
// viven las extensiones), así que nunca toca las tablas de las demás pruebas ni campus_dev.
// Las migraciones se aplican en orden, cada una en su transacción, como prisma migrate deploy: hasta
// la de TAREAS-01, después los datos y al final la de ENTREGAS-01a.

type Tx = Parameters<Parameters<ReturnType<typeof obtenerDb>["$transaction"]>[0]>[0]

const MIGRACIONES = join(import.meta.dirname, "..", "prisma", "migrations")
const MIGRACION_DEL_ENCARGO = "20261012035613_entregas_e_hilo_privado"
// Nombre generado aquí (sin datos externos): SET y CREATE SCHEMA no admiten parámetros.
const ESQUEMA = `migracion_01a_${randomUUID().replaceAll("-", "").slice(0, 12)}`

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

// El texto de una migración es un archivo del repositorio (lo mismo que ejecuta prisma migrate
// deploy), no un dato: va tal cual, sentencia por sentencia, en una sola transacción.
const aplicar = (nombre: string): Promise<void> =>
  enElEsquema(async (tx) => {
    for (const sentencia of sentenciasDe(nombre)) await tx.$executeRawUnsafe(sentencia)
  })

class Revertir extends Error {}

// Corre el intento en su propia transacción y siempre la revierte. Devuelve si la base lo aceptó o,
// si no, el texto del error (que nombra la restricción violada).
const intentar = async (
  trabajo: (tx: Tx) => Promise<unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    await enElEsquema(async (tx) => {
      await trabajo(tx)
      throw new Revertir()
    })
    return { ok: false, error: "la transacción no se revirtió" }
  } catch (error) {
    if (error instanceof Revertir) return { ok: true }
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

const ids = {
  maestro: randomUUID(),
  alumno: randomUUID(),
  clase: randomUUID(),
  tema: randomUUID(),
  categoria: randomUUID(),
  tarea: randomUUID(),
  tareaVencida: randomUUID(),
  material: randomUUID(),
  anuncio: randomUUID(),
  comentario: randomUUID(),
  confirmado: randomUUID(),
  pendiente: randomUUID(),
  descartado: randomUUID(),
}

beforeAll(async () => {
  inicializarDb({ connectionString: cargarEnv().DATABASE_URL })
  await obtenerDb().$executeRawUnsafe(`CREATE SCHEMA "${ESQUEMA}"`)
  const todas = readdirSync(MIGRACIONES, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    .sort()
  const indice = todas.indexOf(MIGRACION_DEL_ENCARGO)
  if (indice < 1)
    throw new Error("Precondición: la migración del encargo existe y no es la primera")
  for (const nombre of todas.slice(0, indice)) await aplicar(nombre)

  // Datos de TAREAS-01, con SQL parametrizado, antes de la migración del encargo.
  await enElEsquema(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO usuarios (id, email, hash_contrasena, nombre, nombre_busqueda, rol, actualizado_en)
      VALUES (${ids.maestro}::uuid, ${`m-${ids.maestro}@prueba.mx`}, 'x', 'Maestra M', 'maestra m', 'maestro', now()),
             (${ids.alumno}::uuid, ${`a-${ids.alumno}@prueba.mx`}, 'x', 'Alumna M', 'alumna m', 'estudiante', now())`
    await tx.$executeRaw`
      INSERT INTO clases (id, nombre, codigo_invitacion, maestro_id, actualizado_en)
      VALUES (${ids.clase}::uuid, 'Clase M', ${ids.clase.slice(0, 12)}, ${ids.maestro}::uuid, now())`
    await tx.$executeRaw`
      INSERT INTO maestros_de_clase (clase_id, maestro_id) VALUES (${ids.clase}::uuid, ${ids.maestro}::uuid)`
    await tx.$executeRaw`
      INSERT INTO temas (id, clase_id, nombre, orden, actualizado_en)
      VALUES (${ids.tema}::uuid, ${ids.clase}::uuid, 'T', 0, now())`
    await tx.$executeRaw`
      INSERT INTO categorias (id, clase_id, nombre, peso, actualizado_en)
      VALUES (${ids.categoria}::uuid, ${ids.clase}::uuid, 'C', 100, now())`
    await tx.$executeRaw`
      INSERT INTO publicaciones (id, clase_id, autor_id, tipo, titulo, texto, tema_id, actualizado_en)
      VALUES (${ids.tarea}::uuid, ${ids.clase}::uuid, ${ids.maestro}::uuid, 'tarea', 'Tarea M', 'Instrucciones', ${ids.tema}::uuid, now()),
             (${ids.tareaVencida}::uuid, ${ids.clase}::uuid, ${ids.maestro}::uuid, 'tarea', 'Vencida', '', NULL, now()),
             (${ids.material}::uuid, ${ids.clase}::uuid, ${ids.maestro}::uuid, 'material', 'Material M', 'Texto', ${ids.tema}::uuid, now()),
             (${ids.anuncio}::uuid, ${ids.clase}::uuid, ${ids.maestro}::uuid, 'anuncio', NULL, 'Aviso', NULL, now())`
    await tx.$executeRaw`
      INSERT INTO tareas (id, clase_id, categoria_id, fecha_limite, puntos, acepta_tardias, actualizado_en)
      VALUES (${ids.tarea}::uuid, ${ids.clase}::uuid, ${ids.categoria}::uuid, now() + interval '5 days', 100, false, now()),
             (${ids.tareaVencida}::uuid, ${ids.clase}::uuid, NULL, now() - interval '5 days', 10, true, now())`
    await tx.$executeRaw`
      INSERT INTO criterios_rubrica (tarea_id, criterio, puntos_max, orden)
      VALUES (${ids.tarea}::uuid, 'Claridad', 50, 0), (${ids.tarea}::uuid, 'Fuentes', 50, 1)`
    await tx.$executeRaw`
      INSERT INTO comentarios (id, publicacion_id, autor_id, texto, actualizado_en)
      VALUES (${ids.comentario}::uuid, ${ids.anuncio}::uuid, ${ids.alumno}::uuid, 'Comentario del muro', now())`
    await tx.$executeRaw`
      INSERT INTO archivos (id, clase_id, publicacion_id, subido_por, clave_objeto, nombre, tipo, tamano, estado, actualizado_en)
      VALUES (${ids.confirmado}::uuid, ${ids.clase}::uuid, ${ids.tarea}::uuid, ${ids.maestro}::uuid, ${`materiales/${ids.confirmado}`}, 'a.pdf', 'application/pdf', 10, 'confirmado', now()),
             (${ids.pendiente}::uuid, ${ids.clase}::uuid, NULL, ${ids.maestro}::uuid, ${`materiales/${ids.pendiente}`}, 'b.pdf', 'application/pdf', 10, 'pendiente', now()),
             (${ids.descartado}::uuid, ${ids.clase}::uuid, NULL, ${ids.maestro}::uuid, ${`materiales/${ids.descartado}`}, 'c.pdf', 'application/pdf', 10, 'descartado', now())`
  })

  await aplicar(MIGRACION_DEL_ENCARGO)
}, 180_000)

afterAll(async () => {
  await obtenerDb().$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${ESQUEMA}" CASCADE`)
  await cerrarConexion()
})

const AHORA = new Date("2026-10-12T12:00:00.000Z")
const enlaces = (n: number): string =>
  JSON.stringify(Array.from({ length: n }, (_, i) => `https://ejemplo.mx/${String(i)}`))

interface DatosDeEntrega {
  id?: string
  tareaId?: string
  estado?: "asignado" | "entregado" | "calificado"
  fecha?: Date | null
  retraso?: boolean
  enlaces?: string
  version?: number
}

const insertarEntrega = (tx: Tx, d: DatosDeEntrega = {}) =>
  tx.$executeRaw`
    INSERT INTO entregas (id, tarea_id, alumno_id, estado, fecha_entrega, con_retraso, enlaces, version)
    VALUES (${d.id ?? randomUUID()}::uuid, ${d.tareaId ?? ids.tarea}::uuid, ${ids.alumno}::uuid,
            ${d.estado ?? "asignado"}::estado_entrega, ${d.fecha ?? null}::timestamptz,
            ${d.retraso ?? false}, ${d.enlaces ?? "[]"}::jsonb, ${d.version ?? 0})`

describe("ataque ENTREGAS-01a r1: la migración sobre datos de TAREAS-01", () => {
  it("las filas de antes sobreviven: las dos tareas con requiere_adjuntos = true y version = 0, sin cambiar acepta_tardias; el comentario, los tres archivos y los criterios quedan igual; ninguna entrega", async () => {
    const datos = await enElEsquema(async (tx) => ({
      tareas: await tx.$queryRaw<
        { id: string; requiere: boolean; version: number; tardias: boolean }[]
      >`
        SELECT id::text AS id, requiere_adjuntos AS requiere, version, acepta_tardias AS tardias
        FROM tareas WHERE clase_id = ${ids.clase}::uuid ORDER BY id`,
      comentario: await tx.$queryRaw<{ p: string | null; e: string | null }[]>`
        SELECT publicacion_id::text AS p, entrega_id::text AS e FROM comentarios WHERE id = ${ids.comentario}::uuid`,
      archivos: await tx.$queryRaw<
        { id: string; estado: string; p: string | null; e: string | null }[]
      >`
        SELECT id::text AS id, estado::text AS estado, publicacion_id::text AS p, entrega_id::text AS e
        FROM archivos WHERE clase_id = ${ids.clase}::uuid ORDER BY id`,
      criterios: await tx.$queryRaw<{ n: number }[]>`
        SELECT count(*)::int AS n FROM criterios_rubrica WHERE tarea_id = ${ids.tarea}::uuid`,
      entregas: await tx.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM entregas`,
    }))
    expect(datos.tareas).toEqual(
      [ids.tarea, ids.tareaVencida].sort().map((id) => ({
        id,
        requiere: true,
        version: 0,
        tardias: id === ids.tareaVencida,
      })),
    )
    expect(datos.comentario).toEqual([{ p: ids.anuncio, e: null }])
    expect(datos.archivos).toEqual(
      [
        { id: ids.confirmado, estado: "confirmado", p: ids.tarea, e: null },
        { id: ids.pendiente, estado: "pendiente", p: null, e: null },
        { id: ids.descartado, estado: "descartado", p: null, e: null },
      ].sort((a, b) => (a.id < b.id ? -1 : 1)),
    )
    expect([datos.criterios, datos.entregas]).toEqual([[{ n: 2 }], [{ n: 0 }]])
  })

  it("los siete CHECK de §D-1 existen en el esquema migrado con su nombre y quedaron validados sobre las filas que ya había", async () => {
    const nombres = [
      "archivos_confirmado_si_y_solo_si_contexto",
      "comentarios_un_solo_contexto",
      "entregas_asignada_sin_retraso_ni_enlaces",
      "entregas_enlaces_es_lista",
      "entregas_fecha_segun_estado",
      "entregas_version_no_negativa",
      "tareas_version_no_negativa",
    ]
    const filas = await obtenerDb().$queryRaw<{ conname: string; convalidated: boolean }[]>`
      SELECT c.conname, c.convalidated FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = ${ESQUEMA} AND c.contype = 'c' AND c.conname = ANY(${nombres}::text[])
      ORDER BY c.conname`
    expect(filas).toEqual(nombres.map((conname) => ({ conname, convalidated: true })))
  })
})

describe("ataque ENTREGAS-01a r1: cada CHECK con SQL parametrizado (PR-1A01, uno por uno; todo se revierte)", () => {
  it.each([
    ["asignada sin fecha, sin retraso ni enlaces", {}, null],
    [
      "entregada con fecha, con retraso y 5 enlaces",
      { estado: "entregado", fecha: AHORA, retraso: true, enlaces: enlaces(5) },
      null,
    ],
    ["calificada con fecha", { estado: "calificado", fecha: AHORA }, null],
    ["asignada con fecha", { fecha: AHORA }, "entregas_fecha_segun_estado"],
    ["entregada sin fecha", { estado: "entregado" }, "entregas_fecha_segun_estado"],
    ["calificada sin fecha", { estado: "calificado" }, "entregas_fecha_segun_estado"],
    ["asignada con retraso", { retraso: true }, "entregas_asignada_sin_retraso_ni_enlaces"],
    ["asignada con un enlace", { enlaces: enlaces(1) }, "entregas_asignada_sin_retraso_ni_enlaces"],
    [
      "entregada con 6 enlaces",
      { estado: "entregado", fecha: AHORA, enlaces: enlaces(6) },
      "entregas_enlaces_es_lista",
    ],
    [
      "entregada con enlaces que son texto",
      { estado: "entregado", fecha: AHORA, enlaces: '"https://ejemplo.mx"' },
      "entregas_enlaces_es_lista",
    ],
    ["con versión negativa", { version: -1 }, "entregas_version_no_negativa"],
  ] as const)("entrega %s", async (_etiqueta, datos, restriccion) => {
    const r = await intentar((tx) => insertarEntrega(tx, datos))
    const resumen = r.ok ? "aceptada" : (r.error.match(/entregas_[a-z_]+/)?.[0] ?? r.error)
    expect(resumen).toBe(restriccion ?? "aceptada")
  })

  it("entrega con enlaces que son un objeto: la base la rechaza (por el CHECK o por jsonb_array_length); nunca entra", async () => {
    const r = await intentar((tx) =>
      insertarEntrega(tx, { estado: "entregado", fecha: AHORA, enlaces: '{"a":1}' }),
    )
    expect(r.ok).toBe(false)
  })

  it("dos entregas del mismo alumno para la misma tarea: la segunda viola entregas_tarea_id_alumno_id_key", async () => {
    const r = await intentar(async (tx) => {
      await insertarEntrega(tx)
      await insertarEntrega(tx)
    })
    expect(
      r.ok ? "aceptada" : (r.error.match(/entregas_tarea_id_alumno_id_key/)?.[0] ?? r.error),
    ).toBe("entregas_tarea_id_alumno_id_key")
  })

  it.each([
    ["sin contexto", false, false, "comentarios_un_solo_contexto"],
    ["con los dos contextos", true, true, "comentarios_un_solo_contexto"],
    ["solo del muro", true, false, null],
    ["solo del hilo privado", false, true, null],
  ] as const)("comentario %s", async (_etiqueta, conPublicacion, conEntrega, restriccion) => {
    const r = await intentar(async (tx) => {
      const entregaId = randomUUID()
      await insertarEntrega(tx, { id: entregaId })
      await tx.$executeRaw`
        INSERT INTO comentarios (publicacion_id, entrega_id, autor_id, texto, actualizado_en)
        VALUES (${conPublicacion ? ids.anuncio : null}::uuid, ${conEntrega ? entregaId : null}::uuid,
                ${ids.alumno}::uuid, 'x', now())`
    })
    const resumen = r.ok ? "aceptado" : (r.error.match(/comentarios_[a-z_]+/)?.[0] ?? r.error)
    expect(resumen).toBe(restriccion ?? "aceptado")
  })

  it.each([
    [
      "confirmado sin contexto",
      "confirmado",
      false,
      false,
      "archivos_confirmado_si_y_solo_si_contexto",
    ],
    [
      "confirmado con los dos contextos",
      "confirmado",
      true,
      true,
      "archivos_confirmado_si_y_solo_si_contexto",
    ],
    [
      "pendiente con publicación",
      "pendiente",
      true,
      false,
      "archivos_confirmado_si_y_solo_si_contexto",
    ],
    [
      "pendiente con entrega",
      "pendiente",
      false,
      true,
      "archivos_confirmado_si_y_solo_si_contexto",
    ],
    [
      "descartado con entrega",
      "descartado",
      false,
      true,
      "archivos_confirmado_si_y_solo_si_contexto",
    ],
    ["confirmado en una entrega", "confirmado", false, true, null],
    ["confirmado en una publicación", "confirmado", true, false, null],
  ] as const)("archivo %s", async (_etiqueta, estado, conPublicacion, conEntrega, restriccion) => {
    const r = await intentar(async (tx) => {
      const entregaId = randomUUID()
      await insertarEntrega(tx, { id: entregaId, estado: "entregado", fecha: AHORA, version: 1 })
      await tx.$executeRaw`
        INSERT INTO archivos (clase_id, publicacion_id, entrega_id, subido_por, clave_objeto, nombre, tipo, tamano, estado, actualizado_en)
        VALUES (${ids.clase}::uuid, ${conPublicacion ? ids.tarea : null}::uuid, ${conEntrega ? entregaId : null}::uuid,
                ${ids.alumno}::uuid, ${`entregas/${randomUUID()}`}, 'x.pdf', 'application/pdf', 10,
                ${estado}::estado_archivo, now())`
    })
    const resumen = r.ok ? "aceptado" : (r.error.match(/archivos_[a-z_]+/)?.[0] ?? r.error)
    expect(resumen).toBe(restriccion ?? "aceptado")
  })

  it("tareas: version -1 viola tareas_version_no_negativa; 0 y 2147483647 se aceptan", async () => {
    const poner = (version: number) =>
      intentar(
        (tx) =>
          tx.$executeRaw`UPDATE tareas SET version = ${version} WHERE id = ${ids.tarea}::uuid`,
      )
    const menos = await poner(-1)
    expect(
      menos.ok ? "aceptada" : (menos.error.match(/tareas_version_no_negativa/)?.[0] ?? menos.error),
    ).toBe("tareas_version_no_negativa")
    expect(await poner(0)).toEqual({ ok: true })
    expect(await poner(2147483647)).toEqual({ ok: true })
  })

  it("borrar la publicación de una tarea con una entrega asignada y su hilo borra en cascada la entrega y el hilo", async () => {
    const r = await intentar(async (tx) => {
      const entregaId = randomUUID()
      await insertarEntrega(tx, { id: entregaId, tareaId: ids.tareaVencida })
      await tx.$executeRaw`
        INSERT INTO comentarios (entrega_id, autor_id, texto, actualizado_en)
        VALUES (${entregaId}::uuid, ${ids.alumno}::uuid, 'privado', now())`
      await tx.$executeRaw`DELETE FROM publicaciones WHERE id = ${ids.tareaVencida}::uuid`
      const [quedan] = await tx.$queryRaw<{ entregas: number; comentarios: number }[]>`
        SELECT (SELECT count(*)::int FROM entregas WHERE id = ${entregaId}::uuid) AS entregas,
               (SELECT count(*)::int FROM comentarios WHERE entrega_id = ${entregaId}::uuid) AS comentarios`
      expect(quedan).toEqual({ entregas: 0, comentarios: 0 })
    })
    expect(r).toEqual({ ok: true })
  })
})
