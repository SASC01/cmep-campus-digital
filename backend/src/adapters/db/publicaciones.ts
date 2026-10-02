import { AppError } from "../../core/errores.js"
import { paginar } from "../../core/paginacion.js"
import { SELECT_ARCHIVO, VIGENCIA_PENDIENTE_MS, type ArchivoDb } from "./archivos.js"
import {
  enTransaccion,
  ejecutorSqlDe,
  obtenerDb,
  type Ejecutor,
  type EjecutorSql,
} from "./cliente.js"

// CLASES-c (§D-C2, §D-C3). El muro de una clase: publicaciones y comentarios. Toda consulta por
// publicación o comentario filtra además por la clase de la ruta: un id de otra clase es "no
// encontrado", sin escribir ni revelar nada.

export interface AutorDb {
  id: string
  nombre: string
}

export interface PublicacionDb {
  id: string
  tipo: "anuncio" | "material"
  titulo: string | null
  texto: string
  autor: AutorDb
  creadoEn: Date
  comentarios: number
  // CLASES-d (C-21): siempre presente; [] si no tiene archivos.
  adjuntos: ArchivoDb[]
}

export interface ListaPublicacionesDb {
  publicaciones: PublicacionDb[]
  siguienteCursor: string | null
}

export interface ComentarioDb {
  id: string
  texto: string
  autor: AutorDb
  creadoEn: Date
}

export interface ListaComentariosDb {
  comentarios: ComentarioDb[]
  siguienteCursor: string | null
}

// T-29: mismo código y mensaje que errorCursorInvalido de db/clases.ts y db/inscripciones.ts (cada
// archivo de db lleva el suyo; db/clases.ts no se toca en c). Un cursor borrado, ajeno o inexistente
// responde igual: sin oráculo.
const errorCursorInvalido = (): AppError => new AppError("VALIDACION", "cursor: no es válido", 400)

const errorArchivoInvalido = (): AppError =>
  new AppError(
    "ARCHIVO_INVALIDO",
    "Uno de los archivos no coincide con lo que elegiste. Vuelve a adjuntarlo.",
    400,
  )

const SELECT_AUTOR = { select: { id: true, nombre: true } } as const

const SELECT_PUBLICACION = {
  id: true,
  tipo: true,
  titulo: true,
  texto: true,
  creadoEn: true,
  autor: SELECT_AUTOR,
} as const

const SELECT_COMENTARIO = {
  id: true,
  texto: true,
  creadoEn: true,
  autor: SELECT_AUTOR,
} as const

