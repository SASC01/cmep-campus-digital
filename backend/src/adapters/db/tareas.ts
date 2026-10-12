import {
  puedeBorrarTarea,
  puedeEditarTarea,
  type ParticipanteDeAutoria,
} from "../../core/autoria.js"
import { exigirVersion } from "../../core/concurrencia.js"
import { AppError } from "../../core/errores.js"
import { paginar } from "../../core/paginacion.js"
import { planDeRecordatorio, type PlanDeRecordatorio } from "../../core/tareas/recordatorio.js"
import {
  tareaModificada,
  validarCategoriaRequerida,
  validarFechaLimite,
} from "../../core/tareas/tareas.js"
import { SELECT_ARCHIVO, VIGENCIA_PENDIENTE_MS, type ArchivoDb } from "./archivos.js"
import {
  ejecutorSqlDe,
  enTransaccion,
  obtenerDb,
  type Ejecutor,
  type EjecutorSql,
} from "./cliente.js"
import type { Prisma } from "./generated/client.js"
import { bloquearCategoriaParaUsar, bloquearTemaParaUsar } from "./referencias.js"
import type { AutorDb } from "./publicaciones.js"

// TAREAS-01b (§D-4, §D-6, §D-7). Una tarea es una publicación de tipo `tarea` más su fila 1:1 en
// `tareas` (mismo id); este es el único archivo que escribe ese tipo. Toda consulta por tarea, tema o
// archivo filtra además por la clase de la ruta: un id de otra clase es "no encontrado", sin escribir
// ni revelar nada. Los trabajos diferidos (adapters/queue) no se importan aquí: el handler pasa los
// callbacks (`alGuardar`, `alReprogramar`, `alBorrar`) que reciben el ejecutor SQL de la transacción.

export interface TareaDetalleDb {
  id: string
  titulo: string
  instrucciones: string
  fechaLimite: Date
  puntos: number
  aceptaTardias: boolean
  // ENTREGAS-01a: "Cómo se entrega" (P-03 a) y la versión de la fila (P-05 a′).
  requiereAdjuntos: boolean
  version: number
  categoria: { id: string; nombre: string; peso: number } | null
  tema: { id: string; nombre: string } | null
  rubrica: { id: string; criterio: string; puntosMax: number }[]
  adjuntos: ArchivoDb[]
  // El rol sale solo para la firma "Administración" (firmaDelAutor en el handler); nunca en la respuesta.
  autor: AutorDb
  creadoEn: Date
  actualizadoEn: Date
  puedeEditar: boolean
  puedeBorrar: boolean
}

export interface CriterioNuevo {
  criterio: string
  puntosMax: number
}

export interface ElementoDeTrabajoDb {
  id: string
  tipo: "material" | "tarea"
  titulo: string
  autor: AutorDb
  creadoEn: Date
  material: { texto: string; adjuntos: ArchivoDb[] } | null
  tarea: { fechaLimite: Date; puntos: number } | null
}

export interface ListaTrabajoDb {
  elementos: ElementoDeTrabajoDb[]
  siguienteCursor: string | null
}

const errorTareaNoEncontrada = (): AppError =>
  new AppError("TAREA_NO_ENCONTRADA", "Esa tarea ya no existe.", 404)

const errorTemaNoEncontrado = (): AppError =>
  new AppError("TEMA_NO_ENCONTRADO", "Ese tema ya no existe.", 404)

const errorCategoriaNoEncontrada = (): AppError =>
  new AppError("CATEGORIA_NO_ENCONTRADA", "Esa categoría ya no existe. Elige otra.", 404)

const errorEdicionNoPermitida = (): AppError =>
  new AppError("EDICION_NO_PERMITIDA", "No puedes editar lo que publicó otra persona.", 403)

// Inalcanzable: el CHECK publicaciones_titulo_segun_tipo exige título a una tarea. Si faltara, es un
// error explícito y no un título vacío en silencio (pendiente de TAREAS-01, absorbido en ENTREGAS-01a).
const errorTareaSinTitulo = (): AppError =>
  new AppError("ERROR_INTERNO", "La tarea no tiene título.", 500)

const errorBorradoNoPermitido = (): AppError =>
  new AppError("BORRADO_NO_PERMITIDO", "No puedes borrar lo que publicó otra persona.", 403)

