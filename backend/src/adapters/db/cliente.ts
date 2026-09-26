import { PrismaPg } from "@prisma/adapter-pg"

import { AppError } from "../../core/errores.js"
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
// expone $transaction, así que la función corre directamente sobre él.
export const enTransaccion = <T>(
  ejecutor: Ejecutor,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> => {
  if ("$transaction" in ejecutor) return ejecutor.$transaction(fn)
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
