import { MAXIMO_MAESTROS_POR_CLASE, type EstadoDeClases } from "@campus/shared"

import { errorClaseArchivada } from "../../core/clases/archivada.js"
import { paginar } from "../../core/paginacion.js"
import { AppError } from "../../core/errores.js"
import { enTransaccion, obtenerDb, type Ejecutor } from "./cliente.js"
import { traducirErrorPrisma } from "./errores.js"
import type { Prisma } from "./generated/client.js"

// CLASES-02 (S-05): la ÚNICA definición del orden de los maestros de una clase, el de su
// asignación: (creado_en, maestro_id) ascendente. La reutilizan el detalle, inscritas, la lista del
// admin, maestros-de-clase.ts y, desde 02b, listarPersonas. El primero es el "principal".
export const ORDEN_DE_MAESTROS: Prisma.MaestroDeClaseOrderByWithRelationInput[] = [
  { creadoEn: "asc" },
  { maestroId: "asc" },
]

export interface DatosDePertenencia {
  esMaestro: boolean
  inscrito: boolean
  // ADMIN-01a (§D-1): la clase está archivada; el sexto paso lo decide con la política de la ruta.
  archivada: boolean
}

// Sexto paso de la cadena (§D-0.1, §D-2A2): una sola llamada a Prisma, la clase por PK con sus
// maestros y sus inscripciones filtrados por el usuario de la petición (a lo más una fila cada uno,
// por sus PK compuestas). Prisma la resuelve con varias sentencias (N-01 de FIX-CLASES, E-04 de
// ADMIN-01): no hace falta una sola instantánea, porque la decisión solo usa la existencia de la
// clase, su fecha de archivo y dos conjuntos acotados a un usuario; un borrado en medio deja, como
// mucho, una relación sin conceder.
export const buscarDatosDePertenencia = async (
  claseId: string,
  usuarioId: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<DatosDePertenencia | null> => {
  const clase = await ejecutor.clase.findUnique({
    where: { id: claseId },
    select: {
      archivadaEn: true,
      maestros: { where: { maestroId: usuarioId }, select: { maestroId: true } },
      inscripciones: { where: { usuarioId }, select: { usuarioId: true } },
    },
  })
  if (clase === null) return null
  return {
    esMaestro: clase.maestros.length > 0,
    inscrito: clase.inscripciones.length > 0,
    archivada: clase.archivadaEn !== null,
  }
}

export interface MaestroDb {
  id: string
  nombre: string
}

export interface ClaseDb {
  id: string
  nombre: string
  descripcion: string | null
  // De uno a dos, en el orden de ORDEN_DE_MAESTROS.
  maestros: MaestroDb[]
  // ADMIN-01a (S-14): null en una clase activa.
  archivadaEn: Date | null
}

export const SELECT_MAESTROS_DE_CLASE = {
  select: { maestro: { select: { id: true, nombre: true } } },
  orderBy: ORDEN_DE_MAESTROS,
} as const

const SELECT_CLASE_DETALLE = {
  id: true,
  nombre: true,
  descripcion: true,
  archivadaEn: true,
  maestros: SELECT_MAESTROS_DE_CLASE,
} as const

interface FilaDeMaestros {
  maestro: MaestroDb
}

export const maestrosDeFilas = (filas: readonly FilaDeMaestros[]): MaestroDb[] =>
  filas.map((fila) => fila.maestro)

interface FilaDeClase {
  id: string
  nombre: string
  descripcion: string | null
  archivadaEn: Date | null
  maestros: FilaDeMaestros[]
}

const aClaseDb = (fila: FilaDeClase): ClaseDb => ({
  id: fila.id,
  nombre: fila.nombre,
  descripcion: fila.descripcion,
  maestros: maestrosDeFilas(fila.maestros),
  archivadaEn: fila.archivadaEn,
})

const errorCodigoNoDisponible = (): AppError =>
  new AppError("CODIGO_NO_DISPONIBLE", "No se pudo generar un código de clase disponible.", 500)

// Aparte de la llave primaria (un choque de gen_random_uuid() es inviable en la práctica), el único
// índice único de "clases" es codigo_invitacion (§D-A1): cualquier violación de unicidad real de un
// create o un updateMany sobre esta tabla es ese duplicado. alDuplicar siempre traduce a
// CODIGO_NO_DISPONIBLE (M-04); el 22021 (texto no válido) lo sigue traduciendo traducirErrorPrisma a
// 400 VALIDACION, y cualquier otro error se relanza tal cual: este archivo no conoce los códigos de
// Prisma, esos siguen siendo solo de adapters/db/errores.ts.
const traducirErrorDeCodigo = (error: unknown): AppError => {
  try {
    traducirErrorPrisma(error, { alDuplicar: () => errorCodigoNoDisponible() })
  } catch (traducido) {
    if (traducido instanceof AppError) return traducido
    throw traducido
  }
  // traducirErrorPrisma siempre lanza (su tipo de retorno es never); esta línea es inalcanzable.
  throw error
}

// Reintenta una sola vez con un código nuevo si el primero choca con el índice único de
// codigo_invitacion, detectado con traducirErrorPrisma y su alDuplicar (§D-A2; S-03, regla 4: sin
// ciclo). Si el primer error no se traduce a CODIGO_NO_DISPONIBLE, se relanza sin reintentar (por
// ejemplo, el 22021 traducido a 400, o cualquier otro error).
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

// CLASES-02 (§D-2A4, punto 5): los maestros se validan con una lectura por PK (rol maestro y
// activos). null: la lista no es de uno a dos ids distintos o alguno no es un maestro activo; no se
// pide código ni se escribe nada. Después, un solo create anidado (atómico) con la clase y sus
// asignaciones. clases.maestro_id solo se ESCRIBE (P-06 a): el primer maestro en el orden de
// ORDEN_DE_MAESTROS, que con la misma creado_en desempata por id.
export const crearClaseAdministrada = async (
  {
    nombre,
    descripcion,
    maestroIds,
  }: { nombre: string; descripcion?: string | undefined; maestroIds: readonly string[] },
  generarCodigo: () => string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ClaseDb | null> => {
  const ids = maestroIds.map((id) => id.toLowerCase())
  if (ids.length < 1 || ids.length > MAXIMO_MAESTROS_POR_CLASE) return null
  if (new Set(ids).size !== ids.length) return null

  const validos = await ejecutor.usuario.findMany({
    where: { id: { in: ids }, rol: "maestro", activo: true },
    select: { id: true },
  })
  if (validos.length !== ids.length) return null

  const [primero] = [...ids].sort()
  if (primero === undefined) return null
  const ahora = new Date()
  const fila = await conReintentoDeCodigo(
    (codigo) =>
      ejecutor.clase.create({
        data: {
          maestroId: primero,
          nombre,
          descripcion: descripcion ?? null,
          codigoInvitacion: codigo,
          creadoEn: ahora,
          maestros: { create: ids.map((maestroId) => ({ maestroId, creadoEn: ahora })) },
        },
        select: SELECT_CLASE_DETALLE,
      }),
    generarCodigo,
  )
  return aClaseDb(fila)
}

// Sin filtro por maestro_id desde CLASES-02 (A-10): la única autorización es el sexto paso, que
// deja pasar a los maestros de la clase y al administrador. null: la clase ya no existe.
// ADMIN-01a (E-04, T-01): la ruta ya es cerrada en una archivada; el filtro cubre la carrera con un
// archivado que confirma después del sexto paso. Si no cambia ninguna fila, se relee por PK para
// responder lo mismo que la ruta cerrada (409 CLASE_ARCHIVADA) y no un 403 a quien sí tiene acceso.
export const editarClase = async (
  {
    claseId,
    nombre,
    descripcion,
  }: { claseId: string; nombre: string; descripcion?: string | undefined },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ClaseDb | null> => {
  const { count } = await ejecutor.clase.updateMany({
    where: { id: claseId, archivadaEn: null },
    data: { nombre, descripcion: descripcion ?? null },
  })
  if (count === 0) {
    const fila = await ejecutor.clase.findUnique({
      where: { id: claseId },
      select: { archivadaEn: true },
    })
    if (fila === null) return null
    throw errorClaseArchivada()
  }
  return leerClase(claseId, ejecutor)
}

// FIX-CLASES: Prisma resuelve los maestros con otra sentencia; en una sola instantánea, un borrado
// de la clase entre las dos no la deja sin maestros.
export const leerClase = (
  claseId: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ClaseDb | null> =>
  enTransaccion(
    ejecutor,
    async (tx) => {
      const fila = await tx.clase.findUnique({
        where: { id: claseId },
        select: SELECT_CLASE_DETALLE,
      })
      return fila === null ? null : aClaseDb(fila)
    },
    { instantaneaUnica: true },
  )

export const leerCodigo = async (
  claseId: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<string | null> => {
  const clase = await ejecutor.clase.findUnique({
    where: { id: claseId },
    select: { codigoInvitacion: true },
  })
  return clase?.codigoInvitacion ?? null
}

// null: la clase ya no existe.
export const regenerarCodigo = (
  claseId: string,
  generarCodigo: () => string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<string | null> =>
  conReintentoDeCodigo(async (codigo) => {
    const { count } = await ejecutor.clase.updateMany({
      where: { id: claseId },
      data: { codigoInvitacion: codigo },
    })
    return count === 0 ? null : codigo
  }, generarCodigo)

// T-18 (ronda 3 del tester; regla aprobada por el humano, extensión de O-01): el cursor de Prisma
// va sobre una llave que puede dejar de existir (la clase o la inscripción del cursor, con una
// baja que llega con CLASES-b). Si esa fila ya no está, Prisma devuelve una lista vacía en lugar de
// avisar, y "Ver más clases" oculta en silencio las filas restantes. Una lectura por PK, fuera de
// ciclo, antes de paginar: si el cursor no es una fila del usuario que pide la página, se rechaza
// con el mismo mensaje de VALIDACION que O-01, en vez de devolver una página vacía.
const errorCursorInvalido = (): AppError => new AppError("VALIDACION", "cursor: no es válido", 400)

export interface ListaClasesImpartidasDb {
  clases: { id: string; nombre: string; alumnos: number }[]
  total: number
  siguienteCursor: string | null
}

// Lee maestros_de_clase con su índice (maestro_id, creado_en DESC, clase_id DESC); el cursor (un
// claseId) se comprueba por la PK (clase_id, maestro_id) y la lista va en el orden de la asignación.
// FIX-CLASES: una sola instantánea para el cursor, la página con su clase y el total, en serie.
// ADMIN-01a (§D-2, R-04): sin las clases archivadas, también en el total. El cursor sigue siendo la
// lectura por PK (M-01) y trae la fecha de archivo de su clase: si se archivó entre dos páginas, 400
// (el skip: 1 de Prisma saltaría una fila ajena si el cursor no cumple el filtro).
export const listarClasesImpartidas = (
  { maestroId, cursor, limite }: { maestroId: string; cursor: string | undefined; limite: number },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaClasesImpartidasDb> =>
  enTransaccion(
    ejecutor,
    async (tx) => {
      if (cursor !== undefined) {
        const asignacionDelCursor = await tx.maestroDeClase.findUnique({
          where: { claseId_maestroId: { claseId: cursor, maestroId } },
          select: { claseId: true, clase: { select: { archivadaEn: true } } },
        })
        if (asignacionDelCursor === null) throw errorCursorInvalido()
        if (asignacionDelCursor.clase.archivadaEn !== null) throw errorCursorInvalido()
      }
      const filas = await tx.maestroDeClase.findMany({
        where: { maestroId, clase: { archivadaEn: null } },
        select: {
          claseId: true,
          clase: {
            select: {
              nombre: true,
              _count: { select: { inscripciones: { where: { usuario: { activo: true } } } } },
            },
          },
        },
        orderBy: [{ creadoEn: "desc" }, { claseId: "desc" }],
        take: limite + 1,
        ...(cursor === undefined
          ? {}
          : { cursor: { claseId_maestroId: { claseId: cursor, maestroId } }, skip: 1 }),
      })
      const total = await tx.maestroDeClase.count({
        where: { maestroId, clase: { archivadaEn: null } },
      })

      const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.claseId)

      return {
        clases: pagina.map((fila) => ({
          id: fila.claseId,
          nombre: fila.clase.nombre,
          alumnos: fila.clase._count.inscripciones,
        })),
        total,
        siguienteCursor,
      }
    },
    { instantaneaUnica: true },
  )

export interface ListaClasesInscritasDb {
  clases: { id: string; nombre: string; maestros: { nombre: string }[] }[]
  total: number
  siguienteCursor: string | null
}

// FIX-CLASES: una sola instantánea para el cursor, la página con su clase y sus maestros, y el
// total, en serie. ADMIN-01a (§D-2, R-04): sin las clases archivadas, como en impartidas.
export const listarClasesInscritas = (
  { usuarioId, cursor, limite }: { usuarioId: string; cursor: string | undefined; limite: number },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaClasesInscritasDb> =>
  enTransaccion(
    ejecutor,
    async (tx) => {
      if (cursor !== undefined) {
        const inscripcionDelCursor = await tx.inscripcion.findUnique({
          where: { claseId_usuarioId: { claseId: cursor, usuarioId } },
          select: { claseId: true, clase: { select: { archivadaEn: true } } },
        })
        if (inscripcionDelCursor === null) throw errorCursorInvalido()
        if (inscripcionDelCursor.clase.archivadaEn !== null) throw errorCursorInvalido()
      }
      const filas = await tx.inscripcion.findMany({
        where: { usuarioId, clase: { archivadaEn: null } },
        select: {
          claseId: true,
          clase: {
            select: {
              id: true,
              nombre: true,
              maestros: {
                select: { maestro: { select: { nombre: true } } },
                orderBy: ORDEN_DE_MAESTROS,
              },
            },
          },
        },
        orderBy: [{ creadoEn: "desc" }, { claseId: "desc" }],
        take: limite + 1,
        ...(cursor === undefined
          ? {}
          : { cursor: { claseId_usuarioId: { claseId: cursor, usuarioId } }, skip: 1 }),
      })
      const total = await tx.inscripcion.count({
        where: { usuarioId, clase: { archivadaEn: null } },
      })

      const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.claseId)

      return {
        clases: pagina.map((fila) => ({
          id: fila.clase.id,
          nombre: fila.clase.nombre,
          maestros: fila.clase.maestros.map((asignacion) => ({
            nombre: asignacion.maestro.nombre,
          })),
        })),
        total,
        siguienteCursor,
      }
    },
    { instantaneaUnica: true },
  )

const cumpleElEstado = (archivadaEn: Date | null, estado: EstadoDeClases | undefined): boolean => {
  if (estado === "activas") return archivadaEn === null
  if (estado === "archivadas") return archivadaEn !== null
  return true
}

const filtroDeEstado = (estado: EstadoDeClases | undefined): Prisma.ClaseWhereInput => {
  if (estado === "activas") return { archivadaEn: null }
  if (estado === "archivadas") return { archivadaEn: { not: null } }
  return {}
}

const ordenDeEstado = (
  estado: EstadoDeClases | undefined,
): Prisma.ClaseOrderByWithRelationInput[] => {
  if (estado === "archivadas") return [{ archivadaEn: "desc" }, { id: "desc" }]
  return [{ creadoEn: "desc" }, { id: "desc" }]
}

export interface ClaseAdminDb {
  id: string
  nombre: string
  maestros: MaestroDb[]
  alumnos: number
  creadoEn: Date
  archivadaEn: Date | null
}

export interface ListaClasesAdminDb {
  clases: ClaseAdminDb[]
  total: number
  siguienteCursor: string | null
  // Enmienda 5: el archivadaEn de la última fila, solo con "archivadas" y página siguiente.
  siguienteCursorArchivadaEn: Date | null
}

// Lista institucional (§D-2A3, S-07): de la más reciente a la más antigua por el índice
// (creado_en DESC, id DESC). El cursor es una clase y se lee antes por PK: si no existe, 400 en
// lugar de una página vacía. Prisma resuelve los maestros de la página con otra sentencia (una para
// toda la página, no una por fila); por eso la lectura corre en una sola instantánea (FIX-CLASES):
// un borrado de la clase entre las dos sentencias dejaría una clase sin maestros.
// ADMIN-01a (§D-2, DH-11): sin `estado`, todas las clases, como antes. "activas" va por
// (creado_en DESC, id DESC) con el índice parcial clases_activas_idx; "archivadas", por
// (archivada_en DESC, id DESC) con clases_archivadas_idx. El cursor sigue siendo la lectura por PK
// (M-01) y debe cumplir el mismo filtro; si no, 400 (R-04).
// Enmienda 5 (§D-2, T-02): con "archivadas", el cursor viaja con su posición (cursorArchivadaEn),
// que se compara como texto con la fecha de archivo actual de la fila del cursor: si la clase se
// restauró y se volvió a archivar entre dos páginas, 400 en vez de repetir o saltar filas. Sin
// estado o con "activas" la clave de orden no cambia y la posición no se admite.
export const listarClasesAdmin = (
  {
    cursor,
    cursorArchivadaEn,
    limite,
    estado,
  }: {
    cursor: string | undefined
    cursorArchivadaEn?: string | undefined
    limite: number
    estado?: EstadoDeClases | undefined
  },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaClasesAdminDb> =>
  enTransaccion(
    ejecutor,
    async (tx) => {
      const conPosicion = estado === "archivadas"
      if (!conPosicion && cursorArchivadaEn !== undefined) throw errorCursorInvalido()
      if (conPosicion && (cursor === undefined) !== (cursorArchivadaEn === undefined)) {
        throw errorCursorInvalido()
      }
      if (cursor !== undefined) {
        const claseDelCursor = await tx.clase.findUnique({
          where: { id: cursor },
          select: { id: true, archivadaEn: true },
        })
        if (claseDelCursor === null) throw errorCursorInvalido()
        if (!cumpleElEstado(claseDelCursor.archivadaEn, estado)) throw errorCursorInvalido()
        if (conPosicion && claseDelCursor.archivadaEn?.toISOString() !== cursorArchivadaEn) {
          throw errorCursorInvalido()
        }
      }
      const where = filtroDeEstado(estado)
      const filas = await tx.clase.findMany({
        where,
        select: {
          id: true,
          nombre: true,
          creadoEn: true,
          archivadaEn: true,
          maestros: SELECT_MAESTROS_DE_CLASE,
          _count: { select: { inscripciones: { where: { usuario: { activo: true } } } } },
        },
        orderBy: ordenDeEstado(estado),
        take: limite + 1,
        ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
      })
      const total = await tx.clase.count({ where })

      const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.id)
      const ultima = pagina.at(-1)
      const siguienteCursorArchivadaEn =
        conPosicion && siguienteCursor !== null && ultima !== undefined ? ultima.archivadaEn : null

      return {
        clases: pagina.map((fila) => ({
          id: fila.id,
          nombre: fila.nombre,
          maestros: maestrosDeFilas(fila.maestros),
          alumnos: fila._count.inscripciones,
          creadoEn: fila.creadoEn,
          archivadaEn: fila.archivadaEn,
        })),
        total,
        siguienteCursor,
        siguienteCursorArchivadaEn,
      }
    },
    { instantaneaUnica: true },
  )

// ADMIN-01a (§D-3, E-04): unirse con código decide dentro de una transacción con la fila de la
// clase tomada en modo compartido, en serie con archivarla y con borrarla. El código de una clase
// archivada no sirve: null, igual que un código inexistente (el handler responde 404 CODIGO_INVALIDO
// sin revelar que existe). No registra movimientos_inscripcion (eso es solo para el alta manual y la
// baja, CLASES-b); insertar sin duplicados hace la operación idempotente.
export const unirseConCodigo = (
  { codigo, usuarioId }: { codigo: string; usuarioId: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<{ clase: { id: string; nombre: string }; yaEstaba: boolean } | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const filas = await tx.$queryRaw<{ id: string; nombre: string; archivada_en: Date | null }[]>`
      SELECT id, nombre, archivada_en FROM clases
      WHERE codigo_invitacion = ${codigo}
      FOR SHARE`
    const [clase] = filas
    if (clase === undefined || clase.archivada_en !== null) return null
    const { count } = await tx.inscripcion.createMany({
      data: [{ claseId: clase.id, usuarioId, origen: "codigo" }],
      skipDuplicates: true,
    })
    return { clase: { id: clase.id, nombre: clase.nombre }, yaEstaba: count === 0 }
  })
