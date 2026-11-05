import type { ParticipanteDeAutoria } from "../../core/autoria.js"
import { exigirVersion } from "../../core/concurrencia.js"
import { AppError } from "../../core/errores.js"
import { paginar } from "../../core/paginacion.js"
import {
  bloqueEfectivo,
  puedeBorrarRecurso,
  puedeEditarRecurso,
  puedeMoverRecurso,
  type Bloque,
} from "../../core/recursos.js"
import { SELECT_ARCHIVO, type ArchivoDb } from "./archivos.js"
import { enTransaccion, obtenerDb, type Ejecutor } from "./cliente.js"
import type { Prisma } from "./generated/client.js"
import type { AutorDb } from "./publicaciones.js"
import { bloquearTemaParaUsar } from "./referencias.js"
import { confirmarArchivos } from "./tareas.js"

// CLASES-03a (§D-3.5 a §D-3.7). Un recurso es una publicación de tipo material con su bloque. Aquí se
// listan, se leen y se editan; se publican, se borran, se mueven y se comentan por las rutas del muro
// y de temas. Toda consulta filtra además por la clase de la ruta: un id de otra clase es "no
// encontrado", sin escribir ni revelar nada. Los permisos los decide core/recursos.ts con el actor de
// la petición; aquí nadie mira un rol.

export interface RecursoDb {
  id: string
  titulo: string
  texto: string
  // El rol sale solo para la firma "Administración" (firmaDelAutor en el handler); nunca en la respuesta.
  autor: AutorDb
  creadoEn: Date
  bloque: Bloque
  adjuntos: ArchivoDb[]
  comentarios: number
  puedeEditar: boolean
  puedeBorrar: boolean
  puedeMover: boolean
}

export interface RecursoDetalleDb extends RecursoDb {
  version: number
  tema: { id: string; nombre: string } | null
}

export interface ListaRecursosDb {
  recursos: RecursoDb[]
  siguienteCursor: string | null
}

const errorTemaNoEncontrado = (): AppError =>
  new AppError("TEMA_NO_ENCONTRADO", "Ese tema ya no existe.", 404)

// Mismo código y mensaje que los demás archivos de db: un cursor borrado, ajeno, de otro bloque o de
// otro tema responde igual (sin oráculo).
const errorCursorInvalido = (): AppError => new AppError("VALIDACION", "cursor: no es válido", 400)

const errorEdicionNoPermitida = (): AppError =>
  new AppError("EDICION_NO_PERMITIDA", "No puedes editar este recurso.", 403)

const errorRecursoModificado = (): AppError =>
  new AppError(
    "RECURSO_MODIFICADO",
    "Otra persona guardó este recurso mientras lo editabas. Te mostramos la versión actual.",
    409,
  )

const errorArchivoInvalido = (): AppError =>
  new AppError(
    "ARCHIVO_INVALIDO",
    "Uno de los archivos no coincide con lo que elegiste. Vuelve a adjuntarlo.",
    400,
  )

// Inalcanzable: el CHECK publicaciones_titulo_segun_tipo exige título a un material.
const errorRecursoSinTitulo = (): AppError =>
  new AppError("ERROR_INTERNO", "Un recurso no tiene título.", 500)

const SELECT_AUTOR = { select: { id: true, nombre: true, rol: true } } as const

const SELECT_RECURSO = {
  id: true,
  titulo: true,
  texto: true,
  creadoEn: true,
  bloque: true,
  autor: SELECT_AUTOR,
} as const

// Los permisos del recurso para el actor de la petición, con el bloque efectivo (DH-02 a).
const conPermisos = (
  actor: ParticipanteDeAutoria,
  fila: { titulo: string | null; autor: AutorDb; bloque: Bloque | null },
) => {
  if (fila.titulo === null) throw errorRecursoSinTitulo()
  const bloque = bloqueEfectivo(fila.bloque, fila.autor)
  return {
    titulo: fila.titulo,
    bloque,
    puedeEditar: puedeEditarRecurso(actor, fila.autor, bloque),
    puedeBorrar: puedeBorrarRecurso(actor, fila.autor, bloque),
    puedeMover: puedeMoverRecurso(actor, bloque),
  }
}

