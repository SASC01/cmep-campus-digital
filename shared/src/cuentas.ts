import { z } from "zod"

import { contrasenaSchema, correoSchema, nombreSchema, rolSchema } from "./auth.js"

// Token de un enlace de cuenta. La forma exacta (43 caracteres base64url) no se valida aquí: un
// token mal formado responde lo mismo que uno inexistente (400 ENLACE_INVALIDO), sin pistas.
export const tokenDeEnlaceSchema = z
  .string({ error: "El enlace no es válido" })
  .min(1, "El enlace no es válido")
  .max(256, "El enlace no es válido")

export const recuperarSchema = z.object({ email: correoSchema })

export const nuevaContrasenaConTokenSchema = z.object({
  token: tokenDeEnlaceSchema,
  contrasena: contrasenaSchema,
})

export const cambiarContrasenaSchema = z.object({
  contrasenaActual: z
    .string({ error: "Escribe tu contraseña temporal" })
    .min(1, "Escribe tu contraseña temporal")
    .max(128, "La contraseña no puede tener más de 128 caracteres"),
  contrasenaNueva: contrasenaSchema,
})

export const invitarMaestroSchema = z.object({ nombre: nombreSchema, email: correoSchema })

export const buscarUsuarioSchema = z.object({ email: correoSchema })

export const corregirCorreoSchema = z.object({ email: correoSchema })

// Vista de una cuenta para el admin. Sin estadoPago ni datos de restricción: esta pantalla no los usa.
export const usuarioAdminSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  email: z.string(),
  rol: rolSchema,
  activo: z.boolean(),
})

export const buscarUsuarioRespuestaSchema = z.object({ usuario: usuarioAdminSchema })

export const contrasenaTemporalRespuestaSchema = z.object({
  contrasenaTemporal: z.string().min(10),
})

export const CODIGOS_CUENTAS = {
  ENLACE_INVALIDO: "ENLACE_INVALIDO",
  DEMASIADAS_SOLICITUDES: "DEMASIADAS_SOLICITUDES",
  CONTRASENA_ACTUAL_INCORRECTA: "CONTRASENA_ACTUAL_INCORRECTA",
  CONTRASENA_REPETIDA: "CONTRASENA_REPETIDA",
  CAMBIO_NO_REQUERIDO: "CAMBIO_NO_REQUERIDO",
  USUARIO_NO_ENCONTRADO: "USUARIO_NO_ENCONTRADO",
  OPERACION_NO_PERMITIDA: "OPERACION_NO_PERMITIDA",
} as const

export type CodigoCuentas = (typeof CODIGOS_CUENTAS)[keyof typeof CODIGOS_CUENTAS]
export type Recuperar = z.infer<typeof recuperarSchema>
export type NuevaContrasenaConToken = z.infer<typeof nuevaContrasenaConTokenSchema>
export type CambiarContrasena = z.infer<typeof cambiarContrasenaSchema>
export type InvitarMaestro = z.infer<typeof invitarMaestroSchema>
export type BuscarUsuario = z.infer<typeof buscarUsuarioSchema>
export type CorregirCorreo = z.infer<typeof corregirCorreoSchema>
export type UsuarioAdmin = z.infer<typeof usuarioAdminSchema>
export type BuscarUsuarioRespuesta = z.infer<typeof buscarUsuarioRespuestaSchema>
export type ContrasenaTemporalRespuesta = z.infer<typeof contrasenaTemporalRespuestaSchema>
