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
  inscribirDePrueba,
} from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import { crearForoDePrueba, crearParticipacionDePrueba } from "./ayudas-foros.js"

// FORO-01a. FORO-1A10 a FORO-1A13 y FORO-1A15: las dos migraciones del foro (foro_01_tipo_foro y
// foro_01_participaciones). La parte sobre datos de antes sigue el patrón de CL3-B01: un esquema
// propio, las migraciones hasta la anterior (20261109150104), los datos y al final las dos del foro.
// Lo demás corre sobre el esquema de la base desechable, con todas las migraciones.

type Tx = Parameters<Parameters<ReturnType<typeof obtenerDb>["$transaction"]>[0]>[0]

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

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
const PRIMERA_DEL_FORO = "_foro_01_tipo_foro"
const SEGUNDA_DEL_FORO = "_foro_01_participaciones"
// Nombre generado aquí (sin datos externos): SET y CREATE SCHEMA no admiten parámetros.
const ESQUEMA = `migracion_foro_${randomUUID().replaceAll("-", "").slice(0, 12)}`

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

// El texto de una migración es un archivo del repositorio, no un dato: va tal cual. Cada migración en
// su propia transacción: PostgreSQL no deja usar un valor nuevo del enum en la que lo crea.
const aplicar = (nombre: string): Promise<void> =>
  enElEsquema(async (tx) => {
    for (const sentencia of sentenciasDe(nombre)) await tx.$executeRawUnsafe(sentencia)
  })

const ids = {
  maestro: randomUUID(),
  alumna: randomUUID(),
  clase: randomUUID(),
  anuncio: randomUUID(),
  material: randomUUID(),
  tarea: randomUUID(),
  entrega: randomUUID(),
}

const fotoDeAntes = (tx: Tx) =>
  tx.$queryRaw<{ tabla: string; fila: string }[]>`
    SELECT 'publicaciones' AS tabla, row_to_json(p)::text AS fila FROM publicaciones p
    UNION ALL SELECT 'tareas', row_to_json(t)::text FROM tareas t
    UNION ALL SELECT 'entregas', row_to_json(e)::text FROM entregas e
    ORDER BY 1, 2`

