import { PrismaPg } from "@prisma/adapter-pg"

import { AppError } from "../../core/errores.js"
import { traducirErrorDeTransaccion } from "./errores.js"
import { PrismaClient, type Prisma } from "./generated/client.js"

// Única instancia del cliente y únicas importaciones del proyecto de @prisma/adapter-pg y del
// cliente generado (regla 1). Sin motor nativo: el adaptador habla con PostgreSQL a través de pg.
let cliente: PrismaClient | undefined

// Cliente o transacción interactiva: todos los repositorios aceptan cualquiera de los dos como
// último parámetro para poder correr dentro de una transacción ajena (DEC-10).
export type Ejecutor = PrismaClient | Prisma.TransactionClient

// Idempotente: construirApp puede ejecutarse más de una vez en el mismo proceso (pruebas).
// connectionString llega ya validada por config/env.ts; adapters/ no lee process.env.
export const inicializarDb = ({ connectionString }: { connectionString: string }): void => {
  if (cliente) return
  const adapter = new PrismaPg({ connectionString })
  cliente = new PrismaClient({ adapter })
}

export const obtenerDb = (): PrismaClient => {
  if (!cliente) {
    throw new AppError(
      "BASE_DE_DATOS_NO_INICIALIZADA",
      "La base de datos no está inicializada.",
      500,
    )
  }
  return cliente
}

// Un PrismaClient abre su propia transacción; un TransactionClient ya está dentro de una y no
// expone $transaction, así que la función corre directamente sobre él. Es el único $transaction de
// backend/src (lo comprueba higiene-de-pruebas.integracion.test.ts): un P2028 (la transacción expiró
// o no obtuvo conexión) se traduce aquí, para todos, a 503 SERVICIO_OCUPADO (CHORE-02).
// maxWait (opcional): cuánto espera la transacción para obtener una conexión del pool (2 s por
// defecto de Prisma). Solo para las que van en serie sobre una fila con muchos clientes a la vez
// (M-08); un enTransaccion anidado, que ya tiene conexión, lo ignora. El timeout no cambia.
// instantaneaUnica (opcional, FIX-CLASES): abre la transacción en REPEATABLE READ, así todas sus
// sentencias (también las que Prisma manda por cada relación anidada) ven la instantánea de la
// primera; en READ COMMITTED cada una toma la suya. SOLO para lecturas de varias sentencias cuya
// respuesta exige una relación obligatoria o una cardinalidad mínima, o que comprueban la fila del
// cursor en una sentencia y leen la página en otra (con el cursor de Prisma, una fila del cursor
// borrada en medio da una página vacía aunque queden filas detrás: regla T-18): dentro no se escribe (una
// escritura que choca falla con 40001, hoy un 500) y las sentencias van una tras otra, sin
// Promise.all. Anidada, ignora la opción: no puede cambiar el aislamiento de la de afuera. Sin
// opciones, la llamada a Prisma es la de siempre (READ COMMITTED, del que depende el protocolo de
// bloqueo por usuario).
export const enTransaccion = <T>(
  ejecutor: Ejecutor,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  opciones: { maxWait?: number; instantaneaUnica?: true } = {},
): Promise<T> => {
  if ("$transaction" in ejecutor) {
    const deLaTransaccion: { maxWait?: number; isolationLevel?: "RepeatableRead" } = {}
    if (opciones.maxWait !== undefined) deLaTransaccion.maxWait = opciones.maxWait
    if (opciones.instantaneaUnica === true) deLaTransaccion.isolationLevel = "RepeatableRead"
    const abierta =
      Object.keys(deLaTransaccion).length === 0
        ? ejecutor.$transaction(fn)
        : ejecutor.$transaction(fn, deLaTransaccion)
    return abierta.catch(traducirErrorDeTransaccion)
  }
  return fn(ejecutor)
}

export const cerrarConexion = async (): Promise<void> => {
  if (!cliente) return
  await cliente.$disconnect()
  cliente = undefined
}

// Puerto que adapters/queue le pasa a pg-boss como db de send() (DEC-07): permite que pg-boss
// encole dentro de la misma transacción de Prisma. Igual que fromPrisma, el adaptador que pg-boss
// publica (dist/adapters/prisma.js): pasa texto y valores tal como pg-boss los entrega, sin
// transformarlos. Único $queryRawUnsafe de backend/src (V-13); handlers/ y workers/ solo reciben
// esta capacidad envuelta en alGuardar(sql) y la pasan a encolar, nunca la invocan (regla 1 y 4).
export interface EjecutorSql {
  executeSql(texto: string, valores?: unknown[]): Promise<{ rows: unknown[] }>
}

export const ejecutorSqlDe = (tx: Prisma.TransactionClient): EjecutorSql => ({
  executeSql: async (texto, valores) => {
    const filas = await tx.$queryRawUnsafe(texto, ...(valores ?? []))
    return { rows: Array.isArray(filas) ? filas : [] }
  },
})
