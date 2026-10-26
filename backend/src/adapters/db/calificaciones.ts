import {
  calificacionGeneral,
  promedioDeLaClase,
  type AgregadoPorCategoria,
  type CalificacionGeneral,
  type CategoriaDeLaClase,
} from "../../core/calificaciones/general.js"
import { motivosDeRiesgo, type MotivoDeRiesgo } from "../../core/calificaciones/riesgo.js"
import type { EstadoEntrega } from "../../core/entregas/entregas.js"
import { AppError } from "../../core/errores.js"
import { paginar } from "../../core/paginacion.js"
import { enTransaccion, obtenerDb, type Ejecutor } from "./cliente.js"
import type { Prisma } from "./generated/client.js"
import { condicionesDePaginaDeAlumnos } from "./inscripciones.js"

// CALIFICACIONES-01b (§D-6, §D-7). El gradebook de una clase (maestros de la clase y admin) y "Mis
// calificaciones" del alumno. Solo lecturas: ninguna función escribe ni bloquea filas. Cada una corre
// en una sola instantánea, con las sentencias una tras otra: los cursores se comprueban antes de la
// página y los agregados salen de lo mismo que las celdas. Los promedios, las vencidas y el riesgo se
// calculan en cada lectura con las reglas de core/ (nada se guarda). Ninguna consulta selecciona el
// correo, el estado de pago, la restricción, el rol ni la versión de la entrega (RN-02); todas filtran
// por la clase de la ruta y, en "Mis calificaciones", por el alumno de la sesión.

export interface CategoriaDeLaTareaDb {
  id: string
  nombre: string
}

export interface ColumnaDelGradebookDb {
  id: string
  titulo: string
  fechaLimite: Date
  puntos: number
  categoria: CategoriaDeLaTareaDb | null
}

export interface EntregaResumidaDb {
  estado: EstadoEntrega
  conRetraso: boolean
  calificacion: number | null
}

export interface CeldaDelGradebookDb extends EntregaResumidaDb {
  tareaId: string
}

export interface FilaDelGradebookDb {
  alumno: { id: string; nombre: string }
  celdas: CeldaDelGradebookDb[]
  porcentaje: number | null
  vencidasSinEntregar: number
  motivosDeRiesgo: MotivoDeRiesgo[]
}

export interface GradebookDb {
  tareas: ColumnaDelGradebookDb[]
  siguienteCursorTareas: string | null
  alumnos: FilaDelGradebookDb[]
  siguienteCursor: string | null
  resumen: {
    modo: CalificacionGeneral["modo"]
    totalAlumnos: number
    promedioDeLaClase: number | null
    alumnosEnRiesgo: number
  }
}

export type FiltroDeMisCalificacionesDb =
  "todas" | "asignadas" | "entregadas" | "calificadas" | "sin-entregar"

export interface TareaDeMisCalificacionesDb extends ColumnaDelGradebookDb {
  entrega: EntregaResumidaDb
}

export interface MisCalificacionesDb {
  general: CalificacionGeneral
  tareas: TareaDeMisCalificacionesDb[]
  siguienteCursor: string | null
}

const errorCursorDeTareaInvalido = (campo: string): AppError =>
  new AppError("VALIDACION", `${campo}: no es válido`, 400)

// Inalcanzables con los CHECK de la migración (una calificada lleva calificación y solo ella) y el
// de publicaciones_titulo_segun_tipo (una tarea lleva título): error explícito, nunca un dato inventado.
const errorDatoMalFormado = (): AppError =>
  new AppError("ERROR_INTERNO", "Una calificación guardada no tiene una forma válida.", 500)

const SIN_ENTREGA: EntregaResumidaDb = { estado: "asignado", conRetraso: false, calificacion: null }

// Un alumno sin tareas calificadas no tiene agregados: su calificación general es null.
const SIN_AGREGADOS: readonly AgregadoPorCategoria[] = []

const ORDEN_DE_TAREAS: Prisma.TareaOrderByWithRelationInput[] = [
  { fechaLimite: "desc" },
  { id: "desc" },
]

const SELECT_TAREA = {
  id: true,
  fechaLimite: true,
  puntos: true,
  categoria: { select: { id: true, nombre: true } },
  publicacion: { select: { titulo: true } },
} as const

const columnaDe = (fila: {
  id: string
  fechaLimite: Date
  puntos: number
  categoria: CategoriaDeLaTareaDb | null
  publicacion: { titulo: string | null }
}): ColumnaDelGradebookDb => {
  if (fila.publicacion.titulo === null) throw errorDatoMalFormado()
  return {
    id: fila.id,
    titulo: fila.publicacion.titulo,
    fechaLimite: fila.fechaLimite,
    puntos: fila.puntos,
    categoria: fila.categoria,
  }
}

