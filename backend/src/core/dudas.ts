import type { RelacionConClase } from "./clases/pertenencia.js"

// CLASES-03b (§D-5, P-07). Marcan una duda como resuelta los maestros de la clase y el admin; nunca un
// estudiante, tampoco su autor. Que la persona sea de la clase lo garantiza la cadena (sexto paso).
// Borrar una duda o una respuesta usa puedeBorrar de core/autoria.ts sin cambio.
export const puedeMarcarDuda = (relacion: RelacionConClase): boolean =>
  relacion === "maestro" || relacion === "admin"
