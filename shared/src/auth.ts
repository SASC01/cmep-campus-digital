import { z } from "zod"

export const rolSchema = z.enum(["estudiante", "maestro", "admin"])

export type Rol = z.infer<typeof rolSchema>

// El correo se normaliza (trim + minúsculas) en core/ antes de comparar y guardar; aquí solo se
// valida la forma. 254 es el máximo práctico de una dirección de correo.
export const correoSchema = z
  .string({ error: "Escribe un correo válido" })
  .trim()
  .max(254, "El correo no puede tener más de 254 caracteres")
  .pipe(z.email("Escribe un correo válido"))

// Política de contraseña (ESSENTIALS > Autenticación): mínimo 10, máximo 128, sin reglas de composición.
export const contrasenaSchema = z
  .string({ error: "Escribe una contraseña" })
  .min(10, "La contraseña debe tener al menos 10 caracteres")
  .max(128, "La contraseña no puede tener más de 128 caracteres")

// Caracteres de control (\p{Cc}, incluido el nulo, que PostgreSQL rechaza en texto) y de formato
// invisibles (\p{Cf}: espacios de ancho cero, marcas e inversores de dirección como U+202E).
const CARACTERES_NO_PERMITIDOS_EN_NOMBRE = /[\p{Cc}\p{Cf}]/u
// Visibles: letras, números, puntuación y símbolos. El mínimo de 2 cuenta solo estos, no espacios
// ni marcas combinantes sueltas.
const CARACTER_VISIBLE = /[\p{L}\p{N}\p{P}\p{S}]/u
// Caracteres que Unicode clasifica como letra o símbolo pero se ven vacíos (T-11, T-13): los
// ignorables por defecto (rellenos Hangul U+115F, U+1160, U+3164, U+FFA0, selectores de variante…),
// el patrón Braille en blanco U+2800 y la cabeza de nota nula U+1D159. No se prohíben (aparecen,
// por ejemplo, en emojis): no cuentan como visibles, así que un nombre hecho solo de ellos no llega
// al mínimo. Limitación aceptada: otros caracteres cuya apariencia vacía depende de la fuente no
// están en la lista; si alguno llega a un nombre, el admin lo corrige.
const CARACTER_QUE_SE_VE_VACIO = /[\p{Default_Ignorable_Code_Point}\u2800\u{1D159}]/u

const contarVisibles = (texto: string): number =>
  Array.from(texto).filter(
    (caracter) => CARACTER_VISIBLE.test(caracter) && !CARACTER_QUE_SE_VE_VACIO.test(caracter),
  ).length

export const nombreSchema = z
  .string({ error: "Escribe tu nombre completo" })
  .trim()
  .min(2, "Escribe tu nombre completo")
  .max(120, "El nombre no puede tener más de 120 caracteres")
  .refine(
    (nombre) => !CARACTERES_NO_PERMITIDOS_EN_NOMBRE.test(nombre),
    "El nombre tiene caracteres no permitidos",
  )
  .refine((nombre) => contarVisibles(nombre) >= 2, "Escribe tu nombre completo")

export const registroSchema = z.object({
  nombre: nombreSchema,
  email: correoSchema,
  contrasena: contrasenaSchema,
})

// En el login la contraseña no aplica el mínimo de 10: una contraseña corta debe fallar como
// credencial inválida, no como error de validación (no revela la política a quien prueba correos).
export const loginSchema = z.object({
  email: correoSchema,
  contrasena: z
    .string({ error: "Escribe tu contraseña" })
    .min(1, "Escribe tu contraseña")
    .max(128, "La contraseña no puede tener más de 128 caracteres"),
})

export const tokenAccesoRespuestaSchema = z.object({
  tokenAcceso: z.string().min(1),
})

// Sin estadoPago (P-02): el estado de pago propio saldrá por GET /me/estado-pago en el módulo pagos.
// motivoRestriccion solo existe cuando accesoRestringido es true.
export const meRespuestaSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  email: z.string(),
  rol: rolSchema,
  debeCambiarContrasena: z.boolean(),
  accesoRestringido: z.boolean(),
  motivoRestriccion: z.string().optional(),
})

// Respuestas 204 (logout): el cuerpo no existe.
export const sinContenidoSchema = z.undefined()

export const CODIGOS_AUTH = {
  NO_AUTENTICADO: "NO_AUTENTICADO",
  CREDENCIALES_INVALIDAS: "CREDENCIALES_INVALIDAS",
  DEMASIADOS_INTENTOS: "DEMASIADOS_INTENTOS",
  CORREO_EN_USO: "CORREO_EN_USO",
  SESION_INVALIDA: "SESION_INVALIDA",
  VALIDACION: "VALIDACION",
  CAMBIO_DE_CONTRASENA_REQUERIDO: "CAMBIO_DE_CONTRASENA_REQUERIDO",
  ACCESO_RESTRINGIDO: "ACCESO_RESTRINGIDO",
  ROL_NO_PERMITIDO: "ROL_NO_PERMITIDO",
  NO_IMPLEMENTADO: "NO_IMPLEMENTADO",
} as const

export type CodigoAuth = (typeof CODIGOS_AUTH)[keyof typeof CODIGOS_AUTH]
export type Registro = z.infer<typeof registroSchema>
export type Login = z.infer<typeof loginSchema>
export type TokenAccesoRespuesta = z.infer<typeof tokenAccesoRespuestaSchema>
export type MeRespuesta = z.infer<typeof meRespuestaSchema>