const entregaResumidaDe = (entrega: {
  estado: EstadoEntrega
  conRetraso: boolean
  calificacion: Prisma.Decimal | null
}): EntregaResumidaDb => {
  if ((entrega.estado === "calificado") !== (entrega.calificacion !== null)) {
    throw errorDatoMalFormado()
  }
  return {
    estado: entrega.estado,
    conRetraso: entrega.conRetraso,
    calificacion: entrega.calificacion === null ? null : entrega.calificacion.toNumber(),
  }
}

// La página de tareas va por conjunto de claves (fecha_limite DESC, id DESC) sobre el índice
// (clase_id, fecha_limite), sin el cursor de Prisma. El cursor es una tarea de la clase: se comprueba
// por (id, clase_id) antes de la página; su clave de orden sirve aunque la tarea ya no pase el filtro.
const condicionDeCursorDeTareas = async (
  db: Ejecutor,
  { claseId, cursor, campo }: { claseId: string; cursor: string | undefined; campo: string },
): Promise<Prisma.TareaWhereInput> => {
  if (cursor === undefined) return {}
  const delCursor = await db.tarea.findFirst({
    where: { id: cursor, claseId },
    select: { fechaLimite: true },
  })
  if (delCursor === null) throw errorCursorDeTareaInvalido(campo)
  const fecha = delCursor.fechaLimite
  return { OR: [{ fechaLimite: { lt: fecha } }, { fechaLimite: fecha, id: { lt: cursor } }] }
}

const categoriasDeLaClase = (db: Ejecutor, claseId: string): Promise<CategoriaDeLaClase[]> =>
  db.categoria.findMany({
    where: { claseId },
    select: { id: true, nombre: true, peso: true },
    orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
  })

interface FilaDeAgregado {
  categoria_id: string | null
  obtenido_centesimas: bigint
  posible: number
  tareas: number
}

const agregadoDe = (fila: FilaDeAgregado): AgregadoPorCategoria => ({
  categoriaId: fila.categoria_id,
  obtenidoCentesimas: Number(fila.obtenido_centesimas),
  posible: fila.posible,
  tareas: fila.tareas,
})

// §D-6.5. Lo calificado de cada alumno inscrito con cuenta activa, por categoría, en toda la clase.
const agregadosDeLaClase = async (
  tx: Prisma.TransactionClient,
  claseId: string,
): Promise<Map<string, AgregadoPorCategoria[]>> => {
  const filas = await tx.$queryRaw<(FilaDeAgregado & { alumno_id: string })[]>`
    SELECT e.alumno_id::text AS alumno_id, t.categoria_id::text AS categoria_id,
           (SUM(e.calificacion) * 100)::bigint AS obtenido_centesimas,
           SUM(t.puntos)::int AS posible, COUNT(*)::int AS tareas
    FROM tareas t
    JOIN entregas e      ON e.tarea_id = t.id AND e.estado = 'calificado'
    JOIN inscripciones i ON i.clase_id = t.clase_id AND i.usuario_id = e.alumno_id
    JOIN usuarios u      ON u.id = e.alumno_id AND u.activo
    WHERE t.clase_id = ${claseId}::uuid
    GROUP BY e.alumno_id, t.categoria_id`
  const porAlumno = new Map<string, AgregadoPorCategoria[]>()
  for (const fila of filas) {
    const previos = porAlumno.get(fila.alumno_id)
    if (previos === undefined) porAlumno.set(fila.alumno_id, [agregadoDe(fila)])
    else previos.push(agregadoDe(fila))
  }
  return porAlumno
}

// §D-6.6. Las tareas vencidas sin entregar de cada alumno inscrito con cuenta activa (fecha_limite <
// ahora es esTarde, S-03 de ENTREGAS-01). Una calificada sin entrega no cuenta: su estado es
// calificado y su cero ya cuenta en el promedio (S-04). Solo aparecen alumnos con al menos una.
const vencidasDeLaClase = async (
  tx: Prisma.TransactionClient,
  { claseId, ahora }: { claseId: string; ahora: Date },
): Promise<Map<string, number>> => {
  const filas = await tx.$queryRaw<{ alumno_id: string; vencidas: number }[]>`
    SELECT i.usuario_id::text AS alumno_id, COUNT(t.id)::int AS vencidas
    FROM inscripciones i
    JOIN usuarios u ON u.id = i.usuario_id AND u.activo
    JOIN tareas t   ON t.clase_id = i.clase_id AND t.fecha_limite < ${ahora}
    LEFT JOIN entregas e ON e.tarea_id = t.id AND e.alumno_id = i.usuario_id
                         AND e.estado IN ('entregado', 'calificado')
    WHERE i.clase_id = ${claseId}::uuid AND e.id IS NULL
    GROUP BY i.usuario_id`
  return new Map(filas.map((fila) => [fila.alumno_id, fila.vencidas]))
}

