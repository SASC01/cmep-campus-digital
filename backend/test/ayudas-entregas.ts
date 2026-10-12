import { randomUUID } from "node:crypto"

import { expect } from "vitest"

import { obtenerDb, type enTransaccion } from "../src/adapters/db/cliente.js"
import { formadasDetrasDe } from "./ayudas-concurrencia.js"

// ENTREGAS-01b. Ayudas de las pruebas de entregas: filas de `entregas` y de `archivos` de entrega
// fabricadas con SQL parametrizado (respetan los CHECK de la migración de 01a), y una retención de
// fila propia para las carreras de entregar, anular y borrar (ayudas-concurrencia.ts solo retiene
// usuarios, sesiones y enlaces, y no se toca). Se limpian solas: entregas y archivos mueren en cascada
// con su clase (borrarMovimientosYClasesDePrueba antes que los usuarios, N-10).

export type EstadoDeEntregaDePrueba = "asignado" | "entregado" | "calificado"

export interface OpcionesEntregaDePrueba {
  tareaId: string
  alumnoId: string
  estado?: EstadoDeEntregaDePrueba
  conRetraso?: boolean
  enlaces?: readonly string[]
  version?: number
  fechaEntrega?: Date
}

// Una fila de `entregas`. En `asignado` va sin fecha, sin retraso y sin enlaces (los CHECK lo exigen).
export const crearEntregaDePrueba = async ({
  tareaId,
  alumnoId,
  estado = "entregado",
  conRetraso = false,
  enlaces = [],
  version = 1,
  fechaEntrega = new Date(),
}: OpcionesEntregaDePrueba): Promise<string> => {
  const asignada = estado === "asignado"
  const [fila] = await obtenerDb().$queryRaw<{ id: string }[]>`
    INSERT INTO entregas (tarea_id, alumno_id, estado, fecha_entrega, con_retraso, enlaces, version)
    VALUES (
      ${tareaId}::uuid,
      ${alumnoId}::uuid,
      ${estado}::estado_entrega,
      ${asignada ? null : fechaEntrega},
      ${asignada ? false : conRetraso},
      ${JSON.stringify(asignada ? [] : enlaces)}::jsonb,
      ${version}
    )
    RETURNING id::text AS id`
  if (!fila) throw new Error("Precondición: no se creó la fila de entregas")
  return fila.id
}

export interface OpcionesArchivoDeEntregaDePrueba {
  claseId: string
  tareaId: string
  alumnoId: string
  // Quién lo subió (por defecto, el alumno de la clave).
  subidoPor?: string
  estado?: "pendiente" | "confirmado" | "descartado"
  // Obligatorio si y solo si estado es "confirmado" (CHECK de un solo contexto).
  entregaId?: string
  nombre?: string
  tipo?: string
  tamano?: number
  creadoEn?: Date
  // Para forzar otra clave (por ejemplo, la de un material con el id de este archivo).
  claveObjeto?: string
}

export interface ArchivoDeEntregaDePrueba {
  id: string
  claveObjeto: string
  tipo: string
  tamano: number
}

export const crearArchivoDeEntregaDePrueba = async ({
  claseId,
  tareaId,
  alumnoId,
  subidoPor = alumnoId,
  estado = "pendiente",
  entregaId,
  nombre = "trabajo.pdf",
  tipo = "application/pdf",
  tamano = 2000,
  creadoEn = new Date(),
  claveObjeto,
}: OpcionesArchivoDeEntregaDePrueba): Promise<ArchivoDeEntregaDePrueba> => {
  const id = randomUUID()
  const clave = claveObjeto ?? `entregas/${tareaId}/${alumnoId}/${id}`
  await obtenerDb().$executeRaw`
    INSERT INTO archivos (id, clave_objeto, nombre, tipo, tamano, subido_por, estado, clase_id,
                          entrega_id, creado_en, actualizado_en)
    VALUES (
      ${id}::uuid, ${clave}, ${nombre}, ${tipo}, ${tamano}, ${subidoPor}::uuid,
      ${estado}::estado_archivo, ${claseId}::uuid, ${entregaId ?? null}::uuid, ${creadoEn},
      ${creadoEn}
    )`
  return { id, claveObjeto: clave, tipo, tamano }
}

export const leerEntregaDb = (tareaId: string, alumnoId: string) =>
  obtenerDb().entrega.findUnique({ where: { tareaId_alumnoId: { tareaId, alumnoId } } })

export const contarEntregasDeTarea = (tareaId: string): Promise<number> =>
  obtenerDb().entrega.count({ where: { tareaId } })

