import { obtenerDb } from "./cliente.js"

type LogDeAdvertencias = {
  warn: (datos: Record<string, unknown>, mensaje: string) => void
}

const nombreDe = (error: unknown): string => (error instanceof Error ? error.name : typeof error)

const codigoDe = (error: unknown): string | undefined => {
  if (typeof error !== "object" || error === null) return undefined
  const { errorCode, code } = error as { errorCode?: unknown; code?: unknown }
  const codigo = errorCode ?? code
  return typeof codigo === "string" ? codigo : undefined
}

// Único lugar que conoce el fallo de Prisma. No registra la URL ni el mensaje del proveedor:
// solo el nombre del error y su código (P1000, P1001...), suficientes para el diagnóstico.
export const verificarConexion = async (log?: LogDeAdvertencias): Promise<boolean> => {
  // Fuera del try: una base no inicializada es un error de programación (500), no una caída (503).
  const db = obtenerDb()
  try {
    await db.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    log?.warn(
      { error: { nombre: nombreDe(error), codigo: codigoDe(error) } },
      "La base de datos no respondió a SELECT 1",
    )
    return false
  }
}
