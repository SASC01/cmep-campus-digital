import type { BloqueDeRecurso } from "@campus/shared"

import type { ParticipanteDeAutoria } from "./autoria.js"
import { AppError } from "./errores.js"

// CLASES-03a (§D-2, RN-07 a RN-09). Reglas de los recursos: publicaciones de tipo material con su
// bloque. Reciben a las personas enteras (Enmienda 1, M-02) para que ningún archivo fuera de core/
// lea ni compare un rol. Que el actor sea de la clase lo garantiza la cadena (sexto paso).
export type Bloque = BloqueDeRecurso

// S-01: el bloque de un recurso nuevo es el del rol de quien lo publica. Solo publican maestros y
// admin: un estudiante aquí es un error del servidor, nunca un bloque por defecto.
export const bloqueAlPublicar = (autor: ParticipanteDeAutoria): Bloque => {
  if (autor.rol === "admin") return "aprendizaje"
  if (autor.rol === "maestro") return "docente"
  throw new AppError("ERROR_INTERNO", "Solo un maestro o la administración publica recursos.", 500)
}

// DH-02 (a): el bloque guardado o, si es nulo (un backend anterior o una inserción a mano), el del
// rol de su autor con la misma regla del reparto de la migración: admin, aprendizaje; los demás,
// docente.
export const bloqueEfectivo = (bloque: Bloque | null, autor: ParticipanteDeAutoria): Bloque => {
  if (bloque !== null) return bloque
  if (autor.rol === "admin") return "aprendizaje"
  return "docente"
}

// RN-07 y S-02: los de aprendizaje, solo el admin; los del docente, solo su autor (el admin no
// edita lo de un maestro, solo lo borra).
export const puedeEditarRecurso = (
  actor: ParticipanteDeAutoria,
  autor: ParticipanteDeAutoria,
  bloque: Bloque,
): boolean => {
  if (bloque === "aprendizaje") return actor.rol === "admin"
  return actor.id === autor.id
}

// RN-07: el admin, cualquiera; los de aprendizaje, nadie más; los del docente, su autor. Nunca un
// maestro lo de otro.
export const puedeBorrarRecurso = (
  actor: ParticipanteDeAutoria,
  autor: ParticipanteDeAutoria,
  bloque: Bloque,
): boolean => {
  if (actor.rol === "admin") return true
  if (bloque === "aprendizaje") return false
  return actor.id === autor.id
}

// P-05 y S-03: mover organiza la clase. Los de aprendizaje, solo el admin; los del docente,
// cualquier maestro de la clase o el admin; un estudiante, nunca.
export const puedeMoverRecurso = (actor: ParticipanteDeAutoria, bloque: Bloque): boolean => {
  if (actor.rol === "admin") return true
  if (bloque === "aprendizaje") return false
  return actor.rol === "maestro"
}
