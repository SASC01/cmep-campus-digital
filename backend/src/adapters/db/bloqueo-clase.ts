import { AppError } from "../../core/errores.js"
import type { Prisma } from "./generated/client.js"

const sinAcceso = (): AppError =>
  new AppError("SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.", 403)

// §D-2A4, paso 1 (CLASES-02), movido aquí sin cambios en TAREAS-01a (A-5) para compartirlo con
// temas y categorías (§D-7): el candado de la fila de la clase sin SQL crudo. Un updateMany de
// actualizado_en toma FOR NO KEY UPDATE (no es columna de llave), así que pone en serie las
// operaciones simultáneas de la misma clase y no choca con los FOR KEY SHARE de las FK. count = 0:
// la clase se borró después del sexto paso.
export const bloquearClase = async (
  tx: Prisma.TransactionClient,
  claseId: string,
): Promise<void> => {
  const { count } = await tx.clase.updateMany({
    where: { id: claseId },
    data: { actualizadoEn: new Date() },
  })
  if (count === 0) throw sinAcceso()
}
