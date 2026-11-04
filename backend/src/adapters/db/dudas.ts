import { puedeBorrar, type ParticipanteDeAutoria } from "../../core/autoria.js"
import { AppError } from "../../core/errores.js"
import { paginar } from "../../core/paginacion.js"
import { enTransaccion, obtenerDb, type Ejecutor } from "./cliente.js"
import type { Prisma } from "./generated/client.js"
import type { AutorDb, ComentarioDb } from "./publicaciones.js"

// CLASES-03b (§D-5, P-07, S-06). "Dudas" de una clase y sus respuestas, que son comentarios con
// duda_id. Toda consulta por duda o respuesta filtra además por la clase de la ruta (y una respuesta,
// por su duda): un id de otra clase o de otro contexto es "no encontrado", sin escribir ni revelar
// nada. La autoría la decide puedeBorrar (core/autoria.ts) con el actor de la petición. Nada de esto
// avisa a nadie (S-04).
//
// Bloqueos: responder toma la fila de la duda FOR SHARE y borrarla la toma FOR UPDATE antes de borrar
// (sus respuestas caen en cascada). Así una respuesta y el borrado de su duda quedan en serie: si la
// respuesta va primero, el borrado se la lleva; si el borrado va primero, la respuesta ya no encuentra
// la duda y no inserta nada.

export interface DudaDb {
  id: string
  texto: string
  // El rol sale solo para la firma "Administración" (firmaDelAutor en el handler); nunca en la respuesta.
  autor: AutorDb
  creadoEn: Date
  resueltaEn: Date | null
  respuestas: number
  puedeBorrar: boolean
}

export interface ListaDudasDb {
  dudas: DudaDb[]
  siguienteCursor: string | null
}

export interface ListaRespuestasDb {
  respuestas: ComentarioDb[]
  siguienteCursor: string | null
}

// Mismo código y mensaje que los demás archivos de db: un cursor borrado, ajeno o inexistente
// responde igual (sin oráculo).
const errorCursorInvalido = (): AppError => new AppError("VALIDACION", "cursor: no es válido", 400)

const errorBorradoNoPermitido = (): AppError =>
  new AppError("BORRADO_NO_PERMITIDO", "No puedes borrar lo que publicó otra persona.", 403)

const SELECT_AUTOR = { select: { id: true, nombre: true, rol: true } } as const

// Quién la marcó (resuelta_por) nunca se selecciona: no sale en ninguna respuesta.
const SELECT_DUDA = {
  id: true,
  texto: true,
  creadoEn: true,
  resueltaEn: true,
  autor: SELECT_AUTOR,
} as const

const SELECT_RESPUESTA = {
  id: true,
  texto: true,
  creadoEn: true,
  autor: SELECT_AUTOR,
} as const

// De la más reciente a la más antigua, con cursor. En una sola instantánea, una sentencia tras otra:
// el cursor (una duda de la clase), la página por el índice (clase_id, creado_en DESC, id DESC) y el
// conteo de respuestas de la página (un groupBy por duda_id).
export const listarDudas = (
  {
    claseId,
    cursor,
    limite,
    actor,
  }: { claseId: string; cursor: string | undefined; limite: number; actor: ParticipanteDeAutoria },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaDudasDb> =>
  enTransaccion(
    ejecutor,
    async (tx) => {
      if (cursor !== undefined) {
        const delCursor = await tx.duda.findFirst({
          where: { id: cursor, claseId },
          select: { id: true },
        })
        if (delCursor === null) throw errorCursorInvalido()
      }
      const filas = await tx.duda.findMany({
        where: { claseId },
        select: SELECT_DUDA,
        orderBy: [{ creadoEn: "desc" }, { id: "desc" }],
        take: limite + 1,
        ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
      })
      const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.id)
      if (pagina.length === 0) return { dudas: [], siguienteCursor }

      const conteos = await tx.comentario.groupBy({
        by: ["dudaId"],
        where: { dudaId: { in: pagina.map((fila) => fila.id) } },
        _count: { _all: true },
      })
      const respuestasPorDuda = new Map(
        conteos.map((conteo) => [conteo.dudaId, conteo._count._all]),
      )
      return {
        dudas: pagina.map((fila) => ({
          ...fila,
          respuestas: respuestasPorDuda.get(fila.id) ?? 0,
          puedeBorrar: puedeBorrar(actor, fila.autor),
        })),
        siguienteCursor,
      }
    },
    { instantaneaUnica: true },
  )

