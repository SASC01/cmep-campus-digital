// Puras (§D-5). El recordatorio de 24 h es un trabajo diferido de la cola.

const VEINTICUATRO_HORAS_MS = 24 * 60 * 60 * 1000

// fecha_limite − 24 h, o null si ese momento no es posterior a `ahora` (no se programa: ARCHITECTURE
// §10; un recordatorio a menos de 24 h ya no tiene sentido).
export const momentoDelRecordatorio = (fechaLimite: Date, ahora: Date): Date | null => {
  const momento = new Date(fechaLimite.getTime() - VEINTICUATRO_HORAS_MS)
  return momento.getTime() > ahora.getTime() ? momento : null
}

export interface PlanDeRecordatorio {
  // Id del trabajo vivo que hay que cancelar, si hay.
  cancelar: string | null
  // Cuándo programar el nuevo, si hay que programar.
  programarEn: Date | null
}

// Qué hacer con los trabajos al editar (o borrar) una tarea. Con la misma fecha (en milisegundos) no
// se toca nada; con otra, se cancela el trabajo actual si existe y se programa uno nuevo si su
// momento es futuro. `fechaNueva: null` es borrar: solo cancelar, si hay.
export const planDeRecordatorio = ({
  fechaAnterior,
  fechaNueva,
  trabajoActual,
  ahora,
}: {
  fechaAnterior: Date | null
  fechaNueva: Date | null
  trabajoActual: string | null
  ahora: Date
}): PlanDeRecordatorio => {
  if (fechaNueva === null) return { cancelar: trabajoActual, programarEn: null }
  if (fechaAnterior !== null && fechaAnterior.getTime() === fechaNueva.getTime()) {
    return { cancelar: null, programarEn: null }
  }
  return { cancelar: trabajoActual, programarEn: momentoDelRecordatorio(fechaNueva, ahora) }
}