describe("FORO-1A10: las dos migraciones del foro sobre datos de antes", () => {
  let antes: { tabla: string; fila: string }[] = []

  beforeAll(async () => {
    await obtenerDb().$executeRawUnsafe(`CREATE SCHEMA "${ESQUEMA}"`)
    const todas = readdirSync(MIGRACIONES, { withFileTypes: true })
      .filter((entrada) => entrada.isDirectory())
      .map((entrada) => entrada.name)
      .sort()
    const primera = todas.findIndex((nombre) => nombre.endsWith(PRIMERA_DEL_FORO))
    const segunda = todas.findIndex((nombre) => nombre.endsWith(SEGUNDA_DEL_FORO))
    if (primera < 1 || segunda !== primera + 1) {
      throw new Error("Precondición: las dos migraciones del foro existen, en orden y seguidas")
    }
    expect(todas[primera - 1]).toBe("20261109150104_admin_01_usuarios_y_movimientos")
    for (const nombre of todas.slice(0, primera)) await aplicar(nombre)

    await enElEsquema(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO usuarios (id, email, hash_contrasena, nombre, nombre_busqueda, rol, actualizado_en)
        VALUES (${ids.maestro}::uuid, ${`m-${ids.maestro}@prueba.mx`}, 'x', 'Maestra F', 'maestra f', 'maestro', now()),
               (${ids.alumna}::uuid, ${`a-${ids.alumna}@prueba.mx`}, 'x', 'Alumna F', 'alumna f', 'estudiante', now())`
      await tx.$executeRaw`
        INSERT INTO clases (id, nombre, codigo_invitacion, maestro_id, actualizado_en)
        VALUES (${ids.clase}::uuid, 'Clase F', ${ids.clase.slice(0, 12)}, ${ids.maestro}::uuid, now())`
      await tx.$executeRaw`
        INSERT INTO publicaciones (id, clase_id, autor_id, tipo, titulo, texto, actualizado_en)
        VALUES (${ids.anuncio}::uuid, ${ids.clase}::uuid, ${ids.maestro}::uuid, 'anuncio', NULL, 'Aviso', now()),
               (${ids.material}::uuid, ${ids.clase}::uuid, ${ids.maestro}::uuid, 'material', 'Lectura', 'Lee', now()),
               (${ids.tarea}::uuid, ${ids.clase}::uuid, ${ids.maestro}::uuid, 'tarea', 'Tarea F', 'Hazla', now())`
      await tx.$executeRaw`
        INSERT INTO tareas (id, clase_id, fecha_limite, puntos, acepta_tardias, actualizado_en)
        VALUES (${ids.tarea}::uuid, ${ids.clase}::uuid, '2030-01-15T00:00:00Z', 10, true, now())`
      await tx.$executeRaw`
        INSERT INTO entregas (id, tarea_id, alumno_id, estado, fecha_entrega, con_retraso, enlaces, version, actualizado_en)
        VALUES (${ids.entrega}::uuid, ${ids.tarea}::uuid, ${ids.alumna}::uuid, 'entregado', now(), false, '["https://ejemplo.mx"]'::jsonb, 1, now())`
      antes = await fotoDeAntes(tx)
    })

    for (const nombre of [todas[primera], todas[segunda]]) {
      if (nombre === undefined) throw new Error("Precondición: el nombre de la migración")
      await aplicar(nombre)
    }
  }, 180_000)

  afterAll(async () => {
    await obtenerDb().$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${ESQUEMA}" CASCADE`)
  })

  it("FORO-1A10: con un anuncio, un material y una tarea con entrega, las dos migraciones se aplican y no cambian ninguna fila", async () => {
    expect(antes).toHaveLength(5)
    expect(await enElEsquema(fotoDeAntes)).toEqual(antes)
    const vacia = await enElEsquema(
      (tx) => tx.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM participaciones_foro`,
    )
    expect(vacia).toEqual([{ n: 0 }])
  })

  it("FORO-1A10: en el esquema migrado, tipo_publicacion termina en foro y el CHECK del título lo admite, validado", async () => {
    const valores = await enElEsquema(
      (tx) => tx.$queryRaw<{ valor: string }[]>`
        SELECT unnest(enum_range(NULL::tipo_publicacion))::text AS valor`,
    )
    expect(valores.map((v) => v.valor)).toEqual(["anuncio", "material", "tarea", "foro"])
    const checks = await obtenerDb().$queryRaw<{ convalidated: boolean; definicion: string }[]>`
      SELECT c.convalidated, pg_get_constraintdef(c.oid) AS definicion FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = ${ESQUEMA} AND c.conname = 'publicaciones_titulo_segun_tipo'`
    expect(checks).toHaveLength(1)
    expect(checks[0]?.convalidated).toBe(true)
    expect(checks[0]?.definicion).toContain("'foro'")
  })
})

describe("FORO-1A11 a FORO-1A13: restricciones y cascadas", () => {
  const escenario = async () => {
    const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const alumna = await crearUsuarioDePrueba(idsUsuarios, { rol: "estudiante" })
    const alumno = await crearUsuarioDePrueba(idsUsuarios, { rol: "estudiante" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, alumna.id)
    await inscribirDePrueba(clase.id, alumno.id)
    return { claseId: clase.id, maestro, alumna, alumno }
  }

  const insertarPublicacion = (
    claseId: string,
    autorId: string,
    tipo: "anuncio" | "foro",
    titulo: string | null,
  ) => obtenerDb().$executeRaw`
    INSERT INTO publicaciones (clase_id, autor_id, tipo, titulo, texto, actualizado_en)
    VALUES (${claseId}::uuid, ${autorId}::uuid, ${tipo}::tipo_publicacion, ${titulo}, 'Texto', now())`

  it("FORO-1A11: un foro con título y su fila de tareas entra; un foro sin título viola publicaciones_titulo_segun_tipo; un anuncio con título sigue rechazado", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    expect(await obtenerDb().tarea.count({ where: { id: foroId } })).toBe(1)
    await expect(insertarPublicacion(e.claseId, e.maestro.id, "foro", null)).rejects.toThrow(
      /publicaciones_titulo_segun_tipo/,
    )
    await expect(
      insertarPublicacion(e.claseId, e.maestro.id, "anuncio", "Con título"),
    ).rejects.toThrow(/publicaciones_titulo_segun_tipo/)
    expect(await insertarPublicacion(e.claseId, e.maestro.id, "anuncio", null)).toBe(1)
  })

  it("FORO-1A12: dos principales del mismo autor en el mismo foro violan participaciones_foro_una_principal; dos réplicas del mismo autor y principales en foros distintos, no", async () => {
    const e = await escenario()
    const foroA = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const foroB = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principal = await crearParticipacionDePrueba({ foroId: foroA, autorId: e.alumna.id })
    await expect(
      crearParticipacionDePrueba({ foroId: foroA, autorId: e.alumna.id }),
    ).rejects.toThrow(/participaciones_foro_una_principal|Unique constraint/)
    await crearParticipacionDePrueba({ foroId: foroB, autorId: e.alumna.id })
    await crearParticipacionDePrueba({
      foroId: foroA,
      autorId: e.alumno.id,
      principalId: principal,
    })
    await crearParticipacionDePrueba({
      foroId: foroA,
      autorId: e.alumno.id,
      principalId: principal,
    })
    await crearParticipacionDePrueba({
      foroId: foroA,
      autorId: e.alumna.id,
      principalId: principal,
    })
    expect(await obtenerDb().participacionForo.count({ where: { foroId: foroA } })).toBe(4)
    expect(
      await obtenerDb().participacionForo.count({
        where: { foroId: foroA, autorId: e.alumna.id, principalId: null },
      }),
    ).toBe(1)
  })

  it("FORO-1A13: borrar la publicación del foro se lleva tareas, participaciones, entregas y sus comentarios; borrar una principal se lleva sus réplicas", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principal = await crearParticipacionDePrueba({ foroId, autorId: e.alumna.id })
    await crearParticipacionDePrueba({ foroId, autorId: e.alumno.id, principalId: principal })
    const otra = await crearParticipacionDePrueba({ foroId, autorId: e.alumno.id })
    const replicaDeOtra = await crearParticipacionDePrueba({
      foroId,
      autorId: e.alumna.id,
      principalId: otra,
    })
    const entrega = await crearEntregaDePrueba({ tareaId: foroId, alumnoId: e.alumna.id })
    await obtenerDb().comentario.create({
      data: { entregaId: entrega, autorId: e.maestro.id, texto: "Devolución" },
      select: { id: true },
    })

    await obtenerDb().participacionForo.delete({ where: { id: otra } })
    expect(await obtenerDb().participacionForo.count({ where: { id: replicaDeOtra } })).toBe(0)
    expect(await obtenerDb().participacionForo.count({ where: { foroId } })).toBe(2)

    await obtenerDb().publicacion.delete({ where: { id: foroId } })
    expect(await obtenerDb().tarea.count({ where: { id: foroId } })).toBe(0)
    expect(await obtenerDb().participacionForo.count({ where: { foroId } })).toBe(0)
    expect(await obtenerDb().entrega.count({ where: { tareaId: foroId } })).toBe(0)
    expect(await obtenerDb().comentario.count({ where: { entregaId: entrega } })).toBe(0)
  })

  it("FORO-1A13: el autor de una participación no se puede borrar (restrict)", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    await crearParticipacionDePrueba({ foroId, autorId: e.alumna.id })
    await expect(obtenerDb().usuario.delete({ where: { id: e.alumna.id } })).rejects.toThrow()
    expect(await obtenerDb().participacionForo.count({ where: { foroId } })).toBe(1)
  })
})

describe("FORO-1A15: los índices de participaciones_foro", () => {
  it("FORO-1A15: existen los tres índices y el único parcial con su definición", async () => {
    const indices = await obtenerDb().$queryRaw<{ indexname: string; indexdef: string }[]>`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'participaciones_foro'
      ORDER BY indexname`
    const definicion = (nombre: string) => indices.find((i) => i.indexname === nombre)?.indexdef
    expect(indices.map((i) => i.indexname)).toEqual([
      "participaciones_foro_foro_id_autor_id_creado_en_id_idx",
      "participaciones_foro_foro_id_principal_id_creado_en_id_idx",
      "participaciones_foro_pkey",
      "participaciones_foro_principal_id_creado_en_id_idx",
      "participaciones_foro_una_principal",
    ])
    expect(definicion("participaciones_foro_foro_id_principal_id_creado_en_id_idx")).toContain(
      "(foro_id, principal_id, creado_en, id)",
    )
    expect(definicion("participaciones_foro_principal_id_creado_en_id_idx")).toContain(
      "(principal_id, creado_en, id)",
    )
    expect(definicion("participaciones_foro_foro_id_autor_id_creado_en_id_idx")).toContain(
      "(foro_id, autor_id, creado_en, id)",
    )
    const unica = definicion("participaciones_foro_una_principal")
    expect(unica).toContain("CREATE UNIQUE INDEX")
    expect(unica).toContain("(foro_id, autor_id) WHERE (principal_id IS NULL)")
  })

  // Desviación declarada: con foro_id = $1, PostgreSQL resuelve el conteo de réplicas con el índice
  // (foro_id, principal_id, creado_en, id), que también lo sirve sin recorrer la tabla. El índice
  // (principal_id, creado_en, id) es el de la lista de réplicas y el de la búsqueda de la cascada (la
  // FK sobre sí misma, principal_id = $1): esos dos planes lo nombran.
  it("FORO-1A15: con seqscan apagado, la lista de réplicas y la búsqueda de la cascada usan participaciones_foro_principal_id_creado_en_id_idx, y el conteo de réplicas usa un índice sin recorrer la tabla", async () => {
    const foroId = randomUUID()
    const principalId = randomUUID()
    const [conteo, lista, cascada] = await obtenerDb().$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL enable_seqscan = off")
        const planes = [
          await tx.$queryRaw<{ "QUERY PLAN": string }[]>`
            EXPLAIN SELECT principal_id, count(*) FROM participaciones_foro
            WHERE foro_id = ${foroId}::uuid AND principal_id IN (${principalId}::uuid)
            GROUP BY principal_id`,
          await tx.$queryRaw<{ "QUERY PLAN": string }[]>`
            EXPLAIN SELECT id FROM participaciones_foro
            WHERE principal_id = ${principalId}::uuid ORDER BY creado_en, id LIMIT 21`,
          await tx.$queryRaw<{ "QUERY PLAN": string }[]>`
            EXPLAIN SELECT 1 FROM participaciones_foro WHERE principal_id = ${principalId}::uuid`,
        ]
        return planes.map((filas) => filas.map((f) => f["QUERY PLAN"]).join(" | "))
      },
      { timeout: 10_000 },
    )
    expect(lista).toContain("participaciones_foro_principal_id_creado_en_id_idx")
    expect(cascada).toContain("participaciones_foro_principal_id_creado_en_id_idx")
    expect(conteo).toMatch(/Index (Only )?Scan using participaciones_foro_\w+_idx/)
    for (const plan of [conteo, lista, cascada]) expect(plan).not.toContain("Seq Scan")
  })
})
