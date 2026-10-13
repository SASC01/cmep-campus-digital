import type { AppError } from "./errores.js"

// ENTREGAS-01 (P-05 a): la versión que trae la petición debe ser la de la fila ya bloqueada. Si otra
// persona guardó antes, la fila tiene otra versión y la petición no escribe nada. La usan editarTarea
// (01a) y, en CALIFICACIONES, calificar. La comparación es numérica (-0 y 0 son la misma versión).
export const exigirVersion = (
  { leida, actual }: { leida: number; actual: number },
  error: () => AppError,
): void => {
  if (leida === actual) return
  throw error()
}
