// FORO-01a (§D-2.3, §D-2.4). Una actividad es una tarea o un foro: los dos guardan su fila en tareas y
// reutilizan los mismos códigos de error. Solo cambia el texto que lee la persona. Con "tarea", cada
// texto es el de siempre, letra por letra.

export type Actividad = "tarea" | "foro"

export interface TextosDeActividad {
  categoriaRequerida: string
  tareaModificada: string
  entregaModificada: string
  rubricaModificada: string
  entregaNoCalificable: string
  tareaConCalificaciones: string
  tareaNoEncontrada: string
  // TAREA_CON_ENTREGAS, en singular o plural según el número de alumnos con entrega o calificación.
  conEntregasAlAdmin: (entregas: number) => string
  conEntregasAlMaestro: (entregas: number) => string
}

const alumnosCon = (entregas: number, que: string): string =>
  entregas === 1 ? `1 alumno con ${que}` : `${String(entregas)} alumnos con ${que}`

export const TEXTOS_POR_ACTIVIDAD: Readonly<Record<Actividad, TextosDeActividad>> = {
  tarea: {
    categoriaRequerida: "Elige la categoría de la tarea.",
    tareaModificada:
      "Otra persona guardó cambios en esta tarea mientras la editabas. Tus cambios no se guardaron: vuelve a hacerlos sobre la versión actual.",
    entregaModificada:
      "La entrega cambió mientras la calificabas: el alumno la anuló o la volvió a entregar, u otra persona la calificó. No se guardó tu calificación; revisa la entrega actual.",
    rubricaModificada:
      "La rúbrica o los puntos de la tarea cambiaron mientras calificabas. No se guardó tu calificación; vuelve a calificar con la versión actual.",
    entregaNoCalificable:
      "Este alumno todavía puede entregar. Podrás calificarlo cuando entregue o cuando se cierre la entrega.",
    tareaConCalificaciones:
      "Esta tarea ya tiene calificaciones: no puedes cambiar sus puntos ni su rúbrica. Lo demás sí se puede editar.",
    tareaNoEncontrada: "Esa tarea ya no existe.",
    conEntregasAlAdmin: (entregas) => {
      const cuales =
        entregas === 1 ? "su entrega, su calificación" : "sus entregas, sus calificaciones"
      return `Esta tarea tiene ${alumnosCon(entregas, "entrega o calificación")}. Si la borras, también se borrarán ${cuales} y los comentarios privados, y no se puede deshacer.`
    },
    conEntregasAlMaestro: (entregas) =>
      `Esta tarea tiene ${alumnosCon(entregas, "entrega o calificación")} y no se puede borrar. Si de verdad hay que borrarla, pídelo a administración.`,
  },
  foro: {
    categoriaRequerida: "Elige la categoría del foro.",
    tareaModificada:
      "Otra persona guardó cambios en este foro mientras lo editabas. Tus cambios no se guardaron: vuelve a hacerlos sobre la versión actual.",
    entregaModificada:
      "La participación cambió mientras la calificabas: el alumno la publicó u otra persona la calificó. No se guardó tu calificación; revisa la participación actual.",
    rubricaModificada:
      "La rúbrica o los puntos del foro cambiaron mientras calificabas. No se guardó tu calificación; vuelve a calificar con la versión actual.",
    entregaNoCalificable:
      "Este alumno todavía puede participar. Podrás calificarlo cuando participe o cuando se cierre el foro.",
    tareaConCalificaciones:
      "Este foro ya tiene calificaciones: no puedes cambiar sus puntos ni su rúbrica. Lo demás sí se puede editar.",
    tareaNoEncontrada: "Ese foro ya no existe.",
    // "sus" son las del foro: el texto no cambia con el número de alumnos, salvo la cuenta.
    conEntregasAlAdmin: (entregas) =>
      `Este foro tiene ${alumnosCon(entregas, "participación o calificación")}. Si lo borras, también se borrarán sus participaciones, sus réplicas y sus calificaciones, y no se puede deshacer.`,
    conEntregasAlMaestro: (entregas) =>
      `Este foro tiene ${alumnosCon(entregas, "participación o calificación")} y no se puede borrar. Si de verdad hay que borrarlo, pídelo a administración.`,
  },
}
