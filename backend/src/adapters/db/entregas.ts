import { prefijoDeEntrega } from "../../core/archivos/politica.js"
import {
  accionesDeEntrega,
  alumnoNoEncontrado,
  decidirAnulacion,
  decidirEntrega,
  entregaNoRealizada,
  type EstadoEntrega,
  type TareaParaEntregar,
} from "../../core/entregas/entregas.js"
import { AppError } from "../../core/errores.js"
import { paginar } from "../../core/paginacion.js"
import { SELECT_ARCHIVO, VIGENCIA_PENDIENTE_MS, type ArchivoDb } from "./archivos.js"
import {
  ejecutorSqlDe,
  enTransaccion,
  obtenerDb,
  type Ejecutor,
  type EjecutorSql,
} from "./cliente.js"
import type { Prisma } from "./generated/client.js"
import { condicionesDePaginaDeAlumnos } from "./inscripciones.js"

// ENTREGAS-01b (§D-3). La entrega de un alumno en una tarea: una fila de `entregas` por alumno y
// tarea, creada al primer uso (entregar; en 01c, también comentar), nunca al publicar la tarea. Las
// lecturas no la crean: sin fila, la entrega está "asignado" con listas vacías. Toda consulta filtra
// por la clase de la ruta: la tarea por (id, clase_id), la entrega por (tarea_id, alumno_id) de esa
// tarea y un archivo por (id, clase_id) más la entrega de esa tarea y ese alumno; un id de otra clase
// o de otra tarea es "no encontrado", sin escribir ni revelar nada. Ninguna función selecciona el
// correo, el estado de pago ni la restricción de acceso (RN-02). Los trabajos de la cola no se
// importan aquí: el handler pasa `alGuardar`, que recibe el ejecutor SQL de la transacción.
// Orden de bloqueo (§D-0.6): primero la fila de `tareas`, después `entregas` y `archivos`.

export interface MiEntregaDb {
  // Con lo que decide core/ (la subida de un archivo de entrega la usa, S-10); nunca se responde.
  tarea: TareaParaEntregar
  estado: EstadoEntrega
  fechaEntrega: Date | null
  conRetraso: boolean
  enlaces: string[]
  adjuntos: ArchivoDb[]
  puedeEntregar: boolean
  puedeAnular: boolean
}

export interface AlumnoDeEntregaDb {
  id: string
  nombre: string
}

export interface FilaDeEntregaDb {
  alumno: AlumnoDeEntregaDb
  estado: EstadoEntrega
  fechaEntrega: Date | null
  conRetraso: boolean
}

export interface ListaEntregasDb {
  entregas: FilaDeEntregaDb[]
  total: number
  entregadas: number
  siguienteCursor: string | null
}

export interface EntregaDeAlumnoDb {
  alumno: AlumnoDeEntregaDb
  estado: EstadoEntrega
  fechaEntrega: Date | null
  conRetraso: boolean
  enlaces: string[]
  adjuntos: ArchivoDb[]
  version: number
}

const errorTareaNoEncontrada = (): AppError =>
  new AppError("TAREA_NO_ENCONTRADA", "Esa tarea ya no existe.", 404)

const errorArchivoInvalido = (): AppError =>
  new AppError(
    "ARCHIVO_INVALIDO",
    "Uno de los archivos no coincide con lo que elegiste. Vuelve a adjuntarlo.",
    400,
  )

// Inalcanzables con los CHECK de la migración (enlaces es una lista) y el enum de la base; si
// pasaran, es un error explícito y no un dato inventado.
const errorEntregaMalFormada = (): AppError =>
  new AppError("ERROR_INTERNO", "La entrega guardada no tiene una forma válida.", 500)

const ESTADOS_DE_ENTREGA: readonly EstadoEntrega[] = ["asignado", "entregado", "calificado"]

// Las que cuentan como entregas (S-06 y RF-35): entregado y calificado.
const ESTADOS_ENTREGADOS: EstadoEntrega[] = ["entregado", "calificado"]

const estadoDe = (texto: string): EstadoEntrega => {
  const estado = ESTADOS_DE_ENTREGA.find((posible) => posible === texto)
  if (estado === undefined) throw errorEntregaMalFormada()
  return estado
}

const enlacesDe = (valor: Prisma.JsonValue): string[] => {
  if (!Array.isArray(valor)) throw errorEntregaMalFormada()
  return valor.map((enlace) => {
    if (typeof enlace !== "string") throw errorEntregaMalFormada()
    return enlace
  })
}

