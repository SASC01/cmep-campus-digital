import { obtenerDb, type Ejecutor } from "./cliente.js"

// ADMIN-01b (§D-5, M-03). Las filas de archivos de una clase duplicada cuyo objeto falta copiar
// (copia_de no nulo). El worker de COPIAR_OBJETOS hace una sola lectura por trabajo, copia en el
// almacén y después escribe en lote lo hecho: ninguna consulta dentro de su ciclo.

export interface CopiaPendiente {
  id: string
  claveObjeto: string
  // La clave del archivo original, o null si su fila ya no existe.
  claveOriginal: string | null
}

// Una sola sentencia: las copias que siguen confirmadas y en curso, cada una con la clave de su
// original (por su PK). Las demás (terminadas, descartadas o inexistentes) no salen: idempotencia.
export const leerCopiasPendientes = async (
  archivoIds: readonly string[],
  ejecutor: Ejecutor = obtenerDb(),
): Promise<CopiaPendiente[]> => {
  if (archivoIds.length === 0) return []
  return ejecutor.$queryRaw<CopiaPendiente[]>`
    SELECT copia.id::text AS id,
           copia.clave_objeto AS "claveObjeto",
           original.clave_objeto AS "claveOriginal"
    FROM archivos copia
    LEFT JOIN archivos original ON original.id = copia.copia_de
    WHERE copia.id = ANY(${[...archivoIds]}::uuid[])
      AND copia.estado = 'confirmado'
      AND copia.copia_de IS NOT NULL
    ORDER BY copia.id`
}

// Las copias terminadas dejan de estar en curso. Devuelve cuántas cambió.
export const terminarCopias = async (
  ids: readonly string[],
  ejecutor: Ejecutor = obtenerDb(),
): Promise<number> => {
  if (ids.length === 0) return 0
  const { count } = await ejecutor.archivo.updateMany({
    where: { id: { in: [...ids] }, copiaDe: { not: null } },
    data: { copiaDe: null },
  })
  return count
}

// Las copias que ya no se pueden hacer (el original no existe, o la cola de fallidos las recibió)
// pasan a descartado, sin publicación y sin copia en curso (el CHECK de un solo contexto y
// archivos_copia_solo_confirmado lo exigen). Devuelve cuántas cambió.
export const descartarCopias = async (
  ids: readonly string[],
  ejecutor: Ejecutor = obtenerDb(),
): Promise<number> => {
  if (ids.length === 0) return 0
  const { count } = await ejecutor.archivo.updateMany({
    where: { id: { in: [...ids] }, copiaDe: { not: null } },
    data: { estado: "descartado", publicacionId: null, copiaDe: null },
  })
  return count
}