// Archivos confirmados con entrega_id de una entrega que está en `asignado` (la invariante de
// PR-1B09 bis): debe ser siempre 0.
export const archivosConfirmadosDeEntregasAsignadas = async (tareaId: string): Promise<number> => {
  const [fila] = await obtenerDb().$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n
    FROM archivos a
    JOIN entregas e ON e.id = a.entrega_id
    WHERE e.tarea_id = ${tareaId}::uuid AND e.estado = 'asignado' AND a.estado = 'confirmado'`
  return fila?.n ?? 0
}

// Trabajos de ENTREGA_REALIZADA de una tarea (pgboss.job), por el id de la tarea en sus datos.
export interface TrabajoDeEntrega {
  id: string
  state: string
  datos: Record<string, unknown>
}

export const trabajosDeEntregaDeTarea = (tareaId: string) =>
  obtenerDb().$queryRaw<TrabajoDeEntrega[]>`
    SELECT id::text AS id, state::text AS state, data AS datos
    FROM pgboss.job
    WHERE name = 'ENTREGA_REALIZADA' AND data ->> 'tareaId' = ${tareaId}::text
    ORDER BY created_on ASC, id ASC`

// Retención de una fila para las carreras de ENTREGAS-01b (mismo método que conFilaRetenida): una
// transacción externa toma la fila, se lanzan las operaciones en un orden fijo y, antes de lanzar la
// siguiente, se espera a que la anterior quede formada detrás de la fila retenida (formadasDetrasDe:
// solo esperas de fila, también en cadena). Al soltar, quedan en serie en ese orden.
// - "tareas" con "FOR UPDATE": choca con la lectura de la tarea de entregar y anular y con el borrado.
// - "tareas" con "FOR KEY SHARE": la toma como lo haría un comentario o una entrega en curso; choca
//   solo con el FOR UPDATE del borrado.
// - "entregas" con "FOR UPDATE": choca con el FOR NO KEY UPDATE de la fila de entregar y anular.
// - "publicaciones" con "FOR UPDATE": deja al borrado de la tarea detenido después de tomar su fila de
//   tareas, justo antes de borrar la publicación.
// `alRetener` corre dentro de la retenedora antes de lanzar nada (por ejemplo, para escribir lo que
// escribiría la operación que se simula). El timeout de la retenedora es explícito.
export type TxDeRetencion = Parameters<Parameters<typeof enTransaccion>[1]>[0]

export interface RetencionDeEntregas {
  tabla: "tareas" | "entregas" | "publicaciones"
  id: string
  modo?: "FOR UPDATE" | "FOR KEY SHARE"
}

export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: unknown }

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

export const TIMEOUT_DE_LA_RETENCION_MS = 30_000

export const conFilaDeEntregasRetenida = async <T>(
  fila: RetencionDeEntregas,
  operaciones: readonly (() => Promise<T>)[],
  {
    alRetener,
    antesDeSoltar,
  }: {
    alRetener?: (tx: TxDeRetencion) => Promise<void>
    antesDeSoltar?: () => Promise<void>
  } = {},
): Promise<Resultado<T>[]> => {
  const lanzadas: Promise<Resultado<T>>[] = []
  const modo = fila.modo ?? "FOR UPDATE"
  await obtenerDb().$transaction(
    async (tx) => {
      if (fila.tabla === "tareas" && modo === "FOR KEY SHARE") {
        await tx.$queryRaw`SELECT id FROM tareas WHERE id = ${fila.id}::uuid FOR KEY SHARE`
      } else if (fila.tabla === "tareas") {
        await tx.$queryRaw`SELECT id FROM tareas WHERE id = ${fila.id}::uuid FOR UPDATE`
      } else if (fila.tabla === "entregas") {
        await tx.$queryRaw`SELECT id FROM entregas WHERE id = ${fila.id}::uuid FOR UPDATE`
      } else {
        await tx.$queryRaw`SELECT id FROM publicaciones WHERE id = ${fila.id}::uuid FOR UPDATE`
      }
      if (alRetener) await alRetener(tx)
      const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      if (!propio) throw new Error("Precondición: no se obtuvo el pid de la transacción retenedora")

      for (const [indice, operacion] of operaciones.entries()) {
        let terminada = false
        const lanzada = operacion().then(
          (valor): Resultado<T> => {
            terminada = true
            return { ok: true, valor }
          },
          (error: unknown): Resultado<T> => {
            terminada = true
            return { ok: false, error }
          },
        )
        lanzadas.push(lanzada)
        const limite = Date.now() + 10_000
        let formada = false
        while (!formada && !terminada && Date.now() < limite) {
          formada = (await formadasDetrasDe(propio.pid)) >= indice + 1
          if (!formada) await esperar(25)
        }
        expect(
          terminada,
          `Precondición: la operación ${String(indice + 1)} terminó sin esperar la fila retenida`,
        ).toBe(false)
        expect(
          formada,
          `Precondición: la operación ${String(indice + 1)} no llegó a la fila retenida en 10 s`,
        ).toBe(true)
      }
      if (antesDeSoltar) await antesDeSoltar()
      // Margen para que la última operación termine de formarse antes de soltar la fila.
      await esperar(100)
    },
    { timeout: TIMEOUT_DE_LA_RETENCION_MS, maxWait: 5_000 },
  )
  return Promise.all(lanzadas)
}
