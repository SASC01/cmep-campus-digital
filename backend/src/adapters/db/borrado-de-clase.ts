import type { ConteoDeBorradoRespuesta } from "@campus/shared"

import { decidirBorrado, errorClaseNoArchivadaParaBorrar } from "../../core/clases/borrado.js"
import { AppError } from "../../core/errores.js"
import {
  ejecutorSqlDe,
  enTransaccion,
  obtenerDb,
  type Ejecutor,
  type EjecutorSql,
} from "./cliente.js"
import type { Prisma } from "./generated/client.js"

// ADMIN-01b (§D-4, DH-04 a). Conteo y borrado definitivo de una clase archivada.

// R-12: una clase grande borra decenas de miles de filas en cascada.
const TIMEOUT_DEL_BORRADO_MS = 30_000

const sinAcceso = (): AppError =>
  new AppError("SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.", 403)

// S-06. Cinco conteos por índices de la clase, en una sola lectura consistente: "alumnos" son las
// inscripciones de cuentas activas; "actividades", las tareas; "entregas", las filas con fecha de
// entrega; "calificaciones", las calificadas (con o sin fecha de entrega); "archivos", los
// confirmados de la clase (de publicaciones y de entregas).
export const contarParaBorrar = (
  claseId: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ConteoDeBorradoRespuesta> =>
  enTransaccion(
    ejecutor,
    async (tx) => {
      const clase = await tx.clase.findUnique({
        where: { id: claseId },
        select: { archivadaEn: true },
      })
      if (clase === null) throw sinAcceso()
      if (clase.archivadaEn === null) throw errorClaseNoArchivadaParaBorrar()

      const alumnos = await tx.inscripcion.count({
        where: { claseId, usuario: { activo: true } },
      })
      const actividades = await tx.tarea.count({ where: { claseId } })
      const entregas = await tx.entrega.count({
        where: { tarea: { claseId }, fechaEntrega: { not: null } },
      })
      const calificaciones = await tx.entrega.count({
        where: { tarea: { claseId }, estado: "calificado" },
      })
      const archivos = await tx.archivo.count({ where: { claseId, estado: "confirmado" } })
      return { alumnos, actividades, entregas, calificaciones, archivos }
    },
    { instantaneaUnica: true },
  )

// Paso 1: la fila de la clase para borrarla (se llama distinto de bloquearClase a propósito: aquí el
// modo es exclusivo, en serie con unirse, duplicar y toda escritura que inserte una fila hija).
const bloquearClaseParaBorrar = async (
  tx: Prisma.TransactionClient,
  claseId: string,
): Promise<{ archivadaEn: Date | null } | null> => {
  const [fila] = await tx.$queryRaw<{ archivadaEn: Date | null }[]>`
    SELECT archivada_en AS "archivadaEn" FROM clases WHERE id = ${claseId}::uuid FOR UPDATE`
  return fila ?? null
}

export interface BorradoDeClase {
  claseId: string
  confirmado: boolean
  // Las funciones de cola llegan como parámetros (adapters/db no importa adapters/queue) y reciben la
  // conexión de esta transacción: si se revierte, ni se cancela ni se encola nada.
  cancelarRecordatorios: (sql: EjecutorSql, trabajoIds: string[]) => Promise<void>
  encolarBorrados: (sql: EjecutorSql, claves: string[]) => Promise<void>
}

export const borrarClaseDefinitivamente = (
  { claseId, confirmado, cancelarRecordatorios, encolarBorrados }: BorradoDeClase,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<void> =>
  enTransaccion(
    ejecutor,
    async (tx) => {
      const clase = await bloquearClaseParaBorrar(tx, claseId)
      if (clase === null) throw sinAcceso()

      // Paso 2: una copia en curso de esta clase, o una de otra clase que apunta a un archivo de esta.
      const copiaPropia = await tx.archivo.findFirst({
        where: { claseId, copiaDe: { not: null } },
        select: { id: true },
      })
      const originalDeOtra = await tx.archivo.findFirst({
        where: { claseId, copias: { some: {} } },
        select: { id: true },
      })
      const error = decidirBorrado({
        archivadaEn: clase.archivadaEn,
        hayCopiasEnCurso: copiaPropia !== null || originalDeOtra !== null,
        confirmado,
      })
      if (error !== null) throw error

      // Paso 3: las claves de todos los archivos de la clase (también los pendientes y descartados,
      // que tienen objeto) y los recordatorios de sus tareas.
      const archivos = await tx.archivo.findMany({
        where: { claseId },
        select: { claveObjeto: true },
      })
      const tareas = await tx.tarea.findMany({
        where: { claseId, trabajoId: { not: null } },
        select: { trabajoId: true },
      })
      const trabajoIds = tareas.flatMap((tarea) =>
        tarea.trabajoId === null ? [] : [tarea.trabajoId],
      )

      // Pasos 4 y 5: cancelar y encolar con la conexión de esta transacción.
      const sql = ejecutorSqlDe(tx)
      if (trabajoIds.length > 0) await cancelarRecordatorios(sql, trabajoIds)
      if (archivos.length > 0) {
        await encolarBorrados(
          sql,
          archivos.map((archivo) => archivo.claveObjeto),
        )
      }

      // Paso 6: el registro de altas y bajas (FK RESTRICT hacia la clase) muere con ella (DH-04 a).
      await tx.movimientoInscripcion.deleteMany({ where: { claseId } })
      // Paso 7: la clase; la cascada se lleva todo lo demás.
      await tx.clase.deleteMany({ where: { id: claseId } })
    },
    { timeout: TIMEOUT_DEL_BORRADO_MS },
  )
