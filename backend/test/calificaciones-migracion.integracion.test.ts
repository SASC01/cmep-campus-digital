import { randomUUID } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { crearArchivoDeEntregaDePrueba, crearEntregaDePrueba } from "./ayudas-entregas.js"
import { crearCriteriosDePrueba, crearTareaDePrueba } from "./ayudas-tareas.js"

// CALIFICACIONES-01a (CAL-1A01, CAL-1A19 con puntajes por SQL y CAL-1A20). La migración calificaciones y
// sus objetos a mano (§D-1): los CHECK, la FK diferida de puntajes_rubrica.criterio_id y el borrado en
// cascada de una tarea o una clase con puntajes. Cada escritura que viola una restricción es SQL
// parametrizado y la base la rechaza con su nombre. La migración se aplica además, en un esquema
// propio, sobre datos de ENTREGAS-01 (entregas asignadas y entregadas, con archivos, enlaces e hilos).

type Tx = Parameters<Parameters<ReturnType<typeof obtenerDb>["$transaction"]>[0]>[0]

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  alumno: UsuarioDePrueba
  otroAlumno: UsuarioDePrueba
  tercerAlumno: UsuarioDePrueba
  tareaId: string
  criterios: string[]
}

// Una tarea con dos criterios en una clase con tres alumnos inscritos.
const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
  const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumna Calif" })
  const otroAlumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumno Calif" })
  const tercerAlumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Tercer Calif" })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  for (const a of [alumno, otroAlumno, tercerAlumno]) await inscribirDePrueba(clase.id, a.id)
  const tareaId = await crearTareaDePrueba({ claseId: clase.id, autorId: maestro.id, puntos: 10 })
  await crearCriteriosDePrueba(tareaId, 2)
  const criterios = (
    await obtenerDb().criterioRubrica.findMany({
      where: { tareaId },
      orderBy: { orden: "asc" },
      select: { id: true },
    })
  ).map((c) => c.id)
  return { claseId: clase.id, maestro, alumno, otroAlumno, tercerAlumno, tareaId, criterios }
}

const insertarEntrega = (
  e: Escenario,
  d: {
    estado: "asignado" | "entregado" | "calificado"
    fechaEntrega?: Date | null
    conRetraso?: boolean
    enlaces?: string
    calificacion?: number | null
    fechaCalificacion?: Date | null
  },
) =>
  obtenerDb().$executeRaw`
    INSERT INTO entregas (tarea_id, alumno_id, estado, fecha_entrega, con_retraso, enlaces,
                          calificacion, fecha_calificacion)
    VALUES (${e.tareaId}::uuid, ${e.alumno.id}::uuid, ${d.estado}::estado_entrega,
            ${d.fechaEntrega ?? null}::timestamptz, ${d.conRetraso ?? false}, ${d.enlaces ?? "[]"}::jsonb,
            ${d.calificacion ?? null}::numeric, ${d.fechaCalificacion ?? null}::timestamptz)`

const insertarPuntaje = (entregaId: string, criterioId: string, puntos: number) =>
  obtenerDb().$executeRaw`
    INSERT INTO puntajes_rubrica (entrega_id, criterio_id, puntos)
    VALUES (${entregaId}::uuid, ${criterioId}::uuid, ${puntos}::numeric)`