// Una duda nueva, sin resolver ni respuestas; su autor puede borrarla.
export const crearDuda = async (
  { claseId, autorId, texto }: { claseId: string; autorId: string; texto: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<DudaDb> => {
  const creada = await ejecutor.duda.create({
    data: { claseId, autorId, texto },
    select: SELECT_DUDA,
  })
  return { ...creada, respuestas: 0, puedeBorrar: puedeBorrar(creada.autor, creada.autor) }
}

const leerDudaCon = async (
  tx: Prisma.TransactionClient,
  { claseId, dudaId, actor }: { claseId: string; dudaId: string; actor: ParticipanteDeAutoria },
): Promise<DudaDb | null> => {
  const fila = await tx.duda.findFirst({ where: { id: dudaId, claseId }, select: SELECT_DUDA })
  if (fila === null) return null
  const respuestas = await tx.comentario.count({ where: { dudaId } })
  return { ...fila, respuestas, puedeBorrar: puedeBorrar(actor, fila.autor) }
}

// Marcar pone la fecha y quién la marcó solo si estaba sin resolver: marcar dos veces no cambia la
// fecha. Quitar "Resuelta" los pone nulos. Una sola fila, sin filas hijas. null: la duda no existe en
// esa clase (o la borraron antes).
export const marcarDuda = (
  {
    claseId,
    dudaId,
    resuelta,
    actor,
    ahora,
  }: {
    claseId: string
    dudaId: string
    resuelta: boolean
    actor: ParticipanteDeAutoria
    ahora: Date
  },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<DudaDb | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const donde = { id: dudaId, claseId }
    await (resuelta
      ? tx.duda.updateMany({
          where: { ...donde, resueltaEn: null },
          data: { resueltaEn: ahora, resueltaPor: actor.id },
        })
      : tx.duda.updateMany({ where: donde, data: { resueltaEn: null, resueltaPor: null } }))
    return leerDudaCon(tx, { claseId, dudaId, actor })
  })

// Borra la duda y, en cascada, sus respuestas (DH-05). Primero toma la fila de la duda FOR UPDATE (SQL
// etiquetado y parametrizado): una respuesta en curso, que la tiene FOR SHARE, termina antes y cae en
// la cascada. false: no existe en esa clase. 403 BORRADO_NO_PERMITIDO sin escribir nada.
export const borrarDuda = (
  { claseId, dudaId, actor }: { claseId: string; dudaId: string; actor: ParticipanteDeAutoria },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<boolean> =>
  enTransaccion(ejecutor, async (tx) => {
    const [fila] = await tx.$queryRaw<{ autor_id: string }[]>`
      SELECT d.autor_id FROM dudas d
      WHERE d.id = ${dudaId}::uuid AND d.clase_id = ${claseId}::uuid
      FOR UPDATE`
    if (fila === undefined) return false
    const autor = await tx.usuario.findUnique({
      where: { id: fila.autor_id },
      select: { id: true, rol: true },
    })
    if (autor === null) return false
    if (!puedeBorrar(actor, autor)) throw errorBorradoNoPermitido()
    const { count } = await tx.duda.deleteMany({ where: { id: dudaId, claseId } })
    return count > 0
  })

// De la más antigua a la más reciente, con cursor. En una sola instantánea, una sentencia tras otra:
// la duda (de la clase), el cursor (una respuesta de esa duda) y la página por el índice
// (duda_id, creado_en, id). null: la duda no existe en esa clase.
export const listarRespuestas = (
  {
    claseId,
    dudaId,
    cursor,
    limite,
    actor,
  }: {
    claseId: string
    dudaId: string
    cursor: string | undefined
    limite: number
    actor: ParticipanteDeAutoria
  },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaRespuestasDb | null> =>
  enTransaccion(
    ejecutor,
    async (tx) => {
      const duda = await tx.duda.findFirst({
        where: { id: dudaId, claseId },
        select: { id: true },
      })
      if (duda === null) return null
      if (cursor !== undefined) {
        const delCursor = await tx.comentario.findFirst({
          where: { id: cursor, dudaId },
          select: { id: true },
        })
        if (delCursor === null) throw errorCursorInvalido()
      }
      const filas = await tx.comentario.findMany({
        where: { dudaId },
        select: SELECT_RESPUESTA,
        orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
        take: limite + 1,
        ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
      })
      const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.id)
      return {
        respuestas: pagina.map((fila) => ({
          ...fila,
          puedeBorrar: puedeBorrar(actor, fila.autor),
        })),
        siguienteCursor,
      }
    },
    { instantaneaUnica: true },
  )

// Responder lee primero la duda con FOR SHARE (SQL etiquetado y parametrizado). Sin fila (la duda no
// es de esa clase o ya se borró), devuelve null sin insertar. Una duda resuelta se sigue respondiendo
// (S-06).
export const crearRespuesta = (
  {
    claseId,
    dudaId,
    autorId,
    texto,
  }: { claseId: string; dudaId: string; autorId: string; texto: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ComentarioDb | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const duda = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM dudas
      WHERE id = ${dudaId}::uuid AND clase_id = ${claseId}::uuid
      FOR SHARE`
    if (duda.length === 0) return null

    const creada = await tx.comentario.create({
      data: { dudaId, autorId, texto },
      select: SELECT_RESPUESTA,
    })
    return { ...creada, puedeBorrar: puedeBorrar(creada.autor, creada.autor) }
  })

// Una sola fila, sin filas hijas: lee la autoría y borra en la misma transacción, filtrando por la
// respuesta, su duda y la clase de la duda. false: no existe ahí (o ya la borró otra petición).
export const borrarRespuesta = (
  {
    claseId,
    dudaId,
    respuestaId,
    actor,
  }: { claseId: string; dudaId: string; respuestaId: string; actor: ParticipanteDeAutoria },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<boolean> =>
  enTransaccion(ejecutor, async (tx) => {
    const donde = { id: respuestaId, dudaId, duda: { claseId } }
    const respuesta = await tx.comentario.findFirst({
      where: donde,
      select: { autor: SELECT_AUTOR },
    })
    if (respuesta === null) return false
    if (!puedeBorrar(actor, respuesta.autor)) throw errorBorradoNoPermitido()
    const { count } = await tx.comentario.deleteMany({ where: donde })
    return count > 0
  })
