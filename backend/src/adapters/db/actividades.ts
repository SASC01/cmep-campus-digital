import type { Actividad } from "../../core/actividades.js"
import type { Ejecutor } from "./cliente.js"

// FORO-01a (§D-3.3). Una tarea y un foro guardan su fila en tareas con el mismo id que su publicación;
// lo que los distingue es publicaciones.tipo. Las rutas de una tarea nunca aceptan un foro, ni al
// revés: los adaptadores comprueban el tipo con esta ayuda. El tipo de una publicación nunca cambia,
// así que leerlo sin bloqueo después del bloqueo de la fila de tareas no abre carreras: si la fila
// desaparece, el bloqueo ya devolvió null. Una sola sentencia por la PK de publicaciones.
export const esActividadDeTipo = async (
  db: Ejecutor,
  { id, claseId, tipo }: { id: string; claseId: string; tipo: Actividad },
): Promise<boolean> =>
  (await db.publicacion.findFirst({ where: { id, claseId, tipo }, select: { id: true } })) !== null
