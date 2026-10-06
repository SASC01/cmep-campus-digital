import { AppError } from "../errores.js"

export type RelacionConClase = "maestro" | "estudiante" | "admin"

export interface DatosDePertenencia {
  esMaestro: boolean
  inscrito: boolean
}

interface PerfilParaPertenencia {
  id: string
  rol: string
}

// Pura (§D-0.1, CLASES-02): decide la relación de un perfil con una clase a partir de una sola
// consulta (buscarDatosDePertenencia). El rol manda: un maestro solo es "maestro" si está asignado
// y un estudiante solo es "estudiante" si está inscrito; el admin es "admin" en cualquier clase que
// exista. null: la clase no existe (datos null), un maestro ajeno, un estudiante no inscrito, un
// rol desconocido o un dato imposible (maestro inscrito, estudiante asignado).
export const relacionConClase = (
  perfil: PerfilParaPertenencia,
  datos: DatosDePertenencia | null,
): RelacionConClase | null => {
  if (!datos) return null
  if (perfil.rol === "admin") return "admin"
  if (perfil.rol === "maestro" && datos.esMaestro && !datos.inscrito) return "maestro"
  if (perfil.rol === "estudiante" && datos.inscrito && !datos.esMaestro) return "estudiante"
  return null
}

const errorSinAcceso = (): AppError =>
  new AppError("SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.", 403)

// Con "propiedad", pasan "maestro" y "admin"; con "inscripcion", cualquier relación no nula. La
// relación "admin" solo cuenta si la ruta lo admite (admiteAdmin, calculado de sus `roles`): cerrado
// por defecto (Enmienda 1, M-01).
export const evaluarPertenencia = (
  relacion: RelacionConClase | null,
  exigencia: "inscripcion" | "propiedad",
  admiteAdmin: boolean,
): AppError | null => {
  if (relacion === null) return errorSinAcceso()
  if (relacion === "admin" && !admiteAdmin) return errorSinAcceso()
  if (exigencia === "propiedad" && relacion === "estudiante") return errorSinAcceso()
  return null
}