const contar = async (
  tabla: "criterios" | "entregas" | "puntajes" | "comentarios",
  tareaId: string,
) => {
  const db = obtenerDb()
  if (tabla === "criterios") return db.criterioRubrica.count({ where: { tareaId } })
  if (tabla === "entregas") return db.entrega.count({ where: { tareaId } })
  if (tabla === "puntajes") return db.puntajeRubrica.count({ where: { entrega: { tareaId } } })
  return db.comentario.count({ where: { entrega: { tareaId } } })
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen: crearAlmacenEnMemoria() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const AHORA = new Date()

describe("migración calificaciones: CHECK (CAL-1A01)", () => {
  it("CAL-1A01: entregas_calificacion_segun_estado rechaza calificado sin calificación, entregado con calificación, calificación sin fecha de calificación y al revés", async () => {
    const e = await escenario()
    const restriccion = /entregas_calificacion_segun_estado/
    await expect(
      insertarEntrega(e, { estado: "calificado", fechaEntrega: AHORA, fechaCalificacion: AHORA }),
    ).rejects.toThrow(restriccion)
    await expect(
      insertarEntrega(e, {
        estado: "entregado",
        fechaEntrega: AHORA,
        calificacion: 5,
        fechaCalificacion: AHORA,
      }),
    ).rejects.toThrow(restriccion)
    await expect(
      insertarEntrega(e, { estado: "calificado", fechaEntrega: AHORA, calificacion: 5 }),
    ).rejects.toThrow(restriccion)
    await expect(
      insertarEntrega(e, { estado: "entregado", fechaEntrega: AHORA, fechaCalificacion: AHORA }),
    ).rejects.toThrow(restriccion)
    expect(await contar("entregas", e.tareaId)).toBe(0)
    await expect(
      insertarEntrega(e, {
        estado: "calificado",
        fechaEntrega: AHORA,
        calificacion: 5,
        fechaCalificacion: AHORA,
      }),
    ).resolves.toBe(1)
  })

  it("CAL-1A01: entregas_calificacion_en_rango y puntajes_rubrica_puntos_en_rango rechazan −0.01 y 1000.01; 0 y 1000 pasan", async () => {
    const e = await escenario()
    for (const fuera of [-0.01, 1000.01]) {
      await expect(
        insertarEntrega(e, {
          estado: "calificado",
          fechaEntrega: AHORA,
          calificacion: fuera,
          fechaCalificacion: AHORA,
        }),
      ).rejects.toThrow(/entregas_calificacion_en_rango/)
    }
    const entregaId = await crearEntregaDePrueba({
      tareaId: e.tareaId,
      alumnoId: e.alumno.id,
      estado: "calificado",
      calificacion: 1000,
    })
    const [c1, c2] = e.criterios
    if (c1 === undefined || c2 === undefined) throw new Error("Precondición: dos criterios")
    for (const fuera of [-0.01, 1000.01]) {
      await expect(insertarPuntaje(entregaId, c1, fuera)).rejects.toThrow(
        /puntajes_rubrica_puntos_en_rango/,
      )
    }
    await expect(insertarPuntaje(entregaId, c1, 0)).resolves.toBe(1)
    await expect(insertarPuntaje(entregaId, c2, 1000)).resolves.toBe(1)
    const otraId = await crearEntregaDePrueba({
      tareaId: e.tareaId,
      alumnoId: e.otroAlumno.id,
      estado: "calificado",
      calificacion: 0,
    })
    expect(otraId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it("CAL-1A01: con P-03, entregas_fecha_segun_estado acepta calificado sin fecha de entrega y sigue rechazando asignado con fecha y entregado sin fecha", async () => {
    const e = await escenario()
    await expect(insertarEntrega(e, { estado: "asignado", fechaEntrega: AHORA })).rejects.toThrow(
      /entregas_fecha_segun_estado/,
    )
    await expect(insertarEntrega(e, { estado: "entregado" })).rejects.toThrow(
      /entregas_fecha_segun_estado/,
    )
    await expect(
      insertarEntrega(e, { estado: "calificado", calificacion: 0, fechaCalificacion: AHORA }),
    ).resolves.toBe(1)
  })

  it("CAL-1A01: entregas_sin_fecha_sin_retraso_ni_enlaces rechaza calificado sin fecha de entrega con retraso o con enlaces", async () => {
    const e = await escenario()
    const base = { estado: "calificado", calificacion: 0, fechaCalificacion: AHORA } as const
    await expect(insertarEntrega(e, { ...base, conRetraso: true })).rejects.toThrow(
      /entregas_sin_fecha_sin_retraso_ni_enlaces/,
    )
    await expect(
      insertarEntrega(e, { ...base, enlaces: JSON.stringify(["https://ejemplo.com/"]) }),
    ).rejects.toThrow(/entregas_sin_fecha_sin_retraso_ni_enlaces/)
    expect(await contar("entregas", e.tareaId)).toBe(0)
    // Con fecha de entrega, una calificada sí lleva retraso y enlaces.
    await expect(
      insertarEntrega(e, {
        ...base,
        fechaEntrega: AHORA,
        conRetraso: true,
        enlaces: JSON.stringify(["https://ejemplo.com/"]),
      }),
    ).resolves.toBe(1)
  })
})

describe("migración calificaciones: la FK diferida de puntajes_rubrica.criterio_id (CAL-1A01, Enmienda 1, M-01)", () => {
  it("CAL-1A01: puntajes_rubrica_criterio_id_fkey existe con condeferrable y condeferred verdaderos, NO ACTION al borrar; la de entrega_id es CASCADE", async () => {
    const filas = await obtenerDb().$queryRaw<
      { conname: string; condeferrable: boolean; condeferred: boolean; confdeltype: string }[]
    >`
      SELECT c.conname, c.condeferrable, c.condeferred, c.confdeltype::text AS confdeltype
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE t.relname = 'puntajes_rubrica' AND c.contype = 'f'
        AND t.relnamespace = current_schema()::regnamespace
      ORDER BY c.conname`
    expect(filas).toEqual([
      {
        conname: "puntajes_rubrica_criterio_id_fkey",
        condeferrable: true,
        condeferred: true,
        confdeltype: "a",
      },
      {
        conname: "puntajes_rubrica_entrega_id_fkey",
        condeferrable: false,
        condeferred: false,
        confdeltype: "c",
      },
    ])
  })

  it("CAL-1A01: borrar un criterio con puntajes falla al confirmar la transacción y no deja nada borrado", async () => {
    const e = await escenario()
    const [c1] = e.criterios
    if (c1 === undefined) throw new Error("Precondición: un criterio")
    const entregaId = await crearEntregaDePrueba({
      tareaId: e.tareaId,
      alumnoId: e.alumno.id,
      estado: "calificado",
      calificacion: 4,
    })
    await insertarPuntaje(entregaId, c1, 4)

    // Dentro de la transacción, el DELETE pasa (la comprobación está diferida); falla al confirmar.
    let borradoDentro = -1
    await expect(
      obtenerDb().$transaction(async (tx: Tx) => {
        borradoDentro = (await tx.criterioRubrica.deleteMany({ where: { id: c1 } })).count
      }),
    ).rejects.toThrow(/ForeignKeyConstraintViolation|puntajes_rubrica_criterio_id_fkey/)
    expect(borradoDentro).toBe(1)
    // Fuera de una transacción explícita, la sentencia se confirma sola y también falla.
    await expect(obtenerDb().criterioRubrica.deleteMany({ where: { id: c1 } })).rejects.toThrow(
      /ForeignKeyConstraintViolation|puntajes_rubrica_criterio_id_fkey/,
    )

    expect(await contar("criterios", e.tareaId)).toBe(2)
    expect(await contar("puntajes", e.tareaId)).toBe(1)
  })

  it("CAL-1A01: borrar la publicación de una tarea con criterios, entregas y puntajes no falla y se lleva todo", async () => {
    const e = await escenario()
    const [c1, c2] = e.criterios
    if (c1 === undefined || c2 === undefined) throw new Error("Precondición: dos criterios")
    const entregaId = await crearEntregaDePrueba({
      tareaId: e.tareaId,
      alumnoId: e.alumno.id,
      estado: "calificado",
      calificacion: 7,
    })
    await insertarPuntaje(entregaId, c1, 3)
    await insertarPuntaje(entregaId, c2, 4)

    await expect(obtenerDb().publicacion.deleteMany({ where: { id: e.tareaId } })).resolves.toEqual(
      { count: 1 },
    )
    expect(await obtenerDb().tarea.count({ where: { id: e.tareaId } })).toBe(0)
    expect(await contar("criterios", e.tareaId)).toBe(0)
    expect(await contar("entregas", e.tareaId)).toBe(0)
    expect(await obtenerDb().puntajeRubrica.count({ where: { entregaId } })).toBe(0)
  })
})

describe("borrado en cascada con puntajes (CAL-1A19 por SQL y CAL-1A20; Enmienda 1, M-01)", () => {
  // La tarea con dos criterios, dos entregas calificadas con puntajes, una entregada sin calificar,
  // un comentario de devolución en el hilo de una calificada y archivos de entrega confirmados.
  const conPuntajes = async (e: Escenario) => {
    const [c1, c2] = e.criterios
    if (c1 === undefined || c2 === undefined) throw new Error("Precondición: dos criterios")
    const calificadas: string[] = []
    for (const alumno of [e.alumno, e.otroAlumno]) {
      const entregaId = await crearEntregaDePrueba({
        tareaId: e.tareaId,
        alumnoId: alumno.id,
        estado: "calificado",
        calificacion: 7,
      })
      await insertarPuntaje(entregaId, c1, 3)
      await insertarPuntaje(entregaId, c2, 4)
      calificadas.push(entregaId)
    }
    const entregada = await crearEntregaDePrueba({
      tareaId: e.tareaId,
      alumnoId: e.tercerAlumno.id,
      estado: "entregado",
    })
    const [primera] = calificadas
    if (primera === undefined) throw new Error("Precondición: una calificada")
    await obtenerDb().comentario.create({
      data: { entregaId: primera, autorId: e.maestro.id, texto: "Buen trabajo" },
      select: { id: true },
    })
    const archivos = []
    for (const [entregaId, alumnoId] of [
      [primera, e.alumno.id],
      [entregada, e.tercerAlumno.id],
    ] as const) {
      archivos.push(
        await crearArchivoDeEntregaDePrueba({
          claseId: e.claseId,
          tareaId: e.tareaId,
          alumnoId,
          estado: "confirmado",
          entregaId,
        }),
      )
    }
    expect(await contar("puntajes", e.tareaId)).toBe(4)
    return { archivos: archivos.map((a) => a.id) }
  }

  it("CAL-1A19: el admin borra por la API, con ?confirmar=entregas, una tarea con rúbrica y puntajes (escritos por SQL): 204, sin 500 ni 23503, y no queda nada", async () => {
    const e = await escenario()
    const { archivos } = await conPuntajes(e)

    const respuesta = await obtenerApp().inject({
      method: "DELETE",
      url: `/api/clases/${e.claseId}/tareas/${e.tareaId}?confirmar=entregas`,
      headers: { authorization: `Bearer ${await tokenDelAdminDePrueba()}` },
    })

    expect(respuesta.statusCode, respuesta.body).toBe(204)
    expect(await obtenerDb().tarea.count({ where: { id: e.tareaId } })).toBe(0)
    expect(await obtenerDb().publicacion.count({ where: { id: e.tareaId } })).toBe(0)
    expect(await contar("criterios", e.tareaId)).toBe(0)
    expect(await contar("entregas", e.tareaId)).toBe(0)
    expect(await contar("puntajes", e.tareaId)).toBe(0)
    expect(await contar("comentarios", e.tareaId)).toBe(0)
    const filas = await obtenerDb().archivo.findMany({
      where: { id: { in: archivos } },
      select: { estado: true, entregaId: true, publicacionId: true },
    })
    expect(filas).toEqual(
      archivos.map(() => ({ estado: "descartado", entregaId: null, publicacionId: null })),
    )
  })

  it("CAL-1A20: borrar con SQL la clase de una tarea calificada con rúbrica no falla y no deja tareas, criterios, entregas ni puntajes de esa clase", async () => {
    const e = await escenario()
    await conPuntajes(e)
    const entregas = (
      await obtenerDb().entrega.findMany({ where: { tareaId: e.tareaId }, select: { id: true } })
    ).map((f) => f.id)

    await expect(
      obtenerDb().$executeRaw`DELETE FROM clases WHERE id = ${e.claseId}::uuid`,
    ).resolves.toBe(1)

    expect(await obtenerDb().tarea.count({ where: { claseId: e.claseId } })).toBe(0)
    expect(await contar("criterios", e.tareaId)).toBe(0)
    expect(await contar("entregas", e.tareaId)).toBe(0)
    expect(await obtenerDb().puntajeRubrica.count({ where: { entregaId: { in: entregas } } })).toBe(
      0,
    )
    expect(await obtenerDb().archivo.count({ where: { claseId: e.claseId } })).toBe(0)
  })

  it("CAL-1A20: la limpieza normal de las pruebas (borrarMovimientosYClasesDePrueba) con puntajes no falla", async () => {
    const e = await escenario()
    await conPuntajes(e)
    const propias = [e.claseId]

    await expect(borrarMovimientosYClasesDePrueba(propias)).resolves.toBeUndefined()

    expect(await obtenerDb().clase.count({ where: { id: e.claseId } })).toBe(0)
    expect(await contar("puntajes", e.tareaId)).toBe(0)
  })
})

// La migración sobre datos de ENTREGAS-01, en un esquema propio de la base desechable (mismo método
// que migracion-01a-r1): cada transacción fija SET LOCAL search_path a ese esquema y a public (donde
// viven las extensiones). Las migraciones se aplican en orden, cada una en su transacción: hasta la de
// ENTREGAS-01, después los datos y al final la de este encargo.
const MIGRACIONES = join(import.meta.dirname, "..", "prisma", "migrations")
const SUFIJO_DEL_ENCARGO = "_calificaciones"
// Nombre generado aquí (sin datos externos): SET y CREATE SCHEMA no admiten parámetros.
const ESQUEMA = `migracion_cal_${randomUUID().replaceAll("-", "").slice(0, 12)}`

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

// Revierte la transacción de un caso que solo comprueba que una escritura es posible.
class Revertir extends Error {
  constructor(readonly actualizadas: number) {
    super("Revertir")
  }
}

const ids = {
  maestro: randomUUID(),
  alumna: randomUUID(),
  alumno: randomUUID(),
  clase: randomUUID(),
  tarea: randomUUID(),
  asignada: randomUUID(),
  entregada: randomUUID(),
  archivo: randomUUID(),
  comentario: randomUUID(),
}

describe("migración calificaciones sobre datos de ENTREGAS-01 (CAL-1A01)", () => {
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
        VALUES (${ids.maestro}::uuid, ${`m-${ids.maestro}@prueba.mx`}, 'x', 'Maestra C', 'maestra c', 'maestro', now()),
               (${ids.alumna}::uuid, ${`a-${ids.alumna}@prueba.mx`}, 'x', 'Alumna C', 'alumna c', 'estudiante', now()),
               (${ids.alumno}::uuid, ${`b-${ids.alumno}@prueba.mx`}, 'x', 'Alumno C', 'alumno c', 'estudiante', now())`
      await tx.$executeRaw`
        INSERT INTO clases (id, nombre, codigo_invitacion, maestro_id, actualizado_en)
        VALUES (${ids.clase}::uuid, 'Clase C', ${ids.clase.slice(0, 12)}, ${ids.maestro}::uuid, now())`
      await tx.$executeRaw`
        INSERT INTO maestros_de_clase (clase_id, maestro_id) VALUES (${ids.clase}::uuid, ${ids.maestro}::uuid)`
      await tx.$executeRaw`
        INSERT INTO publicaciones (id, clase_id, autor_id, tipo, titulo, texto, actualizado_en)
        VALUES (${ids.tarea}::uuid, ${ids.clase}::uuid, ${ids.maestro}::uuid, 'tarea', 'Tarea C', 'Instrucciones', now())`
      await tx.$executeRaw`
        INSERT INTO tareas (id, clase_id, fecha_limite, puntos, acepta_tardias, actualizado_en)
        VALUES (${ids.tarea}::uuid, ${ids.clase}::uuid, now() + interval '5 days', 10, true, now())`
      await tx.$executeRaw`
        INSERT INTO criterios_rubrica (tarea_id, criterio, puntos_max, orden)
        VALUES (${ids.tarea}::uuid, 'Claridad', 5, 0), (${ids.tarea}::uuid, 'Fuentes', 5, 1)`
      await tx.$executeRaw`
        INSERT INTO entregas (id, tarea_id, alumno_id, estado, fecha_entrega, con_retraso, enlaces, version, actualizado_en)
        VALUES (${ids.asignada}::uuid, ${ids.tarea}::uuid, ${ids.alumna}::uuid, 'asignado', NULL, false, '[]'::jsonb, 2, now()),
               (${ids.entregada}::uuid, ${ids.tarea}::uuid, ${ids.alumno}::uuid, 'entregado', now(), true, ${JSON.stringify(["https://ejemplo.mx/a"])}::jsonb, 1, now())`
      await tx.$executeRaw`
        INSERT INTO archivos (id, clase_id, entrega_id, subido_por, clave_objeto, nombre, tipo, tamano, estado, actualizado_en)
        VALUES (${ids.archivo}::uuid, ${ids.clase}::uuid, ${ids.entregada}::uuid, ${ids.alumno}::uuid,
                ${`entregas/${ids.tarea}/${ids.alumno}/${ids.archivo}`}, 't.pdf', 'application/pdf', 10, 'confirmado', now())`
      await tx.$executeRaw`
        INSERT INTO comentarios (id, entrega_id, autor_id, texto, actualizado_en)
        VALUES (${ids.comentario}::uuid, ${ids.asignada}::uuid, ${ids.alumna}::uuid, 'Pregunta del hilo', now())`
    })

    const nombre = todas[indice]
    if (nombre === undefined) throw new Error("Precondición: el nombre de la migración del encargo")
    await aplicar(nombre)
  }, 180_000)

  afterAll(async () => {
    await obtenerDb().$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${ESQUEMA}" CASCADE`)
  })

  it("CAL-1A01: la migración aplica sobre entregas asignadas y entregadas con archivos, enlaces e hilos, que quedan igual y sin calificación", async () => {
    const datos = await enElEsquema(async (tx) => ({
      entregas: await tx.$queryRaw<
        {
          id: string
          estado: string
          retraso: boolean
          enlaces: unknown
          version: number
          calificacion: string | null
          fecha: Date | null
        }[]
      >`
        SELECT id::text AS id, estado::text AS estado, con_retraso AS retraso, enlaces, version,
               calificacion::text AS calificacion, fecha_calificacion AS fecha
        FROM entregas WHERE tarea_id = ${ids.tarea}::uuid ORDER BY id`,
      archivo: await tx.$queryRaw<{ e: string | null; estado: string }[]>`
        SELECT entrega_id::text AS e, estado::text AS estado FROM archivos WHERE id = ${ids.archivo}::uuid`,
      comentario: await tx.$queryRaw<{ e: string | null }[]>`
        SELECT entrega_id::text AS e FROM comentarios WHERE id = ${ids.comentario}::uuid`,
      puntajes: await tx.$queryRaw<
        { n: number }[]
      >`SELECT count(*)::int AS n FROM puntajes_rubrica`,
    }))
    expect(datos.entregas).toEqual(
      [
        {
          id: ids.asignada,
          estado: "asignado",
          retraso: false,
          enlaces: [],
          version: 2,
          calificacion: null,
          fecha: null,
        },
        {
          id: ids.entregada,
          estado: "entregado",
          retraso: true,
          enlaces: ["https://ejemplo.mx/a"],
          version: 1,
          calificacion: null,
          fecha: null,
        },
      ].sort((a, b) => (a.id < b.id ? -1 : 1)),
    )
    expect(datos.archivo).toEqual([{ e: ids.entregada, estado: "confirmado" }])
    expect(datos.comentario).toEqual([{ e: ids.asignada }])
    expect(datos.puntajes).toEqual([{ n: 0 }])
  })

  it("CAL-1A01: los CHECK nuevos y el reemplazado existen validados en el esquema migrado, y la FK de criterio_id es diferida", async () => {
    const nombres = [
      "entregas_calificacion_en_rango",
      "entregas_calificacion_segun_estado",
      "entregas_fecha_segun_estado",
      "entregas_sin_fecha_sin_retraso_ni_enlaces",
      "puntajes_rubrica_puntos_en_rango",
    ]
    const checks = await obtenerDb().$queryRaw<{ conname: string; convalidated: boolean }[]>`
      SELECT c.conname, c.convalidated FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = ${ESQUEMA} AND c.contype = 'c' AND c.conname = ANY(${nombres}::text[])
      ORDER BY c.conname`
    expect(checks).toEqual(nombres.map((conname) => ({ conname, convalidated: true })))
    const fk = await obtenerDb().$queryRaw<{ condeferrable: boolean; condeferred: boolean }[]>`
      SELECT c.condeferrable, c.condeferred FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = ${ESQUEMA} AND c.conname = 'puntajes_rubrica_criterio_id_fkey'`
    expect(fk).toEqual([{ condeferrable: true, condeferred: true }])
  })

  it("CAL-1A01: en el esquema migrado, una entrega asignada de antes puede pasar a calificada sin fecha de entrega", async () => {
    // La actualización se revierte (M-05, hermano): el primer caso de este bloque exige la entrega
    // asignada sin calificación, y el resultado no debe depender del orden de los casos.
    const resultado = await enElEsquema(async (tx) => {
      const actualizadas = await tx.$executeRaw`
        UPDATE entregas SET estado = 'calificado', calificacion = 0, fecha_calificacion = now()
        WHERE id = ${ids.asignada}::uuid`
      throw new Revertir(actualizadas)
    }).catch((error: unknown) => error)

    expect(resultado).toBeInstanceOf(Revertir)
    expect((resultado as Revertir).actualizadas).toBe(1)
    const despues = await enElEsquema(
      (tx) => tx.$queryRaw<{ estado: string }[]>`
        SELECT estado::text AS estado FROM entregas WHERE id = ${ids.asignada}::uuid`,
    )
    expect(despues).toEqual([{ estado: "asignado" }])
  })
})
