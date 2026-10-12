import { FIRMA_ADMINISTRACION, type Rol } from "@campus/shared"

export interface ParticipanteDeAutoria {
  id: string
  rol: Rol
}

// P-01 (b) de CLASES-02: el admin borra todo; cada quien, lo suyo; el maestro, además, lo que
// escribió un estudiante (en una clase donde el sexto paso ya lo dejó pasar como maestro de la
// clase: que sea maestro de esa clase lo garantiza la cadena, no esta función). La identidad manda
// sobre el rol. La reutiliza TAREAS.
export const puedeBorrar = (
  actor: ParticipanteDeAutoria,
  autor: ParticipanteDeAutoria,
): boolean => {
  if (actor.rol === "admin") return true
  if (actor.id === autor.id) return true
  return actor.rol === "maestro" && autor.rol === "estudiante"
}

// §D-2B1: lo que publica el admin sale firmado "Administración" y el rol nunca sale.
export const firmaDelAutor = (autor: {
  id: string
  nombre: string
  rol: Rol
}): { id: string; nombre: string; administracion: boolean } => {
  if (autor.rol === "admin") {
    return { id: autor.id, nombre: FIRMA_ADMINISTRACION, administracion: true }
  }
  return { id: autor.id, nombre: autor.nombre, administracion: false }
}

// TAREAS-01b (P-04 b, S-09). La regla de autoría de las tareas, aparte de la del muro. Se aplica
// dentro de la transacción del cambio, después de bloquear la fila de la tarea; que el maestro sea de
// esa clase ya lo garantizó la cadena (sexto paso). `autorSigueEnLaClase` es si el autor sigue
// asignado a la clase como maestro (lectura por PK en la misma transacción).
//
// Un maestro retirado de la clase (CLASES-02) deja tareas que nadie podría corregir: mientras el
// autor siga, solo él las toca; si ya no está, cualquier maestro actual de la clase. Lo del admin,
// nunca un maestro.
const esTareaDeMaestroRetirado = (
  autor: ParticipanteDeAutoria,
  autorSigueEnLaClase: boolean,
): boolean => autor.rol === "maestro" && !autorSigueEnLaClase

// Editar: el autor siempre; un maestro, la de un maestro que ya no está en la clase; nadie más. El
// admin edita solo las suyas (S-09), aunque pueda borrar cualquiera.
export const puedeEditarTarea = (
  actor: ParticipanteDeAutoria,
  autor: ParticipanteDeAutoria,
  autorSigueEnLaClase: boolean,
): boolean => {
  if (actor.id === autor.id) return true
  return actor.rol === "maestro" && esTareaDeMaestroRetirado(autor, autorSigueEnLaClase)
}

// Borrar: el admin cualquiera; el autor la suya; un maestro, la de un maestro que ya no está en la
// clase; nunca la del admin.
export const puedeBorrarTarea = (
  actor: ParticipanteDeAutoria,
  autor: ParticipanteDeAutoria,
  autorSigueEnLaClase: boolean,
): boolean => {
  if (actor.rol === "admin") return true
  return puedeEditarTarea(actor, autor, autorSigueEnLaClase)
}
