import type { QueryObserverResult } from "@tanstack/react-query"

// CALIFICACIONES-01d (§D-13.1, A-4): movido sin cambios desde features/tareas/types.ts, que lo
// reexporta. T-15: lo que la clave de foco de una vista lee de su consulta (inferido del resultado de
// TanStack Query, no declarado a mano).
export type MomentoDeLaConsulta = Pick<
  QueryObserverResult,
  "status" | "dataUpdatedAt" | "errorUpdatedAt" | "errorUpdateCount"
>
