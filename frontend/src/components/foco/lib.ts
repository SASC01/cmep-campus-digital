import type { MomentoDeLaConsulta } from "./types"

// CALIFICACIONES-01d (§D-13.1, A-4): el cuerpo de claveDeFocoDeLaTarea de features/tareas/lib.ts, que
// la reexporta con su nombre. T-09, T-14 y T-15: la clave con que una vista le dice a
// useFocoAlPerderseElControl que pudo cambiar. Cambia con cada respuesta y con cada fallo nuevo
// (también con dos fallos seguidos, aunque el estado siga en error y caigan en el mismo milisegundo):
// un fallo que conserva la vista seguido de otro que la reemplaza vuelve a evaluar el foco.
export const claveDeFocoDeLaConsulta = (id: string, consulta: MomentoDeLaConsulta): string =>
  [
    id,
    consulta.status,
    consulta.dataUpdatedAt,
    consulta.errorUpdatedAt,
    consulta.errorUpdateCount,
  ].join(":")
