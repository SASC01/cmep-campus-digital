import { z } from "zod"

// Nombres de cola (DEC-06). El id del trabajo es el id del token de tokens_cuenta (invitación) o el
// id que el worker asigna al crear el token de recuperación (DEC-06): sirve como eventId.
export const COLA_CORREO_DE_CUENTA = "CORREO_DE_CUENTA"
export const COLA_CORREO_DE_CUENTA_FALLIDO = "CORREO_DE_CUENTA_FALLIDO"

export const datosCorreoDeCuentaSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("recuperacion"), correo: z.string().min(3).max(254) }),
  z.object({ tipo: z.literal("invitacion") }),
])

export type DatosCorreoDeCuenta = z.infer<typeof datosCorreoDeCuentaSchema>
