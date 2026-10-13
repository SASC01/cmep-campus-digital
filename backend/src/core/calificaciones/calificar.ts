import { esTarde, type EstadoEntrega } from "../entregas/entregas.js"
import { AppError } from "../errores.js"

// CALIFICACIONES-01a (§D-2.1). Reglas puras de calificar una entrega. El adaptador las llama dentro de
// la transacción, con la tarea bloqueada (FOR SHARE) y la fila de la entrega bloqueada; ninguna
// escribe. Los cálculos se hacen en centésimas enteras (§D-0.8).

export interface CriterioParaCalificar {
  id: string
  criterio: string
  puntosMax: number
}

export interface PuntajeEnviado {
  criterioId: string
  puntos: number
}

export interface CalificacionDecidida {
  // Ya redondeada a centésimas.
  calificacion: number
  // En el orden de los criterios; [] sin rúbrica.
  puntajes: { criterioId: string; puntos: number }[]
}

// §D-10.
export const entregaModificada = (): AppError =>
  new AppError(
    "ENTREGA_MODIFICADA",
    "La entrega cambió mientras la calificabas: el alumno la anuló o la volvió a entregar, u otra persona la calificó. No se guardó tu calificación; revisa la entrega actual.",
    409,
  )

export const rubricaModificada = (): AppError =>
  new AppError(
    "RUBRICA_MODIFICADA",
    "La rúbrica o los puntos de la tarea cambiaron mientras calificabas. No se guardó tu calificación; vuelve a calificar con la versión actual.",
    409,
  )

// P-03 (c′): el texto habla del cierre de la entrega, no solo de la fecha límite.
export const entregaNoCalificable = (): AppError =>
  new AppError(
    "ENTREGA_NO_CALIFICABLE",
    "Este alumno todavía puede entregar. Podrás calificarlo cuando entregue o cuando se cierre la entrega.",
    409,
  )

export const tareaConCalificaciones = (): AppError =>
  new AppError(
    "TAREA_CON_CALIFICACIONES",
    "Esta tarea ya tiene calificaciones: no puedes cambiar sus puntos ni su rúbrica. Lo demás sí se puede editar.",
    409,
  )

const validacion = (mensaje: string): AppError => new AppError("VALIDACION", mensaje, 400)

const aCentesimas = (n: number): number => Math.round(n * 100)

// Cociente de dos enteros no negativos redondeado al entero más cercano, con las mitades hacia arriba,
// sin pasar por un float: floor((2n + d) / 2d).
const cocienteRedondeado = (numerador: number, denominador: number): number =>
  Math.floor((2 * numerador + denominador) / (2 * denominador))

// RN-05: la suma de los puntos por criterio, escalada a los puntos de la tarea. En centésimas:
// round(Σ puntos_c × puntosDeLaTarea / Σ puntosMax), con las mitades hacia arriba. Sin rúbrica no se
// usa (una rúbrica sin criterios es inalcanzable: cada criterio vale al menos 1 punto).
export const escalarALaTarea = ({
  puntos,
  maximos,
  puntosDeLaTarea,
}: {
  puntos: readonly number[]
  maximos: readonly number[]
  puntosDeLaTarea: number
}): number => {
  const sumaDeMaximos = maximos.reduce((suma, maximo) => suma + maximo, 0)
  if (sumaDeMaximos <= 0) {
    throw new AppError("ERROR_INTERNO", "La rúbrica no tiene puntos máximos.", 500)
  }
  const sumaEnCentesimas = puntos.reduce((suma, valor) => suma + aCentesimas(valor), 0)
  return cocienteRedondeado(sumaEnCentesimas * puntosDeLaTarea, sumaDeMaximos) / 100
}

// La forma del cuerpo frente a la tarea vigente (paso 1 de decidirCalificacion).
const formaCorresponde = ({
  criterios,
  puntajes,
  calificacionDirecta,
}: {
  criterios: readonly CriterioParaCalificar[]
  puntajes: readonly PuntajeEnviado[]
  calificacionDirecta: number | null
}): boolean => {
  if (criterios.length === 0) return puntajes.length === 0 && calificacionDirecta !== null
  if (calificacionDirecta !== null) return false
  if (puntajes.length !== criterios.length) return false
  const enviados = new Set(puntajes.map((puntaje) => puntaje.criterioId))
  if (enviados.size !== puntajes.length) return false
  return criterios.every((criterio) => enviados.has(criterio.id))
}