const SELECT_ENTREGA = {
  id: true,
  estado: true,
  fechaEntrega: true,
  conRetraso: true,
  enlaces: true,
  version: true,
} as const

const SELECT_TAREA_PARA_ENTREGAR = {
  fechaLimite: true,
  aceptaTardias: true,
  requiereAdjuntos: true,
} as const

// Los archivos confirmados de una entrega, en el orden en que se subieron (hasta 5).
const adjuntosDeEntrega = (
  db: Ejecutor,
  { entregaId, claseId }: { entregaId: string; claseId: string },
): Promise<ArchivoDb[]> =>
  db.archivo.findMany({
    where: { entregaId, claseId, estado: "confirmado" },
    select: SELECT_ARCHIVO,
    orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
  })

// Un alumno inscrito con cuenta activa en la clase (por la PK de inscripciones). Es un filtro de datos
// de las rutas de los maestros (§D-0.1), no una verificación de permisos: sin fila, ALUMNO_NO_ENCONTRADO,
// igual para uno inexistente, de otra clase, dado de baja, desactivado o que no es estudiante.
const alumnoInscrito = async (
  db: Ejecutor,
  { claseId, alumnoId }: { claseId: string; alumnoId: string },
): Promise<AlumnoDeEntregaDb> => {
  const inscripcion = await db.inscripcion.findFirst({
    where: { claseId, usuarioId: alumnoId, usuario: { activo: true, rol: "estudiante" } },
    select: { usuario: { select: { nombre: true } } },
  })
  if (inscripcion === null) throw alumnoNoEncontrado()
  return { id: alumnoId, nombre: inscripcion.usuario.nombre }
}

const existeLaTarea = async (
  db: Ejecutor,
  { claseId, tareaId }: { claseId: string; tareaId: string },
): Promise<boolean> =>
  (await db.tarea.findFirst({ where: { id: tareaId, claseId }, select: { id: true } })) !== null

// §D-3.3. Sentencias una tras otra: la tarea (con lo que decide el cierre), la entrega y sus archivos.
// null: la tarea no existe en esa clase. No escribe nada.
const leerMiEntregaCon = async (
  db: Ejecutor,
  {
    claseId,
    tareaId,
    alumnoId,
    ahora,
  }: { claseId: string; tareaId: string; alumnoId: string; ahora: Date },
): Promise<MiEntregaDb | null> => {
  const tarea = await db.tarea.findFirst({
    where: { id: tareaId, claseId },
    select: SELECT_TAREA_PARA_ENTREGAR,
  })
  if (tarea === null) return null
  const entrega = await db.entrega.findUnique({
    where: { tareaId_alumnoId: { tareaId, alumnoId } },
    select: SELECT_ENTREGA,
  })
  if (entrega === null) {
    return {
      tarea,
      estado: "asignado",
      fechaEntrega: null,
      conRetraso: false,
      enlaces: [],
      adjuntos: [],
      ...accionesDeEntrega({ tarea, estado: "asignado", ahora }),
    }
  }
  const adjuntos = await adjuntosDeEntrega(db, { entregaId: entrega.id, claseId })
  return {
    tarea,
    estado: entrega.estado,
    fechaEntrega: entrega.fechaEntrega,
    conRetraso: entrega.conRetraso,
    enlaces: enlacesDe(entrega.enlaces),
    adjuntos,
    ...accionesDeEntrega({ tarea, estado: entrega.estado, ahora }),
  }
}

