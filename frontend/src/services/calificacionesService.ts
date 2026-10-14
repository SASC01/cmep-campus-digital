import type { FiltroDeMisCalificaciones } from "@campus/shared"

// CALIFICACIONES-01c (§D-12.1). Claves de las calificaciones de una clase, compartidas por
// features/tareas (que las marca viejas al calificar) y features/calificaciones. Cuelgan de
// ["clases", claseId, …] como las de trabajoService.ts, y el prefijo alcanza el gradebook y
// "Mis calificaciones".
export const clavePrefijoDeCalificaciones = (claseId: string) =>
  ["clases", claseId, "calificaciones"] as const

// La ventana del gradebook: el cursor de alumnos y el de tareas (null en la primera).
export const claveGradebook = (
  claseId: string,
  ventana: { cursor: string | null; cursorTareas: string | null },
) =>
  [
    ...clavePrefijoDeCalificaciones(claseId),
    "gradebook",
    ventana.cursor,
    ventana.cursorTareas,
  ] as const

export const claveMisCalificaciones = (claseId: string, filtro: FiltroDeMisCalificaciones) =>
  [...clavePrefijoDeCalificaciones(claseId), "mis-calificaciones", filtro] as const