const leerGradebookCon = async (
  tx: Prisma.TransactionClient,
  {
    claseId,
    cursor,
    limite,
    cursorTareas,
    limiteTareas,
    ahora,
  }: {
    claseId: string
    cursor: string | undefined
    limite: number
    cursorTareas: string | undefined
    limiteTareas: number
    ahora: Date
  },
): Promise<GradebookDb> => {
  // 1. Columnas.
  const keysetDeTareas = await condicionDeCursorDeTareas(tx, {
    claseId,
    cursor: cursorTareas,
    campo: "cursorTareas",
  })
  const filasDeTareas = await tx.tarea.findMany({
    where: { claseId, ...keysetDeTareas },
    orderBy: ORDEN_DE_TAREAS,
    take: limiteTareas + 1,
    select: SELECT_TAREA,
  })
  const ventana = paginar(filasDeTareas, limiteTareas, (fila) => fila.id)
  const columnas = ventana.pagina.map(columnaDe)

  // 2. Filas.
  const { where, orderBy, take } = await condicionesDePaginaDeAlumnos(
    { claseId, cursor, limite },
    tx,
  )
  const filasDeAlumnos = await tx.inscripcion.findMany({
    where,
    orderBy,
    take,
    select: { usuarioId: true, usuario: { select: { nombre: true } } },
  })
  const pagina = paginar(filasDeAlumnos, limite, (fila) => fila.usuarioId)

  // 3. Celdas: una sola consulta por el único (tarea_id, alumno_id).
  const idsDeTareas = columnas.map((columna) => columna.id)
  const idsDeAlumnos = pagina.pagina.map((fila) => fila.usuarioId)
  const entregas =
    idsDeTareas.length === 0 || idsDeAlumnos.length === 0
      ? []
      : await tx.entrega.findMany({
          where: { tareaId: { in: idsDeTareas }, alumnoId: { in: idsDeAlumnos } },
          select: {
            tareaId: true,
            alumnoId: true,
            estado: true,
            conRetraso: true,
            calificacion: true,
          },
        })
  const entregaDe = new Map(
    entregas.map((entrega) => [
      `${entrega.alumnoId}:${entrega.tareaId}`,
      entregaResumidaDe(entrega),
    ]),
  )

  // 4 a 7. Categorías, agregados y vencidas de toda la clase y el total de alumnos.
  const categorias = await categoriasDeLaClase(tx, claseId)
  const agregados = await agregadosDeLaClase(tx, claseId)
  const vencidas = await vencidasDeLaClase(tx, { claseId, ahora })
  const totalAlumnos = await tx.inscripcion.count({
    where: { claseId, usuario: { activo: true } },
  })

  const resultadoDe = (alumnoId: string) => {
    const porcentaje = calificacionGeneral({
      categorias,
      agregados: agregados.get(alumnoId) ?? SIN_AGREGADOS,
    }).porcentaje
    const vencidasSinEntregar = vencidas.get(alumnoId) ?? 0
    return {
      porcentaje,
      vencidasSinEntregar,
      motivosDeRiesgo: motivosDeRiesgo({ porcentaje, vencidasSinEntregar }),
    }
  }

  // El resumen es de toda la clase: un alumno sin calificaciones y con menos vencidas que el umbral
  // no aparece en ninguno de los dos agregados y no está en riesgo.
  const conDatos = new Set([...agregados.keys(), ...vencidas.keys()])
  const resultados = [...conDatos].map(resultadoDe)

  return {
    tareas: columnas,
    siguienteCursorTareas: ventana.siguienteCursor,
    alumnos: pagina.pagina.map((fila) => ({
      alumno: { id: fila.usuarioId, nombre: fila.usuario.nombre },
      celdas: columnas.map((columna) => ({
        tareaId: columna.id,
        ...(entregaDe.get(`${fila.usuarioId}:${columna.id}`) ?? SIN_ENTREGA),
      })),
      ...resultadoDe(fila.usuarioId),
    })),
    siguienteCursor: pagina.siguienteCursor,
    resumen: {
      modo: calificacionGeneral({ categorias, agregados: SIN_AGREGADOS }).modo,
      totalAlumnos,
      promedioDeLaClase: promedioDeLaClase(
        [...agregados.keys()].map((alumnoId) => resultadoDe(alumnoId).porcentaje),
      ),
      alumnosEnRiesgo: resultados.filter((r) => r.motivosDeRiesgo.length > 0).length,
    },
  }
}

