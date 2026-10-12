import type { RelacionConClase } from "../clases/pertenencia.js"
import { AppError } from "../errores.js"

// ENTREGAS-01b (§D-3.1). Reglas puras de la entrega de un alumno. Estados guardados: asignado (o sin
// fila), entregado y calificado (solo CALIFICACIONES lo escribirá). "Sin entregar" no se guarda: es
// asignado con la fecha límite vencida. El adaptador las llama dentro de la transacción, con la tarea
// y la fila de la entrega ya bloqueadas; el handler, para la subida de archivos (S-10).

export type EstadoEntrega = "asignado" | "entregado" | "calificado"

export interface TareaParaEntregar {
  fechaLimite: Date
  aceptaTardias: boolean
  requiereAdjuntos: boolean
}

export const entregaYaRealizada = (): AppError =>
  new AppError(
    "ENTREGA_YA_REALIZADA",
    "Ya entregaste esta tarea. Si quieres cambiarla, anula tu entrega primero.",
    409,
  )

export const entregaNoRealizada = (): AppError =>
  new AppError("ENTREGA_NO_REALIZADA", "No tienes una entrega que anular.", 409)

export const entregaCalificada = (): AppError =>
  new AppError("ENTREGA_CALIFICADA", "Tu entrega ya está calificada y no se puede cambiar.", 409)

export const entregaCerradaError = (): AppError =>
  new AppError(
    "ENTREGA_CERRADA",
    "La fecha límite ya pasó y esta tarea no acepta entregas con retraso.",
    409,
  )

export const entregaVacia = (): AppError =>
  new AppError("ENTREGA_VACIA", "Agrega al menos un archivo o un enlace para entregar.", 400)

// El código ya existe en shared/src/clases.ts (CODIGOS_CLASES): un :alumnoId que no es un alumno
// inscrito con cuenta activa en la clase (inexistente, de otra clase, dado de baja, desactivado o un
// maestro) responde igual.
export const alumnoNoEncontrado = (): AppError =>
  new AppError("ALUMNO_NO_ENCONTRADO", "No encontramos a ese alumno.", 404)

// RF-15 y RF-44 (S-03): tarde es después de la fecha límite; a tiempo, hasta su milisegundo inclusive.
export const esTarde = (fechaLimite: Date, ahora: Date): boolean =>
  ahora.getTime() > fechaLimite.getTime()

// P-02 (a): cerrada si la tarea no acepta tardías y ya es tarde. Se calcula en cada acción con la
// tarea vigente: mover la fecha límite a futuro o aceptar tardías la reabre.
export const entregaCerrada = (tarea: TareaParaEntregar, ahora: Date): boolean =>
  !tarea.aceptaTardias && esTarde(tarea.fechaLimite, ahora)

// Las reglas de entregar que no miran el contenido, en el orden de decidirEntrega. La usa también la
// subida de un archivo de entrega (S-10): sin ENTREGA_VACIA, porque los archivos llegan después.
export const exigirEntregaAbierta = ({
  tarea,
  estado,
  ahora,
}: {
  tarea: TareaParaEntregar
  estado: EstadoEntrega
  ahora: Date
}): void => {
  if (estado === "calificado") throw entregaCalificada()
  if (estado === "entregado") throw entregaYaRealizada()
  if (entregaCerrada(tarea, ahora)) throw entregaCerradaError()
}

// Lanza ENTREGA_CALIFICADA, ENTREGA_YA_REALIZADA, ENTREGA_CERRADA y ENTREGA_VACIA (vacía solo si la
// tarea requiere adjuntos; P-03 a), en ese orden. Devuelve si la entrega queda con retraso.
export const decidirEntrega = ({
  tarea,
  estado,
  archivos,
  enlaces,
  ahora,
}: {
  tarea: TareaParaEntregar
  estado: EstadoEntrega
  archivos: number
  enlaces: number
  ahora: Date
}): { conRetraso: boolean } => {
  exigirEntregaAbierta({ tarea, estado, ahora })
  if (tarea.requiereAdjuntos && archivos + enlaces === 0) throw entregaVacia()
  return { conRetraso: esTarde(tarea.fechaLimite, ahora) }
}

// Lanza ENTREGA_NO_REALIZADA, ENTREGA_CALIFICADA y ENTREGA_CERRADA (P-02 a), en ese orden.
export const decidirAnulacion = ({
  tarea,
  estado,
  ahora,
}: {
  tarea: TareaParaEntregar
  estado: EstadoEntrega
  ahora: Date
}): void => {
  if (estado === "asignado") throw entregaNoRealizada()
  if (estado === "calificado") throw entregaCalificada()
  if (entregaCerrada(tarea, ahora)) throw entregaCerradaError()
}

// Lo que la interfaz puede ofrecer en este momento, sin lanzar: las mismas reglas de decidirEntrega
// (sin mirar el contenido) y de decidirAnulacion.
export const accionesDeEntrega = ({
  tarea,
  estado,
  ahora,
}: {
  tarea: TareaParaEntregar
  estado: EstadoEntrega
  ahora: Date
}): { puedeEntregar: boolean; puedeAnular: boolean } => {
  const cerrada = entregaCerrada(tarea, ahora)
  return {
    puedeEntregar: estado === "asignado" && !cerrada,
    puedeAnular: estado === "entregado" && !cerrada,
  }
}

// Enmienda 1 (M-02): de quién es la entrega que "Trabajo de clase" muestra. Es un dato de la
// respuesta (como puedeMoverElemento), no un permiso: el handler la llama con la relación que dejó el
// sexto paso y nunca compara la relación a mano.
export const alumnoDeLaRelacion = (relacion: RelacionConClase, perfilId: string): string | null =>
  relacion === "estudiante" ? perfilId : null
