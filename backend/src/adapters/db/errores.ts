import { AppError } from "../../core/errores.js"
import { Prisma } from "./generated/client.js"

const comoObjeto = (valor: unknown): Record<string, unknown> | undefined => {
  if (typeof valor !== "object" || valor === null) return undefined
  return valor as Record<string, unknown>
}

const comoTextos = (valor: unknown): string[] => {
  if (typeof valor === "string") return [valor]
  if (!Array.isArray(valor)) return []
  return valor.filter((elemento): elemento is string => typeof elemento === "string")
}

// Columnas o índice afectados por un P2002. Con el motor clásico llegan en meta.target (arreglo de
// columnas o nombre del índice); con un driver adapter (Prisma 7 + @prisma/adapter-pg) meta.target
// no existe y el índice viene en meta.driverAdapterError.cause.constraint.{index,fields}
// (verificado contra la base en AUTH-01).
const extraerTarget = (meta: unknown): readonly string[] => {
  const datos = comoObjeto(meta)
  if (!datos) return []

  const clasico = comoTextos(datos.target)
  if (clasico.length > 0) return clasico

  const causa = comoObjeto(comoObjeto(datos.driverAdapterError)?.cause)
  const restriccion = comoObjeto(causa?.constraint)
  if (!restriccion) return []
  return [...comoTextos(restriccion.index), ...comoTextos(restriccion.fields)]
}

// Código SQLSTATE de PostgreSQL que el driver adapter adjunta al error (Prisma 7 lo envuelve en un
// P2xxx genérico: un texto con el carácter nulo llega como P2039 con originalCode 22021).
const codigoDePostgres = (meta: unknown): string | undefined => {
  const causa = comoObjeto(comoObjeto(comoObjeto(meta)?.driverAdapterError)?.cause)
  const codigo = causa?.originalCode ?? causa?.code
  return typeof codigo === "string" ? codigo : undefined
}

// 22021: secuencia de bytes inválida para UTF-8 (por ejemplo, el carácter nulo en un texto).
const SECUENCIA_INVALIDA = "22021"

// Único lugar del backend que conoce los códigos P2xxx (AGENTS.md, regla 1 y "Manejo de errores").
// P2002 = violación de unicidad: alDuplicar decide el AppError según las columnas o el índice
// afectados. 22021 = texto que PostgreSQL no puede guardar: es entrada inválida (400), no un 500.
// Cualquier otro error se relanza tal cual para que el envoltorio responda 500.
export const traducirErrorPrisma = (
  error: unknown,
  { alDuplicar }: { alDuplicar: (target: readonly string[]) => AppError },
): never => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) throw error
  if (error.code === "P2002") throw alDuplicar(extraerTarget(error.meta))
  if (codigoDePostgres(error.meta) === SECUENCIA_INVALIDA) {
    throw new AppError("VALIDACION", "Los datos enviados tienen caracteres no permitidos.", 400)
  }
  throw error
}