export const leerGradebook = (
  params: {
    claseId: string
    cursor: string | undefined
    limite: number
    cursorTareas: string | undefined
    limiteTareas: number
    ahora: Date
  },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<GradebookDb> =>
  enTransaccion(ejecutor, (tx) => leerGradebookCon(tx, params), { instantaneaUnica: true })

const ESTADOS_QUE_ENTREGARON: EstadoEntrega[] = ["entregado", "calificado"]

// §D-7.2. El filtro por la entrega del alumno (un EXISTS por el único (tarea_id, alumno_id)). Una
// calificada sin entrega está en "calificadas" y no en "asignadas" ni en "sin-entregar".
const condicionDelFiltro = ({
  filtro,
  alumnoId,
  ahora,
}: {
  filtro: FiltroDeMisCalificacionesDb
  alumnoId: string
  ahora: Date
}): Prisma.TareaWhereInput => {
  const sinEntregar = { none: { alumnoId, estado: { in: ESTADOS_QUE_ENTREGARON } } }
  if (filtro === "calificadas") return { entregas: { some: { alumnoId, estado: "calificado" } } }
  if (filtro === "entregadas") return { entregas: { some: { alumnoId, estado: "entregado" } } }
  if (filtro === "asignadas") return { fechaLimite: { gte: ahora }, entregas: sinEntregar }
  if (filtro === "sin-entregar") return { fechaLimite: { lt: ahora }, entregas: sinEntregar }
  return {}
}

const leerMisCalificacionesCon = async (
  tx: Prisma.TransactionClient,
  {
    claseId,
    alumnoId,
    filtro,
    cursor,
    limite,
    ahora,
  }: {
    claseId: string
    alumnoId: string
    filtro: FiltroDeMisCalificacionesDb
    cursor: string | undefined
    limite: number
    ahora: Date
  },
): Promise<MisCalificacionesDb> => {
  // 1 y 2. El cursor y la página.
  const keyset = await condicionDeCursorDeTareas(tx, { claseId, cursor, campo: "cursor" })
  const filas = await tx.tarea.findMany({
    where: { claseId, AND: [keyset, condicionDelFiltro({ filtro, alumnoId, ahora })] },
    orderBy: ORDEN_DE_TAREAS,
    take: limite + 1,
    select: SELECT_TAREA,
  })
  const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.id)
  const tareas = pagina.map(columnaDe)

  // 3. Las entregas del alumno en las tareas de la página.
  const ids = tareas.map((tarea) => tarea.id)
  const entregas =
    ids.length === 0
      ? []
      : await tx.entrega.findMany({
          where: { alumnoId, tareaId: { in: ids } },
          select: { tareaId: true, estado: true, conRetraso: true, calificacion: true },
        })
  const entregaDe = new Map(
    entregas.map((entrega) => [entrega.tareaId, entregaResumidaDe(entrega)]),
  )

  // 4. Las categorías y lo calificado del alumno (§D-7.4): la misma suma que el gradebook.
  const categorias = await categoriasDeLaClase(tx, claseId)
  const filasDeAgregado = await tx.$queryRaw<FilaDeAgregado[]>`
    SELECT t.categoria_id::text AS categoria_id, (SUM(e.calificacion) * 100)::bigint AS obtenido_centesimas,
           SUM(t.puntos)::int AS posible, COUNT(*)::int AS tareas
    FROM entregas e JOIN tareas t ON t.id = e.tarea_id
    WHERE e.alumno_id = ${alumnoId}::uuid AND t.clase_id = ${claseId}::uuid AND e.estado = 'calificado'
    GROUP BY t.categoria_id`

  return {
    general: calificacionGeneral({ categorias, agregados: filasDeAgregado.map(agregadoDe) }),
    tareas: tareas.map((tarea) => ({ ...tarea, entrega: entregaDe.get(tarea.id) ?? SIN_ENTREGA })),
    siguienteCursor,
  }
}

export const leerMisCalificaciones = (
  params: {
    claseId: string
    alumnoId: string
    filtro: FiltroDeMisCalificacionesDb
    cursor: string | undefined
    limite: number
    ahora: Date
  },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<MisCalificacionesDb> =>
  enTransaccion(ejecutor, (tx) => leerMisCalificacionesCon(tx, params), { instantaneaUnica: true })
