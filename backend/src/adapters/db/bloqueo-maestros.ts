import type { Prisma } from "./generated/client.js"

// ADMIN-01b (§D-5 paso 2, §D-7.9, N-03). Toma en modo compartido, en orden de id, las filas de los
// maestros activos de la lista y devuelve sus ids. Queda en serie con la baja de un maestro (que toma
// su fila para escribir): en READ COMMITTED, si la baja confirmó mientras se esperaba, la fila ya no
// cumple `activo` y no sale. El orden fijo evita un ciclo entre dos escrituras con los mismos maestros.
export const bloquearMaestrosActivos = async (
  tx: Prisma.TransactionClient,
  ids: readonly string[],
): Promise<string[]> => {
  if (ids.length === 0) return []
  const filas = await tx.$queryRaw<{ id: string }[]>`
    SELECT id::text AS id
    FROM usuarios
    WHERE id = ANY(${[...ids]}::uuid[]) AND rol = 'maestro' AND activo
    ORDER BY id
    FOR SHARE`
  return filas.map((fila) => fila.id)
}