// La entrega, sus archivos y la tarea con que se decide se leen en una sola instantánea (§D-0.7).
// Anidada en la transacción de entregar o anular, la opción se ignora y lee lo que esa transacción ya
// escribió.
export const leerMiEntrega = (
  params: { claseId: string; tareaId: string; alumnoId: string; ahora: Date },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<MiEntregaDb | null> =>
  enTransaccion(ejecutor, (tx) => leerMiEntregaCon(tx, params), { instantaneaUnica: true })

interface FilaTareaParaEntregar {
  fecha_limite: Date
  acepta_tardias: boolean
  requiere_adjuntos: boolean
}

// Excepción a la regla de que solo db/referencias.ts toma el bloqueo de llave compartida (C-9 de la
// Enmienda 3): este es el único de este archivo, sobre la fila de la tarea, y devuelve con lo que
// decide core/ (TareaParaEntregar), por eso vive en el repositorio de entregas. Choca con el FOR
// UPDATE de borrarTarea (quedan en serie: si el borrado confirma antes, aquí ya no hay fila y la
// entrega responde 404) y no con el FOR NO KEY UPDATE de editarTarea (la entrega decide con la tarea
// confirmada que ve). null: la tarea no existe en esa clase.
const bloquearTareaParaEntregar = async (
  tx: Prisma.TransactionClient,
  { tareaId, claseId }: { tareaId: string; claseId: string },
): Promise<TareaParaEntregar | null> => {
  const [fila] = await tx.$queryRaw<FilaTareaParaEntregar[]>`
    SELECT fecha_limite, acepta_tardias, requiere_adjuntos
    FROM tareas
    WHERE id = ${tareaId}::uuid AND clase_id = ${claseId}::uuid
    FOR KEY SHARE`
  if (fila === undefined) return null
  return {
    fechaLimite: fila.fecha_limite,
    aceptaTardias: fila.acepta_tardias,
    requiereAdjuntos: fila.requiere_adjuntos,
  }
}

// La fila perezosa (S-01, §D-0.3): nace en la transacción de la primera escritura, con el id y las
// fechas por defecto de la tabla. Con la fila ya creada no hace nada (y no lanza P2002).
const asegurarFilaDeEntrega = async (
  tx: Prisma.TransactionClient,
  { tareaId, alumnoId }: { tareaId: string; alumnoId: string },
): Promise<void> => {
  await tx.$executeRaw`
    INSERT INTO entregas (tarea_id, alumno_id)
    VALUES (${tareaId}::uuid, ${alumnoId}::uuid)
    ON CONFLICT (tarea_id, alumno_id) DO NOTHING`
}

interface FilaDeEntregaBloqueada {
  id: string
  estado: string
  version: number
}

// La fila de la entrega bloqueada (FOR NO KEY UPDATE): dos entregas, o una entrega y una anulación,
// del mismo alumno quedan en serie aquí y la segunda decide con lo que dejó la primera.
const bloquearEntrega = async (
  tx: Prisma.TransactionClient,
  { tareaId, alumnoId }: { tareaId: string; alumnoId: string },
): Promise<{ id: string; estado: EstadoEntrega; version: number } | null> => {
  const [fila] = await tx.$queryRaw<FilaDeEntregaBloqueada[]>`
    SELECT id::text AS id, estado::text AS estado, version
    FROM entregas
    WHERE tarea_id = ${tareaId}::uuid AND alumno_id = ${alumnoId}::uuid
    FOR NO KEY UPDATE`
  if (fila === undefined) return null
  return { id: fila.id, estado: estadoDe(fila.estado), version: fila.version }
}

// Confirma los archivos pendientes del alumno en su entrega. El UPDATE repite las condiciones de la
// lectura del handler (de la clase, del alumno, pendientes, sin contexto, de las últimas 24 h y con el
// prefijo de esta entrega) por si algo cambió; si no confirma todos, 400 y todo se revierte.
const confirmarArchivosDeEntrega = async (
  tx: Prisma.TransactionClient,
  {
    archivos,
    claseId,
    alumnoId,
    entregaId,
    prefijo,
  }: {
    archivos: readonly ArchivoDb[]
    claseId: string
    alumnoId: string
    entregaId: string
    prefijo: string
  },
): Promise<void> => {
  if (archivos.length === 0) return
  const { count } = await tx.archivo.updateMany({
    where: {
      id: { in: archivos.map((archivo) => archivo.id) },
      claseId,
      subidoPor: alumnoId,
      estado: "pendiente",
      publicacionId: null,
      entregaId: null,
      claveObjeto: { startsWith: prefijo },
      creadoEn: { gt: new Date(Date.now() - VIGENCIA_PENDIENTE_MS) },
    },
    data: { estado: "confirmado", entregaId },
  })
  if (count !== archivos.length) throw errorArchivoInvalido()
}

// Entregar (§D-3.5), en una transacción y en este orden: la tarea bloqueada (null si no existe en la
// clase), la fila perezosa, la fila de la entrega bloqueada, la decisión de core/ (si lanza, se
// revierte todo, también la fila recién creada), los archivos, la entrega (entregado, con la fecha,
// el retraso, los enlaces y la versión siguiente) y alGuardar (el handler encola ENTREGA_REALIZADA con
// el ejecutor SQL de esta misma transacción). Responde con la entrega leída en la misma transacción.
export const entregar = (
  {
    claseId,
    tareaId,
    alumnoId,
    ahora,
    archivos,
    enlaces,
  }: {
    claseId: string
    tareaId: string
    alumnoId: string
    ahora: Date
    // Ya leídos y comprobados en el almacén por el handler, con el prefijo de esta entrega.
    archivos: readonly ArchivoDb[]
    enlaces: readonly string[]
  },
  alGuardar: (sql: EjecutorSql, entrega: { entregaId: string; version: number }) => Promise<void>,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<MiEntregaDb | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const tarea = await bloquearTareaParaEntregar(tx, { tareaId, claseId })
    if (tarea === null) return null
    await asegurarFilaDeEntrega(tx, { tareaId, alumnoId })
    const fila = await bloquearEntrega(tx, { tareaId, alumnoId })
    if (fila === null) throw errorEntregaMalFormada()

    const { conRetraso } = decidirEntrega({
      tarea,
      estado: fila.estado,
      archivos: archivos.length,
      enlaces: enlaces.length,
      ahora,
    })
    await confirmarArchivosDeEntrega(tx, {
      archivos,
      claseId,
      alumnoId,
      entregaId: fila.id,
      prefijo: prefijoDeEntrega(tareaId, alumnoId),
    })
    const { version } = await tx.entrega.update({
      where: { id: fila.id },
      data: {
        estado: "entregado",
        fechaEntrega: ahora,
        conRetraso,
        enlaces: [...enlaces],
        version: { increment: 1 },
      },
      select: { version: true },
    })
    await alGuardar(ejecutorSqlDe(tx), { entregaId: fila.id, version })
    return leerMiEntrega({ claseId, tareaId, alumnoId, ahora }, tx)
  })

