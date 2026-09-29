import { z } from "zod"

import { registroSchema } from "./auth.js"
import { tokenDeEnlaceSchema } from "./cuentas.js"

// Vigencia del enlace de registro de maestro (RN-03; N-02).
export const VIGENCIA_ENLACE_REGISTRO = {
  minimaDias: 1,
  maximaDias: 30,
  porDefectoDias: 7,
} as const

export const crearEnlaceRegistroSchema = z.object({
  vigenciaDias: z
    .number()
    .int("La vigencia debe ser un número entero de días")
    .min(
      VIGENCIA_ENLACE_REGISTRO.minimaDias,
      `La vigencia debe ser de al menos ${VIGENCIA_ENLACE_REGISTRO.minimaDias} día`,
    )
    .max(
      VIGENCIA_ENLACE_REGISTRO.maximaDias,
      `La vigencia no puede pasar de ${VIGENCIA_ENLACE_REGISTRO.maximaDias} días`,
    )
    .optional()
    .default(VIGENCIA_ENLACE_REGISTRO.porDefectoDias),
})

export const estadoEnlaceSchema = z.enum(["vigente", "vencido", "revocado"])

// Vista de un enlace de registro para el admin. Sin hashToken ni token.
export const enlaceRegistroAdminSchema = z.object({
  id: z.uuid(),
  creadoEn: z.iso.datetime(),
  expiraEn: z.iso.datetime(),
  revocadoEn: z.iso.datetime().nullable(),
  estado: estadoEnlaceSchema,
  registrados: z.number().int().min(0),
})

// El token solo viaja en la respuesta de crear el enlace, una sola vez.
export const crearEnlaceRegistroRespuestaSchema = z.object({
  enlace: enlaceRegistroAdminSchema,
  token: z.string().min(1),
})

export const paginacionSchema = z.object({
  cursor: z.uuid().optional(),
  limite: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export const listaEnlacesRegistroRespuestaSchema = z.object({
  enlaces: z.array(enlaceRegistroAdminSchema),
  siguienteCursor: z.uuid().nullable(),
})

export const enlaceRegistroRespuestaSchema = z.object({
  enlace: enlaceRegistroAdminSchema,
})

// Registrado con un enlace: sin estadoPago, rol ni activo (§D-B4).
export const registradoPorEnlaceSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  email: z.string(),
  creadoEn: z.iso.datetime(),
})

export const listaRegistradosRespuestaSchema = z.object({
  registrados: z.array(registradoPorEnlaceSchema),
  siguienteCursor: z.uuid().nullable(),
})

// Registro público de maestro con un enlace de registro: mismos datos que el registro de
// estudiante, más el token del enlace. Cualquier campo extra (rol, enlaceRegistroId…) se descarta.
export const registroMaestroSchema = registroSchema.extend({
  token: tokenDeEnlaceSchema,
})

export const CODIGOS_ENLACES = {
  ENLACE_NO_ENCONTRADO: "ENLACE_NO_ENCONTRADO",
} as const

export type CodigoEnlaces = (typeof CODIGOS_ENLACES)[keyof typeof CODIGOS_ENLACES]
export type CrearEnlaceRegistro = z.infer<typeof crearEnlaceRegistroSchema>
export type EstadoEnlaceRegistro = z.infer<typeof estadoEnlaceSchema>
export type EnlaceRegistroAdmin = z.infer<typeof enlaceRegistroAdminSchema>
export type CrearEnlaceRegistroRespuesta = z.infer<typeof crearEnlaceRegistroRespuestaSchema>
export type Paginacion = z.infer<typeof paginacionSchema>
export type ListaEnlacesRegistroRespuesta = z.infer<typeof listaEnlacesRegistroRespuestaSchema>
export type EnlaceRegistroRespuesta = z.infer<typeof enlaceRegistroRespuestaSchema>
export type RegistradoPorEnlace = z.infer<typeof registradoPorEnlaceSchema>
export type ListaRegistradosRespuesta = z.infer<typeof listaRegistradosRespuestaSchema>
export type RegistroMaestro = z.infer<typeof registroMaestroSchema>
