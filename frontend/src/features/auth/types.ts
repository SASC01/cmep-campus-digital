// Tipos de datos de la API: se infieren de los esquemas zod de shared/ (CLAUDE.md, regla 7).
export type { Login, MeRespuesta, Registro, Rol, TokenAccesoRespuesta } from "@campus/shared"

// Tipo de interfaz provisional: cuando exista el endpoint público de anuncios del login (RF-07)
// se sustituye por el tipo inferido del esquema zod de shared/.
export interface Anuncio {
  anuncioId: string
  titulo: string
  texto: string
  orden: number
}

// Campos de los formularios de login y registro, con los nombres del contrato de la API.
export type CampoFormularioAuth = "nombre" | "email" | "contrasena"

// Primer mensaje de validación de cada campo con error.
export type ErroresFormulario = Partial<Record<CampoFormularioAuth, string>>

// Forma mínima de una incidencia de zod (path y message): el frontend valida con los esquemas de
// shared/ sin importar zod directamente.
export interface IncidenciaValidacion {
  path: readonly PropertyKey[]
  message: string
}
