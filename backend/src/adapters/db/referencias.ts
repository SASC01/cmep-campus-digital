import type { Prisma } from "./generated/client.js"

// TAREAS-01a (§D-7, Enmienda 1, M-03 a). Las únicas lecturas FOR KEY SHARE del proyecto: bloquean la
// fila de un tema o de una categoría de la clase mientras una transacción la usa como referencia (una
// publicación, una tarea). Así, un guardado de categorías que la quita espera a que esa transacción
// confirme y después cuenta sus tareas; y si el borrado confirmó antes, la lectura no ve la fila.
// Nunca un P2003 ni un 500 por una referencia que desapareció. SQL etiquetado y parametrizado; el
// filtro por clase_id hace que un id de otra clase sea "no encontrado". Devuelven false si no hay
// fila; el llamador traduce a 404. No se reexportan en index.ts: solo las usan los repositorios.

export const bloquearTemaParaUsar = async (
  tx: Prisma.TransactionClient,
  { temaId, claseId }: { temaId: string; claseId: string },
): Promise<boolean> => {
  const filas = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM temas
    WHERE id = ${temaId}::uuid AND clase_id = ${claseId}::uuid
    FOR KEY SHARE`
  return filas.length > 0
}

export const bloquearCategoriaParaUsar = async (
  tx: Prisma.TransactionClient,
  { categoriaId, claseId }: { categoriaId: string; claseId: string },
): Promise<boolean> => {
  const filas = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM categorias
    WHERE id = ${categoriaId}::uuid AND clase_id = ${claseId}::uuid
    FOR KEY SHARE`
  return filas.length > 0
}
