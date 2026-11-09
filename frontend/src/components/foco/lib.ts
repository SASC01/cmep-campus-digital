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

// ADMIN-01f (§D-11, Enmienda 14): movida sin cambios desde features/clases/lib.ts, que la reexporta.
// true si el foco se perdió: ningún elemento, <body> o uno que ya no está en el documento. Recibe el
// documento en lugar de leer el global, así que es pura respecto de su entrada (§D-C5 bis).
export const focoPerdido = (documento: Pick<Document, "activeElement" | "body">): boolean => {
  const activo = documento.activeElement
  return activo === null || activo === documento.body || !activo.isConnected
}
