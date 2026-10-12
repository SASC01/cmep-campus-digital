import { FIRMA_ADMINISTRACION } from "@campus/shared"

// TAREAS-01c (§D-9, Enmienda 3). Textos de lo que comparten `features/clases` y `features/tareas` de
// una clase: el de ConClaseDeLaRuta (antes TEXTOS_CLASE.sinAcceso) y el de la firma de la
// administración (antes en TEXTOS_MURO, §D-2C4: sale de shared/, nunca de autor.nombre).
export const TEXTOS_DE_LA_CLASE = {
  sinAcceso: "No tienes acceso a esta clase.",
  firmaAdministracion: FIRMA_ADMINISTRACION,
  // ENTREGAS-01a (O-2 de TAREAS-01d): "Sin tema", el mismo texto en features/clases y features/tareas.
  sinTema: "Sin tema",
} as const