// Los recursos de un bloque y de un tema (o de "Sin tema"), del más reciente al más antiguo, con
// cursor. En una sola instantánea, una sentencia tras otra: el tema (si es un id), la comprobación
// del cursor contra esta misma lista (misma clase, bloque y tema), la página (índice (clase_id,
// bloque, tema_id, creado_en, id)), los adjuntos confirmados de la página (una consulta) y el conteo
// de comentarios (un groupBy). Un material con bloque nulo no tiene bloque que coincida: no sale.
export const listarRecursos = (
  {
    claseId,
    bloque,
    tema,
    cursor,
    limite,
    actor,
  }: {
    claseId: string
    bloque: Bloque
    tema: string
    cursor: string | undefined
    limite: number
    actor: ParticipanteDeAutoria
  },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaRecursosDb> =>
  enTransaccion(
    ejecutor,
    async (tx) => {
      const temaId = tema === "sin-tema" ? null : tema
      if (temaId !== null) {
        const existe = await tx.tema.findFirst({
          where: { id: temaId, claseId },
          select: { id: true },
        })
        if (existe === null) throw errorTemaNoEncontrado()
      }
      const donde = { claseId, tipo: "material" as const, bloque, temaId }
      if (cursor !== undefined) {
        const delCursor = await tx.publicacion.findFirst({
          where: { ...donde, id: cursor },
          select: { id: true },
        })
        if (delCursor === null) throw errorCursorInvalido()
      }
      const filas = await tx.publicacion.findMany({
        where: donde,
        select: SELECT_RECURSO,
        orderBy: [{ creadoEn: "desc" }, { id: "desc" }],
        take: limite + 1,
        ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
      })
      const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.id)
      if (pagina.length === 0) return { recursos: [], siguienteCursor }

      const ids = pagina.map((fila) => fila.id)
      const archivos = await tx.archivo.findMany({
        where: { publicacionId: { in: ids }, claseId, estado: "confirmado" },
        select: { ...SELECT_ARCHIVO, publicacionId: true },
        orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
      })
      const adjuntosPorRecurso = new Map<string, ArchivoDb[]>()
      for (const { publicacionId, ...archivo } of archivos) {
        if (publicacionId === null) continue
        adjuntosPorRecurso.set(publicacionId, [
          ...(adjuntosPorRecurso.get(publicacionId) ?? []),
          archivo,
        ])
      }
      const conteos = await tx.comentario.groupBy({
        by: ["publicacionId"],
        where: { publicacionId: { in: ids } },
        _count: { _all: true },
      })
      const comentariosPorRecurso = new Map(
        conteos.map((conteo) => [conteo.publicacionId, conteo._count._all]),
      )
      return {
        recursos: pagina.map((fila) => ({
          ...fila,
          ...conPermisos(actor, fila),
          adjuntos: adjuntosPorRecurso.get(fila.id) ?? [],
          comentarios: comentariosPorRecurso.get(fila.id) ?? 0,
        })),
        siguienteCursor,
      }
    },
    { instantaneaUnica: true },
  )

// Un recurso con su versión y su tema, para editarlo. Una sentencia tras otra con `db`: la
// publicación (solo un material de esa clase), sus adjuntos confirmados y su conteo de comentarios.
// null: no es un material de esa clase (un anuncio, una tarea, otra clase o un id inexistente).
const leerRecursoCon = async (
  db: Ejecutor,
  {
    claseId,
    recursoId,
    actor,
  }: { claseId: string; recursoId: string; actor: ParticipanteDeAutoria },
): Promise<RecursoDetalleDb | null> => {
  const fila = await db.publicacion.findFirst({
    where: { id: recursoId, claseId, tipo: "material" },
    select: { ...SELECT_RECURSO, version: true, tema: { select: { id: true, nombre: true } } },
  })
  if (fila === null) return null
  const adjuntos = await db.archivo.findMany({
    where: { publicacionId: recursoId, claseId, estado: "confirmado" },
    select: SELECT_ARCHIVO,
    orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
  })
  const comentarios = await db.comentario.count({ where: { publicacionId: recursoId } })
  return { ...fila, ...conPermisos(actor, fila), adjuntos, comentarios }
}