const errorArchivoInvalido = (): AppError =>
  new AppError(
    "ARCHIVO_INVALIDO",
    "Uno de los archivos no coincide con lo que elegiste. Vuelve a adjuntarlo.",
    400,
  )

// Mismo código y mensaje que los demás archivos de db: un cursor borrado, ajeno, de otro tema o de
// otro tipo responde igual (sin oráculo).
const errorCursorInvalido = (): AppError => new AppError("VALIDACION", "cursor: no es válido", 400)

const SELECT_AUTOR = { select: { id: true, nombre: true, rol: true } } as const

// Los elementos que se agrupan en un tema: materiales y tareas (los anuncios no llevan tema).
const TIPOS_DE_TRABAJO = ["material", "tarea"] as const

// Lectura de la tarea (§D-4, "Ver"). Las sentencias van una tras otra con `db`: la tarea, su
// publicación (relación obligatoria: título, instrucciones y autor, con el tema), la categoría, los
// criterios por orden, los archivos confirmados de la publicación y los maestros de la clase (para
// puedeEditar y puedeBorrar). No escribe nada. null: la tarea no existe en esa clase.
const leerTareaCon = async (
  db: Ejecutor,
  { claseId, tareaId, actor }: { claseId: string; tareaId: string; actor: ParticipanteDeAutoria },
): Promise<TareaDetalleDb | null> => {
  const tarea = await db.tarea.findFirst({
    where: { id: tareaId, claseId },
    select: {
      id: true,
      fechaLimite: true,
      puntos: true,
      aceptaTardias: true,
      requiereAdjuntos: true,
      version: true,
      creadoEn: true,
      actualizadoEn: true,
      publicacion: {
        select: {
          titulo: true,
          texto: true,
          autor: SELECT_AUTOR,
          tema: { select: { id: true, nombre: true } },
        },
      },
      categoria: { select: { id: true, nombre: true, peso: true } },
      criterios: {
        select: { id: true, criterio: true, puntosMax: true },
        orderBy: { orden: "asc" },
      },
    },
  })
  if (tarea === null) return null

  const adjuntos = await db.archivo.findMany({
    where: { publicacionId: tareaId, claseId, estado: "confirmado" },
    select: SELECT_ARCHIVO,
    orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
  })
  const maestros = await db.maestroDeClase.findMany({
    where: { claseId },
    select: { maestroId: true },
  })
  const { publicacion } = tarea
  const autorSigueEnLaClase = maestros.some(({ maestroId }) => maestroId === publicacion.autor.id)
  if (publicacion.titulo === null) throw errorTareaSinTitulo()
  return {
    id: tarea.id,
    titulo: publicacion.titulo,
    instrucciones: publicacion.texto,
    fechaLimite: tarea.fechaLimite,
    puntos: tarea.puntos,
    aceptaTardias: tarea.aceptaTardias,
    requiereAdjuntos: tarea.requiereAdjuntos,
    version: tarea.version,
    categoria: tarea.categoria,
    tema: publicacion.tema,
    rubrica: tarea.criterios,
    adjuntos,
    autor: publicacion.autor,
    creadoEn: tarea.creadoEn,
    actualizadoEn: tarea.actualizadoEn,
    puedeEditar: puedeEditarTarea(actor, publicacion.autor, autorSigueEnLaClase),
    puedeBorrar: puedeBorrarTarea(actor, publicacion.autor, autorSigueEnLaClase),
  }
}

