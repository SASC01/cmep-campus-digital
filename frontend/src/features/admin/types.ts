// Tipos de datos de la API: se infieren de los esquemas zod de shared/ (CLAUDE.md, regla 7).
import type { CorregirCorreo } from "@campus/shared"

export type {
  BuscarUsuario,
  ContrasenaTemporalRespuesta,
  CorregirCorreo,
  InvitarMaestro,
  Rol,
  UsuarioAdmin,
} from "@campus/shared"

// Campos de los formularios provisionales de cuentas (DEC-19).
export type CampoFormularioAdmin = "nombre" | "email"

export type ErroresFormularioAdmin = Partial<Record<CampoFormularioAdmin, string>>

// Forma mínima de una incidencia de zod (path y message): el frontend valida con los esquemas de
// shared/ sin importar zod directamente. Duplicado de features/auth/types.ts a propósito: un
// módulo no importa de otro (regla 9).
export interface IncidenciaValidacion {
  path: readonly PropertyKey[]
  message: string
}

// Variables de useCorregirCorreo (T-08, AUTH-02b ronda 2): los tipos van en types.ts, no en hooks.ts.
export interface CorregirCorreoVariables {
  id: string
  datos: CorregirCorreo
}
