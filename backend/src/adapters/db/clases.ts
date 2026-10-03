import { MAXIMO_MAESTROS_POR_CLASE } from "@campus/shared"

import { paginar } from "../../core/paginacion.js"
import { AppError } from "../../core/errores.js"
import { obtenerDb, type Ejecutor } from "./cliente.js"
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
}

// Sexto paso de la cadena (§D-0.1, §D-2A2): una sola consulta, clase por PK con sus maestros y sus
// inscripciones filtrados por el usuario de la petición (a lo más una fila cada uno, por sus PK
// compuestas).
export const buscarDatosDePertenencia = async (
  claseId: string,
  usuarioId: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<DatosDePertenencia | null> => {
  const clase = await ejecutor.clase.findUnique({
    where: { id: claseId },
    select: {
      maestros: { where: { maestroId: usuarioId }, select: { maestroId: true } },
      inscripciones: { where: { usuarioId }, select: { usuarioId: true } },
    },
  })
  if (clase === null) return null
  return { esMaestro: clase.maestros.length > 0, inscrito: clase.inscripciones.length > 0 }
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
}

export const SELECT_MAESTROS_DE_CLASE = {
  select: { maestro: { select: { id: true, nombre: true } } },
  orderBy: ORDEN_DE_MAESTROS,
} as const

const SELECT_CLASE_DETALLE = {
  id: true,
  nombre: true,
  descripcion: true,
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
  maestros: FilaDeMaestros[]
}

const aClaseDb = (fila: FilaDeClase): ClaseDb => ({
  id: fila.id,
  nombre: fila.nombre,
  descripcion: fila.descripcion,
  maestros: maestrosDeFilas(fila.maestros),
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
export const editarClase = async (
  {
    claseId,
    nombre,
    descripcion,
  }: { claseId: string; nombre: string; descripcion?: string | undefined },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ClaseDb | null> => {
  const { count } = await ejecutor.clase.updateMany({
    where: { id: claseId },
    data: { nombre, descripcion: descripcion ?? null },
  })
  if (count === 0) return null
  return leerClase(claseId, ejecutor)
}

export const leerClase = async (
  claseId: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ClaseDb | null> => {
  const fila = await ejecutor.clase.findUnique({
    where: { id: claseId },
    select: SELECT_CLASE_DETALLE,
  })
  return fila === null ? null : aClaseDb(fila)
}

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
export const listarClasesImpartidas = async (
  { maestroId, cursor, limite }: { maestroId: string; cursor: string | undefined; limite: number },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaClasesImpartidasDb> => {
  if (cursor !== undefined) {
    const asignacionDelCursor = await ejecutor.maestroDeClase.findUnique({
      where: { claseId_maestroId: { claseId: cursor, maestroId } },
      select: { claseId: true },
    })
    if (asignacionDelCursor === null) throw errorCursorInvalido()
  }
  const [filas, total] = await Promise.all([
    ejecutor.maestroDeClase.findMany({
      where: { maestroId },
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
    }),
    ejecutor.maestroDeClase.count({ where: { maestroId } }),
  ])

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
}

export interface ListaClasesInscritasDb {
  clases: { id: string; nombre: string; maestros: { nombre: string }[] }[]
  total: number
  siguienteCursor: string | null
}

export const listarClasesInscritas = async (
  { usuarioId, cursor, limite }: { usuarioId: string; cursor: string | undefined; limite: number },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaClasesInscritasDb> => {
  if (cursor !== undefined) {
    const inscripcionDelCursor = await ejecutor.inscripcion.findUnique({
      where: { claseId_usuarioId: { claseId: cursor, usuarioId } },
      select: { claseId: true },
    })
    if (inscripcionDelCursor === null) throw errorCursorInvalido()
  }
  const [filas, total] = await Promise.all([
    ejecutor.inscripcion.findMany({
      where: { usuarioId },
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
    }),
    ejecutor.inscripcion.count({ where: { usuarioId } }),
  ])

  const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.claseId)

  return {
    clases: pagina.map((fila) => ({
      id: fila.clase.id,
      nombre: fila.clase.nombre,
      maestros: fila.clase.maestros.map((asignacion) => ({ nombre: asignacion.maestro.nombre })),
    })),
    total,
    siguienteCursor,
  }
}

export interface ClaseAdminDb {
  id: string
  nombre: string
  maestros: MaestroDb[]
  alumnos: number
  creadoEn: Date
}

export interface ListaClasesAdminDb {
  clases: ClaseAdminDb[]
  total: number
  siguienteCursor: string | null
}

// Lista institucional (§D-2A3, S-07): de la más reciente a la más antigua por el índice
// (creado_en DESC, id DESC). El cursor es una clase y se lee antes por PK: si no existe, 400 en
// lugar de una página vacía. Los maestros de la página salen en una sola consulta (Prisma agrupa la
// relación de toda la página), no una por fila.
export const listarClasesAdmin = async (
  { cursor, limite }: { cursor: string | undefined; limite: number },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaClasesAdminDb> => {
  if (cursor !== undefined) {
    const claseDelCursor = await ejecutor.clase.findUnique({
      where: { id: cursor },
      select: { id: true },
    })
    if (claseDelCursor === null) throw errorCursorInvalido()
  }
  const [filas, total] = await Promise.all([
    ejecutor.clase.findMany({
      select: {
        id: true,
        nombre: true,
        creadoEn: true,
        maestros: SELECT_MAESTROS_DE_CLASE,
        _count: { select: { inscripciones: { where: { usuario: { activo: true } } } } },
      },
      orderBy: [{ creadoEn: "desc" }, { id: "desc" }],
      take: limite + 1,
      ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
    }),
    ejecutor.clase.count(),
  ])

  const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.id)

  return {
    clases: pagina.map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      maestros: maestrosDeFilas(fila.maestros),
      alumnos: fila._count.inscripciones,
      creadoEn: fila.creadoEn,
    })),
    total,
    siguienteCursor,
  }
}

export const buscarClasePorCodigo = (
  codigo: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<{ id: string; nombre: string } | null> =>
  ejecutor.clase.findUnique({
    where: { codigoInvitacion: codigo },
    select: { id: true, nombre: true },
  })

// Unirse con código (S-04, S-23): no registra movimientos_inscripcion (eso es solo para el alta
// manual y la baja, CLASES-b). skipDuplicates hace la operación idempotente.
export const inscribir = async (
  {
    claseId,
    usuarioId,
    origen,
  }: { claseId: string; usuarioId: string; origen: "codigo" | "manual" },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<{ yaEstaba: boolean }> => {
  const { count } = await ejecutor.inscripcion.createMany({
    data: [{ claseId, usuarioId, origen }],
    skipDuplicates: true,
  })
  return { yaEstaba: count === 0 }
}
