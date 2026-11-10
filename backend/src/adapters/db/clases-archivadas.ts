import type { Rol } from "@campus/shared"

import { errorClaseNoArchivada, errorClaseYaArchivada } from "../../core/clases/archivada.js"
import { AppError } from "../../core/errores.js"
import { paginar } from "../../core/paginacion.js"
import { leerClase, ORDEN_DE_MAESTROS, type ClaseDb } from "./clases.js"
import { enTransaccion, obtenerDb, type Ejecutor } from "./cliente.js"
import type { Prisma } from "./generated/client.js"

const sinAcceso = (): AppError =>
  new AppError("SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.", 403)

const errorCursorInvalido = (): AppError => new AppError("VALIDACION", "cursor: no es válido", 400)

// Lee la clase dentro de la transacción de la escritura: anidada, leerClase corre sobre ella.
const releerClase = async (tx: Prisma.TransactionClient, claseId: string): Promise<ClaseDb> => {
  const clase = await leerClase(claseId, tx)
  if (clase === null) throw sinAcceso()
  return clase
}

// ADMIN-01a (§D-2, S-01). Un solo UPDATE condicionado por el estado de la clase: si no cambia
// ninguna fila, se relee por PK para decidir entre 403 (ya no existe) y 409 (ya estaba en ese
// estado), sin escribir. No encola nada (S-02).
export const archivarClase = (
  claseId: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ClaseDb> =>
  enTransaccion(ejecutor, async (tx) => {
    const { count } = await tx.clase.updateMany({
      where: { id: claseId, archivadaEn: null },
      data: { activa: false, archivadaEn: new Date() },
    })
    if (count === 0) {
      const fila = await tx.clase.findUnique({
        where: { id: claseId },
        select: { archivadaEn: true },
      })
      if (fila === null) throw sinAcceso()
      // La relectura toma otra instantánea (READ COMMITTED): si una restauración confirmó en medio,
      // la clase estaba archivada cuando el UPDATE la evaluó, así que la respuesta sigue siendo 409.
      throw errorClaseYaArchivada()
    }
    return releerClase(tx, claseId)
  })

export const restaurarClase = (
  claseId: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ClaseDb> =>
  enTransaccion(ejecutor, async (tx) => {
    const { count } = await tx.clase.updateMany({
      where: { id: claseId, archivadaEn: { not: null } },
      data: { activa: true, archivadaEn: null },
    })
    if (count === 0) {
      const fila = await tx.clase.findUnique({
        where: { id: claseId },
        select: { archivadaEn: true },
      })
      if (fila === null) throw sinAcceso()
      // Como al archivar: si un archivado confirmó en medio, la clase estaba activa cuando el UPDATE
      // la evaluó.
      throw errorClaseNoArchivada()
    }
    return releerClase(tx, claseId)
  })

export interface ClaseAnteriorDb {
  id: string
  nombre: string
  maestros: { nombre: string }[]
  archivadaEn: Date
}

export interface ListaClasesAnterioresDb {
  clases: ClaseAnteriorDb[]
  total: number
  siguienteCursor: string | null
  // Enmienda 5: el archivadaEn de la última clase de la página cuando hay siguiente; si no, null.
  siguienteCursorArchivadaEn: Date | null
}

const SELECT_CLASE_ANTERIOR = {
  claseId: true,
  clase: {
    select: {
      id: true,
      nombre: true,
      archivadaEn: true,
      maestros: { select: { maestro: { select: { nombre: true } } }, orderBy: ORDEN_DE_MAESTROS },
    },
  },
} as const

interface FilaDeClaseAnterior {
  claseId: string
  clase: {
    id: string
    nombre: string
    archivadaEn: Date | null
    maestros: { maestro: { nombre: string } }[]
  }
}

// Las páginas siguientes van por (archivada_en, id) estrictamente menores que los del cursor: sin el
// cursor de Prisma, que no ordena por una columna de la relación.
const despuesDelCursor = (
  cursor: { archivadaEn: Date; id: string } | null,
): Prisma.ClaseWhereInput => {
  if (cursor === null) return { archivadaEn: { not: null } }
  return {
    OR: [
      { archivadaEn: { lt: cursor.archivadaEn } },
      { archivadaEn: cursor.archivadaEn, id: { lt: cursor.id } },
    ],
  }
}

const ORDEN_DE_ANTERIORES = [
  { clase: { archivadaEn: "desc" } },
  { claseId: "desc" },
] as const satisfies Prisma.InscripcionOrderByWithRelationInput[]

const aClaseAnterior = (fila: FilaDeClaseAnterior): ClaseAnteriorDb => {
  if (fila.clase.archivadaEn === null) {
    throw new AppError("ERROR_INTERNO", "La clase anterior no está archivada.", 500)
  }
  return {
    id: fila.clase.id,
    nombre: fila.clase.nombre,
    maestros: fila.clase.maestros.map((asignacion) => ({ nombre: asignacion.maestro.nombre })),
    archivadaEn: fila.clase.archivadaEn,
  }
}

// ADMIN-01a (§D-2, DH-02). Las clases archivadas del alumno (por sus inscripciones) o del maestro
// (por sus asignaciones), de la archivada más recientemente a la más antigua. Se leen por el índice
// del usuario (inscripciones o maestros_de_clase), se filtran por la clase y se ordenan (R-13: el
// conjunto de un usuario es de decenas). El cursor es un claseId que debe ser una archivada del
// perfil, leído por PK; si no, 400. Cursor, página y total en una sola instantánea.
// Enmienda 5 (§D-2, T-02): el cursor viaja con su posición (cursorArchivadaEn, el
// siguienteCursorArchivadaEn que se entregó), obligatoria con él. Se compara como texto con la
// fecha de archivo actual de la fila del cursor: si la clase se restauró y se volvió a archivar entre
// dos páginas, 400 en vez de repetir o saltar clases.
export const listarClasesAnteriores = (
  {
    usuarioId,
    rol,
    cursor,
    cursorArchivadaEn,
    limite,
  }: {
    usuarioId: string
    rol: Rol
    cursor: string | undefined
    cursorArchivadaEn: string | undefined
    limite: number
  },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaClasesAnterioresDb> =>
  enTransaccion(
    ejecutor,
    async (tx) => {
      const delAlumno = rol === "estudiante"
      if ((cursor === undefined) !== (cursorArchivadaEn === undefined)) throw errorCursorInvalido()
      let posicion: { archivadaEn: Date; id: string } | null = null
      if (cursor !== undefined) {
        const delCursor = delAlumno
          ? await tx.inscripcion.findUnique({
              where: { claseId_usuarioId: { claseId: cursor, usuarioId } },
              select: { clase: { select: { id: true, archivadaEn: true } } },
            })
          : await tx.maestroDeClase.findUnique({
              where: { claseId_maestroId: { claseId: cursor, maestroId: usuarioId } },
              select: { clase: { select: { id: true, archivadaEn: true } } },
            })
        if (delCursor === null || delCursor.clase.archivadaEn === null) throw errorCursorInvalido()
        if (delCursor.clase.archivadaEn.toISOString() !== cursorArchivadaEn) {
          throw errorCursorInvalido()
        }
        posicion = { archivadaEn: delCursor.clase.archivadaEn, id: delCursor.clase.id }
      }
      const filtroDeClase: Prisma.ClaseWhereInput = {
        AND: [{ archivadaEn: { not: null } }, despuesDelCursor(posicion)],
      }
      const filas: FilaDeClaseAnterior[] = delAlumno
        ? await tx.inscripcion.findMany({
            where: { usuarioId, clase: filtroDeClase },
            select: SELECT_CLASE_ANTERIOR,
            orderBy: [...ORDEN_DE_ANTERIORES],
            take: limite + 1,
          })
        : await tx.maestroDeClase.findMany({
            where: { maestroId: usuarioId, clase: filtroDeClase },
            select: SELECT_CLASE_ANTERIOR,
            orderBy: [...ORDEN_DE_ANTERIORES],
            take: limite + 1,
          })
      const total = delAlumno
        ? await tx.inscripcion.count({
            where: { usuarioId, clase: { archivadaEn: { not: null } } },
          })
        : await tx.maestroDeClase.count({
            where: { maestroId: usuarioId, clase: { archivadaEn: { not: null } } },
          })

      const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.claseId)
      const clases = pagina.map(aClaseAnterior)
      const ultima = clases.at(-1)
      const siguienteCursorArchivadaEn =
        siguienteCursor !== null && ultima !== undefined ? ultima.archivadaEn : null
      return { clases, total, siguienteCursor, siguienteCursorArchivadaEn }
    },
    { instantaneaUnica: true },
  )