// El id lo genera el handler (N-03): es también el id del trabajo de la cola (el eventId). La
// publicación, la confirmación de sus archivos (d) y lo que haga alGuardar (encolar el aviso, con el
// ejecutor SQL de esta misma transacción) confirman juntos o ninguno: si algo lanza, todo se
// revierte. `archivos` son las filas que el handler ya leyó con buscarArchivosParaConfirmar; el
// UPDATE repite las condiciones por si algo cambió entre la lectura y la escritura (otra
// publicación que reclamó el mismo archivo, o el paso de las 24 h): si no confirma todas, 400. Sin
// archivos (c) no toca la tabla.
export const crearPublicacion = (
  {
    id,
    claseId,
    autorId,
    tipo,
    titulo,
    texto,
    archivos = [],
  }: {
    id: string
    claseId: string
    autorId: string
    tipo: "anuncio" | "material"
    titulo: string | null
    texto: string
    archivos?: readonly ArchivoDb[]
  },
  alGuardar: (sql: EjecutorSql) => Promise<void>,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<PublicacionDb> =>
  enTransaccion(ejecutor, async (tx) => {
    const creada = await tx.publicacion.create({
      data: { id, claseId, autorId, tipo, titulo, texto },
      select: SELECT_PUBLICACION,
    })
    if (archivos.length > 0) {
      const { count } = await tx.archivo.updateMany({
        where: {
          id: { in: archivos.map((archivo) => archivo.id) },
          claseId,
          subidoPor: autorId,
          estado: "pendiente",
          publicacionId: null,
          creadoEn: { gt: new Date(Date.now() - VIGENCIA_PENDIENTE_MS) },
        },
        data: { estado: "confirmado", publicacionId: id },
      })
      if (count !== archivos.length) throw errorArchivoInvalido()
    }
    await alGuardar(ejecutorSqlDe(tx))
    return { ...creada, comentarios: 0, adjuntos: [...archivos] }
  })

// Más reciente primero. Cursor de Prisma sobre la PK (el orden es creado_en DESC, id DESC, que
// sigue el índice de la clase). El conteo de comentarios sale de una sola consulta agrupada para
// toda la página, fuera de cualquier ciclo.
export const listarPublicaciones = async (
  { claseId, cursor, limite }: { claseId: string; cursor: string | undefined; limite: number },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaPublicacionesDb> => {
  if (cursor !== undefined) {
    const delCursor = await ejecutor.publicacion.findFirst({
      where: { id: cursor, claseId },
      select: { id: true },
    })
    if (delCursor === null) throw errorCursorInvalido()
  }
  const filas = await ejecutor.publicacion.findMany({
    where: { claseId },
    select: SELECT_PUBLICACION,
    orderBy: [{ creadoEn: "desc" }, { id: "desc" }],
    take: limite + 1,
    ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
  })
  const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.id)
  if (pagina.length === 0) return { publicaciones: [], siguienteCursor }

  const conteos = await ejecutor.comentario.groupBy({
    by: ["publicacionId"],
    where: { publicacionId: { in: pagina.map((fila) => fila.id) } },
    _count: { _all: true },
  })
  const comentariosPorPublicacion = new Map(
    conteos.map((conteo) => [conteo.publicacionId, conteo._count._all]),
  )
  // d: una sola consulta para los adjuntos de toda la página (índice archivos(publicacion_id)).
  const archivos = await ejecutor.archivo.findMany({
    where: { publicacionId: { in: pagina.map((fila) => fila.id) }, estado: "confirmado" },
    select: { ...SELECT_ARCHIVO, publicacionId: true },
    orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
  })
  const adjuntosPorPublicacion = new Map<string, ArchivoDb[]>()
  for (const { publicacionId, ...archivo } of archivos) {
    if (publicacionId === null) continue
    adjuntosPorPublicacion.set(publicacionId, [
      ...(adjuntosPorPublicacion.get(publicacionId) ?? []),
      archivo,
    ])
  }
  return {
    publicaciones: pagina.map((fila) => ({
      ...fila,
      comentarios: comentariosPorPublicacion.get(fila.id) ?? 0,
      adjuntos: adjuntosPorPublicacion.get(fila.id) ?? [],
    })),
    siguienteCursor,
  }
}

// Borra con id y clase_id; sus comentarios caen en cascada. false: no existe en esa clase. d: antes
// del DELETE, en la misma transacción, sus archivos pasan a descartado y pierden la publicación (el
// CHECK de §D-D1 lo exige, y publicacion_id es NO ACTION); los objetos siguen en el almacén hasta la
// limpieza diaria. El filtro por clase_id evita descartar los archivos de una publicación ajena.
export const borrarPublicacion = (
  { claseId, publicacionId }: { claseId: string; publicacionId: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<boolean> =>
  enTransaccion(ejecutor, async (tx) => {
    await tx.archivo.updateMany({
      where: { publicacionId, claseId },
      data: { estado: "descartado", publicacionId: null },
    })
    const { count } = await tx.publicacion.deleteMany({ where: { id: publicacionId, claseId } })
    return count > 0
  })

// null: la publicación no existe en esa clase.
export const listarComentarios = async (
  {
    claseId,
    publicacionId,
    cursor,
    limite,
  }: { claseId: string; publicacionId: string; cursor: string | undefined; limite: number },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaComentariosDb | null> => {
  const publicacion = await ejecutor.publicacion.findFirst({
    where: { id: publicacionId, claseId },
    select: { id: true },
  })
  if (publicacion === null) return null

  if (cursor !== undefined) {
    const delCursor = await ejecutor.comentario.findFirst({
      where: { id: cursor, publicacionId },
      select: { id: true },
    })
    if (delCursor === null) throw errorCursorInvalido()
  }
  const filas = await ejecutor.comentario.findMany({
    where: { publicacionId },
    select: SELECT_COMENTARIO,
    orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
    take: limite + 1,
    ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
  })
  const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.id)
  return { comentarios: pagina, siguienteCursor }
}

// N-09: la transacción lee primero la publicación con FOR SHARE (única consulta cruda nueva de la
// subentrega, etiquetada y parametrizada). Sin fila (la publicación no es de esa clase o ya se
// borró), devuelve null sin insertar. Un borrado simultáneo espera a que este comentario confirme y
// lo borra en cascada; si el borrado confirma antes, el FOR SHARE ya no ve la fila.
export const crearComentario = (
  {
    id,
    claseId,
    publicacionId,
    autorId,
    texto,
  }: { id: string; claseId: string; publicacionId: string; autorId: string; texto: string },
  alGuardar: (sql: EjecutorSql) => Promise<void>,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ComentarioDb | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const publicacion = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM publicaciones
      WHERE id = ${publicacionId}::uuid AND clase_id = ${claseId}::uuid
      FOR SHARE`
    if (publicacion.length === 0) return null

    const creado = await tx.comentario.create({
      data: { id, publicacionId, autorId, texto },
      select: SELECT_COMENTARIO,
    })
    await alGuardar(ejecutorSqlDe(tx))
    return creado
  })

// El maestro dueño borra cualquier comentario de la publicación de su clase. false: no existe ahí.
export const borrarComentario = async (
  {
    claseId,
    publicacionId,
    comentarioId,
  }: { claseId: string; publicacionId: string; comentarioId: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<boolean> => {
  const { count } = await ejecutor.comentario.deleteMany({
    where: { id: comentarioId, publicacionId, publicacion: { claseId } },
  })
  return count > 0
}

// "Mis comentarios": autor_id va dentro de la condición del borrado, así que el comentario de otra
// persona no se toca. false: no existe, no es de esa clase o no es del autor.
export const borrarMiComentario = async (
  { claseId, comentarioId, autorId }: { claseId: string; comentarioId: string; autorId: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<boolean> => {
  const { count } = await ejecutor.comentario.deleteMany({
    where: { id: comentarioId, autorId, publicacion: { claseId } },
  })
  return count > 0
}
