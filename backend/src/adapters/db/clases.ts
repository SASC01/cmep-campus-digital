import { paginar } from "../../core/paginacion.js"
import { AppError } from "../../core/errores.js"
import { obtenerDb, type Ejecutor } from "./cliente.js"
import { traducirErrorPrisma } from "./errores.js"

export interface DatosDePertenencia {
  maestroId: string
  inscrito: boolean
}

// Sexto paso de la cadena (§D-0.1): una sola consulta, clase por PK con sus inscripciones
// filtradas por el usuario de la petición (a lo más una fila, por la PK compuesta).
export const buscarDatosDePertenencia = async (
  claseId: string,
  usuarioId: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<DatosDePertenencia | null> => {
  const clase = await ejecutor.clase.findUnique({
    where: { id: claseId },
    select: {
      maestroId: true,
      inscripciones: { where: { usuarioId }, select: { usuarioId: true } },
    },
  })
  if (clase === null) return null
  return { maestroId: clase.maestroId, inscrito: clase.inscripciones.length > 0 }
}

export interface ClaseDb {
  id: string
  nombre: string
  descripcion: string | null
  maestro: { id: string; nombre: string }
}

const SELECT_CLASE_DETALLE = {
  id: true,
  nombre: true,
  descripcion: true,
  maestro: { select: { id: true, nombre: true } },
} as const

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

export const crearClase = (
  {
    maestroId,
    nombre,
    descripcion,
  }: { maestroId: string; nombre: string; descripcion?: string | undefined },
  generarCodigo: () => string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ClaseDb> =>
  conReintentoDeCodigo(
    (codigo) =>
      ejecutor.clase.create({
        data: { maestroId, nombre, descripcion: descripcion ?? null, codigoInvitacion: codigo },
        select: SELECT_CLASE_DETALLE,
      }),
    generarCodigo,
  )

// Defensa extra (M-01, §D-A2): updateMany con id y maestro_id. Si actualiza 0 filas (clase
// inexistente o ajena, aunque requireOwnership ya lo haya negado antes), devuelve null.
export const editarClase = async (
  {
    claseId,
    maestroId,
    nombre,
    descripcion,
  }: { claseId: string; maestroId: string; nombre: string; descripcion?: string | undefined },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ClaseDb | null> => {
  const { count } = await ejecutor.clase.updateMany({
    where: { id: claseId, maestroId },
    data: { nombre, descripcion: descripcion ?? null },
  })
  if (count === 0) return null
  return leerClase(claseId, ejecutor)
}

export const leerClase = (
  claseId: string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ClaseDb | null> =>
  ejecutor.clase.findUnique({ where: { id: claseId }, select: SELECT_CLASE_DETALLE })

export const leerCodigo = async (
  { claseId, maestroId }: { claseId: string; maestroId: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<string | null> => {
  const clase = await ejecutor.clase.findFirst({
    where: { id: claseId, maestroId },
    select: { codigoInvitacion: true },
  })
  return clase?.codigoInvitacion ?? null
}

// null: clase inexistente o ajena (defensa extra, igual que editarClase).
export const regenerarCodigo = (
  { claseId, maestroId }: { claseId: string; maestroId: string },
  generarCodigo: () => string,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<string | null> =>
  conReintentoDeCodigo(async (codigo) => {
    const { count } = await ejecutor.clase.updateMany({
      where: { id: claseId, maestroId },
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

export const listarClasesImpartidas = async (
  { maestroId, cursor, limite }: { maestroId: string; cursor: string | undefined; limite: number },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaClasesImpartidasDb> => {
  if (cursor !== undefined) {
    const claseDelCursor = await ejecutor.clase.findFirst({
      where: { id: cursor, maestroId },
      select: { id: true },
    })
    if (claseDelCursor === null) throw errorCursorInvalido()
  }
  const [filas, total] = await Promise.all([
    ejecutor.clase.findMany({
      where: { maestroId },
      select: {
        id: true,
        nombre: true,
        _count: { select: { inscripciones: { where: { usuario: { activo: true } } } } },
      },
      orderBy: [{ creadoEn: "desc" }, { id: "desc" }],
      take: limite + 1,
      ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
    }),
    ejecutor.clase.count({ where: { maestroId } }),
  ])

  const { pagina, siguienteCursor } = paginar(filas, limite, (fila) => fila.id)

  return {
    clases: pagina.map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      alumnos: fila._count.inscripciones,
    })),
    total,
    siguienteCursor,
  }
}

export interface ListaClasesInscritasDb {
  clases: { id: string; nombre: string; maestro: { nombre: string } }[]
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
        clase: { select: { id: true, nombre: true, maestro: { select: { nombre: true } } } },
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
      maestro: { nombre: fila.clase.maestro.nombre },
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