// Enmienda 2 (§D-12): la tarea se lee en una sola instantánea (solo lectura): su
// publicación es una relación obligatoria y un borrado confirmado entre la fila de la tarea y la de
// su publicación dejaría la respuesta sin título ni autor. Anidada en una transacción de escritura
// (crearTarea y editarTarea responden con leerTarea(…, tx)), la opción se ignora.
export const leerTarea = (
  params: { claseId: string; tareaId: string; actor: ParticipanteDeAutoria },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<TareaDetalleDb | null> =>
  enTransaccion(ejecutor, (tx) => leerTareaCon(tx, params), { instantaneaUnica: true })

// Los adjuntos confirmados de una publicación de la clase, para preparar la edición (una sola
// sentencia). La edición vuelve a comprobarlos dentro de su transacción, con la tarea bloqueada.
export const adjuntosConfirmadosDe = (
  { claseId, publicacionId }: { claseId: string; publicacionId: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ArchivoDb[]> =>
  ejecutor.archivo.findMany({
    where: { publicacionId, claseId, estado: "confirmado" },
    select: SELECT_ARCHIVO,
    orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
  })

// Categoría y tema como referencias dentro de la transacción de escritura (§D-4, §D-7): con id, se
// bloquea FOR KEY SHARE (referencias.ts) y un id de otra clase o ya borrado es 404; sin categoría, si
// la clase tiene al menos una, se exige (P-01 a). Nunca un P2003 ni un 500.
const asegurarReferencias = async (
  tx: Prisma.TransactionClient,
  {
    claseId,
    categoriaId,
    temaId,
  }: { claseId: string; categoriaId: string | null; temaId: string | null },
): Promise<void> => {
  if (categoriaId !== null) {
    if (!(await bloquearCategoriaParaUsar(tx, { categoriaId, claseId }))) {
      throw errorCategoriaNoEncontrada()
    }
  } else {
    const categoriasEnLaClase = await tx.categoria.count({ where: { claseId } })
    validarCategoriaRequerida({ categoriaId, categoriasEnLaClase })
  }
  if (temaId !== null && !(await bloquearTemaParaUsar(tx, { temaId, claseId }))) {
    throw errorTemaNoEncontrado()
  }
}

// Confirma archivos pendientes del autor en esta publicación: el UPDATE repite las condiciones de la
// lectura del handler por si algo cambió (otra publicación los reclamó, o pasaron las 24 h); si no
// confirma todos, 400 y todo se revierte.
const confirmarArchivos = async (
  tx: Prisma.TransactionClient,
  {
    archivos,
    claseId,
    subidoPor,
    publicacionId,
  }: { archivos: readonly ArchivoDb[]; claseId: string; subidoPor: string; publicacionId: string },
): Promise<void> => {
  if (archivos.length === 0) return
  const { count } = await tx.archivo.updateMany({
    where: {
      id: { in: archivos.map((archivo) => archivo.id) },
      claseId,
      subidoPor,
      estado: "pendiente",
      publicacionId: null,
      creadoEn: { gt: new Date(Date.now() - VIGENCIA_PENDIENTE_MS) },
    },
    data: { estado: "confirmado", publicacionId },
  })
  if (count !== archivos.length) throw errorArchivoInvalido()
}

export interface DatosDeTarea {
  titulo: string
  instrucciones: string
  fechaLimite: Date
  puntos: number
  aceptaTardias: boolean
  requiereAdjuntos: boolean
  categoriaId: string | null
  temaId: string | null
  rubrica: readonly CriterioNuevo[]
}

// El id lo genera el handler (es el de la publicación, el de la tarea y el del trabajo TAREA_CREADA).
// Todo en una transacción, en este orden: categoría y tema (§D-7), publicación, tarea, criterios,
// archivos y alGuardar (el handler encola TAREA_CREADA y, si hay momento, RECORDATORIO_24H con el
// ejecutor SQL de esta misma transacción). Si algo lanza, no queda tarea, publicación, criterio,
// archivo confirmado ni trabajo.
export const crearTarea = (
  {
    id,
    claseId,
    autor,
    trabajoId,
    archivos = [],
    ...datos
  }: DatosDeTarea & {
    id: string
    claseId: string
    autor: ParticipanteDeAutoria
    // Id del RECORDATORIO_24H si se programa; null si el momento ya pasó.
    trabajoId: string | null
    archivos?: readonly ArchivoDb[]
  },
  alGuardar: (sql: EjecutorSql) => Promise<void>,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<TareaDetalleDb> =>
  enTransaccion(ejecutor, async (tx) => {
    await asegurarReferencias(tx, {
      claseId,
      categoriaId: datos.categoriaId,
      temaId: datos.temaId,
    })
    await tx.publicacion.create({
      data: {
        id,
        claseId,
        autorId: autor.id,
        tipo: "tarea",
        titulo: datos.titulo,
        texto: datos.instrucciones,
        temaId: datos.temaId,
      },
      select: { id: true },
    })
    await tx.tarea.create({
      data: {
        id,
        claseId,
        categoriaId: datos.categoriaId,
        fechaLimite: datos.fechaLimite,
        puntos: datos.puntos,
        aceptaTardias: datos.aceptaTardias,
        requiereAdjuntos: datos.requiereAdjuntos,
        trabajoId,
      },
      select: { id: true },
    })
    if (datos.rubrica.length > 0) {
      await tx.criterioRubrica.createMany({
        data: datos.rubrica.map((criterio, orden) => ({
          tareaId: id,
          criterio: criterio.criterio,
          puntosMax: criterio.puntosMax,
          orden,
        })),
      })
    }
    await confirmarArchivos(tx, { archivos, claseId, subidoPor: autor.id, publicacionId: id })
    await alGuardar(ejecutorSqlDe(tx))
    const creada = await leerTarea({ claseId, tareaId: id, actor: autor }, tx)
    if (creada === null) throw errorTareaNoEncontrada()
    return creada
  })

interface FilaBloqueada {
  id: string
  fecha_limite: Date
  trabajo_id: string | null
  autor_id: string
}

interface FilaBloqueadaConVersion extends FilaBloqueada {
  version: number
}

// El autor (id y rol) y si sigue siendo maestro de la clase (lectura por la PK de maestros_de_clase),
// para la regla de autoría de las tareas (P-04 b).
const autorYPertenencia = async (
  tx: Prisma.TransactionClient,
  { claseId, autorId }: { claseId: string; autorId: string },
): Promise<{ autor: ParticipanteDeAutoria; sigueEnLaClase: boolean }> => {
  const autor = await tx.usuario.findUnique({
    where: { id: autorId },
    select: { id: true, rol: true },
  })
  if (autor === null) throw errorTareaNoEncontrada()
  const asignacion = await tx.maestroDeClase.findUnique({
    where: { claseId_maestroId: { claseId, maestroId: autorId } },
    select: { maestroId: true },
  })
  return { autor, sigueEnLaClase: asignacion !== null }
}

// Editar (§D-4): el cuerpo es la tarea completa; `archivoIds` es la lista final de adjuntos (los que
// ya tenía y siguen, más los nuevos, que el handler ya comprobó en `archivosNuevos`). En una
// transacción: bloquea la fila de la tarea (FOR NO KEY UPDATE OF t: dos ediciones quedan en serie y
// cada una cancela el trabajo que dejó la anterior), autoría (403 sin escribir), versión (409
// TAREA_MODIFICADA sin escribir, ENTREGAS-01a §D-2.1: con la fila ya bloqueada, dos guardados con la
// misma versión nunca dan dos 200), fecha, categoría y tema, plan del recordatorio, publicación y
// tarea (la versión sube en 1), criterios (se reemplazan), archivos y alReprogramar. null: la tarea no
// existe en esa clase (o la borraron antes).
export const editarTarea = (
  {
    claseId,
    tareaId,
    actor,
    ahora,
    version,
    idRecordatorioNuevo,
    archivoIds,
    archivosNuevos,
    ...datos
  }: DatosDeTarea & {
    claseId: string
    tareaId: string
    actor: ParticipanteDeAutoria
    ahora: Date
    // La versión con que se abrió el formulario (P-05 a′).
    version: number
    // Id con que se encola el recordatorio nuevo (pg-boss ignora un id que ya usó).
    idRecordatorioNuevo: string
    archivoIds: readonly string[]
    archivosNuevos: readonly ArchivoDb[]
  },
  alReprogramar: (sql: EjecutorSql, plan: PlanDeRecordatorio) => Promise<void>,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<TareaDetalleDb | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const [fila] = await tx.$queryRaw<FilaBloqueadaConVersion[]>`
      SELECT t.id, t.fecha_limite, t.trabajo_id, t.version, p.autor_id
      FROM tareas t
      JOIN publicaciones p ON p.id = t.id
      WHERE t.id = ${tareaId}::uuid AND t.clase_id = ${claseId}::uuid
      FOR NO KEY UPDATE OF t`
    if (fila === undefined) return null

    const { autor, sigueEnLaClase } = await autorYPertenencia(tx, {
      claseId,
      autorId: fila.autor_id,
    })
    if (!puedeEditarTarea(actor, autor, sigueEnLaClase)) throw errorEdicionNoPermitida()
    exigirVersion({ leida: version, actual: fila.version }, tareaModificada)
    validarFechaLimite({ nueva: datos.fechaLimite, anterior: fila.fecha_limite, ahora })
    await asegurarReferencias(tx, {
      claseId,
      categoriaId: datos.categoriaId,
      temaId: datos.temaId,
    })

    const plan = planDeRecordatorio({
      fechaAnterior: fila.fecha_limite,
      fechaNueva: datos.fechaLimite,
      trabajoActual: fila.trabajo_id,
      ahora,
    })
    // El nuevo id si se programa, null si solo se cancela, el mismo si nada cambia.
    const trabajoId = plan.programarEn
      ? idRecordatorioNuevo
      : plan.cancelar !== null
        ? null
        : fila.trabajo_id

    await tx.publicacion.updateMany({
      where: { id: tareaId, claseId, tipo: "tarea" },
      data: { titulo: datos.titulo, texto: datos.instrucciones, temaId: datos.temaId },
    })
    await tx.tarea.updateMany({
      where: { id: tareaId, claseId },
      data: {
        fechaLimite: datos.fechaLimite,
        puntos: datos.puntos,
        aceptaTardias: datos.aceptaTardias,
        requiereAdjuntos: datos.requiereAdjuntos,
        categoriaId: datos.categoriaId,
        trabajoId,
        version: { increment: 1 },
      },
    })

    // S-04: editar la rúbrica reemplaza todos sus criterios.
    await tx.criterioRubrica.deleteMany({ where: { tareaId } })
    if (datos.rubrica.length > 0) {
      await tx.criterioRubrica.createMany({
        data: datos.rubrica.map((criterio, orden) => ({
          tareaId,
          criterio: criterio.criterio,
          puntosMax: criterio.puntosMax,
          orden,
        })),
      })
    }

    // Archivos: los conservados deben seguir confirmados en esta publicación; los nuevos se confirman
    // con el UPDATE condicionado y conteo; los que salen pasan a descartado sin publicación.
    const actuales = await tx.archivo.findMany({
      where: { publicacionId: tareaId, claseId, estado: "confirmado" },
      select: { id: true },
    })
    const idsActuales = new Set(actuales.map((archivo) => archivo.id))
    const idsNuevos = new Set(archivosNuevos.map((archivo) => archivo.id))
    for (const id of archivoIds) {
      if (!idsActuales.has(id) && !idsNuevos.has(id)) throw errorArchivoInvalido()
    }
    const finales = new Set(archivoIds)
    const salen = actuales
      .filter((archivo) => !finales.has(archivo.id))
      .map((archivo) => archivo.id)
    if (salen.length > 0) {
      await tx.archivo.updateMany({
        where: { id: { in: salen }, publicacionId: tareaId, claseId },
        data: { estado: "descartado", publicacionId: null },
      })
    }
    await confirmarArchivos(tx, {
      archivos: archivosNuevos.filter((archivo) => finales.has(archivo.id)),
      claseId,
      subidoPor: actor.id,
      publicacionId: tareaId,
    })

    await alReprogramar(ejecutorSqlDe(tx), plan)
    return leerTarea({ claseId, tareaId, actor }, tx)
  })

// Borrar (§D-4): bloquea la tarea (FOR UPDATE OF t: choca con la edición), autoría (403 sin escribir),
// pasa sus archivos a descartado y borra la publicación (la cascada se lleva la tarea y sus
// criterios), y alBorrar cancela los trabajos con el id que tenía en trabajo_id. false: no existe.
export const borrarTarea = (
  { claseId, tareaId, actor }: { claseId: string; tareaId: string; actor: ParticipanteDeAutoria },
  alBorrar: (sql: EjecutorSql, trabajoId: string | null) => Promise<void>,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<boolean> =>
  enTransaccion(ejecutor, async (tx) => {
    const [fila] = await tx.$queryRaw<FilaBloqueada[]>`
      SELECT t.id, t.fecha_limite, t.trabajo_id, p.autor_id
      FROM tareas t
      JOIN publicaciones p ON p.id = t.id
      WHERE t.id = ${tareaId}::uuid AND t.clase_id = ${claseId}::uuid
      FOR UPDATE OF t`
    if (fila === undefined) return false

    const { autor, sigueEnLaClase } = await autorYPertenencia(tx, {
      claseId,
      autorId: fila.autor_id,
    })
    if (!puedeBorrarTarea(actor, autor, sigueEnLaClase)) throw errorBorradoNoPermitido()

    await tx.archivo.updateMany({
      where: { publicacionId: tareaId, claseId },
      data: { estado: "descartado", publicacionId: null },
    })
    const { count } = await tx.publicacion.deleteMany({
      where: { id: tareaId, claseId, tipo: "tarea" },
    })
    if (count === 0) return false
    await alBorrar(ejecutorSqlDe(tx), fila.trabajo_id)
    return true
  })

// "Trabajo de clase" (§D-6): los materiales y las tareas de un tema (o de "Sin tema") del más
// reciente al más antiguo, con cursor. Las sentencias van una tras otra con `db`: el tema (si es un
// uuid), la comprobación del cursor contra esta misma lista (misma clase, mismo tema o null, tipo
// material o tarea), la página (con autor y la relación `tarea`) y los adjuntos de los materiales de
// la página (una sola consulta). No escribe nada.
const listarTrabajoCon = async (
  db: Ejecutor,
  {
    claseId,
    tema,
    cursor,
    limite,
  }: { claseId: string; tema: string; cursor: string | undefined; limite: number },
): Promise<ListaTrabajoDb> => {
  const temaId = tema === "sin-tema" ? null : tema
  if (temaId !== null) {
    const existe = await db.tema.findFirst({ where: { id: temaId, claseId }, select: { id: true } })
    if (existe === null) throw errorTemaNoEncontrado()
  }
  const donde = { claseId, temaId, tipo: { in: [...TIPOS_DE_TRABAJO] } }
  if (cursor !== undefined) {
    const delCursor = await db.publicacion.findFirst({
      where: { ...donde, id: cursor },
      select: { id: true },
    })
    if (delCursor === null) throw errorCursorInvalido()
  }
  const filas = await db.publicacion.findMany({
    where: donde,
    select: {
      id: true,
      tipo: true,
      titulo: true,
      texto: true,
      creadoEn: true,
      autor: SELECT_AUTOR,
      tarea: { select: { fechaLimite: true, puntos: true } },
    },
    orderBy: [{ creadoEn: "desc" }, { id: "desc" }],
    take: limite + 1,
    ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
  })
  const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.id)

  const idsDeMateriales = pagina.filter((fila) => fila.tipo === "material").map((fila) => fila.id)
  const adjuntosPorMaterial = new Map<string, ArchivoDb[]>()
  if (idsDeMateriales.length > 0) {
    const archivos = await db.archivo.findMany({
      where: { publicacionId: { in: idsDeMateriales }, claseId, estado: "confirmado" },
      select: { ...SELECT_ARCHIVO, publicacionId: true },
      orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
    })
    for (const { publicacionId, ...archivo } of archivos) {
      if (publicacionId === null) continue
      adjuntosPorMaterial.set(publicacionId, [
        ...(adjuntosPorMaterial.get(publicacionId) ?? []),
        archivo,
      ])
    }
  }
  return {
    elementos: pagina.map((fila) => {
      const esMaterial = fila.tipo === "material"
      return {
        id: fila.id,
        tipo: esMaterial ? "material" : "tarea",
        titulo: fila.titulo ?? "",
        autor: fila.autor,
        creadoEn: fila.creadoEn,
        material: esMaterial
          ? { texto: fila.texto, adjuntos: adjuntosPorMaterial.get(fila.id) ?? [] }
          : null,
        tarea: fila.tarea,
      }
    }),
    siguienteCursor,
  }
}

// Enmienda 2 (§D-12): la comprobación del cursor, la página y sus adjuntos comparten instantánea: si
// el elemento del cursor se borra o se mueve de tema en medio, la página sigue viéndolo (regla T-18),
// y la relación `tarea` de un elemento de tipo tarea nunca sale null.
export const listarTrabajo = (
  params: { claseId: string; tema: string; cursor: string | undefined; limite: number },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaTrabajoDb> =>
  enTransaccion(ejecutor, (tx) => listarTrabajoCon(tx, params), { instantaneaUnica: true })
