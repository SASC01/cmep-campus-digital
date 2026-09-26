// Tipos de datos de la API: se infieren de los esquemas zod de shared/ (CLAUDE.md, regla 7).
export type {
  CambiarContrasena,
  Login,
  MeRespuesta,
  NuevaContrasenaConToken,
  Recuperar,
  Registro,
  Rol,
  TokenAccesoRespuesta,
} from "@campus/shared"

// AUTH-02b: tipo del enlace de cuenta según su ruta (DEC-15/DEC-17).
export type TipoEnlace = "recuperacion" | "invitacion"

// Aviso mostrado en /login tras un enlace de cuenta (DEC-17).
export type AvisoDeLogin = "contrasena-actualizada" | "cuenta-activada"

export interface EstadoDeNavegacionLogin {
  aviso: AvisoDeLogin
}

// Tipo de interfaz provisional: cuando exista el endpoint público de anuncios del login (RF-07)
// se sustituye por el tipo inferido del esquema zod de shared/.
export interface Anuncio {
  anuncioId: string
  titulo: string
  texto: string
  orden: number
}

// Campos de los formularios de cuenta, con los nombres del contrato de la API.
export type CampoFormularioAuth =
  "nombre" | "email" | "contrasena" | "contrasenaActual" | "contrasenaNueva" | "confirmacion"

// Primer mensaje de validación de cada campo con error.
export type ErroresFormulario = Partial<Record<CampoFormularioAuth, string>>

// Forma mínima de una incidencia de zod (path y message): el frontend valida con los esquemas de
// shared/ sin importar zod directamente.
export interface IncidenciaValidacion {
  path: readonly PropertyKey[]
  message: string
}

// Textos de /restablecer y /establecer-contrasena, por tipo de enlace (DEC-19, "Textos de interfaz").
export interface TextosNuevaContrasena {
  titulo: string
  descripcion?: string
  contrasenaNueva: string
  ayudaContrasena: string
  confirmacion: string
  boton: string
  enlaceInvalido: string
  pedirOtroEnlace?: string
  avisoLogin: AvisoDeLogin
}
