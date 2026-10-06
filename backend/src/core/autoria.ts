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
