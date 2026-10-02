import { AppError } from "../errores.js"

export type RelacionConClase = "maestro" | "estudiante"

export interface DatosDePertenencia {
  maestroId: string
  inscrito: boolean
}

interface PerfilParaPertenencia {
  id: string
  rol: string
}

// Pura (§D-0.1): decide la relación de un perfil con una clase a partir de una sola consulta
// (buscarDatosDePertenencia). null: la clase no existe (datos null), es un admin, un maestro ajeno
// o un estudiante no inscrito.
export const relacionConClase = (
  perfil: PerfilParaPertenencia,
  datos: DatosDePertenencia | null,
): RelacionConClase | null => {
  if (!datos) return null
  if (perfil.rol === "maestro" && datos.maestroId === perfil.id) return "maestro"
  if (perfil.rol === "estudiante" && datos.inscrito) return "estudiante"
  return null
}

const errorSinAcceso = (): AppError =>
  new AppError("SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.", 403)

// Con "propiedad", solo pasa "maestro"; con "inscripcion", pasa cualquier relación no nula.
export const evaluarPertenencia = (
  relacion: RelacionConClase | null,
  exigencia: "inscripcion" | "propiedad",
): AppError | null => {
  if (exigencia === "propiedad") return relacion === "maestro" ? null : errorSinAcceso()
  return relacion === null ? errorSinAcceso() : null
}
