import { PrismaClient } from "@prisma/client"

// Única instancia del cliente y única importación de @prisma/client en el proyecto (regla 1).
// La URL sale de DATABASE_URL (schema.prisma), validada por config/env.ts antes de arrancar.
export const prisma = new PrismaClient()

export const cerrarConexion = (): Promise<void> => prisma.$disconnect()
