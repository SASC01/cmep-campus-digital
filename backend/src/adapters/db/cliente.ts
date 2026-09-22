import { PrismaPg } from "@prisma/adapter-pg"

import { AppError } from "../../core/errores.js"
import { PrismaClient } from "./generated/client.js"

// Única instancia del cliente y únicas importaciones del proyecto de @prisma/adapter-pg y del
// cliente generado (regla 1). Sin motor nativo: el adaptador habla con PostgreSQL a través de pg.
let cliente: PrismaClient | undefined

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

export const cerrarConexion = async (): Promise<void> => {
  if (!cliente) return
  await cliente.$disconnect()
  cliente = undefined
}
