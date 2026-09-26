import { PgBoss, type QueueOptions } from "pg-boss"

import { AppError } from "../../core/errores.js"
import type { EjecutorSql } from "../db/cliente.js"
import { OPCIONES_DE_COLAS } from "./colas.js"

// Único importador de pg-boss del proyecto (regla 1). Idempotente, como inicializarDb: construirApp
// puede ejecutarse más de una vez en el mismo proceso (pruebas).
let boss: PgBoss | undefined

export interface OpcionesIniciarCola {
  connectionString: string
  rol: "api" | "worker"
  maxConexiones: number
  sondeoSegundos?: number
  log: { error: (obj: unknown, mensaje?: string) => void }
}

const obtenerBoss = (): PgBoss => {
  if (!boss) {
    throw new AppError("COLA_NO_INICIALIZADA", "La cola de trabajos no está inicializada.", 500)
  }
  return boss
}

// La API no supervisa ni programa (supervise: false, schedule: false): el worker es quien lo hace.
// Ambos aseguran las dos colas al arrancar (createQueue es idempotente).
export const iniciarCola = async ({
  connectionString,
  rol,
  maxConexiones,
  log,
}: OpcionesIniciarCola): Promise<void> => {
  if (boss) return
  const instancia = new PgBoss({
    connectionString,
    max: maxConexiones,
    supervise: rol === "worker",
    schedule: rol === "worker",
  })
  instancia.on("error", (err: unknown) => log.error({ err }, "Error de pg-boss"))
  await instancia.start()
  for (const { nombre, opciones } of OPCIONES_DE_COLAS) {
    await instancia.createQueue(nombre, opciones)
  }
  boss = instancia
}

export interface OpcionesEncolar {
  id: string
  sql?: EjecutorSql
}

// El eventId es el id del trabajo (C-02): un segundo encolado con el mismo id no crea otro trabajo
// (ON CONFLICT DO NOTHING de pg-boss) y encolar lo trata como éxito.
export const encolar = async (
  nombre: string,
  datos: object,
  { id, sql }: OpcionesEncolar,
): Promise<void> => {
  await obtenerBoss().send(nombre, datos, { id, ...(sql ? { db: sql } : {}) })
}

export const asegurarCola = async (nombre: string, opciones: QueueOptions = {}): Promise<void> => {
  await obtenerBoss().createQueue(nombre, opciones)
}

export interface DescripcionDeCola {
  retryLimit: number
  retryDelay: number
  retryBackoff: boolean
  expireInSeconds: number
  deadLetter: string | null
  retentionSeconds: number
  deleteAfterSeconds: number
}

export const describirCola = async (nombre: string): Promise<DescripcionDeCola | null> => {
  const cola = await obtenerBoss().getQueue(nombre)
  if (!cola) return null
  return {
    retryLimit: cola.retryLimit ?? 0,
    retryDelay: cola.retryDelay ?? 0,
    retryBackoff: cola.retryBackoff ?? false,
    expireInSeconds: cola.expireInSeconds ?? 0,
    deadLetter: cola.deadLetter ?? null,
    retentionSeconds: cola.retentionSeconds ?? 0,
    deleteAfterSeconds: cola.deleteAfterSeconds ?? 0,
  }
}

export interface TrabajoRecibido {
  id: string
  datos: unknown
}

// batchSize: 1, siempre (DEC-15): un correo a la vez, muy por debajo del límite de Resend.
export const trabajar = async (
  nombre: string,
  manejador: (trabajo: TrabajoRecibido) => Promise<void>,
  { sondeoSegundos }: { sondeoSegundos?: number } = {},
): Promise<void> => {
  await obtenerBoss().work(
    nombre,
    {
      batchSize: 1,
      ...(sondeoSegundos === undefined ? {} : { pollingIntervalSeconds: sondeoSegundos }),
    },
    async (trabajos) => {
      for (const trabajo of trabajos) {
        await manejador({ id: trabajo.id, datos: trabajo.data })
      }
    },
  )
}

export interface TrabajoFallidoRecibido {
  id: string
  idOriginal: string | null
}

// T-02: el consumidor de la cola de fallidos necesita el id del trabajo original (el eventId,
// C-02), no el de la copia que pg-boss crea al pasarlo a la cola de fallidos. pg-boss 12 lo expone
// como sourceId cuando se pide con includeMetadata: true (dist/plans.js:600, dist/types.d.ts:1048).
export const trabajarFallidos = async (
  nombre: string,
  manejador: (trabajo: TrabajoFallidoRecibido) => Promise<void>,
  { sondeoSegundos }: { sondeoSegundos?: number } = {},
): Promise<void> => {
  await obtenerBoss().work(
    nombre,
    {
      batchSize: 1,
      includeMetadata: true,
      ...(sondeoSegundos === undefined ? {} : { pollingIntervalSeconds: sondeoSegundos }),
    },
    async (trabajos) => {
      for (const trabajo of trabajos) {
        await manejador({ id: trabajo.id, idOriginal: trabajo.sourceId })
      }
    },
  )
}

export const dejarDeTrabajar = async (nombre: string): Promise<void> => {
  await obtenerBoss().offWork(nombre)
}

export const buscarTrabajo = async (
  nombre: string,
  id: string,
): Promise<{ estado: string; datos: unknown } | null> => {
  const trabajo = await obtenerBoss().getJobById(nombre, id)
  if (!trabajo) return null
  return { estado: trabajo.state, datos: trabajo.data }
}

export const detenerCola = async (): Promise<void> => {
  if (!boss) return
  const instancia = boss
  boss = undefined
  await instancia.stop({ graceful: true, timeout: 30_000, close: true })
}
