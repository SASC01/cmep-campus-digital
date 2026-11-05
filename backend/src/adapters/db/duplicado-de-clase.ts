import { randomUUID } from "node:crypto"

import { MAXIMO_MAESTROS_POR_CLASE } from "@campus/shared"

import { errorClaseConCopiasEnCurso } from "../../core/clases/borrado.js"
import { planDeDuplicado } from "../../core/clases/duplicado.js"
import { AppError } from "../../core/errores.js"
import { bloquearMaestrosActivos } from "./bloqueo-maestros.js"
import { ORDEN_DE_MAESTROS, maestrosDeFilas, type ClaseDb } from "./clases.js"
import {
  ejecutorSqlDe,
  enTransaccion,
  obtenerDb,
  type Ejecutor,
  type EjecutorSql,
} from "./cliente.js"
import { traducirErrorPrisma } from "./errores.js"
import type { Prisma } from "./generated/client.js"

// ADMIN-01b (§D-5, DH-03 a). Duplicar una clase (activa o archivada): la copia nace activa, con el
// nombre que eligió el admin, la descripción de la original, sus temas, categorías y recursos de
// aprendizaje con sus archivos (filas nuevas con copia_de; el objeto lo copia el worker).

// R-12: como el borrado, una transacción que puede escribir muchas filas.
const TIMEOUT_DEL_DUPLICADO_MS = 30_000

const sinAcceso = (): AppError =>
  new AppError("SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.", 403)

const errorCodigoNoDisponible = (): AppError =>
  new AppError("CODIGO_NO_DISPONIBLE", "No se pudo generar un código de clase disponible.", 500)

// El único índice único que puede chocar al duplicar es codigo_invitacion (los demás ids nacen de
// randomUUID). Un error que no es un P2002 se relanza tal cual (lo traduce errores.ts).
const traducirErrorDeCodigo = (error: unknown): AppError => {
  try {
    traducirErrorPrisma(error, { alDuplicar: () => errorCodigoNoDisponible() })
  } catch (traducido) {
    if (traducido instanceof AppError) return traducido
    throw traducido
  }
  throw error
}

// Como en crear (§D-7.9): el reintento envuelve la transacción entera, porque un P2002 deja abortada
// la transacción en curso. Un solo reintento, sin ciclo.
const conReintentoDeCodigo = async <T>(
  intentar: (codigo: string) => Promise<T>,
  generarCodigo: () => string,
): Promise<T> => {
  try {
    return await intentar(generarCodigo())
  } catch (primerError) {
    const traducido = traducirErrorDeCodigo(primerError)
    if (traducido.codigo !== "CODIGO_NO_DISPONIBLE") throw traducido
    try {
      return await intentar(generarCodigo())
    } catch (segundoError) {
      throw traducirErrorDeCodigo(segundoError)
    }
  }
}

const SELECT_COPIA = {
  id: true,
  nombre: true,
  descripcion: true,
  archivadaEn: true,
  maestros: {
    select: { maestro: { select: { id: true, nombre: true } } },
    orderBy: ORDEN_DE_MAESTROS,
  },
} as const

export interface DuplicadoDeClase {
  claseId: string
  nombre: string
  maestroIds: readonly string[]
  generarCodigo: () => string
  // La cola llega como parámetro (adapters/db no importa adapters/queue), con la conexión de esta
  // transacción: si se revierte, no queda ningún trabajo de copia.
  encolarCopias: (sql: EjecutorSql, archivoIds: string[]) => Promise<void>
}

