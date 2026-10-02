// Tipos de la API: se infieren de los esquemas de shared/, nunca a mano (regla 7 de CLAUDE.md).
export type {
  AlumnoDeClase,
  Candidato,
  ClaseDetalle,
  ClaseImpartida,
  ClaseInscrita,
  Comentario,
  CrearClase,
  CrearPublicacion,
  EditarClase,
  PersonaDeClase,
  Publicacion,
  TipoPublicacion,
  Unirse,
  UnirseRespuesta,
} from "@campus/shared"

// Tipos exclusivos de la interfaz de CLASES-a.
export type VarianteDeClase = "verde" | "azul" | "blanca"

export type RolDeClases = "estudiante" | "maestro"

// Errores de validación en cliente por campo (nombre del campo → primer mensaje). Genérico: lo usan
// tanto el formulario de clase (nombre, descripcion) como el de unirse (codigo).
export type ErroresFormulario = Partial<Record<string, string>>

export interface IncidenciaValidacion {
  path: readonly PropertyKey[]
  message: string
}

// N-03 (ronda 4 del manager): una fila del panel "Mis clases", no un tipo de Props de un
// componente (regla 6 de CLAUDE.md), así que vive aquí y no en panel-mis-clases.tsx.
export interface ClaseDelPanel {
  id: string
  nombre: string
  metadatos: string
  destino: string
}