// Anular (§D-3.7): la tarea bloqueada (null si no existe), la fila de la entrega bloqueada (sin fila,
// como asignado: 409 ENTREGA_NO_REALIZADA), la decisión de core/, los archivos de la entrega a
// descartado sin contexto (S-02: la limpieza borra el objeto) y la entrega de vuelta a asignado, sin
// fecha, retraso ni enlaces, con la versión siguiente. No encola ni cancela nada (S-09): el
// consumidor de ENTREGA_REALIZADA descarta un evento cuya versión ya no es la de la entrega.
export const anularEntrega = (
  {
    claseId,
    tareaId,
    alumnoId,
    ahora,
  }: { claseId: string; tareaId: string; alumnoId: string; ahora: Date },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<MiEntregaDb | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const tarea = await bloquearTareaParaEntregar(tx, { tareaId, claseId })
    if (tarea === null) return null
    const fila = await bloquearEntrega(tx, { tareaId, alumnoId })
    decidirAnulacion({ tarea, estado: fila === null ? "asignado" : fila.estado, ahora })
    if (fila === null) throw entregaNoRealizada()

    await tx.archivo.updateMany({
      where: { entregaId: fila.id, claseId },
      data: { estado: "descartado", entregaId: null },
    })
    await tx.entrega.update({
      where: { id: fila.id },
      data: {
        estado: "asignado",
        fechaEntrega: null,
        conRetraso: false,
        enlaces: [],
        version: { increment: 1 },
      },
      select: { id: true },
    })
    return leerMiEntrega({ claseId, tareaId, alumnoId, ahora }, tx)
  })