// Lanza, en este orden (§D-2.2):
// 0. (Enmienda 1, M-02) RUBRICA_MODIFICADA si puntosVistos no son los puntos de la tarea bloqueada.
// 1. RUBRICA_MODIFICADA si la forma del cuerpo no corresponde a la tarea vigente: con rúbrica,
//    calificacionDirecta null y exactamente los criterios de la rúbrica; sin rúbrica, puntajes [] y
//    una calificación directa.
// 2. VALIDACION si un valor sale de rango ("puntajes.<i>.puntos: …" con la posición del cuerpo, o
//    "calificacion: …").
// Devuelve la calificación (escalada con rúbrica; la directa tal cual) y los puntajes en el orden de
// la rúbrica.
export const decidirCalificacion = ({
  criterios,
  puntosDeLaTarea,
  puntosVistos,
  puntajes,
  calificacionDirecta,
}: {
  criterios: readonly CriterioParaCalificar[]
  puntosDeLaTarea: number
  puntosVistos: number
  puntajes: readonly PuntajeEnviado[]
  calificacionDirecta: number | null
}): CalificacionDecidida => {
  if (puntosVistos !== puntosDeLaTarea) throw rubricaModificada()
  if (!formaCorresponde({ criterios, puntajes, calificacionDirecta })) throw rubricaModificada()

  if (criterios.length === 0) {
    const directa = calificacionDirecta ?? Number.NaN
    if (!(directa >= 0 && directa <= puntosDeLaTarea)) {
      throw validacion(`calificacion: Escribe de 0 a ${String(puntosDeLaTarea)} puntos.`)
    }
    return { calificacion: directa, puntajes: [] }
  }

  const maximoDe = new Map(criterios.map((criterio) => [criterio.id, criterio.puntosMax]))
  puntajes.forEach((puntaje, posicion) => {
    const maximo = maximoDe.get(puntaje.criterioId) ?? 0
    if (!(puntaje.puntos >= 0 && puntaje.puntos <= maximo)) {
      throw validacion(
        `puntajes.${String(posicion)}.puntos: Escribe de 0 a ${String(maximo)} puntos.`,
      )
    }
  })

  const puntosDe = new Map(puntajes.map((puntaje) => [puntaje.criterioId, puntaje.puntos]))
  const ordenados = criterios.map((criterio) => ({
    criterioId: criterio.id,
    puntos: puntosDe.get(criterio.id) ?? 0,
  }))
  return {
    calificacion: escalarALaTarea({
      puntos: ordenados.map((puntaje) => puntaje.puntos),
      maximos: criterios.map((criterio) => criterio.puntosMax),
      puntosDeLaTarea,
    }),
    puntajes: ordenados,
  }
}

// P-03 (c′), Enmienda 1: entregado o calificado, siempre; asignado (o sin fila), solo con la entrega
// cerrada: la fecha límite vencida y la tarea que no acepta tardías (la misma regla que entregaCerrada
// de core/entregas, que además pide requiereAdjuntos, que el cierre no mira). Si no,
// ENTREGA_NO_CALIFICABLE.
export const exigirEntregaCalificable = ({
  estado,
  tarea,
  ahora,
}: {
  estado: EstadoEntrega
  tarea: { fechaLimite: Date; aceptaTardias: boolean }
  ahora: Date
}): void => {
  if (estado !== "asignado") return
  if (!tarea.aceptaTardias && esTarde(tarea.fechaLimite, ahora)) return
  throw entregaNoCalificable()
}

// P-04 (a), con N-02 (Enmienda 1). Rúbrica idéntica: mismo número de criterios y, en orden, el mismo
// texto y los mismos puntos máximos. Con calificadas y puntos distintos o una rúbrica que no es
// idéntica: TAREA_CON_CALIFICACIONES. Si no lanza, una rúbrica idéntica nunca se reemplaza (los ids
// se conservan); una distinta, sin calificaciones, sí (S-04 de TAREAS-01). Nunca escribe.
export const exigirRubricaCongelada = ({
  calificadas,
  puntosActuales,
  puntosNuevos,
  rubricaActual,
  rubricaNueva,
}: {
  calificadas: number
  puntosActuales: number
  puntosNuevos: number
  rubricaActual: readonly { criterio: string; puntosMax: number }[]
  rubricaNueva: readonly { criterio: string; puntosMax: number }[]
}): { reemplazarRubrica: boolean } => {
  const rubricaIdentica =
    rubricaActual.length === rubricaNueva.length &&
    rubricaActual.every((actual, i) => {
      const nuevo = rubricaNueva[i]
      return (
        nuevo !== undefined &&
        nuevo.criterio === actual.criterio &&
        nuevo.puntosMax === actual.puntosMax
      )
    })
  if (calificadas > 0 && (puntosActuales !== puntosNuevos || !rubricaIdentica)) {
    throw tareaConCalificaciones()
  }
  return { reemplazarRubrica: !rubricaIdentica }
}
