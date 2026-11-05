import { AppError } from "../errores.js"
import type { RelacionConClase } from "./pertenencia.js"

// ADMIN-01a (§D-1, DH-01). Qué hace una ruta con :claseId cuando la clase está archivada:
// "lectura" la deja leer al maestro de la clase y al admin; "lectura-del-alumno" también al alumno
// inscrito; "gestion" es para las acciones del admin sobre la clase (archivar, restaurar…). Una
// ruta que no declara nada queda cerrada: 409 CLASE_ARCHIVADA para todos.
export type PoliticaDeClaseArchivada = "lectura" | "lectura-del-alumno" | "gestion"

export const errorClaseArchivada = (): AppError =>
  new AppError("CLASE_ARCHIVADA", "Esta clase está archivada: solo se puede consultar.", 409)

// Pura. Corre después de evaluarPertenencia: una clase inexistente, ajena o con un rol que la ruta
// no admite ya respondió 403, así que el 409 nunca revela que existe una archivada ajena.
export const evaluarClaseArchivada = (
  relacion: RelacionConClase,
  archivada: boolean,
  politica: PoliticaDeClaseArchivada | undefined,
): AppError | null => {
  if (!archivada) return null
  if (politica === undefined) return errorClaseArchivada()
  if (politica === "lectura" && relacion === "estudiante") return errorClaseArchivada()
  return null
}

// S-01: archivar una clase ya archivada no escribe.
export const errorAlArchivar = (archivadaEn: Date | null): AppError | null => {
  if (archivadaEn === null) return null
  return new AppError("CLASE_YA_ARCHIVADA", "Esta clase ya está archivada.", 409)
}

// S-01: restaurar una clase activa no escribe.
export const errorAlRestaurar = (archivadaEn: Date | null): AppError | null => {
  if (archivadaEn !== null) return null
  return new AppError("CLASE_NO_ARCHIVADA", "Esta clase no está archivada.", 409)
}
