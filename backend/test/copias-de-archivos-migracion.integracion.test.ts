import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
} from "./ayudas-clases.js"

// ADMIN-01b (ADM-1B14). La migración admin_01_copias_de_archivos: archivos.copia_de con su FK
// RESTRICT, el CHECK a mano archivos_copia_solo_confirmado (R-02) y los tres índices nuevos.

type Tx = Parameters<Parameters<ReturnType<typeof obtenerDb>["$transaction"]>[0]>[0]

const idsUsuarios: string[] = []
const idsClases: string[] = []
let app: FastifyInstance | undefined

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

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const preparar = async () => {
  const maestro = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Maestro mig", rol: "maestro" })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const publicacionId = await crearPublicacionDePrueba({
    claseId: clase.id,
    autorId: maestro.id,
    tipo: "material",
  })
  const original = await crearArchivoDePrueba({
    claseId: clase.id,
    subidoPor: maestro.id,
    estado: "confirmado",
    publicacionId,
  })
  const pendiente = await crearArchivoDePrueba({ claseId: clase.id, subidoPor: maestro.id })
  const confirmado = await crearArchivoDePrueba({
    claseId: clase.id,
    subidoPor: maestro.id,
    estado: "confirmado",
    publicacionId,
  })
  return { original, pendiente, confirmado }
}

describe("migración admin_01_copias_de_archivos (ADM-1B14)", () => {
  it("ADM-1B14: el CHECK rechaza copia_de en un archivo pendiente o descartado y lo admite en uno confirmado", async () => {
    const { original, pendiente, confirmado } = await preparar()

    const enPendiente = await errorAlEscribir(
      (tx) =>
        tx.$executeRaw`UPDATE archivos SET copia_de = ${original.id}::uuid
        WHERE id = ${pendiente.id}::uuid`,
    )
    expect(enPendiente).toContain("archivos_copia_solo_confirmado")

    const enDescartado = await errorAlEscribir(
      (tx) =>
        tx.$executeRaw`UPDATE archivos SET copia_de = ${original.id}::uuid, estado = 'descartado',
        publicacion_id = NULL WHERE id = ${confirmado.id}::uuid`,
    )
    expect(enDescartado).toContain("archivos_copia_solo_confirmado")

    const enConfirmado = await errorAlEscribir(
      (tx) =>
        tx.$executeRaw`UPDATE archivos SET copia_de = ${original.id}::uuid
        WHERE id = ${confirmado.id}::uuid`,
    )
    expect(enConfirmado).toBeNull()
  })

  it("ADM-1B14: borrar un archivo que otro tiene en copia_de falla (FK RESTRICT)", async () => {
    const { original, confirmado } = await preparar()
    const borrado = await errorAlEscribir(async (tx) => {
      await tx.$executeRaw`UPDATE archivos SET copia_de = ${original.id}::uuid
        WHERE id = ${confirmado.id}::uuid`
      await tx.archivo.deleteMany({ where: { id: original.id } })
    })
    expect(borrado).not.toBeNull()
    expect(borrado).toContain("archivos_copia_de_fkey")

    const [fk] = await obtenerDb().$queryRaw<{ confdeltype: string }[]>`
      SELECT confdeltype::text AS confdeltype FROM pg_constraint
      WHERE conname = 'archivos_copia_de_fkey'`
    expect(fk?.confdeltype, "ON DELETE RESTRICT es 'r'").toBe("r")
  })

  it("ADM-1B14: los índices de copia_de, (clase_id, estado) y (clase_id, secuencia DESC) existen", async () => {
    const filas = await obtenerDb().$queryRaw<{ indexname: string; indexdef: string }[]>`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE schemaname = 'public' AND indexname IN (
        'archivos_copia_de_idx', 'archivos_clase_id_estado_idx',
        'movimientos_inscripcion_clase_id_secuencia_idx')
      ORDER BY indexname`
    expect(filas.map((fila) => fila.indexname)).toEqual([
      "archivos_clase_id_estado_idx",
      "archivos_copia_de_idx",
      "movimientos_inscripcion_clase_id_secuencia_idx",
    ])
    const definicion = (nombre: string) => filas.find((f) => f.indexname === nombre)?.indexdef
    expect(definicion("archivos_clase_id_estado_idx")).toContain("(clase_id, estado)")
    expect(definicion("archivos_copia_de_idx")).toContain("(copia_de)")
    expect(definicion("movimientos_inscripcion_clase_id_secuencia_idx")).toContain(
      "(clase_id, secuencia DESC)",
    )
  })
})
