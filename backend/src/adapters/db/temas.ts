import { AppError } from "../../core/errores.js"
import {
  siguienteOrden,
  validarNuevoTema,
  validarOrdenDeTemas,
  validarRenombre,
} from "../../core/tareas/temas.js"
import { bloquearClase } from "./bloqueo-clase.js"
import { enTransaccion, obtenerDb, type Ejecutor } from "./cliente.js"
import type { Prisma } from "./generated/client.js"
import { bloquearTemaParaUsar } from "./referencias.js"

// TAREAS-01a (§D-2). Temas de una clase y mover un elemento de tema. Toda consulta por tema o
// publicación filtra además por la clase de la ruta: un id de otra clase es "no encontrado", sin
// escribir ni revelar nada. Crear, renombrar, borrar y ordenar toman primero el candado de la fila de
// la clase (bloquearClase, §D-7): el tope de 30, los nombres repetidos y el conjunto exacto del
// orden se deciden en core/ sobre una lista que nadie más puede cambiar a la vez.

export interface TemaDb {
  id: string
  nombre: string
  orden: number
  elementos: number
}

export interface ListaTemasDb {
  temas: TemaDb[]
  sinTema: number
}

export interface ElementoMovidoDb {
  publicacionId: string
  temaId: string | null
}

// Los elementos que se agrupan en un tema son los materiales y las tareas; los anuncios no llevan tema.
const TIPOS_CON_TEMA = ["material", "tarea"] as const

const temaNoEncontrado = (): AppError =>
  new AppError("TEMA_NO_ENCONTRADO", "Ese tema ya no existe.", 404)

const publicacionNoEncontrada = (): AppError =>
  new AppError("PUBLICACION_NO_ENCONTRADA", "Esa publicación ya no existe.", 404)

const SELECT_TEMA = { id: true, nombre: true, orden: true } as const

// Temas por (orden, creado_en, id) (hasta 30, S-14: sin paginar). `elementos` y `sinTema` salen de
// un solo groupBy de publicaciones por tema_id (índice (clase_id, tema_id, creado_en, id)).
export const listarTemas = async (
  claseId: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaTemasDb> => {
  const temas = await ejecutor.tema.findMany({
    where: { claseId },
    select: SELECT_TEMA,
    orderBy: [{ orden: "asc" }, { creadoEn: "asc" }, { id: "asc" }],
  })
  const conteos = await ejecutor.publicacion.groupBy({
    by: ["temaId"],
    where: { claseId, tipo: { in: [...TIPOS_CON_TEMA] } },
    _count: { _all: true },
  })
  const porTema = new Map(conteos.map((conteo) => [conteo.temaId, conteo._count._all]))
  return {
    temas: temas.map((tema) => ({ ...tema, elementos: porTema.get(tema.id) ?? 0 })),
    sinTema: porTema.get(null) ?? 0,
  }
}

const leerTemasDeLaClase = (tx: Prisma.TransactionClient, claseId: string) =>
  tx.tema.findMany({
    where: { claseId },
    select: SELECT_TEMA,
    orderBy: [{ orden: "asc" }, { creadoEn: "asc" }, { id: "asc" }],
  })

export const crearTema = (
  { claseId, nombre }: { claseId: string; nombre: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<TemaDb> =>
  enTransaccion(ejecutor, async (tx) => {
    await bloquearClase(tx, claseId)
    const existentes = await leerTemasDeLaClase(tx, claseId)
    validarNuevoTema(existentes, nombre)
    const orden = siguienteOrden(existentes.map((tema) => tema.orden))
    const creado = await tx.tema.create({
      data: { claseId, nombre, orden },
      select: SELECT_TEMA,
    })
    return { ...creado, elementos: 0 }
  })

export const renombrarTema = (
  { claseId, temaId, nombre }: { claseId: string; temaId: string; nombre: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<TemaDb> =>
  enTransaccion(ejecutor, async (tx) => {
    await bloquearClase(tx, claseId)
    validarRenombre(await leerTemasDeLaClase(tx, claseId), temaId, nombre)
    const { count } = await tx.tema.updateMany({
      where: { id: temaId, claseId },
      data: { nombre },
    })
    if (count === 0) throw temaNoEncontrado()
    const tema = await tx.tema.findFirst({
      where: { id: temaId, claseId },
      select: SELECT_TEMA,
    })
    if (tema === null) throw temaNoEncontrado()
    const elementos = await tx.publicacion.count({
      where: { claseId, temaId, tipo: { in: [...TIPOS_CON_TEMA] } },
    })
    return { ...tema, elementos }
  })

// Sus elementos pasan a "Sin tema" en la misma sentencia (FK ON DELETE SET NULL).
export const borrarTema = (
  { claseId, temaId }: { claseId: string; temaId: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<void> =>
  enTransaccion(ejecutor, async (tx) => {
    await bloquearClase(tx, claseId)
    const { count } = await tx.tema.deleteMany({ where: { id: temaId, claseId } })
    if (count === 0) throw temaNoEncontrado()
  })

// El orden completo en una sola sentencia (UPDATE … FROM unnest): el SQL crudo no activa
// @updatedAt, así que actualizado_en se pone a mano. Etiquetado y parametrizado.
export const ordenarTemas = (
  { claseId, temaIds }: { claseId: string; temaIds: readonly string[] },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaTemasDb> =>
  enTransaccion(ejecutor, async (tx) => {
    await bloquearClase(tx, claseId)
    const actuales = await leerTemasDeLaClase(tx, claseId)
    validarOrdenDeTemas(
      actuales.map((tema) => tema.id),
      temaIds,
    )
    const ids = [...temaIds]
    const ordenes = ids.map((_, posicion) => posicion)
    await tx.$executeRaw`
      UPDATE temas
      SET orden = v.orden, actualizado_en = now()
      FROM unnest(${ids}::uuid[], ${ordenes}::int[]) AS v(id, orden)
      WHERE temas.id = v.id AND temas.clase_id = ${claseId}::uuid`
    return listarTemas(claseId, tx)
  })

// §D-2: mover no es editar (P-02 b), así que no mira la autoría. Un anuncio no lleva tema. Con
// temaId, el tema se bloquea FOR KEY SHARE antes de usarlo: un borrado simultáneo del tema espera, o
// si confirmó antes, el tema ya no se ve (404). El UPDATE repite id y clase_id por si la publicación
// se borró entre la lectura y la escritura.
export const moverATema = (
  {
    claseId,
    publicacionId,
    temaId,
  }: { claseId: string; publicacionId: string; temaId: string | null },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ElementoMovidoDb> =>
  enTransaccion(ejecutor, async (tx) => {
    const publicacion = await tx.publicacion.findFirst({
      where: { id: publicacionId, claseId },
      select: { tipo: true },
    })
    if (publicacion === null) throw publicacionNoEncontrada()
    if (publicacion.tipo === "anuncio") {
      throw new AppError("ANUNCIO_SIN_TEMA", "Los anuncios no van en temas.", 409)
    }
    if (temaId !== null && !(await bloquearTemaParaUsar(tx, { temaId, claseId }))) {
      throw temaNoEncontrado()
    }
    const { count } = await tx.publicacion.updateMany({
      where: { id: publicacionId, claseId, tipo: { in: [...TIPOS_CON_TEMA] } },
      data: { temaId },
    })
    if (count === 0) throw publicacionNoEncontrada()
    return { publicacionId, temaId: temaId?.toLowerCase() ?? null }
  })