// Descarga del alumno (§D-3.6): un archivo confirmado de su propia entrega en esa tarea de esa clase.
// La tarea de otra clase es 404 TAREA_NO_ENCONTRADA; null (404 ARCHIVO_NO_ENCONTRADO) es igual para
// uno inexistente, de otro alumno, de material, pendiente, descartado o de otra tarea.
export const buscarArchivoDeMiEntrega = async (
  {
    claseId,
    tareaId,
    alumnoId,
    archivoId,
  }: { claseId: string; tareaId: string; alumnoId: string; archivoId: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ArchivoDb | null> => {
  if (!(await existeLaTarea(ejecutor, { claseId, tareaId }))) throw errorTareaNoEncontrada()
  return ejecutor.archivo.findFirst({
    where: { id: archivoId, claseId, estado: "confirmado", entrega: { tareaId, alumnoId } },
    select: SELECT_ARCHIVO,
  })
}

// Descarga de un maestro de la clase o del admin (§D-3.6): igual que la del alumno, para el alumno de
// la ruta, después de comprobar que está inscrito con cuenta activa (404 ALUMNO_NO_ENCONTRADO).
export const buscarArchivoDeEntregaDeAlumno = async (
  {
    claseId,
    tareaId,
    alumnoId,
    archivoId,
  }: { claseId: string; tareaId: string; alumnoId: string; archivoId: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ArchivoDb | null> => {
  if (!(await existeLaTarea(ejecutor, { claseId, tareaId }))) throw errorTareaNoEncontrada()
  await alumnoInscrito(ejecutor, { claseId, alumnoId })
  return ejecutor.archivo.findFirst({
    where: { id: archivoId, claseId, estado: "confirmado", entrega: { tareaId, alumnoId } },
    select: SELECT_ARCHIVO,
  })
}

// §D-3.9. Sentencias una tras otra: la tarea, la página de alumnos con las mismas condiciones y el
// mismo cursor que el roster (inscritos con cuenta activa, por nombre_busqueda y usuario_id; el cursor
// es un usuarioId que basta con que exista, N-04), las entregas de esa página (una sola consulta por
// el único (tarea_id, alumno_id)) y los dos conteos. null: la tarea no existe en esa clase.
const listarEntregasCon = async (
  db: Ejecutor,
  {
    claseId,
    tareaId,
    cursor,
    limite,
  }: { claseId: string; tareaId: string; cursor: string | undefined; limite: number },
): Promise<ListaEntregasDb | null> => {
  if (!(await existeLaTarea(db, { claseId, tareaId }))) return null
  const { where, orderBy, take } = await condicionesDePaginaDeAlumnos(
    { claseId, cursor, limite },
    db,
  )
  const filas = await db.inscripcion.findMany({
    where,
    orderBy,
    take,
    select: { usuarioId: true, usuario: { select: { nombre: true } } },
  })
  const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.usuarioId)
  const ids = pagina.map((fila) => fila.usuarioId)
  const entregas =
    ids.length === 0
      ? []
      : await db.entrega.findMany({
          where: { tareaId, alumnoId: { in: ids } },
          select: { alumnoId: true, estado: true, fechaEntrega: true, conRetraso: true },
        })
  const total = await db.inscripcion.count({ where: { claseId, usuario: { activo: true } } })
  const entregadas = await db.entrega.count({
    where: {
      tareaId,
      estado: { in: ESTADOS_ENTREGADOS },
      alumno: { activo: true, inscripciones: { some: { claseId } } },
    },
  })
  const porAlumno = new Map(entregas.map((entrega) => [entrega.alumnoId, entrega]))
  return {
    entregas: pagina.map((fila) => {
      const alumno = { id: fila.usuarioId, nombre: fila.usuario.nombre }
      const entrega = porAlumno.get(fila.usuarioId)
      if (entrega === undefined) {
        return { alumno, estado: "asignado", fechaEntrega: null, conRetraso: false }
      }
      return {
        alumno,
        estado: entrega.estado,
        fechaEntrega: entrega.fechaEntrega,
        conRetraso: entrega.conRetraso,
      }
    }),
    total,
    entregadas,
    siguienteCursor,
  }
}

// El cursor se comprueba antes de la página y los conteos salen de la misma instantánea que la
// página: una entrega o una inscripción que llega en medio no deja una respuesta incoherente.
export const listarEntregas = (
  params: { claseId: string; tareaId: string; cursor: string | undefined; limite: number },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaEntregasDb | null> =>
  enTransaccion(ejecutor, (tx) => listarEntregasCon(tx, params), { instantaneaUnica: true })

// §D-3.10. La tarea (null si no existe), la inscripción del alumno (ALUMNO_NO_ENCONTRADO), la entrega y
// sus archivos. Sin fila: asignado, con version 0.
const leerEntregaDeAlumnoCon = async (
  db: Ejecutor,
  { claseId, tareaId, alumnoId }: { claseId: string; tareaId: string; alumnoId: string },
): Promise<EntregaDeAlumnoDb | null> => {
  if (!(await existeLaTarea(db, { claseId, tareaId }))) return null
  const alumno = await alumnoInscrito(db, { claseId, alumnoId })
  const entrega = await db.entrega.findUnique({
    where: { tareaId_alumnoId: { tareaId, alumnoId } },
    select: SELECT_ENTREGA,
  })
  if (entrega === null) {
    return {
      alumno,
      estado: "asignado",
      fechaEntrega: null,
      conRetraso: false,
      enlaces: [],
      adjuntos: [],
      version: 0,
    }
  }
  return {
    alumno,
    estado: entrega.estado,
    fechaEntrega: entrega.fechaEntrega,
    conRetraso: entrega.conRetraso,
    enlaces: enlacesDe(entrega.enlaces),
    adjuntos: await adjuntosDeEntrega(db, { entregaId: entrega.id, claseId }),
    version: entrega.version,
  }
}

export const leerEntregaDeAlumno = (
  params: { claseId: string; tareaId: string; alumnoId: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<EntregaDeAlumnoDb | null> =>
  enTransaccion(ejecutor, (tx) => leerEntregaDeAlumnoCon(tx, params), { instantaneaUnica: true })
