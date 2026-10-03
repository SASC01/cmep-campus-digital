import { escaparComodinesLike } from "../../core/clases/busqueda.js"
import { decidirAsignacion, decidirRetiro } from "../../core/clases/maestros.js"
import { AppError } from "../../core/errores.js"
import {
  ORDEN_DE_MAESTROS,
  SELECT_MAESTROS_DE_CLASE,
  maestrosDeFilas,
  type MaestroDb,
} from "./clases.js"
import { enTransaccion, obtenerDb, type Ejecutor } from "./cliente.js"
import { traducirErrorPrisma } from "./errores.js"
import type { Prisma } from "./generated/client.js"

export interface MaestrosDeClaseDb {
  maestros: MaestroDb[]
}

export interface CandidatoMaestroDb {
  id: string
  nombre: string
  email: string
}

export interface ListaCandidatosMaestroDb {
  candidatos: CandidatoMaestroDb[]
  hayMas: boolean
}

const sinAcceso = (): AppError =>
  new AppError("SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.", 403)

// §D-2A4, paso 1: el candado de la fila de la clase sin SQL crudo. Un updateMany de actualizado_en
// toma FOR NO KEY UPDATE (no es columna de llave), así que pone en serie las asignaciones y los
// retiros simultáneos de la misma clase y no choca con los FOR KEY SHARE de las FK. count = 0: la
// clase se borró después del sexto paso.
const bloquearClase = async (tx: Prisma.TransactionClient, claseId: string): Promise<void> => {
  const { count } = await tx.clase.updateMany({
    where: { id: claseId },
    data: { actualizadoEn: new Date() },
  })
  if (count === 0) throw sinAcceso()
}

const leerIdsDeMaestros = async (
  tx: Prisma.TransactionClient,
  claseId: string,
): Promise<string[]> => {
  const filas = await tx.maestroDeClase.findMany({
    where: { claseId },
    select: { maestroId: true },
    orderBy: ORDEN_DE_MAESTROS,
  })
  return filas.map((fila) => fila.maestroId)
}

const leerMaestros = async (
  tx: Prisma.TransactionClient,
  claseId: string,
): Promise<MaestrosDeClaseDb> => {
  const filas = await tx.maestroDeClase.findMany({
    where: { claseId },
    ...SELECT_MAESTROS_DE_CLASE,
  })
  return { maestros: maestrosDeFilas(filas) }
}

// Los ids se comparan en minúsculas: un UUID escrito en mayúsculas es el mismo y chocaría con la PK
// en lugar de reconocerse como ya asignado.
const enMinusculas = (id: string): string => id.toLowerCase()

// Asignar (§D-2A4): null si no es un maestro activo; 409 TOPE_DE_MAESTROS si la clase ya tiene 2 y
// este no está; idempotente si ya estaba (no escribe).
export const asignarMaestro = (
  { claseId, maestroId }: { claseId: string; maestroId: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<MaestrosDeClaseDb | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const id = enMinusculas(maestroId)
    await bloquearClase(tx, claseId)
    const maestro = await tx.usuario.findFirst({
      where: { id, rol: "maestro", activo: true },
      select: { id: true },
    })
    if (maestro === null) return null

    const decision = decidirAsignacion(await leerIdsDeMaestros(tx, claseId), id)
    if (decision === "asignar") {
      await tx.maestroDeClase.create({
        data: { claseId, maestroId: id },
        select: { claseId: true },
      })
    }
    return leerMaestros(tx, claseId)
  })

// Retirar (§D-2A4): 409 CLASE_SIN_MAESTRO si es el único; idempotente si no estaba. Si el retirado
// era el de clases.maestro_id (solo escritura, P-06 a), lo reescribe con el que queda, en la misma
// transacción.
export const retirarMaestro = (
  { claseId, maestroId }: { claseId: string; maestroId: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<MaestrosDeClaseDb> =>
  enTransaccion(ejecutor, async (tx) => {
    const id = enMinusculas(maestroId)
    await bloquearClase(tx, claseId)

    const decision = decidirRetiro(await leerIdsDeMaestros(tx, claseId), id)
    if (decision.tipo === "retirar") {
      await tx.maestroDeClase.deleteMany({ where: { claseId, maestroId: id } })
      const [restante] = decision.restantes
      if (restante !== undefined) {
        await tx.clase.updateMany({
          where: { id: claseId, maestroId: id },
          data: { maestroId: restante },
        })
      }
    }
    return leerMaestros(tx, claseId)
  })

// Buscador del administrador (S-06): `termino` llega normalizado por core/ (prepararTerminoDeBusqueda)
// y aquí se escapan los comodines de LIKE. Solo maestros activos. Selecciona el correo completo,
// que solo ve el administrador.
export const buscarMaestrosCandidatos = async (
  { termino, limite }: { termino: string; limite: number },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ListaCandidatosMaestroDb> => {
  try {
    const filas = await ejecutor.usuario.findMany({
      where: {
        nombreBusqueda: { contains: escaparComodinesLike(termino) },
        rol: "maestro",
        activo: true,
      },
      orderBy: [{ nombreBusqueda: "asc" }, { id: "asc" }],
      take: limite + 1,
      select: { id: true, nombre: true, email: true },
    })
    return { candidatos: filas.slice(0, limite), hayMas: filas.length > limite }
  } catch (error) {
    // Un término con el carácter nulo es entrada inválida (400), no un 500.
    return traducirErrorPrisma(error, {
      alDuplicar: () => new AppError("ERROR_INTERNO", "No se pudo completar la búsqueda.", 500),
    })
  }
}