// null: los maestros no son de uno a dos ids distintos de maestros activos (404 en el handler).
const duplicarEn = async (
  tx: Prisma.TransactionClient,
  {
    claseId,
    nombre,
    ids,
    encolarCopias,
  }: Omit<DuplicadoDeClase, "maestroIds" | "generarCodigo"> & {
    ids: string[]
  },
  codigo: string,
): Promise<ClaseDb | null> => {
  // 1. La original en modo compartido: en serie con su borrado definitivo.
  const [original] = await tx.$queryRaw<{ descripcion: string | null }[]>`
    SELECT descripcion FROM clases WHERE id = ${claseId}::uuid FOR SHARE`
  if (original === undefined) throw sinAcceso()

  // 2. Los maestros elegidos, activos y bloqueados (N-03).
  const activos = await bloquearMaestrosActivos(tx, ids)
  if (activos.length !== ids.length) return null

  // 2b. Nunca se copia desde un objeto que todavía no existe (M-02).
  const enCopia = await tx.archivo.findFirst({
    where: { claseId, copiaDe: { not: null } },
    select: { id: true },
  })
  if (enCopia !== null) throw errorClaseConCopiasEnCurso()

  // 3. Lo que se copia, por los índices de la clase. Cuatro lecturas, sin ciclo.
  const temas = await tx.tema.findMany({
    where: { claseId },
    select: { id: true, nombre: true, orden: true },
  })
  const categorias = await tx.categoria.findMany({
    where: { claseId },
    select: { id: true, nombre: true, peso: true, creadoEn: true },
  })
  const recursos = await tx.publicacion.findMany({
    where: {
      claseId,
      tipo: "material",
      OR: [{ bloque: "aprendizaje" }, { bloque: null, autor: { rol: "admin" } }],
    },
    select: {
      id: true,
      tipo: true,
      bloque: true,
      autorId: true,
      titulo: true,
      texto: true,
      temaId: true,
      creadoEn: true,
      autor: { select: { rol: true } },
    },
  })
  const archivos =
    recursos.length === 0
      ? []
      : await tx.archivo.findMany({
          where: {
            publicacionId: { in: recursos.map((recurso) => recurso.id) },
            estado: "confirmado",
          },
          select: {
            id: true,
            publicacionId: true,
            estado: true,
            nombre: true,
            tipo: true,
            tamano: true,
            subidoPor: true,
            creadoEn: true,
          },
        })

  const nuevaId = randomUUID()
  const ahora = new Date()
  const plan = planDeDuplicado(
    {
      temas,
      categorias,
      recursos: recursos.map(({ autor, ...recurso }) => ({
        ...recurso,
        autorEsAdmin: autor.rol === "admin",
      })),
      archivos,
    },
    { claseId: nuevaId, ahora, generarId: randomUUID },
  )

  // 4. La copia, activa, con sus maestros; clases.maestro_id es el primero por id, como al crear.
  const [primero] = [...ids].sort()
  if (primero === undefined) return null
  const fila = await tx.clase.create({
    data: {
      id: nuevaId,
      maestroId: primero,
      nombre,
      descripcion: original.descripcion,
      codigoInvitacion: codigo,
      creadoEn: ahora,
      maestros: { create: ids.map((maestroId) => ({ maestroId, creadoEn: ahora })) },
    },
    select: SELECT_COPIA,
  })
  if (plan.temas.length > 0) await tx.tema.createMany({ data: plan.temas })
  if (plan.categorias.length > 0) await tx.categoria.createMany({ data: plan.categorias })
  if (plan.recursos.length > 0) await tx.publicacion.createMany({ data: plan.recursos })
  if (plan.archivos.length > 0) {
    await tx.archivo.createMany({ data: plan.archivos })
    // 5. Los trabajos de copia, en la misma transacción.
    await encolarCopias(
      ejecutorSqlDe(tx),
      plan.archivos.map((archivo) => archivo.id),
    )
  }

  return {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    maestros: maestrosDeFilas(fila.maestros),
    archivadaEn: fila.archivadaEn,
  }
}

export const duplicarClase = async (
  { claseId, nombre, maestroIds, generarCodigo, encolarCopias }: DuplicadoDeClase,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ClaseDb | null> => {
  const ids = maestroIds.map((id) => id.toLowerCase())
  if (ids.length < 1 || ids.length > MAXIMO_MAESTROS_POR_CLASE) return null
  if (new Set(ids).size !== ids.length) return null

  return conReintentoDeCodigo(
    (codigo) =>
      enTransaccion(
        ejecutor,
        (tx) => duplicarEn(tx, { claseId, nombre, ids, encolarCopias }, codigo),
        { timeout: TIMEOUT_DEL_DUPLICADO_MS },
      ),
    generarCodigo,
  )
}