// En una sola instantánea: un borrado confirmado entre la publicación y sus adjuntos no deja una
// respuesta a medias. Anidada en la transacción de editarRecurso, la opción se ignora.
export const leerRecurso = (
  params: { claseId: string; recursoId: string; actor: ParticipanteDeAutoria },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<RecursoDetalleDb | null> =>
  enTransaccion(ejecutor, (tx) => leerRecursoCon(tx, params), { instantaneaUnica: true })

interface FilaDeRecursoBloqueada {
  autor_id: string
  bloque: Bloque | null
  version: number
}

// Los archivos de la edición, con el algoritmo de editarTarea: los conservados deben seguir
// confirmados en esta publicación (si no, 400); los que salen pasan a descartado sin publicación; los
// nuevos (que el handler ya comprobó en el almacén) se confirman con el UPDATE condicionado y conteo.
const reemplazarArchivos = async (
  tx: Prisma.TransactionClient,
  {
    claseId,
    recursoId,
    subidoPor,
    archivoIds,
    archivosNuevos,
  }: {
    claseId: string
    recursoId: string
    subidoPor: string
    archivoIds: readonly string[]
    archivosNuevos: readonly ArchivoDb[]
  },
): Promise<void> => {
  const actuales = await tx.archivo.findMany({
    where: { publicacionId: recursoId, claseId, estado: "confirmado" },
    select: { id: true },
  })
  const idsActuales = new Set(actuales.map((archivo) => archivo.id))
  const idsNuevos = new Set(archivosNuevos.map((archivo) => archivo.id))
  for (const id of archivoIds) {
    if (!idsActuales.has(id) && !idsNuevos.has(id)) throw errorArchivoInvalido()
  }
  const finales = new Set(archivoIds)
  const salen = actuales.filter((archivo) => !finales.has(archivo.id)).map((archivo) => archivo.id)
  if (salen.length > 0) {
    await tx.archivo.updateMany({
      where: { id: { in: salen }, publicacionId: recursoId, claseId },
      // ADMIN-01b (M-02): un adjunto descartado deja de ser una copia en curso.
      data: { estado: "descartado", publicacionId: null, copiaDe: null },
    })
  }
  await confirmarArchivos(tx, {
    archivos: archivosNuevos.filter((archivo) => finales.has(archivo.id)),
    claseId,
    subidoPor,
    publicacionId: recursoId,
  })
}

// Editar (§D-3.7). En una transacción READ COMMITTED: bloquea la fila del material (FOR NO KEY
// UPDATE: dos ediciones, o una edición y un movimiento, quedan en serie), lee su autor por PK y
// decide con el bloque efectivo (403 sin escribir), compara la versión (409 sin escribir), bloquea el
// tema (404 sin escribir), escribe título, descripción, tema y versión + 1, y después los archivos.
// Sin evento: editar no avisa a nadie (S-04). null: no es un material de esa clase.
export const editarRecurso = (
  {
    claseId,
    recursoId,
    actor,
    titulo,
    texto,
    temaId,
    version,
    archivoIds,
    archivosNuevos,
  }: {
    claseId: string
    recursoId: string
    actor: ParticipanteDeAutoria
    titulo: string
    texto: string
    temaId: string | null
    // La versión con que se abrió el formulario.
    version: number
    archivoIds: readonly string[]
    archivosNuevos: readonly ArchivoDb[]
  },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<RecursoDetalleDb | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const [fila] = await tx.$queryRaw<FilaDeRecursoBloqueada[]>`
      SELECT p.autor_id, p.bloque::text AS bloque, p.version
      FROM publicaciones p
      WHERE p.id = ${recursoId}::uuid AND p.clase_id = ${claseId}::uuid AND p.tipo = 'material'
      FOR NO KEY UPDATE`
    if (fila === undefined) return null

    const autor = await tx.usuario.findUnique({
      where: { id: fila.autor_id },
      select: { id: true, rol: true },
    })
    if (autor === null) return null
    if (!puedeEditarRecurso(actor, autor, bloqueEfectivo(fila.bloque, autor))) {
      throw errorEdicionNoPermitida()
    }
    exigirVersion({ leida: version, actual: fila.version }, errorRecursoModificado)
    if (temaId !== null && !(await bloquearTemaParaUsar(tx, { temaId, claseId }))) {
      throw errorTemaNoEncontrado()
    }

    await tx.publicacion.updateMany({
      where: { id: recursoId, claseId, tipo: "material" },
      data: { titulo, texto, temaId, version: { increment: 1 } },
    })
    await reemplazarArchivos(tx, {
      claseId,
      recursoId,
      subidoPor: actor.id,
      archivoIds,
      archivosNuevos,
    })
    return leerRecursoCon(tx, { claseId, recursoId, actor })
  })
