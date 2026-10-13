import type { CalificacionDb, EntregaDeAlumnoDb, MiEntregaDb } from "../adapters/db/index.js"
import type { Almacen } from "../core/archivos/almacen.js"
import { adjuntosParaResponder } from "./adjuntos.js"

// CALIFICACIONES-01a (§D-5). Las respuestas de una entrega, compartidas por handlers/tareas/entregas.ts
// y handlers/calificaciones.ts. Fechas en ISO 8601 (regla 7). La clave del objeto nunca sale
// (adjuntosParaResponder). Ninguna lleva correo, estado de pago ni restricción (RN-02).

export const calificacionParaResponder = (calificacion: CalificacionDb | null) =>
  calificacion === null
    ? null
    : {
        puntos: calificacion.puntos,
        sobre: calificacion.sobre,
        fecha: calificacion.fecha.toISOString(),
        puntajes: calificacion.puntajes.map((puntaje) => ({
          criterioId: puntaje.criterioId,
          criterio: puntaje.criterio,
          puntosMax: puntaje.puntosMax,
          puntos: puntaje.puntos,
        })),
      }

// La entrega del alumno (S-11): sin version ni id de la fila, y sin la tarea con que se decidió.
export const miEntregaParaResponder = async (almacen: Almacen | null, entrega: MiEntregaDb) => ({
  entrega: {
    estado: entrega.estado,
    fechaEntrega: entrega.fechaEntrega === null ? null : entrega.fechaEntrega.toISOString(),
    conRetraso: entrega.conRetraso,
    enlaces: entrega.enlaces,
    adjuntos: await adjuntosParaResponder(almacen, entrega.adjuntos),
    puedeEntregar: entrega.puedeEntregar,
    puedeAnular: entrega.puedeAnular,
    calificacion: calificacionParaResponder(entrega.calificacion),
  },
})

// La entrega de un alumno para los maestros de la clase y el admin (S-05, S-11): el alumno solo con id
// y nombre, y la version que exige calificar.
export const entregaDeAlumnoParaResponder = async (
  almacen: Almacen | null,
  entrega: EntregaDeAlumnoDb,
) => ({
  entrega: {
    alumno: entrega.alumno,
    estado: entrega.estado,
    fechaEntrega: entrega.fechaEntrega === null ? null : entrega.fechaEntrega.toISOString(),
    conRetraso: entrega.conRetraso,
    enlaces: entrega.enlaces,
    adjuntos: await adjuntosParaResponder(almacen, entrega.adjuntos),
    version: entrega.version,
    calificacion: calificacionParaResponder(entrega.calificacion),
  },
})
